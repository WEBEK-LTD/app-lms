import type { Metadata } from "next";
import { deleteDriverAction, setDriverActiveAction } from "@/app/actions/rides";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn, EmptyState, formatDateTime, Notice, PageHeader, Section } from "@/components/ui";
import { ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterList, Sheet, SheetButton } from "@/components/page-kit-client";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { appPlan } from "@/lib/entitlements";
import { hostedSignInMethods } from "@/lib/hosted/sign-in-methods";
import { driverFormValues, shareText } from "@/lib/rides/forms";
import { DRIVER_ACTIVE, ratingOf } from "@/lib/rides/service";
import { driverOf, ridesSettingsOf } from "@/lib/rides/settings";
import { ConfirmButton } from "../chat/forms";
import { mapsLink } from "../shipments/parts";
import { isRides, NotRides, RidesPlanNotice } from "../rides/parts";
import { DriverForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("rides.drivers") };
}

/** 105.2 The company's drivers: who they are, their car, whether they're online, approved or suspended. */
export default async function DriversPage() {
  const { app, license } = await requireClient("orders");
  const { t, lang } = await dashboardText();
  if (!isRides(app)) return <NotRides title={t("rides.drivers")} t={t} />;
  const store = await getStore();
  const methods = hostedSignInMethods(app);
  const emailOnly = methods.length === 1 && methods[0] === "email";
  const [drivers, types, saved, active, plan] = await Promise.all([
    store.listCouriers(app.id),
    store.listVehicleTypes(app.id),
    store.getDeliverySettings(app.id),
    store.listRides({ appId: app.id, statuses: DRIVER_ACTIVE, order: "oldest", offset: 0, limit: 2000 }),
    appPlan(store, license, new Date()),
  ]);
  const usualShare = shareText(ridesSettingsOf(deliverySettingsOf(saved)).commissionBp) || "0";
  const typeName = (id: number | null) => types.find((v) => v.id === id)?.name ?? null;
  const onRide = new Set(active.items.map((r) => r.driverId));
  const typeChoices = types.map((v) => ({ id: v.id, name: v.name }));
  const documentsOf = (d: ReturnType<typeof driverOf>) => d.documents.map((doc) => ({ ...doc, url: `/dashboard/drivers/documents/${doc.assetId}` }));

  const has = drivers.length > 0;
  const online = drivers.filter((c) => c.active && c.onDuty).length;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the numbers, the form in a Sheet (in place for the first driver), then the list. */}
      <PageHeader
        title={t("rides.drivers")}
        description={t("rides.driversIntro")}
        actions={
          has ? (
            <SheetButton target="new-driver" icon="add">
              {t("rides.addDriver")}
            </SheetButton>
          ) : null
        }
      />
      <RidesPlanNotice app={app} plan={plan} t={t} />

      {has ? (
        <StatRow label={t("rides.drivers")}>
          <Stat icon="person" label={t("rides.drivers")} value={drivers.length} />
          <Stat icon="check_circle" tone="success" label={t("rides.online")} value={online} />
          <Stat icon="local_taxi" tone="accent" label={t("rides.onRide")} value={drivers.filter((c) => onRide.has(c.id)).length} href="/dashboard/rides" />
          <Stat icon="block" tone="warn" label={t("rides.suspended")} value={drivers.filter((c) => !c.active).length} />
        </StatRow>
      ) : null}

      {/* One place in the page either way, so the form that adds the first driver keeps its message. */}
      <Sheet id="new-driver" inline={!has} title={t("rides.addDriver")} description={t("rides.addDriverHint")}>
        <DriverForm id={null} values={driverFormValues(null)} emailOnly={emailOnly} types={typeChoices} usualShare={usualShare} photoUrl={null} documents={[]} />
      </Sheet>

      <Section titleId="h-drivers" title={t("rides.driverCount", { count: drivers.length })} flush>
        {!has ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="directions_car" title={t("rides.noDriversYet")} />
          </div>
        ) : (
          <FilterList
            allLabel={t("common.all")}
            searchLabel={t("rides.searchDrivers")}
            noMatch={t("rides.noDriverMatch")}
            filters={[
              { value: "online", label: t("rides.online") },
              { value: "offline", label: t("rides.offline") },
              { value: "suspended", label: t("rides.suspended") },
            ]}
            items={drivers.map((c, i) => {
              const d = driverOf(c);
              const rating = ratingOf(c);
              const car = [d.carColor, d.carModel, d.plate].filter(Boolean).join(" · ");
              return {
                id: c.id,
                text: [c.name, c.phone, c.email, d.plate, d.carModel, typeName(d.vehicleTypeId)].filter(Boolean).join(" "),
                group: !c.active ? "suspended" : c.onDuty ? "online" : "offline",
                node: (
                  <ItemRow
                    media={<Thumb src={d.photoAssetId ? assetUrl(d.photoAssetId) : null} icon="person" shape="round" tint={i} />}
                    title={c.name}
                    badges={typeName(d.vehicleTypeId) ? <Badge tone="neutral">{typeName(d.vehicleTypeId)}</Badge> : null}
                    meta={[c.phone ?? c.email, rating !== null ? t("rides.ratingLine", { rating: String(rating), count: d.ratingCount }) : null].filter(Boolean).join(" · ")}
                    extra={
                      <>
                        {car ? (
                          <span className="flex items-center gap-1">
                            <Icon name="directions_car" size={16} className="text-muted" />
                            {car}
                          </span>
                        ) : null}
                        {c.onDuty && c.lat !== null && c.lng !== null && c.locatedAt ? (
                          <a href={mapsLink(c.lat, c.lng)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold">
                            <Icon name="my_location" size={16} />
                            {t("rides.lastSeen", { time: formatDateTime(c.locatedAt, lang) })}
                          </a>
                        ) : null}
                      </>
                    }
                    aside={
                      c.active ? (
                        <Badge tone={c.onDuty ? "success" : "neutral"}>{onRide.has(c.id) ? t("rides.onRide") : t(c.onDuty ? "rides.online" : "rides.offline")}</Badge>
                      ) : (
                        <Badge tone="warn">{t("rides.suspended")}</Badge>
                      )
                    }
                    actions={
                      <>
                        <SheetButton target={`driver-${c.id}`} icon="edit" variant="secondary" className="h-9 px-3.5 text-sm">
                          {t("rides.edit")}
                        </SheetButton>
                        <form action={setDriverActiveAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="active" value={c.active ? "false" : "true"} />
                          <SubmitButton variant="secondary" className="h-9 px-3.5 text-sm">
                            {t(c.active ? "rides.suspend" : "rides.approve")}
                          </SubmitButton>
                        </form>
                        <form action={deleteDriverAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <ConfirmButton confirm={t("rides.deleteConfirm")} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                            {t("rides.delete")}
                          </ConfirmButton>
                        </form>
                        <Sheet id={`driver-${c.id}`} title={t("rides.edit")} description={c.phone ?? c.email ?? undefined}>
                          <DriverForm
                            id={c.id}
                            values={driverFormValues(c)}
                            emailOnly={emailOnly}
                            types={typeChoices}
                            usualShare={usualShare}
                            photoUrl={d.photoAssetId ? assetUrl(d.photoAssetId) : null}
                            documents={documentsOf(d)}
                          />
                        </Sheet>
                      </>
                    }
                  />
                ),
              };
            })}
          />
        )}
      </Section>

      <Notice tone="neutral" icon="help">
        <span className="flex flex-col gap-1">
          <span className="font-bold">{t("rides.howDrivers")}</span>
          <span>{t("rides.howDriversText")}</span>
        </span>
      </Notice>
    </div>
  );
}
