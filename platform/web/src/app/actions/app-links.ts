"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { getClientContext, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { AppPatch } from "@/lib/data/store";
import type { App, LinksCheckSnapshot } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import type { FormState } from "@/lib/forms";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";
import { checkAppLinks } from "@/lib/links/check";
import { forgetLinkTargets } from "@/lib/links/files";
import { normalizeFingerprint, normalizeTeamId } from "@/lib/links/well-known";
import { hasFeature } from "@/lib/plans";
import { hitRateLimit } from "@/lib/rate-limit";

/**
 * 46 Links that open the app (Publishing › Links to your app), "Check links",
 * and the owner's switches for the rating prompt and crash reports
 * (Stability). What the site's license status carries changes, so the site
 * is asked to check its license after each save.
 */

const LINKS_PAGE = "/dashboard/publishing/links";
const LINK_CHECK_LIMIT = { name: "links-check:client", limit: 10, windowSeconds: 10 * 60 };

async function requireApp(): Promise<ClientContext & { app: App }> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app) redirect("/dashboard/app-type");
  return context as ClientContext & { app: App };
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

/** The Play App Signing key's fingerprint and the Apple Team ID; an empty field removes what was saved. */
export async function saveAppLinksAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const app = context.app;
  const values = { playSigningSha256: field(formData, "playSigningSha256"), appleTeamId: field(formData, "appleTeamId") };
  const errors: Record<string, string> = {};
  const patch: AppPatch = {};
  if (values.playSigningSha256) {
    const fingerprint = normalizeFingerprint(values.playSigningSha256);
    if (fingerprint.ok) patch.playSigningSha256 = fingerprint.value;
    else errors.playSigningSha256 = fingerprint.message;
  } else patch.playSigningSha256 = null;
  if (values.appleTeamId) {
    const team = normalizeTeamId(values.appleTeamId);
    if (team.ok) patch.appleTeamId = team.value;
    else errors.appleTeamId = team.message;
  } else if (formData.has("appleTeamId")) patch.appleTeamId = null;
  if (Object.keys(errors).length) return { errors, values };
  const store = await getStore();
  await store.updateApp(app.id, patch, new Date());
  await recordStaffChange(
    context,
    "Saved the links to the app",
    { playSigningSha256: app.playSigningSha256 ?? null, appleTeamId: app.appleTeamId ?? null },
    { playSigningSha256: patch.playSigningSha256 ?? null, appleTeamId: patch.appleTeamId ?? app.appleTeamId ?? null },
  );
  forgetLinkTargets();
  refreshSitesSoon([app.id]);
  revalidatePath(LINKS_PAGE);
  return { ok: true, message: "Saved. Phones read the change within a day; run “Check links” to see where things stand." };
}

export interface LinksCheckState {
  result: LinksCheckSnapshot | null;
  error?: string;
}

/** "Check links": the app's signing facts, and a WordPress site's two link files as phones fetch them. */
export async function checkLinksAction(previous: LinksCheckState): Promise<LinksCheckState> {
  void previous;
  const context = await requireApp();
  const store = await getStore();
  const limited = await hitRateLimit(store, LINK_CHECK_LIMIT, context.client.id);
  if (!limited.allowed) return { result: null, error: "Too many checks. Try again in a few minutes." };
  const now = new Date();
  const plan = await appPlan(store, context.license, now);
  const result = await checkAppLinks(context.app, { ios: hasFeature(plan, "ios"), now });
  await store.updateApp(context.app.id, { linksCheck: result }, now);
  revalidatePath("/dashboard/setup");
  return { result };
}

/** The rating prompt and crash reports switches. */
export async function saveAppHealthAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const app = context.app;
  const patch = { reviewPrompt: formData.get("reviewPrompt") === "on", crashReports: formData.get("crashReports") === "on" };
  await (await getStore()).updateApp(app.id, patch, new Date());
  await recordStaffChange(
    context,
    "Saved the rating prompt and crash reports",
    { reviewPrompt: app.reviewPrompt !== false, crashReports: app.crashReports !== false },
    patch,
  );
  refreshSitesSoon([app.id]);
  revalidatePath("/dashboard/stability");
  return { ok: true, message: "Saved. The app follows it the next time it opens." };
}
