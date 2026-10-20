"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { actorOf, clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { recordRefund } from "@/lib/team/activity";
import { formatCents } from "@/lib/catalog/money";
import type { TeamPermission } from "@/lib/team/permissions";
import { ORDER_KINDS } from "@/lib/app/areas";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { sendTemplate } from "@/lib/email/send";
import { encryptionKey, paymentApiUrls } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { ipFromHeaders } from "@/lib/http";
import {
  donationRefundOptions,
  orderRefundOptions,
  readRefundForm,
  refundDonation,
  refundOrder,
  type RefundDeps,
  type RefundInput,
  type RefundOptions,
} from "@/lib/refunds/service";

/**
 * 47 The refund forms of Dashboard › Orders and Donations: the owner (or a
 * team member managing the dashboard) refunds part or all of a paid order
 * or donation through the provider, or records one made in its panel.
 */


async function requireApp(kinds: ReadonlySet<string>, permission: TeamPermission): Promise<ClientContext & { app: App }> {
  const context = await clientFor(permission);
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || !kinds.has(context.app.connector?.kind ?? "")) redirect("/dashboard");
  return context as ClientContext & { app: App };
}

async function deps(context: ClientContext): Promise<RefundDeps> {
  const who = actorOf(context);
  return {
    store: await getStore(),
    key: encryptionKey(),
    urls: paymentApiUrls(),
    now: new Date(),
    ip: ipFromHeaders(await headers()),
    actor: { id: who.id, email: who.email },
    mail: (key, to, values, app) => sendTemplate(key, to, values, { app }),
  };
}

function formOf(formData: FormData) {
  const text = (name: string) => String(formData.get(name) ?? "");
  return {
    amount: text("amount"),
    reason: text("reason"),
    note: text("note"),
    method: text("method"),
    reference: text("reference"),
    tickets: formData.getAll("tickets").map(String),
    courses: formData.getAll("courses").map(String),
    memberships: formData.getAll("memberships").map(String),
  };
}

async function run(
  formData: FormData,
  options: RefundOptions | null,
  refund: (input: RefundInput) => Promise<{ ok: boolean; message: string }>,
): Promise<FormState> {
  const form = formOf(formData);
  const values = {
    amount: form.amount,
    reason: form.reason,
    note: form.note,
    method: form.method,
    reference: form.reference,
  };
  if (!options) return { message: "Not found.", values };
  if (!options.refundable) return { message: options.why ?? "This can't be refunded.", values };
  const parsed = readRefundForm(form, options);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const result = await refund(parsed.input);
  if (!result.ok) return { message: result.message, values };
  return { ok: true, message: result.message };
}

export async function refundOrderAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp(ORDER_KINDS, "orders");
  const d = await deps(context);
  const id = Number(formData.get("id"));
  const order = Number.isSafeInteger(id) ? await d.store.getCatalogOrder(context.app.id, id) : null;
  const options = order ? await orderRefundOptions(d, context.app, order) : null;
  const state = await run(formData, options, async (input) => {
    const result = await refundOrder(d, context.app, order!, input);
    // 60 Who refunded, on the Team page.
    if (result.ok) await recordRefund(d.store, { clientId: context.client.id, appId: context.app.id, actor: actorOf(context), kind: "order", id: order!.id, amount: formatCents(input.cents, order!.currency) }, d.now);
    return result;
  });
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/events", "layout");
  return state;
}

export async function refundDonationAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp(new Set(["campaigns"]), "donations");
  const d = await deps(context);
  const id = Number(formData.get("id"));
  const donation = Number.isSafeInteger(id) ? await d.store.getDonation(context.app.id, id) : null;
  const options = donation ? await donationRefundOptions(d, context.app, donation) : null;
  const state = await run(formData, options, async (input) => {
    const result = await refundDonation(d, context.app, donation!, input);
    if (result.ok) await recordRefund(d.store, { clientId: context.client.id, appId: context.app.id, actor: actorOf(context), kind: "donation", id: donation!.id, amount: formatCents(input.cents, donation!.currency) }, d.now);
    return result;
  });
  revalidatePath("/dashboard/donations", "layout");
  revalidatePath("/dashboard/campaigns", "layout");
  return state;
}
