import { sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, AppLayoutRecord } from "../data/types";
import { foreignFigmaImages } from "../figma/images";
import { servedAppearance, shownAppearance, withLook } from "../fonts/look";
import { platformSetting } from "../settings/platform";
import { BUILT_IN_APP_DEFAULTS, defaultAppearance, defaultLayout } from "./defaults";
import { applyDesign, contactFacts, missingScreens, sampleTexts, socialProfilesOf, type Design } from "./designs";
import { appUrl } from "../env";
import { LAYOUT_LIMITS, type AppDefaultsSetting, type Appearance, type Languages, type Layout, type LayoutContent, type LayoutPage, type LayoutTab } from "./types";
import { parseLayoutContent, type ParseResult } from "./validate";
import type { PlanInfo } from "../plans";
import { languagesForPlan, layoutForPlan, planLayoutErrors } from "./plan";
import { withBuiltInTexts } from "./builtin";
import { withLanguageList } from "../i18n/packs";
import { designFitsApp, findDesign } from "./designs/catalog";

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

/**
 * Checks and saves the dashboard's draft. 43 A draft sent without
 * `strings` (the page editor's) keeps the interface strings it had; the
 * Translations page sends them.
 */
/** 97.2 The names of the app's own fonts, which its look may use. */
export async function ownFontNames(store: DataStore, appId: string): Promise<string[]> {
  return (await store.listOwnFonts(appId)).map((f) => f.family);
}

export async function saveDraft(store: DataStore, app: App, input: unknown, now: Date): Promise<ParseResult<AppLayoutRecord>> {
  const parsed = parseLayoutContent(input, { app, now, ownFonts: await ownFontNames(store, app.id) });
  if (!parsed.ok) return parsed;
  // 97.3 The Figma look names only this account's pictures from Figma files.
  const figma = parsed.value.figma_look;
  if (figma && (await foreignFigmaImages(store, app.clientId, [...(figma.logo_asset_id ? [figma.logo_asset_id] : []), ...figma.pictures.map((p) => p.asset_id)])).length) {
    return { ok: false, errors: ["Figma look: a picture isn't one of your files. Import it again."] };
  }
  const record = await loadLayout(store, app, now);
  const sentStrings = Boolean(input && typeof input === "object" && "strings" in input);
  const next: LayoutContent = sentStrings || !record.draft.strings ? parsed.value : { ...parsed.value, strings: record.draft.strings };
  const saved: AppLayoutRecord = { ...record, draft: stampPages(next, record.draft, now), draftUpdatedAt: now };
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
    const parsed = parseLayoutContent(record.draft, { app, now, ownFonts: await ownFontNames(store, app.id) });
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
  // 82.4 Kept in the publish history, to go back to.
  await store.addLayoutVersion({ appId: app.id, number: count, layout: published.published!, publishedAt: now, publishedBy: by }, LAYOUT_VERSIONS_KEPT);
  return { ok: true, value: published };
}

/** 82.4 One of the app's last publishes, as the editor lists it. */
export interface LayoutHistoryEntry {
  number: number;
  at: string;
  by: string | null;
}

/** 82.4 The app's kept publishes, newest first. */
export async function layoutHistory(store: DataStore, appId: string): Promise<LayoutHistoryEntry[]> {
  return (await store.listLayoutVersions(appId)).map((v) => ({ number: v.number, at: v.publishedAt.toISOString(), by: v.publishedBy }));
}

/** 82.4 How many of an app's publishes are kept to go back to. */
export const LAYOUT_VERSIONS_KEPT = 20;

/**
 * 82.4 An earlier publish as the draft, to look at and publish again (what's
 * published stays until then). Checked as any draft is: the app's type or
 * its content may have changed since. Null when that publish isn't kept.
 */
export async function restoreLayoutVersion(store: DataStore, app: App, number: number, now: Date): Promise<ParseResult<AppLayoutRecord> | null> {
  const version = await store.getLayoutVersion(app.id, number);
  if (!version) return null;
  const record = await loadLayout(store, app, now);
  // The interface strings stay the draft's own (the Languages page edits them).
  const content = withoutStrings(contentOf(version.layout));
  return saveDraft(store, app, record.draft.strings ? { ...content, strings: record.draft.strings } : content, now);
}

/**
 * 33 The draft a ready-made design makes for this app: the design on top of
 * the draft's look and languages, `look` (the Branding step's template and
 * font) last.
 */
export function designLayout(app: App, design: Design, current: Pick<LayoutContent, "appearance" | "languages"> & Partial<Pick<LayoutContent, "pages">>, now: Date, look: Partial<Appearance> = {}): LayoutContent {
  const layout = applyDesign(design, {
    appName: app.appName,
    facts: contactFacts(app),
    current,
    now,
    missingScreens: missingScreens(app),
    pictureBase: appUrl(),
    social: current.pages ? socialProfilesOf({ pages: current.pages }) : [],
  });
  return { ...layout, appearance: withLook(layout.appearance, look) };
}

/** 99.2 How a design is taken: everything (its pages, tabs and look), or only its look. */
export type DesignMode = "all" | "look";

export function isDesignMode(value: unknown): value is DesignMode {
  return value === "all" || value === "look";
}

/** 99.2 The draft in the design's look (colours, font, corners and cards); its pages, tabs and menu stay. */
export function designLookOnly(draft: LayoutContent, design: Pick<Design, "look">, look: Partial<Appearance> = {}): LayoutContent {
  return { ...draft, appearance: withLook(draft.appearance, { ...design.look, ...look }) };
}

/**
 * 99.2 The design's layout with the draft's pages it doesn't have, after its
 * own (as many as an app can have), each in the side menu: as the draft's
 * menu had it, or under its title.
 */
export function withKeptPages(layout: LayoutContent, draft: Pick<LayoutContent, "pages" | "menu">): LayoutContent {
  const own = new Set(layout.pages.map((p) => p.slug));
  const kept = draft.pages.filter((p) => !own.has(p.slug)).slice(0, Math.max(0, LAYOUT_LIMITS.maxPages - layout.pages.length));
  if (!kept.length) return layout;
  const menu = [...(layout.menu ?? [])];
  for (const page of kept) {
    if (menu.length >= LAYOUT_LIMITS.maxMenu || menu.some((m) => m.target.type === "page" && m.target.page_slug === page.slug)) continue;
    const before = draft.menu?.find((m) => m.target.type === "page" && m.target.page_slug === page.slug);
    menu.push(before && !menu.some((m) => m.id === before.id) ? structuredClone(before) : keptPageEntry(page, menu));
  }
  return { ...layout, pages: [...layout.pages, ...structuredClone(kept)], menu };
}

function keptPageEntry(page: LayoutPage, menu: readonly LayoutTab[]): LayoutTab {
  let id = `menu-${page.slug}`;
  for (let n = 2; menu.some((m) => m.id === id); n += 1) id = `menu-${page.slug}-${n}`;
  const translations = Object.fromEntries(
    Object.entries(page.translations ?? {})
      .filter(([, texts]) => texts.title)
      .map(([lang, texts]) => [lang, { label: texts.title! }]),
  );
  return { id, label: page.title, icon: "description", target: { type: "page", page_slug: page.slug }, ...(Object.keys(translations).length ? { translations } : {}) };
}

/**
 * 33 Replaces the draft with a design (never what's published) and
 * remembers it on the app. `samples`: the texts of the blocks the design
 * wrote samples in, which the editor marks until the owner changes them.
 * 99.2 Or takes only its look (`mode` "look"): the pages stay, and so do
 * the design the app started from and its samples; `keepPages` keeps the
 * draft's pages the design doesn't have.
 */
export async function saveDesignDraft(
  store: DataStore,
  app: App,
  design: Design,
  now: Date,
  look: Partial<Appearance> = {},
  options: { mode?: DesignMode; keepPages?: boolean } = {},
): Promise<ParseResult<{ record: AppLayoutRecord; samples: Record<string, string> | null }>> {
  const record = await loadLayout(store, app, now);
  if (options.mode === "look") {
    const saved = await saveDraft(store, app, designLookOnly(record.draft, design, look), now);
    return saved.ok ? { ok: true, value: { record: saved.value, samples: null } } : saved;
  }
  const made = designLayout(app, design, record.draft, now, look);
  const layout = options.keepPages ? withKeptPages(made, record.draft) : made;
  const saved = await saveDraft(store, app, layout, now);
  if (!saved.ok) return saved;
  await store.updateApp(app.id, { design: design.id }, now);
  return { ok: true, value: { record: saved.value, samples: sampleTexts(layout) } };
}

/** 33 The sample texts of the app's design, as it applies to the app now; none without a design. */
export async function designSamples(store: DataStore, app: App, now: Date): Promise<Record<string, string>> {
  const design = await findDesign(store, app.design);
  if (!design || !(await designFitsApp(store, design, app))) return {};
  return sampleTexts(designLayout(app, design, { appearance: { ...BUILT_IN_APP_DEFAULTS.appearance, secondary_color: null }, languages: BUILT_IN_APP_DEFAULTS.languages }, now));
}

/** Back to what's published, or to the defaults when nothing is. */
export async function discardDraft(store: DataStore, app: App, now: Date): Promise<AppLayoutRecord> {
  const record = await loadLayout(store, app, now);
  const draft = record.published ? contentOf(record.published) : defaultLayout(app, await appDefaults(store), now);
  const saved = { ...record, draft, draftUpdatedAt: now };
  await store.saveAppLayout(saved);
  return saved;
}

/** 43 The layout without the owner's interface strings (what the page editor works on). */
export function withoutStrings<T extends LayoutContent>(layout: T): T {
  if (!("strings" in layout)) return layout;
  const { strings: _strings, ...rest } = layout;
  void _strings;
  return rest as T;
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
export async function servedLayout(store: DataStore, app: App, plan: PlanInfo | null = null, options: { draft?: boolean; now?: Date } = {}): Promise<Layout> {
  // 43 With Yallapp's own translations of the texts it wrote, where the owner has none.
  // 17 The app preview can show the draft, with the plan's limits like the published layout.
  if (options.draft) return withBuiltInTexts(layoutForPlan(await draftLayout(store, app, options.now ?? new Date()), app, plan, await appDefaults(store)));
  const published = await publishedLayout(store, app.id);
  const defaults = await appDefaults(store);
  if (published) return withBuiltInTexts(layoutForPlan(published, app, plan, defaults));
  const content = defaultLayout(app, defaults, app.createdAt);
  return withBuiltInTexts(layoutForPlan({ version: `default.${sha256Hex(JSON.stringify(content)).slice(0, 16)}`, ...content }, app, plan, defaults));
}

/**
 * 17 The Pages & look draft as a layout, for the app preview. Its version
 * changes with every saved edit, so the preview never shows an old copy.
 */
export async function draftLayout(store: DataStore, app: App, now: Date): Promise<Layout> {
  const record = await loadLayout(store, app, now);
  return { version: `draft.${sha256Hex(JSON.stringify(record.draft)).slice(0, 16)}`, ...record.draft };
}

/**
 * `Config.appearance` and `Config.languages`: from the published layout, or
 * the defaults before the first publish. 43 With `packs`, each language's
 * names, direction and string pack (`Languages.list`); `draft` points the
 * packs at the draft's strings, for the preview.
 */
export async function lookAndLanguages(
  store: DataStore,
  app: App,
  published?: Layout | null,
  plan: PlanInfo | null = null,
  packs: { platformUrl: string; draft?: boolean } | null = null,
): Promise<{ appearance: Appearance; languages: Languages }> {
  const layout = published === undefined ? await publishedLayout(store, app.id) : published;
  const withList = (languages: Languages): Languages =>
    packs ? withLanguageList(languages, layout?.strings, { platformUrl: packs.platformUrl, appId: app.id, draft: packs.draft }) : languages;
  // 97.1 With the files of the look's free fonts, on Yallapp.
  const own = packs ? await store.listOwnFonts(app.id) : [];
  const served = (appearance: Appearance): Appearance => (packs ? servedAppearance(appearance, packs.platformUrl, own) : appearance);
  // 97.3 The Figma look when it's the one shown.
  const shown = (l: Layout) => shownAppearance(l, (id) => `${packs?.platformUrl ?? ""}/api/v1/assets/${id}`, own.map((f) => f.family));
  if (layout) return { appearance: served(shown(layout)), languages: withList(languagesForPlan(layout.languages, plan)) };
  const defaults = await appDefaults(store);
  return { appearance: served(defaultAppearance(app, defaults)), languages: withList(languagesForPlan(defaults.languages, plan)) };
}
