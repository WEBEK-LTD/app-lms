import { describe, expect, it } from "vitest";
import { LANGS } from "@/i18n/config";
import { formatMessage } from "@/i18n";
import { COMPARE_TEXT, COMPETITORS, DUO_TABLE, DUO_TEXT, REGULAR_TABLE, STUDIO_TABLE, cellOf, leadOver } from "@/lib/compare";
import { sitemapEntries } from "@/lib/sitemap";

const ALL = [...REGULAR_TABLE, ...STUDIO_TABLE];

describe("the comparison pages", () => {
  it("cite every competitor's own pages, over https", () => {
    for (const c of COMPETITORS) {
      expect(c.sources.length, c.id).toBeGreaterThan(0);
      for (const s of c.sources) expect(s.url, c.id).toMatch(/^https:\/\//);
      expect(c.tables.length, c.id).toBeGreaterThan(0);
    }
  });

  it("never say a competitor lacks something: only 'not listed', unless their site says it does it", () => {
    for (const cat of ALL) {
      for (const row of cat.rows) {
        for (const c of COMPETITORS) expect(["yes", "part", "notListed"], `${row.id} ${c.id}`).toContain(cellOf(row, c.id).mark);
      }
    }
  });

  it("have every text in English, Arabic and Turkish", () => {
    const texts = [
      ...ALL.flatMap((cat) => [cat.title, ...cat.rows.flatMap((r) => [r.label, r.yallapp.note, ...Object.values(r.them).map((cell) => cell?.note)])]),
      ...DUO_TABLE.flatMap((cat) => [cat.title, ...cat.rows.flatMap((r) => [r.label, r.regular.note, r.studio.note])]),
      ...COMPETITORS.map((c) => c.what),
    ].filter(Boolean);
    for (const text of texts) for (const lang of LANGS) expect(text![lang]?.trim(), JSON.stringify(text)).toBeTruthy();
  });

  it("keep their descriptions short enough for search results", () => {
    for (const lang of LANGS) {
      const m = COMPARE_TEXT[lang];
      const longest = COMPETITORS.map((c) => c.name).sort((a, b) => b.length - a.length)[0]!;
      for (const text of [m.metaDescription, formatMessage(lang, m.vsMetaDescription, { name: longest }), DUO_TEXT[lang].metaDescription]) {
        expect(text.length, `${lang}: ${text}`).toBeLessThanOrEqual(155);
        expect(text.length, `${lang}: ${text}`).toBeGreaterThanOrEqual(50);
      }
    }
  });

  it("lead with what Yallapp has and each competitor doesn't list", () => {
    for (const c of COMPETITORS) {
      const lead = leadOver(c);
      expect(lead.ours, c.id).toBeGreaterThan(0);
      expect(lead.ours).toBeLessThanOrEqual(lead.total);
    }
  });

  it("are in the sitemap: the overview, each competitor and regular apps vs Studio", () => {
    const urls = sitemapEntries("https://x.test").map((e) => e.url);
    expect(urls).toContain("https://x.test/compare");
    expect(urls).toContain("https://x.test/compare/regular-vs-studio");
    for (const c of COMPETITORS) expect(urls).toContain(`https://x.test/compare/${c.id}`);
  });
});
