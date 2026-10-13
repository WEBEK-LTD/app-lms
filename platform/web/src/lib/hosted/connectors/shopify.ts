import { ConnectorError, type Connector, type ConnectorRequest, type ConnectorResult } from "./types";

/**
 * Shopify for Store apps: catalog, cart pricing and checkout through the
 * Storefront API (GraphQL), with the shop's public Storefront access token.
 * Products, variants and collections keep Shopify's numeric IDs (the tail of
 * their GIDs), so the app's integer IDs map back without a lookup table.
 * Orders and reviews aren't available through the Storefront API: the
 * connector reports `features.orders` and `store.reviews` as false.
 */

export const SHOPIFY_API_VERSION = "2025-07";
const PAGE_LIMIT = 250;
const CACHE_MS = 5 * 60_000;
const CHECKOUT_LINK_MINUTES = 5;
/** The collection Shopify creates for the online store's home page. */
const FEATURED_HANDLE = "frontpage";

type Fetch = typeof fetch;

export interface ShopifySettings {
  /** "your-shop.myshopify.com". */
  shopDomain: string;
  storefrontToken: string;
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
      throw new ConnectorError("Shopify didn't answer.");
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
  productFirstVariants: `query($ids: [ID!]!) {
    nodes(ids: $ids) { ... on Product { id variants(first: 2) { nodes { id } } } }
  }`,
  cartCreate: `mutation($input: CartInput!) {
    cartCreate(input: $input) { cart { checkoutUrl } userErrors { message } }
  }`,
};

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

function intParam(query: URLSearchParams, name: string, fallback: number, max: number): number {
  const value = Number.parseInt(query.get(name) ?? "", 10);
  return Number.isFinite(value) && value >= 1 ? Math.min(value, max) : fallback;
}

const error = (status: number, code: string, message: string): ConnectorResult => ({ status, body: { code, message } });

interface CartLineInput {
  product_id: number;
  variation_id: number | null;
  quantity: number;
}

function cartLines(body: unknown): CartLineInput[] | null {
  const lines = (body as { lines?: unknown })?.lines;
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > 100) return null;
  const out: CartLineInput[] = [];
  for (const raw of lines) {
    const line = raw as Record<string, unknown>;
    const productId = Number(line?.product_id);
    const variationId = line?.variation_id === null || line?.variation_id === undefined ? null : Number(line.variation_id);
    const quantity = Number(line?.quantity);
    if (!Number.isSafeInteger(productId) || productId < 1) return null;
    if (variationId !== null && (!Number.isSafeInteger(variationId) || variationId < 1)) return null;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) return null;
    out.push({ product_id: productId, variation_id: variationId, quantity });
  }
  return out;
}

const cache = new Map<string, { at: number; value: unknown }>();

export class ShopifyConnector implements Connector {
  private readonly client: ShopifyClient;

  constructor(
    private readonly settings: ShopifySettings,
    fetcher: Fetch = fetch,
    private readonly cacheKey = settings.shopDomain,
  ) {
    this.client = new ShopifyClient(settings, fetcher);
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

  /** Checks the domain and token; returns the shop's name. */
  async check(): Promise<string> {
    return (await this.client.query<{ shop: Shop }>(QUERIES.shop)).shop.name;
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
      features: { orders: false },
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
    return { status: 200, body: (await this.priced(lines, map)).cart };
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
    const buyerIdentity: Record<string, string> = {};
    if (user) {
      buyerIdentity.phone = user.phone;
      if (user.email) buyerIdentity.email = user.email;
    }
    const data = await this.client.query<{
      cartCreate: { cart: { checkoutUrl: string } | null; userErrors: { message: string }[] };
    }>(QUERIES.cartCreate, {
      input: {
        lines: pricedLines.map((l, i) => ({ merchandiseId: priced.merchandise[i]!, quantity: l.quantity })),
        ...(user ? { buyerIdentity } : {}),
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
