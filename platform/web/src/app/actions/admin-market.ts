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
import { designerPath, RATING_LIMITS } from "@/lib/studio-market/designer-page";

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
  revalidatePath("/studio/market", "layout");
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

// ——— 106.14 A designer's public page ———

const field = (formData: FormData, name: string, max: number) => String(formData.get(name) ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function refreshDesigner(slug: string) {
  for (const prefix of ["", "/ar", "/tr"]) revalidatePath(`${prefix}${designerPath(slug)}`);
  revalidatePath("/templates", "layout");
  revalidatePath("/studio/market", "layout");
  revalidatePath("/admin/market/designers");
}

/**
 * 106.14 Admin › Studio Market › Designers: the team's first look at a
 * designer's photo and line about them. Approved, they show on the public
 * pages (later changes go live); declined, they don't, with a note the
 * designer sees in their profile. Permission `market.review`; in the audit log.
 */
export async function decideDesignerProfileAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("market.review");
  const store = await getStore();
  const designer = await store.getTemplateDesigner(String(formData.get("designer") ?? ""));
  if (!designer || designer.profileReview !== "pending") redirect("/admin/market/designers?error=gone");
  const approve = formData.get("decision") === "approve";
  const note = field(formData, "note", RATING_LIMITS.note) || null;
  const now = new Date();
  await store.updateTemplateDesigner(designer.id, { profileReview: approve ? "approved" : "declined", profileNote: approve ? null : note, profileReviewedAt: now }, now);
  await recordAudit({
    actor: admin,
    action: approve ? "market.profile_approved" : "market.profile_declined",
    target: { type: "market_designer", id: designer.id },
    clientId: designer.clientId,
    summary: approve ? `Approved the photo and line of “${designer.name}”` : `Declined the photo and line of “${designer.name}”${note ? `: ${note}` : ""}`,
    before: { profileReview: designer.profileReview },
    after: { profileReview: approve ? "approved" : "declined" },
  });
  refreshDesigner(designer.slug);
  redirect(`/admin/market/designers?done=${approve ? "approved" : "declined"}`);
}

/** 106.14 Locks a designer's public page ("page not found", out of the sitemap; their templates stay), or opens it again. */
export async function lockDesignerPageAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("market.review");
  const store = await getStore();
  const designer = await store.getTemplateDesigner(String(formData.get("designer") ?? ""));
  if (!designer) redirect("/admin/market/designers?error=gone");
  const lock = formData.get("lock") === "on";
  const reason = field(formData, "reason", RATING_LIMITS.reason) || null;
  const now = new Date();
  await store.updateTemplateDesigner(designer.id, lock ? { pageLockedAt: now, pageLockedReason: reason } : { pageLockedAt: null, pageLockedReason: null }, now);
  await recordAudit({
    actor: admin,
    action: lock ? "market.page_locked" : "market.page_unlocked",
    target: { type: "market_designer", id: designer.id },
    clientId: designer.clientId,
    summary: lock ? `Locked the page of “${designer.name}”${reason ? `: ${reason}` : ""}` : `Opened the page of “${designer.name}” again`,
    before: { locked: Boolean(designer.pageLockedAt) },
    after: { locked: lock },
  });
  refreshDesigner(designer.slug);
  redirect(`/admin/market/designers?done=${lock ? "locked" : "unlocked"}`);
}

/** 106.14 Hides an abusive rating (out of the pages and the averages), or shows it again. */
export async function hideRatingAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("market.review");
  const store = await getStore();
  const rating = await store.getMarketRating(String(formData.get("rating") ?? ""));
  if (!rating) redirect("/admin/market/designers?error=gone");
  const hide = formData.get("hide") === "on";
  const reason = field(formData, "reason", RATING_LIMITS.reason) || null;
  await store.hideMarketRating(rating.id, hide ? { at: new Date(), by: admin.email, reason } : null);
  const template = await store.getMarketTemplate(rating.templateId);
  await recordAudit({
    actor: admin,
    action: hide ? "market.rating_hidden" : "market.rating_shown",
    target: { type: "market_rating", id: rating.id },
    clientId: rating.clientId,
    summary: `${hide ? "Hid" : "Showed again"} a ${rating.stars}-star rating of “${template ? templateText(template, "en").title : rating.templateId}”${hide && reason ? `: ${reason}` : ""}`,
    before: { hidden: Boolean(rating.hiddenAt) },
    after: { hidden: hide },
  });
  const designer = await store.getTemplateDesigner(rating.designerId);
  if (designer) refreshDesigner(designer.slug);
  if (template) for (const prefix of ["", "/ar", "/tr"]) revalidatePath(`${prefix}/templates/${template.slug}`);
  redirect(`/admin/market/designers?done=${hide ? "hidden" : "shown"}#ratings`);
}
