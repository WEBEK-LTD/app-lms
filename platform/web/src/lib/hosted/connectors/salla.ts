import type { DataStore } from "../../data/store";
import type { HostedUser } from "../../data/types";
import { amountOf, cartLines, e164Of, error, formatCurrency, intParam, optionSlug, verifiedEmail, type CartLineInput } from "./common";
import { AccessRevokedError, OAuthRefusedError, TokenKeeper, type TokenValues } from "./oauth-tokens";
import type { PartnerCredentials } from "./partner-apps";
import { PlatformCheckError, registerPlatform, type PlatformConnector, type PlatformDefinition, type PlatformDeps } from "./platforms";
import { ConnectorError, type ConnectorRequest, type ConnectorResult } from "./types";

/**
 * 25 Salla for Store apps, through Salla's Merchant API
 * (https://api.salla.dev/admin/v2): products with their options, SKUs,
 * images and prices, categories, and the customer's orders.
 *
 * Connecting. Stores connect to Yallapp's Salla partner app (Salla Partners;
 * its client ID, client secret and webhook secret are in admin Settings) with
 * the OAuth authorization-code flow ("custom mode"): the Website step's
 * "Connect with Salla" sends the owner to Salla's approval page with a signed
 * `state`, and src/app/oauth/salla swaps the code for tokens and saves them.
 * Access tokens last about 14 days and refresh tokens work once: they're
 * renewed a day before they expire, and when Salla refuses one, by the
 * TokenKeeper (oauth-tokens.ts), which never uses a refresh token twice.
 * Salla's "easy mode" (`app.store.authorize` webhooks, src/app/api/webhooks/salla)
 * only renews the tokens of a store already connected here.
 *
 * Checkout. Salla has no public API that fills a shopper's cart, so the app
 * hands off to the store: a cart with one product opens that product's page
 * on the Salla storefront (in the browser, where the shopper picks it again
 * and pays); larger carts are asked to go one product at a time, as for
 * Ticimax.
 *
 * Orders are those of the Salla customers whose mobile number (with its
 * country code) is exactly the customer's verified phone number, or whose
 * email is exactly the verified email of an email account. An empty phone or
 * email never matches anything.
 *
 * Salla's IDs are integers and are kept as they are. Details marked
 * "Unverified" are from Salla's documentation as we know it, not yet
 * confirmed against a real store.
 */

export const SALLA_API_URL = "https://api.salla.dev/admin/v2";
export const SALLA_ACCOUNTS_URL = "https://accounts.salla.sa/oauth2";
/** Renew this long before the access token (about 14 days) expires. */
const TOKEN_MARGIN_MS = 24 * 60 * 60_000;
/** Unverified: Salla's access tokens last 14 days; used when the answer has no `expires_in`. */
const DEFAULT_TOKEN_SECONDS = 14 * 24 * 60 * 60;
const CACHE_MS = 5 * 60_000;
const CACHE_MAX = 1000;
/** Unverified: the largest page Salla's lists answer. */
const PAGE_LIMIT = 50;
/** Products scanned for "on sale" (Salla can't filter by it). */
const SALE_PAGES = 2;
const CATEGORY_PAGES = 5;
/** Customers with the same phone or email whose orders are read. */
const CUSTOMER_LIMIT = 5;
/** Orders read per customer. */
const ORDER_LOOKUP_LIMIT = 50;
/** Orders whose customer the list doesn't say, checked one by one. */
const ORDER_CONFIRM_LIMIT = 20;
const LINK_MINUTES = 30;
const UNREACHABLE = "Salla didn't answer.";
const REVOKED =
  "Salla no longer gives Yallapp access to this store. Select Connect with Salla again, and approve the access in Salla.";

type Fetch = typeof fetch;

/** The values saved for a connected store (all of them kept encrypted). */
export interface SallaValues {
  merchantId: string;
  storeName: string;
  /** The storefront's address, as Salla gives it. */
  storeUrl: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
}

/** Salla answered with an HTTP error. */
export class SallaHttpError extends ConnectorError {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SallaHttpError";
  }
}

// OAuth

/** Salla's approval page for Yallapp's partner app. */
export function sallaAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const query = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    // `offline_access` gives a refresh token; the data scopes are the partner app's own (set in Salla Partners).
    scope: "offline_access",
    state,
  });
  return `${SALLA_ACCOUNTS_URL}/auth?${query}`;
}

/**
 * Asks Salla's token endpoint for tokens (an authorization code or a refresh
 * token, form-encoded with the partner app's credentials).
 */
export async function sallaTokenRequest(
  params: Record<string, string>,
  credentials: Pick<PartnerCredentials, "clientId" | "clientSecret">,
  fetcher: Fetch = fetch,
  now = Date.now(),
): Promise<TokenValues> {
  let response: Response;
  try {
    response = await fetcher(`${SALLA_ACCOUNTS_URL}/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams({ ...params, client_id: credentials.clientId, client_secret: credentials.clientSecret }).toString(),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ConnectorError(UNREACHABLE);
  }
  // Unverified: a used, revoked or unknown refresh token (or code) answers 400 or 401 (invalid_grant).
  if (response.status === 400 || response.status === 401) throw new OAuthRefusedError(`Salla refused the ${params.grant_type === "refresh_token" ? "refresh token" : "code"}.`);
  if (!response.ok) throw new SallaHttpError(`Salla answered HTTP ${response.status}.`, response.status);
  const body = (await response.json().catch(() => ({}))) as { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown };
  if (typeof body.access_token !== "string" || !body.access_token || typeof body.refresh_token !== "string" || !body.refresh_token) {
    throw new ConnectorError("Salla sent no tokens.");
  }
  const seconds = Number(body.expires_in) > 0 ? Number(body.expires_in) : DEFAULT_TOKEN_SECONDS;
  return { accessToken: body.access_token, refreshToken: body.refresh_token, tokenExpiresAt: String(now + seconds * 1000) };
}

interface SallaMerchant {
  id?: number | string | null;
  name?: string | null;
  username?: string | null;
  domain?: string | null;
}

/** Swaps an authorization code for tokens and the merchant's store (ID, name, address). */
export async function connectSalla(code: string, credentials: PartnerCredentials, redirectUri: string, fetcher: Fetch = fetch): Promise<Record<string, string>> {
  const tokens = await sallaTokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri, scope: "offline_access" }, credentials, fetcher);
  let response: Response;
  try {
    response = await fetcher(`${SALLA_ACCOUNTS_URL}/user/info`, {
      headers: { authorization: `Bearer ${tokens.accessToken}`, accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ConnectorError(UNREACHABLE);
  }
  if (!response.ok) throw new SallaHttpError(`Salla answered HTTP ${response.status}.`, response.status);
  const body = (await response.json().catch(() => ({}))) as { data?: { merchant?: SallaMerchant | null } | null };
  const merchant = body.data?.merchant;
  const merchantId = merchant?.id === null || merchant?.id === undefined ? "" : String(merchant.id);
  if (!/^\d{1,20}$/.test(merchantId)) throw new ConnectorError("Salla sent no store.");
  return {
    ...tokens,
    merchantId,
    storeName: merchant?.name?.trim() || merchant?.username?.trim() || "Salla store",
    storeUrl: httpsUrl(merchant?.domain) ?? "",
  };
}

/** An https address, or null. */
function httpsUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return /^https:\/\/[^\s]+$/.test(v) ? v : null;
}

// The API

export type SallaDeps = Pick<PlatformDeps, "appId" | "fetcher" | "saveSecrets" | "loadSecrets" | "partnerApp"> & { store: Pick<DataStore, "hitRateLimit"> };

export class SallaClient {
  private readonly keeper: TokenKeeper;

  constructor(
    private readonly values: SallaValues,
    private readonly deps: SallaDeps,
  ) {
    this.keeper = new TokenKeeper({
      platform: "Salla",
      appId: deps.appId,
      account: values.merchantId,
      store: deps.store,
      initial: { accessToken: values.accessToken, refreshToken: values.refreshToken, tokenExpiresAt: values.tokenExpiresAt },
      marginMs: TOKEN_MARGIN_MS,
      refresh: async (refreshToken) => {
        const credentials = await deps.partnerApp?.();
        if (!credentials) throw new ConnectorError("Yallapp's Salla partner app isn't set.");
        // Unverified: Salla renews without the redirect URI.
        return sallaTokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken }, credentials, deps.fetcher);
      },
      save: (tokens) => deps.saveSecrets(tokens),
      load: async () => {
        const saved = await deps.loadSecrets?.();
        // Tokens of another store (connected since) are never used for this one.
        return saved && saved.merchantId === values.merchantId ? saved : null;
      },
    });
  }

  /** A GET on the Merchant API; renews the token once when Salla refuses it. */
  async get<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T> {
    const search = new URLSearchParams();
    for (const [name, value] of Object.entries(query)) if (value !== undefined && value !== "") search.set(name, String(value));
    const url = `${SALLA_API_URL}${path}${search.size ? `?${search}` : ""}`;
    let tokens = await this.keeper.current();
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await this.deps.fetcher(url, {
          headers: { authorization: `Bearer ${tokens.accessToken}`, accept: "application/json" },
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        throw new ConnectorError(UNREACHABLE);
      }
      if (response.status === 401 && attempt === 0) {
        tokens = await this.keeper.renew(tokens);
        continue;
      }
      if (response.status === 401) throw new AccessRevokedError("Salla");
      if (!response.ok) throw new SallaHttpError(`Salla answered HTTP ${response.status}.`, response.status);
      return (await response.json().catch(() => ({}))) as T;
    }
  }
}

// Salla's objects, the fields the connector reads

interface SallaMoney {
  amount?: number | string | null;
  currency?: string | null;
}
interface SallaImage {
  url?: string | null;
  main?: boolean | null;
  alt?: string | null;
  type?: string | null;
}
interface SallaOptionValue {
  id?: number | null;
  name?: string | null;
}
interface SallaOption {
  id?: number | null;
  name?: string | null;
  values?: SallaOptionValue[] | null;
}
export interface SallaSku {
  id?: number | null;
  sku?: string | null;
  price?: SallaMoney | null;
  regular_price?: SallaMoney | null;
  sale_price?: SallaMoney | null;
  stock_quantity?: number | null;
  unlimited_quantity?: boolean | null;
  is_available?: boolean | null;
  related_option_values?: (number | string)[] | null;
}
export interface SallaProduct {
  id: number;
  name?: string | null;
  description?: string | null;
  type?: string | null;
  status?: string | null;
  sku?: string | null;
  price?: SallaMoney | null;
  regular_price?: SallaMoney | null;
  sale_price?: SallaMoney | null;
  sale_end?: string | null;
  is_available?: boolean | null;
  quantity?: number | null;
  unlimited_quantity?: boolean | null;
  max_items_per_user?: number | null;
  main_image?: string | null;
  thumbnail?: string | null;
  images?: SallaImage[] | null;
  url?: string | null;
  urls?: { customer?: string | null } | null;
  categories?: { id?: number | null; name?: string | null }[] | null;
  options?: SallaOption[] | null;
  skus?: SallaSku[] | null;
  rating?: { count?: number | null; rate?: number | null } | null;
}
interface SallaCategory {
  id?: number | null;
  name?: string | null;
  image?: string | null;
  parent_id?: number | null;
  status?: string | null;
  items?: SallaCategory[] | null;
  sub_categories?: SallaCategory[] | null;
}
export interface SallaCustomer {
  id?: number | null;
  mobile?: string | number | null;
  mobile_code?: string | number | null;
  email?: string | null;
}
export interface SallaOrder {
  id?: number | null;
  reference_id?: number | string | null;
  total?: SallaMoney | null;
  amounts?: { total?: SallaMoney | null } | null;
  date?: { date?: string | null; timezone?: string | null } | null;
  status?: { slug?: string | null } | null;
  customer?: SallaCustomer | null;
  items?:
    | {
        name?: string | null;
        quantity?: number | null;
        product_id?: number | null;
        product?: { id?: number | null } | null;
        thumbnail?: string | null;
        product_thumbnail?: string | null;
      }[]
    | null;
}
interface Paged<T> {
  data?: T[] | null;
  pagination?: { total?: number | null; totalPages?: number | null; currentPage?: number | null } | null;
}

// Values

/** The customer's mobile number in E.164 from Salla's `mobile_code` and `mobile`, or null. */
export function sallaPhone(customer: Pick<SallaCustomer, "mobile" | "mobile_code">): string | null {
  const mobile = String(customer.mobile ?? "").replace(/[\s().-]/g, "");
  if (!mobile) return null;
  if (mobile.startsWith("+") || mobile.startsWith("00")) return e164Of(mobile);
  const code = String(customer.mobile_code ?? "").replace(/[\s()-]/g, "");
  if (!/^(\+|00)?[1-9]\d{0,3}$/.test(code)) return null;
  // Unverified: Salla keeps the number without its trunk 0 (555555555); one written with it is read without.
  return e164Of(`+${code.replace(/^(\+|00)/, "")}${mobile.replace(/^0/, "")}`);
}

/** The order's status in the contract's words, and an English label (Salla's own names are often Arabic). */
export function sallaOrderStatus(slug: string | null | undefined): { status: string; label: string } {
  switch (slug) {
    case "payment_pending":
      return { status: "pending", label: "Awaiting payment" };
    case "under_review":
      return { status: "on_hold", label: "Under review" };
    case "in_progress":
      return { status: "processing", label: "Processing" };
    case "shipped":
      return { status: "processing", label: "Shipped" };
    case "delivering":
      return { status: "processing", label: "Out for delivery" };
    case "delivered":
      return { status: "completed", label: "Delivered" };
    case "completed":
      return { status: "completed", label: "Completed" };
    case "canceled":
    case "cancelled":
      return { status: "cancelled", label: "Cancelled" };
    case "restoring":
      return { status: "processing", label: "Return in progress" };
    case "restored":
      return { status: "refunded", label: "Returned" };
    default:
      return { status: "processing", label: "Processing" };
  }
}

/**
 * An order's date as ISO 8601. Unverified: Salla sends `{date: "2026-10-01 09:00:00.000000", timezone: "Asia/Riyadh"}`;
 * Riyadh is UTC+3 all year, other zones are read as UTC.
 */
export function sallaDate(date: SallaOrder["date"]): string | null {
  const text = date?.date?.trim();
  if (!text) return null;
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(text);
  if (!match) return Number.isNaN(Date.parse(text)) ? null : new Date(text).toISOString();
  const offset = date?.timezone === "Asia/Riyadh" ? "+03:00" : "Z";
  const parsed = Date.parse(`${match[1]}T${match[2]}${offset}`);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

const cache = new Map<string, { at: number; value: unknown }>();

type StockStatus = "in_stock" | "out_of_stock" | "on_backorder";

type OrderBy = "newest" | "popular" | "rating" | "price_asc" | "price_desc" | "title";
const ORDERS: OrderBy[] = ["newest", "popular", "rating", "price_asc", "price_desc", "title"];

interface CategoryItem {
  id: number;
  name: string;
  count: number;
  parent_id: number | null;
  image_url: string | null;
}

export class SallaConnector implements PlatformConnector {
  private readonly client: SallaClient;

  constructor(
    private readonly values: SallaValues,
    deps: SallaDeps,
  ) {
    this.client = new SallaClient(values, deps);
  }

  private get connected(): boolean {
    return Boolean(this.values.merchantId && this.values.refreshToken);
  }

  private async cached<T>(name: string, load: () => Promise<T>): Promise<T> {
    const key = `${this.values.merchantId}:${name}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as T;
    const value = await load();
    cache.delete(key);
    cache.set(key, { at: Date.now(), value });
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
    return value;
  }

  /** The store's name and currency. Unverified: GET /store/info answers `{data: {name, currency, domain}}`. */
  private info(): Promise<{ name: string; currency: string; domain: string | null }> {
    return this.cached("info", async () => {
      const body = await this.client.get<{ data?: { name?: string | null; currency?: string | null; domain?: string | null } | null }>("/store/info");
      const currency = body.data?.currency?.trim().toUpperCase();
      return {
        name: body.data?.name?.trim() || this.values.storeName || "Salla store",
        currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : "SAR",
        domain: httpsUrl(body.data?.domain),
      };
    });
  }

  private money(amount: number, currency: string): string {
    return formatCurrency(amount, currency);
  }

  /** Reads the store and one product; returns the store's name, or says what to fix. */
  async check(): Promise<string> {
    if (!this.connected) throw new PlatformCheckError("Connect your Salla store first: select Connect with Salla and approve the access in Salla.");
    try {
      const info = await this.info();
      await this.client.get("/products", { per_page: 1 });
      return info.name;
    } catch (e) {
      if (e instanceof AccessRevokedError) throw new PlatformCheckError(REVOKED);
      if (e instanceof SallaHttpError && e.status === 403) {
        throw new PlatformCheckError(
          "Salla didn't let Yallapp read this store's products. Ask us to check the Salla app's permissions, then select Connect with Salla again.",
        );
      }
      throw e;
    }
  }

  async config() {
    const info = await this.info();
    return {
      store: {
        currency: info.currency,
        guest_checkout: true,
        checkout_opens_in: "browser",
        reviews: false,
        delivery_date: { enabled: false, required: false, min_days: 0, max_days: 0, closed_weekdays: [] },
        gift_message: { enabled: false, max_length: 200 },
      },
      features: { orders: true },
    };
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    const route = `${request.method} /${request.path.join("/")}`;
    try {
      switch (route) {
        case "GET /store/home":
          return { status: 200, body: { sections: await this.home() } };
        case "GET /store/categories":
          return { status: 200, body: { items: await this.categories() } };
        case "GET /store/products":
          return await this.products(request.query);
        case "POST /store/cart":
          return await this.quote(request);
        case "POST /store/checkout-link":
          return await this.checkoutLink(request);
        case "GET /me/orders":
          return await this.orders(request);
      }
      if (request.method === "GET" && request.path[0] === "store" && request.path[1] === "products" && request.path[2]) {
        const id = Number(request.path[2]);
        if (!Number.isSafeInteger(id) || id < 1) return error(404, "not_found", "Product not found.");
        if (request.path.length === 3) return await this.product(id);
        if (request.path.length === 4 && request.path[3] === "reviews") {
          return error(403, "feature_disabled", "Reviews aren't available in this shop.");
        }
      }
    } catch (e) {
      if (e instanceof ConnectorError) {
        return error(503, "shop_unavailable", "The shop can't be reached right now. Please try again in a moment.");
      }
      throw e;
    }
    return null;
  }

  // Products

  private visible(product: SallaProduct): boolean {
    return product.status !== "hidden" && product.status !== "deleted";
  }

  private digital(product: SallaProduct): boolean {
    // Unverified: Salla's product types; digital files and codes (cards) are the digital ones.
    return product.type === "digital" || product.type === "codes";
  }

  private stockStatus(product: SallaProduct): StockStatus {
    if (product.status === "out" || product.is_available === false) return "out_of_stock";
    if (!product.unlimited_quantity && typeof product.quantity === "number" && product.quantity <= 0 && !(product.skus?.length ?? 0)) return "out_of_stock";
    return "in_stock";
  }

  private skuStock(sku: SallaSku): StockStatus {
    if (sku.is_available === false) return "out_of_stock";
    if (!sku.unlimited_quantity && typeof sku.stock_quantity === "number" && sku.stock_quantity <= 0) return "out_of_stock";
    return "in_stock";
  }

  /** The price now and before a sale (when there's one): the sale price while it lasts, else the price. */
  private amounts(item: Pick<SallaProduct, "price" | "regular_price" | "sale_price"> & { sale_end?: string | null }): { now: number | null; regular: number | null } {
    const price = amountOf(item.price?.amount);
    const regular = amountOf(item.regular_price?.amount) ?? price;
    const sale = amountOf(item.sale_price?.amount);
    const ended = item.sale_end ? Date.parse(item.sale_end) < Date.now() : false;
    if (sale !== null && sale > 0 && regular !== null && sale < regular && !ended) return { now: sale, regular };
    return { now: price ?? regular, regular };
  }

  private price(min: number | null, max: number | null, regular: number | null, currency: string) {
    if (min === null) {
      return { amount: "0.00", regular_amount: null, regular_formatted: null, currency, formatted: this.money(0, currency), on_sale: false, range: false };
    }
    const top = max !== null && max > min ? max : min;
    const range = top !== min;
    const onSale = regular !== null && regular > min;
    return {
      amount: min.toFixed(2),
      regular_amount: onSale ? regular!.toFixed(2) : null,
      regular_formatted: onSale && !range ? this.money(regular!, currency) : null,
      currency,
      formatted: range ? `${this.money(min, currency)} – ${this.money(top, currency)}` : this.money(min, currency),
      on_sale: onSale,
      range,
    };
  }

  /** The SKUs that are choices of options (a product without options has none). */
  private variantSkus(product: SallaProduct): SallaSku[] {
    return (product.skus ?? []).filter((s) => typeof s.id === "number" && s.id > 0 && (s.related_option_values?.length ?? 0) > 0);
  }

  private currencyOf(product: SallaProduct, fallback: string): string {
    const c = product.price?.currency?.trim().toUpperCase();
    return c && /^[A-Z]{3}$/.test(c) ? c : fallback;
  }

  private productPrice(product: SallaProduct, currency: string) {
    const skus = this.variantSkus(product);
    if (skus.length > 0) {
      const amounts = skus.map((s) => this.amounts(s)).filter((a) => a.now !== null);
      if (amounts.length > 0) {
        const min = Math.min(...amounts.map((a) => a.now!));
        const max = Math.max(...amounts.map((a) => a.now!));
        const cheapest = amounts.find((a) => a.now === min)!;
        return this.price(min, max, cheapest.regular, currency);
      }
    }
    const { now, regular } = this.amounts(product);
    return this.price(now, now, regular, currency);
  }

  private imageUrl(product: SallaProduct): string | null {
    const main = (product.images ?? []).find((i) => i.main && i.type !== "video");
    return httpsUrl(main?.url) ?? httpsUrl(product.main_image) ?? httpsUrl(product.thumbnail) ?? httpsUrl((product.images ?? []).find((i) => i.type !== "video")?.url);
  }

  private summary(product: SallaProduct, currency: string) {
    const price = this.productPrice(product, currency);
    const stock = this.stockStatus(product);
    const rate = amountOf(product.rating?.rate);
    return {
      id: product.id,
      name: product.name ?? "",
      type: this.variantSkus(product).length > 0 ? "variable" : "simple",
      image_url: this.imageUrl(product),
      price,
      rating: rate !== null && rate > 0 ? Math.min(5, rate) : null,
      rating_count: Math.max(0, Math.floor(Number(product.rating?.count) || 0)),
      stock_status: stock,
      purchasable: stock !== "out_of_stock" && price.amount !== "0.00",
      digital: this.digital(product),
    };
  }

  private summaries(products: SallaProduct[], currency: string) {
    return products.filter((p) => typeof p.id === "number" && p.id > 0 && this.visible(p)).map((p) => this.summary(p, this.currencyOf(p, currency)));
  }

  private permalink(product: SallaProduct, storeUrl: string | null): string {
    return httpsUrl(product.urls?.customer) ?? httpsUrl(product.url) ?? storeUrl ?? "https://salla.sa/";
  }

  /** Option slugs and value names, for the options whose values make the SKUs. */
  private optionNames(product: SallaProduct) {
    const used = new Set(this.variantSkus(product).flatMap((s) => (s.related_option_values ?? []).map(Number)));
    const options: { slug: string; name: string; values: { id: number; name: string }[] }[] = [];
    const valueOption = new Map<number, { slug: string; name: string }>();
    for (const option of product.options ?? []) {
      const values = (option.values ?? []).filter((v): v is { id: number; name: string } => typeof v.id === "number" && used.has(v.id) && Boolean(v.name));
      if (values.length === 0) continue;
      let slug = optionSlug(option.name ?? "Option");
      while (options.some((o) => o.slug === slug)) slug = `${slug}_`;
      options.push({ slug, name: option.name ?? "Option", values });
      for (const v of values) valueOption.set(v.id, { slug, name: v.name });
    }
    return { options, valueOption };
  }

  private skuChoices(sku: SallaSku, names: ReturnType<SallaConnector["optionNames"]>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const raw of sku.related_option_values ?? []) {
      const value = names.valueOption.get(Number(raw));
      if (value) out[value.slug] = value.name;
    }
    return out;
  }

  private async detail(product: SallaProduct) {
    const info = await this.info();
    const currency = this.currencyOf(product, info.currency);
    const summary = this.summary(product, currency);
    const names = this.optionNames(product);
    const seen = new Set<string>();
    const images = (product.images ?? [])
      .filter((i) => i.type !== "video")
      .map((i) => ({ url: httpsUrl(i.url), alt: i.alt || product.name || null }))
      .filter((i): i is { url: string; alt: string | null } => i.url !== null && !seen.has(i.url) && Boolean(seen.add(i.url)));
    if (images.length === 0 && summary.image_url) images.push({ url: summary.image_url, alt: product.name ?? null });
    const categories = await this.categoryList();
    const own = (product.categories ?? []).map((c) => categories.find((k) => k.id === c.id)).filter((c): c is CategoryItem => Boolean(c));
    const related = own[0] ? await this.listPage({ category: own[0].id }, 1, 9).catch(() => ({ items: [] as SallaProduct[], total: 0 })) : { items: [] };
    const variable = summary.type === "variable";
    const max = Number(product.max_items_per_user) > 0 ? Math.floor(Number(product.max_items_per_user)) : null;
    return {
      ...summary,
      description_html: product.description ?? "",
      short_description_html: null,
      images,
      sku: product.sku || null,
      max_quantity: max,
      attributes: variable
        ? names.options.map((o) => ({ slug: o.slug, name: o.name, variation: true, options: o.values.map((v) => ({ value: v.name, label: v.name })) }))
        : [],
      variations: variable
        ? this.variantSkus(product).map((s) => {
            const { now, regular } = this.amounts(s);
            const stock = this.skuStock(s);
            return {
              id: s.id!,
              attributes: this.skuChoices(s, names),
              price: this.price(now, now, regular, currency),
              image_url: null,
              stock_status: stock,
              max_quantity: max,
              purchasable: stock !== "out_of_stock" && now !== null,
            };
          })
        : [],
      categories: own.map((c) => ({ ...c, count: 0 })),
      related: this.summaries(related.items.filter((p) => p.id !== product.id), currency).slice(0, 8),
      external_url: null,
      permalink: this.permalink(product, this.values.storeUrl || info.domain),
    };
  }

  /** A product with its options and SKUs, or null when Salla doesn't show it. */
  private load(id: number): Promise<SallaProduct | null> {
    return this.cached(`product:${id}`, async () => {
      try {
        const body = await this.client.get<{ data?: SallaProduct | null }>(`/products/${id}`);
        return body.data && body.data.id === id && this.visible(body.data) ? body.data : null;
      } catch (e) {
        if (e instanceof SallaHttpError && e.status === 404) return null;
        throw e;
      }
    });
  }

  private async product(id: number): Promise<ConnectorResult> {
    const product = await this.load(id);
    if (!product) return error(404, "not_found", "Product not found.");
    return { status: 200, body: await this.detail(product) };
  }

  // Categories

  /** The store's categories, flattened, without hidden ones. Unverified: subcategories come in `items` (or `sub_categories`). */
  private categoryList(): Promise<CategoryItem[]> {
    return this.cached("categories", async () => {
      const all: CategoryItem[] = [];
      const seen = new Set<number>();
      const walk = (list: SallaCategory[] | null | undefined, parent: number | null, depth: number) => {
        for (const c of list ?? []) {
          if (typeof c.id !== "number" || c.id < 1 || seen.has(c.id) || c.status === "hidden") continue;
          seen.add(c.id);
          all.push({ id: c.id, name: c.name ?? "", count: 0, parent_id: c.parent_id && c.parent_id > 0 ? c.parent_id : parent, image_url: httpsUrl(c.image) });
          if (depth < 10) walk(c.items ?? c.sub_categories, c.id, depth + 1);
        }
      };
      for (let page = 1; page <= CATEGORY_PAGES; page++) {
        const body = await this.client.get<Paged<SallaCategory>>("/categories", { page });
        walk(body.data, null, 0);
        if (!body.pagination?.totalPages || page >= body.pagination.totalPages) break;
      }
      const ids = new Set(all.map((c) => c.id));
      return all.map((c) => ({ ...c, parent_id: c.parent_id !== null && ids.has(c.parent_id) ? c.parent_id : null }));
    });
  }

  private categories(): Promise<CategoryItem[]> {
    return this.categoryList();
  }

  // Listing

  /** One page of Salla's product list. Unverified: the `keyword` and `category` filters. */
  private async listPage(filter: { search?: string; category?: number }, page: number, perPage: number): Promise<{ items: SallaProduct[]; total: number }> {
    const body = await this.client.get<Paged<SallaProduct>>("/products", {
      page,
      per_page: Math.min(perPage, PAGE_LIMIT),
      keyword: filter.search || undefined,
      category: filter.category,
    });
    const items = body.data ?? [];
    return { items, total: Math.max(items.length, Math.floor(Number(body.pagination?.total) || 0)) };
  }

  /** On-sale products among the first SALE_PAGES pages (Salla can't filter by sale). */
  private async saleProducts(filter: { search?: string; category?: number }, currency: string): Promise<SallaProduct[]> {
    const load = async () => {
      const out: SallaProduct[] = [];
      for (let page = 1; page <= SALE_PAGES; page++) {
        const chunk = await this.listPage(filter, page, PAGE_LIMIT);
        out.push(...chunk.items);
        if (chunk.items.length < PAGE_LIMIT) break;
      }
      return out;
    };
    const all = filter.search || filter.category ? await load() : await this.cached("sale", load);
    return all.filter((p) => this.visible(p) && this.productPrice(p, this.currencyOf(p, currency)).on_sale);
  }

  /**
   * Unverified: Salla's list has no documented sort; "newest", "popular" and
   * "rating" keep Salla's order, and the price and name orders sort each page.
   */
  private sorted(items: ReturnType<SallaConnector["summaries"]>, orderby: OrderBy) {
    const amount = (s: (typeof items)[number]) => Number(s.price.amount);
    if (orderby === "price_asc") return [...items].sort((a, b) => amount(a) - amount(b));
    if (orderby === "price_desc") return [...items].sort((a, b) => amount(b) - amount(a));
    if (orderby === "title") return [...items].sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }

  private async products(query: URLSearchParams): Promise<ConnectorResult> {
    const info = await this.info();
    const page = intParam(query, "page", 1, 10_000);
    const perPage = intParam(query, "per_page", 20, PAGE_LIMIT);
    const ids = [
      ...new Set(
        (query.get("ids") ?? "")
          .split(",")
          .map((v) => Number(v.trim()))
          .filter((v) => Number.isSafeInteger(v) && v > 0),
      ),
    ].slice(0, 50);
    if (ids.length > 0) {
      // Salla has no list by IDs: each product is read (and cached).
      const products = (await Promise.all(ids.map((id) => this.load(id)))).filter((p): p is SallaProduct => p !== null);
      const items = this.summaries(products, info.currency);
      return { status: 200, body: { page: 1, per_page: items.length || perPage, total: items.length, total_pages: 1, items } };
    }
    const orderParam = query.get("orderby") as OrderBy | null;
    const orderby = orderParam && ORDERS.includes(orderParam) ? orderParam : "newest";
    let category: number | undefined;
    if (query.get("category")) {
      const n = Number(query.get("category"));
      if (!Number.isSafeInteger(n) || n < 1) return error(400, "invalid_request", "Unknown category.");
      category = n;
    }
    const search = (query.get("search") ?? "").trim().slice(0, 100);
    if (query.get("on_sale") === "true" || query.get("on_sale") === "1") {
      const sale = this.sorted(this.summaries(await this.saleProducts({ search, category }, info.currency), info.currency), orderby);
      const start = (page - 1) * perPage;
      return {
        status: 200,
        body: { page, per_page: perPage, total: sale.length, total_pages: Math.max(1, Math.ceil(sale.length / perPage)), items: sale.slice(start, start + perPage) },
      };
    }
    const result = await this.listPage({ search, category }, page, perPage);
    const items = this.sorted(this.summaries(result.items, info.currency), orderby);
    return {
      status: 200,
      body: { page, per_page: perPage, total: result.total, total_pages: Math.max(1, Math.ceil(result.total / perPage)), items },
    };
  }

  private async home() {
    const info = await this.info();
    const [categories, newest, sale] = await Promise.all([
      this.categories(),
      this.cached("newest", () => this.listPage({}, 1, 10)),
      this.saleProducts({}, info.currency),
    ]);
    const products = (type: string, list: SallaProduct[]) => {
      const items = this.summaries(list, info.currency).slice(0, 10);
      return items.length > 0 ? [{ type, title: null, products: items }] : [];
    };
    return [
      ...(categories.length > 0 ? [{ type: "categories", title: null, categories: categories.slice(0, 12) }] : []),
      ...products("sale_products", sale),
      ...products("new_products", newest.items),
    ];
  }

  // Cart and checkout

  private async priced(lines: CartLineInput[]) {
    const info = await this.info();
    const ids = [...new Set(lines.map((l) => l.product_id))];
    const products = new Map<number, SallaProduct>();
    await Promise.all(
      ids.map(async (id) => {
        const product = await this.load(id);
        if (product) products.set(id, product);
      }),
    );
    let currency = info.currency;
    let subtotal = 0;
    let count = 0;
    const out = lines.map((line) => {
      const product = products.get(line.product_id);
      const skus = product ? this.variantSkus(product) : [];
      const lineCurrency = product ? this.currencyOf(product, info.currency) : info.currency;
      const unavailable = (name: string, problem: string) => ({
        product_id: line.product_id,
        variation_id: line.variation_id,
        quantity: line.quantity,
        name,
        image_url: product ? this.imageUrl(product) : null,
        unit_price: this.money(0, lineCurrency),
        line_total: this.money(0, lineCurrency),
        available: false,
        problem,
        max_quantity: null,
        digital: false,
      });
      if (!product) return unavailable("Unavailable product", "This product is no longer available.");
      const sku = line.variation_id === null ? null : skus.find((s) => s.id === line.variation_id);
      if (line.variation_id === null && skus.length > 0) return unavailable(product.name ?? "", "Please choose an option.");
      if (line.variation_id !== null && !sku) return unavailable(product.name ?? "", "This option is no longer available.");
      const { now } = sku ? this.amounts(sku) : this.amounts(product);
      const stock = sku ? this.skuStock(sku) : this.stockStatus(product);
      if (now === null) return unavailable(product.name ?? "", "This product can't be bought right now.");
      const max = Number(product.max_items_per_user) > 0 ? Math.floor(Number(product.max_items_per_user)) : null;
      const quantity = max !== null ? Math.min(line.quantity, max) : line.quantity;
      const available = stock !== "out_of_stock";
      const total = now * quantity;
      if (available) {
        subtotal += total;
        count += quantity;
        currency = lineCurrency;
      }
      const values = sku ? Object.values(this.skuChoices(sku, this.optionNames(product))) : [];
      return {
        product_id: line.product_id,
        variation_id: line.variation_id,
        quantity,
        name: values.length > 0 ? `${product.name ?? ""} - ${values.join(" / ")}` : (product.name ?? ""),
        image_url: this.imageUrl(product),
        unit_price: this.money(now, lineCurrency),
        line_total: this.money(total, lineCurrency),
        available,
        problem: !available ? "Out of stock." : quantity < line.quantity ? `You can buy up to ${quantity} at once.` : null,
        max_quantity: max,
        digital: this.digital(product),
      };
    });
    return {
      products,
      cart: { lines: out, item_count: count, subtotal: this.money(subtotal, currency), subtotal_amount: subtotal.toFixed(2), currency },
    };
  }

  private async quote(request: ConnectorRequest): Promise<ConnectorResult> {
    const lines = cartLines(request.body);
    if (!lines) return error(400, "invalid_request", "The cart is empty or invalid.");
    return { status: 200, body: (await this.priced(lines)).cart };
  }

  /**
   * Salla has no public cart API: a cart with one product opens that
   * product's page on the store (the shopper picks the option again there);
   * larger carts are asked to go one product at a time.
   */
  private async checkoutLink(request: ConnectorRequest): Promise<ConnectorResult> {
    const platform = request.query.get("platform");
    if (platform !== "android" && platform !== "ios") return error(400, "invalid_request", "Unknown platform.");
    const lines = cartLines(request.body);
    if (!lines) return error(400, "invalid_request", "The cart is empty or invalid.");
    const priced = await this.priced(lines);
    if (priced.cart.lines.some((l) => !l.available || l.problem)) {
      return error(409, "cart_changed", "Something in your cart changed. Please check it and try again.");
    }
    if (platform === "ios" && priced.cart.lines.some((l) => l.digital)) {
      return error(403, "purchase_not_allowed", "Digital products can't be bought in the iPhone app.");
    }
    const ids = [...new Set(lines.map((l) => l.product_id))];
    const only = ids.length === 1 ? priced.products.get(ids[0]!) : undefined;
    const page = only ? (httpsUrl(only.urls?.customer) ?? httpsUrl(only.url)) : null;
    if (page) {
      return {
        status: 200,
        body: { url: page, expires_at: new Date(request.now.getTime() + LINK_MINUTES * 60_000).toISOString(), open_in: "browser" },
      };
    }
    return error(
      409,
      "one_product_at_a_time",
      ids.length > 1
        ? "This shop takes one product at a time from the app. Please keep one product in your cart, check out on the shop, then come back for the next."
        : "This product can't be opened on the shop's website right now. Please try again later.",
    );
  }

  // Orders

  /** The Salla customers with exactly this phone number or email. Unverified: `keyword` searches mobiles and emails. */
  private async customerIds(phone: string | null, email: string | null): Promise<number[]> {
    const searches: Promise<SallaCustomer[]>[] = [];
    // The last nine digits find the number however Salla wrote it; each match is compared exactly below.
    if (phone) searches.push(this.client.get<Paged<SallaCustomer>>("/customers", { keyword: phone.slice(-9), per_page: PAGE_LIMIT }).then((b) => b.data ?? []));
    if (email) searches.push(this.client.get<Paged<SallaCustomer>>("/customers", { keyword: email, per_page: PAGE_LIMIT }).then((b) => b.data ?? []));
    const found = (await Promise.all(searches)).flat();
    const same = (c: SallaCustomer) => (phone !== null && sallaPhone(c) === phone) || (email !== null && c.email?.trim().toLowerCase() === email);
    return [...new Set(found.filter((c) => typeof c.id === "number" && c.id > 0 && same(c)).map((c) => c.id!))].slice(0, CUSTOMER_LIMIT);
  }

  /** The customer's orders: those Salla lists for their customer accounts, each confirmed to be theirs. */
  private async customerOrders(user: HostedUser): Promise<SallaOrder[]> {
    const phone = e164Of(user.phone);
    const email = verifiedEmail(user);
    if (!phone && !email) return [];
    const ids = await this.customerIds(phone, email);
    if (ids.length === 0) return [];
    const byId = new Map<number, SallaOrder>();
    let confirmations = 0;
    for (const customerId of ids) {
      // Unverified: the `customer_id` filter. Orders whose customer isn't this one are never shown.
      const body = await this.client.get<Paged<SallaOrder>>("/orders", { customer_id: customerId, per_page: ORDER_LOOKUP_LIMIT });
      for (const order of body.data ?? []) {
        if (typeof order.id !== "number" || byId.has(order.id)) continue;
        let confirmed = order;
        let owner = order.customer?.id;
        if (owner === undefined || owner === null) {
          // A list without the customer: the order itself says whose it is.
          if (confirmations++ >= ORDER_CONFIRM_LIMIT) continue;
          const full = await this.client.get<{ data?: SallaOrder | null }>(`/orders/${order.id}`).catch(() => null);
          owner = full?.data?.customer?.id;
          if (full?.data) confirmed = { ...order, ...full.data, id: order.id };
        }
        if (owner === customerId) byId.set(order.id, confirmed);
      }
    }
    const at = (o: SallaOrder) => Date.parse(sallaDate(o.date) ?? "") || 0;
    return [...byId.values()].sort((a, b) => at(b) - at(a));
  }

  private async orders(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return error(401, "invalid_token", "Your session has ended. Please sign in again.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const all = await this.customerOrders(request.user);
    const info = all.length > 0 ? await this.info() : null;
    const items = all.slice((page - 1) * perPage, page * perPage).map((order) => {
      const { status, label } = sallaOrderStatus(order.status?.slug);
      const total = order.total ?? order.amounts?.total ?? null;
      const currency = total?.currency?.trim().toUpperCase() || info?.currency || "SAR";
      return {
        id: order.id!,
        number: String(order.reference_id ?? order.id),
        status,
        status_label: label,
        total: this.money(amountOf(total?.amount) ?? 0, currency),
        created_at: sallaDate(order.date) ?? request.now.toISOString(),
        items: (order.items ?? []).map((line) => {
          const productId = line.product_id ?? line.product?.id ?? null;
          return {
            name: line.name || "Product",
            course_id: null,
            product_id: typeof productId === "number" && productId > 0 ? productId : null,
            quantity: Math.max(1, Math.round(Number(line.quantity) || 1)),
            image_url: httpsUrl(line.thumbnail) ?? httpsUrl(line.product_thumbnail),
          };
        }),
      };
    });
    return {
      status: 200,
      body: { page, per_page: perPage, total: all.length, total_pages: Math.max(1, Math.ceil(all.length / perPage)), items },
    };
  }
}

/** Clears the cached store data (tests). */
export function clearSallaCache(): void {
  cache.clear();
}

/** The saved values, with defaults for the ones that are missing. */
export function sallaValues(values: Record<string, string>): SallaValues {
  return {
    merchantId: values.merchantId ?? "",
    storeName: values.storeName ?? "",
    storeUrl: values.storeUrl ?? "",
    accessToken: values.accessToken ?? "",
    refreshToken: values.refreshToken ?? "",
    tokenExpiresAt: values.tokenExpiresAt ?? "0",
  };
}

export const SALLA_PLATFORM: PlatformDefinition = {
  id: "salla",
  name: "Salla",
  appType: "store",
  summary: "Your Salla products, prices and stock. Customers finish their order on your Salla store.",
  fields: [],
  normalize: (values) => ({ values }),
  create: (values, deps) => new SallaConnector(sallaValues(values), deps),
  oauth: {
    settingKey: "sallaApp",
    authorizeUrl: sallaAuthorizeUrl,
    connect: connectSalla,
    storeName: (values) => (values.merchantId && values.refreshToken ? values.storeName || "Salla store" : null),
  },
};

registerPlatform(SALLA_PLATFORM);
