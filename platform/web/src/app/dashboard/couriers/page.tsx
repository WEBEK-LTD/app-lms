import type { Metadata } from "next";
import { deleteCourierAction, setCourierActiveAction } from "@/app/actions/delivery";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn, formatDateTime } from "@/components/ui";
import { ConfirmButton } from "../chat/forms";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { COURIER_ACTIVE } from "@/lib/delivery/service";
import { appPlan } from "@/lib/entitlements";
import { hostedSignInMethods } from "@/lib/hosted/sign-in-methods";
import { isDelivery, mapsLink, NotDelivery, PlanNotice } from "../shipments/parts";
import { CourierForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("delivery.couriers") };
}

/** 104 The company's couriers: who they are, whether they're on duty, their jobs now. */
export default async function CouriersPage() {
  const { app, license } = await requireClient("orders");
  const { t, lang } = await dashboardText();
  if (!isDelivery(app)) return <NotDelivery title={t("delivery.couriers")} t={t} />;
  const store = await getStore();
  const methods = hostedSignInMethods(app);
  const emailOnly = methods.length === 1 && methods[0] === "email";
  const [couriers, working, plan] = await Promise.all([
    store.listCouriers(app.id),
    store.listShipments({ appId: app.id, statuses: COURIER_ACTIVE, order: "oldest", offset: 0, limit: 1000 }),
    appPlan(store, license, new Date()),
  ]);
  const jobs = (id: number) => working.items.filter((s) => s.courierId === id).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[640px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("delivery.couriers")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("delivery.couriersIntro")}</p>
      </div>
      <PlanNotice plan={plan} t={t} app={app} />

      <section aria-labelledby="h-add" className="flex max-w-[760px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-add" className="m-0 text-lg font-bold">
          {t("delivery.addCourier")}
        </h2>
        <CourierForm courier={{ id: null, name: "", phone: "", email: "", vehicle: "" }} emailOnly={emailOnly} />
      </section>

      <section aria-labelledby="h-couriers" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-couriers" className="m-0 text-lg font-bold">
          {t("delivery.courierCount", { count: couriers.length })}
        </h2>
        {couriers.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("delivery.noCouriersYet")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {couriers.map((c) => (
              <li key={c.id} className="flex flex-col gap-3 border-t border-line-soft py-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand text-muted">
                    <Icon name="two_wheeler" size={22} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-bold">{c.name}</span>
                    <span className="text-[13px] text-muted" dir="auto">
                      {[c.phone ?? c.email, c.vehicle, t("delivery.jobsNow", { count: jobs(c.id) })].filter(Boolean).join(" · ")}
                    </span>
                    {c.lat !== null && c.lng !== null && c.locatedAt ? (
                      <a href={mapsLink(c.lat, c.lng)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold">
                        <Icon name="my_location" size={16} />
                        {t("delivery.lastSeen", { time: formatDateTime(c.locatedAt, lang) })}
                      </a>
                    ) : null}
                  </span>
                  {c.active ? <Badge tone={c.onDuty ? "success" : "neutral"}>{t(c.onDuty ? "delivery.activeNow" : "delivery.offNow")}</Badge> : <Badge tone="warn">{t("delivery.paused")}</Badge>}
                  <form action={setCourierActiveAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={c.active ? "false" : "true"} />
                    <SubmitButton variant="secondary" className="h-9">
                      {t(c.active ? "delivery.pause" : "delivery.resume")}
                    </SubmitButton>
                  </form>
                  <form action={deleteCourierAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmButton confirm={t("delivery.deleteConfirm")} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                      {t("delivery.delete")}
                    </ConfirmButton>
                  </form>
                </div>
                <details className="rounded-xl border border-line p-4">
                  <summary className="cursor-pointer text-[15px] font-semibold">{t("delivery.edit")}</summary>
                  <div className="pt-3">
                    <CourierForm courier={{ id: c.id, name: c.name, phone: c.phone ?? "", email: c.email ?? "", vehicle: c.vehicle ?? "" }} emailOnly={emailOnly} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-how" className="flex max-w-[760px] flex-col gap-2 rounded-2xl border border-line bg-sand p-5 sm:p-6">
        <h2 id="h-how" className="m-0 text-lg font-bold">
          {t("delivery.howCouriers")}
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("delivery.howCouriersText")}</p>
      </section>
    </div>
  );
}
