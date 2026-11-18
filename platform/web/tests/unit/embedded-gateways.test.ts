import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { completePayment, gatewayEmbed, startPayment } from "@/lib/catalog/payment";
import { accountForOrder, checkoutAccount, encryptOwnPayment, type OwnPaymentInput } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import { PAGE_CSP } from "@/lib/csp";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogCurrency, type CatalogOrder } from "@/lib/data/types";
import { kashierDestination, kashierMessage } from "@/lib/payments/embed";
import { iyzicoFormContent, initializeCheckoutForm } from "@/lib/payments/iyzico";
import { callbackUrls } from "@/lib/payments/routes";
import { config as proxyConfig } from "@/proxy";
import { fakeFawaterk, fakeIyzico, fakeKashier, iyzicoFormScript } from "./fake-providers";
import { fakePaypal } from "./fake-stripe-paypal";
import { KEY, NOW, setupClient } from "./helpers";

/**
 * 153 The card typed inside the payment page with iyzico (its Checkout Form's
 * script, in the div `iyzipay-checkout-form`) and Kashier (its payment
 * session's page, in a frame): the same payment as their page, started by
 * our server, read back the same way. Fawaterk and PayPal keep their pages.
 */

const customer = { name: "Ada Lovelace", phone: "+905321234567", email: "ada@example.com", city: "Istanbul", address: "Moda Cd. 12, Kadikoy" };

let store: MemoryStore;
let app: App;
let order: CatalogOrder;

async function makeShop(payment: OwnPaymentInput, currency: CatalogCurrency) {
  ({ store } = await setupClient());
  const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
  const base = newApp(client.id, null, NOW, "store");
  app = { ...base, backend: "hosted", appName: "Moda Flowers", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency, payment: null } };
  app = { ...app, catalogSettings: { ...app.catalogSettings!, payment: encryptOwnPayment(app.id, payment, KEY) } };
  await store.createApp(app);
  order = await store.createCatalogOrder({
    appId: app.id,
    tokenHash: sha256Hex("order-token"),
    userId: null,
    status: "pending",
    lines: [{ productId: 1, name: "Tulips", quantity: 2, unitCents: 20000, imageAssetId: null, digital: false }],
    subtotalCents: 40000,
    shippingCents: 5000,
    totalCents: 45000,
    currency,
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

const IYZICO_KEYS = { apiKey: "sandbox-shop-api", secretKey: "sandbox-shop-secret", sandbox: true };

describe("iyzico's form inside the payment page", () => {
  it("reads iyzico's form from its answer, as HTML or in Base64, and nothing else", () => {
    const script = iyzicoFormScript("t-1");
    expect(iyzicoFormContent(script)).toBe(script);
    expect(iyzicoFormContent(Buffer.from(script).toString("base64"))).toBe(script);
    for (const value of [undefined, null, "", "   ", 42, "<div>no script</div>", Buffer.from("plain text").toString("base64")]) expect(iyzicoFormContent(value), String(value)).toBeNull();
  });

  it("gets the form with the same token as iyzico's page", async () => {
    for (const content of ["html", "base64", "none"] as const) {
      const iyzico = fakeIyzico({ content });
      const started = await initializeCheckoutForm(
        IYZICO_KEYS,
        {
          conversationId: "order-1001",
          price: "450.00",
          paidPrice: "450.00",
          currency: "TRY",
          basketId: "1",
          callbackUrl: "https://yallapp.test/api/pay/iyzico/t",
          buyer: { id: "guest-1", name: "Ada", surname: "Lovelace", email: "ada@example.com", identityNumber: "11111111111", registrationAddress: "Moda", ip: "203.0.113.9", city: "Istanbul", country: "Turkey" },
          billingAddress: { contactName: "Ada Lovelace", city: "Istanbul", country: "Turkey", address: "Moda" },
          basketItems: [{ id: "1", name: "Tulips", category1: "Products", itemType: "PHYSICAL", price: "450.00" }],
        },
        { fetcher: iyzico.fetcher, baseUrl: "https://sandbox-api.iyzipay.test" },
      );
      expect(started.token).toBe("iyzi-form-1");
      expect(started.paymentPageUrl).toBe("https://sandbox-cpp.iyzipay.test?token=iyzi-form-1&lang=en");
      expect(started.formContent, content).toBe(content === "none" ? null : iyzicoFormScript("iyzi-form-1"));
    }
  });

  it("starts the order's payment as before, with iyzico's form for our page, and reads it back the same way", async () => {
    await makeShop({ provider: "iyzico", ...IYZICO_KEYS }, "TRY");
    const iyzico = fakeIyzico();
    const account = (await checkoutAccount(store, app, KEY))!;
    const urls = callbackUrls("https://yallapp.test", "order", "iyzico", "order-token");
    const started = await startPayment({ store, app, account, fetcher: iyzico.fetcher, now: NOW, order, customer, ip: "203.0.113.9", callbackUrls: urls });
    // iyzico's page stays the way out (the same token); its form goes in ours.
    expect(started).toEqual({ url: "https://sandbox-cpp.iyzipay.test?token=iyzi-form-1&lang=en", stripe: null, embed: { provider: "iyzico", formContent: iyzicoFormScript("iyzi-form-1") } });
    expect(iyzico.calls).toHaveLength(1);
    expect(iyzico.calls[0]!.body).toMatchObject({ callbackUrl: urls.returnUrl, paidPrice: "450.00", currency: "TRY", basketId: String(order.id) });
    order = (await store.getCatalogOrder(app.id, order.id))!;
    expect(order).toMatchObject({ customer, paymentProvider: "iyzico", providerRef: "iyzi-form-1" });

    // iyzico posts its token to the same callback: read back before anything is paid.
    const callback = (await accountForOrder(store, app, order, KEY))!;
    const complete = () => completePayment({ store, app, account: callback, fetcher: iyzico.fetcher, now: NOW, order, iyzicoToken: "iyzi-form-1" });
    expect(await complete()).toBe("failed");
  });

  it("pays once iyzico's form took the card", async () => {
    await makeShop({ provider: "iyzico", ...IYZICO_KEYS }, "TRY");
    const iyzico = fakeIyzico();
    const account = (await checkoutAccount(store, app, KEY))!;
    await startPayment({ store, app, account, fetcher: iyzico.fetcher, now: NOW, order, customer, ip: "203.0.113.9", callbackUrls: callbackUrls("https://yallapp.test", "order", "iyzico", "order-token") });
    order = (await store.getCatalogOrder(app.id, order.id))!;
    iyzico.pay("iyzi-form-1");
    const callback = (await accountForOrder(store, app, order, KEY))!;
    expect(await completePayment({ store, app, account: callback, fetcher: iyzico.fetcher, now: NOW, order, iyzicoToken: "iyzi-form-1" })).toBe("paid");
    order = (await store.getCatalogOrder(app.id, order.id))!;
    expect(order).toMatchObject({ status: "processing", paymentId: "pay-iyzi-form-1" });
    expect(iyzico.calls.map((c) => new URL(c.url).pathname)).toEqual(["/payment/iyzipos/checkoutform/initialize/auth/ecom", "/payment/iyzipos/checkoutform/auth/ecom/detail"]);
  });

  it("keeps iyzico's page when its answer has no form, or the page is asked for", async () => {
    await makeShop({ provider: "iyzico", ...IYZICO_KEYS }, "TRY");
    const account = (await checkoutAccount(store, app, KEY))!;
    const urls = callbackUrls("https://yallapp.test", "order", "iyzico", "order-token");
    const without = await startPayment({ store, app, account, fetcher: fakeIyzico({ content: "none" }).fetcher, now: NOW, order, customer, ip: "203.0.113.9", callbackUrls: urls });
    expect(without).toEqual({ url: "https://sandbox-cpp.iyzipay.test?token=iyzi-form-1&lang=en", stripe: null });
    const hosted = await startPayment({ store, app, account, fetcher: fakeIyzico().fetcher, now: NOW, order, customer, ip: "203.0.113.9", callbackUrls: urls, hosted: true });
    expect(hosted).toEqual({ url: "https://sandbox-cpp.iyzipay.test?token=iyzi-form-1&lang=en", stripe: null });
  });
});

const KASHIER_KEYS = { merchantId: "MID-1234-567", apiKey: "kashier-payment-api-key", secretKey: "kashier-secret-key", sandbox: true };

describe("Kashier's form inside the payment page", () => {
  it("starts the same session, its page in our frame, read back and confirmed by its webhook as before", async () => {
    await makeShop({ provider: "kashier", ...KASHIER_KEYS }, "EGP");
    const kashier = fakeKashier({ secretKey: KASHIER_KEYS.secretKey });
    const account = (await checkoutAccount(store, app, KEY))!;
    const urls = callbackUrls("https://yallapp.test", "order", "kashier", "order-token");
    const started = await startPayment({ store, app, account, fetcher: kashier.fetcher, now: NOW, order, customer, ip: "203.0.113.9", callbackUrls: urls });
    expect(started).toEqual({
      url: "https://payments.kashier.test/session/sess1abcdef?mode=test",
      stripe: null,
      embed: { provider: "kashier", frameUrl: "https://payments.kashier.test/session/sess1abcdef?mode=test" },
    });
    // One session, sent back and told of the payment as before.
    expect(kashier.calls).toHaveLength(1);
    expect(kashier.calls[0]!.body).toMatchObject({ merchantRedirect: urls.returnUrl, serverWebhook: urls.webhookUrl, amount: "450.00", currency: "EGP", allowedMethods: "card" });
    order = (await store.getCatalogOrder(app.id, order.id))!;
    expect(order).toMatchObject({ customer, paymentProvider: "kashier", providerRef: "sess1abcdef" });
    const callback = (await accountForOrder(store, app, order, KEY))!;
    const complete = () => completePayment({ store, app, account: callback, fetcher: kashier.fetcher, now: NOW, order });
    expect(await complete()).toBe("pending");
    kashier.pay("sess1abcdef");
    expect(await complete()).toBe("paid");

    // Kashier's page asked for: no frame.
    await makeShop({ provider: "kashier", ...KASHIER_KEYS }, "EGP");
    const hosted = await startPayment({ store, app, account: (await checkoutAccount(store, app, KEY))!, fetcher: kashier.fetcher, now: NOW, order, customer, ip: "203.0.113.9", callbackUrls: urls, hosted: true });
    expect(hosted).toEqual({ url: "https://payments.kashier.test/session/sess2abcdef?mode=test", stripe: null });
  });

  it("reads Kashier's messages, as objects or JSON, and nothing else", () => {
    expect(kashierMessage({ message: "contentLoaded" })).toEqual({ kind: "loaded", redirectUrl: null });
    expect(kashierMessage({ message: "iframeLoaded" })).toEqual({ kind: "loaded", redirectUrl: null });
    expect(kashierMessage({ message: "paymentSuccess", params: {} })).toEqual({ kind: "paymentSuccess", redirectUrl: null });
    expect(kashierMessage({ message: "closeIframe" })).toEqual({ kind: "closeIframe", redirectUrl: null });
    const back = "https://yallapp.test/api/pay/kashier/order/order-token?paymentStatus=SUCCESS";
    expect(kashierMessage({ message: "urlRedirection", params: { redirectUrl: back, redirectMethod: "get" } })).toEqual({ kind: "urlRedirection", redirectUrl: back });
    expect(kashierMessage(JSON.stringify({ message: "urlRedirection", params: { redirectUrl: back } }))).toEqual({ kind: "urlRedirection", redirectUrl: back });
    expect(kashierMessage({ event: "urlRedirection", data: { redirectUrl: back } })).toEqual({ kind: "urlRedirection", redirectUrl: back });
    expect(kashierMessage({ message: "urlRedirection", redirectUrl: back })).toEqual({ kind: "urlRedirection", redirectUrl: back });
    expect(kashierMessage("paymentSuccess")).toEqual({ kind: "paymentSuccess", redirectUrl: null });
    for (const other of [null, undefined, 7, [], {}, { message: "somethingElse" }, { message: "constructor" }, { message: "__proto__" }, "not json", { yallappMessage: "x" }]) {
      expect(kashierMessage(other), JSON.stringify(other) ?? String(other)).toBeNull();
    }
  });

  it("goes on only to our own return address, whatever a message names", () => {
    const ours = "https://yallapp.test/api/pay/kashier/order/order-token";
    expect(kashierDestination(`${ours}?paymentStatus=SUCCESS&merchantOrderId=order-1-x`, ours)).toBe(`${ours}?paymentStatus=SUCCESS&merchantOrderId=order-1-x`);
    expect(kashierDestination(null, ours)).toBe(ours);
    expect(kashierDestination("https://evil.test/api/pay/kashier/order/order-token", ours)).toBe(ours);
    expect(kashierDestination("https://yallapp.test/somewhere-else", ours)).toBe(ours);
    expect(kashierDestination("javascript:alert(1)", ours)).toBe(ours);
    expect(kashierDestination("not a url", ours)).toBe(ours);
  });
});

describe("the gateways that keep their own pages", () => {
  it("sends Fawaterk's and PayPal's payments to their pages, with nothing for ours", async () => {
    await makeShop({ provider: "fawaterk", apiKey: "fawaterk-vendor-key", sandbox: true }, "EGP");
    const fawaterk = fakeFawaterk({ apiKey: "fawaterk-vendor-key" });
    const onFawaterk = await startPayment({ store, app, account: (await checkoutAccount(store, app, KEY))!, fetcher: fawaterk.fetcher, now: NOW, order, customer, ip: "203.0.113.9", callbackUrls: callbackUrls("https://yallapp.test", "order", "fawaterk", "order-token") });
    expect(onFawaterk).toEqual({ url: "https://staging.fawaterk.test/invoice/1001/key1001", stripe: null });

    await makeShop({ provider: "paypal", clientId: "AYpaypal-client", secret: "paypal-secret", sandbox: true }, "USD");
    const paypal = fakePaypal();
    const onPaypal = await startPayment({ store, app, account: (await checkoutAccount(store, app, KEY))!, fetcher: paypal.fetcher, now: NOW, order, customer, ip: "203.0.113.9", callbackUrls: callbackUrls("https://yallapp.test", "order", "paypal", "order-token") });
    expect(onPaypal.stripe).toBeNull();
    expect(onPaypal).not.toHaveProperty("embed");
    expect(onPaypal.url).toMatch(/paypal/);

    expect(gatewayEmbed("fawaterk", { url: "https://f.test", iyzicoFormContent: "<script></script>" })).toBeNull();
    expect(gatewayEmbed("paypal", { url: "https://p.test" })).toBeNull();
    expect(gatewayEmbed("stripe", { url: "https://s.test" })).toBeNull();
    expect(gatewayEmbed("iyzico", { url: "https://i.test" })).toBeNull();
  });

  it("leaves the payment page's policy open to the gateways' scripts and frames", () => {
    // The page's own policy limits <base>, plugins and being framed, not where scripts or frames come from.
    expect(PAGE_CSP).toBe("base-uri 'self'; object-src 'none'; frame-ancestors 'none'");
    expect(PAGE_CSP).not.toMatch(/(default|script|frame|child|connect)-src/);
    // The nonce policy (scripts only with the request's nonce) isn't on the payment page.
    const sources = proxyConfig.matcher.map((m) => new RegExp(`^${m.source}$`));
    expect(sources.some((r) => r.test("/dashboard/orders"))).toBe(true);
    for (const path of ["/pay/abc123", "/pay/abc123/order-received"]) expect(sources.some((r) => r.test(path)), path).toBe(false);
  });
});
