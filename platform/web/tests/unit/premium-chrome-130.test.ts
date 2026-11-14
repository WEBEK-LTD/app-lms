import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StudioView } from "@/components/studio/view";
import { SystemScreen } from "@/components/studio/premium-chrome";
import { newApp } from "@/lib/app/setup";
import { demoStudioScreens } from "@/lib/demo/screens";
import { STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { STUDIO_HEADER_STYLES, type StudioHeader, type StudioPage } from "@/lib/pages/types";
import { parseStudioPage } from "@/lib/pages/validate";
import { chromedHeader, DEMO_CHROME, THEME_CHROME } from "@/lib/studio/demo-designs/chrome";
import { DESIGN_THEMES, themedPage } from "@/lib/studio/designs";
import { headerCollapses, parseSystemLook, SYSTEM_SCREENS, systemLookFor, systemScreenOf } from "@/lib/studio/premium-chrome";
import { screenDrawing } from "@/lib/studio/screen-drawing";
import { parseStudioScreens, screensConfig } from "@/lib/studio/screens";
import { sampleEntries } from "@/lib/studio/sample-entries";
import { NOW } from "./helpers";

/**
 * 130.20–130.29 Premium chrome: the premium header styles (checked, drawn on
 * the canvas light and dark and right to left, old headers exactly as
 * before), the system screens' look (checked, served, drawn on the pages
 * around those screens in every kind of app), and the defaults: a demo's
 * and a whole design's new pages and screens premium, existing projects as
 * they are.
 */

const WORDS = { price: "Price", addPicture: "Add a picture", addVideo: "Add a video", send: "Send", search: "Search", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds", copy: "Copy" };
const LOOK = { name: "Sofra Eats", logoUrl: null, brand: "#B5462A", font: "Manrope", tabs: [], activeTab: null, accent: "#E8A33D" };
const app = { ...newApp("client-1", null, NOW, "food", null), backend: "hosted" as const, section: "studio" as const };

function draw(page: StudioPage, dark = false, lang: "en" | "ar" = "en"): string {
  return renderToStaticMarkup(createElement(StudioView, { page, lang, defaultLang: "en", dark, look: LOOK, pickable: { items: {}, categories: {}, samples: sampleEntries(NOW) }, words: WORDS }));
}
const page = (header: StudioHeader): StudioPage => ({ header, body: { id: "root", type: "column", children: [] } });
const parse = (p: StudioPage) => parseStudioPage(p, app, { default: "en", available: ["en", "ar"] });

describe("130.20 the premium header styles", () => {
  it("keeps every style with its line, photo and collapse, and its translated line", () => {
    for (const style of STUDIO_HEADER_STYLES) {
      const parsed = parse(page({ type: "title", style, title: "Orders", subtitle: " Tonight ", image_url: "https://cdn.test/cover.jpg", collapse: false, buttons: ["notifications", "account"], translations: { ar: { subtitle: "الليلة" } } }));
      expect(parsed.ok, style).toBe(true);
      expect(parsed.ok && parsed.value.header).toMatchObject({ type: "title", style, subtitle: "Tonight", image_url: "https://cdn.test/cover.jpg", collapse: false, translations: { ar: { subtitle: "الليلة" } } });
    }
  });

  it("refuses an unknown style or a collapse that isn't true or false", () => {
    expect(parse(page({ type: "title", style: "neon" as never })).ok).toBe(false);
    expect(parse(page({ type: "title", style: "large", collapse: "yes" as never })).ok).toBe(false);
  });

  it("leaves an old header exactly as it was", () => {
    const parsed = parse(page({ type: "logo_center", buttons: ["cart"] }));
    expect(parsed.ok && parsed.value.header).toEqual({ type: "logo_center", buttons: ["cart"] });
    const before = draw(page({ type: "logo_center", buttons: ["cart"] }));
    expect(before).not.toContain("data-studio-header-style");
    expect(before).toContain('data-studio-header="logo_center"');
  });

  it("collapses large, photo and search unless asked not to", () => {
    expect(headerCollapses({ style: "large" })).toBe(true);
    expect(headerCollapses({ style: "photo", collapse: false })).toBe(false);
    expect(headerCollapses({ style: "glass" })).toBe(false);
    expect(headerCollapses({})).toBe(false);
  });

  it("draws each style on the canvas with round glass buttons, the bell's dot and the back button, light, dark and right to left", () => {
    for (const style of STUDIO_HEADER_STYLES) {
      for (const dark of [false, true]) {
        const html = draw(page({ type: "title", style, title: "Orders", buttons: ["notifications", "account"] }), dark, dark ? "ar" : "en");
        expect(html, style).toContain(`data-studio-header-style="${style}"`);
        expect(html).toContain('data-chrome-button="back"');
        expect(html).toContain('data-chrome-button="notifications"');
        expect(html).toContain("data-chrome-dot");
        if (style !== "brand") expect(html).toContain("Orders");
      }
    }
    expect(draw(page({ type: "title", style: "photo", image_url: "https://cdn.test/c.jpg" }))).toContain("https://cdn.test/c.jpg");
    expect(draw(page({ type: "title", style: "search" }))).toContain("Search");
  });
});

describe("130.21 the system screens' look", () => {
  it("is checked: known looks and screens only, the photo https", () => {
    const problems: string[] = [];
    expect(parseSystemLook({ look: "glass", screens: { account: "classic", sign_in: "photo", lists: "glass", nope: "brand", code: "neon" }, image_url: "https://cdn.test/h.jpg" }, problems)).toEqual({ look: "glass", screens: { account: "classic", sign_in: "photo" }, image_url: "https://cdn.test/h.jpg" });
    expect(problems).toEqual([]);
    expect(parseSystemLook({ look: "neon" }, problems)).toBeNull();
    parseSystemLook({ look: "large", image_url: "ftp://x" }, problems);
    expect(problems).toHaveLength(1);
  });

  it("is saved with Studio › Screens and served in Config.screens", () => {
    const { screens, problems } = parseStudioScreens({ system: { look: "brand" } });
    expect(problems).toEqual([]);
    expect(screens.system).toEqual({ look: "brand" });
    const served = screensConfig({ ...app, hostedSettings: { ...app.hostedSettings!, studioScreens: screens } });
    expect(served.screens?.system).toEqual({ look: "brand" });
    expect(parseStudioScreens({}).screens.system).toBeUndefined();
  });

  it("gives each screen the project's look, another one, or its own", () => {
    const system = { look: "large" as const, screens: { account: "classic" as const, sign_in: "photo" as const } };
    expect(systemLookFor(system, "settings")).toBe("large");
    expect(systemLookFor(system, "sign_in")).toBe("photo");
    expect(systemLookFor(system, "account")).toBeNull();
    expect(systemLookFor(null, "settings")).toBeNull();
    expect(SYSTEM_SCREENS).toContain("states");
  });

  it("is drawn on the canvas on the pages around the system screens, in every kind of app", () => {
    const screens = { system: { look: "photo" as const, image_url: "https://cdn.test/h.jpg" } };
    for (const s of ["account", "settings", "notifications", "food_orders", "my_rides", "shipments", "trips"]) {
      expect(screenDrawing(s, "food", screens), s).toMatchObject({ screen: "system", key: systemScreenOf(s), look: "photo", image: "https://cdn.test/h.jpg" });
    }
    // Without the look, the screens the canvas drew before as before.
    expect(screenDrawing("account", "food", null)).toBeNull();
    expect(screenDrawing("account", "lms", null)).toMatchObject({ screen: "account", look: "plain" });
    for (const screen of ["account", "settings", "notifications", "edit_profile", "lists"] as const) {
      for (const look of ["large", "glass", "photo", "brand"] as const) {
        const html = renderToStaticMarkup(createElement(SystemScreen, { screen, look, dark: look === "glass", lang: look === "brand" ? "ar" : "en", brand: "#B5462A", accent: "#E8A33D", image: null, title: null, hidesTitle: false, top: 30 }));
        expect(html).toContain(`data-studio-screen-drawn="system:${screen}:${look}"`);
      }
    }
  });
});

describe("130.23 the defaults", () => {
  it("gives every Studio demo's new project premium system screens and its pages a premium header", () => {
    for (const demo of STUDIO_DEMO_TYPES) {
      const screens = demoStudioScreens(demo, "https://yallapp.test");
      expect(screens.system?.look, demo).toBe(DEMO_CHROME[demo].system.look);
      expect(parseStudioScreens(screens).problems, demo).toEqual([]);
      expect(chromedHeader({ type: "title" }, demo)?.style).toBe(DEMO_CHROME[demo].pages);
    }
    // The academies keep their student card.
    expect(demoStudioScreens("instructors", "https://yallapp.test").system?.screens?.account).toBe("classic");
  });

  it("keeps a page's own style and the home's headers, and leaves pages not made from a demo as they are", () => {
    expect(chromedHeader({ type: "title", style: "brand" }, "food")?.style).toBe("brand");
    expect(chromedHeader({ type: "transparent" }, "food")?.style).toBeUndefined();
    expect(chromedHeader({ type: "title" }, undefined)?.style).toBeUndefined();
  });

  it("gives Studio's whole designs premium headers", () => {
    for (const theme of DESIGN_THEMES) {
      const styled = themedPage(page({ type: "title" }), theme);
      expect(styled.header?.style, theme.id).toBe(THEME_CHROME[theme.id]!.pages);
    }
  });

  it("writes the system look into the demo-design registry and the contract", () => {
    const contract = readFileSync(join(__dirname, "../../../../docs/api/openapi.yaml"), "utf8");
    expect(contract).toContain("130.21 The premium look of the app's own system screens");
    expect(contract).toContain("style: { type: string, enum: [large, glass, photo, brand, search]");
    expect(readFileSync(join(__dirname, "../../public/developers/openapi.yaml"), "utf8")).toBe(contract);
  });
});
