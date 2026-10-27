import { beforeEach, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import { newApp } from "@/lib/app/setup";
import { canReschedule, movedMessage, rescheduleAppointment, rescheduleTimes, type MoveDeps } from "@/lib/bookings/reschedule";
import { addDays, localToUtc } from "@/lib/bookings/time";
import { sha256Hex } from "@/lib/crypto/tokens";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_BOOKING_RULES, DEFAULT_CATALOG_SETTINGS, type Announcement, type App, type BookingAppointment, type BookingSetup, type Client, type TimeRange, type User } from "@/lib/data/types";
import type { sendPush, ServiceAccount } from "@/lib/hosted/push";
import { cancelScheduledNotification, editScheduledNotification, readSendAt, runScheduledNotifications, SCHEDULED_MAX, scheduleAppNotification } from "@/lib/hosted/scheduled-notifications";
import { runFrequentJobs } from "@/lib/jobs/frequent";
import type { OwnerDeps } from "@/lib/owner/http";
import { pushStartedAnnouncements, type OwnerPushDeps } from "@/lib/owner/push";
import { handleOwner } from "@/lib/owner/service";
import { RATE_LIMITS, hitRateLimit } from "@/lib/rate-limit";
import { expectOwnerContract } from "./owner-contract";
import { KEY, NOW, days } from "./helpers";

/**
 * 61 Moving appointments, notifications sent later (and the frequent job
 * that sends them), announcements pushed when they start, and today's
 * numbers counted for the whole day.
 */

const HOUR = 3_600_000;
const SECRET = "test-signing-secret-0123456789abcdef0123456789";
const PASSWORD = "a-long-owner-password";
const ACCOUNT = { project_id: "salon-app", client_email: "push@salon.test", private_key: "x" } as ServiceAccount;
const WEEK: TimeRange[][] = [[], ...Array.from({ length: 6 }, () => [{ start: "09:00", end: "17:00" }])];
// NOW is Monday 12 October 2026, 13:00 in Istanbul.
const TUESDAY = "2026-10-13";

function salon(): BookingSetup {
  return {
    rules: { ...DEFAULT_BOOKING_RULES, timezone: "Europe/Istanbul" },
    categories: [],
    services: [
      { id: 10, categoryId: null, name: "Haircut", description: "", durationMinutes: 30, priceCents: 30000, imageAssetId: null, color: null, active: true },
      { id: 11, categoryId: null, name: "Old service", description: "", durationMinutes: 30, priceCents: 0, imageAssetId: null, color: null, active: false },
    ],
    staff: [
      { id: 20, name: "Ayşe Kaya", title: null, imageAssetId: null, serviceIds: [10, 11], hours: WEEK, daysOff: [], active: true },
      { id: 21, name: "Mehmet Demir", title: null, imageAssetId: null, serviceIds: [10], hours: WEEK, daysOff: [TUESDAY], active: true },
    ],
    nextId: 30,
  } as BookingSetup;
}

const at = (date: string, time: string) => localToUtc(date, time, "Europe/Istanbul");

interface Pushed {
  targets: unknown[];
  title: string;
  body: string;
  data: Record<string, string>;
}

describe("61", () => {
  let store: MemoryStore;
  let user: User;
  let client: Client;
  let app: App;
  let pushes: Pushed[];
  let now: Date;
  const send = (async (_account, targets, message) => {
    pushes.push({ targets, ...message });
    return { sent: targets.length, invalidTokens: [] };
  }) as typeof sendPush;

  beforeEach(async () => {
    store = new MemoryStore();
    pushes = [];
    now = NOW;
    ({ user, client } = await registerClient(store, { name: "Leyla", email: "leyla@salon.test", whatsapp: "+905446731942", siteUrl: "", password: null }, NOW));
    await store.updateUser(user.id, { passwordHash: await hashPassword(PASSWORD) }, NOW);
    await activateClient(store, { clientId: client.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    app = { ...newApp(client.id, null, NOW, "booking"), backend: "hosted", appName: "Salon Lale", websiteDoneAt: NOW, connector: { kind: "bookings" }, bookingSetup: salon() };
    await store.createApp(app);
    if (!(await store.getLicenseForApp(client.id, app.id))) await activateClient(store, { clientId: client.id, appId: app.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
  });

  async function book(start: Date, patch: Partial<BookingAppointment> = {}): Promise<BookingAppointment> {
    const appointment = await store.createBookingAppointment({
      appId: app.id,
      userId: null,
      serviceId: 10,
      staffId: 20,
      serviceName: "Haircut",
      staffName: "Ayşe Kaya",
      customerName: "Mona",
      customerPhone: "+905321112233",
      customerEmail: null,
      startAt: start,
      endAt: new Date(start.getTime() + 30 * 60_000),
      status: "approved",
      priceCents: 30000,
      currency: "TRY",
      notes: null,
      answers: null,
      createdAt: NOW,
      updatedAt: NOW,
      ...patch,
    });
    return appointment!;
  }

  async function customer(name = "Mona", phone = "+905321112233") {
    const u = (await store.createHostedUser({ appId: app.id, phone, name, email: null, city: null, now: NOW }))!;
    await store.createHostedDevice({ id: `device-${u.id}`, appId: app.id, userId: u.id, deviceId: `install-${u.id}`, platform: "android", name: "Pixel", appVersion: "1.0.0", pushToken: `push-${u.id}`, pushPreferences: null, createdAt: NOW, lastSeenAt: NOW });
    return u;
  }

  const moveDeps = (): MoveDeps => ({ store, app, now, account: ACCOUNT, send });

  describe("moving an appointment", () => {
    it("offers the times booking offers, its own time counting as free", async () => {
      const mine = await book(at(TUESDAY, "10:00"));
      await book(at(TUESDAY, "11:00"), { customerName: "Other" });
      const times = (await rescheduleTimes({ store, app, now }, mine, { from: TUESDAY, days: 1, staffId: 20 }))!;
      expect(times.timeZone).toBe("Europe/Istanbul");
      expect(times.staff).toEqual([
        { id: 20, name: "Ayşe Kaya" },
        { id: 21, name: "Mehmet Demir" },
      ]);
      const slots = times.days[0]!.slots.map((s) => s.localTime);
      expect(slots).toContain("10:00");
      expect(slots).not.toContain("11:00");
      expect(slots[0]).toBe("09:00");
      // Today: only from the business's minimum notice (an hour from 13:00).
      const today = (await rescheduleTimes({ store, app, now }, mine, { from: "2026-10-01", days: 1, staffId: null }))!;
      expect(today.days[0]!.date).toBe("2026-10-12");
      expect(today.days[0]!.slots[0]!.localTime).toBe("14:00");
      // Mehmet's day off.
      const mehmet = (await rescheduleTimes({ store, app, now }, mine, { from: TUESDAY, days: 1, staffId: 21 }))!;
      expect(mehmet.days[0]!.slots).toEqual([]);
    });

    it("moves it, keeps its status, and tells the customer in the app's language", async () => {
      const mona = await customer();
      const mine = await book(at(TUESDAY, "10:00"), { userId: mona.id, status: "pending" });
      const moved = await rescheduleAppointment(moveDeps(), mine, { start: at(TUESDAY, "15:30"), staffId: null });
      expect(moved).toMatchObject({ ok: true, notified: true, pushed: 1, appointment: { status: "pending", staffId: 20, startAt: at(TUESDAY, "15:30"), endAt: at(TUESDAY, "16:00") } });
      const inbox = await store.listHostedNotifications({ appId: app.id, userId: mona.id, since: new Date(0), page: 1, perPage: 10 });
      expect(inbox.items[0]).toMatchObject({ title: "Your appointment moved", body: "Your Haircut with Ayşe Kaya is now on Tue 13 Oct, 15:30." });
      expect(pushes[0]).toMatchObject({ targets: [expect.anything()], title: "Your appointment moved", data: { type: "announcement", appointment_id: String(mine.id) } });

      // An Arabic app writes Arabic.
      await store.saveAppLayout({ appId: app.id, draft: null, published: { languages: { default: "ar", available: ["ar"] } }, draftUpdatedAt: NOW, publishedAt: NOW } as never);
      const again = await rescheduleAppointment(moveDeps(), (await store.getBookingAppointment(app.id, mine.id))!, { start: at(TUESDAY, "16:00"), staffId: null });
      expect(again.ok).toBe(true);
      expect(pushes[1]!.title).toBe("تم تغيير موعدك");
      expect(movedMessage("tr", { serviceName: "Saç kesimi", staffName: "Ayşe", startAt: at(TUESDAY, "16:00") }, "Europe/Istanbul")).toEqual({
        title: "Randevunuzun saati değişti",
        body: "Ayşe ile Saç kesimi randevunuz artık 13 Eki Sal 16:00.",
      });
    });

    it("refuses a time that isn't free, a staff member who doesn't do it, and appointments that can't move", async () => {
      const mine = await book(at(TUESDAY, "10:00"));
      await book(at(TUESDAY, "12:00"), { customerName: "Other" });
      expect(await rescheduleAppointment(moveDeps(), mine, { start: at(TUESDAY, "12:00"), staffId: 20 })).toMatchObject({ ok: false, code: "slot_taken" });
      // Outside the hours, or on Mehmet's day off.
      expect(await rescheduleAppointment(moveDeps(), mine, { start: at(TUESDAY, "18:00"), staffId: null })).toMatchObject({ ok: false, code: "slot_taken" });
      expect(await rescheduleAppointment(moveDeps(), mine, { start: at(TUESDAY, "12:00"), staffId: 21 })).toMatchObject({ ok: false, code: "slot_taken" });
      // Too far ahead for the business (60 days).
      expect(await rescheduleAppointment(moveDeps(), mine, { start: at(addDays(TUESDAY, 70), "10:00"), staffId: null })).toMatchObject({ ok: false, code: "slot_taken" });
      expect(await rescheduleAppointment(moveDeps(), mine, { start: at(TUESDAY, "13:00"), staffId: 99 })).toMatchObject({ ok: false, code: "invalid_request" });
      // With nobody named, Mehmet takes Wednesday 12:00 when Ayşe is busy then.
      const wednesday = addDays(TUESDAY, 1);
      await book(at(wednesday, "12:00"), { customerName: "Busy" });
      const other = await rescheduleAppointment(moveDeps(), mine, { start: at(wednesday, "12:00"), staffId: null });
      expect(other).toMatchObject({ ok: true, appointment: { staffId: 21, staffName: "Mehmet Demir" } });

      const cancelled = await book(at(TUESDAY, "14:00"), { status: "cancelled" });
      expect(await rescheduleAppointment(moveDeps(), cancelled, { start: at(TUESDAY, "15:00"), staffId: null })).toMatchObject({ ok: false, code: "invalid_status" });
      const started = await book(new Date(NOW.getTime() - HOUR));
      expect(canReschedule(started, NOW)).toBe(false);
      const old = await book(at(TUESDAY, "09:00"), { serviceId: 11, serviceName: "Old service" });
      expect(await rescheduleAppointment(moveDeps(), old, { start: at(TUESDAY, "15:00"), staffId: null })).toMatchObject({ ok: false, code: "not_bookable" });
      expect(await rescheduleTimes({ store, app, now }, old, {})).toBeNull();
    });

    it("never lets two moves take the same time (the store checks and writes as one step)", async () => {
      const a = await book(at(TUESDAY, "09:00"));
      const b = await book(at(TUESDAY, "09:30"), { customerName: "B" });
      const move = { staffId: 20, staffName: "Ayşe Kaya", startAt: at(TUESDAY, "15:00"), endAt: at(TUESDAY, "15:30"), updatedAt: NOW };
      expect(await store.moveBookingAppointment(app.id, a.id, move)).toBe(true);
      expect(await store.moveBookingAppointment(app.id, b.id, move)).toBe(false);
      await store.updateBookingAppointment(app.id, b.id, { status: "cancelled" });
      expect(await store.moveBookingAppointment(app.id, b.id, { ...move, startAt: at(TUESDAY, "16:00"), endAt: at(TUESDAY, "16:30") })).toBe(false);
    });
  });

  describe("notifications sent later", () => {
    const deps = () => ({ store, now });

    it("reads a date and time in the app's time zone, later than now and within 90 days", () => {
      expect(readSendAt({ date: "2026-10-12", time: "18:30" }, "Europe/Istanbul", NOW)).toEqual({ sendAt: new Date("2026-10-12T15:30:00Z") });
      expect(readSendAt({ date: "2026-10-12", time: "12:00" }, "Europe/Istanbul", NOW)).toEqual({ error: "Choose a time later than now." });
      expect(readSendAt({ date: "2027-02-01", time: "12:00" }, "Europe/Istanbul", NOW)).toEqual({ error: "Choose a time within the next 90 days." });
      expect(readSendAt({ date: "12/10/2026", time: "12:00" }, "Europe/Istanbul", NOW)).toEqual({ error: "Choose a date and time." });
      expect(readSendAt({ date: "2026-10-12", time: "25:00" }, "Europe/Istanbul", NOW)).toEqual({ error: "Choose a date and time." });
      // A time a clock change skips isn't one the owner chose (Europe/London, 29 March 2027, 01:30).
      expect(readSendAt({ date: "2027-03-28", time: "01:30" }, "Europe/London", new Date("2027-03-01T00:00:00Z"))).toEqual({ error: "Choose a date and time." });
    });

    it("schedules, edits and cancels with the sending rules, at most 50 waiting", async () => {
      expect(await scheduleAppNotification(deps(), app, { title: "", body: "x".repeat(300), date: "2026-10-12", time: "09:00", createdBy: user.id })).toEqual({
        ok: false,
        errors: { title: "Enter a title.", body: "Keep the message to 240 characters.", send_at: "Choose a time later than now." },
      });
      const made = await scheduleAppNotification(deps(), app, { title: "Weekend offer", body: "20% off on Saturday.", date: "2026-10-16", time: "18:00", createdBy: user.id });
      expect(made).toMatchObject({ ok: true, notification: { status: "scheduled", sendAt: new Date("2026-10-16T15:00:00Z"), createdBy: user.id } });
      const id = made.ok ? made.notification.id : 0;
      const edited = await editScheduledNotification(deps(), app, id, { title: "Weekend offer!", body: "20% off on Saturday.", date: "2026-10-17", time: "10:00" });
      expect(edited).toMatchObject({ ok: true, notification: { title: "Weekend offer!", sendAt: new Date("2026-10-17T07:00:00Z") } });
      expect(await cancelScheduledNotification(deps(), app, id)).toBe("cancelled");
      expect(await editScheduledNotification(deps(), app, id, { title: "x", body: "y", date: "2026-10-17", time: "10:00" })).toMatchObject({ ok: false, conflict: true });
      expect(await cancelScheduledNotification(deps(), { ...app, id: "another-app" }, id)).toBe("gone");
      for (let i = 0; i < SCHEDULED_MAX; i += 1) await scheduleAppNotification(deps(), app, { title: `N${i}`, body: "Hi", date: "2026-10-20", time: "10:00", createdBy: null });
      expect(await scheduleAppNotification(deps(), app, { title: "One more", body: "Hi", date: "2026-10-20", time: "10:00", createdBy: null })).toMatchObject({ ok: false, conflict: true });
    });

    it("is sent by the frequent job once, even when two runs go at the same time, through the hour's limit", async () => {
      const mona = await customer();
      const first = await scheduleAppNotification(deps(), app, { title: "Open late", body: "Until 22:00 tonight.", date: "2026-10-12", time: "14:00", createdBy: user.id });
      const second = await scheduleAppNotification(deps(), app, { title: "Tomorrow", body: "See you.", date: "2026-10-13", time: "09:00", createdBy: user.id });
      expect(first.ok && second.ok).toBe(true);
      // Not yet.
      expect(await runScheduledNotifications({ store, key: KEY, now, send })).toEqual({ sent: 0, waiting: 0, cancelled: 0, failed: 0 });
      now = new Date(NOW.getTime() + 61 * 60_000);
      const [a, b] = await Promise.all([runScheduledNotifications({ store, key: KEY, now, send }), runScheduledNotifications({ store, key: KEY, now, send })]);
      expect(a.sent + b.sent).toBe(1);
      const sent = await store.listHostedBroadcasts(app.id, 10);
      expect(sent.map((n) => n.title)).toEqual(["Open late"]);
      const row = await store.getScheduledNotification(app.id, first.ok ? first.notification.id : 0);
      expect(row).toMatchObject({ status: "sent", notificationId: sent[0]!.id, result: expect.stringContaining("inboxes") });
      expect(await store.listHostedNotifications({ appId: app.id, userId: mona.id, since: new Date(0), page: 1, perPage: 10 })).toMatchObject({ total: 1 });
      // The hour's 10 used up by sending now: it waits, without counting a try.
      now = new Date("2026-10-13T06:01:00Z");
      for (let i = 0; i < RATE_LIMITS.hostedNotify.limit; i += 1) await hitRateLimit(store, RATE_LIMITS.hostedNotify, app.id, now);
      expect(await runScheduledNotifications({ store, key: KEY, now, send })).toMatchObject({ sent: 0, waiting: 1 });
      expect((await store.getScheduledNotification(app.id, second.ok ? second.notification.id : 0))!.status).toBe("scheduled");
      now = new Date("2026-10-13T07:01:00Z");
      expect(await runScheduledNotifications({ store, key: KEY, now, send })).toMatchObject({ sent: 1, waiting: 0 });
    });

    it("never sends one twice that a run took and left halfway, and drops those of apps that left Yallapp's API", async () => {
      const stuck = await scheduleAppNotification(deps(), app, { title: "Stuck", body: "Hi", date: "2026-10-12", time: "14:00", createdBy: null });
      const id = stuck.ok ? stuck.notification.id : 0;
      expect(await store.updateScheduledNotification(app.id, id, "scheduled", { status: "sending", claimedAt: new Date(NOW.getTime() + HOUR) })).toBe(true);
      now = new Date(NOW.getTime() + 2 * HOUR);
      expect(await runScheduledNotifications({ store, key: KEY, now, send })).toMatchObject({ failed: 1, sent: 0 });
      expect(await store.getScheduledNotification(app.id, id)).toMatchObject({ status: "failed", result: expect.stringContaining("stopped halfway") });
      const gone = await scheduleAppNotification({ store, now: NOW }, app, { title: "Gone", body: "Hi", date: "2026-10-12", time: "14:30", createdBy: null });
      await store.updateApp(app.id, { backend: "wordpress" }, now);
      expect(await runScheduledNotifications({ store, key: KEY, now, send })).toMatchObject({ cancelled: 1 });
      expect((await store.getScheduledNotification(app.id, gone.ok ? gone.notification.id : 0))!.status).toBe("cancelled");
      expect(await store.listHostedBroadcasts(app.id, 10)).toEqual([]);
    });
  });

  describe("announcements that start later", () => {
    function announcement(patch: Partial<Announcement>): Announcement {
      return {
        id: "a1",
        title: "New: moving appointments",
        body: "Move an appointment from your phone.",
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
        startsAt: days(1),
        endsAt: null,
        emailedAt: null,
        emailedCount: 0,
        pushedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
        createdBy: "team@yallapp.test",
        ...patch,
      };
    }

    it("go to the owners' phones once, when they start", async () => {
      await store.createOwnerDevice({
        id: "11111111-1111-4111-8111-111111111111",
        userId: user.id,
        clientId: client.id,
        name: "Pixel",
        platform: "android",
        appVersion: null,
        language: null,
        refreshHash: sha256Hex("r"),
        refreshExpiresAt: days(60),
        sessionVersion: user.sessionVersion,
        pushToken: "owner-token",
        pushProvider: "fcm",
        pushPreferences: null,
        createdAt: NOW,
        lastSeenAt: NOW,
      });
      await store.createAnnouncement(announcement({}));
      await store.createAnnouncement(announcement({ id: "already", startsAt: days(-1), pushedAt: days(-1) }));
      await store.createAnnouncement(announcement({ id: "old", startsAt: days(-3) }));
      const ownerPush = (at: Date): OwnerPushDeps => ({ store, now: at, account: ACCOUNT, send });
      expect(await pushStartedAnnouncements(ownerPush(NOW))).toEqual({ announcements: 0, phones: 0 });
      // The one that started 3 days ago is marked, not pushed late.
      expect((await store.getAnnouncement("old"))!.pushedAt).toEqual(NOW);
      const later = new Date(days(1).getTime() + 5 * 60_000);
      const runs = await Promise.all([pushStartedAnnouncements(ownerPush(later)), pushStartedAnnouncements(ownerPush(later))]);
      expect(runs.reduce((n, r) => n + r.announcements, 0)).toBe(1);
      expect(pushes).toHaveLength(1);
      expect(pushes[0]).toMatchObject({ title: "New: moving appointments", data: { kind: "yallapp_updates", update_key: "announcement:a1" } });
      expect(await pushStartedAnnouncements(ownerPush(new Date(later.getTime() + HOUR)))).toEqual({ announcements: 0, phones: 0 });
    });

    it("the frequent job does both", async () => {
      await scheduleAppNotification({ store, now: NOW }, app, { title: "Hi", body: "There", date: "2026-10-12", time: "14:00", createdBy: null });
      await store.createAnnouncement(announcement({ startsAt: new Date(NOW.getTime() + 30 * 60_000) }));
      const later = new Date(NOW.getTime() + 2 * HOUR);
      const report = await runFrequentJobs({ store, key: KEY, now: later, send, ownerPush: { store, now: later, account: null } });
      expect(report).toEqual({ notifications: { sent: 1, waiting: 0, cancelled: 0, failed: 0 }, announcements: { announcements: 1, phones: 0 }, ended: { ended: 0, asked: 0, sent: 0 }, campaigns: { sent: 0, waiting: 0, failed: 0 }, automatic: {}, builds: { queued: 0, nothing: 0, later: 0 }, reviews: { checked: 0, changed: 0, failed: 0 }, orders: { checked: 0, told: 0, ended: 0 }, storeProducts: { apps: 0, done: 0, failed: 0 }, storePurchases: { delivered: 0, refunds: 0, ended: 0, failed: 0 } });
    });
  });

  describe("the Owner API", () => {
    function deps(): OwnerDeps {
      return { store, now, ip: "198.51.100.9", signingSecret: SECRET, encryptionKey: KEY, baseUrl: "https://yallapp.test", paymentUrls: {}, media: null, mail: async () => undefined, sendPush: send };
    }
    async function call(method: string, route: string, options: { params?: Record<string, string | number>; token?: string; body?: unknown; query?: Record<string, string> } = {}) {
      const path = route.replace(/\{(\w+)\}/g, (_, name: string) => String(options.params?.[name] ?? ""));
      const result = await handleOwner(deps(), { method, path: path.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null, acceptLanguage: null });
      expectOwnerContract(method, route, result);
      return result as { status: number; body: Record<string, unknown> };
    }
    async function token() {
      const result = await call("POST", "/auth/sign-in", { body: { email: "leyla@salon.test", password: PASSWORD, device: { name: "Pixel", platform: "android" } } });
      return (result.body as { access_token: string }).access_token;
    }

    it("lists the free times and moves an appointment, as the dashboard", async () => {
      const t = await token();
      const mine = await book(at(TUESDAY, "10:00"));
      const params = { app_id: app.id, appointment_id: mine.id };
      const list = await call("GET", "/apps/{app_id}/appointments", { token: t, params: { app_id: app.id } });
      expect(list.body).toMatchObject({ items: [{ id: mine.id, can_reschedule: true }] });
      const times = await call("GET", "/apps/{app_id}/appointments/{appointment_id}/times", { token: t, params, query: { from: TUESDAY, days: "1" } });
      expect(times.body).toMatchObject({ time_zone: "Europe/Istanbul", staff: [{ id: 20 }, { id: 21 }], days: [{ date: TUESDAY, slots: expect.arrayContaining([expect.objectContaining({ local_time: "10:00", staff_ids: [20] })]) }] });
      expect((await call("GET", "/apps/{app_id}/appointments/{appointment_id}/times", { token: t, params, query: { days: "40" } })).status).toBe(400);
      const moved = await call("POST", "/apps/{app_id}/appointments/{appointment_id}/reschedule", { token: t, params, body: { start: at(TUESDAY, "15:00").toISOString() } });
      expect(moved.body).toMatchObject({ local_date: TUESDAY, local_time: "15:00", staff: "Ayşe Kaya", status: "approved" });
      await book(at(TUESDAY, "16:00"), { customerName: "Other" });
      expect(await call("POST", "/apps/{app_id}/appointments/{appointment_id}/reschedule", { token: t, params, body: { start: at(TUESDAY, "16:00").toISOString(), staff_id: 20 } })).toMatchObject({ status: 409, body: { code: "slot_taken" } });
      expect(await call("POST", "/apps/{app_id}/appointments/{appointment_id}/reschedule", { token: t, params, body: { start: "soon" } })).toMatchObject({ status: 400 });
      await call("POST", "/apps/{app_id}/appointments/{appointment_id}/status", { token: t, params, body: { status: "cancelled" } });
      expect(await call("GET", "/apps/{app_id}/appointments/{appointment_id}/times", { token: t, params })).toMatchObject({ status: 409, body: { code: "invalid_status" } });
      expect((await call("POST", "/apps/{app_id}/appointments/{appointment_id}/reschedule", { token: t, params: { app_id: app.id, appointment_id: 9999 }, body: { start: at(TUESDAY, "15:00").toISOString() } })).status).toBe(404);
    });

    it("schedules, lists, changes and cancels notifications", async () => {
      const t = await token();
      const params = { app_id: app.id };
      expect(await call("POST", "/apps/{app_id}/notifications/scheduled", { token: t, params, body: { title: "Hi", body: "There", date: "2026-10-12", time: "09:00" } })).toMatchObject({
        status: 400,
        body: { errors: { send_at: "Choose a time later than now." } },
      });
      const made = await call("POST", "/apps/{app_id}/notifications/scheduled", { token: t, params, body: { title: "Hi", body: "There", date: "2026-10-14", time: "18:30" } });
      expect(made).toMatchObject({ status: 201, body: { local_date: "2026-10-14", local_time: "18:30", status: "scheduled", send_at: "2026-10-14T15:30:00.000Z" } });
      const id = (made.body as { id: number }).id;
      expect((await call("GET", "/apps/{app_id}/notifications/scheduled", { token: t, params })).body).toMatchObject({ time_zone: "Europe/Istanbul", max: 50, items: [{ id, title: "Hi" }] });
      const changed = await call("PUT", "/apps/{app_id}/notifications/scheduled/{scheduled_id}", { token: t, params: { ...params, scheduled_id: id }, body: { title: "Hello", body: "There", date: "2026-10-15", time: "08:00" } });
      expect(changed.body).toMatchObject({ title: "Hello", local_date: "2026-10-15", local_time: "08:00" });
      expect((await call("DELETE", "/apps/{app_id}/notifications/scheduled/{scheduled_id}", { token: t, params: { ...params, scheduled_id: id } })).status).toBe(204);
      expect(await call("PUT", "/apps/{app_id}/notifications/scheduled/{scheduled_id}", { token: t, params: { ...params, scheduled_id: id }, body: { title: "Hello", body: "There", date: "2026-10-15", time: "08:00" } })).toMatchObject({ status: 409, body: { code: "already_sent" } });
      expect((await call("DELETE", "/apps/{app_id}/notifications/scheduled/{scheduled_id}", { token: t, params: { ...params, scheduled_id: 4242 } })).status).toBe(404);
      expect((await call("GET", "/apps/{app_id}/notifications/scheduled", { token: t, params })).body).toMatchObject({ items: [] });
    });

    it("counts today's numbers for the whole day, however many orders came", async () => {
      const shop = { ...newApp(client.id, null, NOW, "store"), backend: "hosted" as const, appName: "Shop", websiteDoneAt: NOW, connector: { kind: "catalog" as const }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } };
      await store.createApp(shop);
      await activateClient(store, { clientId: client.id, appId: shop.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
      // More than the 200 Phase 58 looked at; one yesterday and one unpaid don't count.
      const paidAt = (i: number) => new Date(NOW.getTime() - (i % 9) * 60_000);
      for (let i = 0; i < 230; i += 1) {
        const order = await store.createCatalogOrder({
          appId: shop.id,
          tokenHash: sha256Hex(`o${i}`),
          userId: null,
          status: "pending",
          lines: [],
          subtotalCents: 1000,
          shippingCents: 0,
          totalCents: 1000,
          currency: i === 0 ? "USD" : "TRY",
          customer: null,
          paymentId: null,
          createdAt: NOW,
          paidAt: null,
          updatedAt: NOW,
          commissionCents: null,
          itemTransactionIds: null,
          payoutApprovedAt: null,
        } as never);
        if (i < 229) await store.payCatalogOrder(shop.id, order.id, `P${i}`, i === 228 ? days(-1) : paidAt(i));
      }
      for (let i = 0; i < 205; i += 1) await store.createHostedUser({ appId: shop.id, phone: `+9053200${String(i).padStart(5, "0")}`, name: `U${i}`, email: null, city: null, now: NOW });
      const t = await token();
      const today = await call("GET", "/apps/{app_id}/today", { token: t, params: { app_id: shop.id } });
      expect(today.body).toMatchObject({ counts: { orders: 228, new_users: 205 }, sales: [{ currency: "TRY", amount_cents: 227000 }, { currency: "USD", amount_cents: 1000 }] });
    });
  });
});
