import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type DeliverySettings, type RestaurantInput, type RestaurantMenu } from "@/lib/data/types";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { FoodConnector } from "@/lib/hosted/connectors/food";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { runMarketDaily } from "@/lib/market/daily";
import { payClubMembership } from "@/lib/market/flow";
import { sha256Hex } from "@/lib/crypto/tokens";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
const KITCHEN = { address: "Tahrir Square, Cairo", details: null, lat: 30.0444, lng: 31.2357 };
const HOME = { address: "Cairo Tower, Zamalek", details: "Flat 4", lat: 30.0459, lng: 31.2243 };
const EVERY_DAY = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((day) => ({ day, opens: "00:00", closes: "23:59" }));

const SETTINGS: DeliverySettings = {
  ...DEFAULT_DELIVERY_SETTINGS,
  currency: "EGP",
  pricing: "distance",
  baseCents: 20_00,
  perKmCents: 10_00,
  minCents: 25_00,
  maxKm: 20,
  cash: true,
  card: true,
  cuisines: [{ id: "egyptian", name: "Egyptian" }],
  timezone: "Africa/Cairo",
  marketApp: {
    country: "EG",
    currency: null,
    tax: { ratePercent: 14, included: true, onDelivery: false, label: "VAT" },
    payment: { gateway: "iyzico", cash: true, cashMax: null, applePay: false, googlePay: false },
    pickup: true,
    scheduling: { enabled: true, daysAhead: 3 },
    club: true,
    wallet: true,
    weightTolerancePercent: 10,
    vendorApp: "bundle",
    // These tests' products have no photos; market-photos.test.ts covers the photo rule.
    requirePhotos: false,
  },
};

const MENU: RestaurantMenu = {
  sections: [{ id: 1, name: "Mains", dishes: [{ id: 2, name: "Koshari", description: null, imageAssetId: null, priceCents: 50_00, available: true, popular: true, choiceGroups: [] }] }],
  nextId: 3,
};

const vendor = (appId: string, patch: Partial<RestaurantInput> = {}): RestaurantInput => ({
  appId,
  name: "Abou Tarek",
  description: "Koshari since 1950",
  logoAssetId: "logo-1",
  coverAssetId: null,
  cuisines: ["egyptian"],
  address: KITCHEN,
  phone: "+20225775935",
  hours: EVERY_DAY,
  prepMinutes: 20,
  minOrderCents: 0,
  maxKm: null,
  commissionBp: 1000,
  active: true,
  position: 1,
  ...patch,
});

describe("115 the marketplace's routes", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let restaurant: number;
  let grocery: number;
  let apples: number;
  let milk: number;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "food");
    app = {
      ...base,
      backend: "hosted",
      appName: "Nile Market",
      websiteDoneAt: NOW,
      connector: { kind: "restaurants" },
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: encryptPaymentKeys(base.id, "sandbox-api", "sandbox-secret", true, KEY) },
    };
    await store.createApp(app);
    await store.saveDeliverySettings(app.id, SETTINGS, NOW);
    // A restaurant whose own drivers deliver; a grocery on the app's couriers with pick-up.
    restaurant = (
      await store.createRestaurant(
        vendor(app.id, { delivery: { by: "vendor", feeKind: "fixed", fee: 15_00, perKm: 0, freeOver: null, minItems: null, maxItems: null, pickup: false, scheduling: true }, area: "Downtown" }),
        MENU,
        NOW,
      )
    ).id;
    grocery = (
      await store.createRestaurant(
        vendor(app.id, { name: "Green Basket", kind: "grocery", cuisines: [], delivery: { by: "app", feeKind: "fixed", fee: 0, perKm: 0, freeOver: null, minItems: null, maxItems: null, pickup: true, scheduling: false }, position: 2 }),
        { sections: [], nextId: 1 },
        NOW,
      )
    ).id;
    const made = async (name: string, price: number, unit: "item" | "kg", step: number, stock: number | null) => {
      const r = await store.createMarketProduct(
        { appId: app.id, vendorId: grocery, departmentId: null, aisleId: null, name, description: null, brand: null, sku: name.toLowerCase(), barcode: null, imageAssetId: null, imageUrl: null, price, wasPrice: null, unit, step, maxQuantity: null, stock, inStock: true, tags: [], position: 1 },
        NOW,
      );
      if (!r.ok) throw new Error("product");
      return r.product.id;
    };
    apples = await made("Apples", 40_00, "kg", 0.5, null);
    milk = await made("Milk", 30_00, "item", 1, 10);
    sender = new LogSender();
    now = NOW;
  });

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: ASSETS,
    platformUrl: "https://yallapp.test",
    connector: new FoodConnector({ store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test", food: true }),
  });

  async function call(method: string, route: string, options: { query?: Record<string, string>; params?: string[]; token?: string; body?: unknown } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone: string, name: string) {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+20${phone}`)!, device: { ...DEVICE, id: `install-${phone}` } } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: { ...DEVICE, id: `install-${phone}` } } });
    return registered.body as { access_token: string; user: { id: number } };
  }

  async function staffOf(vendorId: number, phone: string, name: string) {
    await store.createRestaurantStaff({ appId: app.id, restaurantId: vendorId, name, phone: `+20${phone}`, email: null, active: true, role: "manager" }, NOW);
    return signUp(phone, name);
  }

  const restaurantCart = { vendor_id: 0, lines: [{ product_id: 2, quantity: 2 }], fulfilment: "delivery", dropoff: HOME };

  async function quoteAndOrder(token: string, cart: Record<string, unknown>, payment = "cash") {
    const quote = await call("POST", "/market/quote", { token, body: cart });
    expect(quote.status, JSON.stringify(quote.body)).toBe(200);
    const placed = await call("POST", "/market/orders", { token, query: { platform: "android" }, body: { ...cart, quote_id: (quote.body as { quote_id: string }).quote_id, payment } });
    expect(placed.status, JSON.stringify(placed.body)).toBe(201);
    return placed.body as { order: { id: number; status: string; total: { amount: string }; pickup_code: string | null; price: { kind: string }[] }; pay_url: string | null };
  }

  it("sends Config.market and lists vendors of every kind, without their phones", async () => {
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { market: Record<string, unknown> };
    expect(config.market).toMatchObject({ country: "EG", currency: "EGP", currency_decimals: 2, tax: { label: "VAT", included: true }, pickup: true, vendor_app: "bundle" });
    expect((config.market.kinds as string[]).sort()).toEqual(["grocery", "restaurant"]);

    const list = await call("GET", "/market/vendors", { query: { lat: String(HOME.lat), lng: String(HOME.lng) } });
    const items = (list.body as { items: { id: number; kind: string; delivery_by: string; delivery_fee: { amount: string } | null }[] }).items;
    expect(items.map((v) => [v.kind, v.delivery_by])).toEqual([
      ["restaurant", "vendor"],
      ["grocery", "app"],
    ]);
    expect(items[0]!.delivery_fee?.amount).toBe("15.00");
    const groceries = await call("GET", "/market/vendors", { query: { kind: "grocery" } });
    expect((groceries.body as { total: number }).total).toBe(1);

    const one = await call("GET", "/market/vendors/{vendor_id}", { params: [String(restaurant)] });
    expect(JSON.stringify(one.body)).not.toContain("+20225775935");
    expect(one.body).toMatchObject({ area: "Downtown", sections: [{ name: "Mains" }], departments: [] });
    const products = await call("GET", "/market/vendors/{vendor_id}/products", { params: [String(grocery)] });
    expect((products.body as { items: { name: string; unit: string }[] }).items.map((p) => [p.name, p.unit]).sort()).toEqual([
      ["Apples", "kg"],
      ["Milk", "item"],
    ]);
    const search = await call("GET", "/market/search", { query: { q: "kosh" } });
    expect((search.body as { items: { product: { name: string } }[] }).items[0]!.product.name).toBe("Koshari");
  });

  it("prices a cart line by line, keeps the quote, and the vendor's own driver takes it to the door", async () => {
    const customer = await signUp("1001234567", "Mona Adel");
    const cart = { ...restaurantCart, vendor_id: restaurant };
    const quote = await call("POST", "/market/quote", { token: customer.access_token, body: cart });
    // 2 × 50 + 15 delivery; VAT included.
    expect(quote.body).toMatchObject({ total: { amount: "115.00" }, price: [{ kind: "items" }, { kind: "delivery" }, { kind: "tax" }, { kind: "total" }] });
    // A quote for another cart doesn't hold.
    const stale = await call("POST", "/market/orders", { token: customer.access_token, query: { platform: "android" }, body: { ...cart, lines: [{ product_id: 2, quantity: 3 }], quote_id: (quote.body as { quote_id: string }).quote_id, payment: "cash" } });
    expect(stale.status).toBe(409);

    const { order } = await quoteAndOrder(customer.access_token, cart);
    expect(order).toMatchObject({ status: "placed", total: { amount: "115.00" } });

    const staff = await staffOf(restaurant, "1112223334", "Hany");
    const desk = await call("GET", "/vendor/me", { token: staff.access_token });
    expect(desk.body).toMatchObject({ id: restaurant, role: "manager", delivery_by: "vendor", today: { new_orders: 1 } });
    const fresh = await call("GET", "/vendor/orders", { token: staff.access_token });
    const seen = (fresh.body as { items: Record<string, unknown>[] }).items[0]!;
    // The vendor sees the first name and, as it delivers itself, the drop-off; never the customer's phone.
    expect(seen).toMatchObject({ customer: { first_name: "Mona" }, dropoff: { address: HOME.address }, payment: { method: "cash", collect: { amount: "115.00" } } });
    expect(JSON.stringify(seen)).not.toContain("1001234567");

    expect((await call("POST", "/vendor/orders/{order_id}/accept", { token: staff.access_token, params: [String(order.id)], body: { prep_minutes: 20 } })).body).toMatchObject({ status: "accepted" });
    expect((await call("POST", "/vendor/orders/{order_id}/ready", { token: staff.access_token, params: [String(order.id)] })).body).toMatchObject({ status: "ready" });
    expect((await call("POST", "/vendor/orders/{order_id}/handover", { token: staff.access_token, params: [String(order.id)], body: { to: "driver" } })).body).toMatchObject({ status: "on_the_way" });
    const onTheWay = await call("GET", "/me/market-orders/{order_id}", { token: customer.access_token, params: [String(order.id)] });
    expect(onTheWay.body).toMatchObject({ status: "on_the_way", delivery_by: "vendor", tracking: { mode: "stages" } });
    expect((await call("POST", "/vendor/orders/{order_id}/handover", { token: staff.access_token, params: [String(order.id)], body: { to: "delivered" } })).body).toMatchObject({ status: "delivered", payment: { status: "paid" } });

    // Rated once, then a complaint within 48 hours, and a message on it.
    expect((await call("POST", "/me/market-orders/{order_id}/rating", { token: customer.access_token, params: [String(order.id)], body: { vendor: 5 } })).body).toMatchObject({ rating: { vendor: 5 } });
    const complaint = await call("POST", "/me/market-orders/{order_id}/complaints", { token: customer.access_token, params: [String(order.id)], body: { reason: "quality", text: "It came cold." } });
    expect(complaint.status).toBe(201);
    const id = (complaint.body as { id: number }).id;
    expect((await call("POST", "/me/complaints/{complaint_id}/messages", { token: customer.access_token, params: [String(id)], body: { text: "Photos to follow." } })).body).toMatchObject({ messages: [{ from: "customer" }] });
    expect(((await call("GET", "/me/complaints", { token: customer.access_token })).body as { total: number }).total).toBe(1);
    // A second open complaint on the same order is refused.
    expect((await call("POST", "/me/market-orders/{order_id}/complaints", { token: customer.access_token, params: [String(order.id)], body: { reason: "late", text: "And it was late." } })).status).toBe(409);
    // After 48 hours, no more.
    const delivered = (await store.getMarketOrder(app.id, order.id))!;
    await store.updateMarketOrder(app.id, order.id, { completedAt: new Date(now.getTime() - 49 * 3_600_000), timeline: delivered.timeline.map((s) => (s.status === "delivered" ? { ...s, at: new Date(now.getTime() - 49 * 3_600_000).toISOString() } : s)) });
    await store.updateMarketComplaint(app.id, id, { status: "resolved" });
    const mine = await call("GET", "/me/market-orders/{order_id}", { token: customer.access_token, params: [String(order.id)] });
    expect(mine.body).toMatchObject({ can_complain: false, complaint_id: id });
  });

  it("weighs a grocery's items when picked, within the agreed tolerance, and hands pick-up orders over with the code", async () => {
    const customer = await signUp("1009876543", "Karim");
    const cart = { vendor_id: grocery, lines: [{ product_id: apples, quantity: 1.5 }, { product_id: milk, quantity: 2, if_missing: "remove" }], fulfilment: "pickup" };
    const half = await call("POST", "/market/quote", { token: customer.access_token, body: { ...cart, lines: [{ product_id: apples, quantity: 1.2 }] } });
    expect(half.status).toBe(400);
    const { order } = await quoteAndOrder(customer.access_token, cart);
    // 1.5 kg × 40 + 2 × 30.
    expect(order).toMatchObject({ total: { amount: "120.00" } });
    expect(order.pickup_code).toMatch(/^\d{4}$/);

    const staff = await staffOf(grocery, "1114445556", "Salma");
    expect((await call("POST", "/vendor/orders/{order_id}/accept", { token: staff.access_token, params: [String(order.id)], body: { prep_minutes: 15 } })).body).toMatchObject({ status: "picking" });
    expect((await call("POST", "/vendor/orders/{order_id}/ready", { token: staff.access_token, params: [String(order.id)] })).status).toBe(409);
    // 1.8 kg weighed: never more than 10% above the 60 agreed (66); the milk is out.
    const picked = await call("PATCH", "/vendor/orders/{order_id}/lines", { token: staff.access_token, params: [String(order.id)], body: { lines: [{ line_id: 1, outcome: "picked", quantity: 1.8 }, { line_id: 2, outcome: "missing" }] } });
    expect(picked.body).toMatchObject({ lines: [{ outcome: "picked", total: { amount: "66.00" } }, { outcome: "missing", total: { amount: "0.00" } }], subtotal: { amount: "66.00" } });
    await call("POST", "/vendor/orders/{order_id}/ready", { token: staff.access_token, params: [String(order.id)] });
    expect((await call("POST", "/vendor/orders/{order_id}/handover", { token: staff.access_token, params: [String(order.id)], body: { to: "customer", pickup_code: "0000" === order.pickup_code ? "1111" : "0000" } })).status).toBe(400);
    expect((await call("POST", "/vendor/orders/{order_id}/handover", { token: staff.access_token, params: [String(order.id)], body: { to: "customer", pickup_code: order.pickup_code } })).body).toMatchObject({ status: "picked_up" });
    expect((await call("GET", "/me/market-orders/{order_id}", { token: customer.access_token, params: [String(order.id)] })).body).toMatchObject({ status: "picked_up", total: { amount: "66.00" } });

    // Stock: the vendor puts milk back in stock with a count; 0 is out of stock by itself.
    expect((await call("PATCH", "/vendor/products/{product_id}", { token: staff.access_token, params: [String(milk)], body: { stock: 0 } })).body).toMatchObject({ in_stock: false });
    expect((await call("GET", "/vendor/products", { token: staff.access_token, query: { out_of_stock: "true" } })).body).toMatchObject({ total: 1 });
  });

  it("takes coupons and the wallet, and gives both back when the order is cancelled", async () => {
    const customer = await signUp("1005550000", "Laila");
    await store.createMarketCoupon({
      appId: app.id, code: "WELCOME", title: "10 off", kind: "amount", value: 10_00, maxDiscount: null, minOrder: 0, currency: "EGP", paidBy: "owner", firstOrderOnly: true,
      vendorIds: [], vendorKinds: [], departmentIds: [], usesLimit: null, perUserLimit: 1, startsAt: null, endsAt: null, active: true, createdAt: NOW, updatedAt: NOW,
    });
    await store.addWalletEntry({ appId: app.id, userId: customer.user.id, kind: "credit", amount: 20_00, label: "Welcome", orderId: null, complaintId: null, key: "welcome", createdAt: NOW });
    const cart = { ...restaurantCart, vendor_id: restaurant, coupon_code: "welcome", use_wallet: true };
    const { order } = await quoteAndOrder(customer.access_token, cart);
    // 100 + 15 − 10 coupon = 105; 20 from the wallet.
    expect(order).toMatchObject({ total: { amount: "105.00" } });
    expect(order.price.map((l) => l.kind)).toEqual(["items", "coupon", "delivery", "tax", "wallet", "total"]);
    expect(((await call("GET", "/me/wallet", { token: customer.access_token })).body as { balance: { amount: string } }).balance.amount).toBe("0.00");
    expect((await call("POST", "/me/market-orders/{order_id}/cancel", { token: customer.access_token, params: [String(order.id)] })).body).toMatchObject({ status: "cancelled" });
    expect(((await call("GET", "/me/wallet", { token: customer.access_token })).body as { balance: { amount: string } }).balance.amount).toBe("20.00");
    // The coupon's use came back: it works again.
    const again = await call("POST", "/market/quote", { token: customer.access_token, body: cart });
    expect(again.body).toMatchObject({ coupon: { code: "WELCOME" } });
  });

  it("keeps each vendor to its own orders, and each app to its own vendors", async () => {
    const customer = await signUp("1007770000", "Omar");
    const { order } = await quoteAndOrder(customer.access_token, { ...restaurantCart, vendor_id: restaurant });
    const groceryStaff = await staffOf(grocery, "1118889990", "Nour");
    expect((await call("GET", "/vendor/orders/{order_id}", { token: groceryStaff.access_token, params: [String(order.id)] })).status).toBe(404);
    expect((await call("POST", "/vendor/orders/{order_id}/accept", { token: groceryStaff.access_token, params: [String(order.id)], body: { prep_minutes: 10 } })).status).toBe(404);
    // A customer isn't a vendor.
    expect((await call("GET", "/vendor/me", { token: customer.access_token })).status).toBe(403);
    // Another customer can't see the order.
    const other = await signUp("1006660000", "Hoda");
    expect((await call("GET", "/me/market-orders/{order_id}", { token: other.access_token, params: [String(order.id)] })).status).toBe(404);
    // Another app's vendor isn't reachable from this app.
    const otherApp = { ...app, id: "app_other_market", hostedSettings: app.hostedSettings };
    await store.createApp(otherApp);
    const elsewhere = (await store.createRestaurant(vendor(otherApp.id, { name: "Elsewhere" }), MENU, NOW)).id;
    expect((await call("GET", "/market/vendors/{vendor_id}", { params: [String(elsewhere)] })).status).toBe(404);
    expect((await call("POST", "/market/quote", { body: { ...restaurantCart, vendor_id: elsewhere } })).status).toBe(404);
  });

  it("runs the marketplace's daily work", async () => {
    const done = await runMarketDaily(store, NOW);
    expect(done).toMatchObject({ apps: 1, expired: 0, released: 0 });
  });

  it("115.11 joins the club through the app's payment page, and the membership starts once it's paid, once", async () => {
    const customer = await signUp("1009990001", "Hana Club");
    const plan = await store.createMarketClubPlan({ appId: app.id, name: "Club Monthly", description: null, period: "month", price: 49_00, currency: "EGP", freeDeliveryOver: 0, deliveryDiscountPercent: null, perks: [], active: true, position: 0, createdAt: NOW, updatedAt: NOW });
    const joined = await call("POST", "/me/club", { token: customer.access_token, query: { platform: "android" }, body: { plan_id: plan.id } });
    expect(joined.status, JSON.stringify(joined.body)).toBe(201);
    const body = joined.body as { membership: { status: string }; pay_url: string };
    expect(body.membership.status).toBe("awaiting_payment");
    const token = body.pay_url.split("/").pop()!;
    const shopOrder = (await store.getCatalogOrderByToken(sha256Hex(token)))!;
    expect(shopOrder).toMatchObject({ totalCents: 49_00, status: "pending", userId: customer.user.id });
    // Not a member until the payment is confirmed.
    expect((await call("GET", "/me/club", { token: customer.access_token })).body).toMatchObject({ membership: { status: "awaiting_payment" } });
    expect(await payClubMembership(store, app, shopOrder, now)).toBe(true);
    // The same payment confirmed again (its webhook after its redirect) adds nothing.
    expect(await payClubMembership(store, app, shopOrder, now)).toBe(false);
    const mine = (await call("GET", "/me/club", { token: customer.access_token })).body as { membership: { status: string; current_period_end: string } };
    expect(mine.membership.status).toBe("active");
    expect(new Date(mine.membership.current_period_end).getTime()).toBeGreaterThan(now.getTime() + 27 * 86_400_000);
    // A paid period can't be paid again; a free plan starts at once.
    expect((await call("POST", "/me/club", { token: customer.access_token, body: { plan_id: plan.id } })).status).toBe(409);
    const other = await signUp("1009990002", "Free Club");
    const free = await store.createMarketClubPlan({ appId: app.id, name: "Club Free", description: null, period: "month", price: 0, currency: "EGP", freeDeliveryOver: null, deliveryDiscountPercent: 10, perks: [], active: true, position: 1, createdAt: NOW, updatedAt: NOW });
    const freeJoin = await call("POST", "/me/club", { token: other.access_token, body: { plan_id: free.id } });
    expect(freeJoin.body).toMatchObject({ membership: { status: "active" }, pay_url: null });
  });

  it("115.11 adds sent photos to an open complaint, up to five, and only the customer's own", async () => {
    const customer = await signUp("1009990003", "Photo Customer");
    const { order } = await quoteAndOrder(customer.access_token, { ...restaurantCart, vendor_id: restaurant });
    // No complaint yet: no uploads (this app has no storage set up here either).
    expect((await call("POST", "/market/uploads", { token: customer.access_token, body: { name: "a.jpg", size: 1000, type: "image/jpeg" } })).status).toBe(503);
    const complaint = await call("POST", "/me/market-orders/{order_id}/complaints", { token: customer.access_token, params: [String(order.id)], body: { reason: "quality", text: "Burnt." } });
    const id = (complaint.body as { id: number }).id;
    const ready = async (n: number, patch: Partial<{ kind: "image" | "video"; status: "ready" | "uploading"; source: "library" | "chat" }> = {}) => {
      const fileId = `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
      await store.createMediaFile({ id: fileId, appId: app.id, name: `p${n}.jpg`, kind: patch.kind ?? "image", contentType: "image/jpeg", sizeBytes: 1000, storageKey: `${app.id}/${fileId}.jpg`, status: patch.status ?? "ready", public: true, source: patch.source ?? "library", createdAt: NOW, updatedAt: NOW } as never);
      return fileId;
    };
    const first = await ready(1);
    const added = await call("POST", "/me/complaints/{complaint_id}/photos", { token: customer.access_token, params: [String(id)], body: { upload_id: first } });
    expect(added.status, JSON.stringify(added.body)).toBe(201);
    expect((added.body as { photos: { url: string }[] }).photos).toEqual([{ id: 1, url: `https://yallapp.test/m/${first}` }]);
    // The same photo twice counts once; a chat file or one still uploading isn't taken.
    expect(((await call("POST", "/me/complaints/{complaint_id}/photos", { token: customer.access_token, params: [String(id)], body: { upload_id: first } })).body as { photos: unknown[] }).photos).toHaveLength(1);
    expect((await call("POST", "/me/complaints/{complaint_id}/photos", { token: customer.access_token, params: [String(id)], body: { upload_id: await ready(2, { source: "chat" }) } })).status).toBe(400);
    expect((await call("POST", "/me/complaints/{complaint_id}/photos", { token: customer.access_token, params: [String(id)], body: { upload_id: await ready(3, { status: "uploading" }) } })).status).toBe(400);
    for (const n of [4, 5, 6, 7]) expect((await call("POST", "/me/complaints/{complaint_id}/photos", { token: customer.access_token, params: [String(id)], body: { upload_id: await ready(n) } })).status).toBe(201);
    const sixth = await call("POST", "/me/complaints/{complaint_id}/photos", { token: customer.access_token, params: [String(id)], body: { upload_id: await ready(8) } });
    expect(sixth.status).toBe(409);
    expect(sixth.body).toMatchObject({ code: "too_many_photos" });
    // Someone else can't add to it.
    const stranger = await signUp("1009990004", "Someone Else");
    expect((await call("POST", "/me/complaints/{complaint_id}/photos", { token: stranger.access_token, params: [String(id)], body: { upload_id: first } })).status).toBe(404);
    // A closed complaint takes no more photos.
    await store.updateMarketComplaint(app.id, id, { status: "resolved", photoAssetIds: [] });
    expect((await call("POST", "/me/complaints/{complaint_id}/photos", { token: customer.access_token, params: [String(id)], body: { upload_id: first } })).body).toMatchObject({ code: "complaint_closed" });
  });
});
