import { describe, expect, it } from "vitest";
import { buildConfigFor, newApp } from "@/lib/app/setup";
import { completePayment, startPayment } from "@/lib/catalog/payment";
import { checkoutAccount, encryptOwnPayment, ownPaymentInput, type OwnPaymentInput } from "@/lib/catalog/settings";
import { startSheetPayment } from "@/lib/catalog/sheet-payment";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogCustomer, type CatalogOrder } from "@/lib/data/types";
import { settlesOnStatus } from "@/lib/payments/app-return";
import { readOwnKeys, savedKeysView, validApplePayMerchantId } from "@/lib/payments/owner-keys";
import { refundThroughProvider } from "@/lib/payments/refund";
import { callbackUrls } from "@/lib/payments/routes";
import type { Settled, Trigger } from "@/lib/payments/settle";
import { answerSheetRequest } from "@/lib/payments/sheet-request";
import { stripeSignatureHeader } from "@/lib/payments/stripe";
import { STRIPE_WEBHOOK_EVENTS } from "@/lib/payments/stripe-keys";
import { handleStripeWebhook } from "@/lib/payments/webhooks";
import { fakeStripe } from "./fake-stripe-paypal";
import { KEY, NOW, setupClient } from "./helpers";

/**
 * 188 Stripe's PaymentSheet in the apps: the payment page stays in the app's
 * web view, and a Stripe payment there is taken by the app's native sheet
 * (card, Apple Pay, Google Pay) on a PaymentIntent the platform makes for
 * the order: one per order and amount, never alongside a Checkout Session
 * that could be paid too, settled only once it's read back from Stripe.
 */

const SECRET = "sk_test_51Abcdefghijklmnop";
const PUBLISHABLE = "pk_test_51Abcdefghijklmnop";
const WHSEC = "whsec_SheetTestSecret0123456789";
const TOKEN = "tok_SheetPayment0123456789";
const customer: CatalogCustomer = { name: "Ada Lovelace", phone: "+905321234567", email: "ada@example.com", city: "Istanbul", address: "Moda Cd. 1" };

let store: MemoryStore;
let app: App;
let order: CatalogOrder;

const stripeInput = (extra: Partial<Extract<OwnPaymentInput, { provider: "stripe" }>> = {}): OwnPaymentInput => ({ provider: "stripe", secretKey: SECRET, sandbox: true, publishableKey: PUBLISHABLE, webhookSecret: WHSEC, ...extra });

async function makeShop(payment: OwnPaymentInput | null = stripeInput(), fields: Partial<CatalogOrder> = {}) {
  ({ store } = await setupClient());
  const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
  const base = newApp(client.id, null, NOW, "store");
  app = { ...base, backend: "hosted", appName: "Harbour Mugs", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "USD", payment: null } };
  app = { ...app, catalogSettings: { ...app.catalogSettings!, payment: payment ? encryptOwnPayment(app.id, payment, KEY) : null } };
  await store.createApp(app);
  order = await store.createCatalogOrder({
    appId: app.id,
    tokenHash: sha256Hex(TOKEN),
    userId: null,
    status: "pending",
    lines: [{ productId: 1, name: "Mug", quantity: 2, unitCents: 2000, imageAssetId: null, digital: false }],
    subtotalCents: 4000,
    shippingCents: 500,
    totalCents: 4500,
    currency: "USD",
    customer,
    paymentId: null,
    createdAt: NOW,
    paidAt: null,
    updatedAt: NOW,
    commissionCents: null,
    itemTransactionIds: null,
    payoutApprovedAt: null,
    ...fields,
  } as never);
}

const fresh = async () => (await store.getCatalogOrder(app.id, order.id))!;
const sheet = async (stripe: ReturnType<typeof fakeStripe>, o?: CatalogOrder) =>
  startSheetPayment({ store, app, account: (await checkoutAccount(store, app, KEY))!, fetcher: stripe.fetcher, now: NOW, order: o ?? (await fresh()) });
const creates = (stripe: ReturnType<typeof fakeStripe>) => stripe.calls.filter((c) => c.method === "POST" && c.path === "/v1/payment_intents");

describe("188 the sheet's PaymentIntent", () => {
  it("is made for the order's amount and currency, with our reference, on the owner's account, and kept on the order", async () => {
    await makeShop();
    const stripe = fakeStripe({ secretKey: SECRET });
    const started = await sheet(stripe);
    const intent = stripe.intents[0]!;
    expect(started).toEqual({
      kind: "ready",
      publishableKey: PUBLISHABLE,
      clientSecret: `${intent.id}_secret_fake`,
      intentId: intent.id,
      merchantCountry: "AE",
      currency: "USD",
      amountCents: 4500,
      merchantName: "Harbour Mugs",
      testMode: true,
    });
    expect(intent.form.get("amount")).toBe("4500");
    expect(intent.form.get("currency")).toBe("usd");
    expect(intent.form.get("metadata[reference]")).toBe(`order-${order.id}`);
    expect(intent.form.get("automatic_payment_methods[enabled]")).toBe("true");
    // A native sheet can't follow a redirect back.
    expect(intent.form.get("automatic_payment_methods[allow_redirects]")).toBe("never");
    expect(intent.form.get("receipt_email")).toBe("ada@example.com");
    expect(creates(stripe)[0]!.headers["idempotency-key"]).toBe(`order-${order.id}-sheet-4500-USD-first`);
    expect(await fresh()).toMatchObject({ paymentProvider: "stripe", providerRef: intent.id, commissionCents: null, status: "pending" });
  });

  it("is the same PaymentIntent when the app asks again, and two asks at once make one", async () => {
    await makeShop();
    const stripe = fakeStripe();
    const before = await fresh();
    const [a, b] = await Promise.all([sheet(stripe, before), sheet(stripe, before)]);
    expect(stripe.intents).toHaveLength(1);
    expect(a).toEqual(b);
    const again = await sheet(stripe);
    expect(again).toMatchObject({ kind: "ready", intentId: stripe.intents[0]!.id });
    expect(stripe.intents).toHaveLength(1);
  });

  it("cancels the one for an older amount (the shipping priced since) and makes a new one", async () => {
    await makeShop();
    const stripe = fakeStripe();
    await sheet(stripe);
    const first = stripe.intents[0]!;
    await store.updateCatalogOrder(app.id, order.id, { totalCents: 5200, shippingCents: 1200, updatedAt: NOW });
    const started = await sheet(stripe);
    expect(first.status).toBe("canceled");
    expect(stripe.intents).toHaveLength(2);
    expect(started).toMatchObject({ kind: "ready", intentId: stripe.intents[1]!.id, amountCents: 5200 });
    expect(stripe.intents[1]!.form.get("amount")).toBe("5200");
    expect(creates(stripe)[1]!.headers["idempotency-key"]).toBe(`order-${order.id}-sheet-5200-USD-${first.id}`);
  });

  it("expires the page's open Checkout Session first, so it can't be paid as well", async () => {
    await makeShop();
    const stripe = fakeStripe();
    // The page's own Stripe form started a session earlier.
    await startPayment({ store, app, account: (await checkoutAccount(store, app, KEY))!, fetcher: stripe.fetcher, now: NOW, order: await fresh(), customer, ip: "203.0.113.9", callbackUrls: callbackUrls("https://yallapp.test", "order", "stripe", TOKEN) });
    const session = (await fresh()).providerRef!;
    expect(session).toMatch(/^cs_/);
    const started = await sheet(stripe);
    expect(stripe.sessions.get(session)!.status).toBe("expired");
    expect(started.kind).toBe("ready");
    expect((await fresh()).providerRef).toBe(stripe.intents[0]!.id);
  });

  it("starts nothing when the page's Checkout Session was paid: the order is settled instead", async () => {
    await makeShop();
    const stripe = fakeStripe();
    await startPayment({ store, app, account: (await checkoutAccount(store, app, KEY))!, fetcher: stripe.fetcher, now: NOW, order: await fresh(), customer, ip: "203.0.113.9", callbackUrls: callbackUrls("https://yallapp.test", "order", "stripe", TOKEN) });
    stripe.pay((await fresh()).providerRef!);
    expect(await sheet(stripe)).toEqual({ kind: "paid" });
    expect(stripe.intents).toHaveLength(0);
  });

  it("says a PaymentIntent already paid, or being paid, and makes no second one", async () => {
    await makeShop();
    const stripe = fakeStripe();
    await sheet(stripe);
    stripe.payIntent(stripe.intents[0]!.id, "processing");
    expect(await sheet(stripe)).toEqual({ kind: "unavailable", reason: "in_progress" });
    stripe.payIntent(stripe.intents[0]!.id);
    expect(await sheet(stripe)).toEqual({ kind: "paid" });
    expect(stripe.intents).toHaveLength(1);
  });

  it("leaves the page's own Stripe form to it without a publishable key, the details, or Stripe", async () => {
    const stripe = fakeStripe();
    await makeShop(stripeInput({ publishableKey: null }));
    expect(await sheet(stripe)).toEqual({ kind: "unavailable", reason: "no_publishable_key" });
    await makeShop(stripeInput({ publishableKey: "pk_live_51Abcdefghijklmnop" }));
    expect(await sheet(stripe)).toEqual({ kind: "unavailable", reason: "no_publishable_key" });
    await makeShop(stripeInput(), { customer: null });
    expect(await sheet(stripe)).toEqual({ kind: "unavailable", reason: "details_needed" });
    await makeShop({ provider: "paypal", clientId: "AYpaypal", secret: "s", sandbox: true });
    expect(await sheet(stripe)).toEqual({ kind: "unavailable", reason: "not_stripe" });
    expect(stripe.intents).toHaveLength(0);
  });
});

describe("188 the sheet's payment, read back", () => {
  it("is paid only once Stripe says the PaymentIntent succeeded, for this order's amount and currency", async () => {
    await makeShop();
    const stripe = fakeStripe();
    await sheet(stripe);
    const id = stripe.intents[0]!.id;
    const account = (await checkoutAccount(store, app, KEY))!;
    const complete = async () => completePayment({ store, app, account, fetcher: stripe.fetcher, now: NOW, order: await fresh() });
    expect(await complete()).toBe("pending");
    stripe.payIntent(id);
    expect(await complete()).toBe("paid");
    expect(await fresh()).toMatchObject({ status: "processing", paymentId: id });
    expect(await complete()).toBe("already_paid");
  });

  it("never pays an order on a PaymentIntent of another amount or reference", async () => {
    await makeShop();
    const stripe = fakeStripe();
    await sheet(stripe);
    const intent = stripe.intents[0]!;
    stripe.payIntent(intent.id);
    intent.form.set("amount", "100");
    const account = (await checkoutAccount(store, app, KEY))!;
    expect(await completePayment({ store, app, account, fetcher: stripe.fetcher, now: NOW, order: await fresh() })).toBe("pending");
    intent.form.set("amount", "4500");
    intent.form.set("metadata[reference]", "order-999");
    expect(await completePayment({ store, app, account, fetcher: stripe.fetcher, now: NOW, order: await fresh() })).toBe("pending");
    expect((await fresh()).status).toBe("pending");
  });

  it("is read back when the app asks the status, only for a pending PaymentIntent", () => {
    const base = { status: "pending" as const, manualPayment: null, paymentProvider: "stripe" as const };
    expect(settlesOnStatus({ ...base, providerRef: "pi_test_1fake" })).toBe(true);
    expect(settlesOnStatus({ ...base, providerRef: "cs_test_1abc" })).toBe(false);
    expect(settlesOnStatus({ ...base, status: "processing", providerRef: "pi_test_1fake" })).toBe(false);
    expect(settlesOnStatus({ ...base, paymentProvider: "kashier", providerRef: "pi_x" })).toBe(false);
  });

  it("is refunded through the PaymentIntent, as the other Stripe payments", async () => {
    await makeShop();
    const stripe = fakeStripe();
    await sheet(stripe);
    const id = stripe.intents[0]!.id;
    const refund = await refundThroughProvider(
      { provider: "stripe", keys: { secretKey: SECRET, sandbox: true } },
      { conversationId: `order-${order.id}`, paymentId: id, providerRef: id, currency: "USD", paidCents: 4500, paidAt: NOW, cents: 1000, refundedBeforeCents: 0 } as never,
      { fetcher: stripe.fetcher },
    );
    expect(refund.error ?? null).toBeNull();
    expect(stripe.refunds[0]!.get("payment_intent")).toBe(id);
    expect(stripe.refunds[0]!.get("amount")).toBe("1000");
  });

  it("the page's own Stripe form cancels the sheet's PaymentIntent before it starts a session", async () => {
    await makeShop();
    const stripe = fakeStripe();
    await sheet(stripe);
    const intent = stripe.intents[0]!;
    await startPayment({ store, app, account: (await checkoutAccount(store, app, KEY))!, fetcher: stripe.fetcher, now: NOW, order: await fresh(), customer, ip: "203.0.113.9", callbackUrls: callbackUrls("https://yallapp.test", "order", "stripe", TOKEN) });
    expect(intent.status).toBe("canceled");
    expect((await fresh()).providerRef).toMatch(/^cs_/);
  });
});

describe("188 Stripe's webhook for the sheet", () => {
  it("settles an order on payment_intent.succeeded, by its reference, reading the PaymentIntent back", async () => {
    expect(STRIPE_WEBHOOK_EVENTS).toContain("payment_intent.succeeded");
    await makeShop();
    const settled: { id: number; trigger: Trigger }[] = [];
    const answer: Settled = { status: "paid", path: "/" };
    const deps = {
      store,
      encryptionKey: KEY,
      now: NOW,
      settle: {
        order: async (_: unknown, o: CatalogOrder, trigger: Trigger) => (settled.push({ id: o.id, trigger }), answer),
        donation: async () => answer,
      },
    };
    const body = JSON.stringify({ id: "evt_1", object: "event", type: "payment_intent.succeeded", livemode: false, data: { object: { id: "pi_test_9fake", object: "payment_intent", metadata: { reference: `order-${order.id}` } } } });
    const signature = stripeSignatureHeader(body, WHSEC, Math.floor(NOW.getTime() / 1000));
    expect(await handleStripeWebhook(deps as never, app.id, new TextEncoder().encode(body), signature)).toEqual({ status: 200, body: { received: true, status: "paid" } });
    expect(settled).toEqual([{ id: order.id, trigger: { provider: "stripe", providerRef: "pi_test_9fake" } }]);
  });
});

describe("188 POST /pay/<token>/sheet", () => {
  const ask = (stripe: ReturnType<typeof fakeStripe>, token = TOKEN, settle: (t: string) => Promise<unknown> = async () => null) =>
    answerSheetRequest({ store, encryptionKey: KEY, fetcher: stripe.fetcher, now: NOW, settle }, token);

  it("answers the sheet's keys, never the secret key", async () => {
    await makeShop();
    const stripe = fakeStripe();
    const answer = await ask(stripe);
    expect(answer).toEqual({
      status: 200,
      body: { state: "ready", publishable_key: PUBLISHABLE, client_secret: `${stripe.intents[0]!.id}_secret_fake`, merchant_country: "AE", currency: "USD", amount_cents: 4500, merchant_name: "Harbour Mugs", test_mode: true },
    });
    expect(JSON.stringify(answer)).not.toContain(SECRET);
  });

  it("settles a payment already made, and says what isn't payable", async () => {
    await makeShop();
    const stripe = fakeStripe();
    await ask(stripe);
    stripe.payIntent(stripe.intents[0]!.id);
    const settled: string[] = [];
    expect((await ask(stripe, TOKEN, async (t) => settled.push(t))).body).toEqual({ state: "paid" });
    expect(settled).toEqual([TOKEN]);
    expect((await ask(stripe, "short")).status).toBe(404);
    expect((await ask(stripe, "tok_NoSuchPayment0123456789")).body).toEqual({ state: "not_found" });
    await store.updateCatalogOrder(app.id, order.id, { status: "cancelled", updatedAt: NOW });
    expect((await ask(stripe)).body).toEqual({ state: "closed" });
  });

  it("says when the order is under Stripe's least amount", async () => {
    await makeShop(stripeInput(), { totalCents: 20, subtotalCents: 20, shippingCents: 0, lines: [{ productId: 1, name: "Pin", quantity: 1, unitCents: 20, imageAssetId: null, digital: true }] });
    expect(await ask(fakeStripe())).toEqual({ status: 502, body: { state: "failed", too_small: true } });
  });
});

describe("188 the Apple Pay merchant ID", () => {
  it("is checked as Apple shows it", () => {
    for (const good of ["merchant.com.harbour.mugs", "merchant.tr.com.yallapp.shop-1"]) expect(validApplePayMerchantId(good), good).toBe(true);
    for (const bad of ["com.harbour.mugs", "merchant.", "merchant.com", "merchant.com..x", "merchant.com.x<y>", `merchant.com.${"a".repeat(130)}`]) expect(validApplePayMerchantId(bad), bad).toBe(false);
  });

  it("is saved with the Stripe keys (not a secret: shown whole, cleared when emptied)", () => {
    const form = (fields: Record<string, string>) => (name: string) => fields[name] ?? "";
    const read = readOwnKeys("stripe", form({ secretKey: SECRET, publishableKey: PUBLISHABLE, applePayMerchantId: " merchant.com.harbour.mugs " }), false);
    expect(read).toMatchObject({ ok: true, input: { applePayMerchantId: "merchant.com.harbour.mugs" } });
    expect(readOwnKeys("stripe", form({ secretKey: SECRET, publishableKey: PUBLISHABLE, applePayMerchantId: "com.harbour" }), false)).toMatchObject({ ok: false, errors: { applePayMerchantId: expect.stringContaining("merchant.") } });
    const saved = read.ok ? read.input : null;
    const cleared = readOwnKeys("stripe", form({ secretKey: "", publishableKey: PUBLISHABLE }), false, saved);
    expect(cleared.ok && cleared.input.provider === "stripe" ? (cleared.input.applePayMerchantId ?? null) : "not read").toBeNull();
    expect(savedKeysView(saved)?.applePayMerchantId).toBe("merchant.com.harbour.mugs");
  });

  it("goes into the build config with the Stripe keys, and only then", async () => {
    await makeShop(stripeInput({ applePayMerchantId: "merchant.com.harbour.mugs" }));
    expect(ownPaymentInput(app, KEY)).toMatchObject({ applePayMerchantId: "merchant.com.harbour.mugs" });
    const config = (a: App) => buildConfigFor(a, { id: a.clientId }, { name: "1.0.0", code: 1 }, (id) => `https://assets.test/${id}`);
    expect(config(app).payments).toEqual({ apple_pay_merchant_id: "merchant.com.harbour.mugs" });
    expect(JSON.stringify(config(app))).not.toContain(SECRET);
    await makeShop(stripeInput());
    expect(config(app).payments).toBeUndefined();
  });
});
