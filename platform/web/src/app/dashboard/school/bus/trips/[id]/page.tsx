import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui";
import { formatDate } from "@/i18n/format";
import { requireClient } from "@/lib/auth/session";
import { utcToLocal } from "@/lib/bookings/time";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { busStopJson, settleRun, tripStops } from "@/lib/school/bus";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { isSchool, NotSchool, PageHead, Panel } from "../../../parts";
import { MarkBadge } from "../../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("bus.trip") };
}

/** 113.10 A trip's history: when it started and ended, who drove it, the stops reached, and each student's times on and off (or absent). */
export default async function BusTripPage({ params }: PageProps<"/dashboard/school/bus/trips/[id]">) {
  const { app } = await requireClient("settings");
  const { t, lang } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("bus.trip")} t={t} />;
  const id = Number((await params).id);
  const store = await getStore();
  const found = Number.isSafeInteger(id) ? await store.getSchoolBusRun(app.id, id) : null;
  const route = found ? await store.getSchoolBusRoute(app.id, found.routeId) : null;
  if (!found || !route) notFound();
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  const run = await settleRun(store, app, found, schoolToday(settings, new Date()));
  const [stops, riders, marks, people] = await Promise.all([
    store.listSchoolBusStops(app.id, { routeId: route.id }),
    store.listSchoolBusRiders(app.id, { routeId: route.id, trip: run.trip }),
    store.listSchoolBusMarks(app.id, { runId: run.id }),
    store.listSchoolPeople(app.id),
  ]);
  const person = new Map(people.map((p) => [p.id, p]));
  const markOf = new Map(marks.map((m) => [m.studentId, m]));
  const clock = (d: Date | null) => (d ? utcToLocal(d, settings.timezone).time : "—");
  const ordered = tripStops(stops, run.trip);
  // Students marked on the trip who have since left its stops are still listed, under no stop.
  const unplaced = marks.filter((m) => !riders.some((r) => r.studentId === m.studentId));

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        back={{ href: `/dashboard/school/bus/${route.id}`, label: route.name }}
        title={`${route.name} · ${t(run.trip === "morning" ? "bus.morning" : "bus.afternoon")}`}
        intro={[
          formatDate(lang, new Date(`${run.date}T00:00:00Z`)),
          run.endedAt ? t("bus.fromTo", { from: clock(run.startedAt), to: clock(run.endedAt) }) : t("bus.since", { time: clock(run.startedAt) }),
          run.startedBy ? t("bus.driverIs", { name: person.get(run.startedBy)?.name ?? "—" }) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      {run.status === "running" ? (
        <p role="note" className="m-0 max-w-[860px] rounded-xl bg-success-bg px-4 py-3 text-[15px] leading-relaxed text-success">
          {t("bus.tripRunning")} <Link href="/dashboard/school/bus/live">{t("bus.liveMap")}</Link>
        </p>
      ) : null}
      <p className="m-0 text-[15px] font-semibold">
        {t("bus.boardCounts", { boarded: marks.filter((m) => m.status === "boarded").length, off: marks.filter((m) => m.status === "off").length, absent: marks.filter((m) => m.status === "absent").length, riders: riders.length })}
      </p>

      <Panel id="h-trip-stops" title={t("bus.stops")}>
        <ol className="m-0 flex list-none flex-col p-0" data-trip-stops>
          {ordered.map((stop, i) => {
            const json = busStopJson(stop, run.trip, run.passedStopIds);
            const here = riders.filter((r) => r.stopId === stop.id);
            return (
              <li key={stop.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${json.passed ? "bg-success text-white" : "bg-sand text-midnight"}`}>
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] font-bold">
                    {stop.name} <span className="font-normal text-muted">· {json.time}</span>
                  </span>
                  {json.passed ? <Badge tone="success">{t("bus.reached")}</Badge> : null}
                </div>
                {here.length ? (
                  <ul className="m-0 flex list-none flex-col gap-1.5 p-0 ps-11">
                    {here.map((r) => {
                      const mark = markOf.get(r.studentId);
                      return (
                        <li key={r.studentId} className="flex flex-wrap items-center gap-2 text-[15px]">
                          <span className="min-w-0 flex-1">{person.get(r.studentId)?.name ?? "—"}</span>
                          <span className="text-[13px] text-muted">{t("bus.onOffTimes", { on: clock(mark?.boardedAt ?? null), off: clock(mark?.offAt ?? null) })}</span>
                          <MarkBadge status={mark?.status ?? null} t={t} />
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>
        {unplaced.length ? (
          <ul className="m-0 flex list-none flex-col gap-1.5 border-t border-line-soft p-0 pt-3">
            {unplaced.map((m) => (
              <li key={m.studentId} className="flex flex-wrap items-center gap-2 text-[15px]">
                <span className="min-w-0 flex-1">{person.get(m.studentId)?.name ?? "—"}</span>
                <span className="text-[13px] text-muted">{t("bus.onOffTimes", { on: clock(m.boardedAt), off: clock(m.offAt) })}</span>
                <MarkBadge status={m.status} t={t} />
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>
    </div>
  );
}
