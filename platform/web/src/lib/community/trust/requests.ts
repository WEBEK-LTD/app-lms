import { canApplyForGold, type CommunityBadge, type MemberFacts } from "./badges";

/**
 * 231 Yallapp Community: what members send and admins decide (area C):
 * the Gold verification form, reports on content and people, and the audit
 * log of every badge granted or taken away by hand and every decision.
 */

// ——— The verification form (Gold, "Pro Developer") ———

/** The linked Yallapp account's apps, as the form lists them (filled in by the platform, never typed by the member). */
export interface LinkedApp {
  id: string;
  name: string;
  /** Its store or web link, when it has one. */
  url: string | null;
  /** A Studio Market template the member made (counts as an app). */
  template: boolean;
}

export const VERIFICATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export interface VerificationRequest {
  id: number;
  memberId: number;
  fullName: string;
  /** The ID proof the member uploaded (a private file: only admins open it). */
  idProofFileId: string;
  portfolio: string[];
  /** The linked account's apps when the member applied, as they were. */
  apps: LinkedApp[];
  status: VerificationStatus;
  createdAt: Date;
  decidedAt: Date | null;
  decidedBy: number | null;
  /** The admin's reason, shown to the member (required to reject). */
  reason: string | null;
}

export const PORTFOLIO_MAX = 5;
const URL_RE = /^https:\/\/[^\s/$.?#].[^\s]*$/i;

/** The form as sent, checked: a name, the uploaded ID proof and up to 5 https links. The apps come from the linked account. */
export function parseVerificationForm(input: unknown): { ok: true; value: { fullName: string; idProofFileId: string; portfolio: string[] } } | { ok: false; errors: Record<string, string> } {
  const v = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const fullName = typeof v.full_name === "string" ? v.full_name.trim().replace(/\s+/g, " ") : "";
  if (fullName.length < 3 || fullName.length > 120 || !fullName.includes(" ")) errors.full_name = "Enter your full name as on your ID.";
  const idProofFileId = typeof v.id_proof_file_id === "string" ? v.id_proof_file_id.trim() : "";
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(idProofFileId)) errors.id_proof_file_id = "Upload a photo of your ID.";
  const raw = v.portfolio === undefined ? [] : v.portfolio;
  const portfolio = Array.isArray(raw) ? raw.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean) : null;
  if (!portfolio || portfolio.length > PORTFOLIO_MAX || portfolio.some((u) => u.length > 500 || !URL_RE.test(u))) errors.portfolio = `Add up to ${PORTFOLIO_MAX} links starting with https://.`;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { fullName, idProofFileId, portfolio: [...new Set(portfolio!)] } };
}

/** Why a member can't apply for Gold now; null: they may. */
export function verificationBlocked(facts: Pick<MemberFacts, "linked">, opts: { holdsGold: boolean; pending: boolean }): "no_linked_account" | "not_enough_apps" | "already_gold" | "pending" | null {
  if (opts.holdsGold) return "already_gold";
  if (opts.pending) return "pending";
  if (!facts.linked) return "no_linked_account";
  if (!canApplyForGold(facts)) return "not_enough_apps";
  return null;
}

/** An admin's decision on a request: approve, or reject with a reason the member is told. */
export function parseDecision(input: unknown): { ok: true; value: { approve: boolean; reason: string | null } } | { ok: false; error: string } {
  const v = (input ?? {}) as Record<string, unknown>;
  if (v.decision !== "approve" && v.decision !== "reject") return { ok: false, error: "decision must be approve or reject." };
  const reason = typeof v.reason === "string" ? v.reason.trim() : "";
  if (reason.length > 500) return { ok: false, error: "Keep the reason under 500 characters." };
  if (v.decision === "reject" && reason.length < 3) return { ok: false, error: "Give the member a reason." };
  return { ok: true, value: { approve: v.decision === "approve", reason: reason || null } };
}

// ——— Reports ———

export const REPORT_TARGETS = ["question", "answer", "tutorial", "comment", "member"] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export const REPORT_REASONS = ["spam", "harassment", "hate", "inappropriate", "misinformation", "impersonation", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ["open", "upheld", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface Report {
  id: number;
  reporterId: number;
  target: ReportTarget;
  targetId: number;
  /** The member the reported content belongs to (or the member reported). */
  targetMemberId: number;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: number | null;
  /** What the admin did, for the record. */
  note: string | null;
}

export function parseReport(input: unknown): { ok: true; value: { target: ReportTarget; targetId: number; reason: ReportReason; details: string | null } } | { ok: false; error: string } {
  const v = (input ?? {}) as Record<string, unknown>;
  if (!(REPORT_TARGETS as readonly unknown[]).includes(v.target)) return { ok: false, error: "Choose what you are reporting." };
  if (typeof v.target_id !== "number" || !Number.isSafeInteger(v.target_id) || v.target_id < 1) return { ok: false, error: "Choose what you are reporting." };
  if (!(REPORT_REASONS as readonly unknown[]).includes(v.reason)) return { ok: false, error: "Choose a reason." };
  const details = typeof v.details === "string" ? v.details.trim() : "";
  if (details.length > 1000) return { ok: false, error: "Keep the details under 1000 characters." };
  if (v.reason === "other" && details.length < 3) return { ok: false, error: "Tell us what is wrong." };
  return { ok: true, value: { target: v.target as ReportTarget, targetId: v.target_id, reason: v.reason as ReportReason, details: details || null } };
}

// ——— The audit log ———

export const AUDIT_ACTIONS = [
  "badge_granted",
  "badge_revoked",
  "verification_approved",
  "verification_rejected",
  "post_approved",
  "post_rejected",
  "report_upheld",
  "report_dismissed",
  "settings_changed",
  "member_role_changed",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** One line of the audit log: who did what to whom, when and why. Never edited or removed. */
export interface AuditEntry {
  id: number;
  /** The admin; null for the automatic rules (a Blue or Green badge coming or going). */
  actorId: number | null;
  action: AuditAction;
  /** The member it concerns, when it concerns one. */
  memberId: number | null;
  badge: CommunityBadge | null;
  /** The request, report or post it concerns, as "verification:12", "report:4", "answer:31". */
  subject: string | null;
  reason: string | null;
  /** What changed, for settings and anything else worth keeping. */
  detail: Record<string, unknown> | null;
  at: Date;
}

/** An admin's grant of a badge: a private reason and an optional expiry in the future. */
export function parseGrant(input: unknown, now: Date): { ok: true; value: { badge: CommunityBadge; reason: string; expiresAt: Date | null } } | { ok: false; error: string } {
  const v = (input ?? {}) as Record<string, unknown>;
  if (v.badge !== "gold" && v.badge !== "green" && v.badge !== "blue") return { ok: false, error: "Choose gold, green or blue." };
  const reason = typeof v.reason === "string" ? v.reason.trim() : "";
  if (reason.length < 3 || reason.length > 500) return { ok: false, error: "Give a private reason (3 to 500 characters)." };
  let expiresAt: Date | null = null;
  if (v.expires_at !== undefined && v.expires_at !== null) {
    expiresAt = typeof v.expires_at === "string" ? new Date(v.expires_at) : new Date(NaN);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) return { ok: false, error: "The expiry must be a date in the future." };
  }
  return { ok: true, value: { badge: v.badge, reason, expiresAt } };
}

export function parseRevoke(input: unknown): { ok: true; value: { reason: string } } | { ok: false; error: string } {
  const v = (input ?? {}) as Record<string, unknown>;
  const reason = typeof v.reason === "string" ? v.reason.trim() : "";
  if (reason.length < 3 || reason.length > 500) return { ok: false, error: "Give a reason (3 to 500 characters)." };
  return { ok: true, value: { reason } };
}
