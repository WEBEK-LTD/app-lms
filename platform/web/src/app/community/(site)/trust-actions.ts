"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import type { BadgeKind } from "@/components/community/site/data";
import { cmLinks } from "@/components/community/site/links";
import * as source from "@/components/community/site/source";
import type { FormState } from "./actions";

/** 231 The Pro Developer request, notifications, linking, and the admin's tools (the API checks every admin call again). */

function text(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

async function member(back: string) {
  const ctx = await siteContext();
  if (!ctx.viewer) redirect(cmLinks.signIn(back));
  return { ...ctx, viewer: ctx.viewer };
}

async function admin() {
  const ctx = await member(cmLinks.admin());
  if (!ctx.viewer.admin) redirect(cmLinks.home());
  return ctx;
}

type W = Awaited<ReturnType<typeof siteContext>>["w"];

/** The API's answer as the form's note: done, else the first field's message (already in the member's language), else the code's. */
function result(w: W, r: source.SeamResult, ok: string): FormState {
  if (r.ok) return { ok, at: Date.now() };
  const first = r.errors ? Object.values(r.errors)[0] : undefined;
  const byCode: Record<string, string> = {
    not_admin: w.errorForbidden,
    not_allowed: w.errorForbidden,
    not_eligible: w.errorNotEligible,
    already_pending: w.verifyPending,
    too_many_attempts: w.errorRate,
    not_found: w.errorGeneric,
  };
  return { error: first ?? byCode[r.code] ?? w.errorGeneric, at: Date.now() };
}

const HTTPS = /^https:\/\/[^\s/$.?#][^\s]*$/i;

export async function verifyAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { w } = await member(cmLinks.verify());
  const fullName = text(form, "fullName");
  const portfolio = form.getAll("portfolio").map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean).slice(0, 5);
  const file = form.get("idProof");
  if (fullName.length < 3) return { error: w.errorFullName, at: Date.now() };
  if (!(file instanceof File) || file.size === 0) return { error: w.errorIdProof, at: Date.now() };
  if (file.size > 10 * 1024 * 1024 || !/^(image\/(png|jpeg)|application\/pdf)$/.test(file.type)) return { error: w.errorIdProofType, at: Date.now() };
  if (portfolio.some((u) => !HTTPS.test(u))) return { error: w.errorPortfolio, at: Date.now() };
  const r = await source.submitVerification({ fullName, idProof: file, portfolio });
  revalidatePath(cmLinks.verify());
  return result(w, r, w.verifySent);
}

export async function readAllAction(): Promise<void> {
  await member(cmLinks.notifications());
  await source.markNoticesRead("all");
  revalidatePath(cmLinks.notifications());
}

/** Which notifications also come by email: one box per kind. */
export async function prefsAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { w } = await member(cmLinks.settings());
  const kinds = text(form, "kinds").split(",").filter(Boolean);
  const email = Object.fromEntries(kinds.map((k) => [k, form.get(`email_${k}`) === "1"]));
  const r = await source.setNoticePrefs(email);
  return result(w, r, w.settingsSaved);
}

export async function linkAction(): Promise<void> {
  await member(cmLinks.settings());
  const to = await source.startLink();
  redirect(to ?? `${cmLinks.settings()}?link=unavailable`);
}

export async function unlinkAction(): Promise<void> {
  await member(cmLinks.settings());
  await source.unlink();
  revalidatePath(cmLinks.settings());
}

// ----- Admin -----

/** The ID proof opens by a link that lasts a few minutes. */
export async function idProofAction(form: FormData): Promise<void> {
  await admin();
  const url = await source.idProofLink(text(form, "id"));
  redirect(url ?? cmLinks.admin("verifications"));
}

export async function decideVerificationAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { w } = await admin();
  const decision = text(form, "decision") === "approve" ? "approve" : "reject";
  const reason = text(form, "reason");
  if (reason.length < 3) return { error: w.errorReason, at: Date.now() };
  const r = await source.decideVerification(text(form, "id"), { decision, reason });
  revalidatePath(cmLinks.admin("verifications"));
  return result(w, r, decision === "approve" ? w.approved : w.rejected);
}

const BADGES: BadgeKind[] = ["gold", "green", "blue"];

export async function grantAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { w } = await admin();
  const badge = BADGES.find((b) => b === text(form, "badge"));
  const reason = text(form, "reason");
  const expires = text(form, "expiresAt");
  if (!badge) return { error: w.errorGeneric, at: Date.now() };
  if (reason.length < 3) return { error: w.errorReason, at: Date.now() };
  const r = await source.grantBadge(text(form, "memberId"), { badge, reason, expiresAt: /^\d{4}-\d{2}-\d{2}$/.test(expires) ? new Date(`${expires}T23:59:59Z`).toISOString() : null });
  revalidatePath(cmLinks.admin("badges"));
  return result(w, r, w.granted);
}

export async function revokeAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { w } = await admin();
  const badge = BADGES.find((b) => b === text(form, "badge"));
  const reason = text(form, "reason");
  if (!badge) return { error: w.errorGeneric, at: Date.now() };
  if (reason.length < 3) return { error: w.errorReason, at: Date.now() };
  const r = await source.revokeBadge(text(form, "memberId"), badge, { reason });
  revalidatePath(cmLinks.admin("badges"));
  return result(w, r, w.revoked);
}

function num(form: FormData, name: string): number {
  return Math.max(0, Math.floor(Number(text(form, name)) || 0));
}

function lines(form: FormData, name: string): string[] {
  return text(form, name).split(/[\n,]+/).map((s) => s.trim().replace(/^@/, "").toLowerCase()).filter(Boolean);
}

export async function settingsAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { w } = await admin();
  const policy = text(form, "creators");
  const r = await source.updateSettings({
    blue: {
      minAccountDays: num(form, "minAccountDays"),
      minPoints: num(form, "minPoints"),
      minAcceptedAnswers: num(form, "minAcceptedAnswers"),
      minApprovedTutorials: num(form, "minApprovedTutorials"),
      violationFreeDays: num(form, "violationFreeDays"),
      inactiveDays: num(form, "inactiveDays"),
    },
    groups: { policy: policy === "badge_holders" || policy === "chosen" ? policy : "everyone", chosenHandles: lines(form, "chosen") },
    spam: { enabled: form.get("spamEnabled") === "1", maxLinks: num(form, "maxLinks"), hideAfterReports: num(form, "hideAfterReports"), blockedDomains: lines(form, "blockedDomains"), blockedWords: lines(form, "blockedWords") },
    firstPostsReviewed: num(form, "firstPostsReviewed"),
  });
  revalidatePath(cmLinks.admin("settings"));
  if (!r.ok && r.errors?.groups_create_members) return { error: `${w.noMember} (@${r.errors.groups_create_members})`, at: Date.now() };
  return result(w, r, w.settingsSaved);
}

export async function decideModerationAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { w } = await admin();
  const decision = text(form, "decision") === "approve" ? "approve" : "remove";
  const r = await source.decideModeration(text(form, "id"), { decision, note: text(form, "note") });
  revalidatePath(cmLinks.admin("moderation"));
  return result(w, r, decision === "approve" ? w.approved : w.removedPost);
}

export async function resolveReportAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { w } = await admin();
  const status = text(form, "status") === "actioned" ? "actioned" : "dismissed";
  const r = await source.resolveReport(text(form, "id"), { status, note: text(form, "note") });
  revalidatePath(cmLinks.admin("reports"));
  return result(w, r, status === "actioned" ? w.upheld : w.dismissed);
}
