"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth/session";
import { tenantAdmin } from "./source";

/** 235 Dashboard › Community: the client moderates its app's own community (requireClient checks they may manage the app's settings). */

const BASE = "/dashboard/community";

function str(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

async function appOf(): Promise<string> {
  const context = await requireClient("settings");
  if (!context.app || (context.app.appType as string) !== "community") redirect(BASE);
  return context.app.id;
}

function back(view: string, ok: boolean): never {
  revalidatePath(BASE);
  redirect(`${BASE}?view=${encodeURIComponent(view)}&${ok ? "saved=1" : "failed=1"}`);
}

export async function decideModerationAction(form: FormData): Promise<void> {
  const appId = await appOf();
  const decision = str(form, "decision") === "remove" ? "remove" : "approve";
  const r = await tenantAdmin(appId, "POST", `/admin/moderation/${encodeURIComponent(str(form, "id"))}`, { decision, ...(str(form, "note") ? { note: str(form, "note") } : {}) });
  back("moderation", r.status < 300);
}

export async function decideReportAction(form: FormData): Promise<void> {
  const appId = await appOf();
  const status = str(form, "status") === "actioned" ? "actioned" : "dismissed";
  const r = await tenantAdmin(appId, "POST", `/admin/reports/${encodeURIComponent(str(form, "id"))}`, { status });
  back("reports", r.status < 300);
}

export async function memberStatusAction(form: FormData): Promise<void> {
  const appId = await appOf();
  const status = str(form, "status") === "suspended" ? "suspended" : "active";
  const r = await tenantAdmin(appId, "PUT", `/admin/members/${encodeURIComponent(str(form, "id"))}/status`, { status, reason: str(form, "reason") || "—" });
  back("members", r.status < 300);
}

export async function settingsAction(form: FormData): Promise<void> {
  const appId = await appOf();
  const current = await tenantAdmin<Record<string, unknown>>(appId, "GET", "/admin/settings");
  if (current.status !== 200) back("settings", false);
  const lines = (name: string) => str(form, name).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 200);
  const policy = ["everyone", "badge_holders", "chosen"].find((p) => p === str(form, "groups_create_policy")) ?? "everyone";
  const spam = (current.body.spam_filter ?? {}) as Record<string, unknown>;
  const r = await tenantAdmin(appId, "PUT", "/admin/settings", {
    ...current.body,
    groups_create_policy: policy,
    spam_filter: { ...spam, enabled: form.get("spam_enabled") === "1", blocked_words: lines("blocked_words"), blocked_domains: lines("blocked_domains"), max_links: Math.max(0, Number(str(form, "max_links")) || 0), hide_after_reports: Math.max(1, Number(str(form, "hide_after_reports")) || 3) },
  });
  back("settings", r.status < 300);
}
