import { removePaymentKeysAction } from "@/app/actions/catalog";
import { mayDo, OwnerOnly } from "@/components/owner-only";
import { PaymentKeysForm } from "@/app/dashboard/catalog/forms";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Notice, Section } from "@/components/ui";
import { catalogSettings, isOwnPayment } from "@/lib/catalog/settings";
import type { App, CatalogCurrency } from "@/lib/data/types";
import { currencyList, PROVIDER_CURRENCIES, PROVIDER_NAME, providerTakes } from "@/lib/payments/provider";
import { dashboardText } from "@/lib/dashboard-lang";
import { formatList } from "@/i18n/format";

/**
 * 29 A charity's card payments: always its own account (37 iyzico, Kashier
 * or Fawaterk). Donations never go through Yallapp's account, so there's no
 * commission and no "sell through Yallapp" choice here.
 */
export async function DonationPayments({ app, currency }: { app: App; currency: CatalogCurrency }) {
  // 60 Where the money goes is the owner's.
  if (!(await mayDo("billing"))) return <OwnerOnly id="h-payments" title={(await dashboardText()).t("shop.cardPayments")} />;
  const payment = catalogSettings(app).payment;
  const own = isOwnPayment(payment) ? payment : null;
  const { t, lang } = await dashboardText();
  return (
    // The page kit: a Section, its state on a soft line, then the account's keys.
    <Section id="payments" titleId="h-payments" title={t("shop.cardPayments")} description={t("donations.payIntro")} className="max-w-[640px]">
      {own ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-success-bg px-4 py-3">
          <p className="m-0 flex items-center gap-2 text-[15px] font-semibold text-success">
            <Icon name="check_circle" size={20} filled />
            {t(own.sandbox ? "shop.onOwnSandbox" : "shop.onOwn", { provider: PROVIDER_NAME[own.provider] })}
          </p>
          <form action={removePaymentKeysAction}>
            <SubmitButton variant="secondary" className="h-9 px-3.5 text-sm">
              {t("shop.removeKeys")}
            </SubmitButton>
          </form>
        </div>
      ) : payment?.provider === "yallapp" ? (
        <Notice tone="warn" icon="warning">
          {t("donations.notThroughYallapp")}
        </Notice>
      ) : (
        <Notice icon="info">{t("donations.setUpFirst")}</Notice>
      )}
      {own && !providerTakes(own.provider, currency) ? (
        <Notice tone="warn" icon="warning">
          {t("donations.currencyWarn", {
            provider: PROVIDER_NAME[own.provider],
            list: lang === "en" ? currencyList(own.provider) : formatList(lang, PROVIDER_CURRENCIES[own.provider], "disjunction"),
            currency,
          })}
        </Notice>
      ) : null}
      <details className="group rounded-xl border border-line-soft bg-sand p-4" open={!own}>
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[15px] font-bold [&::-webkit-details-marker]:hidden">
          <Icon name="credit_card" size={20} className="text-muted" />
          <span className="flex-1">{own ? t("donations.changeKeys") : t("donations.addKeys")}</span>
          <Icon name="expand_more" size={20} className="text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-4 pt-3">
          <p className="m-0 text-sm leading-relaxed text-ink-4">{t("donations.keysText")}</p>
          <PaymentKeysForm provider={own?.provider ?? null} sandbox={own?.sandbox ?? false} merchantId={own?.provider === "kashier" ? own.merchantId : ""} clientId={own?.provider === "paypal" ? own.clientId : ""} />
        </div>
      </details>
    </Section>
  );
}
