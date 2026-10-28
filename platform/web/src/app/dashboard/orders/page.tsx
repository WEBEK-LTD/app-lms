import type { Metadata } from "next";
import { taxLabel } from "@/lib/catalog/tax";
import Link from "next/link";
import { decideReturnAction, setOrderStatusAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, btn, formatDateTime } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { fulfilmentOf } from "@/lib/catalog/fulfilment";
import { ORDER_STATUS_LABELS, orderNumber } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import type { CatalogOrder, CatalogOrderStatus } from "@/lib/data/types";
import { encryptionKey, signingSecret } from "@/lib/env";
import { orderReceiptUrl } from "@/lib/receipts/links";
import { orderRefundOptions, refundedLine } from "@/lib/refunds/service";
import { KitchenView } from "./kitchen";
import { ShippingForm } from "./shipping";
import { CARRIER_SUGGESTIONS, shippable, waybillLink } from "@/lib/catalog/shipping";
import { RefundSection } from "./refunds-view";
import { AwaitingPayment } from "./awaiting";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";

export async function generateMetadata(): Promise<Metadata> {
  const { app } = await requireClient("orders");
  const { t } = await dashboardText();
  return { title: app?.vertical === "restaurant" && app.connector?.kind === "catalog" ? t("orders.kitchen") : t("orders.title") };
}

const PER_PAGE = 25;
const PAID: CatalogOrderStatus[] = ["processing", "completed", "cancelled", "refunded"];
/** 37 Who pays a marketplace order's share: iyzico itself, or Yallapp's team (Kashier, Fawaterk). */
const byIyzico = (order: Pick<CatalogOrder, "paymentProvider">) => !order.paymentProvider || order.paymentProvider === "iyzico";
const TONES = { processing: "info", completed: "success", cancelled: "neutral", refunded: "neutral", pending: "warn", failed: "danger" } as const;

function StatusButton({ order, status, label }: { order: CatalogOrder; status: CatalogOrderStatus; label: string }) {
  return (
    <form action={setOrderStatusAction}>
      <input type="hidden" name="id" value={order.id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant={status === "completed" ? "primary" : "secondary"} className="h-9 px-3 text-sm">
        {label}
      </SubmitButton>
    </form>
  );
}

/** Paid orders from the app, for apps without a website. */
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { app } = await requireClient("orders");
  const { t, k, lang, num } = await dashboardText();
  // 27 A gym's membership payments are orders too, and 28 paid tickets.
  if (!app || (app.connector?.kind !== "catalog" && app.connector?.kind !== "courses" && app.connector?.kind !== "bookings" && app.connector?.kind !== "events" && app.connector?.kind !== "deliveries" && app.connector?.kind !== "restaurants")) {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("orders.title")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("orders.notHere")}</p>
      </div>
    );
  }
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  // 26 A restaurant's orders are its kitchen.
  const kitchen = app.connector.kind === "catalog" ? fulfilmentOf(app) : null;
  if (kitchen) return <KitchenView app={app} kitchen={kitchen} page={page} />;
  const store = await getStore();
  const { items, total } = await store.listCatalogOrders({ appId: app.id, statuses: PAID, offset: (page - 1) * PER_PAGE, limit: PER_PAGE });
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  // 47 Each order's refunds and what its Refund form offers.
  const key = encryptionKey();
  const [refunds, options] = await Promise.all([
    store.listRefunds(app.id, "order", items.map((o) => o.id)),
    Promise.all(items.map((o) => orderRefundOptions({ store, key }, app, o))),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("orders.title")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("orders.intro")}</p>
      </div>
      <AwaitingPayment app={app} />
      {items.length === 0 ? (
        <EmptyState icon="receipt_long" title={t("orders.noOrders")}>
          {t("orders.noOrdersText")}
        </EmptyState>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {items.map((order, index) => (
            <li key={order.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[17px] font-bold">
                  {t("orders.orderTitle", { number: orderNumber(order), total: formatCents(order.totalCents, order.currency) })}
                </span>
                <Badge tone={TONES[order.status]}>{order.shipment && order.status === "processing" ? k("Shipped") : k(ORDER_STATUS_LABELS[order.status])}</Badge>
              </div>
              <span className="text-[13px] text-muted">
                {t("orders.paidOn", { date: formatDateTime(order.paidAt, lang) })}
                {order.refundedCents && order.status !== "refunded" ? ` · ${k(refundedLine(order.refundedCents, order.totalCents, order.currency) ?? "")}` : ""}
              </span>
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[15px]">
                {order.lines.map((l, i) => (
                  <li key={i}>
                    {l.name} × {l.quantity}
                  </li>
                ))}
                {order.discountCents ? <li className="text-muted">{t("orders.coupon", { code: order.couponCode ?? "", amount: formatCents(order.discountCents, order.currency) })}</li> : null}
                {/* 91.4 The loyalty points used on it, and those it earned. */}
                {order.points?.discountCents ? (
                  <li className="text-muted">{t("orders.pointsUsed", { points: num(order.points.used), amount: formatCents(order.points.discountCents, order.currency) })}</li>
                ) : null}
                {order.points?.earned ? <li className="text-muted">{t("orders.pointsEarned", { points: num(order.points.earned) })}</li> : null}
                {/* 91.5 The tax, added or inside the total. */}
                {order.tax ? (
                  <li className="text-muted">
                    {t(order.tax.included ? "orders.taxIncluded" : "orders.taxAdded", { tax: taxLabel(order.tax), amount: formatCents(order.tax.cents, order.currency) })}
                  </li>
                ) : null}
                {order.shippingCents > 0 ? <li className="text-muted">{t("orders.shipping", { amount: formatCents(order.shippingCents, order.currency) })}</li> : null}
              </ul>
              {order.commissionCents !== null ? (
                <p className="m-0 text-sm text-ink-4">
                  {richText(
                    t("orders.soldThrough", {
                      commission: formatCents(order.commissionCents, order.currency),
                      share: formatCents(order.totalCents - (order.refundedCents ?? 0) - order.commissionCents, order.currency),
                    }),
                    { b: (chunk) => <strong>{chunk}</strong> },
                  )}{" "}
                  {order.payoutApprovedAt
                    ? t(byIyzico(order) ? "orders.releasedIyzico" : "orders.releasedYallapp", { date: formatDateTime(order.payoutApprovedAt, lang) })
                    : order.status === "processing"
                      ? t(byIyzico(order) ? "orders.pendingIyzico" : "orders.pendingYallapp")
                      : t("orders.notReleased")}
                </p>
              ) : null}
              {order.customer ? (
                <div className="flex flex-col gap-0.5 rounded-xl bg-sand p-3.5 text-[15px]">
                  <span className="font-semibold">{order.customer.name}</span>
                  <span>
                    <a href={`tel:${order.customer.phone}`} dir="ltr">
                      {order.customer.phone}
                    </a>{" "}
                    · <a href={`mailto:${order.customer.email}`}>{order.customer.email}</a>
                  </span>
                  <span className="whitespace-pre-line text-ink-4">
                    {order.customer.address}, {order.customer.city}
                  </span>
                </div>
              ) : null}
              {/* 80.4 Shipping: any carrier, a tracking link, number or waybill. */}
              {shippable(order) ? (
                <section aria-labelledby={`h-ship-${order.id}`} className="flex flex-col gap-2.5 rounded-xl border border-line-soft p-3.5" data-shipment={order.shipment ? "shipped" : "none"}>
                  <h3 id={`h-ship-${order.id}`} className="m-0 text-[15px] font-bold">
                    {t("orders.shippingTitle")}
                  </h3>
                  {order.shipment ? (
                    <div className="flex flex-col gap-0.5 text-[15px]">
                      <span className="text-muted">{t("orders.shippedOn", { date: formatDateTime(new Date(order.shipment.shippedAt), lang) })}</span>
                      {order.shipment.carrier ? <span>{order.shipment.carrier}</span> : null}
                      {order.shipment.trackingNumber ? (
                        <span dir="ltr" className="font-semibold">
                          {order.shipment.trackingNumber}
                        </span>
                      ) : null}
                      <span className="flex flex-wrap gap-3">
                        {order.shipment.trackingUrl ? (
                          <a href={order.shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                            {t("orders.openTracking")}
                          </a>
                        ) : null}
                        {waybillLink(order.shipment.waybill) ? (
                          <a href={waybillLink(order.shipment.waybill)!} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                            {t("orders.openWaybill")}
                          </a>
                        ) : order.shipment.waybill ? (
                          <span dir="ltr">{order.shipment.waybill}</span>
                        ) : null}
                      </span>
                    </div>
                  ) : (
                    <p className="m-0 text-sm text-ink-4">{t("orders.shippingIntro")}</p>
                  )}
                  <ShippingForm
                    id={order.id}
                    carriers={CARRIER_SUGGESTIONS}
                    current={
                      order.shipment
                        ? { carrier: order.shipment.carrier ?? "", trackingNumber: order.shipment.trackingNumber ?? "", trackingUrl: order.shipment.trackingUrl ?? "", waybill: order.shipment.waybill ?? "" }
                        : null
                    }
                  />
                </section>
              ) : null}
              {/* 91.3 A return the customer asked for in the app. */}
              {order.returnRequest ? (
                <section aria-labelledby={`h-return-${order.id}`} className="flex flex-col gap-2.5 rounded-xl border border-line-soft p-3.5" data-return={order.returnRequest.status}>
                  <h3 id={`h-return-${order.id}`} className="m-0 flex flex-wrap items-center gap-2 text-[15px] font-bold">
                    {t("orders.returnTitle")}
                    <Badge tone={order.returnRequest.status === "approved" ? "success" : order.returnRequest.status === "declined" ? "neutral" : "warn"}>{t(`orders.return_${order.returnRequest.status}`)}</Badge>
                  </h3>
                  <div className="flex flex-col gap-0.5 text-[15px]">
                    <span className="text-muted">{t("orders.returnAskedOn", { date: formatDateTime(new Date(order.returnRequest.requestedAt), lang) })}</span>
                    <span className="font-semibold">{t(`orders.returnReason_${order.returnRequest.reason}`)}</span>
                    {order.returnRequest.note ? <span className="whitespace-pre-line">{order.returnRequest.note}</span> : null}
                    {order.returnRequest.reply ? <span className="text-muted">{t("orders.returnYourReply", { reply: order.returnRequest.reply })}</span> : null}
                  </div>
                  {order.returnRequest.status === "requested" ? (
                    <form action={decideReturnAction} className="flex flex-col gap-2">
                      <input type="hidden" name="id" value={order.id} />
                      <label htmlFor={`f-return-reply-${order.id}`} className="text-sm font-semibold">
                        {t("orders.returnReply")}
                      </label>
                      <textarea id={`f-return-reply-${order.id}`} name="reply" rows={2} maxLength={500} className="input" placeholder={t("orders.returnReplyHint")} />
                      <div className="flex flex-wrap gap-2">
                        <SubmitButton name="decision" value="approved" className="h-9 px-3 text-sm">
                          {t("orders.approveReturn")}
                        </SubmitButton>
                        <SubmitButton name="decision" value="declined" variant="secondary" className="h-9 px-3 text-sm">
                          {t("orders.declineReturn")}
                        </SubmitButton>
                      </div>
                      <p className="m-0 text-xs text-ink-4">{t("orders.returnRefundHint")}</p>
                    </form>
                  ) : null}
                </section>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {order.status === "processing" ? (
                  <>
                    <StatusButton order={order} status="completed" label={t("orders.markCompleted")} />
                    <StatusButton order={order} status="cancelled" label={t("orders.cancelOrder")} />
                  </>
                ) : null}
                {/* 71 The customer's receipt, the same PDF they got by email. */}
                {order.paidAt ? (
                  <a href={orderReceiptUrl("", app.id, order.id, signingSecret())} download className={`${btn.secondary} h-9 px-3 text-sm`}>
                    <Icon name="download" size={18} />
                    {t("orders.receiptPdf")}
                  </a>
                ) : null}
              </div>
              <RefundSection
                kind="order"
                id={order.id}
                label={t("orders.orderLabel", { number: orderNumber(order) })}
                currency={order.currency}
                refunds={refunds.filter((r) => r.targetId === order.id)}
                options={options[index]!}
                payoutReleased={Boolean(order.payoutApprovedAt)}
              />
            </li>
          ))}
        </ul>
      )}
      {pages > 1 ? (
        <nav aria-label={t("orders.pages")} className="flex items-center gap-3 text-[15px]">
          {page > 1 ? <Link href={`/dashboard/orders?page=${page - 1}`}>{t("orders.newer")}</Link> : null}
          <span className="text-muted">{t("common.page", { page, pages })}</span>
          {page < pages ? <Link href={`/dashboard/orders?page=${page + 1}`}>{t("orders.older")}</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
