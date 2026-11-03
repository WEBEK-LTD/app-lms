import { describe, expect, it } from "vitest";
import { llmsText } from "@/lib/llms";
import { ALL_SOLUTIONS } from "@/lib/marketing";

const BASE = "https://yallapp.test";

describe("/llms.txt", () => {
  for (const lang of ["en", "ar"] as const) {
    const text = llmsText(lang, BASE);
    const links = [...text.matchAll(/\]\((\S+?)\)/g)].map((m) => m[1]!);

    it(`${lang}: is Markdown with the title, a one-line summary and sections of links`, () => {
      expect(text.startsWith("# Yallapp\n\n> ")).toBe(true);
      expect(text.match(/^## /gm)!.length).toBeGreaterThanOrEqual(5);
      expect(text).toContain("Google Play");
      expect(text).toContain("GetApps");
    });

    it(`${lang}: links every solution page, the main pages and the policies, all on the site`, () => {
      const prefix = lang === "en" ? "" : `/${lang}`;
      for (const s of ALL_SOLUTIONS) expect(links, s.id).toContain(`${BASE}${prefix}/solutions/${s.id}`);
      for (const path of ["/pricing", "/faq", "/docs", "/yallapp-studio", "/contact", "/privacy", "/terms", "/delete-account", "/docs/yallapp-courier"]) {
        expect(links, path).toContain(`${BASE}${prefix}${path}`);
      }
      expect(links).toContain(lang === "en" ? `${BASE}/` : `${BASE}/ar`);
      for (const link of links) expect(link.startsWith(`${BASE}/`) || link === `${BASE}/ar`, link).toBe(true);
    });

    it(`${lang}: says nothing the site doesn't (no AI wording, no prices, Courier not yet in the stores)`, () => {
      expect(text).not.toMatch(/\bAI\b|artificial intelligence|machine learning|ذكاء اصطناعي|الذكاء الاصطناعي|yapay zek/i);
      expect(text).not.toMatch(/[$€£₺]\s?\d|\d\s?(USD|EGP|TRY|TL|جنيه|دولار)\b/);
      expect(text).toMatch(lang === "en" ? /coming to Google Play and the App Store/ : /قريبًا على Google Play وApp Store/);
    });
  }

  it("links each language's file from the other", () => {
    expect(llmsText("en", BASE)).toContain(`(${BASE}/ar/llms.txt)`);
    expect(llmsText("ar", BASE)).toContain(`(${BASE}/llms.txt)`);
  });
});
