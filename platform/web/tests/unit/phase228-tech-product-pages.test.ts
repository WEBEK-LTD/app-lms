import { describe, expect, it } from "vitest";
import { parseStudioPage } from "@/lib/pages/validate";
import type { StudioNode, StudioPage } from "@/lib/pages/types";
import { APP_WORDS } from "@/lib/studio/app-words";
import { signatureDesign } from "@/lib/studio/demo-designs";
import { PRODUCT_PAGE_SLUG } from "@/lib/studio/product-page";
import type { SectionContext } from "@/lib/studio/sections";
import { allNodes } from "@/lib/studio/tree";

// 228.7 Madar's (electronics) and Nawah's (computers) looks C and D each have their own product page, in the look's archetype.

const STORE = { appType: "store" as const, backend: "hosted" as const, vertical: null };
const LANGS = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };

const ctx = (): SectionContext => {
  let n = 0;
  return { w: (word) => (APP_WORDS.en as Record<string, string>)[word] ?? word, newId: () => `id${++n}` } as SectionContext;
};

const LOOKS = [
  ["electronics", "c"],
  ["electronics", "d"],
  ["computers", "c"],
  ["computers", "d"],
] as const;

const productPageOfLook = (type: string, look: string): StudioPage | undefined =>
  signatureDesign(type, look as "c" | "d" | "a" | "b")?.pages?.(ctx()).find((p) => p.slug === PRODUCT_PAGE_SLUG)?.studio;

// A page's skeleton: the element types in the tree, nested, with each product element's look.
const skeleton = (n: StudioNode): string =>
  `${n.type}${n.product_part?.look ? `:${n.product_part.look}` : ""}${n.children?.length ? `(${n.children.map(skeleton).join(",")})` : ""}`;

const parts = (page: StudioPage) => allNodes(page).filter((n) => n.type.startsWith("product_"));

describe("228.7 the product pages of electronics and computers, looks C and D", () => {
  it.each(LOOKS)("%s %s has its product page, passing the checker", (type, look) => {
    const page = productPageOfLook(type, look)!;
    expect(page).toBeDefined();
    expect(page).toMatchObject({ screen: "product", show_tabs: false });
    expect(page.dark_background).toMatch(/^#[0-9A-F]{6}$/i);
    const types = parts(page).map((n) => n.type);
    for (const t of ["product_gallery", "product_title", "product_price", "product_variants", "product_specs", "product_buy", "product_related"]) expect(types).toContain(t);
    expect(parts(page).find((n) => n.type === "product_buy")).toMatchObject({ pin: "bottom" });
    // Prices as 229 has them: "from", or a sale on the colour stage.
    expect(parts(page).find((n) => n.type === "product_price")?.product_part?.look).toMatch(/^(from|sale)$/);
    // The page alone knows no other pages: a link to one of the look's own pages is checked against them.
    const result = parseStudioPage(page, STORE, LANGS);
    const errors = result.ok ? [] : result.errors.filter((e) => !e.endsWith("choose a page that exists."));
    expect(errors).toEqual([]);
    const slugs = signatureDesign(type, look)!.pages!(ctx()).map((p) => p.slug);
    for (const n of allNodes(page)) if (n.action?.type === "page") expect(slugs).toContain(n.action.page_slug);
  });

  it("carries each archetype's signature", () => {
    const bento = productPageOfLook("electronics", "c")!;
    // Bento: the parts in tiles of dark glass, two rows side by side.
    expect(bento.body.children!.filter((n) => n.type === "column" && n.children?.some((c) => c.type.startsWith("product_"))).length).toBeGreaterThanOrEqual(5);
    const stage = productPageOfLook("electronics", "d")!;
    // Colour stage: the gallery as a card on its own saturated field.
    const field = stage.body.children![0]!;
    expect(field.children!.some((c) => c.type === "product_gallery" && c.product_part?.look === "card")).toBe(true);
    expect(field.background).toMatch(/^#[0-9A-F]{6}$/i);
    const battle = productPageOfLook("computers", "c")!;
    // Battle station: the specs in a cut-corner card with a neon edge.
    const specsCard = allNodes(battle).find((n) => n.children?.some((c) => c.type === "product_specs"))!;
    expect(specsCard.corners).toMatchObject({ top_start: 0, bottom_end: 0 });
    expect(specsCard.border_color).toBeTruthy();
    const desk = productPageOfLook("computers", "d")!;
    // Workstation pro: a dense spec table, a compare row and the business quote.
    expect(parts(desk).find((n) => n.type === "product_specs")?.product_part).toMatchObject({ look: "table", rows: 16 });
    expect(parts(desk).find((n) => n.type === "product_related")?.product_part?.look).toBe("grid");
    expect(allNodes(desk).some((n) => n.action && JSON.stringify(n.action).includes("business-quote"))).toBe(true);
  });

  it("no two share a skeleton, and none is the Lujain A pilot's", () => {
    const pilot = signatureDesign("clothes", "a")!.pages!(ctx()).find((p) => p.slug === PRODUCT_PAGE_SLUG)!.studio;
    const skeletons = [...LOOKS.map(([t, l]) => skeleton(productPageOfLook(t, l)!.body)), skeleton(pilot.body)];
    expect(new Set(skeletons).size).toBe(skeletons.length);
    // Nor the same product elements in the same order and looks.
    const orders = [...LOOKS.map(([t, l]) => parts(productPageOfLook(t, l)!).map((n) => `${n.type}:${n.product_part?.look}`).join()), parts(pilot).map((n) => `${n.type}:${n.product_part?.look}`).join()];
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("has its words in English, Arabic and Turkish", () => {
    for (const word of ["ebPpKicker", "esPpKicker", "pbSpecsTitle", "pbSpecsCode", "pbFitTitle", "pwSheet", "pwBulkKicker"]) {
      for (const lang of ["en", "ar", "tr"] as const) expect((APP_WORDS[lang] as Record<string, string>)[word], `${lang} ${word}`).toBeTruthy();
      expect((APP_WORDS.ar as Record<string, string>)[word]).toMatch(/[؀-ۿ]/);
    }
  });
});
