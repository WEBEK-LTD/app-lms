import { beforeEach, describe, expect, it } from "vitest";
import { defaultKind, kindById, kindOf, KINDS } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import { CLASS_WEEKS, classWhen, parseClassTemplate, plannedClasses, syncClassSessions } from "@/lib/bookings/classes";
import { membershipEnd, membershipToUse, parseMembershipPlan } from "@/lib/bookings/memberships";
import { bookingSetup, bookingWords } from "@/lib/bookings/setup";
import { localToUtc } from "@/lib/bookings/time";
import { startPaidMemberships } from "@/lib/catalog/payment";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_BOOKING_RULES, type App, type BookingSetup, type Membership, type TimeRange } from "@/lib/data/types";
import { placeDemoOrder } from "@/lib/demo/checkout";
import { BookingsConnector } from "@/lib/hosted/connectors/bookings";
import { notifyClassCancelled } from "@/lib/hosted/notify";
import { LogSender } from "@/lib/hosted/otp-sender";
import type { ServiceAccount } from "@/lib/hosted/push";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { defaultLayout } from "@/lib/pages/defaults";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const WEEK: TimeRange[][] = [[], ...Array.from({ length: 6 }, () => [{ start: "09:00", end: "20:00" }])];
const TZ = "Europe/Istanbul";
// NOW is Monday 12 October 2026, 13:00 in Istanbul.

/** Pulse Studio: yoga on Mondays and Wednesdays at 18:00 (3 spots), spin on Tuesdays at 07:30, two plans. */
function studio(): BookingSetup {
  return {
    rules: { ...DEFAULT_BOOKING_RULES, timezone: TZ, cancelBeforeMinutes: 120, minMinutesAhead: 0 },
    categories: [],
    services: [
      { id: 1, categoryId: null, name: "Yoga flow", description: "", durationMinutes: 60, priceCents: 0, imageAssetId: "img-yoga", color: "#1D6B48", active: true },
      { id: 2, categoryId: null, name: "Spin", description: "", durationMinutes: 45, priceCents: 0, imageAssetId: null, color: null, active: true },
      { id: 3, categoryId: null, name: "Personal training", description: "", durationMinutes: 60, priceCents: 90000, imageAssetId: null, color: null, active: true },
    ],
    staff: [
      { id: 10, name: "Selin Aydın", title: "Yoga coach", imageAssetId: null, serviceIds: [1, 3], hours: WEEK, daysOff: [], active: true },
      { id: 11, name: "Can Yılmaz", title: "Spin coach", imageAssetId: null, serviceIds: [2], hours: WEEK, daysOff: [], active: true },
    ],
    nextId: 40,
    classTemplates: [
      { id: 20, serviceId: 1, staffId: 10, weekday: 1, time: "18:00", durationMinutes: 60, capacity: 3, active: true },
      { id: 21, serviceId: 1, staffId: 10, weekday: 3, time: "18:00", durationMinutes: 60, capacity: 3, active: true },
      { id: 22, serviceId: 2, staffId: 11, weekday: 2, time: "07:30", durationMinutes: 45, capacity: 10, active: true },
    ],
    membershipPlans: [
      { id: 30, name: "Monthly unlimited", description: "Every class, every day.", priceCents: 150000, period: "month", credits: null, active: true },
      { id: 31, name: "5-class pack", description: "", priceCents: 60000, period: "pack", credits: 5, active: true },
      { id: 32, name: "Old plan", description: "", priceCents: 10000, period: "year", credits: null, active: false },
    ],
    membershipRequired: true,
  };
}

describe("the Gym & fitness kind", () => {
  it("is the bookings engine with the fitness vertical, its words, tabs and review note", () => {
    const kind = kindById("fitness")!;
    expect(kind).toMatchObject({ engine: "booking", vertical: "fitness", name: "Gym & fitness", icon: "fitness_center", demo: { slug: "fitness" } });
    expect(kind.description).toBe("Class timetables, booking a spot, and memberships for gyms, studios and coaches.");
    expect(kindOf({ appType: "booking", vertical: "fitness" }).id).toBe("fitness");
    expect(defaultKind("booking").id).toBe("bookings");
    expect(kind.wording!.nav.items.map((i) => i.href)).toEqual([
      "/dashboard/services",
      "/dashboard/timetable",
      "/dashboard/memberships",
      "/dashboard/members",
      // 63
      "/dashboard/members/check-in",
      "/dashboard/appointments",
      "/dashboard/orders",
    ]);
    expect(kind.reviewNote).toContain("3.1.3(e)");
    expect(bookingWords("fitness")).toMatchObject({ page: "Classes & coaches", team: "Coaches", customer: "member" });
    // Every kind has a unique id and marketing page.
    expect(new Set(KINDS.map((k) => k.id)).size).toBe(KINDS.length);
    expect(new Set(KINDS.map((k) => k.marketing.slug)).size).toBe(KINDS.length);
  });

  it("starts a gym's app with Classes, Membership and My bookings tabs", () => {
    const layout = defaultLayout(
      { appType: "booking", vertical: "fitness", backend: "hosted", appName: "Pulse", template: "classic", font: "Outfit", brandingDoneAt: null },
      { appearance: { template: "classic", theme_mode: "system", user_can_change_mode: true, secondary_color: null, font: "Outfit", corners: "soft", cards: "flat" }, languages: { default: "en", available: ["en"] } } as never,
      NOW,
    );
    expect(layout.tabs.map((t) => [t.label, t.target])).toEqual([
      ["Home", { type: "page", page_slug: "home" }],
      ["Classes", { type: "screen", screen: "classes" }],
      ["Membership", { type: "screen", screen: "memberships" }],
      ["My bookings", { type: "screen", screen: "appointments" }],
      ["Account", { type: "screen", screen: "account" }],
    ]);
  });
});

describe("timetable and plan forms", () => {
  it("checks a class on the timetable", () => {
    const setup = studio();
    expect(parseClassTemplate({ serviceId: "1", staffId: "10", weekday: "5", time: "09:15", duration: "50", capacity: "8", active: "on" }, setup)).toEqual({
      ok: true,
      value: { serviceId: 1, staffId: 10, weekday: 5, time: "09:15", durationMinutes: 50, capacity: 8, active: true },
    });
    const bad = parseClassTemplate({ serviceId: "9", staffId: "", weekday: "7", time: "25:00", duration: "5", capacity: "0" }, setup);
    expect(bad.ok ? null : Object.keys(bad.errors).sort()).toEqual(["capacity", "duration", "serviceId", "staffId", "time", "weekday"]);
  });

  it("checks a plan: unlimited, credits, and a pack always has credits", () => {
    expect(parseMembershipPlan({ name: "Monthly", price: "1.500,00", period: "month", credits: "", description: "", active: "on" })).toEqual({
      ok: true,
      value: { name: "Monthly", description: "", priceCents: 150000, period: "month", credits: null, active: true },
    });
    const pack = parseMembershipPlan({ name: "Pack", price: "600", period: "pack", credits: "" });
    expect(pack.ok ? null : pack.errors).toEqual({ credits: "A class pack needs a number of classes." });
    const wrong = parseMembershipPlan({ name: "x", price: "0", period: "week", credits: "-2" });
    expect(wrong.ok ? null : Object.keys(wrong.errors).sort()).toEqual(["credits", "name", "period", "price"]);
  });

  it("ends a membership after its period, on the month's last day when needed", () => {
    expect(membershipEnd("month", new Date("2026-01-31T10:00:00Z"))!.toISOString()).toBe("2026-02-28T10:00:00.000Z");
    expect(membershipEnd("quarter", new Date("2026-10-12T10:00:00Z"))!.toISOString()).toBe("2027-01-12T10:00:00.000Z");
    expect(membershipEnd("year", new Date("2028-02-29T10:00:00Z"))!.toISOString()).toBe("2029-02-28T10:00:00.000Z");
    expect(membershipEnd("pack", NOW)).toBeNull();
  });

  it("uses an unlimited membership first, then the one with credits that ends first", () => {
    const m = (id: number, creditsLeft: number | null, endsAt: string | null, status: "active" | "cancelled" = "active"): Membership => ({
      id,
      appId: "a",
      userId: 1,
      planId: 1,
      planName: "",
      period: "month",
      creditsLeft,
      status,
      startsAt: new Date("2026-10-01T00:00:00Z"),
      endsAt: endsAt ? new Date(endsAt) : null,
      orderId: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(membershipToUse([], NOW)).toEqual({ ok: false, reason: "membership_required" });
    expect(membershipToUse([m(1, 3, "2026-10-01T00:00:00Z"), m(2, null, null, "cancelled")], NOW)).toEqual({ ok: false, reason: "membership_required" });
    expect(membershipToUse([m(1, 0, null)], NOW)).toEqual({ ok: false, reason: "no_credits" });
    const pick = (list: Membership[]) => {
      const r = membershipToUse(list, NOW);
      return r.ok ? r.membership.id : r.reason;
    };
    expect(pick([m(1, 4, null), m(2, 2, "2026-11-01T00:00:00Z"), m(3, null, "2026-12-01T00:00:00Z")])).toBe(3);
    expect(pick([m(1, 4, null), m(2, 2, "2026-11-01T00:00:00Z")])).toBe(2);
  });
});

describe("classes and memberships on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let phones = 0;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = {
      ...newApp(client.id, null, NOW, "booking", "fitness"),
      backend: "hosted",
      appName: "Pulse Studio",
      websiteDoneAt: NOW,
      connector: { kind: "bookings" },
      bookingSetup: studio(),
      catalogSettings: { currency: "TRY", shippingCents: 0, freeShippingOverCents: null, payment: { provider: "iyzico", apiKeyEncrypted: "k", secretKeyEncrypted: "s", sandbox: true } },
    };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
    phones = 0;
    await syncClassSessions(store, app, NOW);
  });

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    connector: new BookingsConnector({ store, app, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" }),
  });

  async function call(
    method: string,
    route: string,
    options: { body?: unknown; token?: string | null; query?: Record<string, string>; params?: string[] } = {},
  ): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), {
      method,
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
    });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(name = "Elif Şahin") {
    phones += 1;
    const phone = `53212345${String(phones).padStart(2, "0")}`;
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+90${phone}`)!, device: DEVICE } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: DEVICE } });
    const body = registered.body as { access_token: string; user: { id: number } };
    return { token: body.access_token, id: body.user.id };
  }

  /** Buys a plan on the payment page (as iyzico's confirmed callback does); the membership starts. */
  async function buy(token: string, planId: number) {
    const link = await call("POST", "/memberships/checkout-link", { token, query: { platform: "ios" }, body: { plan_id: planId } });
    expect(link.status).toBe(200);
    expect((link.body as { url: string }).url).toMatch(/^https:\/\/yallapp\.test\/pay\/[A-Za-z0-9_-]+$/);
    const order = (await store.listCatalogOrders({ appId: app.id, offset: 0, limit: 1 })).items[0]!;
    expect(order).toMatchObject({ status: "pending", totalCents: studio().membershipPlans!.find((p) => p.id === planId)!.priceCents, currency: "TRY" });
    expect(await store.payCatalogOrder(app.id, order.id, `pay-${order.id}`, now)).toBe(true);
    await startPaidMemberships(store, app, order, now);
    return order;
  }

  const mondayYoga = () => localToUtc("2026-10-12", "18:00", TZ).toISOString();

  it("makes the timetable's classes for 8 weeks, once, and follows changes", async () => {
    const planned = plannedClasses(bookingSetup(app), NOW);
    // Today's 18:00 yoga is still ahead: 8 Mondays, 8 Wednesdays, 8 Tuesdays.
    expect(planned).toHaveLength(3 * CLASS_WEEKS);
    let sessions = await store.listClassSessions({ appId: app.id });
    expect(sessions).toHaveLength(24);
    expect(sessions[0]).toMatchObject({ serviceName: "Yoga flow", staffName: "Selin Aydın", capacity: 3, bookedCount: 0, status: "scheduled", startAt: new Date(mondayYoga()) });
    expect(await syncClassSessions(store, app, NOW)).toEqual({ created: 0, updated: 0, removed: 0 });

    // A spot in Wednesday's class keeps it when Wednesdays leave the timetable; the empty ones go.
    const { token } = await signUp();
    await buy(token, 30);
    const wednesday = sessions.find((s) => s.templateId === 21)!;
    expect((await call("POST", "/bookings/classes/{class_id}/book", { token, params: [String(wednesday.id)] })).status).toBe(200);
    const setup = studio();
    app = { ...app, bookingSetup: { ...setup, classTemplates: setup.classTemplates!.filter((t) => t.id !== 21).map((t) => (t.id === 20 ? { ...t, capacity: 12 } : t)) } };
    expect(await syncClassSessions(store, app, NOW)).toEqual({ created: 0, updated: 8, removed: 7 });
    sessions = await store.listClassSessions({ appId: app.id });
    expect(sessions).toHaveLength(17);
    expect(sessions.filter((s) => s.templateId === 21).map((s) => s.id)).toEqual([wednesday.id]);
    expect(sessions.find((s) => s.templateId === 20)!.capacity).toBe(12);
    // A week later, the daily job adds the ninth week's classes.
    expect((await syncClassSessions(store, app, new Date(NOW.getTime() + 7 * 86_400_000))).created).toBe(2);
  });

  it("sends the classes settings in the config and the week's classes with spots left", async () => {
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { bookings: Record<string, unknown> };
    expect(config.bookings.classes).toEqual({ membership_required: true, cancel_before_minutes: 120, memberships: true });
    const week = (await call("GET", "/bookings/classes", { query: { from: "2026-10-12" } })).body as { timezone: string; items: Record<string, unknown>[] };
    expect(week.timezone).toBe(TZ);
    expect(week.items.map((c) => `${c.local_date} ${c.local_time}`)).toEqual([
      "2026-10-12 18:00",
      "2026-10-13 07:30",
      "2026-10-14 18:00",
      "2026-10-19 18:00",
      "2026-10-20 07:30",
      "2026-10-21 18:00",
    ].slice(0, 3));
    expect(week.items[0]).toMatchObject({
      status: "scheduled",
      service: { id: 1, name: "Yoga flow", image_url: "https://yallapp.test/api/v1/assets/img-yoga", color: "#1D6B48" },
      staff: { id: 10, name: "Selin Aydın", title: "Yoga coach" },
      capacity: 3,
      spots_left: 3,
      booked: false,
      can_cancel: false,
    });
    expect((await call("GET", "/bookings/classes", { query: { from: "2026-10-12", to: "2026-10-25" } })).body).toMatchObject({ items: { length: 6 } });
    expect((await call("GET", "/bookings/classes", { query: { from: "12-10-2026" } })).status).toBe(400);
    expect((await call("GET", "/bookings/classes", { query: { from: "2026-10-12", to: "2026-12-12" } })).status).toBe(400);
    // Plans on sale: the old one is off sale.
    const plans = (await call("GET", "/memberships/plans")).body as { items: { name: string }[] };
    expect(plans.items).toEqual([
      { id: 30, name: "Monthly unlimited", price: { amount: "1500.00", currency: "TRY", formatted: "₺1,500.00", free: false }, period: "month", credits: null, description: "Every class, every day." },
      { id: 31, name: "5-class pack", price: { amount: "600.00", currency: "TRY", formatted: "₺600.00", free: false }, period: "pack", credits: 5, description: null },
    ]);
  });

  it("needs a membership, uses and gives back credits, and keeps the cancellation window", async () => {
    const { token } = await signUp();
    const yoga = (await store.listClassSessions({ appId: app.id }))[0]!;
    const book = (id: number) => call("POST", "/bookings/classes/{class_id}/book", { token, params: [String(id)] });
    const cancel = (id: number) => call("POST", "/bookings/classes/{class_id}/cancel", { token, params: [String(id)] });
    expect((await call("POST", "/bookings/classes/{class_id}/book", { params: [String(yoga.id)] })).status).toBe(401);
    expect(await book(yoga.id)).toMatchObject({ status: 403, body: { code: "membership_required" } });
    expect((await call("GET", "/me/memberships", { token })).body).toEqual({ items: [] });

    // An iPhone can buy a membership too: it's for classes at the studio.
    await buy(token, 31);
    const mine = (await call("GET", "/me/memberships", { token })).body as { items: Record<string, unknown>[] };
    expect(mine.items).toEqual([
      {
        id: expect.any(Number),
        plan: { id: 31, name: "5-class pack", period: "pack" },
        status: "active",
        starts_at: now.toISOString(),
        ends_at: null,
        credits_left: 5,
        // 63 The member's code for the gym's door.
        member_code: { code: expect.stringMatching(/^[A-HJ-NP-Z2-9]{12}$/), qr_payload: expect.stringMatching(/^YM1\.\d+\.[A-HJ-NP-Z2-9]{12}$/) },
      },
    ]);
    const booked = await book(yoga.id);
    expect(booked).toMatchObject({ status: 200, body: { booked: true, spots_left: 2, can_cancel: true } });
    // Booking again answers the same spot without using a credit.
    expect(await book(yoga.id)).toMatchObject({ status: 200, body: { booked: true, spots_left: 2 } });
    expect(((await call("GET", "/me/memberships", { token })).body as { items: { credits_left: number }[] }).items[0]!.credits_left).toBe(4);
    expect(((await call("GET", "/bookings/classes", { token, query: { from: "2026-10-12", to: "2026-10-12" } })).body as { items: { booked: boolean }[] }).items[0]!.booked).toBe(true);

    expect(await cancel(yoga.id)).toMatchObject({ status: 200, body: { booked: false, spots_left: 3 } });
    expect(((await call("GET", "/me/memberships", { token })).body as { items: { credits_left: number }[] }).items[0]!.credits_left).toBe(5);
    expect(await cancel(yoga.id)).toMatchObject({ status: 404 });

    // Less than 2 hours before: the spot can't be given back in the app. Started classes can't be booked.
    expect((await book(yoga.id)).status).toBe(200);
    const other = await signUp("Deniz");
    await buy(other.token, 30);
    const connector = context().connector!;
    const as = async (userId: number, at: Date, path: string[]) =>
      (await connector.handle({ method: "POST", path, query: new URLSearchParams(), body: null, user: await store.getHostedUser(app.id, userId), now: at }))!;
    const me = (await store.listMemberships({ appId: app.id })).find((m) => m.planId === 31)!.userId;
    const hourBefore = new Date(new Date(mondayYoga()).getTime() - 60 * 60_000);
    expect(await as(me, hourBefore, ["bookings", "classes", String(yoga.id), "cancel"])).toMatchObject({ status: 409, body: { code: "too_late" } });
    const started = new Date(new Date(mondayYoga()).getTime() + 60_000);
    expect(await as(other.id, started, ["bookings", "classes", String(yoga.id), "book"])).toMatchObject({ status: 409, body: { code: "too_late" } });
    const later = (await store.listClassSessions({ appId: app.id }))[1]!;
    expect(await as(other.id, started, ["bookings", "classes", String(later.id), "book"])).toMatchObject({ status: 200 });
    expect(await call("POST", "/bookings/classes/{class_id}/book", { token: other.token, params: ["999999"] })).toMatchObject({ status: 404 });
  });

  it("runs out of credits", async () => {
    const { token, id } = await signUp();
    const sessions = await store.listClassSessions({ appId: app.id });
    await store.createMembership({
      appId: app.id,
      userId: id,
      planId: 31,
      planName: "5-class pack",
      period: "pack",
      creditsLeft: 1,
      status: "active",
      startsAt: NOW,
      endsAt: null,
      orderId: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect((await call("POST", "/bookings/classes/{class_id}/book", { token, params: [String(sessions[0]!.id)] })).status).toBe(200);
    expect(await call("POST", "/bookings/classes/{class_id}/book", { token, params: [String(sessions[1]!.id)] })).toMatchObject({ status: 403, body: { code: "no_credits" } });
    const [membership] = await store.listMemberships({ appId: app.id, userId: id });
    await store.addMembershipCredits(app.id, membership!.id, 3, NOW);
    expect((await call("POST", "/bookings/classes/{class_id}/book", { token, params: [String(sessions[1]!.id)] })).status).toBe(200);
    expect((await store.getMembership(app.id, membership!.id))!.creditsLeft).toBe(2);
  });

  it("books without a membership when classes don't need one, and says when a class is full", async () => {
    app = { ...app, bookingSetup: { ...studio(), membershipRequired: false } };
    const yoga = (await store.listClassSessions({ appId: app.id }))[0]!;
    for (const name of ["A", "B", "C"]) {
      const { token } = await signUp(name);
      expect((await call("POST", "/bookings/classes/{class_id}/book", { token, params: [String(yoga.id)] })).status).toBe(200);
    }
    const late = await signUp("D");
    expect(await call("POST", "/bookings/classes/{class_id}/book", { token: late.token, params: [String(yoga.id)] })).toMatchObject({ status: 409, body: { code: "class_full" } });
    expect((await store.listClassBookings({ appId: app.id, sessionIds: [yoga.id], status: "booked" })).map((b) => b.customerName)).toEqual(["A", "B", "C"]);
  });

  it("never overbooks when many book at once, and never uses the last credit twice", async () => {
    const yoga = (await store.listClassSessions({ appId: app.id }))[0]!;
    const users = [];
    for (let i = 0; i < 12; i += 1) {
      const user = await signUp(`Member ${i}`);
      await store.createMembership({
        appId: app.id,
        userId: user.id,
        planId: 30,
        planName: "Monthly unlimited",
        period: "month",
        creditsLeft: null,
        status: "active",
        startsAt: NOW,
        endsAt: membershipEnd("month", NOW),
        orderId: null,
        createdAt: NOW,
        updatedAt: NOW,
      });
      users.push(user);
    }
    const results = await Promise.all(users.map((u) => call("POST", "/bookings/classes/{class_id}/book", { token: u.token, params: [String(yoga.id)] })));
    expect(results.filter((r) => r.status === 200)).toHaveLength(3);
    expect(results.filter((r) => r.status === 409 && (r.body as { code: string }).code === "class_full")).toHaveLength(9);
    expect((await store.getClassSession(app.id, yoga.id))!.bookedCount).toBe(3);
    expect(await store.listClassBookings({ appId: app.id, sessionIds: [yoga.id], status: "booked" })).toHaveLength(3);

    // One credit, three classes booked at the same moment: one gets it.
    const { id } = await signUp("Last credit");
    await store.createMembership({ appId: app.id, userId: id, planId: 31, planName: "Pack", period: "pack", creditsLeft: 1, status: "active", startsAt: NOW, endsAt: null, orderId: null, createdAt: NOW, updatedAt: NOW });
    const others = (await store.listClassSessions({ appId: app.id })).slice(1, 4);
    const tries = await Promise.all(
      others.map((s) =>
        store.bookClass({ appId: app.id, sessionId: s.id, userId: id, customerName: "Last credit", customerPhone: null, customerEmail: null, membershipRequired: true, bookableFrom: NOW, now: NOW }),
      ),
    );
    expect(tries.filter((t) => t.ok)).toHaveLength(1);
    expect(tries.filter((t) => !t.ok && t.reason === "no_credits")).toHaveLength(2);
    expect((await store.listMemberships({ appId: app.id, userId: id }))[0]!.creditsLeft).toBe(0);
  });

  it("calls a class off: spots and credits come back, and members are told", async () => {
    const { token, id } = await signUp();
    await buy(token, 31);
    const yoga = (await store.listClassSessions({ appId: app.id }))[0]!;
    expect((await call("POST", "/bookings/classes/{class_id}/book", { token, params: [String(yoga.id)] })).status).toBe(200);
    const released = await store.cancelClassSession(app.id, yoga.id, now);
    expect(released.map((b) => b.userId)).toEqual([id]);
    expect(await store.cancelClassSession(app.id, yoga.id, now)).toEqual([]);
    expect((await store.listMemberships({ appId: app.id, userId: id }))[0]!.creditsLeft).toBe(5);
    const listed = ((await call("GET", "/bookings/classes", { token, query: { from: "2026-10-12", to: "2026-10-12" } })).body as { items: Record<string, unknown>[] }).items[0]!;
    expect(listed).toMatchObject({ status: "cancelled", spots_left: 0, booked: false });
    expect(await call("POST", "/bookings/classes/{class_id}/book", { token, params: [String(yoga.id)] })).toMatchObject({ status: 409, body: { code: "class_cancelled" } });
    // A cancelled class isn't made again by the timetable.
    expect((await syncClassSessions(store, app, now)).created).toBe(0);

    expect((await call("PUT", "/me/push-token", { token, body: { token: "fcm-token-1" } })).status).toBe(204);
    const pushes: { tokens: unknown[]; title: string; body: string }[] = [];
    const account: ServiceAccount = { project_id: "p", client_email: "c@p.iam", private_key: "-----BEGIN PRIVATE KEY-----" };
    const result = await notifyClassCancelled({
      store,
      app,
      className: yoga.serviceName,
      when: classWhen(yoga.startAt, TZ),
      userIds: [id, id],
      account,
      now,
      send: async (_account, tokens, message) => {
        pushes.push({ tokens, title: message.title, body: message.body });
        return { sent: tokens.length, invalidTokens: [] };
      },
    });
    expect(result).toEqual({ notified: 1, pushed: 1 });
    expect(pushes).toEqual([{ tokens: ["fcm-token-1"], title: "Yoga flow is cancelled", body: expect.stringContaining("Your spot is free") }]);
    const inbox = (await call("GET", "/me/notifications", { token })).body as { items: { title: string; body: string }[] };
    expect(inbox.items[0]).toMatchObject({ title: "Yoga flow is cancelled", body: "Yoga flow on Mon 12 Oct, 18:00 is cancelled. Your spot is free and any class credit it used is back on your membership." });
  });

  it("starts a paid membership once, and sells nothing without card payments", async () => {
    const { token, id } = await signUp();
    const order = await buy(token, 30);
    await startPaidMemberships(store, app, (await store.getCatalogOrder(app.id, order.id))!, now);
    const memberships = await store.listMemberships({ appId: app.id, userId: id });
    expect(memberships).toHaveLength(1);
    expect(memberships[0]).toMatchObject({ planId: 30, planName: "Monthly unlimited", creditsLeft: null, orderId: order.id, endsAt: membershipEnd("month", now) });
    expect((await store.getCatalogOrder(app.id, order.id))!.status).toBe("completed");

    expect(await call("POST", "/memberships/checkout-link", { token, query: { platform: "android" }, body: { plan_id: 32 } })).toMatchObject({ status: 404 });
    // A demo gym's payment page charges nothing: "Place demo order" starts the membership too.
    const demo = { ...app, demo: true };
    const link = await call("POST", "/memberships/checkout-link", { token, query: { platform: "android" }, body: { plan_id: 31 } });
    expect(link.status).toBe(200);
    const pending = (await store.listCatalogOrders({ appId: app.id, offset: 0, limit: 1 })).items[0]!;
    expect(await placeDemoOrder(store, demo, pending, now)).toBe(true);
    expect(await store.listMemberships({ appId: app.id, userId: id })).toHaveLength(2);

    app = { ...app, catalogSettings: null };
    expect(await call("POST", "/memberships/checkout-link", { token, query: { platform: "android" }, body: { plan_id: 30 } })).toMatchObject({ status: 403, body: { code: "feature_disabled" } });
    expect((await call("GET", "/memberships/plans")).body).toEqual({ items: [] });
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { bookings: { classes: { memberships: boolean } } };
    expect(config.bookings.classes.memberships).toBe(false);
  });

  it("frees a demo's spots and memberships after a day", async () => {
    const { token, id } = await signUp();
    await buy(token, 30);
    const yoga = (await store.listClassSessions({ appId: app.id }))[0]!;
    expect((await call("POST", "/bookings/classes/{class_id}/book", { token, params: [String(yoga.id)] })).status).toBe(200);
    const counts = await store.purgeDemoActivity(app.id, new Date(now.getTime() + 1000));
    expect(counts).toMatchObject({ classBookings: 1, memberships: 1 });
    expect((await store.getClassSession(app.id, yoga.id))!.bookedCount).toBe(0);
    expect(await store.listMemberships({ appId: app.id, userId: id })).toEqual([]);
  });

  it("answers 404 for classes in an app without a timetable", async () => {
    app = { ...app, bookingSetup: { ...studio(), classTemplates: [], membershipPlans: [] } };
    expect((await call("GET", "/bookings/classes", { query: { from: "2026-10-12" } })).status).toBe(404);
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { bookings: Record<string, unknown> };
    expect(config.bookings.classes).toBeUndefined();
  });

  it("keeps a coach's class time out of their personal sessions", async () => {
    const free = (await call("GET", "/bookings/availability", { query: { service: "3", from: "2026-10-12", days: "1" } })).body as { days: { slots: { local_time: string }[] }[] };
    const times = free.days[0]!.slots.map((s) => s.local_time);
    expect(times).toContain("16:30");
    expect(times).not.toContain("17:30");
    expect(times).not.toContain("18:00");
    expect(times).toContain("19:00");
  });
});
