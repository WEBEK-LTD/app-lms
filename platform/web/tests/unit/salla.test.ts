import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { HostedUser } from "@/lib/data/types";
import { MemoryStore } from "@/lib/data/memory";
import { clearTokenMemory } from "@/lib/hosted/connectors/oauth-tokens";
import { readOAuthState, signOAuthState } from "@/lib/hosted/connectors/partner-apps";
import { platformConnectorConfig, platformDefinition, platformValues, PlatformCheckError } from "@/lib/hosted/connectors/platforms";
import "@/lib/hosted/connectors/registry";
import {
  clearSallaCache,
  connectSalla,
  SALLA_ACCOUNTS_URL,
  SALLA_API_URL,
  SALLA_PLATFORM,
  sallaAuthorizeUrl,
  SallaConnector,
  sallaDate,
  sallaOrderStatus,
  sallaPhone,
  sallaValues,
  type SallaDeps,
} from "@/lib/hosted/connectors/salla";
import { handleSallaWebhook } from "@/lib/hosted/connectors/salla-webhook";
import type { ConnectorRequest } from "@/lib/hosted/connectors/types";
import { encryptSetting } from "@/lib/settings/platform";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { expectContract } from "./contract";
import { KEY } from "./helpers";

// 25 A Salla store answering the Merchant API and accounts.salla.sa the way Salla documents them, for the requests
// the connector sends. Refresh tokens work once, as on Salla; lookups are as loose as possible (the customer search and
// the order filter answer everyone), so only the connector's own exact checks keep other customers' orders out.

const CLIENT = { clientId: "salla-client", clientSecret: "salla-secret", webhookSecret: "hook-secret" };
const DAY = 24 * 60 * 60_000;
const NOW = new Date("2026-10-13T10:00:00Z");

const money = (amount: number) => ({ amount, currency: "SAR" });

const PRODUCTS = [
  {
    id: 101,
    name: "Oud Perfume",
    description: "<p>Rich oud.</p>",
    type: "product",
    status: "sale",
    price: money(100),
    regular_price: money(100),
    sale_price: money(0),
    quantity: 20,
    unlimited_quantity: false,
    is_available: true,
    max_items_per_user: 0,
    main_image: "https://cdn.salla.test/101.jpg",
    images: [
      { id: 1, url: "https://cdn.salla.test/101.jpg", main: true, alt: "Oud", type: "image" },
      { id: 2, url: "https://cdn.salla.test/101.mp4", main: false, type: "video" },
      { id: 3, url: "https://cdn.salla.test/101-side.jpg", main: false, alt: null, type: "image" },
    ],
    urls: { customer: "https://oud.example/oud-perfume/p101", admin: "https://s.salla.sa/products/101" },
    categories: [{ id: 11, name: "Perfume" }],
    options: [
      {
        id: 31,
        name: "Size",
        values: [
          { id: 1001, name: "50 ml" },
          { id: 1002, name: "100 ml" },
        ],
      },
    ],
    skus: [
      { id: 5001, price: money(100), regular_price: money(100), sale_price: money(0), stock_quantity: 5, related_option_values: [1001] },
      { id: 5002, price: money(150), regular_price: money(150), sale_price: money(120), stock_quantity: 0, related_option_values: [1002] },
    ],
    rating: { total: 18, count: 4, rate: 4.5 },
  },
  {
    id: 102,
    name: "Gift Card",
    type: "codes",
    status: "sale",
    price: money(50),
    regular_price: money(50),
    sale_price: money(0),
    unlimited_quantity: true,
    main_image: "https://cdn.salla.test/102.jpg",
    images: [],
    urls: { customer: "https://oud.example/gift-card/p102" },
    categories: [{ id: 12 }],
    options: [],
    skus: [],
  },
  {
    id: 103,
    name: "Incense",
    type: "product",
    status: "out",
    price: money(30),
    regular_price: money(30),
    sale_price: money(25),
    quantity: 0,
    main_image: "https://cdn.salla.test/103.jpg",
    urls: { customer: "https://oud.example/incense/p103" },
    categories: [{ id: 11 }],
    options: [],
    skus: [],
  },
  { id: 104, name: "Hidden Box", type: "product", status: "hidden", price: money(10), urls: { customer: "https://oud.example/p104" }, categories: [] },
];

const CATEGORIES = [
  { id: 10, name: "Fragrance", status: "active", items: [{ id: 11, name: "Perfume", parent_id: 10, status: "active", image: "https://cdn.salla.test/c11.jpg" }] },
  { id: 12, name: "Gifts", status: "active", items: [] },
  { id: 13, name: "Old", status: "hidden", items: [] },
];

const CUSTOMERS = [
  { id: 1, first_name: "Sara", mobile: "555123456", mobile_code: "+966", email: "sara@example.com" },
  // The same number written with its trunk 0 and a code without "+".
  { id: 2, first_name: "Sara", mobile: "0555123456", mobile_code: "966", email: "" },
  // No country code: never anyone's.
  { id: 3, first_name: "Sam", mobile: "555123456", mobile_code: "", email: "sam@example.com" },
  // A longer number that starts the same way.
  { id: 4, first_name: "Ali", mobile: "5551234567", mobile_code: "+966", email: "SARA@example.com.evil" },
  { id: 5, first_name: "Nobody", mobile: null, mobile_code: null, email: null },
];

const order = (id: number, customer: number | null, extra: Record<string, unknown> = {}) => ({
  id,
  reference_id: id + 10_000,
  total: money(250),
  date: { date: "2026-10-10 12:00:00.000000", timezone_type: 3, timezone: "Asia/Riyadh" },
  status: { id: 1, name: "مكتمل", slug: "completed" },
  items: [{ name: "Oud Perfume", quantity: 2, product_id: 101, thumbnail: "https://cdn.salla.test/101.jpg" }],
  ...(customer === null ? {} : { customer: { id: customer } }),
  ...extra,
});
const ORDERS = [
  order(9001, 1),
  order(9002, 2, { status: { slug: "payment_pending", name: "بانتظار الدفع" }, date: { date: "2026-10-12 08:00:00.000000", timezone: "Asia/Riyadh" } }),
  order(9003, 3),
  // Lists without the customer: the order's own page says whose it is.
  order(9004, null, { date: { date: "2026-10-11 08:00:00.000000", timezone: "Asia/Riyadh" } }),
  order(9005, null),
];
const ORDER_OWNERS: Record<number, number> = { 9001: 1, 9002: 2, 9003: 3, 9004: 1, 9005: 4 };

interface Call {
  method: string;
  url: URL;
  headers: Headers;
  body: string;
}

function fakeSalla(options: { productsStatus?: number; revoked?: string[] } = {}) {
  const calls: Call[] = [];
  let tokenRequests = 0;
  let issued = 1;
  const access = new Set(["access-1"]);
  const refresh = new Set(["refresh-1"]);
  const revoked = new Set(options.revoked ?? []);
  const json = (body: unknown, status = 200) => Response.json(body, { status });
  const fetcher = (async (input: string, init: RequestInit = {}) => {
    const url = new URL(input);
    const headers = new Headers(init.headers);
    const body = typeof init.body === "string" ? init.body : "";
    calls.push({ method: init.method ?? "GET", url, headers, body });
    if (`${url.origin}${url.pathname}` === `${SALLA_ACCOUNTS_URL}/token`) {
      tokenRequests++;
      expect(headers.get("content-type")).toBe("application/x-www-form-urlencoded");
      const form = new URLSearchParams(body);
      if (form.get("client_id") !== CLIENT.clientId || form.get("client_secret") !== CLIENT.clientSecret) return json({ error: "invalid_client" }, 401);
      if (form.get("grant_type") === "authorization_code") {
        if (form.get("code") !== "code-1" || form.get("redirect_uri") !== "https://yallapp.test/oauth/salla") return json({ error: "invalid_grant" }, 400);
      } else if (form.get("grant_type") === "refresh_token") {
        // Single use: a refresh token is gone once used.
        if (!refresh.delete(form.get("refresh_token") ?? "")) return json({ error: "invalid_grant" }, 400);
      } else return json({ error: "unsupported_grant_type" }, 400);
      issued++;
      access.add(`access-${issued}`);
      refresh.add(`refresh-${issued}`);
      return json({ access_token: `access-${issued}`, refresh_token: `refresh-${issued}`, expires_in: 1209600, token_type: "bearer", scope: "offline_access" });
    }
    const token = headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
    if (!access.has(token) || revoked.has(token)) return json({ status: 401, success: false, error: { code: "Unauthorized" } }, 401);
    if (`${url.origin}${url.pathname}` === `${SALLA_ACCOUNTS_URL}/user/info`) {
      return json({ status: 200, success: true, data: { id: 77, name: "Owner", merchant: { id: 123456, username: "oud", name: "Oud House", domain: "https://oud.example" } } });
    }
    expect(input.startsWith(`${SALLA_API_URL}/`)).toBe(true);
    const path = url.pathname.replace(/^\/admin\/v2/, "");
    const q = url.searchParams;
    if (path === "/store/info") return json({ status: 200, success: true, data: { id: 123456, name: "Oud House", currency: "SAR", domain: "https://oud.example" } });
    if (path === "/products") {
      if (options.productsStatus) return json({ status: options.productsStatus, success: false }, options.productsStatus);
      let list = PRODUCTS.filter((p) => p.status !== "deleted");
      if (q.get("keyword")) list = list.filter((p) => p.name.toLowerCase().includes(q.get("keyword")!.toLowerCase()));
      if (q.get("category")) list = list.filter((p) => (p.categories ?? []).some((c) => c.id === Number(q.get("category"))));
      const perPage = Number(q.get("per_page") ?? 15);
      const page = Number(q.get("page") ?? 1);
      expect(perPage).toBeLessThanOrEqual(50);
      return json({
        status: 200,
        success: true,
        data: list.slice((page - 1) * perPage, page * perPage),
        pagination: { count: Math.min(perPage, list.length), total: list.length, perPage, currentPage: page, totalPages: Math.max(1, Math.ceil(list.length / perPage)) },
      });
    }
    const product = /^\/products\/(\d+)$/.exec(path);
    if (product) {
      const found = PRODUCTS.find((p) => p.id === Number(product[1]));
      return found ? json({ status: 200, success: true, data: found }) : json({ status: 404, success: false }, 404);
    }
    if (path === "/categories") return json({ status: 200, success: true, data: CATEGORIES, pagination: { total: 3, totalPages: 1, currentPage: 1 } });
    // As loose as possible: every customer, whatever the keyword.
    if (path === "/customers") return json({ status: 200, success: true, data: CUSTOMERS });
    // As loose as possible: the filter is ignored.
    if (path === "/orders") return json({ status: 200, success: true, data: ORDERS });
    const one = /^\/orders\/(\d+)$/.exec(path);
    if (one) {
      const id = Number(one[1]);
      const found = ORDERS.find((o) => o.id === id);
      return found ? json({ status: 200, success: true, data: { ...found, customer: { id: ORDER_OWNERS[id], mobile: "x" } } }) : json({}, 404);
    }
    throw new Error(`Unexpected request: ${init.method ?? "GET"} ${input}`);
  }) as unknown as typeof fetch;
  return { fetcher, calls, tokenRequests: () => tokenRequests, revoke: (token: string) => revoked.add(token), refresh };
}

const VALUES = {
  merchantId: "123456",
  storeName: "Oud House",
  storeUrl: "https://oud.example",
  accessToken: "access-1",
  refreshToken: "refresh-1",
  tokenExpiresAt: String(Date.now() + 10 * DAY),
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

describe("Salla connector", () => {
  let salla: ReturnType<typeof fakeSalla>;
  let store: MemoryStore;
  let saved: Record<string, string>[];
  let connector: SallaConnector;

  const deps = (extra: Partial<SallaDeps> = {}): SallaDeps => ({
    appId: "app-1",
    store,
    fetcher: salla.fetcher,
    saveSecrets: async (secrets) => {
      saved.push(secrets);
    },
    loadSecrets: async () => null,
    partnerApp: async () => CLIENT,
    ...extra,
  });

  beforeEach(() => {
    clearSallaCache();
    clearTokenMemory();
    salla = fakeSalla();
    store = new MemoryStore();
    saved = [];
    connector = new SallaConnector(sallaValues(VALUES), deps());
  });

  async function call(method: string, route: string, options: { query?: Record<string, string>; body?: unknown; user?: HostedUser | null; params?: string[]; on?: SallaConnector } = {}) {
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

  it("checks the store with one product and the store info, and hands checkout off to the browser", async () => {
    expect(await connector.check()).toBe("Oud House");
    expect(salla.calls.map((c) => c.url.pathname)).toEqual(["/admin/v2/store/info", "/admin/v2/products"]);
    expect(salla.calls[1]!.url.searchParams.get("per_page")).toBe("1");
    expect(salla.calls[0]!.headers.get("authorization")).toBe("Bearer access-1");
    expect(await connector.config()).toMatchObject({ store: { currency: "SAR", checkout_opens_in: "browser", reviews: false, guest_checkout: true }, features: { orders: true } });
  });

  it("says what to fix when the store isn't connected, was revoked, or the app can't read products", async () => {
    await expect(new SallaConnector(sallaValues({}), deps()).check()).rejects.toThrow(/Connect your Salla store first/);
    salla.revoke("access-1");
    salla.refresh.clear();
    const revoked = (await new SallaConnector(sallaValues(VALUES), deps()).check().catch((e: unknown) => e)) as Error;
    expect(revoked).toBeInstanceOf(PlatformCheckError);
    expect(revoked.message).toMatch(/no longer gives Yallapp access/);
    // Asked again, the refused refresh token isn't sent a second time.
    await expect(new SallaConnector(sallaValues(VALUES), deps()).check()).rejects.toThrow(/no longer gives Yallapp access/);
    expect(salla.tokenRequests()).toBe(1);
    clearTokenMemory();
    salla = fakeSalla({ productsStatus: 403 });
    clearSallaCache();
    await expect(new SallaConnector(sallaValues(VALUES), deps()).check()).rejects.toThrow(/didn't let Yallapp read this store's products/);
  });

  it("lists products with prices, sale prices, stock and digital flags, without hidden ones", async () => {
    const result = await call("GET", "/store/products");
    const body = result.body as { total: number; items: { id: number; name: string; type: string; price: Record<string, unknown>; stock_status: string; digital: boolean; rating: number | null; purchasable: boolean }[] };
    expect(body.items.map((p) => p.id)).toEqual([101, 102, 103]);
    const [oud, card, incense] = body.items;
    expect(oud).toMatchObject({ type: "variable", rating: 4.5, digital: false, stock_status: "in_stock" });
    // The 100 ml is on sale at 120: the range runs from 100 to 120.
    expect(oud!.price).toMatchObject({ amount: "100.00", range: true, formatted: "SAR\u00a0100.00 – SAR\u00a0120.00" });
    expect(card).toMatchObject({ type: "simple", digital: true, stock_status: "in_stock" });
    expect(incense).toMatchObject({ stock_status: "out_of_stock", purchasable: false });
    expect(incense!.price).toMatchObject({ amount: "25.00", regular_amount: "30.00", on_sale: true });

    // Search and category go to Salla as keyword and category.
    await call("GET", "/store/products", { query: { search: "oud", category: "11", page: "1", per_page: "10" } });
    const list = salla.calls.filter((c) => c.url.pathname === "/admin/v2/products").pop()!;
    expect(Object.fromEntries(list.url.searchParams)).toEqual({ page: "1", per_page: "10", keyword: "oud", category: "11" });

    // On sale: among the first products.
    const sale = (await call("GET", "/store/products", { query: { on_sale: "true" } })).body as { items: { id: number }[] };
    expect(sale.items.map((p) => p.id)).toEqual([103]);
    // Price order sorts the page.
    const cheap = (await call("GET", "/store/products", { query: { orderby: "price_asc" } })).body as { items: { id: number }[] };
    expect(cheap.items.map((p) => p.id)).toEqual([103, 102, 101]);
    // By IDs: each product read once and kept.
    const byIds = (await call("GET", "/store/products", { query: { ids: "102,104,999,101" } })).body as { items: { id: number }[] };
    expect(byIds.items.map((p) => p.id)).toEqual([102, 101]);
  });

  it("gives a product with its options, SKUs as variations, images, categories and its page", async () => {
    const result = await call("GET", "/store/products/{product_id}", { params: ["101"] });
    const p = result.body as Record<string, unknown> & { variations: Record<string, unknown>[]; attributes: unknown[]; images: unknown[]; categories: unknown[] };
    expect(p.attributes).toEqual([{ slug: "size", name: "Size", variation: true, options: [{ value: "50 ml", label: "50 ml" }, { value: "100 ml", label: "100 ml" }] }]);
    expect(p.variations).toEqual([
      expect.objectContaining({ id: 5001, attributes: { size: "50 ml" }, stock_status: "in_stock", purchasable: true, price: expect.objectContaining({ amount: "100.00", on_sale: false }) }),
      expect.objectContaining({ id: 5002, attributes: { size: "100 ml" }, stock_status: "out_of_stock", purchasable: false, price: expect.objectContaining({ amount: "120.00", regular_amount: "150.00", on_sale: true }) }),
    ]);
    // Videos are left out.
    expect(p.images).toEqual([
      { url: "https://cdn.salla.test/101.jpg", alt: "Oud" },
      { url: "https://cdn.salla.test/101-side.jpg", alt: "Oud Perfume" },
    ]);
    expect(p.categories).toEqual([{ id: 11, name: "Perfume", count: 0, parent_id: 10, image_url: "https://cdn.salla.test/c11.jpg" }]);
    expect(p.permalink).toBe("https://oud.example/oud-perfume/p101");
    expect((p.related as { id: number }[]).map((r) => r.id)).toEqual([103]);
    expect((await call("GET", "/store/products/{product_id}", { params: ["104"] })).status).toBe(404);
    expect((await call("GET", "/store/products/{product_id}", { params: ["999"] })).status).toBe(404);
    expect((await call("GET", "/store/products/{product_id}/reviews", { params: ["101"] })).status).toBe(403);
  });

  it("flattens categories with their parents, without hidden ones", async () => {
    const result = await call("GET", "/store/categories");
    expect((result.body as { items: unknown[] }).items).toEqual([
      { id: 10, name: "Fragrance", count: 0, parent_id: null, image_url: null },
      { id: 11, name: "Perfume", count: 0, parent_id: 10, image_url: "https://cdn.salla.test/c11.jpg" },
      { id: 12, name: "Gifts", count: 0, parent_id: null, image_url: null },
    ]);
    const home = (await call("GET", "/store/home")).body as { sections: { type: string }[] };
    expect(home.sections.map((s) => s.type)).toEqual(["categories", "sale_products", "new_products"]);
  });

  it("prices the cart from the SKUs, and hands one product off to its page on the store", async () => {
    const cart = (await call("POST", "/store/cart", { body: { lines: [{ product_id: 101, variation_id: 5001, quantity: 2 }] } })).body as Record<string, unknown>;
    expect(cart).toMatchObject({ item_count: 2, subtotal: "SAR\u00a0200.00", subtotal_amount: "200.00", currency: "SAR" });
    expect((cart.lines as Record<string, unknown>[])[0]).toMatchObject({ name: "Oud Perfume - 50 ml", unit_price: "SAR\u00a0100.00", available: true, problem: null });

    const link = await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines: [{ product_id: 101, variation_id: 5001, quantity: 1 }] } });
    expect(link.body).toEqual({ url: "https://oud.example/oud-perfume/p101", expires_at: new Date(NOW.getTime() + 30 * 60_000).toISOString(), open_in: "browser" });

    // Physical goods are fine on iOS; digital ones aren't sold there.
    expect((await call("POST", "/store/checkout-link", { query: { platform: "ios" }, body: { lines: [{ product_id: 101, variation_id: 5001, quantity: 1 }] } })).status).toBe(200);
    const digital = await call("POST", "/store/checkout-link", { query: { platform: "ios" }, body: { lines: [{ product_id: 102, variation_id: null, quantity: 1 }] } });
    expect(digital).toMatchObject({ status: 403, body: { code: "purchase_not_allowed" } });
    expect((await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines: [{ product_id: 102, variation_id: null, quantity: 1 }] } })).status).toBe(200);

    // Two products: one at a time. Out of stock or no option chosen: the cart changed.
    const two = await call("POST", "/store/checkout-link", {
      query: { platform: "android" },
      body: { lines: [{ product_id: 101, variation_id: 5001, quantity: 1 }, { product_id: 102, variation_id: null, quantity: 1 }] },
    });
    expect(two).toMatchObject({ status: 409, body: { code: "one_product_at_a_time" } });
    for (const line of [{ product_id: 101, variation_id: 5002 }, { product_id: 101, variation_id: null }, { product_id: 103, variation_id: null }, { product_id: 104, variation_id: null }]) {
      const changed = await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines: [{ ...line, quantity: 1 }] } });
      expect(changed).toMatchObject({ status: 409, body: { code: "cart_changed" } });
    }
  });

  it("finds orders only of the customers with exactly the verified phone", async () => {
    const result = await call("GET", "/me/orders", { user: user({}) });
    const body = result.body as { total: number; items: { id: number; number: string; status: string; status_label: string; total: string; created_at: string; items: unknown[] }[] };
    // Customers 1 and 2 have the number; 3 (no country code) and 4 (a longer number) don't. 9005 belongs to 4.
    expect(body.items.map((o) => o.id)).toEqual([9002, 9004, 9001]);
    expect(body.items[0]).toMatchObject({ number: "19002", status: "pending", status_label: "Awaiting payment", total: "SAR\u00a0250.00", created_at: "2026-10-12T05:00:00.000Z" });
    expect(body.items[2]!.items).toEqual([{ name: "Oud Perfume", course_id: null, product_id: 101, quantity: 2, image_url: "https://cdn.salla.test/101.jpg" }]);
    // The customer search used the number's last digits; the orders were asked per customer.
    expect(salla.calls.find((c) => c.url.pathname === "/admin/v2/customers")!.url.searchParams.get("keyword")).toBe("555123456");
    expect(salla.calls.filter((c) => c.url.pathname === "/admin/v2/orders").map((c) => c.url.searchParams.get("customer_id"))).toEqual(["1", "2"]);
  });

  it("finds orders by the exact email of an email account, and nothing for an account without either", async () => {
    const email = (await call("GET", "/me/orders", { user: user({ phone: null, email: "Sara@Example.com" }) })).body as { items: { id: number }[] };
    expect(email.items.map((o) => o.id)).toEqual([9004, 9001]);

    // A phone account's typed email was never checked: it finds nothing.
    salla.calls.length = 0;
    const other = (await call("GET", "/me/orders", { user: user({ phone: "+905321234567", email: "sara@example.com" }) })).body as { items: unknown[] };
    expect(other.items).toEqual([]);
    expect(salla.calls.some((c) => c.url.searchParams.get("keyword") === "sara@example.com")).toBe(false);

    salla.calls.length = 0;
    const none = (await call("GET", "/me/orders", { user: user({ phone: null, email: null }) })).body as { items: unknown[]; total: number };
    expect(none).toMatchObject({ items: [], total: 0 });
    expect(salla.calls).toEqual([]);
    expect((await call("GET", "/me/orders", { user: null })).status).toBe(401);
  });

  it("renews the tokens before they expire and saves the new pair at once", async () => {
    const expiring = new SallaConnector(sallaValues({ ...VALUES, tokenExpiresAt: String(Date.now() + 60_000) }), deps());
    await call("GET", "/store/categories", { on: expiring });
    expect(salla.tokenRequests()).toBe(1);
    const form = new URLSearchParams(salla.calls.find((c) => c.url.pathname === "/oauth2/token")!.body);
    expect(Object.fromEntries(form)).toEqual({ grant_type: "refresh_token", refresh_token: "refresh-1", client_id: "salla-client", client_secret: "salla-secret" });
    expect(saved).toEqual([{ accessToken: "access-2", refreshToken: "refresh-2", tokenExpiresAt: expect.stringMatching(/^\d+$/) }]);
    expect(salla.calls.at(-1)!.headers.get("authorization")).toBe("Bearer access-2");
  });

  it("renews once when Salla refuses the access token, and two requests at once renew only once", async () => {
    salla.revoke("access-1");
    const a = new SallaConnector(sallaValues(VALUES), deps());
    const b = new SallaConnector(sallaValues(VALUES), deps());
    const [first, second] = await Promise.all([call("GET", "/store/categories", { on: a }), call("GET", "/store/products", { on: b })]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // The refresh token works once: a second renewal would have failed.
    expect(salla.tokenRequests()).toBe(1);
    expect(saved).toHaveLength(1);
    // A later connector made from the old saved values uses the new tokens in memory.
    salla.calls.length = 0;
    await call("GET", "/store/products/{product_id}", { params: ["102"], on: new SallaConnector(sallaValues(VALUES), deps()) });
    expect(salla.tokenRequests()).toBe(1);
    expect(salla.calls.every((c) => c.headers.get("authorization") === "Bearer access-2")).toBe(true);
  });

  it("waits for another server's renewal instead of using the refresh token twice", async () => {
    const expired = { ...VALUES, tokenExpiresAt: String(Date.now() - 1000) };
    // Another server claimed this refresh token and is renewing it.
    const claimed = { hitRateLimit: async () => 2 } as unknown as MemoryStore;
    let loads = 0;
    const other = new SallaConnector(
      sallaValues(expired),
      deps({
        store: claimed,
        // It saves the new pair while this one waits.
        loadSecrets: async () => (++loads >= 3 ? { ...VALUES, accessToken: "access-1", refreshToken: "refresh-9", tokenExpiresAt: String(Date.now() + 14 * DAY) } : null),
      }),
    );
    const result = await call("GET", "/store/categories", { on: other });
    expect(result.status).toBe(200);
    expect(salla.tokenRequests()).toBe(0);

    // Nobody saves anything: the request fails, and the refresh token is still unused.
    clearTokenMemory();
    clearSallaCache();
    const stuck = new SallaConnector(sallaValues(expired), deps({ store: claimed }));
    expect((await call("GET", "/store/categories", { on: stuck })).status).toBe(503);
    expect(salla.tokenRequests()).toBe(0);
    expect(salla.refresh.has("refresh-1")).toBe(true);
  }, 15_000);

  it("uses the tokens another server saved when Salla refuses a refresh token already used", async () => {
    salla.refresh.clear(); // refresh-1 was used elsewhere
    const expired = { ...VALUES, tokenExpiresAt: String(Date.now() - 1000) };
    let loads = 0;
    const late = new SallaConnector(
      sallaValues(expired),
      deps({ loadSecrets: async () => (++loads >= 2 ? { ...VALUES, accessToken: "access-1", refreshToken: "refresh-7", tokenExpiresAt: String(Date.now() + 14 * DAY) } : null) }),
    );
    expect((await call("GET", "/store/categories", { on: late })).status).toBe(200);
    expect(salla.tokenRequests()).toBe(1);
    // Tokens of another store are never taken.
    clearTokenMemory();
    clearSallaCache();
    const otherStore = new SallaConnector(
      sallaValues(expired),
      deps({ loadSecrets: async () => ({ ...VALUES, merchantId: "999", refreshToken: "refresh-8", tokenExpiresAt: String(Date.now() + 14 * DAY) }) }),
    );
    expect((await call("GET", "/store/categories", { on: otherStore })).status).toBe(503);
  });

  it("reads Salla's phone numbers, statuses and dates", () => {
    expect(sallaPhone({ mobile: "555123456", mobile_code: "+966" })).toBe("+966555123456");
    expect(sallaPhone({ mobile: "0555123456", mobile_code: "00966" })).toBe("+966555123456");
    expect(sallaPhone({ mobile: "+90 532 123 45 67", mobile_code: "+966" })).toBe("+905321234567");
    expect(sallaPhone({ mobile: "555123456", mobile_code: "" })).toBeNull();
    expect(sallaPhone({ mobile: "", mobile_code: "+966" })).toBeNull();
    expect(sallaPhone({ mobile: null, mobile_code: null })).toBeNull();
    expect(sallaOrderStatus("canceled")).toEqual({ status: "cancelled", label: "Cancelled" });
    expect(sallaOrderStatus("restored")).toEqual({ status: "refunded", label: "Returned" });
    expect(sallaOrderStatus("something_new")).toEqual({ status: "processing", label: "Processing" });
    expect(sallaDate({ date: "2026-10-01 09:00:00.000000", timezone: "Asia/Riyadh" })).toBe("2026-10-01T06:00:00.000Z");
    expect(sallaDate({ date: "2026-10-01 09:00:00.000000", timezone: "UTC" })).toBe("2026-10-01T09:00:00.000Z");
    expect(sallaDate({ date: "" })).toBeNull();
  });
});

describe("Salla OAuth", () => {
  it("sends the owner to Salla's approval page with offline access and the signed state", () => {
    const url = new URL(sallaAuthorizeUrl("salla-client", "https://yallapp.test/oauth/salla", "state-1"));
    expect(`${url.origin}${url.pathname}`).toBe("https://accounts.salla.sa/oauth2/auth");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "salla-client",
      response_type: "code",
      redirect_uri: "https://yallapp.test/oauth/salla",
      scope: "offline_access",
      state: "state-1",
    });
  });

  it("swaps the code for tokens and the merchant's store", async () => {
    clearTokenMemory();
    const salla = fakeSalla();
    const values = await connectSalla("code-1", CLIENT, "https://yallapp.test/oauth/salla", salla.fetcher);
    expect(values).toEqual({
      accessToken: "access-2",
      refreshToken: "refresh-2",
      tokenExpiresAt: expect.stringMatching(/^\d+$/),
      merchantId: "123456",
      storeName: "Oud House",
      storeUrl: "https://oud.example",
    });
    const form = Object.fromEntries(new URLSearchParams(salla.calls[0]!.body));
    expect(form).toMatchObject({ grant_type: "authorization_code", code: "code-1", redirect_uri: "https://yallapp.test/oauth/salla" });
    await expect(connectSalla("old-code", CLIENT, "https://yallapp.test/oauth/salla", salla.fetcher)).rejects.toThrow(/refused the code/);
    expect(SALLA_PLATFORM.oauth!.storeName(values)).toBe("Oud House");
    expect(SALLA_PLATFORM.oauth!.storeName({})).toBeNull();
  });

  it("signs the state with the app and refuses changed, expired or foreign ones", () => {
    const secret = "test-session-secret-0123456789abcdef0123456789";
    const state = signOAuthState({ platform: "salla", appId: "app-1" }, secret, NOW);
    expect(readOAuthState(state, secret, NOW)).toEqual({ platform: "salla", appId: "app-1" });
    expect(readOAuthState(state, secret, new Date(NOW.getTime() + 21 * 60_000))).toBeNull();
    expect(readOAuthState(state, "another-secret-0123456789abcdef0123456789", NOW)).toBeNull();
    const [payload, signature] = state.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload!, "base64url").toString()), a: "app-2" })).toString("base64url");
    expect(readOAuthState(`${forged}.${signature}`, secret, NOW)).toBeNull();
    expect(readOAuthState("", secret, NOW)).toBeNull();
    expect(readOAuthState("a.b.c", secret, NOW)).toBeNull();
    // Two states for the same app differ.
    expect(signOAuthState({ platform: "salla", appId: "app-1" }, secret, NOW)).not.toBe(state);
  });

  it("is registered as a Store platform that connects with OAuth, without fields", () => {
    const definition = platformDefinition("salla")!;
    expect(definition).toMatchObject({ name: "Salla", appType: "store", fields: [] });
    expect(definition.oauth!.settingKey).toBe("sallaApp");
    expect(platformDefinition("zid")!.oauth!.settingKey).toBe("zidApp");
  });
});

describe("Salla webhooks", () => {
  async function setup(webhookSecret: string | null = CLIENT.webhookSecret) {
    clearPlatformSettingsCache();
    const store = new MemoryStore();
    await store.setPlatformSetting(
      "sallaApp",
      {
        clientId: CLIENT.clientId,
        clientSecretEncrypted: encryptSetting("sallaApp", CLIENT.clientSecret, KEY),
        webhookSecretEncrypted: webhookSecret ? encryptSetting("sallaApp", webhookSecret, KEY) : null,
      },
      "team@yallapp.test",
      NOW,
    );
    const base = newApp("client-1", null, NOW, "store");
    const app = { ...base, backend: "hosted" as const, connector: platformConnectorConfig(base.id, SALLA_PLATFORM, { ...VALUES, tokenExpiresAt: String(NOW.getTime() + DAY) }, KEY) };
    await store.createApp(app);
    return { store, app };
  }
  const sign = (raw: string, secret = CLIENT.webhookSecret) => createHmac("sha256", secret).update(raw).digest("hex");

  it("saves the new tokens of app.store.authorize for the apps connected to that merchant", async () => {
    const { store, app } = await setup();
    const expires = Math.floor(NOW.getTime() / 1000) + 14 * 86_400;
    const raw = JSON.stringify({ event: "app.store.authorize", merchant: 123456, created_at: "2026-10-13 13:00:00", data: { access_token: "access-new", refresh_token: "refresh-new", expires, scope: "offline_access", token_type: "bearer" } });
    const result = await handleSallaWebhook(raw, sign(raw), { store, encryptionKey: KEY, now: NOW });
    expect(result).toEqual({ status: 200, body: { ok: true, updated: 1 } });
    const values = platformValues((await store.getAppById(app.id))!, KEY)!;
    expect(values).toMatchObject({ merchantId: "123456", accessToken: "access-new", refreshToken: "refresh-new", tokenExpiresAt: String(expires * 1000), storeName: "Oud House" });

    // Another merchant, older tokens, a bad signature, other events.
    const otherRaw = raw.replace("123456", "654321");
    expect((await handleSallaWebhook(otherRaw, sign(otherRaw), { store, encryptionKey: KEY, now: NOW })).body.updated).toBe(0);
    const olderRaw = raw.replace(String(expires), String(expires - 20 * 86_400)).replace("access-new", "access-old");
    expect((await handleSallaWebhook(olderRaw, sign(olderRaw), { store, encryptionKey: KEY, now: NOW })).body.updated).toBe(0);
    expect((await handleSallaWebhook(raw, sign(raw, "wrong"), { store, encryptionKey: KEY, now: NOW })).status).toBe(401);
    expect((await handleSallaWebhook(raw, null, { store, encryptionKey: KEY, now: NOW })).status).toBe(401);
    const event = JSON.stringify({ event: "order.created", merchant: 123456, data: {} });
    expect(await handleSallaWebhook(event, sign(event), { store, encryptionKey: KEY, now: NOW })).toEqual({ status: 200, body: { ok: true } });
    expect(platformValues((await store.getAppById(app.id))!, KEY)!.accessToken).toBe("access-new");
  });

  it("answers 404 until the team saves a webhook secret", async () => {
    const { store } = await setup(null);
    const raw = JSON.stringify({ event: "app.store.authorize" });
    expect((await handleSallaWebhook(raw, sign(raw), { store, encryptionKey: KEY, now: NOW })).status).toBe(404);
  });
});
