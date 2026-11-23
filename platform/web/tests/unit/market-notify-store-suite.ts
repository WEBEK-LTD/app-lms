import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App, HostedAppRole, HostedUser, MarketOrderInput, VendorRole } from "@/lib/data/types";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import type { PushMessage, PushTarget, ServiceAccount } from "@/lib/hosted/push";
import { releaseScheduled } from "@/lib/market/flow";
import { priceOrder } from "@/lib/market/money";
import { DEFAULT_MARKET_SETTINGS } from "@/lib/market/settings";
import { NOW } from "./helpers";

export const ACCOUNT = { project_id: "souk", client_email: "push@souk.test", private_key: "key" } as ServiceAccount;

export interface Sent {
  tokens: string[];
  title: string;
  body: string;
  data: Record<string, string>;
}

/** A fake push service that keeps what it was asked to send. */
export function pushRecorder() {
  const sent: Sent[] = [];
  const send = async (_: ServiceAccount, targets: PushTarget[], message: PushMessage) => {
    sent.push({ tokens: targets.map((t) => (typeof t === "string" ? t : t.token)).sort(), title: message.title, body: message.body, data: message.data ?? {} });
    return { sent: targets.length, invalidTokens: [] };
  };
  return { sent, send };
}

/**
 * 115.21/115.22 A marketplace with a restaurant (20 minutes to prepare), its
 * order taker on the vendor app (in Turkish), and a customer (Arabic) on the
 * customers' app; on any store.
 */
export async function marketplaceWithPeople(s: DataStore, options: { vendorApp?: "same" | "bundle" } = {}) {
  const suffix = randomUUID().slice(0, 8);
  const { client } = await registerClient(s, { name: "Souk Now", email: `notify-${suffix}@market.test`, whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
  const app: App = { ...newApp(client.id, null, NOW, "food"), backend: "hosted", connector: { kind: "restaurants" } };
  await s.createApp(app);
  await s.saveDeliverySettings(app.id, { ...DEFAULT_DELIVERY_SETTINGS, currency: "EGP", timezone: "Africa/Cairo", marketApp: { ...DEFAULT_MARKET_SETTINGS, vendorApp: options.vendorApp ?? "bundle" } }, NOW);
  const vendor = await s.createRestaurant(
    { appId: app.id, name: "Abou Tarek", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: { address: "Downtown", details: null, lat: 30.04, lng: 31.23 }, phone: null, hours: [], prepMinutes: 20, minOrderCents: 0, maxKm: null, commissionBp: 1000, active: true, position: 0, kind: "restaurant" },
    { sections: [], nextId: 1 },
    NOW,
  );
  const n = Math.floor(Math.random() * 9_000_000) + 1_000_000;
  const person = async (name: string, phone: string, devices: { role: HostedAppRole | null; language: string; orders?: boolean }[]): Promise<HostedUser> => {
    const user = (await s.createHostedUser({ appId: app.id, phone, name, email: null, city: null, now: NOW }))!;
    for (const [i, d] of devices.entries()) {
      await s.createHostedDevice({
        id: randomUUID(), appId: app.id, userId: user.id, deviceId: `install-${suffix}-${user.id}-${i}`, platform: "android", name: "Pixel 8", appVersion: "1.0.0",
        pushToken: `push-${name.toLowerCase()}-${d.role ?? "any"}-${i}`, pushPreferences: d.orders === false ? { orders: false } : null, language: d.language, appRole: d.role, createdAt: NOW, lastSeenAt: NOW,
      });
    }
    return user;
  };
  const customer = await person("Mariam", `+20100${n}`, [{ role: "customer", language: "ar" }]);
  const taker = await person("Omar", `+20110${n}`, [{ role: "vendor", language: "tr" }, { role: "customer", language: "tr" }]);
  const staff = async (user: HostedUser, role: VendorRole, active = true) => {
    const made = await s.createRestaurantStaff({ appId: app.id, restaurantId: vendor.id, name: user.name, phone: user.phone, email: null, active, role }, NOW);
    if (!made.ok) throw new Error("staff");
    return made.staff;
  };
  await staff(taker, "orders");
  const order = (patch: Partial<MarketOrderInput> = {}): MarketOrderInput => ({
    appId: app.id,
    vendorId: vendor.id,
    vendorName: vendor.name,
    vendorKind: "restaurant",
    userId: customer.id,
    customerName: "Mariam",
    customerPhone: customer.phone ?? "",
    fulfilment: "delivery",
    deliveryBy: "vendor",
    scheduledFor: null,
    lines: [{ id: 1, productId: 2, name: "Koshari", imageUrl: null, quantity: 2, unit: "item", choices: ["Large"], note: null, unitPrice: 6000, wasUnitPrice: null, total: 12000, ifMissing: "remove", substituteProductId: null, outcome: null, pickedQuantity: null, substitute: null }],
    money: priceOrder({ items: [{ unitPrice: 6000, quantity: 2 }], deliveryFee: 1500, deliveryBy: "vendor", commission: { kind: "percent", value: 10 }, collectedBy: "vendor" }),
    currency: "EGP",
    paymentMethod: "cash",
    paymentStatus: "unpaid",
    paymentRef: null,
    couponCode: null,
    status: "placed",
    dropoff: { address: "Street 9, Maadi", details: null, lat: 29.95, lng: 31.26 },
    distanceKm: 3,
    notes: null,
    pickupCode: null,
    prepMinutes: null,
    readyAt: null,
    rejection: null,
    shipmentId: null,
    rating: null,
    timeline: [{ status: patch.status ?? "placed", at: NOW.toISOString(), by: "customer" }],
    completedAt: null,
    lang: "ar",
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  });
  return { app, vendor, customer, taker, staff, person, order };
}

const MIN = 60_000;

/** 115.21 Orders for later reach their vendor on time, and once, on every store (MemoryStore, and MySQL or MariaDB). */
export function marketReleaseSuite(store: () => DataStore) {
  it("115.21 releases an order for later at its time less the vendor's preparation, once even when two runs overlap", async () => {
    const s = store();
    const m = await marketplaceWithPeople(s);
    const at = new Date(NOW.getTime() + 60 * MIN);
    const later = await s.createMarketOrder(m.order({ status: "scheduled", scheduledFor: at }));
    const push = pushRecorder();
    const run = (now: Date) => releaseScheduled({ store: s, app: m.app, now, account: ACCOUNT, send: push.send });

    // 41 minutes before: the vendor needs 20, so it isn't due yet (the old daily rule waited for 45 minutes before, once a day).
    expect(await run(new Date(at.getTime() - 41 * MIN))).toBe(0);
    expect((await s.getMarketOrder(m.app.id, later.id))!.status).toBe("scheduled");
    expect(push.sent).toEqual([]);

    // 20 minutes before, two runs at once: one releases it.
    const due = new Date(at.getTime() - 20 * MIN);
    const both = await Promise.all([run(due), run(due), run(due)]);
    expect(both.reduce((a, b) => a + b, 0)).toBe(1);
    const released = (await s.getMarketOrder(m.app.id, later.id))!;
    expect(released.status).toBe("placed");
    expect(released.timeline.map((t) => t.status)).toEqual(["scheduled", "placed"]);
    // Told once each: the order taker on the vendor app, the customer on hers.
    const vendorPushes = push.sent.filter((p) => p.data.type === "vendor_order");
    expect(vendorPushes).toHaveLength(1);
    expect(vendorPushes[0]).toMatchObject({ tokens: ["push-omar-vendor-0"], data: { type: "vendor_order", market_order_id: String(later.id) }, title: "Planlanmış bir siparişin zamanı geldi" });
    const customerPushes = push.sent.filter((p) => p.data.type === "market_order_update");
    expect(customerPushes).toHaveLength(1);
    expect(customerPushes[0]).toMatchObject({ tokens: ["push-mariam-customer-0"], title: "تم إرسال طلبك", data: { market_order_id: String(later.id) } });
    const inbox = await s.listHostedNotifications({ appId: m.app.id, userId: m.taker.id, since: new Date(0), page: 1, perPage: 20 });
    expect(inbox.items.filter((x) => x.data?.type === "vendor_order")).toHaveLength(1);

    // Again later: nothing more.
    expect(await run(new Date(at.getTime() - 5 * MIN))).toBe(0);
    expect(push.sent).toHaveLength(2);
  });

  it("115.21 counts the vendor's running late in its preparation", async () => {
    const s = store();
    const m = await marketplaceWithPeople(s);
    const at = new Date(NOW.getTime() + 3 * 60 * MIN);
    // Running 30 minutes late until well after the order's time: 20 + 30 minutes before it.
    await s.updateRestaurant(m.app.id, m.vendor.id, { delay: { minutes: 30, reason: "demand", note: null, until: new Date(at.getTime() + 60 * MIN), setAt: NOW } }, NOW);
    const later = await s.createMarketOrder(m.order({ status: "scheduled", scheduledFor: at }));
    const run = (now: Date) => releaseScheduled({ store: s, app: m.app, now, account: null });
    expect(await run(new Date(at.getTime() - 51 * MIN))).toBe(0);
    expect(await run(new Date(at.getTime() - 50 * MIN))).toBe(1);
    expect((await s.getMarketOrder(m.app.id, later.id))!.status).toBe("placed");
  });
}
