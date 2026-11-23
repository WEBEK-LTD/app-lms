import { formatCents } from "../catalog/money";
import { appAreas } from "../app/areas";
import { appZone } from "../analytics/zone";
import { addDays, localToUtc, minutesOf, utcToLocal } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App, CatalogCurrency } from "../data/types";
import { PUSH_PERMISSION, teamCan } from "../team/permissions";
import { invalid, notAllowed, notAvailable, type OwnerContext, type OwnerResult } from "./http";
import { appScope } from "./sales";
import { changePct, mainCurrency, saleEvents } from "./prime";
import { OWNER_SUMMARY_AT } from "./push-sounds";
import { devicesFor, pushToOwner, type OwnerPushDeps, type Words } from "./push";

/**
 * 214 The end-of-day summary (`daily_summary`): each phone that chose it (on
 * by default at 23:00, Settings › Ringtones' Summary; only phones that saved
 * their sounds, so older apps get none) gets, at its time in the shop's time
 * zone, today's sales, orders, the average order, the best seller, and
 * today against the same weekday last week. Nothing is sent on a day without
 * orders. From the frequent job (every 5 minutes): each phone, app and day
 * claimed once, within three hours of its time. Tapped, the app opens the
 * summary (`GET apps/:app_id/day-summary`).
 */

/** Sent within this long after its time (a job that was off doesn't send late at night). */
const WINDOW_MINUTES = 180;

export interface DaySummary {
  date: string;
  currency: string | null;
  salesCents: number;
  orders: number;
  averageCents: number | null;
  best: string | null;
  /** The same weekday a week before. */
  compare: { date: string; salesCents: number; orders: number; changePct: number | null };
}

/** A day (YYYY-MM-DD in `zone`) of the app's sales, and the same weekday a week before. */
export async function daySummary(store: DataStore, app: App, zone: string, date: string): Promise<DaySummary> {
  const areas = appAreas(app);
  const range = (d: string) => [localToUtc(d, "00:00", zone), localToUtc(addDays(d, 1), "00:00", zone)] as const;
  const [from, to] = range(date);
  const before = addDays(date, -7);
  const [bFrom, bTo] = range(before);
  const [events, last] = await Promise.all([saleEvents(store, app, areas, from, to), saleEvents(store, app, areas, bFrom, bTo)]);
  const currency = mainCurrency(events) ?? mainCurrency(last);
  const sum = (list: typeof events) => list.reduce((n, e) => n + (e.currency === currency ? e.cents : 0), 0);
  const salesCents = sum(events);
  const mine = events.filter((e) => e.currency === currency);
  const best = new Map<string, number>();
  for (const e of mine) for (const name of e.names.filter(Boolean)) best.set(name, (best.get(name) ?? 0) + e.cents);
  const lastSales = sum(last);
  return {
    date,
    currency,
    salesCents,
    orders: events.length,
    averageCents: mine.length ? Math.round(salesCents / mine.length) : null,
    best: [...best].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null,
    compare: { date: before, salesCents: lastSales, orders: last.length, changePct: changePct(salesCents, lastSales) },
  };
}

function money(cents: number, currency: string | null, lang: string): string {
  return formatCents(cents, (currency ?? "TRY") as CatalogCurrency, lang);
}

function weekday(date: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG-u-nu-latn" : lang, { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

/** The push's words: "Today: ₺4,250.00", "12 orders · average ₺354.17 · best seller Kunafa · 20% more than last Monday". */
export function summaryWords(w: Words, s: DaySummary): { title: string; body: string } {
  const day = weekday(s.date, w.lang);
  const pct = s.compare.changePct;
  const compare = pct === null ? null : pct > 0 ? w.t("owner.push.summaryUp", { pct: String(pct), day }) : pct < 0 ? w.t("owner.push.summaryDown", { pct: String(-pct), day }) : w.t("owner.push.summarySame", { day });
  return {
    title: w.t("owner.push.summaryTitle", { sales: money(s.salesCents, s.currency, w.lang) }),
    body: [
      w.t("owner.push.summaryOrders", { count: s.orders }),
      s.averageCents !== null ? w.t("owner.push.summaryAverage", { amount: money(s.averageCents, s.currency, w.lang) }) : null,
      s.best ? w.t("owner.push.summaryBest", { name: s.best }) : null,
      compare,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

export function daySummaryJson(s: DaySummary, lang: string) {
  return {
    date: s.date,
    currency: s.currency,
    sales: { amount_cents: s.salesCents, formatted: money(s.salesCents, s.currency, lang) },
    orders: s.orders,
    average: s.averageCents === null ? null : { amount_cents: s.averageCents, formatted: money(s.averageCents, s.currency, lang) },
    best_seller: s.best,
    compare: {
      date: s.compare.date,
      weekday: weekday(s.compare.date, lang),
      sales: { amount_cents: s.compare.salesCents, formatted: money(s.compare.salesCents, s.currency, lang) },
      orders: s.compare.orders,
      change_pct: s.compare.changePct,
    },
  };
}

/** The apps whose sales a summary tells: those with orders of any kind. */
function sells(app: App): boolean {
  const a = appAreas(app);
  return a.orders || a.foodOrders || a.market || a.rides || a.shipments || a.donations || a.appointments;
}

export interface SummaryRunReport {
  apps: number;
  sent: number;
}

export async function runDailySummaries(deps: OwnerPushDeps): Promise<SummaryRunReport> {
  const { store, now } = deps;
  const report: SummaryRunReport = { apps: 0, sent: 0 };
  for (const app of await store.listApps()) {
    if (app.demo || app.deletedAt || !sells(app)) continue;
    try {
      const phones = (await devicesFor(store, app.clientId, "daily_summary", PUSH_PERMISSION.daily_summary, app.id, now)).filter((r) => r.device.pushSounds);
      if (!phones.length) continue;
      report.apps += 1;
      const zone = await appZone(store, app);
      const local = utcToLocal(now, zone);
      const minute = minutesOf(local.time) ?? 0;
      const due: string[] = [];
      for (const { device } of phones) {
        const summary = device.pushSounds?.summary ?? { on: true, at: OWNER_SUMMARY_AT };
        const at = minutesOf(summary.at);
        if (!summary.on || at === null || minute < at || minute >= at + WINDOW_MINUTES) continue;
        if (!(await store.claimPrimeSend(`summary:${device.id}:${app.id}:${local.date}`, now))) continue;
        due.push(device.id);
      }
      if (!due.length) continue;
      const s = await daySummary(store, app, zone, local.date);
      // Nothing on a day without orders.
      if (s.orders === 0) continue;
      report.sent += await pushToOwner(deps, app.clientId, "daily_summary", (w) => summaryWords(w, s), { app_id: app.id, alert: "daily_summary", date: s.date }, PUSH_PERMISSION.daily_summary, null, due);
    } catch (error) {
      // One app that can't be read never stops the others.
      console.error("[daily-summary]", app.id, error instanceof Error ? error.message : String(error));
    }
  }
  return report;
}

// The Owner API: the summary screen the push opens

/** `GET apps/:app_id/day-summary?date=YYYY-MM-DD` (today in the shop's time zone by default; at most 60 days back). */
export async function getDaySummary(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id);
  if (!sells(app)) throw notAvailable();
  if (!teamCan(ctx.access, "analytics", app.id)) throw notAllowed();
  const zone = await appZone(ctx.deps.store, app);
  const today = utcToLocal(ctx.deps.now, zone).date;
  const date = ctx.req.query.get("date") ?? today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today || date < addDays(today, -60)) throw invalid({ date: "Choose a day in the last 60 days." });
  return { status: 200, body: daySummaryJson(await daySummary(ctx.deps.store, app, zone, date), ctx.lang) };
}
