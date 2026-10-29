import type { Metadata } from "next";
import Link from "next/link";
import { appZone } from "@/lib/analytics/zone";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { courseSetup } from "@/lib/courses/setup";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { dayRange, EARNINGS_PERIODS, paidOrders, periodDays, statements, type EarningsPeriod } from "@/lib/teachers/earnings";
import { sharePercent } from "@/lib/teachers/service";
import { isTeachers, NotTeachers, PageHead } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("teachers.statement") };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** 105.3 What each teacher's courses sold over a period, and what the academy owes each teacher. */
export default async function StatementPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { app } = await requireClient("catalog");
  const { t } = await dashboardText();
  if (!isTeachers(app)) return <NotTeachers title={t("teachers.statement")} t={t} />;
  const query = await searchParams;
  const store = await getStore();
  const zone = await appZone(store, app);
  const now = new Date();
  const asked = typeof query.period === "string" && (EARNINGS_PERIODS as readonly string[]).includes(query.period) ? (query.period as EarningsPeriod) : null;
  const fromText = typeof query.from === "string" && DAY.test(query.from) ? query.from : null;
  const toText = typeof query.to === "string" && DAY.test(query.to) ? query.to : null;
  const custom = !asked && fromText && toText && fromText <= toText ? { from: fromText, to: toText } : null;
  const period = asked ?? (custom ? null : "month");
  const days = custom ?? periodDays(period!, now, zone);
  const { start, end } = dayRange(days.from, days.to, zone);
  const setup = courseSetup(app);
  const teachers = (await store.listTeachers(app.id)).filter((teacher) => teacher.status !== "applied" && teacher.status !== "declined");
  const rows = statements(teachers, setup, await paidOrders(store, app, start, end));
  const money = (cents: number) => formatCents(cents, setup.currency);
  const totals = rows.reduce((sum, r) => ({ sales: sum.sales + r.salesCents, refunds: sum.refunds + r.refundsCents, owed: sum.owed + r.earnedCents, academy: sum.academy + r.academyCents }), { sales: 0, refunds: 0, owed: 0, academy: 0 });
  const names = new Map(teachers.map((teacher) => [teacher.id, teacher.name]));
  const shown = rows.filter((r) => r.sales > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("teachers.statement")} intro={t("teachers.statementIntro")} />
      <nav aria-label={t("teachers.statement")} className="flex flex-wrap items-end gap-2">
        {EARNINGS_PERIODS.map((p) => (
          <Link
            key={p}
            href={`?period=${p}`}
            aria-current={period === p ? "page" : undefined}
            className={`flex h-10 items-center rounded-full border px-4 text-sm font-semibold no-underline ${period === p ? "border-midnight bg-midnight text-white" : "border-line bg-white text-ink"}`}
          >
            {t(`teachers.period_${p}`)}
          </Link>
        ))}
        <form className="flex flex-wrap items-end gap-2" method="get">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {t("teachers.from")}
            <input type="date" name="from" defaultValue={days.from} className="input h-10" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {t("teachers.to")}
            <input type="date" name="to" defaultValue={days.to} className="input h-10" />
          </label>
          <button type="submit" className="flex h-10 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold">
            {t("teachers.show")}
          </button>
        </form>
      </nav>
      <section aria-labelledby="h-statement" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-statement" className="m-0 text-lg font-bold" dir="ltr">
          {days.from} → {days.to}
        </h2>
        {shown.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("teachers.noSales")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[15px]">
              <thead>
                <tr className="text-start text-sm text-muted">
                  <th className="py-2 text-start font-semibold">{t("teachers.teacher")}</th>
                  <th className="py-2 text-end font-semibold">{t("teachers.sales")}</th>
                  <th className="py-2 text-end font-semibold">{t("teachers.salesAmount")}</th>
                  <th className="py-2 text-end font-semibold">{t("teachers.refunds")}</th>
                  <th className="py-2 text-end font-semibold">{t("teachers.shareCol")}</th>
                  <th className="py-2 text-end font-semibold">{t("teachers.owed")}</th>
                  <th className="py-2 text-end font-semibold">{t("teachers.academy")}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.teacherId} className="border-t border-line-soft align-top">
                    <td className="py-3">
                      <span className="font-bold">{names.get(r.teacherId)}</span>
                      <span className="block text-[13px] text-muted">{r.courses.map((c) => `${c.title} (${c.sales})`).join(" · ")}</span>
                    </td>
                    <td className="py-3 text-end">{r.sales}</td>
                    <td className="py-3 text-end">{money(r.salesCents)}</td>
                    <td className="py-3 text-end">{money(r.refundsCents)}</td>
                    <td className="py-3 text-end">{sharePercent(r.shareBp)}%</td>
                    <td className="py-3 text-end font-bold">{money(r.earnedCents)}</td>
                    <td className="py-3 text-end">{money(r.academyCents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line font-bold">
                  <td className="py-3">{t("teachers.total")}</td>
                  <td />
                  <td className="py-3 text-end">{money(totals.sales)}</td>
                  <td className="py-3 text-end">{money(totals.refunds)}</td>
                  <td />
                  <td className="py-3 text-end">{money(totals.owed)}</td>
                  <td className="py-3 text-end">{money(totals.academy)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
