import { describe, expect, it } from "vitest";
import { parseStudioPage } from "@/lib/pages/validate";
import type { StudioNode, StudioPage } from "@/lib/pages/types";
import { APP_WORDS } from "@/lib/studio/app-words";
import { signatureDesign, signatureDesigns } from "@/lib/studio/demo-designs";
import { PRODUCT_PAGE_SLUG } from "@/lib/studio/product-page";
import type { SectionContext } from "@/lib/studio/sections";
import { allNodes } from "@/lib/studio/tree";

/**
 * 228.7 Toot's looks C (the adventure map) and D (Montessori) and Nova's
 * looks C (the keynote) and D (the deals hub) each draw their own product
 * page from the product page's elements and their look's own parts: none
 * shares another look's skeleton, Lujain's look A (the pilot) included.
 */

const STORE = { appType: "store" as const, backend: "hosted" as const, vertical: null };
const LANGS = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };

const ctx = (lang: "en" | "ar" | "tr" = "en"): SectionContext => {
  let n = 0;
  return { w: (word) => (APP_WORDS[lang] as Record<string, string>)[word] ?? word, newId: () => `id${++n}` } as SectionContext;
};

const LOOKS = [
  ["toys", "c"],
  ["toys", "d"],
  ["mobiles", "c"],
  ["mobiles", "d"],
] as const;

function productPageOfLook(demo: string, look: string): StudioPage | undefined {
  return signatureDesign(demo as never, look as never)?.pages?.(ctx()).find((p) => p.slug === PRODUCT_PAGE_SLUG)?.studio;
}

/** A page's skeleton: its product elements in order, each in its look. */
const skeleton = (page: StudioPage) =>
  allNodes(page)
    .filter((n) => n.type.startsWith("product_"))
    .map((n) => `${n.type}:${(n.product_part as { look?: string } | undefined)?.look ?? ""}`)
    .join(" ");

const has = (page: StudioPage, test: (n: StudioNode) => boolean) => allNodes(page).some(test);

describe("228.7 Toot's and Nova's looks C and D: their own product pages", () => {
  it.each(LOOKS)("%s look %s has one, on the product screen, passing the checker, its buy bar pinned at the foot", (demo, look) => {
    const page = productPageOfLook(demo, look)!;
    expect(page, `${demo} ${look}`).toBeTruthy();
    expect(page).toMatchObject({ screen: "product", show_tabs: false });
    // Checked on its own the page knows no other page; the deals hub's compare tray opens its compare page, one of the look's own.
    const slugs = signatureDesign(demo, look)!.pages!(ctx()).map((p) => p.slug);
    const links = allNodes(page).map((n) => (n.action as { type?: string; page_slug?: string } | undefined)).filter((a) => a?.type === "page").map((a) => a!.page_slug!);
    for (const slug of links) expect(slugs).toContain(slug);
    const checked = parseStudioPage(page, STORE, LANGS);
    const errors = checked.ok ? [] : checked.errors.filter((e) => !(links.length && e.endsWith("choose a page that exists.")));
    expect(errors).toEqual([]);
    for (const type of ["product_gallery", "product_title", "product_price", "product_buy", "product_related"]) expect(allNodes(page).map((n) => n.type)).toContain(type);
    // Pinned elements are drawn by the app only as the page's own children.
    const buy = page.body.children!.find((n) => n.type === "product_buy");
    expect(buy).toMatchObject({ pin: "bottom" });
    expect(page.body.children!.at(-1)!.type).toBe("product_buy");
  });

  it("carries each archetype's signature", () => {
    const map = productPageOfLook("toys", "c")!;
    // Chunky 3D buttons (an offset shadow under each block), the treasure chest (the coupon reward strip), a big centre Add to cart.
    expect(has(map, (n) => n.type === "coupon")).toBe(true);
    expect(map.body.children!.filter((n) => n.motion?.press === "bounce").length).toBeGreaterThanOrEqual(3);
    expect(map.body.children!.at(-1)).toMatchObject({ product_part: { look: "cart" }, border_width: 2.5 });

    const montessori = productPageOfLook("toys", "d")!;
    // Its age and materials as tags right under the name, and "How to play with it".
    const kids = montessori.body.children!.map((n) => n.type);
    expect(kids.indexOf("product_specs")).toBe(kids.indexOf("product_title") + 1);
    const play = montessori.body.children!.find((n) => n.name === APP_WORDS.en.tyMoPlayTitle)!;
    expect(play.children!.length).toBe(4);

    const keynote = productPageOfLook("mobiles", "c")!;
    // Its colours as swatches over a single spotlight shot on the black stage, then its specs revealed line by line.
    const stage = keynote.body.children![0]!;
    expect(stage).toMatchObject({ background: "#000000", dark_background: "#000000" });
    expect(stage.children!.map((n) => `${n.type}:${(n.product_part as { look?: string } | undefined)?.look ?? ""}`).slice(0, 4)).toEqual(["product_gallery:card", "product_title:plain", "product_price:from", "product_variants:swatches"]);
    expect(has(keynote, (n) => n.type === "product_specs" && (n.product_part as { look?: string }).look === "list")).toBe(true);

    const hub = productPageOfLook("mobiles", "d")!;
    // Price first, the installments note, the compare tray and today's deals with their countdown.
    const order = hub.body.children!.map((n) => n.type);
    expect(order.indexOf("product_price")).toBeLessThan(order.indexOf("product_title"));
    expect(JSON.stringify(hub)).toContain(APP_WORDS.en.mbHubSoon);
    expect(JSON.stringify(hub)).toContain(APP_WORDS.en.mbHubTray);
    expect(has(hub, (n) => n.type === "flash_sale" && n.flash_sale?.countdown === true)).toBe(true);
  });

  it("shares no skeleton with another look's product page, Lujain's look A included", () => {
    const pages = signatureDesigns()
      .map((d) => ({ name: `${d.demo} ${d.variant}`, page: d.pages?.(ctx()).find((p) => p.slug === PRODUCT_PAGE_SLUG)?.studio }))
      .filter((x): x is { name: string; page: StudioPage } => !!x.page);
    expect(pages.map((p) => p.name)).toEqual(expect.arrayContaining(["clothes a", "toys c", "toys d", "mobiles c", "mobiles d"]));
    const seen = new Map<string, string>();
    for (const { name, page } of pages) {
      const s = skeleton(page);
      expect(seen.get(s), `${name} has the skeleton of ${seen.get(s)}`).toBeUndefined();
      seen.set(s, name);
    }
  });

  it("is in three languages, MSA in Arabic", () => {
    for (const word of ["tyMoPlayTitle", "tyMoPlay1", "tyMoPlay2", "tyMoPlay3", "tyMoPpKicker", "mbKeyPpKicker", "mbKeyPp"] as const) {
      for (const lang of ["en", "ar", "tr"] as const) expect((APP_WORDS[lang] as Record<string, string>)[word], `${lang} ${word}`).toBeTruthy();
    }
    const ar = JSON.stringify(signatureDesign("toys", "d")!.pages!(ctx("ar")));
    expect(ar).toContain("كيف نلعب بها");
    expect(ar).not.toMatch(/\b(How to play)\b/);
  });
});
