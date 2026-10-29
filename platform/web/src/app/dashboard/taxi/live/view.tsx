import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import type { Lang } from "@/i18n/config";
import type { DashT } from "@/i18n/dashboard";
import { formatNumber } from "@/i18n/format";
import { richText } from "@/i18n/rich";
import { utcToLocal } from "@/lib/bookings/time";
import { rideReference } from "@/lib/rides/service";
import { BOARD_EVERY_SECONDS, BOARD_FRESH_MINUTES, type Board, type BoardRide } from "@/lib/taxi/board";
import { PageHead, RideStatusBadge } from "../../rides/parts";
import { LiveMap, Refresher, type MapMarker } from "./map";

/** 105.9 The live map page's body, from the board and the company's tiles. */
export function LiveBoardView({
  board,
  tilesUrl,
  attribution,
  timezone,
  notice,
  t,
  lang,
}: {
  board: Board;
  tilesUrl: string | null;
  attribution: string | null;
  timezone: string;
  /** Live taxis not on the plan yet. */
  notice: ReactNode;
  t: DashT;
  lang: Lang;
}) {
  const clock = (iso: string) => utcToLocal(new Date(iso), timezone).time;

  const markers: MapMarker[] = [
    ...board.drivers.map(
      (d): MapMarker => ({
        id: `d${d.id}`,
        kind: d.state,
        lat: d.lat,
        lng: d.lng,
        label: d.rideId !== null ? t("taxi.driverOnRide", { name: d.name, ref: rideReference({ id: d.rideId }) }) : t("taxi.driverFree", { name: d.name }),
        href: d.rideId !== null ? `/dashboard/rides/${d.rideId}` : null,
      }),
    ),
    ...board.rides
      .filter((r): r is BoardRide & { lat: number; lng: number } => r.status === "searching" && r.lat !== null && r.lng !== null)
      .map(
        (r): MapMarker => ({
          id: `r${r.id}`,
          kind: "waiting",
          lat: r.lat,
          lng: r.lng,
          label: t("taxi.rideWaitingAt", { ref: rideReference(r), address: r.from }),
          href: `/dashboard/rides/${r.id}`,
        }),
      ),
  ];

  const counts = [
    { key: "free", label: t("taxi.countFree"), value: board.counts.free, color: "#1c9d55" },
    { key: "onRide", label: t("taxi.countOnRide"), value: board.counts.onRide, color: "#f2650f" },
    { key: "searching", label: t("taxi.countSearching"), value: board.counts.searching, color: "#e3a500" },
    { key: "today", label: t("taxi.countToday"), value: board.counts.today, color: null },
  ];
  const number = { format: (n: number) => formatNumber(lang, n) };

  return (
    <div className="flex flex-col gap-6">
      <Refresher seconds={BOARD_EVERY_SECONDS} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHead title={t("taxi.liveMap")} intro={t("taxi.liveMapIntro")} />
        <p className="m-0 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-bold text-success" title={t("taxi.liveUpdatingHint", { seconds: BOARD_EVERY_SECONDS })}>
          <span aria-hidden="true" className="size-2.5 rounded-full bg-success" />
          {t("taxi.liveUpdating")}
          <span className="sr-only">{t("taxi.liveUpdatingHint", { seconds: BOARD_EVERY_SECONDS })}</span>
        </p>
      </div>
      {notice}

      <ul className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fill,minmax(min(190px,100%),1fr))]" aria-label={t("taxi.liveMap")}>
        {counts.map((c) => (
          <li key={c.key} className="flex min-w-0 flex-col gap-1 rounded-2xl border border-line bg-white px-4 py-3.5" data-count={c.key}>
            <bdi className="text-[28px] leading-tight font-extrabold text-midnight" data-value>
              {number.format(c.value)}
            </bdi>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-4">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: c.color ?? "var(--color-faint)" }} />
              {c.label}
            </span>
          </li>
        ))}
      </ul>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-3">
          {tilesUrl ? null : (
            <p role="note" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
              {richText(t("taxi.mapNotSet"), { link: (chunk) => <Link href="/dashboard/taxi/settings">{chunk}</Link> })}
            </p>
          )}
          <LiveMap
            tilesUrl={tilesUrl}
            attribution={attribution}
            markers={markers}
            labels={{
              map: t("taxi.liveMap"),
              zoomIn: t("taxi.zoomIn"),
              zoomOut: t("taxi.zoomOut"),
              fitAll: t("taxi.fitAll"),
              legend: { free: t("taxi.legendFree"), on_ride: t("taxi.legendOnRide"), waiting: t("taxi.legendWaiting") },
            }}
          />
          {board.drivers.length === 0 ? <p className="m-0 text-sm text-muted">{t("taxi.noneOnMap", { minutes: BOARD_FRESH_MINUTES })}</p> : null}
        </div>

        <section aria-labelledby="h-rides-now" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 id="h-rides-now" className="m-0 text-lg font-bold">
              {t("taxi.ridesNow")}
            </h2>
            <span className="text-sm font-semibold text-muted">{number.format(board.rides.length)}</span>
          </div>
          {board.rides.length === 0 ? (
            <p className="m-0 text-[15px] text-muted">{t("taxi.ridesNowEmpty")}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col p-0" data-rides-now>
              {board.rides.map((r) => (
                <li key={r.id} className="border-t border-line-soft py-3 first:border-t-0 first:pt-0 last:pb-0">
                  <Link href={`/dashboard/rides/${r.id}`} className="flex items-start gap-3 text-inherit no-underline hover:[&_.name]:underline">
                    <span aria-hidden="true" className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: r.status === "searching" ? "#e3a500" : "#f2650f" }}>
                      <Icon name={r.status === "searching" ? "hourglass_top" : "local_taxi"} size={18} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="name truncate font-bold">{r.driverName ? t("taxi.rideWith", { rider: r.riderName, driver: r.driverName }) : r.riderName}</span>
                      <span className="truncate text-[13px] text-ink-4">{t("taxi.fromTo", { from: r.from, to: r.to })}</span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <RideStatusBadge status={r.status} t={t} />
                        <span className="text-[13px] text-muted">
                          {r.status === "searching"
                            ? t("taxi.waitingSince", { time: clock(r.since), count: r.offers })
                            : t("taxi.stageSince", { time: clock(r.since), km: number.format(Math.round(r.estimateKm * 10) / 10), minutes: number.format(r.estimateMinutes) })}
                        </span>
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
