import { catalogSettings } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App, CatalogCurrency, CatalogSettings, CatalogVariants, ProductDimensions, ProductMakeDays } from "../data/types";
import type { ShopTypeDemo } from "./constants";
import { priceFor, type EntryDeps } from "./entries";
import { unchanged } from "./rows";
import type { KitPhoto } from "./shop-photos";

/**
 * 210 One shop type's demo as data (a "kit"): the shop, its main categories
 * and their sub-categories (named in Arabic and Turkish too), its products
 * by SKU with their photos, choices (material, colour, size: the store's
 * variations, 91.5, each with its own stock), size in cm and days to make,
 * its add-ons (gift wrap, assembly), its flash sale and its code, and its
 * settings (delivery days and slots, the card message, returns). Home decor
 * (Sakan), crochet (Ghurza) and furniture (Rukn) are kits
 * (lib/demo/kits/*.ts, registered in ./shop-kits.ts); Lujain (clothes) came
 * first and keeps its own files. The shops, products, names and prices are
 * invented; the photos are real, CC0 (public/<type>-photos/CREDITS.md).
 */

export interface KitName {
  name: string;
  names: { ar: string; tr: string };
}

export interface KitCategory extends KitName {
  subs: readonly KitName[];
}

export interface KitProduct {
  sku: string;
  name: string;
  /** Its sub-category, by name (its main category follows); a main category's name for a product in no sub-category. */
  sub: string;
  priceCents: number;
  salePriceCents: number | null;
  /** Its photos (file names of the kit's set), the first its cover. */
  photos: readonly string[];
  featured: boolean;
  description: string;
  /** Its choices, in order (`Material`, `Colour`, `Size`): each value a variation with its own stock; none: one kind. */
  choices?: readonly { name: string; values: readonly string[] }[];
  dimensions?: ProductDimensions | null;
  makeDays?: ProductMakeDays | null;
  /** A gift add-on or a service (gift wrap, assembly): offered with the products of these main categories (none: all). */
  addon?: { categories: readonly string[] } | null;
  /** Units in stock for a product without choices; missing: no count. */
  stock?: number | null;
}

export interface ShopKit {
  demo: ShopTypeDemo;
  /** Its photos: the folder under public/ and the prefix of their demo picture names (`dc-`). */
  photos: { dir: string; prefix: string; names: readonly string[] };
  currency: CatalogCurrency;
  shippingCents: number;
  freeShippingOverCents: number | null;
  categories: readonly KitCategory[];
  products: readonly KitProduct[];
  flashSale: { title: string; titles: { ar: string; tr: string }; percent: number; hours: number; limit: number; sold: number; skus: readonly string[] };
  coupon: { code: string; percent: number; minOrderCents: number };
  /** Its settings besides money (returns, delivery days and slots, the card message, its titles). */
  commerce: Omit<Partial<CatalogSettings>, "currency" | "shippingCents" | "freeShippingOverCents" | "payment">;
}

/** The main category a product's sub-category is in (or the main category itself). */
export function kitMainOf(kit: ShopKit, sub: string): KitCategory {
  const found = kit.categories.find((c) => c.name === sub || c.subs.some((s) => s.name === sub));
  if (!found) throw new Error(`No main category of ${kit.demo} has ${sub}.`);
  return found;
}

/**
 * A product's choices as its variations (91.5): each combination its own
 * stock (most there, a few low, one gone, as a real shop's), the product's
 * price; none for a product of one kind.
 */
export function kitVariants(product: KitProduct, index: number): CatalogVariants | null {
  const choices = (product.choices ?? []).filter((c) => c.values.length > 0);
  if (!choices.length) return null;
  const attributes = choices.map((c) => ({ name: c.name, values: [...c.values] }));
  const pattern = [7, 4, 9, 2, 0, 6, 3, 8];
  const combos: string[][] = choices.reduce<string[][]>((all, c) => all.flatMap((values) => c.values.map((v) => [...values, v])), [[]]);
  const items: CatalogVariants["items"] = combos.map((values, i) => ({
    id: i + 1,
    values,
    priceCents: null,
    salePriceCents: null,
    stock: pattern[(i + index) % pattern.length]!,
    sku: `${product.sku}-${values.join("-").replaceAll(" ", "").toUpperCase()}`,
    active: true,
  }));
  const first = items.find((v) => v.stock !== 0);
  return { attributes, items, ...(first ? { defaultId: first.id } : {}) };
}

/** Each kit product's demo picture name (`dc-oak-dining`). */
export const kitPicture = (kit: ShopKit, name: string) => `${kit.photos.prefix}${name}`;

/**
 * 210 A kit's entries: its categories and sub-categories by name, its
 * products by SKU in their sub-category and main category, their photos
 * the platform's, choices, size and days to make, its add-ons offered with
 * their categories. The demo's are updated in place and what is no longer
 * in the demo is removed; an app started from the demo gets them as
 * samples, only added (lib/samples/demo.ts).
 */
export async function demoKitProducts(deps: EntryDeps, app: App, kit: ShopKit): Promise<void> {
  const { store, now } = deps;
  const marked = deps.sample ? { sample: true as const } : {};
  const currency = catalogSettings(app).currency;
  const money = (cents: number) => priceFor(deps, cents, kit.currency, currency);
  const categories = await store.listCatalogCategories(app.id);
  const categoryIds = new Map<string, number>();
  const wanted = new Set<string>();
  for (const main of kit.categories) {
    wanted.add(main.name);
    const found = categories.find((c) => c.name === main.name);
    const mainId = found ? found.id : (await store.createCatalogCategory({ appId: app.id, name: main.name, names: { ...main.names }, now, ...marked })).id;
    if (found && found.parentId) await store.setCatalogCategoryParent(app.id, found.id, null);
    categoryIds.set(main.name, mainId);
    for (const sub of main.subs) {
      wanted.add(sub.name);
      const had = categories.find((c) => c.name === sub.name);
      const subId = had ? had.id : (await store.createCatalogCategory({ appId: app.id, name: sub.name, names: { ...sub.names }, parentId: mainId, now, ...marked })).id;
      if (had && had.parentId !== mainId) await store.setCatalogCategoryParent(app.id, had.id, mainId);
      categoryIds.set(sub.name, subId);
    }
  }
  if (!deps.sample) for (const c of categories) if (!wanted.has(c.name)) await store.deleteCatalogCategory(app.id, c.id, now);
  const products = await store.listCatalogProducts(app.id);
  const photos = new Map<string, Promise<string>>();
  const photo = (name: string) => {
    if (!photos.has(name)) photos.set(name, deps.picture(kitPicture(kit, name) as KitPhoto, "product"));
    return photos.get(name)!;
  };
  // Created last to first, so the newest-first lists show them in the demo's order.
  for (const [i, seed] of [...kit.products].reverse().entries()) {
    const priceCents = money(seed.priceCents);
    const sale = seed.salePriceCents === null ? null : money(seed.salePriceCents);
    const main = kitMainOf(kit, seed.sub);
    const input = {
      appId: app.id,
      name: seed.name,
      description: seed.description,
      priceCents,
      salePriceCents: sale !== null && sale < priceCents ? sale : null,
      categoryIds: main.name === seed.sub ? [categoryIds.get(main.name)!] : [categoryIds.get(main.name)!, categoryIds.get(seed.sub)!],
      imageAssetIds: await Promise.all(seed.photos.map(photo)),
      stock: seed.stock ?? null,
      digital: false,
      featured: seed.featured,
      active: true,
      sku: deps.sample ? null : seed.sku,
      variants: kitVariants(seed, kit.products.indexOf(seed)),
      optionGroups: null,
      dimensions: seed.dimensions ?? null,
      makeDays: seed.makeDays ?? null,
      addon: Boolean(seed.addon),
      addonFor: seed.addon && seed.addon.categories.length ? { offerWith: "categories" as const, categoryIds: seed.addon.categories.map((c) => categoryIds.get(c)!).filter(Boolean), productIds: [] } : null,
      ...marked,
    };
    if (deps.sample) {
      await store.createCatalogProduct(input, new Date(now.getTime() - (kit.products.length - 1 - i) * 60_000));
      continue;
    }
    const found = products.find((x) => x.sku === seed.sku);
    // A refresh leaves alone a product already as the demo has it.
    if (found && !unchanged(found, input)) await store.updateCatalogProduct(app.id, found.id, input, now);
    if (!found) await store.createCatalogProduct(input, now);
  }
  if (deps.sample) return;
  const skus = new Set(kit.products.map((x) => x.sku));
  for (const x of products) if (!x.sku || !skus.has(x.sku)) await store.deleteCatalogProduct(app.id, x.id);
}

/** 210 A kit's commerce on its demo: its flash sale (ending in hours) and its code shown in the app. */
export async function demoKitCommerce(deps: EntryDeps, app: App, kit: ShopKit): Promise<void> {
  const { store, now } = deps;
  await refreshKitSale(store, app, now, kit);
  if (!(await store.getCatalogCouponByCode(app.id, kit.coupon.code))) {
    await store.createCatalogCoupon({ appId: app.id, code: kit.coupon.code, kind: "percent", value: kit.coupon.percent, minOrderCents: kit.coupon.minOrderCents, endsAt: null, maxUses: null, active: true, createdAt: now, startsAt: null, public: true });
  }
}

/** 210 A kit's flash sale from now (made again by the daily job, lib/demo/cleanup.ts), its units sold back to the demo's own. */
export async function refreshKitSale(store: DataStore, app: Pick<App, "id">, now: Date, kit: ShopKit): Promise<void> {
  const products = await store.listCatalogProducts(app.id);
  const ids = products.filter((x) => x.sku !== null && kit.flashSale.skus.includes(x.sku)).map((x) => x.id);
  const endsAt = new Date(now.getTime() + kit.flashSale.hours * 3_600_000);
  const sale = (await store.listFlashSales(app.id)).find((f) => f.title === kit.flashSale.title);
  const terms = { productIds: ids, categoryId: null, discount: { kind: "percent" as const, percent: kit.flashSale.percent }, startsAt: now, endsAt, limit: kit.flashSale.limit, platformCode: null, active: true, titles: { ...kit.flashSale.titles } };
  const made = sale ?? (await store.createFlashSale({ appId: app.id, title: kit.flashSale.title, ...terms, createdAt: now, updatedAt: now }));
  await store.updateFlashSale(app.id, made.id, { ...terms, sold: kit.flashSale.sold, updatedAt: now });
}

/** 210 The demo app's catalog settings: its currency, shipping and the rest of its commerce. */
export function kitCatalogSettings(kit: ShopKit): CatalogSettings {
  return { ...structuredClone(kit.commerce), currency: kit.currency, shippingCents: kit.shippingCents, freeShippingOverCents: kit.freeShippingOverCents, payment: null };
}

/**
 * 210 A project started from a kit's look (its template, or the demo on
 * /start) gets the demo's delivery days and slots, card message and the
 * rest of its commerce with its samples; what the shop set itself it keeps.
 */
export async function kitPartsForSamples(deps: Pick<EntryDeps, "store" | "now">, app: App, kit: ShopKit): Promise<void> {
  const own = catalogSettings(app);
  const patch: Partial<CatalogSettings> = {};
  for (const [key, value] of Object.entries(kit.commerce) as [keyof CatalogSettings, unknown][]) {
    if (own[key] === undefined || own[key] === null) (patch as Record<string, unknown>)[key] = structuredClone(value);
  }
  if (!Object.keys(patch).length) return;
  await deps.store.updateApp(app.id, { catalogSettings: { ...own, ...patch } }, deps.now);
}
