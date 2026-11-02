import type { Metadata } from "next";
import { btn, EmptyState, Section } from "@/components/ui";
import { Stat, StatRow } from "@/components/page-kit";
import { FilterLinks, kitTable, ListBar } from "@/components/page-kit-b";
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

  const T = kitTable;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, the period's totals, then the statement in a flush Section with its periods. */}
      <PageHead title={t("teachers.statement")} intro={t("teachers.statementIntro")} />
      <StatRow label={t("teachers.statement")}>
        <Stat icon="payments" label={t("teachers.salesAmount")} value={money(totals.sales)} hint={totals.refunds ? `${t("teachers.refunds")}: ${money(totals.refunds)}` : undefined} />
        <Stat icon="groups" tone="accent" label={t("teachers.owed")} value={money(totals.owed)} />
        <Stat icon="school" tone="success" label={t("teachers.academy")} value={money(totals.academy)} />
      </StatRow>

      <Section titleId="h-statement" title={<bdi dir="ltr">{days.from} → {days.to}</bdi>} flush>
        <ListBar>
          <FilterLinks label={t("teachers.statement")} items={EARNINGS_PERIODS.map((p) => ({ href: `?period=${p}`, label: t(`teachers.period_${p}`), current: period === p }))} />
          <form className="flex flex-wrap items-end gap-2" method="get">
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
              {t("teachers.from")}
              <input type="date" name="from" defaultValue={days.from} className="input h-10" />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
              {t("teachers.to")}
              <input type="date" name="to" defaultValue={days.to} className="input h-10" />
            </label>
            <button type="submit" className={`${btn.secondary} h-10 px-4 text-sm`}>
              {t("teachers.show")}
            </button>
          </form>
        </ListBar>
        {shown.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="receipt_long" title={t("teachers.noSales")} />
          </div>
        ) : (
          <div className={T.wrap}>
            <table className={`${T.table} min-w-[720px]`}>
              <thead>
                <tr className={T.head}>
                  <th className={`${T.th} ${T.start}`}>{t("teachers.teacher")}</th>
                  <th className={`${T.th} ${T.num}`}>{t("teachers.sales")}</th>
                  <th className={`${T.th} ${T.num}`}>{t("teachers.salesAmount")}</th>
                  <th className={`${T.th} ${T.num}`}>{t("teachers.refunds")}</th>
                  <th className={`${T.th} ${T.num}`}>{t("teachers.shareCol")}</th>
                  <th className={`${T.th} ${T.num}`}>{t("teachers.owed")}</th>
                  <th className={`${T.th} ${T.num}`}>{t("teachers.academy")}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.teacherId} className={T.row}>
                    <td className={T.td}>
                      <span className="font-bold">{names.get(r.teacherId)}</span>
                      <span className="block text-[13px] text-muted">{r.courses.map((c) => `${c.title} (${c.sales})`).join(" · ")}</span>
                    </td>
                    <td className={`${T.td} ${T.num}`}>{r.sales}</td>
                    <td className={`${T.td} ${T.num}`}>{money(r.salesCents)}</td>
                    <td className={`${T.td} ${T.num}`}>{money(r.refundsCents)}</td>
                    <td className={`${T.td} ${T.num}`}>{sharePercent(r.shareBp)}%</td>
                    <td className={`${T.td} ${T.num} font-bold`}>{money(r.earnedCents)}</td>
                    <td className={`${T.td} ${T.num}`}>{money(r.academyCents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={T.foot}>
                  <td className={T.td}>{t("teachers.total")}</td>
                  <td className={T.td} />
                  <td className={`${T.td} ${T.num}`}>{money(totals.sales)}</td>
                  <td className={`${T.td} ${T.num}`}>{money(totals.refunds)}</td>
                  <td className={T.td} />
                  <td className={`${T.td} ${T.num}`}>{money(totals.owed)}</td>
                  <td className={`${T.td} ${T.num}`}>{money(totals.academy)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
