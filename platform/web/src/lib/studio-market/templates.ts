import { kindOf } from "../app/kinds";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, MarketAfterEnd, MarketTemplate, MarketTemplateLang, MarketTemplateText, TemplateDesigner } from "../data/types";
import { loadLayout } from "../pages/layout";
import { isStudioProject } from "../studio/section";
import { designerSlug } from "./designers";
import { kindsForEngine, MAX_TEMPLATE_KINDS } from "./kinds";
import { takeSnapshot, type SnapshotDeps } from "./snapshot";

/**
 * 106.1 Publishing a template, in seven short steps on one page: the Studio
 * project, its title and description in each language, its pictures (taken
 * from Studio: the project's pages drawn as the app draws them), the app
 * kinds and tags, its plans (free for now), what happens when a plan ends,
 * and sending it for review. The draft is saved as the designer goes;
 * nothing is public until the team approves it. Reviewed once: later
 * updates of a published template go live at once.
 */

export const TEMPLATE_LIMITS = { title: 40, short: 80, description: 1200, tags: 8, tag: 24, note: 1000, screens: 40 } as const;

export const TEMPLATE_LANGS: readonly MarketTemplateLang[] = ["en", "ar", "tr"];

/** English texts the dashboard translates (studioMarket.known). */
export const TEMPLATE_MESSAGES = {
  project: "Choose one of your Studio projects.",
  title: "Enter a title, up to 40 characters.",
  short: "Enter a short line, up to 80 characters.",
  description: "Keep the description to 1,200 characters.",
  english: "Write the English title, short line and description: buyers see them where their language is missing.",
  screens: "Keep at least one page for the pictures.",
  kinds: "Choose one to three app kinds.",
  tags: "Use up to 8 tags of up to 24 characters each.",
  afterEnd: "Choose what happens when a plan ends.",
  rights: "Confirm you own, or have the rights to, every photo, font and icon in it.",
  note: "Keep the note to 1,000 characters.",
  notReady: "Finish the steps first.",
  status: "This template can't be changed now. Reload the page.",
  saved: "Saved.",
  sent: "Sent for review. We'll email you when it's published, or with notes.",
  updated: "Your update is live. Buyers get it from their My templates page.",
  invalid: "Your project has something to fix first:",
  noPages: "Your project has no Studio pages yet.",
  tooBig: "This project is too big to send. Remove some pages and try again.",
  deleted: "The draft was deleted.",
} as const;

export type TemplateStep = "project" | "texts" | "screens" | "kinds" | "plans" | "after_end" | "send";

/** A new draft from one of the designer's Studio projects: its name, its kind and its pages in order. */
export async function startTemplate(store: DataStore, designer: TemplateDesigner, app: App, now: Date): Promise<MarketTemplate> {
  const name = (app.appName ?? "").trim().slice(0, TEMPLATE_LIMITS.title);
  const base = designerSlug(name) || "template";
  const template: MarketTemplate = {
    id: newId(),
    designerId: designer.id,
    clientId: designer.clientId,
    sourceAppId: app.id,
    slug: `${base}-${newId().slice(0, 6)}`,
    status: "draft",
    texts: name ? { en: { title: name, short: "", description: "" } } : {},
    kinds: [kindOf(app).id],
    tags: [],
    free: true,
    plans: [],
    afterEnd: "keep",
    screens: [],
    rightsConfirmedAt: null,
    noteToTeam: null,
    currentVersionId: null,
    reviewVersionId: null,
    submittedAt: null,
    publishedAt: null,
    views: 0,
    createdAt: now,
    updatedAt: now,
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    const created = await store.createMarketTemplate(attempt ? { ...template, slug: `${base}-${newId().slice(0, 8)}` } : template);
    if (created) return created;
  }
  throw new Error("No free address for the template.");
}

/** The designer's own Studio project, or null. */
export function ownProject(apps: readonly App[], designer: Pick<TemplateDesigner, "clientId">, appId: string | null | undefined): App | null {
  const app = apps.find((a) => a.id === appId) ?? null;
  return app && app.clientId === designer.clientId && isStudioProject(app) ? app : null;
}

/** Whether the designer may still change the template's draft steps (not while the team reviews it). */
export function editable(template: Pick<MarketTemplate, "status">): boolean {
  return template.status !== "in_review";
}

/** The texts as sent, checked: English is needed, Arabic and Turkish are optional (all three of a language, or none). */
export function readTexts(input: Partial<Record<MarketTemplateLang, Partial<MarketTemplateText>>>): { ok: true; value: MarketTemplate["texts"] } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const value: MarketTemplate["texts"] = {};
  for (const lang of TEMPLATE_LANGS) {
    const raw = input[lang] ?? {};
    const title = (raw.title ?? "").replace(/\s+/g, " ").trim();
    const short = (raw.short ?? "").replace(/\s+/g, " ").trim();
    const description = (raw.description ?? "").replace(/\r\n?/g, "\n").trim();
    if (!title && !short && !description) {
      if (lang === "en") errors[`en_title`] = TEMPLATE_MESSAGES.english;
      continue;
    }
    if (!title || title.length > TEMPLATE_LIMITS.title) errors[`${lang}_title`] = TEMPLATE_MESSAGES.title;
    if (!short || short.length > TEMPLATE_LIMITS.short) errors[`${lang}_short`] = TEMPLATE_MESSAGES.short;
    if (description.length > TEMPLATE_LIMITS.description || (lang === "en" && !description)) errors[`${lang}_description`] = lang === "en" && !description ? TEMPLATE_MESSAGES.english : TEMPLATE_MESSAGES.description;
    value[lang] = { title, short, description };
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

/** The kinds as sent: one to three of the project's engine. */
export function readKinds(app: Pick<App, "appType">, kinds: readonly string[]): string[] | null {
  const allowed = new Set(kindsForEngine(app.appType).map((k) => k.id));
  const picked = [...new Set(kinds)].filter((k) => allowed.has(k));
  return picked.length >= 1 && picked.length <= MAX_TEMPLATE_KINDS && picked.length === new Set(kinds).size ? picked : null;
}

/** The tags as sent ("parcels, couriers"): small letters, at most eight. */
export function readTags(text: string): string[] | null {
  const tags = [...new Set(text.split(/[,،\n]/).map((t) => t.replace(/\s+/g, " ").trim().toLowerCase()).filter(Boolean))];
  if (tags.length > TEMPLATE_LIMITS.tags || tags.some((t) => t.length > TEMPLATE_LIMITS.tag)) return null;
  return tags;
}

export function readAfterEnd(value: unknown): MarketAfterEnd | null {
  return value === "keep" || value === "restore" ? value : null;
}

/** The project's Studio pages, as the pictures step lists them. */
export async function projectPages(store: DataStore, app: App, now: Date): Promise<{ slug: string; title: string }[]> {
  const record = await loadLayout(store, app, now);
  return record.draft.pages.filter((p) => p.studio).map((p) => ({ slug: p.slug, title: p.title }));
}

/** The pictures' order as sent: the project's pages only, at least one. */
export function readScreens(pages: readonly { slug: string }[], order: readonly string[]): string[] | null {
  const known = new Set(pages.map((p) => p.slug));
  const picked = [...new Set(order)].filter((s) => known.has(s)).slice(0, TEMPLATE_LIMITS.screens);
  return picked.length ? picked : null;
}

/** Which steps are done, in order (the stepper's ticks and what "Send for review" needs). */
export function stepsDone(template: MarketTemplate, project: App | null): Record<Exclude<TemplateStep, "send">, boolean> {
  const en = template.texts.en;
  return {
    project: Boolean(project),
    texts: Boolean(en?.title && en.short && en.description),
    screens: template.screens.length > 0,
    kinds: template.kinds.length > 0 && template.kinds.length <= MAX_TEMPLATE_KINDS,
    plans: template.free || template.plans.length > 0,
    after_end: template.afterEnd === "keep" || template.afterEnd === "restore",
  };
}

export type SendResult = { ok: true; template: MarketTemplate } | { ok: false; message: string; errors?: string[] };

/**
 * Sends the template to the team: its project's design now is taken as a
 * new version, and the template waits in the review queue (oldest first).
 * A template sent back with notes is sent again the same way.
 */
export async function sendForReview(deps: SnapshotDeps, template: MarketTemplate, project: App | null, input: { rights: boolean; note: string }, by: string | null): Promise<SendResult> {
  if (template.status !== "draft" && template.status !== "changes_requested") return { ok: false, message: TEMPLATE_MESSAGES.status };
  const done = stepsDone(template, project);
  if (!project || Object.values(done).some((d) => !d)) return { ok: false, message: TEMPLATE_MESSAGES.notReady };
  if (!input.rights) return { ok: false, message: TEMPLATE_MESSAGES.rights };
  const note = input.note.replace(/\r\n?/g, "\n").trim();
  if (note.length > TEMPLATE_LIMITS.note) return { ok: false, message: TEMPLATE_MESSAGES.note };
  const snap = await takeSnapshot(deps, template, project, by);
  if (!snap.ok) return snapshotFailure(snap);
  const patch = { status: "in_review" as const, reviewVersionId: snap.version.id, submittedAt: deps.now, rightsConfirmedAt: deps.now, noteToTeam: note || null };
  if (!(await deps.store.moveMarketTemplate(template.id, template.status, patch, deps.now))) return { ok: false, message: TEMPLATE_MESSAGES.status };
  return { ok: true, template: { ...template, ...patch, updatedAt: deps.now } };
}

/** A published template's update: its project's design now goes live at once as the next version, without another review. */
export async function publishUpdate(deps: SnapshotDeps, template: MarketTemplate, project: App | null, by: string | null): Promise<SendResult> {
  if (template.status !== "published") return { ok: false, message: TEMPLATE_MESSAGES.status };
  if (!project) return { ok: false, message: TEMPLATE_MESSAGES.project };
  const snap = await takeSnapshot(deps, template, project, by);
  if (!snap.ok) return snapshotFailure(snap);
  const patch = { status: "published" as const, currentVersionId: snap.version.id };
  if (!(await deps.store.moveMarketTemplate(template.id, "published", patch, deps.now))) return { ok: false, message: TEMPLATE_MESSAGES.status };
  return { ok: true, template: { ...template, ...patch, updatedAt: deps.now } };
}

function snapshotFailure(snap: { error: "no_pages" | "too_big" | "invalid"; errors?: string[] }): SendResult {
  if (snap.error === "no_pages") return { ok: false, message: TEMPLATE_MESSAGES.noPages };
  if (snap.error === "too_big") return { ok: false, message: TEMPLATE_MESSAGES.tooBig };
  return { ok: false, message: TEMPLATE_MESSAGES.invalid, errors: (snap.errors ?? []).slice(0, 5) };
}

/** The template's text in a language, English where that language has none. */
export function templateText(template: Pick<MarketTemplate, "texts" | "slug">, lang: string): MarketTemplateText {
  const own = template.texts[lang as MarketTemplateLang];
  const en = template.texts.en;
  return {
    title: own?.title || en?.title || template.slug,
    short: own?.short || en?.short || "",
    description: own?.description || en?.description || "",
  };
}
