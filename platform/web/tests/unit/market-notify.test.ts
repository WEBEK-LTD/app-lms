import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import type { DataStore } from "@/lib/data/store";
import { runFrequentJobs } from "@/lib/jobs/frequent";
import { decideComplaint } from "@/lib/market/complaints";
import { runMarketDaily } from "@/lib/market/daily";
import { complaintDecisionDeps } from "@/lib/market/decisions";
import { acceptMarketOrder, announceMarketOrder, cancelMarketOrder, deliveredByVendor, handOverMarketOrder, pickMarketOrder, readyMarketOrder, rejectMarketOrder } from "@/lib/market/flow";
import { remindClubRenewals, tellComplaint } from "@/lib/market/notify";
import { KEY, NOW } from "./helpers";
import { ACCOUNT, marketReleaseSuite, marketplaceWithPeople, pushRecorder } from "./market-notify-store-suite";

const MIN = 60_000;
const DAY = 86_400_000;

async function inbox(store: DataStore, appId: string, userId: number, type: string) {
  return (await store.listHostedNotifications({ appId, userId, since: new Date(0), page: 1, perPage: 100 })).items.filter((n) => n.data?.type === type).sort((a, b) => a.id - b.id);
}

describe("115.21 orders for later in memory", () => {
  marketReleaseSuite(() => new MemoryStore());

  it("115.21 the frequent job releases them, not only the daily one", async () => {
    const store = new MemoryStore();
    const m = await marketplaceWithPeople(store);
    const at = new Date(NOW.getTime() + 60 * MIN);
    const later = await store.createMarketOrder(m.order({ status: "scheduled", scheduledFor: at }));
    const push = pushRecorder();
    const now = new Date(at.getTime() - 20 * MIN);
    const job = () => runFrequentJobs({ store, key: KEY, now, ownerPush: { store, now, account: null }, send: push.send, marketAccount: ACCOUNT });
    // The frequent job twice at once: released and announced once.
    const [first, second] = await Promise.all([job(), job()]);
    expect(first.market.released + second.market.released).toBe(1);
    expect((await store.getMarketOrder(m.app.id, later.id))!.status).toBe("placed");
    expect(push.sent.filter((p) => p.data.type === "vendor_order").map((p) => p.tokens)).toEqual([["push-omar-vendor-0"]]);
    // The daily job after it finds nothing left to release.
    expect((await runMarketDaily(store, now, { account: ACCOUNT, send: push.send })).released).toBe(0);
  });
});

describe("115.22 the marketplace's notifications", () => {
  it("tells the customer of each stage, in the order's language, opening the order", async () => {
    const store = new MemoryStore();
    const m = await marketplaceWithPeople(store);
    const push = pushRecorder();
    const deps = { store, app: m.app, now: NOW, account: ACCOUNT, send: push.send };
    const titles = () => push.sent.filter((p) => p.data.type === "market_order_update").map((p) => p.title);

    // The vendor's own driver: placed, accepted, ready, on its way, delivered.
    const o = await store.createMarketOrder(m.order());
    await announceMarketOrder(deps, o);
    const accepted = await acceptMarketOrder(deps, o, 20);
    if (!accepted.ok) throw new Error("accept");
    const ready = await readyMarketOrder(deps, accepted.order);
    if (!ready.ok) throw new Error("ready");
    const away = await handOverMarketOrder(deps, ready.order, null);
    if (!away.ok) throw new Error("handover");
    expect((await deliveredByVendor(deps, away.order)).ok).toBe(true);
    expect(titles()).toEqual(["تم إرسال طلبك", "طلبك قيد التحضير", "طلبك جاهز", "طلبك في الطريق", "تم توصيل طلبك"]);
    // To her phone on the customers' app, never the vendor app; each opens the order.
    for (const p of push.sent.filter((x) => x.data.type === "market_order_update")) expect(p).toMatchObject({ tokens: ["push-mariam-customer-0"], data: { market_order_id: String(o.id) } });
    expect(push.sent.find((p) => p.title === "طلبك قيد التحضير")!.body).toMatch(/يجهز نحو 1[23]:\d\d/);
    // A move another screen already made isn't made, nor told, twice.
    expect((await acceptMarketOrder(deps, o, 20)).ok).toBe(false);
    expect(titles()).toHaveLength(5);
    // Its inbox has them too.
    expect(await inbox(store, m.app.id, m.customer.id, "market_order_update")).toHaveLength(5);

    // Turned down, with why; cancelled by her; in English and Turkish when that's her language.
    push.sent.length = 0;
    const en = await store.createMarketOrder(m.order({ lang: "en" }));
    await rejectMarketOrder(deps, en, "too_busy", null);
    expect(push.sent.at(-1)).toMatchObject({ title: "Your order wasn't accepted", body: `Abou Tarek couldn't take M-${1000 + en.id}. The place is too busy right now.` });
    const tr = await store.createMarketOrder(m.order({ lang: "tr" }));
    await cancelMarketOrder(deps, tr, "customer");
    expect(push.sent.at(-1)).toMatchObject({ title: "Sipariş iptal edildi", data: { type: "market_order_update", market_order_id: String(tr.id) } });
    // No language on the order: her phone's.
    const unknown = await store.createMarketOrder(m.order({ lang: null }));
    await cancelMarketOrder(deps, unknown, "customer");
    expect(push.sent.at(-1)!.title).toBe("تم إلغاء الطلب");
    // An order undone while it was being placed tells nobody.
    const undone = await store.createMarketOrder(m.order());
    const before = push.sent.length;
    await cancelMarketOrder({ ...deps, quiet: true }, undone, "owner");
    expect(push.sent).toHaveLength(before);

    // Booked for later: told it's booked, with its day and time in Cairo.
    const later = await store.createMarketOrder(m.order({ lang: "en", status: "scheduled", scheduledFor: new Date("2026-10-13T12:30:00Z") }));
    await announceMarketOrder(deps, later);
    expect(push.sent.at(-1)).toMatchObject({ title: "Your order is booked", body: `M-${1000 + later.id} from Abou Tarek is booked for 13 Oct 15:30. We'll tell you when they start on it.` });
    // …and the vendor isn't told before it's due.
    expect(push.sent.filter((p) => p.data.type === "vendor_order" && p.data.market_order_id === String(later.id))).toEqual([]);

    // Pick-up with its code.
    const pickup = await store.createMarketOrder(m.order({ lang: "en", fulfilment: "pickup", deliveryBy: null, pickupCode: "4821", status: "ready" }));
    await handOverMarketOrder(deps, pickup, "4821");
    expect(push.sent.at(-1)!.title).toBe("Picked up");
  });

  it("tells a grocery's customer it's being picked, and once when picking changed it", async () => {
    const store = new MemoryStore();
    const m = await marketplaceWithPeople(store);
    const push = pushRecorder();
    const deps = { store, app: m.app, now: NOW, account: ACCOUNT, send: push.send };
    await store.updateRestaurant(m.app.id, m.vendor.id, { kind: "grocery" }, NOW);
    const lines = [
      { id: 1, productId: 3, name: "Bananas", imageUrl: null, quantity: 1.5, unit: "kg" as const, choices: [], note: null, unitPrice: 3500, wasUnitPrice: null, total: 5250, ifMissing: "remove" as const, substituteProductId: null, outcome: null, pickedQuantity: null, substitute: null },
      { id: 2, productId: 4, name: "Milk", imageUrl: null, quantity: 1, unit: "item" as const, choices: [], note: null, unitPrice: 4000, wasUnitPrice: null, total: 4000, ifMissing: "remove" as const, substituteProductId: null, outcome: null, pickedQuantity: null, substitute: null },
    ];
    const o = await store.createMarketOrder(m.order({ lang: "en", vendorKind: "grocery", lines }));
    const accepted = await acceptMarketOrder(deps, o, 15);
    if (!accepted.ok) throw new Error("accept");
    expect(push.sent.at(-1)!.title).toBe("Your order is being picked");
    // Picked as ordered: nothing to tell.
    const same = await pickMarketOrder(store, accepted.order, [{ lineId: 2, outcome: "picked", pickedQuantity: null, substitute: null }], 10, null, NOW, deps);
    if (!same.ok) throw new Error("pick");
    expect(push.sent).toHaveLength(1);
    // The bananas weighed less: told once, not again on the next line.
    const weighed = await pickMarketOrder(store, same.order, [{ lineId: 1, outcome: "picked", pickedQuantity: 1.2, substitute: null }], 10, null, NOW, deps);
    if (!weighed.ok) throw new Error("pick");
    expect(push.sent.at(-1)).toMatchObject({ title: "Your order changed while it was picked", data: { type: "market_order_update", market_order_id: String(o.id) } });
    await pickMarketOrder(store, weighed.order, [{ lineId: 2, outcome: "missing", pickedQuantity: null, substitute: null }], 10, null, NOW, deps);
    expect(push.sent).toHaveLength(2);
  });

  it("tells the vendor's active staff of a new order on the vendor app, in their language, opening it there", async () => {
    const store = new MemoryStore();
    const m = await marketplaceWithPeople(store);
    // A manager who left isn't told; one without the app has only the inbox.
    const gone = await m.person("Samir", "+201099990001", [{ role: "vendor", language: "en" }]);
    await m.staff(gone, "manager", false);
    const push = pushRecorder();
    const deps = { store, app: m.app, now: NOW, account: ACCOUNT, send: push.send };
    const o = await store.createMarketOrder(m.order());
    await announceMarketOrder(deps, o);
    const vendor = push.sent.filter((p) => p.data.type === "vendor_order");
    expect(vendor).toEqual([{ tokens: ["push-omar-vendor-0"], title: "Yeni sipariş", body: `M-${1000 + o.id}: 2× Koshari (Large). Uygulamada kabul edin.`, data: { type: "vendor_order", market_order_id: String(o.id), notification_id: expect.any(String) } }]);
    expect(await inbox(store, m.app.id, gone.id, "vendor_order")).toEqual([]);
    expect(await inbox(store, m.app.id, m.taker.id, "vendor_order")).toHaveLength(1);

    // Without a vendor app, the Vendor tab in the customers' app gets it.
    const same = await marketplaceWithPeople(store, { vendorApp: "same" });
    const push2 = pushRecorder();
    const o2 = await store.createMarketOrder(same.order());
    await announceMarketOrder({ store, app: same.app, now: NOW, account: ACCOUNT, send: push2.send }, o2);
    expect(push2.sent.filter((p) => p.data.type === "vendor_order").map((p) => p.tokens)).toEqual([["push-omar-customer-1"]]);
  });

  it("keeps order updates to the inbox on phones that turned them off", async () => {
    const store = new MemoryStore();
    const m = await marketplaceWithPeople(store);
    const quiet = await m.person("Nour", "+201088880002", [{ role: "customer", language: "en", orders: false }]);
    const push = pushRecorder();
    const o = await store.createMarketOrder(m.order({ userId: quiet.id, lang: "en" }));
    await cancelMarketOrder({ store, app: m.app, now: NOW, account: ACCOUNT, send: push.send }, o, "customer");
    expect(push.sent.filter((p) => p.data.type === "market_order_update")).toEqual([]);
    expect((await inbox(store, m.app.id, quiet.id, "market_order_update")).map((n) => n.title)).toEqual(["Order cancelled"]);
  });

  it("tells the customer of support's reply and decision on a complaint, opening it", async () => {
    const store = new MemoryStore();
    const m = await marketplaceWithPeople(store);
    const push = pushRecorder();
    const o = await store.createMarketOrder(m.order({ status: "delivered", completedAt: NOW, paymentStatus: "paid" }));
    const c = await store.createMarketComplaint({
      appId: m.app.id, orderId: o.id, vendorId: m.vendor.id, userId: m.customer.id, reason: "quality", text: "It came cold.", lineIds: [], photoAssetIds: [], status: "open", assignee: null,
      sharedWithVendor: false, messages: [{ id: 1, from: "support", text: "We're checking with the place.", by: "team@souk.test", at: NOW.toISOString() }], notes: [], decision: null, answeredAt: NOW, createdAt: NOW, updatedAt: NOW,
    });
    const n = { store, app: m.app, now: NOW, account: ACCOUNT, send: push.send, courierAccount: null };
    await tellComplaint(n, c, "reply");
    expect(push.sent.at(-1)).toMatchObject({ tokens: ["push-mariam-customer-0"], title: "ردّ الدعم على شكواك", body: `C-${100 + c.id}: We're checking with the place.`, data: { type: "complaint_update", complaint_id: String(c.id) } });

    const decided = await decideComplaint(store, { ...complaintDecisionDeps(store, m.app, KEY, { ip: "203.0.113.1", now: NOW }) }, c, o, { outcome: "compensation", amount: 2000, to: "wallet", funder: "owner", reason: null }, "team@souk.test", NOW);
    expect(decided.ok).toBe(true);
    // The app has no push account of its own here: the decision reaches her inbox.
    expect((await inbox(store, m.app.id, m.customer.id, "complaint_update")).map((x) => [x.title, x.body, x.data])).toEqual([
      ["ردّ الدعم على شكواك", `C-${100 + c.id}: We're checking with the place.`, { type: "complaint_update", complaint_id: String(c.id) }],
      ["صدر قرار بشأن شكواك", `C-${100 + c.id}: We've added a credit to your wallet as an apology.`, { type: "complaint_update", complaint_id: String(c.id) }],
    ]);
  });

  it("reminds a club member 3 days before the plan ends and on its last day, once each, charging nothing", async () => {
    const store = new MemoryStore();
    const m = await marketplaceWithPeople(store);
    const plan = await store.createMarketClubPlan({ appId: m.app.id, name: "Club Monthly", description: null, period: "month", price: 49_00, currency: "EGP", freeDeliveryOver: 0, deliveryDiscountPercent: null, perks: [], active: true, position: 0, createdAt: NOW, updatedAt: NOW });
    const ends = new Date("2026-10-15T08:00:00Z");
    const member = await store.saveMarketClubMember({ appId: m.app.id, userId: m.customer.id, planId: plan.id, status: "active", renews: true, startedAt: NOW, paidUntil: ends, paymentRef: "club-1", saved: 0 }, NOW);
    // One who cancelled chose to let it end.
    const other = await m.person("Hoda", "+201077770003", [{ role: "customer", language: "en" }]);
    await store.saveMarketClubMember({ appId: m.app.id, userId: other.id, planId: plan.id, status: "cancelled", renews: false, startedAt: NOW, paidUntil: ends, paymentRef: "club-2", saved: 0 }, NOW);
    const push = pushRecorder();
    const remind = (now: Date) => remindClubRenewals({ store, app: m.app, now, account: ACCOUNT, send: push.send }, now);

    expect(await remind(new Date(ends.getTime() - 4 * DAY))).toBe(0);
    // 3 days before, by two runs at once: once.
    const soon = new Date(ends.getTime() - 3 * DAY + MIN);
    expect((await Promise.all([remind(soon), remind(soon)])).reduce((a, b) => a + b, 0)).toBe(1);
    expect(push.sent).toEqual([{ tokens: ["push-mariam-customer-0"], title: "تنتهي عضويتك في النادي قريبًا", body: "تنتهي Club Monthly في 15 أكتوبر 11:00. جدّدها من التطبيق لتحتفظ بميزة التوصيل.", data: { type: "club_renewal", plan_id: expect.any(String), url: expect.stringMatching(/\/pay\/[\w-]+\/in-app$/), notification_id: expect.any(String) } }]);
    expect(await remind(new Date(ends.getTime() - 2 * DAY))).toBe(0);
    // Its last day: once more.
    expect(await remind(new Date(ends.getTime() - 6 * 3_600_000))).toBe(1);
    expect(push.sent.at(-1)).toMatchObject({ title: "تنتهي عضويتك في النادي اليوم", body: "تنتهي Club Monthly اليوم الساعة 11:00. جدّدها من التطبيق لتحتفظ بميزة التوصيل." });
    expect(await remind(new Date(ends.getTime() - 3_600_000))).toBe(0);
    expect(push.sent).toHaveLength(2);
    // Nothing was charged: the membership is as it was.
    expect(await store.getMarketClubMember(m.app.id, m.customer.id)).toMatchObject({ id: member.id, status: "active", paidUntil: ends, paymentRef: "club-1" });
    expect(await inbox(store, m.app.id, other.id, "club_renewal")).toEqual([]);

    // Renewed for another month: reminded again before that one ends, from the daily job.
    const next = new Date(ends.getTime() + 30 * DAY);
    await store.saveMarketClubMember({ ...member, paidUntil: next }, NOW);
    const daily = await runMarketDaily(store, new Date(next.getTime() - 2 * DAY), { account: ACCOUNT, send: push.send });
    // (The member who cancelled has ended by then.)
    expect(daily).toMatchObject({ reminded: 1, expired: 1 });
    expect(push.sent.at(-1)!.data.type).toBe("club_renewal");
  });
});
