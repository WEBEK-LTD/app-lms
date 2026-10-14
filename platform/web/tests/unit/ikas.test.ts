import { beforeEach, describe, expect, it } from "vitest";
import {
  clearIkasCache,
  formatIkasMoney,
  IKAS_API_URL,
  IKAS_PLATFORM,
  IkasConnector,
  ikasNumericId,
  ikasOrderStatus,
  normalizeStoreName,
  samePhone,
} from "@/lib/hosted/connectors/ikas";
import { platformDefinition } from "@/lib/hosted/connectors/platforms";
import type { ConnectorRequest } from "@/lib/hosted/connectors/types";
import type { HostedUser } from "@/lib/data/types";
import { expectContract } from "./contract";

// A store answering ikas's token endpoint and Admin GraphQL API (v1) the way ikas does, for the queries the connector sends.

const price = (sellPrice: number, discountPrice: number | null = null) => ({
  sellPrice,
  discountPrice,
  currencyCode: "TRY",
  currencySymbol: "₺",
  priceListId: null,
});
const variant = (id: string, prices: ReturnType<typeof price>[], stock: number | null, extra: Record<string, unknown> = {}) => ({
  id,
  sku: `SKU-${id}`,
  isActive: true,
  sellIfOutOfStock: false,
  deleted: false,
  variantValueIds: [],
  prices,
  images: [],
  stocks: stock === null ? null : [{ stockLocationId: "loc-1", stockCount: stock }],
  ...extra,
});
const product = (id: string, name: string, createdAt: number, extra: Record<string, unknown>) => ({
  id,
  name,
  type: "PHYSICAL",
  createdAt,
  description: `<p>${name}</p>`,
  shortDescription: null,
  categoryIds: [],
  deleted: false,
  salesChannelIds: ["sc-1"],
  hiddenSalesChannelIds: [],
  maxQuantityPerCart: null,
  metaData: { slug: name.toLowerCase().replace(/ /g, "-") },
  productVariantTypes: [],
  salesChannels: [{ id: "sc-1", status: "VISIBLE", maxQuantityPerCart: null }],
  variants: [] as ReturnType<typeof variant>[],
  ...extra,
});

const PRODUCTS = [
  product("p-roses", "Red Roses", 3, {
    categoryIds: ["c-roses"],
    productVariantTypes: [{ order: 0, variantTypeId: "vt-size", variantValueIds: ["v-small", "v-large"] }],
    variants: [
      variant("var-small", [price(400)], null, {
        stocks: [
          { stockLocationId: "loc-1", stockCount: 5 },
          { stockLocationId: "loc-2", stockCount: 5 },
        ],
        variantValueIds: [{ variantTypeId: "vt-size", variantValueId: "v-small" }],
        images: [
          { imageId: "img-2", fileName: "roses-side", isMain: false, isVideo: false, order: 1 },
          { imageId: "img-1", fileName: "roses", isMain: true, isVideo: false, order: 0 },
        ],
      }),
      variant("var-large", [price(600, 550)], 3, { variantValueIds: [{ variantTypeId: "vt-size", variantValueId: "v-large" }] }),
    ],
  }),
  product("p-gift", "Gift Card", 2, { type: "DIGITAL", categoryIds: ["c-bouquets"], variants: [variant("var-gift", [price(100)], 50)] }),
  product("p-vase", "Glass Vase", 1, { categoryIds: ["c-roses"], variants: [variant("var-vase", [price(250)], 0)] }),
  product("p-hidden", "Hidden Box", 0, { hiddenSalesChannelIds: ["sc-1"], variants: [variant("var-hidden", [price(10)], 5)] }),
  product("p-other", "Other Channel", 5, { salesChannelIds: ["sc-2"], variants: [variant("var-other", [price(10)], 5)] }),
];

const CATEGORIES = [
  { id: "c-bouquets", name: "Bouquets", parentId: null, categoryPath: [], imageId: "cat-img", deleted: false },
  { id: "c-roses", name: "Roses", parentId: "c-bouquets", categoryPath: ["c-bouquets"], imageId: null, deleted: false },
  { id: "c-empty", name: "Empty", parentId: null, categoryPath: [], imageId: null, deleted: false },
  { id: "c-old", name: "Old", parentId: null, categoryPath: [], imageId: null, deleted: true },
];

const CUSTOMERS = [
  { id: "cust-1", phone: "+905321234567" },
  { id: "cust-2", phone: "+905559876543" },
  { id: "cust-3", phone: "+9053212345670" },
];

const line = (name: string, productId: string | null, quantity = 1) => ({
  quantity,
  variant: { productId, name, mainImageId: productId ? "img-1" : null, variantValues: [] },
});
const ORDERS = [
  {
    id: "o-3",
    customerId: "cust-1",
    orderNumber: "1003",
    status: "CREATED",
    orderPaymentStatus: "PAID",
    orderPackageStatus: "UNFULFILLED",
    orderedAt: Date.parse("2026-10-12T09:00:00Z"),
    createdAt: Date.parse("2026-10-12T09:00:00Z"),
    currencyCode: "TRY",
    currencySymbol: "₺",
    totalFinalPrice: 950,
    orderLineItems: [{ ...line("Red Roses", "p-roses"), variant: { ...line("Red Roses", "p-roses").variant, variantValues: [{ variantTypeName: "Size", variantValueName: "Large" }] } }],
  },
  {
    id: "o-2",
    customerId: "cust-2",
    orderNumber: "1002",
    status: "CREATED",
    orderPaymentStatus: "PAID",
    orderPackageStatus: "DELIVERED",
    orderedAt: Date.parse("2026-10-11T09:00:00Z"),
    createdAt: Date.parse("2026-10-11T09:00:00Z"),
    currencyCode: "TRY",
    currencySymbol: "₺",
    totalFinalPrice: 100,
    orderLineItems: [line("Gift Card", "p-gift")],
  },
  {
    id: "o-1",
    customerId: "cust-1",
    orderNumber: "1001",
    status: "CANCELLED",
    orderPaymentStatus: "REFUNDED",
    orderPackageStatus: "CANCELLED",
    orderedAt: Date.parse("2026-10-01T09:00:00Z"),
    createdAt: Date.parse("2026-10-01T09:00:00Z"),
    currencyCode: "TRY",
    currencySymbol: "₺",
    totalFinalPrice: 400,
    orderLineItems: [line("Glass Vase", "p-vase", 2)],
  },
  {
    id: "o-0",
    customerId: "cust-1",
    orderNumber: "1000",
    status: "DRAFT",
    orderPaymentStatus: "WAITING",
    orderPackageStatus: "UNFULFILLED",
    orderedAt: Date.parse("2026-09-01T09:00:00Z"),
    createdAt: Date.parse("2026-09-01T09:00:00Z"),
    currencyCode: "TRY",
    currencySymbol: "₺",
    totalFinalPrice: 10,
    orderLineItems: [],
  },
];

interface Call {
  query: string;
  variables: Record<string, unknown>;
}
interface Filter {
  eq?: string;
  in?: string[];
}
const matches = (value: string | string[], filter: Filter | undefined) => {
  if (!filter) return true;
  const values = Array.isArray(value) ? value : [value];
  if (filter.eq !== undefined) return values.includes(filter.eq);
  if (filter.in) return values.some((v) => filter.in!.includes(v));
  return true;
};

function paginate<T>(list: T[], pagination: { page?: number; limit?: number } | undefined) {
  const page = pagination?.page ?? 1;
  const limit = pagination?.limit ?? 50;
  if (limit < 1 || limit > 200) throw new Error("limit out of range");
  const data = list.slice((page - 1) * limit, page * limit);
  return { count: data.length, data, hasNext: page * limit < list.length, limit, page };
}

function fakeIkas(options: { down?: boolean; refuseKeys?: boolean; revokeFirstToken?: boolean } = {}) {
  const calls: Call[] = [];
  let tokenRequests = 0;
  let revoked = options.revokeFirstToken ?? false;
  const fetcher = (async (url: string, init: RequestInit) => {
    if (url === "https://rose.myikas.com/api/admin/oauth/token") {
      expect(init.method).toBe("POST");
      expect(new Headers(init.headers).get("content-type")).toBe("application/x-www-form-urlencoded");
      const form = new URLSearchParams(String(init.body));
      expect(form.get("grant_type")).toBe("client_credentials");
      tokenRequests++;
      if (options.refuseKeys || form.get("client_id") !== "client-1" || form.get("client_secret") !== "secret-1") {
        return Response.json({ error: "invalid_client" }, { status: 401 });
      }
      return Response.json({ token_type: "Bearer", access_token: `token-${tokenRequests}`, expires_in: 14400, scope: "", refresh_token: "" });
    }
    expect(url).toBe(IKAS_API_URL);
    if (options.down) return new Response("", { status: 503 });
    const auth = new Headers(init.headers).get("authorization");
    if (!auth?.startsWith("Bearer token-")) return new Response("", { status: 401 });
    if (revoked) {
      revoked = false;
      return Response.json({ errors: [{ message: "Unauthenticated", extensions: { code: "UNAUTHENTICATED" } }] });
    }
    const { query, variables } = JSON.parse(String(init.body)) as Call;
    calls.push({ query, variables });
    const v = variables as Record<string, never>;
    let data: unknown;
    if (query.includes("getMerchant")) {
      data = { getMerchant: { id: "m-1", merchantName: "Rose Shop", storeName: "rose" } };
    } else if (query.includes("listMerchantSettings")) {
      data = {
        listMerchantSettings: [
          {
            merchantName: "Rose Shop",
            currencyCode: "TRY",
            currencySymbol: "₺",
            currencyFormats: [
              { currencyCode: "TRY", decimalSeparator: ",", omitZeroDecimal: false, symbol: "₺", symbolPosition: "LEFT", thousandSeparator: "." },
            ],
          },
        ],
      };
    } else if (query.includes("listStorefront")) {
      data = {
        listStorefront: [
          {
            id: "sf-1",
            name: "Rose",
            salesChannelId: "sc-1",
            domains: [
              { name: "rose.myikas.com", isDefault: false },
              { name: "www.rose.example", isDefault: true },
            ],
            routings: [{ domain: "www.rose.example", path: null, currencyCode: "TRY", priceListId: null }],
          },
        ],
      };
    } else if (query.includes("listCategory")) {
      data = { listCategory: CATEGORIES };
    } else if (query.includes("listVariantType")) {
      data = {
        listVariantType: [
          { id: "vt-size", name: "Size", values: [{ id: "v-small", name: "Small" }, { id: "v-large", name: "Large" }] },
        ],
      };
    } else if (query.includes("listProduct(")) {
      let list = PRODUCTS.filter(
        (p) =>
          matches(p.id, v.id) &&
          matches(p.categoryIds, v.categoryIds) &&
          matches(p.salesChannelIds, v.salesChannelIds) &&
          (!v.search || p.name.toLowerCase().includes(String(v.search).toLowerCase())),
      );
      const sort = v.sort as string | undefined;
      if (sort === "-createdAt") list = [...list].sort((a, b) => b.createdAt - a.createdAt);
      if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
      data = { listProduct: paginate(list, v.pagination) };
    } else if (query.includes("listCustomer(")) {
      // ikas would match exactly; this one matches loosely, as a worst case.
      const forms = (v.phone as Filter | undefined)?.in ?? [];
      const list = v.phone ? CUSTOMERS.filter((c) => forms.some((f) => c.phone.includes(f))) : CUSTOMERS;
      data = { listCustomer: paginate(list, v.pagination) };
    } else if (query.includes("listOrder(")) {
      const list = ORDERS.filter((o) => matches(o.customerId, v.customerId));
      if (v.sort !== undefined && v.sort !== "-orderedAt") throw new Error("unknown sort");
      data = { listOrder: paginate(list, v.pagination) };
    } else {
      throw new Error(`Unexpected query: ${query}`);
    }
    return Response.json({ data });
  }) as unknown as typeof fetch;
  return { fetcher, calls, tokenRequests: () => tokenRequests };
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
const SETTINGS = { store: "rose", clientId: "client-1", clientSecret: "secret-1" };
const id = ikasNumericId;

describe("ikas connector", () => {
  let ikas: ReturnType<typeof fakeIkas>;
  let connector: IkasConnector;

  beforeEach(() => {
    clearIkasCache();
    ikas = fakeIkas();
    connector = new IkasConnector(SETTINGS, ikas.fetcher);
  });

  async function call(
    method: string,
    route: string,
    options: { query?: Record<string, string>; body?: unknown; user?: HostedUser | null; params?: string[]; on?: IkasConnector } = {},
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
    const result = await (options.on ?? connector).handle(request);
    expect(result, `${method} ${concrete} is answered`).not.toBeNull();
    expectContract(method, route, result!);
    return result!;
  }

  const productCalls = () => ikas.calls.filter((c) => c.query.includes("listProduct(") && !c.query.includes("hiddenSalesChannelIds }"));

  it("checks the keys and adds the store settings to the config", async () => {
    expect(await connector.check()).toBe("Rose Shop");
    expect(await connector.config()).toEqual({
      store: {
        currency: "TRY",
        guest_checkout: true,
        checkout_opens_in: "in_app",
        reviews: false,
        delivery_date: { enabled: false, required: false, min_days: 0, max_days: 0, closed_weekdays: [] },
        gift_message: { enabled: false, max_length: 200 },
      },
      features: { orders: true },
    });
    // One token for every call while it's valid.
    expect(ikas.tokenRequests()).toBe(1);
    const wrong = new IkasConnector({ ...SETTINGS, clientSecret: "nope" }, ikas.fetcher);
    await expect(wrong.check()).rejects.toThrow();
  });

  it("fetches a new token when ikas no longer accepts the old one", async () => {
    const revoked = fakeIkas({ revokeFirstToken: true });
    expect(await new IkasConnector(SETTINGS, revoked.fetcher).check()).toBe("Rose Shop");
    expect(revoked.tokenRequests()).toBe(2);
  });

  it("lists categories with products, with their parents", async () => {
    const result = await call("GET", "/store/categories");
    expect(result.body).toEqual({
      items: [
        { id: id("c-bouquets"), name: "Bouquets", count: 3, parent_id: null, image_url: "https://cdn.myikas.com/images/m-1/cat-img/image_540.webp" },
        { id: id("c-roses"), name: "Roses", count: 2, parent_id: id("c-bouquets"), image_url: null },
      ],
    });
  });

  it("maps products, prices and stock", async () => {
    const result = await call("GET", "/store/products", { query: { per_page: "20" } });
    const body = result.body as { items: Record<string, unknown>[]; total_pages: number };
    expect(body.total_pages).toBe(1);
    expect(body.items.map((i) => i.id)).toEqual([id("p-roses"), id("p-gift"), id("p-vase")]);
    expect(body.items[0]).toMatchObject({
      name: "Red Roses",
      type: "variable",
      image_url: "https://cdn.myikas.com/images/m-1/img-1/image_540.webp",
      price: { amount: "400.00", formatted: "₺400,00 – ₺550,00", range: true, on_sale: false, currency: "TRY" },
      stock_status: "in_stock",
      purchasable: true,
      digital: false,
    });
    expect(body.items[1]).toMatchObject({ type: "simple", digital: true, price: { formatted: "₺100,00", on_sale: false, range: false } });
    expect(body.items[2]).toMatchObject({ stock_status: "out_of_stock", purchasable: false });
    expect(productCalls().at(-1)!.variables).toMatchObject({
      pagination: { page: 1, limit: 20 },
      sort: "-createdAt",
      salesChannelIds: { eq: "sc-1" },
    });
  });

  it("pages, searches, filters and sorts", async () => {
    const second = await call("GET", "/store/products", { query: { page: "2", per_page: "2" } });
    expect(second.body).toMatchObject({ page: 2, total: 3, total_pages: 2, items: [{ id: id("p-vase") }] });

    const search = await call("GET", "/store/products", { query: { search: "roses" } });
    expect((search.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([id("p-roses")]);
    expect(productCalls().at(-1)!.variables).toMatchObject({ search: "roses" });
    expect(productCalls().at(-1)!.variables.sort).toBeUndefined();

    // A category includes its subcategories.
    const bouquets = await call("GET", "/store/products", { query: { category: String(id("c-bouquets")), orderby: "price_desc" } });
    expect(productCalls().at(-1)!.variables).toMatchObject({ categoryIds: { in: ["c-bouquets", "c-roses"] } });
    expect((bouquets.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([id("p-roses"), id("p-vase"), id("p-gift")]);

    const titles = await call("GET", "/store/products", { query: { orderby: "title" } });
    expect(productCalls().at(-1)!.variables).toMatchObject({ sort: "name" });
    expect((titles.body as { items: { name: string }[] }).items.map((i) => i.name)).toEqual(["Gift Card", "Glass Vase", "Red Roses"]);

    const ascending = await call("GET", "/store/products", { query: { orderby: "price_asc" } });
    expect((ascending.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([id("p-gift"), id("p-vase"), id("p-roses")]);

    const ids = await call("GET", "/store/products", { query: { ids: `${id("p-vase")},${id("p-roses")},5` } });
    expect((ids.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([id("p-vase"), id("p-roses")]);

    const unknown = await call("GET", "/store/products", { query: { category: "999" } });
    expect((unknown.body as { items: unknown[] }).items).toEqual([]);
    expect((await call("GET", "/store/products", { query: { category: "abc" } })).status).toBe(400);
  });

  it("lists products on sale", async () => {
    const product = PRODUCTS[2]!;
    const saved = product.variants[0]!.prices;
    product.variants[0]!.prices = [price(250, 200)];
    try {
      const sale = await call("GET", "/store/products", { query: { on_sale: "true" } });
      expect(sale.body).toMatchObject({
        total: 1,
        items: [{ id: id("p-vase"), price: { amount: "200.00", regular_amount: "250.00", regular_formatted: "₺250,00", on_sale: true } }],
      });
    } finally {
      product.variants[0]!.prices = saved;
    }
  });

  it("builds the home screen", async () => {
    const result = await call("GET", "/store/home");
    const sections = (result.body as { sections: { type: string; products?: { id: number }[] }[] }).sections;
    expect(sections.map((s) => s.type)).toEqual(["categories", "new_products"]);
    expect(sections[1]!.products!.map((p) => p.id)).toEqual([id("p-roses"), id("p-gift"), id("p-vase")]);
  });

  it("shows a product with its options and variations", async () => {
    const result = await call("GET", "/store/products/{product_id}", { params: [String(id("p-roses"))] });
    expect(result.body).toMatchObject({
      id: id("p-roses"),
      description_html: "<p>Red Roses</p>",
      images: [
        { url: "https://cdn.myikas.com/images/m-1/img-1/image_1080.webp" },
        { url: "https://cdn.myikas.com/images/m-1/img-2/image_1080.webp" },
      ],
      attributes: [{ slug: "size", name: "Size", variation: true, options: [{ value: "Small", label: "Small" }, { value: "Large", label: "Large" }] }],
      variations: [
        { id: id("var-small"), attributes: { size: "Small" }, price: { formatted: "₺400,00", on_sale: false }, max_quantity: 10, stock_status: "in_stock" },
        { id: id("var-large"), attributes: { size: "Large" }, price: { on_sale: true, regular_formatted: "₺600,00", amount: "550.00" }, max_quantity: 3 },
      ],
      categories: [{ id: id("c-roses"), name: "Roses", parent_id: id("c-bouquets") }],
      related: [{ id: id("p-vase") }],
      sku: null,
      external_url: null,
      permalink: "https://www.rose.example/red-roses",
    });
    const simple = await call("GET", "/store/products/{product_id}", { params: [String(id("p-gift"))] });
    expect(simple.body).toMatchObject({ type: "simple", attributes: [], variations: [], sku: "SKU-var-gift", max_quantity: 50, digital: true });
    expect((await call("GET", "/store/products/{product_id}", { params: ["999"] })).status).toBe(404);
    expect((await call("GET", "/store/products/{product_id}", { params: [String(id("p-hidden"))] })).status).toBe(404);
    expect((await call("GET", "/store/products/{product_id}/reviews", { params: [String(id("p-roses"))] })).body).toMatchObject({
      code: "feature_disabled",
    });
  });

  it("finds a product by its number on a fresh server", async () => {
    clearIkasCache();
    const fresh = new IkasConnector(SETTINGS, ikas.fetcher);
    const result = await call("GET", "/store/products/{product_id}", { params: [String(id("p-vase"))], on: fresh });
    expect(result.body).toMatchObject({ name: "Glass Vase", stock_status: "out_of_stock" });
  });

  it("prices the cart from the store", async () => {
    await call("GET", "/store/products");
    const result = await call("POST", "/store/cart", {
      query: { platform: "android" },
      body: {
        lines: [
          { product_id: id("p-roses"), variation_id: id("var-large"), quantity: 5 },
          { product_id: id("p-gift"), quantity: 1 },
          { product_id: id("p-vase"), quantity: 1 },
          { product_id: id("p-roses"), quantity: 1 },
        ],
      },
    });
    expect(result.body).toMatchObject({
      item_count: 4,
      subtotal: "₺1.750,00",
      subtotal_amount: "1750.00",
      currency: "TRY",
      lines: [
        { name: "Red Roses - Large", quantity: 3, available: true, problem: "Only 3 left in stock.", unit_price: "₺550,00", line_total: "₺1.650,00", max_quantity: 3 },
        { name: "Gift Card", digital: true, available: true, problem: null },
        { name: "Glass Vase", available: false, problem: "Out of stock." },
        { name: "Red Roses", available: false, problem: "This product is no longer available." },
      ],
    });
    expect((await call("POST", "/store/cart", { body: { lines: [] } })).status).toBe(400);
  });

  it("opens the store's checkout with the cart's lines", async () => {
    await call("GET", "/store/products");
    const changed = await call("POST", "/store/checkout-link", {
      query: { platform: "android" },
      body: { lines: [{ product_id: id("p-vase"), quantity: 1 }] },
    });
    expect(changed).toMatchObject({ status: 409, body: { code: "cart_changed" } });

    const ios = await call("POST", "/store/checkout-link", {
      query: { platform: "ios" },
      body: { lines: [{ product_id: id("p-gift"), quantity: 1 }] },
    });
    expect(ios).toMatchObject({ status: 403, body: { code: "purchase_not_allowed" } });

    const link = await call("POST", "/store/checkout-link", {
      query: { platform: "ios" },
      body: {
        lines: [
          { product_id: id("p-roses"), variation_id: id("var-small"), quantity: 2 },
          { product_id: id("p-roses"), variation_id: id("var-large"), quantity: 1 },
        ],
      },
      user: customer,
    });
    expect(link.body).toEqual({
      url: "https://www.rose.example/checkout?lines=var-small:2,var-large:1",
      expires_at: "2026-10-13T10:30:00.000Z",
      open_in: "in_app",
    });

    const own = new IkasConnector({ ...SETTINGS, storefront: "shop.rose.example" }, ikas.fetcher);
    const ownLink = await call("POST", "/store/checkout-link", {
      query: { platform: "android" },
      body: { lines: [{ product_id: id("p-gift"), quantity: 1 }] },
      on: own,
    });
    expect(ownLink.body).toMatchObject({ url: "https://shop.rose.example/checkout?lines=var-gift:1" });
    expect((await call("POST", "/store/checkout-link", { query: { platform: "web" }, body: { lines: [] } })).status).toBe(400);
  });

  it("says when the store can't be reached", async () => {
    for (const fake of [fakeIkas({ down: true }), fakeIkas({ refuseKeys: true })]) {
      clearIkasCache();
      const down = new IkasConnector(SETTINGS, fake.fetcher);
      const result = await down.handle({ method: "GET", path: ["store", "products"], query: new URLSearchParams(), body: undefined, user: null, now: NOW });
      expect(result).toMatchObject({ status: 503, body: { code: "shop_unavailable" } });
      expectContract("GET", "/store/products", result!);
      await expect(down.check()).rejects.toThrow();
    }
  });

  it("lists the signed-in customer's orders", async () => {
    const first = await call("GET", "/me/orders", { query: { per_page: "1" }, user: customer });
    expect(first.body).toMatchObject({
      page: 1,
      total_pages: 2,
      items: [
        {
          id: id("o-3"),
          number: "1003",
          status: "processing",
          status_label: "Processing",
          total: "₺950,00",
          created_at: "2026-10-12T09:00:00.000Z",
          items: [{ name: "Red Roses - Large", product_id: id("p-roses"), quantity: 1, image_url: "https://cdn.myikas.com/images/m-1/img-1/image_540.webp" }],
        },
      ],
    });
    // Only the customer with exactly this number.
    const orderCall = ikas.calls.find((c) => c.query.includes("listOrder(customerId"))!;
    expect(orderCall.variables).toMatchObject({ customerId: { in: ["cust-1"] }, sort: "-orderedAt" });

    const second = await call("GET", "/me/orders", { query: { per_page: "1", page: "2" }, user: customer });
    expect(second.body).toMatchObject({ page: 2, items: [{ number: "1001", status: "cancelled", status_label: "Cancelled" }] });

    const nobody = await call("GET", "/me/orders", { user: { ...customer, phone: "+905000000000" } });
    expect(nobody.body).toMatchObject({ total: 0, items: [] });
    expect((await call("GET", "/me/orders")).status).toBe(401);
  });

  it("leaves other endpoints to the hosted API", async () => {
    expect(await connector.handle({ method: "GET", path: ["me", "courses"], query: new URLSearchParams(), body: undefined, user: null, now: NOW })).toBeNull();
  });
});

describe("ikas platform", () => {
  it("registers itself with its fields", () => {
    expect(platformDefinition("ikas")).toBe(IKAS_PLATFORM);
    expect(IKAS_PLATFORM).toMatchObject({ id: "ikas", name: "ikas", appType: "store" });
    expect(IKAS_PLATFORM.fields.map((f) => [f.name, f.secret, f.optional ?? false])).toEqual([
      ["store", false, false],
      ["clientId", false, false],
      ["clientSecret", true, false],
      ["storefront", false, true],
    ]);
  });

  it("normalizes what the client typed", () => {
    expect(
      IKAS_PLATFORM.normalize({ store: "https://Rose.myikas.com/admin", clientId: " client-1 ", clientSecret: "secret-1", storefront: "https://www.Rose.example/" }),
    ).toEqual({ values: { store: "rose", clientId: "client-1", clientSecret: "secret-1", storefront: "www.rose.example" } });
    expect(IKAS_PLATFORM.normalize({ store: "rose.myikas.com", clientId: "a", clientSecret: "b", storefront: "" })).toEqual({
      values: { store: "rose", clientId: "a", clientSecret: "b", storefront: "" },
    });
    const bad = IKAS_PLATFORM.normalize({ store: "www.rose.example", clientId: "a", clientSecret: "b", storefront: "not a host" });
    expect(bad).toEqual({ errors: { store: expect.any(String), storefront: expect.any(String) } });
    expect(normalizeStoreName("rose")).toBe("rose");
    expect(normalizeStoreName("-rose")).toBeNull();
  });

  it("creates a connector from the saved values", async () => {
    clearIkasCache();
    const fake = fakeIkas();
    const created = IKAS_PLATFORM.create(
      { store: "rose", clientId: "client-1", clientSecret: "secret-1", storefront: "" },
      { appId: "app-1", store: null as never, fetcher: fake.fetcher, saveSecrets: async () => {} },
    );
    expect(await created.check()).toBe("Rose Shop");
  });
});

describe("ikas helpers", () => {
  it("turn IDs into stable positive 31-bit numbers", () => {
    const n = ikasNumericId("4f6d2c1e-1b0a-4c8e-9a51-3d2f0e7b9c11");
    expect(n).toBe(ikasNumericId("4f6d2c1e-1b0a-4c8e-9a51-3d2f0e7b9c11"));
    expect(Number.isSafeInteger(n) && n >= 1 && n <= 0x7fffffff).toBe(true);
    expect(ikasNumericId("a")).not.toBe(ikasNumericId("b"));
  });

  it("match phone numbers exactly", () => {
    expect(samePhone("+905321234567", "+905321234567")).toBe(true);
    expect(samePhone("+90 532 123 45 67", "+905321234567")).toBe(true);
    expect(samePhone("0532 123 45 67", "+905321234567")).toBe(true);
    expect(samePhone("5321234567", "+905321234567")).toBe(true);
    expect(samePhone("+9053212345670", "+905321234567")).toBe(false);
    expect(samePhone("+15321234567", "+905321234567")).toBe(false);
    expect(samePhone(null, "+905321234567")).toBe(false);
  });

  it("map order statuses", () => {
    const status = (s: string, payment: string, pkg: string) => ikasOrderStatus({ status: s, orderPaymentStatus: payment, orderPackageStatus: pkg });
    expect(status("CREATED", "PAID", "DELIVERED")).toEqual({ status: "completed", label: "Delivered" });
    expect(status("CREATED", "PAID", "FULFILLED")).toEqual({ status: "completed", label: "Shipped" });
    expect(status("CREATED", "WAITING", "UNFULFILLED")).toEqual({ status: "pending", label: "Awaiting payment" });
    expect(status("CREATED", "FAILED", "UNFULFILLED")).toEqual({ status: "failed", label: "Payment failed" });
    expect(status("REFUNDED", "REFUNDED", "REFUNDED")).toEqual({ status: "refunded", label: "Refunded" });
    expect(status("REFUND_REQUESTED", "PAID", "DELIVERED")).toEqual({ status: "on_hold", label: "Refund requested" });
    expect(status("CANCELLED", "PAID", "UNFULFILLED")).toEqual({ status: "cancelled", label: "Cancelled" });
  });

  it("format money like the store", () => {
    const format = { currencyCode: "TRY", decimalSeparator: ",", omitZeroDecimal: false, symbol: "₺", symbolPosition: "LEFT", thousandSeparator: "." };
    expect(formatIkasMoney(1234.5, "TRY", format)).toBe("₺1.234,50");
    expect(formatIkasMoney(1234, "EUR", { ...format, symbol: "€", symbolPosition: "RIGHT", omitZeroDecimal: true })).toBe("1.234 €");
    expect(formatIkasMoney(1234.5, "USD")).toBe("$1,234.50");
  });
});
