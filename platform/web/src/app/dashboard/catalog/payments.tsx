import { removePaymentKeysAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Notice, Section } from "@/components/ui";
import { mayDo, OwnerOnly } from "@/components/owner-only";
import { catalogSettings, isOwnPayment } from "@/lib/catalog/settings";
import type { App, CatalogCurrency } from "@/lib/data/types";
import { currencyList, PROVIDER_NAME, providerTakes } from "@/lib/payments/provider";
import { ManualPaymentsForm, PaymentKeysForm } from "./forms";
import { manualChoices, PAY_WITHIN_DAYS } from "@/lib/catalog/manual";
import { dashboardText } from "@/lib/dashboard-lang";
import { formatList } from "@/i18n/format";
import { PROVIDER_CURRENCIES } from "@/lib/payments/provider";

/**
 * Card payments of an app selling from the dashboard: always the shop's own
 * account (37 iyzico, Kashier, Fawaterk, Stripe or PayPal). `currency` is what the app sells
 * in, to warn when the provider doesn't take it. 72 Yallapp never collects
 * payments for its clients: a shop that had joined the old marketplace is
 * told to add its own account, and takes no payments until it does.
 */
export async function CardPayments({ app, currency }: { app: App; currency?: CatalogCurrency }) {
  // 60 Where the money goes is the owner's: the team sees that it's theirs to set.
  if (!(await mayDo("billing"))) return <OwnerOnly id="h-payments" title={(await dashboardText()).t("shop.cardPayments")} />;
  const settings = catalogSettings(app);
  const payment = settings.payment;
  const own = isOwnPayment(payment) ? payment : null;
  const ended = payment?.provider === "yallapp";
  const sells = currency ?? settings.currency;
  const { t, lang } = await dashboardText();
  const list = (p: keyof typeof PROVIDER_CURRENCIES) => (lang === "en" ? currencyList(p) : formatList(lang, PROVIDER_CURRENCIES[p], "disjunction"));
  return (
    // The page kit: a Section, its state on a soft line, then the account's keys.
    <Section titleId="h-payments" title={t("shop.cardPayments")} description={t("shop.cardIntro")} className="max-w-[640px]">
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
      ) : null}
      {ended ? (
        <Notice tone="warn" icon="warning">
          {t("shop.marketplaceEnded")}
        </Notice>
      ) : null}
      {own && !providerTakes(own.provider, sells) ? (
        <Notice tone="warn" icon="warning">
          {t("shop.currencyWarn", { provider: PROVIDER_NAME[own.provider], list: list(own.provider), currency: sells })}
        </Notice>
      ) : null}
      <details className="group rounded-xl border border-line-soft bg-sand p-4" open>
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[15px] font-bold [&::-webkit-details-marker]:hidden">
          <Icon name="credit_card" size={20} className="text-muted" />
          <span className="flex-1">{t("shop.ownAccount")}</span>
          <Icon name="expand_more" size={20} className="text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-4 pt-3">
          <p className="m-0 text-sm leading-relaxed text-ink-4">{t("shop.ownText")}</p>
          <PaymentKeysForm provider={own?.provider ?? null} sandbox={own?.sandbox ?? false} merchantId={own?.provider === "kashier" ? own.merchantId : ""} clientId={own?.provider === "paypal" ? own.clientId : ""} />
        </div>
      </details>
    </Section>
  );
}

/**
 * 96.2 Bank transfer and the owner's own method ("Cash on delivery"): the
 * customer picks one on the payment page and pays the business directly;
 * the order waits on Orders until the owner marks it paid.
 */
export async function OtherPayments({ app }: { app: App }) {
  if (!(await mayDo("billing"))) return null;
  const { t, lang } = await dashboardText();
  const manual = catalogSettings(app).manualPayments ?? null;
  const on = manualChoices(manual);
  const names = on.map((c) => (c.method === "bank_transfer" ? t("orders.bankTransfer") : c.name));
  return (
    <Section titleId="h-other-payments" title={t("shop.otherPayments")} description={t("shop.otherIntro")} className="max-w-[640px]">
      {on.length > 0 ? (
        <p className="m-0 flex items-center gap-2 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          <Icon name="check_circle" size={20} filled />
          {t("shop.otherOn", { methods: formatList(lang, names) })}
        </p>
      ) : null}
      <ManualPaymentsForm
        values={{
          bankTransfer: manual?.bankTransfer ?? "",
          customName: manual?.custom?.name ?? "",
          customInstructions: manual?.custom?.instructions ?? "",
          payWithinDays: String(manual?.payWithinDays ?? PAY_WITHIN_DAYS.default),
        }}
      />
    </Section>
  );
}
