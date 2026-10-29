import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { frameToPage } from "@/lib/studio/import/frame";
import { hexColor, parseTransform, pathBox, readSvg } from "@/lib/studio/import/svg";
import { parseXml } from "@/lib/studio/import/xml";
import type { StudioNode } from "@/lib/pages/types";

const fixture = (name: string) => readFileSync(path.join(__dirname, "fixtures/designs", name), "utf8");
let n = 0;
const opts = { rtl: false, newId: () => `i${(n += 1)}` };

function all(node: StudioNode): StudioNode[] {
  return [node, ...(node.children ?? []).flatMap(all)];
}

describe("108.3 an SVG from any design tool", () => {
  it("reads XML with entities, CDATA and comments", () => {
    const root = parseXml(`<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x "y">]><svg a="1 &amp; 2"><!-- no --><text>Tom &#38; Jerry<![CDATA[ <ok> ]]></text><g/></svg>`);
    expect(root?.name).toBe("svg");
    expect(root?.attrs.a).toBe("1 & 2");
    expect(root?.children).toHaveLength(2);
    expect(parseXml("not xml at all")).toBeNull();
  });

  it("reads colours, transforms and the box of a path", () => {
    expect(hexColor("#fff")).toBe("#FFFFFF");
    expect(hexColor("rgb(255, 90, 31)")).toBe("#FF5A1F");
    expect(hexColor("none")).toBeNull();
    expect(parseTransform("translate(10 20) scale(2)")).toEqual([2, 0, 0, 2, 10, 20]);
    expect(pathBox("M10 10 h20 v5 H10 Z")).toEqual({ x: 10, y: 10, w: 20, h: 5 });
  });

  it("makes a Figma export a page: texts, a picture under a text, a button, a row of cards; the bars left out", () => {
    n = 0;
    const read = readSvg(fixture("figma-home.svg"), "Home")!;
    expect(read.frame).toMatchObject({ width: 390, height: 844 });
    expect(Object.values(read.pictures)).toEqual([{ type: "image/png", data: expect.any(String) }]);
    const page = frameToPage(read.frame, opts);
    expect(page.tabs).toEqual(["Home", "Menu", "Account"]);
    expect(page.studio.background).toBe("#FBF8F2");
    const nodes = all(page.studio.body);
    const texts = nodes.filter((x) => x.type === "text").map((x) => x.text);
    // The status bar's time and the tab bar's labels aren't on the page.
    expect(texts).toEqual(["Welcome to Lale", "Fresh food from our kitchen,\nevery day.", "Summer offers"]);
    expect(nodes.find((x) => x.text === "Welcome to Lale")).toMatchObject({ color: "#0E0D24", font: { family: "Cairo", size: 28, weight: 700 } });
    // The picture holds the text drawn over it.
    const banner = nodes.find((x) => x.image_background_url)!;
    expect(banner).toMatchObject({ name: "Banner", radius: 20, width: "fill" });
    expect(banner.image_background_url).toMatch(/^picture:/);
    expect(banner.children?.[0]).toMatchObject({ type: "text", text: "Summer offers", color: "#FFFFFF" });
    // A rounded box with one text: a button.
    expect(nodes.find((x) => x.type === "button")).toMatchObject({ text: "Order now", background: "#FF5A1F", color: "#FFFFFF", radius: 14, height: 52 });
    // Two boxes side by side: a row.
    const row = nodes.find((x) => x.type === "row")!;
    expect(row.children!.map((c) => c.background)).toEqual(["#7A2E1D", "#1F4E5F"]);
    expect(row).toMatchObject({ gap: 16 });
    expect(page.cut).toBe(0);
  });

  it("puts what is on the right first in a right-to-left project", () => {
    const read = readSvg(fixture("figma-home.svg"), "Home")!;
    const page = frameToPage(read.frame, { ...opts, rtl: true });
    const row = all(page.studio.body).find((x) => x.type === "row")!;
    expect(row.children!.map((c) => c.background)).toEqual(["#1F4E5F", "#7A2E1D"]);
  });

  it("draws drawings as pictures, and refuses what isn't an SVG", () => {
    const read = readSvg(`<svg viewBox="0 0 390 200" xmlns="http://www.w3.org/2000/svg"><g id="logo"><path d="M10 10 L50 10 L30 40 Z" fill="#FF5A1F"/></g></svg>`, "Logo")!;
    expect(read.vectors).toHaveLength(1);
    expect(read.vectors[0]!.svg).toContain("<path");
    expect(read.frame.shapes[0]).toMatchObject({ kind: "picture", box: { x: 10, y: 10, w: 40, h: 30 } });
    expect(readSvg("<html></html>", "x")).toBeNull();
  });
});
