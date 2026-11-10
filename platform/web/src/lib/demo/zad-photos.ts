import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { AssetKind } from "../data/types";
import { idFrom, type PictureDeps } from "./picture-assets";

/**
 * Zad's photos: real photos with free licences (Wikimedia Commons; each
 * one's author and licence in public/demo-photos/CREDITS.md), cut to the
 * size they show at: the places' covers 800 × 600, dishes and products
 * 600 × 600. They're read from public/demo-photos at run time
 * (next.config.ts brings them into the server's bundle) and saved as the
 * account's files like the drawn pictures.
 */
export const ZAD_PHOTOS = [
  "alexandrian-liver",
  "baba-ghanoush",
  "bakery",
  "baladi-bread",
  "bananas",
  "black-tea",
  "cheese",
  "chicken-alfredo",
  "chocolate-brownie",
  "cover-grill",
  "cover-market",
  "cover-pizza",
  "croissants",
  "cucumbers",
  "dairy",
  "dish-soap",
  "drinks",
  "eggs",
  "egyptian-rice",
  "fruit",
  "ground-cumin",
  "home",
  "kitchen-towels",
  "kofta",
  "laban-rayeb",
  "laundry-powder",
  "lemons",
  "mangoes",
  "margherita",
  "milk",
  "mineral-water",
  "mixed-grill",
  "oil-tea-spices",
  "onions",
  "orange-juice",
  "oranges",
  "pantry",
  "penne-arrabbiata",
  "penne-pasta",
  "pepperoni-pizza",
  "potatoes",
  "red-apples",
  "roumi-cheese",
  "shish-tawook",
  "sparkling-water",
  "sunflower-oil",
  "tahini",
  "toast-bread",
  "tomatoes",
  "vegetable-pizza",
  "vegetables",
  "vermicelli-rice",
  "white-cheese",
  "yellow-lentils",
  "yoghurt",
] as const satisfies readonly string[];

export type ZadPhoto = (typeof ZAD_PHOTOS)[number];

const NAMES: ReadonlySet<string> = new Set(ZAD_PHOTOS);

export function isZadPhoto(name: string): name is ZadPhoto {
  return NAMES.has(name);
}

const files = new Map<string, Buffer>();

async function photoFile(name: ZadPhoto): Promise<Buffer> {
  const had = files.get(name);
  if (had) return had;
  const file = await readFile(path.join(process.cwd(), "public/demo-photos", `${name}.jpg`));
  files.set(name, file);
  return file;
}

function photoId(owner: { clientId: string; appId?: string }, name: ZadPhoto, file: Buffer): string {
  const { clientId, appId } = owner;
  // The file's hash too: a photo changed is saved again.
  const photo = { name, sha: sha256Hex(file.toString("base64")) };
  return idFrom(JSON.stringify(appId ? { v: 1, clientId, appId, photo } : { v: 1, clientId, photo }));
}

/** The asset of one of Zad's photos, saved the first time. */
export async function saveZadPhoto(deps: PictureDeps, owner: { clientId: string; appId?: string }, name: ZadPhoto, kind: AssetKind): Promise<string> {
  const file = await photoFile(name);
  const id = photoId(owner, name, file);
  if (await deps.store.getAsset(id)) return id;
  const blobKey = `assets/${owner.clientId}/${id}.jpg`;
  await deps.putBlob(blobKey, file, "image/jpeg");
  await deps.store.createAsset({ id, clientId: owner.clientId, kind, blobKey, contentType: "image/jpeg", size: file.length, createdAt: deps.now });
  return id;
}

/** The asset of one of Zad's photos already saved, or null: for the daily job, which saves nothing. */
export async function savedZadPhoto(store: DataStore, owner: { clientId: string; appId?: string }, name: ZadPhoto): Promise<string | null> {
  const id = photoId(owner, name, await photoFile(name));
  return (await store.getAsset(id)) ? id : null;
}
