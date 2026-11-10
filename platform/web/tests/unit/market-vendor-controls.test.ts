import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_HOSTED_SETTINGS, type App, type DeliverySettings, type OpeningPeriod, type Restaurant, type RestaurantInput, type VendorRole } from "@/lib/data/types";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { daysToLook, restaurantState } from "@/lib/food/service";
import { FoodConnector } from "@/lib/hosted/connectors/food";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { orderSlots, quoteMarketDelivery, type MarketVendor } from "@/lib/market/delivery";
import { vendorSummaryJson } from "@/lib/market/json";
import { boardAction } from "@/lib/market/panel-board";
import { hoursFormBody, panelContext, placeHoursValues, tabsFor } from "@/lib/market/panel-pages";
import { DEFAULT_MARKET_SETTINGS } from "@/lib/market/settings";
import {
  activeDelay,
  afterOwnerEdit,
  delayJson,
  delayText,
  mayEditPlace,
  parseClosedDates,
  parseDelay,
  parseHoursList,
  placeChangePatch,
  plainNote,
  prepWithDelay,
  undoPlaceChangePatch,
} from "@/lib/market/vendor-controls";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/**
 * 115.20 What a marketplace place controls itself: running late (more
 * minutes on every time, with a reason customers see, ending by itself), and
 * its weekly hours, days off and preparation time, which the app's owner can
 * undo.
 */

const TZ = "Africa/Cairo";
const EVERY_DAY: OpeningPeriod[] = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((day) => ({ day, opens: "09:00", closes: "23:00" }));
const KITCHEN = { address: "Tahrir Square, Cairo", details: null, lat: 30.0444, lng: 31.2357 };
const HOME = { address: "Cairo Tower, Zamalek", details: "Flat 4", lat: 30.0459, lng: 31.2243 };
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

const settings: DeliverySettings = { ...DEFAULT_DELIVERY_SETTINGS, currency: "EGP", pricing: "fixed", fixedCents: 25_00, timezone: TZ, marketApp: { ...DEFAULT_MARKET_SETTINGS, requirePhotos: false } };
const vendor = (patch: Partial<MarketVendor> = {}): MarketVendor => ({ address: KITCHEN, maxKm: 10, deliveryAreas: null, minOrderCents: 0, prepMinutes: 20, hours: EVERY_DAY, busyUntil: null, active: true, delivery: { by: "vendor", feeKind: "fixed", fee: 15_00, perKm: 0, freeOver: null, minItems: null, maxItems: null, pickup: true, scheduling: true }, ...patch });
const deliver = (v: MarketVendor, now = NOW) => quoteMarketDelivery(settings, v, { fulfilment: "delivery", dropoff: HOME, items: 100_00, itemCount: 1 }, now);
const pickUp = (v: MarketVendor, now = NOW) => quoteMarketDelivery(settings, v, { fulfilment: "pickup", dropoff: null, items: 100_00, itemCount: 1 }, now);
const late = (n = 20, until: Date | null = minutes(60)) => ({ minutes: n, reason: "demand" as const, note: null, until, setAt: NOW });

describe("115.20 running late", () => {
  it("adds its minutes to delivery and pick-up times, and still takes orders", () => {
    const on = deliver(vendor());
    const delayed = deliver(vendor({ delay: late(20) }));
    expect(on.ok && delayed.ok).toBe(true);
    if (!on.ok || !delayed.ok) return;
    expect(delayed.minutes! - on.minutes!).toBe(20);
    expect(pickUp(vendor({ delay: late(30) }))).toMatchObject({ ok: true, minutes: 50 });
    expect(prepWithDelay({ prepMinutes: 20, delay: late(45) }, NOW)).toBe(65);
    // Orders for later start no sooner than the longer preparation.
    const first = orderSlots(vendor({ delay: late(60, null) }), TZ, NOW, { stepMinutes: 5 })[0]!;
    expect(first.start.getTime()).toBeGreaterThanOrEqual(minutes(80).getTime());
  });

  it("ends by itself", () => {
    const v = vendor({ delay: late(20, minutes(30)) });
    expect(activeDelay(v, minutes(29))).not.toBeNull();
    expect(activeDelay(v, minutes(30))).toBeNull();
    expect(pickUp(v, minutes(31))).toMatchObject({ ok: true, minutes: 20 });
    expect(delayJson(v, minutes(31))).toBeNull();
    // Until the place ends it.
    expect(activeDelay(vendor({ delay: late(20, null) }), minutes(60 * 24 * 30))).not.toBeNull();
  });

  it("is checked: the minutes, the reason, the place's own words in plain text, and how long", () => {
    expect(parseDelay(null, NOW)).toEqual({ ok: true, value: null });
    expect(parseDelay({ minutes: 20, reason: "demand", for_minutes: 30 }, NOW)).toEqual({ ok: true, value: { minutes: 20, reason: "demand", note: null, until: minutes(30), setAt: NOW } });
    expect(parseDelay({ minutes: 45, reason: "weather" }, NOW)).toMatchObject({ ok: true, value: { until: null } });
    expect(parseDelay({ minutes: 25, reason: "demand" }, NOW)).toMatchObject({ ok: false, field: "delay.minutes" });
    expect(parseDelay({ minutes: 10, reason: "lunch" }, NOW)).toMatchObject({ ok: false, field: "delay.reason" });
    expect(parseDelay({ minutes: 10, reason: "demand", for_minutes: 45 }, NOW)).toMatchObject({ ok: false, field: "delay.for_minutes" });
    expect(parseDelay({ minutes: 10, reason: "other" }, NOW)).toMatchObject({ ok: false, field: "delay.note" });
    expect(parseDelay({ minutes: 10, reason: "other", note: "x".repeat(81) }, NOW)).toMatchObject({ ok: false, field: "delay.note" });
    expect(parseDelay({ minutes: 10, reason: "other", note: " <b>Oven</b>   being\nfixed " }, NOW)).toMatchObject({ ok: true, value: { note: "Oven being fixed" } });
    expect(parseDelay({ minutes: 10, reason: "demand", note: "ignored" }, NOW)).toMatchObject({ ok: true, value: { note: null } });
    expect(plainNote("<script>alert(1)</script>Hi")).toBe("alert(1) Hi");
    expect(delayText({ minutes: 20, reason: "demand", note: null }, "en")).toBe("Running about 20 min late: high demand");
    expect(delayText({ minutes: 15, reason: "other", note: "Oven being fixed" }, "en")).toBe("Running about 15 min late: Oven being fixed");
  });

  it("shows on the customer's card: the time with the extra minutes, and why", () => {
    const v = { ...vendor({ delay: late(20) }), id: 1, appId: "a", name: "Nile Pizza Co.", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], phone: null, commissionBp: 0, ratingSum: 0, ratingCount: 0, position: 1, createdAt: NOW, updatedAt: NOW } as Restaurant;
    const q = deliver(v);
    if (!q.ok) throw new Error("no quote");
    const card = vendorSummaryJson(v, { open: true, opensAt: null, busy: false, distanceKm: 1, delivers: true, deliveryFee: q.fee, minutes: q.minutes, offer: null, clubBenefit: null, delay: delayJson(v, NOW) }, "EGP", (id) => id);
    expect(card.delay).toEqual({ minutes: 20, reason: "demand", note: null, until: minutes(60).toISOString() });
    expect(card.delivery_minutes!.min).toBe(q.minutes! - 5);
    expect(vendorSummaryJson(v, { open: true, opensAt: null, busy: false, distanceKm: 1, delivers: true, deliveryFee: 0, minutes: 30, offer: null, clubBenefit: null }, "EGP", (id) => id).delay).toBeNull();
  });
});

describe("115.20 days off and the place's own hours", () => {
  // NOW is Monday 12 October 2026, 13:00 in Cairo.
  it("is closed on a day off, and opens at the right time after it", () => {
    const v = { hours: EVERY_DAY, busyUntil: null, active: true };
    expect(restaurantState(v, TZ, NOW)).toMatchObject({ open: true });
    const off = { ...v, closedDates: [{ from: "2026-10-12", to: "2026-10-13" }] };
    const state = restaurantState(off, TZ, NOW);
    expect(state).toMatchObject({ open: false, inHours: false });
    // Wednesday 09:00 in Cairo.
    expect(state.opensAt?.toISOString()).toBe("2026-10-14T06:00:00.000Z");
    // A long closure: the next opening is found past it.
    const away = { ...v, closedDates: [{ from: "2026-10-12", to: "2026-10-31" }] };
    expect(restaurantState(away, TZ, NOW).opensAt?.toISOString()).toBe("2026-11-01T07:00:00.000Z");
    expect(daysToLook(away.closedDates, "2026-10-12")).toBeGreaterThan(19);
    expect(daysToLook([{ from: "2027-05-01", to: "2027-05-03" }], "2026-10-12")).toBe(8);
    // Orders for later skip the days off.
    const slots = orderSlots({ hours: EVERY_DAY, prepMinutes: 20, closedDates: [{ from: "2026-10-13", to: "2026-10-13" }] }, TZ, NOW, { days: 3 });
    expect(slots.some((s) => s.start.toISOString().startsWith("2026-10-13"))).toBe(false);
    expect(slots.some((s) => s.start.toISOString().startsWith("2026-10-14"))).toBe(true);
  });

  it("checks the days off and the weekly hours", () => {
    expect(parseClosedDates([{ from: "2026-12-31", to: "2027-01-01" }, { from: "2026-10-20" }], "2026-10-12")).toEqual({
      ok: true,
      value: [
        { from: "2026-10-20", to: "2026-10-20" },
        { from: "2026-12-31", to: "2027-01-01" },
      ],
    });
    // Past ones are dropped.
    expect(parseClosedDates([{ from: "2026-10-01", to: "2026-10-02" }], "2026-10-12")).toEqual({ ok: true, value: [] });
    expect(parseClosedDates([{ from: "2026-02-30", to: "2026-03-01" }], "2026-01-12")).toMatchObject({ ok: false });
    expect(parseClosedDates([{ from: "2026-10-20", to: "2026-10-19" }], "2026-10-12")).toMatchObject({ ok: false, error: "The last day off comes after the first." });
    expect(parseClosedDates([{ from: "2026-10-20", to: "2027-03-01" }], "2026-10-12")).toMatchObject({ ok: false });
    expect(parseClosedDates([{ from: "2028-10-20", to: "2028-10-21" }], "2026-10-12")).toMatchObject({ ok: false });
    expect(parseHoursList([{ day: "mon", opens: "10:00", closes: "02:00" }])).toEqual({ ok: true, value: [{ day: "mon", opens: "10:00", closes: "02:00" }] });
    expect(parseHoursList([{ day: "mon", opens: "10:00", closes: "10:00" }])).toMatchObject({ ok: false });
    expect(parseHoursList([{ day: "funday", opens: "10:00", closes: "12:00" }])).toMatchObject({ ok: false });
    expect(parseHoursList(Array.from({ length: 3 }, () => ({ day: "tue", opens: "10:00", closes: "12:00" })))).toMatchObject({ ok: false, error: "Up to two periods a day." });
    expect(hoursFormBody({ "mon-opens": "09:00", "mon-closes": "17:00", prep: "25" })).toEqual({ ok: true, body: { hours: [{ day: "mon", opens: "09:00", closes: "17:00" }], prep_minutes: 25 } });
  });

  it("keeps the values before for the owner's Undo, one level, and lets the owner keep or override them", () => {
    const place = { id: 1, hours: EVERY_DAY, closedDates: null, prepMinutes: 20, vendorEdit: null } as unknown as Restaurant;
    const short: OpeningPeriod[] = [{ day: "mon", opens: "12:00", closes: "20:00" }];
    const first = placeChangePatch(place, { hours: short }, "Hany", NOW)!;
    expect(first).toMatchObject({ hours: short, vendorEdit: { at: NOW, by: "Hany", fields: ["hours"], previous: { hours: EVERY_DAY, closedDates: [], prepMinutes: 20 } } });
    // A second change keeps what the owner had, and adds to what changed.
    const changed = { ...place, ...first } as Restaurant;
    const second = placeChangePatch(changed, { prepMinutes: 35, closedDates: [{ from: "2026-10-20", to: "2026-10-20" }] }, "Hany", minutes(5))!;
    expect(second.vendorEdit).toMatchObject({ fields: ["hours", "closed_dates", "prep_minutes"], previous: { hours: EVERY_DAY, prepMinutes: 20 } });
    const twice = { ...changed, ...second } as Restaurant;
    expect(undoPlaceChangePatch(twice)).toEqual({ hours: EVERY_DAY, closedDates: null, prepMinutes: 20, vendorEdit: null });
    expect(undoPlaceChangePatch(place)).toBeNull();
    // Nothing changed: nothing to save. Back as the owner had it: no notice.
    expect(placeChangePatch(place, { prepMinutes: 20 }, "Hany", NOW)).toBeNull();
    expect(placeChangePatch({ ...place, ...placeChangePatch(place, { prepMinutes: 30 }, "Hany", NOW)! } as Restaurant, { prepMinutes: 20 }, "Hany", NOW)).toMatchObject({ prepMinutes: 20, vendorEdit: null });
    // The owner sets the hours: they aren't the place's change any more, and Undo leaves them.
    const owner = afterOwnerEdit(twice, { hours: [{ day: "sun", opens: "10:00", closes: "18:00" }] });
    expect(owner.vendorEdit).toMatchObject({ fields: ["closed_dates", "prep_minutes"] });
    expect(undoPlaceChangePatch({ ...twice, ...owner } as Restaurant)).toEqual({ closedDates: null, prepMinutes: 20, vendorEdit: null });
    // Saving the same value again keeps the notice.
    expect(afterOwnerEdit(twice, { prepMinutes: 35 })).toEqual({});
  });

  it("is for the place's owner and managers", () => {
    expect((["owner", "manager", "orders", "picker"] as VendorRole[]).map(mayEditPlace)).toEqual([true, true, false, false]);
    expect(tabsFor("owner")).toContain("hours");
    expect(tabsFor("manager")).toContain("hours");
    expect(tabsFor("orders")).not.toContain("hours");
    expect(tabsFor("picker")).not.toContain("hours");
  });
});

describe("115.20 the vendor routes and the customer's view", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let place: number;

  const input = (appId: string): RestaurantInput => ({
    appId, name: "Abou Tarek", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: KITCHEN, phone: null, hours: EVERY_DAY, prepMinutes: 20, minOrderCents: 0, maxKm: 10, commissionBp: 1000, active: true, position: 1,
    delivery: { by: "vendor", feeKind: "fixed", fee: 15_00, perKm: 0, freeOver: null, minItems: null, maxItems: null, pickup: true, scheduling: false },
  });

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "food");
    app = { ...base, backend: "hosted", appName: "Nile Market", websiteDoneAt: NOW, connector: { kind: "restaurants" }, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" } };
    await store.createApp(app);
    await store.saveDeliverySettings(app.id, settings, NOW);
    place = (await store.createRestaurant(input(app.id), { sections: [], nextId: 1 }, NOW)).id;
    sender = new LogSender();
    now = NOW;
  });

  const context = (): HostedContext => ({
    store, app, active: true, now, ip: "203.0.113.9", secret: "test-hosted-secret", sender, push: false, assetUrl: (id) => `https://assets.test/${id}`, platformUrl: "https://yallapp.test",
    connector: new FoodConnector({ store, app, assetUrl: (id) => `https://assets.test/${id}`, platformUrl: "https://yallapp.test", food: true }),
  });

  async function call(method: string, route: string, options: { query?: Record<string, string>; params?: string[]; token?: string; body?: unknown } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null });
    expectContract(method, route, result);
    return result;
  }

  async function staff(phone: string, role: VendorRole) {
    await store.createRestaurantStaff({ appId: app.id, restaurantId: place, name: `Staff ${role}`, phone: `+20${phone}`, email: `${role}@place.test`, active: true, role }, NOW);
    now = new Date(now.getTime() + 61_000);
    const device = { id: `install-${phone}`, platform: "android", name: "Pixel 8", app_version: "1.0.0" };
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone } });
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: (requested.body as { request_id: string }).request_id, code: sender.sent.get(`+20${phone}`)!, device } });
    const registered = await call("POST", "/auth/register", { body: { signup_token: (verified.body as { signup_token: string }).signup_token, name: `Staff ${role}`, device } });
    return (registered.body as { access_token: string }).access_token;
  }

  const card = async () => {
    const list = await call("GET", "/market/vendors", { query: { lat: String(HOME.lat), lng: String(HOME.lng) } });
    return (list.body as { items: { delay: unknown; delivery_minutes: { min: number; max: number } | null; open: boolean; opens_at: string | null }[] }).items[0]!;
  };

  it("sets running late from the vendor app: customers see the longer time and why, until it ends", async () => {
    const token = await staff("1112223334", "orders");
    const before = await card();
    expect(before.delay).toBeNull();
    const set = await call("PATCH", "/vendor/me", { token, body: { delay: { minutes: 20, reason: "couriers", for_minutes: 60 } } });
    expect(set.status).toBe(200);
    expect(set.body).toMatchObject({ delay: { minutes: 20, reason: "couriers", note: null, until: new Date(now.getTime() + 3_600_000).toISOString() }, accepting: true });
    const after = await card();
    expect(after).toMatchObject({ open: true, delay: { minutes: 20, reason: "couriers" } });
    expect(after.delivery_minutes!.min - before.delivery_minutes!.min).toBe(20);
    const page = await call("GET", "/market/vendors/{vendor_id}", { params: [String(place)] });
    expect(page.body).toMatchObject({ delay: { minutes: 20 } });
    // It ends by itself (an hour later; the staff member's sign-in is renewed meanwhile in the app).
    const then = now;
    now = new Date(now.getTime() + 61 * 60_000);
    expect((await card()).delay).toBeNull();
    now = then;
    // Or when the place ends it.
    await call("PATCH", "/vendor/me", { token, body: { delay: { minutes: 10, reason: "other", note: "Oven being fixed" } } });
    expect((await card()).delay).toEqual({ minutes: 10, reason: "other", note: "Oven being fixed", until: null });
    expect((await call("PATCH", "/vendor/me", { token, body: { delay: null } })).body).toMatchObject({ delay: null });
    expect((await call("PATCH", "/vendor/me", { token, body: { delay: { minutes: 7, reason: "demand" } } })).status).toBe(400);
  });

  it("lets the place's owner and managers change its hours, days off and preparation time, and nobody else", async () => {
    const orders = await staff("1112223335", "orders");
    const manager = await staff("1112223336", "manager");
    expect((await call("GET", "/vendor/me", { token: orders })).body).toMatchObject({ can_edit_place: false, prep_minutes: 20, closed_dates: [] });
    expect((await call("PATCH", "/vendor/me", { token: orders, body: { prep_minutes: 30 } })).status).toBe(403);
    expect((await call("PATCH", "/vendor/me", { token: orders, body: { closed_dates: [{ from: "2026-10-12", to: "2026-10-13" }] } })).status).toBe(403);
    expect((await store.getRestaurant(app.id, place))!.prepMinutes).toBe(20);

    const changed = await call("PATCH", "/vendor/me", { token: manager, body: { prep_minutes: 30, closed_dates: [{ from: "2026-10-12", to: "2026-10-13" }], hours: [{ day: "wed", opens: "10:00", closes: "22:00" }] } });
    expect(changed.status).toBe(200);
    expect(changed.body).toMatchObject({ can_edit_place: true, prep_minutes: 30, closed_dates: [{ from: "2026-10-12", to: "2026-10-13" }], hours: [{ day: "wed", opens: "10:00", closes: "22:00" }], open: false });
    // Customers see it closed today, opening on Wednesday at 10:00 Cairo time.
    expect(await card()).toMatchObject({ open: false, opens_at: "2026-10-14T07:00:00.000Z" });
    const saved = (await store.getRestaurant(app.id, place))!;
    expect(saved.vendorEdit).toMatchObject({ by: "Staff manager", fields: ["hours", "closed_dates", "prep_minutes"], previous: { prepMinutes: 20, hours: EVERY_DAY } });
    // The owner's Undo puts everything back.
    await store.updateRestaurant(app.id, place, undoPlaceChangePatch(saved)!, now);
    expect(await store.getRestaurant(app.id, place)).toMatchObject({ prepMinutes: 20, hours: EVERY_DAY, closedDates: null, vendorEdit: null });
    expect((await call("PATCH", "/vendor/me", { token: manager, body: { prep_minutes: 500 } })).status).toBe(400);
  });

  it("does the same from the web panel, by the staff member's role", async () => {
    await store.createRestaurantStaff({ appId: app.id, restaurantId: place, name: "Rana", phone: null, email: "rana@place.test", active: true, role: "owner" }, NOW);
    await store.createRestaurantStaff({ appId: app.id, restaurantId: place, name: "Picker", phone: null, email: "pick@place.test", active: true, role: "picker" }, NOW);
    const all = await store.listRestaurantStaff(app.id, place);
    const owner = all.find((s) => s.name === "Rana")!;
    const picker = all.find((s) => s.name === "Picker")!;
    expect((await boardAction(store, app, owner, { action: "desk", delay: { minutes: 15, reason: "weather", for_minutes: 30 } })).status).toBe(200);
    expect((await boardAction(store, app, picker, { action: "desk", delay: null })).status).toBe(403);
    const body = hoursFormBody({ "fri-opens": "13:00", "fri-closes": "01:00", prep: "25" });
    if (!body.ok) throw new Error(body.error);
    expect((await boardAction(store, app, owner, { action: "desk", ...body.body })).status).toBe(200);
    const ctx = (await panelContext(store, app, owner))!;
    expect(placeHoursValues(ctx, NOW).values).toMatchObject({ "fri-opens": "13:00", "fri-closes": "01:00", prep: "25" });
    expect((await store.getRestaurant(app.id, place))!.vendorEdit).toMatchObject({ by: "Rana", fields: ["hours", "prep_minutes"] });
  });
});
