import type { Metadata } from "next";
import { btn, EmptyState, PageHeader } from "@/components/ui";
import { Stat, StatRow } from "@/components/page-kit";
import { FilterLinks, kitTable, ListBar } from "@/components/page-kit-b";
import { requireClient } from "@/lib/auth/session";
import { localToUtc, utcToLocal } from "@/lib/bookings/time";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { DEFAULT_RIDES_TIMEZONE } from "@/lib/rides/settings";
import { isRides, NotRides } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("rides.statements") };
}

/** The month's start and the next month's, as instants in the time zone. */
function monthRange(month: string, timezone: string): { since: Date; until: Date } {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { since: localToUtc(`${month}-01`, "00:00", timezone), until: localToUtc(`${next}-01`, "00:00", timezone) };
}

/** 105.2 Each driver's completed rides in a month: the fares, the company's share, the cash they collected and the balance either way. */
export default async function RideStatementPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { app } = await requireClient("orders");
  const { t } = await dashboardText();
  if (!isRides(app)) return <NotRides title={t("rides.statements")} t={t} />;
  const query = await searchParams;
  const store = await getStore();
  const settings = deliverySettingsOf(await store.getDeliverySettings(app.id));
  const timezone = settings.timezone ?? DEFAULT_RIDES_TIMEZONE;
  const thisMonth = utcToLocal(new Date(), timezone).date.slice(0, 7);
  const [y, m] = thisMonth.split("-").map(Number) as [number, number];
  const lastMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const month = query.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month) ? query.month : thisMonth;
  const range = monthRange(month, timezone);
  const rows = await store.rideStatement(app.id, range.since, range.until);
  const money = (cents: number) => formatCents(cents, settings.currency);
  // What the driver keeps: the fares less the company's share. They collected the cash: the rest is the company's.
  const balance = (r: (typeof rows)[number]) => r.cashCents - (r.faresCents - r.commissionCents);
  const balanceText = (cents: number) => (cents > 0 ? t("rides.owesYou", { amount: money(cents) }) : cents < 0 ? t("rides.youOwe", { amount: money(-cents) }) : t("rides.settled"));
  const sum = (key: "rides" | "faresCents" | "commissionCents" | "cashCents" | "cardCents" | "feesCents") => rows.reduce((n, r) => n + r[key], 0);
  const T = kitTable;
  const total = sum("cashCents") - (sum("faresCents") - sum("commissionCents"));

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, the month's totals, then each driver's statement in a flush Section with its months. */}
      <PageHeader title={t("rides.statements")} description={t("rides.statementsIntro")} />
      <StatRow label={t("rides.statements")}>
        <Stat icon="local_taxi" label={t("rides.ridesCount")} value={sum("rides")} hint={<bdi dir="ltr">{month}</bdi>} />
        <Stat icon="payments" tone="accent" label={t("rides.fares")} value={money(sum("faresCents"))} />
        <Stat icon="percent" tone="success" label={t("rides.yourShare")} value={money(sum("commissionCents"))} />
        <Stat icon="receipt_long" tone={total < 0 ? "warn" : "neutral"} label={t("rides.balance")} value={<span className="text-[18px]">{balanceText(total)}</span>} />
      </StatRow>

      <section aria-label={t("rides.statements")} className="flex min-w-0 flex-col rounded-2xl border border-line bg-white">
        <ListBar>
          <FilterLinks
            label={t("rides.period")}
            items={(
              [
                [thisMonth, "rides.thisMonth"],
                [lastMonth, "rides.lastMonth"],
              ] as const
            ).map(([value, key]) => ({ href: `/dashboard/rides/statement?month=${value}`, label: t(key), current: value === month }))}
          />
          <form method="get" className="flex items-end gap-2">
            <label htmlFor="f-month" className="sr-only">
              {t("rides.period")}
            </label>
            <input id="f-month" name="month" type="month" defaultValue={month} className="input input-sm w-[170px]" dir="ltr" />
            <button type="submit" className={`${btn.secondary} h-10 px-4 text-sm`}>
              {t("rides.period")}
            </button>
          </form>
        </ListBar>
        {rows.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="receipt_long" title={t("rides.noStatement")} />
          </div>
        ) : (
          <div className={T.wrap}>
            <table className={`${T.table} min-w-[900px]`}>
              <thead>
                <tr className={T.head}>
                  <th scope="col" className={`${T.th} ${T.start}`}>
                    {t("rides.driver")}
                  </th>
                  {(["ridesCount", "fares", "yourShare", "cashCollected", "byCard", "fees", "balance"] as const).map((k) => (
                    <th key={k} scope="col" className={`${T.th} ${T.num}`}>
                      {t(`rides.${k}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.driverId}-${r.driverName}`} className={T.row}>
                    <td className={`${T.td} font-semibold`}>{r.driverName}</td>
                    <td className={`${T.td} ${T.num}`}>{r.rides}</td>
                    <td className={`${T.td} ${T.num}`}>{money(r.faresCents)}</td>
                    <td className={`${T.td} ${T.num}`}>{money(r.commissionCents)}</td>
                    <td className={`${T.td} ${T.num}`}>{money(r.cashCents)}</td>
                    <td className={`${T.td} ${T.num}`}>{money(r.cardCents)}</td>
                    <td className={`${T.td} ${T.num}`}>{money(r.feesCents)}</td>
                    <td className={`${T.td} ${T.num} font-semibold`}>{balanceText(balance(r))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={T.foot}>
                  <th scope="row" className={`${T.td} ${T.start}`}>
                    {t("rides.total")}
                  </th>
                  <td className={`${T.td} ${T.num}`}>{sum("rides")}</td>
                  <td className={`${T.td} ${T.num}`}>{money(sum("faresCents"))}</td>
                  <td className={`${T.td} ${T.num}`}>{money(sum("commissionCents"))}</td>
                  <td className={`${T.td} ${T.num}`}>{money(sum("cashCents"))}</td>
                  <td className={`${T.td} ${T.num}`}>{money(sum("cardCents"))}</td>
                  <td className={`${T.td} ${T.num}`}>{money(sum("feesCents"))}</td>
                  <td className={`${T.td} ${T.num}`}>{balanceText(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="m-0 border-t border-line-soft px-5 py-3 text-[13px] text-muted sm:px-6">{t("rides.statementHint")}</p>
      </section>
    </div>
  );
}
