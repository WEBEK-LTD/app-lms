import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StoreMarks, WorksWithStrip } from "@/components/brand-marks";
import { PlanCards } from "@/components/plan-cards";
import { DOCS } from "@/content/docs";
import { integrationMark, STORES, TRADEMARK_NOTE, WORKS_WITH_BRANDS, WORKS_WITH_ROWS } from "@/lib/brands";
import { FAQ, FEATURE_GROUPS, INTEGRATION_GROUPS, STEPS } from "@/lib/marketing";
import { comparisonRows, PLAN_FEATURES, PLAN_INFO, PLANS, planStores, planStoresLine, plansWith } from "@/lib/plans";
import { DEFAULT_DESCRIPTION } from "@/lib/seo";
import { ALL_STORES_TEXT, APP_STORES, storesFor } from "@/lib/stores";

const root = path.join(__dirname, "../..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

describe("41 the stores", () => {
  it("are Google Play, the App Store, Galaxy Store, AppGallery and GetApps", () => {
    expect(APP_STORES).toEqual(["google_play", "app_store", "galaxy_store", "appgallery", "getapps"]);
    expect(APP_STORES.map((id) => STORES[id].name)).toEqual(["Google Play", "Apple App Store", "Samsung Galaxy Store", "Huawei AppGallery", "Xiaomi GetApps"]);
    expect(ALL_STORES_TEXT).toBe("Google Play, the App Store, Samsung Galaxy Store, Huawei AppGallery and Xiaomi GetApps");
    expect(storesFor(false)).toEqual(["google_play", "galaxy_store", "appgallery", "getapps"]);
    expect(storesFor(true)).toEqual([...APP_STORES]);
    // Each store's guide is an article that exists.
    const slugs = new Set(DOCS.map((d) => `/docs/${d.slug}`));
    for (const id of APP_STORES) if (STORES[id].docs) expect(slugs, id).toContain(STORES[id].docs);
  });

  it("follow each plan's features: the App Store with iOS, uploads with “We publish for you”", () => {
    expect(planStores(PLAN_INFO.starter)).toEqual({ stores: ["google_play", "galaxy_store", "appgallery", "getapps"], publisher: "you" });
    expect(planStores(PLAN_INFO.growth)).toEqual({ stores: [...APP_STORES], publisher: "you" });
    expect(planStores(PLAN_INFO.pro)).toEqual({ stores: [...APP_STORES], publisher: "us" });
    expect(planStores(PLAN_INFO.business)).toEqual({ stores: [...APP_STORES], publisher: "us" });
    expect(planStoresLine(PLAN_INFO.starter)).toBe("4 app stores · You publish with our guides");
    expect(planStoresLine(PLAN_INFO.pro)).toBe("5 app stores · We publish for you");
    // The team's edits in the admin decide: Starter with iOS gets the App Store too.
    const edited = plansWith({ starter: { ...PLAN_INFO.starter, features: ["ios", "push"], version: 2 } });
    expect(planStores(edited.starter).stores).toContain("app_store");
    expect(PLAN_FEATURES.find((f) => f.id === "auto_publish")!.description).toBe(`We upload your apps and every update to ${ALL_STORES_TEXT}.`);
  });

  it("have a row each in the pricing table", () => {
    const rows = comparisonRows(PLAN_INFO).filter((r) => r.store);
    expect(rows.map((r) => r.label)).toEqual(["Google Play", "Apple App Store", "Samsung Galaxy Store", "Huawei AppGallery", "Xiaomi GetApps"]);
    expect(rows.find((r) => r.store === "app_store")!.values).toEqual({ starter: false, growth: true, pro: true, business: true });
    expect(rows.find((r) => r.store === "getapps")!.values).toEqual({ starter: true, growth: true, pro: true, business: true });
  });

  it("show on every plan card as marks with their names", () => {
    const html = renderToStaticMarkup(createElement(PlanCards, { plans: PLANS.map((id) => PLAN_INFO[id]) }));
    for (const id of PLANS) {
      const card = html.slice(html.indexOf(`data-plan="${id}"`), html.indexOf("Start with", html.indexOf(`data-plan="${id}"`)));
      const marks = [...card.matchAll(/data-store="([a-z_]+)"/g)].map((m) => m[1]);
      expect(marks, id).toEqual(planStores(PLAN_INFO[id]).stores);
      expect(card).toContain(`aria-label="${PLAN_INFO[id].name} app stores"`);
      expect(card).toContain(planStoresLine(PLAN_INFO[id]));
    }
    // Every mark is an image named after its store.
    for (const id of APP_STORES) expect(html).toContain(`role="img" aria-label="${STORES[id].name}" title="${STORES[id].name}" data-store="${id}"`);
  });

  it("are no longer “two stores” in the site's texts", () => {
    const texts = [
      DEFAULT_DESCRIPTION,
      ...FAQ.flatMap((g) => [g.title, ...g.items.map((i) => i.a)]),
      ...FEATURE_GROUPS.flatMap((g) => [g.text, ...g.features.map((f) => f.text)]),
      ...STEPS.flatMap((s) => s.details),
      DOCS.find((d) => d.slug === "getting-started")!.body,
      ...["src/app/pricing/page.tsx", "src/app/how-it-works/page.tsx", "src/app/faq/page.tsx", "src/app/features/page.tsx", "src/lib/plans.ts"].map(read),
    ].join("\n");
    expect(texts).not.toMatch(/\b(2|two) app stores\b|\bboth stores\b|Google Play & App Store|publishing to Google Play and the App Store/i);
    expect(DEFAULT_DESCRIPTION).toContain("Google Play, the App Store, Galaxy Store, AppGallery and GetApps");
    expect(FAQ.find((g) => g.title === "Publishing on the app stores")!.items[0]!.q).toBe("Which app stores can my app be on?");
    expect(read("src/lib/marketing.ts")).not.toMatch(/NUMBERS|label: "app stores"/);
  });
});

describe("41 the Works with strip", () => {
  const html = renderToStaticMarkup(createElement(WorksWithStrip));
  const named = (list: string) => [...list.matchAll(/data-brand="([^"]+)"/g)].map((m) => m[1]);

  it("says “Works with”, never “partners”, with the trademark note", () => {
    expect(html).toContain("Works with");
    expect(html).toContain("Publish to the stores, connect what you already use");
    expect(html).not.toMatch(/partner/i);
    expect(html).toContain(TRADEMARK_NOTE.replace("'", "&#x27;"));
    expect(TRADEMARK_NOTE).toMatch(/trademarks of their owners/);
    expect(TRADEMARK_NOTE).toMatch(/endorse/);
  });

  it("has the stores and payments in one row and the platforms in another, Xiaomi included", () => {
    expect(WORKS_WITH_ROWS.map((r) => r.label)).toEqual(["App stores, payments and messaging", "Websites and platforms"]);
    const names = WORKS_WITH_BRANDS.map((b) => b.name);
    expect(names).toContain("Xiaomi GetApps");
    for (const name of ["Google Play", "Apple App Store", "Samsung Galaxy Store", "Huawei AppGallery", "WordPress", "WooCommerce", "Shopify", "Wix", "Salla", "WhatsApp", "Firebase", "iyzico", "Kashier", "Fawaterk"]) {
      expect(names).toContain(name);
    }
    // Only what Yallapp really connects to: every platform is on the Integrations page.
    const integrations = new Set(INTEGRATION_GROUPS.flatMap((g) => g.items.map((i) => i.name)));
    for (const brand of WORKS_WITH_ROWS[1]!.brands) {
      if (brand.name !== "WordPress") expect(integrations, brand.name).toContain(brand.name);
    }
    for (const name of ["iyzico", "Kashier", "Fawaterk", "Firebase"]) expect(integrations).toContain(name);
    expect(names).not.toContain("Bookly");
    expect(new Set(names).size).toBe(names.length);
  });

  it("names every logo for assistive technology and hides the loop's second copy", () => {
    const chips = [...html.matchAll(/<span role="img" aria-label="([^"]+)" data-brand="([^"]+)"/g)];
    expect(chips).toHaveLength(WORKS_WITH_BRANDS.length * 2);
    for (const [, label] of chips) expect(label!.length).toBeGreaterThan(1);
    expect(html.match(/<ul aria-hidden="true" class="marquee-list">/g)).toHaveLength(2);
    const lists = html.split('<ul aria-label="').slice(1);
    expect(lists).toHaveLength(2);
    expect(named(lists[0]!.split("</ul>")[0]!)).toEqual(WORKS_WITH_ROWS[0]!.brands.map((b) => b.id));
    // Marks are drawn at a fixed size (no layout shift) and hidden from screen readers; the chip carries the name.
    expect(html).toMatch(/<svg aria-hidden="true" focusable="false" viewBox="[^"]+" width="\d+" height="\d+">/);
    expect(html).not.toMatch(/<img/);
  });

  it("scrolls, pauses under the pointer and stands still for people who prefer less motion", () => {
    const css = read("src/app/globals.css");
    expect(css).toMatch(/\.marquee:hover \.marquee-track,\s*\.marquee:focus-within \.marquee-track \{\s*animation-play-state: paused;/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.marquee-track \{\s*width: auto;\s*animation: none;[\s\S]*?\.marquee-list\[aria-hidden="true"\] \{\s*display: none;/);
    expect(css).toMatch(/\.brand-chip \{[^}]*color: var\(--color-muted\);/);
    expect(css).toMatch(/\.brand-chip:hover svg,\s*\.store-mark:hover svg \{\s*fill: var\(--brand\);/);
  });

  it("uses simple-icons' CC0 marks, pinned, and a wordmark for brands it doesn't have", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.dependencies["simple-icons"]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(read("node_modules/simple-icons/LICENSE.md")).toMatch(/^# CC0 1\.0 Universal/);
    for (const name of ["iyzico", "Kashier", "Fawaterk", "Zid", "ikas", "Tutor LMS", "Amelia", "LatePoint"]) {
      expect(WORKS_WITH_BRANDS.find((b) => b.name === name)!.mark, name).toBeUndefined();
    }
    expect(integrationMark("Shopify")).toBeDefined();
    expect(integrationMark("Ticimax")).toBeUndefined();
    expect(integrationMark("Samsung Galaxy Store")).toBe(STORES.galaxy_store.mark);
  });

  it("draws store marks with names on the marks", () => {
    const marks = renderToStaticMarkup(createElement(StoreMarks, { stores: ["google_play", "getapps"], label: "Stores" }));
    expect(marks).toContain('aria-label="Stores"');
    expect(marks).toContain('aria-label="Google Play"');
    expect(marks).toContain('aria-label="Xiaomi GetApps"');
  });
});

describe("41 the public site's dark mode and brand rules", () => {
  it("swaps the tokens only on pages with the site header, and keeps the dark bands dark", () => {
    const css = read("src/app/globals.css");
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\) \{\s*html:has\(\[data-site-theme\]\) \{\s*color-scheme: dark;/);
    expect(css).toMatch(/html:has\(\[data-site-theme\]\) \.on-dark \{\s*--color-white: #ffffff;/);
    expect(read("src/components/site-chrome.tsx")).toContain('<header data-site-theme=""');
  });

  it("allows third-party marks only where docs/BRAND.md says", () => {
    const brand = readFileSync(path.join(root, "../../docs/BRAND.md"), "utf8");
    expect(brand).toContain("Third-party brand marks");
    expect(brand).toMatch(/Works with/);
  });
});
