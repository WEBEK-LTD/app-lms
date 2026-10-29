import type { Metadata } from "next";
import { removePaymentKeysAction } from "@/app/actions/catalog";
import { saveSchoolSettingsAction } from "@/app/actions/school";
import { PaymentKeysForm } from "@/app/dashboard/catalog/forms";
import { Field, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { mayDo, OwnerOnly } from "@/components/owner-only";
import { Notice } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { CATALOG_CURRENCIES } from "@/lib/catalog/money";
import { catalogSettings, isOwnPayment } from "@/lib/catalog/settings";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { PROVIDER_NAME } from "@/lib/payments/provider";
import { SCHOOL_TIMEZONES, schoolSettingsFormValues } from "@/lib/school/forms";
import { schoolSettingsOf } from "@/lib/school/settings";
import { Choice, SchoolForm } from "../forms";
import { isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("school.settings") };
}

/** Fees by card: always the school's own account; Yallapp takes no share. */
async function SchoolPayments({ app }: { app: App }) {
  const { t } = await dashboardText();
  if (!(await mayDo("billing"))) return <OwnerOnly id="h-payments" title={t("school.cardPayments")} />;
  const payment = catalogSettings(app).payment;
  const own = isOwnPayment(payment) ? payment : null;
  return (
    <section id="payments" aria-labelledby="h-payments" className="flex max-w-[860px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id="h-payments" className="m-0 text-lg font-bold">
        {t("school.cardPayments")}
      </h2>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("school.payIntro")}</p>
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

/** 105.4 The school's time zone, currency and current term, absence alerts and fees by card. */
export default async function SchoolSettingsPage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("school.settings")} t={t} />;
  const store = await getStore();
  const [saved, plan] = await Promise.all([store.getSchoolSettings(app.id), appPlan(store, license, new Date())]);
  const settings = schoolSettingsOf(saved, app);
  const values = schoolSettingsFormValues(settings);
  const zones = [...new Set([settings.timezone, ...SCHOOL_TIMEZONES])];

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("school.settings")} intro={t("school.settingsIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      <Panel id="h-settings" title={t("school.settings")}>
        <SchoolForm action={saveSchoolSettingsAction} submit={t("school.saveSettings")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Choice id="f-timezone" name="timezone" label={t("school.timezone")} options={zones.map((z) => ({ value: z, label: z }))} defaultValue={values.timezone} />
            <Choice id="f-currency" name="currency" label={t("school.currency")} options={CATALOG_CURRENCIES.map((c) => ({ value: c, label: c }))} defaultValue={values.currency} />
          </div>
          <fieldset className="m-0 flex flex-col gap-3 rounded-xl border border-line p-4">
            <legend className="px-1 text-sm font-bold">{t("school.term")}</legend>
            <p className="m-0 text-[14px] text-muted">{t("school.termHint")}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="f-term-name" label={t("school.termName")} name="termName" defaultValue={values.termName} maxLength={60} placeholder={t("school.termExample")} />
              <Field id="f-term-starts" label={t("school.termStarts")} name="termStarts" type="date" dir="ltr" defaultValue={values.termStarts} />
              <Field id="f-term-ends" label={t("school.termEnds")} name="termEnds" type="date" dir="ltr" defaultValue={values.termEnds} />
            </div>
          </fieldset>
          <label className="flex items-start gap-2 text-[15px]">
            <input type="checkbox" name="absenceAlerts" defaultChecked={values.absenceAlerts === "on"} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{t("school.absenceAlerts")}</span>
              <span className="text-[14px] text-muted">{t("school.absenceAlertsHint")}</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-[15px]">
            <input type="checkbox" name="feesByCard" defaultChecked={values.feesByCard === "on"} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{t("school.feesByCard")}</span>
              <span className="text-[14px] text-muted">{t("school.feesByCardHint")}</span>
            </span>
          </label>
        </SchoolForm>
      </Panel>
      {settings.feesByCard || isOwnPayment(catalogSettings(app).payment) ? <SchoolPayments app={app} /> : null}
    </div>
  );
}
