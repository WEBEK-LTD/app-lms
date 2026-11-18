import { formatDateTime } from "@/components/ui";
import { KitCallout, KitFold, KitSection, KitSettings, KitStatus, kit } from "@/components/studio-page";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { mayDo } from "@/components/owner-only";
import { catalogSettings, orderNumber } from "@/lib/catalog/settings";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { App, StorePlatformOrder } from "@/lib/data/types";
import { platformDefinition } from "@/lib/hosted/connectors/platforms";
import { PROVIDER_NAME } from "@/lib/payments/provider";
import { refundsByApi } from "@/lib/payments/refund";
import { checkoutPaymentOf, checkoutSourceOf, IN_APP_PLUGIN_VERSION, inAppReadiness, pluginTakesInAppPayment } from "@/lib/selling/in-app-pay";
import { CheckoutPaymentForm, type CheckoutChoice } from "./checkout-payment-form";
import { HowCustomersPayRow, InAppTable, type InAppPaymentRow } from "./in-app-table";

/** The store's platform, by its name. */
function platformName(app: App): string {
  const source = checkoutSourceOf(app);
  if (source === "wordpress") return "WordPress";
  if (source === "shopify") return "Shopify";
  if (app.connector?.kind === "platform") return platformDefinition(app.connector.platform)?.name ?? app.connector.platform;
  return "Wix / WordPress …";
}

/** 132.120 Each way to pay by its picture (the row shows the one in use). */
const CHOICE_ICON: Record<CheckoutChoice["value"], IconName> = { yallapp: "shopping_bag", platform: "storefront", in_app: "smartphone" };

/**
 * 134 Payments › How customers pay, for every store app: Yallapp's checkout
 * (its own products), the store's own checkout (a connected store's, as
 * before and the default), or inside the app (Demo), which needs the
 * owner's gateway connected and tested here, and a platform that takes
 * orders paid outside it. 132.180 In the console: one setting row with the
 * way in use; the three ways, the Demo note and what paying inside the app
 * needs open under Change. An old plugin's warning stays in sight.
 */
export async function HowCustomersPay({ app }: { app: App }) {
  const { t, lang } = await dashboardText();
  const owner = await mayDo("billing");
  const source = checkoutSourceOf(app);
  const readiness = inAppReadiness(app);
  const store = await getStore();
  const license = source === "wordpress" ? await store.getLicenseForApp(app.clientId, app.id) : null;
  const activation = license ? await store.getActivation(license.id) : null;
  const oldPlugin = activation ? !pluginTakesInAppPayment(activation.pluginVersion) : false;
  const name = platformName(app);
  const blockedInApp =
    readiness.blocked === "own_products"
      ? t("inAppPay.yallappOnly")
      : readiness.blocked === "shopify_terms"
        ? t("inAppPay.blockedShopify")
        : readiness.blocked === "wix_unverified"
          ? t("inAppPay.blockedWix")
          : readiness.blocked === "own_api"
            ? t("inAppPay.blockedOwnApi")
            : readiness.blocked
              ? t("inAppPay.blockedPlatform", { platform: name })
              : !readiness.ready && catalogSettings(app).checkoutPayment !== "in_app"
                ? t("inAppPay.known.notReady")
                : null;
  const choices: CheckoutChoice[] = [
    { value: "yallapp", label: t("inAppPay.yallapp"), hint: t("inAppPay.yallappHint"), blocked: source === "catalog" ? null : t("inAppPay.yallappOnly"), tag: null },
    {
      value: "platform",
      label: t("inAppPay.platform", { platform: name }),
      hint: t("inAppPay.platformHint"),
      blocked: source === "catalog" ? t("inAppPay.yallappOnly") : null,
      tag: source === "catalog" ? null : t("inAppPay.isDefault"),
    },
    { value: "in_app", label: t("inAppPay.inApp"), hint: t("inAppPay.inAppHint"), blocked: source === "catalog" ? t("inAppPay.yallappOnly") : blockedInApp, tag: null },
  ];
  const current = source === "catalog" ? "yallapp" : checkoutPaymentOf(app) === "in_app" ? "in_app" : "platform";
  const inUse = choices.find((c) => c.value === current)!;
  const gateway = readiness.gateway ? PROVIDER_NAME[readiness.gateway] : null;
  const gatewayState = readiness.testedAt ? "tested" : gateway ? "untested" : "missing";
  return (
    <KitSettings>
      <HowCustomersPayRow
        icon={CHOICE_ICON[current]}
        title={t("inAppPay.title")}
        status={<KitStatus tone="success">{t("inAppPay.inUse")}</KitStatus>}
        description={inUse.label}
        change={t("inAppPay.change")}
      >
        <p className="m-0 text-[13.5px] leading-relaxed text-(--sp-muted)">{t("inAppPay.intro")}</p>
        <CheckoutPaymentForm choices={choices} current={current} demo={{ title: t("inAppPay.demoTitle"), text: t("inAppPay.demoText") }} savable={owner && source !== "catalog"} />
        {source !== "catalog" && !readiness.blocked ? (
          <div className="flex flex-col gap-3 border-t border-(--sp-line) pt-5" data-in-app-needs="">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-(--sp-cell)">
                <Icon name={readiness.testedAt ? "task_alt" : "pending"} size={21} filled className={readiness.testedAt ? "text-success" : "text-warn"} />
              </span>
              <span className="flex min-w-[12rem] flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2 text-[14.5px] font-bold text-(--sp-ink)">
                  {t("inAppPay.needsGateway")}
                  {gatewayState === "tested" ? (
                    <KitStatus tone="success">{t("gateways.ready")}</KitStatus>
                  ) : gatewayState === "untested" ? (
                    <KitStatus tone="warn">{t("gateways.needsTest")}</KitStatus>
                  ) : (
                    <KitStatus tone="neutral">{t("gateways.notConnected")}</KitStatus>
                  )}
                </span>
                <span className="text-[13.5px] text-(--sp-muted)" data-gateway-state={gatewayState}>
                  {readiness.testedAt && gateway
                    ? t("inAppPay.gatewayReady", { provider: gateway, at: formatDateTime(new Date(readiness.testedAt), lang) })
                    : gateway
                      ? t("inAppPay.gatewayNotTested", { provider: gateway })
                      : t("inAppPay.gatewayMissing")}
                </span>
              </span>
              <a href="#gateway" className={kit.quiet}>
                <Icon name="credit_card" size={17} />
                {t("inAppPay.goToGateway")}
              </a>
            </div>
            <KitFold icon="help" summary={t("studioPage.howItWorks")}>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px] text-(--sp-muted)">
                <li className="flex items-start gap-2">
                  <Icon name="check_circle" size={16} className="mt-0.5 shrink-0" />
                  {t("inAppPay.noFee")}
                </li>
                {source === "wordpress" ? (
                  <li className="flex items-start gap-2">
                    <Icon name="storefront" size={16} className="mt-0.5 shrink-0" />
                    {t("inAppPay.woo")}
                  </li>
                ) : null}
                {source === "wordpress" ? (
                  <li className="flex items-start gap-2">
                    <Icon name="info" size={16} className="mt-0.5 shrink-0" />
                    {t("inAppPay.fallback")}
                  </li>
                ) : null}
              </ul>
            </KitFold>
          </div>
        ) : null}
      </HowCustomersPayRow>
      {oldPlugin && catalogSettings(app).checkoutPayment === "in_app" ? (
        <div className="pb-5">
          <KitCallout tone="warn" icon="warning">
            {t("inAppPay.pluginOld", { version: IN_APP_PLUGIN_VERSION })}
          </KitCallout>
        </div>
      ) : null}
    </KitSettings>
  );
}

/**
 * 134 Payments made inside the app and the orders they made on the store.
 * 132.180 In the console: a table, each payment opening in the inspector
 * (the ones needing attention with what the store said, Retry and Refund);
 * how many need attention said above it.
 */
export async function InAppPayments({ app }: { app: App }) {
  const store = await getStore();
  const list = await store.listStorePlatformOrders(app.id, 30);
  if (list.length === 0 && catalogSettings(app).checkoutPayment !== "in_app") return null;
  const { t, lang } = await dashboardText();
  const owner = await mayDo("billing");
  const found = await Promise.all(list.map(async (p) => ({ platformOrder: p, order: await store.getCatalogOrder(app.id, p.orderId) })));
  const attention = found.filter((r) => r.platformOrder.status === "needs_attention").length;
  const statusLabel = (p: StorePlatformOrder) =>
    p.status === "placed"
      ? t("inAppPay.statusPlaced", { number: p.platformOrderNumber ?? "" })
      : p.status === "needs_attention"
        ? t("inAppPay.statusAttention")
        : p.status === "refunded"
          ? t("inAppPay.statusRefunded")
          : p.status === "placing"
            ? t("inAppPay.statusPlacing")
            : t("inAppPay.statusWaiting");
  const rows: InAppPaymentRow[] = found.flatMap(({ platformOrder: p, order }) =>
    order
      ? [
          {
            id: p.id,
            orderId: order.id,
            status: p.status,
            title: t("inAppPay.payment", { number: orderNumber(order) }),
            when: formatDateTime(order.paidAt ?? order.createdAt, lang),
            amount: formatCents(order.totalCents, order.currency, lang),
            provider: order.paymentProvider ? PROVIDER_NAME[order.paymentProvider] : null,
            statusLabel: statusLabel(p),
            problem: p.status === "needs_attention" && p.problem ? t("inAppPay.storeSaid", { message: p.problem.message }) : null,
            refund:
              order.paymentProvider && refundsByApi(order.paymentProvider)
                ? t("inAppPay.refundAll", { amount: formatCents(order.totalCents - (order.refundedCents ?? 0), order.currency, lang), provider: PROVIDER_NAME[order.paymentProvider] })
                : null,
          },
        ]
      : [],
  );
  return (
    <KitSection id="in-app-payments" titleId="h-in-app-payments" title={t("inAppPay.listTitle")} description={t("inAppPay.listIntro")} flush>
      {attention > 0 ? (
        <div className="px-5 pb-4">
          <KitCallout tone="danger" icon="warning" role="alert">
            {t("inAppPay.attentionBanner", { count: attention })}
          </KitCallout>
        </div>
      ) : null}
      {rows.length === 0 ? <p className="m-0 border-t border-(--sp-line) px-5 py-6 text-[14.5px] text-(--sp-muted)">{t("inAppPay.listEmpty")}</p> : <InAppTable rows={rows} owner={owner} />}
    </KitSection>
  );
}
