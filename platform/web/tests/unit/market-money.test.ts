import { describe, expect, it } from "vitest";
import { allocate, currencyDecimals, formatMinor, fromMinor, isCurrencyCode, percentOf, toMinor } from "@/lib/market/currency";
import { priceOrder, type PriceInput } from "@/lib/market/money";
import { buildStatement } from "@/lib/market/statement";
import { statementCsv, statementXlsx } from "@/lib/market/statement-export";
import { statementPdf } from "@/lib/market/statement-pdf";
import { crc32 } from "@/lib/market/xlsx";

const base = (over: Partial<PriceInput> = {}): PriceInput => ({
  items: [{ unitPrice: 5000, quantity: 2 }],
  deliveryFee: 2000,
  deliveryBy: "app",
  commission: { kind: "percent", value: 10 },
  collectedBy: "owner",
  ...over,
});

/** The customer's lines add up to the total: the items, their discounts, delivery and its discounts, added tax and tip. */
function linesAddUp(input: PriceInput) {
  const m = priceOrder(input);
  const included = input.tax?.included ?? false;
  const sum = m.lines.filter((l) => l.kind !== "total" && l.kind !== "wallet" && !(l.kind === "tax" && included)).reduce((s, l) => s + l.amount, 0);
  expect(sum).toBe(m.total);
  expect(m.split.vendorEarns + m.split.ownerEarns + m.tip).toBe(m.total);
  expect(m.wallet + m.payNow).toBe(m.total);
  return m;
}

describe("115.4 currencies", () => {
  it("knows every currency's decimals, not only Yallapp's", () => {
    expect(currencyDecimals("EGP")).toBe(2);
    expect(currencyDecimals("TRY")).toBe(2);
    expect(currencyDecimals("JPY")).toBe(0);
    expect(currencyDecimals("KWD")).toBe(3);
    expect(currencyDecimals("BRL")).toBe(2);
    expect(isCurrencyCode("NGN")).toBe(true);
    expect(isCurrencyCode("egp")).toBe(false);
  });

  it("reads and writes amounts in minor units", () => {
    expect(toMinor("125.5", 2)).toBe(12550);
    expect(toMinor("1,250.00", 2)).toBe(125000);
    expect(toMinor("1.250", 3)).toBe(1250);
    expect(toMinor("12", 0)).toBe(12);
    expect(toMinor("1.234", 2)).toBeNull();
    expect(toMinor("1.230", 2)).toBe(123);
    expect(toMinor("abc", 2)).toBeNull();
    expect(fromMinor(12550, 2)).toBe("125.50");
    expect(fromMinor(-500, 2)).toBe("-5.00");
    expect(fromMinor(1250, 3)).toBe("1.250");
    expect(fromMinor(7, 0)).toBe("7");
    expect(formatMinor(12550, "EGP")).toBe("EGP 125.50");
    expect(formatMinor(1250, "KWD")).toBe("KWD 1.250");
  });

  it("rounds percentages half away from zero and splits without losing a unit", () => {
    expect(percentOf(1005, 10)).toBe(101);
    expect(percentOf(1004, 12.5)).toBe(126);
    const parts = allocate(1000, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(parts).toEqual([334, 333, 333]);
    expect(allocate(-7, [1, 1])).toEqual([-4, -3]);
  });
});

describe("115.4 an order's money", () => {
  it("prices a plain order and splits it", () => {
    const m = linesAddUp(base());
    expect(m.lines.map((l) => [l.kind, l.amount])).toEqual([["items", 10000], ["delivery", 2000], ["total", 12000]]);
    expect(m.split).toMatchObject({ commission: 1000, vendorEarns: 9000, ownerEarns: 3000, dueToVendor: 9000 });
  });

  it("a coupon the vendor pays lowers its commission's base and its part", () => {
    const m = linesAddUp(base({ coupon: { kind: "percent", value: 20, funder: "vendor" } }));
    expect(m.coupon).toMatchObject({ amount: 2000, onItems: 2000 });
    expect(m.total).toBe(10000);
    expect(m.split).toMatchObject({ commission: 800, vendorEarns: 7200, ownerEarns: 2800 });
  });

  it("a coupon the owner pays leaves the vendor whole", () => {
    const m = linesAddUp(base({ coupon: { kind: "amount", value: 2000, funder: "owner" } }));
    expect(m.total).toBe(10000);
    expect(m.split).toMatchObject({ commission: 1000, vendorEarns: 9000, ownerEarns: 1000 });
  });

  it("caps a percentage coupon and never goes below zero", () => {
    expect(priceOrder(base({ coupon: { kind: "percent", value: 50, maxDiscount: 1500, funder: "owner" } })).coupon?.amount).toBe(1500);
    expect(priceOrder(base({ coupon: { kind: "amount", value: 99999, funder: "owner" } })).coupon?.amount).toBe(10000);
  });

  it("shows the struck-through prices as the vendor's item discounts", () => {
    const m = linesAddUp(base({ items: [{ unitPrice: 4000, wasUnitPrice: 5000, quantity: 2 }] }));
    expect(m.itemsBefore).toBe(10000);
    expect(m.itemDiscounts).toBe(2000);
    expect(m.lines[1]).toEqual({ kind: "item_discounts", amount: -2000 });
    expect(m.split.commission).toBe(800);
  });

  it("adds tax, or shows tax already in the prices", () => {
    const added = linesAddUp(base({ tax: { ratePercent: 14, included: false, onDelivery: false, label: "VAT" } }));
    expect(added.tax).toBe(1400);
    expect(added.total).toBe(13400);
    expect(added.split.vendorEarns).toBe(9000 + 1400);
    const included = linesAddUp(base({ items: [{ unitPrice: 5700, quantity: 2 }], tax: { ratePercent: 14, included: true, onDelivery: false, label: "VAT" } }));
    expect(included.tax).toBe(1400);
    expect(included.total).toBe(11400 + 2000);
    const both = linesAddUp(base({ tax: { ratePercent: 10, included: false, onDelivery: true, label: "KDV" } }));
    expect(both.tax).toBe(1200);
  });

  it("the vendor's own delivery is its own, even when the club makes it free", () => {
    const m = linesAddUp(base({ deliveryBy: "vendor", deliveryFee: 1500, club: { kind: "free_delivery" }, collectedBy: "vendor" }));
    expect(m.club).toBe(1500);
    expect(m.total).toBe(10000);
    expect(m.split.vendorEarns).toBe(10000 - 1000 + 1500);
    // The vendor took 100.00 in cash; the owner pays it the club's delivery, less the commission.
    expect(m.split.dueToVendor).toBe(500);
  });

  it("cash the vendor takes after the wallet paid part of it", () => {
    const m = linesAddUp(base({ deliveryBy: "vendor", deliveryFee: 0, wallet: 3000, collectedBy: "vendor" }));
    expect(m.payNow).toBe(7000);
    expect(m.split.dueToVendor).toBe(9000 - 7000);
  });

  it("weighs items sold by weight", () => {
    const m = linesAddUp(base({ items: [{ unitPrice: 8000, quantity: 1.25 }], deliveryBy: null, deliveryFee: 0 }));
    expect(m.items).toBe(10000);
    expect(m.delivery).toBe(0);
  });

  it("free delivery coupons and tips", () => {
    const m = linesAddUp(base({ coupon: { kind: "free_delivery", value: 0, funder: "owner" }, tip: 500 }));
    expect(m.deliveryDiscount).toBe(2000);
    expect(m.total).toBe(10500);
    // The app's courier keeps the tip; the vendor's part is untouched.
    expect(m.split.vendorEarns).toBe(9000);
  });

  it("always adds up, for many orders", () => {
    let seed = 7;
    const rand = (n: number) => (seed = (seed * 1103515245 + 12345) % 2147483648) % n;
    for (let i = 0; i < 400; i++) {
      linesAddUp({
        items: Array.from({ length: 1 + rand(4) }, () => ({ unitPrice: 100 + rand(9000), wasUnitPrice: rand(2) ? 10000 : null, quantity: rand(3) ? 1 + rand(3) : 0.25 * (1 + rand(8)) })),
        deliveryFee: rand(3000),
        deliveryBy: (["app", "vendor", null] as const)[rand(3)]!,
        commission: rand(2) ? { kind: "percent", value: rand(30) + 0.5 } : { kind: "fixed", value: rand(2000) },
        coupon: rand(2) ? { kind: (["percent", "amount", "free_delivery"] as const)[rand(3)]!, value: 1 + rand(50), funder: rand(2) ? "owner" : "vendor", maxDiscount: rand(2) ? 500 : null } : null,
        club: rand(3) === 0 ? { kind: rand(2) ? "free_delivery" : "delivery_percent", value: 50, minItems: rand(2) ? 5000 : null } : null,
        tax: rand(2) ? { ratePercent: [1, 8, 14, 18, 20][rand(5)]!, included: rand(2) === 1, onDelivery: rand(2) === 1, label: "Tax" } : null,
        tip: rand(3) ? 0 : rand(1000),
        wallet: rand(3) ? 0 : rand(5000),
        collectedBy: rand(2) ? "owner" : "vendor",
      });
    }
  });
});

describe("115.4 a vendor's statement", () => {
  const at = new Date("2026-11-02T12:00:00Z");
  const orderA = { id: 1, reference: "M-1", at, payment: "card" as const, money: priceOrder(base()) };
  const orderB = { id: 2, reference: "M-2", at, payment: "cash" as const, money: priceOrder(base({ deliveryBy: "vendor", deliveryFee: 1000, collectedBy: "vendor" })) };
  const outside = { id: 3, reference: "M-3", at: new Date("2026-12-01T00:00:00Z"), payment: "card" as const, money: priceOrder(base()) };
  const statement = buildStatement({
    from: new Date("2026-11-01T00:00:00Z"),
    to: new Date("2026-12-01T00:00:00Z"),
    currency: "EGP",
    orders: [outside, orderB, orderA],
    adjustments: [
      { orderId: 1, reference: "M-1", at, kind: "refund", amount: 2500, funder: "vendor" },
      { orderId: 2, reference: "M-2", at, kind: "compensation", amount: 1000, funder: "owner" },
    ],
  });

  it("adds up the period's orders and what each owes", () => {
    expect(statement.orders.map((o) => o.reference)).toEqual(["M-1", "M-2"]);
    const t = statement.totals;
    expect(t.orders).toBe(2);
    expect(t.commission).toBe(2000);
    expect(t.paidOnline).toBe(12000);
    expect(t.paidCash).toBe(11000);
    expect(t.cashHeldByVendor).toBe(11000);
    // The owner owes 90.00 for M-1; the vendor took 110.00 for M-2 and earns 100.00 of it; the vendor pays a 25.00 refund.
    expect(t.net).toBe(9000 + (10000 - 11000) - 2500);
    expect(t.refundsByVendor).toBe(2500);
    expect(t.refundsByOwner).toBe(1000);
  });

  it("exports to CSV safely, in every language", () => {
    const csv = statementCsv(statement, "en", "Africa/Cairo");
    expect(csv.startsWith("﻿Order,Date,Payment")).toBe(true);
    expect(csv).toContain("M-1,2026-11-02,Card,100,0,0,0,20,0,0,0,120,10,90,30,90");
    expect(csv).toContain("The app owner owes the vendor,55.00");
    const odd = buildStatement({ ...statement, orders: [{ ...orderA, reference: "=HYPERLINK(1)" }], adjustments: [] });
    expect(statementCsv(odd, "ar", "Africa/Cairo")).toContain("'=HYPERLINK(1)");
    expect(statementCsv(statement, "tr", "Europe/Istanbul")).toContain("Sipariş");
  });

  it("exports to Excel", () => {
    expect(crc32(new TextEncoder().encode("hello"))).toBe(0x3610a686);
    const bytes = statementXlsx(statement, "ar", "Africa/Cairo", "مطعم النخلة");
    expect(String.fromCharCode(bytes[0]!, bytes[1]!)).toBe("PK");
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("xl/worksheets/sheet3.xml");
    expect(text).toContain('rightToLeft="1"');
    expect(text).toContain("مطعم النخلة");
  });

  it("exports to PDF in English and Arabic", async () => {
    for (const lang of ["en", "ar"] as const) {
      const pdf = await statementPdf(statement, lang, "Africa/Cairo", lang === "ar" ? "مطعم النخلة" : "Nakhla Grill", "Yalla Food");
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(2000);
    }
  });
});
