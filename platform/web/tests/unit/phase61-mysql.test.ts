import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { localToUtc } from "@/lib/bookings/time";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { DEFAULT_BOOKING_RULES, type Announcement, type App, type BookingSetup, type TimeRange } from "@/lib/data/types";
import { runScheduledNotifications, scheduleAppNotification } from "@/lib/hosted/scheduled-notifications";
import { KEY } from "./helpers";

/**
 * 61 On MySQL or MariaDB (migration 0045): today's numbers summed by the
 * database, an appointment moved as one step, notifications sent later taken
 * by one run of the frequent job only (two at once), and an announcement
 * pushed once. Runs only with YALLAPP_TEST_DATABASE_URL (a database with the
 * migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-10-12T10:00:00.000Z");
const WEEK: TimeRange[][] = [[], ...Array.from({ length: 6 }, () => [{ start: "09:00", end: "17:00" }])];

describe.skipIf(!url)("61 on MySQL", () => {
  const pools = Array.from({ length: 2 }, () => createPool({ url: url!, ssl: "disabled" }));
  const [store, other] = pools.map((pool) => new MysqlStore(pool)) as [MysqlStore, MysqlStore];
  afterAll(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });

  async function setup(patch: Partial<App> & Pick<App, "appType">) {
    const user = await store.createUser({ email: `p61-${randomUUID()}@yallapp.test`, name: "Owner", passwordHash: null, now: NOW });
    const client = await store.createClient({ userId: user.id, whatsapp: "+905321234567", siteUrl: "", now: NOW });
    await store.updateClient(client.id, { status: "active", activatedAt: NOW }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, patch.appType, patch.vertical ?? null), backend: "hosted", ...patch };
    await store.createApp(app);
    return { user, client, app };
  }

  it("sums the day's paid orders less refunds per currency, donations, new users and tickets", async () => {
    const { app } = await setup({ appType: "store", connector: { kind: "catalog" } });
    const from = new Date("2026-10-11T21:00:00.000Z");
    const to = new Date("2026-10-12T21:00:00.000Z");
    const order = async (cents: number, currency: string, paidAt: Date | null) => {
      const created = await store.createCatalogOrder({
        appId: app.id,
        tokenHash: randomUUID().replace(/-/g, ""),
        userId: null,
        status: "pending",
        lines: [],
        subtotalCents: cents,
        shippingCents: 0,
        totalCents: cents,
        currency,
        customer: null,
        paymentId: null,
        createdAt: NOW,
        paidAt: null,
        updatedAt: NOW,
        commissionCents: null,
        itemTransactionIds: null,
        payoutApprovedAt: null,
      } as never);
      if (paidAt) await store.payCatalogOrder(app.id, created.id, `PAY-${created.id}`, paidAt);
      return created;
    };
    const refunded = await order(40_000, "TRY", NOW);
    await order(10_000, "TRY", new Date("2026-10-12T20:59:59.000Z"));
    await order(2_500, "USD", NOW);
    await order(99_000, "TRY", new Date("2026-10-11T20:59:59.000Z"));
    await order(5_000, "TRY", null);
    await store.recordRefund({
      appId: app.id,
      kind: "order",
      targetId: refunded.id,
      amountCents: 15_000,
      currency: "TRY",
      reason: "buyer_request",
      note: null,
      provider: "fawaterk",
      method: "manual",
      parts: [],
      providerRef: null,
      commissionCents: null,
      revoked: { tickets: [], courses: [], memberships: [] },
      byUserId: null,
      byEmail: "owner@yallapp.test",
      createdAt: NOW,
    });
    expect(await store.sumPaidCatalogOrders(app.id, from, to)).toEqual({
      count: 3,
      totals: [
        { currency: "TRY", cents: 35_000 },
        { currency: "USD", cents: 2_500 },
      ],
    });
    expect(await store.sumPaidCatalogOrders(app.id, to, new Date(to.getTime() + 86_400_000))).toEqual({ count: 0, totals: [] });
    for (let i = 0; i < 3; i += 1) await store.createHostedUser({ appId: app.id, phone: `+90532${Math.floor(Math.random() * 1e7)}`, name: `U${i}`, email: null, city: null, now: NOW });
    expect(await store.countHostedUsersCreated(app.id, from, to)).toBe(3);
    expect(await store.countHostedUsersCreated(app.id, to, new Date(to.getTime() + 1))).toBe(0);
    expect(await store.sumPaidDonations(app.id, from, to)).toEqual({ count: 0, totals: [] });
    expect(await store.countTicketsInWindow(app.id, from, to)).toEqual({ issued: 0, checkedIn: 0 });
  });

  it("counts a charity's donations and an event's tickets and check-ins", async () => {
    const { app } = await setup({ appType: "events", connector: { kind: "events" } });
    const event = await store.createEvent(
      { appId: app.id, title: "Gala", description: "", category: null, imageAssetIds: [], startAt: NOW, endAt: new Date(NOW.getTime() + 3_600_000), venueName: null, venueAddress: null, latitude: null, longitude: null, onlineUrl: null, organiser: null, capacity: null, status: "published", publishedAt: NOW },
      NOW,
    );
    const type = await store.createTicketType({ appId: app.id, eventId: event.id, name: "Free", priceCents: 0, capacity: null, saleEndsAt: null, maxPerOrder: 4, position: 0 }, NOW);
    const code = () => randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
    const [a, b] = [code(), code()];
    const claim = await store.claimTickets({ appId: app.id, eventId: event.id, ticketTypeId: type.id, userId: null, orderId: null, tickets: [{ code: a, holderName: "A" }, { code: b, holderName: "B" }], priceCents: 0, status: "valid", holdUntil: null, now: NOW });
    expect(claim.ok).toBe(true);
    await store.checkInTicket(app.id, a, NOW);
    expect(await store.countTicketsInWindow(app.id, new Date(NOW.getTime() - 60_000), new Date(NOW.getTime() + 60_000))).toEqual({ issued: 2, checkedIn: 1 });

    const charity = await setup({ appType: "donations", vertical: "charity", connector: { kind: "campaigns" } });
    const donation = await store.createDonation({
      appId: charity.app.id,
      campaignId: null,
      campaignTitle: "Winter",
      tokenHash: randomUUID().replace(/-/g, ""),
      receiptCode: randomUUID(),
      userId: null,
      amountCents: 30_000,
      currency: "EGP",
      recurring: "none",
      anonymous: false,
      message: null,
      donorName: "Elif",
      donorEmail: null,
      donorPhone: null,
      status: "pending",
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      updatedAt: NOW,
    });
    await store.payDonation(charity.app.id, donation.id, "pay-1", NOW);
    expect(await store.sumPaidDonations(charity.app.id, new Date(NOW.getTime() - 60_000), new Date(NOW.getTime() + 60_000))).toEqual({ count: 1, totals: [{ currency: "EGP", cents: 30_000 }] });
  });

  it("moves an appointment as one step: of two moves to the same time, one wins", async () => {
    const setupWith: BookingSetup = {
      rules: { ...DEFAULT_BOOKING_RULES },
      categories: [],
      services: [{ id: 10, categoryId: null, name: "Haircut", description: "", durationMinutes: 30, priceCents: 0, imageAssetId: null, color: null, active: true }],
      staff: [{ id: 20, name: "Ayşe", title: null, imageAssetId: null, serviceIds: [10], hours: WEEK, daysOff: [], active: true }],
      nextId: 30,
    } as BookingSetup;
    const { app } = await setup({ appType: "booking", connector: { kind: "bookings" }, bookingSetup: setupWith });
    const at = (time: string) => localToUtc("2026-10-13", time, "Europe/Istanbul");
    const book = async (time: string) =>
      (await store.createBookingAppointment({
        appId: app.id,
        userId: null,
        serviceId: 10,
        staffId: 20,
        serviceName: "Haircut",
        staffName: "Ayşe",
        customerName: time,
        customerPhone: null,
        customerEmail: null,
        startAt: at(time),
        endAt: new Date(at(time).getTime() + 30 * 60_000),
        status: "approved",
        priceCents: 0,
        currency: "TRY",
        notes: null,
        answers: null,
        createdAt: NOW,
        updatedAt: NOW,
      }))!;
    const [x, y] = [await book("09:00"), await book("10:00")];
    const move = { staffId: 20, staffName: "Ayşe", startAt: at("15:00"), endAt: at("15:30"), updatedAt: NOW };
    const results = await Promise.all([store.moveBookingAppointment(app.id, x.id, move), other.moveBookingAppointment(app.id, y.id, move)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    // Moving within its own time is fine.
    const winner = results[0] ? x : y;
    expect(await store.moveBookingAppointment(app.id, winner.id, { ...move, startAt: at("15:15"), endAt: at("15:45") })).toBe(true);
    expect((await store.getBookingAppointment(app.id, winner.id))!.startAt).toEqual(at("15:15"));
  });

  it("sends a notification due later once, with two runs of the frequent job at the same time", async () => {
    const { app } = await setup({ appType: "store", connector: { kind: "catalog" } });
    const made = await scheduleAppNotification({ store, now: NOW }, app, { title: "Open late", body: "Until 22:00.", date: "2026-10-12", time: "14:00", createdBy: null });
    expect(made.ok).toBe(true);
    const id = made.ok ? made.notification.id : 0;
    expect(await store.listScheduledNotifications(app.id, ["scheduled"])).toMatchObject([{ id, title: "Open late", status: "scheduled" }]);
    const later = new Date(NOW.getTime() + 2 * 3_600_000);
    const reports = await Promise.all([runScheduledNotifications({ store, key: KEY, now: later }), runScheduledNotifications({ store: other, key: KEY, now: later })]);
    expect(reports[0]!.sent + reports[1]!.sent).toBe(1);
    expect((await store.listHostedBroadcasts(app.id, 10)).map((n) => n.title)).toEqual(["Open late"]);
    expect(await store.getScheduledNotification(app.id, id)).toMatchObject({ status: "sent", sentAt: later });
    expect(await store.updateScheduledNotification(app.id, id, "scheduled", { status: "cancelled" })).toBe(false);
    // One taken and left: failed by a later run, never sent twice.
    const stuck = await scheduleAppNotification({ store, now: NOW }, app, { title: "Stuck", body: "Hi", date: "2026-10-12", time: "14:30", createdBy: null });
    const stuckId = stuck.ok ? stuck.notification.id : 0;
    await store.updateScheduledNotification(app.id, stuckId, "scheduled", { status: "sending", claimedAt: later });
    expect((await store.listStaleScheduledNotifications(new Date(later.getTime() + 1))).map((n) => n.id)).toContain(stuckId);
    await runScheduledNotifications({ store, key: KEY, now: new Date(later.getTime() + 3_600_000) });
    expect((await store.getScheduledNotification(app.id, stuckId))!.status).toBe("failed");
  });

  it("marks an announcement pushed once", async () => {
    const id = randomUUID();
    const announcement: Announcement = {
      id,
      title: "Later",
      body: "Body",
      audience: { kind: "all" },
      severity: "info",
      kind: "update",
      showAsBanner: false,
      titleAr: null,
      bodyAr: null,
      titleTr: null,
      bodyTr: null,
      linkUrl: null,
      linkLabel: null,
      startsAt: NOW,
      endsAt: null,
      emailedAt: null,
      emailedCount: 0,
      pushedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      createdBy: "team@yallapp.test",
    };
    await store.createAnnouncement(announcement);
    const claims = await Promise.all([store.claimAnnouncementPush(id, NOW), other.claimAnnouncementPush(id, NOW)]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect((await store.getAnnouncement(id))!.pushedAt).toEqual(NOW);
    await store.deleteAnnouncement(id);
  });
});
