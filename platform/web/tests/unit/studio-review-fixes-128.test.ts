import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StudioView, startsWithCover, textGivingWay } from "@/components/studio/view";
import { MAP_COLORS } from "@/components/studio/covers";
import { newApp } from "@/lib/app/setup";
import { courseItem } from "@/lib/hosted/pages/index";
import type { StudioNode, StudioPage } from "@/lib/pages/types";
import { parseStudioPage } from "@/lib/pages/validate";
import { teachersPhotoHome } from "@/lib/studio/teachers-home";
import { allNodes } from "@/lib/studio/tree";
import { sampleEntries } from "@/lib/studio/sample-entries";
import { NOW } from "./helpers";

/**
 * 128.10 Review fixes to the Studio demos' new elements: existing projects keep their look (a transparent header over
 * anything but a cover, a colour over an element without a picture outside a cover, a row of texts), a course card's
 * subtitle is its teacher alone (the rating is the card's `rating` element), and the map's land has its own colour by
 * night; the canvas draws each as the app (mobile studio_page.dart, studio_covers.dart).
 */

const WORDS = { price: "Price", addPicture: "Add a picture", addVideo: "Add a video", send: "Send", search: "Search", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds", copy: "Copy" };
const LOOK = { name: "Nour Academy", logoUrl: null, brand: "#1D2B4F", font: "Alexandria", tabs: [], activeTab: null };

function draw(page: StudioPage, dark = false): string {
  return renderToStaticMarkup(createElement(StudioView, { page, lang: "en", defaultLang: "en", dark, look: LOOK, pickable: { items: {}, categories: {}, samples: sampleEntries(NOW) }, words: WORDS }));
}

function styleOf(html: string, id: string): Record<string, string> {
  const style = new RegExp(`<div style="([^"]*)" data-studio-node="${id}"`).exec(html)?.[1] ?? "";
  return Object.fromEntries(
    style
      .split(";")
      .filter(Boolean)
      .map((rule) => [rule.slice(0, rule.indexOf(":")), rule.slice(rule.indexOf(":") + 1)]),
  );
}

const page = (children: StudioNode[], header: StudioPage["header"] = null): StudioPage => ({ header, body: { id: "root", type: "column", children } });
const text = (id: string, extra: Partial<StudioNode> = {}): StudioNode => ({ id, type: "text", text: `Text ${id}`, ...extra });
const hero = (): StudioNode => ({ id: "hero", type: "photo_hero", height: 200, children: [text("on")] });

describe("128.10 existing Studio pages keep their look", () => {
  it("draws a transparent header over anything but a cover as before: the buttons alone, the page below the status bar", () => {
    const header = { type: "transparent" as const, buttons: ["search" as const] };
    const plain = draw(page([text("first")], header));
    expect(plain).not.toContain("Nour Academy");
    expect(plain).toContain("data-studio-below-bar");
    // Over a cover (a photo hero, a map, a picture with a scrim): under the status bar, the app's name on it.
    for (const first of [hero(), { id: "map", type: "map_header", children: [] } as StudioNode, { id: "photo", type: "stack", image_background_url: "https://x.test/p.jpg", scrim: { color: "#000000", from: 0.2, to: 0.8 }, children: [] } as StudioNode]) {
      const over = draw(page([first, text("next")], header));
      expect(over).toContain("Nour Academy");
      expect(over).not.toContain("data-studio-below-bar");
    }
    expect(startsWithCover(page([{ ...text("pinned"), pin: "top" }, hero()]).body)).toBe(true);
    expect(startsWithCover(page([{ ...hero(), hidden: true }, text("x")]).body)).toBe(false);
  });

  it("draws a colour over an element without a picture as its background only inside a cover", () => {
    const frosted = (id: string): StudioNode => ({ id, type: "row", width: 40, height: 40, overlay: { color: "#FFFFFF", opacity: 0.18 }, children: [] });
    const html = draw(page([frosted("outside"), { ...hero(), children: [frosted("inside")] }]));
    expect(styleOf(html, "outside").background).toBeUndefined();
    expect(styleOf(html, "inside").background).toBe("rgba(255, 255, 255, 0.18)");
  });

  it("lets only a row's one text cut to its lines give way to what follows it", () => {
    const one = draw(page([{ id: "row", type: "row", children: [text("teacher", { max_lines: 1 }), text("rating")] }]));
    expect(styleOf(one, "teacher")["min-width"]).toBe("0");
    expect(styleOf(one, "rating")["flex-shrink"]).toBe("0");
    // Two such texts, or one that fills: the row as before.
    const two = draw(page([{ id: "row", type: "row", children: [text("a", { max_lines: 1 }), text("b", { max_lines: 2 })] }]));
    expect(styleOf(two, "a")["min-width"]).toBeUndefined();
    expect(styleOf(two, "b")["flex-shrink"]).toBeUndefined();
    expect(textGivingWay([text("a", { max_lines: 1 }), text("b", { width: "fill" })])).toBeNull();
    expect(textGivingWay([text("a", { max_lines: 1, width: 80 }), text("b")])).toBeNull();
    expect(textGivingWay([text("a", { max_lines: 1 }), text("b")])).toBe("a");
  });

  it("keeps a cover whole under an element shorter than how far it hangs", () => {
    const html = draw(page([{ ...hero(), overlap: 80, children: [text("on"), text("short")] }]));
    expect(html).toMatch(/data-studio-cover="photo_hero" style="display:flex;flex-direction:column;min-height:200px"/);
  });
});

describe("128.10 a course card's teacher and rating", () => {
  it("serves the teacher alone as the subtitle, the rating on its own", () => {
    const item = courseItem({ id: 7, title: "Arabic calligraphy", instructor: { name: "Omar Farouk" }, rating: 4.84, price: { is_free: true } }, "en");
    expect(item).toMatchObject({ subtitle: "Omar Farouk", rating: 4.8 });
    expect(courseItem({ id: 8, title: "New", instructor: { name: "Omar Farouk" }, rating: 0 }, "en")).toMatchObject({ subtitle: "Omar Farouk", rating: null });
  });

  it("shows Rawaq Academy's course rating through the card's rating element, after the teacher", () => {
    let n = 0;
    const home = teachersPhotoHome({ brand: "#2E5E4E", source: "courses", w: (word: string) => word, newId: () => `n${++n}`, lang: "en", picture: (f: string) => `/p/${f}` } as never);
    const card = allNodes(home).find((x) => x.type === "items")!.card!;
    const row = allNodes({ body: card }).find((x) => x.type === "row" && x.children?.some((c) => c.bind === "subtitle"))!;
    expect(row.children!.map((c) => c.bind)).toEqual(["subtitle", "rating"]);
    expect(textGivingWay(row.children!)).toBe(row.children![0]!.id);
  });
});

describe("128.10 the map's land by night", () => {
  const map = (extra: Partial<StudioNode>): StudioNode => ({ id: "map", type: "map_header", height: 300, children: [], ...extra });

  it("draws its land in its dark background by night, else the dark map's own (not the day's colour)", () => {
    expect(draw(page([map({ background: "#ECE8DF" })]), true)).toContain(`fill="${MAP_COLORS.dark.land}"`);
    expect(draw(page([map({ background: "#ECE8DF", dark_background: "#101820" })]), true)).toContain('fill="#101820"');
    expect(draw(page([map({ background: "#ECE8DF", dark_background: "#101820" })]))).toContain('fill="#ECE8DF"');
  });

  it("keeps the land's colour by night when the page is checked", () => {
    const app = { ...newApp("client-1", null, NOW, "rides", "taxi"), backend: "hosted" as const };
    const parsed = parseStudioPage(page([map({ background: "#ECE8DF", dark_background: "#101820" })]), app, { default: "en", available: ["en"] });
    expect(parsed.ok && parsed.value.body.children![0]).toMatchObject({ background: "#ECE8DF", dark_background: "#101820" });
  });
});

describe("128.10 the marketplace's address bar by night", () => {
  it("draws the search field in the theme's dark colours, not white", () => {
    const bar: StudioNode = { id: "bar", type: "market", market: { section: "address", style: "bar" }, color: "#1E6B52" };
    const field = (html: string) => /<div data-market-bar-search="" style="([^"]*)"/.exec(html)?.[1] ?? "";
    expect(field(draw(page([bar])))).toContain("background:#FFFFFF");
    expect(field(draw(page([bar]), true))).not.toContain("background:#FFFFFF");
  });
});
