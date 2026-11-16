import type { BlobStore } from "../blobs";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, MarketTemplate, MarketTemplateCover, MarketTemplateVersion } from "../data/types";
import { freeFont } from "../fonts/catalog";
import { loadLayout, ownFontNames } from "../pages/layout";
import type { LayoutPage, StudioNode } from "../pages/types";
import { parseLayoutContent } from "../pages/validate";
import { fontsIn, readDesignFile, withoutFonts, writeDesignFile, type DesignFile } from "../studio/design-file";
import { copyPictures, copyProjectFonts, designPictures, fontsKey, movePictures, type PictureDeps } from "./assets";
import { screensConfig } from "../studio/screens";

/**
 * 106.1 A template's version: a snapshot of its Studio project's design,
 * made as a whole project's design file (lib/studio/design-file.ts) with
 * its pages, tabs, tab bar, colours, fonts and screens' looks. 106.2 Its
 * pictures kept on Yallapp are copied for the template, and the project's
 * uploaded fonts it uses are kept next to it (lib/studio-market/assets.ts),
 * so the designer's later changes to their files never reach it. Buyers get
 * a copy as it is when it is sent: later changes in Studio reach them only
 * when the designer sends an update.
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
 * first (what a buyer gets must open in an app). With `keepFonts`, its own
 * fonts stay named in it (the snapshot copies them); without, they're left out.
 */
export async function projectDesign(store: DataStore, app: App, name: string, order: readonly string[], now: Date, keepFonts: ReadonlySet<string> = new Set()): Promise<{ ok: true; file: DesignFile } | { ok: false; error: SnapshotError; errors?: string[] }> {
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
  // The project's own fonts not kept with the template stay with the project: a buyer's app shows its own font there.
  const ownUsed = new Set(own.filter((family) => !freeFont(family) && !keepFonts.has(family)));
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
  /** 106.2 The platform's address and the Media library's reader: the pictures at it are copied for the template (left as they are without it). */
  baseUrl?: string;
  readMedia?: PictureDeps["readMedia"];
}

/** Takes the project's design as the template's next version (kept in the file store). */
export async function takeSnapshot(
  deps: SnapshotDeps,
  template: Pick<MarketTemplate, "id" | "screens" | "texts" | "slug"> & Partial<Pick<MarketTemplate, "clientId">>,
  app: App,
  by: string | null,
): Promise<{ ok: true; version: MarketTemplateVersion } | { ok: false; error: SnapshotError; errors?: string[] }> {
  // 106.2 The project's uploaded fonts with files go with the template; the others are left out.
  const ownFonts = (await deps.store.listOwnFonts(app.id)).filter((f) => !freeFont(f.family) && f.files.length);
  const made = await projectDesign(deps.store, app, template.texts.en?.title ?? template.slug, template.screens, deps.now, new Set(ownFonts.map((f) => f.family)));
  if (!made.ok) return made;
  let file = made.file;
  // 106.2 Its pictures at Yallapp copied for the template.
  if (deps.baseUrl) file = movePictures(file, await copyPictures({ ...deps, baseUrl: deps.baseUrl }, designPictures(file), template.clientId ?? app.clientId, `template-${template.id}`, true));
  const used = new Set([file.look?.font, file.look?.arabic_font, ...file.pages.flatMap((p) => fontsIn(p.studio))].filter((f): f is string => Boolean(f)));
  const fonts = await copyProjectFonts(deps, template.id, ownFonts.filter((f) => used.has(f.family)));
  const text = writeDesignFile(file);
  if (text.length > SNAPSHOT_BYTES) return { ok: false, error: "too_big" };
  const number = (await deps.store.lastMarketTemplateVersion(template.id)) + 1;
  const id = newId();
  const blobKey = `studio-market/${template.id}/v${number}-${id}.json`;
  const data = Buffer.from(text, "utf8");
  await deps.blobs.put(blobKey, data, "application/json");
  if (fonts.fonts.length) await deps.blobs.put(fontsKey({ blobKey }), Buffer.from(JSON.stringify(fonts), "utf8"), "application/json");
  const version: MarketTemplateVersion = {
    id,
    templateId: template.id,
    number,
    blobKey,
    sizeBytes: data.length,
    pages: file.pages.length,
    elements: file.pages.reduce((n, p) => n + elementCount(p.studio.body), 0),
    languages: file.languages.available,
    cover: coverOf(file),
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
