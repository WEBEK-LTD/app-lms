import { appZone } from "../analytics/zone";
import { platformDefinition } from "./connectors/platforms";
import { dayOf } from "../analytics/days";
import { appAreas } from "../app/areas";
import type { Lang } from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { appLang } from "../bookings/reschedule";
import { utcToLocal } from "../bookings/time";
import type { DataStore } from "../data/store";
import { orderNumber } from "../catalog/settings";
import type { App, BookingAppointment, CatalogOrder, HostedDevice } from "../data/types";
import { appIsActive } from "../license/status";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX, serviceAccountOf } from "./notify";
import { pushTarget, sendPush } from "./push";

/**
 * 85.3 Notifications the app sends on its own, on the hosted API: a new
 * lesson to a course's students, an appointment confirmed and a reminder the
 * day before, a class or an event soon, a membership ending, a cart left,
 * and the daily study reminder the student turned on. Each goes once to each
 * person and what it is about (`auto_notices`), in their phone's language
 * when we write it (else the app's), to their inbox and to their phones that
 * allow it. The owner turns each kind off on App notifications
 * (`HostedSettings.autoNotifications`). Each is counted by kind
 * (`auto_sent`: people, `auto_pushed`: phones reached); the push's `type` is
 * the kind, so the app's analytics count its opens by kind too. They aren't
 * in the hourly limit of the notifications the owner sends.
 */

export const AUTO_KINDS = ["new_lesson", "appointment_confirmed", "appointment_reminder", "class_soon", "event_soon", "membership_ending", "cart_left", "study_reminder", "order_update"] as const;
export type AutoKind = (typeof AUTO_KINDS)[number];

/** When each one goes. */
export const AUTO_TIMING = {
  /** The reminder of an appointment: in the 24 hours before it, not in the last hour. */
  appointmentHours: 24,
  classHours: 2,
  eventHours: 24,
  membershipDays: 3,
  /** A cart unchanged for 3 hours, up to a week. */
  cartHours: 3,
  cartDays: 7,
  /** The study reminder: from 19:00 to 21:00 in the app's time zone. */
  studyFrom: 19,
  studyUntil: 21,
} as const;

/** The kinds this app has. */
export function autoKindsFor(app: Pick<App, "connector" | "backend" | "vertical" | "catalogSettings">): AutoKind[] {
  if (app.backend !== "hosted") return [];
  const areas = appAreas(app);
  const kinds: AutoKind[] = [];
  if (areas.courses) kinds.push("new_lesson", "study_reminder");
  if (areas.appointments) kinds.push("appointment_confirmed", "appointment_reminder");
  if (areas.memberCheckIn) kinds.push("class_soon", "membership_ending");
  if (areas.events) kinds.push("event_soon");
  if (areas.products) kinds.push("cart_left", "order_update");
  // 91.2 A shop on Shopify or another platform: its orders are watched (lib/hosted/order-watch.ts).
  else if (shopOnPlatform(app)) kinds.push("order_update");
  return AUTO_KINDS.filter((k) => kinds.includes(k));
}

/** 91.2 A Store app whose shop is on Shopify or another connected platform. */
export function shopOnPlatform(app: Pick<App, "connector" | "backend">): boolean {
  if (app.backend !== "hosted") return false;
  if (app.connector?.kind === "shopify") return true;
  return app.connector?.kind === "platform" && platformDefinition(app.connector.platform)?.appType === "store";
}

export function autoOn(app: Pick<App, "hostedSettings">, kind: AutoKind): boolean {
  return app.hostedSettings?.autoNotifications?.[kind] !== false;
}

type Values = Record<string, string>;
type Text = (v: Values) => { title: string; body: string };

/** The words, in English, Arabic and Turkish. */
export const AUTO_TEXT: Record<AutoKind, Record<Lang, Text>> = {
  new_lesson: {
    en: (v) => ({ title: `New lesson in ${v.course}`, body: `${v.lesson} is ready for you.` }),
    ar: (v) => ({ title: `درس جديد في ${v.course}`, body: `${v.lesson} جاهز لك الآن.` }),
    tr: (v) => ({ title: `${v.course}: yeni ders`, body: `${v.lesson} sizi bekliyor.` }),
  },
  appointment_confirmed: {
    en: (v) => ({ title: "Your appointment is confirmed", body: `${v.service} with ${v.staff}, ${v.when}.` }),
    ar: (v) => ({ title: "تم تأكيد موعدك", body: `${v.service} مع ${v.staff}، ${v.when}.` }),
    tr: (v) => ({ title: "Randevunuz onaylandı", body: `${v.staff} ile ${v.service}, ${v.when}.` }),
  },
  appointment_reminder: {
    en: (v) => ({ title: "Your appointment is coming up", body: `${v.service} with ${v.staff}, ${v.when}.` }),
    ar: (v) => ({ title: "تذكير بموعدك", body: `${v.service} مع ${v.staff}، ${v.when}.` }),
    tr: (v) => ({ title: "Randevu hatırlatması", body: `${v.staff} ile ${v.service}, ${v.when}.` }),
  },
  class_soon: {
    en: (v) => ({ title: `${v.class} starts soon`, body: `${v.class} with ${v.coach} starts at ${v.time}.` }),
    ar: (v) => ({ title: `${v.class} يبدأ قريبًا`, body: `يبدأ ${v.class} مع ${v.coach} الساعة ${v.time}.` }),
    tr: (v) => ({ title: `${v.class} birazdan başlıyor`, body: `${v.coach} ile ${v.class}. Başlangıç: ${v.time}.` }),
  },
  event_soon: {
    en: (v) => ({ title: `${v.event} is coming up`, body: `It starts ${v.when}. Your tickets are in the app.` }),
    ar: (v) => ({ title: `${v.event} قريبًا`, body: `يبدأ ${v.when}. تذاكرك في التطبيق.` }),
    tr: (v) => ({ title: `${v.event} yaklaşıyor`, body: `Başlangıç: ${v.when}. Biletleriniz uygulamada.` }),
  },
  membership_ending: {
    en: (v) => ({ title: "Your membership ends soon", body: `${v.plan} ends on ${v.date}. Renew it in the app to keep booking classes.` }),
    ar: (v) => ({ title: "عضويتك تنتهي قريبًا", body: `تنتهي ${v.plan} في ${v.date}. جدّدها من التطبيق لتواصل حجز الحصص.` }),
    tr: (v) => ({ title: "Üyeliğiniz yakında bitiyor", body: `${v.plan}, ${v.date} tarihinde bitiyor. Ders ayırmaya devam etmek için uygulamadan yenileyin.` }),
  },
  cart_left: {
    en: () => ({ title: "You left something in your cart", body: "Your cart is waiting for you. Finish your order whenever you're ready." }),
    ar: () => ({ title: "نسيت شيئًا في سلتك", body: "سلتك بانتظارك. أكمل طلبك متى شئت." }),
    tr: () => ({ title: "Sepetinizde ürün kaldı", body: "Sepetiniz sizi bekliyor. Hazır olduğunuzda siparişinizi tamamlayın." }),
  },
  study_reminder: {
    en: (v) => ({ title: "Time to study", body: `A few minutes today keeps you going in ${v.course}.` }),
    ar: (v) => ({ title: "حان وقت الدراسة", body: `دقائق قليلة اليوم تُبقيك مستمرًا في ${v.course}.` }),
    tr: (v) => ({ title: "Ders zamanı", body: `Bugün birkaç dakika, ${v.course} kursunda ilerlemenizi sürdürür.` }),
  },
  // 91.2 An order shipped (connected platforms; the shops' own are told by lib/catalog/shipping.ts), completed, cancelled or refunded.
  order_update: {
    en: (v) => ({
      title: `Order ${v.number}`,
      body:
        v.status === "return_approved"
          ? `Your return was approved.${v.reply ? ` ${v.reply}` : ""}`
          : v.status === "return_declined"
            ? `Your return was declined.${v.reply ? ` ${v.reply}` : ""}`
            : v.status === "shipped"
          ? `Your order is on its way${v.tracking ? `: ${v.tracking}` : ""}. Tap to follow it.`
          : v.status === "cancelled"
            ? "Your order was cancelled."
            : v.status === "refunded"
              ? "Your order was refunded."
              : "Your order is complete. Thank you!",
    }),
    ar: (v) => ({
      title: `الطلب ${v.number}`,
      body:
        v.status === "return_approved"
          ? `تمت الموافقة على إرجاع طلبك.${v.reply ? ` ${v.reply}` : ""}`
          : v.status === "return_declined"
            ? `تم رفض إرجاع طلبك.${v.reply ? ` ${v.reply}` : ""}`
            : v.status === "shipped"
          ? `طلبك في الطريق${v.tracking ? `: ${v.tracking}` : ""}. اضغط لتتبّعه.`
          : v.status === "cancelled"
            ? "تم إلغاء طلبك."
            : v.status === "refunded"
              ? "تم استرداد قيمة طلبك."
              : "اكتمل طلبك. شكرًا لك!",
    }),
    tr: (v) => ({
      title: `Sipariş ${v.number}`,
      body:
        v.status === "return_approved"
          ? `İade talebiniz onaylandı.${v.reply ? ` ${v.reply}` : ""}`
          : v.status === "return_declined"
            ? `İade talebiniz reddedildi.${v.reply ? ` ${v.reply}` : ""}`
            : v.status === "shipped"
          ? `Siparişiniz yolda${v.tracking ? `: ${v.tracking}` : ""}. Takip etmek için dokunun.`
          : v.status === "cancelled"
            ? "Siparişiniz iptal edildi."
            : v.status === "refunded"
              ? "Siparişiniz iade edildi."
              : "Siparişiniz tamamlandı. Teşekkürler!",
    }),
  },
};

/** Which of the phone's choices (the app's settings) allows each kind. */
function phoneAllows(device: HostedDevice, kind: AutoKind): boolean {
  const prefs = device.pushPreferences ?? {};
  if (kind === "new_lesson") return prefs.new_lessons !== false;
  // Off unless the student turned it on.
  if (kind === "study_reminder") return prefs.daily_reminder === true;
  // 91.2 Order updates, unless the phone turned them off.
  if (kind === "order_update") return prefs.orders !== false;
  return prefs.announcements !== false;
}

function langOf(devices: HostedDevice[], fallback: Lang): Lang {
  const lang = devices.find((d) => d.language === "en" || d.language === "ar" || d.language === "tr")?.language;
  return (lang as Lang | undefined) ?? fallback;
}

export interface AutoDeps {
  store: DataStore;
  key: Buffer;
  now: Date;
  send?: typeof sendPush;
}

export interface AutoItem {
  userId: number;
  /** What it's about, so it goes once (an appointment, a lesson, a day). */
  ref: string;
  values: Values;
  /** The push's ids: `course_id`, `appointment_id`… (`type` is the kind). */
  data?: Record<string, string>;
}

/** Sends one kind to these people, once each; how many people and phones. */
export async function notifyAuto(deps: AutoDeps, app: App, kind: AutoKind, items: AutoItem[], options: { always?: boolean } = {}): Promise<{ people: number; phones: number }> {
  const { store, now } = deps;
  const out = { people: 0, phones: 0 };
  // 91.3 An answer the person asked for goes whatever the owner's switch says.
  if (items.length === 0 || (!options.always && !autoOn(app, kind)) || !autoKindsFor(app).includes(kind)) return out;
  const account = serviceAccountOf(app, deps.key);
  const fallback = await appLang(store, app.id);
  for (const item of items) {
    if (!(await store.claimAutoNotice({ appId: app.id, kind, ref: item.ref, userId: item.userId, now }))) continue;
    const devices = await store.listHostedPushDevices(app.id, [item.userId]);
    const text = AUTO_TEXT[kind][langOf(devices, fallback)](item.values);
    const title = text.title.slice(0, NOTIFICATION_TITLE_MAX);
    const body = text.body.slice(0, NOTIFICATION_BODY_MAX);
    const data = { ...item.data, type: kind };
    await store.createHostedNotification({ appId: app.id, userId: item.userId, title, body, data, createdAt: now });
    out.people += 1;
    const targets = devices.filter((d) => phoneAllows(d, kind)).map(pushTarget);
    if (!account || targets.length === 0) continue;
    try {
      // No notification ID: its opens count by kind (`type`).
      const result = await (deps.send ?? sendPush)(account, targets, { title, body, data }, { now });
      for (const token of result.invalidTokens) await store.clearHostedPushToken(app.id, token);
      out.phones += result.sent;
    } catch {
      // The inbox has it either way.
    }
  }
  if (out.people > 0) {
    const day = dayOf(now, await appZone(store, app));
    await store.addAnalyticsDaily(app.id, day, { metric: "auto_sent", key: kind, label: kind, value: out.people });
    if (out.phones > 0) await store.addAnalyticsDaily(app.id, day, { metric: "auto_pushed", key: kind, label: kind, value: out.phones });
  }
  return out;
}

function when(lang: Lang, at: Date, zone: string): string {
  return formatDate(lang, at, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone });
}

/** 85.3 A new lesson in a course managed in the dashboard: its students. */
export async function notifyNewLesson(deps: AutoDeps, app: App, course: { id: number; title: string; active: boolean }, lesson: { id: number; title: string }) {
  if (!course.active || !(await appMayNotify(deps.store, app, deps.now))) return { people: 0, phones: 0 };
  const students = await deps.store.listCourseEnrollments({ appId: app.id, courseId: course.id });
  return notifyAuto(
    deps,
    app,
    "new_lesson",
    students.map((s) => ({ userId: s.userId, ref: `lesson:${lesson.id}`, values: { course: course.title, lesson: lesson.title }, data: { course_id: String(course.id), lesson_id: String(lesson.id) } })),
  );
}

/** 85.3 An appointment the business confirmed (from waiting): its customer. */
export async function notifyAppointmentConfirmed(deps: AutoDeps, app: App, appointment: BookingAppointment, zone: string) {
  if (appointment.userId === null || !(await appMayNotify(deps.store, app, deps.now))) return { people: 0, phones: 0 };
  const lang = await appLang(deps.store, app.id);
  return notifyAuto(deps, app, "appointment_confirmed", [
    {
      userId: appointment.userId,
      ref: `appointment:${appointment.id}`,
      values: { service: appointment.serviceName, staff: appointment.staffName, when: when(lang, appointment.startAt, zone) },
      data: { appointment_id: String(appointment.id) },
    },
  ]);
}

/** 91.2 An order of a shop without a website completed or cancelled (Orders, the Owner API): its customer. */
export async function notifyOrderUpdate(deps: AutoDeps, app: App, order: Pick<CatalogOrder, "id" | "userId">, status: "completed" | "cancelled") {
  if (order.userId === null || !(await appMayNotify(deps.store, app, deps.now))) return { people: 0, phones: 0 };
  return notifyAuto(deps, app, "order_update", [
    { userId: order.userId, ref: `order:${order.id}:${status}`, values: { number: orderNumber(order), status }, data: { order_id: String(order.id) } },
  ]);
}

/** 91.3 The shop's answer to a return the customer asked for. Always told: the customer is waiting for it. */
export async function notifyReturnDecision(deps: AutoDeps, app: App, order: Pick<CatalogOrder, "id" | "userId">, decision: "approved" | "declined", reply: string | null) {
  if (order.userId === null || !(await appMayNotify(deps.store, app, deps.now))) return { people: 0, phones: 0 };
  return notifyAuto(
    deps,
    app,
    "order_update",
    [{ userId: order.userId, ref: `return:${order.id}:${decision}`, values: { number: orderNumber(order), status: `return_${decision}`, reply: reply ?? "" }, data: { order_id: String(order.id) } }],
    { always: true },
  );
}

/** 91.2 A change to an order on a connected platform (lib/hosted/order-watch.ts): its customer, once per change. */
export async function notifyPlatformOrder(
  deps: AutoDeps,
  app: App,
  userId: number,
  order: { id: string; number: string; status: "shipped" | "completed" | "cancelled" | "refunded"; tracking: string; ref: string },
) {
  if (!(await appMayNotify(deps.store, app, deps.now))) return { people: 0, phones: 0 };
  return notifyAuto(deps, app, "order_update", [
    { userId, ref: `order:${order.ref}`, values: { number: order.number, status: order.status, tracking: order.tracking }, data: { order_id: order.id } },
  ]);
}

async function appMayNotify(store: DataStore, app: App, now: Date): Promise<boolean> {
  const [client, license] = await Promise.all([store.getClientById(app.clientId), store.getLicenseForApp(app.clientId, app.id)]);
  return client?.status === "active" && appIsActive(license, client, now);
}

export type AutoRunReport = Partial<Record<AutoKind, number>>;

/** The frequent job's part: what is due now, in every hosted app that has it on. */
export async function runAutoNotifications(deps: AutoDeps): Promise<AutoRunReport> {
  const { store, now } = deps;
  const report: AutoRunReport = {};
  const add = (kind: AutoKind, n: number) => {
    if (n > 0) report[kind] = (report[kind] ?? 0) + n;
  };
  const hour = 3_600_000;
  for (const app of await store.listApps()) {
    const kinds = autoKindsFor(app).filter((k) => autoOn(app, k));
    if (kinds.length === 0 || app.demo || !(await appMayNotify(store, app, now))) continue;
    const zone = await appZone(store, app);
    const lang = await appLang(store, app.id);
    try {
      if (kinds.includes("appointment_reminder")) {
        const { items } = await store.listBookingAppointments({
          appId: app.id,
          statuses: ["approved"],
          startFrom: new Date(now.getTime() + hour),
          startBefore: new Date(now.getTime() + AUTO_TIMING.appointmentHours * hour),
          offset: 0,
          limit: 500,
        });
        const due = items.filter((a): a is BookingAppointment & { userId: number } => a.userId !== null);
        const sent = await notifyAuto(
          deps,
          app,
          "appointment_reminder",
          due.map((a) => ({
            userId: a.userId,
            ref: `appointment:${a.id}:${a.startAt.toISOString()}`,
            values: { service: a.serviceName, staff: a.staffName, when: when(lang, a.startAt, zone) },
            data: { appointment_id: String(a.id) },
          })),
        );
        add("appointment_reminder", sent.people);
      }
      if (kinds.includes("class_soon")) {
        const sessions = (await store.listClassSessions({ appId: app.id, startFrom: now, startBefore: new Date(now.getTime() + AUTO_TIMING.classHours * hour) })).filter((s) => s.status === "scheduled");
        if (sessions.length) {
          const bookings = await store.listClassBookings({ appId: app.id, sessionIds: sessions.map((s) => s.id), status: "booked" });
          const byId = new Map(sessions.map((s) => [s.id, s]));
          const items: AutoItem[] = [];
          for (const b of bookings) {
            const s = byId.get(b.sessionId);
            if (!s || b.userId === null) continue;
            items.push({ userId: b.userId, ref: `class:${s.id}`, values: { class: s.serviceName, coach: s.staffName, time: utcToLocal(s.startAt, zone).time }, data: { class_id: String(s.id) } });
          }
          add("class_soon", (await notifyAuto(deps, app, "class_soon", items)).people);
        }
      }
      if (kinds.includes("membership_ending")) {
        const until = now.getTime() + AUTO_TIMING.membershipDays * 24 * hour;
        const ending = (await store.listMemberships({ appId: app.id, limit: 2000 })).filter((m) => m.status === "active" && m.endsAt !== null && m.endsAt.getTime() > now.getTime() && m.endsAt.getTime() <= until);
        const sent = await notifyAuto(
          deps,
          app,
          "membership_ending",
          ending.map((m) => ({
            userId: m.userId,
            ref: `membership:${m.id}:${m.endsAt!.toISOString()}`,
            values: { plan: m.planName, date: formatDate(lang, m.endsAt!, { day: "numeric", month: "long", timeZone: zone }) },
          })),
        );
        add("membership_ending", sent.people);
      }
      if (kinds.includes("event_soon")) {
        const until = now.getTime() + AUTO_TIMING.eventHours * hour;
        const events = (await store.listEvents(app.id)).filter((e) => e.status === "published" && e.startAt.getTime() > now.getTime() && e.startAt.getTime() <= until);
        for (const event of events) {
          const holders = new Set((await store.listTickets({ appId: app.id, eventId: event.id })).filter((t) => t.status === "valid" && t.userId !== null).map((t) => t.userId!));
          const sent = await notifyAuto(
            deps,
            app,
            "event_soon",
            [...holders].map((userId) => ({ userId, ref: `event:${event.id}`, values: { event: event.title, when: when(lang, event.startAt, zone) }, data: { event_id: String(event.id) } })),
          );
          add("event_soon", sent.people);
        }
      }
      if (kinds.includes("study_reminder")) {
        const local = utcToLocal(now, zone);
        const hourNow = Number(local.time.slice(0, 2));
        if (hourNow >= AUTO_TIMING.studyFrom && hourNow < AUTO_TIMING.studyUntil) {
          const courses = new Map((app.courseSetup?.courses ?? []).filter((c) => c.active).map((c) => [c.id, c.title]));
          const firstCourse = new Map<number, string>();
          for (const e of await store.listCourseEnrollments({ appId: app.id })) {
            const title = courses.get(e.courseId);
            if (title && !firstCourse.has(e.userId)) firstCourse.set(e.userId, title);
          }
          // Only students one of whose phones has the reminder on.
          const on = new Set((await store.listHostedPushDevices(app.id, [...firstCourse.keys()])).filter((d) => d.pushPreferences?.daily_reminder === true).map((d) => d.userId));
          const sent = await notifyAuto(
            deps,
            app,
            "study_reminder",
            [...firstCourse].filter(([userId]) => on.has(userId)).map(([userId, course]) => ({ userId, ref: `day:${local.date}`, values: { course } })),
          );
          add("study_reminder", sent.people);
        }
      }
    } catch (error) {
      // One app's trouble never stops the others'.
      console.error("[auto-notifications]", app.id, error instanceof Error ? error.message : String(error));
    }
  }
  // Carts left: every store app's at once, oldest first.
  const carts = await store.listLeftHostedCarts(new Date(now.getTime() - AUTO_TIMING.cartDays * 24 * hour), new Date(now.getTime() - AUTO_TIMING.cartHours * hour), 200);
  const apps = new Map<string, App | null>();
  for (const cart of carts) {
    if (!apps.has(cart.appId)) {
      const app = await store.getAppById(cart.appId);
      apps.set(cart.appId, app && !app.demo && autoKindsFor(app).includes("cart_left") && autoOn(app, "cart_left") && (await appMayNotify(store, app, now)) ? app : null);
    }
    const app = apps.get(cart.appId);
    if (!app || !(await store.markHostedCartReminded(app.id, cart.userId, cart.updatedAt, now))) continue;
    add("cart_left", (await notifyAuto(deps, app, "cart_left", [{ userId: cart.userId, ref: `cart:${cart.updatedAt.toISOString()}`, values: {} }])).people);
  }
  return report;
}
