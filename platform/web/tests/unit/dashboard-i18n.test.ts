import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { flattenMessages, formatMessage, preferredLang, relocalizeDate } from "@/i18n";
import { dashboardMessages, getDashT, knownMessages, knownTranslator } from "@/i18n/dashboard";
import { richTags } from "@/i18n/rich";
import { icuArguments, parseIcu } from "@/lib/i18n/icu";
import { dashboardFiles, filesUnder, findHardcodedText } from "./dashboard-strings";

const ROOT = join(__dirname, "../..");
const placeholders = (message: string) => [...icuArguments(parseIcu(message)).keys()].sort();

describe("56 the dashboard's catalogs", () => {
  const english = flattenMessages(dashboardMessages("en"));

  it("have every English key in Arabic and Turkish, with text", () => {
    expect(english.size).toBeGreaterThan(300);
    for (const lang of ["ar", "tr"] as const) {
      const other = flattenMessages(dashboardMessages(lang));
      expect([...other.keys()].sort(), lang).toEqual([...english.keys()].sort());
      for (const [key, value] of other) expect(value.trim(), `${lang} ${key}`).not.toBe("");
    }
  });

  it("keep the placeholders and the marked words of the English, and parse", () => {
    for (const lang of ["ar", "tr"] as const) {
      const other = flattenMessages(dashboardMessages(lang));
      for (const [key, message] of english) {
        expect(placeholders(other.get(key)!), `${lang} ${key}`).toEqual(placeholders(message));
        expect(richTags(other.get(key)!), `${lang} ${key}`).toEqual(richTags(message));
      }
    }
  });

  it("write Yallapp and the stores' names in Latin letters, and no other language's script by mistake", () => {
    for (const [key, message] of flattenMessages(dashboardMessages("ar"))) {
      expect(message, key).not.toMatch(/يالاب|ياللاب|جوجل بلاي|واتساب/);
    }
    for (const [key, message] of flattenMessages(dashboardMessages("tr"))) expect(message, key).not.toMatch(/[؀-ۿ]/);
  });

  it("fill placeholders and plurals in each language, with Latin digits", () => {
    expect(getDashT("en")("overview.planDaysLeft", { plan: "Pro", days: 1 })).toBe("Pro plan · 1 day left");
    expect(getDashT("en")("overview.planDaysLeft", { plan: "Pro", days: 12 })).toBe("Pro plan · 12 days left");
    expect(getDashT("ar")("overview.planDaysLeft", { plan: "Pro", days: 3 })).toBe("باقة Pro · المتبقي: 3 أيام");
    expect(getDashT("tr")("overview.sessions", { count: 12000 })).toBe("Son 30 gündeki 12.000 uygulama oturumu içinde.");
    expect(getDashT("ar")("nav.bellUnread", { count: 12 })).toBe("إشعارات من Yallapp، غير المقروءة: 12");
  });
});

describe("56 texts from shared code", () => {
  it("are translated by their English words, names and numbers kept", () => {
    const ar = knownTranslator("ar");
    expect(ar("Pending activation")).toBe("بانتظار التفعيل");
    expect(ar("Your app build is ready")).toBe("إصدار تطبيقك جاهز");
    expect(ar("Version 1.2.0 (12) is ready to download and publish.")).toBe("الإصدار 1.2.0 (12) جاهز للتنزيل والنشر.");
    expect(knownTranslator("tr")("Choose a plan.")).toBe("Bir paket seçin.");
    // Unknown texts (and what the owner typed) stay as they are.
    expect(ar("My course")).toBe("My course");
    expect(knownTranslator("en")("Pending activation")).toBe("Pending activation");
  });

  it("write English dates inside them in the language", () => {
    expect(relocalizeDate("tr", "31 Mar 2027")).toBe("31 Mar 2027");
    expect(relocalizeDate("ar", "31 March 2027")).toBe("31 مارس 2027");
    expect(relocalizeDate("ar", "not a date")).toBe("not a date");
    expect(knownTranslator("tr")("The Pro plan ends on 31 Mar 2027. When it ends, the app pauses until the plan is renewed.")).toBe(
      "Pro paketi 31 Mar 2027 tarihinde sona eriyor. Paket bitince uygulama, paket yenilenene kadar duraklar.",
    );
  });

  it("are only in `known` parts", () => {
    for (const key of knownMessages(dashboardMessages("en")).keys()) expect(key).toMatch(/\.known\./);
  });
});

describe("56 the dashboard's language", () => {
  it("is the person's choice, else the cookie, else English", () => {
    expect(preferredLang("ar", "tr")).toBe("ar");
    expect(preferredLang(null, "tr")).toBe("tr");
    expect(preferredLang(undefined, null)).toBe("en");
    expect(preferredLang("xx", "yy")).toBe("en");
    expect(preferredLang("xx", "ar")).toBe("ar");
  });

  it("types its keys", () => {
    const t = getDashT("en");
    // @ts-expect-error not a key of the catalogs
    expect(() => t("nav.nothingHere")).toThrow();
    expect(formatMessage("en", "{a}", { a: "x" })).toBe("x");
  });
});

describe("56 the dashboard's code", () => {
  it("keeps the catalogs out of the browser's scripts", () => {
    const clientFiles = [...filesUnder(join(ROOT, "src/app")), ...filesUnder(join(ROOT, "src/components"))].filter((file) =>
      readFileSync(file, "utf8").startsWith('"use client"'),
    );
    for (const file of clientFiles) {
      const source = readFileSync(file, "utf8");
      // Type imports are fine; values would put every language in the bundle.
      expect(source, file).not.toMatch(/^import \{[^}]*\} from "@\/i18n(?:\/dashboard)?";/m);
      expect(source, file).not.toMatch(/from "@\/lib\/dashboard-lang"/);
      expect(source, file).not.toMatch(/^import \{[^}]*\} from "@\/components\/(?:build-status|dashboard|owner-notices|announcements)";/m);
    }
  });

  it("has no English text written into its pages and components", () => {
    const findings = dashboardFiles(ROOT).flatMap((file) => findHardcodedText(file));
    expect(findings.map((f) => `${f.file.replace(`${ROOT}/`, "")}:${f.line} ${f.text}`)).toEqual([]);
  });
});
