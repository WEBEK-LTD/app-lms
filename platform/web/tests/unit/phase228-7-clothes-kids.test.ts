import { describe, expect, it } from "vitest";
import { CLOTHES_DEMO, KIDS_DEMO, type StudioDemoId } from "@/lib/demo/constants";
import { appUrl } from "@/lib/env";
import { parseStudioPage } from "@/lib/pages/validate";
import { STUDIO_PRODUCT_LOOKS, STUDIO_PRODUCT_TYPES, type StudioNode, type StudioPage } from "@/lib/pages/types";
import { appWords } from "@/lib/studio/app-words";
import { signatureDesign } from "@/lib/studio/demo-designs";
import type { SignatureLook } from "@/lib/studio/demo-designs/signature";
import { PRODUCT_PAGE_SLUG } from "@/lib/studio/product-page";
import type { SectionContext } from "@/lib/studio/sections";
import { allNodes } from "@/lib/studio/tree";

/**
 * 228.7 Lujain's and Toota's templates C and D each draw a product page of
 * their own, in their archetype: RUNWAY's lookbook of photos and minimal
 * bar, the outfit builder's "Complete the outfit" card, the story world's
 * Tooti and its ages on a bubble, the nursery's size-by-age ruler and thin
 * lines; no two alike, none like the pilot (Lujain's look A).
 */

const app = { appType: "store" as const, backend: "hosted" as const, vertical: null };
const languages = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };

function ctxOf(name: string, lang: "en" | "ar" | "tr" = "en", picture = true): SectionContext {
  let n = 0;
  return { brand: "#7A1F30", source: "products", app: name, lang, w: appWords(lang, name), ...(picture ? { picture: (f: string) => `${appUrl()}/design-pictures/${f}` } : {}), newId: () => `pp-${++n}` };
}

const LOOKS: [StudioDemoId, SignatureLook, string][] = [
  [CLOTHES_DEMO, "c", "Lujain"],
  [CLOTHES_DEMO, "d", "Lujain"],
  [KIDS_DEMO, "c", "Toota"],
  [KIDS_DEMO, "d", "Toota"],
];

function productPageOfLook(demo: StudioDemoId, look: SignatureLook, ctx: SectionContext): StudioPage | undefined {
  return signatureDesign(demo, look)!.pages?.(ctx).find((p) => p.slug === PRODUCT_PAGE_SLUG)?.studio;
}

const isProduct = (n: StudioNode) => (STUDIO_PRODUCT_TYPES as readonly string[]).includes(n.type);
const lookOf = (n: StudioNode) => n.product_part?.look ?? STUDIO_PRODUCT_LOOKS[n.type as keyof typeof STUDIO_PRODUCT_LOOKS][0];

/** A page's skeleton: its product elements in order, each in its look, and whether the buy bar is pinned. */
function skeleton(page: StudioPage): string {
  return allNodes(page)
    .filter(isProduct)
    .map((n) => `${n.type}:${lookOf(n)}${n.pin === "bottom" ? ":pinned" : ""}`)
    .join(" ");
}

describe("228.7 Lujain's and Toota's own product pages", () => {
  it.each(LOOKS)("%s %s: a product page of its own, on the product screen, passing the checker in its three languages, with and without the platform's pictures", (demo, look, name) => {
    for (const lang of ["en", "ar", "tr"] as const) {
      for (const picture of [true, false]) {
        const page = productPageOfLook(demo, look, ctxOf(name, lang, picture))!;
        expect(page, `${demo} ${look}`).toBeTruthy();
        expect(page.screen).toBe("product");
        expect(page.show_tabs).toBe(false);
        const checked = parseStudioPage(page, app, languages);
        // Its links to the look's own pages (the size guide, the gift list) are checked with the project, where those pages are.
        expect(checked.ok ? [] : checked.errors.filter((e) => !e.endsWith("choose a page that exists.")), `${demo} ${look} ${lang}`).toEqual([]);
        // The gallery, the name, the price, the sizes and the button, at least.
        const types = allNodes(page).filter(isProduct).map((n) => n.type);
        for (const type of ["product_gallery", "product_title", "product_price", "product_variants", "product_buy"]) expect(types, `${demo} ${look}`).toContain(type);
      }
    }
    // Its words in Arabic: every text the look wrote itself is Arabic on an Arabic phone.
    const ar = productPageOfLook(demo, look, ctxOf(name, "ar"))!;
    for (const n of allNodes(ar)) if (n.type === "text" && n.text && /[A-Za-z]{3}/.test(n.text)) expect(n.text, `${demo} ${look}`).toMatch(/[؀-ۿ]/);
  });

  it("are four different skeletons, none the pilot's (Lujain's look A)", () => {
    const pilot = skeleton(productPageOfLook(CLOTHES_DEMO, "a", ctxOf("Lujain"))!);
    const own = LOOKS.map(([demo, look, name]) => skeleton(productPageOfLook(demo, look, ctxOf(name))!));
    expect(new Set(own).size, own.join("\n")).toBe(own.length);
    for (const s of own) expect(s).not.toBe(pilot);
    // Each opens on a gallery of its own: its look, its corners and its shape (four looks for five pages, so the outfit
    // builder's 28 px card at 4:5 and the story world's square card on its sky blob share the look, not the gallery).
    const gallery = (page: StudioPage) => {
      const g = allNodes(page).find((n) => n.type === "product_gallery")!;
      return `${lookOf(g)}:${g.product_part?.radius ?? ""}:${g.aspect_ratio ?? ""}`;
    };
    const galleries = LOOKS.map(([demo, look, name]) => gallery(productPageOfLook(demo, look, ctxOf(name))!));
    expect(new Set(galleries).size).toBe(galleries.length);
    expect(galleries).not.toContain(gallery(productPageOfLook(CLOTHES_DEMO, "a", ctxOf("Lujain"))!));
    expect(galleries.filter((g) => g.startsWith("pager"))).toEqual([]);
  });

  it("RUNWAY: the photos one under the other at 3:4, edge to edge; sizes as text chips; a minimal bar pinned at the foot, the price beside Add to bag", () => {
    const page = productPageOfLook(CLOTHES_DEMO, "c", ctxOf("Lujain"))!;
    const nodes = allNodes(page);
    const gallery = nodes.find((n) => n.type === "product_gallery")!;
    expect(gallery).toMatchObject({ product_part: { look: "stacked", radius: 0 }, aspect_ratio: 0.75 });
    expect(page.header).toBeUndefined();
    // 228.8 The sizes as text chips, each as wide as its words.
    expect(lookOf(nodes.find((n) => n.type === "product_variants")!)).toBe("chips");
    expect(nodes.find((n) => n.type === "product_buy")).toMatchObject({ pin: "bottom", product_part: { look: "price" }, text: "Add to bag" });
    // Quiet: no stars, no quantity.
    expect(nodes.some((n) => n.type === "product_reviews" || n.type === "product_quantity")).toBe(false);
    expect(nodes.find((n) => n.type === "product_related")).toMatchObject({ product_part: { look: "grid", related: "complete_look" }, text: "Wear it with" });
  });

  it("the outfit builder: Complete the outfit, a tinted card before the sizes; Add to my bag a floating pill", () => {
    const page = productPageOfLook(CLOTHES_DEMO, "d", ctxOf("Lujain"))!;
    const top = page.body.children!;
    const card = top.findIndex((n) => n.children?.some((c) => c.type === "product_related"));
    const sizes = top.findIndex((n) => n.type === "product_variants");
    expect(card).toBeGreaterThan(-1);
    expect(card).toBeLessThan(sizes);
    expect(top[card]).toMatchObject({ radius: 28 });
    expect(top[card]!.children!.find((c) => c.type === "product_related")).toMatchObject({ product_part: { related: "complete_look" }, text: "Complete the outfit" });
    expect(allNodes(page).find((n) => n.type === "product_gallery")).toMatchObject({ product_part: { look: "card", radius: 28 } });
    const buy = top.find((n) => n.type === "product_buy")!;
    expect(buy).toMatchObject({ pin: "bottom", radius: 30, product_part: { look: "cart" } });
    expect(buy.background).toBeUndefined();
  });

  it("the story world: the photo on a sky blob, Tooti's word beside it, the ages on a lilac bubble, a wavy edge into the details", () => {
    const page = productPageOfLook(KIDS_DEMO, "c", ctxOf("Toota"))!;
    const nodes = allNodes(page);
    expect(nodes.some((n) => n.type === "image" && n.image_url?.endsWith("/design-pictures/kids-tooti.png"))).toBe(true);
    expect(nodes.some((n) => n.text === "Pick their age and I'll check it fits!")).toBe(true);
    const ages = page.body.children!.find((n) => n.children?.some((c) => c.type === "product_variants"))!;
    expect(ages).toMatchObject({ radius: 32, background: "#E4D6FF" });
    expect(ages.children![0]).toMatchObject({ text: "Pick an age" });
    expect(page.body.children!.some((n) => n.name === "~" && n.children?.length === 12)).toBe(true);
    expect(nodes.find((n) => n.type === "product_buy")).toMatchObject({ pin: "bottom", radius: 32, text: "Into the basket" });
  });

  it("the nursery: a quiet header, the size-by-age ruler over the sizes, Add to basket in the page, thin lines and no shadow", () => {
    const page = productPageOfLook(KIDS_DEMO, "d", ctxOf("Toota"))!;
    expect(page.header).toMatchObject({ type: "title", title: "Toota · nursery" });
    const top = page.body.children!;
    const ruler = top.findIndex((n) => n.name === "Size by age" || n.children?.some((c) => c.children?.some((t) => t.text === "6–12")));
    const sizes = top.findIndex((n) => n.type === "product_variants");
    expect(ruler).toBeGreaterThan(-1);
    expect(ruler).toBeLessThan(sizes);
    const buy = top.find((n) => n.type === "product_buy")!;
    expect(buy.pin ?? "none").toBe("none");
    expect(buy.text).toBe("Add to basket");
    expect(allNodes(page).filter((n) => n.type === "divider").length).toBeGreaterThanOrEqual(3);
    expect(allNodes(page).some((n) => n.shadow && n.shadow !== "none")).toBe(false);
    expect(allNodes(page).find((n) => n.type === "product_gallery")).toMatchObject({ product_part: { look: "thumbs", radius: 0 } });
  });
});
