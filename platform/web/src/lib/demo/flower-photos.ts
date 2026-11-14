import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "../crypto/tokens";
import type { AssetKind } from "../data/types";
import { idFrom, type PictureDeps } from "./picture-assets";

/**
 * 131.20 Leqaa's photos: real flower photos from Wikimedia Commons, each
 * dedicated to the public domain (CC0) or in it, with no faces, cut to
 * 4:5 at 800 × 1000 (public/flower-photos, credited in CREDITS.md and
 * CREDITS.json). The looks show them at the platform's address; the demo's
 * products are read from public/flower-photos at run time (next.config.ts
 * brings them into the server's bundle) and saved as the account's files
 * like the drawn pictures.
 */
export const FLOWER_PHOTOS = [
  "atelier",
  "baby-breath",
  "blush-bouquet",
  "ceramic-vase",
  "garden-jug",
  "orchid",
  "ranunculus",
  "red-rose",
  "stems",
  "sunflowers",
  "sunshine",
  "tulips",
  "white-lilies",
] as const satisfies readonly string[];

export type FlowerPhoto = (typeof FLOWER_PHOTOS)[number];

const NAMES: ReadonlySet<string> = new Set(FLOWER_PHOTOS);

export function isFlowerPhoto(name: string): name is FlowerPhoto {
  return NAMES.has(name);
}

/** Where one of them is served from on the platform (`/flower-photos/<name>.jpg`). */
export function flowerPhotoPath(name: FlowerPhoto): string {
  return `/flower-photos/${name}.jpg`;
}

const files = new Map<string, Buffer>();

async function photoFile(name: FlowerPhoto): Promise<Buffer> {
  const had = files.get(name);
  if (had) return had;
  const file = await readFile(path.join(process.cwd(), "public/flower-photos", `${name}.jpg`));
  files.set(name, file);
  return file;
}

/** The asset of one of Leqaa's photos, saved the first time (the file's hash in its ID: a photo changed is saved again). */
export async function saveFlowerPhoto(deps: PictureDeps, owner: { clientId: string; appId?: string }, name: FlowerPhoto, kind: AssetKind): Promise<string> {
  const file = await photoFile(name);
  const { clientId, appId } = owner;
  const photo = { flowers: name, sha: sha256Hex(file.toString("base64")) };
  const id = idFrom(JSON.stringify(appId ? { v: 1, clientId, appId, photo } : { v: 1, clientId, photo }));
  if (await deps.store.getAsset(id)) return id;
  const blobKey = `assets/${clientId}/${id}.jpg`;
  await deps.putBlob(blobKey, file, "image/jpeg");
  await deps.store.createAsset({ id, clientId, kind, blobKey, contentType: "image/jpeg", size: file.length, createdAt: deps.now });
  return id;
}
