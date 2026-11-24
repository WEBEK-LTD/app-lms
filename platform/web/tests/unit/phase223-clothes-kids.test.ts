import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ICON_NAMES } from "@/components/icon-names";
import { CLOTHES_DEMO, KIDS_DEMO, type StudioDemoId } from "@/lib/demo/constants";
import { CLOTHES_CATEGORIES } from "@/lib/demo/clothes";
import { KIDS_CATEGORIES } from "@/lib/demo/kids";
import { appUrl } from "@/lib/env";
import type { StudioPage } from "@/lib/pages/types";
import { parseStudioPage } from "@/lib/pages/validate";
import { APP_WORDS, appWords } from "@/lib/studio/app-words";
import { mainLookOf, signatureDesign, signatureDesigns } from "@/lib/studio/demo-designs";
import type { SignatureLook } from "@/lib/studio/demo-designs/signature";
import type { SectionContext } from "@/lib/studio/sections";
import { allNodes } from "@/lib/studio/tree";
import { lookColour } from "@/lib/demo/picker";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { readFileSync as readSource } from "node:fs";

/**
 * 223 Lujain's and Toota's templates C and D (the owner, 23 November 2026):
 * each its own archetype, drawn from its own parts, C the type's main
 * template (the demo), D its second; A and B kept after them, unchanged.
 */

const ROOT = join(__dirname, "../..");
const app = { appType: "store" as const, backend: "hosted" as const, vertical: null };
const languages = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };

function ctxOf(name: string, lang: "en" | "ar" | "tr" = "en", picture = true): SectionContext {
  let n = 0;
  return { brand: "#7A1F30", source: "products", app: name, lang, w: appWords(lang, name), ...(picture ? { picture: (f: string) => `${appUrl()}/design-pictures/${f}` } : {}), newId: () => `v3-${++n}` };
}

const LOOKS: [StudioDemoId, SignatureLook, string][] = [
  [CLOTHES_DEMO, "c", "Lujain"],
  [CLOTHES_DEMO, "d", "Lujain"],
  [KIDS_DEMO, "c", "Toota"],
  [KIDS_DEMO, "d", "Toota"],
];

/** Every page a look makes: its home, then its own pages. */
function pagesOf(demo: StudioDemoId, look: SignatureLook, ctx: SectionContext): StudioPage[] {
  const d = signatureDesign(demo, look)!;
  return [d.home(ctx), ...(d.pages?.(ctx) ?? []).map((p) => p.studio)];
}

/** What a look's home is made of, as a fingerprint: its header's type, its first element's type and height, the element types in order, its bar. */
function fingerprint(demo: StudioDemoId, look: SignatureLook) {
  const d = signatureDesign(demo, look)!;
  const home = d.home(ctxOf("Shop"));
  const kids = home.body.children ?? [];
  return { header: home.header?.type, first: `${kids[0]?.type}:${kids[0]?.height ?? ""}`, order: kids.map((n) => n.type).join(","), bar: d.bar.design, font: d.project.appearance?.font_family };
}

describe("223 Lujain's and Toota's templates C and D", () => {
  it("make C each type's main template, the demo itself, with D after it and A and B kept", () => {
    expect(mainLookOf(CLOTHES_DEMO)).toBe("c");
    expect(mainLookOf(KIDS_DEMO)).toBe("c");
    for (const demo of [CLOTHES_DEMO, KIDS_DEMO]) {
      expect(signatureDesigns().filter((d) => d.demo === demo).map((d) => d.variant)).toEqual(["c", "d", "a", "b"]);
      expect(signatureDesign(demo)).toEqual(signatureDesign(demo, "c"));
    }
  });

  it.each(LOOKS)("%s %s: the header's menu opens its category menu, a row of cards for each main category, with the account, orders, wishlist, language and contact", (demo, look, name) => {
    const d = signatureDesign(demo, look)!;
    const ctx = ctxOf(name);
    const home = d.home(ctx);
    expect(home.header?.buttons).toContain("menu");
    const pages = d.pages!(ctx);
    expect(home.header?.menu_page).toBe(pages[0]!.slug);
    const menu = pages[0]!.studio;
    const nodes = allNodes(menu);
    // The search: its own element, or the header's (the outfit builder's premium search header).
    expect(nodes.some((n) => n.type === "search") || menu.header?.style === "search").toBe(true);
    expect(nodes.find((n) => n.type === "categories")?.style).toBe("rows");
    const opens = nodes.flatMap((n) => (n.action?.type === "screen" ? [n.action.screen] : []));
    expect(opens).toEqual(expect.arrayContaining(["account", "orders", "favorites", "settings"]));
    // Its pages say what they are: a header on each, the size guide among them.
    expect(pages.map((p) => p.slug)).toContain("size-guide");
    for (const p of pages) expect(p.studio.header?.type).toBe("title");
  });

  it.each(LOOKS)("%s %s: every page the page checker takes, with and without the platform's pictures", (demo, look, name) => {
    for (const picture of [true, false]) {
      for (const page of pagesOf(demo, look, ctxOf(name, "en", picture))) {
        const checked = parseStudioPage(page, app, languages);
        expect(checked.ok ? [] : checked.errors.filter((e) => !e.endsWith("choose a page that exists."))).toEqual([]);
      }
    }
    // Over the shop, the cart and the orders: its own elements.
    const d = signatureDesign(demo, look)!;
    for (const screen of ["search", "cart", "orders"]) expect(d.over(screen, ctxOf(name))?.length, screen).toBeGreaterThan(0);
  });

  it.each(LOOKS)("%s %s: every icon one of Material Symbols Rounded's the site and the app have", (demo, look, name) => {
    const appIcons = readFileSync(join(ROOT, "..", "..", "mobile", "lib", "core", "theme", "symbol_names.dart"), "utf8");
    const d = signatureDesign(demo, look)!;
    const icons = new Set<string>();
    for (const lang of ["en", "ar"] as const) for (const page of pagesOf(demo, look, ctxOf(name, lang))) for (const n of allNodes(page)) if (n.icon) icons.add(n.icon);
    for (const screen of ["search", "cart", "orders"]) for (const n of allNodes({ body: { id: "x", type: "column", children: d.over(screen, ctxOf(name)) ?? [] } } as StudioPage)) if (n.icon) icons.add(n.icon);
    for (const tab of d.tabs!([
      { id: "home", label: "Home", icon: "home", target: { type: "screen", screen: "home" as never } },
      { id: "shop", label: "Shop", icon: "search", target: { type: "screen", screen: "search" } },
      { id: "cart", label: "Cart", icon: "shopping_cart", target: { type: "screen", screen: "cart" } },
      { id: "account", label: "Account", icon: "person", target: { type: "screen", screen: "account" } },
    ]))
      icons.add(tab.icon);
    for (const icon of icons) {
      expect(ICON_NAMES as readonly string[], icon).toContain(icon);
      expect(appIcons, icon).toContain(`'${icon}':`);
    }
  });

  it.each(LOOKS)("%s %s: made in Arabic, its words Arabic with English and Turkish beside them, never another shop's name", (demo, look, name) => {
    const home = signatureDesign(demo, look)!.home(ctxOf("Green Valley", "ar"));
    const texts = allNodes(home).flatMap((n) => (n.type === "text" && n.text ? [n.text] : []));
    expect(texts.filter((t) => /[؀-ۿ]/u.test(t)).length).toBeGreaterThan(8);
    const all = JSON.stringify(pagesOf(demo, look, ctxOf("Green Valley")));
    expect(all).not.toContain(name);
    for (const lang of ["ar", "tr"] as const) for (const key of Object.keys(APP_WORDS.en).filter((k) => /^(rwy|obd|stw|nrs)/.test(k))) expect(APP_WORDS[lang][key as keyof typeof APP_WORDS.en], `${lang} ${key}`).toBeTruthy();
  });

  it("names its category links as the demo's categories, so each opens its category in every language", () => {
    const named = (demo: StudioDemoId, look: SignatureLook, lang: "en" | "ar" | "tr") => new Set(pagesOf(demo, look, ctxOf("Shop", lang)).flatMap((p) => allNodes(p).flatMap((n) => (n.name ? [n.name] : []))));
    const nameOf = (c: { name: string; names: { ar: string; tr: string } }, lang: "en" | "ar" | "tr") => (lang === "en" ? c.name : c.names[lang]);
    for (const lang of ["en", "ar", "tr"] as const) {
      for (const look of ["c", "d"] as const) {
        const clothes = named(CLOTHES_DEMO, look, lang);
        expect(CLOTHES_CATEGORIES.filter((c) => clothes.has(nameOf(c, lang))).length, `clothes ${look} ${lang}`).toBeGreaterThanOrEqual(4);
        const kids = named(KIDS_DEMO, look, lang);
        expect(KIDS_CATEGORIES.filter((c) => kids.has(nameOf(c, lang))).length, `kids ${look} ${lang}`).toBeGreaterThanOrEqual(look === "c" ? 4 : 2);
      }
    }
  });

  it("are distinct from each other and from every other look: their header, first element, order, bar and face", () => {
    const mine = LOOKS.map(([demo, look]) => ({ id: `${demo}_${look}`, ...fingerprint(demo, look) }));
    const others = signatureDesigns()
      .filter((d) => !LOOKS.some(([demo, look]) => d.demo === demo && d.variant === look))
      .map((d) => ({ id: `${d.demo}_${d.variant}`, ...fingerprint(d.demo, d.variant) }));
    for (const m of mine) {
      for (const o of [...mine.filter((x) => x.id !== m.id), ...others]) {
        expect(m.order, `${m.id} vs ${o.id}`).not.toBe(o.order);
        const same = (["header", "first", "bar", "font"] as const).filter((k) => m[k] === o[k]);
        expect(same.length, `${m.id} vs ${o.id}: ${same.join(", ")}`).toBeLessThan(3);
      }
    }
    // Four different bars among them, none A's or B's floating pill.
    expect(new Set(mine.map((m) => m.bar)).size).toBe(4);
    for (const m of mine) expect(m.bar).not.toBe("float");
    // Their faces: Reem Kufi, Tajawal, Lemonada, Vazirmatn, each with Arabic in the font list.
    const fonts = JSON.parse(readFileSync(join(ROOT, "src", "lib", "fonts", "google-fonts.json"), "utf8")) as { families: { family: string; arabic: boolean }[] };
    expect(mine.map((m) => m.font)).toEqual(["Reem Kufi", "Tajawal", "Lemonada", "Vazirmatn"]);
    for (const m of mine) expect(fonts.families.find((f) => f.family === m.font)?.arabic, m.font).toBe(true);
  });

  it("draws Runway's home under its header: the looks edge to edge, 640 points, one at a time", () => {
    const home = signatureDesign(CLOTHES_DEMO, "c")!.home(ctxOf("Lujain"));
    expect(home.header?.type).toBe("transparent");
    const first = home.body.children![0]!;
    expect(first).toMatchObject({ type: "slider", height: 640, per_view: 1 });
    expect(first.scrim).toBeTruthy();
    expect(first.children!.every((n) => n.type === "photo_hero" && n.radius === 0)).toBe(true);
  });

  it("builds the outfit from three rows that slide, the masonry in two columns of different heights, the round bag button pinned", () => {
    const nodes = allNodes(signatureDesign(CLOTHES_DEMO, "d")!.home(ctxOf("Lujain")));
    const builder = nodes.find((n) => n.name === "Build your outfit")!;
    expect(allNodes({ body: builder } as StudioPage).filter((n) => n.type === "row" && n.scroll).length).toBe(3);
    const columns = nodes.filter((n) => n.type === "items" && n.layout === "list" && n.name === "Picks for work");
    expect(columns).toHaveLength(2);
    expect(columns[0]!.card!.children![0]!.height).not.toBe(columns[1]!.card!.children![0]!.height);
    expect(nodes.some((n) => n.pin === "bottom" && n.children?.[0]?.action?.type === "screen" && n.children[0].action.screen === "cart")).toBe(true);
  });

  it("greets with Tooti over the ages as four bubbles, wavy edges between the sections; the nursery's ruler and gift list on a page of its own", () => {
    const story = allNodes(signatureDesign(KIDS_DEMO, "c")!.home(ctxOf("Toota")));
    expect(story.some((n) => n.name === "Tooti" && n.type === "image" && n.image_url?.endsWith("/design-pictures/kids-tooti.png"))).toBe(true);
    expect(story.filter((n) => n.name?.match(/^(0–2|3–5|6–9|10\+) /)).length).toBe(4);
    expect(story.filter((n) => n.name === "~").length).toBeGreaterThanOrEqual(2);
    expect(story.some((n) => n.type === "size_finder")).toBe(true);
    const nursery = signatureDesign(KIDS_DEMO, "d")!;
    const nodes = allNodes(nursery.home(ctxOf("Toota")));
    expect(nodes.filter((n) => n.shadow && n.shadow !== "none")).toEqual([]);
    expect(nodes.some((n) => n.action?.type === "page" && n.action.page_slug === "gift-list")).toBe(true);
    expect(nursery.pages!(ctxOf("Toota")).map((p) => p.slug)).toEqual(["menu", "size-guide", "gift-list"]);
  });

  it("starts a project from a look in that look's own colour (/start/<slug>/make?look=d): the first swatch and the default", () => {
    expect(lookColour(CLOTHES_DEMO, "d")).toBe(signatureDesign(CLOTHES_DEMO, "d")!.project.primary);
    expect(lookColour(CLOTHES_DEMO, "d")).toBe("#9C5F3C");
    expect(lookColour(KIDS_DEMO, "d")).toBe("#5D6F4E");
    expect(lookColour(CLOTHES_DEMO, "c")).toBe("#141211");
    // A look without a colour of its own, and a demo with no look chosen, start in the demo's.
    expect(lookColour(CLOTHES_DEMO, "a")).toBe(signatureDesign(CLOTHES_DEMO, "a")!.project.primary ?? DEMO_BRANDS[CLOTHES_DEMO].primaryColor);
    expect(lookColour("store", null)).toBe(DEMO_BRANDS.store.primaryColor);
    // The make page and the action use it, not the brand's colour.
    const page = readSource(join(ROOT, "src", "app", "start", "[demo]", "make", "page.tsx"), "utf8");
    expect(page).toContain("swatchesFor(colour)");
    expect(page).not.toContain("swatchesFor(brand.primaryColor)");
    expect(readSource(join(ROOT, "src", "app", "actions", "start.ts"), "utf8")).toContain("lookColour(demo, look)");
  });
});
