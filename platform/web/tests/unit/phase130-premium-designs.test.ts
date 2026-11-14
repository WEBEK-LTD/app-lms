import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ICON_NAMES } from "@/components/icon-names";
import { KINDS } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import type { App } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { itemSourcesFor } from "@/lib/pages/sources";
import { TAB_BAR_DESIGNS, type ItemSource, type LayoutContent, type LayoutPage, type StudioPage } from "@/lib/pages/types";
import { parseLayoutContent, parseStudioPage } from "@/lib/pages/validate";
import { APP_WORDS, appWords } from "@/lib/studio/app-words";
import { THEME_CHROME } from "@/lib/studio/demo-designs/chrome";
import { designPages } from "@/lib/studio/design-file";
import { applyWholeDesign, DESIGN_THEMES, designsFor, makeDesign, PREMIUM_HOME } from "@/lib/studio/designs";
import { PREMIUM_BARS, PREMIUM_DESIGN_IDS, PREMIUM_DESIGN_PHOTOS, PREMIUM_PALETTES } from "@/lib/studio/premium-designs";
import type { SectionContext } from "@/lib/studio/sections";
import { allNodes } from "@/lib/studio/tree";

/**
 * 130.30–130.39 Studio's whole designs, premium for every kind of project:
 * each look's home made for the kind from the premium library, a premium
 * header on every page, a floating bar, the system screens' look, a night
 * of its own, the platform's free photos and the app's words in English,
 * Arabic and Turkish; never a made-up number, price or rating.
 */

const NOW = new Date("2026-11-14T10:00:00Z");
const LANGS = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };
const words = { home: "Home", template: (id: string) => id, theme: (id: string) => id };
/** The premium library's elements a home is made of. */
const PREMIUM = new Set(["stories", "slider", "bento", "gallery", "marquee", "testimonials", "parallax_banner", "photo_hero", "profile_card", "badge_text", "timeline"]);
/** The kind's live cards, read from the person's own data. */
const LIVE = new Set(["learning", "school", "live_status", "tracking"]);

function projectApp(kind: (typeof KINDS)[number], name = "Nour"): App {
  return { ...newApp("client", null, NOW, kind.engine, kind.vertical), section: "studio", backend: "hosted", appName: name };
}

function context(app: App, lang: "en" | "ar" | "tr" = "en"): SectionContext {
  let n = 0;
  return { brand: "#1F4E5F", source: itemSourcesFor(app)[0] ?? null, app: app.appName!, lang, w: appWords(lang, app.appName!) as SectionContext["w"], picture: (f) => `${appUrl()}/design-pictures/${f}`, newId: () => `n${++n}` };
}

const premiumOf = (kind: (typeof KINDS)[number]) => designsFor({ type: kind.engine, vertical: kind.vertical }).filter((d) => !d.demo);

/** The design's pages as a project's, checked as the editor saves them (its links between its pages too). */
function checkDesign(app: App, pages: { slug: string; title: string; studio: StudioPage }[]): string[] {
  const ready = defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW);
  const layout = { ...ready, languages: LANGS, pages: [...ready.pages.filter((p) => !pages.some((d) => d.slug.replaceAll("_", "-") === p.slug)), ...pages.map((p) => ({ slug: p.slug.replaceAll("_", "-"), title: p.title, show_title: false, updated_at: NOW.toISOString(), blocks: [], studio: p.studio }))] };
  const parsed = parseLayoutContent(layout, { app, now: NOW });
  return parsed.ok ? [] : parsed.errors;
}

describe("130.30 every whole design is premium, for every kind", () => {
  it("offers each kind at least six premium designs, the ids projects saved kept", () => {
    expect(DESIGN_THEMES.map((t) => t.id)).toEqual([...PREMIUM_DESIGN_IDS]);
    for (const kind of KINDS) {
      const designs = premiumOf(kind);
      expect(designs.length, kind.id).toBeGreaterThanOrEqual(6);
      expect(designs.map((d) => d.id)).toEqual(PREMIUM_DESIGN_IDS.map((id) => `yallapp-${id}`));
      for (const d of designs) expect(d.templates[0], kind.id).toBe(PREMIUM_HOME);
    }
  });

  it("makes a premium home, header, bar, night and system look the page checker takes, for every kind and look", () => {
    const homes = new Set<string>();
    for (const kind of KINDS) {
      const app = projectApp(kind);
      for (const design of premiumOf(kind)) {
        const file = makeDesign(design, context(app), words, LANGS);
        const where = `${kind.id} › ${design.id}`;
        expect(checkDesign(app, file.pages), where).toEqual([]);
        for (const page of file.pages) {
          // A premium header on every page, never a plain bar; its night designed.
          expect(page.studio.header?.style, `${where} › ${page.slug}`).toBeTruthy();
          expect(page.studio.dark_background, `${where} › ${page.slug}`).toBe(PREMIUM_PALETTES[design.theme.id as keyof typeof PREMIUM_PALETTES].darkPage);
        }
        const home = file.pages[0]!.studio;
        const types = allNodes(home).map((n) => n.type);
        expect(types.filter((t) => PREMIUM.has(t)).length, where).toBeGreaterThanOrEqual(3);
        homes.add(JSON.stringify(types));
        // Every coloured part of the home has its night colour.
        for (const n of allNodes(home)) {
          if (n.background && !["photo_hero", "parallax_banner", "button"].includes(n.type) && n.background !== "#FFFFFF") expect(n.dark_background, `${where} › ${n.type}`).toBeTruthy();
          if (n.type === "text" && n.color && n.color !== "#FFFFFF" && !n.bind) expect(n.dark_color ?? n.color, `${where} › text`).toBeTruthy();
        }
        // The floating bar, the system screens' look and the second colour.
        expect(["float", "dock", "glass"]).toContain(file.look?.tab_bar?.design);
        expect(TAB_BAR_DESIGNS).toContain(file.look?.tab_bar?.design);
        expect(file.look?.screens?.system?.look).toBe(THEME_CHROME[design.theme.id]!.system.look);
        if (file.look?.screens?.system?.look === "photo") expect(file.look.screens.system.image_url).toMatch(/^https?:\/\/.+\.jpg$/);
        expect(file.look?.secondary_color).toBe(PREMIUM_PALETTES[design.theme.id as keyof typeof PREMIUM_PALETTES].accent);
      }
    }
    // Each look composed its own way.
    expect(homes.size).toBeGreaterThanOrEqual(PREMIUM_DESIGN_IDS.length * 5);
  });

  it("puts the kind's live card where it has one: the person's own, signed in, never a sample", () => {
    const expected: Record<string, string> = { academy: "learning", instructors: "learning", school: "school", food: "live_status", marketplace: "live_status", delivery: "tracking", rides: "tracking", taxi: "tracking" };
    for (const kind of KINDS) {
      const app = projectApp(kind);
      for (const design of premiumOf(kind)) {
        const home = makeDesign(design, context(app), words, LANGS).pages[0]!.studio;
        const live = allNodes(home).filter((n) => LIVE.has(n.type));
        if (expected[kind.id]) expect(live.map((n) => n.type), `${kind.id} › ${design.id}`).toContain(expected[kind.id]);
        else expect(live, `${kind.id} › ${design.id}`).toEqual([]);
        for (const n of live) expect(n.visibility).toBe("signed_in");
      }
    }
  });

  it("invents no number, price, rating or plan: quotes and promises are the owner's [brackets]", () => {
    for (const kind of KINDS) {
      const app = projectApp(kind);
      for (const design of premiumOf(kind)) {
        for (const page of makeDesign(design, context(app), words, LANGS).pages) {
          if (page.slug !== "home" && page.slug !== "brand") continue;
          for (const n of allNodes(page.studio)) {
            expect(["stats", "pricing", "progress"]).not.toContain(n.type);
            expect(n.rating ?? null).toBeNull();
            for (const e of n.entries ?? []) {
              expect(e.value ?? null, `${kind.id} › ${design.id}`).toBeNull();
              expect(e.price ?? null).toBeNull();
            }
            if (n.type === "testimonials") for (const e of n.entries ?? []) expect(e.text).toMatch(/^\[.+\]$/);
          }
        }
      }
    }
  });

  it("uses only the platform's own CC0 or public-domain photos, each credited beside it", () => {
    const credits: Record<string, string> = {};
    for (const dir of ["demo-photos", "demo-screens", "travel-photos"]) {
      for (const c of JSON.parse(readFileSync(join(process.cwd(), "public", dir, "CREDITS.json"), "utf8")) as { file: string; license: string }[]) credits[`/${dir}/${c.file}`] = c.license;
    }
    const story = JSON.parse(readFileSync(join(process.cwd(), "src", "site", "story", "photos.json"), "utf8")) as Record<string, { src: string; credit: { license: string } }[]>;
    for (const list of Object.values(story)) for (const p of list) credits[p.src] = p.credit.license;
    for (const path of PREMIUM_DESIGN_PHOTOS) {
      expect(existsSync(join(process.cwd(), "public", path)), path).toBe(true);
      expect(credits[path], path).toMatch(/^(CC0|Public domain)/i);
    }
    // And no other photo in a design's pages.
    const app = projectApp(KINDS[0]!);
    for (const kind of KINDS) {
      for (const design of premiumOf(kind)) {
        const json = JSON.stringify(makeDesign(design, context({ ...app, appType: kind.engine, vertical: kind.vertical }), words, LANGS).pages.slice(0, 1));
        for (const url of json.match(/\/(?:stories|demo-photos|demo-screens|travel-photos)\/[^"]+\.jpg/g) ?? []) expect(PREMIUM_DESIGN_PHOTOS, url).toContain(url);
      }
    }
  });

  it("draws every icon in Material Symbols Rounded, in the app's set and the site's", () => {
    const dart = readFileSync(join(process.cwd(), "..", "..", "mobile", "lib", "core", "theme", "symbol_names.dart"), "utf8");
    const icons = new Set<string>();
    for (const kind of KINDS) {
      for (const design of premiumOf(kind)) {
        for (const page of makeDesign(design, context(projectApp(kind)), words, LANGS).pages.filter((p) => p.slug === "home" || p.slug === "brand")) {
          for (const n of allNodes(page.studio)) {
            if (n.icon) icons.add(n.icon);
            for (const e of n.entries ?? []) if (e.icon) icons.add(e.icon);
            for (const s of n.slides ?? []) if ("icon" in s && s.icon) icons.add(s.icon as string);
          }
        }
      }
    }
    expect(icons.size).toBeGreaterThan(20);
    for (const icon of icons) {
      expect(dart, icon).toContain(`'${icon}':`);
      expect(ICON_NAMES as readonly string[], icon).toContain(icon);
    }
  });

  it("writes every word into the app in English, Arabic and Turkish", () => {
    const keys = Object.keys(APP_WORDS.en).filter((k) => k.startsWith("pd"));
    expect(keys.length).toBeGreaterThan(240);
    for (const k of keys) for (const l of ["ar", "tr"] as const) expect((APP_WORDS[l] as Record<string, string>)[k], `${l} › ${k}`).toBeTruthy();
    // Made in Arabic: Arabic first, English and Turkish as translations, and the other way round.
    for (const kind of KINDS) {
      const app = projectApp(kind, "نور");
      const home = makeDesign(premiumOf(kind)[0]!, context(app, "ar"), words, LANGS).pages[0]!.studio;
      const texts = allNodes(home).filter((n) => n.type === "text" && n.text && !n.bind);
      expect(texts.length).toBeGreaterThan(2);
      for (const n of texts) {
        expect(n.text, kind.id).toMatch(/[؀-ۿ]|^\d+$/);
        expect(n.translations?.en?.text, kind.id).toBeTruthy();
        expect(n.translations?.tr?.text, kind.id).toBeTruthy();
      }
    }
  });

  it("applies the design's floating bar with its pages, and keeps an applied design as it was saved", () => {
    const kind = KINDS.find((k) => k.id === "store")!;
    const app = projectApp(kind);
    const design = premiumOf(kind).find((d) => d.id === "yallapp-evening")!;
    const file = makeDesign(design, context(app), words, LANGS);
    const page = (slug: string): LayoutPage => ({ slug, title: slug, show_title: false, updated_at: "x", blocks: [], studio: { body: { id: `${slug}-r`, type: "column", children: [] } } });
    const current = { appearance: { font: "Manrope" } as never, languages: LANGS, tabs: [], pages: [page("home"), page("shop")] } as LayoutContent;
    const fitted = designPages(file, { sources: itemSourcesFor(app), categorySources: [], screens: [], newId: (() => { let n = 0; return () => `x${++n}`; })(), pages: current.pages, languages: LANGS, pictures: new Map(), now: "now" });
    const next = applyWholeDesign(current, fitted, file.look, { mode: "project", openSlug: "home", pageIndex: 0, keep: false, now: "now", designSlugs: file.pages.map((p) => p.slug) });
    expect(next.tab_bar).toEqual(PREMIUM_BARS.evening);
    expect(next.appearance.secondary_color).toBe(PREMIUM_PALETTES.evening.accent);
    expect(next.pages[0]!.studio!.header?.style).toBe("glass");
    // The page only: the bar stays.
    const one = applyWholeDesign(current, fitted, undefined, { mode: "page", openSlug: "home", pageIndex: 0, keep: false, now: "now" });
    expect(one.tab_bar).toBeUndefined();
    // A project that applied an older design keeps what it saved: nothing reads the design again.
    const saved: StudioPage = { header: { type: "logo_center", buttons: ["menu"] }, background: "#FFF7ED", body: { id: "r", type: "column", children: [] } };
    expect(parseStudioPage(saved, app, LANGS).ok).toBe(true);
  });
});

/** Entries for the gallery's lists, on the platform's own free photos (the gallery's sample data, never a project's). */
/** The gallery's middle tab for each kind: its main screen. */
const GALLERY_TAB: Record<string, [string, string, string]> = {
  academy: ["courses", "Courses", "menu_book"],
  instructors: ["teachers", "Teachers", "groups"],
  store: ["search", "Search", "search"],
  restaurant: ["search", "Menu", "restaurant_menu"],
  bookings: ["services", "Services", "event_available"],
  clinic: ["services", "Services", "stethoscope"],
  fitness: ["classes", "Classes", "fitness_center"],
  services: ["services", "Services", "category"],
  real_estate: ["favorites", "Saved", "bookmark"],
  news: ["articles", "News", "newspaper"],
  events: ["events", "Events", "event"],
  charity: ["campaigns", "Campaigns", "volunteer_activism"],
  delivery: ["shipments", "Shipments", "local_shipping"],
  food: ["restaurants", "Restaurants", "restaurant"],
  marketplace: ["restaurants", "Shops", "storefront"],
  rides: ["my_rides", "My rides", "route"],
  taxi: ["my_rides", "My rides", "local_taxi"],
  school: ["school", "School", "school"],
  travel: ["trips", "Trips", "luggage"],
};

const GALLERY_ITEMS: Record<ItemSource, [string, string, string][]> = {
  courses: [["Design foundations", "12 lessons", "/stories/academy/academy-live.jpg"], ["Arabic for beginners", "8 lessons", "/demo-screens/rawaq-library.jpg"], ["Public speaking", "10 lessons", "/stories/academy/academy-graduation.jpg"], ["Photography basics", "9 lessons", "/stories/multi-vendor/zad-cafe.jpg"]],
  products: [["Morning croissants", "Bakery", "/demo-photos/croissants.jpg"], ["Fresh juices", "Drinks", "/demo-photos/drinks.jpg"], ["Oranges", "Fruit", "/demo-photos/oranges.jpg"], ["Home refills", "Home", "/demo-photos/home.jpg"]],
  services: [["Consultation", "45 min", "/stories/academy/academy-live.jpg"], ["Morning session", "60 min", "/travel-photos/suite.jpg"], ["Home visit", "90 min", "/demo-photos/home.jpg"], ["Follow-up", "30 min", "/travel-photos/room.jpg"]],
  posts: [["Our news", "Today", "/travel-photos/city.jpg"], ["Behind the scenes", "This week", "/stories/multi-vendor/zad-cafe.jpg"], ["A day with us", "Weekend", "/travel-photos/beach.jpg"], ["What's next", "Soon", "/travel-photos/skyline.jpg"]],
  listings: [["Sea-view suite", "Two bedrooms", "/travel-photos/suite.jpg"], ["Calm bedroom", "One bedroom", "/travel-photos/room.jpg"], ["Skyline flat", "Three bedrooms", "/travel-photos/skyline.jpg"], ["Old town home", "Two bedrooms", "/travel-photos/oia.jpg"]],
  articles: [["The city at night", "City", "/stories/rides/rides-night-city.jpg"], ["Markets in the morning", "Life", "/stories/multi-vendor/zad-market-aisle.jpg"], ["A new skyline", "Business", "/travel-photos/skyline.jpg"], ["Back to school", "Education", "/demo-screens/nakhla-school.jpg"]],
  events: [["Sunset gathering", "Friday", "/stories/school/school-graduation-1.jpg"], ["Coffee tasting", "Saturday", "/stories/multi-vendor/zad-cafe.jpg"], ["Beach day", "Sunday", "/travel-photos/beach.jpg"], ["City lights walk", "Next week", "/stories/rides/rides-night-city.jpg"]],
  campaigns: [["Food parcels", "Families near us", "/stories/delivery/delivery-boxes.jpg"], ["Back to class", "School supplies", "/stories/school/school-teacher.jpg"], ["Bread for all", "Daily bread", "/demo-photos/toast-bread.jpg"], ["Market baskets", "Fresh food", "/demo-photos/tomatoes.jpg"]],
  delivery_services: [["Same day", "2 to 4 hours", "/stories/delivery/delivery-boxes.jpg"], ["Express", "Within the hour", "/stories/rides/rides-night-city.jpg"], ["Documents", "Within 4 hours", "/stories/delivery/delivery-shop-owner.jpg"], ["Business", "Every day", "/travel-photos/city.jpg"]],
  restaurants: [["The Mezze Table", "Mezze · Grill", "/demo-screens/sofra-mezze.jpg"], ["Kofta House", "Grill", "/demo-photos/kofta.jpg"], ["Pasta Corner", "Italian", "/demo-photos/penne-arrabbiata.jpg"], ["Morning Bakery", "Bakery · Coffee", "/demo-photos/croissants.jpg"]],
  vehicle_types: [["Economy", "Everyday cars", "/stories/rides/rides-backseat.jpg"], ["Comfort", "More room", "/stories/rides/rides-driver.jpg"], ["Night ride", "Late hours", "/stories/rides/rides-night-city.jpg"], ["City", "Short trips", "/travel-photos/city.jpg"]],
  school_news: [["Science fair on Friday", "Every class shows a project.", "/demo-screens/nakhla-school.jpg"], ["Parents' evening", "Meet the teachers.", "/stories/school/school-teacher.jpg"], ["Graduation", "The class of this year.", "/stories/school/school-graduation-1.jpg"], ["The library", "Open after school.", "/demo-screens/rawaq-library.jpg"]],
  bundles: [],
  hotels: [["Caldera view", "Santorini", "/demo-screens/safra-caldera.jpg"], ["Beach resort", "Bali", "/travel-photos/beach.jpg"], ["Riff suite", "Sri Lanka", "/travel-photos/suite.jpg"], ["Marina tower", "Dubai", "/travel-photos/skyline.jpg"]],
};

describe("130.38 the gallery for the owner's review (mobile/test/support/premium_designs.json)", () => {
  it("is every kind's premium designs as the app draws them", () => {
    const base = appUrl();
    const kinds = KINDS.map((kind) => {
      const app = projectApp(kind);
      const ctx = context(app);
      return {
        kind: kind.id,
        tabs: [
          { id: "home", label: "Home", icon: "home", target: { type: "page", page_slug: "home" } },
          { id: "main", label: GALLERY_TAB[kind.id]![1], icon: GALLERY_TAB[kind.id]![2], target: { type: "screen", screen: GALLERY_TAB[kind.id]![0] } },
          { id: "account", label: "Account", icon: "person", target: { type: "screen", screen: "account" } },
        ],
        engine: kind.engine,
        vertical: kind.vertical,
        designs: premiumOf(kind).map((design) => {
          const file = makeDesign(design, ctx, words, LANGS);
          return { id: design.theme.id, font: file.look?.font, secondary: file.look?.secondary_color, accent: design.theme.accent, tab_bar: file.look?.tab_bar, system: file.look?.screens?.system, home: file.pages[0]!.studio };
        }),
      };
    });
    const items = Object.fromEntries(Object.entries(GALLERY_ITEMS).map(([source, list]) => [source, list.map(([title, subtitle, photo], i) => ({ source, id: `${i + 1}`, title, subtitle, image_url: `${base}${photo}`, price_label: null, badge: null, action: { type: "item", item: { source, id: `${i + 1}` } } }))]));
    const data = `${JSON.stringify({ base, kinds, items })}\n`;
    const out = join(process.cwd(), "..", "..", "mobile", "test", "support", "premium_designs.json");
    if (process.env.YALLAPP_WRITE_PREMIUM_DESIGNS) writeFileSync(out, data);
    expect(readFileSync(out, "utf8")).toBe(data);
    // The gallery's own photos are the platform's free ones too.
    for (const list of Object.values(GALLERY_ITEMS)) for (const [, , photo] of list) expect(PREMIUM_DESIGN_PHOTOS.concat(["/stories/rides/rides-backseat.jpg"])).toContain(photo);
  });
});

