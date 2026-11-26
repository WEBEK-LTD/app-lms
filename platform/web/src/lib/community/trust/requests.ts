import type { CommunityLinkedApp, CommunityReport, CommunityReportReason, CommunityReportStatus, CommunityTargetType } from "../types";
import { canApplyForGold, type BadgeDetails, type CommunityBadge, type MemberFacts } from "./badges";

/**
 * 231 Yallapp Community: what members send and admins decide (area C):
 * the Gold verification form, reports on content and people, and the audit
 * log of every badge granted or taken away and every other decision. The
 * shapes are the base's tables (lib/db/community-schema.ts) and the API's
 * (docs/api/community.yaml).
 */

// ——— The verification form (Gold, "Pro Developer") ———

export type LinkedApp = CommunityLinkedApp;

export const VERIFICATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export interface VerificationRequest {
  id: string;
  memberId: string;
  fullName: string;
  /** The ID proof's key in private storage: admins open it through a short-lived link only. */
  idProofKey: string;
  portfolioLinks: string[];
  /** The linked account's apps when the member applied, as they were. */
  apps: { appId: string; name: string }[];
  status: VerificationStatus;
  /** The admin's reason, shown to the member. */
  reason: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

export const PORTFOLIO_MAX = 5;
/** The ID proof: a photo or a PDF, at most 5 MB (Netlify functions take at most 6 MB per request: platform/web/README.md, "Limits to know"). */
export const ID_PROOF_TYPES: Readonly<Record<string, string>> = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };
export const ID_PROOF_MAX_BYTES = 5 * 1024 * 1024;
/** The ID proof file is deleted this many days after the admin's decision (approve or reject); the name, links and decision stay. */
export const ID_PROOF_KEEP_DAYS = 30;

const URL_RE = /^https?:\/\/[^\s/$.?#][^\s]*$/i;

/** The form's words as sent, checked: a full name and up to 5 links. The ID proof is checked on its own; the apps come from the linked account. */
export function parseVerificationForm(input: { full_name?: unknown; portfolio_links?: unknown }): { ok: true; value: { fullName: string; portfolioLinks: string[] } } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const fullName = typeof input.full_name === "string" ? input.full_name.trim().replace(/\s+/g, " ") : "";
  if (fullName.length < 3 || fullName.length > 120 || !fullName.includes(" ")) errors.full_name = "Enter your full name as on your ID.";
  const raw = input.portfolio_links === undefined ? [] : input.portfolio_links;
  const links = Array.isArray(raw) ? raw.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean) : null;
  if (!links || links.length > PORTFOLIO_MAX || links.some((u) => u.length > 500 || !URL_RE.test(u))) errors.portfolio_links = `Add up to ${PORTFOLIO_MAX} links starting with https://.`;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { fullName, portfolioLinks: [...new Set(links!)] } };
}

/** A file's type by its first bytes: JPEG (FF D8 FF), PNG (89 50 4E 47 0D 0A 1A 0A) or PDF ("%PDF-"); null for anything else. */
export function fileTypeOf(bytes: Uint8Array): "image/jpeg" | "image/png" | "application/pdf" | null {
  const starts = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  return null;
}

/** Whether the uploaded ID proof is one the form takes: a JPEG, PNG or PDF of at most 5 MB (its bytes are checked too: `fileTypeOf`). */
export function idProofProblem(file: { type: string; size: number } | null): string | null {
  if (!file || file.size === 0) return "Upload a photo of your ID.";
  if (!ID_PROOF_TYPES[file.type]) return "Upload a JPEG, PNG or PDF.";
  if (file.size > ID_PROOF_MAX_BYTES) return "The file is larger than 5 MB.";
  return null;
}

/** Why a member can't apply for Gold now; null: they may. */
export function verificationBlocked(facts: Pick<MemberFacts, "linked">, opts: { holdsGold: boolean; pending: boolean }): "no_linked_account" | "not_eligible" | "already_pending" | "already_gold" | null {
  if (opts.holdsGold) return "already_gold";
  if (opts.pending) return "already_pending";
  if (!facts.linked) return "no_linked_account";
  if (!canApplyForGold(facts)) return "not_eligible";
  return null;
}

/** An admin's decision on a verification request: approve or reject, with a reason the member is told. */
export function parseDecision(input: unknown, options: { reasonRequired: "always" | "reject" } = { reasonRequired: "always" }): { ok: true; value: { approve: boolean; reason: string | null } } | { ok: false; error: string } {
  const v = (input ?? {}) as Record<string, unknown>;
  if (v.decision !== "approve" && v.decision !== "reject") return { ok: false, error: "decision must be approve or reject." };
  const reason = typeof v.reason === "string" ? v.reason.trim() : "";
  if (reason.length > 1000) return { ok: false, error: "Keep the reason under 1000 characters." };
  const needed = options.reasonRequired === "always" || v.decision === "reject";
  if (needed && reason.length < 3) return { ok: false, error: "Give the member a reason." };
  return { ok: true, value: { approve: v.decision === "approve", reason: reason || null } };
}

// ——— Reports ———

export const REPORT_TARGETS: readonly CommunityTargetType[] = ["member", "question", "answer", "reply", "tutorial", "comment"];
export type ReportTarget = CommunityTargetType;
export const REPORT_REASONS: readonly CommunityReportReason[] = ["spam", "harassment", "hate", "inappropriate", "misinformation", "impersonation", "other"];
export type ReportReason = CommunityReportReason;
export type ReportStatus = CommunityReportStatus;
export type Report = CommunityReport;

export function parseReport(input: unknown): { ok: true; value: { targetType: ReportTarget; targetId: string; reason: ReportReason; note: string } } | { ok: false; error: string } {
  const v = (input ?? {}) as Record<string, unknown>;
  if (!REPORT_TARGETS.includes(v.target_type as ReportTarget)) return { ok: false, error: "Choose what you are reporting." };
  if (typeof v.target_id !== "string" || !v.target_id.trim() || v.target_id.length > 64) return { ok: false, error: "Choose what you are reporting." };
  if (!REPORT_REASONS.includes(v.reason as ReportReason)) return { ok: false, error: "Choose a reason." };
  const note = typeof v.note === "string" ? v.note.trim() : "";
  if (note.length > 1000) return { ok: false, error: "Keep the note under 1000 characters." };
  if (v.reason === "other" && note.length < 3) return { ok: false, error: "Tell us what is wrong." };
  return { ok: true, value: { targetType: v.target_type as ReportTarget, targetId: v.target_id.trim(), reason: v.reason as ReportReason, note } };
}

// ——— The audit log ———

/** What the audit log records (`AuditEntry.action`). */
export const AUDIT_ACTIONS = [
  "badge.grant",
  "badge.revoke",
  "badge.auto_grant",
  "badge.auto_revoke",
  "verification.approve",
  "verification.reject",
  "verification.id_proof_deleted",
  "member.suspend",
  "member.restore",
  "moderator.grant",
  "moderator.revoke",
  "settings.update",
  "moderation.approve",
  "moderation.remove",
  "report.action",
  "report.dismiss",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** One line of the audit log: who did what to whom, when and why. Never edited or removed. */
export interface AuditEntry {
  id: string;
  /** The admin; null for the badge rules themselves. */
  actorId: string | null;
  action: AuditAction;
  /** The member it concerns, when it concerns one. */
  memberId: string | null;
  /** What it concerns: "badge", "verification", "question", "report", "settings"… */
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  /** The badge, the settings before and after, the expiry: whatever is worth keeping. */
  details: Record<string, unknown> | null;
  createdAt: Date;
}

/** An admin's grant of a badge: a private reason, an optional expiry in the future, and Green's company and app. */
export function parseGrant(input: unknown, now: Date): { ok: true; value: { badge: CommunityBadge; reason: string; expiresAt: Date | null; details: BadgeDetails | null } } | { ok: false; error: string } {
  const v = (input ?? {}) as Record<string, unknown>;
  if (v.badge !== "gold" && v.badge !== "green" && v.badge !== "blue") return { ok: false, error: "Choose gold, green or blue." };
  const reason = typeof v.reason === "string" ? v.reason.trim() : "";
  if (reason.length < 3 || reason.length > 1000) return { ok: false, error: "Give a private reason (3 to 1000 characters)." };
  let expiresAt: Date | null = null;
  if (v.expires_at !== undefined && v.expires_at !== null) {
    expiresAt = typeof v.expires_at === "string" ? new Date(v.expires_at) : new Date(NaN);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) return { ok: false, error: "The expiry must be a date in the future." };
  }
  let details: BadgeDetails | null = null;
  if (v.badge === "green") {
    const company = typeof v.company_name === "string" ? v.company_name.trim() : "";
    const app = typeof v.app_url === "string" ? v.app_url.trim() : "";
    if (company.length > 120 || (app && (!URL_RE.test(app) || app.length > 500))) return { ok: false, error: "Check the company name and the app's link." };
    if (company || app) details = { ...(company ? { companyName: company } : {}), ...(app ? { appUrl: app } : {}) };
  }
  return { ok: true, value: { badge: v.badge, reason, expiresAt, details } };
}

export function parseReason(input: unknown, what = "a reason"): { ok: true; value: string } | { ok: false; error: string } {
  const reason = typeof (input as { reason?: unknown } | null)?.reason === "string" ? (input as { reason: string }).reason.trim() : "";
  if (reason.length < 3 || reason.length > 1000) return { ok: false, error: `Give ${what} (3 to 1000 characters).` };
  return { ok: true, value: reason };
}
