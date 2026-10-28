import type { Metadata } from "next";
import { deleteVehicleTypeAction, moveVehicleTypeAction } from "@/app/actions/rides";
import { Icon } from "@/components/icon";
import { Badge, btn } from "@/components/ui";
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
import { AddServiceBox } from "../delivery/forms";
import { isRides, NotRides, PageHead, RidesPlanNotice } from "../rides/parts";
import { VehicleTypeForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("rides.vehicleTypes") };
}

/** 105.2 What riders choose from, each with its fares, in the company's order. */
export default async function VehicleTypesPage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isRides(app)) return <NotRides title={t("rides.vehicleTypes")} t={t} />;
  const store = await getStore();
  const [types, saved, plan] = await Promise.all([store.listVehicleTypes(app.id), store.getDeliverySettings(app.id), appPlan(store, license, new Date())]);
  const currency = deliverySettingsOf(saved).currency;
  const money = (cents: number) => formatCents(cents, currency);
  const offered = new Set(offeredTypes(types).map((v) => v.id));

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("rides.vehicleTypes")} intro={t("rides.vehicleTypesIntro")} />
      <RidesPlanNotice plan={plan} t={t} />

      <section aria-labelledby="h-types" className="flex max-w-[860px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-types" className="m-0 text-lg font-bold">
          {t("rides.vehicleTypes")}
        </h2>
        {types.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("rides.noVehicleTypes")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {types.map((type, i) => (
            <li key={type.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand text-muted">
                  <span aria-hidden="true" className="material-symbols-rounded text-[22px]">
                    {type.icon}
                  </span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">{type.name}</span>
                  <span className="text-[13px] text-muted">
                    {t("rides.fareLine", { base: money(type.baseCents), perKm: money(type.perKmCents), perMinute: money(type.perMinuteCents), min: money(type.minCents) })}
                  </span>
                </span>
                {offered.has(type.id) ? null : <Badge tone="neutral">{t("rides.hidden")}</Badge>}
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
                <form action={deleteVehicleTypeAction}>
                  <input type="hidden" name="id" value={type.id} />
                  <ConfirmButton confirm={t("rides.deleteType", { name: type.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                    {t("rides.delete")}
                  </ConfirmButton>
                </form>
              </div>
              <details className="rounded-xl border border-line p-4">
                <summary className="cursor-pointer text-[15px] font-semibold">{t("rides.editType", { name: type.name })}</summary>
                <div className="pt-3">
                  <VehicleTypeForm id={type.id} values={vehicleTypeFormValues(type)} currency={currency} iconNames={VEHICLE_ICONS} imageUrl={type.imageAssetId ? assetUrl(type.imageAssetId) : null} />
                </div>
              </details>
            </li>
          ))}
        </ul>
        <AddServiceBox title={t("rides.addVehicleType")} open={types.length === 0}>
          <VehicleTypeForm id={null} values={vehicleTypeFormValues(null)} currency={currency} iconNames={VEHICLE_ICONS} imageUrl={null} />
        </AddServiceBox>
      </section>
    </div>
  );
}
