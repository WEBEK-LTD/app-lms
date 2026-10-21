import "server-only";
import { appLabel } from "../app/label";
import { appZone, DEFAULT_ZONE, zoneOfPhone } from "../analytics/zone";
import { orderNumber } from "../catalog/settings";
import { DEFAULT_CONTACT } from "../contact";
import type { DataStore } from "../data/store";
import type { App, CatalogOrder, Donation, PlanPayment } from "../data/types";
import { donationReference } from "../donations/service";
import { formatCents } from "../catalog/money";
import { newOrderMailValues } from "../catalog/payment";
import type { MailAttachment } from "../email/app-mail";
import { emailLangOf, sendTemplate } from "../email/send";
import { appUrl, signingSecret } from "../env";
import { formatDate } from "@/i18n/format";
import { orderReceiptUrl } from "./links";
import { publishedLayout } from "../pages/layout";
import { pickLanguage } from "../pages/translate";
import { planName } from "../plans";
import { getPlans, platformSetting } from "../settings/platform";
import { receiptNumber } from "../billing/receipt";
import { dashboardTextFor } from "../dashboard-words";
import { isLang, type Lang } from "@/i18n/config";
import { donationReceipt, orderReceipt, planReceipt, receiptFilename } from "./build";
import { renderReceiptPdf } from "./pdf";

/**
 * 71 The receipts' PDFs, with what they need read from the store: for the
 * download routes (dashboard, admin, the customers' signed links) and the
 * payment emails, which attach them (`receiptAttachment`).
 */

export interface ReceiptPdf {
  pdf: Buffer;
  filename: string;
}

/** 71 Yallapp's lines on its invoices (admin Settings › Invoices); none until the team sets them. */
export async function invoiceLines(store: DataStore): Promise<string[]> {
  return (await platformSetting(store, "invoice"))?.value.lines ?? [];
}

/** A plan or storage payment of the account, in `lang` (the payer's language unless given). Paid ones only. */
export async function planReceiptPdf(store: DataStore, payment: PlanPayment, lang?: Lang): Promise<ReceiptPdf | null> {
  if (payment.status !== "paid") return null;
  const client = await store.getClientById(payment.clientId);
  const owner = client ? await store.getUserById(client.userId) : null;
  if (!client || !owner) return null;
  const language = lang ?? emailLangOf(owner);
  const [plans, app, redemptions, contact, lines] = await Promise.all([
    getPlans(store),
    payment.appId ? store.getAppById(payment.appId) : null,
    store.listCouponRedemptions({ clientId: client.id }),
    platformSetting(store, "contact"),
    invoiceLines(store),
  ]);
  const ownApp = app && app.clientId === client.id ? app : null;
  const { k } = dashboardTextFor(language);
  const zone = ownApp ? await appZone(store, ownApp) : (zoneOfPhone(client.whatsapp) ?? DEFAULT_ZONE);
  const document = planReceipt({
    lang: language,
    payment,
    planName: k(planName(payment.plan, plans)),
    appName: ownApp ? (appLabel(ownApp) === "Untitled app" ? k("Untitled app") : appLabel(ownApp)) : null,
    billedTo: { name: owner.name, email: owner.email },
    coupon: redemptions.find((r) => r.paymentId === payment.id && r.status === "redeemed") ?? null,
    zone,
    contact: contact?.value ?? DEFAULT_CONTACT,
    invoiceLines: lines,
  });
  return { pdf: await renderReceiptPdf(document), filename: receiptFilename(receiptNumber(payment)) };
}

/**
 * The language of a business's receipt: the one asked for (`wanted`: a
 * `lang` parameter or the browser's Accept-Language) when the app has it,
 * else the app's main language; English when that isn't English, Arabic or
 * Turkish. A customer's own language isn't kept with their order.
 */
export async function customerLang(store: DataStore, app: Pick<App, "id">, wanted?: string | null): Promise<Lang> {
  const languages = (await publishedLayout(store, app.id))?.languages ?? null;
  const asked = wanted?.trim().toLowerCase() ?? "";
  if (isLang(asked) && (!languages || languages.available.includes(asked))) return asked;
  const chosen = languages ? pickLanguage(wanted, languages) : asked.split(/[-_,;]/)[0];
  return isLang(chosen) ? chosen : "en";
}

/** A customer's paid order (products, a restaurant's order, tickets, courses, a membership). */
export async function orderReceiptPdf(store: DataStore, app: App, order: CatalogOrder, lang?: Lang): Promise<ReceiptPdf | null> {
  if (order.appId !== app.id || !order.paidAt) return null;
  const document = orderReceipt({ lang: lang ?? (await customerLang(store, app)), app, order, zone: await appZone(store, app) });
  return { pdf: await renderReceiptPdf(document), filename: receiptFilename(orderNumber(order)) };
}

/** A paid (or refunded) donation. */
export async function donationReceiptPdf(store: DataStore, app: App, donation: Donation, lang?: Lang): Promise<ReceiptPdf | null> {
  if (donation.appId !== app.id || (donation.status !== "paid" && donation.status !== "refunded")) return null;
  const document = donationReceipt({ lang: lang ?? (await customerLang(store, app)), app, donation, zone: await appZone(store, app) });
  return { pdf: await renderReceiptPdf(document), filename: receiptFilename(donationReference(donation)) };
}

/**
 * The receipt to attach to a payment email. When it can't be made, the
 * reason is logged and the email goes out without it (the receipt stays a
 * download away).
 */
export async function receiptAttachment(make: () => Promise<ReceiptPdf | null>): Promise<MailAttachment[]> {
  try {
    const receipt = await make();
    return receipt ? [{ filename: receipt.filename, content: receipt.pdf, contentType: "application/pdf" }] : [];
  } catch (e) {
    console.error(`[receipts] the receipt PDF couldn't be made; the email goes without it: ${e instanceof Error ? e.message : String(e)}`.slice(0, 400));
    return [];
  }
}

/**
 * After an order is paid: the customer's "Order receipt" email in the
 * business's name, with the receipt's PDF. Never fails the payment.
 */
export async function sendOrderReceipt(store: DataStore, app: App, order: CatalogOrder): Promise<void> {
  const to = order.customer?.email;
  if (!to) return;
  try {
    const zone = await appZone(store, app);
    const lang = await customerLang(store, app);
    const attachments = await receiptAttachment(() => orderReceiptPdf(store, app, order, lang));
    const values = {
      org_name: app.appName?.trim() || "—",
      customer_name: order.customer!.name,
      order_number: orderNumber(order),
      total: formatCents(order.totalCents, order.currency),
      order_lines: newOrderMailValues(order, app.appName ?? "", "", zone).order_lines!,
      date: formatDate("en", order.paidAt ?? order.createdAt, { day: "numeric", month: "long", year: "numeric", timeZone: zone }),
      receipt_url: orderReceiptUrl(appUrl(), app.id, order.id, signingSecret()),
    };
    await sendTemplate("order_receipt", to, values, { app, attachments });
  } catch (e) {
    // The order is paid either way; the app and the order page have it.
    console.error(`[mail] the order receipt email failed: ${e instanceof Error ? e.message : String(e)}`.slice(0, 400));
  }
}

/** The response of a download route. */
export function pdfResponse(receipt: ReceiptPdf): Response {
  return new Response(new Uint8Array(receipt.pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${receipt.filename}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
