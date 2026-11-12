import { addDays, localToUtc, utcToLocal } from "../bookings/time";
import { catalogSettings } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type {
  App,
  BookingCategory,
  BookingService,
  BookingStaff,
  ClassTemplate,
  Course,
  CourseSetup,
  Cuisine,
  Dish,
  EventInput,
  ListingInput,
  MenuSection,
  OpeningPeriod,
  RestaurantMenu,
} from "../data/types";
import { samplePrice } from "../samples/money";
import {
  ARTICLE_CATEGORIES,
  CLINIC_CATEGORIES,
  CLINIC_DOCTORS,
  CLINIC_HOURS,
  CLINIC_SERVICES,
  COURSE_CATEGORIES,
  COURSE_CURRENCY,
  DEMO_ARTICLES,
  DEMO_CAMPAIGNS,
  DEMO_COURSES,
  DEMO_DELIVERY_SERVICES,
  DEMO_DISHES,
  DEMO_EVENTS,
  DEMO_LISTINGS,
  DEMO_PRODUCTS,
  DEMO_RESTAURANTS,
  DEMO_SERVICES,
  DEMO_STAFF,
  DONATION_CURRENCY,
  EVENT_SETTINGS,
  FITNESS_CATEGORIES,
  FITNESS_COACHES,
  FITNESS_HOURS,
  FITNESS_SERVICES,
  FITNESS_TIMETABLE,
  FOOD_CUISINES,
  LISTING_SETTINGS,
  MENU_CATEGORIES,
  PRODUCT_CATEGORIES,
  RIDES_DEMO_TYPES,
  SERVICE_CATEGORIES,
  STORE_CURRENCY,
  STUDIO_HOURS,
  TAXI_DEMO_TYPES,
  BOOKING_RULES,
  type DemoRestaurant,
  type DemoService,
  type DemoStaff,
} from "./content";
import type { PictureName } from "./pictures";
import type { DemoPicture, PictureSize } from "./picture-assets";
import { ACADEMY_CATEGORIES, ACADEMY_COURSES, TEACHERS_CURRENCY } from "./teachers";

/**
 * Templates = demos: the demos' entries (products, courses, services and
 * their team, listings, articles, events, campaigns, a parcel company's
 * services, restaurants and their menus, vehicle types), made by one set of
 * generators for both. The demo apps get them as the demo has them (Admin ›
 * Demo apps, lib/demo/setup.ts); an app started from a demo gets the same
 * entries as samples (lib/samples/demo.ts): each marked `sample`, its prices
 * in the app's currency, its pictures the app's own, and nothing of the
 * owner's changed or removed. The demo's settings, its sign-in number and
 * its daily refresh stay with the demo.
 */

export interface EntryDeps {
  store: DataStore;
  now: Date;
  /** A drawn picture of the demo's as an asset: the demo account's, or the app's own for samples. */
  picture: (name: DemoPicture, size: PictureSize) => Promise<string>;
  /** Samples for an app started from the demo, rather than the demo app itself. */
  sample: boolean;
}

/** A demo's price in the app's currency: as it is for the demo, rounded as a price list would be for samples. */
export function priceFor(deps: Pick<EntryDeps, "sample">, cents: number, from: string, to: string): number {
  return deps.sample ? samplePrice(cents, from, to) : cents;
}

const marked = (deps: Pick<EntryDeps, "sample">) => (deps.sample ? { sample: true as const } : {});

const ALL_DAY: OpeningPeriod[] = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((day) => ({ day, opens: "00:00", closes: "23:59" }));

// ——— Products ———

/**
 * The shop's products, or (26) the café's dishes with their options, by SKU
 * and their categories by name. The demo's are updated in place and what is
 * no longer in the demo is removed; samples are only added.
 */
export async function demoProducts(deps: EntryDeps, app: App, menu: boolean): Promise<void> {
  const { store, now } = deps;
  const names = menu ? MENU_CATEGORIES : PRODUCT_CATEGORIES;
  const seeds = menu ? DEMO_DISHES : DEMO_PRODUCTS;
  const currency = catalogSettings(app).currency;
  const money = (cents: number) => priceFor(deps, cents, STORE_CURRENCY, currency);
  const categories = await store.listCatalogCategories(app.id);
  const categoryIds = new Map<string, number>();
  for (const name of names) {
    const found = categories.find((c) => c.name === name);
    categoryIds.set(name, found ? found.id : (await store.createCatalogCategory({ appId: app.id, name, now, ...marked(deps) })).id);
  }
  if (!deps.sample) for (const c of categories) if (!names.includes(c.name)) await store.deleteCatalogCategory(app.id, c.id, now);
  const products = await store.listCatalogProducts(app.id);
  // Created last to first, so the newest-first lists show them in the demo's order.
  for (const [i, seed] of [...seeds].reverse().entries()) {
    const priceCents = money(seed.priceCents);
    const sale = seed.salePriceCents === null ? null : money(seed.salePriceCents);
    const input = {
      appId: app.id,
      name: seed.name,
      description: seed.description,
      priceCents,
      salePriceCents: sale !== null && sale < priceCents ? sale : null,
      categoryIds: [categoryIds.get(seed.category)!],
      imageAssetIds: [await deps.picture(seed.picture, "product")],
      stock: null,
      digital: false,
      featured: seed.featured,
      active: true,
      // A sample has no SKU of the demo's: the owner's own SKUs and imports stay theirs.
      sku: deps.sample ? null : seed.sku,
      optionGroups: seed.optionGroups ? structuredClone(seed.optionGroups).map((g) => ({ ...g, options: g.options.map((o) => ({ ...o, priceDeltaCents: money(o.priceDeltaCents) })) })) : null,
      ...marked(deps),
    };
    if (deps.sample) {
      await store.createCatalogProduct(input, new Date(now.getTime() - (seeds.length - 1 - i) * 60_000));
      continue;
    }
    const found = products.find((p) => p.sku === seed.sku);
    if (found) await store.updateCatalogProduct(app.id, found.id, input, now);
    else await store.createCatalogProduct(input, now);
  }
  if (deps.sample) return;
  const skus = new Set(seeds.map((p) => p.sku));
  for (const p of products) if (!p.sku || !skus.has(p.sku)) await store.deleteCatalogProduct(app.id, p.id);
}

// ——— Courses ———

/** What the courses are made from: the academy's (105.3 each its teacher's) or the online school's. */
export function demoCourseSeeds(academy: boolean) {
  return academy
    ? {
        currency: TEACHERS_CURRENCY,
        categories: ACADEMY_CATEGORIES,
        courses: ACADEMY_COURSES.map((c) => ({ ...c, instructor: c.teacher })),
      }
    : { currency: COURSE_CURRENCY, categories: COURSE_CATEGORIES, courses: DEMO_COURSES.map((c) => ({ ...c, teacher: null as string | null })) };
}

/**
 * The demo's courses with their categories, after the setup's: the demo's
 * start from ID 1 (fixed IDs, so enrolments and progress keep pointing at the
 * same course and lesson); samples come after the owner's, with the
 * categories they don't have yet. `teachers` are the academy's by name.
 */
export async function demoCourseEntries(
  deps: EntryDeps,
  setup: Pick<CourseSetup, "categories" | "nextId" | "currency">,
  academy: boolean,
  teachers: Map<string, number> | null,
  createdAt: (id: number) => string,
): Promise<{ categories: CourseSetup["categories"]; courses: Course[]; nextId: number }> {
  const seeds = demoCourseSeeds(academy);
  let next = setup.nextId;
  const categories = [...setup.categories];
  for (const name of seeds.categories) if (!categories.some((c) => c.name === name)) categories.push({ id: next++, name, ...marked(deps) });
  const courses: Course[] = [];
  for (const seed of seeds.courses) {
    const id = next++;
    courses.push({
      id,
      title: seed.title,
      description: seed.description,
      imageAssetId: await deps.picture(seed.picture, "course"),
      priceCents: priceFor(deps, seed.priceCents, seeds.currency, setup.currency),
      categoryIds: categories.filter((c) => c.name === seed.category).map((c) => c.id),
      instructorName: seed.instructor,
      level: seed.level,
      active: true,
      ...(academy ? { teacherId: teachers?.get(seed.teacher ?? "") ?? null, teacherStage: null } : {}),
      ...marked(deps),
      createdAt: createdAt(id),
      topics: seed.topics.map((topic) => ({
        id: next++,
        title: topic.title,
        lessons: topic.lessons.map((lesson) => ({ id: next++, title: lesson.title, videoUrl: null, text: lesson.text, durationMinutes: lesson.minutes, preview: lesson.preview === true })),
      })),
    });
  }
  return { categories, courses, nextId: next };
}

// ——— Services and the team ———

export type BookingDemo = "salon" | "clinic" | "fitness";

const BOOKINGS: Record<BookingDemo, { categories: string[]; services: DemoService[]; staff: DemoStaff[]; hours: typeof STUDIO_HOURS }> = {
  salon: { categories: SERVICE_CATEGORIES, services: DEMO_SERVICES, staff: DEMO_STAFF, hours: STUDIO_HOURS },
  clinic: { categories: CLINIC_CATEGORIES, services: CLINIC_SERVICES, staff: CLINIC_DOCTORS, hours: CLINIC_HOURS },
  fitness: { categories: FITNESS_CATEGORIES, services: FITNESS_SERVICES, staff: FITNESS_COACHES, hours: FITNESS_HOURS },
};

/**
 * The studio's services and team, (21) the clinic's with its doctors'
 * profiles, or (27) the gym's classes, coaches and weekly timetable, after
 * the setup's (the demo's from ID 1, so a refresh keeps what was booked).
 */
export async function demoBookingEntries(
  deps: EntryDeps,
  setup: { categories: BookingCategory[]; nextId: number; currency: string },
  which: BookingDemo,
): Promise<{ categories: BookingCategory[]; services: BookingService[]; staff: BookingStaff[]; classTemplates: ClassTemplate[]; nextId: number }> {
  const set = BOOKINGS[which];
  let next = setup.nextId;
  const categories = [...setup.categories];
  for (const name of set.categories) if (!categories.some((c) => c.name === name)) categories.push({ id: next++, name, ...marked(deps) });
  const services: BookingService[] = [];
  for (const seed of set.services) {
    services.push({
      id: next++,
      categoryId: categories.find((c) => c.name === seed.category)?.id ?? null,
      name: seed.name,
      description: seed.description,
      durationMinutes: seed.minutes,
      priceCents: priceFor(deps, seed.priceCents, BOOKING_RULES.currency, setup.currency),
      imageAssetId: await deps.picture(seed.picture, "product"),
      color: seed.color,
      // 27 Classes are booked on the timetable; only personal training is booked as an appointment.
      active: which !== "fitness" || seed.category !== "Classes",
      ...marked(deps),
    });
  }
  const staff: BookingStaff[] = [];
  for (const seed of set.staff) {
    staff.push({
      id: next++,
      name: seed.name,
      title: seed.title,
      imageAssetId: await deps.picture(seed.picture, "avatar"),
      serviceIds: services.filter((s) => seed.services.includes(s.name)).map((s) => s.id),
      hours: set.hours.map((ranges) => ranges.map((r) => ({ ...r }))),
      daysOff: [],
      active: true,
      ...(seed.specialties ? { specialties: [...seed.specialties], languages: [...(seed.languages ?? [])], bio: seed.bio ?? null } : {}),
      ...marked(deps),
    });
  }
  const classTemplates: ClassTemplate[] =
    which === "fitness"
      ? FITNESS_TIMETABLE.map(([name, coach, weekday, time, capacity]) => {
          const service = services.find((s) => s.name === name)!;
          return { id: next++, serviceId: service.id, staffId: staff.find((s) => s.name === coach)!.id, weekday, time, durationMinutes: service.durationMinutes, capacity, active: true };
        })
      : [];
  return { categories, services, staff, classTemplates, nextId: next };
}

// ——— Listings, articles, events, campaigns ———

/** Listings by reference: the demo's updated in place, ones no longer in it archived; samples added. */
export async function demoListings(deps: EntryDeps, app: App, currency: string): Promise<void> {
  const { store, now } = deps;
  const listings = await store.listListings(app.id);
  for (const [i, seed] of [...DEMO_LISTINGS].reverse().entries()) {
    const imageAssetIds: string[] = [];
    for (const name of seed.pictures) imageAssetIds.push(await deps.picture(name, "home"));
    const found = deps.sample ? undefined : listings.find((l) => l.reference === seed.reference);
    const at = deps.sample ? new Date(now.getTime() - (DEMO_LISTINGS.length - 1 - i) * 60_000) : now;
    const input: ListingInput = {
      appId: app.id,
      reference: deps.sample ? null : seed.reference,
      title: seed.title,
      description: seed.description,
      purpose: seed.purpose,
      type: seed.type,
      priceCents: priceFor(deps, seed.priceCents, LISTING_SETTINGS.currency, currency),
      currency: deps.sample ? currency : LISTING_SETTINGS.currency,
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
      publishedAt: found?.publishedAt ?? at,
      ...marked(deps),
    };
    if (found) await store.updateListing(app.id, found.id, input, now);
    else await store.createListing(input, at);
  }
  if (deps.sample) return;
  const references = new Set(DEMO_LISTINGS.map((l) => l.reference));
  for (const l of listings) if ((!l.reference || !references.has(l.reference)) && l.status !== "archived") await store.updateListing(app.id, l.id, { status: "archived" }, now);
}

/** 23 Sections by name and articles by title: the demo's updated in place, ones no longer in it unpublished; samples added. */
export async function demoArticles(deps: EntryDeps, app: App): Promise<void> {
  const { store, now } = deps;
  const categories = await store.listArticleCategories(app.id);
  const categoryIds = new Map<string, number>();
  const after = deps.sample ? Math.max(-1, ...categories.map((c) => c.position)) + 1 : 0;
  for (const [i, name] of ARTICLE_CATEGORIES.entries()) {
    const position = after + i;
    const found = categories.find((c) => c.name === name);
    if (found) {
      if (!deps.sample && found.position !== position) await store.updateArticleCategory(app.id, found.id, { position });
      categoryIds.set(name, found.id);
    } else {
      categoryIds.set(name, (await store.createArticleCategory({ appId: app.id, name, position, createdAt: now, ...marked(deps) })).id);
    }
  }
  if (!deps.sample) for (const c of categories) if (!ARTICLE_CATEGORIES.includes(c.name)) await store.deleteArticleCategory(app.id, c.id);
  const articles = await store.listArticles(app.id);
  // Created oldest first, so the newest-first lists show them in the demo's order.
  for (const seed of [...DEMO_ARTICLES].reverse()) {
    // Dated before the refresh, the way a news site's articles are.
    const publishedAt = new Date(now.getTime() - seed.hoursAgo * 3_600_000);
    const input = {
      appId: app.id,
      title: seed.title,
      excerpt: seed.excerpt,
      body: seed.body,
      imageAssetId: await deps.picture(seed.picture, "course"),
      author: seed.author,
      categoryIds: [categoryIds.get(seed.category)!],
      featured: seed.featured,
      status: "published" as const,
      publishedAt,
      ...marked(deps),
    };
    const found = deps.sample ? undefined : articles.find((a) => a.title === seed.title);
    if (found) await store.updateArticle(app.id, found.id, input, now);
    else await store.createArticle(input, deps.sample ? publishedAt : now);
  }
  if (deps.sample) return;
  const titles = new Set(DEMO_ARTICLES.map((a) => a.title));
  for (const a of articles) if (!titles.has(a.title) && a.status !== "draft") await store.updateArticle(app.id, a.id, { status: "draft" }, now);
}

/**
 * 28 Events by title, dated a few days from now so they're always coming
 * up, with their ticket types by name; the demo's no longer in it go back
 * to drafts. `settings` are the app's events settings (the demo's own).
 */
export async function demoEvents(deps: EntryDeps, app: App, settings: { currency: string; timeZone: string }, organiser: string): Promise<void> {
  const { store, now } = deps;
  const events = await store.listEvents(app.id);
  const today = utcToLocal(now, settings.timeZone).date;
  for (const [i, seed] of DEMO_EVENTS.entries()) {
    const startAt = localToUtc(addDays(today, seed.daysAhead), seed.start, settings.timeZone);
    const at = deps.sample ? new Date(now.getTime() - i * 60_000) : now;
    const input: EventInput = {
      appId: app.id,
      title: seed.title,
      description: seed.description,
      category: seed.category,
      imageAssetIds: [await deps.picture(seed.picture, "course")],
      startAt,
      endAt: new Date(startAt.getTime() + seed.minutes * 60_000),
      venueName: seed.venue?.name ?? null,
      venueAddress: seed.venue?.address ?? null,
      latitude: seed.venue?.latitude ?? null,
      longitude: seed.venue?.longitude ?? null,
      onlineUrl: seed.onlineUrl,
      organiser,
      capacity: seed.capacity,
      status: "published",
      publishedAt: at,
      ...marked(deps),
    };
    const found = deps.sample ? undefined : events.find((e) => e.title === seed.title);
    const event = found ?? (await store.createEvent(input, at));
    if (found) await store.updateEvent(app.id, found.id, input, now);
    const types = found ? await store.listTicketTypes(app.id, event.id) : [];
    for (const [position, t] of seed.ticketTypes.entries()) {
      const fields = { name: t.name, priceCents: priceFor(deps, t.priceCents, EVENT_SETTINGS.currency, settings.currency), capacity: t.capacity, saleEndsAt: null, maxPerOrder: t.maxPerOrder, position };
      const existing = types.find((x) => x.name === t.name);
      if (existing) await store.updateTicketType(app.id, existing.id, fields);
      else await store.createTicketType({ ...fields, appId: app.id, eventId: event.id }, now);
    }
    const names = new Set(seed.ticketTypes.map((t) => t.name));
    for (const t of types) if (!names.has(t.name)) await store.deleteTicketType(app.id, t.id);
  }
  if (deps.sample) return;
  const titles = new Set(DEMO_EVENTS.map((e) => e.title));
  for (const e of events) if (!titles.has(e.title) && e.status !== "draft") await store.updateEvent(app.id, e.id, { status: "draft" }, now);
}

/** 29 Campaigns by title, with the demo's totals (never more than a goal); the demo's no longer in it go back to drafts. */
export async function demoCampaigns(deps: EntryDeps, app: App, currency: string): Promise<void> {
  const { store, now } = deps;
  const money = (cents: number) => priceFor(deps, cents, DONATION_CURRENCY, currency);
  const campaigns = await store.listCampaigns(app.id);
  // Created last first, so the newest-first lists show them in the demo's order.
  for (const [i, seed] of DEMO_CAMPAIGNS.map((c, at) => [at, c] as const).reverse()) {
    const imageAssetIds: string[] = [];
    for (const name of seed.pictures) imageAssetIds.push(await deps.picture(name, "course"));
    const goalCents = money(seed.goalCents);
    const input = {
      appId: app.id,
      title: seed.title,
      summary: seed.summary,
      story: seed.story,
      imageAssetIds,
      goalCents,
      presetCents: deps.sample ? [...new Set(seed.presetCents.map(money))].sort((a, b) => a - b) : seed.presetCents,
      allowCustomAmount: true,
      minCents: money(seed.minCents),
      endsAt: new Date(now.getTime() + seed.endsInDays * 86_400_000),
      status: "open" as const,
      featured: seed.featured,
      publishedAt: new Date(now.getTime() - (i + 1) * 7 * 86_400_000),
      ...marked(deps),
    };
    const found = deps.sample ? undefined : campaigns.find((c) => c.title === seed.title);
    const at = deps.sample ? new Date(now.getTime() - i * 60_000) : now;
    const id = found ? (await store.updateCampaign(app.id, found.id, input, now), found.id) : (await store.createCampaign(input, at)).id;
    await store.setCampaignTotals(app.id, id, { raisedCents: deps.sample ? Math.min(money(seed.raisedCents), goalCents) : seed.raisedCents, donorCount: seed.donorCount });
  }
  if (deps.sample) return;
  const titles = new Set(DEMO_CAMPAIGNS.map((c) => c.title));
  for (const c of campaigns) if (!titles.has(c.title) && c.status !== "draft") await store.updateCampaign(app.id, c.id, { status: "draft" }, now);
}

// ——— Delivery, food and rides ———

/** Sahm Express's services by name: the demo's updated in place; samples added. */
export async function demoDeliveryServices(deps: EntryDeps, app: App, currency: string): Promise<void> {
  const { store, now } = deps;
  const services = await store.listDeliveryServices(app.id);
  for (const [position, service] of DEMO_DELIVERY_SERVICES.entries()) {
    const imageAssetId = await deps.picture(service.picture, "product");
    const extraCents = priceFor(deps, service.extraCents, "EGP", currency);
    const input = { appId: app.id, name: service.name, description: service.description, imageAssetId, extraCents, eta: service.eta, position: position + 1, active: true, ...marked(deps) };
    const found = deps.sample ? undefined : services.find((s) => s.name === service.name);
    if (found) await store.updateDeliveryService(app.id, found.id, input, now);
    else await store.createDeliveryService(input, now);
  }
}

/** A restaurant's menu with fixed IDs, so carts and orders keep pointing at the same dishes. */
export function demoMenu(restaurant: DemoRestaurant, pictureIds: Map<PictureName, string>, money: (cents: number) => number = (c) => c): RestaurantMenu {
  let next = 1;
  const id = () => next++;
  const sections: MenuSection[] = restaurant.sections.map((section) => ({
    id: id(),
    name: section.name,
    dishes: section.dishes.map((dish): Dish => ({
      id: id(),
      name: dish.name,
      description: dish.description,
      imageAssetId: pictureIds.get(dish.picture) ?? null,
      priceCents: money(dish.priceCents),
      available: true,
      popular: dish.popular ?? false,
      choiceGroups: dish.choices
        ? [{ id: id(), name: dish.choices.name, min: dish.choices.min, max: dish.choices.max, choices: dish.choices.options.map(([name, extraCents]) => ({ id: id(), name, extraCents: money(extraCents), available: true })) }]
        : [],
    })),
  }));
  return { sections, nextId: next };
}

/**
 * The cuisines these restaurants are filed under, after the company's: the
 * ones it has (by ID or name) are used, the others added (marked `sample`
 * for samples). Returns the cuisines and the ID each of these has.
 */
export function withCuisines(deps: Pick<EntryDeps, "sample">, saved: readonly Cuisine[], wanted: readonly Cuisine[]): { cuisines: Cuisine[]; ids: Map<string, string> } {
  const cuisines = [...saved];
  const ids = new Map<string, string>();
  for (const c of wanted) {
    const found = cuisines.find((x) => x.id === c.id || x.name === c.name);
    if (found) ids.set(c.id, found.id);
    else {
      cuisines.push({ id: c.id, name: c.name, ...marked(deps) });
      ids.set(c.id, c.id);
    }
  }
  return { cuisines, ids };
}

/** Sofra Eats's three restaurants, open all day, with their menus: the demo's updated in place by name; samples added. */
export async function demoRestaurants(deps: EntryDeps, app: App, currency: string, cuisineIds: Map<string, string> = new Map()): Promise<void> {
  const { store, now } = deps;
  const money = (cents: number) => priceFor(deps, cents, "EGP", currency);
  const restaurants = await store.listRestaurants(app.id);
  const after = deps.sample ? Math.max(0, ...restaurants.map((r) => r.position)) : 0;
  for (const [position, restaurant] of DEMO_RESTAURANTS.entries()) {
    const pictureIds = new Map<PictureName, string>();
    for (const dish of restaurant.sections.flatMap((s) => s.dishes)) {
      if (!pictureIds.has(dish.picture)) pictureIds.set(dish.picture, await deps.picture(dish.picture, "product"));
    }
    const logoAssetId = await deps.picture(restaurant.logo, "avatar");
    const input = {
      appId: app.id,
      name: restaurant.name,
      description: restaurant.description,
      logoAssetId,
      coverAssetId: null,
      cuisines: restaurant.cuisines.map((c) => cuisineIds.get(c) ?? c),
      address: { address: restaurant.address, details: null, lat: null, lng: null },
      phone: null,
      hours: ALL_DAY,
      prepMinutes: restaurant.prepMinutes,
      minOrderCents: money(restaurant.minOrderCents),
      maxKm: null,
      commissionBp: 1000,
      active: true,
      position: after + position + 1,
      ...marked(deps),
    };
    const menu = demoMenu(restaurant, pictureIds, money);
    const found = deps.sample ? undefined : restaurants.find((r) => r.name === restaurant.name);
    if (found) {
      await store.updateRestaurant(app.id, found.id, input, now);
      await store.saveRestaurantMenu(app.id, found.id, menu, now);
    } else {
      await store.createRestaurant(input, menu, now);
    }
  }
}

/** Sofra Eats's cuisines. */
export const DEMO_FOOD_CUISINES: readonly Cuisine[] = FOOD_CUISINES;

/** Masar Rides's or (110.5) Lamha Taxi's vehicle types by name: the demo's updated in place; samples added. Returns their IDs by name. */
export async function demoVehicleTypes(deps: EntryDeps, app: App, taxi: boolean, currency: string): Promise<Map<string, number>> {
  const { store, now } = deps;
  const money = (cents: number) => priceFor(deps, cents, "EGP", currency);
  const types = await store.listVehicleTypes(app.id);
  const after = deps.sample ? Math.max(0, ...types.map((t) => t.position)) : 0;
  const typeIds = new Map<string, number>();
  for (const [position, type] of (taxi ? TAXI_DEMO_TYPES : RIDES_DEMO_TYPES).entries()) {
    const prices = deps.sample
      ? { baseCents: money(type.baseCents), perKmCents: money(type.perKmCents), perMinuteCents: money(type.perMinuteCents), minCents: money(type.minCents), waitPerMinuteCents: money(type.waitPerMinuteCents) }
      : {};
    // 124.7 Its car in a design's drawing, where one fits it.
    const { picture, ...fields } = type;
    const imageAssetId = picture ? await deps.picture(picture, "product") : null;
    const input = { appId: app.id, ...fields, ...prices, imageAssetId, position: after + position + 1, active: true, ...marked(deps) };
    const found = deps.sample ? undefined : types.find((t) => t.name === type.name);
    if (found) await store.updateVehicleType(app.id, found.id, input, now);
    typeIds.set(type.name, found ? found.id : (await store.createVehicleType(input, now)).id);
  }
  return typeIds;
}
