import { rateText } from "@/lib/money/rates";
import type { Metadata } from "next";
import { deliveryDayLabel, deliveryOf, shopToday, slotLabel } from "@/lib/selling/delivery";
import { orderGroups } from "@/lib/selling/bouquet";
import { followsStages, nextStages } from "@/lib/catalog/order-stages";
import { stageRefundStatus } from "@/lib/catalog/stage-refunds";
import { taxLabel } from "@/lib/catalog/tax";
import Link from "next/link";
import { decideReturnAction, markStageRefundedAction, setOrderStatusAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { formatDateTime } from "@/components/ui";
import { FilterList } from "@/components/page-kit-client";
import { KitDrawer, KitEmpty, KitHeader, KitHero, KitPage, KitSection, KitStat, KitStatus, KitThumb, kit } from "@/components/studio-page";
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
import { StageForms } from "./stages";
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
const STAGE_TONES = { preparing: "info", shipped: "info", postponed: "warn", failed: "danger", returned: "neutral", delivered: "success" } as const;
const TONES = { processing: "info", completed: "success", cancelled: "neutral", refunded: "neutral", pending: "warn", failed: "danger" } as const;

function StatusButton({ order, status, label, row = false }: { order: CatalogOrder; status: CatalogOrderStatus; label: string; row?: boolean }) {
  return (
    <form action={setOrderStatusAction}>
      <input type="hidden" name="id" value={order.id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant={row ? "pill" : status === "completed" ? "primary" : "ghost"} className={row ? "h-9" : "h-10 px-4 text-sm"}>
        {label}
      </SubmitButton>
    </form>
  );
}

/** 132.132 A part of an order's drawer: a small heading over a quiet tinted box. */
const PART = "flex flex-col gap-2.5 rounded-2xl bg-(--sp-soft) p-4";

/** Paid orders from the app, for apps without a website. */
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { app } = await requireClient("orders");
  const { t, k, lang, num } = await dashboardText();
  // 27 A gym's membership payments are orders too, and 28 paid tickets.
  if (!app || (app.connector?.kind !== "catalog" && app.connector?.kind !== "courses" && app.connector?.kind !== "bookings" && app.connector?.kind !== "events" && app.connector?.kind !== "deliveries" && app.connector?.kind !== "restaurants" && app.connector?.kind !== "rides")) {
    return (
      <KitPage>
        <KitHeader icon="receipt_long" title={t("orders.title")} description={t("orders.notHere")} />
      </KitPage>
    );
  }
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  // 26 A restaurant's orders are its kitchen.
  const kitchen = app.connector.kind === "catalog" ? fulfilmentOf(app) : null;
  if (kitchen) return <KitchenView app={app} kitchen={kitchen} page={page} />;
  const store = await getStore();
  const { items, total } = await store.listCatalogOrders({ appId: app.id, statuses: PAID, offset: (page - 1) * PER_PAGE, limit: PER_PAGE });
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  // 132.132 The hero's numbers: what still waits for the owner, and what's done.
  const countOf = async (status: CatalogOrderStatus) => (await store.listCatalogOrders({ appId: app.id, statuses: [status], offset: 0, limit: 1 })).total;
  const [open, completed] = await Promise.all([countOf("processing"), countOf("completed")]);
  const closeLabel = t("common.close");
  // 47 Each order's refunds and what its Refund form offers.
  const key = encryptionKey();
  const [refunds, options] = await Promise.all([
    store.listRefunds(app.id, "order", items.map((o) => o.id)),
    Promise.all(items.map((o) => orderRefundOptions({ store, key }, app, o))),
  ]);

  // 132 The slots a postponed delivery may take, from the shop's today.
  const days = deliveryOf(app) ?? deliveryOf(app, true)!;
  const stageSlots = days.slots.map((s) => ({ id: s.id, label: slotLabel(s) }));
  const shopDay = shopToday(days, new Date()).date;
  const groupOf = (order: CatalogOrder) => (order.shipment && order.status === "processing" ? "shipped" : order.status);
  const groups = (["processing", "shipped", "completed", "cancelled", "refunded"] as const).map((value) => ({ value, label: value === "shipped" ? k("Shipped") : k(ORDER_STATUS_LABELS[value]) }));

  // 132.132 The premium kit: the header, the numbers in one hero card, the orders waiting for their payment, then each paid order as a row (a name, one pill, one action) with its details in a drawer.
  return (
    <KitPage>
      <KitHeader icon="receipt_long" title={t("orders.title")} description={t("studioPage.ordersLine")} help={t("orders.intro")} helpLabel={t("studioPage.help")} />
      {total > 0 ? (
        <KitHero
          label={t("orders.title")}
          stats={
            <>
              {/* 132.152 The first tile's bar: how many of the paid orders are done. */}
              <KitStat icon="package_2" tone="accent" label={t("studioPage.ordersOpen")} value={num(open)} progress={total ? completed / total : 0} />
              <KitStat icon="check_circle" tone="success" label={k(ORDER_STATUS_LABELS.completed)} value={num(completed)} />
              <KitStat icon="receipt_long" label={t("studioPage.ordersPaid")} value={num(total)} />
            </>
          }
        />
      ) : null}
      <AwaitingPayment app={app} />
      <KitSection titleId="h-orders" title={t("orders.paidCount", { count: total })} flush>
        {items.length === 0 ? (
          <KitEmpty icon="receipt_long" title={t("orders.noOrders")}>
            {t("orders.noOrdersText")}
          </KitEmpty>
        ) : (
          <FilterList
            allLabel={t("common.all")}
            searchLabel={t("orders.search")}
            noMatch={t("orders.noMatch")}
            filters={groups}
            items={items.map((order, index) => {
              const title = t("orders.orderTitle", { number: orderNumber(order), total: formatCents(order.totalCents, order.currency) });
              const paidLine = `${t("orders.paidOn", { date: formatDateTime(order.paidAt, lang) })}${order.refundedCents && order.status !== "refunded" ? ` · ${k(refundedLine(order.refundedCents, order.totalCents, order.currency) ?? "")}` : ""}`;
              const status = order.shipment && order.status === "processing" ? k("Shipped") : k(ORDER_STATUS_LABELS[order.status]);
              // 162 A bouquet the customer built counts once.
              const groups = orderGroups(order.lines);
              const count = groups.reduce((sum, g) => sum + (g.kind === "bouquet" ? 1 : g.line.addonOf ? 0 : g.line.quantity), 0);
              return {
                id: order.id,
                text: [String(orderNumber(order)), order.customer?.name, order.customer?.email, order.customer?.phone, order.customer?.city, ...order.lines.map((l) => l.name)].filter(Boolean).join(" "),
                group: groupOf(order),
                node: (
                  <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-(--sp-line-soft) px-3 py-2.5 first:border-t-0 sm:px-5" data-order={order.id}>
                    <KitDrawer
                      closeLabel={closeLabel}
                      title={title}
                      description={paidLine}
                      trigger={
                        <>
                          <KitThumb icon="receipt_long" />
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="text-[15px] font-semibold break-words">{title}</span>
                            <span className="text-[13px] text-(--sp-muted)">{[order.customer?.name, t("studioPage.orderItems", { count }), paidLine].filter(Boolean).join(" · ")}</span>
                            {/* 135.7 Paid in the customer's own currency: what the card was charged, at the day's rate. */}
                            {order.customerCurrency?.charged ? (
                              <span className="text-[13px] font-semibold text-(--sp-muted)" title={t("money.chargedHint")} data-order-charged="">
                                {t("money.charged", {
                                  amount: formatCents(order.customerCurrency.totalCents, order.customerCurrency.currency),
                                  rate: rateText(order.customerCurrency.rate, order.currency, order.customerCurrency.currency),
                                })}
                              </span>
                            ) : null}
                          </span>
                          <span className="flex shrink-0 flex-wrap items-center gap-1.5 max-sm:basis-full max-sm:ps-16">
                            <KitStatus tone={TONES[order.status]}>{status}</KitStatus>
                            {stageRefundStatus(order) === "needed" ? <KitStatus tone="warn">{t("orders.needsRefund")}</KitStatus> : null}
                          </span>
                        </>
                      }
                      triggerClassName="group -mx-2 flex min-w-0 flex-[1_1_300px] cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border-0 bg-transparent px-2 py-2 text-start text-(--sp-ink) transition-colors hover:bg-(--sp-soft) sm:flex-nowrap"
                    >
                      <ul aria-label={t("orders.orderAria", { number: orderNumber(order) })} className="m-0 flex list-none flex-col gap-1.5 p-0 text-[15px]">
                        {groups.map((g) =>
                          g.kind === "line" ? (
                            <li key={g.index} className={g.line.addonOf ? "ps-4 text-(--sp-muted)" : "font-semibold"} data-order-addon={g.line.addonOf ? "" : undefined}>
                              {/* 131 A gift add-on, under the item it went with. */}
                              {g.line.addonOf ? `+ ${t("shop.addonBadge")}: ` : null}
                              {g.line.name} × {g.line.quantity}
                            </li>
                          ) : (
                            // 162 A bouquet the customer built, as one: its flowers, its wrap, its card and the card's words.
                            <li key={`b-${g.id}`} className="flex flex-col gap-1 rounded-xl bg-(--sp-soft) px-3 py-2" data-order-bouquet={g.id}>
                              <span className="flex items-center gap-1.5 font-semibold">
                                <Icon name="local_florist" size={18} />
                                {t("orders.bouquet", { stems: g.stems })}
                              </span>
                              <ul className="m-0 flex list-none flex-col gap-0.5 p-0 ps-6 text-[14px]">
                                {g.lines.map(({ line: l, index }) => (
                                  <li key={index} data-bouquet-part={l.bouquet!.part}>
                                    {l.bouquet!.part === "wrap" ? `${t("orders.bouquetWrap")}: ` : l.bouquet!.part === "card" ? `${t("orders.bouquetCard")}: ` : null}
                                    {l.name} × {l.quantity}
                                  </li>
                                ))}
                              </ul>
                              {g.message ? (
                                <span className="ps-6 text-[14px] whitespace-pre-line text-(--sp-muted)" dir="auto" data-bouquet-message="">
                                  {t("orders.bouquetMessage", { message: g.message })}
                                </span>
                              ) : null}
                            </li>
                          ),
                        )}
                        {order.discountCents ? <li className="text-sm text-(--sp-muted)">{t("orders.coupon", { code: order.couponCode ?? "", amount: formatCents(order.discountCents, order.currency) })}</li> : null}
                        {/* 91.4 The loyalty points used on it, and those it earned. */}
                        {order.points?.discountCents ? (
                          <li className="text-sm text-(--sp-muted)">{t("orders.pointsUsed", { points: num(order.points.used), amount: formatCents(order.points.discountCents, order.currency) })}</li>
                        ) : null}
                        {order.points?.earned ? <li className="text-sm text-(--sp-muted)">{t("orders.pointsEarned", { points: num(order.points.earned) })}</li> : null}
                        {/* 91.5 The tax, added or inside the total. */}
                        {order.tax ? (
                          <li className="text-sm text-(--sp-muted)">
                            {t(order.tax.included ? "orders.taxIncluded" : "orders.taxAdded", { tax: taxLabel(order.tax), amount: formatCents(order.tax.cents, order.currency) })}
                          </li>
                        ) : null}
                        {order.shippingCents > 0 ? <li className="text-sm text-(--sp-muted)">{t("orders.shipping", { amount: formatCents(order.shippingCents, order.currency) })}</li> : null}
                      </ul>
                      {order.commissionCents !== null ? (
                        <p className="m-0 text-[13px] leading-relaxed text-(--sp-muted)">
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
                        <div className="flex flex-col gap-0.5 rounded-2xl bg-(--sp-soft) p-4 text-[15px]" data-order-customer="">
                          <span className="font-semibold">{order.customer.name}</span>
                          <span>
                            <a href={`tel:${order.customer.phone}`} dir="ltr">
                              {order.customer.phone}
                            </a>{" "}
                            · <a href={`mailto:${order.customer.email}`}>{order.customer.email}</a>
                          </span>
                          <span className="whitespace-pre-line text-(--sp-muted)">
                            {order.customer.address}, {order.customer.city}
                          </span>
                        </div>
                      ) : null}
                      {/* 131 The delivery day and slot, the sender and the recipient, the card, the zone and the fee. */}
                      {order.delivery && (order.delivery.date || order.delivery.sender || order.delivery.recipient || order.delivery.message) ? (
                        <section aria-label={t("selling.when")} className="grid gap-3 rounded-2xl bg-(--sp-soft) p-4 text-[15px] sm:grid-cols-2" data-order-delivery={order.id}>
                          {order.delivery.date ? (
                            <p className="m-0 sm:col-span-2">
                              <span className="font-semibold">{t("selling.when")}:</span> {deliveryDayLabel(order.delivery.date, lang)}
                              {order.delivery.slot ? ` · ${slotLabel(order.delivery.slot)}` : ""}
                              {order.delivery.shipping?.zone ? ` · ${t("selling.zone")}: ${order.delivery.shipping.zone}` : ""}
                              {order.shippingCents > 0 ? ` · ${t("selling.fee")}: ${formatCents(order.shippingCents, order.currency)}` : ""}
                            </p>
                          ) : null}
                          {order.delivery.sender ? (
                            <div className="flex flex-col gap-0.5" data-order-sender="">
                              <span className="text-[13px] font-bold text-(--sp-muted) uppercase">{t("selling.sender")}</span>
                              <span className="font-semibold">{order.delivery.sender.name}</span>
                              <a href={`tel:${order.delivery.sender.phone}`} dir="ltr">
                                {order.delivery.sender.phone}
                              </a>
                              <a href={`mailto:${order.delivery.sender.email}`}>{order.delivery.sender.email}</a>
                            </div>
                          ) : null}
                          {order.delivery.recipient ? (
                            <div className="flex flex-col gap-0.5" data-order-recipient="">
                              <span className="text-[13px] font-bold text-(--sp-muted) uppercase">{t("selling.recipientLabel")}</span>
                              <span className="font-semibold">{order.delivery.recipient.name}</span>
                              <a href={`tel:${order.delivery.recipient.phone}`} dir="ltr">
                                {order.delivery.recipient.phone}
                              </a>
                              {order.delivery.recipient.address ? (
                                <span className="text-(--sp-muted)">
                                  {order.delivery.recipient.address}
                                  {order.delivery.place?.city ? `, ${order.delivery.place.city}` : ""}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                          {order.delivery.message ? (
                            <p className="m-0 whitespace-pre-line rounded-xl bg-(--sp-surface) p-3 sm:col-span-2" dir="auto">
                              <span className="font-semibold">{t("selling.card")}:</span> {order.delivery.message}
                              {order.delivery.anonymous ? <span className="block text-[13px] text-(--sp-muted)">{t("selling.anonymousYes")}</span> : null}
                            </p>
                          ) : null}
                        </section>
                      ) : null}
                      {/* 132 Delivery: the stage, every change of it, and the next stages' buttons. */}
                      {followsStages(app, order) && (order.status === "processing" || order.stageLog?.length) ? (
                        <section aria-labelledby={`h-stage-${order.id}`} className={PART} data-stage={order.deliveryStage ?? "none"}>
                          <h3 id={`h-stage-${order.id}`} className="m-0 flex flex-wrap items-center gap-2 text-[15px] font-bold">
                            {t("orders.stagesTitle")}
                            {order.deliveryStage ? <KitStatus tone={STAGE_TONES[order.deliveryStage]}>{t(`orders.stage_${order.deliveryStage}`)}</KitStatus> : null}
                          </h3>
                          {order.stageLog?.length ? (
                            <ol className="m-0 flex list-none flex-col gap-2.5 p-0 text-[15px]" data-stage-history="">
                              {[...order.stageLog].reverse().map((e, i) => (
                                <li key={i} className="flex flex-col gap-0.5 border-s-2 border-(--sp-line) ps-3">
                                  <span className="font-semibold">
                                    {t(`orders.stage_${e.stage}`)}
                                    {e.reason ? ` · ${t(`orders.reason_${e.reason}`)}` : ""}
                                  </span>
                                  <span className="text-[13px] text-(--sp-muted)">{t("orders.stageBy", { by: e.by?.name ?? "Yallapp", when: formatDateTime(new Date(e.at), lang) })}</span>
                                  {e.date ? <span>{t("orders.stageDayLine", { day: `${deliveryDayLabel(e.date, lang)}${e.slot ? ` · ${slotLabel(e.slot)}` : ""}` })}</span> : null}
                                  {e.next ? <span>{t("orders.stageNextLine", { step: t(`orders.next_${e.next}`) })}</span> : null}
                                  {e.courier ? (
                                    <span>
                                      {t("orders.stageCourierLine", { courier: [e.courier.name, e.courier.phone].filter(Boolean).join(" · ") })}
                                    </span>
                                  ) : null}
                                  {e.trackingUrl ? (
                                    <a href={e.trackingUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                                      {t("orders.stageTracking")}
                                    </a>
                                  ) : null}
                                  {e.note ? (
                                    <span className="whitespace-pre-line text-(--sp-muted)" dir="auto">
                                      {t("orders.stageNoteLine", { note: e.note })}
                                    </span>
                                  ) : null}
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p className="m-0 text-sm text-(--sp-muted)">{t("orders.stagesIntro")}</p>
                          )}
                          {/* 132 The money back after a failed delivery cancelled it. */}
                          {stageRefundStatus(order) === "needed" ? (
                            <div className="flex flex-col gap-2 rounded-xl bg-warn-bg p-3 text-[15px]" data-refund-due="needed">
                              <span className="font-bold">{t("orders.needsRefund")}</span>
                              <span>{t("orders.needsRefundText", { amount: formatCents(order.stageRefund!.cents, order.currency) })}</span>
                              {order.stageRefund!.why ? <span className="text-(--sp-muted)">{k(order.stageRefund!.why)}</span> : null}
                              <form action={markStageRefundedAction}>
                                <input type="hidden" name="id" value={order.id} />
                                <SubmitButton className="h-9 px-3 text-sm">{t("orders.markRefunded")}</SubmitButton>
                              </form>
                            </div>
                          ) : stageRefundStatus(order) === "refunded" ? (
                            <p className="m-0 text-[15px] text-success" data-refund-due="refunded">
                              {t("orders.refundedAuto", { amount: formatCents(order.stageRefund!.cents, order.currency) })}
                            </p>
                          ) : stageRefundStatus(order) === "recorded" && order.stageRefund!.doneBy ? (
                            <p className="m-0 text-[15px] text-(--sp-muted)" data-refund-due="recorded">
                              {t("orders.refundRecorded", { by: order.stageRefund!.doneBy })}
                            </p>
                          ) : null}
                          <StageForms id={order.id} next={nextStages(app, order)} slots={stageSlots} today={shopDay} />
                        </section>
                      ) : null}
                      {/* 80.4 Shipping: any carrier, a tracking link, number or waybill. */}
                      {shippable(order) ? (
                        <section aria-labelledby={`h-ship-${order.id}`} className={PART} data-shipment={order.shipment ? "shipped" : "none"}>
                          <h3 id={`h-ship-${order.id}`} className="m-0 text-[15px] font-bold">
                            {t("orders.shippingTitle")}
                          </h3>
                          {order.shipment ? (
                            <div className="flex flex-col gap-0.5 text-[15px]">
                              <span className="text-(--sp-muted)">{t("orders.shippedOn", { date: formatDateTime(new Date(order.shipment.shippedAt), lang) })}</span>
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
                            <p className="m-0 text-sm text-(--sp-muted)">{t("orders.shippingIntro")}</p>
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
                        <section aria-labelledby={`h-return-${order.id}`} className={PART} data-return={order.returnRequest.status}>
                          <h3 id={`h-return-${order.id}`} className="m-0 flex flex-wrap items-center gap-2 text-[15px] font-bold">
                            {t("orders.returnTitle")}
                            <KitStatus tone={order.returnRequest.status === "approved" ? "success" : order.returnRequest.status === "declined" ? "neutral" : "warn"}>{t(`orders.return_${order.returnRequest.status}`)}</KitStatus>
                          </h3>
                          <div className="flex flex-col gap-0.5 text-[15px]">
                            <span className="text-(--sp-muted)">{t("orders.returnAskedOn", { date: formatDateTime(new Date(order.returnRequest.requestedAt), lang) })}</span>
                            <span className="font-semibold">{t(`orders.returnReason_${order.returnRequest.reason}`)}</span>
                            {order.returnRequest.note ? <span className="whitespace-pre-line">{order.returnRequest.note}</span> : null}
                            {order.returnRequest.reply ? <span className="text-(--sp-muted)">{t("orders.returnYourReply", { reply: order.returnRequest.reply })}</span> : null}
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
                              <p className="m-0 text-xs text-(--sp-muted)">{t("orders.returnRefundHint")}</p>
                            </form>
                          ) : null}
                        </section>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2 border-t border-(--sp-line-soft) pt-5">
                        {order.status === "processing" ? (
                          <>
                            <StatusButton order={order} status="completed" label={t("orders.markCompleted")} />
                            <StatusButton order={order} status="cancelled" label={t("orders.cancelOrder")} />
                          </>
                        ) : null}
                        {/* 71 The customer's receipt, the same PDF they got by email. */}
                        {order.paidAt ? (
                          <a href={orderReceiptUrl("", app.id, order.id, signingSecret())} download className={kit.ghost}>
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
                    </KitDrawer>
                    {/* The one action on the row: completing a paid order. */}
                    {order.status === "processing" ? <StatusButton order={order} status="completed" label={t("orders.markCompleted")} row /> : null}
                  </li>
                ),
              };
            })}
          />
        )}
        {pages > 1 ? (
          <nav aria-label={t("orders.pages")} className="flex items-center justify-between gap-3 border-t border-(--sp-line-soft) px-5 py-4 text-sm sm:px-8">
            {page > 1 ? (
              <Link href={`/dashboard/orders?page=${page - 1}`} className={kit.quiet}>
                {t("orders.newer")}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-(--sp-muted)">{t("common.page", { page, pages })}</span>
            {page < pages ? (
              <Link href={`/dashboard/orders?page=${page + 1}`} className={kit.quiet}>
                {t("orders.older")}
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </KitSection>
    </KitPage>
  );
}
