import { describe, expect, it } from "vitest";
import { addFigmaPages, figmaFramePage, figmaPictureNodes, type FigmaNode } from "@/lib/figma/pages";
import { parseLayoutContent } from "@/lib/pages/validate";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import type { App } from "@/lib/data/types";
import type { ScreenOption } from "@/lib/pages/sources";

/** 97.5 Figma frames made into pages: blocks from the frame, then added to the draft. */

const box = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });
const text = (id: string, characters: string, y: number, fontSize = 14, fontWeight = 400, x = 16): FigmaNode => ({
  id,
  type: "TEXT",
  name: characters,
  characters,
  style: { fontSize, fontWeight },
  absoluteBoundingBox: box(x, y, 200, fontSize * 1.4),
});

/** A shop's home screen as a designer draws it. */
const home: FigmaNode = {
  id: "1:2",
  type: "FRAME",
  name: "Screens/Home",
  absoluteBoundingBox: box(0, 0, 390, 844),
  children: [
    { id: "2:1", type: "FRAME", name: "Status Bar", absoluteBoundingBox: box(0, 0, 390, 44), children: [text("2:2", "9:41", 12, 15, 600)] },
    { id: "2:3", type: "FRAME", name: "App Bar", absoluteBoundingBox: box(0, 44, 390, 56), children: [text("2:4", "Nile Bakery", 60, 20, 700)] },
    {
      id: "3:1",
      type: "FRAME",
      name: "Hero",
      absoluteBoundingBox: box(0, 100, 390, 220),
      children: [
        { id: "3:2", type: "RECTANGLE", name: "Photo", fills: [{ type: "IMAGE", imageRef: "abc" }], absoluteBoundingBox: box(0, 100, 390, 220) },
        text("3:3", "Fresh every morning", 230, 26, 700),
        text("3:4", "Bread, cakes and pastries", 270, 15),
      ],
    },
    { id: "4:1", type: "FRAME", name: "Search", absoluteBoundingBox: box(16, 336, 358, 44), children: [text("4:2", "Search cakes", 348, 15)] },
    text("5:1", "Today's specials", 400, 20, 700),
    text("5:2", "Baked at 6am, gone by noon.\nOrder ahead.", 430, 14),
    {
      id: "6:1",
      type: "FRAME",
      name: "Cards",
      layoutMode: "HORIZONTAL",
      absoluteBoundingBox: box(16, 480, 358, 160),
      children: [
        { id: "6:2", type: "FRAME", name: "Card", absoluteBoundingBox: box(16, 480, 170, 160), children: [{ id: "6:3", type: "RECTANGLE", fills: [{ type: "IMAGE" }], absoluteBoundingBox: box(16, 480, 170, 120) }, text("6:4", "Croissant", 610)] },
        { id: "6:5", type: "FRAME", name: "Card", absoluteBoundingBox: box(204, 480, 170, 160), children: [{ id: "6:6", type: "RECTANGLE", fills: [{ type: "IMAGE" }], absoluteBoundingBox: box(204, 480, 170, 120) }, text("6:7", "Baklava", 610, 14, 400, 204)] },
      ],
    },
    {
      id: "7:1",
      type: "INSTANCE",
      name: "Button / Primary",
      fills: [{ type: "SOLID", color: { r: 0.8, g: 0.2, b: 0.1, a: 1 } }],
      cornerRadius: 12,
      absoluteBoundingBox: box(16, 660, 358, 52),
      children: [text("7:2", "My cart", 676, 16, 600)],
    },
    { id: "7:3", type: "FRAME", name: "Outline", strokes: [{ type: "SOLID", color: { r: 0, g: 0, b: 0, a: 1 } }], cornerRadius: 26, absoluteBoundingBox: box(16, 720, 358, 44), children: [text("7:4", "About us", 732)] },
    { id: "8:1", type: "VECTOR", name: "decoration", absoluteBoundingBox: box(300, 400, 24, 24) },
    { id: "8:2", type: "TEXT", name: "hidden", visible: false, characters: "Draft note", absoluteBoundingBox: box(0, 770, 100, 20) },
    {
      id: "9:1",
      type: "FRAME",
      name: "Tab Bar",
      absoluteBoundingBox: box(0, 780, 390, 64),
      children: [text("9:2", "Home", 810, 11), text("9:3", "Search", 810, 11, 400, 100), text("9:4", "Cart", 810, 11, 400, 200), text("9:5", "Profile", 810, 11, 400, 300)],
    },
  ],
};

describe("97.5 a Figma frame as blocks", () => {
  const page = figmaFramePage(home);

  it("takes the top bar's title, and leaves the status bar and the tab bar to the app", () => {
    expect(page.title).toBe("Nile Bakery");
    expect(page.tabs).toEqual(["Home", "Search", "Cart", "Profile"]);
    expect(JSON.stringify(page.blocks)).not.toContain("9:41");
  });

  it("makes texts, a banner, a search box, buttons and a picture of a row of cards, in reading order", () => {
    expect(page.blocks).toEqual([
      { kind: "banner", node: "3:2", heading: "Fresh every morning", subheading: "Bread, cakes and pastries" },
      { kind: "search", placeholder: "Search cakes" },
      { kind: "text", html: "<h3>Today's specials</h3><p>Baked at 6am, gone by noon.<br>Order ahead.</p>" },
      { kind: "image", node: "6:1", ratio: 2.24 },
      { kind: "button", label: "My cart", style: "filled" },
      { kind: "button", label: "About us", style: "outlined" },
    ]);
    expect(figmaPictureNodes([page])).toEqual(["3:2", "6:1"]);
  });

  it("escapes a text's markup and names an untitled frame after its last part", () => {
    const plain = figmaFramePage({ id: "1:9", type: "FRAME", name: "Flows / Checkout", absoluteBoundingBox: box(0, 0, 390, 844), children: [text("1:10", "Pay <now> & go", 100, 30, 700)] });
    expect(plain.title).toBe("Checkout");
    expect(plain.blocks).toEqual([{ kind: "text", html: "<h2>Pay &lt;now&gt; &amp; go</h2>" }]);
  });
});

describe("97.5 the pages added to the draft", () => {
  const app = { id: "app-1", clientId: "c-1", appType: "store", backend: "hosted", appName: "Nile Bakery", template: "classic", font: "Manrope", brandingDoneAt: null } as unknown as App;
  const screens: ScreenOption[] = [
    { value: "cart", label: "Cart" },
    { value: "search", label: "Search" },
    { value: "account", label: "Account" },
  ];
  const draft = defaultLayout(app, BUILT_IN_APP_DEFAULTS, new Date("2026-10-27T12:00:00Z"));
  const page = figmaFramePage(home);
  const pictures = { "3:2": "https://yallapp.test/api/v1/assets/a1", "6:1": "https://yallapp.test/api/v1/assets/a2" };

  it("adds them after the draft's own pages, linked to its screens, with the tab bar as tabs, and they pass the draft's checks", () => {
    const { layout, added } = addFigmaPages(draft, [{ title: page.title, blocks: page.blocks, pictures }], { screens, sources: ["products"], tabs: page.tabs, updatedAt: "2026-10-27T12:00:00.000Z" });
    expect(added).toEqual(["Nile Bakery"]);
    const made = layout.pages[layout.pages.length - 1]!;
    expect(made.slug).toBe("nile-bakery");
    expect(made.blocks.map((b) => b.type)).toEqual(["banner", "search", "text", "image", "button", "button"]);
    expect(made.blocks[0]).toMatchObject({ image_url: pictures["3:2"], heading: "Fresh every morning" });
    expect(made.blocks[1]).toMatchObject({ source: "products", placeholder: "Search cakes" });
    expect(made.blocks[4]).toMatchObject({ label: "My cart", action: { type: "screen", screen: "cart" } });
    // Nothing named "About us": the app's first page.
    expect(made.blocks[5]).toMatchObject({ label: "About us", action: { type: "page", page_slug: layout.pages[0]!.slug } });
    expect(layout.tabs.map((t) => [t.label, t.icon, t.target.type === "screen" ? t.target.screen : t.target.page_slug])).toEqual([
      ["Home", "home", layout.pages[0]!.slug],
      ["Search", "search", "search"],
      ["Cart", "shopping_cart", "cart"],
      ["Profile", "person", "account"],
    ]);
    const checked = parseLayoutContent(layout, { app, now: new Date("2026-10-27T12:00:00Z"), ownFonts: [] });
    expect(checked.ok ? null : checked.errors).toBeNull();
  });

  it("keeps the app's tabs when asked to, leaves out a picture Figma couldn't draw, and adds no more pages than the app can have", () => {
    const { layout } = addFigmaPages(draft, [{ title: page.title, blocks: page.blocks, pictures: { "3:2": pictures["3:2"] } }], { screens, sources: [], tabs: null, updatedAt: "2026-10-27T12:00:00.000Z" });
    expect(layout.tabs).toEqual(draft.tabs);
    const made = layout.pages[layout.pages.length - 1]!;
    // No picture for the cards, no search without something to search.
    expect(made.blocks.map((b) => b.type)).toEqual(["banner", "text", "button", "button"]);

    const full = { ...draft, pages: Array.from({ length: 20 }, (_, i) => ({ ...draft.pages[0]!, slug: `p${i}` })) };
    expect(addFigmaPages(full, [{ title: "More", blocks: page.blocks, pictures }], { screens, sources: [], tabs: null, updatedAt: "x" }).added).toEqual([]);
  });
});
