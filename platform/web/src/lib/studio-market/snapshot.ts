import type { BlobStore } from "../blobs";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, MarketTemplate, MarketTemplateCover, MarketTemplateVersion } from "../data/types";
import { freeFont } from "../fonts/catalog";
import { loadLayout, ownFontNames } from "../pages/layout";
import type { LayoutPage, StudioNode } from "../pages/types";
import { parseLayoutContent } from "../pages/validate";
import { readDesignFile, withoutFonts, writeDesignFile, type DesignFile } from "../studio/design-file";
import { screensConfig } from "../studio/screens";

/**
 * 106.1 A template's version: a snapshot of its Studio project's design,
 * made as a whole project's design file (lib/studio/design-file.ts) with
 * its pages, tabs, tab bar, colours, fonts and screens' looks. Its pictures
 * stay at their addresses (already saved with the designer's account); the
 * project's own fonts aren't in it, so buyers' apps show the app's font
 * there instead. Buyers get a copy as it is when it is sent: later changes
 * in Studio reach them only when the designer sends an update.
 */

/** The largest design file a version keeps (no pictures inside it). */
export const SNAPSHOT_BYTES = 4 * 1024 * 1024;

export type SnapshotError = "no_pages" | "too_big" | "invalid";

/** How many elements a page holds (what the template page counts). */
export function elementCount(node: StudioNode): number {
  return 1 + (node.children ?? []).reduce((n, c) => n + elementCount(c), 0) + (node.card ? elementCount(node.card) : 0);
}

/** The project's Studio pages in the order the designer chose for the pictures (the cover first), then the rest. */
export function orderedPages(pages: readonly LayoutPage[], order: readonly string[]): LayoutPage[] {
  const studio = pages.filter((p) => p.studio);
  const chosen = order.map((slug) => studio.find((p) => p.slug === slug)).filter((p): p is LayoutPage => Boolean(p));
  return [...chosen, ...studio.filter((p) => !chosen.includes(p))];
}

/**
 * The project's design now, as a design file, checked by the page checker
 * first (what a buyer gets must open in an app). Its own fonts are left out.
 */
export async function projectDesign(store: DataStore, app: App, name: string, order: readonly string[], now: Date): Promise<{ ok: true; file: DesignFile } | { ok: false; error: SnapshotError; errors?: string[] }> {
  const record = await loadLayout(store, app, now);
  const own = await ownFontNames(store, app.id);
  const checked = parseLayoutContent(record.draft, { app, now, ownFonts: own });
  if (!checked.ok) return { ok: false, error: "invalid", errors: checked.errors };
  const draft = checked.value;
  const pages = orderedPages(draft.pages, order);
  if (!pages.length) return { ok: false, error: "no_pages" };
  const screens = screensConfig(app).screens;
  const file: DesignFile = {
    format: "yallapp-design",
    version: 1,
    kind: "project",
    name,
    made_at: now.toISOString(),
    languages: draft.languages,
    pages: pages.map((p) => ({ slug: p.slug, title: p.title, ...(p.translations ? { translations: p.translations } : {}), studio: p.studio! })),
    look: {
      font: draft.appearance.font_family ?? draft.appearance.font,
      ...(draft.appearance.arabic_font ? { arabic_font: draft.appearance.arabic_font } : {}),
      primary_color: app.primaryColor,
      secondary_color: draft.appearance.secondary_color ?? null,
      tabs: draft.tabs,
      ...(draft.tab_bar ? { tab_bar: draft.tab_bar } : {}),
      ...(screens ? { screens } : {}),
    },
    pictures: {},
    fonts: [],
  };
  // The project's own fonts stay with the project: a buyer's app shows its own font there.
  const ownUsed = new Set(own.filter((family) => !freeFont(family)));
  return { ok: true, file: withoutFonts(file, ownUsed) };
}

/** The first page and the look around it, for the market's cards. */
export function coverOf(file: DesignFile): MarketTemplateCover | null {
  const first = file.pages[0];
  if (!first) return null;
  return {
    page: first.studio,
    lang: file.languages.default,
    font: file.look?.font ?? "Cairo",
    brand: file.look?.primary_color ?? "#0E0D24",
    accent: file.look?.secondary_color ?? null,
    tabs: file.look?.tabs ?? [],
    ...(file.look?.tab_bar ? { tabBar: file.look.tab_bar } : {}),
  };
}

export interface SnapshotDeps {
  store: DataStore;
  blobs: BlobStore;
  now: Date;
}

/** Takes the project's design as the template's next version (kept in the file store). */
export async function takeSnapshot(
  deps: SnapshotDeps,
  template: Pick<MarketTemplate, "id" | "screens" | "texts" | "slug">,
  app: App,
  by: string | null,
): Promise<{ ok: true; version: MarketTemplateVersion } | { ok: false; error: SnapshotError; errors?: string[] }> {
  const made = await projectDesign(deps.store, app, template.texts.en?.title ?? template.slug, template.screens, deps.now);
  if (!made.ok) return made;
  const text = writeDesignFile(made.file);
  if (text.length > SNAPSHOT_BYTES) return { ok: false, error: "too_big" };
  const number = (await deps.store.lastMarketTemplateVersion(template.id)) + 1;
  const id = newId();
  const blobKey = `studio-market/${template.id}/v${number}-${id}.json`;
  const data = Buffer.from(text, "utf8");
  await deps.blobs.put(blobKey, data, "application/json");
  const version: MarketTemplateVersion = {
    id,
    templateId: template.id,
    number,
    blobKey,
    sizeBytes: data.length,
    pages: made.file.pages.length,
    elements: made.file.pages.reduce((n, p) => n + elementCount(p.studio.body), 0),
    languages: made.file.languages.available,
    cover: coverOf(made.file),
    createdAt: deps.now,
    createdBy: by,
  };
  await deps.store.createMarketTemplateVersion(version);
  return { ok: true, version };
}

/** A version's design file, read back and checked for its shape (the page checker checks it again where it is applied). */
export async function versionDesign(blobs: BlobStore, version: Pick<MarketTemplateVersion, "blobKey">): Promise<DesignFile | null> {
  const blob = await blobs.get(version.blobKey);
  if (!blob) return null;
  const read = readDesignFile(blob.data.toString("utf8"));
  return read.ok && read.file.kind === "project" ? read.file : null;
}
