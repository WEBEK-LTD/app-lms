import { appAreas } from "../app/areas";
import { addDays, localToUtc } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App, PaidTotals } from "../data/types";
import type { AnalyticsRange } from "./report";

/**
 * 86.1 The business's real numbers over the Analytics range (the same days
 * in the app's time zone): paid orders and what they brought in (less what
 * was refunded of them since), refunds made, enrolments, appointments
 * booked, tickets issued and donations, each beside the period before;
 * and conversion as paid orders over the views of items in the app (the
 * app's analytics). Only what the app has: a shop has no enrolments.
 * Apps on Yallapp's hosted API count from their own records; WordPress
 * apps from the totals their site sends (86.4).
 */

export interface SalesFigures {
  orders: PaidTotals;
  refunds: PaidTotals;
  donations: PaidTotals;
  enrolments: { total: number; paid: number };
  bookings: number;
  tickets: number;
}

export interface SalesReport {
  /** Which of the figures this app has. */
  shows: { orders: boolean; refunds: boolean; enrolments: boolean; bookings: boolean; tickets: boolean; donations: boolean };
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
  const [orders, refunds, donations, enrolments, bookings, tickets] = await Promise.all([
    store.sumPaidCatalogOrders(appId, from, to),
    store.sumRefunds(appId, from, to),
    store.sumPaidDonations(appId, from, to),
    store.countEnrollmentsInWindow(appId, from, to),
    store.countAppointmentsMade(appId, from, to),
    store.countTicketsInWindow(appId, from, to),
  ]);
  return { orders, refunds, donations, enrolments, bookings, tickets: tickets.issued };
}

export function salesShows(app: Pick<App, "connector" | "backend" | "vertical" | "catalogSettings">): SalesReport["shows"] {
  const areas = appAreas(app);
  return {
    orders: areas.orders,
    refunds: areas.orders || areas.donations,
    enrolments: areas.courses,
    bookings: areas.appointments,
    tickets: areas.events,
    donations: areas.donations,
  };
}

/** `views`: the item views of the Analytics report over the same range (today's too, counted as they come). */
export async function loadSales(store: DataStore, app: App, range: AnalyticsRange, zone: string, views: number): Promise<SalesReport> {
  const [from, to] = window(range.from, range.to, zone);
  const [before, until] = window(range.previous.from, range.previous.to, zone);
  const [current, previous] = await Promise.all([figures(store, app.id, from, to), figures(store, app.id, before, until)]);
  return { shows: salesShows(app), current, previous, views, conversion: views > 0 ? current.orders.count / views : null };
}
