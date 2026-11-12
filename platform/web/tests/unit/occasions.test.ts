import { describe, expect, it } from "vitest";
import { currentOccasion, dayNextYear, isOccasionDay, newOccasion, occasionCoupon, occasionCoversPlan, occasionDaysLeft, occasionErrors, occasionForSlug, occasionNextYear, occasionState, occasionWindow } from "@/lib/occasions";

/** 124 Occasions: an offer for a season, its days in Istanbul, its coupon, and next year's. */

const NOW = new Date("2026-11-12T10:00:00Z");
const bf = newOccasion("black_friday", 2026, "o1", "team@yallapp.test", NOW);

describe("124 occasions", () => {
  it("a new Black Friday is all of November, 50% off every plan with BLACKFRIDAY50", () => {
    expect(bf).toMatchObject({ template: "black_friday", name: "Black Friday 2026", startsOn: "2026-11-01", endsOn: "2026-11-30", percent: 50, couponCode: "BLACKFRIDAY50", plans: "all", active: true });
    expect(occasionErrors(bf)).toEqual({});
  });

  it("runs whole days in Istanbul, from the first to the end of the last", () => {
    const { start, end } = occasionWindow(bf);
    expect(start.toISOString()).toBe("2026-10-31T21:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-30T20:59:59.999Z");
    expect(occasionState(bf, new Date("2026-10-31T20:59:59Z"))).toBe("upcoming");
    expect(occasionState(bf, NOW)).toBe("live");
    expect(occasionState(bf, new Date("2026-11-30T21:00:00Z"))).toBe("ended");
    expect(occasionState({ ...bf, active: false }, NOW)).toBe("off");
    expect(occasionDaysLeft(bf, NOW)).toBe(19);
    expect(occasionDaysLeft(bf, new Date("2026-11-30T12:00:00Z"))).toBe(1);
  });

  it("its coupon: the code, the percentage, the days, once per account, on any payment", () => {
    const c = occasionCoupon(bf);
    expect(c).toMatchObject({ code: "BLACKFRIDAY50", discount: { kind: "percent", percent: 50 }, plans: null, periods: null, maxPerClient: 1, maxRedemptions: null, firstPaymentOnly: false, active: true });
    expect(c.validFrom).toEqual(occasionWindow(bf).start);
    expect(occasionCoupon({ ...bf, plans: "studio" }).plans).toEqual(["studio_1", "studio_2", "studio_3", "studio_4", "studio_5", "studio_6", "studio_7", "studio_8"]);
    expect(occasionCoversPlan({ plans: "regular" }, "growth")).toBe(true);
    expect(occasionCoversPlan({ plans: "regular" }, "studio_1")).toBe(false);
  });

  it("runs again next year on the same days", () => {
    expect(occasionNextYear(bf)).toEqual({ startsOn: "2027-11-01", endsOn: "2027-11-30", active: true });
    expect(dayNextYear("2028-02-29")).toBe("2029-02-28");
  });

  it("refuses days, percentages and codes that can't be", () => {
    expect(isOccasionDay("2026-02-30")).toBe(false);
    expect(Object.keys(occasionErrors({ ...bf, endsOn: "2026-10-01" }))).toEqual(["endsOn"]);
    expect(Object.keys(occasionErrors({ ...bf, endsOn: "2027-06-01" }))).toEqual(["endsOn"]);
    expect(Object.keys(occasionErrors({ ...bf, percent: 95 }))).toEqual(["percent"]);
    expect(Object.keys(occasionErrors({ ...bf, couponCode: "bf 50" }))).toEqual(["couponCode"]);
  });

  it("the page shows the one on now, else the next, else the last", () => {
    const last = { ...bf, id: "o0", name: "Black Friday 2025", startsOn: "2025-11-01", endsOn: "2025-11-30" };
    const next = { ...bf, id: "o2", name: "Black Friday 2027", startsOn: "2027-11-01", endsOn: "2027-11-30" };
    expect(currentOccasion([last, bf, next], "black_friday", NOW)?.id).toBe("o1");
    expect(currentOccasion([last, next], "black_friday", NOW)?.id).toBe("o2");
    expect(currentOccasion([last], "black_friday", NOW)?.id).toBe("o0");
    expect(currentOccasion([], "black_friday", NOW)).toBeNull();
    expect(occasionForSlug([last, bf], "black-friday")?.id).toBe("o1");
    expect(occasionForSlug([bf], "ramadan")).toBeNull();
  });
});
