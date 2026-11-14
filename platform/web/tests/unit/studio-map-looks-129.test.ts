import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StudioView } from "@/components/studio/view";
import { newApp } from "@/lib/app/setup";
import type { StudioMapDrawing, StudioNode, StudioPage } from "@/lib/pages/types";
import { parseStudioPage } from "@/lib/pages/validate";
import { along, fitPath, horizonDepth, horizonPoint, lensBox, mapPalette, markerLook, splitRoute } from "@/lib/studio/map-looks";
import { PREMIUM_MAPS } from "@/lib/studio/premium-maps";
import { sampleEntries } from "@/lib/studio/sample-entries";
import { NOW } from "./helpers";

/**
 * 129.21–129.24 The drawn map's premium looks: a living map, a horizon, two
 * inks, a radar lens, and pins, words and a route on any of them; checked
 * (strict and bounded), drawn on the canvas as the app draws them, light and
 * dark and right to left; a map without them is drawn exactly as before;
 * the Premium group's maps are valid pages.
 */

const WORDS = { price: "Price", addPicture: "Add a picture", addVideo: "Add a video", send: "Send", search: "Search", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds", copy: "Copy" };
const LOOK = { name: "Masar Rides", logoUrl: null, brand: "#0F766C", font: "Alexandria", tabs: [], activeTab: null };
const app = { ...newApp("client-1", null, NOW, "rides", "taxi"), backend: "hosted" as const };

function draw(page: StudioPage, dark = false, lang: "en" | "ar" = "en"): string {
  return renderToStaticMarkup(createElement(StudioView, { page, lang, defaultLang: "en", dark, look: LOOK, pickable: { items: {}, categories: {}, samples: sampleEntries(NOW) }, words: WORDS }));
}

const page = (children: StudioNode[]): StudioPage => ({ body: { id: "root", type: "column", children } });
const map = (map_drawing: StudioMapDrawing, extra: Partial<StudioNode> = {}): StudioNode => ({ id: "map", type: "map_header", height: 470, children: [], map_drawing, ...extra });
const parse = (node: StudioNode) => parseStudioPage(page([node]), app, { default: "en", available: ["en", "ar"] });

const route = { points: [{ x: 80, y: 33 }, { x: 45, y: 36 }, { x: 41, y: 50 }], at: 30, to_label: "Pickup", eta: "3 min", color: "#0F766C", dark_color: "#3FC7B4", moving: true };

describe("129.21–129.24 the map's premium looks are checked", () => {
  it("keeps every option, bounded", () => {
    const parsed = parse(
      map({
        style: "natural",
        marker: "car",
        sign: "CAB",
        me_at: { x: 41, y: 50 },
        places: [{ x: 26, y: 22, label: " Home ", icon: "home" }],
        labels: [{ x: 30, y: 82, text: "Zamalek" }],
        route: { ...route, live: "ride", from_label: "Abbas El Akkad St." },
      }),
    );
    expect(parsed.ok).toBe(true);
    expect(parsed.ok && parsed.value.body.children![0]!.map_drawing).toEqual({
      style: "natural",
      marker: "car",
      sign: "CAB",
      me_at: { x: 41, y: 50 },
      places: [{ x: 26, y: 22, label: "Home", icon: "home" }],
      labels: [{ x: 30, y: 82, text: "Zamalek" }],
      route: { ...route, live: "ride", from_label: "Abbas El Akkad St." },
    });
  });

  it("refuses unknown looks, out-of-bounds spots, too many pins and a route of one point", () => {
    for (const drawing of [
      { style: "satellite" },
      { marker: "balloon" },
      { sign: "A VERY LONG WORD" },
      { me_at: { x: 140, y: 2 } },
      { places: Array.from({ length: 7 }, () => ({ x: 1, y: 1, label: "A" })) },
      { places: [{ x: 1, y: 1, label: "" }] },
      { labels: [{ x: 1, y: 1, text: "x".repeat(41) }] },
      { route: { points: [{ x: 1, y: 1 }] } },
      { route: { points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], at: 101 } },
      { route: { points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], live: "bus" } },
      { route: { points: [{ x: 1, y: 1 }, { x: 2, y: 2 }], color: "teal" } },
    ]) {
      expect(parse(map(drawing as StudioMapDrawing)).ok, JSON.stringify(drawing)).toBe(false);
    }
  });

  it("makes every Premium group map a valid page", () => {
    for (const info of PREMIUM_MAPS) {
      let n = 0;
      const node = info.make({ newId: () => `p${n++}`, words: (k) => k });
      const parsed = parse(node);
      expect(parsed.ok, info.id).toBe(true);
      expect(parsed.ok && parsed.value.body.children![0]!.map_drawing).toEqual(node.map_drawing);
    }
  });
});

describe("129.21–129.24 the canvas draws the looks as the app", () => {
  it("draws a map without them exactly as before (128's plain map)", () => {
    const html = draw(page([map({ markers: [{ x: 15, y: 23 }], me: true })]));
    expect(html).not.toContain("data-studio-map-style");
    expect(html).toContain("data-studio-map-marker");
    expect(html).toContain('viewBox="0 0 375 470"');
  });

  it("draws each look, light and dark, with its markers, pins, words and route", () => {
    for (const style of ["natural", "horizon", "two_ink", "lens"] as const) {
      for (const dark of [false, true]) {
        const html = draw(page([map({ style, markers: [{ x: 15, y: 23 }, { x: 80, y: 60 }], me: true, places: [{ x: 20, y: 20, label: "Villa" }], labels: [{ x: 30, y: 80, text: "Zamalek" }], route })]), dark);
        expect(html, style).toContain(`data-studio-map-style="${style}"`);
        expect(html.match(/data-studio-map-marker=""/g)?.length, style).toBe(2);
        expect(html).toContain("Villa");
        expect(html).toContain("Zamalek");
        expect(html).toContain("3 min");
        expect(html).toContain("Pickup");
        expect(html).toContain("data-studio-map-vehicle");
        expect(html).toContain("prefers-reduced-motion: reduce");
      }
    }
  });

  it("puts roof signs in the page's language, and the lens's minute rings", () => {
    expect(draw(page([map({ style: "two_ink", markers: [{ x: 15, y: 23 }] })]), false, "ar")).toContain("تاكسي");
    expect(draw(page([map({ style: "two_ink", markers: [{ x: 15, y: 23 }], sign: "CAB" })]))).toContain("CAB");
    const lens = draw(page([map({ style: "lens" })]));
    for (const n of [1, 3, 5]) expect(lens).toContain(`${n} min`);
  });

  it("places from the start: right to left, a pin on the left goes to the right and the drawing turns", () => {
    const pin = (html: string) => Number(/data-studio-map-place="" style="[^"]*left:([\d.]+)px/.exec(html)?.[1]);
    const node = map({ style: "natural", places: [{ x: 20, y: 20, label: "Villa" }] });
    expect(pin(draw(page([node])))).toBeLessThan(375 / 2);
    expect(pin(draw(page([node]), false, "ar"))).toBeGreaterThan(375 / 2);
    expect(draw(page([node]), false, "ar")).toContain("matrix(-1 0 0 1 375 0)");
  });

  it("uses the element's land by day and by night, and the two inks from its markers' colours", () => {
    expect(draw(page([map({ style: "natural" }, { background: "#ABCDEF" })]))).toContain('fill="#ABCDEF"');
    expect(draw(page([map({ style: "natural" }, { dark_background: "#123456" })]), true)).toContain('fill="#123456"');
    const ink = mapPalette("two_ink", false, "#F5B700", "#1C2541", null);
    expect([ink.land, ink.road]).toEqual(["#F5B700", "#1C2541"]);
    expect(mapPalette("two_ink", true, "#F5B700", "#1C2541", null).major).toBe("#F5B700");
  });
});

describe("129.21–129.24 the shared geometry", () => {
  it("gives each look its markers' look unless the element says", () => {
    expect([undefined, "natural", "horizon", "two_ink", "lens"].map((style) => markerLook({ style: style as StudioMapDrawing["style"] }))).toEqual(["tile", "car", "car", "sign", "token"]);
    expect(markerLook({ style: "lens", marker: "tile" })).toBe("tile");
  });

  it("fits paths to the frame's height, tilts the horizon and finds the vehicle on its route", () => {
    expect(fitPath("M 0 0 L 375 1000", 500)).toBe("M 0 0 L 375 500");
    // The plane's foot is the frame's foot, seen as it is; its far end smaller, near the top.
    expect(horizonPoint(450, 1000, 420)).toEqual({ x: 187.5, y: 420, depth: 1 });
    expect(horizonPoint(450, 0, 420).depth).toBeLessThan(0.5);
    expect(horizonDepth(420, 420)).toBeCloseTo(1);
    expect(horizonDepth(100, 420)).toBeLessThan(horizonDepth(300, 420));
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
    expect(along(pts, 0.75)).toMatchObject({ x: 10, y: 5, heading: 90, index: 1 });
    const cut = splitRoute(pts, 0.25);
    expect(cut.done).toEqual([{ x: 0, y: 0 }, { x: 5, y: 0 }]);
    expect(cut.ahead).toEqual([{ x: 5, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]);
    expect(lensBox(375, 380)).toEqual({ left: 24, top: 43, size: 327 });
  });

  it("shares its numbers with the app's drawer", () => {
    const dart = readFileSync(join(__dirname, "../../../../mobile/lib/modules/shared/pages/studio_map_looks.dart"), "utf8").replace(/'\s*\n\s*'/g, "");
    for (const d of ["M 30 0 C 60 246 20 517 70 739 C 100 862 120 936 140 1000 L 330 1000 C 300 887 268 788 262 690 C 254 517 250 246 232 0 Z", "M 236 527 L 375 335", "M 322 0 C 402 320 282 640 362 1000", "M 0 196 C 70 178 124 214 178 254 C 210 278 236 296 262 320"]) {
      expect(dart, d).toContain(d);
    }
  });
});
