import { bookingSetup } from "../bookings/setup";
import { courseSetup } from "../courses/setup";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { deliverySettingsOf } from "../delivery/settings";
import type { SampleList } from "./lists";

/**
 * 110.2 "Remove all samples": a list's sample entries go, with the sample
 * categories nothing else uses and the pictures and files only they used
 * (what the owner kept or reused stays). Entries the owner edited are theirs
 * and stay.
 */

export interface RemoveDeps {
  store: DataStore;
  /** Deletes a saved file (Netlify Blobs, or a folder locally). */
  deleteBlob: (key: string) => Promise<void>;
  now: Date;
}

/** Removes the list's sample entries; returns how many went. */
export async function removeSamples(deps: RemoveDeps, appId: string, list: SampleList): Promise<number> {
  const app = await deps.store.getAppById(appId);
  if (!app) return 0;
  const { removed, assets } = await REMOVERS[list](deps, app);
  if (removed > 0) await deleteUnusedAssets(deps, app, assets);
  return removed;
}

interface Removed {
  removed: number;
  /** The asset IDs the removed entries named. */
  assets: string[];
}

const REMOVERS: Record<SampleList, (deps: RemoveDeps, app: App) => Promise<Removed>> = {
  async teachers({ store, now }, app) {
    const teachers = (await store.listTeachers(app.id)).filter((t) => t.sample);
    for (const t of teachers) await store.deleteTeacher(app.id, t.id);
    // Courses the owner kept lose the sample teacher: they're the academy's own.
    const gone = new Set(teachers.map((t) => t.id));
    const setup = courseSetup(app);
    if (setup.courses.some((c) => c.teacherId && gone.has(c.teacherId))) {
      await store.updateApp(app.id, { courseSetup: { ...setup, courses: setup.courses.map((c) => (c.teacherId && gone.has(c.teacherId) ? { ...c, teacherId: null } : c)) } }, now);
    }
    return { removed: teachers.length, assets: teachers.map((t) => t.photoAssetId).filter((id): id is string => !!id) };
  },

  async courses({ store, now }, app) {
    const setup = courseSetup(app);
    const samples = setup.courses.filter((c) => c.sample);
    if (!samples.length) return { removed: 0, assets: [] };
    const courses = setup.courses.filter((c) => !c.sample);
    const used = new Set(courses.flatMap((c) => c.categoryIds));
    const categories = setup.categories.filter((c) => !c.sample || used.has(c.id));
    await store.updateApp(app.id, { courseSetup: { ...setup, courses, categories } }, now);
    return { removed: samples.length, assets: samples.map((c) => c.imageAssetId).filter((id): id is string => !!id) };
  },

  async products({ store, now }, app) {
    const products = await store.listCatalogProducts(app.id);
    const samples = products.filter((p) => p.sample);
    for (const p of samples) await store.deleteCatalogProduct(app.id, p.id);
    const used = new Set(products.filter((p) => !p.sample).flatMap((p) => p.categoryIds));
    for (const c of await store.listCatalogCategories(app.id)) if (c.sample && !used.has(c.id)) await store.deleteCatalogCategory(app.id, c.id, now);
    return { removed: samples.length, assets: samples.flatMap((p) => p.imageAssetIds) };
  },

  async services({ store, now }, app) {
    const setup = bookingSetup(app);
    const samples = setup.services.filter((s) => s.sample);
    if (!samples.length) return { removed: 0, assets: [] };
    const gone = new Set(samples.map((s) => s.id));
    const services = setup.services.filter((s) => !s.sample);
    const used = new Set(services.map((s) => s.categoryId));
    await store.updateApp(
      app.id,
      {
        bookingSetup: {
          ...setup,
          services,
          categories: setup.categories.filter((c) => !c.sample || used.has(c.id)),
          staff: setup.staff.map((m) => ({ ...m, serviceIds: m.serviceIds.filter((id) => !gone.has(id)) })),
          classTemplates: setup.classTemplates.filter((t) => !gone.has(t.serviceId)),
        },
      },
      now,
    );
    return { removed: samples.length, assets: samples.map((s) => s.imageAssetId).filter((id): id is string => !!id) };
  },

  async staff({ store, now }, app) {
    const setup = bookingSetup(app);
    const samples = setup.staff.filter((m) => m.sample);
    if (!samples.length) return { removed: 0, assets: [] };
    const gone = new Set(samples.map((m) => m.id));
    await store.updateApp(app.id, { bookingSetup: { ...setup, staff: setup.staff.filter((m) => !m.sample), classTemplates: setup.classTemplates.filter((t) => !gone.has(t.staffId)) } }, now);
    return { removed: samples.length, assets: samples.map((m) => m.imageAssetId).filter((id): id is string => !!id) };
  },

  async listings({ store }, app) {
    const samples = (await store.listListings(app.id)).filter((l) => l.sample);
    for (const l of samples) await store.deleteListing(app.id, l.id);
    return { removed: samples.length, assets: samples.flatMap((l) => l.imageAssetIds) };
  },

  async articles({ store }, app) {
    const articles = await store.listArticles(app.id);
    const samples = articles.filter((a) => a.sample);
    for (const a of samples) await store.deleteArticle(app.id, a.id);
    const used = new Set(articles.filter((a) => !a.sample).flatMap((a) => a.categoryIds));
    for (const c of await store.listArticleCategories(app.id)) if (c.sample && !used.has(c.id)) await store.deleteArticleCategory(app.id, c.id);
    return { removed: samples.length, assets: samples.map((a) => a.imageAssetId).filter((id): id is string => !!id) };
  },

  async events({ store }, app) {
    // Their ticket types (and any test tickets) go with them.
    const samples = (await store.listEvents(app.id)).filter((e) => e.sample);
    for (const e of samples) await store.deleteEvent(app.id, e.id);
    return { removed: samples.length, assets: samples.flatMap((e) => e.imageAssetIds) };
  },

  async campaigns({ store }, app) {
    const samples = (await store.listCampaigns(app.id)).filter((c) => c.sample);
    for (const c of samples) await store.deleteCampaign(app.id, c.id);
    return { removed: samples.length, assets: samples.flatMap((c) => c.imageAssetIds) };
  },

  async delivery_services({ store }, app) {
    const samples = (await store.listDeliveryServices(app.id)).filter((s) => s.sample);
    for (const s of samples) await store.deleteDeliveryService(app.id, s.id);
    return { removed: samples.length, assets: samples.map((s) => s.imageAssetId).filter((id): id is string => !!id) };
  },

  async restaurants({ store, now }, app) {
    const restaurants = await store.listRestaurants(app.id);
    const samples = restaurants.filter((r) => r.sample);
    const assets: string[] = [];
    for (const r of samples) {
      const menu = await store.getRestaurantMenu(app.id, r.id);
      for (const dish of menu?.sections.flatMap((s) => s.dishes) ?? []) if (dish.imageAssetId) assets.push(dish.imageAssetId);
      if (r.logoAssetId) assets.push(r.logoAssetId);
      if (r.coverAssetId) assets.push(r.coverAssetId);
      await store.deleteRestaurant(app.id, r.id);
    }
    // The sample cuisines no restaurant left is filed under.
    const settings = deliverySettingsOf(await store.getDeliverySettings(app.id));
    const used = new Set(restaurants.filter((r) => !r.sample).flatMap((r) => r.cuisines));
    const cuisines = (settings.cuisines ?? []).filter((c) => !c.sample || used.has(c.id));
    if (cuisines.length !== (settings.cuisines ?? []).length) await store.saveDeliverySettings(app.id, { ...settings, cuisines }, now);
    return { removed: samples.length, assets };
  },

  async vehicle_types({ store, now }, app) {
    const samples = (await store.listVehicleTypes(app.id)).filter((t) => t.sample);
    for (const t of samples) await store.deleteVehicleType(app.id, t.id, now);
    return { removed: samples.length, assets: samples.map((t) => t.imageAssetId).filter((id): id is string => !!id) };
  },

  async school_news({ store }, app) {
    const samples = (await store.listSchoolAnnouncements(app.id)).filter((a) => a.sample);
    for (const a of samples) await store.deleteSchoolAnnouncement(app.id, a.id);
    return { removed: samples.length, assets: [] };
  },
};

/** The removed entries' files that nothing of the account names any more (its apps' rows and pages, deleted apps' too). */
async function deleteUnusedAssets(deps: RemoveDeps, app: App, candidates: string[]): Promise<void> {
  const ids = new Set(candidates.map((id) => id.toLowerCase()));
  if (!ids.size) return;
  const used = new Set<string>();
  for (const other of await deps.store.listAppsByClientIncludingDeleted(app.clientId)) {
    for (const id of await deps.store.listAppAssetReferences(other.id)) used.add(id.toLowerCase());
  }
  for (const asset of await deps.store.listAssetsByClient(app.clientId)) {
    const id = asset.id.toLowerCase();
    if (!ids.has(id) || used.has(id)) continue;
    await deps.deleteBlob(asset.blobKey);
    await deps.store.deleteAsset(asset.id);
  }
}
