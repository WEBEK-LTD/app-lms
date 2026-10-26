import "server-only";
import type { DataStore } from "../data/store";
import type { App, CatalogOrder, OrderManualPayment } from "../data/types";
import { emailLangOf, sendTemplate } from "../email/send";
import { appUrl } from "../env";
import { getDashT } from "@/i18n/dashboard";
import { formatDate } from "@/i18n/format";
import { fulfilmentOf } from "./fulfilment";
import { formatCents } from "./money";
import { newOrderMailValues } from "./payment";
import { orderNumber } from "./settings";

/**
 * 96.2 After a customer chose bank transfer or the owner's own method: the
 * customer gets the business's details in its name, and the owner hears of
 * an order to mark paid when the money arrives. Never fails the order.
 */
export async function sendManualOrderMails(store: DataStore, app: App, order: CatalogOrder, payment: OrderManualPayment): Promise<void> {
  const zone = fulfilmentOf(app)?.timezone ?? "Europe/Istanbul";
  const due = formatDate("en", new Date(payment.dueAt), { day: "numeric", month: "long", year: "numeric", timeZone: zone });
  const lines = newOrderMailValues(order, app.appName ?? "", "", zone).order_lines!;
  const values = {
    org_name: app.appName?.trim() || "—",
    customer_name: order.customer?.name ?? "",
    order_number: orderNumber(order),
    total: formatCents(order.totalCents, order.currency),
    method: payment.name,
    instructions: payment.instructions,
    due_date: due,
    order_lines: lines,
  };
  if (order.customer?.email) {
    await sendTemplate("order_awaiting_payment", order.customer.email, values, { app }).catch((e: unknown) => {
      console.error(`[mail] the payment details email failed: ${e instanceof Error ? e.message : String(e)}`.slice(0, 400));
    });
  }
  const client = await store.getClientById(app.clientId);
  const owner = client ? await store.getUserById(client.userId) : null;
  if (!owner) return;
  const lang = emailLangOf(owner);
  const t = getDashT(lang);
  const ownerValues = {
    ...newOrderMailValues(order, app.appName ?? t("emails.yourAppName"), `${appUrl()}/dashboard/orders`, zone, lang),
    method: payment.method === "bank_transfer" ? t("orders.bankTransfer") : payment.name,
  };
  await sendTemplate("new_order_awaiting_payment", owner.email, ownerValues, { lang }).catch(() => {
    // The dashboard lists the order either way.
  });
}
