import { describe, expect, it } from "vitest";
import { getDashT } from "@/i18n/dashboard";
import { marketOrderIdOf, ORDER_FILTERS, orderFilterOf, queueOf, queueQuery, waitParts } from "@/lib/market/support";
import { COMPLAINT_REASONS, MARKET_ORDER_STATUSES } from "@/lib/data/types";

describe("115.12 the owner's marketplace pages", () => {
  it("shows each queue its complaints", () => {
    expect(queueOf("nope")).toBe("open");
    expect(queueQuery("open", "a@b.c")).toEqual({ statuses: ["open", "in_review"] });
    expect(queueQuery("customer", "a@b.c")).toEqual({ statuses: ["waiting_for_customer"] });
    expect(queueQuery("mine", "a@b.c")).toEqual({ statuses: ["open", "in_review", "waiting_for_customer"], assignee: "a@b.c" });
    expect(queueQuery("closed", "a@b.c")).toEqual({ statuses: ["resolved", "rejected"] });
    expect(queueQuery("all", "a@b.c")).toEqual({});
  });

  it("reads order filters and references", () => {
    expect(orderFilterOf(undefined)).toBe("active");
    expect(orderFilterOf("done")).toBe("done");
    expect(ORDER_FILTERS.problems).toEqual(["rejected", "cancelled"]);
    expect(marketOrderIdOf("M-1042")).toBe(42);
    expect(marketOrderIdOf(" 1042 ")).toBe(42);
    expect(marketOrderIdOf("Mona")).toBeNull();
    expect(marketOrderIdOf("M-1000")).toBeNull();
  });

  it("says a wait in its largest unit", () => {
    expect(waitParts(12)).toEqual({ unit: "minutes", count: 12 });
    expect(waitParts(130)).toEqual({ unit: "hours", count: 2 });
    expect(waitParts(3 * 1440 + 5)).toEqual({ unit: "days", count: 3 });
  });

  it("has a word for every status, reason and payment in the three languages", () => {
    for (const lang of ["en", "ar", "tr"] as const) {
      const t = getDashT(lang);
      for (const s of MARKET_ORDER_STATUSES) expect(t(`market.st_${s}`)).not.toContain("market.");
      for (const r of COMPLAINT_REASONS) expect(t(`market.r_${r}`)).not.toContain("market.");
      for (const p of ["cash", "card", "apple_pay", "google_pay", "wallet"] as const) expect(t(`market.pay_${p}`)).not.toContain("market.");
    }
    expect(getDashT("ar")("market.complaints")).toBe("الشكاوى");
  });
});
