import { sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, AppLayoutRecord } from "../data/types";
import { platformSetting } from "../settings/platform";
import { BUILT_IN_APP_DEFAULTS, defaultAppearance, defaultLayout } from "./defaults";
import type { AppDefaultsSetting, Appearance, Languages, Layout, LayoutContent, LayoutPage } from "./types";
import { parseLayoutContent, type ParseResult } from "./validate";
import type { PlanInfo } from "../plans";
import { languagesForPlan, layoutForPlan, planLayoutErrors } from "./plan";

/**
 * The draft and the published copy of an app's layout (roadmap 10.4). The
 * dashboard edits the draft; publishing copies it, with a new version, to
 * what apps get (10.5, 10.6).
 */

/** The defaults for new apps the team set in the admin (11.9), or the built-in ones. */
export async function appDefaults(store: DataStore): Promise<AppDefaultsSetting> {
  return (await platformSetting(store, "appDefaults"))?.value ?? BUILT_IN_APP_DEFAULTS;
}

/** `2026-10-13T18:00:00Z.4`: the publish time and how many publishes so far. */
export function layoutVersion(now: Date, count: number): string {
  return `${now.toISOString().replace(/\.\d{3}Z$/, "Z")}.${count}`;
}

function contentOf(layout: Layout): LayoutContent {
  const { version: _version, ...content } = layout;
  void _version;
  return content;
}

/** The app's layout; a first draft from the defaults when it has none yet (saved). */
export async function loadLayout(store: DataStore, app: App, now: Date): Promise<AppLayoutRecord> {
  const saved = await store.getAppLayout(app.id);
  if (saved) return saved;
  const record: AppLayoutRecord = {
    appId: app.id,
    draft: defaultLayout(app, await appDefaults(store), now),
    draftUpdatedAt: now,
    published: null,
    publishedAt: null,
    publishedBy: null,
    publishCount: 0,
  };
  await store.saveAppLayout(record);
  return record;
}

const withoutTime = (page: LayoutPage) => JSON.stringify({ ...page, updated_at: "" });

/** Pages keep their `updated_at` unless something in them changed. */
function stampPages(next: LayoutContent, previous: LayoutContent | null, now: Date): LayoutContent {
  const before = new Map((previous?.pages ?? []).map((p) => [p.slug, p]));
  return {
    ...next,
    pages: next.pages.map((page) => {
      const old = before.get(page.slug);
      return { ...page, updated_at: old && withoutTime(old) === withoutTime(page) ? old.updated_at : now.toISOString() };
    }),
  };
}

/** Checks and saves the dashboard's draft. */
export async function saveDraft(store: DataStore, app: App, input: unknown, now: Date): Promise<ParseResult<AppLayoutRecord>> {
  const parsed = parseLayoutContent(input, { app, now });
  if (!parsed.ok) return parsed;
  const record = await loadLayout(store, app, now);
  const saved: AppLayoutRecord = { ...record, draft: stampPages(parsed.value, record.draft, now), draftUpdatedAt: now };
  await store.saveAppLayout(saved);
  return { ok: true, value: saved };
}

/**
 * Saves the draft (when given) and publishes it with a new version. 13.1
 * `plan`: the app's plan, whose limits the published layout must keep (more
 * languages than it includes are refused).
 */
export async function publishLayout(
  store: DataStore,
  app: App,
  input: unknown | undefined,
  by: string,
  now: Date,
  plan: PlanInfo | null = null,
): Promise<ParseResult<AppLayoutRecord>> {
  let record = await loadLayout(store, app, now);
  if (input !== undefined) {
    const saved = await saveDraft(store, app, input, now);
    if (!saved.ok) return saved;
    record = saved.value;
  } else {
    // The stored draft is checked again: the app's type may have changed since.
    const parsed = parseLayoutContent(record.draft, { app, now });
    if (!parsed.ok) return parsed;
  }
  const planErrors = planLayoutErrors(record.draft, plan);
  if (planErrors.length) return { ok: false, errors: planErrors };
  const count = record.publishCount + 1;
  // A page the publish doesn't change keeps its published time; the others carry the time of their last edit.
  const before = new Map((record.published?.pages ?? []).map((p) => [p.slug, p]));
  const content: LayoutContent = {
    ...record.draft,
    pages: record.draft.pages.map((page) => {
      const old = before.get(page.slug);
      return old && withoutTime(old) === withoutTime(page) ? { ...page, updated_at: old.updated_at } : page;
    }),
  };
  const published: AppLayoutRecord = {
    ...record,
    // The draft takes the published page times, so it shows no changes.
    draft: content,
    published: { version: layoutVersion(now, count), ...content },
    publishedAt: now,
    publishedBy: by,
    publishCount: count,
  };
  await store.saveAppLayout(published);
  return { ok: true, value: published };
}

/** Back to what's published, or to the defaults when nothing is. */
export async function discardDraft(store: DataStore, app: App, now: Date): Promise<AppLayoutRecord> {
  const record = await loadLayout(store, app, now);
  const draft = record.published ? contentOf(record.published) : defaultLayout(app, await appDefaults(store), now);
  const saved = { ...record, draft, draftUpdatedAt: now };
  await store.saveAppLayout(saved);
  return saved;
}

/** Whether the draft differs from what's published. */
export function hasUnpublishedChanges(record: AppLayoutRecord): boolean {
  if (!record.published) return true;
  return JSON.stringify(record.draft) !== JSON.stringify(contentOf(record.published));
}

/** What apps get: the published layout, or null before the first publish. */
export async function publishedLayout(store: DataStore, appId: string): Promise<Layout | null> {
  return (await store.getAppLayout(appId))?.published ?? null;
}

/**
 * What the hosted API serves: the published layout, or before the first
 * publish the default pages and tabs for the app type, with a version that
 * changes when the defaults do.
 */
export async function servedLayout(store: DataStore, app: App, plan: PlanInfo | null = null): Promise<Layout> {
  const published = await publishedLayout(store, app.id);
  const defaults = await appDefaults(store);
  if (published) return layoutForPlan(published, app, plan, defaults);
  const content = defaultLayout(app, defaults, app.createdAt);
  return layoutForPlan({ version: `default.${sha256Hex(JSON.stringify(content)).slice(0, 16)}`, ...content }, app, plan, defaults);
}

/**
 * `Config.appearance` and `Config.languages`: from the published layout, or
 * the defaults before the first publish.
 */
export async function lookAndLanguages(
  store: DataStore,
  app: App,
  published?: Layout | null,
  plan: PlanInfo | null = null,
): Promise<{ appearance: Appearance; languages: Languages }> {
  const layout = published === undefined ? await publishedLayout(store, app.id) : published;
  if (layout) return { appearance: layout.appearance, languages: languagesForPlan(layout.languages, plan) };
  const defaults = await appDefaults(store);
  return { appearance: defaultAppearance(app, defaults), languages: languagesForPlan(defaults.languages, plan) };
}
