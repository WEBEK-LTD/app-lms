import { describe, expect, it } from "vitest";
import { PAGE_FONTS_MAX, pageFontFamilies, servedAppearance } from "@/lib/fonts/look";
import type { Appearance, StudioNode } from "@/lib/pages/types";

/**
 * 224.10 The faces a project's Studio pages name on their elements (a
 * heading in Aref Ruqaa, Lalezar or Amiri over the look's text font) are
 * served with the look (`Appearance.page_fonts`), so the app downloads them
 * as it does `font_family` and `arabic_font`; before, an element's own face
 * showed in Studio's canvas only.
 */

const LOOK: Appearance = { template: "classic", theme_mode: "system", user_can_change_mode: true, secondary_color: null, font: "DM Sans", font_family: "Noto Naskh Arabic", arabic_font: "Tajawal", corners: "soft", cards: "flat" };

const text = (family: string | null, id = family ?? "x"): StudioNode => ({ id, type: "text", text: "Hi", ...(family ? { font: { family, size: 20 } } : {}) });
const page = (...children: StudioNode[]) => ({ studio: { body: { id: "body", type: "column" as const, children } } });

describe("224.10 the pages' own faces", () => {
  it("are the free fonts the pages' elements name, in the order they first come, besides the look's two and the bundled ones", () => {
    const pages = [
      page(text("Aref Ruqaa"), text("Noto Naskh Arabic"), text("Tajawal"), text("Readex Pro"), text(null)),
      // In a list's card and deep in a layout too; a name twice once; a font that isn't free left out.
      page({ id: "items", type: "items", card: { id: "card", type: "column", children: [text("Lalezar", "c1")] } }, { id: "row", type: "row", children: [text("Aref Ruqaa", "again"), text("Comic Sans MS"), text("amiri", "lower")] }),
    ];
    expect(pageFontFamilies(pages, LOOK)).toEqual(["Aref Ruqaa", "Lalezar", "Amiri"]);
    // 97.2 The app's own fonts by their names too.
    expect(pageFontFamilies([page(text("My Brand Face"))], LOOK, ["My Brand Face"])).toEqual(["My Brand Face"]);
    // None without Studio pages.
    expect(pageFontFamilies([{ studio: null }, {}], LOOK)).toEqual([]);
  });

  it("are at most four", () => {
    const many = ["Aref Ruqaa", "Lalezar", "Amiri", "Kufam", "Zain", "Mada"].map((f) => text(f));
    expect(PAGE_FONTS_MAX).toBe(4);
    expect(pageFontFamilies([page(...many)], LOOK)).toEqual(["Aref Ruqaa", "Lalezar", "Amiri", "Kufam"]);
  });

  it("are served with their files on Yallapp, never stored, never the look's own two again", () => {
    const served = servedAppearance(LOOK, "https://yallapp.example", [], ["Aref Ruqaa", "Kufam", "Tajawal"]);
    expect(served.page_fonts).toEqual([
      {
        family: "Aref Ruqaa",
        files: [
          { url: "https://yallapp.example/api/v1/fonts/ofl/arefruqaa/ArefRuqaa-Regular.ttf", weight: 400 },
          { url: "https://yallapp.example/api/v1/fonts/ofl/arefruqaa/ArefRuqaa-Bold.ttf", weight: 600 },
        ],
      },
      { family: "Kufam", files: [{ url: "https://yallapp.example/api/v1/fonts/ofl/kufam/Kufam%5Bwght%5D.ttf", weight: null }] },
    ]);
    // A look served again starts from its stored self: what was served before goes.
    expect(servedAppearance({ ...served }, "https://yallapp.example").page_fonts).toBeUndefined();
    expect(servedAppearance(LOOK, "https://yallapp.example").page_fonts).toBeUndefined();
  });
});
