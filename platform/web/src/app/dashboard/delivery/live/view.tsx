import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import type { Lang } from "@/i18n/config";
import type { DashT } from "@/i18n/dashboard";
import { formatNumber } from "@/i18n/format";
import { utcToLocal } from "@/lib/bookings/time";
import { DELIVERY_BOARD_EVERY_SECONDS, type BoardJob, type DeliveryBoard } from "@/lib/delivery/board";
import { Notice, PageHeader } from "@/components/ui";
import { Stat, StatRow } from "@/components/page-kit";
import { LiveBadge } from "@/components/page-kit-b";
import { ShipmentStatusBadge } from "../../shipments/parts";
import { LiveMap, Refresher, type MapMarker } from "../../taxi/live/map";

/** 112.2 The delivery live map page's body: the counts, the map and the jobs now (105.9's taxi page, for couriers). */
export function DeliveryBoardView({
  board,
  tilesUrl,
  attribution,
  timezone,
  live,
  notice,
  t,
  lang,
}: {
  board: DeliveryBoard;
  tilesUrl: string | null;
  attribution: string | null;
  timezone: string;
  /** The company has live tracking: couriers send their position. */
  live: boolean;
  notice: ReactNode;
  t: DashT;
  lang: Lang;
}) {
  const clock = (iso: string) => utcToLocal(new Date(iso), timezone).time;
  const refOf = new Map(board.jobs.map((j) => [j.id, j.reference]));
  const markers: MapMarker[] = [
    ...board.couriers.map(
      (c): MapMarker => ({
        id: `c${c.id}`,
        kind: c.jobId !== null ? "on_ride" : "free",
        lat: c.lat,
        lng: c.lng,
        icon: "two_wheeler",
        label: c.jobId !== null ? t("delivery.courierWith", { name: c.name, ref: refOf.get(c.jobId) ?? "" }) : c.name,
        href: c.jobId !== null ? `/dashboard/shipments/${c.jobId}` : null,
      }),
    ),
    ...board.jobs
      .filter((j): j is BoardJob & { lat: number; lng: number } => j.status === "pending" && j.lat !== null && j.lng !== null)
      .map(
        (j): MapMarker => ({
          id: `j${j.id}`,
          kind: "waiting",
          lat: j.lat,
          lng: j.lng,
          icon: "package_2",
          label: t("delivery.jobWaitingAt", { ref: j.reference, address: j.from }),
          href: `/dashboard/shipments/${j.id}`,
        }),
      ),
  ];
  const counts = [
    { key: "onDuty", label: t("delivery.countOnDuty"), value: board.counts.onDuty, icon: "two_wheeler", tone: "success" },
    { key: "onTheWay", label: t("delivery.countOnTheWay"), value: board.counts.onTheWay, icon: "local_shipping", tone: "accent" },
    { key: "waiting", label: t("delivery.countWaiting"), value: board.counts.waiting, icon: "hourglass_top", tone: "warn" },
    { key: "today", label: t("delivery.countToday"), value: board.counts.today, icon: "task_alt", tone: "neutral" },
  ] as const;
  const number = (n: number) => formatNumber(lang, n);

  return (
    <div className="flex flex-col gap-6">
      <Refresher seconds={DELIVERY_BOARD_EVERY_SECONDS} />
      {/* The page kit: the header with the live badge, the numbers, then the map beside the jobs now. */}
      <PageHeader
        title={t("delivery.liveMap")}
        description={t("delivery.liveMapIntro")}
        actions={<LiveBadge label={t("taxi.liveUpdating")} hint={t("taxi.liveUpdatingHint", { seconds: DELIVERY_BOARD_EVERY_SECONDS })} />}
      />
      {notice}

      <StatRow label={t("delivery.liveMap")}>
        {counts.map((c) => (
          <div key={c.key} className="flex min-w-0 flex-col" data-count={c.key}>
            <Stat icon={c.icon} tone={c.tone} label={c.label} value={<bdi data-value>{number(c.value)}</bdi>} />
          </div>
        ))}
      </StatRow>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-3">
          {tilesUrl ? null : (
            <div data-no-map>
              <Notice tone="warn" icon="map">
                {t("delivery.liveNoMap")}
              </Notice>
            </div>
          )}
          {live ? null : (
            <Notice tone="neutral" icon="info">
              {t("delivery.liveStagesOnly")}
            </Notice>
          )}
          <LiveMap
            tilesUrl={tilesUrl}
            attribution={attribution}
            markers={markers}
            labels={{
              map: t("delivery.liveMap"),
              zoomIn: t("taxi.zoomIn"),
              zoomOut: t("taxi.zoomOut"),
              fitAll: t("taxi.fitAll"),
              legend: { free: t("delivery.legendCourier"), on_ride: t("delivery.legendWithParcel"), waiting: t("delivery.legendWaiting") },
            }}
          />
          {board.couriers.length === 0 ? <p className="m-0 text-sm text-muted">{t("delivery.noneOnMap")}</p> : null}
        </div>

        <section aria-labelledby="h-jobs-now" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 id="h-jobs-now" className="m-0 text-lg font-bold">
              {t("delivery.jobsNowTitle")}
            </h2>
            <span className="text-sm font-semibold text-muted">{number(board.jobs.length)}</span>
          </div>
          {board.jobs.length === 0 ? (
            <p className="m-0 text-[15px] text-muted">{t("delivery.jobsNowEmpty")}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col p-0" data-jobs-now>
              {board.jobs.map((j) => (
                <li key={j.id} className="border-t border-line-soft py-3 first:border-t-0 first:pt-0 last:pb-0">
                  <Link href={`/dashboard/shipments/${j.id}`} className="flex items-start gap-3 text-inherit no-underline hover:[&_.name]:underline">
                    <span aria-hidden="true" className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: j.status === "pending" ? "#e3a500" : "#f2650f" }}>
                      <Icon name={j.status === "pending" ? "package_2" : "two_wheeler"} size={18} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="name truncate font-bold">{j.courierName ? t("delivery.jobWith", { ref: j.reference, courier: j.courierName }) : j.reference}</span>
                      <span className="truncate text-[13px] text-ink-4">{t("taxi.fromTo", { from: j.from, to: j.to })}</span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <ShipmentStatusBadge status={j.status} t={t} />
                        <span className="text-[13px] text-muted">{t("delivery.since", { time: clock(j.since) })}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
