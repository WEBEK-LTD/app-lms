import type { Metadata } from "next";
import Link from "next/link";
import { deleteDeliveryServiceAction, moveDeliveryServiceAction } from "@/app/actions/delivery";
import { removePaymentKeysAction } from "@/app/actions/catalog";
import { PaymentKeysForm } from "@/app/dashboard/catalog/forms";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { mayDo, OwnerOnly } from "@/components/owner-only";
import { Badge, btn, Notice } from "@/components/ui";
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
import { courierAppNameOf } from "@/lib/delivery/courier-app";
import { ConfirmButton } from "../chat/forms";
import { isDelivery, isFood, NotDelivery, PlanNotice } from "../shipments/parts";
import { AddServiceBox, DeliverySettingsForm, ServiceForm } from "./forms";

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

/** 104 Delivery settings: prices, payment, tracking, jobs, where couriers work, services and card payments. */
export default async function DeliverySettingsPage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isDelivery(app)) return <NotDelivery title={t("delivery.settings")} t={t} />;
  const store = await getStore();
  const [saved, services, plan] = await Promise.all([store.getDeliverySettings(app.id), store.listDeliveryServices(app.id), appPlan(store, license, new Date())]);
  const settings = deliverySettingsOf(saved);
  const money = (cents: number) => (cents > 0 ? centsToDecimal(cents) : "");
  const bundleAllowed = hasFeature(plan, "courier_app");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[640px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("delivery.settings")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("delivery.settingsIntro")}</p>
      </div>
      <PlanNotice plan={plan} t={t} app={app} />

      <section aria-labelledby="h-settings" className="flex max-w-[760px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-settings" className="sr-only">
          {t("delivery.settings")}
        </h2>
        <DeliverySettingsForm
          currencies={CATALOG_CURRENCIES}
          bundleAllowed={bundleAllowed}
          bundleOff={richText(t("delivery.courierBundleOff"), { link: (chunk) => <Link href="/dashboard/license">{chunk}</Link> })}
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
            courierApp: settings.courierApp,
            courierAppName: settings.courierAppName ?? "",
            courierAppNameDefault: courierAppNameOf(app, { courierAppName: null }),
            courierFirebaseIos: Boolean(settings.courierFirebaseIosAssetId),
          }}
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

      {/* 105.1 A food company's prices are the delivery fee only: no services. */}
      {isFood(app) ? null : (
      <section aria-labelledby="h-services" className="flex max-w-[760px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-services" className="m-0 text-lg font-bold">
            {t("delivery.services")}
          </h2>
          <p className="m-0 text-[15px] text-ink-4">{t("delivery.servicesIntro")}</p>
        </div>
        {services.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("delivery.noServices")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {services.map((s, i) => (
            <li key={s.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">{s.name}</span>
                  <span className="text-[13px] text-muted">{[s.extraCents > 0 ? `+${formatCents(s.extraCents, settings.currency)}` : null, s.eta].filter(Boolean).join(" · ")}</span>
                </span>
                {s.active ? null : <Badge tone="neutral">{t("delivery.hidden")}</Badge>}
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
                <form action={deleteDeliveryServiceAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <ConfirmButton confirm={t("delivery.deleteService", { name: s.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                    {t("delivery.delete")}
                  </ConfirmButton>
                </form>
              </div>
              <details className="rounded-xl border border-line p-4">
                <summary className="cursor-pointer text-[15px] font-semibold">{t("delivery.editService", { name: s.name })}</summary>
                <div className="pt-3">
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
                </div>
              </details>
            </li>
          ))}
        </ul>
        <AddServiceBox title={t("delivery.addService")} open={services.length === 0}>
          <ServiceForm currency={settings.currency} service={{ id: null, name: "", description: "", extra: "", eta: "", active: true, imageUrl: null }} />
        </AddServiceBox>
      </section>
      )}

      {settings.card || isOwnPayment(catalogSettings(app).payment) ? <DeliveryPayments app={app} /> : null}
    </div>
  );
}
