import type { DataStore } from "../data/store";
import type { App, PaidTotals } from "../data/types";
import { addDays } from "./days";
import type { AnalyticsDailyRecord, AnalyticsDailyRow } from "./types";

/**
 * 86.4 A WordPress site's shop totals (SiteInfo.sales, platform.yaml): sent
 * with each license check, a day at a time in the site's time zone, kept with
 * the app's daily totals (`site_orders`, `site_revenue` per currency,
 * `site_refunds`, `site_refunded` per currency) and shown where the hosted
 * apps show their own orders. Totals only.
 */

export interface SiteSalesDay {
  day: string;
  orders: number;
  revenue: { currency: string; cents: number }[];
  refunds: number;
  refunded: { currency: string; cents: number }[];
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY = /^[A-Z]{3}$/;
/** The days a check may report, as the contract says. */
export const SITE_SALES_DAYS = 14;

const count = (value: unknown, max: number): number | null => (typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= max ? value : null);

function amounts(value: unknown): SiteSalesDay["revenue"] | null {
  if (!Array.isArray(value) || value.length > 10) return null;
  const out: SiteSalesDay["revenue"] = [];
  for (const item of value) {
    const entry = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const cents = count(entry.cents, 100_000_000_000);
    if (typeof entry.currency !== "string" || !CURRENCY.test(entry.currency) || cents === null) return null;
    out.push({ currency: entry.currency, cents });
  }
  return out;
}

/** The well-formed days, at most 14 and each once; null when the plugin sent none. A malformed list never fails the check. */
export function parseSiteSales(value: unknown): SiteSalesDay[] | null {
  if (!Array.isArray(value)) return null;
  const days = new Map<string, SiteSalesDay>();
  for (const item of value.slice(0, SITE_SALES_DAYS)) {
    const entry = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const orders = count(entry.orders, 1_000_000);
    const refunds = count(entry.refunds, 1_000_000);
    const revenue = amounts(entry.revenue);
    const refunded = amounts(entry.refunded);
    if (typeof entry.day !== "string" || !DAY.test(entry.day) || Number.isNaN(Date.parse(entry.day)) || orders === null || refunds === null || !revenue || !refunded) continue;
    days.set(entry.day, { day: entry.day, orders, revenue, refunds, refunded });
  }
  return [...days.values()];
}

/** Keeps the reported days (each replaces what that day had), only recent ones. */
export async function saveSiteSales(store: Pick<DataStore, "saveAnalyticsDaily">, app: Pick<App, "id">, days: SiteSalesDay[], now: Date): Promise<number> {
  const today = now.toISOString().slice(0, 10);
  const oldest = addDays(today, -SITE_SALES_DAYS);
  let saved = 0;
  for (const d of days) {
    // A day ahead of the platform's by the site's time zone is fine; further isn't.
    if (d.day < oldest || d.day > addDays(today, 1)) continue;
    const rows: AnalyticsDailyRow[] = [
      { metric: "site_orders", key: "", label: null, value: d.orders },
      { metric: "site_refunds", key: "", label: null, value: d.refunds },
      ...d.revenue.map((r) => ({ metric: "site_revenue" as const, key: r.currency, label: null, value: r.cents })),
      ...d.refunded.map((r) => ({ metric: "site_refunded" as const, key: r.currency, label: null, value: r.cents })),
    ];
    await store.saveAnalyticsDaily(app.id, d.day, rows);
    saved += 1;
  }
  return saved;
}

/** The site's paid orders and refunds over [from, to] (days), from the totals it sent. */
export function siteTotals(rows: AnalyticsDailyRecord[], from: string, to: string): { orders: PaidTotals; refunds: PaidTotals; reported: boolean } {
  const inRange = rows.filter((r) => r.day >= from && r.day <= to);
  const sum = (metric: string) => inRange.filter((r) => r.metric === metric).reduce((all, r) => all + r.value, 0);
  const perCurrency = (metric: string) => {
    const map = new Map<string, number>();
    for (const r of inRange) if (r.metric === metric) map.set(r.key, (map.get(r.key) ?? 0) + r.value);
    return [...map.entries()].filter(([, cents]) => cents > 0).sort((a, b) => a[0].localeCompare(b[0])).map(([currency, cents]) => ({ currency, cents }));
  };
  return {
    orders: { count: sum("site_orders"), totals: perCurrency("site_revenue") },
    refunds: { count: sum("site_refunds"), totals: perCurrency("site_refunded") },
    reported: inRange.some((r) => r.metric === "site_orders"),
  };
}
