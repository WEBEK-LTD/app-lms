import { describe, expect, it } from "vitest";
import type { LayoutContent, StudioNode } from "@/lib/pages/types";
import { describeStep } from "@/lib/studio/history-labels";

/** 132.73 What each step of the editor's undo history did. */
const node = (id: string, type: StudioNode["type"], children?: StudioNode[]): StudioNode => ({ id, type, ...(children ? { children } : {}) });
function layout(body: StudioNode, extra: Partial<LayoutContent> = {}): LayoutContent {
  return { appearance: {} as LayoutContent["appearance"], languages: { default: "en", available: ["en"] }, tabs: [], pages: [{ slug: "home", title: "Home", blocks: [], studio: { body } } as unknown as LayoutContent["pages"][number]], ...extra };
}
const base = node("root", "column", [node("a", "text"), node("b", "image"), node("c", "button")]);

describe("132.73 the editor's undo history, in words", () => {
  it("names an element added, deleted, moved and changed", () => {
    const before = layout(base);
    const added = layout(node("root", "column", [...base.children!, node("d", "countdown")]));
    expect(describeStep(before, added)).toMatchObject({ kind: "added", node: { id: "d", type: "countdown" }, page: "Home" });
    const deleted = layout(node("root", "column", [base.children![0]!, base.children![2]!]));
    expect(describeStep(before, deleted)).toMatchObject({ kind: "deleted", node: { id: "b" } });
    const moved = layout(node("root", "column", [base.children![1]!, base.children![2]!, base.children![0]!]));
    expect(describeStep(before, moved)).toMatchObject({ kind: "moved", node: { id: "a" } });
    const changed = layout(node("root", "column", [{ ...base.children![0]!, text: "Hello" } as StudioNode, base.children![1]!, base.children![2]!]));
    expect(describeStep(before, changed)).toMatchObject({ kind: "changed", node: { id: "a" } });
  });

  it("names a section added by its section, not its children", () => {
    const before = layout(base);
    const after = layout(node("root", "column", [...base.children!, node("s", "row", [node("s1", "text"), node("s2", "image")])]));
    expect(describeStep(before, after)).toMatchObject({ kind: "added", node: { id: "s", type: "row" } });
  });

  it("knows a page started again, a page added, the tabs and the look", () => {
    const before = layout(base);
    expect(describeStep(before, layout(node("root2", "column", [node("x", "text")])))).toMatchObject({ kind: "replaced", page: "Home" });
    const more = { ...before, pages: [...before.pages, { slug: "promo", title: "Promo", blocks: [] } as unknown as LayoutContent["pages"][number]] };
    expect(describeStep(before, more)).toEqual({ kind: "page_added", page: "Promo" });
    expect(describeStep(more, before)).toEqual({ kind: "page_deleted", page: "Promo" });
    expect(describeStep(before, { ...before, tabs: [] })).toEqual({ kind: "tabs" });
    expect(describeStep(before, { ...before, appearance: { ...before.appearance } })).toEqual({ kind: "look" });
  });
});
