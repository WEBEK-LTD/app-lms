import type { Metadata } from "next";
import Link from "next/link";
import { setOrderStatusAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Badge, formatDateTime } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { ORDER_STATUS_LABELS, orderNumber } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import type { CatalogOrder, CatalogOrderStatus } from "@/lib/data/types";

export const metadata: Metadata = { title: "Orders" };

const PER_PAGE = 25;
const PAID: CatalogOrderStatus[] = ["processing", "completed", "cancelled", "refunded"];
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
  const { app } = await requireClient();
  if (!app || app.connector?.kind !== "catalog") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[28px] font-extrabold">Orders</h1>
        <p className="m-0 text-[17px] leading-relaxed text-ink-4">Orders from your app are on your website. This page is for shops without one.</p>
      </div>
    );
  }
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const store = await getStore();
  const { items, total } = await store.listCatalogOrders({ appId: app.id, statuses: PAID, offset: (page - 1) * PER_PAGE, limit: PER_PAGE });
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px] sm:text-[34px]">Orders</h1>
        <p className="m-0 text-[17px] leading-relaxed text-ink-4">
          Paid orders from your app, newest first. Mark them completed once they&apos;re delivered. Refunds are made in your iyzico panel.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="m-0 rounded-2xl border border-line bg-white p-5 text-[15px] text-muted sm:p-6">No orders yet.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {items.map((order) => (
            <li key={order.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[17px] font-bold">
                  Order {orderNumber(order)} · {formatCents(order.totalCents, order.currency)}
                </span>
                <Badge tone={TONES[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
              </div>
              <span className="text-[13px] text-muted">Paid {formatDateTime(order.paidAt)}</span>
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[15px]">
                {order.lines.map((l, i) => (
                  <li key={i}>
                    {l.name} × {l.quantity}
                  </li>
                ))}
                {order.shippingCents > 0 ? <li className="text-muted">Shipping {formatCents(order.shippingCents, order.currency)}</li> : null}
              </ul>
              {order.commissionCents !== null ? (
                <p className="m-0 text-sm text-ink-4">
                  Sold through Yallapp: commission {formatCents(order.commissionCents, order.currency)}, your share{" "}
                  <strong>{formatCents(order.totalCents - order.commissionCents, order.currency)}</strong>.{" "}
                  {order.payoutApprovedAt
                    ? `Released for payout on ${formatDateTime(order.payoutApprovedAt)}; iyzico pays it to your IBAN.`
                    : order.status === "processing"
                      ? "iyzico pays it to your IBAN after you mark the order completed."
                      : "Not released yet; message us on WhatsApp if it's late."}
                </p>
              ) : null}
              {order.customer ? (
                <div className="flex flex-col gap-0.5 rounded-xl bg-sand p-3.5 text-[15px]">
                  <span className="font-semibold">{order.customer.name}</span>
                  <span>
                    <a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a> · <a href={`mailto:${order.customer.email}`}>{order.customer.email}</a>
                  </span>
                  <span className="whitespace-pre-line text-ink-4">
                    {order.customer.address}, {order.customer.city}
                  </span>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {order.status === "processing" ? (
                  <>
                    <StatusButton order={order} status="completed" label="Mark completed" />
                    <StatusButton order={order} status="cancelled" label="Cancel order" />
                  </>
                ) : null}
                {order.status === "completed" || order.status === "cancelled" ? <StatusButton order={order} status="refunded" label="Mark refunded" /> : null}
              </div>
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
    </div>
  );
}
