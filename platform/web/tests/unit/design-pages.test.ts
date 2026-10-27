import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DESIGNS } from "@/lib/pages/designs";
import { PALETTES } from "@/lib/pages/designs/build";
import { pictureLibrary } from "@/lib/pages/picture-library";

/** 84.2 Designs with several pages and colours, and Yallapp's pictures for them. */
describe("84.2 designs with several pages, colours and pictures", () => {
  const HEX = /^#[0-9A-F]{6}$/i;

  it("every design has an About us and a Contact page, in the side menu or a tab", () => {
    for (const design of DESIGNS) {
      const slugs = design.pages.map((p) => p.slug);
      expect(slugs, design.id).toContain("about");
      expect(slugs, design.id).toContain("contact");
      expect(slugs[0], design.id).toBe("home");
      // Each page but home opens from a tab or the side menu.
      const opened = new Set([...design.tabs, ...(design.menu ?? [])].map((t) => (t.target.type === "page" ? t.target.page_slug : null)));
      for (const slug of slugs.filter((s) => s !== "home")) expect(opened.has(slug), `${design.id} ${slug}`).toBe(true);
    }
  });

  it("every design offers three colours: its own (99.1 with its main colour), then two others", () => {
    for (const design of DESIGNS) {
      const palettes = design.palettes ?? [];
      expect(palettes, design.id).toHaveLength(3);
      expect(palettes[0]).toMatchObject({ id: "design" });
      expect(palettes[0]!.primary, design.id).toMatch(HEX);
      expect(palettes[0]!.secondary).toBe(design.look.secondary_color ?? PALETTES[0]!.secondary);
      for (const p of palettes) {
        expect(p.secondary, design.id).toMatch(HEX);
        if (p.primary !== null) expect(p.primary, design.id).toMatch(HEX);
      }
      expect(new Set(palettes.map((p) => p.id)).size, design.id).toBe(3);
    }
  });

  it("has a picture for each palette and shape, on the platform's address", () => {
    const pictures = pictureLibrary("https://yallapp.com.tr/");
    expect(pictures).toHaveLength(PALETTES.length * 3);
    for (const picture of pictures) {
      expect(picture.url).toBe(`https://yallapp.com.tr/design-pictures/${picture.id}.jpg`);
      expect(existsSync(path.resolve(__dirname, "../../public/design-pictures", `${picture.id}.jpg`)), picture.id).toBe(true);
    }
  });
});
