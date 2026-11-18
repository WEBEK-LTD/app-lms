import { createHash } from "node:crypto";
import type { BlobStore } from "../blobs";
import type { DataStore } from "../data/store";
import { isPrivateAsset, type App, type MarketTemplateVersion, type OwnFont } from "../data/types";
import { figmaImageType } from "../figma/images";
import { freeFont, isBundledFont } from "../fonts/catalog";
import { addOwnFont } from "../fonts/own";
import type { Plan, PlanInfo } from "../plans";
import { picturesIn, withPictures, type DesignFile } from "../studio/design-file";

/**
 * 106.2 A template's pictures and fonts are its own, then each buyer's own.
 *
 * - When a version is taken (sent for review, or an update), the pictures
 *   it shows that are kept on Yallapp (the designer's design pictures and
 *   Media library pictures) are copied for the template, and the design
 *   points to the copies; the project's uploaded fonts are copied too, next
 *   to the version's design file.
 * - When it goes on a buyer's app, those pictures are copied again into the
 *   buyer's own account, and the app's design points to the buyer's copies;
 *   the fonts become the app's own fonts.
 *
 * So a designer deleting or changing their files never breaks a template or
 * a buyer's app. A copy is made once (its address comes from the picture's
 * content): a template taken again, or applied again, adds nothing.
 * Pictures elsewhere on the web, and Yallapp's own design pictures, stay
 * where they are.
 */

/** The largest picture copied (larger ones stay at their address). */
export const COPY_PICTURE_BYTES = 10 * 1024 * 1024;

export interface PictureDeps {
  store: DataStore;
  blobs: BlobStore;
  now: Date;
  /** The platform's address: pictures at it are copied. */
  baseUrl: string;
  /** A Media library picture's bytes (/m/<id>), when the Media library is set up. */
  readMedia?: (id: string) => Promise<Buffer | null>;
}

/** A UUID of its own for a seed: the same seed, the same address. */
export function seededUuid(seed: string): string {
  const h = createHash("sha256").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const ASSET = /^\/api\/v1\/assets\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const MEDIA = /^\/m\/([A-Za-z0-9_-]{6,64})$/;

/** A picture kept on Yallapp: one of its assets, or a Media library file; null for anything else. */
export function platformPicture(url: string, baseUrl: string): { kind: "asset" | "media"; id: string } | null {
  if (!url.startsWith(`${baseUrl}/`)) return null;
  const path = url.slice(baseUrl.length).split(/[?#]/)[0]!;
  const asset = ASSET.exec(path);
  if (asset) return { kind: "asset", id: asset[1]!.toLowerCase() };
  const media = MEDIA.exec(path);
  return media ? { kind: "media", id: media[1]! } : null;
}

async function readPicture(deps: PictureDeps, url: string): Promise<{ data: Buffer; contentType: string; extension: string; owner: string | null } | null> {
  const where = platformPicture(url, deps.baseUrl);
  if (!where) return null;
  let data: Buffer | null = null;
  let owner: string | null = null;
  if (where.kind === "asset") {
    const asset = await deps.store.getAsset(where.id);
    if (!asset || isPrivateAsset(asset.kind)) return null;
    owner = asset.clientId;
    data = (await deps.blobs.get(asset.blobKey))?.data ?? null;
  } else if (deps.readMedia) {
    data = await deps.readMedia(where.id).catch(() => null);
  }
  if (!data || data.length > COPY_PICTURE_BYTES) return null;
  const type = figmaImageType(data);
  return type ? { data, ...type, owner } : null;
}

/**
 * Copies the pictures (at Yallapp) into `clientId`'s design pictures, once
 * per picture and `place`: the addresses of the copies, by the address they
 * replace. Pictures that can't be read stay; so do the account's own ones,
 * unless `always` (a template's copies are kept apart from the designer's
 * own files, in the designer's account).
 */
export async function copyPictures(deps: PictureDeps, urls: Iterable<string>, clientId: string, place: string, always = false): Promise<Map<string, string>> {
  const moved = new Map<string, string>();
  for (const url of new Set(urls)) {
    const picture = await readPicture(deps, url);
    if (!picture || (picture.owner === clientId && !always)) continue;
    const hash = createHash("sha256").update(picture.data).digest("hex");
    const id = seededUuid(`${place}:${clientId}:${hash}`);
    if (`${deps.baseUrl}/api/v1/assets/${id}` === url) continue;
    if (!(await deps.store.getAsset(id))) {
      const blobKey = `assets/${clientId}/${id}.${picture.extension}`;
      await deps.blobs.put(blobKey, picture.data, picture.contentType);
      await deps.store.createAsset({ id, clientId, kind: "design_image", blobKey, contentType: picture.contentType, size: picture.data.length, createdAt: deps.now });
    }
    moved.set(url, `${deps.baseUrl}/api/v1/assets/${id}`);
  }
  return moved;
}

/** Every picture a design file shows: its pages', and the sign-in screen's photo. */
export function designPictures(file: DesignFile): string[] {
  const urls = new Set(file.pages.flatMap((p) => picturesIn(p.studio)));
  const signIn = file.look?.screens?.sign_in?.image_url;
  if (typeof signIn === "string" && signIn) urls.add(signIn);
  return [...urls];
}

/** The design file with its pictures at their new addresses (the others as they are). */
export function movePictures(file: DesignFile, moved: ReadonlyMap<string, string>): DesignFile {
  if (!moved.size) return file;
  const all = new Map(designPictures(file).map((url) => [url, moved.get(url) ?? url]));
  const signIn = file.look?.screens?.sign_in;
  return {
    ...file,
    pages: file.pages.map((p) => ({
      ...p,
      studio: {
        ...p.studio,
        ...(p.studio.header ? { header: { ...p.studio.header, ...(p.studio.header.logo_url ? { logo_url: all.get(p.studio.header.logo_url) ?? p.studio.header.logo_url } : {}) } } : {}),
        body: withPictures(p.studio.body, all),
      },
    })),
    ...(file.look && signIn?.image_url && moved.has(signIn.image_url)
      ? { look: { ...file.look, screens: { ...file.look.screens, sign_in: { ...signIn, image_url: moved.get(signIn.image_url)! } } } }
      : {}),
  };
}

// ——— Fonts ———

/** The template's own fonts, kept next to a version's design file. */
export interface TemplateFonts {
  format: "yallapp-template-fonts";
  version: 1;
  fonts: { family: string; files: { key: string; weight: number | null; kind: "ttf" | "otf"; size: number }[] }[];
}

/** Where a version's fonts are kept (next to its design file). */
export function fontsKey(version: Pick<MarketTemplateVersion, "blobKey">): string {
  return version.blobKey.replace(/\.json$/, "") + ".fonts.json";
}

/** Whether a family is one an app must have as its own font (not a free or bundled one). */
export function ownFamily(family: string): boolean {
  return !freeFont(family) && !isBundledFont(family);
}

/** Copies the project's own fonts the design uses, for the template; what to keep next to its version. */
export async function copyProjectFonts(deps: Pick<PictureDeps, "store" | "blobs">, templateId: string, fonts: readonly OwnFont[]): Promise<TemplateFonts> {
  const out: TemplateFonts = { format: "yallapp-template-fonts", version: 1, fonts: [] };
  for (const font of fonts) {
    const files: TemplateFonts["fonts"][number]["files"] = [];
    for (const file of font.files) {
      const asset = await deps.store.getAsset(file.assetId);
      const blob = asset ? await deps.blobs.get(asset.blobKey) : null;
      if (!asset || !blob) continue;
      const kind = asset.contentType === "font/otf" ? "otf" : "ttf";
      const hash = createHash("sha256").update(blob.data).digest("hex");
      const key = `studio-market/${templateId}/fonts/${hash}.${kind}`;
      await deps.blobs.put(key, blob.data, asset.contentType);
      files.push({ key, weight: file.weight, kind, size: blob.data.length });
    }
    if (files.length) out.fonts.push({ family: font.family, files });
  }
  return out;
}

export async function readTemplateFonts(blobs: BlobStore, version: Pick<MarketTemplateVersion, "blobKey">): Promise<TemplateFonts | null> {
  const blob = await blobs.get(fontsKey(version));
  if (!blob) return null;
  try {
    const value = JSON.parse(blob.data.toString("utf8")) as TemplateFonts;
    return value?.format === "yallapp-template-fonts" && Array.isArray(value.fonts) ? value : null;
  } catch {
    return null;
  }
}

/**
 * The template's fonts the design uses, made the app's own (an app that has
 * a font of that name keeps its own). The families that couldn't be added
 * (the app's fonts are full, its storage, a file gone): the design shows the
 * app's font there instead.
 */
export async function installTemplateFonts(
  deps: Pick<PictureDeps, "store" | "blobs" | "now"> & { plans: Record<Plan, PlanInfo> },
  app: Pick<App, "id" | "clientId">,
  fonts: TemplateFonts | null,
  families: readonly string[],
  by: string,
): Promise<{ failed: string[] }> {
  const failed: string[] = [];
  const own = new Set((await deps.store.listOwnFonts(app.id)).map((f) => f.family.toLowerCase()));
  for (const family of new Set(families)) {
    if (!ownFamily(family) || own.has(family.toLowerCase())) continue;
    const font = fonts?.fonts.find((f) => f.family === family);
    const files: { name: string; data: Buffer }[] = [];
    for (const file of font?.files ?? []) {
      const blob = await deps.blobs.get(file.key);
      if (blob) files.push({ name: `${family}-${file.weight ?? "variable"}.${file.kind}`, data: blob.data });
    }
    const added = files.length ? await addOwnFont({ store: deps.store, blobs: deps.blobs, plans: deps.plans, now: deps.now }, app, { family, licence: true, files, by }) : null;
    if (added?.ok) own.add(family.toLowerCase());
    else failed.push(family);
  }
  return { failed };
}
