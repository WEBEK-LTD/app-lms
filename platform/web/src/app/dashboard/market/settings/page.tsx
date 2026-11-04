import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { btn, Notice, PageHeader, Section } from "@/components/ui";
import { saveCourierTermsAction, saveMarketSettingsAction } from "@/app/actions/market";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { courierTermsFormValues } from "@/lib/market/delivery-forms";
import { paymentSetupPlan, type PaymentSetupStep } from "@/lib/market/payments";
import { marketCurrency, marketSettingsOf, paymentSettingsOf } from "@/lib/market/settings";
import { MARKET_GATEWAYS, MAX_DAYS_AHEAD, MAX_WEIGHT_TOLERANCE, marketSettingsFormValues } from "@/lib/market/settings-form";
import { PROVIDER_NAME } from "@/lib/payments/provider";
import { isFood } from "../../shipments/parts";
import { NotMarket } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("market.settings") };
}

const field = "input w-full";
const label = "flex flex-col gap-1 text-[13px] font-semibold text-ink-3";
const check = "flex items-start gap-2.5 rounded-xl border border-line-soft bg-sand/40 p-3 text-[14px] leading-snug";

function Toggle({ name, on, children, hint }: { name: string; on: string | undefined; children: React.ReactNode; hint?: string }) {
  return (
    <label className={check}>
      <input type="checkbox" name={name} value="on" defaultChecked={on === "on"} className="mt-0.5" />
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold text-ink-2">{children}</span>
        {hint ? <span className="text-[13px] text-ink-4">{hint}</span> : null}
      </span>
    </label>
  );
}

/** 115.12 Studio › Marketplace settings: the marketplace as a whole, and what the app's couriers cost. */
export default async function MarketSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { app } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isFood(app)) return <NotMarket title={t("market.settings")} t={t} />;
  const { error, saved } = await searchParams;
  const settings = deliverySettingsOf(await (await getStore()).getDeliverySettings(app.id));
  const currency = marketCurrency(settings);
  const v = marketSettingsFormValues(settings, settings.currency);
  const c = courierTermsFormValues(settings.market, currency);
  const plan = paymentSetupPlan(paymentSettingsOf(marketSettingsOf(settings), settings));
  const stepText = (s: PaymentSetupStep) => t(`market.step_${s.step}` as DashKey, "name" in s ? { name: s.name } : undefined);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("market.settings")} description={t("market.settingsIntro")} />
      {error ? (
        <Notice tone="danger" icon="error">
          {error}
        </Notice>
      ) : saved ? (
        <Notice tone="success" icon="check_circle">
          {t(saved === "couriers" ? "market.savedCouriers" : "market.savedMarket")}
        </Notice>
      ) : null}

      <form action={saveMarketSettingsAction} className="flex flex-col gap-6">
        <Section titleId="h-region" title={t("market.sRegion")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              {t("market.sCountry")}
              <input name="country" required maxLength={2} defaultValue={v.country} dir="ltr" className={`${field} uppercase`} />
            </label>
            <label className={label}>
              {t("market.sCurrency", { currency: settings.currency })}
              <input name="currency" maxLength={3} defaultValue={v.currency} dir="ltr" className={`${field} uppercase`} />
            </label>
          </div>
        </Section>

        <Section titleId="h-taxes" title={t("market.sTaxes")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              {t("market.sTaxRate")}
              <input name="tax_rate" inputMode="decimal" defaultValue={v.tax_rate} dir="ltr" className={field} />
            </label>
            <label className={label}>
              {t("market.sTaxLabel")}
              <input name="tax_label" maxLength={24} defaultValue={v.tax_label} className={field} />
            </label>
            <Toggle name="tax_included" on={v.tax_included}>
              {t("market.sTaxIncluded")}
            </Toggle>
            <Toggle name="tax_on_delivery" on={v.tax_on_delivery}>
              {t("market.sTaxOnDelivery")}
            </Toggle>
          </div>
        </Section>

        <Section titleId="h-pay" title={t("market.sPayments")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              {t("market.sGateway")}
              <select name="gateway" defaultValue={v.gateway} className="input h-10">
                <option value="">{t("market.sNoGateway")}</option>
                {MARKET_GATEWAYS.map((g) => (
                  <option key={g} value={g}>
                    {PROVIDER_NAME[g]}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              {t("market.sCashMax")}
              <input name="cash_max" inputMode="decimal" defaultValue={v.cash_max} dir="ltr" className={field} />
            </label>
            <Toggle name="cash" on={v.cash}>
              {t("market.sCash")}
            </Toggle>
            <Toggle name="apple_pay" on={v.apple_pay}>
              {t("market.sApplePay")}
            </Toggle>
            <Toggle name="google_pay" on={v.google_pay}>
              {t("market.sGooglePay")}
            </Toggle>
          </div>
          <div className="mt-4 rounded-2xl border border-line-soft bg-white p-4">
            <h3 className="m-0 mb-2 flex items-center gap-2 text-[15px] font-bold">
              <Icon name="task_alt" size={18} />
              {t("market.sSetup")}
            </h3>
            <ol className="m-0 flex list-decimal flex-col gap-1.5 ps-5 text-[14px] leading-relaxed text-ink-3">
              {plan.map((s) => (
                <li key={s.step}>{stepText(s)}</li>
              ))}
            </ol>
          </div>
        </Section>

        <Section titleId="h-order" title={t("market.sOrdering")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle name="pickup" on={v.pickup}>
              {t("market.sPickup")}
            </Toggle>
            <Toggle name="scheduling" on={v.scheduling}>
              {t("market.sScheduling")}
            </Toggle>
            <label className={label}>
              {t("market.sDaysAhead")}
              <input name="days_ahead" type="number" min={1} max={MAX_DAYS_AHEAD} defaultValue={v.days_ahead} dir="ltr" className={field} />
            </label>
            <label className={label}>
              {t("market.sWeight")}
              <input name="weight_tolerance" type="number" min={0} max={MAX_WEIGHT_TOLERANCE} defaultValue={v.weight_tolerance} dir="ltr" className={field} />
            </label>
          </div>
        </Section>

        <Section titleId="h-loyalty" title={t("market.sLoyalty")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle name="club" on={v.club}>
              {t("market.sClub")}
            </Toggle>
            <Toggle name="wallet" on={v.wallet}>
              {t("market.sWallet")}
            </Toggle>
          </div>
        </Section>

        <Section titleId="h-places" title={t("market.sPlaces")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>
              {t("market.sVendorApp")}
              <select name="vendor_app" defaultValue={v.vendor_app} className="input h-10">
                <option value="same">{t("market.sVendorSame")}</option>
                <option value="bundle">{t("market.sVendorBundle")}</option>
              </select>
            </label>
            <Toggle name="require_photos" on={v.require_photos} hint={t("market.sRequirePhotosHint")}>
              {t("market.sRequirePhotos")}
            </Toggle>
          </div>
        </Section>

        <div>
          <button type="submit" className={`${btn.primary} h-11 px-5 text-sm`}>
            <Icon name="check" size={18} />
            {t("market.sSave")}
          </button>
        </div>
      </form>

      <form action={saveCourierTermsAction}>
        <Section titleId="h-couriers" title={t("market.cTitle")} description={t("market.cIntro")}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className={label}>
              {t("market.cCustomerFee")}
              <select name="customer_fee" defaultValue={c.customer_fee} className="input h-10">
                <option value="delivery_prices">{t("market.cDeliveryPrices")}</option>
                <option value="percent">{t("market.cPercent")}</option>
              </select>
            </label>
            <label className={label}>
              {t("market.cPercentValue")}
              <input name="percent" inputMode="decimal" defaultValue={c.percent} dir="ltr" className={field} />
            </label>
            <label className={label}>
              {t("market.cMinFee")}
              <input name="min_fee" inputMode="decimal" defaultValue={c.min_fee} dir="ltr" className={field} />
            </label>
            <label className={label}>
              {t("market.cMaxFee")}
              <input name="max_fee" inputMode="decimal" defaultValue={c.max_fee} dir="ltr" className={field} />
            </label>
            <label className={label}>
              {t("market.cFreeOver")}
              <input name="free_over" inputMode="decimal" defaultValue={c.free_over} dir="ltr" className={field} />
            </label>
            <label className={label}>
              {t("market.cVendorCharge")}
              <select name="vendor_charge" defaultValue={c.vendor_charge} className="input h-10">
                <option value="none">{t("market.cNone")}</option>
                <option value="fixed">{t("market.cFixed")}</option>
                <option value="percent">{t("market.cVendorPercent")}</option>
                <option value="per_km">{t("market.cPerKm")}</option>
              </select>
            </label>
            <label className={label}>
              {t("market.cVendorChargeValue")}
              <input name="vendor_charge_value" inputMode="decimal" defaultValue={c.vendor_charge_value} dir="ltr" className={field} />
            </label>
          </div>
          <div className="mt-4">
            <button type="submit" className={`${btn.primary} h-11 px-5 text-sm`}>
              <Icon name="two_wheeler" size={18} />
              {t("market.cSave")}
            </button>
          </div>
        </Section>
      </form>
    </div>
  );
}
