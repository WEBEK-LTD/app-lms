import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { mayDo } from "@/components/owner-only";
import { KitHero, KitStat } from "@/components/studio-page";
import { formatDate } from "@/i18n/format";
import { catalogSettings, isOwnPayment } from "@/lib/catalog/settings";
import { dashboardText } from "@/lib/dashboard-lang";
import type { App, CatalogCurrency } from "@/lib/data/types";
import { PROVIDER_NAME, providerTakes } from "@/lib/payments/provider";
import { webhookReceipt } from "@/lib/payments/webhooks";
import { walletDomain, walletLine } from "@/lib/payments/wallets";
import { appUrl, paymentApiUrls } from "@/lib/env";

/** A tile's state in words, smaller than a figure so it fits its tile (a gateway's name and a currency stay figures). */
function Words({ children }: { children: ReactNode }) {
  return <span className="block text-[24px] leading-[1.15] font-bold tracking-[-0.2px] break-words max-sm:text-[16px]">{children}</span>;
}

/** 155 The words of each state of Apple Pay and Google Pay (src/i18n/dashboard/gateways.ts). */
const WALLET_KEYS = {
  ready: "gateways.walletsReady",
  notYet: "gateways.walletsNotYet",
  partialApple: "gateways.walletsPartialApple",
  partialGoogle: "gateways.walletsPartialGoogle",
  inactive: "gateways.walletsInactive",
  unreachable: "gateways.walletsUnreachable",
  keysRefused: "gateways.walletsKeysRefused",
  forbidden: "gateways.walletsForbidden",
  refused: "gateways.walletsRefused",
} as const satisfies Record<NonNullable<ReturnType<typeof walletLine>>["code"], string>;

/**
 * 132.120 The top of the Payments page: which gateway is connected and in
 * which mode, the last "Test connection" and when, its webhook's state and
 * the currency it charges in. For whoever may see where the money goes (the
 * owner). 132.180 In the console's look: four tiles, the gateway the first
 * and dark; each a short state, its detail under it. 155 With Stripe, a line
 * under them: whether Apple Pay and Google Pay show in its card form (the
 * payment page's domain registered in the account), and why not yet.
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
  // 155 Apple Pay and Google Pay in Stripe's form: ready, or not yet and why.
  const wallets = walletLine(own, walletDomain(appUrl(), Boolean(paymentApiUrls().stripe)));
  const walletsKey = wallets ? WALLET_KEYS[wallets.code] : null;
  return (
    <KitHero
      label={t("gateways.summary")}
      data-payments-summary=""
      next={
        wallets && walletsKey ? (
          <p className="m-0 flex min-w-0 items-start gap-2.5 text-[14px] leading-relaxed text-(--sp-ink)" data-wallets={wallets.code} role="status">
            <Icon name={wallets.tone === "success" ? "check_circle" : "info"} size={20} className={`mt-0.5 shrink-0 ${wallets.tone === "success" ? "text-success" : wallets.tone === "warn" ? "text-warn" : "text-(--sp-muted)"}`} />
            <span className="min-w-0 break-words">
              {t(walletsKey, { domain: wallets.values.domain })}
              {wallets.tone !== "success" && wallets.code !== "notYet" ? ` ${t("gateways.walletsCards")}` : null}
              {"details" in wallets.values && wallets.values.details ? <span className="block text-[13px] text-(--sp-muted)">{t("gateways.walletsSaid", { details: wallets.values.details })}</span> : null}
            </span>
          </p>
        ) : undefined
      }
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
