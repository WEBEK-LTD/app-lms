import { createHash } from "node:crypto";
import { cartLines, error, intParam, normalizeHost, NumericIds, stableNumericId, type CartLineInput, withCheckoutTotals } from "./common";
import { registerPlatform, type PlatformConnector, type PlatformDefinition } from "./platforms";
import { ConnectorError, type ConnectorRequest, type ConnectorResult } from "./types";

/**
 * ikas for Store apps: catalog, cart pricing, checkout hand-off and order
 * history through the Admin GraphQL API (v1, the version ikas's own SDK
 * pins), with the keys of a private app the merchant creates (Apps > My Apps)
 * and the client_credentials grant. Access tokens live four hours; they're
 * kept in memory and fetched again shortly before they expire.
 *
 * ikas IDs are UUID strings while the app's IDs are integers: each ikas ID
 * becomes a stable positive 31-bit number (FNV-1a hash of the ID, see
 * `ikasNumericId`), and the numbers seen in listings are kept in memory to
 * find the ikas ID again. Two ikas IDs could in theory share a number; the
 * first one seen keeps it and the other is left out of the app.
 *
 * Reviews aren't available (`store.reviews` is false). The customer's orders
 * are those of the ikas customer with the phone number they signed in with.
 */

export const IKAS_API_URL = "https://api.myikas.com/api/v1/admin/graphql";
const PAGE_LIMIT = 200;
const CACHE_MS = 5 * 60_000;
/** Products scanned for category counts and to find an ID that isn't in memory yet. */
const INDEX_PAGES = 10;
/** Fetch a new token this long before the old one expires. */
const TOKEN_MARGIN_MS = 5 * 60_000;
const CHECKOUT_LINK_MINUTES = 30;
const IMAGE_CDN = "https://cdn.myikas.com/images";

type Fetch = typeof fetch;

export interface IkasSettings {
  /** The store name: "your-store" for your-store.myikas.com. */
  store: string;
  clientId: string;
  clientSecret: string;
  /** The storefront's host ("www.your-store.com"); empty for the one set in ikas. */
  storefront?: string | null;
}

// Values the client types

/** "your-store" from "your-store", "your-store.myikas.com" or "https://your-store.myikas.com/admin"; null otherwise. */
export function normalizeStoreName(value: string): string | null {
  let host = value.trim().toLowerCase();
  host = host.replace(/^https?:\/\//, "").split(/[/?#]/)[0] ?? "";
  host = host.replace(/\.myikas\.com$/, "");
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(host) ? host : null;
}

/** "www.your-store.com" from a storefront address; null when it isn't a host name. */
export const normalizeStorefront = normalizeHost;

// IDs

/** A stable positive 31-bit number for an ikas ID (common.ts, shared with Wix). */
export const ikasNumericId = stableNumericId;

interface StoreIds {
  products: NumericIds;
  variants: NumericIds;
  categories: NumericIds;
}

const idMaps = new Map<string, StoreIds>();

// The API

interface GraphQLError {
  message?: string;
  extensions?: { code?: string };
}

const tokens = new Map<string, { token: string; expiresAt: number }>();
const pendingTokens = new Map<string, Promise<string>>();

export class IkasClient {
  private readonly tokenKey: string;

  constructor(
    private readonly settings: IkasSettings,
    private readonly fetcher: Fetch = fetch,
  ) {
    // Tokens are kept per set of keys, so changed keys never use an old token.
    const secret = createHash("sha256").update(settings.clientSecret).digest("hex").slice(0, 16);
    this.tokenKey = `${settings.store}:${settings.clientId}:${secret}`;
  }

  private async requestToken(): Promise<string> {
    let response: Response;
    try {
      // Unverified: whether this grant also wants `redirect_uri` (ikas's SDK type lists it; the docs' example doesn't).
      response = await this.fetcher(`https://${this.settings.store}.myikas.com/api/admin/oauth/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: this.settings.clientId,
          client_secret: this.settings.clientSecret,
        }).toString(),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ConnectorError("ikas didn't answer.");
    }
    if (!response.ok) throw new ConnectorError(`ikas didn't accept the app's keys (HTTP ${response.status}).`);
    const body = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
    if (!body.access_token) throw new ConnectorError("ikas sent no access token.");
    const lifetime = (Number(body.expires_in) > 0 ? Number(body.expires_in) : 14_400) * 1000;
    tokens.set(this.tokenKey, { token: body.access_token, expiresAt: Date.now() + Math.max(lifetime - TOKEN_MARGIN_MS, lifetime / 2) });
    return body.access_token;
  }

  private async token(): Promise<string> {
    const saved = tokens.get(this.tokenKey);
    if (saved && saved.expiresAt > Date.now()) return saved.token;
    let pending = pendingTokens.get(this.tokenKey);
    if (!pending) {
      pending = this.requestToken().finally(() => pendingTokens.delete(this.tokenKey));
      pendingTokens.set(this.tokenKey, pending);
    }
    return pending;
  }

  async query<T>(query: string, variables: Record<string, unknown> = {}, retried = false): Promise<T> {
    const token = await this.token();
    let response: Response;
    try {
      response = await this.fetcher(IKAS_API_URL, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ConnectorError("ikas didn't answer.");
    }
    // A token ikas no longer accepts (revoked or expired early): fetch a new one, once.
    const unauthenticated = (errors?: GraphQLError[]) => errors?.some((e) => e.extensions?.code === "UNAUTHENTICATED") ?? false;
    if (response.status === 401 && !retried) {
      tokens.delete(this.tokenKey);
      return this.query<T>(query, variables, true);
    }
    // Unverified: ikas's rate limit (about 50 requests in 10 seconds) answers 429; the cache keeps requests low.
    if (!response.ok) throw new ConnectorError(`ikas answered HTTP ${response.status}.`);
    const body = (await response.json().catch(() => ({}))) as { data?: T; errors?: GraphQLError[] };
    if (unauthenticated(body.errors) && !retried) {
      tokens.delete(this.tokenKey);
      return this.query<T>(query, variables, true);
    }
    if (body.errors?.length || !body.data) throw new ConnectorError(body.errors?.[0]?.message ?? "ikas sent no data.");
    return body.data;
  }
}

// GraphQL (Admin API v1)

const VARIANT_FIELDS = `
  id sku isActive sellIfOutOfStock deleted
  variantValueIds { variantTypeId variantValueId }
  prices { sellPrice discountPrice currencyCode currencySymbol priceListId }
  images { imageId fileName isMain isVideo order }
  stocks { stockLocationId stockCount }`;

const PRODUCT_FIELDS = `
  id name type categoryIds deleted salesChannelIds hiddenSalesChannelIds maxQuantityPerCart
  metaData { slug }
  productVariantTypes { order variantTypeId variantValueIds }
  salesChannels { id status maxQuantityPerCart }
  variants { ${VARIANT_FIELDS} }`;

const PRODUCT_ARGS = `$pagination: PaginationInput, $search: String, $categoryIds: CategoryFilterInput,
  $salesChannelIds: SalesChannelFilterInput, $id: StringFilterInput, $sort: String`;
const PRODUCT_PARAMS = `pagination: $pagination, search: $search, categoryIds: $categoryIds,
  salesChannelIds: $salesChannelIds, id: $id, sort: $sort`;

export const IKAS_QUERIES = {
  merchant: `query getMerchant { getMerchant { id merchantName storeName } }`,
  merchantSettings: `query listMerchantSettings {
    listMerchantSettings {
      merchantName currencyCode currencySymbol
      currencyFormats { currencyCode decimalSeparator omitZeroDecimal symbol symbolPosition thousandSeparator }
    }
  }`,
  storefronts: `query listStorefront {
    listStorefront { id name salesChannelId domains { name isDefault } routings { domain path currencyCode priceListId } }
  }`,
  categories: `query listCategory { listCategory { id name parentId categoryPath imageId deleted } }`,
  variantTypes: `query listVariantType { listVariantType { id name values { id name } } }`,
  products: `query listProduct(${PRODUCT_ARGS}) {
    listProduct(${PRODUCT_PARAMS}) { hasNext page data { ${PRODUCT_FIELDS} } }
  }`,
  product: `query listProduct($id: StringFilterInput) {
    listProduct(id: $id) { data { ${PRODUCT_FIELDS} description shortDescription } }
  }`,
  productIndex: `query listProduct($pagination: PaginationInput, $salesChannelIds: SalesChannelFilterInput) {
    listProduct(pagination: $pagination, salesChannelIds: $salesChannelIds) { hasNext data { id categoryIds hiddenSalesChannelIds } }
  }`,
  customers: `query listCustomer($phone: StringFilterInput, $pagination: PaginationInput) {
    listCustomer(phone: $phone, pagination: $pagination) { data { id phone } }
  }`,
  orders: `query listOrder($customerId: StringFilterInput, $pagination: PaginationInput, $sort: String) {
    listOrder(customerId: $customerId, pagination: $pagination, sort: $sort) {
      hasNext
      data {
        id orderNumber status orderPaymentStatus orderPackageStatus orderedAt createdAt
        currencyCode currencySymbol totalFinalPrice
        orderLineItems { quantity variant { productId name mainImageId variantValues { variantTypeName variantValueName } } }
      }
    }
  }`,
  checkOrders: `query listOrder($pagination: PaginationInput) { listOrder(pagination: $pagination) { hasNext } }`,
  checkCustomers: `query listCustomer($pagination: PaginationInput) { listCustomer(pagination: $pagination) { hasNext } }`,
};

interface IkasPrice {
  sellPrice: number;
  discountPrice: number | null;
  currencyCode?: string | null;
  currencySymbol?: string | null;
  priceListId?: string | null;
}
interface IkasImage {
  imageId: string | null;
  fileName?: string | null;
  isMain?: boolean | null;
  isVideo?: boolean | null;
  order?: number | null;
}
export interface IkasVariant {
  id: string;
  sku: string | null;
  isActive: boolean | null;
  sellIfOutOfStock: boolean | null;
  deleted: boolean | null;
  variantValueIds: { variantTypeId: string; variantValueId: string }[] | null;
  prices: IkasPrice[] | null;
  images: IkasImage[] | null;
  stocks: { stockLocationId: string; stockCount: number }[] | null;
}
export interface IkasProduct {
  id: string;
  name: string;
  type: string | null;
  categoryIds: string[] | null;
  deleted: boolean | null;
  salesChannelIds: string[] | null;
  hiddenSalesChannelIds: string[] | null;
  maxQuantityPerCart: number | null;
  metaData: { slug: string | null } | null;
  productVariantTypes: { order: number | null; variantTypeId: string; variantValueIds: string[] | null }[] | null;
  salesChannels: { id: string; status: string | null; maxQuantityPerCart: number | null }[] | null;
  variants: IkasVariant[] | null;
  description?: string | null;
  shortDescription?: string | null;
}
interface IkasCategory {
  id: string;
  name: string;
  parentId: string | null;
  categoryPath: string[] | null;
  imageId: string | null;
  deleted: boolean | null;
}
interface IkasVariantType {
  id: string;
  name: string;
  values: { id: string; name: string }[] | null;
}
interface ProductPage {
  hasNext: boolean;
  data: IkasProduct[];
}
interface CurrencyFormat {
  currencyCode: string | null;
  decimalSeparator: string | null;
  omitZeroDecimal: boolean | null;
  symbol: string | null;
  symbolPosition: string | null;
  thousandSeparator: string | null;
}
export interface IkasOrder {
  id: string;
  orderNumber: string | number | null;
  status: string | null;
  orderPaymentStatus: string | null;
  orderPackageStatus: string | null;
  orderedAt: number | string | null;
  createdAt: number | string | null;
  currencyCode: string | null;
  currencySymbol: string | null;
  totalFinalPrice: number | null;
  orderLineItems:
    | {
        quantity: number;
        variant: {
          productId: string | null;
          name: string | null;
          mainImageId: string | null;
          variantValues: { variantTypeName: string | null; variantValueName: string | null }[] | null;
        } | null;
      }[]
    | null;
}

/** What the connector keeps about the store. */
interface Shop {
  name: string;
  /** The merchant ID in image addresses. */
  merchantId: string | null;
  currency: string;
  symbol: string | null;
  formats: CurrencyFormat[];
  /** The storefront's host. */
  host: string;
  salesChannelId: string | null;
  priceListId: string | null;
}

// Money

const group = (value: number, digits: number, thousands: string, decimal: string) => {
  const [whole, fraction] = Math.abs(value).toFixed(digits).split(".");
  const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
  return `${value < 0 ? "-" : ""}${fraction ? `${grouped}${decimal}${fraction}` : grouped}`;
};

/** Formats an amount like the store does (its currency format in ikas), or in English when it has none. */
export function formatIkasMoney(amount: number, currency: string, format: CurrencyFormat | null = null, symbol: string | null = null): string {
  if (format) {
    const digits = format.omitZeroDecimal && Number.isInteger(amount) ? 0 : 2;
    const number = group(amount, digits, format.thousandSeparator ?? ".", format.decimalSeparator ?? ",");
    const sign = format.symbol || symbol || currency;
    // Unverified: the values of `symbolPosition`; anything that reads as "after" puts the symbol last.
    return /right|after|end|suffix/i.test(format.symbolPosition ?? "") ? `${number} ${sign}` : `${sign}${number}`;
  }
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
  } catch {
    return `${group(amount, 2, ",", ".")} ${symbol || currency}`;
  }
}

// Mapping

/** The image's address on ikas's CDN. */
export function ikasImageUrl(merchantId: string | null, imageId: string, size = 1080): string | null {
  // Unverified: the CDN base and that getMerchant's `id` is the merchant ID in image addresses (from ikas's storefront code).
  if (imageId.includes("/")) return `${IMAGE_CDN}/${imageId}/image_${size}.webp`;
  return merchantId ? `${IMAGE_CDN}/${merchantId}/${imageId}/image_${size}.webp` : null;
}

function slugify(name: string): string {
  return (
    name
      .toLocaleLowerCase("tr-TR")
      .normalize("NFKD")
      .replace(/[^\w]+/g, "_")
      .replace(/^_+|_+$/g, "") || "option"
  );
}

type StockStatus = "in_stock" | "out_of_stock" | "on_backorder";

interface Price {
  amount: number;
  /** The price before the sale, when there's one. */
  regular: number | null;
  currency: string | null;
}

/** The order's status in the contract's words, and an English label. */
export function ikasOrderStatus(order: Pick<IkasOrder, "status" | "orderPaymentStatus" | "orderPackageStatus">): { status: string; label: string } {
  switch (order.status) {
    case "CANCELLED":
      return { status: "cancelled", label: "Cancelled" };
    case "REFUNDED":
      return { status: "refunded", label: "Refunded" };
    case "REFUND_REQUESTED":
      return { status: "on_hold", label: "Refund requested" };
  }
  if (order.orderPaymentStatus === "FAILED") return { status: "failed", label: "Payment failed" };
  if (order.orderPaymentStatus === "WAITING" || order.orderPaymentStatus === "PARTIALLY_PAID" || order.status === "WAITING_UPSELL_ACTION") {
    return { status: "pending", label: "Awaiting payment" };
  }
  switch (order.orderPackageStatus) {
    case "DELIVERED":
      return { status: "completed", label: "Delivered" };
    case "FULFILLED":
      return { status: "completed", label: "Shipped" };
    case "PARTIALLY_DELIVERED":
    case "PARTIALLY_FULFILLED":
      return { status: "processing", label: "Partly shipped" };
    case "READY_FOR_PICK_UP":
      return { status: "processing", label: "Ready for pick-up" };
    case "UNABLE_TO_DELIVER":
      return { status: "on_hold", label: "Couldn't be delivered" };
    case "CANCELLED":
      return { status: "cancelled", label: "Cancelled" };
    case "REFUNDED":
      return { status: "refunded", label: "Refunded" };
  }
  if (order.status === "PARTIALLY_REFUNDED") return { status: "processing", label: "Partly refunded" };
  if (order.status === "PARTIALLY_CANCELLED") return { status: "processing", label: "Partly cancelled" };
  return { status: "processing", label: "Processing" };
}

/** Timestamps arrive as milliseconds (or an ISO string); null when there's none. */
function isoDate(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  // Unverified: ikas's `Timestamp` scalar is epoch milliseconds.
  const date = typeof value === "number" || /^\d+$/.test(value) ? new Date(Number(value)) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Whether a stored phone number is the signed-in customer's (E.164) one. */
export function samePhone(stored: string | null, e164: string): boolean {
  if (!stored) return false;
  const user = e164.replace(/\D/g, "");
  const digits = stored.replace(/\D/g, "").replace(/^00/, "");
  if (digits === user) return true;
  if (stored.trim().startsWith("+")) return false;
  // A national number ("0532 123 45 67", "5321234567"): the E.164 number is a 1–3 digit country code and this.
  const national = digits.replace(/^0/, "");
  const code = user.length - national.length;
  return national.length >= 7 && code >= 1 && code <= 3 && user.endsWith(national);
}

/** The ways the number may be stored in ikas, for the phone filter. */
function phoneForms(e164: string): string[] {
  const forms = [e164, e164.replace(/^\+/, "")];
  // Unverified: ikas stores numbers in E.164 ("+905…"); Turkish numbers are also tried in their national forms.
  if (e164.startsWith("+90") && e164.length === 13) forms.push(`0${e164.slice(3)}`, e164.slice(3));
  return forms;
}

// Requests

type OrderBy = "newest" | "popular" | "rating" | "price_asc" | "price_desc" | "title";
const ORDERS: OrderBy[] = ["newest", "popular", "rating", "price_asc", "price_desc", "title"];

const cache = new Map<string, { at: number; value: unknown }>();

interface CategoryItem {
  id: number;
  name: string;
  count: number;
  parent_id: number | null;
  image_url: string | null;
}

export class IkasConnector implements PlatformConnector {
  private readonly client: IkasClient;
  private readonly cacheKey: string;
  private readonly ids: StoreIds;

  constructor(
    private readonly settings: IkasSettings,
    fetcher: Fetch = fetch,
  ) {
    this.client = new IkasClient(settings, fetcher);
    this.cacheKey = `${settings.store}:${settings.clientId}`;
    let ids = idMaps.get(settings.store);
    if (!ids) {
      ids = { products: new NumericIds("ikas"), variants: new NumericIds("ikas"), categories: new NumericIds("ikas") };
      idMaps.set(settings.store, ids);
    }
    this.ids = ids;
  }

  private async cached<T>(name: string, load: () => Promise<T>): Promise<T> {
    const key = `${this.cacheKey}:${name}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as T;
    const value = await load();
    cache.set(key, { at: Date.now(), value });
    return value;
  }

  /** Answers null instead of failing, for details the connector can do without. */
  private async optional<T>(load: () => Promise<T>): Promise<T | null> {
    try {
      return await load();
    } catch (e) {
      if (e instanceof ConnectorError) return null;
      throw e;
    }
  }

  private async shop(): Promise<Shop> {
    const shop = await this.storeDetails();
    return this.settings.storefront ? { ...shop, host: this.settings.storefront } : shop;
  }

  /** The store's details from ikas; the host is the storefront's main domain. */
  private storeDetails(): Promise<Shop> {
    return this.cached("shop", async () => {
      const [merchant, settings, storefronts] = await Promise.all([
        this.client.query<{ getMerchant: { id: string | null; merchantName: string | null; storeName: string | null } }>(IKAS_QUERIES.merchant),
        this.optional(() =>
          this.client.query<{
            listMerchantSettings:
              | { merchantName: string | null; currencyCode: string | null; currencySymbol: string | null; currencyFormats: CurrencyFormat[] | null }
              | { merchantName: string | null; currencyCode: string | null; currencySymbol: string | null; currencyFormats: CurrencyFormat[] | null }[]
              | null;
          }>(IKAS_QUERIES.merchantSettings),
        ),
        // Unverified: that a private app with the catalog permissions may read the storefronts.
        this.optional(() =>
          this.client.query<{
            listStorefront: {
              id: string;
              salesChannelId: string | null;
              domains: { name: string; isDefault: boolean | null }[] | null;
              routings: { domain: string | null; path: string | null; currencyCode: string | null; priceListId: string | null }[] | null;
            }[];
          }>(IKAS_QUERIES.storefronts),
        ),
      ]);
      const raw = settings?.listMerchantSettings;
      const merchantSettings = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null);
      const list = storefronts?.listStorefront ?? [];
      const storefront = list.find((s) => s.domains?.some((d) => d.isDefault)) ?? list[0] ?? null;
      const domain = storefront?.domains?.find((d) => d.isDefault) ?? storefront?.domains?.[0] ?? null;
      const routing = storefront?.routings?.find((r) => !r.path || r.path === "/") ?? storefront?.routings?.[0] ?? null;
      const host = (domain ? normalizeStorefront(domain.name) : null) || `${this.settings.store}.myikas.com`;
      return {
        name: merchant.getMerchant.merchantName || merchantSettings?.merchantName || merchant.getMerchant.storeName || this.settings.store,
        merchantId: merchant.getMerchant.id,
        currency: merchantSettings?.currencyCode || routing?.currencyCode || "TRY",
        symbol: merchantSettings?.currencySymbol ?? null,
        formats: merchantSettings?.currencyFormats ?? [],
        host,
        salesChannelId: storefront?.salesChannelId ?? null,
        priceListId: routing?.priceListId ?? null,
      };
    });
  }

  private money(shop: Shop, amount: number, currency: string | null = null): string {
    const code = currency || shop.currency;
    const format = shop.formats.find((f) => f.currencyCode === code) ?? null;
    return formatIkasMoney(amount, code, format, code === shop.currency ? shop.symbol : null);
  }

  /** Checks the keys and the permissions the connector needs; returns the store's name. */
  async check(): Promise<string> {
    const merchant = await this.client.query<{ getMerchant: { merchantName: string | null; storeName: string | null } }>(IKAS_QUERIES.merchant);
    const one = { pagination: { page: 1, limit: 1 } };
    await Promise.all([
      this.client.query(IKAS_QUERIES.productIndex, one),
      this.client.query(IKAS_QUERIES.checkOrders, one),
      this.client.query(IKAS_QUERIES.checkCustomers, one),
    ]);
    return merchant.getMerchant.merchantName || merchant.getMerchant.storeName || this.settings.store;
  }

  async config() {
    const shop = await this.shop();
    return {
      store: {
        currency: shop.currency,
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

  private channelFilter(shop: Shop) {
    return shop.salesChannelId ? { salesChannelIds: { eq: shop.salesChannelId } } : {};
  }

  /** Whether the storefront shows the product. */
  private visible(product: IkasProduct, shop: Shop): boolean {
    if (product.deleted) return false;
    if (shop.salesChannelId) {
      if (product.hiddenSalesChannelIds?.includes(shop.salesChannelId)) return false;
      const channel = product.salesChannels?.find((c) => c.id === shop.salesChannelId);
      // Unverified: the values of ProductSalesChannel.status; anything that reads as hidden or passive hides the product.
      if (channel?.status && /hidden|passive|inactive|draft/i.test(channel.status)) return false;
    }
    return this.variants(product).length > 0;
  }

  private variants(product: IkasProduct): IkasVariant[] {
    return (product.variants ?? []).filter((v) => !v.deleted && v.isActive !== false);
  }

  private price(variant: IkasVariant, shop: Shop): Price | null {
    const prices = variant.prices ?? [];
    const entry =
      (shop.priceListId ? prices.find((p) => p.priceListId === shop.priceListId) : undefined) ??
      prices.find((p) => !p.priceListId) ??
      prices[0];
    if (!entry || !Number.isFinite(Number(entry.sellPrice))) return null;
    const sell = Number(entry.sellPrice);
    const discount = entry.discountPrice === null || entry.discountPrice === undefined ? null : Number(entry.discountPrice);
    // As ikas does: the discount price applies when it's below the sell price.
    const sale = discount !== null && Number.isFinite(discount) && discount < sell;
    return { amount: sale ? discount : sell, regular: sale ? sell : null, currency: entry.currencyCode ?? null };
  }

  /** Units in stock over all stock locations; null when ikas sent none. */
  private stock(variant: IkasVariant): number | null {
    if (!variant.stocks) return null;
    return variant.stocks.reduce((sum, s) => sum + Math.max(0, Number(s.stockCount) || 0), 0);
  }

  private stockStatus(variant: IkasVariant): StockStatus {
    const stock = this.stock(variant);
    if (stock === null || stock > 0) return "in_stock";
    return variant.sellIfOutOfStock ? "on_backorder" : "out_of_stock";
  }

  private maxQuantity(variant: IkasVariant, product: IkasProduct, shop: Shop): number | null {
    const limits: number[] = [];
    const stock = this.stock(variant);
    if (!variant.sellIfOutOfStock && stock !== null && stock > 0) limits.push(stock);
    if (product.maxQuantityPerCart && product.maxQuantityPerCart > 0) limits.push(product.maxQuantityPerCart);
    const channel = product.salesChannels?.find((c) => c.id === shop.salesChannelId);
    if (channel?.maxQuantityPerCart && channel.maxQuantityPerCart > 0) limits.push(channel.maxQuantityPerCart);
    return limits.length > 0 ? Math.floor(Math.min(...limits)) : null;
  }

  private purchasable(variant: IkasVariant, shop: Shop): boolean {
    return this.price(variant, shop) !== null && this.stockStatus(variant) !== "out_of_stock";
  }

  private productPrice(prices: Price[], shop: Shop) {
    if (prices.length === 0) {
      return { amount: "0.00", regular_amount: null, regular_formatted: null, currency: shop.currency, formatted: this.money(shop, 0), on_sale: false, range: false };
    }
    const sorted = [...prices].sort((a, b) => a.amount - b.amount);
    const min = sorted[0]!;
    const max = sorted.at(-1)!;
    const range = max.amount !== min.amount;
    const onSale = min.regular !== null;
    return {
      amount: min.amount.toFixed(2),
      regular_amount: onSale ? min.regular!.toFixed(2) : null,
      regular_formatted: onSale && !range ? this.money(shop, min.regular!, min.currency) : null,
      currency: min.currency || shop.currency,
      formatted: range ? `${this.money(shop, min.amount, min.currency)} – ${this.money(shop, max.amount, max.currency)}` : this.money(shop, min.amount, min.currency),
      on_sale: onSale,
      range,
    };
  }

  private images(variant: IkasVariant): IkasImage[] {
    return (variant.images ?? [])
      .filter((i) => i.imageId && !i.isVideo)
      .sort((a, b) => Number(Boolean(b.isMain)) - Number(Boolean(a.isMain)) || (a.order ?? 0) - (b.order ?? 0));
  }

  private image(variants: IkasVariant[], shop: Shop, size: number): string | null {
    for (const variant of variants) {
      const first = this.images(variant)[0];
      if (first) return ikasImageUrl(shop.merchantId, first.imageId!, size);
    }
    return null;
  }

  /** Unverified: ikas's product type values; "DIGITAL" is taken as a digital product. */
  private digital(product: IkasProduct): boolean {
    return (product.type ?? "").toUpperCase() === "DIGITAL";
  }

  private summary(product: IkasProduct, shop: Shop) {
    const id = this.ids.products.add(product.id);
    if (id === null) return null;
    const variants = this.variants(product);
    const statuses = variants.map((v) => this.stockStatus(v));
    return {
      id,
      name: product.name,
      type: (product.productVariantTypes?.length ?? 0) > 0 ? "variable" : "simple",
      image_url: this.image(variants, shop, 540),
      price: this.productPrice(variants.map((v) => this.price(v, shop)).filter((p): p is Price => p !== null), shop),
      rating: null,
      rating_count: 0,
      stock_status: statuses.includes("in_stock") ? "in_stock" : statuses.includes("on_backorder") ? "on_backorder" : "out_of_stock",
      purchasable: variants.some((v) => this.purchasable(v, shop)),
      digital: this.digital(product),
    };
  }

  private summaries(products: IkasProduct[], shop: Shop) {
    return products
      .filter((p) => this.visible(p, shop))
      .map((p) => this.summary(p, shop))
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }

  private variantTypes(): Promise<Map<string, IkasVariantType>> {
    return this.cached("variantTypes", async () => {
      const data = await this.client.query<{ listVariantType: IkasVariantType[] }>(IKAS_QUERIES.variantTypes);
      return new Map(data.listVariantType.map((t) => [t.id, t]));
    });
  }

  private permalink(product: IkasProduct, shop: Shop): string {
    const slug = product.metaData?.slug ? encodeURIComponent(product.metaData.slug) : "";
    return `https://${shop.host}/${slug}`;
  }

  private async detail(product: IkasProduct, shop: Shop) {
    const summary = this.summary(product, shop)!;
    const types = await this.variantTypes();
    const variants = this.variants(product);
    const variable = summary.type === "variable";
    // Option slugs by variant type, unique within the product.
    const slugs = new Map<string, string>();
    const attributes = [...(product.productVariantTypes ?? [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((pvt) => {
        const type = types.get(pvt.variantTypeId);
        const name = type?.name ?? "Option";
        let slug = slugify(name);
        while ([...slugs.values()].includes(slug)) slug = `${slug}_`;
        slugs.set(pvt.variantTypeId, slug);
        const values = new Map((type?.values ?? []).map((v) => [v.id, v.name]));
        return {
          slug,
          name,
          variation: true,
          options: (pvt.variantValueIds ?? [])
            .map((id) => values.get(id))
            .filter((v): v is string => Boolean(v))
            .map((v) => ({ value: v, label: v })),
        };
      });
    const valueName = (typeId: string, valueId: string) => types.get(typeId)?.values?.find((v) => v.id === valueId)?.name ?? "";
    const single = variants.length === 1 ? variants[0]! : null;
    const seen = new Set<string>();
    const images = variants
      .flatMap((v) => this.images(v))
      .filter((i) => !seen.has(i.imageId!) && Boolean(seen.add(i.imageId!)))
      .map((i) => ikasImageUrl(shop.merchantId, i.imageId!))
      .filter((url): url is string => url !== null)
      .map((url) => ({ url, alt: product.name }));
    const categories = await this.categoryList();
    const categoryIds = new Set(product.categoryIds ?? []);
    const related = product.categoryIds?.[0]
      ? await this.listProducts({ search: "", categoryIds: [product.categoryIds[0]], orderby: "newest", page: 1, perPage: 9 })
      : { items: [] };
    return {
      ...summary,
      description_html: product.description ?? "",
      short_description_html: product.shortDescription || null,
      images,
      sku: single?.sku || null,
      max_quantity: single ? this.maxQuantity(single, product, shop) : null,
      attributes: variable ? attributes : [],
      variations: variable
        ? variants
            .map((v) => {
              const id = this.ids.variants.add(v.id);
              if (id === null) return null;
              const price = this.price(v, shop);
              const firstImage = this.images(v)[0];
              return {
                id,
                attributes: Object.fromEntries(
                  (v.variantValueIds ?? [])
                    .filter((value) => slugs.has(value.variantTypeId))
                    .map((value) => [slugs.get(value.variantTypeId)!, valueName(value.variantTypeId, value.variantValueId)]),
                ),
                price: this.productPrice(price ? [price] : [], shop),
                image_url: firstImage ? ikasImageUrl(shop.merchantId, firstImage.imageId!, 540) : null,
                stock_status: this.stockStatus(v),
                max_quantity: this.maxQuantity(v, product, shop),
                purchasable: this.purchasable(v, shop),
              };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null)
        : [],
      categories: categories
        .filter((c) => categoryIds.has(c.ikasId))
        .map((c) => ({ id: c.id, name: c.name, count: 0, parent_id: c.parent_id, image_url: c.image_url })),
      related: this.summaries(related.items.filter((p) => p.id !== product.id), shop).slice(0, 8),
      external_url: null,
      permalink: this.permalink(product, shop),
    };
  }

  // Categories

  /** Every category ikas has, with the app's IDs. */
  private categoryList(): Promise<(CategoryItem & { ikasId: string; path: string[] })[]> {
    return this.cached("categories", async () => {
      const shop = await this.shop();
      const data = await this.client.query<{ listCategory: IkasCategory[] }>(IKAS_QUERIES.categories);
      const live = data.listCategory.filter((c) => !c.deleted);
      const numbers = new Map<string, number>();
      for (const c of live) {
        const id = this.ids.categories.add(c.id);
        if (id !== null) numbers.set(c.id, id);
      }
      const byId = new Map(live.map((c) => [c.id, c]));
      const out: (CategoryItem & { ikasId: string; path: string[] })[] = [];
      for (const c of live) {
        const id = numbers.get(c.id);
        if (id === undefined) continue;
        // Ancestors, from categoryPath or else by walking the parents.
        const path = (c.categoryPath ?? []).filter((p) => p !== c.id);
        if (path.length === 0) {
          for (let parent = c.parentId, n = 0; parent && byId.has(parent) && n < 50; parent = byId.get(parent)!.parentId, n++) path.push(parent);
        }
        out.push({
          id,
          ikasId: c.id,
          path,
          name: c.name,
          count: 0,
          parent_id: c.parentId ? (numbers.get(c.parentId) ?? null) : null,
          image_url: c.imageId ? ikasImageUrl(shop.merchantId, c.imageId, 540) : null,
        });
      }
      return out;
    });
  }

  /** The category and its subcategories (ikas IDs). */
  private async subtree(ikasId: string): Promise<string[]> {
    const list = await this.categoryList();
    return list.filter((c) => c.ikasId === ikasId || c.path.includes(ikasId)).map((c) => c.ikasId);
  }

  /**
   * IDs and categories of the storefront's products (up to INDEX_PAGES pages),
   * for category counts; it also puts every product's number in memory.
   */
  private productIndex(): Promise<{ products: { id: string; categoryIds: string[] }[]; complete: boolean }> {
    return this.cached("index", async () => {
      const shop = await this.shop();
      const products: { id: string; categoryIds: string[] }[] = [];
      for (let page = 1; page <= INDEX_PAGES; page++) {
        const data = await this.client.query<{
          listProduct: { hasNext: boolean; data: { id: string; categoryIds: string[] | null; hiddenSalesChannelIds: string[] | null }[] };
        }>(IKAS_QUERIES.productIndex, { pagination: { page, limit: PAGE_LIMIT }, ...this.channelFilter(shop) });
        for (const p of data.listProduct.data) {
          this.ids.products.add(p.id);
          if (shop.salesChannelId && p.hiddenSalesChannelIds?.includes(shop.salesChannelId)) continue;
          products.push({ id: p.id, categoryIds: p.categoryIds ?? [] });
        }
        if (!data.listProduct.hasNext) return { products, complete: true };
      }
      return { products, complete: false };
    });
  }

  private async categories(): Promise<CategoryItem[]> {
    const [list, index] = await Promise.all([this.categoryList(), this.productIndex()]);
    const counted = list.map((c) => {
      const ids = new Set([c.ikasId, ...list.filter((x) => x.path.includes(c.ikasId)).map((x) => x.ikasId)]);
      const count = index.products.filter((p) => p.categoryIds.some((id) => ids.has(id))).length;
      return { id: c.id, name: c.name, count, parent_id: c.parent_id, image_url: c.image_url };
    });
    // Only categories with products, when every product was counted.
    return index.complete ? counted.filter((c) => c.count > 0) : counted;
  }

  // Listing

  /** The ikas ID of a product number: from memory, or else from the product index. */
  private async productId(n: number): Promise<string | null> {
    const known = this.ids.products.get(n);
    if (known) return known;
    await this.productIndex();
    return this.ids.products.get(n);
  }

  private async listProducts(options: {
    search: string;
    categoryIds: string[] | null;
    orderby: OrderBy;
    page: number;
    perPage: number;
  }): Promise<{ items: IkasProduct[]; hasNext: boolean }> {
    const shop = await this.shop();
    // ikas sorts by createdAt, updatedAt or name; there are no sales or rating figures, so "popular" and "rating" show the newest.
    const sort = options.orderby === "title" ? "name" : options.search && options.orderby === "newest" ? null : "-createdAt";
    const data = await this.client.query<{ listProduct: ProductPage }>(IKAS_QUERIES.products, {
      pagination: { page: options.page, limit: options.perPage },
      ...(options.search ? { search: options.search } : {}),
      ...(options.categoryIds ? { categoryIds: { in: options.categoryIds } } : {}),
      ...this.channelFilter(shop),
      ...(sort ? { sort } : {}),
    });
    const items = [...data.listProduct.data];
    // ikas can't sort by price: the page is sorted on its own.
    if (options.orderby === "price_asc" || options.orderby === "price_desc") {
      const min = (p: IkasProduct) => Math.min(...this.variants(p).map((v) => this.price(v, shop)?.amount ?? Infinity));
      items.sort((a, b) => (options.orderby === "price_asc" ? min(a) - min(b) : min(b) - min(a)));
    }
    return { items, hasNext: data.listProduct.hasNext };
  }

  /** On-sale products among the first PAGE_LIMIT matches (ikas can't filter by sale price). */
  private async saleProducts(search: string, categoryIds: string[] | null, orderby: OrderBy): Promise<IkasProduct[]> {
    const shop = await this.shop();
    const load = () => this.listProducts({ search, categoryIds, orderby, page: 1, perPage: PAGE_LIMIT });
    const all = search || categoryIds ? await load() : await this.cached(`sale:${orderby}`, load);
    return all.items.filter((p) => this.visible(p, shop) && this.summary(p, shop)?.price.on_sale);
  }

  private async products(query: URLSearchParams): Promise<ConnectorResult> {
    const shop = await this.shop();
    const page = intParam(query, "page", 1, 10_000);
    const perPage = intParam(query, "per_page", 20, 50);
    const ids = (query.get("ids") ?? "")
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isSafeInteger(v) && v > 0)
      .slice(0, 50);
    if (ids.length > 0) {
      const known = (await Promise.all(ids.map((id) => this.productId(id)))).filter((id): id is string => id !== null);
      const data = known.length
        ? await this.client.query<{ listProduct: ProductPage }>(IKAS_QUERIES.products, {
            id: { in: known },
            pagination: { page: 1, limit: known.length },
          })
        : { listProduct: { hasNext: false, data: [] } };
      const byId = new Map(data.listProduct.data.map((p) => [p.id, p]));
      const items = this.summaries(known.map((id) => byId.get(id)).filter((p): p is IkasProduct => Boolean(p)), shop);
      return { status: 200, body: { page: 1, per_page: items.length || perPage, total: items.length, total_pages: 1, items } };
    }
    const orderParam = query.get("orderby") as OrderBy | null;
    const orderby = orderParam && ORDERS.includes(orderParam) ? orderParam : "newest";
    const empty = { status: 200, body: { page, per_page: perPage, total: 0, total_pages: 1, items: [] } };
    let categoryIds: string[] | null = null;
    if (query.get("category")) {
      const category = Number(query.get("category"));
      if (!Number.isSafeInteger(category) || category < 1) return error(400, "invalid_request", "Unknown category.");
      await this.categoryList();
      const ikasId = this.ids.categories.get(category);
      if (!ikasId) return empty;
      categoryIds = await this.subtree(ikasId);
    }
    const search = (query.get("search") ?? "").trim().slice(0, 100);
    // ikas has no featured products: `featured` lists the shop's products as they are.
    if (query.get("on_sale") === "true" || query.get("on_sale") === "1") {
      const sale = this.summaries(await this.saleProducts(search, categoryIds, orderby), shop);
      const start = (page - 1) * perPage;
      return {
        status: 200,
        body: {
          page,
          per_page: perPage,
          total: sale.length,
          total_pages: Math.max(1, Math.ceil(sale.length / perPage)),
          items: sale.slice(start, start + perPage),
        },
      };
    }
    const result = await this.listProducts({ search, categoryIds, orderby, page, perPage });
    // ikas doesn't count all matches: the totals say whether there's a next page.
    const items = this.summaries(result.items, shop);
    const seen = (page - 1) * perPage + items.length;
    return {
      status: 200,
      body: {
        page,
        per_page: perPage,
        total: seen + (result.hasNext ? 1 : 0),
        total_pages: result.hasNext ? page + 1 : page,
        items,
      },
    };
  }

  private async home() {
    const shop = await this.shop();
    const [categories, newest, sale] = await Promise.all([
      this.categories(),
      this.cached("newest", () => this.listProducts({ search: "", categoryIds: null, orderby: "newest", page: 1, perPage: 10 })),
      this.saleProducts("", null, "newest"),
    ]);
    const products = (type: string, list: IkasProduct[]) => {
      const items = this.summaries(list, shop).slice(0, 10);
      return items.length > 0 ? [{ type, title: null, products: items }] : [];
    };
    return [
      ...(categories.length > 0 ? [{ type: "categories", title: null, categories: categories.slice(0, 12) }] : []),
      ...products("sale_products", sale),
      ...products("new_products", newest.items),
    ];
  }

  private async product(id: number): Promise<ConnectorResult> {
    const shop = await this.shop();
    const ikasId = await this.productId(id);
    if (!ikasId) return error(404, "not_found", "Product not found.");
    const data = await this.client.query<{ listProduct: { data: IkasProduct[] } }>(IKAS_QUERIES.product, { id: { eq: ikasId } });
    const product = data.listProduct.data.find((p) => p.id === ikasId);
    if (!product || !this.visible(product, shop)) return error(404, "not_found", "Product not found.");
    return { status: 200, body: await this.detail(product, shop) };
  }

  // Cart and checkout

  private async priced(lines: CartLineInput[]) {
    const shop = await this.shop();
    const productIds = [...new Set((await Promise.all(lines.map((l) => this.productId(l.product_id)))).filter((id): id is string => id !== null))];
    const [data, types] = await Promise.all([
      productIds.length
        ? this.client.query<{ listProduct: ProductPage }>(IKAS_QUERIES.products, {
            id: { in: productIds },
            pagination: { page: 1, limit: Math.min(productIds.length, PAGE_LIMIT) },
          })
        : Promise.resolve({ listProduct: { hasNext: false, data: [] as IkasProduct[] } }),
      this.variantTypes(),
    ]);
    const products = new Map(data.listProduct.data.map((p) => [p.id, p]));
    let currency = shop.currency;
    let subtotal = 0;
    let count = 0;
    const variantIds: (string | null)[] = [];
    const out = lines.map((line) => {
      const ikasId = this.ids.products.get(line.product_id);
      const product = ikasId ? products.get(ikasId) : undefined;
      const variants = product && this.visible(product, shop) ? this.variants(product) : [];
      for (const v of variants) this.ids.variants.add(v.id);
      // A line without a variation is a product with a single variant.
      const variant =
        line.variation_id === null
          ? variants.length === 1 && (product!.productVariantTypes?.length ?? 0) === 0
            ? variants[0]
            : undefined
          : variants.find((v) => this.ids.variants.get(line.variation_id!) === v.id);
      const price = variant ? this.price(variant, shop) : null;
      if (!product || !variant || !price) {
        variantIds.push(null);
        return {
          product_id: line.product_id,
          variation_id: line.variation_id,
          quantity: line.quantity,
          name: product?.name ?? "Unavailable product",
          image_url: null,
          unit_price: this.money(shop, 0),
          line_total: this.money(shop, 0),
          available: false,
          problem: "This product is no longer available.",
          max_quantity: null,
          digital: false,
        };
      }
      variantIds.push(variant.id);
      if (price.currency) currency = price.currency;
      const max = this.maxQuantity(variant, product, shop);
      const quantity = max !== null ? Math.min(line.quantity, max) : line.quantity;
      const available = this.stockStatus(variant) !== "out_of_stock";
      const total = price.amount * quantity;
      if (available) {
        subtotal += total;
        count += quantity;
      }
      const values = (variant.variantValueIds ?? [])
        .map((v) => types.get(v.variantTypeId)?.values?.find((x) => x.id === v.variantValueId)?.name)
        .filter((v): v is string => Boolean(v));
      return {
        product_id: line.product_id,
        variation_id: line.variation_id,
        quantity,
        name: values.length > 0 ? `${product.name} - ${values.join(" / ")}` : product.name,
        image_url: this.image([variant, ...this.variants(product)], shop, 540),
        unit_price: this.money(shop, price.amount, price.currency),
        line_total: this.money(shop, total, price.currency),
        available,
        problem: !available ? "Out of stock." : quantity < line.quantity ? `Only ${quantity} left in stock.` : null,
        max_quantity: max,
        digital: this.digital(product),
      };
    });
    return {
      variantIds,
      cart: {
        lines: out,
        item_count: count,
        subtotal: this.money(shop, subtotal, currency),
        subtotal_amount: subtotal.toFixed(2),
        currency,
      },
    };
  }

  private async quote(request: ConnectorRequest): Promise<ConnectorResult> {
    const lines = cartLines(request.body);
    if (!lines) return error(400, "invalid_request", "The cart is empty or invalid.");
    return { status: 200, body: withCheckoutTotals((await this.priced(lines)).cart, request.body) };
  }

  private async checkoutLink(request: ConnectorRequest): Promise<ConnectorResult> {
    const platform = request.query.get("platform");
    if (platform !== "android" && platform !== "ios") return error(400, "invalid_request", "Unknown platform.");
    const lines = cartLines(request.body);
    if (!lines) return error(400, "invalid_request", "The cart is empty or invalid.");
    const shop = await this.shop();
    const priced = await this.priced(lines);
    const pricedLines = priced.cart.lines;
    if (pricedLines.some((l) => !l.available || l.problem)) {
      return error(409, "cart_changed", "Something in your cart changed. Please check it and try again.");
    }
    if (platform === "ios" && pricedLines.some((l) => l.digital)) {
      return error(403, "purchase_not_allowed", "Digital products can't be bought in the iPhone app.");
    }
    // Unverified: ikas's checkout page reads `lines=<variant id>:<quantity>,…`, makes a new cart of them
    // and opens checkout (from ikas's storefront code; not documented). It replaces the browser's cart.
    const items = pricedLines.map((l, i) => `${encodeURIComponent(priced.variantIds[i]!)}:${l.quantity}`).join(",");
    return {
      status: 200,
      body: {
        url: `https://${shop.host}/checkout?lines=${items}`,
        expires_at: new Date(request.now.getTime() + CHECKOUT_LINK_MINUTES * 60_000).toISOString(),
        open_in: "in_app",
      },
    };
  }

  // Orders

  private async orders(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return error(401, "invalid_token", "Your session has ended. Please sign in again.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const empty = { status: 200, body: { page, per_page: perPage, total: 0, total_pages: 1, items: [] } };
    const phone = request.user.phone;
    // 18 An account without a phone (email sign-in) matches no customer.
    if (!phone) return empty;
    const found = await this.client.query<{ listCustomer: { data: { id: string; phone: string | null }[] } }>(IKAS_QUERIES.customers, {
      phone: { in: phoneForms(phone) },
      pagination: { page: 1, limit: 50 },
    });
    // Only customers whose number is exactly this one.
    const ids = found.listCustomer.data.filter((c) => samePhone(c.phone, phone)).map((c) => c.id);
    if (ids.length === 0) return empty;
    const load = (sort: string | null) =>
      this.client.query<{ listOrder: { hasNext: boolean; data: IkasOrder[] } }>(IKAS_QUERIES.orders, {
        customerId: { in: ids },
        pagination: { page, limit: perPage },
        ...(sort ? { sort } : {}),
      });
    // Unverified: the order sort key; without it, the page is sorted here.
    const data = (await this.optional(() => load("-orderedAt"))) ?? (await load(null));
    const shop = await this.shop();
    const items = data.listOrder.data
      .filter((order) => order.status !== "DRAFT")
      .map((order) => {
        const { status, label } = ikasOrderStatus(order);
        return {
          id: ikasNumericId(order.id),
          number: String(order.orderNumber ?? ikasNumericId(order.id)),
          status,
          status_label: label,
          total: this.money(shop, Number(order.totalFinalPrice ?? 0), order.currencyCode),
          created_at: isoDate(order.orderedAt) ?? isoDate(order.createdAt) ?? request.now.toISOString(),
          items: (order.orderLineItems ?? []).map((line) => {
            const values = (line.variant?.variantValues ?? []).map((v) => v.variantValueName).filter((v): v is string => Boolean(v));
            const name = line.variant?.name || "Product";
            return {
              name: values.length > 0 && !name.includes(values.join(" / ")) ? `${name} - ${values.join(" / ")}` : name,
              course_id: null,
              product_id: line.variant?.productId ? this.ids.products.add(line.variant.productId) : null,
              quantity: Math.max(1, Math.round(Number(line.quantity) || 1)),
              image_url: line.variant?.mainImageId ? ikasImageUrl(shop.merchantId, line.variant.mainImageId, 540) : null,
            };
          }),
        };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const seen = (page - 1) * perPage + items.length;
    const hasNext = data.listOrder.hasNext;
    return {
      status: 200,
      body: { page, per_page: perPage, total: seen + (hasNext ? 1 : 0), total_pages: hasNext ? page + 1 : page, items },
    };
  }
}

/** Clears the cached store data, tokens and ID numbers (tests). */
export function clearIkasCache(): void {
  cache.clear();
  tokens.clear();
  pendingTokens.clear();
  idMaps.clear();
}

export const IKAS_PLATFORM: PlatformDefinition = {
  id: "ikas",
  name: "ikas",
  appType: "store",
  summary: "Your ikas products, prices and stock, with checkout on your ikas store.",
  fields: [
    {
      name: "store",
      label: "Store name",
      hint: "The first part of your ikas address: for your-store.myikas.com, enter your-store.",
      secret: false,
      placeholder: "your-store",
    },
    {
      name: "clientId",
      label: "Client ID",
      hint:
        "In your ikas dashboard, open Apps > My Apps and create a private app with the read_products, read_orders, read_customers and read_inventories permissions. Its Client ID is shown after you save it.",
      secret: false,
    },
    {
      name: "clientSecret",
      label: "Client secret",
      hint: "Shown with the Client ID of the same private app (Apps > My Apps).",
      secret: true,
    },
    {
      name: "storefront",
      label: "Store address",
      hint: "Optional. The address your customers visit, such as www.your-store.com. Leave it empty to use the main address set in ikas.",
      secret: false,
      placeholder: "www.your-store.com",
      optional: true,
    },
  ],
  normalize(values) {
    const errors: Record<string, string> = {};
    const store = normalizeStoreName(values.store ?? "");
    if (!store) errors.store = "Enter your ikas store name, as in your-store.myikas.com.";
    const clientId = (values.clientId ?? "").trim();
    if (!clientId) errors.clientId = "Enter your client ID.";
    const clientSecret = (values.clientSecret ?? "").trim();
    if (!clientSecret) errors.clientSecret = "Enter your client secret.";
    const typed = (values.storefront ?? "").trim();
    const storefront = typed ? normalizeStorefront(typed) : "";
    if (storefront === null) errors.storefront = "Enter your store's address, as in www.your-store.com, or leave it empty.";
    if (Object.keys(errors).length > 0) return { errors };
    return { values: { ...values, store: store!, clientId, clientSecret, storefront: storefront! } };
  },
  create(values, deps) {
    return new IkasConnector(
      {
        store: values.store ?? "",
        clientId: values.clientId ?? "",
        clientSecret: values.clientSecret ?? "",
        storefront: values.storefront || null,
      },
      deps.fetcher,
    );
  },
};

registerPlatform(IKAS_PLATFORM);
