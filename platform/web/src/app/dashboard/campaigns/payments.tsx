import { removePaymentKeysAction } from "@/app/actions/catalog";
import { PaymentKeysForm } from "@/app/dashboard/catalog/forms";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Notice } from "@/components/ui";
import { catalogSettings, isOwnPayment } from "@/lib/catalog/settings";
import type { App, CatalogCurrency } from "@/lib/data/types";
import { currencyList, PROVIDER_NAME, providerTakes } from "@/lib/payments/provider";

/**
 * 29 A charity's card payments: always its own account (37 iyzico, Kashier
 * or Fawaterk). Donations never go through Yallapp's account, so there's no
 * commission and no "sell through Yallapp" choice here.
 */
export function DonationPayments({ app, currency }: { app: App; currency: CatalogCurrency }) {
  const payment = catalogSettings(app).payment;
  const own = isOwnPayment(payment) ? payment : null;
  return (
    <section id="payments" aria-labelledby="h-payments" className="flex max-w-[640px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id="h-payments" className="m-0 text-lg font-bold">
        Card payments
      </h2>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">
        Donors pay by card on a secure page of your payment provider (iyzico, Kashier or Fawaterk), straight into your own merchant account.
        Yallapp takes no commission on donations.
      </p>
      {own ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 flex items-center gap-2 text-[15px] font-semibold text-success">
            <Icon name="check_circle" size={20} filled />
            On · your {PROVIDER_NAME[own.provider]} account{own.sandbox ? " · sandbox (test payments)" : ""}
          </p>
          <form action={removePaymentKeysAction}>
            <SubmitButton variant="secondary" className="h-10">
              Remove keys
            </SubmitButton>
          </form>
        </div>
      ) : payment?.provider === "yallapp" ? (
        <Notice tone="warn" icon="warning">
          Donations can&apos;t go through Yallapp&apos;s account. Add your own payment keys below to take donations.
        </Notice>
      ) : (
        <Notice icon="info">Set this up first: your campaigns show in the app, but nobody can donate until your payment keys are saved.</Notice>
      )}
      {own && !providerTakes(own.provider, currency) ? (
        <Notice tone="warn" icon="warning">
          {PROVIDER_NAME[own.provider]} takes payments in {currencyList(own.provider)}, and your donations are in {currency}. Change your currency below,
          or donors can&apos;t pay.
        </Notice>
      ) : null}
      <details className="rounded-xl border border-line p-4" open={!own}>
        <summary className="cursor-pointer text-[15px] font-bold">{own ? "Change your payment keys" : "Add your payment keys"}</summary>
        <div className="flex flex-col gap-4 pt-3">
          <p className="m-0 text-sm leading-relaxed text-ink-4">
            Use your merchant account with iyzico (Türkiye), Kashier or Fawaterk (Egypt). Your keys stay encrypted on our servers. No account yet? Apply
            for one on the provider&apos;s website as a charity or association.
          </p>
          <PaymentKeysForm provider={own?.provider ?? null} sandbox={own?.sandbox ?? false} merchantId={own?.provider === "kashier" ? own.merchantId : ""} />
        </div>
      </details>
    </section>
  );
}
