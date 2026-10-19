import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newApp } from "@/lib/app/setup";
import { completePlanPayment, startPlanPayment } from "@/lib/billing/plan-payment";
import { approvePayout, completePayment, startPayment } from "@/lib/catalog/payment";
import { parsePayeeForm } from "@/lib/catalog/marketplace";
import { accountForOrder, checkoutAccount, encryptOwnPayment, encryptPayout, ownPaymentAccount, payoutDetails } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogOrder, type Donation } from "@/lib/data/types";
import { completeDonationPayment, donationAccount, startDonationPayment } from "@/lib/donations/payment";
import { donationsSetUp } from "@/lib/donations/service";
import { decimalToCents } from "@/lib/payments/errors";
import { checkFawaterkKeys, createFawaterkInvoice, fawaterkHash, getFawaterkInvoice, verifyFawaterkWebhook, type FawaterkKeys } from "@/lib/payments/fawaterk";
import { checkKashierKeys, createKashierSession, kashierSignature, phpQuery, verifyKashierWebhook, type KashierKeys } from "@/lib/payments/kashier";
import { cardPlans } from "@/lib/billing/plan-payment";
import { confirmCheckout, PaymentError, providerTakes, startCheckout, type CheckoutRequest, type PaymentAccount } from "@/lib/payments/provider";
import { callbackUrls } from "@/lib/payments/routes";
import { encryptSetting, yallappAccountFor, yallappPaymentAccount, yallappProvider } from "@/lib/settings/platform";
import { PLAN_INFO, plansWith } from "@/lib/plans";
import { fakeFawaterk, fakeKashier } from "./fake-providers";
import { KEY, NOW, setupClient } from "./helpers";

const KASHIER: KashierKeys = { merchantId: "MID-1234-567", apiKey: "kashier-payment-api-key", secretKey: "kashier-secret-key", sandbox: true };
const FAWATERK: FawaterkKeys = { apiKey: "fawaterk-vendor-key", sandbox: true };
const KASHIER_ACCOUNT: PaymentAccount = { provider: "kashier", keys: KASHIER };
const FAWATERK_ACCOUNT: PaymentAccount = { provider: "fawaterk", keys: FAWATERK };

/** A checkout request in EGP, as the flows build them. */
function request(overrides: Partial<CheckoutRequest> = {}): CheckoutRequest {
  return {
    reference: "order-42",
    amountCents: 45050,
    currency: "EGP",
    description: "Order 1042",
    lines: [
      { id: "1-0", name: "Koshari × 2", cents: 40050, category: "Products", digital: false },
      { id: "shipping", name: "Shipping", cents: 5000, category: "Shipping", digital: true },
    ],
    customer: { id: "customer-7", name: "Mona Hassan Ali", email: "mona@example.com", phone: "+201001234567", city: "Cairo", address: "12 Tahrir St", ip: "203.0.113.9" },
    returnUrl: "https://yallapp.test/api/pay/kashier/order/tok",
    webhookUrl: "https://yallapp.test/api/pay/kashier/order/tok",
    iyzico: { conversationId: "order-1042", basketId: "42", shipping: true },
    ...overrides,
  };
}

describe("payment providers", () => {
  it("knows which currencies each provider takes", () => {
    expect(providerTakes("iyzico", "TRY")).toBe(true);
    expect(providerTakes("iyzico", "EGP")).toBe(false);
    expect(providerTakes("kashier", "EGP")).toBe(true);
    expect(providerTakes("kashier", "TRY")).toBe(false);
    expect(providerTakes("fawaterk", "EGP")).toBe(true);
    expect(providerTakes("fawaterk", "SAR")).toBe(true);
    expect(decimalToCents("450.50")).toBe(45050);
    expect(decimalToCents(450.5)).toBe(45050);
    expect(decimalToCents("4.5e2")).toBeNull();
  });

  it("refuses a currency the provider doesn't take, before calling it", async () => {
    const kashier = fakeKashier();
    await expect(startCheckout(KASHIER_ACCOUNT, request({ currency: "TRY" }), { fetcher: kashier.fetcher })).rejects.toBeInstanceOf(PaymentError);
    expect(kashier.calls).toEqual([]);
  });

  it("builds each provider's callback addresses", () => {
    expect(callbackUrls("https://y.test", "order", "iyzico", "t1")).toEqual({ returnUrl: "https://y.test/api/pay/iyzico/t1", webhookUrl: null });
    expect(callbackUrls("https://y.test", "plan", "iyzico", "t1")).toEqual({ returnUrl: "https://y.test/api/pay/plan/t1", webhookUrl: null });
    expect(callbackUrls("https://y.test", "donation", "kashier", "t1")).toEqual({
      returnUrl: "https://y.test/api/pay/kashier/donation/t1",
      webhookUrl: "https://y.test/api/pay/kashier/donation/t1",
    });
    expect(callbackUrls("https://y.test", "order", "fawaterk", "a b").returnUrl).toBe("https://y.test/api/pay/fawaterk/order/a%20b");
  });
});

describe("Kashier", () => {
  it("creates a payment session with the secret key, the Payment API key and the amount in pounds", async () => {
    const kashier = fakeKashier();
    const started = await startCheckout(KASHIER_ACCOUNT, request(), { fetcher: kashier.fetcher });
    expect(started).toEqual({ url: "https://payments.kashier.test/session/sess1abcdef?mode=test", providerRef: "sess1abcdef", expiresAt: null });
    const call = kashier.calls[0]!;
    expect(call.method).toBe("POST");
    expect(call.url).toBe("https://test-api.kashier.io/v3/payment/sessions");
    expect(call.headers).toMatchObject({ authorization: "kashier-secret-key", "api-key": "kashier-payment-api-key", "content-type": "application/json" });
    expect(call.body).toMatchObject({
      paymentType: "credit",
      amount: "450.50",
      currency: "EGP",
      merchantId: "MID-1234-567",
      merchantRedirect: "https://yallapp.test/api/pay/kashier/order/tok",
      serverWebhook: "https://yallapp.test/api/pay/kashier/order/tok",
      type: "one-time",
      customer: { email: "mona@example.com", reference: "customer-7" },
    });
    // Each attempt has its own order reference, starting with ours.
    expect(String(call.body!.order)).toMatch(/^order-42-[a-z0-9]+$/);
  });

  it("uses the live API with live keys, and takes the session from its page when no ID comes back", async () => {
    const calls: string[] = [];
    const fetcher = (async (url: string) => {
      calls.push(url);
      return Response.json({ response: { sessionUrl: "https://payments.kashier.io/session/66aa77bb88cc99dd?mode=live" } });
    }) as unknown as typeof fetch;
    const started = await createKashierSession(
      { ...KASHIER, sandbox: false },
      { order: "plan-1-x", amountCents: 100, currency: "EGP", merchantRedirect: "https://y.test/r", serverWebhook: null, customer: { email: "a@b.c", reference: "c" }, description: "Plan" },
      { fetcher },
    );
    expect(calls).toEqual(["https://api.kashier.io/v3/payment/sessions"]);
    expect(started.sessionId).toBe("66aa77bb88cc99dd");
  });

  it("reports Kashier's error when the session can't start", async () => {
    const fetcher = (async () => Response.json({ messages: { en: "Invalid merchant" } }, { status: 400 })) as unknown as typeof fetch;
    await expect(startCheckout(KASHIER_ACCOUNT, request(), { fetcher })).rejects.toThrow("Invalid merchant");
    const down = (async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;
    await expect(startCheckout(KASHIER_ACCOUNT, request(), { fetcher: down })).rejects.toThrow("Kashier can't be reached.");
  });

  it("confirms a payment only by reading it back: paid, ours, the exact amount and currency", async () => {
    const kashier = fakeKashier({ secretKey: KASHIER.secretKey });
    const { providerRef } = await startCheckout(KASHIER_ACCOUNT, request(), { fetcher: kashier.fetcher });
    const expected = { reference: "order-42", amountCents: 45050, currency: "EGP", providerRef };
    const confirm = () => confirmCheckout(KASHIER_ACCOUNT, expected, { fetcher: kashier.fetcher });
    // Not paid yet.
    expect(await confirm()).toEqual({ paid: false, reason: "unpaid" });
    const read = kashier.calls[kashier.calls.length - 1]!;
    expect(read).toMatchObject({ method: "GET", url: `https://test-api.kashier.io/v3/payment/sessions/${providerRef}/payment`, headers: { authorization: "kashier-secret-key" } });
    // Paid, but less, in another currency, or for another order: refused.
    for (const tamper of [{ amount: "4.50" }, { currency: "USD" }, { merchantOrderId: "order-43-abc" }, { merchantOrderId: "order-421-abc" }, { amount: undefined }]) {
      kashier.pay(providerRef, tamper);
      expect(await confirm()).toEqual({ paid: false, reason: "mismatch" });
      kashier.sessions.get(providerRef)!.payment = { ...kashier.sessions.get(providerRef)!.body, merchantOrderId: kashier.sessions.get(providerRef)!.body.order, status: "PENDING" };
    }
    kashier.pay(providerRef);
    expect(await confirm()).toEqual({ paid: true, paymentId: `TX-${providerRef}`, transactionIds: [] });
    // Without a session to read, nothing is paid.
    expect(await confirmCheckout(KASHIER_ACCOUNT, { ...expected, providerRef: null }, { fetcher: kashier.fetcher })).toEqual({ paid: false, reason: "unpaid" });
  });

  it("checks webhook signatures like Kashier's own plugins: HMAC-SHA256 of the signed keys as a query string, with the Payment API key", () => {
    expect(phpQuery([["a b", "x&y"], ["n", 12], ["t", true], ["skip", null], ["o", { k: "v" }], ["q", "it's (1)*"]])).toBe("a%20b=x%26y&n=12&t=1&o%5Bk%5D=v&q=it%27s%20%281%29%2A");
    const data = {
      merchantOrderId: "order-42-abc",
      kashierOrderId: "KO-1",
      orderReference: "TEST-ORD-1",
      transactionId: "TX-1",
      status: "SUCCESS",
      method: "card",
      creationDate: "2026-10-15T10:00:00.000Z",
      amount: 450.5,
      currency: "EGP",
      signatureKeys: ["merchantOrderId", "kashierOrderId", "orderReference", "transactionId", "status", "method", "creationDate", "amount", "currency"],
    };
    const sorted = [...data.signatureKeys].sort();
    const query = sorted.map((k) => `${k}=${encodeURIComponent(String(data[k as keyof typeof data]))}`).join("&");
    const signature = createHmac("sha256", KASHIER.apiKey).update(query).digest("hex");
    expect(kashierSignature(data, sorted, KASHIER.apiKey)).toBe(signature);
    expect(verifyKashierWebhook({ event: "pay", data }, signature, KASHIER.apiKey)).toBe(true);
    // The order Kashier sent the keys in works too.
    expect(verifyKashierWebhook({ event: "pay", data }, kashierSignature(data, data.signatureKeys, KASHIER.apiKey), KASHIER.apiKey)).toBe(true);
    expect(verifyKashierWebhook({ event: "pay", data }, signature.toUpperCase(), KASHIER.apiKey)).toBe(true);
    // Another key, a changed amount, no signature: refused.
    expect(verifyKashierWebhook({ event: "pay", data }, signature, "another-key")).toBe(false);
    expect(verifyKashierWebhook({ event: "pay", data: { ...data, amount: 1 } }, signature, KASHIER.apiKey)).toBe(false);
    expect(verifyKashierWebhook({ event: "pay", data }, null, KASHIER.apiKey)).toBe(false);
    expect(verifyKashierWebhook({ event: "pay", data: { ...data, signatureKeys: [] } }, signature, KASHIER.apiKey)).toBe(false);
  });

  it("tests the connection by reading the merchant, without changing anything", async () => {
    const kashier = fakeKashier({ secretKey: KASHIER.secretKey });
    expect(await checkKashierKeys(KASHIER, { fetcher: kashier.fetcher })).toBe(true);
    expect(kashier.calls[0]).toMatchObject({ method: "GET", url: "https://test-api.kashier.io/merchant" });
    expect(await checkKashierKeys({ ...KASHIER, secretKey: "wrong" }, { fetcher: kashier.fetcher })).toBe(false);
    const down = (async () => new Response("bad gateway", { status: 502 })) as unknown as typeof fetch;
    expect(await checkKashierKeys(KASHIER, { fetcher: down })).toBeNull();
  });
});

describe("Fawaterk", () => {
  it("creates an invoice with the Bearer key, the total in pounds and our reference in its payload", async () => {
    const fawaterk = fakeFawaterk({ apiKey: FAWATERK.apiKey });
    const started = await startCheckout(FAWATERK_ACCOUNT, request({ returnUrl: "https://y.test/api/pay/fawaterk/order/tok", webhookUrl: "https://y.test/api/pay/fawaterk/order/tok" }), {
      fetcher: fawaterk.fetcher,
    });
    expect(started).toEqual({ url: "https://staging.fawaterk.test/invoice/1001/key1001", providerRef: "1001", expiresAt: null });
    const call = fawaterk.calls[0]!;
    expect(call).toMatchObject({ method: "POST", url: "https://staging.fawaterk.com/api/v2/createInvoiceLink", headers: { authorization: "Bearer fawaterk-vendor-key" } });
    expect(call.body).toEqual({
      cartTotal: "450.50",
      currency: "EGP",
      customer: { first_name: "Mona", last_name: "Hassan Ali", email: "mona@example.com", phone: "201001234567", address: "12 Tahrir St" },
      cartItems: [
        { name: "Koshari × 2", price: "400.50", quantity: "1" },
        { name: "Shipping", price: "50.00", quantity: "1" },
      ],
      payLoad: { reference: "order-42" },
      sendEmail: false,
      sendSMS: false,
      redirectionUrls: {
        successUrl: "https://y.test/api/pay/fawaterk/order/tok",
        failUrl: "https://y.test/api/pay/fawaterk/order/tok",
        pendingUrl: "https://y.test/api/pay/fawaterk/order/tok",
        webhookUrl: "https://y.test/api/pay/fawaterk/order/tok",
      },
    });
  });

  it("uses the live API with a live key and reports Fawaterk's errors", async () => {
    const urls: string[] = [];
    const fetcher = (async (url: string) => {
      urls.push(url);
      return Response.json({ status: "error", message: { currency: ["The selected currency is invalid."] } }, { status: 422 });
    }) as unknown as typeof fetch;
    await expect(
      createFawaterkInvoice(
        { ...FAWATERK, sandbox: false },
        { reference: "r", amountCents: 100, currency: "EGP", customer: { firstName: "A", lastName: "B", email: "a@b.c", phone: null, address: null }, items: [{ name: "x", cents: 100 }], successUrl: "s", failUrl: "f", pendingUrl: "p", webhookUrl: null },
        { fetcher },
      ),
    ).rejects.toThrow("The selected currency is invalid.");
    expect(urls).toEqual(["https://app.fawaterk.com/api/v2/createInvoiceLink"]);
  });

  it("confirms an invoice only by reading it back: paid, ours, the exact amount and currency", async () => {
    const fawaterk = fakeFawaterk({ apiKey: FAWATERK.apiKey });
    const { providerRef } = await startCheckout(FAWATERK_ACCOUNT, request(), { fetcher: fawaterk.fetcher });
    const expected = { reference: "order-42", amountCents: 45050, currency: "EGP", providerRef };
    const confirm = (ref = providerRef) => confirmCheckout(FAWATERK_ACCOUNT, { ...expected, providerRef: ref }, { fetcher: fawaterk.fetcher });
    expect(await confirm()).toEqual({ paid: false, reason: "unpaid" });
    expect(fawaterk.calls[1]).toMatchObject({ method: "GET", url: `https://staging.fawaterk.com/api/v2/getInvoiceData/${providerRef}`, headers: { authorization: "Bearer fawaterk-vendor-key" } });
    for (const tamper of [{ total: "4.50" }, { currency: "USD" }, { pay_load: JSON.stringify({ reference: "order-43" }) }, { pay_load: null }]) {
      fawaterk.pay(Number(providerRef), tamper);
      expect(await confirm()).toEqual({ paid: false, reason: "mismatch" });
    }
    fawaterk.pay(Number(providerRef), { total: 450.5, currency: "EGP", pay_load: { reference: "order-42" } });
    expect(await confirm()).toEqual({ paid: true, paymentId: providerRef, transactionIds: [] });
    // An invoice that isn't Fawaterk's (or ours) is not paid.
    expect(await confirm("999999")).toEqual({ paid: false, reason: "unpaid" });
    expect(await getFawaterkInvoice(FAWATERK, providerRef, { fetcher: fawaterk.fetcher })).toMatchObject({ paid: true, amountCents: 45050, reference: "order-42" });
  });

  it("checks the webhook's hashKey: HMAC-SHA256 of InvoiceId, InvoiceKey and PaymentMethod with the vendor key", () => {
    const hashKey = createHmac("sha256", FAWATERK.apiKey).update("InvoiceId=1001&InvoiceKey=key1001&PaymentMethod=Card").digest("hex");
    expect(fawaterkHash("1001", "key1001", "Card", FAWATERK.apiKey)).toBe(hashKey);
    const body = { invoice_id: 1001, invoice_key: "key1001", payment_method: "Card", invoice_status: "paid", hashKey };
    expect(verifyFawaterkWebhook(body, FAWATERK.apiKey)).toBe(true);
    expect(verifyFawaterkWebhook({ ...body, invoice_id: 1002 }, FAWATERK.apiKey)).toBe(false);
    expect(verifyFawaterkWebhook(body, "another-key")).toBe(false);
    expect(verifyFawaterkWebhook({ ...body, hashKey: undefined }, FAWATERK.apiKey)).toBe(false);
  });

  it("tests the connection by listing the payment methods", async () => {
    const fawaterk = fakeFawaterk({ apiKey: FAWATERK.apiKey });
    expect(await checkFawaterkKeys(FAWATERK, { fetcher: fawaterk.fetcher })).toBe(true);
    expect(fawaterk.calls[0]).toMatchObject({ method: "GET", url: "https://staging.fawaterk.com/api/v2/getPaymentmethods" });
    expect(await checkFawaterkKeys({ ...FAWATERK, apiKey: "wrong" }, { fetcher: fawaterk.fetcher })).toBe(false);
    const down = (async () => {
      throw new Error("timeout");
    }) as unknown as typeof fetch;
    expect(await checkFawaterkKeys(FAWATERK, { fetcher: down })).toBeNull();
  });
});

describe("Yallapp's account", () => {
  it("is iyzico until the team picks another provider, and each provider's keys stay encrypted", async () => {
    const { store } = await setupClient();
    expect(await yallappProvider(store)).toBe("iyzico");
    expect(await yallappPaymentAccount(store, KEY)).toBeNull();
    await store.setPlatformSetting(
      "kashier",
      { merchantId: KASHIER.merchantId, apiKeyEncrypted: encryptSetting("kashier", KASHIER.apiKey, KEY), secretKeyEncrypted: encryptSetting("kashier", KASHIER.secretKey, KEY), sandbox: true },
      "admin@yallapp.test",
      NOW,
    );
    expect(JSON.stringify((await store.listPlatformSettings()).map((s) => s.value))).not.toContain(KASHIER.secretKey);
    // Saved, but iyzico still takes payments.
    expect(await yallappPaymentAccount(store, KEY)).toBeNull();
    await store.setPlatformSetting("paymentProvider", { provider: "kashier" }, "admin@yallapp.test", NOW);
    expect(await yallappPaymentAccount(store, KEY)).toEqual(KASHIER_ACCOUNT);
    await store.setPlatformSetting("fawaterk", { apiKeyEncrypted: encryptSetting("fawaterk", FAWATERK.apiKey, KEY), sandbox: true }, "admin@yallapp.test", NOW);
    expect(await yallappAccountFor(store, "fawaterk", KEY)).toEqual(FAWATERK_ACCOUNT);
  });

  it("offers plans by card only when the gateway can charge them (52 iyzico needs a dollar price)", () => {
    const plans = plansWith({
      pro: { ...PLAN_INFO.pro, highlights: [...PLAN_INFO.pro.highlights], features: [...PLAN_INFO.pro.features], priceCents: 480000, onRequest: false, billingMonths: 12 },
      business: { ...PLAN_INFO.business, highlights: [...PLAN_INFO.business.highlights], features: [...PLAN_INFO.business.features], priceCents: 1500000, usdCents: 30000, onRequest: false, billingMonths: 12 },
    });
    expect(cardPlans(plans).map((p) => p.id)).toEqual(["pro", "business"]);
    expect(cardPlans(plans, "kashier").map((p) => p.id)).toEqual(["pro", "business"]);
    expect(cardPlans(plans, "fawaterk").map((p) => p.id)).toEqual(["pro", "business"]);
    expect(cardPlans(plans, "iyzico").map((p) => p.id)).toEqual(["business"]);
    expect(cardPlans(plans, "iyzico", 48).map((p) => p.id)).toEqual(["pro", "business"]);
  });
});

describe("plan payments with Kashier", () => {
  const PLANS = plansWith({ pro: { ...PLAN_INFO.pro, highlights: [...PLAN_INFO.pro.highlights], features: [...PLAN_INFO.pro.features], priceCents: 1200000, onRequest: false, billingMonths: 12 } });
  const OFFER = { charged: { cents: 1200000, currency: "EGP" as const }, shown: { cents: 1200000, currency: "EGP" as const } };

  it("starts the session, keeps it on the payment, and activates once Kashier confirms it, once", async () => {
    const setup = await setupClient({ activate: false });
    const kashier = fakeKashier({ secretKey: KASHIER.secretKey });
    let token = "";
    const url = await startPlanPayment({
      store: setup.store,
      account: KASHIER_ACCOUNT,
      fetcher: kashier.fetcher,
      now: NOW,
      client: setup.client,
      user: setup.user,
      plan: PLANS.pro,
      billing: { city: "Cairo", address: "12 Tahrir St, Downtown" },
      ip: "203.0.113.5",
      callbackUrls: (t) => {
        token = t;
        return callbackUrls("https://yallapp.test", "plan", "kashier", t);
      },
      offer: OFFER,
    });
    expect(url).toBe("https://payments.kashier.test/session/sess1abcdef?mode=test");
    expect(kashier.calls[0]!.body).toMatchObject({ amount: "12000.00", currency: "EGP", merchantRedirect: `https://yallapp.test/api/pay/kashier/plan/${token}` });
    let payment = (await setup.store.getPlanPaymentByToken(sha256Hex(token)))!;
    expect(payment).toMatchObject({ status: "pending", amountCents: 1200000, currency: "EGP", paymentProvider: "kashier", providerRef: "sess1abcdef" });
    expect(String(kashier.calls[0]!.body!.order)).toMatch(new RegExp(`^plan-${payment.id}-`));

    const complete = (p = payment) => completePlanPayment({ store: setup.store, account: KASHIER_ACCOUNT, fetcher: kashier.fetcher, now: NOW, payment: p, encryptionKey: KEY });
    // The customer came back without paying: the payment stays pending, the webhook may still confirm it.
    expect((await complete()).kind).toBe("pending");
    expect((await setup.store.getPlanPaymentByToken(sha256Hex(token)))!.status).toBe("pending");
    // A payment for less isn't this one.
    kashier.pay("sess1abcdef", { amount: "1.00" });
    expect((await complete()).kind).toBe("pending");
    expect((await setup.store.getClientById(setup.client.id))!.status).toBe("pending");

    kashier.pay("sess1abcdef", { amount: "12000.00" });
    const outcome = await complete();
    expect(outcome.kind).toBe("paid");
    expect((await setup.store.getClientById(setup.client.id))!.status).toBe("active");
    expect((await setup.store.getClientById(setup.client.id))!.paymentNote).toContain("by card (Kashier TX-sess1abcdef)");
    // The webhook and the redirect both arrive: the second does nothing, even with the stale copy.
    expect((await complete()).kind).toBe("already_paid");
    payment = (await setup.store.getPlanPaymentByToken(sha256Hex(token)))!;
    expect(payment).toMatchObject({ status: "paid", paymentId: "TX-sess1abcdef" });
    expect((await complete(payment)).kind).toBe("already_paid");
  });

  it("never confirms a Kashier payment with another provider's account", async () => {
    const setup = await setupClient({ activate: false });
    const kashier = fakeKashier();
    let token = "";
    await startPlanPayment({
      store: setup.store,
      account: KASHIER_ACCOUNT,
      fetcher: kashier.fetcher,
      now: NOW,
      client: setup.client,
      user: setup.user,
      plan: PLANS.pro,
      billing: { city: "Cairo", address: "12 Tahrir St, Downtown" },
      ip: "203.0.113.5",
      callbackUrls: (t) => ((token = t), callbackUrls("https://yallapp.test", "plan", "kashier", t)),
      offer: OFFER,
    });
    kashier.pay("sess1abcdef");
    const payment = (await setup.store.getPlanPaymentByToken(sha256Hex(token)))!;
    expect((await completePlanPayment({ store: setup.store, account: FAWATERK_ACCOUNT, fetcher: kashier.fetcher, now: NOW, payment, encryptionKey: KEY })).kind).toBe("failed");
    expect((await setup.store.getClientById(setup.client.id))!.status).toBe("pending");
  });
});

describe("a shop's own Kashier or Fawaterk keys", () => {
  let store: MemoryStore;
  let app: App;
  let order: CatalogOrder;
  const customer = { name: "Mona Hassan", phone: "+201001234567", email: "mona@example.com", city: "Cairo", address: "12 Tahrir St" };

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "store");
    app = {
      ...base,
      backend: "hosted",
      appName: "Cairo Kitchen",
      connector: { kind: "catalog" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "EGP", payment: encryptOwnPayment(base.id, { provider: "fawaterk", apiKey: FAWATERK.apiKey, sandbox: true }, KEY) },
    };
    await store.createApp(app);
    order = await store.createCatalogOrder({
      appId: app.id,
      tokenHash: sha256Hex("order-token"),
      userId: null,
      status: "pending",
      lines: [{ productId: 1, name: "Koshari", quantity: 2, unitCents: 7500, imageAssetId: null, digital: false }],
      subtotalCents: 15000,
      shippingCents: 2500,
      totalCents: 17500,
      currency: "EGP",
      customer: null,
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      updatedAt: NOW,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    });
  });

  it("keeps the owner's keys encrypted and reads them back per provider", () => {
    const sealed = encryptOwnPayment(app.id, { provider: "kashier", merchantId: KASHIER.merchantId, apiKey: KASHIER.apiKey, secretKey: KASHIER.secretKey, sandbox: true }, KEY);
    expect(JSON.stringify(sealed)).not.toContain(KASHIER.secretKey);
    expect(ownPaymentAccount({ ...app, catalogSettings: { ...app.catalogSettings!, payment: sealed } }, KEY)).toEqual(KASHIER_ACCOUNT);
    expect(ownPaymentAccount(app, KEY)).toEqual(FAWATERK_ACCOUNT);
    // Another app's context can't open them.
    expect(ownPaymentAccount({ ...app, id: "another-app" }, KEY)).toBeNull();
  });

  it("pays an order on Fawaterk, confirmed by the invoice the webhook names, once", async () => {
    const fawaterk = fakeFawaterk({ apiKey: FAWATERK.apiKey });
    const account = (await checkoutAccount(store, app, KEY))!;
    expect(account).toEqual({ account: FAWATERK_ACCOUNT, marketplace: null });
    const page = await startPayment({ store, app, account, fetcher: fawaterk.fetcher, now: NOW, order, customer, ip: "203.0.113.9", callbackUrls: callbackUrls("https://yallapp.test", "order", "fawaterk", "order-token") });
    expect(page).toBe("https://staging.fawaterk.test/invoice/1001/key1001");
    expect(fawaterk.calls[0]!.body).toMatchObject({ cartTotal: "175.00", currency: "EGP", payLoad: { reference: `order-${order.id}` }, cartItems: [{ name: "Koshari × 2", price: "150.00" }, { name: "Shipping", price: "25.00" }] });
    order = (await store.getCatalogOrder(app.id, order.id))!;
    expect(order).toMatchObject({ customer, paymentProvider: "fawaterk", providerRef: "1001", commissionCents: null });

    const callback = (await accountForOrder(store, app, order, KEY))!;
    const complete = (providerRef?: string) => completePayment({ store, app, account: callback, fetcher: fawaterk.fetcher, now: NOW, order, providerRef });
    expect(await complete()).toBe("pending");
    // A webhook naming another (paid) invoice of ours doesn't pay this order.
    const other = await startCheckout(FAWATERK_ACCOUNT, request({ reference: "order-999", amountCents: 17500, lines: [{ id: "x", name: "x", cents: 17500, category: "Products", digital: true }] }), { fetcher: fawaterk.fetcher });
    fawaterk.pay(Number(other.providerRef));
    expect(await complete(other.providerRef)).toBe("pending");
    expect((await store.getCatalogOrder(app.id, order.id))!.status).toBe("pending");

    fawaterk.pay(1001);
    expect(await complete("1001")).toBe("paid");
    expect(await store.getCatalogOrder(app.id, order.id)).toMatchObject({ status: "processing", paymentId: "1001", paidAt: NOW });
    expect(await complete("1001")).toBe("already_paid");
    expect(await completePayment({ store, app, account: callback, fetcher: fawaterk.fetcher, now: NOW, order: (await store.getCatalogOrder(app.id, order.id))! })).toBe("already_paid");
  });

  it("follows the provider the order started with, not the shop's current keys", async () => {
    const fawaterk = fakeFawaterk();
    await startPayment({ store, app, account: (await checkoutAccount(store, app, KEY))!, fetcher: fawaterk.fetcher, now: NOW, order, customer, ip: "203.0.113.9", callbackUrls: callbackUrls("https://yallapp.test", "order", "fawaterk", "order-token") });
    order = (await store.getCatalogOrder(app.id, order.id))!;
    const switched = { ...app, catalogSettings: { ...app.catalogSettings!, payment: encryptOwnPayment(app.id, { provider: "kashier", merchantId: KASHIER.merchantId, apiKey: "a", secretKey: "b", sandbox: true }, KEY) } };
    expect(await accountForOrder(store, switched, order, KEY)).toBeNull();
    expect(await accountForOrder(store, app, order, KEY)).toEqual({ account: FAWATERK_ACCOUNT, marketplace: null });
  });

  it("sells through Yallapp's Kashier account: the commission is kept, and the release is recorded for the team's transfer", async () => {
    await store.setPlatformSetting(
      "kashier",
      { merchantId: KASHIER.merchantId, apiKeyEncrypted: encryptSetting("kashier", KASHIER.apiKey, KEY), secretKeyEncrypted: encryptSetting("kashier", KASHIER.secretKey, KEY), sandbox: true },
      "admin@yallapp.test",
      NOW,
    );
    await store.setPlatformSetting("marketplace", { commissionPercent: 10 }, "admin@yallapp.test", NOW);
    const payee = parsePayeeForm({ payeeName: "Cairo Kitchen", contactName: "Mona Hassan", email: "mona@example.com", phone: "0100 123 4567", address: "12 Tahrir St, Downtown", iban: "EG38 0019 0005 0000 0000 2631 8000 2" });
    if (!payee.ok) throw new Error(JSON.stringify(payee.errors));
    expect(payee.payee).toMatchObject({ phone: "+201001234567", iban: "EG380019000500000000263180002" });
    expect(parsePayeeForm({ iban: "EG38 0019 0005 0000 0000 2631 8000 3" })).toMatchObject({ ok: false, errors: { iban: expect.any(String) } });
    const shop = {
      ...app,
      catalogSettings: {
        ...app.catalogSettings!,
        payment: {
          provider: "yallapp" as const,
          via: "kashier" as const,
          subMerchantKey: "",
          subMerchantType: "PERSONAL" as const,
          payeeName: "Cairo Kitchen",
          ibanLast4: "8002",
          payoutEncrypted: encryptPayout(app.id, payee.payee, KEY),
          sandbox: true,
          joinedAt: NOW.toISOString(),
        },
      },
    };
    // Yallapp's provider is still iyzico: the shop that joined with Kashier can't sell until it's Kashier again.
    expect(await checkoutAccount(store, shop, KEY)).toBeNull();
    await store.setPlatformSetting("paymentProvider", { provider: "kashier" }, "admin@yallapp.test", NOW);
    const account = (await checkoutAccount(store, shop, KEY))!;
    expect(account).toEqual({ account: KASHIER_ACCOUNT, marketplace: { subMerchantKey: "", commissionPercent: 10 } });
    expect(payoutDetails(shop, KEY)).toEqual(payee.payee);

    const kashier = fakeKashier();
    await startPayment({ store, app: shop, account, fetcher: kashier.fetcher, now: NOW, order, customer, ip: "203.0.113.9", callbackUrls: callbackUrls("https://yallapp.test", "order", "kashier", "order-token") });
    // No split: the whole payment goes to Yallapp's account.
    expect(kashier.calls[0]!.body).toMatchObject({ amount: "175.00", merchantId: KASHIER.merchantId });
    order = (await store.getCatalogOrder(app.id, order.id))!;
    expect(order).toMatchObject({ commissionCents: 1500, paymentProvider: "kashier" });
    kashier.pay(order.providerRef!);
    const callback = (await accountForOrder(store, shop, order, KEY))!;
    expect(await completePayment({ store, app: shop, account: callback, fetcher: kashier.fetcher, now: NOW, order })).toBe("paid");
    order = (await store.getCatalogOrder(app.id, order.id))!;
    expect(await approvePayout({ store, app: shop, account: callback, fetcher: kashier.fetcher, now: NOW, order })).toBe(true);
    expect((await store.getCatalogOrder(app.id, order.id))!.payoutApprovedAt).toEqual(NOW);
    // Kashier is never asked to release anything.
    expect(kashier.calls.map((c) => new URL(c.url).pathname)).toEqual(["/v3/payment/sessions", `/v3/payment/sessions/${order.providerRef}/payment`]);
  });
});

describe("donations into a charity's own Kashier account", () => {
  it("starts on Kashier, counts the donation once Kashier confirms it, once", async () => {
    const { store } = await setupClient();
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "donations", "charity");
    const app: App = {
      ...base,
      backend: "hosted",
      appName: "Cairo Food Bank",
      connector: { kind: "campaigns" },
      catalogSettings: {
        ...DEFAULT_CATALOG_SETTINGS,
        payment: encryptOwnPayment(base.id, { provider: "kashier", merchantId: KASHIER.merchantId, apiKey: KASHIER.apiKey, secretKey: KASHIER.secretKey, sandbox: true }, KEY),
      },
    };
    await store.createApp(app);
    expect(donationsSetUp(app)).toBe(true);
    expect(donationAccount(app, KEY)).toEqual(KASHIER_ACCOUNT);
    expect(donationAccount({ ...app, demo: true }, KEY)).toBeNull();
    let donation: Donation = await store.createDonation({
      appId: app.id,
      campaignId: null,
      campaignTitle: "Ramadan boxes",
      tokenHash: sha256Hex("donation-token"),
      receiptCode: "receipt-donation-token-xxxxxxxx",
      userId: null,
      amountCents: 50000,
      currency: "EGP",
      recurring: "none",
      anonymous: false,
      message: null,
      donorName: null,
      donorEmail: null,
      donorPhone: null,
      status: "pending",
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      updatedAt: NOW,
    });
    const kashier = fakeKashier({ secretKey: KASHIER.secretKey });
    await startDonationPayment({
      store,
      app,
      account: KASHIER_ACCOUNT,
      donation,
      donor: { name: "Omar Said", email: "omar@example.com", phone: null, city: "Giza" },
      ip: "203.0.113.9",
      callbackUrls: callbackUrls("https://yallapp.test", "donation", "kashier", "donation-token"),
      now: NOW,
      fetcher: kashier.fetcher,
    });
    expect(kashier.calls[0]!.body).toMatchObject({ amount: "500.00", currency: "EGP", customer: { email: "omar@example.com" } });
    donation = (await store.getDonation(app.id, donation.id))!;
    expect(donation).toMatchObject({ donorName: "Omar Said", paymentProvider: "kashier", providerRef: "sess1abcdef" });
    const complete = (d: Donation) => completeDonationPayment({ store, account: KASHIER_ACCOUNT, donation: d, now: NOW, fetcher: kashier.fetcher });
    expect(await complete(donation)).toBe("pending");
    kashier.pay("sess1abcdef", { currency: "USD" });
    expect(await complete(donation)).toBe("pending");
    kashier.pay("sess1abcdef", { currency: "EGP" });
    expect(await complete(donation)).toBe("paid");
    expect(await complete(donation)).toBe("already_paid");
    expect(await store.getDonation(app.id, donation.id)).toMatchObject({ status: "paid", paymentId: "TX-sess1abcdef" });
  });
});

describe("the Kashier and Fawaterk routes", () => {
  const env = { ...process.env };
  let store: MemoryStore;
  let app: App;
  let order: CatalogOrder;
  let kashier: ReturnType<typeof fakeKashier>;
  const ENCRYPTION = Buffer.from("0".repeat(64), "hex");

  beforeEach(async () => {
    vi.resetModules();
    process.env.APP_URL = "https://yallapp.test";
    ({ store } = await setupClient());
    (globalThis as unknown as { __yallappStore?: Promise<MemoryStore> }).__yallappStore = Promise.resolve(store);
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "store");
    app = {
      ...base,
      backend: "hosted",
      appName: "Cairo Kitchen",
      connector: { kind: "catalog" },
      catalogSettings: {
        ...DEFAULT_CATALOG_SETTINGS,
        currency: "EGP",
        payment: encryptOwnPayment(base.id, { provider: "kashier", merchantId: KASHIER.merchantId, apiKey: KASHIER.apiKey, secretKey: KASHIER.secretKey, sandbox: true }, ENCRYPTION),
      },
    };
    await store.createApp(app);
    order = await store.createCatalogOrder({
      appId: app.id,
      tokenHash: sha256Hex("route-token"),
      userId: null,
      status: "pending",
      lines: [{ productId: 1, name: "Koshari", quantity: 1, unitCents: 7500, imageAssetId: null, digital: true }],
      subtotalCents: 7500,
      shippingCents: 0,
      totalCents: 7500,
      currency: "EGP",
      customer: null,
      paymentId: null,
      createdAt: new Date(),
      paidAt: null,
      updatedAt: new Date(),
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    });
    kashier = fakeKashier({ secretKey: KASHIER.secretKey });
    vi.stubGlobal("fetch", kashier.fetcher);
    const started = await startPayment({
      store,
      app,
      account: (await checkoutAccount(store, app, ENCRYPTION))!,
      fetcher: kashier.fetcher,
      now: new Date(),
      order,
      customer: { name: "Mona Hassan", phone: "+201001234567", email: "mona@example.com", city: "Cairo", address: "12 Tahrir St" },
      ip: "203.0.113.9",
      callbackUrls: callbackUrls("https://yallapp.test", "order", "kashier", "route-token"),
    });
    expect(started).toContain("sess1abcdef");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...env };
    delete (globalThis as unknown as { __yallappStore?: unknown }).__yallappStore;
  });

  const webhook = (data: Record<string, unknown>, signature: string | null) =>
    new Request("https://yallapp.test/api/pay/kashier/order/route-token", {
      method: "POST",
      headers: { "content-type": "application/json", ...(signature ? { "x-kashier-signature": signature } : {}) },
      body: JSON.stringify({ event: "pay", data }),
    });

  it("ignores an unsigned webhook, pays on a signed one after reading it back, and the redirect then finds it paid", async () => {
    const { providerReturn, providerWebhook } = await import("@/lib/payments/provider-route");
    const data = { merchantOrderId: `order-${order.id}-x`, status: "SUCCESS", amount: "75.00", currency: "EGP", signatureKeys: ["amount", "currency", "merchantOrderId", "status"] };
    const signed = kashierSignature(data, data.signatureKeys, KASHIER.apiKey);

    // Not signed with the shop's key: refused, nothing read.
    const calls = kashier.calls.length;
    expect((await providerWebhook("kashier", "order", "route-token", webhook(data, "0".repeat(64)))).status).toBe(401);
    expect((await providerWebhook("kashier", "order", "route-token", webhook(data, null))).status).toBe(401);
    expect(kashier.calls.length).toBe(calls);

    // Signed, but Kashier hasn't the payment as paid: the webhook's word isn't enough.
    const pending = await providerWebhook("kashier", "order", "route-token", webhook(data, signed));
    expect(await pending.json()).toEqual({ received: true, status: "pending" });
    expect((await store.getCatalogOrder(app.id, order.id))!.status).toBe("pending");

    kashier.pay("sess1abcdef", { amount: "75.00" });
    const paid = await providerWebhook("kashier", "order", "route-token", webhook(data, signed));
    expect(await paid.json()).toEqual({ received: true, status: "paid" });
    expect((await store.getCatalogOrder(app.id, order.id))!).toMatchObject({ status: "processing", paymentId: "TX-sess1abcdef" });
    // Kashier retries, and the customer comes back: nothing happens twice.
    expect(await (await providerWebhook("kashier", "order", "route-token", webhook(data, signed))).json()).toEqual({ received: true, status: "already_paid" });
    const back = await providerReturn("kashier", "order", "route-token");
    expect(back.status).toBe(303);
    expect(back.headers.get("location")).toBe("https://yallapp.test/pay/route-token/order-received");
    // Another provider's route, an unknown kind or token: not this payment.
    expect((await providerReturn("fawaterk", "order", "route-token")).headers.get("location")).toBe("https://yallapp.test/pay/route-token?payment=failed");
    expect((await providerReturn("kashier", "nothing", "route-token")).status).toBe(404);
    expect((await providerWebhook("kashier", "order", "unknown", webhook(data, signed))).status).toBe(404);
  });

  it("sends the customer back to try again while Kashier hasn't confirmed the payment", async () => {
    const { providerReturn } = await import("@/lib/payments/provider-route");
    const back = await providerReturn("kashier", "order", "route-token");
    expect(back.headers.get("location")).toBe("https://yallapp.test/pay/route-token?payment=pending");
    expect((await store.getCatalogOrder(app.id, order.id))!.status).toBe("pending");
  });
});
