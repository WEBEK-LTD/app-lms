import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { StoreProduct, StorePurchaseRecord } from "@/lib/data/types";

/**
 * 100.2/100.3 Store billing in the store, the same on the memory store and
 * on MySQL or MariaDB (migrations 0089, 0090): products kept once per product
 * ID, purchases once per store key, an account's purchases, the ones waiting
 * for their source or past their paid period, and the WordPress billing
 * sessions.
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

  it("keeps billing sessions by their token's hash", async () => {
    const s = store();
    const app = await appOf();
    const hash = randomUUID().replace(/-/g, "").padEnd(64, "0");
    await s.createBillingSession({ tokenHash: hash, appId: app.id, userId: 42, name: "Deniz Aksoy", email: "deniz@academy.test", expiresAt: new Date(NOW.getTime() + 60 * MIN), createdAt: NOW });
    expect(await s.getBillingSession(hash)).toMatchObject({ appId: app.id, userId: 42, email: "deniz@academy.test" });
    expect(await s.getBillingSession("0".repeat(64))).toBeNull();
  });
}
