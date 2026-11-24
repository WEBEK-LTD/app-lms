import { catalogSettings } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { CLOTHES_PRODUCT_NAMES, namedTranslations } from "./product-names";
import { unchanged } from "./rows";
import { priceFor, type EntryDeps } from "./entries";
import { CLOTHES_CATEGORIES, CLOTHES_COMMERCE, CLOTHES_COUPON, CLOTHES_CURRENCY, CLOTHES_FLASH_SALE, CLOTHES_PRODUCTS, clothesMainOf, clothesVariants } from "./clothes";
import type { ClothesPhotoName } from "./shop-photos";

/**
 * 208 Lujain's entries (lib/demo/clothes.ts): its main categories and
 * their sub-categories by name (each named in Arabic and Turkish too), its
 * pieces by SKU in their sub-category and its main category, their photos
 * the platform's, their sizes and colours with the stock of each. The
 * demo's are updated in place and what is no longer in the demo is removed;
 * an app started from the demo gets them as samples, only added (lib/samples/demo.ts).
 */
export async function demoClothesProducts(deps: EntryDeps, app: App): Promise<void> {
  const { store, now } = deps;
  const marked = deps.sample ? { sample: true as const } : {};
  const currency = catalogSettings(app).currency;
  const money = (cents: number) => priceFor(deps, cents, CLOTHES_CURRENCY, currency);
  const categories = await store.listCatalogCategories(app.id);
  const categoryIds = new Map<string, number>();
  const wanted = new Set<string>();
  for (const main of CLOTHES_CATEGORIES) {
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
  // Each photo saved once, however many pieces show it.
  const photos = new Map<string, Promise<string>>();
  const photo = (name: ClothesPhotoName) => {
    if (!photos.has(name)) photos.set(name, deps.picture(`cl-${name}`, "product"));
    return photos.get(name)!;
  };
  // Created last to first, so the newest-first lists show them in the demo's order.
  for (const [i, seed] of [...CLOTHES_PRODUCTS].reverse().entries()) {
    const priceCents = money(seed.priceCents);
    const sale = seed.salePriceCents === null ? null : money(seed.salePriceCents);
    const input = {
      appId: app.id,
      name: seed.name,
      description: seed.description,
      priceCents,
      salePriceCents: sale !== null && sale < priceCents ? sale : null,
      categoryIds: [categoryIds.get(clothesMainOf(seed.sub).name)!, categoryIds.get(seed.sub)!],
      imageAssetIds: await Promise.all(seed.photos.map(photo)),
      stock: null,
      digital: false,
      featured: seed.featured,
      active: true,
      sku: deps.sample ? null : seed.sku,
      // Its sizes and colours, each with its own stock.
      variants: clothesVariants(seed, CLOTHES_PRODUCTS.indexOf(seed)),
      optionGroups: null,
      addon: false,
      addonFor: null,
      // 223 Its name in Arabic and Turkish too.
      translations: namedTranslations(CLOTHES_PRODUCT_NAMES, seed.sku),
      ...marked,
    };
    if (deps.sample) {
      await store.createCatalogProduct(input, new Date(now.getTime() - (CLOTHES_PRODUCTS.length - 1 - i) * 60_000));
      continue;
    }
    const found = products.find((x) => x.sku === seed.sku);
    // A refresh leaves alone a product already as the demo has it.
    if (found && !unchanged(found, input)) await store.updateCatalogProduct(app.id, found.id, input, now);
    if (!found) await store.createCatalogProduct(input, now);
  }
  if (deps.sample) return;
  const skus = new Set(CLOTHES_PRODUCTS.map((x) => x.sku));
  for (const x of products) if (!x.sku || !skus.has(x.sku)) await store.deleteCatalogProduct(app.id, x.id);
}

/** 208 Lujain's commerce on the demo: the deal of the day (a few pieces a share off, ending in hours) and its code shown in the app. */
export async function demoClothesCommerce(deps: EntryDeps, app: App): Promise<void> {
  const { store, now } = deps;
  await refreshClothesSale(store, app, now);
  if (!(await store.getCatalogCouponByCode(app.id, CLOTHES_COUPON.code))) {
    await store.createCatalogCoupon({ appId: app.id, code: CLOTHES_COUPON.code, kind: "percent", value: CLOTHES_COUPON.percent, minOrderCents: CLOTHES_COUPON.minOrderCents, endsAt: null, maxUses: null, active: true, createdAt: now, startsAt: null, public: true });
  }
}

/** 208 Lujain's deal of the day from now, for a little over a day (made again by the daily job, lib/demo/cleanup.ts), its units sold back to the demo's own. */
export async function refreshClothesSale(store: DataStore, app: Pick<App, "id">, now: Date): Promise<void> {
  const products = await store.listCatalogProducts(app.id);
  const ids = products.filter((x) => x.sku !== null && (CLOTHES_FLASH_SALE.skus as readonly string[]).includes(x.sku)).map((x) => x.id);
  const endsAt = new Date(now.getTime() + CLOTHES_FLASH_SALE.hours * 3_600_000);
  const sale = (await store.listFlashSales(app.id)).find((f) => f.title === CLOTHES_FLASH_SALE.title);
  const terms = { productIds: ids, categoryId: null, discount: { kind: "percent" as const, percent: CLOTHES_FLASH_SALE.percent }, startsAt: now, endsAt, limit: CLOTHES_FLASH_SALE.limit, platformCode: null, active: true, titles: { ...CLOTHES_FLASH_SALE.titles } };
  const made = sale ?? (await store.createFlashSale({ appId: app.id, title: CLOTHES_FLASH_SALE.title, ...terms, createdAt: now, updatedAt: now }));
  await store.updateFlashSale(app.id, made.id, { ...terms, sold: CLOTHES_FLASH_SALE.sold, updatedAt: now });
}

/**
 * 208 A project started from Lujain (its template, or the demo on /start)
 * gets the demo's size chart and "Complete the look" with its samples, as
 * its size guide page and products show them; a shop with its own keeps them.
 */
export async function clothesPartsForSamples(deps: Pick<EntryDeps, "store" | "now">, app: App): Promise<void> {
  if (app.catalogSettings?.fashion) return;
  await deps.store.updateApp(app.id, { catalogSettings: { ...catalogSettings(app), fashion: structuredClone(CLOTHES_COMMERCE.fashion) } }, deps.now);
}
