// 126
import { makeTravelSamples } from "../travel/samples";
import { saveTravelPhoto } from "../demo/travel";
import { bookingSetup } from "../bookings/setup";
import { courseSetup } from "../courses/setup";
import type { App } from "../data/types";
import { deliverySettingsOf } from "../delivery/settings";
import { isStudioDemo, type DemoId } from "../demo/constants";
import { studioDemoOf } from "../studio/demo-templates";
import { DEMO_FOOD_CUISINES, demoArticles, demoBookingEntries, demoCampaigns, demoCourseEntries, demoDeliveryServices, demoEvents, demoListings, demoProducts, demoRestaurants, demoVehicleTypes, withCuisines, type BookingDemo, type EntryDeps } from "../demo/entries";
import { marketCuisines, marketplaceSamples, savingZadPictures } from "../demo/marketplace";
import { savePicture } from "../demo/picture-assets";
import { syncSchoolStructure } from "../demo/school";
import { ACADEMY_TEACHERS, syncAcademyTeachers } from "../demo/teachers";
import { donationSettingsOf } from "../donations/service";
import { eventSettingsOf } from "../events/service";
import { listingSettingsFor } from "../listings/types";
import { samplePrice } from "./money";
import { countList, listsForSources, sampleListsOf, type SampleList } from "./lists";
import { seedSamples, type SampleDeps } from "./seed";
import { schoolSettingsOf } from "../school/settings";

/**
 * Templates = demos. An app or Studio project started from a demo ("Like our
 * demo", or the demo's Studio template) gets the demo's own entries as its
 * samples: Zad's places and Zad Market's aisles, Nakhla School's classes,
 * subjects and people, Rawaq Academy's teachers and courses, and so on. They
 * are made by the demo's own generators (lib/demo/entries.ts and the demos'
 * files), each marked `sample` the way 110.2's samples are, so the lists'
 * banners say so and "Remove all samples" takes them away. The demo's sign-in
 * number, its accounts, its orders and its daily refresh stay with the demo.
 * A list the demo has nothing for gets 110.2's samples (lib/samples/seed.ts).
 */

interface Making {
  deps: SampleDeps;
  app: App;
  entries: EntryDeps;
}

type DemoSeeder = (m: Making) => Promise<boolean>;

const deliveryCurrency = async (m: Making) => deliverySettingsOf(await m.deps.store.getDeliverySettings(m.app.id)).currency;

/** Courses after the app's own, the newest-first lists showing them in the demo's order. */
async function courses(m: Making, academy: boolean): Promise<boolean> {
  const setup = courseSetup(m.app);
  const teachers = academy ? new Map((await m.deps.store.listTeachers(m.app.id)).filter((t) => t.sample).map((t) => [t.name, t.id])) : null;
  let i = 0;
  const made = await demoCourseEntries(m.entries, setup, academy, teachers, () => new Date(m.deps.now.getTime() - i++ * 60_000).toISOString());
  await m.deps.store.updateApp(m.app.id, { courseSetup: { ...setup, categories: made.categories, courses: [...setup.courses, ...made.courses], nextId: made.nextId } }, m.deps.now);
  return made.courses.length > 0;
}

/** Services and, when the team is empty too, the team (27 and a gym's timetable), after the app's own. */
function bookings(which: BookingDemo): DemoSeeder {
  return async (m) => {
    const setup = bookingSetup(m.app);
    const made = await demoBookingEntries(m.entries, { categories: setup.categories, nextId: setup.nextId, currency: setup.rules.currency }, which);
    const team = setup.staff.length === 0;
    await m.deps.store.updateApp(
      m.app.id,
      {
        bookingSetup: {
          ...setup,
          categories: made.categories,
          services: [...setup.services, ...made.services],
          staff: team ? made.staff : setup.staff,
          classTemplates: [...(setup.classTemplates ?? []), ...(team ? made.classTemplates : [])],
          nextId: made.nextId,
        },
      },
      m.deps.now,
    );
    return made.services.length > 0;
  };
}

/** The cuisines of these places the company doesn't have yet, as samples; the IDs to file them under. */
async function cuisinesFor(m: Making, wanted: readonly { id: string; name: string }[]): Promise<Map<string, string>> {
  const settings = deliverySettingsOf(await m.deps.store.getDeliverySettings(m.app.id));
  const { cuisines, ids } = withCuisines(m.entries, settings.cuisines ?? [], wanted);
  if (cuisines.length !== (settings.cuisines ?? []).length) await m.deps.store.saveDeliverySettings(m.app.id, { ...settings, cuisines }, m.deps.now);
  return ids;
}

/** Nakhla School's classes, subjects, teachers, staff, students and parents and its timetable, in a school that has none yet. */
async function school(m: Making): Promise<boolean> {
  const { store, now } = m.deps;
  const [classes, people] = await Promise.all([store.listSchoolClasses(m.app.id), store.listSchoolPeople(m.app.id)]);
  if (classes.length || people.length) return false;
  const { made } = await syncSchoolStructure(store, m.app, now, { sample: true });
  if (!made?.personIds.length) return false;
  const settings = schoolSettingsOf(await store.getSchoolSettings(m.app.id), m.app);
  await store.saveSchoolSettings(m.app.id, { ...settings, sampleSchool: made }, now);
  return true;
}

const products = (menu: boolean): DemoSeeder => async (m) => (await demoProducts(m.entries, m.app, menu), true);
const vehicleTypes = (taxi: boolean): DemoSeeder => async (m) => (await demoVehicleTypes(m.entries, m.app, taxi, await deliveryCurrency(m)), true);

/** What each demo brings, by list; the lists it has nothing for get 110.2's samples. */
const DEMO_SAMPLES: Record<DemoId, Partial<Record<SampleList, DemoSeeder>>> = {
  lms: { courses: (m) => courses(m, false) },
  // 123 The premium academy: the academy's courses.
  premium_academy: { courses: (m) => courses(m, false) },
  store: { products: products(false) },
  restaurant: { products: products(true) },
  booking: { services: bookings("salon") },
  clinic: { services: bookings("clinic") },
  fitness: { services: bookings("fitness") },
  real_estate: {
    listings: async (m) => (await demoListings(m.entries, m.app, listingSettingsFor(m.app, await m.deps.store.getListingSettings(m.app.id)).currency), true),
  },
  news: { articles: async (m) => (await demoArticles(m.entries, m.app), true) },
  events: { events: async (m) => (await demoEvents(m.entries, m.app, await eventSettingsOf(m.deps.store, m.app.id), m.app.appName ?? ""), true) },
  donations: { campaigns: async (m) => (await demoCampaigns(m.entries, m.app, donationSettingsOf(await m.deps.store.getDonationSettings(m.app.id)).currency), true) },
  delivery: { delivery_services: async (m) => (await demoDeliveryServices(m.entries, m.app, await deliveryCurrency(m)), true) },
  food: { restaurants: async (m) => (await demoRestaurants(m.entries, m.app, await deliveryCurrency(m), await cuisinesFor(m, DEMO_FOOD_CUISINES)), true) },
  marketplace: {
    restaurants: async (m) => {
      const currency = await deliveryCurrency(m);
      const cuisines = await cuisinesFor(m, marketCuisines());
      // Zad's photos and drawings, saved as the app's like the other demos' samples.
      const picture = savingZadPictures(m.deps, { clientId: m.app.clientId, appId: m.app.id }, "product_image");
      return (await marketplaceSamples(m.deps.store, m.app, m.deps.now, { money: (cents) => samplePrice(cents, "EGP", currency), cuisines, picture })) > 0;
    },
  },
  rides: { vehicle_types: vehicleTypes(false) },
  // 126 Safra's hotels, rooms and flights.
  travel: {
    hotels: async (m) => {
      const made = await makeTravelSamples({ store: m.deps.store, app: m.app, now: m.deps.now, sample: true, photo: (name) => saveTravelPhoto(m.deps, { clientId: m.app.clientId, appId: m.app.id }, name, "product_image") });
      return made.hotels + made.flights > 0;
    },
  },
  taxi: { vehicle_types: vehicleTypes(true) },
  // Its news are 110.2's school news, the ones the demo has, in the app's language.
  school: { school },
  instructors: {
    teachers: async (m) => {
      const photos = new Map<string, string>();
      for (const t of ACADEMY_TEACHERS) photos.set(t.name, await m.entries.picture(t.picture, "avatar"));
      return (await syncAcademyTeachers(m.deps.store, m.app, photos, m.deps.now, { sample: true })).size > 0;
    },
    courses: (m) => courses(m, true),
  },
};

/** The lists a demo brings its own entries to. */
export function demoSampleLists(demo: DemoId): SampleList[] {
  return Object.keys(DEMO_SAMPLES[demo]) as SampleList[];
}

/**
 * Fills each empty list these item sources show (all the app's lists
 * without `sources`) with the demo's entries, and the lists the demo has
 * nothing for with 110.2's samples. Returns the lists filled.
 */
export async function seedDemoSamples(deps: SampleDeps, appId: string, demo: DemoId, options: { sources?: Iterable<string> } = {}): Promise<SampleList[]> {
  let app = await deps.store.getAppById(appId);
  if (!app) return [];
  const sources = options.sources ? [...options.sources] : null;
  const lists = sources ? listsForSources(app, sources) : sampleListsOf(app);
  const filled: SampleList[] = [];
  for (const list of lists) {
    const seeder = DEMO_SAMPLES[demo][list];
    if (!seeder) continue;
    // Courses and services live on the app: read it again after each list.
    app = (await deps.store.getAppById(appId))!;
    const { samples, own } = await countList(deps.store, app, list);
    if (samples + own > 0) continue;
    const entries: EntryDeps = {
      store: deps.store,
      now: deps.now,
      // The demo's own pictures, saved as the app's (removing its samples never takes another app's).
      picture: (name, size) => savePicture(deps, { clientId: app!.clientId, appId: app!.id }, name, size, "product_image"),
      sample: true,
    };
    if (await seeder({ deps, app, entries })) filled.push(list);
  }
  const rest = await seedSamples(deps, appId, sources ? { sources } : {});
  return [...filled, ...rest.filter((list) => !filled.includes(list))];
}

/**
 * Studio's editor took a whole design: the empty lists these sources show
 * get samples, the demo's own entries when `demo` is the project's kind's
 * Studio demo (its "Like our demo" design), else 110.2's. Any other demo
 * named is not taken.
 */
export async function seedSamplesFor(deps: SampleDeps, app: Pick<App, "id" | "appType" | "vertical">, sources: readonly string[], demo: string | null): Promise<SampleList[]> {
  const own = studioDemoOf({ type: app.appType, vertical: app.vertical ?? null });
  if (demo && own === demo && isStudioDemo(own)) return seedDemoSamples(deps, app.id, own, { sources });
  return seedSamples(deps, app.id, { sources });
}
