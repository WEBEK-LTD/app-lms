import { removePaymentKeysAction } from "@/app/actions/catalog";
import { PaymentKeysForm } from "@/app/dashboard/catalog/forms";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Notice } from "@/components/ui";
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
  const payment = catalogSettings(app).payment;
  const own = isOwnPayment(payment) ? payment : null;
  const { t, lang } = await dashboardText();
  return (
    <section id="payments" aria-labelledby="h-payments" className="flex max-w-[640px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id="h-payments" className="m-0 text-lg font-bold">
        {t("shop.cardPayments")}
      </h2>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("donations.payIntro")}</p>
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
      <details className="rounded-xl border border-line p-4" open={!own}>
        <summary className="cursor-pointer text-[15px] font-bold">{own ? t("donations.changeKeys") : t("donations.addKeys")}</summary>
        <div className="flex flex-col gap-4 pt-3">
          <p className="m-0 text-sm leading-relaxed text-ink-4">{t("donations.keysText")}</p>
          <PaymentKeysForm provider={own?.provider ?? null} sandbox={own?.sandbox ?? false} merchantId={own?.provider === "kashier" ? own.merchantId : ""} />
        </div>
      </details>
    </section>
  );
}
