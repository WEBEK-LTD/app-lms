"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import type { BadgeKind } from "@/components/community/site/data";
import { cmLinks } from "@/components/community/site/links";
import * as source from "@/components/community/site/source";
import type { FormState } from "./actions";

/** 231 The Pro Developer form, notifications, and the admin's tools (each admin call is checked again by the trust module). */

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

function result(w: W, r: source.SeamResult, ok: string): FormState {
  if (r.ok) return { ok, at: Date.now() };
  const first = r.errors ? Object.values(r.errors)[0] : undefined;
  return { error: first ?? (r.code === "not_ready" ? w.errorNotReady : r.code === "forbidden" ? w.errorForbidden : w.errorGeneric), at: Date.now() };
}

const HTTPS = /^https:\/\/[^\s/$.?#][^\s]*$/i;

export async function verifyAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { viewer, w } = await member(cmLinks.verify());
  const fullName = text(form, "fullName");
  const portfolio = form.getAll("portfolio").map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean).slice(0, 5);
  const file = form.get("idProof");
  if (fullName.length < 3) return { error: w.errorFullName, at: Date.now() };
  if (!(file instanceof File) || file.size === 0) return { error: w.errorIdProof, at: Date.now() };
  if (file.size > 10 * 1024 * 1024 || !/^(image\/(png|jpeg|webp)|application\/pdf)$/.test(file.type)) return { error: w.errorIdProofType, at: Date.now() };
  if (portfolio.some((u) => !HTTPS.test(u))) return { error: w.errorPortfolio, at: Date.now() };
  const status = await source.goldStatus(viewer.id);
  if (!status.canApply) return { error: w.errorNotEligible, at: Date.now() };
  const up = await source.uploadIdProof(viewer.id, file);
  if (!up.ok) return result(w, up, "");
  const r = await source.submitVerification(viewer.id, { fullName, idProofFileId: up.fileId, portfolio });
  revalidatePath(cmLinks.verify());
  return result(w, r, w.verifySent);
}

export async function readAllAction(): Promise<void> {
  const { viewer } = await member(cmLinks.notifications());
  await source.markNoticesRead(viewer.id, "all");
  revalidatePath(cmLinks.notifications());
}

export async function prefsAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { viewer, w } = await member(cmLinks.settings());
  const r = await source.setNoticePrefs(viewer.id, { email: text(form, "email") === "1" });
  return result(w, r, w.settingsSaved);
}

// ----- Admin -----

export async function decideVerificationAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { viewer, w } = await admin();
  const decision = text(form, "decision") === "approve" ? "approve" : "reject";
  const reason = text(form, "reason");
  if (decision === "reject" && reason.length < 3) return { error: w.errorReason, at: Date.now() };
  const r = await source.decideVerification(viewer.id, text(form, "id"), { decision, reason });
  revalidatePath(cmLinks.admin("verifications"));
  return result(w, r, decision === "approve" ? w.approved : w.rejected);
}

const BADGES: BadgeKind[] = ["gold", "green", "blue"];

export async function grantAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { viewer, w } = await admin();
  const badge = BADGES.find((b) => b === text(form, "badge"));
  const reason = text(form, "reason");
  const expires = text(form, "expiresAt");
  if (!badge) return { error: w.errorGeneric, at: Date.now() };
  if (reason.length < 3) return { error: w.errorReason, at: Date.now() };
  const r = await source.grantBadge(viewer.id, text(form, "memberId"), { badge, reason, expiresAt: expires ? new Date(`${expires}T23:59:59Z`).toISOString() : null });
  revalidatePath(cmLinks.admin("badges"));
  return result(w, r, w.granted);
}

export async function revokeAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { viewer, w } = await admin();
  const reason = text(form, "reason");
  if (reason.length < 3) return { error: w.errorReason, at: Date.now() };
  const r = await source.revokeBadge(viewer.id, text(form, "badgeId"), { reason });
  revalidatePath(cmLinks.admin("badges"));
  return result(w, r, w.revoked);
}

function num(form: FormData, name: string): number | undefined {
  const v = text(form, name);
  return v === "" ? undefined : Number(v);
}

function lines(form: FormData, name: string): string[] {
  return text(form, name).split(/[\n,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export async function settingsAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { viewer, w } = await admin();
  const creators = text(form, "creators");
  const r = await source.updateSettings(viewer.id, {
    blue: {
      minAccountDays: num(form, "minAccountDays"),
      minPoints: num(form, "minPoints"),
      minAcceptedAnswers: num(form, "minAcceptedAnswers"),
      minApprovedTutorials: num(form, "minApprovedTutorials"),
      cleanDays: num(form, "cleanDays"),
      inactiveDays: num(form, "inactiveDays"),
    },
    groups: { creators: creators === "badge_holders" || creators === "chosen" ? creators : "everyone", chosenHandles: lines(form, "chosen") },
    moderation: {
      reviewFirstPosts: num(form, "reviewFirstPosts"),
      maxLinks: num(form, "maxLinks"),
      hideAfterReports: num(form, "hideAfterReports"),
      blockedDomains: lines(form, "blockedDomains"),
      blockedWords: lines(form, "blockedWords"),
    },
  });
  revalidatePath(cmLinks.admin("settings"));
  return result(w, r, w.settingsSaved);
}

export async function decideModerationAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { viewer, w } = await admin();
  const decision = text(form, "decision") === "approve" ? "approve" : "reject";
  const reason = text(form, "reason");
  if (decision === "reject" && reason.length < 3) return { error: w.errorReason, at: Date.now() };
  const r = await source.decideModeration(viewer.id, text(form, "id"), { decision, reason });
  revalidatePath(cmLinks.admin("moderation"));
  return result(w, r, decision === "approve" ? w.approved : w.rejected);
}

export async function resolveReportAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { viewer, w } = await admin();
  const decision = text(form, "decision") === "uphold" ? "uphold" : "dismiss";
  const r = await source.resolveReport(viewer.id, text(form, "id"), { decision, note: text(form, "note"), hide: text(form, "hide") === "1" });
  revalidatePath(cmLinks.admin("reports"));
  return result(w, r, decision === "uphold" ? w.upheld : w.dismissed);
}

export async function linkAction(): Promise<void> {
  const { viewer } = await member(cmLinks.settings());
  const to = await source.startLink(viewer.id);
  redirect(to ?? `${cmLinks.settings()}?link=unavailable`);
}

export async function unlinkAction(): Promise<void> {
  const { viewer } = await member(cmLinks.settings());
  await source.unlink(viewer.id);
  revalidatePath(cmLinks.settings());
}
