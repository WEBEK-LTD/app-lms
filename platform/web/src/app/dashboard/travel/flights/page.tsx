export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { deleteTravelFlightAction } from "@/app/actions/travel";
import { ItemList, ItemRow } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { SampleBadge, SampleEntries, type SampleQuery } from "@/components/samples";
import { Badge, btn, EmptyState, PageHeader, Section } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { flightFormValues } from "@/lib/travel/forms";
import { today } from "@/lib/travel/pricing";
import { travelSettingsOf } from "@/lib/travel/settings";
import { ConfirmButton } from "../../chat/forms";
import { FlightForm, FlightStatusForm } from "../forms";
import { isTravel, NotTravel, PartOff, TravelPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("travel.flights") };
}

const PER_PAGE = 50;

/** 126 The company's flights with fixed seats, each date one flight: its fares, seats sold and status. */
export default async function TravelFlightsPage({ searchParams }: { searchParams: Promise<SampleQuery & { when?: string; page?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isTravel(app)) return <NotTravel title={t("travel.flights")} t={t} />;
  const query = await searchParams;
  const store = await getStore();
  const now = new Date();
  const [flights, saved, plan] = await Promise.all([store.listTravelFlights(app.id), store.getTravelSettings(app.id), appPlan(store, license, now)]);
  const settings = travelSettingsOf(saved);
  const past = query.when === "past";
  const day = today(now);
  const shownAll = flights.filter((f) => (past ? f.departs.slice(0, 10) < day : f.departs.slice(0, 10) >= day));
  if (past) shownAll.reverse();
  const page = Math.max(1, Number(query.page) || 1);
  const shown = shownAll.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const holds = shown.length ? await store.listTravelHolds(app.id, { flightIds: shown.map((f) => f.id) }, now) : [];
  const soldOn = (id: number) => holds.reduce((sum, b) => sum + (b.flight && (b.flight.outbound.flightId === id || b.flight.inbound?.flightId === id) ? b.flight.travellers : 0), 0);
  const tab = (when: string, label: string) => (
    <Link href={`/dashboard/travel/flights${when === "past" ? "?when=past" : ""}`} aria-current={past === (when === "past") ? "page" : undefined} className={`${btn.secondary} h-9 px-3.5 text-sm aria-[current=page]:border-midnight`}>
      {label}
    </Link>
  );
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("travel.flights")}
        description={t("travel.flightsIntro")}
        actions={
          flights.length ? (
            <SheetButton target="new-flight" icon="add">
              {t("travel.addFlight")}
            </SheetButton>
          ) : null
        }
      />
      <TravelPlanNotice app={app} plan={plan} t={t} />
      {settings.flights ? null : <PartOff text={t("travel.flightsOff")} />}
      <SampleEntries app={app} list="flights" query={query} />
      <div className="flex gap-2">
        {tab("upcoming", t("travel.upcoming"))}
        {tab("past", t("travel.past"))}
      </div>
      <Section titleId="h-flights" title={t("travel.flights")} flush>
        {shown.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="flight" title={t("travel.noFlights")} />
          </div>
        ) : (
          <ItemList>
            {shown.map((f) => {
              const seats = f.fares.reduce((sum, x) => sum + x.seats, 0);
              const from = Math.min(...f.fares.map((x) => x.cents));
              return (
                <ItemRow
                  key={f.id}
                  title={`${f.number} · ${f.from.code} → ${f.to.code}`}
                  badges={
                    <>
                      <SampleBadge sample={f.sample} />
                      <Badge tone={f.status === "cancelled" ? "danger" : f.status === "delayed" ? "warn" : "neutral"}>{t(`travel.fs_${f.status}` as DashKey)}</Badge>
                      {f.active ? null : <Badge tone="neutral">{t("travel.hidden")}</Badge>}
                    </>
                  }
                  meta={`${f.departs.replace("T", " ")} → ${f.arrives.slice(11)} · ${f.carrier.name}${Number.isFinite(from) ? ` · ${formatCents(from, settings.currency)}` : ""}`}
                  extra={t("travel.sold", { sold: soldOn(f.id), seats })}
                  actions={
                    <>
                      <SheetButton target={`status-${f.id}`} icon="flight_takeoff" variant="secondary" className="h-9 px-3.5 text-sm">
                        {t("travel.status")}
                      </SheetButton>
                      <SheetButton target={`flight-${f.id}`} icon="edit" variant="secondary" className="h-9 px-3.5 text-sm">
                        {t("travel.edit")}
                      </SheetButton>
                      <form action={deleteTravelFlightAction}>
                        <input type="hidden" name="id" value={f.id} />
                        <ConfirmButton confirm={t("travel.deleteFlight", { number: f.number, date: f.departs.slice(0, 10) })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                          {t("travel.delete")}
                        </ConfirmButton>
                      </form>
                      <Sheet id={`status-${f.id}`} title={t("travel.updateStatus")}>
                        <FlightStatusForm
                          id={f.id}
                          values={{ status: f.status, gate: f.gate ?? "", boardsAt: f.boardsAt ?? "", delayedDeparts: f.delayedDeparts ?? "", statusNote: f.statusNote ?? "", checkInOpen: f.checkInOpen ? "on" : "" }}
                        />
                      </Sheet>
                      <Sheet id={`flight-${f.id}`} title={t("travel.editFlight", { number: f.number })}>
                        <FlightForm id={f.id} values={flightFormValues(f)} currency={settings.currency} />
                      </Sheet>
                    </>
                  }
                />
              );
            })}
          </ItemList>
        )}
      </Section>
      <div className="flex justify-between">
        {page > 1 ? (
          <Link href={`/dashboard/travel/flights?${new URLSearchParams({ ...(past ? { when: "past" } : {}), page: String(page - 1) })}`} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
            {t("travel.newer")}
          </Link>
        ) : (
          <span />
        )}
        {page * PER_PAGE < shownAll.length ? (
          <Link href={`/dashboard/travel/flights?${new URLSearchParams({ ...(past ? { when: "past" } : {}), page: String(page + 1) })}`} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
            {t("travel.older")}
          </Link>
        ) : null}
      </div>
      <Sheet id="new-flight" inline={!flights.length} title={t("travel.addFlight")} description={t("travel.addFlightHint")}>
        <FlightForm id={null} values={flightFormValues(null)} currency={settings.currency} />
      </Sheet>
    </div>
  );
}
