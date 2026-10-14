import { activateClient } from "../admin/clients";
import { ENGINES } from "../app/kinds";
import { newApp } from "../app/setup";
import { sha256Hex } from "../crypto/tokens";
import type { AppPatch, DataStore } from "../data/store";
import type {
  App,
  AssetKind,
  BookingSetup,
  Client,
  ContactSetting,
  Course,
  CourseSetup,
  HostedSettings,
  ListingInput,
} from "../data/types";
import { effectivePlans } from "../entitlements";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "../pages/defaults";
import { publishLayout } from "../pages/layout";
import type { LayoutBlock, LayoutContent } from "../pages/types";
import { clearPlatformSettingsCache, platformSetting } from "../settings/platform";
import { artPng } from "./art";
import { DEMO_ACCOUNT, DEMO_LICENSE_UNTIL, DEMO_SIGN_IN, DEMO_TYPES, DEMO_USER_NAME, demoIdOf, demoKind, type DemoId } from "./constants";
import {
  ARTICLE_CATEGORIES,
  BOOKING_RULES,
  CLINIC_CATEGORIES,
  CLINIC_DOCTORS,
  CLINIC_HOURS,
  CLINIC_INTAKE,
  CLINIC_RULES,
  CLINIC_SERVICES,
  COURSE_CATEGORIES,
  COURSE_CURRENCY,
  DEMO_ARTICLES,
  DEMO_BRANDS,
  DEMO_COURSES,
  DEMO_DISHES,
  DEMO_LISTINGS,
  DEMO_PRODUCTS,
  DEMO_SERVICES,
  DEMO_STAFF,
  LISTING_SETTINGS,
  MENU_CATEGORIES,
  PRODUCT_CATEGORIES,
  RESTAURANT_FULFILMENT,
  SERVICE_CATEGORIES,
  STORE_CURRENCY,
  STORE_FREE_SHIPPING_OVER_CENTS,
  STORE_SHIPPING_CENTS,
  STUDIO_HOURS,
} from "./content";
import { PICTURES, type PictureName } from "./pictures";

/**
 * Creates or refreshes the demo apps (roadmap 16, the admin's Demo apps
 * page): the "Yallapp demos" account, one app per type on the hosted API
 * with its branding, store listing, pages and content, a Business license
 * that doesn't end, and the shared demo sign-in account. Running it again
 * updates everything in place: nothing is duplicated, pictures already
 * saved are reused.
 */

export interface DemoSetupDeps {
  store: DataStore;
  encryptionKey: Buffer;
  /** Saves an uploaded file (Netlify Blobs, or a folder locally). */
  putBlob: (key: string, data: Buffer, contentType: string) => Promise<void>;
  assetUrl: (assetId: string) => string;
  /** yallapp.com.tr: privacy and terms pages of the demo apps. */
  platformUrl: string;
  /** Yallapp's contact details: the demo apps' support email and WhatsApp. */
  contact: ContactSetting;
  /** Who did it, for the setting and the published pages. */
  actorEmail: string;
  now: Date;
}

export class DemoSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoSetupError";
  }
}

export interface DemoSetupResult {
  clientId: string;
  accountCreated: boolean;
  apps: { type: DemoId; appId: string; created: boolean }[];
}

/** A UUID-shaped ID made from a hash, so the same picture of the same account is saved once. */
function idFrom(text: string): string {
  const h = sha256Hex(text);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((Number.parseInt(h[16]!, 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const SIZES: Record<"icon" | "banner" | "course" | "product" | "home" | "avatar", [number, number]> = {
  icon: [1024, 1024],
  banner: [1200, 600],
  course: [800, 450],
  product: [600, 600],
  home: [800, 600],
  avatar: [400, 400],
};

/** Pictures drawn by this server instance (about 1.5 MB for all of them), so a second run draws nothing. */
const rendered = new Map<string, Buffer>();

async function picture(deps: DemoSetupDeps, clientId: string, name: PictureName, size: keyof typeof SIZES, kind: AssetKind): Promise<string> {
  const [width, height] = SIZES[size];
  const id = idFrom(JSON.stringify({ v: 1, clientId, art: PICTURES[name], width, height }));
  if (await deps.store.getAsset(id)) return id;
  const drawn = `${name}:${width}x${height}`;
  const png = rendered.get(drawn) ?? artPng(PICTURES[name], width, height);
  rendered.set(drawn, png);
  const blobKey = `assets/${clientId}/${id}.png`;
  await deps.putBlob(blobKey, png, "image/png");
  await deps.store.createAsset({ id, clientId, kind, blobKey, contentType: "image/png", size: png.length, createdAt: deps.now });
  return id;
}

/** The demo account: the one the setting names, or a new one. Never someone else's. */
async function demoAccount(deps: DemoSetupDeps): Promise<{ client: Client; created: boolean }> {
  const { store, now } = deps;
  const setting = await platformSetting(store, "demo", { fresh: true });
  const saved = setting ? await store.getClientById(setting.value.clientId) : null;
  if (saved) return { client: saved, created: false };
  if (await store.getUserByEmail(DEMO_ACCOUNT.email)) {
    throw new DemoSetupError(`${DEMO_ACCOUNT.email} already belongs to another account, so the demo account can't be made with it.`);
  }
  const user = await store.createUser({ email: DEMO_ACCOUNT.email, name: DEMO_ACCOUNT.name, passwordHash: null, now });
  const client = await store.createClient({ userId: user.id, whatsapp: deps.contact.whatsapp.replace(/[^\d+]/g, ""), siteUrl: "", now });
  await store.setPlatformSetting("demo", { clientId: client.id }, deps.actorEmail, now);
  clearPlatformSettingsCache();
  return { client, created: true };
}

function hostedSettingsFor(deps: DemoSetupDeps): HostedSettings {
  return {
    signupFields: [],
    signupAllowed: true,
    defaultCountryCode: DEMO_SIGN_IN.countryCode,
    deviceLimit: 0,
    supportWhatsapp: deps.contact.whatsapp,
    termsUrl: `${deps.platformUrl}/terms`,
    reviewPhone: null,
    reviewCode: null,
  };
}

/** Sets up one demo app; returns it as saved. */
async function setupApp(deps: DemoSetupDeps, client: Client, id: DemoId): Promise<{ app: App; created: boolean }> {
  const { store, now } = deps;
  // 21 A demo is an engine, with the vertical of its kind (a clinic runs on the bookings engine).
  const { engine: type, vertical } = demoKind(id);
  const existing = (await store.listAppsByClient(client.id)).find((a) => a.demo === true && demoIdOf(a) === id);
  let app = existing;
  if (!app) {
    app = { ...newApp(client.id, null, now, type, vertical), demo: true };
    await store.createApp(app);
  }
  const brand = DEMO_BRANDS[id];
  // Every demo app's content is managed in the dashboard: its engine's own content (lib/app/kinds.ts).
  const content = ENGINES[type].ownContent.kind;
  const iconAssetId = await picture(deps, client.id, brand.icon, "icon", "icon");
  const patch: AppPatch = {
    demo: true,
    vertical,
    backend: "hosted",
    siteUrl: null,
    connector: { kind: content },
    hostedSettings: hostedSettingsFor(deps),
    appName: brand.appName,
    shortName: brand.shortName,
    iconAssetId,
    primaryColor: brand.primaryColor,
    splashColor: brand.splashColor,
    template: brand.template,
    font: brand.font,
    androidPackage: brand.androidPackage,
    iosBundleId: brand.androidPackage,
    storeTitle: brand.storeTitle,
    shortDescription: brand.shortDescription,
    fullDescription: brand.fullDescription,
    supportEmail: deps.contact.email,
    privacyUrl: `${deps.platformUrl}/privacy`,
    appTypeDoneAt: app.appTypeDoneAt ?? now,
    websiteDoneAt: app.websiteDoneAt ?? now,
    brandingDoneAt: app.brandingDoneAt ?? now,
    listingDoneAt: app.listingDoneAt ?? now,
    publishingDoneAt: app.publishingDoneAt ?? now,
    // Our own apps: the team publishes them, when it wants to.
    publishingMode: "managed",
  };
  if (content === "courses") {
    patch.catalogSettings = { currency: COURSE_CURRENCY, shippingCents: 0, freeShippingOverCents: null, payment: null };
    patch.courseSetup = await courseSetupFor(deps, client.id, app.courseSetup);
  } else if (content === "catalog" && id === "restaurant") {
    // 26 The café: pickup and delivery, its hours and delivery areas.
    patch.catalogSettings = {
      currency: STORE_CURRENCY,
      shippingCents: 0,
      freeShippingOverCents: null,
      payment: null,
      fulfilment: { ...RESTAURANT_FULFILMENT, hours: RESTAURANT_FULFILMENT.hours.map((d) => d.map((r) => ({ ...r }))), deliveryAreas: [...RESTAURANT_FULFILMENT.deliveryAreas] },
    };
  } else if (content === "catalog") {
    patch.catalogSettings = { currency: STORE_CURRENCY, shippingCents: STORE_SHIPPING_CENTS, freeShippingOverCents: STORE_FREE_SHIPPING_OVER_CENTS, payment: null };
  } else if (content === "bookings") {
    patch.bookingSetup = await bookingSetupFor(deps, client.id, id === "clinic");
  }
  await store.updateApp(app.id, patch, now);
  const saved = (await store.getAppById(app.id))!;

  // A Business license that doesn't end.
  const license = await store.getLicenseForApp(client.id, saved.id);
  if (!license || license.plan !== "business" || license.expiresAt.getTime() !== DEMO_LICENSE_UNTIL.getTime() || license.nextPlan) {
    await activateClient(store, { clientId: client.id, appId: saved.id, plan: "business", activeUntil: DEMO_LICENSE_UNTIL, paymentNote: "" }, deps.encryptionKey, now);
  }

  if (content === "catalog") await syncProducts(deps, client.id, saved, id === "restaurant");
  if (content === "listings") await syncListings(deps, client.id, saved);
  if (content === "articles") await syncArticles(deps, client.id, saved);
  await publishPages(deps, client.id, saved);

  // The account every visitor signs in to.
  const user = await store.getHostedUserByPhone(saved.id, DEMO_SIGN_IN.e164);
  if (!user) await store.createHostedUser({ appId: saved.id, phone: DEMO_SIGN_IN.e164, name: DEMO_USER_NAME, email: null, city: null, now });
  else if (user.name !== DEMO_USER_NAME) await store.updateHostedUser(saved.id, user.id, { name: DEMO_USER_NAME, email: null, city: null }, now);
  return { app: saved, created: !existing };
}

/** Courses with fixed IDs, so enrolments and progress keep pointing at the same course and lesson. */
async function courseSetupFor(deps: DemoSetupDeps, clientId: string, previous: CourseSetup | null): Promise<CourseSetup> {
  let next = 1;
  const categories = COURSE_CATEGORIES.map((name) => ({ id: next++, name }));
  const courses: Course[] = [];
  for (const seed of DEMO_COURSES) {
    const id = next++;
    courses.push({
      id,
      title: seed.title,
      description: seed.description,
      imageAssetId: await picture(deps, clientId, seed.picture, "course", "product_image"),
      priceCents: seed.priceCents,
      categoryIds: categories.filter((c) => c.name === seed.category).map((c) => c.id),
      instructorName: seed.instructor,
      level: seed.level,
      active: true,
      createdAt: previous?.courses.find((c) => c.id === id)?.createdAt ?? deps.now.toISOString(),
      topics: seed.topics.map((topic) => ({
        id: next++,
        title: topic.title,
        lessons: topic.lessons.map((lesson) => ({ id: next++, title: lesson.title, videoUrl: null, text: lesson.text, durationMinutes: lesson.minutes, preview: lesson.preview === true })),
      })),
    });
  }
  return { currency: COURSE_CURRENCY, categories, courses, nextId: next };
}

/** The studio's services and team, or (21) the clinic's, with its doctors' profiles and intake form. */
async function bookingSetupFor(deps: DemoSetupDeps, clientId: string, clinic: boolean): Promise<BookingSetup> {
  let next = 1;
  const categories = (clinic ? CLINIC_CATEGORIES : SERVICE_CATEGORIES).map((name) => ({ id: next++, name }));
  const services = [];
  for (const seed of clinic ? CLINIC_SERVICES : DEMO_SERVICES) {
    services.push({
      id: next++,
      categoryId: categories.find((c) => c.name === seed.category)?.id ?? null,
      name: seed.name,
      description: seed.description,
      durationMinutes: seed.minutes,
      priceCents: seed.priceCents,
      imageAssetId: await picture(deps, clientId, seed.picture, "product", "product_image"),
      color: seed.color,
      active: true,
    });
  }
  const staff = [];
  for (const seed of clinic ? CLINIC_DOCTORS : DEMO_STAFF) {
    staff.push({
      id: next++,
      name: seed.name,
      title: seed.title,
      imageAssetId: await picture(deps, clientId, seed.picture, "avatar", "product_image"),
      serviceIds: services.filter((s) => seed.services.includes(s.name)).map((s) => s.id),
      hours: (clinic ? CLINIC_HOURS : STUDIO_HOURS).map((ranges) => ranges.map((r) => ({ ...r }))),
      daysOff: [],
      active: true,
      ...(seed.specialties ? { specialties: [...seed.specialties], languages: [...(seed.languages ?? [])], bio: seed.bio ?? null } : {}),
    });
  }
  if (clinic) {
    return { rules: { ...CLINIC_RULES }, categories, services, staff, nextId: next, intakeFields: CLINIC_INTAKE.map((f) => ({ ...f, options: [...f.options] })) };
  }
  return { rules: { ...BOOKING_RULES }, categories, services, staff, nextId: next };
}

/** Products by SKU and categories by name: updated in place; ones no longer in the demo are removed. 26 The café's dishes, with their options. */
async function syncProducts(deps: DemoSetupDeps, clientId: string, app: App, menu: boolean): Promise<void> {
  const { store, now } = deps;
  const names = menu ? MENU_CATEGORIES : PRODUCT_CATEGORIES;
  const seeds = menu ? DEMO_DISHES : DEMO_PRODUCTS;
  const categories = await store.listCatalogCategories(app.id);
  const categoryIds = new Map<string, number>();
  for (const name of names) {
    const found = categories.find((c) => c.name === name);
    categoryIds.set(name, found ? found.id : (await store.createCatalogCategory({ appId: app.id, name, now })).id);
  }
  for (const c of categories) if (!names.includes(c.name)) await store.deleteCatalogCategory(app.id, c.id, now);
  const products = await store.listCatalogProducts(app.id);
  // Created last to first, so the newest-first lists show them in the demo's order.
  for (const seed of [...seeds].reverse()) {
    const input = {
      appId: app.id,
      name: seed.name,
      description: seed.description,
      priceCents: seed.priceCents,
      salePriceCents: seed.salePriceCents,
      categoryIds: [categoryIds.get(seed.category)!],
      imageAssetIds: [await picture(deps, clientId, seed.picture, "product", "product_image")],
      stock: null,
      digital: false,
      featured: seed.featured,
      active: true,
      sku: seed.sku,
      optionGroups: seed.optionGroups ? structuredClone(seed.optionGroups) : null,
    };
    const found = products.find((p) => p.sku === seed.sku);
    if (found) await store.updateCatalogProduct(app.id, found.id, input, now);
    else await store.createCatalogProduct(input, now);
  }
  const skus = new Set(seeds.map((p) => p.sku));
  for (const p of products) if (!p.sku || !skus.has(p.sku)) await store.deleteCatalogProduct(app.id, p.id);
}

/** Listings by reference: updated in place; ones no longer in the demo are archived. */
async function syncListings(deps: DemoSetupDeps, clientId: string, app: App): Promise<void> {
  const { store, now } = deps;
  await store.saveListingSettings(app.id, { ...LISTING_SETTINGS, contactName: DEMO_BRANDS.real_estate.appName }, now);
  const listings = await store.listListings(app.id);
  for (const seed of [...DEMO_LISTINGS].reverse()) {
    const imageAssetIds: string[] = [];
    for (const name of seed.pictures) imageAssetIds.push(await picture(deps, clientId, name, "home", "product_image"));
    const found = listings.find((l) => l.reference === seed.reference);
    const input: ListingInput = {
      appId: app.id,
      reference: seed.reference,
      title: seed.title,
      description: seed.description,
      purpose: seed.purpose,
      type: seed.type,
      priceCents: seed.priceCents,
      currency: LISTING_SETTINGS.currency,
      pricePeriod: seed.pricePeriod,
      negotiable: seed.negotiable,
      city: seed.city,
      district: seed.district,
      address: null,
      latitude: seed.latitude,
      longitude: seed.longitude,
      area: seed.area,
      bedrooms: seed.bedrooms,
      bathrooms: seed.bathrooms,
      floor: seed.floor,
      yearBuilt: seed.yearBuilt,
      furnished: seed.furnished,
      features: seed.features,
      imageAssetIds,
      videoUrl: null,
      featured: seed.featured,
      status: "published",
      publishedAt: found?.publishedAt ?? now,
    };
    if (found) await store.updateListing(app.id, found.id, input, now);
    else await store.createListing(input, now);
  }
  const references = new Set(DEMO_LISTINGS.map((l) => l.reference));
  for (const l of listings) if ((!l.reference || !references.has(l.reference)) && l.status !== "archived") await store.updateListing(app.id, l.id, { status: "archived" }, now);
}

/** 23 Sections by name and articles by title: updated in place; ones no longer in the demo are unpublished. */
async function syncArticles(deps: DemoSetupDeps, clientId: string, app: App): Promise<void> {
  const { store, now } = deps;
  await store.saveNewsSettings(app.id, { showAuthor: true, showDates: true }, now);
  const categories = await store.listArticleCategories(app.id);
  const categoryIds = new Map<string, number>();
  for (const [position, name] of ARTICLE_CATEGORIES.entries()) {
    const found = categories.find((c) => c.name === name);
    if (found) {
      if (found.position !== position) await store.updateArticleCategory(app.id, found.id, { position });
      categoryIds.set(name, found.id);
    } else {
      categoryIds.set(name, (await store.createArticleCategory({ appId: app.id, name, position, createdAt: now })).id);
    }
  }
  for (const c of categories) if (!ARTICLE_CATEGORIES.includes(c.name)) await store.deleteArticleCategory(app.id, c.id);
  const articles = await store.listArticles(app.id);
  // Created oldest first, so the newest-first lists show them in the demo's order.
  for (const seed of [...DEMO_ARTICLES].reverse()) {
    const input = {
      appId: app.id,
      title: seed.title,
      excerpt: seed.excerpt,
      body: seed.body,
      imageAssetId: await picture(deps, clientId, seed.picture, "course", "product_image"),
      author: seed.author,
      categoryIds: [categoryIds.get(seed.category)!],
      featured: seed.featured,
      status: "published" as const,
      // Dated before the refresh, the way a news site's articles are.
      publishedAt: new Date(now.getTime() - seed.hoursAgo * 3_600_000),
    };
    const found = articles.find((a) => a.title === seed.title);
    if (found) await store.updateArticle(app.id, found.id, input, now);
    else await store.createArticle(input, now);
  }
  const titles = new Set(DEMO_ARTICLES.map((a) => a.title));
  for (const a of articles) if (!titles.has(a.title) && a.status !== "draft") await store.updateArticle(app.id, a.id, { status: "draft" }, now);
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

/** The demo's pages and look: the usual pages for its type, with a banner, a welcome and how to sign in. */
export async function demoLayout(deps: Pick<DemoSetupDeps, "assetUrl" | "now">, app: App, bannerAssetId: string): Promise<LayoutContent> {
  const brand = DEMO_BRANDS[demoIdOf(app)];
  const base = defaultLayout({ ...app, brandingDoneAt: deps.now }, BUILT_IN_APP_DEFAULTS, deps.now);
  const home = base.pages[0]!;
  const bannerUrl = deps.assetUrl(bannerAssetId);
  const extra: LayoutBlock[] = [];
  // Pages only take https pictures (local runs are on http).
  if (bannerUrl.startsWith("https://")) {
    extra.push({ id: "demo-banner", type: "banner", visibility: "everyone", title: null, image_url: bannerUrl, heading: brand.banner.heading, subheading: brand.banner.subheading, action: null });
  }
  extra.push({
    id: "demo-sign-in",
    type: "text",
    visibility: "signed_out",
    title: null,
    html: `<p><strong>This is a demo app.</strong> Sign in with ${escapeHtml(DEMO_SIGN_IN.display)} and the code ${DEMO_SIGN_IN.code}. Anything you add is deleted after a day.</p>`,
  });
  const blocks = home.blocks.map((block) =>
    block.id === "welcome" ? { ...block, html: `<h2>Welcome to ${escapeHtml(brand.appName)}</h2><p>${escapeHtml(brand.welcome)}</p>` } : block,
  );
  return {
    ...base,
    appearance: {
      template: brand.template,
      theme_mode: "system",
      user_can_change_mode: true,
      secondary_color: brand.secondaryColor,
      font: brand.font,
      corners: brand.corners,
      cards: brand.cards,
    },
    languages: { default: "en", available: [...brand.languages] },
    pages: [{ ...home, blocks: [...extra, ...blocks] }, ...base.pages.slice(1)],
  };
}

async function publishPages(deps: DemoSetupDeps, clientId: string, app: App): Promise<void> {
  const brand = DEMO_BRANDS[demoIdOf(app)];
  const banner = await picture(deps, clientId, brand.banner.picture, "banner", "product_image");
  const plans = await effectivePlans(deps.store);
  const result = await publishLayout(deps.store, app, await demoLayout(deps, app, banner), deps.actorEmail, deps.now, plans.business);
  if (!result.ok) throw new DemoSetupError(`The ${brand.appName} pages couldn't be published: ${result.errors.join(" ")}`);
}

/** Creates or refreshes these demo apps (all of them by default). */
export async function setupDemoApps(deps: DemoSetupDeps, types: readonly DemoId[] = DEMO_TYPES): Promise<DemoSetupResult> {
  const { client, created } = await demoAccount(deps);
  const apps: DemoSetupResult["apps"] = [];
  for (const type of DEMO_TYPES.filter((t) => types.includes(t))) {
    const result = await setupApp(deps, client, type);
    apps.push({ type, appId: result.app.id, created: result.created });
  }
  return { clientId: client.id, accountCreated: created, apps };
}
