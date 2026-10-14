import { beforeEach, describe, expect, it } from "vitest";
import {
  clearShopifyCache,
  formatMoney,
  normalizeShopDomain,
  orderStatus,
  SHOPIFY_API_VERSION,
  ShopifyConnector,
} from "@/lib/hosted/connectors/shopify";
import type { ConnectorRequest } from "@/lib/hosted/connectors/types";
import type { HostedUser } from "@/lib/data/types";
import { expectContract } from "./contract";

// A shop answering the Storefront API the way Shopify does, for the queries the connector sends.
const money = (amount: string) => ({ amount, currencyCode: "TRY" });
const range = (min: string, max = min) => ({ minVariantPrice: money(min), maxVariantPrice: money(max) });
const variant = (id: number, title: string, price: string, extra: Record<string, unknown> = {}) => ({
  id: `gid://shopify/ProductVariant/${id}`,
  title,
  availableForSale: true,
  currentlyNotInStock: false,
  quantityAvailable: 10,
  requiresShipping: true,
  sku: `SKU-${id}`,
  price: money(price),
  compareAtPrice: null,
  image: null,
  selectedOptions: [],
  ...extra,
});

const PRODUCTS = [
  {
    id: "gid://shopify/Product/101",
    title: "Red Roses",
    handle: "red-roses",
    availableForSale: true,
    featuredImage: { url: "https://cdn.shopify.com/roses.jpg" },
    priceRange: range("400.0", "550.0"),
    compareAtPriceRange: range("600.0"),
    options: [{ name: "Size", optionValues: [{ name: "Small" }, { name: "Large" }] }],
    descriptionHtml: "<p>Fresh red roses.</p>",
    onlineStoreUrl: null,
    images: { nodes: [{ url: "https://cdn.shopify.com/roses.jpg", altText: "Roses" }] },
    collections: { nodes: [{ id: "gid://shopify/Collection/201", title: "Bouquets", image: null }] },
    variants: {
      nodes: [
        variant(1001, "Small", "400.0", { selectedOptions: [{ name: "Size", value: "Small" }] }),
        variant(1002, "Large", "550.0", {
          compareAtPrice: money("600.0"),
          quantityAvailable: 3,
          selectedOptions: [{ name: "Size", value: "Large" }],
        }),
      ],
    },
  },
  {
    id: "gid://shopify/Product/102",
    title: "Gift Card",
    handle: "gift-card",
    availableForSale: true,
    featuredImage: null,
    priceRange: range("100.0"),
    compareAtPriceRange: range("0.0"),
    options: [{ name: "Title", optionValues: [{ name: "Default Title" }] }],
    descriptionHtml: "",
    onlineStoreUrl: "https://rose.example/products/gift-card",
    images: { nodes: [] },
    collections: { nodes: [] },
    variants: { nodes: [variant(1003, "Default Title", "100.0", { requiresShipping: false, quantityAvailable: null })] },
  },
  {
    id: "gid://shopify/Product/103",
    title: "Glass Vase",
    handle: "glass-vase",
    availableForSale: false,
    featuredImage: null,
    priceRange: range("250.0"),
    compareAtPriceRange: range("0.0"),
    options: [{ name: "Title", optionValues: [{ name: "Default Title" }] }],
    descriptionHtml: "",
    onlineStoreUrl: null,
    images: { nodes: [] },
    collections: { nodes: [] },
    variants: { nodes: [variant(1004, "Default Title", "250.0", { availableForSale: false, quantityAvailable: 0 })] },
  },
];

const summary = (p: (typeof PRODUCTS)[number]) => ({
  ...p,
  variants: { nodes: [{ requiresShipping: p.variants.nodes[0]!.requiresShipping }] },
});
const variants = PRODUCTS.flatMap((p) =>
  p.variants.nodes.map((v) => ({ ...v, product: { id: p.id, title: p.title, featuredImage: p.featuredImage } })),
);

function page(nodes: unknown[], first: number, after: string | null) {
  const start = after ? Number(after) : 0;
  const slice = nodes.slice(start, start + first);
  return { nodes: slice, pageInfo: { hasNextPage: start + first < nodes.length, endCursor: String(start + first) } };
}

interface Call {
  query: string;
  variables: Record<string, unknown>;
}

function fakeShop(options: { down?: boolean } = {}) {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    if (url.includes("/admin/api/")) return admin(url, init, calls);
    expect(url).toBe(`https://rose.myshopify.com/api/${SHOPIFY_API_VERSION}/graphql.json`);
    expect(new Headers(init.headers).get("x-shopify-storefront-access-token")).toBe("storefront-token");
    if (options.down) return new Response("", { status: 503 });
    const { query, variables } = JSON.parse(String(init.body)) as Call;
    calls.push({ query, variables });
    const v = variables as { ids: string[]; id?: string; handle?: string; first: number; after: string | null; query?: string };
    let data: unknown;
    if (query.includes("cartCreate")) {
      data = { cartCreate: { cart: { checkoutUrl: "https://rose.myshopify.com/cart/c/abc?key=1" }, userErrors: [] } };
    } else if (query.includes("shop {")) {
      data = {
        shop: {
          name: "Rose Shop",
          moneyFormat: "<span>{{amount_with_comma_separator}} TL</span>",
          paymentSettings: { currencyCode: "TRY" },
          primaryDomain: { url: "https://rose.example" },
        },
      };
    } else if (query.includes("collections(first: 50")) {
      data = {
        collections: {
          nodes: [
            { id: "gid://shopify/Collection/201", title: "Bouquets", image: null, products: { nodes: [{ id: PRODUCTS[0]!.id }] } },
            { id: "gid://shopify/Collection/202", title: "Empty", image: null, products: { nodes: [] } },
          ],
        },
      };
    } else if (query.includes("productRecommendations")) {
      const product = PRODUCTS.find((p) => p.id === v.id) ?? null;
      data = { product, productRecommendations: product ? [summary(PRODUCTS[1]!)] : null };
    } else if (query.includes("... on ProductVariant")) {
      data = { nodes: v.ids.map((id) => variants.find((x) => x.id === id) ?? null) };
    } else if (query.includes("variants(first: 2)")) {
      data = {
        nodes: v.ids.map((id) => {
          const p = PRODUCTS.find((x) => x.id === id);
          return p ? { id: p.id, variants: { nodes: p.variants.nodes.slice(0, 2).map((x) => ({ id: x.id })) } } : null;
        }),
      };
    } else if (query.includes("nodes(ids: $ids)")) {
      data = { nodes: v.ids.map((id) => (PRODUCTS.find((p) => p.id === id) ? summary(PRODUCTS.find((p) => p.id === id)!) : null)) };
    } else if (query.includes("collection(id: $id, handle: $handle)")) {
      const inCollection = v.handle === "frontpage" ? [PRODUCTS[0]!] : v.id === "gid://shopify/Collection/201" ? [PRODUCTS[0]!] : [];
      data = { collection: v.id === "gid://shopify/Collection/999" ? null : { products: page(inCollection.map(summary), v.first, v.after) } };
    } else if (query.includes("products(first: $first")) {
      const list = v.query ? PRODUCTS.filter((p) => p.title.toLowerCase().includes(String(v.query).toLowerCase())) : PRODUCTS;
      data = { products: page(list.map(summary), v.first, v.after) };
    } else {
      throw new Error(`Unexpected query: ${query}`);
    }
    return Response.json({ data });
  }) as unknown as typeof fetch;
  return { fetcher, calls };
}

// Orders of two customers; Sara's phone also loosely matches another customer's.
const ORDERS = [
  {
    id: "gid://shopify/Order/5003",
    customer: 1,
    name: "#1003",
    createdAt: "2026-10-12T09:00:00Z",
    cancelledAt: null,
    displayFinancialStatus: "PAID",
    displayFulfillmentStatus: "UNFULFILLED",
    currentTotalPriceSet: { shopMoney: money("950.0") },
    lineItems: { nodes: [{ name: "Red Roses - Large", quantity: 1, image: { url: "https://cdn.shopify.com/roses.jpg" }, product: { id: "gid://shopify/Product/101" } }] },
  },
  {
    id: "gid://shopify/Order/5002",
    customer: 2,
    name: "#1002",
    createdAt: "2026-10-11T09:00:00Z",
    cancelledAt: null,
    displayFinancialStatus: "PAID",
    displayFulfillmentStatus: "FULFILLED",
    currentTotalPriceSet: { shopMoney: money("100.0") },
    lineItems: { nodes: [{ name: "Gift Card", quantity: 1, image: null, product: null }] },
  },
  {
    id: "gid://shopify/Order/5001",
    customer: 1,
    name: "#1001",
    createdAt: "2026-10-01T09:00:00Z",
    cancelledAt: "2026-10-02T09:00:00Z",
    displayFinancialStatus: "VOIDED",
    displayFulfillmentStatus: "UNFULFILLED",
    currentTotalPriceSet: { shopMoney: money("400.0") },
    lineItems: { nodes: [{ name: "Red Roses - Small", quantity: 2, image: null, product: { id: "gid://shopify/Product/101" } }] },
  },
];

function admin(url: string, init: RequestInit, calls: Call[]): Response {
  expect(url).toBe(`https://rose.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/graphql.json`);
  if (new Headers(init.headers).get("x-shopify-access-token") !== "admin-token") return new Response("", { status: 401 });
  const { query, variables } = JSON.parse(String(init.body)) as Call;
  calls.push({ query, variables });
  const v = variables as { query: string; first: number; after: string | null };
  if (query.includes("shop {")) return Response.json({ data: { shop: { name: "Rose Shop" } } });
  if (query.includes("customers(")) {
    expect(v.query).toBe('phone:"+905321234567"');
    return Response.json({
      data: {
        customers: {
          nodes: [
            { id: "gid://shopify/Customer/1", phone: "+905321234567" },
            { id: "gid://shopify/Customer/3", phone: "+9053212345670" },
          ],
        },
      },
    });
  }
  if (query.includes("orders(")) {
    const ids = [...v.query.matchAll(/customer_id:(\d+)/g)].map((m) => Number(m[1]));
    const list = ORDERS.filter((o) => ids.includes(o.customer));
    return Response.json({ data: { orders: page(list, v.first, v.after) } });
  }
  throw new Error(`Unexpected admin query: ${query}`);
}

const NOW = new Date("2026-10-13T10:00:00Z");
const customer: HostedUser = {
  id: 7,
  appId: "app-1",
  phone: "+905321234567",
  name: "Sara",
  email: "sara@example.com",
  city: null,
  notificationsReadAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

describe("Shopify connector", () => {
  let shop: ReturnType<typeof fakeShop>;
  let connector: ShopifyConnector;

  beforeEach(() => {
    clearShopifyCache();
    shop = fakeShop();
    connector = new ShopifyConnector({ shopDomain: "rose.myshopify.com", storefrontToken: "storefront-token" }, shop.fetcher);
  });

  async function call(
    method: string,
    route: string,
    options: { query?: Record<string, string>; body?: unknown; user?: HostedUser | null; params?: string[] } = {},
  ) {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const request: ConnectorRequest = {
      method,
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      user: options.user ?? null,
      now: NOW,
    };
    const result = await connector.handle(request);
    expect(result, `${method} ${concrete} is answered`).not.toBeNull();
    expectContract(method, route, result!);
    return result!;
  }

  it("adds the shop's store settings to the config", async () => {
    expect(await connector.config()).toMatchObject({
      store: { currency: "TRY", guest_checkout: true, reviews: false, delivery_date: { enabled: false } },
      features: { orders: false },
    });
    expect(await connector.check()).toBe("Rose Shop");
  });

  it("lists collections with products as categories", async () => {
    const result = await call("GET", "/store/categories");
    expect(result.body).toEqual({ items: [{ id: 201, name: "Bouquets", count: 1, parent_id: null, image_url: null }] });
  });

  it("maps products, prices and stock", async () => {
    const result = await call("GET", "/store/products", { query: { per_page: "20" } });
    const body = result.body as { items: Record<string, unknown>[]; total_pages: number };
    expect(body.total_pages).toBe(1);
    expect(body.items).toHaveLength(3);
    expect(body.items[0]).toMatchObject({
      id: 101,
      type: "variable",
      price: { amount: "400.00", formatted: "400,00 TL – 550,00 TL", range: true, on_sale: true, regular_amount: "600.00" },
      digital: false,
      stock_status: "in_stock",
    });
    expect(body.items[1]).toMatchObject({ id: 102, type: "simple", digital: true, price: { formatted: "100,00 TL", on_sale: false } });
    expect(body.items[2]).toMatchObject({ id: 103, stock_status: "out_of_stock", purchasable: false });
    expect(shop.calls.at(-1)!.variables).toMatchObject({ sortKey: "CREATED_AT", reverse: true });
  });

  it("pages with cursors, searches, filters and sorts", async () => {
    const second = await call("GET", "/store/products", { query: { page: "2", per_page: "2" } });
    expect(second.body).toMatchObject({ page: 2, total_pages: 2, items: [{ id: 103 }] });
    expect(shop.calls.map((c) => c.variables.after)).toEqual(expect.arrayContaining([null, "2"]));

    const search = await call("GET", "/store/products", { query: { search: "roses" } });
    expect((search.body as { items: unknown[] }).items).toHaveLength(1);
    expect(shop.calls.at(-1)!.variables).toMatchObject({ query: "roses", sortKey: "RELEVANCE" });

    await call("GET", "/store/products", { query: { category: "201", orderby: "price_desc" } });
    expect(shop.calls.at(-1)!.variables).toMatchObject({ id: "gid://shopify/Collection/201", sortKey: "PRICE", reverse: true });

    const sale = await call("GET", "/store/products", { query: { on_sale: "true" } });
    expect((sale.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([101]);

    const ids = await call("GET", "/store/products", { query: { ids: "103,101" } });
    expect((ids.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([103, 101]);

    const missing = await call("GET", "/store/products", { query: { category: "999" } });
    expect((missing.body as { items: unknown[] }).items).toEqual([]);
  });

  it("builds the home screen", async () => {
    const result = await call("GET", "/store/home");
    const types = (result.body as { sections: { type: string }[] }).sections.map((s) => s.type);
    expect(types).toEqual(["categories", "featured_products", "new_products", "best_sellers"]);
  });

  it("shows a product with its options and variations", async () => {
    const result = await call("GET", "/store/products/{product_id}", { params: ["101"] });
    expect(result.body).toMatchObject({
      id: 101,
      attributes: [{ slug: "size", name: "Size", variation: true, options: [{ value: "Small" }, { value: "Large" }] }],
      variations: [
        { id: 1001, attributes: { size: "Small" }, price: { formatted: "400,00 TL" }, max_quantity: 10 },
        { id: 1002, attributes: { size: "Large" }, price: { on_sale: true, regular_formatted: "600,00 TL" }, max_quantity: 3 },
      ],
      categories: [{ id: 201, name: "Bouquets" }],
      related: [{ id: 102 }],
      permalink: "https://rose.example/products/red-roses",
    });
    const simple = await call("GET", "/store/products/{product_id}", { params: ["102"] });
    expect(simple.body).toMatchObject({ type: "simple", attributes: [], variations: [], sku: "SKU-1003", permalink: "https://rose.example/products/gift-card" });
    expect((await call("GET", "/store/products/{product_id}", { params: ["999"] })).status).toBe(404);
    expect((await call("GET", "/store/products/{product_id}/reviews", { params: ["101"] })).body).toMatchObject({ code: "feature_disabled" });
  });

  it("prices the cart from the shop", async () => {
    const result = await call("POST", "/store/cart", {
      query: { platform: "android" },
      body: {
        lines: [
          { product_id: 101, variation_id: 1002, quantity: 5 },
          { product_id: 102, quantity: 1 },
          { product_id: 103, quantity: 1 },
        ],
      },
    });
    expect(result.body).toMatchObject({
      item_count: 4,
      subtotal: "1.750,00 TL",
      subtotal_amount: "1750.00",
      currency: "TRY",
      lines: [
        { name: "Red Roses - Large", quantity: 3, available: true, problem: "Only 3 left in stock.", unit_price: "550,00 TL", line_total: "1.650,00 TL" },
        { name: "Gift Card", digital: true, available: true, problem: null },
        { name: "Glass Vase", available: false, problem: "Out of stock." },
      ],
    });
    expect((await call("POST", "/store/cart", { body: { lines: [] } })).status).toBe(400);
  });

  it("opens Shopify's checkout for an available cart", async () => {
    const changed = await call("POST", "/store/checkout-link", {
      query: { platform: "android" },
      body: { lines: [{ product_id: 103, quantity: 1 }] },
    });
    expect(changed.body).toMatchObject({ code: "cart_changed" });

    const ios = await call("POST", "/store/checkout-link", {
      query: { platform: "ios" },
      body: { lines: [{ product_id: 102, quantity: 1 }] },
    });
    expect(ios).toMatchObject({ status: 403, body: { code: "purchase_not_allowed" } });

    const link = await call("POST", "/store/checkout-link", {
      query: { platform: "ios" },
      body: { lines: [{ product_id: 101, variation_id: 1001, quantity: 2 }] },
      user: customer,
    });
    expect(link.body).toMatchObject({ url: "https://rose.myshopify.com/cart/c/abc?key=1", open_in: "in_app", expires_at: "2026-10-13T10:05:00.000Z" });
    expect(shop.calls.at(-1)!.variables).toEqual({
      input: {
        lines: [{ merchandiseId: "gid://shopify/ProductVariant/1001", quantity: 2 }],
        buyerIdentity: { phone: "+905321234567", email: "sara@example.com" },
      },
    });
  });

  it("says when the shop can't be reached", async () => {
    const down = new ShopifyConnector({ shopDomain: "rose.myshopify.com", storefrontToken: "storefront-token" }, fakeShop({ down: true }).fetcher);
    const result = await down.handle({ method: "GET", path: ["store", "products"], query: new URLSearchParams(), body: undefined, user: null, now: NOW });
    expect(result).toMatchObject({ status: 503, body: { code: "shop_unavailable" } });
    expectContract("GET", "/store/products", result!);
  });

  it("lists the signed-in customer's orders with the Admin API token", async () => {
    const withAdmin = new ShopifyConnector(
      { shopDomain: "rose.myshopify.com", storefrontToken: "storefront-token", adminToken: "admin-token" },
      shop.fetcher,
    );
    expect(await withAdmin.config()).toMatchObject({ features: { orders: true } });
    await withAdmin.checkAdmin();
    const request = (query: Record<string, string>, user: HostedUser | null): ConnectorRequest => ({
      method: "GET",
      path: ["me", "orders"],
      query: new URLSearchParams(query),
      body: undefined,
      user,
      now: NOW,
    });
    const first = await withAdmin.handle(request({ per_page: "1" }, customer));
    expectContract("GET", "/me/orders", first!);
    expect(first!.body).toMatchObject({
      page: 1,
      total_pages: 2,
      items: [
        {
          id: 5003,
          number: "1003",
          status: "processing",
          status_label: "Processing",
          total: "950,00 TL",
          items: [{ name: "Red Roses - Large", product_id: 101, quantity: 1, image_url: "https://cdn.shopify.com/roses.jpg" }],
        },
      ],
    });
    const second = await withAdmin.handle(request({ per_page: "1", page: "2" }, customer));
    expect(second!.body).toMatchObject({ page: 2, total_pages: 2, total: 2, items: [{ number: "1001", status: "cancelled" }] });
    expect((await withAdmin.handle(request({}, null)))!.status).toBe(401);

    const wrong = new ShopifyConnector({ shopDomain: "rose.myshopify.com", storefrontToken: "storefront-token", adminToken: "nope" }, shop.fetcher);
    await expect(wrong.checkAdmin()).rejects.toThrow();
  });

  it("leaves other endpoints to the hosted API", async () => {
    expect(await connector.handle({ method: "GET", path: ["me", "orders"], query: new URLSearchParams(), body: undefined, user: null, now: NOW })).toBeNull();
  });
});

describe("Shopify helpers", () => {
  it("map order statuses", () => {
    const order = (financial: string | null, fulfillment: string, cancelled: string | null = null) =>
      orderStatus({ displayFinancialStatus: financial, displayFulfillmentStatus: fulfillment, cancelledAt: cancelled });
    expect(order("PAID", "FULFILLED")).toBe("completed");
    expect(order("PARTIALLY_REFUNDED", "UNFULFILLED")).toBe("processing");
    expect(order("PENDING", "UNFULFILLED")).toBe("pending");
    expect(order("REFUNDED", "FULFILLED")).toBe("refunded");
    expect(order("PAID", "UNFULFILLED", "2026-10-01T00:00:00Z")).toBe("cancelled");
  });

  it("normalize shop addresses", () => {
    expect(normalizeShopDomain("https://Rose.myshopify.com/admin")).toBe("rose.myshopify.com");
    expect(normalizeShopDomain("rose")).toBe("rose.myshopify.com");
    expect(normalizeShopDomain("rose.example")).toBeNull();
  });

  it("format money like the shop", () => {
    expect(formatMoney("${{amount}}", "1234.5")).toBe("$1,234.50");
    expect(formatMoney("{{amount_with_comma_separator}} TL", "1234.5")).toBe("1.234,50 TL");
    expect(formatMoney("<span class=money>€{{amount_no_decimals}}</span>", "99.6")).toBe("€100");
  });
});
