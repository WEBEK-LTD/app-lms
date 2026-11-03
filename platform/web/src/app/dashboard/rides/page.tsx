import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, btn, EmptyState, formatDateTime, PageHeader, Section } from "@/components/ui";
import { ItemList, ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterLinks, ListBar, ListSearch, Pager } from "@/components/page-kit-b";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { RideStatus } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { DRIVER_ACTIVE, RIDE_ACTIVE, rideIdOf, rideReference } from "@/lib/rides/service";
import { offeredTypes } from "@/lib/rides/settings";
import { mapsLink } from "../shipments/parts";
import { isRides, NotRides, RideStatusBadge, RidesPlanNotice, TypesFirst } from "./parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("rides.rides") };
}

const PER_PAGE = 25;
const FILTERS = {
  active: RIDE_ACTIVE,
  searching: ["searching"],
  scheduled: ["scheduled"],
  done: ["completed"],
  problems: ["cancelled", "no_driver"],
  all: undefined,
} as const satisfies Record<string, readonly RideStatus[] | undefined>;
type Filter = keyof typeof FILTERS;
const FILTER_KEYS = {
  active: "rides.filterActive",
  searching: "rides.filterSearching",
  scheduled: "rides.filterScheduled",
  done: "rides.filterDone",
  problems: "rides.filterProblems",
  all: "rides.filterAll",
} as const;

/** 105.2 Every ride from the app, the active ones first, and the drivers online now. */
export default async function RidesPage({ searchParams }: { searchParams: Promise<{ page?: string; show?: string; q?: string }> }) {
  const { app, license } = await requireClient("orders");
  const { t, lang } = await dashboardText();
  if (!isRides(app)) return <NotRides title={t("rides.rides")} t={t} />;
  const query = await searchParams;
  const filter: Filter = query.show && query.show in FILTERS ? (query.show as Filter) : "active";
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const q = (query.q ?? "").trim().slice(0, 80);
  const store = await getStore();
  const now = new Date();
  const reference = q ? rideIdOf(q) : null;
  const [{ items, total }, drivers, busy, types, plan] = await Promise.all([
    store.listRides({
      appId: app.id,
      ...(FILTERS[filter] ? { statuses: [...FILTERS[filter]] } : {}),
      ...(q ? { search: reference ? `R-${reference}` : q } : {}),
      order: "newest",
      offset: (page - 1) * PER_PAGE,
      limit: PER_PAGE,
    }),
    store.listCouriers(app.id),
    store.listRides({ appId: app.id, statuses: DRIVER_ACTIVE, order: "oldest", offset: 0, limit: 2000 }),
    store.listVehicleTypes(app.id),
    appPlan(store, license, now),
  ]);
  const online = drivers.filter((d) => d.active && d.onDuty);
  const onRide = new Map(busy.items.filter((r) => r.driverId !== null).map((r) => [r.driverId!, r]));
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const link = (p: number, show: Filter = filter) => `/dashboard/rides?${new URLSearchParams({ show, ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;
  const busyNow = online.filter((d) => onRide.has(d.id)).length;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and the live map, the drivers' numbers, the rides in a flush Section with their filters, search and pages, then the drivers online. */}
      <PageHeader
        title={t("rides.rides")}
        description={t("rides.ridesIntro")}
        actions={
          <Link href="/dashboard/taxi/live" className={`${btn.main} h-11`}>
            <Icon name="map" size={20} />
            {t("taxi.liveMap")}
          </Link>
        }
      />
      <RidesPlanNotice app={app} plan={plan} t={t} />
      {offeredTypes(types).length === 0 ? <TypesFirst t={t} /> : null}

      <StatRow label={t("rides.onlineNow")}>
        <Stat icon="person" label={t("rides.drivers")} value={drivers.length} href="/dashboard/drivers" />
        <Stat icon="check_circle" tone="success" label={t("rides.onlineNow")} value={online.length} />
        <Stat icon="local_taxi" tone="accent" label={t("rides.onRide")} value={busyNow} />
        <Stat icon="category" label={t("rides.vehicleTypes")} value={offeredTypes(types).length} href="/dashboard/vehicle-types" />
      </StatRow>

      <Section titleId="h-rides" title={t(FILTER_KEYS[filter])} actions={<Badge tone="neutral">{total}</Badge>} flush>
        <ListBar>
          <FilterLinks label={t("rides.rides")} items={(Object.keys(FILTERS) as Filter[]).map((f) => ({ href: link(1, f), label: t(FILTER_KEYS[f]), current: f === filter }))} />
          <ListSearch id="f-q" value={q} label={t("rides.search")} placeholder={t("rides.searchPlaceholder")} button={t("rides.search")} keep={{ show: filter }} />
        </ListBar>
        {items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="local_taxi" title={t("rides.noRides")}>
              {t("rides.noRidesText")}
            </EmptyState>
          </div>
        ) : (
          <ItemList>
            {items.map((r, i) => (
              <ItemRow
                key={r.id}
                href={`/dashboard/rides/${r.id}`}
                media={<Thumb icon="local_taxi" shape="square" tint={i} />}
                title={rideReference(r)}
                badges={<Badge tone="neutral">{r.vehicleTypeName}</Badge>}
                meta={
                  <>
                    <span className="line-clamp-1">{r.pickup.address}</span>
                    <span className="line-clamp-1 text-ink-4">→ {r.dropoff.address}</span>
                  </>
                }
                extra={
                  <>
                    <span>{formatDateTime(r.scheduledAt ?? r.createdAt, lang)}</span>
                    <span className="flex items-center gap-1">
                      <Icon name="person" size={16} className="text-muted" />
                      {r.riderName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="directions_car" size={16} className="text-muted" />
                      {r.driverName ?? t("rides.noDriver")}
                    </span>
                  </>
                }
                aside={
                  <>
                    <span className="flex flex-col items-end text-end">
                      <span className="text-[15px] font-bold whitespace-nowrap tabular-nums">
                        {formatCents(r.status === "completed" && r.finalCents !== null ? r.finalCents : r.status === "cancelled" ? (r.cancellation?.feeCents ?? 0) : r.quotedCents, r.currency)}
                      </span>
                      <span className="text-[13px] text-muted">
                        {t(r.paymentMethod === "cash" ? "rides.cash" : "rides.card")} · {t(r.paymentStatus === "paid" ? "rides.paid" : r.paymentStatus === "refunded" ? "rides.refunded" : "rides.unpaid")}
                      </span>
                    </span>
                    <RideStatusBadge status={r.status} t={t} />
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
          newerLabel={t("rides.newer")}
          olderLabel={t("rides.older")}
          pageLabel={t("common.page", { page, pages })}
        />
      </Section>

      <Section titleId="h-online" title={t("rides.onlineNow")} description={t("rides.onlineNowIntro")} actions={<Badge tone="neutral">{online.length}</Badge>}>
        {online.length === 0 ? (
          <EmptyState icon="directions_car" title={t("rides.noneOnline")} />
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr))]">
            {online.map((d, i) => {
              const ride = onRide.get(d.id);
              return (
                <li key={d.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                  <Thumb icon="person" shape="round" tint={i} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-bold">{d.name}</span>
                      <Badge tone={ride ? "info" : "success"}>{ride ? t("rides.onRide") : t("rides.free")}</Badge>
                    </span>
                    {ride ? (
                      <Link href={`/dashboard/rides/${ride.id}`} className="text-[13px] font-semibold">
                        {rideReference(ride)}
                      </Link>
                    ) : null}
                    {d.lat !== null && d.lng !== null && d.locatedAt ? (
                      <a href={mapsLink(d.lat, d.lng)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold">
                        <Icon name="my_location" size={16} />
                        {t("rides.lastSeen", { time: formatDateTime(d.locatedAt, lang) })}
                      </a>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
