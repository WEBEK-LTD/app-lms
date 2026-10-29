import type { Metadata } from "next";
import { deleteDriverAction, setDriverActiveAction } from "@/app/actions/rides";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn, formatDateTime } from "@/components/ui";
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
import { AddServiceBox } from "../delivery/forms";
import { mapsLink } from "../shipments/parts";
import { isRides, NotRides, PageHead, RidesPlanNotice } from "../rides/parts";
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

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("rides.drivers")} intro={t("rides.driversIntro")} />
      <RidesPlanNotice app={app} plan={plan} t={t} />

      <section aria-labelledby="h-add" className="flex max-w-[860px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <AddServiceBox title={t("rides.addDriver")} open={drivers.length === 0}>
          <DriverForm id={null} values={driverFormValues(null)} emailOnly={emailOnly} types={typeChoices} usualShare={usualShare} photoUrl={null} documents={[]} />
        </AddServiceBox>
        <h2 id="h-add" className="sr-only">
          {t("rides.addDriver")}
        </h2>
      </section>

      <section aria-labelledby="h-drivers" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-drivers" className="m-0 text-lg font-bold">
          {t("rides.driverCount", { count: drivers.length })}
        </h2>
        {drivers.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("rides.noDriversYet")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {drivers.map((c) => {
              const d = driverOf(c);
              const rating = ratingOf(c);
              const car = [d.carColor, d.carModel, d.plate].filter(Boolean).join(" · ");
              return (
                <li key={c.id} className="flex flex-col gap-3 border-t border-line-soft py-4 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-3">
                    {d.photoAssetId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={assetUrl(d.photoAssetId)} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand text-muted">
                        <Icon name="person" size={22} />
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-bold">{c.name}</span>
                      <span className="text-[13px] text-muted" dir="auto">
                        {[c.phone ?? c.email, typeName(d.vehicleTypeId), car, rating !== null ? t("rides.ratingLine", { rating: String(rating), count: d.ratingCount }) : null].filter(Boolean).join(" · ")}
                      </span>
                      {c.onDuty && c.lat !== null && c.lng !== null && c.locatedAt ? (
                        <a href={mapsLink(c.lat, c.lng)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold">
                          <Icon name="my_location" size={16} />
                          {t("rides.lastSeen", { time: formatDateTime(c.locatedAt, lang) })}
                        </a>
                      ) : null}
                    </span>
                    {c.active ? (
                      <Badge tone={c.onDuty ? "success" : "neutral"}>{onRide.has(c.id) ? t("rides.onRide") : t(c.onDuty ? "rides.online" : "rides.offline")}</Badge>
                    ) : (
                      <Badge tone="warn">{t("rides.suspended")}</Badge>
                    )}
                    <form action={setDriverActiveAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="active" value={c.active ? "false" : "true"} />
                      <SubmitButton variant="secondary" className="h-9">
                        {t(c.active ? "rides.suspend" : "rides.approve")}
                      </SubmitButton>
                    </form>
                    <form action={deleteDriverAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmButton confirm={t("rides.deleteConfirm")} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                        {t("rides.delete")}
                      </ConfirmButton>
                    </form>
                  </div>
                  <details className="rounded-xl border border-line p-4">
                    <summary className="cursor-pointer text-[15px] font-semibold">{t("rides.edit")}</summary>
                    <div className="pt-3">
                      <DriverForm
                        id={c.id}
                        values={driverFormValues(c)}
                        emailOnly={emailOnly}
                        types={typeChoices}
                        usualShare={usualShare}
                        photoUrl={d.photoAssetId ? assetUrl(d.photoAssetId) : null}
                        documents={documentsOf(d)}
                      />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-how" className="flex max-w-[760px] flex-col gap-2 rounded-2xl border border-line bg-sand p-5 sm:p-6">
        <h2 id="h-how" className="m-0 text-lg font-bold">
          {t("rides.howDrivers")}
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("rides.howDriversText")}</p>
      </section>
    </div>
  );
}
