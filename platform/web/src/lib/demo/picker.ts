import { ENGINES } from "../app/kinds";
import { newApp } from "../app/setup";
import type { App, AppType } from "../data/types";
import { appUrl } from "../env";
import { en as studioWords } from "../../i18n/dashboard/studio";
import type { AppScreen } from "../marketing";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "../pages/defaults";
import { itemSourcesFor } from "../pages/sources";
import type { LanguageCode } from "../pages/types";
import type { SampleList } from "../samples/lists";
import { templatesFor, TEMPLATES, type SectionWord, type TemplateInfo } from "../studio/sections";
import { startLayout } from "../studio/start";
import { DEMO_SLUGS, DEMO_TYPES, demoKind, demoTypeOfSlug, isStudioDemo, PREMIUM_ACADEMY_DEMO, PREMIUM_ACADEMY_TEMPLATE, STUDIO_DEMO_TYPES, type DemoId, type StudioDemoId } from "./constants";
import { CLINIC_SERVICES, DEMO_ARTICLES, DEMO_BRANDS, DEMO_CAMPAIGNS, DEMO_DELIVERY_SERVICES, DEMO_DISHES, DEMO_EVENTS, DEMO_GUIDES, DEMO_LISTINGS, DEMO_PRODUCTS, DEMO_RESTAURANTS, DEMO_SERVICES, FITNESS_SERVICES, RIDES_DEMO_TYPES, TAXI_DEMO_TYPES } from "./content";
import { demoCourseSeeds } from "./entries";
import { demoDesign } from "./look";
import { MARKET_VENDORS } from "./marketplace";
import { SCHOOL_CLASSES } from "./school";
import { TRAVEL_HOTELS } from "@/lib/travel/samples";

/**
 * 127 Choosing an app from our real demos (/start): every demo we have, the
 * App editor's (DEMO_TYPES) and Yallapp Studio's (STUDIO_DEMO_TYPES), each
 * once, in its own product's section, with its real screens (DEMO_GUIDES)
 * and facts counted from the demo itself: its pages, the entries it brings
 * and its languages, never numbers written by hand. A demo added to the
 * registry shows here by itself (tests/unit/start-picker.test.ts).
 */

/** Which product a demo opens in: the App editor (the dashboard's editor) or Yallapp Studio. Never both. */
export type PickerProduct = "editor" | "studio";

export function productOf(id: DemoId): PickerProduct {
  return isStudioDemo(id) ? "studio" : "editor";
}

/** Studio's demos in the approved order (13 November 2026): the teaching ones first; one not named here comes after them. */
const STUDIO_ORDER: readonly DemoId[] = [PREMIUM_ACADEMY_DEMO, "instructors", "food", "marketplace", "delivery", "rides", "taxi", "school"];

const ordered = (ids: readonly DemoId[], order: readonly DemoId[]) =>
  ids
    .map((id, i) => ({ id, at: order.includes(id) ? order.indexOf(id) : order.length + i }))
    .sort((a, b) => a.at - b.at)
    .map((x) => x.id);

/** The demos each section shows: every App editor demo (the registry's order) and every Studio demo. */
export function pickerSections(): Record<PickerProduct, readonly DemoId[]> {
  return { editor: DEMO_TYPES, studio: ordered(STUDIO_DEMO_TYPES, STUDIO_ORDER) };
}

/**
 * The kind of business a demo is for, which groups it with the other demos
 * of that business on its page ("Teaching apps in Studio"). A demo without
 * one here is a business of its own (its kind's).
 */
const DEMO_BUSINESS: Partial<Record<DemoId, string>> = {
  lms: "teaching",
  premium_academy: "teaching",
  instructors: "teaching",
  store: "shop",
  marketplace: "shop",
  restaurant: "food",
  food: "food",
  booking: "bookings",
  clinic: "clinic",
  fitness: "fitness",
  real_estate: "real_estate",
  news: "news",
  events: "events",
  donations: "charity",
  delivery: "delivery",
  rides: "rides",
  taxi: "rides",
  school: "school",
  travel: "travel",
};

export function businessOf(id: DemoId): string {
  return DEMO_BUSINESS[id] ?? demoKind(id).id;
}

/** The other demos of the same business, the App editor's first, each in its product. */
export function sameBusiness(id: DemoId): DemoId[] {
  const business = businessOf(id);
  const { editor, studio } = pickerSections();
  return [...editor, ...studio].filter((other) => other !== id && businessOf(other) === business);
}

/** A demo by its address (/start/<slug>): the /demo page's slug. */
export function demoOfSlug(slug: string): DemoId | null {
  return demoTypeOfSlug(slug);
}

export function slugOf(id: DemoId): string {
  return DEMO_SLUGS[id];
}

/** The demo's own screens (the /demo page's), the first on its card. */
export function screensOf(id: DemoId): AppScreen[] {
  return DEMO_GUIDES[id].screens;
}

/** What the entries a demo brings are called. */
export type ItemNoun =
  | "courses"
  | "products"
  | "dishes"
  | "services"
  | "classes"
  | "homes"
  | "articles"
  | "events"
  | "campaigns"
  | "deliveryServices"
  | "restaurants"
  | "places"
  | "carTypes"
  | "schoolClasses"
  | "hotels";

export interface DemoItems {
  /** The dashboard's list they are in (lib/samples/lists.ts), which "Put in your own" opens. */
  list: SampleList;
  noun: ItemNoun;
  count: number;
}

/** The entries each demo brings to its main list, counted from the demo's own definitions (lib/samples/demo.ts makes them). */
const DEMO_ITEMS: Record<DemoId, () => DemoItems> = {
  lms: () => ({ list: "courses", noun: "courses", count: demoCourseSeeds(false).courses.length }),
  premium_academy: () => ({ list: "courses", noun: "courses", count: demoCourseSeeds(false, true).courses.length }),
  instructors: () => ({ list: "courses", noun: "courses", count: demoCourseSeeds(true).courses.length }),
  store: () => ({ list: "products", noun: "products", count: DEMO_PRODUCTS.length }),
  restaurant: () => ({ list: "products", noun: "dishes", count: DEMO_DISHES.length }),
  booking: () => ({ list: "services", noun: "services", count: DEMO_SERVICES.length }),
  clinic: () => ({ list: "services", noun: "services", count: CLINIC_SERVICES.length }),
  fitness: () => ({ list: "services", noun: "classes", count: FITNESS_SERVICES.length }),
  real_estate: () => ({ list: "listings", noun: "homes", count: DEMO_LISTINGS.length }),
  news: () => ({ list: "articles", noun: "articles", count: DEMO_ARTICLES.length }),
  events: () => ({ list: "events", noun: "events", count: DEMO_EVENTS.length }),
  donations: () => ({ list: "campaigns", noun: "campaigns", count: DEMO_CAMPAIGNS.length }),
  delivery: () => ({ list: "delivery_services", noun: "deliveryServices", count: DEMO_DELIVERY_SERVICES.length }),
  food: () => ({ list: "restaurants", noun: "restaurants", count: DEMO_RESTAURANTS.length }),
  marketplace: () => ({ list: "restaurants", noun: "places", count: MARKET_VENDORS.length }),
  rides: () => ({ list: "vehicle_types", noun: "carTypes", count: RIDES_DEMO_TYPES.length }),
  taxi: () => ({ list: "vehicle_types", noun: "carTypes", count: TAXI_DEMO_TYPES.length }),
  school: () => ({ list: "school", noun: "schoolClasses", count: SCHOOL_CLASSES.length }),
  // 126 Safra: its hotels (each with its rooms; its flights come with them).
  travel: () => ({ list: "hotels", noun: "hotels", count: TRAVEL_HOTELS.length }),
};

export function demoItems(id: DemoId): DemoItems {
  return DEMO_ITEMS[id]();
}

/** The Studio template a Studio demo starts a project from: the demo's own (templates = demos), 123 the premium academy's template. */
export function studioDemoTemplate(id: StudioDemoId): TemplateInfo {
  if (id === PREMIUM_ACADEMY_DEMO) return TEMPLATES.find((t) => t.id === PREMIUM_ACADEMY_TEMPLATE)!;
  const kind = demoKind(id);
  return templatesFor({ type: kind.engine, vertical: kind.vertical }).find((t) => t.demo === id)!;
}

const MADE_AT = new Date("2026-01-01T00:00:00Z");

/** A regular app's pages and the built-in screens of its engine, each once. */
export function regularPageCount(engine: AppType, slugs: readonly string[]): number {
  return new Set([...slugs, ...ENGINES[engine].pages.screens]).size;
}

/**
 * The pages an app started from the demo gets, ready: its design's pages
 * and the app's own screens its engine opens (the App editor), or its
 * template's whole project, a page around each screen (Studio).
 */
export function demoPageCount(id: DemoId): number {
  if (!isStudioDemo(id)) return regularPageCount(demoKind(id).engine, demoDesign(id).pages.map((p) => p.slug));
  const kind = demoKind(id);
  const name = DEMO_BRANDS[id].appName;
  const app: App = { ...newApp("demo", null, MADE_AT, kind.engine, kind.vertical), section: "studio", backend: "hosted", appName: name };
  const ready = defaultLayout(app, BUILT_IN_APP_DEFAULTS, MADE_AT);
  const layout = startLayout(app, studioDemoTemplate(id), ready, MADE_AT, {
    brand: DEMO_BRANDS[id].primaryColor,
    source: itemSourcesFor(app)[0] ?? null,
    app: name,
    lang: "en",
    w: (word: SectionWord) => String(studioWords[`w_${word}`]).replaceAll("{app}", name),
    picture: (file: string) => `${appUrl()}/design-pictures/${file}`,
  });
  return layout.pages.length;
}

export interface DemoFacts {
  pages: number;
  items: DemoItems;
  languages: LanguageCode[];
}

const factsMade = new Map<DemoId, DemoFacts>();

/** A demo's facts, as its Pick page and "Comes with your app" show them. */
export function demoFacts(id: DemoId): DemoFacts {
  const known = factsMade.get(id);
  if (known) return known;
  const facts = { pages: demoPageCount(id), items: demoItems(id), languages: [...DEMO_BRANDS[id].languages] };
  factsMade.set(id, facts);
  return facts;
}

/** Where the picker goes: the first step, a demo's page, its "Make it yours". `adding` keeps an account that has apps on the picker. */
export function pickerPath(step: { demo?: DemoId; make?: boolean; adding?: boolean; product?: PickerProduct | null } = {}): string {
  const base = step.demo ? `/start/${slugOf(step.demo)}${step.make ? "/make" : ""}` : "/start";
  const query = new URLSearchParams();
  if (step.adding) query.set("new", "1");
  if (step.product && !step.demo) query.set("for", step.product);
  const text = query.toString();
  return text ? `${base}?${text}` : base;
}
