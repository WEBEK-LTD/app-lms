import { cartLines, error, intParam, type CartLineInput } from "./common";
import { registerPlatform, type PlatformConnector, type PlatformDefinition, type PlatformDeps } from "./platforms";
import { ConnectorError, type ConnectorRequest, type ConnectorResult } from "./types";

/**
 * IdeaSoft for Store apps, through the store's Admin API
 * (`https://<store>.myideasoft.com/admin-api`): catalog, cart pricing, a
 * checkout hand-off and order history. Products, variants (child products),
 * categories and orders keep IdeaSoft's numeric IDs.
 *
 * Connecting. IdeaSoft has no static API keys, only OAuth2 authorization
 * code, and its codes live about 30 seconds. The client creates an API client
 * in their panel (Entegrasyonlar > API) with the redirect URI
 * https://yallapp.com.tr/oauth/ideasoft, then opens that page
 * (src/app/oauth/ideasoft/route.ts), enters the store address, Client ID and
 * Client Secret, and approves the access in IdeaSoft. The page swaps the code
 * for tokens on the server right away and shows the refresh token, which the
 * client pastes in the dashboard with the same Client ID and Client Secret.
 * Nothing is kept on our side until the dashboard saves the connection.
 * If the page can't swap the code itself (the client opened IdeaSoft's
 * authorize address by hand), it shows the code instead: `check()` accepts an
 * authorization code in the same field and swaps it, as long as it is pasted
 * within IdeaSoft's 30 seconds.
 *
 * Tokens. Access tokens (about 24 hours) stay in memory per process. Each
 * refresh returns a new refresh token (the old one stops working), which is
 * saved at once with `deps.saveSecrets`. Within a process, a refresh token
 * that was already renewed is followed to its newest one, so a stale copy
 * (or a dashboard check that failed after renewing) still works.
 */

export const IDEASOFT_REDIRECT_URI = "https://yallapp.com.tr/oauth/ideasoft";
const PAGE_LIMIT = 100;
const CACHE_MS = 5 * 60_000;
const LIST_CACHE_MS = 60_000;
const TOKEN_MARGIN_MS = 5 * 60_000;
const CHECKOUT_LINK_MINUTES = 30;
/** Quick carts we create are reused for the same lines, then deleted. */
const QUICK_CART_MS = 24 * 60 * 60_000;

type Fetch = typeof fetch;

export interface IdeasoftSettings {
  /** "your-store.myideasoft.com". */
  host: string;
  clientId: string;
  clientSecret: string;
  /** A refresh token, or (only while connecting) an authorization code. */
  refreshToken: string;
}

/** "your-store.myideasoft.com" from what a client typed ("https://your-store.myideasoft.com/panel", "your-store"). */
export function normalizeIdeasoftHost(value: string): string | null {
  let host = value.trim().toLowerCase();
  host = host.replace(/^https?:\/\//, "").split(/[/?#:]/)[0] ?? "";
  host = host.replace(/^www\./, "");
  if (/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(host)) host = `${host}.myideasoft.com`;
  // Unverified: custom domains may serve the API too; the spec only shows *.myideasoft.com, so only those are accepted.
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.myideasoft\.com$/.test(host) ? host : null;
}

/** IdeaSoft's page where the store owner approves the access. */
export function ideasoftAuthorizeUrl(host: string, clientId: string): string {
  const query = new URLSearchParams({ client_id: clientId, response_type: "code", state: host, redirect_uri: IDEASOFT_REDIRECT_URI });
  return `https://${host}/panel/auth?${query}`;
}

// API errors

/** IdeaSoft answered with an HTTP error. */
export class IdeasoftHttpError extends ConnectorError {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "IdeasoftHttpError";
  }
}

export interface IdeasoftTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
}

/** Asks the store's token endpoint for tokens (authorization code or refresh token). */
export async function ideasoftTokenRequest(host: string, params: Record<string, string>, fetcher: Fetch = fetch): Promise<IdeasoftTokens> {
  let response: Response;
  try {
    // [Community] form-encoded POST; older examples sent the same parameters as a GET query.
    response = await fetcher(`https://${host}/oauth/v2/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ConnectorError("IdeaSoft didn't answer.");
  }
  if (!response.ok) throw new IdeasoftHttpError(`IdeaSoft answered HTTP ${response.status}.`, response.status);
  const body = (await response.json().catch(() => ({}))) as { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown };
  if (typeof body.access_token !== "string" || !body.access_token) throw new ConnectorError("IdeaSoft sent no access token.");
  const expiresIn = Number(body.expires_in);
  return {
    accessToken: body.access_token,
    refreshToken: typeof body.refresh_token === "string" && body.refresh_token ? body.refresh_token : null,
    expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 24 * 60 * 60,
  };
}

/** Swaps an authorization code (from the redirect to IDEASOFT_REDIRECT_URI) for tokens. */
export function exchangeIdeasoftCode(
  host: string,
  clientId: string,
  clientSecret: string,
  code: string,
  fetcher: Fetch = fetch,
): Promise<IdeasoftTokens> {
  return ideasoftTokenRequest(
    host,
    { grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, code, redirect_uri: IDEASOFT_REDIRECT_URI },
    fetcher,
  );
}

// Tokens, per process

const accessTokens = new Map<string, { token: string; expiresAt: number }>();
/** `host|clientId|old refresh token` to the one that replaced it. */
const renewedTokens = new Map<string, string>();
const renewals = new Map<string, Promise<string>>();

function rememberRenewal(key: string, next: string): void {
  renewedTokens.set(key, next);
  // A refresh a day per store: keep the map small all the same.
  if (renewedTokens.size > 2000) renewedTokens.delete(renewedTokens.keys().next().value!);
}

export class IdeasoftClient {
  private refreshToken: string;
  private readonly tokenKey: string;

  constructor(
    private readonly settings: IdeasoftSettings,
    private readonly fetcher: Fetch,
    private readonly saveSecrets: (secrets: Record<string, string>) => Promise<void>,
    appId: string,
  ) {
    this.tokenKey = `${appId}|${settings.host}|${settings.clientId}`;
    this.refreshToken = this.newest(settings.refreshToken);
  }

  private renewalKey(token: string): string {
    return `${this.settings.host}|${this.settings.clientId}|${token}`;
  }

  private newest(token: string): string {
    let current = token;
    for (let i = 0; i < 20; i++) {
      const next = renewedTokens.get(this.renewalKey(current));
      if (!next) break;
      current = next;
    }
    return current;
  }

  private async keep(tokens: IdeasoftTokens, previous: string): Promise<string> {
    accessTokens.set(this.tokenKey, { token: tokens.accessToken, expiresAt: Date.now() + tokens.expiresIn * 1000 - TOKEN_MARGIN_MS });
    if (tokens.refreshToken && tokens.refreshToken !== previous) {
      rememberRenewal(this.renewalKey(previous), tokens.refreshToken);
      this.refreshToken = tokens.refreshToken;
      try {
        await this.saveSecrets({ refreshToken: tokens.refreshToken });
      } catch {
        // This process keeps working with the new token (renewedTokens); the next renewal saves again.
      }
    }
    return tokens.accessToken;
  }

  /** Gets a new access token with the refresh token (and saves the refresh token IdeaSoft renews). */
  renew(): Promise<string> {
    const running = renewals.get(this.tokenKey);
    if (running) return running;
    const promise = (async () => {
      const previous = this.newest(this.refreshToken);
      const tokens = await ideasoftTokenRequest(
        this.settings.host,
        { grant_type: "refresh_token", client_id: this.settings.clientId, client_secret: this.settings.clientSecret, refresh_token: previous },
        this.fetcher,
      );
      return this.keep(tokens, previous);
    })().finally(() => renewals.delete(this.tokenKey));
    renewals.set(this.tokenKey, promise);
    return promise;
  }

  /** Swaps the value of the refresh token field as an authorization code (while connecting). */
  async exchangeCode(): Promise<string> {
    const code = this.settings.refreshToken;
    const tokens = await exchangeIdeasoftCode(this.settings.host, this.settings.clientId, this.settings.clientSecret, code, this.fetcher);
    if (!tokens.refreshToken) throw new ConnectorError("IdeaSoft sent no refresh token.");
    return this.keep(tokens, code);
  }

  private async accessToken(): Promise<string> {
    const saved = accessTokens.get(this.tokenKey);
    if (saved && saved.expiresAt > Date.now()) return saved.token;
    return this.renew();
  }

  /** Calls the Admin API; renews the access token once when IdeaSoft refuses it. */
  async request<T>(method: string, path: string, options: { query?: Record<string, string | number | undefined>; body?: unknown } = {}): Promise<T> {
    const query = new URLSearchParams();
    for (const [name, value] of Object.entries(options.query ?? {})) if (value !== undefined && value !== "") query.set(name, String(value));
    const search = query.toString();
    const url = `https://${this.settings.host}/admin-api/${path}${search ? `?${search}` : ""}`;
    for (let attempt = 0; ; attempt++) {
      const token = attempt === 0 ? await this.accessToken() : await this.renew();
      let response: Response;
      try {
        response = await this.fetcher(url, {
          method,
          headers: {
            accept: "application/json",
            authorization: `Bearer ${token}`,
            ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
          },
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        throw new ConnectorError("IdeaSoft didn't answer.");
      }
      if (response.status === 401 && attempt === 0) {
        accessTokens.delete(this.tokenKey);
        continue;
      }
      if (!response.ok) throw new IdeasoftHttpError(`IdeaSoft answered HTTP ${response.status}.`, response.status);
      if (response.status === 204) return undefined as T;
      return (await response.json().catch(() => {
        throw new ConnectorError("IdeaSoft sent an answer we can't read.");
      })) as T;
    }
  }

  get<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T> {
    return this.request<T>("GET", path, { query });
  }

  /** A list endpoint. Unverified: lists are bare JSON arrays [Community]; an object with `items`/`data` is accepted too. */
  async list<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T[]> {
    const body = await this.get<unknown>(path, query);
    if (Array.isArray(body)) return body as T[];
    const wrapped = body as { items?: unknown; data?: unknown } | null;
    if (Array.isArray(wrapped?.items)) return wrapped.items as T[];
    if (Array.isArray(wrapped?.data)) return wrapped.data as T[];
    return [];
  }
}

// IdeaSoft's resources (only the fields used; everything optional that the spec doesn't require)

interface IdeaCurrency {
  id?: number;
  abbr?: string;
  sellingPrice?: number | string;
  isPrimary?: number | boolean;
}

interface IdeaImage {
  id?: number;
  filename?: string;
  extension?: string;
  sortOrder?: number;
  thumbUrl?: string | null;
  originalUrl?: string | null;
  directoryName?: string;
  revision?: string | number;
}

export interface IdeaCategory {
  id: number;
  name: string;
  sortOrder?: number;
  status?: number | string;
  parent?: { id?: number } | null;
  imageUrl?: string | null;
}

interface IdeaOptionGroup {
  id?: number;
  title?: string;
  sortOrder?: number;
  options?: { id?: number; title?: string; sortOrder?: number }[];
}

export interface IdeaProduct {
  id: number;
  name: string;
  fullName?: string | null;
  slug?: string | null;
  sku?: string | null;
  status?: number | string;
  price1: number | string;
  currency?: IdeaCurrency | null;
  discount?: number | string | null;
  discountType?: number | string | null;
  taxIncluded?: number | string | boolean | null;
  tax?: number | string | null;
  stockAmount?: number | string | null;
  hasOption?: number | string | boolean | null;
  parent?: { id?: number; name?: string } | null;
  children?: IdeaProduct[] | null;
  optionGroups?: IdeaOptionGroup[] | null;
  categories?: IdeaCategory[] | null;
  images?: IdeaImage[] | null;
  detail?: { details?: string | null } | null;
  shortDetails?: string | null;
  canonicalUrl?: string | null;
}

export interface IdeaOrder {
  id: number;
  transactionId?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  currency?: string | null;
  generalAmount?: number | string | null;
  finalAmount?: number | string | null;
  customerPhone?: string | null;
  shippingAddress?: { mobilePhoneNumber?: string | null; phoneNumber?: string | null } | null;
  shippingMobilePhoneNumber?: string | null;
  member?: { id?: number; mobilePhoneNumber?: string | null; phoneNumber?: string | null } | null;
  createdAt?: string | null;
  orderItems?: { productName?: string; productQuantity?: number | string; product?: { id?: number } | null }[] | null;
}

// Prices

const num = (value: unknown): number => {
  const n = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  return Number.isFinite(n) ? n : 0;
};
const flag = (value: unknown): boolean => value === true || num(value) === 1;
const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * What a customer pays and the price before the discount, VAT included.
 * There is no ready-made discounted price: `discountType` 1 takes `discount`
 * percent off `price1`, 0 takes `discount` off as an amount; VAT (`tax`
 * percent) is added when `taxIncluded` is 0.
 */
export function ideasoftPrice(product: Pick<IdeaProduct, "price1" | "discount" | "discountType" | "taxIncluded" | "tax">): {
  amount: number;
  regular: number;
} {
  const base = num(product.price1);
  const discount = num(product.discount);
  let sale = base;
  if (discount > 0) {
    // Unverified: discountType 0 is an amount off ("5 TL" in the current spec); the old spec called it "the discounted price".
    sale = num(product.discountType) === 1 ? base * (1 - discount / 100) : base - discount;
  }
  sale = Math.max(0, Math.min(sale, base));
  // Unverified: taxIncluded may be missing; then the price is taken as including VAT.
  const vat = product.taxIncluded !== undefined && product.taxIncluded !== null && !flag(product.taxIncluded) ? 1 + num(product.tax) / 100 : 1;
  return { amount: round2(sale * vat), regular: round2(base * vat) };
}

/** The ISO code of an IdeaSoft currency ("TL" is TRY). */
export function currencyCode(abbr: string | null | undefined): string {
  const code = (abbr ?? "").trim().toUpperCase();
  if (code === "" || code === "TL" || code === "YTL" || code === "₺") return "TRY";
  return /^[A-Z]{3}$/.test(code) ? code : "TRY";
}

/** As IdeaSoft stores show prices: "1.234,50 TL". */
export function formatIdeasoftMoney(amount: number, currency: string): string {
  const [whole, fraction] = Math.abs(amount).toFixed(2).split(".");
  const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${amount < 0 ? "-" : ""}${grouped},${fraction} ${currency === "TRY" ? "TL" : currency}`;
}

// Orders

const ORDER_STATUSES: Record<string, { status: string; label: string }> = {
  deleted: { status: "cancelled", label: "Cancelled" },
  waiting_for_approval: { status: "on_hold", label: "Awaiting approval" },
  approved: { status: "processing", label: "Approved" },
  fulfilled: { status: "completed", label: "Shipped" },
  cancelled: { status: "cancelled", label: "Cancelled" },
  delivered: { status: "completed", label: "Delivered" },
  on_accumulation: { status: "processing", label: "Being supplied" },
  waiting_for_payment: { status: "pending", label: "Awaiting payment" },
  being_prepared: { status: "processing", label: "Being prepared" },
  refunded: { status: "refunded", label: "Refunded" },
  // The store names these itself; the names aren't in the API.
  personal_status_1: { status: "processing", label: "Processing" },
  personal_status_2: { status: "processing", label: "Processing" },
  personal_status_3: { status: "processing", label: "Processing" },
};

/** The contract's status and an English label for an IdeaSoft order. */
export function ideasoftOrderStatus(order: Pick<IdeaOrder, "status" | "paymentStatus">): { status: string; label: string } {
  if (order.paymentStatus === "failed" && (order.status === "waiting_for_payment" || !order.status)) {
    return { status: "failed", label: "Payment failed" };
  }
  return ORDER_STATUSES[order.status ?? ""] ?? { status: "processing", label: "Processing" };
}

/**
 * A phone number as comparable digits: "+90 532 123 45 67", "0532 123 45 67"
 * and "5321234567" all give "905321234567". IdeaSoft stores are Turkish, so
 * national numbers are read as Turkish ones.
 */
export function phoneDigits(value: string | null | undefined): string {
  let digits = (value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = `90${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith("5")) digits = `90${digits}`;
  return digits;
}

/** Ways a store may have typed the customer's number, to search orders by. */
function phoneSearches(e164: string): string[] {
  const digits = phoneDigits(e164);
  if (digits.startsWith("90") && digits.length === 12) {
    const national = digits.slice(2);
    // Unverified: how stores store the number; the filter may match exactly, so each common form is tried.
    return [`0${national}`, national, `+${digits}`];
  }
  return [`+${digits}`];
}

// Mapping

/** An absolute address for what IdeaSoft gives as a URL (some are protocol- or host-relative). */
function absoluteUrl(value: string | null | undefined, host: string): string | null {
  let url = (value ?? "").trim();
  if (!url) return null;
  if (url.startsWith("//")) url = `https:${url}`;
  else if (url.startsWith("/")) url = `https://${host}${url}`;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

function imageUrl(image: IdeaImage, host: string, thumb: boolean): string | null {
  const given = absoluteUrl(thumb ? (image.thumbUrl ?? image.originalUrl) : (image.originalUrl ?? image.thumbUrl), host);
  if (given) return given;
  // The spec's own rule for building it when no URL is given.
  if (!image.directoryName || !image.filename || !image.extension) return null;
  const revision = image.revision !== undefined ? `?revision=${encodeURIComponent(String(image.revision))}` : "";
  return `https://${host}/myassets/products/${encodeURIComponent(image.directoryName)}/${encodeURIComponent(image.filename)}.${image.extension.toLowerCase()}${revision}`;
}

const sortedImages = (product: IdeaProduct) => [...(product.images ?? [])].sort((a, b) => num(a.sortOrder) - num(b.sortOrder));
const inStock = (product: IdeaProduct) => num(product.stockAmount) > 0;
const isActive = (item: { status?: number | string }) => item.status === undefined || num(item.status) !== 0;
const maxQuantity = (product: IdeaProduct) => (inStock(product) ? Math.max(1, Math.floor(num(product.stockAmount))) : null);

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w]+/g, "_")
      .replace(/^_+|_+$/g, "") || "option"
  );
}

/** A variant's own name, without its parent's ("Rose - Red" gives "Red"). */
function variantLabel(parent: IdeaProduct, child: IdeaProduct, index: number): string {
  for (const name of [child.fullName, child.name]) {
    const text = (name ?? "").trim();
    if (text.startsWith(parent.name) && text.length > parent.name.length) {
      const rest = text.slice(parent.name.length).replace(/^[\s\-–/,:]+/, "").trim();
      if (rest) return rest;
    }
  }
  const own = child.name.trim();
  return own && own !== parent.name ? own : child.sku?.trim() || `Option ${index + 1}`;
}

/**
 * The options a variant stands for, by option group title. Unverified: a
 * child's `optionGroups` holds its chosen option first; when it has none, the
 * variant's own name is the one option ("Option").
 */
function variantChoices(parent: IdeaProduct, child: IdeaProduct, index: number): [string, string][] {
  const out: [string, string][] = [];
  for (const group of [...(child.optionGroups ?? [])].sort((a, b) => num(a.sortOrder) - num(b.sortOrder))) {
    const option = group.options?.[0]?.title?.trim();
    if (group.title?.trim() && option) out.push([group.title.trim(), option]);
  }
  return out.length > 0 ? out : [["Option", variantLabel(parent, child, index)]];
}

class Mapper {
  constructor(
    readonly host: string,
    readonly currency: string,
  ) {}

  money(amount: number, currency = this.currency): string {
    return formatIdeasoftMoney(amount, currency);
  }

  productCurrency(product: IdeaProduct): string {
    return product.currency?.abbr ? currencyCode(product.currency.abbr) : this.currency;
  }

  price(amount: number, regular: number, currency: string, max = amount) {
    const isRange = max !== amount;
    const onSale = regular > amount;
    return {
      amount: amount.toFixed(2),
      regular_amount: onSale ? regular.toFixed(2) : null,
      regular_formatted: onSale && !isRange ? this.money(regular, currency) : null,
      currency,
      formatted: isRange ? `${this.money(amount, currency)} – ${this.money(max, currency)}` : this.money(amount, currency),
      on_sale: onSale,
      range: isRange,
    };
  }

  productPrice(product: IdeaProduct) {
    const { amount, regular } = ideasoftPrice(product);
    return this.price(amount, regular, this.productCurrency(product));
  }

  static isVariable(product: IdeaProduct): boolean {
    return flag(product.hasOption) || (product.children?.length ?? 0) > 0;
  }

  summary(product: IdeaProduct) {
    const image = sortedImages(product)[0];
    // Unverified: a parent's stockAmount covers its variants.
    const available = isActive(product) && inStock(product);
    return {
      id: product.id,
      name: product.name,
      type: Mapper.isVariable(product) ? "variable" : "simple",
      image_url: image ? imageUrl(image, this.host, true) : null,
      price: this.productPrice(product),
      rating: null,
      rating_count: 0,
      stock_status: available ? "in_stock" : "out_of_stock",
      purchasable: available,
      // IdeaSoft has no digital products flag; its stores sell goods that ship.
      digital: false,
    };
  }

  category(category: IdeaCategory) {
    return {
      id: category.id,
      name: category.name,
      // IdeaSoft's categories carry no product count.
      count: 0,
      parent_id: category.parent?.id ? category.parent.id : null,
      image_url: absoluteUrl(category.imageUrl, this.host),
    };
  }

  permalink(product: IdeaProduct): string {
    const canonical = absoluteUrl(product.canonicalUrl, this.host);
    if (canonical) return canonical;
    // Unverified: current themes use /urun/<slug>; confirm on the store.
    return product.slug ? `https://${this.host}/urun/${encodeURIComponent(product.slug)}` : `https://${this.host}/`;
  }

  detail(product: IdeaProduct, children: IdeaProduct[], related: IdeaProduct[]) {
    const variable = Mapper.isVariable(product) && children.length > 0;
    const activeChildren = children.filter(isActive);
    const images = sortedImages(product)
      .map((i) => imageUrl(i, this.host, false))
      .filter((url): url is string => url !== null)
      .map((url) => ({ url, alt: product.name }));
    let price = this.productPrice(product);
    let available = isActive(product) && inStock(product);
    const attributes: { slug: string; name: string; variation: boolean; options: { value: string; label: string }[] }[] = [];
    const variations: Record<string, unknown>[] = [];
    if (variable) {
      const groups = new Map<string, Set<string>>();
      activeChildren.forEach((child, index) => {
        const choices = variantChoices(product, child, index);
        for (const [group, option] of choices) {
          if (!groups.has(group)) groups.set(group, new Set());
          groups.get(group)!.add(option);
        }
        const childPrice = ideasoftPrice(child);
        const childAvailable = inStock(child);
        variations.push({
          id: child.id,
          attributes: Object.fromEntries(choices.map(([group, option]) => [slugify(group), option])),
          price: this.price(childPrice.amount, childPrice.regular, this.productCurrency(child)),
          image_url: sortedImages(child)[0] ? imageUrl(sortedImages(child)[0]!, this.host, false) : null,
          stock_status: childAvailable ? "in_stock" : "out_of_stock",
          max_quantity: maxQuantity(child),
          purchasable: childAvailable,
        });
      });
      for (const [group, options] of groups) {
        attributes.push({ slug: slugify(group), name: group, variation: true, options: [...options].map((o) => ({ value: o, label: o })) });
      }
      const prices = activeChildren.map((c) => ({ ...ideasoftPrice(c), currency: this.productCurrency(c) }));
      if (prices.length > 0) {
        const min = prices.reduce((a, b) => (b.amount < a.amount ? b : a));
        const max = Math.max(...prices.map((p) => p.amount));
        price = this.price(min.amount, min.regular, min.currency, max);
      }
      available = isActive(product) && activeChildren.some(inStock);
    }
    return {
      ...this.summary(product),
      type: variable ? "variable" : "simple",
      price,
      stock_status: available ? "in_stock" : "out_of_stock",
      purchasable: available,
      description_html: product.detail?.details ?? "",
      short_description_html: product.shortDetails?.trim() ? product.shortDetails : null,
      images,
      sku: product.sku?.trim() ? product.sku : null,
      max_quantity: variable ? null : maxQuantity(product),
      attributes,
      variations,
      categories: (product.categories ?? []).filter((c) => c?.id && c.name).map((c) => this.category(c)),
      related: related.filter((r) => r.id !== product.id && !r.parent?.id).slice(0, 8).map((r) => this.summary(r)),
      external_url: null,
      permalink: this.permalink(product),
    };
  }
}

// Requests

type OrderBy = "newest" | "popular" | "rating" | "price_asc" | "price_desc" | "title";
const ORDERS: OrderBy[] = ["newest", "popular", "rating", "price_asc", "price_desc", "title"];

/** IdeaSoft's `sort` for the app's order. It has no sales or rating order: those show the newest. */
function sortFor(orderby: OrderBy): string {
  switch (orderby) {
    case "price_asc":
      return "price1";
    case "price_desc":
      return "-price1";
    case "title":
      return "name";
    default:
      return "-id";
  }
}

const cache = new Map<string, { at: number; value: unknown }>();
const quickCarts = new Map<string, { id: number | null; url: string; at: number }>();

export class IdeasoftConnector implements PlatformConnector {
  private readonly client: IdeasoftClient;
  private readonly cacheKey: string;

  constructor(
    private readonly settings: IdeasoftSettings,
    deps: Pick<PlatformDeps, "appId" | "fetcher" | "saveSecrets">,
  ) {
    this.client = new IdeasoftClient(settings, deps.fetcher, deps.saveSecrets, deps.appId);
    this.cacheKey = `${deps.appId}|${settings.host}`;
  }

  private async cached<T>(name: string, ms: number, load: () => Promise<T>): Promise<T> {
    const key = `${this.cacheKey}:${name}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ms) return hit.value as T;
    const value = await load();
    cache.set(key, { at: Date.now(), value });
    return value;
  }

  /**
   * Checks the keys by renewing the access token (or, when the field holds a
   * fresh authorization code, by swapping it) and reading one product.
   * IdeaSoft's API doesn't give the store's name, so its address stands in.
   */
  async check(): Promise<string> {
    try {
      await this.client.renew();
    } catch (e) {
      if (!(e instanceof IdeasoftHttpError) || (e.status !== 400 && e.status !== 401)) throw e;
      await this.client.exchangeCode();
    }
    await this.client.list("products", { limit: 1 });
    return this.settings.host;
  }

  private currencies(): Promise<IdeaCurrency[]> {
    return this.cached("currencies", CACHE_MS, async () => {
      try {
        return await this.client.list<IdeaCurrency>("currencies", { limit: PAGE_LIMIT });
      } catch (e) {
        // Without currency_read the store's currency is taken as TRY.
        if (e instanceof IdeasoftHttpError && e.status === 403) return [];
        throw e;
      }
    });
  }

  private async mapper(): Promise<Mapper> {
    const primary = (await this.currencies()).find((c) => flag(c.isPrimary));
    return new Mapper(this.settings.host, currencyCode(primary?.abbr));
  }

  async config() {
    const map = await this.mapper();
    return {
      store: {
        currency: map.currency,
        // Unverified: guest checkout is a store setting the API doesn't show; the store's checkout asks when it needs an account.
        guest_checkout: true,
        checkout_opens_in: "in_app",
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
          return { status: 200, body: { items: (await this.categories()).map((c) => this.mapCategory(c)) } };
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

  // Catalog

  private mapCategory(category: IdeaCategory) {
    return new Mapper(this.settings.host, "TRY").category(category);
  }

  /** Active categories in the store's order. */
  private categories(): Promise<IdeaCategory[]> {
    return this.cached("categories", CACHE_MS, async () => {
      const all: IdeaCategory[] = [];
      for (let page = 1; page <= 20; page++) {
        const chunk = await this.client.list<IdeaCategory>("categories", { page, limit: PAGE_LIMIT });
        all.push(...chunk);
        if (chunk.length < PAGE_LIMIT) break;
      }
      return all
        .filter((c) => c?.id && c.name && isActive(c))
        .sort((a, b) => num(a.sortOrder) - num(b.sortOrder) || a.name.localeCompare(b.name, "tr"));
    });
  }

  /** The category and every category under it. */
  private async withSubcategories(id: number): Promise<number[]> {
    const all = await this.categories();
    const ids = [id];
    for (let i = 0; i < ids.length && ids.length < 100; i++) {
      for (const c of all) if (c.parent?.id === ids[i] && !ids.includes(c.id)) ids.push(c.id);
    }
    return ids;
  }

  /** One page of top-level products (variants are products too, with a parent). */
  private async productPage(options: { search: string; category: number | null; orderby: OrderBy; page: number; perPage: number }) {
    const query: Record<string, string | number | undefined> = {
      page: options.page,
      limit: options.perPage,
      sort: sortFor(options.orderby),
      status: 1,
      s: options.search || undefined,
    };
    if (options.category !== null) {
      const ids = await this.withSubcategories(options.category);
      if (ids.length > 1) query.categoryIds = ids.join(",");
      else query.category = options.category;
    }
    const key = `products:${new URLSearchParams(query as Record<string, string>)}`;
    const raw = await this.cached(key, LIST_CACHE_MS, () => this.client.list<IdeaProduct>("products", query));
    // Unverified: whether lists include variant products; any with a parent are left out.
    return { items: raw.filter((p) => p?.id && !p.parent?.id && isActive(p)), hasNext: raw.length >= options.perPage };
  }

  /** The newest 100 products: the API can't filter by discount, so sales are found among these. */
  private async newest(): Promise<IdeaProduct[]> {
    return (await this.productPage({ search: "", category: null, orderby: "newest", page: 1, perPage: PAGE_LIMIT })).items;
  }

  private static onSale(products: IdeaProduct[]): IdeaProduct[] {
    return products.filter((p) => {
      const price = ideasoftPrice(p);
      return price.regular > price.amount;
    });
  }

  private async byIds(ids: number[]): Promise<IdeaProduct[]> {
    if (ids.length === 0) return [];
    return this.client.list<IdeaProduct>("products", { ids: ids.join(","), limit: PAGE_LIMIT });
  }

  private async products(query: URLSearchParams): Promise<ConnectorResult> {
    const map = await this.mapper();
    const page = intParam(query, "page", 1, 10_000);
    const perPage = intParam(query, "per_page", 20, 50);
    const ids = (query.get("ids") ?? "")
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isSafeInteger(v) && v > 0)
      .slice(0, 50);
    if (ids.length > 0) {
      const found = new Map((await this.byIds(ids)).filter((p) => p?.id && isActive(p)).map((p) => [p.id, p]));
      const items = ids.filter((id) => found.has(id)).map((id) => map.summary(found.get(id)!));
      return { status: 200, body: { page: 1, per_page: items.length || perPage, total: items.length, total_pages: 1, items } };
    }
    const category = query.get("category") ? Number(query.get("category")) : null;
    if (category !== null && (!Number.isSafeInteger(category) || category < 1)) {
      return error(400, "invalid_request", "Unknown category.");
    }
    if (query.get("on_sale") === "true" || query.get("on_sale") === "1") {
      const sale = IdeasoftConnector.onSale(await this.newest()).filter((p) => category === null || (p.categories ?? []).some((c) => c.id === category));
      const start = (page - 1) * perPage;
      return {
        status: 200,
        body: {
          page,
          per_page: perPage,
          total: sale.length,
          total_pages: Math.max(1, Math.ceil(sale.length / perPage)),
          items: sale.slice(start, start + perPage).map((p) => map.summary(p)),
        },
      };
    }
    const orderParam = query.get("orderby") as OrderBy | null;
    // `featured` has no IdeaSoft counterpart the API exposes: it lists the store's products as they are.
    const result = await this.productPage({
      search: (query.get("search") ?? "").trim().slice(0, 100),
      category,
      orderby: orderParam && ORDERS.includes(orderParam) ? orderParam : "newest",
      page,
      perPage,
    });
    // Lists don't say how many there are: the totals say whether there's a next page.
    const seen = (page - 1) * perPage + result.items.length;
    return {
      status: 200,
      body: {
        page,
        per_page: perPage,
        total: seen + (result.hasNext ? 1 : 0),
        total_pages: result.hasNext ? page + 1 : page,
        items: result.items.map((p) => map.summary(p)),
      },
    };
  }

  private async home() {
    const map = await this.mapper();
    const [categories, newest] = await Promise.all([this.categories(), this.newest()]);
    const top = categories.filter((c) => !c.parent?.id).slice(0, 12);
    const products = (type: string, items: IdeaProduct[]) =>
      items.length > 0 ? [{ type, title: null, products: items.slice(0, 10).map((p) => map.summary(p)) }] : [];
    return [
      ...(top.length > 0 ? [{ type: "categories", title: null, categories: top.map((c) => map.category(c)) }] : []),
      ...products("sale_products", IdeasoftConnector.onSale(newest)),
      ...products("new_products", newest),
    ];
  }

  private async getProduct(id: number): Promise<IdeaProduct | null> {
    try {
      const product = await this.client.get<IdeaProduct | null>(`products/${id}`);
      return product?.id ? product : null;
    } catch (e) {
      if (e instanceof IdeasoftHttpError && e.status === 404) return null;
      throw e;
    }
  }

  /** A product's variants: embedded as `children`, or listed by `parent`. */
  private async children(product: IdeaProduct): Promise<IdeaProduct[]> {
    if (product.children?.length) return product.children;
    if (!flag(product.hasOption)) return [];
    return (await this.client.list<IdeaProduct>("products", { parent: product.id, limit: PAGE_LIMIT })).filter((c) => c?.id);
  }

  private async product(id: number): Promise<ConnectorResult> {
    const map = await this.mapper();
    const product = await this.getProduct(id);
    if (!product || !isActive(product) || product.parent?.id) return error(404, "not_found", "Product not found.");
    const children = await this.children(product);
    const firstCategory = product.categories?.find((c) => c?.id)?.id;
    let related: IdeaProduct[] = [];
    if (firstCategory) {
      try {
        related = (await this.productPage({ search: "", category: firstCategory, orderby: "newest", page: 1, perPage: 9 })).items;
      } catch (e) {
        if (!(e instanceof ConnectorError)) throw e;
      }
    }
    return { status: 200, body: map.detail(product, children, related) };
  }

  // Orders

  /** The orders shipped to (or placed by a member with) the customer's verified phone, newest first. */
  private async customerOrders(phone: string): Promise<IdeaOrder[]> {
    const target = phoneDigits(phone);
    const found = new Map<number, IdeaOrder>();
    const matches = (order: IdeaOrder) =>
      [order.shippingMobilePhoneNumber, order.shippingAddress?.mobilePhoneNumber, order.member?.mobilePhoneNumber, order.customerPhone].some(
        (p) => p && phoneDigits(p) === target,
      );
    const collect = async (query: Record<string, string | number>) => {
      for (let page = 1; page <= 3; page++) {
        const chunk = await this.client.list<IdeaOrder>("orders", { ...query, sort: "-id", page, limit: PAGE_LIMIT });
        for (const order of chunk) if (order?.id && matches(order)) found.set(order.id, order);
        if (chunk.length < PAGE_LIMIT) break;
      }
    };
    for (const search of phoneSearches(phone)) await collect({ shippingMobilePhoneNumber: search });
    // Orders shipped elsewhere by a member with this phone. Unverified: `s` on members finds phone numbers.
    try {
      const members = await this.client.list<{ id?: number; mobilePhoneNumber?: string | null; phoneNumber?: string | null }>("members", {
        s: phoneSearches(phone)[0],
        limit: 20,
      });
      for (const member of members.filter((m) => m?.id && phoneDigits(m.mobilePhoneNumber ?? m.phoneNumber) === target)) {
        const chunk = await this.client.list<IdeaOrder>("orders", { member: member.id!, sort: "-id", limit: PAGE_LIMIT });
        for (const order of chunk) if (order?.id) found.set(order.id, order);
      }
    } catch (e) {
      // Without member_read (or member search) the shipping phone alone finds the orders.
      if (!(e instanceof IdeasoftHttpError) || e.status >= 500) throw e;
    }
    return [...found.values()].sort((a, b) => b.id - a.id);
  }

  private async orderItems(order: IdeaOrder): Promise<NonNullable<IdeaOrder["orderItems"]>> {
    if (Array.isArray(order.orderItems)) return order.orderItems;
    // Unverified: whether order lists embed orderItems; when they don't, they're read per order.
    try {
      return await this.client.list<NonNullable<IdeaOrder["orderItems"]>[number]>("order_items", { order: order.id, limit: PAGE_LIMIT });
    } catch (e) {
      if (e instanceof IdeasoftHttpError) return [];
      throw e;
    }
  }

  private async orders(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return error(401, "invalid_token", "Your session has ended. Please sign in again.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const user = request.user;
    const all = await this.cached(`orders:${user.id}:${user.phone}`, LIST_CACHE_MS, () => this.customerOrders(user.phone));
    const slice = all.slice((page - 1) * perPage, page * perPage);
    const map = await this.mapper();
    const items = await Promise.all(
      slice.map(async (order) => {
        const { status, label } = ideasoftOrderStatus(order);
        const amount = order.finalAmount ?? order.generalAmount;
        // "2018-02-21T15:01:03+0300": the offset gets its colon for Date.
        const created = new Date((order.createdAt ?? "").replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
        return {
          id: order.id,
          number: order.transactionId?.trim() || String(order.id),
          status,
          status_label: label,
          total: map.money(num(amount), order.currency ? currencyCode(order.currency) : map.currency),
          created_at: (Number.isNaN(created.getTime()) ? request.now : created).toISOString(),
          items: (await this.orderItems(order)).map((line) => ({
            name: line.productName?.trim() || "Product",
            course_id: null,
            product_id: line.product?.id ? line.product.id : null,
            quantity: Math.max(1, Math.round(num(line.productQuantity))),
            image_url: null,
          })),
        };
      }),
    );
    return {
      status: 200,
      body: { page, per_page: perPage, total: all.length, total_pages: Math.max(1, Math.ceil(all.length / perPage)), items },
    };
  }

  // Cart and checkout

  private async priced(lines: CartLineInput[], map: Mapper) {
    const ids = [...new Set(lines.map((l) => l.variation_id ?? l.product_id))];
    const products = new Map((await this.byIds(ids)).filter((p) => p?.id).map((p) => [p.id, p]));
    const missing = ids.filter((id) => !products.has(id));
    // Unverified: whether `ids` lists return variant products; those missing are read one by one.
    for (const id of missing.slice(0, 20)) {
      const product = await this.getProduct(id);
      if (product) products.set(id, product);
    }
    const parents = new Map<number, IdeaProduct>();
    for (const line of lines) {
      if (line.variation_id !== null && !parents.has(line.product_id)) {
        const parent = products.get(line.product_id) ?? (await this.getProduct(line.product_id));
        if (parent) parents.set(line.product_id, parent);
      }
    }
    // The cart is in the store's currency; other currencies are converted with the store's rates.
    const rates = new Map((await this.currencies()).map((c) => [currencyCode(c.abbr), num(c.sellingPrice)]));
    const toStore = (amount: number, currency: string) => {
      if (currency === map.currency) return amount;
      const from = rates.get(currency);
      const to = rates.get(map.currency) || 1;
      // Unverified: sellingPrice is the rate against the primary currency.
      return from ? round2((amount * from) / to) : amount;
    };
    let subtotal = 0;
    let count = 0;
    const out = lines.map((line) => {
      const product = products.get(line.variation_id ?? line.product_id);
      const parent = line.variation_id !== null ? parents.get(line.product_id) : product;
      const belongs =
        product &&
        parent &&
        (line.variation_id === null ? !product.parent?.id : !product.parent?.id || product.parent.id === line.product_id);
      if (!product || !parent || !belongs || !isActive(product) || !isActive(parent)) {
        return {
          line: {
            product_id: line.product_id,
            variation_id: line.variation_id,
            quantity: line.quantity,
            name: "Unavailable product",
            image_url: null,
            unit_price: map.money(0),
            line_total: map.money(0),
            available: false,
            problem: "This product is no longer available.",
            max_quantity: null,
            digital: false,
          },
          product: null,
        };
      }
      const needsOption = line.variation_id === null && Mapper.isVariable(product);
      const max = maxQuantity(product);
      const quantity = max !== null ? Math.min(line.quantity, max) : line.quantity;
      const available = !needsOption && inStock(product);
      const unit = toStore(ideasoftPrice(product).amount, map.productCurrency(product));
      const total = round2(unit * quantity);
      if (available) {
        subtotal += total;
        count += quantity;
      }
      const name =
        line.variation_id !== null ? product.fullName?.trim() || `${parent.name} - ${variantLabel(parent, product, 0)}` : product.name;
      const image = sortedImages(product)[0] ?? sortedImages(parent)[0];
      return {
        line: {
          product_id: line.product_id,
          variation_id: line.variation_id,
          quantity,
          name,
          image_url: image ? imageUrl(image, this.settings.host, true) : null,
          unit_price: map.money(unit),
          line_total: map.money(total),
          available,
          problem: needsOption
            ? "Please choose an option."
            : !available
              ? "Out of stock."
              : quantity < line.quantity
                ? `Only ${quantity} left in stock.`
                : null,
          max_quantity: max,
          digital: false,
        },
        product,
      };
    });
    return {
      products: out.map((o) => o.product),
      cart: {
        lines: out.map((o) => o.line),
        item_count: count,
        subtotal: map.money(round2(subtotal)),
        subtotal_amount: round2(subtotal).toFixed(2),
        currency: map.currency,
      },
    };
  }

  private async quote(request: ConnectorRequest): Promise<ConnectorResult> {
    const lines = cartLines(request.body);
    if (!lines) return error(400, "invalid_request", "The cart is empty or invalid.");
    const map = await this.mapper();
    return { status: 200, body: (await this.priced(lines, map)).cart };
  }

  /**
   * A quick buy link ("Hızlı Satın Al"): opening it puts the lines in the
   * store's cart. Links are reused for the same lines for a day, then deleted.
   * Unverified: the shape of `products` (the spec leaves it free-form) and
   * whether `url` is the full storefront address; a product ID to quantity
   * map is tried first, then ID to { id, quantity }.
   */
  private async quickCart(lines: { id: number; quantity: number }[]): Promise<string | null> {
    const key = `${this.cacheKey}:${lines.map((l) => `${l.id}x${l.quantity}`).join(",")}`;
    const now = Date.now();
    for (const [k, saved] of quickCarts) {
      if (!k.startsWith(`${this.cacheKey}:`) || now - saved.at < QUICK_CART_MS) continue;
      quickCarts.delete(k);
      if (saved.id !== null) this.client.request("DELETE", `quick_carts/${saved.id}`).catch(() => undefined);
    }
    const reused = quickCarts.get(key);
    if (reused) return reused.url;
    const shapes = [
      Object.fromEntries(lines.map((l) => [String(l.id), l.quantity])),
      Object.fromEntries(lines.map((l) => [String(l.id), { id: l.id, quantity: l.quantity }])),
    ];
    for (const products of shapes) {
      try {
        const created = await this.client.request<{ id?: number; url?: string | null; shortUrl?: string | null } | null>("POST", "quick_carts", {
          body: { name: `App cart ${new Date(now).toISOString().slice(0, 16)}`, products },
        });
        const url = absoluteUrl(created?.url ?? created?.shortUrl, this.settings.host);
        if (!url) return null;
        quickCarts.set(key, { id: typeof created?.id === "number" ? created.id : null, url, at: now });
        return url;
      } catch (e) {
        if (e instanceof IdeasoftHttpError && (e.status === 400 || e.status === 422)) continue;
        if (e instanceof IdeasoftHttpError && e.status >= 400 && e.status < 500) return null;
        throw e;
      }
    }
    return null;
  }

  private async checkoutLink(request: ConnectorRequest): Promise<ConnectorResult> {
    const platform = request.query.get("platform");
    if (platform !== "android" && platform !== "ios") return error(400, "invalid_request", "Unknown platform.");
    const lines = cartLines(request.body);
    if (!lines) return error(400, "invalid_request", "The cart is empty or invalid.");
    const map = await this.mapper();
    const priced = await this.priced(lines, map);
    if (priced.cart.lines.some((l) => !l.available || l.problem)) {
      return error(409, "cart_changed", "Something in your cart changed. Please check it and try again.");
    }
    const expires = new Date(request.now.getTime() + CHECKOUT_LINK_MINUTES * 60_000).toISOString();
    const url = await this.quickCart(priced.cart.lines.map((l) => ({ id: l.variation_id ?? l.product_id, quantity: l.quantity })));
    if (url) return { status: 200, body: { url, expires_at: expires, open_in: "in_app" } };
    // Without a quick buy link, a single product is bought from its page on the store.
    if (lines.length === 1) {
      const product = priced.products[0];
      const parent = lines[0]!.variation_id !== null && product?.parent?.id ? await this.getProduct(product.parent.id) : product;
      if (parent) return { status: 200, body: { url: map.permalink(parent), expires_at: expires, open_in: "in_app" } };
    }
    return error(
      409,
      "checkout_unavailable",
      "This shop can't take a cart with several products from the app yet. Please buy one product at a time, or order on the shop's website.",
    );
  }
}

/** Clears the catalog, token and quick cart caches (tests). */
export function clearIdeasoftCache(): void {
  cache.clear();
  accessTokens.clear();
  renewedTokens.clear();
  renewals.clear();
  quickCarts.clear();
}

const HINT_API_CLIENT =
  "In your IdeaSoft panel, open Entegrasyonlar > API and add an API client (only the main admin account can). " +
  `Enter any name, set the Redirect URI to ${IDEASOFT_REDIRECT_URI}, and give it read access to products, categories, ` +
  "currencies, orders and members, and write access to quick buy links (Hızlı Satın Al).";

export const IDEASOFT_PLATFORM: PlatformDefinition = {
  id: "ideasoft",
  name: "IdeaSoft",
  appType: "store",
  summary: "Products, prices, stock and orders from your IdeaSoft store; customers pay on your store's checkout.",
  fields: [
    {
      name: "host",
      label: "Store address",
      hint: "Your store's myideasoft.com address, shown at the top of your IdeaSoft panel.",
      secret: false,
      placeholder: "your-store.myideasoft.com",
    },
    { name: "clientId", label: "Client ID", hint: `${HINT_API_CLIENT} Then copy its Client ID here.`, secret: false },
    { name: "clientSecret", label: "Client Secret", hint: "Shown next to the Client ID of the API client you added.", secret: true },
    {
      name: "refreshToken",
      label: "Refresh token",
      hint:
        `Open ${IDEASOFT_REDIRECT_URI}, enter your store address, Client ID and Client Secret, and approve the access in IdeaSoft. ` +
        "Paste the refresh token that page shows. If it shows a short code instead, paste that and save within 30 seconds.",
      secret: true,
    },
  ],
  normalize(values) {
    const errors: Record<string, string> = {};
    const host = normalizeIdeasoftHost(values.host ?? "");
    if (!host) errors.host = "Enter your store's address, for example your-store.myideasoft.com.";
    const clientId = (values.clientId ?? "").trim();
    if (!/^[\w.\-~]{1,200}$/.test(clientId)) errors.clientId = "Copy the Client ID exactly as IdeaSoft shows it.";
    const clientSecret = (values.clientSecret ?? "").trim();
    if (!clientSecret || /\s/.test(clientSecret)) errors.clientSecret = "Copy the Client Secret exactly as IdeaSoft shows it.";
    const refreshToken = (values.refreshToken ?? "").trim();
    if (!refreshToken || /\s/.test(refreshToken)) errors.refreshToken = "Paste the refresh token exactly as our page shows it.";
    if (Object.keys(errors).length > 0) return { errors };
    return { values: { ...values, host: host!, clientId, clientSecret, refreshToken } };
  },
  create(values, deps) {
    return new IdeasoftConnector(
      { host: values.host ?? "", clientId: values.clientId ?? "", clientSecret: values.clientSecret ?? "", refreshToken: values.refreshToken ?? "" },
      deps,
    );
  },
};

registerPlatform(IDEASOFT_PLATFORM);
