import type { ReactNode } from "react";
import { mayDo } from "@/components/owner-only";
import { KitHero, KitStat } from "@/components/studio-page";
import { formatDate } from "@/i18n/format";
import { catalogSettings, isOwnPayment } from "@/lib/catalog/settings";
import { dashboardText } from "@/lib/dashboard-lang";
import type { App, CatalogCurrency } from "@/lib/data/types";
import { PROVIDER_NAME, providerTakes } from "@/lib/payments/provider";
import { webhookReceipt } from "@/lib/payments/webhooks";

/** A tile's state in words, smaller than a figure so it fits its tile (a gateway's name and a currency stay figures). */
function Words({ children }: { children: ReactNode }) {
  return <span className="block text-[24px] leading-[1.15] font-bold tracking-[-0.2px] break-words max-sm:text-[16px]">{children}</span>;
}

/**
 * 132.120 The top of the Payments page: which gateway is connected and in
 * which mode, the last "Test connection" and when, its webhook's state and
 * the currency it charges in. For whoever may see where the money goes (the
 * owner). 132.180 In the console's look: four tiles, the gateway the first
 * and dark; each a short state, its detail under it.
 */
export async function PaymentsSummary({ app, currency }: { app: App; currency: CatalogCurrency }) {
  if (!(await mayDo("billing"))) return null;
  const { t, lang } = await dashboardText();
  const settings = catalogSettings(app);
  const own = isOwnPayment(settings.payment) ? settings.payment : null;
  const at = (iso: string) => formatDate(lang, new Date(iso), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const name = own ? PROVIDER_NAME[own.provider] : null;
  const live = own ? !own.sandbox : false;
  const test = settings.gatewayTest && own && settings.gatewayTest.provider === own.provider ? settings.gatewayTest : null;
  const receipt = webhookReceipt(own);
  const usesWebhook = own ? own.provider === "stripe" || own.provider === "kashier" || own.provider === "fawaterk" : false;
  const refused = Boolean(receipt?.failedAt && (!receipt.at || receipt.failedAt >= receipt.at));
  const takes = own ? providerTakes(own.provider, currency) : true;
  const webhook: { value: string; hint?: string; tone: "success" | "warn" | "neutral" } = !own
    ? { value: t("gateways.tileNotYet"), hint: t("gateways.sumWebhookNoGateway"), tone: "neutral" }
    : !usesWebhook
      ? { value: t("gateways.tileWebhookNotUsed"), hint: t("gateways.sumWebhookNone", { provider: name! }), tone: "neutral" }
      : refused
        ? { value: t("gateways.tileWebhookRefused"), hint: t("gateways.tileCheckSecret", { at: at(receipt!.failedAt!) }), tone: "warn" }
        : receipt?.at
          ? { value: t("gateways.tileWebhookOk"), hint: t("gateways.tileLastOne", { at: at(receipt.at) }), tone: "success" }
          : { value: t("gateways.tileWebhookWaiting"), hint: t("gateways.tileNextPayment"), tone: "neutral" };
  return (
    <KitHero
      label={t("gateways.summary")}
      data-payments-summary=""
      stats={
        <>
          <KitStat
            icon="credit_card"
            label={t("gateways.sumGateway")}
            value={own ? <bdi dir="ltr">{name}</bdi> : <Words>{t("gateways.sumNone")}</Words>}
            hint={own ? t(live ? "gateways.modeLive" : "gateways.modeTest") : undefined}
          />
          <KitStat
            icon="fact_check"
            label={t("gateways.sumTest")}
            tone={test ? (test.ok ? "success" : "warn") : "neutral"}
            value={<Words>{test ? t(test.ok ? "gateways.tileWorked" : "gateways.tileNeedsWork") : t("gateways.tileNotYet")}</Words>}
            hint={test ? at(test.at) : t("gateways.sumTestNever")}
          />
          <KitStat icon="sensors" label={t("gateways.sumWebhook")} tone={webhook.tone} value={<Words>{webhook.value}</Words>} hint={webhook.hint} />
          <KitStat
            icon="payments"
            label={t("gateways.sumCurrency")}
            tone={takes ? (own ? "success" : "neutral") : "warn"}
            value={<bdi dir="ltr">{currency}</bdi>}
            hint={own ? (takes ? t("gateways.tileTakes", { provider: name! }) : t("gateways.sumCurrencyNo", { provider: name!, currency })) : t("gateways.tilePrices")}
          />
        </>
      }
    />
  );
}
