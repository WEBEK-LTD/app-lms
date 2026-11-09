import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App, MarketComplaintInput, MarketOrderInput } from "@/lib/data/types";
import { priceOrder } from "@/lib/market/money";
import { days, NOW } from "./helpers";

/** 115.3 The marketplace's orders, complaints and wallet, the same on every store (MemoryStore, and MySQL or MariaDB with migration 0114). */
export function marketOrdersStoreSuite(store: () => DataStore) {
  async function setup(s: DataStore) {
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(s, { name: "Souk Now", email: `orders-${suffix}@market.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "food"), backend: "hosted" };
    await s.createApp(app);
    const vendor = await s.createRestaurant(
      { appId: app.id, name: "Fresh Basket", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: { address: "Maadi", details: null, lat: 29.96, lng: 31.25 }, phone: null, hours: [], prepMinutes: 15, minOrderCents: 0, maxKm: null, commissionBp: 800, active: true, position: 0, kind: "grocery" },
      { sections: [], nextId: 1 },
      NOW,
    );
    const order = (patch: Partial<MarketOrderInput> = {}): MarketOrderInput => ({
      appId: app.id,
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorKind: "grocery",
      userId: 7,
      customerName: "Mariam",
      customerPhone: "+201001234567",
      fulfilment: "delivery",
      deliveryBy: "app",
      scheduledFor: null,
      lines: [{ id: 1, productId: 3, name: "Bananas", imageUrl: null, quantity: 1.5, unit: "kg", choices: [], note: null, unitPrice: 3500, wasUnitPrice: null, total: 5250, ifMissing: "similar", substituteProductId: null, outcome: null, pickedQuantity: null, substitute: null }],
      money: priceOrder({ items: [{ unitPrice: 3500, quantity: 1.5 }], deliveryFee: 1500, deliveryBy: "app", commission: { kind: "percent", value: 8 }, collectedBy: "owner" }),
      currency: "EGP",
      paymentMethod: "card",
      paymentStatus: "unpaid",
      paymentRef: null,
      couponCode: null,
      status: "awaiting_payment",
      dropoff: { address: "Street 9, Maadi", details: "Floor 3", lat: 29.95, lng: 31.26 },
      distanceKm: 1.2,
      notes: null,
      pickupCode: null,
      prepMinutes: null,
      readyAt: null,
      rejection: null,
      shipmentId: null,
      rating: null,
      timeline: [{ status: "awaiting_payment", at: NOW.toISOString(), by: "customer" }],
      completedAt: null,
      lang: "ar",
      createdAt: NOW,
      updatedAt: NOW,
      ...patch,
    });
    return { app, vendor, order };
  }

  it("keeps an order with its money as priced, and moves it only from the expected stage", async () => {
    const s = store();
    const { app, vendor, order } = await setup(s);
    const made = await s.createMarketOrder(order());
    const read = await s.getMarketOrder(app.id, made.id);
    expect(read).toMatchObject({ vendorKind: "grocery", fulfilment: "delivery", currency: "EGP", status: "awaiting_payment" });
    expect(read!.money.total).toBe(5250 + 1500);
    expect(read!.lines[0]).toMatchObject({ quantity: 1.5, unit: "kg", ifMissing: "similar" });
    expect(await s.updateMarketOrder(app.id, made.id, { status: "placed", paymentStatus: "paid" }, { statuses: ["awaiting_payment"] })).toBe(true);
    expect(await s.updateMarketOrder(app.id, made.id, { status: "placed" }, { statuses: ["awaiting_payment"] })).toBe(false);
    const repriced = priceOrder({ items: [{ unitPrice: 3500, quantity: 1.4 }], deliveryFee: 1500, deliveryBy: "app", commission: { kind: "percent", value: 8 }, collectedBy: "owner" });
    expect(await s.updateMarketOrder(app.id, made.id, { money: repriced, completedAt: NOW, status: "delivered" })).toBe(true);
    expect((await s.getMarketOrder(app.id, made.id))!.money.total).toBe(repriced.total);
    const other = await setup(s);
    expect(await s.getMarketOrder(other.app.id, made.id)).toBeNull();
    expect(await s.updateMarketOrder(other.app.id, made.id, { status: "cancelled" })).toBe(false);
    void vendor;
  });

  it("lists a customer's, a vendor's and a period's orders", async () => {
    const s = store();
    const { app, vendor, order } = await setup(s);
    const a = await s.createMarketOrder(order({ createdAt: days(-3), status: "delivered", completedAt: days(-3) }));
    const b = await s.createMarketOrder(order({ createdAt: days(-2), userId: 8, status: "placed" }));
    const c = await s.createMarketOrder(order({ createdAt: days(-1), status: "delivered", completedAt: days(-1) }));
    expect((await s.listMarketOrders({ appId: app.id, userId: 7, limit: 10, offset: 0 })).items.map((o) => o.id)).toEqual([c.id, a.id]);
    expect((await s.listMarketOrders({ appId: app.id, vendorId: vendor.id, statuses: ["placed"], limit: 10, offset: 0 })).items.map((o) => o.id)).toEqual([b.id]);
    const period = await s.listMarketOrders({ appId: app.id, vendorId: vendor.id, completedSince: days(-2), completedUntil: NOW, order: "oldest", limit: 10, offset: 0 });
    expect(period.items.map((o) => o.id)).toEqual([c.id]);
    expect((await s.listMarketOrders({ appId: app.id, limit: 1, offset: 1 })).total).toBe(3);
  });

  it("keeps complaints with their messages, the team's notes and the decision", async () => {
    const s = store();
    const { app, vendor, order } = await setup(s);
    const made = await s.createMarketOrder(order({ status: "delivered", completedAt: NOW }));
    const input: MarketComplaintInput = {
      appId: app.id, orderId: made.id, vendorId: vendor.id, userId: 7, reason: "missing_items", text: "The bananas were missing", lineIds: [1], photoAssetIds: [], status: "open", assignee: null, sharedWithVendor: false,
      messages: [], notes: [], decision: null, answeredAt: null, createdAt: NOW, updatedAt: NOW,
    };
    const complaint = await s.createMarketComplaint(input);
    expect(await s.updateMarketComplaint(app.id, complaint.id, { status: "in_review", assignee: "support@souk.test", notes: [{ text: "Call the picker", by: "support@souk.test", at: NOW.toISOString() }] })).toBe(true);
    const decision = { outcome: "partial_refund" as const, amount: 2500, to: "wallet" as const, couponCode: null, funder: "vendor" as const, reason: "Sorry, refunded to your wallet", by: "support@souk.test", at: NOW };
    expect(await s.updateMarketComplaint(app.id, complaint.id, { status: "resolved", decision, messages: [{ id: 1, from: "support", text: "Done", by: "support@souk.test", at: NOW.toISOString() }] })).toBe(true);
    const read = (await s.getMarketComplaint(app.id, complaint.id))!;
    expect(read).toMatchObject({ status: "resolved", assignee: "support@souk.test", lineIds: [1] });
    expect(read.decision).toMatchObject({ outcome: "partial_refund", amount: 2500, to: "wallet", funder: "vendor" });
    expect(new Date(read.decision!.at).getTime()).toBe(NOW.getTime());
    expect((await s.listMarketComplaints({ appId: app.id, statuses: ["resolved"], limit: 10, offset: 0 })).items.map((c) => c.id)).toEqual([complaint.id]);
    expect((await s.listMarketComplaints({ appId: app.id, userId: 99, limit: 10, offset: 0 })).total).toBe(0);
    const other = await setup(s);
    expect(await s.getMarketComplaint(other.app.id, complaint.id)).toBeNull();
    expect(await s.updateMarketComplaint(other.app.id, complaint.id, { status: "rejected" })).toBe(false);
  });

  it("the wallet adds each entry once and never goes below zero", async () => {
    const s = store();
    const { app } = await setup(s);
    const entry = (amount: number, key: string, kind: "refund" | "payment" = amount < 0 ? "payment" : "refund") => ({ appId: app.id, userId: 7, kind, amount, label: kind, orderId: null, complaintId: null, key, createdAt: NOW });
    expect((await s.addWalletEntry(entry(2500, "complaint:1"))).ok).toBe(true);
    expect(await s.addWalletEntry(entry(2500, "complaint:1"))).toEqual({ ok: false, reason: "duplicate" });
    expect(await s.walletBalance(app.id, 7)).toBe(2500);
    expect(await s.addWalletEntry(entry(-3000, "order:5"))).toEqual({ ok: false, reason: "insufficient" });
    expect((await s.addWalletEntry(entry(-2000, "order:5"))).ok).toBe(true);
    expect(await s.walletBalance(app.id, 7)).toBe(500);
    const list = await s.listWalletEntries(app.id, 7, { limit: 10, offset: 0 });
    expect(list.total).toBe(2);
    expect(list.items.map((e) => e.amount).sort((a, b) => a - b)).toEqual([-2000, 2500]);
    const other = await setup(s);
    expect(await s.walletBalance(other.app.id, 7)).toBe(0);
    // The same key in another app is another entry.
    expect((await s.addWalletEntry({ ...entry(100, "complaint:1"), appId: other.app.id })).ok).toBe(true);
  });

  it("115.15 deletes orders with their complaints and wallet entries, in their own app only", async () => {
    const s = store();
    const { app, vendor, order } = await setup(s);
    const gone = await s.createMarketOrder(order({ status: "delivered", completedAt: NOW }));
    const kept = await s.createMarketOrder(order({ status: "delivered", completedAt: NOW }));
    const complaint = (orderId: number): MarketComplaintInput => ({
      appId: app.id, orderId, vendorId: vendor.id, userId: 7, reason: "damaged", text: "Squashed", lineIds: [1], photoAssetIds: [], status: "open", assignee: null, sharedWithVendor: false,
      messages: [], notes: [], decision: null, answeredAt: null, createdAt: NOW, updatedAt: NOW,
    });
    await s.createMarketComplaint(complaint(gone.id));
    const keptComplaint = await s.createMarketComplaint(complaint(kept.id));
    const wallet = (orderId: number | null, key: string) => ({ appId: app.id, userId: 7, kind: "refund" as const, amount: 1000, label: "Refund", orderId, complaintId: null, key, createdAt: NOW });
    await s.addWalletEntry(wallet(gone.id, "refund:gone"));
    await s.addWalletEntry(wallet(kept.id, "refund:kept"));
    await s.addWalletEntry(wallet(null, "credit"));
    const other = await setup(s);
    const theirs = await s.createMarketOrder(other.order());

    // Another app's order is never deleted from here.
    expect(await s.deleteMarketOrders(app.id, [gone.id, theirs.id])).toBe(1);
    expect(await s.deleteMarketOrders(app.id, [])).toBe(0);
    expect(await s.getMarketOrder(app.id, gone.id)).toBeNull();
    expect(await s.getMarketOrder(app.id, kept.id)).not.toBeNull();
    expect(await s.getMarketOrder(other.app.id, theirs.id)).not.toBeNull();
    expect((await s.listMarketComplaints({ appId: app.id, limit: 10, offset: 0 })).items.map((c) => c.id)).toEqual([keptComplaint.id]);
    expect(await s.walletBalance(app.id, 7)).toBe(2000);
  });
}
