import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { completePayment, startPayment } from "@/lib/catalog/payment";
import { accountForOrder, checkoutAccount, encryptOwnPayment, ownPaymentAccount } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogOrder } from "@/lib/data/types";
import { explainPaymentError } from "@/lib/payments/explain";
import { PAYABLE_HOURS } from "@/lib/payments/pending";
import { checkAccount, confirmCheckout, isYallappProvider, PaymentError, providerTakes, startCheckout, YALLAPP_PROVIDERS, type CheckoutRequest, type PaymentAccount } from "@/lib/payments/provider";
import { refundsByApi, refundThroughProvider, type ProviderRefundRequest } from "@/lib/payments/refund";
import { callbackUrls } from "@/lib/payments/routes";
import { stripeForm, stripeTestKey, validStripeKey } from "@/lib/payments/stripe";
import { yallappAccountFor } from "@/lib/settings/platform";
import { fakePaypal, fakeStripe } from "./fake-stripe-paypal";
import { KEY, NOW, setupClient } from "./helpers";

/** 96.1 Stripe and PayPal as the owner's own gateway: a page on theirs, read back (and PayPal captured) before anything is paid. */

const STRIPE: PaymentAccount = { provider: "stripe", keys: { secretKey: "sk_test_51Abcdefghijklmnop", sandbox: true } };
const PAYPAL: PaymentAccount = { provider: "paypal", keys: { clientId: "AYpaypal-client", secret: "paypal-secret", sandbox: true } };

function request(overrides: Partial<CheckoutRequest> = {}): CheckoutRequest {
  return {
    reference: "order-42",
    amountCents: 4550,
    currency: "USD",
    description: "Order 1042",
    lines: [
      { id: "1-0", name: "Mug × 2", cents: 4050, category: "Products", digital: false },
      { id: "shipping", name: "Shipping", cents: 500, category: "Shipping", digital: true },
    ],
    customer: { id: "customer-7", name: "Ada Lovelace", email: "ada@example.com", phone: null, city: "London", address: null, ip: "203.0.113.9" },
    returnUrl: "https://yallapp.test/api/pay/stripe/order/tok",
    webhookUrl: null,
    iyzico: { conversationId: "order-1042", basketId: "42", shipping: true },
    ...overrides,
  };
}

describe("the gateways", () => {
  it("knows what Stripe and PayPal charge in, and keeps them off Yallapp's own plans", async () => {
    for (const currency of ["TRY", "USD", "EUR", "EGP", "SAR", "AED"]) expect(providerTakes("stripe", currency)).toBe(true);
    expect(providerTakes("paypal", "USD")).toBe(true);
    expect(providerTakes("paypal", "EUR")).toBe(true);
    expect(providerTakes("paypal", "TRY")).toBe(false);
    expect(providerTakes("paypal", "EGP")).toBe(false);
    expect(YALLAPP_PROVIDERS).toEqual(["iyzico", "kashier", "fawaterk"]);
    expect(isYallappProvider("stripe")).toBe(false);
    expect(isYallappProvider("kashier")).toBe(true);
    const { store } = await setupClient();
    expect(await yallappAccountFor(store, "stripe", KEY)).toBeNull();
    expect(await yallappAccountFor(store, "paypal", KEY)).toBeNull();
  });

  it("sends the customer back, with no webhook, and refunds through both APIs", () => {
    expect(callbackUrls("https://y.test", "order", "stripe", "t1")).toEqual({ returnUrl: "https://y.test/api/pay/stripe/order/t1", webhookUrl: null });
    expect(callbackUrls("https://y.test", "donation", "paypal", "t1")).toEqual({ returnUrl: "https://y.test/api/pay/paypal/donation/t1", webhookUrl: null });
    expect(refundsByApi("stripe")).toBe(true);
    expect(refundsByApi("paypal")).toBe(true);
    expect(refundsByApi("fawaterk")).toBe(false);
    expect(PAYABLE_HOURS.stripe).toBe(24);
    expect(PAYABLE_HOURS.paypal).toBe(72);
  });

  it("explains their errors in plain words, and keeps their own sentences", () => {
    expect(explainPaymentError("stripe", new PaymentError("Stripe can't be reached.", { unreachable: true }))).toBe("Stripe can't be reached.");
    expect(explainPaymentError("paypal", new PaymentError("PayPal didn't accept the client ID and secret."))).toBe("PayPal didn't accept the client ID and secret.");
    expect(explainPaymentError("stripe", new PaymentError("Invalid API Key provided: sk_test_****"))).toBe(
      "Stripe didn't accept the API keys. Check them in your Stripe panel and enter them again. Details: Invalid API Key provided: sk_test_****",
    );
  });
});

describe("Stripe", () => {
  it("tells test keys from live ones by their prefix", () => {
    expect(stripeTestKey("sk_test_abc")).toBe(true);
    expect(stripeTestKey("rk_test_abc")).toBe(true);
    expect(stripeTestKey("sk_live_abc")).toBe(false);
    expect(validStripeKey("sk_live_51AbcDEFghijklmno")).toBe(true);
    expect(validStripeKey("pk_live_51AbcDEFghijklmno")).toBe(false);
    expect(validStripeKey("sk_test_ab cd")).toBe(false);
  });

  it("encodes nested parameters as Stripe reads them", () => {
    expect(stripeForm({ a: 1, line_items: [{ quantity: 1, price_data: { currency: "usd" } }], skip: null })).toEqual([
      "a=1",
      `${encodeURIComponent("line_items[0][quantity]")}=1`,
      `${encodeURIComponent("line_items[0][price_data][currency]")}=usd`,
    ]);
  });

  it("starts a Checkout Session for the total, with our reference and an expiry Stripe takes", async () => {
    const stripe = fakeStripe({ secretKey: "sk_test_51Abcdefghijklmnop" });
    const started = await startCheckout(STRIPE, request({ pageExpiresAt: new Date(Date.now() + 5 * 60_000) }), { fetcher: stripe.fetcher });
    const session = stripe.sessions.get(started.providerRef)!;
    expect(started.url).toBe(session.url);
    expect(session.form.get("mode")).toBe("payment");
    expect(session.form.get("client_reference_id")).toBe("order-42");
    expect(session.form.get("success_url")).toBe("https://yallapp.test/api/pay/stripe/order/tok");
    expect(session.form.get("cancel_url")).toBe("https://yallapp.test/api/pay/stripe/order/tok");
    expect(session.form.get("line_items[0][price_data][unit_amount]")).toBe("4550");
    expect(session.form.get("line_items[0][price_data][currency]")).toBe("usd");
    expect(session.form.get("customer_email")).toBe("ada@example.com");
    // Stripe takes 30 minutes at least: a sooner end is moved to that.
    const expires = Number(session.form.get("expires_at")) * 1000;
    expect(expires - Date.now()).toBeGreaterThan(30 * 60_000);
    expect(stripe.calls[0]!.headers.authorization).toBe("Bearer sk_test_51Abcdefghijklmnop");
    expect(stripe.calls[0]!.headers["idempotency-key"]).toMatch(/^order-42-\d+$/);
  });

  it("confirms only a paid session of this reference, amount and currency", async () => {
    const stripe = fakeStripe();
    const started = await startCheckout(STRIPE, request(), { fetcher: stripe.fetcher });
    const expected = { reference: "order-42", amountCents: 4550, currency: "USD", providerRef: started.providerRef };
    expect(await confirmCheckout(STRIPE, expected, { fetcher: stripe.fetcher })).toEqual({ paid: false, reason: "unpaid" });
    stripe.pay(started.providerRef);
    expect(await confirmCheckout(STRIPE, { ...expected, amountCents: 9999 }, { fetcher: stripe.fetcher })).toEqual({ paid: false, reason: "mismatch" });
    expect(await confirmCheckout(STRIPE, { ...expected, reference: "order-43" }, { fetcher: stripe.fetcher })).toEqual({ paid: false, reason: "mismatch" });
    expect(await confirmCheckout(STRIPE, { ...expected, currency: "EUR" }, { fetcher: stripe.fetcher })).toEqual({ paid: false, reason: "mismatch" });
    const paid = await confirmCheckout(STRIPE, expected, { fetcher: stripe.fetcher });
    expect(paid).toEqual({ paid: true, paymentId: `pi_${started.providerRef.slice(-6)}`, transactionIds: [] });
    // Nothing to read back without the session.
    expect(await confirmCheckout(STRIPE, { ...expected, providerRef: null }, { fetcher: stripe.fetcher })).toEqual({ paid: false, reason: "unpaid" });
  });

  it("checks the key and refunds the PaymentIntent", async () => {
    const stripe = fakeStripe({ secretKey: "sk_test_51Abcdefghijklmnop" });
    expect(await checkAccount(STRIPE, { fetcher: stripe.fetcher })).toBe(true);
    expect(await checkAccount({ provider: "stripe", keys: { secretKey: "sk_test_wrong123456789", sandbox: true } }, { fetcher: stripe.fetcher })).toBe(false);
    const refund = await refundThroughProvider(STRIPE, refundRequest({ paymentId: "pi_abc123", cents: 1000 }), { fetcher: stripe.fetcher });
    expect(refund).toEqual({ parts: [{ kind: "refund", transactionId: null, cents: 1000, reference: "re_1" }], error: null });
    expect(stripe.refunds[0]!.get("payment_intent")).toBe("pi_abc123");
    expect(stripe.refunds[0]!.get("amount")).toBe("1000");
  });
});

describe("PayPal", () => {
  it("creates an order to approve, with our reference and the amount in major units", async () => {
    const paypal = fakePaypal({ clientId: "AYpaypal-client", secret: "paypal-secret" });
    const started = await startCheckout(PAYPAL, request({ returnUrl: "https://yallapp.test/api/pay/paypal/order/tok" }), { fetcher: paypal.fetcher });
    const order = paypal.orders.get(started.providerRef)!;
    expect(started.url).toBe(order.url);
    expect(order.body).toMatchObject({
      intent: "CAPTURE",
      purchase_units: [{ custom_id: "order-42", reference_id: "order-42", amount: { currency_code: "USD", value: "45.50" } }],
      payment_source: { paypal: { experience_context: { return_url: "https://yallapp.test/api/pay/paypal/order/tok", user_action: "PAY_NOW" } } },
    });
    expect(paypal.calls[0]!.path).toBe("/v1/oauth2/token");
    expect(paypal.calls[0]!.headers.authorization).toBe(`Basic ${Buffer.from("AYpaypal-client:paypal-secret").toString("base64")}`);
  });

  it("captures an approved order once, then confirms it from the capture", async () => {
    const paypal = fakePaypal();
    const started = await startCheckout(PAYPAL, request(), { fetcher: paypal.fetcher });
    const expected = { reference: "order-42", amountCents: 4550, currency: "USD", providerRef: started.providerRef };
    // Not approved yet: nothing is captured.
    expect(await confirmCheckout(PAYPAL, expected, { fetcher: paypal.fetcher })).toEqual({ paid: false, reason: "unpaid" });
    expect(paypal.calls.filter((c) => c.path.endsWith("/capture"))).toEqual([]);
    paypal.approve(started.providerRef);
    expect(await confirmCheckout(PAYPAL, expected, { fetcher: paypal.fetcher })).toEqual({ paid: true, paymentId: `CAP-${started.providerRef}`, transactionIds: [] });
    // A second confirmation reads the capture back, captures nothing again.
    expect(await confirmCheckout(PAYPAL, expected, { fetcher: paypal.fetcher })).toEqual({ paid: true, paymentId: `CAP-${started.providerRef}`, transactionIds: [] });
    expect(paypal.calls.filter((c) => c.path.endsWith("/capture"))).toHaveLength(1);
    // Another reference or amount isn't this payment.
    expect(await confirmCheckout(PAYPAL, { ...expected, amountCents: 4549 }, { fetcher: paypal.fetcher })).toEqual({ paid: false, reason: "mismatch" });
  });

  it("refuses a capture of another amount than the order's", async () => {
    const paypal = fakePaypal();
    const started = await startCheckout(PAYPAL, request(), { fetcher: paypal.fetcher });
    paypal.approve(started.providerRef, { value: "1.00", currency_code: "USD" });
    expect(await confirmCheckout(PAYPAL, { reference: "order-42", amountCents: 4550, currency: "USD", providerRef: started.providerRef }, { fetcher: paypal.fetcher })).toEqual({
      paid: false,
      reason: "mismatch",
    });
  });

  it("checks the credentials and refunds the capture", async () => {
    const paypal = fakePaypal({ clientId: "AYpaypal-client", secret: "paypal-secret" });
    expect(await checkAccount(PAYPAL, { fetcher: paypal.fetcher })).toBe(true);
    expect(await checkAccount({ provider: "paypal", keys: { clientId: "AYpaypal-client", secret: "wrong", sandbox: true } }, { fetcher: paypal.fetcher })).toBe(false);
    const refund = await refundThroughProvider(PAYPAL, refundRequest({ paymentId: "CAP-1", cents: 1550 }), { fetcher: paypal.fetcher });
    expect(refund).toEqual({ parts: [{ kind: "refund", transactionId: null, cents: 1550, reference: "RF-1" }], error: null });
    expect(paypal.refunds[0]).toEqual({ captureId: "CAP-1", body: { amount: { value: "15.50", currency_code: "USD" }, note_to_payer: "The customer asked" } });
  });
});

function withoutId(order: CatalogOrder): Omit<CatalogOrder, "id"> {
  const copy: Partial<CatalogOrder> = { ...order };
  delete copy.id;
  return copy as Omit<CatalogOrder, "id">;
}

function refundRequest(overrides: Partial<ProviderRefundRequest>): ProviderRefundRequest {
  return {
    conversationId: "order-1042",
    paymentId: null,
    providerRef: null,
    currency: "USD",
    paidCents: 4550,
    paidAt: NOW,
    cents: 4550,
    earlier: [],
    refundedBeforeCents: 0,
    reason: "buyer_request",
    note: "",
    ip: "203.0.113.9",
    now: NOW,
    ...overrides,
  };
}

describe("a shop's order on the owner's own Stripe or PayPal", () => {
  let store: MemoryStore;
  let app: App;
  let order: CatalogOrder;
  const customer = { name: "Ada Lovelace", phone: "+447700900123", email: "ada@example.com", city: "London", address: "1 Baker St" };

  async function makeShop() {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "store");
    app = { ...base, backend: "hosted", appName: "London Mugs", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "USD", payment: null } };
    await store.createApp(app);
    order = await store.createCatalogOrder({
      appId: app.id,
      tokenHash: sha256Hex("order-token"),
      userId: null,
      status: "pending",
      lines: [{ productId: 1, name: "Mug", quantity: 2, unitCents: 2000, imageAssetId: null, digital: false }],
      subtotalCents: 4000,
      shippingCents: 500,
      totalCents: 4500,
      currency: "USD",
      customer: null,
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      updatedAt: NOW,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    });
  }

  it("keeps the keys encrypted and reads them back", async () => {
    await makeShop();
    const stripe = encryptOwnPayment(app.id, { provider: "stripe", secretKey: "sk_test_51Abcdefghijklmnop", sandbox: true }, KEY);
    const paypal = encryptOwnPayment(app.id, { provider: "paypal", clientId: "AYpaypal-client", secret: "paypal-secret", sandbox: true }, KEY);
    expect(JSON.stringify(stripe)).not.toContain("sk_test_51Abcdefghijklmnop");
    expect(JSON.stringify(paypal)).not.toContain("paypal-secret");
    expect(paypal).toMatchObject({ provider: "paypal", clientId: "AYpaypal-client", sandbox: true });
    expect(ownPaymentAccount({ ...app, catalogSettings: { ...app.catalogSettings!, payment: stripe } }, KEY)).toEqual(STRIPE);
    expect(ownPaymentAccount({ ...app, catalogSettings: { ...app.catalogSettings!, payment: paypal } }, KEY)).toEqual(PAYPAL);
  });

  it("pays an order on Stripe, once", async () => {
    await makeShop();
    app = { ...app, catalogSettings: { ...app.catalogSettings!, payment: encryptOwnPayment(app.id, { provider: "stripe", secretKey: "sk_test_51Abcdefghijklmnop", sandbox: true }, KEY) } };
    await store.updateApp(app.id, { catalogSettings: app.catalogSettings }, NOW);
    const stripe = fakeStripe();
    const account = (await checkoutAccount(store, app, KEY))!;
    expect(account).toEqual({ account: STRIPE, marketplace: null });
    const page = await startPayment({ store, app, account, fetcher: stripe.fetcher, now: NOW, order, customer, ip: "203.0.113.9", callbackUrls: callbackUrls("https://yallapp.test", "order", "stripe", "order-token") });
    order = (await store.getCatalogOrder(app.id, order.id))!;
    expect(order).toMatchObject({ customer, paymentProvider: "stripe", commissionCents: null });
    expect(page).toBe(stripe.sessions.get(order.providerRef!)!.url);
    const callback = (await accountForOrder(store, app, order, KEY))!;
    const complete = () => completePayment({ store, app, account: callback, fetcher: stripe.fetcher, now: NOW, order });
    expect(await complete()).toBe("pending");
    stripe.pay(order.providerRef!);
    expect(await complete()).toBe("paid");
    expect(await store.getCatalogOrder(app.id, order.id)).toMatchObject({ status: "processing", paymentId: `pi_${order.providerRef!.slice(-6)}` });
    expect(await complete()).toBe("already_paid");
  });

  it("pays an order on PayPal in dollars, and refuses one in another currency before calling it", async () => {
    await makeShop();
    app = { ...app, catalogSettings: { ...app.catalogSettings!, payment: encryptOwnPayment(app.id, { provider: "paypal", clientId: "AYpaypal-client", secret: "paypal-secret", sandbox: true }, KEY) } };
    await store.updateApp(app.id, { catalogSettings: app.catalogSettings }, NOW);
    const paypal = fakePaypal();
    const account = (await checkoutAccount(store, app, KEY))!;
    await startPayment({ store, app, account, fetcher: paypal.fetcher, now: NOW, order, customer, ip: "203.0.113.9", callbackUrls: callbackUrls("https://yallapp.test", "order", "paypal", "order-token") });
    order = (await store.getCatalogOrder(app.id, order.id))!;
    paypal.approve(order.providerRef!);
    const callback = (await accountForOrder(store, app, order, KEY))!;
    expect(await completePayment({ store, app, account: callback, fetcher: paypal.fetcher, now: NOW, order })).toBe("paid");
    expect((await store.getCatalogOrder(app.id, order.id))!.paymentId).toBe(`CAP-${order.providerRef}`);

    const lira = await store.createCatalogOrder({ ...withoutId(order), tokenHash: sha256Hex("lira"), status: "pending", currency: "TRY", paymentId: null, paidAt: null, providerRef: null });
    const before = paypal.calls.length;
    await expect(
      startPayment({ store, app, account, fetcher: paypal.fetcher, now: NOW, order: lira, customer, ip: "203.0.113.9", callbackUrls: callbackUrls("https://yallapp.test", "order", "paypal", "lira") }),
    ).rejects.toThrow("PayPal doesn't take payments in TRY.");
    expect(paypal.calls.length).toBe(before);
  });
});
