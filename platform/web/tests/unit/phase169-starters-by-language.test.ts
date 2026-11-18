import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { DEFAULT_CATALOG_SETTINGS, type App, type GiftSettings } from "@/lib/data/types";
import { FLOWER_COMMERCE } from "@/lib/demo/flowers";
import { dashboardMessages } from "@/i18n/dashboard";
import { GIFT_BEGINNINGS, giftBeginningsIn } from "@/lib/selling/gift-starters";
import { DEFAULT_GIFTS, giftConfigJson, giftFormValues, giftsOf, parseGiftForm, startersByLanguageJson, startersIn } from "@/lib/selling/gifts";
import { storeExtrasConfig } from "@/lib/selling/store";

/**
 * 169 The card's "Beginnings to tap" in each of the app's languages: the
 * dashboard's Gifts form has a field per other language, the hosted
 * `StoreConfig.gift_message` sends them by language, and the app picks the
 * customer's. Saved beginnings stay the main language's.
 */

const contract = parse(readFileSync(path.join(__dirname, "../../../../docs/api/openapi.yaml"), "utf8"));
const ajv = new Ajv2020({ strict: false, validateSchema: false, allErrors: true });
ajv.addSchema(contract, "openapi");
const giftSchema = () => ajv.getSchema("openapi#/components/schemas/StoreConfig/properties/gift_message")!;

const appWith = (gifts: Partial<GiftSettings> | null) => ({ vertical: null, hostedSettings: null, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, ...(gifts ? { gifts: { ...DEFAULT_GIFTS, ...gifts } } : {}) } }) as unknown as App;

describe("169 beginnings to tap in each language", () => {
  it("reads the main language's field and each other language's", () => {
    const parsed = parseGiftForm({ message: "on", maxLength: "300", starters: "Happy birthday!\nEid Mubarak!", starters_ar: "عيد ميلاد سعيد!\n\nعيد مبارك!", starters_tr: "" }, ["ar", "tr"]);
    expect(parsed).toEqual({
      ok: true,
      value: { checkout: "standard", message: true, maxLength: 300, starters: ["Happy birthday!", "Eid Mubarak!"], starterTexts: { ar: ["عيد ميلاد سعيد!", "عيد مبارك!"] }, recipient: false, anonymous: false },
    });
    // A field for a language the app doesn't offer is ignored.
    expect(parseGiftForm({ starters: "Hi", starters_fr: "Salut" }, ["ar"])).toMatchObject({ ok: true, value: { starters: ["Hi"] } });
    expect(parseGiftForm({ starters: "Hi", starters_fr: "Salut" }, ["ar"]).ok && "starterTexts" in (parseGiftForm({ starters: "Hi" }, ["ar"]) as { value: object }).value).toBe(false);
  });

  it("checks each language's lines with the same limits", () => {
    const seven = Array.from({ length: 7 }, (_, i) => `Line ${i}`).join("\n");
    expect(parseGiftForm({ starters: "Hi", starters_tr: seven }, ["tr"])).toEqual({ ok: false, errors: { starters_tr: "Write at most 6 beginnings, one per line." } });
    expect(parseGiftForm({ starters_ar: "ب".repeat(81) }, ["ar"])).toEqual({ ok: false, errors: { starters_ar: "Each beginning can be at most 80 characters." } });
  });

  it("keeps a store's beginnings saved before 169 as the main language's", () => {
    const old = appWith({ message: true, starters: ["Happy birthday!", "Eid Mubarak!"] });
    expect(giftsOf(old).starters).toEqual(["Happy birthday!", "Eid Mubarak!"]);
    expect(giftConfigJson(giftsOf(old), "standard")).toMatchObject({ starters: ["Happy birthday!", "Eid Mubarak!"], starters_by_language: null });
    expect(giftFormValues(giftsOf(old), ["ar", "tr"])).toMatchObject({ starters: "Happy birthday!\nEid Mubarak!", starters_ar: "", starters_tr: "" });
    expect(startersIn(giftsOf(old), "ar")).toEqual(["Happy birthday!", "Eid Mubarak!"]);
  });

  it("sends them by language in the store's config, as the contract says", () => {
    const app = appWith({ message: true, starters: ["Happy birthday!"], starterTexts: { ar: ["عيد ميلاد سعيد!"], tr: ["Doğum günün kutlu olsun!"], xx1: ["no"], fr: [] } });
    const gift = storeExtrasConfig(app, "TRY", { fees: true }).gift_message;
    expect(gift.starters).toEqual(["Happy birthday!"]);
    expect(gift.starters_by_language).toEqual({ ar: ["عيد ميلاد سعيد!"], tr: ["Doğum günün kutlu olsun!"] });
    const validate = giftSchema();
    expect(validate(gift), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ ...gift, starters_by_language: null })).toBe(true);
    expect(validate({ ...gift, starters_by_language: { ar: ["x".repeat(81)] } })).toBe(false);
    expect(startersIn(giftsOf(app), "tr")).toEqual(["Doğum günün kutlu olsun!"]);
    expect(startersIn(giftsOf(app), "en")).toEqual(["Happy birthday!"]);
    expect(startersByLanguageJson(undefined)).toBeNull();
  });

  it("gives Yallapp's own beginnings in English, Modern Standard Arabic and Turkish, the demo's too", () => {
    for (const w of GIFT_BEGINNINGS) {
      expect(w.ar).toMatch(/[؀-ۿ]/);
      expect(w.ar).not.toMatch(/[A-Za-z]/);
      expect(w.tr).not.toBe(w.en);
      for (const text of [w.en, w.ar, w.tr]) expect([...text].length).toBeLessThanOrEqual(80);
    }
    expect(GIFT_BEGINNINGS.length).toBeLessThanOrEqual(6);
    expect(giftBeginningsIn("ar")).toContain("عيد مبارك!");
    expect(giftBeginningsIn("tr")).toContain("Bayramın mübarek olsun!");
    expect(giftBeginningsIn("fr")).toEqual(giftBeginningsIn("en"));
    expect(FLOWER_COMMERCE.gifts!.starters).toEqual(giftBeginningsIn("en"));
    expect(FLOWER_COMMERCE.gifts!.starterTexts).toEqual({ ar: giftBeginningsIn("ar"), tr: giftBeginningsIn("tr") });
  });

  it("words the dashboard's new field in English, Egyptian Arabic and Turkish", () => {
    for (const lang of ["en", "ar", "tr"] as const) {
      const selling = (dashboardMessages(lang) as unknown as { selling: Record<string, string> }).selling;
      expect(selling.startersIn).toContain("{language}");
      expect(selling.startersInHint?.length ?? 0).toBeGreaterThan(20);
    }
  });
});
