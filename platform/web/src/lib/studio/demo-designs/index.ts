import type { LayoutTab, StudioHeader, StudioHeaderStyle, StudioNode, StudioPage, TabBarStyle } from "../../pages/types";
import type { StudioDemoId } from "../../demo/constants";
import { translating } from "../demo-templates";
import type { Fits, SectionContext, SectionWord, TemplateInfo } from "../sections";
import { FOOD_PHOTO_PAGE_HEADER, FOOD_PHOTO_TAB_BAR, foodPhotoHome, foodPhotoPage } from "../photo-food";
import { MARKET_PHOTO_TAB_BAR, marketPhotoHome, marketPhotoPage, marketPhotoTabs, marketShopsPage } from "../photo-market";
import { lamhaHome, lamhaPage, LAMHA_INK } from "./lamha-taxi";
import { masarHome, masarPage, MASAR_INK } from "./masar-rides";
import type { DemoInk } from "./parts";
import { safraHome, safraPage, SAFRA_INK } from "./safra-travel";
import { sahmHome, sahmPage, SAHM_INK } from "./sahm-express";
import { schoolTodayHome } from "../school-home";
import { teachersPhotoHome } from "../teachers-home";
import { NAKHLA_LOOK, RAWAQ_LOOK, rawaqTabs, schoolPage } from "./school-looks";
import { signatureLook } from "./signatures";

/**
 * 128 The Studio demos made premium and complete (the owner, 13 November
 * 2026): each demo's home as its approved board, its own template of its
 * kind (offered to every project of the kind, as the demo's home is), and
 * every page after it in the same look: its tabs, its header and background
 * in the demo's colours by day and by night, over the screens of its tabs
 * the demo's own elements (a banner of its photos, the person's order,
 * shipment or ride), the pages of its own a tab opens (Zad's Shops) and its
 * bar. Sofra Eats and Zad (lib/studio/photo-food.ts, photo-market.ts),
 * Sahm Express, Masar Rides and Lamha Taxi (this folder), Nakhla School and
 * Rawaq Academy (lib/studio/school-home.ts, teachers-home.ts, this folder's
 * school-looks.ts) are made the same way, and 126 Safra (this folder's
 * safra-travel.ts: travel's own template, its pages on the travel module's
 * paper, its kind's tabs and the dot bar). The demo app (lib/demo/setup.ts), a project its template starts
 * (lib/studio/start.ts) and its whole design (lib/studio/designs.ts) all
 * make their pages here, through `ctx.demo` (lib/studio/demo-pages.ts), so
 * they stay the same (tests/unit/studio-demo-templates.test.ts).
 */

/** The colours of a demo's pages after its home, by day and by night: the header's, and the page's own (missing, the app's). */
export interface DemoPageLook {
  header: Pick<StudioHeader, "background" | "color" | "dark_background" | "dark_color">;
  background?: string;
  dark_background?: string;
  /** Only on the pages with a header (the account's screen keeps the look its sign-in sets); missing, every page after the home. */
  headed?: boolean;
}

export interface DemoDesign {
  /** The kind's template the demo's home is (lib/studio/demo-templates.ts DEMO_HOME_TEMPLATES), made by `home`. */
  template: { id: string; icon: string; fits: Fits };
  home: (ctx: SectionContext) => StudioPage;
  /** The demo's own elements over one of the app's screens, in place of the usual word; null, the usual ones. */
  over: (screen: string, ctx: SectionContext) => StudioNode[] | null;
  /** The colours of its pages after the home; missing, the usual ones. */
  look?: DemoPageLook;
  /** The demo's tabs from its kind's; missing, its kind's. */
  tabs?: (tabs: readonly LayoutTab[]) => LayoutTab[];
  /** The pages of its own its tabs open (Zad's Shops), after the tabs' pages. */
  pages?: (ctx: SectionContext) => { slug: string; title: SectionWord; studio: StudioPage }[];
  /** Its bar, as approved (lib/demo/screens.ts DEMO_TAB_BARS); missing, the demo's own there (the taxi's dark island). */
  bar?: TabBarStyle;
  /** 130 The premium style of the headers of its pages after the home (a Signature look's); missing, none. */
  headerStyle?: StudioHeaderStyle;
}

/** A tab opening `screen`, made over. */
function retab(tabs: readonly LayoutTab[], change: (tab: LayoutTab) => LayoutTab | null): LayoutTab[] {
  return structuredClone([...tabs])
    .map(change)
    .filter((t): t is LayoutTab => t !== null);
}

const screenOf = (tab: LayoutTab) => (tab.target.type === "screen" ? tab.target.screen : null);

/** A ride app opening on its home as the Ride tab (the boards' bar: Ride, My rides, Account). */
function rideTabs(tabs: readonly LayoutTab[]): LayoutTab[] {
  return retab(tabs, (t) => (t.id === "home" ? { ...t, label: "Ride", icon: "local_taxi" } : screenOf(t) === "ride" ? null : screenOf(t) === "my_rides" ? { ...t, icon: "history" } : screenOf(t) === "account" ? { ...t, icon: "person" } : t));
}

/** The pages after the home in a demo's colours: the header on its surface, the page on its paper. */
function inkLook(k: DemoInk): DemoPageLook {
  return { header: { background: k.surface, color: k.ink, dark_background: k.darkSurface, dark_color: k.darkInk }, background: k.page, dark_background: k.darkPage };
}

/** 119 The demos' bars as approved: across the bottom with the open tab's icon in a soft pill. */
function classicBar(k: DemoInk): TabBarStyle {
  return { design: "classic", background: k.surface, dark_background: k.darkSurface, inactive: k.muted, dark_inactive: k.darkMuted, margin: 0, radius: 0 };
}

const STUDIO_DEMO_DESIGNS: Partial<Record<StudioDemoId, DemoDesign>> = {
  // 128.1 Food, photo first: the cuisines over the restaurants, the order on its way over the orders, the floating pill.
  food: { template: { id: "food_photo", icon: "restaurant", fits: { types: ["food"] } }, home: foodPhotoHome, over: foodPhotoPage, look: { header: FOOD_PHOTO_PAGE_HEADER }, bar: FOOD_PHOTO_TAB_BAR },
  // 128.2 A marketplace, photo tiles: five named tabs, Shops a page of its own.
  marketplace: {
    template: { id: "market_photo", icon: "storefront", fits: { types: ["food"], verticals: ["marketplace"] } },
    home: marketPhotoHome,
    over: marketPhotoPage,
    tabs: marketPhotoTabs,
    pages: (ctx) => [{ slug: "shops", title: "tabShops", studio: marketShopsPage(ctx) }],
    bar: MARKET_PHOTO_TAB_BAR,
  },
  // 128.3–128.5 The courier in the city, the ride at night, the taxi map (the taxi keeps its dark island).
  delivery: {
    template: { id: "delivery_city", icon: "two_wheeler", fits: { types: ["delivery"] } },
    home: sahmHome,
    over: sahmPage,
    look: inkLook(SAHM_INK),
    tabs: (tabs) => retab(tabs, (t) => (screenOf(t) === "send_parcel" ? { ...t, icon: "send" } : screenOf(t) === "account" ? { ...t, icon: "person" } : t)),
    bar: classicBar(SAHM_INK),
  },
  rides: { template: { id: "ride_night", icon: "nightlife", fits: { types: ["rides"] } }, home: masarHome, over: masarPage, look: inkLook(MASAR_INK), tabs: rideTabs, bar: classicBar(MASAR_INK) },
  taxi: { template: { id: "taxi_map", icon: "map", fits: { types: ["rides"] } }, home: lamhaHome, over: lamhaPage, look: inkLook(LAMHA_INK), tabs: rideTabs },
  // 128.6 128.7 The family's school day; the teachers in circles, its Teachers tab.
  school: { template: { id: "school_today", icon: "family_restroom", fits: { types: ["school"] } }, home: schoolTodayHome, over: schoolPage(NAKHLA_LOOK), look: NAKHLA_LOOK, bar: { design: "classic", background: "#FFFFFF", dark_background: "#122033", active: "#1F4E79", dark_active: "#9CC3EA", inactive: "#56657A", dark_inactive: "#A6B3C3" } },
  // 126 Safra: travel's own template as its Explore, the pages after it on the travel module's paper (its header too), its kind's tabs, the dot under the open tab.
  travel: {
    template: { id: "travel", icon: "travel_explore", fits: { types: ["travel"] } },
    home: safraHome,
    over: safraPage,
    look: { header: { background: SAFRA_INK.page, color: SAFRA_INK.ink, dark_background: SAFRA_INK.darkPage, dark_color: SAFRA_INK.darkInk }, background: SAFRA_INK.page, dark_background: SAFRA_INK.darkPage },
    bar: { design: "dot", active: SAFRA_INK.ink, dark_active: "#C9A063" },
  },
  instructors: { template: { id: "teachers_photo", icon: "co_present", fits: { types: ["lms"], verticals: ["instructors"] } }, home: teachersPhotoHome, over: schoolPage(RAWAQ_LOOK), look: RAWAQ_LOOK, tabs: rawaqTabs, bar: { design: "classic", background: "#FFFFFF", dark_background: "#15221C", active: "#2E5E4E", dark_active: "#8FD1B6", inactive: "#5A665F", dark_inactive: "#A9B7AF" } },
};

/** The demo's own design, when it has one. */
export function studioDemoDesign(demo: StudioDemoId | undefined): DemoDesign | undefined {
  return demo ? STUDIO_DEMO_DESIGNS[demo] : undefined;
}

// ——— 130 The Signature looks: a project started from one (`ctx.look`) has its pages in the look (./signature.ts) ———
type PagesDesign = Omit<DemoDesign, "template" | "home">;
/** The design of the pages after the home: the project's Signature look's, else its demo's. */
function designOf(ctx: Pick<SectionContext, "demo" | "look">): PagesDesign | undefined {
  return (ctx.look ? signatureLook(ctx.look)?.design : undefined) ?? studioDemoDesign(ctx.demo);
}
// ——— end 130 ———

/** A demo's home as a template of its kind (lib/studio/sections.ts TEMPLATES), in the dashboard's language with Studio's others as translations. */
export function demoDesignTemplate(demo: StudioDemoId): TemplateInfo {
  const d = STUDIO_DEMO_DESIGNS[demo]!;
  return {
    id: d.template.id,
    icon: d.template.icon,
    fits: d.template.fits,
    make: (ctx: SectionContext) => {
      const { ctx: words, translate } = translating(ctx);
      const page = d.home(words);
      return { ...page, body: translate(page.body) };
    },
  };
}

/** The demo's bar as approved (lib/demo/screens.ts DEMO_TAB_BARS). */
export function demoDesignBar(demo: StudioDemoId): TabBarStyle {
  const bar = STUDIO_DEMO_DESIGNS[demo]?.bar;
  if (!bar) throw new Error(`The ${demo} demo's design has no bar of its own.`);
  return bar;
}

/** The demo's tabs as its own design has them (the kind's, for a demo without one or a project not made from a demo). */
export function designedTabs(tabs: readonly LayoutTab[], ctx: Pick<SectionContext, "demo" | "look">): readonly LayoutTab[] {
  const own = designOf(ctx)?.tabs;
  return own ? own(tabs) : tabs;
}

/**
 * A page after the demo's home in the demo's look: its header and
 * background in the demo's colours, and over its screen the demo's own
 * elements where it has them, in Studio's languages. Pages of projects not
 * made from a demo (`ctx.demo` missing), and of demos without a design of
 * their own, as they are.
 */
export function designedDemoPage<P extends { studio: StudioPage }>(ctx: SectionContext, page: P): P {
  const design = designOf(ctx);
  if (!design) return page;
  const { ctx: words, translate } = translating(ctx);
  const own = page.studio.screen ? design.over(page.studio.screen, words) : null;
  const { header: was, ...studio } = page.studio;
  const look = design.look && (!design.look.headed || was) ? design.look : undefined;
  const coloured = was && look ? { ...was, ...look.header } : was;
  // 130 A Signature look's premium header on every page that has one.
  const header = coloured && design.headerStyle ? { ...coloured, style: design.headerStyle } : coloured;
  return {
    ...page,
    studio: {
      ...studio,
      ...(header ? { header } : {}),
      ...(look?.background ? { background: look.background } : {}),
      ...(look?.dark_background ? { dark_background: look.dark_background } : {}),
      body: { ...page.studio.body, children: own ? own.map(translate) : page.studio.body.children },
    },
  };
}

/** The pages of its own the demo's tabs open (Zad's Shops), made with `ctx` (its words, in Studio's languages through `translate`). */
export function designedOwnPages(ctx: SectionContext): { slug: string; title: SectionWord; studio: StudioPage }[] {
  return designOf(ctx)?.pages?.(ctx) ?? [];
}
