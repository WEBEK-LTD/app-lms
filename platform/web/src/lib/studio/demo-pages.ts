import type { LayoutTab, StudioNode, StudioPage, StudioPageScreen, Translations } from "../pages/types";
import { STUDIO_PAGE_SCREENS } from "../pages/types";
import { ar as studioAr, en as studioEn, tr as studioTr } from "../../i18n/dashboard/studio";
import type { App } from "../data/types";
import { innerScreen, innerScreenName, innerScreensFor, OWN_SCREEN_TITLES } from "../pages/inner-screens";
import { pageScreenOptionsFor } from "../pages/sources";
import { newNodeId } from "./elements";
import { designedDemoPage, designedOwnPages, designedTabs } from "./demo-designs";
import type { SectionContext, SectionWord } from "./sections";
import { translating } from "./demo-templates";

/**
 * 120 Templates = demos, every page of them: a Studio demo's tabs after its
 * home each open a Studio page drawn around the tab's screen (its list of
 * shipments, the ride map, the orders), with the page's title in the
 * header and a word about the screen over it. The demo app
 * (lib/demo/setup.ts), the project a demo's template starts
 * (lib/studio/start.ts) and the demo's whole design (lib/studio/designs.ts)
 * all have these pages, so every page of the demo can be changed in
 * Studio, not only its home. The Account tab's page has nothing over the
 * account screen, whose look is set with the sign-in screen
 * (lib/studio/screens.ts); the owner adds to it what they like.
 */

type DemoLang = "en" | "ar" | "tr";
const LANGS: readonly DemoLang[] = ["en", "ar", "tr"];
const WORDS = { en: studioEn, ar: studioAr, tr: studioTr };

/** The words of the demos' tabs, by their names in lib/app/kinds.ts. */
const TAB_WORDS: Record<string, SectionWord> = {
  Home: "tabHome",
  Send: "tabSend",
  "My shipments": "tabShipments",
  Restaurants: "tabRestaurants",
  "My orders": "tabMyOrders",
  Orders: "tabOrders",
  Search: "tabSearch",
  Club: "tabClub",
  Ride: "tabRide",
  "My rides": "tabMyRides",
  School: "tabSchool",
  Courses: "tabCourses",
  "My courses": "tabMyCourses",
  Account: "tabAccount",
  // 123 The premium academy's tab with the site's blog.
  Blog: "tabBlog",
  Explore: "acTabExplore",
  // 126 Safra's tabs.
  Stays: "travTabStays",
  Flights: "travTabFlights",
  Trips: "travTabTrips",
  Saved: "travTabSaved",
  Bookings: "travTabBookings",
  Messages: "travTabMessages",
  Alerts: "travTabAlerts",
  Help: "travTabHelp",
  "Your courses": "acTabMine",
  // 128 Zad's Shops and Cart.
  Shops: "tabShops",
  Cart: "tabCart",
  // 128 Rawaq Academy's teachers, its second tab.
  Teachers: "tabTeachers",
  // 130 The Signature looks' own tabs: a school's Parent, an academy's live classes.
  Parent: "tabParent",
  Live: "tabLive",
};

/** The word over a screen and its icon; a screen that is all its own (the search, the club, the ride map) has none. */
const TIPS: Partial<Record<StudioPageScreen, { icon: string; word: SectionWord }>> = {
  send_parcel: { icon: "schedule", word: "tipSend" },
  shipments: { icon: "location_on", word: "tipShipments" },
  restaurants: { icon: "restaurant", word: "tipRestaurants" },
  food_orders: { icon: "receipt_long", word: "tipFoodOrders" },
  my_rides: { icon: "route", word: "tipMyRides" },
  school: { icon: "school", word: "tipSchool" },
  courses: { icon: "school", word: "tipCourses" },
  my_courses: { icon: "play_circle", word: "tipMyCourses" },
  teachers: { icon: "co_present", word: "tipTeachers" },
};

/** A word in the dashboard's language, with Studio's own other languages as translations of `field`. */
function wordIn(ctx: SectionContext, word: SectionWord, field: string): { text: string; translations?: Translations } {
  const lang: DemoLang = ctx.lang ?? "en";
  const translations: Record<string, Record<string, string>> = {};
  for (const l of LANGS.filter((x) => x !== lang)) translations[l] = { [field]: String(WORDS[l][`w_${word}`]) };
  return { text: ctx.w(word), translations: translations as Translations };
}

function mix(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(ch(a, i) * (1 - t) + ch(b, i) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** The tab's screen, when it opens one a page can be drawn around. */
export function tabScreen(tab: LayoutTab): StudioPageScreen | null {
  const screen = tab.target.type === "screen" ? tab.target.screen : null;
  return screen && (STUDIO_PAGE_SCREENS as readonly string[]).includes(screen) ? (screen as StudioPageScreen) : null;
}

/** The demo's tabs that get a page: those opening one of the app's screens, each page at the tab's id. */
export function demoTabsWithPages(tabs: readonly LayoutTab[]): LayoutTab[] {
  return tabs.filter((t) => tabScreen(t) !== null);
}

export interface DemoTabPage {
  slug: string;
  title: string;
  translations?: Translations;
  studio: StudioPage;
}

/** A tab's page: the page's title in its header (none for the account, whose screen has its own top), and the screen's word over it. */
export function demoTabPage(tab: LayoutTab, ctx: SectionContext): DemoTabPage {
  const screen = tabScreen(tab)!;
  const newId = ctx.newId ?? newNodeId;
  const named = TAB_WORDS[tab.label];
  const title = named ? wordIn(ctx, named, "title") : { text: tab.label };
  const tip = TIPS[screen];
  const children: StudioNode[] = [];
  if (tip) {
    const text = wordIn(ctx, tip.word, "text");
    children.push({
      id: newId(),
      type: "row",
      name: "Note",
      gap: 10,
      cross: "center",
      padding: { top: 12, end: 14, bottom: 12, start: 14 },
      margin: { top: 10, end: 16, bottom: 2, start: 16 },
      radius: 16,
      background: mix(ctx.brand, "#FFFFFF", 0.88),
      dark_background: mix(ctx.brand, "#14121F", 0.72),
      children: [
        { id: newId(), type: "icon", icon: tip.icon, icon_size: 22, color: ctx.brand, dark_color: mix(ctx.brand, "#FFFFFF", 0.55) },
        { id: newId(), type: "text", text: text.text, ...(text.translations ? { translations: text.translations } : {}), width: "fill", font: { size: 14, weight: 600, line_height: 1.35 }, color: "#24222F", dark_color: "#EDE9F6" },
      ],
    });
  }
  const account = screen === "account";
  return {
    slug: tab.id,
    title: title.text,
    ...(title.translations ? { translations: title.translations } : {}),
    studio: {
      ...(account ? {} : { header: { type: "title" as const, title: title.text, buttons: ["notifications" as const], ...(title.translations ? { translations: title.translations } : {}) } }),
      body: { id: newId(), type: "column", children },
      screen,
    },
  };
}

/**
 * The demo's pages after its home, one per tab (as the demo's own design has
 * its tabs) opening one of the app's screens, then 128 the pages of its own
 * its tabs open (Zad's Shops); each in the demo's own look where it has one
 * (lib/studio/demo-designs).
 */
export function demoTabPages(tabs: readonly LayoutTab[], ctx: SectionContext): DemoTabPage[] {
  const { ctx: words, translate } = translating(ctx);
  const pages = designedOwnPages(words).map(({ slug, title, studio }) => {
    const named = wordIn(ctx, title, "title");
    const header = studio.header ? { ...studio.header, title: named.text, ...(named.translations ? { translations: named.translations } : {}) } : studio.header;
    return { slug, title: named.text, ...(named.translations ? { translations: named.translations } : {}), studio: { ...studio, header, body: translate(studio.body) } };
  });
  return [...demoTabsWithPages(designedTabs(tabs, ctx)).map((t) => designedDemoPage(ctx, demoTabPage(t, ctx))), ...pages.map((p) => designedDemoPage(ctx, p))];
}

/** The demo's tabs opening their pages instead of the bare screens, each with its name in Studio's languages. */
export function demoPageTabs(tabs: readonly LayoutTab[], ctx: Pick<SectionContext, "lang" | "demo" | "look">): LayoutTab[] {
  const lang: DemoLang = ctx.lang ?? "en";
  return designedTabs(tabs, ctx).map((tab) => {
    const word = TAB_WORDS[tab.label];
    const label = word ? String(WORDS[lang][`w_${word}`]) : tab.label;
    const translations: Record<string, Record<string, string>> = {};
    if (word) for (const l of LANGS.filter((x) => x !== lang)) translations[l] = { label: String(WORDS[l][`w_${word}`]) };
    const screen = tabScreen(tab);
    return {
      ...structuredClone(tab),
      label,
      ...(word ? { translations: translations as Translations } : {}),
      ...(screen ? { target: { type: "page" as const, page_slug: tab.id } } : {}),
    };
  });
}

/** 120.4 A page around one of the app's other screens: its title in the header when the screen has a fixed one, else nothing over it. */
function screenPage(slug: string, screen: string, title: { en: string; ar: string; tr: string } | null, name: string, ctx: SectionContext): DemoTabPage {
  const lang: DemoLang = ctx.lang ?? "en";
  const newId = ctx.newId ?? newNodeId;
  const others = LANGS.filter((l) => l !== lang);
  const translations = title ? (Object.fromEntries(others.map((l) => [l, { title: title[l] }])) as Translations) : undefined;
  const text = title ? title[lang] : name;
  return {
    slug,
    title: text,
    ...(translations ? { translations } : {}),
    studio: {
      ...(title ? { header: { type: "title" as const, title: text, ...(translations ? { translations } : {}) } } : {}),
      body: { id: newId(), type: "column", children: [] },
      screen,
    },
  };
}

/**
 * 120.4 Templates = demos, every screen of them: a page around each of the
 * app's screens that isn't one of its tabs, the ones a button opens
 * (settings, notifications) and the ones opened from the tabs (a shipment,
 * a restaurant's menu, the cart, an order, a ride on its way, a course, the
 * school's parts), so each can be changed in Studio. `taken`: the slugs of
 * the project's other pages; the tabs' ids (as the demo's own design has its
 * tabs, lib/studio/demo-designs) are taken too.
 */
export function demoScreenPages(app: { appType: string; vertical?: string | null }, tabs: readonly LayoutTab[], ctx: SectionContext, taken: ReadonlySet<string> = new Set()): DemoTabPage[] {
  const designed = designedTabs(tabs, ctx);
  const onTabs = new Set(designed.map(tabScreen).filter((s): s is StudioPageScreen => s !== null));
  const used = new Set([...taken, ...designed.map((t) => t.id)]);
  const slugFor = (id: string) => {
    let slug = id.replace(/_/g, "-");
    if (used.has(slug)) slug = `${slug}-screen`;
    used.add(slug);
    return slug;
  };
  const own = pageScreenOptionsFor(app as Pick<App, "appType" | "vertical">)
    .map((o) => o.value)
    .filter((s) => !onTabs.has(s as StudioPageScreen) && OWN_SCREEN_TITLES[s] && !innerScreen(s));
  return [
    ...own.map((s) => screenPage(slugFor(s), s, OWN_SCREEN_TITLES[s]!, OWN_SCREEN_TITLES[s]!.en, ctx)),
    ...innerScreensFor(app).map((s) => screenPage(slugFor(s.id), s.id, s.title, innerScreenName(s.id)!, ctx)),
  ].map((p) => designedDemoPage(ctx, p));
}
