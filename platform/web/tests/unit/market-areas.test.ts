import { describe, expect, it } from "vitest";
import type { DeliverySettings, MarketServiceArea, OpeningPeriod, Restaurant, VendorDelivery } from "@/lib/data/types";
import { checkDeliveryArea, LEGACY_VENDOR_KM, parseServiceAreaForm, parseVendorAreaForm, vendorAreaFormValues, vendorAreaOf, vendorAreaWarning } from "@/lib/market/areas";
import { quoteMarketDelivery, type MarketVendor } from "@/lib/market/delivery";
import { vendorSummaryJson } from "@/lib/market/json";
import { DEFAULT_MARKET_SETTINGS } from "@/lib/market/settings";

/**
 * 115 Where a marketplace delivers: every place by distance or by area, the
 * owner's marketplace open everywhere or kept to its named areas, places
 * saved before areas taken as 10 km, and places off the map not delivering
 * by distance.
 */

const NOW = new Date("2026-10-14T07:00:00Z");
const EVERY_DAY: OpeningPeriod[] = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((day) => ({ day, opens: "00:00", closes: "23:59" }));

// Dokki, and places around it.
const DOKKI = { lat: 30.0384, lng: 31.2108 };
const GARDEN_CITY = { lat: 30.0349, lng: 31.2316 }; // About 2 km from Dokki.
const MAADI = { lat: 29.96, lng: 31.25 }; // About 9.5 km.
const NEW_CAIRO = { lat: 30.03, lng: 31.47 }; // About 25 km.
const ISTANBUL = { lat: 41.0082, lng: 28.9784 }; // About 1,200 km.

const AREAS: MarketServiceArea[] = [
  { id: "dokki", name: "Dokki", lat: 30.0384, lng: 31.2108, km: 2.5 },
  { id: "zamalek", name: "Zamalek", lat: 30.0626, lng: 31.2197, km: 2 },
  { id: "maadi", name: "Maadi", lat: 29.96, lng: 31.25, km: 3 },
];

const settings = (areas?: MarketServiceArea[], patch: Partial<DeliverySettings> = {}): DeliverySettings =>
  ({
    currency: "EGP", pricing: "fixed", fixedCents: 2500, baseCents: 0, perKmCents: 0, minCents: 0, maxKm: null, zones: [], cash: true, card: false,
    tracking: "live", assignment: "open", courierApp: "same", timezone: "Africa/Cairo",
    marketApp: { ...DEFAULT_MARKET_SETTINGS, ...(areas ? { serviceAreas: areas } : {}) }, ...patch,
  }) as DeliverySettings;

const own: VendorDelivery = { by: "vendor", feeKind: "fixed", fee: 2000, perKm: 0, freeOver: null, minItems: null, maxItems: null, pickup: true, scheduling: false };
const vendor = (patch: Partial<MarketVendor> = {}): MarketVendor => ({
  address: { address: "Tahrir Street, Dokki", details: null, ...DOKKI }, maxKm: 6, deliveryAreas: null, minOrderCents: 0, prepMinutes: 20, hours: EVERY_DAY, busyUntil: null, active: true, delivery: null, ...patch,
});
const at = (p: { lat: number; lng: number }) => ({ address: "Home", details: null, ...p });
const deliver = (s: DeliverySettings, v: MarketVendor, p: { lat: number; lng: number }) => quoteMarketDelivery(s, v, { fulfilment: "delivery", dropoff: at(p), items: 20000, itemCount: 2 }, NOW);

describe("115 where a marketplace delivers", () => {
  it("by distance: inside the place's radius only, with the app's couriers or its own", () => {
    for (const delivery of [null, own]) {
      expect(deliver(settings(), vendor({ delivery }), GARDEN_CITY)).toMatchObject({ ok: true, fulfilment: "delivery" });
      expect(deliver(settings(), vendor({ delivery }), MAADI)).toMatchObject({ ok: false, refusal: "outside_area", field: "dropoff", limit: 6 });
    }
    expect(checkDeliveryArea(settings(), vendor({ maxKm: 12 }), MAADI)).toEqual({ ok: true });
    expect(checkDeliveryArea(settings(), vendor({ maxKm: 0.5 }), GARDEN_CITY)).toMatchObject({ ok: false, reason: "vendor" });
  });

  it("never a time for a customer far away: 1,200 km is outside, with no time and no fee", () => {
    const q = deliver(settings(), vendor({ maxKm: null }), ISTANBUL);
    expect(q).toMatchObject({ ok: false, refusal: "outside_area" });
    if (!q.ok) expect(q.error).toMatch(/up to 10 km/);
    const card = vendorSummaryJson({ ...vendor(), id: 1, appId: "a", name: "Nile Pizza Co.", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], phone: null, commissionBp: 0, ratingSum: 0, ratingCount: 0, position: 1, createdAt: NOW, updatedAt: NOW } as Restaurant, { open: true, opensAt: null, busy: false, distanceKm: 1200, delivers: false, deliveryFee: 2500, minutes: 2914, offer: null, clubBenefit: null }, "EGP", (id) => id);
    expect(card).toMatchObject({ delivers: false, delivery_minutes: null, delivery_fee: null });
  });

  it("pick-up stays open outside the area when the place offers it", () => {
    expect(quoteMarketDelivery(settings(), vendor({ delivery: own }), { fulfilment: "pickup", dropoff: null, items: 20000, itemCount: 2 }, NOW)).toMatchObject({ ok: true, fulfilment: "pickup" });
  });

  it("places saved before areas: 10 km from their address, and asked to set their area", () => {
    const legacy = vendor({ maxKm: null });
    expect(vendorAreaOf(legacy, [])).toEqual({ kind: "km", km: LEGACY_VENDOR_KM, legacy: true });
    expect(LEGACY_VENDOR_KM).toBe(10);
    expect(checkDeliveryArea(settings(), legacy, MAADI)).toEqual({ ok: true });
    expect(checkDeliveryArea(settings(), legacy, NEW_CAIRO)).toMatchObject({ ok: false, reason: "vendor", limit: 10 });
    expect(vendorAreaWarning(legacy, [])).toBe("set_area");
    expect(vendorAreaWarning(vendor(), [])).toBeNull();
  });

  it("a place off the map can't deliver by distance, and is told so where it's edited", () => {
    const lost = vendor({ address: { address: "Somewhere", details: null, lat: null, lng: null } });
    expect(checkDeliveryArea(settings(), lost, GARDEN_CITY)).toMatchObject({ ok: false, reason: "no_position" });
    expect(deliver(settings(), lost, GARDEN_CITY)).toMatchObject({ ok: false, refusal: "outside_area" });
    expect(vendorAreaWarning(lost, [])).toBe("no_position");
    // By area it needs no distance.
    const byArea = { ...lost, deliveryAreas: ["dokki"], maxKm: null };
    expect(checkDeliveryArea(settings(AREAS), byArea, GARDEN_CITY)).toEqual({ ok: true });
    expect(vendorAreaWarning(byArea, AREAS)).toBeNull();
  });

  it("by area: inside one of the owner's areas it chose", () => {
    const v = vendor({ maxKm: null, deliveryAreas: ["dokki", "zamalek"] });
    expect(vendorAreaOf(v, AREAS)).toMatchObject({ kind: "areas", areas: [{ id: "dokki" }, { id: "zamalek" }] });
    expect(deliver(settings(AREAS), v, GARDEN_CITY)).toMatchObject({ ok: true });
    // Maadi is one of the marketplace's areas, not one of the place's.
    expect(deliver(settings(AREAS), v, MAADI)).toMatchObject({ ok: false, refusal: "outside_area", error: "This place delivers to Dokki, Zamalek only." });
    // Its areas all removed by the owner: 10 km, and asked to set its area again.
    expect(vendorAreaOf(v, AREAS.filter((a) => a.id === "maadi"))).toEqual({ kind: "km", km: 10, legacy: true });
    expect(vendorAreaWarning(v, [])).toBe("set_area");
  });

  it("the owner: open everywhere without named areas, else outside all of them is outside every place", () => {
    const wide = vendor({ maxKm: 2000 });
    expect(checkDeliveryArea(settings(), wide, ISTANBUL)).toEqual({ ok: true });
    expect(checkDeliveryArea(settings([]), wide, NEW_CAIRO)).toEqual({ ok: true });
    expect(checkDeliveryArea(settings(AREAS), wide, NEW_CAIRO)).toMatchObject({ ok: false, reason: "marketplace" });
    expect(deliver(settings(AREAS), wide, MAADI)).toMatchObject({ ok: true });
    // The owner's furthest distance for its couriers (pricing by distance) still applies.
    expect(deliver(settings(undefined, { pricing: "distance", baseCents: 1500, perKmCents: 500, maxKm: 5 }), vendor({ maxKm: 2000 }), MAADI)).toMatchObject({ ok: false, refusal: "outside_area" });
  });

  it("the place's form: a radius or areas, always one of them", () => {
    expect(parseVendorAreaForm({}, AREAS)).toMatchObject({ ok: false, field: "area_kind" });
    expect(parseVendorAreaForm({ area_kind: "km", area_km: "" }, AREAS)).toMatchObject({ ok: false, field: "area_km" });
    expect(parseVendorAreaForm({ area_kind: "km", area_km: "0.2" }, AREAS)).toMatchObject({ ok: false, field: "area_km" });
    expect(parseVendorAreaForm({ area_kind: "km", area_km: "2001" }, AREAS)).toMatchObject({ ok: false, field: "area_km" });
    expect(parseVendorAreaForm({ area_kind: "km", area_km: "7,5" }, AREAS)).toEqual({ ok: true, value: { maxKm: 7.5, deliveryAreas: null } });
    expect(parseVendorAreaForm({ area_kind: "areas" }, AREAS)).toMatchObject({ ok: false, error: "Choose at least one area it delivers to." });
    expect(parseVendorAreaForm({ area_kind: "areas", "area-dokki": "on", "area-gone": "on" }, AREAS)).toEqual({ ok: true, value: { maxKm: null, deliveryAreas: ["dokki"] } });
    // No areas named: by area isn't a choice.
    expect(parseVendorAreaForm({ area_kind: "areas", "area-dokki": "on" }, [])).toMatchObject({ ok: false, field: "area_kind" });
    // Shown again: a legacy place's radius starts empty, so it must be typed.
    expect(vendorAreaFormValues({ maxKm: null, deliveryAreas: null }, AREAS)).toEqual({ area_kind: "km", area_km: "" });
    expect(vendorAreaFormValues({ maxKm: 6, deliveryAreas: null }, AREAS)).toEqual({ area_kind: "km", area_km: "6" });
    expect(vendorAreaFormValues({ maxKm: null, deliveryAreas: ["zamalek"] }, AREAS)).toEqual({ area_kind: "areas", area_km: "", "area-zamalek": "on" });
  });

  it("the owner's form: a name, a centre on the map and a radius", () => {
    const id = () => "new";
    expect(parseServiceAreaForm({ area_name: "Garden City", area_map: "https://www.google.com/maps/@30.0349,31.2316,15z", area_radius: "1.5" }, AREAS, id)).toEqual({
      ok: true,
      value: { id: "new", name: "Garden City", lat: 30.0349, lng: 31.2316, km: 1.5 },
    });
    expect(parseServiceAreaForm({ area_name: "dokki", area_map: "30.04, 31.21", area_radius: "2" }, AREAS, id)).toMatchObject({ ok: false, field: "area_name" });
    expect(parseServiceAreaForm({ area_name: "Agouza", area_map: "nowhere", area_radius: "2" }, AREAS, id)).toMatchObject({ ok: false, field: "area_map" });
    expect(parseServiceAreaForm({ area_name: "Agouza", area_map: "30.06, 31.21", area_radius: "0" }, AREAS, id)).toMatchObject({ ok: false, field: "area_radius" });
  });
});
