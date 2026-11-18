import { describe, expect, it } from "vitest";
import { formatCents, latinDigits, parsePrice } from "@/lib/catalog/money";
import { inMoneyLang } from "@/lib/owner/money-lang";
import { money } from "@/lib/owner/sales";
import { parseRefundAmount } from "@/lib/refunds/service";
import { deliveryDayLabel } from "@/lib/selling/delivery";

/**
 * 175 Money and digits in Arabic: amounts written in the viewer's language
 * (MAD reads "د.م." in Arabic, with the dashboard's Latin digits), one
 * digit system in the order drawer, and amounts typed with Arabic-Indic
 * digits read as amounts.
 */
const strip = (text: string) => text.replace(/[\u200e\u200f\u061c]/g, "").replace(/\u00a0/g, " ");

describe("175 money and digits by language", () => {
  it("formats in the viewer's language, English by default", () => {
    expect(strip(formatCents(1234_50, "MAD"))).toBe("MAD 1,234.50");
    expect(strip(formatCents(1234_50, "MAD", "ar"))).toBe("1,234.50 د.م.");
    expect(strip(formatCents(1234_50, "MAD", "tr"))).toBe("MAD 1.234,50");
    expect(formatCents(1234_50, "TRY", "tr")).toBe("₺1.234,50");
    // Latin digits in Arabic, as the dashboard writes every number.
    expect(formatCents(1234_50, "EGP", "ar")).not.toMatch(/[٠-٩]/);
    expect(formatCents(1250_00, "JPY", "en")).toBe("¥1,250");
  });

  it("the Owner API writes amounts in the person's language", () => {
    expect(strip(money(477_70, "MAD").formatted)).toBe("MAD 477.70");
    expect(strip(inMoneyLang("ar", () => money(477_70, "MAD")).formatted)).toBe("477.70 د.م.");
  });

  it("a delivery day in Arabic with Latin digits, as its slot's time", () => {
    expect(deliveryDayLabel("2026-11-19", "ar")).toBe("الخميس، 19 نوفمبر");
    expect(deliveryDayLabel("2026-11-19", "en")).toBe("Thu 19 Nov");
  });

  it("Arabic-Indic digits typed for an amount", () => {
    expect(latinDigits("٤٥٠٫٥٠")).toBe("450.50");
    expect(parsePrice("٤٥٠٫٥٠", "MAD")).toBe(450_50);
    expect(parsePrice("١٬٢٥٠", "MAD")).toBe(1250_00);
    expect(parseRefundAmount("٢٠٠")).toBe(200_00);
    expect(parseRefundAmount("۲۰۰٫۵")).toBe(200_50);
    expect(parseRefundAmount("abc")).toBeNull();
  });
});
