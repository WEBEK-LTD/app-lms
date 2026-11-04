import { getBlobStore } from "../blobs";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, MarketAppSettings, MarketProduct } from "../data/types";
import { EMPTY_MENU } from "../food/menu";

/**
 * 115 Products' photos. Every product and dish carries a main photo (and,
 * for products, up to `GALLERY_MAX` more), uploaded from the vendors' panel
 * one by one, in bulk (image files or a ZIP named by SKU or barcode), or
 * fetched once from a picture link in an import. Photos are stored like the
 * catalog's (an asset of kind `product_image`, served at /api/v1/assets);
 * links are never shown to customers as they are. When the app requires
 * photos (on unless the owner turns it off), customers see only what has one.
 */

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const GALLERY_MAX = 8;
/** Smaller pictures look blurred on a phone; larger ones are a camera's raw file. */
export const PHOTO_MIN_SIDE = 200;
export const PHOTO_MAX_SIDE = 8000;
/** How long a picture link may take to answer. */
const FETCH_TIMEOUT_MS = 10_000;

export type PhotoType = { contentType: string; extension: string };

/** PNG, JPEG or WebP, from the file's first bytes; null for anything else. */
export function photoType(data: Uint8Array): PhotoType | null {
  if (data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47 && data[4] === 0x0d && data[5] === 0x0a && data[6] === 0x1a && data[7] === 0x0a) return { contentType: "image/png", extension: "png" };
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return { contentType: "image/jpeg", extension: "jpg" };
  if (data.length >= 12 && ascii(data, 0, 4) === "RIFF" && ascii(data, 8, 4) === "WEBP") return { contentType: "image/webp", extension: "webp" };
  return null;
}

function ascii(data: Uint8Array, at: number, length: number): string {
  return String.fromCharCode(...data.subarray(at, at + length));
}

/** The picture's width and height from its header; null when the header can't be read. */
export function photoSize(data: Uint8Array, type: PhotoType): { width: number; height: number } | null {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  try {
    if (type.extension === "png") return data.length >= 24 ? { width: view.getUint32(16), height: view.getUint32(20) } : null;
    if (type.extension === "webp") {
      const chunk = ascii(data, 12, 4);
      if (chunk === "VP8 " && data.length >= 30) return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
      if (chunk === "VP8L" && data.length >= 25) {
        const bits = view.getUint32(21, true);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      if (chunk === "VP8X" && data.length >= 30) return { width: 1 + (data[24]! | (data[25]! << 8) | (data[26]! << 16)), height: 1 + (data[27]! | (data[28]! << 8) | (data[29]! << 16)) };
      return null;
    }
    // JPEG: the first start-of-frame segment holds the size.
    let at = 2;
    while (at + 9 < data.length) {
      if (data[at] !== 0xff) return null;
      const marker = data[at + 1]!;
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        at += 2;
        continue;
      }
      const length = view.getUint16(at + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { height: view.getUint16(at + 5), width: view.getUint16(at + 7) };
      at += 2 + length;
    }
    return null;
  } catch {
    return null;
  }
}

export type PhotoCheck = { ok: true; type: PhotoType } | { ok: false; error: string };

/** A photo the platform keeps: PNG, JPEG or WebP, up to 5 MB, between 200 and 8000 pixels a side. */
export function checkPhoto(data: Uint8Array): PhotoCheck {
  if (data.length === 0) return { ok: false, error: "The file is empty." };
  if (data.length > PHOTO_MAX_BYTES) return { ok: false, error: `Each photo can be up to ${PHOTO_MAX_BYTES / 1024 / 1024} MB.` };
  const type = photoType(data);
  if (!type) return { ok: false, error: "Photos must be JPEG, PNG or WebP." };
  const size = photoSize(data, type);
  if (!size) return { ok: false, error: "This photo can't be read. Save it again as JPEG and try once more." };
  if (Math.min(size.width, size.height) < PHOTO_MIN_SIDE) return { ok: false, error: `The photo is too small: use at least ${PHOTO_MIN_SIDE} × ${PHOTO_MIN_SIDE} pixels.` };
  if (Math.max(size.width, size.height) > PHOTO_MAX_SIDE) return { ok: false, error: `The photo is too large: use at most ${PHOTO_MAX_SIDE} pixels a side.` };
  return { ok: true, type };
}

/** The photo kept as the client's asset; its ID. */
export async function savePhotoAsset(store: DataStore, clientId: string, data: Uint8Array, type: PhotoType, now: Date): Promise<string> {
  const assetId = newId();
  const blobKey = `assets/${clientId}/${assetId}.${type.extension}`;
  await getBlobStore().put(blobKey, Buffer.from(data), type.contentType);
  await store.createAsset({ id: assetId, clientId, kind: "product_image", blobKey, contentType: type.contentType, size: data.length, createdAt: now });
  return assetId;
}

/** Whether customers see only what has a photo: on unless the owner turned it off. */
export function photosRequired(settings: Pick<MarketAppSettings, "requirePhotos">): boolean {
  return settings.requirePhotos !== false;
}

export function hasPhoto(p: { imageAssetId: string | null }): boolean {
  return p.imageAssetId !== null;
}

/** All of a product's photos, the main one first. */
export function productPhotos(p: Pick<MarketProduct, "imageAssetId" | "galleryAssetIds">): string[] {
  return [...(p.imageAssetId ? [p.imageAssetId] : []), ...(p.galleryAssetIds ?? [])];
}

export type PhotoResult = { ok: true; assetId: string } | { ok: false; error: string };

/**
 * A photo uploaded for one of the vendor's products or dishes: the main
 * photo (replacing the one before) or, for products, one more after it.
 */
export async function addPhoto(
  store: DataStore,
  app: Pick<App, "id" | "clientId">,
  vendor: { id: number; kind?: string | null },
  input: { productId: number; data: Uint8Array; as: "main" | "extra" },
  now: Date,
): Promise<PhotoResult> {
  const check = checkPhoto(input.data);
  if (!check.ok) return check;
  if ((vendor.kind ?? "restaurant") === "restaurant") {
    const menu = (await store.getRestaurantMenu(app.id, vendor.id)) ?? EMPTY_MENU;
    const dish = menu.sections.flatMap((s) => s.dishes).find((d) => d.id === input.productId);
    if (!dish) return { ok: false, error: "Item not found." };
    const assetId = await savePhotoAsset(store, app.clientId, input.data, check.type, now);
    dish.imageAssetId = assetId;
    await store.saveRestaurantMenu(app.id, vendor.id, menu, now);
    return { ok: true, assetId };
  }
  const product = await store.getMarketProduct(app.id, input.productId);
  if (!product || product.vendorId !== vendor.id) return { ok: false, error: "Item not found." };
  const gallery = product.galleryAssetIds ?? [];
  if (input.as === "extra" && product.imageAssetId && gallery.length >= GALLERY_MAX) return { ok: false, error: `A product can have up to ${GALLERY_MAX + 1} photos.` };
  const assetId = await savePhotoAsset(store, app.clientId, input.data, check.type, now);
  const patch: Partial<MarketProduct> =
    input.as === "extra" && product.imageAssetId ? { galleryAssetIds: [...gallery, assetId] } : { imageAssetId: assetId, photoError: null };
  await store.updateMarketProduct(app.id, product.id, patch, now);
  return { ok: true, assetId };
}

/** One of a product's photos taken off; when it was the main one, the next becomes the main photo. */
export async function removePhoto(store: DataStore, app: Pick<App, "id">, vendor: { id: number; kind?: string | null }, productId: number, assetId: string, now: Date): Promise<boolean> {
  if ((vendor.kind ?? "restaurant") === "restaurant") {
    const menu = (await store.getRestaurantMenu(app.id, vendor.id)) ?? EMPTY_MENU;
    const dish = menu.sections.flatMap((s) => s.dishes).find((d) => d.id === productId);
    if (!dish || dish.imageAssetId !== assetId) return false;
    dish.imageAssetId = null;
    await store.saveRestaurantMenu(app.id, vendor.id, menu, now);
    return true;
  }
  const product = await store.getMarketProduct(app.id, productId);
  if (!product || product.vendorId !== vendor.id) return false;
  const gallery = product.galleryAssetIds ?? [];
  if (product.imageAssetId === assetId) {
    const [next = null, ...rest] = gallery;
    await store.updateMarketProduct(app.id, product.id, { imageAssetId: next, galleryAssetIds: rest.length ? rest : null }, now);
    return true;
  }
  if (!gallery.includes(assetId)) return false;
  const rest = gallery.filter((a) => a !== assetId);
  await store.updateMarketProduct(app.id, product.id, { galleryAssetIds: rest.length ? rest : null }, now);
  return true;
}

// Bulk photos, named by SKU or barcode

/** A bulk photo's name: its code (the SKU or barcode, without folders and extension) and, after "-2" or "_2", which photo it is. */
export function photoName(fileName: string): { code: string; index: number | null } | null {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  if (base.startsWith(".") || base.startsWith("__MACOSX")) return null;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return null;
  if (!/^(jpe?g|png|webp)$/i.test(base.slice(dot + 1))) return null;
  const code = base.slice(0, dot).trim();
  if (!code || code.length > 64) return null;
  const extra = /^(.+?)[-_ ](\d{1,2})$/.exec(code);
  return { code, index: extra ? Number(extra[2]) : null };
}

export type BulkPhotoOutcome = { name: string; status: "main" | "extra" | "no_match" | "error"; product?: string; error?: string };

/**
 * One bulk photo matched to a product of the vendor by its name: the whole
 * name as an SKU or barcode first, else the name without its "-2" as a later
 * photo of that product ("-1" or a product without one: its main photo).
 */
export async function placeBulkPhoto(store: DataStore, app: Pick<App, "id" | "clientId">, vendor: { id: number; kind?: string | null }, file: { name: string; data: Uint8Array }, now: Date): Promise<BulkPhotoOutcome> {
  const parsed = photoName(file.name);
  if (!parsed) return { name: file.name, status: "error", error: "Use JPEG, PNG or WebP files named by SKU or barcode." };
  const find = async (code: string) => (await store.listMarketProducts({ appId: app.id, vendorId: vendor.id, code, page: 1, perPage: 1 })).items[0] ?? null;
  let product = await find(parsed.code);
  let index: number | null = null;
  if (!product && parsed.index !== null) {
    product = await find(parsed.code.slice(0, parsed.code.length - String(parsed.index).length - 1));
    index = parsed.index;
  }
  if (!product) return { name: file.name, status: "no_match" };
  const as = index !== null && index > 1 && product.imageAssetId ? "extra" : "main";
  const added = await addPhoto(store, app, vendor, { productId: product.id, data: file.data, as }, now);
  return added.ok ? { name: file.name, status: as, product: product.name } : { name: file.name, status: "error", product: product.name, error: added.error };
}

// Picture links from imports

export type PhotoFetcher = (url: string, init: RequestInit) => Promise<Response>;

/** A picture link's photo: fetched from public addresses only, up to 5 MB, checked as a photo. */
export async function fetchLinkedPhoto(url: string, fetcher: PhotoFetcher): Promise<{ ok: true; data: Uint8Array; type: PhotoType } | { ok: false; error: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "The picture link isn't a web address." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return { ok: false, error: "The picture link must start with https://." };
  if (parsed.username || parsed.password) return { ok: false, error: "The picture link can't carry a password." };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetcher(parsed.toString(), { signal: controller.signal, headers: { accept: "image/jpeg,image/png,image/webp" } });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return { ok: false, error: `The picture link answered ${response.status}.` };
    }
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > PHOTO_MAX_BYTES) {
      await response.body?.cancel().catch(() => undefined);
      return { ok: false, error: "The picture is larger than 5 MB." };
    }
    const data = await readCapped(response, PHOTO_MAX_BYTES);
    if (!data) return { ok: false, error: "The picture is larger than 5 MB." };
    const check = checkPhoto(data);
    return check.ok ? { ok: true, data, type: check.type } : { ok: false, error: check.error };
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    const cause = e instanceof Error && e.cause instanceof Error ? e.cause.name : "";
    if (name === "AbortError" || cause === "AbortError") return { ok: false, error: "The picture link took too long to answer." };
    if (name === "BlockedAddressError" || cause === "BlockedAddressError") return { ok: false, error: "The picture link points to a private address." };
    return { ok: false, error: "The picture link couldn't be reached." };
  } finally {
    clearTimeout(timer);
  }
}

/** The body, or null once it passes `max` bytes (reading stops there). */
async function readCapped(response: Response, max: number): Promise<Uint8Array | null> {
  if (!response.body) return new Uint8Array(await response.arrayBuffer());
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/**
 * Picture links waiting to become photos, fetched a few at a time within
 * the budget (the frequent job, and the panel's "Fetch the linked photos").
 * A link that fails keeps its reason and isn't tried again until the link
 * changes (an import with a new link clears it).
 */
export async function fetchWaitingPhotos(input: {
  store: DataStore;
  now: () => Date;
  fetcher: PhotoFetcher;
  budgetMs: number;
  limit: number;
  only?: { appId: string; vendorId: number };
  parallel?: number;
}): Promise<{ fetched: number; failed: number; left: boolean }> {
  const started = Date.now();
  const waiting = await input.store.listMarketProductsAwaitingPhoto(input.limit, input.only);
  const clients = new Map<string, string | null>();
  const clientOf = async (appId: string) => {
    if (!clients.has(appId)) clients.set(appId, (await input.store.getAppById(appId))?.clientId ?? null);
    return clients.get(appId)!;
  };
  let fetched = 0;
  let failed = 0;
  let next = 0;
  const worker = async () => {
    while (next < waiting.length && Date.now() - started < input.budgetMs) {
      const p = waiting[next++]!;
      const clientId = await clientOf(p.appId);
      if (!clientId || !p.imageUrl) continue;
      const got = await fetchLinkedPhoto(p.imageUrl, input.fetcher);
      if (got.ok) {
        const assetId = await savePhotoAsset(input.store, clientId, got.data, got.type, input.now());
        await input.store.updateMarketProduct(p.appId, p.id, { imageAssetId: assetId, photoError: null }, input.now());
        fetched++;
      } else {
        await input.store.updateMarketProduct(p.appId, p.id, { photoError: got.error.slice(0, 160) }, input.now());
        failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, input.parallel ?? 4) }, worker));
  return { fetched, failed, left: next < waiting.length || waiting.length === input.limit };
}
