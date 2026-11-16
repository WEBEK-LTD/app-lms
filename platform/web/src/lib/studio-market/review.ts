import type { DataStore } from "../data/store";
import type { MarketTemplate, MarketTemplateReview, MarketReviewDecision, TemplateDesigner } from "../data/types";

/**
 * 106.1 The team's review of a template's first publish (Admin › Studio
 * Market › Review queue): oldest first, the template drawn page by page,
 * a checklist, notes to the designer and a note for the team only. Approved,
 * it is published; with changes requested, the designer gets the notes by
 * email and on their templates, fixes it in Studio and sends it again.
 * Later updates of a published template go live without another review.
 */

export const REVIEW_CHECKS = ["light_dark", "rtl", "readable", "no_brands", "no_contacts", "matches", "kinds", "prices"] as const;
export type ReviewCheck = (typeof REVIEW_CHECKS)[number];

export const REVIEW_CHECK_LABELS: Record<ReviewCheck, string> = {
  light_dark: "Every screen opens in light and dark",
  rtl: "Arabic screens read right to left",
  readable: "Text is easy to read",
  no_brands: "No other brand's names, logos or photos",
  no_contacts: "No contact details or outside links in the screens",
  matches: "Screenshots and description match the template",
  kinds: "Fits the app kinds chosen",
  prices: "Prices and the after-the-end choice make sense",
};

export const REVIEW_LIMITS = { notes: 4000, teamNote: 2000 } as const;

export const REVIEW_MESSAGES = {
  notes: "Write the notes to the designer: what needs a change.",
  notesLong: "Keep the notes to 4,000 characters.",
  teamNote: "Keep the team note to 2,000 characters.",
  gone: "This template isn't waiting for a review anymore.",
  approved: "Approved and published. The designer was emailed.",
  changes: "Changes requested. The designer was emailed with your notes.",
} as const;

/** The templates waiting for the team, oldest first. */
export async function reviewQueue(store: DataStore): Promise<MarketTemplate[]> {
  const waiting = await store.listMarketTemplates({ statuses: ["in_review"] });
  return waiting.sort((a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0));
}

export interface ReviewInput {
  decision: MarketReviewDecision;
  notes: string;
  teamNote: string;
  checks: readonly string[];
}

export type ReviewResult = { ok: true; template: MarketTemplate; review: MarketTemplateReview } | { ok: false; errors: Record<string, string> };

/**
 * Approves the template (it is published, its sent version the one buyers
 * get) or sends it back with notes. Only while it still waits: two people
 * deciding at once, the first one counts.
 */
export async function decideReview(store: DataStore, template: MarketTemplate, input: ReviewInput, reviewer: { email: string; name: string | null }, now: Date): Promise<ReviewResult> {
  const notes = input.notes.replace(/\r\n?/g, "\n").trim();
  const teamNote = input.teamNote.replace(/\r\n?/g, "\n").trim();
  const errors: Record<string, string> = {};
  if (input.decision === "changes_requested" && !notes) errors.notes = REVIEW_MESSAGES.notes;
  if (notes.length > REVIEW_LIMITS.notes) errors.notes = REVIEW_MESSAGES.notesLong;
  if (teamNote.length > REVIEW_LIMITS.teamNote) errors.teamNote = REVIEW_MESSAGES.teamNote;
  if (Object.keys(errors).length) return { ok: false, errors };
  if (template.status !== "in_review" || !template.reviewVersionId) return { ok: false, errors: { form: REVIEW_MESSAGES.gone } };
  const versionId = template.reviewVersionId;
  const patch =
    input.decision === "approved"
      ? { status: "published" as const, currentVersionId: versionId, reviewVersionId: null, publishedAt: template.publishedAt ?? now }
      : { status: "changes_requested" as const };
  if (!(await store.moveMarketTemplate(template.id, "in_review", patch, now))) return { ok: false, errors: { form: REVIEW_MESSAGES.gone } };
  const review = await store.createMarketTemplateReview({
    templateId: template.id,
    versionId,
    decision: input.decision,
    notes: notes || null,
    teamNote: teamNote || null,
    checks: input.checks.filter((c): c is ReviewCheck => (REVIEW_CHECKS as readonly string[]).includes(c)),
    reviewerEmail: reviewer.email,
    reviewerName: reviewer.name,
    createdAt: now,
  });
  return { ok: true, template: { ...template, ...patch, updatedAt: now }, review };
}

/** The last notes the team sent the designer, while the template waits for changes. */
export async function latestNotes(store: DataStore, template: Pick<MarketTemplate, "id" | "status">): Promise<MarketTemplateReview | null> {
  if (template.status !== "changes_requested") return null;
  return (await store.listMarketTemplateReviews(template.id)).find((r) => r.decision === "changes_requested") ?? null;
}

/** How many of a designer's templates are published (the queue shows it). */
export async function publishedCount(store: DataStore, designer: Pick<TemplateDesigner, "id">): Promise<number> {
  return (await store.listMarketTemplates({ designerId: designer.id, statuses: ["published"] })).length;
}
