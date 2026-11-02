import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, btn, EmptyState, formatDateTime, Notice, PageHeader, Section } from "@/components/ui";
import { ItemList, ItemRow, Thumb } from "@/components/page-kit";
import { FilterLinks, ListBar, ListSearch, Pager } from "@/components/page-kit-b";
import { richText } from "@/i18n/rich";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { ShipmentStatus } from "@/lib/data/types";
import { ACTIVE_STATUSES, shipmentIdOf, shipmentReference } from "@/lib/delivery/service";
import { deliverySettingsOf, pricesSet } from "@/lib/delivery/settings";
import { appPlan } from "@/lib/entitlements";
import { isDelivery, NotDelivery, PlanNotice, ShipmentStatusBadge } from "./parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("delivery.shipments") };
}

const PER_PAGE = 25;
const FILTERS = {
  active: ACTIVE_STATUSES,
  waiting: ["pending"],
  done: ["delivered"],
  problems: ["failed", "cancelled"],
  all: undefined,
} as const satisfies Record<string, readonly ShipmentStatus[] | undefined>;
type Filter = keyof typeof FILTERS;
const FILTER_KEYS = {
  active: "delivery.filterActive",
  waiting: "delivery.filterWaiting",
  done: "delivery.filterDone",
  problems: "delivery.filterProblems",
  all: "delivery.filterAll",
} as const;

/** 104 Every shipment sent from the app, the active ones first. */
export default async function ShipmentsPage({ searchParams }: { searchParams: Promise<{ page?: string; show?: string; q?: string }> }) {
  const { app, license } = await requireClient("orders");
  const { t, lang } = await dashboardText();
  if (!isDelivery(app)) return <NotDelivery title={t("delivery.shipments")} t={t} />;
  const query = await searchParams;
  const filter: Filter = query.show && query.show in FILTERS ? (query.show as Filter) : "active";
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const q = (query.q ?? "").trim().slice(0, 80);
  const store = await getStore();
  const now = new Date();
  const reference = q ? shipmentIdOf(q) : null;
  const [{ items, total }, settings, plan] = await Promise.all([
    store.listShipments({
      appId: app.id,
      ...(FILTERS[filter] ? { statuses: [...FILTERS[filter]] } : {}),
      ...(q ? { search: reference ? `S-${reference}` : q } : {}),
      order: "newest",
      offset: (page - 1) * PER_PAGE,
      limit: PER_PAGE,
    }),
    store.getDeliverySettings(app.id).then(deliverySettingsOf),
    appPlan(store, license, now),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const link = (p: number, show: Filter = filter) => `/dashboard/shipments?${new URLSearchParams({ show, ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, then the shipments in a flush Section with their filters, search and pages. */}
      <PageHeader
        title={t("delivery.shipments")}
        description={t("delivery.shipmentsIntro")}
        actions={
          <Link href="/dashboard/delivery/live" className={`${btn.main} h-11`}>
            <Icon name="map" size={20} />
            {t("delivery.liveMap")}
          </Link>
        }
      />
      <PlanNotice plan={plan} t={t} app={app} />
      {!pricesSet(settings) ? (
        <Notice tone="warn" icon="warning">
          {richText(t("delivery.pricesFirst"), { link: (chunk) => <Link href="/dashboard/delivery">{chunk}</Link> })}
        </Notice>
      ) : null}

      <Section titleId="h-shipments" title={t(FILTER_KEYS[filter])} actions={<Badge tone="neutral">{total}</Badge>} flush>
        <ListBar>
          <FilterLinks label={t("delivery.shipments")} items={(Object.keys(FILTERS) as Filter[]).map((f) => ({ href: link(1, f), label: t(FILTER_KEYS[f]), current: f === filter }))} />
          <ListSearch id="f-q" value={q} label={t("delivery.search")} placeholder={t("delivery.searchPlaceholder")} button={t("delivery.search")} keep={{ show: filter }} />
        </ListBar>
        {items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="package_2" title={t("delivery.noShipments")}>
              {t("delivery.noShipmentsText")}
            </EmptyState>
          </div>
        ) : (
          <ItemList>
            {items.map((s, i) => (
              <ItemRow
                key={s.id}
                href={`/dashboard/shipments/${s.id}`}
                media={<Thumb icon="package_2" shape="square" tint={i} />}
                title={shipmentReference(s)}
                meta={
                  <>
                    <span className="line-clamp-1">{s.pickup.address}</span>
                    <span className="line-clamp-1 text-ink-4">→ {s.dropoff.address}</span>
                  </>
                }
                extra={
                  <>
                    <span>{formatDateTime(s.createdAt, lang)}</span>
                    <span>
                      {s.senderName} → {s.recipientName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="two_wheeler" size={16} className="text-muted" />
                      {s.courierName ?? t("delivery.noCourier")}
                    </span>
                  </>
                }
                aside={
                  <>
                    <span className="flex flex-col items-end text-end">
                      <span className="text-[15px] font-bold whitespace-nowrap tabular-nums">{formatCents(s.priceCents, s.currency)}</span>
                      <span className="text-[13px] text-muted">
                        {t(s.paymentMethod === "cash" ? "delivery.cash" : "delivery.card")} · {t(s.paymentStatus === "paid" ? "delivery.paid" : s.paymentStatus === "refunded" ? "delivery.refunded" : "delivery.unpaid")}
                      </span>
                    </span>
                    <ShipmentStatusBadge status={s.status} t={t} />
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
          newerLabel={t("delivery.newer")}
          olderLabel={t("delivery.older")}
          pageLabel={t("common.page", { page, pages })}
        />
      </Section>
    </div>
  );
}
