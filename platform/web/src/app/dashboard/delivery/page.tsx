import type { Metadata } from "next";
import Link from "next/link";
import { deleteDeliveryServiceAction, moveDeliveryServiceAction } from "@/app/actions/delivery";
import { removePaymentKeysAction } from "@/app/actions/catalog";
import { PaymentKeysForm } from "@/app/dashboard/catalog/forms";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { mayDo, OwnerOnly } from "@/components/owner-only";
import { Badge, btn, Notice, PageHeader, Section } from "@/components/ui";
import { ItemList, ItemRow, LinkCards, PageGroup, Thumb } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { richText } from "@/i18n/rich";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { CATALOG_CURRENCIES, centsToDecimal, formatCents } from "@/lib/catalog/money";
import { catalogSettings, isOwnPayment } from "@/lib/catalog/settings";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { FOOD_TIMEZONES, zonesText } from "@/lib/delivery/forms";
import { DEFAULT_FOOD_TIMEZONE } from "@/lib/food/service";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { appPlan } from "@/lib/entitlements";
import { PROVIDER_NAME } from "@/lib/payments/provider";
import { hasFeature } from "@/lib/plans";
import { courierAppNameOf, workedInCustomersApp } from "@/lib/delivery/courier-app";
import { courierHubSetting } from "@/lib/courier-hub/review";
import { ConfirmButton } from "../chat/forms";
import { isDelivery, isFood, NotDelivery, PlanNotice } from "../shipments/parts";
import { DeliverySettingsForm, ServiceForm } from "./forms";
import { SampleBadge, SampleEntries, type SampleQuery } from "@/components/samples";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("delivery.settings") };
}

/** 104 The company's card payments: always its own account; Yallapp takes no share. */
async function DeliveryPayments({ app }: { app: App }) {
  const { t } = await dashboardText();
  if (!(await mayDo("billing"))) return <OwnerOnly id="h-payments" title={t("delivery.cardPayments")} />;
  const payment = catalogSettings(app).payment;
  const own = isOwnPayment(payment) ? payment : null;
  return (
    <section id="payments" aria-labelledby="h-payments" className="flex max-w-[760px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id="h-payments" className="m-0 text-lg font-bold">
        {t("delivery.cardPayments")}
      </h2>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("delivery.payIntro")}</p>
      {own ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 flex items-center gap-2 text-[15px] font-semibold text-success">
            <Icon name="check_circle" size={20} filled />
            {t(own.sandbox ? "shop.onOwnSandbox" : "shop.onOwn", { provider: PROVIDER_NAME[own.provider] })}
          </p>
          <form action={removePaymentKeysAction}>
            <SubmitButton variant="secondary" className="h-10">
              {t("shop.removeKeys")}
            </SubmitButton>
          </form>
        </div>
      ) : (
        <Notice icon="info">{t("donations.setUpFirst")}</Notice>
      )}
      <details className="rounded-xl border border-line p-4" open={!own}>
        <summary className="cursor-pointer text-[15px] font-bold">{own ? t("donations.changeKeys") : t("donations.addKeys")}</summary>
        <div className="flex flex-col gap-4 pt-3">
          <p className="m-0 text-sm leading-relaxed text-ink-4">{t("donations.keysText")}</p>
          <PaymentKeysForm provider={own?.provider ?? null} sandbox={own?.sandbox ?? false} merchantId={own?.provider === "kashier" ? own.merchantId : ""} clientId={own?.provider === "paypal" ? own.clientId : ""} />
        </div>
      </details>
    </section>
  );
}

/** 104 Delivery settings: prices, payment, tracking, jobs, where couriers work (104.8.3 their own app or Yallapp Courier), services and card payments. */
export default async function DeliverySettingsPage({ searchParams }: { searchParams: Promise<SampleQuery> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isDelivery(app)) return <NotDelivery title={t("delivery.settings")} t={t} />;
  const store = await getStore();
  const [saved, services, plan] = await Promise.all([store.getDeliverySettings(app.id), store.listDeliveryServices(app.id), appPlan(store, license, new Date())]);
  const settings = deliverySettingsOf(saved);
  const money = (cents: number) => (cents > 0 ? centsToDecimal(cents) : "");
  const bundleAllowed = hasFeature(plan, "courier_app");
  // 104.8.3 A delivery company's couriers may work in Yallapp Courier instead (not a food company's).
  const links = await courierHubSetting(store);
  const hub = app.appType !== "delivery" ? null : { company: (app.appName ?? "").trim() || t("emails.yourAppName"), play: links.playUrl, appStore: links.appStoreUrl };

  const food = isFood(app);

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the settings form in parts, the services as rows (each edited in a Sheet), then card payments. */}
      <PageHeader
        title={t("delivery.settings")}
        description={t("delivery.settingsIntro")}
        actions={
          !food && services.length ? (
            <SheetButton target="new-service" icon="add">
              {t("delivery.addService")}
            </SheetButton>
          ) : null
        }
      />
      <PlanNotice plan={plan} t={t} app={app} />
      <LinkCards
        label={t("delivery.settings")}
        items={[
          { href: "/dashboard/couriers", icon: "two_wheeler", label: t("delivery.couriers") },
          { href: "/dashboard/shipments", icon: "package_2", label: food ? t("food.courierJobs") : t("delivery.shipments") },
          { href: "/dashboard/delivery/live", icon: "map", label: t("delivery.liveMap") },
        ]}
      />

      <PageGroup title={t("delivery.groupHow")}>
      <section aria-labelledby="h-settings" className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-settings" className="sr-only">
          {t("delivery.settings")}
        </h2>
        <DeliverySettingsForm
          currencies={CATALOG_CURRENCIES}
          bundleAllowed={bundleAllowed}
          bundleOff={richText(t("delivery.courierBundleOff"), { link: (chunk) => <Link href="/dashboard/license">{chunk}</Link> })}
          before={workedInCustomersApp(settings)}
          settings={{
            currency: settings.currency,
            pricing: settings.pricing,
            fixed: money(settings.fixedCents),
            base: money(settings.baseCents),
            perKm: money(settings.perKmCents),
            min: money(settings.minCents),
            maxKm: settings.maxKm === null ? "" : String(settings.maxKm),
            zones: zonesText(settings.zones),
            cash: settings.cash,
            card: settings.card,
            tracking: settings.tracking,
            assignment: settings.assignment,
            courierAppName: settings.courierAppName ?? "",
            courierAppNameDefault: courierAppNameOf(app, { courierAppName: null }),
            courierFirebaseIos: Boolean(settings.courierFirebaseIosAssetId),
            courierIconUrl: settings.courierIconAssetId ? `/api/v1/assets/${settings.courierIconAssetId}` : null,
            couriersWork: settings.courierApp === "yallapp_courier" ? "yallapp_courier" : "own",
          }}
          hub={hub}
          food={
            isFood(app)
              ? {
                  cuisines: (settings.cuisines ?? []).map((c) => c.name).join("\n"),
                  foodCourierJob: settings.foodCourierJob ?? "accepted",
                  timezone: settings.timezone ?? DEFAULT_FOOD_TIMEZONE,
                  timezones: FOOD_TIMEZONES,
                }
              : undefined
          }
        />
      </section>

      </PageGroup>

      {/* 105.1 A food company's prices are the delivery fee only: no services. */}
      {food ? null : (
        <PageGroup title={t("delivery.services")}>
          <Section titleId="h-services" title={t("delivery.services")} description={t("delivery.servicesIntro")} actions={<Badge tone="neutral">{services.length}</Badge>} flush>
            {/* 110.2 */}
            <div className="empty:hidden px-5 pt-4 sm:px-6">
              <SampleEntries app={app} list="delivery_services" query={await searchParams} />
            </div>
            {services.length === 0 ? (
              <p className="m-0 px-5 py-4 text-[15px] text-muted sm:px-6">{t("delivery.noServices")}</p>
            ) : (
              <ItemList>
                {services.map((s, i) => (
                  <ItemRow
                    key={s.id}
                    media={<Thumb src={s.imageAssetId ? assetUrl(s.imageAssetId) : null} icon="local_shipping" shape="square" tint={i} />}
                    title={s.name}
                    badges={
                      <>
                        <SampleBadge sample={s.sample} />
                        {s.active ? null : <Badge tone="neutral">{t("delivery.hidden")}</Badge>}
                      </>
                    }
                    meta={[s.extraCents > 0 ? `+${formatCents(s.extraCents, settings.currency)}` : null, s.eta].filter(Boolean).join(" · ") || undefined}
                    extra={s.description ? <span className="line-clamp-1">{s.description}</span> : null}
                    actions={
                      <>
                        <form action={moveDeliveryServiceAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="step" value="up" />
                          <button type="submit" disabled={i === 0} aria-label={t("delivery.up")} className={`${btn.ghost} h-9 px-2`}>
                            <Icon name="arrow_upward" size={18} />
                          </button>
                        </form>
                        <form action={moveDeliveryServiceAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="step" value="down" />
                          <button type="submit" disabled={i === services.length - 1} aria-label={t("delivery.down")} className={`${btn.ghost} h-9 px-2`}>
                            <Icon name="arrow_downward" size={18} />
                          </button>
                        </form>
                        <SheetButton target={`service-${s.id}`} icon="edit" variant="secondary" className="h-9 px-3.5 text-sm">
                          {t("delivery.editService", { name: s.name })}
                        </SheetButton>
                        <form action={deleteDeliveryServiceAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <ConfirmButton confirm={t("delivery.deleteService", { name: s.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                            {t("delivery.delete")}
                          </ConfirmButton>
                        </form>
                        <Sheet id={`service-${s.id}`} title={s.name}>
                          <ServiceForm
                            currency={settings.currency}
                            service={{
                              id: s.id,
                              name: s.name,
                              description: s.description ?? "",
                              extra: s.extraCents > 0 ? centsToDecimal(s.extraCents) : "",
                              eta: s.eta ?? "",
                              active: s.active,
                              imageUrl: s.imageAssetId ? assetUrl(s.imageAssetId) : null,
                            }}
                          />
                        </Sheet>
                      </>
                    }
                  />
                ))}
              </ItemList>
            )}
          </Section>
          {/* The new service: in a Sheet, in place while there are none. */}
          <Sheet id="new-service" inline={services.length === 0} title={t("delivery.addService")} description={t("delivery.servicesIntro")}>
            <ServiceForm currency={settings.currency} service={{ id: null, name: "", description: "", extra: "", eta: "", active: true, imageUrl: null }} />
          </Sheet>
        </PageGroup>
      )}

      {settings.card || isOwnPayment(catalogSettings(app).payment) ? (
        <PageGroup title={t("delivery.groupPayments")}>
          <DeliveryPayments app={app} />
        </PageGroup>
      ) : null}
    </div>
  );
}
