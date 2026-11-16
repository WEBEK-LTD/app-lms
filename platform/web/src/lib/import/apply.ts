import { bookingSetup } from "../bookings/setup";
import { parsePrice } from "../catalog/money";
import { courseSetup } from "../courses/setup";
import type { DataStore } from "../data/store";
import type { App, BookingService, CatalogProduct, CatalogProductInput, Course } from "../data/types";
import { categoryNames, firstImage, isActive, priceText, type ImportItem, type ImportPlan } from "./plan";
import type { WixPicture } from "./wix";

/**
 * 81.4 Saving an import the owner looked at (lib/import/plan.ts). A row
 * updates what it names already (a product by its SKU, else by its name; a
 * service or course by its name), so importing the same file again changes
 * nothing twice; anything else is added. Categories are found by name, or
 * added. Pictures are read from their addresses while there's time
 * (`budgetMs`), for what has none yet; the rest are added by hand. Rows with
 * errors are left out.
 */

export interface ApplyDeps {
  store: DataStore;
  app: App;
  now: Date;
  /** Reads the picture at the address and keeps it as the app's: its asset ID, or null when it can't. */
  savePicture: (url: string) => Promise<string | null>;
  /** Stops reading pictures after this long. */
  budgetMs?: number;
  clock?: () => number;
}

export interface ImportReport {
  added: number;
  updated: number;
  /** Rows with errors, left out. */
  skipped: number;
  pictures: { added: number; missed: number };
}

const key = (text: string) => text.trim().toLowerCase();

export async function applyImport(deps: ApplyDeps, plan: ImportPlan): Promise<ImportReport> {
  const report: ImportReport = { added: 0, updated: 0, skipped: 0, pictures: { added: 0, missed: 0 } };
  if (plan.missing.length) return { ...report, skipped: plan.items.length };
  const items = plan.items.filter((i) => {
    if (i.errors.length) report.skipped++;
    return i.errors.length === 0;
  });
  const clock = deps.clock ?? Date.now;
  const started = clock();
  const picture = async (item: ImportItem): Promise<string | null> => {
    const url = item.values.image ? firstImage(item.values.image) : null;
    if (!url) return null;
    if (deps.budgetMs !== undefined && clock() - started >= deps.budgetMs) {
      report.pictures.missed++;
      return null;
    }
    const id = await deps.savePicture(url).catch(() => null);
    if (id) report.pictures.added++;
    else report.pictures.missed++;
    return id;
  };
  const price = (item: ImportItem) => (item.values.price ? (parsePrice(priceText(item.values.price)) ?? 0) : 0);
  /** A Wix product's pictures after the first `have` (those it has already), read a few at a time while there's time. */
  const wixPictures = async (pictures: WixPicture[], have: number): Promise<string[]> => {
    const wanted = pictures.slice(have);
    const ids: (string | null)[] = new Array(wanted.length).fill(null);
    let next = 0;
    const worker = async () => {
      while (next < wanted.length) {
        const i = next++;
        if (deps.budgetMs !== undefined && clock() - started >= deps.budgetMs) {
          report.pictures.missed++;
          continue;
        }
        const p = wanted[i]!;
        // A picture the shop can't keep as it is (WebP, AVIF, too large) is asked of Wix's media host as a JPEG.
        const id = (await deps.savePicture(p.url).catch(() => null)) ?? (p.jpeg ? await deps.savePicture(p.jpeg).catch(() => null) : null);
        if (id) report.pictures.added++;
        else report.pictures.missed++;
        ids[i] = id;
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, wanted.length) }, worker));
    return ids.filter((id): id is string => id !== null);
  };

  if (plan.kind === "products") {
    const { store, app, now } = deps;
    const products = await store.listCatalogProducts(app.id);
    const bySku = new Map(products.filter((p) => p.sku).map((p) => [key(p.sku!), p]));
    const byName = new Map(products.map((p) => [key(p.name), p]));
    const categories = new Map((await store.listCatalogCategories(app.id)).map((c) => [key(c.name), c.id]));
    const categoryIds = async (item: ImportItem) => {
      const ids: number[] = [];
      for (const name of item.wix ? item.wix.categories : categoryNames(item.values.category ?? "")) {
        let id = categories.get(key(name));
        if (id === undefined) {
          id = (await store.createCatalogCategory({ appId: app.id, name, now })).id;
          categories.set(key(name), id);
        }
        ids.push(id);
      }
      return ids;
    };
    /**
     * Wix: each product of the file is its own (its handle), though two may
     * share a name or a SKU: one is found again by its SKU (a variation's
     * when the product has none), by its name only without any, and never as
     * one this import has already brought (the next one with that SKU or
     * name is, in the file's order, or it is added).
     */
    const wixFound = new Map<string, CatalogProduct[]>();
    const remember = (id: string, product: CatalogProduct) => wixFound.set(id, [...(wixFound.get(id) ?? []), product]);
    // A product's own SKU and its variations' are told apart, so one never stands for the other.
    const wixIds = (p: { sku?: string | null; variants?: CatalogProduct["variants"] }) => [
      ...(p.sku ? [`sku:${key(p.sku)}`] : []),
      ...(p.variants?.items ?? []).filter((x) => x.sku).map((x) => `variant:${key(x.sku!)}`),
    ];
    // In the order they were added: a file's first import gave them its own order.
    for (const p of [...products].sort((a, b) => a.id - b.id)) for (const id of [...wixIds(p), `name:${key(p.name)}`]) remember(id, p);
    const brought = new Set<number>();
    const findWix = (item: ImportItem): CatalogProduct | undefined => {
      const skus = wixIds(item.wix!);
      for (const id of skus.length ? skus : [`name:${key(item.name)}`]) {
        const found = wixFound.get(id)?.find((p) => !brought.has(p.id));
        if (found) return found;
      }
      return undefined;
    };
    for (const item of items) {
      const v = item.values;
      const wix = item.wix;
      const existing = wix ? findWix(item) : ((v.sku ? bySku.get(key(v.sku)) : undefined) ?? byName.get(key(item.name)));
      const salePrice = v.salePrice ? parsePrice(priceText(v.salePrice)) : null;
      const stock = v.stock ? Number(v.stock) : null;
      const fields = {
        name: item.name,
        ...(v.description !== undefined ? { description: v.description } : {}),
        priceCents: price(item),
        ...(v.salePrice !== undefined ? { salePriceCents: salePrice } : {}),
        ...(v.stock !== undefined ? { stock } : {}),
        ...(v.sku ? { sku: v.sku } : {}),
        ...(v.category ? { categoryIds: await categoryIds(item) } : {}),
        ...(v.active !== undefined ? { active: isActive(v.active) } : {}),
        // Wix: its variations, the customer's options and its weight, as the file has them now.
        ...(wix ? { variants: wix.variants, optionGroups: wix.optionGroups, weightGrams: wix.weightGrams, salePriceCents: wix.salePriceCents, stock: wix.stock } : {}),
      } satisfies Partial<CatalogProductInput>;
      if (existing && wix) {
        // The pictures it lacks of the file's (a first import that ran out of time).
        const added = existing.imageAssetIds.length < wix.pictures.length ? await wixPictures(wix.pictures, existing.imageAssetIds.length) : [];
        await store.updateCatalogProduct(app.id, existing.id, { ...fields, ...(added.length ? { imageAssetIds: [...existing.imageAssetIds, ...added] } : {}) }, now);
        brought.add(existing.id);
        report.updated++;
      } else if (existing) {
        const images = existing.imageAssetIds.length ? {} : await picture(item).then((id) => (id ? { imageAssetIds: [id] } : {}));
        await store.updateCatalogProduct(app.id, existing.id, { ...fields, ...images }, now);
        report.updated++;
      } else {
        const imageAssetIds = wix ? await wixPictures(wix.pictures, 0) : await picture(item).then((id) => (id ? [id] : []));
        const created = await store.createCatalogProduct(
          {
            appId: app.id,
            description: "",
            salePriceCents: null,
            categoryIds: [],
            stock: null,
            digital: false,
            featured: false,
            active: true,
            sku: null,
            optionGroups: null,
            ...fields,
            imageAssetIds,
          },
          now,
        );
        if (created.sku) bySku.set(key(created.sku), created);
        byName.set(key(created.name), created);
        if (wix) {
          brought.add(created.id);
          for (const id of [...wixIds(created), `name:${key(created.name)}`]) remember(id, created);
        }
        report.added++;
      }
    }
    return report;
  }

  if (plan.kind === "services") {
    const setup = bookingSetup(deps.app);
    let nextId = setup.nextId;
    const categories = [...setup.categories];
    const services = [...setup.services];
    const categoryId = (item: ImportItem): number | null => {
      const name = categoryNames(item.values.category ?? "")[0];
      if (!name) return null;
      let category = categories.find((c) => key(c.name) === key(name));
      if (!category) {
        category = { id: nextId++, name };
        categories.push(category);
      }
      return category.id;
    };
    for (const item of items) {
      const v = item.values;
      const at = services.findIndex((s) => key(s.name) === key(item.name));
      const fields = {
        name: item.name,
        ...(v.duration ? { durationMinutes: Number(v.duration) } : {}),
        ...(v.price !== undefined ? { priceCents: price(item) } : {}),
        ...(v.description !== undefined ? { description: v.description } : {}),
        ...(v.category ? { categoryId: categoryId(item) } : {}),
        ...(v.active !== undefined ? { active: isActive(v.active) } : {}),
      } satisfies Partial<BookingService>;
      if (at !== -1) {
        const image = services[at]!.imageAssetId ? {} : await picture(item).then((id) => (id ? { imageAssetId: id } : {}));
        services[at] = { ...services[at]!, ...fields, ...image };
        report.updated++;
      } else {
        services.push({ id: nextId++, categoryId: null, description: "", durationMinutes: 60, priceCents: 0, color: null, active: true, ...fields, imageAssetId: await picture(item) });
        report.added++;
      }
    }
    await deps.store.updateApp(deps.app.id, { bookingSetup: { ...setup, categories, services, nextId } }, deps.now);
    return report;
  }

  const setup = courseSetup(deps.app);
  let nextId = setup.nextId;
  const categories = [...setup.categories];
  const courses = [...setup.courses];
  const categoryIds = (item: ImportItem): number[] =>
    categoryNames(item.values.category ?? "").map((name) => {
      let category = categories.find((c) => key(c.name) === key(name));
      if (!category) {
        category = { id: nextId++, name };
        categories.push(category);
      }
      return category.id;
    });
  for (const item of items) {
    const v = item.values;
    const at = courses.findIndex((c) => key(c.title) === key(item.name));
    const fields = {
      title: item.name,
      ...(v.description !== undefined ? { description: v.description } : {}),
      ...(v.price !== undefined ? { priceCents: price(item) } : {}),
      ...(v.category ? { categoryIds: categoryIds(item) } : {}),
      ...(v.instructor !== undefined ? { instructorName: v.instructor || null } : {}),
      ...(v.level !== undefined ? { level: v.level || null } : {}),
      ...(v.active !== undefined ? { active: isActive(v.active) } : {}),
    } satisfies Partial<Course>;
    if (at !== -1) {
      const image = courses[at]!.imageAssetId ? {} : await picture(item).then((id) => (id ? { imageAssetId: id } : {}));
      courses[at] = { ...courses[at]!, ...fields, ...image };
      report.updated++;
    } else {
      // Its topics and lessons are added in the course's page.
      courses.push({
        id: nextId++,
        description: "",
        priceCents: 0,
        categoryIds: [],
        instructorName: null,
        level: null,
        active: true,
        topics: [],
        createdAt: deps.now.toISOString(),
        ...fields,
        imageAssetId: await picture(item),
      });
      report.added++;
    }
  }
  await deps.store.updateApp(deps.app.id, { courseSetup: { ...setup, categories, courses, nextId } }, deps.now);
  return report;
}
