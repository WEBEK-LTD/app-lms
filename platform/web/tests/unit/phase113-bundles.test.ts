import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { deliverPaidOrder } from "@/lib/catalog/payment";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import { bundlePageItems } from "@/lib/courses/bundle-items";
import { bundleCourses, deleteBundle, parseBundle, saveBundle, shownBundles, splitBundle } from "@/lib/courses/bundles";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogOrder, type CourseSetup, type StorePurchaseRecord } from "@/lib/data/types";
import { CoursesConnector } from "@/lib/hosted/connectors/courses";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { itemSourcesFor } from "@/lib/pages/sources";
import { orderRevocable } from "@/lib/refunds/service";
import { deliverPurchase } from "@/lib/store-billing/delivery";
import { reconcileProducts, wantedFromCourses } from "@/lib/store-billing/products";
import { salesByCourse, statements } from "@/lib/teachers/earnings";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

/**
 * 113.1 Course bundles (several courses at the owner's price) and coupons
 * that make a course or a bundle free: the bundle's page and its purchase on
 * the hosted API, its order enrolling every course, refunds, the teachers'
 * shares, the stores' products and the pages' lists.
 */

const course = (id: number, title: string, priceCents: number, extra: Partial<CourseSetup["courses"][number]> = {}): CourseSetup["courses"][number] => ({
  id,
  title,
  description: "",
  imageAssetId: null,
  priceCents,
  categoryIds: [],
  instructorName: null,
  level: null,
  active: true,
  createdAt: "2026-10-01T10:00:00.000Z",
  topics: [{ id: id + 1, title: "Start", lessons: [{ id: id + 2, title: "Welcome", videoUrl: null, text: "Hello", durationMinutes: 5, preview: false }] }],
  ...extra,
});

/** Three paid courses (300, 200, 100 EGP) and a bundle of all three at 450. */
function academy(): CourseSetup {
  return {
    currency: "EGP",
    categories: [],
    courses: [course(10, "Grammar", 300_00, { teacherId: 7 }), course(20, "Speaking", 200_00, { teacherId: 8 }), course(30, "Writing", 100_00), course(40, "Draft", 50_00, { active: false, teacherStage: "draft" })],
    bundles: [
      { id: 50, title: "The whole language", description: "Everything at once.", imageAssetId: null, courseIds: [10, 20, 30], priceCents: 450_00, active: true, createdAt: "2026-10-02T10:00:00.000Z" },
      { id: 51, title: "Hidden pair", description: "", imageAssetId: null, courseIds: [10, 20], priceCents: 400_00, active: false, createdAt: "2026-10-02T10:00:00.000Z" },
    ],
    nextId: 60,
  };
}

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };

/** A hosted academy and a student who signs up, with calls checked against the contract. */
async function hostedAcademy(setup: () => CourseSetup, options: { patch?: Partial<App> } = {}) {
  const { store } = await setupClient();
  const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
  const app: App = { ...newApp(client.id, null, NOW, "lms"), backend: "hosted", appName: "Lale Academy", websiteDoneAt: NOW, connector: { kind: "courses" }, courseSetup: setup(), ...options.patch };
  await store.createApp(app);
  const sender = new LogSender();
  const state = { now: NOW, app };
  const context = (): HostedContext => ({
    store,
    app: state.app,
    active: true,
    now: state.now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    connector: new CoursesConnector({ store, app: state.app, assetUrl: (id) => id, platformUrl: "https://yallapp.test" }),
  });
  async function call(method: string, route: string, options: { body?: unknown; token?: string | null; params?: string[]; query?: Record<string, string> } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null });
    expectContract(method, route, result);
    return result;
  }
  async function signUp(phone = "5321234567", name = "Deniz Aksoy") {
    state.now = new Date(state.now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+90${phone}`)!, device: DEVICE } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: DEVICE } });
    return registered.body as { access_token: string; refresh_token: string; user: { id: number } };
  }
  return { store, state, call, signUp };
}

const paid = { patch: { catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "EGP" as const, payment: encryptPaymentKeys("app", "sandbox-api", "sandbox-secret", true, KEY) } } };
const android = { platform: "android" };

describe("113.1 bundles' helpers", () => {
  it("reads the Bundles page's form: a title, two courses or more of the academy's, the owner's price", () => {
    const setup = academy();
    expect(parseBundle({ title: "Pair", price: "350", active: "on" }, [10, 20, 20, 99], setup)).toEqual({ ok: true, value: { title: "Pair", description: "", courseIds: [10, 20], priceCents: 350_00, active: true } });
    // A teacher's draft isn't the academy's to sell; one course isn't a bundle; the price is the owner's to enter.
    expect(parseBundle({ title: "Pair", price: "350" }, [10, 40], setup)).toMatchObject({ ok: false, errors: { courseIds: "Choose at least two courses." } });
    expect(parseBundle({ title: "Pair", price: "" }, [10, 20], setup)).toMatchObject({ ok: false, errors: { price: "Enter the bundle's price, like 900." } });
    expect(parseBundle({ title: "Pair", price: "0" }, [10, 20], setup)).toMatchObject({ ok: false, errors: { price: expect.any(String) } });
    const added = saveBundle(setup, null, { title: "Pair", description: "", courseIds: [10, 30], priceCents: 350_00, active: true, imageAssetId: null }, NOW)!;
    expect(added.bundle.id).toBe(60);
    expect(added.setup.nextId).toBe(61);
    expect(saveBundle(added.setup, 60, { ...added.bundle, priceCents: 360_00 }, NOW)!.bundle.priceCents).toBe(360_00);
    expect(saveBundle(setup, 999, added.bundle, NOW)).toBeNull();
    expect(deleteBundle(added.setup, 60).bundles!.map((b) => b.id)).toEqual([50, 51]);
  });

  it("shows published bundles with two published courses, and only their published courses", () => {
    const setup = academy();
    expect(shownBundles(setup).map((b) => b.id)).toEqual([50]);
    setup.courses[1]!.active = false;
    setup.courses[2]!.active = false;
    expect(bundleCourses(setup, setup.bundles![0]!).map((c) => c.id)).toEqual([10]);
    expect(shownBundles(setup)).toEqual([]);
  });

  it("splits a bundle's part over its courses by each course's own price, to the cent", () => {
    const courses = [
      { courseId: 10, priceCents: 300_00 },
      { courseId: 20, priceCents: 200_00 },
      { courseId: 30, priceCents: 100_00 },
    ];
    expect(Object.fromEntries(splitBundle(450_00, courses))).toEqual({ 10: 225_00, 20: 150_00, 30: 75_00 });
    const odd = splitBundle(100, courses);
    expect([...odd.values()].reduce((a, b) => a + b, 0)).toBe(100);
    // Courses free on their own: equal parts.
    expect(Object.fromEntries(splitBundle(301, [{ courseId: 1, priceCents: 0 }, { courseId: 2, priceCents: 0 }, { courseId: 3, priceCents: 0 }]))).toEqual({ 1: 101, 2: 100, 3: 100 });
  });

  it("gives each teacher their course's part of a bundle sold, after the coupon and refunds", () => {
    const setup = academy();
    const line = { productId: 50, name: "The whole language", quantity: 1, unitCents: 450_00, imageAssetId: null, digital: true, bundle: { courses: [10, 20, 30].map((id) => ({ courseId: id, title: "", priceCents: setup.courses.find((c) => c.id === id)!.priceCents, owned: false })) } };
    // 450.00 with 90.00 off, then 60.00 of it refunded.
    const orders = [{ lines: [line], subtotalCents: 450_00, totalCents: 360_00, refundedCents: 60_00 } as CatalogOrder];
    const sales = salesByCourse(orders, setup);
    expect(sales.get(10)).toMatchObject({ sales: 1, salesCents: 180_00, refundsCents: 30_00 });
    expect(sales.get(20)).toMatchObject({ sales: 1, salesCents: 120_00, refundsCents: 20_00 });
    expect(sales.get(30)).toMatchObject({ sales: 1, salesCents: 60_00, refundsCents: 10_00 });
    const [grammar, speaking] = statements([{ id: 7, shareBp: 5000 } as never, { id: 8, shareBp: 7000 } as never], setup, orders);
    expect(grammar).toMatchObject({ salesCents: 180_00, earnedCents: 75_00 });
    expect(speaking).toMatchObject({ salesCents: 120_00, earnedCents: 70_00 });
  });

  it("makes each shown bundle a one-time store product with its courses", () => {
    const wanted = wantedFromCourses(academy());
    expect(wanted.find((w) => w.productId === "bundle_50")).toEqual({
      productId: "bundle_50",
      kind: "bundle",
      courseId: null,
      planId: "50",
      title: "The whole language",
      period: null,
      courseIds: [10, 20, 30],
      currency: "EGP",
      sitePrice: "450.00",
    });
    expect(wanted.some((w) => w.productId === "bundle_51")).toBe(false);
    expect(reconcileProducts("app", [], wanted, NOW, () => "id").find((p) => p.productId === "bundle_50")).toMatchObject({ kind: "bundle", active: true, ownPrice: null });
  });
});

describe("113.1 bundles on the hosted API", () => {
  it("lists bundles with the courses' total, opens one, and shows them on each course's page", async () => {
    const h = await hostedAcademy(academy, paid);
    const config = await h.call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } });
    expect(config.body).toMatchObject({ features: { bundles: true } });
    const { access_token: token } = await h.signUp();
    const list = await h.call("GET", "/bundles", { token });
    expect(list.body).toEqual({
      items: [
        {
          id: 50,
          title: "The whole language",
          image_url: null,
          course_count: 3,
          price: expect.objectContaining({ is_free: false, amount: "450.00" }),
          compare_at: expect.objectContaining({ amount: "600.00" }),
          owned_count: 0,
          owned: false,
        },
      ],
    });
    const detail = await h.call("GET", "/bundles/{bundle_id}", { params: ["50"], token, query: android });
    expect(detail.body).toMatchObject({ id: 50, description_html: expect.stringContaining("Everything at once."), courses: [{ id: 10 }, { id: 20 }, { id: 30 }], purchase: { action: "checkout", store_product_id: null, coupons: false } });
    // iPhone: no payment page (Apple's rule for digital content).
    expect((await h.call("GET", "/bundles/{bundle_id}", { params: ["50"], token, query: { platform: "ios" } })).body).toMatchObject({ purchase: { action: "none" } });
    expect((await h.call("GET", "/bundles/{bundle_id}", { params: ["51"], token, query: android })).status).toBe(404);
    expect((await h.call("GET", "/courses/{course_id}", { params: ["20"], token, query: android })).body).toMatchObject({ bundles: [{ id: 50, course_count: 3 }] });
  });

  it("sells a bundle on the payment page: paying enrols every course, one the student had stays theirs on a refund", async () => {
    const h = await hostedAcademy(academy, paid);
    const { access_token: token, user } = await h.signUp();
    // They already have Writing.
    await h.store.enrollInCourse({ appId: h.state.app.id, userId: user.id, courseId: 30, source: "manual", enrolledAt: NOW });
    const link = await h.call("POST", "/auth/checkout-link", { token, query: android, body: { bundle_id: 50 } });
    expect(link.status).toBe(200);
    expect(link.body).not.toHaveProperty("enrolled");
    const order = (await h.store.listCatalogOrders({ appId: h.state.app.id, userId: user.id, offset: 0, limit: 5 })).items[0]!;
    expect(order).toMatchObject({ status: "pending", subtotalCents: 450_00, totalCents: 450_00 });
    expect(order.lines[0]).toMatchObject({ productId: 50, unitCents: 450_00, bundle: { courses: [{ courseId: 10, priceCents: 300_00, owned: false }, { courseId: 20, owned: false }, { courseId: 30, owned: true }] } });
    await h.store.payCatalogOrder(h.state.app.id, order.id, "pay-1", NOW);
    await deliverPaidOrder(h.store, h.state.app, order, NOW);
    const enrolled = await h.store.listCourseEnrollments({ appId: h.state.app.id, userId: user.id });
    expect(Object.fromEntries(enrolled.map((e) => [e.courseId, e.source]))).toEqual({ 10: "paid", 20: "paid", 30: "manual" });
    expect((await h.store.getCatalogOrder(h.state.app.id, order.id))!.status).toBe("completed");
    // A refund takes back what the bundle gave, never Writing.
    expect((await orderRevocable(h.store, h.state.app, order)).courses.map((c) => c.id)).toEqual([10, 20]);
    // In My courses, and the bundle is theirs now.
    expect(((await h.call("GET", "/me/courses", { token })).body as { total: number }).total).toBe(3);
    expect((await h.call("GET", "/bundles/{bundle_id}", { params: ["50"], token, query: android })).body).toMatchObject({ owned: true, owned_count: 3, purchase: { action: "owned" } });
    expect((await h.call("POST", "/auth/checkout-link", { token, query: android, body: { bundle_id: 50 } })).status).toBe(403);
  });

  it("enrols at once with a coupon that takes the whole price, for a course and for a bundle", async () => {
    const h = await hostedAcademy(academy, paid);
    await h.store.createCatalogCoupon({ appId: h.state.app.id, code: "FREE", kind: "percent", value: 100, minOrderCents: null, endsAt: null, maxUses: 2, active: true, createdAt: NOW });
    await h.store.createCatalogCoupon({ appId: h.state.app.id, code: "HALF", kind: "percent", value: 50, minOrderCents: null, endsAt: null, maxUses: null, active: true, createdAt: NOW });
    const { access_token: token, user } = await h.signUp();
    expect((await h.call("POST", "/courses/{course_id}/coupon", { params: ["10"], token, body: { code: "free" } })).body).toMatchObject({ status: "applied", free: true, total: expect.stringContaining("0.00") });
    expect((await h.call("POST", "/bundles/{bundle_id}/coupon", { params: ["50"], token, body: { code: "HALF" } })).body).toMatchObject({ status: "applied", free: false, total: expect.stringContaining("225") });
    const course = await h.call("POST", "/auth/checkout-link", { token, query: android, body: { course_id: 10, coupon: "FREE" } });
    expect(course.body).toMatchObject({ enrolled: true, course_ids: [10] });
    const bundle = await h.call("POST", "/auth/checkout-link", { token, query: android, body: { bundle_id: 50, coupon: "FREE" } });
    expect(bundle.body).toMatchObject({ enrolled: true, course_ids: [10, 20, 30] });
    const enrolled = await h.store.listCourseEnrollments({ appId: h.state.app.id, userId: user.id });
    expect(enrolled.map((e) => e.courseId).sort()).toEqual([10, 20, 30]);
    // Two orders paid at 0 and completed; the coupon used twice, so it's used up.
    const { items } = await h.store.listCatalogOrders({ appId: h.state.app.id, userId: user.id, offset: 0, limit: 5 });
    expect(items.map((o) => [o.status, o.totalCents, o.discountCents])).toEqual([
      ["completed", 0, 450_00],
      ["completed", 0, 300_00],
    ]);
    expect(items[0]!.paidAt).not.toBeNull();
    expect((await h.store.getCatalogCouponByCode(h.state.app.id, "FREE"))!.usedCount).toBe(2);
  });
});

describe("113.1 bundles in the stores and on pages", () => {
  const purchase = (status: StorePurchaseRecord["status"], userId: number, granted?: number[]): StorePurchaseRecord => ({
    id: "p-1",
    appId: "",
    platform: "android",
    storeKey: "k",
    purchaseToken: "tok",
    productId: "bundle_50",
    kind: "bundle",
    courseId: null,
    planId: "50",
    accountSource: "hosted",
    accountId: String(userId),
    transactionId: "GPA.1",
    status,
    expiresAt: null,
    acknowledged: false,
    delivered: false,
    reason: status === "revoked" ? "refunded" : null,
    test: true,
    ...(granted ? { grantedCourseIds: granted } : {}),
    createdAt: NOW,
    updatedAt: NOW,
  });

  it("enrols a store purchase of a bundle in its courses, and a refund takes back only those it gave", async () => {
    const h = await hostedAcademy(academy, paid);
    const { user } = await h.signUp();
    const app = h.state.app;
    for (const product of reconcileProducts(app.id, [], wantedFromCourses(app.courseSetup), NOW, () => "prod-50")) if (product.kind === "bundle") await h.store.saveStoreProduct(product);
    await h.store.enrollInCourse({ appId: app.id, userId: user.id, courseId: 20, source: "free", enrolledAt: NOW });
    const deps = { store: h.store, key: KEY, now: NOW };
    const given = await deliverPurchase(deps, app, { ...purchase("active", user.id), appId: app.id });
    expect(given).toEqual({ ok: true, grantedCourseIds: [10, 30] });
    const ids = async () => (await h.store.listCourseEnrollments({ appId: app.id, userId: user.id })).map((e) => e.courseId).sort();
    expect(await ids()).toEqual([10, 20, 30]);
    expect(await deliverPurchase(deps, app, { ...purchase("revoked", user.id, [10, 30]), appId: app.id })).toEqual({ ok: true, grantedCourseIds: [] });
    expect(await ids()).toEqual([20]);
  });

  it("lists an academy's bundles in Studio pages' lists, each opening the bundle", async () => {
    const h = await hostedAcademy(academy, paid);
    expect(itemSourcesFor(h.state.app)).toEqual(["courses", "bundles"]);
    expect(itemSourcesFor({ ...h.state.app, connector: { kind: "platform", platform: "teachable" } as never })).toEqual(["courses"]);
    const items = await bundlePageItems(h.state.app.id, { category_id: null, featured: false, sort: "newest", limit: 10, ids: [] }, { store: h.store, lang: "ar", assetUrl: (id) => id });
    expect(items).toEqual([
      {
        source: "bundles",
        id: "50",
        title: "The whole language",
        subtitle: "3 دورات",
        image_url: null,
        price_label: expect.stringContaining("450"),
        badge: expect.stringContaining("600"),
        action: { type: "item", item: { source: "bundles", id: "50" } },
      },
    ]);
  });
});
