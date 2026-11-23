import { catalogSettings } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { unchanged } from "./rows";
import { priceFor, type EntryDeps } from "./entries";
import { KIDS_ADDON_CATEGORY, KIDS_CATEGORIES, KIDS_COMMERCE, KIDS_COUPON, KIDS_CURRENCY, KIDS_FLASH_SALE, KIDS_GIFTS_CATEGORY, KIDS_PRODUCTS, kidsCategoriesOf, kidsDetails, kidsVariants } from "./kids";
import type { KidsPhotoName } from "./shop-photos";

/**
 * 209 Toota's entries (lib/demo/kids.ts): its main categories and their
 * sub-categories by name (each named in Arabic and Turkish too) and the
 * add-ons' own category, its pieces by SKU in their sub-category and its
 * main category (a set in a second pair too), their photos the platform's,
 * their sizes by age and colours with the stock of each, what their pages
 * tell (facts, materials, care, what is in the box, badges, ages,
 * swatches), and the gift wrapping and the card as add-ons offered with
 * the newborn gifts. The demo's are updated in place and what is no longer
 * in the demo is removed; an app started from the demo gets them as
 * samples, only added (lib/samples/demo.ts).
 */
export async function demoKidsProducts(deps: EntryDeps, app: App): Promise<void> {
  const { store, now } = deps;
  const marked = deps.sample ? { sample: true as const } : {};
  const currency = catalogSettings(app).currency;
  const money = (cents: number) => priceFor(deps, cents, KIDS_CURRENCY, currency);
  const categories = await store.listCatalogCategories(app.id);
  const categoryIds = new Map<string, number>();
  const wanted = new Set<string>();
  for (const main of [...KIDS_CATEGORIES, { ...KIDS_ADDON_CATEGORY, subs: [] }]) {
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
  const photo = (name: KidsPhotoName) => {
    if (!photos.has(name)) photos.set(name, deps.picture(`kd-${name}`, "product"));
    return photos.get(name)!;
  };
  // Created last to first, so the newest-first lists show them in the demo's order.
  for (const [i, seed] of [...KIDS_PRODUCTS].reverse().entries()) {
    const priceCents = money(seed.priceCents);
    const sale = seed.salePriceCents === null ? null : money(seed.salePriceCents);
    const input = {
      appId: app.id,
      name: seed.name,
      description: seed.description,
      priceCents,
      salePriceCents: sale !== null && sale < priceCents ? sale : null,
      categoryIds: kidsCategoriesOf(seed).map((name) => categoryIds.get(name)!),
      imageAssetIds: await Promise.all(seed.photos.map(photo)),
      stock: null,
      digital: false,
      featured: seed.featured,
      active: true,
      sku: deps.sample ? null : seed.sku,
      // Its sizes by age and colours, each with its own stock.
      variants: kidsVariants(seed, KIDS_PRODUCTS.indexOf(seed)),
      optionGroups: null,
      // The gift wrapping and the card: add-ons offered with the newborn gifts.
      addon: seed.addon === true,
      addonFor: seed.addon ? { offerWith: "categories" as const, categoryIds: [categoryIds.get(KIDS_GIFTS_CATEGORY)!], productIds: [] } : null,
      details: kidsDetails(seed),
      ...marked,
    };
    if (deps.sample) {
      await store.createCatalogProduct(input, new Date(now.getTime() - (KIDS_PRODUCTS.length - 1 - i) * 60_000));
      continue;
    }
    const found = products.find((x) => x.sku === seed.sku);
    // A refresh leaves alone a product already as the demo has it.
    if (found && !unchanged(found, input)) await store.updateCatalogProduct(app.id, found.id, input, now);
    if (!found) await store.createCatalogProduct(input, now);
  }
  if (deps.sample) return;
  const skus = new Set(KIDS_PRODUCTS.map((x) => x.sku));
  for (const x of products) if (!x.sku || !skus.has(x.sku)) await store.deleteCatalogProduct(app.id, x.id);
}

/** 209 Toota's commerce on the demo: the weekend's deals (a few pieces a share off, ending in hours) and its code shown in the app. */
export async function demoKidsCommerce(deps: EntryDeps, app: App): Promise<void> {
  const { store, now } = deps;
  await refreshKidsSale(store, app, now);
  if (!(await store.getCatalogCouponByCode(app.id, KIDS_COUPON.code))) {
    await store.createCatalogCoupon({ appId: app.id, code: KIDS_COUPON.code, kind: "percent", value: KIDS_COUPON.percent, minOrderCents: KIDS_COUPON.minOrderCents, endsAt: null, maxUses: null, active: true, createdAt: now, startsAt: null, public: true });
  }
}

/** 209 Toota's weekend deals from now, for a little over a day (made again by the daily job, lib/demo/cleanup.ts), its units sold back to the demo's own. */
export async function refreshKidsSale(store: DataStore, app: Pick<App, "id">, now: Date): Promise<void> {
  const products = await store.listCatalogProducts(app.id);
  const ids = products.filter((x) => x.sku !== null && (KIDS_FLASH_SALE.skus as readonly string[]).includes(x.sku)).map((x) => x.id);
  const endsAt = new Date(now.getTime() + KIDS_FLASH_SALE.hours * 3_600_000);
  const sale = (await store.listFlashSales(app.id)).find((f) => f.title === KIDS_FLASH_SALE.title);
  const terms = { productIds: ids, categoryId: null, discount: { kind: "percent" as const, percent: KIDS_FLASH_SALE.percent }, startsAt: now, endsAt, limit: KIDS_FLASH_SALE.limit, platformCode: null, active: true, titles: { ...KIDS_FLASH_SALE.titles } };
  const made = sale ?? (await store.createFlashSale({ appId: app.id, title: KIDS_FLASH_SALE.title, ...terms, createdAt: now, updatedAt: now }));
  await store.updateFlashSale(app.id, made.id, { ...terms, sold: KIDS_FLASH_SALE.sold, updatedAt: now });
}

/**
 * 209 A project started from Toota (its template, or the demo on /start)
 * gets the demo's size chart by age, "Complete the look" and the card's
 * message at checkout with its samples, as its size guide page, its size
 * finder and its gifts show them; a shop with its own keeps them.
 */
export async function kidsPartsForSamples(deps: Pick<EntryDeps, "store" | "now">, app: App): Promise<void> {
  const settings = catalogSettings(app);
  const patch = { ...(app.catalogSettings?.fashion ? {} : { fashion: structuredClone(KIDS_COMMERCE.fashion) }), ...(app.catalogSettings?.gifts ? {} : { gifts: structuredClone(KIDS_COMMERCE.gifts) }) };
  if (!Object.keys(patch).length) return;
  await deps.store.updateApp(app.id, { catalogSettings: { ...settings, ...patch } }, deps.now);
}
