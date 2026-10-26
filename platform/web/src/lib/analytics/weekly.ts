import type { Lang } from "@/i18n/config";
import { langOf } from "@/i18n/config";
import { getDashT } from "@/i18n/dashboard";
import { formatDate, formatNumber } from "@/i18n/format";
import { formatCents } from "../catalog/money";
import type { DataStore } from "../data/store";
import type { PaidTotals } from "../data/types";
import type { EmailTemplateKey, TemplateValue } from "../email/templates";
import { mailOptions } from "../email/mail-lang";
import { appIsActive } from "../license/status";
import { addDays, dayOf } from "./days";
import { loadReport, type AnalyticsReport, type AnalyticsRange } from "./report";
import { loadSales, type SalesReport } from "./sales";
import { appZone } from "./zone";

/**
 * 86.4 The weekly summary: every Monday (or by Wednesday, when the daily job
 * missed a day), each owner gets an email per active app that was used or
 * sold something the week before (Monday to Sunday in the app's time zone):
 * its numbers beside the week before it, in the language they chose for the
 * dashboard. Once a week per app (`weekly_mail` on the week's first day);
 * the owner turns it off on the app's Analytics page.
 */

type Mail = (key: EmailTemplateKey, to: string, values: Record<string, TemplateValue>, options?: { lang?: Lang }) => Promise<unknown>;

export interface WeeklyDeps {
  store: DataStore;
  now: Date;
  baseUrl: string;
  mail: Mail;
}

/** The week to sum up today in `zone`: the last Monday-to-Sunday, on Monday to Wednesday only. */
export function weekToSummarize(now: Date, zone: string): { from: string; to: string } | null {
  const today = dayOf(now, zone);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  if (weekday < 1 || weekday > 3) return null;
  const monday = addDays(today, -(weekday - 1));
  return { from: addDays(monday, -7), to: addDays(monday, -1) };
}

function money(totals: PaidTotals, lang: Lang): string {
  return totals.totals.length === 0 ? formatNumber(lang, 0) : totals.totals.map((t) => formatCents(t.cents, t.currency as Parameters<typeof formatCents>[1])).join(" · ");
}

/** The week's numbers, one line each, beside the week before (only what the app has). */
export function summaryLines(report: AnalyticsReport, sales: SalesReport, lang: Lang): string[] {
  const t = getDashT(lang);
  const n = (value: number) => formatNumber(lang, value);
  const avg = (value: number) => formatNumber(lang, value, { maximumFractionDigits: value >= 10 ? 0 : 1 });
  const lines = [
    t("analytics.weeklyInstalls", { now: n(report.kpis.installs), before: n(report.previous.installs) }),
    t("analytics.weeklyActive", { now: avg(report.kpis.activeAvg), before: avg(report.previous.activeAvg) }),
    t("analytics.weeklySessions", { now: n(report.kpis.sessions), before: n(report.previous.sessions) }),
  ];
  const { shows, current: c, previous: p } = sales;
  if (shows.orders) lines.push(t("analytics.weeklyOrders", { now: n(c.orders.count), money: money(c.orders, lang), before: n(p.orders.count) }));
  if (shows.refunds && c.refunds.count > 0) lines.push(t("analytics.weeklyRefunds", { now: n(c.refunds.count), money: money(c.refunds, lang) }));
  if (shows.enrolments) lines.push(t("analytics.weeklyEnrolments", { now: n(c.enrolments.total), before: n(p.enrolments.total) }));
  if (shows.bookings) lines.push(t("analytics.weeklyBookings", { now: n(c.bookings), before: n(p.bookings) }));
  if (shows.tickets) lines.push(t("analytics.weeklyTickets", { now: n(c.tickets), before: n(p.tickets) }));
  if (shows.donations) lines.push(t("analytics.weeklyDonations", { now: n(c.donations.count), money: money(c.donations, lang), before: n(p.donations.count) }));
  const top = report.items[0];
  if (top) lines.push(t("analytics.weeklyTopItem", { title: top.title, views: n(top.views) }));
  const pushed = report.push.reduce((sum, row) => sum + row.pushed, 0) + report.auto.reduce((sum, row) => sum + row.pushed, 0);
  const opened = report.push.reduce((sum, row) => sum + row.opened, 0) + report.auto.reduce((sum, row) => sum + row.opened, 0);
  if (pushed > 0) lines.push(t("analytics.weeklyPush", { pushed: n(pushed), opened: n(opened) }));
  return lines;
}

function weekText(week: { from: string; to: string }, lang: Lang): string {
  const date = (day: string) => formatDate(lang, new Date(`${day}T12:00:00Z`));
  return getDashT(lang)("analytics.weekRange", { from: date(week.from), to: date(week.to) });
}

/** Sends the week's summaries that are due; safe to run again (each goes once). */
export async function runWeeklySummaries(deps: WeeklyDeps): Promise<{ sent: number; quiet: number }> {
  const { store, now } = deps;
  let sent = 0;
  let quiet = 0;
  for (const app of await store.listApps()) {
    if (app.weeklySummary === false || app.deletedAt || !app.appName) continue;
    const zone = await appZone(store, app);
    const week = weekToSummarize(now, zone);
    if (!week) continue;
    if ((await store.listAnalyticsDaily(app.id, week.from, week.from, ["weekly_mail"])).length > 0) continue;
    const client = await store.getClientById(app.clientId);
    if (!client || !appIsActive(await store.getLicenseForApp(client.id, app.id), client, now)) continue;
    const owner = await store.getUserById(client.userId);
    if (!owner) continue;
    const range: AnalyticsRange = { preset: "custom", from: week.from, to: week.to, days: 7, previous: { from: addDays(week.from, -7), to: addDays(week.from, -1) } };
    const report = await loadReport(store, app.id, range, now, zone);
    const sales = await loadSales(store, app, range, zone, report.funnel[0]?.value ?? 0);
    // Marked first: a failed email isn't sent again in a loop.
    await store.addAnalyticsDaily(app.id, week.from, { metric: "weekly_mail", key: "", label: null, value: 1 });
    if (!report.hasData && !hasSales(sales)) {
      quiet += 1;
      continue;
    }
    const lang = langOf(owner.language);
    try {
      await deps.mail(
        "weekly_summary",
        owner.email,
        {
          name: owner.name,
          app_name: app.appName,
          week: weekText(week, lang),
          summary: summaryLines(report, sales, lang).join("\n"),
          analytics_url: `${deps.baseUrl.replace(/\/+$/, "")}/dashboard/open/${app.id}?to=analytics`,
        },
        ...mailOptions(owner),
      );
      sent += 1;
    } catch (error) {
      console.error("[weekly] email failed", error instanceof Error ? error.message : String(error));
    }
  }
  return { sent, quiet };
}

function hasSales(sales: SalesReport): boolean {
  const c = sales.current;
  return c.orders.count + c.refunds.count + c.donations.count + c.enrolments.total + c.bookings + c.tickets > 0;
}

