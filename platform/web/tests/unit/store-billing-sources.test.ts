import { generateKeyPairSync, randomUUID } from "node:crypto";
import { createLocalJWKSet, decodeProtectedHeader, jwtVerify } from "jose";
import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { keyContext } from "@/lib/builds/signing";
import { encrypt } from "@/lib/crypto/encryption";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_HOSTED_SETTINGS, type App, type HostedUser, type StoreBillingItem, type StoreProduct, type StorePurchaseRecord } from "@/lib/data/types";
import { REPLACED, runApiWebhooks } from "@/lib/hosted/api-webhooks";
import { jwksOf } from "@/lib/hosted/app-auth";
import { platformConnector, platformConnectorConfig, platformDefinition } from "@/lib/hosted/connectors/platforms";
import "@/lib/hosted/connectors/registry";
import { clearTeachableCache } from "@/lib/hosted/connectors/teachable";
import { clearThinkificCache } from "@/lib/hosted/connectors/thinkific";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { PLAN_INFO } from "@/lib/plans";
import { needsYallappSignIn, storeBillingSource } from "@/lib/store-billing/access";
import { grantId } from "@/lib/store-billing/delivery";
import { itemOf, parseItem, productIdTaken, reconcileListedItems, wantedFromItems } from "@/lib/store-billing/items";
import { runStorePurchases } from "@/lib/store-billing/jobs";
import { settlePurchase, submitPurchase, tokenKey } from "@/lib/store-billing/purchases";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

/**
 * 100.7 Apps on their own API, and Teachable or Thinkific schools, selling
 * in the app: the owner's list of what the app sells (products made as from
 * the plugin's catalog), the signed purchase notices to the client's API,
 * and enrolment through the schools' APIs, all against recorded answers.
 */

const PLATFORM = "https://yallapp.test";
const PLAY = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.ada.app";
const API = "https://api.academy.test/v1";
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const later = (ms: number) => new Date(NOW.getTime() + ms);

const SERVICE_ACCOUNT = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();

/** Google, as recorded answers: each purchase token's state, and the voided ones. */
function googleFake(purchases: Record<string, { product: string }>, voided: string[] = []) {
  const acks: string[] = [];
  const fetcher = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "ya29.token" });
    const read = /\/purchases\/productsv2\/tokens\/([^/]+)$/.exec(url);
    if (read) {
      const found = purchases[decodeURIComponent(read[1]!)];
      if (!found) return Response.json({ error: { code: 404 } }, { status: 404 });
      return Response.json({
        orderId: "GPA.3300-1111-2222-33333",
        purchaseStateContext: { purchaseState: "PURCHASED" },
        acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
        productLineItem: [{ productId: found.product, productOfferDetails: { quantity: 1, refundableQuantity: 1 } }],
      });
    }
    if (url.endsWith(":acknowledge") && init?.method === "POST") {
      acks.push(url);
      return Response.json({});
    }
    if (url.startsWith(`${PLAY}/purchases/voidedpurchases`))
      return Response.json({ voidedPurchases: voided.map((token) => ({ purchaseToken: token, orderId: "GPA.3300-1111-2222-33333", voidedTimeMillis: String(NOW.getTime()), voidedReason: 1 })) });
    return Response.json({ error: { code: 500, message: `no answer for ${url}` } }, { status: 500 });
  }) as typeof fetch;
  return { fetcher, acks };
}

/** The client's own API: answers each notice with the status `answer` gives for its event. */
function clientApi(answer: (event: string) => number) {
  const received: { event: string; delivery: string; body: string }[] = [];
  const fetcher = (async (input: string | URL, init?: RequestInit) => {
    expect(String(input)).toBe(`${API}/webhooks/yallapp`);
    const headers = new Headers(init?.headers);
    const event = headers.get("yallapp-event")!;
    received.push({ event, delivery: headers.get("yallapp-delivery")!, body: String(init?.body) });
    return new Response(null, { status: answer(event) });
  }) as typeof fetch;
  return { fetcher, received };
}

const synced = { status: "synced" as const, storeState: "ACTIVE", price: "450.00", error: null, at: later(1000).toISOString() };

/** Every product of the app made in both stores. */
async function inStores(store: MemoryStore, appId: string) {
  for (const product of await store.listStoreProducts(appId)) await store.saveStoreProduct({ ...product, google: synced, apple: synced } satisfies StoreProduct);
}

const listedItem = (appId: string, input: Parameters<typeof parseItem>[0]): StoreBillingItem => {
  const parsed = parseItem(input);
  if (!parsed.ok) throw new Error(parsed.message);
  return itemOf(appId, parsed.value, null, NOW, randomUUID);
};

async function academy(store: MemoryStore, patch: Partial<App>): Promise<App> {
  const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
  const base = newApp(client.id, null, NOW, "lms");
  const app: App = {
    ...base,
    appName: "Ada Academy",
    websiteDoneAt: NOW,
    androidPackage: "com.ada.app",
    iosBundleId: "com.ada.app",
    storeBilling: { enabled: true },
    googlePlayKeyEncrypted: encrypt(JSON.stringify({ client_email: "yallapp@ada.iam.gserviceaccount.com", private_key: SERVICE_ACCOUNT }), KEY, keyContext.googlePlay(base.id)),
    ...patch,
  };
  await store.createApp(app);
  return app;
}

async function student(store: MemoryStore, appId: string, phone = "+905321234567"): Promise<HostedUser> {
  return (await store.createHostedUser({ appId, phone, name: "Deniz Aksoy", email: null, city: null, now: NOW }))!;
}

/** A purchase made on iOS (no acknowledgement), as Yallapp keeps it. */
function iosPurchase(app: App, user: HostedUser, product: StoreProduct, patch: Partial<StorePurchaseRecord> = {}): StorePurchaseRecord {
  return {
    id: randomUUID(),
    appId: app.id,
    platform: "ios",
    storeKey: `2000000${Math.floor(Math.random() * 1e8)}`,
    purchaseToken: null,
    productId: product.productId,
    kind: product.kind,
    courseId: product.courseId,
    planId: product.planId,
    accountSource: "hosted",
    accountId: String(user.id),
    transactionId: "2000000999",
    status: "active",
    expiresAt: product.kind === "membership" ? later(30 * DAY) : null,
    acknowledged: true,
    delivered: false,
    reason: null,
    test: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}

describe("100.7 which academies sell in the app", () => {
  it("an app on its own API once Yallapp signs people in, and Teachable and Thinkific schools", async () => {
    const base = newApp("client-1", null, NOW, "lms");
    const ownApi = { ...base, backend: "custom_api" as const, apiBaseUrl: `${API}/` };
    expect(storeBillingSource(ownApi)).toBeNull();
    expect(needsYallappSignIn(ownApi)).toBe(true);
    expect(storeBillingSource({ ...ownApi, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, signInBy: "yallapp" } })).toBe("own_api");
    expect(needsYallappSignIn({ ...ownApi, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, signInBy: "yallapp" } })).toBe(false);
    const school = (platform: string) => ({ ...base, backend: "hosted" as const, connector: { kind: "platform" as const, platform, settings: {}, secretsEncrypted: "" } });
    expect(storeBillingSource(school("teachable"))).toBe("teachable");
    expect(storeBillingSource(school("thinkific"))).toBe("thinkific");
    expect(storeBillingSource(school("ikas"))).toBeNull();
    // Shops never: physical goods keep their payment pages.
    expect(storeBillingSource({ ...newApp("client-1", null, NOW, "store"), backend: "custom_api", apiBaseUrl: API, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, signInBy: "yallapp" } })).toBeNull();
    expect(needsYallappSignIn({ ...newApp("client-1", null, NOW, "store"), backend: "custom_api", apiBaseUrl: API })).toBe(false);
  });
});

describe("100.7 the owner's list of what the app sells", () => {
  const form = (patch: Partial<Parameters<typeof parseItem>[0]> = {}) => ({ kind: "course", itemId: "12", title: " Arabic  for beginners ", price: "450", currency: "try", period: "", courseIds: "", ...patch });

  it("checks each course and plan as the dashboard's forms send them", () => {
    expect(parseItem(form())).toEqual({ ok: true, value: { kind: "course", itemId: "12", title: "Arabic for beginners", price: "450.00", currency: "TRY", period: null, courseIds: [12] } });
    expect(parseItem(form({ kind: "membership", itemId: "gold", price: "99,9", period: "year", courseIds: "15, 12;12 20" }))).toEqual({
      ok: true,
      value: { kind: "membership", itemId: "gold", title: "Arabic for beginners", price: "99.90", currency: "TRY", period: "year", courseIds: [12, 15, 20] },
    });
    const refused = (patch: Partial<Parameters<typeof parseItem>[0]>) => {
      const result = parseItem(form(patch));
      return result.ok ? null : result.message;
    };
    expect(refused({ kind: "bundle" })).toBe("Choose a course or a membership plan.");
    expect(refused({ itemId: "abc" })).toBe("A course's ID is the whole number your system gives it, like 12.");
    expect(refused({ kind: "membership", itemId: "gold plan", period: "month", courseIds: "12" })).toMatch(/^A plan's ID is up to 64/);
    expect(refused({ title: "x" })).toBe("Enter a title of 2 to 200 characters.");
    expect(refused({ price: "0" })).toBe("Enter a price like 450 or 450.00.");
    expect(refused({ price: "4.505" })).toBe("Enter a price like 450 or 450.00.");
    expect(refused({ currency: "XYZ" })).toBe("Choose a currency.");
    expect(refused({ kind: "membership", itemId: "gold", period: "week", courseIds: "12" })).toBe("Choose monthly or yearly.");
    expect(refused({ kind: "membership", itemId: "gold", period: "month", courseIds: "" })).toMatch(/^List the IDs of the courses/);
  });

  it("keeps a plan's period on a change, and refuses two plans with one product ID", () => {
    const gold = listedItem("app-1", form({ kind: "membership", itemId: "Gold", period: "month", courseIds: "12" }));
    const changed = itemOf("app-1", { ...gold, title: "Gold+", period: "year" }, gold, later(MINUTE));
    expect(changed).toMatchObject({ id: gold.id, title: "Gold+", period: "month", createdAt: NOW, updatedAt: later(MINUTE) });
    expect(productIdTaken([gold], { kind: "membership", itemId: "gold" })).toBe(true);
    expect(productIdTaken([gold], { kind: "membership", itemId: "Gold" })).toBe(false);
    expect(productIdTaken([gold], { kind: "course", itemId: "12" })).toBe(false);
  });

  it("sells the school's priced courses, the owner's change of one, never a stopped one, and the owner's plans", () => {
    const items = [
      listedItem("app-1", form({ itemId: "1002", title: "Business English", price: "39.99", currency: "USD" })),
      { ...listedItem("app-1", form({ itemId: "1003", title: "Old course", currency: "USD" })), active: false },
      listedItem("app-1", form({ itemId: "1005", title: "Coaching club", price: "19", currency: "USD" })),
      // Sold again without a price of its own: the school's price counts.
      { ...listedItem("app-1", form({ itemId: "1001", currency: "USD" })), price: "0.00" },
      listedItem("app-1", form({ kind: "membership", itemId: "club", title: "Club", price: "29", currency: "USD", period: "month", courseIds: "1001, 1005" })),
    ];
    const school = [
      { id: 1001, title: "Turkish for Beginners", price: "450.00", currency: "usd" },
      { id: 1002, title: "Business English", price: "450.00", currency: "USD" },
      { id: 1003, title: "Old course", price: "10.00", currency: "USD" },
      { id: 1004, title: "Subscriptions only", price: null, currency: null },
    ];
    expect(wantedFromItems(items, school).map((p) => [p.productId, p.title, p.sitePrice, p.currency, p.courseIds])).toEqual([
      ["course_1001", "Turkish for Beginners", "450.00", "USD", [1001]],
      ["course_1002", "Business English", "39.99", "USD", [1002]],
      ["course_1005", "Coaching club", "19.00", "USD", [1005]],
      ["plan_club", "Club", "29.00", "USD", [1001, 1005]],
    ]);
  });
});

describe("100.7 an app on its own API: the signed purchase notices", () => {
  let store: MemoryStore;
  let app: App;
  let user: HostedUser;

  beforeEach(async () => {
    ({ store } = await setupClient({ plan: "growth" }));
    app = await academy(store, {
      backend: "custom_api",
      apiBaseUrl: `${API}/`,
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, signInBy: "yallapp", reviewPhone: "+90 532 000 00 01", reviewCode: "246810" },
    });
    await store.saveStoreBillingItem(listedItem(app.id, { kind: "course", itemId: "12", title: "Arabic for beginners", price: "450", currency: "TRY", period: "", courseIds: "" }));
    await store.saveStoreBillingItem(listedItem(app.id, { kind: "membership", itemId: "gold", title: "Gold", price: "99", currency: "TRY", period: "month", courseIds: "12, 15" }));
    await reconcileListedItems({ store }, app, NOW);
    await inStores(store, app.id);
    user = await student(store, app.id);
  });

  const deps = (google: ReturnType<typeof googleFake>, api: ReturnType<typeof clientApi>, now: Date) => ({
    store,
    key: KEY,
    now,
    fetcher: google.fetcher,
    api: { fetcher: api.fetcher, resolve: async () => ["203.0.113.10"], platformUrl: PLATFORM },
  });

  it("makes the listed courses and plans into store products, and stops (never deletes) what the owner stops", async () => {
    expect((await store.listStoreProducts(app.id)).map((p) => [p.productId, p.kind, p.courseId, p.planId, p.period, p.courseIds, p.sitePrice, p.active])).toEqual([
      ["course_12", "course", 12, null, null, [12], "450.00", true],
      ["plan_gold", "membership", null, "gold", "month", [12, 15], "99.00", true],
    ]);
    const gold = (await store.listStoreBillingItems(app.id)).find((i) => i.itemId === "gold")!;
    await store.saveStoreBillingItem({ ...gold, active: false, updatedAt: later(MINUTE) });
    await reconcileListedItems({ store }, app, later(MINUTE));
    expect((await store.listStoreProducts(app.id)).map((p) => [p.productId, p.active])).toEqual([
      ["course_12", true],
      ["plan_gold", false],
    ]);
  });

  it("tells the client's API of a purchase, signed, and acknowledges it with Google only once delivered", async () => {
    const google = googleFake({ "tok-1": { product: "course_12" } });
    let status = 503;
    const api = clientApi(() => status);
    const account = { source: "hosted" as const, id: String(user.id) };
    const send = (now: Date) => submitPurchase(deps(google, api, now), app, account, "android", { productId: "course_12", purchaseToken: "tok-1" });

    // The API isn't ready: the app hears store_unavailable, Google isn't told.
    expect(await send(later(1000))).toMatchObject({ ok: false, fail: { status: 503, body: { code: "store_unavailable" } } });
    expect(google.acks).toEqual([]);
    const kept = (await store.getStorePurchase(app.id, "android", tokenKey("tok-1")))!;
    expect(kept).toMatchObject({ status: "active", delivered: false, acknowledged: false });
    expect(api.received).toHaveLength(1);
    const first = api.received[0]!;
    expect(first).toMatchObject({ event: "purchase.completed", delivery: grantId(kept) });

    // Signed with the app's key, as the developer guide checks it.
    const keys = await store.listAppAuthKeys(app.id);
    expect(decodeProtectedHeader(first.body)).toMatchObject({ alg: "ES256", typ: "secevent+jwt", kid: keys[0]!.kid });
    const { payload } = await jwtVerify(first.body, createLocalJWKSet(jwksOf(keys, later(1000))), {
      issuer: PLATFORM,
      audience: `${app.id}:events`,
      algorithms: ["ES256"],
      typ: "secevent+jwt",
      currentDate: later(1000),
    });
    expect(payload).toMatchObject({ sub: String(user.id), jti: grantId(kept) });
    expect(payload.events).toEqual({
      "purchase.completed": {
        product_id: "course_12",
        kind: "course",
        item_id: "12",
        platform: "android",
        transaction_id: "GPA.3300-1111-2222-33333",
        expires_at: null,
        course_ids: [12],
        amount: "450.00",
        currency: "TRY",
        test: false,
      },
    });

    // The app sends it again too soon: the notice waits for its next try.
    expect(await send(later(30_000))).toMatchObject({ ok: false });
    expect(api.received).toHaveLength(1);
    // The job a few minutes later: the API takes it (the same jti), and only then Google hears of it.
    status = 202;
    expect(await runStorePurchases({ ...deps(google, api, later(3 * MINUTE)) })).toMatchObject({ delivered: 1, failed: 0 });
    expect(api.received.map((r) => r.delivery)).toEqual([grantId(kept), grantId(kept)]);
    expect(google.acks).toEqual([`${PLAY}/purchases/products/course_12/tokens/tok-1:acknowledge`]);
    expect(await store.getStorePurchase(app.id, "android", tokenKey("tok-1"))).toMatchObject({ delivered: true, acknowledged: true });
    expect(await store.getApiWebhook(grantId(kept))).toMatchObject({ status: "delivered", attempts: 2, event: "purchase.completed" });

    // Sent again by the app: the same grant, no new notice.
    expect(await send(later(4 * MINUTE))).toMatchObject({ ok: true, grant: { product_id: "course_12", status: "active" } });
    expect(api.received).toHaveLength(2);

    // Google refunds it: purchase.revoked, with its reason, under a new jti.
    const refunds = googleFake({}, ["tok-1"]);
    expect(await runStorePurchases({ ...deps(refunds, api, later(2 * 60 * MINUTE)) })).toMatchObject({ refunds: 1, delivered: 1 });
    const revoked = api.received[2]!;
    expect(revoked.event).toBe("purchase.revoked");
    expect(revoked.delivery).not.toBe(grantId(kept));
    const claims = JSON.parse(Buffer.from(revoked.body.split(".")[1]!, "base64url").toString("utf8")) as { events: Record<string, Record<string, unknown>> };
    expect(claims.events["purchase.revoked"]).toMatchObject({ product_id: "course_12", item_id: "12", reason: "refunded" });
    expect(await store.listApiWebhooks(app.id, 10, ["purchase.completed", "purchase.revoked"])).toHaveLength(2);
  });

  it("drops a notice that waits for another try once the purchase changed again", async () => {
    const google = googleFake({ "tok-2": { product: "course_12" } });
    const api = clientApi((event) => (event === "purchase.completed" ? 500 : 204));
    expect(await submitPurchase(deps(google, api, later(1000)), app, { source: "hosted", id: String(user.id) }, "android", { productId: "course_12", purchaseToken: "tok-2" })).toMatchObject({ ok: false });
    const completed = grantId((await store.getStorePurchase(app.id, "android", tokenKey("tok-2")))!);
    // Refunded before the API took the first notice: the refund is told, the purchase never.
    await runStorePurchases({ ...deps(googleFake({}, ["tok-2"]), api, later(30_000)) });
    expect(api.received.map((r) => r.event)).toEqual(["purchase.completed", "purchase.revoked"]);
    expect(await runApiWebhooks({ store, encryptionKey: KEY, platformUrl: PLATFORM, now: () => later(10 * MINUTE), fetcher: api.fetcher, resolve: async () => ["203.0.113.10"] })).toMatchObject({ tried: 1, failed: 1 });
    expect(await store.getApiWebhook(completed)).toMatchObject({ status: "failed", lastError: REPLACED, attempts: 2 });
    expect(api.received).toHaveLength(2);
  });

  it("tells nothing to an app that went back to its own sign-in", async () => {
    await store.updateApp(app.id, { hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, signInBy: "api" } }, NOW);
    const changed = (await store.getAppById(app.id))!;
    expect(storeBillingSource(changed)).toBeNull();
  });
});

// Teachable's Public API (v1), recorded: the school's courses, its plans, its students and their enrolments.

const TEACHABLE_COURSES = [
  { id: 1001, name: "Turkish for Beginners", is_published: true },
  { id: 1002, name: "Business English", is_published: true },
  { id: 1004, name: "Free Starter", is_published: true },
  { id: 1005, name: "Coaching club", is_published: true },
];
const TEACHABLE_PLANS = [
  { id: 3001, name: "Standard", price: 45000, currency: "usd", course_id: 1001, frequency: { type: "one_time" } },
  { id: 3002, name: "Premium", price: 60000, currency: "usd", course_id: 1002, frequency: { type: "one_time" } },
  { id: 3003, name: "Standard", price: 45000, currency: "usd", course_id: 1002, frequency: { type: "one_time" } },
  { id: 3004, name: "Free", price: 0, currency: "usd", course_id: 1004, frequency: { type: "free" } },
  { id: 3005, name: "Monthly", price: 1900, currency: "usd", course_id: 1005, frequency: { type: "subscription" } },
];

function teachableFake(options: { enrolled?: number[]; down?: boolean } = {}) {
  const calls: { method: string; path: string; body: Record<string, unknown> | null }[] = [];
  const enrolled = new Set(options.enrolled ?? []);
  const users: { id: number; email: string }[] = [];
  const fetcher = (async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    expect(url.origin).toBe("https://developers.teachable.com");
    expect(new Headers(init?.headers).get("apiKey")).toBe("tk_live_rose");
    const method = init?.method ?? "GET";
    const path = url.pathname.replace(/^\/v1/, "");
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    calls.push({ method, path, body });
    if (options.down) return new Response("", { status: 502 });
    if (method === "GET" && path === "/courses") return Response.json({ courses: TEACHABLE_COURSES, meta: { number_of_pages: 1 } });
    const detail = /^\/courses\/(\d+)$/.exec(path);
    if (method === "GET" && detail) {
      const course = TEACHABLE_COURSES.find((c) => c.id === Number(detail[1]));
      return course ? Response.json({ course: { ...course, lecture_sections: [], author_bio: null } }) : Response.json({}, { status: 404 });
    }
    if (method === "GET" && path === "/pricing_plans") return Response.json({ pricing_plans: TEACHABLE_PLANS, meta: { number_of_pages: 1 } });
    if (method === "GET" && path === "/users") return Response.json({ users: users.filter((u) => u.email === url.searchParams.get("email")) });
    if (method === "POST" && path === "/users") {
      users.push({ id: 77, email: String(body!.email) });
      return Response.json({ id: 77, email: body!.email });
    }
    if (method === "GET" && path === "/users/77") {
      return Response.json({ id: 77, email: users[0]?.email, courses: [...enrolled].map((id) => ({ course_id: id, enrolled_at: NOW.toISOString(), is_active_enrollment: true, percent_complete: 0 })) });
    }
    if (method === "POST" && path === "/enroll") {
      if (enrolled.has(Number(body!.course_id))) return Response.json({ message: "Already enrolled" }, { status: 422 });
      enrolled.add(Number(body!.course_id));
      return Response.json({});
    }
    if (method === "POST" && path === "/unenroll") {
      if (!enrolled.delete(Number(body!.course_id))) return Response.json({ message: "Not enrolled" }, { status: 404 });
      return Response.json({});
    }
    return Response.json({ error: `no answer for ${method} ${path}` }, { status: 500 });
  }) as typeof fetch;
  return { fetcher, calls, enrolled };
}

describe("100.7 a Teachable school", () => {
  let store: MemoryStore;
  let app: App;

  beforeEach(async () => {
    clearTeachableCache();
    ({ store } = await setupClient({ plan: "growth" }));
    const id = randomUUID();
    app = await academy(store, {
      id,
      backend: "hosted",
      connector: platformConnectorConfig(id, platformDefinition("teachable")!, { school: "rose-academy.teachable.com", apiKey: "tk_live_rose" }, KEY),
    });
  });

  it("reads the paid courses at their cheapest one-time price; a course sold only by subscription has none", async () => {
    const school = teachableFake();
    expect(await platformConnector(app, KEY, { store }, school.fetcher)!.storeCourses!()).toEqual([
      { id: 1005, title: "Coaching club", price: null, currency: null },
      { id: 1002, title: "Business English", price: "450.00", currency: "USD" },
      { id: 1001, title: "Turkish for Beginners", price: "450.00", currency: "USD" },
    ]);
  });

  it("makes products of the school's courses and the owner's list, and changes nothing when the school can't be read", async () => {
    const school = teachableFake();
    await store.saveStoreBillingItem(listedItem(app.id, { kind: "course", itemId: "1005", title: "Coaching club", price: "19", currency: "USD", period: "", courseIds: "" }));
    await store.saveStoreBillingItem(listedItem(app.id, { kind: "membership", itemId: "club", title: "Club", price: "29", currency: "USD", period: "month", courseIds: "1001, 1005" }));
    await reconcileListedItems({ store, key: KEY, platformFetch: school.fetcher }, app, NOW);
    const products = () => store.listStoreProducts(app.id).then((list) => list.map((p) => [p.productId, p.sitePrice, p.currency, p.active]));
    expect(await products()).toEqual([
      ["course_1002", "450.00", "USD", true],
      ["course_1005", "19.00", "USD", true],
      ["course_1001", "450.00", "USD", true],
      ["plan_club", "29.00", "USD", true],
    ]);
    clearTeachableCache();
    await reconcileListedItems({ store, key: KEY, platformFetch: teachableFake({ down: true }).fetcher }, app, later(MINUTE));
    expect((await products()).every((p) => p[3] === true)).toBe(true);
  });

  it("enrols the buyer through Teachable's API, leaves a course bought on the website, and takes back only what it gave", async () => {
    const school = teachableFake({ enrolled: [1001] });
    await store.saveStoreBillingItem(listedItem(app.id, { kind: "membership", itemId: "club", title: "Club", price: "29", currency: "USD", period: "month", courseIds: "1001, 1005" }));
    await reconcileListedItems({ store, key: KEY, platformFetch: school.fetcher }, app, NOW);
    const club = (await store.getStoreProduct(app.id, "plan_club"))!;
    const user = await student(store, app.id);
    const bought = await store.createStorePurchase(iosPurchase(app, user, club));
    const deps = { store, key: KEY, now: later(MINUTE), api: { fetcher: school.fetcher } };
    const given = await settlePurchase(deps, app, bought);
    expect(given.ok).toBe(true);
    expect(given.purchase).toMatchObject({ delivered: true, grantedCourseIds: [1005] });
    // The student is the one the app shows courses to: the stable address of a phone account.
    expect(school.calls.find((c) => c.method === "POST" && c.path === "/users")?.body).toMatchObject({ email: `u${user.id}.${app.id.slice(0, 8).toLowerCase()}@students.yallapp.com.tr` });
    expect(school.calls.filter((c) => c.path === "/enroll").map((c) => c.body)).toEqual([{ user_id: 77, course_id: 1005 }]);
    expect([...school.enrolled].sort()).toEqual([1001, 1005]);

    // The membership ends: only the course Yallapp gave goes.
    const ended = await settlePurchase({ ...deps, now: later(31 * DAY) }, app, { ...given.purchase, status: "expired", reason: "expired", delivered: false });
    expect(ended.purchase).toMatchObject({ delivered: true, grantedCourseIds: [] });
    expect(school.calls.filter((c) => c.path === "/unenroll").map((c) => c.body)).toEqual([{ user_id: 77, course_id: 1005 }]);
    expect([...school.enrolled]).toEqual([1001]);
  });

  it("keeps a purchase waiting when Teachable can't be reached", async () => {
    const school = teachableFake();
    await reconcileListedItems({ store, key: KEY, platformFetch: school.fetcher }, app, NOW);
    const course = (await store.getStoreProduct(app.id, "course_1001"))!;
    const user = await student(store, app.id);
    const bought = await store.createStorePurchase(iosPurchase(app, user, course));
    const settled = await settlePurchase({ store, key: KEY, now: later(MINUTE), api: { fetcher: teachableFake({ down: true }).fetcher } }, app, bought);
    expect(settled).toMatchObject({ ok: false, purchase: { delivered: false } });
  });

  it("offers a course on its page through the store, and a course only a plan opens through the plan", async () => {
    const school = teachableFake();
    await store.saveStoreBillingItem(listedItem(app.id, { kind: "membership", itemId: "club", title: "Club", price: "29", currency: "USD", period: "month", courseIds: "1005" }));
    await reconcileListedItems({ store, key: KEY, platformFetch: school.fetcher }, app, NOW);
    await inStores(store, app.id);
    const context = (): HostedContext => ({
      store,
      app,
      active: true,
      plan: PLAN_INFO.growth,
      now: later(MINUTE),
      ip: "203.0.113.9",
      secret: "test-hosted-secret",
      sender: new LogSender(),
      push: false,
      assetUrl: (id) => `${PLATFORM}/api/v1/assets/${id}`,
      platformUrl: PLATFORM,
      connector: platformConnector(app, KEY, { store }, school.fetcher),
      billing: { key: KEY },
    });
    const get = async (path: string, platform = "ios") => {
      const result = await handleHosted(context(), { method: "GET", path: path.split("/").filter(Boolean), query: new URLSearchParams({ platform }), body: null, token: null });
      return result;
    };
    const course = await get("/courses/1001");
    expectContract("GET", "/courses/{course_id}", course);
    expect(course.body).toMatchObject({ purchase: { action: "store", store_product_id: "course_1001" } });
    const planOnly = await get("/courses/1005", "android");
    expectContract("GET", "/courses/{course_id}", planOnly);
    expect(planOnly.body).toMatchObject({ purchase: { action: "none" }, membership: { has_access: false, plans: ["Club"], store_product_ids: ["plan_club"] } });
    const config = await handleHosted(context(), { method: "GET", path: ["config"], query: new URLSearchParams({ platform: "ios", app_version: "1.0.0" }), body: null, token: null });
    expect((config.body as { store_billing?: unknown }).store_billing).toEqual({ base_url: `${PLATFORM}/api/app/${app.id}`, session: "access_token", terms_url: null });
    // Turned off: the page is the school's again.
    app = { ...app, storeBilling: { enabled: false } };
    expect((await get("/courses/1001")).body).toMatchObject({ purchase: { action: "none" } });
  });
});

// Thinkific's Admin REST API (api/public/v1), recorded.

const THINKIFIC_PRODUCTS = [
  { id: 1, productable_id: 10, productable_type: "Course", name: "Turkish for Beginners", status: "published", hidden: false, private: false, position: 1, product_prices: [{ id: 11, is_primary: true, payment_type: "one-time", price: "49.0", currency: "usd" }] },
  { id: 2, productable_id: 20, productable_type: "Course", name: "Business English", status: "published", hidden: false, private: false, position: 2, product_prices: [{ id: 21, is_primary: true, payment_type: "subscription", price: "19.0", currency: "usd", interval: "month" }] },
  { id: 3, productable_id: 30, productable_type: "Course", name: "Free Starter", status: "published", hidden: false, private: false, position: 3, product_prices: [{ id: 31, is_primary: true, payment_type: "free", price: "0.0", currency: "usd" }] },
];
const THINKIFIC_COURSES = [
  { id: 10, name: "Turkish for Beginners", product_id: 1, chapter_ids: [] },
  { id: 20, name: "Business English", product_id: 2, chapter_ids: [] },
  { id: 30, name: "Free Starter", product_id: 3, chapter_ids: [] },
];

interface ThinkificEnrollmentRow {
  id: number;
  course_id: number;
  user_id: number;
  expired: boolean;
  activated_at: string | null;
  expiry_date: string | null;
}

function thinkificFake(options: { student?: boolean; enrollments?: Omit<ThinkificEnrollmentRow, "id" | "user_id">[] } = {}) {
  const calls: { method: string; path: string; body: Record<string, unknown> | null }[] = [];
  const users: { id: number; email: string; external_id: string | null }[] = [];
  const enrollments: ThinkificEnrollmentRow[] = (options.enrollments ?? []).map((e, i) => ({ ...e, id: 900 + i, user_id: 501 }));
  let nextId = 950;
  const page = (items: unknown[]) => Response.json({ items, meta: { pagination: { current_page: 1, next_page: null, total_pages: 1 } } });
  const fetcher = (async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer thinkific-token");
    const method = init?.method ?? "GET";
    const path = url.pathname.replace(/^\/api\/public\/v1/, "");
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    calls.push({ method, path, body });
    if (method === "GET" && path === "/products") return page(THINKIFIC_PRODUCTS);
    if (method === "GET" && path === "/courses") return page(THINKIFIC_COURSES);
    const byExternal = /^\/users\/(yallapp-[^/]+)$/.exec(path);
    if (method === "GET" && byExternal) {
      const found = users.find((u) => u.external_id === decodeURIComponent(byExternal[1]!));
      return found ? Response.json({ id: found.id, email: found.email }) : Response.json({ error: "Not found" }, { status: 404 });
    }
    if (method === "GET" && path === "/users") return page(users.filter((u) => u.email === url.searchParams.get("query[email]")).map((u) => ({ id: u.id, email: u.email })));
    if (method === "POST" && path === "/users") {
      users.push({ id: 501, email: String(body!.email), external_id: (body!.external_id as string) ?? null });
      return Response.json({ id: 501, email: body!.email });
    }
    if (method === "GET" && path === "/enrollments") return page(enrollments.filter((e) => String(e.user_id) === url.searchParams.get("query[user_id]")));
    if (method === "POST" && path === "/enrollments") {
      const row = { id: nextId++, course_id: Number(body!.course_id), user_id: Number(body!.user_id), expired: false, activated_at: String(body!.activated_at), expiry_date: (body!.expiry_date as string | null) ?? null };
      enrollments.push(row);
      return Response.json(row, { status: 201 });
    }
    const update = /^\/enrollments\/(\d+)$/.exec(path);
    if (method === "PUT" && update) {
      const row = enrollments.find((e) => e.id === Number(update[1]))!;
      if ("activated_at" in body!) row.activated_at = body!.activated_at as string;
      row.expiry_date = (body!.expiry_date as string | null) ?? null;
      // Ending it now (only expiry_date sent) expires it; a later end keeps it.
      row.expired = !("activated_at" in body!) && row.expiry_date !== null;
      return new Response(null, { status: 204 });
    }
    return Response.json({ error: `no answer for ${method} ${path}` }, { status: 500 });
  }) as typeof fetch;
  return { fetcher, calls, enrollments, users };
}

describe("100.7 a Thinkific school", () => {
  let store: MemoryStore;
  let app: App;

  beforeEach(async () => {
    clearThinkificCache();
    ({ store } = await setupClient({ plan: "growth" }));
    const id = randomUUID();
    app = await academy(store, {
      id,
      backend: "hosted",
      connector: platformConnectorConfig(id, platformDefinition("thinkific")!, { subdomain: "lale", accessToken: "thinkific-token", ssoSecret: "" }, KEY),
    });
  });

  it("reads the listed paid courses at their one-time price", async () => {
    expect(await platformConnector(app, KEY, { store }, thinkificFake().fetcher)!.storeCourses!()).toEqual([
      { id: 10, title: "Turkish for Beginners", price: "49.00", currency: "USD" },
      { id: 20, title: "Business English", price: null, currency: null },
    ]);
  });

  it("enrols until a day after the paid period, moves it on a renewal, and ends only what it gave; a course another purchase opens stays", async () => {
    const school = thinkificFake();
    await store.saveStoreBillingItem(listedItem(app.id, { kind: "membership", itemId: "all", title: "All courses", price: "29", currency: "USD", period: "month", courseIds: "10, 20" }));
    await reconcileListedItems({ store, key: KEY, platformFetch: school.fetcher }, app, NOW);
    const course = (await store.getStoreProduct(app.id, "course_10"))!;
    const plan = (await store.getStoreProduct(app.id, "plan_all"))!;
    const user = await student(store, app.id);
    const deps = { store, key: KEY, now: later(MINUTE), api: { fetcher: school.fetcher } };

    // A course first: no end date.
    const one = await settlePurchase(deps, app, await store.createStorePurchase(iosPurchase(app, user, course)));
    expect(one.purchase).toMatchObject({ delivered: true, grantedCourseIds: [10] });
    expect(school.calls.find((c) => c.method === "POST" && c.path === "/enrollments")?.body).toEqual({ course_id: 10, user_id: 501, activated_at: later(MINUTE).toISOString(), expiry_date: null });

    // Then the membership: course 10 is there already (the course purchase's), 20 is given until a day after the period.
    const membership = await store.createStorePurchase(iosPurchase(app, user, plan, { expiresAt: later(30 * DAY) }));
    const given = await settlePurchase(deps, app, membership);
    expect(given.purchase.grantedCourseIds).toEqual([20]);
    const row20 = () => school.enrollments.find((e) => e.course_id === 20)!;
    expect(row20().expiry_date).toBe(later(31 * DAY).toISOString());

    // Renewed: its end moves on.
    const renewed = await settlePurchase(deps, app, { ...given.purchase, expiresAt: later(60 * DAY), delivered: false });
    expect(renewed.purchase.grantedCourseIds).toEqual([20]);
    expect(row20().expiry_date).toBe(later(61 * DAY).toISOString());

    // The course purchase is refunded: course 10 stays (the membership opens it) and becomes the membership's.
    const refunded = await settlePurchase(deps, app, { ...one.purchase, status: "revoked", reason: "refunded", delivered: false });
    expect(refunded.purchase).toMatchObject({ delivered: true, grantedCourseIds: [] });
    expect(school.calls.filter((c) => c.method === "PUT" && c.path === `/enrollments/${school.enrollments.find((e) => e.course_id === 10)!.id}`)).toEqual([]);
    expect((await store.getStorePurchase(app.id, "ios", membership.storeKey))?.grantedCourseIds).toEqual([10, 20]);

    // The membership ends: both end now.
    const current = (await store.getStorePurchase(app.id, "ios", membership.storeKey))!;
    await settlePurchase({ ...deps, now: later(62 * DAY) }, app, { ...current, status: "expired", reason: "expired", delivered: false });
    const ends = school.calls.filter((c) => c.method === "PUT" && c.body && Object.keys(c.body).join() === "expiry_date").map((c) => [c.path, c.body!.expiry_date]);
    expect(ends).toEqual([
      [`/enrollments/${school.enrollments.find((e) => e.course_id === 10)!.id}`, later(62 * DAY).toISOString()],
      [`/enrollments/${school.enrollments.find((e) => e.course_id === 20)!.id}`, later(62 * DAY).toISOString()],
    ]);
  });

  it("leaves a course the student bought on the school's website", async () => {
    const school = thinkificFake({ enrollments: [{ course_id: 10, expired: false, activated_at: "2026-01-01T00:00:00Z", expiry_date: null }] });
    const user = await student(store, app.id);
    // The student exists on Thinkific already (by the app's external ID).
    school.users.push({ id: 501, email: `u${user.id}.${app.id.slice(0, 8)}@students.yallapp.com.tr`, external_id: `yallapp-${app.id.slice(0, 8)}-${user.id}` });
    await reconcileListedItems({ store, key: KEY, platformFetch: school.fetcher }, app, NOW);
    const course = (await store.getStoreProduct(app.id, "course_10"))!;
    const given = await settlePurchase({ store, key: KEY, now: later(MINUTE), api: { fetcher: school.fetcher } }, app, await store.createStorePurchase(iosPurchase(app, user, course)));
    expect(given.purchase).toMatchObject({ delivered: true, grantedCourseIds: [] });
    await settlePurchase({ store, key: KEY, now: later(2 * MINUTE), api: { fetcher: school.fetcher } }, app, { ...given.purchase, status: "revoked", reason: "refunded", delivered: false });
    expect(school.calls.filter((c) => c.method !== "GET")).toEqual([]);
  });
});
