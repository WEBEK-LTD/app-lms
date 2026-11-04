"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, requestIp, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App, ComplaintDecision, ComplaintStatus } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import { decideComplaint, supportReply, teamNote } from "@/lib/market/complaints";
import { complaintDecisionDeps } from "@/lib/market/decisions";
import { complaintReference } from "@/lib/market/json";
import { currencyDecimals, toMinor } from "@/lib/market/currency";

/**
 * 115.12 The app owner's complaint queue: replies the customer reads, the
 * team's own notes, who has the ticket, its status, sharing it with the
 * place, and the decision, carried out by lib/market/complaints.ts.
 */

const STATUSES: ComplaintStatus[] = ["open", "in_review", "waiting_for_customer"];
const OUTCOMES: ComplaintDecision["outcome"][] = ["refund", "partial_refund", "compensation", "no_refund"];
const TARGETS = ["payment", "wallet", "coupon"] as const;

async function requireMarketApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("orders");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "restaurants") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

/** Who did it, as the ticket shows it: the signed-in person's email. */
function whoOf(context: ClientContext): string {
  return (context.member ?? context.staff ?? context.user).email;
}

async function complaintOf(context: ClientContext & { app: App }, formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return null;
  return (await getStore()).getMarketComplaint(context.app.id, id);
}

function back(id: number, message?: string): never {
  revalidatePath("/dashboard/market/complaints", "layout");
  revalidatePath("/studio/project/market/complaints", "layout");
  redirect(`/dashboard/market/complaints/${id}${message ? `?error=${encodeURIComponent(message)}` : ""}`);
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

export async function replyComplaintAction(formData: FormData): Promise<void> {
  const context = await requireMarketApp();
  const c = await complaintOf(context, formData);
  if (!c) redirect("/dashboard/market/complaints");
  const patch = supportReply(c, text(formData, "text"), whoOf(context), new Date());
  if (patch) {
    await (await getStore()).updateMarketComplaint(context.app.id, c.id, { ...patch, assignee: c.assignee ?? whoOf(context) });
    await recordStaffChange(context, `Answered complaint ${complaintReference(c)}`);
  }
  back(c.id);
}

export async function noteComplaintAction(formData: FormData): Promise<void> {
  const context = await requireMarketApp();
  const c = await complaintOf(context, formData);
  if (!c) redirect("/dashboard/market/complaints");
  const patch = teamNote(c, text(formData, "text"), whoOf(context), new Date());
  if (patch) await (await getStore()).updateMarketComplaint(context.app.id, c.id, patch);
  back(c.id);
}

export async function takeComplaintAction(formData: FormData): Promise<void> {
  const context = await requireMarketApp();
  const c = await complaintOf(context, formData);
  if (!c) redirect("/dashboard/market/complaints");
  await (await getStore()).updateMarketComplaint(context.app.id, c.id, { assignee: whoOf(context), ...(c.status === "open" ? { status: "in_review" } : {}), updatedAt: new Date() });
  back(c.id);
}

export async function statusComplaintAction(formData: FormData): Promise<void> {
  const context = await requireMarketApp();
  const c = await complaintOf(context, formData);
  if (!c) redirect("/dashboard/market/complaints");
  const status = text(formData, "status") as ComplaintStatus;
  // Closing goes through a decision; these are the working states only.
  if (STATUSES.includes(status) && !c.decision) await (await getStore()).updateMarketComplaint(context.app.id, c.id, { status, updatedAt: new Date() });
  back(c.id);
}

export async function shareComplaintAction(formData: FormData): Promise<void> {
  const context = await requireMarketApp();
  const c = await complaintOf(context, formData);
  if (!c) redirect("/dashboard/market/complaints");
  await (await getStore()).updateMarketComplaint(context.app.id, c.id, { sharedWithVendor: formData.get("share") === "1", updatedAt: new Date() });
  await recordStaffChange(context, `${formData.get("share") === "1" ? "Shared" : "Stopped sharing"} complaint ${complaintReference(c)} with the place`);
  back(c.id);
}

export async function decideComplaintAction(formData: FormData): Promise<void> {
  const context = await requireMarketApp();
  const c = await complaintOf(context, formData);
  if (!c) redirect("/dashboard/market/complaints");
  const store = await getStore();
  const order = await store.getMarketOrder(context.app.id, c.orderId);
  if (!order) back(c.id, "The order isn't there any more.");
  const outcome = text(formData, "outcome") as ComplaintDecision["outcome"];
  if (!OUTCOMES.includes(outcome)) back(c.id, "Choose what you decide.");
  const to = text(formData, "to");
  const amountText = text(formData, "amount");
  const amount = amountText ? toMinor(amountText, currencyDecimals(order.currency)) : null;
  if (amountText && amount === null) back(c.id, "Write the amount as a number.");
  const now = new Date();
  const done = await decideComplaint(
    store,
    complaintDecisionDeps(store, context.app, encryptionKey(), { ip: await requestIp(), now }),
    c,
    order,
    {
      outcome,
      amount,
      to: (TARGETS as readonly string[]).includes(to) ? (to as (typeof TARGETS)[number]) : null,
      funder: text(formData, "funder") === "vendor" ? "vendor" : "owner",
      reason: text(formData, "reason") || null,
      shareWithVendor: formData.get("share") === "1",
    },
    whoOf(context),
    now,
  );
  if (!done.ok) back(c.id, done.error);
  await recordStaffChange(context, `Decided complaint ${complaintReference(c)}: ${outcome}`);
  back(c.id);
}
