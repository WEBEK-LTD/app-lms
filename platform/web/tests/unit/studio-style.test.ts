import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { StudioNode, StudioPage } from "@/lib/pages/types";
import { parseStudioPage } from "@/lib/pages/validate";
import { findNode } from "@/lib/studio/tree";
import { NOW } from "./helpers";

const app = { ...newApp("c1", null, NOW, "store", null), backend: "hosted" as const };
const languages = { default: "en" as const, available: ["en" as const] };

function parse(children: unknown[], root: Record<string, unknown> = {}) {
  return parseStudioPage({ body: { id: "root", type: "column", children, ...root } }, app, languages);
}

function node(result: ReturnType<typeof parse>, id: string): StudioNode {
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return findNode((result.value as StudioPage).body, id)!;
}

describe("107.2 more style in Studio's pages", () => {
  it("keeps each corner, the turn, the colour over a picture, capitals and struck-through text", () => {
    const r = parse([
      {
        id: "pic",
        type: "image",
        image_url: "https://example.com/a.jpg",
        corners: { top_start: 24, top_end: 0, bottom_end: 8 },
        rotation: -12.5,
        overlay: { color: "#0E0D24", opacity: 0.45 },
      },
      { id: "old", type: "text", text: "EGP 300", font: { strike: true, uppercase: true, underline: false } },
    ]);
    expect(node(r, "pic")).toMatchObject({ corners: { top_start: 24, bottom_end: 8 }, rotation: -12.5, overlay: { color: "#0E0D24", opacity: 0.45 } });
    // A square corner isn't kept.
    expect(node(r, "pic").corners).not.toHaveProperty("top_end");
    expect(node(r, "old").font).toEqual({ strike: true, uppercase: true });
  });

  it("keeps a row that scrolls and a hidden element, but never hides the page's own element", () => {
    const r = parse(
      [
        { id: "chips", type: "row", scroll: true, children: [{ id: "t1", type: "text", text: "One" }] },
        { id: "draft", type: "text", text: "Not yet", hidden: true },
        // `scroll` is only for rows.
        { id: "col", type: "column", scroll: true, children: [] },
      ],
      { hidden: true },
    );
    expect(node(r, "chips").scroll).toBe(true);
    expect(node(r, "draft").hidden).toBe(true);
    expect(node(r, "col")).not.toHaveProperty("scroll");
    expect(node(r, "root")).not.toHaveProperty("hidden");
  });

  it("refuses what is out of range", () => {
    for (const bad of [
      { rotation: 200 },
      { corners: { top_start: 900 } },
      { overlay: { color: "black", opacity: 0.5 } },
      { overlay: { color: "#000000", opacity: 2 } },
    ]) {
      const r = parse([{ id: "t", type: "text", text: "x", ...bad }]);
      expect(r.ok, JSON.stringify(bad)).toBe(false);
    }
    // No colour strength: no colour over the picture.
    expect(node(parse([{ id: "t", type: "text", text: "x", overlay: { color: "#000000", opacity: 0 } }]), "t")).not.toHaveProperty("overlay");
  });
});
