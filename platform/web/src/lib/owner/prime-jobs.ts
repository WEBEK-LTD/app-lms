import { formatCents } from "../catalog/money";
import { appAreas } from "../app/areas";
import { appZone } from "../analytics/zone";
import { addDays, localToUtc, minutesOf, utcToLocal } from "../bookings/time";
import type { DashT } from "@/i18n/dashboard";
import type { DataStore } from "../data/store";
import type { App, PrimeAlerts, PrimeAlertSetting } from "../data/types";
import { shipmentReference } from "../delivery/service";
import { foodOrderReference } from "../food/service";
import { queueTimers } from "../market/complaints";
import { formatMinor } from "../market/currency";
import { marketOrderReference } from "../market/json";
import { orderNumber } from "../catalog/settings";
import { rideReference } from "../rides/service";
import { CATALOG_CURRENCIES } from "../catalog/money";
import type { CatalogCurrency } from "../data/types";
import { mainCurrency, saleEvents } from "./prime";
import { pushMorningBrief, pushPrimeAlert, type OwnerPushDeps, type Words } from "./push";
import { isPrimeLicense } from "./sales";

/**
 * 125 Prime's scheduled checks, from the frequent job (every 5 minutes): each
 * person's smart alerts on each of their Prime apps, pushed (`prime_alert`)
 * once per item and day, and their morning brief (`morning_brief`) once a
 * day at their time in the app's time zone, with yesterday's sales, orders,
 * busiest hour and best seller. Idempotent: each push is claimed once in the
 * store (two runs at once push it once).
 */

export interface PrimeRunReport {
  people: number;
  alerts: number;
  briefs: number;
}

/** A brief is sent within this long after its time (a job that was off doesn't send yesterday's late). */
const BRIEF_WINDOW_MINUTES = 180;
/** Ratings looked at for `low_rating`: the last day. */
const RATING_HOURS = 24;
/** Claimed pushes are kept this long. */
const KEEP_DAYS = 3;

function amount(cents: number, currency: string): string {
  return (CATALOG_CURRENCIES as readonly string[]).includes(currency) ? formatCents(cents, currency as CatalogCurrency) : formatMinor(cents, currency);
}

const minutesSince = (from: Date, now: Date) => Math.floor((now.getTime() - from.getTime()) / 60_000);

interface Found {
  /** Unique within the app and kind, for the day's claim. */
  item: string;
  ids: Record<string, string>;
  word: (w: Words) => { title: string; body: string };
}

/** What an alert finds now on the app. */
async function findings(store: DataStore, app: App, alert: PrimeAlertSetting, zone: string, now: Date): Promise<Found[]> {
  const areas = appAreas(app);
  const minutes = alert.minutes ?? 5;
  const out: Found[] = [];
  const waited = (at: Date) => minutesSince(at, now) >= minutes;
  switch (alert.kind) {
    case "order_waiting": {
      if (areas.foodOrders) {
        for (const o of (await store.listFoodOrders({ appId: app.id, statuses: ["placed"], order: "oldest", offset: 0, limit: 50 })).items) {
          const since = new Date(o.timeline.findLast((s) => s.status === "placed")?.at ?? o.createdAt);
          if (waited(since)) out.push({ item: `f${o.id}`, ids: { food_order_id: String(o.id) }, word: (w) => ({ title: w.t("owner.prime.orderWaiting", { reference: foodOrderReference(o), minutes: String(minutesSince(since, now)) }), body: o.restaurantName }) });
        }
      }
      if (areas.market) {
        for (const o of (await store.listMarketOrders({ appId: app.id, statuses: ["placed"], order: "oldest", limit: 50, offset: 0 })).items) {
          const since = new Date(o.timeline.findLast((s) => s.status === "placed")?.at ?? o.createdAt);
          if (waited(since)) out.push({ item: `m${o.id}`, ids: { market_order_id: String(o.id) }, word: (w) => ({ title: w.t("owner.prime.orderWaiting", { reference: marketOrderReference(o), minutes: String(minutesSince(since, now)) }), body: o.vendorName }) });
        }
      }
      // A kitchen's paid orders not started yet.
      if (areas.kitchen) {
        for (const o of (await store.listCatalogOrders({ appId: app.id, statuses: ["processing"], offset: 0, limit: 50 })).items) {
          if (o.fulfilmentStatus !== "received" || !o.paidAt || !waited(o.paidAt)) continue;
          out.push({ item: `o${o.id}`, ids: { order_id: String(o.id) }, word: (w) => ({ title: w.t("owner.prime.orderWaiting", { reference: orderNumber(o), minutes: String(minutesSince(o.paidAt!, now)) }), body: o.customer?.name ?? "" }) });
        }
      }
      return out;
    }
    case "shipment_unassigned": {
      for (const s of (await store.listShipments({ appId: app.id, statuses: ["pending"], order: "oldest", offset: 0, limit: 50 })).items) {
        const since = new Date(s.timeline.at(-1)?.at ?? s.updatedAt);
        if (waited(since)) out.push({ item: `s${s.id}`, ids: { shipment_id: String(s.id) }, word: (w) => ({ title: w.t("owner.prime.shipmentUnassigned", { reference: shipmentReference(s), minutes: String(minutesSince(since, now)) }), body: s.pickup.address }) });
      }
      return out;
    }
    case "ride_no_driver": {
      for (const r of (await store.listRides({ appId: app.id, statuses: ["searching"], order: "oldest", offset: 0, limit: 50 })).items) {
        const since = r.searchingSince ?? r.updatedAt;
        if (waited(since)) out.push({ item: `r${r.id}`, ids: { ride_id: String(r.id) }, word: (w) => ({ title: w.t("owner.prime.rideNoDriver", { reference: rideReference(r), minutes: String(minutesSince(since, now)) }), body: r.pickup.address }) });
      }
      return out;
    }
    case "message_unanswered": {
      if (areas.market) {
        for (const c of (await store.listMarketComplaints({ appId: app.id, statuses: ["open", "in_review"], limit: 50, offset: 0 })).items) {
          const t = queueTimers(c, now);
          if (t.waitingOn === "support" && (t.waitingMinutes ?? 0) >= minutes) out.push({ item: `c${c.id}`, ids: { complaint_id: String(c.id) }, word: (w) => ({ title: w.t("owner.prime.complaintWaiting", { minutes: String(t.waitingMinutes) }), body: c.text.slice(0, 140) }) });
        }
      }
      if (areas.inquiries) {
        for (const i of (await store.listListingInquiries({ appId: app.id, status: "open", offset: 0, limit: 50 })).items) {
          if (i.unreadByOffice === 0 || !i.lastMessage || !waited(i.lastMessage.createdAt)) continue;
          out.push({ item: `i${i.id}`, ids: { inquiry_id: String(i.id) }, word: (w) => ({ title: w.t("owner.prime.messageWaiting", { minutes: String(minutesSince(i.lastMessage!.createdAt, now)) }), body: i.lastMessage!.text.slice(0, 140) }) });
        }
      }
      return out;
    }
    case "low_rating": {
      const stars = alert.stars ?? 2;
      const since = new Date(now.getTime() - RATING_HOURS * 3_600_000);
      const low = (rating: number, at: string) => rating <= stars && new Date(at).getTime() >= since.getTime();
      const said = (w: Words, rating: number, text: string | null) => ({ title: w.t("owner.prime.lowRating", { stars: String(rating) }), body: text?.slice(0, 140) ?? "" });
      if (areas.foodOrders) {
        for (const o of (await store.listFoodOrders({ appId: app.id, statuses: ["delivered"], updatedSince: since, order: "newest", offset: 0, limit: 200 })).items) {
          if (o.rating && low(o.rating.restaurant, o.rating.at)) out.push({ item: `f${o.id}`, ids: { food_order_id: String(o.id) }, word: (w) => said(w, o.rating!.restaurant, o.rating!.comment) });
        }
      }
      if (areas.market) {
        for (const o of (await store.listMarketOrders({ appId: app.id, statuses: ["delivered", "picked_up"], order: "newest", limit: 200, offset: 0 })).items) {
          if (o.rating && low(o.rating.vendor, o.rating.at)) out.push({ item: `m${o.id}`, ids: { market_order_id: String(o.id) }, word: (w) => said(w, o.rating!.vendor, o.rating!.comment) });
        }
      }
      if (areas.rides) {
        for (const r of (await store.listRides({ appId: app.id, statuses: ["completed"], updatedSince: since, order: "newest", offset: 0, limit: 200 })).items) {
          if (r.rating && low(r.rating.driver, r.rating.at)) out.push({ item: `r${r.id}`, ids: { ride_id: String(r.id) }, word: (w) => said(w, r.rating!.driver, r.rating!.comment) });
        }
      }
      if (areas.reviews) {
        for (const v of (await store.listCourseReviews({ appId: app.id, offset: 0, limit: 100 })).items) {
          if (v.rating <= stars && v.createdAt.getTime() >= since.getTime()) out.push({ item: `v${v.id}`, ids: { review_id: String(v.id) }, word: (w) => said(w, v.rating, v.text) });
        }
      }
      return out;
    }
    case "sales_low": {
      // Once the day's time came: the day's sales so far below the amount.
      const local = utcToLocal(now, zone);
      const due = minutesOf(alert.byTime ?? "18:00");
      if (due === null || (minutesOf(local.time) ?? 0) < due) return out;
      const start = localToUtc(local.date, "00:00", zone);
      const events = await saleEvents(store, app, areas, start, now);
      const currency = mainCurrency(events);
      const total = currency ? events.filter((e) => e.currency === currency).reduce((n, e) => n + e.cents, 0) : 0;
      if (total < (alert.amountCents ?? 0)) {
        out.push({ item: "day", ids: {}, word: (w) => ({ title: w.t("owner.prime.salesLow"), body: w.t("owner.prime.salesLowBody", { amount: amount(total, currency ?? "TRY"), time: alert.byTime ?? "18:00" }) }) });
      }
      return out;
    }
  }
}

/** Yesterday in a line: sales, orders, the busiest hour and the best seller. */
async function brief(store: DataStore, app: App, zone: string, date: string) {
  const start = localToUtc(addDays(date, -1), "00:00", zone);
  const end = localToUtc(date, "00:00", zone);
  const events = await saleEvents(store, app, appAreas(app), start, end);
  const currency = mainCurrency(events);
  const mine = currency ? events.filter((e) => e.currency === currency) : [];
  const hours = new Map<number, number>();
  const best = new Map<string, number>();
  for (const e of events) {
    const hour = Math.floor((minutesOf(utcToLocal(e.at, zone).time) ?? 0) / 60);
    hours.set(hour, (hours.get(hour) ?? 0) + 1);
  }
  for (const e of mine) for (const name of e.names.filter(Boolean)) best.set(name, (best.get(name) ?? 0) + e.cents);
  const busiest = [...hours].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? null;
  return {
    sales: amount(mine.reduce((n, e) => n + e.cents, 0), currency ?? "TRY"),
    orders: events.length,
    hour: busiest === null ? null : `${String(busiest).padStart(2, "0")}:00`,
    best: [...best].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null,
  };
}

export async function runPrimeChecks(deps: OwnerPushDeps): Promise<PrimeRunReport> {
  const { store, now } = deps;
  const report: PrimeRunReport = { people: 0, alerts: 0, briefs: 0 };
  await store.deletePrimeSendsBefore(new Date(now.getTime() - KEEP_DAYS * 86_400_000)).catch(() => 0);
  const zones = new Map<string, string>();
  for (const row of await store.listPrimeAlerts()) {
    try {
      const app = await store.getAppById(row.appId);
      if (!app || app.clientId !== row.clientId || app.demo || app.deletedAt) continue;
      const license = await store.getLicenseForApp(app.clientId, app.id);
      if (!isPrimeLicense(license, now) || (license && license.expiresAt.getTime() <= now.getTime())) continue;
      report.people += 1;
      const zone = zones.get(app.id) ?? (await appZone(store, app));
      zones.set(app.id, zone);
      const date = utcToLocal(now, zone).date;
      report.alerts += await alertsFor(deps, app, row, zone, date);
      report.briefs += await briefFor(deps, app, row, zone, date);
    } catch (error) {
      // One app that can't be checked never stops the others.
      console.error("[prime]", row.appId, error instanceof Error ? error.message : String(error));
    }
  }
  return report;
}

async function alertsFor(deps: OwnerPushDeps, app: App, row: PrimeAlerts, zone: string, date: string): Promise<number> {
  let sent = 0;
  for (const alert of row.alerts.filter((a) => a.on)) {
    for (const found of await findings(deps.store, app, alert, zone, deps.now)) {
      if (!(await deps.store.claimPrimeSend(`alert:${row.userId}:${app.id}:${alert.kind}:${found.item}:${date}`, deps.now))) continue;
      await pushPrimeAlert(deps, app, row.userId, alert.kind, found.word, found.ids);
      sent += 1;
    }
  }
  return sent;
}

async function briefFor(deps: OwnerPushDeps, app: App, row: PrimeAlerts, zone: string, date: string): Promise<number> {
  if (!row.briefOn) return 0;
  const at = minutesOf(row.briefTime);
  const nowMinute = minutesOf(utcToLocal(deps.now, zone).time) ?? 0;
  if (at === null || nowMinute < at || nowMinute >= at + BRIEF_WINDOW_MINUTES) return 0;
  if (!(await deps.store.claimPrimeSend(`brief:${row.userId}:${app.id}:${date}`, deps.now))) return 0;
  const b = await brief(deps.store, app, zone, date);
  await pushMorningBrief(deps, app, row.userId, (w) => ({ title: w.t("owner.prime.briefTitle"), body: briefLine(w.t, b) }));
  return 1;
}

type Brief = Awaited<ReturnType<typeof brief>>;

function briefLine(t: DashT, b: Brief): string {
  return [t("owner.prime.briefSales", { sales: b.sales, count: b.orders }), b.hour ? t("owner.prime.briefHour", { hour: b.hour }) : null, b.best ? t("owner.prime.briefBest", { name: b.best }) : null]
    .filter(Boolean)
    .join(" · ");
}

/** 125 Today's morning brief card on a Prime app: yesterday in the line the push sends, in the person's language. */
export async function morningBriefJson(store: DataStore, app: App, zone: string, date: string, t: DashT): Promise<{ title: string; text: string }> {
  return { title: t("owner.prime.briefTitle"), text: briefLine(t, await brief(store, app, zone, date)) };
}
