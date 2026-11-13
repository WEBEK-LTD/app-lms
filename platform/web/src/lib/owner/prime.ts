import type { Lang } from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { addDays, dayOf } from "../analytics/days";
import { appZone } from "../analytics/zone";
import type { AppAreas } from "../app/areas";
import { localToUtc, minutesOf, utcToLocal } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App, PrimeAlertKind, PrimeAlerts, PrimeAlertSetting } from "../data/types";
import { PRIME_ALERT_KINDS } from "../data/types";
import { FOOD_ACTIVE } from "../food/service";
import { bodyObject, invalid, type OwnerContext, type OwnerResult } from "./http";
import { appScope, money, ownerAreas } from "./sales";

/**
 * 125 Prime: every Yallapp Studio app. Insights computed from what the app
 * sells (catalog orders, appointments, donations, food orders, rides,
 * marketplace orders, a delivery company's shipments), in the app's time
 * zone, against the period before; nothing invented (no data, null or
 * empty). Smart alerts each person chooses per app (the frequent job checks
 * them: lib/owner/prime-jobs.ts), and the morning brief.
 */

/** One sale, whatever sold it. */
export interface SaleEvent {
  at: Date;
  cents: number;
  currency: string;
  /** What sold: products, dishes' restaurant, the place, the service, the campaign, the vehicle type. */
  names: string[];
  /** Who bought, when known (an app user, a phone): returning customers. */
  customer: string | null;
}

/** At most this many rows of each kind are read for a period. */
const READ_MAX = 2000;

const inRange = (at: Date | null | undefined, from: Date, to: Date) => Boolean(at) && at!.getTime() >= from.getTime() && at!.getTime() < to.getTime();
const who = (userId: number | null, phone?: string | null) => (userId !== null ? `u${userId}` : phone ? `p${phone}` : null);

/** Every sale of the app in [from, to), by what it has. */
export async function saleEvents(store: DataStore, app: App, areas: Pick<AppAreas, "orders" | "appointments" | "donations" | "foodOrders" | "rides" | "market" | "shipments">, from: Date, to: Date): Promise<SaleEvent[]> {
  const out: SaleEvent[] = [];
  const kind = app.connector?.kind ?? "";
  if (areas.orders) {
    const { items } = await store.listCatalogOrders({ appId: app.id, statuses: ["processing", "completed", "refunded"], offset: 0, limit: READ_MAX });
    for (const o of items) {
      if (!inRange(o.paidAt, from, to)) continue;
      const cents = o.totalCents - (o.refundedCents ?? 0);
      if (cents <= 0 && o.status === "refunded") continue;
      out.push({ at: o.paidAt!, cents, currency: o.currency, names: o.lines.map((l) => l.name), customer: who(o.userId, o.customer?.phone ?? o.customer?.email ?? null) });
    }
  }
  if (areas.appointments) {
    const { items } = await store.listBookingAppointments({ appId: app.id, statuses: ["approved", "completed"], startFrom: from, startBefore: to, offset: 0, limit: READ_MAX });
    for (const a of items) out.push({ at: a.startAt, cents: a.priceCents, currency: a.currency, names: [a.serviceName], customer: who(a.userId, a.customerPhone) });
  }
  if (areas.donations) {
    const { items } = await store.listDonations({ appId: app.id, statuses: ["paid", "refunded"], offset: 0, limit: READ_MAX });
    for (const d of items) if (inRange(d.paidAt, from, to)) out.push({ at: d.paidAt!, cents: d.amountCents - (d.refundedCents ?? 0), currency: d.currency, names: [d.campaignTitle], customer: who(d.userId) });
  }
  if (areas.foodOrders) {
    const statuses = [...FOOD_ACTIVE.filter((s) => s !== "awaiting_payment"), "delivered" as const];
    const { items } = await store.listFoodOrders({ appId: app.id, statuses, since: from, until: to, order: "newest", offset: 0, limit: READ_MAX });
    for (const o of items) out.push({ at: o.createdAt, cents: o.totalCents, currency: o.currency, names: [o.restaurantName], customer: who(o.userId, o.customerPhone) });
  }
  if (areas.rides) {
    const { items } = await store.listRides({ appId: app.id, statuses: ["completed"], updatedSince: from, order: "newest", offset: 0, limit: READ_MAX });
    for (const r of items) {
      const done = r.timeline.findLast((s) => s.status === "completed");
      const at = done ? new Date(done.at) : r.updatedAt;
      if (inRange(at, from, to) && r.finalCents !== null) out.push({ at, cents: r.finalCents, currency: r.currency, names: [r.vehicleTypeName], customer: who(r.userId, r.riderPhone) });
    }
  }
  if (areas.market) {
    const { items } = await store.listMarketOrders({ appId: app.id, createdSince: from, order: "newest", limit: READ_MAX, offset: 0 });
    for (const o of items) {
      if (!inRange(o.createdAt, from, to) || ["awaiting_payment", "rejected", "cancelled"].includes(o.status)) continue;
      out.push({ at: o.createdAt, cents: o.money.total, currency: o.currency, names: [o.vendorName], customer: who(o.userId, o.customerPhone) });
    }
  }
  // A delivery company's shipments (a food company's courier jobs are its food orders' already).
  if (areas.shipments && kind === "deliveries") {
    const { items } = await store.listShipments({ appId: app.id, since: from, order: "newest", offset: 0, limit: READ_MAX });
    for (const s of items) {
      if (!inRange(s.createdAt, from, to) || s.status === "awaiting_payment" || s.status === "cancelled") continue;
      out.push({ at: s.createdAt, cents: s.priceCents, currency: s.currency, names: [s.serviceName ?? s.packageSize], customer: who(s.userId, s.senderPhone) });
    }
  }
  return out;
}

/** The currency most sales are in (ties: alphabetical), or null with none. */
export function mainCurrency(events: readonly SaleEvent[]): string | null {
  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.currency, (counts.get(e.currency) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

const sumIn = (events: readonly SaleEvent[], currency: string | null) => events.reduce((n, e) => n + (e.currency === currency ? e.cents : 0), 0);

/** The change from `before` to `now` in percent (one decimal); null when there was nothing before. */
export function changePct(now: number, before: number): number | null {
  if (before === 0) return null;
  return Math.round(((now - before) / before) * 1000) / 10;
}

/** The weekday's name in the person's language ("Friday"). */
function weekdayName(lang: Lang, date: string, style: "long" | "short" = "long"): string {
  return formatDate(lang, new Date(`${date}T12:00:00Z`), { weekday: style, timeZone: "UTC" });
}

// Today's comparison

/** 125 `Today.compare` for a Prime app: today so far against the same weekday last week up to the same time. */
export async function todayCompare(ctx: OwnerContext, app: App, areas: AppAreas, day: { date: string; start: Date }) {
  const { store, now } = ctx.deps;
  const week = 7 * 86_400_000;
  const [today, before] = await Promise.all([saleEvents(store, app, areas, day.start, now), saleEvents(store, app, areas, new Date(day.start.getTime() - week), new Date(now.getTime() - week))]);
  const currency = mainCurrency([...today, ...before]);
  return {
    sales_change_pct: changePct(sumIn(today, currency), sumIn(before, currency)),
    orders_change_pct: changePct(today.length, before.length),
    label: ctx.t("owner.prime.vsLast", { day: weekdayName(ctx.lang, addDays(day.date, -7)) }),
  };
}

// Insights

/** The two-hour cells of the peak hours, from 10:00 to 22:00. */
const PEAK_HOURS = [10, 12, 14, 16, 18, 20];

function returningPct(events: readonly SaleEvent[], from: Date, to: Date, earlier: readonly SaleEvent[]): number | null {
  const window = events.filter((e) => inRange(e.at, from, to) && e.customer);
  if (window.length === 0) return null;
  const seen = new Set(earlier.filter((e) => e.at.getTime() < from.getTime() && e.customer).map((e) => e.customer!));
  return Math.round((window.filter((e) => seen.has(e.customer!)).length / window.length) * 1000) / 10;
}

export async function getPrimeInsights(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "prime");
  // What the app sells, whatever else the person may open: insights are the Analytics area's.
  const areas = ownerAreas(ctx, app);
  const period = ctx.req.query.get("period") || "week";
  if (period !== "week" && period !== "month") throw invalid({ period: "The request isn't valid." });
  const { store, now } = ctx.deps;
  const zone = await appZone(store, app);
  const span = period === "week" ? 7 : 30;
  const today = dayOf(now, zone);
  const firstDay = addDays(today, -(span - 1));
  const start = localToUtc(firstDay, "00:00", zone);
  const end = localToUtc(addDays(today, 1), "00:00", zone);
  const beforeStart = localToUtc(addDays(firstDay, -span), "00:00", zone);
  // Returning customers look a further 60 days back.
  const lookback = localToUtc(addDays(firstDay, -span - 60), "00:00", zone);
  const all = await saleEvents(store, app, areas, lookback, end);
  const nowEvents = all.filter((e) => inRange(e.at, start, end));
  const beforeEvents = all.filter((e) => inRange(e.at, beforeStart, start));
  const currency = mainCurrency([...nowEvents, ...beforeEvents]) ?? "TRY";
  const salesNow = sumIn(nowEvents, currency);
  const salesBefore = sumIn(beforeEvents, currency);
  const ofCurrency = (events: SaleEvent[]) => events.filter((e) => e.currency === currency);

  // Each day of the period, and the same day of the period before.
  const byDay = (events: SaleEvent[]) => {
    const m = new Map<string, number>();
    for (const e of ofCurrency(events)) {
      const d = utcToLocal(e.at, zone).date;
      m.set(d, (m.get(d) ?? 0) + e.cents);
    }
    return m;
  };
  const nowDays = byDay(nowEvents);
  const beforeDays = byDay(beforeEvents);
  const days = Array.from({ length: span }, (_, i) => {
    const date = addDays(firstDay, i);
    const label = period === "week" ? weekdayName(ctx.lang, date, "short") : formatDate(ctx.lang, new Date(`${date}T12:00:00Z`), { day: "numeric", month: "short", timeZone: "UTC" });
    return { label, now_cents: nowDays.get(date) ?? 0, before_cents: beforeDays.get(addDays(date, -span)) ?? 0 };
  });

  // Busy times: each weekday (Monday first) by two-hour cell, against the busiest cell.
  const grid = Array.from({ length: 7 }, () => PEAK_HOURS.map(() => 0));
  for (const e of nowEvents) {
    const local = utcToLocal(e.at, zone);
    const hour = Math.floor((minutesOf(local.time) ?? 0) / 60);
    const cell = PEAK_HOURS.findIndex((h) => hour >= h && hour < h + 2);
    if (cell >= 0) grid[(local.weekday + 6) % 7]![cell]! += 1;
  }
  const top = Math.max(0, ...grid.flat());
  let busiest: string | null = null;
  if (top > 0) {
    const row = grid.findIndex((r) => r.includes(top));
    const cell = grid[row]!.indexOf(top);
    // 2026-11-16 is a Monday: the row's weekday from it.
    const name = weekdayName(ctx.lang, addDays("2026-11-16", row));
    const h = PEAK_HOURS[cell]!;
    busiest = ctx.t("owner.prime.busiest", { day: name, from: `${String(h).padStart(2, "0")}:00`, to: `${String(h + 2).padStart(2, "0")}:00` });
  }

  const best = new Map<string, number>();
  for (const e of ofCurrency(nowEvents)) {
    const names = e.names.filter(Boolean);
    // An order of several things counts each at its share.
    for (const name of names) best.set(name, (best.get(name) ?? 0) + Math.round(e.cents / names.length));
  }
  const returningNow = returningPct(all, start, end, all);
  const returningBefore = returningPct(all, beforeStart, start, all);
  const avg = (sum: number, n: number) => (n > 0 ? money(Math.round(sum / n), currency) : null);
  const countNow = ofCurrency(nowEvents).length;
  const countBefore = ofCurrency(beforeEvents).length;

  return {
    status: 200,
    body: {
      period,
      range_label: `${formatDate(ctx.lang, new Date(`${firstDay}T12:00:00Z`), { day: "numeric", month: "short", timeZone: "UTC" })} – ${formatDate(ctx.lang, new Date(`${today}T12:00:00Z`), { day: "numeric", month: "short", timeZone: "UTC" })}`,
      sales: { now: money(salesNow, currency), before: money(salesBefore, currency), change_pct: changePct(salesNow, salesBefore) },
      orders: { now: nowEvents.length, before: beforeEvents.length, change_pct: changePct(nowEvents.length, beforeEvents.length) },
      days,
      peak: {
        hours: PEAK_HOURS,
        rows: grid.map((cells, i) => ({ day_label: weekdayName(ctx.lang, addDays("2026-11-16", i), "short"), cells: cells.map((n) => (top > 0 ? Math.round((n / top) * 100) / 100 : 0)) })),
        busiest_label: busiest,
      },
      returning: { pct: returningNow, change_pts: returningNow !== null && returningBefore !== null ? Math.round((returningNow - returningBefore) * 10) / 10 : null },
      average_order: { now: avg(salesNow, countNow), before: avg(salesBefore, countBefore) },
      best: [...best]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([name, cents]) => ({ name, total: money(cents, currency) })),
    },
  };
}

// Smart alerts

export const DEFAULT_ALERTS: Record<PrimeAlertKind, Omit<PrimeAlertSetting, "kind" | "on">> = {
  order_waiting: { minutes: 5, amountCents: null, byTime: null, stars: null },
  shipment_unassigned: { minutes: 10, amountCents: null, byTime: null, stars: null },
  sales_low: { minutes: null, amountCents: 0, byTime: "18:00", stars: null },
  message_unanswered: { minutes: 10, amountCents: null, byTime: null, stars: null },
  low_rating: { minutes: null, amountCents: null, byTime: null, stars: 2 },
  ride_no_driver: { minutes: 3, amountCents: null, byTime: null, stars: null },
};
export const DEFAULT_BRIEF_TIME = "08:30";

/** The alerts this app can have, by what it has. */
export function alertKindsOf(areas: AppAreas): PrimeAlertKind[] {
  const sells = areas.orders || areas.appointments || areas.donations || areas.foodOrders || areas.rides || areas.market || areas.shipments;
  return PRIME_ALERT_KINDS.filter((kind) => {
    switch (kind) {
      case "order_waiting":
        return areas.foodOrders || areas.market || areas.orders;
      case "shipment_unassigned":
        return areas.shipments;
      case "sales_low":
        return sells;
      case "message_unanswered":
        return areas.inquiries || areas.market;
      case "low_rating":
        return areas.foodOrders || areas.rides || areas.market || areas.reviews;
      case "ride_no_driver":
        return areas.rides;
    }
  });
}

/** A person's alerts on the app, the defaults (off) for those not saved, only the kinds the app has. */
export function alertsOf(saved: PrimeAlerts | null, kinds: readonly PrimeAlertKind[]): { alerts: PrimeAlertSetting[]; briefOn: boolean; briefTime: string } {
  return {
    alerts: kinds.map((kind) => saved?.alerts.find((a) => a.kind === kind) ?? { kind, on: false, ...DEFAULT_ALERTS[kind] }),
    briefOn: saved?.briefOn ?? false,
    briefTime: saved?.briefTime ?? DEFAULT_BRIEF_TIME,
  };
}

function alertsJson(a: { alerts: PrimeAlertSetting[]; briefOn: boolean; briefTime: string }) {
  return {
    items: a.alerts.map((x) => ({ kind: x.kind, on: x.on, minutes: x.minutes, amount_cents: x.amountCents, by_time: x.byTime, stars: x.stars })),
    morning_brief: { on: a.briefOn, time: a.briefTime },
  };
}

export async function getPrimeAlerts(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, areas } = appScope(ctx, params.app_id, "prime");
  const saved = await ctx.deps.store.getPrimeAlerts(ctx.user.id, app.id);
  return { status: 200, body: alertsJson(alertsOf(saved, alertKindsOf(areas))) };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function setPrimeAlerts(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, areas } = appScope(ctx, params.app_id, "prime");
  const body = bodyObject(ctx.req.body);
  const kinds = alertKindsOf(areas);
  const { store, now } = ctx.deps;
  const current = alertsOf(await store.getPrimeAlerts(ctx.user.id, app.id), kinds);
  const errors: Record<string, string> = {};
  if (body.items !== undefined && !Array.isArray(body.items)) throw invalid({ items: "The request isn't valid." });
  for (const [i, raw] of ((body.items as unknown[] | undefined) ?? []).entries()) {
    const item = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
    const kind = item?.kind;
    const at = current.alerts.findIndex((a) => a.kind === kind);
    if (!item || at < 0) {
      errors[`items[${i}]`] = "Your app doesn't have this.";
      continue;
    }
    const next = { ...current.alerts[at]! };
    if (item.on !== undefined) {
      if (typeof item.on !== "boolean") errors[`items[${i}].on`] = "The request isn't valid.";
      else next.on = item.on;
    }
    const n = (name: string, min: number, max: number, field: "minutes" | "amountCents" | "stars", needed: boolean) => {
      const value = item[name];
      if (value === undefined) return;
      if (value === null && !needed) return;
      if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) errors[`items[${i}].${name}`] = "The request isn't valid.";
      else next[field] = value;
    };
    if (next.kind === "sales_low") {
      n("amount_cents", 0, 1_000_000_000_000, "amountCents", true);
      if (item.by_time !== undefined) {
        if (typeof item.by_time !== "string" || !TIME.test(item.by_time)) errors[`items[${i}].by_time`] = "The request isn't valid.";
        else next.byTime = item.by_time;
      }
    } else if (next.kind === "low_rating") {
      n("stars", 1, 4, "stars", true);
    } else {
      n("minutes", 1, 240, "minutes", true);
    }
    current.alerts[at] = next;
  }
  if (body.morning_brief !== undefined) {
    const brief = body.morning_brief && typeof body.morning_brief === "object" && !Array.isArray(body.morning_brief) ? (body.morning_brief as Record<string, unknown>) : null;
    if (!brief) errors.morning_brief = "The request isn't valid.";
    else {
      if (brief.on !== undefined) {
        if (typeof brief.on !== "boolean") errors["morning_brief.on"] = "The request isn't valid.";
        else current.briefOn = brief.on;
      }
      if (brief.time !== undefined) {
        if (typeof brief.time !== "string" || !TIME.test(brief.time)) errors["morning_brief.time"] = "The request isn't valid.";
        else current.briefTime = brief.time;
      }
    }
  }
  if (Object.keys(errors).length) throw invalid(errors);
  await store.savePrimeAlerts({ userId: ctx.user.id, appId: app.id, clientId: app.clientId, alerts: current.alerts, briefOn: current.briefOn, briefTime: current.briefTime, updatedAt: now });
  return { status: 200, body: alertsJson(current) };
}
