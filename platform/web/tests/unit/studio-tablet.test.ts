import { describe, expect, it } from "vitest";
import { ar, en, tr } from "@/i18n/dashboard/studio";
import { newApp } from "@/lib/app/setup";
import type { StudioNode } from "@/lib/pages/types";
import { parseStudioPage } from "@/lib/pages/validate";
import { forTablet, tabletChanges, tabletPatch } from "@/lib/studio/tablet";
import { NOW } from "./helpers";

const title: StudioNode = { id: "t", type: "text", text: "Hi", font: { size: 20, weight: 800 }, gap: 8, text_style: "heading" };

/** Editor audit 3.3: sizes, spacing and text that differ on tablets. */
describe("Studio tablet changes", () => {
  it("shows an element with its tablet changes over it, the font field by field", () => {
    expect(forTablet(title)).toBe(title);
    const shown = forTablet({ ...title, tablet: { font: { size: 32 }, text_align: "center" } });
    expect(shown.font).toEqual({ size: 32, weight: 800 });
    expect(shown.text_align).toBe("center");
    expect(shown.gap).toBe(8);
  });

  it("puts sizes, spacing and text in the tablet changes, anything else on the element", () => {
    const patch = tabletPatch(title, { width: 300, font: { size: 28, weight: 800 }, text_style: undefined, color: "#112233" });
    expect(patch).toEqual({ color: "#112233", tablet: { width: 300, font: { size: 28 } } });
    // Leaving the style by changing the font on a tablet keeps it on phones.
    expect(patch).not.toHaveProperty("text_style");
  });

  it("forgets a tablet change set back to the element's own value", () => {
    const changed = { ...title, tablet: { gap: 24, font: { size: 28 } } };
    expect(tabletPatch(changed, { gap: 8 })).toEqual({ tablet: { font: { size: 28 } } });
    expect(tabletPatch(changed, { font: { size: 20, weight: 800 } })).toEqual({ tablet: { gap: 24 } });
    expect(tabletPatch({ ...title, tablet: { gap: 24 } }, { gap: 8 })).toEqual({ tablet: undefined });
  });

  it("counts the elements with tablet changes", () => {
    const page: StudioNode = { id: "root", type: "column", children: [{ ...title, tablet: { gap: 2 } }, { id: "b", type: "text", text: "B" }], tablet: { gap: 30 } };
    expect(tabletChanges(page)).toBe(2);
  });

  it("the platform keeps tablet changes it can check, and turns down the rest", () => {
    const app = { ...newApp("c1", null, NOW, "store", null), backend: "hosted" as const };
    const lang = { default: "en" as const, available: ["en" as const] };
    const body = (tablet: unknown) => ({ body: { id: "root", type: "column", children: [{ id: "t", type: "text", text: "Hi", text_align: "center", tablet }] } });
    const ok = parseStudioPage(body({ font: { size: 30 }, text_align: "start", gap: 0, padding: { top: 24 }, width: "fill" }), app, lang);
    expect(ok.ok ? ok.value.body.children![0]!.tablet : ok.errors).toEqual({ font: { size: 30 }, text_align: "start", gap: 0, padding: { top: 24 }, width: "fill" });
    expect(parseStudioPage(body({ color: "#000000" }), app, lang).ok).toBe(false);
    expect(parseStudioPage(body({ font: { size: 900 } }), app, lang).ok).toBe(false);
    expect(parseStudioPage(body("big"), app, lang).ok).toBe(false);
    const none = parseStudioPage(body({}), app, lang);
    expect(none.ok && "tablet" in none.value.body.children![0]!).toBe(false);
  });

  it("has its words in English, Arabic and Turkish", () => {
    for (const [lang, dict] of Object.entries({ en, ar, tr }) as [string, Record<string, unknown>][]) {
      expect(["tabletEditing", "tabletHint", "tabletReset"].filter((k) => typeof dict[k] !== "string"), lang).toEqual([]);
    }
  });
});
