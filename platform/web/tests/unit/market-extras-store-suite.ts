import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App, MarketCouponInput } from "@/lib/data/types";
import { days, NOW } from "./helpers";

/** 115.3 (part 3) Coupons, the club, joining forms and the vendors' web sign-in, the same on every store (MemoryStore, and MySQL or MariaDB with migration 0115). */
export function marketExtrasStoreSuite(store: () => DataStore) {
  async function setup(s: DataStore) {
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(s, { name: "Souk Now", email: `extras-${suffix}@market.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "food"), backend: "hosted" };
    await s.createApp(app);
    const vendor = await s.createRestaurant(
      { appId: app.id, name: "Fresh Basket", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: { address: "Maadi", details: null, lat: 29.96, lng: 31.25 }, phone: null, hours: [], prepMinutes: 15, minOrderCents: 0, maxKm: null, commissionBp: 800, active: true, position: 0, kind: "grocery" },
      { sections: [], nextId: 1 },
      NOW,
    );
    const coupon = (patch: Partial<MarketCouponInput> = {}): MarketCouponInput => ({
      appId: app.id,
      code: "welcome10",
      title: "10% off your first order",
      kind: "percent",
      value: 10,
      maxDiscount: 5000,
      minOrder: 10000,
      currency: "EGP",
      paidBy: "owner",
      firstOrderOnly: true,
      vendorIds: [],
      vendorKinds: [],
      departmentIds: [],
      usesLimit: null,
      perUserLimit: null,
      startsAt: null,
      endsAt: null,
      active: true,
      createdAt: NOW,
      updatedAt: NOW,
      ...patch,
    });
    return { app, vendor, coupon, suffix };
  }

  it("keeps coupons with uppercase codes, one code per app, and automatic offers without one", async () => {
    const s = store();
    const { app, vendor, coupon } = await setup(s);
    const made = (await s.createMarketCoupon(coupon({ vendorIds: [vendor.id], vendorKinds: ["grocery"], departmentIds: [3] })))!;
    expect(made.code).toBe("WELCOME10");
    expect(await s.createMarketCoupon(coupon({ code: "Welcome10" }))).toBeNull();
    const auto = (await s.createMarketCoupon(coupon({ code: null, title: "Free delivery over 300", kind: "free_delivery", value: 0, createdAt: days(1) })))!;
    expect(await s.createMarketCoupon(coupon({ code: null, title: "Another automatic one", createdAt: days(2) }))).not.toBeNull();
    const found = (await s.findMarketCouponByCode(app.id, " welcome10 "))!;
    expect(found).toMatchObject({ id: made.id, vendorIds: [vendor.id], vendorKinds: ["grocery"], departmentIds: [3], maxDiscount: 5000, firstOrderOnly: true });
    expect((await s.listMarketCoupons(app.id, { automatic: true })).map((c) => c.id)).toContain(auto.id);
    expect((await s.listMarketCoupons(app.id, { automatic: false })).map((c) => c.id)).toEqual([made.id]);
    expect(await s.updateMarketCoupon(app.id, auto.id, { code: "WELCOME10" })).toBe(false);
    expect(await s.updateMarketCoupon(app.id, made.id, { active: false, endsAt: days(30) })).toBe(true);
    expect((await s.listMarketCoupons(app.id, { active: false })).map((c) => c.id)).toEqual([made.id]);
    const other = await setup(s);
    expect(await s.findMarketCouponByCode(other.app.id, "WELCOME10")).toBeNull();
    expect(await s.getMarketCoupon(other.app.id, made.id)).toBeNull();
    expect(await s.deleteMarketCoupon(other.app.id, made.id)).toBe(false);
    // The same code in another app is another coupon.
    expect(await s.createMarketCoupon(other.coupon())).not.toBeNull();
    expect(await s.deleteMarketCoupon(app.id, made.id)).toBe(true);
    expect(await s.getMarketCoupon(app.id, made.id)).toBeNull();
  });

  it("115.18 keeps a place's own coupons, its products, and the owner's pause apart from its own switch", async () => {
    const s = store();
    const { app, vendor, coupon } = await setup(s);
    const owners = (await s.createMarketCoupon(coupon({ code: "OWNER" })))!;
    expect(owners).toMatchObject({ productIds: null, createdByVendorId: null, ownerPaused: false });
    const mine = (await s.createMarketCoupon(coupon({ code: "MINE", paidBy: "vendor", vendorIds: [vendor.id], productIds: [7, 9], createdByVendorId: vendor.id })))!;
    expect(await s.getMarketCoupon(app.id, mine.id)).toMatchObject({ productIds: [7, 9], createdByVendorId: vendor.id, ownerPaused: false });
    expect((await s.listMarketCoupons(app.id, { createdByVendorId: vendor.id })).map((c) => c.code)).toEqual(["MINE"]);
    expect(await s.updateMarketCoupon(app.id, mine.id, { ownerPaused: true, updatedAt: NOW })).toBe(true);
    // Paused by the owner: not active, whatever its own switch says.
    expect((await s.listMarketCoupons(app.id, { active: true })).map((c) => c.code)).toEqual(["OWNER"]);
    expect((await s.listMarketCoupons(app.id, { active: false })).map((c) => c.code)).toEqual(["MINE"]);
    expect((await s.getMarketCoupon(app.id, mine.id))!.ownerPaused).toBe(true);
  });

  it("counts a coupon's uses once per order, within the limits, and gives one back", async () => {
    const s = store();
    const { app, coupon } = await setup(s);
    const made = (await s.createMarketCoupon(coupon({ code: "TWO", usesLimit: 3, perUserLimit: 2 })))!;
    const limits = { usesLimit: 3, perUserLimit: 2 };
    const use = (orderId: number, userId: number) => ({ appId: app.id, couponId: made.id, orderId, userId, discount: 1000, createdAt: NOW });
    expect((await s.useMarketCoupon(use(1, 7), limits)).ok).toBe(true);
    expect(await s.useMarketCoupon(use(1, 7), limits)).toEqual({ ok: false, reason: "duplicate" });
    expect((await s.useMarketCoupon(use(2, 7), limits)).ok).toBe(true);
    expect(await s.useMarketCoupon(use(3, 7), limits)).toEqual({ ok: false, reason: "user_limit" });
    expect((await s.useMarketCoupon(use(4, 8), limits)).ok).toBe(true);
    expect(await s.useMarketCoupon(use(5, 9), limits)).toEqual({ ok: false, reason: "used_up" });
    expect(await s.countMarketCouponUses(app.id, made.id)).toBe(3);
    expect(await s.countMarketCouponUses(app.id, made.id, 7)).toBe(2);
    expect(await s.releaseMarketCouponUse(app.id, made.id, 2)).toBe(true);
    expect(await s.releaseMarketCouponUse(app.id, made.id, 2)).toBe(false);
    expect((await s.useMarketCoupon(use(5, 9), limits)).ok).toBe(true);
    // Two orders at once can't both take the last use.
    const last = (await s.createMarketCoupon(coupon({ code: "LAST", usesLimit: 1 })))!;
    const results = await Promise.all([1, 2, 3].map((n) => s.useMarketCoupon({ ...use(100 + n, 20 + n), couponId: last.id }, { usesLimit: 1, perUserLimit: null })));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("keeps the club's plans and one membership per customer, with what it saved", async () => {
    const s = store();
    const { app } = await setup(s);
    const plan = await s.createMarketClubPlan({ appId: app.id, name: "Club Monthly", description: null, period: "month", price: 4900, currency: "EGP", freeDeliveryOver: 15000, deliveryDiscountPercent: 50, perks: ["Members' offers"], active: true, position: 1, createdAt: NOW, updatedAt: NOW });
    const yearly = await s.createMarketClubPlan({ appId: app.id, name: "Club Yearly", description: "Two months free", period: "year", price: 49000, currency: "EGP", freeDeliveryOver: 0, deliveryDiscountPercent: null, perks: [], active: true, position: 0, createdAt: NOW, updatedAt: NOW });
    expect((await s.listMarketClubPlans(app.id)).map((p) => p.id)).toEqual([yearly.id, plan.id]);
    expect(await s.updateMarketClubPlan(app.id, plan.id, { active: false })).toBe(true);
    expect((await s.getMarketClubPlan(app.id, plan.id))!.active).toBe(false);
    const first = await s.saveMarketClubMember({ appId: app.id, userId: 7, planId: plan.id, status: "active", renews: true, startedAt: NOW, paidUntil: days(30), paymentRef: "pay_1", saved: 0 }, NOW);
    const again = await s.saveMarketClubMember({ appId: app.id, userId: 7, planId: yearly.id, status: "active", renews: false, startedAt: NOW, paidUntil: days(365), paymentRef: "pay_2", saved: 0 }, days(1));
    expect(again.id).toBe(first.id);
    expect(again).toMatchObject({ planId: yearly.id, renews: false, paymentRef: "pay_2" });
    await s.addMarketClubSaving(app.id, 7, 1500, days(2));
    await s.addMarketClubSaving(app.id, 7, 1000, days(3));
    expect((await s.getMarketClubMember(app.id, 7))!.saved).toBe(2500);
    await s.saveMarketClubMember({ appId: app.id, userId: 8, planId: plan.id, status: "cancelled", renews: false, startedAt: NOW, paidUntil: days(10), paymentRef: null, saved: 0 }, NOW);
    expect((await s.listMarketClubMembers(app.id, { status: "active", limit: 10, offset: 0 })).items.map((m) => m.userId)).toEqual([7]);
    expect((await s.listMarketClubMembers(app.id, { limit: 10, offset: 0 })).total).toBe(2);
    expect(await s.deleteMarketClubPlan(app.id, yearly.id)).toBe(true);
    expect((await s.getMarketClubMember(app.id, 7))!.planId).toBeNull();
    const other = await setup(s);
    expect(await s.getMarketClubMember(other.app.id, 7)).toBeNull();
    expect(await s.getMarketClubPlan(other.app.id, plan.id)).toBeNull();
    expect(await s.updateMarketClubPlan(other.app.id, plan.id, { name: "x" })).toBe(false);
  });

  it("keeps joining forms behind their link and their applications, decided once", async () => {
    const s = store();
    const { app, vendor, suffix } = await setup(s);
    const form = await s.createMarketApplicationForm({
      appId: app.id,
      title: "Join Souk Now",
      intro: null,
      kinds: ["restaurant", "grocery"],
      fields: [
        { key: "name", kind: "text", label: "Business name", help: null, required: true, options: [] },
        { key: "logo", kind: "logo", label: "Logo", help: null, required: false, options: [] },
        { key: "cuisine", kind: "list", label: "Cuisine", help: null, required: false, options: ["Grills", "Pizza"] },
      ],
      token: `form-${suffix}`,
      open: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect((await s.findMarketApplicationFormByToken(`form-${suffix}`))!.id).toBe(form.id);
    expect(await s.findMarketApplicationFormByToken("nope")).toBeNull();
    expect(await s.updateMarketApplicationForm(app.id, form.id, { open: false })).toBe(true);
    expect((await s.getMarketApplicationForm(app.id, form.id))!.fields[2]!.options).toEqual(["Grills", "Pizza"]);
    const application = await s.createMarketApplication({
      appId: app.id, formId: form.id, status: "new", businessName: "Grill House", kind: "restaurant", email: "Owner@Grill.test", answers: { name: "Grill House", cuisine: "Grills" }, fileAssetIds: ["asset-1"],
      message: null, vendorId: null, decidedBy: null, decidedAt: null, createdAt: NOW, updatedAt: NOW,
    });
    expect(application.email).toBe("owner@grill.test");
    expect((await s.listMarketApplications(app.id, { email: "OWNER@grill.test", limit: 10, offset: 0 })).total).toBe(1);
    expect(await s.updateMarketApplication(app.id, application.id, { status: "accepted", vendorId: vendor.id, decidedBy: "team@souk.test", decidedAt: NOW }, { statuses: ["new", "more_info"] })).toBe(true);
    expect(await s.updateMarketApplication(app.id, application.id, { status: "rejected" }, { statuses: ["new", "more_info"] })).toBe(false);
    const read = (await s.getMarketApplication(app.id, application.id))!;
    expect(read).toMatchObject({ status: "accepted", vendorId: vendor.id, answers: { cuisine: "Grills" }, fileAssetIds: ["asset-1"] });
    expect((await s.listMarketApplications(app.id, { statuses: ["accepted"], formId: form.id, limit: 10, offset: 0 })).items.map((a) => a.id)).toEqual([application.id]);
    const other = await setup(s);
    expect(await s.getMarketApplication(other.app.id, application.id)).toBeNull();
    expect(await s.getMarketApplicationForm(other.app.id, form.id)).toBeNull();
    expect(await s.deleteMarketApplicationForm(other.app.id, form.id)).toBe(false);
    expect(await s.deleteMarketApplicationForm(app.id, form.id)).toBe(true);
    expect(await s.getMarketApplication(app.id, application.id)).toBeNull();
  });

  it("keeps the vendors' web sign-in codes and sessions until they expire or the staff member is signed out", async () => {
    const s = store();
    const { app, vendor, suffix } = await setup(s);
    const made = await s.createRestaurantStaff({ appId: app.id, restaurantId: vendor.id, name: "Hany", phone: null, email: `hany-${suffix}@basket.test`, active: true, role: "owner" }, NOW);
    expect(made.ok).toBe(true);
    const staff = made.ok ? made.staff : null;
    await s.createVendorWebChallenge({ tokenHash: `c-${suffix}`, appId: app.id, email: `hany-${suffix}@basket.test`, codeHash: "h", attempts: 0, expiresAt: days(1), createdAt: NOW });
    expect(await s.addVendorWebChallengeAttempt(`c-${suffix}`)).toBe(1);
    expect(await s.addVendorWebChallengeAttempt(`c-${suffix}`)).toBe(2);
    expect((await s.getVendorWebChallenge(`c-${suffix}`))!.attempts).toBe(2);
    await s.deleteVendorWebChallenge(`c-${suffix}`);
    expect(await s.getVendorWebChallenge(`c-${suffix}`)).toBeNull();
    await s.createVendorWebSession({ idHash: `s1-${suffix}`, appId: app.id, vendorId: vendor.id, staffId: staff!.id, createdAt: NOW, expiresAt: days(30), lastSeenAt: NOW });
    await s.createVendorWebSession({ idHash: `s2-${suffix}`, appId: app.id, vendorId: vendor.id, staffId: staff!.id, createdAt: NOW, expiresAt: days(-1), lastSeenAt: NOW });
    await s.touchVendorWebSession(`s1-${suffix}`, days(1));
    expect((await s.getVendorWebSession(`s1-${suffix}`))!.lastSeenAt.getTime()).toBe(days(1).getTime());
    await s.createVendorWebChallenge({ tokenHash: `old-${suffix}`, appId: app.id, email: "x@basket.test", codeHash: "h", attempts: 0, expiresAt: days(-1), createdAt: NOW });
    await s.purgeVendorWeb(NOW);
    expect(await s.getVendorWebSession(`s2-${suffix}`)).toBeNull();
    expect(await s.getVendorWebChallenge(`old-${suffix}`)).toBeNull();
    expect(await s.getVendorWebSession(`s1-${suffix}`)).not.toBeNull();
    expect(await s.deleteVendorWebSessionsOfStaff(app.id, staff!.id)).toBe(1);
    expect(await s.getVendorWebSession(`s1-${suffix}`)).toBeNull();
  });
}
