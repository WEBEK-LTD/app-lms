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
import type { ItemSource, LayoutContent, LayoutPage, StudioNode, StudioPage } from "@/lib/pages/types";
import { parseLayoutContent, parseStudioPage } from "@/lib/pages/validate";
import { APP_WORDS, appWords } from "@/lib/studio/app-words";
import { THEME_CHROME } from "@/lib/studio/demo-designs/chrome";
import { designPages } from "@/lib/studio/design-file";
import { applyWholeDesign, DESIGN_THEMES, designsFor, isNewDesign, makeDesign, PREMIUM_HOME } from "@/lib/studio/designs";
import { PAGE_TEMPLATES } from "@/lib/studio/page-templates";
import { LANDING_IDS, LANDING_SECTIONS, LANDING_TEMPLATES, landingPalette } from "@/lib/studio/premium-landings";
import { NEW_PREMIUM_DESIGNS, PREMIUM_BARS, PREMIUM_COURSE_SCREENS, PREMIUM_DESIGN_IDS, PREMIUM_DESIGN_PHOTOS, PREMIUM_PALETTES } from "@/lib/studio/premium-designs";
import { toneStyle } from "@/lib/studio/scrim";
import { SECTIONS, sectionsFor, templatesFor, type ProjectKind, type SectionContext } from "@/lib/studio/sections";
import { allNodes } from "@/lib/studio/tree";
import { en as studioEn, ar as studioAr, tr as studioTr } from "@/i18n/dashboard/studio";

/**
 * 130.60–130.62 New premium options in Studio, added after everything there
 * was (nothing replaced or reordered): Monochrome luxe (`mono`), a seventh
 * premium whole design for every kind, its photos in black and white
 * (130.61 `tone`), and six new premium landings (page templates and their
 * openings as sections), kind-aware. Never a made-up number, price or
 * review; the app's words in English, Modern Standard Arabic and Turkish.
 */

const NOW = new Date("2026-11-14T10:00:00Z");
const LANGS = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };
const words = { home: "Home", template: (id: string) => id, theme: (id: string) => id };
const PREMIUM = new Set(["stories", "slider", "bento", "gallery", "marquee", "testimonials", "parallax_banner", "photo_hero", "profile_card", "badge_text", "timeline", "cta_bar"]);
const LIVE = new Set(["learning", "school", "live_status", "tracking"]);
const LIVE_OF: Record<string, string> = { academy: "learning", instructors: "learning", school: "school", food: "live_status", marketplace: "live_status", delivery: "tracking", rides: "tracking", taxi: "tracking" };

function projectApp(kind: (typeof KINDS)[number], name = "Nour"): App {
  return { ...newApp("client", null, NOW, kind.engine, kind.vertical), section: "studio", backend: "hosted", appName: name };
}
const kindOf = (kind: (typeof KINDS)[number]): ProjectKind => ({ type: kind.engine, vertical: kind.vertical });

function context(app: App, lang: "en" | "ar" | "tr" = "en", brand = "#1F4E5F"): SectionContext {
  let n = 0;
  return { brand, source: itemSourcesFor(app)[0] ?? null, app: app.appName!, lang, w: appWords(lang, app.appName!) as SectionContext["w"], picture: (f) => `${appUrl()}/design-pictures/${f}`, newId: () => `n${++n}`, kind: { type: app.appType, vertical: app.vertical ?? null } };
}

/** Pages checked as the editor saves them. */
function check(app: App, pages: { slug: string; title: string; studio: StudioPage }[]): string[] {
  const ready = defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW);
  const layout = { ...ready, languages: LANGS, pages: [...ready.pages.filter((p) => !pages.some((d) => d.slug.replaceAll("_", "-") === p.slug)), ...pages.map((p) => ({ slug: p.slug.replaceAll("_", "-"), title: p.title, show_title: false, updated_at: NOW.toISOString(), blocks: [], studio: p.studio }))] };
  const parsed = parseLayoutContent(layout, { app, now: NOW });
  return parsed.ok ? [] : parsed.errors;
}

const monoOf = (kind: (typeof KINDS)[number]) => designsFor(kindOf(kind)).find((d) => d.id === "yallapp-mono")!;

/** Nothing made up: no number, price, rating or plan; the quotes and the owner's facts in [brackets]. */
function madeUp(page: StudioPage): string[] {
  const out: string[] = [];
  for (const n of allNodes(page)) {
    if (["stats", "pricing", "progress", "ratings"].includes(n.type)) out.push(n.type);
    if (n.rating != null) out.push("rating");
    for (const e of n.entries ?? []) if (e.value != null || e.price != null) out.push(`${n.type} value`);
    if (n.type === "testimonials") for (const e of n.entries ?? []) if (!/^\[.+\]$/.test(e.text ?? "")) out.push(`quote ${e.text}`);
    // A figure in a text is the owner's to fill: "[Number] customers", never "100+".
    if (n.type === "text" && n.text && !n.bind && /\d{2,}|\d+\s*[%+k]/.test(n.text.replace(/^0\d$/, ""))) out.push(`figure ${n.text}`);
  }
  return out;
}

function icons(page: StudioPage): Set<string> {
  const out = new Set<string>();
  for (const n of allNodes(page)) {
    if (n.icon) out.add(n.icon);
    for (const e of n.entries ?? []) if (e.icon) out.add(e.icon);
    for (const s of n.slides ?? []) if (s.icon) out.add(s.icon);
  }
  return out;
}

describe("130.60 Monochrome luxe: a new premium whole design for every kind, after the six", () => {
  it("is the seventh design of every kind, after the six that were (their ids and order kept), marked new", () => {
    expect(PREMIUM_DESIGN_IDS.slice(0, 6)).toEqual(["warm", "fresh", "evening", "ocean", "classic", "rose"]);
    expect(PREMIUM_DESIGN_IDS.at(-1)).toBe("mono");
    expect(NEW_PREMIUM_DESIGNS).toEqual(["mono"]);
    expect(DESIGN_THEMES.map((t) => t.id)).toEqual([...PREMIUM_DESIGN_IDS]);
    for (const kind of [...KINDS.map(kindOf), null]) {
      const all = designsFor(kind);
      const premium = all.filter((d) => !d.demo);
      expect(premium.map((d) => d.id)).toEqual(PREMIUM_DESIGN_IDS.map((id) => `yallapp-${id}`));
      // Last of all, after the demo's two looks and the six.
      expect(all.at(-1)!.id).toBe("yallapp-mono");
      expect(all.filter(isNewDesign).map((d) => d.id)).toEqual(["yallapp-mono"]);
      expect(all.at(-1)!.templates[0]).toBe(PREMIUM_HOME);
    }
  });

  it("makes a home of its own for every kind: the cover, the ticker, the index, the posters, two panels, the banner, the quotes on ink, all photos in black and white", () => {
    const homes = new Set<string>();
    for (const kind of KINDS) {
      const app = projectApp(kind);
      const file = makeDesign(monoOf(kind), context(app), words, LANGS);
      expect(check(app, file.pages), kind.id).toEqual([]);
      const home = file.pages[0]!.studio;
      const nodes = allNodes(home);
      const types = nodes.map((n) => n.type);
      homes.add(JSON.stringify(types));
      expect(types.filter((t) => PREMIUM.has(t)).length, kind.id).toBeGreaterThanOrEqual(4);
      // Its own composition, unlike any of the six.
      const first = home.body.children![0]!;
      expect(first.type).toBe("photo_hero");
      expect(first.tone).toBe("mono");
      expect(first.ken_burns).toBe(true);
      expect(types).toContain("marquee");
      expect(types).toContain("parallax_banner");
      // Every photo it draws in black and white.
      for (const n of nodes.filter((x) => (x.type === "photo_hero" || x.type === "parallax_banner") && x.image_url)) expect(n.tone, `${kind.id} › ${n.type}`).toBe("mono");
      // The list as black-and-white posters (a store's products opened lately, first, keep their colours).
      if (itemSourcesFor(app)[0]) expect(nodes.filter((n) => n.type === "items" && !n.recent).map((n) => allNodes({ body: n.card! }).find((x) => x.bind === "image")?.tone), kind.id).toEqual(["mono"]);
      // The display face and the mono face.
      expect(nodes.some((n) => n.font?.family === "Bricolage Grotesque" && (n.font.size ?? 0) >= 44)).toBe(true);
      expect(nodes.some((n) => n.font?.family === "JetBrains Mono")).toBe(true);
      // The kind's live card, signed in only.
      const live = nodes.filter((n) => LIVE.has(n.type));
      if (LIVE_OF[kind.id]) expect(live.map((n) => n.type), kind.id).toContain(LIVE_OF[kind.id]);
      else expect(live).toEqual([]);
      for (const n of live) expect(n.visibility).toBe("signed_in");
      // A premium header on every page, the night designed.
      for (const page of file.pages) {
        expect(page.studio.header?.style, `${kind.id} › ${page.slug}`).toBeTruthy();
        expect(page.studio.dark_background).toBe(PREMIUM_PALETTES.mono.darkPage);
      }
      expect(home.header?.style).toBe("brand");
      for (const n of nodes) if (n.background && !["photo_hero", "parallax_banner", "button"].includes(n.type) && n.background !== "#FFFFFF") expect(n.dark_background, `${kind.id} › ${n.type}`).toBeTruthy();
      expect(madeUp(home), kind.id).toEqual([]);
      expect(madeUp(file.pages.find((p) => p.slug === "brand")!.studio), kind.id).toEqual([]);
    }
    // Shaped by the kind: its live card, its list.
    expect(homes.size).toBeGreaterThanOrEqual(5);
  });

  it("brings the ink dock, citron, Bricolage Grotesque, the system screens under the ink band and, for academies, its course screens", () => {
    for (const kind of KINDS) {
      const app = projectApp(kind);
      const file = makeDesign(monoOf(kind), context(app), words, LANGS);
      expect(file.look?.font).toBe("Bricolage Grotesque");
      expect(file.look?.secondary_color).toBe("#E2FF3D");
      expect(file.look?.tab_bar).toEqual(PREMIUM_BARS.mono);
      expect(file.look?.tab_bar?.design).toBe("dock");
      expect(file.look?.screens?.system).toEqual(THEME_CHROME.mono!.system);
      if (kind.engine === "lms") {
        expect(file.look?.screens?.course_card).toEqual(PREMIUM_COURSE_SCREENS.mono!.course_card);
        expect(file.look?.screens?.course_page).toEqual(PREMIUM_COURSE_SCREENS.mono!.course_page);
      } else expect(file.look?.screens?.course_card).toBeUndefined();
    }
    // The six before it bring no course screens: what they applied stays as it was.
    for (const id of PREMIUM_DESIGN_IDS.filter((x) => x !== "mono")) expect(PREMIUM_COURSE_SCREENS[id]).toBeUndefined();
  });

  it("applies with the whole project: its bar, second colour and font; a page alone keeps the bar", () => {
    const kind = KINDS.find((k) => k.id === "academy")!;
    const app = projectApp(kind);
    const file = makeDesign(monoOf(kind), context(app), words, LANGS);
    const page = (slug: string): LayoutPage => ({ slug, title: slug, show_title: false, updated_at: "x", blocks: [], studio: { body: { id: `${slug}-r`, type: "column", children: [] } } });
    const current = { appearance: { font: "Manrope" } as never, languages: LANGS, tabs: [], pages: [page("home")] } as LayoutContent;
    let n = 0;
    const fitted = designPages(file, { sources: itemSourcesFor(app), categorySources: [], screens: [], newId: () => `x${++n}`, pages: current.pages, languages: LANGS, pictures: new Map(), now: "now" });
    const next = applyWholeDesign(current, fitted, file.look, { mode: "project", openSlug: "home", pageIndex: 0, keep: false, now: "now", designSlugs: file.pages.map((p) => p.slug) });
    expect(next.tab_bar).toEqual(PREMIUM_BARS.mono);
    expect(next.appearance.secondary_color).toBe("#E2FF3D");
    expect(next.appearance.font_family).toBe("Bricolage Grotesque");
    // The photo stays black and white through the page checker.
    expect(allNodes(next.pages[0]!.studio!).find((x) => x.type === "photo_hero")?.tone).toBe("mono");
    expect(applyWholeDesign(current, fitted, undefined, { mode: "page", openSlug: "home", pageIndex: 0, keep: false, now: "now" }).tab_bar).toBeUndefined();
  });
});

describe("130.61 a photo in black and white (`tone`)", () => {
  it("is kept on a picture, a photo hero and a parallax banner, and nowhere else; an old page is as it was", () => {
    const app = projectApp(KINDS[0]!);
    const page = (n: StudioNode): StudioPage => ({ body: { id: "r", type: "column", children: [n] } });
    for (const type of ["image", "photo_hero", "parallax_banner"] as const) {
      const r = parseStudioPage(page({ id: "a", type, image_url: "https://example.com/a.jpg", tone: "mono" }), app, LANGS);
      expect(r.ok && r.value.body.children![0]!.tone, type).toBe("mono");
    }
    for (const [type, tone] of [["text", "mono"], ["image", "sepia"]] as const) {
      const r = parseStudioPage(page({ id: "a", type, text: "x", image_url: "https://example.com/a.jpg", tone: tone as "mono" }), app, LANGS);
      expect(r.ok && r.value.body.children![0]!.tone).toBeUndefined();
    }
    // A page saved before has no tone and gets none.
    const old = parseStudioPage(page({ id: "a", type: "photo_hero", image_url: "https://example.com/a.jpg" }), app, LANGS);
    expect(old.ok && "tone" in old.value.body.children![0]!).toBe(false);
    expect(toneStyle("mono").filter).toMatch(/grayscale\(1\)/);
    expect(toneStyle(undefined)).toEqual({});
    // The contract, the public copy identical.
    const yaml = readFileSync(join(process.cwd(), "..", "..", "docs", "api", "openapi.yaml"), "utf8");
    expect(yaml).toContain("tone: { type: string, enum: [mono]");
    expect(readFileSync(join(process.cwd(), "public", "developers", "openapi.yaml"), "utf8")).toBe(yaml);
  });
});

describe("130.62 six new premium landings (131.27 and Leqaa's petal), for every project, marked new", () => {
  it("are page templates after the ones before them and their openings ready sections at the end, each marked new", () => {
    expect(LANDING_IDS).toEqual(["land_cinema", "land_split", "land_stories", "land_bento", "land_magazine", "land_luxe", "land_petal"]);
    expect(PAGE_TEMPLATES.slice(-7).map((t) => t.id)).toEqual([...LANDING_IDS]);
    expect(PAGE_TEMPLATES.slice(0, -7).map((t) => t.id)).toEqual(["about", "faq", "reviews", "how", "join"]);
    expect(SECTIONS.slice(-7).map((s) => s.id)).toEqual([...LANDING_IDS]);
    for (const x of [...LANDING_TEMPLATES, ...LANDING_SECTIONS]) {
      expect(x.isNew).toBe(true);
      expect(x.fits).toBeUndefined();
    }
    // Nothing that was is marked new (131.26 but Leqaa's sections; 208 Lujain's and the installments tag), and every kind's template list is as it was.
    expect([...SECTIONS.slice(0, -7), ...PAGE_TEMPLATES.slice(0, -7)].filter((x) => x.isNew && !x.id.startsWith("lq_") && !x.id.startsWith("cl_") && !x.id.startsWith("mb_") && x.id !== "installments_soon")).toEqual([]);
    for (const kind of KINDS) {
      expect(templatesFor(kindOf(kind)).some((t) => t.id.startsWith("land_"))).toBe(false);
      expect(sectionsFor(kindOf(kind)).slice(-7).map((s) => s.id)).toEqual([...LANDING_IDS]);
    }
  });

  it("are six compositions of the premium library that the page checker takes, for every kind, in the project's own colour", () => {
    const shapes = new Set<string>();
    for (const kind of KINDS) {
      const app = projectApp(kind);
      const pages = LANDING_TEMPLATES.map((t) => ({ slug: t.id, title: t.id, studio: t.make(context(app, "en", "#7C3AED")) }));
      expect(check(app, pages), kind.id).toEqual([]);
      for (const { slug, studio } of pages) {
        const types = allNodes(studio).map((n) => n.type);
        shapes.add(`${slug} ${JSON.stringify(types.filter((t) => PREMIUM.has(t)))}`);
        expect(types.filter((t) => PREMIUM.has(t)).length, `${kind.id} › ${slug}`).toBeGreaterThanOrEqual(3);
        expect(studio.dark_background, slug).toBe(landingPalette("#7C3AED").darkPage);
        expect(madeUp(studio), `${kind.id} › ${slug}`).toEqual([]);
        for (const n of allNodes(studio)) if (n.background && !["photo_hero", "parallax_banner", "button", "image"].includes(n.type) && n.background !== "#FFFFFF") expect(n.dark_background, `${kind.id} › ${slug} › ${n.type}`).toBeTruthy();
      }
      // The project's colour on its buttons.
      expect(JSON.stringify(pages)).toContain("#7C3AED");
    }
    // Seven compositions, none like another.
    expect(new Set([...shapes].map((x) => x.slice(x.indexOf(" ") + 1))).size).toBe(7);
    // Each its own: the cinema's cover and story slider, the split's arch and ticker, the stories' rings first, the bento's live card first, the magazine's banner, the luxe sticky button.
    const app = projectApp(KINDS.find((k) => k.id === "store")!);
    const made = Object.fromEntries(LANDING_TEMPLATES.map((t) => [t.id, t.make(context(app))]));
    const kids = (id: string) => made[id]!.body.children!.map((n) => n.type);
    expect(kids("land_cinema").slice(0, 2)).toEqual(["photo_hero", "stories"]);
    expect(kids("land_cinema")).toContain("slider");
    expect(made.land_cinema!.header?.type).toBe("transparent");
    expect(kids("land_split").slice(0, 2)).toEqual(["row", "marquee"]);
    expect(kids("land_stories").slice(0, 2)).toEqual(["stories", "photo_hero"]);
    expect(made.land_bento!.header?.type).toBe("greeting");
    expect(kids("land_bento")).toContain("bento");
    expect(kids("land_magazine")).toContain("parallax_banner");
    expect(made.land_luxe!.body.children!.at(-1)).toMatchObject({ type: "cta_bar", pin: "bottom" });
    // One hero product: the store's first featured product.
    expect(allNodes(made.land_luxe!).find((n) => n.type === "items")?.query).toMatchObject({ limit: 1, featured: true });
  });

  it("are kind-aware: the live card is the kind's own (signed in only), the lists the kind's source, the photos the kind's", () => {
    for (const kind of KINDS) {
      const app = projectApp(kind);
      const ctx = context(app);
      for (const t of LANDING_TEMPLATES) {
        const nodes = allNodes(t.make(ctx));
        const live = nodes.filter((n) => LIVE.has(n.type));
        if (LIVE_OF[kind.id] && t.id !== "land_luxe") expect(live.map((n) => n.type), `${kind.id} › ${t.id}`).toContain(LIVE_OF[kind.id]);
        for (const n of live) expect(n.visibility).toBe("signed_in");
        for (const n of nodes.filter((x) => x.type === "items")) expect(n.source).toBe(ctx.source);
      }
    }
    // Without a kind: the general words and photos, and no live card.
    const app = projectApp(KINDS[0]!);
    for (const t of LANDING_TEMPLATES) expect(allNodes(t.make({ ...context(app), kind: null })).filter((n) => LIVE.has(n.type))).toEqual([]);
    // A delivery app's cinema opens its send screen; a ride app's its ride.
    const opens = (id: string) => JSON.stringify(LANDING_TEMPLATES[0]!.make(context(projectApp(KINDS.find((k) => k.id === id)!))));
    expect(opens("delivery")).toContain('"screen":"send_parcel"');
    expect(opens("rides")).toContain('"screen":"ride"');
  });

  it("drop as sections onto any page, the checker taking them", () => {
    for (const kind of KINDS) {
      const app = projectApp(kind);
      const ctx = context(app);
      const body: StudioNode = { id: "root", type: "column", children: LANDING_SECTIONS.map((s) => s.make(ctx)) };
      expect(check(app, [{ slug: "home", title: "Home", studio: { body } }]), kind.id).toEqual([]);
    }
  });

  it("use only the platform's own free photos and icons in Material Symbols Rounded, in the app's set and the site's", () => {
    const dart = readFileSync(join(process.cwd(), "..", "..", "mobile", "lib", "core", "theme", "symbol_names.dart"), "utf8");
    const all = new Set<string>();
    for (const kind of KINDS) {
      const app = projectApp(kind);
      const pages = [...LANDING_TEMPLATES.map((t) => t.make(context(app))), makeDesign(monoOf(kind), context(app), words, LANGS).pages[0]!.studio];
      for (const p of pages) {
        for (const i of icons(p)) all.add(i);
        for (const url of JSON.stringify(p).match(/\/(?:stories|demo-photos|demo-screens|travel-photos)\/[^"]+\.jpg/g) ?? []) expect(PREMIUM_DESIGN_PHOTOS, url).toContain(url);
      }
    }
    for (const icon of all) {
      expect(dart, icon).toContain(`'${icon}':`);
      expect(ICON_NAMES as readonly string[], icon).toContain(icon);
    }
    for (const t of LANDING_TEMPLATES) expect(ICON_NAMES as readonly string[], t.icon).toContain(t.icon);
  });
});

describe("130.60–130.62 the words: the app's in English, Modern Standard Arabic and Turkish; Studio's in its three", () => {
  const OWN = ["pdMoIndex", "pdMoNote", "pdMoSign", "pdLdStories", "pdLdNumbers", "pdLdNew", "pdLdNewLine", "pdLdIssue", "pdLdPick"] as const;
  it("has every new app word in the three languages, the owner's in [brackets]", () => {
    for (const k of OWN) {
      expect(APP_WORDS.en[k], k).toBeTruthy();
      expect(APP_WORDS.ar[k], k).toMatch(/[؀-ۿ]/);
      expect(APP_WORDS.tr[k], k).toBeTruthy();
    }
    for (const k of ["pdMoNote", "pdLdNewLine", "pdLdIssue"] as const) for (const l of ["en", "ar", "tr"] as const) expect(APP_WORDS[l][k]).toMatch(/^\[.+\]$/);
  });

  it("writes Arabic first with English and Turkish as translations when made in Arabic, for every kind", () => {
    for (const kind of KINDS) {
      const app = projectApp(kind, "نور");
      const pages = [...LANDING_TEMPLATES.map((t) => t.make(context(app, "ar"))), makeDesign(monoOf(kind), context(app, "ar"), words, LANGS).pages[0]!.studio];
      for (const p of pages) {
        // Not the figures, the quote mark or the app's own name.
        const texts = allNodes(p).filter((n) => n.type === "text" && n.text && !n.bind && !/^(0\d|“)$/.test(n.text) && n.text !== "نور");
        expect(texts.length).toBeGreaterThan(2);
        for (const n of texts) {
          expect(n.text, kind.id).toMatch(/[؀-ۿ]/);
          expect(n.translations?.en?.text, `${kind.id} › ${n.text}`).toBeTruthy();
          expect(n.translations?.tr?.text, `${kind.id} › ${n.text}`).toBeTruthy();
        }
      }
    }
  });

  it("names the design, the landings, their sections, the tone and the New tag in Studio's English, Egyptian Arabic and Turkish", () => {
    const keys = ["design_mono", "designsTagNew", "toneMono", ...LANDING_IDS.flatMap((id) => [`tpl_${id}`, `sec_${id}`])];
    for (const dict of [studioEn, studioAr, studioTr] as unknown as Record<string, string>[]) for (const k of keys) expect(dict[k], k).toBeTruthy();
    expect(studioAr.design_mono).toMatch(/[؀-ۿ]/);
    expect(studioAr.designsTagNew).toBe("جديد");
    // Never Yallapp's own plan names or prices.
    const all = JSON.stringify(keys.map((k) => [studioEn, studioAr, studioTr].map((d) => (d as unknown as Record<string, string>)[k])));
    expect(all).not.toMatch(/\b(Prime|VIP|Starter|Pro|Business)\b|₺|\$/);
  });
});

// ——— 130.63 The gallery for the owner (mobile/test/support/new_premium.json) ———

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

/** Sample entries for the gallery's lists, on the platform's own free photos (never a project's). */
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

/** Each landing shown for a kind of its own, in a colour of its own (the project's). */
const LANDING_SHOTS: Record<string, { kind: string; brand: string }> = {
  land_cinema: { kind: "travel", brand: "#B4532A" },
  land_split: { kind: "real_estate", brand: "#1F4E5F" },
  land_stories: { kind: "food", brand: "#C2185B" },
  land_bento: { kind: "academy", brand: "#4338CA" },
  land_magazine: { kind: "news", brand: "#9F1239" },
  land_luxe: { kind: "store", brand: "#7C5C3B" },
  // 131.27 Leqaa's petal on a clinic, in a rose of its own.
  land_petal: { kind: "clinic", brand: "#B4235A" },
};

const tabsOf = (id: string) => [
  { id: "home", label: "Home", icon: "home", target: { type: "page", page_slug: "home" } },
  { id: "main", label: GALLERY_TAB[id]![1], icon: GALLERY_TAB[id]![2], target: { type: "screen", screen: GALLERY_TAB[id]![0] } },
  { id: "account", label: "Account", icon: "person", target: { type: "screen", screen: "account" } },
];

describe("130.63 the gallery for the owner's review (mobile/test/support/new_premium.json)", () => {
  it("is Monochrome luxe for every kind and the six landings, as the app draws them", () => {
    const base = appUrl();
    const mono = KINDS.map((kind) => {
      const file = makeDesign(monoOf(kind), context(projectApp(kind)), words, LANGS);
      return { kind: kind.id, engine: kind.engine, vertical: kind.vertical, tabs: tabsOf(kind.id), font: file.look?.font, secondary: file.look?.secondary_color, accent: PREMIUM_PALETTES.mono.brand, tab_bar: file.look?.tab_bar, system: file.look?.screens?.system, home: file.pages[0]!.studio };
    });
    const landings = LANDING_IDS.map((id) => {
      const { kind: kindId, brand } = LANDING_SHOTS[id]!;
      const kind = KINDS.find((k) => k.id === kindId)!;
      const home = LANDING_TEMPLATES.find((t) => t.id === id)!.make(context(projectApp(kind), "en", brand));
      return { id, kind: kind.id, engine: kind.engine, vertical: kind.vertical, tabs: tabsOf(kind.id), font: "Manrope", secondary: landingPalette(brand).accent, accent: brand, tab_bar: { design: "float", background: "#FFFFFF", dark_background: "#191B20", active: brand, dark_active: landingPalette(brand).darkBrand, inactive: "#64666D", dark_inactive: "#A2A4AB", radius: 24, margin: 14, labels: "active" }, system: null, home };
    });
    const items = Object.fromEntries(Object.entries(GALLERY_ITEMS).map(([source, list]) => [source, list.map(([title, subtitle, photo], i) => ({ source, id: `${i + 1}`, title, subtitle, image_url: `${base}${photo}`, price_label: null, badge: null, action: { type: "item", item: { source, id: `${i + 1}` } } }))]));
    const data = `${JSON.stringify({ base, mono, landings, items })}\n`;
    const out = join(process.cwd(), "..", "..", "mobile", "test", "support", "new_premium.json");
    if (process.env.YALLAPP_WRITE_NEW_PREMIUM) writeFileSync(out, data);
    expect(existsSync(out)).toBe(true);
    expect(readFileSync(out, "utf8")).toBe(data);
    for (const list of Object.values(GALLERY_ITEMS)) for (const [, , photo] of list) expect(PREMIUM_DESIGN_PHOTOS.concat(["/stories/rides/rides-backseat.jpg"])).toContain(photo);
  });
});
