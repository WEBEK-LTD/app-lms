import { describe, expect, it } from "vitest";
import { DOCS, docBySlug } from "@/content/docs";
import { LOCALIZED } from "@/content/localized";
import { DASHBOARD_HELP, helpLinks, helpSlug } from "@/lib/docs/help";
import { fold, plainText, searchDocs, type SearchableDoc } from "@/lib/docs/search";

/** 93.2 Help on every page, and the search of the documentation's text. */

describe("93.2 help with each dashboard page", () => {
  it("names an article that exists for each part of the dashboard, the longest address winning", () => {
    for (const [prefix, slug] of Object.entries(DASHBOARD_HELP)) expect(docBySlug(slug), `${prefix} → ${slug}`).toBeDefined();
    expect(helpSlug("/dashboard")).toBe("getting-started");
    expect(helpSlug("/dashboard/publishing")).toBe("developer-accounts");
    expect(helpSlug("/dashboard/publishing/links")).toBe("app-links");
    expect(helpSlug("/dashboard/catalog/12/edit")).toBe("store-orders");
    expect(helpSlug("/dashboard/notifications/campaigns/new")).toBe("push-notifications");
    expect(helpSlug("/dashboard-old")).toBeNull();
  });

  it("links to the article in the dashboard's language, with its title there", () => {
    expect(helpLinks("en").articles.integrations).toEqual({ href: "/docs/integrations", title: docBySlug("integrations")!.title });
    expect(helpLinks("ar").articles.integrations).toEqual({ href: "/ar/docs/integrations", title: LOCALIZED.ar.docs.integrations!.title });
    expect(helpLinks("tr").articles["setup-steps"]!.href).toBe("/tr/docs/setup-steps");
  });
});

describe("93.2 search of the documentation", () => {
  const docs: SearchableDoc[] = DOCS.map((d) => ({ slug: d.slug, section: d.section, title: d.title, description: d.description, body: d.body }));

  it("finds words inside the articles' text, the title counting most, with the text around them", () => {
    const hits = searchDocs(docs, "loyalty points");
    expect(hits[0]!.slug).toBe("store-orders");
    expect(hits[0]!.snippet.toLowerCase()).toContain("loyalty points");
    expect(searchDocs(docs, "coupon").length).toBeGreaterThan(1);
    // Every word must appear.
    expect(searchDocs(docs, "coupon zzqx")).toEqual([]);
    expect(searchDocs(docs, " ")).toEqual([]);
    // Text, not Markdown.
    expect(hits.every((h) => !/\]\(|\*\*/.test(h.snippet))).toBe(true);
  });

  it("finds Arabic and Turkish without their marks and capitals", () => {
    const ar = DOCS.map((d) => ({ ...d, ...LOCALIZED.ar.docs[d.slug]! }));
    const tr = DOCS.map((d) => ({ ...d, ...LOCALIZED.tr.docs[d.slug]! }));
    expect(searchDocs(ar, "نقاط الولاء")[0]!.slug).toBe("store-orders");
    expect(searchDocs(tr, "SADAKAT PUANLARI")[0]!.slug).toBe("store-orders");
    expect(fold("İşlem Ödeme")).toBe("islem odeme");
    expect(fold("إشعارٌ")).toBe("اشعار");
    expect(plainText("## Title\n\nSee [the guide](/docs/x) and **bold** `code`.")).toBe("Title See the guide and bold code.");
  });
});
