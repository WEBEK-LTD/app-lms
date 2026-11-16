import { Badge, Notice, Section, btn, formatDateTime } from "@/components/ui";
import { Icon } from "@/components/icon";
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
import { AttentionActions, CheckoutPaymentForm, type CheckoutChoice } from "./checkout-payment-form";

/** The store's platform, by its name. */
function platformName(app: App): string {
  const source = checkoutSourceOf(app);
  if (source === "wordpress") return "WordPress";
  if (source === "shopify") return "Shopify";
  if (app.connector?.kind === "platform") return platformDefinition(app.connector.platform)?.name ?? app.connector.platform;
  return "Wix / WordPress …";
}

/**
 * 134 Payments › How customers pay, for every store app: Yallapp's checkout
 * (its own products), the store's own checkout (a connected store's, as
 * before and the default), or inside the app (Demo), which needs the
 * owner's gateway connected and tested here, and a platform that takes
 * orders paid outside it.
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
  const gateway = readiness.gateway ? PROVIDER_NAME[readiness.gateway] : null;
  const gatewayState = readiness.testedAt ? "tested" : gateway ? "untested" : "missing";
  // 132.120 In the Payments page's design: wide, the three ways side by side, then what paying inside the app needs on its own card.
  return (
    <Section id="how-customers-pay" titleId="h-how-customers-pay" title={t("inAppPay.title")} description={t("inAppPay.intro")}>
      <CheckoutPaymentForm choices={choices} current={current} demo={{ title: t("inAppPay.demoTitle"), text: t("inAppPay.demoText") }} savable={owner && source !== "catalog"} />
      {source !== "catalog" && !readiness.blocked ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 text-[14px] leading-relaxed" data-in-app-needs="">
          <div className="flex flex-wrap items-start gap-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-ivory">
              <Icon name={readiness.testedAt ? "task_alt" : "pending"} size={22} filled className={readiness.testedAt ? "text-success" : "text-warn"} />
            </span>
            <span className="flex min-w-[12rem] flex-1 flex-col gap-0.5">
              <span className="font-bold text-midnight">{t("inAppPay.needsGateway")}</span>
              <span className="text-ink-3" data-gateway-state={gatewayState}>
                {readiness.testedAt && gateway
                  ? t("inAppPay.gatewayReady", { provider: gateway, at: formatDateTime(new Date(readiness.testedAt), lang) })
                  : gateway
                    ? t("inAppPay.gatewayNotTested", { provider: gateway })
                    : t("inAppPay.gatewayMissing")}
              </span>
            </span>
            <a href="#h-payments" className={`${btn.secondary} h-10`}>
              <Icon name="credit_card" size={18} />
              {t("inAppPay.goToGateway")}
            </a>
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 border-t border-line-soft p-0 pt-3 text-[13px] text-muted">
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
        </div>
      ) : null}
      {oldPlugin && catalogSettings(app).checkoutPayment === "in_app" ? (
        <Notice tone="warn" icon="warning">
          {t("inAppPay.pluginOld", { version: IN_APP_PLUGIN_VERSION })}
        </Notice>
      ) : null}
    </Section>
  );
}

/** 134 Payments made inside the app and the orders they made on the store; the ones needing attention with their actions. */
export async function InAppPayments({ app }: { app: App }) {
  const store = await getStore();
  const list = await store.listStorePlatformOrders(app.id, 30);
  if (list.length === 0 && catalogSettings(app).checkoutPayment !== "in_app") return null;
  const { t, lang } = await dashboardText();
  const owner = await mayDo("billing");
  const rows = await Promise.all(list.map(async (p) => ({ platformOrder: p, order: await store.getCatalogOrder(app.id, p.orderId) })));
  const attention = rows.filter((r) => r.platformOrder.status === "needs_attention").length;
  const status = (p: StorePlatformOrder) =>
    p.status === "placed" ? (
      <Badge tone="success">{t("inAppPay.statusPlaced", { number: p.platformOrderNumber ?? "" })}</Badge>
    ) : p.status === "needs_attention" ? (
      <Badge tone="danger">{t("inAppPay.statusAttention")}</Badge>
    ) : p.status === "refunded" ? (
      <Badge tone="neutral">{t("inAppPay.statusRefunded")}</Badge>
    ) : p.status === "placing" ? (
      <Badge tone="info">{t("inAppPay.statusPlacing")}</Badge>
    ) : (
      <Badge tone="neutral">{t("inAppPay.statusWaiting")}</Badge>
    );
  return (
    // 132.120 Wide like the rest of the page; each payment on its own card, the ones needing attention first in colour.
    <Section id="in-app-payments" titleId="h-in-app-payments" title={t("inAppPay.listTitle")} description={t("inAppPay.listIntro")}>
      {attention > 0 ? (
        <Notice tone="danger" icon="warning" role="alert">
          {t("inAppPay.attentionBanner", { count: attention })}
        </Notice>
      ) : null}
      {rows.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("inAppPay.listEmpty")}</p> : null}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.map(({ platformOrder: p, order }) =>
          order ? (
            <li
              key={p.id}
              className={`flex flex-col gap-2 rounded-2xl border bg-white p-4 ${p.status === "needs_attention" ? "border-danger" : "border-line"}`}
              data-in-app-payment={p.status}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-col">
                  <span className="text-[15px] font-semibold">{t("inAppPay.payment", { number: orderNumber(order) })}</span>
                  <span className="text-[13px] text-muted">
                    {formatDateTime(order.paidAt ?? order.createdAt, lang)} · {formatCents(order.totalCents, order.currency)}
                    {order.paymentProvider ? ` · ${PROVIDER_NAME[order.paymentProvider]}` : ""}
                  </span>
                </span>
                {status(p)}
              </div>
              {p.status === "needs_attention" ? (
                <>
                  {p.problem ? <p className="m-0 text-[14px] text-danger">{t("inAppPay.storeSaid", { message: p.problem.message })}</p> : null}
                  <p className="m-0 text-[13px] leading-relaxed text-ink-4">{t("inAppPay.attentionHelp")}</p>
                  {owner ? (
                    <AttentionActions
                      id={order.id}
                      refund={
                        order.paymentProvider && refundsByApi(order.paymentProvider)
                          ? t("inAppPay.refundAll", { amount: formatCents(order.totalCents - (order.refundedCents ?? 0), order.currency), provider: PROVIDER_NAME[order.paymentProvider] })
                          : null
                      }
                    />
                  ) : null}
                </>
              ) : null}
            </li>
          ) : null,
        )}
      </ul>
    </Section>
  );
}
