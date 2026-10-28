import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { deliverPaidOrder } from "@/lib/catalog/payment";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type DeliverySettings, type RestaurantMenu, type RestaurantInput } from "@/lib/data/types";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { dishNamesOf } from "@/lib/food/menu";
import { commissionOf, foodOrderIdOf, foodOrderReference, priceCart, restaurantState } from "@/lib/food/service";
import { FoodConnector } from "@/lib/hosted/connectors/food";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
// Tahrir Square and the Cairo Tower: about 1.2 km apart.
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
  cuisines: [
    { id: "egyptian", name: "Egyptian" },
    { id: "grill", name: "Grill" },
  ],
  timezone: "Africa/Cairo",
};

// Koshari 50, large +15; a sold-out dessert; extras up to 2.
const MENU: RestaurantMenu = {
  sections: [
    {
      id: 1,
      name: "Mains",
      dishes: [
        {
          id: 2,
          name: "Koshari",
          description: "Rice, lentils and pasta",
          imageAssetId: "dish-1",
          priceCents: 50_00,
          available: true,
          popular: true,
          choiceGroups: [
            { id: 3, name: "Size", min: 1, max: 1, choices: [{ id: 4, name: "Regular", extraCents: 0, available: true }, { id: 5, name: "Large", extraCents: 15_00, available: true }] },
            { id: 6, name: "Extras", min: 0, max: 2, choices: [{ id: 7, name: "Crispy onions", extraCents: 5_00, available: true }, { id: 8, name: "Hot sauce", extraCents: 0, available: true }, { id: 9, name: "Chickpeas", extraCents: 3_00, available: false }] },
          ],
        },
        { id: 10, name: "Om Ali", description: null, imageAssetId: null, priceCents: 40_00, available: false, popular: false, choiceGroups: [] },
      ],
    },
  ],
  nextId: 11,
};

const restaurant = (appId: string, patch: Partial<RestaurantInput> = {}): RestaurantInput => ({
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
  minOrderCents: 60_00,
  maxKm: null,
  commissionBp: 1250,
  active: true,
  position: 1,
  ...patch,
});

const cart = (restaurantId: number, extra: Record<string, unknown> = {}) => ({
  restaurant_id: restaurantId,
  lines: [{ dish_id: 2, quantity: 2, choices: [5, 7], note: "No garlic" }],
  dropoff: HOME,
  ...extra,
});

describe("105.1 food menus, prices and opening hours", () => {
  it("prices a cart line by line and checks each dish's choices", () => {
    const priced = priceCart(MENU, [{ dishId: 2, quantity: 2, choices: [5, 7], note: null }]);
    expect(priced).toEqual({ ok: true, subtotalCents: 140_00, lines: [{ dishId: 2, name: "Koshari", quantity: 2, choices: ["Size: Large", "Extras: Crispy onions"], note: null, unitCents: 70_00 }] });
    expect(priceCart(MENU, [{ dishId: 2, quantity: 1, choices: [], note: null }])).toMatchObject({ ok: false, code: "invalid_request", error: "Choose one for Size (Koshari)." });
    expect(priceCart(MENU, [{ dishId: 2, quantity: 1, choices: [4, 7, 8, 5], note: null }])).toMatchObject({ ok: false, code: "invalid_request" });
    expect(priceCart(MENU, [{ dishId: 2, quantity: 1, choices: [4, 9], note: null }])).toMatchObject({ ok: false, code: "unavailable_item", error: "Chickpeas is sold out for now." });
    expect(priceCart(MENU, [{ dishId: 10, quantity: 1, choices: [], note: null }])).toMatchObject({ ok: false, code: "unavailable_item", field: "lines[0]" });
    expect(priceCart(MENU, [{ dishId: 99, quantity: 1, choices: [], note: null }])).toMatchObject({ ok: false, code: "invalid_request" });
    expect(dishNamesOf(MENU)).toBe("koshari\nom ali");
    expect(commissionOf(140_00, 1250)).toBe(17_50);
    expect(foodOrderReference({ id: 42 })).toBe("F-1042");
    expect(foodOrderIdOf("f-1042")).toBe(42);
    expect(foodOrderIdOf("hello")).toBeNull();
  });

  it("opens by the hours in the company's time zone, past midnight too, and not while busy", () => {
    // NOW is 13:00 in Cairo (UTC+3), a Monday; 21:30 UTC on Sunday is 00:30 on Monday there.
    const late = { hours: [{ day: "sun" as const, opens: "18:00", closes: "02:00" }], busyUntil: null, active: true };
    expect(restaurantState(late, "Africa/Cairo", new Date("2026-10-11T21:30:00Z"))).toMatchObject({ inHours: true, open: true });
    const closed = restaurantState(late, "Africa/Cairo", NOW);
    expect(closed).toMatchObject({ inHours: false, open: false });
    // Next Sunday at 18:00 Cairo time (UTC+3).
    expect(closed.opensAt?.toISOString()).toBe("2026-10-18T15:00:00.000Z");
    const busy = restaurantState({ hours: EVERY_DAY, busyUntil: new Date(NOW.getTime() + 600_000), active: true }, "Africa/Cairo", NOW);
    expect(busy).toMatchObject({ inHours: true, busy: true, open: false });
    expect(restaurantState({ hours: EVERY_DAY, busyUntil: null, active: false }, "Africa/Cairo", NOW).open).toBe(false);
  });
});

describe("105.1 food delivery apps on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let food: boolean;
  let abou: number;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "food");
    app = {
      ...base,
      backend: "hosted",
      appName: "Nile Eats",
      websiteDoneAt: NOW,
      connector: { kind: "restaurants" },
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: encryptPaymentKeys(base.id, "sandbox-api", "sandbox-secret", true, KEY) },
    };
    await store.createApp(app);
    await store.saveDeliverySettings(app.id, SETTINGS, NOW);
    abou = (await store.createRestaurant(restaurant(app.id), MENU, NOW)).id;
    sender = new LogSender();
    now = NOW;
    food = true;
  });

  const context = (overrides: Partial<HostedContext> = {}): HostedContext => ({
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
    connector: new FoodConnector({ store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test", food }),
    ...overrides,
  });

  async function call(method: string, route: string, options: { query?: Record<string, string>; params?: string[]; token?: string; body?: unknown } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), {
      method,
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
    });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone: string, name: string, code?: string) {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: code ?? sender.sent.get(`+20${phone}`)!, device: { ...DEVICE, id: `install-${phone}` } } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: { ...DEVICE, id: `install-${phone}` } } });
    return registered.body as { access_token: string; user: { id: number; roles?: string[] } };
  }

  const place = (token: string, extra: Record<string, unknown> = {}) => call("POST", "/food/orders", { query: { platform: "android" }, token, body: { ...cart(abou), payment: "cash", ...extra } });
  const inbox = async (userId: number) =>
    (await store.listHostedNotifications({ appId: app.id, userId, since: new Date(0), page: 1, perPage: 20 })).items.map((n) => [n.title, n.data?.type]).reverse();

  async function staffOf(restaurantId: number, phone: string, name: string) {
    await store.createRestaurantStaff({ appId: app.id, restaurantId, name, phone: `+20${phone}`, email: null, active: true }, NOW);
    return signUp(phone, name);
  }

  it("sends Config.food: currency, time zone, cuisines, payment, tracking, when courier jobs are made, the map", async () => {
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as Record<string, unknown>;
    expect(config.food).toEqual({
      currency: "EGP",
      timezone: "Africa/Cairo",
      cuisines: [
        { id: "egyptian", name: "Egyptian" },
        { id: "grill", name: "Grill" },
      ],
      payment: { cash: true, card: true },
      tracking: "stages",
      courier_job: "accepted",
      courier_app: "same",
      map: { tiles_url: null, attribution: null },
    });
    expect(config).not.toHaveProperty("delivery");
  });

  it("lists open restaurants first, those that deliver to the customer before the rest, and searches dishes", async () => {
    await store.createRestaurant(restaurant(app.id, { name: "Night Grill", cuisines: ["grill"], hours: [{ day: "sun", opens: "20:00", closes: "23:00" }], position: 0 }), { sections: [], nextId: 1 }, NOW);
    await store.createRestaurant(restaurant(app.id, { name: "Far Away", address: { address: "Alexandria", details: null, lat: 31.2, lng: 29.9 }, position: 2 }), { sections: [], nextId: 1 }, NOW);
    await store.createRestaurant(restaurant(app.id, { name: "Paused", active: false }), { sections: [], nextId: 1 }, NOW);
    const list = (await call("GET", "/food/restaurants", { query: { lat: "30.0459", lng: "31.2243" } })).body as { total: number; items: Record<string, unknown>[] };
    expect(list.items.map((r) => [r.name, r.open, r.delivers])).toEqual([
      ["Abou Tarek", true, true],
      ["Night Grill", false, true],
      ["Far Away", true, false],
    ]);
    expect(list.items[0]).toEqual({
      id: abou,
      name: "Abou Tarek",
      logo_url: ASSETS("logo-1"),
      cover_url: null,
      cuisines: ["Egyptian"],
      rating: null,
      ratings_count: 0,
      open: true,
      opens_at: null,
      busy: false,
      prep_minutes: 20,
      // 20 minutes, 10 more, then 1.2 km at 25 km/h.
      delivery_minutes: 33,
      min_order: "60.00",
      min_order_formatted: "E£60.00",
      // 20 + 10 × 1.2 = 32.
      delivery_fee_formatted: "E£32.00",
      distance_km: 1.2,
      delivers: true,
    });
    expect((list.items[1] as { opens_at: string }).opens_at).toBe("2026-10-18T17:00:00.000Z");
    const grill = (await call("GET", "/food/restaurants", { query: { cuisine: "grill" } })).body as { items: { name: string; delivers: boolean | null }[] };
    expect(grill.items).toEqual([expect.objectContaining({ name: "Night Grill", delivers: null })]);
    const search = (await call("GET", "/food/restaurants", { query: { q: "kosh" } })).body as { items: { name: string }[] };
    expect(search.items.map((r) => r.name)).toEqual(["Abou Tarek"]);
    const menu = (await call("GET", "/food/restaurants/{restaurant_id}", { params: [String(abou)] })).body as { menu: { dishes: Record<string, unknown>[] }[]; hours: unknown[] };
    expect(menu.hours).toHaveLength(7);
    expect(menu.menu[0]!.dishes[0]).toMatchObject({ name: "Koshari", price: "50.00", image_url: ASSETS("dish-1"), choice_groups: [{ name: "Size", choices: [{ name: "Regular", extra_formatted: null }, { name: "Large", extra: "15.00", extra_formatted: "+E£15.00" }] }, { name: "Extras" }] });
    expect(menu.menu[0]!.dishes[1]).toMatchObject({ name: "Om Ali", available: false });
    const paused = (await store.listRestaurants(app.id)).find((r) => r.name === "Paused")!;
    expect((await call("GET", "/food/restaurants/{restaurant_id}", { params: [String(paused.id)] })).status).toBe(404);
  });

  it("quotes a cart, and refuses one under the smallest order, from a closed restaurant or too far", async () => {
    const quote = await call("POST", "/food/quote", { body: cart(abou) });
    expect(quote.body).toEqual({
      lines: [{ dish_id: 2, name: "Koshari", quantity: 2, choices: ["Size: Large", "Extras: Crispy onions"], note: "No garlic", unit_price: "70.00", total: "140.00", total_formatted: "E£140.00" }],
      subtotal: "140.00",
      subtotal_formatted: "E£140.00",
      delivery_fee: "32.00",
      delivery_fee_formatted: "E£32.00",
      total: "172.00",
      total_formatted: "E£172.00",
      currency: "EGP",
      distance_km: 1.2,
      delivery_minutes: 33,
    });
    const small = await call("POST", "/food/quote", { body: cart(abou, { lines: [{ dish_id: 2, quantity: 1, choices: [4] }] }) });
    expect([small.status, (small.body as { code: string }).code]).toEqual([409, "below_minimum"]);
    const soldOut = await call("POST", "/food/quote", { body: cart(abou, { lines: [{ dish_id: 10, quantity: 1 }] }) });
    expect(soldOut.status).toBe(409);
    expect(soldOut.body).toMatchObject({ code: "unavailable_item", details: { field: "lines[0]" } });
    const far = await call("POST", "/food/quote", { body: cart(abou, { dropoff: { address: "Alexandria", lat: 31.2, lng: 29.9 } }) });
    expect([far.status, (far.body as { code: string }).code]).toEqual([400, "outside_delivery_area"]);
    await store.updateRestaurant(app.id, abou, { maxKm: 1 }, NOW);
    expect(((await call("POST", "/food/quote", { body: cart(abou) })).body as { message: string }).message).toBe("This restaurant delivers up to 1 km. You are 1.2 km away.");
    await store.updateRestaurant(app.id, abou, { maxKm: null, busyUntil: new Date(NOW.getTime() + 3_600_000) }, NOW);
    const busy = await call("POST", "/food/quote", { body: cart(abou) });
    expect([busy.status, (busy.body as { code: string }).code]).toEqual([409, "restaurant_closed"]);
  });

  it("takes a cash order to the restaurant's staff, who accept it; a courier job is made and the order follows it to the door", async () => {
    await store.createCourier({ appId: app.id, name: "Omar Said", phone: "+201005556666", email: null, vehicle: null, active: true }, NOW);
    const omar = await signUp("1005556666", "Omar");
    const chef = await staffOf(abou, "1007778888", "Chef Ali");
    expect(chef.user.roles).toEqual(["restaurant"]);
    const customer = await signUp("1001112222", "Karim Hassan");
    expect(customer.user.roles).toEqual([]);
    const placed = await place(customer.access_token, { notes: "Ring twice" });
    expect(placed.status).toBe(201);
    const order = (placed.body as { order: Record<string, unknown>; pay_url: string | null }).order;
    expect(placed.body).toMatchObject({ pay_url: null });
    expect(order).toMatchObject({ status: "placed", reference: expect.stringMatching(/^F-\d+$/), total: "172.00", restaurant: { name: "Abou Tarek", phone: "+20225775935", logo_url: ASSETS("logo-1") }, payment: { method: "cash", status: "unpaid" }, courier: null });
    const id = order.id as number;
    const saved = (await store.getFoodOrder(app.id, id))!;
    expect(saved).toMatchObject({ customerPhone: "+201001112222", commissionCents: 17_50, deliveryFeeCents: 32_00 });
    expect(await inbox(customer.user.id)).toEqual([["Your order was sent", "food_order_update"]]);
    expect(await inbox(chef.user.id)).toEqual([["New order", "restaurant_order"]]);
    // The kitchen sees the first name and the dishes, not the address or number.
    const fresh = (await call("GET", "/restaurant/orders", { token: chef.access_token, query: { scope: "new" } })).body as { items: Record<string, unknown>[] };
    expect(fresh.items).toEqual([expect.objectContaining({ id, customer: { name: "Karim" }, notes: "Ring twice", subtotal_formatted: "E£140.00" })]);
    expect(fresh.items[0]).not.toHaveProperty("dropoff");
    // Others can't.
    expect((await call("GET", "/restaurant/orders", { token: customer.access_token, query: { scope: "new" } })).body).toMatchObject({ code: "not_restaurant" });
    expect((await call("POST", "/restaurant/orders/{order_id}/accept", { params: [String(id)], token: chef.access_token, body: { prep_minutes: 2 } })).status).toBe(400);
    const accepted = await call("POST", "/restaurant/orders/{order_id}/accept", { params: [String(id)], token: chef.access_token, body: { prep_minutes: 25 } });
    expect(accepted.body).toMatchObject({ status: "accepted", ready_at: new Date(now.getTime() + 25 * 60_000).toISOString() });
    expect((await call("POST", "/restaurant/orders/{order_id}/accept", { params: [String(id)], token: chef.access_token, body: { prep_minutes: 25 } })).status).toBe(409);
    // Too late for the customer to cancel.
    expect((await call("POST", "/me/food-orders/{order_id}/cancel", { params: [String(id)], token: customer.access_token })).body).toMatchObject({ code: "not_cancellable" });
    // The courier job: from the restaurant, the whole total in cash.
    const job = (await store.getShipment(app.id, (await store.getFoodOrder(app.id, id))!.shipmentId!))!;
    expect(job).toMatchObject({ status: "pending", foodOrderId: id, priceCents: 172_00, senderName: "Abou Tarek", pickup: { address: "Tahrir Square, Cairo" }, recipientPhone: "+201001112222" });
    await store.updateShipment(app.id, job.id, { status: "assigned", courierId: (await store.findCourier(app.id, { phone: "+201005556666", email: null }))!.id, courierName: "Omar Said" });
    expect((await call("POST", "/restaurant/orders/{order_id}/ready", { params: [String(id)], token: chef.access_token })).body).toMatchObject({ status: "ready", courier: { name: "Omar Said", phone: "+201005556666" } });
    const step = (status: string) => call("POST", "/courier/jobs/{shipment_id}/status", { params: [String(job.id)], token: omar.access_token, body: { status } });
    expect((await step("picked_up")).status).toBe(200);
    expect((await step("on_the_way")).status).toBe(200);
    expect((await step("delivered")).status).toBe(200);
    const done = (await call("GET", "/me/food-orders/{order_id}", { params: [String(id)], token: customer.access_token })).body as Record<string, unknown>;
    expect(done).toMatchObject({ status: "delivered", payment: { method: "cash", status: "paid" }, courier: { name: "Omar Said", phone: null } });
    expect((await inbox(customer.user.id)).map(([title]) => title)).toEqual(["Your order was sent", "Your order is being prepared", "Your order was picked up", "Your order is on the way", "Enjoy your meal"]);
    // Rated once; the restaurant's average counts it.
    const rated = await call("PUT", "/me/food-orders/{order_id}/rating", { params: [String(id)], token: customer.access_token, body: { restaurant: 5, courier: 4, comment: "Hot and fast" } });
    expect(rated.body).toMatchObject({ rating: { restaurant: 5, courier: 4, comment: "Hot and fast" } });
    expect((await call("PUT", "/me/food-orders/{order_id}/rating", { params: [String(id)], token: customer.access_token, body: { restaurant: 1 } })).body).toMatchObject({ code: "not_rateable" });
    expect((await store.getRestaurant(app.id, abou))).toMatchObject({ ratingSum: 5, ratingCount: 1 });
    const desk = (await call("GET", "/restaurant/me", { token: chef.access_token })).body;
    expect(desk).toMatchObject({ id: abou, name: "Abou Tarek", open: true, accepting: true, busy_until: null, today: { orders: 1, sales_formatted: "E£140.00" } });
    expect(((await call("GET", "/restaurant/orders", { token: chef.access_token, query: { scope: "done" } })).body as { total: number }).total).toBe(1);
  });

  it("lets the restaurant turn an order down with a reason, and go busy for a while", async () => {
    const chef = await staffOf(abou, "1007778888", "Chef Ali");
    const customer = await signUp("1001112222", "Karim Hassan");
    const id = ((await place(customer.access_token)).body as { order: { id: number } }).order.id;
    expect((await call("POST", "/restaurant/orders/{order_id}/reject", { params: [String(id)], token: chef.access_token, body: { reason: "bored" } })).status).toBe(400);
    const rejected = await call("POST", "/restaurant/orders/{order_id}/reject", { params: [String(id)], token: chef.access_token, body: { reason: "item_unavailable", note: "No more lentils" } });
    expect(rejected.body).toMatchObject({ status: "rejected" });
    const mine = (await call("GET", "/me/food-orders/{order_id}", { params: [String(id)], token: customer.access_token })).body;
    expect(mine).toMatchObject({ status: "rejected", rejection: { reason: "item_unavailable", note: "No more lentils" } });
    expect((await inbox(customer.user.id)).at(-1)).toEqual(["Your order wasn't accepted", "food_order_update"]);
    expect((await call("PATCH", "/restaurant/me", { token: chef.access_token, body: { busy_minutes: 5 } })).status).toBe(400);
    const busy = await call("PATCH", "/restaurant/me", { token: chef.access_token, body: { busy_minutes: 30 } });
    expect(busy.body).toMatchObject({ accepting: false, busy_until: new Date(now.getTime() + 30 * 60_000).toISOString() });
    expect(((await call("GET", "/food/restaurants")).body as { items: { busy: boolean }[] }).items[0]!.busy).toBe(true);
    expect((await call("PATCH", "/restaurant/me", { token: chef.access_token, body: { busy_minutes: 0 } })).body).toMatchObject({ accepting: true, busy_until: null });
    // A paused restaurant's staff aren't staff any more.
    await store.updateRestaurant(app.id, abou, { active: false }, NOW);
    expect((await call("GET", "/restaurant/me", { token: chef.access_token })).status).toBe(403);
    expect(((await call("GET", "/me", { token: chef.access_token })).body as { roles: string[] }).roles).toEqual([]);
  });

  it("keeps each restaurant's orders its own", async () => {
    const other = (await store.createRestaurant(restaurant(app.id, { name: "Felfela" }), MENU, NOW)).id;
    const chef = await staffOf(abou, "1007778888", "Chef Ali");
    const rival = await staffOf(other, "1009998888", "Rival");
    const customer = await signUp("1001112222", "Karim Hassan");
    const id = ((await place(customer.access_token)).body as { order: { id: number } }).order.id;
    expect((await call("GET", "/restaurant/orders/{order_id}", { params: [String(id)], token: rival.access_token })).status).toBe(404);
    expect((await call("POST", "/restaurant/orders/{order_id}/accept", { params: [String(id)], token: rival.access_token, body: { prep_minutes: 10 } })).status).toBe(404);
    expect(((await call("GET", "/restaurant/orders", { token: rival.access_token, query: { scope: "new" } })).body as { total: number }).total).toBe(0);
    expect(await inbox(rival.user.id)).toEqual([]);
    expect((await call("GET", "/restaurant/orders/{order_id}", { params: [String(id)], token: chef.access_token })).status).toBe(200);
    // Nor another customer's.
    const stranger = await signUp("1003334444", "Laila");
    expect((await call("GET", "/me/food-orders/{order_id}", { params: [String(id)], token: stranger.access_token })).status).toBe(404);
  });

  it("lets the customer cancel before the restaurant accepts", async () => {
    const customer = await signUp("1001112222", "Karim Hassan");
    const id = ((await place(customer.access_token)).body as { order: { id: number } }).order.id;
    const cancelled = await call("POST", "/me/food-orders/{order_id}/cancel", { params: [String(id)], token: customer.access_token });
    expect(cancelled.body).toMatchObject({ status: "cancelled" });
    const list = (await call("GET", "/me/food-orders", { token: customer.access_token, query: { active: "true" } })).body as { total: number };
    expect(list.total).toBe(0);
  });

  it("makes the courier job once the order is ready when the company chose so", async () => {
    await store.saveDeliverySettings(app.id, { ...SETTINGS, foodCourierJob: "ready" }, NOW);
    const chef = await staffOf(abou, "1007778888", "Chef Ali");
    const customer = await signUp("1001112222", "Karim Hassan");
    const id = ((await place(customer.access_token)).body as { order: { id: number } }).order.id;
    await call("POST", "/restaurant/orders/{order_id}/accept", { params: [String(id)], token: chef.access_token, body: { prep_minutes: 15 } });
    expect((await store.getFoodOrder(app.id, id))!.shipmentId).toBeNull();
    await call("POST", "/restaurant/orders/{order_id}/ready", { params: [String(id)], token: chef.access_token });
    expect((await store.getFoodOrder(app.id, id))!.shipmentId).not.toBeNull();
  });

  it("gives a card order a payment page, and sends it to the restaurant once paid", async () => {
    const chef = await staffOf(abou, "1007778888", "Chef Ali");
    const customer = await signUp("1001112222", "Karim Hassan");
    const placed = (await place(customer.access_token, { payment: "card" })).body as { order: { id: number; status: string }; pay_url: string };
    expect(placed.order.status).toBe("awaiting_payment");
    expect(placed.pay_url).toMatch(/^https:\/\/yallapp\.test\/pay\/[A-Za-z0-9_-]{32}$/);
    // Not the kitchen's until it is paid.
    expect(((await call("GET", "/restaurant/orders", { token: chef.access_token, query: { scope: "new" } })).body as { total: number }).total).toBe(0);
    expect((await call("GET", "/restaurant/orders/{order_id}", { params: [String(placed.order.id)], token: chef.access_token })).status).toBe(404);
    const again = await call("POST", "/me/food-orders/{order_id}/pay", { params: [String(placed.order.id)], token: customer.access_token });
    expect((again.body as { url: string }).url).not.toBe(placed.pay_url);
    const saved = (await store.getFoodOrder(app.id, placed.order.id))!;
    const paid = (await store.getCatalogOrder(app.id, saved.orderId!))!;
    expect(paid).toMatchObject({ totalCents: 172_00, lines: [{ productId: saved.id, name: `Abou Tarek: ${foodOrderReference(saved)}`, digital: true }] });
    await store.payCatalogOrder(app.id, paid.id, "pay-1", NOW);
    await deliverPaidOrder(store, app, paid, NOW);
    expect(await store.getFoodOrder(app.id, saved.id)).toMatchObject({ status: "placed", paymentStatus: "paid" });
    expect(await inbox(chef.user.id)).toEqual([["New order", "restaurant_order"]]);
    expect((await call("POST", "/me/food-orders/{order_id}/pay", { params: [String(saved.id)], token: customer.access_token })).status).toBe(409);
  });

  it("asks for a phone the courier can call when the account has none, and refuses a payment the company doesn't take", async () => {
    await store.saveDeliverySettings(app.id, { ...SETTINGS, cash: false }, NOW);
    const customer = await signUp("1001112222", "Karim Hassan");
    expect((await place(customer.access_token)).status).toBe(400);
    expect((await call("POST", "/food/orders", { query: { platform: "android" }, body: { ...cart(abou), payment: "cash" } })).status).toBe(401);
    await store.saveDeliverySettings(app.id, DEFAULT_DELIVERY_SETTINGS, NOW);
    expect(((await place(customer.access_token)).body as { code: string }).code).toBe("delivery_unavailable");
  });

  it("gives the store reviewers the first restaurant's desk with their own orders only, and keeps theirs from the real staff", async () => {
    app = { ...app, hostedSettings: { ...app.hostedSettings!, reviewPhone: "+201009990000", reviewCode: "424242" } };
    await store.updateApp(app.id, { hostedSettings: app.hostedSettings }, NOW);
    const chef = await staffOf(abou, "1007778888", "Chef Ali");
    const customer = await signUp("1001112222", "Karim Hassan");
    const real = ((await place(customer.access_token)).body as { order: { id: number } }).order.id;
    const reviewer = await signUp("1009990000", "Reviewer", "424242");
    expect(((await call("GET", "/me", { token: reviewer.access_token })).body as { roles: string[] }).roles).toEqual(["courier", "restaurant"]);
    const theirs = ((await place(reviewer.access_token)).body as { order: { id: number } }).order.id;
    // The real kitchen never hears of it; the reviewers do.
    expect(await inbox(chef.user.id)).toEqual([["New order", "restaurant_order"]]);
    expect((await inbox(reviewer.user.id)).filter(([, type]) => type === "restaurant_order")).toHaveLength(1);
    const chefNew = (await call("GET", "/restaurant/orders", { token: chef.access_token, query: { scope: "new" } })).body as { items: { id: number }[] };
    expect(chefNew.items.map((o) => o.id)).toEqual([real]);
    const reviewNew = (await call("GET", "/restaurant/orders", { token: reviewer.access_token, query: { scope: "new" } })).body as { items: { id: number }[] };
    expect(reviewNew.items.map((o) => o.id)).toEqual([theirs]);
    expect((await call("POST", "/restaurant/orders/{order_id}/accept", { params: [String(real)], token: reviewer.access_token, body: { prep_minutes: 10 } })).status).toBe(404);
    expect((await call("POST", "/restaurant/orders/{order_id}/accept", { params: [String(theirs)], token: chef.access_token, body: { prep_minutes: 10 } })).status).toBe(404);
    expect((await call("POST", "/restaurant/orders/{order_id}/accept", { params: [String(theirs)], token: reviewer.access_token, body: { prep_minutes: 10 } })).status).toBe(200);
    // Going busy is shown to the reviewers, never kept.
    expect((await call("PATCH", "/restaurant/me", { token: reviewer.access_token, body: { busy_minutes: 60 } })).body).toMatchObject({ accepting: false });
    expect((await store.getRestaurant(app.id, abou))!.busyUntil).toBeNull();
    expect((await call("GET", "/restaurant/me", { token: chef.access_token })).body).toMatchObject({ accepting: true, today: { orders: 1 } });
  });

  it("answers feature_disabled while food delivery isn't in the plan", async () => {
    food = false;
    const result = await call("GET", "/food/restaurants");
    expect([result.status, (result.body as { code: string }).code]).toEqual([403, "feature_disabled"]);
  });
});
