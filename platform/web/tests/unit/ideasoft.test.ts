import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as oauthGet, POST as oauthPost } from "@/app/oauth/ideasoft/route";
import {
  clearIdeasoftCache,
  currencyCode,
  formatIdeasoftMoney,
  IDEASOFT_PLATFORM,
  IDEASOFT_REDIRECT_URI,
  ideasoftOrderStatus,
  ideasoftPrice,
  normalizeIdeasoftHost,
  phoneDigits,
  type IdeaCategory,
  type IdeaOrder,
  type IdeaProduct,
} from "@/lib/hosted/connectors/ideasoft";
import { platformDefinition, type PlatformConnector } from "@/lib/hosted/connectors/platforms";
import type { ConnectorRequest } from "@/lib/hosted/connectors/types";
import type { HostedUser } from "@/lib/data/types";
import { expectContract } from "./contract";

// A store answering the Admin API and OAuth endpoints the way IdeaSoft documents them.
const HOST = "rose.myideasoft.com";
const TL = { id: 1, abbr: "TL" };
const USD = { id: 2, abbr: "USD" };

const CATEGORIES: IdeaCategory[] = [
  { id: 10, name: "Flowers", sortOrder: 2, status: 1, parent: null, imageUrl: "//cdn.myideasoft.com/cat/flowers.jpg" },
  { id: 11, name: "Roses", sortOrder: 1, status: 1, parent: { id: 10 }, imageUrl: null },
  { id: 12, name: "Hidden", sortOrder: 1, status: 0, parent: null },
  { id: 13, name: "Vases", sortOrder: 1, status: 1, parent: null },
];

const base = { status: 1, currency: TL, discount: 0, discountType: 1, taxIncluded: 1, tax: 20, stockAmount: 5, hasOption: 0 };
const PRODUCTS: IdeaProduct[] = [
  {
    ...base,
    id: 101,
    name: "Red Roses",
    slug: "red-roses",
    sku: "ROSE",
    price1: 400,
    discount: 10,
    hasOption: 1,
    categories: [{ id: 11, name: "Roses" }],
    images: [
      { id: 2, sortOrder: 2, originalUrl: `https://${HOST}/myassets/products/001/b.jpg`, thumbUrl: `https://${HOST}/myassets/products/001/b_min.jpg` },
      { id: 1, sortOrder: 1, filename: "a", extension: "JPG", directoryName: "001", revision: 3 },
    ],
    detail: { details: "<p>Fresh red roses.</p>" },
    children: [
      {
        ...base,
        id: 1001,
        name: "Small",
        fullName: "Red Roses Small",
        price1: 400,
        discount: 10,
        stockAmount: 3,
        parent: { id: 101 },
        optionGroups: [{ id: 1, title: "Size", options: [{ id: 1, title: "Small" }] }],
      },
      {
        ...base,
        id: 1002,
        name: "Large",
        fullName: "Red Roses Large",
        price1: 500,
        stockAmount: 0,
        parent: { id: 101 },
        optionGroups: [{ id: 1, title: "Size", options: [{ id: 2, title: "Large" }] }],
      },
    ],
  },
  { ...base, id: 102, name: "Glass Vase", slug: "glass-vase", price1: 250, discount: 50, discountType: 0, taxIncluded: 0, stockAmount: 10, categories: [{ id: 13, name: "Vases" }] },
  { ...base, id: 103, name: "Gift Box", slug: "gift-box", price1: 10, currency: USD, stockAmount: 0, categories: [{ id: 10, name: "Flowers" }] },
  { ...base, id: 104, name: "Tulips", slug: "tulips", canonicalUrl: "https://rose.example/tulips", price1: 150, hasOption: 1, stockAmount: 4, categories: [{ id: 10, name: "Flowers" }] },
  { ...base, id: 105, name: "Old Stock", slug: "old", price1: 10, status: 0 },
];
const VARIANTS: IdeaProduct[] = [
  ...PRODUCTS[0]!.children!,
  { ...base, id: 1041, name: "Tulips", fullName: "Tulips Yellow", price1: 150, stockAmount: 2, parent: { id: 104 } },
  { ...base, id: 1042, name: "Tulips", fullName: "Tulips Pink", price1: 180, stockAmount: 2, parent: { id: 104 } },
];
const ALL = [...PRODUCTS, ...VARIANTS];

const ORDERS: (IdeaOrder & { member?: { id: number; mobilePhoneNumber: string } | null })[] = [
  {
    id: 505,
    transactionId: "IDS-505",
    status: "fulfilled",
    currency: "TL",
    finalAmount: 240,
    shippingMobilePhoneNumber: "0555 000 00 00",
    member: { id: 77, mobilePhoneNumber: "05321234567" },
    createdAt: "2026-10-12T12:00:00+0300",
    orderItems: [{ productName: "Glass Vase", productQuantity: 1, product: { id: 102 } }],
  },
  { id: 504, transactionId: "IDS-504", status: "cancelled", currency: "TL", finalAmount: 0, shippingMobilePhoneNumber: "+905321234567", createdAt: "2026-10-10T09:00:00+0300", orderItems: [] },
  { id: 503, transactionId: null, status: "waiting_for_payment", paymentStatus: "failed", currency: "TL", generalAmount: "100.00", shippingMobilePhoneNumber: "5321234567", createdAt: "2026-10-09T09:00:00+0300" },
  { id: 502, transactionId: "IDS-502", status: "delivered", currency: "TL", finalAmount: 50, shippingMobilePhoneNumber: "0532 999 99 99", createdAt: "2026-10-08T09:00:00+0300", orderItems: [] },
  {
    id: 501,
    transactionId: "IDS-501",
    status: "being_prepared",
    currency: "TL",
    finalAmount: 960.5,
    shippingMobilePhoneNumber: "0532 123 45 67",
    createdAt: "2026-10-01T09:00:00+0300",
    orderItems: [{ productName: "Red Roses - Small", productQuantity: 2, product: { id: 1001 } }],
  },
];
const MEMBERS = [
  { id: 77, mobilePhoneNumber: "05321234567" },
  { id: 78, mobilePhoneNumber: "05329999999" },
];

interface Call {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
}

function fakeStore(options: { down?: boolean; quickCarts?: "ok" | "forbidden"; members?: "ok" | "forbidden" } = {}) {
  const calls: Call[] = [];
  const state = { refreshTokens: new Set(["refresh-1"]), accessTokens: new Set<string>(), issued: 1, codes: new Set(["code-1"]) };
  const issue = () => {
    state.issued++;
    const tokens = { access_token: `access-${state.issued}`, refresh_token: `refresh-${state.issued}`, expires_in: 86400, token_type: "bearer", scope: null };
    state.accessTokens.add(tokens.access_token);
    state.refreshTokens.add(tokens.refresh_token);
    return tokens;
  };
  const fetcher = (async (input: string, init: RequestInit = {}) => {
    const url = new URL(input);
    expect(url.host).toBe(HOST);
    if (options.down) throw new TypeError("fetch failed");
    const method = init.method ?? "GET";
    if (url.pathname === "/oauth/v2/token") {
      expect(method).toBe("POST");
      const form = new URLSearchParams(String(init.body));
      calls.push({ method, path: url.pathname, query: form, body: null });
      if (form.get("client_id") !== "client-1" || form.get("client_secret") !== "secret-1") return Response.json({ error: "invalid_client" }, { status: 400 });
      if (form.get("grant_type") === "refresh_token") {
        const old = form.get("refresh_token") ?? "";
        if (!state.refreshTokens.delete(old)) return Response.json({ error: "invalid_grant" }, { status: 400 });
        return Response.json(issue());
      }
      if (form.get("grant_type") === "authorization_code") {
        if (form.get("redirect_uri") !== IDEASOFT_REDIRECT_URI || !state.codes.delete(form.get("code") ?? "")) {
          return Response.json({ error: "invalid_grant" }, { status: 400 });
        }
        return Response.json(issue());
      }
      return Response.json({ error: "unsupported_grant_type" }, { status: 400 });
    }
    expect(url.pathname.startsWith("/admin-api/")).toBe(true);
    const token = new Headers(init.headers).get("authorization")?.replace(/^Bearer /, "") ?? "";
    if (!state.accessTokens.has(token)) return Response.json({ error: "invalid_token" }, { status: 401 });
    const path = url.pathname.slice("/admin-api/".length);
    const q = url.searchParams;
    const body = init.body ? JSON.parse(String(init.body)) : null;
    calls.push({ method, path, query: q, body });
    const paged = <T>(list: T[]) => {
      const limit = Number(q.get("limit") ?? 20);
      const page = Number(q.get("page") ?? 1);
      return Response.json(list.slice((page - 1) * limit, page * limit));
    };
    if (path === "currencies") return Response.json([{ ...TL, sellingPrice: 1, isPrimary: 1 }, { ...USD, sellingPrice: 40, isPrimary: 0 }]);
    if (path === "categories") return paged(CATEGORIES);
    if (path === "products") {
      let list = [...ALL];
      if (q.get("ids")) {
        const ids = q.get("ids")!.split(",").map(Number);
        list = list.filter((p) => ids.includes(p.id));
      }
      if (q.get("parent")) list = VARIANTS.filter((p) => p.parent?.id === Number(q.get("parent"))).map((p) => ({ ...p }));
      if (q.get("status")) list = list.filter((p) => String(p.status) === q.get("status"));
      if (q.get("category")) list = list.filter((p) => p.categories?.some((c) => c.id === Number(q.get("category"))));
      if (q.get("categoryIds")) {
        const ids = q.get("categoryIds")!.split(",").map(Number);
        list = list.filter((p) => p.categories?.some((c) => ids.includes(c.id)));
      }
      if (q.get("s")) list = list.filter((p) => p.name.toLowerCase().includes(q.get("s")!.toLowerCase()));
      const sort = q.get("sort") ?? "id";
      const key = sort.replace(/^-/, "") as "id" | "name" | "price1";
      list.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (sort.startsWith("-") ? -1 : 1));
      // Lists don't embed variants.
      return paged(list.map((p) => ({ ...p, children: [] })));
    }
    const productMatch = /^products\/(\d+)$/.exec(path);
    if (productMatch) {
      const product = ALL.find((p) => p.id === Number(productMatch[1]));
      // Tulips' variants aren't embedded: the connector lists them by parent.
      return product ? Response.json(product.id === 104 ? { ...product, children: [] } : product) : Response.json({ error: "not found" }, { status: 404 });
    }
    if (path === "orders") {
      let list = [...ORDERS];
      if (q.get("shippingMobilePhoneNumber")) list = list.filter((o) => o.shippingMobilePhoneNumber?.replace(/\s/g, "") === q.get("shippingMobilePhoneNumber"));
      if (q.get("member")) list = list.filter((o) => o.member?.id === Number(q.get("member")));
      expect(q.get("sort")).toBe("-id");
      return paged(list.map((o) => ({ ...o, member: o.member ?? null })));
    }
    if (path === "order_items") {
      expect(q.get("order")).toBe("503");
      return Response.json([{ id: 1, productName: "Gift Box", productQuantity: 1, product: { id: 103 } }]);
    }
    if (path === "members") {
      if (options.members === "forbidden") return Response.json({ error: "forbidden" }, { status: 403 });
      return Response.json(MEMBERS.filter((m) => m.mobilePhoneNumber.includes(q.get("s") ?? "")));
    }
    if (path === "quick_carts" && method === "POST") {
      if (options.quickCarts === "forbidden") return Response.json({ error: "forbidden" }, { status: 403 });
      const values = Object.values((body as { products: Record<string, unknown> }).products);
      if (values.some((v) => typeof v !== "object")) return Response.json({ errors: { products: "invalid" } }, { status: 422 });
      return Response.json({ id: 900, name: (body as { name: string }).name, url: "/hizli-al/abc", products: (body as { products: unknown }).products }, { status: 201 });
    }
    throw new Error(`Unexpected request: ${method} ${path}`);
  }) as unknown as typeof fetch;
  return { fetcher, calls, state };
}

const NOW = new Date("2026-10-13T10:00:00Z");
const customer: HostedUser = {
  id: 7,
  appId: "app-1",
  phone: "+905321234567",
  name: "Sara",
  email: null,
  city: null,
  notificationsReadAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const VALUES = { host: HOST, clientId: "client-1", clientSecret: "secret-1", refreshToken: "refresh-1" };

describe("IdeaSoft connector", () => {
  let store: ReturnType<typeof fakeStore>;
  let saved: Record<string, string>[];
  let connector: PlatformConnector;

  const create = (values: Record<string, string> = VALUES, fake = store, appId = "app-1") =>
    IDEASOFT_PLATFORM.create(values, {
      appId,
      store: null as never,
      fetcher: fake.fetcher,
      saveSecrets: async (secrets) => {
        saved.push(secrets);
      },
    });

  beforeEach(() => {
    clearIdeasoftCache();
    store = fakeStore();
    saved = [];
    connector = create();
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

  it("registers itself as a Store platform", () => {
    expect(platformDefinition("ideasoft")).toBe(IDEASOFT_PLATFORM);
    expect(IDEASOFT_PLATFORM).toMatchObject({ name: "IdeaSoft", appType: "store" });
    expect(IDEASOFT_PLATFORM.fields.map((f) => [f.name, f.secret])).toEqual([
      ["host", false],
      ["clientId", false],
      ["clientSecret", true],
      ["refreshToken", true],
    ]);
  });

  it("checks the keys, renews the refresh token and saves it at once", async () => {
    expect(await connector.check()).toBe(HOST);
    expect(saved).toEqual([{ refreshToken: "refresh-2" }]);
    expect(store.state.refreshTokens.has("refresh-1")).toBe(false);
    // The access token stays in memory: the app's next connector doesn't renew again.
    const next = create({ ...VALUES, refreshToken: "refresh-2" });
    expect(await next.config()).toMatchObject({ store: { currency: "TRY", guest_checkout: true, reviews: false }, features: { orders: true } });
    expect(store.calls.filter((c) => c.path === "/oauth/v2/token")).toHaveLength(1);
  });

  it("follows a refresh token this process already renewed", async () => {
    await connector.check();
    // Built from the stale value with no access token in memory yet, it still renews with the newest token.
    const stale = create(VALUES, store, "app-2");
    await stale.handle({ method: "GET", path: ["store", "categories"], query: new URLSearchParams(), body: null, user: null, now: NOW });
    expect(saved).toEqual([{ refreshToken: "refresh-2" }, { refreshToken: "refresh-3" }]);
  });

  it("swaps an authorization code pasted in the refresh token field", async () => {
    const withCode = create({ ...VALUES, refreshToken: "code-1" });
    expect(await withCode.check()).toBe(HOST);
    expect(saved).toEqual([{ refreshToken: "refresh-2" }]);
    const exchange = store.calls.find((c) => c.query.get("grant_type") === "authorization_code")!;
    expect(exchange.query.get("redirect_uri")).toBe(IDEASOFT_REDIRECT_URI);
    await expect(create({ ...VALUES, refreshToken: "nope" }).check()).rejects.toThrow();
    await expect(create({ ...VALUES, clientSecret: "wrong" }).check()).rejects.toThrow();
  });

  it("renews the access token once when IdeaSoft refuses it", async () => {
    await connector.check();
    store.state.accessTokens.clear();
    const result = await call("GET", "/store/categories");
    expect((result.body as { items: unknown[] }).items).toHaveLength(3);
    expect(saved.at(-1)).toEqual({ refreshToken: "refresh-3" });
  });

  it("lists active categories in the store's order", async () => {
    const result = await call("GET", "/store/categories");
    expect(result.body).toEqual({
      items: [
        { id: 11, name: "Roses", count: 0, parent_id: 10, image_url: null },
        { id: 13, name: "Vases", count: 0, parent_id: null, image_url: null },
        { id: 10, name: "Flowers", count: 0, parent_id: null, image_url: "https://cdn.myideasoft.com/cat/flowers.jpg" },
      ],
    });
  });

  it("maps products, discounts, VAT and stock", async () => {
    const result = await call("GET", "/store/products");
    const body = result.body as { items: Record<string, unknown>[]; total_pages: number };
    expect(body.total_pages).toBe(1);
    // Newest first, variants and inactive products left out.
    expect(body.items.map((i) => i.id)).toEqual([104, 103, 102, 101]);
    expect(body.items[3]).toMatchObject({
      name: "Red Roses",
      type: "variable",
      image_url: `https://${HOST}/myassets/products/001/a.jpg?revision=3`,
      price: { amount: "360.00", regular_amount: "400.00", formatted: "360,00 TL", regular_formatted: "400,00 TL", on_sale: true, currency: "TRY" },
      stock_status: "in_stock",
      digital: false,
    });
    // 250 - 50 TL, then 20% VAT.
    expect(body.items[2]).toMatchObject({ type: "simple", price: { amount: "240.00", regular_amount: "300.00", on_sale: true } });
    expect(body.items[1]).toMatchObject({ price: { amount: "10.00", currency: "USD", formatted: "10,00 USD" }, stock_status: "out_of_stock", purchasable: false });
    const query = store.calls.filter((c) => c.path === "products").at(-1)!.query;
    expect(Object.fromEntries(query)).toMatchObject({ sort: "-id", status: "1", page: "1", limit: "20" });
  });

  it("pages, searches, filters by category with subcategories and sorts", async () => {
    const first = await call("GET", "/store/products", { query: { category: "10", per_page: "2" } });
    expect(first.body).toMatchObject({ page: 1, total_pages: 2, items: [{ id: 104 }, { id: 103 }] });
    expect(store.calls.filter((c) => c.path === "products").at(-1)!.query.get("categoryIds")).toBe("10,11");
    const second = await call("GET", "/store/products", { query: { category: "10", per_page: "2", page: "2" } });
    expect(second.body).toMatchObject({ page: 2, total_pages: 2, total: 3, items: [{ id: 101 }] });

    const leaf = await call("GET", "/store/products", { query: { category: "13" } });
    expect((leaf.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([102]);
    expect(store.calls.filter((c) => c.path === "products").at(-1)!.query.get("category")).toBe("13");

    const search = await call("GET", "/store/products", { query: { search: "vase" } });
    expect((search.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([102]);
    expect(store.calls.filter((c) => c.path === "products").at(-1)!.query.get("s")).toBe("vase");

    const cheap = await call("GET", "/store/products", { query: { orderby: "price_desc" } });
    expect((cheap.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([101, 102, 104, 103]);
    expect(store.calls.filter((c) => c.path === "products").at(-1)!.query.get("sort")).toBe("-price1");

    const sale = await call("GET", "/store/products", { query: { on_sale: "true" } });
    expect((sale.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([102, 101]);

    const ids = await call("GET", "/store/products", { query: { ids: "102,999,101" } });
    expect((ids.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([102, 101]);

    expect((await call("GET", "/store/products", { query: { category: "x" } })).status).toBe(400);
  });

  it("builds the home screen", async () => {
    const result = await call("GET", "/store/home");
    const sections = (result.body as { sections: { type: string; categories?: { id: number }[]; products?: { id: number }[] }[] }).sections;
    expect(sections.map((s) => s.type)).toEqual(["categories", "sale_products", "new_products"]);
    expect(sections[0]!.categories!.map((c) => c.id)).toEqual([13, 10]);
    expect(sections[1]!.products!.map((p) => p.id)).toEqual([102, 101]);
  });

  it("shows a product with its options and variants", async () => {
    const result = await call("GET", "/store/products/{product_id}", { params: ["101"] });
    expect(result.body).toMatchObject({
      id: 101,
      type: "variable",
      description_html: "<p>Fresh red roses.</p>",
      images: [{ url: `https://${HOST}/myassets/products/001/a.jpg?revision=3` }, { url: `https://${HOST}/myassets/products/001/b.jpg` }],
      price: { amount: "360.00", formatted: "360,00 TL – 500,00 TL", range: true, on_sale: true },
      attributes: [{ slug: "size", name: "Size", variation: true, options: [{ value: "Small" }, { value: "Large" }] }],
      variations: [
        { id: 1001, attributes: { size: "Small" }, price: { amount: "360.00", on_sale: true }, stock_status: "in_stock", max_quantity: 3 },
        { id: 1002, attributes: { size: "Large" }, price: { amount: "500.00", on_sale: false }, stock_status: "out_of_stock", purchasable: false },
      ],
      categories: [{ id: 11, name: "Roses" }],
      permalink: `https://${HOST}/urun/red-roses`,
      sku: "ROSE",
      max_quantity: null,
    });

    // Variants listed by parent, named after the parent.
    const tulips = await call("GET", "/store/products/{product_id}", { params: ["104"] });
    expect(tulips.body).toMatchObject({
      attributes: [{ slug: "option", name: "Option", options: [{ value: "Yellow" }, { value: "Pink" }] }],
      variations: [{ id: 1041, attributes: { option: "Yellow" } }, { id: 1042, attributes: { option: "Pink" } }],
      price: { formatted: "150,00 TL – 180,00 TL" },
      related: [{ id: 103 }, { id: 101 }],
      permalink: "https://rose.example/tulips",
    });
    expect(store.calls.some((c) => c.path === "products" && c.query.get("parent") === "104")).toBe(true);

    const simple = await call("GET", "/store/products/{product_id}", { params: ["102"] });
    expect(simple.body).toMatchObject({ type: "simple", attributes: [], variations: [], max_quantity: 10, short_description_html: null });

    expect((await call("GET", "/store/products/{product_id}", { params: ["999"] })).status).toBe(404);
    expect((await call("GET", "/store/products/{product_id}", { params: ["105"] })).status).toBe(404);
    expect((await call("GET", "/store/products/{product_id}", { params: ["1001"] })).status).toBe(404);
    expect((await call("GET", "/store/products/{product_id}/reviews", { params: ["101"] })).body).toMatchObject({ code: "feature_disabled" });
  });

  it("prices the cart from the API's prices", async () => {
    const result = await call("POST", "/store/cart", {
      query: { platform: "android" },
      body: {
        lines: [
          { product_id: 101, variation_id: 1001, quantity: 5 },
          { product_id: 102, quantity: 2 },
          { product_id: 103, quantity: 1 },
          { product_id: 104, quantity: 1 },
          { product_id: 102, variation_id: 1001, quantity: 1 },
        ],
      },
    });
    expect(result.body).toMatchObject({
      item_count: 5,
      subtotal: "1.560,00 TL",
      subtotal_amount: "1560.00",
      currency: "TRY",
      lines: [
        { name: "Red Roses Small", quantity: 3, available: true, problem: "Only 3 left in stock.", unit_price: "360,00 TL", line_total: "1.080,00 TL", max_quantity: 3 },
        { name: "Glass Vase", quantity: 2, available: true, problem: null, unit_price: "240,00 TL", line_total: "480,00 TL" },
        // A USD product, priced in TL with the store's rate.
        { name: "Gift Box", available: false, problem: "Out of stock.", unit_price: "400,00 TL" },
        { name: "Tulips", available: false, problem: "Please choose an option." },
        { name: "Unavailable product", available: false },
      ],
    });
    expect((await call("POST", "/store/cart", { body: { lines: [] } })).status).toBe(400);
  });

  it("hands the cart over with a quick buy link", async () => {
    const changed = await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines: [{ product_id: 103, quantity: 1 }] } });
    expect(changed).toMatchObject({ status: 409, body: { code: "cart_changed" } });

    const lines = [
      { product_id: 101, variation_id: 1001, quantity: 2 },
      { product_id: 102, quantity: 1 },
    ];
    const link = await call("POST", "/store/checkout-link", { query: { platform: "ios" }, body: { lines }, user: customer });
    expect(link.body).toEqual({ url: `https://${HOST}/hizli-al/abc`, expires_at: "2026-10-13T10:30:00.000Z", open_in: "in_app" });
    const posts = store.calls.filter((c) => c.path === "quick_carts");
    expect(posts.map((c) => (c.body as { products: unknown }).products)).toEqual([
      { "1001": 2, "102": 1 },
      { "1001": { id: 1001, quantity: 2 }, "102": { id: 102, quantity: 1 } },
    ]);
    // The same lines reuse the link.
    await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines } });
    expect(store.calls.filter((c) => c.path === "quick_carts")).toHaveLength(2);
    expect((await call("POST", "/store/checkout-link", { body: { lines } })).status).toBe(400);
  });

  it("falls back to the product page when quick buy links aren't allowed", async () => {
    store = fakeStore({ quickCarts: "forbidden" });
    connector = create();
    const single = await call("POST", "/store/checkout-link", {
      query: { platform: "android" },
      body: { lines: [{ product_id: 101, variation_id: 1001, quantity: 1 }] },
    });
    expect(single.body).toMatchObject({ url: `https://${HOST}/urun/red-roses`, open_in: "in_app" });
    const several = await call("POST", "/store/checkout-link", {
      query: { platform: "android" },
      body: { lines: [{ product_id: 102, quantity: 1 }, { product_id: 101, variation_id: 1001, quantity: 1 }] },
    });
    expect(several).toMatchObject({ status: 409, body: { code: "checkout_unavailable" } });
  });

  it("lists the orders shipped to the customer's verified phone", async () => {
    const request = (query: Record<string, string>, user: HostedUser | null): ConnectorRequest => ({
      method: "GET",
      path: ["me", "orders"],
      query: new URLSearchParams(query),
      body: undefined,
      user,
      now: NOW,
    });
    const first = await connector.handle(request({ per_page: "2" }, customer));
    expectContract("GET", "/me/orders", first!);
    expect(first!.body).toMatchObject({
      page: 1,
      per_page: 2,
      total: 4,
      total_pages: 2,
      items: [
        { id: 505, number: "IDS-505", status: "completed", status_label: "Shipped", total: "240,00 TL", created_at: "2026-10-12T09:00:00.000Z" },
        { id: 504, status: "cancelled", status_label: "Cancelled", items: [] },
      ],
    });
    const second = await connector.handle(request({ per_page: "2", page: "2" }, customer));
    expectContract("GET", "/me/orders", second!);
    expect(second!.body).toMatchObject({
      page: 2,
      items: [
        { id: 503, number: "503", status: "failed", status_label: "Payment failed", total: "100,00 TL", items: [{ name: "Gift Box", product_id: 103, quantity: 1 }] },
        { id: 501, status: "processing", status_label: "Being prepared", total: "960,50 TL", items: [{ name: "Red Roses - Small", product_id: 1001, quantity: 2 }] },
      ],
    });
    const searched = store.calls.filter((c) => c.path === "orders").map((c) => c.query.get("shippingMobilePhoneNumber"));
    expect(searched).toEqual(expect.arrayContaining(["05321234567", "5321234567", "+905321234567"]));
    expect((await connector.handle(request({}, null)))!.status).toBe(401);

    // Without access to members, the shipping phone alone finds them.
    clearIdeasoftCache();
    store = fakeStore({ members: "forbidden" });
    connector = create();
    const shipped = await connector.handle(request({}, customer));
    expect((shipped!.body as { items: { id: number }[] }).items.map((o) => o.id)).toEqual([504, 503, 501]);
  });

  it("says when the store can't be reached", async () => {
    const down = create(VALUES, fakeStore({ down: true }));
    const result = await down.handle({ method: "GET", path: ["store", "products"], query: new URLSearchParams(), body: undefined, user: null, now: NOW });
    expect(result).toMatchObject({ status: 503, body: { code: "shop_unavailable" } });
    expectContract("GET", "/store/products", result!);
    await expect(down.check()).rejects.toThrow();
  });

  it("leaves other endpoints to the hosted API", async () => {
    expect(await connector.handle({ method: "GET", path: ["me", "courses"], query: new URLSearchParams(), body: undefined, user: null, now: NOW })).toBeNull();
  });
});

describe("IdeaSoft helpers", () => {
  it("normalize what the client typed", () => {
    expect(normalizeIdeasoftHost("https://Rose.myideasoft.com/panel/auth")).toBe(HOST);
    expect(normalizeIdeasoftHost("rose")).toBe(HOST);
    expect(normalizeIdeasoftHost("www.rose.myideasoft.com")).toBe(HOST);
    expect(normalizeIdeasoftHost("rose.example")).toBeNull();
    expect(normalizeIdeasoftHost("evil.com/x.myideasoft.com")).toBeNull();

    expect(IDEASOFT_PLATFORM.normalize({ host: " https://rose.myideasoft.com/ ", clientId: " client-1 ", clientSecret: "secret-1", refreshToken: " refresh-1 " })).toEqual({
      values: { host: HOST, clientId: "client-1", clientSecret: "secret-1", refreshToken: "refresh-1" },
    });
    const bad = IDEASOFT_PLATFORM.normalize({ host: "rose.example", clientId: "a b", clientSecret: "", refreshToken: "x y" });
    expect("errors" in bad && Object.keys(bad.errors)).toEqual(["host", "clientId", "clientSecret", "refreshToken"]);
  });

  it("compute prices", () => {
    expect(ideasoftPrice({ price1: 100, discount: 10, discountType: 1, taxIncluded: 1, tax: 20 })).toEqual({ amount: 90, regular: 100 });
    expect(ideasoftPrice({ price1: 100, discount: 10, discountType: 0, taxIncluded: 0, tax: 20 })).toEqual({ amount: 108, regular: 120 });
    expect(ideasoftPrice({ price1: "99,90", discount: null, discountType: null, taxIncluded: null, tax: null })).toEqual({ amount: 99.9, regular: 99.9 });
    expect(ideasoftPrice({ price1: 10, discount: 50, discountType: 0, taxIncluded: 1, tax: 0 })).toEqual({ amount: 0, regular: 10 });
    expect(formatIdeasoftMoney(1234.5, "TRY")).toBe("1.234,50 TL");
    expect(formatIdeasoftMoney(12, "EUR")).toBe("12,00 EUR");
    expect(currencyCode("TL")).toBe("TRY");
    expect(currencyCode("usd")).toBe("USD");
  });

  it("compare phone numbers by their digits", () => {
    for (const phone of ["+90 532 123 45 67", "0532 123 45 67", "5321234567", "0090 532 123 4567", "(0532) 123-45-67"]) {
      expect(phoneDigits(phone)).toBe("905321234567");
    }
    expect(phoneDigits("+44 20 7946 0958")).toBe("442079460958");
  });

  it("map the 13 order statuses", () => {
    const statuses: Record<string, string> = {
      deleted: "cancelled",
      waiting_for_approval: "on_hold",
      approved: "processing",
      fulfilled: "completed",
      cancelled: "cancelled",
      delivered: "completed",
      on_accumulation: "processing",
      waiting_for_payment: "pending",
      being_prepared: "processing",
      refunded: "refunded",
      personal_status_1: "processing",
      personal_status_2: "processing",
      personal_status_3: "processing",
    };
    for (const [status, expected] of Object.entries(statuses)) expect(ideasoftOrderStatus({ status }).status).toBe(expected);
    expect(ideasoftOrderStatus({ status: "waiting_for_payment", paymentStatus: "failed" })).toEqual({ status: "failed", label: "Payment failed" });
    expect(ideasoftOrderStatus({ status: "something_new" }).status).toBe("processing");
  });
});

describe("IdeaSoft authorization page", () => {
  let store: ReturnType<typeof fakeStore>;

  beforeEach(() => {
    store = fakeStore();
    vi.stubGlobal("fetch", store.fetcher);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const form = (values: Record<string, string>) =>
    new Request("https://yallapp.com.tr/oauth/ideasoft", { method: "POST", body: new URLSearchParams(values) });

  it("shows the start form", async () => {
    const response = await oauthGet(new Request("https://yallapp.com.tr/oauth/ideasoft"));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Continue to IdeaSoft");
  });

  it("sends the client to IdeaSoft and swaps the code it sends back", async () => {
    const start = await oauthPost(form({ host: "rose", clientId: "client-1", clientSecret: "secret-1" }));
    expect(start.status).toBe(303);
    const location = new URL(start.headers.get("location")!);
    expect(`${location.origin}${location.pathname}`).toBe(`https://${HOST}/panel/auth`);
    expect(Object.fromEntries(location.searchParams)).toEqual({ client_id: "client-1", response_type: "code", state: HOST, redirect_uri: IDEASOFT_REDIRECT_URI });
    const cookie = start.headers.get("set-cookie")!;
    expect(cookie).toMatch(/HttpOnly; Secure; SameSite=Lax/);
    expect(cookie).not.toContain("secret-1");

    const back = await oauthGet(
      new Request(`https://yallapp.com.tr/oauth/ideasoft?code=code-1&state=${HOST}`, { headers: { cookie: cookie.split(";")[0]! } }),
    );
    expect(back.status).toBe(200);
    const html = await back.text();
    expect(html).toContain("refresh-2");
    expect(back.headers.get("cache-control")).toBe("no-store");
    expect(back.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("shows the code when it can't swap it, and explains errors", async () => {
    const manual = await oauthGet(new Request(`https://yallapp.com.tr/oauth/ideasoft?code=code-1&state=${HOST}`));
    expect(await manual.text()).toContain('value="code-1"');
    expect(store.calls).toHaveLength(0);

    const denied = await oauthGet(new Request("https://yallapp.com.tr/oauth/ideasoft?error=access_denied"));
    expect(denied.status).toBe(400);

    const bad = await oauthPost(form({ host: "rose.example", clientId: "client-1", clientSecret: "secret-1" }));
    expect(bad.status).toBe(400);
    expect(await bad.text()).toContain("your-store.myideasoft.com");

    const start = await oauthPost(form({ host: HOST, clientId: "client-1", clientSecret: "wrong" }));
    const refused = await oauthGet(
      new Request(`https://yallapp.com.tr/oauth/ideasoft?code=code-1&state=${HOST}`, { headers: { cookie: start.headers.get("set-cookie")!.split(";")[0]! } }),
    );
    expect(refused.status).toBe(400);
    expect(await refused.text()).toContain("didn&#39;t accept");
  });
});
