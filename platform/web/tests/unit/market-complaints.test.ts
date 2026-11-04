import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App, MarketOrder, MarketOrderInput } from "@/lib/data/types";
import {
  complaintAdjustment,
  complaintWindow,
  customerMessage,
  decideComplaint,
  openComplaint,
  queueTimers,
  READY_REPLIES,
  refundable,
  supportReply,
  teamNote,
  vendorComplaintView,
} from "@/lib/market/complaints";
import { priceOrder } from "@/lib/market/money";
import { buildStatement } from "@/lib/market/statement";
import { NOW } from "./helpers";

const hours = (n: number) => new Date(NOW.getTime() + n * 3600_000);

async function setup(patch: Partial<MarketOrderInput> = {}) {
  const store = new MemoryStore();
  const { client } = await registerClient(store, { name: "Souk", email: `c-${Math.random()}@market.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
  const app: App = { ...newApp(client.id, null, NOW, "food"), backend: "hosted" };
  await store.createApp(app);
  const vendor = await store.createRestaurant(
    { appId: app.id, name: "Grill House", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: { address: "Maadi", details: null, lat: 29.96, lng: 31.25 }, phone: "+201001112222", hours: [], prepMinutes: 15, minOrderCents: 0, maxKm: null, commissionBp: 1000, active: true, position: 0, kind: "restaurant" },
    { sections: [], nextId: 1 },
    NOW,
  );
  const money = priceOrder({ items: [{ unitPrice: 12000, quantity: 1 }, { unitPrice: 3000, quantity: 2 }], deliveryFee: 2000, deliveryBy: "app", commission: { kind: "percent", value: 10 }, collectedBy: "owner" });
  const order: MarketOrder = await store.createMarketOrder({
    appId: app.id, vendorId: vendor.id, vendorName: vendor.name, vendorKind: "restaurant", userId: 7, customerName: "Mariam", customerPhone: "+201001234567", fulfilment: "delivery", deliveryBy: "app", scheduledFor: null,
    lines: [
      { id: 1, productId: 1, name: "Mixed grill", imageUrl: null, quantity: 1, unit: "item", choices: [], note: null, unitPrice: 12000, wasUnitPrice: null, total: 12000, ifMissing: "remove", substituteProductId: null, outcome: null, pickedQuantity: null, substitute: null },
      { id: 2, productId: 2, name: "Hummus", imageUrl: null, quantity: 2, unit: "item", choices: [], note: null, unitPrice: 3000, wasUnitPrice: null, total: 6000, ifMissing: "remove", substituteProductId: null, outcome: null, pickedQuantity: null, substitute: null },
    ],
    money, currency: "EGP", paymentMethod: "card", paymentStatus: "paid", paymentRef: "pay_1", couponCode: null, status: "delivered", dropoff: null, distanceKm: 2, notes: null, pickupCode: null, prepMinutes: 15, readyAt: null, rejection: null,
    shipmentId: null, rating: null, timeline: [{ status: "delivered", at: NOW.toISOString(), by: "courier" }], completedAt: NOW, lang: "en", createdAt: hours(-1), updatedAt: NOW, ...patch,
  });
  return { store, app, vendor, order };
}

describe("115.9 complaints", () => {
  it("open from when the order is placed to 48 hours after it arrives, turned down or cancelled", () => {
    const base = { completedAt: NOW, timeline: [], updatedAt: NOW };
    expect(complaintWindow({ ...base, status: "awaiting_payment", completedAt: null }, NOW).open).toBe(false);
    expect(complaintWindow({ ...base, status: "on_the_way", completedAt: null }, NOW)).toEqual({ open: true, until: null });
    expect(complaintWindow({ ...base, status: "delivered" }, hours(47.9))).toMatchObject({ open: true, until: hours(48) });
    expect(complaintWindow({ ...base, status: "delivered" }, hours(48)).open).toBe(false);
    const rejected = { status: "rejected" as const, completedAt: null, updatedAt: hours(5), timeline: [{ status: "rejected" as const, at: hours(1).toISOString(), by: "vendor" as const }] };
    expect(complaintWindow(rejected, hours(48.5))).toMatchObject({ open: true, until: hours(49) });
  });

  it("checks the customer's complaint against the order, one open at a time", async () => {
    const { store, order } = await setup();
    expect(await openComplaint(store, order, 8, { reason: "late", text: "", lineIds: [], photoAssetIds: [] }, NOW)).toMatchObject({ ok: false, code: "invalid" });
    expect(await openComplaint(store, order, 7, { reason: "nonsense", text: "", lineIds: [], photoAssetIds: [] }, NOW)).toMatchObject({ ok: false, field: "reason" });
    expect(await openComplaint(store, order, 7, { reason: "missing_items", text: "", lineIds: [], photoAssetIds: [] }, NOW)).toMatchObject({ ok: false, field: "line_ids" });
    expect(await openComplaint(store, order, 7, { reason: "missing_items", text: "", lineIds: [9], photoAssetIds: [] }, NOW)).toMatchObject({ ok: false, field: "line_ids" });
    expect(await openComplaint(store, order, 7, { reason: "damaged", text: "", lineIds: [1], photoAssetIds: ["a", "b", "c", "d", "e", "f"] }, NOW)).toMatchObject({ ok: false, field: "photos" });
    expect(await openComplaint(store, order, 7, { reason: "other", text: "  ", lineIds: [], photoAssetIds: [] }, NOW)).toMatchObject({ ok: false, field: "text" });
    expect(await openComplaint(store, order, 7, { reason: "late", text: "Two hours late", lineIds: [], photoAssetIds: [] }, hours(49))).toMatchObject({ ok: false, code: "window_closed" });
    const made = await openComplaint(store, order, 7, { reason: "missing_items", text: "The hummus wasn't there", lineIds: [2, 2], photoAssetIds: ["p1"] }, hours(2));
    expect(made).toMatchObject({ ok: true, complaint: { status: "open", lineIds: [2], vendorId: order.vendorId, sharedWithVendor: false } });
    expect(await openComplaint(store, order, 7, { reason: "late", text: "Also late", lineIds: [], photoAssetIds: [] }, hours(3))).toMatchObject({ ok: false, code: "already_open" });
  });

  it("the conversation, the team's notes and whose turn it is", async () => {
    const { store, order } = await setup();
    const made = await openComplaint(store, order, 7, { reason: "quality", text: "Cold", lineIds: [1], photoAssetIds: [] }, hours(1));
    if (!made.ok) throw new Error();
    let c = made.complaint;
    expect(queueTimers(c, hours(2))).toEqual({ openMinutes: 60, waitingOn: "support", waitingMinutes: 60 });
    c = { ...c, ...supportReply(c, READY_REPLIES.en[1]!.text, "support@souk.test", hours(2))! };
    expect(c).toMatchObject({ status: "waiting_for_customer" });
    expect(queueTimers(c, hours(3))).toEqual({ openMinutes: 120, waitingOn: "customer", waitingMinutes: 60 });
    c = { ...c, ...customerMessage(c, "Here is a photo", hours(3))! };
    expect(c.status).toBe("in_review");
    expect(queueTimers(c, hours(4))).toMatchObject({ waitingOn: "support", waitingMinutes: 60 });
    c = { ...c, ...teamNote(c, "The courier was stuck in traffic", "support@souk.test", hours(4))! };
    expect(c.messages.map((m) => [m.id, m.from])).toEqual([[1, "support"], [2, "customer"]]);
    expect(c.notes).toHaveLength(1);
    expect(supportReply(c, "   ", "x", NOW)).toBeNull();
    // The vendor never sees the notes, the conversation or the customer.
    const view = vendorComplaintView(c);
    expect(Object.keys(view)).not.toEqual(expect.arrayContaining(["notes"]));
    expect(JSON.stringify(view)).not.toMatch(/traffic|Here is a photo|support@|Mariam|\+2010/);
  });

  it("a part refund to the wallet, then the rest to the payment, never more than the order", async () => {
    const { store, order } = await setup();
    const first = await openComplaint(store, order, 7, { reason: "missing_items", text: "", lineIds: [2], photoAssetIds: [] }, hours(1));
    if (!first.ok) throw new Error();
    expect(await decideComplaint(store, {}, first.complaint, order, { outcome: "partial_refund", amount: order.money.total + 1, to: "wallet", funder: "vendor", reason: null }, "support@souk.test", hours(2))).toMatchObject({ ok: false, field: "amount" });
    const part = await decideComplaint(store, {}, first.complaint, order, { outcome: "partial_refund", amount: 6000, to: "wallet", funder: "vendor", reason: null, shareWithVendor: true }, "support@souk.test", hours(2));
    expect(part).toMatchObject({ ok: true, complaint: { status: "resolved", sharedWithVendor: true, decision: { outcome: "partial_refund", amount: 6000, to: "wallet", funder: "vendor" } } });
    expect(await store.walletBalance(order.appId, 7)).toBe(6000);
    if (!part.ok) throw new Error();
    expect(part.complaint.messages.at(-1)).toMatchObject({ from: "support", text: "We've given the amount back to your wallet." });
    expect(await decideComplaint(store, {}, part.complaint, order, { outcome: "refund", funder: "owner", reason: null }, "x", hours(3))).toMatchObject({ ok: false });
    // A second complaint: the rest goes back to the card.
    const second = await openComplaint(store, order, 7, { reason: "quality", text: "Burnt", lineIds: [1], photoAssetIds: [] }, hours(4));
    if (!second.ok) throw new Error();
    expect(await decideComplaint(store, {}, second.complaint, order, { outcome: "refund", funder: "owner", reason: null }, "x", hours(5))).toMatchObject({ ok: false, field: "to" });
    const refunds: number[] = [];
    const refundToPayment = async (_o: MarketOrder, amount: number) => {
      refunds.push(amount);
      return { ok: true as const };
    };
    const rest = await decideComplaint(store, { refundToPayment }, second.complaint, order, { outcome: "refund", funder: "owner", reason: "Sorry about the grill." }, "x", hours(5));
    expect(rest).toMatchObject({ ok: true, complaint: { decision: { amount: order.money.total - 6000, to: "payment" } } });
    expect(refunds).toEqual([order.money.total - 6000]);
    expect((await store.getMarketOrder(order.appId, order.id))!.paymentStatus).toBe("refunded");
    const all = (await store.listMarketComplaints({ appId: order.appId, orderId: order.id, limit: 10, offset: 0 })).items;
    expect(refundable(order, all)).toBe(0);
    // The statement takes the vendor's share off what it is owed.
    const adjustments = all.map((c) => complaintAdjustment(c, "M-1")).filter((a) => a !== null);
    const statement = buildStatement({ from: hours(-24), to: hours(24), currency: "EGP", orders: [{ id: order.id, reference: "M-1", at: NOW, payment: "card", money: order.money }], adjustments });
    expect(statement.totals).toMatchObject({ refundsByVendor: 6000, refundsByOwner: order.money.total - 6000, net: order.money.split.dueToVendor - 6000 });
  });

  it("cash orders: no refund to the payment; compensations and no refund with the reason the customer reads", async () => {
    const { store, order } = await setup({ paymentMethod: "cash", paymentStatus: "paid" });
    const made = await openComplaint(store, order, 7, { reason: "late", text: "Late", lineIds: [], photoAssetIds: [] }, hours(1));
    if (!made.ok) throw new Error();
    expect(await decideComplaint(store, { refundToPayment: async () => ({ ok: true }) }, made.complaint, order, { outcome: "partial_refund", amount: 1000, to: "payment", funder: "owner", reason: null }, "x", hours(2))).toMatchObject({ ok: false, field: "to" });
    expect(await decideComplaint(store, {}, made.complaint, order, { outcome: "no_refund", funder: "owner", reason: "  " }, "x", hours(2))).toMatchObject({ ok: false, field: "reason" });
    const coupon = await decideComplaint(store, { makeCoupon: async () => "SORRY-7Q2" }, made.complaint, order, { outcome: "compensation", amount: 2500, to: "coupon", funder: "owner", reason: null }, "x", hours(2));
    expect(coupon).toMatchObject({ ok: true, complaint: { decision: { outcome: "compensation", couponCode: "SORRY-7Q2", to: "coupon" } } });
    if (coupon.ok) expect(coupon.complaint.messages.at(-1)!.text).toContain("SORRY-7Q2");
    // Another order: turned down with the reason.
    const other = await setup();
    const c2 = await openComplaint(other.store, other.order, 7, { reason: "quality", text: "Not great", lineIds: [1], photoAssetIds: [] }, hours(1));
    if (!c2.ok) throw new Error();
    const no = await decideComplaint(other.store, {}, c2.complaint, other.order, { outcome: "no_refund", funder: "owner", reason: "The photos show the order as it was made." }, "x", hours(2));
    expect(no).toMatchObject({ ok: true, complaint: { status: "rejected", decision: { amount: null } } });
    if (no.ok) expect(complaintAdjustment(no.complaint, "M-2")).toBeNull();
  });

  it("ready replies in English, Arabic and Turkish", () => {
    expect(READY_REPLIES.en.map((r) => r.key)).toEqual(READY_REPLIES.ar.map((r) => r.key));
    expect(READY_REPLIES.tr.map((r) => r.key)).toEqual(READY_REPLIES.en.map((r) => r.key));
  });
});
