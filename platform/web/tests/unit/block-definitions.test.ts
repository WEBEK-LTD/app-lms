import { afterEach, describe, expect, it } from "vitest";
import { addDays, dayOf } from "@/lib/analytics/days";
import type { AnalyticsEventRow } from "@/lib/analytics/types";
import { MemoryStore } from "@/lib/data/memory";
import type { App, AppType } from "@/lib/data/types";
import { appVersionsInUse, devicesWithout } from "@/lib/pages/reach";
import { appShowsBlock, BLOCK_DEFINITIONS, BLOCK_GROUP_ORDER, blockListLimits, blockTextLimit, FIRST_APP_VERSION } from "@/lib/pages/blocks";
import { ICON_NAMES } from "@/components/icon-names";
import { BLOCK_GROUPS, BLOCK_HINTS, BLOCK_ICONS, BLOCK_LABELS } from "@/lib/pages/labels";
import { BLOCK_TYPES, TRANSLATABLE } from "@/lib/pages/types";
import { parseLayoutContent } from "@/lib/pages/validate";
import { parseVersion } from "@/lib/semver";
import { NOW } from "./helpers";

/** 83.1 One definition per block drives the validator, the editor's form and the preview. */

const lmsHosted = { appType: "lms" as AppType, backend: "hosted" as App["backend"] };

function parse(blocks: unknown[]) {
  return parseLayoutContent(
    {
      appearance: { template: "classic", theme_mode: "system", user_can_change_mode: true, secondary_color: null, font: "Outfit", corners: "soft", cards: "outlined" },
      languages: { default: "en", available: ["en", "ar"] },
      tabs: [
        { id: "home", label: "Home", icon: "home", target: { type: "page", page_slug: "home" } },
        { id: "account", label: "Account", icon: "person", target: { type: "screen", screen: "account" } },
      ],
      pages: [{ slug: "home", title: "Home", show_title: true, updated_at: NOW.toISOString(), blocks }],
    },
    { app: lmsHosted, now: NOW },
  );
}
const errorsOf = (blocks: unknown[]) => {
  const r = parse(blocks);
  return r.ok ? [] : r.errors;
};
const slide = (n: number) => ({ heading: `Slide ${n}` });
const slider = (count: number) => ({ id: "s", type: "slider", visibility: "everyone", slides: Array.from({ length: count }, (_, i) => slide(i + 1)) });

describe("83.1 block definitions", () => {
  const savedSlides = { ...BLOCK_DEFINITIONS.slider.lists!.slides! };
  const savedHeading = BLOCK_DEFINITIONS.banner.texts.heading;
  afterEach(() => {
    BLOCK_DEFINITIONS.slider.lists!.slides = savedSlides;
    BLOCK_DEFINITIONS.banner.texts.heading = savedHeading;
  });

  it("every block has one: its name, icon, group, texts and the app version that shows it", () => {
    for (const type of BLOCK_TYPES) {
      const def = BLOCK_DEFINITIONS[type];
      expect(def.label && def.hint, type).toBeTruthy();
      expect(ICON_NAMES as readonly string[], type).toContain(def.icon);
      expect(BLOCK_GROUP_ORDER, type).toContain(def.group);
      expect(parseVersion(def.since), type).not.toBeNull();
      expect(def.olderApps, type).toBe("nothing");
      // Its texts are ones that can be translated, and every block has a title.
      for (const text of Object.keys(def.texts)) expect(TRANSLATABLE.block as readonly string[], `${type} ${text}`).toContain(text);
      expect(blockTextLimit(type, "title"), type).toBe(80);
      // The dashboard's names, hints, icons and groups are the definitions'.
      expect(BLOCK_LABELS[type]).toBe(def.label);
      expect(BLOCK_HINTS[type]).toBe(def.hint);
      expect(BLOCK_ICONS[type]).toBe(def.icon);
      expect(BLOCK_GROUPS.find((g) => g.types.includes(type))?.name).toBe(def.group);
    }
    expect(BLOCK_GROUPS.flatMap((g) => g.types).sort()).toEqual([...BLOCK_TYPES].sort());
    expect(() => blockListLimits("banner", "slides")).toThrow();
  });

  it("the validator takes its limits from the definition", () => {
    const max = blockListLimits("slider", "slides").max;
    expect(errorsOf([slider(max)])).toEqual([]);
    expect(errorsOf([slider(max + 1)]).join("\n")).toContain(`add at most ${max} slides.`);
    // A change to the definition is a change to the validator.
    BLOCK_DEFINITIONS.slider.lists!.slides = { min: 1, max: 2 };
    expect(errorsOf([slider(3)]).join("\n")).toContain("add at most 2 slides.");

    const banner = (heading: string) => ({ id: "b", type: "banner", visibility: "everyone", image_url: "https://cdn.test/a.jpg", heading });
    const limit = blockTextLimit("banner", "heading");
    expect(errorsOf([banner("x".repeat(limit))])).toEqual([]);
    expect(errorsOf([banner("x".repeat(limit + 1))]).join("\n")).toContain(`at most ${limit} characters`);
    BLOCK_DEFINITIONS.banner.texts.heading = 10;
    expect(errorsOf([banner("x".repeat(11))]).join("\n")).toContain("at most 10 characters");

    // The numbers block takes two to four.
    const stats = (n: number) => ({ id: "n", type: "stats", visibility: "everyone", stats: Array.from({ length: n }, (_, i) => ({ value: `${i}`, label: "Students" })) });
    const { min, max: most } = blockListLimits("stats", "stats");
    expect(errorsOf([stats(min - 1)]).join("\n")).toContain(`add at least ${min} numbers.`);
    expect(errorsOf([stats(most)])).toEqual([]);
  });

  it("keeps translations of the block's own texts only, within their limits", () => {
    const r = parse([{ id: "btn", type: "button", visibility: "everyone", label: "Shop", style: "filled", action: { type: "screen", screen: "account" }, translations: { ar: { label: "تسوق", html: "<p>Not a button's text</p>", title: "عنوان" } } }]);
    if (!r.ok) throw new Error(r.errors.join("\n"));
    expect(r.value.pages[0]!.blocks[0]!.translations).toEqual({ ar: { label: "تسوق", title: "عنوان" } });
    const long = errorsOf([{ id: "btn", type: "button", visibility: "everyone", label: "Shop", style: "filled", action: { type: "screen", screen: "account" }, translations: { ar: { label: "x".repeat(41) } } }]);
    expect(long.join("\n")).toContain("the ar text of label can have at most 40 characters.");
  });

  it("knows which apps show a block", () => {
    expect(FIRST_APP_VERSION).toBe("1.0.0");
    expect(appShowsBlock("slider", "1.0.0")).toBe(true);
    expect(appShowsBlock("slider", "1.4.2+17")).toBe(true);
    expect(appShowsBlock("slider", "0.9.0")).toBe(false);
    // An app that didn't say, or said something else, is shown everything.
    expect(appShowsBlock("slider", null)).toBe(true);
    expect(appShowsBlock("slider", "beta")).toBe(true);
  });

  it("83.2 counts the phones that won't show a block until they update", async () => {
    const store = new MemoryStore();
    const now = new Date("2026-10-20T12:00:00Z");
    const open = (install: string, daysAgo: number, appVersion: string): AnalyticsEventRow => {
      const day = addDays(dayOf(now), -daysAgo);
      return { appId: "app-1", installId: install, type: "app_open", at: new Date(`${day}T09:00:00Z`), day, platform: "android", appVersion, osVersion: null, language: "en", country: null, firstOpen: false, screen: null, itemKind: null, itemId: null, title: null, amountCents: null, currency: null, notificationId: null, pushType: null };
    };
    await store.insertAnalyticsEvents([
      open("a", 5, "1.0.0"),
      open("a", 1, "1.3.0"),
      open("b", 2, "1.0.0"),
      open("c", 3, "1.2.0"),
      open("d", 45, "0.9.0"),
      { ...open("e", 1, "1.0.0"), appId: "app-2" },
    ]);
    const versions = await appVersionsInUse(store, "app-1", now);
    expect(versions).toEqual([
      { version: "1.0.0", installs: 1 },
      { version: "1.2.0", installs: 1 },
      { version: "1.3.0", installs: 1 },
    ]);
    // Every block today shows from the first version.
    expect(devicesWithout("slider", versions)).toBe(0);
    // A block that needs 1.3.0: two phones are behind.
    const since = BLOCK_DEFINITIONS.slider.since;
    BLOCK_DEFINITIONS.slider.since = "1.3.0";
    try {
      expect(devicesWithout("slider", versions)).toBe(2);
      expect(devicesWithout("banner", versions)).toBe(0);
    } finally {
      BLOCK_DEFINITIONS.slider.since = since;
    }
  });
});
