import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { mayDo } from "@/components/owner-only";
import { KitHero } from "@/components/studio-page";
import { formatDate } from "@/i18n/format";
import { catalogSettings, isOwnPayment } from "@/lib/catalog/settings";
import { dashboardText } from "@/lib/dashboard-lang";
import type { App, CatalogCurrency } from "@/lib/data/types";
import { PROVIDER_NAME, providerTakes } from "@/lib/payments/provider";
import { webhookReceipt } from "@/lib/payments/webhooks";

type Tone = "ok" | "warn" | "fail" | "off";

const TONE: Record<Tone, { icon: string }> = {
  ok: { icon: "text-success" },
  warn: { icon: "text-warn" },
  fail: { icon: "text-danger" },
  off: { icon: "text-muted" },
};

/** 132.145 One fact of the hero: its icon and small label, its state in a larger weight. */
function Tile({ icon, label, value, tone, testId }: { icon: IconName; label: string; value: string; tone: Tone; testId: string }) {
  return (
    <li className="flex min-w-0 flex-col gap-2" data-summary={testId} data-tone={tone}>
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-(--sp-muted)">
        <Icon name={icon} size={17} filled className={TONE[tone].icon} />
        {label}
      </span>
      <span className="text-[17px] leading-snug font-bold break-words text-(--sp-ink)">{value}</span>
    </li>
  );
}

/**
 * 132.120 The top of the Payments page: which gateway is connected and in
 * which mode, the last "Test connection" and when, its webhook's state and
 * the currency it charges in, each on its tile with its state's colour.
 * For whoever may see where the money goes (the owner).
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
  // 132.145 The page's hero: the gateway, its last test, its webhook and the currency, each a state at a glance.
  return (
    <KitHero titleId="h-payments-summary" heading={t("gateways.summary")} data-payments-summary="">
      <ul className="m-0 grid list-none gap-x-6 gap-y-5 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(140px,100%),1fr))]">
        <Tile icon="credit_card" testId="gateway" label={t("gateways.sumGateway")} tone={own ? "ok" : "off"} value={own ? `${name} · ${t(live ? "gateways.modeLive" : "gateways.modeTest")}` : t("gateways.sumNone")} />
        <Tile
          icon="fact_check"
          testId="test"
          label={t("gateways.sumTest")}
          tone={test ? (test.ok ? "ok" : "fail") : "off"}
          value={test ? t(test.ok ? "gateways.sumTestOk" : "gateways.sumTestFail", { at: at(test.at) }) : t("gateways.sumTestNever")}
        />
        <Tile
          icon="sensors"
          testId="webhook"
          label={t("gateways.sumWebhook")}
          tone={!own || !usesWebhook ? "off" : refused ? "fail" : receipt?.at ? "ok" : "warn"}
          value={
            !own
              ? t("gateways.sumWebhookNoGateway")
              : !usesWebhook
                ? t("gateways.sumWebhookNone", { provider: name! })
                : refused
                  ? t("gateways.webhookRefused", { at: at(receipt!.failedAt!) })
                  : receipt?.at
                    ? t("gateways.webhookWorking", { at: at(receipt.at) })
                    : t("gateways.webhookWaiting")
          }
        />
        <Tile
          icon="payments"
          testId="currency"
          label={t("gateways.sumCurrency")}
          tone={takes ? (own ? "ok" : "off") : "warn"}
          value={takes ? t("gateways.sumCurrencyOk", { currency }) : t("gateways.sumCurrencyNo", { provider: name!, currency })}
        />
      </ul>
    </KitHero>
  );
}
