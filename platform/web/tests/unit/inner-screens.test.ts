import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { demoKind, STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { demoLayout } from "@/lib/demo/setup";
import { INNER_SCREENS, innerScreensFor } from "@/lib/pages/inner-screens";
import { pageScreenOptionsFor } from "@/lib/pages/sources";
import { LAYOUT_LIMITS, ownPageCount } from "@/lib/pages/types";
import { parseLayoutContent } from "@/lib/pages/validate";
import type { App } from "@/lib/data/types";

/**
 * 120.4 Every screen of the app in Studio: the screens opened from the tabs
 * a page can be drawn around are the app's (mobile/lib/core/routing/
 * inner_screens.dart, whose addresses the app's own test checks), and every
 * Studio demo has a page around each of its screens.
 */

const NOW = new Date("2026-11-11T10:00:00Z");

function demoApp(id: (typeof STUDIO_DEMO_TYPES)[number]): App {
  const kind = demoKind(id);
  return { ...newApp("demo-client", null, NOW, kind.engine, kind.vertical), demo: true, section: "studio", backend: "hosted", appName: DEMO_BRANDS[id].appName, brandingDoneAt: NOW };
}

describe("120.4 the screens opened from the tabs", () => {
  it("are the app's, each at the same address", () => {
    const dart = readFileSync(join(__dirname, "../../../../mobile/lib/core/routing/inner_screens.dart"), "utf8");
    const app = [...dart.matchAll(/'([a-z_]+)': '([^']+)'/g)].map((m) => [m[1], m[2]]);
    expect(app).toEqual(INNER_SCREENS.map((s) => [s.id, s.path]));
    // No two at one address, none named like a screen a tab opens.
    expect(new Set(INNER_SCREENS.map((s) => s.path)).size).toBe(INNER_SCREENS.length);
  });

  it("are offered in Studio for the apps that have them, after the tabs' screens", () => {
    const school = pageScreenOptionsFor({ appType: "school", vertical: null }).map((o) => o.value);
    expect(school).toEqual(expect.arrayContaining(["school", "settings", "school_timetable", "parent_pickup", "edit_profile"]));
    expect(school).not.toContain("shipment");
    const zad = innerScreensFor({ appType: "food", vertical: "marketplace" }).map((s) => s.id);
    expect(zad).toEqual(expect.arrayContaining(["market_checkout", "market_vendor", "food_cart"]));
    expect(innerScreensFor({ appType: "food", vertical: null }).map((s) => s.id)).not.toContain("market_checkout");
    expect(innerScreensFor({ appType: "lms", vertical: null }).map((s) => s.id)).not.toContain("teacher_profile");
    expect(innerScreensFor({ appType: "lms", vertical: "instructors" }).map((s) => s.id)).toContain("teacher_profile");
  });

  it.each(STUDIO_DEMO_TYPES)("the %s demo has a page around every one of its screens, each once, and the layout is one the platform takes", async (id) => {
    const app = demoApp(id);
    const layout = await demoLayout({ assetUrl: (a) => `https://files.test/${a}`, now: NOW }, app, "banner-asset");
    const around = layout.pages.map((p) => p.studio?.screen).filter((s): s is string => Boolean(s));
    expect(new Set(around).size).toBe(around.length);
    for (const s of innerScreensFor(app)) expect(around, s.id).toContain(s.id);
    // The account's own pages, and the settings and notifications.
    expect(around).toEqual(expect.arrayContaining(["account", "settings", "notifications", "edit_profile"]));
    // A screen with a title of its own: that title in the header, in the demo's languages; one whose top is its own: nothing over it.
    for (const page of layout.pages.filter((p) => p.studio?.screen)) {
      const inner = INNER_SCREENS.find((s) => s.id === page.studio!.screen);
      if (!inner) continue;
      if (inner.title) {
        expect(page.studio!.header, inner.id).toMatchObject({ type: "title", title: inner.title.en, translations: { ar: { title: inner.title.ar }, tr: { title: inner.title.tr } } });
      } else {
        expect(page.studio!.header ?? null, inner.id).toBeNull();
        expect(page.studio!.body.children, inner.id).toEqual([]);
      }
    }
    // Pages around screens count apart from the app's own pages.
    expect(ownPageCount(layout.pages)).toBeLessThanOrEqual(LAYOUT_LIMITS.maxPages);
    const checked = parseLayoutContent(layout, { app, now: NOW });
    expect(checked.ok ? [] : checked.errors).toEqual([]);
  });
});
