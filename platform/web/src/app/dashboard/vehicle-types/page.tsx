import type { Metadata } from "next";
import { deleteVehicleTypeAction, moveVehicleTypeAction } from "@/app/actions/rides";
import { Icon } from "@/components/icon";
import { Badge, btn, EmptyState, PageHeader, Section } from "@/components/ui";
import { ItemList, ItemRow, Thumb } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { appPlan } from "@/lib/entitlements";
import { VEHICLE_ICONS, vehicleTypeFormValues } from "@/lib/rides/forms";
import { offeredTypes } from "@/lib/rides/settings";
import { ConfirmButton } from "../chat/forms";
import { isRides, NotRides, RidesPlanNotice } from "../rides/parts";
import { VehicleTypeForm } from "./forms";
import { SampleBadge, SampleEntries, type SampleQuery } from "@/components/samples";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("rides.vehicleTypes") };
}

/** 105.2 What riders choose from, each with its fares, in the company's order. */
export default async function VehicleTypesPage({ searchParams }: { searchParams: Promise<SampleQuery> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isRides(app)) return <NotRides title={t("rides.vehicleTypes")} t={t} />;
  const store = await getStore();
  const [types, saved, plan] = await Promise.all([store.listVehicleTypes(app.id), store.getDeliverySettings(app.id), appPlan(store, license, new Date())]);
  const currency = deliverySettingsOf(saved).currency;
  const money = (cents: number) => formatCents(cents, currency);
  const offered = new Set(offeredTypes(types).map((v) => v.id));

  const has = types.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the types as rows in the riders' order (each edited in a Sheet), the form in a Sheet (in place for the first type). */}
      <PageHeader
        title={t("rides.vehicleTypes")}
        description={t("rides.vehicleTypesIntro")}
        actions={
          has ? (
            <SheetButton target="new-type" icon="add">
              {t("rides.addVehicleType")}
            </SheetButton>
          ) : null
        }
      />
      <RidesPlanNotice app={app} plan={plan} t={t} />
      {/* 110.2 */}
      <SampleEntries app={app} list="vehicle_types" query={await searchParams} />

      <Section titleId="h-types" title={t("rides.vehicleTypes")} actions={<Badge tone="neutral">{t("rides.typesOffered", { count: offered.size })}</Badge>} flush>
        {!has ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="category" title={t("rides.noVehicleTypes")} />
          </div>
        ) : (
          <ItemList>
            {types.map((type, i) => (
              <ItemRow
                key={type.id}
                media={
                  type.imageAssetId ? (
                    <Thumb src={assetUrl(type.imageAssetId)} icon="directions_car" shape="square" />
                  ) : (
                    <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-3 ${["bg-tile-1", "bg-tile-2", "bg-tile-3", "bg-tile-4", "bg-tile-5"][i % 5]}`}>
                      <span className="material-symbols-rounded text-[22px]">{type.icon}</span>
                    </span>
                  )
                }
                title={type.name}
                badges={
                  <>
                    <SampleBadge sample={type.sample} />
                    {offered.has(type.id) ? null : <Badge tone="neutral">{t("rides.hidden")}</Badge>}
                  </>
                }
                meta={t("rides.fareLine", { base: money(type.baseCents), perKm: money(type.perKmCents), perMinute: money(type.perMinuteCents), min: money(type.minCents) })}
                actions={
                  <>
                    <form action={moveVehicleTypeAction}>
                      <input type="hidden" name="id" value={type.id} />
                      <input type="hidden" name="step" value="up" />
                      <button type="submit" disabled={i === 0} aria-label={t("rides.up")} className={`${btn.ghost} h-9 px-2`}>
                        <Icon name="arrow_upward" size={18} />
                      </button>
                    </form>
                    <form action={moveVehicleTypeAction}>
                      <input type="hidden" name="id" value={type.id} />
                      <input type="hidden" name="step" value="down" />
                      <button type="submit" disabled={i === types.length - 1} aria-label={t("rides.down")} className={`${btn.ghost} h-9 px-2`}>
                        <Icon name="arrow_downward" size={18} />
                      </button>
                    </form>
                    <SheetButton target={`type-${type.id}`} icon="edit" variant="secondary" className="h-9 px-3.5 text-sm">
                      {t("rides.edit")}
                    </SheetButton>
                    <form action={deleteVehicleTypeAction}>
                      <input type="hidden" name="id" value={type.id} />
                      <ConfirmButton confirm={t("rides.deleteType", { name: type.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                        {t("rides.delete")}
                      </ConfirmButton>
                    </form>
                    <Sheet id={`type-${type.id}`} title={t("rides.editType", { name: type.name })}>
                      <VehicleTypeForm id={type.id} values={vehicleTypeFormValues(type)} currency={currency} iconNames={VEHICLE_ICONS} imageUrl={type.imageAssetId ? assetUrl(type.imageAssetId) : null} />
                    </Sheet>
                  </>
                }
              />
            ))}
          </ItemList>
        )}
      </Section>

      <Sheet id="new-type" inline={!has} title={t("rides.addVehicleType")} description={t("rides.addVehicleTypeHint")}>
        <VehicleTypeForm id={null} values={vehicleTypeFormValues(null)} currency={currency} iconNames={VEHICLE_ICONS} imageUrl={null} />
      </Sheet>
    </div>
  );
}
