import { describe, expect, it } from "vitest";
import { DEFAULT_CATALOG_SETTINGS } from "@/lib/data/types";
import { countryChoices, countryNameIn, countryNames, FIRST_COUNTRIES, ISO_COUNTRIES, isoCountry } from "@/lib/selling/countries";
import { parseDeliveryForm, slotProblems } from "@/lib/selling/delivery";
import { parseShippingForm, quoteShipping, SHIPPING_LIMITS, shippingConfigJson, shippingRulesOf } from "@/lib/selling/shipping";
import { en, ar, tr } from "@/i18n/dashboard/selling";

/**
 * 132.186 Delivery & offers made easy: several delivery times a day that
 * never overlap, every country with its name in the dashboard's language,
 * and the owner's own cities (with their prices) under each.
 */

describe("132.186 several delivery times a day", () => {
  it("finds times that overlap or end before they start, and allows a break or back-to-back times", () => {
    // A break: 10:00–13:00, then 16:00–21:00.
    expect(slotProblems([{ start: "10:00", end: "13:00" }, { start: "16:00", end: "21:00" }])).toEqual([null, null]);
    // One may start when the other ends.
    expect(slotProblems([{ start: "13:00", end: "16:00" }, { start: "10:00", end: "13:00" }])).toEqual([null, null]);
    // Overlapping: the later-starting one is marked, with the one it runs into, whatever the order typed.
    expect(slotProblems([{ start: "12:00", end: "15:00" }, { start: "10:00", end: "13:00" }])).toEqual([{ kind: "overlap", with: 1 }, null]);
    expect(slotProblems([{ start: "10:00", end: "20:00" }, { start: "12:00", end: "13:00" }, { start: "14:00", end: "15:00" }])).toEqual([null, { kind: "overlap", with: 0 }, { kind: "overlap", with: 0 }]);
    // The same time twice overlaps.
    expect(slotProblems([{ start: "10:00", end: "13:00" }, { start: "10:00", end: "13:00" }])).toEqual([null, { kind: "overlap", with: 0 }]);
    // The end before the start, or not a time; an empty row is no problem.
    expect(slotProblems([{ start: "13:00", end: "10:00" }, { start: "1pm", end: "15:00" }, { start: "", end: "" }])).toEqual([{ kind: "order" }, { kind: "order" }, null]);
  });

  it("saves a day with a break, sorted, and refuses overlapping times in plain words", () => {
    const base = { enabled: "on", maxDays: "7", timezone: "Africa/Cairo" };
    const ok = parseDeliveryForm({ ...base, slotStart0: "16:00", slotEnd0: "21:00", slotStart1: "10:00", slotEnd1: "13:00" }, null);
    expect(ok.ok && ok.value.slots.map((s) => `${s.start}–${s.end}`)).toEqual(["10:00–13:00", "16:00–21:00"]);
    const bad = parseDeliveryForm({ ...base, slotStart0: "10:00", slotEnd0: "13:00", slotStart1: "12:00", slotEnd1: "15:00" }, null);
    expect(bad).toEqual({ ok: false, errors: { slot1: "This time overlaps 10:00–13:00: let one end before the next starts." } });
    // The message is one the dashboard translates.
    expect(en.known.slotOverlap.replace("{other}", "10:00–13:00")).toBe((bad as { errors: Record<string, string> }).errors.slot1);
    expect(ar.known.slotOverlap).toContain("{other}");
    expect(tr.known.slotOverlap).toContain("{other}");
  });
});

describe("132.186 every country", () => {
  it("lists all 249 ISO 3166-1 countries, the platform's first ones on top", () => {
    expect(ISO_COUNTRIES).toHaveLength(249);
    expect(new Set(ISO_COUNTRIES).size).toBe(249);
    for (const lang of ["en", "ar", "tr"]) {
      const list = countryChoices(lang);
      expect(list).toHaveLength(249);
      expect(list.slice(0, FIRST_COUNTRIES.length).map((c) => c.code)).toEqual(["TR", "EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO"]);
      expect(list.slice(0, FIRST_COUNTRIES.length).every((c) => c.first)).toBe(true);
      // Every one has a name, not its code.
      expect(list.filter((c) => c.name === c.code)).toEqual([]);
    }
    // The rest A–Z in the language.
    const rest = countryChoices("en").slice(FIRST_COUNTRIES.length).map((c) => c.name);
    expect(rest[0]).toBe("Afghanistan");
  });

  it("names each country in the dashboard's language, keeping the short names the app showed", () => {
    expect(countryNameIn("BR", "en")).toBe("Brazil");
    expect(countryNameIn("BR", "ar")).toBe("البرازيل");
    expect(countryNameIn("BR", "tr")).toBe("Brezilya");
    expect(countryNameIn("JO", "ar")).toBe("الأردن");
    expect(countryNames("SA")).toEqual({ en: "Saudi Arabia", ar: "السعودية", tr: "Suudi Arabistan" });
    expect(countryNames("TR").en).toBe("Turkey");
    // A language without names: English.
    expect(countryNameIn("DE", "zz-unknown")).toBe("Germany");
    expect(isoCountry(" br ")).toBe("BR");
    expect(isoCountry("ZZ")).toBeNull();
  });
});

describe("132.186 where it delivers, any country with the owner's own cities", () => {
  it("saves any country, each with its cities and their own prices", () => {
    expect(SHIPPING_LIMITS.countries).toBeGreaterThanOrEqual(249);
    const parsed = parseShippingForm({ areasScope: "some", country0: "BR", cities0: "São Paulo\nRio de Janeiro", cityPrices0: "São Paulo: 40", country1: "jp", allCities1: "on", cityPrices1: "Tokyo: 90", shippingMode: "flat" });
    expect(parsed).toMatchObject({
      ok: true,
      value: {
        areas: [
          { country: "BR", cities: ["São Paulo", "Rio de Janeiro"] },
          { country: "JP", cities: null },
        ],
        cityPrices: [
          { country: "BR", city: "São Paulo", cents: 4000 },
          { country: "JP", city: "Tokyo", cents: 9000 },
        ],
      },
    });
    // The checkout takes that country, and the city's own price.
    const rules = shippingRulesOf({ ...DEFAULT_CATALOG_SETTINGS, shippingCents: 2500, ...(parsed.ok ? parsed.value : {}) });
    expect(quoteShipping(rules, { subtotalCents: 10_000, physical: true, place: { country: "JP", city: "Osaka", lat: null, lng: null } })).toMatchObject({ ok: true, cents: 2500 });
    expect(quoteShipping(rules, { subtotalCents: 10_000, physical: true, place: { country: "JP", city: "Tokyo", lat: null, lng: null } })).toMatchObject({ ok: true, cents: 9000 });
    expect(quoteShipping(rules, { subtotalCents: 10_000, physical: true, place: { country: "BR", city: "Recife", lat: null, lng: null } })).toMatchObject({ ok: false, code: "outside_delivery_area" });
    // The app reads its name in the language asked.
    expect(shippingConfigJson(rules, "TRY", "ar", true).countries).toEqual([
      { code: "BR", name: "البرازيل", cities: ["São Paulo", "Rio de Janeiro"] },
      { code: "JP", name: "اليابان", cities: null },
    ]);
  });

  it("saves every country as no limit, and asks for a country when only some are chosen", () => {
    const all = parseShippingForm({ areasScope: "all", cityPrices: "Berlin: 30", shippingMode: "flat" });
    expect(all).toMatchObject({ ok: true, value: { areas: [], cityPrices: [{ country: "", city: "Berlin", cents: 3000 }] } });
    const rules = shippingRulesOf({ ...DEFAULT_CATALOG_SETTINGS, shippingCents: 2500, ...(all.ok ? all.value : {}) });
    expect(quoteShipping(rules, { subtotalCents: 1000, physical: true, place: { country: "MX", city: "Monterrey", lat: null, lng: null } })).toMatchObject({ ok: true, cents: 2500 });
    expect(parseShippingForm({ areasScope: "some", shippingMode: "flat" })).toEqual({ ok: false, errors: { areas: "Choose at least one country, or deliver to every country." } });
    expect(parseShippingForm({ areasScope: "some", country0: "ZZ", shippingMode: "flat" })).toEqual({ ok: false, errors: { country0: "Choose a country." } });
    expect(parseShippingForm({ areasScope: "some", country0: "EG", cityPrices0: "Cairo: lots", shippingMode: "flat" })).toEqual({ ok: false, errors: { cityPrices0: "Enter the price of Cairo like 50, or leave it empty." } });
  });

  it("reads a country past the old limit of 20", () => {
    const v: Record<string, string> = { areasScope: "some", shippingMode: "flat" };
    ISO_COUNTRIES.slice(0, 60).forEach((code, i) => (v[`country${i}`] = code));
    const parsed = parseShippingForm(v);
    expect(parsed.ok && parsed.value.areas).toHaveLength(60);
  });
});
