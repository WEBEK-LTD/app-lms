import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { couponDiscount, normalizeCouponCode, parseCoupon, spreadDiscount } from "@/lib/catalog/coupons";
import { formatCents, parsePrice } from "@/lib/catalog/money";
import { shipOrder, shippable } from "@/lib/catalog/shipping";
import { approvePayout, completePayment, deliverPaidOrder, newOrderMail, readCustomer, startPayment } from "@/lib/catalog/payment";
import { accountForOrder, checkoutAccount, encryptPaymentKeys, paymentKeys, shippingFor } from "@/lib/catalog/settings";
import { encryptSetting } from "@/lib/settings/platform";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogCoupon, type CatalogOrder, type CatalogProductInput } from "@/lib/data/types";
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
    // 78.4 Counted on the app's errors for the team.
    expect(await store.listAppErrors({ appId: app.id, limit: 5 })).toEqual([
      expect.objectContaining({ source: "platform", code: "shop_unavailable", count: 1, message: expect.stringContaining("POST /store/checkout-link") }),
    ]);
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
        account: { account: { provider: "iyzico", keys }, marketplace: null },
        fetcher: iyzico(paid()),
        now,
        order,
        customer,
        ip: "203.0.113.9",
        callbackUrls: { returnUrl: `https://yallapp.test/api/pay/iyzico/${token}`, webhookUrl: null },
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
      expect(await completePayment({ store, app, account: { account: { provider: "iyzico", keys }, marketplace: null }, fetcher: iyzico(paid()), now, order, iyzicoToken: "iyzi-token" })).toBe("paid");
      expect(iyzicoCalls[1]).toMatchObject({ path: "/payment/iyzipos/checkoutform/auth/ecom/detail", body: { token: "iyzi-token" } });
      const after = (await store.getCatalogOrder(app.id, order.id))!;
      expect(after).toMatchObject({ status: "processing", paymentId: "2500001", paidAt: now });
      expect(await store.getCatalogProduct(app.id, ids.roses!)).toMatchObject({ stock: 1, salesCount: 2 });
      expect(await completePayment({ store, app, account: { account: { provider: "iyzico", keys }, marketplace: null }, fetcher: iyzico(paid()), now, order: after, iyzicoToken: "iyzi-token" })).toBe("already_paid");

      const mail = newOrderMail(after, "Rose Shop", "https://yallapp.test/dashboard/orders");
      expect(mail.subject).toBe(`New order ${1000 + order.id} · ₺950.00`);
      expect(mail.text).toContain("Red Roses × 2: ₺900.00");
      expect(mail.text).toContain("Moda Cd. 12, Istanbul");
    });

    it("72 never sells through Yallapp's account; an order paid there before still gets its shares approved for payout", async () => {
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
      // 72 Not even with Yallapp's account and a commission set: Yallapp never collects payments for its clients.
      await store.setPlatformSetting("marketplace", { commissionPercent: 10 }, "admin@yallapp.test", now);
      expect(await checkoutAccount(store, shop, KEY)).toBeNull();
      const yallappKeys = { apiKey: "yallapp-api", secretKey: "yallapp-secret", sandbox: true };
      const customer = { name: "Sara Yilmaz", phone: "+905321234567", email: "sara@example.com", city: "Istanbul", address: "Moda Cd. 12" };
      const back = { returnUrl: "https://yallapp.test/cb", webhookUrl: null };
      await expect(
        startPayment({ store, app: shop, account: { account: { provider: "iyzico", keys: yallappKeys }, marketplace: { subMerchantKey: "sub-rose", commissionPercent: 10 } }, fetcher: iyzico(paid()), now, order, customer, ip: "203.0.113.9", callbackUrls: back }),
      ).rejects.toThrow("never paid into Yallapp's account");
      expect(iyzicoCalls).toEqual([]);

      // An order started before Phase 72 through Yallapp's account (its commission recorded): the shares are still approved.
      await startPayment({ store, app: shop, account: { account: { provider: "iyzico", keys: yallappKeys }, marketplace: null }, fetcher: iyzico(paid()), now, order, customer, ip: "203.0.113.9", callbackUrls: back });
      expect(JSON.stringify(iyzicoCalls[0]!.body)).not.toContain("subMerchant");
      await store.updateCatalogOrder(app.id, order.id, { commissionCents: 9000, updatedAt: now });
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
        expect(await completePayment({ store, app, account: { account: { provider: "iyzico", keys }, marketplace: null }, fetcher: iyzico(detail), now, order, iyzicoToken: "iyzi-token" })).toBe("failed");
      }
      expect((await store.getCatalogOrder(app.id, order.id))!.status).toBe("pending");
    });

    it("lists the customer's paid orders", async () => {
      const list = () => call("GET", "/me/orders", { token: accessToken });
      expect((await list()).body).toMatchObject({ total: 0, items: [] });
      await completePayment({ store, app, account: { account: { provider: "iyzico", keys: IYZICO }, marketplace: null }, fetcher: iyzico(paid()), now, order, iyzicoToken: "iyzi-token" });
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
      expect(((await list()).body as { items: { refunded_total: unknown }[] }).items[0]!.refunded_total).toBeNull();
      // 71 Its receipt as a PDF, from a signed link (tests/unit/receipts-routes.test.ts opens one).
      expect(((await list()).body as { items: { receipt_url: unknown }[] }).items[0]!.receipt_url).toMatch(
        new RegExp(`^https?://[^/]+/receipts/orders/${app.id}\\.${order.id}\\.[A-Za-z0-9_-]{43}$`),
      );
      // 47 A refund in part shows as what was refunded; all of it turns the order "Refunded".
      const refund = (amountCents: number) =>
        store.recordRefund({
          appId: app.id,
          kind: "order",
          targetId: order.id,
          amountCents,
          currency: "TRY",
          reason: "buyer_request",
          note: null,
          provider: "iyzico",
          method: "api",
          parts: [],
          providerRef: null,
          commissionCents: null,
          revoked: { tickets: [], courses: [], memberships: [] },
          byUserId: null,
          byEmail: "owner@shop.test",
          createdAt: now,
        });
      await refund(20000);
      expect((await list()).body).toMatchObject({ items: [{ status: "processing", status_label: "Paid", refunded_total: "₺200.00" }] });
      await refund(75000);
      expect((await list()).body).toMatchObject({ items: [{ status: "refunded", status_label: "Refunded", refunded_total: "₺950.00" }] });
      expect((await call("GET", "/me/orders")).status).toBe(401);
    });

    it("80.4 shows how the shop shipped it, and tells the customer", async () => {
      await completePayment({ store, app, account: { account: { provider: "iyzico", keys: IYZICO }, marketplace: null }, fetcher: iyzico(paid()), now, order, iyzicoToken: "iyzi-token" });
      const paidOrder = (await store.getCatalogOrder(app.id, order.id))!;
      expect(shippable(paidOrder)).toBe(true);
      const mails: Record<string, unknown>[] = [];
      const shipment = { carrier: "Aras Kargo", trackingNumber: "3815602243", trackingUrl: "https://kargotakip.example/t?code=3815602243", waybill: null, shippedAt: now.toISOString() };
      const shipped = await shipOrder({ store, app, order: paidOrder, shipment, account: null, now, mail: async (_to, values) => void mails.push(values) });
      expect(shipped).toMatchObject({ emailed: false, notification: { title: `Order ${1000 + order.id} was shipped`, body: "Your order is on its way with Aras Kargo. Tracking number: 3815602243. Follow it in the app." } });
      const listed = (await call("GET", "/me/orders", { token: accessToken })).body;
      expect(listed).toMatchObject({
        items: [
          {
            status: "processing",
            status_label: "Shipped",
            shipment: { carrier: "Aras Kargo", tracking_number: "3815602243", tracking_url: "https://kargotakip.example/t?code=3815602243", waybill: null, shipped_at: now.toISOString() },
          },
        ],
      });
      // Changed: told again, as an update.
      const again = await shipOrder({ store, app, order: (await store.getCatalogOrder(app.id, order.id))!, shipment: { ...shipment, trackingNumber: "3815602299" }, account: null, now, mail: async (_to, values) => void mails.push(values) });
      expect(again?.notification?.title).toBe(`Order ${1000 + order.id}: new tracking details`);
    });
  });

  describe("91.1 coupons", () => {
    const coupon = (input: Partial<Parameters<MemoryStore["createCatalogCoupon"]>[0]>) =>
      store.createCatalogCoupon({ appId: app.id, code: "SPRING10", kind: "percent", value: 10, minOrderCents: null, endsAt: null, maxUses: null, active: true, createdAt: NOW, ...input });
    const quote = (body: Record<string, unknown>) => call("POST", "/store/cart", { query: { platform: "android" }, body: { lines: [{ product_id: ids.roses, quantity: 2 }], ...body } });

    it("gives the real total, with the coupon, shipping and what is left", async () => {
      await coupon({});
      expect((await quote({})).body).toMatchObject({ subtotal: "₺900.00", coupon: null, discount: null, shipping: "₺50.00", total: "₺950.00", total_amount: "950.00", total_final: true });
      expect((await quote({ coupon: " spring10 " })).body).toMatchObject({
        coupon: { code: "SPRING10", status: "applied", message: null },
        discount: "₺90.00",
        shipping: "₺50.00",
        total: "₺860.00",
        total_final: true,
      });
      // Free shipping over ₺2,000; a digital product ships nothing.
      expect((await call("POST", "/store/cart", { query: { platform: "android" }, body: { lines: [{ product_id: ids.giftCard, quantity: 1 }] } })).body).toMatchObject({ shipping: "₺0.00", total: "₺200.00" });
    });

    it("says why a coupon doesn't apply", async () => {
      await coupon({ code: "OLD", endsAt: new Date(NOW.getTime() - 1000) });
      await coupon({ code: "BIG", kind: "amount", value: 10000, minOrderCents: 100000 });
      await coupon({ code: "ONCE", maxUses: 1 });
      await coupon({ code: "PAUSED", active: false });
      const status = async (code: string) => ((await quote({ coupon: code })).body as { coupon: { status: string; message: string | null } }).coupon;
      expect(await status("NOPE")).toEqual({ code: "NOPE", status: "invalid", message: "This coupon doesn't exist." });
      expect(await status("PAUSED")).toMatchObject({ message: "This coupon doesn't exist." });
      expect(await status("OLD")).toMatchObject({ message: "This coupon has expired." });
      expect(await status("BIG")).toMatchObject({ message: "This coupon is for orders of ₺1,000.00 or more." });
      expect(await status("!!")).toMatchObject({ status: "invalid" });
      const once = (await store.getCatalogCouponByCode(app.id, "ONCE"))!;
      expect(await store.useCatalogCoupon(app.id, once.id)).toBe(true);
      expect(await store.useCatalogCoupon(app.id, once.id)).toBe(false);
      expect(await status("ONCE")).toMatchObject({ message: "This coupon has been used up." });
      expect((await quote({ coupon: "NOPE" })).body).toMatchObject({ discount: null, total: "₺950.00" });
    });

    it("takes the discount off the order, the payment's lines and counts the use when paid", async () => {
      await coupon({ code: "FIFTY", kind: "amount", value: 5000, maxUses: 5 });
      const link = await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines: [{ product_id: ids.roses, quantity: 2 }], coupon: "fifty" } });
      const order = (await store.getCatalogOrderByToken(sha256Hex((link.body as { url: string }).url.split("/").pop()!)))!;
      expect(order).toMatchObject({ subtotalCents: 90000, discountCents: 5000, shippingCents: 5000, totalCents: 90000, couponCode: "FIFTY" });
      // A coupon that doesn't apply is left out, never an error.
      const plain = await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines: [{ product_id: ids.roses, quantity: 1 }], coupon: "NOPE" } });
      const without = (await store.getCatalogOrderByToken(sha256Hex((plain.body as { url: string }).url.split("/").pop()!)))!;
      expect(without).toMatchObject({ discountCents: 0, couponCode: null, totalCents: 50000 });

      const sent: Record<string, unknown>[] = [];
      const fetcher = (async (url: string, init: RequestInit) => {
        sent.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        return new URL(url).pathname.endsWith("/initialize/auth/ecom")
          ? Response.json({ status: "success", token: "t", paymentPageUrl: "https://sandbox-cpp.iyzipay.com?token=t" })
          : Response.json({ status: "success", paymentStatus: "SUCCESS", paymentId: "1", paidPrice: 900, basketId: String(order.id) });
      }) as unknown as typeof fetch;
      const keys = paymentKeys(app, KEY)!;
      const customer = { name: "Sara Yilmaz", phone: "+905321234567", email: "sara@example.com", city: "Istanbul", address: "Moda Cd. 12" };
      await startPayment({ store, app, account: { account: { provider: "iyzico", keys }, marketplace: null }, fetcher, now, order, customer, ip: "203.0.113.9", callbackUrls: { returnUrl: "https://yallapp.test/r", webhookUrl: null } });
      expect(sent[0]).toMatchObject({ price: "900.00", paidPrice: "900.00", basketItems: [{ name: "Red Roses", price: "850.00" }, { id: "shipping", price: "50.00" }] });

      const placed = (await store.getCatalogOrder(app.id, order.id))!;
      expect(await completePayment({ store, app, account: { account: { provider: "iyzico", keys }, marketplace: null }, fetcher, now, order: placed, iyzicoToken: "t" })).toBe("paid");
      await deliverPaidOrder(store, app, placed, now);
      expect((await store.getCatalogCouponByCode(app.id, "FIFTY"))!.usedCount).toBe(1);
      expect(newOrderMail(placed, "Rose Shop", "https://yallapp.test/dashboard/orders").text).toContain("Coupon FIFTY: -₺50.00");
    });
  });

});

describe("91.1 coupon rules", () => {
  const coupon = (input: Partial<CatalogCoupon>): CatalogCoupon => ({ id: 1, appId: "a", code: "X", kind: "percent", value: 10, minOrderCents: null, endsAt: null, maxUses: null, usedCount: 0, active: true, createdAt: NOW, ...input });

  it("reads codes and works out the discount, never more than the subtotal", () => {
    expect(normalizeCouponCode(" spring 10 ")).toBe("SPRING10");
    expect(normalizeCouponCode("x")).toBeNull();
    expect(normalizeCouponCode("a$b")).toBeNull();
    expect(couponDiscount(coupon({ value: 15 }), 12345, "TRY", NOW)).toEqual({ ok: true, discountCents: 1852 });
    expect(couponDiscount(coupon({ kind: "amount", value: 50000 }), 30000, "TRY", NOW)).toEqual({ ok: true, discountCents: 30000 });
    expect(couponDiscount(null, 100, "TRY", NOW)).toMatchObject({ ok: false });
  });

  it("spreads a discount over the lines so they add up to what is charged", () => {
    expect(spreadDiscount([60000, 30000, 10000], 10000)).toEqual([54000, 27000, 9000]);
    const odd = spreadDiscount([333, 333, 334], 100);
    expect(odd.reduce((a, b) => a + b, 0)).toBe(900);
    // Each line keeps a cent.
    expect(spreadDiscount([100, 100], 1000)).toEqual([1, 1]);
    expect(spreadDiscount([100], 0)).toEqual([100]);
  });

  it("reads the dashboard's form", () => {
    expect(parseCoupon({ code: "spring10", kind: "percent", value: "10", minOrder: "", endsOn: "2026-12-31", maxUses: "" }, NOW)).toEqual({
      ok: true,
      value: { code: "SPRING10", kind: "percent", value: 10, minOrderCents: null, endsAt: new Date("2026-12-31T23:59:59Z"), maxUses: null },
    });
    expect(parseCoupon({ code: "OFF50", kind: "amount", value: "50", minOrder: "300", maxUses: "100" }, NOW)).toMatchObject({ ok: true, value: { value: 5000, minOrderCents: 30000, maxUses: 100 } });
    expect(parseCoupon({ code: "!", kind: "percent", value: "120", minOrder: "x", endsOn: "2020-01-01", maxUses: "0" }, NOW)).toEqual({
      ok: false,
      errors: {
        code: "Use 2 to 50 letters, digits or dashes, like SPRING10.",
        value: "Enter a percentage from 1 to 100.",
        minOrder: "Enter an amount, like 300, or leave it empty.",
        endsOn: "Choose a day from today on, or leave it empty.",
        maxUses: "Enter a number of uses, or leave it empty for no limit.",
      },
    });
  });
});
