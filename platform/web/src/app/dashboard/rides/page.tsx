import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, btn, EmptyState, formatDateTime } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { RideStatus } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { DRIVER_ACTIVE, RIDE_ACTIVE, rideIdOf, rideReference } from "@/lib/rides/service";
import { offeredTypes } from "@/lib/rides/settings";
import { mapsLink } from "../shipments/parts";
import { isRides, NotRides, PageHead, RideStatusBadge, RidesPlanNotice, TypesFirst } from "./parts";

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
  const th = "px-4 py-3 font-semibold";

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("rides.rides")} intro={t("rides.ridesIntro")} />
      <RidesPlanNotice plan={plan} t={t} />
      {offeredTypes(types).length === 0 ? <TypesFirst t={t} /> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <nav aria-label={t("rides.rides")} className="flex flex-wrap gap-1.5">
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
            {t("rides.search")}
          </label>
          <input id="f-q" name="q" type="search" defaultValue={q} placeholder={t("rides.searchPlaceholder")} className="input input-sm w-[220px]" />
          <button type="submit" className={`${btn.secondary} h-10`}>
            {t("rides.search")}
          </button>
        </form>
      </div>

      {items.length === 0 ? (
        <EmptyState icon="local_taxi" title={t("rides.noRides")}>
          {t("rides.noRidesText")}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[820px] border-collapse text-start text-[15px]">
            <thead>
              <tr className="border-b border-line text-[13px] text-muted">
                <th scope="col" className={`${th} text-start`}>
                  {t("rides.reference")}
                </th>
                <th scope="col" className={`${th} text-start`}>
                  {t("rides.route")}
                </th>
                <th scope="col" className={`${th} text-start`}>
                  {t("rides.rider")}
                </th>
                <th scope="col" className={`${th} text-start`}>
                  {t("rides.driver")}
                </th>
                <th scope="col" className={`${th} text-end`}>
                  {t("rides.fare")}
                </th>
                <th scope="col" className={`${th} text-start`}>
                  {t("common.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-line-soft align-top last:border-b-0">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link href={`/dashboard/rides/${r.id}`} className="font-semibold">
                      {rideReference(r)}
                    </Link>
                    <span className="block text-[13px] text-muted">{formatDateTime(r.scheduledAt ?? r.createdAt, lang)}</span>
                    <span className="block text-[13px] text-muted">{r.vehicleTypeName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-col gap-0.5">
                      <span className="line-clamp-1">{r.pickup.address}</span>
                      <span className="line-clamp-1 text-[13px] text-muted">→ {r.dropoff.address}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.riderName}</td>
                  <td className="px-4 py-3">{r.driverName ?? <span className="text-muted">{t("rides.noDriver")}</span>}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">
                    {formatCents(r.status === "completed" && r.finalCents !== null ? r.finalCents : r.status === "cancelled" ? (r.cancellation?.feeCents ?? 0) : r.quotedCents, r.currency)}
                    <span className="block text-[13px] text-muted">
                      {t(r.paymentMethod === "cash" ? "rides.cash" : "rides.card")} · {t(r.paymentStatus === "paid" ? "rides.paid" : r.paymentStatus === "refunded" ? "rides.refunded" : "rides.unpaid")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RideStatusBadge status={r.status} t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 ? (
        <nav aria-label={t("orders.pages")} className="flex items-center justify-between gap-3">
          {page > 1 ? <Link href={link(page - 1)}>{t("rides.newer")}</Link> : <span />}
          <span className="text-sm text-muted">{t("common.page", { page, pages })}</span>
          {page < pages ? <Link href={link(page + 1)}>{t("rides.older")}</Link> : <span />}
        </nav>
      ) : null}

      <section aria-labelledby="h-online" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-online" className="m-0 text-lg font-bold">
            {t("rides.onlineNow")}
          </h2>
          <p className="m-0 text-[15px] text-ink-4">{t("rides.onlineNowIntro")}</p>
        </div>
        {online.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("rides.noneOnline")}</p>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr))]">
            {online.map((d) => {
              const ride = onRide.get(d.id);
              return (
                <li key={d.id} className="flex flex-col gap-1 rounded-xl border border-line p-3">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-bold">{d.name}</span>
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
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
