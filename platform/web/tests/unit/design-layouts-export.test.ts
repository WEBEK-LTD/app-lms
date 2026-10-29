import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KINDS } from "@/lib/app/kinds";
import { withBuiltInTexts } from "@/lib/pages/builtin";
import { BUILT_IN_APP_DEFAULTS } from "@/lib/pages/defaults";
import { applyDesign, DESIGNS } from "@/lib/pages/designs";
import type { Layout } from "@/lib/pages/types";
import { parseLayoutContent } from "@/lib/pages/validate";
import { NOW } from "./helpers";

/**
 * 110 Writes every ready-made design as the hosted API keeps it (applied,
 * checked like a publish, with Yallapp's Arabic and Turkish filled in) to
 * the file `YALLAPP_DESIGNS_OUT` names, for the app's design pictures
 * (mobile/test/screenshots/design_screenshots_test.dart). Skipped without it.
 */

const OUT = process.env.YALLAPP_DESIGNS_OUT;

/** The demo businesses of the screenshots (mobile/test/screenshots/support/demo_api.dart). */
const NAMES: Record<string, string> = {
  academy: "Nour Academy",
  instructors: "Nour Academy",
  store: "Lale Flowers",
  restaurant: "Defne Café",
  bookings: "Studio Nur",
  services: "Studio Nur",
  clinic: "Kardelen Clinic",
  fitness: "Pulse Studio",
  real_estate: "Nile Homes",
  news: "The Harbour Post",
  events: "Kuzey Culture Centre",
  charity: "Bereket Food Bank",
  delivery: "Nile Express",
  food: "Sofra Eats",
  rides: "Masar Rides",
  taxi: "Masar Taxi",
  school: "Green Valley School",
};

describe("design layouts for the app's pictures", () => {
  it.skipIf(!OUT)("writes every design, applied and checked", () => {
    const out = DESIGNS.map((design) => {
      const kind = KINDS.find((k) => k.id === design.kind)!;
      const name = NAMES[kind.id] ?? kind.name;
      const site = `https://${name.toLowerCase().replace(/[^a-z]+/g, "")}.example`;
      const layout = applyDesign(design, {
        appName: name,
        facts: { website: site, email: `hello@${site.slice(8)}`, whatsapp: "+201001234567" },
        current: { appearance: { ...BUILT_IN_APP_DEFAULTS.appearance, secondary_color: null }, languages: { default: "en", available: ["en", "ar", "tr"] } },
        now: NOW,
        pictureBase: "https://yallapp.test",
      });
      const parsed = parseLayoutContent(layout, { app: { appType: kind.engine, backend: "hosted", vertical: kind.vertical }, now: NOW });
      expect(parsed.ok ? [] : parsed.errors, design.id).toEqual([]);
      const served = withBuiltInTexts({ ...(parsed.ok ? parsed.value : layout), version: "1" } as Layout);
      return { id: design.id, kind: kind.id, engine: kind.engine, vertical: kind.vertical, name, appearance: served.appearance, tabs: served.tabs, menu: served.menu ?? [], pages: served.pages };
    });
    writeFileSync(OUT!, JSON.stringify(out));
    expect(out).toHaveLength(DESIGNS.length);
  });
});
