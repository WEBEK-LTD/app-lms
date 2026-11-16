import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { mayDo } from "@/components/owner-only";
import { formatDate } from "@/i18n/format";
import { catalogSettings, isOwnPayment } from "@/lib/catalog/settings";
import { dashboardText } from "@/lib/dashboard-lang";
import type { App, CatalogCurrency } from "@/lib/data/types";
import { PROVIDER_NAME, providerTakes } from "@/lib/payments/provider";
import { webhookReceipt } from "@/lib/payments/webhooks";

type Tone = "ok" | "warn" | "fail" | "off";

const TONE: Record<Tone, { icon: string; dot: string }> = {
  ok: { icon: "text-success", dot: "bg-success" },
  warn: { icon: "text-warn", dot: "bg-warn" },
  fail: { icon: "text-danger", dot: "bg-danger" },
  off: { icon: "text-muted", dot: "bg-line-strong" },
};

function Tile({ icon, label, value, tone, testId }: { icon: IconName; label: string; value: string; tone: Tone; testId: string }) {
  return (
    <li className="flex min-w-0 items-start gap-3 rounded-2xl border border-line bg-white p-4" data-summary={testId} data-tone={tone}>
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-ivory">
        <Icon name={icon} size={22} filled className={TONE[tone].icon} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-xs font-bold tracking-[0.04em] text-muted uppercase">
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${TONE[tone].dot}`} />
          {label}
        </span>
        <span className="text-[15px] leading-snug font-semibold break-words text-midnight">{value}</span>
      </span>
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
  return (
    <section aria-labelledby="h-payments-summary" className="flex flex-col gap-3" data-payments-summary="">
      <h2 id="h-payments-summary" className="sr-only">
        {t("gateways.summary")}
      </h2>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-4">
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
    </section>
  );
}
