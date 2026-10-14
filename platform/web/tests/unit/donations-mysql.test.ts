import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { App, DonationInput } from "@/lib/data/types";

/**
 * 29 Donations on MySQL or MariaDB: the same confirmation arriving on several
 * server instances at once is counted once, a donor is counted once per
 * campaign, and a demo donation never moves the totals. Runs only with
 * YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date();

describe.skipIf(!url)("29 donations on MySQL", () => {
  const pools = Array.from({ length: 6 }, () => createPool({ url: url!, ssl: "disabled" }));
  const stores = pools.map((pool) => new MysqlStore(pool));
  afterAll(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });

  async function setup() {
    const store = stores[0]!;
    const user = await store.createUser({ email: `charity-${randomUUID()}@yallapp.test`, name: "Charity", passwordHash: null, now: NOW });
    const client = await store.createClient({ userId: user.id, whatsapp: "+905321234567", siteUrl: "", now: NOW });
    const app: App = { ...newApp(client.id, null, NOW, "donations", "charity"), backend: "hosted", connector: { kind: "campaigns" } };
    await store.createApp(app);
    const campaign = await store.createCampaign(
      {
        appId: app.id,
        title: "Winter food parcels",
        summary: null,
        story: "<p>Parcels.</p>",
        imageAssetIds: [],
        goalCents: 100_000_00,
        presetCents: [150_00],
        allowCustomAmount: true,
        minCents: 20_00,
        endsAt: null,
        status: "open",
        featured: false,
        publishedAt: NOW,
      },
      NOW,
    );
    const donation = (email: string, amountCents: number): DonationInput => ({
      appId: app.id,
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      tokenHash: randomUUID().replace(/-/g, ""),
      receiptCode: randomUUID(),
      userId: null,
      amountCents,
      currency: "TRY",
      recurring: "none",
      anonymous: false,
      message: null,
      donorName: "Elif Yilmaz",
      donorEmail: email,
      donorPhone: null,
      status: "pending",
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      updatedAt: NOW,
    });
    return { store, app, campaign, donation };
  }

  it("counts a confirmation once, from six servers at once, and each donor once", async () => {
    const { store, app, campaign, donation } = await setup();
    const first = await store.createDonation(donation("elif@example.com", 300_00));
    const results = await Promise.all(stores.map((s) => s.payDonation(app.id, first.id, "pay-1", NOW)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await store.getCampaign(app.id, campaign.id)).toMatchObject({ raisedCents: 300_00, donorCount: 1 });

    const again = await store.createDonation(donation("elif@example.com", 150_00));
    await store.payDonation(app.id, again.id, "pay-2", NOW);
    const other = await store.createDonation(donation("mert@example.com", 75_50));
    await store.payDonation(app.id, other.id, "pay-3", NOW);
    expect(await store.getCampaign(app.id, campaign.id)).toMatchObject({ raisedCents: 525_50, donorCount: 2 });

    // A demo donation is paid but never counted.
    const demo = await store.createDonation(donation("demo@example.com", 1_000_00));
    expect(await store.payDonation(app.id, demo.id, "demo", NOW, { count: false })).toBe(true);
    expect(await store.getCampaign(app.id, campaign.id)).toMatchObject({ raisedCents: 525_50, donorCount: 2 });

    const { items, total } = await store.listDonations({ appId: app.id, campaignId: campaign.id, statuses: ["paid"], offset: 0, limit: 10 });
    expect(total).toBe(4);
    expect(items.every((d) => d.paidAt !== null)).toBe(true);
    // The campaign's title stays with its donations when it's deleted.
    await store.deleteCampaign(app.id, campaign.id);
    expect(await store.getDonation(app.id, first.id)).toMatchObject({ campaignId: null, campaignTitle: "Winter food parcels" });
  });
});
