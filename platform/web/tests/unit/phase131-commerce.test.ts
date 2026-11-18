import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { deliverPaidOrder } from "@/lib/catalog/payment";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import { parseCoupon, couponDiscount } from "@/lib/catalog/coupons";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogProductInput, type DeliveryScheduleSettings, type StoreFlashSale } from "@/lib/data/types";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import type { Connector, ConnectorRequest } from "@/lib/hosted/connectors/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { checkDelivery, dayOpen, DEFAULT_DELIVERY, deliveryConfigJson, deliveryOf, parseDeliveryForm } from "@/lib/selling/delivery";
import { bestSale, parseFlashSaleForm, saleOn, withSale } from "@/lib/selling/flash-sales";
import { GIFT_OCCASION_KEYS, GIFT_STARTERS } from "@/lib/selling/gift-starters";
import { giftMessagesJson, giftMessagesStatus, moved, parseTemplateForm, seedGiftOccasions, starterOccasions } from "@/lib/selling/gift-messages";
import { checkGift, cleanPhone, DEFAULT_GIFTS, deliveryAttributes, deliveryNote, parseGiftForm } from "@/lib/selling/gifts";
import { parseShippingForm, quoteShipping, shippingRulesOf, type ShippingRules } from "@/lib/selling/shipping";
import { withStoreExtras } from "@/lib/selling/store";
import { parseCheckoutLook } from "@/lib/studio/checkout-look";
import { zoneOffsetMinutes } from "@/lib/selling/zone";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/**
 * 131 The flower shop's commerce: same-day and next-day delivery with its
 * cut-off and slots, gifts and the gift checkout, the card messages, where
 * the shop delivers and what shipping costs (flat, by city, by distance, by
 * weight, a city's own price winning), flash sales and coupons, on the
 * shop's own products and over a connected platform.
 */

const KEY = Buffer.alloc(32, 7);
// A Friday, 11:00 in Istanbul (UTC+3).
const FRI_11 = new Date("2026-11-20T08:00:00Z");

const schedule = (patch: Partial<DeliveryScheduleSettings> = {}): DeliveryScheduleSettings => ({ ...DEFAULT_DELIVERY, enabled: true, ...patch });

describe("131 delivery days and slots", () => {
  it("offers today until the cut-off, in the shop's time zone", () => {
    const s = schedule({ cutoff: "14:00" });
    expect(dayOpen(s, "2026-11-20", FRI_11)).toEqual({ ok: true });
    // 14:30 in Istanbul: today's orders have closed, tomorrow is open.
    const late = new Date("2026-11-20T11:30:00Z");
    expect(dayOpen(s, "2026-11-20", late)).toEqual({ ok: false, reason: "cutoff" });
    expect(dayOpen(s, "2026-11-21", late)).toEqual({ ok: true });
    // 23:30 UTC on Thursday is already Friday in Istanbul.
    expect(dayOpen(s, "2026-11-20", new Date("2026-11-19T23:30:00Z"))).toEqual({ ok: true });
  });

  it("starts tomorrow without same-day, two days ahead without next-day, never on closed weekdays or past the days ahead", () => {
    expect(dayOpen(schedule({ sameDay: false }), "2026-11-20", FRI_11)).toEqual({ ok: false, reason: "too_soon" });
    expect(dayOpen(schedule({ sameDay: false }), "2026-11-21", FRI_11)).toEqual({ ok: true });
    expect(dayOpen(schedule({ sameDay: false, nextDay: false }), "2026-11-21", FRI_11)).toEqual({ ok: false, reason: "too_soon" });
    // Sunday closed.
    expect(dayOpen(schedule({ closedWeekdays: [0] }), "2026-11-22", FRI_11)).toEqual({ ok: false, reason: "closed" });
    expect(dayOpen(schedule({ maxDays: 2 }), "2026-11-23", FRI_11)).toEqual({ ok: false, reason: "too_far" });
    expect(dayOpen(schedule(), "2026-02-30", FRI_11)).toEqual({ ok: false, reason: "invalid" });
  });

  it("checks the slot: one of the shop's, not started today, not full; its fee only where Yallapp checks out", async () => {
    const s = schedule({ slots: [{ id: "s1", start: "10:00", end: "13:00", capacity: null, feeCents: 2500 }, { id: "s2", start: "13:00", end: "16:00", capacity: 2, feeCents: 5000 }] });
    const none = async () => ({});
    expect(await checkDelivery(s, { delivery_date: "2026-11-20", delivery_slot: "s1" }, FRI_11, none, true)).toMatchObject({ ok: false, status: 400 });
    expect(await checkDelivery(s, { delivery_date: "2026-11-20", delivery_slot: "s2" }, FRI_11, none, true)).toMatchObject({ ok: true, feeCents: 5000 });
    expect(await checkDelivery(s, { delivery_date: "2026-11-20", delivery_slot: "s2" }, FRI_11, none, false)).toMatchObject({ ok: true, feeCents: 0 });
    expect(await checkDelivery(s, { delivery_date: "2026-11-20", delivery_slot: "s2" }, FRI_11, async () => ({ s2: 2 }), true)).toMatchObject({ ok: false, code: "slot_full", status: 409 });
    expect(await checkDelivery(s, { delivery_date: "2026-11-21" }, FRI_11, none, true)).toMatchObject({ ok: false, message: "Choose a delivery time." });
    expect(await checkDelivery(s, { delivery_date: "2026-11-21", delivery_slot: "zz" }, FRI_11, none, true)).toMatchObject({ ok: false });
    // Required: a day must come; a shop without delivery days takes none.
    expect(await checkDelivery(s, {}, FRI_11, none, true)).toMatchObject({ ok: false, message: "Choose a delivery date." });
    expect(await checkDelivery(null, { delivery_date: "2026-11-21" }, FRI_11, none, true)).toEqual({ ok: true, date: null, slot: null, feeCents: 0 });
  });

  it("extends the store's delivery_date for the app, and turns on with the gift checkout", () => {
    const json = deliveryConfigJson(schedule(), "TRY", true);
    expect(json).toMatchObject({ enabled: true, required: true, min_days: 0, max_days: 14, timezone: "Europe/Istanbul", same_day_cutoff: "14:00" });
    expect(json.slots).toHaveLength(3);
    // The shop's offset, so the app counts today and the cut-off in Istanbul's time wherever the phone is.
    expect(deliveryConfigJson(schedule(), "TRY", true, FRI_11).utc_offset_minutes).toBe(180);
    expect(deliveryConfigJson(schedule({ timezone: "America/New_York" }), "TRY", true, new Date("2026-07-01T12:00:00Z")).utc_offset_minutes).toBe(-240);
    expect(deliveryConfigJson(null, "TRY", true)).toEqual({ enabled: false, required: false, min_days: 0, max_days: 0, closed_weekdays: [] });
    const app = { vertical: null, catalogSettings: null } as unknown as App;
    expect(deliveryOf(app)).toBeNull();
    expect(deliveryOf(app, true)).toMatchObject({ enabled: true, required: true });
    expect(deliveryOf(app, true)!.slots.length).toBeGreaterThan(0);
    // Never a restaurant's (its kitchen's times are its own).
    expect(deliveryOf({ ...app, vertical: "restaurant" } as App, true)).toBeNull();
  });

  it("reads the dashboard's form, keeping a saved slot's id", () => {
    const parsed = parseDeliveryForm({ enabled: "on", required: "on", sameDay: "on", cutoff: "13:30", nextDay: "on", maxDays: "7", timezone: "Africa/Cairo", closed5: "on", slotId0: "s3", slotStart0: "16:00", slotEnd0: "20:00", slotCapacity0: "10", slotFee0: "30", slotStart1: "10:00", slotEnd1: "13:00" }, null);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toMatchObject({ cutoff: "13:30", maxDays: 7, timezone: "Africa/Cairo", closedWeekdays: [5] });
    expect(parsed.value.slots).toEqual([
      { id: "s1", start: "10:00", end: "13:00", capacity: null, feeCents: null },
      { id: "s3", start: "16:00", end: "20:00", capacity: 10, feeCents: 3000 },
    ]);
    const bad = parseDeliveryForm({ maxDays: "90", slotStart0: "13:00", slotEnd0: "10:00", cutoff: "2pm", closed0: "on", closed1: "on", closed2: "on", closed3: "on", closed4: "on", closed5: "on", closed6: "on" }, null);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(["closed", "cutoff", "maxDays", "slot0"]);
  });
});

describe("131 gifts and the gift checkout", () => {
  const gifts = { ...DEFAULT_GIFTS, message: true, recipient: true, anonymous: true };

  it("takes the card, the recipient and send anonymously in the standard checkout, all optional", () => {
    expect(checkGift(gifts, "standard", {})).toEqual({ ok: true, sender: null, recipient: null, message: null, anonymous: false });
    const ok = checkGift(gifts, "standard", { gift_message: "  Happy\r\n\r\n\r\nbirthday!  ", gift_anonymous: true, recipient: { name: "Leyla", phone: "+90 532 123 45 67" } });
    expect(ok).toEqual({ ok: true, sender: null, recipient: { name: "Leyla", phone: "+905321234567", address: null }, message: "Happy\n\nbirthday!", anonymous: true });
    expect(checkGift(gifts, "standard", { gift_message: "x".repeat(501) })).toMatchObject({ ok: false });
    expect(checkGift(gifts, "standard", { gift_message: "x".repeat(500) })).toMatchObject({ ok: true });
    // What the shop doesn't offer is left out.
    expect(checkGift(DEFAULT_GIFTS, "standard", { gift_message: "Hi", gift_anonymous: true, recipient: { name: "Leyla", phone: "05321234567" } })).toEqual({ ok: true, sender: null, recipient: null, message: null, anonymous: false });
  });

  it("asks the gift checkout for exactly the sender's name, phone and email and the recipient's name, phone and address", () => {
    const body = { sender: { name: "Ayşe Kaya", phone: "+905321111111", email: "Ayse@Example.com" }, recipient: { name: "Leyla", phone: "+905322222222", address: "Moda Cd. 12, Kadıköy" }, gift_message: "With love", gift_anonymous: true };
    expect(checkGift(DEFAULT_GIFTS, "gift", body)).toEqual({
      ok: true,
      sender: { name: "Ayşe Kaya", phone: "+905321111111", email: "ayse@example.com" },
      recipient: { name: "Leyla", phone: "+905322222222", address: "Moda Cd. 12, Kadıköy" },
      message: "With love",
      anonymous: true,
    });
    for (const [patch, message] of [
      [{ sender: { ...body.sender, name: "A" } }, "Enter your name."],
      [{ sender: { ...body.sender, phone: "12" } }, "Enter your phone number."],
      [{ sender: { ...body.sender, email: "no" } }, "Enter your email address."],
      [{ recipient: { ...body.recipient, name: "" } }, "Enter the recipient's name."],
      [{ recipient: { ...body.recipient, phone: "abc" } }, "Enter the recipient's phone number."],
      [{ recipient: { ...body.recipient, address: "" } }, "Enter the delivery address."],
      [{ recipient: { ...body.recipient, address: "x".repeat(301) } }, "The address can be at most 300 characters."],
    ] as const) {
      expect(checkGift(DEFAULT_GIFTS, "gift", { ...body, ...patch })).toMatchObject({ ok: false, message });
    }
    expect(cleanPhone("+90 (532) 123-45-67")).toBe("+905321234567");
    expect(cleanPhone("+1234567890123456")).toBeNull();
  });

  it("writes the details as a note and as attributes for a platform's order", () => {
    const d = { date: "2026-11-21", slot: { id: "s1", start: "10:00", end: "13:00" }, feeCents: 0, sender: { name: "Ayşe", phone: "+90532", email: "a@b.co" }, recipient: { name: "Leyla", phone: "+90533", address: "Moda" }, message: "Love", anonymous: true };
    expect(deliveryNote(d, { slotLabel: (s) => `${s.start}–${s.end}` }).split("\n")).toEqual([
      "Delivery date: 2026-11-21, 10:00–13:00",
      "Sender: Ayşe, +90532, a@b.co",
      "Recipient: Leyla, +90533, Moda",
      "Card message: Love",
      "Send anonymously: yes",
    ]);
    expect(deliveryAttributes(d, (s) => `${s.start}–${s.end}`).map((a) => a.key)).toEqual(["Delivery date", "Delivery time", "Sender name", "Sender phone", "Sender email", "Recipient name", "Recipient phone", "Recipient address", "Card message", "Send anonymously"]);
  });

  it("reads the gifts form and the checkout look, which turns on the gift checkout", () => {
    expect(parseGiftForm({ message: "on", maxLength: "300", starters: "Happy birthday!\n\nWith love", anonymous: "on" })).toEqual({
      ok: true,
      value: { checkout: "standard", message: true, maxLength: 300, starters: ["Happy birthday!", "With love"], recipient: false, anonymous: true },
    });
    expect(parseGiftForm({ maxLength: "600" }).ok).toBe(false);
    expect(parseCheckoutLook({ mode: "gift", style: "steps", chips: "square", surface: "glass", accent: "#c2185b", radius: 20, title: { ar: "أرسل هدية" } })).toEqual({ mode: "gift", style: "steps", chips: "square", surface: "glass", accent: "#C2185B", radius: 20, title: { ar: "أرسل هدية" } });
    const problems: string[] = [];
    expect(parseCheckoutLook({ style: "nope", radius: 99, accent: "red" }, problems)).toBeNull();
    expect(problems).toHaveLength(2);
  });
});

describe("131 the card messages", () => {
  it("ships warm starters for every occasion in English, Arabic and Turkish", () => {
    for (const key of GIFT_OCCASION_KEYS) {
      expect(GIFT_STARTERS[key].length).toBeGreaterThanOrEqual(2);
      for (const words of GIFT_STARTERS[key]) for (const text of [words.en, words.ar, words.tr]) expect(text.length).toBeGreaterThan(10);
    }
    const json = giftMessagesJson(starterOccasions("app", NOW), "ar", "en");
    expect(json.occasions[1]).toMatchObject({ id: "birthday", name: "عيد ميلاد", icon: "cake" });
    expect(json.occasions[1]!.templates[0]!.text).toContain("عيد ميلاد سعيد");
  });

  it("serves what isn't hidden, in the language asked for, else the main one", () => {
    const [love, birthday] = starterOccasions("app", NOW);
    const own = { ...love!, id: 9, key: null, names: { en: "Graduation" }, templates: [{ id: "t1", texts: { en: "Well done!" }, hidden: false }, { id: "t2", texts: { en: "Hidden" }, hidden: true }] };
    const json = giftMessagesJson([own, { ...birthday!, hidden: true }], "tr", "en");
    expect(json).toEqual({ occasions: [{ id: "c9", name: "Graduation", icon: love!.icon, templates: [{ id: "t1", text: "Well done!" }] }] });
    expect(giftMessagesStatus([own], "en").occasions[0]).toMatchObject({ id: "c9", templates: [{ id: "t1", texts: { en: "Well done!" } }] });
  });

  it("copies the starters into the store once, then they are the owner's", async () => {
    const { store } = await setupClient();
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const app: App = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } };
    await store.createApp(app);
    const first = await seedGiftOccasions(store, app, NOW);
    expect(first).toHaveLength(GIFT_OCCASION_KEYS.length);
    const seeded = (await store.getAppById(app.id))!;
    expect(seeded.catalogSettings?.gifts?.messagesSeeded).toBe(true);
    await store.deleteGiftOccasion(app.id, first[0]!.id);
    expect(await seedGiftOccasions(store, seeded, NOW)).toHaveLength(GIFT_OCCASION_KEYS.length - 1);
    expect(moved(first, first[2]!.id, -1).map((p) => p.id).slice(0, 3)).toEqual([first[0]!.id, first[2]!.id, first[1]!.id]);
    expect(parseTemplateForm({ text_en: "Hi" }, ["en", "ar"], "ar")).toMatchObject({ ok: false });
    expect(parseTemplateForm({ text_ar: "مرحبًا", text_en: "Hi" }, ["en", "ar"], "ar")).toEqual({ ok: true, value: { texts: { en: "Hi", ar: "مرحبًا" } } });
  });
});

describe("131 where the shop delivers and what shipping costs", () => {
  const base = (patch: Partial<ShippingRules> = {}): ShippingRules => ({ mode: "flat", areas: [], flatCents: 5000, freeOverCents: null, cityPrices: [], otherCityCents: null, distance: null, weight: null, minCents: null, ...patch });
  const place = (patch: Partial<{ country: string; city: string; lat: number; lng: number }> = {}) => ({ country: null, city: null, lat: null, lng: null, ...patch });
  const origin = { lat: 41.0, lng: 29.0 };
  // About 11.1 km north of the shop.
  const north = { lat: 41.1, lng: 29.0 };

  it("prices flat, free over the threshold, nothing for digital orders", () => {
    expect(quoteShipping(base(), { subtotalCents: 1000, physical: true, place: null })).toMatchObject({ ok: true, cents: 5000, rule: "flat" });
    expect(quoteShipping(base({ freeOverCents: 1000 }), { subtotalCents: 1000, physical: true, place: null })).toMatchObject({ ok: true, cents: 0, rule: "free" });
    expect(quoteShipping(base(), { subtotalCents: 1000, physical: false, place: null })).toMatchObject({ ok: true, cents: 0 });
  });

  it("takes addresses only in the shop's countries and cities, the city from its list", () => {
    const r = base({ areas: [{ country: "TR", cities: ["İstanbul", "Ankara"] }, { country: "EG", cities: null }] });
    expect(quoteShipping(r, { subtotalCents: 1000, physical: true, place: place() })).toMatchObject({ ok: false, field: "country", code: "invalid_request" });
    expect(quoteShipping(r, { subtotalCents: 1000, physical: true, place: place({ country: "SA" }) })).toMatchObject({ ok: false, code: "outside_delivery_area" });
    expect(quoteShipping(r, { subtotalCents: 1000, physical: true, place: place({ country: "TR" }) })).toMatchObject({ ok: false, field: "city" });
    expect(quoteShipping(r, { subtotalCents: 1000, physical: true, place: place({ country: "TR", city: "Izmir" }) })).toMatchObject({ ok: false, code: "outside_delivery_area", field: "city" });
    // The same city however it's typed.
    expect(quoteShipping(r, { subtotalCents: 1000, physical: true, place: place({ country: "TR", city: "  istanbul " }) })).toMatchObject({ ok: true, zone: "İstanbul" });
    expect(quoteShipping(r, { subtotalCents: 1000, physical: true, place: place({ country: "EG", city: "Cairo" }) })).toMatchObject({ ok: true });
  });

  it("prices per city with a default for the other allowed cities", () => {
    const r = base({ mode: "city", cityPrices: [{ country: "TR", city: "İstanbul", cents: 4000 }], otherCityCents: 9000 });
    expect(quoteShipping(r, { subtotalCents: 1000, physical: true, place: place({ country: "TR", city: "Istanbul" }) })).toMatchObject({ cents: 4000, rule: "city" });
    expect(quoteShipping(r, { subtotalCents: 1000, physical: true, place: place({ country: "TR", city: "Bursa" }) })).toMatchObject({ cents: 9000, rule: "other_city" });
    expect(quoteShipping({ ...r, otherCityCents: null }, { subtotalCents: 1000, physical: true, place: place({ country: "TR", city: "Bursa" }) })).toMatchObject({ ok: false, code: "outside_delivery_area" });
  });

  it("prices by distance: base plus km, at least the minimum, up to the maximum distance", () => {
    const r = base({ mode: "distance", flatCents: 0, distance: { origin, baseCents: 2000, perKmCents: 500, maxKm: 15 } });
    const q = quoteShipping(r, { subtotalCents: 1000, physical: true, place: place(north) });
    expect(q).toMatchObject({ ok: true, rule: "distance", km: 11.2, cents: 2000 + 5600 });
    if (q.ok) expect(q.breakdown.map((l) => l.rule)).toEqual(["distance", "distance"]);
    expect(quoteShipping({ ...r, minCents: 10000 }, { subtotalCents: 1000, physical: true, place: place(north) })).toMatchObject({ cents: 10000 });
    expect(quoteShipping({ ...r, distance: { ...r.distance!, maxKm: 5 } }, { subtotalCents: 1000, physical: true, place: place(north) })).toMatchObject({ ok: false, code: "outside_delivery_area", field: "location" });
    expect(quoteShipping(r, { subtotalCents: 1000, physical: true, place: place() })).toMatchObject({ ok: false, field: "location" });
  });

  it("prices by weight only: the kg over the included ones", () => {
    const r = base({ flatCents: 0, weight: { perKgCents: 1000, includedKg: 2 } });
    const q = quoteShipping(r, { subtotalCents: 1000, physical: true, place: null, weightGrams: 3500 });
    expect(q).toMatchObject({ ok: true, cents: 1500, rule: "weight" });
    if (q.ok) expect(q.breakdown).toEqual([{ label: "3.5 kg (2 kg included)", cents: 1500, rule: "weight", words: { kind: "kg", grams: 3500, includedKg: 2 } }]);
    expect(quoteShipping(r, { subtotalCents: 1000, physical: true, place: null, weightGrams: 1500 })).toMatchObject({ cents: 0 });
  });

  it("adds distance and weight together, both in the breakdown", () => {
    const r = base({ mode: "distance", distance: { origin, baseCents: 1000, perKmCents: 100, maxKm: null }, weight: { perKgCents: 400, includedKg: 0 } });
    const q = quoteShipping(r, { subtotalCents: 1000, physical: true, place: place(north), weightGrams: 2000 });
    expect(q).toMatchObject({ ok: true, cents: 1000 + 1120 + 800 });
    if (q.ok) expect(q.breakdown.map((l) => [l.rule, l.cents])).toEqual([["distance", 1000], ["distance", 1120], ["weight", 800]]);
  });

  it("lets a city's own price win over the per-km and per-kg rules, in any mode", () => {
    const r = base({ mode: "distance", distance: { origin, baseCents: 1000, perKmCents: 100, maxKm: 5 }, weight: { perKgCents: 400, includedKg: 0 }, cityPrices: [{ country: "TR", city: "Kadıköy", cents: 3000 }] });
    // Too far by distance, but the city has its own price.
    const q = quoteShipping(r, { subtotalCents: 1000, physical: true, place: place({ country: "TR", city: "Kadıköy", ...north }), weightGrams: 5000 });
    expect(q).toMatchObject({ ok: true, cents: 3000, rule: "city", breakdown: [{ label: "Kadıköy", cents: 3000, rule: "city" }] });
    // Free delivery over the threshold still applies to it.
    expect(quoteShipping({ ...r, freeOverCents: 500 }, { subtotalCents: 1000, physical: true, place: place({ country: "TR", city: "Kadıköy" }) })).toMatchObject({ cents: 0, rule: "free" });
  });

  it("reads the dashboard's form", () => {
    const parsed = parseShippingForm({ country0: "tr", cities0: "İstanbul\nAnkara\nistanbul", country1: "EG", allCities1: "on", shippingMode: "distance", cityPrices: "İstanbul: 40", originLat: "41.03", originLng: "28.98", baseFee: "20", perKm: "5", maxKm: "30", byWeight: "on", perKg: "10", includedKg: "1,5", minFee: "25" });
    expect(parsed).toEqual({
      ok: true,
      value: {
        areas: [{ country: "TR", cities: ["İstanbul", "Ankara"] }, { country: "EG", cities: null }],
        shippingMode: "distance",
        cityPrices: [{ country: "TR", city: "İstanbul", cents: 4000 }],
        otherCityCents: null,
        distancePricing: { origin: { lat: 41.03, lng: 28.98 }, baseCents: 2000, perKmCents: 500, maxKm: 30 },
        weightPricing: { perKgCents: 1000, includedKg: 1.5 },
        shippingMinCents: 2500,
      },
    });
    expect(parseShippingForm({ shippingMode: "distance", perKm: "" }).ok).toBe(false);
    expect(shippingRulesOf({ ...DEFAULT_CATALOG_SETTINGS, shippingMode: "distance", distancePricing: null }).mode).toBe("flat");
  });
});

describe("131 flash sales", () => {
  const sale = (patch: Partial<StoreFlashSale> = {}): StoreFlashSale => ({
    id: 1,
    appId: "a",
    title: "Roses",
    productIds: [7],
    categoryId: null,
    discount: { kind: "percent", percent: 20 },
    startsAt: new Date("2026-11-20T00:00:00Z"),
    endsAt: new Date("2026-11-21T00:00:00Z"),
    limit: null,
    sold: 0,
    platformCode: null,
    active: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  });

  it("is on between its times, while turned on and not sold out", () => {
    expect(saleOn(sale(), FRI_11)).toBe(true);
    expect(saleOn(sale({ active: false }), FRI_11)).toBe(false);
    expect(saleOn(sale({ startsAt: new Date("2026-11-20T09:00:00Z") }), FRI_11)).toBe(false);
    expect(saleOn(sale({ limit: 5, sold: 5 }), FRI_11)).toBe(false);
  });

  it("gives the lowest price of the sales on now, by product or category", () => {
    const sales = [sale(), sale({ id: 2, productIds: [], categoryId: 3, discount: { kind: "price", cents: 30000 } })];
    expect(bestSale(sales, { id: 7, categoryIds: [3] }, 50000, FRI_11)).toMatchObject({ cents: 30000, sale: { id: 2 } });
    expect(bestSale(sales, { id: 7, categoryIds: [] }, 50000, FRI_11)).toMatchObject({ cents: 40000, sale: { id: 1 } });
    // A sale price above the price lowers nothing.
    expect(bestSale([sale({ discount: { kind: "price", cents: 60000 } })], { id: 7 }, 50000, FRI_11)).toBeNull();
  });

  it("puts the sale on a product of any source: a flash sale over its price, else its own compare-at price", () => {
    const product = { id: 7, price: { amount: "500.00", regular_amount: null, currency: "TRY", formatted: "₺500.00", on_sale: false, range: false } };
    const flashed = withSale(product, [sale({ limit: 40, sold: 28 })], FRI_11);
    expect(flashed.price).toMatchObject({ amount: "400.00", regular_amount: "500.00", on_sale: true });
    expect(flashed.sale).toMatchObject({ was: "500.00", now: "400.00", percent_off: 20, ends_at: "2026-11-21T00:00:00.000Z", remaining: 12, total: 40, flash_sale_id: 1 });
    const own = withSale({ id: 8, price: { amount: "80.00", regular_amount: "100.00", currency: "TRY", formatted: "₺80.00", on_sale: true, range: false } }, [], FRI_11);
    expect(own.sale).toMatchObject({ was: "100.00", now: "80.00", percent_off: 20, ends_at: null, remaining: null, flash_sale_id: null });
    expect(withSale({ id: 9, price: product.price }, [], FRI_11).sale).toBeNull();
  });

  it("reads the dashboard's form in the shop's time zone", () => {
    const offset = zoneOffsetMinutes("Europe/Istanbul", FRI_11);
    expect(offset).toBe(180);
    const parsed = parseFlashSaleForm({ title: "Mother's Day", productIds: "7, 9, 7", kind: "price", value: "299", startsAt: "2026-11-20T09:00", endsAt: "2026-11-20T21:00", limit: "50", platformCode: "mom-25" }, offset);
    expect(parsed).toEqual({
      ok: true,
      value: { title: "Mother's Day", productIds: [7, 9], categoryId: null, discount: { kind: "price", cents: 29900 }, startsAt: new Date("2026-11-20T06:00:00Z"), endsAt: new Date("2026-11-20T18:00:00Z"), limit: 50, platformCode: "MOM-25" },
    });
    const bad = parseFlashSaleForm({ title: "x", kind: "percent", value: "95", startsAt: "2026-11-20T09:00", endsAt: "2026-11-20T08:00" }, offset);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(["endsAt", "productIds", "title", "value"]);
  });
});

describe("131 coupons with a start day, shown in the app", () => {
  it("reads the form's start day and show in the app, and applies only once started", () => {
    const parsed = parseCoupon({ code: "spring10", kind: "percent", value: "10", startsOn: "2026-11-25", endsOn: "2026-12-01", public: "on" }, NOW);
    expect(parsed).toMatchObject({ ok: true, value: { code: "SPRING10", startsAt: new Date("2026-11-25T00:00:00Z"), public: true } });
    if (!parsed.ok) return;
    const coupon = { ...parsed.value, id: 1, appId: "a", usedCount: 0, active: true, createdAt: NOW };
    expect(couponDiscount(coupon, 10000, "TRY", new Date("2026-11-24T12:00:00Z"))).toEqual({ ok: false, message: "This coupon isn't valid yet." });
    expect(couponDiscount(coupon, 10000, "TRY", new Date("2026-11-26T12:00:00Z"))).toEqual({ ok: true, discountCents: 1000 });
    expect(parseCoupon({ code: "X1", kind: "percent", value: "5", startsOn: "2026-12-05", endsOn: "2026-12-01" }, NOW).ok).toBe(false);
  });
});

describe("131 the shop's own products on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let now: Date;
  const ids: Record<string, number> = {};
  const product = (input: Partial<CatalogProductInput>): CatalogProductInput => ({ appId: app.id, name: "Product", description: "", priceCents: 10000, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null, ...input });

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const fresh = newApp(client.id, null, NOW, "store");
    app = {
      ...fresh,
      backend: "hosted",
      appName: "Leqaa",
      websiteDoneAt: NOW,
      connector: { kind: "catalog" },
      catalogSettings: {
        ...DEFAULT_CATALOG_SETTINGS,
        shippingCents: 5000,
        freeShippingOverCents: null,
        payment: encryptPaymentKeys(fresh.id, "api", "secret", true, KEY),
        delivery: schedule({ slots: [{ id: "s1", start: "10:00", end: "13:00", capacity: 1, feeCents: null }, { id: "s2", start: "16:00", end: "20:00", capacity: null, feeCents: 2500 }] }),
        gifts: { ...DEFAULT_GIFTS, checkout: "gift" },
        areas: [{ country: "TR", cities: ["İstanbul"] }],
        weightPricing: { perKgCents: 1000, includedKg: 1 },
      },
    };
    await store.createApp(app);
    now = FRI_11;
    ids.roses = (await store.createCatalogProduct(product({ name: "Red roses", priceCents: 50000, stock: 20, weightGrams: 1500 }), NOW)).id;
    ids.vase = (await store.createCatalogProduct(product({ name: "Vase", priceCents: 20000 }), new Date(NOW.getTime() + 1000))).id;
    await store.createFlashSale({ appId: app.id, title: "Roses", productIds: [ids.roses], categoryId: null, discount: { kind: "percent", percent: 20 }, startsAt: new Date("2026-11-20T00:00:00Z"), endsAt: new Date("2026-11-22T00:00:00Z"), limit: 3, platformCode: null, active: true, createdAt: NOW, updatedAt: NOW });
    await store.createCatalogCoupon({ appId: app.id, code: "LEQAA10", kind: "percent", value: 10, minOrderCents: null, endsAt: null, maxUses: null, active: true, createdAt: NOW, public: true, startsAt: null });
  });

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender: new LogSender(),
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    connector: new CatalogConnector({ store, app, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" }),
  });

  async function call(method: string, route: string, options: { body?: unknown; query?: Record<string, string>; lang?: string } = {}): Promise<HostedResult> {
    const result = await handleHosted(context(), {
      method,
      path: route.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: null,
      headers: new Headers(options.lang ? { "accept-language": options.lang } : {}),
    });
    expectContract(method, route.startsWith("/store/products/") ? "/store/products/{product_id}" : route, result);
    return result;
  }

  const gift = {
    sender: { name: "Ayşe Kaya", phone: "+905321111111", email: "ayse@example.com" },
    recipient: { name: "Leyla", phone: "+905322222222", address: "Moda Cd. 12, Kadıköy", country: "TR", city: "İstanbul" },
    gift_message: "Happy birthday!",
    gift_anonymous: true,
  };

  it("serves the gift checkout, the delivery days with their slots, and where it delivers", async () => {
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { store: Record<string, unknown> };
    expect(config.store).toMatchObject({
      checkout_mode: "gift",
      delivery_date: { enabled: true, required: true, min_days: 0, same_day_cutoff: "14:00", timezone: "Europe/Istanbul" },
      gift_message: { enabled: true, max_length: 500, recipient: true, anonymous: true },
      shipping: { mode: "flat", countries: [{ code: "TR", cities: ["İstanbul"] }], charged: true },
    });
    const slots = (await call("GET", "/store/delivery-slots", { query: { date: "2026-11-20" } })).body as { open: boolean; slots: { id: string; available: boolean; fee_formatted: string | null }[] };
    // At 11:00 the 10:00 slot has started.
    expect(slots.open).toBe(true);
    expect(slots.slots.map((s) => [s.id, s.available])).toEqual([["s1", false], ["s2", true]]);
    expect(slots.slots[1]!.fee_formatted).toBe("₺25.00");
    expect((await call("GET", "/store/delivery-slots", { query: { date: "nope" } })).status).toBe(400);
  });

  it("puts the flash sale on the products, lists it, and the coupons shown in the app", async () => {
    const list = (await call("GET", "/store/products")).body as { items: { id: number; price: { amount: string }; sale: Record<string, unknown> | null }[] };
    const roses = list.items.find((p) => p.id === ids.roses)!;
    expect(roses.price.amount).toBe("400.00");
    expect(roses.sale).toMatchObject({ was: "500.00", now: "400.00", percent_off: 20, remaining: 3, total: 3 });
    expect(list.items.find((p) => p.id === ids.vase)!.sale).toBeNull();
    const sales = (await call("GET", "/store/flash-sales")).body as { items: { title: string; live: boolean; products: unknown[] }[] };
    expect(sales.items).toHaveLength(1);
    expect(sales.items[0]).toMatchObject({ title: "Roses", live: true, remaining: 3 });
    const onSale = (await call("GET", "/store/products", { query: { on_sale: "true" } })).body as { items: { id: number }[] };
    expect(onSale.items.map((p) => p.id)).toEqual([ids.roses]);
    const coupons = (await call("GET", "/store/coupons")).body as { items: { code: string; percent_off: number }[] };
    expect(coupons.items).toEqual([expect.objectContaining({ code: "LEQAA10", percent_off: 10 })]);
    const messages = (await call("GET", "/store/gift-messages", { lang: "tr" })).body as { occasions: { id: string; name: string }[] };
    expect(messages.occasions.find((o) => o.id === "birthday")!.name).toBe("Doğum günü");
  });

  it("quotes the slot's fee and shipping by weight with its breakdown, before the people are given", async () => {
    const quote = (await call("POST", "/store/cart", { body: { lines: [{ product_id: ids.roses, quantity: 2 }], delivery_date: "2026-11-20", delivery_slot: "s2", recipient: { country: "TR", city: "İstanbul" } } })).body as Record<string, unknown>;
    // Two roses at the flash price, 3 kg (1 included): 2 kg × ₺10, and the slot's ₺25.
    expect(quote).toMatchObject({ subtotal: "₺800.00", shipping: "₺95.00", delivery_fee: "₺25.00", delivery_zone: "İstanbul", total: "₺895.00", delivery_problem: null });
    expect((quote.shipping_breakdown as { rule: string }[]).map((l) => l.rule)).toEqual(["flat", "weight", "slot"]);
    const outside = (await call("POST", "/store/cart", { body: { lines: [{ product_id: ids.roses, quantity: 1 }], recipient: { country: "TR", city: "Ankara" } } })).body as Record<string, unknown>;
    expect(outside.delivery_problem).toMatchObject({ code: "outside_delivery_area" });
  });

  it("refuses a gift order without the day, the slot or the people, then keeps them on the order and counts the sale and the slot", async () => {
    const lines = [{ product_id: ids.roses, quantity: 2 }];
    const noDay = await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines, ...gift } });
    expect(noDay).toMatchObject({ status: 400, body: { message: "Choose a delivery date." } });
    const noSlot = await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines, ...gift, delivery_date: "2026-11-21" } });
    expect(noSlot).toMatchObject({ status: 400, body: { message: "Choose a delivery time." } });
    const noSender = await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines, ...gift, sender: null, delivery_date: "2026-11-21", delivery_slot: "s1" } });
    expect(noSender).toMatchObject({ status: 400, body: { message: "Enter your name." } });
    const outside = await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines, ...gift, recipient: { ...gift.recipient, city: "Ankara" }, delivery_date: "2026-11-21", delivery_slot: "s1" } });
    expect(outside).toMatchObject({ status: 400, body: { code: "outside_delivery_area" } });

    const ok = await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines, ...gift, delivery_date: "2026-11-21", delivery_slot: "s1" } });
    expect(ok.status).toBe(200);
    const { items } = await store.listCatalogOrders({ appId: app.id, offset: 0, limit: 10 });
    const order = items[0]!;
    expect(order).toMatchObject({ subtotalCents: 80000, shippingCents: 5000 + 2000, deliveryDate: "2026-11-21" });
    expect(order.delivery).toMatchObject({ date: "2026-11-21", slot: { id: "s1" }, sender: gift.sender, recipient: { name: "Leyla", address: "Moda Cd. 12, Kadıköy" }, message: "Happy birthday!", anonymous: true });
    expect(order.lines[0]).toMatchObject({ flashSaleId: 1, unitCents: 40000, weightGrams: 1500 });

    // The slot took its one order (it's still on the payment page).
    const full = await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines, ...gift, delivery_date: "2026-11-21", delivery_slot: "s1" } });
    expect(full).toMatchObject({ status: 409, body: { code: "slot_full" } });

    // Paid: two of the sale's three units are sold; one left, so a line of two pays the price.
    await store.payCatalogOrder(app.id, order.id, "pay-1", now);
    await deliverPaidOrder(store, app, (await store.getCatalogOrder(app.id, order.id))!, now);
    expect((await store.getFlashSale(app.id, 1))!.sold).toBe(2);
    const after = (await call("POST", "/store/cart", { body: { lines: [{ product_id: ids.roses, quantity: 2 }] } })).body as { subtotal: string };
    expect(after.subtotal).toBe("₺1,000.00");
  });
});

describe("131 a connected platform's shop", () => {
  let store: MemoryStore;
  let app: App;
  const seen: ConnectorRequest[] = [];
  const inner: Connector = {
    async config() {
      return { store: { currency: "TRY", guest_checkout: true, checkout_opens_in: "in_app", reviews: false, delivery_date: { enabled: false, required: false, min_days: 0, max_days: 0, closed_weekdays: [] }, gift_message: { enabled: false, max_length: 200 } } };
    },
    async handle(request) {
      seen.push(request);
      if (request.path.join("/") === "store/products") {
        return { status: 200, body: { page: 1, per_page: 20, total: 1, total_pages: 1, items: [{ id: 41, name: "Tulips", price: { amount: "300.00", regular_amount: null, currency: "TRY", formatted: "₺300.00", on_sale: false, range: false } }] } };
      }
      if (request.path.join("/") === "store/checkout-link") return { status: 200, body: { url: "https://shop.example/checkout/1", expires_at: request.now.toISOString(), open_in: "in_app" } };
      return null;
    },
  };

  beforeEach(async () => {
    seen.length = 0;
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", connector: { kind: "platform", platform: "ikas", settings: {}, secretsEncrypted: "x" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, delivery: schedule({ slots: [{ id: "s1", start: "16:00", end: "20:00", capacity: 5, feeCents: 2500 }] }), gifts: { ...DEFAULT_GIFTS, message: true, recipient: true } } };
    await store.createApp(app);
    await store.createFlashSale({ appId: app.id, title: "Tulips", productIds: [41], categoryId: null, discount: { kind: "percent", percent: 10 }, startsAt: new Date("2026-11-20T00:00:00Z"), endsAt: new Date("2026-11-21T00:00:00Z"), limit: null, platformCode: "TULIP10", active: true, createdAt: NOW, updatedAt: NOW });
  });

  const req = (method: string, path: string, body: unknown = null, query: Record<string, string> = {}): ConnectorRequest => ({ method, path: path.split("/"), query: new URLSearchParams(query), body, user: null, now: FRI_11 });

  it("adds the delivery days and gifts to its config, never charging their fees", async () => {
    const config = (await withStoreExtras(inner, { store, app }).config()) as { store: { delivery_date: { slots: { fee: string | null }[] }; gift_message: Record<string, unknown> } };
    expect(config.store.delivery_date.slots[0]!.fee).toBeNull();
    expect(config.store.gift_message).toMatchObject({ enabled: true, max_length: 500, recipient: true });
  });

  it("shows a Yallapp flash sale over the platform's price", async () => {
    const list = (await withStoreExtras(inner, { store, app }).handle(req("GET", "store/products")))!.body as { items: { price: { amount: string }; sale: { flash_sale_id: number } }[] };
    expect(list.items[0]!.price.amount).toBe("270.00");
    expect(list.items[0]!.sale.flash_sale_id).toBe(1);
  });

  it("checks the delivery, takes the sale's platform code to the checkout, and keeps the details for the owner", async () => {
    const extras = withStoreExtras(inner, { store, app });
    const lines = [{ product_id: 41, quantity: 1 }];
    expect((await extras.handle(req("POST", "store/checkout-link", { lines }, { platform: "android" })))!.status).toBe(400);
    const ok = await extras.handle(req("POST", "store/checkout-link", { lines, delivery_date: "2026-11-20", delivery_slot: "s1", gift_message: "Thinking of you", recipient: { name: "Leyla", phone: "+905322222222" } }, { platform: "android" }));
    expect(ok!.status).toBe(200);
    const sent = seen.find((r) => r.path.join("/") === "store/checkout-link")!;
    expect((sent.body as { coupon?: string }).coupon).toBe("TULIP10");
    expect(sent.order!.note).toContain("Card message: Thinking of you");
    const kept = await store.listStoreDeliveries(app.id, 10);
    // ikas's checkout can't take them: kept here only.
    expect(kept[0]).toMatchObject({ passed: false, delivery: { date: "2026-11-20", slot: { id: "s1" }, message: "Thinking of you" } });
    expect(await store.countStoreDeliveries(app.id, "2026-11-20")).toEqual({ s1: 1 });
  });
});
