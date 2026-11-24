import { describe, expect, it } from "vitest";
import { formatAmount, formatMoney } from "@/lib/billing/prices";
import { formatCents } from "@/lib/catalog/money";
import { formatMinor } from "@/lib/market/currency";

/**
 * 229.4 The rest of the platform as 229 the app: the dashboard, the emails
 * and the web checkout write a whole amount without its zeros after the
 * point, a real fraction with its currency's digits, never rounded. The
 * accounting documents (receipts, payslips, payout and sales statements)
 * keep every digit, and say so (`{ exact: true }`), so neither can change
 * the other's by accident.
 */

/** The spaces Intl writes (no-break and narrow no-break) as plain ones. */
const sp = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");

describe("229.4 formatCents (the businesses' amounts)", () => {
  it("drops the zeros of a whole amount, in each of the dashboard's languages", () => {
    expect(sp(formatCents(45000, "TRY"))).toBe("₺450");
    expect(sp(formatCents(489900, "SAR"))).toBe("SAR 4,899");
    expect(sp(formatCents(500, "KWD"))).toBe("KWD 5");
    expect(sp(formatCents(0, "USD"))).toBe("$0");
    expect(sp(formatCents(125000, "JPY"))).toBe("¥1,250");
    expect(sp(formatCents(145000, "TRY", "tr"))).toBe("₺1.450");
    expect(sp(formatCents(45000, "MAD", "ar").replace(/[‏‎؜]/g, ""))).toBe("450 د.م.");
  });

  it("keeps a real fraction with all its currency's digits, never rounded", () => {
    expect(sp(formatCents(1250, "EUR"))).toBe("€12.50");
    expect(sp(formatCents(1205, "USD"))).toBe("$12.05");
    expect(sp(formatCents(125, "KWD"))).toBe("KWD 1.250");
    expect(sp(formatCents(145050, "TRY", "tr"))).toBe("₺1.450,50");
  });

  it("writes every digit when the document says so (a receipt, a payslip, a statement)", () => {
    expect(sp(formatCents(45000, "TRY", null, { exact: true }))).toBe("₺450.00");
    expect(sp(formatCents(500, "KWD", null, { exact: true }))).toBe("KWD 5.000");
    expect(sp(formatCents(145000, "TRY", "tr", { exact: true }))).toBe("₺1.450,00");
    expect(sp(formatCents(125000, "JPY", null, { exact: true }))).toBe("¥1,250");
    // The same either way for a fraction.
    expect(formatCents(1250, "EUR", null, { exact: true })).toBe(formatCents(1250, "EUR"));
  });
});

describe("229.4 formatMinor (Studio Market's money)", () => {
  it("drops the zeros of a whole amount, keeps a fraction, and keeps every digit on a statement", () => {
    expect(sp(formatMinor(30000, "USD"))).toBe("USD 300");
    expect(sp(formatMinor(30050, "USD"))).toBe("USD 300.50");
    expect(sp(formatMinor(30000, "USD", "en", { exact: true }))).toBe("USD 300.00");
    expect(sp(formatMinor(1250, "JPY"))).toBe("JPY 1,250");
  });
});

describe("229.4 Yallapp's own amounts (plans, packs, add-ons)", () => {
  it("drop the zeros of a whole amount in every currency, and keep them on a receipt", () => {
    expect(sp(formatMoney({ cents: 150000, currency: "EGP" }))).toBe("EGP 1,500");
    expect(sp(formatMoney({ cents: 150000, currency: "EGP" }, { exact: true }))).toBe("EGP 1,500.00");
    expect(sp(formatAmount(480000, "TRY"))).toBe("₺4,800");
    expect(sp(formatAmount(480050, "TRY"))).toBe("₺4,800.50");
    expect(sp(formatAmount(480000, "TRY", { exact: true }))).toBe("₺4,800.00");
    expect(sp(formatAmount(2900, "USD", { exact: true }))).toBe("$29.00");
  });
});
