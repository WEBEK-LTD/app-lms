import { centsToDecimal, formatCents, parsePrice } from "../catalog/money";
import { distanceKm } from "../delivery/pricing";
import type { CatalogCurrency, CatalogSettings, DeliveryArea, DistancePricing, WeightPricing } from "../data/types";

/**
 * 131 Where a store delivers and what shipping costs, for every store app
 * (it extends the shop's flat shipping, `shippingCents` and
 * `freeShippingOverCents`, and doesn't replace it):
 *
 * - the areas: one country or several, each with all its cities or some;
 *   the app's checkout takes an address only there, the city from a list
 *   when the owner chose cities;
 * - the price, in one of three modes: `flat` one price everywhere (as
 *   before), `city` a price per city with one for the other allowed cities,
 *   or `distance` a base fee plus a price per km, straight-line from the
 *   shop's location to the pin the customer drops on the map (no paid
 *   geocoding: lib/delivery/pricing.ts `distanceKm`), at least a minimum
 *   fee and up to a distance; free from an order total in every mode. A
 *   city's own price is an override in every mode: it wins over the rule.
 *
 * - by weight, in any mode: a price per kg of the order's products (and
 *   their options) over the first kg included.
 *
 * There is no country and city data in the platform, so cities are the
 * owner's own names (free entry), with a starter list for the countries the
 * platform serves first (Turkey, Egypt and the Gulf) to pick from.
 */

export const SHIPPING_LIMITS = { countries: 20, cities: 200, city: 60, feeCents: 100_000_00, km: 2000 } as const;
export type ShippingMode = "flat" | "city" | "distance";

/** The countries offered in the form, with their names; any other ISO code can be typed. */
export const SHIPPING_COUNTRIES: Record<string, { en: string; ar: string; tr: string }> = {
  TR: { en: "Turkey", ar: "تركيا", tr: "Türkiye" },
  EG: { en: "Egypt", ar: "مصر", tr: "Mısır" },
  SA: { en: "Saudi Arabia", ar: "السعودية", tr: "Suudi Arabistan" },
  AE: { en: "United Arab Emirates", ar: "الإمارات", tr: "Birleşik Arap Emirlikleri" },
  KW: { en: "Kuwait", ar: "الكويت", tr: "Kuveyt" },
  QA: { en: "Qatar", ar: "قطر", tr: "Katar" },
  BH: { en: "Bahrain", ar: "البحرين", tr: "Bahreyn" },
  OM: { en: "Oman", ar: "عُمان", tr: "Umman" },
};

/** The starter cities: the largest of each country, in the language the owner writes in. */
export const STARTER_CITIES: Record<string, { en: string; ar: string; tr: string }[]> = {
  TR: [
    { en: "Istanbul", ar: "إسطنبول", tr: "İstanbul" },
    { en: "Ankara", ar: "أنقرة", tr: "Ankara" },
    { en: "Izmir", ar: "إزمير", tr: "İzmir" },
    { en: "Bursa", ar: "بورصة", tr: "Bursa" },
    { en: "Antalya", ar: "أنطاليا", tr: "Antalya" },
    { en: "Konya", ar: "قونية", tr: "Konya" },
    { en: "Gaziantep", ar: "غازي عنتاب", tr: "Gaziantep" },
    { en: "Kocaeli", ar: "كوجالي", tr: "Kocaeli" },
  ],
  EG: [
    { en: "Cairo", ar: "القاهرة", tr: "Kahire" },
    { en: "Giza", ar: "الجيزة", tr: "Giza" },
    { en: "Alexandria", ar: "الإسكندرية", tr: "İskenderiye" },
    { en: "New Cairo", ar: "القاهرة الجديدة", tr: "Yeni Kahire" },
    { en: "6th of October", ar: "السادس من أكتوبر", tr: "6 Ekim" },
    { en: "Sheikh Zayed", ar: "الشيخ زايد", tr: "Şeyh Zayed" },
    { en: "Mansoura", ar: "المنصورة", tr: "Mansura" },
    { en: "Tanta", ar: "طنطا", tr: "Tanta" },
  ],
  SA: [
    { en: "Riyadh", ar: "الرياض", tr: "Riyad" },
    { en: "Jeddah", ar: "جدة", tr: "Cidde" },
    { en: "Mecca", ar: "مكة المكرمة", tr: "Mekke" },
    { en: "Medina", ar: "المدينة المنورة", tr: "Medine" },
    { en: "Dammam", ar: "الدمام", tr: "Dammam" },
    { en: "Khobar", ar: "الخبر", tr: "Hubar" },
  ],
  AE: [
    { en: "Dubai", ar: "دبي", tr: "Dubai" },
    { en: "Abu Dhabi", ar: "أبوظبي", tr: "Abu Dabi" },
    { en: "Sharjah", ar: "الشارقة", tr: "Şarika" },
    { en: "Ajman", ar: "عجمان", tr: "Acman" },
    { en: "Al Ain", ar: "العين", tr: "El Ayn" },
  ],
  KW: [
    { en: "Kuwait City", ar: "مدينة الكويت", tr: "Kuveyt" },
    { en: "Hawalli", ar: "حولي", tr: "Havalli" },
    { en: "Salmiya", ar: "السالمية", tr: "Salmiye" },
  ],
  QA: [
    { en: "Doha", ar: "الدوحة", tr: "Doha" },
    { en: "Al Rayyan", ar: "الريان", tr: "Er-Reyyan" },
    { en: "Al Wakrah", ar: "الوكرة", tr: "El Vekre" },
  ],
  BH: [
    { en: "Manama", ar: "المنامة", tr: "Manama" },
    { en: "Muharraq", ar: "المحرق", tr: "Muharrak" },
  ],
  OM: [
    { en: "Muscat", ar: "مسقط", tr: "Maskat" },
    { en: "Salalah", ar: "صلالة", tr: "Salala" },
    { en: "Sohar", ar: "صحار", tr: "Suhar" },
  ],
};

/** The same city however it is typed: case, spaces and Turkish dotted letters don't matter. */
export function sameCity(a: string, b: string): boolean {
  // Accents and the Turkish dotted and dotless i fold away ("İstanbul", "Istanbul", "istanbul"; "Kadıköy", "Kadikoy").
  const norm = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/ı/g, "i")
      .replace(/\s+/g, " ")
      .trim();
  return norm(a) === norm(b);
}

export interface ShippingRules {
  mode: ShippingMode;
  areas: DeliveryArea[];
  flatCents: number;
  freeOverCents: number | null;
  cityPrices: { country: string; city: string; cents: number }[];
  otherCityCents: number | null;
  distance: DistancePricing | null;
  weight: WeightPricing | null;
  minCents: number | null;
}

/** The shop's shipping rules, from its settings (flat and anywhere until changed). */
export function shippingRulesOf(
  s: Pick<CatalogSettings, "shippingCents" | "freeShippingOverCents" | "areas" | "shippingMode" | "cityPrices" | "otherCityCents" | "distancePricing" | "weightPricing" | "shippingMinCents">,
): ShippingRules {
  const mode: ShippingMode = s.shippingMode === "city" || (s.shippingMode === "distance" && s.distancePricing) ? s.shippingMode : "flat";
  return {
    mode,
    areas: s.areas ?? [],
    flatCents: s.shippingCents,
    freeOverCents: s.freeShippingOverCents,
    cityPrices: s.cityPrices ?? [],
    otherCityCents: s.otherCityCents ?? null,
    distance: s.distancePricing ?? null,
    weight: s.weightPricing ?? null,
    minCents: s.shippingMinCents ?? null,
  };
}

/** Whether the shop asks where an order goes: it delivers to some areas only, or prices by city or distance. */
export function needsPlace(r: ShippingRules): boolean {
  return r.areas.length > 0 || r.mode !== "flat" || r.cityPrices.length > 0;
}

/** The place an order goes, as the app sends it (`recipient` or `delivery_address`: `country`, `city`, `lat`, `lng`). */
export function placeOf(value: unknown): { country: string | null; city: string | null; lat: number | null; lng: number | null } {
  const v = (value && typeof value === "object" ? value : {}) as { country?: unknown; city?: unknown; lat?: unknown; lng?: unknown };
  const country = typeof v.country === "string" && /^[A-Za-z]{2}$/.test(v.country.trim()) ? v.country.trim().toUpperCase() : null;
  const city = typeof v.city === "string" && v.city.trim() !== "" ? v.city.replace(/\s+/g, " ").trim().slice(0, SHIPPING_LIMITS.city) : null;
  const lat = typeof v.lat === "number" && Number.isFinite(v.lat) && Math.abs(v.lat) <= 90 ? v.lat : null;
  const lng = typeof v.lng === "number" && Number.isFinite(v.lng) && Math.abs(v.lng) <= 180 ? v.lng : null;
  return { country, city, lat: lat !== null && lng !== null ? lat : null, lng: lat !== null && lng !== null ? lng : null };
}

/**
 * Which rule priced it (and each part of the breakdown): a city's own price, the
 * flat price, the distance, the other cities' price, the weight, the minimum fee, or
 * free over the threshold.
 */
export type ShippingRule = "city" | "flat" | "distance" | "other_city" | "weight" | "minimum" | "free";
type ShippingLine = { label: string; cents: number; rule: ShippingRule };

export type ShippingQuote =
  | { ok: true; cents: number; zone: string | null; km: number | null; rule: ShippingRule; breakdown: ShippingLine[] }
  | { ok: false; code: "outside_delivery_area" | "invalid_request"; field: "country" | "city" | "location"; message: string };

/** "2.5 kg". */
export function kgLabel(grams: number): string {
  return `${Math.round(grams / 100) / 10} kg`;
}

/**
 * What shipping costs for an order going to `place`, weighing
 * `weightGrams` (its products' and their options' weights).
 *
 * fee = the base (the flat price; `city`: the other cities' price;
 * `distance`: its base fee) + the km × the price per km (`distance`) + the
 * kg over the included ones × the price per kg (weight pricing, in any
 * mode), at least the minimum fee, and nothing from the free-delivery
 * total. A city with its own price takes that price instead of the whole
 * computed fee (an override: "Istanbul costs 50" reads simply, whatever the
 * distance or the weight); the free-delivery total still applies to it.
 * The slot's fee comes on top (lib/selling/delivery.ts). `physical`: only
 * products that ship pay it. Every message is for the customer.
 */
export function quoteShipping(
  r: ShippingRules,
  input: { subtotalCents: number; physical: boolean; place: ReturnType<typeof placeOf> | null; weightGrams?: number },
): ShippingQuote {
  const place = input.place ?? { country: null, city: null, lat: null, lng: null };
  // Where it goes, when the shop delivers to some places only.
  let city: string | null = place.city;
  if (r.areas.length > 0) {
    if (!place.country) return { ok: false, code: "invalid_request", field: "country", message: "Choose the country it goes to." };
    const area = r.areas.find((a) => a.country === place.country);
    if (!area) return { ok: false, code: "outside_delivery_area", field: "country", message: "The shop doesn't deliver to that country." };
    if (area.cities) {
      if (!place.city) return { ok: false, code: "invalid_request", field: "city", message: "Choose the city it goes to." };
      const allowed = area.cities.find((c) => sameCity(c, place.city!));
      if (!allowed) return { ok: false, code: "outside_delivery_area", field: "city", message: "The shop doesn't deliver to that city." };
      city = allowed;
    }
  }
  if (!input.physical) return { ok: true, cents: 0, zone: city, km: null, rule: "flat", breakdown: [] };
  const free = r.freeOverCents !== null && input.subtotalCents >= r.freeOverCents;
  const done = (cents: number, rule: ShippingRule, zone: string | null, km: number | null, breakdown: ShippingLine[]): ShippingQuote =>
    free ? { ok: true, cents: 0, zone, km, rule: "free", breakdown: [{ label: "Free delivery", cents: 0, rule: "free" }] } : { ok: true, cents, zone, km, rule, breakdown };
  // A city's own price wins over the computed fee.
  const own = place.city ? r.cityPrices.find((p) => (!place.country || !p.country || p.country === place.country) && sameCity(p.city, place.city!)) : undefined;
  if (own) return done(own.cents, "city", own.city, null, [{ label: own.city, cents: own.cents, rule: "city" }]);

  const lines: ShippingLine[] = [];
  let rule: ShippingRule = r.mode === "distance" ? "distance" : r.mode === "city" ? "other_city" : "flat";
  let km: number | null = null;
  let zone: string | null = city;
  switch (r.mode) {
    case "flat":
      if (r.flatCents > 0) lines.push({ label: "Delivery", cents: r.flatCents, rule: "flat" });
      break;
    case "city":
      if (!place.city) return { ok: false, code: "invalid_request", field: "city", message: "Choose the city it goes to." };
      if (r.otherCityCents === null) return { ok: false, code: "outside_delivery_area", field: "city", message: "The shop doesn't deliver to that city." };
      lines.push({ label: city ?? "Delivery", cents: r.otherCityCents, rule: "other_city" });
      break;
    case "distance": {
      const d = r.distance!;
      if (place.lat === null || place.lng === null) return { ok: false, code: "invalid_request", field: "location", message: "Drop a pin where it goes on the map." };
      km = distanceKm(d.origin, { lat: place.lat, lng: place.lng });
      if (d.maxKm !== null && km > d.maxKm) return { ok: false, code: "outside_delivery_area", field: "location", message: `The shop delivers up to ${d.maxKm} km away. This place is ${km} km away.` };
      if (d.baseCents > 0) lines.push({ label: "Base fee", cents: d.baseCents, rule: "distance" });
      lines.push({ label: `${km} km`, cents: Math.round(d.perKmCents * km), rule: "distance" });
      zone = city ? `${city} · ${km} km` : `${km} km`;
      break;
    }
  }
  // The order's weight over the included kg, in any mode.
  if (r.weight && r.weight.perKgCents > 0) {
    const grams = Math.max(0, input.weightGrams ?? 0);
    const over = Math.max(0, grams - Math.round(r.weight.includedKg * 1000));
    lines.push({ label: r.weight.includedKg > 0 ? `${kgLabel(grams)} (${r.weight.includedKg} kg included)` : kgLabel(grams), cents: Math.round((r.weight.perKgCents * over) / 1000), rule: "weight" });
    if (r.mode === "flat" && r.flatCents === 0) rule = "weight";
  }
  const raw = lines.reduce((sum, l) => sum + l.cents, 0);
  if (r.minCents !== null && raw < r.minCents) lines.push({ label: "Minimum fee", cents: r.minCents - raw, rule: "minimum" });
  return done(Math.max(raw, r.minCents ?? 0), rule, zone, km, lines);
}

const money = (cents: number, currency: string) => formatCents(cents, currency as CatalogCurrency);

/** `StoreConfig.shipping`: where the shop delivers and how it prices it (the quote computes the fee). */
export function shippingConfigJson(r: ShippingRules, currency: string, lang: string, charged: boolean) {
  const name = (code: string) => (SHIPPING_COUNTRIES[code] as Record<string, string> | undefined)?.[lang] ?? SHIPPING_COUNTRIES[code]?.en ?? code;
  return {
    mode: r.mode,
    countries: r.areas.map((a) => ({ code: a.country, name: name(a.country), cities: a.cities })),
    needs_location: r.mode === "distance",
    // Where Yallapp checks out the fee is charged; on a connected platform's checkout, its own shipping is.
    charged,
    free_over: r.freeOverCents !== null ? centsToDecimal(r.freeOverCents) : null,
    free_over_formatted: r.freeOverCents !== null ? money(r.freeOverCents, currency) : null,
    max_km: r.mode === "distance" ? (r.distance?.maxKm ?? null) : null,
  };
}

/** The quote's `shipping_breakdown`: each part with the rule that priced it. */
export function breakdownJson(lines: { label: string; cents: number; rule?: string }[], currency: string) {
  return lines.map((l) => ({ label: l.label, rule: l.rule ?? null, amount: centsToDecimal(l.cents), formatted: money(l.cents, currency) }));
}

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/**
 * The dashboard's Where you deliver form: `country{i}` and `cities{i}` (one
 * city per line, empty for all), the mode, `cityPrices` ("City: 50" per
 * line), the other cities' price and the distance fields.
 */
export function parseShippingForm(
  v: Record<string, string>,
): Parsed<Pick<CatalogSettings, "areas" | "shippingMode" | "cityPrices" | "otherCityCents" | "distancePricing" | "weightPricing" | "shippingMinCents">> {
  const errors: Record<string, string> = {};
  const areas: DeliveryArea[] = [];
  for (let i = 0; i < SHIPPING_LIMITS.countries; i += 1) {
    const code = (v[`country${i}`] ?? "").trim().toUpperCase();
    if (code === "") continue;
    if (!/^[A-Z]{2}$/.test(code)) {
      errors[`country${i}`] = "Choose a country.";
      continue;
    }
    if (areas.some((a) => a.country === code)) continue;
    const lines = (v[`cities${i}`] ?? "")
      .split(/\r?\n|,|،/)
      .map((c) => c.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const unique = lines.filter((c, n) => lines.findIndex((x) => sameCity(x, c)) === n);
    if (unique.length > SHIPPING_LIMITS.cities) errors[`cities${i}`] = `At most ${SHIPPING_LIMITS.cities} cities.`;
    else if (unique.some((c) => c.length > SHIPPING_LIMITS.city)) errors[`cities${i}`] = `A city's name can be at most ${SHIPPING_LIMITS.city} characters.`;
    areas.push({ country: code, cities: v[`allCities${i}`] === "on" || unique.length === 0 ? null : unique });
  }
  const mode: ShippingMode = v.shippingMode === "city" ? "city" : v.shippingMode === "distance" ? "distance" : "flat";
  const fee = (name: string, required: boolean): number | null => {
    const text = (v[name] ?? "").trim();
    if (text === "") {
      if (required) errors[name] = "Enter an amount, like 50.";
      return null;
    }
    const cents = parsePrice(text);
    if (cents === null || cents > SHIPPING_LIMITS.feeCents) {
      errors[name] = "Enter an amount, like 50.";
      return null;
    }
    return cents;
  };
  // A city's own price, in any mode (it wins over the mode's rule).
  const cityPrices: { country: string; city: string; cents: number }[] = [];
  {
    const lines = (v.cityPrices ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const m = /^(.+?)\s*[:=]\s*([\d.,]+)$/.exec(line);
      const cents = m ? parsePrice(m[2]!) : null;
      if (!m || cents === null) {
        errors.cityPrices = "Write one city a line with its price, like “Istanbul: 50”.";
        break;
      }
      const city = m[1]!.trim().slice(0, SHIPPING_LIMITS.city);
      const area = areas.find((a) => a.cities?.some((c) => sameCity(c, city))) ?? (areas.length === 1 ? areas[0] : undefined);
      cityPrices.push({ country: area?.country ?? "", city, cents });
    }
  }
  const otherCityCents = mode === "city" ? fee("otherCity", false) : null;
  let distancePricing: DistancePricing | null = null;
  if (mode === "distance") {
    const lat = Number((v.originLat ?? "").trim());
    const lng = Number((v.originLng ?? "").trim());
    if ((v.originLat ?? "").trim() === "" || !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) errors.origin = "Set your shop's location: its latitude and longitude.";
    const base = fee("baseFee", false) ?? 0;
    const perKm = fee("perKm", true) ?? 0;
    const maxText = (v.maxKm ?? "").trim();
    const maxKm = maxText === "" ? null : Number(maxText);
    if (maxKm !== null && (!Number.isFinite(maxKm) || maxKm <= 0 || maxKm > SHIPPING_LIMITS.km)) errors.maxKm = `Enter a distance up to ${SHIPPING_LIMITS.km} km, or leave it empty.`;
    distancePricing = { origin: { lat, lng }, baseCents: base, perKmCents: perKm, maxKm };
  }
  // By weight, in any mode.
  let weightPricing: WeightPricing | null = null;
  if (v.byWeight === "on") {
    const perKg = fee("perKg", true) ?? 0;
    const includedText = (v.includedKg ?? "").trim();
    const includedKg = includedText === "" ? 0 : Number(includedText.replace(",", "."));
    if (!Number.isFinite(includedKg) || includedKg < 0 || includedKg > 1000) errors.includedKg = "Enter the kg included, like 2, or leave it empty.";
    weightPricing = { perKgCents: perKg, includedKg: Number.isFinite(includedKg) ? Math.round(includedKg * 10) / 10 : 0 };
  }
  const shippingMinCents = fee("minFee", false);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { areas, shippingMode: mode, cityPrices: cityPrices.length ? cityPrices : null, otherCityCents, distancePricing, weightPricing, shippingMinCents } };
}
