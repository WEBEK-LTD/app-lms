import { removePaymentKeysAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { SUB_MERCHANT_TYPES } from "@/lib/catalog/marketplace";
import { catalogSettings, marketplaceTerms } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import { featureOn, getSwitches } from "@/lib/switches";
import { MarketplaceForm, PaymentKeysForm } from "./forms";

/** Card payments of an app selling from the dashboard: the shop's own iyzico account, or Yallapp's. */
export async function CardPayments({ app }: { app: App }) {
  const settings = catalogSettings(app);
  const store = await getStore();
  const terms = await marketplaceTerms(store, encryptionKey());
  // 11.5 Switches: joining can be switched off, for everyone or per plan (shops that joined keep selling).
  const license = await store.getLicenseForApp(app.clientId, app.id);
  const joinable = terms !== null && featureOn(await getSwitches(store), "marketplace", license?.plan ?? null);
  return (
      <section aria-labelledby="h-payments" className="flex max-w-[640px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-payments" className="m-0 text-[19px] font-bold">
          Card payments
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">Customers pay by card on a secure iyzico page.</p>
        {settings.payment ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 flex items-center gap-2 text-[15px] font-semibold text-success">
              <Icon name="check_circle" size={20} filled />
              {settings.payment.provider === "yallapp"
                ? `On · through Yallapp, paid to ${settings.payment.payeeName} (IBAN ending ${settings.payment.ibanLast4})`
                : "On · your iyzico account"}
              {settings.payment.sandbox ? " · sandbox (test payments)" : ""}
            </p>
            <form action={removePaymentKeysAction}>
              <SubmitButton variant="secondary" className="h-10">
                {settings.payment.provider === "yallapp" ? "Stop selling through Yallapp" : "Remove keys"}
              </SubmitButton>
            </form>
          </div>
        ) : null}
        {settings.payment?.provider === "yallapp" && terms ? (
          <p className="m-0 text-sm text-muted">
            Yallapp keeps {terms.commissionPercent}% of each sale (shipping excluded). iyzico pays your share to your IBAN after you mark the order
            completed.
          </p>
        ) : null}
        {settings.payment?.provider !== "yallapp" && terms && joinable ? (
          <details className="rounded-xl border border-line p-4" open={!settings.payment}>
            <summary className="cursor-pointer text-[15px] font-bold">No iyzico account? Sell through Yallapp</summary>
            <div className="flex flex-col gap-4 pt-3">
              <p className="m-0 text-sm leading-relaxed text-ink-4">
                Customers pay into Yallapp&apos;s iyzico account, and iyzico pays you each sale minus Yallapp&apos;s {terms.commissionPercent}%
                commission (shipping is all yours), after you mark the order completed. iyzico needs these details to pay you.
              </p>
              <MarketplaceForm types={SUB_MERCHANT_TYPES} />
            </div>
          </details>
        ) : null}
        {settings.payment?.provider !== "yallapp" ? (
          <details className="rounded-xl border border-line p-4" open={!joinable || settings.payment?.provider === "iyzico"}>
            <summary className="cursor-pointer text-[15px] font-bold">Use your own iyzico account</summary>
            <div className="flex flex-col gap-4 pt-3">
              <p className="m-0 text-sm leading-relaxed text-ink-4">
                The money goes straight to your iyzico merchant account. Find your keys in the iyzico merchant panel, under Settings. They stay
                encrypted on our servers.
              </p>
              <PaymentKeysForm sandbox={settings.payment?.sandbox ?? false} />
            </div>
          </details>
        ) : null}
      </section>
  );
}
