import type { BlobStore } from "../blobs";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, AppLayoutRecord, MarketTemplate, MarketTemplateVersion, TemplateApplication, TemplateLicence } from "../data/types";
import { DEFAULT_HOSTED_SETTINGS } from "../data/types";
import { loadLayout, ownFontNames, publishLayout, saveDraft } from "../pages/layout";
import { categorySourcesFor, itemSourcesFor, screenOptionsFor } from "../pages/sources";
import type { Layout, LayoutContent } from "../pages/types";
import { parseLayoutContent } from "../pages/validate";
import type { PlanInfo } from "../plans";
import { designPages, fontsIn, picturesIn, withoutFonts, type DesignFile } from "../studio/design-file";
import { effectivePlans } from "../entitlements";
import { copyPictures, designPictures, installTemplateFonts, movePictures, ownFamily, readTemplateFonts, type PictureDeps } from "./assets";
import { applyWholeDesign } from "../studio/designs";
import { newNodeId } from "../studio/elements";
import { parseStudioScreens, studioScreensOn, type StudioScreens } from "../studio/screens";
import { isStudioProject } from "../studio/section";
import { appKindId, templateFits } from "./kinds";
import { versionDesign } from "./snapshot";

/**
 * 106.1 A template on a buyer's app. Applying it keeps the app's design as
 * it was (its draft, what its users have, its main colour and its screens'
 * looks) in the file store, puts the template's design in the draft (its
 * pages, tabs, bar, colours, fonts and screens' looks; the app's content
 * stays its own) and, when the app is live, publishes it; and records the
 * buyer's licence. Every design goes through the page checker first. Only
 * the account that owns the app does any of this (the dashboard's
 * owner-only `billing` permission, app/actions/studio-market.ts).
 *
 * - Restore: the app goes back to the design it had before the template.
 * - Move: the template goes to another app of the same kind, once every 30
 *   days, keeping its end date; the first app goes back to its design.
 * - Update: a newer version of the template, the app's texts and pictures
 *   kept where the new design has the same places for them.
 */

export const MOVE_EVERY_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

/** English texts the dashboard translates (studioMarket.known). */
export const APPLY_MESSAGES = {
  own: "This is your own template: you can't get it for your own apps.",
  notPublished: "This template isn't on Studio Market anymore.",
  app: "Choose one of your Studio projects.",
  kind: "This template doesn't fit that app's kind.",
  design: "This template's design can't be read. Tell our team.",
  invalid: "This template doesn't fit your app yet:",
  elsewhere: "This template is on another of your apps. Move it instead.",
  already: "This template is on that app already.",
  licence: "This template isn't yours to use anymore.",
  gone: "This was changed meanwhile. Reload the page.",
  previous: "The design your app had before can't be found.",
  tooSoon: "You can move a template once every 30 days.",
  sameApp: "Choose another app.",
  notApplied: "This template isn't on an app now.",
  upToDate: "Your app has the newest version already.",
  noUpdates: "Your plan for this template ended, so it stays on the version you have.",
  applied: "Applied. Your app has the new design.",
  appliedDraft: "Applied to your app's draft. Publish it from Studio when you're ready.",
  restored: "Your app went back to the design it had before.",
  moved: "Moved. The first app went back to the design it had before.",
  updated: "Updated to the newest version.",
} as const;

export type MarketDeps = {
  store: DataStore;
  blobs: BlobStore;
  now: Date;
  /**
   * 106.2 The platform's address and the Media library's reader: the
   * template's pictures at it are copied into the buyer's account, and its
   * fonts made the app's own (lib/studio-market/assets.ts). Without it the
   * design keeps its addresses (tests).
   */
  baseUrl?: string;
  readMedia?: PictureDeps["readMedia"];
};

/** The design an app had before a template: kept to go back to. */
export interface PreviousDesign {
  format: "yallapp-previous-design";
  version: 1;
  draft: LayoutContent;
  /** What the app's users had, without its version; null when it was never published. */
  published: LayoutContent | null;
  primaryColor: string;
  studioScreens: StudioScreens | null;
}

export type MarketResult<T = object> = ({ ok: true } & T) | { ok: false; message: string; errors?: string[] };

const fail = (message: string, errors?: string[]): { ok: false; message: string; errors?: string[] } => (errors?.length ? { ok: false, message, errors: errors.slice(0, 5) } : { ok: false, message });

function contentOf(layout: Layout | null): LayoutContent | null {
  if (!layout) return null;
  const { version: _version, ...content } = layout;
  void _version;
  return content;
}

/** The template's design made to fit the app, over the app's draft: its pages, tabs, bar and look. `keep` keeps the app's texts and pictures. */
export function designedLayout(app: App, draft: LayoutContent, file: DesignFile, now: Date, keep = false): LayoutContent {
  const pictures = new Map<string, string>();
  for (const p of file.pages) {
    for (const url of picturesIn(p.studio)) if (/^https?:\/\//.test(url)) pictures.set(url, url);
  }
  const sources = itemSourcesFor(app);
  const fitted = designPages(file, {
    sources,
    categorySources: categorySourcesFor(app).filter((s) => sources.includes(s)),
    screens: screenOptionsFor(app).map((s) => s.value),
    newId: newNodeId,
    pages: draft.pages,
    languages: draft.languages,
    pictures,
    now: now.toISOString(),
  });
  const open = draft.pages.find((p) => p.studio)?.slug ?? fitted[0]?.slug ?? "home";
  return applyWholeDesign(draft, fitted, file.look, { mode: "project", openSlug: open, pageIndex: 0, keep, now: now.toISOString(), designSlugs: file.pages.map((p) => p.slug) });
}

/** The template's screens' looks for this app, when it has Studio's screens and they pass their checker. */
function screensFor(app: App, file: DesignFile): StudioScreens | null {
  if (!file.look?.screens || !studioScreensOn(app)) return null;
  const parsed = parseStudioScreens(file.look.screens);
  return parsed.problems.length ? null : parsed.screens;
}

/** The design checked as the app's draft would be (nothing saved). */
async function check(store: DataStore, app: App, layout: LayoutContent, now: Date): Promise<string[] | null> {
  const parsed = parseLayoutContent(layout, { app, now, ownFonts: await ownFontNames(store, app.id) });
  return parsed.ok ? null : parsed.errors;
}

async function loadVersion(deps: MarketDeps, versionId: string | null): Promise<{ version: MarketTemplateVersion; file: DesignFile } | null> {
  const version = versionId ? await deps.store.getMarketTemplateVersion(versionId) : null;
  const file = version ? await versionDesign(deps.blobs, version) : null;
  return version && file ? { version, file } : null;
}

/** Saves the app's design as it is now, to go back to; its file store key. */
async function keepPrevious(deps: MarketDeps, app: App, record: AppLayoutRecord, applicationId: string): Promise<string> {
  const previous: PreviousDesign = {
    format: "yallapp-previous-design",
    version: 1,
    draft: record.draft,
    published: contentOf(record.published),
    primaryColor: app.primaryColor,
    studioScreens: app.hostedSettings?.studioScreens ?? null,
  };
  const key = `studio-market/previous/${app.id}/${applicationId}.json`;
  await deps.blobs.put(key, Buffer.from(JSON.stringify(previous), "utf8"), "application/json");
  return key;
}

/** The kept design, read back; null when it is missing or isn't one. */
export async function readPrevious(blobs: BlobStore, key: string): Promise<PreviousDesign | null> {
  const blob = await blobs.get(key);
  if (!blob) return null;
  try {
    const value = JSON.parse(blob.data.toString("utf8")) as PreviousDesign;
    return value && value.format === "yallapp-previous-design" && value.draft && Array.isArray(value.draft.pages) ? value : null;
  } catch {
    return null;
  }
}

/** Saves the design (checked) as the draft and, when the app is live, publishes it. Whether apps have it now. */
async function saveAndPublish(deps: MarketDeps, app: App, layout: LayoutContent, by: string, plan: PlanInfo | null): Promise<MarketResult<{ live: boolean }>> {
  const before = await loadLayout(deps.store, app, deps.now);
  const saved = await saveDraft(deps.store, app, layout, deps.now);
  if (!saved.ok) return fail(APPLY_MESSAGES.invalid, saved.errors);
  if (!before.published) return { ok: true, live: false };
  const published = await publishLayout(deps.store, app, undefined, by, deps.now, plan);
  return { ok: true, live: published.ok };
}

/** The app's main colour and screens' looks from the template (only valid ones). */
async function takeLook(deps: MarketDeps, app: App, file: DesignFile): Promise<void> {
  const primary = typeof file.look?.primary_color === "string" && /^#[0-9a-f]{6}$/i.test(file.look.primary_color) ? file.look.primary_color.toUpperCase() : null;
  const screens = screensFor(app, file);
  if (!primary && !screens) return;
  await deps.store.updateApp(
    app.id,
    {
      ...(primary ? { primaryColor: primary } : {}),
      ...(screens ? { hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...(app.hostedSettings ?? {}), studioScreens: screens } } : {}),
    },
    deps.now,
  );
}

export interface ApplyInput {
  clientId: string;
  /** The buyer's apps (they own every one). */
  apps: readonly App[];
  appId: string;
  template: MarketTemplate;
  /** One of their licences of this template, not on an app now; else a free one is used or made. */
  licenceId?: string | null;
  by: string;
  plan: PlanInfo | null;
}

/** Puts the template on one of the buyer's apps (lib comment above). */
export async function applyTemplate(deps: MarketDeps, input: ApplyInput): Promise<MarketResult<{ application: TemplateApplication; licence: TemplateLicence; live: boolean }>> {
  const { store, now } = deps;
  const { template } = input;
  if (template.clientId === input.clientId) return fail(APPLY_MESSAGES.own);
  if (template.status !== "published" || !template.currentVersionId) return fail(APPLY_MESSAGES.notPublished);
  const app = input.apps.find((a) => a.id === input.appId && a.clientId === input.clientId) ?? null;
  if (!app || !isStudioProject(app)) return fail(APPLY_MESSAGES.app);
  if (!templateFits(template, app)) return fail(APPLY_MESSAGES.kind);

  // Which licence: the one chosen, else a free one not on an app, else a new free one.
  let licence: TemplateLicence | null = null;
  if (input.licenceId) {
    licence = await store.getTemplateLicence(input.licenceId);
    if (!licence || licence.clientId !== input.clientId || licence.templateId !== template.id || licence.status !== "active") return fail(APPLY_MESSAGES.licence);
  } else {
    const mine = await store.listTemplateLicences({ clientId: input.clientId, templateId: template.id });
    if (mine.some((l) => l.status === "active" && l.appId === app.id)) return fail(APPLY_MESSAGES.already);
    licence = mine.find((l) => l.status === "active" && l.appId === null) ?? null;
    if (!licence && !template.free) return fail(APPLY_MESSAGES.licence);
  }
  if (licence?.appId === app.id) return fail(APPLY_MESSAGES.already);
  if (licence?.appId) return fail(APPLY_MESSAGES.elsewhere);

  // A licence whose plan ended stays on its version; the others get the newest.
  const versionId = licence && !getsUpdates(licence, now) ? licence.versionId : template.currentVersionId;
  const loaded = await loadVersion(deps, versionId);
  if (!loaded) return fail(APPLY_MESSAGES.design);
  const done = await putOn(deps, app, loaded, input.by, input.plan);
  if (!done.ok) return done;

  if (!licence) {
    licence = {
      id: newId(),
      templateId: template.id,
      clientId: input.clientId,
      plan: "free",
      status: "active",
      appId: app.id,
      versionId: loaded.version.id,
      startsAt: now,
      endsAt: null,
      movedAt: null,
      afterEnd: null,
      remindedEarlyFor: null,
      remindedLastFor: null,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await store.createTemplateLicence(licence);
  } else {
    await store.updateTemplateLicence(licence.id, { appId: app.id, versionId: loaded.version.id }, now);
    licence = { ...licence, appId: app.id, versionId: loaded.version.id, updatedAt: now };
  }
  const application: TemplateApplication = { ...done.application, licenceId: licence.id, templateId: template.id };
  await store.createTemplateApplication(application);
  return { ok: true, application, licence, live: done.live };
}

/**
 * The version's design on the app: the app's design kept, the template's
 * saved (and published when the app is live), its look taken, and whatever
 * template the app had ends (replaced). The application to record.
 */
async function putOn(
  deps: MarketDeps,
  app: App,
  loaded: { version: MarketTemplateVersion; file: DesignFile },
  by: string,
  plan: PlanInfo | null,
): Promise<MarketResult<{ application: Omit<TemplateApplication, "licenceId" | "templateId">; live: boolean }>> {
  const { store, now } = deps;
  const record = await loadLayout(store, app, now);
  const next = designedLayout(app, record.draft, await ownCopy(deps, app, loaded, by), now);
  const problems = await check(store, app, next, now);
  if (problems) return fail(APPLY_MESSAGES.invalid, problems);
  const id = newId();
  const previousKey = await keepPrevious(deps, app, record, id);
  const saved = await saveAndPublish(deps, app, next, by, plan);
  if (!saved.ok) {
    await deps.blobs.delete(previousKey).catch(() => {});
    return saved;
  }
  await takeLook(deps, app, loaded.file);
  // The template the app had: replaced (its licence free to go on another app).
  let replacedId: string | null = null;
  for (const open of await store.listTemplateApplications({ appId: app.id, open: true })) {
    if (await store.updateTemplateApplication(open.id, { endedAt: now, endReason: "replaced" })) {
      replacedId ??= open.id;
      const other = await store.getTemplateLicence(open.licenceId);
      if (other?.appId === app.id) await store.updateTemplateLicence(other.id, { appId: null }, now);
    }
  }
  return { ok: true, live: saved.live, application: { id, appId: app.id, versionId: loaded.version.id, previousKey, replacedId, appliedAt: now, endedAt: null, endReason: null, appliedBy: by } };
}

/**
 * 106.2 The version's design as the buyer's own: its pictures copied into
 * the buyer's account (the design pointing to the copies), its fonts made
 * the app's own fonts (or, when one can't be, the app's font there).
 */
async function ownCopy(deps: MarketDeps, app: App, loaded: { version: MarketTemplateVersion; file: DesignFile }, by: string): Promise<DesignFile> {
  if (!deps.baseUrl) return loaded.file;
  let file = movePictures(loaded.file, await copyPictures({ ...deps, baseUrl: deps.baseUrl }, designPictures(loaded.file), app.clientId, "buyer"));
  const families = [file.look?.font, file.look?.arabic_font, ...file.pages.flatMap((p) => fontsIn(p.studio))].filter((f): f is string => Boolean(f) && ownFamily(f!));
  if (families.length) {
    const fonts = await readTemplateFonts(deps.blobs, loaded.version);
    const { failed } = await installTemplateFonts({ ...deps, plans: await effectivePlans(deps.store) }, app, fonts, families, by);
    file = withoutFonts(file, new Set(failed));
  }
  return file;
}

/** Whether the buyer gets the template's new versions: free, lifetime or a plan still running. */
export function getsUpdates(licence: Pick<TemplateLicence, "status" | "plan" | "endsAt">, now: Date): boolean {
  if (licence.status !== "active") return false;
  return licence.plan === "free" || licence.plan === "life" || !licence.endsAt || licence.endsAt.getTime() > now.getTime();
}

/** When the licence may move again (now or earlier: it may). */
export function nextMoveAt(licence: Pick<TemplateLicence, "movedAt">): Date | null {
  return licence.movedAt ? new Date(licence.movedAt.getTime() + MOVE_EVERY_DAYS * DAY) : null;
}

export function mayMove(licence: Pick<TemplateLicence, "movedAt">, now: Date): boolean {
  const next = nextMoveAt(licence);
  return !next || next.getTime() <= now.getTime();
}

/** The app goes back to the design it had before (draft, what its users have, colour and screens). */
async function putBack(deps: MarketDeps, app: App, application: TemplateApplication, by: string, plan: PlanInfo | null): Promise<MarketResult> {
  const { store, now } = deps;
  const previous = await readPrevious(deps.blobs, application.previousKey);
  if (!previous) return fail(APPLY_MESSAGES.previous);
  const problems = await check(store, app, previous.draft, now);
  if (problems) return fail(APPLY_MESSAGES.invalid, problems);
  const record = await loadLayout(store, app, now);
  if (previous.published && record.published) {
    // What its users had comes back first, then the draft it had.
    const published = await publishLayout(store, app, previous.published, by, now, plan);
    if (!published.ok) return fail(APPLY_MESSAGES.invalid, published.errors);
  }
  const saved = await saveDraft(store, app, previous.draft, now);
  if (!saved.ok) return fail(APPLY_MESSAGES.invalid, saved.errors);
  await store.updateApp(app.id, { primaryColor: previous.primaryColor, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...(app.hostedSettings ?? {}), studioScreens: previous.studioScreens ?? undefined } }, now);
  return { ok: true };
}

/** The template this one replaced comes back on the app with the design (when its licence is free and still running). */
async function reopenReplaced(deps: MarketDeps, app: App, application: TemplateApplication): Promise<void> {
  const { store, now } = deps;
  if (!application.replacedId) return;
  const replaced = await store.getTemplateApplication(application.replacedId);
  if (!replaced || replaced.appId !== app.id || replaced.endReason !== "replaced") return;
  const licence = await store.getTemplateLicence(replaced.licenceId);
  if (!licence || licence.status !== "active" || licence.appId !== null) return;
  await store.createTemplateApplication({ ...replaced, id: newId(), appliedAt: now, endedAt: null, endReason: null });
  await store.updateTemplateLicence(licence.id, { appId: app.id }, now);
}

export interface OwnedInput {
  clientId: string;
  apps: readonly App[];
  by: string;
  plan: PlanInfo | null;
}

async function ownedApplication(store: DataStore, clientId: string, apps: readonly App[], applicationId: string): Promise<{ application: TemplateApplication; licence: TemplateLicence; app: App } | null> {
  const application = await store.getTemplateApplication(applicationId);
  if (!application || application.endedAt) return null;
  const licence = await store.getTemplateLicence(application.licenceId);
  const app = apps.find((a) => a.id === application.appId && a.clientId === clientId) ?? null;
  return licence && licence.clientId === clientId && app ? { application, licence, app } : null;
}

/** The app goes back to the design it had before the template; the licence stays the buyer's, on no app. */
export async function restorePrevious(deps: MarketDeps, input: OwnedInput & { applicationId: string }): Promise<MarketResult> {
  const owned = await ownedApplication(deps.store, input.clientId, input.apps, input.applicationId);
  if (!owned) return fail(APPLY_MESSAGES.gone);
  const back = await putBack(deps, owned.app, owned.application, input.by, input.plan);
  if (!back.ok) return back;
  if (!(await deps.store.updateTemplateApplication(owned.application.id, { endedAt: deps.now, endReason: "restored" }))) return fail(APPLY_MESSAGES.gone);
  if (owned.licence.appId === owned.app.id) await deps.store.updateTemplateLicence(owned.licence.id, { appId: null }, deps.now);
  await reopenReplaced(deps, owned.app, owned.application);
  return { ok: true };
}

/**
 * 106.2 A plan's end when the template said "back to the previous design"
 * (the daily job): the app gets the design it had before, the template
 * comes off it, and a template it replaced comes back.
 */
export async function takeOffAtEnd(deps: MarketDeps, licence: TemplateLicence, application: TemplateApplication, app: App, plan: PlanInfo | null): Promise<MarketResult> {
  const back = await putBack(deps, app, application, "Studio Market", plan);
  if (!back.ok) return back;
  if (!(await deps.store.updateTemplateApplication(application.id, { endedAt: deps.now, endReason: "ended" }))) return fail(APPLY_MESSAGES.gone);
  if (licence.appId === app.id) await deps.store.updateTemplateLicence(licence.id, { appId: null }, deps.now);
  await reopenReplaced(deps, app, application);
  return { ok: true };
}

/**
 * Moves the template to another of the buyer's apps of the same kind, once
 * every 30 days (kept by the database: two moves at once, one wins), with
 * the same end date; the first app goes back to the design it had before.
 */
export async function moveTemplate(deps: MarketDeps, input: OwnedInput & { licenceId: string; toAppId: string; template: MarketTemplate }): Promise<MarketResult<{ application: TemplateApplication }>> {
  const { store, now } = deps;
  const licence = await store.getTemplateLicence(input.licenceId);
  if (!licence || licence.clientId !== input.clientId || licence.templateId !== input.template.id || licence.status !== "active") return fail(APPLY_MESSAGES.licence);
  if (!licence.appId) return fail(APPLY_MESSAGES.notApplied);
  const from = input.apps.find((a) => a.id === licence.appId && a.clientId === input.clientId) ?? null;
  const to = input.apps.find((a) => a.id === input.toAppId && a.clientId === input.clientId) ?? null;
  if (!from) return fail(APPLY_MESSAGES.gone);
  if (!to || !isStudioProject(to)) return fail(APPLY_MESSAGES.app);
  if (to.id === from.id) return fail(APPLY_MESSAGES.sameApp);
  if (appKindId(to) !== appKindId(from) || !templateFits(input.template, to)) return fail(APPLY_MESSAGES.kind);
  if (!mayMove(licence, now)) return fail(APPLY_MESSAGES.tooSoon);
  const open = (await store.listTemplateApplications({ licenceId: licence.id, appId: from.id, open: true }))[0];
  if (!open) return fail(APPLY_MESSAGES.gone);
  // The version they have, checked on the new app before anything changes.
  const loaded = await loadVersion(deps, getsUpdates(licence, now) ? (input.template.currentVersionId ?? licence.versionId) : licence.versionId);
  if (!loaded) return fail(APPLY_MESSAGES.design);
  const target = await loadLayout(store, to, now);
  // Checked as it is, its own fonts aside (the copies are made, and the fonts added, when it goes on).
  const families = [loaded.file.look?.font, loaded.file.look?.arabic_font, ...loaded.file.pages.flatMap((p) => fontsIn(p.studio))].filter((f): f is string => Boolean(f) && ownFamily(f!));
  const problems = await check(store, to, designedLayout(to, target.draft, withoutFonts(loaded.file, new Set(families)), now), now);
  if (problems) return fail(APPLY_MESSAGES.invalid, problems);
  // The move rule, in the database.
  if (!(await store.moveTemplateLicence(licence.id, from.id, to.id, new Date(now.getTime() - MOVE_EVERY_DAYS * DAY), now))) return fail(APPLY_MESSAGES.tooSoon);
  const back = await putBack(deps, from, open, input.by, input.plan);
  if (!back.ok) {
    // The first app couldn't go back: nothing moves, and the move isn't counted.
    await store.updateTemplateLicence(licence.id, { appId: from.id, movedAt: licence.movedAt }, now);
    return back;
  }
  await store.updateTemplateApplication(open.id, { endedAt: now, endReason: "moved" });
  await reopenReplaced(deps, from, open);
  const done = await putOn(deps, to, loaded, input.by, input.plan);
  if (!done.ok) {
    // The first app has its own design back; the licence waits on no app (its move not counted), to apply again.
    await store.updateTemplateLicence(licence.id, { appId: null, movedAt: licence.movedAt }, now);
    return done;
  }
  const application: TemplateApplication = { ...done.application, licenceId: licence.id, templateId: input.template.id };
  await store.createTemplateApplication(application);
  await store.updateTemplateLicence(licence.id, { versionId: loaded.version.id }, now);
  return { ok: true, application };
}

/** The template's newest version on the app, its texts and pictures kept where they fit; only while the buyer gets updates. */
export async function updateToLatest(deps: MarketDeps, input: OwnedInput & { applicationId: string; template: MarketTemplate }): Promise<MarketResult<{ live: boolean }>> {
  const { store, now } = deps;
  const owned = await ownedApplication(store, input.clientId, input.apps, input.applicationId);
  if (!owned || owned.application.templateId !== input.template.id) return fail(APPLY_MESSAGES.gone);
  if (!getsUpdates(owned.licence, now)) return fail(APPLY_MESSAGES.noUpdates);
  if (!input.template.currentVersionId || input.template.currentVersionId === owned.application.versionId) return fail(APPLY_MESSAGES.upToDate);
  const loaded = await loadVersion(deps, input.template.currentVersionId);
  if (!loaded) return fail(APPLY_MESSAGES.design);
  const record = await loadLayout(store, owned.app, now);
  const next = designedLayout(owned.app, record.draft, await ownCopy(deps, owned.app, loaded, input.by), now, true);
  const problems = await check(store, owned.app, next, now);
  if (problems) return fail(APPLY_MESSAGES.invalid, problems);
  const saved = await saveAndPublish(deps, owned.app, next, input.by, input.plan);
  if (!saved.ok) return saved;
  await store.updateTemplateApplication(owned.application.id, { versionId: loaded.version.id });
  await store.updateTemplateLicence(owned.licence.id, { versionId: loaded.version.id }, now);
  return { ok: true, live: saved.live };
}
