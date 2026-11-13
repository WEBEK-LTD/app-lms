import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "../crypto/tokens";
import type { AssetKind } from "../data/types";
import { idFrom, type PictureDeps } from "./picture-assets";

/**
 * 128.8 Ufuq Academy's photos: the academy story's real photos with free
 * licences (public/stories/academy, credited on the story page,
 * lib/site story `academy`), the covers of the premium academy demo's
 * courses as its approved home shows them. They're read from
 * public/stories/academy at run time (next.config.ts brings them into the
 * server's bundle) and saved as the account's files like the drawn
 * pictures.
 */
export const ACADEMY_PHOTOS = ["academy-breakfast", "academy-desk", "academy-evening", "academy-graduation", "academy-live", "academy-phone"] as const satisfies readonly string[];

export type AcademyPhoto = (typeof ACADEMY_PHOTOS)[number];

const NAMES: ReadonlySet<string> = new Set(ACADEMY_PHOTOS);

export function isAcademyPhoto(name: string): name is AcademyPhoto {
  return NAMES.has(name);
}

/** Where one of them is served from on the platform (`/stories/academy/<name>.jpg`). */
export function academyPhotoPath(name: AcademyPhoto): string {
  return `/stories/academy/${name}.jpg`;
}

const files = new Map<string, Buffer>();

async function photoFile(name: AcademyPhoto): Promise<Buffer> {
  const had = files.get(name);
  if (had) return had;
  const file = await readFile(path.join(process.cwd(), "public/stories/academy", `${name}.jpg`));
  files.set(name, file);
  return file;
}

/** The asset of one of the photos, saved the first time (the file's hash in its ID: a photo changed is saved again). */
export async function saveAcademyPhoto(deps: PictureDeps, owner: { clientId: string; appId?: string }, name: AcademyPhoto, kind: AssetKind): Promise<string> {
  const file = await photoFile(name);
  const { clientId, appId } = owner;
  const photo = { academy: name, sha: sha256Hex(file.toString("base64")) };
  const id = idFrom(JSON.stringify(appId ? { v: 1, clientId, appId, photo } : { v: 1, clientId, photo }));
  if (await deps.store.getAsset(id)) return id;
  const blobKey = `assets/${clientId}/${id}.jpg`;
  await deps.putBlob(blobKey, file, "image/jpeg");
  await deps.store.createAsset({ id, clientId, kind, blobKey, contentType: "image/jpeg", size: file.length, createdAt: deps.now });
  return id;
}
