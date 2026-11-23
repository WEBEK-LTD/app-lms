import { catalogSettings } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { unchanged } from "./rows";
import { priceFor, type EntryDeps } from "./entries";
import { TOYS_ADDONS, TOYS_BIRTHDAY, TOYS_BY_AGE, TOYS_CATEGORIES, TOYS_COMMERCE, TOYS_COUPON, TOYS_CURRENCY, TOYS_FLASH_SALE, TOYS_PRODUCTS, toysAgesOf, toysMainOf } from "./toys";
import type { ToysPhotoName } from "./shop-photos";

/**
 * 209 Toot's entries (lib/demo/toys.ts): its main categories and their
 * sub-categories by name (each named in Arabic and Turkish too), its toys
 * by SKU in their type's sub-category and main category, in the ages they
 * are for ("By age" and its ages) and the birthday's favourites, with their
 * age, safety and materials (`details`); the wraps and the card as add-ons
 * offered with every toy; their photos the platform's. The demo's are
 * updated in place and what is no longer in the demo is removed; an app
 * started from the demo gets them as samples, only added (lib/samples/demo.ts).
 */
export async function demoToysProducts(deps: EntryDeps, app: App): Promise<void> {
  const { store, now } = deps;
  const marked = deps.sample ? { sample: true as const } : {};
  const currency = catalogSettings(app).currency;
  const money = (cents: number) => priceFor(deps, cents, TOYS_CURRENCY, currency);
  const categories = await store.listCatalogCategories(app.id);
  const categoryIds = new Map<string, number>();
  const wanted = new Set<string>();
  for (const main of TOYS_CATEGORIES) {
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
  // Each photo saved once, however many toys show it.
  const photos = new Map<string, Promise<string>>();
  const photo = (name: ToysPhotoName) => {
    if (!photos.has(name)) photos.set(name, deps.picture(`ty-${name}`, "product"));
    return photos.get(name)!;
  };
  const id = (name: string) => categoryIds.get(name)!;
  const common = { stock: null, digital: false, active: true, variants: null, optionGroups: null, ...marked };
  // The add-ons first (the oldest), then the toys last to first, so the newest-first lists show them in the demo's order.
  const seeds = [
    ...[...TOYS_ADDONS].reverse().map((a) => ({
      sku: a.sku,
      input: {
        appId: app.id,
        name: a.name,
        description: a.description,
        priceCents: money(a.priceCents),
        salePriceCents: null,
        categoryIds: [],
        imageAssetIds: [a.photo],
        featured: false,
        // Offered with every toy as "Add a little more", never listed on its own.
        addon: true,
        addonFor: null,
        details: null,
      },
    })),
    ...[...TOYS_PRODUCTS].reverse().map((seed) => {
      const main = toysMainOf(seed.sub).name;
      const ages = toysAgesOf(seed.ageMonths);
      const birthday = main === TOYS_BIRTHDAY ? [] : seed.birthday ? [TOYS_BIRTHDAY, "Birthday favourites"] : [];
      const priceCents = money(seed.priceCents);
      const sale = seed.salePriceCents === null ? null : money(seed.salePriceCents);
      return {
        sku: seed.sku,
        input: {
          appId: app.id,
          name: seed.name,
          description: seed.description,
          priceCents,
          salePriceCents: sale !== null && sale < priceCents ? sale : null,
          // Its type's main category and sub-category, the ages it is for, and the birthday's favourites.
          categoryIds: [main, seed.sub, TOYS_BY_AGE, ...ages, ...birthday].map(id),
          imageAssetIds: [...seed.photos],
          featured: seed.featured,
          addon: false,
          addonFor: null,
          // Its age, safety, materials and what it promises, as its page shows them.
          details: structuredClone(seed.details),
        },
      };
    }),
  ];
  for (const [i, { sku, input: seed }] of seeds.entries()) {
    const input = { ...common, ...seed, imageAssetIds: await Promise.all(seed.imageAssetIds.map((n) => photo(n as ToysPhotoName))), sku: deps.sample ? null : sku };
    if (deps.sample) {
      await store.createCatalogProduct(input, new Date(now.getTime() - (seeds.length - 1 - i) * 60_000));
      continue;
    }
    const found = products.find((x) => x.sku === sku);
    // A refresh leaves alone a product already as the demo has it.
    if (found && !unchanged(found, input)) await store.updateCatalogProduct(app.id, found.id, input, now);
    if (!found) await store.createCatalogProduct(input, now);
  }
  if (deps.sample) return;
  const skus = new Set(seeds.map((x) => x.sku));
  for (const x of products) if (!x.sku || !skus.has(x.sku)) await store.deleteCatalogProduct(app.id, x.id);
}

/** 209 Toot's commerce on the demo: the toy of the day (a few toys a share off, ending in hours) and its code shown in the app. */
export async function demoToysCommerce(deps: EntryDeps, app: App): Promise<void> {
  const { store, now } = deps;
  await refreshToysSale(store, app, now);
  if (!(await store.getCatalogCouponByCode(app.id, TOYS_COUPON.code))) {
    await store.createCatalogCoupon({ appId: app.id, code: TOYS_COUPON.code, kind: "percent", value: TOYS_COUPON.percent, minOrderCents: TOYS_COUPON.minOrderCents, endsAt: null, maxUses: null, active: true, createdAt: now, startsAt: null, public: true });
  }
}

/** 209 Toot's toy of the day from now, for a little over a day (made again by the daily job, lib/demo/cleanup.ts), its units sold back to the demo's own. */
export async function refreshToysSale(store: DataStore, app: Pick<App, "id">, now: Date): Promise<void> {
  const products = await store.listCatalogProducts(app.id);
  const ids = products.filter((x) => x.sku !== null && (TOYS_FLASH_SALE.skus as readonly string[]).includes(x.sku)).map((x) => x.id);
  const endsAt = new Date(now.getTime() + TOYS_FLASH_SALE.hours * 3_600_000);
  const sale = (await store.listFlashSales(app.id)).find((f) => f.title === TOYS_FLASH_SALE.title);
  const terms = { productIds: ids, categoryId: null, discount: { kind: "percent" as const, percent: TOYS_FLASH_SALE.percent }, startsAt: now, endsAt, limit: TOYS_FLASH_SALE.limit, platformCode: null, active: true, titles: { ...TOYS_FLASH_SALE.titles } };
  const made = sale ?? (await store.createFlashSale({ appId: app.id, title: TOYS_FLASH_SALE.title, ...terms, createdAt: now, updatedAt: now }));
  await store.updateFlashSale(app.id, made.id, { ...terms, sold: TOYS_FLASH_SALE.sold, updatedAt: now });
}

/**
 * 209 A project started from Toot (its template, or the demo on /start)
 * gets the demo's returns and the birthday card's message at checkout with
 * its samples; a shop with its own gift settings keeps them.
 */
export async function toysPartsForSamples(deps: Pick<EntryDeps, "store" | "now">, app: App): Promise<void> {
  const settings = catalogSettings(app);
  if (app.catalogSettings?.gifts) return;
  await deps.store.updateApp(app.id, { catalogSettings: { ...settings, gifts: structuredClone(TOYS_COMMERCE.gifts), ...(settings.returnDays ? {} : { returnDays: TOYS_COMMERCE.returnDays }) } }, deps.now);
}
