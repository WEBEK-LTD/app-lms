import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CM_LANGS, CM_WORDS, ago, compact, fill } from "../../src/components/community/site/words";
import { cmHref, cmLinks } from "../../src/components/community/site/links";
import { BADGE_ORDER, highestBadge } from "../../src/components/community/site/badge";

/**
 * 231 The Community website (area F): its words in the three languages,
 * its links, the badge order, and the rule that it never sells anything.
 */

const ROOT = path.resolve(__dirname, "../..");
const SITE_DIRS = ["src/app/community", "src/components/community"];

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (/\.(tsx?|css)$/.test(name)) out.push(p);
  }
  return out;
}

describe("community website words", () => {
  const en = CM_WORDS.en;
  for (const lang of CM_LANGS) {
    it(`${lang} has every word, none empty, with the same {placeholders}`, () => {
      const words = CM_WORDS[lang];
      expect(Object.keys(words).sort()).toEqual(Object.keys(en).sort());
      for (const [key, value] of Object.entries(words)) {
        expect(value.trim(), `${lang}.${key}`).not.toBe("");
        const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
        expect(holes(value), `${lang}.${key}`).toEqual(holes(en[key as keyof typeof en]));
      }
    });
  }

  it("fills placeholders and keeps unknown ones", () => {
    expect(fill("{n} new", { n: 12 })).toBe("12 new");
    expect(fill("Hi {name}", {})).toBe("Hi {name}");
  });

  it("says how long ago in the member's language", () => {
    const now = new Date("2026-11-24T12:00:00Z");
    expect(ago(CM_WORDS.en, new Date("2026-11-24T11:40:00Z"), now)).toBe("20 min ago");
    expect(ago(CM_WORDS.tr, new Date("2026-11-24T09:00:00Z"), now)).toBe("3 sa önce");
    expect(ago(CM_WORDS.ar, new Date("2026-11-22T12:00:00Z"), now)).toBe("منذ 2 يوم");
  });

  it("writes big figures short, in Western digits", () => {
    expect(compact(420)).toBe("420");
    expect(compact(18400)).toBe("18.4K");
    expect(compact(2000)).toBe("2K");
  });
});

describe("community website links", () => {
  it("keeps every page under the community's prefix", () => {
    expect(cmHref("/")).toBe("/community");
    expect(cmLinks.question("how to")).toBe("/community/questions/how%20to");
    expect(cmLinks.questions({ tab: "unanswered", section: undefined })).toBe("/community/questions?tab=unanswered");
    expect(cmLinks.signIn("/community/ask")).toBe("/community/sign-in?next=%2Fcommunity%2Fask");
  });
});

describe("community badges", () => {
  it("shows only the highest: Gold, then Green, then Blue", () => {
    expect(BADGE_ORDER).toEqual(["gold", "green", "blue"]);
    expect(highestBadge(["blue", "green"])).toBe("green");
    expect(highestBadge(["blue", "gold", "green"])).toBe("gold");
    expect(highestBadge([])).toBeNull();
  });
});

describe("no payments in the community, ever", () => {
  // No prices, no buy buttons, no payment links: in the code or any of its words.
  const FORBIDDEN = [
    /\bprices?\b/i,
    /\bpricing\b/i,
    /\bbuy\b/i,
    /\bpurchase/i,
    /\bcheckout\b/i,
    /\bstripe\b/i,
    /\bpay\s?now\b/i,
    /[$€£₺]\s?\d/,
    /\d\s?(?:USD|EUR|TRY|TL)\b/,
    /["'`/](?:pricing|checkout|billing|pay)(?:[/?"'`]|$)/,
    /سعر|أسعار|اشتر|شراء|ادفع/,
    /\bfiyat|satın al|şimdi öde/i,
  ];

  it("the website's code has none", () => {
    const hits: string[] = [];
    for (const dir of SITE_DIRS) {
      for (const file of files(path.join(ROOT, dir))) {
        const text = readFileSync(file, "utf8");
        for (const re of FORBIDDEN) if (re.test(text)) hits.push(`${path.relative(ROOT, file)}: ${re}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("no word in any language sells anything", () => {
    for (const lang of CM_LANGS) {
      for (const [key, value] of Object.entries(CM_WORDS[lang])) {
        for (const re of FORBIDDEN) expect(re.test(value), `${lang}.${key} matches ${re}`).toBe(false);
      }
    }
  });
});
