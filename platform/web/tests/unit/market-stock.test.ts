import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type DeliverySettings, type RestaurantInput, type VendorRole } from "@/lib/data/types";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { FoodConnector } from "@/lib/hosted/connectors/food";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { cancelMarketOrder } from "@/lib/market/flow";
import { settleWeighedOrder } from "@/lib/market/settlement";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

/**
 * 115.24 Stock moved by orders, through the hosted API: placing takes it
 * (all or none, never below 0, two customers racing for the last one), a
 * cancel, a refusal, a line left out or swapped gives it back, every move
 * in the ledger; the place's owner and managers edit the catalog, order
 * takers only stock, never another place's.
 */

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
const SHOP = { address: "Tahrir Square, Cairo", details: null, lat: 30.0444, lng: 31.2357 };
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
  timezone: "Africa/Cairo",
  marketApp: {
    country: "EG",
    currency: null,
    tax: { ratePercent: 0, included: true, onDelivery: false, label: "VAT" },
    payment: { gateway: "kashier", cash: true, cashMax: null, applePay: false, googlePay: false },
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
  name: "Green Basket",
  description: null,
  logoAssetId: null,
  coverAssetId: null,
  cuisines: [],
  address: SHOP,
  phone: null,
  hours: EVERY_DAY,
  prepMinutes: 15,
  minOrderCents: 0,
  maxKm: null,
  commissionBp: 1000,
  active: true,
  position: 1,
  kind: "grocery",
  delivery: { by: "app", feeKind: "fixed", fee: 0, perKm: 0, freeOver: null, minItems: null, maxItems: null, pickup: true, scheduling: false },
  ...patch,
});

describe("115.24 stock moved by orders, and the catalog edited by the place", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let grocery: number;
  let other: number;
  let milk: number;
  let cheese: number;
  let yogurt: number;
  let bread: number;
  /** 115.29 The card's refunds, as the app's gateway would make them (a failure when `cardDown`). */
  let refunds: { orderId: number; cents: number }[];
  let cardDown: boolean;

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
    grocery = (await store.createRestaurant(place(app.id), { sections: [], nextId: 1 }, NOW)).id;
    other = (await store.createRestaurant(place(app.id, { name: "Corner Shop", kind: "shop", position: 2 }), { sections: [], nextId: 1 }, NOW)).id;
    const made = async (vendorId: number, name: string, price: number, unit: "item" | "kg", step: number, stock: number | null) => {
      const r = await store.createMarketProduct(
        { appId: app.id, vendorId, departmentId: null, aisleId: null, name, description: null, brand: null, sku: `${vendorId}-${name.toLowerCase()}`, barcode: null, imageAssetId: null, imageUrl: null, price, wasPrice: null, unit, step, maxQuantity: null, stock, inStock: true, tags: [], position: 1 },
        NOW,
      );
      if (!r.ok) throw new Error("product");
      return r.product.id;
    };
    milk = await made(grocery, "Milk", 30_00, "item", 1, 3);
    // 2 kg in steps of 0.5 kg: 4 steps.
    cheese = await made(grocery, "Roumi cheese", 200_00, "kg", 0.5, 4);
    yogurt = await made(grocery, "Yogurt", 10_00, "item", 1, 1);
    bread = await made(other, "Bread", 5_00, "item", 1, 50);
    sender = new LogSender();
    now = NOW;
    refunds = [];
    cardDown = false;
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
    connector: new FoodConnector({
      store,
      app,
      assetUrl: ASSETS,
      platformUrl: "https://yallapp.test",
      food: true,
      refundToCard: async (order, cents) => {
        if (cardDown) return { ok: false, error: "The gateway refused the refund." };
        refunds.push({ orderId: order.id, cents });
        return { ok: true };
      },
    }),
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

  async function staffOf(vendorId: number, phone: string, name: string, role: VendorRole = "manager") {
    await store.createRestaurantStaff({ appId: app.id, restaurantId: vendorId, name, phone: `+20${phone}`, email: null, active: true, role }, NOW);
    return signUp(phone, name);
  }

  async function quote(token: string, cart: Record<string, unknown>) {
    const q = await call("POST", "/market/quote", { token, body: cart });
    expect(q.status, JSON.stringify(q.body)).toBe(200);
    return (q.body as { quote_id: string }).quote_id;
  }

  const order = (token: string, cart: Record<string, unknown>, quoteId: string) => call("POST", "/market/orders", { token, query: { platform: "android" }, body: { ...cart, quote_id: quoteId, payment: "cash" } });
  const stock = async (id: number) => (await store.getMarketProduct(app.id, id))!;
  const cartOf = (lines: Record<string, unknown>[]) => ({ vendor_id: grocery, lines, fulfilment: "pickup" });

  it("takes stock when an order is placed, and gives it back when it's cancelled or turned down, once", async () => {
    const customer = await signUp("1001112222", "Mona");
    const cart = cartOf([{ product_id: milk, quantity: 2 }, { product_id: cheese, quantity: 1.5 }]);
    const placed = await order(customer.access_token, cart, await quote(customer.access_token, cart));
    expect(placed.status).toBe(201);
    const id = (placed.body as { order: { id: number; estimated: boolean; lines: { estimated_total: { amount: string }; weighed_total: unknown }[] } }).order;
    // Items sold by weight: the total is an estimate until weighed.
    expect(id.estimated).toBe(true);
    expect(id.lines[1]).toMatchObject({ estimated_total: { amount: "300.00" }, weighed_total: null });
    expect((await stock(milk)).stock).toBe(1);
    // 1.5 kg of cheese is 3 steps of 0.5 kg.
    expect((await stock(cheese)).stock).toBe(1);
    const moves = await store.listMarketStockMoves(app.id, { orderId: id.id, limit: 10 });
    expect(moves.map((m) => [m.reason, m.delta, m.before, m.after, m.by]).sort()).toEqual([
      ["order", -2, 3, 1, "customer"],
      ["order", -3, 4, 1, "customer"],
    ]);

    // Cancelled by the customer: everything back, and a second cancel moves nothing.
    expect((await call("POST", "/me/market-orders/{order_id}/cancel", { token: customer.access_token, params: [String(id.id)] })).status).toBe(200);
    expect((await stock(milk)).stock).toBe(3);
    expect((await stock(cheese)).stock).toBe(4);
    await cancelMarketOrder({ store, app, now }, (await store.getMarketOrder(app.id, id.id))!, "owner");
    expect((await stock(milk)).stock).toBe(3);
    expect((await store.listMarketStockMoves(app.id, { orderId: id.id, limit: 10 })).filter((m) => m.reason === "return")).toHaveLength(2);

    // Turned down by the place: back too.
    const again = cartOf([{ product_id: milk, quantity: 3 }]);
    const second = await order(customer.access_token, again, await quote(customer.access_token, again));
    expect((await stock(milk)).stock).toBe(0);
    const staff = await staffOf(grocery, "1112223333", "Salma");
    const secondId = (second.body as { order: { id: number } }).order.id;
    expect((await call("POST", "/vendor/orders/{order_id}/reject", { token: staff.access_token, params: [String(secondId)], body: { reason: "too_busy" } })).status).toBe(200);
    expect((await stock(milk)).stock).toBe(3);
  });

  it("sells out by itself at 0 and comes back when stocked; stock that isn't counted never moves", async () => {
    const customer = await signUp("1003334444", "Karim");
    const cart = cartOf([{ product_id: yogurt, quantity: 1 }]);
    expect((await order(customer.access_token, cart, await quote(customer.access_token, cart))).status).toBe(201);
    const after = await stock(yogurt);
    expect(after).toMatchObject({ stock: 0, inStock: false });
    // Gone from the customer's list at once (decision 15); a cart with it is refused, "no longer available".
    const list = await call("GET", "/market/vendors/{vendor_id}/products", { params: [String(grocery)] });
    expect((list.body as { items: { id: number }[] }).items.some((p) => p.id === yogurt)).toBe(false);
    // 115.29 By cursor: the first page counts what customers can buy (milk and cheese), later pages don't.
    const first = await call("GET", "/market/vendors/{vendor_id}/products", { params: [String(grocery)], query: { cursor: "", per_page: "1" } });
    expect(first.body).toMatchObject({ total: 2, total_pages: 2, next_cursor: expect.any(String), items: [expect.anything()] });
    const second = await call("GET", "/market/vendors/{vendor_id}/products", { params: [String(grocery)], query: { cursor: (first.body as { next_cursor: string }).next_cursor, per_page: "1" } });
    expect(second.body).toMatchObject({ total: null, total_pages: null, next_cursor: null });
    expect((await call("POST", "/market/quote", { token: customer.access_token, body: cart })).body).toMatchObject({ code: "unavailable_item", message: "Yogurt is no longer available." });

    // The place counts 5 more: back on sale, in the ledger with who did it.
    const staff = await staffOf(grocery, "1115556666", "Hany");
    // The vendor's own list still has it, marked out of stock.
    expect(((await call("GET", "/vendor/products", { token: staff.access_token })).body as { items: { id: number; in_stock: boolean }[] }).items.find((p) => p.id === yogurt)).toMatchObject({ in_stock: false });
    const back = await call("PATCH", "/vendor/products/{product_id}", { token: staff.access_token, params: [String(yogurt)], body: { stock: 5 } });
    expect(back.body).toMatchObject({ in_stock: true, stock: 5 });
    expect(((await call("GET", "/market/vendors/{vendor_id}/products", { params: [String(grocery)] })).body as { items: { id: number }[] }).items.some((p) => p.id === yogurt)).toBe(true);
    const moves = await call("GET", "/vendor/products/{product_id}/stock-moves", { token: staff.access_token, params: [String(yogurt)] });
    expect((moves.body as { items: unknown[] }).items[0]).toMatchObject({ reason: "edit", change: 5, before: 0, after: 5, by: "vendor" });

    // Not counted (D9): orders take nothing and nothing is in the ledger.
    await call("PATCH", "/vendor/products/{product_id}", { token: staff.access_token, params: [String(yogurt)], body: { stock: null } });
    const free = cartOf([{ product_id: yogurt, quantity: 7 }]);
    expect((await order(customer.access_token, free, await quote(customer.access_token, free))).status).toBe(201);
    expect((await stock(yogurt)).stock).toBeNull();
  });

  it("gives two customers ordering the last one at the same time one order between them", async () => {
    const a = await signUp("1007770001", "Aya");
    const b = await signUp("1007770002", "Bassem");
    const cart = cartOf([{ product_id: yogurt, quantity: 1 }]);
    const [qa, qb] = [await quote(a.access_token, cart), await quote(b.access_token, cart)];
    const results = await Promise.all([order(a.access_token, cart, qa), order(b.access_token, cart, qb)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const refused = results.find((r) => r.status === 409)!;
    expect(refused.body).toMatchObject({ code: "unavailable_item" });
    expect((await stock(yogurt)).stock).toBe(0);
    // The refused order isn't left placed.
    const orders = (await store.listMarketOrders({ appId: app.id, limit: 10, offset: 0 })).items;
    expect(orders.filter((o) => o.status === "placed")).toHaveLength(1);
  });

  it("gives back a line left out when picked, and swaps a substitute's stock for the ordered one's", async () => {
    const customer = await signUp("1009990000", "Laila");
    const cart = cartOf([{ product_id: milk, quantity: 2, if_missing: "remove" }, { product_id: cheese, quantity: 1, if_missing: "chosen", substitute_product_id: yogurt }]);
    const placed = await order(customer.access_token, cart, await quote(customer.access_token, cart));
    const id = (placed.body as { order: { id: number } }).order.id;
    expect([(await stock(milk)).stock, (await stock(cheese)).stock, (await stock(yogurt)).stock]).toEqual([1, 2, 1]);
    const staff = await staffOf(grocery, "1110001111", "Picker", "picker");
    const manager = await staffOf(grocery, "1110002222", "Rana");
    await call("POST", "/vendor/orders/{order_id}/accept", { token: manager.access_token, params: [String(id)], body: { prep_minutes: 10 } });
    const picked = await call("PATCH", "/vendor/orders/{order_id}/lines", { token: staff.access_token, params: [String(id)], body: { lines: [{ line_id: 1, outcome: "missing" }, { line_id: 2, outcome: "substituted" }] } });
    expect(picked.status).toBe(200);
    // The milk back; the cheese back and the yogurt taken instead.
    expect([(await stock(milk)).stock, (await stock(cheese)).stock, (await stock(yogurt)).stock]).toEqual([3, 4, 0]);
    // Picked again the same way: nothing moves twice.
    await call("PATCH", "/vendor/orders/{order_id}/lines", { token: staff.access_token, params: [String(id)], body: { lines: [{ line_id: 1, outcome: "missing" }, { line_id: 2, outcome: "substituted" }] } });
    expect([(await stock(milk)).stock, (await stock(cheese)).stock, (await stock(yogurt)).stock]).toEqual([3, 4, 0]);
    // Cancelled by the owner after picking: the substitute comes back too.
    await cancelMarketOrder({ store, app, now }, (await store.getMarketOrder(app.id, id))!, "owner");
    expect([(await stock(milk)).stock, (await stock(cheese)).stock, (await stock(yogurt)).stock]).toEqual([3, 4, 1]);
  });

  it("shows the weighed price once picked", async () => {
    const customer = await signUp("1004440000", "Omar");
    const cart = cartOf([{ product_id: cheese, quantity: 1 }]);
    const id = ((await order(customer.access_token, cart, await quote(customer.access_token, cart))).body as { order: { id: number } }).order.id;
    const manager = await staffOf(grocery, "1114440000", "Rana");
    await call("POST", "/vendor/orders/{order_id}/accept", { token: manager.access_token, params: [String(id)], body: { prep_minutes: 10 } });
    await call("PATCH", "/vendor/orders/{order_id}/lines", { token: manager.access_token, params: [String(id)], body: { lines: [{ line_id: 1, outcome: "picked", quantity: 0.9 }] } });
    const mine = await call("GET", "/me/market-orders/{order_id}", { token: customer.access_token, params: [String(id)] });
    expect(mine.body).toMatchObject({ estimated: false, lines: [{ estimated_total: { amount: "200.00" }, weighed_total: { amount: "180.00" } }] });
  });

  it("lets the place's owner and managers edit its catalog, order takers only stock, and nobody another place's", async () => {
    const manager = await staffOf(grocery, "1112220000", "Rana");
    const taker = await staffOf(grocery, "1112220001", "Taker", "orders");
    const elsewhere = await staffOf(other, "1112220002", "Nader");

    const dept = await call("POST", "/vendor/departments", { token: manager.access_token, body: { name: "Dairy" } });
    expect(dept.status).toBe(201);
    const deptId = (dept.body as { id: number }).id;
    const aisle = await call("POST", "/vendor/aisles", { token: manager.access_token, body: { name: "Cheese", department_id: deptId } });
    const aisleId = (aisle.body as { id: number }).id;
    const created = await call("POST", "/vendor/products", {
      token: manager.access_token,
      body: { name: "Feta", names: { ar: "جبنة فيتا", tr: "Beyaz peynir" }, price: "120.50", sold_by: "weight", unit: "kg", step: 0.25, min: 0.5, max: 3, sku: "FETA-1", barcode: "6221000000017", stock: 10, department_id: deptId, aisle_id: aisleId, in_stock: true },
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    const feta = created.body as { id: number; stock: number; sold_by: Record<string, unknown>; names: Record<string, string> };
    expect(feta).toMatchObject({ stock: 10, sold_by: { kind: "weight", unit: "kg", step: 0.25, min: 0.5, max: 3 }, names: { ar: "جبنة فيتا" }, sku: "FETA-1", department_id: deptId, aisle_id: aisleId });
    // 10 kg in steps of 0.25 kg.
    expect((await stock(feta.id)).stock).toBe(40);
    // A duplicate SKU, a bad barcode and an aisle of nowhere are refused, field by field.
    expect((await call("POST", "/vendor/products", { token: manager.access_token, body: { name: "Feta 2", price: "1", sku: "FETA-1" } })).body).toMatchObject({ details: { field: "sku" } });
    expect((await call("POST", "/vendor/products", { token: manager.access_token, body: { name: "X", price: "1", barcode: "!!" } })).body).toMatchObject({ details: { field: "barcode" } });
    expect((await call("POST", "/vendor/products", { token: manager.access_token, body: { name: "X", price: "1", department_id: deptId, aisle_id: 999 } })).body).toMatchObject({ details: { field: "aisle_id" } });

    // Customers see it in their language, with the least they may order.
    // Searched in Arabic with another alef and taa marbuta form, answered in Arabic.
    const arabic = await handleHosted(context(), { method: "GET", path: ["market", "vendors", String(grocery), "products"], query: new URLSearchParams({ q: "جبنه" }), body: null, token: null, headers: new Headers({ "accept-language": "ar" }) });
    expect((arabic.body as { items: { name: string }[] }).items.map((p) => p.name)).toEqual(["جبنة فيتا"]);
    const turkish = await handleHosted(context(), { method: "GET", path: ["market", "vendors", String(grocery), "products"], query: new URLSearchParams({ q: "PEYNİR" }), body: null, token: null });
    expect((turkish.body as { items: { name: string }[] }).items.map((p) => p.name)).toEqual(["Feta"]);
    const cart = cartOf([{ product_id: feta.id, quantity: 0.25 }]);
    expect((await call("POST", "/market/quote", { token: manager.access_token, body: cart })).status).toBe(400);

    // Order takers: stock yes, the product's fields no.
    expect((await call("PATCH", "/vendor/products/{product_id}", { token: taker.access_token, params: [String(feta.id)], body: { stock: 8 } })).body).toMatchObject({ stock: 8 });
    expect((await call("PATCH", "/vendor/products/{product_id}", { token: taker.access_token, params: [String(feta.id)], body: { price: "1" } })).status).toBe(403);
    expect((await call("POST", "/vendor/products", { token: taker.access_token, body: { name: "No", price: "1" } })).status).toBe(403);
    // Another place's staff can't see or touch it.
    expect((await call("PATCH", "/vendor/products/{product_id}", { token: elsewhere.access_token, params: [String(feta.id)], body: { price: "1" } })).status).toBe(404);
    expect((await call("DELETE", "/vendor/products/{product_id}", { token: elsewhere.access_token, params: [String(feta.id)] })).status).toBe(404);
    expect((await call("PATCH", "/vendor/products/{product_id}", { token: elsewhere.access_token, params: [String(milk)], body: { stock: 99 } })).status).toBe(404);
    expect((await call("DELETE", "/vendor/departments/{department_id}", { token: elsewhere.access_token, params: [String(deptId)] })).status).toBe(404);

    // A change, then the departments in a new order by drag.
    expect((await call("PATCH", "/vendor/products/{product_id}", { token: manager.access_token, params: [String(feta.id)], body: { price: "99.00", in_stock: false } })).body).toMatchObject({ price: { amount: "99.00" }, in_stock: false });
    const bakery = ((await call("POST", "/vendor/departments", { token: manager.access_token, body: { name: "Bakery" } })).body as { id: number }).id;
    const ordered = await call("POST", "/vendor/departments/order", { token: manager.access_token, body: { ids: [bakery, deptId] } });
    expect((ordered.body as { items: { name: string }[] }).items.map((d) => d.name)).toEqual(["Bakery", "Dairy"]);
    expect((await call("POST", "/vendor/departments/order", { token: manager.access_token, body: { ids: [bakery] } })).status).toBe(400);

    // Every change is kept for the owner.
    const changes = await store.listMarketCatalogChanges(app.id, { vendorId: grocery, by: "vendor", limit: 20 });
    expect(changes.map((c) => `${c.entity}:${c.action}`)).toEqual(expect.arrayContaining(["product:create", "product:update", "department:create", "aisle:create", "department:update"]));
    const update = changes.find((c) => c.entity === "product" && c.action === "update" && c.fields.includes("price"))!;
    expect(update).toMatchObject({ byName: "Rana", before: { price: 12050 }, after: { price: 9900 } });
    expect((await call("DELETE", "/vendor/products/{product_id}", { token: manager.access_token, params: [String(feta.id)] })).status).toBe(204);
    expect(await store.getMarketProduct(app.id, feta.id)).toBeNull();
    // Customers never see another vendor's products or stock counts above the few left.
    const list = await call("GET", "/market/vendors/{vendor_id}/products", { params: [String(other)] });
    expect((list.body as { items: { id: number; stock: number | null }[] }).items).toEqual([expect.objectContaining({ id: bread, stock: null })]);
  });

  // 115.29 Weighed orders settled with what was paid (D1).

  /** A card order as the gateway confirmed it, accepted and picked as given, then ready. */
  async function paidCardOrder(lines: Record<string, unknown>[], payment: "card" | "cash" | "wallet" = "card", fulfilment = "pickup") {
    const customer = await signUp(`10${Math.floor(10_000_000 + Math.random() * 89_999_999)}`, "Nour");
    const cart = { vendor_id: grocery, lines, fulfilment, ...(fulfilment === "delivery" ? { dropoff: HOME } : {}) };
    if (payment === "wallet") await store.addWalletEntry({ appId: app.id, userId: customer.user.id, kind: "credit", amount: 5000_00, label: "Gift", orderId: null, complaintId: null, key: `gift-${customer.user.id}`, createdAt: now });
    const placed = await call("POST", "/market/orders", { token: customer.access_token, query: { platform: "android" }, body: { ...cart, quote_id: await quote(customer.access_token, cart), payment } });
    expect(placed.status, JSON.stringify(placed.body)).toBe(201);
    const id = (placed.body as { order: { id: number } }).order.id;
    if (payment === "card") await store.updateMarketOrder(app.id, id, { status: "placed", paymentStatus: "paid", paymentRef: "pay-1", timeline: [...(await store.getMarketOrder(app.id, id))!.timeline, { status: "placed", at: now.toISOString(), by: "system" }] });
    return { customer, id };
  }

  async function pickAndReady(id: number, picks: Record<string, unknown>[]) {
    const staff = await staffOf(grocery, `11${Math.floor(10_000_000 + Math.random() * 89_999_999)}`, "Rana");
    expect((await call("POST", "/vendor/orders/{order_id}/accept", { token: staff.access_token, params: [String(id)], body: { prep_minutes: 10 } })).status).toBe(200);
    const picked = await call("PATCH", "/vendor/orders/{order_id}/lines", { token: staff.access_token, params: [String(id)], body: { lines: picks } });
    expect(picked.status, JSON.stringify(picked.body)).toBe(200);
    expect((await call("POST", "/vendor/orders/{order_id}/ready", { token: staff.access_token, params: [String(id)] })).status).toBe(200);
    return staff;
  }

  it("refunds a card order weighed lighter, once, on its money lines and order, and moves the stock by the weight", async () => {
    // 2 kg of cheese at 200: 400 charged.
    const { customer, id } = await paidCardOrder([{ product_id: cheese, quantity: 2 }]);
    expect((await stock(cheese)).stock).toBe(0);
    await pickAndReady(id, [{ line_id: 1, outcome: "picked", quantity: 1.5 }]);
    expect(refunds).toEqual([{ orderId: id, cents: 100_00 }]);
    const order = (await store.getMarketOrder(app.id, id))!;
    expect(order).toMatchObject({ paymentStatus: "partly_refunded", money: { total: 300_00, settlement: { paid: 400_00, final: 300_00, toCard: 100_00, toWallet: 0, cardError: null } } });
    expect(order.settledAt).toBeTruthy();
    // The stock follows the weight: half a kilo (one step) back.
    expect((await stock(cheese)).stock).toBe(1);
    expect((await store.listMarketStockMoves(app.id, { orderId: id, limit: 5 })).map((m) => [m.reason, m.delta])).toContainEqual(["pick", 1]);
    const mine = await call("GET", "/me/market-orders/{order_id}", { token: customer.access_token, params: [String(id)] });
    expect(mine.body).toMatchObject({ estimated: false, settlement: { paid: { amount: "400.00" }, final: { amount: "300.00" }, to_card: { amount: "100.00" }, to_wallet: { amount: "0.00" } }, payment: { status: "partly_refunded" } });
    const price = (mine.body as { price: { kind: string; amount: { amount: string } }[] }).price;
    expect(price.at(-1)).toMatchObject({ kind: "refund", amount: { amount: "-100.00" } });
    // Cancelled afterwards by the owner: the stock that's still taken comes back, and nothing is refunded again.
    await cancelMarketOrder({ store, app, now }, (await store.getMarketOrder(app.id, id))!, "owner");
    expect((await stock(cheese)).stock).toBe(4);
    expect(refunds).toHaveLength(1);
  });

  it("settles nothing when it's weighed as ordered or heavier, and never charges a card more than it paid", async () => {
    const same = await paidCardOrder([{ product_id: cheese, quantity: 1 }]);
    await pickAndReady(same.id, [{ line_id: 1, outcome: "picked", quantity: 1 }]);
    const heavy = await paidCardOrder([{ product_id: cheese, quantity: 1 }]);
    await pickAndReady(heavy.id, [{ line_id: 1, outcome: "picked", quantity: 1.1 }]);
    expect(refunds).toEqual([]);
    expect(await store.getMarketOrder(app.id, same.id)).toMatchObject({ money: { total: 200_00 }, paymentStatus: "paid" });
    expect((await store.getMarketOrder(app.id, same.id))!.settledAt ?? null).toBeNull();
    // 1.1 kg would be 220; paid ahead, it stays at the 200 charged.
    expect(await store.getMarketOrder(app.id, heavy.id)).toMatchObject({ money: { total: 200_00 }, paymentStatus: "paid" });
    expect((await store.getMarketOrder(app.id, heavy.id))!.money.lines.some((l) => l.kind === "refund")).toBe(false);
  });

  it("refunds a cheaper substitute and a line left out, and nothing for a substitute at the same price", async () => {
    await store.updateMarketProduct(app.id, yogurt, { stock: 10 }, now);
    // Milk 30 × 2 out, yogurt (10) chosen instead of 1 kg of cheese (200): 260 back of 260.
    const { id } = await paidCardOrder([{ product_id: milk, quantity: 2, if_missing: "remove" }, { product_id: cheese, quantity: 1, if_missing: "chosen", substitute_product_id: yogurt }]);
    await pickAndReady(id, [{ line_id: 1, outcome: "missing" }, { line_id: 2, outcome: "substituted", quantity: 1 }]);
    expect(refunds).toEqual([{ orderId: id, cents: 60_00 + 190_00 }]);
    expect((await store.getMarketOrder(app.id, id))!.money.settlement).toMatchObject({ paid: 260_00, final: 10_00 });
    // Milk swapped for milk at its price: nothing back.
    const twin = (await store.createMarketProduct({ appId: app.id, vendorId: grocery, departmentId: null, aisleId: null, name: "Milk too", description: null, brand: null, sku: null, barcode: null, imageAssetId: null, imageUrl: null, price: 30_00, wasPrice: null, unit: "item", step: 1, maxQuantity: null, stock: 5, inStock: true, tags: [], position: 1 }, now));
    if (!twin.ok) throw new Error("product");
    const swap = await paidCardOrder([{ product_id: milk, quantity: 1, if_missing: "chosen", substitute_product_id: twin.product.id }]);
    await pickAndReady(swap.id, [{ line_id: 1, outcome: "substituted", quantity: 1 }]);
    expect(refunds).toHaveLength(1);
  });

  it("puts the refund in the wallet when the card's refund fails, or for what the wallet paid", async () => {
    cardDown = true;
    const { customer, id } = await paidCardOrder([{ product_id: cheese, quantity: 2 }]);
    await pickAndReady(id, [{ line_id: 1, outcome: "picked", quantity: 1 }]);
    expect((await store.getMarketOrder(app.id, id))!.money.settlement).toMatchObject({ toCard: 0, toWallet: 200_00, cardError: "The gateway refused the refund." });
    expect(await store.walletBalance(app.id, customer.user.id)).toBe(200_00);
    cardDown = false;
    // Paid from the wallet: back to it.
    const wallet = await paidCardOrder([{ product_id: cheese, quantity: 1 }], "wallet");
    const before = await store.walletBalance(app.id, wallet.customer.user.id);
    await pickAndReady(wallet.id, [{ line_id: 1, outcome: "picked", quantity: 0.5 }]);
    expect(await store.walletBalance(app.id, wallet.customer.user.id)).toBe(before + 100_00);
    expect(refunds).toEqual([]);
  });

  it("settles once when two runs settle the same order at the same time", async () => {
    const { id } = await paidCardOrder([{ product_id: cheese, quantity: 2 }]);
    const staff = await staffOf(grocery, "1118887777", "Rana");
    await call("POST", "/vendor/orders/{order_id}/accept", { token: staff.access_token, params: [String(id)], body: { prep_minutes: 10 } });
    await call("PATCH", "/vendor/orders/{order_id}/lines", { token: staff.access_token, params: [String(id)], body: { lines: [{ line_id: 1, outcome: "picked", quantity: 1 }] } });
    const order = (await store.getMarketOrder(app.id, id))!;
    const refundToCard = async (o: { id: number }, cents: number) => {
      refunds.push({ orderId: o.id, cents });
      return { ok: true as const };
    };
    const runs = await Promise.all([settleWeighedOrder({ store, app, now, refundToCard }, order), settleWeighedOrder({ store, app, now, refundToCard }, order)]);
    expect(runs.filter((r) => r.settled)).toHaveLength(1);
    expect(refunds).toEqual([{ orderId: id, cents: 200_00 }]);
  });

  it("charges a cash order what it weighs, at most the estimate and the vendor's tolerance, and its courier collects that", async () => {
    // Delivered by the app's courier, cash: the job collects the new total.
    const { id } = await paidCardOrder([{ product_id: cheese, quantity: 1 }], "cash", "delivery");
    const fresh = (await store.getMarketOrder(app.id, id))!;
    await pickAndReady(id, [{ line_id: 1, outcome: "picked", quantity: 1.5 }]);
    const order = (await store.getMarketOrder(app.id, id))!;
    // 1.5 kg would be 300; 10% over the 200 agreed is the most: 220.
    expect(order.lines[0]).toMatchObject({ total: 220_00 });
    expect(order.money.total - fresh.money.total).toBe(20_00);
    expect(order.settledAt ?? null).toBeNull();
    expect(refunds).toEqual([]);
    const job = await store.getShipment(app.id, order.shipmentId!);
    expect(job).toMatchObject({ paymentMethod: "cash", priceCents: order.money.payNow });
  });
});
