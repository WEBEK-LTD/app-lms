import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, btn, EmptyState, formatDateTime, Notice, PageHeader, Section } from "@/components/ui";
import { ItemList, ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterLinks, kitTable, ListBar, ListSearch, Pager } from "@/components/page-kit-b";
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
  const T = kitTable;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, the month's numbers, the orders in a flush Section with their filters, search and pages, then the month's statement. */}
      <PageHeader title={t("food.foodOrders")} description={t("food.foodOrdersIntro")} />
      <PlanNotice plan={plan} t={t} app={app} />
      {!pricesSet(settings) ? (
        <Notice tone="warn" icon="warning">
          {richText(t("food.pricesFirst"), { link: (chunk) => <Link href="/dashboard/delivery">{chunk}</Link> })}
        </Notice>
      ) : null}

      <StatRow label={t("food.statement")}>
        <Stat icon="receipt_long" label={t("food.statDelivered")} value={sum("orders")} hint={<bdi dir="ltr">{month}</bdi>} />
        <Stat icon="payments" tone="accent" label={t("food.sales")} value={money(sum("subtotalCents"))} />
        <Stat icon="percent" tone="success" label={t("food.yourShare")} value={money(sum("commissionCents"))} />
        <Stat icon="local_shipping" label={t("food.fees")} value={money(sum("deliveryFeeCents"))} />
      </StatRow>

      <Section titleId="h-orders" title={t(FILTER_KEYS[filter])} actions={<Badge tone="neutral">{total}</Badge>} flush>
        <ListBar>
          <FilterLinks label={t("food.foodOrders")} items={(Object.keys(FILTERS) as Filter[]).map((f) => ({ href: link(1, f), label: t(FILTER_KEYS[f]), current: f === filter }))} />
          <ListSearch id="f-q" value={q} label={t("food.search")} placeholder={t("food.searchPlaceholder")} button={t("food.search")} keep={{ show: filter }} />
        </ListBar>
        {items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="receipt_long" title={t("food.noOrders")}>
              {t("food.noOrdersText")}
            </EmptyState>
          </div>
        ) : (
          <ItemList>
            {items.map((o, i) => (
              <ItemRow
                key={o.id}
                href={`/dashboard/food-orders/${o.id}`}
                media={<Thumb icon="receipt_long" shape="square" tint={i} />}
                title={foodOrderReference(o)}
                meta={`${o.restaurantName} · ${o.customerName}`}
                extra={
                  <>
                    <span>{formatDateTime(o.createdAt, lang)}</span>
                    <span className="flex min-w-0 items-center gap-1">
                      <Icon name="location_on" size={16} className="text-muted" />
                      <span className="line-clamp-1">{o.dropoff.address}</span>
                    </span>
                  </>
                }
                aside={
                  <>
                    <span className="flex flex-col items-end text-end">
                      <span className="text-[15px] font-bold whitespace-nowrap tabular-nums">{formatCents(o.totalCents, o.currency)}</span>
                      <span className="text-[13px] text-muted">
                        {t(o.paymentMethod === "cash" ? "food.payCash" : "food.payCard")} · {t(o.paymentStatus === "paid" ? "food.paid" : o.paymentStatus === "refunded" ? "food.refunded" : "food.unpaid")}
                      </span>
                    </span>
                    <FoodStatusBadge status={o.status} t={t} />
                  </>
                }
              />
            ))}
          </ItemList>
        )}
        <Pager
          label={t("orders.pages")}
          page={page}
          pages={pages}
          newer={link(page - 1)}
          older={link(page + 1)}
          newerLabel={t("food.newer")}
          olderLabel={t("food.older")}
          pageLabel={t("common.page", { page, pages })}
        />
      </Section>

      <Section
        titleId="h-statement"
        title={t("food.statement")}
        description={t("food.statementIntro")}
        actions={
          <form method="get" className="flex items-end gap-2">
            <input type="hidden" name="show" value={filter} />
            <div className="flex flex-col gap-1">
              <label htmlFor="f-month" className="text-[13px] font-semibold text-muted">
                {t("food.month")}
              </label>
              <input id="f-month" name="month" type="month" defaultValue={month} className="input input-sm w-[170px]" dir="ltr" />
            </div>
            <button type="submit" className={`${btn.secondary} h-10 px-4 text-sm`}>
              {t("food.show")}
            </button>
          </form>
        }
        flush
      >
        {statement.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="receipt_long" title={t("food.noStatement")} />
          </div>
        ) : (
          <div className={T.wrap}>
            <table className={`${T.table} min-w-[860px]`}>
              <thead>
                <tr className={T.head}>
                  <th scope="col" className={`${T.th} ${T.start}`}>
                    {t("food.restaurant")}
                  </th>
                  {(["orders", "sales", "yourShare", "owed", "inCash", "byCard", "fees"] as const).map((k) => (
                    <th key={k} scope="col" className={`${T.th} ${T.num}`}>
                      {t(`food.${k}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statement.map((r) => (
                  <tr key={`${r.restaurantId}-${r.restaurantName}`} className={T.row}>
                    <td className={`${T.td} font-semibold`}>{r.restaurantName}</td>
                    <td className={`${T.td} ${T.num}`}>{r.orders}</td>
                    <td className={`${T.td} ${T.num}`}>{money(r.subtotalCents)}</td>
                    <td className={`${T.td} ${T.num}`}>{money(r.commissionCents)}</td>
                    <td className={`${T.td} ${T.num} font-semibold`}>{money(r.subtotalCents - r.commissionCents)}</td>
                    <td className={`${T.td} ${T.num}`}>{money(r.cashSubtotalCents)}</td>
                    <td className={`${T.td} ${T.num}`}>{money(r.cardSubtotalCents)}</td>
                    <td className={`${T.td} ${T.num}`}>{money(r.deliveryFeeCents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={T.foot}>
                  <th scope="row" className={`${T.td} ${T.start}`}>
                    {t("food.totalRow")}
                  </th>
                  <td className={`${T.td} ${T.num}`}>{sum("orders")}</td>
                  <td className={`${T.td} ${T.num}`}>{money(sum("subtotalCents"))}</td>
                  <td className={`${T.td} ${T.num}`}>{money(sum("commissionCents"))}</td>
                  <td className={`${T.td} ${T.num}`}>{money(sum("subtotalCents") - sum("commissionCents"))}</td>
                  <td className={`${T.td} ${T.num}`}>{money(sum("cashSubtotalCents"))}</td>
                  <td className={`${T.td} ${T.num}`}>{money(sum("cardSubtotalCents"))}</td>
                  <td className={`${T.td} ${T.num}`}>{money(sum("deliveryFeeCents"))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
