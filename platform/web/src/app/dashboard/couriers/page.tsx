import type { Metadata } from "next";
import Link from "next/link";
import { deleteCourierAction, setCourierActiveAction } from "@/app/actions/delivery";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn, EmptyState, formatDateTime, Notice, PageHeader, Section } from "@/components/ui";
import { ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterList, Sheet, SheetButton } from "@/components/page-kit-client";
import { richText } from "@/i18n/rich";
import { onYallappCourier } from "@/lib/courier-hub/access";
import { courierAppNameOf } from "@/lib/delivery/courier-app";
import { deliverySettingsOf } from "@/lib/delivery/settings";
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

/** 104 The company's couriers: who they are, whether they're on duty, their jobs now; 104.8.3 which app they work in, and when each last signed in to Yallapp Courier. */
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
  // 104.8.3 Which app the couriers work in: the company's own courier app, or Yallapp Courier.
  const settings = deliverySettingsOf(await store.getDeliverySettings(app.id));
  const hub = onYallappCourier(app, settings);
  const settingsLink = { link: (chunk: string) => <Link href="/dashboard/delivery">{chunk}</Link> };

  const has = couriers.length > 0;
  const onDuty = couriers.filter((c) => c.active && c.onDuty).length;
  const paused = couriers.filter((c) => !c.active).length;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, where the couriers work, the numbers, the form in a Sheet (in place for the first courier), then the list. */}
      <PageHeader
        title={t("delivery.couriers")}
        description={t("delivery.couriersIntro")}
        actions={
          has ? (
            <SheetButton target="new-courier" icon="add">
              {t("delivery.addCourier")}
            </SheetButton>
          ) : null
        }
      />
      <Notice icon={hub ? "two_wheeler" : "smartphone"}>
        <span data-couriers-app={hub ? "yallapp_courier" : "own"}>
          {hub ? richText(t("delivery.couriersOnHub"), settingsLink) : richText(t("delivery.couriersOnOwn", { name: courierAppNameOf(app, settings) }), settingsLink)}
        </span>
      </Notice>
      <PlanNotice plan={plan} t={t} app={app} />

      {has ? (
        <StatRow label={t("delivery.couriers")}>
          <Stat icon="two_wheeler" label={t("delivery.couriers")} value={couriers.length} />
          <Stat icon="check_circle" tone="success" label={t("delivery.activeNow")} value={onDuty} />
          <Stat icon="package_2" tone="accent" label={t("delivery.statJobsNow")} value={working.items.filter((s) => s.courierId !== null).length} href="/dashboard/delivery/live" />
          <Stat icon="pause_circle" tone="warn" label={t("delivery.paused")} value={paused} />
        </StatRow>
      ) : null}

      {/* One place in the page either way, so the form that adds the first courier keeps its message. */}
      <Sheet id="new-courier" inline={!has} title={t("delivery.addCourier")} description={t("delivery.addCourierHint")}>
        <CourierForm courier={{ id: null, name: "", phone: "", email: "", vehicle: "" }} emailOnly={emailOnly} />
      </Sheet>

      <Section titleId="h-couriers" title={t("delivery.courierCount", { count: couriers.length })} flush>
        {!has ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="two_wheeler" title={t("delivery.noCouriersYet")} />
          </div>
        ) : (
          <FilterList
            allLabel={t("common.all")}
            searchLabel={t("delivery.searchCouriers")}
            noMatch={t("delivery.noCourierMatch")}
            filters={[
              { value: "on", label: t("delivery.activeNow") },
              { value: "off", label: t("delivery.offNow") },
              { value: "paused", label: t("delivery.paused") },
            ]}
            items={couriers.map((c, i) => ({
              id: c.id,
              text: [c.name, c.phone, c.email, c.vehicle].filter(Boolean).join(" "),
              group: !c.active ? "paused" : c.onDuty ? "on" : "off",
              node: (
                <ItemRow
                  media={<Thumb icon="two_wheeler" shape="round" tint={i} />}
                  title={c.name}
                  meta={[c.phone ?? c.email, c.vehicle, t("delivery.jobsNow", { count: jobs(c.id) })].filter(Boolean).join(" · ")}
                  extra={
                    <>
                      {c.lat !== null && c.lng !== null && c.locatedAt ? (
                        <a href={mapsLink(c.lat, c.lng)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold">
                          <Icon name="my_location" size={16} />
                          {t("delivery.lastSeen", { time: formatDateTime(c.locatedAt, lang) })}
                        </a>
                      ) : null}
                      {hub ? (
                        <span className="inline-flex items-center gap-1 text-[13px] text-muted" data-hub-sign-in>
                          <Icon name="login" size={16} />
                          {c.hubSignedInAt ? t("delivery.hubLastSignIn", { time: formatDateTime(c.hubSignedInAt, lang) }) : t("delivery.hubNever")}
                        </span>
                      ) : null}
                    </>
                  }
                  aside={c.active ? <Badge tone={c.onDuty ? "success" : "neutral"}>{t(c.onDuty ? "delivery.activeNow" : "delivery.offNow")}</Badge> : <Badge tone="warn">{t("delivery.paused")}</Badge>}
                  actions={
                    <>
                      <SheetButton target={`courier-${c.id}`} icon="edit" variant="secondary" className="h-9 px-3.5 text-sm">
                        {t("delivery.edit")}
                      </SheetButton>
                      <form action={setCourierActiveAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="active" value={c.active ? "false" : "true"} />
                        <SubmitButton variant="secondary" className="h-9 px-3.5 text-sm">
                          {t(c.active ? "delivery.pause" : "delivery.resume")}
                        </SubmitButton>
                      </form>
                      <form action={deleteCourierAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmButton confirm={t("delivery.deleteConfirm")} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                          {t("delivery.delete")}
                        </ConfirmButton>
                      </form>
                      <Sheet id={`courier-${c.id}`} title={t("delivery.editCourierTitle", { name: c.name })}>
                        <CourierForm courier={{ id: c.id, name: c.name, phone: c.phone ?? "", email: c.email ?? "", vehicle: c.vehicle ?? "" }} emailOnly={emailOnly} />
                      </Sheet>
                    </>
                  }
                />
              ),
            }))}
          />
        )}
      </Section>

      <Notice tone="neutral" icon="help">
        <span className="flex flex-col gap-1">
          <span className="font-bold">{t("delivery.howCouriers")}</span>
          <span>{t(hub ? "delivery.howCouriersHub" : "delivery.howCouriersText")}</span>
        </span>
      </Notice>
    </div>
  );
}
