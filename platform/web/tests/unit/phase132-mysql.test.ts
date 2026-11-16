import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import { newApp } from "@/lib/app/setup";
import { sha256Hex } from "@/lib/crypto/tokens";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogOrder } from "@/lib/data/types";

/**
 * 132 On MySQL or MariaDB: Prime given as a gift (`prime_gifts`, migration
 * 0131) saved, changed, listed by client and removed, gone with its app; and
 * the orders waiting for a bank transfer or the owner's own method found
 * alone (no other status asked), as Today's `orders_awaiting_payment` and
 * Yallapp Business's In progress ask. Runs only with
 * YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-11-16T10:00:00.000Z");

describe.skipIf(!url)("132 Prime gifts and waiting payments on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });

  async function setup() {
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(store, { name: "Leyla", email: `p132-${suffix}@flowers.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } };
    await store.createApp(app);
    return { client, app };
  }

  it("keeps a Prime gift per app, changes and removes it", async () => {
    const { client, app } = await setup();
    expect(await store.getPrimeGift(app.id)).toBeNull();
    const gift = { appId: app.id, clientId: client.id, until: null, note: "Launch week", givenBy: "team@yallapp.test", createdAt: NOW, updatedAt: NOW };
    await store.savePrimeGift(gift);
    expect(await store.getPrimeGift(app.id)).toEqual(gift);
    const until = new Date("2026-12-01T00:00:00.000Z");
    await store.savePrimeGift({ ...gift, until, note: null, updatedAt: new Date(NOW.getTime() + 1000) });
    expect(await store.getPrimeGift(app.id)).toEqual({ ...gift, until, note: null, updatedAt: new Date(NOW.getTime() + 1000) });
    expect((await store.listPrimeGifts(client.id)).map((g) => g.appId)).toEqual([app.id]);
    expect(await store.deletePrimeGift(app.id)).toBe(true);
    expect(await store.deletePrimeGift(app.id)).toBe(false);
    expect(await store.listPrimeGifts(client.id)).toEqual([]);
  });

  it("finds the orders waiting for their payment alone", async () => {
    const { app } = await setup();
    const base = {
      appId: app.id,
      userId: null,
      lines: [{ productId: 1, name: "Tulips", quantity: 1, unitCents: 300_00, imageAssetId: null, digital: false }],
      subtotalCents: 300_00,
      shippingCents: 0,
      totalCents: 300_00,
      currency: "EGP",
      customer: { name: "Hoda Samir", phone: "+201002223333", email: "hoda@example.com", city: "Giza", address: "7 Pyramids Rd" },
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      updatedAt: NOW,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    };
    const waiting = await store.createCatalogOrder({
      ...base,
      tokenHash: sha256Hex(`w-${randomUUID()}`),
      status: "pending",
      manualPayment: { method: "custom", name: "Cash on delivery", instructions: "Pay the courier.", dueAt: "2026-11-18T10:00:00.000Z" },
    } as Omit<CatalogOrder, "id">);
    // An unpaid card checkout is no order.
    await store.createCatalogOrder({ ...base, tokenHash: sha256Hex(`c-${randomUUID()}`), status: "pending" } as Omit<CatalogOrder, "id">);
    const found = await store.listCatalogOrders({ appId: app.id, statuses: [], awaitingManual: true, offset: 0, limit: 10 });
    expect(found.total).toBe(1);
    expect(found.items.map((o) => o.id)).toEqual([waiting.id]);
  });
});
