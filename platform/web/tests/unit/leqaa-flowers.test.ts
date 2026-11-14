import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ENGINES, KINDS } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import type { App } from "@/lib/data/types";
import { demoIdOf, demoKind, DEMO_SLUGS, FLOWER_SHOP_DEMO, FLOWER_SHOP_TEMPLATE, isStudioDemo, STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { DEMO_BRANDS, DEMO_GUIDES } from "@/lib/demo/content";
import { FLOWER_CATEGORIES, FLOWER_COLLECTIONS, FLOWER_OCCASIONS, FLOWER_PRODUCTS, FLOWER_SIZES, flowerVariants } from "@/lib/demo/flowers";
import { FLOWER_PHOTOS } from "@/lib/demo/flower-photos";
import { demoStudioScreens, demoTabBar } from "@/lib/demo/screens";
import { demoLayout } from "@/lib/demo/setup";
import { appUrl } from "@/lib/env";
import { servedAppearance } from "@/lib/fonts/look";
import { platformDefinitions } from "@/lib/hosted/connectors/registry";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { itemSourcesFor } from "@/lib/pages/sources";
import { STUDIO_HEADER_STYLES, TAB_BAR_DESIGNS, type LayoutContent, type StudioNode, type StudioPage } from "@/lib/pages/types";
import { parseLayoutContent } from "@/lib/pages/validate";
import { ar as appAr, en as appEn, tr as appTr } from "@/lib/studio/app-words";
import { CHECKOUT_LOOKS, parseCheckoutLook } from "@/lib/studio/checkout-look";
import { checkoutWords } from "@/lib/studio/checkout-words";
import { signatureDesign } from "@/lib/studio/demo-designs";
import { DELIVERY_BLOCKS, LEQAA_COUPON, LEQAA_SECTIONS } from "@/lib/studio/demo-designs/leqaa-signature";
import { DEMO_FACTS, DEMO_HOME_TEMPLATES, withDemoFacts } from "@/lib/studio/demo-templates";
import { LOOK_HEADER, SYSTEM_LOOKS } from "@/lib/studio/premium-chrome";
import { LANDING_TEMPLATES, landingPalette } from "@/lib/studio/premium-landings";
import { screenDrawing } from "@/lib/studio/screen-drawing";
import { parseStudioScreens, screensConfig } from "@/lib/studio/screens";
import { SECTIONS, sectionsFor, TEMPLATES, templatesFor, type SectionContext } from "@/lib/studio/sections";
import { studioSourcesFor } from "@/lib/studio/section";
import { startLayout } from "@/lib/studio/start";
import { allNodes } from "@/lib/studio/tree";
import { appWords } from "@/lib/studio/app-words";

/**
 * 131.20–131.27 Leqaa (لقاء), the flower shop: a Studio demo of the store
 * kind, its two Signature looks, the signature chrome every app can take
 * (the petal header, bar and system screens, the petal landing) and the
 * gift checkout's look. With YALLAPP_WRITE_LEQAA the demo and the gallery
 * are written for the app's pictures (mobile/test/support/leqaa_demo.json,
 * petal_chrome.json).
 */

const NOW = new Date("2026-11-14T12:00:00Z");
const ROOT = join(__dirname, "../..");
const MOBILE = join(ROOT, "..", "..", "mobile", "test", "support");

function demoApp(): App {
  const kind = demoKind(FLOWER_SHOP_DEMO);
  return { ...newApp("demo-client", null, NOW, kind.engine, kind.vertical), demo: true, section: "studio", backend: "hosted", appName: "Leqaa", primaryColor: DEMO_BRANDS.flowers.primaryColor, brandingDoneAt: NOW, design: FLOWER_SHOP_TEMPLATE };
}

function projectApp(engine: App["appType"] = "store", vertical: App["vertical"] = null, name = "Leqaa", colour = DEMO_BRANDS.flowers.primaryColor): App {
  return { ...newApp("client", null, NOW, engine, vertical), section: "studio", backend: "hosted", appName: name, primaryColor: colour };
}

function contextOf(app: App, lang: "en" | "ar" | "tr" = "en"): SectionContext {
  let n = 0;
  return { brand: app.primaryColor, source: itemSourcesFor(app)[0] ?? null, app: app.appName!, lang, w: appWords(lang, app.appName!), picture: (f) => `${appUrl()}/design-pictures/${f}`, newId: () => `lq-${++n}`, kind: { type: app.appType, vertical: app.vertical ?? null } };
}

const demoOf = async () => demoLayout({ assetUrl: (a) => `https://files.test/${a}`, now: NOW }, demoApp(), "banner-asset");
const texts = (page: StudioPage) => allNodes(page).flatMap((n) => [n.text, n.title].filter((x): x is string => Boolean(x)));

describe("131.20 Leqaa, the flower shop: a Studio demo of the store kind", () => {
  it("is the tenth Studio demo, a store told apart by its look A, at its own address", () => {
    expect(STUDIO_DEMO_TYPES).toContain(FLOWER_SHOP_DEMO);
    expect(isStudioDemo(FLOWER_SHOP_DEMO)).toBe(true);
    expect(demoKind(FLOWER_SHOP_DEMO)).toMatchObject({ engine: "store", vertical: null });
    expect(DEMO_SLUGS.flowers).toBe("flowers");
    expect(DEMO_SLUGS.store).toBe("store");
    expect(demoIdOf(demoApp())).toBe(FLOWER_SHOP_DEMO);
    // The App editor's flower shop (Lale Flowers) stays the store's own demo.
    expect(demoIdOf({ appType: "store", vertical: null })).toBe("store");
    expect(DEMO_BRANDS.flowers.appName).toBe("Leqaa");
    // Never another demo's name, and no real brand's.
    for (const id of STUDIO_DEMO_TYPES) if (id !== FLOWER_SHOP_DEMO) expect(DEMO_BRANDS[id].appName).not.toMatch(/leqaa/i);
    expect(DEMO_GUIDES.flowers.screens).toEqual(["leqaa-home", "leqaa-product", "leqaa-checkout"]);
  });

  it("works with every source a store takes: products kept in Yallapp, WordPress (WooCommerce), Shopify, the platforms (ikas, Ticimax, IdeaSoft, Wix, Salla, Zid) and its own API", () => {
    const store = KINDS.find((k) => k.engine === "store" && k.vertical === null)!;
    expect(studioSourcesFor(store)).toEqual(["catalog", "wordpress", "shopify", "platform", "custom_api"]);
    expect(ENGINES.store.ownContent.kind).toBe("catalog");
    expect(platformDefinitions().filter((d) => d.appType === "store").map((d) => d.id).sort()).toEqual(["ideasoft", "ikas", "salla", "ticimax", "wix", "zid"]);
    // Its looks read only the store's own lists (products and their categories), which every source serves.
    for (const look of ["a", "b"] as const) {
      const { layout } = started(look);
      for (const page of layout.pages) for (const n of allNodes(page.studio ?? { body: { id: "x", type: "column" } })) if (n.type === "items" || n.type === "categories") expect(n.source, `${look} ${page.slug}`).toBe("products");
    }
  });

  it("brings real-feeling bouquets for the five occasions, in three sizes, and the add-ons on their own, in Egyptian pounds", () => {
    expect(FLOWER_PRODUCTS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(FLOWER_PRODUCTS.map((p) => p.sku)).size).toBe(FLOWER_PRODUCTS.length);
    expect(FLOWER_CATEGORIES).toEqual([...FLOWER_COLLECTIONS, ...FLOWER_OCCASIONS]);
    for (const occasion of FLOWER_OCCASIONS) expect(FLOWER_PRODUCTS.some((p) => p.occasions.includes(occasion)), occasion).toBe(true);
    for (const p of FLOWER_PRODUCTS) {
      // Every flower its real photo; an add-on with no fitting free photo, none (drawn as a tile).
      if (p.collection === "Add-ons" && p.photo === null) continue;
      expect(FLOWER_PHOTOS).toContain(p.photo);
      if (p.salePriceCents !== null) expect(p.salePriceCents).toBeLessThan(p.priceCents);
    }
    // A bouquet's sizes are its variations: the size a person picks on its page, each its price (and its sale).
    const bouquets = FLOWER_PRODUCTS.filter((p) => p.sizes);
    expect(bouquets.length).toBeGreaterThanOrEqual(8);
    for (const p of bouquets) {
      const v = flowerVariants(p, (c) => c)!;
      expect(v.attributes).toEqual([{ name: "Size", values: [...FLOWER_SIZES] }]);
      expect(v.items.map((i) => i.values[0])).toEqual([...FLOWER_SIZES]);
      expect(v.items[0]!.priceCents).toBe(p.priceCents);
      expect(v.items[2]!.priceCents).toBeGreaterThan(v.items[1]!.priceCents!);
      if (p.salePriceCents !== null) for (const i of v.items) expect(i.salePriceCents!).toBeLessThan(i.priceCents!);
    }
    expect(FLOWER_PRODUCTS.filter((p) => !p.sizes).every((p) => flowerVariants(p, (c) => c) === null)).toBe(true);
    // No options left that read as "Size · Required" on a product's page.
    expect(FLOWER_PRODUCTS.some((p) => "optionGroups" in p)).toBe(false);
    expect(FLOWER_PRODUCTS.filter((p) => p.collection === "Add-ons").map((p) => p.name)).toEqual(["Ceramic Vase", "Chocolate Box", "Greeting Card"]);
  });

  it("has its photos in public/flower-photos, each CC0 or public domain from Wikimedia Commons, credited", () => {
    const dir = join(ROOT, "public/flower-photos");
    const files = readdirSync(dir).filter((f) => f.endsWith(".jpg")).map((f) => f.slice(0, -4)).sort();
    expect(files).toEqual([...FLOWER_PHOTOS].sort());
    const credits = JSON.parse(readFileSync(join(dir, "CREDITS.json"), "utf8")) as { file: string; author: string; license: string; page: string }[];
    const notes = readFileSync(join(dir, "CREDITS.md"), "utf8");
    for (const name of FLOWER_PHOTOS) {
      const data = readFileSync(join(dir, `${name}.jpg`));
      expect(data.subarray(0, 3).toString("hex"), name).toBe("ffd8ff");
      expect(data.length, name).toBeLessThan(220_000);
      const c = credits.find((x) => x.file === `${name}.jpg`);
      expect(c, name).toBeDefined();
      expect(c!.author.length, name).toBeGreaterThan(0);
      expect(c!.license, name).toMatch(/^(CC0 1\.0|Public domain)$/);
      expect(c!.page, name).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(notes, name).toContain(`**${name}.jpg**`);
    }
  });
});

/** A new project from the look's template, as /start and Studio make it. */
function started(look: "a" | "b", lang: "en" | "ar" | "tr" = "en") {
  const app = projectApp();
  const template = TEMPLATES.find((t) => t.id === `flowers_signature_${look}`)!;
  const layout = startLayout(app, template, defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), NOW, contextOf(app, lang));
  return { app, template, layout };
}

describe("131.20 its two Signature looks: whole store templates, marked new", () => {
  it("writes every section title into a field the shop edits in each language (the app's words only its defaults)", () => {
    const titles = ["lqSendToday", "lqGiftMsg", "lqBuildTitle", "lqBuildLine", "lqSendFlowers", "lqAsk", "lqEdit", "lqCollections", "lqLoved", "lqAtelier", "lqPriceList", "lqFlashTitle"] as const;
    const seen = new Set<string>();
    for (const look of ["a", "b"] as const) {
      const { layout } = started(look);
      const screens = demoStudioScreens(FLOWER_SHOP_DEMO, appUrl(), look);
      void screens;
      for (const page of layout.pages) {
        for (const n of allNodes(page.studio ?? { body: { id: "x", type: "column" } })) {
          for (const key of titles) {
            const field = n.text === appEn[key] ? "text" : n.title === appEn[key] ? "title" : null;
            if (!field) continue;
            const t = n.translations as Record<string, Record<string, string>> | undefined;
            expect(t?.ar?.[field], `${look} ${key}`).toBe(appAr[key]);
            expect(t?.tr?.[field], `${look} ${key}`).toBe(appTr[key]);
            seen.add(key);
          }
        }
      }
    }
    // Each of them, in one look or the other (the cart's and the bouquet's too).
    expect([...seen].sort()).toEqual([...titles].sort());
  });

  it("are a store's first templates (never a restaurant's), recommended and new, every slider and section of theirs a ready section", () => {
    const store = templatesFor({ type: "store", vertical: null }).map((t) => t.id);
    expect(store.slice(0, 2)).toEqual(["flowers_signature_a", "flowers_signature_b"]);
    expect(templatesFor({ type: "store", vertical: "restaurant" }).map((t) => t.id)).not.toContain("flowers_signature_a");
    for (const id of ["flowers_signature_a", "flowers_signature_b"]) expect(TEMPLATES.find((t) => t.id === id)).toMatchObject({ demo: FLOWER_SHOP_DEMO, recommended: true, isNew: true });
    expect(LEQAA_SECTIONS.length).toBeGreaterThanOrEqual(14);
    for (const s of LEQAA_SECTIONS) {
      expect(s.isNew, s.id).toBe(true);
      expect(SECTIONS.filter((x) => x.id === s.id)).toHaveLength(1);
    }
    const forStore = sectionsFor({ type: "store", vertical: null }).map((s) => s.id);
    for (const s of LEQAA_SECTIONS) expect(forStore).toContain(s.id);
    expect(sectionsFor({ type: "store", vertical: "restaurant" }).map((s) => s.id)).not.toContain("lq_story_hero");
    expect(sectionsFor({ type: "lms", vertical: null }).map((s) => s.id)).not.toContain("lq_story_hero");
    expect(DEMO_HOME_TEMPLATES.flowers).toBe("flowers_signature_a");
  });

  it.each(["a", "b"] as const)("look %s: the home as designed, every page in the look, the petal chrome, the gift checkout", (look) => {
    const { app, layout } = started(look);
    const design = signatureDesign(FLOWER_SHOP_DEMO, look)!;
    const checked = parseLayoutContent(layout, { app, now: NOW });
    expect(checked.ok ? [] : checked.errors).toEqual([]);
    // Home, Bouquets, Send (the raised bloom), Orders, Account.
    expect(layout.tabs.map((t) => t.label)).toEqual(["Home", "Bouquets", "Send", "Orders", "Account"]);
    expect(layout.tab_bar).toMatchObject({ design: "petal", center: "cart", margin: 12 });
    expect(design.chrome).toMatchObject({ header: "petal", system: "petal" });
    // Its own pages: the signature bouquet and the person's picks, in the petal header.
    for (const slug of ["bouquet", "wishlist"]) expect(layout.pages.find((p) => p.slug === slug)?.studio?.header?.style, slug).toBe("petal");
    // The account, settings, the lists, sign-in: all petal.
    const screens = demoStudioScreens(FLOWER_SHOP_DEMO, appUrl(), look);
    expect(screens.system?.look).toBe("petal");
    expect(screens.checkout).toMatchObject({ look: "gift" });
    expect(parseStudioScreens(screens).problems).toEqual([]);
    expect(parseStudioScreens(screens).screens.checkout).toEqual(screens.checkout);
    // The home's parts.
    const home = layout.pages[0]!.studio!;
    const types = allNodes(home).map((n) => n.type);
    for (const t of look === "a" ? ["slider", "stories", "bento", "items", "testimonials", "marquee", "flash_sale", "coupon"] : ["slider", "gallery", "items", "testimonials", "marquee", "flash_sale", "coupon"]) expect(types, t).toContain(t);
    if (look === "a") {
      const hero = allNodes(home).find((n) => n.type === "slider")!;
      expect(hero).toMatchObject({ ken_burns: true, indicator: "progress", autoplay: true });
      expect(hero.children).toHaveLength(5);
      expect(home.header ?? null).toBeNull();
    } else {
      expect(home.header).toMatchObject({ style: "petal", type: "logo_center" });
      expect(allNodes(home).find((n) => n.type === "slider")).toMatchObject({ indicator: "pill", per_view: 1.18 });
    }
    // One send action on the screen: the petal bar's raised bloom (the
    // cart), never a sticky Send flowers over it too.
    expect(types).not.toContain("cta_bar");
    expect(layout.tab_bar).toMatchObject({ design: "petal", center: "cart" });
    // The shop's commerce, the real elements (131.15–131.17): its flash sale, its code shown in the app in a premium look, its sale on the cards; "Send today" with its day chips.
    const names = allNodes(home).map((n) => n.name);
    expect(names).toContain(DELIVERY_BLOCKS.sendToday);
    expect(names).toContain(DELIVERY_BLOCKS.deliveryDays);
    expect(allNodes(home).find((n) => n.type === "flash_sale")).toMatchObject({ flash_sale: { look: "banner", countdown: true, stock_bar: true } });
    expect(allNodes(home).find((n) => n.type === "coupon")).toMatchObject({ code: LEQAA_COUPON, coupon: { look: look === "a" ? "ticket" : "glass", bind: "public" } });
    expect(allNodes(home).some((n) => n.bind === "sale")).toBe(true);
    expect(types).not.toContain("countdown");
    // Kind words: the owner's own, in brackets; never a review or number made up.
    const quotes = allNodes(home).find((n) => n.type === "testimonials")!;
    for (const e of quotes.entries!) {
      expect(e.text).toMatch(/^\[.+\]$/);
      expect(e.title).toMatch(/^\[.+\]$/);
      expect(e.value ?? null).toBeNull();
    }
    // A night designed for it: every surface its own dark colour.
    for (const n of allNodes(home)) if (n.background && !["photo_hero", "image", "button"].includes(n.type) && n.background !== "#FFFFFF") expect(n.dark_background ?? n.gradient ?? null, `${look} ${n.type} ${n.name ?? ""}`).not.toBeNull();
  });

  it.each(["a", "b"] as const)("look %s: in Arabic, every word the app's (Modern Standard Arabic), with English and Turkish", (look) => {
    const { layout } = started(look, "ar");
    const words = allNodes(layout.pages[0]!.studio!).filter((n): n is StudioNode & { text: string } => n.type === "text" && /[؀-ۿ]/u.test(n.text ?? ""));
    expect(words.length).toBeGreaterThan(8);
    for (const n of words) {
      expect(n.translations?.en?.text, n.text).toBeTruthy();
      expect(n.translations?.tr?.text, n.text).toBeTruthy();
    }
    // Every lq word in the three languages.
    for (const key of Object.keys(appEn).filter((k) => k.startsWith("lq"))) {
      for (const dict of [appEn, appAr, appTr] as unknown as Record<string, string>[]) expect(dict[key], key).toBeTruthy();
    }
  });
});

describe("131.20 the demo app is look A", () => {
  it("is the project look A starts, its home the look's with how to sign in at its end, its own words in the brackets", async () => {
    const demo = await demoOf();
    const { layout } = started("a");
    expect(demo.tabs.map((t) => t.id)).toEqual(layout.tabs.map((t) => t.id));
    expect(demo.tab_bar).toEqual(signatureDesign(FLOWER_SHOP_DEMO, "a")!.bar);
    expect(demoTabBar(FLOWER_SHOP_DEMO)).toEqual(demo.tab_bar);
    const note = demo.pages[0]!.studio!.body.children!.at(-1)!;
    expect(note.visibility).toBe("signed_out");
    const checked = parseLayoutContent(demo, { app: demoApp(), now: NOW });
    expect(checked.ok ? [] : checked.errors).toEqual([]);
    // Its name in each language, its cut-off in Cairo: no bracket of the template's left there.
    const nodes = allNodes(demo.pages[0]!.studio!);
    expect(nodes.find((n) => n.text === "Leqaa")?.translations?.ar?.text).toBe("لقاء");
    expect(nodes.find((n) => n.text === DEMO_FACTS.flowers!.lqCutoff!.en)?.translations?.ar?.text).toBe(DEMO_FACTS.flowers!.lqCutoff!.ar);
    expect(texts(demo.pages[0]!.studio!).join(" ")).not.toContain("[your cut-off time]");
    expect(demo.appearance).toMatchObject({ secondary_color: "#C89B6D", font: "DM Sans" });
    expect(demo.languages?.available).toEqual(["en", "ar", "tr"]);
  });

  it("is the project the app's pictures of its guide draw (mobile/test/support/leqaa_demo.json)", async () => {
    const layout: LayoutContent = await demoOf();
    const filled = { ...layout, pages: layout.pages.map((p) => (p.studio ? { ...p, studio: withDemoFacts(FLOWER_SHOP_DEMO, p.studio) } : p)) };
    const served = { ...filled, appearance: servedAppearance(filled.appearance, appUrl()) };
    const data = `${JSON.stringify({ screens: demoStudioScreens(FLOWER_SHOP_DEMO, appUrl()), layout: served }, null, 1)}\n`;
    const file = join(MOBILE, "leqaa_demo.json");
    if (process.env.YALLAPP_WRITE_LEQAA) writeFileSync(file, data);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf8")).toBe(data);
  });
});

describe("131.21–131.27 the flower shop's signature chrome, for every app", () => {
  it("adds `petal` to the header styles, the bars and the system looks, and the gift checkout, after the ones there were", () => {
    expect(STUDIO_HEADER_STYLES.at(-1)).toBe("petal");
    expect(TAB_BAR_DESIGNS.at(-1)).toBe("petal");
    expect(SYSTEM_LOOKS.at(-1)).toBe("petal");
    expect(LOOK_HEADER.petal).toBe("petal");
    expect(CHECKOUT_LOOKS).toEqual(["gift"]);
    const contract = readFileSync(join(ROOT, "../../docs/api/openapi.yaml"), "utf8");
    expect(contract).toContain("enum: [large, glass, photo, brand, search, petal]");
    expect(contract).toContain("float, dock, petal]");
    expect(contract).toContain("look: { type: string, enum: [large, glass, photo, brand, petal] }");
    // One CheckoutLook schema for both sides: the commerce side's fields, and the premium look by day and by night.
    expect(contract).toContain('look: { type: string, enum: [gift], description: "131.25 The premium gift checkout in five steps; it implies `mode: gift`." }');
    expect(contract).toContain("dark_accent: { type: [string, 'null']");
    expect(readFileSync(join(ROOT, "public/developers/openapi.yaml"), "utf8")).toBe(contract);
  });

  it("keeps the gift checkout's look as saved (known looks only, the gift checkout on with it), serves it to the app and draws it on the cart's page", () => {
    const problems: string[] = [];
    expect(parseCheckoutLook({ look: "gift", accent: "#8e2445", dark_accent: "#f3a9c0" }, problems)).toEqual({ look: "gift", mode: "gift", accent: "#8E2445", dark_accent: "#F3A9C0" });
    expect(parseCheckoutLook({ look: "express" }, problems)).toBeNull();
    expect(parseCheckoutLook({ look: "gift", accent: "pink" }, problems)).toEqual({ look: "gift", mode: "gift" });
    expect(problems).toHaveLength(1);
    // With the commerce side's own fields.
    expect(parseCheckoutLook({ look: "gift", style: "steps", chips: "square", surface: "glass", radius: 14 })).toEqual({ look: "gift", mode: "gift", style: "steps", chips: "square", surface: "glass", radius: 14 });
    const app = { ...projectApp(), hostedSettings: { studioScreens: { checkout: { look: "gift" as const } } } } as unknown as App;
    expect(screensConfig(app).screens?.checkout).toEqual({ look: "gift" });
    expect(screenDrawing("cart", "store", { checkout: { look: "gift" } })).toEqual({ screen: "checkout", look: { look: "gift" } });
    expect(screenDrawing("cart", "store", {})).toBeNull();
    // Its sample order on the canvas: the day and the slot always shown, the fee's parts, the occasions.
    for (const lang of ["en", "ar", "tr"]) {
      const w = checkoutWords(lang);
      expect(w.steps).toHaveLength(5);
      expect(w.occasions).toHaveLength(8);
      expect(w.sample.messages.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("is a landing any app adds, in its own colour, with the petal header", () => {
    const petal = LANDING_TEMPLATES.find((t) => t.id === "land_petal")!;
    expect(petal.isNew).toBe(true);
    for (const kind of KINDS) {
      const app = projectApp(kind.engine, kind.vertical, "Selin's", "#3A6B5C");
      const page = petal.make(contextOf(app));
      expect(page.header?.style, kind.id).toBe("petal");
      expect(page.dark_background).toBe(landingPalette("#3A6B5C").darkPage);
      const checked = parseLayoutContent({ ...defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW), pages: [{ slug: "home", title: "Home", show_title: false, updated_at: NOW.toISOString(), blocks: [], studio: page }] }, { app, now: NOW });
      expect(checked.ok ? [] : checked.errors, kind.id).toEqual([]);
    }
  });

  /**
   * The gallery of the chrome on two other kinds (an academy and a clinic):
   * a page after the home in the petal header with the petal bar, and the
   * petal landing as their home, by day and by night
   * (mobile/test/screenshots/leqaa_gallery_test.dart).
   */
  it("writes the gallery's projects for two other kinds (mobile/test/support/petal_chrome.json)", () => {
    const kinds = [KINDS.find((k) => k.id === "academy")!, KINDS.find((k) => k.id === "clinic")!];
    const out = kinds.map((kind, i) => {
      const brand = ["#4338CA", "#0F766E"][i]!;
      const app = projectApp(kind.engine, kind.vertical, ["Selin's Academy", "Nile Clinic"][i]!, brand);
      const home = LANDING_TEMPLATES.find((t) => t.id === "land_petal")!.make(contextOf(app));
      return {
        kind: kind.id,
        engine: kind.engine,
        brand,
        accent: landingPalette(brand).accent,
        home,
        tab_bar: { design: "petal", background: "#FFFFFF", dark_background: "#1A1B22", active: brand, dark_active: landingPalette(brand).darkBrand, inactive: "#64666D", dark_inactive: "#A2A4AB", labels: "active", radius: 30, margin: 12 },
        system: { look: "petal" },
      };
    });
    const data = `${JSON.stringify({ base: appUrl(), kinds: out }, null, 1)}\n`;
    const file = join(MOBILE, "petal_chrome.json");
    if (process.env.YALLAPP_WRITE_LEQAA) writeFileSync(file, data);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf8")).toBe(data);
  });
});
