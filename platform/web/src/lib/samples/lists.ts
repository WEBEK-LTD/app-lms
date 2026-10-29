import { ENGINES, isAppType } from "../app/kinds";
import type { DataStore } from "../data/store";
import { DEFAULT_BOOKING_SETUP, DEFAULT_COURSE_SETUP, type App } from "../data/types";
import type { ItemSource } from "../pages/types";

/**
 * 110.2 Sample entries: the lists that get them, and how many each has.
 * A list is what the dashboard shows on one page (the courses, the shop's
 * products, a salon's services, its team, …).
 */

export const SAMPLE_LISTS = ["teachers", "courses", "products", "services", "staff", "listings", "articles", "events", "campaigns", "delivery_services", "restaurants", "vehicle_types", "school_news"] as const;
export type SampleList = (typeof SAMPLE_LISTS)[number];

export function isSampleList(value: unknown): value is SampleList {
  return typeof value === "string" && (SAMPLE_LISTS as readonly string[]).includes(value);
}

/** The lists each of the pages' item sources shows, in the order they're filled (a course's teacher first). */
const LISTS_OF_SOURCE: Partial<Record<ItemSource, SampleList[]>> = {
  courses: ["teachers", "courses"],
  products: ["products"],
  services: ["services", "staff"],
  listings: ["listings"],
  articles: ["articles"],
  events: ["events"],
  campaigns: ["campaigns"],
  delivery_services: ["delivery_services"],
  restaurants: ["restaurants"],
  vehicle_types: ["vehicle_types"],
  school_news: ["school_news"],
};

/** The dashboard page of each list, where its banner shows. */
export const LIST_PAGE: Record<SampleList, string> = {
  teachers: "/dashboard/teachers",
  courses: "/dashboard/courses",
  products: "/dashboard/catalog",
  services: "/dashboard/services",
  staff: "/dashboard/services",
  listings: "/dashboard/listings",
  articles: "/dashboard/articles",
  events: "/dashboard/events",
  campaigns: "/dashboard/campaigns",
  delivery_services: "/dashboard/delivery",
  restaurants: "/dashboard/restaurants",
  vehicle_types: "/dashboard/vehicle-types",
  school_news: "/dashboard/school/news",
};

/**
 * Whether the app's lists can get samples: its content is kept in Yallapp
 * (the hosted API with the engine's own content). Never an app whose content
 * comes from a website or a platform (WordPress, Shopify, a connector), nor
 * the demo apps.
 */
export function canHaveSamples(app: Pick<App, "appType" | "backend" | "connector" | "demo">): boolean {
  if (app.demo || app.backend !== "hosted" || !isAppType(app.appType)) return false;
  return app.connector?.kind === ENGINES[app.appType].ownContent.kind;
}

/** The app's lists, in the order they're filled: its engine's list (105.3 an academy with many teachers, its teachers too). */
export function sampleListsOf(app: Pick<App, "appType" | "backend" | "connector" | "demo" | "vertical">): SampleList[] {
  if (!canHaveSamples(app)) return [];
  return listsOf(app, ENGINES[app.appType].pages.source);
}

function listsOf(app: Pick<App, "vertical">, source: ItemSource): SampleList[] {
  return (LISTS_OF_SOURCE[source] ?? []).filter((list) => list !== "teachers" || app.vertical === "instructors");
}

/** The app's lists that these item sources show (the lists a design uses). */
export function listsForSources(app: Pick<App, "appType" | "backend" | "connector" | "demo" | "vertical">, sources: Iterable<string>): SampleList[] {
  const used = new Set(sources);
  return sampleListsOf(app).filter((list) => SAMPLE_LISTS.includes(list) && Object.entries(LISTS_OF_SOURCE).some(([source, lists]) => used.has(source) && lists.includes(list)));
}

/** Every item source named in a layout, its pages' blocks and Studio pages alike (`source` anywhere in it). */
export function sourcesIn(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) sourcesIn(item, found);
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "source" && typeof item === "string") found.add(item);
      else sourcesIn(item, found);
    }
  }
  return found;
}

export interface ListCount {
  /** Sample entries. */
  samples: number;
  /** The owner's own entries. */
  own: number;
}

const counted = (rows: readonly { sample?: boolean }[]): ListCount => {
  const samples = rows.filter((r) => r.sample === true).length;
  return { samples, own: rows.length - samples };
};

/** How many sample and own entries one of the app's lists has. */
export async function countList(store: DataStore, app: App, list: SampleList): Promise<ListCount> {
  switch (list) {
    case "teachers":
      return counted(await store.listTeachers(app.id));
    case "courses":
      return counted((app.courseSetup ?? DEFAULT_COURSE_SETUP).courses);
    case "products":
      return counted(await store.listCatalogProducts(app.id));
    case "services":
      return counted((app.bookingSetup ?? DEFAULT_BOOKING_SETUP).services);
    case "staff":
      return counted((app.bookingSetup ?? DEFAULT_BOOKING_SETUP).staff);
    case "listings":
      return counted(await store.listListings(app.id));
    case "articles":
      return counted(await store.listArticles(app.id));
    case "events":
      return counted(await store.listEvents(app.id));
    case "campaigns":
      return counted(await store.listCampaigns(app.id));
    case "delivery_services":
      return counted(await store.listDeliveryServices(app.id));
    case "restaurants":
      return counted(await store.listRestaurants(app.id));
    case "vehicle_types":
      return counted(await store.listVehicleTypes(app.id));
    case "school_news":
      return counted(await store.listSchoolAnnouncements(app.id));
  }
}

/** The sample entries left in each of the app's lists that has some. */
export async function samplesLeft(store: DataStore, app: App): Promise<{ list: SampleList; count: number }[]> {
  const left: { list: SampleList; count: number }[] = [];
  for (const list of sampleListsOf(app)) {
    const { samples } = await countList(store, app, list);
    if (samples > 0) left.push({ list, count: samples });
  }
  return left;
}

/** How many sample entries the app has in all; 0 for an app that can't have them. */
export async function sampleTotal(store: DataStore, app: App): Promise<number> {
  return (await samplesLeft(store, app)).reduce((sum, l) => sum + l.count, 0);
}

/**
 * After the owner added an entry of their own: where to ask "Remove the
 * samples now?" (the list's page), when it's their first one in a list that
 * still has samples; null otherwise.
 */
export async function askAfterOwnEntry(store: DataStore, appId: string, list: SampleList): Promise<string | null> {
  const app = await store.getAppById(appId);
  if (!app || !sampleListsOf(app).includes(list)) return null;
  const { samples, own } = await countList(store, app, list);
  return samples > 0 && own === 1 ? `${LIST_PAGE[list]}?samples=${list}` : null;
}

/** 110.2 Why a build for the stores can't start (the dashboard's `samples.known.blocked` in Arabic and Turkish). */
export function samplesBlockedMessage(count: number): string {
  return `Sample entries left: ${count}. Remove them, or edit them to make them yours, before your app goes to the stores.`;
}
