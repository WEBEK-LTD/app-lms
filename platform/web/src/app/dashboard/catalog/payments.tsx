import { removePaymentKeysAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Notice } from "@/components/ui";
import { mayDo, OwnerOnly } from "@/components/owner-only";
import { SUB_MERCHANT_TYPES } from "@/lib/catalog/marketplace";
import { catalogSettings, isOwnPayment, marketplaceTerms, marketplaceVia } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import type { App, CatalogCurrency } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import { currencyList, PROVIDER_NAME, providerTakes } from "@/lib/payments/provider";
import { featureOn, getSwitches } from "@/lib/switches";
import { MarketplaceForm, PaymentKeysForm } from "./forms";
import { dashboardText } from "@/lib/dashboard-lang";
import { formatList } from "@/i18n/format";
import { PROVIDER_CURRENCIES } from "@/lib/payments/provider";

/**
 * Card payments of an app selling from the dashboard: the shop's own
 * account (37 iyzico, Kashier or Fawaterk), or Yallapp's. `currency` is
 * what the app sells in, to warn when the provider doesn't take it.
 */
export async function CardPayments({ app, currency }: { app: App; currency?: CatalogCurrency }) {
  // 60 Where the money goes is the owner's: the team sees that it's theirs to set.
  if (!(await mayDo("billing"))) return <OwnerOnly id="h-payments" title={(await dashboardText()).t("shop.cardPayments")} />;
  const settings = catalogSettings(app);
  const payment = settings.payment;
  const store = await getStore();
  const terms = await marketplaceTerms(store, encryptionKey());
  // 11.5 Switches: joining can be switched off, for everyone or per plan (shops that joined keep selling).
  const license = await store.getLicenseForApp(app.clientId, app.id);
  const joinable = terms !== null && featureOn(await getSwitches(store), "marketplace", license?.plan ?? null);
  const own = isOwnPayment(payment) ? payment : null;
  const marketplace = payment?.provider === "yallapp" ? payment : null;
  // The provider payments go to now, to check the currency against.
  const provider = own?.provider ?? (marketplace ? marketplaceVia(marketplace) : null);
  const sells = currency ?? settings.currency;
  const viaName = terms ? PROVIDER_NAME[terms.account.provider] : "";
  const { t, lang } = await dashboardText();
  const list = (p: keyof typeof PROVIDER_CURRENCIES) => (lang === "en" ? currencyList(p) : formatList(lang, PROVIDER_CURRENCIES[p], "disjunction"));
  return (
    <section aria-labelledby="h-payments" className="flex max-w-[640px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id="h-payments" className="m-0 text-lg font-bold">
        {t("shop.cardPayments")}
      </h2>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("shop.cardIntro")}</p>
      {payment ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 flex items-center gap-2 text-[15px] font-semibold text-success">
            <Icon name="check_circle" size={20} filled />
            {marketplace
              ? t(payment.sandbox ? "shop.onYallappSandbox" : "shop.onYallapp", { payee: marketplace.payeeName, last4: marketplace.ibanLast4 })
              : t(payment.sandbox ? "shop.onOwnSandbox" : "shop.onOwn", { provider: PROVIDER_NAME[own!.provider] })}
          </p>
          <form action={removePaymentKeysAction}>
            <SubmitButton variant="secondary" className="h-10">
              {marketplace ? t("shop.stopYallapp") : t("shop.removeKeys")}
            </SubmitButton>
          </form>
        </div>
      ) : null}
      {provider && !providerTakes(provider, sells) ? (
        <Notice tone="warn" icon="warning">
          {t("shop.currencyWarn", { provider: PROVIDER_NAME[provider], list: list(provider), currency: sells })}
        </Notice>
      ) : null}
      {marketplace && terms ? (
        <p className="m-0 text-sm text-muted">
          {t(marketplace.subMerchantKey ? "shop.commissionIyzico" : "shop.commissionYallapp", { percent: terms.commissionPercent })}
        </p>
      ) : null}
      {!marketplace && terms && joinable ? (
        <details className="rounded-xl border border-line p-4" open={!payment}>
          <summary className="cursor-pointer text-[15px] font-bold">{t("shop.noAccount")}</summary>
          <div className="flex flex-col gap-4 pt-3">
            {terms.account.provider === "iyzico" ? (
              <p className="m-0 text-sm leading-relaxed text-ink-4">{t("shop.iyzicoExplain", { percent: terms.commissionPercent })}</p>
            ) : (
              <p className="m-0 text-sm leading-relaxed text-ink-4">
                {t("shop.otherExplain", { provider: viaName, list: list(terms.account.provider), percent: terms.commissionPercent })}
              </p>
            )}
            <MarketplaceForm types={SUB_MERCHANT_TYPES} provider={terms.account.provider} />
          </div>
        </details>
      ) : null}
      {!marketplace ? (
        <details className="rounded-xl border border-line p-4" open={!joinable || Boolean(own)}>
          <summary className="cursor-pointer text-[15px] font-bold">{t("shop.ownAccount")}</summary>
          <div className="flex flex-col gap-4 pt-3">
            <p className="m-0 text-sm leading-relaxed text-ink-4">{t("shop.ownText")}</p>
            <PaymentKeysForm provider={own?.provider ?? null} sandbox={own?.sandbox ?? false} merchantId={own?.provider === "kashier" ? own.merchantId : ""} />
          </div>
        </details>
      ) : null}
    </section>
  );
}
