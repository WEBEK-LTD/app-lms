import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { appLoyalty, loyaltyOf, pointsToEarn, undoOrderPoints, usablePoints } from "@/lib/catalog/loyalty";
import { changeOrderStatus } from "@/lib/catalog/order-status";
import { decideReturn } from "@/lib/catalog/returns";
import type { DataStore } from "@/lib/data/store";
import type { App, CatalogOrder, LoyaltySettings } from "@/lib/data/types";
import { placeDemoOrder } from "@/lib/demo/checkout";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { PLAN_INFO, plansWith, planSettingOf, type Plan } from "@/lib/plans";
import { KEY, NOW, setupClient } from "./helpers";

/** 91.4 Loyalty points in shops without a website, on every plan but Starter. */

const RULES: LoyaltySettings = { spendPerPointCents: 1000, pointValueCents: 10, minPoints: 100 };

describe("91.4 loyalty points: the rules", () => {
  it("earn one point for every spend on products, after the coupon and the points", () => {
    expect(pointsToEarn(RULES, { totalCents: 45000 + 5000, shippingCents: 5000 })).toBe(45);
    expect(pointsToEarn(RULES, { totalCents: 999, shippingCents: 0 })).toBe(0);
    expect(pointsToEarn(RULES, { totalCents: 5000, shippingCents: 5000 })).toBe(0);
  });

  it("are used from the fewest points on, never past what the products cost", () => {
    expect(usablePoints(RULES, 99, 100000)).toEqual({ points: 0, valueCents: 0 });
    expect(usablePoints(RULES, 250, 100000)).toEqual({ points: 250, valueCents: 2500 });
    // A 15.00 order takes 150 of 250 points.
    expect(usablePoints(RULES, 250, 1500)).toEqual({ points: 150, valueCents: 1500 });
    // Below the fewest once the order is too small for them.
    expect(usablePoints(RULES, 250, 900)).toEqual({ points: 0, valueCents: 0 });
  });

  it("are only on a plan that has them, with sane settings", () => {
    expect(loyaltyOf({ loyalty: RULES }, true)).toEqual(RULES);
    expect(loyaltyOf({ loyalty: RULES }, false)).toBeNull();
    expect(loyaltyOf({ loyalty: null }, true)).toBeNull();
    expect(loyaltyOf({ loyalty: { ...RULES, pointValueCents: 0 } }, true)).toBeNull();
  });

  it("join every plan but Starter, also plans the team saved before 91.4", () => {
    expect(PLAN_INFO.starter.features).not.toContain("loyalty");
    for (const plan of ["growth", "pro", "business"] as Plan[]) expect(PLAN_INFO[plan].features).toContain("loyalty");
    // An edit saved before loyalty existed: its eight features, without it.
    const old = { ...planSettingOf(PLAN_INFO.growth), features: PLAN_INFO.growth.features.filter((f) => f !== "loyalty") };
    delete (old as { knownFeatures?: string[] }).knownFeatures;
    expect(plansWith({ growth: old }).growth.features).toContain("loyalty");
    // Saved since, by a team that turned it off: it stays off.
    const off = { ...planSettingOf(PLAN_INFO.growth), features: PLAN_INFO.growth.features.filter((f) => f !== "loyalty") };
    expect(plansWith({ growth: off }).growth.features).not.toContain("loyalty");
    // And on for Starter when the team turns it on.
    expect(plansWith({ starter: { ...planSettingOf(PLAN_INFO.starter), features: ["push", "loyalty"] } }).starter.features).toContain("loyalty");
  });
});

async function shop(plan: Plan, loyalty: LoyaltySettings | null = RULES) {
  const { store, client } = await setupClient({ plan });
  const app: App = {
    ...newApp(client.id, null, NOW, "store"),
    backend: "hosted",
    demo: true,
    connector: { kind: "catalog" },
    catalogSettings: { currency: "TRY", shippingCents: 5000, freeShippingOverCents: null, payment: null, loyalty },
  };
  await store.createApp(app);
  // The client's license is the app's.
  expect((await store.getLicenseForApp(client.id, app.id))?.plan).toBe(plan);
  const product = await store.createCatalogProduct(
    { appId: app.id, name: "Tulip vase", description: "", priceCents: 30000, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null },
    NOW,
  );
  const user = (await store.createHostedUser({ appId: app.id, phone: "+905321112233", name: "Mona", email: null, city: null, now: NOW }))!;
  return { store, app, product, user };
}

function connectorOf(store: DataStore, app: App, inPlan = true) {
  return new CatalogConnector({ store, app, assetUrl: (id) => id, platformUrl: "https://yallapp.test", loyalty: inPlan });
}

const deps = (store: DataStore, app: App, now: Date) => ({ store, app, now, key: KEY, urls: {}, account: null });

describe("91.4 loyalty points: a customer's orders", () => {
  it("are earned when an order is completed, used in the cart, spent when paid, and shown", async () => {
    const { store, app, product, user } = await shop("growth");
    const connector = connectorOf(store, app);
    const call = (method: string, path: string, body?: unknown, who: typeof user | null = user, now = NOW) =>
      connector.handle({ method, path: path.split("/").filter(Boolean), query: new URLSearchParams(method === "POST" && path.includes("checkout") ? "platform=android" : ""), body, user: who, now });

    expect((await connector.config()).store).toMatchObject({
      loyalty: { enabled: true, spend_per_point: "10.00", spend_per_point_formatted: "₺10.00", point_value: "0.10", point_value_formatted: "₺0.10", min_points: 100 },
    });
    // Signed out: no points in the cart.
    expect(await call("POST", "/store/cart", { lines: [{ product_id: product.id, quantity: 1 }] }, null)).toMatchObject({ status: 200, body: { points: null } });

    // A first order of 2 × 300.00: no points yet; completed, it earns 60.
    const first = await call("POST", "/store/checkout-link", { lines: [{ product_id: product.id, quantity: 2 }], use_points: true });
    expect(first).toMatchObject({ status: 200 });
    let order = (await store.listCatalogOrders({ appId: app.id, userId: user.id, limit: 10, offset: 0 })).items[0]!;
    expect(order).toMatchObject({ totalCents: 65000, points: null });
    expect(await placeDemoOrder(store, app, order, NOW)).toBe(true);
    order = (await store.getCatalogOrder(app.id, order.id))!;
    expect(await changeOrderStatus(deps(store, app, NOW), order, "completed")).toBe(true);
    expect((await store.getCatalogOrder(app.id, order.id))!.points).toEqual({ used: 0, discountCents: 0, earned: 60 });
    expect(await store.getLoyaltyBalance(app.id, user.id)).toBe(60);
    // Below the fewest: nothing to use yet.
    expect(await call("POST", "/store/cart", { lines: [{ product_id: product.id, quantity: 1 }], use_points: true })).toMatchObject({
      body: { points: { balance: 60, usable: 0, usable_value: null, applied: false, discount: null }, total: "₺350.00" },
    });

    // More points from the shop's history: 250 in all.
    await store.changeLoyaltyPoints({ appId: app.id, userId: user.id, orderId: null, points: 190, reason: "earned", now: NOW });
    const quote = await call("POST", "/store/cart", { lines: [{ product_id: product.id, quantity: 1 }], use_points: true });
    expect(quote).toMatchObject({ body: { points: { balance: 250, usable: 250, usable_value: "₺25.00", applied: true, discount: "₺25.00" }, total: "₺325.00" } });
    expect(await call("POST", "/store/cart", { lines: [{ product_id: product.id, quantity: 1 }] })).toMatchObject({ body: { points: { applied: false, discount: null }, total: "₺350.00" } });

    // Checked out with them: taken off the total, spent when paid.
    expect(await call("POST", "/store/checkout-link", { lines: [{ product_id: product.id, quantity: 1 }], use_points: true })).toMatchObject({ status: 200 });
    let second = (await store.listCatalogOrders({ appId: app.id, userId: user.id, limit: 10, offset: 0 })).items.find((o) => o.id !== order.id)!;
    expect(second).toMatchObject({ totalCents: 32500, points: { used: 250, discountCents: 2500, earned: 0 } });
    expect(await store.getLoyaltyBalance(app.id, user.id)).toBe(250);
    await placeDemoOrder(store, app, second, NOW);
    expect(await store.getLoyaltyBalance(app.id, user.id)).toBe(0);
    second = (await store.getCatalogOrder(app.id, second.id))!;

    // The order shows them; completed, it earns on what was paid for the products (300 - 25).
    expect(await call("GET", `/me/orders/${second.id}`)).toMatchObject({ body: { points: { used: 250, discount: "₺25.00", earned: 0 } } });
    await changeOrderStatus(deps(store, app, NOW), second, "completed");
    expect(await call("GET", `/me/orders/${second.id}`)).toMatchObject({ body: { points: { used: 250, discount: "₺25.00", earned: 27 } } });
    // Completed once: earned once.
    await changeOrderStatus(deps(store, app, NOW), (await store.getCatalogOrder(app.id, second.id))!, "completed");
    expect(await store.getLoyaltyBalance(app.id, user.id)).toBe(27);

    const points = await call("GET", "/me/points");
    expect(points).toMatchObject({ status: 200, body: { balance: 27, value: "₺2.70" } });
    expect((points!.body as { entries: unknown[] }).entries).toEqual([
      { points: 27, reason: "earned", order_id: second.id, order_number: expect.any(String), created_at: NOW.toISOString() },
      { points: -250, reason: "used", order_id: second.id, order_number: expect.any(String), created_at: NOW.toISOString() },
      { points: 190, reason: "earned", order_id: null, order_number: null, created_at: NOW.toISOString() },
      { points: 60, reason: "earned", order_id: order.id, order_number: expect.any(String), created_at: NOW.toISOString() },
    ]);
    expect(await call("GET", "/me/points", undefined, null)).toMatchObject({ status: 401 });
  });

  it("are given back when a paid order is cancelled, and taken back when a return is approved or it's refunded", async () => {
    const { store, app, product, user } = await shop("pro");
    const connector = connectorOf(store, app);
    await store.changeLoyaltyPoints({ appId: app.id, userId: user.id, orderId: null, points: 200, reason: "earned", now: NOW });
    const checkout = async () => {
      await connector.handle({ method: "POST", path: ["store", "checkout-link"], query: new URLSearchParams("platform=android"), body: { lines: [{ product_id: product.id, quantity: 1 }], use_points: true }, user, now: NOW });
      const all = (await store.listCatalogOrders({ appId: app.id, userId: user.id, limit: 50, offset: 0 })).items;
      const o = all.reduce((a, b) => (a.id > b.id ? a : b));
      await placeDemoOrder(store, app, o, NOW);
      return (await store.getCatalogOrder(app.id, o.id))!;
    };

    // Cancelled after paying: the 200 points come back, once.
    const cancelled = await checkout();
    expect(await store.getLoyaltyBalance(app.id, user.id)).toBe(0);
    await changeOrderStatus(deps(store, app, NOW), cancelled, "cancelled");
    expect(await store.getLoyaltyBalance(app.id, user.id)).toBe(200);
    await undoOrderPoints(store, (await store.getCatalogOrder(app.id, cancelled.id))!, true, NOW);
    expect(await store.getLoyaltyBalance(app.id, user.id)).toBe(200);

    // Completed (28 points on 280.00), then its return approved: the 28 go, the used 200 stay spent until it's refunded.
    const returned = await checkout();
    await changeOrderStatus(deps(store, app, NOW), returned, "completed");
    expect(await store.getLoyaltyBalance(app.id, user.id)).toBe(28);
    const asked: CatalogOrder = { ...(await store.getCatalogOrder(app.id, returned.id))!, returnRequest: { status: "requested", reason: "damaged", note: null, requestedAt: NOW.toISOString(), decidedAt: null, reply: null } };
    await store.updateCatalogOrder(app.id, returned.id, { returnRequest: asked.returnRequest });
    expect(await decideReturn({ store, key: KEY, now: NOW }, app, asked, "approved", null)).toBe(true);
    expect(await store.getLoyaltyBalance(app.id, user.id)).toBe(0);
    expect((await store.getCatalogOrder(app.id, returned.id))!.points).toMatchObject({ earned: 0, takenBack: true });
    // Completing it again earns nothing.
    await changeOrderStatus(deps(store, app, NOW), (await store.getCatalogOrder(app.id, returned.id))!, "completed");
    expect(await store.getLoyaltyBalance(app.id, user.id)).toBe(0);
    // Refunded in full: the points it used come back.
    await store.updateCatalogOrder(app.id, returned.id, { status: "refunded" });
    await undoOrderPoints(store, (await store.getCatalogOrder(app.id, returned.id))!, true, NOW);
    expect(await store.getLoyaltyBalance(app.id, user.id)).toBe(200);
  });

  it("aren't on Starter, nor when the shop has none", async () => {
    const starter = await shop("starter");
    expect(await appLoyalty(starter.store, starter.app, NOW)).toBeNull();
    const connector = connectorOf(starter.store, starter.app, false);
    expect((await connector.config()).store).toMatchObject({ loyalty: null });
    expect(await connector.handle({ method: "GET", path: ["me", "points"], query: new URLSearchParams(), body: null, user: starter.user, now: NOW })).toMatchObject({ status: 403, body: { code: "feature_disabled" } });
    expect(await connector.handle({ method: "POST", path: ["store", "cart"], query: new URLSearchParams(), body: { lines: [{ product_id: starter.product.id, quantity: 1 }], use_points: true }, user: starter.user, now: NOW })).toMatchObject({ body: { points: null } });

    const growth = await shop("growth", null);
    expect(await appLoyalty(growth.store, growth.app, NOW)).toBeNull();
    const pro = await shop("pro");
    expect(await appLoyalty(pro.store, pro.app, NOW)).toEqual(RULES);
  });
});
