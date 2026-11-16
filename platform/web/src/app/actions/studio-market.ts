"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { actorOf, clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import type { FormState } from "@/lib/forms";
import { APPLY_MESSAGES, applyTemplate, moveTemplate, restorePrevious, updateToLatest, type MarketDeps } from "@/lib/studio-market/apply";
import { templateText } from "@/lib/studio-market/templates";
import { en } from "@/i18n/dashboard/studio-market";

/**
 * 106.1 A buyer's actions on Studio Market: applying a template to one of
 * their apps, moving it to another app of the same kind, going back to the
 * design the app had before, and taking a newer version. Only the account's
 * owner (the dashboard's owner-only `billing` permission: Yallapp's team
 * managing the dashboard too), only on their own apps.
 */

async function owner(): Promise<ClientContext> {
  const context = await clientFor("billing");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  return context;
}

async function deps(): Promise<MarketDeps> {
  return { store: await getStore(), blobs: getBlobStore(), now: new Date() };
}

/** The plan of the app it is applied on: its published layout keeps to it. */
async function planOf(context: ClientContext, appId: string, d: MarketDeps) {
  return appPlan(d.store, context.licenses.find((l) => l.appId === appId) ?? null, d.now);
}

/** The key of a message in studioMarket.known, for the page's notice after a redirect. */
function noticeKey(message: string): string {
  return Object.entries(en.known).find(([, text]) => text === message)?.[0] ?? "gone";
}

function back(params: Record<string, string>): never {
  redirect(`/dashboard/studio-market/mine?${new URLSearchParams(params)}`);
}

/** The template page's "Apply to my app": the template on the chosen app, a free licence recorded. */
export async function applyTemplateAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await owner();
  const d = await deps();
  const slug = String(formData.get("template") ?? "");
  const appId = String(formData.get("app") ?? "");
  const values = { app: appId };
  const template = slug ? await d.store.getMarketTemplateBySlug(slug) : null;
  if (!template) return { message: APPLY_MESSAGES.notPublished, values };
  const done = await applyTemplate(d, { clientId: context.client.id, apps: context.apps, appId, template, by: actorOf(context).email, plan: await planOf(context, appId, d) });
  if (!done.ok) return { message: done.message, ...(done.errors ? { errors: { details: done.errors.join("\n") } } : {}), values };
  const app = context.apps.find((a) => a.id === appId) ?? null;
  await recordStaffChange({ ...context, app }, `Applied the Studio Market template “${templateText(template, "en").title}”`);
  revalidatePath("/dashboard/studio-market", "layout");
  return { ok: true, message: done.live ? APPLY_MESSAGES.applied : APPLY_MESSAGES.appliedDraft, values: { ...values, licence: done.licence.id } };
}

/** My templates: a licence on no app, applied to one of the buyer's apps. */
export async function applyLicenceAction(formData: FormData): Promise<void> {
  const context = await owner();
  const d = await deps();
  const licence = await d.store.getTemplateLicence(String(formData.get("licence") ?? ""));
  const template = licence && licence.clientId === context.client.id ? await d.store.getMarketTemplate(licence.templateId) : null;
  if (!licence || !template) back({ error: noticeKey(APPLY_MESSAGES.licence) });
  const appId = String(formData.get("app") ?? "");
  const done = await applyTemplate(d, { clientId: context.client.id, apps: context.apps, appId, template, licenceId: licence.id, by: actorOf(context).email, plan: await planOf(context, appId, d) });
  if (!done.ok) back({ error: noticeKey(done.message), ...(done.errors?.[0] ? { detail: done.errors[0].slice(0, 300) } : {}) });
  await recordStaffChange({ ...context, app: context.apps.find((a) => a.id === appId) ?? null }, `Applied the Studio Market template “${templateText(template, "en").title}”`);
  revalidatePath("/dashboard/studio-market", "layout");
  back({ done: noticeKey(done.live ? APPLY_MESSAGES.applied : APPLY_MESSAGES.appliedDraft) });
}

/** My templates › Back to the previous design. */
export async function restoreTemplateAction(formData: FormData): Promise<void> {
  const context = await owner();
  const d = await deps();
  const applicationId = String(formData.get("application") ?? "");
  const application = await d.store.getTemplateApplication(applicationId);
  const done = await restorePrevious(d, { clientId: context.client.id, apps: context.apps, applicationId, by: actorOf(context).email, plan: application ? await planOf(context, application.appId, d) : null });
  if (!done.ok) back({ error: noticeKey(done.message), ...(done.errors?.[0] ? { detail: done.errors[0].slice(0, 300) } : {}) });
  await recordStaffChange({ ...context, app: context.apps.find((a) => a.id === application?.appId) ?? null }, "Went back to the design the app had before a Studio Market template");
  revalidatePath("/dashboard/studio-market", "layout");
  back({ done: noticeKey(APPLY_MESSAGES.restored) });
}

/** My templates › Switch app: to another app of the same kind, once every 30 days. */
export async function moveTemplateAction(formData: FormData): Promise<void> {
  const context = await owner();
  const d = await deps();
  const licence = await d.store.getTemplateLicence(String(formData.get("licence") ?? ""));
  const template = licence && licence.clientId === context.client.id ? await d.store.getMarketTemplate(licence.templateId) : null;
  if (!licence || !template) back({ error: noticeKey(APPLY_MESSAGES.licence) });
  const toAppId = String(formData.get("to") ?? "");
  const done = await moveTemplate(d, { clientId: context.client.id, apps: context.apps, licenceId: licence.id, toAppId, template, by: actorOf(context).email, plan: await planOf(context, toAppId, d) });
  if (!done.ok) back({ error: noticeKey(done.message), move: licence.id, ...(done.errors?.[0] ? { detail: done.errors[0].slice(0, 300) } : {}) });
  await recordStaffChange({ ...context, app: context.apps.find((a) => a.id === toAppId) ?? null }, `Moved the Studio Market template “${templateText(template, "en").title}” to this app`);
  revalidatePath("/dashboard/studio-market", "layout");
  back({ done: noticeKey(APPLY_MESSAGES.moved) });
}

/** My templates › Update: the template's newest version, the app's texts and pictures kept. */
export async function updateTemplateAction(formData: FormData): Promise<void> {
  const context = await owner();
  const d = await deps();
  const applicationId = String(formData.get("application") ?? "");
  const application = await d.store.getTemplateApplication(applicationId);
  const template = application ? await d.store.getMarketTemplate(application.templateId) : null;
  if (!application || !template) back({ error: noticeKey(APPLY_MESSAGES.gone) });
  const done = await updateToLatest(d, { clientId: context.client.id, apps: context.apps, applicationId, template, by: actorOf(context).email, plan: await planOf(context, application.appId, d) });
  if (!done.ok) back({ error: noticeKey(done.message), ...(done.errors?.[0] ? { detail: done.errors[0].slice(0, 300) } : {}) });
  await recordStaffChange({ ...context, app: context.apps.find((a) => a.id === application.appId) ?? null }, `Updated the Studio Market template “${templateText(template, "en").title}”`);
  revalidatePath("/dashboard/studio-market", "layout");
  back({ done: noticeKey(APPLY_MESSAGES.updated) });
}
