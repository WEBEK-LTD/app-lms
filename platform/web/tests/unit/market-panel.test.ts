import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_HOSTED_SETTINGS, type App } from "@/lib/data/types";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { finishPanelSignIn, panelStaff, startPanelSignIn } from "@/lib/market/panel";
import { boardAction, boardData } from "@/lib/market/panel-board";
import { addStaff, catalogPage, importCatalog, monthBounds, panelContext, saveDelivery, setStaffActive, setStock, tabsFor, vendorComplaints, vendorStatement } from "@/lib/market/panel-pages";
import { NOW, setupClient } from "./helpers";

const EVERY_DAY = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((day) => ({ day, opens: "00:00", closes: "23:59" }));
const place = { address: "Tahrir Square, Cairo", details: null, lat: 30.0444, lng: 31.2357 };

describe("115.7 the vendors' web panel", () => {
  let store: MemoryStore;
  let app: App;
  let mine: number;
  let theirs: number;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "food");
    app = { ...base, backend: "hosted", appName: "Nile Market", connector: { kind: "restaurants" }, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings } };
    await store.createApp(app);
    await store.saveDeliverySettings(app.id, { ...DEFAULT_DELIVERY_SETTINGS, currency: "EGP" }, NOW);
    const vendor = (name: string) =>
      store.createRestaurant({ appId: app.id, name, description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: place, phone: null, hours: EVERY_DAY, prepMinutes: 20, minOrderCents: 0, maxKm: null, commissionBp: 1000, active: true, position: 1 }, { sections: [], nextId: 1 }, NOW);
    mine = (await vendor("Mine")).id;
    theirs = (await vendor("Theirs")).id;
    await store.createRestaurantStaff({ appId: app.id, restaurantId: mine, name: "Hany", phone: null, email: "hany@mine.test", active: true, role: "manager" }, NOW);
    await store.createRestaurantStaff({ appId: app.id, restaurantId: theirs, name: "Rana", phone: null, email: "rana@theirs.test", active: true, role: "manager" }, NOW);
  });

  const orderOf = (vendorId: number) =>
    store.createMarketOrder({
      appId: app.id, vendorId, vendorName: "x", vendorKind: "restaurant", userId: null, customerName: "Mona Adel", customerPhone: "+201001112222", fulfilment: "delivery", deliveryBy: "app", scheduledFor: null,
      lines: [{ id: 1, productId: 1, name: "Koshari", imageUrl: null, quantity: 1, unit: "item", choices: [], note: null, unitPrice: 50_00, wasUnitPrice: null, total: 50_00, ifMissing: "remove", substituteProductId: null, outcome: null, pickedQuantity: null, substitute: null }],
      money: { lines: [{ kind: "total", amount: 50_00 }], itemsBefore: 50_00, itemDiscounts: 0, items: 50_00, coupon: null, club: 0, delivery: 0, deliveryDiscount: 0, tax: 0, tip: 0, total: 50_00, wallet: 0, payNow: 50_00, split: { commission: 5_00, vendorEarns: 45_00, ownerEarns: 5_00, collectedBy: "owner", dueToVendor: 45_00 } },
      currency: "EGP", paymentMethod: "card", paymentStatus: "paid", paymentRef: null, couponCode: null, status: "placed", dropoff: { address: "Zamalek", details: null, lat: 30.05, lng: 31.22 }, distanceKm: 2, notes: null,
      pickupCode: null, prepMinutes: null, readyAt: null, rejection: null, shipmentId: null, rating: null, timeline: [{ status: "placed", at: NOW.toISOString(), by: "customer" }], completedAt: null, lang: null, createdAt: NOW, updatedAt: NOW,
    });

  it("signs a vendor's staff member in with an emailed code, and nobody else", async () => {
    expect(await startPanelSignIn(store, app, "nobody@x.test", NOW)).toBeNull();
    const started = (await startPanelSignIn(store, app, "hany@mine.test", NOW))!;
    expect(started.code).toMatch(/^\d{6}$/);
    expect(await finishPanelSignIn(store, app, started.token, started.code === "000000" ? "111111" : "000000", NOW)).toEqual({ ok: false, error: "wrong" });
    const done = await finishPanelSignIn(store, app, started.token, started.code, NOW);
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect((await panelStaff(store, app, done.sessionId, NOW))?.name).toBe("Hany");
    // The code works once; another app's session isn't this one's.
    expect(await finishPanelSignIn(store, app, started.token, started.code, NOW)).toEqual({ ok: false, error: "expired" });
    expect(await panelStaff(store, { ...app, id: "app_other" }, done.sessionId, NOW)).toBeNull();
    expect(await panelStaff(store, app, done.sessionId, new Date(NOW.getTime() + 13 * 3_600_000))).toBeNull();
  });

  it("locks the code after five wrong tries", async () => {
    const started = (await startPanelSignIn(store, app, "hany@mine.test", NOW))!;
    const wrong = started.code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 4; i++) expect((await finishPanelSignIn(store, app, started.token, wrong, NOW)).ok).toBe(false);
    expect(await finishPanelSignIn(store, app, started.token, wrong, NOW)).toEqual({ ok: false, error: "too_many" });
    expect(await finishPanelSignIn(store, app, started.token, started.code, NOW)).toEqual({ ok: false, error: "too_many" });
  });

  it("shows the board of the staff member's own vendor only, without the customer's phone", async () => {
    const order = await orderOf(mine);
    const other = await orderOf(theirs);
    const hany = (await store.listRestaurantStaff(app.id, mine))[0]!;
    const board = (await boardData(store, app, hany))!;
    expect(board.desk).toMatchObject({ name: "Mine" });
    expect(board.fresh.map((o) => (o as { id: number }).id)).toEqual([order.id]);
    expect(JSON.stringify(board)).not.toContain("+201001112222");
    expect((await boardAction(store, app, hany, { action: "accept", order_id: order.id, prep_minutes: 15 })).status).toBe(200);
    expect((await boardAction(store, app, hany, { action: "accept", order_id: other.id, prep_minutes: 15 })).status).toBe(404);
    expect((await boardAction(store, app, hany, { action: "desk", paused: true })).body).toMatchObject({ paused: true });
    expect((await boardAction(store, app, hany, { action: "delete" })).status).toBe(400);
  });

  it("runs the panel's pages on the staff member's own vendor, by role", async () => {
    const hany = (await store.listRestaurantStaff(app.id, mine))[0]!;
    const ctx = (await panelContext(store, app, hany))!;
    expect(tabsFor("manager")).not.toContain("staff");
    expect(tabsFor("picker")).toEqual(["orders"]);
    // A grocery's catalog: imported from CSV, then put out of stock by its count.
    await store.updateRestaurant(app.id, mine, { kind: "grocery" }, NOW);
    const grocery = (await panelContext(store, app, hany))!;
    const csv = new TextEncoder().encode("name,price,sku,unit,stock,department\nApples,40,APL,kg,,Fruit\nMilk,30,MLK,item,10,Dairy\n,5,BAD,item,1,Dairy\n");
    const checked = await importCatalog(grocery, { bytes: csv, name: "catalog.csv", type: "text/csv" }, false, NOW);
    expect(checked).toMatchObject({ ok: true, applied: false, plan: { counts: { create: 2 } } });
    const saved = await importCatalog(grocery, { bytes: csv, name: "catalog.csv", type: "text/csv" }, true, NOW);
    expect(saved).toMatchObject({ ok: true, applied: true, saved: { created: 2 } });
    const page = await catalogPage(grocery, { q: "", page: 1, outOfStock: false });
    expect(page.items.map((i) => i.name).sort()).toEqual(["Apples", "Milk"]);
    const milk = page.items.find((i) => i.name === "Milk")!;
    expect(await setStock(grocery, milk.id, true, 0, NOW)).toBe(true);
    expect((await catalogPage(grocery, { q: "", page: 1, outOfStock: true })).items.map((i) => i.name)).toEqual(["Milk"]);
    // Another vendor's product isn't this one's.
    const theirsCtx = (await panelContext(store, app, (await store.listRestaurantStaff(app.id, theirs))[0]!))!;
    expect(await setStock(theirsCtx, milk.id, true, 5, NOW)).toBe(false);
    // Delivery: its own drivers at a fixed fee.
    expect(await saveDelivery(ctx, { by: "vendor", fee_kind: "fixed", fee: "15", per_km: "", free_over: "200", min_items: "", max_items: "", pickup: "on" }, NOW)).toEqual({ ok: true });
    expect((await store.getRestaurant(app.id, mine))!.delivery).toMatchObject({ by: "vendor", fee: 15_00, freeOver: 200_00, pickup: true });
    expect(await saveDelivery(ctx, { by: "vendor", fee_kind: "fixed", fee: "abc" }, NOW)).toMatchObject({ ok: false });
    // Staff: added by email, turned off, never oneself.
    expect(await addStaff(ctx, { name: "Sara", email: "sara@mine.test", role: "picker" }, NOW)).toEqual({ ok: true });
    expect(await addStaff(ctx, { name: "Sara again", email: "sara@mine.test", role: "picker" }, NOW)).toMatchObject({ ok: false });
    const sara = (await store.listRestaurantStaff(app.id, mine)).find((s) => s.email === "sara@mine.test")!;
    expect(await setStaffActive(ctx, sara.id, false, NOW)).toBe(true);
    expect(await setStaffActive(ctx, hany.id, false, NOW)).toBe(false);
    // The statement counts the month's completed orders; complaints only those shared with the vendor.
    const done = await orderOf(mine);
    await store.updateMarketOrder(app.id, done.id, { status: "delivered", completedAt: NOW });
    const { from, to } = monthBounds(null, NOW);
    expect((await vendorStatement(ctx, from, to)).orders).toHaveLength(1);
    await store.createMarketComplaint({ appId: app.id, orderId: done.id, vendorId: mine, userId: null, reason: "late", text: "Late", lineIds: [], photoAssetIds: [], status: "open", assignee: null, sharedWithVendor: false, messages: [], notes: [{ text: "secret", by: "team", at: NOW.toISOString() }], decision: null, answeredAt: null, createdAt: NOW, updatedAt: NOW });
    expect(await vendorComplaints(ctx)).toEqual([]);
    const shared = await store.createMarketComplaint({ appId: app.id, orderId: done.id, vendorId: mine, userId: null, reason: "quality", text: "Cold", lineIds: [], photoAssetIds: [], status: "resolved", assignee: null, sharedWithVendor: true, messages: [], notes: [{ text: "secret", by: "team", at: NOW.toISOString() }], decision: { outcome: "partial_refund", amount: 10_00, to: "wallet", couponCode: null, funder: "vendor", reason: null, by: "team", at: NOW }, answeredAt: null, createdAt: NOW, updatedAt: NOW });
    const seen = await vendorComplaints(ctx);
    expect(seen.map((c) => c.id)).toEqual([shared.id]);
    expect(JSON.stringify(seen)).not.toContain("secret");
  });
});
