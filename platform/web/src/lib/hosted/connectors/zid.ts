import type { DataStore } from "../../data/store";
import type { HostedUser } from "../../data/types";
import { amountOf, cartLines, e164Of, error, formatCurrency, intParam, NumericIds, optionSlug, verifiedEmail, type CartLineInput } from "./common";
import { AccessRevokedError, OAuthRefusedError, TokenKeeper, type TokenValues } from "./oauth-tokens";
import type { PartnerCredentials } from "./partner-apps";
import { PlatformCheckError, registerPlatform, type PlatformConnector, type PlatformDefinition, type PlatformDeps } from "./platforms";
import { ConnectorError, type ConnectorRequest, type ConnectorResult } from "./types";

/**
 * 25 Zid for Store apps, through Zid's Merchant API (https://api.zid.sa/v1):
 * products with their variants, images and prices, categories, and the
 * customer's orders.
 *
 * Connecting. Stores connect to Yallapp's Zid app (Zid Partner Dashboard; its
 * client ID and secret are in admin Settings) with the OAuth
 * authorization-code flow: "Connect with Zid" on the Website step sends the
 * owner to Zid's approval page with a signed `state`, and src/app/oauth/zid
 * swaps the code for tokens. Zid gives two tokens: every request sends the
 * `authorization` token as `Authorization: Bearer …` and the access token as
 * `X-Manager-Token`, with the store's ID (`Store-Id`) and `Role: Manager`.
 * Tokens are renewed a day before they expire and when Zid refuses them, by
 * the TokenKeeper (oauth-tokens.ts), which never uses a refresh token twice.
 *
 * Checkout. Zid has no public API that fills a shopper's cart: a cart with
 * one product opens that product's page on the Zid storefront, in the
 * browser; larger carts are asked to go one product at a time.
 *
 * Orders are those placed by the Zid customers whose mobile number is
 * exactly the customer's verified phone number (E.164), or whose email is
 * exactly the verified email of an email account. An empty phone or email
 * never matches anything.
 *
 * Product and variant IDs are UUIDs while the app's are integers: each
 * becomes a stable number (common.ts), as for Wix. Categories and orders keep
 * Zid's integers. Details marked "Unverified" are from Zid's documentation
 * as we know it, not yet confirmed against a real store.
 */

export const ZID_API_URL = "https://api.zid.sa/v1";
export const ZID_OAUTH_URL = "https://oauth.zid.sa/oauth";
const TOKEN_MARGIN_MS = 24 * 60 * 60_000;
/** Unverified: used when Zid's answer has no `expires_in`. */
const DEFAULT_TOKEN_SECONDS = 365 * 24 * 60 * 60;
const CACHE_MS = 5 * 60_000;
const CACHE_MAX = 1000;
const PAGE_LIMIT = 50;
const SALE_PAGES = 2;
/** Products scanned to find an ID that isn't in memory yet. */
const INDEX_PAGES = 10;
const CUSTOMER_LIMIT = 5;
const ORDER_LOOKUP_LIMIT = 50;
const LINK_MINUTES = 30;
const UNREACHABLE = "Zid didn't answer.";
const REVOKED = "Zid no longer gives Yallapp access to this store. Select Connect with Zid again, and approve the access in Zid.";

type Fetch = typeof fetch;

export interface ZidValues {
  storeId: string;
  storeName: string;
  /** The storefront's address. */
  storeUrl: string;
  currency: string;
  /** Sent as `Authorization: Bearer …`. */
  authorizationToken: string;
  /** Sent as `X-Manager-Token`. */
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
}

/** Zid answered with an HTTP error. */
export class ZidHttpError extends ConnectorError {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ZidHttpError";
  }
}

const httpsUrl = (value: unknown): string | null => (typeof value === "string" && /^https:\/\/[^\s]+$/.test(value.trim()) ? value.trim() : null);

/** Zid's names come as text or per language: English first, then Arabic. */
export type ZidText = string | { en?: string | null; ar?: string | null } | null | undefined;
export function zidText(value: ZidText): string {
  if (typeof value === "string") return value;
  return value?.en?.trim() || value?.ar?.trim() || "";
}

// OAuth

/** Zid's approval page for Yallapp's app. */
export function zidAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const query = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", state });
  return `${ZID_OAUTH_URL}/authorize?${query}`;
}

/** Asks Zid's token endpoint for tokens (an authorization code or a refresh token). */
export async function zidTokenRequest(
  params: Record<string, string>,
  credentials: Pick<PartnerCredentials, "clientId" | "clientSecret">,
  fetcher: Fetch = fetch,
  now = Date.now(),
): Promise<TokenValues> {
  let response: Response;
  try {
    response = await fetcher(`${ZID_OAUTH_URL}/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams({ ...params, client_id: credentials.clientId, client_secret: credentials.clientSecret }).toString(),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ConnectorError(UNREACHABLE);
  }
  if (response.status === 400 || response.status === 401) throw new OAuthRefusedError(`Zid refused the ${params.grant_type === "refresh_token" ? "refresh token" : "code"}.`);
  if (!response.ok) throw new ZidHttpError(`Zid answered HTTP ${response.status}.`, response.status);
  const body = (await response.json().catch(() => ({}))) as { access_token?: unknown; authorization?: unknown; refresh_token?: unknown; expires_in?: unknown };
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  // Unverified: Zid's answer carries both tokens, `authorization` (the Bearer token) and `access_token` (the manager token).
  if (!text(body.access_token) || !text(body.authorization) || !text(body.refresh_token)) throw new ConnectorError("Zid sent no tokens.");
  const seconds = Number(body.expires_in) > 0 ? Number(body.expires_in) : DEFAULT_TOKEN_SECONDS;
  return {
    authorizationToken: text(body.authorization).replace(/^Bearer\s+/i, ""),
    accessToken: text(body.access_token),
    refreshToken: text(body.refresh_token),
    tokenExpiresAt: String(now + seconds * 1000),
  };
}

const authHeaders = (tokens: TokenValues, storeId: string | null): Record<string, string> => ({
  authorization: `Bearer ${tokens.authorizationToken}`,
  "x-manager-token": tokens.accessToken ?? "",
  // Unverified: the store and role headers the product endpoints ask for; the others ignore them.
  ...(storeId ? { "store-id": storeId } : {}),
  role: "Manager",
  "accept-language": "en",
  accept: "application/json",
});

interface ZidStore {
  id?: number | string | null;
  title?: ZidText;
  url?: string | null;
  currency?: string | { code?: string | null } | null;
}

/** The store of the manager's tokens. Unverified: GET /managers/account/profile answers `{user: {store: {id, title, url, currency}}}`. */
async function zidProfile(tokens: TokenValues, fetcher: Fetch): Promise<ZidStore | null> {
  let response: Response;
  try {
    response = await fetcher(`${ZID_API_URL}/managers/account/profile`, { headers: authHeaders(tokens, null), signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new ConnectorError(UNREACHABLE);
  }
  if (response.status === 401) throw new AccessRevokedError("Zid");
  if (!response.ok) throw new ZidHttpError(`Zid answered HTTP ${response.status}.`, response.status);
  const body = (await response.json().catch(() => ({}))) as { user?: { store?: ZidStore | null } | null };
  return body.user?.store ?? null;
}

function storeValues(store: ZidStore | null): { storeId: string; storeName: string; storeUrl: string; currency: string } {
  const id = store?.id === null || store?.id === undefined ? "" : String(store.id);
  const code = typeof store?.currency === "string" ? store.currency : (store?.currency?.code ?? "");
  const currency = code.trim().toUpperCase();
  return {
    storeId: /^[\w-]{1,64}$/.test(id) ? id : "",
    storeName: zidText(store?.title).trim() || "Zid store",
    storeUrl: httpsUrl(store?.url) ?? "",
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "SAR",
  };
}

/** Swaps an authorization code for tokens and the manager's store. */
export async function connectZid(code: string, credentials: PartnerCredentials, redirectUri: string, fetcher: Fetch = fetch): Promise<Record<string, string>> {
  const tokens = await zidTokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri }, credentials, fetcher);
  const store = storeValues(await zidProfile(tokens, fetcher));
  if (!store.storeId) throw new ConnectorError("Zid sent no store.");
  return { ...tokens, ...store };
}

// The API

export type ZidDeps = Pick<PlatformDeps, "appId" | "fetcher" | "saveSecrets" | "loadSecrets" | "partnerApp"> & { store: Pick<DataStore, "hitRateLimit"> };

export class ZidClient {
  private readonly keeper: TokenKeeper;

  constructor(
    private readonly values: ZidValues,
    private readonly deps: ZidDeps,
  ) {
    this.keeper = new TokenKeeper({
      platform: "Zid",
      appId: deps.appId,
      account: values.storeId,
      store: deps.store,
      initial: {
        authorizationToken: values.authorizationToken,
        accessToken: values.accessToken,
        refreshToken: values.refreshToken,
        tokenExpiresAt: values.tokenExpiresAt,
      },
      marginMs: TOKEN_MARGIN_MS,
      refresh: async (refreshToken) => {
        const credentials = await deps.partnerApp?.();
        if (!credentials) throw new ConnectorError("Yallapp's Zid app isn't set.");
        // Unverified: Zid renews with grant_type=refresh_token and the partner app's credentials.
        return zidTokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken }, credentials, deps.fetcher);
      },
      save: (tokens) => deps.saveSecrets(tokens),
      load: async () => {
        const saved = await deps.loadSecrets?.();
        return saved && saved.storeId === values.storeId ? saved : null;
      },
    });
  }

  /** A GET on the API; renews the tokens once when Zid refuses them. */
  async get<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T> {
    const search = new URLSearchParams();
    for (const [name, value] of Object.entries(query)) if (value !== undefined && value !== "") search.set(name, String(value));
    const url = `${ZID_API_URL}${path}${search.size ? `?${search}` : ""}`;
    let tokens = await this.keeper.current();
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await this.deps.fetcher(url, { headers: authHeaders(tokens, this.values.storeId), signal: AbortSignal.timeout(10_000) });
      } catch {
        throw new ConnectorError(UNREACHABLE);
      }
      if (response.status === 401 && attempt === 0) {
        tokens = await this.keeper.renew(tokens);
        continue;
      }
      if (response.status === 401) throw new AccessRevokedError("Zid");
      if (!response.ok) throw new ZidHttpError(`Zid answered HTTP ${response.status}.`, response.status);
      return (await response.json().catch(() => ({}))) as T;
    }
  }
}

// Zid's objects, the fields the connector reads

interface ZidImage {
  image?: { full_size?: string | null; large?: string | null; medium?: string | null; small?: string | null; thumbnail?: string | null } | null;
  alt_text?: string | null;
}
export interface ZidVariant {
  id?: string | null;
  sku?: string | null;
  price?: number | string | null;
  sale_price?: number | string | null;
  quantity?: number | null;
  is_infinite?: boolean | null;
  is_published?: boolean | null;
  attributes?: { slug?: string | null; name?: ZidText; value?: ZidText }[] | null;
  images?: ZidImage[] | null;
}
export interface ZidProduct {
  id: string;
  name?: ZidText;
  description?: ZidText;
  sku?: string | null;
  price?: number | string | null;
  sale_price?: number | string | null;
  currency?: string | null;
  quantity?: number | null;
  is_infinite?: boolean | null;
  is_published?: boolean | null;
  images?: ZidImage[] | null;
  html_url?: string | null;
  categories?: { id?: number | null }[] | null;
  variants?: ZidVariant[] | null;
  requires_shipping?: boolean | null;
  product_class?: string | null;
  rating?: { average?: number | null; total_count?: number | null } | null;
}
interface ZidCategory {
  id?: number | null;
  name?: ZidText;
  image?: string | null;
  products_count?: number | null;
  sub_categories?: ZidCategory[] | null;
}
export interface ZidCustomer {
  id?: number | null;
  email?: string | null;
  mobile?: string | number | null;
}
export interface ZidOrder {
  id?: number | null;
  code?: string | number | null;
  order_status?: { code?: string | null } | null;
  currency_code?: string | null;
  order_total?: number | string | null;
  created_at?: string | null;
  customer?: ZidCustomer | null;
  products?: { id?: string | null; name?: ZidText; quantity?: number | null; images?: ZidImage[] | null }[] | null;
}

// Values

/**
 * A Zid mobile number in E.164, or null. Unverified: Zid writes numbers with
 * their country code, with or without "+" (966500000000); a number without
 * it never matches anyone.
 */
export function zidPhone(value: string | number | null | undefined): string | null {
  const v = String(value ?? "").replace(/[\s().-]/g, "");
  if (!v) return null;
  if (v.startsWith("+") || v.startsWith("00")) return e164Of(v);
  return /^[1-9]\d{9,14}$/.test(v) ? e164Of(`+${v}`) : null;
}

/** The order's status in the contract's words, and an English label. Unverified: Zid's status codes. */
export function zidOrderStatus(code: string | null | undefined): { status: string; label: string } {
  switch ((code ?? "").toLowerCase()) {
    case "new":
      return { status: "pending", label: "New" };
    case "preparing":
      return { status: "processing", label: "Preparing" };
    case "ready":
      return { status: "processing", label: "Ready" };
    case "indelivery":
    case "in_delivery":
      return { status: "processing", label: "Out for delivery" };
    case "delivered":
      return { status: "completed", label: "Delivered" };
    case "cancelled":
    case "canceled":
      return { status: "cancelled", label: "Cancelled" };
    case "reversed":
    case "refunded":
      return { status: "refunded", label: "Refunded" };
    default:
      return { status: "processing", label: "Processing" };
  }
}

/** Unverified: Zid's dates ("2026-10-01 09:00:00") are in Riyadh time (UTC+3). */
export function zidDate(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/.exec(text);
  const parsed = match ? Date.parse(`${match[1]}T${match[2]}+03:00`) : Date.parse(text);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function imageOf(image: ZidImage | null | undefined): string | null {
  const i = image?.image;
  return httpsUrl(i?.large) ?? httpsUrl(i?.full_size) ?? httpsUrl(i?.medium) ?? httpsUrl(i?.small) ?? httpsUrl(i?.thumbnail);
}

const cache = new Map<string, { at: number; value: unknown }>();
const idMaps = new Map<string, { products: NumericIds; variants: NumericIds }>();

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

interface ProductPage {
  count?: number | null;
  next?: string | null;
  results?: ZidProduct[] | null;
}

export class ZidConnector implements PlatformConnector {
  private readonly client: ZidClient;
  private readonly ids: { products: NumericIds; variants: NumericIds };

  constructor(
    private readonly values: ZidValues,
    deps: ZidDeps,
  ) {
    this.client = new ZidClient(values, deps);
    let ids = idMaps.get(values.storeId);
    if (!ids) {
      ids = { products: new NumericIds("Zid"), variants: new NumericIds("Zid") };
      idMaps.set(values.storeId, ids);
    }
    this.ids = ids;
  }

  private get connected(): boolean {
    return Boolean(this.values.storeId && this.values.refreshToken);
  }

  private async cached<T>(name: string, load: () => Promise<T>): Promise<T> {
    const key = `${this.values.storeId}:${name}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as T;
    const value = await load();
    cache.delete(key);
    cache.set(key, { at: Date.now(), value });
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
    return value;
  }

  private money(amount: number, currency: string): string {
    return formatCurrency(amount, currency);
  }

  private get currency(): string {
    return /^[A-Z]{3}$/.test(this.values.currency) ? this.values.currency : "SAR";
  }

  /** Reads the store's profile and one product; returns the store's name, or says what to fix. */
  async check(): Promise<string> {
    if (!this.connected) throw new PlatformCheckError("Connect your Zid store first: select Connect with Zid and approve the access in Zid.");
    try {
      const profile = await this.client.get<{ user?: { store?: ZidStore | null } | null }>("/managers/account/profile");
      await this.client.get("/products/", { page: 1, page_size: 1 });
      return storeValues(profile.user?.store ?? null).storeName || this.values.storeName;
    } catch (e) {
      if (e instanceof AccessRevokedError) throw new PlatformCheckError(REVOKED);
      if (e instanceof ZidHttpError && e.status === 403) {
        throw new PlatformCheckError("Zid didn't let Yallapp read this store's products. Ask us to check the Zid app's permissions, then select Connect with Zid again.");
      }
      throw e;
    }
  }

  async config() {
    return {
      store: {
        currency: this.currency,
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
          return { status: 200, body: { items: await this.categoryList() } };
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

  private visible(p: { is_published?: boolean | null }): boolean {
    return p.is_published !== false;
  }

  private digital(product: ZidProduct): boolean {
    // Unverified: products without shipping, or of a digital class, are the digital ones.
    return product.requires_shipping === false || /digital|voucher|download/i.test(product.product_class ?? "");
  }

  private stock(item: { quantity?: number | null; is_infinite?: boolean | null }): StockStatus {
    if (item.is_infinite) return "in_stock";
    return typeof item.quantity === "number" && item.quantity <= 0 ? "out_of_stock" : "in_stock";
  }

  private amounts(item: { price?: number | string | null; sale_price?: number | string | null }): { now: number | null; regular: number | null } {
    const price = amountOf(item.price);
    const sale = amountOf(item.sale_price);
    if (sale !== null && sale > 0 && price !== null && sale < price) return { now: sale, regular: price };
    return { now: price, regular: price };
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

  private currencyOf(product: ZidProduct): string {
    const c = product.currency?.trim().toUpperCase();
    return c && /^[A-Z]{3}$/.test(c) ? c : this.currency;
  }

  private variants(product: ZidProduct): ZidVariant[] {
    return (product.variants ?? []).filter((v) => v.id && this.visible(v) && (v.attributes?.length ?? 0) > 0);
  }

  private productPrice(product: ZidProduct) {
    const variants = this.variants(product);
    const currency = this.currencyOf(product);
    const amounts = variants.map((v) => this.amounts(v)).filter((a) => a.now !== null);
    if (amounts.length > 0) {
      const min = Math.min(...amounts.map((a) => a.now!));
      const max = Math.max(...amounts.map((a) => a.now!));
      return this.price(min, max, amounts.find((a) => a.now === min)!.regular, currency);
    }
    const { now, regular } = this.amounts(product);
    return this.price(now, now, regular, currency);
  }

  private summary(product: ZidProduct) {
    const id = this.ids.products.add(product.id);
    if (id === null) return null;
    const price = this.productPrice(product);
    const variants = this.variants(product);
    const stock = variants.length > 0 ? (variants.some((v) => this.stock(v) !== "out_of_stock") ? "in_stock" : "out_of_stock") : this.stock(product);
    const rating = amountOf(product.rating?.average);
    return {
      id,
      name: zidText(product.name),
      type: variants.length > 0 ? "variable" : "simple",
      image_url: imageOf(product.images?.[0]),
      price,
      rating: rating !== null && rating > 0 ? Math.min(5, rating) : null,
      rating_count: Math.max(0, Math.floor(Number(product.rating?.total_count) || 0)),
      stock_status: stock as StockStatus,
      purchasable: stock !== "out_of_stock" && price.amount !== "0.00",
      digital: this.digital(product),
    };
  }

  private summaries(products: ZidProduct[]) {
    return products
      .filter((p) => typeof p.id === "string" && p.id && this.visible(p))
      .map((p) => this.summary(p))
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }

  /** Option slugs from the variants' attributes. */
  private attributesOf(product: ZidProduct) {
    const options: { slug: string; name: string; values: string[] }[] = [];
    for (const v of this.variants(product)) {
      for (const a of v.attributes ?? []) {
        const name = zidText(a.name) || a.slug || "Option";
        const slug = a.slug ? optionSlug(a.slug) : optionSlug(name);
        const value = zidText(a.value);
        let option = options.find((o) => o.slug === slug);
        if (!option) {
          option = { slug, name, values: [] };
          options.push(option);
        }
        if (value && !option.values.includes(value)) option.values.push(value);
      }
    }
    return options;
  }

  private variantChoices(variant: ZidVariant): Record<string, string> {
    const out: Record<string, string> = {};
    for (const a of variant.attributes ?? []) {
      const name = zidText(a.name) || a.slug || "Option";
      out[a.slug ? optionSlug(a.slug) : optionSlug(name)] = zidText(a.value);
    }
    return out;
  }

  private permalink(product: ZidProduct): string {
    return httpsUrl(product.html_url) ?? httpsUrl(this.values.storeUrl) ?? "https://zid.sa/";
  }

  private async detail(product: ZidProduct) {
    const summary = this.summary(product)!;
    const currency = this.currencyOf(product);
    const variable = summary.type === "variable";
    const seen = new Set<string>();
    const images = (product.images ?? [])
      .map((i) => ({ url: imageOf(i), alt: i.alt_text || zidText(product.name) || null }))
      .filter((i): i is { url: string; alt: string | null } => i.url !== null && !seen.has(i.url) && Boolean(seen.add(i.url)));
    const categories = await this.categoryList();
    const own = (product.categories ?? []).map((c) => categories.find((k) => k.id === c.id)).filter((c): c is CategoryItem => Boolean(c));
    const related = own[0] ? await this.listPage({ category: own[0].id }, 1, 9).catch(() => ({ items: [] as ZidProduct[], total: 0, hasNext: false })) : { items: [] };
    return {
      ...summary,
      description_html: zidText(product.description),
      short_description_html: null,
      images,
      sku: product.sku || null,
      max_quantity: null,
      attributes: variable
        ? this.attributesOf(product).map((o) => ({ slug: o.slug, name: o.name, variation: true, options: o.values.map((v) => ({ value: v, label: v })) }))
        : [],
      variations: variable
        ? this.variants(product)
            .map((v) => {
              const id = this.ids.variants.add(v.id!);
              if (id === null) return null;
              const { now, regular } = this.amounts(v);
              const stock = this.stock(v);
              return {
                id,
                attributes: this.variantChoices(v),
                price: this.price(now, now, regular, currency),
                image_url: imageOf(v.images?.[0]),
                stock_status: stock,
                max_quantity: null,
                purchasable: stock !== "out_of_stock" && now !== null,
              };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null)
        : [],
      categories: own,
      related: this.summaries(related.items.filter((p) => p.id !== product.id)).slice(0, 8),
      external_url: null,
      permalink: this.permalink(product),
    };
  }

  /** The Zid ID of a product number: from memory, or else from the first INDEX_PAGES pages of products. */
  private async productId(n: number): Promise<string | null> {
    const known = this.ids.products.get(n);
    if (known) return known;
    await this.cached("index", async () => {
      for (let page = 1; page <= INDEX_PAGES; page++) {
        const chunk = await this.listPage({}, page, PAGE_LIMIT);
        for (const p of chunk.items) if (p.id) this.ids.products.add(p.id);
        if (!chunk.hasNext) break;
      }
      return true;
    });
    return this.ids.products.get(n);
  }

  /** A product with its variants, or null when Zid doesn't show it. */
  private load(zidId: string): Promise<ZidProduct | null> {
    return this.cached(`product:${zidId}`, async () => {
      try {
        const product = await this.client.get<ZidProduct>(`/products/${encodeURIComponent(zidId)}/`);
        return product?.id === zidId && this.visible(product) ? product : null;
      } catch (e) {
        if (e instanceof ZidHttpError && e.status === 404) return null;
        throw e;
      }
    });
  }

  private async product(id: number): Promise<ConnectorResult> {
    const zidId = await this.productId(id);
    const product = zidId ? await this.load(zidId) : null;
    if (!product) return error(404, "not_found", "Product not found.");
    return { status: 200, body: await this.detail(product) };
  }

  // Categories

  /** The store's categories, flattened. Unverified: GET /managers/store/categories with `sub_categories`. */
  private categoryList(): Promise<CategoryItem[]> {
    return this.cached("categories", async () => {
      const body = await this.client.get<{ categories?: ZidCategory[] | null }>("/managers/store/categories");
      const out: CategoryItem[] = [];
      const seen = new Set<number>();
      const walk = (list: ZidCategory[] | null | undefined, parent: number | null, depth: number) => {
        for (const c of list ?? []) {
          if (typeof c.id !== "number" || c.id < 1 || seen.has(c.id)) continue;
          seen.add(c.id);
          out.push({ id: c.id, name: zidText(c.name), count: Math.max(0, Math.floor(Number(c.products_count) || 0)), parent_id: parent, image_url: httpsUrl(c.image) });
          if (depth < 10) walk(c.sub_categories, c.id, depth + 1);
        }
      };
      walk(body.categories, null, 0);
      return out;
    });
  }

  // Listing

  /** One page of Zid's products. Unverified: the `search` and `categories` filters. */
  private async listPage(filter: { search?: string; category?: number }, page: number, perPage: number) {
    const body = await this.client.get<ProductPage>("/products/", {
      page,
      page_size: Math.min(perPage, PAGE_LIMIT),
      search: filter.search || undefined,
      categories: filter.category,
    });
    const items = body.results ?? [];
    return { items, total: Math.max(items.length, Math.floor(Number(body.count) || 0)), hasNext: Boolean(body.next) };
  }

  private async saleProducts(filter: { search?: string; category?: number }): Promise<ZidProduct[]> {
    const load = async () => {
      const out: ZidProduct[] = [];
      for (let page = 1; page <= SALE_PAGES; page++) {
        const chunk = await this.listPage(filter, page, PAGE_LIMIT);
        out.push(...chunk.items);
        if (!chunk.hasNext) break;
      }
      return out;
    };
    const all = filter.search || filter.category ? await load() : await this.cached("sale", load);
    return all.filter((p) => this.visible(p) && this.productPrice(p).on_sale);
  }

  /** Unverified: Zid's list has no documented sort; the price and name orders sort each page. */
  private sorted(items: ReturnType<ZidConnector["summaries"]>, orderby: OrderBy) {
    const amount = (s: (typeof items)[number]) => Number(s.price.amount);
    if (orderby === "price_asc") return [...items].sort((a, b) => amount(a) - amount(b));
    if (orderby === "price_desc") return [...items].sort((a, b) => amount(b) - amount(a));
    if (orderby === "title") return [...items].sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }

  private async products(query: URLSearchParams): Promise<ConnectorResult> {
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
      const zidIds = (await Promise.all(ids.map((id) => this.productId(id)))).filter((id): id is string => id !== null);
      const products = (await Promise.all(zidIds.map((id) => this.load(id)))).filter((p): p is ZidProduct => p !== null);
      const items = this.summaries(products);
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
      const sale = this.sorted(this.summaries(await this.saleProducts({ search, category })), orderby);
      const start = (page - 1) * perPage;
      return {
        status: 200,
        body: { page, per_page: perPage, total: sale.length, total_pages: Math.max(1, Math.ceil(sale.length / perPage)), items: sale.slice(start, start + perPage) },
      };
    }
    const result = await this.listPage({ search, category }, page, perPage);
    const items = this.sorted(this.summaries(result.items), orderby);
    return {
      status: 200,
      body: { page, per_page: perPage, total: result.total, total_pages: Math.max(1, Math.ceil(result.total / perPage)), items },
    };
  }

  private async home() {
    const [categories, newest, sale] = await Promise.all([
      this.categoryList(),
      this.cached("newest", () => this.listPage({}, 1, 10)),
      this.saleProducts({}),
    ]);
    const products = (type: string, list: ZidProduct[]) => {
      const items = this.summaries(list).slice(0, 10);
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
    const zidIds = new Map<number, string>();
    await Promise.all(
      [...new Set(lines.map((l) => l.product_id))].map(async (n) => {
        const id = await this.productId(n);
        if (id) zidIds.set(n, id);
      }),
    );
    const products = new Map<number, ZidProduct>();
    await Promise.all(
      [...zidIds].map(async ([n, id]) => {
        const product = await this.load(id);
        if (product) products.set(n, product);
      }),
    );
    let currency = this.currency;
    let subtotal = 0;
    let count = 0;
    const out = lines.map((line) => {
      const product = products.get(line.product_id);
      const variants = product ? this.variants(product) : [];
      for (const v of variants) this.ids.variants.add(v.id!);
      const lineCurrency = product ? this.currencyOf(product) : this.currency;
      const unavailable = (name: string, problem: string) => ({
        product_id: line.product_id,
        variation_id: line.variation_id,
        quantity: line.quantity,
        name,
        image_url: product ? imageOf(product.images?.[0]) : null,
        unit_price: this.money(0, lineCurrency),
        line_total: this.money(0, lineCurrency),
        available: false,
        problem,
        max_quantity: null,
        digital: false,
      });
      if (!product) return unavailable("Unavailable product", "This product is no longer available.");
      const name = zidText(product.name);
      if (line.variation_id === null && variants.length > 0) return unavailable(name, "Please choose an option.");
      const variant = line.variation_id === null ? null : variants.find((v) => this.ids.variants.get(line.variation_id!) === v.id);
      if (line.variation_id !== null && !variant) return unavailable(name, "This option is no longer available.");
      const { now } = this.amounts(variant ?? product);
      if (now === null) return unavailable(name, "This product can't be bought right now.");
      const available = this.stock(variant ?? product) !== "out_of_stock";
      const total = now * line.quantity;
      if (available) {
        subtotal += total;
        count += line.quantity;
        currency = lineCurrency;
      }
      const values = variant ? Object.values(this.variantChoices(variant)).filter(Boolean) : [];
      return {
        product_id: line.product_id,
        variation_id: line.variation_id,
        quantity: line.quantity,
        name: values.length > 0 ? `${name} - ${values.join(" / ")}` : name,
        image_url: imageOf(variant?.images?.[0]) ?? imageOf(product.images?.[0]),
        unit_price: this.money(now, lineCurrency),
        line_total: this.money(total, lineCurrency),
        available,
        problem: available ? null : "Out of stock.",
        max_quantity: null,
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

  /** Zid has no public cart API: a cart with one product opens its page on the store; larger carts go one product at a time. */
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
    const page = only ? httpsUrl(only.html_url) : null;
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

  /** Whether an order's own customer is exactly this phone or email. */
  private sameCustomer(customer: ZidCustomer | null | undefined, phone: string | null, email: string | null): boolean {
    if (!customer) return false;
    return (phone !== null && zidPhone(customer.mobile) === phone) || (email !== null && customer.email?.trim().toLowerCase() === email);
  }

  /** The Zid customers with exactly this phone number or email. Unverified: the customers list's `search`. */
  private async customerIds(phone: string | null, email: string | null): Promise<Set<number>> {
    const searches: Promise<ZidCustomer[]>[] = [];
    if (phone) searches.push(this.client.get<{ customers?: ZidCustomer[] | null }>("/managers/store/customers", { search: phone.replace(/^\+/, "") }).then((b) => b.customers ?? []));
    if (email) searches.push(this.client.get<{ customers?: ZidCustomer[] | null }>("/managers/store/customers", { search: email }).then((b) => b.customers ?? []));
    const found = (await Promise.all(searches)).flat();
    return new Set(found.filter((c) => typeof c.id === "number" && c.id > 0 && this.sameCustomer(c, phone, email)).map((c) => c.id!).slice(0, CUSTOMER_LIMIT));
  }

  /**
   * The customer's orders, newest first: those of their Zid customer accounts
   * (Unverified: the `customer_id` filter), and those among the newest orders
   * placed with exactly their phone or email. Each order's own customer is
   * checked, so a filter Zid ignores never shows someone else's orders.
   */
  private async customerOrders(user: HostedUser): Promise<ZidOrder[]> {
    const phone = e164Of(user.phone);
    const email = verifiedEmail(user);
    if (!phone && !email) return [];
    const customers = await this.customerIds(phone, email);
    const list = (query: Record<string, string | number>) =>
      this.client.get<{ orders?: ZidOrder[] | null }>("/managers/store/orders", { ...query, per_page: ORDER_LOOKUP_LIMIT, page: 1 }).then((b) => b.orders ?? []);
    const lists = await Promise.all([...[...customers].map((id) => list({ customer_id: id })), list({})]);
    const byId = new Map<number, ZidOrder>();
    for (const order of lists.flat()) {
      if (typeof order.id !== "number") continue;
      const ownerId = order.customer?.id;
      const theirs = (typeof ownerId === "number" && customers.has(ownerId)) || this.sameCustomer(order.customer, phone, email);
      if (theirs) byId.set(order.id, order);
    }
    const at = (o: ZidOrder) => Date.parse(zidDate(o.created_at) ?? "") || 0;
    return [...byId.values()].sort((a, b) => at(b) - at(a));
  }

  private async orders(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return error(401, "invalid_token", "Your session has ended. Please sign in again.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const all = await this.customerOrders(request.user);
    const items = all.slice((page - 1) * perPage, page * perPage).map((order) => {
      const { status, label } = zidOrderStatus(order.order_status?.code);
      const currency = order.currency_code?.trim().toUpperCase() || this.currency;
      return {
        id: order.id!,
        number: String(order.code ?? order.id),
        status,
        status_label: label,
        total: this.money(amountOf(order.order_total) ?? 0, /^[A-Z]{3}$/.test(currency) ? currency : this.currency),
        created_at: zidDate(order.created_at) ?? request.now.toISOString(),
        items: (order.products ?? []).map((line) => ({
          name: zidText(line.name) || "Product",
          course_id: null,
          product_id: line.id ? this.ids.products.add(line.id) : null,
          quantity: Math.max(1, Math.round(Number(line.quantity) || 1)),
          image_url: imageOf(line.images?.[0]),
        })),
      };
    });
    return {
      status: 200,
      body: { page, per_page: perPage, total: all.length, total_pages: Math.max(1, Math.ceil(all.length / perPage)), items },
    };
  }
}

/** Clears the cached store data and ID numbers (tests). */
export function clearZidCache(): void {
  cache.clear();
  idMaps.clear();
}

export function zidValues(values: Record<string, string>): ZidValues {
  return {
    storeId: values.storeId ?? "",
    storeName: values.storeName ?? "",
    storeUrl: values.storeUrl ?? "",
    currency: values.currency ?? "SAR",
    authorizationToken: values.authorizationToken ?? "",
    accessToken: values.accessToken ?? "",
    refreshToken: values.refreshToken ?? "",
    tokenExpiresAt: values.tokenExpiresAt ?? "0",
  };
}

export const ZID_PLATFORM: PlatformDefinition = {
  id: "zid",
  name: "Zid",
  appType: "store",
  summary: "Your Zid products, prices and stock. Customers finish their order on your Zid store.",
  fields: [],
  normalize: (values) => ({ values }),
  create: (values, deps) => new ZidConnector(zidValues(values), deps),
  oauth: {
    settingKey: "zidApp",
    authorizeUrl: zidAuthorizeUrl,
    connect: connectZid,
    storeName: (values) => (values.storeId && values.refreshToken ? values.storeName || "Zid store" : null),
  },
};

registerPlatform(ZID_PLATFORM);
