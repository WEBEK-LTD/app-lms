import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { ApiWebhook, StoreBillingItem, StoreProduct, StorePurchaseRecord } from "@/lib/data/types";

/**
 * 100.2/100.3 Store billing in the store, the same on the memory store and
 * on MySQL or MariaDB (migrations 0089 to 0091): products kept once per product
 * ID, purchases once per store key, an account's purchases, the ones waiting
 * for their source or past their paid period, and the WordPress billing
 * sessions. 100.7 (migration 0092): the owner's list of what the app sells,
 * the courses Yallapp gave on a school for a purchase, and purchase notices
 * with their claim, listed by event.
 */

const NOW = new Date("2031-06-01T09:00:00.000Z");
const MIN = 60_000;

export function storeBillingStoreSuite(store: () => DataStore) {
  async function appOf() {
    const s = store();
    const { client } = await registerClient(s, { name: "Ada", email: `ada-${randomUUID()}@billing.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    const app = { ...newApp(client.id, null, NOW, "lms"), storeBilling: { enabled: true, appleAppId: "6450000001" } };
    await s.createApp(app);
    return app;
  }

  const product = (appId: string, patch: Partial<StoreProduct> = {}): StoreProduct => ({
    id: randomUUID(),
    appId,
    productId: "course_12",
    kind: "course",
    courseId: 12,
    planId: null,
    title: "Arabic for beginners",
    period: null,
    courseIds: [12],
    currency: "TRY",
    sitePrice: "450.00",
    ownPrice: null,
    active: true,
    google: null,
    apple: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  });

  const purchase = (appId: string, patch: Partial<StorePurchaseRecord> = {}): StorePurchaseRecord => ({
    id: randomUUID(),
    appId,
    platform: "android",
    storeKey: randomUUID().replace(/-/g, ""),
    purchaseToken: "tok",
    productId: "course_12",
    kind: "course",
    courseId: 12,
    planId: null,
    accountSource: "hosted",
    accountId: "7",
    transactionId: "GPA.1",
    status: "active",
    expiresAt: null,
    acknowledged: false,
    delivered: false,
    reason: null,
    test: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  });

  it("keeps a product once per product ID, with its stores' state, and the app's billing settings", async () => {
    const s = store();
    const app = await appOf();
    expect((await s.getAppById(app.id))?.storeBilling).toEqual({ enabled: true, appleAppId: "6450000001" });
    const first = product(app.id);
    await s.saveStoreProduct(first);
    const sync = { status: "synced" as const, storeState: "ACTIVE", price: "450.00", error: null, at: NOW.toISOString() };
    await s.saveStoreProduct({ ...product(app.id), ownPrice: "399.99", google: sync, updatedAt: new Date(NOW.getTime() + MIN) });
    await s.saveStoreProduct(product(app.id, { productId: "plan_pmpro_3", kind: "membership", courseId: null, planId: "pmpro:3", title: "Gold", period: "month", courseIds: [12, 13] }));
    const listed = await s.listStoreProducts(app.id);
    expect(listed.map((p) => [p.kind, p.productId])).toEqual([
      ["course", "course_12"],
      ["membership", "plan_pmpro_3"],
    ]);
    // The same product ID keeps its first id and takes the new values.
    expect(listed[0]).toMatchObject({ id: first.id, ownPrice: "399.99", google: sync, apple: null, courseIds: [12] });
    expect((await s.getStoreProduct(app.id, "plan_pmpro_3"))?.courseIds).toEqual([12, 13]);
    expect(await s.getStoreProduct(app.id, "course_99")).toBeNull();
    expect((await s.listStoreBillingApps()).some((a) => a.id === app.id)).toBe(true);
  });

  it("keeps a purchase once per store key, and lists an account's, the waiting ones and the ending ones", async () => {
    const s = store();
    const app = await appOf();
    const first = purchase(app.id);
    expect(await s.createStorePurchase(first)).toMatchObject({ id: first.id });
    // Sent twice at once: the second gets the first one back.
    expect(await s.createStorePurchase({ ...purchase(app.id), storeKey: first.storeKey, accountId: "8" })).toMatchObject({ id: first.id, accountId: "7" });
    await s.saveStorePurchase({ ...first, delivered: true, acknowledged: true, updatedAt: new Date(NOW.getTime() + MIN) });
    expect(await s.getStorePurchase(app.id, "android", first.storeKey)).toMatchObject({ delivered: true, acknowledged: true });
    expect(await s.getStorePurchase(app.id, "ios", first.storeKey)).toBeNull();

    const membership = purchase(app.id, { kind: "membership", productId: "plan_pmpro_3", courseId: null, planId: "pmpro:3", expiresAt: new Date(NOW.getTime() + 10 * MIN), delivered: true });
    await s.createStorePurchase(membership);
    const waiting = purchase(app.id, { accountId: "8", updatedAt: new Date(NOW.getTime() - 5 * MIN) });
    await s.createStorePurchase(waiting);

    expect((await s.listAccountStorePurchases(app.id, "hosted", "7")).map((p) => p.id).sort()).toEqual([first.id, membership.id].sort());
    expect((await s.listUndeliveredStorePurchases(NOW, 10)).filter((p) => p.appId === app.id).map((p) => p.id)).toEqual([waiting.id]);
    expect((await s.listEndingStorePurchases(new Date(NOW.getTime() + 11 * MIN), 10)).filter((p) => p.appId === app.id).map((p) => p.id)).toEqual([membership.id]);
    expect((await s.listEndingStorePurchases(new Date(NOW.getTime() + 9 * MIN), 10)).filter((p) => p.appId === app.id)).toEqual([]);
  });

  it("keeps each purchase's sales events, and lists a range without store tests", async () => {
    const s = store();
    const app = await appOf();
    const kept = await s.createStorePurchase(purchase(app.id));
    const event = (kind: "bought" | "refunded", at: Date, test = false) => ({ id: randomUUID(), appId: app.id, purchaseId: kept.id, platform: "android" as const, kind, productId: "course_12", amountCents: 45000, currency: "TRY", test, at });
    await s.addStorePurchaseEvent(event("bought", NOW));
    await s.addStorePurchaseEvent(event("bought", new Date(NOW.getTime() + MIN), true));
    await s.addStorePurchaseEvent(event("refunded", new Date(NOW.getTime() + 2 * MIN)));
    const listed = await s.listStorePurchaseEvents(app.id, NOW, new Date(NOW.getTime() + 2 * MIN));
    expect(listed.map((e) => [e.kind, e.amountCents, e.currency, e.test])).toEqual([["bought", 45000, "TRY", false]]);
    expect((await s.listStorePurchaseEvents(app.id, NOW, new Date(NOW.getTime() + 3 * MIN))).map((e) => e.kind)).toEqual(["bought", "refunded"]);
  });

  it("100.7 keeps the owner's list once per kind and ID, the creation kept on a change", async () => {
    const s = store();
    const app = await appOf();
    const item = (patch: Partial<StoreBillingItem> = {}): StoreBillingItem => ({
      id: randomUUID(),
      appId: app.id,
      kind: "course",
      itemId: "12",
      title: "Arabic for beginners",
      price: "450.00",
      currency: "TRY",
      period: null,
      courseIds: [12],
      active: true,
      createdAt: NOW,
      updatedAt: NOW,
      ...patch,
    });
    const course = item();
    await s.saveStoreBillingItem(course);
    await s.saveStoreBillingItem(item({ kind: "membership", itemId: "gold", title: "Gold", price: "99.00", period: "month", courseIds: [12, 15] }));
    // The same course again (an edit, or stopped): one row, its id and creation kept.
    await s.saveStoreBillingItem(item({ title: "Arabic 1", price: "500.00", active: false, createdAt: new Date(NOW.getTime() + MIN), updatedAt: new Date(NOW.getTime() + MIN) }));
    const listed = await s.listStoreBillingItems(app.id);
    expect(listed.map((i) => [i.kind, i.itemId, i.title, i.price, i.active])).toEqual([
      ["course", "12", "Arabic 1", "500.00", false],
      ["membership", "gold", "Gold", "99.00", true],
    ]);
    expect(listed[0]).toMatchObject({ id: course.id, createdAt: NOW, updatedAt: new Date(NOW.getTime() + MIN) });
    expect(listed[1]).toMatchObject({ period: "month", courseIds: [12, 15] });
    expect(await s.listStoreBillingItems((await appOf()).id)).toEqual([]);
  });

  it("100.7 keeps the courses Yallapp gave on a school for a purchase", async () => {
    const s = store();
    const app = await appOf();
    const kept = await s.createStorePurchase(purchase(app.id));
    expect((await s.getStorePurchase(app.id, "android", kept.storeKey))?.grantedCourseIds ?? null).toBeNull();
    await s.saveStorePurchase({ ...kept, grantedCourseIds: [15, 1001] });
    expect((await s.getStorePurchase(app.id, "android", kept.storeKey))?.grantedCourseIds).toEqual([15, 1001]);
  });

  it("100.7 keeps a purchase notice's claim, and lists an app's notices by event", async () => {
    const s = store();
    const app = await appOf();
    const notice = (event: ApiWebhook["event"], at: number, data: ApiWebhook["data"] = null): ApiWebhook => ({
      id: randomUUID(),
      appId: app.id,
      event,
      subject: "7",
      status: "pending",
      attempts: 0,
      nextAttemptAt: new Date(NOW.getTime() + at * MIN),
      lastAttemptAt: null,
      lastStatus: null,
      lastError: null,
      createdAt: new Date(NOW.getTime() + at * MIN),
      deliveredAt: null,
      data,
    });
    const claim = { product_id: "course_12", kind: "course", item_id: "12", course_ids: [12], amount: "450.00", test: false };
    const bought = notice("purchase.completed", 1, { purchase: { id: randomUUID(), platform: "android", storeKey: "abc", status: "active", expiresAt: null }, event: claim });
    await s.createApiWebhook(notice("account.deleted", 0));
    await s.createApiWebhook(bought);
    await s.createApiWebhook(notice("purchase.revoked", 2, { event: { ...claim, reason: "refunded" } }));
    expect((await s.getApiWebhook(bought.id))?.data).toEqual(bought.data);
    expect((await s.listApiWebhooks(app.id, 10, ["purchase.completed", "purchase.revoked"])).map((w) => w.event)).toEqual(["purchase.revoked", "purchase.completed"]);
    expect((await s.listApiWebhooks(app.id, 10, ["account.deleted"])).map((w) => [w.event, w.data ?? null])).toEqual([["account.deleted", null]]);
    expect(await s.listApiWebhooks(app.id, 10)).toHaveLength(3);
  });

  it("keeps billing sessions by their token's hash", async () => {
    const s = store();
    const app = await appOf();
    const hash = randomUUID().replace(/-/g, "").padEnd(64, "0");
    await s.createBillingSession({ tokenHash: hash, appId: app.id, userId: 42, name: "Deniz Aksoy", email: "deniz@academy.test", expiresAt: new Date(NOW.getTime() + 60 * MIN), createdAt: NOW });
    expect(await s.getBillingSession(hash)).toMatchObject({ appId: app.id, userId: 42, email: "deniz@academy.test" });
    expect(await s.getBillingSession("0".repeat(64))).toBeNull();
  });
}
