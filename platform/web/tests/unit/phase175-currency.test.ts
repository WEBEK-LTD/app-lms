import { describe, expect, it } from "vitest";
import { conversionOf, convertPrice, convertShopRecords, currencyChangeLine, productAt, settingsAt } from "@/lib/catalog/currency-change";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type CatalogProductInput, type CatalogSettings } from "@/lib/data/types";
import { ratesOf } from "@/lib/money/rates";
import { NOW } from "./helpers";

/**
 * 175 Changing the shop's currency (report #5, ₺2,290 became MAD 2,290):
 * the owner converts every price at the day's rate, rounded for the
 * currency, or keeps the numbers; a log line keeps both currencies.
 */

// Units per dollar, as the daily rates keep them: 1 TRY = 0.27 MAD.
const rates = ratesOf({ date: "2026-11-18", rates: { TRY: 40, MAD: 10.8, JPY: 150, EUR: 0.92 }, fetchedAt: NOW.toISOString(), source: "test" } as never, null);

describe("175 the shop's currency", () => {
  it("the day's rate between two currencies, or none", () => {
    expect(conversionOf(rates, "TRY", "MAD")).toEqual({ rate: expect.closeTo(0.27, 6), text: "1 TRY = 0.2700 MAD" });
    expect(conversionOf(rates, "TRY", "EGP")).toBeNull();
    expect(conversionOf(rates, "TRY", "TRY")).toBeNull();
  });

  it("rounds sensibly for the currency", () => {
    // ₺2,290 → MAD 618.30 → MAD 618 (whole units from 10).
    expect(convertPrice(2290_00, 0.27, "MAD")).toBe(618_00);
    // ₺15 → MAD 4.05 → 4.10 (to the tenth below 10).
    expect(convertPrice(15_00, 0.27, "MAD")).toBe(4_10);
    // Never down to nothing.
    expect(convertPrice(1, 0.27, "MAD")).toBe(10);
    expect(convertPrice(0, 0.27, "MAD")).toBe(0);
    // Yen: whole yen.
    expect(convertPrice(2_00, 3.75, "JPY")).toBe(8_00);
  });

  it("a product: its price, sale price, variations and options", () => {
    const product = {
      priceCents: 2290_00,
      salePriceCents: 1990_00,
      variants: {
        attributes: [{ name: "Size", values: ["Small", "Large"] }],
        items: [
          { id: 1, values: ["Small"], priceCents: null, salePriceCents: null, stock: 3, sku: null, active: true },
          { id: 2, values: ["Large"], priceCents: 4260_00, salePriceCents: 3800_00, stock: 1, sku: null, active: true },
        ],
      },
      optionGroups: [{ id: "g", name: "Vase", min: 0, max: 1, options: [{ id: "o", name: "Glass vase", priceDeltaCents: 300_00 }] }],
    };
    expect(productAt(product, 0.27, "MAD")).toEqual({
      priceCents: 618_00,
      salePriceCents: 537_00,
      variants: {
        attributes: product.variants.attributes,
        items: [
          { ...product.variants.items[0], priceCents: null, salePriceCents: null },
          { ...product.variants.items[1], priceCents: 1150_00, salePriceCents: 1026_00 },
        ],
      },
      optionGroups: [{ id: "g", name: "Vase", min: 0, max: 1, options: [{ id: "o", name: "Glass vase", priceDeltaCents: 81_00 }] }],
    });
  });

  it("the settings: shipping in every mode, the slots' fees, a restaurant's fees, loyalty", () => {
    const settings: CatalogSettings = {
      ...DEFAULT_CATALOG_SETTINGS,
      shippingCents: 100_00,
      freeShippingOverCents: 3000_00,
      cityPrices: [{ country: "MA", city: "Marrakech", cents: 75_00 }],
      otherCityCents: 150_00,
      distancePricing: { origin: { lat: 31.6, lng: -8 }, baseCents: 80_00, perKmCents: 10_00, maxKm: 20 },
      weightPricing: { perKgCents: 20_00, includedKg: 1 },
      shippingMinCents: 50_00,
      delivery: { enabled: true, required: true, timezone: "Africa/Casablanca", sameDayCutoff: "16:00", maxDays: 14, closedWeekdays: [], slots: [{ id: "s1", start: "10:00", end: "13:00", capacity: null, feeCents: 110_00 }, { id: "s2", start: "13:00", end: "16:00", capacity: 5, feeCents: null }] } as never,
      loyalty: { spendPerPointCents: 10_00, pointValueCents: 10, minPoints: 100 } as never,
    };
    const at = settingsAt(settings, 0.27, "MAD");
    expect([at.shippingCents, at.freeShippingOverCents, at.cityPrices![0]!.cents, at.otherCityCents, at.distancePricing!.baseCents, at.distancePricing!.perKmCents, at.weightPricing!.perKgCents, at.shippingMinCents]).toEqual([27_00, 810_00, 20_00, 41_00, 22_00, 2_70, 5_40, 14_00]);
    expect(at.delivery!.slots.map((s) => s.feeCents)).toEqual([30_00, null]);
    expect(at.loyalty).toMatchObject({ spendPerPointCents: 2_70, pointValueCents: 10, minPoints: 100 });
    // The rest kept.
    expect(at.distancePricing!.origin).toEqual(settings.distancePricing!.origin);
    expect(at.currency).toBe(settings.currency);
  });

  it("the shop's records: every product, the coupons with an amount or a minimum, the flash sales with one price", async () => {
    const store = new MemoryStore();
    const appId = "app-kech";
    const base = (input: Partial<CatalogProductInput>): CatalogProductInput => ({ appId, name: "Blush Garden", description: "", priceCents: 2290_00, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null, ...input });
    const bouquet = await store.createCatalogProduct(base({}), NOW);
    const card = await store.createCatalogProduct(base({ name: "Greeting card", priceCents: 60_00, addon: true } as Partial<CatalogProductInput>), NOW);
    const coupon = (input: { code: string; kind: "percent" | "amount"; value: number; minOrderCents: number | null }) =>
      store.createCatalogCoupon({ appId, ...input, endsAt: null, maxUses: null, active: true, createdAt: NOW });
    const amount = (await coupon({ code: "KECH50", kind: "amount", value: 50_00, minOrderCents: 300_00 }))!;
    const percent = (await coupon({ code: "KECH15", kind: "percent", value: 15, minOrderCents: null }))!;
    const sale = await store.createFlashSale({ appId, title: "Roses", productIds: [bouquet.id], categoryId: null, discount: { kind: "price", cents: 1500_00 }, startsAt: NOW, endsAt: NOW, limit: null, platformCode: null, active: true, createdAt: NOW, updatedAt: NOW });
    const share = await store.createFlashSale({ appId, title: "All", productIds: [], categoryId: 1, discount: { kind: "percent", percent: 20 }, startsAt: NOW, endsAt: NOW, limit: null, platformCode: null, active: true, createdAt: NOW, updatedAt: NOW });
    const report = await convertShopRecords(store, { id: appId }, 0.27, "MAD", NOW);
    expect(report).toEqual({ products: 2, coupons: 1, flashSales: 1 });
    expect((await store.getCatalogProduct(appId, bouquet.id))!.priceCents).toBe(618_00);
    expect((await store.getCatalogProduct(appId, card.id))!.priceCents).toBe(16_00);
    const coupons = await store.listCatalogCoupons(appId);
    expect(coupons.find((c) => c.id === amount.id)).toMatchObject({ value: 14_00, minOrderCents: 81_00 });
    expect(coupons.find((c) => c.id === percent.id)).toMatchObject({ value: 15, minOrderCents: null });
    const sales = await store.listFlashSales(appId);
    expect(sales.find((s) => s.id === sale.id)!.discount).toEqual({ kind: "price", cents: 405_00 });
    expect(sales.find((s) => s.id === share.id)!.discount).toEqual({ kind: "percent", percent: 20 });
  });

  it("the log line names both currencies", () => {
    expect(currencyChangeLine("TRY", "MAD", { text: "1 TRY = 0.2700 MAD" })).toBe("Changed the shop's currency from TRY to MAD, prices converted at 1 TRY = 0.2700 MAD");
    expect(currencyChangeLine("TRY", "MAD", null)).toBe("Changed the shop's currency from TRY to MAD, prices kept as they were");
  });
});
