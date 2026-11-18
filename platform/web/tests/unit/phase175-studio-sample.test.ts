import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GiftCheckout } from "@/components/studio/gift-checkout";
import { ShopSampleProvider } from "@/components/studio/shop-sample";
import { startingCatalogSettings } from "@/lib/app/country-defaults";
import { newApp } from "@/lib/app/setup";
import type { App } from "@/lib/data/types";
import { ratesOf } from "@/lib/money/rates";
import { shopSampleOf } from "@/lib/studio/shop-sample";
import type { ShopSample } from "@/lib/studio/shop-sample-types";

/**
 * 175 Studio's gift checkout sample (report #6) in the shop's currency,
 * dated from today in its time zone, in its country and city; the
 * sample's own (E£, 15 Nov, Cairo) only without a shop.
 */

// 18 November 2026, 23:30 in Casablanca (UTC+1): still the 18th there, so tomorrow is the 19th.
const NOW = new Date("2026-11-18T22:30:00Z");
// Units per dollar: 1 EGP = 0.2 MAD.
const rates = ratesOf({ date: "2026-11-18", rates: { EGP: 50, MAD: 10 }, fetchedAt: NOW.toISOString(), source: "test" } as never, null);
const owner = { whatsapp: "+212 612 345 678" };

function kech(patch: Partial<App> = {}): App {
  return { ...newApp("c1", null, NOW, "store", null), connector: { kind: "catalog" }, catalogSettings: startingCatalogSettings(owner), ...patch };
}

const draw = (sample: ShopSample | null, lang = "en") =>
  renderToStaticMarkup(createElement(ShopSampleProvider, { value: sample }, createElement(GiftCheckout, { look: { mode: "gift" }, dark: false, lang, brand: "#9C2F52", photo: null, top: 0 })));

describe("175 Studio's gift checkout sample as the shop's", () => {
  it("the shop's currency, country, city and tomorrow", () => {
    const sample = shopSampleOf(kech(), owner, rates, NOW)!;
    expect(sample).toEqual({ currency: "MAD", rate: 0.2, country: { en: "Morocco", ar: "المغرب", tr: "Fas" }, city: { en: "Casablanca", ar: "الدار البيضاء", tr: "Kazablanka" }, tomorrow: "2026-11-19" });
    // Its delivery area first.
    const marrakech = shopSampleOf(kech({ catalogSettings: { ...startingCatalogSettings(owner), areas: [{ country: "MA", cities: ["Marrakech"] }] } }), owner, rates, NOW)!;
    expect(marrakech.city).toEqual({ en: "Marrakech", ar: "Marrakech", tr: "Marrakech" });
    // Not a shop: none.
    expect(shopSampleOf({ ...kech(), connector: null } as App, owner, rates, NOW)).toBeNull();
  });

  it("drawn in dirhams, dated tomorrow, in Morocco; never E£", () => {
    const html = draw(shopSampleOf(kech(), owner, rates, NOW));
    expect(html).not.toContain("E£");
    expect(html).not.toContain("15 Nov");
    expect(html).not.toContain("Cairo");
    expect(html).toContain("Tomorrow, 19 Nov");
    expect(html).toContain("Morocco");
    expect(html).toContain("Casablanca");
    // E£ 2,100 at 0.2: MAD 420.
    expect(html).toMatch(/MAD\s?420\.00/);
    expect(html).toMatch(/Pay MAD\s?515\.00/);
    const ar = draw(shopSampleOf(kech(), owner, rates, NOW), "ar");
    expect(ar).toContain("المغرب");
    expect(ar).toContain("غدًا، 19 نوفمبر");
    expect(ar).not.toContain("ج.م");
  });

  it("without a rate the numbers are kept, in the shop's currency", () => {
    const html = draw(shopSampleOf(kech(), owner, ratesOf(null, null), NOW));
    expect(html).toMatch(/MAD\s?2,100\.00/);
  });

  it("without a shop, the sample's own", () => {
    const html = draw(null);
    expect(html).toContain("E£ 2,100");
    expect(html).toContain("Tomorrow, 15 Nov");
  });
});
