import { describe, expect, it } from "vitest";
import { ar, en, tr } from "@/i18n/dashboard/studio";
import { newApp } from "@/lib/app/setup";
import { STUDIO_TEXT_STYLES, type LayoutContent, type LayoutPage } from "@/lib/pages/types";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { parseLayoutContent, parseStudioPage } from "@/lib/pages/validate";
import { applyTextStyle, DEFAULT_TEXT_STYLES, followStyle, fontKey, textStylesOf, textStyleUse } from "@/lib/studio/text-styles";
import { NOW } from "./helpers";

const page = (slug: string, style?: "heading" | "body"): LayoutPage => ({
  slug,
  title: slug,
  show_title: false,
  updated_at: "2026-01-01T00:00:00.000Z",
  blocks: [],
  studio: {
    body: {
      id: `${slug}-root`,
      type: "column",
      children: [
        { id: `${slug}-a`, type: "text", text: "Title", ...(style ? { text_style: style, font: { ...DEFAULT_TEXT_STYLES[style] } } : {}) },
        { id: `${slug}-b`, type: "text", text: "Own", font: { size: 30, weight: 900 } },
      ],
    },
  },
});

const draft = (pages: LayoutPage[]): LayoutContent => ({ appearance: {} as never, languages: { default: "en", available: ["en"] } as never, tabs: [], pages });

/** Editor audit 3.3: text styles shared across the project's pages. */
describe("Studio text styles", () => {
  it("fills in each style from the defaults until the owner changes it", () => {
    const styles = textStylesOf(draft([]));
    expect(Object.keys(styles)).toEqual([...STUDIO_TEXT_STYLES]);
    expect(styles.heading).toEqual(DEFAULT_TEXT_STYLES.heading);
    expect(textStylesOf({ text_styles: { body: { size: 17 } } }).body).toEqual({ size: 17 });
  });

  it("compares fonts whatever order their fields are in, ignoring empty ones", () => {
    expect(fontKey({ size: 16, weight: 700 })).toBe(fontKey({ weight: 700, size: 16, family: null, italic: false }));
    expect(fontKey({ size: 16 })).not.toBe(fontKey({ size: 17 }));
  });

  it("changing a style changes every element following it, on every page, and no other", () => {
    const before = draft([page("home", "heading"), page("about", "heading"), page("contact", "body"), page("plain")]);
    const after = applyTextStyle(before, "heading", { ...DEFAULT_TEXT_STYLES.heading, size: 32, family: "Cairo" });
    expect(after.text_styles?.heading).toEqual({ weight: 800, size: 32, line_height: 1.2, family: "Cairo" });
    for (const slug of ["home", "about"]) {
      const p = after.pages.find((x) => x.slug === slug)!;
      expect(p.studio!.body.children![0]!.font).toEqual({ weight: 800, size: 32, line_height: 1.2, family: "Cairo" });
      expect(p.studio!.body.children![1]!.font).toEqual({ size: 30, weight: 900 });
      expect(p.updated_at).not.toBe("2026-01-01T00:00:00.000Z");
    }
    // The body text and a page with no styles stay as they were (the same objects).
    expect(after.pages[2]).toBe(before.pages[2]);
    expect(after.pages[3]).toBe(before.pages[3]);
  });

  it("keeps the draft as it is when nothing changes, and forgets a style put back to its default", () => {
    const before = draft([page("home", "heading")]);
    expect(applyTextStyle(before, "heading", { ...DEFAULT_TEXT_STYLES.heading })).toBe(before);
    const changed = applyTextStyle(before, "heading", { size: 40, weight: 800 });
    const back = applyTextStyle(changed, "heading", DEFAULT_TEXT_STYLES.heading);
    expect(back.text_styles).toBeUndefined();
    expect(back.pages[0]!.studio!.body.children![0]!.font).toEqual(DEFAULT_TEXT_STYLES.heading);
  });

  it("counts the elements following each style, and gives an element the style's font", () => {
    expect(textStyleUse(draft([page("a", "heading"), page("b", "heading"), page("c", "body")]))).toEqual({ heading: 2, subheading: 0, body: 1, button: 0 });
    expect(followStyle("button", textStylesOf({}))).toEqual({ text_style: "button", font: { weight: 700, size: 16 } });
  });

  it("the platform keeps an element's text style and drops one that isn't available", () => {
    const app = { ...newApp("c1", null, NOW, "store", null), backend: "hosted" as const };
    const studio = {
      body: { id: "root", type: "column" as const, children: [{ id: "a", type: "text" as const, text: "Hi", text_style: "heading", font: { size: 26, weight: 800 } }] },
    };
    const ok = parseStudioPage(studio, app, { default: "en", available: ["en"] });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value.body.children![0]).toMatchObject({ text_style: "heading", font: { size: 26, weight: 800 } });
    const bad = parseStudioPage({ body: { ...studio.body, children: [{ ...studio.body.children[0]!, text_style: "huge" }] } }, app, { default: "en", available: ["en"] });
    expect(bad.ok).toBe(false);
  });

  it("the platform keeps the project's styles, and turns down one that isn't available or too big", () => {
    const app = { ...newApp("c1", null, NOW, "store", null), backend: "hosted" as const };
    const base = defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW);
    const kept = parseLayoutContent({ ...base, text_styles: { heading: { size: 30, weight: 900, family: "Cairo" }, body: null } }, { app, now: NOW });
    expect(kept.ok ? kept.value.text_styles : kept.errors).toEqual({ heading: { size: 30, weight: 900, family: "Cairo" } });
    const none = parseLayoutContent({ ...base, text_styles: {} }, { app, now: NOW });
    expect(none.ok && "text_styles" in none.value).toBe(false);
    expect(parseLayoutContent({ ...base, text_styles: { huge: { size: 30 } } }, { app, now: NOW }).ok).toBe(false);
    expect(parseLayoutContent({ ...base, text_styles: { heading: { size: 900 } } }, { app, now: NOW }).ok).toBe(false);
  });

  it("has its words in English, Arabic and Turkish", () => {
    const keys = ["textStyle", "textStyleNone", "textStyles", "textStylesHint", "textStyleUse", "textStyleReset", ...STUDIO_TEXT_STYLES.map((s) => `ts_${s}`)];
    for (const [lang, dict] of Object.entries({ en, ar, tr }) as [string, Record<string, unknown>][]) {
      expect(keys.filter((k) => typeof dict[k] !== "string"), lang).toEqual([]);
    }
  });
});
