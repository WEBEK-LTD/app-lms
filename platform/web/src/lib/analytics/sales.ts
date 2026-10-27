import { appAreas } from "../app/areas";
import { addDays, localToUtc } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App, PaidTotals } from "../data/types";
import type { AnalyticsRange } from "./report";
import { storeBillingSource } from "../store-billing/access";
import { siteTotals } from "./site-sales";

/**
 * 86.1 The business's real numbers over the Analytics range (the same days
 * in the app's time zone): paid orders and what they brought in (less what
 * was refunded of them since), refunds made, enrolments, appointments
 * booked, tickets issued and donations, each beside the period before;
 * and conversion as paid orders over the views of items in the app (the
 * app's analytics). Only what the app has: a shop has no enrolments.
 * Apps on Yallapp's hosted API count from their own records; WordPress
 * apps from the totals their site sends (86.4: orders and refunds, once the
 * site has sent some).
 */

export interface SalesFigures {
  orders: PaidTotals;
  refunds: PaidTotals;
  donations: PaidTotals;
  enrolments: { total: number; paid: number };
  bookings: number;
  tickets: number;
  /** 100.6 Bought and renewed through the stores (store tests left out), before the stores' fee. */
  inApp: PaidTotals;
  /** 100.6 Refunded or taken back by the stores. */
  inAppRefunds: PaidTotals;
  /** 100.6 Memberships renewed through the stores. */
  renewals: number;
}

export interface SalesReport {
  /** Which of the figures this app has. */
  shows: { orders: boolean; refunds: boolean; enrolments: boolean; bookings: boolean; tickets: boolean; donations: boolean; inApp: boolean };
  current: SalesFigures;
  previous: SalesFigures;
  /** Views of items in the app over the range (the report's `item_view` events). */
  views: number;
  /** Paid orders over those views; null without views. */
  conversion: number | null;
}

/** [from, to) instants of the range's local days. */
function window(from: string, to: string, zone: string): [Date, Date] {
  return [localToUtc(from, "00:00", zone), localToUtc(addDays(to, 1), "00:00", zone)];
}

async function figures(store: DataStore, appId: string, from: Date, to: Date): Promise<SalesFigures> {
  const [orders, refunds, donations, enrolments, bookings, tickets, inApp] = await Promise.all([
    store.sumPaidCatalogOrders(appId, from, to),
    store.sumRefunds(appId, from, to),
    store.sumPaidDonations(appId, from, to),
    store.countEnrollmentsInWindow(appId, from, to),
    store.countAppointmentsMade(appId, from, to),
    store.countTicketsInWindow(appId, from, to),
    inAppFigures(store, appId, from, to),
  ]);
  return { orders, refunds, donations, enrolments, bookings, tickets: tickets.issued, ...inApp };
}

/** 100.6 The store purchases' changes in [from, to): bought and renewed, refunded or revoked (each with the store price then), renewals. */
export async function inAppFigures(store: Pick<DataStore, "listStorePurchaseEvents">, appId: string, from: Date, to: Date): Promise<Pick<SalesFigures, "inApp" | "inAppRefunds" | "renewals">> {
  const events = await store.listStorePurchaseEvents(appId, from, to);
  const totals = (kinds: string[]): PaidTotals => {
    const picked = events.filter((e) => kinds.includes(e.kind));
    const sums = new Map<string, number>();
    for (const e of picked) if (e.currency && e.amountCents !== null) sums.set(e.currency, (sums.get(e.currency) ?? 0) + e.amountCents);
    return { count: picked.length, totals: [...sums].map(([currency, cents]) => ({ currency, cents })) };
  };
  const sold = totals(["bought", "renewed"]);
  const refunded = totals(["refunded", "revoked"]);
  return { inApp: sold, inAppRefunds: refunded, renewals: events.filter((e) => e.kind === "renewed").length };
}

export function salesShows(app: Pick<App, "connector" | "backend" | "vertical" | "catalogSettings" | "appType" | "storeBilling" | "apiBaseUrl" | "hostedSettings">): SalesReport["shows"] {
  const areas = appAreas(app);
  return {
    orders: areas.orders,
    refunds: areas.orders || areas.donations,
    enrolments: areas.courses,
    bookings: areas.appointments,
    tickets: areas.events,
    donations: areas.donations,
    // 100.6 Academies selling in the app through the stores.
    inApp: inAppShows(app),
  };
}

/** 100.6 The app sells (or sold) courses and memberships through the stores. */
function inAppShows(app: Pick<App, "connector" | "backend" | "appType" | "storeBilling" | "apiBaseUrl" | "hostedSettings">): boolean {
  return storeBillingSource(app) !== null && app.storeBilling != null;
}

const NONE: PaidTotals = { count: 0, totals: [] };
const empty = (orders: PaidTotals, refunds: PaidTotals): SalesFigures => ({ orders, refunds, donations: NONE, enrolments: { total: 0, paid: 0 }, bookings: 0, tickets: 0, inApp: NONE, inAppRefunds: NONE, renewals: 0 });

/** 86.4 A WordPress app: its shop's orders and refunds from the totals the site sends (by the site's days). */
async function siteSales(store: DataStore, app: App, range: AnalyticsRange, zone: string, views: number): Promise<SalesReport> {
  const rows = await store.listAnalyticsDaily(app.id, range.previous.from, range.to, ["site_orders", "site_revenue", "site_refunds", "site_refunded"]);
  const now = siteTotals(rows, range.from, range.to);
  const before = siteTotals(rows, range.previous.from, range.previous.to);
  const reported = now.reported || before.reported;
  // 100.6 What the app sold through the stores, from Yallapp's own records.
  const [[from, to], [since, until]] = [window(range.from, range.to, zone), window(range.previous.from, range.previous.to, zone)];
  const [inNow, inBefore] = await Promise.all([inAppFigures(store, app.id, from, to), inAppFigures(store, app.id, since, until)]);
  return {
    shows: { orders: reported, refunds: reported, enrolments: false, bookings: false, tickets: false, donations: false, inApp: inAppShows(app) },
    current: { ...empty(now.orders, now.refunds), ...inNow },
    previous: { ...empty(before.orders, before.refunds), ...inBefore },
    views,
    conversion: reported && views > 0 ? now.orders.count / views : null,
  };
}

/** `views`: the item views of the Analytics report over the same range (today's too, counted as they come). */
export async function loadSales(store: DataStore, app: App, range: AnalyticsRange, zone: string, views: number): Promise<SalesReport> {
  if (app.backend === "wordpress") return siteSales(store, app, range, zone, views);
  const [from, to] = window(range.from, range.to, zone);
  const [before, until] = window(range.previous.from, range.previous.to, zone);
  const [current, previous] = await Promise.all([figures(store, app.id, from, to), figures(store, app.id, before, until)]);
  return { shows: salesShows(app), current, previous, views, conversion: views > 0 ? current.orders.count / views : null };
}
