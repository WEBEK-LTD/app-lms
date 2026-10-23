import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import type { AnalyticsRange } from "@/lib/analytics/report";
import { loadSales } from "@/lib/analytics/sales";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App, AppType, ConnectorConfig } from "@/lib/data/types";
import { days, NOW } from "./helpers";

/** 86.1 Sales over the Analytics range, the same on every store. */
export function salesStoreSuite(store: () => DataStore) {
  const ZONE = "Europe/Istanbul";
  // The week to Monday 12 October in Istanbul, so [5 Oct 21:00, 12 Oct 21:00) in UTC; and the week before.
  const RANGE: AnalyticsRange = { preset: "7", from: "2026-10-06", to: "2026-10-12", days: 7, previous: { from: "2026-09-29", to: "2026-10-05" } };
  const LAST = new Date("2026-10-12T20:59:59.000Z");
  const BEFORE = new Date("2026-10-05T20:59:59.000Z");

  async function setup(s: DataStore, appType: AppType, connector: ConnectorConfig) {
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(s, { name: "Cedar", email: `cedar-${suffix}@sales.test`, whatsapp: "+905446731948", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, appType), backend: "hosted", connector };
    await s.createApp(app);
    let n = 0;
    const user = async () => (await s.createHostedUser({ appId: app.id, phone: `+90533${suffix.replace(/\D/g, "").padEnd(3, "1").slice(0, 3)}${String(n++).padStart(4, "0")}`, name: `Person ${n}`, email: null, city: null, now: days(-30) }))!;
    const order = async (cents: number, paidAt: Date | null) => {
      const created = await s.createCatalogOrder({
        appId: app.id,
        tokenHash: randomUUID().replace(/-/g, ""),
        userId: null,
        status: "pending",
        lines: [{ productId: 1, name: "Course", quantity: 1, unitCents: cents, imageAssetId: null, digital: true }],
        subtotalCents: cents,
        shippingCents: 0,
        totalCents: cents,
        currency: "TRY",
        customer: null,
        paymentId: null,
        createdAt: days(-10),
        paidAt: null,
        updatedAt: days(-10),
        commissionCents: null,
        itemTransactionIds: null,
        payoutApprovedAt: null,
      });
      if (paidAt) await s.payCatalogOrder(app.id, created.id, `PAY-${created.id}`, paidAt);
      return created;
    };
    return { app, user, order };
  }

  it("sums a week's paid orders, refunds and enrolments beside the week before, with conversion over item views", async () => {
    const s = store();
    const { app, user, order } = await setup(s, "lms", { kind: "courses" });
    const refunded = await order(1_000, NOW);
    await order(2_000, LAST);
    await order(500, BEFORE);
    await order(9_000, null);
    expect(
      await s.recordRefund({
        appId: app.id,
        kind: "order",
        targetId: refunded.id,
        amountCents: 400,
        currency: "TRY",
        reason: "buyer_request",
        note: null,
        provider: "iyzico",
        method: "manual",
        parts: [],
        providerRef: null,
        commissionCents: null,
        revoked: { tickets: [], courses: [], memberships: [] },
        byUserId: null,
        byEmail: "owner@sales.test",
        createdAt: NOW,
      }),
    ).not.toBeNull();
    const [a, b, c] = [await user(), await user(), await user()];
    await s.enrollInCourse({ appId: app.id, userId: a.id, courseId: 1, source: "paid", enrolledAt: NOW });
    await s.enrollInCourse({ appId: app.id, userId: b.id, courseId: 1, source: "free", enrolledAt: days(-1) });
    await s.enrollInCourse({ appId: app.id, userId: c.id, courseId: 1, source: "paid", enrolledAt: BEFORE });
    await s.saveAnalyticsDaily(app.id, "2026-10-08", [
      { metric: "event", key: "item_view", label: null, value: 30 },
      { metric: "event", key: "app_open", label: null, value: 99 },
    ]);
    await s.saveAnalyticsDaily(app.id, "2026-10-10", [{ metric: "event", key: "item_view", label: null, value: 10 }]);
    await s.saveAnalyticsDaily(app.id, "2026-10-01", [{ metric: "event", key: "item_view", label: null, value: 500 }]);

    const sales = await loadSales(s, app, RANGE, ZONE);
    expect(sales.shows).toEqual({ orders: true, refunds: true, enrolments: true, bookings: false, tickets: false, donations: false });
    expect(sales.current).toMatchObject({
      orders: { count: 2, totals: [{ currency: "TRY", cents: 2_600 }] },
      refunds: { count: 1, totals: [{ currency: "TRY", cents: 400 }] },
      enrolments: { total: 2, paid: 1 },
      donations: { count: 0, totals: [] },
    });
    expect(sales.previous).toMatchObject({ orders: { count: 1, totals: [{ currency: "TRY", cents: 500 }] }, refunds: { count: 0, totals: [] }, enrolments: { total: 1, paid: 1 } });
    expect(sales.views).toBe(40);
    expect(sales.conversion).toBe(0.05);
  });

  it("counts appointments when they were booked, whatever became of them", async () => {
    const s = store();
    const { app, user } = await setup(s, "booking", { kind: "bookings" });
    const someone = await user();
    const book = async (createdAt: Date, hour: number, status: "approved" | "cancelled") =>
      s.createBookingAppointment({
        appId: app.id,
        userId: someone.id,
        serviceId: 10,
        staffId: 20,
        serviceName: "Haircut",
        staffName: "Ayşe",
        customerName: "Elif",
        customerPhone: null,
        customerEmail: null,
        startAt: new Date(Date.UTC(2026, 10, 1, hour)),
        endAt: new Date(Date.UTC(2026, 10, 1, hour, 30)),
        status,
        priceCents: 0,
        currency: "TRY",
        notes: null,
        answers: null,
        createdAt,
        updatedAt: createdAt,
      });
    await book(NOW, 9, "approved");
    await book(days(-2), 10, "cancelled");
    await book(BEFORE, 11, "approved");
    const sales = await loadSales(s, app, RANGE, ZONE);
    expect(sales.shows).toMatchObject({ orders: true, bookings: true, enrolments: false });
    expect(sales.current.bookings).toBe(2);
    expect(sales.previous.bookings).toBe(1);
    expect(sales.conversion).toBeNull();
  });
}
