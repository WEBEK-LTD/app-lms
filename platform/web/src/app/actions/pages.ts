"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App, AppLayoutRecord, SavedSection } from "@/lib/data/types";
import { discardDraft, hasUnpublishedChanges, layoutHistory, loadLayout, publishLayout, restoreLayoutVersion, saveDesignDraft, saveDraft, withoutStrings, type LayoutHistoryEntry } from "@/lib/pages/layout";
import { getBlobStore } from "@/lib/blobs";
import { addOwnFont, OWN_FONT_LIMITS, ownFontView, removeOwnFont, type OwnFontError, type OwnFontView } from "@/lib/fonts/own";
import { saveSection, type SaveSectionError } from "@/lib/pages/sections";
import type { LayoutContent } from "@/lib/pages/types";
import { appPlan, effectivePlans } from "@/lib/entitlements";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";
import { designFitsApp, findDesign } from "@/lib/pages/designs/catalog";

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
 */
export async function applyDesignAction(designId: string, paletteId?: string): Promise<LayoutSaveResult & { samples?: Record<string, string> }> {
  const { app } = await requireLayoutApp();
  const store = await getStore();
  const design = await findDesign(store, designId);
  if (!design || !(await designFitsApp(store, design, app))) return { ok: false, errors: ["This design isn't available for your app. Choose another one."] };
  // 84.2 With one of its colours: the second colour in the look, and the main colour too when it has one.
  const palette = paletteId ? design.palettes?.find((p) => p.id === paletteId) : undefined;
  if (paletteId && !palette) return { ok: false, errors: ["Choose one of the colours shown."] };
  const now = new Date();
  if (palette?.primary) await store.updateApp(app.id, { primaryColor: palette.primary }, now);
  const saved = await saveDesignDraft(store, palette?.primary ? { ...app, primaryColor: palette.primary } : app, design, now, palette ? { secondary_color: palette.secondary } : {});
  if (!saved.ok) return saved;
  revalidatePath("/dashboard/pages");
  return { ...result(saved.value.record, `Your draft now uses the ${design.name} design. Change anything you like, then publish.`), samples: saved.value.samples };
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
