import { sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { AssetKind } from "../data/types";
import { artPng, type Art } from "./art";
import { DESIGN_ART } from "./design-art";
import { PICTURES, type PictureName } from "./pictures";
import { isAcademyPhoto, saveAcademyPhoto, type AcademyPhoto } from "./academy-photos";
import { isZadPhoto, saveZadPhoto, type ZadPhoto } from "./zad-photos";

/**
 * The drawn pictures (lib/demo/pictures.ts) saved as an account's files:
 * the demo apps' (roadmap 16), and 110.2 the sample entries' of an app.
 */

/** A UUID-shaped ID made from a hash, so the same picture of the same account is saved once. */
export function idFrom(text: string): string {
  const h = sha256Hex(text);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((Number.parseInt(h[16]!, 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export const PICTURE_SIZES = {
  icon: [1024, 1024],
  banner: [1200, 600],
  course: [800, 450],
  product: [600, 600],
  home: [800, 600],
  avatar: [400, 400],
} as const satisfies Record<string, readonly [number, number]>;

export type PictureSize = keyof typeof PICTURE_SIZES;

/** Pictures drawn by this server instance (about 1.5 MB for all of them), so a second run draws nothing. */
const rendered = new Map<string, Buffer>();

export interface PictureDeps {
  store: DataStore;
  /** Saves an uploaded file (Netlify Blobs, or a folder locally). */
  putBlob: (key: string, data: Buffer, contentType: string) => Promise<void>;
  now: Date;
}

/**
 * The asset of a drawn picture, saved the first time. The demo's are the
 * account's (`appId` missing); 110.2 a sample entry's are its app's alone,
 * so removing an app's samples never takes another app's pictures.
 */
export async function savePicture(deps: PictureDeps, owner: { clientId: string; appId?: string }, name: DemoPicture, size: PictureSize, kind: AssetKind): Promise<string> {
  // 128 The demos' real photos, saved as the account's files the same way: Sofra Eats's and Zad's (public/demo-photos), 128.8 the academies' courses' (public/stories/academy).
  if (isAcademyPhoto(name)) return saveAcademyPhoto(deps, owner, name, kind);
  if (isZadPhoto(name)) return saveZadPhoto(deps, owner, name, kind);
  return saveArt(deps, owner, demoArt(name), size, kind);
}

/** 124.7 The designs' drawings a demo's entries use too (public/design-pictures/art-<name>.png): the ride demos' cars. */
export type DesignDrawing = "car-teal" | "car-dark" | "car-yellow";

/** A demo's picture: its own drawing (lib/demo/pictures.ts), or one of the designs'; 128 or one of the demos' real photos (lib/demo/zad-photos.ts, academy-photos.ts). */
export type DemoPicture = PictureName | DesignDrawing | AcademyPhoto | ZadPhoto;

/** The drawing of a demo's picture. */
export function demoArt(name: Exclude<DemoPicture, AcademyPhoto | ZadPhoto>): Art {
  return (PICTURES as Record<string, Art>)[name] ?? DESIGN_ART[`art-${name}.png`]!.art;
}

function artId(owner: { clientId: string; appId?: string }, art: Art, size: PictureSize): string {
  const { clientId, appId } = owner;
  const [width, height] = PICTURE_SIZES[size];
  return idFrom(JSON.stringify(appId ? { v: 1, clientId, appId, art, width, height } : { v: 1, clientId, art, width, height }));
}

/** Any drawn picture (a demo's, or one of the designs' in lib/demo/design-art.ts) saved as `savePicture` saves them. */
export async function saveArt(deps: PictureDeps, owner: { clientId: string; appId?: string }, art: Art, size: PictureSize, kind: AssetKind): Promise<string> {
  const { clientId } = owner;
  const [width, height] = PICTURE_SIZES[size];
  const id = artId(owner, art, size);
  if (await deps.store.getAsset(id)) return id;
  const drawn = JSON.stringify({ art, width, height });
  const png = rendered.get(drawn) ?? artPng(art, width, height);
  rendered.set(drawn, png);
  const blobKey = `assets/${clientId}/${id}.png`;
  await deps.putBlob(blobKey, png, "image/png");
  await deps.store.createAsset({ id, clientId, kind, blobKey, contentType: "image/png", size: png.length, createdAt: deps.now });
  return id;
}

/** The asset of a drawn picture already saved, or null: for the daily job, which keeps pictures without drawing any. */
export async function savedArt(store: DataStore, owner: { clientId: string; appId?: string }, art: Art, size: PictureSize): Promise<string | null> {
  const id = artId(owner, art, size);
  return (await store.getAsset(id)) ? id : null;
}
