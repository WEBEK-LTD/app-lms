import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { encrypt } from "@/lib/crypto/encryption";
import { MemoryStore } from "@/lib/data/memory";
import type { App, AppType, AppVertical, BookingAppointment, HostedDevice } from "@/lib/data/types";
import { autoKindsFor, notifyAppointmentConfirmed, notifyNewLesson, runAutoNotifications } from "@/lib/hosted/auto-notifications";
import { SERVICE_ACCOUNT_CONTEXT } from "@/lib/hosted/notify";
import type { sendPush } from "@/lib/hosted/push";
import { hostedSettings, notificationJson } from "@/lib/hosted/service";
import { autoNoticesStoreSuite } from "./auto-notifications-store-suite";
import { days, KEY, NOW } from "./helpers";

const HOUR = 3_600_000;
const at = (hours: number) => new Date(NOW.getTime() + hours * HOUR);
const serviceAccount = JSON.stringify({
  type: "service_account",
  project_id: "auto-test",
  client_email: "push@auto-test.iam.gserviceaccount.com",
  private_key: generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
});

interface Pushed {
  targets: unknown[];
  title: string;
  body: string;
  data: Record<string, string>;
}

/** A hosted app with an active plan and push on, people with phones, and a recorder of pushes. */
async function setup(appType: AppType, vertical: AppVertical | null, patch: Partial<App>) {
  const store = new MemoryStore();
  const { client } = await registerClient(store, { name: "Owner", email: `owner-${appType}@auto.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  await activateClient(store, { clientId: client.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
  const base = newApp(client.id, null, NOW, appType, vertical);
  const app: App = { ...base, backend: "hosted", firebaseServiceAccountEncrypted: encrypt(serviceAccount, KEY, `${SERVICE_ACCOUNT_CONTEXT}:${base.id}`), ...patch };
  await store.createApp(app);
  if (!(await store.getLicenseForApp(client.id, app.id))) await activateClient(store, { clientId: client.id, appId: app.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
  let n = 0;
  const person = async (device: Partial<HostedDevice> = {}) => {
    n += 1;
    const user = (await store.createHostedUser({ appId: app.id, phone: `+9053500000${String(n).padStart(2, "0")}`, name: `Person ${n}`, email: null, city: null, now: NOW }))!;
    await store.createHostedDevice({ id: `row-${n}`, appId: app.id, userId: user.id, deviceId: `install-${n}`, platform: "android", name: "Phone", appVersion: "1.0.0", pushToken: `tok-${n}`, pushPreferences: null, language: null, country: null, createdAt: NOW, lastSeenAt: NOW, ...device });
    return user;
  };
  const pushes: Pushed[] = [];
  const send = (async (_account, targets, message) => {
    pushes.push({ targets, title: message.title, body: message.body, data: message.data });
    return { sent: targets.length, invalidTokens: [] };
  }) as typeof sendPush;
  const deps = (now: Date = NOW) => ({ store, key: KEY, now, send });
  return { store, app, person, pushes, deps };
}

function appointment(appId: string, userId: number, startAt: Date, patch: Partial<BookingAppointment> = {}): Omit<BookingAppointment, "id"> {
  return {
    appId,
    userId,
    serviceId: 10,
    staffId: 20,
    serviceName: "Haircut",
    staffName: "Ayşe Kaya",
    customerName: "Mona",
    customerPhone: "+905321112233",
    customerEmail: null,
    startAt,
    endAt: new Date(startAt.getTime() + 30 * 60_000),
    status: "approved",
    priceCents: 30000,
    currency: "TRY",
    notes: null,
    answers: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}

describe("85.3 automatic notifications", () => {
  autoNoticesStoreSuite(() => new MemoryStore());

  it("each app has its own kinds", () => {
    const app = (appType: AppType, vertical: AppVertical | null, kind: NonNullable<App["connector"]>["kind"]) => ({ ...newApp("c", null, NOW, appType, vertical), backend: "hosted" as const, connector: { kind } as App["connector"] });
    expect(autoKindsFor(app("lms", null, "courses"))).toEqual(["new_lesson", "study_reminder"]);
    expect(autoKindsFor(app("booking", "fitness", "bookings"))).toEqual(["appointment_confirmed", "appointment_reminder", "class_soon", "membership_ending"]);
    expect(autoKindsFor(app("booking", null, "bookings"))).toEqual(["appointment_confirmed", "appointment_reminder"]);
    expect(autoKindsFor(app("events", null, "events"))).toEqual(["event_soon"]);
    expect(autoKindsFor(app("store", null, "catalog"))).toEqual(["cart_left"]);
    // WordPress apps send theirs from the plugin.
    expect(autoKindsFor({ ...app("lms", null, "courses"), backend: "wordpress" })).toEqual([]);
  });

  it("a new lesson goes to its course's students once, in each phone's language, counted", async () => {
    const course = { id: 5, title: "Photography", description: "", imageAssetId: null, priceCents: 0, categoryIds: [], instructorName: null, level: null, topics: [], active: true, createdAt: NOW.toISOString() };
    const { store, app, person, pushes, deps } = await setup("lms", null, { connector: { kind: "courses" }, courseSetup: { currency: "TRY", categories: [], courses: [course], nextId: 9 } });
    const arabic = await person({ language: "ar" });
    const quiet = await person({ pushPreferences: { new_lessons: false } });
    const other = await person();
    for (const u of [arabic, quiet]) await store.enrollInCourse({ appId: app.id, userId: u.id, courseId: 5, source: "free", enrolledAt: NOW });
    expect(await notifyNewLesson(deps(), app, course, { id: 8, title: "Light and shadow" })).toEqual({ people: 2, phones: 1 });
    expect(pushes).toEqual([{ targets: ["tok-1"], title: "درس جديد في Photography", body: "Light and shadow جاهز لك الآن.", data: { course_id: "5", lesson_id: "8", type: "new_lesson" } }]);
    // In both inboxes (the quiet one's phone just doesn't ring), opening the lesson.
    const inbox = await store.listHostedNotifications({ appId: app.id, userId: quiet.id, since: days(-1), page: 1, perPage: 5 });
    expect(notificationJson(inbox.items[0]!, null)).toMatchObject({ type: "new_lesson", course_id: 5, lesson_id: 8, title: "New lesson in Photography" });
    expect((await store.listHostedNotifications({ appId: app.id, userId: other.id, since: days(-1), page: 1, perPage: 5 })).total).toBe(0);
    // Saved again: not twice.
    expect(await notifyNewLesson(deps(), app, course, { id: 8, title: "Light and shadow" })).toEqual({ people: 0, phones: 0 });
    // A hidden course says nothing.
    expect(await notifyNewLesson(deps(), app, { ...course, active: false }, { id: 9, title: "Draft" })).toEqual({ people: 0, phones: 0 });
    const daily = await store.listAnalyticsDaily(app.id, "2026-10-12", "2026-10-12", ["auto_sent", "auto_pushed"]);
    expect(daily.map((r) => [r.metric, r.key, r.value])).toEqual([
      ["auto_sent", "new_lesson", 2],
      ["auto_pushed", "new_lesson", 1],
    ]);
  });

  it("appointments: confirmed, then reminded the day before, once; the owner can turn a kind off", async () => {
    const { store, app, person, pushes, deps } = await setup("booking", null, { connector: { kind: "bookings" } });
    const mona = await person();
    const tomorrow = (await store.createBookingAppointment(appointment(app.id, mona.id, at(20))))!;
    const later = (await store.createBookingAppointment(appointment(app.id, mona.id, at(60))))!;
    expect(await notifyAppointmentConfirmed(deps(), app, tomorrow, "Europe/Istanbul")).toEqual({ people: 1, phones: 1 });
    expect(pushes[0]).toMatchObject({ title: "Your appointment is confirmed", data: { type: "appointment_confirmed", appointment_id: String(tomorrow.id) } });
    expect(pushes[0]!.body).toContain("Haircut with Ayşe Kaya");

    expect(await runAutoNotifications(deps())).toEqual({ appointment_reminder: 1 });
    expect(pushes[1]).toMatchObject({ title: "Your appointment is coming up", data: { type: "appointment_reminder", appointment_id: String(tomorrow.id) } });
    expect(await runAutoNotifications(deps(at(0.1)))).toEqual({});
    // Two days on, the later one is due.
    expect(await runAutoNotifications(deps(at(40)))).toEqual({ appointment_reminder: 1 });
    expect(pushes.at(-1)!.data.appointment_id).toBe(String(later.id));

    // Off: nothing more of that kind.
    await store.updateApp(app.id, { hostedSettings: { ...hostedSettings(app), autoNotifications: { appointment_reminder: false } } }, NOW);
    await store.createBookingAppointment(appointment(app.id, mona.id, at(90)));
    expect(await runAutoNotifications(deps(at(70)))).toEqual({});
  });

  it("a gym: classes soon and memberships ending", async () => {
    const { store, app, person, pushes, deps } = await setup("booking", "fitness", { connector: { kind: "bookings" } });
    const ali = await person({ language: "tr" });
    const membership = await store.createMembership({ appId: app.id, userId: ali.id, planId: 1, planName: "Monthly unlimited", period: "month", creditsLeft: null, status: "active", startsAt: days(-28), endsAt: at(50), orderId: null, createdAt: NOW, updatedAt: NOW });
    const yoga = (await store.createClassSession({ appId: app.id, templateId: null, serviceId: 1, staffId: 2, serviceName: "Yoga", staffName: "Deniz", startAt: at(1.5), endAt: at(2.5), capacity: 10, bookedCount: 0, status: "scheduled", createdAt: NOW, updatedAt: NOW } as never))!;
    const booked = await store.bookClass({ appId: app.id, sessionId: yoga.id, userId: ali.id, customerName: "Ali", customerPhone: null, customerEmail: null, membershipRequired: false, bookableFrom: NOW, now: NOW });
    expect(booked.ok).toBe(true);
    const report = await runAutoNotifications(deps());
    expect(report).toEqual({ class_soon: 1, membership_ending: 1 });
    expect(pushes.map((p) => p.data.type).sort()).toEqual(["class_soon", "membership_ending"]);
    expect(pushes.find((p) => p.data.type === "class_soon")!.title).toBe("Yoga birazdan başlıyor");
    expect(pushes.find((p) => p.data.type === "membership_ending")!.body).toContain("Monthly unlimited");
    expect(await runAutoNotifications(deps(at(0.5)))).toEqual({});
    // Renewed (a new end): it may say so again before that end.
    await store.updateMembership(app.id, membership.id, { endsAt: at(24 * 30) });
    expect(await runAutoNotifications(deps(at(24 * 28)))).toEqual({ membership_ending: 1 });
  });

  it("events soon, to ticket holders; the study reminder in the evening, to those who turned it on", async () => {
    const events = await setup("events", null, { connector: { kind: "events" } });
    const holder = await events.person();
    const event = await events.store.createEvent(
      { appId: events.app.id, title: "Jazz Night", description: "", category: "Concerts", imageAssetIds: [], startAt: at(10), endAt: at(12), venueName: "Hall", venueAddress: null, latitude: null, longitude: null, onlineUrl: null, organiser: null, capacity: null, status: "published", publishedAt: NOW },
      NOW,
    );
    const type = await events.store.createTicketType({ appId: events.app.id, eventId: event.id, name: "Free", priceCents: 0, capacity: null, saleEndsAt: null, maxPerOrder: 4, position: 0 }, NOW);
    expect((await events.store.claimTickets({ appId: events.app.id, eventId: event.id, ticketTypeId: type.id, userId: holder.id, orderId: null, tickets: [{ code: "T1", holderName: "A" }, { code: "T2", holderName: "B" }], priceCents: 0, status: "valid", holdUntil: null, now: NOW })).ok).toBe(true);
    expect(await runAutoNotifications(events.deps())).toEqual({ event_soon: 1 });
    expect(events.pushes[0]).toMatchObject({ title: "Jazz Night is coming up", data: { type: "event_soon", event_id: String(event.id) } });

    const course = { id: 5, title: "Arabic for beginners", description: "", imageAssetId: null, priceCents: 0, categoryIds: [], instructorName: null, level: null, topics: [], active: true, createdAt: NOW.toISOString() };
    const school = await setup("lms", null, { connector: { kind: "courses" }, courseSetup: { currency: "TRY", categories: [], courses: [course], nextId: 9 } });
    const keen = await school.person({ pushPreferences: { daily_reminder: true } });
    const busy = await school.person();
    for (const u of [keen, busy]) await school.store.enrollInCourse({ appId: school.app.id, userId: u.id, courseId: 5, source: "free", enrolledAt: NOW });
    // 13:00 in Istanbul: not yet. 19:30: once that day.
    expect(await runAutoNotifications(school.deps())).toEqual({});
    expect(await runAutoNotifications(school.deps(at(6.5)))).toEqual({ study_reminder: 1 });
    expect(await runAutoNotifications(school.deps(at(7)))).toEqual({});
    expect(school.pushes).toEqual([{ targets: ["tok-1"], title: "Time to study", body: "A few minutes today keeps you going in Arabic for beginners.", data: { type: "study_reminder" } }]);
    expect(await runAutoNotifications(school.deps(at(30.5)))).toEqual({ study_reminder: 1 });
  });

  it("a cart left for 3 hours: once, again only after it changes; and the app reports it", async () => {
    const { store, app, person, pushes, deps } = await setup("store", null, { connector: { kind: "catalog" } });
    const buyer = await person();
    await store.saveHostedCart(app.id, buyer.id, 2, NOW);
    expect(await runAutoNotifications(deps(at(2)))).toEqual({});
    expect(await runAutoNotifications(deps(at(3.5)))).toEqual({ cart_left: 1 });
    expect(pushes[0]).toMatchObject({ title: "You left something in your cart", data: { type: "cart_left" } });
    expect(await runAutoNotifications(deps(at(5)))).toEqual({});
    await store.saveHostedCart(app.id, buyer.id, 3, at(6));
    expect(await runAutoNotifications(deps(at(9.5)))).toEqual({ cart_left: 1 });
    // Emptied (ordered): nothing.
    await store.saveHostedCart(app.id, buyer.id, 0, at(10));
    expect(await runAutoNotifications(deps(at(20)))).toEqual({});
  });
});
