import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import type { Coupon } from "@/lib/data/types";
import { newOccasion, occasionWindow } from "@/lib/occasions";
import { createOccasion, deleteOccasion, defaultOccasionYear, occasionDaysText, occasionStateLabel, readOccasionForm, runOccasionNextYear, updateOccasion, type OccasionFields } from "@/lib/occasions/admin";
import { occasionsOf } from "@/lib/occasions/store";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";

/** 124 Admin › Occasions: each save keeps the occasions in their setting and their coupon in step. */

const NOW = new Date("2026-11-12T10:00:00Z");
const TEAM = { id: "admin-1", email: "team@yallapp.test" };

function fieldsOf(year: number): OccasionFields {
  const { name, startsOn, endsOn, percent, couponCode, plans, active } = newOccasion("black_friday", year, "", "", NOW);
  return { name, startsOn, endsOn, percent, couponCode, plans, active };
}

async function created(store: MemoryStore, year = 2026) {
  const result = await createOccasion(store, { template: "black_friday", fields: fieldsOf(year) }, TEAM, NOW);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.occasion;
}

async function couponOf(store: MemoryStore, id: string | null): Promise<Coupon> {
  const coupon = id ? await store.getCoupon(id) : null;
  if (!coupon) throw new Error("no coupon");
  return coupon;
}

describe("124 Admin › Occasions", () => {
  beforeEach(() => clearPlatformSettingsCache());

  it("creating Black Friday 2026 saves it and makes its coupon: 50% off every plan in November, once per account", async () => {
    const store = new MemoryStore();
    const bf = await created(store);
    expect(await occasionsOf(store, { fresh: true })).toEqual([bf]);
    const coupon = await couponOf(store, bf.couponId);
    expect(coupon).toMatchObject({ code: "BLACKFRIDAY50", discount: { kind: "percent", percent: 50 }, plans: null, periods: null, maxPerClient: 1, active: true, createdBy: TEAM.email });
    expect(coupon.validFrom).toEqual(occasionWindow(bf).start);
    expect(coupon.validUntil).toEqual(occasionWindow(bf).end);
    expect((await store.listAuditEntries({ offset: 0, limit: 50 })).items.map((e) => e.action)).toContain("occasion.create");
  });

  it("saving changes the coupon's days, percentage and plans; extending is a later last day", async () => {
    const store = new MemoryStore();
    const bf = await created(store);
    const result = await updateOccasion(store, bf.id, { ...fieldsOf(2026), endsOn: "2026-12-07", percent: 40, plans: "studio" }, TEAM, NOW);
    expect(result.ok).toBe(true);
    const coupon = await couponOf(store, bf.couponId);
    expect(coupon.discount).toEqual({ kind: "percent", percent: 40 });
    expect(coupon.plans).toEqual(["studio_1", "studio_2", "studio_3", "studio_4", "studio_5", "studio_6", "studio_7", "studio_8"]);
    expect(coupon.validUntil?.toISOString()).toBe("2026-12-07T20:59:59.999Z");
    expect((await occasionsOf(store, { fresh: true }))[0]).toMatchObject({ endsOn: "2026-12-07", percent: 40, plans: "studio", couponId: bf.couponId });
    expect((await store.listCoupons()).length).toBe(1);
  });

  it("turning it off turns its coupon off, and on again", async () => {
    const store = new MemoryStore();
    const bf = await created(store);
    await updateOccasion(store, bf.id, { ...fieldsOf(2026), active: false }, TEAM, NOW);
    expect((await couponOf(store, bf.couponId)).active).toBe(false);
    expect(occasionStateLabel((await occasionsOf(store, { fresh: true }))[0]!, NOW).label).toBe("Off");
    await updateOccasion(store, bf.id, fieldsOf(2026), TEAM, NOW);
    expect((await couponOf(store, bf.couponId)).active).toBe(true);
  });

  it("takes over a coupon with its code that no occasion has", async () => {
    const store = new MemoryStore();
    await store.createCoupon({ id: "c-old", code: "BLACKFRIDAY50", note: "", discount: { kind: "percent", percent: 10 }, plans: ["pro"], periods: [12], validFrom: null, validUntil: null, maxRedemptions: 5, maxPerClient: null, firstPaymentOnly: true, active: false, createdAt: NOW, updatedAt: NOW, createdBy: "x" });
    const bf = await created(store);
    expect(bf.couponId).toBe("c-old");
    expect(await couponOf(store, "c-old")).toMatchObject({ discount: { percent: 50 }, plans: null, periods: null, maxRedemptions: null, maxPerClient: 1, firstPaymentOnly: false, active: true });
  });

  it("runs it again next year: a new record a year on, which takes over the coupon; refused while this year's is on", async () => {
    const store = new MemoryStore();
    const bf = await created(store);
    const early = await runOccasionNextYear(store, bf.id, TEAM, NOW);
    expect(early.ok).toBe(false);
    expect(early.ok ? "" : early.message).toMatch(/on now/);

    const december = new Date("2026-12-02T09:00:00Z");
    const next = await runOccasionNextYear(store, bf.id, TEAM, december);
    if (!next.ok) throw new Error(next.message);
    expect(next.occasion).toMatchObject({ name: "Black Friday 2027", startsOn: "2027-11-01", endsOn: "2027-11-30", percent: 50, couponCode: "BLACKFRIDAY50", active: true, couponId: bf.couponId });
    const items = await occasionsOf(store, { fresh: true });
    expect(items).toHaveLength(2);
    // Last year's stays as its record, without the coupon.
    expect(items.find((o) => o.id === bf.id)).toMatchObject({ name: "Black Friday 2026", startsOn: "2026-11-01", couponId: null });
    const coupon = await couponOf(store, bf.couponId);
    expect(coupon.validFrom?.toISOString()).toBe("2027-10-31T21:00:00.000Z");
    expect(coupon.validUntil?.toISOString()).toBe("2027-11-30T20:59:59.999Z");
    expect((await store.listCoupons()).length).toBe(1);
    expect((await store.listAuditEntries({ offset: 0, limit: 50 })).items.map((e) => e.action)).toContain("occasion.next_year");
    // Twice is the same days: refused.
    expect((await runOccasionNextYear(store, bf.id, TEAM, december)).ok).toBe(false);
  });

  it("refuses two occasions of a kind on overlapping days", async () => {
    const store = new MemoryStore();
    await created(store);
    const result = await createOccasion(store, { template: "black_friday", fields: { ...fieldsOf(2026), name: "Cyber week", startsOn: "2026-11-28", endsOn: "2026-12-03", couponCode: "CYBER30" } }, TEAM, NOW);
    expect(result.ok).toBe(false);
    expect(result.ok ? {} : result.errors).toHaveProperty("startsOn");
    expect((await store.listCoupons()).length).toBe(1);
    expect(await occasionsOf(store, { fresh: true })).toHaveLength(1);
  });

  it("refuses a code that is another occasion's coupon", async () => {
    const store = new MemoryStore();
    const bf2026 = await created(store);
    const result = await createOccasion(store, { template: "black_friday", fields: fieldsOf(2027) }, TEAM, NOW);
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.errors.couponCode).toBe("BLACKFRIDAY50 is the coupon of Black Friday 2026. Choose another code.");
    // With its own code it's fine; changing it then to 2026's code is refused too.
    const bf2027 = await createOccasion(store, { template: "black_friday", fields: { ...fieldsOf(2027), couponCode: "BLACKFRIDAY27" } }, TEAM, NOW);
    if (!bf2027.ok) throw new Error(JSON.stringify(bf2027.errors));
    const renamed = await updateOccasion(store, bf2027.occasion.id, { ...fieldsOf(2027), couponCode: "BLACKFRIDAY50" }, TEAM, NOW);
    expect(renamed.ok ? "" : renamed.errors.couponCode).toMatch(/coupon of Black Friday 2026/);
    expect((await couponOf(store, bf2026.couponId)).validFrom).toEqual(occasionWindow(bf2026).start);
  });

  it("deleting an occasion turns its coupon off and keeps it", async () => {
    const store = new MemoryStore();
    const bf = await created(store);
    expect((await deleteOccasion(store, bf.id, TEAM, NOW)).ok).toBe(true);
    expect(await occasionsOf(store, { fresh: true })).toEqual([]);
    expect((await couponOf(store, bf.couponId)).active).toBe(false);
    expect((await store.listAuditEntries({ offset: 0, limit: 50 })).items.map((e) => e.action)).toContain("occasion.delete");
    expect((await deleteOccasion(store, bf.id, TEAM, NOW)).ok).toBe(false);
  });

  it("reads the form, and says the days and the state as the list shows them", () => {
    expect(readOccasionForm({ name: " BF ", startsOn: "2026-11-01", endsOn: "2026-11-30", percent: "50", couponCode: "blackfriday50", plans: "regular", active: "on" })).toEqual({
      name: "BF",
      startsOn: "2026-11-01",
      endsOn: "2026-11-30",
      percent: 50,
      couponCode: "BLACKFRIDAY50",
      plans: "regular",
      active: true,
    });
    expect(Number.isNaN(readOccasionForm({ percent: "5.5" }).percent)).toBe(true);
    expect(occasionDaysText({ startsOn: "2026-11-01", endsOn: "2026-11-30" })).toBe("1–30 November 2026");
    expect(occasionDaysText({ startsOn: "2026-11-20", endsOn: "2026-12-02" })).toBe("20 November – 2 December 2026");
    expect(occasionDaysText({ startsOn: "2026-12-28", endsOn: "2027-01-03" })).toBe("28 December 2026 – 3 January 2027");
    const bf = newOccasion("black_friday", 2026, "o1", "", NOW);
    expect(occasionStateLabel(bf, NOW).label).toBe("On now, 19 days left");
    expect(occasionStateLabel(bf, new Date("2026-11-30T12:00:00Z")).label).toBe("On now, 1 day left");
    expect(occasionStateLabel(bf, new Date("2026-10-01T12:00:00Z")).label).toBe("Upcoming");
    expect(occasionStateLabel(bf, new Date("2026-12-01T12:00:00Z")).label).toBe("Ended");
    expect(defaultOccasionYear("black_friday", NOW)).toBe(2026);
    expect(defaultOccasionYear("black_friday", new Date("2026-12-01T00:00:00Z"))).toBe(2027);
  });
});
