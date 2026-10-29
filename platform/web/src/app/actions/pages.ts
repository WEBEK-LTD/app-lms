"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App, AppLayoutRecord, SavedSection } from "@/lib/data/types";
import { discardDraft, hasUnpublishedChanges, isDesignMode, layoutHistory, loadLayout, publishLayout, restoreLayoutVersion, saveDesignDraft, saveDraft, withoutStrings, type DesignMode, type LayoutHistoryEntry } from "@/lib/pages/layout";
import { getBlobStore } from "@/lib/blobs";
import { FIGMA_IMAGE_BYTES, saveFigmaImage } from "@/lib/figma/images";
import { FIGMA_LINK_LIMITS, figmaDeps, figmaFileKey, figmaImageFills, figmaNodeId, figmaTokenLooksRight, readFigmaFile, readFigmaNodes, renderFigmaFrames, type FigmaApiError, type FigmaFileRead } from "@/lib/figma/api";
import { figmaFrame, withFigmaPictures, type FigmaNeeds } from "@/lib/studio/import/figma";
import type { DesignFrame } from "@/lib/studio/import/frame";
import { FIGMA_PAGE_LIMITS, figmaFramePage, figmaPictureNodes, figmaScreens, type FigmaImportedPage, type FigmaNode } from "@/lib/figma/pages";
import { assetUrl } from "@/lib/assets";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { addOwnFont, OWN_FONT_LIMITS, ownFontView, removeOwnFont, type OwnFontError, type OwnFontView } from "@/lib/fonts/own";
import { saveSection, type SaveSectionError } from "@/lib/pages/sections";
import type { LayoutContent } from "@/lib/pages/types";
import { appPlan, effectivePlans } from "@/lib/entitlements";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";
import { designFitsApp, findDesign } from "@/lib/pages/designs/catalog";
import { seedForDesign } from "@/lib/samples/server";

// 10.4 The page and look editor's saves: the draft, publishing and discarding it.

export type LayoutSaveResult =
  | {
      ok: true;
      draft: LayoutContent;
      savedAt: string;
      published: { version: string; at: string } | null;
      changes: boolean;
      message?: string;
      /** 82.4 The publish history, after a publish. */
      history?: LayoutHistoryEntry[];
    }
  | { ok: false; errors: string[] };

type LayoutSaved = Extract<LayoutSaveResult, { ok: true }>;

async function requireLayoutApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app) redirect("/dashboard/app-type");
  return context as ClientContext & { app: App };
}

function result(record: AppLayoutRecord, message?: string): LayoutSaved {
  return {
    ok: true,
    // 43 Without the interface strings: the Languages page edits those, and the editor's saves keep them.
    draft: withoutStrings(record.draft),
    savedAt: record.draftUpdatedAt.toISOString(),
    published: record.published && record.publishedAt ? { version: record.published.version, at: record.publishedAt.toISOString() } : null,
    changes: hasUnpublishedChanges(record),
    message,
  };
}

/** 97.2 Uploads a font of the owner's own (or more weights of one), for the app's look. */
export async function uploadOwnFontAction(formData: FormData): Promise<{ ok: true; fonts: OwnFontView[] } | { ok: false; error: OwnFontError; file?: string }> {
  const { app, user, staff } = await requireLayoutApp();
  const store = await getStore();
  const files: { name: string; data: Buffer }[] = [];
  for (const entry of formData.getAll("files")) {
    if (!(entry instanceof File) || entry.size === 0) continue;
    if (entry.size > OWN_FONT_LIMITS.fileBytes) return { ok: false, error: "too_large", file: entry.name.slice(0, 120) };
    files.push({ name: entry.name.slice(0, 120), data: Buffer.from(await entry.arrayBuffer()) });
  }
  const added = await addOwnFont(
    { store, blobs: getBlobStore(), plans: await effectivePlans(store), now: new Date() },
    app,
    { family: String(formData.get("family") ?? ""), licence: formData.get("licence") === "on", files, by: (staff ?? user).email },
  );
  if (!added.ok) return added;
  revalidatePath("/dashboard/pages");
  return { ok: true, fonts: (await store.listOwnFonts(app.id)).map(ownFontView) };
}

/** 97.2 Deletes an own font and its files; a draft using it goes back to the bundled font. */
export async function deleteOwnFontAction(id: string): Promise<{ ok: true; fonts: OwnFontView[] } | { ok: false }> {
  const { app } = await requireLayoutApp();
  const store = await getStore();
  const now = new Date();
  const removed = await removeOwnFont({ store, blobs: getBlobStore() }, app.id, id);
  if (!removed) return { ok: false };
  const record = await loadLayout(store, app, now);
  const look = record.draft.appearance;
  if (look.font_family === removed.family || look.arabic_font === removed.family) {
    const { font_family, arabic_font, ...rest } = look;
    const appearance = { ...rest, ...(font_family && font_family !== removed.family ? { font_family } : {}), ...(arabic_font && arabic_font !== removed.family ? { arabic_font } : {}) };
    await saveDraft(store, app, { ...record.draft, appearance }, now);
  }
  revalidatePath("/dashboard/pages");
  return { ok: true, fonts: (await store.listOwnFonts(app.id)).map(ownFontView) };
}

/** 97.3 A logo or picture exported from Figma, for the Figma look: kept as the account's file, named in the draft by the editor. */
export async function uploadFigmaImageAction(formData: FormData): Promise<{ ok: true; assetId: string; url: string; name: string } | { ok: false; error: "type" | "size" }> {
  const { app } = await requireLayoutApp();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "type" };
  if (file.size > FIGMA_IMAGE_BYTES) return { ok: false, error: "size" };
  const saved = await saveFigmaImage({ store: await getStore(), blobs: getBlobStore(), now: new Date() }, app, Buffer.from(await file.arrayBuffer()));
  if (!saved.ok) return saved;
  return { ok: true, assetId: saved.assetId, url: `/api/v1/assets/${saved.assetId}`, name: file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 120) };
}

export type FigmaLinkError = FigmaApiError | "busy";

/** 97.4 Checks the link and token, and the account's reads of Figma this hour. */
async function figmaCall(link: unknown, token: unknown): Promise<{ ok: true; key: string; token: string; app: App } | { ok: false; error: FigmaLinkError }> {
  const { app, client } = await requireLayoutApp();
  const key = typeof link === "string" ? figmaFileKey(link) : null;
  if (!key) return { ok: false, error: "link" };
  if (typeof token !== "string" || !figmaTokenLooksRight(token.trim())) return { ok: false, error: "token" };
  if (!(await hitRateLimit(await getStore(), RATE_LIMITS.figmaRead, client.id)).allowed) return { ok: false, error: "busy" };
  return { ok: true, key, token: token.trim(), app };
}

/**
 * 97.4 Reads a Figma file from its link with the client's personal access
 * token, which is used for this call only and never saved.
 */
export async function readFigmaLinkAction(link: string, token: string): Promise<{ ok: true; file: FigmaFileRead } | { ok: false; error: FigmaLinkError; retryAfterSeconds?: number }> {
  const checked = await figmaCall(link, token);
  if (!checked.ok) return checked;
  const read = await readFigmaFile(checked.key, checked.token, figmaDeps());
  return read.ok ? { ok: true, file: read.value } : read;
}

/** 97.4 The frames chosen in a Figma file, rendered by Figma and kept as the account's pictures (the token again used for this call only). */
export async function importFigmaFramesAction(
  link: string,
  token: string,
  frames: { id: string; name: string }[],
): Promise<{ ok: true; pictures: { frameId: string; assetId: string; name: string }[]; failed: string[] } | { ok: false; error: FigmaLinkError; retryAfterSeconds?: number }> {
  const picked = (Array.isArray(frames) ? frames : []).filter((f) => f && typeof f.id === "string" && figmaNodeId(f.id) && typeof f.name === "string").slice(0, FIGMA_LINK_LIMITS.picks);
  const checked = await figmaCall(link, token);
  if (!checked.ok) return checked;
  const ids = [...new Set(picked.map((f) => f.id))];
  if (!ids.length) return { ok: true, pictures: [], failed: [] };
  const rendered = await renderFigmaFrames(checked.key, checked.token, ids, figmaDeps());
  if (!rendered.ok) return rendered;
  const deps = { store: await getStore(), blobs: getBlobStore(), now: new Date() };
  const pictures: { frameId: string; assetId: string; name: string }[] = [];
  const failed: string[] = [];
  for (const frame of picked.filter((f, i) => picked.findIndex((g) => g.id === f.id) === i)) {
    const data = rendered.images.get(frame.id);
    const saved = data ? await saveFigmaImage(deps, checked.app, data) : null;
    if (saved?.ok) pictures.push({ frameId: frame.id, assetId: saved.assetId, name: frame.name.slice(0, 120) });
    else failed.push(frame.name.slice(0, 120));
  }
  return { ok: true, pictures, failed };
}

/**
 * 97.5 The frames chosen in a Figma file made into pages: read with
 * everything in them, made into blocks, and their pictures drawn by Figma
 * and kept as the account's files (the token again used for this call only).
 * The editor adds them to the draft.
 */
export async function importFigmaPagesAction(
  link: string,
  token: string,
  frames: { id: string; name: string }[],
): Promise<{ ok: true; pages: FigmaImportedPage[]; tabs: string[]; failed: string[] } | { ok: false; error: FigmaLinkError; retryAfterSeconds?: number }> {
  const picked = (Array.isArray(frames) ? frames : []).filter((f) => f && typeof f.id === "string" && figmaNodeId(f.id) && typeof f.name === "string");
  const ids = [...new Set(picked.map((f) => f.id))].slice(0, FIGMA_PAGE_LIMITS.frames);
  const checked = await figmaCall(link, token);
  if (!checked.ok) return checked;
  if (!ids.length) return { ok: true, pages: [], tabs: [], failed: [] };
  const read = await readFigmaNodes(checked.key, checked.token, ids, figmaDeps());
  if (!read.ok) return read;
  const name = (id: string) => (picked.find((f) => f.id === id)?.name ?? id).slice(0, 120);
  // A board of several screens gives a page for each.
  const drafts = ids
    .flatMap((id) => {
      const node = read.nodes.get(id);
      return node ? figmaScreens(node as FigmaNode).map((screen) => ({ ...figmaFramePage(screen), frameId: id })) : [];
    })
    .slice(0, FIGMA_PAGE_LIMITS.screens);
  const failed = ids.filter((id) => !read.nodes.has(id)).map(name);
  const nodes = figmaPictureNodes(drafts);
  const pictures: Record<string, string> = {};
  if (nodes.length) {
    const rendered = await renderFigmaFrames(checked.key, checked.token, nodes, figmaDeps());
    if (!rendered.ok) return rendered;
    const deps = { store: await getStore(), blobs: getBlobStore(), now: new Date() };
    for (const node of nodes) {
      const data = rendered.images.get(node);
      const saved = data ? await saveFigmaImage(deps, checked.app, data) : null;
      if (saved?.ok) pictures[node] = assetUrl(saved.assetId);
    }
  }
  const pages = drafts
    .map((d) => ({ title: d.title, blocks: d.blocks, pictures: Object.fromEntries(Object.entries(pictures).filter(([node]) => d.blocks.some((b) => (b.kind === "image" || b.kind === "banner") && b.node === node))) }))
    .filter((p) => p.blocks.some((b) => (b.kind !== "image" && b.kind !== "banner") || p.pictures[b.node]));
  for (const d of drafts) if (!pages.some((p) => p.title === d.title)) failed.push(name(d.frameId));
  return { ok: true, pages, tabs: drafts.find((d) => d.tabs.length >= 2)?.tabs ?? [], failed: [...new Set(failed)] };
}

function parseJson(json: string): unknown {
  if (json.length > 1_000_000) return null;
  try {
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
}

/** Saves the draft; apps don't see it until it's published. */
export async function saveLayoutDraftAction(json: string): Promise<LayoutSaveResult> {
  const { app } = await requireLayoutApp();
  const saved = await saveDraft(await getStore(), app, parseJson(json), new Date());
  return saved.ok ? result(saved.value) : saved;
}

export async function publishLayoutAction(json: string): Promise<LayoutSaveResult> {
  const { app, user, staff, license } = await requireLayoutApp();
  const store = await getStore();
  const now = new Date();
  // 13.1 The published layout keeps to the app's plan (its languages).
  const published = await publishLayout(store, app, parseJson(json), (staff ?? user).email, now, await appPlan(store, license, now));
  if (!published.ok) return published;
  revalidatePath("/dashboard/pages");
  // 31 A WordPress site fetches the layout when asked, instead of within 15 minutes.
  const history = await layoutHistory(store, app.id);
  if (app.backend === "wordpress") {
    refreshSitesSoon([app.id]);
    return { ...result(published.value, "Published. Your website gets the new pages within a minute when it can be reached (otherwise within 15 minutes), and your app shows them the next time it opens."), history };
  }
  return { ...result(published.value, "Published. Your app shows the new pages the next time it opens."), history };
}

/**
 * 82.4 An earlier publish as the draft: to look at in the preview and
 * publish again. What's published stays until then.
 */
export async function restoreLayoutVersionAction(number: number): Promise<LayoutSaveResult> {
  const { app } = await requireLayoutApp();
  const now = new Date();
  const restored = Number.isSafeInteger(number) ? await restoreLayoutVersion(await getStore(), app, number, now) : null;
  if (!restored) return { ok: false, errors: ["This publish isn't kept anymore. Choose another one."] };
  if (!restored.ok) return restored;
  revalidatePath("/dashboard/pages");
  return result(restored.value, "Your draft is now as you published it then. Check it, then publish to bring it back.");
}

/**
 * 33 Replaces the draft with a ready-made design for the app's kind (the
 * editor asked the owner first). What's published stays until they publish.
 * 99.2 `mode` "look" takes only its look; `keepPages` keeps the draft's
 * pages the design doesn't have. `samples` is missing when they stay.
 */
export async function applyDesignAction(
  designId: string,
  paletteId?: string,
  mode: DesignMode = "all",
  keepPages = false,
): Promise<LayoutSaveResult & { samples?: Record<string, string> }> {
  const { app } = await requireLayoutApp();
  const store = await getStore();
  const design = await findDesign(store, designId);
  if (!design || !(await designFitsApp(store, design, app))) return { ok: false, errors: ["This design isn't available for your app. Choose another one."] };
  if (!isDesignMode(mode)) return { ok: false, errors: ["Choose what to take from the design."] };
  // 84.2 With one of its colours: the second colour in the look, and the main colour too when it has one.
  const palette = paletteId ? design.palettes?.find((p) => p.id === paletteId) : undefined;
  if (paletteId && !palette) return { ok: false, errors: ["Choose one of the colours shown."] };
  const now = new Date();
  if (palette?.primary) await store.updateApp(app.id, { primaryColor: palette.primary }, now);
  const withPrimary = palette?.primary ? { ...app, primaryColor: palette.primary } : app;
  const saved = await saveDesignDraft(store, withPrimary, design, now, palette ? { secondary_color: palette.secondary } : {}, { mode, keepPages: keepPages === true });
  if (!saved.ok) return saved;
  revalidatePath("/dashboard/pages");
  if (mode === "look") return result(saved.value.record, `Your draft now has the ${design.name} design's look. Your pages stay as they are.`);
  // 110.2 The empty lists the design shows get sample entries.
  await seedForDesign(store, app.id, saved.value.record.draft.pages, now);
  return { ...result(saved.value.record, `Your draft now uses the ${design.name} design. Change anything you like, then publish.`), samples: saved.value.samples ?? {} };
}

/**
 * 99.2 Back to the draft from before a design was chosen: its pages, the
 * app's main colour and the design it started from, as the editor kept them.
 */
export async function undoDesignAction(json: string, primaryColor: string, designId: string | null): Promise<LayoutSaveResult> {
  const { app } = await requireLayoutApp();
  const store = await getStore();
  if (!/^#[0-9a-f]{6}$/i.test(primaryColor)) return { ok: false, errors: ["This change can't be undone anymore."] };
  const design = designId ? await findDesign(store, designId) : null;
  if (designId && !design) return { ok: false, errors: ["This change can't be undone anymore."] };
  const now = new Date();
  const saved = await saveDraft(store, app, parseJson(json), now);
  if (!saved.ok) return saved;
  await store.updateApp(app.id, { primaryColor: primaryColor.toUpperCase(), design: design?.id ?? null }, now);
  revalidatePath("/dashboard/pages");
  return result(saved.value, "Your draft is back as it was before the design.");
}

/** Back to the published layout (or the defaults). */
export async function discardLayoutDraftAction(): Promise<LayoutSaveResult> {
  const { app } = await requireLayoutApp();
  const record = await discardDraft(await getStore(), app, new Date());
  return result(record, record.published ? "Draft discarded. You're back to the published pages." : "Draft discarded. You're back to the starting pages.");
}

/** 84.3 A saved section as the editor gets it. */
export type SectionView = Pick<SavedSection, "id" | "name" | "blocks">;

/** 84.3 Saves blocks of a page together as a section, for any page of the account's apps. */
export async function saveSectionAction(name: string, blocksJson: string): Promise<{ ok: true; section: SectionView } | { ok: false; error: SaveSectionError; detail?: string }> {
  const { app, user, staff } = await requireLayoutApp();
  let blocks: unknown = null;
  try {
    blocks = JSON.parse(blocksJson);
  } catch {
    return { ok: false, error: "blocks" };
  }
  const saved = await saveSection(await getStore(), app, { name, blocks }, (staff ?? user).email, new Date());
  if (!saved.ok) return saved;
  return { ok: true, section: { id: saved.section.id, name: saved.section.name, blocks: saved.section.blocks } };
}

/** 84.3 Deletes one of the account's saved sections. */
export async function deleteSectionAction(id: string): Promise<{ ok: boolean }> {
  const { app } = await requireLayoutApp();
  return { ok: typeof id === "string" && (await (await getStore()).deleteSavedSection(app.clientId, id)) };
}

/** 108.4 The most pictures and drawings brought from Figma for one import. */
const FIGMA_STUDIO_PICTURES = 60;

/**
 * 108.4 The frames chosen in a Figma file read as screens for Studio's
 * editor: auto layout kept as rows and columns, image fills and drawings
 * fetched from Figma and kept as the account's files. The token is used for
 * this call only and never saved. The editor makes them into pages.
 */
export async function importFigmaStudioAction(
  link: string,
  token: string,
  frames: { id: string; name: string }[],
): Promise<{ ok: true; frames: DesignFrame[]; failed: string[]; missing: number } | { ok: false; error: FigmaLinkError; retryAfterSeconds?: number }> {
  const picked = (Array.isArray(frames) ? frames : []).filter((f) => f && typeof f.id === "string" && figmaNodeId(f.id) && typeof f.name === "string");
  const ids = [...new Set(picked.map((f) => f.id))].slice(0, FIGMA_PAGE_LIMITS.frames);
  const checked = await figmaCall(link, token);
  if (!checked.ok) return checked;
  if (!ids.length) return { ok: true, frames: [], failed: [], missing: 0 };
  const read = await readFigmaNodes(checked.key, checked.token, ids, figmaDeps());
  if (!read.ok) return read;
  const needs: FigmaNeeds = { images: new Set(), renders: new Set() };
  const screens: DesignFrame[] = [];
  for (const id of ids) {
    const node = read.nodes.get(id);
    // A board of several screens gives a page for each.
    for (const screen of node ? figmaScreens(node as FigmaNode) : []) {
      const frame = figmaFrame(screen as unknown as Record<string, unknown>, needs);
      if (frame && screens.length < FIGMA_PAGE_LIMITS.screens) screens.push(frame);
    }
  }
  const failed = ids.filter((id) => !read.nodes.has(id)).map((id) => (picked.find((f) => f.id === id)?.name ?? id).slice(0, 120));
  const wanted = [...needs.images, ...needs.renders];
  const keys = wanted.slice(0, FIGMA_STUDIO_PICTURES);
  const pictures = new Map<string, string>();
  const deps = { store: await getStore(), blobs: getBlobStore(), now: new Date() };
  const save = async (key: string, data: Buffer | null | undefined) => {
    const saved = data ? await saveFigmaImage(deps, checked.app, data, "design_image") : null;
    if (saved?.ok) pictures.set(key, assetUrl(saved.assetId));
  };
  const refs = keys.filter((k) => k.startsWith("figma-image:")).map((k) => k.slice("figma-image:".length));
  if (refs.length) {
    const fills = await figmaImageFills(checked.key, checked.token, refs, figmaDeps());
    if (!fills.ok) return fills;
    for (const ref of refs) await save(`figma-image:${ref}`, fills.images.get(ref));
  }
  const nodes = keys.filter((k) => k.startsWith("figma-render:")).map((k) => k.slice("figma-render:".length));
  if (nodes.length) {
    const rendered = await renderFigmaFrames(checked.key, checked.token, nodes, figmaDeps());
    if (!rendered.ok) return rendered;
    for (const node of nodes) await save(`figma-render:${node}`, rendered.images.get(node));
  }
  return { ok: true, frames: screens.map((f) => withFigmaPictures(f, pictures)), failed, missing: wanted.length - pictures.size };
}
