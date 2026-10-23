import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { BUILT_IN_APP_DEFAULTS } from "@/lib/pages/defaults";
import { parseLayoutContent } from "@/lib/pages/validate";
import { draftFromScan, draftName, draftShortName } from "@/lib/scan/draft";
import { scanPage, type SiteScan } from "@/lib/scan/site-scan";
import { NOW } from "./helpers";

/** 81.3 One step to a draft app: a site scan made into the app's details and its Pages & look draft. */

const scanOf = (name: string, url: string) => scanPage({ url, html: readFileSync(path.join(__dirname, "fixtures/sites", `${name}.html`), "utf8") });

function valid(draft: ReturnType<typeof draftFromScan>) {
  const app = { ...newApp("client-1", draft.details.siteUrl, NOW, draft.appType, draft.vertical), appName: draft.details.appName };
  const parsed = parseLayoutContent(draft.layout, { app, now: NOW });
  if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
  return parsed.value;
}

describe("81.3 a draft app from a website", () => {
  it("an academy: its brand, an academy design, and its menu as tabs and pages", () => {
    const draft = draftFromScan(scanOf("wordpress-tutor", "https://cedar.example/"), BUILT_IN_APP_DEFAULTS, NOW);
    expect(draft).toMatchObject({
      appType: "lms",
      vertical: null,
      design: { kind: "academy" },
      details: { appName: "Cedar Academy", shortName: "Cedar", primaryColor: "#1F7A5C", font: "Outfit", siteUrl: "https://cedar.example/" },
    });
    const layout = valid(draft);
    expect(layout.appearance).toMatchObject({ font: "Outfit", secondary_color: "#F2A33A", template: draft.design!.look.template });
    // Courses has the app's own screen; About us, Blog and Contact become pages showing the website's.
    expect(draft.menuPages).toEqual(["site-about-us", "site-blog", "site-contact"]);
    const about = layout.pages.find((p) => p.slug === "site-about-us")!;
    expect(about).toMatchObject({ title: "About us", show_title: true, blocks: [{ type: "embed", url: "https://cedar.example/about-us/" }] });
    // Tabs while there's room (five at most, Account last); the others are links on the home page.
    expect(layout.tabs.length).toBeLessThanOrEqual(5);
    expect(layout.tabs.at(-1)!.id).toBe("account");
    const tabbed = layout.tabs.filter((t) => t.id.startsWith("site-")).map((t) => t.id);
    const links = layout.pages.find((p) => p.slug === "home")!.blocks.find((b) => b.id === "site-links")?.links ?? [];
    expect([...tabbed, ...links.map((l) => l.action.page_slug)].sort()).toEqual(["site-about-us", "site-blog", "site-contact"]);
    for (const link of links) expect(link.icon).toMatch(/^(info|newspaper|call)$/);
    // 84.2 The site's About us and Contact take the place of the design's; nothing opens those anymore.
    expect(layout.pages.map((p) => p.slug)).not.toContain("about");
    expect(layout.pages.map((p) => p.slug)).not.toContain("contact");
    expect(JSON.stringify(layout)).not.toMatch(/"page_slug":"(about|contact)"/);
  });

  it("a restaurant in Turkish: a restaurant design, Turkish first", () => {
    const draft = draftFromScan(scanOf("wordpress-woocommerce-restaurant", "https://lezzet.example/"), BUILT_IN_APP_DEFAULTS, NOW);
    expect(draft).toMatchObject({ appType: "store", vertical: "restaurant", design: { kind: "restaurant" }, details: { appName: "Lezzet Durağı", primaryColor: "#C0392B" } });
    expect(valid(draft).languages).toEqual({ default: "tr", available: ["tr", "en"] });
  });

  it("a shop: Shop all is the shop's own tab; Our story a page", () => {
    const draft = draftFromScan(scanOf("shopify", "https://harbourbooks.example/"), BUILT_IN_APP_DEFAULTS, NOW);
    expect(draft.menuPages).toEqual(["site-our-story"]);
    expect(valid(draft).pages.find((p) => p.slug === "site-our-story")!.blocks[0]).toMatchObject({ type: "embed", url: "https://harbourbooks.example/pages/our-story" });
  });

  it("an Arabic menu entry, a site without https, and more entries than pages", () => {
    const scan: SiteScan = {
      ...scanOf("salla", "https://wardstore.example/"),
      menu: [
        { label: "من نحن", url: "https://wardstore.example/about" },
        { label: "Old page", url: "http://wardstore.example/old" },
        ...Array.from({ length: 30 }, (_, i) => ({ label: `Page ${i + 1}`, url: `https://wardstore.example/p${i}` })),
      ],
    };
    const draft = draftFromScan(scan, BUILT_IN_APP_DEFAULTS, NOW);
    const layout = valid(draft);
    // No Latin letters: an address from its place. Only https pages can be shown in the app.
    expect(draft.menuPages[0]).toBe("site-page-1");
    expect(layout.pages.find((p) => p.slug === "site-page-1")!.title).toBe("من نحن");
    expect(draft.menuPages).not.toContain("site-old-page");
    expect(layout.pages.length).toBe(20);
    expect(layout.languages.default).toBe("ar");
  });

  it("names the app from its address when the site has no name", () => {
    expect(draftName({ name: null, url: "https://www.bright-kids.example/" })).toBe("Bright Kids");
    expect(draftName({ name: "A very long name for a website that goes on", url: "https://x.example/" })).toHaveLength(30);
    expect(draftShortName("Cedar Academy")).toBe("Cedar");
    expect(draftShortName("Gala")).toBe("Gala");
  });
});
