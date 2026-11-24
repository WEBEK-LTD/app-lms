import { describe, expect, it } from "vitest";
import * as NAMES from "@/lib/demo/product-names";
import { PRODUCT_DESCRIPTIONS } from "@/lib/demo/product-descriptions";
import { listHeadings, withListHeadings, withoutEmptied } from "@/lib/hosted/pages/lists";
import type { StudioNode } from "@/lib/pages/types";
import { APP_WORDS } from "@/lib/studio/app-words";
import { signatureDesign } from "@/lib/studio/demo-designs";
import { PRODUCT_PAGE_SLUG } from "@/lib/studio/product-page";
import type { SectionContext } from "@/lib/studio/sections";
import { allNodes, mapTree } from "@/lib/studio/tree";

/**
 * 228.7 The demo shops as customers see them: every demo product's
 * description in Arabic (MSA) and Turkish beside its name, and a template's
 * treasure chest or deals card left out with its heading while the shop has
 * no code or sale to show (lib/hosted/pages/lists.ts).
 */

const ctx = (): SectionContext => {
  let n = 0;
  return { w: (word) => (APP_WORDS.en as Record<string, string>)[word] ?? word, newId: () => `id${++n}` } as SectionContext;
};

/** The page as served when the servers leave out every element of these types. */
function servedWithout(root: StudioNode, gone: (n: StudioNode) => boolean): StudioNode {
  const headings = listHeadings(root);
  const kept = mapTree(root, (n) => (gone(n) ? null : n))!;
  return withoutEmptied(root, withListHeadings(kept, headings));
}
const ofType = (...types: string[]) => (n: StudioNode) => types.includes(n.type);

describe("228.7 a coupon or flash sale the shop hasn't goes with its heading", () => {
  it("toys C's treasure chest: gone, frame and all, without a code; kept and its heading marked with one", () => {
    const page = signatureDesign("toys", "c")!.pages!(ctx()).find((p) => p.slug === PRODUCT_PAGE_SLUG)!.studio;
    const chest = APP_WORDS.en.tyMapChest;
    const named = (root: StudioNode) => allNodes({ body: root }).filter((n) => n.name === chest);
    expect(named(page.body).length).toBeGreaterThan(0);
    expect(named(servedWithout(page.body, ofType("coupon")))).toEqual([]);
    // Everything else on the page stays.
    expect(allNodes({ body: servedWithout(page.body, ofType("coupon")) }).filter((n) => n.type.startsWith("product_")).length).toBe(allNodes(page).filter((n) => n.type.startsWith("product_")).length);
    const kept = withListHeadings(page.body, listHeadings(page.body));
    const coupon = allNodes({ body: kept }).find((n) => n.type === "coupon")!;
    expect(allNodes({ body: kept }).some((n) => n.heads === coupon.id)).toBe(true);
  });

  it("mobiles D's deals card: kept while products are on sale, gone (no empty pink box) with nothing on sale", () => {
    const page = signatureDesign("mobiles", "d")!.pages!(ctx()).find((p) => p.slug === PRODUCT_PAGE_SLUG)!.studio;
    const deals = APP_WORDS.en.mbHubDeals;
    const card = (root: StudioNode) => allNodes({ body: root }).filter((n) => n.name === deals && n.type === "column");
    expect(card(page.body).length).toBe(1);
    expect(card(servedWithout(page.body, ofType("flash_sale"))).length).toBe(1);
    expect(card(servedWithout(page.body, (n) => n.type === "flash_sale" || (n.type === "items" && n.query?.on_sale === true)))).toEqual([]);
  });

  it("a row or column the page leaves empty on purpose stays", () => {
    const root: StudioNode = { id: "r", type: "column", children: [{ id: "gap", type: "column", height: 20, children: [] }, { id: "box", type: "row", children: [{ id: "c", type: "coupon" }] }] };
    const served = servedWithout(root, ofType("coupon"));
    expect(served.children!.map((n) => n.id)).toEqual(["gap"]);
  });
});

describe("228.7 the demo products' descriptions in Arabic and Turkish", () => {
  const all = Object.entries(NAMES).filter(([k]) => k.endsWith("_PRODUCT_NAMES")) as [string, NAMES.ProductNames][];

  it("every named demo product of the 10 shop types has both, and its translations carry them", () => {
    expect(all.length).toBe(10);
    for (const [, names] of all) {
      for (const sku of Object.keys(names)) {
        const d = PRODUCT_DESCRIPTIONS[sku];
        expect(d?.ar?.trim(), `${sku} ar`).toBeTruthy();
        expect(d?.tr?.trim(), `${sku} tr`).toBeTruthy();
        const t = NAMES.namedTranslations(names, sku)!;
        expect(t.ar).toEqual({ name: names[sku]!.ar, description: d!.ar });
        expect(t.tr).toEqual({ name: names[sku]!.tr, description: d!.tr });
      }
    }
    expect(Object.keys(PRODUCT_DESCRIPTIONS).length).toBe(all.reduce((n, [, names]) => n + Object.keys(names).length, 0));
  });

  it("reads as Arabic and Turkish: Arabic letters in the one, Turkish words (not the English) in the other", () => {
    for (const [sku, d] of Object.entries(PRODUCT_DESCRIPTIONS)) {
      expect(d.ar, sku).toMatch(/[؀-ۿ]/);
      expect(d.ar, sku).not.toMatch(/\b(the|and|with|for)\b/i);
      expect(d.tr, sku).not.toMatch(/\b(the|and|with|your)\b/i);
    }
  });
});
