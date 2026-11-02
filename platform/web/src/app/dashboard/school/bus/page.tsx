import type { Metadata } from "next";
import { saveBusRouteAction, saveBusSettingsAction } from "@/app/actions/school-bus";
import { Field } from "@/components/form";
import { Badge, EmptyState } from "@/components/ui";
import { ItemRow, LinkCards, PageGroup, Stat, StatRow, Thumb } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { BUS_LIMITS, busSettingsOf, isCrewPerson, tripStops } from "@/lib/school/bus";
import { routeFormValues } from "@/lib/school/bus-forms";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
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

  const has = routes.length > 0;
  const canAdd = routes.length < BUS_LIMITS.routes;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the numbers, the live map, the routes, then the settings. */}
      <PageHead
        title={t("bus.title")}
        intro={t("bus.intro")}
        actions={
          has && canAdd ? (
            <SheetButton target="new-route" icon="add">
              {t("bus.addRoute")}
            </SheetButton>
          ) : null
        }
      />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {crew.length === 0 ? <FirstNote text={t("bus.crewFirst")} href="/dashboard/school/people" /> : null}

      {has ? (
        <StatRow label={t("bus.routes")}>
          <Stat icon="route" tone="accent" label={t("bus.routes")} value={routes.length} />
          <Stat icon="pin_drop" label={t("bus.statStops")} value={stops.length} />
          <Stat icon="groups" label={t("bus.statRiders")} value={new Set(riders.map((r) => r.studentId)).size} />
          <Stat icon="directions_bus" tone="success" label={t("bus.statRunning")} value={runs.filter((r) => r.status === "running").length} href="/dashboard/school/bus/live" />
        </StatRow>
      ) : null}
      <LinkCards label={t("bus.title")} items={[{ href: "/dashboard/school/bus/live", icon: "map", label: t("bus.liveMap") }]} />

      {has ? (
        <Panel id="h-routes" title={t("bus.routes")} flush>
          <ul className="m-0 flex list-none flex-col p-0" data-bus-routes>
            {routes.map((route, i) => {
              const mine = stops.filter((s) => s.routeId === route.id);
              const onIt = (trip: "morning" | "afternoon") => riders.filter((r) => r.routeId === route.id && r.trip === trip).length;
              const running = runs.filter((r) => r.routeId === route.id && r.status === "running");
              return (
                <ItemRow
                  key={route.id}
                  href={`/dashboard/school/bus/${route.id}`}
                  media={<Thumb icon="directions_bus" shape="square" tint={i} />}
                  title={
                    <>
                      {route.name} · <bdi dir="ltr">{route.plate}</bdi>
                    </>
                  }
                  meta={[t("bus.stopCount", { count: mine.length }), t("bus.ridersLine", { morning: onIt("morning"), afternoon: onIt("afternoon"), seats: route.capacity })].join(" · ")}
                  extra={[route.driverId ? t("bus.driverIs", { name: name.get(route.driverId) ?? "—" }) : t("bus.noDriver"), route.supervisorId ? t("bus.supervisorIs", { name: name.get(route.supervisorId) ?? "—" }) : null].filter(Boolean).join(" · ")}
                  aside={
                    <>
                      {running.map((r) => (
                        <Badge key={r.id} tone="success">
                          {t(r.trip === "morning" ? "bus.morningRunning" : "bus.afternoonRunning")}
                        </Badge>
                      ))}
                      {route.active ? null : <Badge tone="neutral">{t("bus.off")}</Badge>}
                      {tripStops(mine, "morning").length === 0 && tripStops(mine, "afternoon").length === 0 ? <Badge tone="warn">{t("bus.noStopsYet")}</Badge> : null}
                    </>
                  }
                />
              );
            })}
          </ul>
        </Panel>
      ) : (
        <EmptyState icon="directions_bus" title={t("bus.noRoutes")} />
      )}

      {canAdd ? (
        // One place in the page either way, so the form that adds the first route keeps its message.
        <Sheet id="new-route" inline={!has} title={t("bus.addRoute")}>
          <SchoolForm action={saveBusRouteAction} submit={t("bus.add")} sheet>
            <RouteFields suffix="-new" values={routeFormValues(null)} crew={crewOptions} t={t} />
          </SchoolForm>
        </Sheet>
      ) : null}

      <PageGroup title={t("bus.groupSettings")}>
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
      </PageGroup>
    </div>
  );
}
