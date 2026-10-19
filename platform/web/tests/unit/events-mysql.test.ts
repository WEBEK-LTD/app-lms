import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { App } from "@/lib/data/types";
import { newTicketCode } from "@/lib/events/codes";

/**
 * 28 Places under real concurrency, on MySQL or MariaDB: several server
 * instances (each its own connection, like Netlify functions) take tickets
 * for the same event at the same moment. Runs only with
 * YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date();

describe.skipIf(!url)("28 tickets on MySQL", () => {
  const pools = Array.from({ length: 8 }, () => createPool({ url: url!, ssl: "disabled" }));
  const stores = pools.map((pool) => new MysqlStore(pool));
  afterAll(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });

  async function setup(capacity: { event: number | null; type: number | null }) {
    const store = stores[0]!;
    const user = await store.createUser({ email: `events-${randomUUID()}@yallapp.test`, name: "Organiser", passwordHash: null, now: NOW });
    const client = await store.createClient({ userId: user.id, whatsapp: "+905321234567", siteUrl: "", now: NOW });
    const app: App = { ...newApp(client.id, null, NOW, "events"), backend: "hosted", connector: { kind: "events" } };
    await store.createApp(app);
    const event = await store.createEvent(
      {
        appId: app.id,
        title: "Jazz",
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
        capacity: capacity.event,
        status: "published",
        publishedAt: NOW,
      },
      NOW,
    );
    const type = await store.createTicketType({ appId: app.id, eventId: event.id, name: "Standard", priceCents: 0, capacity: capacity.type, saleEndsAt: null, maxPerOrder: 4, position: 0 }, NOW);
    return { app, event, type };
  }

  it("never takes more places than there are, from eight servers at once", async () => {
    const { app, event, type } = await setup({ event: 10, type: null });
    const claims = await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        stores[i % stores.length]!.claimTickets({
          appId: app.id,
          eventId: event.id,
          ticketTypeId: type.id,
          userId: null,
          orderId: null,
          tickets: Array.from({ length: 1 + (i % 2) }, () => ({ code: newTicketCode(), holderName: `Guest ${i}` })),
          priceCents: 0,
          status: "valid",
          holdUntil: null,
          now: NOW,
        }),
      ),
    );
    const issued = claims.flatMap((c) => (c.ok ? c.tickets : []));
    expect(issued.length).toBeLessThanOrEqual(10);
    expect(issued.length).toBeGreaterThanOrEqual(9);
    expect(claims.filter((c) => !c.ok).every((c) => !c.ok && c.reason === "sold_out")).toBe(true);
    const saved = await stores[0]!.listTickets({ appId: app.id, eventId: event.id });
    expect(saved).toHaveLength(issued.length);
    expect((await stores[0]!.countTicketPlaces(app.id, NOW)).reduce((n, c) => n + c.count, 0)).toBe(issued.length);
  });

  it("checks a ticket in once when two doors scan it at the same moment", async () => {
    const { app, event, type } = await setup({ event: null, type: 5 });
    const code = newTicketCode();
    const claim = await stores[0]!.claimTickets({
      appId: app.id,
      eventId: event.id,
      ticketTypeId: type.id,
      userId: null,
      orderId: null,
      tickets: [{ code, holderName: "Mona" }],
      priceCents: 0,
      status: "valid",
      holdUntil: null,
      now: NOW,
    });
    expect(claim.ok).toBe(true);
    const scans = await Promise.all(stores.map((store) => store.checkInTicket(app.id, code, NOW)));
    expect(scans.filter((s) => s.ok)).toHaveLength(1);
    expect(scans.filter((s) => !s.ok).every((s) => !s.ok && s.reason === "used")).toBe(true);
  });

  it("holds places for pending orders until the hold ends, then issues them once paid", async () => {
    const { app, event, type } = await setup({ event: null, type: 2 });
    const store = stores[0]!;
    const order = await store.createCatalogOrder({
      appId: app.id,
      tokenHash: randomUUID().replace(/-/g, ""),
      userId: null,
      status: "pending",
      lines: [{ productId: type.id, name: "Jazz: Standard", quantity: 2, unitCents: 0, imageAssetId: null, digital: true }],
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
      currency: "TRY",
      customer: null,
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      updatedAt: NOW,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    });
    const hold = await store.claimTickets({
      appId: app.id,
      eventId: event.id,
      ticketTypeId: type.id,
      userId: null,
      orderId: order.id,
      tickets: [
        { code: newTicketCode(), holderName: "A" },
        { code: newTicketCode(), holderName: "B" },
      ],
      priceCents: 1000,
      status: "pending",
      holdUntil: new Date(NOW.getTime() + 60_000),
      now: NOW,
    });
    expect(hold.ok).toBe(true);
    const another = (now: Date) =>
      store.claimTickets({ appId: app.id, eventId: event.id, ticketTypeId: type.id, userId: null, orderId: null, tickets: [{ code: newTicketCode(), holderName: "C" }], priceCents: 0, status: "valid", holdUntil: null, now });
    expect(await another(NOW)).toEqual({ ok: false, reason: "sold_out" });
    expect(await store.issueOrderTickets(app.id, order.id, NOW)).toEqual({ issued: 2, released: 0 });
    expect(await store.issueOrderTickets(app.id, order.id, NOW)).toEqual({ issued: 0, released: 0 });
    // Issued tickets keep their places after the hold would have ended.
    expect(await another(new Date(NOW.getTime() + 120_000))).toEqual({ ok: false, reason: "sold_out" });
  });
});
