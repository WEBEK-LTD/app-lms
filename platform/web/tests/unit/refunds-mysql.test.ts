import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { App, PaymentRefund } from "@/lib/data/types";

/**
 * 47 Refunds on MySQL or MariaDB: two refunds sent at once from several
 * server instances never refund more than was paid, all of it makes the
 * order "refunded" and gives Yallapp's commission back, a donation's
 * campaign total and donor count follow, refunded tickets and lost course
 * access are written, and the app's time zone is kept. Runs only with
 * YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date(Math.floor(Date.now() / 1000) * 1000);

describe.skipIf(!url)("47 refunds on MySQL", () => {
  const pools = Array.from({ length: 4 }, () => createPool({ url: url!, ssl: "disabled" }));
  const stores = pools.map((pool) => new MysqlStore(pool));
  afterAll(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });

  async function setup(kind: "catalog" | "campaigns" = "catalog") {
    const store = stores[0]!;
    const user = await store.createUser({ email: `refunds-${randomUUID()}@yallapp.test`, name: "Shop", passwordHash: null, now: NOW });
    const client = await store.createClient({ userId: user.id, whatsapp: "+905321234567", siteUrl: "", now: NOW });
    const app: App = { ...newApp(client.id, null, NOW, kind === "campaigns" ? "donations" : "store"), backend: "hosted", connector: { kind } };
    await store.createApp(app);
    return { store, app };
  }

  const refund = (app: App, kind: PaymentRefund["kind"], targetId: number, amountCents: number, commissionCents: number | null = null): Omit<PaymentRefund, "id"> => ({
    appId: app.id,
    kind,
    targetId,
    amountCents,
    currency: "TRY",
    reason: "buyer_request",
    note: null,
    provider: "iyzico",
    method: "api",
    parts: [{ kind: "refund", transactionId: "T1", cents: amountCents, reference: "REF" }],
    providerRef: "REF",
    commissionCents,
    revoked: { tickets: [], courses: [], memberships: [] },
    byUserId: null,
    byEmail: "owner@shop.test",
    createdAt: NOW,
  });

  it("refunds an order at most once in all, at once from several instances", async () => {
    const { store, app } = await setup();
    const order = await store.createCatalogOrder({
      appId: app.id,
      tokenHash: randomUUID().replace(/-/g, ""),
      userId: null,
      status: "pending",
      lines: [{ productId: 1, name: "Atlas", quantity: 1, unitCents: 40000, imageAssetId: null, digital: false }],
      subtotalCents: 40000,
      shippingCents: 5000,
      totalCents: 45000,
      currency: "TRY",
      customer: null,
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      updatedAt: NOW,
      commissionCents: 4000,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    });
    await store.payCatalogOrder(app.id, order.id, "PAY-1", NOW);
    expect((await store.getCatalogOrder(app.id, order.id))!.refundedCents).toBe(0);
    // Four refunds of 200 at once: only two fit in 450.
    const results = await Promise.all(stores.map((s) => s.recordRefund(refund(app, "order", order.id, 20000, 1000))));
    expect(results.filter(Boolean)).toHaveLength(2);
    expect(await store.getCatalogOrder(app.id, order.id)).toMatchObject({ status: "processing", refundedCents: 40000, commissionCents: 2000 });
    expect(await store.recordRefund(refund(app, "order", order.id, 5001))).toBeNull();
    expect(await store.recordRefund(refund(app, "order", order.id, 5000, 2000))).not.toBeNull();
    expect(await store.getCatalogOrder(app.id, order.id)).toMatchObject({ status: "refunded", refundedCents: 45000, commissionCents: 0 });
    const saved = await store.listRefunds(app.id, "order", [order.id]);
    expect(saved.map((r) => r.amountCents)).toEqual([20000, 20000, 5000]);
    expect(saved[0]).toMatchObject({ parts: [{ kind: "refund", transactionId: "T1", cents: 20000, reference: "REF" }], revoked: { tickets: [], courses: [], memberships: [] }, createdAt: NOW });
    expect(await store.listRefunds(app.id, "donation", [order.id])).toEqual([]);
  });

  it("takes a donation's refund off its campaign, and the donor once all of it is refunded", async () => {
    const { store, app } = await setup("campaigns");
    const campaign = await store.createCampaign(
      { appId: app.id, title: "Parcels", summary: null, story: "<p>x</p>", imageAssetIds: [], goalCents: null, presetCents: [100], allowCustomAmount: true, minCents: 100, endsAt: null, status: "open", featured: false, publishedAt: NOW },
      NOW,
    );
    const donation = await store.createDonation({
      appId: app.id,
      campaignId: campaign.id,
      campaignTitle: "Parcels",
      tokenHash: randomUUID().replace(/-/g, ""),
      receiptCode: randomUUID(),
      userId: null,
      amountCents: 25000,
      currency: "TRY",
      recurring: "none",
      anonymous: false,
      message: null,
      donorName: "Elif",
      donorEmail: "elif@example.com",
      donorPhone: null,
      status: "pending",
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      updatedAt: NOW,
    });
    await store.payDonation(app.id, donation.id, "PAY-1", NOW);
    expect(await store.recordRefund(refund(app, "donation", donation.id, 5000))).not.toBeNull();
    expect(await store.getCampaign(app.id, campaign.id)).toMatchObject({ raisedCents: 20000, donorCount: 1 });
    expect(await store.recordRefund(refund(app, "donation", donation.id, 20001))).toBeNull();
    expect(await store.recordRefund(refund(app, "donation", donation.id, 20000))).not.toBeNull();
    expect(await store.getDonation(app.id, donation.id)).toMatchObject({ status: "refunded", refundedCents: 25000 });
    expect(await store.getCampaign(app.id, campaign.id)).toMatchObject({ raisedCents: 0, donorCount: 0 });
  });

  it("leaves a course, and keeps the app's time zone", async () => {
    const { store, app } = await setup();
    const hosted = (await store.createHostedUser({ appId: app.id, phone: "+905321234567", name: "Mona", email: null, city: null, now: NOW }))!;
    await store.enrollInCourse({ appId: app.id, userId: hosted.id, courseId: 7, source: "paid", enrolledAt: NOW });
    expect(await store.leaveCourse(app.id, hosted.id, 7)).toBe(true);
    expect(await store.leaveCourse(app.id, hosted.id, 7)).toBe(false);
    await store.updateApp(app.id, { timeZone: "Africa/Cairo" }, NOW);
    expect((await store.getAppById(app.id))!.timeZone).toBe("Africa/Cairo");
  });
});
