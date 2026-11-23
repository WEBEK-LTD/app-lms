import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { DataStore } from "@/lib/data/store";
import type { App, CatalogOrder, OwnerDevice, OwnerPushSounds, RestaurantInput } from "@/lib/data/types";
import { formatCents } from "@/lib/catalog/money";
import { EMPTY_MENU } from "@/lib/food/menu";
import { restaurantState } from "@/lib/food/service";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { apsOf, fcmMessage, type sendPush, type ServiceAccount } from "@/lib/hosted/push";
import { endOrderActivities, firstName, readLiveActivity } from "@/lib/owner/live-activity";
import { daySummary, runDailySummaries, summaryWords } from "@/lib/owner/daily-summary";
import { WIDGET_KINDS, orderValue, pushNewOrder, type OwnerPushDeps, type OwnerPushMessage } from "@/lib/owner/push";
import { defaultPushSounds, pushDelivery, pushSoundsJson, readPushSounds, soundByValue } from "@/lib/owner/push-sounds";
import { appPause, pauseApp, pausePlace, placePause, readPause, reopen } from "@/lib/shop/pause";
import { getDashT, knownTranslator } from "@/i18n/dashboard";
import { NOW, days, setupClient } from "./helpers";

/** 214 Yallapp Business 1.0.6's server side: ring by order value, pause the shop, the end-of-day summary. */

const ACCOUNT: ServiceAccount = { project_id: "yallapp-business", client_email: "push@yallapp-business.test", private_key: "-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----" };

describe("214 ring by order value", () => {
  const bands = [
    { from: 0, sound: "pop" },
    { from: 500, sound: "cash_drawer" },
    { from: 2000, sound: "cha_ching" },
  ];

  it("reads up to three bands from 0, each above the one before", () => {
    expect(readPushSounds({ by_value: bands }, null)).toMatchObject({ ok: true, value: { byValue: bands } });
    expect(readPushSounds({ by_value: [{ from: 10, sound: "pop" }, { from: 20, sound: "pop" }] }, null)).toMatchObject({ ok: false, field: "by_value.0.from" });
    expect(readPushSounds({ by_value: [{ from: 0, sound: "pop" }, { from: 0, sound: "pop" }] }, null)).toMatchObject({ ok: false, field: "by_value.1.from" });
    expect(readPushSounds({ by_value: [{ from: 0, sound: "pop" }] }, null)).toMatchObject({ ok: false, field: "by_value" });
    expect(readPushSounds({ by_value: [...bands, { from: 5000, sound: "pop" }] }, null)).toMatchObject({ ok: false, field: "by_value" });
    expect(readPushSounds({ by_value: [{ from: 0, sound: "pop" }, { from: 9, sound: "trumpet" }] }, null)).toMatchObject({ ok: false, field: "by_value.1.sound" });
    // Back to the same sound for every order.
    expect(readPushSounds({ by_value: null }, { ...defaultPushSounds(), byValue: bands })).toMatchObject({ ok: true, value: { byValue: null } });
    expect(pushSoundsJson(null)).toMatchObject({ by_value: null, summary: { on: true, at: "23:00" } });
  });

  it("picks the band of the order's total, for new orders only", () => {
    expect(soundByValue(bands, 120)).toBe("pop");
    expect(soundByValue(bands, 500)).toBe("cash_drawer");
    expect(soundByValue(bands, 1999.99)).toBe("cash_drawer");
    expect(soundByValue(bands, 2400)).toBe("cha_ching");
    expect(soundByValue(bands, null)).toBeNull();
    expect(soundByValue(null, 100)).toBeNull();
    const sounds: OwnerPushSounds = { ...defaultPushSounds(), sounds: { orders: "harp" }, byValue: bands };
    expect(pushDelivery({ platform: "ios", pushProvider: "fcm", pushSounds: sounds }, "new_food_order", NOW, 2500)).toMatchObject({ apnsSound: "yb_ring_cha_ching_long.caf", data: { yb_sound: "cha_ching" } });
    expect(pushDelivery({ platform: "android", pushProvider: "fcm", pushSounds: sounds }, "new_order", NOW, 50)).toMatchObject({ data: { yb_sound: "pop" } });
    // Without a value (a shipment waiting), the orders' own sound.
    expect(pushDelivery({ platform: "android", pushProvider: "fcm", pushSounds: sounds }, "shipment_waiting", NOW)).toMatchObject({ data: { yb_sound: "harp" } });
    // Messages never ring by value.
    expect(pushDelivery({ platform: "android", pushProvider: "fcm", pushSounds: sounds }, "new_chat_message", NOW, 9999)).toMatchObject({ data: { yb_sound: "pop" } });
    expect(orderValue(125050)).toBe("1250.5");
  });

  it("sends each phone the sound of the order's value", async () => {
    const { store, client, user } = await setupClient({ plan: "pro" });
    const app: App = { ...newApp(client.id, null, NOW, "store", "restaurant"), backend: "hosted", appName: "Moda Café", connector: { kind: "catalog" } };
    await store.createApp(app);
    const device = (id: string, patch: Partial<OwnerDevice>): OwnerDevice => ({
      id,
      userId: user.id,
      clientId: client.id,
      name: id,
      platform: "ios",
      appVersion: null,
      language: "en",
      refreshHash: sha256Hex(id),
      refreshExpiresAt: days(60),
      sessionVersion: user.sessionVersion,
      pushToken: `token-${id}`,
      pushProvider: "fcm",
      pushPreferences: null,
      createdAt: NOW,
      lastSeenAt: NOW,
      ...patch,
    });
    await store.createOwnerDevice(device("11111111-1111-4111-8111-111111111111", { pushSounds: { ...defaultPushSounds(), byValue: bands } }));
    await store.createOwnerDevice(device("22222222-2222-4222-8222-222222222222", { pushSounds: { ...defaultPushSounds(), sounds: { orders: "harp" } } }));
    const sent: OwnerPushMessage[] = [];
    const send = (async (_a, targets, message) => {
      sent.push(message as OwnerPushMessage);
      return { sent: targets.length, invalidTokens: [] };
    }) as typeof sendPush;
    const deps: OwnerPushDeps = { store, now: NOW, account: ACCOUNT, send };
    expect(await pushNewOrder(deps, app, { id: 42, totalCents: 250000, currency: "TRY" } as CatalogOrder)).toBe(2);
    expect(sent.map((m) => m.apnsSound).sort()).toEqual(["yb_ring_cha_ching_long.caf", "yb_ring_harp_long.caf"]);
    expect(sent[0]!.data.order_value).toBe("2500");
  });
});

async function shopWith(store: DataStore, clientId: string): Promise<App> {
  const app: App = {
    ...newApp(clientId, null, NOW, "store"),
    backend: "hosted",
    demo: true,
    connector: { kind: "catalog" },
    catalogSettings: { currency: "TRY", shippingCents: 0, freeShippingOverCents: null, payment: null },
  };
  await store.createApp(app);
  return app;
}

describe("214 pause the shop", () => {
  it("reads 15, 30 or 60 minutes or until reopened, with a plain reason", () => {
    expect(readPause({ minutes: 30, reason: "  Short of <b>staff</b>  " })).toEqual({ ok: true, minutes: 30, reason: "Short of staff" });
    expect(readPause({ minutes: null })).toEqual({ ok: true, minutes: null, reason: null });
    expect(readPause({ minutes: 45 })).toMatchObject({ ok: false, field: "minutes" });
    expect(readPause({ minutes: 15, reason: 3 })).toMatchObject({ ok: false, field: "reason" });
  });

  it("a shop refuses new orders while paused, says so, and reopens by itself", async () => {
    const { store, client } = await setupClient({ plan: "pro" });
    let app = await shopWith(store, client.id);
    const product = await store.createCatalogProduct(
      { appId: app.id, name: "Tulip vase", description: "", priceCents: 30000, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null },
      NOW,
    );
    const user = (await store.createHostedUser({ appId: app.id, phone: "+905321112233", name: "Mona", email: null, city: null, now: NOW }))!;
    const checkout = async (now: Date) =>
      (await new CatalogConnector({ store, app, assetUrl: (id) => id, platformUrl: "https://yallapp.test" }).handle({
        method: "POST",
        path: ["store", "checkout-link"],
        query: new URLSearchParams("platform=android"),
        body: { lines: [{ product_id: product.id, quantity: 1 }] },
        user,
        now,
      }))!;
    const home = async (now: Date) => (await new CatalogConnector({ store, app, assetUrl: (id) => id, platformUrl: "https://yallapp.test" }).handle({ method: "GET", path: ["store", "home"], query: new URLSearchParams(), body: undefined, user, now }))!;

    await pauseApp(store, app, { minutes: 30, reason: "Back soon" }, NOW);
    app = (await store.getAppById(app.id))!;
    expect(appPause(app, NOW)).toMatchObject({ reason: "Back soon", until: new Date(NOW.getTime() + 30 * 60_000) });
    const refused = await checkout(NOW);
    expect(refused).toMatchObject({ status: 409, body: { code: "shop_paused" } });
    expect((refused.body as { message: string }).message).toContain("Back soon");
    expect((await home(NOW)).body).toMatchObject({ paused: { reason: "Back soon", until: new Date(NOW.getTime() + 30 * 60_000).toISOString() } });
    // After the 30 minutes it takes orders again by itself.
    const later = new Date(NOW.getTime() + 31 * 60_000);
    expect(appPause(app, later)).toBeNull();
    expect((await checkout(later)).status).toBe(200);
    expect((await home(later)).body).toMatchObject({ paused: null });

    // Until reopened, then reopened.
    await pauseApp(store, app, { minutes: null, reason: null }, NOW);
    app = (await store.getAppById(app.id))!;
    expect(appPause(app, days(30))).toMatchObject({ until: null });
    await reopen(store, app, null, NOW);
    app = (await store.getAppById(app.id))!;
    expect(appPause(app, NOW)).toBeNull();
    expect((await checkout(NOW)).status).toBe(200);
  });

  it("a restaurant or a marketplace place pauses alone, through its busy time, and reopens", async () => {
    const { store, client } = await setupClient({ plan: "pro" });
    let app: App = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", connector: { kind: "restaurants" } };
    await store.createApp(app);
    const input = (name: string): RestaurantInput =>
      ({
        appId: app.id,
        name,
        description: null,
        logoAssetId: null,
        coverAssetId: null,
        cuisines: [],
        address: { address: "Moda", details: null, lat: 40.98, lng: 29.03 },
        phone: null,
        hours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: "00:00", close: "23:59" })),
        prepMinutes: 20,
        minOrderCents: 0,
        maxKm: null,
        commissionBp: 1000,
        active: true,
        position: 0,
      }) as unknown as RestaurantInput;
    const burger = await store.createRestaurant(input("Burger Lab"), EMPTY_MENU, NOW);
    const kebab = await store.createRestaurant(input("Kebab House"), EMPTY_MENU, NOW);
    await pausePlace(store, app, burger, { minutes: 15, reason: "Oven repair" }, NOW);
    app = (await store.getAppById(app.id))!;
    const b = (await store.getRestaurant(app.id, burger.id))!;
    expect(placePause(app, burger.id, NOW)).toMatchObject({ reason: "Oven repair" });
    expect(placePause(app, kebab.id, NOW)).toBeNull();
    // The food and marketplace checkouts refuse it as busy.
    expect(restaurantState(b, "Europe/Istanbul", NOW)).toMatchObject({ busy: true, open: false });
    expect(restaurantState(b, "Europe/Istanbul", new Date(NOW.getTime() + 16 * 60_000)).busy).toBe(false);
    // Until reopened: busy a year ahead, then cleared.
    await pausePlace(store, app, kebab, { minutes: null, reason: null }, NOW);
    app = (await store.getAppById(app.id))!;
    expect((await store.getRestaurant(app.id, kebab.id))!.busyUntil!.getTime()).toBeGreaterThan(days(300).getTime());
    expect(placePause(app, burger.id, NOW)).not.toBeNull();
    await reopen(store, app, kebab.id, NOW);
    app = (await store.getAppById(app.id))!;
    expect((await store.getRestaurant(app.id, kebab.id))!.busyUntil).toBeNull();
    expect(placePause(app, kebab.id, NOW)).toBeNull();
    expect(placePause(app, burger.id, NOW)).not.toBeNull();
  });
});

describe("214 the end-of-day summary", () => {
  const words = (lang: "en" | "ar" | "tr") => ({ lang, t: getDashT(lang), k: knownTranslator(lang) });

  async function paid(store: DataStore, app: App, at: Date, cents: number, name: string) {
    const order = await store.createCatalogOrder({
      appId: app.id,
      tokenHash: sha256Hex(`o-${Math.random()}`),
      userId: null,
      status: "pending",
      lines: [{ productId: 1, name, quantity: 1, unitCents: cents, imageAssetId: null, digital: false }],
      subtotalCents: cents,
      shippingCents: 0,
      totalCents: cents,
      currency: "TRY",
      customer: null,
      paymentId: null,
      createdAt: at,
      paidAt: null,
      updatedAt: at,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    } as unknown as Omit<CatalogOrder, "id">);
    await store.payCatalogOrder(app.id, order.id, `PAY-${order.id}`, at);
  }

  it("tells today's sales, orders, average and best seller against the same weekday last week", async () => {
    const { store, client } = await setupClient({ plan: "pro" });
    const app = { ...(await shopWith(store, client.id)), demo: false };
    await store.updateApp(app.id, { demo: false }, NOW);
    // NOW is Monday 12 October 2026, 10:00 UTC (13:00 in Istanbul).
    await paid(store, app, NOW, 30000, "Tulips");
    await paid(store, app, new Date(NOW.getTime() + 3_600_000), 45000, "Roses");
    await paid(store, app, new Date(NOW.getTime() + 7_200_000), 30000, "Tulips");
    await paid(store, app, days(-7), 100000, "Roses");
    const s = await daySummary(store, app, "Europe/Istanbul", "2026-10-12");
    expect(s).toMatchObject({ salesCents: 105000, orders: 3, averageCents: 35000, best: "Tulips", compare: { date: "2026-10-05", salesCents: 100000, changePct: 5 } });
    expect(summaryWords(words("en"), s)).toEqual({ title: "Today: ₺1,050.00", body: "3 orders · average ₺350.00 · best seller Tulips · 5% more than last Monday" });
    expect(summaryWords(words("tr"), s).title).toBe("Bugün: ₺1.050,00");
    expect(summaryWords(words("ar"), s).body).toContain("الاثنين");
  });

  it("goes once to each phone at its time in the shop's zone, never on a day without orders", async () => {
    const { store, client, user } = await setupClient({ plan: "pro" });
    const app = await shopWith(store, client.id);
    await store.updateApp(app.id, { demo: false }, NOW);
    const at = (iso: string) => new Date(iso);
    const make = async (id: string, summary: OwnerPushSounds["summary"]) =>
      store.createOwnerDevice({
        id,
        userId: user.id,
        clientId: client.id,
        name: id,
        platform: "android",
        appVersion: null,
        language: "en",
        refreshHash: sha256Hex(id),
        refreshExpiresAt: days(60),
        sessionVersion: user.sessionVersion,
        pushToken: `token-${id}`,
        pushProvider: "fcm",
        pushPreferences: null,
        pushSounds: { ...defaultPushSounds(), summary },
        createdAt: NOW,
        lastSeenAt: NOW,
      });
    await make("11111111-1111-4111-8111-111111111111", null); // 23:00 by default
    await make("22222222-2222-4222-8222-222222222222", { on: true, at: "21:30" });
    await make("33333333-3333-4333-8333-333333333333", { on: false, at: "21:30" });
    const sent: { targets: unknown[]; message: OwnerPushMessage }[] = [];
    const send = (async (_a, targets, message) => {
      sent.push({ targets, message: message as OwnerPushMessage });
      return { sent: targets.length, invalidTokens: [] };
    }) as typeof sendPush;
    const run = (now: Date) => runDailySummaries({ store, now, account: ACCOUNT, send });
    // No orders today: nothing at 21:30 Istanbul (18:30 UTC).
    expect((await run(at("2026-10-12T18:35:00Z"))).sent).toBe(0);
    await paid(store, app, NOW, 30000, "Tulips");
    // Tomorrow, with an order: 21:30 goes to the second phone only, once.
    await paid(store, app, at("2026-10-13T08:00:00Z"), 45000, "Roses");
    expect((await run(at("2026-10-13T18:35:00Z"))).sent).toBe(1);
    expect(sent.at(-1)!.targets).toEqual(["token-22222222-2222-4222-8222-222222222222"]);
    expect(sent.at(-1)!.message).toMatchObject({ title: "Today: ₺450.00", data: { kind: "daily_summary", app_id: app.id, alert: "daily_summary", date: "2026-10-13" } });
    expect((await run(at("2026-10-13T18:40:00Z"))).sent).toBe(0);
    // 23:00 (20:00 UTC): the first phone.
    expect((await run(at("2026-10-13T20:05:00Z"))).sent).toBe(1);
    expect(sent.at(-1)!.targets).toEqual(["token-11111111-1111-4111-8111-111111111111"]);
  });
});

describe("214 the home-screen widget's pushes", () => {
  it("a new order's push also wakes an iPhone app, so its widget reads again", () => {
    expect(apsOf({ apnsSound: "default", contentAvailable: true })).toEqual({ sound: "default", "content-available": 1 });
    expect(apsOf({ apnsSound: null })).toEqual({});
    const message = fcmMessage("t", { title: "New order", body: "", data: {}, contentAvailable: true });
    expect(message.apns?.payload.aps).toMatchObject({ "content-available": 1 });
    expect(WIDGET_KINDS.has("new_order")).toBe(true);
    expect(WIDGET_KINDS.has("new_message")).toBe(false);
  });
});

describe("214 a new order's Live Activity", () => {
  const START = "a1".repeat(32);
  const ORDER = "b2".repeat(32);

  it("reads the phone's push-to-start token and its orders' activity tokens", () => {
    const read = readLiveActivity({ start_token: START.toUpperCase(), orders: [{ app_id: "app", kind: "new_order", order_id: "42", token: ORDER }] }, null, NOW);
    expect(read).toEqual({ ok: true, value: { start: START, orders: [{ appId: "app", kind: "new_order", orderId: "42", token: ORDER, at: NOW.toISOString() }] } });
    if (!read.ok) return;
    // An ended activity's token goes; the start token stays when not sent.
    expect(readLiveActivity({ orders: [{ app_id: "app", kind: "new_order", order_id: "42", token: null }] }, read.value, NOW)).toEqual({ ok: true, value: { start: START, orders: [] } });
    expect(readLiveActivity({ start_token: "not hex" }, null, NOW)).toEqual({ ok: false, field: "start_token" });
    expect(readLiveActivity({ orders: [{ app_id: "app", kind: "new_booking", order_id: "1", token: ORDER }] }, null, NOW)).toEqual({ ok: false, field: "orders.0.kind" });
    expect(firstName("  Selin Aydın ")).toBe("Selin");
  });

  it("starts on the iPhones that hear of the order, and ends everywhere once it is answered", async () => {
    const { store, client, user } = await setupClient({ plan: "pro" });
    const app: App = { ...newApp(client.id, null, NOW, "store", "restaurant"), backend: "hosted", appName: "Moda Café", connector: { kind: "catalog" } };
    await store.createApp(app);
    const base = { userId: user.id, clientId: client.id, appVersion: null, language: "ar", refreshHash: "", refreshExpiresAt: days(60), sessionVersion: user.sessionVersion, pushProvider: "fcm" as const, pushPreferences: null, createdAt: NOW, lastSeenAt: NOW };
    const iphone = "33333333-3333-4333-8333-333333333333";
    await store.createOwnerDevice({ ...base, id: iphone, name: "iPhone", platform: "ios", refreshHash: sha256Hex("i"), pushToken: "fcm-i", liveActivity: { start: START, orders: [] } });
    await store.createOwnerDevice({ ...base, id: "44444444-4444-4444-8444-444444444444", name: "Pixel", platform: "android", refreshHash: sha256Hex("p"), pushToken: "fcm-p" });
    const sent: { targets: unknown[]; message: Parameters<typeof sendPush>[2] }[] = [];
    const send = (async (_a, targets, message) => {
      sent.push({ targets, message });
      return { sent: targets.length, invalidTokens: [] };
    }) as typeof sendPush;
    const deps: OwnerPushDeps = { store, now: NOW, account: ACCOUNT, send };
    const order = { id: 42, totalCents: 25000, currency: "TRY", customer: { name: "Selin Aydın", phone: "", email: "", city: "", address: "" }, createdAt: NOW } as CatalogOrder;
    await pushNewOrder(deps, app, order);
    const live = sent.filter((s) => s.message.liveActivity);
    expect(live).toHaveLength(1);
    expect(live[0]!.targets).toEqual(["fcm-i"]);
    const start = live[0]!.message.liveActivity!;
    expect(start).toMatchObject({ token: START, event: "start", attributesType: "OrderActivityAttributes", contentState: { waiting: true } });
    expect(start.attributes).toMatchObject({ appId: app.id, kind: "new_order", orderId: "42", number: "1042", customer: "Selin", lang: "ar", placedAt: Math.floor(NOW.getTime() / 1000) });
    expect(fcmMessage("fcm-i", live[0]!.message)).toMatchObject({ apns: { live_activity_token: START, payload: { aps: { event: "start", "attributes-type": "OrderActivityAttributes" } } } });
    // The ringing push carries what the app needs to show it itself.
    const ring = sent.find((s) => !s.message.liveActivity)!;
    expect(ring.message.data).toMatchObject({ order_number: "1042", order_customer: "Selin", order_currency: "TRY", order_total: formatCents(25000, "TRY", "ar") });

    // The phone's activity gives its token; accepted from the dashboard, it ends.
    const device = (await store.listOwnerDevices(user.id)).find((d) => d.id === iphone)!;
    await store.updateOwnerDevice(iphone, { liveActivity: { start: START, orders: [{ appId: app.id, kind: "new_order", orderId: "42", token: ORDER, at: NOW.toISOString() }] } });
    expect(device.platform).toBe("ios");
    sent.length = 0;
    expect(await endOrderActivities(deps, app, "new_order", "42")).toBe(1);
    expect(sent[0]!.message.liveActivity).toMatchObject({ token: ORDER, event: "end", dismissalDate: Math.floor(NOW.getTime() / 1000) });
    expect((await store.listOwnerDevices(user.id)).find((d) => d.id === iphone)!.liveActivity!.orders).toEqual([]);
    // Once only.
    expect(await endOrderActivities(deps, app, "new_order", "42")).toBe(0);
  });
});

describe("214 Time Sensitive (iPhone)", () => {
  it("a new order goes through Focus first, also to an iPhone that never chose its ringtones; the day's summary doesn't", async () => {
    expect(apsOf({ apnsSound: "default", timeSensitive: true })).toEqual({ sound: "default", "interruption-level": "time-sensitive", "relevance-score": 1 });
    const { store, client, user } = await setupClient({ plan: "pro" });
    const app: App = { ...newApp(client.id, null, NOW, "store", "restaurant"), backend: "hosted", appName: "Moda Café", connector: { kind: "catalog" } };
    await store.createApp(app);
    await store.createOwnerDevice({ id: "55555555-5555-4555-8555-555555555555", userId: user.id, clientId: client.id, name: "iPhone", platform: "ios", appVersion: null, language: "en", refreshHash: sha256Hex("ts"), refreshExpiresAt: days(60), sessionVersion: user.sessionVersion, pushToken: "fcm-ts", pushProvider: "fcm", pushPreferences: null, createdAt: NOW, lastSeenAt: NOW });
    const sent: OwnerPushMessage[] = [];
    const send = (async (_a, targets, message) => {
      sent.push(message as OwnerPushMessage);
      return { sent: targets.length, invalidTokens: [] };
    }) as typeof sendPush;
    await pushNewOrder({ store, now: NOW, account: ACCOUNT, send }, app, { id: 7, totalCents: 1000, currency: "TRY", createdAt: NOW } as CatalogOrder);
    expect(sent[0]).toMatchObject({ timeSensitive: true });
    expect(pushDelivery({ platform: "ios", pushProvider: "fcm", pushSounds: defaultPushSounds() }, "daily_summary", NOW)).toMatchObject({ timeSensitive: false });
  });
});
