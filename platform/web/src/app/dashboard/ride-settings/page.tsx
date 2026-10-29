import type { Metadata } from "next";
import Link from "next/link";
import { removePaymentKeysAction } from "@/app/actions/catalog";
import { PaymentKeysForm } from "@/app/dashboard/catalog/forms";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { mayDo, OwnerOnly } from "@/components/owner-only";
import { Notice } from "@/components/ui";
import { richText } from "@/i18n/rich";
import { requireClient } from "@/lib/auth/session";
import { CATALOG_CURRENCIES } from "@/lib/catalog/money";
import { catalogSettings, isOwnPayment } from "@/lib/catalog/settings";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { FOOD_TIMEZONES } from "@/lib/delivery/forms";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { appPlan } from "@/lib/entitlements";
import { PROVIDER_NAME } from "@/lib/payments/provider";
import { hasFeature } from "@/lib/plans";
import { rideSettingsFormValues } from "@/lib/rides/forms";
import { offeredTypes } from "@/lib/rides/settings";
import { isRides, NotRides, PageHead, RidesPlanNotice, TypesFirst } from "../rides/parts";
import { RideSettingsForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("rides.settings") };
}

/** Fares by card: always the company's own account; Yallapp takes no share. */
async function RidePayments({ app }: { app: App }) {
  const { t } = await dashboardText();
  if (!(await mayDo("billing"))) return <OwnerOnly id="h-payments" title={t("rides.cardPayments")} />;
  const payment = catalogSettings(app).payment;
  const own = isOwnPayment(payment) ? payment : null;
  return (
    <section id="payments" aria-labelledby="h-payments" className="flex max-w-[760px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id="h-payments" className="m-0 text-lg font-bold">
        {t("rides.cardPayments")}
      </h2>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("rides.payIntro")}</p>
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

/** 105.2 Ride settings: fares, matching, cancelling, safety, payment, areas, promo codes and where drivers work. */
export default async function RideSettingsPage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isRides(app)) return <NotRides title={t("rides.settings")} t={t} />;
  const store = await getStore();
  const [saved, types, plan] = await Promise.all([store.getDeliverySettings(app.id), store.listVehicleTypes(app.id), appPlan(store, license, new Date())]);
  const settings = deliverySettingsOf(saved);
  const name = (app.appName ?? "").trim();

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("rides.settings")} intro={t("rides.settingsIntro")} />
      <RidesPlanNotice plan={plan} t={t} />
      {offeredTypes(types).length === 0 ? <TypesFirst t={t} /> : null}
      <section aria-labelledby="h-settings" className="flex max-w-[760px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-settings" className="sr-only">
          {t("rides.settings")}
        </h2>
        <RideSettingsForm
          values={rideSettingsFormValues(settings)}
          currencies={CATALOG_CURRENCIES}
          timezones={FOOD_TIMEZONES}
          bundleAllowed={hasFeature(plan, "courier_app")}
          bundleOff={richText(t("rides.driverAppBundleOff"), { link: (chunk) => <Link href="/dashboard/license">{chunk}</Link> })}
          driverAppNameDefault={`${name.slice(0, 23)} Driver`.trim()}
          driverFirebaseIos={Boolean(settings.courierFirebaseIosAssetId)}
        />
      </section>
      {settings.card || isOwnPayment(catalogSettings(app).payment) ? <RidePayments app={app} /> : null}
    </div>
  );
}
