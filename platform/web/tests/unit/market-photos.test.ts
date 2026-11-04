import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_HOSTED_SETTINGS, type App, type DeliverySettings, type MarketProductInput, type RestaurantInput } from "@/lib/data/types";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { FoodConnector } from "@/lib/hosted/connectors/food";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { applyCatalogImport, planCatalogImport, suggestMapping, vendorProducts } from "@/lib/market/catalog-import";
import { addPhoto, checkPhoto, fetchLinkedPhoto, fetchWaitingPhotos, photoName, placeBulkPhoto, removePhoto, type PhotoFetcher } from "@/lib/market/photos";
import { storedZip } from "@/lib/market/xlsx";
import { photoBatches, photosInZip } from "@/lib/market/zip-browser";
import { NOW, setupClient } from "./helpers";

/** A PNG's header (enough for the checks, which read only the size). */
function png(width: number, height: number, padTo = 64): Uint8Array {
  const out = new Uint8Array(Math.max(33, padTo));
  out.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const view = new DataView(out.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  out[24] = 8;
  out[25] = 6;
  return out;
}

/** A JPEG with a start-of-frame segment. */
function jpeg(width: number, height: number): Uint8Array {
  const out = new Uint8Array(40);
  out.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08]);
  const view = new DataView(out.buffer);
  view.setUint16(13, height);
  view.setUint16(15, width);
  return out;
}

const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
const EVERY_DAY = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((day) => ({ day, opens: "00:00", closes: "23:59" }));
const SETTINGS: DeliverySettings = { ...DEFAULT_DELIVERY_SETTINGS, currency: "EGP", cash: true, card: false, timezone: "Africa/Cairo" };

const vendorInput = (appId: string, patch: Partial<RestaurantInput> = {}): RestaurantInput => ({
  appId,
  name: "Green Basket",
  description: null,
  logoAssetId: null,
  coverAssetId: null,
  cuisines: [],
  address: { address: "Tahrir Square, Cairo", details: null, lat: 30.0444, lng: 31.2357 },
  phone: "+20225775935",
  hours: EVERY_DAY,
  prepMinutes: 20,
  minOrderCents: 0,
  maxKm: null,
  commissionBp: 1000,
  active: true,
  position: 1,
  kind: "grocery",
  delivery: { by: "vendor", feeKind: "fixed", fee: 0, perKm: 0, freeOver: null, minItems: null, maxItems: null, pickup: true, scheduling: false },
  ...patch,
});

const product = (appId: string, vendorId: number, sku: string, patch: Partial<MarketProductInput> = {}): MarketProductInput => ({
  appId,
  vendorId,
  departmentId: null,
  aisleId: null,
  name: sku.toUpperCase(),
  description: null,
  brand: null,
  sku,
  barcode: null,
  imageAssetId: null,
  imageUrl: null,
  price: 10_00,
  wasPrice: null,
  unit: "item",
  step: 1,
  maxQuantity: null,
  stock: null,
  inStock: true,
  tags: [],
  position: 1,
  ...patch,
});

describe("115 product photos: the files", () => {
  it("keeps JPEG, PNG and WebP of a sensible size, and says why it refuses the rest", () => {
    expect(checkPhoto(png(800, 600))).toMatchObject({ ok: true, type: { contentType: "image/png" } });
    expect(checkPhoto(jpeg(1200, 1200))).toMatchObject({ ok: true, type: { contentType: "image/jpeg" } });
    const webp = new Uint8Array(30);
    webp.set(new TextEncoder().encode("RIFF"), 0);
    webp.set(new TextEncoder().encode("WEBPVP8X"), 8);
    webp.set([0x1f, 0x03, 0x00, 0x57, 0x02, 0x00], 24); // 800 × 600
    expect(checkPhoto(webp)).toMatchObject({ ok: true, type: { contentType: "image/webp" } });
    expect(checkPhoto(new TextEncoder().encode("<svg></svg>"))).toEqual({ ok: false, error: "Photos must be JPEG, PNG or WebP." });
    expect(checkPhoto(png(120, 400))).toMatchObject({ ok: false, error: expect.stringContaining("too small") });
    expect(checkPhoto(png(9000, 400))).toMatchObject({ ok: false, error: expect.stringContaining("too large") });
    expect(checkPhoto(png(800, 600, 5 * 1024 * 1024 + 1))).toMatchObject({ ok: false, error: expect.stringContaining("5 MB") });
  });

  it("reads bulk photos' names: the SKU or barcode, and -2 for the next photos", () => {
    expect(photoName("photos/6221234567890.jpg")).toEqual({ code: "6221234567890", index: null });
    expect(photoName("FRU-001_2.PNG")).toEqual({ code: "FRU-001_2", index: 2 });
    expect(photoName("__MACOSX/._apple.jpg")).toBeNull();
    expect(photoName("notes.txt")).toBeNull();
  });

  it("reads a ZIP's pictures in the browser and sends them in small batches", async () => {
    const zip = storedZip([
      { name: "a/APL-1.jpg", data: jpeg(800, 800) },
      { name: "readme.txt", data: new TextEncoder().encode("hi") },
      { name: "big.png", data: png(800, 800, 2000) },
    ]);
    const read = await photosInZip(zip, 1000);
    expect(read.files.map((f) => f.name)).toEqual(["APL-1.jpg"]);
    expect(read.skipped).toEqual(["big.png"]);
    const batches = photoBatches([1, 2, 3, 4, 5].map((n) => ({ name: `${n}`, data: new Uint8Array(400) })), 1000, 3);
    expect(batches.map((b) => b.length)).toEqual([2, 2, 1]);
  });

  it("fetches a picture link from public addresses only, never more than 5 MB, and says what went wrong", async () => {
    const answer = (body: Uint8Array, status = 200, headers: Record<string, string> = {}): PhotoFetcher => async () => new Response(body as BodyInit, { status, headers });
    expect(await fetchLinkedPhoto("https://cdn.example/apple.jpg", answer(jpeg(900, 900)))).toMatchObject({ ok: true });
    expect(await fetchLinkedPhoto("ftp://cdn.example/apple.jpg", answer(jpeg(900, 900)))).toMatchObject({ ok: false, error: expect.stringContaining("https://") });
    expect(await fetchLinkedPhoto("https://user:pw@cdn.example/a.jpg", answer(jpeg(900, 900)))).toMatchObject({ ok: false, error: expect.stringContaining("password") });
    expect(await fetchLinkedPhoto("https://cdn.example/a.jpg", answer(jpeg(900, 900), 404))).toEqual({ ok: false, error: "The picture link answered 404." });
    expect(await fetchLinkedPhoto("https://cdn.example/a.jpg", answer(png(800, 800, 6 * 1024 * 1024)))).toEqual({ ok: false, error: "The picture is larger than 5 MB." });
    expect(await fetchLinkedPhoto("https://cdn.example/a.jpg", answer(new Uint8Array(10), 200, { "content-length": String(9 * 1024 * 1024) }))).toEqual({ ok: false, error: "The picture is larger than 5 MB." });
    expect(await fetchLinkedPhoto("https://cdn.example/a.html", answer(new TextEncoder().encode("<html>")))).toMatchObject({ ok: false, error: "Photos must be JPEG, PNG or WebP." });
    const blocked: PhotoFetcher = async () => {
      const cause = new Error("10.0.0.5 points to a private network.");
      cause.name = "BlockedAddressError";
      throw new TypeError("fetch failed", { cause });
    };
    expect(await fetchLinkedPhoto("https://intranet.example/a.jpg", blocked)).toEqual({ ok: false, error: "The picture link points to a private address." });
  });
});

describe("115 product photos: on products, and what customers see", () => {
  let store: MemoryStore;
  let app: App;
  let other: App;
  let grocery: number;
  let otherVendor: number;
  let restaurant: number;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const make = async (name: string) => {
      const base = newApp(client.id, null, NOW, "food");
      const made: App = { ...base, backend: "hosted", appName: name, websiteDoneAt: NOW, connector: { kind: "restaurants" }, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" } };
      await store.createApp(made);
      await store.saveDeliverySettings(made.id, SETTINGS, NOW);
      return made;
    };
    app = await make("Nile Market");
    other = await make("Other Market");
    grocery = (await store.createRestaurant(vendorInput(app.id), { sections: [], nextId: 1 }, NOW)).id;
    otherVendor = (await store.createRestaurant(vendorInput(app.id, { name: "Corner Shop", position: 2 }), { sections: [], nextId: 1 }, NOW)).id;
    restaurant = (
      await store.createRestaurant(
        vendorInput(app.id, { name: "Abou Tarek", kind: "restaurant", position: 3 }),
        { sections: [{ id: 1, name: "Mains", dishes: [{ id: 2, name: "Koshari", description: null, imageAssetId: null, priceCents: 50_00, available: true, popular: false, choiceGroups: [] }] }], nextId: 3 },
        NOW,
      )
    ).id;
    for (const sku of ["apl-1", "ban-2"]) await store.createMarketProduct(product(app.id, grocery, sku), NOW);
    await store.createMarketProduct(product(app.id, otherVendor, "chips"), NOW);
  });

  const byCode = async (vendorId: number, code: string) => (await store.listMarketProducts({ appId: app.id, vendorId, code, page: 1, perPage: 1 })).items[0]!;
  const vendorOf = (id: number) => ({ id, kind: id === restaurant ? "restaurant" : "grocery" });

  it("adds the main photo and more, and the next one takes over when the main one is removed", async () => {
    const apple = await byCode(grocery, "apl-1");
    const main = await addPhoto(store, app, vendorOf(grocery), { productId: apple.id, data: jpeg(900, 900), as: "main" }, NOW);
    const second = await addPhoto(store, app, vendorOf(grocery), { productId: apple.id, data: png(900, 900), as: "extra" }, NOW);
    expect(main.ok && second.ok).toBe(true);
    let saved = await byCode(grocery, "apl-1");
    expect(saved.imageAssetId).toBe(main.ok ? main.assetId : null);
    expect(saved.galleryAssetIds).toEqual([second.ok ? second.assetId : null]);
    expect(await removePhoto(store, app, vendorOf(grocery), apple.id, saved.imageAssetId!, NOW)).toBe(true);
    saved = await byCode(grocery, "apl-1");
    expect(saved.imageAssetId).toBe(second.ok ? second.assetId : null);
    expect(saved.galleryAssetIds ?? []).toEqual([]);
    expect(await addPhoto(store, app, vendorOf(grocery), { productId: apple.id, data: new Uint8Array(10), as: "main" }, NOW)).toEqual({ ok: false, error: "Photos must be JPEG, PNG or WebP." });
  });

  it("keeps each vendor to its own products' photos, and each app to its own", async () => {
    const chips = await byCode(otherVendor, "chips");
    expect(await addPhoto(store, app, vendorOf(grocery), { productId: chips.id, data: jpeg(900, 900), as: "main" }, NOW)).toEqual({ ok: false, error: "Item not found." });
    expect(await addPhoto(store, other, vendorOf(grocery), { productId: (await byCode(grocery, "apl-1")).id, data: jpeg(900, 900), as: "main" }, NOW)).toEqual({ ok: false, error: "Item not found." });
    expect(await placeBulkPhoto(store, app, vendorOf(grocery), { name: "chips.jpg", data: jpeg(900, 900) }, NOW)).toEqual({ name: "chips.jpg", status: "no_match" });
    expect((await byCode(otherVendor, "chips")).imageAssetId).toBeNull();
    expect(await removePhoto(store, app, vendorOf(grocery), chips.id, "x", NOW)).toBe(false);
  });

  it("places bulk photos by SKU, with -2 as the next photo", async () => {
    const out = [];
    for (const name of ["apl-1.jpg", "apl-1-2.jpg", "ban-2.png", "zzz.jpg", "ban-2-3.txt"]) out.push(await placeBulkPhoto(store, app, vendorOf(grocery), { name, data: name.endsWith("png") ? png(800, 800) : jpeg(800, 800) }, NOW));
    expect(out.map((o) => o.status)).toEqual(["main", "extra", "main", "no_match", "error"]);
    expect((await byCode(grocery, "apl-1")).galleryAssetIds).toHaveLength(1);
  });

  it("fetches imports' picture links into photos, keeps a failed link's reason, and tries a new link again", async () => {
    const table = { columns: ["name", "price", "sku", "image"], rows: [["Apples", "10", "apl-1", "https://cdn.example/apple.jpg"], ["Pears", "12", "pear-9", "https://cdn.example/broken.jpg"]] };
    const plan = (await import("@/lib/market/catalog-import")).planCatalogImport;
    const existing = await vendorProducts(store, app.id, grocery);
    await applyCatalogImport(store, app.id, grocery, plan(table, suggestMapping(table.columns), { currency: "EGP", existing }), NOW);
    const fetcher: PhotoFetcher = async (url) => (url.includes("broken") ? new Response("nope", { status: 404 }) : new Response(jpeg(900, 900) as BodyInit));
    const run = await fetchWaitingPhotos({ store, now: () => NOW, fetcher, budgetMs: 5000, limit: 10 });
    expect(run).toMatchObject({ fetched: 1, failed: 1 });
    expect((await byCode(grocery, "apl-1")).imageAssetId).not.toBeNull();
    expect((await byCode(grocery, "pear-9")).photoError).toBe("The picture link answered 404.");
    expect(await store.listMarketProductsAwaitingPhoto(10)).toEqual([]);
    // A new link is tried again.
    const again = { columns: ["name", "price", "sku", "image"], rows: [["Pears", "12", "pear-9", "https://cdn.example/pear.jpg"]] };
    await applyCatalogImport(store, app.id, grocery, planCatalogImport(again, suggestMapping(again.columns), { currency: "EGP", existing: await vendorProducts(store, app.id, grocery) }), NOW);
    expect((await store.listMarketProductsAwaitingPhoto(10)).map((p) => p.sku)).toEqual(["pear-9"]);
  });

  it("shows customers only products and dishes with a photo, unless the owner turns the rule off", async () => {
    const context = (): HostedContext => ({
      store,
      app,
      active: true,
      now: NOW,
      ip: "203.0.113.9",
      secret: "test-hosted-secret",
      sender: new LogSender(),
      push: false,
      assetUrl: ASSETS,
      platformUrl: "https://yallapp.test",
      connector: new FoodConnector({ store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test", food: true }),
    });
    const get = async (path: string, query: Record<string, string> = {}) => (await handleHosted(context(), { method: "GET", path: path.split("/").filter(Boolean), query: new URLSearchParams(query), body: undefined, token: null })).body as { items: { name: string; image_url: string | null; images: string[] }[] };
    expect((await get(`/market/vendors/${grocery}/products`)).items).toEqual([]);
    expect((await get(`/market/vendors/${restaurant}/products`)).items).toEqual([]);
    const apple = await byCode(grocery, "apl-1");
    await addPhoto(store, app, vendorOf(grocery), { productId: apple.id, data: jpeg(900, 900), as: "main" }, NOW);
    await addPhoto(store, app, vendorOf(restaurant), { productId: 2, data: jpeg(900, 900), as: "main" }, NOW);
    const shown = (await get(`/market/vendors/${grocery}/products`)).items;
    expect(shown.map((p) => p.name)).toEqual(["APL-1"]);
    expect(shown[0]!.image_url).toMatch(/^https:\/\/yallapp\.test\/api\/v1\/assets\//);
    expect(shown[0]!.images).toEqual([shown[0]!.image_url]);
    expect((await get(`/market/vendors/${restaurant}/products`)).items.map((d) => d.name)).toEqual(["Koshari"]);
    await store.saveDeliverySettings(app.id, { ...SETTINGS, marketApp: { ...(await import("@/lib/market/settings")).DEFAULT_MARKET_SETTINGS, requirePhotos: false } }, NOW);
    expect((await get(`/market/vendors/${grocery}/products`)).items.map((p) => p.name).sort()).toEqual(["APL-1", "BAN-2"]);
  });
});
