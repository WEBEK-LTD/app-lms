import type { Lang } from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { getDashT, knownTranslator, type DashT } from "@/i18n/dashboard";
import { announcementText, audienceRecipients, isLive } from "../announcements";
import { appLabel } from "../app/label";
import { formatCents } from "../catalog/money";
import { orderNumber } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { Announcement, App, BookingAppointment, Build, CatalogOrder, Course, CourseQuestion, CourseReview, Donation, Listing, OwnerDevice, OwnerNotice, OwnerPushKind, User } from "../data/types";
import { OWNER_ACCESS, PUSH_PERMISSION, teamCan, type TeamAccess, type TeamPermission } from "../team/permissions";
import { businessFor, businessName, memberAccess } from "../team/service";
import { failureReason } from "../builds/view";
import { pushTarget, sendPush, type ServiceAccount } from "../hosted/push";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX } from "../hosted/notify";
import { summaryOf } from "../updates";
import { ownerLang } from "./lang";

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
}

export interface OwnerPushDeps {
  store: DataStore;
  now: Date;
  /** Yallapp Business's Firebase service account (OWNER_PUSH_FIREBASE_SERVICE_ACCOUNT); null: nothing is sent. */
  account: ServiceAccount | null;
  send?: typeof sendPush;
  /** Local runs and tests (YALLAPP_OWNER_PUSH_DIR): every push, also when nothing can be sent. */
  capture?: (push: { to: string[]; message: OwnerPushMessage }) => Promise<void>;
}

export interface Words {
  lang: Lang;
  t: DashT;
  k: (english: string) => string;
}

const wordsFor = (lang: Lang): Words => ({ lang, t: getDashT(lang), k: knownTranslator(lang) });
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

interface Recipient {
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
async function devicesFor(store: DataStore, clientId: string, kind: OwnerPushKind, permission: TeamPermission, appId: string | null, now: Date): Promise<Recipient[]> {
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
  word: (words: Words) => { title: string; body: string },
  data: Record<string, string>,
  /** 60 Who may get it; by default the kind's (PUSH_PERMISSION). */
  permission: TeamPermission = PUSH_PERMISSION[kind],
): Promise<number> {
  try {
    const found = await devicesFor(deps.store, clientId, kind, permission, data.app_id ?? null, deps.now);
    if (found.length === 0) return 0;
    // 64 One message per language and business name, with the name first on phones working on another business.
    const groups = new Map<string, { lang: Lang; business: string; other: boolean; devices: OwnerDevice[] }>();
    for (const { language, device, business } of found) {
      const lang = ownerLang(language, device.language);
      const other = device.clientId !== clientId;
      const key = JSON.stringify([lang, business, other]);
      const group = groups.get(key) ?? { lang, business, other, devices: [] };
      group.devices.push(device);
      groups.set(key, group);
    }
    let sent = 0;
    for (const { lang, business, other, devices } of groups.values()) {
      const words = wordsFor(lang);
      const text = word(words);
      const name = business === "Untitled app" ? words.k(business) : business;
      const title = other ? `${name} · ${text.title}` : text.title;
      const message: OwnerPushMessage = {
        title: clip(title, NOTIFICATION_TITLE_MAX),
        body: clip(text.body, NOTIFICATION_BODY_MAX),
        data: { type: "owner", kind, ...data, business_id: clientId, business_name: name },
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
    return 0;
  }
}

function appName(app: Pick<App, "appName">, words: Words): string {
  const name = appLabel(app);
  return name === "Untitled app" ? words.k(name) : name;
}

// What each moment says

/** An order was paid (settle.ts, the moment the dashboard's "New order" email goes). */
export function pushNewOrder(deps: OwnerPushDeps, app: App, order: CatalogOrder): Promise<number> {
  if (app.demo) return Promise.resolve(0);
  return pushToOwner(
    deps,
    app.clientId,
    "new_order",
    (w) => ({ title: w.t("owner.push.newOrder", { number: orderNumber(order) }), body: w.t("owner.push.newOrderBody", { app: appName(app, w), total: formatCents(order.totalCents, order.currency) }) }),
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
      body: w.t("owner.push.donationBody", { app: appName(app, w), amount: formatCents(donation.amountCents, donation.currency), campaign: donation.campaignTitle }),
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
