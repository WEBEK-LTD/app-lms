import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "../crypto/tokens";
import type { AssetKind } from "../data/types";
import { idFrom, type PictureDeps } from "./picture-assets";
import { SHOP_KITS } from "./shop-kits";

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
  "black-coat",
  "black-dress",
  "black-heels",
  "black-top",
  "blue-dot",
  "bottom-jeans",
  "bottom-skirt",
  "bottom-velvet",
  "bracelets",
  "braids",
  "brick-jacket",
  "bridal-rack",
  "brown-bag",
  "brown-coat",
  "c-black-coat",
  "camel-dress",
  "camel-jacket",
  "cream-maxi",
  "dark-coat",
  "denim",
  "editor-hat",
  "fence-jeans",
  "flannel",
  "flatlay-black",
  "flatlay-sneak",
  "fleece",
  "floral-bag",
  "floral-romper",
  "fur-jacket",
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
  "stripe-dress",
  "street-walk",
  "sunglasses",
  "top-black",
  "top-cream",
  "top-knit",
  "top-plaid",
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

// 209 Kids' clothes
/** 209 Toota's photos (the kids' clothes shop), cut to 4:5 at 720 × 900, the banners kept wide at 900 wide. */
export const KIDS_PHOTO_NAMES = [
  "baby-flatlay",
  "baby-legs",
  "baby-shoes",
  "balloons",
  "birthday-cake",
  "cream-knit",
  "cupcake",
  "denim-jacket",
  "foot-muslin",
  "gift-kraft",
  "gift-pink",
  "girl-desk",
  "girls-coats",
  "grey-hoodie",
  "knit-blanket",
  "knit-feet",
  "knit-hat-green",
  "knit-socks",
  "mittens",
  "newborn-knit",
  "newborn-mint",
  "overalls",
  "pink-pajamas",
  "plaid-jacket",
  "plaid-shirt",
  "pom-beanie",
  "robe-b",
  "romper-hat",
  "rust-sweater",
  "sleep-striped",
  "slippers",
  "sparkle-sneakers",
  "straw-hat",
  "striped-tights",
  "summer-outfit",
  "teddy-sweater",
  "tiered-dress",
  "white-dresses",
  "yellow-raincoat",
] as const;
export type KidsPhotoName = (typeof KIDS_PHOTO_NAMES)[number];
export const KIDS_PHOTOS: ShopPhotoSet<KidsPhotoName> = { dir: "kids-photos", prefix: "kd-", names: KIDS_PHOTO_NAMES };

/** A kids' clothes photo as a demo's picture (`kd-<name>`). */
export type KidsPhoto = `kd-${KidsPhotoName}`;

// 209 Toys
/** 209 Toot's photos (the toy shop), cut to 4:5 at 720 × 900; the banners (`-wide`, and those only used wide) kept wide at 900 wide. */
export const TOYS_PHOTO_NAMES = [
  "backgammon",
  "bead-maze",
  "beads-kid",
  "bear-bow",
  "bear-mint",
  "bear-sweater",
  "block-tower",
  "blocks-close",
  "bricks-pile",
  "bricks-teal",
  "bubbles-girl",
  "bubbles-girl-wide",
  "bunny-eggs",
  "bunny-knit",
  "chess",
  "compass",
  "crayons-pastel",
  "crib-mobile",
  "cuddly-bear",
  "dice",
  "family-play",
  "football-boy",
  "gift-black",
  "gift-black-wide",
  "gift-confetti",
  "gift-kraft",
  "gift-white",
  "gift-white-wide",
  "girl-drawing",
  "girl-drawing-wide",
  "globes",
  "globes-wide",
  "kite",
  "kite-wide",
  "lego-kid",
  "letters",
  "plane",
  "sleeping-baby",
  "snowman-plush",
  "teepee",
  "telescope-globe",
  "telescope-globe-wide",
  "tent-family",
  "toddler-bear",
  "toddler-play",
  "tricycle",
  "ukulele",
  "wooden-figures",
] as const;
export type ToysPhotoName = (typeof TOYS_PHOTO_NAMES)[number];
export const TOYS_PHOTOS: ShopPhotoSet<ToysPhotoName> = { dir: "toys-photos", prefix: "ty-", names: TOYS_PHOTO_NAMES };

/** A toys photo as a demo's picture (`ty-<name>`). */
export type ToysPhoto = `ty-${ToysPhotoName}`;

/** 211 Madar's photos (the electronics shop), cut to 4:5 at 720 × 900; the `w-` banners 3:2 at 900 × 600. */
export const ELECTRONICS_PHOTO_NAMES = [
  "buds-carpet",
  "buds-plant",
  "camera-night",
  "drone-mini",
  "drone-sky",
  "espresso",
  "gamepad-blue",
  "gamepad-hands",
  "home-cam",
  "hp-dark",
  "hp-leather",
  "hp-studio",
  "hp-white",
  "keyboard-rgb",
  "keyboard-slim",
  "laptop-chart",
  "laptop-close",
  "laptop-desk",
  "laptop-glow",
  "laptop-night",
  "laptop-plant",
  "laptop-silver",
  "laptop-sun",
  "laptop-table",
  "laptop-wood",
  "lens-gold",
  "lens-top",
  "lens-white",
  "microwave",
  "oven",
  "phone-black",
  "phone-box",
  "phone-buds",
  "phone-camera",
  "phone-hand",
  "phone-table",
  "phone-unbox",
  "phone-wood",
  "screen-wave",
  "storage-kit",
  "tablet-pen",
  "tablet-phone",
  "tv-room",
  "vr-headset",
  "w-camera-night",
  "w-espresso",
  "w-gamepad-blue",
  "w-gamepad-hands",
  "w-laptop-chart",
  "w-laptop-glow",
  "w-laptop-plant",
  "w-phone-box",
  "w-phone-camera",
  "w-screen-forest",
  "w-screen-sea",
  "w-screen-wave",
  "w-tv-room",
  "w-vr-headset",
  "w-washer",
  "washer",
  "watch-blush",
  "watch-grey",
  "watch-lens",
  "watch-phone",
  "watch-white",
] as const;
export type ElectronicsPhotoName = (typeof ELECTRONICS_PHOTO_NAMES)[number];
export const ELECTRONICS_PHOTOS: ShopPhotoSet<ElectronicsPhotoName> = { dir: "electronics-photos", prefix: "el-", names: ELECTRONICS_PHOTO_NAMES };
/** An electronics photo as a demo's picture (`el-<name>`). */
export type ElectronicsPhoto = `el-${ElectronicsPhotoName}`;

/** 211 Nova's photos (the mobiles shop), cut to 4:5 at 720 × 900; the `-wide` ones kept wide at 900 wide for the banners. */
export const MOBILES_PHOTO_NAMES = [
  "box-1-wide", "box-1", "box-2", "box-3-wide", "box-3", "buds-fabric", "buds-purple", "case-red-wide", "case-red", "flatlay-white", "hp-black", "hp-white", "hp-woman-wide", "hp-woman", "phone-bokeh", "phone-cam-wide", "phone-cam", "phone-dark-wide", "phone-dark", "phone-desk-wide", "phone-desk", "phone-earbuds-wide", "phone-earbuds", "phone-food-wide", "phone-food", "phone-hand-grey", "phone-sea-wide", "phone-sea", "phone-sunset", "phone-vintage-wide", "phone-vintage", "phone-wood-wide", "phone-wood", "tab-coffee", "tab-marble", "tab-pen", "tab-stand-wide", "tab-stand", "tracker-crouch-wide", "tracker-crouch", "tracker-rail", "watch-earbuds", "watch-fabric", "watch-man-wide", "watch-man", "watch-pink", "watch-rugged", "watch-white", "wireless-pad-wide", "wireless-pad",
] as const;
export type MobilesPhotoName = (typeof MOBILES_PHOTO_NAMES)[number];
export const MOBILES_PHOTOS: ShopPhotoSet<MobilesPhotoName> = { dir: "mobiles-photos", prefix: "mb-", names: MOBILES_PHOTO_NAMES };

/** A mobiles photo as a demo's picture (`mb-<name>`). */
export type MobilesPhoto = `mb-${MobilesPhotoName}`;

/** 211 Nawah's photos (the computers and gaming shop), resized to 900 wide (the two wide banners 1200 wide). */
export const COMPUTERS_PHOTO_NAMES = [
  "arcade",
  "chair-mesh",
  "cooler",
  "desk-city",
  "desk-coder",
  "desk-mouse",
  "desk-terrarium",
  "heatsink-purple",
  "hero-glow",
  "hp-dark",
  "hp-side",
  "hp-white",
  "kb-backlit",
  "kb-black",
  "kb-keys",
  "kb-macro",
  "kb-rgb",
  "lap-blue",
  "lap-bw",
  "lap-chart",
  "lap-code",
  "lap-desk-dark",
  "lap-edge",
  "lap-glass",
  "lap-glow",
  "lap-hands",
  "lap-night",
  "lap-plant",
  "lap-top",
  "lap-wood",
  "mb-board",
  "mb-cpu",
  "mic-dark",
  "mic-studio",
  "monitor-studio",
  "pad-blue",
  "pad-buttons",
  "pad-duo",
  "pad-hands",
  "pad-white",
  "ram-dark",
  "ram-macro",
  "ram-slots",
  "ram-studio",
  "server",
  "setup-purple",
  "socket-blue",
  "socket-gold",
  "socket-silver",
  "ssd-kit",
  "usb-kit",
  "usb-ports",
  "zone-pad",
] as const;
export type ComputersPhotoName = (typeof COMPUTERS_PHOTO_NAMES)[number];
export const COMPUTERS_PHOTOS: ShopPhotoSet<ComputersPhotoName> = { dir: "computers-photos", prefix: "pc-", names: COMPUTERS_PHOTO_NAMES };

/** A computers photo as a demo's picture (`pc-<name>`). */
export type ComputersPhoto = `pc-${ComputersPhotoName}`;

/** Every set, for the pictures' lookup. */
const SHOP_PHOTO_SETS: readonly ShopPhotoSet<string>[] = [
  CLOTHES_PHOTOS,
  // 209 Kids' clothes
  KIDS_PHOTOS,
  // 209 Cosmetics
  BEAUTY_PHOTOS,
  // 209 Toys
  TOYS_PHOTOS,
  // 210 And each kit's (lib/demo/shop-kits.ts).
  ...Object.values(SHOP_KITS).map((k) => k.photos),
  // 211 Electronics, mobiles and computers
  ELECTRONICS_PHOTOS,
  MOBILES_PHOTOS,
  COMPUTERS_PHOTOS,
];

/** 210 A kit's photo (decor `dc-`, crochet `cr-`, furniture `fu-`; lib/demo/shop-kits.ts). */
export type KitPhoto = `${"dc" | "cr" | "fu"}-${string}`;

/** A shop type's photo as a demo's picture: `cl-rust-1`. */
export type ShopPhoto =
  | ClothesPhoto
  // 209 Kids' clothes
  | KidsPhoto
  // 209 Cosmetics
  | BeautyPhoto
  // 209 Toys
  | ToysPhoto
  // 210 The kits'
  | KitPhoto
  // 211 Electronics, mobiles and computers
  | ElectronicsPhoto
  | MobilesPhoto
  | ComputersPhoto;

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
