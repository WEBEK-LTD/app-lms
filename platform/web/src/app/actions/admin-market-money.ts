"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { encryptionKey } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { cancelPayout, markPayoutSent, preparePayouts } from "@/lib/studio-market/money";
import { reviewPayoutDetails } from "@/lib/studio-market/payout-details";
import { payoutNow } from "@/lib/studio-market/payout-clock";
import { sendDetailsDecision, sendPayoutReceipt } from "@/lib/studio-market/payout-mail";
import { formatUsd } from "@/lib/studio-market/plans";

/**
 * 106.11 Admin › Studio Market › Payouts and Payout checks: the team's side
 * of the designer's money, permission `market.payouts` (owners and admins).
 * Approve a designer's checks or ask for a fix with a note; from the 1st,
 * prepare the month's bank file (each due designer's balance of the sales
 * paid before the cut-off, fixed); mark a payout sent
 * with the bank's reference and date (the designer is emailed a receipt in
 * their language), or cancel one the bank didn't send. Each one is in the
 * audit log, never with an ID number or an account in it. Nothing here
 * moves money: the team sends the transfers from Yallapp's bank.
 */

const PAYOUTS = "/admin/market/payouts";
const CHECKS = "/admin/market/payouts/checks";

function refresh() {
  revalidatePath("/admin/market", "layout");
  revalidatePath("/designer", "layout");
}

export async function reviewPayoutDetailsAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("market.payouts");
  const store = await getStore();
  const now = new Date();
  const designerId = String(formData.get("designer") ?? "");
  const decision = formData.get("decision") === "approve" ? "approve" : "fix";
  const note = String(formData.get("note") ?? "");
  const seen = new Date(String(formData.get("seen") ?? ""));
  const values = { note };
  const [designer, details] = await Promise.all([store.getTemplateDesigner(designerId), store.getDesignerPayoutDetails(designerId)]);
  if (!designer || !details || Number.isNaN(seen.getTime())) return { message: "These checks aren't there any more. Reload the page.", values };
  const result = await reviewPayoutDetails(store, details, { decision, note, seen }, admin.email, now);
  if (!result.ok) return { errors: result.errors, message: result.errors.form, values };
  await recordAudit({
    actor: admin,
    action: decision === "approve" ? "market.details_approved" : "market.details_fix",
    target: { type: "market_designer", id: designer.id },
    clientId: designer.clientId,
    summary: decision === "approve" ? `Approved the payout checks of “${designer.name}”` : `Asked “${designer.name}” to fix their payout checks`,
    before: { status: details.status },
    after: { status: result.details.status, ...(decision === "fix" ? { note: result.details.reviewNote } : {}) },
  });
  await sendDetailsDecision(store, designer, decision, result.details.reviewNote ?? "");
  refresh();
  redirect(`${CHECKS}?id=${designer.id}&done=${decision === "approve" ? "approved" : "fix"}`);
}

export async function preparePayoutsAction(): Promise<void> {
  const admin = await requireAdmin("market.payouts");
  const store = await getStore();
  const now = payoutNow();
  const { prepared, skipped } = await preparePayouts({ store, key: encryptionKey(), now, by: admin.email });
  if (prepared.length) {
    const total = prepared.reduce((n, p) => n + p.amountCents, 0);
    await recordAudit({
      actor: admin,
      action: "market.payouts_prepared",
      target: { type: "market_payout", id: null },
      summary: `Prepared ${prepared.length === 1 ? "1 payout" : `${prepared.length} payouts`} for ${prepared[0]!.period}, ${formatUsd(total)} in all`,
      after: { payouts: prepared.map((p) => ({ id: p.id, designerId: p.designerId, amountCents: p.amountCents })) },
    });
  }
  refresh();
  redirect(`${PAYOUTS}?done=prepared&n=${prepared.length}${skipped ? `&skipped=${skipped}` : ""}`);
}

export async function markPayoutSentAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("market.payouts");
  const store = await getStore();
  const now = payoutNow();
  const values = { reference: String(formData.get("reference") ?? ""), sentOn: String(formData.get("sentOn") ?? "") };
  const payout = await store.getDesignerPayout(String(formData.get("payout") ?? ""));
  if (!payout) return { message: "This payout isn't there any more. Reload the page.", values };
  const result = await markPayoutSent({ store, now, by: admin.email }, payout, values);
  if (!result.ok) return { errors: result.errors, message: result.errors.form, values };
  const designer = await store.getTemplateDesigner(payout.designerId);
  await recordAudit({
    actor: admin,
    action: "market.payout_sent",
    target: { type: "market_payout", id: payout.id },
    clientId: designer?.clientId ?? null,
    summary: `Marked the ${formatUsd(payout.amountCents)} payout to “${designer?.name ?? payout.payeeName}” for ${payout.period} sent (bank reference ${result.payout.bankReference}, ${result.payout.sentOn})`,
    before: { status: payout.status },
    after: { status: "sent", bankReference: result.payout.bankReference, sentOn: result.payout.sentOn },
  });
  await sendPayoutReceipt(store, result.payout, now);
  refresh();
  redirect(`${PAYOUTS}?done=sent`);
}

export async function cancelPayoutAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("market.payouts");
  const store = await getStore();
  const now = payoutNow();
  const values = { note: String(formData.get("note") ?? "") };
  const payout = await store.getDesignerPayout(String(formData.get("payout") ?? ""));
  if (!payout) return { message: "This payout isn't there any more. Reload the page.", values };
  const result = await cancelPayout({ store, now, by: admin.email }, payout, values.note);
  if (!result.ok) return { errors: result.errors, message: result.errors.form, values };
  const designer = await store.getTemplateDesigner(payout.designerId);
  await recordAudit({
    actor: admin,
    action: "market.payout_cancelled",
    target: { type: "market_payout", id: payout.id },
    clientId: designer?.clientId ?? null,
    summary: `Cancelled the ${formatUsd(payout.amountCents)} payout to “${designer?.name ?? payout.payeeName}” for ${payout.period}: ${values.note.trim()}`,
    before: { status: payout.status },
    after: { status: "cancelled" },
  });
  refresh();
  redirect(`${PAYOUTS}?done=cancelled`);
}
