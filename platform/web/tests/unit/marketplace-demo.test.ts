import { beforeEach, describe, expect, it } from "vitest";
import type { MemoryStore } from "@/lib/data/memory";
import { listDemoApps } from "@/lib/demo/apps";
import { cleanDemoActivity } from "@/lib/demo/cleanup";
import { DEMO_SIGN_IN, demoIdOf } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { MARKET_CATALOG, MARKET_COUPON, MARKET_COURIER, OWNER_COUPON, SEED_ORDERS, DEMO_HOME } from "@/lib/demo/marketplace";
import { setupDemoApps } from "@/lib/demo/setup";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { connectorFor } from "@/lib/hosted/connectors";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { marketSettingsOf } from "@/lib/market/settings";
import { allSolutionsFor } from "@/lib/marketing-lang";
import { demoKind, DEMO_SLUGS } from "@/lib/demo/constants";
import { PLAN_INFO } from "@/lib/plans";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

/**
 * 115.15 Zad, Studio's multi-vendor demo: two restaurants and a supermarket
 * with their menus and catalog, the offers (one a place made), the club and
 * the wallet; the demo number's orders in every state, with its courier on
 * the map, and complaints in every state; the demo number as the
 * supermarket's staff and as a courier; and its day made again daily.
 */

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const MINUTE = 60_000;

describe("Zad, the multi-vendor demo", { timeout: 30_000 }, () => {
  let store: MemoryStore;
  let now: Date;

  const deps = (at: Date) => ({
    store,
    encryptionKey: KEY,
    putBlob: async () => undefined,
    assetUrl: (id: string) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    contact: { whatsapp: "+90 544 673 19 42", email: "info@yallapp.test" },
    actorEmail: "admin@yallapp.test",
    now: at,
  });

  beforeEach(async () => {
    clearPlatformSettingsCache();
    ({ store } = await setupClient());
    now = NOW;
    await setupDemoApps(deps(NOW), ["marketplace"]);
  });

  async function zad() {
    const app = (await listDemoApps(store, { fresh: true })).find((a) => demoIdOf(a) === "marketplace")!;
    const connector = connectorFor(app, KEY, { store, assetUrl: (id) => id, platformUrl: "https://yallapp.test" }) ?? undefined;
    const context = (): HostedContext => ({ store, app, active: true, now, ip: "203.0.113.30", secret: "test-hosted-secret", sender: new LogSender(), push: false, assetUrl: (id) => id, platformUrl: "https://yallapp.test", connector, plan: PLAN_INFO.business, chat: { storage: null, chunkBytes: 1024, onMessage: async () => undefined } });
    const call = async (method: string, route: string, options: { params?: string[]; token?: string; body?: unknown; query?: Record<string, string> } = {}): Promise<HostedResult> => {
      let concrete = route;
      for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
      const result = await handleHosted(context(), {
        method,
        path: concrete.split("/").filter(Boolean),
        query: new URLSearchParams({ platform: "android", app_version: "1.0.0", ...(options.query ?? {}) }),
        body: options.body,
        token: options.token ?? null,
      });
      expectContract(method, route, result);
      return result;
    };
    const ok = async <T = Record<string, unknown>>(method: string, route: string, options: Parameters<typeof call>[2] = {}): Promise<T> => {
      const result = await call(method, route, options);
      expect(result.status, `${method} ${route}: ${JSON.stringify(result.body)}`).toBeLessThan(300);
      return result.body as T;
    };
    const signIn = async () => {
      const requested = await ok<{ request_id: string }>("POST", "/auth/otp/request", { body: { country_code: DEMO_SIGN_IN.countryCode, phone: DEMO_SIGN_IN.number } });
      return (await ok<{ access_token: string }>("POST", "/auth/otp/verify", { body: { request_id: requested.request_id, code: DEMO_SIGN_IN.code, device: DEVICE } })).access_token;
    };
    return { app, call, ok, token: await signIn(), signIn };
  }

  type Order = { id: number; status: string; fulfilment: string; pickup_code: string | null; tracking: { mode: string; position: { lat: number; lng: number } | null } | null; scheduled_for: string | null };

  it("is \"Multi-vendor\" on /demo, with the multi-vendor apps page, never \"Marketplace\"", () => {
    expect(DEMO_SLUGS.marketplace).toBe("multi-vendor");
    expect(demoKind("marketplace").demo?.name).toBe("Multi-vendor");
    for (const lang of ["en", "ar", "tr"] as const) {
      const page = allSolutionsFor(lang).find((s) => s.demoSlug === "multi-vendor" && s.kind === "marketplace");
      expect(page?.id).toBe("multi-vendor");
      expect(JSON.stringify(page)).not.toMatch(/marketplace apps|Marketplace/);
    }
  });

  it("has two restaurants and a supermarket with its departments and products, no photos needed", async () => {
    const { app, ok } = await zad();
    expect(app.appName).toBe(DEMO_BRANDS.marketplace.appName);
    expect(app.vertical).toBe("marketplace");
    const settings = marketSettingsOf(deliverySettingsOf(await store.getDeliverySettings(app.id)));
    expect(settings).toMatchObject({ requirePhotos: false, pickup: true, club: true, wallet: true, scheduling: { enabled: true } });

    const vendors = await ok<{ items: { id: number; name: string; kind: string; delivery_by: string }[] }>("GET", "/market/vendors", { query: { lat: String(DEMO_HOME.lat), lng: String(DEMO_HOME.lng) } });
    expect(vendors.items.map((v) => [v.name, v.kind, v.delivery_by])).toEqual([
      ["Bab El Sharq Grill", "restaurant", "vendor"],
      ["Nile Pizza Co.", "restaurant", "app"],
      ["Zad Market", "grocery", "app"],
    ]);
    const grill = await ok<{ sections: { name: string; dishes: unknown[] }[] }>("GET", "/market/vendors/{vendor_id}", { params: [String(vendors.items[0]!.id)] });
    expect(grill.sections.map((s) => s.name)).toEqual(["Grills", "Sandwiches", "Mezze"]);
    const market = vendors.items[2]!;
    const shown = await ok<{ departments: { name: string }[] }>("GET", "/market/vendors/{vendor_id}", { params: [String(market.id)] });
    expect(shown.departments.map((d) => d.name)).toEqual(MARKET_CATALOG.map((d) => d.name));
    const products = await ok<{ total: number; items: { name: string; unit: string; image_url: string | null }[] }>("GET", "/market/vendors/{vendor_id}/products", { params: [String(market.id)], query: { per_page: "50" } });
    expect(products.total).toBe(MARKET_CATALOG.flatMap((d) => d.aisles.flatMap((a) => a.products)).length);
    expect(products.total).toBeGreaterThanOrEqual(30);
    expect(products.items.filter((p) => p.unit === "kg").length).toBeGreaterThanOrEqual(8);
    // No photos anywhere in this demo.
    expect(products.items.every((p) => !p.image_url)).toBe(true);
    expect((await store.listRestaurants(app.id)).every((r) => r.logoAssetId === null && r.coverAssetId === null)).toBe(true);
  });

  it("has the owner's code, an automatic offer, the places' own offers, the club and the wallet", async () => {
    const { app, ok, token } = await zad();
    const coupons = await store.listMarketCoupons(app.id);
    expect(coupons.find((c) => c.code === OWNER_COUPON)).toMatchObject({ paidBy: "owner", kind: "percent", value: 20, createdByVendorId: null });
    expect(coupons.filter((c) => c.code === null && !c.createdByVendorId)).toHaveLength(1);
    const market = (await store.listRestaurants(app.id)).find((r) => r.name === "Zad Market")!;
    const fresh = coupons.find((c) => c.code === MARKET_COUPON)!;
    expect(fresh).toMatchObject({ paidBy: "vendor", createdByVendorId: market.id, vendorIds: [market.id] });
    expect(fresh.departmentIds).toHaveLength(1);
    expect(coupons.filter((c) => c.createdByVendorId).length).toBe(2);

    const club = await ok<{ plans: { name: string }[] }>("GET", "/market/club");
    expect(club.plans.map((p) => p.name)).toEqual(["Zad Club", "Zad Club yearly"]);
    expect(await ok("GET", "/me/club", { token })).toMatchObject({ membership: { status: "active", plan: { name: "Zad Club" } } });
    const wallet = await ok<{ balance: { amount: string }; entries: { kind: string }[] }>("GET", "/me/wallet", { token });
    // The welcome credit and the resolved complaint's refund.
    expect(wallet.entries.map((e) => e.kind).sort()).toEqual(["credit", "refund"]);
    expect(wallet.balance.amount).toBe("118.00");
  });

  it("gives the demo number orders in every state, its courier moving on the map", async () => {
    const { ok, token } = await zad();
    const mine = await ok<{ total: number; items: Order[] }>("GET", "/me/market-orders", { token, query: { per_page: "50" } });
    expect(mine.total).toBe(SEED_ORDERS.filter((o) => o.who === "me").length);
    expect(new Set(mine.items.map((o) => o.status))).toEqual(new Set(["on_the_way", "scheduled", "ready", "delivered", "picked_up", "cancelled"]));
    expect(mine.items.find((o) => o.status === "scheduled")!.scheduled_for).not.toBeNull();
    const pickup = mine.items.find((o) => o.status === "ready")!;
    expect(pickup.fulfilment).toBe("pickup");
    expect(pickup.pickup_code).toMatch(/^\d{4}$/);

    const live = mine.items.find((o) => o.status === "on_the_way")!;
    expect(live.tracking?.mode).toBe("map");
    const first = live.tracking!.position!;
    now = new Date(NOW.getTime() + 2 * MINUTE);
    const later = (await ok<Order>("GET", "/me/market-orders/{order_id}", { token: await (await zad()).signIn(), params: [String(live.id)] })).tracking!.position!;
    expect(later).not.toEqual(first);
    // Hours later the seeded courier is still on the way: it sets off again rather than waiting at the door.
    now = new Date(NOW.getTime() + 5 * 60 * MINUTE);
    const again = await zad();
    const hours = (await again.ok<Order>("GET", "/me/market-orders/{order_id}", { token: again.token, params: [String(live.id)] })).tracking!;
    expect(hours.mode).toBe("map");
    expect(hours.position).not.toBeNull();
  });

  it("has complaints in every state, as the customer sees them", async () => {
    const { ok, token } = await zad();
    const complaints = await ok<{ items: { status: string }[] }>("GET", "/me/complaints", { token });
    expect(complaints.items.map((c) => c.status).sort()).toEqual(["in_review", "open", "rejected", "resolved", "waiting_for_customer"]);
  });

  it("makes the demo number Zad Market's owner and a courier: an order of theirs goes all the way", async () => {
    const { app, ok, token } = await zad();
    const me = await ok<{ roles: string[] }>("GET", "/me", { token });
    expect(me.roles.sort()).toEqual(["courier", "restaurant"]);
    expect((await ok<{ items: { status: string }[] }>("GET", "/vendor/orders", { token })).items.map((o) => o.status)).toContain("placed");

    const market = (await store.listRestaurants(app.id)).find((r) => r.name === "Zad Market")!;
    const products = await ok<{ items: { id: number; name: string }[] }>("GET", "/market/vendors/{vendor_id}/products", { params: [String(market.id)], query: { per_page: "50" } });
    const id = (name: string) => products.items.find((p) => p.name === name)!.id;
    const cart = {
      vendor_id: market.id,
      lines: [
        { product_id: id("Tomatoes"), quantity: 1.5 },
        { product_id: id("Bananas"), quantity: 1 },
        { product_id: id("Full-cream milk, 1 l"), quantity: 2 },
      ],
      fulfilment: "delivery",
      dropoff: DEMO_HOME,
      coupon_code: MARKET_COUPON,
    };
    const quote = await ok<{ quote_id: string; coupon: { code: string } | null }>("POST", "/market/quote", { token, body: cart });
    expect(quote.coupon?.code).toBe(MARKET_COUPON);
    const placed = await ok<{ order: { id: number } }>("POST", "/market/orders", { token, body: { ...cart, quote_id: quote.quote_id, payment: "cash" } });
    const order = String(placed.order.id);

    expect(await ok("POST", "/vendor/orders/{order_id}/accept", { token, params: [order], body: { prep_minutes: 15 } })).toMatchObject({ status: "picking" });
    await ok("PATCH", "/vendor/orders/{order_id}/lines", { token, params: [order], body: { lines: [{ line_id: 1, outcome: "picked", quantity: 1.4 }, { line_id: 2, outcome: "picked", quantity: 1.05 }, { line_id: 3, outcome: "picked" }] } });
    expect(await ok("POST", "/vendor/orders/{order_id}/ready", { token, params: [order] })).toMatchObject({ status: "ready" });

    await ok("PATCH", "/courier/me", { token, body: { on_duty: true } });
    const jobs = await ok<{ items: { id: number }[] }>("GET", "/courier/jobs", { token, query: { scope: "available" } });
    const job = (await store.getMarketOrder(app.id, placed.order.id))!.shipmentId!;
    expect(jobs.items.map((j) => j.id)).toEqual([job]);
    await ok("POST", "/courier/jobs/{shipment_id}/accept", { token, params: [String(job)] });
    await ok("POST", "/courier/jobs/{shipment_id}/status", { token, params: [String(job)], body: { status: "picked_up" } });
    await ok("POST", "/courier/jobs/{shipment_id}/status", { token, params: [String(job)], body: { status: "delivered" } });
    expect(await ok("GET", "/me/market-orders/{order_id}", { token, params: [order] })).toMatchObject({ status: "delivered" });
    // The seeded courier never gets the demo number's jobs.
    const karim = (await store.findCourier(app.id, { phone: MARKET_COURIER.phone, email: null }))!;
    expect((await store.getShipment(app.id, job))!.courierId).not.toBe(karim.id);
  });

  it("makes its day again: visitors' orders go after a day, the seeded ones come back from the clock", async () => {
    const { app, ok, token } = await zad();
    const market = (await store.listRestaurants(app.id)).find((r) => r.name === "Zad Market")!;
    const products = await ok<{ items: { id: number; name: string }[] }>("GET", "/market/vendors/{vendor_id}/products", { params: [String(market.id)], query: { per_page: "50" } });
    const cart = { vendor_id: market.id, lines: [{ product_id: products.items.find((p) => p.name === "Eggs, 30")!.id, quantity: 1 }], fulfilment: "pickup" };
    const quote = await ok<{ quote_id: string }>("POST", "/market/quote", { token, body: cart });
    const visitor = (await ok<{ order: { id: number } }>("POST", "/market/orders", { token, body: { ...cart, quote_id: quote.quote_id, payment: "cash" } })).order.id;
    // A visitor, as the owner, pauses the market's offer and adds a product.
    const fresh = (await store.findMarketCouponByCode(app.id, MARKET_COUPON))!;
    await store.updateMarketCoupon(app.id, fresh.id, { active: false });
    await store.updateRestaurant(app.id, market.id, { paused: true }, NOW);
    await store.createMarketProduct({ appId: app.id, vendorId: market.id, departmentId: null, aisleId: null, name: "Visitor's product", description: null, brand: null, sku: null, barcode: null, imageAssetId: null, imageUrl: null, price: 1_00, wasPrice: null, unit: "item", step: 1, maxQuantity: null, stock: null, inStock: true, tags: [], position: 99 }, NOW);

    // The same day: nothing seeded changes.
    const before = (await store.listMarketOrders({ appId: app.id, limit: 100, offset: 0 })).items;
    await cleanDemoActivity(store, new Date(NOW.getTime() + 60 * MINUTE));
    expect((await store.listMarketOrders({ appId: app.id, limit: 100, offset: 0 })).items.map((o) => o.id).sort()).toEqual(before.map((o) => o.id).sort());

    // The next day: the visitor's order is gone, the seeded ones are made again from the clock, the market is the demo's again.
    const tomorrow = new Date(NOW.getTime() + 25 * 60 * MINUTE);
    const report = await cleanDemoActivity(store, tomorrow);
    expect(report.deleted).toBeGreaterThanOrEqual(1);
    const after = (await store.listMarketOrders({ appId: app.id, limit: 100, offset: 0 })).items;
    expect(after.map((o) => o.id)).not.toContain(visitor);
    expect(after).toHaveLength(SEED_ORDERS.length);
    const live = after.find((o) => o.status === "on_the_way")!;
    expect(tomorrow.getTime() - live.createdAt.getTime()).toBe(SEED_ORDERS.find((o) => o.status === "on_the_way")!.minutesAgo * MINUTE);
    expect((await store.listMarketComplaints({ appId: app.id, limit: 50, offset: 0 })).total).toBe(5);
    expect((await store.findMarketCouponByCode(app.id, MARKET_COUPON))!.active).toBe(true);
    expect((await store.getRestaurant(app.id, market.id))!.paused).toBe(false);
    expect((await store.listMarketProducts({ appId: app.id, vendorId: market.id, q: "Visitor", page: 1, perPage: 10 })).total).toBe(0);
    // The wallet: the welcome credit once, and the refund of today's complaint (yesterday's went with its order).
    const user = (await store.getHostedUserByPhone(app.id, DEMO_SIGN_IN.e164))!;
    expect(await store.walletBalance(app.id, user.id)).toBe(118_00);
  });
});
