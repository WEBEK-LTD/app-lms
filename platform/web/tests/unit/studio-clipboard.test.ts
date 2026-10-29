import { describe, expect, it } from "vitest";
import type { StudioNode } from "@/lib/pages/types";
import { forPaste, readCopied, readStyle, STYLE_FIELDS, stylePatch, styleOf } from "@/lib/studio/clipboard";

let n = 0;
const ctx = { sources: ["products"] as const, categorySources: ["products"] as const, pageSlugs: ["about"], screens: ["cart"], newId: () => `c${(n += 1)}` };

const card: StudioNode = {
  id: "row1",
  type: "row",
  gap: 8,
  background: "#FF5A1F",
  font: { size: 18, weight: 700 },
  radius: 12,
  motion: { enter: "fade" },
  action: { type: "page", page_slug: "gone" },
  children: [
    { id: "t1", type: "text", text: "Hello", color: "#FFFFFF", action: { type: "page", page_slug: "about" } },
    { id: "b1", type: "button", text: "Cart", action: { type: "screen", screen: "shipments" } },
    { id: "l1", type: "items", source: "courses", layout: "grid", query: { limit: 4, category_id: "c9", featured: true, sort: "newest", ids: ["1", "2"] } },
  ],
};

describe("107.1 copying in Studio's editor", () => {
  it("pastes an element with new IDs, leaving out what the other project hasn't", () => {
    n = 0;
    const pasted = forPaste(card, ctx);
    expect(pasted.id).not.toBe("row1");
    expect(pasted.children!.map((c) => c.id).every((id) => id.startsWith("c"))).toBe(true);
    // A tap to a page this project hasn't does nothing; one to a page it has is kept.
    expect(pasted.action).toBeUndefined();
    expect(pasted.children![0]!.action).toEqual({ type: "page", page_slug: "about" });
    expect(pasted.children![1]!.action).toBeUndefined();
    // A list of courses shows this project's products, without the other project's picks.
    expect(pasted.children![2]!.source).toBe("products");
    expect(pasted.children![2]!.query).toMatchObject({ category_id: null, ids: [], featured: true, limit: 4 });
    // The copy is untouched.
    expect(card.children![2]!.source).toBe("courses");
  });

  it("copies only the style and pastes it over another element's", () => {
    const style = styleOf(card);
    expect(Object.keys(style).sort()).toEqual(["background", "font", "gap", "motion", "radius"]);
    const patch = stylePatch(style);
    expect(Object.keys(patch).sort()).toEqual([...STYLE_FIELDS].sort());
    expect(patch.background).toBe("#FF5A1F");
    // Style the copied element hasn't is taken off the other.
    expect("shadow" in patch && patch.shadow === undefined).toBe(true);
    expect(patch).not.toHaveProperty("text");
    expect(patch).not.toHaveProperty("action");
  });

  it("reads back only what it wrote", () => {
    expect(readCopied(JSON.stringify(card))?.id).toBe("row1");
    expect(readCopied("not json")).toBeNull();
    expect(readCopied(JSON.stringify({ hello: 1 }))).toBeNull();
    expect(readStyle(JSON.stringify({ radius: 4, text: "x" }))).toEqual({ radius: 4 });
    expect(readStyle(null)).toBeNull();
  });
});
