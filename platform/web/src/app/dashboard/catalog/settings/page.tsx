import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader, Section } from "@/components/ui";
import { UpgradeHint } from "@/components/upgrade";
import { requireClient } from "@/lib/auth/session";
import { currentPlanId } from "@/lib/billing/plan-change";
import { CATALOG_CURRENCIES, centsToDecimal } from "@/lib/catalog/money";
import { fulfilmentOf } from "@/lib/catalog/fulfilment";
import { catalogSettings } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { plansIn } from "@/lib/marketing-lang";
import { hasFeature, lowestPlanWith } from "@/lib/plans";
import { dashboardText } from "@/lib/dashboard-lang";
import { LoyaltyForm, ShopSettingsForm } from "../forms";
import { CatalogTabs } from "../tabs";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("manage.settings") };
}

/** The shop's currency, shipping, returns and tax, and 91.4 its loyalty points; 132.10 on their own page. */
export default async function CatalogSettingsPage() {
  const { app, license } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "catalog") notFound();
  const { t, lang } = await dashboardText();
  const settings = catalogSettings(app);
  const fulfilment = fulfilmentOf(app);
  // 91.4 Loyalty points: every plan but Starter.
  const plans = plansIn(lang, await effectivePlans(await getStore()));
  const planId = license ? currentPlanId(license, new Date()) : null;
  const loyaltyInPlan = planId ? hasFeature(plans[planId], "loyalty") : false;
  const loyaltyTo = lowestPlanWith(plans, (p) => hasFeature(p, "loyalty"), planId);
  const loyalty = settings.loyalty;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("manage.settings")} description={t("manage.settingsIntro", { kind: app.vertical === "restaurant" ? "restaurant" : "shop" })} />
      <CatalogTabs app={app} />
      <div className="flex flex-col gap-5 [&>*]:max-w-[760px]">
        <Section titleId="h-shop" title={fulfilment ? t("shop.currency") : t("shop.shopSettings")}>
          <ShopSettingsForm
            currency={settings.currency}
            currencies={CATALOG_CURRENCIES}
            shipping={settings.shippingCents ? centsToDecimal(settings.shippingCents) : ""}
            freeOver={settings.freeShippingOverCents !== null ? centsToDecimal(settings.freeShippingOverCents) : ""}
            returnDays={settings.returnDays ? String(settings.returnDays) : ""}
            tax={settings.tax ? { label: settings.tax.label, rate: String(settings.tax.rateBps / 100), included: settings.tax.included } : { label: "", rate: "", included: true }}
            shippingFields={!fulfilment}
          />
        </Section>
        {/* 91.4 Loyalty points. */}
        {loyaltyInPlan ? (
          <Section titleId="h-loyalty" title={t("shop.loyalty")}>
            <LoyaltyForm
              currency={settings.currency}
              values={{
                on: loyalty ? "on" : "",
                spend: centsToDecimal(loyalty?.spendPerPointCents ?? 1000),
                value: centsToDecimal(loyalty?.pointValueCents ?? 10),
                minPoints: String(loyalty?.minPoints ?? 100),
              }}
            />
          </Section>
        ) : planId ? (
          <UpgradeHint title={t("shop.loyalty")} to={loyaltyTo} cta={loyaltyTo ? t("overview.upgradeTo", { plan: loyaltyTo.name }) : undefined}>
            {t("shop.loyaltyUpgradeText")}
          </UpgradeHint>
        ) : null}
      </div>
    </div>
  );
}
