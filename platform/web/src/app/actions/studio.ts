"use server";

import { redirect } from "next/navigation";
import { clientFor, mayUseDashboard } from "@/lib/auth/session";
import { newId } from "@/lib/crypto/tokens";
import { currentPlanId } from "@/lib/billing/plan-change";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { hasFeature } from "@/lib/plans";
import type { StudioTemplate } from "@/lib/data/types";
import { loadLayout } from "@/lib/pages/layout";
import { parseStudioPage } from "@/lib/pages/validate";

/** 103R Yallapp Studio: an account's own templates. */

/** At most this many own templates per account. */
const MAX_STUDIO_TEMPLATES = 50;

export type StudioTemplateView = Pick<StudioTemplate, "id" | "name" | "page">;

async function requireStudioApp() {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app) redirect("/dashboard/app-type");
  return { ...context, app: context.app };
}

/** Saves a Studio page as one of the account's own templates. */
export async function saveStudioTemplateAction(name: string, pageJson: string): Promise<{ ok: true; template: StudioTemplateView } | { ok: false; error: string }> {
  const { app, user, staff, license } = await requireStudioApp();
  const store = await getStore();
  // 103R Own templates with "Save pages as own templates" on the plan; before activation, to try.
  const planId = license ? currentPlanId(license, new Date()) : null;
  if (planId && !hasFeature((await effectivePlans(store))[planId], "studio_templates")) return { ok: false, error: "Saving pages as your own templates isn't on your plan." };
  const title = typeof name === "string" ? name.trim() : "";
  if (!title || title.length > 60) return { ok: false, error: "Give the template a name of up to 60 characters." };
  if ((await store.listStudioTemplates(app.clientId)).length >= MAX_STUDIO_TEMPLATES) return { ok: false, error: `You can keep up to ${MAX_STUDIO_TEMPLATES} templates. Delete one first.` };
  let value: unknown = null;
  try {
    value = typeof pageJson === "string" && pageJson.length <= 300_000 ? JSON.parse(pageJson) : null;
  } catch {
    value = null;
  }
  const now = new Date();
  const layout = await loadLayout(store, app, now);
  const parsed = parseStudioPage(value, app, layout.draft.languages);
  if (!parsed.ok) return { ok: false, error: parsed.errors[0] ?? "The page isn't valid." };
  const template: StudioTemplate = { id: newId(), clientId: app.clientId, name: title, page: parsed.value, createdAt: now, createdBy: (staff ?? user).email };
  await store.createStudioTemplate(template);
  return { ok: true, template: { id: template.id, name: template.name, page: template.page } };
}

/** Deletes one of the account's own templates. */
export async function deleteStudioTemplateAction(id: string): Promise<{ ok: boolean }> {
  const { app } = await requireStudioApp();
  return { ok: typeof id === "string" && (await (await getStore()).deleteStudioTemplate(app.clientId, id)) };
}
