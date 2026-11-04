import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { btn, EmptyState, PageHeader, Section } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { formatMinor } from "@/lib/market/currency";
import { ownerStatements, statementsTotal } from "@/lib/market/owner-statements";
import { monthBounds } from "@/lib/market/panel-pages";
import { marketCurrency } from "@/lib/market/settings";
import { isFood } from "../../shipments/parts";
import { NotMarket } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("market.statements") };
}

/** The last twelve months, newest first ("2026-11"). */
function lastMonths(now: Date): string[] {
  const out: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

/** 115.12 Studio › Statements: every place's month, what it sold, what it owes or is owed, and each statement to download. */
export default async function StatementsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { app } = await requireClient("orders");
  const { t, lang } = await dashboardText();
  if (!isFood(app)) return <NotMarket title={t("market.statements")} t={t} />;
  const now = new Date();
  const { from, to, month } = monthBounds((await searchParams).month ?? null, now);
  const store = await getStore();
  const currency = marketCurrency(deliverySettingsOf(await store.getDeliverySettings(app.id)));
  const rows = await ownerStatements(store, app, currency, from, to);
  const sum = statementsTotal(rows);
  const money = (minor: number) => formatMinor(minor, currency, lang);
  const tiles: [string, string][] = [
    [t("market.stOrders"), String(sum.orders)],
    [t("market.stSales"), money(sum.total)],
    [t("market.stCommission"), money(sum.commission + sum.courierCharges)],
    [t("market.stYouEarn"), money(sum.ownerEarns)],
    [t("market.stNet"), money(sum.net)],
  ];
  const link = (vendor: number, format: string) => `/api/market/statement?vendor=${vendor}&month=${month}&format=${format}&lang=${lang}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("market.statements")} description={t("market.statementsIntro")} />
      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-3">
          {t("market.stMonth")}
          <select name="month" defaultValue={month} className="input h-10" dir="ltr">
            {lastMonths(now).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={`${btn.secondary} h-10 px-4 text-sm`}>
          {t("market.stShow")}
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 rounded-2xl border border-line-soft bg-white p-4">
            <span className="text-[13px] font-semibold text-ink-4">{label}</span>
            <span className="text-[20px] font-extrabold tracking-[-0.3px] text-ink" dir="ltr">
              {value}
            </span>
          </div>
        ))}
      </div>

      <Section titleId="h-statements" title={t("market.stPlaces")} description={t("market.stNetHint")} flush>
        {rows.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="receipt_long" title={t("market.stNone")} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-[14px]">
              <thead>
                <tr className="bg-sand text-start text-[12px] font-bold tracking-[0.4px] text-ink-4 uppercase">
                  <th className="px-4 py-3 text-start">{t("market.stPlace")}</th>
                  <th className="px-4 py-3 text-end">{t("market.stOrders")}</th>
                  <th className="px-4 py-3 text-end">{t("market.stSales")}</th>
                  <th className="px-4 py-3 text-end">{t("market.stCommission")}</th>
                  <th className="px-4 py-3 text-end">{t("market.stCash")}</th>
                  <th className="px-4 py-3 text-end">{t("market.stNet")}</th>
                  <th className="px-4 py-3 text-end">{t("market.stDownload")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ vendor, statement: { totals } }) => (
                  <tr key={vendor.id} className="border-t border-line-soft">
                    <td className="px-4 py-3 font-semibold text-ink-2">{vendor.name}</td>
                    <td className="px-4 py-3 text-end" dir="ltr">
                      {totals.orders}
                    </td>
                    <td className="px-4 py-3 text-end" dir="ltr">
                      {money(totals.total)}
                    </td>
                    <td className="px-4 py-3 text-end" dir="ltr">
                      {money(totals.commission + totals.courierCharges)}
                    </td>
                    <td className="px-4 py-3 text-end" dir="ltr">
                      {money(totals.cashHeldByVendor)}
                    </td>
                    <td className={`px-4 py-3 text-end font-bold ${totals.net < 0 ? "text-danger" : "text-success"}`} dir="ltr">
                      {money(totals.net)}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <span className="inline-flex gap-2">
                        {(["csv", "xlsx", "pdf"] as const).map((f) => (
                          <a key={f} href={link(vendor.id, f)} className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[12px] font-bold text-ink-3 no-underline hover:border-ink-4">
                            <Icon name="download" size={14} />
                            {f.toUpperCase()}
                          </a>
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
