import { removePaymentKeysAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Notice } from "@/components/ui";
import { SUB_MERCHANT_TYPES } from "@/lib/catalog/marketplace";
import { catalogSettings, isOwnPayment, marketplaceTerms, marketplaceVia } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import type { App, CatalogCurrency } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import { currencyList, PROVIDER_NAME, providerTakes } from "@/lib/payments/provider";
import { featureOn, getSwitches } from "@/lib/switches";
import { MarketplaceForm, PaymentKeysForm } from "./forms";

/**
 * Card payments of an app selling from the dashboard: the shop's own
 * account (37 iyzico, Kashier or Fawaterk), or Yallapp's. `currency` is
 * what the app sells in, to warn when the provider doesn't take it.
 */
export async function CardPayments({ app, currency }: { app: App; currency?: CatalogCurrency }) {
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
  return (
    <section aria-labelledby="h-payments" className="flex max-w-[640px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id="h-payments" className="m-0 text-lg font-bold">
        Card payments
      </h2>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">
        Customers pay by card on a secure page of your payment provider: iyzico, Kashier or Fawaterk.
      </p>
      {payment ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 flex items-center gap-2 text-[15px] font-semibold text-success">
            <Icon name="check_circle" size={20} filled />
            {marketplace
              ? `On · through Yallapp, paid to ${marketplace.payeeName} (IBAN ending ${marketplace.ibanLast4})`
              : `On · your ${PROVIDER_NAME[own!.provider]} account`}
            {payment.sandbox ? " · sandbox (test payments)" : ""}
          </p>
          <form action={removePaymentKeysAction}>
            <SubmitButton variant="secondary" className="h-10">
              {marketplace ? "Stop selling through Yallapp" : "Remove keys"}
            </SubmitButton>
          </form>
        </div>
      ) : null}
      {provider && !providerTakes(provider, sells) ? (
        <Notice tone="warn" icon="warning">
          {PROVIDER_NAME[provider]} takes payments in {currencyList(provider)}, and your prices are in {sells}. Change your currency, or customers
          can&apos;t pay.
        </Notice>
      ) : null}
      {marketplace && terms ? (
        <p className="m-0 text-sm text-muted">
          Yallapp keeps {terms.commissionPercent}% of each sale (shipping excluded).{" "}
          {marketplace.subMerchantKey
            ? "iyzico pays your share to your IBAN after you mark the order completed."
            : "Yallapp transfers your share to your IBAN after you mark the order completed."}
        </p>
      ) : null}
      {!marketplace && terms && joinable ? (
        <details className="rounded-xl border border-line p-4" open={!payment}>
          <summary className="cursor-pointer text-[15px] font-bold">No payment account? Sell through Yallapp</summary>
          <div className="flex flex-col gap-4 pt-3">
            {terms.account.provider === "iyzico" ? (
              <p className="m-0 text-sm leading-relaxed text-ink-4">
                Customers pay into Yallapp&apos;s iyzico account, and iyzico pays you each sale minus Yallapp&apos;s {terms.commissionPercent}%
                commission (shipping is all yours), after you mark the order completed. iyzico needs these details to pay you.
              </p>
            ) : (
              <p className="m-0 text-sm leading-relaxed text-ink-4">
                Customers pay into Yallapp&apos;s {viaName} account in {currencyList(terms.account.provider)}, and Yallapp transfers you each sale
                minus its {terms.commissionPercent}% commission (shipping is all yours), after you mark the order completed.
              </p>
            )}
            <MarketplaceForm types={SUB_MERCHANT_TYPES} provider={terms.account.provider} />
          </div>
        </details>
      ) : null}
      {!marketplace ? (
        <details className="rounded-xl border border-line p-4" open={!joinable || Boolean(own)}>
          <summary className="cursor-pointer text-[15px] font-bold">Use your own payment account</summary>
          <div className="flex flex-col gap-4 pt-3">
            <p className="m-0 text-sm leading-relaxed text-ink-4">
              The money goes straight to your merchant account with iyzico (Türkiye), Kashier or Fawaterk (Egypt). Your keys stay encrypted on our
              servers.
            </p>
            <PaymentKeysForm provider={own?.provider ?? null} sandbox={own?.sandbox ?? false} merchantId={own?.provider === "kashier" ? own.merchantId : ""} />
          </div>
        </details>
      ) : null}
    </section>
  );
}
