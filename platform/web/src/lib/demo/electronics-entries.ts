import { catalogSettings } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App, TechSettings } from "../data/types";
import { unchanged } from "./rows";
import { ELECTRONICS_PRODUCT_NAMES, namedTranslations } from "./product-names";
import { priceFor, type EntryDeps } from "./entries";
import { ELECTRONICS_ACCESSORIES, ELECTRONICS_CATEGORIES, ELECTRONICS_COUPON, ELECTRONICS_CURRENCY, ELECTRONICS_FLASH_SALE, ELECTRONICS_PRODUCTS, ELECTRONICS_TRADE_IN, electronicsCover, electronicsMainOf, electronicsVariants } from "./electronics";
import type { ElectronicsPhotoName } from "./shop-photos";

/**
 * 211 Madar's entries (lib/demo/electronics.ts): its main categories and
 * their sub-categories by name (each named in Arabic and Turkish too), its
 * products by SKU with their specifications, their colours and storages
 * (each its price and stock) and their cover to add, their photos the
 * platform's. The demo's are updated in place and what is no longer in the
 * demo is removed; an app started from the demo gets them as samples, only
 * added (lib/samples/demo.ts). Then its tech settings: the accessories'
 * category (by its id) and trade-in.
 */
export async function demoElectronicsProducts(deps: EntryDeps, app: App): Promise<void> {
  const { store, now } = deps;
  const marked = deps.sample ? { sample: true as const } : {};
  const currency = catalogSettings(app).currency;
  const money = (cents: number) => priceFor(deps, cents, ELECTRONICS_CURRENCY, currency);
  const categories = await store.listCatalogCategories(app.id);
  const categoryIds = new Map<string, number>();
  const wanted = new Set<string>();
  for (const main of ELECTRONICS_CATEGORIES) {
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
  // Each photo saved once, however many products show it.
  const photos = new Map<string, Promise<string>>();
  const photo = (name: ElectronicsPhotoName) => {
    if (!photos.has(name)) photos.set(name, deps.picture(`el-${name}`, "product"));
    return photos.get(name)!;
  };
  // Created last to first, so the newest-first lists show them in the demo's order.
  for (const [i, seed] of [...ELECTRONICS_PRODUCTS].reverse().entries()) {
    const priceCents = money(seed.priceCents);
    const sale = seed.salePriceCents === null ? null : money(seed.salePriceCents);
    const input = {
      appId: app.id,
      name: seed.name,
      description: seed.description,
      priceCents,
      salePriceCents: sale !== null && sale < priceCents ? sale : null,
      categoryIds: [categoryIds.get(electronicsMainOf(seed.sub).name)!, categoryIds.get(seed.sub)!],
      imageAssetIds: await Promise.all(seed.photos.map(photo)),
      stock: null,
      digital: false,
      featured: seed.featured,
      active: true,
      sku: deps.sample ? null : seed.sku,
      // Its specifications, keyed: the app's table, the compare sheet and the filters.
      specs: seed.specs.map((s) => ({ ...s })),
      // Its colours and storages, each with its own price and stock.
      variants: electronicsVariants(seed, ELECTRONICS_PRODUCTS.indexOf(seed), money),
      // More cover to add for the phones and laptops.
      optionGroups: seed.cover ? electronicsCover(money) : null,
      addon: false,
      addonFor: null,
      // 227 Its name in Arabic and Turkish too.
      translations: namedTranslations(ELECTRONICS_PRODUCT_NAMES, seed.sku, { variants: electronicsVariants(seed, ELECTRONICS_PRODUCTS.indexOf(seed), money), optionGroups: seed.cover ? electronicsCover(money) : null, specs: seed.specs }),
      ...marked,
    };
    if (deps.sample) {
      await store.createCatalogProduct(input, new Date(now.getTime() - (ELECTRONICS_PRODUCTS.length - 1 - i) * 60_000));
      continue;
    }
    const found = products.find((x) => x.sku === seed.sku);
    // A refresh leaves alone a product already as the demo has it.
    if (found && !unchanged(found, input)) await store.updateCatalogProduct(app.id, found.id, input, now);
    if (!found) await store.createCatalogProduct(input, now);
  }
  if (!deps.sample) {
    const skus = new Set(ELECTRONICS_PRODUCTS.map((x) => x.sku));
    for (const x of products) if (!x.sku || !skus.has(x.sku)) await store.deleteCatalogProduct(app.id, x.id);
  }
  await electronicsTech(store, app, categoryIds.get(ELECTRONICS_ACCESSORIES) ?? null, now);
}

/** The shop's tech settings: its accessories' category and trade-in (a shop that set its own keeps them). */
async function electronicsTech(store: DataStore, app: App, accessoriesCategoryId: number | null, now: Date): Promise<void> {
  const fresh = (await store.getAppById(app.id)) ?? app;
  const had = fresh.catalogSettings?.tech;
  const tech: TechSettings = { accessoriesCategoryId: had?.accessoriesCategoryId ?? accessoriesCategoryId, tradeIn: had?.tradeIn ?? structuredClone(ELECTRONICS_TRADE_IN), pcBuilder: had?.pcBuilder ?? null };
  if (had && had.accessoriesCategoryId === tech.accessoriesCategoryId && had.tradeIn) return;
  await store.updateApp(app.id, { catalogSettings: { ...catalogSettings(fresh), tech } }, now);
}

/** 211 Madar's commerce on the demo: the deal of the day (a few products a share off, ending in hours) and its code shown in the app. */
export async function demoElectronicsCommerce(deps: EntryDeps, app: App): Promise<void> {
  const { store, now } = deps;
  await refreshElectronicsSale(store, app, now);
  if (!(await store.getCatalogCouponByCode(app.id, ELECTRONICS_COUPON.code))) {
    await store.createCatalogCoupon({ appId: app.id, code: ELECTRONICS_COUPON.code, kind: "percent", value: ELECTRONICS_COUPON.percent, minOrderCents: ELECTRONICS_COUPON.minOrderCents, endsAt: null, maxUses: null, active: true, createdAt: now, startsAt: null, public: true });
  }
}

/** 211 Madar's deal of the day from now, for a little over a day (made again by the daily job, lib/demo/cleanup.ts), its units sold back to the demo's own. */
export async function refreshElectronicsSale(store: DataStore, app: Pick<App, "id">, now: Date): Promise<void> {
  const products = await store.listCatalogProducts(app.id);
  const ids = products.filter((x) => x.sku !== null && (ELECTRONICS_FLASH_SALE.skus as readonly string[]).includes(x.sku)).map((x) => x.id);
  const endsAt = new Date(now.getTime() + ELECTRONICS_FLASH_SALE.hours * 3_600_000);
  const sale = (await store.listFlashSales(app.id)).find((f) => f.title === ELECTRONICS_FLASH_SALE.title);
  const terms = { productIds: ids, categoryId: null, discount: { kind: "percent" as const, percent: ELECTRONICS_FLASH_SALE.percent }, startsAt: now, endsAt, limit: ELECTRONICS_FLASH_SALE.limit, platformCode: null, active: true, titles: { ...ELECTRONICS_FLASH_SALE.titles } };
  const made = sale ?? (await store.createFlashSale({ appId: app.id, title: ELECTRONICS_FLASH_SALE.title, ...terms, createdAt: now, updatedAt: now }));
  await store.updateFlashSale(app.id, made.id, { ...terms, sold: ELECTRONICS_FLASH_SALE.sold, updatedAt: now });
}

/**
 * 211 A project started from Madar (its template, or the demo on /start)
 * gets the demo's trade-in with its samples (its accessories' category is
 * set by `demoElectronicsProducts`); a shop with its own keeps it.
 */
export async function electronicsPartsForSamples(deps: Pick<EntryDeps, "store" | "now">, app: App): Promise<void> {
  const fresh = (await deps.store.getAppById(app.id)) ?? app;
  if (fresh.catalogSettings?.tech?.tradeIn) return;
  const had = fresh.catalogSettings?.tech;
  await deps.store.updateApp(app.id, { catalogSettings: { ...catalogSettings(fresh), tech: { accessoriesCategoryId: had?.accessoriesCategoryId ?? null, tradeIn: structuredClone(ELECTRONICS_TRADE_IN), pcBuilder: had?.pcBuilder ?? null } } }, deps.now);
}
