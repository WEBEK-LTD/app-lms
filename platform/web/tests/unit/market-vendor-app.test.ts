import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type DeliverySettings, type RestaurantInput } from "@/lib/data/types";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { FoodConnector } from "@/lib/hosted/connectors/food";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { REVIEW_PICKUP_CODE, vendorReviewNotes } from "@/lib/market/review";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/**
 * 115.70–115.76 The vendor app's server side: `vendor` in a place's staff's
 * roles, the store reviewers as a place's test manager on their own orders
 * only, the D1 weight cap per payment way, each line's aisle for picking,
 * and what staff never see of a customer.
 */

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
const SHOP = { address: "Tahrir Square, Cairo", details: null, lat: 30.0444, lng: 31.2357 };
const HOME = { address: "Cairo Tower, Zamalek", details: "Flat 4, the blue door", lat: 30.0459, lng: 31.2243 };
const EVERY_DAY = (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((day) => ({ day, opens: "00:00", closes: "23:59" }));
const REVIEW_PHONE = "+201000000777";
const REVIEW_CODE = "246810";

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
  timezone: "Africa/Cairo",
  marketApp: {
    country: "EG",
    currency: null,
    tax: { ratePercent: 0, included: true, onDelivery: false, label: "VAT" },
    payment: { gateway: "iyzico", cash: true, cashMax: null, applePay: false, googlePay: false },
    pickup: true,
    scheduling: { enabled: false, daysAhead: 3 },
    club: false,
    wallet: true,
    weightTolerancePercent: 10,
    vendorApp: "bundle",
    requirePhotos: false,
  },
};

const place = (appId: string, patch: Partial<RestaurantInput> = {}): RestaurantInput => ({
  appId,
  name: "Abou Tarek",
  description: null,
  logoAssetId: null,
  coverAssetId: null,
  cuisines: [],
  address: SHOP,
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

describe("115.70 the vendor app's server side", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let restaurant: number;
  let grocery: number;
  let cheese: number;
  let rice: number;
  let marketplace: boolean;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "food");
    app = {
      ...base,
      backend: "hosted",
      vertical: "marketplace",
      appName: "Nile Market",
      websiteDoneAt: NOW,
      connector: { kind: "restaurants" },
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20", reviewPhone: REVIEW_PHONE, reviewCode: REVIEW_CODE },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS },
    };
    await store.createApp(app);
    await store.saveDeliverySettings(app.id, SETTINGS, NOW);
    restaurant = (await store.createRestaurant(place(app.id), { sections: [{ id: 1, name: "Mains", dishes: [{ id: 2, name: "Koshari", description: null, imageAssetId: null, priceCents: 50_00, available: true, popular: true, choiceGroups: [] }] }], nextId: 3 }, NOW)).id;
    grocery = (
      await store.createRestaurant(
        place(app.id, { name: "Green Basket", kind: "grocery", position: 2, delivery: { by: "app", feeKind: "fixed", fee: 0, perKm: 0, freeOver: null, minItems: null, maxItems: null, pickup: true, scheduling: false } }),
        { sections: [], nextId: 1 },
        NOW,
      )
    ).id;
    const dairy = (await store.saveMarketDepartment({ id: null, appId: app.id, vendorId: grocery, name: "Dairy", imageAssetId: null, position: 1 }))!;
    const pantry = (await store.saveMarketDepartment({ id: null, appId: app.id, vendorId: grocery, name: "Pantry", imageAssetId: null, position: 2 }))!;
    const cheeseAisle = (await store.saveMarketAisle({ id: null, appId: app.id, vendorId: grocery, departmentId: dairy.id, name: "Cheese & eggs", position: 1 }))!;
    const riceAisle = (await store.saveMarketAisle({ id: null, appId: app.id, vendorId: grocery, departmentId: pantry.id, name: "Rice, pasta & pulses", position: 1 }))!;
    const made = async (name: string, price: number, unit: "item" | "kg", step: number, aisleId: number, departmentId: number) => {
      const r = await store.createMarketProduct(
        { appId: app.id, vendorId: grocery, departmentId, aisleId, name, description: null, brand: null, sku: name.toLowerCase(), barcode: null, imageAssetId: null, imageUrl: null, price, wasPrice: null, unit, step, maxQuantity: null, stock: null, inStock: true, tags: [], position: 1 },
        NOW,
      );
      if (!r.ok) throw new Error("product");
      return r.product.id;
    };
    cheese = await made("White cheese", 160_00, "kg", 0.25, cheeseAisle.id, dairy.id);
    rice = await made("Egyptian rice", 38_00, "item", 1, riceAisle.id, pantry.id);
    sender = new LogSender();
    now = NOW;
    marketplace = true;
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
    connector: new FoodConnector({ store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test", food: true, marketplace }),
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

  /** The review account signs in with its fixed code, as the stores' reviewers do. */
  async function reviewer() {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone: REVIEW_PHONE.slice(3) } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: REVIEW_CODE, device: { ...DEVICE, id: "install-review" } } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name: "Store Review", device: { ...DEVICE, id: "install-review" } } });
    return registered.body as { access_token: string; user: { id: number } };
  }

  async function staffOf(vendorId: number, phone: string, name: string, active = true) {
    await store.createRestaurantStaff({ appId: app.id, restaurantId: vendorId, name, phone: `+20${phone}`, email: null, active, role: "manager" }, NOW);
    return signUp(phone, name);
  }

  async function order(token: string, lines: { product_id: number; quantity: number }[], extra: Record<string, unknown> = {}) {
    const cart = { vendor_id: grocery, lines, fulfilment: "delivery", dropoff: HOME, ...extra };
    const quote = await call("POST", "/market/quote", { token, body: cart });
    expect(quote.status, JSON.stringify(quote.body)).toBe(200);
    const placed = await call("POST", "/market/orders", { token, query: { platform: "android" }, body: { ...cart, quote_id: (quote.body as { quote_id: string }).quote_id, payment: "cash", notes: "Ring twice" } });
    expect(placed.status, JSON.stringify(placed.body)).toBe(201);
    return (placed.body as { order: { id: number } }).order.id;
  }

  it("sends `vendor` in a marketplace place's staff's roles, not to customers, paused staff or without the marketplace", async () => {
    const staff = await staffOf(grocery, "1114445556", "Salma Adel");
    expect((await call("GET", "/me", { token: staff.access_token })).body).toMatchObject({ roles: ["restaurant", "vendor"] });
    const customer = await signUp("1009876543", "Karim");
    expect((await call("GET", "/me", { token: customer.access_token })).body).toMatchObject({ roles: [] });
    const paused = await staffOf(grocery, "1112223334", "Hany", false);
    expect(((await call("GET", "/me", { token: paused.access_token })).body as { roles: string[] }).roles).not.toContain("vendor");
    // A food delivery app without the marketplace keeps `restaurant` alone.
    marketplace = false;
    expect((await call("GET", "/me", { token: staff.access_token })).body).toMatchObject({ roles: ["restaurant"] });
  });

  it("never shows a place's staff the customer's phone, email or full name, and the drop-off only when it delivers itself", async () => {
    const customer = await signUp("1009876543", "Karim Mostafa");
    await store.updateHostedUser(app.id, customer.user.id, { email: "karim@example.test" }, now);
    const id = await order(customer.access_token, [{ product_id: rice, quantity: 2 }]);
    const staff = await staffOf(grocery, "1114445556", "Salma");
    for (const res of [await call("GET", "/vendor/orders", { token: staff.access_token }), await call("GET", "/vendor/orders/{order_id}", { token: staff.access_token, params: [String(id)] })]) {
      const text = JSON.stringify(res.body);
      expect(text).toContain("Karim");
      expect(text).not.toContain("Mostafa");
      expect(text).not.toContain("1009876543");
      expect(text).not.toContain("karim@example.test");
      // The app's courier takes it: no address for the place.
      expect(text).not.toContain("Cairo Tower");
      expect(text).not.toContain("blue door");
    }
  });

  it("gives each line of one order its aisle in the place's order, and none in the lists", async () => {
    const customer = await signUp("1009876543", "Karim");
    const id = await order(customer.access_token, [
      { product_id: rice, quantity: 1 },
      { product_id: cheese, quantity: 0.75 },
    ]);
    const staff = await staffOf(grocery, "1114445556", "Salma");
    const one = (await call("GET", "/vendor/orders/{order_id}", { token: staff.access_token, params: [String(id)] })).body as { lines: { name: string; aisle: unknown }[] };
    expect(one.lines.map((l) => [l.name, l.aisle])).toEqual([
      ["Egyptian rice", { id: expect.any(Number), name: "Rice, pasta & pulses", department: "Pantry", position: 2 }],
      ["White cheese", { id: expect.any(Number), name: "Cheese & eggs", department: "Dairy", position: 1 }],
    ]);
    const list = (await call("GET", "/vendor/orders", { token: staff.access_token })).body as { items: { lines: Record<string, unknown>[] }[] };
    expect(list.items[0]!.lines[0]).not.toHaveProperty("aisle");
    // The answer of a move carries them too.
    const accepted = (await call("POST", "/vendor/orders/{order_id}/accept", { token: staff.access_token, params: [String(id)], body: { prep_minutes: 20 } })).body as { lines: { aisle: { name: string } | null }[] };
    expect(accepted.lines[1]!.aisle?.name).toBe("Cheese & eggs");
  });

  it("takes at most the weight asked for card and wallet orders, and the tolerance over it for cash (D1)", async () => {
    const customer = await signUp("1009876543", "Mona");
    const staff = await staffOf(grocery, "1114445556", "Samir");
    const weigh = async (payment: "cash" | "card" | "wallet" | "apple_pay" | "google_pay", grams: number) => {
      const id = await order(customer.access_token, [{ product_id: cheese, quantity: 0.75 }]);
      // How it was paid, as the gateway or the wallet would have left it.
      await store.updateMarketOrder(app.id, id, { paymentMethod: payment, paymentStatus: payment === "cash" ? "unpaid" : "paid" } as Parameters<MemoryStore["updateMarketOrder"]>[2]);
      await call("POST", "/vendor/orders/{order_id}/accept", { token: staff.access_token, params: [String(id)], body: { prep_minutes: 20 } });
      const picked = await call("PATCH", "/vendor/orders/{order_id}/lines", { token: staff.access_token, params: [String(id)], body: { lines: [{ line_id: 1, outcome: "picked", quantity: grams / 1000 }] } });
      return picked.status === 200 ? (picked.body as { lines: { total: { amount: string } }[] }).lines[0]!.total.amount : picked.status;
    };
    // 750 g asked at 160 a kilo: 120 paid online.
    for (const online of ["card", "wallet", "apple_pay", "google_pay"] as const) {
      expect(await weigh(online, 750)).toBe("120.00");
      // Lighter: less, the difference refunded.
      expect(await weigh(online, 740)).toBe("118.40");
      // Heavier is refused: the customer never pays more than they paid.
      expect(await weigh(online, 760)).toBe(400);
    }
    // Cash: what the scale reads, up to 10% over (825 g, 132).
    expect(await weigh("cash", 780)).toBe("124.80");
    expect(await weigh("cash", 825)).toBe("132.00");
    expect(await weigh("cash", 826)).toBe(400);
  });

  it("makes the store review account a test manager of the first supermarket, on its own orders only, with a sample order", async () => {
    // A real customer's order at the same place.
    const customer = await signUp("1009876543", "Karim");
    const real = await order(customer.access_token, [{ product_id: rice, quantity: 1 }]);
    const review = await reviewer();
    expect((await call("GET", "/me", { token: review.access_token })).body).toMatchObject({ roles: expect.arrayContaining(["vendor"]) });
    expect((await call("GET", "/vendor/me", { token: review.access_token })).body).toMatchObject({ id: grocery, kind: "grocery", role: "manager" });

    // A sample order waits for them, picked up at the place and paid in cash; the real one never shows.
    const fresh = (await call("GET", "/vendor/orders", { token: review.access_token })).body as { total: number; items: { id: number; fulfilment: string; payment: { method: string }; lines: { unit: string }[] }[] };
    expect(fresh.total).toBe(1);
    expect(fresh.items[0]).toMatchObject({ fulfilment: "pickup", payment: { method: "cash" } });
    expect(fresh.items[0]!.lines[0]!.unit).toBe("kg");
    expect(fresh.items.map((o) => o.id)).not.toContain(real);
    expect((await call("GET", "/vendor/orders/{order_id}", { token: review.access_token, params: [String(real)] })).status).toBe(404);
    // Only one while it's open.
    expect(((await call("GET", "/vendor/orders", { token: review.access_token })).body as { total: number }).total).toBe(1);
    const sample = fresh.items[0]!.id;

    // The place's staff never see the reviewers' order.
    const staff = await staffOf(grocery, "1114445556", "Salma");
    const theirs = (await call("GET", "/vendor/orders", { token: staff.access_token })).body as { total: number; items: { id: number }[] };
    expect(theirs.items.map((o) => o.id)).toEqual([real]);
    expect(theirs.total).toBe(1);
    expect((await call("GET", "/vendor/orders/{order_id}", { token: staff.access_token, params: [String(sample)] })).status).toBe(404);

    // They work it all the way, with the code in their notes.
    await call("POST", "/vendor/orders/{order_id}/accept", { token: review.access_token, params: [String(sample)], body: { prep_minutes: 10 } });
    const lines = ((await call("GET", "/vendor/orders/{order_id}", { token: review.access_token, params: [String(sample)] })).body as { lines: { id: number }[] }).lines;
    await call("PATCH", "/vendor/orders/{order_id}/lines", { token: review.access_token, params: [String(sample)], body: { lines: lines.map((l) => ({ line_id: l.id, outcome: "picked" })) } });
    await call("POST", "/vendor/orders/{order_id}/ready", { token: review.access_token, params: [String(sample)] });
    const handed = await call("POST", "/vendor/orders/{order_id}/handover", { token: review.access_token, params: [String(sample)], body: { to: "customer", pickup_code: REVIEW_PICKUP_CODE } });
    expect(handed.body).toMatchObject({ status: "picked_up" });
    // Another one appears once it's done.
    expect(((await call("GET", "/vendor/orders", { token: review.access_token })).body as { items: { id: number }[] }).items[0]!.id).not.toBe(sample);
  });

  it("shows the reviewers' changes to the place without keeping them", async () => {
    const review = await reviewer();
    const busy = await call("PATCH", "/vendor/me", { token: review.access_token, body: { paused: true } });
    expect(busy.body).toMatchObject({ paused: true });
    expect((await store.getRestaurant(app.id, grocery))!.paused).toBeFalsy();
    const out = await call("PATCH", "/vendor/products/{product_id}", { token: review.access_token, params: [String(rice)], body: { in_stock: false } });
    expect(out.body).toMatchObject({ in_stock: false });
    expect((await store.getMarketProduct(app.id, rice))!.inStock).toBe(true);
    // The place's own staff keep theirs.
    const staff = await staffOf(grocery, "1114445556", "Salma");
    await call("PATCH", "/vendor/products/{product_id}", { token: staff.access_token, params: [String(rice)], body: { in_stock: false } });
    expect((await store.getMarketProduct(app.id, rice))!.inStock).toBe(false);
  });

  it("works for the first place when there's no supermarket or shop, and for nobody without a review account", async () => {
    await store.updateRestaurant(app.id, grocery, { active: false }, NOW);
    const review = await reviewer();
    expect((await call("GET", "/vendor/me", { token: review.access_token })).body).toMatchObject({ id: restaurant, kind: "restaurant" });
    app = { ...app, hostedSettings: { ...app.hostedSettings!, reviewPhone: null, reviewCode: null } };
    await store.updateApp(app.id, { hostedSettings: app.hostedSettings }, NOW);
    expect((await call("GET", "/vendor/me", { token: review.access_token })).status).toBe(403);
  });

  it("lets a place's owner and managers make, pause, start again and end their own offers (115.77)", async () => {
    await store.saveDeliverySettings(app.id, { ...SETTINGS, marketApp: { ...SETTINGS.marketApp!, vendorCoupons: { enabled: true, maxPercent: 30 } } as DeliverySettings["marketApp"] }, NOW);
    const manager = await staffOf(grocery, "1114445556", "Salma");
    const empty = (await call("GET", "/vendor/offers", { token: manager.access_token })).body;
    expect(empty).toMatchObject({ enabled: true, max_percent: 30, items: [] });
    // Above the owner's largest percentage: refused.
    expect((await call("POST", "/vendor/offers", { token: manager.access_token, body: { title: "Half off", kind: "percent", value: "50" } })).status).toBe(400);
    const made = await call("POST", "/vendor/offers", { token: manager.access_token, body: { title: "10% off fruit", code: "fruit10", kind: "percent", value: "10", min_order: "100.00" } });
    expect(made.status, JSON.stringify(made.body)).toBe(201);
    const offer = made.body as { id: number };
    expect(made.body).toMatchObject({ title: "10% off fruit", code: "FRUIT10", kind: "percent", value: "10", min_order: { amount: "100.00" }, status: "active" });
    // Paid by the place, for the place alone.
    expect(await store.getMarketCoupon(app.id, offer.id)).toMatchObject({ paidBy: "vendor", vendorIds: [grocery], createdByVendorId: grocery });
    expect((await call("POST", "/vendor/offers/{offer_id}/{action}", { token: manager.access_token, params: [String(offer.id), "pause"] })).body).toMatchObject({ status: "paused" });
    expect((await call("POST", "/vendor/offers/{offer_id}/{action}", { token: manager.access_token, params: [String(offer.id), "resume"] })).body).toMatchObject({ status: "active" });
    // The app's owner paused it: the place can't start it again.
    await store.updateMarketCoupon(app.id, offer.id, { ownerPaused: true, active: false, updatedAt: NOW });
    expect((await call("POST", "/vendor/offers/{offer_id}/{action}", { token: manager.access_token, params: [String(offer.id), "resume"] })).status).toBe(409);
    await store.updateMarketCoupon(app.id, offer.id, { ownerPaused: false, updatedAt: NOW });
    expect((await call("POST", "/vendor/offers/{offer_id}/{action}", { token: manager.access_token, params: [String(offer.id), "end"] })).body).toMatchObject({ status: "ended" });
    // Another place's staff never see it; pickers and order takers can't open Offers.
    const other = await staffOf(restaurant, "1117778889", "Hany");
    expect(((await call("GET", "/vendor/offers", { token: other.access_token })).body as { items: unknown[] }).items).toEqual([]);
    expect((await call("POST", "/vendor/offers/{offer_id}/{action}", { token: other.access_token, params: [String(offer.id), "pause"] })).status).toBe(404);
    await store.createRestaurantStaff({ appId: app.id, restaurantId: grocery, name: "Samir", phone: "+201112223330", email: null, active: true, role: "picker" }, NOW);
    const picker = await signUp("1112223330", "Samir");
    expect((await call("GET", "/vendor/offers", { token: picker.access_token })).status).toBe(403);
    // The store reviewers' offers are answered, never kept.
    const review = await reviewer();
    const shown = await call("POST", "/vendor/offers", { token: review.access_token, body: { title: "Review offer", kind: "amount", value: "5.00" } });
    expect(shown.body).toMatchObject({ title: "Review offer", amount: { amount: "5.00" }, status: "active" });
    expect(((await call("GET", "/vendor/offers", { token: review.access_token })).body as { items: { title: string }[] }).items.map((i) => i.title)).toEqual(["10% off fruit"]);
  });

  it("writes the vendor app's notes for the stores' reviewers", () => {
    const notes = vendorReviewNotes(app, { name: "Green Basket", kind: "grocery" })!;
    expect(notes).toContain("Nile Market Partner is for the staff");
    expect(notes).toContain(`Sign in with the phone number ${REVIEW_PHONE} and the code ${REVIEW_CODE}`);
    expect(notes).toContain("test manager of Green Basket");
    expect(notes).toContain("Ready for courier");
    expect(notes).toContain(`pick-up code ${REVIEW_PICKUP_CODE}`);
    expect(notes).toContain("never a phone number or an email");
    expect(vendorReviewNotes(app, { name: "Abou Tarek", kind: "restaurant" })).not.toContain("keypad");
    expect(vendorReviewNotes({ ...app, hostedSettings: { ...app.hostedSettings!, reviewCode: null } }, null)).toBeNull();
  });
});
