import { beforeEach, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { newApp } from "@/lib/app/setup";
import { sha256Hex } from "@/lib/crypto/tokens";
import { MemoryStore } from "@/lib/data/memory";
import type { App, CatalogOrder, Client, OwnerDevice, OwnerPushSounds, User } from "@/lib/data/types";
import { OWNER_PUSH_KINDS } from "@/lib/data/types";
import { apsOf, fcmMessage, type sendPush, type ServiceAccount } from "@/lib/hosted/push";
import { pushNewMarketOrder, pushNewMessage, pushNewOrder, pushOrderCancelled, type OwnerPushDeps, type OwnerPushMessage } from "@/lib/owner/push";
import { OWNER_RINGTONES, OWNER_SOUND_GROUP_OF, defaultPushSounds, inQuietHours, pushDelivery, pushSoundsJson, readPushSounds } from "@/lib/owner/push-sounds";
import { KEY, NOW, days } from "./helpers";
import { readdirSync } from "node:fs";
import path from "node:path";

/** 207 Yallapp Business's ringtones: what a phone chose, and how each push sounds on it. */

const ACCOUNT: ServiceAccount = { project_id: "yallapp-business", client_email: "push@yallapp-business.test", private_key: "-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----" };
const SOUNDS: OwnerPushSounds = { ...defaultPushSounds(), sounds: { orders: "rush_hour", messages: "pop" }, ring: ["orders"], ringMinutes: 5, quiet: { from: "23:00", to: "07:00" }, timeZone: "Europe/Istanbul" };

describe("207 ringtones", () => {
  it("has every ringtone the app bundles, for Android and iOS, and a group for every kind of push", () => {
    const business = path.join(__dirname, "../../../../business");
    const raw = readdirSync(path.join(business, "android/app/src/main/res/raw"));
    const ios = readdirSync(path.join(business, "ios/Runner/Sounds"));
    const assets = readdirSync(path.join(business, "assets/sounds"));
    for (const id of OWNER_RINGTONES) {
      expect(raw).toContain(`yb_ring_${id}.ogg`);
      expect(ios).toContain(`yb_ring_${id}.caf`);
      expect(ios).toContain(`yb_ring_${id}_long.caf`);
      expect(assets).toContain(`ring_${id}.m4a`);
    }
    for (const kind of OWNER_PUSH_KINDS) expect(OWNER_SOUND_GROUP_OF[kind]).toBeDefined();
  });

  it("reads a phone's choices, refusing what isn't one", () => {
    expect(readPushSounds({ sounds: { orders: "harp" } }, null)).toMatchObject({ ok: true, value: { sounds: { orders: "harp" }, ring: ["orders"], ringMinutes: 3 } });
    expect(readPushSounds({ sounds: { kitchen: "harp" } }, null)).toMatchObject({ ok: false, field: "sounds.kitchen" });
    expect(readPushSounds({ ring_minutes: 7 }, null)).toMatchObject({ ok: false, field: "ring_minutes" });
    expect(readPushSounds({ quiet: { from: "07:00", to: "07:00" } }, null)).toMatchObject({ ok: false, field: "quiet" });
    expect(readPushSounds({ quiet: null }, SOUNDS)).toMatchObject({ ok: true, value: { quiet: null, sounds: { orders: "rush_hour" } } });
    expect(pushSoundsJson(null)).toMatchObject({ saved: false, sounds: { orders: "counter_bell", bookings: "doorbell", cancelled: "knock", messages: "pop", other: "default" } });
  });

  it("knows the quiet hours in the phone's time zone, past midnight too", () => {
    // NOW is 10:00 UTC, 13:00 in Istanbul.
    expect(inQuietHours(SOUNDS, NOW)).toBe(false);
    expect(inQuietHours(SOUNDS, new Date("2026-10-12T21:30:00Z"))).toBe(true); // 00:30 there
    expect(inQuietHours(SOUNDS, new Date("2026-10-12T20:30:00Z"))).toBe(true); // 23:30
    expect(inQuietHours(SOUNDS, new Date("2026-10-12T04:30:00Z"))).toBe(false); // 07:30
    expect(inQuietHours({ quiet: { from: "13:00", to: "15:00" }, timeZone: null }, NOW)).toBe(false); // 10:00 UTC
  });

  it("words a push for each phone: as before when it never chose, data only on Android, the bundled sound on iOS", () => {
    expect(pushDelivery({ platform: "android", pushProvider: "fcm", pushSounds: null }, "new_order", NOW)).toBeNull();
    expect(pushDelivery({ platform: "android", pushProvider: "hms", pushSounds: SOUNDS }, "new_order", NOW)).toBeNull();
    expect(pushDelivery({ platform: "android", pushProvider: "fcm", pushSounds: SOUNDS }, "new_food_order", NOW)).toEqual({
      dataOnly: true,
      apnsSound: null,
      timeSensitive: false,
      data: { yb_group: "orders", yb_sound: "rush_hour", yb_ring: "1", yb_ring_minutes: "5" },
    });
    expect(pushDelivery({ platform: "ios", pushProvider: "fcm", pushSounds: SOUNDS }, "new_market_order", NOW)).toMatchObject({ dataOnly: false, apnsSound: "yb_ring_rush_hour_long.caf", timeSensitive: true });
    expect(pushDelivery({ platform: "ios", pushProvider: "fcm", pushSounds: SOUNDS }, "new_chat_message", NOW)).toMatchObject({ apnsSound: "yb_ring_pop.caf", timeSensitive: false, data: { yb_ring: "0" } });
    expect(pushDelivery({ platform: "ios", pushProvider: "fcm", pushSounds: SOUNDS }, "build_finished", NOW)).toMatchObject({ apnsSound: "default" });
    // In the quiet hours only orders make a sound.
    const night = new Date("2026-10-12T22:00:00Z");
    expect(pushDelivery({ platform: "ios", pushProvider: "fcm", pushSounds: SOUNDS }, "new_message", night)).toMatchObject({ apnsSound: null, data: { yb_sound: "silent" } });
    expect(pushDelivery({ platform: "ios", pushProvider: "fcm", pushSounds: SOUNDS }, "new_order", night)).toMatchObject({ apnsSound: "yb_ring_rush_hour_long.caf" });
    expect(pushDelivery({ platform: "ios", pushProvider: "fcm", pushSounds: { ...SOUNDS, ring: [] } }, "new_order", NOW)).toMatchObject({ apnsSound: "yb_ring_rush_hour.caf", data: { yb_ring: "0" } });
  });

  it("builds FCM's message: data only with the words in the data, or the notification with its sound", () => {
    const base = { title: "New order 1042", body: "Moda Café: ₺1.250,00", data: { kind: "new_order" } };
    expect(fcmMessage("t1", { ...base, dataOnly: true })).toEqual({ token: "t1", data: { kind: "new_order", yb_title: "New order 1042", yb_body: "Moda Café: ₺1.250,00" }, android: { priority: "high" } });
    // As before for every other app.
    expect(fcmMessage("t2", base)).toEqual({ token: "t2", notification: { title: base.title, body: base.body }, data: base.data, android: { priority: "high" }, apns: { payload: { aps: { sound: "default" } } } });
    expect(apsOf({ apnsSound: "yb_ring_harp_long.caf", timeSensitive: true })).toEqual({ sound: "yb_ring_harp_long.caf", "interruption-level": "time-sensitive" });
    expect(apsOf({ apnsSound: null })).toEqual({});
  });
});

describe("207 pushes with ringtones", () => {
  let store: MemoryStore;
  let user: User;
  let client: Client;
  let app: App;
  let sent: ({ targets: unknown[] } & OwnerPushMessage)[];
  const send = (async (_account, targets, message) => {
    sent.push({ targets, ...(message as OwnerPushMessage) });
    return { sent: targets.length, invalidTokens: [] };
  }) as typeof sendPush;
  const deps = (now = NOW): OwnerPushDeps => ({ store, now, account: ACCOUNT, send });

  async function device(id: string, patch: Partial<OwnerDevice>): Promise<void> {
    await store.createOwnerDevice({
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
      createdAt: NOW,
      lastSeenAt: NOW,
      ...patch,
    });
  }

  beforeEach(async () => {
    store = new MemoryStore();
    sent = [];
    ({ user, client } = await registerClient(store, { name: "Leyla", email: "leyla@cafe.test", whatsapp: "+905446731942", siteUrl: "", password: null }, NOW));
    await activateClient(store, { clientId: client.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    app = { ...newApp(client.id, null, NOW, "store", "restaurant"), backend: "hosted", appName: "Moda Café", connector: { kind: "catalog" } };
    await store.createApp(app);
    await device("11111111-1111-4111-8111-111111111111", {});
    await device("22222222-2222-4222-8222-222222222222", { pushSounds: SOUNDS });
    await device("33333333-3333-4333-8333-333333333333", { platform: "ios", pushSounds: SOUNDS });
  });

  it("sends one message per sound: the older app's as before, the new Android's data only, the iPhone's with its ringtone", async () => {
    expect(await pushNewOrder(deps(), app, { id: 42, totalCents: 125000, currency: "TRY" } as CatalogOrder)).toBe(3);
    const of = (id: string) => sent.find((s) => (s.targets as string[]).includes(`token-${id}`))!;
    const old = of("11111111-1111-4111-8111-111111111111");
    expect(old.dataOnly).toBeUndefined();
    expect(old.data).toEqual({ type: "owner", kind: "new_order", app_id: app.id, order_id: "42", business_id: client.id, business_name: "Moda Café" });
    expect(of("22222222-2222-4222-8222-222222222222")).toMatchObject({ title: "New order 1042", dataOnly: true, data: { kind: "new_order", order_id: "42", yb_group: "orders", yb_sound: "rush_hour", yb_ring: "1", yb_ring_minutes: "5" } });
    expect(of("33333333-3333-4333-8333-333333333333")).toMatchObject({ dataOnly: false, apnsSound: "yb_ring_rush_hour_long.caf", timeSensitive: true });
  });

  it("is quiet at night for a message, and rings for an order", async () => {
    const night = new Date("2026-10-12T22:00:00Z");
    await pushNewMessage(deps(night), app, { inquiryId: 7, listing: { title: "Flat" }, name: "Ali", text: "Hi" });
    const iphone = sent.find((s) => (s.targets as string[]).includes("token-33333333-3333-4333-8333-333333333333"))!;
    expect(iphone).toMatchObject({ apnsSound: null, data: { yb_sound: "silent", yb_ring: "0" } });
  });

  it("pushes a marketplace order reaching its vendor, and an order the customer cancelled", async () => {
    expect(await pushNewMarketOrder(deps(), app, { id: 12, vendorName: "Fresh Market", money: { total: 4550 } as never, currency: "TRY" })).toBe(3);
    expect(sent[0]).toMatchObject({ title: "New order M-1012", data: { kind: "new_market_order", market_order_id: "12" } });
    sent = [];
    expect(await pushOrderCancelled(deps(), app, { reference: "F-1003", place: "Burger Lab", ids: { food_order_id: "3" } })).toBe(3);
    expect(sent.find((s) => s.dataOnly)).toMatchObject({ title: "F-1003 was cancelled", body: "The customer cancelled the order at Burger Lab.", data: { kind: "order_cancelled", food_order_id: "3", yb_group: "cancelled", yb_sound: "knock", yb_ring: "0" } });
    // A device that turned the kind off gets none.
    await store.updateOwnerDevice("22222222-2222-4222-8222-222222222222", { pushPreferences: { order_cancelled: false } });
    sent = [];
    expect(await pushOrderCancelled(deps(), app, { reference: "F-1003", place: "Burger Lab", ids: { food_order_id: "3" } })).toBe(2);
  });
});
