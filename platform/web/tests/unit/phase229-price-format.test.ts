import { describe, expect, it } from "vitest";
import { cleanPrices, fromPrice, wholeText } from "@/lib/money/clean";

/**
 * 229 Prices that read cleanly in every app: a whole amount without its
 * zeros after the point, a real fraction as it is, and a product whose
 * variations cost differently from its cheapest one, in the app's language.
 */

const range = (formatted: string, display?: object) => ({ amount: "4899.00", max_amount: "6499.00", currency: "SAR", formatted, range: true, on_sale: false, ...(display ? { display } : {}) });

describe("229 a price from its cheapest", () => {
  it("reads in each language", () => {
    expect(fromPrice("SAR 4,899", "en")).toBe("From SAR 4,899");
    expect(fromPrice("SAR 4,899", "ar")).toBe("من SAR 4,899");
    expect(fromPrice("4.899 TL", "tr")).toBe("4.899 TL ve üzeri");
    expect(fromPrice("SAR 4,899", null)).toBe("From SAR 4,899");
  });

  it("is a range's text in place of its two ends, its display too", () => {
    const display = { amount: "1306.40", max_amount: "1733.07", currency: "USD", formatted: "$1,306.40 – $1,733.07", rate: 0.2667, rate_date: "2026-11-24" };
    for (const [lang, text, shown] of [
      ["en", "From SAR 4,899", "From $1,306.40"],
      ["ar", "من SAR 4,899", "من $1,306.40"],
      ["tr", "SAR 4,899 ve üzeri", "$1,306.40 ve üzeri"],
    ] as const) {
      const price = cleanPrices(range("SAR 4,899.00 – SAR 6,499.00", { ...display }), lang);
      expect(price.formatted).toBe(text);
      expect((price.display as { formatted: string }).formatted).toBe(shown);
      // Amounts never change: the app still knows both ends.
      expect(price).toMatchObject({ amount: "4899.00", max_amount: "6499.00" });
    }
    // A cheapest end with a real fraction keeps it.
    expect(cleanPrices({ ...range("€12.50 – €20.00"), amount: "12.50", currency: "EUR" }, "en").formatted).toBe("From €12.50");
    // A text that isn't two prices joined by a dash is only trimmed.
    expect(cleanPrices(range("SAR 4,899.00"), "en").formatted).toBe("SAR 4,899");
  });
});

describe("229 whole amounts", () => {
  it("lose their zeros after the point, in the text's own style", () => {
    expect(wholeText("SAR 4,899.00", 4899, "SAR")).toBe("SAR 4,899");
    expect(wholeText("₺1.450,00", 1450, "TRY")).toBe("₺1.450");
    expect(wholeText("+E£20.00", 20, "EGP")).toBe("+E£20");
    expect(wholeText("‏1,450.00 ج.م.‏", 1450, "EGP")).toBe("‏1,450 ج.م.‏");
    expect(wholeText("KWD 5.000", 5, "KWD")).toBe("KWD 5");
    expect(wholeText("₺0.00", 0, "TRY")).toBe("₺0");
  });

  it("are never cut otherwise: a real fraction, a text with none, another amount's text, a currency without digits", () => {
    expect(wholeText("€12.50", 12.5, "EUR")).toBe("€12.50");
    expect(wholeText("KWD 1.250", 1.25, "KWD")).toBe("KWD 1.250");
    expect(wholeText("EGP 4,250,000", 4250000, "EGP")).toBe("EGP 4,250,000");
    expect(wholeText("KWD 5,000", 5000, "KWD")).toBe("KWD 5,000");
    expect(wholeText("$18.00", 19, "USD")).toBe("$18.00");
    expect(wholeText("¥1,250", 1250, "JPY")).toBe("¥1,250");
  });
});

describe("229 every money object in an answer", () => {
  it("a sale: its price and its price before", () => {
    const price = cleanPrices({ amount: "450.00", regular_amount: "600.00", regular_formatted: "₺600.00", currency: "TRY", formatted: "₺450.00", on_sale: true, range: false }, "tr");
    expect(price).toMatchObject({ formatted: "₺450", regular_formatted: "₺600", amount: "450.00", regular_amount: "600.00" });
    const fraction = cleanPrices({ amount: "449.90", regular_amount: "600.00", regular_formatted: "₺600.00", currency: "TRY", formatted: "₺449.90", on_sale: true, range: false }, "tr");
    expect(fraction).toMatchObject({ formatted: "₺449.90", regular_formatted: "₺600" });
  });

  it("a cart: its totals and its lines, in the cart's currency", () => {
    const cart = cleanPrices(
      {
        currency: "USD",
        subtotal_amount: "36.00",
        subtotal: "$36.00",
        total_amount: "31.50",
        total: "$31.50",
        shipping_amount: "0.00",
        shipping: "$0.00",
        lines: [{ quantity: 2, unit_price_amount: "18.00", unit_price: "$18.00", line_total_amount: "36.00", line_total: "$36.00" }],
      },
      "en",
    );
    expect(cart).toMatchObject({ subtotal: "$36", total: "$31.50", shipping: "$0", lines: [{ unit_price: "$18", line_total: "$36" }] });
  });

  it("leaves what isn't a price as it is", () => {
    const body = { title: "4,899.00 reasons", currency: "pounds", amount: "5.00", formatted: "5.00 pounds", items: [{ code: "A1", count: "3" }] };
    expect(cleanPrices(structuredClone(body), "en")).toEqual(body);
  });
});
