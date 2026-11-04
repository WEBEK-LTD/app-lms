import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App, MarketCouponInput } from "@/lib/data/types";
import { priceOrder } from "@/lib/market/money";
import {
  bestAutomaticOffer,
  cancelClub,
  checkCoupon,
  clubBenefit,
  clubDue,
  couponFromCode,
  joinClub,
  payFromWallet,
  personalCoupon,
  recordClubSaving,
  redeemCoupon,
  renewClub,
  returnToWallet,
  type CouponContext,
} from "@/lib/market/offers";
import { days, NOW } from "./helpers";

async function setup() {
  const store = new MemoryStore();
  const { client } = await registerClient(store, { name: "Souk", email: `o-${Math.random()}@market.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
  const app: App = { ...newApp(client.id, null, NOW, "food"), backend: "hosted" };
  await store.createApp(app);
  const coupon = (patch: Partial<MarketCouponInput> = {}): MarketCouponInput => ({
    appId: app.id, code: "SAVE10", title: "10% off", kind: "percent", value: 10, maxDiscount: null, minOrder: 0, currency: "EGP", paidBy: "owner", firstOrderOnly: false,
    vendorIds: [], vendorKinds: [], departmentIds: [], usesLimit: null, perUserLimit: null, startsAt: null, endsAt: null, active: true, createdAt: NOW, updatedAt: NOW, ...patch,
  });
  return { store, app, coupon };
}

const ctx = (patch: Partial<CouponContext> = {}): CouponContext => ({ now: NOW, vendorId: 1, vendorKind: "grocery", lines: [{ departmentId: 3, total: 20000 }, { departmentId: 4, total: 10000 }], userId: 7, firstOrder: false, uses: 0, userUses: 0, ...patch });
const base = (c: Partial<MarketCouponInput>) => ({ id: 1, appId: "a", code: "X", title: "x", kind: "percent" as const, value: 10, maxDiscount: null, minOrder: 0, currency: "EGP", paidBy: "owner" as const, firstOrderOnly: false, vendorIds: [], vendorKinds: [], departmentIds: [], usesLimit: null, perUserLimit: null, startsAt: null, endsAt: null, active: true, createdAt: NOW, updatedAt: NOW, ...c });

describe("115.10 coupons", () => {
  it("checks dates, the smallest order, first orders, vendors, kinds and uses", () => {
    expect(checkCoupon(base({ active: false }), ctx())).toMatchObject({ ok: false, refusal: "inactive" });
    expect(checkCoupon(base({ startsAt: days(1) }), ctx())).toMatchObject({ refusal: "not_started" });
    expect(checkCoupon(base({ endsAt: NOW }), ctx())).toMatchObject({ refusal: "ended" });
    expect(checkCoupon(base({ minOrder: 30001 }), ctx())).toMatchObject({ refusal: "min_order" });
    expect(checkCoupon(base({ firstOrderOnly: true }), ctx())).toMatchObject({ refusal: "first_order_only" });
    expect(checkCoupon(base({ firstOrderOnly: true }), ctx({ userId: null }))).toMatchObject({ refusal: "sign_in" });
    expect(checkCoupon(base({ vendorIds: [2] }), ctx())).toMatchObject({ refusal: "wrong_vendor" });
    expect(checkCoupon(base({ vendorKinds: ["restaurant"] }), ctx())).toMatchObject({ refusal: "wrong_kind" });
    expect(checkCoupon(base({ departmentIds: [9] }), ctx())).toMatchObject({ refusal: "wrong_department" });
    expect(checkCoupon(base({ usesLimit: 5 }), ctx({ uses: 5 }))).toMatchObject({ refusal: "used_up" });
    expect(checkCoupon(base({ perUserLimit: 1 }), ctx({ userUses: 1 }))).toMatchObject({ refusal: "user_limit" });
    expect(checkCoupon(base({ firstOrderOnly: true, vendorIds: [1], minOrder: 30000 }), ctx({ firstOrder: true }))).toMatchObject({ ok: true, coupon: { kind: "percent", value: 10, funder: "owner" } });
  });

  it("becomes the money engine's coupon: a percentage, an amount, free delivery, or a department's share", () => {
    const pct = checkCoupon(base({ kind: "percent", value: 20, maxDiscount: 5000, paidBy: "vendor" }), ctx());
    if (!pct.ok) throw new Error();
    const money = priceOrder({ items: [{ unitPrice: 20000, quantity: 1 }, { unitPrice: 10000, quantity: 1 }], deliveryFee: 1500, deliveryBy: "app", commission: { kind: "percent", value: 10 }, collectedBy: "owner", coupon: pct.coupon });
    expect(money.coupon).toEqual({ amount: 5000, onItems: 5000, onDelivery: 0, funder: "vendor" });
    // Limited to department 4 (10,000 of the items): 20% of those.
    const dept = checkCoupon(base({ kind: "percent", value: 20, departmentIds: [4] }), ctx());
    expect(dept).toMatchObject({ ok: true, coupon: { kind: "amount", value: 2000 }, discountBase: 10000 });
    expect(checkCoupon(base({ kind: "amount", value: 50000, departmentIds: [4] }), ctx())).toMatchObject({ ok: true, coupon: { kind: "amount", value: 10000 } });
    expect(checkCoupon(base({ kind: "free_delivery", paidBy: "vendor" }), ctx())).toMatchObject({ ok: true, coupon: { kind: "free_delivery", funder: "vendor" } });
  });

  it("finds typed codes, picks the best automatic offer, and counts uses once per order", async () => {
    const { store, app, coupon } = await setup();
    const typed = (await store.createMarketCoupon(coupon({ code: "save10", usesLimit: 1 })))!;
    expect(await couponFromCode(store, app.id, "nope", ctx())).toMatchObject({ ok: false, refusal: "inactive" });
    const found = await couponFromCode(store, app.id, " Save10 ", ctx());
    expect(found).toMatchObject({ ok: true, record: { id: typed.id } });
    expect(await redeemCoupon(store, typed, { id: 1, userId: 7 }, 3000, NOW)).toEqual({ ok: true });
    expect(await redeemCoupon(store, typed, { id: 1, userId: 7 }, 3000, NOW)).toEqual({ ok: true });
    expect(await redeemCoupon(store, typed, { id: 2, userId: 8 }, 3000, NOW)).toEqual({ ok: false, error: "This code has been used up." });
    expect(await couponFromCode(store, app.id, "SAVE10", ctx({ userId: 8 }))).toMatchObject({ ok: false, refusal: "used_up" });
    await store.createMarketCoupon(coupon({ code: null, title: "5% off", value: 5 }));
    await store.createMarketCoupon(coupon({ code: null, title: "Free delivery", kind: "free_delivery", value: 0 }));
    await store.createMarketCoupon(coupon({ code: null, title: "Big but ended", value: 50, endsAt: days(-1) }));
    // 5% of 30,000 is 1,500; free delivery is worth the 2,000 fee.
    expect((await bestAutomaticOffer(store, app.id, ctx(), 2000))!.record.title).toBe("Free delivery");
    expect((await bestAutomaticOffer(store, app.id, ctx(), 1000))!.record.title).toBe("5% off");
    expect(await bestAutomaticOffer(store, app.id, ctx({ lines: [] }), 0)).toBeNull();
  });

  it("makes one-person coupons for compensations, used once", async () => {
    const { store, app } = await setup();
    const c = await personalCoupon(store, { appId: app.id, userId: 7, amount: 2500, currency: "EGP", funder: "vendor", title: "Sorry about your order" }, NOW);
    expect(c.code).toMatch(/^SORRY-[A-Z2-9]{6}$/);
    expect(c).toMatchObject({ kind: "amount", value: 2500, usesLimit: 1, perUserLimit: 1, paidBy: "vendor" });
    expect(c.endsAt!.getTime()).toBe(NOW.getTime() + 90 * 86_400_000);
  });
});

describe("115.10 the wallet", () => {
  it("pays part of an order once, never past the balance, and gives it back when the order is cancelled", async () => {
    const { store, app } = await setup();
    await store.addWalletEntry({ appId: app.id, userId: 7, kind: "credit", amount: 4000, label: "Credit", orderId: null, complaintId: null, key: "credit:1", createdAt: NOW });
    expect(await payFromWallet(store, { appId: app.id, userId: 7, orderId: 5, amount: 6000 }, NOW)).toBe(4000);
    expect(await store.walletBalance(app.id, 7)).toBe(0);
    expect(await payFromWallet(store, { appId: app.id, userId: 7, orderId: 5, amount: 6000 }, NOW)).toBe(0);
    expect(await returnToWallet(store, { appId: app.id, userId: 7, orderId: 5, amount: 4000 }, NOW)).toBe(true);
    expect(await returnToWallet(store, { appId: app.id, userId: 7, orderId: 5, amount: 4000 }, NOW)).toBe(false);
    expect(await store.walletBalance(app.id, 7)).toBe(4000);
  });
});

describe("115.10 the club", () => {
  it("joins, gives its delivery benefit while paid, renews from the end of the period, and ends", async () => {
    const { store, app } = await setup();
    const monthly = await store.createMarketClubPlan({ appId: app.id, name: "Club", description: null, period: "month", price: 4900, currency: "EGP", freeDeliveryOver: 15000, deliveryDiscountPercent: null, perks: [], active: true, position: 0, createdAt: NOW, updatedAt: NOW });
    const half = await store.createMarketClubPlan({ appId: app.id, name: "Club lite", description: null, period: "year", price: 19900, currency: "EGP", freeDeliveryOver: null, deliveryDiscountPercent: 50, perks: [], active: true, position: 1, createdAt: NOW, updatedAt: NOW });
    const member = await joinClub(store, monthly, 7, "pay_1", NOW);
    expect(member).toMatchObject({ status: "active", renews: true, planId: monthly.id });
    expect(member.paidUntil!.toISOString()).toBe("2026-11-12T10:00:00.000Z");
    expect(clubBenefit(member, monthly, days(5))).toEqual({ kind: "free_delivery", minItems: 15000 });
    expect(clubBenefit(member, monthly, days(32))).toBeNull();
    // With the money engine: free delivery only over 150.
    const small = priceOrder({ items: [{ unitPrice: 10000, quantity: 1 }], deliveryFee: 2000, deliveryBy: "app", commission: { kind: "percent", value: 10 }, collectedBy: "owner", club: clubBenefit(member, monthly, NOW) });
    const big = priceOrder({ items: [{ unitPrice: 20000, quantity: 1 }], deliveryFee: 2000, deliveryBy: "app", commission: { kind: "percent", value: 10 }, collectedBy: "owner", club: clubBenefit(member, monthly, NOW) });
    expect([small.club, big.club]).toEqual([0, 2000]);
    await recordClubSaving(store, app.id, 7, big.club, NOW);
    expect((await store.getMarketClubMember(app.id, 7))!.saved).toBe(2000);
    const renewed = await renewClub(store, monthly, (await store.getMarketClubMember(app.id, 7))!, "pay_2", days(20));
    expect(renewed.paidUntil!.toISOString()).toBe("2026-12-12T10:00:00.000Z");
    const cancelled = await cancelClub(store, renewed, days(21));
    expect(cancelled).toMatchObject({ status: "cancelled", renews: false });
    expect(clubBenefit(cancelled, monthly, days(40))).not.toBeNull();
    // A second member on a yearly plan that renews: due a payment when it ends; the cancelled one expires.
    const other = await joinClub(store, half, 8, "pay_3", NOW);
    expect(clubBenefit(other, half, NOW)).toEqual({ kind: "delivery_percent", value: 50 });
    expect(clubBenefit(other, monthly, NOW)).toBeNull();
    const due = await clubDue(store, app.id, days(400));
    expect(due.expired).toBe(1);
    expect(due.renewals.map((m) => m.userId)).toEqual([8]);
    expect((await store.getMarketClubMember(app.id, 7))!.status).toBe("expired");
  });
});
