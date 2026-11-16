"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { emailLangOf, sendTemplate } from "@/lib/email/send";
import type { FormState } from "@/lib/forms";
import { decideReview, REVIEW_MESSAGES } from "@/lib/studio-market/review";
import { templateText } from "@/lib/studio-market/templates";

/**
 * 106.1 Admin › Studio Market › Review queue: approve and publish a template
 * sent for its first publish, or send it back with notes. Permission
 * `market.review`; the designer is emailed, and each decision is in the
 * audit log.
 */
export async function decideReviewAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("market.review");
  const store = await getStore();
  const now = new Date();
  const id = String(formData.get("id") ?? "");
  const decision = formData.get("decision") === "approve" ? "approved" : "changes_requested";
  const values = { notes: String(formData.get("notes") ?? ""), teamNote: String(formData.get("teamNote") ?? "") };
  const template = id ? await store.getMarketTemplate(id) : null;
  if (!template) return { message: REVIEW_MESSAGES.gone, values };
  const result = await decideReview(store, template, { decision, notes: values.notes, teamNote: values.teamNote, checks: formData.getAll("check").map(String) }, { email: admin.email, name: admin.name }, now);
  if (!result.ok) return { errors: result.errors, message: result.errors.form, values };
  const title = templateText(template, "en").title;
  await recordAudit({
    actor: admin,
    action: decision === "approved" ? "market.approve" : "market.changes",
    target: { type: "market_template", id: template.id },
    clientId: template.clientId,
    summary: decision === "approved" ? `Approved and published “${title}”` : `Sent “${title}” back with notes`,
    before: { status: template.status },
    after: { status: result.template.status },
  });
  // The designer hears from us, in their dashboard's language.
  try {
    const client = await store.getClientById(template.clientId);
    const user = client ? await store.getUserById(client.userId) : null;
    if (user) {
      const lang = emailLangOf(user);
      const notes = result.review.notes ?? "";
      await sendTemplate(
        decision === "approved" ? "market_template_published" : "market_template_changes",
        user.email,
        { name: user.name, template_name: templateText(template, lang).title, notes, notes_line: notes ? `${notes}\n\n` : "", templates_url: `${appUrl()}/designer/templates` },
        { lang },
      );
    }
  } catch (error) {
    console.error("[studio-market] the review email wasn't sent:", error instanceof Error ? error.message : error);
  }
  revalidatePath("/admin/market");
  revalidatePath("/dashboard/studio-market", "layout");
  redirect(`/admin/market?done=${decision === "approved" ? "approved" : "changes"}`);
}

/**
 * 106.2 Admin › Studio Market › Sales: a buyer's licence gets another end
 * date (a goodwill extension, a mistake put right). Permission
 * `clients.license`, like a client's own plan; in the audit log. The daily
 * job reminds and ends from the new date.
 */
export async function setLicenceEndAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("clients.license");
  const store = await getStore();
  const now = new Date();
  const licence = await store.getTemplateLicence(String(formData.get("licence") ?? ""));
  const value = String(formData.get("ends") ?? "").trim();
  const ends = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? new Date(`${value}:00.000Z`) : null;
  if (!licence || licence.status !== "active" || !licence.endsAt) redirect("/admin/market/sales?error=licence");
  if (!ends || Number.isNaN(ends.getTime())) redirect("/admin/market/sales?error=date");
  await store.updateTemplateLicence(licence.id, { endsAt: ends }, now);
  const template = await store.getMarketTemplate(licence.templateId);
  await recordAudit({
    actor: admin,
    action: "market.licence_end_date",
    target: { type: "market_licence", id: licence.id },
    clientId: licence.clientId,
    summary: `Moved the end of the plan for “${template ? templateText(template, "en").title : licence.templateId}” to ${ends.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    before: { endsAt: licence.endsAt.toISOString() },
    after: { endsAt: ends.toISOString() },
  });
  revalidatePath("/admin/market/sales");
  redirect("/admin/market/sales?done=end");
}
