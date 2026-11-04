import { describe, expect, it } from "vitest";
import type { DeliverySettings, OpeningPeriod, VendorDelivery } from "@/lib/data/types";
import { isSlotOpen, orderSlots, ownDeliveryFee, pickupCode, quoteMarketDelivery, vendorCourierCharge, type MarketVendor } from "@/lib/market/delivery";
import { parseCourierTermsForm, parseVendorDeliveryForm, vendorDeliveryFormValues } from "@/lib/market/delivery-forms";
import { priceOrder } from "@/lib/market/money";
import { buildStatement } from "@/lib/market/statement";
import { statementCsv } from "@/lib/market/statement-export";

// Wednesday 2026-10-14, 10:00 in Cairo (UTC+3).
const NOW = new Date("2026-10-14T07:00:00Z");
const EVERY_DAY: OpeningPeriod[] = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((day) => ({ day, opens: "09:00", closes: "23:00" }));

const settings = (patch: Partial<DeliverySettings> = {}): DeliverySettings =>
  ({
    currency: "EGP", pricing: "distance", fixedCents: 0, baseCents: 1500, perKmCents: 500, minCents: 2000, maxKm: 10, zones: [], cash: true, card: true,
    tracking: "live", assignment: "auto", courierApp: "same", timezone: "Africa/Cairo", ...patch,
  }) as DeliverySettings;

const own: VendorDelivery = { by: "vendor", feeKind: "per_km", fee: 1000, perKm: 400, freeOver: 50000, minItems: 2, maxItems: 30, pickup: true, scheduling: true };
const vendor = (patch: Partial<MarketVendor> = {}): MarketVendor => ({
  address: { address: "Maadi", details: null, lat: 29.96, lng: 31.25 }, maxKm: 5, minOrderCents: 10000, prepMinutes: 20, hours: EVERY_DAY, busyUntil: null, active: true, delivery: null, ...patch,
});
const near = { address: "Street 9", details: null, lat: 29.975, lng: 31.26 };
const far = { address: "Far", details: null, lat: 30.2, lng: 31.5 };

describe("115.5 delivery per vendor", () => {
  it("the app's couriers: the owner's prices and area, the vendor's charge, and the live map", () => {
    const q = quoteMarketDelivery(settings({ market: { customerFee: "delivery_prices", percent: 0, minFee: 0, maxFee: null, freeOver: null, vendorCharge: "percent", vendorChargeValue: 5 } }), vendor(), { fulfilment: "delivery", dropoff: near, items: 20000, itemCount: 3 }, NOW);
    expect(q).toMatchObject({ ok: true, by: "app", liveMap: "always", courierCharge: 1000 });
    if (!q.ok) throw new Error();
    expect(q.fee).toBe(Math.max(2000, 1500 + Math.round(500 * q.distanceKm!)));
    expect(q.minutes).toBeGreaterThan(20);
    // A percentage of the items, within the lowest and highest fee; free over an amount.
    const pct = quoteMarketDelivery(settings({ market: { customerFee: "percent", percent: 10, minFee: 1500, maxFee: 2500, freeOver: 60000, vendorCharge: "per_km", vendorChargeValue: 300 } }), vendor(), { fulfilment: "delivery", dropoff: near, items: 20000, itemCount: 3 }, NOW);
    expect(pct).toMatchObject({ ok: true, fee: 2000 });
    if (pct.ok) expect(pct.courierCharge).toBe(Math.round(300 * pct.distanceKm!));
    const free = quoteMarketDelivery(settings({ market: { customerFee: "percent", percent: 10, minFee: 1500, maxFee: 2500, freeOver: 60000, vendorCharge: "fixed", vendorChargeValue: 700 } }), vendor(), { fulfilment: "delivery", dropoff: near, items: 70000, itemCount: 3 }, NOW);
    expect(free).toMatchObject({ ok: true, fee: 0, courierCharge: 700 });
    expect(quoteMarketDelivery(settings(), vendor(), { fulfilment: "delivery", dropoff: far, items: 20000, itemCount: 3 }, NOW)).toMatchObject({ ok: false, refusal: "outside_area" });
  });

  it("the vendor's own drivers: its fee fixed or per km, free over an amount, its area, the map only if a driver signs in", () => {
    const q = quoteMarketDelivery(settings(), vendor({ delivery: own }), { fulfilment: "delivery", dropoff: near, items: 20000, itemCount: 3 }, NOW);
    expect(q).toMatchObject({ ok: true, by: "vendor", courierCharge: 0, liveMap: "if_driver_signs_in" });
    if (q.ok) expect(q.fee).toBe(1000 + Math.round(400 * Math.max(0, q.distanceKm! - 1)));
    expect(ownDeliveryFee({ ...own, feeKind: "fixed" }, 4, 1000)).toBe(1000);
    expect(ownDeliveryFee(own, 4, 50000)).toBe(0);
    expect(quoteMarketDelivery(settings(), vendor({ delivery: own, maxKm: 1 }), { fulfilment: "delivery", dropoff: near, items: 20000, itemCount: 3 }, NOW)).toMatchObject({ ok: false, refusal: "outside_area", limit: 1 });
    expect(quoteMarketDelivery(settings(), vendor({ delivery: own }), { fulfilment: "delivery", dropoff: { address: "x", details: null, lat: null, lng: null }, items: 20000, itemCount: 3 }, NOW)).toMatchObject({ ok: false, refusal: "needs_location" });
  });

  it("the smallest order and the fewest and most items, for delivery and pick-up", () => {
    const v = vendor({ delivery: own });
    expect(quoteMarketDelivery(settings(), v, { fulfilment: "delivery", dropoff: near, items: 9000, itemCount: 3 }, NOW)).toMatchObject({ ok: false, refusal: "below_min_order", limit: 10000 });
    expect(quoteMarketDelivery(settings(), v, { fulfilment: "pickup", dropoff: null, items: 20000, itemCount: 1 }, NOW)).toMatchObject({ ok: false, refusal: "too_few_items", limit: 2 });
    expect(quoteMarketDelivery(settings(), v, { fulfilment: "delivery", dropoff: near, items: 20000, itemCount: 31 }, NOW)).toMatchObject({ ok: false, refusal: "too_many_items", limit: 30 });
  });

  it("pick-up: no fee, only where the vendor allows it, with a four-digit code", () => {
    expect(quoteMarketDelivery(settings(), vendor({ delivery: own }), { fulfilment: "pickup", dropoff: null, items: 20000, itemCount: 2 }, NOW)).toMatchObject({ ok: true, fulfilment: "pickup", by: null, fee: 0, liveMap: "never", minutes: 20 });
    expect(quoteMarketDelivery(settings(), vendor(), { fulfilment: "pickup", dropoff: null, items: 20000, itemCount: 2 }, NOW)).toMatchObject({ ok: false, refusal: "no_pickup" });
    for (let i = 0; i < 50; i++) expect(pickupCode()).toMatch(/^\d{4}$/);
  });

  it("closed, busy or paused vendors take orders only for later, at times within their hours", () => {
    const closedNow = new Date("2026-10-14T03:00:00Z"); // 06:00 in Cairo
    expect(quoteMarketDelivery(settings(), vendor({ delivery: own }), { fulfilment: "delivery", dropoff: near, items: 20000, itemCount: 3 }, closedNow)).toMatchObject({ ok: false, refusal: "closed" });
    expect(quoteMarketDelivery(settings(), vendor({ delivery: own, paused: true }), { fulfilment: "delivery", dropoff: near, items: 20000, itemCount: 3 }, NOW)).toMatchObject({ ok: false, refusal: "closed" });
    const later = new Date("2026-10-14T09:00:00Z"); // 12:00 in Cairo
    expect(quoteMarketDelivery(settings(), vendor({ delivery: own }), { fulfilment: "delivery", dropoff: near, items: 20000, itemCount: 3, scheduledFor: later }, closedNow)).toMatchObject({ ok: true, by: "vendor" });
    expect(quoteMarketDelivery(settings(), vendor(), { fulfilment: "delivery", dropoff: near, items: 20000, itemCount: 3, scheduledFor: later }, closedNow)).toMatchObject({ ok: false, refusal: "no_scheduling" });
    const night = new Date("2026-10-14T22:00:00Z"); // 01:00 in Cairo, closed
    expect(quoteMarketDelivery(settings(), vendor({ delivery: own }), { fulfilment: "delivery", dropoff: near, items: 20000, itemCount: 3, scheduledFor: night }, NOW)).toMatchObject({ ok: false, refusal: "bad_time" });
  });

  it("order times: within the hours, after the preparation, over the next days", () => {
    const slots = orderSlots(vendor(), "Africa/Cairo", NOW, { days: 2, stepMinutes: 30 });
    // From 10:20 Cairo: 10:30 to 22:30 today (25), then 09:00 to 22:30 tomorrow (28).
    expect(slots[0]!.start.toISOString()).toBe("2026-10-14T07:30:00.000Z");
    expect(slots).toHaveLength(25 + 28);
    expect(slots.at(-1)!.end.toISOString()).toBe("2026-10-15T20:00:00.000Z");
    expect(isSlotOpen(vendor(), "Africa/Cairo", new Date("2026-10-15T08:10:00Z"), NOW)).toBe(true);
    expect(isSlotOpen(vendor(), "Africa/Cairo", new Date("2026-10-14T07:10:00Z"), NOW)).toBe(false);
    // Past midnight: a period that closes the next day.
    const late = orderSlots(vendor({ hours: [{ day: "wed", opens: "20:00", closes: "02:00" }] }), "Africa/Cairo", NOW, { days: 1, stepMinutes: 60 });
    expect(late.map((s) => s.start.toISOString())).toEqual(["2026-10-14T17:00:00.000Z", "2026-10-14T18:00:00.000Z", "2026-10-14T19:00:00.000Z", "2026-10-14T20:00:00.000Z"]);
  });

  it("the vendor's courier charge is taken off what it earns and shows in its statement", () => {
    expect(vendorCourierCharge({ customerFee: "delivery_prices", percent: 0, minFee: 0, maxFee: null, freeOver: null, vendorCharge: "none", vendorChargeValue: 0 }, 20000, 3)).toBe(0);
    const money = priceOrder({ items: [{ unitPrice: 10000, quantity: 2 }], deliveryFee: 2500, deliveryBy: "app", commission: { kind: "percent", value: 10 }, collectedBy: "owner", courierCharge: 1000 });
    expect(money.split).toMatchObject({ commission: 2000, courierCharge: 1000, vendorEarns: 17000, dueToVendor: 17000 });
    expect(money.split.ownerEarns).toBe(money.total - 17000);
    // Never on the vendor's own deliveries.
    expect(priceOrder({ items: [{ unitPrice: 10000, quantity: 2 }], deliveryFee: 2500, deliveryBy: "vendor", commission: { kind: "percent", value: 10 }, collectedBy: "owner", courierCharge: 1000 }).split.courierCharge).toBe(0);
    const statement = buildStatement({ from: new Date("2026-10-01"), to: new Date("2026-11-01"), currency: "EGP", orders: [{ id: 1, reference: "M-1", at: NOW, payment: "card", money }], adjustments: [] });
    expect(statement.totals.courierCharges).toBe(1000);
    expect(statementCsv(statement, "en", "Africa/Cairo")).toContain("Charges for the app's couriers");
    // Orders priced before 115.5 have no courier charge.
    const old = { ...money, split: { ...money.split, courierCharge: undefined } };
    expect(buildStatement({ from: new Date("2026-10-01"), to: new Date("2026-11-01"), currency: "EGP", orders: [{ id: 1, reference: "M-1", at: NOW, payment: "card", money: old }], adjustments: [] }).totals.courierCharges).toBe(0);
  });

  it("reads the delivery forms in the app's currency", () => {
    const parsed = parseVendorDeliveryForm({ by: "vendor", fee_kind: "per_km", fee: "10", per_km: "4.5", free_over: "500", min_items: "2", max_items: "30", pickup: "on", scheduling: "" }, "EGP");
    expect(parsed).toEqual({ ok: true, value: { by: "vendor", feeKind: "per_km", fee: 1000, perKm: 450, freeOver: 50000, minItems: 2, maxItems: 30, pickup: true, scheduling: false } });
    if (parsed.ok) expect(parseVendorDeliveryForm(vendorDeliveryFormValues(parsed.value, "EGP"), "EGP")).toEqual(parsed);
    expect(parseVendorDeliveryForm({ by: "vendor", fee_kind: "fixed", fee: "" }, "EGP")).toMatchObject({ ok: false, field: "fee" });
    expect(parseVendorDeliveryForm({ by: "app", min_items: "5", max_items: "2" }, "EGP")).toMatchObject({ ok: false, field: "max_items" });
    expect(parseVendorDeliveryForm({ by: "vendor", fee_kind: "fixed", fee: "1.5" }, "KWD")).toMatchObject({ ok: true, value: { fee: 1500 } });
    expect(parseVendorDeliveryForm({ by: "vendor", fee_kind: "fixed", fee: "20" }, "JPY")).toMatchObject({ ok: true, value: { fee: 20 } });
    expect(parseCourierTermsForm({ customer_fee: "percent", percent: "12.5", min_fee: "15", max_fee: "40", vendor_charge: "per_km", vendor_charge_value: "2" }, "TRY")).toEqual({
      ok: true,
      value: { customerFee: "percent", percent: 12.5, minFee: 1500, maxFee: 4000, freeOver: null, vendorCharge: "per_km", vendorChargeValue: 200 },
    });
    expect(parseCourierTermsForm({ customer_fee: "percent", percent: "120" }, "EGP")).toMatchObject({ ok: false, field: "percent" });
    expect(parseCourierTermsForm({ customer_fee: "percent", percent: "10", min_fee: "50", max_fee: "20" }, "EGP")).toMatchObject({ ok: false, field: "max_fee" });
  });
});
