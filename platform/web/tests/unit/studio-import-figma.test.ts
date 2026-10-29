import { describe, expect, it } from "vitest";
import type { StudioNode } from "@/lib/pages/types";
import { figmaFrame, figmaHex, withFigmaPictures, type FigmaNeeds } from "@/lib/studio/import/figma";
import { frameToPage } from "@/lib/studio/import/frame";

const box = (x: number, y: number, width: number, height: number) => ({ x: 1000 + x, y: 500 + y, width, height });
const solid = (r: number, g: number, b: number) => [{ type: "SOLID", color: { r, g, b, a: 1 } }];
const text = (id: string, characters: string, y: number, fontSize: number, extra: Record<string, unknown> = {}) => ({
  id,
  type: "TEXT",
  name: characters,
  characters,
  fills: solid(0.0549, 0.051, 0.1412),
  style: { fontFamily: "Cairo", fontSize, fontWeight: fontSize > 20 ? 700 : 400, textAlignHorizontal: "LEFT", lineHeightPx: fontSize * 1.5 },
  absoluteBoundingBox: box(16, y, 300, fontSize * 1.5),
  ...extra,
});

const home = {
  id: "1:2",
  type: "FRAME",
  name: "Home",
  fills: solid(0.9843, 0.9725, 0.949),
  absoluteBoundingBox: box(0, 0, 390, 844),
  children: [
    { id: "2:1", type: "FRAME", name: "Status bar", absoluteBoundingBox: box(0, 0, 390, 44), children: [text("2:0", "9:41", 12, 15)] },
    text("2:3", "Welcome aboard", 80, 28),
    { id: "2:5", type: "RECTANGLE", name: "Photo", fills: [{ type: "IMAGE", imageRef: "abc123" }], cornerRadius: 16, absoluteBoundingBox: box(16, 140, 358, 200) },
    {
      id: "3:1",
      type: "FRAME",
      name: "Chips",
      layoutMode: "HORIZONTAL",
      itemSpacing: 8,
      paddingLeft: 16,
      paddingRight: 16,
      counterAxisAlignItems: "CENTER",
      absoluteBoundingBox: box(0, 360, 390, 40),
      children: [
        { id: "3:2", type: "INSTANCE", name: "Chip", fills: solid(1, 0.353, 0.1216), cornerRadius: 20, layoutMode: "HORIZONTAL", paddingLeft: 12, paddingRight: 12, absoluteBoundingBox: box(16, 360, 90, 40), children: [text("3:3", "Pizza", 368, 14)] },
        { id: "3:4", type: "INSTANCE", name: "Icon", absoluteBoundingBox: box(114, 368, 24, 24), children: [{ id: "3:5", type: "VECTOR", absoluteBoundingBox: box(116, 370, 20, 20) }] },
      ],
    },
    { id: "4:1", type: "RECTANGLE", name: "Hidden", visible: false, fills: solid(0, 0, 0), absoluteBoundingBox: box(0, 500, 390, 10) },
    { id: "5:1", type: "FRAME", name: "Tab bar", absoluteBoundingBox: box(0, 780, 390, 64), children: [text("5:2", "Home", 810, 11), text("5:3", "Menu", 810, 11, { absoluteBoundingBox: box(200, 810, 60, 16) })] },
  ],
};

function all(node: StudioNode): StudioNode[] {
  return [node, ...(node.children ?? []).flatMap(all)];
}

describe("108.4 a Figma frame into Studio", () => {
  it("reads Figma's colours", () => {
    expect(figmaHex({ r: 1, g: 0.353, b: 0.1216, a: 1 })).toBe("#FF5A1F");
    expect(figmaHex(null)).toBeNull();
  });

  it("knows what to fetch: image fills by reference, drawings by node", () => {
    const needs: FigmaNeeds = { images: new Set(), renders: new Set() };
    const frame = figmaFrame(home, needs)!;
    expect([...needs.images]).toEqual(["figma-image:abc123"]);
    expect([...needs.renders]).toEqual(["figma-render:3:4"]);
    expect(frame).toMatchObject({ name: "Home", width: 390, height: 844, background: "#FBF8F2" });
    // Positions are the frame's own, from its top left corner.
    expect(frame.shapes.find((s) => s.name === "Welcome aboard")!.box).toMatchObject({ x: 16, y: 80 });
    expect(frame.shapes.some((s) => s.name === "Hidden")).toBe(false);
  });

  it("makes a page: auto layout as a row, the picture saved, the bars left out", () => {
    const needs: FigmaNeeds = { images: new Set(), renders: new Set() };
    const frame = withFigmaPictures(figmaFrame(home, needs)!, new Map([["figma-image:abc123", "https://yallapp.test/api/v1/assets/p1"]]));
    let n = 0;
    const page = frameToPage(frame, { rtl: false, newId: () => `f${(n += 1)}` });
    expect(page.tabs).toEqual(["Home", "Menu"]);
    const nodes = all(page.studio.body);
    expect(nodes.filter((x) => x.type === "text").map((x) => x.text)).toEqual(["Welcome aboard"]);
    expect(nodes.find((x) => x.type === "image")).toMatchObject({ image_url: "https://yallapp.test/api/v1/assets/p1", radius: 16, height: 200 });
    const chips = nodes.find((x) => x.name === "Chips")!;
    expect(chips).toMatchObject({ type: "row", gap: 8, cross: "center", padding: { start: 16, end: 16 } });
    // The chip with one text is a button; the icon Figma would draw isn't there without its picture.
    expect(chips.children!.map((c) => c.type)).toEqual(["button"]);
    expect(chips.children![0]).toMatchObject({ text: "Pizza", background: "#FF5A1F", radius: 20 });
  });
});
