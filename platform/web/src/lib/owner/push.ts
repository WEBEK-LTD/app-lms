import type { Lang } from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { getDashT, knownTranslator, type DashT } from "@/i18n/dashboard";
import { announcementText, audienceRecipients, isLive } from "../announcements";
import { appLabel } from "../app/label";
import { formatCents } from "../catalog/money";
import { orderNumber } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { Announcement, App, BookingAppointment, Build, CatalogOrder, Donation, Listing, OwnerDevice, OwnerNotice, OwnerPushKind, User } from "../data/types";
import { OWNER_ACCESS, PUSH_PERMISSION, teamCan, type TeamAccess, type TeamPermission } from "../team/permissions";
import { memberAccess } from "../team/service";
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

/**
 * The devices signed in to a client that want `kind`, still signed in, and
 * 60 whose person may see it: the owner, or someone on the team with
 * `permission` on the app (`appId`). Each with its person's language.
 */
async function devicesFor(
  store: DataStore,
  clientId: string,
  kind: OwnerPushKind,
  permission: TeamPermission,
  appId: string | null,
  now: Date,
): Promise<{ language: string | null | undefined; device: OwnerDevice }[]> {
  const client = await store.getClientById(clientId);
  if (!client) return [];
  const wanting = (await store.listOwnerDevicesOfClient(clientId)).filter((d) => d.pushToken && d.pushPreferences?.[kind] !== false && d.refreshExpiresAt.getTime() > now.getTime());
  const people = new Map<string, { user: User; access: TeamAccess } | null>();
  const out: { language: string | null | undefined; device: OwnerDevice }[] = [];
  for (const device of wanting) {
    if (!people.has(device.userId)) {
      const user = await store.getUserById(device.userId);
      const member = user && user.id !== client.userId ? await store.getTeamMember(clientId, user.id) : null;
      people.set(device.userId, user && (user.id === client.userId || member) ? { user, access: member ? memberAccess(member) : OWNER_ACCESS } : null);
    }
    const person = people.get(device.userId);
    if (!person || person.user.sessionVersion !== device.sessionVersion || !teamCan(person.access, permission, appId)) continue;
    out.push({ language: person.user.language, device });
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
    const byLang = new Map<Lang, OwnerDevice[]>();
    for (const { language, device } of found) {
      const lang = ownerLang(language, device.language);
      byLang.set(lang, [...(byLang.get(lang) ?? []), device]);
    }
    let sent = 0;
    for (const [lang, devices] of byLang) {
      const text = word(wordsFor(lang));
      const message: OwnerPushMessage = { title: clip(text.title, NOTIFICATION_TITLE_MAX), body: clip(text.body, NOTIFICATION_BODY_MAX), data: { type: "owner", kind, ...data } };
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
