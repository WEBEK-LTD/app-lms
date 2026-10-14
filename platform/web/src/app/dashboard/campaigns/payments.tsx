import { removePaymentKeysAction } from "@/app/actions/catalog";
import { PaymentKeysForm } from "@/app/dashboard/catalog/forms";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Notice } from "@/components/ui";
import { catalogSettings } from "@/lib/catalog/settings";
import type { App } from "@/lib/data/types";

/**
 * 29 A charity's card payments: always its own iyzico account. Donations
 * never go through Yallapp's account, so there's no commission and no
 * "sell through Yallapp" choice here.
 */
export function DonationPayments({ app }: { app: App }) {
  const payment = catalogSettings(app).payment;
  const own = payment?.provider === "iyzico";
  return (
    <section id="payments" aria-labelledby="h-payments" className="flex max-w-[640px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id="h-payments" className="m-0 text-lg font-bold">
        Card payments
      </h2>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">
        Donors pay by card on a secure iyzico page, straight into your own iyzico merchant account. Yallapp takes no commission on donations.
      </p>
      {own ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 flex items-center gap-2 text-[15px] font-semibold text-success">
            <Icon name="check_circle" size={20} filled />
            On · your iyzico account{payment.sandbox ? " · sandbox (test payments)" : ""}
          </p>
          <form action={removePaymentKeysAction}>
            <SubmitButton variant="secondary" className="h-10">
              Remove keys
            </SubmitButton>
          </form>
        </div>
      ) : payment?.provider === "yallapp" ? (
        <Notice tone="warn" icon="warning">
          Donations can&apos;t go through Yallapp&apos;s account. Add your own iyzico keys below to take donations.
        </Notice>
      ) : (
        <Notice icon="info">Set this up first: your campaigns show in the app, but nobody can donate until your iyzico keys are saved.</Notice>
      )}
      <details className="rounded-xl border border-line p-4" open={!own}>
        <summary className="cursor-pointer text-[15px] font-bold">{own ? "Change your iyzico keys" : "Add your iyzico keys"}</summary>
        <div className="flex flex-col gap-4 pt-3">
          <p className="m-0 text-sm leading-relaxed text-ink-4">
            Find them in the iyzico merchant panel, under Settings. They stay encrypted on our servers. No iyzico account yet? Apply for one on iyzico&apos;s
            website as a charity or association.
          </p>
          <PaymentKeysForm sandbox={payment?.sandbox ?? false} />
        </div>
      </details>
    </section>
  );
}
