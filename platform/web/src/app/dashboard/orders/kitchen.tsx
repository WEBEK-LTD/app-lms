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

/** The order's lines with their options, how it's collected and who ordered. */
function OrderDetails({ order, kitchen }: { order: CatalogOrder; kitchen: FulfilmentSettings }) {
  const f = order.fulfilment;
  const c = order.customer;
  return (
    <>
      {f ? (
        <p className="m-0 text-[15px] font-semibold">
          {f.type === "delivery" ? "Delivery" : "Pickup"} · {f.scheduledFor ? scheduledText(f.scheduledFor, kitchen.timezone) : "as soon as possible"}
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
                <a href={`tel:${c.phone}`}>{c.phone}</a> · <a href={`mailto:${c.email}`}>{c.email}</a>
              </span>
            </>
          ) : null}
          {f?.address ? (
            <span className="whitespace-pre-line text-ink-4">
              Deliver to: {[f.address.address, f.address.district].filter(Boolean).join(", ")}
              {f.address.notes ? ` (${f.address.notes})` : ""}
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

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh seconds={30} />
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Kitchen</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Paid orders from your app, oldest first. Move each one on: the customer sees every step in the app and gets a notification. This page refreshes
          every 30 seconds.
        </p>
      </div>

      <section aria-labelledby="h-kitchen" className="flex flex-col gap-4">
        <h2 id="h-kitchen" className="m-0 text-lg font-bold">
          {queue.length === 0 ? "No orders in the kitchen" : `${queue.length} ${queue.length === 1 ? "order" : "orders"} in the kitchen`}
        </h2>
        {queue.length === 0 ? (
          <EmptyState icon="skillet" title="Nothing to prepare right now.">
            New paid orders show here with what was chosen, pickup or delivery and the time. We email you when one comes in.
          </EmptyState>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {queue.map((order) => {
              const step = order.fulfilmentStatus ?? "received";
              const next = order.fulfilment ? nextStep(step, order.fulfilment.type) : null;
              return (
                <li key={order.id} aria-label={`Order ${orderNumber(order)}`} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[17px] font-bold">
                      Order {orderNumber(order)} · {money(order, order.totalCents)}
                    </span>
                    <Badge tone={STEP_TONES[step]}>{FULFILMENT_LABELS[step]}</Badge>
                  </div>
                  <span className="text-[13px] text-muted">Paid {formatDateTime(order.paidAt)}</span>
                  <OrderDetails order={order} kitchen={kitchen} />
                  <div className="flex flex-wrap gap-2">
                    {next ? <MoveButton order={order} to={next} label={FULFILMENT_LABELS[next]} primary /> : null}
                    <MoveButton order={order} to="cancelled" label="Cancel order" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-past" className="flex flex-col gap-4">
        <h2 id="h-past" className="m-0 text-lg font-bold">
          Finished orders
        </h2>
        {past.items.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">Completed and cancelled orders show here.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {past.items.map((order, index) => (
              <li key={order.id} aria-label={`Order ${orderNumber(order)}`} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[16px] font-bold">
                    Order {orderNumber(order)} · {money(order, order.totalCents)}
                  </span>
                  <Badge tone="neutral">{order.status === "refunded" ? ORDER_STATUS_LABELS.refunded : FULFILMENT_LABELS[order.fulfilmentStatus ?? "completed"]}</Badge>
                </div>
                <OrderDetails order={order} kitchen={kitchen} />
                {/* 47 Refunds, in full or in part, through the provider or recorded. */}
                <RefundSection
                  kind="order"
                  id={order.id}
                  label={`order ${orderNumber(order)}`}
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
          <nav aria-label="Pages" className="flex items-center gap-3 text-[15px]">
            {page > 1 ? <Link href={`/dashboard/orders?page=${page - 1}`}>Newer</Link> : null}
            <span className="text-muted">
              Page {page} of {pages}
            </span>
            {page < pages ? <Link href={`/dashboard/orders?page=${page + 1}`}>Older</Link> : null}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
