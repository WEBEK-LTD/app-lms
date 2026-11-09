import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_HOSTED_SETTINGS, type App, type DeliverySettings, type Restaurant, type RestaurantInput, type RestaurantMenu } from "@/lib/data/types";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { priceMarketCart, type Cart } from "@/lib/market/cart";
import { can, tabsFor } from "@/lib/market/panel-pages";
import { parseMarketSettingsForm } from "@/lib/market/settings-form";
import { marketSettingsOf } from "@/lib/market/settings";
import { buildStatement } from "@/lib/market/statement";
import { createVendorCoupon, listVendorCoupons, ownerPauseVendorCoupon, setVendorCoupon, vendorCoupon, type VendorCouponScope } from "@/lib/market/vendor-coupons";
import { NOW, setupClient } from "./helpers";

const EVERY_DAY = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((day) => ({ day, opens: "00:00", closes: "23:59" }));
const SETTINGS: DeliverySettings = {
  ...DEFAULT_DELIVERY_SETTINGS,
  currency: "EGP",
  pricing: "fixed",
  baseCents: 20_00,
  cash: true,
  timezone: "Africa/Cairo",
  marketApp: {
    country: "EG",
    currency: null,
    tax: { ratePercent: 0, included: true, onDelivery: false, label: "VAT" },
    payment: { gateway: null, cash: true, cashMax: null, applePay: false, googlePay: false },
    pickup: true,
    scheduling: { enabled: false, daysAhead: 3 },
    club: false,
    wallet: false,
    weightTolerancePercent: 10,
    vendorApp: "same",
    requirePhotos: false,
  },
};
// Two sections: Mains (koshari 50, fatta 80) and Desserts (om ali 30).
const MENU: RestaurantMenu = {
  sections: [
    { id: 1, name: "Mains", dishes: [{ id: 2, name: "Koshari", description: null, imageAssetId: null, priceCents: 50_00, available: true, popular: false, choiceGroups: [] }, { id: 3, name: "Fatta", description: null, imageAssetId: null, priceCents: 80_00, available: true, popular: false, choiceGroups: [] }] },
    { id: 4, name: "Desserts", dishes: [{ id: 5, name: "Om Ali", description: null, imageAssetId: null, priceCents: 30_00, available: true, popular: false, choiceGroups: [] }] },
  ],
  nextId: 6,
};
const vendor = (appId: string, patch: Partial<RestaurantInput> = {}): RestaurantInput => ({
  appId, name: "Abou Tarek", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: { address: "Tahrir", details: null, lat: 30.04, lng: 31.23 }, phone: null,
  hours: EVERY_DAY, prepMinutes: 20, minOrderCents: 0, maxKm: null, commissionBp: 1000, active: true, position: 1, ...patch,
});
const form = (fields: Record<string, string>) => ({ title: "Spring offer", kind: "percent", value: "20", ...fields });
const cart = (vendorId: number, lines: [number, number][], couponCode: string | null): Cart => ({
  vendorId, lines: lines.map(([productId, quantity]) => ({ productId, quantity, choices: [], note: null, ifMissing: "remove", substituteProductId: null })),
  fulfilment: "pickup", dropoff: null, scheduledFor: null, couponCode, useWallet: false, tip: 0,
});

describe("115.18 places' own coupons and offers", () => {
  let store: MemoryStore;
  let app: App;
  let mine: Restaurant;
  let theirs: Restaurant;
  let scope: VendorCouponScope;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "food", "marketplace");
    app = { ...base, backend: "hosted", connector: { kind: "restaurants" }, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings } };
    await store.createApp(app);
    await store.saveDeliverySettings(app.id, SETTINGS, NOW);
    mine = await store.createRestaurant(vendor(app.id, { delivery: { by: "vendor", feeKind: "fixed", fee: 15_00, perKm: 0, freeOver: null, minItems: null, maxItems: null, pickup: true, scheduling: false } }), MENU, NOW);
    theirs = await store.createRestaurant(vendor(app.id, { name: "Felfela", position: 2, delivery: { by: "app", feeKind: "fixed", fee: 0, perKm: 0, freeOver: null, minItems: null, maxItems: null, pickup: true, scheduling: false } }), MENU, NOW);
    scope = { store, appId: app.id, vendor: mine, currency: "EGP" };
  });

  it("makes a coupon for this place alone, paid by it, on its own sections and dishes only", async () => {
    const made = await createVendorCoupon(scope, form({ code: "mine20", group_1: "1", product_5: "1", product_999: "1", group_77: "1", paid_by: "owner" }), NOW);
    expect(made.ok).toBe(true);
    const c = made.ok ? made.coupon : null;
    // Another place's or unknown sections and dishes are dropped; the owner never pays.
    expect(c).toMatchObject({ code: "MINE20", paidBy: "vendor", vendorIds: [mine.id], departmentIds: [1], productIds: [5], createdByVendorId: mine.id, active: true });
  });

  it("gives free delivery only to places that deliver themselves, and keeps the owner's largest percentage", async () => {
    const other = { ...scope, vendor: theirs };
    expect(await createVendorCoupon(other, form({ kind: "free_delivery" }), NOW)).toMatchObject({ ok: false, field: "kind" });
    expect(await createVendorCoupon(scope, form({ kind: "free_delivery" }), NOW)).toMatchObject({ ok: true });
    await store.saveDeliverySettings(app.id, { ...SETTINGS, marketApp: { ...SETTINGS.marketApp!, vendorCoupons: { enabled: true, maxPercent: 15 } } }, NOW);
    expect(await createVendorCoupon(scope, form({ value: "20" }), NOW)).toMatchObject({ ok: false, field: "value" });
    expect(await createVendorCoupon(scope, form({ value: "15" }), NOW)).toMatchObject({ ok: true });
    await store.saveDeliverySettings(app.id, { ...SETTINGS, marketApp: { ...SETTINGS.marketApp!, vendorCoupons: { enabled: false, maxPercent: null } } }, NOW);
    expect(await createVendorCoupon(scope, form({}), NOW)).toMatchObject({ ok: false });
  });

  it("never shows, changes or applies one place's coupon for another (isolation)", async () => {
    const made = await createVendorCoupon(scope, form({ code: "MINE20" }), NOW);
    const id = made.ok ? made.coupon.id : 0;
    const other = { ...scope, vendor: theirs };
    expect(await listVendorCoupons(other)).toEqual([]);
    expect(await vendorCoupon(other, id)).toBeNull();
    expect(await setVendorCoupon(other, id, "pause", NOW)).toMatchObject({ ok: false });
    expect((await store.getMarketCoupon(app.id, id))!.active).toBe(true);
    // The owner's own coupons aren't in a place's list either.
    await store.createMarketCoupon({ appId: app.id, code: "OWNER", title: "Owner", kind: "amount", value: 10_00, maxDiscount: null, minOrder: 0, currency: "EGP", paidBy: "owner", firstOrderOnly: false, vendorIds: [], vendorKinds: [], departmentIds: [], usesLimit: null, perUserLimit: null, startsAt: null, endsAt: null, active: true, createdAt: NOW, updatedAt: NOW });
    expect((await listVendorCoupons(scope)).map((c) => c.code)).toEqual(["MINE20"]);
    // Typed at the other place, it's refused.
    const there = await priceMarketCart(store, { appId: app.id, delivery: SETTINGS, cart: cart(theirs.id, [[2, 1]], "MINE20"), userId: null, now: NOW });
    expect(there.ok && there.priced.coupon).toBeFalsy();
    expect(there.ok && there.priced.couponRefused).toBe("This code isn't for this place.");
  });

  it("discounts only the place's chosen items, paid by the place in its statement", async () => {
    // 20% on desserts only: Koshari 50 + Om Ali 30 → 6 off.
    const made = await createVendorCoupon(scope, form({ code: "SWEET", group_4: "1" }), NOW);
    expect(made.ok).toBe(true);
    const priced = await priceMarketCart(store, { appId: app.id, delivery: SETTINGS, cart: cart(mine.id, [[2, 1], [5, 1]], "SWEET"), userId: null, now: NOW });
    if (!priced.ok) throw new Error(JSON.stringify(priced.refusal));
    expect(priced.priced.coupon?.code).toBe("SWEET");
    expect(priced.priced.money.coupon).toMatchObject({ amount: 6_00, funder: "vendor" });
    const statement = buildStatement({ from: new Date(NOW.getTime() - 1000), to: new Date(NOW.getTime() + 1000), currency: "EGP", orders: [{ id: 1, reference: "A1", at: NOW, payment: "cash", money: priced.priced.money }], adjustments: [] });
    expect(statement.totals.couponsByVendor).toBe(6_00);
    expect(statement.totals.couponsByOwner).toBe(0);
    // Without a dessert, it's for other products.
    const none = await priceMarketCart(store, { appId: app.id, delivery: SETTINGS, cart: cart(mine.id, [[2, 1]], "SWEET"), userId: null, now: NOW });
    expect(none.ok && none.priced.couponRefused).toBe("This code is for other products.");
  });

  it("pauses, starts again and ends; the owner's pause holds and only the owner lifts it", async () => {
    const made = await createVendorCoupon(scope, form({ code: "HOLD" }), NOW);
    const id = made.ok ? made.coupon.id : 0;
    expect(await setVendorCoupon(scope, id, "pause", NOW)).toEqual({ ok: true });
    expect((await store.getMarketCoupon(app.id, id))!.active).toBe(false);
    expect(await setVendorCoupon(scope, id, "resume", NOW)).toEqual({ ok: true });
    expect(await ownerPauseVendorCoupon(store, app.id, id, true, NOW)).toBe(true);
    expect(await setVendorCoupon(scope, id, "resume", NOW)).toMatchObject({ ok: false });
    expect(await store.listMarketCoupons(app.id, { active: true })).toEqual([]);
    const paused = await priceMarketCart(store, { appId: app.id, delivery: SETTINGS, cart: cart(mine.id, [[2, 1]], "HOLD"), userId: null, now: NOW });
    expect(paused.ok && paused.priced.coupon).toBeFalsy();
    expect(await ownerPauseVendorCoupon(store, app.id, id, false, NOW)).toBe(true);
    expect((await store.listMarketCoupons(app.id, { active: true })).map((c) => c.id)).toEqual([id]);
    expect(await setVendorCoupon(scope, id, "end", NOW)).toEqual({ ok: true });
    expect(await setVendorCoupon(scope, id, "resume", new Date(NOW.getTime() + 1000))).toMatchObject({ ok: false });
    // The owner can only pause what places made.
    const owners = await store.createMarketCoupon({ appId: app.id, code: "OWN", title: "Owner", kind: "amount", value: 1_00, maxDiscount: null, minOrder: 0, currency: "EGP", paidBy: "owner", firstOrderOnly: false, vendorIds: [], vendorKinds: [], departmentIds: [], usesLimit: null, perUserLimit: null, startsAt: null, endsAt: null, active: true, createdAt: NOW, updatedAt: NOW });
    expect(await ownerPauseVendorCoupon(store, app.id, owners!.id, true, NOW)).toBe(false);
  });

  it("lets the place's owner and managers make offers, not its order takers or pickers", () => {
    expect(tabsFor("owner")).toContain("offers");
    expect(tabsFor("manager")).toContain("offers");
    expect(tabsFor("orders")).not.toContain("offers");
    expect(tabsFor("picker")).not.toContain("offers");
    expect(can({ role: "orders" } as never, "offers")).toBe(false);
  });

  it("keeps the owner's choice: on by default, with an optional largest percentage", () => {
    expect(marketSettingsOf({}).vendorCoupons).toBeUndefined();
    const values = { country: "EG", currency: "", tax_rate: "0", tax_label: "VAT", cash: "on", weight_tolerance: "10" };
    const on = parseMarketSettingsForm({ ...values, vendor_coupons: "on", vendor_coupon_max: "25" }, marketSettingsOf({}), "EGP");
    expect(on.ok && on.value.vendorCoupons).toEqual({ enabled: true, maxPercent: 25 });
    const off = parseMarketSettingsForm(values, marketSettingsOf({}), "EGP");
    expect(off.ok && off.value.vendorCoupons).toEqual({ enabled: false, maxPercent: null });
    expect(parseMarketSettingsForm({ ...values, vendor_coupons: "on", vendor_coupon_max: "150" }, marketSettingsOf({}), "EGP")).toMatchObject({ ok: false, field: "vendor_coupon_max" });
  });
});
