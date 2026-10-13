import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { freeTimes } from "@/lib/bookings/availability";
import { newAppointmentMail } from "@/lib/bookings/mail";
import { addDays, localToUtc, utcToLocal } from "@/lib/bookings/time";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_BOOKING_RULES, type App, type BookingAppointment, type BookingSetup, type TimeRange } from "@/lib/data/types";
import { BookingsConnector } from "@/lib/hosted/connectors/bookings";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const WEEK: TimeRange[][] = [[], ...Array.from({ length: 6 }, () => [{ start: "09:00", end: "17:00" }])];
// NOW is Monday 12 October 2026, 13:00 in Istanbul; the checks use the next Monday.
const MONDAY = "2026-10-19";

function salon(): BookingSetup {
  return {
    rules: { ...DEFAULT_BOOKING_RULES, timezone: "Europe/Istanbul", cancelBeforeMinutes: 60 },
    categories: [
      { id: 1, name: "Hair" },
      { id: 2, name: "Spa" },
      { id: 3, name: "Empty" },
    ],
    services: [
      { id: 10, categoryId: 1, name: "Haircut", description: "A wash and a cut.", durationMinutes: 30, priceCents: 30000, imageAssetId: "img-cut", color: "#1D6B48", active: true },
      { id: 11, categoryId: 1, name: "Hair colouring", description: "", durationMinutes: 90, priceCents: 90000, imageAssetId: null, color: null, active: true },
      { id: 12, categoryId: 2, name: "Massage", description: "", durationMinutes: 60, priceCents: 60000, imageAssetId: null, color: null, active: true },
      { id: 13, categoryId: 2, name: "Hidden", description: "", durationMinutes: 30, priceCents: 0, imageAssetId: null, color: null, active: false },
      { id: 14, categoryId: 3, name: "Nobody does it", description: "", durationMinutes: 30, priceCents: 0, imageAssetId: null, color: null, active: true },
    ],
    staff: [
      { id: 20, name: "Ayşe Kaya", title: "Stylist", imageAssetId: null, serviceIds: [10, 11], hours: WEEK, daysOff: [], active: true },
      { id: 21, name: "Mehmet Demir", title: null, imageAssetId: null, serviceIds: [10, 12, 13], hours: WEEK, daysOff: [addDays(MONDAY, 1)], active: true },
    ],
    nextId: 30,
  };
}

describe("time zones", () => {
  it("turns local times into instants and back", () => {
    expect(localToUtc("2026-10-19", "09:00", "Europe/Istanbul").toISOString()).toBe("2026-10-19T06:00:00.000Z");
    expect(localToUtc("2026-03-29", "09:00", "Europe/London").toISOString()).toBe("2026-03-29T08:00:00.000Z");
    expect(localToUtc("2026-01-10", "09:00", "Europe/London").toISOString()).toBe("2026-01-10T09:00:00.000Z");
    expect(utcToLocal(new Date("2026-10-18T22:30:00Z"), "Europe/Istanbul")).toEqual({ date: "2026-10-19", time: "01:30", weekday: 1 });
  });
});

describe("free times", () => {
  it("follows hours, days off, appointments, lead time and how far ahead", () => {
    const setup = salon();
    const busy: Pick<BookingAppointment, "staffId" | "startAt" | "endAt">[] = [
      { staffId: 20, startAt: localToUtc(MONDAY, "10:00", "Europe/Istanbul"), endAt: localToUtc(MONDAY, "10:30", "Europe/Istanbul") },
    ];
    const [monday, tuesday] = freeTimes({ setup, serviceId: 10, staffId: null, from: MONDAY, days: 2, now: NOW, appointments: busy });
    expect(monday!.slots[0]).toMatchObject({ localTime: "09:00", staffIds: [20, 21], start: new Date("2026-10-19T06:00:00Z") });
    expect(monday!.slots.at(-1)!.localTime).toBe("16:30");
    expect(monday!.slots.find((s) => s.localTime === "10:00")!.staffIds).toEqual([21]);
    expect(tuesday!.slots[0]!.staffIds).toEqual([20]);
    // Colouring takes 90 minutes: the last start is 15:30, and 09:30 clashes with 10:00 for Ayşe.
    const [colour] = freeTimes({ setup, serviceId: 11, staffId: 20, from: MONDAY, days: 1, now: NOW, appointments: busy });
    expect(colour!.slots.map((s) => s.localTime)).not.toContain("09:30");
    expect(colour!.slots.at(-1)!.localTime).toBe("15:30");
    // Today: nothing before 14:00 (an hour from now), Sunday closed, nothing past 60 days.
    const [today] = freeTimes({ setup, serviceId: 10, staffId: null, from: "2026-10-12", days: 1, now: NOW, appointments: [] });
    expect(today!.slots[0]!.localTime).toBe("14:00");
    expect(freeTimes({ setup, serviceId: 10, staffId: null, from: "2026-10-18", days: 1, now: NOW, appointments: [] })[0]!.slots).toEqual([]);
    expect(freeTimes({ setup, serviceId: 10, staffId: null, from: addDays("2026-10-12", 61), days: 1, now: NOW, appointments: [] })[0]!.slots).toEqual([]);
  });
});

describe("bookings on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let booked: BookingAppointment[];

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = { ...newApp(client.id, null, NOW, "booking"), backend: "hosted", appName: "Salon Lale", websiteDoneAt: NOW, connector: { kind: "bookings" }, bookingSetup: salon() };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
    booked = [];
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
    connector: new BookingsConnector({
      store,
      app,
      assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
      onBooked: async (a) => {
        booked.push(a);
      },
    }),
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

  async function signUp(phone = "5321234567", name = "Elif Şahin") {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+90${phone}`)!, device: DEVICE } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: DEVICE } });
    return (registered.body as { access_token: string }).access_token;
  }

  it("adds the bookings rules to the config", async () => {
    const body = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as Record<string, unknown>;
    expect(body.bookings).toEqual({
      plugin: "yallapp",
      plugin_version: "1",
      timezone: "Europe/Istanbul",
      currency: "TRY",
      staff_choice: true,
      notes: true,
      max_days_ahead: 60,
      min_minutes_ahead: 60,
      cancel_before_minutes: 60,
    });
  });

  it("lists categories, services and a service with its staff", async () => {
    expect((await call("GET", "/bookings/categories")).body).toEqual({
      items: [
        { id: 1, name: "Hair", count: 2, image_url: null },
        { id: 2, name: "Spa", count: 1, image_url: null },
      ],
    });
    const all = (await call("GET", "/bookings/services")).body as { items: { name: string }[]; total: number };
    expect(all.items.map((s) => s.name)).toEqual(["Haircut", "Hair colouring", "Massage"]);
    expect(all.items[0]).toMatchObject({ duration_minutes: 30, price: { amount: "300.00", formatted: "₺300.00", free: false }, image_url: "https://yallapp.test/api/v1/assets/img-cut" });
    expect((await call("GET", "/bookings/services", { query: { category: "2" } })).body).toMatchObject({ total: 1, items: [{ name: "Massage" }] });
    expect((await call("GET", "/bookings/services", { query: { search: "hair" } })).body).toMatchObject({ total: 2 });
    const cut = (await call("GET", "/bookings/services/{service_id}", { params: ["10"] })).body;
    expect(cut).toMatchObject({ description_html: "<p>A wash and a cut.</p>", staff: [{ name: "Ayşe Kaya", title: "Stylist" }, { name: "Mehmet Demir" }] });
    expect((await call("GET", "/bookings/services/{service_id}", { params: ["13"] })).status).toBe(404);
    expect((await call("GET", "/bookings/services/{service_id}", { params: ["14"] })).status).toBe(404);
  });

  it("books, refuses a taken time, lists and cancels", async () => {
    const week = (await call("GET", "/bookings/availability", { query: { service: "10", from: MONDAY, days: "7" } })).body as {
      timezone: string;
      days: { date: string; slots: { start: string; local_time: string; staff_ids: number[] }[] }[];
    };
    expect(week.timezone).toBe("Europe/Istanbul");
    expect(week.days).toHaveLength(7);
    expect(week.days[0]!.slots[0]).toMatchObject({ start: "2026-10-19T06:00:00.000Z", local_time: "09:00", staff_ids: [20, 21] });
    expect((await call("GET", "/bookings/availability", { query: { service: "12", staff: "20", from: MONDAY } })).status).toBe(400);
    expect((await call("GET", "/bookings/availability", { query: { service: "10", from: "19-10-2026" } })).status).toBe(400);

    const start = "2026-10-19T07:00:00.000Z";
    expect((await call("POST", "/bookings/appointments", { query: { platform: "android" }, body: { service_id: 10, start } })).status).toBe(401);
    const token = await signUp();
    const first = await call("POST", "/bookings/appointments", {
      query: { platform: "android" },
      token,
      body: { service_id: 10, staff_id: 20, start, notes: "Short on the sides." },
    });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ status: "approved", local_date: MONDAY, local_time: "10:00", staff: { name: "Ayşe Kaya" }, notes: "Short on the sides.", can_cancel: true });
    expect(booked).toHaveLength(1);
    const again = await call("POST", "/bookings/appointments", { query: { platform: "android" }, token, body: { service_id: 10, staff_id: 20, start } });
    expect(again).toMatchObject({ status: 409, body: { code: "slot_taken" } });
    // Anyone free: Mehmet still is.
    const anyone = await call("POST", "/bookings/appointments", { query: { platform: "android" }, token, body: { service_id: 10, start } });
    expect(anyone).toMatchObject({ status: 201, body: { staff: { name: "Mehmet Demir" } } });
    const after = (await call("GET", "/bookings/availability", { query: { service: "10", from: MONDAY, days: "1" } })).body as {
      days: { slots: { local_time: string }[] }[];
    };
    expect(after.days[0]!.slots.map((s) => s.local_time)).not.toContain("10:00");
    // A time that isn't offered.
    expect((await call("POST", "/bookings/appointments", { query: { platform: "android" }, token, body: { service_id: 10, start: "2026-10-19T07:10:00.000Z" } })).status).toBe(409);

    const upcoming = (await call("GET", "/me/appointments", { token })).body as { total: number; items: { id: number }[] };
    expect(upcoming.total).toBe(2);
    const id = String((first.body as { id: number }).id);
    expect((await call("GET", "/me/appointments/{appointment_id}", { token, params: [id] })).status).toBe(200);
    const other = await signUp("5321234568", "Can Yıldız");
    expect((await call("GET", "/me/appointments/{appointment_id}", { token: other, params: [id] })).status).toBe(404);
    expect((await call("POST", "/me/appointments/{appointment_id}/cancel", { token: other, params: [id] })).status).toBe(404);

    const home = (await call("GET", "/bookings/home", { token })).body as { sections: { type: string }[] };
    expect(home.sections.map((s) => s.type)).toEqual(["next_appointment", "categories", "services", "staff"]);

    const cancelled = await call("POST", "/me/appointments/{appointment_id}/cancel", { token, params: [id] });
    expect(cancelled.body).toMatchObject({ status: "cancelled", can_cancel: false });
    expect((await call("POST", "/me/appointments/{appointment_id}/cancel", { token, params: [id] })).body).toMatchObject({ code: "too_late" });
    expect((await call("GET", "/me/appointments", { token, query: { status: "past" } })).body).toMatchObject({ total: 1, items: [{ status: "cancelled" }] });
    const free = (await call("GET", "/bookings/availability", { query: { service: "10", staff: "20", from: MONDAY, days: "1" } })).body as {
      days: { slots: { local_time: string }[] }[];
    };
    expect(free.days[0]!.slots.map((s) => s.local_time)).toContain("10:00");
  });

  it("waits for approval when the business wants to approve, and tells it", async () => {
    app = { ...app, bookingSetup: { ...salon(), rules: { ...salon().rules, autoApprove: false, notes: false } } };
    const token = await signUp();
    const result = await call("POST", "/bookings/appointments", {
      query: { platform: "ios" },
      token,
      body: { service_id: 12, start: "2026-10-19T08:00:00.000Z", notes: "ignored" },
    });
    expect(result.body).toMatchObject({ status: "pending", status_label: "Pending", notes: null, staff: { name: "Mehmet Demir" } });
    const mail = newAppointmentMail(booked[0]!, "Europe/Istanbul", "Salon Lale", "https://yallapp.test/dashboard/appointments");
    expect(mail.subject).toBe("New appointment: Massage, 2026-10-19 11:00");
    expect(mail.text).toContain("Elif Şahin booked Massage with Mehmet Demir in Salon Lale.");
    expect(mail.text).toContain("It waits for your approval.");
  });
});

describe("Services & team forms", () => {
  it("checks the rules, a service and a team member", async () => {
    const { parseRules, parseService, parseStaff } = await import("@/lib/bookings/forms");
    expect(
      parseRules({ timezone: "Europe/Istanbul", currency: "TRY", slotStep: "15", minHoursAhead: "2", maxDaysAhead: "30", cancelHours: "", notes: "on", autoApprove: "" }),
    ).toEqual({
      ok: true,
      value: { timezone: "Europe/Istanbul", currency: "TRY", slotStepMinutes: 15, minMinutesAhead: 120, maxDaysAhead: 30, cancelBeforeMinutes: null, notes: true, autoApprove: false },
    });
    const badRules = parseRules({ timezone: "Mars/Base", currency: "GBP", slotStep: "7", minHoursAhead: "x", maxDaysAhead: "0", cancelHours: "-1" });
    expect(badRules.ok ? [] : Object.keys(badRules.errors).sort()).toEqual(["cancelHours", "currency", "maxDaysAhead", "minHoursAhead", "slotStep", "timezone"]);

    const setup = salon();
    expect(parseService({ name: "Beard trim", duration: "20", price: "", categoryId: "1", description: "", color: "", active: "on" }, setup)).toMatchObject({
      ok: true,
      value: { name: "Beard trim", durationMinutes: 20, priceCents: 0, categoryId: 1, active: true },
    });
    const badService = parseService({ name: "B", duration: "2", price: "abc", categoryId: "99", color: "green" }, setup);
    expect(badService.ok ? [] : Object.keys(badService.errors).sort()).toEqual(["categoryId", "color", "duration", "name", "price"]);

    const week = { open1: "on", start1: "09:00", end1: "17:00", open6: "on", start6: "10:00", end6: "14:00" };
    expect(parseStaff({ name: "Zeynep", title: "", daysOff: "2026-12-31\n2026-12-31 2027-01-01", active: "on", ...week }, setup, [10, 99])).toMatchObject({
      ok: true,
      value: { name: "Zeynep", title: null, serviceIds: [10], daysOff: ["2026-12-31", "2027-01-01"], hours: [[], [{ start: "09:00", end: "17:00" }], [], [], [], [], [{ start: "10:00", end: "14:00" }]] },
    });
    const badStaff = parseStaff({ name: "Z", open2: "on", start2: "18:00", end2: "09:00", daysOff: "31/12/2026" }, setup, []);
    expect(badStaff.ok ? [] : Object.keys(badStaff.errors).sort()).toEqual(["daysOff", "hours", "name", "services"]);
  });
});
