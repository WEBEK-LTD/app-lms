import type { BlobStore } from "../blobs";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, OwnFont, OwnFontFile } from "../data/types";
import { appStorage } from "../media/usage";
import type { Plan, PlanInfo } from "../plans";
import { freeFont, isBundledFont } from "./catalog";
import { readFont, type FontFacts } from "./sfnt";

/**
 * 97.2 The owner's own fonts: TrueType or OpenType files they upload, after
 * confirming the font's licence allows its use in apps. Kept as assets (the
 * file store), counted in the app's Media storage, served like icons and
 * logos, and chosen in the look like any free font.
 */

export const OWN_FONT_LIMITS = {
  /** Fonts per app. */
  fonts: 10,
  /** Files per font: four weights, or one variable file. */
  files: 4,
  fileBytes: 5 * 1024 * 1024,
  /** What one upload may carry (a server action takes at most 6 MB). */
  uploadBytes: 5 * 1024 * 1024 + 512 * 1024,
  nameChars: 40,
} as const;

const NAME = /^[A-Za-z0-9 ]+$/;

export type OwnFontError =
  | "name"
  | "name_taken"
  | "licence"
  | "no_files"
  | "too_many_files"
  | "too_large"
  | "not_font"
  | "web_font"
  | "collection"
  | "italic"
  | "restricted"
  | "same_weight"
  | "variable"
  | "storage"
  | "limit";

export interface OwnFontUpload {
  family: string;
  /** "I have a licence to use this font in apps." */
  licence: boolean;
  files: { name: string; data: Buffer }[];
  /** Email of whoever uploads it. */
  by: string;
}

export interface OwnFontDeps {
  store: DataStore;
  blobs: BlobStore;
  plans: Record<Plan, PlanInfo>;
  now: Date;
}

/** The name a font gets in the look: letters, digits and spaces, one space between words. */
export function cleanFontName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Adds an uploaded font, or more weights of one the app has (by name). */
export async function addOwnFont(
  deps: OwnFontDeps,
  app: Pick<App, "id" | "clientId">,
  upload: OwnFontUpload,
): Promise<{ ok: true; font: OwnFont } | { ok: false; error: OwnFontError; file?: string }> {
  const family = cleanFontName(upload.family);
  if (!family || family.length > OWN_FONT_LIMITS.nameChars || !NAME.test(family)) return { ok: false, error: "name" };
  // A free or bundled font's name would mean two fonts in the look.
  if (freeFont(family) || isBundledFont(family)) return { ok: false, error: "name_taken" };
  if (!upload.licence) return { ok: false, error: "licence" };
  if (upload.files.length === 0) return { ok: false, error: "no_files" };

  const fonts = await deps.store.listOwnFonts(app.id);
  const existing = fonts.find((f) => f.family.toLowerCase() === family.toLowerCase()) ?? null;
  if (!existing && fonts.length >= OWN_FONT_LIMITS.fonts) return { ok: false, error: "limit" };
  if ((existing?.files.length ?? 0) + upload.files.length > OWN_FONT_LIMITS.files) return { ok: false, error: "too_many_files" };
  if (upload.files.reduce((sum, f) => sum + f.data.length, 0) > OWN_FONT_LIMITS.uploadBytes) return { ok: false, error: "too_large" };

  const read: { file: { name: string; data: Buffer }; facts: FontFacts }[] = [];
  for (const file of upload.files) {
    if (file.data.length > OWN_FONT_LIMITS.fileBytes) return { ok: false, error: "too_large", file: file.name };
    const result = readFont(file.data);
    if (!result.ok) return { ok: false, error: result.problem, file: file.name };
    if (result.facts.italic) return { ok: false, error: "italic", file: file.name };
    if (result.facts.restricted) return { ok: false, error: "restricted", file: file.name };
    read.push({ file, facts: result.facts });
  }
  // One variable file draws every weight: it comes alone.
  const variable = read.some((r) => r.facts.variable) || existing?.files.some((f) => f.weight === null);
  if (variable && (existing?.files.length ?? 0) + read.length > 1) return { ok: false, error: "variable" };
  const weights = [...(existing?.files.map((f) => f.weight) ?? []), ...read.map((r) => (r.facts.variable ? null : r.facts.weight))];
  if (new Set(weights).size !== weights.length) return { ok: false, error: "same_weight" };

  const adding = read.reduce((sum, r) => sum + r.file.data.length, 0);
  const storage = await appStorage(deps.store, app, deps.plans, deps.now);
  if (storage.limitBytes !== null && storage.usedBytes + adding > storage.limitBytes) return { ok: false, error: "storage" };

  const files: OwnFontFile[] = [...(existing?.files ?? [])];
  for (const { file, facts } of read) {
    const id = newId();
    const contentType = facts.kind === "otf" ? "font/otf" : "font/ttf";
    const blobKey = `assets/${app.clientId}/${id}.${facts.kind}`;
    await deps.blobs.put(blobKey, file.data, contentType);
    await deps.store.createAsset({ id, clientId: app.clientId, kind: "font", blobKey, contentType, size: file.data.length, createdAt: deps.now });
    files.push({ assetId: id, weight: facts.variable ? null : facts.weight, sizeBytes: file.data.length });
  }
  files.sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0));
  const font: OwnFont = {
    id: existing?.id ?? newId(),
    appId: app.id,
    family: existing?.family ?? family,
    files,
    sizeBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),
    licenceConfirmedBy: upload.by,
    createdAt: existing?.createdAt ?? deps.now,
    updatedAt: deps.now,
  };
  await deps.store.saveOwnFont(font);
  return { ok: true, font };
}

/** Deletes a font and its files. */
export async function removeOwnFont(deps: Pick<OwnFontDeps, "store" | "blobs">, appId: string, id: string): Promise<OwnFont | null> {
  const font = (await deps.store.listOwnFonts(appId)).find((f) => f.id === id);
  if (!font || !(await deps.store.deleteOwnFont(appId, id))) return null;
  for (const file of font.files) {
    const asset = await deps.store.getAsset(file.assetId);
    if (asset) await deps.blobs.delete(asset.blobKey).catch(() => {});
    await deps.store.deleteAsset(file.assetId);
  }
  return font;
}

/** 97.2 An own font as the dashboard shows it. */
export interface OwnFontView {
  id: string;
  family: string;
  /** Null: a variable file, every weight. */
  weights: (number | null)[];
  sizeBytes: number;
  /** A file to draw its name in (the dashboard's own address). */
  previewUrl: string;
}

export function ownFontView(font: OwnFont): OwnFontView {
  const regular = font.files.find((f) => f.weight === 400 || f.weight === null) ?? font.files[0]!;
  return { id: font.id, family: font.family, weights: font.files.map((f) => f.weight), sizeBytes: font.sizeBytes, previewUrl: `/api/v1/assets/${regular.assetId}` };
}
