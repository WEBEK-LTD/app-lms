import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assignBusRidersAction, deleteBusRouteAction, deleteBusStopAction, moveBusStopAction, removeBusRiderAction, saveBusRouteAction, saveBusStopAction } from "@/app/actions/school-bus";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import { formatDate } from "@/i18n/format";
import { requireClient } from "@/lib/auth/session";
import { timeOf, utcToLocal } from "@/lib/bookings/time";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { SchoolBusTrip } from "@/lib/data/types";
import { BUS_LIMITS, isCrewPerson } from "@/lib/school/bus";
import { routeFormValues, stopFormValues } from "@/lib/school/bus-forms";
import { schoolSettingsOf } from "@/lib/school/settings";
import { platformSetting } from "@/lib/settings/platform";
import { ConfirmButton } from "../../../chat/forms";
import { AddServiceBox } from "../../../delivery/forms";
import { LiveMap, type MapMarker } from "../../../taxi/live/map";
import { Choice, SchoolForm } from "../../forms";
import { ClassTabs, isSchool, NotSchool, PageHead, Panel } from "../../parts";
import { RouteFields, StopFields } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("bus.title") };
}

/** 113.10 One route: its bus and crew, its stops in order on the map, the students of each stop (put on together), and its trips. */
export default async function BusRoutePage({ params, searchParams }: PageProps<"/dashboard/school/bus/[id]">) {
  const { app } = await requireClient("settings");
  const { t, lang } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("bus.title")} t={t} />;
  const id = Number((await params).id);
  const query = (await searchParams) as { class?: string };
  const store = await getStore();
  const route = Number.isSafeInteger(id) ? await store.getSchoolBusRoute(app.id, id) : null;
  if (!route) notFound();
  const [stops, riders, allRiders, people, classes, runs, saved, maps] = await Promise.all([
    store.listSchoolBusStops(app.id, { routeId: route.id }),
    store.listSchoolBusRiders(app.id, { routeId: route.id }),
    store.listSchoolBusRiders(app.id),
    store.listSchoolPeople(app.id),
    store.listSchoolClasses(app.id),
    store.listSchoolBusRuns(app.id, { routeId: route.id, limit: 30 }),
    store.getSchoolSettings(app.id),
    platformSetting(store, "maps"),
  ]);
  const settings = schoolSettingsOf(saved, app);
  const tilesUrl = maps?.value.tilesUrl ?? null;
  const person = new Map(people.map((p) => [p.id, p]));
  const crew = people.filter(isCrewPerson).map((p) => ({ value: String(p.id), label: p.name }));
  const className = new Map(classes.map((c) => [c.id, c.name]));
  const classId = query.class && classes.some((c) => String(c.id) === query.class) ? Number(query.class) : (classes[0]?.id ?? null);
  const students = people.filter((p) => p.role === "student" && p.active && (classId === null || p.classId === classId));
  const stopName = new Map(stops.map((s) => [s.id, s.name]));
  const elsewhere = (studentId: number, trip: SchoolBusTrip) => allRiders.find((r) => r.studentId === studentId && r.trip === trip && r.routeId !== route.id);
  const time = (minute: number | null) => (minute === null ? "—" : timeOf(minute));
  const markers: MapMarker[] = stops.map((s, i) => ({ id: `s${s.id}`, kind: "waiting", lat: s.lat, lng: s.lng, icon: "pin_drop", label: `${i + 1}. ${s.name}`, href: null }));
  const clock = (d: Date) => utcToLocal(d, settings.timezone).time;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/school/bus" className="inline-flex items-center gap-1 text-sm font-semibold no-underline">
        <Icon name="arrow_back" size={18} className="rtl:rotate-180" />
        {t("bus.title")}
      </Link>
      <PageHead title={`${route.name} · ${route.plate}`} intro={t("bus.routeIntro")} />

      <Panel id="h-route" title={t("bus.theBus")}>
        <SchoolForm action={saveBusRouteAction} submit={t("bus.save")}>
          <input type="hidden" name="id" value={route.id} />
          <RouteFields suffix="" values={routeFormValues(route)} crew={crew} t={t} />
        </SchoolForm>
        <form action={deleteBusRouteAction} className="flex justify-end">
          <input type="hidden" name="id" value={route.id} />
          <ConfirmButton confirm={t("bus.deleteRoute", { name: route.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
            {t("bus.deleteRouteButton")}
          </ConfirmButton>
        </form>
      </Panel>

      <Panel id="h-stops" title={t("bus.stops")} intro={t("bus.stopsIntro")}>
        {tilesUrl ? null : (
          <p role="note" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed" data-no-map>
            {t("bus.noMap")}
          </p>
        )}
        {stops.length > 0 ? (
          <LiveMap
            tilesUrl={tilesUrl}
            attribution={tilesUrl ? (maps?.value.attribution ?? null) : null}
            markers={markers}
            labels={{ map: t("bus.stopsMap"), zoomIn: t("taxi.zoomIn"), zoomOut: t("taxi.zoomOut"), fitAll: t("taxi.fitAll"), legend: { waiting: t("bus.legendStop") } }}
          />
        ) : (
          <p className="m-0 text-[15px] text-muted">{t("bus.noStops")}</p>
        )}
        <ol className="m-0 flex list-none flex-col p-0" data-bus-stops>
          {stops.map((stop, i) => (
            <li key={stop.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-3">
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-midnight text-sm font-bold text-white">
                  {i + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">{stop.name}</span>
                  <span className="text-[13px] text-muted">
                    {t("bus.stopTimes", { morning: time(stop.morningMinute), afternoon: time(stop.afternoonMinute) })} ·{" "}
                    {t("bus.ridersLine2", { morning: riders.filter((r) => r.stopId === stop.id && r.trip === "morning").length, afternoon: riders.filter((r) => r.stopId === stop.id && r.trip === "afternoon").length })}
                  </span>
                </span>
                <form action={moveBusStopAction}>
                  <input type="hidden" name="id" value={stop.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" disabled={i === 0} aria-label={t("bus.moveUp", { name: stop.name })} className={`${btn.secondary} h-9 px-2.5`}>
                    <Icon name="arrow_upward" size={18} />
                  </button>
                </form>
                <form action={moveBusStopAction}>
                  <input type="hidden" name="id" value={stop.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" disabled={i === stops.length - 1} aria-label={t("bus.moveDown", { name: stop.name })} className={`${btn.secondary} h-9 px-2.5`}>
                    <Icon name="arrow_downward" size={18} />
                  </button>
                </form>
                <form action={deleteBusStopAction}>
                  <input type="hidden" name="id" value={stop.id} />
                  <ConfirmButton confirm={t("bus.deleteStop", { name: stop.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                    {t("bus.delete")}
                  </ConfirmButton>
                </form>
              </div>
              {riders.some((r) => r.stopId === stop.id) ? (
                <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0 ps-11" aria-label={t("bus.studentsAt", { name: stop.name })}>
                  {riders
                    .filter((r) => r.stopId === stop.id)
                    .map((r) => (
                      <li key={`${r.studentId}-${r.trip}`} className="flex items-center gap-1 rounded-full border border-line bg-white py-0.5 ps-3 pe-1 text-[13px]">
                        {person.get(r.studentId)?.name ?? "—"} · {t(r.trip === "morning" ? "bus.morning" : "bus.afternoon")}
                        <form action={removeBusRiderAction}>
                          <input type="hidden" name="studentId" value={r.studentId} />
                          <input type="hidden" name="trip" value={r.trip} />
                          <button type="submit" aria-label={t("bus.takeOff", { name: person.get(r.studentId)?.name ?? "" })} className="grid size-6 place-items-center rounded-full text-muted hover:bg-danger-bg hover:text-danger">
                            <Icon name="close" size={14} />
                          </button>
                        </form>
                      </li>
                    ))}
                </ul>
              ) : null}
              <details className="rounded-xl border border-line p-4 ms-11">
                <summary className="cursor-pointer text-[15px] font-semibold">{t("bus.editStop", { name: stop.name })}</summary>
                <div className="pt-3">
                  <SchoolForm action={saveBusStopAction} submit={t("bus.save")}>
                    <input type="hidden" name="id" value={stop.id} />
                    <input type="hidden" name="routeId" value={route.id} />
                    <StopFields suffix={`-${stop.id}`} values={stopFormValues(stop)} t={t} />
                  </SchoolForm>
                </div>
              </details>
            </li>
          ))}
        </ol>
        {stops.length < BUS_LIMITS.stopsPerRoute ? (
          <AddServiceBox title={t("bus.addStop")} open={stops.length === 0}>
            <SchoolForm action={saveBusStopAction} submit={t("bus.add")} reset>
              <input type="hidden" name="routeId" value={route.id} />
              <StopFields suffix="-new" values={stopFormValues(null)} t={t} />
            </SchoolForm>
          </AddServiceBox>
        ) : null}
      </Panel>

      <Panel id="h-riders" title={t("bus.assignTitle")} intro={t("bus.assignIntro")}>
        {stops.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("bus.stopsFirst")}</p>
        ) : (
          <>
            {classes.length > 0 ? <ClassTabs classes={classes} current={classId} base={`/dashboard/school/bus/${route.id}`} label={t("bus.chooseClass")} /> : null}
            <SchoolForm action={assignBusRidersAction} submit={t("bus.assign")}>
              <input type="hidden" name="routeId" value={route.id} />
              {students.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("bus.noStudents")}</p> : null}
              <fieldset className="m-0 grid gap-x-4 gap-y-1.5 border-0 p-0 sm:grid-cols-2">
                <legend className="mb-2 text-sm font-semibold">{t("bus.students")}</legend>
                {students.map((s) => {
                  const here = (trip: SchoolBusTrip) => riders.find((r) => r.studentId === s.id && r.trip === trip);
                  const notes = (["morning", "afternoon"] as const)
                    .map((trip) => {
                      const mine = here(trip);
                      if (mine) return t(trip === "morning" ? "bus.onMorning" : "bus.onAfternoon", { stop: stopName.get(mine.stopId) ?? "" });
                      return elsewhere(s.id, trip) ? t(trip === "morning" ? "bus.otherRouteMorning" : "bus.otherRouteAfternoon") : null;
                    })
                    .filter(Boolean);
                  return (
                    <label key={s.id} className="flex items-start gap-2 text-[15px]">
                      <input type="checkbox" name={`student-${s.id}`} className="mt-1 size-4" />
                      <span className="flex flex-col">
                        <span>
                          {s.name}
                          {s.classId ? <span className="text-muted"> · {className.get(s.classId) ?? ""}</span> : null}
                        </span>
                        {notes.length ? <span className="text-[13px] text-muted">{notes.join(" · ")}</span> : null}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <Choice
                  id="f-assign-stop"
                  name="stopId"
                  label={t("bus.toStop")}
                  options={[...stops.map((s, i) => ({ value: String(s.id), label: `${i + 1}. ${s.name}` })), { value: "off", label: t("bus.offRoute") }]}
                  empty={t("bus.choose")}
                />
                <Choice
                  id="f-assign-trips"
                  name="trips"
                  label={t("bus.trips")}
                  options={[
                    { value: "both", label: t("bus.bothTrips") },
                    { value: "morning", label: t("bus.morning") },
                    { value: "afternoon", label: t("bus.afternoon") },
                  ]}
                  defaultValue="both"
                />
              </div>
            </SchoolForm>
          </>
        )}
      </Panel>

      <Panel id="h-trips" title={t("bus.history")} intro={t("bus.historyIntro")}>
        {runs.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("bus.noTrips")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0" data-bus-trips>
          {runs.map((run) => (
            <li key={run.id} className="border-t border-line-soft py-2.5 first:border-t-0 first:pt-0">
              <Link href={`/dashboard/school/bus/trips/${run.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] no-underline">
                <span className="font-semibold">
                  {formatDate(lang, new Date(`${run.date}T00:00:00Z`))} · {t(run.trip === "morning" ? "bus.morning" : "bus.afternoon")}
                </span>
                <span className="text-[13px] text-muted">
                  {run.endedAt ? t("bus.fromTo", { from: clock(run.startedAt), to: clock(run.endedAt) }) : t("bus.since", { time: clock(run.startedAt) })}
                  {run.startedBy ? ` · ${person.get(run.startedBy)?.name ?? ""}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
