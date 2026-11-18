import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type DeliverySettings, type MarketOrder, type RestaurantInput } from "@/lib/data/types";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { FoodConnector } from "@/lib/hosted/connectors/food";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { ANSWER_MINUTES, expiredLines, timeoutAnswer } from "@/lib/market/substitutes";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
const KITCHEN = { address: "Tahrir Square, Cairo", details: null, lat: 30.0444, lng: 31.2357 };
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

/**
 * 115.40 A similar item, asked live: the picker proposes it, the customer
 * accepts it or leaves it out within five minutes, then the order's choice
 * answers it; picking follows the answer.
 */
describe("115.40 substitutes asked live", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let grocery: number;
  let rice: number;
  let shortRice: number;
  let eggs: number;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "food");
    app = {
      ...base,
      backend: "hosted",
      appName: "Zad",
      websiteDoneAt: NOW,
      connector: { kind: "restaurants" },
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: encryptPaymentKeys(base.id, "sandbox-api", "sandbox-secret", true, KEY) },
    };
    await store.createApp(app);
    await store.saveDeliverySettings(app.id, SETTINGS, NOW);
    grocery = (
      await store.createRestaurant(
        vendor(app.id, { name: "Zad Market", kind: "grocery", cuisines: [], delivery: { by: "app", feeKind: "fixed", fee: 0, perKm: 0, freeOver: null, minItems: null, maxItems: null, pickup: true, scheduling: false } }),
        { sections: [], nextId: 1 },
        NOW,
      )
    ).id;
    const made = async (name: string, price: number, inStock = true) => {
      const r = await store.createMarketProduct(
        { appId: app.id, vendorId: grocery, departmentId: null, aisleId: null, name, description: null, brand: null, sku: name.toLowerCase(), barcode: null, imageAssetId: null, imageUrl: null, price, wasPrice: null, unit: "item", step: 1, maxQuantity: null, stock: null, inStock, tags: [], position: 1 },
        NOW,
      );
      if (!r.ok) throw new Error("product");
      return r.product.id;
    };
    rice = await made("Egyptian rice, 1 kg", 38_00);
    shortRice = await made("Short-grain rice, 1 kg", 42_00);
    eggs = await made("Eggs, 30", 165_00);
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

  type Line = { id: number; outcome: string | null; total: { amount: string }; if_missing: string; substitute: { product_id: number } | null; proposal: { product_id: number; answer: string | null; answered_by: string | null; difference: { amount: string }; expires_at: string } | null };
  type Order = { id: number; status: string; if_missing: string | null; lines: Line[] };

  /** A picking order of rice ×2 and eggs: the order's choice and the lines' own. */
  let people = 0;
  async function pickingOrder(cart: Record<string, unknown>) {
    people += 1;
    const customer = await signUp(`100111222${people}`, "Mona");
    const body = { vendor_id: grocery, fulfilment: "pickup", ...cart };
    const quote = await call("POST", "/market/quote", { token: customer.access_token, body });
    expect(quote.status, JSON.stringify(quote.body)).toBe(200);
    const placed = await call("POST", "/market/orders", { token: customer.access_token, query: { platform: "android" }, body: { ...body, quote_id: (quote.body as { quote_id: string }).quote_id, payment: "cash" } });
    expect(placed.status, JSON.stringify(placed.body)).toBe(201);
    const order = (placed.body as { order: Order }).order;
    await store.createRestaurantStaff({ appId: app.id, restaurantId: grocery, name: "Samir", phone: `+20111444555${people}`, email: null, active: true, role: "manager" }, NOW);
    const staff = await signUp(`111444555${people}`, "Samir");
    expect((await call("POST", "/vendor/orders/{order_id}/accept", { token: staff.access_token, params: [String(order.id)], body: { prep_minutes: 20 } })).body).toMatchObject({ status: "picking" });
    return { customer, staff, order };
  }

  const propose = (token: string, orderId: number, lineId: number, productId: number, quantity?: number) =>
    call("POST", "/vendor/orders/{order_id}/lines/{line_id}/proposal", { token, params: [String(orderId), String(lineId)], body: { product_id: productId, ...(quantity ? { quantity } : {}) } });
  const answer = (token: string, orderId: number, lineId: number, a: "accept" | "decline") =>
    call("POST", "/me/market-orders/{order_id}/lines/{line_id}/proposal", { token, params: [String(orderId), String(lineId)], body: { answer: a } });
  const read = async (token: string, orderId: number) => (await call("GET", "/me/market-orders/{order_id}", { token, params: [String(orderId)] })).body as Order;

  it("keeps the order's choice and fills the lines that don't say", async () => {
    const { order } = await pickingOrder({ if_missing: "similar", lines: [{ product_id: rice, quantity: 2 }, { product_id: eggs, quantity: 1, if_missing: "remove" }] });
    expect(order.if_missing).toBe("similar");
    expect(order.lines.map((l) => l.if_missing)).toEqual(["similar", "remove"]);
    expect((await store.getMarketOrder(app.id, order.id))!.ifMissing).toBe("similar");
  });

  it("asks the customer, who accepts in time: the picker brings the proposed item", async () => {
    const { customer, staff, order } = await pickingOrder({ if_missing: "similar", lines: [{ product_id: rice, quantity: 2 }, { product_id: eggs, quantity: 1 }] });
    const proposed = await propose(staff.access_token, order.id, 1, shortRice);
    expect(proposed.status, JSON.stringify(proposed.body)).toBe(200);
    const seen = await read(customer.access_token, order.id);
    // 2 × 42 against 2 × 38: never dearer, so at the line's 76.
    expect(seen.lines[0]!.proposal).toMatchObject({ product_id: shortRice, answer: null, answered_by: null, total: { amount: "76.00" }, difference: { amount: "0.00" } });
    expect(new Date(seen.lines[0]!.proposal!.expires_at).getTime() - now.getTime()).toBe(ANSWER_MINUTES * 60_000);
    // Waiting: the line can't be swapped yet, and nothing else is proposed for it.
    expect((await call("PATCH", "/vendor/orders/{order_id}/lines", { token: staff.access_token, params: [String(order.id)], body: { lines: [{ line_id: 1, outcome: "substituted" }] } })).status).toBe(409);
    expect((await propose(staff.access_token, order.id, 1, eggs)).status).toBe(409);

    now = new Date(now.getTime() + 4 * 60_000);
    const accepted = await answer(customer.access_token, order.id, 1, "accept");
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);
    expect((accepted.body as Order).lines[0]!.proposal).toMatchObject({ answer: "accepted", answered_by: "customer" });
    // Once only.
    expect((await answer(customer.access_token, order.id, 1, "decline")).body).toMatchObject({ code: "proposal_closed" });
    // Another item than the accepted one is refused; with none, it's the accepted one.
    expect((await call("PATCH", "/vendor/orders/{order_id}/lines", { token: staff.access_token, params: [String(order.id)], body: { lines: [{ line_id: 1, outcome: "substituted", substitute_product_id: eggs }] } })).status).toBe(409);
    const picked = await call("PATCH", "/vendor/orders/{order_id}/lines", { token: staff.access_token, params: [String(order.id)], body: { lines: [{ line_id: 1, outcome: "substituted" }, { line_id: 2, outcome: "picked", quantity: 1 }] } });
    expect(picked.status, JSON.stringify(picked.body)).toBe(200);
    expect((picked.body as Order).lines[0]).toMatchObject({ outcome: "substituted", substitute: { product_id: shortRice } });
  });

  it("leaves the line out when the customer declines, and lets the picker propose another", async () => {
    const { customer, staff, order } = await pickingOrder({ if_missing: "similar", lines: [{ product_id: rice, quantity: 2 }] });
    await propose(staff.access_token, order.id, 1, shortRice);
    expect((await answer(customer.access_token, order.id, 1, "decline")).body).toMatchObject({ lines: [{ proposal: { answer: "declined", answered_by: "customer" } }] });
    expect((await call("PATCH", "/vendor/orders/{order_id}/lines", { token: staff.access_token, params: [String(order.id)], body: { lines: [{ line_id: 1, outcome: "substituted", substitute_product_id: shortRice }] } })).body).toMatchObject({ code: "proposal_open" });
    // Another try is allowed after a "no".
    expect((await propose(staff.access_token, order.id, 1, eggs, 1)).status).toBe(200);
    const missing = await call("PATCH", "/vendor/orders/{order_id}/lines", { token: staff.access_token, params: [String(order.id)], body: { lines: [{ line_id: 1, outcome: "missing" }] } });
    expect(missing.body).toMatchObject({ lines: [{ outcome: "missing", total: { amount: "0.00" } }] });
  });

  it("answers by the order's choice after five minutes: similar takes it, leave-it-out leaves it", async () => {
    const similar = await pickingOrder({ if_missing: "similar", lines: [{ product_id: rice, quantity: 2 }] });
    await propose(similar.staff.access_token, similar.order.id, 1, shortRice);
    now = new Date(now.getTime() + ANSWER_MINUTES * 60_000 + 1000);
    expect((await read(similar.customer.access_token, similar.order.id)).lines[0]!.proposal).toMatchObject({ answer: "accepted", answered_by: "timeout" });
    expect((await answer(similar.customer.access_token, similar.order.id, 1, "decline")).body).toMatchObject({ code: "proposal_closed" });
    // The vendor's read applies it too, and the swap goes through.
    expect((await call("PATCH", "/vendor/orders/{order_id}/lines", { token: similar.staff.access_token, params: [String(similar.order.id)], body: { lines: [{ line_id: 1, outcome: "substituted" }] } })).body).toMatchObject({ lines: [{ outcome: "substituted" }] });
  });

  it("asks only lines whose choice is a similar item", async () => {
    const { staff, order } = await pickingOrder({ if_missing: "remove", lines: [{ product_id: rice, quantity: 2 }, { product_id: eggs, quantity: 1, if_missing: "chosen", substitute_product_id: rice }] });
    expect((await propose(staff.access_token, order.id, 1, shortRice)).body).toMatchObject({ code: "not_asked" });
    expect((await propose(staff.access_token, order.id, 2, shortRice)).body).toMatchObject({ code: "not_asked" });
    // Not another vendor's product, nor the same one.
    const other = await pickingOrder({ if_missing: "similar", lines: [{ product_id: rice, quantity: 1 }] });
    expect((await propose(other.staff.access_token, other.order.id, 1, rice)).status).toBe(400);
    expect((await propose(other.staff.access_token, other.order.id, 1, 999_999)).status).toBe(400);
    // The customer can only answer their own order.
    await propose(other.staff.access_token, other.order.id, 1, shortRice);
    const stranger = await signUp("1009990000", "Hoda");
    expect((await answer(stranger.access_token, other.order.id, 1, "accept")).status).toBe(404);
  });

  it("works out a timed-out answer from the order's choice, else the line's", () => {
    expect(timeoutAnswer({ ifMissing: "similar" }, { ifMissing: "similar" })).toBe("accepted");
    expect(timeoutAnswer({ ifMissing: "remove" }, { ifMissing: "similar" })).toBe("declined");
    expect(timeoutAnswer({ ifMissing: "chosen" }, { ifMissing: "similar" })).toBe("declined");
    expect(timeoutAnswer({ ifMissing: null }, { ifMissing: "similar" })).toBe("accepted");
    const proposal = { productId: 2, name: "x", imageUrl: null, quantity: 1, total: 100, proposedAt: NOW.toISOString(), expiresAt: new Date(NOW.getTime() + 300_000).toISOString(), answer: null, answeredBy: null, answeredAt: null };
    const order = { ifMissing: "remove", lines: [{ id: 1, ifMissing: "similar", proposal }] } as unknown as MarketOrder;
    expect(expiredLines(order, new Date(NOW.getTime() + 299_000))).toBeNull();
    expect(expiredLines(order, new Date(NOW.getTime() + 300_000))![0]!.proposal).toMatchObject({ answer: "declined", answeredBy: "timeout", answeredAt: proposal.expiresAt });
  });
});
