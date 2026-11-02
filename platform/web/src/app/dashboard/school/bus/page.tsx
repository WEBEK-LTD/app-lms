import type { Metadata } from "next";
import Link from "next/link";
import { saveBusRouteAction, saveBusSettingsAction } from "@/app/actions/school-bus";
import { Field } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { BUS_LIMITS, busSettingsOf, isCrewPerson, tripStops } from "@/lib/school/bus";
import { routeFormValues } from "@/lib/school/bus-forms";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { AddServiceBox } from "../../delivery/forms";
import { Choice, SchoolForm } from "../forms";
import { FirstNote, isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";
import { RouteFields } from "./parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("bus.title") };
}

/** 113.10 The school's buses: each route with its bus, its crew and its students; a new route; when families are told the bus is near. */
export default async function SchoolBusPage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("bus.title")} t={t} />;
  const store = await getStore();
  const now = new Date();
  const [routes, stops, riders, people, saved, plan] = await Promise.all([
    store.listSchoolBusRoutes(app.id),
    store.listSchoolBusStops(app.id),
    store.listSchoolBusRiders(app.id),
    store.listSchoolPeople(app.id),
    store.getSchoolSettings(app.id),
    appPlan(store, license, now),
  ]);
  const settings = schoolSettingsOf(saved, app);
  const near = busSettingsOf(settings);
  const today = schoolToday(settings, now);
  const runs = await store.listSchoolBusRuns(app.id, { date: today });
  const crew = people.filter(isCrewPerson);
  const name = new Map(people.map((p) => [p.id, p.name]));
  const crewOptions = crew.map((p) => ({ value: String(p.id), label: p.name }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHead title={t("bus.title")} intro={t("bus.intro")} />
        <Link href="/dashboard/school/bus/live" className={`${btn.secondary} h-10 gap-1.5 px-4 text-sm`}>
          <Icon name="map" size={18} />
          {t("bus.liveMap")}
        </Link>
      </div>
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {crew.length === 0 ? <FirstNote text={t("bus.crewFirst")} href="/dashboard/school/people" /> : null}

      <Panel id="h-routes" title={t("bus.routes")}>
        {routes.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("bus.noRoutes")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0" data-bus-routes>
          {routes.map((route) => {
            const mine = stops.filter((s) => s.routeId === route.id);
            const onIt = (trip: "morning" | "afternoon") => riders.filter((r) => r.routeId === route.id && r.trip === trip).length;
            const running = runs.filter((r) => r.routeId === route.id && r.status === "running");
            return (
              <li key={route.id} className="border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                <Link href={`/dashboard/school/bus/${route.id}`} className="flex flex-wrap items-center gap-3 text-inherit no-underline hover:[&_.name]:underline">
                  <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-sand text-midnight">
                    <Icon name="directions_bus" size={20} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="name text-[15px] font-bold">
                      {route.name} · <bdi dir="ltr">{route.plate}</bdi>
                    </span>
                    <span className="text-[13px] text-muted">
                      {[
                        t("bus.stopCount", { count: mine.length }),
                        t("bus.ridersLine", { morning: onIt("morning"), afternoon: onIt("afternoon"), seats: route.capacity }),
                        route.driverId ? t("bus.driverIs", { name: name.get(route.driverId) ?? "—" }) : t("bus.noDriver"),
                        route.supervisorId ? t("bus.supervisorIs", { name: name.get(route.supervisorId) ?? "—" }) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {running.map((r) => (
                    <Badge key={r.id} tone="success">
                      {t(r.trip === "morning" ? "bus.morningRunning" : "bus.afternoonRunning")}
                    </Badge>
                  ))}
                  {route.active ? null : <Badge tone="neutral">{t("bus.off")}</Badge>}
                  {tripStops(mine, "morning").length === 0 && tripStops(mine, "afternoon").length === 0 ? <Badge tone="warn">{t("bus.noStopsYet")}</Badge> : null}
                </Link>
              </li>
            );
          })}
        </ul>
        {routes.length < BUS_LIMITS.routes ? (
          <AddServiceBox title={t("bus.addRoute")} open={routes.length === 0}>
            <SchoolForm action={saveBusRouteAction} submit={t("bus.add")}>
              <RouteFields suffix="-new" values={routeFormValues(null)} crew={crewOptions} t={t} />
            </SchoolForm>
          </AddServiceBox>
        ) : null}
      </Panel>

      <Panel id="h-near" title={t("bus.nearTitle")} intro={t("bus.nearIntro")}>
        <SchoolForm action={saveBusSettingsAction} submit={t("bus.save")}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Choice
              id="f-near-by"
              name="nearBy"
              label={t("bus.nearBy")}
              options={[
                { value: "minutes", label: t("bus.nearByMinutes") },
                { value: "distance", label: t("bus.nearByDistance") },
              ]}
              defaultValue={near.nearBy}
            />
            <Field id="f-near-minutes" label={t("bus.nearMinutes")} name="nearMinutes" type="number" min={1} max={BUS_LIMITS.maxNearMinutes} defaultValue={String(near.nearMinutes)} dir="ltr" />
            <Field id="f-near-meters" label={t("bus.nearMeters")} name="nearMeters" type="number" min={100} max={BUS_LIMITS.maxNearMeters} step={50} defaultValue={String(near.nearMeters)} dir="ltr" />
          </div>
        </SchoolForm>
      </Panel>
    </div>
  );
}
