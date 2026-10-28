import type { Metadata } from "next";
import Link from "next/link";
import { btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { localToUtc, utcToLocal } from "@/lib/bookings/time";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { DEFAULT_RIDES_TIMEZONE } from "@/lib/rides/settings";
import { isRides, NotRides, PageHead } from "../parts";

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
  const th = "px-4 py-3 font-semibold";

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("rides.statements")} intro={t("rides.statementsIntro")} />
      <div className="flex flex-wrap items-end gap-3">
        <nav aria-label={t("rides.period")} className="flex flex-wrap gap-1.5">
          {(
            [
              [thisMonth, "rides.thisMonth"],
              [lastMonth, "rides.lastMonth"],
            ] as const
          ).map(([value, key]) => (
            <Link
              key={value}
              href={`/dashboard/rides/statement?month=${value}`}
              aria-current={value === month ? "page" : undefined}
              className={`flex h-9 items-center rounded-full border px-3.5 text-sm no-underline ${
                value === month ? "border-midnight bg-midnight font-bold text-white hover:text-white" : "border-line bg-white text-ink-3 hover:border-midnight hover:text-midnight"
              }`}
            >
              {t(key)}
            </Link>
          ))}
        </nav>
        <form method="get" className="flex items-end gap-2">
          <label htmlFor="f-month" className="sr-only">
            {t("rides.period")}
          </label>
          <input id="f-month" name="month" type="month" defaultValue={month} className="input input-sm w-[180px]" dir="ltr" />
          <button type="submit" className={`${btn.secondary} h-10`}>
            {t("rides.period")}
          </button>
        </form>
      </div>
      <section aria-label={t("rides.statements")} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        {rows.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("rides.noStatement")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-[15px]">
              <thead>
                <tr className="border-b border-line text-[13px] text-muted">
                  <th scope="col" className={`${th} text-start`}>
                    {t("rides.driver")}
                  </th>
                  {(["ridesCount", "fares", "yourShare", "cashCollected", "byCard", "fees", "balance"] as const).map((k) => (
                    <th key={k} scope="col" className={`${th} text-end`}>
                      {t(`rides.${k}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.driverId}-${r.driverName}`} className="border-b border-line-soft">
                    <td className="px-4 py-3 font-semibold">{r.driverName}</td>
                    <td className="px-4 py-3 text-end">{r.rides}</td>
                    <td className="px-4 py-3 text-end whitespace-nowrap">{money(r.faresCents)}</td>
                    <td className="px-4 py-3 text-end whitespace-nowrap">{money(r.commissionCents)}</td>
                    <td className="px-4 py-3 text-end whitespace-nowrap">{money(r.cashCents)}</td>
                    <td className="px-4 py-3 text-end whitespace-nowrap">{money(r.cardCents)}</td>
                    <td className="px-4 py-3 text-end whitespace-nowrap">{money(r.feesCents)}</td>
                    <td className="px-4 py-3 text-end font-semibold whitespace-nowrap">{balanceText(balance(r))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <th scope="row" className="px-4 py-3 text-start">
                    {t("rides.total")}
                  </th>
                  <td className="px-4 py-3 text-end">{sum("rides")}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">{money(sum("faresCents"))}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">{money(sum("commissionCents"))}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">{money(sum("cashCents"))}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">{money(sum("cardCents"))}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">{money(sum("feesCents"))}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">{balanceText(sum("cashCents") - (sum("faresCents") - sum("commissionCents")))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="m-0 text-[13px] text-muted">{t("rides.statementHint")}</p>
      </section>
    </div>
  );
}
