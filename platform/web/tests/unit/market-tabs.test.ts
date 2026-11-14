import { describe, expect, it } from "vitest";
import { MARKETPLACE_TABS } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import type { App } from "@/lib/data/types";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { demoLayout } from "@/lib/demo/setup";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { MARKET_DESIGNS } from "@/lib/pages/designs/transport";
import { actionProblem, screenOptionsFor } from "@/lib/pages/sources";
import type { LayoutContent } from "@/lib/pages/types";
import { parseLayoutContent } from "@/lib/pages/validate";
import { TEMPLATES, type SectionWord } from "@/lib/studio/sections";
import { startLayout } from "@/lib/studio/start";
import { en as appEn } from "@/lib/studio/app-words";
import { NOW } from "./helpers";

/**
 * 115 A marketplace's tabs, as the approved home has them: Home, Search
 * (its places, dishes and products), Orders, Club (the club and the
 * member's benefits) and Account. Studio starts every marketplace with
 * them; Zad's demo and the template a project starts from have them.
 */

const target = (l: Pick<LayoutContent, "tabs">) => l.tabs.map((t) => [t.label, t.target.type === "page" ? `page:${t.target.page_slug}` : t.target.screen]);
const APPROVED = [
  ["Home", "page:home"],
  ["Search", "search"],
  ["Orders", "food_orders"],
  ["Club", "club"],
  ["Account", "account"],
];

function app(vertical: "marketplace" | null): App {
  return { ...newApp("c1", null, NOW, "food", vertical), section: "studio", backend: "hosted", appName: "Nour" };
}

describe("115 a marketplace's tabs", () => {
  it("are Studio's first tabs for every marketplace, and not a food delivery app's", () => {
    expect(target(defaultLayout(app("marketplace"), BUILT_IN_APP_DEFAULTS, NOW))).toEqual(APPROVED);
    expect(target(defaultLayout(app(null), BUILT_IN_APP_DEFAULTS, NOW))).toEqual([
      ["Home", "page:home"],
      ["Restaurants", "restaurants"],
      ["My orders", "food_orders"],
      ["Account", "account"],
    ]);
    expect(MARKETPLACE_TABS.map((t) => t.icon)).toEqual(["search", "receipt_long", "workspace_premium"]);
  });

  it("are the marketplace's ready-made designs' tabs too", () => {
    for (const design of MARKET_DESIGNS) expect(target(design), design.id).toEqual(APPROVED);
  });

  it("are Zad's, and the template started from Zad has them", async () => {
    const zad: App = { ...app("marketplace"), demo: true, appName: DEMO_BRANDS.marketplace.appName, primaryColor: DEMO_BRANDS.marketplace.primaryColor };
    const demo = await demoLayout({ assetUrl: (a) => `https://files.test/${a}`, now: NOW }, zad, "banner-asset");
    // 120 Each tab after the home opens its Studio page, drawn around the approved tab's screen.
    // 128 Zad's own bar as approved on 13 November 2026: Shops (a page of its own) and Cart in place of Search and Club.
    expect(demo.tabs.map((t) => [t.label, t.target.type === "page" ? (t.target.page_slug === "home" ? "page:home" : (demo.pages.find((p) => p.slug === (t.target.type === "page" ? t.target.page_slug : ""))?.studio?.screen ?? `page:${t.target.page_slug}`)) : null])).toEqual([
      ["Home", "page:home"],
      ["Shops", "page:shops"],
      ["Cart", "cart"],
      ["Orders", "food_orders"],
      ["Account", "account"],
    ]);
    const project = { ...app("marketplace"), primaryColor: DEMO_BRANDS.marketplace.primaryColor };
    const started = startLayout(project, TEMPLATES.find((t) => t.id === "demo_marketplace")!, defaultLayout(project, BUILT_IN_APP_DEFAULTS, NOW), NOW, {
      brand: project.primaryColor,
      source: "restaurants",
      app: "Nour",
      lang: "en",
      w: (word: SectionWord) => String(appEn[word]).replaceAll("{app}", "Nour"),
    });
    expect(started.tabs).toEqual(demo.tabs);
  });

  it("can be chosen in the editor for a marketplace only, and are published only there", () => {
    const market = screenOptionsFor(app("marketplace")).map((s) => s.value);
    expect(market).toEqual(expect.arrayContaining(["search", "club", "food_orders"]));
    const food = screenOptionsFor(app(null)).map((s) => s.value);
    expect(food).not.toContain("club");
    expect(food).not.toContain("search");
    expect(actionProblem({ type: "screen", screen: "club" }, screenOptionsFor(app(null)), [])).toMatch(/no "Club" screen/);
    expect(actionProblem({ type: "screen", screen: "club" }, screenOptionsFor(app("marketplace")), [])).toBeNull();

    const layout = defaultLayout(app("marketplace"), BUILT_IN_APP_DEFAULTS, NOW);
    const ok = parseLayoutContent(layout, { app: app("marketplace"), now: NOW });
    expect(ok.ok ? [] : ok.errors).toEqual([]);
    const refused = parseLayoutContent(layout, { app: app(null), now: NOW });
    expect(refused.ok).toBe(false);
  });
});
