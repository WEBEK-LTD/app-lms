import { describe, expect, it } from "vitest";
import { flattenMessages } from "@/i18n";
import { dashboardMessages, getDashT, knownTranslator } from "@/i18n/dashboard";
import { ENGINES, KINDS } from "@/lib/app/kinds";
import { PLAN_FEATURES } from "@/lib/plans";
import { STUDIO_ONLY_KINDS, studioAccountPathFor, studioPathFor } from "@/lib/studio/section";

/** Phase 132.50–132.99: Studio's finishing touches that can be checked without a browser. */
describe("132.50 counts in the dashboard's messages", () => {
  it("never leave a # for the number: the formatter fills {count}, not #", () => {
    for (const lang of ["en", "ar", "tr"] as const) {
      for (const [key, message] of flattenMessages(dashboardMessages(lang))) {
        if (message.includes("plural")) expect(message, `${lang} ${key}`).not.toMatch(/[{ ]#[ }]/);
      }
    }
  });

  it("read as numbers in every language", () => {
    expect(getDashT("en")("studio.pageCount", { count: 11 })).toBe("11 pages");
    expect(getDashT("en")("studio.invoicesCount", { count: 1 })).toBe("1 invoice");
    expect(getDashT("tr")("studio.pageCount", { count: 11 })).toBe("11 sayfa");
    expect(getDashT("ar")("studio.pageCount", { count: 11 })).toBe("11 صفحة");
    expect(getDashT("ar")("campaigns.listCount", { count: 4 })).toBe("4 حملات");
  });
});

describe("132.50 the account's pages in Studio's frame", () => {
  it("Your account and Team open in Studio, the other account pages stay where they are", () => {
    expect(studioAccountPathFor("/dashboard/account")).toBe("/studio/account");
    expect(studioAccountPathFor("/ar/dashboard/team?done=cancelled")).toBe("/studio/team?done=cancelled");
    expect(studioAccountPathFor("/dashboard/team/")).toBe("/studio/team");
    for (const path of ["/dashboard", "/dashboard/businesses", "/dashboard/app-type", "/dashboard/account/delete", "/dashboard/teams"]) expect(studioAccountPathFor(path), path).toBeNull();
    // The project's own pages keep their mapping.
    expect(studioPathFor("/dashboard/account")).toBeNull();
  });
});

describe("132.65 the Studio-only kinds in Arabic and Turkish", () => {
  const texts = new Set<string>();
  for (const kind of KINDS.filter((k) => STUDIO_ONLY_KINDS.has(k.id))) {
    texts.add(kind.name);
    if (kind.description) texts.add(kind.description);
  }
  for (const engine of ["delivery", "food", "rides", "school", "travel"] as const) {
    const e = ENGINES[engine];
    const own = e.ownContent as { choice?: { title?: string; text?: string }; next?: string } | null;
    for (const text of [own?.choice?.title, own?.choice?.text, own?.next, e.platformChoice?.text, e.words.storeDescription, e.words.ratingExample]) if (text) texts.add(text);
  }
  for (const feature of PLAN_FEATURES) if (["food", "market", "rides", "taxi", "school", "university", "travel", "instructors", "courier_app"].includes(feature.id)) texts.add(feature.description);

  it.each(["ar", "tr"] as const)("are translated in %s: their descriptions, setup steps and store listing", (lang) => {
    const k = knownTranslator(lang);
    const left = [...texts].filter((text) => k(text) === text);
    expect(left).toEqual([]);
  });

  it("keep the page names bold in the setup's next step", () => {
    const next = ENGINES.rides.ownContent!.next!;
    expect(knownTranslator("ar")(next).match(/\*\*/g)?.length).toBe(next.match(/\*\*/g)?.length);
    expect(knownTranslator("tr")(next).match(/\*\*/g)?.length).toBe(next.match(/\*\*/g)?.length);
  });
});
