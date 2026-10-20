import type { Lang } from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { getDashT, knownTranslator, type DashT } from "@/i18n/dashboard";
import { announcementText, isLive } from "../announcements";
import { appLabel } from "../app/label";
import { formatCents } from "../catalog/money";
import { orderNumber } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { Announcement, App, BookingAppointment, Build, CatalogOrder, Donation, Listing, OwnerDevice, OwnerNotice, OwnerPushKind } from "../data/types";
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

/** The devices of a client's owner that want `kind`, with a push token and still signed in. */
async function devicesFor(store: DataStore, clientId: string, kind: OwnerPushKind, now: Date): Promise<{ language: string | null | undefined; devices: OwnerDevice[] } | null> {
  const client = await store.getClientById(clientId);
  const user = client ? await store.getUserById(client.userId) : null;
  if (!client || !user) return null;
  const devices = (await store.listOwnerDevices(user.id)).filter(
    (d) => d.pushToken && d.pushPreferences?.[kind] !== false && d.refreshExpiresAt.getTime() > now.getTime() && d.sessionVersion === user.sessionVersion,
  );
  return { language: user.language, devices };
}

/** Sends one kind of push to a client's owner, worded per language; returns the phones it went to. */
export async function pushToOwner(
  deps: OwnerPushDeps,
  clientId: string,
  kind: OwnerPushKind,
  word: (words: Words) => { title: string; body: string },
  data: Record<string, string>,
): Promise<number> {
  try {
    const found = await devicesFor(deps.store, clientId, kind, deps.now);
    if (!found || found.devices.length === 0) return 0;
    const byLang = new Map<Lang, OwnerDevice[]>();
    for (const device of found.devices) {
      const lang = ownerLang(found.language, device.language);
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
