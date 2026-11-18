"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorOf, clientFor, getCurrentUser, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { getStore } from "@/lib/data";
import type { MarketTemplate, MarketTemplateLang, MarketTemplatePatch, TemplateDesigner } from "@/lib/data/types";
import type { FormState } from "@/lib/forms";
import { joinAsDesigner, updateDesignerProfile } from "@/lib/studio-market/designers";
import {
  editable,
  ownProject,
  projectPages,
  publishUpdate,
  readAfterEnd,
  readKinds,
  readScreens,
  readTags,
  readTexts,
  sendForReview,
  startTemplate,
  TEMPLATE_LANGS,
  TEMPLATE_MESSAGES,
} from "@/lib/studio-market/templates";
import { DESIGNER_JOIN_COOKIE } from "@/lib/studio-market/join";
import { pictureCopying } from "@/lib/studio-market/media-read";
import { MARKET_PERIODS, readPlans } from "@/lib/studio-market/plans";
import { en } from "@/i18n/dashboard/studio-market";

/**
 * 106.1 A designer's actions: joining Studio Market (any account, no app or
 * plan needed), their profile, and publishing a template step by step.
 * Only the account's owner (the dashboard's owner-only `billing`), only on
 * their own templates and Studio projects.
 */

async function owner(): Promise<ClientContext> {
  const context = await clientFor("billing");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  return context;
}

async function designerOf(context: ClientContext): Promise<TemplateDesigner> {
  const designer = await (await getStore()).getTemplateDesignerByClient(context.client.id);
  if (!designer) redirect("/designer/join");
  return designer;
}

/** The designer's own template, or the templates page. */
async function ownTemplate(designer: TemplateDesigner, id: unknown): Promise<MarketTemplate> {
  const template = typeof id === "string" && id ? await (await getStore()).getMarketTemplate(id) : null;
  if (!template || template.designerId !== designer.id) redirect("/designer/templates");
  return template;
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

/** The "Become a designer" form, all three steps sent at once. */
export async function joinDesignerAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await owner();
  const values = { name: text(formData, "name"), slug: text(formData, "slug"), country: text(formData, "country"), bio: text(formData, "bio") };
  const store = await getStore();
  const existing = await store.getTemplateDesignerByClient(context.client.id);
  const result = existing
    ? await updateDesignerProfile(store, existing, values, new Date())
    : await joinAsDesigner(store, context.client, { ...values, terms: formData.get("terms") === "on" }, new Date());
  if (!result.ok) return { errors: result.errors, values };
  (await cookies()).delete(DESIGNER_JOIN_COOKIE);
  revalidatePath("/designer", "layout");
  if (existing) return { ok: true, message: en.known.saved, values };
  redirect("/designer/join?joined=1");
}

/** Signed out: where "Become a designer" leads after signing up or in. */
export async function designerSignUpAction(formData: FormData): Promise<void> {
  if (!(await getCurrentUser())) (await cookies()).set(DESIGNER_JOIN_COOKIE, "1", { path: "/", maxAge: 60 * 60, sameSite: "lax", httpOnly: true });
  redirect(formData.get("to") === "sign-in" ? "/sign-in" : "/sign-up");
}

/** Step 1 of a new template: its Studio project; the draft is made from it. */
export async function startTemplateAction(formData: FormData): Promise<void> {
  const context = await owner();
  const designer = await designerOf(context);
  const project = ownProject(context.apps, designer, text(formData, "app"));
  if (!project) redirect("/designer/publish?error=project");
  const template = await startTemplate(await getStore(), designer, project, new Date());
  revalidatePath("/designer", "layout");
  redirect(`/designer/publish?id=${template.id}#step-texts`);
}

/** One step of a template's page saved (a published template's page changes at once). */
export async function saveTemplateStepAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await owner();
  const designer = await designerOf(context);
  const template = await ownTemplate(designer, formData.get("id"));
  if (!editable(template)) return { message: TEMPLATE_MESSAGES.status };
  const store = await getStore();
  const now = new Date();
  const step = text(formData, "step");
  const project = ownProject(context.apps, designer, template.sourceAppId);
  let patch: MarketTemplatePatch = {};
  if (step === "project") {
    const next = ownProject(context.apps, designer, text(formData, "app"));
    if (!next || template.status === "published") return { errors: { app: TEMPLATE_MESSAGES.project } };
    patch = { sourceAppId: next.id, ...(next.id !== template.sourceAppId ? { screens: [] } : {}) };
  } else if (step === "texts") {
    const input = Object.fromEntries(TEMPLATE_LANGS.map((lang) => [lang, { title: text(formData, `${lang}_title`), short: text(formData, `${lang}_short`), description: text(formData, `${lang}_description`) }])) as Record<MarketTemplateLang, { title: string; short: string; description: string }>;
    const read = readTexts(input);
    if (!read.ok) return { errors: read.errors, values: Object.fromEntries(TEMPLATE_LANGS.flatMap((l) => ["title", "short", "description"].map((f) => [`${l}_${f}`, text(formData, `${l}_${f}`)]))) };
    patch = { texts: read.value };
  } else if (step === "screens") {
    if (!project) return { message: TEMPLATE_MESSAGES.project };
    const screens = readScreens(await projectPages(store, project, now), formData.getAll("screen").map(String));
    if (!screens) return { message: TEMPLATE_MESSAGES.screens };
    patch = { screens };
  } else if (step === "kinds") {
    if (!project) return { message: TEMPLATE_MESSAGES.project };
    const kinds = readKinds(project, formData.getAll("kind").map(String));
    const tags = readTags(text(formData, "tags"));
    const errors: Record<string, string> = {};
    if (!kinds) errors.kinds = TEMPLATE_MESSAGES.kinds;
    if (!tags) errors.tags = TEMPLATE_MESSAGES.tags;
    if (!kinds || !tags) return { errors, values: { tags: text(formData, "tags") } };
    patch = { kinds, tags };
  } else if (step === "plans") {
    // 106.2 Free, or the plans offered with their prices; a published template's go live at once (for the next purchases).
    const prices = Object.fromEntries(MARKET_PERIODS.map((p) => [p, text(formData, `price_${p}`)]));
    const read = readPlans({ free: formData.get("free") === "on", offered: formData.getAll("offer").map(String), prices });
    if (!read.ok) return { errors: read.errors, values: Object.fromEntries(MARKET_PERIODS.map((p) => [`price_${p}`, prices[p] ?? ""])) };
    patch = { free: read.free, plans: read.plans };
  } else if (step === "after_end") {
    const afterEnd = readAfterEnd(formData.get("afterEnd"));
    if (!afterEnd) return { errors: { afterEnd: TEMPLATE_MESSAGES.afterEnd } };
    patch = { afterEnd };
  } else return { message: TEMPLATE_MESSAGES.status };
  if (!(await store.updateMarketTemplate(template.id, patch, now))) return { message: TEMPLATE_MESSAGES.status };
  revalidatePath("/designer", "layout");
  return { ok: true, message: TEMPLATE_MESSAGES.saved };
}

/** Step 7: the project's design now sent to the team. */
export async function sendTemplateAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await owner();
  const designer = await designerOf(context);
  const template = await ownTemplate(designer, formData.get("id"));
  const project = ownProject(context.apps, designer, template.sourceAppId);
  const values = { note: text(formData, "note") };
  const sent = await sendForReview({ store: await getStore(), blobs: getBlobStore(), now: new Date(), ...pictureCopying() }, template, project, { rights: formData.get("rights") === "on", note: values.note }, actorOf(context).email);
  if (!sent.ok) return { message: sent.message, ...(sent.errors ? { errors: { details: sent.errors.join("\n") } } : {}), values };
  revalidatePath("/designer", "layout");
  redirect("/designer/templates?sent=1");
}

/** A published template's update: live at once, without another review. */
export async function publishTemplateUpdateAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await owner();
  const designer = await designerOf(context);
  const template = await ownTemplate(designer, formData.get("id"));
  const project = ownProject(context.apps, designer, template.sourceAppId);
  const sent = await publishUpdate({ store: await getStore(), blobs: getBlobStore(), now: new Date(), ...pictureCopying() }, template, project, actorOf(context).email);
  if (!sent.ok) return { message: sent.message, ...(sent.errors ? { errors: { details: sent.errors.join("\n") } } : {}) };
  revalidatePath("/designer", "layout");
  revalidatePath("/studio/market", "layout");
  return { ok: true, message: TEMPLATE_MESSAGES.updated };
}

/** A draft never published, deleted. */
export async function deleteTemplateDraftAction(formData: FormData): Promise<void> {
  const context = await owner();
  const designer = await designerOf(context);
  const template = await ownTemplate(designer, formData.get("id"));
  const store = await getStore();
  // The design it was sent with (sent back with notes) goes from the file store too.
  const version = template.reviewVersionId ? await store.getMarketTemplateVersion(template.reviewVersionId) : null;
  if (await store.deleteMarketTemplate(template.id)) {
    if (version) await getBlobStore().delete(version.blobKey).catch(() => {});
  }
  revalidatePath("/designer", "layout");
  redirect("/designer/templates?deleted=1");
}
