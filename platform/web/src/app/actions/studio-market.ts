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
import { pictureCopying } from "@/lib/studio-market/media-read";
import { CHECKOUT_MESSAGES, startTemplateCheckout } from "@/lib/studio-market/checkout";
import { countryName } from "@/lib/account/country";
import { appUrl, encryptionKey, paymentApiUrls } from "@/lib/env";
import { callbackUrls } from "@/lib/payments/routes";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { yallappBilling, yallappPlanAccount } from "@/lib/settings/platform";
import { requestIp } from "@/lib/auth/session";
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
  // 106.2 The template's pictures copied into the buyer's account, its fonts made the app's own.
  return { store: await getStore(), blobs: getBlobStore(), now: new Date(), ...pictureCopying() };
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

/**
 * 106.2 Checkout: a plan of a paid template for one of the buyer's apps (or
 * to apply later), or a renewal of their licence; off to the gateway's page
 * (Yallapp's own account), the no-refunds consent required. The price comes
 * from the template here, never from the browser.
 */
export async function checkoutTemplateAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await owner();
  const store = await getStore();
  const now = new Date();
  const values = { plan: String(formData.get("plan") ?? ""), app: String(formData.get("app") ?? ""), consent: formData.get("consent") === "on" ? "on" : "" };
  const template = await store.getMarketTemplateBySlug(String(formData.get("template") ?? ""));
  if (!template) return { message: APPLY_MESSAGES.notPublished, values };
  const renewId = String(formData.get("renew") ?? "");
  const renew = renewId ? await store.getTemplateLicence(renewId) : null;
  if (renewId && (!renew || renew.clientId !== context.client.id)) return { message: CHECKOUT_MESSAGES.renewal, values };
  if (context.client.status === "suspended") return { message: CHECKOUT_MESSAGES.unavailable, values };
  const account = await yallappPlanAccount(store, encryptionKey());
  if (!account) return { message: CHECKOUT_MESSAGES.unavailable, values };
  if (!(await hitRateLimit(store, RATE_LIMITS.planPayment, `template:${context.client.id}`, now)).allowed) return { message: CHECKOUT_MESSAGES.busy, values };
  const started = await startTemplateCheckout(
    { store, account, egpPerUsd: (await yallappBilling(store, { fresh: true })).egpPerUsd, urls: paymentApiUrls(), now },
    {
      client: context.client,
      user: context.user,
      apps: context.apps,
      template,
      plan: values.plan,
      appId: renew || values.app === "later" || !values.app ? null : values.app,
      renew,
      consent: values.consent === "on",
      city: context.client.country ? countryName(context.client.country, "en") : "",
      ip: await requestIp(),
      callbackUrls: (token) => callbackUrls(appUrl(), "template", account.provider, token),
    },
  );
  if (!started.ok) return { message: started.message, ...(started.field ? { errors: { [started.field]: started.message } } : {}), values };
  await recordStaffChange({ ...context, app: null }, `Started a payment for the Studio Market template “${templateText(template, "en").title}”`);
  redirect(started.url);
}
