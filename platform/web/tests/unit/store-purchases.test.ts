import { createHmac, generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { keyContext } from "@/lib/builds/signing";
import { encrypt } from "@/lib/crypto/encryption";
import { MemoryStore } from "@/lib/data/memory";
import type { App, Course, StoreProduct } from "@/lib/data/types";
import { CoursesConnector } from "@/lib/hosted/connectors/courses";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { activateLicense, parseSiteInfo } from "@/lib/license/service";
import { PLAN_INFO, type PlanInfo } from "@/lib/plans";
import { ACCESS_PATH, accessSignature, grantId } from "@/lib/store-billing/delivery";
import { retryDue, runStorePurchases } from "@/lib/store-billing/jobs";
import { handleAppleNotification } from "@/lib/store-billing/notifications";
import { reconcileProducts, wantedFromCourses } from "@/lib/store-billing/products";
import { eventKindOf, tokenKey } from "@/lib/store-billing/purchases";
import { inAppFigures, salesShows } from "@/lib/analytics/sales";
import { startSiteBillingSession } from "@/lib/store-billing/sessions";
import { chain } from "./apple-chain";
import { expectContract } from "./contract";
import { days, KEY, NOW, setupClient } from "./helpers";

/** 100.3 Purchases through Google Play and the App Store: checked, kept once, the access given and taken back. */

const PLATFORM = "https://yallapp.test";
const PLAY = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.ada.app";
const assetUrl = (id: string) => `${PLATFORM}/api/v1/assets/${id}`;
const MINUTE = 60_000;

const course = (id: number, patch: Partial<Course> = {}): Course => ({
  id,
  title: `Course ${id}`,
  description: "",
  imageAssetId: null,
  priceCents: 45000,
  categoryIds: [],
  instructorName: null,
  level: null,
  topics: [],
  active: true,
  createdAt: NOW.toISOString(),
  ...patch,
});

const synced = (at: Date) => ({ status: "synced" as const, storeState: "ACTIVE", price: "450.00", error: null, at: at.toISOString() });

/** The products of the app's courses, made in both stores. */
async function productsReady(store: MemoryStore, app: App, platforms: ("google" | "apple")[] = ["google", "apple"]) {
  let n = 0;
  for (const product of reconcileProducts(app.id, [], wantedFromCourses(app.courseSetup), NOW, () => `p${++n}`)) {
    const at = new Date(NOW.getTime() + 1000);
    await store.saveStoreProduct({ ...product, google: platforms.includes("google") ? synced(at) : null, apple: platforms.includes("apple") ? synced(at) : null } satisfies StoreProduct);
  }
}

interface Call {
  method: string;
  url: string;
  body: string;
  headers: Record<string, string>;
}

/** Google, as recorded answers: the token, and each purchase token's state. */
function googleFake(purchases: Record<string, { state: "PURCHASED" | "PENDING" | "CANCELLED"; product?: string; acknowledged?: boolean }>, voided: { token: string; reason?: number }[] = []) {
  const calls: Call[] = [];
  const fetcher = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ method: init?.method ?? "GET", url, body: String(init?.body ?? ""), headers: Object.fromEntries(new Headers(init?.headers).entries()) });
    if (url === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "ya29.token" });
    const read = /\/purchases\/productsv2\/tokens\/([^/]+)$/.exec(url);
    if (read) {
      const found = purchases[decodeURIComponent(read[1]!)];
      if (!found) return Response.json({ error: { code: 404 } }, { status: 404 });
      return Response.json({
        orderId: "GPA.3300-1111-2222-33333",
        purchaseStateContext: { purchaseState: found.state },
        acknowledgementState: found.acknowledged ? "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED" : "ACKNOWLEDGEMENT_STATE_PENDING",
        productLineItem: [{ productId: found.product ?? "course_12", productOfferDetails: { quantity: 1, refundableQuantity: 1 } }],
      });
    }
    if (url.endsWith(":acknowledge")) return Response.json({});
    if (url.startsWith(`${PLAY}/purchases/voidedpurchases`))
      return Response.json({ voidedPurchases: voided.map((v) => ({ purchaseToken: v.token, orderId: "GPA.3300-1111-2222-33333", voidedTimeMillis: String(NOW.getTime()), voidedReason: v.reason ?? 1 })) });
    return Response.json({ error: { code: 500, message: `no answer for ${url}` } }, { status: 500 });
  }) as typeof fetch;
  return { fetcher, calls };
}

describe("100.3 purchases in an academy on the dashboard's courses", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let plan: PlanInfo;
  let google = googleFake({});
  const test = chain();

  beforeEach(async () => {
    ({ store } = await setupClient({ plan: "growth" }));
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const account = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const base = newApp(client.id, null, NOW, "lms");
    app = {
      ...base,
      backend: "hosted",
      appName: "Lale Academy",
      websiteDoneAt: NOW,
      connector: { kind: "courses" },
      courseSetup: { currency: "TRY", categories: [], courses: [course(12, { title: "Arabic for beginners" }), course(13, { priceCents: 0 })], nextId: 14 },
      androidPackage: "com.ada.app",
      iosBundleId: "com.ada.app",
      storeBilling: { enabled: true },
      googlePlayKeyEncrypted: encrypt(JSON.stringify({ client_email: "yallapp@ada.iam.gserviceaccount.com", private_key: account }), KEY, keyContext.googlePlay(base.id)),
    };
    await store.createApp(app);
    await productsReady(store, app);
    sender = new LogSender();
    now = new Date(NOW.getTime() + 5000);
    plan = PLAN_INFO.growth;
    google = googleFake({ "tok-1": { state: "PURCHASED" }, "tok-pending": { state: "PENDING" }, "tok-other": { state: "PURCHASED", product: "course_99" } });
  });

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    plan,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl,
    platformUrl: PLATFORM,
    connector: new CoursesConnector({ store, app, assetUrl, platformUrl: PLATFORM, storeBilling: true }),
    billing: { key: KEY, fetcher: google.fetcher, appleRoots: [test.rootPem] },
  });

  async function call(method: string, route: string, options: { body?: unknown; token?: string | null; query?: Record<string, string> } = {}): Promise<HostedResult> {
    const result = await handleHosted(context(), { method, path: route.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null });
    if (route.startsWith("/billing")) expectContract(method, route, result);
    return result;
  }

  async function signUp(phone: string, name: string) {
    now = new Date(now.getTime() + 61_000);
    const device = { id: `install-${phone}`, platform: "android", name: "Pixel 8", app_version: "1.0.0" };
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+90${phone}`)!, device } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device } });
    return registered.body as { access_token: string; user: { id: number } };
  }

  const android = { platform: "android" };
  const enrolled = async (userId: number) => (await store.listCourseEnrollments({ appId: app.id, userId })).map((e) => [e.courseId, e.source]);

  it("tells the app what it sells, and the course page buys through the store", async () => {
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { store_billing?: unknown; purchases: { enroll_button: boolean } };
    expect(config.store_billing).toEqual({ base_url: `${PLATFORM}/api/app/${app.id}`, session: "access_token", terms_url: null });
    // No payment page any more for the app's courses.
    expect(config.purchases.enroll_button).toBe(false);
    expect((await call("GET", "/billing/products", { query: android })).body).toEqual({
      items: [{ product_id: "course_12", type: "one_time", kind: "course", course_id: 12, plan_id: null, title: "Arabic for beginners", period: null, course_ids: [12] }],
    });
    const detail = await call("GET", "/courses/12", { query: android });
    expect(detail.body).toMatchObject({ purchase: { action: "store", store_product_id: "course_12" } });
    expect((await call("GET", "/courses/13", { query: android })).body).toMatchObject({ purchase: { action: "enroll_free", store_product_id: null } });
    // Off on Starter, or when the owner turned it off.
    plan = PLAN_INFO.starter;
    expect((await call("GET", "/billing/products", { query: android })).status).toBe(403);
    expect((await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body).not.toHaveProperty("store_billing");
  });

  it("checks a Google purchase, enrols the person, acknowledges it, and answers the same grant again", async () => {
    expect((await call("POST", "/billing/purchases", { query: android, body: { product_id: "course_12", purchase_token: "tok-1" } })).status).toBe(401);
    const { access_token, user } = await signUp("5321234567", "Deniz Aksoy");
    const bought = await call("POST", "/billing/purchases", { query: android, token: access_token, body: { product_id: "course_12", purchase_token: "tok-1" } });
    expect(bought).toEqual({ status: 200, body: { product_id: "course_12", kind: "course", course_id: 12, plan_id: null, status: "active", expires_at: null } });
    expect(await enrolled(user.id)).toEqual([[12, "paid"]]);
    const acks = () => google.calls.filter((c) => c.url.endsWith(":acknowledge")).map((c) => c.url);
    expect(acks()).toEqual([`${PLAY}/purchases/products/course_12/tokens/tok-1:acknowledge`]);
    const kept = (await store.getStorePurchase(app.id, "android", tokenKey("tok-1")))!;
    expect(kept).toMatchObject({ accountSource: "hosted", accountId: String(user.id), status: "active", acknowledged: true, delivered: true, transactionId: "GPA.3300-1111-2222-33333" });

    // The same purchase again: the same grant, nothing acknowledged twice.
    expect((await call("POST", "/billing/purchases", { query: android, token: access_token, body: { product_id: "course_12", purchase_token: "tok-1" } })).body).toMatchObject({ status: "active" });
    expect(acks()).toHaveLength(1);
    // Another account of the app can't use it.
    const other = await signUp("5329876543", "Ece Yilmaz");
    expect(await call("POST", "/billing/purchases", { query: android, token: other.access_token, body: { product_id: "course_12", purchase_token: "tok-1" } })).toMatchObject({ status: 409, body: { code: "purchase_in_use" } });
    // Restore gives the first account its grant back, and the other one nothing.
    expect((await call("POST", "/billing/purchases/restore", { query: android, token: access_token, body: { purchase_tokens: ["tok-1"] } })).body).toEqual({ items: [expect.objectContaining({ product_id: "course_12", status: "active" })] });
    expect((await call("POST", "/billing/purchases/restore", { query: android, token: other.access_token, body: { purchase_tokens: ["tok-1"] } })).body).toEqual({ items: [] });
  });

  it("refuses what isn't this app's purchase, and gives nothing for a pending one", async () => {
    const { access_token, user } = await signUp("5321234567", "Deniz Aksoy");
    const send = (body: unknown) => call("POST", "/billing/purchases", { query: android, token: access_token, body });
    expect(await send({ product_id: "course_12", purchase_token: "tok-unknown" })).toMatchObject({ status: 400, body: { code: "invalid_receipt" } });
    expect(await send({ product_id: "course_12", purchase_token: "tok-other" })).toMatchObject({ status: 400, body: { code: "invalid_receipt" } });
    expect(await send({ product_id: "course_77", purchase_token: "tok-1" })).toMatchObject({ status: 400, body: { code: "invalid_receipt" } });
    expect((await send({ product_id: "course_12", purchase_token: "tok-pending" })).body).toMatchObject({ status: "pending" });
    expect(await enrolled(user.id)).toEqual([]);
    expect(google.calls.some((c) => c.url.endsWith(":acknowledge"))).toBe(false);
    // Restore with a token Yallapp hasn't seen: Google says its product, and it's kept and given.
    const restored = await call("POST", "/billing/purchases/restore", { query: android, token: access_token, body: { purchase_tokens: ["tok-1", "tok-unknown"] } });
    expect(restored.body).toEqual({ items: [expect.objectContaining({ product_id: "course_12", status: "active" })] });
    expect(await enrolled(user.id)).toEqual([[12, "paid"]]);
  });

  it("takes the course back when Google says the purchase was refunded", async () => {
    const { access_token, user } = await signUp("5321234567", "Deniz Aksoy");
    await call("POST", "/billing/purchases", { query: android, token: access_token, body: { product_id: "course_12", purchase_token: "tok-1" } });
    const refunds = googleFake({}, [{ token: "tok-1" }]);
    const report = await runStorePurchases({ store, key: KEY, now: new Date(now.getTime() + MINUTE), fetcher: refunds.fetcher });
    expect(report).toMatchObject({ refunds: 1, delivered: 1, failed: 0 });
    expect(await enrolled(user.id)).toEqual([]);
    expect(await store.getStorePurchase(app.id, "android", tokenKey("tok-1"))).toMatchObject({ status: "revoked", reason: "refunded", delivered: true });
    // 100.6 In Analytics: one bought at the store price then, and its refund.
    const day = [new Date(NOW.getTime() - 3600_000), new Date(NOW.getTime() + 86_400_000)] as const;
    expect(await inAppFigures(store, app.id, ...day)).toEqual({
      inApp: { count: 1, totals: [{ currency: "TRY", cents: 45000 }] },
      inAppRefunds: { count: 1, totals: [{ currency: "TRY", cents: 45000 }] },
      renewals: 0,
    });
    expect(salesShows(app).inApp).toBe(true);
    // Read once an hour.
    const again = googleFake({}, [{ token: "tok-1" }]);
    await runStorePurchases({ store, key: KEY, now: new Date(now.getTime() + 10 * MINUTE), fetcher: again.fetcher });
    expect(again.calls.filter((c) => c.url.includes("voidedpurchases"))).toEqual([]);
  });

  it("checks an App Store transaction offline, and Apple's refund notice takes the course back", async () => {
    const { access_token, user } = await signUp("5321234567", "Deniz Aksoy");
    const transaction = {
      transactionId: "2000000812345678",
      originalTransactionId: "2000000812345678",
      bundleId: "com.ada.app",
      productId: "course_12",
      purchaseDate: NOW.getTime(),
      type: "Non-Consumable",
      environment: "Sandbox",
    };
    const ios = { platform: "ios" };
    const bought = await call("POST", "/billing/purchases", { query: ios, token: access_token, body: { product_id: "course_12", signed_transaction: test.jws(transaction) } });
    expect(bought.body).toMatchObject({ status: "active" });
    expect(await enrolled(user.id)).toEqual([[12, "paid"]]);
    expect(await store.getStorePurchase(app.id, "ios", "2000000812345678")).toMatchObject({ test: true, acknowledged: true });
    // Another app's transaction, or one not signed by Apple's chain, is refused.
    expect((await call("POST", "/billing/purchases", { query: ios, token: access_token, body: { product_id: "course_12", signed_transaction: test.jws({ ...transaction, bundleId: "com.other.app" }) } })).status).toBe(400);
    expect((await call("POST", "/billing/purchases", { query: ios, token: access_token, body: { product_id: "course_12", signed_transaction: chain().jws(transaction) } })).status).toBe(400);

    const refund = test.jws({
      notificationType: "REFUND",
      notificationUUID: "e2b1c1a0-0000-4000-8000-000000000001",
      data: { bundleId: "com.ada.app", environment: "Sandbox", signedTransactionInfo: test.jws({ ...transaction, revocationDate: NOW.getTime() + 2 * MINUTE, revocationReason: 0 }) },
      signedDate: NOW.getTime() + 2 * MINUTE,
    });
    const told = await handleAppleNotification({ store, key: KEY, now: new Date(now.getTime() + 3 * MINUTE), appleRoots: [test.rootPem] }, (await store.getAppById(app.id))!, { signedPayload: refund });
    expect(told.status).toBe(200);
    expect(await enrolled(user.id)).toEqual([]);
    expect(await store.getStorePurchase(app.id, "ios", "2000000812345678")).toMatchObject({ status: "revoked", reason: "refunded" });
    // Not Apple's: refused.
    expect((await handleAppleNotification({ store, key: KEY, now, appleRoots: [test.rootPem] }, app, { signedPayload: chain().jws({ notificationType: "REFUND" }) })).status).toBe(400);
  });
});

describe("100.3 purchases in a WordPress academy", () => {
  async function wordpress() {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "Ada", email: "ada@academy.test", whatsapp: "+905446731942", siteUrl: "https://academy.test", password: null }, NOW);
    const account = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const base = newApp(client.id, "https://academy.test", NOW, "lms");
    const created: App = {
      ...base,
      backend: "wordpress",
      appName: "Ada Academy",
      androidPackage: "com.ada.app",
      storeBilling: { enabled: true },
      googlePlayKeyEncrypted: encrypt(JSON.stringify({ client_email: "yallapp@ada.iam.gserviceaccount.com", private_key: account }), KEY, keyContext.googlePlay(base.id)),
    };
    await store.createApp(created);
    const { licenseKey } = await activateClient(store, { clientId: client.id, appId: created.id, plan: "growth", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    const info = { license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.4.23", wp_version: "6.8", lms: "tutor" };
    const site = parseSiteInfo(info);
    if (!site.ok) throw new Error("site");
    expect((await activateLicense(store, site.value, NOW)).status).toBe(200);
    const product: StoreProduct = {
      id: "p1",
      appId: created.id,
      productId: "plan_pmpro_3",
      kind: "membership",
      courseId: null,
      planId: "pmpro:3",
      title: "Gold",
      period: "month",
      courseIds: [12],
      currency: "TRY",
      sitePrice: "199.00",
      ownPrice: null,
      active: true,
      google: synced(new Date(NOW.getTime() + 1000)),
      apple: null,
      createdAt: NOW,
      updatedAt: NOW,
    };
    await store.saveStoreProduct(product);
    return { store, app: (await store.getAppById(created.id))!, info, licenseKey: licenseKey! };
  }

  /** Google's answer for a monthly subscription paid until the 12th of next month. */
  const subscriptionGoogle = (calls: Call[]) =>
    (async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ method: init?.method ?? "GET", url, body: String(init?.body ?? ""), headers: Object.fromEntries(new Headers(init?.headers).entries()) });
      if (url === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "ya29.token" });
      if (url.includes("/purchases/subscriptionsv2/tokens/"))
        return Response.json({
          subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
          acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
          lineItems: [{ productId: "plan_pmpro_3", expiryTime: "2026-11-12T10:00:00Z", latestSuccessfulOrderId: "GPA.3300-4444", autoRenewingPlan: { autoRenewEnabled: true } }],
        });
      if (url.endsWith(":acknowledge")) return Response.json({});
      return Response.json({}, { status: 500 });
    }) as typeof fetch;

  it("the license tells the site what it sells; a person signed in on the site buys a membership and the site gets the access, signed", async () => {
    const { store, app, info, licenseKey } = await wordpress();
    const site0 = parseSiteInfo(info);
    if (!site0.ok) throw new Error("site");
    const status = await activateLicense(store, site0.value, NOW);
    expect(status.status === 200 && status.body.store_billing).toEqual({
      base_url: expect.stringMatching(new RegExp(`/api/app/${app.id}$`)),
      platforms: ["android"],
      products: [{ product_id: "plan_pmpro_3", kind: "membership", course_id: null, plan_id: "pmpro:3" }],
    });

    const session = await startSiteBillingSession(store, { ...info, user: { id: 42, name: "Deniz Aksoy", email: "deniz@academy.test" } }, { now: NOW, platformUrl: PLATFORM });
    expect(session.status).toBe(200);
    if (session.status !== 200) return;
    expect(session.body.base_url).toBe(`${PLATFORM}/api/app/${app.id}`);

    const calls: Call[] = [];
    let siteAnswer = 503;
    const site = (async (input: string | URL, init?: RequestInit) => {
      calls.push({ method: init?.method ?? "GET", url: String(input), body: String(init?.body ?? ""), headers: Object.fromEntries(new Headers(init?.headers).entries()) });
      return Response.json({ ok: siteAnswer === 200, order_id: 501 }, { status: siteAnswer });
    }) as typeof fetch;
    const ctx: HostedContext = {
      store,
      app,
      active: true,
      plan: PLAN_INFO.growth,
      now: NOW,
      ip: "203.0.113.9",
      secret: "s",
      sender: null,
      push: false,
      assetUrl,
      platformUrl: PLATFORM,
      billing: { key: KEY, fetcher: subscriptionGoogle(calls), site: { fetcher: site, resolve: async () => ["203.0.113.10"] } },
    };
    const send = () => handleHosted(ctx, { method: "POST", path: ["billing", "purchases"], query: new URLSearchParams({ platform: "android" }), body: { product_id: "plan_pmpro_3", purchase_token: "sub-1" }, token: session.body.token });
    // The site doesn't answer: the app keeps the purchase and sends it again; Google isn't told yet.
    expect(await send()).toMatchObject({ status: 503, body: { code: "store_unavailable" } });
    expect(calls.some((c) => c.url.endsWith(":acknowledge"))).toBe(false);
    siteAnswer = 200;
    const bought = await send();
    expect(bought).toEqual({ status: 200, body: { product_id: "plan_pmpro_3", kind: "membership", course_id: null, plan_id: "pmpro:3", status: "active", expires_at: "2026-11-12T10:00:00.000Z" } });
    expect(calls.filter((c) => c.url.endsWith(":acknowledge")).map((c) => c.url)).toEqual([`${PLAY}/purchases/subscriptions/plan_pmpro_3/tokens/sub-1:acknowledge`]);

    const access = calls.filter((c) => c.url === `https://academy.test${ACCESS_PATH}`).at(-1)!;
    const body = JSON.parse(access.body) as Record<string, unknown>;
    const purchase = (await store.getStorePurchase(app.id, "android", tokenKey("sub-1")))!;
    expect(body).toEqual({
      grant_id: grantId(purchase),
      action: "grant",
      user_id: 42,
      kind: "membership",
      course_id: null,
      plan_id: "pmpro:3",
      expires_at: "2026-11-12T10:00:00.000Z",
      platform: "android",
      transaction_id: "GPA.3300-4444",
      amount: "199.00",
      currency: "TRY",
    });
    // Signed like the plugin checks: the same value its tests expect for these bytes.
    expect(access.headers["yallapp-signature"]).toBe(accessSignature(licenseKey, Number(access.headers["yallapp-timestamp"]), access.body));
    expect(accessSignature("yall-7k2d-9qwe-4mnb", 1792000000, '{"grant_id":"x"}')).toBe(createHmac("sha256", "YALL-7K2D-9QWE-4MNB").update('yallapp-billing-access:1792000000:{"grant_id":"x"}').digest("hex"));
    // 79.3 A token of one app opens nothing in another; its purchases stay its own.
    const otherApp: App = { ...app, id: "00000000-0000-4000-8000-000000000999" };
    expect((await handleHosted({ ...ctx, app: otherApp }, { method: "POST", path: ["billing", "purchases"], query: new URLSearchParams({ platform: "android" }), body: { product_id: "plan_pmpro_3", purchase_token: "sub-1" }, token: session.body.token })).status).toBe(401);
    expect(await store.getStorePurchase(otherApp.id, "android", tokenKey("sub-1"))).toBeNull();
    // A token from another app, or expired, is no account.
    expect((await handleHosted({ ...ctx, now: new Date(NOW.getTime() + 3601_000) }, { method: "POST", path: ["billing", "purchases"], query: new URLSearchParams({ platform: "android" }), body: { product_id: "plan_pmpro_3", purchase_token: "sub-1" }, token: session.body.token })).status).toBe(401);
  });

  it("tries the site again later, less often as it waits", () => {
    const at = (minutes: number) => new Date(NOW.getTime() + minutes * MINUTE);
    expect(retryDue({ createdAt: NOW, updatedAt: NOW }, at(0.5))).toBe(false);
    expect(retryDue({ createdAt: NOW, updatedAt: NOW }, at(1))).toBe(true);
    expect(retryDue({ createdAt: NOW, updatedAt: at(60) }, at(70))).toBe(false);
    expect(retryDue({ createdAt: NOW, updatedAt: at(60) }, at(80))).toBe(true);
    expect(retryDue({ createdAt: NOW, updatedAt: at(10 * 24 * 60) }, at(10 * 24 * 60 + 23 * 60))).toBe(false);
    expect(retryDue({ createdAt: NOW, updatedAt: at(10 * 24 * 60) }, at(11 * 24 * 60))).toBe(true);
  });
});

describe("100.6 sales events of store purchases", () => {
  const at = (minutes: number) => new Date(NOW.getTime() + minutes * MINUTE);
  it("names each change once", () => {
    expect(eventKindOf(null, { status: "active", expiresAt: null, reason: null })).toBe("bought");
    expect(eventKindOf(null, { status: "pending", expiresAt: null, reason: null })).toBeNull();
    expect(eventKindOf({ status: "pending", expiresAt: null }, { status: "active", expiresAt: null, reason: null })).toBe("bought");
    expect(eventKindOf({ status: "active", expiresAt: at(10) }, { status: "active", expiresAt: at(20), reason: null })).toBe("renewed");
    expect(eventKindOf({ status: "active", expiresAt: at(10) }, { status: "active", expiresAt: at(10), reason: null })).toBeNull();
    expect(eventKindOf({ status: "expired", expiresAt: at(10) }, { status: "active", expiresAt: at(20), reason: null })).toBe("renewed");
    expect(eventKindOf({ status: "active", expiresAt: null }, { status: "revoked", expiresAt: null, reason: "refunded" })).toBe("refunded");
    expect(eventKindOf({ status: "active", expiresAt: null }, { status: "revoked", expiresAt: null, reason: "revoked" })).toBe("revoked");
    expect(eventKindOf({ status: "active", expiresAt: at(1) }, { status: "expired", expiresAt: at(1), reason: "expired" })).toBe("expired");
    expect(eventKindOf({ status: "revoked", expiresAt: null }, { status: "revoked", expiresAt: null, reason: "refunded" })).toBeNull();
  });
});
