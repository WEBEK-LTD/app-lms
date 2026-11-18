import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App, MarketComplaint, MarketOrder, MarketOrderInput, Shipment } from "@/lib/data/types";
import { clockParts, matchesSearch, queueStats, sortQueue, waitsOnSupport } from "@/lib/market/complaint-queue";
import {
  agentFirstName,
  COMPLAINT_COUPON_DAYS,
  complaintWindow,
  customerMessage,
  decideComplaint,
  moneyTaken,
  openComplaint,
  queueTimers,
  refundable,
  refundableToPayment,
  replyColoursOf,
  replyTone,
  supportReply,
  takeComplaint,
  ticketAllowed,
} from "@/lib/market/complaints";
import { complaintCoupon } from "@/lib/market/decisions";
import { complaintJson } from "@/lib/market/json";
import { priceOrder } from "@/lib/market/money";
import { NOW } from "./helpers";

/** 115.50–115.53 The owner's decisions of 18 November (D3, D4) on complaints: the window, the thread, the four decisions, the queue. */

const hours = (n: number) => new Date(NOW.getTime() + n * 3600_000);
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

async function setup(patch: Partial<MarketOrderInput> = {}, wallet = 0) {
  const store = new MemoryStore();
  const { client } = await registerClient(store, { name: "Zad", email: `c-${Math.random()}@zad.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
  const app: App = { ...newApp(client.id, null, NOW, "food"), backend: "hosted" };
  await store.createApp(app);
  const vendor = await store.createRestaurant(
    { appId: app.id, name: "Zad Market", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: { address: "Zamalek", details: null, lat: 30.06, lng: 31.22 }, phone: null, hours: [], prepMinutes: 15, minOrderCents: 0, maxKm: null, commissionBp: 1000, active: true, position: 0, kind: "grocery" },
    { sections: [], nextId: 1 },
    NOW,
  );
  const priced = priceOrder({ items: [{ unitPrice: 12000, quantity: 1 }, { unitPrice: 3325, quantity: 1 }, { unitPrice: 8000, quantity: 2 }], deliveryFee: 2000, deliveryBy: "app", commission: { kind: "percent", value: 10 }, collectedBy: "owner" });
  const money = wallet ? { ...priced, wallet, payNow: priced.total - wallet } : priced;
  const line = (id: number, name: string, unitPrice: number, quantity: number) => ({ id, productId: id, name, imageUrl: null, quantity, unit: "item" as const, choices: [], note: null, unitPrice, wasUnitPrice: null, total: unitPrice * quantity, ifMissing: "similar" as const, substituteProductId: null, outcome: null, pickedQuantity: null, substitute: null });
  const order: MarketOrder = await store.createMarketOrder({
    appId: app.id, vendorId: vendor.id, vendorName: vendor.name, vendorKind: "grocery", userId: 7, customerName: "Mona Adel", customerPhone: "+201001234567", fulfilment: "delivery", deliveryBy: "app", scheduledFor: null,
    lines: [line(1, "White cheese, sliced", 12000, 1), line(2, "Bananas", 3325, 1), line(3, "Eggs, 15", 8000, 2)],
    money, currency: "EGP", paymentMethod: "card", paymentStatus: "paid", paymentRef: "pay_1", couponCode: null, status: "delivered", dropoff: null, distanceKm: 2, notes: null, pickupCode: null, prepMinutes: 15, readyAt: null, rejection: null,
    shipmentId: null, rating: null, timeline: [{ status: "placed", at: hours(-1).toISOString(), by: "customer" }, { status: "delivered", at: NOW.toISOString(), by: "courier" }], completedAt: NOW, lang: "en", createdAt: hours(-1), updatedAt: NOW, ...patch,
  });
  return { store, app, vendor, order };
}

const job = (status: Shipment["status"], deliveredAt: Date | null): Pick<Shipment, "status" | "timeline"> => ({
  status,
  timeline: [{ status: "assigned", at: hours(-1).toISOString() }, ...(deliveredAt ? [{ status: "delivered" as const, at: deliveredAt.toISOString() }] : [])],
});

const ask = (reason = "quality", lineIds: number[] = [1, 2], text = "The bananas are bruised and soft.") => ({ reason, text, lineIds, photoAssetIds: [] });

describe("115.50 the complaint window (D3)", () => {
  it("an app courier's order: the 48 hours start at the job's delivered time, not when the order was next read", async () => {
    const { order } = await setup({ completedAt: hours(5) });
    // The order was marked delivered at +5 h when it was read; the courier delivered at 0.
    expect(complaintWindow(order, hours(47), job("delivered", NOW))).toMatchObject({ open: true, until: hours(48) });
    expect(complaintWindow(order, hours(48), job("delivered", NOW))).toMatchObject({ open: false, closed: "ended" });
    // Without the job, the order's own time.
    expect(complaintWindow(order, hours(48))).toMatchObject({ open: true, until: hours(53) });
    // The vendor's own driver: the job isn't the app's, the order's time counts.
    expect(complaintWindow({ ...order, deliveryBy: "vendor" }, hours(48), job("delivered", NOW))).toMatchObject({ open: true, until: hours(53) });
  });

  it("a delivered job ends an order still read as on its way", async () => {
    const { order } = await setup({ status: "on_the_way", completedAt: null });
    expect(complaintWindow(order, hours(10), job("delivered", hours(1)))).toMatchObject({ open: true, until: hours(49), stuck: false });
  });

  it("from placing the order: open, with no end while it moves", async () => {
    const { order } = await setup({ status: "placed", completedAt: null, timeline: [{ status: "placed", at: NOW.toISOString(), by: "customer" }], createdAt: NOW });
    expect(complaintWindow(order, minutes(1))).toEqual({ open: true, until: null, stuck: false, closed: null });
    expect(complaintWindow(order, hours(5.9))).toMatchObject({ open: true, until: null, stuck: false });
  });

  it("a stuck order (no new stage for 6 hours) can be complained about, until 48 hours after its last stage", async () => {
    const { order } = await setup({ status: "on_the_way", completedAt: null, createdAt: hours(-2), timeline: [{ status: "placed", at: hours(-2).toISOString(), by: "customer" }, { status: "on_the_way", at: NOW.toISOString(), by: "courier" }] });
    expect(complaintWindow(order, hours(6))).toEqual({ open: true, until: hours(48), stuck: true, closed: null });
    expect(complaintWindow(order, hours(47.9))).toMatchObject({ open: true, stuck: true });
    expect(complaintWindow(order, hours(48))).toEqual({ open: false, until: hours(48), stuck: true, closed: "ended" });
    // The courier job's later stage counts as the order's last one.
    const moving: Pick<Shipment, "status" | "timeline"> = { status: "on_the_way", timeline: [{ status: "on_the_way", at: hours(5).toISOString() }] };
    expect(complaintWindow(order, hours(6), moving)).toMatchObject({ open: true, stuck: false, until: null });
    // An order for later waits for its time without being stuck.
    expect(complaintWindow({ ...order, status: "scheduled" }, hours(30))).toMatchObject({ open: true, stuck: false, until: null });
  });

  it("turned down or cancelled: only when money was taken", async () => {
    const { order } = await setup();
    const at = [{ status: "cancelled" as const, at: NOW.toISOString(), by: "customer" as const }];
    const cash = { ...order, status: "cancelled" as const, completedAt: null, timeline: at, paymentMethod: "cash" as const, paymentStatus: "unpaid" as const };
    expect(moneyTaken(cash)).toBe(false);
    expect(complaintWindow(cash, hours(1))).toMatchObject({ open: false, closed: "no_money" });
    expect(complaintWindow({ ...cash, paymentMethod: "card", paymentStatus: "unpaid" }, hours(1))).toMatchObject({ open: false, closed: "no_money" });
    // Paid by card (refunded since or not), or part of it from the wallet.
    expect(complaintWindow({ ...cash, paymentMethod: "card", paymentStatus: "refunded" }, hours(1))).toMatchObject({ open: true, until: hours(48) });
    expect(complaintWindow({ ...cash, status: "rejected", timeline: [{ status: "rejected", at: NOW.toISOString(), by: "vendor" }], paymentMethod: "card", paymentStatus: "paid" }, hours(47))).toMatchObject({ open: true });
    expect(complaintWindow({ ...cash, money: { ...cash.money, wallet: 500 } }, hours(1))).toMatchObject({ open: true });
    // A delivered cash order is open as always.
    expect(complaintWindow({ ...order, paymentMethod: "cash", paymentStatus: "paid" }, hours(1))).toMatchObject({ open: true });
  });

  it("one new ticket after a decision, never two working at once, at most two", async () => {
    const { store, order } = await setup();
    const first = await openComplaint(store, order, 7, ask(), hours(1));
    if (!first.ok) throw new Error(first.error);
    expect(await openComplaint(store, order, 7, ask("late", []), hours(2))).toMatchObject({ ok: false, code: "already_open" });
    const decided = await decideComplaint(store, {}, first.complaint, order, { outcome: "partial_refund", amount: 15325, to: "wallet", funder: "vendor", reason: null }, "nour@zad.test", hours(2));
    if (!decided.ok) throw new Error(decided.error);
    // The customer writes after the decision: the decision stays, a new ticket is still allowed.
    await store.updateMarketComplaint(order.appId, first.complaint.id, customerMessage(decided.complaint, "Thank you", hours(2.5))!);
    const second = await openComplaint(store, order, 7, ask("damaged", [3], "The eggs were broken."), hours(3));
    expect(second).toMatchObject({ ok: true });
    if (!second.ok) throw new Error();
    await decideComplaint(store, {}, second.complaint, order, { outcome: "no_refund", funder: "owner", reason: "The photos show the eggs whole." }, "nour@zad.test", hours(4));
    expect(await openComplaint(store, order, 7, ask("late", []), hours(5))).toMatchObject({ ok: false, code: "limit" });
    expect(ticketAllowed([])).toBe("ok");
  });

  it("items are optional: none chosen is the whole order; up to 5 photos and 2,000 characters", async () => {
    const { store, order } = await setup();
    expect(await openComplaint(store, order, 7, { ...ask("missing_items", []), text: "x".repeat(2001) }, hours(1))).toMatchObject({ ok: false, field: "text" });
    expect(await openComplaint(store, order, 7, { ...ask("damaged", []), photoAssetIds: ["1", "2", "3", "4", "5", "6"] }, hours(1))).toMatchObject({ ok: false, field: "photos" });
    const whole = await openComplaint(store, order, 7, { ...ask("missing_items", []), text: "x".repeat(2000), photoAssetIds: ["1", "2", "3", "4", "5"] }, hours(1));
    expect(whole).toMatchObject({ ok: true, complaint: { lineIds: [], photoAssetIds: ["1", "2", "3", "4", "5"] } });
  });

  it("the customer's complaint carries how long the order still takes complaints and whether one more may be opened", async () => {
    const { store, order } = await setup();
    const made = await openComplaint(store, order, 7, ask(), hours(1));
    if (!made.ok) throw new Error();
    const json = complaintJson(made.complaint, "EGP", (id) => `https://cdn.test/${id}`, { windowEndsAt: hours(48), canOpenAnother: false });
    expect(json).toMatchObject({ window_ends_at: hours(48).toISOString(), can_open_another: false, support_agent: null, decision: null });
  });
});

describe("115.51 support's thread (D4)", () => {
  it("support writes with the agent's first name; the customer never reads anyone's email", async () => {
    const { store, order } = await setup();
    const made = await openComplaint(store, order, 7, ask(), hours(1));
    if (!made.ok) throw new Error();
    let c = made.complaint;
    expect(agentFirstName("Nour Hassan", "nour@zad.test")).toBe("Nour");
    expect(agentFirstName("", "omar.saleh@zad.test")).toBe("Omar");
    c = { ...c, ...takeComplaint(c, "nour@zad.test", "Nour", minutes(66)) };
    expect(c).toMatchObject({ assignee: "nour@zad.test", status: "in_review" });
    // Taking it again doesn't say so twice.
    expect(takeComplaint(c, "nour@zad.test", "Nour", minutes(67)).messages).toBeUndefined();
    c = { ...c, ...supportReply(c, "Was the cheese in a sealed pack?", "nour@zad.test", minutes(67), "Nour")! };
    const json = complaintJson(c, "EGP", (id) => id);
    expect(json.support_agent).toBe("Nour");
    expect(json.messages).toEqual([
      expect.objectContaining({ from: "support", kind: "taken", agent: "Nour", text: "" }),
      expect.objectContaining({ from: "support", kind: "message", agent: "Nour", text: "Was the cheese in a sealed pack?" }),
    ]);
    expect(JSON.stringify(json)).not.toContain("@zad.test");
    // The "took it" line isn't an answer for the queue's timers.
    expect(queueTimers({ ...made.complaint, ...takeComplaint(made.complaint, "nour@zad.test", "Nour", minutes(66)) }, minutes(80))).toMatchObject({ waitingOn: "support", waitingMinutes: 20 });
  });

  it("after a decision the conversation goes on and the decision isn't reopened", async () => {
    const { store, order } = await setup();
    const made = await openComplaint(store, order, 7, ask(), hours(1));
    if (!made.ok) throw new Error();
    const decided = await decideComplaint(store, {}, made.complaint, order, { outcome: "partial_refund", amount: 15325, to: "wallet", funder: "owner", reason: null }, "nour@zad.test", hours(2), "Nour");
    if (!decided.ok) throw new Error();
    let c = decided.complaint;
    expect(c).toMatchObject({ status: "resolved", decision: { byName: "Nour" } });
    c = { ...c, ...customerMessage(c, "Thanks! And the eggs?", hours(3))! };
    expect(c.status).toBe("resolved");
    expect(c.decision?.amount).toBe(15325);
    expect(waitsOnSupport(c)).toBe(true);
    expect(queueTimers(c, hours(3.5))).toMatchObject({ waitingOn: "support", waitingMinutes: 30 });
    c = { ...c, ...supportReply(c, "Open a new complaint for the eggs, please.", "nour@zad.test", hours(4), "Nour")! };
    expect(c.status).toBe("resolved");
    expect(waitsOnSupport(c)).toBe(false);
    expect(await decideComplaint(store, {}, c, order, { outcome: "refund", to: "wallet", funder: "owner", reason: null }, "x", hours(5))).toMatchObject({ ok: false });
  });
});

describe("115.52 the four decisions", () => {
  it("a refund to the card goes through the gateway and never exceeds what was paid", async () => {
    const { store, order } = await setup();
    const made = await openComplaint(store, order, 7, ask(), hours(1));
    if (!made.ok) throw new Error();
    const sent: number[] = [];
    const deps = { refundToPayment: async (_o: MarketOrder, amount: number) => (sent.push(amount), { ok: true as const }) };
    expect(await decideComplaint(store, deps, made.complaint, order, { outcome: "partial_refund", amount: order.money.total + 1, to: "payment", funder: "owner", reason: null }, "x", hours(2))).toMatchObject({ ok: false, field: "amount" });
    const done = await decideComplaint(store, deps, made.complaint, order, { outcome: "partial_refund", amount: 15325, to: "payment", funder: "vendor", reason: null }, "nour@zad.test", hours(2), "Nour");
    expect(done).toMatchObject({ ok: true, complaint: { decision: { outcome: "partial_refund", to: "payment", amount: 15325, cardAmount: 15325 } } });
    expect(sent).toEqual([15325]);
    expect((await store.getMarketOrder(order.appId, order.id))!.paymentStatus).toBe("partly_refunded");
    expect(await store.walletBalance(order.appId, 7)).toBe(0);
    // A gateway's refusal is support's to read, and nothing is decided.
    const other = await setup();
    const c2 = await openComplaint(other.store, other.order, 7, ask(), hours(1));
    if (!c2.ok) throw new Error();
    expect(await decideComplaint(other.store, { refundToPayment: async () => ({ ok: false, error: "The gateway said no." }) }, c2.complaint, other.order, { outcome: "refund", to: "payment", funder: "owner", reason: null }, "x", hours(2))).toEqual({ ok: false, field: "to", error: "The gateway said no." });
    expect((await other.store.getMarketComplaint(other.order.appId, c2.complaint.id))!.decision).toBeNull();
  });

  it("an order paid partly from the wallet: the card takes back at most what it paid, a full refund gives the rest to the wallet", async () => {
    const { store, order } = await setup({}, 5000);
    const made = await openComplaint(store, order, 7, ask(), hours(1));
    if (!made.ok) throw new Error();
    const sent: number[] = [];
    const deps = { refundToPayment: async (_o: MarketOrder, amount: number) => (sent.push(amount), { ok: true as const }) };
    expect(refundableToPayment(order, [])).toBe(order.money.total - 5000);
    expect(await decideComplaint(store, deps, made.complaint, order, { outcome: "partial_refund", amount: order.money.total - 4000, to: "payment", funder: "owner", reason: null }, "x", hours(2))).toMatchObject({ ok: false, field: "amount" });
    const full = await decideComplaint(store, deps, made.complaint, order, { outcome: "refund", to: "payment", funder: "owner", reason: null }, "x", hours(2));
    expect(full).toMatchObject({ ok: true, complaint: { decision: { amount: order.money.total, cardAmount: order.money.total - 5000 } } });
    expect(sent).toEqual([order.money.total - 5000]);
    expect(await store.walletBalance(order.appId, 7)).toBe(5000);
    const all = (await store.listMarketComplaints({ appId: order.appId, orderId: order.id, limit: 10, offset: 0 })).items;
    expect(refundable(order, all)).toBe(0);
    expect(refundableToPayment(order, all)).toBe(0);
    expect((await store.getMarketOrder(order.appId, order.id))!.paymentStatus).toBe("refunded");
  });

  it("a refund to the wallet: one entry, at once, never twice, never more than what's left", async () => {
    const { store, order } = await setup();
    const made = await openComplaint(store, order, 7, ask(), hours(1));
    if (!made.ok) throw new Error();
    const done = await decideComplaint(store, {}, made.complaint, order, { outcome: "partial_refund", amount: 15325, to: "wallet", funder: "owner", reason: null }, "nour@zad.test", hours(2), "Nour");
    expect(done).toMatchObject({ ok: true, complaint: { status: "resolved", decision: { to: "wallet", amount: 15325, cardAmount: null } } });
    const entries = await store.listWalletEntries(order.appId, 7, { limit: 10, offset: 0 });
    expect(entries.items).toEqual([expect.objectContaining({ kind: "refund", amount: 15325, orderId: order.id, complaintId: made.complaint.id, key: `complaint:${made.complaint.id}` })]);
    // A second ticket can't take more than is left.
    const second = await openComplaint(store, order, 7, ask("damaged", [3]), hours(3));
    if (!second.ok) throw new Error();
    expect(await decideComplaint(store, {}, second.complaint, order, { outcome: "partial_refund", amount: order.money.total - 15325 + 1, to: "wallet", funder: "owner", reason: null }, "x", hours(4))).toMatchObject({ ok: false, field: "amount" });
    const rest = await decideComplaint(store, {}, second.complaint, order, { outcome: "refund", to: "wallet", funder: "owner", reason: null }, "x", hours(4));
    expect(rest).toMatchObject({ ok: true, complaint: { decision: { amount: order.money.total - 15325 } } });
    expect(await store.walletBalance(order.appId, 7)).toBe(order.money.total);
  });

  it("a coupon: SORRY-<order>, at the place, once, for 30 days, worth more than the refund if support says so, never more than the order", async () => {
    const { store, order, vendor } = await setup();
    const made = await openComplaint(store, order, 7, ask(), hours(1));
    if (!made.ok) throw new Error();
    const makeCoupon = (o: MarketOrder, amount: number, id: number) => complaintCoupon(store, o, amount, id, hours(2));
    expect(await decideComplaint(store, { makeCoupon }, made.complaint, order, { outcome: "partial_refund", amount: order.money.total + 1, to: "coupon", funder: "owner", reason: null }, "x", hours(2))).toMatchObject({ ok: false, field: "amount" });
    const done = await decideComplaint(store, { makeCoupon }, made.complaint, order, { outcome: "partial_refund", amount: 17500, to: "coupon", funder: "owner", reason: null }, "nour@zad.test", hours(2), "Nour");
    if (!done.ok) throw new Error(done.error);
    const code = `SORRY-${1000 + order.id}`;
    expect(done.complaint.decision).toMatchObject({ to: "coupon", amount: 17500, couponCode: code, couponEndsAt: new Date(hours(2).getTime() + COMPLAINT_COUPON_DAYS * 86_400_000).toISOString() });
    const coupon = await store.findMarketCouponByCode(order.appId, code);
    expect(coupon).toMatchObject({ kind: "amount", value: 17500, minOrder: 0, usesLimit: 1, perUserLimit: 1, vendorIds: [vendor.id], active: true, endsAt: new Date(hours(2).getTime() + 30 * 86_400_000) });
    // A coupon isn't money back: what can be refunded stays.
    expect(refundable(order, [done.complaint])).toBe(order.money.total);
    expect(await store.walletBalance(order.appId, 7)).toBe(0);
    // A second coupon on the same order takes the next code.
    expect((await complaintCoupon(store, order, 1000, 99, hours(3))).code).toBe(`${code}-2`);
  });

  it("declined: needs support's reason, which the customer reads", async () => {
    const { store, order } = await setup();
    const made = await openComplaint(store, order, 7, ask(), hours(1));
    if (!made.ok) throw new Error();
    expect(await decideComplaint(store, {}, made.complaint, order, { outcome: "no_refund", funder: "owner", reason: "" }, "x", hours(2))).toMatchObject({ ok: false, field: "reason" });
    const no = await decideComplaint(store, {}, made.complaint, order, { outcome: "no_refund", funder: "owner", reason: "16 November is the day the cheese was packed." }, "nour@zad.test", hours(2), "Nour");
    if (!no.ok) throw new Error();
    expect(no.complaint).toMatchObject({ status: "rejected", decision: { amount: null, to: null, byName: "Nour" } });
    const json = complaintJson(no.complaint, "EGP", (id) => id);
    expect(json.decision).toMatchObject({ outcome: "no_refund", reason: "16 November is the day the cheese was packed.", agent: "Nour" });
    expect(json.messages.at(-1)).toMatchObject({ from: "support", agent: "Nour", text: "16 November is the day the cheese was packed." });
  });

  it("the decision's time reads back from the JSON column as a string", async () => {
    const { store, order } = await setup();
    const made = await openComplaint(store, order, 7, ask(), hours(1));
    if (!made.ok) throw new Error();
    const done = await decideComplaint(store, {}, made.complaint, order, { outcome: "partial_refund", amount: 100, to: "wallet", funder: "owner", reason: null }, "x", hours(2));
    if (!done.ok) throw new Error();
    const stored = { ...done.complaint, decision: { ...done.complaint.decision!, at: hours(2).toISOString() as unknown as Date } };
    expect(complaintJson(stored, "EGP", (id) => id).decision?.at).toBe(hours(2).toISOString());
  });
});

describe("115.53 the queue", () => {
  const ticket = (patch: Partial<MarketComplaint>): MarketComplaint => ({
    id: 1, appId: "a", orderId: 1, vendorId: 1, userId: 7, reason: "quality", text: "", lineIds: [], photoAssetIds: [], status: "open", assignee: null, sharedWithVendor: false, messages: [], notes: [], decision: null, answeredAt: null, createdAt: NOW, updatedAt: NOW, ...patch,
  });

  it("'since last reply' is amber after 15 minutes and red after 1 hour, unless the owner set other minutes", () => {
    const colours = replyColoursOf(undefined);
    expect(colours).toEqual({ amberMinutes: 15, redMinutes: 60 });
    expect(replyTone(14, "support", colours)).toBe("ok");
    expect(replyTone(15, "support", colours)).toBe("amber");
    expect(replyTone(59, "support", colours)).toBe("amber");
    expect(replyTone(60, "support", colours)).toBe("red");
    expect(replyTone(600, "customer", colours)).toBeNull();
    const owner = replyColoursOf({ supportReply: { amberMinutes: 5, redMinutes: 30 } });
    expect(replyTone(10, "support", owner)).toBe("amber");
    expect(replyTone(30, "support", owner)).toBe("red");
    expect(replyColoursOf({ supportReply: { amberMinutes: 30, redMinutes: 30 } })).toEqual({ amberMinutes: 15, redMinutes: 60 });
  });

  it("the day's numbers: waiting, not assigned, the longest wait, the typical first reply, the decisions and money given back", () => {
    const decision = { outcome: "partial_refund" as const, amount: 15325, to: "wallet" as const, couponCode: null, funder: "owner" as const, reason: null, by: "n", at: minutes(30) };
    const items = [
      ticket({ id: 1, createdAt: minutes(-72) }),
      ticket({ id: 2, createdAt: minutes(-18), assignee: "n" }),
      ticket({ id: 3, status: "waiting_for_customer", createdAt: minutes(-30), answeredAt: minutes(-21), messages: [{ id: 1, from: "support", text: "Hi", by: "n", at: minutes(-21).toISOString() }] }),
      ticket({ id: 4, status: "resolved", createdAt: minutes(-60), decision, messages: [{ id: 1, from: "support", text: "Sorry", by: "n", at: minutes(-51).toISOString() }] }),
      ticket({ id: 5, status: "resolved", createdAt: minutes(-60), decision: { ...decision, to: "coupon", amount: 17500 } }),
    ];
    const stats = queueStats(items, minutes(40), minutes(-600));
    expect(stats).toMatchObject({ waiting: 2, notAssigned: 1, firstReplyTypical: 9, decidedToday: 2, refundedToday: 15325 });
    expect(stats.longest).toMatchObject({ complaint: { id: 1 }, minutes: 112 });
    expect(sortQueue(items, "longest", minutes(40)).map((c) => c.id).slice(0, 2)).toEqual([1, 2]);
    expect(sortQueue(items, "newest", minutes(40))[0]!.id).toBe(2);
  });

  it("search by complaint, order or customer", () => {
    const c = ticket({ id: 993, orderId: 3821 });
    expect(matchesSearch(c, { customerName: "Mona Adel" }, "C-1093")).toBe(true);
    expect(matchesSearch(c, { customerName: "Mona Adel" }, "C-1094")).toBe(false);
    expect(matchesSearch(c, { customerName: "Mona Adel" }, "M-4821")).toBe(true);
    expect(matchesSearch(c, { customerName: "Mona Adel" }, "mona")).toBe(true);
    expect(matchesSearch(c, { customerName: "Mona Adel" }, "tarek")).toBe(false);
  });

  it("times as the queue writes them", () => {
    expect(clockParts(9)).toMatchObject({ kind: "m", m: 9 });
    expect(clockParts(72)).toMatchObject({ kind: "hm", h: 1, m: 12 });
    expect(clockParts(120)).toMatchObject({ kind: "h", h: 2 });
    expect(clockParts(3 * 1440)).toMatchObject({ kind: "d", d: 3 });
  });
});
