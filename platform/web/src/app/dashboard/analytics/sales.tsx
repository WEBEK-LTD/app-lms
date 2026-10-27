import { Delta, percent } from "@/components/analytics-report";
import { compactIn } from "@/lib/analytics/format";
import type { SalesFigures, SalesReport } from "@/lib/analytics/sales";
import { formatCents } from "@/lib/catalog/money";
import type { DashboardText } from "@/lib/dashboard-lang";
import type { PaidTotals } from "@/lib/data/types";

/** 86.1 The sales tiles: one per figure the app has, each beside the period before. */

type Money = Parameters<typeof formatCents>[1];

/** Each currency's sum; none at all is "0". */
function money(totals: PaidTotals, zero: string): string {
  return totals.totals.length === 0 ? zero : totals.totals.map((t) => formatCents(t.cents, t.currency as Money)).join(" · ");
}

/** The sum to compare: only in one currency, the same in both periods. */
function comparable(now: PaidTotals, before: PaidTotals): { now: number; before: number } | null {
  const currencies = new Set([...now.totals, ...before.totals].map((t) => t.currency));
  if (currencies.size > 1) return null;
  const sum = (totals: PaidTotals) => totals.totals.reduce((all, t) => all + t.cents, 0);
  return { now: sum(now), before: sum(before) };
}

interface Tile {
  key: string;
  label: string;
  value: string;
  hint: string;
  compare: { now: number; before: number } | null;
}

export function SalesTiles({ sales, days, text }: { sales: SalesReport; days: number; text: DashboardText }) {
  const { t, lang, num } = text;
  const { shows, current: now, previous: before } = sales;
  const count = (value: number) => (value >= 10_000 ? compactIn(lang, value) : num(value));
  const pair = (pick: (f: SalesFigures) => number) => ({ now: pick(now), before: pick(before) });
  const tiles: Tile[] = [];
  if (shows.orders) {
    tiles.push({ key: "orders", label: t("analytics.salesOrders"), value: count(now.orders.count), hint: t("analytics.salesOrdersHint"), compare: pair((f) => f.orders.count) });
    tiles.push({ key: "revenue", label: t("analytics.salesRevenue"), value: money(now.orders, num(0)), hint: t("analytics.salesRevenueHint"), compare: comparable(now.orders, before.orders) });
  }
  if (shows.refunds) {
    tiles.push({ key: "refunds", label: t("analytics.salesRefunds"), value: money(now.refunds, num(0)), hint: t("analytics.salesRefundsHint", { count: now.refunds.count }), compare: pair((f) => f.refunds.count) });
  }
  if (shows.enrolments) {
    tiles.push({ key: "enrolments", label: t("analytics.salesEnrolments"), value: count(now.enrolments.total), hint: t("analytics.salesEnrolmentsHint", { count: now.enrolments.paid }), compare: pair((f) => f.enrolments.total) });
  }
  if (shows.bookings) {
    tiles.push({ key: "bookings", label: t("analytics.salesBookings"), value: count(now.bookings), hint: t("analytics.salesBookingsHint"), compare: pair((f) => f.bookings) });
  }
  if (shows.tickets) {
    tiles.push({ key: "tickets", label: t("analytics.salesTickets"), value: count(now.tickets), hint: t("analytics.salesTicketsHint"), compare: pair((f) => f.tickets) });
  }
  if (shows.donations) {
    tiles.push({ key: "donations", label: t("analytics.salesDonations"), value: money(now.donations, num(0)), hint: t("analytics.salesDonationsHint", { count: now.donations.count }), compare: comparable(now.donations, before.donations) });
  }
  // 100.6 Courses and memberships bought in the app through the stores.
  if (shows.inApp) {
    tiles.push({ key: "in_app", label: t("analytics.salesInApp"), value: money(now.inApp, num(0)), hint: t("analytics.salesInAppHint", { count: now.inApp.count }), compare: comparable(now.inApp, before.inApp) });
    tiles.push({ key: "in_app_refunds", label: t("analytics.salesInAppRefunds"), value: money(now.inAppRefunds, num(0)), hint: t("analytics.salesInAppRefundsHint", { count: now.inAppRefunds.count }), compare: pair((f) => f.inAppRefunds.count) });
    if (now.renewals + before.renewals > 0) tiles.push({ key: "renewals", label: t("analytics.salesRenewals"), value: count(now.renewals), hint: t("analytics.salesRenewalsHint"), compare: pair((f) => f.renewals) });
  }
  if (shows.orders) {
    tiles.push({
      key: "conversion",
      label: t("analytics.salesConversion"),
      value: percent(sales.conversion, 1, lang),
      hint: sales.views > 0 ? t("analytics.salesConversionHint", { count: sales.views }) : t("analytics.salesNoViews"),
      compare: null,
    });
  }
  return (
    <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fill,minmax(min(190px,100%),1fr))]" aria-label={t("analytics.sales")}>
      {tiles.map((tile) => (
        <li key={tile.key} className="flex min-w-0 flex-col gap-1 rounded-2xl border border-line bg-white px-4 py-3.5" data-sales={tile.key}>
          <span className="text-sm font-semibold text-ink-4">{tile.label}</span>
          <bdi className="text-[24px] leading-tight font-bold break-words text-midnight" data-value>
            {tile.value}
          </bdi>
          <span className="text-xs text-muted">{tile.hint}</span>
          {tile.compare ? <Delta now={tile.compare.now} before={tile.compare.before} days={days} lang={lang} /> : null}
        </li>
      ))}
    </ul>
  );
}
