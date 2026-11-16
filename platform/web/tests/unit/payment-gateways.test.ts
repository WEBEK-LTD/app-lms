import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { catalogSettings, encryptOwnPayment, ownPaymentAccount, ownPaymentInput, type OwnPaymentInput } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogOrder, type OwnStripePayment } from "@/lib/data/types";
import { dashboardMessages } from "@/i18n/dashboard";
import { flattenMessages } from "@/i18n";
import { CHECK_CODES, testConnection, type ConnectionInput, type ConnectionReport } from "@/lib/payments/connection";
import { explainPaymentError } from "@/lib/payments/explain";
import { readOwnKeys, savedKeysView, takesOwnCardPayments } from "@/lib/payments/owner-keys";
import { PaymentError, startCheckout, type CheckoutRequest } from "@/lib/payments/provider";
import type { Settled, Trigger } from "@/lib/payments/settle";
import {
  centsFromStripe,
  createStripeSession,
  scrubStripeText,
  STRIPE_API_VERSION,
  stripeAmount,
  stripeMinimumCents,
  stripeSignature,
  stripeSignatureHeader,
  verifyStripeSignature,
} from "@/lib/payments/stripe";
import { maskKey, STRIPE_WEBHOOK_EVENTS, stripeKeyMode, stripeKeysProblem, stripeWebhookUrl, validStripePublishableKey, validStripeWebhookSecret } from "@/lib/payments/stripe-keys";
import { handleStripeWebhook, nextReceipt, noteWebhook } from "@/lib/payments/webhooks";
import { KEY, NOW, setupClient } from "./helpers";

/**
 * 132.30–132.36 The owner's gateways done right: Stripe's two keys and their
 * mode, its webhook signed as Stripe's docs say, amounts in Stripe's units,
 * and "Test connection" for every gateway (mocked HTTP; every key here is
 * made up and works nowhere).
 */

const SK_TEST = "sk_test_51FakeKeyTests";
const PK_TEST = "pk_test_51FakeKeyTests";
const SK_LIVE = "sk_live_51FakeKeyTests";
const PK_LIVE = "pk_live_51FakeKeyTests";
const WHSEC = "whsec_FakeSigningSecretForTests1234";
const HOOK = "https://yallapp.test/api/pay/stripe/webhook/app-1";

interface Call {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

/** A fetch that answers by "METHOD host/path" (the path without its query), recording each call. */
function fakeFetch(routes: Record<string, (call: Call) => { status?: number; json: unknown } | "down">) {
  const calls: Call[] = [];
  const fetcher = (async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    const headers = Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]));
    const call = { method: init?.method ?? "GET", url: input, headers, body: init?.body ? String(init.body) : "" };
    calls.push(call);
    const route = routes[`${call.method} ${url.host}${url.pathname}`] ?? routes[`${call.method} ${url.pathname}`];
    if (!route) return Response.json({ error: { message: "No such route" } }, { status: 404 });
    const answer = route(call);
    if (answer === "down") throw new TypeError("fetch failed");
    return Response.json(answer.json, { status: answer.status ?? 200 });
  }) as unknown as typeof fetch;
  return { fetcher, calls };
}

/** Stripe's answers for a test account whose webhook endpoint is set up right. */
function stripeRoutes(overrides: Record<string, (call: Call) => { status?: number; json: unknown } | "down"> = {}) {
  return {
    "GET /v1/account": () => ({ json: { id: "acct_1Fake", country: "AE", default_currency: "aed", charges_enabled: true, business_profile: { name: "Harbour Mugs" } } }),
    "GET /v1/checkout/sessions": () => ({ json: { object: "list", data: [], has_more: false } }),
    "GET /v1/webhook_endpoints": () => ({ json: { object: "list", data: [{ id: "we_1", url: HOOK, status: "enabled", enabled_events: [...STRIPE_WEBHOOK_EVENTS] }] } }),
    "POST /v1/payment_intents": () => ({ json: { id: "pi_test_1", status: "requires_payment_method" } }),
    "POST /v1/payment_intents/pi_test_1/cancel": () => ({ json: { id: "pi_test_1", status: "canceled" } }),
    ...overrides,
  };
}

function stripeInput(overrides: Partial<Extract<OwnPaymentInput, { provider: "stripe" }>> = {}): OwnPaymentInput {
  return { provider: "stripe", secretKey: SK_TEST, sandbox: true, publishableKey: PK_TEST, webhookSecret: WHSEC, ...overrides };
}

function connection(input: OwnPaymentInput, overrides: Partial<ConnectionInput> = {}): ConnectionInput {
  return { input, currency: "USD", stripeWebhookUrl: HOOK, receipt: null, testPayment: false, now: NOW, ...overrides };
}

const codes = (report: ConnectionReport) => report.checks.map((c) => `${c.tone}:${c.code}`);

describe("132.30 Stripe's keys", () => {
  it("tells the publishable key from the secret one, and their mode by the prefix", () => {
    expect(validStripePublishableKey(PK_TEST)).toBe(true);
    expect(validStripePublishableKey(PK_LIVE)).toBe(true);
    expect(validStripePublishableKey(SK_TEST)).toBe(false);
    expect(validStripePublishableKey("pk_test_short")).toBe(false);
    expect(stripeKeyMode(SK_TEST)).toBe("test");
    expect(stripeKeyMode("rk_live_51FakeRkKey")).toBe("live");
    expect(stripeKeyMode(PK_LIVE)).toBe("live");
    expect(stripeKeyMode("whsec_abc")).toBeNull();
    expect(stripeKeyMode("")).toBeNull();
  });

  it("wants both keys of the same mode", () => {
    expect(stripeKeysProblem(SK_TEST, PK_TEST)).toBeNull();
    expect(stripeKeysProblem(SK_LIVE, PK_LIVE)).toBeNull();
    expect(stripeKeysProblem("rk_test_51FakeRkKey", PK_TEST)).toBeNull();
    expect(stripeKeysProblem(SK_TEST, PK_LIVE)).toBe("mode_mix");
    expect(stripeKeysProblem(SK_LIVE, PK_TEST)).toBe("mode_mix");
    expect(stripeKeysProblem(PK_TEST, PK_TEST)).toBe("secret_shape");
    expect(stripeKeysProblem(SK_TEST, null)).toBe("publishable_missing");
    expect(stripeKeysProblem(SK_TEST, "pk_test_ab cd")).toBe("publishable_shape");
  });

  it("knows a signing secret by its prefix, and masks every key to its last four", () => {
    expect(validStripeWebhookSecret(WHSEC)).toBe(true);
    expect(validStripeWebhookSecret(`whsec_${"ab12".repeat(16)}`)).toBe(true);
    expect(validStripeWebhookSecret("whsec_short")).toBe(false);
    expect(validStripeWebhookSecret(SK_TEST)).toBe(false);
    expect(maskKey(SK_TEST)).toBe("sk_test_…ests");
    expect(maskKey("rk_live_51FakeRkKey")).toBe("rk_live_…kKey");
    expect(maskKey(WHSEC)).toBe("whsec_…1234");
    expect(maskKey("shop-kashier-secret")).toBe("…cret");
    expect(maskKey("short")).toBe("…");
    expect(maskKey(null)).toBeNull();
  });

  it("cuts keys out of Stripe's own words", () => {
    expect(scrubStripeText(`Invalid API Key provided: ${SK_TEST}`)).toBe("Invalid API Key provided: sk_test_…ests");
    expect(scrubStripeText("Invalid API Key provided: sk_test_****ests")).toBe("Invalid API Key provided: sk_test_…ests");
    expect(scrubStripeText("No such payment_intent")).toBe("No such payment_intent");
  });

  it("reads the form: both keys, the mode from them, the signing secret optional, and the saved ones for empty fields", () => {
    const form = (values: Record<string, string>) => (name: string) => values[name] ?? "";
    expect(readOwnKeys("stripe", form({ secretKey: SK_TEST, publishableKey: PK_TEST }), false)).toEqual({
      ok: true,
      input: { provider: "stripe", secretKey: SK_TEST, sandbox: true, publishableKey: PK_TEST, webhookSecret: null },
    });
    expect(readOwnKeys("stripe", form({ secretKey: SK_TEST }), false)).toEqual({ ok: false, errors: { publishableKey: "Paste your Stripe publishable key: it starts with pk_live_ or pk_test_." } });
    expect(readOwnKeys("stripe", form({ secretKey: SK_LIVE, publishableKey: PK_TEST }), false)).toEqual({
      ok: false,
      errors: { publishableKey: "Use two keys of the same mode: both test (pk_test_ and sk_test_) or both live (pk_live_ and sk_live_)." },
    });
    expect(readOwnKeys("stripe", form({ secretKey: "pk_test_publishable123456" }), false)).toEqual({
      ok: false,
      errors: { secretKey: "Paste your Stripe secret key: it starts with sk_live_ or sk_test_.", publishableKey: "Paste your Stripe publishable key: it starts with pk_live_ or pk_test_." },
    });
    expect(readOwnKeys("stripe", form({ secretKey: SK_TEST, publishableKey: PK_TEST, webhookSecret: "secret" }), false)).toEqual({
      ok: false,
      errors: { webhookSecret: "Paste the webhook's signing secret: it starts with whsec_." },
    });
    // Saved keys stand in for empty fields: the owner adds the signing secret alone.
    const saved = stripeInput({ webhookSecret: null });
    expect(readOwnKeys("stripe", form({ webhookSecret: WHSEC }), false, saved)).toEqual({ ok: true, input: stripeInput() });
    // Never another gateway's.
    expect(readOwnKeys("paypal", form({}), true, saved)).toEqual({ ok: false, errors: { clientId: "Paste your PayPal client ID.", secretKey: "Paste your PayPal secret." } });
    const kashier: OwnPaymentInput = { provider: "kashier", merchantId: "MID-1234-567", apiKey: "kashier-api", secretKey: "kashier-secret", sandbox: true };
    expect(readOwnKeys("kashier", form({ merchantId: "MID-1234-567" }), true, kashier)).toEqual({ ok: true, input: kashier });
    // Test connection: an old Stripe setting without its publishable key is still tested.
    expect(readOwnKeys("stripe", form({}), false, stripeInput({ publishableKey: null }), { lenient: true })).toEqual({ ok: true, input: stripeInput({ publishableKey: null }) });
  });

  it("keeps the publishable key and the signing secret, old settings still working", async () => {
    const { store } = await setupClient();
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const app: App = { ...newApp(client.id, null, NOW, "store"), connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: null } };
    const payment = encryptOwnPayment(app.id, stripeInput(), KEY) as OwnStripePayment;
    expect(payment.publishableKey).toBe(PK_TEST);
    expect(JSON.stringify(payment)).not.toContain(SK_TEST);
    expect(JSON.stringify(payment)).not.toContain(WHSEC);
    const withKeys = { ...app, catalogSettings: { ...app.catalogSettings!, payment } };
    expect(ownPaymentInput(withKeys, KEY)).toEqual(stripeInput());
    expect(savedKeysView(ownPaymentInput(withKeys, KEY))).toEqual({ provider: "stripe", secretKey: "sk_test_…ests", apiKey: null, publishableKey: PK_TEST, webhookSecret: "whsec_…1234" });
    // Saved before 132: the secret key alone. It still takes payments.
    const old = encryptOwnPayment(app.id, { provider: "stripe", secretKey: SK_TEST, sandbox: true }, KEY);
    expect(old).not.toHaveProperty("publishableKey");
    const oldApp = { ...app, catalogSettings: { ...app.catalogSettings!, payment: old } };
    expect(ownPaymentAccount(oldApp, KEY)).toEqual({ provider: "stripe", keys: { secretKey: SK_TEST, sandbox: true } });
    expect(ownPaymentInput(oldApp, KEY)).toEqual({ provider: "stripe", secretKey: SK_TEST, sandbox: true, publishableKey: null, webhookSecret: null });
    expect(takesOwnCardPayments(app)).toBe(true);
    expect(takesOwnCardPayments({ connector: { kind: "wordpress" } })).toBe(false);
  });
});

describe("132.31 Stripe's webhook signature", () => {
  const body = '{"id":"evt_test_webhook","object":"event"}';
  const at = new Date(1_700_000_000_000 + 30_000);

  it("is HMAC-SHA256 of the timestamp, a dot and the raw body, keyed with the whole secret", () => {
    // Worked out with `openssl dgst -sha256 -hmac whsec_test_secret` over "1700000000.<body>".
    expect(stripeSignature(body, "whsec_test_secret", 1_700_000_000)).toBe("d95c6b7477fbd7e9f90b1b0ef5f9c7ac25abca5382460e0d988c2b2a5b71b990");
    expect(stripeSignature(body, WHSEC, 1_700_000_000)).toBe(createHmac("sha256", WHSEC).update(`1700000000.${body}`).digest("hex"));
    expect(stripeSignature(new TextEncoder().encode(body), WHSEC, 1_700_000_000)).toBe(stripeSignature(body, WHSEC, 1_700_000_000));
  });

  it("accepts a signed body within the tolerance, the bytes as they came", () => {
    const header = stripeSignatureHeader(body, WHSEC, 1_700_000_000);
    expect(verifyStripeSignature(body, header, WHSEC, { now: at })).toEqual({ ok: true, timestamp: 1_700_000_000 });
    expect(verifyStripeSignature(new TextEncoder().encode(body), header, WHSEC, { now: at })).toEqual({ ok: true, timestamp: 1_700_000_000 });
  });

  it("takes any of several v1 signatures (a rolled secret), ignores v0 and unknown entries, in any order", () => {
    const good = stripeSignature(body, WHSEC, 1_700_000_000);
    const other = stripeSignature(body, "whsec_OldSecretStillActive1234", 1_700_000_000);
    expect(verifyStripeSignature(body, `v0=${good},v1=${other},foo=bar,v1=${good},t=1700000000`, WHSEC, { now: at }).ok).toBe(true);
    // A v0 alone (Stripe's test events carry a fake one) is no signature.
    expect(verifyStripeSignature(body, `t=1700000000,v0=${good}`, WHSEC, { now: at })).toEqual({ ok: false, reason: "no_signature" });
  });

  it("refuses another secret, a changed body, an old timestamp and a missing header", () => {
    const header = stripeSignatureHeader(body, WHSEC, 1_700_000_000);
    expect(verifyStripeSignature(body, header, "whsec_AnotherSecretEntirely123", { now: at })).toEqual({ ok: false, reason: "mismatch" });
    expect(verifyStripeSignature(`${body} `, header, WHSEC, { now: at })).toEqual({ ok: false, reason: "mismatch" });
    expect(verifyStripeSignature(JSON.stringify(JSON.parse(body), null, 2), header, WHSEC, { now: at })).toEqual({ ok: false, reason: "mismatch" });
    expect(verifyStripeSignature(body, header, WHSEC, { now: new Date(1_700_000_000_000 + 301_000) })).toEqual({ ok: false, reason: "too_old" });
    expect(verifyStripeSignature(body, header, WHSEC, { now: new Date(1_700_000_000_000 + 3_600_000), toleranceSeconds: 7200 }).ok).toBe(true);
    expect(verifyStripeSignature(body, null, WHSEC, { now: at })).toEqual({ ok: false, reason: "no_header" });
    expect(verifyStripeSignature(body, "v1=abc", WHSEC, { now: at })).toEqual({ ok: false, reason: "no_timestamp" });
    expect(verifyStripeSignature(body, "t=1700000000,v1=nothex", WHSEC, { now: at })).toEqual({ ok: false, reason: "no_signature" });
  });
});

describe("132.32 Stripe's API version, idempotency and currencies", () => {
  it("counts amounts in each currency's own units", () => {
    expect(stripeAmount(4550, "USD")).toBe(4550);
    expect(stripeAmount(4550, "try")).toBe(4550);
    expect(stripeAmount(50000, "JPY")).toBe(500);
    expect(stripeAmount(50050, "JPY")).toBeNull();
    expect(stripeAmount(1234, "KWD")).toBe(12340);
    expect(stripeAmount(120000, "ISK")).toBe(120000);
    expect(stripeAmount(120050, "ISK")).toBeNull();
    expect(stripeAmount(-1, "USD")).toBeNull();
    expect(centsFromStripe(500, "JPY")).toBe(50000);
    expect(centsFromStripe(12340, "KWD")).toBe(1234);
    expect(centsFromStripe(12345, "KWD")).toBeNull();
    expect(centsFromStripe(4550, "EGP")).toBe(4550);
  });

  it("knows the least Stripe charges where the currency is the settlement one", () => {
    expect(stripeMinimumCents("USD")).toBe(50);
    expect(stripeMinimumCents("EUR")).toBe(50);
    expect(stripeMinimumCents("AED")).toBe(200);
    expect(stripeMinimumCents("GBP")).toBe(30);
    // Depends on the account's settlement currency: Stripe says so itself.
    expect(stripeMinimumCents("TRY")).toBeNull();
    expect(stripeMinimumCents("EGP")).toBeNull();
  });

  it("names the API version and an idempotency key on every create, and refuses an amount under the least before asking", async () => {
    const { fetcher, calls } = fakeFetch({ "POST /v1/checkout/sessions": () => ({ json: { id: "cs_test_1", url: "https://checkout.stripe.test/cs_test_1" } }) });
    const keys = { secretKey: SK_TEST, sandbox: true };
    const request = { reference: "order-7", amountCents: 4550, currency: "USD", description: "Order 1007", customerEmail: null, returnUrl: "https://yallapp.test/back", now: NOW };
    await createStripeSession(keys, request, { fetcher });
    expect(calls[0]!.headers["stripe-version"]).toBe(STRIPE_API_VERSION);
    expect(STRIPE_API_VERSION).toBe("2025-09-30.clover");
    expect(calls[0]!.headers["idempotency-key"]).toBe(`order-7-${NOW.getTime()}`);
    expect(new URLSearchParams(calls[0]!.body).get("line_items[0][price_data][unit_amount]")).toBe("4550");
    await expect(createStripeSession(keys, { ...request, amountCents: 49 }, { fetcher })).rejects.toThrow("Stripe takes payments of at least 0.50 USD.");
    await expect(createStripeSession(keys, { ...request, amountCents: 199, currency: "AED" }, { fetcher })).rejects.toThrow("Stripe takes payments of at least 2.00 AED.");
    expect(calls).toHaveLength(1);
    // Our own words, kept as they are.
    expect(explainPaymentError("stripe", new PaymentError("Stripe takes payments of at least 0.50 USD."))).toBe("Stripe takes payments of at least 0.50 USD.");
  });

  it("starts a checkout in lira with the amount as it is (two decimals at Stripe)", async () => {
    const { fetcher, calls } = fakeFetch({ "POST /v1/checkout/sessions": () => ({ json: { id: "cs_test_2", url: "https://checkout.stripe.test/cs_test_2" } }) });
    const request: CheckoutRequest = {
      reference: "order-8",
      amountCents: 125000,
      currency: "TRY",
      description: "Order 1008",
      lines: [{ id: "1", name: "Mug", cents: 125000, category: "Products", digital: false }],
      customer: { id: "c", name: "Ada Lovelace", email: "ada@example.com", phone: null, city: "Istanbul", address: null, ip: "203.0.113.9" },
      returnUrl: "https://yallapp.test/back",
      webhookUrl: null,
      iyzico: { conversationId: "x", basketId: "8", shipping: false },
    };
    await startCheckout({ provider: "stripe", keys: { secretKey: SK_TEST, sandbox: true } }, request, { fetcher });
    const form = new URLSearchParams(calls[0]!.body);
    expect(form.get("line_items[0][price_data][unit_amount]")).toBe("125000");
    expect(form.get("line_items[0][price_data][currency]")).toBe("try");
  });
});

describe("132.34 Test connection: Stripe", () => {
  it("checks the keys, the account, Checkout, the currency and the webhook, item by item", async () => {
    const { fetcher, calls } = fakeFetch(stripeRoutes());
    const report = await testConnection(connection(stripeInput(), { receipt: { at: "2026-10-12T09:58:00.000Z", event: "checkout.session.completed", livemode: false } }), { fetcher });
    expect(report).toMatchObject({ provider: "stripe", mode: "test", ok: true, at: NOW.toISOString() });
    expect(codes(report)).toEqual([
      "ok:stripeAccount",
      "ok:stripeCheckoutOk",
      "info:modeTest",
      "ok:currencyOk",
      "info:minimum",
      "ok:webhookSecretOk",
      "ok:endpointOk",
      "ok:webhookWorking",
    ]);
    expect(report.checks[0]!.values).toEqual({ name: "Harbour Mugs · AE" });
    expect(report.checks.find((c) => c.code === "minimum")!.values).toEqual({ amount: "0.50 USD" });
    // Read-only calls, each with the secret key and the pinned version.
    expect(calls.map((c) => `${c.method} ${new URL(c.url).pathname}`)).toEqual(["GET /v1/account", "GET /v1/checkout/sessions", "GET /v1/webhook_endpoints"]);
    for (const call of calls) expect(call.headers).toMatchObject({ authorization: `Bearer ${SK_TEST}`, "stripe-version": STRIPE_API_VERSION });
    // No key in what comes back to the page.
    for (const secret of [SK_TEST, WHSEC]) expect(JSON.stringify(report)).not.toContain(secret);
  });

  it("makes a 0.50 USD test payment and cancels it, with test keys only", async () => {
    const { fetcher, calls } = fakeFetch(stripeRoutes());
    const report = await testConnection(connection(stripeInput(), { testPayment: true }), { fetcher });
    expect(report.checks.at(-1)).toEqual({ tone: "ok", code: "testPaymentOk", values: { id: "pi_test_1" } });
    const [create, cancel] = calls.filter((c) => c.method === "POST");
    expect(Object.fromEntries(new URLSearchParams(create!.body))).toMatchObject({ amount: "50", currency: "usd", "payment_method_types[0]": "card", "metadata[purpose]": "yallapp_connection_test" });
    expect(create!.headers["idempotency-key"]).toMatch(/^yallapp-test-[a-z0-9]+-create$/);
    expect(new URL(cancel!.url).pathname).toBe("/v1/payment_intents/pi_test_1/cancel");
    expect(cancel!.headers["idempotency-key"]).toMatch(/-cancel$/);

    const live = fakeFetch(stripeRoutes());
    const liveReport = await testConnection(connection(stripeInput({ secretKey: SK_LIVE, publishableKey: PK_LIVE, sandbox: false }), { testPayment: true }), { fetcher: live.fetcher });
    expect(liveReport.mode).toBe("live");
    expect(liveReport.checks.at(-1)).toEqual({ tone: "info", code: "testPaymentSkipped" });
    expect(live.calls.filter((c) => c.method === "POST")).toEqual([]);
  });

  it("says what to fix: keys refused, mixed modes, a missing publishable key or signing secret", async () => {
    const refused = fakeFetch(stripeRoutes({ "GET /v1/account": () => ({ status: 401, json: { error: { message: `Invalid API Key provided: ${SK_TEST}` } } }) }));
    const report = await testConnection(connection(stripeInput()), { fetcher: refused.fetcher });
    expect(report.ok).toBe(false);
    expect(codes(report)).toEqual(["fail:keysRefused", "info:modeTest"]);
    expect(JSON.stringify(report)).not.toContain(SK_TEST);

    const mixed = await testConnection(connection(stripeInput({ publishableKey: PK_LIVE, webhookSecret: null })), { fetcher: fakeFetch(stripeRoutes()).fetcher });
    expect(mixed.ok).toBe(false);
    expect(codes(mixed)).toContain("fail:stripeModeMix");
    expect(codes(mixed)).toContain("warn:webhookSecretMissing");

    const old = await testConnection(connection(stripeInput({ publishableKey: null, webhookSecret: "whsec_x" })), { fetcher: fakeFetch(stripeRoutes()).fetcher });
    expect(codes(old)).toEqual(expect.arrayContaining(["warn:stripePublishableMissing", "fail:webhookSecretShape", "info:webhookNone"]));

    expect(codes(await testConnection(connection(stripeInput({ secretKey: "sk_wrong" })), { fetcher: fakeFetch({}).fetcher }))).toEqual(["fail:stripeSecretShape"]);
  });

  it("tells a restricted key's missing permissions, and a webhook endpoint that's missing, off or short of events", async () => {
    const restricted = fakeFetch(
      stripeRoutes({
        "GET /v1/account": () => ({ status: 403, json: { error: { message: "The provided key 'rk_test_***Key' does not have the required permissions" } } }),
        "GET /v1/checkout/sessions": () => ({ status: 403, json: { error: { message: "no permission" } } }),
        "GET /v1/webhook_endpoints": () => ({ status: 403, json: { error: { message: "no permission" } } }),
      }),
    );
    const report = await testConnection(connection(stripeInput({ secretKey: "rk_test_51FakeRkKey" })), { fetcher: restricted.fetcher });
    expect(codes(report)).toEqual(expect.arrayContaining(["info:stripeAccountHidden", "fail:stripeCheckoutDenied", "info:endpointUnknown"]));

    const endpoints = (data: unknown[]) => fakeFetch(stripeRoutes({ "GET /v1/webhook_endpoints": () => ({ json: { data } }) })).fetcher;
    const of = async (data: unknown[]) => codes(await testConnection(connection(stripeInput()), { fetcher: endpoints(data) }));
    expect(await of([])).toContain("warn:endpointMissing");
    expect(await of([{ url: HOOK, status: "disabled", enabled_events: ["*"] }])).toContain("warn:endpointDisabled");
    expect(await of([{ url: HOOK, status: "enabled", enabled_events: ["*"] }])).toContain("ok:endpointOk");
    const short = await testConnection(connection(stripeInput()), { fetcher: endpoints([{ url: HOOK, status: "enabled", enabled_events: ["checkout.session.completed"] }]) });
    expect(short.checks.find((c) => c.code === "endpointEvents")!.values).toEqual({ events: "checkout.session.async_payment_succeeded" });
  });

  it("says when Stripe can't be reached, when live payments aren't on yet, and what the last webhook was", async () => {
    const down = await testConnection(connection(stripeInput()), { fetcher: fakeFetch({ "GET /v1/account": () => "down" }).fetcher });
    expect(codes(down)).toEqual(["warn:unreachable", "info:modeTest"]);
    expect(down.ok).toBe(true);

    const inactive = fakeFetch(stripeRoutes({ "GET /v1/account": () => ({ json: { id: "acct_1", charges_enabled: false } }) }));
    expect(codes(await testConnection(connection(stripeInput({ secretKey: SK_LIVE, publishableKey: PK_LIVE, sandbox: false })), { fetcher: inactive.fetcher }))).toContain("warn:stripeChargesOff");

    const receipt = async (r: ConnectionInput["receipt"]) => codes(await testConnection(connection(stripeInput(), { receipt: r }), { fetcher: fakeFetch(stripeRoutes()).fetcher })).at(-1);
    expect(await receipt({ at: "2026-10-12T09:00:00.000Z", event: "checkout.session.completed", failedAt: "2026-10-12T09:30:00.000Z", failure: "signature" })).toBe("fail:webhookBadSecret");
    expect(await receipt({ at: null, event: null, failedAt: "2026-10-12T09:30:00.000Z", failure: "no_secret" })).toBe("fail:webhookNoSecret");
    expect(await receipt({ at: "2026-10-12T09:00:00.000Z", event: "checkout.session.completed", livemode: true })).toBe("warn:webhookOtherMode");
    expect(await receipt(null)).toBe("info:webhookNone");
  });
});

describe("132.34 Test connection: PayPal, Kashier, Fawaterk and iyzico", () => {
  const paypal: OwnPaymentInput = { provider: "paypal", clientId: "AYfake-client", secret: "fake-paypal-secret", sandbox: true };

  it("PayPal: an OAuth token from sandbox, or says the credentials are live ones", async () => {
    const ok = fakeFetch({ "POST api-m.sandbox.paypal.com/v1/oauth2/token": () => ({ json: { access_token: "A21-fake", expires_in: 32400 } }) });
    const report = await testConnection(connection(paypal), { fetcher: ok.fetcher });
    expect(codes(report)).toEqual(["ok:keysAccepted", "info:modeTest", "ok:currencyOk", "info:noWebhook"]);
    expect(ok.calls[0]!.headers.authorization).toBe(`Basic ${Buffer.from("AYfake-client:fake-paypal-secret").toString("base64")}`);
    expect(ok.calls[0]!.body).toBe("grant_type=client_credentials");

    const live = fakeFetch({
      "POST api-m.sandbox.paypal.com/v1/oauth2/token": () => ({ status: 401, json: { error: "invalid_client" } }),
      "POST api-m.paypal.com/v1/oauth2/token": () => ({ json: { access_token: "A21-live" } }),
    });
    const wrong = await testConnection(connection(paypal, { currency: "TRY" }), { fetcher: live.fetcher });
    expect(wrong.ok).toBe(false);
    expect(codes(wrong)).toEqual(["fail:wrongModeLive", "info:modeTest", "fail:currencyNo", "info:noWebhook"]);
    expect(wrong.checks.find((c) => c.code === "currencyNo")!.values).toEqual({ provider: "PayPal", currency: "TRY", list: "USD, EUR" });
    expect(JSON.stringify(wrong)).not.toContain("fake-paypal-secret");
  });

  it("Kashier: the merchant with the secret key, its webhook set per payment, and the last one", async () => {
    const kashier: OwnPaymentInput = { provider: "kashier", merchantId: "MID-1234-567", apiKey: "fake-kashier-api", secretKey: "fake-kashier-secret", sandbox: true };
    const ok = fakeFetch({ "GET test-api.kashier.io/merchant": () => ({ json: { response: { accountType: "PF" } } }) });
    const report = await testConnection(connection(kashier, { currency: "EGP", receipt: { at: "2026-10-12T09:58:00.000Z", event: "pay" } }), { fetcher: ok.fetcher });
    expect(codes(report)).toEqual(["ok:keysAccepted", "info:modeTest", "ok:currencyOk", "info:webhookAuto", "ok:webhookWorking"]);
    expect(ok.calls[0]!.headers.authorization).toBe("fake-kashier-secret");

    const refused = fakeFetch({ "GET /merchant": () => ({ status: 401, json: { status: "UNAUTHORIZED" } }) });
    const bad = await testConnection(connection({ ...kashier, merchantId: "12" }, { currency: "EGP", receipt: { at: null, event: null, failedAt: "2026-10-12T09:58:00.000Z", failure: "signature" } }), { fetcher: refused.fetcher });
    expect(codes(bad)).toEqual(["fail:merchantShape", "fail:keysRefused", "info:modeTest", "ok:currencyOk", "info:webhookAuto", "fail:webhookBadSignature"]);
  });

  it("Fawaterk: its payment methods with the key; iyzico: a card prefix lookup", async () => {
    const fawaterk = fakeFetch({ "GET staging.fawaterk.com/api/v2/getPaymentmethods": () => ({ json: { status: "success", data: [] } }) });
    const f = await testConnection(connection({ provider: "fawaterk", apiKey: "fake-fawaterk", sandbox: true }, { currency: "EGP" }), { fetcher: fawaterk.fetcher });
    expect(codes(f)).toEqual(["ok:keysAccepted", "info:modeTest", "ok:currencyOk", "info:webhookAuto", "info:webhookNone"]);
    expect(fawaterk.calls[0]!.headers.authorization).toBe("Bearer fake-fawaterk");

    const iyzico = fakeFetch({ "POST sandbox-api.iyzipay.com/payment/bin/check": () => ({ json: { status: "success" } }) });
    const i = await testConnection(connection({ provider: "iyzico", apiKey: "fake-iyzico-api", secretKey: "fake-iyzico-secret", sandbox: true }, { currency: "TRY" }), { fetcher: iyzico.fetcher });
    expect(codes(i)).toEqual(["ok:keysAccepted", "info:modeTest", "ok:currencyOk", "info:noWebhook"]);
    expect(iyzico.calls[0]!.headers.authorization).toMatch(/^IYZWSv2 /);

    const refused = fakeFetch({ "POST /payment/bin/check": () => ({ json: { status: "failure", errorMessage: "api bilgileri bulunamadı" } }) });
    expect(codes(await testConnection(connection({ provider: "iyzico", apiKey: "x", secretKey: "y", sandbox: false }, { currency: "TRY" }), { fetcher: refused.fetcher }))[0]).toBe("fail:keysRefused");
  });

  it("words every check in English, Arabic and Turkish", () => {
    for (const lang of ["en", "ar", "tr"] as const) {
      const messages = flattenMessages(dashboardMessages(lang));
      for (const code of CHECK_CODES) expect(messages.get(`gateways.check.${code}`), `${lang} ${code}`).toBeTruthy();
    }
  });
});

describe("132.31 Stripe's webhook endpoint and 132.33 the last webhook", () => {
  let store: MemoryStore;
  let app: App;
  let order: CatalogOrder;

  async function makeShop(payment: OwnPaymentInput | null = stripeInput()) {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "store");
    app = { ...base, backend: "hosted", appName: "Harbour Mugs", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "USD", shippingCents: 300, payment: null } };
    app = { ...app, catalogSettings: { ...app.catalogSettings!, payment: payment ? encryptOwnPayment(app.id, payment, KEY) : null } };
    await store.createApp(app);
    order = await store.createCatalogOrder({
      appId: app.id,
      tokenHash: sha256Hex("order-token"),
      userId: null,
      status: "pending",
      lines: [{ productId: 1, name: "Mug", quantity: 1, unitCents: 2000, imageAssetId: null, digital: false }],
      subtotalCents: 2000,
      shippingCents: 0,
      totalCents: 2000,
      currency: "USD",
      customer: null,
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      updatedAt: NOW,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
      paymentProvider: "stripe",
      providerRef: "cs_test_older",
    });
  }

  const event = (type: string, extra: Record<string, unknown> = {}) =>
    JSON.stringify({ id: "evt_1", object: "event", type, livemode: false, data: { object: { id: "cs_test_42", object: "checkout.session", client_reference_id: `order-${order.id}`, ...extra } } });
  const signed = (body: string, secret = WHSEC, at = NOW) => stripeSignatureHeader(body, secret, Math.floor(at.getTime() / 1000));

  function deps() {
    const settled: { kind: string; id: number; trigger: Trigger }[] = [];
    const answer: Settled = { status: "paid", path: "/" };
    return {
      settled,
      deps: {
        store,
        encryptionKey: KEY,
        now: NOW,
        settle: {
          order: async (_: unknown, o: CatalogOrder, trigger: Trigger) => (settled.push({ kind: "order", id: o.id, trigger }), answer),
          donation: async (_: unknown, d: { id: number }, trigger: Trigger) => (settled.push({ kind: "donation", id: d.id, trigger }), answer),
        },
      },
    };
  }

  const bytes = (text: string) => new TextEncoder().encode(text);
  const receiptOf = async () => (catalogSettings((await store.getAppById(app.id))!).payment as OwnStripePayment).webhook;

  it("settles a paid Checkout Session by reading it back, and notes the webhook", async () => {
    await makeShop();
    const { deps: d, settled } = deps();
    const body = event("checkout.session.completed");
    expect(await handleStripeWebhook(d, app.id, bytes(body), signed(body))).toEqual({ status: 200, body: { received: true, status: "paid" } });
    expect(settled).toEqual([{ kind: "order", id: order.id, trigger: { provider: "stripe", providerRef: "cs_test_42" } }]);
    expect(await receiptOf()).toEqual({ at: NOW.toISOString(), event: "checkout.session.completed", livemode: false, failedAt: null, failure: null });
    // The rest of the settings are untouched.
    expect(catalogSettings((await store.getAppById(app.id))!).shippingCents).toBe(300);
    // A later async payment settles the same way; other events are only acknowledged.
    const later = event("checkout.session.async_payment_succeeded");
    expect((await handleStripeWebhook(d, app.id, bytes(later), signed(later))).status).toBe(200);
    expect(settled).toHaveLength(2);
    const other = event("customer.created");
    expect(await handleStripeWebhook(d, app.id, bytes(other), signed(other))).toEqual({ status: 200, body: { received: true } });
    expect(settled).toHaveLength(2);
  });

  it("refuses a webhook whose signature doesn't match, and says so on the page", async () => {
    await makeShop();
    const { deps: d, settled } = deps();
    const body = event("checkout.session.completed");
    expect(await handleStripeWebhook(d, app.id, bytes(body), signed(body, "whsec_SomebodyElsesSecret1234"))).toEqual({ status: 400, body: { error: "invalid_signature" } });
    expect(await handleStripeWebhook(d, app.id, bytes(body), null)).toEqual({ status: 400, body: { error: "invalid_signature" } });
    expect(await handleStripeWebhook(d, app.id, bytes(body), signed(body, WHSEC, new Date(NOW.getTime() - 10 * 60_000)))).toEqual({ status: 400, body: { error: "invalid_signature" } });
    expect(settled).toEqual([]);
    expect(await receiptOf()).toMatchObject({ at: null, failedAt: NOW.toISOString(), failure: "signature" });
  });

  it("ignores another mode's events, and answers 404 for an app not on Stripe", async () => {
    await makeShop();
    const { deps: d, settled } = deps();
    const live = JSON.stringify({ ...JSON.parse(event("checkout.session.completed")), livemode: true });
    expect(await handleStripeWebhook(d, app.id, bytes(live), signed(live))).toEqual({ status: 200, body: { received: true, ignored: "other_mode" } });
    expect(settled).toEqual([]);
    expect(await handleStripeWebhook(d, "no-such-app", bytes(live), signed(live))).toEqual({ status: 404, body: { error: "not_found" } });

    await makeShop({ provider: "kashier", merchantId: "MID-1234-567", apiKey: "a", secretKey: "b", sandbox: true });
    expect((await handleStripeWebhook(deps().deps, app.id, bytes(live), signed(live))).status).toBe(404);
  });

  it("asks for the signing secret when none is saved", async () => {
    await makeShop(stripeInput({ webhookSecret: null }));
    const body = event("checkout.session.completed");
    expect(await handleStripeWebhook(deps().deps, app.id, bytes(body), signed(body))).toEqual({ status: 400, body: { error: "no_signing_secret" } });
    expect(await receiptOf()).toMatchObject({ failure: "no_secret", failedAt: NOW.toISOString() });
  });

  it("writes the note at most once a minute for the same news", async () => {
    const first = nextReceipt(null, { ok: true, event: "pay" }, NOW)!;
    expect(first).toEqual({ at: NOW.toISOString(), event: "pay", livemode: null, failedAt: null, failure: null });
    expect(nextReceipt(first, { ok: true, event: "pay" }, new Date(NOW.getTime() + 30_000))).toBeNull();
    expect(nextReceipt(first, { ok: true, event: "pay" }, new Date(NOW.getTime() + 61_000))).toMatchObject({ at: new Date(NOW.getTime() + 61_000).toISOString() });
    const failed = nextReceipt(first, { ok: false, failure: "signature" }, new Date(NOW.getTime() + 10_000))!;
    expect(failed).toMatchObject({ at: NOW.toISOString(), failedAt: new Date(NOW.getTime() + 10_000).toISOString(), failure: "signature" });
    expect(nextReceipt(failed, { ok: false, failure: "signature" }, new Date(NOW.getTime() + 20_000))).toBeNull();
    // A good one after a refused one clears it at once.
    expect(nextReceipt(failed, { ok: true, event: "pay" }, new Date(NOW.getTime() + 20_000))).toMatchObject({ failedAt: null });

    await makeShop({ provider: "kashier", merchantId: "MID-1234-567", apiKey: "a", secretKey: "b", sandbox: true });
    await noteWebhook(store, app.id, "kashier", { ok: true, event: "pay" }, NOW);
    expect((catalogSettings((await store.getAppById(app.id))!).payment as { webhook?: unknown }).webhook).toMatchObject({ at: NOW.toISOString(), event: "pay" });
    // Another gateway's webhook isn't noted on it.
    await noteWebhook(store, app.id, "fawaterk", { ok: false, failure: "signature" }, new Date(NOW.getTime() + 120_000));
    expect((catalogSettings((await store.getAppById(app.id))!).payment as { webhook?: { failedAt?: unknown } }).webhook?.failedAt).toBeNull();
  });

  it("gives each app its own endpoint address", () => {
    expect(stripeWebhookUrl("https://yallapp.com.tr/", "3f0c9a1e-0000-4000-8000-000000000001")).toBe("https://yallapp.com.tr/api/pay/stripe/webhook/3f0c9a1e-0000-4000-8000-000000000001");
  });
});
