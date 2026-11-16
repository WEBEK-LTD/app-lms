"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { actorOf, clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { catalogSettings } from "@/lib/catalog/settings";
import { formatCents } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { sendTemplate } from "@/lib/email/send";
import { encryptionKey, paymentApiUrls } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { ipFromHeaders } from "@/lib/http";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";
import { checkoutSourceOf, inAppBlock, inAppReadiness, placePlatformOrder, refundPlatformPayment } from "@/lib/selling/in-app-pay";
import { inAppPayDeps } from "@/lib/selling/in-app-pay-env";
import { recordRefund } from "@/lib/team/activity";

/**
 * 134 Payments › How customers pay, and the payments made inside the app:
 * the owner's choice (the store's checkout, or inside the app, Demo), and
 * for a payment whose order the store refused, creating it again or
 * refunding it. Where the money goes is the owner's (billing).
 */

async function requireStoreApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("billing");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.appType !== "store") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function refresh() {
  revalidatePath("/dashboard/payments");
  revalidatePath("/studio/project/payments");
}

/** How customers pay: the store's checkout (as before), or inside the app once the gateway is connected and tested. */
export async function saveCheckoutPaymentAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireStoreApp();
  const { app } = context;
  const choice = String(formData.get("checkoutPayment") ?? "");
  // Yallapp's own products always pay on Yallapp's checkout.
  if (checkoutSourceOf(app) === "catalog") return { ok: true, message: "Saved. Customers pay on Yallapp's checkout.", values: { checkoutPayment: "yallapp" } };
  if (choice !== "in_app" && choice !== "platform") return { message: "Choose how customers pay.", values: { checkoutPayment: choice } };
  if (choice === "in_app") {
    if (inAppBlock(app)) return { message: "Paying inside the app isn't available for this store.", values: { checkoutPayment: choice } };
    if (!inAppReadiness(app).ready) return { message: "Connect your payment gateway and pass Test connection first.", values: { checkoutPayment: choice } };
  }
  const before = catalogSettings(app).checkoutPayment ?? "platform";
  await (await getStore()).updateApp(app.id, { catalogSettings: { ...catalogSettings(app), checkoutPayment: choice } }, new Date());
  if (before !== choice) await recordStaffChange(context, choice === "in_app" ? "Turned on paying inside the app (Demo)" : "Turned off paying inside the app: customers pay on the store's checkout");
  // The WordPress site hears of it now (LicenseStatus.store_checkout).
  refreshSitesSoon([app.id]);
  refresh();
  return { ok: true, message: choice === "in_app" ? "Saved. Customers pay inside the app (Demo)." : "Saved. Customers pay on your store's checkout.", values: { checkoutPayment: choice } };
}

async function paymentOf(context: ClientContext & { app: App }, formData: FormData) {
  const store = await getStore();
  const id = Number(formData.get("id"));
  const order = Number.isSafeInteger(id) && id > 0 ? await store.getCatalogOrder(context.app.id, id) : null;
  const platformOrder = order ? await store.getStorePlatformOrder(context.app.id, order.id) : null;
  return { store, order, platformOrder };
}

/** A paid payment whose order the store refused: create it again. */
export async function retryPlatformOrderAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireStoreApp();
  const { store, order, platformOrder } = await paymentOf(context, formData);
  if (!order || !platformOrder) return { message: "Not found." };
  const placed = await placePlatformOrder(inAppPayDeps(store), context.app, order);
  refresh();
  if (placed.status === "placed") {
    await recordStaffChange(context, `Created the order of payment ${1000 + order.id} on the store again`);
    return { ok: true, message: "The order was created on your store." };
  }
  if (placed.status === "needs_attention") return { message: `Your store still didn't take the order: ${placed.message}` };
  if (placed.status === "busy") return { message: "The order is being created. Check again in a moment." };
  return { message: "This payment isn't paid, so there's no order to create." };
}

/** A paid payment whose order the store refused: give all of it back, through the gateway. */
export async function refundPlatformOrderAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireStoreApp();
  const { store, order, platformOrder } = await paymentOf(context, formData);
  if (!order || !platformOrder) return { message: "Not found." };
  const who = actorOf(context);
  const deps = {
    store,
    key: encryptionKey(),
    urls: paymentApiUrls(),
    now: new Date(),
    ip: ipFromHeaders(await headers()),
    actor: { id: who.id, email: who.email },
    mail: (key: Parameters<typeof sendTemplate>[0], to: string, values: Parameters<typeof sendTemplate>[2], app: App) => sendTemplate(key, to, values, { app }),
  };
  const result = await refundPlatformPayment(deps, context.app, order);
  if (!result.ok) return { message: result.message };
  await recordRefund(store, { clientId: context.client.id, appId: context.app.id, actor: who, kind: "order", id: order.id, amount: formatCents(result.refund.amountCents, order.currency) }, deps.now);
  refresh();
  return { ok: true, message: "Refunded. The customer gets their money back through the gateway." };
}
