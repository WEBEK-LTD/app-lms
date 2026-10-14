import type { ClientRow } from "../data/store";
import type { App, Build, CatalogCurrency, CatalogOrder, PlanPayment } from "../data/types";
import { accountState, type AccountState } from "../license/status";
import { websiteOf } from "../switches";

/**
 * The admin overview's numbers (roadmap 11.1), counted from the data the
 * store returns. Pure functions, so they're tested on their own.
 */

const DAY_MS = 86_400_000;

export function clientsByState(rows: Pick<ClientRow, "client" | "license">[], now: Date): Record<AccountState, number> {
  const counts: Record<AccountState, number> = { pending: 0, active: 0, expired: 0, suspended: 0 };
  for (const row of rows) counts[accountState(row.client, row.license, now)] += 1;
  return counts;
}

/** Clients who signed up in the last `days` days. */
export function signUpsSince(rows: Pick<ClientRow, "client">[], now: Date, days: number): number {
  const from = now.getTime() - days * DAY_MS;
  return rows.filter((row) => row.client.createdAt.getTime() > from && row.client.createdAt.getTime() <= now.getTime()).length;
}

export interface RevenueAmounts {
  /** Plans paid by card, in cents. */
  plans: number;
  /** Yallapp's commission on shop sales through its account, in cents. */
  commission: number;
}

export interface RevenueMonth {
  /** YYYY-MM, UTC. */
  month: string;
  byCurrency: Partial<Record<CatalogCurrency, RevenueAmounts>>;
}

export interface Revenue {
  /** Currencies with any revenue in the last 12 months, in a fixed order. */
  currencies: CatalogCurrency[];
  thisMonth: Partial<Record<CatalogCurrency, RevenueAmounts>>;
  /** The 12 months up to and including this one, oldest first. */
  months: RevenueMonth[];
  last12Months: Partial<Record<CatalogCurrency, RevenueAmounts>>;
}

const monthKey = (date: Date) => date.toISOString().slice(0, 7);

/** The first moment of the month 11 months before `now`'s, UTC: the start of the 12-month window. */
export function revenueWindowStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
}

/**
 * Revenue per currency: paid plan payments (by when they were paid), and
 * Yallapp's commission on marketplace orders (refunded ones left out), for
 * this month and each of the last 12.
 */
export function revenue(
  payments: Pick<PlanPayment, "status" | "amountCents" | "currency" | "paidAt">[],
  orders: Pick<CatalogOrder, "status" | "commissionCents" | "currency" | "paidAt">[],
  now: Date,
): Revenue {
  const start = revenueWindowStart(now);
  const months: RevenueMonth[] = [];
  for (let i = 0; i < 12; i += 1) {
    months.push({ month: monthKey(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))), byCurrency: {} });
  }
  const byMonth = new Map(months.map((m) => [m.month, m]));
  const last12: Partial<Record<CatalogCurrency, RevenueAmounts>> = {};
  const add = (date: Date | null, currency: CatalogCurrency, field: keyof RevenueAmounts, cents: number) => {
    if (!date || date.getTime() < start.getTime() || date.getTime() > now.getTime()) return;
    const month = byMonth.get(monthKey(date));
    if (!month) return;
    const amounts = (month.byCurrency[currency] ??= { plans: 0, commission: 0 });
    amounts[field] += cents;
    const total = (last12[currency] ??= { plans: 0, commission: 0 });
    total[field] += cents;
  };
  for (const p of payments) if (p.status === "paid") add(p.paidAt, p.currency, "plans", p.amountCents);
  for (const o of orders) if (o.commissionCents !== null && o.status !== "refunded") add(o.paidAt, o.currency, "commission", o.commissionCents);
  const order: CatalogCurrency[] = ["TRY", "USD", "EUR"];
  return {
    currencies: order.filter((c) => last12[c]),
    thisMonth: months[months.length - 1]!.byCurrency,
    months,
    last12Months: last12,
  };
}

export interface BuildStats {
  total: number;
  queued: number;
  running: number;
  ready: number;
  failed: number;
  /** Ready out of finished (ready or failed), in percent; null when none finished. */
  successRate: number | null;
}

/** Builds queued in the last `days` days, by their status now. */
export function buildStats(builds: Pick<Build, "status" | "createdAt">[], now: Date, days = 7): BuildStats {
  const from = now.getTime() - days * DAY_MS;
  const recent = builds.filter((b) => b.createdAt.getTime() > from && b.createdAt.getTime() <= now.getTime());
  const count = (status: Build["status"]) => recent.filter((b) => b.status === status).length;
  const ready = count("ready");
  const failed = count("failed");
  return {
    total: recent.length,
    queued: count("queued"),
    running: count("building"),
    ready,
    failed,
    successRate: ready + failed > 0 ? Math.round((ready / (ready + failed)) * 1000) / 10 : null,
  };
}

/** Counts by a key, largest first. */
function tally<T>(items: T[], key: (item: T) => string): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts.entries()].map(([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function appsByType(apps: Pick<App, "appType">[]): { key: string; count: number }[] {
  return tally(apps, (a) => a.appType);
}

/** Apps by where their content comes from: a connector (ikas, shopify, catalog…) or a backend (wordpress, custom_api…). */
export function appsByWebsite(apps: Pick<App, "backend" | "connector">[]): { key: string; count: number }[] {
  return tally(apps, websiteOf);
}

/** Apps on the hosted API and their customers. */
export function hostedUsage(apps: Pick<App, "id" | "backend">[], usersByApp: Record<string, number>): { apps: number; users: number } {
  const hosted = apps.filter((a) => a.backend === "hosted");
  return { apps: hosted.length, users: hosted.reduce((sum, a) => sum + (usersByApp[a.id] ?? 0), 0) };
}
