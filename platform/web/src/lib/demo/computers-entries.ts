import { catalogSettings } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App, CatalogVariants, TechSettings } from "../data/types";
import { unchanged } from "./rows";
import { COMPUTERS_PRODUCT_NAMES, namedTranslations } from "./product-names";
import { priceFor, type EntryDeps } from "./entries";
import { COMPUTERS_ACCESSORIES, COMPUTERS_CATEGORIES, COMPUTERS_COUPON, COMPUTERS_CURRENCY, COMPUTERS_FLASH_SALE, COMPUTERS_PC_STEPS, COMPUTERS_PRODUCTS, computersMainOf, computersVariants } from "./computers";
import type { ComputersPhotoName } from "./shop-photos";

/**
 * 211 Nawah's entries (lib/demo/computers.ts): its main categories and
 * their sub-categories by name (each named in Arabic and Turkish too), its
 * products by SKU in their sub-category and its main category, their photos
 * the platform's, their specifications and options; then its parts (Build
 * your PC by its categories' IDs, the matching accessories). The demo's are
 * updated in place and what is no longer in the demo is removed; an app
 * started from the demo gets them as samples, only added (lib/samples/demo.ts).
 */
export async function demoComputersProducts(deps: EntryDeps, app: App): Promise<void> {
  const { store, now } = deps;
  const marked = deps.sample ? { sample: true as const } : {};
  const currency = catalogSettings(app).currency;
  const money = (cents: number) => priceFor(deps, cents, COMPUTERS_CURRENCY, currency);
  const categories = await store.listCatalogCategories(app.id);
  const categoryIds = new Map<string, number>();
  const wanted = new Set<string>();
  for (const main of COMPUTERS_CATEGORIES) {
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
  const photo = (name: ComputersPhotoName) => {
    if (!photos.has(name)) photos.set(name, deps.picture(`pc-${name}`, "product"));
    return photos.get(name)!;
  };
  // Created last to first, so the newest-first lists show them in the demo's order.
  for (const [i, seed] of [...COMPUTERS_PRODUCTS].reverse().entries()) {
    const priceCents = money(seed.priceCents);
    const sale = seed.salePriceCents === null ? null : money(seed.salePriceCents);
    const variants = computersVariants(seed);
    const input = {
      appId: app.id,
      name: seed.name,
      description: seed.description,
      priceCents,
      salePriceCents: sale !== null && sale < priceCents ? sale : null,
      categoryIds: [categoryIds.get(computersMainOf(seed.sub).name)!, categoryIds.get(seed.sub)!],
      imageAssetIds: await Promise.all(seed.photos.map(photo)),
      stock: null,
      digital: false,
      featured: seed.featured,
      active: true,
      sku: deps.sample ? null : seed.sku,
      // Its options (memory and storage), each with its price in the shop's currency.
      variants: variants ? ({ ...variants, items: variants.items.map((v) => ({ ...v, priceCents: v.priceCents === null ? null : money(v.priceCents), salePriceCents: v.salePriceCents === null ? null : money(v.salePriceCents) })) } satisfies CatalogVariants) : null,
      optionGroups: null,
      addon: false,
      addonFor: null,
      // Its specifications: the table, the filters, the compare sheet and Build your PC's checks.
      specs: seed.specs.map((s) => ({ ...s })),
      // 227 Its name in Arabic and Turkish too.
      translations: namedTranslations(COMPUTERS_PRODUCT_NAMES, seed.sku, { variants, specs: seed.specs }),
      ...marked,
    };
    if (deps.sample) {
      await store.createCatalogProduct(input, new Date(now.getTime() - (COMPUTERS_PRODUCTS.length - 1 - i) * 60_000));
      continue;
    }
    const found = products.find((x) => x.sku === seed.sku);
    // A refresh leaves alone a product already as the demo has it.
    if (found && !unchanged(found, input)) await store.updateCatalogProduct(app.id, found.id, input, now);
    if (!found) await store.createCatalogProduct(input, now);
  }
  if (!deps.sample) {
    const skus = new Set(COMPUTERS_PRODUCTS.map((x) => x.sku));
    for (const x of products) if (!x.sku || !skus.has(x.sku)) await store.deleteCatalogProduct(app.id, x.id);
  }
  // Build your PC and the matching accessories, by the categories just made.
  await computersPartsFor(deps, app, categoryIds);
}

/** 211 Nawah's tech parts by its categories' IDs: Build your PC (a sub-category for each part) and the matching accessories (keyboards and mice). */
export function computersTech(categoryIds: ReadonlyMap<string, number>): TechSettings {
  return {
    accessoriesCategoryId: categoryIds.get(COMPUTERS_ACCESSORIES) ?? null,
    tradeIn: null,
    pcBuilder: { steps: COMPUTERS_PC_STEPS.filter((s) => categoryIds.has(s.sub)).map((s) => ({ part: s.part, categoryId: categoryIds.get(s.sub)!, required: s.required })) },
  };
}

/**
 * 211 A shop made from Nawah (the demo, its template or the demo on /start)
 * gets its tech parts by its own categories' IDs; a shop with its own keeps them.
 */
async function computersPartsFor(deps: Pick<EntryDeps, "store" | "now" | "sample">, app: App, categoryIds: ReadonlyMap<string, number>): Promise<void> {
  const fresh = (await deps.store.getAppById(app.id)) ?? app;
  if (deps.sample && fresh.catalogSettings?.tech) return;
  await deps.store.updateApp(app.id, { catalogSettings: { ...catalogSettings(fresh), tech: computersTech(categoryIds) } }, deps.now);
}

/** 211 Nawah's commerce on the demo: the hour deals (a few parts a share off, ending in hours) and its code shown in the app. */
export async function demoComputersCommerce(deps: EntryDeps, app: App): Promise<void> {
  const { store, now } = deps;
  await refreshComputersSale(store, app, now);
  if (!(await store.getCatalogCouponByCode(app.id, COMPUTERS_COUPON.code))) {
    await store.createCatalogCoupon({ appId: app.id, code: COMPUTERS_COUPON.code, kind: "percent", value: COMPUTERS_COUPON.percent, minOrderCents: COMPUTERS_COUPON.minOrderCents, endsAt: null, maxUses: null, active: true, createdAt: now, startsAt: null, public: true });
  }
}

/** 211 Nawah's hour deals from now, for a few hours (made again by the daily job, lib/demo/cleanup.ts), its units sold back to the demo's own. */
export async function refreshComputersSale(store: DataStore, app: Pick<App, "id">, now: Date): Promise<void> {
  const products = await store.listCatalogProducts(app.id);
  const ids = products.filter((x) => x.sku !== null && (COMPUTERS_FLASH_SALE.skus as readonly string[]).includes(x.sku)).map((x) => x.id);
  const endsAt = new Date(now.getTime() + COMPUTERS_FLASH_SALE.hours * 3_600_000);
  const sale = (await store.listFlashSales(app.id)).find((f) => f.title === COMPUTERS_FLASH_SALE.title);
  const terms = { productIds: ids, categoryId: null, discount: { kind: "percent" as const, percent: COMPUTERS_FLASH_SALE.percent }, startsAt: now, endsAt, limit: COMPUTERS_FLASH_SALE.limit, platformCode: null, active: true, titles: { ...COMPUTERS_FLASH_SALE.titles } };
  const made = sale ?? (await store.createFlashSale({ appId: app.id, title: COMPUTERS_FLASH_SALE.title, ...terms, createdAt: now, updatedAt: now }));
  await store.updateFlashSale(app.id, made.id, { ...terms, sold: COMPUTERS_FLASH_SALE.sold, updatedAt: now });
}
