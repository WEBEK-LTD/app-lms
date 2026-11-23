import { describe, expect, it } from "vitest";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import nextConfig from "../../next.config";
import { config as proxyConfig } from "@/proxy";
import { dashboardMessages } from "@/i18n/dashboard";
import { flattenMessages } from "@/i18n";
import { newApp } from "@/lib/app/setup";
import { startPayment } from "@/lib/catalog/payment";
import { catalogSettings, checkoutAccount, encryptOwnPayment } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import { PAGE_CSP, PAY_PERMISSIONS_POLICY, PERMISSIONS_POLICY } from "@/lib/csp";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogOrder, type OwnStripePayment, type StripeWallets } from "@/lib/data/types";
import { testConnection } from "@/lib/payments/connection";
import { callbackUrls } from "@/lib/payments/routes";
import { registerStripeWalletDomain, STRIPE_API_VERSION } from "@/lib/payments/stripe";
import { checkWalletDomain, ensureWalletDomain, WALLET_RETRY_MS, walletDomain, walletLine, walletsDue } from "@/lib/payments/wallets";
import { gatewayKeysFingerprint } from "@/lib/selling/in-app-pay";
import { fakeStripe } from "./fake-stripe-paypal";
import { KEY, NOW, setupClient } from "./helpers";

/**
 * 155 Apple Pay and Google Pay in Stripe's card form on the payment page:
 * the Payment Request API allowed on /pay for the page and Stripe's frames
 * only, and the page's domain registered once in each shop's own Stripe
 * account with its own key, kept, and never in the way of a card payment.
 */

const SK = "sk_test_51WalletsShopKey0001";
const SK_LIVE = "sk_live_51WalletsShopKey0001";
const PK = "pk_test_51WalletsShopKey0001";
const DOMAIN = "yallapp.com.tr";

/** The headers Next.js sends for a path: every matching rule in order, a later one's key over an earlier one's (as Next.js does). */
async function headersFor(path: string): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  for (const rule of await nextConfig.headers!()) {
    if (rule.has || rule.missing) continue;
    if (getPathMatch(rule.source, { strict: true })(path) === false) continue;
    for (const header of rule.headers) out.set(header.key.toLowerCase(), [...(out.get(header.key.toLowerCase()) ?? []), header.value]);
  }
  return out;
}

describe("155 the Permissions-Policy: payments on the payment page only", () => {
  it("allows the Payment Request API on /pay for the page and Stripe's frames, as Stripe's guide gives it", () => {
    expect(PAY_PERMISSIONS_POLICY).toBe('camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com" "https://checkout.stripe.com")');
    expect(PERMISSIONS_POLICY).toBe("camera=(), microphone=(), geolocation=(), payment=()");
  });

  it("sends it on the payment page and its order page, and payment=() everywhere else, never both", async () => {
    for (const path of ["/pay/abc123", "/pay/abc123/order-received"]) {
      const headers = await headersFor(path);
      expect(headers.get("permissions-policy"), path).toEqual([PAY_PERMISSIONS_POLICY]);
      // The other security headers stay as they were.
      expect(headers.get("x-frame-options"), path).toEqual(["DENY"]);
      expect(headers.get("x-content-type-options"), path).toEqual(["nosniff"]);
      expect(headers.get("strict-transport-security"), path).toEqual(["max-age=63072000; includeSubDomains"]);
      expect(headers.get("referrer-policy"), path).toEqual(["strict-origin-when-cross-origin"]);
      expect(headers.get("content-security-policy"), path).toEqual([PAGE_CSP]);
    }
    for (const path of ["/", "/pay", "/pricing", "/dashboard/payments", "/studio/project/payments", "/give/abc123", "/api/pay/stripe/order/abc123", "/sign-in", "/shop/x", "/payments"]) {
      const headers = await headersFor(path);
      expect(headers.get("permissions-policy"), path).toEqual([PERMISSIONS_POLICY]);
    }
    expect((await headersFor("/preview-app/index.html")).get("x-frame-options")).toEqual(["SAMEORIGIN"]);
  });

  it("leaves Stripe's frames and scripts to load on /pay: no frame, script or connect sources, and no nonce policy there", () => {
    for (const directive of ["default-src", "frame-src", "child-src", "script-src", "connect-src"]) expect(PAGE_CSP).not.toContain(directive);
    const matcher = proxyConfig.matcher[0]!.source;
    const nonced = getPathMatch(matcher, { strict: true });
    expect(nonced("/dashboard/payments")).not.toBe(false);
    expect(nonced("/pay/abc123")).toBe(false);
  });
});

describe("155 the payment page's domain", () => {
  it("is appUrl()'s host; Stripe registers public domains only, the tests' fake any", () => {
    expect(walletDomain("https://yallapp.com.tr")).toBe(DOMAIN);
    expect(walletDomain("https://YallApp.com.tr/")).toBe(DOMAIN);
    expect(walletDomain("http://localhost:3210")).toBeNull();
    expect(walletDomain("http://127.0.0.1:3000")).toBeNull();
    expect(walletDomain("http://intranet")).toBeNull();
    expect(walletDomain("not a url")).toBeNull();
    expect(walletDomain("http://localhost:3210", true)).toBe("localhost");
  });
});

describe("155 registering it in the shop's Stripe account", () => {
  const keys = { secretKey: SK, sandbox: true };

  it("registers it once, with the shop's own key and the pinned version, and reads it back after", async () => {
    const stripe = fakeStripe({ secretKey: SK });
    const first = await checkWalletDomain(keys, DOMAIN, { fetcher: stripe.fetcher, now: NOW });
    expect(first).toEqual({ domain: DOMAIN, mode: "test", status: "ready", id: "pmd_1fake", applePay: true, googlePay: true, reason: null, details: null, at: NOW.toISOString() });
    expect(stripe.calls.map((c) => `${c.method} ${c.path}`)).toEqual([`GET /v1/payment_method_domains?domain_name=${DOMAIN}&limit=10`, "POST /v1/payment_method_domains"]);
    const create = stripe.calls[1]!;
    expect(new URLSearchParams(create.body).get("domain_name")).toBe(DOMAIN);
    expect(new URLSearchParams(create.body).get("enabled")).toBe("true");
    expect(create.headers).toMatchObject({ authorization: `Bearer ${SK}`, "stripe-version": STRIPE_API_VERSION });
    expect(create.headers["idempotency-key"]).toMatch(/^yallapp-pmd-yallapp\.com\.tr-\d+$/);
    // Asked again (a second test), it's found and not registered twice.
    const again = await checkWalletDomain(keys, DOMAIN, { fetcher: stripe.fetcher, now: NOW });
    expect(again.status).toBe("ready");
    expect(stripe.calls.filter((c) => c.method === "POST")).toHaveLength(1);
    expect(stripe.domains).toHaveLength(1);
    // Live mode has its own domains in Stripe: registered there apart.
    const live = fakeStripe();
    live.domains.push({ ...stripe.domains[0]! });
    expect((await checkWalletDomain({ secretKey: SK_LIVE, sandbox: false }, DOMAIN, { fetcher: live.fetcher, now: NOW })).mode).toBe("live");
    expect(live.domains.filter((d) => d.livemode)).toHaveLength(1);
  });

  it("turns a domain turned off back on, and checks one whose wallet isn't active again, with Stripe's words", async () => {
    const stripe = fakeStripe();
    stripe.domains.push({ id: "pmd_off", domain_name: DOMAIN, enabled: false, livemode: false, apple_pay: { status: "active" }, google_pay: { status: "active" } });
    expect((await checkWalletDomain(keys, DOMAIN, { fetcher: stripe.fetcher, now: NOW })).status).toBe("ready");
    expect(stripe.calls.at(-1)).toMatchObject({ method: "POST", path: "/v1/payment_method_domains/pmd_off", body: "enabled=true" });

    stripe.domains[0]!.apple_pay = { status: "inactive", status_details: { error_message: "Apple couldn't verify the domain with key sk_test_51WalletsShopKey0001." } };
    const partial = await checkWalletDomain(keys, DOMAIN, { fetcher: stripe.fetcher, now: NOW });
    expect(stripe.calls.at(-1)).toMatchObject({ method: "POST", path: "/v1/payment_method_domains/pmd_off/validate" });
    expect(partial).toMatchObject({ status: "partial", applePay: false, googlePay: true, reason: "inactive" });
    // Stripe's words, without the key.
    expect(partial.details).toContain("Apple couldn't verify the domain");
    expect(partial.details).not.toContain(SK);
  });

  it("says why when it can't: a restricted key without the permission, a refused key, Stripe out of reach, a refusal", async () => {
    const answer = (status: number, message: string): typeof fetch => (async () => Response.json({ error: { message } }, { status })) as unknown as typeof fetch;
    expect(await checkWalletDomain(keys, DOMAIN, { fetcher: answer(403, "The provided key does not have the required permissions"), now: NOW })).toMatchObject({ status: "failed", reason: "forbidden", id: null });
    expect(await checkWalletDomain(keys, DOMAIN, { fetcher: answer(401, "Invalid API Key provided"), now: NOW })).toMatchObject({ status: "failed", reason: "keysRefused" });
    expect(await checkWalletDomain(keys, DOMAIN, { fetcher: answer(400, "Invalid domain name"), now: NOW })).toMatchObject({ status: "failed", reason: "refused", details: "Invalid domain name" });
    expect(await checkWalletDomain(keys, DOMAIN, { fetcher: answer(500, "oops"), now: NOW })).toMatchObject({ status: "failed", reason: "unreachable" });
    const down = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await checkWalletDomain(keys, DOMAIN, { fetcher: down, now: NOW })).toMatchObject({ status: "failed", reason: "unreachable" });
    await expect(registerStripeWalletDomain(keys, DOMAIN, { fetcher: down })).rejects.toThrow("Stripe can't be reached.");
  });
});

describe("155 before Stripe's form: once, remembered, and never in the way of the card", () => {
  let store: MemoryStore;
  let app: App;
  let order: CatalogOrder;
  const customer = { name: "Ada Lovelace", phone: "+447700900123", email: "ada@example.com", city: "London", address: "1 Baker St" };
  const urls = callbackUrls(`https://${DOMAIN}`, "order", "stripe", "wallet-token");

  async function makeShop() {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "store");
    app = {
      ...base,
      backend: "hosted",
      appName: "Wallet Mugs",
      connector: { kind: "catalog" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "USD", payment: encryptOwnPayment(base.id, { provider: "stripe", secretKey: SK, sandbox: true, publishableKey: PK }, KEY) },
    };
    await store.createApp(app);
    order = await store.createCatalogOrder({
      appId: app.id,
      tokenHash: sha256Hex("wallet-token"),
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
    });
  }
  const pay = async (fetcher: typeof fetch, now = NOW) => {
    const fresh = (await store.getAppById(app.id))!;
    return startPayment({ store, app: fresh, account: (await checkoutAccount(store, fresh, KEY))!, fetcher, now, order, customer, ip: "203.0.113.9", callbackUrls: urls, walletDomain: DOMAIN });
  };
  const kept = async () => (catalogSettings((await store.getAppById(app.id))!).payment as OwnStripePayment).wallets ?? null;
  const domainCalls = <T extends { path: string }>(calls: T[]) => calls.filter((c) => c.path.startsWith("/v1/payment_method_domains"));

  it("registers the domain with the shop's key at the first embedded session, keeps it, and doesn't ask again", async () => {
    await makeShop();
    const stripe = fakeStripe({ secretKey: SK });
    const before = gatewayKeysFingerprint(catalogSettings(app).payment as OwnStripePayment);
    const started = await pay(stripe.fetcher);
    expect(started.stripe?.publishableKey).toBe(PK);
    expect(domainCalls(stripe.calls).map((c) => c.method)).toEqual(["GET", "POST"]);
    expect(await kept()).toMatchObject({ domain: DOMAIN, mode: "test", status: "ready", id: "pmd_1fake" });
    // Kept on the payment settings, which are still the same keys for paying inside the app (134).
    expect(gatewayKeysFingerprint(catalogSettings((await store.getAppById(app.id))!).payment as OwnStripePayment)).toBe(before);
    // The next payments don't ask Stripe again.
    await pay(stripe.fetcher, new Date(NOW.getTime() + 60_000));
    await pay(stripe.fetcher, new Date(NOW.getTime() + 30 * 86_400_000));
    expect(domainCalls(stripe.calls)).toHaveLength(2);
    expect(stripe.domains).toHaveLength(1);
    expect(await store.listAppErrors({ appId: app.id, limit: 10 })).toEqual([]);
  });

  it("starts the card payment all the same when registering fails, notes it for the team, and tries again only hours later", async () => {
    await makeShop();
    const stripe = fakeStripe({ secretKey: SK });
    const failing: typeof fetch = async (input, init) => {
      if (String(input).includes("/v1/payment_method_domains")) throw new TypeError("fetch failed");
      return stripe.fetcher(input, init);
    };
    const started = await pay(failing);
    // The card form as before.
    expect(started).toEqual({ url: null, stripe: { clientSecret: expect.stringMatching(/_secret_fake$/), publishableKey: PK } });
    expect(await kept()).toMatchObject({ status: "failed", reason: "unreachable", domain: DOMAIN });
    const errors = await store.listAppErrors({ appId: app.id, limit: 10 });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ source: "payment", code: "stripe_wallets_unreachable" });
    expect(errors[0]!.message).toContain(`Apple Pay and Google Pay not available on ${DOMAIN} (test mode)`);
    expect(errors[0]!.message).not.toContain(SK);
    // Within the next hours a payment doesn't ask again; after them it does, and it's ready.
    const soon = new Date(NOW.getTime() + 60 * 60_000);
    await pay(stripe.fetcher, soon);
    expect(domainCalls(stripe.calls)).toHaveLength(0);
    await pay(stripe.fetcher, new Date(NOW.getTime() + WALLET_RETRY_MS));
    expect(domainCalls(stripe.calls).map((c) => c.method)).toEqual(["GET", "POST"]);
    expect(await kept()).toMatchObject({ status: "ready" });
  });

  it("never asks for Stripe's page, a hosted payment, or a payment page without a domain", async () => {
    await makeShop();
    const stripe = fakeStripe({ secretKey: SK });
    const fresh = (await store.getAppById(app.id))!;
    const account = (await checkoutAccount(store, fresh, KEY))!;
    await startPayment({ store, app: fresh, account, fetcher: stripe.fetcher, now: NOW, order, customer, ip: "203.0.113.9", callbackUrls: urls, walletDomain: DOMAIN, hosted: true });
    await startPayment({ store, app: fresh, account, fetcher: stripe.fetcher, now: NOW, order, customer, ip: "203.0.113.9", callbackUrls: urls, walletDomain: null });
    expect(domainCalls(stripe.calls)).toEqual([]);
    // And ensureWalletDomain itself never throws, whatever the store does.
    const broken = { ...store, getAppById: () => Promise.reject(new Error("down")) } as unknown as MemoryStore;
    expect(await ensureWalletDomain({ store: broken, app: fresh, keys: { secretKey: SK, sandbox: true }, domain: DOMAIN, fetcher: stripe.fetcher, now: NOW })).toBeNull();
  });

  it("asks again for new keys of the other mode, or another domain", () => {
    const payment = (wallets: StripeWallets | null, sandbox = true) => ({ provider: "stripe", secretKeyEncrypted: "x", sandbox, wallets }) as OwnStripePayment;
    const ready: StripeWallets = { domain: DOMAIN, mode: "test", status: "ready", id: "pmd_1", applePay: true, googlePay: true, reason: null, details: null, at: NOW.toISOString() };
    expect(walletsDue(payment(null), DOMAIN, NOW)).toBe(true);
    expect(walletsDue(payment(ready), DOMAIN, NOW)).toBe(false);
    expect(walletsDue(payment(ready, false), DOMAIN, NOW)).toBe(true);
    expect(walletsDue(payment(ready), "www.yallapp.com.tr", NOW)).toBe(true);
    const partial = { ...ready, status: "partial" as const, applePay: false };
    expect(walletsDue(payment(partial), DOMAIN, new Date(NOW.getTime() + WALLET_RETRY_MS - 1))).toBe(false);
    expect(walletsDue(payment(partial), DOMAIN, new Date(NOW.getTime() + WALLET_RETRY_MS))).toBe(true);
  });
});

describe("155 Test connection and the Payments page's line", () => {
  it("registers the domain with the keys tested when given it, as checks that never fail the test", async () => {
    const stripe = fakeStripe({ secretKey: SK, accountName: "Wallet Mugs" });
    const input = { provider: "stripe" as const, secretKey: SK, sandbox: true, publishableKey: PK, webhookSecret: null };
    const base = { input, currency: "USD", stripeWebhookUrl: "https://yallapp.com.tr/api/pay/stripe/webhook/x", receipt: null, testPayment: false, now: NOW };
    const report = await testConnection({ ...base, walletDomain: DOMAIN }, { fetcher: stripe.fetcher });
    expect(report.checks).toContainEqual({ tone: "ok", code: "walletsReady", values: { domain: DOMAIN } });
    expect(report.wallets).toMatchObject({ domain: DOMAIN, status: "ready" });
    // Without a domain, nothing is registered (the test changes nothing else).
    const calls = stripe.calls.length;
    const plain = await testConnection(base, { fetcher: stripe.fetcher });
    expect(plain.checks.some((c) => c.code.startsWith("wallets"))).toBe(false);
    expect(stripe.calls.slice(calls).filter((c) => c.path.startsWith("/v1/payment_method_domains"))).toEqual([]);
    // A restricted key without the permission: a warning with what to do, and the test still passes.
    const restricted = fakeStripe();
    const forbidding: typeof fetch = async (url, init) =>
      String(url).includes("/v1/payment_method_domains") ? Response.json({ error: { message: "The provided key 'rk_test_***0001' does not have the required permissions" } }, { status: 403 }) : restricted.fetcher(url, init);
    const warned = await testConnection({ ...base, walletDomain: DOMAIN }, { fetcher: forbidding });
    expect(warned.ok).toBe(true);
    expect(warned.checks).toContainEqual({ tone: "warn", code: "walletsForbidden", values: { domain: DOMAIN } });
    expect(warned.checks.find((c) => c.code === "walletsSaid")!.values!.details).toContain("does not have the required permissions");
  });

  it("says ready, or not yet and why, in plain words in English, Egyptian Arabic and Turkish", () => {
    const at = NOW.toISOString();
    const stripe = (wallets: StripeWallets | null) => ({ provider: "stripe", secretKeyEncrypted: "x", sandbox: true, wallets }) as OwnStripePayment;
    const record = (over: Partial<StripeWallets>): StripeWallets => ({ domain: DOMAIN, mode: "test", status: "failed", id: null, applePay: false, googlePay: false, reason: "refused", details: null, at, ...over });
    expect(walletLine(null, DOMAIN)).toBeNull();
    expect(walletLine({ provider: "paypal", clientId: "a", secretEncrypted: "b", sandbox: true }, DOMAIN)).toBeNull();
    expect(walletLine(stripe(null), null)).toBeNull();
    expect(walletLine(stripe(null), DOMAIN)).toMatchObject({ tone: "neutral", code: "notYet" });
    expect(walletLine(stripe(record({ status: "ready", applePay: true, googlePay: true, reason: null })), DOMAIN)).toEqual({ tone: "success", code: "ready", values: { domain: DOMAIN } });
    expect(walletLine(stripe(record({ status: "partial", googlePay: true, reason: "inactive", details: "Not verified." })), DOMAIN)).toEqual({ tone: "warn", code: "partialApple", values: { domain: DOMAIN, details: "Not verified." } });
    expect(walletLine(stripe(record({ status: "partial", applePay: true, reason: "inactive" })), DOMAIN)).toMatchObject({ code: "partialGoogle" });
    for (const reason of ["unreachable", "keysRefused", "forbidden", "refused", "inactive"] as const) expect(walletLine(stripe(record({ reason })), DOMAIN)).toMatchObject({ tone: "warn", code: reason });
    // Another mode's or another domain's record is no answer for this one.
    expect(walletLine(stripe(record({ status: "ready", mode: "live" })), DOMAIN)).toMatchObject({ code: "notYet" });

    const keys = ["Ready", "NotYet", "PartialApple", "PartialGoogle", "Inactive", "Unreachable", "KeysRefused", "Forbidden", "Refused", "Said", "Cards"];
    for (const lang of ["en", "ar", "tr"] as const) {
      const messages = flattenMessages(dashboardMessages(lang));
      for (const key of keys) {
        const text = messages.get(`gateways.wallets${key}`);
        expect(text, `${lang} ${key}`).toBeTruthy();
        if (key !== "Said" && key !== "Cards") expect(text, `${lang} ${key}`).toMatch(/Apple Pay|Google Pay/);
      }
      expect(messages.get("gateways.walletsReady")).toContain("{domain}");
      expect(messages.get("gateways.walletsSaid")).toContain("{details}");
    }
    expect(flattenMessages(dashboardMessages("en")).get("gateways.walletsReady")).toBe("Apple Pay and Google Pay: ready. Stripe's card form offers them on {domain}, on phones and browsers that have them.");
  });
});
