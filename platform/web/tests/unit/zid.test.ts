import { beforeEach, describe, expect, it } from "vitest";
import type { HostedUser } from "@/lib/data/types";
import { MemoryStore } from "@/lib/data/memory";
import { stableNumericId } from "@/lib/hosted/connectors/common";
import { clearTokenMemory } from "@/lib/hosted/connectors/oauth-tokens";
import { PlatformCheckError } from "@/lib/hosted/connectors/platforms";
import type { ConnectorRequest } from "@/lib/hosted/connectors/types";
import {
  clearZidCache,
  connectZid,
  ZID_API_URL,
  ZID_OAUTH_URL,
  ZID_PLATFORM,
  zidAuthorizeUrl,
  ZidConnector,
  zidDate,
  zidOrderStatus,
  zidPhone,
  zidValues,
  type ZidDeps,
} from "@/lib/hosted/connectors/zid";
import { expectContract } from "./contract";

// 25 A Zid store answering the manager API and oauth.zid.sa the way Zid documents them: two tokens on every request,
// single-use refresh tokens, and lookups as loose as possible (the customer search and the order filter answer
// everyone), so only the connector's own exact checks keep other customers' orders out.

const CLIENT = { clientId: "zid-client", clientSecret: "zid-secret", webhookSecret: null };
const DAY = 24 * 60 * 60_000;
const NOW = new Date("2026-10-13T10:00:00Z");
const sar = (n: string) => `SAR ${n}`;

const image = (name: string) => ({ id: name, image: { full_size: `https://media.zid.test/${name}-full.jpg`, large: `https://media.zid.test/${name}.jpg`, thumbnail: null }, alt_text: null });

const PRODUCTS = [
  {
    id: "4c1f9d2e-0000-4000-8000-000000000001",
    name: { en: "Dates Box", ar: "علبة تمر" },
    description: { en: "<p>Fresh dates.</p>", ar: "" },
    price: 80,
    sale_price: null,
    currency: "SAR",
    quantity: null,
    is_infinite: false,
    is_published: true,
    requires_shipping: true,
    images: [image("dates"), image("dates-side")],
    html_url: "https://dates.zid.store/products/dates-box",
    categories: [{ id: 21, name: "Dates" }],
    rating: { average: 4, total_count: 3 },
    variants: [
      { id: "v-small", sku: "D-S", price: 80, sale_price: 70, quantity: 4, is_infinite: false, is_published: true, attributes: [{ slug: "size", name: { en: "Size" }, value: { en: "Small" } }] },
      { id: "v-large", sku: "D-L", price: 120, sale_price: null, quantity: 0, is_infinite: false, is_published: true, attributes: [{ slug: "size", name: { en: "Size" }, value: { en: "Large" } }] },
    ],
  },
  {
    id: "4c1f9d2e-0000-4000-8000-000000000002",
    name: "E-book",
    price: "25.00",
    sale_price: null,
    currency: "SAR",
    is_infinite: true,
    is_published: true,
    requires_shipping: false,
    images: [image("ebook")],
    html_url: "https://dates.zid.store/products/e-book",
    categories: [{ id: 22 }],
    variants: [],
  },
  { id: "4c1f9d2e-0000-4000-8000-000000000003", name: "Draft", price: 1, is_published: false, html_url: "https://dates.zid.store/products/draft", categories: [] },
];
const DATES = stableNumericId(PRODUCTS[0]!.id);
const EBOOK = stableNumericId(PRODUCTS[1]!.id);

const CATEGORIES = [
  { id: 20, name: { en: "Food" }, products_count: 0, sub_categories: [{ id: 21, name: { en: "Dates" }, products_count: 1, image: "https://media.zid.test/c21.jpg", sub_categories: [] }] },
  { id: 22, name: "Books", products_count: 1, sub_categories: [] },
];

const CUSTOMERS = [
  { id: 1, name: "Sara", mobile: "966555123456", email: "sara@example.com" },
  { id: 2, name: "Sara again", mobile: "+966 55 512 3456", email: "" },
  // Without the country code: never anyone's.
  { id: 3, name: "Sam", mobile: "0555123456", email: "sam@example.com" },
  { id: 4, name: "Ali", mobile: "9665551234567", email: "sara@example.com.evil" },
];

const order = (id: number, customer: Record<string, unknown> | null, extra: Record<string, unknown> = {}) => ({
  id,
  code: `Z${id}`,
  order_status: { name: { en: "Delivered" }, code: "delivered" },
  currency_code: "SAR",
  order_total: "95.50",
  created_at: "2026-10-10 12:00:00",
  customer,
  products: [{ id: PRODUCTS[0]!.id, name: { en: "Dates Box" }, quantity: 1, images: [image("dates")] }],
  ...extra,
});
const ORDERS = [
  order(701, { id: 1, mobile: "966555123456", email: "sara@example.com" }),
  order(702, { id: 2, mobile: "+966555123456" }, { order_status: { code: "new" }, created_at: "2026-10-12 08:00:00" }),
  order(703, { id: 3, mobile: "0555123456", email: "sam@example.com" }),
  // A guest order placed with the number, by no customer account.
  order(704, { id: null, mobile: "00966555123456", email: null }, { created_at: "2026-10-11 08:00:00", order_status: { code: "cancelled" } }),
  order(705, { id: 4, mobile: "9665551234567", email: "sara@example.com.evil" }),
  order(706, null),
];

interface Call {
  url: URL;
  headers: Headers;
  body: string;
}

function fakeZid() {
  const calls: Call[] = [];
  let tokenRequests = 0;
  let issued = 1;
  const valid = new Set(["auth-1|manager-1"]);
  const refresh = new Set(["refresh-1"]);
  const json = (body: unknown, status = 200) => Response.json(body, { status });
  const fetcher = (async (input: string, init: RequestInit = {}) => {
    const url = new URL(input);
    const headers = new Headers(init.headers);
    const body = typeof init.body === "string" ? init.body : "";
    calls.push({ url, headers, body });
    if (input === `${ZID_OAUTH_URL}/token`) {
      tokenRequests++;
      const form = new URLSearchParams(body);
      if (form.get("client_id") !== CLIENT.clientId || form.get("client_secret") !== CLIENT.clientSecret) return json({ error: "invalid_client" }, 401);
      if (form.get("grant_type") === "authorization_code") {
        if (form.get("code") !== "code-1" || form.get("redirect_uri") !== "https://yallapp.test/oauth/zid") return json({ error: "invalid_grant" }, 400);
      } else if (!refresh.delete(form.get("refresh_token") ?? "")) return json({ error: "invalid_grant" }, 400);
      issued++;
      valid.add(`auth-${issued}|manager-${issued}`);
      refresh.add(`refresh-${issued}`);
      return json({ token_type: "Bearer", expires_in: 31536000, access_token: `manager-${issued}`, authorization: `auth-${issued}`, refresh_token: `refresh-${issued}` });
    }
    expect(input.startsWith(`${ZID_API_URL}/`)).toBe(true);
    const pair = `${headers.get("authorization")?.replace(/^Bearer /, "")}|${headers.get("x-manager-token")}`;
    if (!valid.has(pair)) return json({ message: "Unauthenticated." }, 401);
    const path = url.pathname.replace(/^\/v1/, "");
    if (path === "/managers/account/profile") return json({ user: { id: 9, name: "Owner", store: { id: 3344, title: "Dates House", url: "https://dates.zid.store/", currency: { code: "SAR" } } } });
    // Every other request names the store.
    expect(headers.get("store-id")).toBe("3344");
    expect(headers.get("role")).toBe("Manager");
    const q = url.searchParams;
    if (path === "/products/") {
      let list = [...PRODUCTS];
      if (q.get("search")) list = list.filter((p) => JSON.stringify(p.name).toLowerCase().includes(q.get("search")!.toLowerCase()));
      if (q.get("categories")) list = list.filter((p) => p.categories.some((c) => c.id === Number(q.get("categories"))));
      const size = Number(q.get("page_size") ?? 10);
      const page = Number(q.get("page") ?? 1);
      const results = list.slice((page - 1) * size, page * size);
      return json({ count: list.length, next: page * size < list.length ? `${input}&next` : null, previous: null, results });
    }
    const one = /^\/products\/([\w-]+)\/$/.exec(path);
    if (one) {
      const found = PRODUCTS.find((p) => p.id === one[1]);
      return found ? json(found) : json({ message: "Not found" }, 404);
    }
    if (path === "/managers/store/categories") return json({ categories: CATEGORIES });
    if (path === "/managers/store/customers") return json({ customers: CUSTOMERS });
    if (path === "/managers/store/orders") return json({ orders: ORDERS, total_order_count: ORDERS.length });
    throw new Error(`Unexpected request: ${input}`);
  }) as unknown as typeof fetch;
  return { fetcher, calls, tokenRequests: () => tokenRequests, valid, refresh };
}

const VALUES = {
  storeId: "3344",
  storeName: "Dates House",
  storeUrl: "https://dates.zid.store/",
  currency: "SAR",
  authorizationToken: "auth-1",
  accessToken: "manager-1",
  refreshToken: "refresh-1",
  tokenExpiresAt: String(Date.now() + 100 * DAY),
};

const user = (extra: Partial<HostedUser>): HostedUser => ({
  id: 7,
  appId: "app-1",
  phone: "+966555123456",
  name: "Sara",
  email: null,
  city: null,
  notificationsReadAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...extra,
});

describe("Zid connector", () => {
  let zid: ReturnType<typeof fakeZid>;
  let saved: Record<string, string>[];
  let connector: ZidConnector;

  const deps = (extra: Partial<ZidDeps> = {}): ZidDeps => ({
    appId: "app-1",
    store: new MemoryStore(),
    fetcher: zid.fetcher,
    saveSecrets: async (secrets) => {
      saved.push(secrets);
    },
    loadSecrets: async () => null,
    partnerApp: async () => CLIENT,
    ...extra,
  });

  beforeEach(() => {
    clearZidCache();
    clearTokenMemory();
    zid = fakeZid();
    saved = [];
    connector = new ZidConnector(zidValues(VALUES), deps());
  });

  async function call(method: string, route: string, options: { query?: Record<string, string>; body?: unknown; user?: HostedUser | null; params?: string[]; on?: ZidConnector } = {}) {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const request: ConnectorRequest = { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, user: options.user ?? null, now: NOW };
    const result = await (options.on ?? connector).handle(request);
    expect(result, `${method} ${concrete} is answered`).not.toBeNull();
    expectContract(method, route, result!);
    return result!;
  }

  it("sends both tokens and the store, checks the profile and one product", async () => {
    expect(await connector.check()).toBe("Dates House");
    const [profile, products] = zid.calls;
    expect(profile!.headers.get("authorization")).toBe("Bearer auth-1");
    expect(profile!.headers.get("x-manager-token")).toBe("manager-1");
    expect(products!.url.pathname).toBe("/v1/products/");
    expect(products!.url.searchParams.get("page_size")).toBe("1");
    expect(await connector.config()).toMatchObject({ store: { currency: "SAR", checkout_opens_in: "browser", reviews: false }, features: { orders: true } });
    await expect(new ZidConnector(zidValues({}), deps()).check()).rejects.toThrow(/Connect your Zid store first/);
    zid.valid.clear();
    zid.refresh.clear();
    clearZidCache();
    const revoked = (await new ZidConnector(zidValues(VALUES), deps()).check().catch((e: unknown) => e)) as Error;
    expect(revoked).toBeInstanceOf(PlatformCheckError);
    expect(revoked.message).toMatch(/no longer gives Yallapp access/);
  });

  it("lists products with stable numbers, variant prices, stock and digital flags", async () => {
    const body = (await call("GET", "/store/products")).body as { total: number; items: Record<string, unknown>[] };
    expect(body.items.map((p) => p.id)).toEqual([DATES, EBOOK]);
    expect(body.items[0]).toMatchObject({ name: "Dates Box", type: "variable", rating: 4, rating_count: 3, digital: false, stock_status: "in_stock", image_url: "https://media.zid.test/dates.jpg" });
    expect(body.items[0]!.price).toMatchObject({ amount: "70.00", regular_amount: "80.00", on_sale: true, range: true, formatted: `${sar("70.00")} – ${sar("120.00")}` });
    expect(body.items[1]).toMatchObject({ name: "E-book", type: "simple", digital: true, price: expect.objectContaining({ amount: "25.00" }) });

    await call("GET", "/store/products", { query: { search: "dates", category: "21" } });
    const last = zid.calls.filter((c) => c.url.pathname === "/v1/products/").pop()!;
    expect(last.url.searchParams.get("search")).toBe("dates");
    expect(last.url.searchParams.get("categories")).toBe("21");
    const sale = (await call("GET", "/store/products", { query: { on_sale: "1" } })).body as { items: { id: number }[] };
    expect(sale.items.map((p) => p.id)).toEqual([DATES]);
    // A number this server hasn't seen yet is found by reading the products.
    clearZidCache();
    const byIds = (await call("GET", "/store/products", { query: { ids: `${EBOOK},12345` }, on: new ZidConnector(zidValues(VALUES), deps()) })).body as { items: { id: number }[] };
    expect(byIds.items.map((p) => p.id)).toEqual([EBOOK]);
  });

  it("gives a product with its variants, images, categories and page; categories come flattened", async () => {
    await call("GET", "/store/products");
    const p = (await call("GET", "/store/products/{product_id}", { params: [String(DATES)] })).body as Record<string, unknown> & { variations: Record<string, unknown>[] };
    expect(p.attributes).toEqual([{ slug: "size", name: "Size", variation: true, options: [{ value: "Small", label: "Small" }, { value: "Large", label: "Large" }] }]);
    expect(p.variations).toEqual([
      expect.objectContaining({ id: stableNumericId("v-small"), attributes: { size: "Small" }, stock_status: "in_stock", price: expect.objectContaining({ amount: "70.00", on_sale: true }) }),
      expect.objectContaining({ id: stableNumericId("v-large"), attributes: { size: "Large" }, stock_status: "out_of_stock", purchasable: false }),
    ]);
    expect(p.images).toEqual([
      { url: "https://media.zid.test/dates.jpg", alt: "Dates Box" },
      { url: "https://media.zid.test/dates-side.jpg", alt: "Dates Box" },
    ]);
    expect(p.description_html).toBe("<p>Fresh dates.</p>");
    expect(p.permalink).toBe("https://dates.zid.store/products/dates-box");
    expect(p.categories).toEqual([{ id: 21, name: "Dates", count: 1, parent_id: 20, image_url: "https://media.zid.test/c21.jpg" }]);
    expect((await call("GET", "/store/products/{product_id}", { params: ["999"] })).status).toBe(404);
    const categories = (await call("GET", "/store/categories")).body as { items: { id: number; parent_id: number | null }[] };
    expect(categories.items.map((c) => [c.id, c.parent_id])).toEqual([
      [20, null],
      [21, 20],
      [22, null],
    ]);
  });

  it("prices the cart and hands one product off to its page; digital products aren't sold on iOS", async () => {
    // Numbers not seen yet: the products are read to find them.
    const small = stableNumericId("v-small");
    const cart = (await call("POST", "/store/cart", { body: { lines: [{ product_id: DATES, variation_id: small, quantity: 2 }] } })).body as Record<string, unknown>;
    expect(cart).toMatchObject({ item_count: 2, subtotal: sar("140.00"), currency: "SAR" });
    const link = await call("POST", "/store/checkout-link", { query: { platform: "ios" }, body: { lines: [{ product_id: DATES, variation_id: small, quantity: 1 }] } });
    expect(link.body).toMatchObject({ url: "https://dates.zid.store/products/dates-box", open_in: "browser" });
    const ebook = await call("POST", "/store/checkout-link", { query: { platform: "ios" }, body: { lines: [{ product_id: EBOOK, variation_id: null, quantity: 1 }] } });
    expect(ebook).toMatchObject({ status: 403, body: { code: "purchase_not_allowed" } });
    const two = await call("POST", "/store/checkout-link", {
      query: { platform: "android" },
      body: { lines: [{ product_id: DATES, variation_id: small, quantity: 1 }, { product_id: EBOOK, variation_id: null, quantity: 1 }] },
    });
    expect(two).toMatchObject({ status: 409, body: { code: "one_product_at_a_time" } });
    const large = await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines: [{ product_id: DATES, variation_id: stableNumericId("v-large"), quantity: 1 }] } });
    expect(large).toMatchObject({ status: 409, body: { code: "cart_changed" } });
  });

  it("finds orders only with exactly the verified phone, or the exact email of an email account", async () => {
    const phone = (await call("GET", "/me/orders", { user: user({}) })).body as { items: { id: number; number: string; status: string; total: string; created_at: string; items: { product_id: number | null }[] }[] };
    // 701 (customer 1), 702 (customer 2) and the guest order 704 placed with the number; not 703 (no country code), 705 (a longer number) or 706.
    expect(phone.items.map((o) => o.id)).toEqual([702, 704, 701]);
    expect(phone.items[0]).toMatchObject({ number: "Z702", status: "pending", total: sar("95.50"), created_at: "2026-10-12T05:00:00.000Z" });
    expect(phone.items[1]).toMatchObject({ status: "cancelled" });
    expect(phone.items[2]!.items[0]!.product_id).toBe(DATES);
    const email = (await call("GET", "/me/orders", { user: user({ phone: null, email: "sara@example.com" }) })).body as { items: { id: number }[] };
    expect(email.items.map((o) => o.id)).toEqual([701]);

    zid.calls.length = 0;
    const none = (await call("GET", "/me/orders", { user: user({ phone: null, email: null }) })).body as { items: unknown[] };
    expect(none.items).toEqual([]);
    expect(zid.calls).toEqual([]);
    const typedEmail = (await call("GET", "/me/orders", { user: user({ phone: "+905321234567", email: "sara@example.com" }) })).body as { items: unknown[] };
    expect(typedEmail.items).toEqual([]);
  });

  it("renews both tokens once when Zid refuses them, and saves the new set", async () => {
    zid.valid.delete("auth-1|manager-1");
    const a = new ZidConnector(zidValues(VALUES), deps());
    const b = new ZidConnector(zidValues(VALUES), deps());
    const [first, second] = await Promise.all([call("GET", "/store/categories", { on: a }), call("GET", "/store/products", { on: b })]);
    expect([first.status, second.status]).toEqual([200, 200]);
    expect(zid.tokenRequests()).toBe(1);
    expect(saved).toEqual([{ authorizationToken: "auth-2", accessToken: "manager-2", refreshToken: "refresh-2", tokenExpiresAt: expect.stringMatching(/^\d+$/) }]);
    expect(zid.calls.at(-1)!.headers.get("x-manager-token")).toBe("manager-2");
  });

  it("reads Zid's numbers, statuses and dates", () => {
    expect(zidPhone("966555123456")).toBe("+966555123456");
    expect(zidPhone("+966 55 512 3456")).toBe("+966555123456");
    expect(zidPhone("00966555123456")).toBe("+966555123456");
    expect(zidPhone("0555123456")).toBeNull();
    expect(zidPhone("555123456")).toBeNull();
    expect(zidPhone("")).toBeNull();
    expect(zidPhone(null)).toBeNull();
    expect(zidOrderStatus("indelivery")).toEqual({ status: "processing", label: "Out for delivery" });
    expect(zidOrderStatus("reversed")).toEqual({ status: "refunded", label: "Refunded" });
    expect(zidDate("2026-10-01 09:00:00")).toBe("2026-10-01T06:00:00.000Z");
    expect(zidDate("2026-10-01T09:00:00Z")).toBe("2026-10-01T09:00:00.000Z");
    expect(zidDate("")).toBeNull();
  });
});

describe("Zid OAuth", () => {
  it("sends the owner to Zid's approval page and swaps the code for both tokens and the store", async () => {
    const url = new URL(zidAuthorizeUrl("zid-client", "https://yallapp.test/oauth/zid", "state-1"));
    expect(`${url.origin}${url.pathname}`).toBe("https://oauth.zid.sa/oauth/authorize");
    expect(Object.fromEntries(url.searchParams)).toEqual({ client_id: "zid-client", redirect_uri: "https://yallapp.test/oauth/zid", response_type: "code", state: "state-1" });
    clearTokenMemory();
    const zid = fakeZid();
    const values = await connectZid("code-1", CLIENT, "https://yallapp.test/oauth/zid", zid.fetcher);
    expect(values).toEqual({
      authorizationToken: "auth-2",
      accessToken: "manager-2",
      refreshToken: "refresh-2",
      tokenExpiresAt: expect.stringMatching(/^\d+$/),
      storeId: "3344",
      storeName: "Dates House",
      storeUrl: "https://dates.zid.store/",
      currency: "SAR",
    });
    expect(Object.fromEntries(new URLSearchParams(zid.calls[0]!.body))).toMatchObject({ grant_type: "authorization_code", code: "code-1", redirect_uri: "https://yallapp.test/oauth/zid" });
    await expect(connectZid("old", CLIENT, "https://yallapp.test/oauth/zid", zid.fetcher)).rejects.toThrow(/refused the code/);
    expect(ZID_PLATFORM.oauth!.storeName(values)).toBe("Dates House");
  });
});
