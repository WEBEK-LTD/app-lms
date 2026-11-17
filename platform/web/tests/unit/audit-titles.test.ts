import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { demoKind, FLOWER_SHOP_DEMO, FLOWER_SHOP_TEMPLATE, PREMIUM_ACADEMY_DEMO, PREMIUM_ACADEMY_TEMPLATE, STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { demoLayout } from "@/lib/demo/setup";
import { pageScreens } from "@/lib/hosted/pages";
import { sameScreenAs } from "@/lib/pages/sources";
import type { LayoutPage, LayoutTab } from "@/lib/pages/types";
import type { App } from "@/lib/data/types";

/**
 * A page's title in the app is the one the owner sees in Studio. A shop's
 * Search and its All products (the API's `courses`) are one screen in the
 * app (mobile/lib/modules/store/store_routes.dart): Leqaa's demo had a page
 * "Courses" around All products, and the app showed it over the Bouquets
 * tab (and over everything that opens the shop, the Our bouquet page's
 * sizes and its Choose button) instead of the tab's own page.
 */

const NOW = new Date("2026-11-14T12:00:00Z");

function demoApp(id: (typeof STUDIO_DEMO_TYPES)[number]): App {
  const kind = demoKind(id);
  const design = id === PREMIUM_ACADEMY_DEMO ? { design: PREMIUM_ACADEMY_TEMPLATE } : id === FLOWER_SHOP_DEMO ? { design: FLOWER_SHOP_TEMPLATE } : {};
  return { ...newApp("demo-client", null, NOW, kind.engine, kind.vertical), demo: true, section: "studio", backend: "hosted", appName: DEMO_BRANDS[id].appName, brandingDoneAt: NOW, ...design };
}

const layoutOf = (app: App) => demoLayout({ assetUrl: (a) => `https://files.test/${a}`, now: NOW }, app, "banner-asset");

describe("one page for each of the app's screens", () => {
  it.each(STUDIO_DEMO_TYPES)("the %s demo has no two pages around screens the app shows as one, and the tab's is the one", async (id) => {
    const app = demoApp(id);
    const layout = await layoutOf(app);
    const around = layout.pages.flatMap((p) => (p.studio?.screen ? [{ slug: p.slug, screen: p.studio.screen }] : []));
    for (const { slug, screen } of around) {
      const same = around.filter((o) => sameScreenAs(app, screen).includes(o.screen));
      expect(same.map((o) => o.slug), `${id}: ${slug}`).toEqual([slug]);
    }
    // Every page around a screen reaches the app as one.
    expect([...pageScreens(layout, app).keys()].sort()).toEqual(around.map((o) => o.slug).sort());
  });

  it("Leqaa's Bouquets tab and Our bouquet page keep their own titles, in each language", async () => {
    const layout = await layoutOf(demoApp(FLOWER_SHOP_DEMO));
    expect(layout.pages.map((p) => p.slug)).not.toContain("courses");
    expect(layout.pages.some((p) => p.title === "Courses")).toBe(false);
    const tab = layout.tabs.find((t) => t.label === "Bouquets")!;
    expect(tab.target).toEqual({ type: "page", page_slug: "shop" });
    expect(tab.translations).toEqual({ ar: { label: "الباقات" }, tr: { label: "Buketler" } });
    const shop = layout.pages.find((p) => p.slug === "shop")!;
    expect(shop.studio?.screen).toBe("search");
    expect(shop.studio?.header).toMatchObject({ title: "Bouquets", translations: { ar: { title: "الباقات" }, tr: { title: "Buketler" } } });
    const bouquet = layout.pages.find((p) => p.slug === "bouquet")!;
    expect(bouquet).toMatchObject({ title: "Our bouquet", translations: { ar: { title: "باقتنا" }, tr: { title: "Buketimiz" } } });
    expect(bouquet.studio?.header).toMatchObject({ title: "Our bouquet", translations: { ar: { title: "باقتنا" }, tr: { title: "Buketimiz" } } });
  });
});

describe("GET /pages: the screens of the pages", () => {
  const page = (slug: string, screen?: string): LayoutPage => ({ slug, title: slug, show_title: false, updated_at: NOW.toISOString(), blocks: [], studio: { body: { id: `${slug}-root`, type: "column", children: [] }, ...(screen ? { screen } : {}) } }) as LayoutPage;
  const tab = (id: string, slug: string): LayoutTab => ({ id, label: id, icon: "home", target: { type: "page", page_slug: slug } });

  it("an app made before the fix: the page around All products no longer stands over the shop's tab", () => {
    const layout = { pages: [page("home"), page("shop", "search"), page("cart", "cart"), page("courses", "courses"), page("settings", "settings")], tabs: [tab("home", "home"), tab("shop", "shop"), tab("cart", "cart")] };
    expect(Object.fromEntries(pageScreens(layout, { appType: "store" }))).toEqual({ shop: "search", cart: "cart", settings: "settings" });
  });

  it("without a tab on that screen, the page around it stays", () => {
    const layout = { pages: [page("home"), page("courses", "courses")], tabs: [tab("home", "home")] };
    expect(Object.fromEntries(pageScreens(layout, { appType: "store" }))).toEqual({ courses: "courses" });
  });

  it("an academy's search is its courses: the Courses tab's page is the one", () => {
    const layout = { pages: [page("home"), page("courses", "courses"), page("search", "search")], tabs: [tab("home", "home"), tab("courses", "courses")] };
    expect(Object.fromEntries(pageScreens(layout, { appType: "lms" }))).toEqual({ courses: "courses" });
  });

  it("apps whose search is a screen of its own keep both", () => {
    const layout = { pages: [page("home"), page("restaurants", "restaurants"), page("search", "search")], tabs: [tab("home", "home"), tab("restaurants", "restaurants")] };
    expect(Object.fromEntries(pageScreens(layout, { appType: "food" }))).toEqual({ restaurants: "restaurants", search: "search" });
  });
});
