import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, formatDateTime, PageHeader, Section } from "@/components/ui";
import { ItemList, ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterLinks, ListBar, ListSearch, Pager } from "@/components/page-kit-b";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { DashKey } from "@/i18n/dashboard";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { ACTIVE_COMPLAINT } from "@/lib/market/complaints";
import { formatMinor } from "@/lib/market/currency";
import { marketOrderReference } from "@/lib/market/json";
import { marketCurrency } from "@/lib/market/settings";
import { marketOrderIdOf, ORDER_FILTERS, orderFilterOf, type OrderFilter } from "@/lib/market/support";
import { isFood } from "../../shipments/parts";
import { NotMarket, OrderStatusBadge } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("market.orders") };
}

const PER_PAGE = 25;
const FILTER_KEYS: Record<OrderFilter, DashKey> = {
  active: "market.filterActive",
  new: "market.filterNew",
  done: "market.filterDone",
  problems: "market.filterProblems",
  all: "market.filterAll",
};

/** 115.12 Every marketplace order from every place, the active ones first, with today's numbers. */
export default async function MarketOrdersPage({ searchParams }: { searchParams: Promise<{ page?: string; show?: string; q?: string }> }) {
  const { app } = await requireClient("orders");
  const { t, lang } = await dashboardText();
  if (!isFood(app)) return <NotMarket title={t("market.orders")} t={t} />;
  const query = await searchParams;
  const filter = orderFilterOf(query.show);
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const q = (query.q ?? "").trim().slice(0, 80);
  const store = await getStore();
  const now = new Date();
  const dayStart = new Date(now.getTime() - 24 * 3600_000);
  const settings = deliverySettingsOf(await store.getDeliverySettings(app.id));
  const currency = marketCurrency(settings);
  const statuses = ORDER_FILTERS[filter];
  // A reference ("M-1042") opens straight to that order; a name filters this page's list.
  const byId = q ? marketOrderIdOf(q) : null;
  const [listed, today, moving, complaints] = await Promise.all([
    byId !== null
      ? store.getMarketOrder(app.id, byId).then((o) => ({ items: o ? [o] : [], total: o ? 1 : 0 }))
      : store.listMarketOrders({ appId: app.id, ...(statuses ? { statuses: [...statuses] } : {}), order: "newest", limit: q ? 200 : PER_PAGE, offset: q ? 0 : (page - 1) * PER_PAGE }),
    store.listMarketOrders({ appId: app.id, createdSince: dayStart, limit: 500, offset: 0 }),
    store.listMarketOrders({ appId: app.id, statuses: ["on_the_way"], limit: 1, offset: 0 }),
    store.listMarketComplaints({ appId: app.id, statuses: [...ACTIVE_COMPLAINT], limit: 1, offset: 0 }),
  ]);
  const needle = q.toLowerCase();
  const items = byId === null && q ? listed.items.filter((o) => o.customerName.toLowerCase().includes(needle) || o.vendorName.toLowerCase().includes(needle)) : listed.items;
  const total = byId === null && q ? items.length : listed.total;
  const pages = q ? 1 : Math.max(1, Math.ceil(total / PER_PAGE));
  const link = (p: number, show: OrderFilter = filter) => `?${new URLSearchParams({ show, ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;
  const money = (minor: number, c = currency) => formatMinor(minor, c, lang);
  const sales = today.items.filter((o) => !["rejected", "cancelled", "awaiting_payment"].includes(o.status)).reduce((n, o) => n + o.money.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("market.orders")} description={t("market.ordersIntro")} />
      <StatRow>
        <Stat icon="receipt_long" label={t("market.statOrders")} value={today.total} />
        <Stat icon="payments" tone="accent" label={t("market.statSales")} value={money(sales)} />
        <Stat icon="two_wheeler" label={t("market.statActive")} value={moving.total} href={link(1, "active")} />
        <Stat icon="support_agent" tone={complaints.total ? "warn" : "neutral"} label={t("market.statComplaints")} value={complaints.total} href="/dashboard/market/complaints" />
      </StatRow>

      <Section titleId="h-market-orders" title={t(FILTER_KEYS[filter])} actions={<Badge tone="neutral">{total}</Badge>} flush>
        <ListBar>
          <FilterLinks label={t("market.orders")} items={(Object.keys(ORDER_FILTERS) as OrderFilter[]).map((f) => ({ href: link(1, f), label: t(FILTER_KEYS[f]), current: f === filter }))} />
          <ListSearch id="m-q" value={q} label={t("market.search")} placeholder={t("market.searchPlaceholder")} button={t("market.search")} keep={{ show: filter }} />
        </ListBar>
        {items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="receipt_long" title={t("market.noOrders")}>
              {t("market.noOrdersText")}
            </EmptyState>
          </div>
        ) : (
          <ItemList>
            {items.map((o, i) => (
              <ItemRow
                key={o.id}
                media={<Thumb icon={o.vendorKind === "restaurant" ? "restaurant" : "storefront"} shape="square" tint={i} />}
                title={<bdi dir="ltr">{marketOrderReference(o)}</bdi>}
                meta={`${o.vendorName} · ${o.customerName}`}
                extra={
                  <>
                    <span>{formatDateTime(o.createdAt, lang)}</span>
                    <span className="flex min-w-0 items-center gap-1">
                      <Icon name={o.fulfilment === "pickup" ? "storefront" : o.deliveryBy === "app" ? "two_wheeler" : "local_shipping"} size={16} className="text-muted" />
                      <span className="line-clamp-1">{t(o.fulfilment === "pickup" ? "market.pickup" : o.deliveryBy === "app" ? "market.byApp" : "market.byVendor")}</span>
                    </span>
                    <span>{t("market.items", { count: o.lines.length })}</span>
                    {o.scheduledFor && o.status === "scheduled" ? <span>{t("market.scheduledFor", { time: formatDateTime(o.scheduledFor, lang) })}</span> : null}
                  </>
                }
                aside={
                  <>
                    <span className="flex flex-col items-end text-end">
                      <span className="text-[15px] font-bold whitespace-nowrap tabular-nums">{money(o.money.total, o.currency)}</span>
                      <span className="text-[13px] text-muted">{t(`market.pay_${o.paymentMethod}`)}</span>
                    </span>
                    <OrderStatusBadge status={o.status} t={t} />
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
    </div>
  );
}
