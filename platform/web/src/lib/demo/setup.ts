import { activateClient } from "../admin/clients";
import { syncClassSessions } from "../bookings/classes";
import { ENGINES } from "../app/kinds";
import { newApp } from "../app/setup";
import type { AppPatch, DataStore } from "../data/store";
import type { App, AssetKind, BookingSetup, Client, ContactSetting, CourseSetup, HostedSettings, RidesSettings } from "../data/types";
import { deliverySettingsOf } from "../delivery/settings";
import { DEFAULT_RIDES_SETTINGS, EMPTY_DRIVER } from "../rides/settings";
import { DEFAULT_TAXI_SETTINGS } from "../taxi/settings";
import { effectivePlans } from "../entitlements";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "../pages/defaults";
import { designLayout, publishLayout } from "../pages/layout";
import { appUrl } from "../env";
import { itemSourcesFor } from "../pages/sources";
import { demoStudioPage, TEMPLATES } from "../studio/sections";
import { startLayout } from "../studio/start";
import { demoPageTabs, demoScreenPages, demoTabPages } from "../studio/demo-pages";
import { withDemoFacts } from "../studio/demo-templates";
import { demoDesign, demoStudioContext } from "./look";
import { DEMO_TAB_BARS, demoStudioScreens } from "./screens";
import type { LayoutBlock, LayoutContent } from "../pages/types";
import { clearPlatformSettingsCache, platformSetting } from "../settings/platform";
import { ALL_DEMO_TYPES, DEMO_ACCOUNT, DEMO_LICENSE_UNTIL, DEMO_SIGN_IN, DEMO_USER_NAME, demoIdOf, demoKind, isStudioDemo, PREMIUM_ACADEMY_DEMO, PREMIUM_ACADEMY_TEMPLATE, type DemoId } from "./constants";
import {
  BOOKING_RULES,
  CLINIC_INTAKE,
  CLINIC_RULES,
  COURSE_CURRENCY,
  DEMO_BRANDS,
  EVENT_SETTINGS,
  DONATION_CURRENCY,
  DELIVERY_DEMO_SETTINGS,
  FOOD_CUISINES,
  FOOD_DEMO_SETTINGS,
  RIDES_DEMO_DRIVERS,
  TAXI_DEMO_DRIVERS,
  FITNESS_PLANS,
  FITNESS_RULES,
  LISTING_SETTINGS,
  RESTAURANT_FULFILMENT,
  STORE_CURRENCY,
  STORE_FREE_SHIPPING_OVER_CENTS,
  STORE_SHIPPING_CENTS,
} from "./content";
import { demoArticles, demoBookingEntries, demoCampaigns, demoCourseEntries, demoDeliveryServices, demoEvents, demoListings, demoProducts, demoRestaurants, demoVehicleTypes, type EntryDeps } from "./entries";
import { savePicture, type DemoPicture, type PictureSize } from "./picture-assets";
import { refreshMarketplaceDemo, savingZadPictures } from "./marketplace";
import { refreshSchoolDay, syncSchoolStructure } from "./school";
import { ACADEMY_TEACHERS, syncAcademyTeachers, TEACHERS_CURRENCY } from "./teachers";
import { staffAppKindOf } from "../school/staff-app";

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

/** The demo's pictures, saved once per account (lib/demo/picture-assets.ts). */
async function picture(deps: DemoSetupDeps, clientId: string, name: DemoPicture, size: PictureSize, kind: AssetKind): Promise<string> {
  return savePicture(deps, { clientId }, name, size, kind);
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

/**
 * Studio's demos (delivery, food, rides) make the demo account the
 * company's test courier, restaurant staff and driver too, as the store
 * review account is: its parcels, orders and rides reach only itself.
 */
function hostedSettingsFor(deps: DemoSetupDeps, id: DemoId): HostedSettings {
  const studio = isStudioDemo(id);
  return {
    signupFields: [],
    signupAllowed: true,
    defaultCountryCode: DEMO_SIGN_IN.countryCode,
    deviceLimit: 0,
    supportWhatsapp: deps.contact.whatsapp,
    termsUrl: `${deps.platformUrl}/terms`,
    reviewPhone: studio ? DEMO_SIGN_IN.e164 : null,
    reviewCode: studio ? DEMO_SIGN_IN.code : null,
    // 118.3 Studio's demos: their own sign-in screen and account menu.
    ...(studio ? { studioScreens: demoStudioScreens(id, deps.platformUrl) } : {}),
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
    hostedSettings: hostedSettingsFor(deps, id),
    // Studio's own project types are Studio projects.
    ...(isStudioDemo(id) ? { section: "studio" as const } : {}),
    // 123 The premium academy keeps the template it started from, which tells it apart from the academy's own demo.
    ...(id === PREMIUM_ACADEMY_DEMO ? { design: PREMIUM_ACADEMY_TEMPLATE } : {}),
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
    // 116 Nakhla School's and Rawaq Academy's teachers and staff work in their staff app (Admin › Demo apps builds it).
    ...(staffAppKindOf({ appType: type, vertical }) ? { staffApp: "bundle" as const } : {}),
  };
  if (content === "courses" && id === "instructors") {
    // 110.5 Rawaq Academy: seven teachers' courses, and the demo teacher's Teacher tab.
    patch.catalogSettings = { currency: TEACHERS_CURRENCY, shippingCents: 0, freeShippingOverCents: null, payment: null };
    patch.courseSetup = await academySetupFor(deps, client.id, app);
  } else if (content === "courses") {
    patch.catalogSettings = { currency: COURSE_CURRENCY, shippingCents: 0, freeShippingOverCents: null, payment: null };
    patch.courseSetup = await courseSetupFor(deps, client.id, app.courseSetup, id === PREMIUM_ACADEMY_DEMO);
  } else if (content === "school") {
    // 110.5 Nakhla School's fees, paid on the demo payment page.
    patch.catalogSettings = { currency: "EGP", shippingCents: 0, freeShippingOverCents: null, payment: null };
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
  } else if (content === "bookings" && id === "fitness") {
    // 27 A gym: classes on a weekly timetable and memberships paid on the (demo) payment page.
    patch.bookingSetup = await fitnessSetupFor(deps, client.id);
    patch.catalogSettings = { currency: FITNESS_RULES.currency, shippingCents: 0, freeShippingOverCents: null, payment: null };
  } else if (content === "bookings") {
    patch.bookingSetup = await bookingSetupFor(deps, client.id, id === "clinic");
  } else if (content === "events") {
    // 28 Paid tickets go through the demo payment page, which charges nothing.
    patch.catalogSettings = { currency: EVENT_SETTINGS.currency, shippingCents: 0, freeShippingOverCents: null, payment: null };
  } else if (content === "campaigns") {
    // 29 No payment account: the demo's donation page charges nothing.
    patch.catalogSettings = { currency: DONATION_CURRENCY, shippingCents: 0, freeShippingOverCents: null, payment: null };
  }
  await store.updateApp(app.id, patch, now);
  const saved = (await store.getAppById(app.id))!;

  // A Business license that doesn't end.
  const license = await store.getLicenseForApp(client.id, saved.id);
  if (!license || license.plan !== "business" || license.expiresAt.getTime() !== DEMO_LICENSE_UNTIL.getTime() || license.nextPlan) {
    await activateClient(store, { clientId: client.id, appId: saved.id, plan: "business", activeUntil: DEMO_LICENSE_UNTIL, paymentNote: "" }, deps.encryptionKey, now);
  }

  if (content === "catalog") await syncProducts(deps, client.id, saved, id === "restaurant");
  // Studio's demos: a parcel company, food delivery from three restaurants, rides.
  if (content === "deliveries") await syncDelivery(deps, client.id, saved);
  // 115.15 Zad: two restaurants and a supermarket, offers, the club, the wallet, and the demo number's orders and complaints.
  if (content === "restaurants" && id === "marketplace") await refreshMarketplaceDemo(store, saved, now, { force: true, picture: savingZadPictures(deps, { clientId: client.id }, "product_image") });
  else if (content === "restaurants") await syncFood(deps, client.id, saved);
  if (content === "rides" && id === "taxi") await syncTaxi(deps, client.id, saved);
  else if (content === "rides") await syncRides(deps, client.id, saved);
  // 110.5 Nakhla School: its structure and people, then its school day.
  if (content === "school") await refreshSchoolDay(store, saved, now, { force: true, people: await syncSchoolStructure(store, saved, now) });
  if (content === "listings") await syncListings(deps, client.id, saved);
  if (content === "articles") await syncArticles(deps, client.id, saved);
  // 27 The timetable's classes for the coming weeks (the daily job keeps them going).
  if (id === "fitness") await syncClassSessions(store, saved, now);
  if (content === "events") await syncEvents(deps, client.id, saved);
  if (content === "campaigns") await syncCampaigns(deps, client.id, saved);
  await publishPages(deps, client.id, saved);

  // The account every visitor signs in to.
  const user = await store.getHostedUserByPhone(saved.id, DEMO_SIGN_IN.e164);
  if (!user) await store.createHostedUser({ appId: saved.id, phone: DEMO_SIGN_IN.e164, name: DEMO_USER_NAME, email: null, city: null, now });
  else if (user.name !== DEMO_USER_NAME) await store.updateHostedUser(saved.id, user.id, { name: DEMO_USER_NAME, email: null, city: null }, now);
  return { app: saved, created: !existing };
}

/** The demo's entries, made by the generators an app started from the demo gets its samples from (lib/demo/entries.ts). */
function entryDeps(deps: DemoSetupDeps, clientId: string): EntryDeps {
  // 128 The demos' real photos too (Sofra Eats's dishes, the academies' courses): savePicture saves them as Zad's are.
  return { store: deps.store, now: deps.now, picture: (name, size) => picture(deps, clientId, name, size, "product_image"), sample: false };
}

/** Courses with fixed IDs, so enrolments and progress keep pointing at the same course and lesson. */
async function courseSetupFor(deps: DemoSetupDeps, clientId: string, previous: CourseSetup | null, premium = false): Promise<CourseSetup> {
  // 128.8 Ufuq Academy's courses with their photos.
  const made = await demoCourseEntries(entryDeps(deps, clientId), { categories: [], nextId: 1, currency: COURSE_CURRENCY }, false, null, (id) => previous?.courses.find((c) => c.id === id)?.createdAt ?? deps.now.toISOString(), premium);
  return { currency: COURSE_CURRENCY, categories: made.categories, courses: made.courses, nextId: made.nextId };
}

/**
 * 110.5 Rawaq Academy: the teachers (lib/demo/teachers.ts) and their courses
 * with fixed IDs, each the course of its teacher, published; people may
 * apply to teach. The courses the visitor made as the demo teacher are kept.
 */
async function academySetupFor(deps: DemoSetupDeps, clientId: string, app: App): Promise<CourseSetup> {
  const photos = new Map<string, string>();
  for (const t of ACADEMY_TEACHERS) photos.set(t.name, await picture(deps, clientId, t.picture, "avatar", "product_image"));
  const teachers = await syncAcademyTeachers(deps.store, app, photos, deps.now);
  const made = await demoCourseEntries(entryDeps(deps, clientId), { categories: [], nextId: 1, currency: TEACHERS_CURRENCY }, true, teachers, (id) => app.courseSetup?.courses.find((c) => c.id === id)?.createdAt ?? deps.now.toISOString());
  const courses = made.courses;
  let next = made.nextId;
  // The visitor's own courses (as the demo teacher) after the demo's, with new IDs; the daily job deletes them after a day.
  const seeded = new Set(teachers.values());
  for (const own of app.courseSetup?.courses.filter((c) => c.teacherId && !seeded.has(c.teacherId) && c.teacherStage) ?? []) {
    courses.push({ ...own, id: next++, topics: own.topics.map((t) => ({ ...t, id: next++, lessons: t.lessons.map((l) => ({ ...l, id: next++ })) })) });
  }
  return { currency: TEACHERS_CURRENCY, categories: made.categories, courses, nextId: next, teachersApply: true };
}

/** The studio's services and team, or (21) the clinic's, with its doctors' profiles and intake form. */
async function bookingSetupFor(deps: DemoSetupDeps, clientId: string, clinic: boolean): Promise<BookingSetup> {
  const { categories, services, staff, nextId } = await demoBookingEntries(entryDeps(deps, clientId), { categories: [], nextId: 1, currency: BOOKING_RULES.currency }, clinic ? "clinic" : "salon");
  if (clinic) {
    return { rules: { ...CLINIC_RULES }, categories, services, staff, nextId, intakeFields: CLINIC_INTAKE.map((f) => ({ ...f, options: [...f.options] })) };
  }
  return { rules: { ...BOOKING_RULES }, categories, services, staff, nextId };
}

/**
 * 27 Pulse Studio: classes (on the timetable only) and personal training
 * (booked as an appointment), three coaches, a week of classes and two
 * plans. Fixed IDs, so a refresh keeps the classes and memberships made.
 */
async function fitnessSetupFor(deps: DemoSetupDeps, clientId: string): Promise<BookingSetup> {
  const made = await demoBookingEntries(entryDeps(deps, clientId), { categories: [], nextId: 1, currency: FITNESS_RULES.currency }, "fitness");
  let next = made.nextId;
  const membershipPlans = FITNESS_PLANS.map((p) => ({ id: next++, ...p, active: true }));
  return { rules: { ...FITNESS_RULES }, categories: made.categories, services: made.services, staff: made.staff, nextId: next, classTemplates: made.classTemplates, membershipPlans, membershipRequired: true };
}

/** Products by SKU and categories by name: updated in place; ones no longer in the demo are removed. 26 The café's dishes, with their options. */
async function syncProducts(deps: DemoSetupDeps, clientId: string, app: App, menu: boolean): Promise<void> {
  await demoProducts(entryDeps(deps, clientId), app, menu);
}

/** Listings by reference: updated in place; ones no longer in the demo are archived. */
async function syncListings(deps: DemoSetupDeps, clientId: string, app: App): Promise<void> {
  await deps.store.saveListingSettings(app.id, { ...LISTING_SETTINGS, contactName: DEMO_BRANDS.real_estate.appName }, deps.now);
  await demoListings(entryDeps(deps, clientId), app, LISTING_SETTINGS.currency);
}

/** 23 Sections by name and articles by title: updated in place; ones no longer in the demo are unpublished. */
async function syncArticles(deps: DemoSetupDeps, clientId: string, app: App): Promise<void> {
  await deps.store.saveNewsSettings(app.id, { showAuthor: true, showDates: true }, deps.now);
  await demoArticles(entryDeps(deps, clientId), app);
}

/**
 * 28 Events by title, dated a few days after the refresh so they're always
 * coming up; their ticket types by name. Events no longer in the demo go back
 * to drafts.
 */
async function syncEvents(deps: DemoSetupDeps, clientId: string, app: App): Promise<void> {
  await deps.store.saveEventSettings(app.id, { ...EVENT_SETTINGS }, deps.now);
  await demoEvents(entryDeps(deps, clientId), app, EVENT_SETTINGS, DEMO_BRANDS.events.appName);
}

/** 29 Campaigns by title: updated in place with the demo's totals; ones no longer in the demo go back to drafts. */
async function syncCampaigns(deps: DemoSetupDeps, clientId: string, app: App): Promise<void> {
  await deps.store.saveDonationSettings(app.id, { currency: DONATION_CURRENCY, iosMode: "browser" }, deps.now);
  await demoCampaigns(entryDeps(deps, clientId), app, DONATION_CURRENCY);
}

/** Sahm Express: prices by distance, its services, live tracking, couriers in the same app. */
async function syncDelivery(deps: DemoSetupDeps, clientId: string, app: App): Promise<void> {
  const { store, now } = deps;
  const saved = deliverySettingsOf(await store.getDeliverySettings(app.id));
  await store.saveDeliverySettings(app.id, { ...saved, ...DELIVERY_DEMO_SETTINGS, zones: [], cash: true, card: false, tracking: "live", assignment: "open", courierApp: "same" }, now);
  await demoDeliveryServices(entryDeps(deps, clientId), app, DELIVERY_DEMO_SETTINGS.currency);
}

/** Sofra Eats: one delivery price, its cuisines, three restaurants open all day with their menus. */
async function syncFood(deps: DemoSetupDeps, clientId: string, app: App): Promise<void> {
  const { store, now } = deps;
  const saved = deliverySettingsOf(await store.getDeliverySettings(app.id));
  await store.saveDeliverySettings(
    app.id,
    { ...saved, ...FOOD_DEMO_SETTINGS, zones: [], maxKm: null, cash: true, card: false, tracking: "live", assignment: "open", courierApp: "same", cuisines: FOOD_CUISINES.map((c) => ({ ...c })), foodCourierJob: "accepted", timezone: "Africa/Cairo" },
    now,
  );
  await demoRestaurants(entryDeps(deps, clientId), app, FOOD_DEMO_SETTINGS.currency);
}

/** Masar Rides: upfront fares, three vehicle types, the rider's code to start, booking for later. */
async function syncRides(deps: DemoSetupDeps, clientId: string, app: App): Promise<void> {
  const { store, now } = deps;
  const saved = deliverySettingsOf(await store.getDeliverySettings(app.id));
  const rides: RidesSettings = { ...DEFAULT_RIDES_SETTINGS, ...(saved.rides ?? {}), fareMode: "upfront", scheduling: true, pin: true, cancelFreeMinutes: 2, cancelFeeCents: 0, areas: [], promos: [] };
  await store.saveDeliverySettings(app.id, { ...saved, currency: "EGP", cash: true, card: false, courierApp: "same", timezone: "Africa/Cairo", rides }, now);
  const typeIds = await demoVehicleTypes(entryDeps(deps, clientId), app, false, "EGP");
  // 112.1 Its cars on the rider's map, as Lamha Taxi's.
  await syncDemoDrivers(deps, app, RIDES_DEMO_DRIVERS, typeIds);
}

/** The demo's drivers with their cars: never online, only drawn on the riders' map (lib/demo/taxi.ts), never offered a ride. */
async function syncDemoDrivers(deps: DemoSetupDeps, app: App, seeds: readonly (typeof TAXI_DEMO_DRIVERS)[number][], typeIds: Map<string, number>): Promise<void> {
  const { store, now } = deps;
  for (const seed of seeds) {
    const found = await store.findCourier(app.id, { phone: seed.phone, email: null });
    const driver = {
      ...EMPTY_DRIVER,
      ...(found?.driver ?? {}),
      vehicleTypeId: typeIds.get(seed.type) ?? null,
      carModel: seed.carModel,
      carColor: seed.carColor,
      plate: seed.plate,
      ratingCount: seed.rides,
      ratingSum: Math.round(seed.rating * seed.rides),
    };
    if (found) await store.updateCourier(app.id, found.id, { name: seed.name, active: true, onDuty: false, lat: null, lng: null, locatedAt: null, driver }, now);
    else await store.createCourier({ appId: app.id, name: seed.name, phone: seed.phone, email: null, vehicle: null, active: true, driver }, now);
  }
}

/**
 * 110.5 Lamha Taxi: the rides engine's settings with upfront fares and the
 * rider's code, its three vehicle types and its drivers with their cars. The
 * map is Admin › Settings › Maps (lib/taxi/service.ts); without a live
 * database the app asks Yallapp every few seconds.
 */
async function syncTaxi(deps: DemoSetupDeps, clientId: string, app: App): Promise<void> {
  const { store, now } = deps;
  const saved = deliverySettingsOf(await store.getDeliverySettings(app.id));
  const rides: RidesSettings = { ...DEFAULT_RIDES_SETTINGS, ...(saved.rides ?? {}), fareMode: "upfront", scheduling: false, pin: true, cancelFreeMinutes: 2, cancelFeeCents: 0, areas: [], promos: [] };
  await store.saveDeliverySettings(app.id, { ...saved, currency: "EGP", cash: true, card: false, courierApp: "same", timezone: "Africa/Cairo", rides, taxi: { ...DEFAULT_TAXI_SETTINGS } }, now);
  const typeIds = await demoVehicleTypes(entryDeps(deps, clientId), app, true, "EGP");
  await syncDemoDrivers(deps, app, TAXI_DEMO_DRIVERS, typeIds);
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

/**
 * How to sign in to a demo, shown to people not signed in, after the welcome
 * banner (128 at the end of a Studio demo's home), in the demo's languages.
 * The number is kept left to right and on one line in the Arabic.
 */
export function demoSignInBlock(): LayoutBlock {
  const phone = escapeHtml(DEMO_SIGN_IN.display);
  return {
    id: "demo-sign-in",
    type: "text",
    visibility: "signed_out",
    title: null,
    html: `<p><strong>This is a demo app.</strong> Sign in with ${phone} and the code ${DEMO_SIGN_IN.code}. Anything you add is deleted after a day.</p>`,
    translations: {
      ar: { html: `<p><strong>هذا تطبيق تجريبي.</strong> سجّل الدخول بالرقم \u2066${phone.replaceAll(" ", "\u00A0")}\u2069 والرمز ${DEMO_SIGN_IN.code}. يُحذف كل ما تضيفه بعد يوم.</p>` },
      tr: { html: `<p><strong>Bu bir demo uygulamasıdır.</strong> ${phone} numarası ve ${DEMO_SIGN_IN.code} koduyla giriş yapın. Eklediğiniz her şey bir gün sonra silinir.</p>` },
    },
  };
}

/**
 * The demo's pages and look: its design (lib/demo/look.ts), the same an
 * owner starts from with "Like our demo", with how to sign in to the demo.
 */
export async function demoLayout(deps: Pick<DemoSetupDeps, "assetUrl" | "now">, app: App, bannerAssetId: string): Promise<LayoutContent> {
  void bannerAssetId;
  const brand = DEMO_BRANDS[demoIdOf(app)];
  const base = defaultLayout({ ...app, brandingDoneAt: deps.now }, BUILT_IN_APP_DEFAULTS, deps.now);
  const designed = designLayout({ ...app, appName: brand.appName }, demoDesign(demoIdOf(app)), base, deps.now);
  const signIn = demoSignInBlock();
  // 123 The premium academy: the project its template starts, with how to sign in to the demo on its home (128 at its end).
  if (demoIdOf(app) === PREMIUM_ACADEMY_DEMO) return premiumAcademyLayout(deps, { ...app, appName: brand.appName }, base, signIn);
  const [home, ...rest] = designed.pages;
  // After the welcome banner, as before.
  const blocks = home!.blocks[0]?.id === "demo-banner" ? [home!.blocks[0], signIn, ...home!.blocks.slice(1)] : [signIn, ...home!.blocks];
  // Templates = demos: a Studio demo's home is its kind's designed page, the same its template starts a project with (a Studio page has no blocks).
  const id = demoIdOf(app);
  const ctx = isStudioDemo(id) ? demoStudioContext(id, appUrl(), itemSourcesFor(app)[0] ?? null) : null;
  // 124.7 With the demo's own words where its template asks the owner for theirs.
  const studio = ctx && isStudioDemo(id) ? withDemoFacts(id, demoStudioPage(id, ctx, [signIn])) : null;
  // 120 Every tab after the home a Studio page drawn around its screen, so each of the demo's pages can be changed in Studio.
  // 120.4 And every other screen of the app, so each can be changed in Studio too.
  const tabPages = ctx ? [...demoTabPages(designed.tabs, ctx), ...demoScreenPages(app, designed.tabs, ctx, new Set(designed.pages.map((p) => p.slug)))].map((p) => ({ ...p, show_title: false, updated_at: deps.now.toISOString(), blocks: [] })) : [];
  return {
    ...designed,
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
    // 119 A Studio demo's bar in its own design.
    ...(isStudioDemo(id) ? { tab_bar: DEMO_TAB_BARS[id] } : {}),
    ...(ctx ? { tabs: demoPageTabs(designed.tabs, ctx) } : {}),
    pages: [studio ? { ...home!, blocks: [], studio } : { ...home!, blocks }, ...rest, ...tabPages],
  };
}

/**
 * 123 The premium academy's demo is the project its template starts
 * (lib/studio/start.ts): its tabs, bar, screens' pages and look, with how
 * to sign in to the demo at the end of its home (128 after the approved
 * design), in the demo's languages.
 */
function premiumAcademyLayout(deps: Pick<DemoSetupDeps, "now">, app: App, base: LayoutContent, signIn: LayoutBlock): LayoutContent {
  const brand = DEMO_BRANDS[PREMIUM_ACADEMY_DEMO];
  const template = TEMPLATES.find((t) => t.id === PREMIUM_ACADEMY_TEMPLATE)!;
  const ctx = demoStudioContext(PREMIUM_ACADEMY_DEMO, appUrl(), itemSourcesFor(app)[0] ?? null);
  const started = startLayout(app, template, base, deps.now, ctx, null);
  const home = demoStudioPage(PREMIUM_ACADEMY_DEMO, ctx, [signIn]);
  return {
    ...started,
    appearance: { ...started.appearance, theme_mode: "system", user_can_change_mode: true },
    languages: { default: "en", available: [...brand.languages] },
    pages: started.pages.map((p) => (p.slug === "home" ? { ...p, blocks: [], studio: home } : p)),
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
export async function setupDemoApps(deps: DemoSetupDeps, types: readonly DemoId[] = ALL_DEMO_TYPES): Promise<DemoSetupResult> {
  const { client, created } = await demoAccount(deps);
  const apps: DemoSetupResult["apps"] = [];
  for (const type of ALL_DEMO_TYPES.filter((t) => types.includes(t))) {
    const result = await setupApp(deps, client, type);
    apps.push({ type, appId: result.app.id, created: result.created });
  }
  return { clientId: client.id, accountCreated: created, apps };
}
