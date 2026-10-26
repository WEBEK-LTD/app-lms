import type { HostedUser } from "../../data/types";
import { cartLines, e164Of, error, intParam, verifiedEmail, type CartLineInput, withCheckoutTotals } from "./common";
import { ConnectorError, type Connector, type ConnectorRequest, type ConnectorResult } from "./types";

/**
 * Shopify for Store apps: catalog, cart pricing and checkout through the
 * Storefront API (GraphQL), with the shop's public Storefront access token.
 * Products, variants and collections keep Shopify's numeric IDs (the tail of
 * their GIDs), so the app's integer IDs map back without a lookup table.
 * Reviews aren't available through the Storefront API (`store.reviews` is
 * false). Order history needs the optional Admin API token (read_orders and
 * read_customers): the customer's orders are those of the Shopify customers
 * with exactly the phone number they signed in with, or (19) exactly the
 * email address an email account signed in with, both verified by the hosted
 * API, and the orders placed or shipped with that exact phone or email.
 */

export const SHOPIFY_API_VERSION = "2025-07";
const PAGE_LIMIT = 250;
const CACHE_MS = 5 * 60_000;
const CHECKOUT_LINK_MINUTES = 5;
const UNREACHABLE = "Shopify didn't answer.";
/** The collection Shopify creates for the online store's home page. */
const FEATURED_HANDLE = "frontpage";

type Fetch = typeof fetch;

export interface ShopifySettings {
  /** "your-shop.myshopify.com". */
  shopDomain: string;
  storefrontToken: string;
  /** Optional Admin API access token, for order history. */
  adminToken?: string | null;
}

/** "your-shop.myshopify.com" from what a client typed ("https://your-shop.myshopify.com/admin", "your-shop"). */
export function normalizeShopDomain(value: string): string | null {
  let host = value.trim().toLowerCase();
  host = host.replace(/^https?:\/\//, "").split(/[/?#]/)[0] ?? "";
  if (/^[a-z0-9][a-z0-9-]*$/.test(host)) host = `${host}.myshopify.com`;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(host) ? host : null;
}

export class ShopifyClient {
  constructor(
    private readonly settings: ShopifySettings,
    private readonly fetcher: Fetch = fetch,
  ) {}

  async query<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(`https://${this.settings.shopDomain}/api/${SHOPIFY_API_VERSION}/graphql.json`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-shopify-storefront-access-token": this.settings.storefrontToken,
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ConnectorError(UNREACHABLE);
    }
    if (!response.ok) throw new ConnectorError(`Shopify answered HTTP ${response.status}.`);
    const body = (await response.json().catch(() => ({}))) as { data?: T; errors?: { message?: string }[] };
    if (body.errors?.length || !body.data) throw new ConnectorError(body.errors?.[0]?.message ?? "Shopify sent no data.");
    return body.data;
  }
}

/** The Admin API (GraphQL), with the shop's Admin API access token. */
export class ShopifyAdminClient {
  constructor(
    private readonly shopDomain: string,
    private readonly token: string,
    private readonly fetcher: Fetch = fetch,
  ) {}

  async query<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(`https://${this.shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-shopify-access-token": this.token },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ConnectorError(UNREACHABLE);
    }
    if (!response.ok) throw new ConnectorError(`Shopify answered HTTP ${response.status}.`);
    const body = (await response.json().catch(() => ({}))) as { data?: T; errors?: { message?: string }[] };
    if (body.errors?.length || !body.data) throw new ConnectorError(body.errors?.[0]?.message ?? "Shopify sent no data.");
    return body.data;
  }
}

// GraphQL

const PRODUCT_SUMMARY = `
fragment Money on MoneyV2 { amount currencyCode }
fragment Summary on Product {
  id title handle availableForSale
  featuredImage { url }
  priceRange { minVariantPrice { ...Money } maxVariantPrice { ...Money } }
  compareAtPriceRange { minVariantPrice { ...Money } maxVariantPrice { ...Money } }
  options(first: 3) { name optionValues { name } }
  variants(first: 1) { nodes { requiresShipping } }
}`;

const PAGE = `nodes { ...Summary } pageInfo { hasNextPage endCursor }`;

const QUERIES = {
  shop: `query { shop { name moneyFormat paymentSettings { currencyCode } primaryDomain { url } } }`,
  collections: `query {
    collections(first: 50, sortKey: TITLE) {
      nodes { id title image { url } products(first: 50) { nodes { id } } }
    }
  }`,
  products: `${PRODUCT_SUMMARY}
    query($first: Int!, $after: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
      products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) { ${PAGE} }
    }`,
  collectionProducts: `${PRODUCT_SUMMARY}
    query($id: ID, $handle: String, $first: Int!, $after: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean) {
      collection(id: $id, handle: $handle) {
        products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) { ${PAGE} }
      }
    }`,
  productsByIds: `${PRODUCT_SUMMARY}
    query($ids: [ID!]!) { nodes(ids: $ids) { ... on Product { ...Summary } } }`,
  product: `${PRODUCT_SUMMARY}
    query($id: ID!) {
      product(id: $id) {
        ...Summary
        descriptionHtml onlineStoreUrl
        images(first: 20) { nodes { url altText } }
        collections(first: 10) { nodes { id title image { url } } }
        variants(first: 100) {
          nodes {
            id availableForSale currentlyNotInStock quantityAvailable requiresShipping sku
            price { ...Money } compareAtPrice { ...Money }
            image { url }
            selectedOptions { name value }
          }
        }
      }
      productRecommendations(productId: $id) { ...Summary }
    }`,
  variants: `query($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id title availableForSale quantityAvailable requiresShipping
        price { amount currencyCode }
        image { url }
        product { id title featuredImage { url } }
      }
    }
  }`,
  // 19 Whether the token reads products at all.
  anyProduct: `query { products(first: 1) { nodes { id } } }`,
  productFirstVariants: `query($ids: [ID!]!) {
    nodes(ids: $ids) { ... on Product { id variants(first: 2) { nodes { id } } } }
  }`,
  cartCreate: `mutation($input: CartInput!) {
    cartCreate(input: $input) { cart { checkoutUrl } userErrors { message } }
  }`,
};

const ADMIN_QUERIES = {
  // 19 With the token's permissions, to say which one is missing.
  shop: `query { shop { name } currentAppInstallation { accessScopes { handle } } }`,
  customers: `query($query: String!) { customers(first: 10, query: $query) { nodes { id phone email } } }`,
  orders: `query($query: String!, $first: Int!) {
    orders(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
      nodes {
        id name createdAt cancelledAt displayFinancialStatus displayFulfillmentStatus
        email phone customer { id } shippingAddress { phone }
        currentTotalPriceSet { shopMoney { amount currencyCode } }
        lineItems(first: 50) { nodes { name quantity image { url } product { id } } }
        fulfillments(first: 5) { createdAt trackingInfo(first: 1) { company number url } }
      }
    }
  }`,
};

/** 19 What the Admin API token needs for order history. */
export const ADMIN_SCOPES = ["read_orders", "read_customers"] as const;
/** The newest orders read per lookup (customers, email, phone) for the order history. */
const ORDER_LOOKUP_LIMIT = 250;

/** 19 A token Shopify accepts but without a permission the app needs; the message names it. */
export class ShopifyPermissionError extends ConnectorError {
  constructor(message: string) {
    super(message);
    this.name = "ShopifyPermissionError";
  }
}

/** The permissions of `needed` the token doesn't have (a write permission includes its read one). */
export function missingScopes(granted: string[], needed: readonly string[]): string[] {
  const have = new Set(granted);
  return needed.filter((scope) => !have.has(scope) && !have.has(scope.replace(/^read_/, "write_")));
}

interface AdminOrder {
  id: string;
  name: string;
  createdAt: string;
  email?: string | null;
  phone?: string | null;
  customer?: { id: string } | null;
  shippingAddress?: { phone: string | null } | null;
  cancelledAt: string | null;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string;
  currentTotalPriceSet: { shopMoney: Money };
  lineItems: { nodes: { name: string; quantity: number; image: { url: string } | null; product: { id: string } | null }[] };
  /** 91.2 Its fulfillments, with their tracking. */
  fulfillments?: { createdAt: string; trackingInfo: { company: string | null; number: string | null; url: string | null }[] }[] | null;
}

/** 91.2 The order's `shipment`: the newest fulfillment with a tracking number or link. */
export function shopifyShipment(order: Pick<AdminOrder, "fulfillments">) {
  const tracked = (order.fulfillments ?? [])
    .map((f) => ({ at: f.createdAt, info: f.trackingInfo?.[0] ?? null }))
    .filter((f) => f.info && (f.info.number?.trim() || f.info.url?.trim()))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
  if (!tracked?.info) return null;
  const url = tracked.info.url?.trim() ?? "";
  return {
    carrier: tracked.info.company?.trim() || null,
    tracking_number: tracked.info.number?.trim() || null,
    tracking_url: /^https?:\/\/\S+$/i.test(url) ? url : null,
    waybill: null,
    shipped_at: new Date(tracked.at).toISOString(),
  };
}

const ORDER_LABELS: Record<string, string> = {
  pending: "Awaiting payment",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** The contract's order status from Shopify's payment and fulfilment statuses. */
export function orderStatus(order: Pick<AdminOrder, "cancelledAt" | "displayFinancialStatus" | "displayFulfillmentStatus">): string {
  if (order.cancelledAt || order.displayFinancialStatus === "VOIDED") return "cancelled";
  if (order.displayFinancialStatus === "REFUNDED") return "refunded";
  if (order.displayFinancialStatus === "PENDING" || order.displayFinancialStatus === "AUTHORIZED" || order.displayFinancialStatus === "EXPIRED") {
    return "pending";
  }
  return order.displayFulfillmentStatus === "FULFILLED" ? "completed" : "processing";
}

interface Money {
  amount: string;
  currencyCode: string;
}
interface PriceRange {
  minVariantPrice: Money;
  maxVariantPrice: Money;
}
interface SummaryNode {
  id: string;
  title: string;
  handle: string;
  availableForSale: boolean;
  featuredImage: { url: string } | null;
  priceRange: PriceRange;
  compareAtPriceRange: PriceRange;
  options: { name: string; optionValues: { name: string }[] }[];
  variants: { nodes: { requiresShipping: boolean }[] };
}
interface ProductPage {
  nodes: SummaryNode[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}
interface VariantNode {
  id: string;
  availableForSale: boolean;
  currentlyNotInStock: boolean;
  quantityAvailable: number | null;
  requiresShipping: boolean;
  sku: string | null;
  price: Money;
  compareAtPrice: Money | null;
  image: { url: string } | null;
  selectedOptions: { name: string; value: string }[];
}
interface ProductNode extends Omit<SummaryNode, "variants"> {
  descriptionHtml: string;
  onlineStoreUrl: string | null;
  images: { nodes: { url: string; altText: string | null }[] };
  collections: { nodes: { id: string; title: string; image: { url: string } | null }[] };
  variants: { nodes: VariantNode[] };
}
interface Shop {
  name: string;
  moneyFormat: string;
  paymentSettings: { currencyCode: string };
  primaryDomain: { url: string };
}

// IDs

export const gid = (type: "Product" | "ProductVariant" | "Collection", id: number) => `gid://shopify/${type}/${id}`;

/** The numeric tail of a GID. */
export function numericId(value: string): number {
  return Number(value.slice(value.lastIndexOf("/") + 1));
}

// Money

/**
 * Formats like Shopify's `moneyFormat` ("${{amount}}", "{{amount_with_comma_separator}} TL"):
 * the placeholders Shopify documents, without the HTML some themes put around them.
 */
export function formatMoney(format: string, amount: string): string {
  const value = Number(amount);
  const group = (digits: number, thousands: string, decimal: string) => {
    const [whole, fraction] = value.toFixed(digits).split(".");
    const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
    return fraction ? `${grouped}${decimal}${fraction}` : grouped;
  };
  const text = format.replace(/<[^>]*>/g, "");
  const result = text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => {
    switch (name) {
      case "amount_no_decimals":
        return group(0, ",", ".");
      case "amount_with_comma_separator":
        return group(2, ".", ",");
      case "amount_no_decimals_with_comma_separator":
        return group(0, ".", ",");
      case "amount_with_apostrophe_separator":
        return group(2, "'", ".");
      case "amount_with_space_separator":
        return group(2, " ", ",");
      default:
        return group(2, ",", ".");
    }
  });
  return result.trim();
}

const decimal = (amount: string) => Number(amount).toFixed(2);

// Mapping

class Mapper {
  constructor(
    private readonly shop: Shop,
    private readonly domain: string,
  ) {}

  money(amount: string): string {
    return formatMoney(this.shop.moneyFormat, amount);
  }

  price(range: PriceRange, compare: PriceRange | null) {
    const min = range.minVariantPrice.amount;
    const max = range.maxVariantPrice.amount;
    const isRange = Number(min) !== Number(max);
    const regular = compare ? compare.minVariantPrice.amount : null;
    const onSale = regular !== null && Number(regular) > Number(min);
    return {
      amount: decimal(min),
      regular_amount: onSale ? decimal(regular!) : null,
      regular_formatted: onSale && !isRange ? this.money(regular!) : null,
      currency: range.minVariantPrice.currencyCode,
      formatted: isRange ? `${this.money(min)} – ${this.money(max)}` : this.money(min),
      on_sale: onSale,
      range: isRange,
    };
  }

  variantPrice(price: Money, compare: Money | null) {
    return this.price({ minVariantPrice: price, maxVariantPrice: price }, compare ? { minVariantPrice: compare, maxVariantPrice: compare } : null);
  }

  /** Shopify gives every product at least one option; a lone "Title" with one value means no real options. */
  static isVariable(node: Pick<SummaryNode, "options">): boolean {
    return node.options.some((o) => o.optionValues.length > 1 || (o.name !== "Title" && o.optionValues.length > 0));
  }

  summary(node: SummaryNode) {
    return {
      id: numericId(node.id),
      name: node.title,
      type: Mapper.isVariable(node) ? "variable" : "simple",
      image_url: node.featuredImage?.url ?? null,
      price: this.price(node.priceRange, node.compareAtPriceRange),
      rating: null,
      rating_count: 0,
      stock_status: node.availableForSale ? "in_stock" : "out_of_stock",
      purchasable: node.availableForSale,
      digital: node.variants.nodes.length > 0 && !node.variants.nodes[0]!.requiresShipping,
    };
  }

  category(node: { id: string; title: string; image: { url: string } | null }, count: number) {
    return { id: numericId(node.id), name: node.title, count, parent_id: null, image_url: node.image?.url ?? null };
  }

  detail(node: ProductNode, related: SummaryNode[]) {
    const variable = Mapper.isVariable(node);
    const slugs = new Map(node.options.map((o) => [o.name, slugify(o.name)]));
    const stock = (v: VariantNode) =>
      !v.availableForSale ? "out_of_stock" : v.currentlyNotInStock ? "on_backorder" : "in_stock";
    const max = (v: VariantNode) => (v.quantityAvailable !== null && v.quantityAvailable > 0 && !v.currentlyNotInStock ? v.quantityAvailable : null);
    const single = node.variants.nodes.length === 1 ? node.variants.nodes[0]! : null;
    return {
      ...this.summary({ ...node, variants: { nodes: node.variants.nodes.slice(0, 1) } }),
      description_html: node.descriptionHtml,
      short_description_html: null,
      images: node.images.nodes.map((i) => ({ url: i.url, alt: i.altText })),
      sku: single?.sku || null,
      max_quantity: single ? max(single) : null,
      attributes: variable
        ? node.options.map((o) => ({
            slug: slugs.get(o.name)!,
            name: o.name,
            variation: true,
            options: o.optionValues.map((v) => ({ value: v.name, label: v.name })),
          }))
        : [],
      variations: variable
        ? node.variants.nodes.map((v) => ({
            id: numericId(v.id),
            attributes: Object.fromEntries(v.selectedOptions.map((o) => [slugs.get(o.name) ?? slugify(o.name), o.value])),
            price: this.variantPrice(v.price, v.compareAtPrice),
            image_url: v.image?.url ?? null,
            stock_status: stock(v),
            max_quantity: max(v),
            purchasable: v.availableForSale,
          }))
        : [],
      categories: node.collections.nodes.map((c) => this.category(c, 0)),
      related: related.slice(0, 8).map((r) => this.summary(r)),
      external_url: null,
      permalink: node.onlineStoreUrl ?? `${this.shop.primaryDomain.url.replace(/\/+$/, "") || `https://${this.domain}`}/products/${node.handle}`,
    };
  }
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

// Requests

type OrderBy = "newest" | "popular" | "rating" | "price_asc" | "price_desc" | "title";
const ORDERS: OrderBy[] = ["newest", "popular", "rating", "price_asc", "price_desc", "title"];

function sortFor(orderby: OrderBy, inCollection: boolean, search: boolean): { sortKey: string; reverse: boolean } {
  switch (orderby) {
    case "popular":
    case "rating":
      return { sortKey: "BEST_SELLING", reverse: false };
    case "price_asc":
      return { sortKey: "PRICE", reverse: false };
    case "price_desc":
      return { sortKey: "PRICE", reverse: true };
    case "title":
      return { sortKey: "TITLE", reverse: false };
    default:
      if (search) return { sortKey: "RELEVANCE", reverse: false };
      return { sortKey: inCollection ? "CREATED" : "CREATED_AT", reverse: true };
  }
}

const cache = new Map<string, { at: number; value: unknown }>();

export class ShopifyConnector implements Connector {
  private readonly client: ShopifyClient;
  private readonly admin: ShopifyAdminClient | null;

  constructor(
    private readonly settings: ShopifySettings,
    fetcher: Fetch = fetch,
    private readonly cacheKey = settings.shopDomain,
  ) {
    this.client = new ShopifyClient(settings, fetcher);
    this.admin = settings.adminToken ? new ShopifyAdminClient(settings.shopDomain, settings.adminToken, fetcher) : null;
  }

  private async cached<T>(name: string, load: () => Promise<T>): Promise<T> {
    const key = `${this.cacheKey}:${name}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as T;
    const value = await load();
    cache.set(key, { at: Date.now(), value });
    return value;
  }

  private shop(): Promise<Shop> {
    return this.cached("shop", async () => (await this.client.query<{ shop: Shop }>(QUERIES.shop)).shop);
  }

  private async mapper(): Promise<Mapper> {
    return new Mapper(await this.shop(), this.settings.shopDomain);
  }

  /**
   * Checks the domain and token; returns the shop's name. 19 The token must
   * also read products (the Storefront API's product listings permission).
   */
  async check(): Promise<string> {
    const name = (await this.client.query<{ shop: Shop }>(QUERIES.shop)).shop.name;
    try {
      await this.client.query(QUERIES.anyProduct);
    } catch (e) {
      if (!(e instanceof ConnectorError) || e.message === UNREACHABLE || /HTTP 5\d\d/.test(e.message)) throw e;
      throw new ShopifyPermissionError(
        "This Storefront API token can't read your products. In Shopify, give it the unauthenticated_read_product_listings permission, then paste it again.",
      );
    }
    return name;
  }

  /** Checks the Admin API token, when there is one: 19 it must have read_orders and read_customers. */
  async checkAdmin(): Promise<void> {
    if (!this.admin) return;
    const data = await this.admin.query<{ currentAppInstallation?: { accessScopes?: { handle: string }[] } | null }>(ADMIN_QUERIES.shop);
    const missing = missingScopes((data.currentAppInstallation?.accessScopes ?? []).map((s) => s.handle), ADMIN_SCOPES);
    if (missing.length === 1) {
      throw new ShopifyPermissionError(
        `This Admin API token doesn't have the ${missing[0]} permission. In Shopify, add it to the app's Admin API scopes, install the app again, then paste the new token.`,
      );
    }
    if (missing.length > 1) {
      throw new ShopifyPermissionError(
        `This Admin API token doesn't have the ${missing.join(" and ")} permissions. In Shopify, add them to the app's Admin API scopes, install the app again, then paste the new token.`,
      );
    }
  }

  async config() {
    const shop = await this.shop();
    return {
      store: {
        currency: shop.paymentSettings.currencyCode,
        guest_checkout: true,
        checkout_opens_in: "in_app",
        reviews: false,
        delivery_date: { enabled: false, required: false, min_days: 0, max_days: 0, closed_weekdays: [] },
        gift_message: { enabled: false, max_length: 200 },
      },
      features: { orders: this.admin !== null },
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
          return this.admin ? await this.orders(request, this.admin) : null;
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

  private async categories() {
    const map = await this.mapper();
    return this.cached("collections", async () => {
      const data = await this.client.query<{
        collections: { nodes: { id: string; title: string; image: { url: string } | null; products: { nodes: unknown[] } }[] };
      }>(QUERIES.collections);
      return data.collections.nodes
        .filter((c) => c.products.nodes.length > 0)
        .map((c) => map.category(c, c.products.nodes.length));
    });
  }

  private async page(
    load: (first: number, after: string | null) => Promise<ProductPage | null>,
    page: number,
    perPage: number,
  ): Promise<{ items: SummaryNode[]; hasNext: boolean }> {
    let cursor: string | null = null;
    let skip = (page - 1) * perPage;
    while (skip > 0) {
      const n = Math.min(PAGE_LIMIT, skip);
      const chunk = await load(n, cursor);
      if (!chunk || chunk.nodes.length < n || !chunk.pageInfo.hasNextPage) return { items: [], hasNext: false };
      skip -= n;
      cursor = chunk.pageInfo.endCursor;
    }
    const result = await load(perPage, cursor);
    return { items: result?.nodes ?? [], hasNext: result?.pageInfo.hasNextPage ?? false };
  }

  private loader(options: { search: string; category: number | null; featured: boolean; orderby: OrderBy }) {
    const inCollection = options.category !== null || options.featured;
    const sort = sortFor(options.orderby, inCollection, options.search !== "");
    if (inCollection) {
      return async (first: number, after: string | null) => {
        const data = await this.client.query<{ collection: { products: ProductPage } | null }>(QUERIES.collectionProducts, {
          ...(options.category !== null ? { id: gid("Collection", options.category) } : { handle: FEATURED_HANDLE }),
          first,
          after,
          ...sort,
        });
        return data.collection?.products ?? null;
      };
    }
    const query = options.search ? options.search.replace(/["\\:()]/g, " ").trim() : null;
    return async (first: number, after: string | null) =>
      (await this.client.query<{ products: ProductPage }>(QUERIES.products, { first, after, query, ...sort })).products;
  }

  private async listSummaries(options: {
    search: string;
    category: number | null;
    featured: boolean;
    onSale: boolean;
    orderby: OrderBy;
    page: number;
    perPage: number;
  }): Promise<{ items: SummaryNode[]; hasNext: boolean }> {
    const load = this.loader(options);
    if (!options.onSale) return this.page(load, options.page, options.perPage);
    // The Storefront API can't filter by sale price: filter the first 250.
    const all = (await load(PAGE_LIMIT, null))?.nodes ?? [];
    const sale = all.filter(
      (n) => Number(n.compareAtPriceRange.minVariantPrice.amount) > Number(n.priceRange.minVariantPrice.amount),
    );
    const start = (options.page - 1) * options.perPage;
    return { items: sale.slice(start, start + options.perPage), hasNext: sale.length > start + options.perPage };
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
      const data = await this.client.query<{ nodes: (SummaryNode | null)[] }>(QUERIES.productsByIds, {
        ids: ids.map((id) => gid("Product", id)),
      });
      const items = data.nodes.filter((n): n is SummaryNode => Boolean(n?.id)).map((n) => map.summary(n));
      return { status: 200, body: { page: 1, per_page: items.length || perPage, total: items.length, total_pages: 1, items } };
    }
    const orderParam = query.get("orderby") as OrderBy | null;
    const category = query.get("category") ? Number(query.get("category")) : null;
    if (category !== null && (!Number.isSafeInteger(category) || category < 1)) {
      return error(400, "invalid_request", "Unknown category.");
    }
    const result = await this.listSummaries({
      search: (query.get("search") ?? "").trim().slice(0, 100),
      category,
      featured: query.get("featured") === "true" || query.get("featured") === "1",
      onSale: query.get("on_sale") === "true" || query.get("on_sale") === "1",
      orderby: orderParam && ORDERS.includes(orderParam) ? orderParam : "newest",
      page,
      perPage,
    });
    // Shopify pages by cursor and doesn't count: the totals say whether there's a next page.
    const seen = (page - 1) * perPage + result.items.length;
    return {
      status: 200,
      body: {
        page,
        per_page: perPage,
        total: seen + (result.hasNext ? 1 : 0),
        total_pages: result.hasNext ? page + 1 : page,
        items: result.items.map((n) => map.summary(n)),
      },
    };
  }

  private async home() {
    const map = await this.mapper();
    const [categories, featured, newest, best] = await Promise.all([
      this.categories(),
      this.listSummaries({ search: "", category: null, featured: true, onSale: false, orderby: "newest", page: 1, perPage: 10 }),
      this.listSummaries({ search: "", category: null, featured: false, onSale: false, orderby: "newest", page: 1, perPage: 10 }),
      this.listSummaries({ search: "", category: null, featured: false, onSale: false, orderby: "popular", page: 1, perPage: 10 }),
    ]);
    const products = (type: string, nodes: SummaryNode[]) =>
      nodes.length > 0 ? [{ type, title: null, products: nodes.map((n) => map.summary(n)) }] : [];
    return [
      ...(categories.length > 0 ? [{ type: "categories", title: null, categories: categories.slice(0, 12) }] : []),
      ...products("featured_products", featured.items),
      ...products("new_products", newest.items),
      ...products("best_sellers", best.items),
    ];
  }

  private async product(id: number): Promise<ConnectorResult> {
    const map = await this.mapper();
    const data = await this.client.query<{ product: ProductNode | null; productRecommendations: SummaryNode[] | null }>(QUERIES.product, {
      id: gid("Product", id),
    });
    if (!data.product) return error(404, "not_found", "Product not found.");
    return { status: 200, body: map.detail(data.product, data.productRecommendations ?? []) };
  }

  // Orders

  /**
   * 19 The Shopify customers who are this customer: exactly their verified
   * phone number, or exactly the email address an email account signed in
   * with. Shopify matches searches loosely, so each match is compared here,
   * and an empty phone or email never matches.
   */
  private async customerIds(admin: ShopifyAdminClient, phone: string | null, email: string | null): Promise<Set<number>> {
    const find = async (query: string, same: (c: { phone?: string | null; email?: string | null }) => boolean) => {
      const found = await admin.query<{ customers: { nodes: { id: string; phone?: string | null; email?: string | null }[] } }>(ADMIN_QUERIES.customers, { query });
      return found.customers.nodes.filter(same).map((c) => numericId(c.id));
    };
    const [byPhone, byEmail] = await Promise.all([
      phone ? find(`phone:${JSON.stringify(phone)}`, (c) => e164Of(c.phone) === phone) : [],
      email ? find(`email:${JSON.stringify(email)}`, (c) => c.email?.trim().toLowerCase() === email) : [],
    ]);
    return new Set([...byPhone, ...byEmail]);
  }

  /**
   * 19 The customer's orders, newest first: those of their Shopify customers,
   * those placed with their exact email (email accounts), and those placed or
   * shipped with their exact phone number (Shopify often links an order to a
   * customer by email and leaves the customer's phone empty).
   */
  private async customerOrders(admin: ShopifyAdminClient, user: HostedUser): Promise<AdminOrder[]> {
    const phone = e164Of(user.phone);
    const email = verifiedEmail(user);
    if (!phone && !email) return [];
    const ids = await this.customerIds(admin, phone, email);
    const lookup = async (query: string, own: (order: AdminOrder) => boolean): Promise<AdminOrder[]> => {
      const data = await admin.query<{ orders: { nodes: AdminOrder[] } }>(ADMIN_QUERIES.orders, { query, first: ORDER_LOOKUP_LIMIT });
      return data.orders.nodes.filter(own);
    };
    const samePhone = (value: string | null | undefined) => phone !== null && e164Of(value) === phone;
    const lists = await Promise.all([
      ids.size > 0 ? lookup([...ids].map((id) => `customer_id:${id}`).join(" OR "), (o) => Boolean(o.customer && ids.has(numericId(o.customer.id)))) : [],
      email ? lookup(`email:${JSON.stringify(email)}`, (o) => o.email?.trim().toLowerCase() === email) : [],
      // Each order's own phones are compared here, so however loosely Shopify matches `phone`, nothing extra shows.
      phone ? lookup(`phone:${JSON.stringify(phone)}`, (o) => samePhone(o.phone) || samePhone(o.shippingAddress?.phone)) : [],
    ]);
    const byId = new Map<string, AdminOrder>();
    for (const order of lists.flat()) byId.set(order.id, order);
    return [...byId.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || numericId(b.id) - numericId(a.id));
  }

  private async orders(request: ConnectorRequest, admin: ShopifyAdminClient): Promise<ConnectorResult> {
    if (!request.user) return error(401, "invalid_token", "Your session has ended. Please sign in again.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const all = await this.customerOrders(admin, request.user);
    const map = await this.mapper();
    const items = all.slice((page - 1) * perPage, page * perPage).map((order) => {
      const status = orderStatus(order);
      return {
        id: numericId(order.id),
        number: order.name.replace(/^#/, ""),
        status,
        status_label: ORDER_LABELS[status]!,
        total: map.money(order.currentTotalPriceSet.shopMoney.amount),
        created_at: new Date(order.createdAt).toISOString(),
        items: order.lineItems.nodes.map((line) => ({
          name: line.name,
          course_id: null,
          product_id: line.product ? numericId(line.product.id) : null,
          quantity: Math.max(1, line.quantity),
          image_url: line.image?.url ?? null,
        })),
        // 91.2 How it was shipped, with its tracking.
        shipment: shopifyShipment(order),
      };
    });
    return {
      status: 200,
      body: { page, per_page: perPage, total: all.length, total_pages: Math.max(1, Math.ceil(all.length / perPage)), items },
    };
  }

  // Cart and checkout

  private async priced(lines: CartLineInput[], map: Mapper) {
    // Lines without a variation are simple products: their only variant.
    const simple = [...new Set(lines.filter((l) => l.variation_id === null).map((l) => l.product_id))];
    const firstVariant = new Map<number, number | null>();
    if (simple.length > 0) {
      const data = await this.client.query<{ nodes: ({ id: string; variants: { nodes: { id: string }[] } } | null)[] }>(
        QUERIES.productFirstVariants,
        { ids: simple.map((id) => gid("Product", id)) },
      );
      for (const node of data.nodes) {
        if (node?.id) firstVariant.set(numericId(node.id), node.variants.nodes.length === 1 ? numericId(node.variants.nodes[0]!.id) : null);
      }
    }
    const variantIds = [
      ...new Set(lines.map((l) => l.variation_id ?? firstVariant.get(l.product_id) ?? null).filter((v): v is number => v !== null)),
    ];
    const variants = new Map<number, {
      id: string;
      title: string;
      availableForSale: boolean;
      quantityAvailable: number | null;
      requiresShipping: boolean;
      price: Money;
      image: { url: string } | null;
      product: { id: string; title: string; featuredImage: { url: string } | null };
    }>();
    if (variantIds.length > 0) {
      const data = await this.client.query<{ nodes: ({ id: string } & Record<string, unknown> | null)[] }>(QUERIES.variants, {
        ids: variantIds.map((id) => gid("ProductVariant", id)),
      });
      for (const node of data.nodes) if (node?.id) variants.set(numericId(node.id), node as never);
    }
    let currency = (await this.shop()).paymentSettings.currencyCode;
    let subtotal = 0;
    let count = 0;
    const out = lines.map((line) => {
      const variantId = line.variation_id ?? firstVariant.get(line.product_id) ?? null;
      const variant = variantId !== null ? variants.get(variantId) : undefined;
      if (!variant || numericId(variant.product.id) !== line.product_id) {
        return {
          product_id: line.product_id,
          variation_id: line.variation_id,
          quantity: line.quantity,
          name: "Unavailable product",
          image_url: null,
          unit_price: map.money("0"),
          line_total: map.money("0"),
          available: false,
          problem: "This product is no longer available.",
          max_quantity: null,
          digital: false,
        };
      }
      currency = variant.price.currencyCode;
      const max = variant.quantityAvailable !== null && variant.quantityAvailable > 0 ? variant.quantityAvailable : null;
      const quantity = max !== null ? Math.min(line.quantity, max) : line.quantity;
      const available = variant.availableForSale;
      const total = Number(variant.price.amount) * quantity;
      if (available) {
        subtotal += total;
        count += quantity;
      }
      const name = variant.title && variant.title !== "Default Title" ? `${variant.product.title} - ${variant.title}` : variant.product.title;
      return {
        product_id: line.product_id,
        variation_id: line.variation_id,
        quantity,
        name,
        image_url: variant.image?.url ?? variant.product.featuredImage?.url ?? null,
        unit_price: map.money(variant.price.amount),
        line_total: map.money(String(total)),
        available,
        problem: !available
          ? "Out of stock."
          : quantity < line.quantity
            ? `Only ${quantity} left in stock.`
            : null,
        max_quantity: max,
        digital: !variant.requiresShipping,
      };
    });
    const merchandise = lines.map((line) => {
      const variantId = line.variation_id ?? firstVariant.get(line.product_id) ?? null;
      return variantId !== null ? (variants.get(variantId)?.id ?? null) : null;
    });
    return {
      merchandise,
      cart: {
        lines: out,
        item_count: count,
        subtotal: map.money(String(subtotal)),
        subtotal_amount: subtotal.toFixed(2),
        currency,
      },
    };
  }

  private async quote(request: ConnectorRequest): Promise<ConnectorResult> {
    const lines = cartLines(request.body);
    if (!lines) return error(400, "invalid_request", "The cart is empty or invalid.");
    const map = await this.mapper();
    return { status: 200, body: withCheckoutTotals((await this.priced(lines, map)).cart, request.body, true) };
  }

  private async checkoutLink(request: ConnectorRequest): Promise<ConnectorResult> {
    const platform = request.query.get("platform");
    if (platform !== "android" && platform !== "ios") return error(400, "invalid_request", "Unknown platform.");
    const lines = cartLines(request.body);
    if (!lines) return error(400, "invalid_request", "The cart is empty or invalid.");
    const map = await this.mapper();
    const priced = await this.priced(lines, map);
    const pricedLines = priced.cart.lines;
    if (pricedLines.some((l) => !l.available || l.problem)) {
      return error(409, "cart_changed", "Something in your cart changed. Please check it and try again.");
    }
    if (platform === "ios" && pricedLines.some((l) => l.digital)) {
      return error(403, "purchase_not_allowed", "Digital products can't be bought in the iPhone app.");
    }
    const user = request.user;
    const rawCoupon = (request.body as { coupon?: unknown } | null)?.coupon;
    const coupon = typeof rawCoupon === "string" ? rawCoupon.trim().slice(0, 50) : "";
    const buyerIdentity: Record<string, string> = {};
    if (user) {
      if (user.phone) buyerIdentity.phone = user.phone;
      if (user.email) buyerIdentity.email = user.email;
    }
    const data = await this.client.query<{
      cartCreate: { cart: { checkoutUrl: string } | null; userErrors: { message: string }[] };
    }>(QUERIES.cartCreate, {
      input: {
        lines: pricedLines.map((l, i) => ({ merchandiseId: priced.merchandise[i]!, quantity: l.quantity })),
        ...(user ? { buyerIdentity } : {}),
        // 91.1 The customer's coupon: Shopify's checkout applies it, or says why it can't.
        ...(coupon ? { discountCodes: [coupon] } : {}),
      },
    });
    const url = data.cartCreate.cart?.checkoutUrl;
    if (!url) return error(409, "cart_changed", data.cartCreate.userErrors[0]?.message ?? "The shop couldn't start the checkout.");
    return {
      status: 200,
      body: {
        url,
        expires_at: new Date(request.now.getTime() + CHECKOUT_LINK_MINUTES * 60_000).toISOString(),
        open_in: "in_app",
      },
    };
  }
}

/** Clears the shop and collection cache (tests). */
export function clearShopifyCache(): void {
  cache.clear();
}
