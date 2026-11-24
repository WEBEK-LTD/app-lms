import { MOBILES_PRODUCT_NAMES, namedTranslations } from "./product-names";
import { catalogSettings } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App, TechSettings } from "../data/types";
import { unchanged } from "./rows";
import { priceFor, type EntryDeps } from "./entries";
import { MOBILES_ACCESSORIES, MOBILES_CATEGORIES, MOBILES_COUPON, MOBILES_CURRENCY, MOBILES_FLASH_SALE, MOBILES_PRODUCTS, MOBILES_TRADE_IN, mobilesMainOf, mobilesVariants } from "./mobiles";
import type { MobilesPhotoName } from "./shop-photos";

/**
 * 211 Nova's entries (lib/demo/mobiles.ts): its main categories and their
 * sub-categories by name (each named in Arabic and Turkish too), its
 * devices by SKU in their sub-category and its main category, their photos
 * the platform's, their storages, colours and warranties with the stock of
 * each, and their specs. The demo's are updated in place and what is no
 * longer in the demo is removed; an app started from the demo gets them as
 * samples, only added (lib/samples/demo.ts).
 */
export async function demoMobilesProducts(deps: EntryDeps, app: App): Promise<void> {
  const { store, now } = deps;
  const marked = deps.sample ? { sample: true as const } : {};
  const currency = catalogSettings(app).currency;
  const money = (cents: number) => priceFor(deps, cents, MOBILES_CURRENCY, currency);
  const categories = await store.listCatalogCategories(app.id);
  const categoryIds = new Map<string, number>();
  const wanted = new Set<string>();
  for (const main of MOBILES_CATEGORIES) {
    wanted.add(main.name);
    const found = categories.find((c) => c.name === main.name && !c.parentId);
    const mainId = found ? found.id : (await store.createCatalogCategory({ appId: app.id, name: main.name, names: { ...main.names }, now, ...marked })).id;
    categoryIds.set(main.name, mainId);
    for (const sub of main.subs) {
      // A sub-category may share its main one's name ("Smart watches"): told apart by its parent.
      const key = `${main.name}/${sub.name}`;
      wanted.add(key);
      const had = categories.find((c) => c.name === sub.name && c.parentId === mainId) ?? categories.find((c) => c.name === sub.name && c.id !== mainId && !MOBILES_CATEGORIES.some((m) => m.name === c.name));
      const subId = had ? had.id : (await store.createCatalogCategory({ appId: app.id, name: sub.name, names: { ...sub.names }, parentId: mainId, now, ...marked })).id;
      if (had && had.parentId !== mainId) await store.setCatalogCategoryParent(app.id, had.id, mainId);
      categoryIds.set(key, subId);
    }
  }
  if (!deps.sample) {
    const keep = new Set(categoryIds.values());
    for (const c of await store.listCatalogCategories(app.id)) if (!keep.has(c.id)) await store.deleteCatalogCategory(app.id, c.id, now);
  }
  const products = await store.listCatalogProducts(app.id);
  // Each photo saved once, however many devices show it.
  const photos = new Map<string, Promise<string>>();
  const photo = (name: MobilesPhotoName) => {
    if (!photos.has(name)) photos.set(name, deps.picture(`mb-${name}`, "product"));
    return photos.get(name)!;
  };
  // Created last to first, so the newest-first lists show them in the demo's order.
  for (const [i, seed] of [...MOBILES_PRODUCTS].reverse().entries()) {
    const priceCents = money(seed.priceCents);
    const sale = seed.salePriceCents === null ? null : money(seed.salePriceCents);
    const main = mobilesMainOf(seed.sub);
    const variants = mobilesVariants(seed, MOBILES_PRODUCTS.indexOf(seed));
    const input = {
      appId: app.id,
      name: seed.name,
      description: seed.description,
      priceCents,
      salePriceCents: sale !== null && sale < priceCents ? sale : null,
      categoryIds: [categoryIds.get(main.name)!, categoryIds.get(`${main.name}/${seed.sub}`)!],
      imageAssetIds: await Promise.all(seed.photos.map(photo)),
      stock: variants ? null : 4 + (i % 9),
      digital: false,
      featured: seed.featured,
      active: true,
      sku: deps.sample ? null : seed.sku,
      // Its storages, colours and warranty, each with its own stock; each storage its own price.
      variants: variants ? { ...variants, items: variants.items.map((v) => ({ ...v, priceCents: v.priceCents === null ? null : money(v.priceCents) })) } : null,
      optionGroups: null,
      addon: false,
      addonFor: null,
      specs: seed.specs.map((s) => ({ ...s })),
      // 226 Its name in Arabic and Turkish too.
      translations: namedTranslations(MOBILES_PRODUCT_NAMES, seed.sku, { variants, specs: seed.specs }),
      ...marked,
    };
    if (deps.sample) {
      await store.createCatalogProduct(input, new Date(now.getTime() - (MOBILES_PRODUCTS.length - 1 - i) * 60_000));
      continue;
    }
    const found = products.find((x) => x.sku === seed.sku);
    // A refresh leaves alone a product already as the demo has it.
    if (found && !unchanged(found, input)) await store.updateCatalogProduct(app.id, found.id, input, now);
    if (!found) await store.createCatalogProduct(input, now);
  }
  if (deps.sample) return;
  const skus = new Set(MOBILES_PRODUCTS.map((x) => x.sku));
  for (const x of products) if (!x.sku || !skus.has(x.sku)) await store.deleteCatalogProduct(app.id, x.id);
}

/** 211 Nova's tech parts: its accessories' category (the shop's own id) and trade-in. */
async function mobilesTech(store: DataStore, app: Pick<App, "id">): Promise<TechSettings> {
  const accessories = (await store.listCatalogCategories(app.id)).find((c) => c.name === MOBILES_ACCESSORIES && !c.parentId);
  return { accessoriesCategoryId: accessories?.id ?? null, tradeIn: structuredClone(MOBILES_TRADE_IN), pcBuilder: null };
}

/** 211 Nova's commerce on the demo: the deal of the day, its code shown in the app, matching accessories and trade-in. */
export async function demoMobilesCommerce(deps: EntryDeps, app: App): Promise<void> {
  const { store, now } = deps;
  await refreshMobilesSale(store, app, now);
  if (!(await store.getCatalogCouponByCode(app.id, MOBILES_COUPON.code))) {
    await store.createCatalogCoupon({ appId: app.id, code: MOBILES_COUPON.code, kind: "percent", value: MOBILES_COUPON.percent, minOrderCents: MOBILES_COUPON.minOrderCents, endsAt: null, maxUses: null, active: true, createdAt: now, startsAt: null, public: true });
  }
  const fresh = (await store.getAppById(app.id)) ?? app;
  await store.updateApp(app.id, { catalogSettings: { ...catalogSettings(fresh), tech: await mobilesTech(store, app) } }, now);
}

/** 211 Nova's deal of the day from now, for a little over a day (made again by the daily job, lib/demo/cleanup.ts), its units sold back to the demo's own. */
export async function refreshMobilesSale(store: DataStore, app: Pick<App, "id">, now: Date): Promise<void> {
  const products = await store.listCatalogProducts(app.id);
  const ids = products.filter((x) => x.sku !== null && (MOBILES_FLASH_SALE.skus as readonly string[]).includes(x.sku)).map((x) => x.id);
  const endsAt = new Date(now.getTime() + MOBILES_FLASH_SALE.hours * 3_600_000);
  const sale = (await store.listFlashSales(app.id)).find((f) => f.title === MOBILES_FLASH_SALE.title);
  const terms = { productIds: ids, categoryId: null, discount: { kind: "percent" as const, percent: MOBILES_FLASH_SALE.percent }, startsAt: now, endsAt, limit: MOBILES_FLASH_SALE.limit, platformCode: null, active: true, titles: { ...MOBILES_FLASH_SALE.titles } };
  const made = sale ?? (await store.createFlashSale({ appId: app.id, title: MOBILES_FLASH_SALE.title, ...terms, createdAt: now, updatedAt: now }));
  await store.updateFlashSale(app.id, made.id, { ...terms, sold: MOBILES_FLASH_SALE.sold, updatedAt: now });
}

/**
 * 211 A project started from Nova (its template, or the demo on /start)
 * gets the demo's trade-in and matching accessories with its samples, as
 * its looks show them; a shop with its own keeps them.
 */
export async function mobilesPartsForSamples(deps: Pick<EntryDeps, "store" | "now">, app: App): Promise<void> {
  if (app.catalogSettings?.tech) return;
  const fresh = (await deps.store.getAppById(app.id)) ?? app;
  await deps.store.updateApp(app.id, { catalogSettings: { ...catalogSettings(fresh), tech: await mobilesTech(deps.store, app) } }, deps.now);
}
