import type { HostedUser } from "../../data/types";
import { cartLines, e164Of, error, intParam, normalizeHost, NumericIds, stableNumericId, verifiedEmail, type CartLineInput, withCheckoutTotals } from "./common";
import { PlatformCheckError, registerPlatform, type PlatformConnector, type PlatformDefinition } from "./platforms";
import { ConnectorError, type ConnectorRequest, type ConnectorResult } from "./types";

/**
 * 22 Wix for Store apps: catalog, cart pricing and checkout through Wix's
 * Headless REST APIs, with the client ID of an OAuth app the merchant
 * creates (Headless Settings). The client ID gets anonymous visitor tokens
 * (four hours, kept in memory), which read the Stores catalog (Catalog V3:
 * products and categories), create an eCommerce checkout and a redirect
 * session to Wix's own hosted checkout, which the app opens.
 *
 * Wix IDs are GUIDs while the app's IDs are integers: each becomes a stable
 * positive 31-bit number (common.ts), and the numbers seen are kept in memory
 * to find the Wix ID again, as for ikas.
 *
 * Order history needs the optional API key and site ID (an account API key
 * with permission to read orders): the customer's orders are those placed
 * with exactly the email address an email account signed in with, and those
 * of the Wix contacts with exactly their verified phone number or placed or
 * delivered with it. An empty phone or email never matches anything.
 *
 * Details marked "Unverified" are from Wix's SDK typings and documentation,
 * not yet confirmed against a real Wix site.
 */

export const WIX_API_URL = "https://www.wixapis.com";
/** Wix Stores' app ID, in eCommerce catalog references. */
export const WIX_STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";
/** Wix's query and search endpoints answer at most 100 items per request. */
const PAGE_LIMIT = 100;
const CACHE_MS = 5 * 60_000;
/** Products scanned to find an ID that isn't in memory yet. */
const INDEX_PAGES = 10;
/** Category pages read (100 each). */
const CATEGORY_PAGES = 5;
/** Fetch a new token this long before the old one expires. */
const TOKEN_MARGIN_MS = 5 * 60_000;
/** Unverified: how long a redirect session's URL works; kept short. */
const CHECKOUT_LINK_MINUTES = 5;
/** The newest orders read per lookup (email, contacts, phone) for the order history. */
const ORDER_LOOKUP_LIMIT = 100;
const UNREACHABLE = "Wix didn't answer.";
const LIST_FIELDS = ["CURRENCY"];
const DETAIL_FIELDS = ["CURRENCY", "URL", "PLAIN_DESCRIPTION", "MEDIA_ITEMS_INFO", "DIRECT_CATEGORIES_INFO", "VARIANT_OPTION_CHOICE_NAMES"];

type Fetch = typeof fetch;

export interface WixSettings {
  /** The client ID of the site's Headless OAuth app. */
  clientId: string;
  /** Optional API key (Wix account API keys), with `siteId`, for order history. */
  apiKey?: string | null;
  siteId?: string | null;
  /** The store's host ("www.your-store.com"), where shoppers come back after checkout; empty for none. */
  storefront?: string | null;
}

// Values the client types

const GUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** The GUID in what a client pasted (an ID, or a dashboard address that has it); null when there's none. */
export function normalizeWixId(value: string): string | null {
  return GUID.exec(value.trim())?.[0]?.toLowerCase() ?? null;
}

// The API

/** Wix answered with an HTTP error. */
export class WixHttpError extends ConnectorError {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "WixHttpError";
  }
}

const tokens = new Map<string, { token: string; expiresAt: number }>();
const pendingTokens = new Map<string, Promise<string>>();

export class WixClient {
  constructor(
    private readonly settings: WixSettings,
    private readonly fetcher: Fetch = fetch,
  ) {}

  private async requestToken(): Promise<string> {
    let response: Response;
    try {
      response = await this.fetcher(`${WIX_API_URL}/oauth2/token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: this.settings.clientId, grantType: "anonymous" }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ConnectorError(UNREACHABLE);
    }
    if (response.status >= 400 && response.status < 500) {
      throw new PlatformCheckError(
        "Wix didn't accept this client ID. In your Wix dashboard, open Settings, then Headless Settings, copy the client ID of an OAuth app, and paste it again.",
      );
    }
    if (!response.ok) throw new WixHttpError(`Wix answered HTTP ${response.status}.`, response.status);
    const body = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
    if (!body.access_token) throw new ConnectorError("Wix sent no access token.");
    const lifetime = (Number(body.expires_in) > 0 ? Number(body.expires_in) : 14_400) * 1000;
    tokens.set(this.settings.clientId, { token: body.access_token, expiresAt: Date.now() + Math.max(lifetime - TOKEN_MARGIN_MS, lifetime / 2) });
    return body.access_token;
  }

  private async token(): Promise<string> {
    const key = this.settings.clientId;
    const saved = tokens.get(key);
    if (saved && saved.expiresAt > Date.now()) return saved.token;
    let pending = pendingTokens.get(key);
    if (!pending) {
      pending = this.requestToken().finally(() => pendingTokens.delete(key));
      pendingTokens.set(key, pending);
    }
    return pending;
  }

  private async send<T>(method: string, path: string, body: unknown, headers: Record<string, string>): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(`${WIX_API_URL}${path}`, {
        method,
        headers: { ...headers, ...(body === undefined ? {} : { "content-type": "application/json" }) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ConnectorError(UNREACHABLE);
    }
    if (!response.ok) {
      const detail = (await response.json().catch(() => ({}))) as { message?: string };
      throw new WixHttpError(`Wix answered HTTP ${response.status}${detail.message ? `: ${detail.message}` : "."}`, response.status);
    }
    return (await response.json().catch(() => ({}))) as T;
  }

  /** A request as a site visitor (the client ID's anonymous token; Wix takes it without "Bearer"). */
  async visitor<T>(method: string, path: string, body?: unknown, retried = false): Promise<T> {
    const token = await this.token();
    try {
      return await this.send<T>(method, path, body, { authorization: token });
    } catch (e) {
      // A token Wix no longer accepts: fetch a new one, once.
      if (e instanceof WixHttpError && e.status === 401 && !retried) {
        tokens.delete(this.settings.clientId);
        return this.visitor<T>(method, path, body, true);
      }
      throw e;
    }
  }

  /** A request with the site's API key (order history). */
  async admin<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.settings.apiKey || !this.settings.siteId) throw new ConnectorError("No Wix API key.");
    return this.send<T>(method, path, body, { authorization: this.settings.apiKey, "wix-site-id": this.settings.siteId });
  }
}

// Wix's objects (REST names: `id`, `createdDate`), the fields the connector reads

interface WixMoney {
  amount?: string | null;
}
interface WixPriceRange {
  minValue?: WixMoney | null;
  maxValue?: WixMoney | null;
}
interface WixMedia {
  url?: string | null;
  image?: string | null;
  altText?: string | null;
  mediaType?: string | null;
}
interface WixChoice {
  choiceId?: string | null;
  name?: string | null;
  visible?: boolean | null;
}
export interface WixOption {
  id?: string | null;
  name?: string | null;
  choicesSettings?: { choices?: WixChoice[] | null } | null;
}
export interface WixVariant {
  id?: string | null;
  visible?: boolean | null;
  sku?: string | null;
  choices?:
    | {
        optionChoiceIds?: { optionId?: string | null; choiceId?: string | null } | null;
        optionChoiceNames?: { optionName?: string | null; choiceName?: string | null } | null;
      }[]
    | null;
  price?: { actualPrice?: WixMoney | null; compareAtPrice?: WixMoney | null } | null;
  media?: WixMedia | null;
  inventoryStatus?: { inStock?: boolean | null; preorderEnabled?: boolean | null } | null;
}
export interface WixProduct {
  id: string;
  name?: string | null;
  slug?: string | null;
  url?: string | null;
  plainDescription?: string | null;
  visible?: boolean | null;
  productType?: string | null;
  currency?: string | null;
  media?: { main?: WixMedia | null; itemsInfo?: { items?: WixMedia[] | null } | null } | null;
  options?: WixOption[] | null;
  directCategoriesInfo?: { categories?: { id?: string | null }[] | null } | null;
  inventory?: { availabilityStatus?: string | null; preorderStatus?: string | null } | null;
  actualPriceRange?: WixPriceRange | null;
  compareAtPriceRange?: WixPriceRange | null;
  variantsInfo?: { variants?: WixVariant[] | null } | null;
}
interface WixCategory {
  id: string;
  name?: string | null;
  image?: string | null;
  itemCounter?: number | null;
  visible?: boolean | null;
  parentCategory?: { id?: string | null } | null;
}
interface WixContactDetails {
  phone?: string | null;
}
export interface WixOrder {
  id: string;
  number?: string | number | null;
  createdDate?: string | null;
  purchasedDate?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  fulfillmentStatus?: string | null;
  currency?: string | null;
  buyerInfo?: { contactId?: string | null; email?: string | null } | null;
  billingInfo?: { contactDetails?: WixContactDetails | null } | null;
  shippingInfo?: { logistics?: { shippingDestination?: { contactDetails?: WixContactDetails | null } | null } | null } | null;
  recipientInfo?: { contactDetails?: WixContactDetails | null } | null;
  priceSummary?: { total?: WixMoney | null } | null;
  lineItems?:
    | {
        productName?: { original?: string | null } | null;
        catalogReference?: { appId?: string | null; catalogItemId?: string | null } | null;
        quantity?: number | null;
        image?: string | null;
        descriptionLines?: { name?: { original?: string | null } | null; plainText?: { original?: string | null } | null }[] | null;
      }[]
    | null;
}
interface WixContact {
  id: string;
  primaryInfo?: { phone?: string | null } | null;
  info?: { phones?: { items?: { phone?: string | null; e164Phone?: string | null }[] | null } | null } | null;
}
interface Paged {
  pagingMetadata?: { hasNext?: boolean | null; cursors?: { next?: string | null } | null } | null;
}

// Money and media

/** Formats an amount in English with the currency's symbol ("₺1,234.50", "$12.00"). */
export function formatWixMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** An amount Wix sends as a decimal string; null when there's none. */
function amountOf(money: WixMoney | null | undefined): number | null {
  if (money?.amount === undefined || money.amount === null || money.amount === "") return null;
  const value = Number(money.amount);
  return Number.isFinite(value) ? value : null;
}

/**
 * An image's address: Wix sends full addresses on products, and `wix:image://v1/<id>/<name>`
 * URIs (or a bare media ID) on categories and order lines. Null when it isn't one.
 */
export function wixImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https:\/\//.test(value)) return value;
  const uri = /^wix:image:\/\/v1\/([^/#?]+)/.exec(value);
  // Unverified: that static.wixstatic.com/media/<id> serves every image ID Wix sends.
  if (uri) return `https://static.wixstatic.com/media/${uri[1]}`;
  if (/^[\w-]+~mv2\.\w+$/.test(value)) return `https://static.wixstatic.com/media/${value}`;
  return null;
}

function mediaUrl(media: WixMedia | null | undefined): string | null {
  if (!media) return null;
  if (media.mediaType && media.mediaType !== "IMAGE") return null;
  return wixImageUrl(media.url) ?? wixImageUrl(media.image);
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w]+/g, "_")
      .replace(/^_+|_+$/g, "") || "option"
  );
}

// Orders

/** The order's status in the contract's words, and an English label. */
export function wixOrderStatus(order: Pick<WixOrder, "status" | "paymentStatus" | "fulfillmentStatus">): { status: string; label: string } {
  if (order.status === "CANCELED" || order.paymentStatus === "CANCELED") return { status: "cancelled", label: "Cancelled" };
  if (order.status === "REJECTED" || order.paymentStatus === "DECLINED") return { status: "failed", label: "Payment failed" };
  if (order.paymentStatus === "FULLY_REFUNDED") return { status: "refunded", label: "Refunded" };
  if (order.paymentStatus === "PARTIALLY_REFUNDED") return { status: "processing", label: "Partly refunded" };
  if (order.fulfillmentStatus === "FULFILLED") return { status: "completed", label: "Completed" };
  if (order.fulfillmentStatus === "PARTIALLY_FULFILLED") return { status: "processing", label: "Partly shipped" };
  if (order.paymentStatus === "NOT_PAID" || order.paymentStatus === "PENDING" || order.paymentStatus === "PARTIALLY_PAID" || order.paymentStatus === "PENDING_MERCHANT" || order.status === "PENDING") {
    return { status: "pending", label: "Awaiting payment" };
  }
  return { status: "processing", label: "Processing" };
}

/** The phone numbers an order was placed or delivered with. */
function orderPhones(order: WixOrder): (string | null | undefined)[] {
  return [
    order.billingInfo?.contactDetails?.phone,
    order.shippingInfo?.logistics?.shippingDestination?.contactDetails?.phone,
    order.recipientInfo?.contactDetails?.phone,
  ];
}

/** The ways a number may be stored on a Wix contact, for the phone filter (each match is compared exactly afterwards). */
function phoneForms(e164: string): string[] {
  const forms = [e164, e164.replace(/^\+/, "")];
  if (e164.startsWith("+90") && e164.length === 13) forms.push(`0${e164.slice(3)}`, e164.slice(3));
  return forms;
}

// Requests

type OrderBy = "newest" | "popular" | "rating" | "price_asc" | "price_desc" | "title";
const ORDERS: OrderBy[] = ["newest", "popular", "rating", "price_asc", "price_desc", "title"];

/** Search Products' sort; Wix has no sales or rating figures, so "popular" and "rating" show the newest. */
function sortFor(orderby: OrderBy, search: boolean): { fieldName: string; order: "ASC" | "DESC" }[] {
  switch (orderby) {
    case "price_asc":
      return [{ fieldName: "actualPriceRange.minValue.amount", order: "ASC" }];
    case "price_desc":
      return [{ fieldName: "actualPriceRange.minValue.amount", order: "DESC" }];
    case "title":
      return [{ fieldName: "name", order: "ASC" }];
    default:
      // A search without a sort comes back by relevance.
      return search && orderby === "newest" ? [] : [{ fieldName: "createdDate", order: "DESC" }];
  }
}

const cache = new Map<string, { at: number; value: unknown }>();

interface StoreIds {
  products: NumericIds;
  variants: NumericIds;
  categories: NumericIds;
}
const idMaps = new Map<string, StoreIds>();

interface CategoryItem {
  id: number;
  name: string;
  count: number;
  parent_id: number | null;
  image_url: string | null;
}

interface Shop {
  currency: string;
  /** The category Wix puts every product in, left out of the app's categories. */
  allProductsCategoryId: string | null;
}

type StockStatus = "in_stock" | "out_of_stock" | "on_backorder";

export class WixConnector implements PlatformConnector {
  private readonly client: WixClient;
  private readonly ids: StoreIds;

  constructor(
    private readonly settings: WixSettings,
    fetcher: Fetch = fetch,
  ) {
    this.client = new WixClient(settings, fetcher);
    let ids = idMaps.get(settings.clientId);
    if (!ids) {
      ids = { products: new NumericIds("Wix"), variants: new NumericIds("Wix"), categories: new NumericIds("Wix") };
      idMaps.set(settings.clientId, ids);
    }
    this.ids = ids;
  }

  private get hasOrders(): boolean {
    return Boolean(this.settings.apiKey && this.settings.siteId);
  }

  private async cached<T>(name: string, load: () => Promise<T>): Promise<T> {
    const key = `${this.settings.clientId}:${name}`;
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
      if (e instanceof ConnectorError && !(e instanceof PlatformCheckError)) return null;
      throw e;
    }
  }

  private shop(): Promise<Shop> {
    return this.cached("shop", async () => {
      const [first, all] = await Promise.all([
        this.client.visitor<{ products?: WixProduct[] }>("POST", "/stores/v3/products/query", { query: { cursorPaging: { limit: 1 } }, fields: LIST_FIELDS }),
        // Unverified: that a visitor token may read the "All Products" category's ID.
        this.optional(() => this.client.visitor<{ categoryId?: string | null }>("GET", "/stores/v3/all-products-category")),
      ]);
      // Unverified: Wix has no site currency for visitors besides the products' own; one product tells it.
      return { currency: first.products?.[0]?.currency || "USD", allProductsCategoryId: all?.categoryId ?? null };
    });
  }

  private money(amount: number, currency: string): string {
    return formatWixMoney(amount, currency);
  }

  /**
   * Checks the client ID (and the API key, when there is one); returns a name
   * for the store. The site must run Wix Stores on Catalog V3, which visitor
   * tokens read; the key must read orders.
   */
  async check(): Promise<string> {
    const version = await this.optional(() => this.client.visitor<{ catalogVersion?: string | null }>("GET", "/stores/v3/provision/version"));
    if (version?.catalogVersion === "STORES_NOT_INSTALLED") {
      throw new PlatformCheckError("This Wix site doesn't have Wix Stores. Add Wix Stores to the site in Wix, then try again.");
    }
    if (version?.catalogVersion === "V1_CATALOG") {
      throw new PlatformCheckError(
        "This Wix store still uses Wix's older product catalog (Catalog V1), which can't be connected yet. Wix moves stores to the new catalog; try again once yours has moved, or contact us.",
      );
    }
    try {
      await this.client.visitor("POST", "/stores/v3/products/query", { query: { cursorPaging: { limit: 1 } }, fields: LIST_FIELDS });
    } catch (e) {
      if (e instanceof WixHttpError && e.status >= 400 && e.status < 500) {
        throw new PlatformCheckError(
          "Wix didn't let this client ID read your products. Check that the OAuth app belongs to the site with your store, and that the site runs Wix Stores.",
        );
      }
      throw e;
    }
    if (this.hasOrders) {
      try {
        await this.client.admin("POST", "/ecom/v1/orders/search", { search: { cursorPaging: { limit: 1 } } });
      } catch (e) {
        if (e instanceof WixHttpError && (e.status === 401 || e.status === 403)) {
          throw new PlatformCheckError(
            "This API key can't read your orders. In Wix, open the API Keys page of your account, give the key the permission to read Wix Stores and eCommerce orders, then paste it again.",
          );
        }
        if (e instanceof WixHttpError && e.status >= 400 && e.status < 500) {
          throw new PlatformCheckError("Wix didn't find this site with this API key. Check the site ID, and that the key belongs to the account that owns the site.");
        }
        throw e;
      }
    }
    return "Wix store";
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
      features: { orders: this.hasOrders },
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
          return this.hasOrders ? await this.orders(request) : null;
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

  private stockStatus(product: WixProduct): StockStatus {
    if (product.inventory?.availabilityStatus !== "OUT_OF_STOCK") return "in_stock";
    return product.inventory?.preorderStatus === "ENABLED" ? "on_backorder" : "out_of_stock";
  }

  private variantStock(variant: WixVariant): StockStatus {
    if (variant.inventoryStatus?.inStock !== false) return "in_stock";
    return variant.inventoryStatus?.preorderEnabled ? "on_backorder" : "out_of_stock";
  }

  private digital(product: WixProduct): boolean {
    return (product.productType ?? "").toUpperCase() === "DIGITAL";
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

  private productPrice(product: WixProduct, shop: Shop) {
    return this.price(
      amountOf(product.actualPriceRange?.minValue),
      amountOf(product.actualPriceRange?.maxValue),
      amountOf(product.compareAtPriceRange?.minValue),
      product.currency || shop.currency,
    );
  }

  private variants(product: WixProduct): WixVariant[] {
    return (product.variantsInfo?.variants ?? []).filter((v) => v.id && v.visible !== false);
  }

  private summary(product: WixProduct, shop: Shop) {
    const id = this.ids.products.add(product.id);
    if (id === null) return null;
    const price = this.productPrice(product, shop);
    const stock = this.stockStatus(product);
    return {
      id,
      name: product.name ?? "",
      type: (product.options?.length ?? 0) > 0 ? "variable" : "simple",
      image_url: mediaUrl(product.media?.main),
      price,
      rating: null,
      rating_count: 0,
      stock_status: stock,
      purchasable: stock !== "out_of_stock" && amountOf(product.actualPriceRange?.minValue) !== null,
      digital: this.digital(product),
    };
  }

  private summaries(products: WixProduct[], shop: Shop) {
    return products
      .filter((p) => p.visible !== false)
      .map((p) => this.summary(p, shop))
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }

  /** The option slugs and choice names of a product, by Wix option and choice ID. */
  private optionNames(product: WixProduct) {
    const slugs = new Map<string, string>();
    const choices = new Map<string, string>();
    for (const option of product.options ?? []) {
      let slug = slugify(option.name ?? "Option");
      while ([...slugs.values()].includes(slug)) slug = `${slug}_`;
      if (option.id) slugs.set(option.id, slug);
      for (const choice of option.choicesSettings?.choices ?? []) if (choice.choiceId && choice.name) choices.set(choice.choiceId, choice.name);
    }
    return { slugs, choices };
  }

  /** The variant's choices as slug → choice name. */
  private variantChoices(variant: WixVariant, names: ReturnType<WixConnector["optionNames"]>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const c of variant.choices ?? []) {
      const optionId = c.optionChoiceIds?.optionId;
      const slug = optionId ? names.slugs.get(optionId) : undefined;
      if (!slug) continue;
      const choiceId = c.optionChoiceIds?.choiceId;
      out[slug] = (choiceId ? names.choices.get(choiceId) : undefined) ?? c.optionChoiceNames?.choiceName ?? "";
    }
    return out;
  }

  private permalink(product: WixProduct): string {
    if (product.url && /^https?:\/\//.test(product.url)) return product.url;
    const slug = product.slug ? encodeURIComponent(product.slug) : "";
    // Unverified: /product-page/<slug> is Wix's default product page address.
    return this.settings.storefront ? `https://${this.settings.storefront}/product-page/${slug}` : "https://www.wix.com/";
  }

  private async detail(product: WixProduct, shop: Shop) {
    const summary = this.summary(product, shop)!;
    const variable = summary.type === "variable";
    const names = this.optionNames(product);
    const variants = this.variants(product);
    const single = variants.length === 1 ? variants[0]! : null;
    const seen = new Set<string>();
    const media = product.media?.itemsInfo?.items?.length ? product.media.itemsInfo.items : product.media?.main ? [product.media.main] : [];
    const images = media
      .map((m) => ({ url: mediaUrl(m), alt: m.altText || product.name || null }))
      .filter((i): i is { url: string; alt: string | null } => i.url !== null && !seen.has(i.url) && Boolean(seen.add(i.url)));
    const categories = await this.categoryList();
    const direct = new Set((product.directCategoriesInfo?.categories ?? []).map((c) => c.id).filter((id): id is string => Boolean(id)));
    const own = categories.filter((c) => direct.has(c.wixId));
    const related = own[0] ? await this.search({ search: "", categoryId: own[0].wixId, orderby: "newest" }, 9) : { items: [] };
    return {
      ...summary,
      description_html: product.plainDescription ?? "",
      short_description_html: null,
      images,
      sku: single?.sku || null,
      max_quantity: null,
      attributes: variable
        ? (product.options ?? []).map((o) => ({
            slug: (o.id && names.slugs.get(o.id)) || slugify(o.name ?? "Option"),
            name: o.name ?? "Option",
            variation: true,
            options: (o.choicesSettings?.choices ?? [])
              .filter((c) => c.visible !== false && c.name)
              .map((c) => ({ value: c.name!, label: c.name! })),
          }))
        : [],
      variations: variable
        ? variants
            .map((v) => {
              const id = this.ids.variants.add(v.id!);
              if (id === null) return null;
              const stock = this.variantStock(v);
              const amount = amountOf(v.price?.actualPrice);
              return {
                id,
                attributes: this.variantChoices(v, names),
                price: this.price(amount, amount, amountOf(v.price?.compareAtPrice), product.currency || shop.currency),
                image_url: mediaUrl(v.media),
                stock_status: stock,
                max_quantity: null,
                purchasable: stock !== "out_of_stock" && amount !== null,
              };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null)
        : [],
      categories: own.map((c) => ({ id: c.id, name: c.name, count: 0, parent_id: c.parent_id, image_url: c.image_url })),
      related: this.summaries(related.items.filter((p) => p.id !== product.id), shop).slice(0, 8),
      external_url: null,
      permalink: this.permalink(product),
    };
  }

  // Categories

  /** The store's visible categories with the app's IDs, without "All Products". */
  private categoryList(): Promise<(CategoryItem & { wixId: string; parentWixId: string | null })[]> {
    return this.cached("categories", async () => {
      const shop = await this.shop();
      const all: WixCategory[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < CATEGORY_PAGES; page++) {
        // Unverified: Wix Stores' categories are the tree of the "@wix/stores" app namespace.
        const data: { categories?: WixCategory[] } & Paged = await this.client.visitor("POST", "/categories/v1/categories/query", {
          query: cursor ? { cursorPaging: { limit: PAGE_LIMIT, cursor } } : { filter: { visible: true }, cursorPaging: { limit: PAGE_LIMIT } },
          treeReference: { appNamespace: "@wix/stores" },
        });
        all.push(...(data.categories ?? []));
        cursor = data.pagingMetadata?.cursors?.next ?? null;
        if (!data.pagingMetadata?.hasNext || !cursor) break;
      }
      const live = all.filter((c) => c.id && c.visible !== false && c.id !== shop.allProductsCategoryId);
      const numbers = new Map<string, number>();
      for (const c of live) {
        const id = this.ids.categories.add(c.id);
        if (id !== null) numbers.set(c.id, id);
      }
      return live
        .filter((c) => numbers.has(c.id))
        .map((c) => {
          const parent = c.parentCategory?.id ?? null;
          return {
            id: numbers.get(c.id)!,
            wixId: c.id,
            parentWixId: parent && numbers.has(parent) ? parent : null,
            name: c.name ?? "",
            count: Math.max(0, Math.floor(Number(c.itemCounter) || 0)),
            parent_id: parent ? (numbers.get(parent) ?? null) : null,
            image_url: wixImageUrl(c.image),
          };
        });
    });
  }

  /** Categories with products, or with subcategories that have some. */
  private async categories(): Promise<CategoryItem[]> {
    const list = await this.categoryList();
    const children = new Map<string, string[]>();
    for (const c of list) if (c.parentWixId) children.set(c.parentWixId, [...(children.get(c.parentWixId) ?? []), c.wixId]);
    const byId = new Map(list.map((c) => [c.wixId, c]));
    const hasItems = (wixId: string, depth = 0): boolean =>
      (byId.get(wixId)?.count ?? 0) > 0 || (depth < 20 && (children.get(wixId) ?? []).some((child) => hasItems(child, depth + 1)));
    return list.filter((c) => hasItems(c.wixId)).map(({ id, name, count, parent_id, image_url }) => ({ id, name, count, parent_id, image_url }));
  }

  // Listing

  /** The Wix ID of a product number: from memory, or else from the first INDEX_PAGES pages of products. */
  private async productId(n: number): Promise<string | null> {
    const known = this.ids.products.get(n);
    if (known) return known;
    await this.cached("index", async () => {
      let cursor: string | null = null;
      for (let page = 0; page < INDEX_PAGES; page++) {
        const data: { products?: { id: string }[] } & Paged = await this.client.visitor("POST", "/stores/v3/products/query", {
          query: { cursorPaging: { limit: PAGE_LIMIT, ...(cursor ? { cursor } : {}) } },
        });
        for (const p of data.products ?? []) this.ids.products.add(p.id);
        cursor = data.pagingMetadata?.cursors?.next ?? null;
        if (!data.pagingMetadata?.hasNext || !cursor) break;
      }
      return true;
    });
    return this.ids.products.get(n);
  }

  /** One request to Search Products; a cursor carries the filter and sort of the first one. */
  private async searchPage(
    options: { search: string; categoryId: string | null; orderby: OrderBy },
    limit: number,
    cursor: string | null,
  ): Promise<{ items: WixProduct[]; next: string | null }> {
    // Unverified: the category filter (`$matchItems` on allCategoriesInfo, which also has the parent categories).
    const filter = {
      visible: true,
      ...(options.categoryId ? { "allCategoriesInfo.categories": { $matchItems: [{ id: { $in: [options.categoryId] } }] } } : {}),
    };
    const sort = sortFor(options.orderby, options.search !== "");
    const search = cursor
      ? { cursorPaging: { limit, cursor } }
      : {
          filter,
          ...(sort.length > 0 ? { sort } : {}),
          ...(options.search ? { search: { expression: options.search } } : {}),
          cursorPaging: { limit },
        };
    const data: { products?: WixProduct[] } & Paged = await this.client.visitor("POST", "/stores/v3/products/search", { search, fields: LIST_FIELDS });
    const next = data.pagingMetadata?.hasNext ? (data.pagingMetadata.cursors?.next ?? null) : null;
    return { items: data.products ?? [], next };
  }

  /** The first `limit` matches (at most PAGE_LIMIT). */
  private async search(options: { search: string; categoryId: string | null; orderby: OrderBy }, limit: number) {
    const result = await this.searchPage(options, Math.min(limit, PAGE_LIMIT), null);
    return { items: result.items, hasNext: result.next !== null };
  }

  /** A page of matches: Wix pages by cursor, so earlier pages are walked in steps of PAGE_LIMIT. */
  private async page(options: { search: string; categoryId: string | null; orderby: OrderBy }, page: number, perPage: number) {
    let cursor: string | null = null;
    let skip = (page - 1) * perPage;
    while (skip > 0) {
      const n = Math.min(PAGE_LIMIT, skip);
      const chunk = await this.searchPage(options, n, cursor);
      if (chunk.items.length < n || !chunk.next) return { items: [] as WixProduct[], hasNext: false };
      skip -= n;
      cursor = chunk.next;
    }
    const result = await this.searchPage(options, perPage, cursor);
    return { items: result.items, hasNext: result.next !== null };
  }

  /** On-sale products among the first PAGE_LIMIT matches (Wix can't filter by sale price). */
  private async saleProducts(search: string, categoryId: string | null, orderby: OrderBy): Promise<WixProduct[]> {
    const shop = await this.shop();
    const load = () => this.search({ search, categoryId, orderby }, PAGE_LIMIT);
    const all = search || categoryId ? await load() : await this.cached(`sale:${orderby}`, load);
    return all.items.filter((p) => this.productPrice(p, shop).on_sale);
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
      const data: { products?: WixProduct[] } = known.length
        ? await this.client.visitor("POST", "/stores/v3/products/query", {
            query: { filter: { id: { $in: known } }, cursorPaging: { limit: known.length } },
            fields: LIST_FIELDS,
          })
        : { products: [] };
      const byId = new Map((data.products ?? []).map((p) => [p.id, p]));
      const items = this.summaries(known.map((id) => byId.get(id)).filter((p): p is WixProduct => Boolean(p)), shop);
      return { status: 200, body: { page: 1, per_page: items.length || perPage, total: items.length, total_pages: 1, items } };
    }
    const orderParam = query.get("orderby") as OrderBy | null;
    const orderby = orderParam && ORDERS.includes(orderParam) ? orderParam : "newest";
    let categoryId: string | null = null;
    if (query.get("category")) {
      const category = Number(query.get("category"));
      if (!Number.isSafeInteger(category) || category < 1) return error(400, "invalid_request", "Unknown category.");
      await this.categoryList();
      categoryId = this.ids.categories.get(category);
      if (!categoryId) return { status: 200, body: { page, per_page: perPage, total: 0, total_pages: 1, items: [] } };
    }
    const search = (query.get("search") ?? "").trim().slice(0, 100);
    // Wix has no featured products: `featured` lists the shop's products as they are.
    if (query.get("on_sale") === "true" || query.get("on_sale") === "1") {
      const sale = this.summaries(await this.saleProducts(search, categoryId, orderby), shop);
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
    const result = await this.page({ search, categoryId, orderby }, page, perPage);
    // Wix pages by cursor: the totals say whether there's a next page.
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
      this.cached("newest", () => this.search({ search: "", categoryId: null, orderby: "newest" }, 10)),
      this.saleProducts("", null, "newest"),
    ]);
    const products = (type: string, list: WixProduct[]) => {
      const items = this.summaries(list, shop).slice(0, 10);
      return items.length > 0 ? [{ type, title: null, products: items }] : [];
    };
    return [
      ...(categories.length > 0 ? [{ type: "categories", title: null, categories: categories.slice(0, 12) }] : []),
      ...products("sale_products", sale),
      ...products("new_products", newest.items),
    ];
  }

  /** A product with its variants, or null when Wix doesn't show it. */
  private async load(wixId: string): Promise<WixProduct | null> {
    const fields = DETAIL_FIELDS.map((f) => `fields=${f}`).join("&");
    try {
      const data = await this.client.visitor<{ product?: WixProduct | null }>("GET", `/stores/v3/products/${encodeURIComponent(wixId)}?${fields}`);
      return data.product && data.product.visible !== false ? data.product : null;
    } catch (e) {
      if (e instanceof WixHttpError && e.status === 404) return null;
      throw e;
    }
  }

  private async product(id: number): Promise<ConnectorResult> {
    const shop = await this.shop();
    const wixId = await this.productId(id);
    const product = wixId ? await this.load(wixId) : null;
    if (!product) return error(404, "not_found", "Product not found.");
    return { status: 200, body: await this.detail(product, shop) };
  }

  // Cart and checkout

  private async priced(lines: CartLineInput[]) {
    const shop = await this.shop();
    const wixIds = [...new Set((await Promise.all(lines.map((l) => this.productId(l.product_id)))).filter((id): id is string => id !== null))];
    const products = new Map<string, WixProduct>();
    await Promise.all(
      wixIds.map(async (wixId) => {
        const product = await this.load(wixId);
        if (product) products.set(wixId, product);
      }),
    );
    let currency = shop.currency;
    let subtotal = 0;
    let count = 0;
    const refs: ({ productId: string; variantId: string } | null)[] = [];
    const out = lines.map((line) => {
      const wixId = this.ids.products.get(line.product_id);
      const product = wixId ? products.get(wixId) : undefined;
      const variants = product ? this.variants(product) : [];
      for (const v of variants) this.ids.variants.add(v.id!);
      // A line without a variation is a product without options: its only variant.
      const variant =
        line.variation_id === null
          ? variants.length === 1 && (product!.options?.length ?? 0) === 0
            ? variants[0]
            : undefined
          : variants.find((v) => this.ids.variants.get(line.variation_id!) === v.id);
      const amount = variant ? amountOf(variant.price?.actualPrice) : null;
      const lineCurrency = product?.currency || shop.currency;
      if (!product || !variant || amount === null) {
        refs.push(null);
        return {
          product_id: line.product_id,
          variation_id: line.variation_id,
          quantity: line.quantity,
          name: product?.name ?? "Unavailable product",
          image_url: null,
          unit_price: this.money(0, lineCurrency),
          line_total: this.money(0, lineCurrency),
          available: false,
          problem: "This product is no longer available.",
          max_quantity: null,
          digital: false,
        };
      }
      refs.push({ productId: product.id, variantId: variant.id! });
      currency = lineCurrency;
      const available = this.variantStock(variant) !== "out_of_stock";
      const total = amount * line.quantity;
      if (available) {
        subtotal += total;
        count += line.quantity;
      }
      const values = Object.values(this.variantChoices(variant, this.optionNames(product))).filter(Boolean);
      return {
        product_id: line.product_id,
        variation_id: line.variation_id,
        quantity: line.quantity,
        name: values.length > 0 ? `${product.name ?? ""} - ${values.join(" / ")}` : (product.name ?? ""),
        image_url: mediaUrl(variant.media) ?? mediaUrl(product.media?.main),
        unit_price: this.money(amount, lineCurrency),
        line_total: this.money(total, lineCurrency),
        available,
        problem: available ? null : "Out of stock.",
        max_quantity: null,
        digital: this.digital(product),
      };
    });
    return {
      refs,
      cart: {
        lines: out,
        item_count: count,
        subtotal: this.money(subtotal, currency),
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

  /**
   * Creates a Wix checkout of the cart and a redirect session to Wix's hosted
   * checkout page, which the app opens (as for Shopify).
   */
  private async checkoutLink(request: ConnectorRequest): Promise<ConnectorResult> {
    const platform = request.query.get("platform");
    if (platform !== "android" && platform !== "ios") return error(400, "invalid_request", "Unknown platform.");
    const lines = cartLines(request.body);
    if (!lines) return error(400, "invalid_request", "The cart is empty or invalid.");
    const priced = await this.priced(lines);
    const pricedLines = priced.cart.lines;
    if (pricedLines.some((l) => !l.available || l.problem)) {
      return error(409, "cart_changed", "Something in your cart changed. Please check it and try again.");
    }
    if (platform === "ios" && pricedLines.some((l) => l.digital)) {
      return error(403, "purchase_not_allowed", "Digital products can't be bought in the iPhone app.");
    }
    // Unverified: that a visitor token may create a checkout directly, and that Catalog V3 items take `options.variantId`.
    const created = await this.client.visitor<{ checkout?: { id?: string | null } | null }>("POST", "/ecom/v1/checkouts", {
      lineItems: pricedLines.map((l, i) => ({
        quantity: l.quantity,
        catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: priced.refs[i]!.productId, options: { variantId: priced.refs[i]!.variantId } },
      })),
      channelType: "WEB",
    });
    const checkoutId = created.checkout?.id;
    if (!checkoutId) return error(409, "cart_changed", "The shop couldn't start the checkout.");
    const session = await this.client.visitor<{ redirectSession?: { fullUrl?: string | null } | null }>("POST", "/redirect-session/v1/redirect-session", {
      ecomCheckout: { checkoutId },
      ...(this.settings.storefront ? { callbacks: { postFlowUrl: `https://${this.settings.storefront}` } } : {}),
    });
    const url = session.redirectSession?.fullUrl;
    if (!url || !/^https:\/\//.test(url)) return error(409, "cart_changed", "The shop couldn't start the checkout.");
    return {
      status: 200,
      body: {
        url,
        expires_at: new Date(request.now.getTime() + CHECKOUT_LINK_MINUTES * 60_000).toISOString(),
        open_in: "in_app",
      },
    };
  }

  // Orders

  private async searchOrders(filter: Record<string, unknown> | null): Promise<WixOrder[]> {
    const data = await this.client.admin<{ orders?: WixOrder[] }>("POST", "/ecom/v1/orders/search", {
      search: {
        ...(filter ? { filter } : {}),
        sort: [{ fieldName: "createdDate", order: "DESC" }],
        cursorPaging: { limit: ORDER_LOOKUP_LIMIT },
      },
    });
    return data.orders ?? [];
  }

  /**
   * The Wix contacts with exactly this phone number. Wix filters loosely on
   * the number as typed, so each contact's numbers are compared here in
   * E.164. Unverified: the `info.phones.phone` filter and the
   * COMMUNICATION_DETAILS fieldset; without them (or the key's permission to
   * read contacts), orders are still found by their own phone numbers.
   */
  private async contactIds(phone: string): Promise<Set<string>> {
    const data = await this.optional(() =>
      this.client.admin<{ contacts?: WixContact[] }>("POST", "/contacts/v4/contacts/query", {
        query: { filter: { "info.phones.phone": { $in: phoneForms(phone) } }, paging: { limit: 50 }, fieldsets: ["COMMUNICATION_DETAILS"] },
      }),
    );
    const same = (c: WixContact) =>
      e164Of(c.primaryInfo?.phone) === phone || (c.info?.phones?.items ?? []).some((p) => (e164Of(p.e164Phone) ?? e164Of(p.phone)) === phone);
    return new Set((data?.contacts ?? []).filter((c) => c.id && same(c)).map((c) => c.id));
  }

  /**
   * The customer's orders, newest first: those placed with their exact email
   * (email accounts), those of their Wix contacts, and those placed or
   * delivered with their exact phone number among the newest orders.
   */
  private async customerOrders(user: HostedUser): Promise<WixOrder[]> {
    const phone = e164Of(user.phone);
    const email = verifiedEmail(user);
    if (!phone && !email) return [];
    const contacts = phone ? await this.contactIds(phone) : new Set<string>();
    const samePhone = (value: string | null | undefined) => phone !== null && e164Of(value) === phone;
    const lists = await Promise.all([
      email ? this.searchOrders({ "buyerInfo.email": { $eq: email } }).then((list) => list.filter((o) => o.buyerInfo?.email?.trim().toLowerCase() === email)) : [],
      contacts.size > 0
        ? this.searchOrders({ "buyerInfo.contactId": { $in: [...contacts] } }).then((list) => list.filter((o) => Boolean(o.buyerInfo?.contactId && contacts.has(o.buyerInfo.contactId))))
        : [],
      // Wix can't filter orders by phone: the newest ones are compared here.
      phone ? this.searchOrders(null).then((list) => list.filter((o) => orderPhones(o).some(samePhone))) : [],
    ]);
    const byId = new Map<string, WixOrder>();
    // An order still being placed (INITIALIZED) isn't one yet.
    for (const order of lists.flat()) if (order.id && order.status !== "INITIALIZED") byId.set(order.id, order);
    const at = (o: WixOrder) => Date.parse(o.purchasedDate ?? o.createdDate ?? "") || 0;
    return [...byId.values()].sort((a, b) => at(b) - at(a));
  }

  private async orders(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return error(401, "invalid_token", "Your session has ended. Please sign in again.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const all = await this.customerOrders(request.user);
    const shop = all.length > 0 ? await this.optional(() => this.shop()) : null;
    const items = all.slice((page - 1) * perPage, page * perPage).map((order) => {
      const { status, label } = wixOrderStatus(order);
      const created = Date.parse(order.purchasedDate ?? order.createdDate ?? "");
      return {
        id: stableNumericId(order.id),
        number: String(order.number ?? stableNumericId(order.id)),
        status,
        status_label: label,
        total: this.money(amountOf(order.priceSummary?.total) ?? 0, order.currency || shop?.currency || "USD"),
        created_at: Number.isNaN(created) ? request.now.toISOString() : new Date(created).toISOString(),
        items: (order.lineItems ?? []).map((line) => {
          const options = (line.descriptionLines ?? []).map((d) => d.plainText?.original).filter((v): v is string => Boolean(v));
          const name = line.productName?.original || "Product";
          const ref = line.catalogReference;
          return {
            name: options.length > 0 ? `${name} - ${options.join(" / ")}` : name,
            course_id: null,
            product_id: ref?.appId === WIX_STORES_APP_ID && ref.catalogItemId ? this.ids.products.add(ref.catalogItemId) : null,
            quantity: Math.max(1, Math.round(Number(line.quantity) || 1)),
            image_url: wixImageUrl(line.image),
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

/** Clears the cached store data, tokens and ID numbers (tests). */
export function clearWixCache(): void {
  cache.clear();
  tokens.clear();
  pendingTokens.clear();
  idMaps.clear();
}

export const WIX_PLATFORM: PlatformDefinition = {
  id: "wix",
  name: "Wix",
  appType: "store",
  summary: "Your Wix Stores products, prices and stock, with checkout on Wix's own checkout page.",
  fields: [
    {
      name: "clientId",
      label: "Client ID",
      hint:
        "In your Wix dashboard, open Settings, then Headless Settings, and create an OAuth app. Copy its Client ID. It only lets the app read your store as a visitor does.",
      secret: false,
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    },
    {
      name: "apiKey",
      label: "API key",
      hint:
        "Optional, to show customers their orders. In Wix, open the API Keys page of your account, generate a key with permission to read Wix Stores and eCommerce orders (and contacts, to find more orders), and paste it here with the site ID.",
      secret: true,
      optional: true,
    },
    {
      name: "siteId",
      label: "Site ID",
      hint: "Needed with the API key. It's in your site dashboard's address, after /dashboard/. You can paste the whole address.",
      secret: false,
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      optional: true,
    },
    {
      name: "storefront",
      label: "Store address",
      hint: "Optional. The address your customers visit, such as www.your-store.com. Shoppers come back to it after checkout.",
      secret: false,
      placeholder: "www.your-store.com",
      optional: true,
    },
  ],
  normalize(values) {
    const errors: Record<string, string> = {};
    const clientId = normalizeWixId(values.clientId ?? "");
    if (!clientId) errors.clientId = "Enter the Client ID of your Wix OAuth app, as in 1a2b3c4d-1234-5678-9abc-1a2b3c4d5e6f.";
    const typed = (values.storefront ?? "").trim();
    const storefront = typed ? normalizeHost(typed) : "";
    if (storefront === null) errors.storefront = "Enter your store's address, as in www.your-store.com, or leave it empty.";
    const apiKey = (values.apiKey ?? "").trim();
    const siteText = (values.siteId ?? "").trim();
    const siteId = siteText ? normalizeWixId(siteText) : "";
    if (siteId === null) errors.siteId = "Enter your Wix site ID, as in 1a2b3c4d-1234-5678-9abc-1a2b3c4d5e6f, or leave it empty.";
    else if (apiKey && !siteId) errors.siteId = "Enter your site ID too: Wix needs it with the API key.";
    else if (siteId && !apiKey) errors.apiKey = "Enter the API key too, or leave the site ID empty.";
    if (Object.keys(errors).length > 0) return { errors };
    return { values: { ...values, clientId: clientId!, storefront: storefront!, apiKey, siteId: siteId! } };
  },
  create(values, deps) {
    return new WixConnector(
      {
        clientId: values.clientId ?? "",
        storefront: values.storefront || null,
        apiKey: values.apiKey || null,
        siteId: values.siteId || null,
      },
      deps.fetcher,
    );
  },
};

registerPlatform(WIX_PLATFORM);
