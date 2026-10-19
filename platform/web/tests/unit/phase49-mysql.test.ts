import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { App, CatalogOrder } from "@/lib/data/types";
import { newTicketCode } from "@/lib/events/codes";

/**
 * 49 On MySQL or MariaDB: a late ticket payment against claims from other
 * servers at the same moment, and the account deletion notices' store.
 * Runs only with YALLAPP_TEST_DATABASE_URL (migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date();
const MINUTE = 60_000;

describe.skipIf(!url)("49 on MySQL", () => {
  const pools = Array.from({ length: 6 }, () => createPool({ url: url!, ssl: "disabled" }));
  const stores = pools.map((pool) => new MysqlStore(pool));
  afterAll(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });

  async function setup(kind: "events" | "lms") {
    const store = stores[0]!;
    const user = await store.createUser({ email: `p49-${randomUUID()}@yallapp.test`, name: "Owner", passwordHash: null, now: NOW });
    const client = await store.createClient({ userId: user.id, whatsapp: "+905321234567", siteUrl: "", now: NOW });
    const app: App = { ...newApp(client.id, null, NOW, kind), backend: "hosted", connector: kind === "events" ? { kind: "events" } : null };
    await store.createApp(app);
    return { store, app };
  }

  it("a late payment takes the last place only if no claim got it first, never both", async () => {
    const { store, app } = await setup("events");
    const event = await store.createEvent(
      {
        appId: app.id,
        title: "Oud",
        description: "Music.",
        category: null,
        imageAssetIds: [],
        startAt: new Date(NOW.getTime() + 86_400_000),
        endAt: new Date(NOW.getTime() + 90_000_000),
        venueName: "Hall",
        venueAddress: null,
        latitude: null,
        longitude: null,
        onlineUrl: null,
        organiser: null,
        capacity: 1,
        status: "published",
        publishedAt: NOW,
      },
      NOW,
    );
    const type = await store.createTicketType({ appId: app.id, eventId: event.id, name: "Seat", priceCents: 1000, capacity: null, saleEndsAt: null, maxPerOrder: 1, position: 0 }, NOW);
    for (let round = 0; round < 5; round++) {
      const order: CatalogOrder = await store.createCatalogOrder({
        appId: app.id,
        tokenHash: randomUUID(),
        userId: null,
        status: "processing",
        lines: [],
        subtotalCents: 1000,
        shippingCents: 0,
        totalCents: 1000,
        currency: "TRY",
        customer: null,
        paymentId: "p",
        createdAt: NOW,
        paidAt: NOW,
        updatedAt: NOW,
        commissionCents: null,
        itemTransactionIds: null,
        payoutApprovedAt: null,
      });
      const at = new Date(NOW.getTime() + round * 10 * MINUTE);
      const held = await store.claimTickets({ appId: app.id, eventId: event.id, ticketTypeId: type.id, userId: null, orderId: order.id, tickets: [{ code: newTicketCode(), holderName: "Late" }], priceCents: 1000, status: "pending", holdUntil: new Date(at.getTime() + MINUTE), now: at });
      expect(held.ok, `round ${round}`).toBe(true);
      // The hold has ended: the late payment and a new buyer race for the place.
      const later = new Date(at.getTime() + 2 * MINUTE);
      const [issued, claim] = await Promise.all([
        stores[1 + (round % 5)]!.issueOrderTickets(app.id, order.id, later),
        stores[(round + 2) % 6]!.claimTickets({ appId: app.id, eventId: event.id, ticketTypeId: type.id, userId: null, orderId: null, tickets: [{ code: newTicketCode(), holderName: "New" }], priceCents: 0, status: "valid", holdUntil: null, now: later }),
      ]);
      const places = (await store.listTickets({ appId: app.id, eventId: event.id })).filter((t) => t.status === "valid");
      expect(places, `round ${round}`).toHaveLength(1);
      expect(issued.issued + (claim.ok ? 1 : 0), `round ${round}`).toBe(1);
      expect(issued.released, `round ${round}`).toBe(claim.ok ? 1 : 0);
      // Free the place for the next round.
      await store.cancelTickets(app.id, { eventId: event.id }, later);
    }
  });

  it("holds an order's places until a time, only while they're still held", async () => {
    const { store, app } = await setup("events");
    expect(await store.holdOrderTickets(app.id, 999_999, new Date(NOW.getTime() + MINUTE), NOW)).toBe(0);
  });

  it("keeps notices, gives a due one to one run, lists and purges them", async () => {
    const { store, app } = await setup("lms");
    const id = randomUUID();
    await store.createApiWebhook({ id, appId: app.id, event: "account.deleted", subject: "42", status: "pending", attempts: 0, nextAttemptAt: NOW, lastAttemptAt: null, lastStatus: null, lastError: null, createdAt: NOW, deliveredAt: null });
    expect((await store.listDueApiWebhooks(NOW, 10)).map((w) => w.id)).toContain(id);
    const claims = await Promise.all(stores.map((s) => s.claimApiWebhook(id, new Date(NOW.getTime() + 2 * MINUTE), NOW)));
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect((await store.listDueApiWebhooks(NOW, 10)).map((w) => w.id)).not.toContain(id);
    await store.updateApiWebhook(id, { status: "delivered", attempts: 1, deliveredAt: NOW, nextAttemptAt: null, lastStatus: 204 });
    expect(await store.getApiWebhook(id)).toMatchObject({ status: "delivered", attempts: 1, lastStatus: 204, subject: "42" });
    expect((await store.listApiWebhooks(app.id, 5)).map((w) => w.id)).toEqual([id]);
    expect(await store.purgeApiWebhooks(new Date(NOW.getTime() + MINUTE))).toBeGreaterThanOrEqual(1);
    expect(await store.getApiWebhook(id)).toBeNull();
  });
});
