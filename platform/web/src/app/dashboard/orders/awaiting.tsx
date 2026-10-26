import { setOrderStatusAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Badge, formatDateTime } from "@/components/ui";
import { formatCents } from "@/lib/catalog/money";
import { optionsText } from "@/lib/catalog/options";
import { orderNumber } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import type { App, CatalogOrder } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";

function StatusButton({ order, status, label, primary }: { order: CatalogOrder; status: "processing" | "cancelled"; label: string; primary?: boolean }) {
  return (
    <form action={setOrderStatusAction}>
      <input type="hidden" name="id" value={order.id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant={primary ? "primary" : "secondary"} className="h-9 px-3 text-sm">
        {label}
      </SubmitButton>
    </form>
  );
}

/**
 * 96.2 Orders placed to pay by bank transfer or the owner's own method, above
 * the paid ones (and a restaurant's kitchen): Mark as paid once the money
 * arrived (the order is then delivered and the customer gets their receipt),
 * or Cancel. Nothing shows when there are none.
 */
export async function AwaitingPayment({ app }: { app: App }) {
  const { items } = await (await getStore()).listCatalogOrders({ appId: app.id, statuses: ["pending"], manualOnly: true, offset: 0, limit: 50 });
  if (items.length === 0) return null;
  const { t, lang } = await dashboardText();
  const now = new Date();
  return (
    <section aria-labelledby="h-awaiting" className="flex flex-col gap-3">
      <div className="flex max-w-[620px] flex-col gap-1">
        <h2 id="h-awaiting" className="m-0 text-lg font-bold">
          {t("orders.awaitingTitle")}
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("orders.awaitingIntro")}</p>
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((order) => {
          const payment = order.manualPayment!;
          const due = new Date(payment.dueAt);
          return (
            <li key={order.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5" data-awaiting={order.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[17px] font-bold">{t("orders.orderTitle", { number: orderNumber(order), total: formatCents(order.totalCents, order.currency) })}</span>
                <Badge tone="warn">{due < now ? t("orders.overdue") : t("orders.awaitingTitle")}</Badge>
              </div>
              <span className="text-[13px] text-muted">
                {t("orders.awaitingLine", {
                  method: payment.method === "bank_transfer" ? t("orders.bankTransfer") : payment.name,
                  placed: formatDateTime(order.updatedAt, lang),
                  due: formatDateTime(due, lang),
                })}
              </span>
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[15px]">
                {order.lines.map((l, i) => (
                  <li key={i}>
                    {l.name}
                    {l.options?.length ? ` (${optionsText(l)})` : ""} × {l.quantity}
                  </li>
                ))}
              </ul>
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
              <div className="flex flex-wrap gap-2">
                <StatusButton order={order} status="processing" label={t("orders.markPaid")} primary />
                <StatusButton order={order} status="cancelled" label={t("orders.cancelOrder")} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
