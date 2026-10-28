import type { Metadata } from "next";
import Link from "next/link";
import { btn, EmptyState, formatDateTime } from "@/components/ui";
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
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("delivery.shipments")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("delivery.shipmentsIntro")}</p>
      </div>
      <PlanNotice plan={plan} t={t} app={app} />
      {!pricesSet(settings) ? (
        <p role="note" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
          {richText(t("delivery.pricesFirst"), { link: (chunk) => <Link href="/dashboard/delivery">{chunk}</Link> })}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <nav aria-label={t("delivery.shipments")} className="flex flex-wrap gap-1.5">
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
            {t("delivery.search")}
          </label>
          <input id="f-q" name="q" type="search" defaultValue={q} placeholder={t("delivery.searchPlaceholder")} className="input input-sm w-[220px]" />
          <button type="submit" className={`${btn.secondary} h-10`}>
            {t("delivery.search")}
          </button>
        </form>
      </div>

      {items.length === 0 ? (
        <EmptyState icon="package_2" title={t("delivery.noShipments")}>
          {t("delivery.noShipmentsText")}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[760px] border-collapse text-start text-[15px]">
            <thead>
              <tr className="border-b border-line text-[13px] text-muted">
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  {t("delivery.reference")}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  {t("delivery.route")}
                </th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">
                  {t("delivery.price")}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  {t("delivery.courier")}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  {t("common.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-line-soft align-top last:border-b-0">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/dashboard/shipments/${s.id}`} className="font-semibold">
                      {shipmentReference(s)}
                    </Link>
                    <span className="block text-[13px] text-muted">{formatDateTime(s.createdAt, lang)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-col gap-0.5">
                      <span className="line-clamp-1">{s.pickup.address}</span>
                      <span className="line-clamp-1 text-ink-4">→ {s.dropoff.address}</span>
                      <span className="text-[13px] text-muted">
                        {s.senderName} → {s.recipientName}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">
                    {formatCents(s.priceCents, s.currency)}
                    <span className="block text-[13px] text-muted">
                      {t(s.paymentMethod === "cash" ? "delivery.cash" : "delivery.card")} · {t(s.paymentStatus === "paid" ? "delivery.paid" : s.paymentStatus === "refunded" ? "delivery.refunded" : "delivery.unpaid")}
                    </span>
                  </td>
                  <td className="px-4 py-3">{s.courierName ?? <span className="text-muted">{t("delivery.noCourier")}</span>}</td>
                  <td className="px-4 py-3">
                    <ShipmentStatusBadge status={s.status} t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 ? (
        <nav aria-label={t("orders.pages")} className="flex items-center justify-between gap-3">
          {page > 1 ? <Link href={link(page - 1)}>{t("delivery.newer")}</Link> : <span />}
          <span className="text-sm text-muted">{t("common.page", { page, pages })}</span>
          {page < pages ? <Link href={link(page + 1)}>{t("delivery.older")}</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
