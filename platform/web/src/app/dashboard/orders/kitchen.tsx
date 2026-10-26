import Link from "next/link";
import { moveOrderAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Badge, EmptyState, formatDateTime } from "@/components/ui";
import { FULFILMENT_LABELS, nextStep } from "@/lib/catalog/fulfilment";
import { formatCents } from "@/lib/catalog/money";
import { optionsText } from "@/lib/catalog/options";
import { scheduledText } from "@/lib/catalog/payment";
import { ORDER_STATUS_LABELS, orderNumber } from "@/lib/catalog/settings";
import type { App, CatalogOrder, FulfilmentSettings, FulfilmentStatus } from "@/lib/data/types";
import { getStore } from "@/lib/data";
import { encryptionKey } from "@/lib/env";
import { orderRefundOptions } from "@/lib/refunds/service";
import { AutoRefresh } from "./refresh";
import { RefundSection } from "./refunds-view";
import { AwaitingPayment } from "./awaiting";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";
import { formatDate } from "@/i18n/format";

const PER_PAGE = 25;
const STEP_TONES = { received: "warn", preparing: "info", ready: "success", out_for_delivery: "info", completed: "neutral", cancelled: "neutral" } as const;

function MoveButton({ order, to, label, primary }: { order: CatalogOrder; to: FulfilmentStatus; label: string; primary?: boolean }) {
  return (
    <form action={moveOrderAction}>
      <input type="hidden" name="id" value={order.id} />
      <input type="hidden" name="to" value={to} />
      <SubmitButton variant={primary ? "primary" : "secondary"} className="h-10 px-4 text-sm">
        {label}
      </SubmitButton>
    </form>
  );
}

/** "at 18:30 on Fri 3 Oct" in the kitchen's time zone, in the dashboard's language. */
function scheduledIn(text: DashboardText, iso: string, timezone: string): string {
  if (text.lang === "en") return scheduledText(iso, timezone);
  const at = new Date(iso);
  return text.t("orders.scheduled", {
    time: formatDate(text.lang, at, { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
    date: formatDate(text.lang, at, { timeZone: timezone, weekday: "short", day: "numeric", month: "short" }),
  });
}

/** The order's lines with their options, how it's collected and who ordered. */
function OrderDetails({ order, kitchen, text }: { order: CatalogOrder; kitchen: FulfilmentSettings; text: DashboardText }) {
  const { t } = text;
  const f = order.fulfilment;
  const c = order.customer;
  const address = f?.address ? [f.address.address, f.address.district].filter(Boolean).join(", ") : "";
  return (
    <>
      {f ? (
        <p className="m-0 text-[15px] font-semibold">
          {t("orders.collect", {
            how: f.type === "delivery" ? t("shop.delivery") : t("shop.pickup"),
            when: f.scheduledFor ? scheduledIn(text, f.scheduledFor, kitchen.timezone) : t("orders.asap"),
          })}
        </p>
      ) : null}
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[15px]">
        {order.lines.map((l, i) => (
          <li key={i}>
            <span className="font-semibold">
              {l.quantity} × {l.name}
            </span>
            {l.options?.length ? <span className="block text-[14px] text-ink-4">{optionsText(l)}</span> : null}
          </li>
        ))}
      </ul>
      {c || f?.address ? (
        <div className="flex flex-col gap-0.5 rounded-xl bg-sand p-3.5 text-[15px]">
          {c ? (
            <>
              <span className="font-semibold">{c.name}</span>
              <span>
                <a href={`tel:${c.phone}`} dir="ltr">
                  {c.phone}
                </a>{" "}
                · <a href={`mailto:${c.email}`}>{c.email}</a>
              </span>
            </>
          ) : null}
          {f?.address ? (
            <span className="whitespace-pre-line text-ink-4">
              {f.address.notes ? t("orders.deliverToNotes", { address, notes: f.address.notes }) : t("orders.deliverTo", { address })}
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/**
 * 26 The Orders page of a restaurant: its kitchen. Paid orders still in the
 * kitchen come first, oldest first, each with a button for its next step and
 * one to cancel it; finished orders follow, newest first. Refreshes itself.
 */
export async function KitchenView({ app, kitchen, page }: { app: App; kitchen: FulfilmentSettings; page: number }) {
  const store = await getStore();
  const [active, past] = await Promise.all([
    store.listCatalogOrders({ appId: app.id, statuses: ["processing"], offset: 0, limit: 100 }),
    store.listCatalogOrders({ appId: app.id, statuses: ["completed", "cancelled", "refunded"], offset: (page - 1) * PER_PAGE, limit: PER_PAGE }),
  ]);
  // 47 The finished orders' refunds and Refund forms.
  const key = encryptionKey();
  const [refunds, options] = await Promise.all([
    store.listRefunds(app.id, "order", past.items.map((o) => o.id)),
    Promise.all(past.items.map((o) => orderRefundOptions({ store, key }, app, o))),
  ]);
  const queue = [...active.items].reverse();
  const pages = Math.max(1, Math.ceil(past.total / PER_PAGE));
  const money = (order: CatalogOrder, cents: number) => formatCents(cents, order.currency);
  const text = await dashboardText();
  const { t, k, lang } = text;

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh seconds={30} />
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("orders.kitchen")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("orders.kitchenIntro")}</p>
      </div>
      {/* 96.2 Orders to pay by bank transfer or the owner's own method reach the kitchen once marked paid. */}
      <AwaitingPayment app={app} />

      <section aria-labelledby="h-kitchen" className="flex flex-col gap-4">
        <h2 id="h-kitchen" className="m-0 text-lg font-bold">
          {queue.length === 0 ? t("orders.noKitchen") : t("orders.inKitchen", { count: queue.length })}
        </h2>
        {queue.length === 0 ? (
          <EmptyState icon="skillet" title={t("orders.nothingPrepare")}>
            {t("orders.nothingPrepareText")}
          </EmptyState>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {queue.map((order) => {
              const step = order.fulfilmentStatus ?? "received";
              const next = order.fulfilment ? nextStep(step, order.fulfilment.type) : null;
              return (
                <li
                  key={order.id}
                  aria-label={t("orders.orderAria", { number: orderNumber(order) })}
                  className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[17px] font-bold">{t("orders.orderTitle", { number: orderNumber(order), total: money(order, order.totalCents) })}</span>
                    <Badge tone={STEP_TONES[step]}>{k(FULFILMENT_LABELS[step])}</Badge>
                  </div>
                  <span className="text-[13px] text-muted">{t("orders.paidOn", { date: formatDateTime(order.paidAt, lang) })}</span>
                  <OrderDetails order={order} kitchen={kitchen} text={text} />
                  <div className="flex flex-wrap gap-2">
                    {next ? <MoveButton order={order} to={next} label={k(FULFILMENT_LABELS[next])} primary /> : null}
                    <MoveButton order={order} to="cancelled" label={t("orders.cancelOrder")} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-past" className="flex flex-col gap-4">
        <h2 id="h-past" className="m-0 text-lg font-bold">
          {t("orders.finished")}
        </h2>
        {past.items.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("orders.finishedEmpty")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {past.items.map((order, index) => (
              <li key={order.id} aria-label={t("orders.orderAria", { number: orderNumber(order) })} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[16px] font-bold">{t("orders.orderTitle", { number: orderNumber(order), total: money(order, order.totalCents) })}</span>
                  <Badge tone="neutral">{k(order.status === "refunded" ? ORDER_STATUS_LABELS.refunded : FULFILMENT_LABELS[order.fulfilmentStatus ?? "completed"])}</Badge>
                </div>
                <OrderDetails order={order} kitchen={kitchen} text={text} />
                {/* 47 Refunds, in full or in part, through the provider or recorded. */}
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
      </section>
    </div>
  );
}
