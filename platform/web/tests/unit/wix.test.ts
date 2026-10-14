import { beforeEach, describe, expect, it } from "vitest";
import { platformDefinition, PlatformCheckError } from "@/lib/hosted/connectors/platforms";
import type { ConnectorRequest } from "@/lib/hosted/connectors/types";
import {
  clearWixCache,
  formatWixMoney,
  normalizeWixId,
  WIX_API_URL,
  WIX_PLATFORM,
  WIX_STORES_APP_ID,
  WixConnector,
  wixImageUrl,
  wixOrderStatus,
} from "@/lib/hosted/connectors/wix";
import { stableNumericId } from "@/lib/hosted/connectors/common";
import type { HostedUser } from "@/lib/data/types";
import { expectContract } from "./contract";

// 22 A Wix site answering the visitor-token endpoint, Catalog V3, Categories, eCommerce checkout,
// redirect sessions, orders and contacts the way Wix's REST APIs do, for the requests the connector sends.

const CLIENT_ID = "0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b";
const SITE_ID = "11111111-2222-3333-4444-555555555555";
const API_KEY = "IST.api-key-1";

const money = (amount: string) => ({ amount, formattedAmount: `₺${amount}` });
const variant = (id: string, actual: string, compareAt: string | null, inStock: boolean, extra: Record<string, unknown> = {}) => ({
  id,
  visible: true,
  sku: `SKU-${id}`,
  price: { actualPrice: money(actual), ...(compareAt ? { compareAtPrice: money(compareAt) } : {}) },
  inventoryStatus: { inStock, preorderEnabled: false },
  choices: [],
  ...extra,
});
const choice = (optionId: string, choiceId: string, optionName: string, choiceName: string) => ({
  optionChoiceIds: { optionId, choiceId },
  optionChoiceNames: { optionName, choiceName },
});

interface FakeProduct {
  id: string;
  name: string;
  slug: string;
  visible: boolean;
  productType: string;
  createdDate: string;
  categories: string[];
  options: unknown[];
  variants: ReturnType<typeof variant>[];
  outOfStock?: boolean;
}

const PRODUCTS: FakeProduct[] = [
  {
    id: "p-roses",
    name: "Red Roses",
    slug: "red-roses",
    visible: true,
    productType: "PHYSICAL",
    createdDate: "2026-10-03T00:00:00Z",
    categories: ["c-roses"],
    options: [
      {
        id: "opt-size",
        name: "Size",
        choicesSettings: {
          choices: [
            { choiceId: "ch-small", name: "Small", visible: true, inStock: true },
            { choiceId: "ch-large", name: "Large", visible: true, inStock: true },
          ],
        },
      },
    ],
    variants: [
      variant("v-small", "40.00", null, true, {
        choices: [choice("opt-size", "ch-small", "Size", "Small")],
        media: { url: "https://static.wixstatic.com/media/small~mv2.jpg", mediaType: "IMAGE" },
      }),
      variant("v-large", "60.00", "70.00", true, { choices: [choice("opt-size", "ch-large", "Size", "Large")] }),
    ],
  },
  {
    id: "p-gift",
    name: "Gift Card",
    slug: "gift-card",
    visible: true,
    productType: "DIGITAL",
    createdDate: "2026-10-02T00:00:00Z",
    categories: ["c-bouquets"],
    options: [],
    variants: [variant("v-gift", "100.00", null, true)],
  },
  {
    id: "p-vase",
    name: "Glass Vase",
    slug: "glass-vase",
    visible: true,
    productType: "PHYSICAL",
    createdDate: "2026-10-01T00:00:00Z",
    categories: ["c-roses"],
    options: [],
    variants: [variant("v-vase", "250.00", null, false)],
    outOfStock: true,
  },
  {
    id: "p-hidden",
    name: "Hidden Box",
    slug: "hidden-box",
    visible: false,
    productType: "PHYSICAL",
    createdDate: "2026-10-04T00:00:00Z",
    categories: [],
    options: [],
    variants: [variant("v-hidden", "10.00", null, true)],
  },
];

const CATEGORIES = [
  { id: "c-all", name: "All Products", itemCounter: 3, visible: true },
  { id: "c-bouquets", name: "Bouquets", itemCounter: 1, visible: true, image: "wix:image://v1/bouquets~mv2.jpg/bouquets.jpg#originWidth=800&originHeight=600" },
  { id: "c-roses", name: "Roses", itemCounter: 2, visible: true, parentCategory: { id: "c-bouquets", index: 0 } },
  { id: "c-empty", name: "Empty", itemCounter: 0, visible: true },
];

const ancestors = (id: string): string[] => {
  const parent = CATEGORIES.find((c) => c.id === id)?.parentCategory?.id;
  return parent ? [parent, ...ancestors(parent)] : [];
};

/** The product as Catalog V3 sends it: lists without variants; Get Product with them and the requested fields. */
function wire(p: FakeProduct, detail: boolean) {
  const amounts = p.variants.map((v) => Number(v.price.actualPrice.amount));
  const compares = p.variants.map((v) => Number(v.price.compareAtPrice?.amount ?? v.price.actualPrice.amount));
  const fixed = (n: number) => n.toFixed(2);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    visible: p.visible,
    productType: p.productType,
    currency: "TRY",
    createdDate: p.createdDate,
    media: { main: { url: `https://static.wixstatic.com/media/${p.id}~mv2.jpg`, mediaType: "IMAGE" } },
    options: p.options,
    inventory: { availabilityStatus: p.outOfStock ? "OUT_OF_STOCK" : "IN_STOCK", preorderStatus: "DISABLED" },
    actualPriceRange: { minValue: money(fixed(Math.min(...amounts))), maxValue: money(fixed(Math.max(...amounts))) },
    compareAtPriceRange: { minValue: money(fixed(Math.min(...compares))), maxValue: money(fixed(Math.max(...compares))) },
    variantSummary: { variantCount: p.variants.length },
    ...(detail
      ? {
          url: `https://www.rose.example/product-page/${p.slug}`,
          plainDescription: `<p>${p.name}</p>`,
          media: {
            main: { url: `https://static.wixstatic.com/media/${p.id}~mv2.jpg`, mediaType: "IMAGE" },
            itemsInfo: {
              items: [
                { url: `https://static.wixstatic.com/media/${p.id}~mv2.jpg`, mediaType: "IMAGE", altText: null },
                { url: `https://static.wixstatic.com/media/${p.id}-video.mp4`, mediaType: "VIDEO" },
                { url: `https://static.wixstatic.com/media/${p.id}-side~mv2.jpg`, mediaType: "IMAGE", altText: "Side" },
              ],
            },
          },
          directCategoriesInfo: { categories: [...p.categories, "c-all"].map((id) => ({ id, index: 0 })) },
          variantsInfo: { variants: p.variants },
        }
      : {}),
  };
}

const order = (id: string, extra: Record<string, unknown>) => ({
  id,
  number: id.replace("o-", "1000"),
  createdDate: "2026-10-01T09:00:00Z",
  status: "APPROVED",
  paymentStatus: "PAID",
  fulfillmentStatus: "NOT_FULFILLED",
  currency: "TRY",
  buyerInfo: { contactId: "contact-x", email: "someone@example.com" },
  priceSummary: { total: money("100.00") },
  lineItems: [
    {
      productName: { original: "Red Roses" },
      catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: "p-roses", options: { variantId: "v-large" } },
      quantity: 1,
      image: "wix:image://v1/p-roses~mv2.jpg/roses.jpg#originWidth=10&originHeight=10",
      descriptionLines: [{ name: { original: "Size" }, plainText: { original: "Large" } }],
    },
  ],
  ...extra,
});
const ORDERS = [
  order("o-1", { createdDate: "2026-10-12T09:00:00Z", buyerInfo: { contactId: "contact-email", email: "sara@example.com" }, fulfillmentStatus: "FULFILLED", priceSummary: { total: money("950.00") } }),
  order("o-2", { createdDate: "2026-10-11T09:00:00Z", buyerInfo: { contactId: "contact-1", email: "other@example.com" }, paymentStatus: "NOT_PAID" }),
  order("o-3", { createdDate: "2026-10-10T09:00:00Z", billingInfo: { contactDetails: { phone: "+90 532 123 45 67" } }, status: "CANCELED" }),
  order("o-4", { createdDate: "2026-10-09T09:00:00Z", buyerInfo: { contactId: "contact-2", email: "" }, billingInfo: { contactDetails: { phone: "+9053212345670" } } }),
  order("o-5", { createdDate: "2026-10-13T09:00:00Z", status: "INITIALIZED", billingInfo: { contactDetails: { phone: "+905321234567" } } }),
  order("o-6", { createdDate: "2026-10-08T09:00:00Z", buyerInfo: { contactId: "contact-y", email: null }, billingInfo: { contactDetails: { phone: "" } } }),
  order("o-7", {
    createdDate: "2026-10-07T09:00:00Z",
    shippingInfo: { logistics: { shippingDestination: { contactDetails: { phone: "00905321234567" } } } },
    paymentStatus: "FULLY_REFUNDED",
  }),
];

const CONTACTS = [
  { id: "contact-1", primaryInfo: { phone: "0532 123 45 67" }, info: { phones: { items: [{ phone: "0532 123 45 67", e164Phone: "+905321234567" }] } } },
  { id: "contact-2", primaryInfo: { phone: "+9053212345670" }, info: { phones: { items: [{ phone: "+9053212345670", e164Phone: "+9053212345670" }] } } },
  // A national number Wix couldn't put in E.164: never the customer's.
  { id: "contact-3", primaryInfo: { phone: "5321234567" }, info: { phones: { items: [{ phone: "5321234567", e164Phone: null }] } } },
];

interface Call {
  method: string;
  path: string;
  body: Record<string, unknown> | undefined;
  headers: Headers;
}

type Filter = Record<string, unknown>;

function fakeWix(
  options: {
    down?: boolean;
    catalogVersion?: string;
    revokeFirstToken?: boolean;
    orderStatus?: number;
    contactsStatus?: number;
    productsStatus?: number;
    checkoutUrl?: string;
  } = {},
) {
  const calls: Call[] = [];
  let tokenRequests = 0;
  let revoked = options.revokeFirstToken ?? false;
  const cursors = new Map<string, { list: unknown[]; offset: number }>();
  const page = (list: unknown[], paging: { limit?: number; cursor?: string } | undefined, key: string) => {
    let offset = 0;
    let items = list;
    if (paging?.cursor) {
      const saved = cursors.get(paging.cursor);
      if (!saved) throw new Error("unknown cursor");
      items = saved.list;
      offset = saved.offset;
    }
    const limit = paging?.limit ?? 50;
    if (limit < 1 || limit > 100) throw new Error("limit out of range");
    const data = items.slice(offset, offset + limit);
    const hasNext = offset + limit < items.length;
    const next = hasNext ? `${key}:${offset + limit}:${cursors.size}` : null;
    if (next) cursors.set(next, { list: items, offset: offset + limit });
    return { data, pagingMetadata: { count: data.length, hasNext, cursors: { next } } };
  };
  const json = (body: unknown, status = 200) => Response.json(body, { status });
  const fetcher = (async (url: string, init: RequestInit) => {
    expect(url.startsWith(`${WIX_API_URL}/`)).toBe(true);
    const parsed = new URL(url);
    const path = parsed.pathname;
    const headers = new Headers(init.headers);
    const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
    if (options.down) return new Response("", { status: 503 });
    if (path === "/oauth2/token") {
      expect(init.method).toBe("POST");
      expect(body).toEqual({ clientId: expect.any(String), grantType: "anonymous" });
      tokenRequests++;
      if (body!.clientId !== CLIENT_ID) return json({ message: "invalid client id" }, 400);
      return json({ access_token: `token-${tokenRequests}`, expires_in: 14400, token_type: "Bearer", refresh_token: "refresh" });
    }
    calls.push({ method: init.method ?? "GET", path, body, headers });
    const admin = path.startsWith("/ecom/v1/orders") || path.startsWith("/contacts/");
    if (admin) {
      if (headers.get("authorization") !== API_KEY) return json({ message: "unauthorized" }, 401);
      if (headers.get("wix-site-id") !== SITE_ID) return json({ message: "site not found" }, 404);
    } else {
      // Visitor tokens go without "Bearer".
      if (!/^token-\d+$/.test(headers.get("authorization") ?? "")) return json({ message: "unauthorized" }, 401);
      if (revoked) {
        revoked = false;
        return json({ message: "token expired" }, 401);
      }
    }
    const route = `${init.method} ${path}`;
    if (route === "GET /stores/v3/provision/version") return json({ catalogVersion: options.catalogVersion ?? "V3_CATALOG" });
    if (route === "GET /stores/v3/all-products-category") return json({ categoryId: "c-all", treeReference: { appNamespace: "@wix/stores" } });
    if (route === "POST /stores/v3/products/query") {
      if (options.productsStatus) return json({ message: "forbidden" }, options.productsStatus);
      const query = (body!.query ?? {}) as { filter?: Filter; cursorPaging?: { limit?: number; cursor?: string } };
      const ids = (query.filter?.id as { $in?: string[] } | undefined)?.$in;
      const list = PRODUCTS.filter((p) => p.visible && (!ids || ids.includes(p.id))).map((p) => wire(p, false));
      const result = page(list, query.cursorPaging, "q");
      return json({ products: result.data, pagingMetadata: result.pagingMetadata });
    }
    if (route === "POST /stores/v3/products/search") {
      const search = body!.search as { filter?: Filter; sort?: { fieldName: string; order: string }[]; search?: { expression: string }; cursorPaging: { limit?: number; cursor?: string } };
      // With a cursor, Wix takes nothing else: the cursor carries the rest.
      if (search.cursorPaging.cursor) expect(Object.keys(search)).toEqual(["cursorPaging"]);
      let list = PRODUCTS.filter((p) => p.visible);
      const category = (search.filter?.["allCategoriesInfo.categories"] as { $matchItems: { id: { $in: string[] } }[] } | undefined)?.$matchItems[0]?.id.$in;
      if (category) list = list.filter((p) => p.categories.some((c) => [c, ...ancestors(c)].some((id) => category.includes(id))));
      if (search.search?.expression) list = list.filter((p) => p.name.toLowerCase().includes(search.search!.expression.toLowerCase()));
      const sort = search.sort?.[0];
      const min = (p: FakeProduct) => Math.min(...p.variants.map((v) => Number(v.price.actualPrice.amount)));
      if (sort?.fieldName === "createdDate") list = [...list].sort((a, b) => b.createdDate.localeCompare(a.createdDate));
      if (sort?.fieldName === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
      if (sort?.fieldName === "actualPriceRange.minValue.amount") list = [...list].sort((a, b) => (sort.order === "ASC" ? min(a) - min(b) : min(b) - min(a)));
      const result = page(
        list.map((p) => wire(p, false)),
        search.cursorPaging,
        "s",
      );
      return json({ products: result.data, pagingMetadata: result.pagingMetadata });
    }
    if (init.method === "GET" && path.startsWith("/stores/v3/products/")) {
      const id = decodeURIComponent(path.split("/").pop()!);
      expect(parsed.searchParams.getAll("fields")).toContain("VARIANT_OPTION_CHOICE_NAMES");
      const product = PRODUCTS.find((p) => p.id === id && p.visible);
      return product ? json({ product: wire(product, true) }) : json({ message: "not found" }, 404);
    }
    if (route === "POST /categories/v1/categories/query") {
      expect(body!.treeReference).toEqual({ appNamespace: "@wix/stores" });
      const query = body!.query as { filter?: Filter; cursorPaging?: { limit?: number; cursor?: string } };
      const result = page(
        CATEGORIES.filter((c) => c.visible),
        query.cursorPaging,
        "c",
      );
      return json({ categories: result.data, pagingMetadata: result.pagingMetadata });
    }
    if (route === "POST /ecom/v1/checkouts") return json({ checkout: { id: "checkout-1", lineItems: [] } });
    if (route === "POST /redirect-session/v1/redirect-session") {
      return json({ redirectSession: { id: "rs-1", fullUrl: options.checkoutUrl ?? "https://www.rose.example/checkout?checkoutId=checkout-1" } });
    }
    if (route === "POST /ecom/v1/orders/search") {
      if (options.orderStatus) return json({ message: "forbidden" }, options.orderStatus);
      const search = body!.search as { filter?: Filter; cursorPaging?: { limit?: number } };
      const filter = search.filter ?? {};
      let list = [...ORDERS];
      const email = (filter["buyerInfo.email"] as { $eq?: string } | undefined)?.$eq;
      // Wix compares loosely here (case and spaces), as a worst case.
      if (email !== undefined) list = list.filter((o) => (o.buyerInfo as { email?: string | null }).email?.toLowerCase().includes(email.toLowerCase()));
      const contacts = (filter["buyerInfo.contactId"] as { $in?: string[] } | undefined)?.$in;
      if (contacts) list = list.filter((o) => contacts.includes((o.buyerInfo as { contactId: string }).contactId));
      list.sort((a, b) => String(b.createdDate).localeCompare(String(a.createdDate)));
      return json({ orders: page(list, search.cursorPaging, "o").data });
    }
    if (route === "POST /contacts/v4/contacts/query") {
      if (options.contactsStatus) return json({ message: "forbidden" }, options.contactsStatus);
      const query = body!.query as { filter: { "info.phones.phone": { $in: string[] } } };
      const forms = query.filter["info.phones.phone"].$in.map((f) => f.replace(/\D/g, ""));
      // Loose, as a worst case: any contact whose digits are part of a form.
      const list = CONTACTS.filter((c) => c.info.phones.items.some((p) => forms.some((f) => f.includes(p.phone.replace(/\D/g, "").replace(/^0/, "")))));
      return json({ contacts: list });
    }
    throw new Error(`Unexpected request: ${route}`);
  }) as unknown as typeof fetch;
  return { fetcher, calls, tokenRequests: () => tokenRequests };
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
const SETTINGS = { clientId: CLIENT_ID };
const WITH_ORDERS = { clientId: CLIENT_ID, apiKey: API_KEY, siteId: SITE_ID };
const id = stableNumericId;

describe("Wix connector", () => {
  let wix: ReturnType<typeof fakeWix>;
  let connector: WixConnector;

  beforeEach(() => {
    clearWixCache();
    wix = fakeWix();
    connector = new WixConnector(WITH_ORDERS, wix.fetcher);
  });

  async function call(
    method: string,
    route: string,
    options: { query?: Record<string, string>; body?: unknown; user?: HostedUser | null; params?: string[]; on?: WixConnector } = {},
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

  const searches = () => wix.calls.filter((c) => c.path === "/stores/v3/products/search");

  it("checks the client ID and the API key, and adds the store settings to the config", async () => {
    expect(await connector.check()).toBe("Wix store");
    // The key reads one order.
    expect(wix.calls.find((c) => c.path === "/ecom/v1/orders/search")!.body).toEqual({ search: { cursorPaging: { limit: 1 } } });
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
    expect(wix.tokenRequests()).toBe(1);
    const noKey = new WixConnector(SETTINGS, wix.fetcher);
    expect(await noKey.check()).toBe("Wix store");
    expect((await noKey.config()).features).toEqual({ orders: false });
    // Without a key the hosted API answers the order history itself.
    expect(await noKey.handle({ method: "GET", path: ["me", "orders"], query: new URLSearchParams(), body: undefined, user: customer, now: NOW })).toBeNull();
  });

  it("says clearly what's wrong with the keys", async () => {
    const wrong = new WixConnector({ clientId: "99999999-9999-9999-9999-999999999999" }, wix.fetcher);
    await expect(wrong.check()).rejects.toThrow(PlatformCheckError);
    await expect(wrong.check()).rejects.toThrow(/didn't accept this client ID/);

    const check = async (fake: ReturnType<typeof fakeWix>, settings: object = WITH_ORDERS) => {
      clearWixCache();
      return new WixConnector({ ...WITH_ORDERS, ...settings }, fake.fetcher).check();
    };
    await expect(check(fakeWix({ catalogVersion: "V1_CATALOG" }))).rejects.toThrow(/older product catalog/);
    await expect(check(fakeWix({ catalogVersion: "STORES_NOT_INSTALLED" }))).rejects.toThrow(/doesn't have Wix Stores/);
    await expect(check(fakeWix({ productsStatus: 403 }))).rejects.toThrow(/didn't let this client ID read your products/);
    await expect(check(fakeWix({ orderStatus: 403 }))).rejects.toThrow(/This API key can't read your orders/);
    await expect(check(fakeWix(), { apiKey: "IST.other-key" })).rejects.toThrow(/This API key can't read your orders/);
    await expect(check(fakeWix(), { siteId: "99999999-9999-9999-9999-999999999999" })).rejects.toThrow(/didn't find this site/);
    // Wix being down isn't the client's to fix: the Website step says it in general words.
    const down = check(fakeWix({ down: true }));
    await expect(down).rejects.toThrow();
    await expect(down).rejects.not.toBeInstanceOf(PlatformCheckError);
  });

  it("fetches a new token when Wix no longer accepts the old one", async () => {
    const revoked = fakeWix({ revokeFirstToken: true });
    expect(await new WixConnector(SETTINGS, revoked.fetcher).check()).toBe("Wix store");
    expect(revoked.tokenRequests()).toBe(2);
  });

  it("lists categories with products, without All Products", async () => {
    const result = await call("GET", "/store/categories");
    expect(result.body).toEqual({
      items: [
        { id: id("c-bouquets"), name: "Bouquets", count: 1, parent_id: null, image_url: "https://static.wixstatic.com/media/bouquets~mv2.jpg" },
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
      image_url: "https://static.wixstatic.com/media/p-roses~mv2.jpg",
      price: { amount: "40.00", formatted: "₺40.00 – ₺60.00", range: true, on_sale: false, currency: "TRY" },
      stock_status: "in_stock",
      purchasable: true,
      digital: false,
    });
    expect(body.items[1]).toMatchObject({ type: "simple", digital: true, price: { formatted: "₺100.00", on_sale: false, range: false } });
    expect(body.items[2]).toMatchObject({ stock_status: "out_of_stock", purchasable: false });
    expect(searches().at(-1)!.body).toEqual({
      search: { filter: { visible: true }, sort: [{ fieldName: "createdDate", order: "DESC" }], cursorPaging: { limit: 20 } },
      fields: ["CURRENCY"],
    });
  });

  it("pages, searches, filters and sorts", async () => {
    const second = await call("GET", "/store/products", { query: { page: "2", per_page: "2" } });
    expect(second.body).toMatchObject({ page: 2, total: 3, total_pages: 2, items: [{ id: id("p-vase") }] });
    // The second page follows the first one's cursor.
    expect(searches().at(-1)!.body!.search).toEqual({ cursorPaging: { limit: 2, cursor: expect.any(String) } });

    const search = await call("GET", "/store/products", { query: { search: "roses" } });
    expect((search.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([id("p-roses")]);
    expect(searches().at(-1)!.body!.search).toEqual({ filter: { visible: true }, search: { expression: "roses" }, cursorPaging: { limit: 20 } });

    // A category includes its subcategories.
    const bouquets = await call("GET", "/store/products", { query: { category: String(id("c-bouquets")), orderby: "price_desc" } });
    expect(searches().at(-1)!.body!.search).toMatchObject({
      filter: { visible: true, "allCategoriesInfo.categories": { $matchItems: [{ id: { $in: ["c-bouquets"] } }] } },
      sort: [{ fieldName: "actualPriceRange.minValue.amount", order: "DESC" }],
    });
    expect((bouquets.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([id("p-vase"), id("p-gift"), id("p-roses")]);

    const titles = await call("GET", "/store/products", { query: { orderby: "title" } });
    expect((titles.body as { items: { name: string }[] }).items.map((i) => i.name)).toEqual(["Gift Card", "Glass Vase", "Red Roses"]);

    const ids = await call("GET", "/store/products", { query: { ids: `${id("p-vase")},${id("p-roses")},5` } });
    expect((ids.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([id("p-vase"), id("p-roses")]);

    const unknown = await call("GET", "/store/products", { query: { category: "999" } });
    expect((unknown.body as { items: unknown[] }).items).toEqual([]);
    expect((await call("GET", "/store/products", { query: { category: "abc" } })).status).toBe(400);
  });

  it("lists products on sale and builds the home screen", async () => {
    const product = PRODUCTS[2]!;
    const saved = product.variants[0]!.price;
    product.variants[0]!.price = { actualPrice: money("200.00"), compareAtPrice: money("250.00") };
    try {
      const sale = await call("GET", "/store/products", { query: { on_sale: "true" } });
      expect(sale.body).toMatchObject({
        total: 1,
        items: [{ id: id("p-vase"), price: { amount: "200.00", regular_amount: "250.00", regular_formatted: "₺250.00", on_sale: true } }],
      });
      const home = await call("GET", "/store/home");
      const sections = (home.body as { sections: { type: string; products?: { id: number }[] }[] }).sections;
      expect(sections.map((s) => s.type)).toEqual(["categories", "sale_products", "new_products"]);
      expect(sections[2]!.products!.map((p) => p.id)).toEqual([id("p-roses"), id("p-gift"), id("p-vase")]);
    } finally {
      product.variants[0]!.price = saved;
    }
  });

  it("shows a product with its options and variations", async () => {
    const result = await call("GET", "/store/products/{product_id}", { params: [String(id("p-roses"))] });
    expect(result.body).toMatchObject({
      id: id("p-roses"),
      description_html: "<p>Red Roses</p>",
      images: [
        { url: "https://static.wixstatic.com/media/p-roses~mv2.jpg", alt: "Red Roses" },
        { url: "https://static.wixstatic.com/media/p-roses-side~mv2.jpg", alt: "Side" },
      ],
      attributes: [{ slug: "size", name: "Size", variation: true, options: [{ value: "Small", label: "Small" }, { value: "Large", label: "Large" }] }],
      variations: [
        {
          id: id("v-small"),
          attributes: { size: "Small" },
          price: { formatted: "₺40.00", on_sale: false },
          image_url: "https://static.wixstatic.com/media/small~mv2.jpg",
          stock_status: "in_stock",
          purchasable: true,
        },
        { id: id("v-large"), attributes: { size: "Large" }, price: { on_sale: true, regular_formatted: "₺70.00", amount: "60.00" }, image_url: null },
      ],
      categories: [{ id: id("c-roses"), name: "Roses", parent_id: id("c-bouquets") }],
      related: [{ id: id("p-vase") }],
      sku: null,
      external_url: null,
      permalink: "https://www.rose.example/product-page/red-roses",
    });
    const simple = await call("GET", "/store/products/{product_id}", { params: [String(id("p-gift"))] });
    expect(simple.body).toMatchObject({ type: "simple", attributes: [], variations: [], sku: "SKU-v-gift", digital: true });
    expect((await call("GET", "/store/products/{product_id}", { params: ["999"] })).status).toBe(404);
    expect((await call("GET", "/store/products/{product_id}", { params: [String(id("p-hidden"))] })).status).toBe(404);
    expect((await call("GET", "/store/products/{product_id}/reviews", { params: [String(id("p-roses"))] })).body).toMatchObject({
      code: "feature_disabled",
    });
  });

  it("finds a product by its number on a fresh server", async () => {
    clearWixCache();
    const fresh = new WixConnector(SETTINGS, wix.fetcher);
    const result = await call("GET", "/store/products/{product_id}", { params: [String(id("p-vase"))], on: fresh });
    expect(result.body).toMatchObject({ name: "Glass Vase", stock_status: "out_of_stock" });
  });

  it("prices the cart from the store", async () => {
    await call("GET", "/store/products");
    const result = await call("POST", "/store/cart", {
      query: { platform: "android" },
      body: {
        lines: [
          { product_id: id("p-roses"), variation_id: id("v-large"), quantity: 3 },
          { product_id: id("p-gift"), quantity: 1 },
          { product_id: id("p-vase"), quantity: 1 },
          { product_id: id("p-roses"), quantity: 1 },
          { product_id: 12345, quantity: 1 },
        ],
      },
    });
    expect(result.body).toMatchObject({
      item_count: 4,
      subtotal: "₺280.00",
      subtotal_amount: "280.00",
      currency: "TRY",
      lines: [
        { name: "Red Roses - Large", quantity: 3, available: true, problem: null, unit_price: "₺60.00", line_total: "₺180.00", max_quantity: null, digital: false },
        { name: "Gift Card", digital: true, available: true, problem: null, unit_price: "₺100.00" },
        { name: "Glass Vase", available: false, problem: "Out of stock." },
        { name: "Red Roses", available: false, problem: "This product is no longer available." },
        { name: "Unavailable product", available: false },
      ],
    });
    expect((await call("POST", "/store/cart", { body: { lines: [] } })).status).toBe(400);
  });

  it("opens Wix's checkout with the cart's lines", async () => {
    await call("GET", "/store/products");
    const changed = await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines: [{ product_id: id("p-vase"), quantity: 1 }] } });
    expect(changed).toMatchObject({ status: 409, body: { code: "cart_changed" } });

    // iOS: digital products can't be bought in the iPhone app; physical ones can.
    const ios = await call("POST", "/store/checkout-link", { query: { platform: "ios" }, body: { lines: [{ product_id: id("p-gift"), quantity: 1 }] } });
    expect(ios).toMatchObject({ status: 403, body: { code: "purchase_not_allowed" } });
    expect(wix.calls.some((c) => c.path === "/ecom/v1/checkouts")).toBe(false);

    const link = await call("POST", "/store/checkout-link", {
      query: { platform: "ios" },
      body: {
        lines: [
          { product_id: id("p-roses"), variation_id: id("v-small"), quantity: 2 },
          { product_id: id("p-roses"), variation_id: id("v-large"), quantity: 1 },
        ],
      },
      user: customer,
    });
    expect(link.body).toEqual({
      url: "https://www.rose.example/checkout?checkoutId=checkout-1",
      expires_at: "2026-10-13T10:05:00.000Z",
      open_in: "in_app",
    });
    expect(wix.calls.find((c) => c.path === "/ecom/v1/checkouts")!.body).toEqual({
      lineItems: [
        { quantity: 2, catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: "p-roses", options: { variantId: "v-small" } } },
        { quantity: 1, catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: "p-roses", options: { variantId: "v-large" } } },
      ],
      channelType: "WEB",
    });
    expect(wix.calls.find((c) => c.path === "/redirect-session/v1/redirect-session")!.body).toEqual({ ecomCheckout: { checkoutId: "checkout-1" } });

    // With the store's address, shoppers come back to it; Android sells digital products.
    const own = new WixConnector({ ...SETTINGS, storefront: "www.rose.example" }, wix.fetcher);
    const android = await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines: [{ product_id: id("p-gift"), quantity: 1 }] }, on: own });
    expect(android.status).toBe(200);
    expect(wix.calls.filter((c) => c.path === "/redirect-session/v1/redirect-session").at(-1)!.body).toEqual({
      ecomCheckout: { checkoutId: "checkout-1" },
      callbacks: { postFlowUrl: "https://www.rose.example" },
    });
    expect((await call("POST", "/store/checkout-link", { query: { platform: "web" }, body: { lines: [] } })).status).toBe(400);

    // A redirect that isn't https is never handed to the app.
    clearWixCache();
    const odd = fakeWix({ checkoutUrl: "javascript:alert(1)" });
    const oddLink = await new WixConnector(SETTINGS, odd.fetcher).handle({
      method: "POST",
      path: ["store", "checkout-link"],
      query: new URLSearchParams({ platform: "android" }),
      body: { lines: [{ product_id: id("p-gift"), quantity: 1 }] },
      user: null,
      now: NOW,
    });
    expect(oddLink).toMatchObject({ status: 409 });
  });

  it("says when the store can't be reached", async () => {
    // Wix down, and a client ID Wix no longer accepts.
    const cases: [ReturnType<typeof fakeWix>, { clientId: string }][] = [
      [fakeWix({ down: true }), SETTINGS],
      [wix, { clientId: "99999999-9999-9999-9999-999999999999" }],
    ];
    for (const [fake, settings] of cases) {
      clearWixCache();
      const broken = new WixConnector(settings, fake.fetcher);
      const result = await broken.handle({ method: "GET", path: ["store", "products"], query: new URLSearchParams(), body: undefined, user: null, now: NOW });
      expect(result).toMatchObject({ status: 503, body: { code: "shop_unavailable" } });
      expectContract("GET", "/store/products", result!);
      await expect(broken.check()).rejects.toThrow();
    }
  });

  it("finds a phone account's orders by its exact verified number", async () => {
    const phoneUser = { ...customer, email: "sara@example.com" };
    const result = await call("GET", "/me/orders", { user: phoneUser });
    // o-2: their Wix contact; o-3 and o-7: placed or delivered with their number. Not o-4 (a longer number),
    // o-5 (still being placed), o-1 (an email a phone account never proved) or o-6 (no phone at all).
    expect(result.body).toMatchObject({
      page: 1,
      total: 3,
      total_pages: 1,
      items: [
        {
          id: id("o-2"),
          number: "10002",
          status: "pending",
          status_label: "Awaiting payment",
          total: "₺100.00",
          created_at: "2026-10-11T09:00:00.000Z",
          items: [{ name: "Red Roses - Large", product_id: id("p-roses"), quantity: 1, image_url: "https://static.wixstatic.com/media/p-roses~mv2.jpg" }],
        },
        { id: id("o-3"), status: "cancelled", status_label: "Cancelled" },
        { id: id("o-7"), status: "refunded", status_label: "Refunded" },
      ],
    });
    // Contacts are compared exactly: only contact-1 (contact-2's number is longer, contact-3's has no country code).
    const byContact = wix.calls.find((c) => c.path === "/ecom/v1/orders/search" && JSON.stringify(c.body ?? null).includes("buyerInfo.contactId"))!;
    expect(byContact.body).toMatchObject({ search: { filter: { "buyerInfo.contactId": { $in: ["contact-1"] } } } });
    expect(byContact.headers.get("authorization")).toBe(API_KEY);
    expect(byContact.headers.get("wix-site-id")).toBe(SITE_ID);
    expect(wix.calls.some((c) => JSON.stringify(c.body ?? null).includes("buyerInfo.email"))).toBe(false);

    const paged = await call("GET", "/me/orders", { query: { per_page: "2", page: "2" }, user: phoneUser });
    expect(paged.body).toMatchObject({ page: 2, total: 3, total_pages: 2, items: [{ id: id("o-7") }] });

    const nobody = await call("GET", "/me/orders", { user: { ...customer, phone: "+905000000000" } });
    expect(nobody.body).toMatchObject({ total: 0, items: [] });
    expect((await call("GET", "/me/orders")).status).toBe(401);
  });

  it("finds an email account's orders by its exact address, and nothing for an account without either", async () => {
    const emailUser = { ...customer, phone: null, email: "Sara@Example.com" };
    const result = await call("GET", "/me/orders", { user: emailUser });
    expect(result.body).toMatchObject({
      total: 1,
      items: [{ id: id("o-1"), number: "10001", status: "completed", status_label: "Completed", total: "₺950.00" }],
    });
    expect(wix.calls.find((c) => JSON.stringify(c.body ?? null).includes("buyerInfo.email"))!.body).toMatchObject({
      search: { filter: { "buyerInfo.email": { $eq: "sara@example.com" } }, sort: [{ fieldName: "createdDate", order: "DESC" }] },
    });
    // No phone lookups for an email account.
    expect(wix.calls.some((c) => c.path === "/contacts/v4/contacts/query")).toBe(false);

    const before = wix.calls.length;
    const none = await call("GET", "/me/orders", { user: { ...customer, phone: null, email: null } });
    expect(none.body).toMatchObject({ total: 0, items: [] });
    const unchecked = await call("GET", "/me/orders", { user: { ...customer, phone: "0532 123 45 67", email: null } });
    expect(unchecked.body).toMatchObject({ total: 0, items: [] });
    // An empty phone or email never asks Wix for anything.
    expect(wix.calls.length).toBe(before);
  });

  it("still finds orders by their own phone numbers when the key can't read contacts", async () => {
    clearWixCache();
    const noContacts = fakeWix({ contactsStatus: 403 });
    const result = await call("GET", "/me/orders", { user: { ...customer, email: null }, on: new WixConnector(WITH_ORDERS, noContacts.fetcher) });
    expect((result.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([id("o-3"), id("o-7")]);
  });

  it("leaves other endpoints to the hosted API", async () => {
    expect(await connector.handle({ method: "GET", path: ["me", "courses"], query: new URLSearchParams(), body: undefined, user: null, now: NOW })).toBeNull();
  });
});

describe("Wix platform", () => {
  it("registers itself with its fields", () => {
    expect(platformDefinition("wix")).toBe(WIX_PLATFORM);
    expect(WIX_PLATFORM).toMatchObject({ id: "wix", name: "Wix", appType: "store" });
    expect(WIX_PLATFORM.fields.map((f) => [f.name, f.secret, f.optional ?? false])).toEqual([
      ["clientId", false, false],
      ["apiKey", true, true],
      ["siteId", false, true],
      ["storefront", false, true],
    ]);
  });

  it("normalizes what the client typed", () => {
    expect(
      WIX_PLATFORM.normalize({
        clientId: ` ${CLIENT_ID.toUpperCase()} `,
        apiKey: ` ${API_KEY} `,
        siteId: `https://manage.wix.com/dashboard/${SITE_ID}/home`,
        storefront: "https://www.Rose.example/",
      }),
    ).toEqual({ values: { clientId: CLIENT_ID, apiKey: API_KEY, siteId: SITE_ID, storefront: "www.rose.example" } });
    expect(WIX_PLATFORM.normalize({ clientId: CLIENT_ID, apiKey: "", siteId: "", storefront: "" })).toEqual({
      values: { clientId: CLIENT_ID, apiKey: "", siteId: "", storefront: "" },
    });
    expect(WIX_PLATFORM.normalize({ clientId: "not-an-id", apiKey: "", siteId: "", storefront: "not a host" })).toEqual({
      errors: { clientId: expect.any(String), storefront: expect.any(String) },
    });
    // The key and the site ID go together.
    expect(WIX_PLATFORM.normalize({ clientId: CLIENT_ID, apiKey: API_KEY, siteId: "", storefront: "" })).toEqual({ errors: { siteId: expect.any(String) } });
    expect(WIX_PLATFORM.normalize({ clientId: CLIENT_ID, apiKey: "", siteId: SITE_ID, storefront: "" })).toEqual({ errors: { apiKey: expect.any(String) } });
    expect(WIX_PLATFORM.normalize({ clientId: CLIENT_ID, apiKey: API_KEY, siteId: "abc", storefront: "" })).toEqual({ errors: { siteId: expect.any(String) } });
  });

  it("creates a connector from the saved values", async () => {
    clearWixCache();
    const fake = fakeWix();
    const created = WIX_PLATFORM.create(
      { clientId: CLIENT_ID, apiKey: "", siteId: "", storefront: "" },
      { appId: "app-1", store: null as never, fetcher: fake.fetcher, saveSecrets: async () => {} },
    );
    expect(await created.check()).toBe("Wix store");
    expect((await created.config()).features).toEqual({ orders: false });
  });
});

describe("Wix helpers", () => {
  it("read IDs from what the client pasted", () => {
    expect(normalizeWixId(CLIENT_ID)).toBe(CLIENT_ID);
    expect(normalizeWixId(`https://manage.wix.com/dashboard/${SITE_ID.toUpperCase()}/home`)).toBe(SITE_ID);
    expect(normalizeWixId("my-store")).toBeNull();
  });

  it("turn Wix image references into addresses", () => {
    expect(wixImageUrl("https://static.wixstatic.com/media/a~mv2.jpg")).toBe("https://static.wixstatic.com/media/a~mv2.jpg");
    expect(wixImageUrl("wix:image://v1/abc_123~mv2.png/name.png#originWidth=10&originHeight=10")).toBe("https://static.wixstatic.com/media/abc_123~mv2.png");
    expect(wixImageUrl("abc_123~mv2.jpg")).toBe("https://static.wixstatic.com/media/abc_123~mv2.jpg");
    expect(wixImageUrl("http://insecure.example/a.jpg")).toBeNull();
    expect(wixImageUrl("")).toBeNull();
    expect(wixImageUrl(null)).toBeNull();
  });

  it("map order statuses", () => {
    const status = (s: string, payment: string, fulfillment: string) => wixOrderStatus({ status: s, paymentStatus: payment, fulfillmentStatus: fulfillment });
    expect(status("APPROVED", "PAID", "FULFILLED")).toEqual({ status: "completed", label: "Completed" });
    expect(status("APPROVED", "PAID", "NOT_FULFILLED")).toEqual({ status: "processing", label: "Processing" });
    expect(status("APPROVED", "PAID", "PARTIALLY_FULFILLED")).toEqual({ status: "processing", label: "Partly shipped" });
    expect(status("APPROVED", "NOT_PAID", "NOT_FULFILLED")).toEqual({ status: "pending", label: "Awaiting payment" });
    expect(status("APPROVED", "FULLY_REFUNDED", "FULFILLED")).toEqual({ status: "refunded", label: "Refunded" });
    expect(status("APPROVED", "PARTIALLY_REFUNDED", "FULFILLED")).toEqual({ status: "processing", label: "Partly refunded" });
    expect(status("CANCELED", "PAID", "NOT_FULFILLED")).toEqual({ status: "cancelled", label: "Cancelled" });
    expect(status("REJECTED", "DECLINED", "NOT_FULFILLED")).toEqual({ status: "failed", label: "Payment failed" });
  });

  it("format money in English with the currency's symbol", () => {
    expect(formatWixMoney(1234.5, "TRY")).toBe("₺1,234.50");
    expect(formatWixMoney(12, "USD")).toBe("$12.00");
    expect(formatWixMoney(12, "XYZ1")).toBe("12.00 XYZ1");
  });
});
