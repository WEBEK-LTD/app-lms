import { setOrderStatusAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { formatDateTime } from "@/components/ui";
import { KitDrawer, KitSection, KitStatus, KitThumb } from "@/components/studio-page";
import { formatCents } from "@/lib/catalog/money";
import { optionsText } from "@/lib/catalog/options";
import { orderNumber } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import type { App, CatalogOrder } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";

function StatusButton({ order, status, label, row }: { order: CatalogOrder; status: "processing" | "cancelled"; label: string; row?: boolean }) {
  return (
    <form action={setOrderStatusAction}>
      <input type="hidden" name="id" value={order.id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant={row ? "pill" : "ghost"} className={row ? "h-9" : "h-10 px-4 text-sm"}>
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
    // 132.132 The premium kit: a flush section, each order a row (a name, one pill, "Mark as paid") with its lines, the customer and Cancel in a drawer.
    <KitSection titleId="h-awaiting" title={t("orders.awaitingTitle")} help={t("orders.awaitingIntro")} helpLabel={t("studioPage.helpSection")} flush>
      <ul className="m-0 flex list-none flex-col p-0">
        {items.map((order) => {
          const payment = order.manualPayment!;
          const due = new Date(payment.dueAt);
          const title = t("orders.orderTitle", { number: orderNumber(order), total: formatCents(order.totalCents, order.currency) });
          const line = t("orders.awaitingLine", {
            method: payment.method === "bank_transfer" ? t("orders.bankTransfer") : payment.name,
            placed: formatDateTime(order.updatedAt, lang),
            due: formatDateTime(due, lang),
          });
          return (
            <li key={order.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-(--sp-line-soft) px-3 py-2.5 first:border-t-0 sm:px-5" data-awaiting={order.id}>
              <KitDrawer
                closeLabel={t("common.close")}
                title={title}
                description={line}
                trigger={
                  <>
                    <KitThumb icon="hourglass_top" />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-[15px] font-semibold break-words">{title}</span>
                      <span className="text-[13px] text-(--sp-muted)">{[order.customer?.name, line].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="flex shrink-0 max-sm:basis-full max-sm:ps-16">
                      <KitStatus tone="warn">{due < now ? t("orders.overdue") : t("orders.awaitingTitle")}</KitStatus>
                    </span>
                  </>
                }
                triggerClassName="group -mx-2 flex min-w-0 flex-[1_1_300px] cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border-0 bg-transparent px-2 py-2 text-start text-(--sp-ink) transition-colors hover:bg-(--sp-soft) sm:flex-nowrap"
              >
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[15px] font-semibold">
                  {order.lines.map((l, i) => (
                    <li key={i}>
                      {l.name}
                      {l.options?.length ? ` (${optionsText(l)})` : ""} × {l.quantity}
                    </li>
                  ))}
                </ul>
                {order.customer ? (
                  <div className="flex flex-col gap-0.5 rounded-2xl bg-(--sp-soft) p-4 text-[15px]">
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
                <div className="flex flex-wrap gap-2 border-t border-(--sp-line-soft) pt-5">
                  <StatusButton order={order} status="cancelled" label={t("orders.cancelOrder")} />
                </div>
              </KitDrawer>
              {/* The one action on the row: the money arrived. */}
              <StatusButton order={order} status="processing" label={t("orders.markPaid")} row />
            </li>
          );
        })}
      </ul>
    </KitSection>
  );
}
