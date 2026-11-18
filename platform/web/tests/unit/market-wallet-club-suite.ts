import { createHash, randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App, MarketClubPlan, MarketOrderInput } from "@/lib/data/types";
import { clubPayLink, clubSavings, memberState, sendClubReminders } from "@/lib/market/club";
import { remindClubRenewals } from "@/lib/market/club-notify";
import { payClubMembership } from "@/lib/market/flow";
import { priceOrder } from "@/lib/market/money";
import { cancelClub, clubDue, joinClub, payFromWallet } from "@/lib/market/offers";
import { changeWallet, entryDetails } from "@/lib/market/wallet";
import { days, NOW } from "./helpers";

/**
 * 115.60–115.62 The wallet and the club, the same on every store (memory,
 * and MySQL or MariaDB with migration 0145): the balance never goes below
 * zero, even with two orders paying from it at once; the owner's credit and
 * take-backs; the club's periods, renewed early, late or on another plan;
 * the renewal reminders, each once; the savings read from the orders.
 */
export function marketWalletClubSuite(store: () => DataStore, others: () => DataStore[] = () => []) {
  async function setup(s: DataStore) {
    const suffix = randomUUID().slice(0, 8);
    const { client } = await registerClient(s, { name: "Zad", email: `wallet-${suffix}@market.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "food"), backend: "hosted", connector: { kind: "restaurants" } };
    await s.createApp(app);
    const plan = (patch: Partial<MarketClubPlan> = {}) =>
      s.createMarketClubPlan({ appId: app.id, name: "Monthly", description: null, period: "month", price: 49_00, currency: "EGP", freeDeliveryOver: 150_00, deliveryDiscountPercent: null, perks: ["Members' offers first"], active: true, position: 0, createdAt: NOW, updatedAt: NOW, ...patch });
    let n = 0;
    const person = async () => (await s.createHostedUser({ appId: app.id, phone: `+2010${suffix.replace(/\D/g, "").padEnd(4, "1").slice(0, 4)}${String(n++).padStart(4, "0")}`, name: "Mariam", email: null, city: null, now: NOW }))!.id;
    return { app, plan, person };
  }

  const credit = (s: DataStore, appId: string, userId: number, amount: number, key: string) =>
    s.addWalletEntry({ appId, userId, kind: "credit", amount, label: "Welcome", orderId: null, complaintId: null, key, createdAt: NOW });

  it("115.60 never lets two orders paying at once take the wallet below zero", async () => {
    const s = store();
    const { app } = await setup(s);
    await credit(s, app.id, 7, 100_00, "credit:1");
    // Two orders at once, each for 80: only one is paid from the wallet; on MySQL, from two connections.
    const payers = [s, ...others()].slice(0, 2);
    const [a, b] = await Promise.all([
      payFromWallet(payers[0]!, { appId: app.id, userId: 7, orderId: 1, amount: 80_00 }, NOW),
      payFromWallet(payers[1] ?? s, { appId: app.id, userId: 7, orderId: 2, amount: 80_00 }, NOW),
    ]);
    const balance = await s.walletBalance(app.id, 7);
    expect(balance).toBeGreaterThanOrEqual(0);
    expect(a + b).toBeLessThanOrEqual(100_00);
    expect(balance).toBe(100_00 - a - b);
    // Ten at once, for 30 each, on what is left: never below zero.
    const left = balance;
    const taken = await Promise.all(Array.from({ length: 10 }, (_, i) => payFromWallet([s, ...others()][i % Math.max(1, others().length || 1)] ?? s, { appId: app.id, userId: 7, orderId: 10 + i, amount: 30_00 }, NOW)));
    const after = await s.walletBalance(app.id, 7);
    expect(after).toBeGreaterThanOrEqual(0);
    expect(after).toBe(left - taken.reduce((x, y) => x + y, 0));
  });

  it("115.60 adds the owner's credit and takes it back with the reason the customer reads, never below zero", async () => {
    const s = store();
    const { app } = await setup(s);
    expect(await changeWallet(s, { appId: app.id, userId: 9, amount: 50_00, reason: "  ", direction: "credit" }, NOW)).toMatchObject({ ok: false, code: "invalid" });
    expect(await changeWallet(s, { appId: app.id, userId: 9, amount: 0, reason: "Welcome", direction: "credit" }, NOW)).toMatchObject({ ok: false, code: "invalid" });
    const given = await changeWallet(s, { appId: app.id, userId: 9, amount: 50_00, reason: "Welcome to Zad Club", direction: "credit", key: "form-1" }, NOW);
    expect(given).toMatchObject({ ok: true, balance: 50_00, entry: { kind: "credit", amount: 50_00, label: "Welcome to Zad Club" } });
    // The same form sent twice counts once.
    expect(await changeWallet(s, { appId: app.id, userId: 9, amount: 50_00, reason: "Welcome to Zad Club", direction: "credit", key: "form-1" }, NOW)).toMatchObject({ ok: false, code: "duplicate" });
    expect(await changeWallet(s, { appId: app.id, userId: 9, amount: 60_00, reason: "Given by mistake", direction: "take_back" }, days(1))).toMatchObject({ ok: false, code: "insufficient" });
    const back = await changeWallet(s, { appId: app.id, userId: 9, amount: 20_00, reason: "Given by mistake", direction: "take_back" }, days(1));
    expect(back).toMatchObject({ ok: true, balance: 30_00, entry: { kind: "taken_back", amount: -20_00, label: "Given by mistake" } });
    expect(await changeWallet(s, { appId: app.id, userId: 9, amount: 30_00, reason: "Closing", direction: "take_back" }, days(2))).toMatchObject({ ok: true, balance: 0 });
    expect(await s.walletBalance(app.id, 9)).toBe(0);
    // The owner's list: the customer, their balance and entries; a search narrows it.
    await credit(s, app.id, 10, 5_00, "credit:10");
    const list = await s.listWallets(app.id, { limit: 10, offset: 0 });
    expect(list.total).toBe(2);
    expect(list.items.find((w) => w.userId === 9)).toMatchObject({ balance: 0, entries: 3 });
    expect(list.items.find((w) => w.userId === 10)).toMatchObject({ balance: 5_00, entries: 1 });
    expect((await s.listWallets(app.id, { userIds: [10], limit: 10, offset: 0 })).items.map((w) => w.userId)).toEqual([10]);
    expect((await s.listWallets(app.id, { userIds: [], limit: 10, offset: 0 })).total).toBe(0);
    // Another app's wallets aren't in it.
    const other = await setup(s);
    expect((await s.listWallets(other.app.id, { limit: 10, offset: 0 })).total).toBe(0);
  });

  it("115.60 says where each amount came from and went", async () => {
    const s = store();
    const { app } = await setup(s);
    const vendor = await s.createRestaurant(
      { appId: app.id, name: "Bab El Sharq Grill", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: { address: "Maadi", details: null, lat: 29.96, lng: 31.25 }, phone: null, hours: [], prepMinutes: 15, minOrderCents: 0, maxKm: null, commissionBp: 800, active: true, position: 0, kind: "restaurant" },
      { sections: [], nextId: 1 },
      NOW,
    );
    const money = priceOrder({ items: [{ unitPrice: 200_00, quantity: 1 }], deliveryFee: 0, deliveryBy: "app", commission: { kind: "percent", value: 8 }, collectedBy: "owner", wallet: 120_00 });
    const order = await s.createMarketOrder(orderInput(app.id, vendor.id, vendor.name, 7, { money, paymentMethod: "card" }));
    await credit(s, app.id, 7, 150_00, "credit:7");
    await payFromWallet(s, { appId: app.id, userId: 7, orderId: order.id, amount: 120_00 }, NOW);
    await s.addWalletEntry({ appId: app.id, userId: 7, kind: "refund", amount: 30_00, label: "Refund", orderId: order.id, complaintId: 993, key: "complaint:993", createdAt: days(1) });
    const { items } = await s.listWalletEntries(app.id, 7, { limit: 10, offset: 0 });
    const details = await entryDetails(s, app.id, items);
    const pay = items.find((e) => e.kind === "payment")!;
    const refund = items.find((e) => e.kind === "refund")!;
    expect(details.get(pay.id)).toEqual({ vendorName: "Bab El Sharq Grill", orderReference: `M-${1000 + order.id}`, complaintReference: null, restPaidBy: money.payNow > 0 ? "card" : null });
    expect(details.get(refund.id)).toMatchObject({ vendorName: "Bab El Sharq Grill", complaintReference: "C-1093" });
  });

  it("115.61 runs a period from the end of the one paid, from the day it's paid when it already ended, and on another plan", async () => {
    const s = store();
    const { app, plan } = await setup(s);
    const monthly = await plan();
    const yearly = await plan({ name: "Yearly", period: "year", price: 490_00, position: 1 });
    const start = new Date("2026-01-31T09:00:00Z");
    const joined = await joinClub(s, monthly, 7, "club-1", start);
    // 31 January + a month is the last day of February, not March.
    expect(joined).toMatchObject({ status: "active", renews: true, periods: 1, paidTotal: 49_00 });
    expect(joined.paidUntil!.toISOString()).toBe("2026-02-28T09:00:00.000Z");
    // Renewed early (by its reminder's link): from the end of the period.
    const early = await joinClub(s, monthly, 7, "club-2", new Date("2026-02-26T09:00:00Z"));
    expect(early.paidUntil!.toISOString()).toBe("2026-03-28T09:00:00.000Z");
    // On the yearly plan, still paid: from the current end too.
    const switched = await joinClub(s, yearly, 7, "club-3", new Date("2026-03-20T09:00:00Z"));
    expect(switched).toMatchObject({ planId: yearly.id, periods: 3, paidTotal: 49_00 + 49_00 + 490_00 });
    expect(switched.paidUntil!.toISOString()).toBe("2027-03-28T09:00:00.000Z");
    // Ended, then paid late: from the day it's paid, the first day they joined kept.
    await clubDue(s, app.id, new Date("2027-03-29T09:00:00Z"));
    expect(await s.getMarketClubMember(app.id, 7)).toMatchObject({ status: "expired", renews: false });
    const late = new Date("2027-04-10T12:00:00Z");
    const back = await joinClub(s, monthly, 7, "club-4", late);
    expect(back.paidUntil!.toISOString()).toBe("2027-05-10T12:00:00.000Z");
    expect(back.startedAt!.toISOString()).toBe(start.toISOString());
    expect(memberState(back, late)).toBe("renewed");
    // Ending it: no more reminders, the benefit until the end, then ended.
    const ending = await cancelClub(s, back, late);
    expect(memberState(ending, late)).toBe("ending");
    expect(memberState(ending, new Date("2027-05-11T00:00:00Z"))).toBe("ended");
  });

  it("115.62 renews through the app's payment page: the link's payment runs the next period once", async () => {
    const s = store();
    const { app, plan, person } = await setup(s);
    const monthly = await plan();
    const who = await person();
    await joinClub(s, monthly, who, "club-start", NOW);
    const url = await clubPayLink(s, { appId: app.id, platformUrl: "https://yallapp.test", userId: who, lang: "ar", plan: monthly }, days(28));
    expect(url).toMatch(/^https:\/\/yallapp\.test\/pay\/[A-Za-z0-9_-]+$/);
    const token = url.split("/").pop()!;
    const pending = (await s.getCatalogOrderByToken(createHash("sha256").update(token).digest("hex")))!;
    expect(pending).toMatchObject({ status: "pending", totalCents: 49_00, userId: who });
    const paid = { ...pending, status: "processing" as const, paidAt: days(29) };
    expect(await payClubMembership(s, app, paid, days(29))).toBe(true);
    // Its redirect and its webhook: counted once.
    expect(await payClubMembership(s, app, paid, days(29))).toBe(false);
    const member = (await s.getMarketClubMember(app.id, who))!;
    expect(member.paidUntil!.toISOString()).toBe("2026-12-12T10:00:00.000Z");
    expect(member).toMatchObject({ periods: 2, paidTotal: 98_00 });
  });

  it("115.62 reminds 3 days before the end and on the last day, each once, and not after ending it", async () => {
    const s = store();
    const { app, plan } = await setup(s);
    const monthly = await plan();
    await joinClub(s, monthly, 7, "club-7", NOW); // ends 12 November
    await joinClub(s, monthly, 8, "club-8", NOW);
    await cancelClub(s, (await s.getMarketClubMember(app.id, 8))!, days(1));
    await joinClub(s, monthly, 9, "club-9", days(2)); // ends 14 November
    const sent: string[] = [];
    const run = (at: Date) => sendClubReminders(s, app.id, at, async ({ member, which }) => void sent.push(`${member.userId}:${which}`));
    expect(await run(days(25))).toBe(0);
    // 9 November: 3 days before the end of 7's period.
    expect(await run(new Date("2026-11-09T10:00:00Z"))).toBe(1);
    expect(await run(new Date("2026-11-09T18:00:00Z"))).toBe(0);
    // Two runs at once send it once (on MySQL, from two connections).
    const at = new Date("2026-11-11T10:00:00Z");
    const runs = [s, ...others()].slice(0, 2).map((x) => sendClubReminders(x, app.id, at, async ({ member, which }) => void sent.push(`${member.userId}:${which}`)));
    expect((await Promise.all(runs)).reduce((a, b) => a + b, 0)).toBe(2);
    expect(await run(new Date("2026-11-12T09:00:00Z"))).toBe(0);
    // 7: 3 days, then the last day; 9 first reached on 11 November, 3 days before; 8 ended it: nothing.
    expect(sent.sort()).toEqual(["7:3d", "7:last", "9:3d"]);
    // 9 reached first on its last day gets that one only.
    expect(await run(new Date("2026-11-13T12:00:00Z"))).toBe(1);
    expect(sent.filter((x) => x.startsWith("9:"))).toEqual(["9:3d", "9:last"]);
    // A new period after paying: its own reminders.
    await joinClub(s, monthly, 7, "club-7b", new Date("2026-11-11T12:00:00Z"));
    expect(await run(new Date("2026-12-09T10:00:00Z"))).toBe(1);
    expect(sent.filter((x) => x.startsWith("7:"))).toEqual(["7:3d", "7:last", "7:3d"]);
  });

  it("115.62 puts the reminder in the inbox with its payment link, once", async () => {
    const s = store();
    const { app, plan, person } = await setup(s);
    const monthly = await plan();
    const who = await person();
    await joinClub(s, monthly, who, "club-7", NOW);
    const deps = { store: s, now: new Date("2026-11-09T10:00:00Z"), platformUrl: "https://yallapp.test" };
    expect(await remindClubRenewals(deps, app, "Africa/Cairo")).toBe(1);
    expect(await remindClubRenewals(deps, app, "Africa/Cairo")).toBe(0);
    const inbox = await s.listHostedNotifications({ appId: app.id, userId: who, since: NOW, page: 1, perPage: 10 });
    expect(inbox.total).toBe(1);
    const n = inbox.items[0]!;
    expect(n.title).toBe("Your club membership ends in 3 days");
    expect(n.body).toContain("12 November");
    expect(n.data).toMatchObject({ type: "club_renewal", reminder: "3d", plan_id: String(monthly.id) });
    expect(String(n.data?.url)).toMatch(/^https:\/\/yallapp\.test\/pay\//);
  });

  it("115.61 reads the savings from the member's orders: delivery not paid and members' offers, this month and since joining", async () => {
    const s = store();
    const { app, plan } = await setup(s);
    const monthly = await plan();
    const start = new Date("2026-09-02T10:00:00Z");
    const member = await joinClub(s, monthly, 7, "club-1", start);
    await s.createMarketCoupon({ appId: app.id, code: "MEMBERS20", title: "Members' 20", kind: "amount", value: 20_00, maxDiscount: null, minOrder: 0, currency: "EGP", paidBy: "owner", firstOrderOnly: false, vendorIds: [], vendorKinds: [], departmentIds: [], usesLimit: null, perUserLimit: null, startsAt: null, endsAt: null, active: true, createdAt: NOW, updatedAt: NOW, membersOnly: true });
    const vendor = await s.createRestaurant(
      { appId: app.id, name: "Zad Market", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: { address: "Maadi", details: null, lat: 29.96, lng: 31.25 }, phone: null, hours: [], prepMinutes: 15, minOrderCents: 0, maxKm: null, commissionBp: 800, active: true, position: 0, kind: "grocery" },
      { sections: [], nextId: 1 },
      NOW,
    );
    const club = { kind: "free_delivery" as const, minItems: 150_00 };
    const done = async (at: Date, items: number, couponCode: string | null = null) => {
      const money = priceOrder({ items: [{ unitPrice: items, quantity: 1 }], deliveryFee: 25_00, deliveryBy: "app", commission: { kind: "percent", value: 8 }, collectedBy: "owner", club, coupon: couponCode ? { kind: "amount", value: 20_00, funder: "owner", code: couponCode } : null });
      await s.createMarketOrder(orderInput(app.id, vendor.id, vendor.name, 7, { money, couponCode, status: "delivered", completedAt: at, createdAt: at, updatedAt: at }));
    };
    await done(new Date("2026-08-20T10:00:00Z"), 200_00); // before joining: not counted
    await done(new Date("2026-10-05T10:00:00Z"), 200_00); // free delivery: 25
    await done(new Date("2026-11-03T10:00:00Z"), 200_00, "MEMBERS20"); // free delivery 25 + offer 20
    await done(new Date("2026-11-10T10:00:00Z"), 100_00); // under 150: delivery paid
    const savings = await clubSavings(s, app.id, (await s.getMarketClubMember(app.id, 7))!, new Date("2026-11-18T10:00:00Z"), "Africa/Cairo");
    expect(savings).toEqual({ total: 70_00, thisMonth: 45_00, delivery: 50_00, offers: 20_00, freeDeliveries: 2, deliveries: 3, paid: member.paidTotal });
  });

  it("115.61 keeps members' offers for members", async () => {
    const { checkCoupon } = await import("@/lib/market/offers");
    const s = store();
    const { app } = await setup(s);
    const c = (await s.createMarketCoupon({ appId: app.id, code: "CLUB10", title: "Members' 10%", kind: "percent", value: 10, maxDiscount: null, minOrder: 0, currency: "EGP", paidBy: "owner", firstOrderOnly: false, vendorIds: [], vendorKinds: [], departmentIds: [], usesLimit: null, perUserLimit: null, startsAt: null, endsAt: null, active: true, createdAt: NOW, updatedAt: NOW, membersOnly: true }))!;
    expect(c.membersOnly).toBe(true);
    const ctx = { now: NOW, vendorId: 1, vendorKind: "grocery" as const, lines: [{ departmentId: null, total: 100_00 }], userId: 7, firstOrder: false, uses: 0, userUses: 0 };
    expect(checkCoupon(c, ctx)).toMatchObject({ ok: false, refusal: "members_only" });
    expect(checkCoupon(c, { ...ctx, userId: null })).toMatchObject({ ok: false, refusal: "sign_in" });
    expect(checkCoupon(c, { ...ctx, member: true })).toMatchObject({ ok: true });
  });
}

function orderInput(appId: string, vendorId: number, vendorName: string, userId: number, patch: Partial<MarketOrderInput> = {}): MarketOrderInput {
  return {
    appId,
    vendorId,
    vendorName,
    vendorKind: "grocery",
    userId,
    customerName: "Mariam",
    customerPhone: "+201001234567",
    fulfilment: "delivery",
    deliveryBy: "app",
    scheduledFor: null,
    lines: [],
    money: priceOrder({ items: [{ unitPrice: 100_00, quantity: 1 }], deliveryFee: 15_00, deliveryBy: "app", commission: { kind: "percent", value: 8 }, collectedBy: "owner" }),
    currency: "EGP",
    paymentMethod: "card",
    paymentStatus: "paid",
    paymentRef: null,
    couponCode: null,
    status: "placed",
    dropoff: { address: "Street 9, Maadi", details: null, lat: 29.95, lng: 31.26 },
    distanceKm: 1.2,
    notes: null,
    pickupCode: null,
    prepMinutes: null,
    readyAt: null,
    rejection: null,
    shipmentId: null,
    rating: null,
    timeline: [],
    completedAt: null,
    lang: "en",
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}
