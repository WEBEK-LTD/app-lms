import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "../crypto/tokens";
import type { AssetKind } from "../data/types";
import { idFrom, type PictureDeps } from "./picture-assets";

/**
 * 208 The premium shop types' real photos (CC0, from StockSnap; credited in
 * each folder's CREDITS.md and CREDITS.json), one folder of public/ per
 * type, served at the platform's address for the looks and saved as the
 * account's files for the demo's products, as Leqaa's flower photos are
 * (lib/demo/flower-photos.ts). A demo's picture name is the set's prefix
 * and the file's name (`cl-rust-1` is public/clothes-photos/rust-1.jpg), so
 * no set's names meet another's or the drawn pictures'. next.config.ts
 * brings each folder into the server's bundle. A later type adds its set
 * here, in `SHOP_PHOTO_SETS`.
 */

export interface ShopPhotoSet<N extends string> {
  /** The folder under public/. */
  dir: string;
  /** Its pictures' prefix (`cl-`). */
  prefix: string;
  names: readonly N[];
}

/** 208 Lujain's photos (the clothes shop), cut to 4:5 at 720 × 900, the banners kept wide at 900 wide. */
export const CLOTHES_PHOTO_NAMES = [
  "abaya-desert",
  "abaya-road",
  "abaya-sil",
  "abaya-white",
  "accessories",
  "beige-dress",
  "black-bag",
  "black-dress",
  "black-heels",
  "black-top",
  "blue-dot",
  "bracelets",
  "braids",
  "brick-jacket",
  "bridal-rack",
  "brown-bag",
  "c-black-coat",
  "camel-dress",
  "camel-jacket",
  "cream-maxi",
  "dark-coat",
  "denim",
  "fence-jeans",
  "flannel",
  "flatlay-black",
  "flatlay-sneak",
  "fleece",
  "floral-bag",
  "floral-romper",
  "graffiti",
  "hand-jewel",
  "hero-green",
  "hero-trench",
  "knit-dress",
  "lace-top",
  "leopard",
  "long-floral",
  "look",
  "necklace",
  "nude-heels",
  "olive-jacket",
  "orange-coat",
  "patent-clutch",
  "pink-trench",
  "purple-tiles",
  "red-dress",
  "red-pumps",
  "red-skirt",
  "ring",
  "rust-1",
  "rust-2",
  "rust-3",
  "rust-4",
  "sneak-feet",
  "sneak-white",
  "street-walk",
  "sunglasses",
  "turtleneck",
  "velvet",
  "walk-white",
  "white-backpack",
  "yellow-coat",
] as const;
export type ClothesPhotoName = (typeof CLOTHES_PHOTO_NAMES)[number];
export const CLOTHES_PHOTOS: ShopPhotoSet<ClothesPhotoName> = { dir: "clothes-photos", prefix: "cl-", names: CLOTHES_PHOTO_NAMES };

/** A clothes photo as a demo's picture (`cl-<name>`). */
export type ClothesPhoto = `cl-${ClothesPhotoName}`;

// 209 Cosmetics
/** 209 Velours's photos (the cosmetics shop), cut to 4:5 at 720 × 900, the banners cut to 900 × 560. */
export const BEAUTY_PHOTO_NAMES = [
  "argan",
  "balm-stick",
  "bath-salts",
  "bath-set",
  "beard",
  "blush",
  "brush-set",
  "candle-amber",
  "candle-fig",
  "ceramide",
  "coconut-balm",
  "deep-cream",
  "eyeliner",
  "foundation",
  "gel-cream",
  "hero-calm",
  "hero-cream",
  "hero-glow",
  "hero-lab",
  "hero-lips",
  "hyaluronic",
  "kabuki",
  "lip-cheek",
  "nail",
  "niacinamide",
  "nude-palette",
  "oat-bar",
  "olive-soap",
  "oud",
  "perfume",
  "quiz",
  "retinol",
  "rose-oil",
  "rose-palette",
  "rose-perfume",
  "routine-calm",
  "routine-dry",
  "routine-morning",
  "routine-oily",
  "scalp",
  "shade-face",
  "shampoo",
  "shave",
  "smoky-palette",
  "spa-ritual",
  "spa-soap",
  "spf",
  "spf-banner",
  "squalane",
  "tinted-balm",
  "velvet-lips",
  "vitamin-c",
  "welcome",
] as const;
export type BeautyPhotoName = (typeof BEAUTY_PHOTO_NAMES)[number];
export const BEAUTY_PHOTOS: ShopPhotoSet<BeautyPhotoName> = { dir: "beauty-photos", prefix: "bt-", names: BEAUTY_PHOTO_NAMES };

/** A cosmetics photo as a demo's picture (`bt-<name>`). */
export type BeautyPhoto = `bt-${BeautyPhotoName}`;

/** Every set, for the pictures' lookup. */
const SHOP_PHOTO_SETS: readonly ShopPhotoSet<string>[] = [CLOTHES_PHOTOS, BEAUTY_PHOTOS];

/** A shop type's photo as a demo's picture: `cl-rust-1`. */
export type ShopPhoto = ClothesPhoto | BeautyPhoto;

function setOf(name: string): { set: ShopPhotoSet<string>; file: string } | null {
  for (const set of SHOP_PHOTO_SETS) {
    if (!name.startsWith(set.prefix)) continue;
    const file = name.slice(set.prefix.length);
    if (set.names.includes(file)) return { set, file };
  }
  return null;
}

export function isShopPhoto(name: string): name is ShopPhoto {
  return setOf(name) !== null;
}

/** Where a set's photo is served from on the platform (`/clothes-photos/rust-1.jpg`). */
export function shopPhotoPath<N extends string>(set: ShopPhotoSet<N>, name: N): string {
  return `/${set.dir}/${name}.jpg`;
}

const files = new Map<string, Buffer>();

async function photoFile(dir: string, file: string): Promise<Buffer> {
  const key = `${dir}/${file}`;
  const had = files.get(key);
  if (had) return had;
  const data = await readFile(path.join(process.cwd(), "public", dir, `${file}.jpg`));
  files.set(key, data);
  return data;
}

/** The asset of one of the shop types' photos, saved the first time (the file's hash in its ID: a photo changed is saved again). */
export async function saveShopPhoto(deps: PictureDeps, owner: { clientId: string; appId?: string }, name: ShopPhoto, kind: AssetKind): Promise<string> {
  const found = setOf(name);
  if (!found) throw new Error(`No shop photo named ${name}.`);
  const file = await photoFile(found.set.dir, found.file);
  const { clientId, appId } = owner;
  const photo = { shop: name, sha: sha256Hex(file.toString("base64")) };
  const id = idFrom(JSON.stringify(appId ? { v: 1, clientId, appId, photo } : { v: 1, clientId, photo }));
  if (await deps.store.getAsset(id)) return id;
  const blobKey = `assets/${clientId}/${id}.jpg`;
  await deps.putBlob(blobKey, file, "image/jpeg");
  await deps.store.createAsset({ id, clientId, kind, blobKey, contentType: "image/jpeg", size: file.length, createdAt: deps.now });
  return id;
}
