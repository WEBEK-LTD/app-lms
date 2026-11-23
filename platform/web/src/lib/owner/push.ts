import type { Lang } from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { getDashT, knownTranslator, type DashKey, type DashT } from "@/i18n/dashboard";
import { announcementText, audienceRecipients, isLive } from "../announcements";
import { appLabel } from "../app/label";
import { appAreas } from "../app/areas";
import { formatCents } from "../catalog/money";
import { orderNumber } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type {
  Announcement,
  App,
  BookingAppointment,
  Build,
  CatalogOrder,
  Course,
  CourseQuestion,
  CourseReview,
  Donation,
  FoodOrder,
  Listing,
  MarketComplaint,
  MarketOrder,
  OwnerDevice,
  OwnerNotice,
  OwnerPushKind,
  SchoolLeave,
  SchoolPerson,
  Shipment,
  User,
} from "../data/types";
import { shipmentReference } from "../delivery/service";
import { foodOrderReference } from "../food/service";
import { marketOrderReference } from "../market/json";
import { OWNER_ACCESS, PUSH_PERMISSION, teamCan, type TeamAccess, type TeamPermission } from "../team/permissions";
import { businessFor, businessName, memberAccess } from "../team/service";
import { failureReason } from "../builds/view";
import { pushTarget, sendPush, type ServiceAccount } from "../hosted/push";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX } from "../hosted/notify";
import { summaryOf } from "../updates";
import { ownerLang } from "./lang";
import { OWNER_SOUND_GROUP_OF, pushDelivery, type PushDelivery } from "./push-sounds";

/**
 * 58 Pushes to the owners' phones (Yallapp Business), from Yallapp Business's
 * own Firebase project, at the same moments the dashboard and its emails
 * learn of things: an order paid, an appointment booked, a message, a
 * donation or a payment to Yallapp, a build finished, an update from
 * Yallapp, a notice on the account. Each device gets the kinds it left on,
 * in the person's language (else the language its phone signed in with).
 * Best effort: a push never holds up or fails what caused it.
 */

export interface OwnerPushMessage {
  title: string;
  body: string;
  data: Record<string, string>;
  /** 207 How it sounds on the phones it goes to (lib/owner/push-sounds.ts); missing on phones that never chose. */
  dataOnly?: boolean;
  apnsSound?: string | null;
  timeSensitive?: boolean;
  /** 214 iOS: wakes the app too, so its home-screen widget reads again. */
  contentAvailable?: boolean;
}

/** 214 The pushes that change the home-screen widget's figures (the app's own list: lib/app.dart). */
export const WIDGET_KINDS: ReadonlySet<OwnerPushKind> = new Set<OwnerPushKind>(["new_order", "new_food_order", "new_market_order", "shipment_waiting", "order_cancelled"]);

export interface OwnerPushDeps {
  store: DataStore;
  now: Date;
  /** Yallapp Business's Firebase service account (OWNER_PUSH_FIREBASE_SERVICE_ACCOUNT); null: nothing is sent. */
  account: ServiceAccount | null;
  send?: typeof sendPush;
  /** Local runs and tests (YALLAPP_OWNER_PUSH_DIR): every push, also when nothing can be sent. */
  capture?: (push: { to: string[]; message: OwnerPushMessage }) => Promise<void>;
  /** 78.3 A push that couldn't be sent: the team's alert (lib/watch). */
  failed?: (reason: string) => Promise<void>;
}

export interface Words {
  lang: Lang;
  t: DashT;
  k: (english: string) => string;
}

const wordsFor = (lang: Lang): Words => ({ lang, t: getDashT(lang), k: knownTranslator(lang) });
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export interface Recipient {
  language: string | null | undefined;
  device: OwnerDevice;
  /** 64 The business's name as this person knows it (`Business.name`). */
  business: string;
}

/**
 * The people of a client who may see a push: the owner, and 60 the team
 * with `permission` on the app (`appId`). 64 Every phone each of them is
 * signed in on that wants `kind`, whichever business it is working on (one
 * the person still works on), so someone on several businesses hears of all
 * of them. Each with its person's language and the business's name.
 */
export async function devicesFor(store: DataStore, clientId: string, kind: OwnerPushKind, permission: TeamPermission, appId: string | null, now: Date, only: readonly string[] | null = null): Promise<Recipient[]> {
  const client = await store.getClientById(clientId);
  const owner = client ? await store.getUserById(client.userId) : null;
  if (!client || !owner) return [];
  const people: { user: User; access: TeamAccess }[] = [
    { user: owner, access: OWNER_ACCESS },
    ...(await store.listTeamMembers(clientId)).filter((row) => row.user.id !== owner.id).map((row) => ({ user: row.user, access: memberAccess(row.member) })),
  ];
  const apps = await store.listAppsByClient(clientId);
  const out: Recipient[] = [];
  const seen = new Set<string>();
  for (const { user, access } of people) {
    // 125 A person's own alerts and brief go to them only.
    if (only && !only.includes(user.id)) continue;
    if (!teamCan(access, permission, appId)) continue;
    const name = businessName(owner, access.role === "owner" || access.appIds === null ? apps : apps.filter((a) => access.appIds!.includes(a.id)));
    const works = new Map<string, boolean>([[clientId, true]]);
    for (const device of await store.listOwnerDevices(user.id)) {
      if (seen.has(device.id) || !device.pushToken || device.pushPreferences?.[kind] === false || device.refreshExpiresAt.getTime() <= now.getTime()) continue;
      if (device.sessionVersion !== user.sessionVersion) continue;
      // A phone on a business the person left is signed out there: nothing goes to it.
      if (!works.has(device.clientId)) works.set(device.clientId, (await businessFor(store, user, device.clientId)) !== null);
      if (!works.get(device.clientId)) continue;
      seen.add(device.id);
      out.push({ language: user.language, device, business: name });
    }
  }
  return out;
}

/** Sends one kind of push to the phones of a client (its owner, and 60 the team as their roles allow), worded per language; returns the phones it went to. */
export async function pushToOwner(
  deps: OwnerPushDeps,
  clientId: string,
  kind: OwnerPushKind,
  /** 214 With `data`: what the push carries in this language too (a new order's total, as the shop writes it). */
  word: (words: Words) => { title: string; body: string; data?: Record<string, string> },
  data: Record<string, string>,
  /** 60 Who may get it; by default the kind's (PUSH_PERMISSION). */
  permission: TeamPermission = PUSH_PERMISSION[kind],
  /** 125 Only these people (user IDs): a person's own Prime alerts. */
  only: readonly string[] | null = null,
  /** 214 Only these phones (device IDs): each phone's end-of-day summary at its own time. */
  phones: readonly string[] | null = null,
): Promise<number> {
  try {
    const found = (await devicesFor(deps.store, clientId, kind, permission, data.app_id ?? null, deps.now, only)).filter((r) => !phones || phones.includes(r.device.id));
    if (found.length === 0) return 0;
    // 64 One message per language and business name, with the name first on phones working on another business.
    // 207 And per sound: each phone's ringtones (as before for a phone that never chose).
    const groups = new Map<string, { lang: Lang; business: string; other: boolean; delivery: PushDelivery | null; devices: OwnerDevice[] }>();
    for (const { language, device, business } of found) {
      const lang = ownerLang(language, device.language);
      const other = device.clientId !== clientId;
      // 214 A new order's value picks its sound on phones that ring by value.
      const value = data.order_value !== undefined ? Number(data.order_value) : null;
      const delivery = pushDelivery(device, kind, deps.now, Number.isFinite(value) ? value : null);
      const key = JSON.stringify([lang, business, other, delivery]);
      const group = groups.get(key) ?? { lang, business, other, delivery, devices: [] };
      group.devices.push(device);
      groups.set(key, group);
    }
    let sent = 0;
    for (const { lang, business, other, delivery, devices } of groups.values()) {
      const words = wordsFor(lang);
      const text = word(words);
      const name = business === "Untitled app" ? words.k(business) : business;
      const title = other ? `${name} · ${text.title}` : text.title;
      const message: OwnerPushMessage = {
        title: clip(title, NOTIFICATION_TITLE_MAX),
        body: clip(text.body, NOTIFICATION_BODY_MAX),
        data: { type: "owner", kind, ...data, ...(text.data ?? {}), ...(delivery?.data ?? {}), business_id: clientId, business_name: name },
        ...(delivery ? { dataOnly: delivery.dataOnly, apnsSound: delivery.apnsSound, timeSensitive: delivery.timeSensitive } : {}),
        // 214 A new order is time-sensitive on every iPhone, also one that never chose its ringtones.
        ...(!delivery && OWNER_SOUND_GROUP_OF[kind] === "orders" ? { timeSensitive: true } : {}),
        ...(WIDGET_KINDS.has(kind) && !delivery?.dataOnly ? { contentAvailable: true } : {}),
      };
      await deps.capture?.({ to: devices.map((d) => d.id), message });
      if (!deps.account) continue;
      const result = await (deps.send ?? sendPush)(deps.account, devices.map(pushTarget), message, { now: deps.now });
      for (const token of result.invalidTokens) await deps.store.clearOwnerPushToken(token, null);
      sent += result.sent;
    }
    return sent;
  } catch (error) {
    console.error("[owner-push]", kind, error instanceof Error ? error.message : String(error));
    await deps.failed?.(error instanceof Error ? error.message : String(error)).catch(() => undefined);
    return 0;
  }
}

function appName(app: Pick<App, "appName">, words: Words): string {
  const name = appLabel(app);
  return name === "Untitled app" ? words.k(name) : name;
}

// What each moment says

/**
 * An order was paid (settle.ts, the moment the dashboard's "New order" email
 * goes). 125 Only for apps whose orders are catalog orders (Yallapp Business
 * opens them on Orders): a school's fee paid by card is a payment received,
 * and delivery, food and ride apps' payment links are their engines' own
 * (`new_food_order`, `shipment_waiting`), so nothing is pushed for them here.
 */
export function pushNewOrder(deps: OwnerPushDeps, app: App, order: CatalogOrder): Promise<number> {
  if (app.demo) return Promise.resolve(0);
  if (!appAreas(app).orders) {
    if (app.connector?.kind !== "school") return Promise.resolve(0);
    return pushToOwner(
      deps,
      app.clientId,
      "payment_received",
      (w) => ({ title: w.t("owner.push.schoolFee"), body: w.t("owner.push.schoolFeeBody", { app: appName(app, w), amount: formatCents(order.totalCents, order.currency, w.lang) }) }),
      { app_id: app.id },
      "settings",
    );
  }
  const title = (w: Words) => w.t("owner.push.newOrder", { number: orderNumber(order) });
  return pushThenLive(
    pushToOwner(
      deps,
      app.clientId,
      "new_order",
      (w) => ({ title: title(w), body: w.t("owner.push.newOrderBody", { app: appName(app, w), total: formatCents(order.totalCents, order.currency, w.lang) }), data: { order_total: formatCents(order.totalCents, order.currency, w.lang) } }),
      { app_id: app.id, order_id: String(order.id), order_value: orderValue(order.totalCents), ...liveData(orderNumber(order), order.customer?.name ?? "", order.currency, order.createdAt ?? deps.now) },
    ),
    deps,
    app,
    { appId: app.id, kind: "new_order", orderId: String(order.id), number: orderNumber(order), customer: order.customer?.name ?? "", total: (lang) => formatCents(order.totalCents, order.currency, lang), placedAt: order.createdAt ?? deps.now },
    title,
  );
}

/** 214 What the app needs to show a new order's Live Activity itself while it is open. */
function liveData(number: string, customer: string, currency: string, placedAt: Date): Record<string, string> {
  return { order_number: number, order_customer: customer.trim().split(/\s+/)[0]?.slice(0, 40) ?? "", order_currency: currency, order_placed_at: String(Math.floor(placedAt.getTime() / 1000)) };
}

/** 214 The new order's push, then its Live Activity on the iPhones that show one. */
async function pushThenLive(sending: Promise<number>, deps: OwnerPushDeps, app: App, order: import("./live-activity").LiveOrder, title: (w: Words) => string): Promise<number> {
  const sent = await sending;
  const { startOrderActivities } = await import("./live-activity");
  await startOrderActivities(deps, app, order, title);
  return sent;
}

/** 214 An order's total in whole units ("1250.5"), for ringing by order value. */
export function orderValue(cents: number): string {
  return String(Math.round(cents) / 100);
}

/** 91.3 A customer asked to return an order. */
export function pushReturnRequested(deps: OwnerPushDeps, app: App, order: CatalogOrder): Promise<number> {
  if (app.demo) return Promise.resolve(0);
  return pushToOwner(
    deps,
    app.clientId,
    "new_order",
    (w) => ({ title: w.t("owner.push.returnRequested", { number: orderNumber(order) }), body: w.t("owner.push.returnRequestedBody", { app: appName(app, w) }) }),
    { app_id: app.id, order_id: String(order.id) },
  );
}

/** An appointment was booked in the app (the "New appointment" email). */
export function pushNewBooking(deps: OwnerPushDeps, app: App, appointment: BookingAppointment, timeZone: string): Promise<number> {
  if (app.demo) return Promise.resolve(0);
  return pushToOwner(
    deps,
    app.clientId,
    "new_booking",
    (w) => ({
      title: w.t("owner.push.newBooking"),
      body: w.t("owner.push.newBookingBody", {
        app: appName(app, w),
        service: appointment.serviceName,
        staff: appointment.staffName,
        when: formatDate(w.lang, appointment.startAt, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone }),
      }),
    }),
    { app_id: app.id, appointment_id: String(appointment.id) },
  );
}

/** A message about a listing arrived (the "New message" email). */
export function pushNewMessage(deps: OwnerPushDeps, app: App, input: { inquiryId: number; listing: Pick<Listing, "title">; name: string; text: string }): Promise<number> {
  if (app.demo) return Promise.resolve(0);
  return pushToOwner(
    deps,
    app.clientId,
    "new_message",
    (w) => ({ title: w.t("owner.push.newMessage", { listing: input.listing.title }), body: w.t("owner.push.newMessageBody", { name: input.name, text: clip(input.text, 160) }) }),
    { app_id: app.id, inquiry_id: String(input.inquiryId) },
  );
}

/** 63 A student asked a question in a course, or wrote again under one (to the people with Messages). */
export function pushNewQuestion(deps: OwnerPushDeps, app: App, input: { question: CourseQuestion; course: Pick<Course, "title">; name: string; text: string; followUp: boolean }): Promise<number> {
  if (app.demo) return Promise.resolve(0);
  return pushToOwner(
    deps,
    app.clientId,
    "new_message",
    (w) => ({
      title: input.followUp ? w.t("owner.push.newQuestionAgain", { name: input.name, course: input.course.title }) : w.t("owner.push.newQuestion", { course: input.course.title }),
      body: w.t("owner.push.newQuestionBody", { name: input.name, text: clip(input.text, 160) }),
    }),
    { app_id: app.id, question_id: String(input.question.id) },
  );
}

/** 63 A student reviewed a course (to the people with Catalog & content). */
export function pushNewReview(deps: OwnerPushDeps, app: App, input: { review: CourseReview; course: Pick<Course, "title">; name: string }): Promise<number> {
  if (app.demo) return Promise.resolve(0);
  return pushToOwner(
    deps,
    app.clientId,
    "new_review",
    (w) => ({
      title: w.t("owner.push.newReview", { course: input.course.title }),
      body: w.t("owner.push.newReviewBody", { name: input.name, stars: String(input.review.rating), text: clip(input.review.text, 140) }).trim(),
    }),
    { app_id: app.id, review_id: String(input.review.id) },
  );
}

/** A donation was paid (the donor's receipt goes at the same moment). */
export function pushDonation(deps: OwnerPushDeps, app: App, donation: Donation): Promise<number> {
  if (app.demo) return Promise.resolve(0);
  return pushToOwner(
    deps,
    app.clientId,
    "payment_received",
    (w) => ({
      title: w.t("owner.push.donation"),
      body: w.t("owner.push.donationBody", { app: appName(app, w), amount: formatCents(donation.amountCents, donation.currency, w.lang), campaign: donation.campaignTitle }),
    }),
    { app_id: app.id, donation_id: String(donation.id) },
    "donations",
  );
}

/** A payment to Yallapp (a plan or storage) was confirmed (the receipt in the bell). */
export function pushPlanPayment(deps: OwnerPushDeps, clientId: string, app: App | null, amount: string, paymentId: string): Promise<number> {
  return pushToOwner(
    deps,
    clientId,
    "payment_received",
    (w) => ({ title: w.t("owner.push.payment"), body: w.t("owner.push.paymentBody", { app: app ? appName(app, w) : "Yallapp", amount }) }),
    { ...(app ? { app_id: app.id } : {}), update_key: `payment:${paymentId}` },
  );
}

/** A build is ready or didn't finish (the "Build ready" or "Build didn't finish" email). */
export function pushBuildFinished(deps: OwnerPushDeps, app: App, build: Build): Promise<number> {
  const ready = build.status === "ready";
  return pushToOwner(
    deps,
    build.clientId,
    "build_finished",
    (w) =>
      ready
        ? { title: w.t("owner.push.buildReady", { number: build.number }), body: w.t("owner.push.buildReadyBody", { app: appName(app, w), version: build.versionName }) }
        : { title: w.t("owner.push.buildFailed", { number: build.number }), body: w.t("owner.push.buildFailedBody", { app: appName(app, w), reason: w.k(failureReason(build)) }) },
    { app_id: app.id, build_id: build.id, update_key: `build:${build.id}` },
  );
}

/** A notice on the account (the overview's notices and their emails). */
export function pushNotice(deps: OwnerPushDeps, notice: OwnerNotice): Promise<number> {
  return pushToOwner(deps, notice.clientId, "account_notices", (w) => ({ title: w.k(notice.title), body: w.k(notice.body) }), {
    app_id: notice.appId,
    update_key: `notice:${notice.id}`,
  });
}

/** Yallapp published an update that is live now: to each client in its audience, in their language when the team wrote it. */
export async function pushAnnouncement(deps: OwnerPushDeps, announcement: Announcement, clientIds: string[]): Promise<number> {
  if (!isLive(announcement, deps.now)) return 0;
  let sent = 0;
  for (const clientId of clientIds) {
    sent += await pushToOwner(
      deps,
      clientId,
      "yallapp_updates",
      (w) => {
        const text = announcementText(announcement, w.lang);
        return { title: text.title, body: summaryOf(text.body) };
      },
      { update_key: `announcement:${announcement.id}` },
    );
  }
  return sent;
}

/** 61 Pushed late only within this long after it started (a job that was off doesn't push old news). */
const LATE_START_MS = 24 * 3_600_000;

/**
 * 61 Announcements set to start later reach the owners' phones when they
 * start: the frequent job (every 5 minutes) takes each live one not pushed
 * yet, once (a conditional update, so two runs never push it twice), and
 * pushes it to the clients in its audience then. Returns how many were pushed.
 */
export async function pushStartedAnnouncements(deps: OwnerPushDeps): Promise<{ announcements: number; phones: number }> {
  const { store, now } = deps;
  let announcements = 0;
  let phones = 0;
  for (const announcement of await store.listAnnouncements()) {
    if (announcement.pushedAt || !isLive(announcement, now)) continue;
    if (!(await store.claimAnnouncementPush(announcement.id, now))) continue;
    if (now.getTime() - announcement.startsAt.getTime() > LATE_START_MS) continue;
    const clientIds = (await audienceRecipients(store, announcement.audience, now)).map((r) => r.clientId);
    phones += await pushAnnouncement(deps, announcement, clientIds);
    announcements += 1;
  }
  return { announcements, phones };
}

// 125 The Studio apps' engines

/** A food order reached the restaurants (paid by card, or cash on delivery). */
export function pushNewFoodOrder(deps: OwnerPushDeps, app: App, order: FoodOrder): Promise<number> {
  if (app.demo) return Promise.resolve(0);
  const title = (w: Words) => w.t("owner.push.newFoodOrder", { reference: foodOrderReference(order) });
  return pushThenLive(
    pushToOwner(
      deps,
      app.clientId,
      "new_food_order",
      (w) => ({
        title: title(w),
        body: w.t("owner.push.newFoodOrderBody", { restaurant: order.restaurantName, total: formatCents(order.totalCents, order.currency, w.lang) }),
        data: { order_total: formatCents(order.totalCents, order.currency, w.lang) },
      }),
      { app_id: app.id, food_order_id: String(order.id), order_value: orderValue(order.totalCents), ...liveData(foodOrderReference(order), order.customerName, order.currency, order.createdAt ?? deps.now) },
    ),
    deps,
    app,
    { appId: app.id, kind: "new_food_order", orderId: String(order.id), number: foodOrderReference(order), customer: order.customerName, total: (lang) => formatCents(order.totalCents, order.currency, lang), placedAt: order.createdAt ?? deps.now },
    title,
  );
}

/** A shipment (or a food order's courier job) waits for a courier. */
export function pushShipmentWaiting(deps: OwnerPushDeps, app: App, shipment: Shipment): Promise<number> {
  if (app.demo) return Promise.resolve(0);
  return pushToOwner(
    deps,
    app.clientId,
    "shipment_waiting",
    (w) => ({
      title: w.t("owner.push.shipmentWaiting", { reference: shipmentReference(shipment) }),
      body: w.t("owner.push.shipmentWaitingBody", { from: shipment.pickup.address, to: shipment.dropoff.address }),
    }),
    { app_id: app.id, shipment_id: String(shipment.id) },
  );
}

/** A customer opened a complaint on a marketplace order. */
export function pushNewComplaint(deps: OwnerPushDeps, app: App, complaint: Pick<MarketComplaint, "id" | "reason" | "text">, order: Pick<MarketOrder, "id">): Promise<number> {
  if (app.demo) return Promise.resolve(0);
  return pushToOwner(
    deps,
    app.clientId,
    "new_complaint",
    (w) => ({
      title: w.t("owner.push.newComplaint", { reference: marketOrderReference(order) }),
      body: [w.t(`market.r_${complaint.reason}` as DashKey), clip(complaint.text, 140)].filter(Boolean).join(": "),
    }),
    { app_id: app.id, complaint_id: String(complaint.id) },
  );
}

/** A teacher or staff member asked for leave: the administration's phones (the app's settings), as excuses do. */
export function pushLeaveRequested(deps: OwnerPushDeps, app: App, leave: SchoolLeave, person: Pick<SchoolPerson, "name">): Promise<number> {
  if (app.demo) return Promise.resolve(0);
  return pushToOwner(
    deps,
    app.clientId,
    "new_message",
    (w) => ({ title: w.t("owner.push.leave", { name: person.name }), body: leave.startsOn === leave.endsOn ? leave.startsOn : `${leave.startsOn} – ${leave.endsOn}` }),
    { app_id: app.id, leave_id: String(leave.id) },
    "settings",
  );
}

/** 125 One of a person's Prime alerts (`alert` its kind, `ids` the item's), to them only. */
export function pushPrimeAlert(deps: OwnerPushDeps, app: App, userId: string, alert: string, word: (words: Words) => { title: string; body: string }, ids: Record<string, string>): Promise<number> {
  return pushToOwner(deps, app.clientId, "prime_alert", word, { app_id: app.id, alert, ...ids }, PUSH_PERMISSION.prime_alert, [userId]);
}

/** 125 A person's morning brief, to them only. */
export function pushMorningBrief(deps: OwnerPushDeps, app: App, userId: string, word: (words: Words) => { title: string; body: string }): Promise<number> {
  return pushToOwner(deps, app.clientId, "morning_brief", word, { app_id: app.id, alert: "morning_brief" }, PUSH_PERMISSION.morning_brief, [userId]);
}

// 207 Marketplace orders, and orders a customer cancelled

/** A marketplace order reached its vendor (placed with cash or the wallet, paid online, or a scheduled one released). */
export function pushNewMarketOrder(deps: OwnerPushDeps, app: App, order: Pick<MarketOrder, "id" | "vendorName" | "money" | "currency"> & Partial<Pick<MarketOrder, "customerName" | "createdAt">>): Promise<number> {
  if (app.demo) return Promise.resolve(0);
  const title = (w: Words) => w.t("owner.push.newMarketOrder", { reference: marketOrderReference(order) });
  const placedAt = order.createdAt ?? deps.now;
  return pushThenLive(
    pushToOwner(
      deps,
      app.clientId,
      "new_market_order",
      (w) => ({
        title: title(w),
        body: w.t("owner.push.newMarketOrderBody", { vendor: order.vendorName, total: formatCents(order.money.total, order.currency, w.lang) }),
        data: { order_total: formatCents(order.money.total, order.currency, w.lang) },
      }),
      { app_id: app.id, market_order_id: String(order.id), order_value: orderValue(order.money.total), ...liveData(marketOrderReference(order), order.customerName ?? "", order.currency, placedAt) },
    ),
    deps,
    app,
    { appId: app.id, kind: "new_market_order", orderId: String(order.id), number: marketOrderReference(order), customer: order.customerName ?? "", total: (lang) => formatCents(order.money.total, order.currency, lang), placedAt },
    title,
  );
}

/** A customer cancelled a food or marketplace order before it was made. */
export function pushOrderCancelled(deps: OwnerPushDeps, app: App, order: { reference: string; place: string; ids: Record<string, string> }): Promise<number> {
  if (app.demo) return Promise.resolve(0);
  return pushToOwner(
    deps,
    app.clientId,
    "order_cancelled",
    (w) => ({ title: w.t("owner.push.orderCancelled", { reference: order.reference }), body: w.t("owner.push.orderCancelledBody", { place: order.place }) }),
    { app_id: app.id, ...order.ids },
  );
}
