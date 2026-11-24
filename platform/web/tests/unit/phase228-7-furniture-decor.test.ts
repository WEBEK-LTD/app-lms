import { describe, expect, it } from "vitest";
import { parseStudioPage } from "@/lib/pages/validate";
import { STUDIO_PRODUCT_TYPES, type StudioNode, type StudioPage } from "@/lib/pages/types";
import { APP_WORDS } from "@/lib/studio/app-words";
import { signatureDesign, signatureDesigns } from "@/lib/studio/demo-designs";
import { PRODUCT_PAGE_SLUG } from "@/lib/studio/product-page";
import type { SectionContext } from "@/lib/studio/sections";
import { allNodes } from "@/lib/studio/tree";

/**
 * 228.7 The furniture and decor looks C and D draw their own product pages
 * (lib/studio/product-page.ts): MIZAN the architect, MANZIL room by room,
 * ATHAR the gallery and MAZAJ the moodboard. Each passes the page checker,
 * is the product's in its own archetype, and shares its skeleton with no
 * other (nor with Lujain A's, the pilot).
 */

const STORE = { appType: "store" as const, backend: "hosted" as const, vertical: null };
const LANGS = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };
const LOOKS = [
  ["furniture", "c"],
  ["furniture", "d"],
  ["decor", "c"],
  ["decor", "d"],
] as const;

/** Its words in English; checked alone, its links to its own other pages (the plan page) open the shop, as `ownPages: false` makes them. */
function ctx(): SectionContext {
  let n = 0;
  return { w: (word) => (APP_WORDS.en as Record<string, string>)[word] ?? word, newId: () => `id${++n}`, ownPages: false } as SectionContext;
}

function productPageOf(demo: Parameters<typeof signatureDesign>[0], look: Parameters<typeof signatureDesign>[1]): StudioPage | undefined {
  return signatureDesign(demo, look)?.pages?.(ctx()).find((p) => p.slug === PRODUCT_PAGE_SLUG)?.studio;
}

/** A page's skeleton: its top-level elements in order, each a product element with its look or the kind of the look's own part. */
function skeleton(page: StudioPage): string {
  const part = (n: StudioNode): string => ((STUDIO_PRODUCT_TYPES as readonly string[]).includes(n.type) ? `${n.type}:${n.product_part?.look ?? "-"}${n.pin === "bottom" ? ":pin" : ""}` : `${n.type}[${(n.children ?? []).map(part).join(",")}]`);
  return (page.body.children ?? []).map(part).join(" | ");
}

describe("228.7 furniture and decor looks C and D: their own product pages", () => {
  it.each(LOOKS)("%s %s has a product page of its own that passes the checker", (demo, look) => {
    const page = productPageOf(demo, look)!;
    expect(page).toBeDefined();
    expect(page.screen).toBe("product");
    const types = allNodes(page).map((n) => n.type);
    for (const type of ["product_gallery", "product_title", "product_price", "product_buy", "product_description", "product_related"]) expect(types, type).toContain(type);
    expect(parseStudioPage(page, STORE, LANGS)).toMatchObject({ ok: true });
  });

  it("every word of theirs is in the app's three languages", () => {
    for (const [demo, look] of LOOKS) {
      for (const n of allNodes(productPageOf(demo, look)!)) {
        for (const text of [n.text, (STUDIO_PRODUCT_TYPES as readonly string[]).includes(n.type) ? n.title : null]) {
          if (!text) continue;
          const key = Object.entries(APP_WORDS.en).find(([, v]) => v === text)?.[0];
          expect(key, `${demo} ${look}: "${text}"`).toBeTruthy();
          for (const lang of ["ar", "tr"] as const) expect((APP_WORDS[lang] as Record<string, string>)[key!], `${lang} ${key}`).toBeTruthy();
        }
      }
    }
  });

  it("share no skeleton with each other, nor with any other look's product page (Lujain A's, the other types' C and D)", () => {
    const pages = signatureDesigns()
      .map((d) => d.pages?.(ctx()).find((p) => p.slug === PRODUCT_PAGE_SLUG)?.studio)
      .filter((p): p is StudioPage => Boolean(p));
    expect(pages.length).toBeGreaterThanOrEqual(LOOKS.length + 1);
    const skeletons = pages.map(skeleton);
    expect(new Set(skeletons).size).toBe(skeletons.length);
    // Not even the same first element (how the page opens) or the same foot.
    const firsts = pages.map((p) => skeleton({ body: { ...p.body, children: p.body.children!.slice(0, 2) } }));
    expect(new Set(firsts).size).toBe(firsts.length);
  });
});
