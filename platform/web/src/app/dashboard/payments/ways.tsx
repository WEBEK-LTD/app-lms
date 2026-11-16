import { removePaymentKeysAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { mayDo, OwnerOnly } from "@/components/owner-only";
import { KitCallout, KitFold, KitSection, KitStatus } from "@/components/studio-page";
import { formatList } from "@/i18n/format";
import { manualChoices, PAY_WITHIN_DAYS } from "@/lib/catalog/manual";
import { catalogSettings, isOwnPayment } from "@/lib/catalog/settings";
import { dashboardText } from "@/lib/dashboard-lang";
import type { App, CatalogCurrency } from "@/lib/data/types";
import { currencyList, PROVIDER_NAME, providerTakes, takenCurrencies, type PROVIDER_CURRENCIES } from "@/lib/payments/provider";
import { ManualPaymentsForm } from "../catalog/forms";
import { GatewayWay } from "./gateway-way";
import { OwnGatewayForm } from "./own-gateway";

/**
 * 132.145 Payments › Ways customers pay, as the owner asked: one card at the
 * top with every way a customer may pay, each switched on alongside the
 * others: the card gateway (connected or not, its keys under Connect or
 * Edit), bank transfer and the owner's own way (cash on delivery), each
 * with its switch and its details only while it's on; the payment page
 * offers every one that's on. `cards`: the app takes its own card payments
 * here; `manual`: it sells what bank transfer and the owner's way can pay for.
 */
export async function WaysCustomersPay({ app, currency, cards, manual }: { app: App; currency: CatalogCurrency; cards: boolean; manual: boolean }) {
  const { t } = await dashboardText();
  // 60 Where the money goes is the owner's: the team sees that it's theirs to set.
  if (!(await mayDo("billing"))) return <OwnerOnly id="h-payments" title={t("shop.cardPayments")} />;
  return (
    <KitSection id="ways" titleId="h-ways" title={t("studioPage.waysTitle")} description={t("studioPage.waysLine")}>
      <div className="-mt-3 flex flex-col">
        {cards ? <CardWay app={app} currency={currency} /> : null}
        {manual ? <ManualWays app={app} /> : null}
      </div>
    </KitSection>
  );
}

/** The card gateway: its state as pills, the account it pays into, and its gateways and keys (Test connection their main action). */
async function CardWay({ app, currency }: { app: App; currency: CatalogCurrency }) {
  const { t, lang } = await dashboardText();
  const settings = catalogSettings(app);
  const payment = settings.payment;
  const own = isOwnPayment(payment) ? payment : null;
  // 72 A shop that had joined the old marketplace adds its own account.
  const ended = payment?.provider === "yallapp";
  const name = own ? PROVIDER_NAME[own.provider] : null;
  const tested = settings.gatewayTest && own && settings.gatewayTest.provider === own.provider ? settings.gatewayTest : null;
  const list = (p: keyof typeof PROVIDER_CURRENCIES) => (lang === "en" ? currencyList(p) : formatList(lang, takenCurrencies(p), "disjunction"));
  return (
    <GatewayWay
      connected={own !== null}
      labels={{ title: t("shop.cardPayments"), connect: t("gateways.connect"), edit: t("gateways.edit") }}
      status={
        own ? (
          <>
            <KitStatus tone="success">{t("gateways.connected")}</KitStatus>
            {tested?.ok ? <KitStatus tone="info">{t("studioPage.ready")}</KitStatus> : <KitStatus tone="warn">{t("studioPage.needsTest")}</KitStatus>}
          </>
        ) : (
          <KitStatus tone="neutral">{t("studioPage.notConnected")}</KitStatus>
        )
      }
      line={own ? t(own.sandbox ? "shop.onOwnSandbox" : "shop.onOwn", { provider: name! }) : t("shop.cardIntro")}
    >
      {ended ? (
        <KitCallout tone="warn" icon="warning">
          {t("shop.marketplaceEnded")}
        </KitCallout>
      ) : null}
      {own && !providerTakes(own.provider, currency) ? (
        <KitCallout tone="warn" icon="warning">
          {t("shop.currencyWarn", { provider: name!, list: list(own.provider), currency })}
        </KitCallout>
      ) : null}
      {/* The money is the owner's own: said once, folded. */}
      <KitFold icon="credit_card" summary={t("shop.ownAccount")}>
        <p className="m-0 text-sm leading-relaxed text-(--sp-muted)">{t("shop.ownText")}</p>
      </KitFold>
      <OwnGatewayForm app={app} currency={currency} />
      {own ? (
        <form action={removePaymentKeysAction} className="flex justify-end">
          <SubmitButton variant="danger" className="h-10 px-4 text-sm">
            {t("shop.removeKeys")}
          </SubmitButton>
        </form>
      ) : null}
    </GatewayWay>
  );
}

/** Bank transfer and the owner's own way, each with its switch; how they work folded. A region named "Bank transfer and your own method". */
async function ManualWays({ app }: { app: App }) {
  const { t, lang } = await dashboardText();
  const manual = catalogSettings(app).manualPayments ?? null;
  const on = manualChoices(manual);
  const names = on.map((c) => (c.method === "bank_transfer" ? t("orders.bankTransfer") : c.name));
  return (
    <section aria-labelledby="h-other-payments" className="flex flex-col border-t border-(--sp-line-soft)" data-other-payments="">
      <h3 id="h-other-payments" className="sr-only">
        {t("shop.otherPayments")}
      </h3>
      <ManualPaymentsForm
        values={{
          bankTransfer: manual?.bankTransfer ?? "",
          customName: manual?.custom?.name ?? "",
          customInstructions: manual?.custom?.instructions ?? "",
          payWithinDays: String(manual?.payWithinDays ?? PAY_WITHIN_DAYS.default),
        }}
        on={{ bank: on.some((c) => c.method === "bank_transfer"), custom: on.some((c) => c.method === "custom") }}
        status={on.length > 0 ? t("shop.otherOn", { methods: formatList(lang, names) }) : null}
        footer={
          <div className="pb-5">
            <KitFold icon="help" summary={t("studioPage.howItWorks")}>
              <p className="m-0 text-sm leading-relaxed text-(--sp-muted)">{t("shop.otherIntro")}</p>
            </KitFold>
          </div>
        }
      />
    </section>
  );
}
