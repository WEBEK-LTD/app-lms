import { describe, expect, it } from "vitest";
import { parseClubPlanForm, parseCouponForm } from "@/lib/market/offer-forms";

const NOW = new Date("2026-11-04T10:00:00Z");
const base = { appId: "app-1", currency: "EGP", now: NOW };

describe("115.12 the owner's coupon and club forms", () => {
  it("reads a percentage code with its limits, dates and who bears it", () => {
    const r = parseCouponForm({ title: "Lunch", code: " lunch 40 ", kind: "percent", value: "40", max_discount: "75", min_order: "150.50", uses_limit: "500", per_user_limit: "1", starts: "2026-11-05", ends: "2026-11-30", paid_by: "vendor", first_order: "1" }, base);
    expect(r).toMatchObject({ ok: true, value: { code: "LUNCH40", kind: "percent", value: 40, maxDiscount: 7500, minOrder: 15050, usesLimit: 500, perUserLimit: 1, paidBy: "vendor", firstOrderOnly: true } });
    if (r.ok) expect(r.value.endsAt!.toISOString()).toBe("2026-11-30T23:59:59.999Z");
  });

  it("makes an automatic offer without a code, and refuses what doesn't add up", () => {
    expect(parseCouponForm({ title: "Free delivery", kind: "free_delivery" }, base)).toMatchObject({ ok: true, value: { code: null, value: 0, minOrder: 0 } });
    expect(parseCouponForm({ title: "x", kind: "percent", value: "140" }, base)).toMatchObject({ ok: false, field: "value" });
    expect(parseCouponForm({ title: "x", kind: "amount", value: "" }, base)).toMatchObject({ ok: false, field: "value" });
    expect(parseCouponForm({ title: "x", code: "a!", kind: "free_delivery" }, base)).toMatchObject({ ok: false, field: "code" });
    expect(parseCouponForm({ title: "x", kind: "free_delivery", starts: "2026-11-10", ends: "2026-11-09" }, base)).toMatchObject({ ok: false, field: "ends" });
  });

  it("reads club plans with the owner's price and the delivery benefit", () => {
    const free = parseClubPlanForm({ name: "Club Monthly", period: "month", price: "49", benefit: "free", free_over: "100", perks: "Members' offers\n\n  Priority support " }, { ...base, position: 0 });
    expect(free).toMatchObject({ ok: true, value: { price: 4900, freeDeliveryOver: 10000, deliveryDiscountPercent: null, perks: ["Members' offers", "Priority support"] } });
    expect(parseClubPlanForm({ name: "Half", period: "year", price: "0", benefit: "percent", delivery_percent: "50" }, { ...base, position: 1 })).toMatchObject({ ok: true, value: { price: 0, deliveryDiscountPercent: 50 } });
    expect(parseClubPlanForm({ name: "x", period: "week", price: "1", benefit: "free" }, { ...base, position: 0 })).toMatchObject({ ok: false, field: "period" });
    expect(parseClubPlanForm({ name: "x", period: "month", price: "", benefit: "free" }, { ...base, position: 0 })).toMatchObject({ ok: false, field: "price" });
  });
});
