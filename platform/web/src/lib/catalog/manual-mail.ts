import "server-only";
import type { DataStore } from "../data/store";
import type { App, CatalogOrder, OrderManualPayment } from "../data/types";
import { appLogoUrl } from "../assets";
import { emailLangOf, renderEmail, sendAppMail, sendTemplate } from "../email/send";
import { awaitingPaymentHtml, awaitingPaymentSubject, awaitingPaymentText, bankTransferName, type AwaitingPaymentEmailInput } from "../email/order-awaiting-payment-email";
import { customerLang } from "../receipts/service";
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
  if (order.customer?.email) {
    await sendAwaitingPaymentMail(store, app, order, payment, zone).catch((e: unknown) => {
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

/**
 * 200 The customer's "how to pay" email, in the receipt's premium look (the
 * business's logo and colour, light and dark) and the customer's language.
 * A template the team edited in the admin keeps its words for the subject
 * and the text part.
 */
async function sendAwaitingPaymentMail(store: DataStore, app: App, order: CatalogOrder, payment: OrderManualPayment, zone: string): Promise<void> {
  const lang = await customerLang(store, app, order.lang);
  const shopName = app.appName?.trim() || "—";
  const day = { day: "numeric", month: "long", year: "numeric", timeZone: zone } as const;
  const input: AwaitingPaymentEmailInput = {
    lang,
    shopName,
    logoUrl: appLogoUrl(app),
    brand: app.primaryColor,
    customerName: order.customer?.name ?? "",
    orderNumber: orderNumber(order),
    method: payment.method === "bank_transfer" ? bankTransferName(lang) : payment.name,
    instructions: payment.instructions,
    dueDate: formatDate(lang, new Date(payment.dueAt), day),
    total: formatCents(order.totalCents, order.currency),
    lines: newOrderMailValues(order, app.appName ?? "", "", zone, lang).order_lines!.split("\n").filter((line) => line.trim() !== ""),
  };
  const saved = await store.getEmailTemplate("order_awaiting_payment");
  const edited = saved
    ? await renderEmail(
        store,
        "order_awaiting_payment",
        {
          org_name: shopName,
          customer_name: input.customerName,
          order_number: input.orderNumber,
          total: input.total,
          method: payment.name,
          instructions: payment.instructions,
          due_date: formatDate("en", new Date(payment.dueAt), day),
          order_lines: newOrderMailValues(order, app.appName ?? "", "", zone).order_lines!,
        },
        { subject: saved.subject, body: saved.body },
      )
    : null;
  await sendAppMail(store, app, {
    to: order.customer!.email,
    subject: edited?.subject ?? awaitingPaymentSubject(lang, shopName, input.orderNumber),
    text: edited?.text ?? awaitingPaymentText(input),
    html: awaitingPaymentHtml(input),
  });
}
