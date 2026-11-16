import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { encryptOwnPayment } from "@/lib/catalog/settings";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogCustomer, type CatalogOrder } from "@/lib/data/types";
import { activateLicense, parseSiteInfo } from "@/lib/license/service";
import type { RefundDeps } from "@/lib/refunds/service";
import {
  amountCents,
  checkoutPaymentOf,
  deliveryOfExtras,
  gatewayKeysFingerprint,
  inAppBlock,
  inAppReadiness,
  paymentLines,
  placePlatformOrder,
  pluginTakesInAppPayment,
  quoteBeforePayment,
  readPluginOrder,
  refundPlatformPayment,
  startSiteStorePayment,
  storeCheckoutStatus,
  testedOnSaved,
  type PlaceDeps,
} from "@/lib/selling/in-app-pay";
import { PAID_ORDERS_PATH, paidOrderSignature } from "@/lib/selling/woo-paid-orders";
import { days, KEY, NOW } from "./helpers";

/** 134 Pay inside the app for a connected store (Demo): WooCommerce, every HTTP call recorded, made-up keys only. */

const PLATFORM = "https://yallapp.test";
const SITE = "https://lale-flowers.test";
const STRIPE = "https://stripe.test";
/** Made up: shaped like Stripe's test keys, never real ones. */
const STRIPE_KEYS = { provider: "stripe" as const, secretKey: "sk_test_fake134", publishableKey: "pk_test_fake134", sandbox: true };

interface SiteCall {
  url: string;
  action: string;
  reference: string;
  body: Record<string, unknown>;
  signed: boolean;
}

/** The WordPress site's plugin, as recorded answers: it prices the order, keeps one order per reference, or refuses as told. */
function fakeSite(licenseKey: string) {
  const calls: SiteCall[] = [];
  const orders = new Map<string, number>();
  const state = { refuse: null as null | { status: number; code: string; message: string }, shipping: "25.00", tax: "0.00", unreachable: false };
  const fetcher = async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const raw = String(init?.body ?? "");
    const headers = new Headers(init?.headers);
    const ts = Number(headers.get("yallapp-timestamp"));
    const signed = headers.get("yallapp-signature") === createHmac("sha256", licenseKey.toUpperCase()).update(`yallapp-store-order:${ts}:${raw}`).digest("hex");
    const body = JSON.parse(raw) as Record<string, unknown>;
    calls.push({ url, action: String(body.action), reference: String(body.reference), body, signed });
    if (state.unreachable) throw new TypeError("fetch failed");
    if (!signed) return Response.json({ code: "invalid_signature", message: "Not signed for this site." }, { status: 401 });
    if (state.refuse) return Response.json({ code: state.refuse.code, message: state.refuse.message }, { status: state.refuse.status });
    const lines = body.lines as { total_amount: string }[];
    const subtotal = lines.reduce((sum, l) => sum + Number(l.total_amount), 0);
    const fee = Number((body.extras as { fee?: number }).fee ?? 0);
    if (body.action === "quote") {
      const total = subtotal + Number(state.shipping) + fee + Number(state.tax);
      return Response.json({
        currency: "TRY",
        lines: lines.map((l) => ({ total_amount: l.total_amount, available: true })),
        discount_amount: "0.00",
        shipping_amount: state.shipping,
        fee_amount: fee.toFixed(2),
        tax_amount: state.tax,
        total_amount: total.toFixed(2),
      });
    }
    const reference = String(body.reference);
    const existing = orders.get(reference);
    if (existing) return Response.json({ order_id: existing, order_number: String(existing), status: "processing", created: false });
    const id = 500 + orders.size + 1;
    orders.set(reference, id);
    return Response.json({ order_id: id, order_number: String(id), status: "processing", created: true });
  };
  return { calls, orders, state, fetcher };
}

/** Stripe's refund, recorded. */
function fakeStripe() {
  const calls: { method: string; url: string; body: string }[] = [];
  const fetcher = (async (input: string | URL, init?: RequestInit) => {
    calls.push({ method: init?.method ?? "GET", url: String(input), body: String(init?.body ?? "") });
    if (String(input).endsWith("/v1/refunds")) return Response.json({ id: "re_madeUp1", status: "succeeded" });
    return Response.json({ error: { message: "no answer" } }, { status: 500 });
  }) as typeof fetch;
  return { calls, fetcher };
}

const customer: CatalogCustomer = { name: "Leyla Kaya", phone: "+905321112233", email: "leyla@example.test", city: "Istanbul", address: "Bağdat Caddesi 12, Kadıköy" };

/** What the plugin sends for the app's cart: two bouquets and a vase as an add-on, a slot with its fee, the gift's people. */
function pluginBody(info: Record<string, string>, patch: Record<string, unknown> = {}) {
  return {
    ...info,
    currency: "TRY",
    platform: "android",
    lang: "tr",
    lines: [
      { product_id: 41, variation_id: 57, quantity: 2, name: "Red roses - Deluxe", unit_amount: "450.00", total_amount: "900.00", attributes: { attribute_pa_size: "deluxe" }, digital: false },
      { product_id: 88, variation_id: null, quantity: 1, name: "Glass vase", unit_amount: "120.00", total_amount: "120.00", attributes: {}, addon_of: 41, digital: false },
    ],
    coupon: null,
    discount_amount: "0.00",
    fee_amount: "30.00",
    extras: {
      delivery_date: "2026-10-13",
      delivery_slot: "s2",
      slot_label: "16:00–20:00",
      fee: 30,
      gift_message: "Happy birthday, Mum!",
      sender: { name: "Omar Aziz", phone: "+905301234567", email: "omar@example.test" },
      recipient: { name: "Ayşe Aziz", phone: "+905309876543", address: "Moda Caddesi 5, Kadıköy", city: "Istanbul", country: "TR" },
      gift_anonymous: false,
    },
    customer: { user_id: 7, name: "Omar Aziz", email: "omar@example.test", phone: "+905301234567", city: "Istanbul", address: "", country: "TR" },
    ...patch,
  };
}

async function wooStore(options: { inApp?: boolean; tested?: boolean } = {}) {
  const store = new MemoryStore();
  const { client } = await registerClient(store, { name: "Lale", email: "owner@lale.test", whatsapp: "+905446731942", siteUrl: SITE, password: null }, NOW);
  const base = newApp(client.id, SITE, NOW, "store");
  const payment = encryptOwnPayment(base.id, STRIPE_KEYS, KEY);
  const app: App = {
    ...base,
    backend: "wordpress",
    appName: "Lale Flowers",
    catalogSettings: {
      ...DEFAULT_CATALOG_SETTINGS,
      payment,
      checkoutPayment: options.inApp === false ? "platform" : "in_app",
      gatewayTested: options.tested === false ? null : { at: NOW.toISOString(), provider: "stripe", keys: gatewayKeysFingerprint(payment) },
    },
  };
  await store.createApp(app);
  const { licenseKey } = await activateClient(store, { clientId: client.id, appId: app.id, plan: "growth", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
  const info = { license_key: licenseKey!, site_url: SITE, plugin_version: "0.4.47", wp_version: "6.8", lms: "", store: "woocommerce" };
  const site = parseSiteInfo(info);
  if (!site.ok) throw new Error("site");
  expect((await activateLicense(store, site.value, NOW)).status).toBe(200);
  return { store, app: (await store.getAppById(app.id))!, info, licenseKey: licenseKey! };
}

describe("134 which stores pay inside the app", () => {
  it("only WooCommerce on WordPress: Yallapp's own products have Yallapp's checkout; Shopify's terms, Wix and the others keep theirs", () => {
    const store = (patch: Partial<App>) => ({ appType: "store" as const, backend: "hosted" as const, connector: null, ...patch }) as App;
    expect(inAppBlock(store({ backend: "wordpress" }))).toBeNull();
    expect(inAppBlock(store({ connector: { kind: "catalog" } }))).toBe("own_products");
    expect(inAppBlock(store({ connector: { kind: "shopify", shopDomain: "x.myshopify.com", storefrontTokenEncrypted: "", adminTokenEncrypted: null } }))).toBe("shopify_terms");
    expect(inAppBlock(store({ connector: { kind: "platform", platform: "wix", settings: {}, secretsEncrypted: "" } }))).toBe("wix_unverified");
    expect(inAppBlock(store({ connector: { kind: "platform", platform: "ikas", settings: {}, secretsEncrypted: "" } }))).toBe("platform_unsupported");
    expect(inAppBlock(store({ backend: "custom_api" }))).toBe("own_api");
    expect(inAppBlock({ ...store({ backend: "wordpress" }), appType: "lms" })).toBe("not_store");
  });

  it("needs the owner's gateway saved and its Test connection passed on those keys; new keys need a new test", async () => {
    const { app } = await wooStore({ tested: false });
    expect(inAppReadiness(app)).toMatchObject({ blocked: null, gateway: "stripe", testedAt: null, ready: false });
    expect(checkoutPaymentOf(app)).toBe("platform");
    // A test of keys typed but not saved doesn't count; one of the saved ones does.
    expect(testedOnSaved(app, { ...STRIPE_KEYS, secretKey: "sk_test_other134" }, STRIPE_KEYS, NOW)).toBeNull();
    const tested = testedOnSaved(app, STRIPE_KEYS, STRIPE_KEYS, NOW)!;
    const ready = { ...app, catalogSettings: { ...app.catalogSettings!, gatewayTested: tested } };
    expect(inAppReadiness(ready).ready).toBe(true);
    expect(checkoutPaymentOf(ready)).toBe("in_app");
    // Saving the keys again (another encryption) asks for a new test.
    const resaved = { ...ready, catalogSettings: { ...ready.catalogSettings!, payment: encryptOwnPayment(app.id, STRIPE_KEYS, KEY) } };
    expect(inAppReadiness(resaved).ready).toBe(false);
    // A demo app never does.
    expect(inAppReadiness({ ...ready, demo: true }).ready).toBe(false);
  });

  it("the license tells the plugin while it's on; the store's checkout otherwise (and older plugins never ask)", async () => {
    const { store, app, info } = await wooStore();
    expect(storeCheckoutStatus(app)).toEqual({ payment: "in_app", gateway: "stripe", gateway_name: "Stripe" });
    const site = parseSiteInfo(info);
    if (!site.ok) throw new Error("site");
    const status = await activateLicense(store, site.value, NOW);
    expect(status.status === 200 && status.body.store_checkout).toEqual({ payment: "in_app", gateway: "stripe", gateway_name: "Stripe" });
    expect(storeCheckoutStatus({ ...app, catalogSettings: { ...app.catalogSettings!, checkoutPayment: "platform" } })).toBeNull();
    expect(pluginTakesInAppPayment("0.4.47")).toBe(true);
    expect(pluginTakesInAppPayment("0.4.46")).toBe(false);
    expect(pluginTakesInAppPayment(null)).toBe(false);
  });
});

describe("134 the plugin's order, read", () => {
  it("amounts in cents, the lines checked, the extras as the payment page reads them", () => {
    expect(amountCents("450")).toBe(45000);
    expect(amountCents("450.5")).toBe(45050);
    expect(amountCents(12.345)).toBe(1235);
    expect(amountCents("-1")).toBeNull();
    expect(amountCents("1e3")).toBeNull();
    const read = readPluginOrder(pluginBody({}));
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.value).toMatchObject({ subtotalCents: 102000, discountCents: 0, feeCents: 3000, lang: "tr" });
    expect(read.value.intent.lines[1]).toMatchObject({ productId: 88, variationId: null, addonOf: 41 });
    expect(read.value.intent.customerId).toBe(7);
    expect(readPluginOrder(pluginBody({}, { currency: "GBP" })).ok).toBe(false);
    expect(readPluginOrder(pluginBody({}, { lines: [] })).ok).toBe(false);
    expect(readPluginOrder(pluginBody({}, { discount_amount: "5000.00" })).ok).toBe(false);
    // A total that doesn't split evenly is one line, so the gateway's lines add up.
    expect(paymentLines([{ productId: 1, variationId: null, quantity: 3, name: "Tulip", attributes: {}, unitCents: 3333, totalCents: 10000, addonOf: null, digital: false }])).toEqual([
      { productId: 0, name: "Tulip × 3", quantity: 1, unitCents: 10000, imageAssetId: null, digital: false },
    ]);
    expect(deliveryOfExtras(pluginBody({}).extras, 3000)).toMatchObject({ date: "2026-10-13", slot: { id: "s2", start: "16:00", end: "20:00" }, feeCents: 3000, message: "Happy birthday, Mum!" });
    expect(deliveryOfExtras({}, 0)).toBeNull();
  });
});

describe("134 paying inside the app on WooCommerce", () => {
  let store: MemoryStore;
  let app: App;
  let info: Record<string, string>;
  let site: ReturnType<typeof fakeSite>;
  let deps: PlaceDeps;

  beforeEach(async () => {
    const made = await wooStore();
    ({ store, app, info } = made);
    site = fakeSite(made.licenseKey);
    deps = { store, key: KEY, now: NOW, baseUrl: PLATFORM, site: { fetcher: site.fetcher, resolve: async () => ["203.0.113.10"] } };
  });

  async function start(patch: Record<string, unknown> = {}): Promise<CatalogOrder> {
    const started = await startSiteStorePayment(store, pluginBody(info, patch), { now: NOW, platformUrl: PLATFORM });
    expect(started.status).toBe(200);
    if (started.status !== 200) throw new Error("not started");
    const body = started.body as { url: string; payment_id: string; gateway: string };
    expect(body.url).toMatch(new RegExp(`^${PLATFORM}/pay/`));
    expect(body.gateway).toBe("stripe");
    return (await store.getCatalogOrder(app.id, Number(body.payment_id) - 1000))!;
  }

  /** The gateway confirmed it (what settle.ts does once Stripe's answer says paid). */
  async function paid(order: CatalogOrder): Promise<CatalogOrder> {
    await store.updateCatalogOrder(app.id, order.id, { paymentProvider: "stripe", providerRef: "cs_test_madeUp", updatedAt: NOW });
    expect(await store.payCatalogOrder(app.id, order.id, "pi_madeUp123", NOW)).toBe(true);
    return (await store.getCatalogOrder(app.id, order.id))!;
  }

  it("refuses when it's off, or the gateway doesn't take the store's currency: the plugin opens the store's checkout", async () => {
    await store.updateApp(app.id, { catalogSettings: { ...app.catalogSettings!, checkoutPayment: "platform" } }, NOW);
    const off = await startSiteStorePayment(store, pluginBody(info), { now: NOW, platformUrl: PLATFORM });
    expect(off).toMatchObject({ status: 409, body: { code: "in_app_payment_off" } });
    const paypal = encryptOwnPayment(app.id, { provider: "paypal", clientId: "made-up-client", secret: "made-up-secret", sandbox: true }, KEY);
    await store.updateApp(app.id, { catalogSettings: { ...app.catalogSettings!, payment: paypal, checkoutPayment: "in_app", gatewayTested: { at: NOW.toISOString(), provider: "paypal", keys: gatewayKeysFingerprint(paypal) } } }, NOW);
    const lira = await startSiteStorePayment(store, pluginBody(info), { now: NOW, platformUrl: PLATFORM });
    expect(lira).toMatchObject({ status: 409, body: { code: "currency_not_supported" } });
    const wrong = await startSiteStorePayment(store, pluginBody({ ...info, license_key: "YA-0000-0000-0000-0000" }), { now: NOW, platformUrl: PLATFORM });
    expect(wrong.status).toBeGreaterThanOrEqual(400);
  });

  it("the payment is the platform's priced cart, its lines never Yallapp's products; the platform prices shipping for the address and checks stock before the payment", async () => {
    const order = await start();
    expect(order).toMatchObject({ status: "pending", subtotalCents: 102000, shippingCents: 3000, totalCents: 105000, currency: "TRY", couponCode: null });
    expect(order.lines.every((l) => l.productId === 0)).toBe(true);
    expect(order.delivery?.recipient?.name).toBe("Ayşe Aziz");
    expect(await store.getStorePlatformOrder(app.id, order.id)).toMatchObject({ status: "awaiting_payment", platform: "woocommerce", quote: null });

    const quoted = await quoteBeforePayment(deps, app, order, customer);
    expect(quoted).toEqual({ ok: true, changed: true });
    const call = site.calls[0]!;
    expect(call).toMatchObject({ url: `${SITE}${PAID_ORDERS_PATH}`, action: "quote", reference: `yallapp-order-${order.id}`, signed: true });
    // The gift's recipient is where it goes; the payment page's buyer pays.
    expect(call.body.shipping).toMatchObject({ name: "Ayşe Aziz", address: "Moda Caddesi 5, Kadıköy", country: "TR" });
    expect(call.body.billing).toMatchObject({ name: "Leyla Kaya", email: "leyla@example.test" });
    const after = (await store.getCatalogOrder(app.id, order.id))!;
    expect(after).toMatchObject({ shippingCents: 5500, totalCents: 107500, customer });
    // The same address again: nothing changed, the payment can start.
    expect(await quoteBeforePayment(deps, app, after, customer)).toEqual({ ok: true, changed: false });

    site.state.refuse = { status: 409, code: "out_of_stock", message: "Red roses - Deluxe is out of stock." };
    expect(await quoteBeforePayment(deps, app, after, customer)).toEqual({ ok: false, code: "out_of_stock", message: "Red roses - Deluxe is out of stock. Go back to the app and check your cart." });
    site.state.refuse = null;
    site.state.unreachable = true;
    expect(await quoteBeforePayment(deps, app, after, customer)).toMatchObject({ ok: false, code: "unreachable" });
  });

  it("once paid, the order is made on the platform once, marked paid with the gateway and its reference; again and at once, never twice", async () => {
    const order = await start();
    await quoteBeforePayment(deps, app, order, customer);
    // Not paid yet: nothing is made.
    expect(await placePlatformOrder(deps, app, order)).toEqual({ status: "unpaid" });
    const done = await paid(order);
    const [a, b] = await Promise.all([placePlatformOrder(deps, app, done), placePlatformOrder(deps, app, done)]);
    expect([a.status, b.status].sort()).toEqual(["busy", "placed"]);
    const creates = site.calls.filter((c) => c.action === "create");
    expect(creates).toHaveLength(1);
    expect(creates[0]!.body).toMatchObject({
      reference: `yallapp-order-${order.id}`,
      customer_id: 7,
      coupon: null,
      extras: { delivery_slot: "s2", gift_message: "Happy birthday, Mum!" },
      payment: { gateway: "Stripe", transaction_id: "pi_madeUp123", amount: "1075.00", currency: "TRY", note: "Paid in the app via Stripe, reference pi_madeUp123" },
    });
    expect((creates[0]!.body.lines as unknown[])[0]).toMatchObject({ product_id: 41, variation_id: 57, quantity: 2, attributes: { attribute_pa_size: "deluxe" } });
    expect(await store.getStorePlatformOrder(app.id, order.id)).toMatchObject({ status: "placed", platformOrderId: "501", platformOrderNumber: "501", attempts: 1 });
    // The gateway's webhook again, the customer's return: answered from what's kept.
    expect(await placePlatformOrder(deps, app, done)).toEqual({ status: "placed", number: "501" });
    expect(site.calls.filter((c) => c.action === "create")).toHaveLength(1);
  });

  it("a platform that refuses leaves it paid, needing attention: the owner is told once, retries, or refunds through the gateway", async () => {
    const order = await start();
    await quoteBeforePayment(deps, app, order, customer);
    const done = await paid(order);
    site.state.refuse = { status: 409, code: "out_of_stock", message: "Red roses - Deluxe is out of stock." };
    expect(await placePlatformOrder(deps, app, done)).toEqual({ status: "needs_attention", code: "out_of_stock", message: "Red roses - Deluxe is out of stock." });
    expect(await store.getStorePlatformOrder(app.id, order.id)).toMatchObject({ status: "needs_attention", problem: { code: "out_of_stock" } });
    const notices = await store.listOwnerNotices({ clientId: app.clientId });
    expect(notices.filter((n) => n.kind === "store_order_attention")).toHaveLength(1);
    // Retried while it's still out of stock: still needs attention, and the owner isn't told again.
    expect((await placePlatformOrder(deps, app, done)).status).toBe("needs_attention");
    expect((await store.listOwnerNotices({ clientId: app.clientId })).filter((n) => n.kind === "store_order_attention")).toHaveLength(1);
    // Back in stock: the retry makes it.
    site.state.refuse = null;
    expect(await placePlatformOrder(deps, app, done)).toEqual({ status: "placed", number: "501" });
    expect((await store.getStorePlatformOrder(app.id, order.id))!.attempts).toBe(3);
  });

  it("refunds a payment whose order the store refused, all of it, through the owner's Stripe; never one whose order was made", async () => {
    const order = await start();
    await quoteBeforePayment(deps, app, order, customer);
    const done = await paid(order);
    site.state.unreachable = true;
    expect((await placePlatformOrder(deps, app, done)).status).toBe("needs_attention");
    const stripe = fakeStripe();
    const refundDeps: RefundDeps = { store, key: KEY, urls: { stripe: STRIPE }, fetcher: stripe.fetcher, now: NOW, ip: "203.0.113.9", actor: { id: null, email: "owner@lale.test" }, mail: async () => undefined };
    const refunded = await refundPlatformPayment(refundDeps, app, (await store.getCatalogOrder(app.id, order.id))!);
    expect(refunded.ok).toBe(true);
    expect(stripe.calls).toHaveLength(1);
    expect(stripe.calls[0]!.url).toBe(`${STRIPE}/v1/refunds`);
    expect(stripe.calls[0]!.body).toContain("payment_intent=pi_madeUp123");
    expect(stripe.calls[0]!.body).toContain("amount=107500");
    expect(await store.getStorePlatformOrder(app.id, order.id)).toMatchObject({ status: "refunded" });
    expect((await store.getCatalogOrder(app.id, order.id))!.status).toBe("refunded");
    // Refunded: never made on the platform afterwards.
    site.state.unreachable = false;
    expect(await placePlatformOrder(deps, app, done)).toEqual({ status: "refunded" });

    // An order that was made isn't refunded here.
    const other = await start();
    await quoteBeforePayment(deps, app, other, customer);
    await placePlatformOrder(deps, app, await paid(other));
    expect(await refundPlatformPayment(refundDeps, app, (await store.getCatalogOrder(app.id, other.id))!)).toEqual({ ok: false, message: "This can't be refunded." });
  });

  it("signs with the license key: the site refuses another key", async () => {
    const order = await start();
    const other = fakeSite("YA-AAAA-BBBB-CCCC-DDDD");
    const refused = await quoteBeforePayment({ ...deps, site: { fetcher: other.fetcher, resolve: async () => ["203.0.113.10"] } }, app, order, customer);
    expect(refused).toMatchObject({ ok: false, code: "invalid_signature" });
    expect(paidOrderSignature("ya-abcd", 1, "{}")).toBe(createHmac("sha256", "YA-ABCD").update("yallapp-store-order:1:{}").digest("hex"));
  });

  it("never reaches a site on a private address", async () => {
    const order = await start();
    const answer = await quoteBeforePayment({ ...deps, site: { fetcher: site.fetcher, resolve: async () => ["10.0.0.5"] } }, app, order, customer);
    expect(answer).toMatchObject({ ok: false, code: "unreachable" });
    expect(site.calls).toHaveLength(0);
  });
});
