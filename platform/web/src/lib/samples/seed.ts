import { addDays, localToUtc, utcToLocal } from "../bookings/time";
import { bookingSetup } from "../bookings/setup";
import { catalogSettings } from "../catalog/settings";
import { courseSetup } from "../courses/setup";
import type { DataStore } from "../data/store";
import type {
  App,
  BookingService,
  BookingStaff,
  CatalogOptionGroup,
  Course,
  Cuisine,
  Dish,
  MenuSection,
  OpeningPeriod,
  RestaurantMenu,
} from "../data/types";
import { deliverySettingsOf } from "../delivery/settings";
import { STUDIO_HOURS } from "../demo/content";
import { savePicture, type PictureDeps, type PictureSize } from "../demo/picture-assets";
import type { PictureName } from "../demo/pictures";
import { donationSettingsOf } from "../donations/service";
import { eventSettingsOf } from "../events/service";
import { listingSettingsFor } from "../listings/types";
import {
  SAMPLE_ARTICLES,
  SAMPLE_CAMPAIGNS,
  SAMPLE_CLINIC,
  SAMPLE_COURSES,
  SAMPLE_DELIVERY_SERVICES,
  SAMPLE_EVENTS,
  SAMPLE_FITNESS,
  SAMPLE_LISTINGS,
  SAMPLE_MENU,
  SAMPLE_PRODUCTS,
  SAMPLE_RESTAURANTS,
  SAMPLE_SALON,
  SAMPLE_SCHOOL_NEWS,
  SAMPLE_SERVICES,
  SAMPLE_TEACHERS,
  SAMPLE_VEHICLE_TYPES,
  START_TOPIC,
  sampleLang,
  type SampleBookings,
  type SampleLang,
} from "./content";
import { countList, listsForSources, sampleListsOf, type SampleList } from "./lists";
import { samplePrice } from "./money";

/**
 * 110.2 Sample entries: when a design is chosen for an app whose content is
 * kept in Yallapp, each list the design shows that is still empty gets 6 to
 * 8 believable entries with pictures, prices and a few categories, in the
 * app's main language and currency, each marked `sample`. A list that has
 * any entry is left alone; apps whose content comes from a website or a
 * platform get none (lib/samples/lists.ts).
 */

export type SampleDeps = PictureDeps;

/** The app's main language, as its pages say (the draft's); English until it has pages. */
export async function appMainLanguage(store: DataStore, app: Pick<App, "id">): Promise<SampleLang> {
  return sampleLang((await store.getAppLayout(app.id))?.draft.languages.default);
}

interface Seeding {
  deps: SampleDeps;
  app: App;
  lang: SampleLang;
  /** Sample teachers made now, by their name in `lang`. */
  teachers: Map<string, number>;
}

const picture = (s: Seeding, name: PictureName, size: PictureSize) => savePicture(s.deps, { clientId: s.app.clientId, appId: s.app.id }, name, size, "product_image");

/** Seconds apart, newest first in the order given, so the lists that show the newest first keep the samples' order. */
const ago = (now: Date, i: number, step = 60_000) => new Date(now.getTime() - i * step);

/**
 * Fills each of the lists these item sources show that is empty (all the
 * app's lists without `sources`). Returns the lists filled.
 */
export async function seedSamples(deps: SampleDeps, appId: string, options: { sources?: Iterable<string>; lang?: SampleLang } = {}): Promise<SampleList[]> {
  let app = await deps.store.getAppById(appId);
  if (!app) return [];
  const lists = options.sources ? listsForSources(app, options.sources) : sampleListsOf(app);
  if (!lists.length) return [];
  const seeding: Seeding = { deps, app, lang: options.lang ?? (await appMainLanguage(deps.store, app)), teachers: new Map() };
  const filled: SampleList[] = [];
  for (const list of lists) {
    // Courses and services live on the app: read it again after each list.
    app = (await deps.store.getAppById(appId))!;
    seeding.app = app;
    const { samples, own } = await countList(deps.store, app, list);
    if (samples + own > 0) continue;
    if (await SEEDERS[list](seeding)) filled.push(list);
  }
  return filled;
}

const SEEDERS: Record<SampleList, (s: Seeding) => Promise<boolean>> = {
  teachers: seedTeachers,
  courses: seedCourses,
  products: seedProducts,
  services: seedServices,
  staff: seedStaff,
  listings: seedListings,
  articles: seedArticles,
  events: seedEvents,
  campaigns: seedCampaigns,
  delivery_services: seedDeliveryServices,
  restaurants: seedRestaurants,
  vehicle_types: seedVehicleTypes,
  school_news: seedSchoolNews,
};

// ——— Courses ———

async function seedTeachers(s: Seeding): Promise<boolean> {
  const { store, now } = s.deps;
  for (const seed of SAMPLE_TEACHERS) {
    const made = await store.createTeacher(
      {
        appId: s.app.id,
        name: seed.name[s.lang],
        // Nobody signs in as a sample teacher.
        phone: null,
        email: null,
        userId: null,
        photoAssetId: await picture(s, seed.picture, "avatar"),
        bio: seed.bio[s.lang],
        subjects: [...seed.subjects[s.lang]],
        status: "active",
        shareBp: 7000,
        featured: seed.featured,
        sample: true,
      },
      now,
    );
    if (made.ok) s.teachers.set(seed.name[s.lang], made.teacher.id);
  }
  return s.teachers.size > 0;
}

async function seedCourses(s: Seeding): Promise<boolean> {
  const setup = courseSetup(s.app);
  let next = setup.nextId;
  const categories = [...setup.categories];
  const categoryId = (key: string): number => {
    const name = SAMPLE_COURSES.categories[key]![s.lang];
    const found = categories.find((c) => c.name === name);
    if (found) return found.id;
    const made = { id: next++, name, sample: true };
    categories.push(made);
    return made.id;
  };
  const courses: Course[] = [];
  for (const [i, seed] of SAMPLE_COURSES.courses.entries()) {
    const id = next++;
    const topics = s.lang === "en" && seed.topics.length ? seed.topics : START_TOPIC[s.lang];
    const teacherId = s.teachers.get(seed.instructor[s.lang]);
    courses.push({
      id,
      title: seed.title[s.lang],
      description: seed.description[s.lang],
      imageAssetId: await picture(s, seed.picture, "course"),
      priceCents: samplePrice(seed.priceCents, SAMPLE_COURSES.currency, setup.currency),
      categoryIds: [categoryId(seed.category)],
      instructorName: seed.instructor[s.lang],
      level: seed.level[s.lang],
      active: true,
      ...(teacherId ? { teacherId } : {}),
      sample: true,
      createdAt: ago(s.deps.now, i).toISOString(),
      topics: topics.map((topic) => ({
        id: next++,
        title: topic.title,
        lessons: topic.lessons.map((lesson) => ({ id: next++, title: lesson.title, videoUrl: null, text: lesson.text, durationMinutes: lesson.minutes, preview: lesson.preview === true })),
      })),
    });
  }
  await s.deps.store.updateApp(s.app.id, { courseSetup: { ...setup, categories, courses: [...setup.courses, ...courses], nextId: next } }, s.deps.now);
  return true;
}

// ——— Products ———

function optionGroups(groups: (typeof SAMPLE_PRODUCTS.products)[number]["optionGroups"], lang: SampleLang, from: string, to: string): CatalogOptionGroup[] | null {
  if (!groups?.length) return null;
  return groups.map((g) => ({
    id: g.id,
    name: g.name[lang],
    min: g.min,
    max: g.max,
    options: g.options.map((o) => ({ id: o.id, name: o.name[lang], priceDeltaCents: samplePrice(o.priceDeltaCents, from, to) })),
  }));
}

async function seedProducts(s: Seeding): Promise<boolean> {
  const { store, now } = s.deps;
  const set = s.app.vertical === "restaurant" ? SAMPLE_MENU : SAMPLE_PRODUCTS;
  const currency = catalogSettings(s.app).currency;
  const existing = await store.listCatalogCategories(s.app.id);
  const categoryIds = new Map<string, number>();
  for (const [key, names] of Object.entries(set.categories)) {
    const found = existing.find((c) => c.name === names[s.lang]);
    categoryIds.set(key, found ? found.id : (await store.createCatalogCategory({ appId: s.app.id, name: names[s.lang], now, sample: true })).id);
  }
  // Created last to first, so the newest-first lists show them in order.
  for (const [i, seed] of [...set.products.entries()].reverse()) {
    const priceCents = samplePrice(seed.priceCents, set.currency, currency);
    const sale = seed.salePriceCents === null ? null : samplePrice(seed.salePriceCents, set.currency, currency);
    await store.createCatalogProduct(
      {
        appId: s.app.id,
        name: seed.name[s.lang],
        description: seed.description[s.lang],
        priceCents,
        salePriceCents: sale !== null && sale < priceCents ? sale : null,
        categoryIds: [categoryIds.get(seed.category)!],
        imageAssetIds: [await picture(s, seed.picture, "product")],
        stock: null,
        digital: false,
        featured: seed.featured,
        active: true,
        sku: null,
        optionGroups: optionGroups(seed.optionGroups, s.lang, set.currency, currency),
        sample: true,
      },
      ago(now, i),
    );
  }
  return true;
}

// ——— Services and the team ———

function bookingsOf(app: App): SampleBookings {
  if (app.vertical === "clinic") return SAMPLE_CLINIC;
  if (app.vertical === "fitness") return SAMPLE_FITNESS;
  if (app.vertical === "services") return SAMPLE_SERVICES;
  return SAMPLE_SALON;
}

async function seedServices(s: Seeding): Promise<boolean> {
  const setup = bookingSetup(s.app);
  const set = bookingsOf(s.app);
  let next = setup.nextId;
  const categories = [...setup.categories];
  const categoryId = (key: string): number => {
    const name = set.categories[key]![s.lang];
    const found = categories.find((c) => c.name === name);
    if (found) return found.id;
    const made = { id: next++, name, sample: true };
    categories.push(made);
    return made.id;
  };
  const services: BookingService[] = [];
  for (const seed of set.services) {
    services.push({
      id: next++,
      categoryId: categoryId(seed.category),
      name: seed.name[s.lang],
      description: seed.description[s.lang],
      durationMinutes: seed.minutes,
      priceCents: samplePrice(seed.priceCents, set.currency, setup.rules.currency),
      imageAssetId: await picture(s, seed.picture, "product"),
      color: seed.color,
      active: true,
      sample: true,
    });
  }
  await s.deps.store.updateApp(s.app.id, { bookingSetup: { ...setup, categories, services: [...setup.services, ...services], nextId: next } }, s.deps.now);
  return true;
}

async function seedStaff(s: Seeding): Promise<boolean> {
  const setup = bookingSetup(s.app);
  // The team works on the sample services: only with them.
  if (!setup.services.some((x) => x.sample)) return false;
  const set = bookingsOf(s.app);
  const serviceId = new Map(set.services.map((seed) => [seed.name.en, setup.services.find((x) => x.sample && x.name === seed.name[s.lang])?.id]));
  let next = setup.nextId;
  const staff: BookingStaff[] = [];
  for (const seed of set.staff) {
    staff.push({
      id: next++,
      name: seed.name[s.lang],
      title: seed.title[s.lang],
      imageAssetId: await picture(s, seed.picture, "avatar"),
      serviceIds: seed.services.map((name) => serviceId.get(name)).filter((id): id is number => id !== undefined),
      hours: STUDIO_HOURS.map((ranges) => ranges.map((r) => ({ ...r }))),
      daysOff: [],
      active: true,
      ...(seed.profile ? { specialties: [...seed.profile.specialties[s.lang]], languages: [...seed.profile.languages[s.lang]], bio: seed.profile.bio[s.lang] } : {}),
      sample: true,
    });
  }
  await s.deps.store.updateApp(s.app.id, { bookingSetup: { ...setup, staff: [...setup.staff, ...staff], nextId: next } }, s.deps.now);
  return true;
}

// ——— Listings, articles, events, campaigns ———

async function seedListings(s: Seeding): Promise<boolean> {
  const { store, now } = s.deps;
  const currency = listingSettingsFor(s.app, await store.getListingSettings(s.app.id)).currency;
  for (const [i, seed] of [...SAMPLE_LISTINGS.listings.entries()].reverse()) {
    const imageAssetIds: string[] = [];
    for (const name of seed.pictures) imageAssetIds.push(await picture(s, name, "home"));
    await store.createListing(
      {
        appId: s.app.id,
        reference: null,
        title: seed.title[s.lang],
        description: seed.description[s.lang],
        purpose: seed.purpose,
        type: seed.type,
        priceCents: samplePrice(seed.priceCents, SAMPLE_LISTINGS.currency, currency),
        currency,
        pricePeriod: seed.pricePeriod,
        negotiable: seed.negotiable,
        city: seed.city[s.lang],
        district: seed.district[s.lang],
        address: null,
        latitude: seed.latitude,
        longitude: seed.longitude,
        area: seed.area,
        bedrooms: seed.bedrooms,
        bathrooms: seed.bathrooms,
        floor: seed.floor,
        yearBuilt: seed.yearBuilt,
        furnished: seed.furnished,
        features: seed.features.map((f) => f[s.lang]),
        imageAssetIds,
        videoUrl: null,
        featured: seed.featured,
        status: "published",
        publishedAt: ago(now, i),
        sample: true,
      },
      ago(now, i),
    );
  }
  return true;
}

async function seedArticles(s: Seeding): Promise<boolean> {
  const { store, now } = s.deps;
  const existing = await store.listArticleCategories(s.app.id);
  let position = Math.max(-1, ...existing.map((c) => c.position)) + 1;
  const categoryIds = new Map<string, number>();
  for (const [key, names] of Object.entries(SAMPLE_ARTICLES.categories)) {
    const found = existing.find((c) => c.name === names[s.lang]);
    categoryIds.set(key, found ? found.id : (await store.createArticleCategory({ appId: s.app.id, name: names[s.lang], position: position++, sample: true, createdAt: now })).id);
  }
  for (const seed of [...SAMPLE_ARTICLES.articles].reverse()) {
    const publishedAt = new Date(now.getTime() - seed.hoursAgo * 3_600_000);
    await store.createArticle(
      {
        appId: s.app.id,
        title: seed.title[s.lang],
        excerpt: seed.excerpt[s.lang],
        body: seed.body[s.lang],
        imageAssetId: await picture(s, seed.picture, "course"),
        author: seed.author[s.lang],
        categoryIds: [categoryIds.get(seed.category)!],
        featured: seed.featured,
        status: "published",
        publishedAt,
        sample: true,
      },
      publishedAt,
    );
  }
  return true;
}

async function seedEvents(s: Seeding): Promise<boolean> {
  const { store, now } = s.deps;
  const settings = await eventSettingsOf(store, s.app.id);
  const today = utcToLocal(now, settings.timeZone).date;
  for (const [i, seed] of SAMPLE_EVENTS.events.entries()) {
    const startAt = localToUtc(addDays(today, seed.daysAhead), seed.start, settings.timeZone);
    const event = await store.createEvent(
      {
        appId: s.app.id,
        title: seed.title[s.lang],
        description: seed.description[s.lang],
        category: SAMPLE_EVENTS.categories[seed.category]![s.lang],
        imageAssetIds: [await picture(s, seed.picture, "course")],
        startAt,
        endAt: new Date(startAt.getTime() + seed.minutes * 60_000),
        venueName: seed.venue?.name[s.lang] ?? null,
        venueAddress: seed.venue?.address ?? null,
        latitude: seed.venue?.latitude ?? null,
        longitude: seed.venue?.longitude ?? null,
        onlineUrl: seed.onlineUrl,
        organiser: s.app.appName,
        capacity: seed.capacity,
        status: "published",
        publishedAt: ago(now, i),
        sample: true,
      },
      ago(now, i),
    );
    for (const [position, t] of seed.ticketTypes.entries()) {
      await store.createTicketType(
        { appId: s.app.id, eventId: event.id, name: t.name[s.lang], priceCents: samplePrice(t.priceCents, SAMPLE_EVENTS.currency, settings.currency), capacity: t.capacity, saleEndsAt: null, maxPerOrder: t.maxPerOrder, position },
        now,
      );
    }
  }
  return true;
}

async function seedCampaigns(s: Seeding): Promise<boolean> {
  const { store, now } = s.deps;
  const currency = donationSettingsOf(await store.getDonationSettings(s.app.id)).currency;
  const money = (cents: number) => samplePrice(cents, SAMPLE_CAMPAIGNS.currency, currency);
  for (const [i, seed] of [...SAMPLE_CAMPAIGNS.campaigns.entries()].reverse()) {
    const imageAssetIds: string[] = [];
    for (const name of seed.pictures) imageAssetIds.push(await picture(s, name, "course"));
    const goalCents = money(seed.goalCents);
    const campaign = await store.createCampaign(
      {
        appId: s.app.id,
        title: seed.title[s.lang],
        summary: seed.summary[s.lang],
        story: seed.story[s.lang],
        imageAssetIds,
        goalCents,
        presetCents: [...new Set(seed.presetCents.map(money))].sort((a, b) => a - b),
        allowCustomAmount: true,
        minCents: money(seed.minCents),
        endsAt: new Date(now.getTime() + seed.endsInDays * 86_400_000),
        status: "open",
        featured: seed.featured,
        publishedAt: new Date(now.getTime() - (i + 1) * 7 * 86_400_000),
        sample: true,
      },
      ago(now, i),
    );
    // What the sample shows as given so far: never more than its goal.
    await store.setCampaignTotals(s.app.id, campaign.id, { raisedCents: Math.min(money(seed.raisedCents), goalCents), donorCount: seed.donorCount });
  }
  return true;
}

// ——— Delivery, food and rides: their settings come as samples too ———

async function seedDeliveryServices(s: Seeding): Promise<boolean> {
  const { store, now } = s.deps;
  const currency = deliverySettingsOf(await store.getDeliverySettings(s.app.id)).currency;
  for (const [position, seed] of SAMPLE_DELIVERY_SERVICES.services.entries()) {
    await store.createDeliveryService(
      {
        appId: s.app.id,
        name: seed.name[s.lang],
        description: seed.description[s.lang],
        imageAssetId: await picture(s, seed.picture, "product"),
        extraCents: samplePrice(seed.extraCents, SAMPLE_DELIVERY_SERVICES.currency, currency),
        eta: seed.eta[s.lang],
        position: position + 1,
        active: true,
        sample: true,
      },
      now,
    );
  }
  return true;
}

async function seedRestaurants(s: Seeding): Promise<boolean> {
  const { store, now } = s.deps;
  const settings = deliverySettingsOf(await store.getDeliverySettings(s.app.id));
  const { currency } = settings;
  const money = (cents: number) => samplePrice(cents, SAMPLE_RESTAURANTS.currency, currency);
  // The cuisines the sample restaurants are filed under, added where the company has none of the same.
  const cuisines: Cuisine[] = [...(settings.cuisines ?? [])];
  const cuisineId = new Map<string, string>();
  for (const [id, names] of Object.entries(SAMPLE_RESTAURANTS.cuisines)) {
    const found = cuisines.find((c) => c.id === id || c.name === names[s.lang]);
    if (found) cuisineId.set(id, found.id);
    else {
      cuisines.push({ id, name: names[s.lang], sample: true });
      cuisineId.set(id, id);
    }
  }
  if (cuisines.length !== (settings.cuisines ?? []).length) await store.saveDeliverySettings(s.app.id, { ...settings, cuisines }, now);
  const allDay: OpeningPeriod[] = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((day) => ({ day, opens: "00:00", closes: "23:59" }));
  for (const [position, seed] of SAMPLE_RESTAURANTS.restaurants.entries()) {
    let next = 1;
    const sections: MenuSection[] = [];
    for (const section of seed.sections) {
      const dishes: Dish[] = [];
      const sectionId = next++;
      for (const dish of section.dishes) {
        dishes.push({
          id: next++,
          name: dish.name[s.lang],
          description: dish.description[s.lang],
          imageAssetId: await picture(s, dish.picture, "product"),
          priceCents: money(dish.priceCents),
          available: true,
          popular: dish.popular ?? false,
          choiceGroups: dish.choices
            ? [{ id: next++, name: dish.choices.name[s.lang], min: dish.choices.min, max: dish.choices.max, choices: dish.choices.options.map(([name, extra]) => ({ id: next++, name: name[s.lang], extraCents: money(extra), available: true })) }]
            : [],
        });
      }
      sections.push({ id: sectionId, name: section.name[s.lang], dishes });
    }
    const menu: RestaurantMenu = { sections, nextId: next };
    await store.createRestaurant(
      {
        appId: s.app.id,
        name: seed.name[s.lang],
        description: seed.description[s.lang],
        logoAssetId: await picture(s, seed.logo, "avatar"),
        coverAssetId: null,
        cuisines: seed.cuisines.map((c) => cuisineId.get(c)!),
        address: { address: seed.address[s.lang], details: null, lat: null, lng: null },
        phone: null,
        hours: allDay,
        prepMinutes: seed.prepMinutes,
        minOrderCents: money(seed.minOrderCents),
        maxKm: null,
        commissionBp: 1000,
        active: true,
        position: position + 1,
        sample: true,
      },
      menu,
      now,
    );
  }
  return true;
}

async function seedVehicleTypes(s: Seeding): Promise<boolean> {
  const { store, now } = s.deps;
  const currency = deliverySettingsOf(await store.getDeliverySettings(s.app.id)).currency;
  const money = (cents: number) => samplePrice(cents, SAMPLE_VEHICLE_TYPES.currency, currency);
  for (const [position, seed] of SAMPLE_VEHICLE_TYPES.types.entries()) {
    await store.createVehicleType(
      {
        appId: s.app.id,
        name: seed.name[s.lang],
        description: seed.description[s.lang],
        icon: seed.icon,
        imageAssetId: null,
        seats: seed.seats,
        baseCents: money(seed.baseCents),
        perKmCents: money(seed.perKmCents),
        perMinuteCents: money(seed.perMinuteCents),
        minCents: money(seed.minCents),
        waitPerMinuteCents: money(seed.waitPerMinuteCents),
        position: position + 1,
        active: true,
        sample: true,
      },
      now,
    );
  }
  return true;
}

async function seedSchoolNews(s: Seeding): Promise<boolean> {
  for (const seed of [...SAMPLE_SCHOOL_NEWS].reverse()) {
    await s.deps.store.createSchoolAnnouncement({
      appId: s.app.id,
      audience: "school",
      classId: null,
      studentId: null,
      title: seed.title[s.lang],
      body: seed.body[s.lang],
      teacherId: null,
      sample: true,
      createdAt: new Date(s.deps.now.getTime() - seed.daysAgo * 86_400_000),
    });
  }
  return true;
}
