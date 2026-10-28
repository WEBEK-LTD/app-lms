import type { Metadata } from "next";
import Link from "next/link";
import { btn, EmptyState, formatDateTime } from "@/components/ui";
import { richText } from "@/i18n/rich";
import { requireClient } from "@/lib/auth/session";
import { localToUtc } from "@/lib/bookings/time";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { FoodOrderStatus } from "@/lib/data/types";
import { deliverySettingsOf, pricesSet } from "@/lib/delivery/settings";
import { appPlan } from "@/lib/entitlements";
import { DEFAULT_FOOD_TIMEZONE, FOOD_ACTIVE, foodOrderIdOf, foodOrderReference } from "@/lib/food/service";
import { isFood, PlanNotice } from "../shipments/parts";
import { FoodStatusBadge, NotFood } from "../restaurants/parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("food.foodOrders") };
}

const PER_PAGE = 25;
const FILTERS = {
  active: FOOD_ACTIVE,
  new: ["placed"],
  done: ["delivered"],
  problems: ["rejected", "cancelled", "failed"],
  all: undefined,
} as const satisfies Record<string, readonly FoodOrderStatus[] | undefined>;
type Filter = keyof typeof FILTERS;
const FILTER_KEYS = {
  active: "food.filterActive",
  new: "food.filterNew",
  done: "food.filterDone",
  problems: "food.filterProblems",
  all: "food.filterAll",
} as const;

/** "2026-10" for the month a date is in, in the time zone. */
function monthOf(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit" }).format(date).slice(0, 7);
}

/** The month's start and the next month's, as instants in the time zone. */
function monthRange(month: string, timezone: string): { since: Date; until: Date } {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { since: localToUtc(`${month}-01`, "00:00", timezone), until: localToUtc(`${next}-01`, "00:00", timezone) };
}

/** 105.1 Every food order from the app, the active ones first, and the month's statement by restaurant. */
export default async function FoodOrdersPage({ searchParams }: { searchParams: Promise<{ page?: string; show?: string; q?: string; month?: string }> }) {
  const { app, license } = await requireClient("orders");
  const { t, lang } = await dashboardText();
  if (!isFood(app)) return <NotFood title={t("food.foodOrders")} t={t} />;
  const query = await searchParams;
  const filter: Filter = query.show && query.show in FILTERS ? (query.show as Filter) : "active";
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const q = (query.q ?? "").trim().slice(0, 80);
  const store = await getStore();
  const now = new Date();
  const settings = deliverySettingsOf(await store.getDeliverySettings(app.id));
  const timezone = settings.timezone ?? DEFAULT_FOOD_TIMEZONE;
  const month = query.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month) ? query.month : monthOf(now, timezone);
  const range = monthRange(month, timezone);
  const reference = q ? foodOrderIdOf(q) : null;
  const [{ items, total }, statement, plan] = await Promise.all([
    store.listFoodOrders({
      appId: app.id,
      ...(FILTERS[filter] ? { statuses: [...FILTERS[filter]] } : {}),
      ...(q ? { search: reference ? `F-${reference}` : q } : {}),
      order: "newest",
      offset: (page - 1) * PER_PAGE,
      limit: PER_PAGE,
    }),
    store.foodStatement(app.id, range.since, range.until),
    appPlan(store, license, now),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const link = (p: number, show: Filter = filter) => `/dashboard/food-orders?${new URLSearchParams({ show, ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;
  const money = (cents: number) => formatCents(cents, settings.currency);
  const sum = (key: "orders" | "subtotalCents" | "commissionCents" | "deliveryFeeCents" | "cashSubtotalCents" | "cardSubtotalCents") => statement.reduce((n, r) => n + r[key], 0);
  const th = "px-4 py-3 font-semibold";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("food.foodOrders")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("food.foodOrdersIntro")}</p>
      </div>
      <PlanNotice plan={plan} t={t} app={app} />
      {!pricesSet(settings) ? (
        <p role="note" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
          {richText(t("food.pricesFirst"), { link: (chunk) => <Link href="/dashboard/delivery">{chunk}</Link> })}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <nav aria-label={t("food.foodOrders")} className="flex flex-wrap gap-1.5">
          {(Object.keys(FILTERS) as Filter[]).map((f) => (
            <Link
              key={f}
              href={link(1, f)}
              aria-current={f === filter ? "page" : undefined}
              className={`flex h-9 items-center rounded-full border px-3.5 text-sm no-underline ${
                f === filter ? "border-midnight bg-midnight font-bold text-white hover:text-white" : "border-line bg-white text-ink-3 hover:border-midnight hover:text-midnight"
              }`}
            >
              {t(FILTER_KEYS[f])}
            </Link>
          ))}
        </nav>
        <form method="get" className="flex items-end gap-2">
          <input type="hidden" name="show" value={filter} />
          <label htmlFor="f-q" className="sr-only">
            {t("food.search")}
          </label>
          <input id="f-q" name="q" type="search" defaultValue={q} placeholder={t("food.searchPlaceholder")} className="input input-sm w-[220px]" />
          <button type="submit" className={`${btn.secondary} h-10`}>
            {t("food.search")}
          </button>
        </form>
      </div>

      {items.length === 0 ? (
        <EmptyState icon="receipt_long" title={t("food.noOrders")}>
          {t("food.noOrdersText")}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[760px] border-collapse text-start text-[15px]">
            <thead>
              <tr className="border-b border-line text-[13px] text-muted">
                <th scope="col" className={`${th} text-start`}>
                  {t("food.order")}
                </th>
                <th scope="col" className={`${th} text-start`}>
                  {t("food.restaurant")}
                </th>
                <th scope="col" className={`${th} text-start`}>
                  {t("food.customer")}
                </th>
                <th scope="col" className={`${th} text-end`}>
                  {t("food.total")}
                </th>
                <th scope="col" className={`${th} text-start`}>
                  {t("common.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id} className="border-b border-line-soft align-top last:border-b-0">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/dashboard/food-orders/${o.id}`} className="font-semibold">
                      {foodOrderReference(o)}
                    </Link>
                    <span className="block text-[13px] text-muted">{formatDateTime(o.createdAt, lang)}</span>
                  </td>
                  <td className="px-4 py-3">{o.restaurantName}</td>
                  <td className="px-4 py-3">
                    <span className="flex flex-col gap-0.5">
                      <span>{o.customerName}</span>
                      <span className="line-clamp-1 text-[13px] text-muted">{o.dropoff.address}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">
                    {formatCents(o.totalCents, o.currency)}
                    <span className="block text-[13px] text-muted">
                      {t(o.paymentMethod === "cash" ? "food.payCash" : "food.payCard")} · {t(o.paymentStatus === "paid" ? "food.paid" : o.paymentStatus === "refunded" ? "food.refunded" : "food.unpaid")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <FoodStatusBadge status={o.status} t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 ? (
        <nav aria-label={t("orders.pages")} className="flex items-center justify-between gap-3">
          {page > 1 ? <Link href={link(page - 1)}>{t("food.newer")}</Link> : <span />}
          <span className="text-sm text-muted">{t("common.page", { page, pages })}</span>
          {page < pages ? <Link href={link(page + 1)}>{t("food.older")}</Link> : <span />}
        </nav>
      ) : null}

      <section aria-labelledby="h-statement" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex max-w-[620px] flex-col gap-1">
            <h2 id="h-statement" className="m-0 text-lg font-bold">
              {t("food.statement")}
            </h2>
            <p className="m-0 text-[15px] text-ink-4">{t("food.statementIntro")}</p>
          </div>
          <form method="get" className="flex items-end gap-2">
            <input type="hidden" name="show" value={filter} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f-month" className="text-sm font-semibold">
                {t("food.month")}
              </label>
              <input id="f-month" name="month" type="month" defaultValue={month} className="input input-sm w-[180px]" dir="ltr" />
            </div>
            <button type="submit" className={`${btn.secondary} h-10`}>
              {t("food.show")}
            </button>
          </form>
        </div>
        {statement.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("food.noStatement")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-[15px]">
              <thead>
                <tr className="border-b border-line text-[13px] text-muted">
                  <th scope="col" className={`${th} text-start`}>
                    {t("food.restaurant")}
                  </th>
                  {(["orders", "sales", "yourShare", "owed", "inCash", "byCard", "fees"] as const).map((k) => (
                    <th key={k} scope="col" className={`${th} text-end`}>
                      {t(`food.${k}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statement.map((r) => (
                  <tr key={`${r.restaurantId}-${r.restaurantName}`} className="border-b border-line-soft">
                    <td className="px-4 py-3 font-semibold">{r.restaurantName}</td>
                    <td className="px-4 py-3 text-end">{r.orders}</td>
                    <td className="px-4 py-3 text-end whitespace-nowrap">{money(r.subtotalCents)}</td>
                    <td className="px-4 py-3 text-end whitespace-nowrap">{money(r.commissionCents)}</td>
                    <td className="px-4 py-3 text-end font-semibold whitespace-nowrap">{money(r.subtotalCents - r.commissionCents)}</td>
                    <td className="px-4 py-3 text-end whitespace-nowrap">{money(r.cashSubtotalCents)}</td>
                    <td className="px-4 py-3 text-end whitespace-nowrap">{money(r.cardSubtotalCents)}</td>
                    <td className="px-4 py-3 text-end whitespace-nowrap">{money(r.deliveryFeeCents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <th scope="row" className="px-4 py-3 text-start">
                    {t("food.totalRow")}
                  </th>
                  <td className="px-4 py-3 text-end">{sum("orders")}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">{money(sum("subtotalCents"))}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">{money(sum("commissionCents"))}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">{money(sum("subtotalCents") - sum("commissionCents"))}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">{money(sum("cashSubtotalCents"))}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">{money(sum("cardSubtotalCents"))}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">{money(sum("deliveryFeeCents"))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
