import type { Metadata } from "next";
import { ItemRow } from "@/components/page-kit";
import { Icon } from "@/components/icon";
import { formatNumber } from "@/i18n/format";
import { requireClient } from "@/lib/auth/session";
import { utcToLocal } from "@/lib/bookings/time";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { BUS_BOARD_EVERY_SECONDS, busBoard } from "@/lib/school/bus";
import { schoolSettingsOf } from "@/lib/school/settings";
import { platformSetting } from "@/lib/settings/platform";
import { LiveMap, Refresher, type MapMarker } from "../../../taxi/live/map";
import { isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("bus.liveMap") };
}

export const dynamic = "force-dynamic";

/** 113.10 The buses running now on the platform's map (112.2's live map), with their stops, and each trip's students on and off. */
export default async function BusLivePage() {
  const { app, license } = await requireClient("settings");
  const { t, lang } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("bus.liveMap")} t={t} />;
  const store = await getStore();
  const now = new Date();
  const [saved, plan, maps] = await Promise.all([store.getSchoolSettings(app.id), appPlan(store, license, now), platformSetting(store, "maps")]);
  const settings = schoolSettingsOf(saved, app);
  const board = await busBoard(store, app, settings, now);
  const tilesUrl = maps?.value.tilesUrl ?? null;
  const clock = (d: Date) => utcToLocal(d, settings.timezone).time;
  const number = (n: number) => formatNumber(lang, n);
  const markers: MapMarker[] = [
    ...board.flatMap((b) =>
      b.stops
        .filter((s) => !b.run.passedStopIds.includes(s.id))
        .map((s): MapMarker => ({ id: `s${b.run.id}-${s.id}`, kind: "waiting", lat: s.lat, lng: s.lng, icon: "pin_drop", label: `${b.route.name} · ${s.name}`, href: `/dashboard/school/bus/${b.route.id}` })),
    ),
    ...board
      .filter((b): b is typeof b & { position: { lat: number; lng: number } } => b.position !== null)
      .map((b): MapMarker => ({ id: `b${b.run.id}`, kind: "on_ride", lat: b.position.lat, lng: b.position.lng, icon: "directions_bus", label: `${b.route.name} · ${b.route.plate}`, href: `/dashboard/school/bus/trips/${b.run.id}` })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <Refresher seconds={BUS_BOARD_EVERY_SECONDS} />
      <PageHead title={t("bus.liveMap")} intro={t("bus.liveIntro")} back={{ href: "/dashboard/school/bus", label: t("bus.title") }} actions={
        <p className="m-0 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-bold text-success" title={t("taxi.liveUpdatingHint", { seconds: BUS_BOARD_EVERY_SECONDS })}>
          <span aria-hidden="true" className="size-2.5 rounded-full bg-success" />
          {t("taxi.liveUpdating")}
          <span className="sr-only">{t("taxi.liveUpdatingHint", { seconds: BUS_BOARD_EVERY_SECONDS })}</span>
        </p>
        }
      />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-3">
          {tilesUrl ? null : (
            <p role="note" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed" data-no-map>
              {t("bus.liveNoMap")}
            </p>
          )}
          <LiveMap
            tilesUrl={tilesUrl}
            attribution={tilesUrl ? (maps?.value.attribution ?? null) : null}
            markers={markers}
            labels={{ map: t("bus.liveMap"), zoomIn: t("taxi.zoomIn"), zoomOut: t("taxi.zoomOut"), fitAll: t("taxi.fitAll"), legend: { on_ride: t("bus.legendBus"), waiting: t("bus.legendStop") } }}
          />
          {board.length === 0 ? <p className="m-0 text-sm text-muted">{t("bus.noneRunning")}</p> : null}
        </div>

        {/* The page kit: the buses on a trip as rows beside the map, each opening its trip. */}
        <Panel id="h-running" title={t("bus.runningNow")} actions={<span className="rounded-full bg-sand px-2.5 py-1 text-xs font-bold text-ink-3 tabular-nums">{number(board.length)}</span>} flush>
          {board.length === 0 ? <p className="m-0 px-5 py-4 text-[15px] text-muted sm:px-6">{t("bus.noneRunningShort")}</p> : null}
          <ul className="m-0 flex list-none flex-col p-0" data-bus-running>
            {board.map((b) => (
              <ItemRow
                key={b.run.id}
                href={`/dashboard/school/bus/trips/${b.run.id}`}
                media={
                  <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: b.position ? "#f2650f" : "#8a8f98" }}>
                    <Icon name="directions_bus" size={20} />
                  </span>
                }
                title={`${b.route.name} · ${t(b.run.trip === "morning" ? "bus.morning" : "bus.afternoon")}`}
                meta={t("bus.boardCounts", { boarded: b.boarded, off: b.off, absent: b.absent, riders: b.riders })}
                extra={[t("bus.since", { time: clock(b.run.startedAt) }), b.driverName, b.position ? null : t("bus.noPosition")].filter(Boolean).join(" · ")}
              />
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
