import { randomBytes } from "node:crypto";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, Asset } from "../data/types";
import { extensionOf } from "../media/files";
import type { MediaStorage } from "../media/storage";
import { storageKeyOf } from "../media/signing";
import { isSecretField } from "../admin/audit";
import { APP_TABLES } from "./app-tables";
import { freshAutoScreenshots } from "../app/auto-screenshots";

/**
 * 132.114 Copying an app, into another account or the same one: a new app
 * with the same design, Studio project and pages, content, media,
 * languages and settings, made the way a new app starts. It never takes
 * secrets (payment keys, signing keys, push credentials, API tokens), the
 * app's people (users, customers, members, students and their progress),
 * its orders, bookings, payments and messages, its builds and store
 * listing, or its plan (lib/apps/app-tables.ts). Coupons start unused,
 * counts start at zero. Pictures are copied into the other account, Media
 * library files to the new app's own folder.
 *
 * Every content table has its copier here (COPIERS), written on the data
 * store's own methods, so the copy is the same on the memory store and on
 * MySQL (tests/unit/app-copy-store-suite.ts).
 */

export interface CopyDeps {
  store: DataStore;
  now: Date;
  /** Duplicates an uploaded file (an asset's blob) under a new key; null when it can't be read. */
  copyBlob: ((key: string) => Promise<string | null>) | null;
  /** The Media library's storage; null when media isn't set up (the files aren't copied then). */
  media: MediaStorage | null;
}

export interface CopyTarget {
  clientId: string;
  /** The copy's name (the app's name, at most 60 characters). */
  name: string;
}

export interface CopyResult {
  app: App;
  /** How many rows of each content table were copied. */
  copied: Record<string, number>;
  /** Media files that couldn't be copied (the media server failed), by name. */
  mediaFailed: string[];
}

/** What a copier gets: the two apps, the store, and the ID maps filled as it goes. */
export interface CopyContext {
  store: DataStore;
  now: Date;
  from: App;
  to: App;
  /** Old → new UUIDs: assets, Media files. */
  uuids: Map<string, string>;
  /** Old → new numeric IDs, by table. */
  ids: Record<string, Map<number, number>>;
  copied: Record<string, number>;
  deps: CopyDeps;
  mediaFailed: string[];
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** A deep copy of `value` with every UUID in its strings replaced by its new one (dates stay dates). */
export function remapUuids<T>(value: T, map: Map<string, string>): T {
  if (map.size === 0) return structuredClone(value);
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return v.replace(UUID, (m) => map.get(m.toLowerCase()) ?? m);
    if (v === null || typeof v !== "object" || v instanceof Date) return v instanceof Date ? new Date(v) : v;
    if (Array.isArray(v)) return v.map(walk);
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, walk(x)]));
  };
  return walk(value) as T;
}

/**
 * Drops the secrets of a value: a nested object holding a secret (a
 * payment account, a mail server's password, a sender's key) is left out
 * whole, so nothing half-set is copied; at the top, the secret fields are
 * emptied.
 */
export function withoutSecrets<T extends Record<string, unknown>>(value: T): T {
  const holds = (o: Record<string, unknown>) => Object.entries(o).some(([k, v]) => isSecretField(k) && v !== null && v !== undefined && v !== "");
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== "object" || v instanceof Date) return v;
    if (Array.isArray(v)) return v.filter((x) => !(x && typeof x === "object" && !Array.isArray(x) && !(x instanceof Date) && holds(x as Record<string, unknown>))).map(walk);
    const o = v as Record<string, unknown>;
    if (holds(o)) return null;
    return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, walk(x)]));
  };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[k] = isSecretField(k) ? (v === undefined ? undefined : null) : walk(v);
  return out as T;
}

/** The fields of a copied app that start empty: its store listing, builds, keys, checks and moves. */
const FRESH: Partial<App> = {
  androidPackage: null,
  iosBundleId: null,
  storeTitle: null,
  shortDescription: null,
  fullDescription: null,
  supportEmail: null,
  privacyUrl: null,
  phoneScreenshotIds: [],
  iphoneScreenshotIds: [],
  tabletScreenshotIds: null,
  ipadScreenshotIds: null,
  listingLanguage: null,
  listingTranslations: null,
  screenshotFrame: null,
  // 139 The copy's own screenshots are made from it, once it has its listing.
  autoScreenshots: freshAutoScreenshots(true),
  stagedRelease: null,
  rollout: null,
  minVersion: null,
  recommendedVersion: null,
  firebaseAndroidAssetId: null,
  firebaseIosAssetId: null,
  // 136 In Yallapp's Firebase, a copy registers its own apps once it has its own package name and bundle ID.
  firebaseProjectId: null,
  googlePlayClientEmail: null,
  ascIssuerId: null,
  ascKeyId: null,
  galaxyContentId: null,
  galaxyServiceAccountId: null,
  huaweiAppId: null,
  huaweiClientId: null,
  huaweiAgconnectAssetId: null,
  // 136.20 The APNs key is the client's Apple team's: a copy adds its own.
  apnsKeyId: null,
  apnsTeamId: null,
  xiaomiUserName: null,
  xiaomiCertificate: null,
  xiaomiReleaseNotes: null,
  playSigningSha256: null,
  androidUploadSha256: null,
  appleTeamId: null,
  linksCheck: null,
  integrationChecks: null,
  integrationsCheckedAt: null,
  autoBuildDueAt: null,
  listingDoneAt: null,
  publishingDoneAt: null,
  publishingMode: null,
  demo: false,
  demoBuildId: null,
  deletedAt: null,
  deletedBy: null,
  movedAt: null,
  movedToClientId: null,
};

/** The copy's own row: the source's design, settings and languages, without its secrets, listing and builds. */
export function copiedAppRow(from: App, to: { id: string; clientId: string; name: string }, uuids: Map<string, string>, now: Date): App {
  const clean = withoutSecrets(from as unknown as Record<string, unknown>) as unknown as App;
  // A connected platform or Shopify carries its tokens: the copy connects again in its Website step.
  const reconnect = from.connector !== null && from.connector !== undefined;
  const row: App = {
    ...remapUuids(clean, uuids),
    ...FRESH,
    id: to.id,
    clientId: to.clientId,
    appName: to.name.slice(0, 60),
    connector: null,
    ...(reconnect ? { websiteDoneAt: null } : {}),
    createdAt: now,
    updatedAt: now,
  };
  return row;
}

/** Without these keys. */
function omit<T extends object, K extends keyof T>(row: T, ...keys: K[]): Omit<T, K> {
  const out = { ...row };
  for (const key of keys) delete out[key];
  return out;
}

const mapOf = (ctx: CopyContext, table: string) => (ctx.ids[table] ??= new Map());
const idIn = (ctx: CopyContext, table: string, id: number | null | undefined) => (id === null || id === undefined ? null : (mapOf(ctx, table).get(id) ?? null));
const idsIn = (ctx: CopyContext, table: string, ids: readonly number[] | null | undefined) => (ids ?? []).map((id) => mapOf(ctx, table).get(id)).filter((id): id is number => id !== undefined);
const count = (ctx: CopyContext, table: string, n = 1) => (ctx.copied[table] = (ctx.copied[table] ?? 0) + n);
/** Oldest first: the copies keep the same order where it goes by when each was made. */
const oldestFirst = <T extends { id: number }>(rows: T[]) => [...rows].sort((a, b) => a.id - b.id);
const u = <T>(ctx: CopyContext, value: T) => remapUuids(value, ctx.uuids);

type Copier = (ctx: CopyContext) => Promise<void>;

/**
 * The copiers, each for one or more content tables (APP_TABLES `content`),
 * in the order they run: a copier runs after those whose IDs it maps.
 */
export const COPIERS: { tables: string[]; copy: Copier }[] = [
  {
    tables: ["media_files"],
    copy: async (ctx) => {
      const media = ctx.deps.media;
      if (!media) return;
      for (const file of await ctx.store.listMediaFiles(ctx.from.id, { status: "ready", limit: 10_000 })) {
        // The Media library's files; pictures and voice notes sent in the chat are messages.
        if (file.source !== "library") continue;
        const id = newId();
        const storageKey = storageKeyOf(ctx.to.id, id, extensionOf(file));
        try {
          await media.copy(file.storageKey, storageKey, file.sizeBytes);
        } catch (e) {
          console.error(`[app copy] media ${file.id}: ${e instanceof Error ? e.message : String(e)}`);
          ctx.mediaFailed.push(file.name);
          continue;
        }
        ctx.uuids.set(file.id.toLowerCase(), id);
        await ctx.store.createMediaFile({ ...file, id, appId: ctx.to.id, storageKey, createdAt: ctx.now, updatedAt: ctx.now });
        count(ctx, "media_files");
      }
    },
  },
  {
    tables: ["own_fonts"],
    copy: async (ctx) => {
      for (const font of await ctx.store.listOwnFonts(ctx.from.id)) {
        await ctx.store.saveOwnFont(u(ctx, { ...font, id: newId(), appId: ctx.to.id, createdAt: ctx.now, updatedAt: ctx.now }));
        count(ctx, "own_fonts");
      }
    },
  },
  {
    tables: ["catalog_categories", "catalog_products", "catalog_coupons", "store_flash_sales", "store_gift_occasions"],
    copy: async (ctx) => {
      const { store, now } = ctx;
      const to = ctx.to.id;
      for (const c of [...(await store.listCatalogCategories(ctx.from.id))].sort((a, b) => a.position - b.position)) {
        const made = await store.createCatalogCategory({ appId: to, name: c.name, now, ...(c.sample ? { sample: true } : {}), names: c.names ?? null });
        mapOf(ctx, "catalog_categories").set(c.id, made.id);
        count(ctx, "catalog_categories");
      }
      const products = oldestFirst(await store.listCatalogProducts(ctx.from.id));
      for (const p of products) {
        const made = await store.createCatalogProduct(u(ctx, { ...omit(p, "id", "salesCount", "createdAt", "updatedAt"), appId: to, categoryIds: idsIn(ctx, "catalog_categories", p.categoryIds) }), now);
        mapOf(ctx, "catalog_products").set(p.id, made.id);
        count(ctx, "catalog_products");
      }
      // A gift add-on offered with some categories or products: those of the copy.
      for (const p of products) {
        if (!p.addonFor || p.addonFor.offerWith === "all") continue;
        await store.updateCatalogProduct(to, idIn(ctx, "catalog_products", p.id)!, { addonFor: { ...p.addonFor, categoryIds: idsIn(ctx, "catalog_categories", p.addonFor.categoryIds), productIds: idsIn(ctx, "catalog_products", p.addonFor.productIds) } }, now);
      }
      for (const c of oldestFirst(await store.listCatalogCoupons(ctx.from.id))) {
        if (await store.createCatalogCoupon({ ...omit(c, "id", "usedCount"), appId: to })) count(ctx, "catalog_coupons");
      }
      for (const f of oldestFirst(await store.listFlashSales(ctx.from.id))) {
        await store.createFlashSale({ ...omit(f, "id", "sold"), appId: to, productIds: idsIn(ctx, "catalog_products", f.productIds), categoryId: idIn(ctx, "catalog_categories", f.categoryId) });
        count(ctx, "store_flash_sales");
      }
      for (const g of oldestFirst(await store.listGiftOccasions(ctx.from.id))) {
        await store.createGiftOccasion(u(ctx, { ...omit(g, "id"), appId: to }));
        count(ctx, "store_gift_occasions");
      }
    },
  },
  {
    // 165 Dashboard › Stories, in their order; a category's, the copy's (a connected store's stay as they are).
    tables: ["app_stories"],
    copy: async (ctx) => {
      for (const s of await ctx.store.listAppStories(ctx.from.id)) {
        // A copied category or product is the copy's; a connected store's keeps its id.
        const mapped = (table: string, id: string | null | undefined) => (id && /^\d+$/.test(id) ? idIn(ctx, table, Number(id)) : null);
        const categoryId = String(mapped("catalog_categories", s.categoryId) ?? s.categoryId ?? "") || null;
        const a = s.action;
        const action = !a
          ? null
          : a.category_id
            ? { ...a, category_id: String(mapped("catalog_categories", a.category_id) ?? a.category_id) }
            : a.type === "item" && a.item?.source === "products"
              ? { ...a, item: { ...a.item, id: String(mapped("catalog_products", a.item.id) ?? a.item.id) } }
              : a;
        if (await ctx.store.createAppStory(u(ctx, { ...omit(s, "id"), appId: ctx.to.id, categoryId, action, createdAt: ctx.now, updatedAt: ctx.now }))) count(ctx, "app_stories");
      }
    },
  },
  {
    tables: ["listings", "listing_settings"],
    copy: async (ctx) => {
      for (const l of oldestFirst(await ctx.store.listListings(ctx.from.id))) {
        const made = await ctx.store.createListing(u(ctx, { ...omit(l, "id", "createdAt", "updatedAt"), appId: ctx.to.id }), ctx.now);
        mapOf(ctx, "listings").set(l.id, made.id);
        count(ctx, "listings");
      }
      const settings = await ctx.store.getListingSettings(ctx.from.id);
      if (settings) {
        await ctx.store.saveListingSettings(ctx.to.id, u(ctx, settings), ctx.now);
        count(ctx, "listing_settings");
      }
    },
  },
  {
    tables: ["article_categories", "articles", "news_settings"],
    copy: async (ctx) => {
      for (const c of [...(await ctx.store.listArticleCategories(ctx.from.id))].sort((a, b) => a.position - b.position)) {
        const made = await ctx.store.createArticleCategory({ ...omit(c, "id"), appId: ctx.to.id });
        mapOf(ctx, "article_categories").set(c.id, made.id);
        count(ctx, "article_categories");
      }
      for (const a of oldestFirst(await ctx.store.listArticles(ctx.from.id))) {
        const made = await ctx.store.createArticle(u(ctx, { ...omit(a, "id", "createdAt", "updatedAt"), appId: ctx.to.id, categoryIds: idsIn(ctx, "article_categories", a.categoryIds) }), ctx.now);
        mapOf(ctx, "articles").set(a.id, made.id);
        count(ctx, "articles");
      }
      const settings = await ctx.store.getNewsSettings(ctx.from.id);
      if (settings) {
        await ctx.store.saveNewsSettings(ctx.to.id, u(ctx, settings), ctx.now);
        count(ctx, "news_settings");
      }
    },
  },
  {
    tables: ["events", "event_ticket_types", "event_settings"],
    copy: async (ctx) => {
      for (const e of oldestFirst(await ctx.store.listEvents(ctx.from.id))) {
        const made = await ctx.store.createEvent(u(ctx, { ...omit(e, "id", "createdAt", "updatedAt"), appId: ctx.to.id }), ctx.now);
        mapOf(ctx, "events").set(e.id, made.id);
        count(ctx, "events");
      }
      for (const t of oldestFirst(await ctx.store.listTicketTypes(ctx.from.id))) {
        const eventId = idIn(ctx, "events", t.eventId);
        if (eventId === null) continue;
        await ctx.store.createTicketType({ ...omit(t, "id", "createdAt"), appId: ctx.to.id, eventId }, ctx.now);
        count(ctx, "event_ticket_types");
      }
      const settings = await ctx.store.getEventSettings(ctx.from.id);
      if (settings) {
        await ctx.store.saveEventSettings(ctx.to.id, u(ctx, settings), ctx.now);
        count(ctx, "event_settings");
      }
    },
  },
  {
    tables: ["campaigns", "donation_settings"],
    copy: async (ctx) => {
      for (const c of oldestFirst(await ctx.store.listCampaigns(ctx.from.id))) {
        const made = await ctx.store.createCampaign(u(ctx, { ...omit(c, "id", "createdAt", "updatedAt", "raisedCents", "donorCount"), appId: ctx.to.id }), ctx.now);
        mapOf(ctx, "campaigns").set(c.id, made.id);
        count(ctx, "campaigns");
      }
      const settings = await ctx.store.getDonationSettings(ctx.from.id);
      if (settings) {
        await ctx.store.saveDonationSettings(ctx.to.id, u(ctx, settings), ctx.now);
        count(ctx, "donation_settings");
      }
    },
  },
  {
    tables: ["delivery_settings", "delivery_services", "vehicle_types"],
    copy: async (ctx) => {
      const settings = await ctx.store.getDeliverySettings(ctx.from.id);
      if (settings) {
        // 136 The courier app's iPhone file from Yallapp's Firebase is the source's own: the copy gets its own.
        const own = ctx.from.pushSetup === "yallapp" ? { ...settings, courierFirebaseIosAssetId: null } : settings;
        await ctx.store.saveDeliverySettings(ctx.to.id, u(ctx, own), ctx.now);
        count(ctx, "delivery_settings");
      }
      for (const s of oldestFirst(await ctx.store.listDeliveryServices(ctx.from.id))) {
        const made = await ctx.store.createDeliveryService(u(ctx, { ...omit(s, "id", "createdAt", "updatedAt"), appId: ctx.to.id }), ctx.now);
        mapOf(ctx, "delivery_services").set(s.id, made.id);
        count(ctx, "delivery_services");
      }
      for (const v of oldestFirst(await ctx.store.listVehicleTypes(ctx.from.id))) {
        const made = await ctx.store.createVehicleType(u(ctx, { ...omit(v, "id", "createdAt", "updatedAt"), appId: ctx.to.id }), ctx.now);
        mapOf(ctx, "vehicle_types").set(v.id, made.id);
        count(ctx, "vehicle_types");
      }
    },
  },
  {
    // Restaurants and the marketplace's shops (vendors), with their menus, departments, aisles and products.
    tables: ["restaurants", "market_departments", "market_aisles", "market_products", "market_coupons", "market_club_plans", "market_application_forms"],
    copy: async (ctx) => {
      const { store, now } = ctx;
      const to = ctx.to.id;
      for (const r of oldestFirst(await store.listRestaurants(ctx.from.id))) {
        const menu = (await store.getRestaurantMenu(ctx.from.id, r.id)) ?? { sections: [], nextId: 1 };
        const made = await store.createRestaurant(u(ctx, { ...omit(r, "id", "busyUntil", "ratingSum", "ratingCount", "createdAt", "updatedAt"), appId: to }), u(ctx, menu), now);
        mapOf(ctx, "restaurants").set(r.id, made.id);
        count(ctx, "restaurants");
        for (const d of [...(await store.listMarketDepartments(ctx.from.id, r.id))].sort((a, b) => a.position - b.position)) {
          const dep = await store.saveMarketDepartment(u(ctx, { ...omit(d, "id"), id: null, appId: to, vendorId: made.id }));
          if (!dep) continue;
          mapOf(ctx, "market_departments").set(d.id, dep.id);
          count(ctx, "market_departments");
        }
        for (const a of [...(await store.listMarketAisles(ctx.from.id, r.id))].sort((x, y) => x.position - y.position)) {
          const departmentId = idIn(ctx, "market_departments", a.departmentId);
          if (departmentId === null) continue;
          const aisle = await store.saveMarketAisle({ ...omit(a, "id"), id: null, appId: to, vendorId: made.id, departmentId });
          if (!aisle) continue;
          mapOf(ctx, "market_aisles").set(a.id, aisle.id);
          count(ctx, "market_aisles");
        }
        for (let page = 1; ; page += 1) {
          const { items } = await store.listMarketProducts({ appId: ctx.from.id, vendorId: r.id, page, perPage: 200 });
          for (const p of items) {
            const done = await store.createMarketProduct(
              u(ctx, { ...omit(p, "id", "createdAt", "updatedAt"), appId: to, vendorId: made.id, departmentId: idIn(ctx, "market_departments", p.departmentId), aisleId: idIn(ctx, "market_aisles", p.aisleId) }),
              now,
            );
            if (!done.ok) continue;
            mapOf(ctx, "market_products").set(p.id, done.product.id);
            count(ctx, "market_products");
          }
          if (items.length < 200) break;
        }
      }
      for (const c of oldestFirst(await store.listMarketCoupons(ctx.from.id))) {
        const made = await store.createMarketCoupon({
          ...omit(c, "id"),
          appId: to,
          vendorIds: idsIn(ctx, "restaurants", c.vendorIds),
          departmentIds: idsIn(ctx, "market_departments", c.departmentIds),
          productIds: c.productIds ? idsIn(ctx, "market_products", c.productIds) : c.productIds,
          createdByVendorId: idIn(ctx, "restaurants", c.createdByVendorId),
          ...("usedCount" in c ? { usedCount: 0 } : {}),
        });
        if (made) count(ctx, "market_coupons");
      }
      for (const p of oldestFirst(await store.listMarketClubPlans(ctx.from.id))) {
        await store.createMarketClubPlan({ ...omit(p, "id"), appId: to });
        count(ctx, "market_club_plans");
      }
      for (const f of oldestFirst(await store.listMarketApplicationForms(ctx.from.id))) {
        // A new link of its own: the old one opens the old app's form.
        await store.createMarketApplicationForm({ ...omit(f, "id"), appId: to, token: randomBytes(18).toString("base64url") });
        count(ctx, "market_application_forms");
      }
    },
  },
  {
    // Instructors' profiles: their sign-in (an app user) stays behind.
    tables: ["teachers"],
    copy: async (ctx) => {
      for (const t of oldestFirst(await ctx.store.listTeachers(ctx.from.id))) {
        const made = await ctx.store.createTeacher(
          u(ctx, { appId: ctx.to.id, name: t.name, phone: t.phone, email: t.email, userId: null, photoAssetId: t.photoAssetId, bio: t.bio, subjects: t.subjects, status: t.status, shareBp: t.shareBp, featured: t.featured, sample: t.sample }),
          ctx.now,
        );
        if (!made.ok) continue;
        mapOf(ctx, "teachers").set(t.id, made.teacher.id);
        count(ctx, "teachers");
      }
    },
  },
  {
    // A school's year plan; its people (students, parents, teachers, staff) and their records stay behind.
    tables: [
      "school_settings",
      "school_subjects",
      "school_classes",
      "school_periods",
      "school_syllabus_units",
      "school_syllabus_topics",
      "school_report_templates",
      "school_bus_routes",
      "school_bus_stops",
      "school_books",
      "school_book_copies",
      "school_events",
      "school_exams",
      "school_behaviour_categories",
    ],
    copy: async (ctx) => {
      const { store, now } = ctx;
      const from = ctx.from.id;
      const to = ctx.to.id;
      const settings = await store.getSchoolSettings(from);
      if (settings) {
        await store.saveSchoolSettings(to, u(ctx, settings), now);
        count(ctx, "school_settings");
      }
      for (const s of oldestFirst(await store.listSchoolSubjects(from))) {
        const made = await store.saveSchoolSubject({ appId: to, id: null, name: s.name }, now);
        if (!made.ok) continue;
        mapOf(ctx, "school_subjects").set(s.id, made.subject.id);
        count(ctx, "school_subjects");
      }
      for (const c of [...(await store.listSchoolClasses(from))].sort((a, b) => a.position - b.position)) {
        const made = await store.saveSchoolClass({ appId: to, id: null, name: c.name, grade: c.grade, homeroomTeacherId: null }, now);
        if (!made) continue;
        mapOf(ctx, "school_classes").set(c.id, made.id);
        count(ctx, "school_classes");
      }
      for (const p of oldestFirst(await store.listSchoolPeriods(from))) {
        const classId = idIn(ctx, "school_classes", p.classId);
        const subjectId = idIn(ctx, "school_subjects", p.subjectId);
        if (classId === null || subjectId === null) continue;
        if (await store.saveSchoolPeriod({ ...omit(p, "id"), id: null, appId: to, classId, subjectId, teacherId: null })) count(ctx, "school_periods");
      }
      for (const unit of [...(await store.listSchoolSyllabusUnits(from))].sort((a, b) => a.position - b.position)) {
        const subjectId = idIn(ctx, "school_subjects", unit.subjectId);
        if (subjectId === null) continue;
        const made = await store.saveSchoolSyllabusUnit({ appId: to, id: null, subjectId, grade: unit.grade, title: unit.title, position: unit.position }, now);
        if (!made) continue;
        mapOf(ctx, "school_syllabus_units").set(unit.id, made.id);
        count(ctx, "school_syllabus_units");
      }
      for (const topic of [...(await store.listSchoolSyllabusTopics(from))].sort((a, b) => a.position - b.position)) {
        const unitId = idIn(ctx, "school_syllabus_units", topic.unitId);
        if (unitId === null) continue;
        if (await store.saveSchoolSyllabusTopic({ appId: to, id: null, unitId, title: topic.title, startsOn: topic.startsOn, endsOn: topic.endsOn, position: topic.position }, now)) count(ctx, "school_syllabus_topics");
      }
      for (const t of oldestFirst(await store.listSchoolReportTemplates(from))) {
        if (await store.saveSchoolReportTemplate({ appId: to, id: null, kind: t.kind, name: t.name, fields: t.fields }, now)) count(ctx, "school_report_templates");
      }
      for (const r of [...(await store.listSchoolBusRoutes(from))].sort((a, b) => a.position - b.position)) {
        const made = await store.saveSchoolBusRoute({ appId: to, id: null, name: r.name, plate: r.plate, capacity: r.capacity, driverId: null, supervisorId: null, active: r.active }, now);
        if (!made) continue;
        mapOf(ctx, "school_bus_routes").set(r.id, made.id);
        count(ctx, "school_bus_routes");
      }
      for (const s of [...(await store.listSchoolBusStops(from))].sort((a, b) => a.position - b.position)) {
        const routeId = idIn(ctx, "school_bus_routes", s.routeId);
        if (routeId === null) continue;
        if (await store.saveSchoolBusStop({ ...omit(s, "id", "position"), id: null, appId: to, routeId })) count(ctx, "school_bus_stops");
      }
      for (const b of oldestFirst(await store.listSchoolBooks(from, { limit: 100_000 }))) {
        const made = await store.createSchoolBook(u(ctx, { ...omit(b, "id"), appId: to, createdAt: now, updatedAt: now }));
        mapOf(ctx, "school_books").set(b.id, made.id);
        count(ctx, "school_books");
      }
      for (const c of oldestFirst(await store.listSchoolBookCopies(from))) {
        const bookId = idIn(ctx, "school_books", c.bookId);
        if (bookId === null) continue;
        if ((await store.createSchoolBookCopy({ ...omit(c, "id"), appId: to, bookId, createdAt: now })).ok) count(ctx, "school_book_copies");
      }
      for (const e of oldestFirst(await store.listSchoolEvents(from))) {
        if (await store.saveSchoolEvent({ ...omit(e, "id", "createdAt", "updatedAt"), id: null, appId: to, classId: idIn(ctx, "school_classes", e.classId) }, now)) count(ctx, "school_events");
      }
      for (const x of oldestFirst(await store.listSchoolExams(from))) {
        const subjectId = idIn(ctx, "school_subjects", x.subjectId);
        if (subjectId === null) continue;
        const made = await store.saveSchoolExam(
          { appId: to, id: null, classId: idIn(ctx, "school_classes", x.classId), grade: x.grade, subjectId, date: x.date, startMinute: x.startMinute, durationMinutes: x.durationMinutes, room: x.room, notes: x.notes },
          now,
        );
        if (made) count(ctx, "school_exams");
      }
      for (const c of oldestFirst(await store.listSchoolBehaviourCategories(from))) {
        if (await store.saveSchoolBehaviourCategory({ appId: to, id: null, name: c.name, kind: c.kind, points: c.points, active: c.active }, now)) count(ctx, "school_behaviour_categories");
      }
    },
  },
  {
    // A university's structure; its students and lecturers stay behind.
    tables: ["uni_settings", "uni_faculties", "uni_departments", "uni_courses", "uni_programs", "uni_terms", "uni_sections"],
    copy: async (ctx) => {
      const { store, now } = ctx;
      const from = ctx.from.id;
      const to = ctx.to.id;
      const settings = await store.getUniSettings(from);
      if (settings) {
        await store.saveUniSettings(to, u(ctx, settings), now);
        count(ctx, "uni_settings");
      }
      for (const f of oldestFirst(await store.listUniFaculties(from))) {
        const made = await store.saveUniFaculty({ appId: to, id: null, name: f.name, code: f.code }, now);
        if (!made) continue;
        mapOf(ctx, "uni_faculties").set(f.id, made.id);
        count(ctx, "uni_faculties");
      }
      for (const d of oldestFirst(await store.listUniDepartments(from))) {
        const facultyId = idIn(ctx, "uni_faculties", d.facultyId);
        if (facultyId === null) continue;
        const made = await store.saveUniDepartment({ appId: to, id: null, facultyId, name: d.name, code: d.code }, now);
        if (!made) continue;
        mapOf(ctx, "uni_departments").set(d.id, made.id);
        count(ctx, "uni_departments");
      }
      for (const c of oldestFirst(await store.listUniCourses(from))) {
        const made = await store.saveUniCourse({ ...omit(c, "id", "createdAt", "updatedAt"), id: null, appId: to, departmentId: idIn(ctx, "uni_departments", c.departmentId) }, now);
        if (!made.ok) continue;
        mapOf(ctx, "uni_courses").set(c.id, made.course.id);
        count(ctx, "uni_courses");
      }
      for (const p of oldestFirst(await store.listUniPrograms(from))) {
        const departmentId = idIn(ctx, "uni_departments", p.departmentId);
        if (departmentId === null) continue;
        const plan = p.plan.flatMap((entry) => {
          const courseId = idIn(ctx, "uni_courses", entry.courseId);
          return courseId === null ? [] : [{ ...entry, courseId }];
        });
        if (await store.saveUniProgram({ ...omit(p, "id", "createdAt", "updatedAt"), id: null, appId: to, departmentId, plan }, now)) count(ctx, "uni_programs");
      }
      for (const t of oldestFirst(await store.listUniTerms(from))) {
        const made = await store.saveUniTerm({ ...omit(t, "id", "createdAt"), id: null, appId: to }, now);
        if (!made) continue;
        mapOf(ctx, "uni_terms").set(t.id, made.id);
        count(ctx, "uni_terms");
      }
      for (const s of oldestFirst(await store.listUniSections(from))) {
        const termId = idIn(ctx, "uni_terms", s.termId);
        const courseId = idIn(ctx, "uni_courses", s.courseId);
        if (termId === null || courseId === null) continue;
        if (await store.saveUniSection({ ...omit(s, "id", "createdAt", "updatedAt"), id: null, appId: to, termId, courseId, lecturerId: null, resultsPublishedAt: null }, now)) count(ctx, "uni_sections");
      }
    },
  },
  {
    tables: ["travel_settings", "travel_hotels", "travel_rooms", "travel_flights"],
    copy: async (ctx) => {
      const { store, now } = ctx;
      const settings = await store.getTravelSettings(ctx.from.id);
      if (settings) {
        await store.saveTravelSettings(ctx.to.id, u(ctx, settings), now);
        count(ctx, "travel_settings");
      }
      for (const h of oldestFirst(await store.listTravelHotels(ctx.from.id))) {
        const made = await store.createTravelHotel(u(ctx, { ...omit(h, "id", "createdAt", "updatedAt"), appId: ctx.to.id }), now);
        mapOf(ctx, "travel_hotels").set(h.id, made.id);
        count(ctx, "travel_hotels");
      }
      for (const r of oldestFirst(await store.listTravelRooms(ctx.from.id))) {
        const hotelId = idIn(ctx, "travel_hotels", r.hotelId);
        if (hotelId === null) continue;
        await store.createTravelRoom(u(ctx, { ...omit(r, "id", "createdAt", "updatedAt"), appId: ctx.to.id, hotelId }), now);
        count(ctx, "travel_rooms");
      }
      for (const f of oldestFirst(await store.listTravelFlights(ctx.from.id))) {
        await store.createTravelFlight(u(ctx, { ...omit(f, "id", "createdAt", "updatedAt"), appId: ctx.to.id }), now);
        count(ctx, "travel_flights");
      }
    },
  },
  {
    // Last: the pages, with the entries their lists hand-picked (`ids`, `category_id`) as the copy's.
    tables: ["app_layouts"],
    copy: async (ctx) => {
      const layout = await ctx.store.getAppLayout(ctx.from.id);
      if (!layout) return;
      const entries = entryMap(ctx);
      const pick = (v: unknown): unknown => {
        if (v === null || typeof v !== "object" || v instanceof Date) return v;
        if (Array.isArray(v)) return v.map(pick);
        const o = Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, pick(x)]));
        if (Array.isArray(o.ids) && "category_id" in o) {
          o.ids = (o.ids as unknown[]).map((id) => (typeof id === "string" && entries.items.has(id) ? entries.items.get(id) : id));
          if (typeof o.category_id === "string" && entries.categories.has(o.category_id)) o.category_id = entries.categories.get(o.category_id);
        }
        return o;
      };
      await ctx.store.saveAppLayout(pick(u(ctx, { ...layout, appId: ctx.to.id, publishCount: layout.published ? 1 : 0 })) as typeof layout);
      count(ctx, "app_layouts");
    },
  },
];

/** The copy's own entries by the source's (as text, how the pages name them), its kind of content first. */
function entryMap(ctx: CopyContext): { items: Map<string, string>; categories: Map<string, string> } {
  const items = new Map<string, string>();
  const categories = new Map<string, string>();
  const add = (into: Map<string, string>, table: string) => {
    for (const [from, to] of ctx.ids[table] ?? []) if (!into.has(String(from))) into.set(String(from), String(to));
  };
  for (const table of ["catalog_products", "listings", "articles", "events", "campaigns", "delivery_services", "restaurants", "market_products", "vehicle_types", "teachers", "travel_hotels"]) add(items, table);
  for (const table of ["catalog_categories", "article_categories", "market_departments"]) add(categories, table);
  return { items, categories };
}

/** The content tables (APP_TABLES) without a copier: none, or the test fails. */
export function tablesWithoutCopier(): string[] {
  const covered = new Set(COPIERS.flatMap((c) => c.tables));
  return Object.entries(APP_TABLES)
    .filter(([table, role]) => role === "content" && !covered.has(table))
    .map(([table]) => table);
}

/**
 * Copies the pictures the app uses into the other account (new IDs and
 * files); within the same account they are shared, as two apps of an
 * account may share them.
 */
async function copyAssets(ctx: CopyContext, clientId: string): Promise<void> {
  if (clientId === ctx.from.clientId || !ctx.deps.copyBlob) return;
  for (const id of await ctx.store.listAppAssetReferences(ctx.from.id)) {
    const asset: Asset | null = await ctx.store.getAsset(id);
    if (!asset) continue;
    const blobKey = await ctx.deps.copyBlob(asset.blobKey);
    if (!blobKey) continue;
    const copy: Asset = { ...asset, id: newId(), clientId, blobKey, createdAt: ctx.now };
    await ctx.store.createAsset(copy);
    ctx.uuids.set(asset.id.toLowerCase(), copy.id);
  }
}

/**
 * Makes the copy: the pictures first (their new IDs go in every row), the
 * app's own row (as a new app: the account's first regular app takes what
 * was given before it, as any new app does), then each content table.
 */
export async function copyApp(deps: CopyDeps, from: App, target: CopyTarget): Promise<CopyResult> {
  const id = newId();
  const ctx: CopyContext = {
    store: deps.store,
    now: deps.now,
    from,
    to: { ...from, id, clientId: target.clientId },
    uuids: new Map(),
    ids: {},
    copied: {},
    deps,
    mediaFailed: [],
  };
  await copyAssets(ctx, target.clientId);
  // Courses are kept on the app's row; their teachers are copied below, so their IDs are mapped after.
  const app = copiedAppRow(from, { id, clientId: target.clientId, name: target.name }, ctx.uuids, deps.now);
  await deps.store.createApp(app);
  ctx.to = app;
  for (const copier of COPIERS) await copier.copy(ctx);
  // The row again, with the Media library's new IDs (pictures from it on the pages and the app's own settings).
  const final = copiedAppRow(from, { id, clientId: target.clientId, name: target.name }, ctx.uuids, deps.now);
  const teacherOf = (teacherId: number | null | undefined) => (teacherId === null || teacherId === undefined ? teacherId : (idIn(ctx, "teachers", teacherId) ?? null));
  if (final.courseSetup) final.courseSetup = { ...final.courseSetup, courses: final.courseSetup.courses.map((c) => ("teacherId" in c ? { ...c, teacherId: teacherOf(c.teacherId) } : c)) };
  const { id: _id, clientId: _client, createdAt: _created, androidUploadKeyEncrypted: _upload, iosDistributionEncrypted: _ios, ...patch } = final;
  void [_id, _client, _created, _upload, _ios];
  await deps.store.updateApp(id, patch, deps.now);
  return { app: (await deps.store.getAppById(id)) ?? final, copied: ctx.copied, mediaFailed: ctx.mediaFailed };
}
