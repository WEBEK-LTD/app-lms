import { beforeEach, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { freeTimes, hoursLabel, readProfileForm } from "@/lib/admin/account-managers";
import { appAreas } from "@/lib/app/areas";
import { registerClient } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import { newApp } from "@/lib/app/setup";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogOrder, type Client, type FoodOrder, type MarketOrder, type Ride, type Shipment, type User } from "@/lib/data/types";
import type { sendPush, ServiceAccount } from "@/lib/hosted/push";
import type { OwnerDeps } from "@/lib/owner/http";
import { runPrimeChecks } from "@/lib/owner/prime-jobs";
import { pushLeaveRequested, pushNewComplaint, pushNewOrder, pushShipmentWaiting, type OwnerPushDeps } from "@/lib/owner/push";
import { announceOrder } from "@/lib/food/flow";
import { money } from "@/lib/owner/sales";
import { handleOwner } from "@/lib/owner/service";
import type { Plan } from "@/lib/plans";
import { APP_AREA_PERMISSION, PUSH_PERMISSION } from "@/lib/team/permissions";
import { OWNER_PUSH_KINDS } from "@/lib/data/types";
import { expectOwnerContract } from "./owner-contract";
import { KEY, NOW, days } from "./helpers";

/**
 * 125 Yallapp Business 1.0.2 on the server: the Studio apps' own tools
 * (food orders and restaurants, shipments and couriers, rides and drivers,
 * the marketplace, the school), the Orders and push fixes, Prime (insights,
 * smart alerts, the morning brief) and VIP (the account manager and calls),
 * each answer checked against docs/api/owner.yaml.
 */

const SECRET = "test-signing-secret-0123456789abcdef0123456789";
const PASSWORD = "a-long-owner-password";
const MIN = 60_000;
const ACCOUNT: ServiceAccount = { project_id: "yallapp-business", client_email: "push@yallapp-business.test", private_key: "-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----" };

interface Pushed {
  targets: unknown[];
  title: string;
  body: string;
  data: Record<string, string>;
}

async function ownerOf(store: MemoryStore, email: string): Promise<{ user: User; client: Client }> {
  const { user, client } = await registerClient(store, { name: "Leyla Kaya", email, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  await store.updateUser(user.id, { passwordHash: await hashPassword(PASSWORD) }, NOW);
  return { user: (await store.getUserById(user.id))!, client: (await store.getClientById(client.id))! };
}

async function addApp(store: MemoryStore, client: Client, app: Partial<App> & Pick<App, "appType">, plan: Plan): Promise<App> {
  const full: App = { ...newApp(client.id, null, NOW, app.appType, app.vertical ?? null), backend: "hosted", websiteDoneAt: NOW, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS }, ...app };
  await store.createApp(full);
  await activateClient(store, { clientId: client.id, appId: full.id, plan, activeUntil: days(30), paymentNote: "" }, KEY, NOW);
  return full;
}

const place = (address: string, lat: number | null = null, lng: number | null = null) => ({ address, details: null, lat, lng });

function foodOrder(app: App, restaurantId: number, patch: Partial<FoodOrder> = {}): Omit<FoodOrder, "id"> {
  return {
    appId: app.id,
    restaurantId,
    restaurantName: "Koshari Abou Tarek",
    userId: null,
    customerName: "Mona Hassan",
    customerPhone: "+201001112222",
    lines: [
      { dishId: 1, name: "Smash burger", quantity: 2, choices: ["Size: Large"], note: null, unitCents: 120_00 },
      { dishId: 2, name: "Fries", quantity: 1, choices: [], note: "Extra salt", unitCents: 40_00 },
    ],
    subtotalCents: 280_00,
    deliveryFeeCents: 20_00,
    totalCents: 300_00,
    commissionCents: 28_00,
    currency: "EGP",
    paymentMethod: "cash",
    paymentStatus: "unpaid",
    orderId: null,
    status: "placed",
    dropoff: place("12 Tahrir St, Dokki"),
    zoneId: null,
    distanceKm: 3.2,
    notes: "Ring twice",
    readyAt: null,
    rejection: null,
    shipmentId: null,
    rating: null,
    timeline: [{ status: "placed", at: NOW.toISOString(), by: "customer" }],
    lang: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}

function shipment(app: App, patch: Partial<Shipment> = {}): Omit<Shipment, "id"> {
  return {
    appId: app.id,
    userId: null,
    senderName: "Nile Books",
    senderPhone: "+201001112222",
    serviceId: null,
    serviceName: "Same day",
    pickup: place("5 Zamalek St, Cairo", 30.06, 31.22),
    dropoff: place("9 Maadi Rd, Cairo", 29.96, 31.25),
    zoneId: null,
    zoneName: null,
    distanceKm: 11,
    packageSize: "small",
    packageDescription: null,
    recipientName: "Omar Said",
    recipientPhone: "+201003334444",
    notes: "Fragile",
    priceCents: 60_00,
    currency: "EGP",
    paymentMethod: "cash",
    paymentStatus: "unpaid",
    orderId: null,
    status: "pending",
    courierId: null,
    courierName: null,
    timeline: [{ status: "pending", at: new Date(NOW.getTime() - 15 * MIN).toISOString(), by: "customer" }],
    lang: null,
    createdAt: new Date(NOW.getTime() - 15 * MIN),
    updatedAt: new Date(NOW.getTime() - 15 * MIN),
    ...patch,
  };
}

function ride(app: App, patch: Partial<Ride> = {}): Omit<Ride, "id"> {
  return {
    appId: app.id,
    userId: null,
    riderName: "Sara Adel",
    riderPhone: "+201001112222",
    vehicleTypeId: 1,
    vehicleTypeName: "Economy",
    vehicleTypeIcon: "directions_car",
    fares: { baseCents: 10_00, perKmCents: 5_00, perMinuteCents: 1_00, minCents: 20_00, waitPerMinuteCents: 1_00 },
    fareMode: "upfront",
    pickup: place("Tahrir Square, Downtown, Cairo", 30.044, 31.235),
    dropoff: place("Cairo Tower, Zamalek", 30.046, 31.224),
    scheduledAt: null,
    estimateKm: 2.5,
    estimateMinutes: 9,
    quotedCents: 45_00,
    promoCode: null,
    discountCents: 0,
    previousFeeCents: 0,
    previousFeeRideId: null,
    finalCents: null,
    meterKm: 0,
    rideMinutes: null,
    waitMinutes: null,
    commissionBp: null,
    commissionCents: null,
    currency: "EGP",
    paymentMethod: "cash",
    paymentStatus: "unpaid",
    orderId: null,
    status: "searching",
    pin: null,
    notes: null,
    driverId: null,
    driverName: null,
    offeredTo: null,
    offerExpiresAt: null,
    declinedBy: [],
    searchingSince: new Date(NOW.getTime() - 6 * MIN),
    cancellation: null,
    feeCarriedTo: null,
    shareToken: null,
    rating: null,
    timeline: [{ status: "searching", at: new Date(NOW.getTime() - 6 * MIN).toISOString(), by: "rider" }],
    lang: null,
    createdAt: new Date(NOW.getTime() - 6 * MIN),
    updatedAt: new Date(NOW.getTime() - 6 * MIN),
    ...patch,
  };
}

function marketOrder(app: App, vendorId: number, patch: Partial<MarketOrder> = {}): Omit<MarketOrder, "id"> {
  const total = 12_500;
  return {
    appId: app.id,
    vendorId,
    vendorName: "Fresh Market",
    vendorKind: "grocery",
    userId: null,
    customerName: "Huda Ali",
    customerPhone: "+96550001111",
    fulfilment: "delivery",
    deliveryBy: "app",
    scheduledFor: null,
    lines: [
      { id: 1, productId: 7, name: "Milk", imageUrl: null, quantity: 2, unit: "item", choices: [], note: null, unitPrice: 2_500, wasUnitPrice: null, total: 5_000, ifMissing: "remove", substituteProductId: null, outcome: null, pickedQuantity: null, substitute: null },
      { id: 2, productId: 8, name: "Bread", imageUrl: null, quantity: 1, unit: "item", choices: [], note: null, unitPrice: 7_500, wasUnitPrice: null, total: 7_500, ifMissing: "remove", substituteProductId: null, outcome: null, pickedQuantity: null, substitute: null },
    ],
    money: { lines: [{ kind: "total", amount: total }], itemsBefore: total, itemDiscounts: 0, items: total, coupon: null, club: 0, delivery: 0, deliveryDiscount: 0, tax: 0, tip: 0, total, wallet: 0, payNow: total, split: { commission: 0, vendorEarns: 0, ownerEarns: 0, collectedBy: "owner", dueToVendor: 0 } } as unknown as MarketOrder["money"],
    currency: "KWD",
    paymentMethod: "cash",
    paymentStatus: "unpaid",
    paymentRef: null,
    couponCode: null,
    status: "delivered",
    dropoff: place("Block 3, Salmiya"),
    distanceKm: 2,
    notes: null,
    pickupCode: null,
    prepMinutes: 15,
    readyAt: null,
    rejection: null,
    shipmentId: null,
    rating: null,
    timeline: [
      { status: "placed", at: NOW.toISOString(), by: "customer" },
      { status: "delivered", at: NOW.toISOString(), by: "courier" },
    ],
    completedAt: NOW,
    lang: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}

describe("125.2 areas, features and the bug fixes", () => {
  it("gives the Studio apps their own areas, and catalog orders only to the apps that have them", () => {
    const of = (kind: string, vertical: App["vertical"] = null) => appAreas({ connector: { kind } as App["connector"], backend: "hosted", vertical, catalogSettings: null } as unknown as App);
    expect(of("restaurants")).toMatchObject({ orders: false, foodOrders: true, restaurants: true, shipments: true, market: false, rides: false, school: false, prime: false });
    expect(of("restaurants", "marketplace")).toMatchObject({ orders: false, foodOrders: false, restaurants: false, shipments: true, market: true });
    expect(of("deliveries")).toMatchObject({ orders: false, shipments: true, foodOrders: false });
    expect(of("rides", "taxi")).toMatchObject({ orders: false, rides: true });
    expect(of("school")).toMatchObject({ orders: false, school: true });
    for (const kind of ["catalog", "courses", "bookings", "events"]) expect(of(kind).orders).toBe(true);
    // Every area has its team permission, and every push kind its default.
    expect(APP_AREA_PERMISSION).toMatchObject({ foodOrders: "orders", restaurants: "orders", shipments: "orders", rides: "orders", market: "orders", school: "settings", prime: "analytics" });
    for (const kind of OWNER_PUSH_KINDS) expect(PUSH_PERMISSION[kind]).toBeTruthy();
  });

  it("writes amounts with their currency's own decimals", () => {
    expect(money(12_500, "KWD")).toEqual({ amount_cents: 12_500, currency: "KWD", formatted: "KWD 12.500" });
    expect(money(1500, "JPY").formatted).toBe("JPY 1,500");
    expect(money(125_000, "TRY").formatted).toBe("₺1,250.00");
  });

  it("pushes no catalog order of an engine's payment link, and a school fee as a payment received", async () => {
    const store = new MemoryStore();
    const { user, client } = await ownerOf(store, "pay@school.test");
    const sent: Pushed[] = [];
    const send = (async (_a, targets, message) => {
      sent.push({ targets, ...message });
      return { sent: targets.length, invalidTokens: [] };
    }) as typeof sendPush;
    const deps: OwnerPushDeps = { store, now: NOW, account: ACCOUNT, send };
    await store.createOwnerDevice({
      id: "11111111-1111-4111-8111-111111111111", userId: user.id, clientId: client.id, name: "Pixel", platform: "android", appVersion: null, language: null, refreshHash: "x", refreshExpiresAt: days(60),
      sessionVersion: user.sessionVersion, pushToken: "token-1", pushProvider: "fcm", pushPreferences: null, createdAt: NOW, lastSeenAt: NOW,
    });
    const food = await addApp(store, client, { appType: "food", appName: "Koshari", connector: { kind: "restaurants" } }, "studio_1");
    const school = await addApp(store, client, { appType: "school", appName: "Nakhla School", connector: { kind: "school" } }, "studio_1");
    const order = { id: 42, totalCents: 1500_00, currency: "EGP", lines: [] } as unknown as CatalogOrder;
    expect(await pushNewOrder(deps, food, order)).toBe(0);
    expect(await pushNewOrder(deps, school, order)).toBe(1);
    expect(sent[0]).toMatchObject({ title: "School fee paid", body: "Nakhla School: E£1,500.00", data: { kind: "payment_received", app_id: school.id } });
    expect(sent[0]!.data.order_id).toBeUndefined();

    // The engines' own pushes carry the IDs Yallapp Business opens.
    sent.length = 0;
    const r = await store.createRestaurant(
      { appId: food.id, name: "Zooba", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: place("Zamalek"), phone: null, hours: [], prepMinutes: 20, minOrderCents: 0, maxKm: null, commissionBp: 1000, active: true, position: 1 },
      { sections: [], nextId: 1 },
      NOW,
    );
    const placed = await store.createFoodOrder(foodOrder(food, r.id));
    // A new order reaching the restaurant tells the company's phones (lib/food/flow.ts `announceOrder`).
    await announceOrder({ store, app: food, now: NOW, account: null, courierAccount: null, pushOwner: async (push) => void (await push(deps)) }, placed);
    const job = await store.createShipment(shipment(food, { foodOrderId: placed.id }));
    await pushShipmentWaiting(deps, food, job);
    const person = await store.createSchoolPerson({ appId: school.id, role: "teacher", name: "Heba Nabil", phone: "+201007770003", email: null, classId: null, code: null, photoAssetId: null, active: true }, NOW);
    if (!person.ok) throw new Error("teacher");
    const leave = await store.createSchoolLeave({ appId: school.id, personId: person.person.id, kind: "sick", startsOn: "2026-10-13", endsOn: "2026-10-14", note: null, file: null, status: "pending", answer: null, answeredBy: null, answeredAt: null, createdAt: NOW, updatedAt: NOW });
    await pushLeaveRequested(deps, school, leave, person.person);
    await pushNewComplaint(deps, food, { id: 5, reason: "late", text: "Forty minutes late" }, { id: 42 });
    expect(sent.map((s) => [s.data.kind, s.title, s.body])).toEqual([
      ["new_food_order", `New food order F-${1000 + placed.id}`, "Koshari Abou Tarek: E£300.00"],
      ["shipment_waiting", `S-${1000 + job.id} is waiting for a courier`, "5 Zamalek St, Cairo → 9 Maadi Rd, Cairo"],
      ["new_message", "Heba Nabil asked for leave", "2026-10-13 – 2026-10-14"],
      ["new_complaint", "New complaint on M-1042", "Late: Forty minutes late"],
    ]);
    expect(sent.map((s) => s.data.food_order_id ?? s.data.shipment_id ?? s.data.leave_id ?? s.data.complaint_id)).toEqual([String(placed.id), String(job.id), String(leave.id), "5"]);
  });
});

describe("125 the Owner API for the Studio apps, Prime and VIP", () => {
  let store: MemoryStore;
  let user: User;
  let client: Client;
  let food: App;
  let delivery: App;
  let rides: App;
  let market: App;
  let school: App;
  let shop: App;
  let now: Date;
  let pushes: Pushed[];
  let mails: { to: string; values: Record<string, string> }[];

  const send = (async (_account, targets, message) => {
    pushes.push({ targets, ...message });
    return { sent: targets.length, invalidTokens: [] };
  }) as typeof sendPush;

  function deps(): OwnerDeps {
    return {
      store,
      now,
      ip: "198.51.100.7",
      signingSecret: SECRET,
      encryptionKey: KEY,
      baseUrl: "https://yallapp.test",
      paymentUrls: {},
      media: null,
      mail: async () => undefined,
      staffMail: async (to, values) => {
        mails.push({ to, values });
      },
      sendPush: send,
    };
  }

  async function call(method: string, route: string, options: { params?: Record<string, string | number>; token?: string | null; body?: unknown; query?: Record<string, string>; lang?: string } = {}) {
    const path = route.replace(/\{(\w+)\}/g, (_, name: string) => String(options.params?.[name] ?? `{${name}}`));
    const result = await handleOwner(deps(), { method, path: path.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null, acceptLanguage: options.lang ?? null });
    expectOwnerContract(method, route, result);
    return result as { status: number; body: Record<string, unknown> & { [key: string]: never } };
  }

  async function signIn(email = "leyla@studio.test") {
    const result = await call("POST", "/auth/sign-in", { body: { email, password: PASSWORD, device: { name: "Pixel 8", platform: "android", app_version: "1.0.2" } } });
    expect(result.status).toBe(200);
    return (result.body as unknown as { access_token: string }).access_token;
  }

  async function staffMember(email: string, areas: string[]) {
    const member = await store.createUser({ email, name: "Kerem", passwordHash: await hashPassword(PASSWORD), now: NOW });
    await store.saveTeamMember({ clientId: client.id, userId: member.id, role: "staff", areas, appIds: null, addedBy: user.email, createdAt: NOW, updatedAt: NOW });
    return member;
  }

  beforeEach(async () => {
    store = new MemoryStore();
    now = NOW;
    pushes = [];
    mails = [];
    ({ user, client } = await ownerOf(store, "leyla@studio.test"));
    await activateClient(store, { clientId: client.id, plan: "studio_1", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    food = await addApp(store, client, { appType: "food", appName: "Koshari Now", connector: { kind: "restaurants" } }, "studio_1");
    delivery = await addApp(store, client, { appType: "delivery", appName: "Nile Couriers", connector: { kind: "deliveries" } }, "studio_1");
    rides = await addApp(store, client, { appType: "rides", vertical: "taxi", appName: "Cairo Cabs", connector: { kind: "rides" } }, "studio_1");
    market = await addApp(store, client, { appType: "food", vertical: "marketplace", appName: "Souq Kuwait", connector: { kind: "restaurants" } }, "studio_1");
    school = await addApp(store, client, { appType: "school", appName: "Nakhla School", connector: { kind: "school" } }, "studio_1");
    shop = await addApp(store, client, { appType: "store", appName: "Leyla Shop", connector: { kind: "catalog" } }, "business");
  });

  it("lists each app's tools in its features, Prime for Studio plans and VIP for plans with an account manager", async () => {
    const token = await signIn();
    const me = await call("GET", "/me", { token });
    const apps = me.body.apps as unknown as { id: string; type: string; vertical: string | null; features: Record<string, boolean> }[];
    const f = (app: App) => apps.find((a) => a.id === app.id)!;
    expect(f(food).features).toMatchObject({ orders: false, food_orders: true, restaurants: true, shipments: true, market: false, prime: true, vip: false });
    expect(f(food).type).toBe("food");
    expect(f(market).features).toMatchObject({ market: true, food_orders: false, shipments: true });
    expect(f(market).vertical).toBe("marketplace");
    expect(f(rides).features).toMatchObject({ rides: true, orders: false, prime: true });
    expect(f(school).features).toMatchObject({ school: true, orders: false });
    expect(f(shop).features).toMatchObject({ orders: true, prime: false, vip: true });
    // No manager chosen yet: none shown.
    expect(me.body.account_manager).toBeNull();
    // The Orders tab of an engine is not theirs any more.
    expect((await call("GET", "/apps/{app_id}/orders", { token, params: { app_id: food.id } })).body).toMatchObject({ code: "not_available" });
    // Prime is a Studio plan's, nothing to buy: a regular app answers not_available.
    expect((await call("GET", "/apps/{app_id}/prime/insights", { token, params: { app_id: shop.id } })).body).toMatchObject({ code: "not_available" });
  });

  it("lists food orders, accepts one with the dashboard's rules, and records who did it", async () => {
    const token = await signIn();
    const restaurant = await store.createRestaurant(
      { appId: food.id, name: "Koshari Abou Tarek", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: place("16 Maarouf St, Downtown"), phone: null, hours: [], prepMinutes: 20, minOrderCents: 0, maxKm: null, commissionBp: 1000, active: true, position: 1 },
      { sections: [], nextId: 1 },
      NOW,
    );
    const placed = await store.createFoodOrder(foodOrder(food, restaurant.id));
    await store.createFoodOrder(foodOrder(food, restaurant.id, { status: "delivered", paymentMethod: "card", paymentStatus: "paid", customerName: "Ali" }));
    const list = await call("GET", "/apps/{app_id}/food-orders", { token, params: { app_id: food.id }, query: { filter: "new" } });
    expect(list.status).toBe(200);
    expect(list.body.counts).toEqual({ new: 1, active: 1 });
    const [item] = list.body.items as unknown as Record<string, unknown>[];
    expect(item).toMatchObject({ id: placed.id, reference: `F-${1000 + placed.id}`, status: "placed", status_label: "Waiting for the restaurant", summary: "2 × Smash burger, 1 × Fries", item_count: 3, steps: ["accept", "reject", "cancel"] });
    expect(item!.total).toEqual({ amount_cents: 300_00, currency: "EGP", formatted: "E£300.00" });
    expect((await call("GET", "/apps/{app_id}/food-orders", { token, params: { app_id: food.id }, query: { filter: "all", q: "Ali" } })).body.total).toBe(1);
    expect((await call("GET", "/apps/{app_id}/food-orders", { token, params: { app_id: food.id }, query: { filter: "soon" } })).status).toBe(400);

    const detail = await call("GET", "/apps/{app_id}/food-orders/{food_order_id}", { token, params: { app_id: food.id, food_order_id: placed.id } });
    expect(detail.body).toMatchObject({ restaurant_address: "16 Maarouf St, Downtown", prep_choices: [10, 15, 20, 30, 45], refund_due: false, cash_to_collect: { amount_cents: 300_00 } });
    expect((detail.body.lines as unknown as { options: string[] }[])[1]!.options).toEqual(["Extra salt"]);

    const step = (body: unknown) => call("POST", "/apps/{app_id}/food-orders/{food_order_id}/step", { token, params: { app_id: food.id, food_order_id: placed.id }, body });
    expect((await step({ step: "accept", prep_minutes: 2 })).status).toBe(400);
    expect((await step({ step: "reject", reason: "nope" })).body).toMatchObject({ code: "invalid_request", errors: { reason: "Choose why it can't be taken." } });
    expect((await step({ step: "ready" })).body).toMatchObject({ code: "invalid_status" });
    const accepted = await step({ step: "accept", prep_minutes: 15 });
    expect(accepted.status).toBe(200);
    expect(accepted.body).toMatchObject({ status: "accepted", steps: ["ready", "cancel"], ready_at: new Date(NOW.getTime() + 15 * MIN).toISOString() });
    // The courier job was made (Delivery settings' default: once accepted).
    expect(accepted.body.shipment_id).toEqual(expect.any(Number));
    expect((await store.listTeamActivity(client.id, { limit: 5 })).items[0]).toMatchObject({ action: "food_order.accept", summary: `Moved food order F-${1000 + placed.id} to accepted` });
    // A second phone that saw it waiting.
    expect((await step({ step: "accept", prep_minutes: 15 })).body).toMatchObject({ code: "invalid_status" });

    // Staff without Orders & kitchen: asked to see the owner.
    await staffMember("kerem@studio.test", ["analytics"]);
    const staff = await signIn("kerem@studio.test");
    expect((await call("GET", "/apps/{app_id}/food-orders", { token: staff, params: { app_id: food.id } })).body).toMatchObject({ code: "not_allowed" });
    // The marketplace has no food orders of its own.
    expect((await call("GET", "/apps/{app_id}/food-orders", { token, params: { app_id: market.id } })).body).toMatchObject({ code: "not_available" });
  });

  it("opens a busy restaurant again and ends its delay", async () => {
    const token = await signIn();
    const r = await store.createRestaurant(
      { appId: food.id, name: "Zooba", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: place("Zamalek"), phone: null, hours: [], prepMinutes: 20, minOrderCents: 0, maxKm: null, commissionBp: 1000, active: true, position: 1 },
      { sections: [], nextId: 1 },
      NOW,
    );
    await store.updateRestaurant(food.id, r.id, { busyUntil: new Date(NOW.getTime() + 30 * MIN), delay: { minutes: 15, reason: "demand", note: null, until: null, by: "vendor", at: NOW } as never }, NOW);
    const list = await call("GET", "/apps/{app_id}/restaurants", { token, params: { app_id: food.id } });
    expect((list.body.items as unknown as Record<string, unknown>[])[0]).toMatchObject({ id: r.id, busy_until: new Date(NOW.getTime() + 30 * MIN).toISOString(), delayed: true, state_label: "Busy" });
    const opened = await call("POST", "/apps/{app_id}/restaurants/{restaurant_id}/open", { token, params: { app_id: food.id, restaurant_id: r.id } });
    expect(opened.body).toMatchObject({ busy_until: null });
    const ended = await call("POST", "/apps/{app_id}/restaurants/{restaurant_id}/end-delay", { token, params: { app_id: food.id, restaurant_id: r.id } });
    expect(ended.body).toMatchObject({ delayed: false });
  });

  it("gives a waiting shipment to a courier and moves it on; couriers on duty and nearest first", async () => {
    const token = await signIn();
    const s = await store.createShipment(shipment(delivery));
    const near = await store.createCourier({ appId: delivery.id, name: "Karim Adel", phone: "+201005550001", email: null, vehicle: "Scooter", active: true }, NOW);
    const far = await store.createCourier({ appId: delivery.id, name: "Ahmed Fathy", phone: "+201005550002", email: null, vehicle: "Bike", active: true }, NOW);
    const off = await store.createCourier({ appId: delivery.id, name: "Bassem", phone: "+201005550003", email: null, vehicle: null, active: true }, NOW);
    if (!near.ok || !far.ok || !off.ok) throw new Error("couriers");
    await store.updateCourier(delivery.id, near.courier.id, { onDuty: true, lat: 30.061, lng: 31.221, locatedAt: NOW }, NOW);
    await store.updateCourier(delivery.id, far.courier.id, { onDuty: true, lat: 30.2, lng: 31.4, locatedAt: NOW }, NOW);
    const couriers = await call("GET", "/apps/{app_id}/couriers", { token, params: { app_id: delivery.id }, query: { shipment_id: String(s.id) } });
    expect((couriers.body.items as unknown as { name: string; state: string; initials: string }[]).map((c) => [c.name, c.state, c.initials])).toEqual([
      ["Karim Adel", "free", "KA"],
      ["Ahmed Fathy", "free", "AF"],
      ["Bassem", "off", "B"],
    ]);

    const list = await call("GET", "/apps/{app_id}/shipments", { token, params: { app_id: delivery.id }, query: { filter: "waiting" } });
    expect(list.body.counts).toMatchObject({ on_duty: 2, waiting: 1 });
    expect((list.body.items as unknown as Record<string, unknown>[])[0]).toMatchObject({ reference: `S-${1000 + s.id}`, waiting_minutes: 15, assignable: true, statuses: ["cancelled"], collect: { amount_cents: 60_00 } });

    const assign = (body: unknown) => call("POST", "/apps/{app_id}/shipments/{shipment_id}/assign", { token, params: { app_id: delivery.id, shipment_id: s.id }, body });
    expect((await assign({ courier_id: 999 })).status).toBe(400);
    const given = await assign({ courier_id: near.courier.id });
    expect(given.body).toMatchObject({ status: "assigned", courier: { id: near.courier.id, name: "Karim Adel" }, recipient: { name: "Omar Said" }, note: "Fragile" });
    const move = (status: string) => call("POST", "/apps/{app_id}/shipments/{shipment_id}/move", { token, params: { app_id: delivery.id, shipment_id: s.id }, body: { status } });
    expect((await move("delivered")).body).toMatchObject({ code: "invalid_status" });
    expect((await move("picked_up")).body).toMatchObject({ status: "picked_up", statuses: ["on_the_way", "delivered", "failed"] });
    expect((await store.listTeamActivity(client.id, { limit: 5 })).items.map((a) => a.action)).toEqual(["shipment.move", "shipment.assign"]);
  });

  it("gives a ride to the nearest free driver of its type and cancels another", async () => {
    const token = await signIn();
    const r = await store.createRide(ride(rides));
    const driver = (name: string, phone: string, typeId: number) =>
      store.createCourier({ appId: rides.id, name, phone, email: null, vehicle: null, active: true, driver: { photoAssetId: null, vehicleTypeId: typeId, carModel: "Corolla", carColor: "White", plate: "ABC 123", commissionBp: null, documents: [], heading: null, ratingSum: 0, ratingCount: 0 } }, NOW);
    const same = await driver("Mahmoud Ali", "+201006660001", 1);
    const other = await driver("Youssef", "+201006660002", 2);
    if (!same.ok || !other.ok) throw new Error("drivers");
    await store.updateCourier(rides.id, same.courier.id, { onDuty: true, lat: 30.05, lng: 31.236, locatedAt: NOW }, NOW);
    await store.updateCourier(rides.id, other.courier.id, { onDuty: true, lat: 30.044, lng: 31.235, locatedAt: NOW }, NOW);
    const drivers = await call("GET", "/apps/{app_id}/drivers", { token, params: { app_id: rides.id }, query: { ride_id: String(r.id) } });
    const ranked = drivers.body.items as unknown as { name: string; same_type: boolean; state: string; vehicle: { plate: string } }[];
    // Of the ride's type first, though the other is nearer.
    expect(ranked.map((d) => [d.name, d.same_type, d.state])).toEqual([
      ["Mahmoud Ali", true, "free"],
      ["Youssef", false, "free"],
    ]);
    expect(ranked[0]!.vehicle).toEqual({ plate: "ABC 123", model: "White Corolla", type: null });

    const list = await call("GET", "/apps/{app_id}/rides", { token, params: { app_id: rides.id } });
    expect((list.body.items as unknown as Record<string, unknown>[])[0]).toMatchObject({ reference: `R-${2000 + r.id}`, searching_minutes: 6, givable: true, cancellable: true, pickup: { name: "Tahrir Square", address: "Tahrir Square, Downtown, Cairo" } });
    const given = await call("POST", "/apps/{app_id}/rides/{ride_id}/assign", { token, params: { app_id: rides.id, ride_id: r.id }, body: { driver_id: same.courier.id } });
    expect(given.body).toMatchObject({ status: "accepted", driver: { name: "Mahmoud Ali", plate: "ABC 123", vehicle: "White Corolla" } });
    // On a ride now: not given another.
    const second = await store.createRide(ride(rides));
    expect((await call("POST", "/apps/{app_id}/rides/{ride_id}/assign", { token, params: { app_id: rides.id, ride_id: second.id }, body: { driver_id: same.courier.id } })).body).toMatchObject({ errors: { driver_id: "This driver is on another ride." } });
    const cancelled = await call("POST", "/apps/{app_id}/rides/{ride_id}/cancel", { token, params: { app_id: rides.id, ride_id: second.id }, body: { note: "Duplicate" } });
    expect(cancelled.body).toMatchObject({ status: "cancelled", cancellable: false });
    expect((await call("POST", "/apps/{app_id}/rides/{ride_id}/cancel", { token, params: { app_id: rides.id, ride_id: second.id } })).body).toMatchObject({ code: "invalid_status" });
  });

  it("reads the marketplace's orders and works its complaint queue with the dashboard's decisions", async () => {
    const token = await signIn();
    const vendor = await store.createRestaurant(
      { appId: market.id, name: "Fresh Market", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: place("Salmiya"), phone: null, hours: [], prepMinutes: 15, minOrderCents: 0, maxKm: null, commissionBp: 1000, active: true, position: 1, kind: "grocery" },
      { sections: [], nextId: 1 },
      NOW,
    );
    const customer = (await store.createHostedUser({ appId: market.id, phone: "+96550001111", name: "Huda", email: null, city: null, now: NOW }))!;
    const o = await store.createMarketOrder(marketOrder(market, vendor.id, { userId: customer.id }));
    const orders = await call("GET", "/apps/{app_id}/market/orders", { token, params: { app_id: market.id }, query: { filter: "done" } });
    expect((orders.body.items as unknown as Record<string, unknown>[])[0]).toMatchObject({ reference: `M-${1000 + o.id}`, vendor: { id: vendor.id, kind: "grocery" }, total: { amount_cents: 12_500, currency: "KWD", formatted: "KWD 12.500" }, summary: "2 × Milk, 1 × Bread" });
    expect((await call("GET", "/apps/{app_id}/market/orders/{market_order_id}", { token, params: { app_id: market.id, market_order_id: o.id } })).body).toMatchObject({ lines: [{ name: "Milk" }, { name: "Bread" }] });

    const c = await store.createMarketComplaint({
      appId: market.id, orderId: o.id, vendorId: vendor.id, userId: customer.id, reason: "missing_items", text: "The bread wasn't in the bag.", lineIds: [2], photoAssetIds: [], status: "open", assignee: null,
      sharedWithVendor: false, messages: [], notes: [], decision: null, answeredAt: null, createdAt: new Date(NOW.getTime() - 30 * MIN), updatedAt: NOW,
    });
    const queue = await call("GET", "/apps/{app_id}/market/complaints", { token, params: { app_id: market.id } });
    expect(queue.body.counts).toEqual({ waiting: 1 });
    expect((queue.body.items as unknown as Record<string, unknown>[])[0]).toMatchObject({ id: c.id, waiting_for: "you", subject: "Missing items", refund_suggested: { amount_cents: 7_500, formatted: "KWD 7.500" } });
    const detail = await call("GET", "/apps/{app_id}/market/complaints/{complaint_id}", { token, params: { app_id: market.id, complaint_id: c.id } });
    // Paid in cash: never back to the payment.
    expect((detail.body.decisions as unknown as { decision: string; to: string[] }[]).map((d) => [d.decision, d.to])).toEqual([
      ["refund", ["wallet", "coupon"]],
      ["partial_refund", ["wallet", "coupon"]],
      ["compensation", ["wallet", "coupon"]],
      ["no_refund", []],
    ]);
    const replied = await call("POST", "/apps/{app_id}/market/complaints/{complaint_id}/reply", { token, params: { app_id: market.id, complaint_id: c.id }, body: { text: "We're sorry. Checking now." } });
    expect(replied.body).toMatchObject({ waiting_for: "customer", status: "waiting_for_customer", messages: [{ from: "support", text: "We're sorry. Checking now." }] });
    expect((await call("GET", "/apps/{app_id}/market/complaints", { token, params: { app_id: market.id }, query: { queue: "vendor" } })).body.total).toBe(1);
    const decide = (body: unknown) => call("POST", "/apps/{app_id}/market/complaints/{complaint_id}/decide", { token, params: { app_id: market.id, complaint_id: c.id }, body });
    expect((await decide({ decision: "no_refund" })).body).toMatchObject({ code: "invalid_request", errors: { note: "Tell the customer why." } });
    expect((await decide({ decision: "partial_refund", amount_cents: 99_999, to: "wallet" })).body).toMatchObject({ errors: { amount_cents: "That's more than is left to give back on this order." } });
    const decided = await decide({ decision: "partial_refund", amount_cents: 7_500, to: "wallet", funder: "vendor" });
    expect(decided.body).toMatchObject({ status: "resolved", decisions: [], decision: { decision: "partial_refund", amount: { amount_cents: 7_500 }, to: "wallet" } });
    expect((await decide({ decision: "refund" })).body).toMatchObject({ code: "invalid_status" });
    expect((await call("GET", "/apps/{app_id}/market/vendors", { token, params: { app_id: market.id } })).body.items).toMatchObject([{ id: vendor.id, kind: "grocery", orders_today: 1 }]);
  });

  it("answers a school's excuses, reports and leave, and sums up its day", async () => {
    const token = await signIn();
    const person = async (role: "student" | "parent" | "teacher" | "staff", name: string, phone: string) => {
      const made = await store.createSchoolPerson({ appId: school.id, role, name, phone, email: null, classId: null, code: null, photoAssetId: null, active: true }, NOW);
      if (!made.ok) throw new Error(name);
      return made.person;
    };
    const omar = await person("student", "Omar Said", "+201007770001");
    const mona = await person("parent", "Mona Said", "+201007770002");
    const heba = await person("teacher", "Heba Nabil", "+201007770003");
    const excuse = await store.createSchoolExcuse({ appId: school.id, studentId: omar.id, parentId: mona.id, startsOn: "2026-10-12", endsOn: "2026-10-12", reason: "A fever\nThe doctor said rest.", file: null, status: "pending", answer: null, answeredBy: null, answeredAt: null, createdAt: NOW, updatedAt: NOW });
    const report = await store.createSchoolReport({
      appId: school.id, kind: "student", templateId: null, templateName: "Weekly progress", fields: [{ id: "f1", label: "Reading", type: "rating", options: [], required: true }], answers: { f1: 4 }, teacherId: heba.id, teacherName: "Heba Nabil",
      studentId: omar.id, classId: null, subjectId: null, periodFrom: null, periodTo: null, status: "sent", comments: [], sentAt: NOW, readAt: null, reviewedAt: null, sharedAt: null, createdAt: NOW, updatedAt: NOW,
    });
    const leave = await store.createSchoolLeave({ appId: school.id, personId: heba.id, kind: "sick", startsOn: "2026-10-13", endsOn: "2026-10-14", note: "Flu", file: null, status: "pending", answer: null, answeredBy: null, answeredAt: null, createdAt: NOW, updatedAt: NOW });

    const today = await call("GET", "/apps/{app_id}/school/today", { token, params: { app_id: school.id } });
    expect(today.body).toMatchObject({ needs: { excuses: 1, reports: 1, leave: 1 }, buses: { running: 0, late: [] }, fees: { count: 0 } });

    const excuses = await call("GET", "/apps/{app_id}/school/excuses", { token, params: { app_id: school.id } });
    expect((excuses.body.items as unknown as Record<string, unknown>[])[0]).toMatchObject({ id: excuse.id, student: { name: "Omar Said" }, reason_label: "A fever", sent_by: { name: "Mona Said", relation: null }, status_label: "Waiting" });
    const answer = (body: unknown) => call("POST", "/apps/{app_id}/school/excuses/{excuse_id}/answer", { token, params: { app_id: school.id, excuse_id: excuse.id }, body });
    expect((await answer({ answer: "declined" })).body).toMatchObject({ errors: { note: "Write why it is declined." } });
    expect((await answer({ answer: "accepted" })).body).toMatchObject({ status: "accepted" });
    expect((await answer({ answer: "accepted" })).body).toMatchObject({ code: "changed" });

    const reports = await call("GET", "/apps/{app_id}/school/reports", { token, params: { app_id: school.id } });
    expect((reports.body.items as unknown as Record<string, unknown>[])[0]).toMatchObject({ id: report.id, unread: true, about_label: "Omar Said", teacher: { name: "Heba Nabil" } });
    const opened = await call("GET", "/apps/{app_id}/school/reports/{school_report_id}", { token, params: { app_id: school.id, school_report_id: report.id } });
    expect(opened.body).toMatchObject({ unread: false, reviewable: true, fields: [{ label: "Reading", value: "4/5" }] });
    expect((await call("POST", "/apps/{app_id}/school/reports/{school_report_id}/review", { token, params: { app_id: school.id, school_report_id: report.id }, body: { action: "return" } })).status).toBe(400);
    expect((await call("POST", "/apps/{app_id}/school/reports/{school_report_id}/review", { token, params: { app_id: school.id, school_report_id: report.id }, body: { action: "approve" } })).body).toMatchObject({ status: "approved", reviewable: false });

    const leaves = await call("GET", "/apps/{app_id}/school/leave", { token, params: { app_id: school.id } });
    expect((leaves.body.items as unknown as Record<string, unknown>[])[0]).toMatchObject({ id: leave.id, person: { name: "Heba Nabil", role: "teacher" }, days: 2, kind_label: "Sick leave" });
    expect((await call("POST", "/apps/{app_id}/school/leave/{leave_id}/answer", { token, params: { app_id: school.id, leave_id: leave.id }, body: { answer: "approved" } })).body).toMatchObject({ status: "approved" });
    expect((await store.listTeamActivity(client.id, { limit: 5 })).items.map((a) => a.action)).toEqual(["school.leave", "school.report", "school.excuse"]);
    // A manager's role is enough; Staff can't, it's the school's settings.
    await staffMember("kerem@studio.test", ["orders", "analytics"]);
    expect((await call("GET", "/apps/{app_id}/school/today", { token: await signIn("kerem@studio.test"), params: { app_id: school.id } })).body).toMatchObject({ code: "not_allowed" });
  });

  it("counts the engines' own orders today, lists what waits, and compares a Prime app with last week", async () => {
    const token = await signIn();
    const r = await store.createRestaurant(
      { appId: food.id, name: "Zooba", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: place("Zamalek"), phone: null, hours: [], prepMinutes: 20, minOrderCents: 0, maxKm: null, commissionBp: 1000, active: true, position: 1 },
      { sections: [], nextId: 1 },
      NOW,
    );
    const early = new Date(NOW.getTime() - 60 * MIN);
    await store.createFoodOrder(foodOrder(food, r.id, { createdAt: early }));
    await store.createFoodOrder(foodOrder(food, r.id, { status: "delivered", createdAt: early }));
    await store.createFoodOrder(foodOrder(food, r.id, { status: "rejected", createdAt: early }));
    // Last week, same weekday, before this time: one order of 150.
    await store.createFoodOrder(foodOrder(food, r.id, { status: "delivered", totalCents: 150_00, createdAt: days(-7, early) }));
    const today = await call("GET", "/apps/{app_id}/today", { token, params: { app_id: food.id } });
    expect(today.body.sales).toEqual([{ amount_cents: 600_00, currency: "EGP", formatted: "E£600.00" }]);
    expect(today.body.counts).toMatchObject({ food_orders: 2, orders: 2 });
    expect(today.body.needs_you).toEqual([{ kind: "food_orders_new", count: 1, title: "1 new food order", notice_id: null }]);
    expect(today.body.compare).toEqual({ sales_change_pct: 300, orders_change_pct: 100, label: "vs last Monday" });
    // Arabic needs-you lines.
    const ar = await call("GET", "/apps/{app_id}/today", { token, params: { app_id: food.id }, lang: "ar" });
    expect((ar.body.needs_you as unknown as { title: string }[])[0]!.title).toBe("طلب طعام جديد واحد");
    // A regular app has no comparison.
    expect((await call("GET", "/apps/{app_id}/today", { token, params: { app_id: shop.id } })).body.compare).toBeUndefined();
    // The ride company: searching rides.
    await store.createRide(ride(rides));
    expect((await call("GET", "/apps/{app_id}/today", { token, params: { app_id: rides.id } })).body.needs_you).toMatchObject([{ kind: "rides_searching", count: 1 }]);
  });

  it("computes Prime's insights from the app's own orders, and nothing where there are none", async () => {
    const token = await signIn();
    const r = await store.createRestaurant(
      { appId: food.id, name: "Zooba", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: place("Zamalek"), phone: null, hours: [], prepMinutes: 20, minOrderCents: 0, maxKm: null, commissionBp: 1000, active: true, position: 1 },
      { sections: [], nextId: 1 },
      NOW,
    );
    const empty = await call("GET", "/apps/{app_id}/prime/insights", { token, params: { app_id: food.id } });
    expect(empty.body).toMatchObject({ period: "week", sales: { change_pct: null }, orders: { now: 0, before: 0, change_pct: null }, returning: { pct: null, change_pts: null }, average_order: { now: null, before: null }, best: [] });
    expect((empty.body.days as unknown as unknown[]).length).toBe(7);
    expect((empty.body.peak as unknown as { busiest_label: string | null }).busiest_label).toBeNull();
    // Mona ordered last week and again this week (13:00 in Cairo).
    const at = new Date("2026-10-12T10:00:00Z");
    await store.createFoodOrder(foodOrder(food, r.id, { status: "delivered", userId: 7, createdAt: days(-8, at) }));
    await store.createFoodOrder(foodOrder(food, r.id, { status: "delivered", userId: 7, createdAt: at }));
    await store.createFoodOrder(foodOrder(food, r.id, { status: "delivered", userId: 8, createdAt: at, totalCents: 100_00 }));
    const week = await call("GET", "/apps/{app_id}/prime/insights", { token, params: { app_id: food.id } });
    expect(week.body).toMatchObject({ sales: { now: { amount_cents: 400_00 }, before: { amount_cents: 300_00 }, change_pct: 33.3 }, orders: { now: 2, before: 1 }, returning: { pct: 50 }, best: [{ name: "Koshari Abou Tarek", total: { amount_cents: 400_00 } }] });
    expect((week.body.peak as unknown as { busiest_label: string }).busiest_label).toBe("Mondays, 12:00–14:00");
    expect((await call("GET", "/apps/{app_id}/prime/insights", { token, params: { app_id: food.id }, query: { period: "month" } })).body.days).toHaveLength(30);
    expect((await call("GET", "/apps/{app_id}/prime/insights", { token, params: { app_id: food.id }, query: { period: "year" } })).status).toBe(400);
  });

  it("saves each person's smart alerts, and the frequent job pushes each once and the brief at its time", async () => {
    const token = await signIn();
    const got = await call("GET", "/apps/{app_id}/prime/alerts", { token, params: { app_id: food.id } });
    expect((got.body.items as unknown as { kind: string; on: boolean }[]).map((a) => [a.kind, a.on])).toEqual([
      ["order_waiting", false],
      ["shipment_unassigned", false],
      ["sales_low", false],
      ["low_rating", false],
    ]);
    expect(got.body.morning_brief).toEqual({ on: false, time: "08:30" });
    const put = (body: unknown) => call("PUT", "/apps/{app_id}/prime/alerts", { token, params: { app_id: food.id }, body });
    expect((await put({ items: [{ kind: "ride_no_driver", on: true }] })).status).toBe(400);
    expect((await put({ items: [{ kind: "order_waiting", minutes: 0 }] })).status).toBe(400);
    expect((await put({ morning_brief: { time: "8:30" } })).status).toBe(400);
    const saved = await put({ items: [{ kind: "order_waiting", on: true, minutes: 5 }], morning_brief: { on: true, time: "08:30" } });
    expect((saved.body.items as unknown as { kind: string; on: boolean }[])[0]).toEqual({ kind: "order_waiting", on: true, minutes: 5, amount_cents: null, by_time: null, stars: null });

    // The owner's phone.
    const device = (await store.listOwnerDevices(user.id))[0]!;
    await store.updateOwnerDevice(device.id, { pushToken: "token-owner" });
    const r = await store.createRestaurant(
      { appId: food.id, name: "Zooba", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: place("Zamalek"), phone: null, hours: [], prepMinutes: 20, minOrderCents: 0, maxKm: null, commissionBp: 1000, active: true, position: 1 },
      { sections: [], nextId: 1 },
      NOW,
    );
    const o = await store.createFoodOrder(foodOrder(food, r.id, { createdAt: new Date(NOW.getTime() - 7 * MIN), timeline: [{ status: "placed", at: new Date(NOW.getTime() - 7 * MIN).toISOString(), by: "customer" }] }));
    // Yesterday's sale, for the brief.
    await store.createFoodOrder(foodOrder(food, r.id, { status: "delivered", createdAt: days(-1, new Date("2026-10-11T17:30:00Z")) }));
    const run = async (at: Date) => runPrimeChecks({ store, now: at, account: ACCOUNT, send });
    // 13:00 in Cairo: the brief's time (08:30) passed more than 3 hours ago, so only the alert.
    expect(await run(NOW)).toEqual({ people: 1, alerts: 1, briefs: 0 });
    expect(pushes.map((p) => [p.title, p.data.kind, p.data.alert, p.data.food_order_id])).toEqual([[`F-${1000 + o.id} has waited 7 min`, "prime_alert", "order_waiting", String(o.id)]]);
    // Once a day for each order.
    expect(await run(new Date(NOW.getTime() + 5 * MIN))).toEqual({ people: 1, alerts: 0, briefs: 0 });
    // The next morning at 08:35 in Cairo: the brief, once.
    pushes = [];
    const morning = new Date("2026-10-13T05:35:00Z");
    expect((await run(morning)).briefs).toBe(1);
    expect((await run(new Date(morning.getTime() + 5 * MIN))).briefs).toBe(0);
    const brief = pushes.find((p) => p.data.kind === "morning_brief")!;
    expect(brief).toMatchObject({ title: "Your morning brief", data: { alert: "morning_brief", app_id: food.id } });
    expect(brief.body).toContain("Yesterday: E£");
    // Only the person whose alerts they are.
    expect(brief.targets).toHaveLength(1);
  });

  it("shows the account manager Yallapp chose to a VIP business, and takes a call at a free time", async () => {
    const managerUser = await store.createUser({ email: "selin@webek.test", name: "Selin Aydın", passwordHash: null, now: NOW });
    await store.saveStaffProfile({ userId: managerUser.id, photo: "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f.jpg", whatsapp: "+905321112233", phone: "+902121112233", hours: { days: [1, 2, 3, 4, 7], from: "10:00", to: "12:00", timezone: "Europe/Istanbul" }, accountManager: true, updatedBy: "admin@webek.test", updatedAt: NOW });
    await store.updateClient(client.id, { accountManagerId: managerUser.id }, NOW);
    const token = await signIn();
    const me = await call("GET", "/me", { token });
    expect(me.body.account_manager).toEqual({
      name: "Selin Aydın",
      photo_url: "https://yallapp.test/api/staff/photo/3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f.jpg",
      whatsapp_url: "https://wa.me/905321112233",
      phone: "+902121112233",
      hours_label: "Sun–Thu, 10:00–12:00",
    });
    expect((me.body.business as unknown as { account_manager: unknown }).account_manager).toEqual(me.body.account_manager);
    // 13:00 in Istanbul on Monday: today's times are over; Tuesday is the first day.
    const slots = await call("GET", "/me/account-manager/slots", { token });
    const daysOf = slots.body.days as unknown as { date: string; times: string[] }[];
    expect(daysOf.map((d) => d.date)).toEqual(["2026-10-13", "2026-10-14", "2026-10-15", "2026-10-18", "2026-10-19"]);
    expect(daysOf[0]!.times).toEqual(["10:00", "10:30", "11:00", "11:30"]);
    const ask = (body: unknown) => call("POST", "/me/account-manager/calls", { token, body });
    expect((await ask({ date: "2026-10-13", time: "09:00" })).status).toBe(400);
    const made = await ask({ date: "2026-10-13", time: "10:30", note: "Our new menu" });
    expect(made).toMatchObject({ status: 201, body: { date: "2026-10-13", time: "10:30", status: "requested" } });
    expect(mails).toMatchObject([{ to: "selin@webek.test", values: { business: expect.any(String), date: "2026-10-13", time: "10:30", note: "Our new menu" } }]);
    // Taken now.
    expect(((await call("GET", "/me/account-manager/slots", { token })).body.days as unknown as { times: string[] }[])[0]!.times).toEqual(["10:00", "11:00", "11:30"]);
    expect((await ask({ date: "2026-10-13", time: "10:30" })).status).toBe(400);
    // The business on a plan without a manager sees none.
    await store.updateClient(client.id, { accountManagerId: null }, NOW);
    expect((await call("GET", "/me/account-manager/slots", { token })).body).toMatchObject({ code: "not_available" });
  });
});

describe("125.9 account managers' hours and free times", () => {
  it("reads the contact card from Admin › Team", () => {
    expect(readProfileForm({ whatsapp: "+90 532 111 22 33", phone: "", days: ["7", "1", "2"], from: "10:00", to: "18:00", timezone: "Europe/Istanbul", accountManager: "on" })).toEqual({
      ok: true,
      value: { whatsapp: "+905321112233", phone: null, hours: { days: [1, 2, 7], from: "10:00", to: "18:00", timezone: "Europe/Istanbul" }, accountManager: true },
    });
    expect(readProfileForm({ accountManager: "on" })).toMatchObject({ ok: false, errors: { hours: "An account manager needs their working hours, for clients' calls." } });
    expect(readProfileForm({ days: "1", from: "18:00", to: "10:00" })).toMatchObject({ ok: false });
    expect(readProfileForm({ whatsapp: "12" })).toMatchObject({ ok: false, errors: { whatsapp: expect.any(String) } });
  });

  it("writes the days in runs, in each language", () => {
    const hours = { days: [7, 1, 2, 3, 4], from: "10:00", to: "18:00", timezone: "Europe/Istanbul" };
    expect(hoursLabel(hours, "en")).toBe("Sun–Thu, 10:00–18:00");
    expect(hoursLabel({ ...hours, days: [1, 3] }, "en")).toBe("Mon, Wed, 10:00–18:00");
    expect(hoursLabel(hours, "tr")).toBe("Paz–Per, 10:00–18:00");
    expect(hoursLabel(null, "en")).toBeNull();
  });

  it("offers the next five working days in 30-minute steps, without taken or past times", () => {
    const hours = { days: [1, 2, 3, 4, 5], from: "09:00", to: "10:30", timezone: "UTC" };
    const free = freeTimes(hours, [{ date: "2026-10-13", time: "09:30", status: "requested" }, { date: "2026-10-13", time: "10:00", status: "cancelled" }], new Date("2026-10-12T08:45:00Z"), "en");
    expect(free.map((d) => [d.date, d.times])).toEqual([
      ["2026-10-12", ["10:00"]],
      ["2026-10-13", ["09:00", "10:00"]],
      ["2026-10-14", ["09:00", "09:30", "10:00"]],
      ["2026-10-15", ["09:00", "09:30", "10:00"]],
      ["2026-10-16", ["09:00", "09:30", "10:00"]],
    ]);
    expect(free[0]!.label).toBe("Mon 12 Oct");
  });
});
