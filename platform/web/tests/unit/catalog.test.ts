import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { formatCents, parsePrice } from "@/lib/catalog/money";
import { approvePayout, completePayment, newOrderMail, readCustomer, startPayment } from "@/lib/catalog/payment";
import { accountForOrder, checkoutAccount, encryptPaymentKeys, paymentKeys, shippingFor } from "@/lib/catalog/settings";
import { encryptSetting } from "@/lib/settings/platform";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogOrder, type CatalogProductInput } from "@/lib/data/types";
import { CatalogConnector, descriptionHtml } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { checkIyzicoKeys, iyzicoAuthorization, type IyzicoKeys } from "@/lib/payments/iyzico";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

const KEY = Buffer.alloc(32, 7);
const IYZICO: IyzicoKeys = { apiKey: "sandbox-api", secretKey: "sandbox-secret", sandbox: true };
const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };

describe("catalog money", () => {
  it("formats and parses prices", () => {
    expect(formatCents(123450, "TRY")).toBe("₺1,234.50");
    expect(formatCents(999, "USD")).toBe("$9.99");
    expect(parsePrice("450")).toBe(45000);
    expect(parsePrice("450.5")).toBe(45050);
    expect(parsePrice("1,250.00")).toBe(125000);
    expect(parsePrice("1.250,00")).toBe(125000);
    expect(parsePrice("₺ 1.250")).toBe(125000);
    expect(parsePrice("12,5")).toBe(1250);
    expect(parsePrice("abc")).toBeNull();
    expect(parsePrice("-5")).toBeNull();
  });

  it("charges shipping only for physical orders below the free threshold", () => {
    const settings = { ...DEFAULT_CATALOG_SETTINGS, shippingCents: 5000, freeShippingOverCents: 100000 };
    expect(shippingFor(settings, 40000, true)).toBe(5000);
    expect(shippingFor(settings, 100000, true)).toBe(0);
    expect(shippingFor(settings, 40000, false)).toBe(0);
  });

  it("shows descriptions as escaped paragraphs", () => {
    expect(descriptionHtml("Fresh <b>roses</b>.\nRed.\n\nSame day.")).toBe("<p>Fresh &lt;b&gt;roses&lt;/b&gt;.<br>Red.</p><p>Same day.</p>");
  });
});

describe("iyzico", () => {
  it("signs requests with IYZWSv2", () => {
    const header = iyzicoAuthorization(IYZICO, "123abc", "/payment/test", '{"a":1}');
    const decoded = Buffer.from(header.replace("IYZWSv2 ", ""), "base64").toString();
    const signature = createHmac("sha256", "sandbox-secret").update('123abc/payment/test{"a":1}').digest("hex");
    expect(decoded).toBe(`apiKey:sandbox-api&randomKey:123abc&signature:${signature}`);
  });

  it("checks keys and tells wrong keys from an unreachable iyzico", async () => {
    const answer = (body: unknown) => (async () => Response.json(body)) as unknown as typeof fetch;
    expect(await checkIyzicoKeys(IYZICO, { fetcher: answer({ status: "success" }) })).toBe(true);
    expect(await checkIyzicoKeys(IYZICO, { fetcher: answer({ status: "failure", errorMessage: "Invalid" }) })).toBe(false);
    const down = (async () => new Response("<html>", { status: 502 })) as unknown as typeof fetch;
    expect(await checkIyzicoKeys(IYZICO, { fetcher: down })).toBeNull();
  });
});

describe("catalog shop on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  const ids: Record<string, number> = {};

  const product = (input: Partial<CatalogProductInput>): CatalogProductInput => ({
    appId: app.id,
    name: "Product",
    description: "",
    priceCents: 10000,
    salePriceCents: null,
    categoryIds: [],
    imageAssetIds: [],
    stock: null,
    digital: false,
    featured: false,
    active: true,
    sku: null,
    ...input,
  });

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "store");
    app = {
      ...base,
      backend: "hosted",
      appName: "Rose Shop",
      websiteDoneAt: NOW,
      connector: { kind: "catalog" },
      catalogSettings: {
        ...DEFAULT_CATALOG_SETTINGS,
        shippingCents: 5000,
        freeShippingOverCents: 200000,
        payment: encryptPaymentKeys(base.id, IYZICO.apiKey, IYZICO.secretKey, true, KEY),
      },
    };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
    const bouquets = await store.createCatalogCategory({ appId: app.id, name: "Bouquets", now: NOW });
    const empty = await store.createCatalogCategory({ appId: app.id, name: "Empty", now: NOW });
    ids.bouquets = bouquets.id;
    ids.empty = empty.id;
    ids.roses = (
      await store.createCatalogProduct(
        product({
          name: "Red Roses",
          description: "Twelve red roses.",
          priceCents: 60000,
          salePriceCents: 45000,
          categoryIds: [bouquets.id],
          imageAssetIds: ["img-1", "img-2"],
          stock: 3,
          featured: true,
          sku: "RR-12",
        }),
        new Date(NOW.getTime() + 1000),
      )
    ).id;
    ids.giftCard = (await store.createCatalogProduct(product({ name: "Gift Card", priceCents: 20000, digital: true }), new Date(NOW.getTime() + 2000))).id;
    ids.vase = (await store.createCatalogProduct(product({ name: "Glass Vase", priceCents: 25000, stock: 0, categoryIds: [bouquets.id] }), new Date(NOW.getTime() + 3000))).id;
    ids.hidden = (await store.createCatalogProduct(product({ name: "Draft", active: false }), new Date(NOW.getTime() + 4000))).id;
  });

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    connector: new CatalogConnector({ store, app, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" }),
  });

  async function call(
    method: string,
    route: string,
    options: { body?: unknown; token?: string | null; query?: Record<string, string>; params?: string[] } = {},
  ): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), {
      method,
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
    });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone = "5321234567") {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+90${phone}`)!, device: DEVICE } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name: "Sara Yilmaz", device: DEVICE } });
    return registered.body as { access_token: string; user: { id: number } };
  }

  it("adds the shop to the config", async () => {
    const body = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as Record<string, never>;
    expect(body).toMatchObject({ store: { currency: "TRY", guest_checkout: true, reviews: false }, features: { orders: true } });
  });

  it("lists categories with products and the home screen", async () => {
    expect((await call("GET", "/store/categories")).body).toEqual({
      items: [{ id: ids.bouquets, name: "Bouquets", count: 2, parent_id: null, image_url: null }],
    });
    const home = (await call("GET", "/store/home")).body as { sections: { type: string }[] };
    expect(home.sections.map((s) => s.type)).toEqual(["categories", "featured_products", "sale_products", "new_products"]);
  });

  it("lists, filters, sorts and pages active products", async () => {
    const all = (await call("GET", "/store/products")).body as { items: { id: number; name: string }[]; total: number };
    expect(all.items.map((p) => p.name)).toEqual(["Glass Vase", "Gift Card", "Red Roses"]);
    expect(all.items[2]).toMatchObject({
      price: { amount: "450.00", regular_amount: "600.00", formatted: "₺450.00", regular_formatted: "₺600.00", on_sale: true },
      image_url: "https://yallapp.test/api/v1/assets/img-1",
      stock_status: "in_stock",
    });
    expect((await call("GET", "/store/products", { query: { category: String(ids.bouquets) } })).body).toMatchObject({ total: 2 });
    expect((await call("GET", "/store/products", { query: { search: "ROSES" } })).body).toMatchObject({ total: 1 });
    expect((await call("GET", "/store/products", { query: { on_sale: "true" } })).body).toMatchObject({ items: [{ id: ids.roses }] });
    const cheap = (await call("GET", "/store/products", { query: { orderby: "price_asc", per_page: "2" } })).body;
    expect(cheap).toMatchObject({ total: 3, total_pages: 2, items: [{ name: "Gift Card" }, { name: "Glass Vase" }] });
    expect((await call("GET", "/store/products", { query: { ids: `${ids.vase},${ids.hidden},${ids.roses}` } })).body).toMatchObject({
      items: [{ id: ids.vase, stock_status: "out_of_stock", purchasable: false }, { id: ids.roses }],
    });
  });

  it("19 shows products without a cart until card payments are set up", async () => {
    expect((await call("GET", "/store/products/{product_id}", { params: [String(ids.roses)] })).body).toMatchObject({ purchasable: true });
    app = { ...app, catalogSettings: { ...app.catalogSettings!, payment: null } };
    const all = (await call("GET", "/store/products")).body as { items: { purchasable: boolean }[] };
    expect(all.items.every((p) => p.purchasable === false)).toBe(true);
    expect((await call("GET", "/store/products/{product_id}", { params: [String(ids.roses)] })).body).toMatchObject({ purchasable: false });
    // A demo shop's payment page charges nothing: it still sells.
    app = { ...app, demo: true };
    expect((await call("GET", "/store/products/{product_id}", { params: [String(ids.roses)] })).body).toMatchObject({ purchasable: true });
  });

  it("shows a product", async () => {
    const result = await call("GET", "/store/products/{product_id}", { params: [String(ids.roses)] });
    expect(result.body).toMatchObject({
      name: "Red Roses",
      description_html: "<p>Twelve red roses.</p>",
      images: [{ url: "https://yallapp.test/api/v1/assets/img-1" }, { url: "https://yallapp.test/api/v1/assets/img-2" }],
      sku: "RR-12",
      max_quantity: 3,
      attributes: [],
      variations: [],
      categories: [{ id: ids.bouquets, name: "Bouquets" }],
      related: [{ id: ids.vase }],
      permalink: `https://yallapp.test/shop/${app.id}/${ids.roses}`,
    });
    expect((await call("GET", "/store/products/{product_id}", { params: [String(ids.hidden)] })).status).toBe(404);
    expect((await call("GET", "/store/products/{product_id}/reviews", { params: [String(ids.roses)] })).status).toBe(403);
  });

  it("prices the cart", async () => {
    const result = await call("POST", "/store/cart", {
      query: { platform: "android" },
      body: { lines: [{ product_id: ids.roses, quantity: 5 }, { product_id: ids.vase, quantity: 1 }, { product_id: 999, quantity: 1 }] },
    });
    expect(result.body).toMatchObject({
      item_count: 3,
      subtotal: "₺1,350.00",
      subtotal_amount: "1350.00",
      lines: [
        { quantity: 3, problem: "Only 3 left in stock.", unit_price: "₺450.00", available: true },
        { available: false, problem: "Out of stock." },
        { available: false, name: "Unavailable product" },
      ],
    });
  });

  it("opens the payment page only for carts that can be bought", async () => {
    const checkout = (platform: string, lines: unknown[]) => call("POST", "/store/checkout-link", { query: { platform }, body: { lines } });
    expect((await checkout("android", [{ product_id: ids.vase, quantity: 1 }])).status).toBe(409);
    expect((await checkout("ios", [{ product_id: ids.giftCard, quantity: 1 }])).body).toMatchObject({ code: "purchase_not_allowed" });

    const link = await checkout("android", [{ product_id: ids.roses, quantity: 2 }]);
    const url = (link.body as { url: string }).url;
    expect(url).toMatch(/^https:\/\/yallapp\.test\/pay\/[\w-]+$/);
    expect(link.body).toMatchObject({ open_in: "in_app", expires_at: new Date(now.getTime() + 3_600_000).toISOString() });
    const order = (await store.getCatalogOrderByToken(sha256Hex(url.split("/").pop()!)))!;
    expect(order).toMatchObject({ status: "pending", subtotalCents: 90000, shippingCents: 5000, totalCents: 95000, userId: null });

    app = { ...app, catalogSettings: { ...app.catalogSettings!, payment: null } };
    expect((await checkout("android", [{ product_id: ids.roses, quantity: 1 }])).body).toMatchObject({ code: "shop_unavailable" });
  });

  describe("payment", () => {
    let order: CatalogOrder;
    let token: string;
    let accessToken: string;
    let iyzicoCalls: { path: string; body: Record<string, unknown>; auth: string }[];

    const iyzico = (detail: Record<string, unknown>) =>
      (async (url: string, init: RequestInit) => {
        const path = new URL(url).pathname;
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        iyzicoCalls.push({ path, body, auth: new Headers(init.headers).get("authorization")! });
        if (path.endsWith("/initialize/auth/ecom")) {
          return Response.json({ status: "success", token: "iyzi-token", paymentPageUrl: "https://sandbox-cpp.iyzipay.com?token=iyzi-token" });
        }
        return Response.json(detail);
      }) as unknown as typeof fetch;

    const paid = () => ({ status: "success", paymentStatus: "SUCCESS", paymentId: "2500001", paidPrice: 950, basketId: String(order.id) });

    beforeEach(async () => {
      iyzicoCalls = [];
      accessToken = (await signUp()).access_token;
      const link = await call("POST", "/store/checkout-link", {
        query: { platform: "android" },
        token: accessToken,
        body: { lines: [{ product_id: ids.roses, quantity: 2 }] },
      });
      token = (link.body as { url: string }).url.split("/").pop()!;
      order = (await store.getCatalogOrderByToken(sha256Hex(token)))!;
    });

    it("checks the customer's details", () => {
      expect(readCustomer(app, { name: "Sara", phone: "12", email: "x", city: "", address: "" })).toMatchObject({
        ok: false,
        errors: { name: expect.any(String), phone: expect.any(String), email: expect.any(String), city: expect.any(String), address: expect.any(String) },
      });
      expect(readCustomer(app, { name: "Sara Yilmaz", phone: "0532 123 45 67", email: "sara@example.com", city: "Istanbul", address: "Moda Cd. 12, Kadikoy" })).toEqual({
        ok: true,
        customer: { name: "Sara Yilmaz", phone: "+905321234567", email: "sara@example.com", city: "Istanbul", address: "Moda Cd. 12, Kadikoy" },
      });
    });

    it("sends the order to iyzico and marks it paid when iyzico confirms", async () => {
      const keys = paymentKeys(app, KEY)!;
      expect(keys).toEqual(IYZICO);
      const customer = { name: "Sara Yilmaz", phone: "+905321234567", email: "sara@example.com", city: "Istanbul", address: "Moda Cd. 12" };
      const page = await startPayment({
        store,
        app,
        account: { keys, marketplace: null },
        fetcher: iyzico(paid()),
        now,
        order,
        customer,
        ip: "203.0.113.9",
        callbackUrl: `https://yallapp.test/api/pay/iyzico/${token}`,
      });
      expect(page).toBe("https://sandbox-cpp.iyzipay.com?token=iyzi-token");
      const sent = iyzicoCalls[0]!;
      expect(sent.path).toBe("/payment/iyzipos/checkoutform/initialize/auth/ecom");
      expect(sent.auth).toMatch(/^IYZWSv2 /);
      expect(sent.body).toMatchObject({
        price: "950.00",
        paidPrice: "950.00",
        currency: "TRY",
        basketId: String(order.id),
        buyer: { name: "Sara", surname: "Yilmaz", gsmNumber: "+905321234567", city: "Istanbul" },
        shippingAddress: { contactName: "Sara Yilmaz" },
        basketItems: [
          { name: "Red Roses", itemType: "PHYSICAL", price: "900.00" },
          { id: "shipping", price: "50.00" },
        ],
      });
      expect((await store.getCatalogOrder(app.id, order.id))!.customer).toEqual(customer);

      order = (await store.getCatalogOrder(app.id, order.id))!;
      expect(await completePayment({ store, app, account: { keys, marketplace: null }, fetcher: iyzico(paid()), now, order, iyzicoToken: "iyzi-token" })).toBe("paid");
      expect(iyzicoCalls[1]).toMatchObject({ path: "/payment/iyzipos/checkoutform/auth/ecom/detail", body: { token: "iyzi-token" } });
      const after = (await store.getCatalogOrder(app.id, order.id))!;
      expect(after).toMatchObject({ status: "processing", paymentId: "2500001", paidAt: now });
      expect(await store.getCatalogProduct(app.id, ids.roses!)).toMatchObject({ stock: 1, salesCount: 2 });
      expect(await completePayment({ store, app, account: { keys, marketplace: null }, fetcher: iyzico(paid()), now, order: after, iyzicoToken: "iyzi-token" })).toBe("already_paid");

      const mail = newOrderMail(after, "Rose Shop", "https://yallapp.test/dashboard/orders");
      expect(mail.subject).toBe(`New order ${1000 + order.id} · ₺950.00`);
      expect(mail.text).toContain("Red Roses × 2: ₺900.00");
      expect(mail.text).toContain("Moda Cd. 12, Istanbul");
    });

    it("sells through Yallapp's account: the shop's share per item, approved for payout on completion", async () => {
      await store.setPlatformSetting(
        "iyzico",
        { apiKeyEncrypted: encryptSetting("iyzico", "yallapp-api", KEY), secretKeyEncrypted: encryptSetting("iyzico", "yallapp-secret", KEY), sandbox: true },
        "admin@yallapp.test",
        now,
      );
      const shop = {
        ...app,
        catalogSettings: {
          ...app.catalogSettings!,
          payment: { provider: "yallapp" as const, subMerchantKey: "sub-rose", subMerchantType: "PERSONAL" as const, payeeName: "Rose Shop", ibanLast4: "1234", sandbox: true, joinedAt: now.toISOString() },
        },
      };
      // Not on until the team sets a commission.
      expect(await checkoutAccount(store, shop, KEY)).toBeNull();
      await store.setPlatformSetting("marketplace", { commissionPercent: 10 }, "admin@yallapp.test", now);
      const account = (await checkoutAccount(store, shop, KEY))!;
      expect(account).toEqual({ keys: { apiKey: "yallapp-api", secretKey: "yallapp-secret", sandbox: true }, marketplace: { subMerchantKey: "sub-rose", commissionPercent: 10 } });

      const customer = { name: "Sara Yilmaz", phone: "+905321234567", email: "sara@example.com", city: "Istanbul", address: "Moda Cd. 12" };
      await startPayment({ store, app: shop, account, fetcher: iyzico(paid()), now, order, customer, ip: "203.0.113.9", callbackUrl: "https://yallapp.test/cb" });
      expect(iyzicoCalls[0]!.body).toMatchObject({
        price: "950.00",
        basketItems: [
          { name: "Red Roses", price: "900.00", subMerchantKey: "sub-rose", subMerchantPrice: "810.00" },
          { id: "shipping", price: "50.00", subMerchantKey: "sub-rose", subMerchantPrice: "50.00" },
        ],
      });
      order = (await store.getCatalogOrder(app.id, order.id))!;
      expect(order.commissionCents).toBe(9000);

      // The callback uses the account the order started with.
      const callbackAccount = (await accountForOrder(store, shop, order, KEY))!;
      const detail = { ...paid(), itemTransactions: [{ paymentTransactionId: 7001 }, { paymentTransactionId: "7002" }] };
      expect(await completePayment({ store, app: shop, account: callbackAccount, fetcher: iyzico(detail), now, order, iyzicoToken: "iyzi-token" })).toBe("paid");
      order = (await store.getCatalogOrder(app.id, order.id))!;
      expect(order).toMatchObject({ status: "processing", itemTransactionIds: ["7001", "7002"], payoutApprovedAt: null });

      iyzicoCalls = [];
      expect(await approvePayout({ store, app: shop, account: callbackAccount, fetcher: iyzico({ status: "success" }), now, order })).toBe(true);
      expect(iyzicoCalls.map((c) => [c.path, c.body.paymentTransactionId])).toEqual([
        ["/payment/iyzipos/item/approve", "7001"],
        ["/payment/iyzipos/item/approve", "7002"],
      ]);
      expect((await store.getCatalogOrder(app.id, order.id))!.payoutApprovedAt).toEqual(now);

      const failing = { ...order, payoutApprovedAt: null };
      expect(await approvePayout({ store, app: shop, account: callbackAccount, fetcher: iyzico({ status: "failure", errorMessage: "No" }), now, order: failing })).toBe(false);
    });

    it("doesn't trust a payment iyzico doesn't confirm for this order and amount", async () => {
      const keys = paymentKeys(app, KEY)!;
      for (const detail of [
        { status: "failure", errorMessage: "Card declined" },
        { ...paid(), paymentStatus: "FAILURE" },
        { ...paid(), basketId: "999" },
        { ...paid(), paidPrice: 9.5 },
      ]) {
        expect(await completePayment({ store, app, account: { keys, marketplace: null }, fetcher: iyzico(detail), now, order, iyzicoToken: "iyzi-token" })).toBe("failed");
      }
      expect((await store.getCatalogOrder(app.id, order.id))!.status).toBe("pending");
    });

    it("lists the customer's paid orders", async () => {
      const list = () => call("GET", "/me/orders", { token: accessToken });
      expect((await list()).body).toMatchObject({ total: 0, items: [] });
      await completePayment({ store, app, account: { keys: IYZICO, marketplace: null }, fetcher: iyzico(paid()), now, order, iyzicoToken: "iyzi-token" });
      expect((await list()).body).toMatchObject({
        total: 1,
        items: [
          {
            id: order.id,
            number: String(1000 + order.id),
            status: "processing",
            status_label: "Paid",
            total: "₺950.00",
            items: [{ name: "Red Roses", product_id: ids.roses, quantity: 2, image_url: "https://yallapp.test/api/v1/assets/img-1" }],
          },
        ],
      });
      expect((await call("GET", "/me/orders")).status).toBe(401);
    });
  });
});
