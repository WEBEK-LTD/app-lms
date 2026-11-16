import { beforeEach, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import { newApp } from "@/lib/app/setup";
import { DEFAULT_FULFILMENT } from "@/lib/catalog/fulfilment";
import { sha256Hex } from "@/lib/crypto/tokens";
import { MemoryStore } from "@/lib/data/memory";
import {
  DEFAULT_CATALOG_SETTINGS,
  type App,
  type CatalogOrder,
  type Client,
  type FoodOrder,
  type MarketOrder,
  type Ride,
  type Shipment,
  type User,
} from "@/lib/data/types";
import type { OwnerDeps } from "@/lib/owner/http";
import { handleOwner } from "@/lib/owner/service";
import type { Plan } from "@/lib/plans";
import { expectOwnerContract } from "./owner-contract";
import { KEY, NOW, days } from "./helpers";

/**
 * 132 The orders of every kind of app in Yallapp Business, as the owner
 * asked ("it shows there's an order, but not who ordered, nor the
 * recipient, nor where it goes"): a store's order with who ordered (the
 * payment page's details, else the gift's sender, else the app's account),
 * where it goes, the day and slot, the card, the lines with their options
 * and add-ons, the flash sale, the coupon and the fees; a food order's and
 * a marketplace order's customer and pin; a shipment's sender and package;
 * a ride's rider. Each answer checked against docs/api/owner.yaml, and
 * another owner's order refused.
 */

const SECRET = "test-signing-secret-0123456789abcdef0123456789";
const PASSWORD = "a-long-owner-password";
const place = (
  address: string,
  lat: number | null = null,
  lng: number | null = null,
  details: string | null = null,
) => ({ address, details, lat, lng });

async function ownerOf(
  store: MemoryStore,
  email: string,
): Promise<{ user: User; client: Client }> {
  const { user, client } = await registerClient(
    store,
    {
      name: "Leyla Kaya",
      email,
      whatsapp: "+905446731942",
      siteUrl: "",
      password: null,
    },
    NOW,
  );
  await store.updateUser(
    user.id,
    { passwordHash: await hashPassword(PASSWORD) },
    NOW,
  );
  return {
    user: (await store.getUserById(user.id))!,
    client: (await store.getClientById(client.id))!,
  };
}

async function addApp(
  store: MemoryStore,
  client: Client,
  app: Partial<App> & Pick<App, "appType">,
  plan: Plan,
): Promise<App> {
  const full: App = {
    ...newApp(client.id, null, NOW, app.appType, app.vertical ?? null),
    backend: "hosted",
    websiteDoneAt: NOW,
    catalogSettings: { ...DEFAULT_CATALOG_SETTINGS },
    ...app,
  };
  await store.createApp(full);
  await activateClient(
    store,
    {
      clientId: client.id,
      appId: full.id,
      plan,
      activeUntil: days(30),
      paymentNote: "",
    },
    KEY,
    NOW,
  );
  return full;
}

/** A paid order as the store's checkout saves it (lib/hosted/connectors/catalog.ts). */
async function paid(
  store: MemoryStore,
  app: App,
  patch: Partial<CatalogOrder>,
): Promise<CatalogOrder> {
  const order = await store.createCatalogOrder({
    appId: app.id,
    tokenHash: sha256Hex(`order-${Math.random()}`),
    userId: null,
    status: "pending",
    lines: [],
    subtotalCents: 0,
    shippingCents: 0,
    totalCents: 0,
    currency: "EGP",
    customer: null,
    paymentId: null,
    createdAt: NOW,
    paidAt: null,
    updatedAt: NOW,
    commissionCents: null,
    itemTransactionIds: null,
    payoutApprovedAt: null,
    ...patch,
  } as Omit<CatalogOrder, "id">);
  await store.payCatalogOrder(app.id, order.id, "demo", NOW);
  return (await store.getCatalogOrder(app.id, order.id))!;
}

describe("132 every kind's orders in Yallapp Business", () => {
  let store: MemoryStore;
  let client: Client;
  let flowers: App;
  let cafe: App;
  let food: App;
  let market: App;
  let delivery: App;
  let rides: App;
  let theirs: App;

  function deps(): OwnerDeps {
    return {
      store,
      now: NOW,
      ip: "198.51.100.7",
      signingSecret: SECRET,
      encryptionKey: KEY,
      baseUrl: "https://yallapp.test",
      paymentUrls: {},
      media: null,
      mail: async () => undefined,
    };
  }

  async function call(
    method: string,
    route: string,
    options: {
      params?: Record<string, string | number>;
      token?: string | null;
      body?: unknown;
      query?: Record<string, string>;
      lang?: string;
    } = {},
  ) {
    const path = route.replace(/\{(\w+)\}/g, (_, name: string) =>
      String(options.params?.[name] ?? `{${name}}`),
    );
    const result = await handleOwner(deps(), {
      method,
      path: path.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
      acceptLanguage: options.lang ?? null,
    });
    expectOwnerContract(method, route, result);
    return result as {
      status: number;
      body: Record<string, unknown> & { [key: string]: never };
    };
  }

  async function signIn(email = "leyla@studio.test") {
    const result = await call("POST", "/auth/sign-in", {
      body: {
        email,
        password: PASSWORD,
        device: { name: "Pixel 8", platform: "android", app_version: "1.0.3" },
      },
    });
    expect(result.status).toBe(200);
    return (result.body as unknown as { access_token: string }).access_token;
  }

  beforeEach(async () => {
    store = new MemoryStore();
    ({ client } = await ownerOf(store, "leyla@studio.test"));
    await activateClient(
      store,
      {
        clientId: client.id,
        plan: "studio_1",
        activeUntil: days(30),
        paymentNote: "",
      },
      KEY,
      NOW,
    );
    // A Studio store (Leqaa's kind: the store engine with the gift checkout) and a café with its kitchen.
    flowers = await addApp(
      store,
      client,
      {
        appType: "store",
        appName: "Leqaa",
        section: "studio",
        connector: { kind: "catalog" },
      },
      "studio_1",
    );
    cafe = await addApp(
      store,
      client,
      {
        appType: "store",
        vertical: "restaurant",
        appName: "Moda Café",
        connector: { kind: "catalog" },
        catalogSettings: {
          ...DEFAULT_CATALOG_SETTINGS,
          fulfilment: DEFAULT_FULFILMENT,
        },
      },
      "business",
    );
    food = await addApp(
      store,
      client,
      {
        appType: "food",
        appName: "Koshari Now",
        connector: { kind: "restaurants" },
      },
      "studio_1",
    );
    market = await addApp(
      store,
      client,
      {
        appType: "food",
        vertical: "marketplace",
        appName: "Souq Kuwait",
        connector: { kind: "restaurants" },
      },
      "studio_1",
    );
    delivery = await addApp(
      store,
      client,
      {
        appType: "delivery",
        appName: "Nile Couriers",
        connector: { kind: "deliveries" },
      },
      "studio_1",
    );
    rides = await addApp(
      store,
      client,
      {
        appType: "rides",
        vertical: "taxi",
        appName: "Cairo Cabs",
        connector: { kind: "rides" },
      },
      "studio_1",
    );
    const other = await ownerOf(store, "someone@else.test");
    await activateClient(
      store,
      {
        clientId: other.client.id,
        plan: "studio_1",
        activeUntil: days(30),
        paymentNote: "",
      },
      KEY,
      NOW,
    );
    theirs = await addApp(
      store,
      other.client,
      {
        appType: "store",
        appName: "Not yours",
        connector: { kind: "catalog" },
      },
      "studio_1",
    );
  });

  it("gives a gift order's sender, recipient, place, day and slot, card, add-ons, flash sale, coupon and fees, in the list and the detail", async () => {
    const token = await signIn();
    const sale = await store.createFlashSale({
      appId: flowers.id,
      title: "Mother's Day roses",
      titles: { ar: "ورود عيد الأم" },
      productIds: [11],
      categoryId: null,
      discount: { kind: "percent", percent: 25 },
      startsAt: NOW,
      endsAt: days(1),
      limit: 12,
      platformCode: null,
      active: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
    // A demo order: the payment page never asked anything, so only the gift checkout's details are there.
    const order = await paid(store, flowers, {
      lines: [
        {
          productId: 11,
          name: "Blush Garden - Deluxe",
          variant: "Deluxe",
          variantId: 3,
          quantity: 1,
          unitCents: 1800_00,
          imageAssetId: null,
          digital: false,
          options: [{ group: "Wrap", name: "Kraft", priceDeltaCents: 0 }],
          flashSaleId: sale.id,
        },
        {
          productId: 21,
          name: "Chocolate box",
          quantity: 1,
          unitCents: 250_00,
          imageAssetId: null,
          digital: false,
          addonOf: 11,
        },
      ],
      subtotalCents: 2050_00,
      couponCode: "LEQAA10",
      discountCents: 205_00,
      shippingCents: 150_00,
      totalCents: 1995_00,
      delivery: {
        date: "2026-10-13",
        slot: { id: "afternoon", start: "13:00", end: "16:00" },
        feeCents: 50_00,
        sender: {
          name: "Omar Nabil",
          phone: "+201001234567",
          email: "omar@example.com",
        },
        recipient: {
          name: "Salma Nabil",
          phone: "+201007654321",
          address: "14 Brazil St, Zamalek",
        },
        place: { country: "EG", city: "Cairo", lat: 30.0626, lng: 31.2197 },
        shipping: {
          cents: 100_00,
          zone: "4.2 km",
          breakdown: [
            { label: "Base fee", cents: 60_00, rule: "distance" },
            { label: "4.2 km", cents: 40_00, rule: "distance" },
          ],
        },
        message: "Happy birthday, Mama!",
        anonymous: true,
      },
      deliveryDate: "2026-10-13",
    });

    const list = await call("GET", "/apps/{app_id}/orders", {
      token,
      params: { app_id: flowers.id },
    });
    const item = (list.body.items as unknown as Record<string, unknown>[])[0]!;
    expect(item).toMatchObject({
      id: order.id,
      customer: {
        name: "Omar Nabil",
        phone: "+201001234567",
        email: "omar@example.com",
        source: "sender",
      },
      delivery: { date: "2026-10-13", slot: { label: "13:00–16:00" } },
      total: { amount_cents: 1995_00, currency: "EGP" },
    });

    const detail = await call("GET", "/apps/{app_id}/orders/{order_id}", {
      token,
      params: { app_id: flowers.id, order_id: order.id },
      lang: "ar",
    });
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      deliver_to: {
        person: "recipient",
        name: "Salma Nabil",
        phone: "+201007654321",
        address: "14 Brazil St, Zamalek",
        city: "Cairo",
        country: "EG",
        lat: 30.0626,
        lng: 31.2197,
      },
      delivery: {
        sender: { name: "Omar Nabil" },
        recipient: { name: "Salma Nabil" },
        gift_message: "Happy birthday, Mama!",
        // The owner sees the sender; the card goes unsigned.
        anonymous: true,
        signed_by: null,
        place: { country: "EG", city: "Cairo", lat: 30.0626, lng: 31.2197 },
        fee: { amount_cents: 50_00 },
        zone: "4.2 km",
        shipping_fee: { amount_cents: 100_00 },
        breakdown: [
          {
            label: "Base fee",
            rule: "distance",
            amount: { amount_cents: 60_00 },
          },
          { label: "4.2 km", rule: "distance" },
        ],
      },
      lines: [
        {
          product_id: 11,
          variant: "Deluxe",
          options: ["Wrap: Kraft"],
          total: { amount_cents: 1800_00 },
          flash_sale: { id: sale.id, title: "ورود عيد الأم", percent: 25 },
        },
        { product_id: 21, addon_of: 11, flash_sale: null },
      ],
      amounts: {
        subtotal: { amount_cents: 2050_00 },
        discount: { code: "LEQAA10", amount: { amount_cents: 205_00 } },
        points: null,
        shipping: { amount_cents: 150_00 },
        tax: null,
        total: { amount_cents: 1995_00 },
      },
    });
    // Signed when not anonymous.
    await store.updateCatalogOrder(flowers.id, order.id, {
      delivery: { ...order.delivery!, anonymous: false },
    } as never);
    const signed = await call("GET", "/apps/{app_id}/orders/{order_id}", {
      token,
      params: { app_id: flowers.id, order_id: order.id },
    });
    expect(signed.body.delivery).toMatchObject({
      anonymous: false,
      signed_by: "Omar Nabil",
    });
  });

  it("names who ordered from the app's account when the checkout kept nothing, and the place of a standard checkout", async () => {
    const token = await signIn();
    const buyer = (await store.createHostedUser({
      appId: flowers.id,
      phone: "+201005550101",
      name: "Nour Hany",
      email: "nour@example.com",
      city: "Giza",
      now: NOW,
    }))!;
    const order = await paid(store, flowers, {
      userId: buyer.id,
      lines: [
        {
          productId: 12,
          name: "Sunflowers",
          quantity: 2,
          unitCents: 400_00,
          imageAssetId: null,
          digital: false,
        },
      ],
      subtotalCents: 800_00,
      totalCents: 800_00,
      delivery: {
        date: null,
        slot: null,
        feeCents: 0,
        sender: null,
        recipient: null,
        place: { country: "EG", city: "Giza", lat: null, lng: null },
        message: null,
        anonymous: false,
      },
    });
    const detail = await call("GET", "/apps/{app_id}/orders/{order_id}", {
      token,
      params: { app_id: flowers.id, order_id: order.id },
    });
    expect(detail.body).toMatchObject({
      customer: {
        name: "Nour Hany",
        phone: "+201005550101",
        email: "nour@example.com",
        city: "Giza",
        address: null,
        source: "account",
      },
      deliver_to: {
        person: "customer",
        name: "Nour Hany",
        city: "Giza",
        country: "EG",
      },
      // Only a place: still a delivery detail.
      delivery: { date: null, place: { city: "Giza" }, signed_by: null },
    });

    // The payment page's details come first.
    const card = await paid(store, flowers, {
      userId: buyer.id,
      lines: [
        {
          productId: 12,
          name: "Sunflowers",
          quantity: 1,
          unitCents: 400_00,
          imageAssetId: null,
          digital: false,
        },
      ],
      subtotalCents: 400_00,
      totalCents: 400_00,
      customer: {
        name: "Nour H. Ali",
        phone: "+201005550102",
        email: "nour.ali@example.com",
        city: "Cairo",
        address: "3 Nile St, Garden City",
      },
    });
    const second = await call("GET", "/apps/{app_id}/orders/{order_id}", {
      token,
      params: { app_id: flowers.id, order_id: card.id },
    });
    expect(second.body).toMatchObject({
      customer: { name: "Nour H. Ali", source: "checkout" },
      deliver_to: {
        person: "customer",
        address: "3 Nile St, Garden City",
        city: "Cairo",
        lat: null,
      },
      delivery: null,
    });
  });

  it("gives a restaurant's delivery address, the time asked for and the fee", async () => {
    const token = await signIn();
    const order = await paid(store, cafe, {
      currency: "TRY",
      lines: [
        {
          productId: 5,
          name: "Chicken shawarma",
          quantity: 2,
          unitCents: 165_00,
          imageAssetId: null,
          digital: false,
          options: [
            { group: "Sauce", name: "Extra garlic", priceDeltaCents: 0 },
          ],
        },
      ],
      subtotalCents: 330_00,
      shippingCents: 30_00,
      totalCents: 360_00,
      customer: {
        name: "Sara Hassan",
        phone: "+905550100042",
        email: "sara@example.com",
        city: "Istanbul",
        address: "Moda Cd. 12",
      },
      fulfilment: {
        type: "delivery",
        scheduledFor: "2026-10-12T18:30:00.000Z",
        address: {
          address: "Moda Cd. 12, Kadıköy",
          district: "Kadıköy",
          notes: "3rd floor, ring twice",
        },
      },
      fulfilmentStatus: "received",
    });
    const detail = await call("GET", "/apps/{app_id}/orders/{order_id}", {
      token,
      params: { app_id: cafe.id, order_id: order.id },
    });
    expect(detail.body).toMatchObject({
      kitchen: {
        type: "delivery",
        step: "received",
        scheduled_for: "2026-10-12T18:30:00.000Z",
      },
      deliver_to: {
        person: "customer",
        name: "Sara Hassan",
        phone: "+905550100042",
        address: "Moda Cd. 12, Kadıköy",
        city: "Kadıköy",
        notes: "3rd floor, ring twice",
      },
      lines: [
        { options: ["Sauce: Extra garlic"], total: { amount_cents: 330_00 } },
      ],
      amounts: {
        shipping: { amount_cents: 30_00 },
        total: { amount_cents: 360_00 },
      },
    });
  });

  it("gives a food order's customer with the pin and the courier's phone, a market order's customer, payment and amounts", async () => {
    const token = await signIn();
    const r = await store.createRestaurant(
      {
        appId: food.id,
        name: "Zooba",
        description: null,
        logoAssetId: null,
        coverAssetId: null,
        cuisines: [],
        address: place("Zamalek"),
        phone: null,
        hours: [],
        prepMinutes: 20,
        minOrderCents: 0,
        maxKm: null,
        commissionBp: 1000,
        active: true,
        position: 1,
      },
      { sections: [], nextId: 1 },
      NOW,
    );
    const courier = await store.createCourier(
      {
        appId: food.id,
        name: "Karim Adel",
        phone: "+201005550001",
        email: null,
        vehicle: "Scooter",
        active: true,
      },
      NOW,
    );
    if (!courier.ok) throw new Error("courier");
    const job = await store.createShipment(
      shipment(food, {
        courierId: courier.courier.id,
        courierName: "Karim Adel",
        status: "assigned",
      }),
    );
    const fo = await store.createFoodOrder(
      foodOrder(food, r.id, { shipmentId: job.id, status: "accepted" }),
    );
    const detail = await call(
      "GET",
      "/apps/{app_id}/food-orders/{food_order_id}",
      { token, params: { app_id: food.id, food_order_id: fo.id } },
    );
    expect(detail.body).toMatchObject({
      customer: {
        name: "Mona Hassan",
        phone: "+201001112222",
        address: "12 Tahrir St, Dokki, Flat 4",
        details: "Flat 4",
        lat: 30.04,
        lng: 31.23,
        note: "Ring twice",
      },
      courier: {
        id: courier.courier.id,
        name: "Karim Adel",
        phone: "+201005550001",
      },
      lines: [
        { name: "Smash burger", options: ["Size: Large"] },
        { name: "Fries", options: ["Extra salt"] },
      ],
    });

    const vendor = await store.createRestaurant(
      {
        appId: market.id,
        name: "Fresh Market",
        description: null,
        logoAssetId: null,
        coverAssetId: null,
        cuisines: [],
        address: place("Salmiya"),
        phone: null,
        hours: [],
        prepMinutes: 15,
        minOrderCents: 0,
        maxKm: null,
        commissionBp: 1000,
        active: true,
        position: 1,
        kind: "grocery",
      },
      { sections: [], nextId: 1 },
      NOW,
    );
    const mo = await store.createMarketOrder(marketOrder(market, vendor.id));
    const m = await call(
      "GET",
      "/apps/{app_id}/market/orders/{market_order_id}",
      { token, params: { app_id: market.id, market_order_id: mo.id } },
    );
    expect(m.body).toMatchObject({
      customer: {
        name: "Huda Ali",
        phone: "+96550001111",
        address: "Block 3, Salmiya, House 7",
        details: "House 7",
        lat: 29.33,
        lng: 48.07,
        note: "Leave at the door",
      },
      scheduled_for: "2026-10-12T15:00:00.000Z",
      payment: { method: "cash", status: "unpaid" },
      coupon_code: "SOUQ5",
      amounts: [
        { kind: "items", amount: { formatted: "KWD 12.500" } },
        { kind: "delivery", amount: { amount_cents: 1_000 } },
        { kind: "coupon", amount: { amount_cents: -1_000 } },
        { kind: "total", amount: { amount_cents: 12_500 } },
      ],
      courier: null,
      lines: [{ name: "Milk" }, { name: "Bread", options: ["Sliced"] }],
    });
  });

  it("gives a shipment's sender, package and service, and a ride's rider and note, with every place's pin", async () => {
    const token = await signIn();
    const s = await store.createShipment(shipment(delivery));
    const detail = await call("GET", "/apps/{app_id}/shipments/{shipment_id}", {
      token,
      params: { app_id: delivery.id, shipment_id: s.id },
    });
    expect(detail.body).toMatchObject({
      pickup: {
        name: "Nile Books",
        address: "5 Zamalek St, Cairo",
        details: "Gate 2",
        lat: 30.06,
        lng: 31.22,
      },
      dropoff: {
        name: "Omar Said",
        address: "9 Maadi Rd, Cairo",
        details: null,
        lat: 29.96,
        lng: 31.25,
      },
      sender: { name: "Nile Books", phone: "+201001112222" },
      recipient: { name: "Omar Said", phone: "+201003334444" },
      package: { size: "small", description: "Two books" },
      service: "Same day",
      note: "Fragile",
    });
    const list = await call("GET", "/apps/{app_id}/shipments", {
      token,
      params: { app_id: delivery.id },
    });
    expect(
      (list.body.items as unknown as Record<string, unknown>[])[0],
    ).toMatchObject({ pickup: { lat: 30.06 }, dropoff: { lng: 31.25 } });

    const r = await store.createRide(ride(rides));
    const rd = await call("GET", "/apps/{app_id}/rides/{ride_id}", {
      token,
      params: { app_id: rides.id, ride_id: r.id },
    });
    expect(rd.body).toMatchObject({
      rider: { name: "Sara Adel", phone: "+201001112222" },
      notes: "Blue gate",
      pickup: { lat: 30.044, lng: 31.235 },
      dropoff: { lat: 30.046 },
    });
  });

  it("lists an order waiting for cash on delivery with who ordered, and Today counts it as waiting for its payment", async () => {
    const token = await signIn();
    const waiting = await store.createCatalogOrder({
      appId: flowers.id,
      tokenHash: sha256Hex("waiting"),
      userId: null,
      status: "pending",
      lines: [
        {
          productId: 3,
          name: "Tulips",
          quantity: 1,
          unitCents: 300_00,
          imageAssetId: null,
          digital: false,
        },
      ],
      subtotalCents: 300_00,
      shippingCents: 0,
      totalCents: 300_00,
      currency: "EGP",
      customer: {
        name: "Hoda Samir",
        phone: "+201002223333",
        email: "hoda@example.com",
        city: "Giza",
        address: "7 Pyramids Rd, Haram",
      },
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      updatedAt: NOW,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
      manualPayment: {
        method: "custom",
        name: "Cash on delivery",
        instructions: "Pay the courier.",
        dueAt: days(2).toISOString(),
      },
    } as Omit<CatalogOrder, "id">);
    const list = await call("GET", "/apps/{app_id}/orders", {
      token,
      params: { app_id: flowers.id },
      query: { status: "pending,processing" },
    });
    expect(
      (list.body.items as unknown as Record<string, unknown>[])[0],
    ).toMatchObject({
      id: waiting.id,
      status: "pending",
      customer: { name: "Hoda Samir", source: "checkout" },
      deliver_to: { address: "7 Pyramids Rd, Haram", city: "Giza" },
      pay_outside: { method: "custom", name: "Cash on delivery" },
      next_statuses: ["processing", "cancelled"],
    });
    const today = await call("GET", "/apps/{app_id}/today", {
      token,
      params: { app_id: flowers.id },
    });
    expect(today.body.needs_you).toContainEqual({
      kind: "orders_awaiting_payment",
      count: 1,
      title: "1 order waiting for its payment",
      notice_id: null,
    });
  });

  it("refuses another owner's orders, and an order of one app asked for through another", async () => {
    const token = await signIn();
    const foreign = await paid(store, theirs, {
      lines: [
        {
          productId: 1,
          name: "Roses",
          quantity: 1,
          unitCents: 100_00,
          imageAssetId: null,
          digital: false,
        },
      ],
      totalCents: 100_00,
      customer: {
        name: "Someone Else",
        phone: "+201000000000",
        email: "else@example.com",
        city: "Cairo",
        address: "Elsewhere 1",
      },
    });
    // Their app is not one of ours: not found, nothing of the order said.
    for (const route of [
      "/apps/{app_id}/orders/{order_id}",
      "/apps/{app_id}/orders",
    ] as const) {
      const refused = await call("GET", route, {
        token,
        params: { app_id: theirs.id, order_id: foreign.id },
      });
      expect(refused.status).toBe(404);
      expect(JSON.stringify(refused.body)).not.toContain("Someone Else");
    }
    // Their order's ID under our own app: not found either.
    const crossed = await call("GET", "/apps/{app_id}/orders/{order_id}", {
      token,
      params: { app_id: flowers.id, order_id: foreign.id },
    });
    expect(crossed.status).toBe(404);
    expect(JSON.stringify(crossed.body)).not.toContain("Someone Else");
    // An account of their app is never read for ours.
    const outsider = (await store.createHostedUser({
      appId: theirs.id,
      phone: "+201000000009",
      name: "Their Customer",
      email: null,
      city: null,
      now: NOW,
    }))!;
    const ours = await paid(store, flowers, {
      userId: outsider.id,
      lines: [
        {
          productId: 1,
          name: "Roses",
          quantity: 1,
          unitCents: 100_00,
          imageAssetId: null,
          digital: false,
        },
      ],
      totalCents: 100_00,
    });
    const detail = await call("GET", "/apps/{app_id}/orders/{order_id}", {
      token,
      params: { app_id: flowers.id, order_id: ours.id },
    });
    expect(detail.body.customer).toBeNull();
    // The engines too.
    const theirFood = await addApp(
      store,
      (await store.getClientById(theirs.clientId))!,
      {
        appType: "food",
        appName: "Their food",
        connector: { kind: "restaurants" },
      },
      "studio_1",
    );
    const fo = await store.createFoodOrder(foodOrder(theirFood, 1));
    expect(
      (
        await call("GET", "/apps/{app_id}/food-orders/{food_order_id}", {
          token,
          params: { app_id: theirFood.id, food_order_id: fo.id },
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await call("GET", "/apps/{app_id}/food-orders/{food_order_id}", {
          token,
          params: { app_id: food.id, food_order_id: fo.id },
        })
      ).status,
    ).toBe(404);
    const ts = await store.createShipment(shipment(theirFood));
    expect(
      (
        await call("GET", "/apps/{app_id}/shipments/{shipment_id}", {
          token,
          params: { app_id: delivery.id, shipment_id: ts.id },
        })
      ).status,
    ).toBe(404);
  });

  it("keeps the customer's details to the people who may see orders", async () => {
    await signIn();
    const member = await store.createUser({
      email: "kerem@studio.test",
      name: "Kerem",
      passwordHash: await hashPassword(PASSWORD),
      now: NOW,
    });
    await store.saveTeamMember({
      clientId: client.id,
      userId: member.id,
      role: "staff",
      areas: ["catalog"],
      appIds: null,
      addedBy: "leyla@studio.test",
      createdAt: NOW,
      updatedAt: NOW,
    });
    const token = await signIn("kerem@studio.test");
    const order = await paid(store, flowers, {
      lines: [
        {
          productId: 1,
          name: "Roses",
          quantity: 1,
          unitCents: 100_00,
          imageAssetId: null,
          digital: false,
        },
      ],
      totalCents: 100_00,
      customer: {
        name: "Mona Adel",
        phone: "+201000000001",
        email: "mona@example.com",
        city: "Cairo",
        address: "Tahrir 1",
      },
    });
    const refused = await call("GET", "/apps/{app_id}/orders/{order_id}", {
      token,
      params: { app_id: flowers.id, order_id: order.id },
    });
    expect(refused).toMatchObject({
      status: 403,
      body: { code: "not_allowed" },
    });
    expect(JSON.stringify(refused.body)).not.toContain("Mona");
  });
});

function foodOrder(
  app: App,
  restaurantId: number,
  patch: Partial<FoodOrder> = {},
): Omit<FoodOrder, "id"> {
  return {
    appId: app.id,
    restaurantId,
    restaurantName: "Zooba",
    userId: null,
    customerName: "Mona Hassan",
    customerPhone: "+201001112222",
    lines: [
      {
        dishId: 1,
        name: "Smash burger",
        quantity: 2,
        choices: ["Size: Large"],
        note: null,
        unitCents: 120_00,
      },
      {
        dishId: 2,
        name: "Fries",
        quantity: 1,
        choices: [],
        note: "Extra salt",
        unitCents: 40_00,
      },
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
    dropoff: place("12 Tahrir St, Dokki", 30.04, 31.23, "Flat 4"),
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

function shipment(
  app: App,
  patch: Partial<Shipment> = {},
): Omit<Shipment, "id"> {
  return {
    appId: app.id,
    userId: null,
    senderName: "Nile Books",
    senderPhone: "+201001112222",
    serviceId: null,
    serviceName: "Same day",
    pickup: place("5 Zamalek St, Cairo", 30.06, 31.22, "Gate 2"),
    dropoff: place("9 Maadi Rd, Cairo", 29.96, 31.25),
    zoneId: null,
    zoneName: null,
    distanceKm: 11,
    packageSize: "small",
    packageDescription: "Two books",
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
    timeline: [{ status: "pending", at: NOW.toISOString(), by: "customer" }],
    lang: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}

function ride(app: App): Omit<Ride, "id"> {
  return {
    appId: app.id,
    userId: null,
    riderName: "Sara Adel",
    riderPhone: "+201001112222",
    vehicleTypeId: 1,
    vehicleTypeName: "Economy",
    vehicleTypeIcon: "directions_car",
    fares: {
      baseCents: 10_00,
      perKmCents: 5_00,
      perMinuteCents: 1_00,
      minCents: 20_00,
      waitPerMinuteCents: 1_00,
    },
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
    pin: "4821",
    notes: "Blue gate",
    driverId: null,
    driverName: null,
    offeredTo: null,
    offerExpiresAt: null,
    declinedBy: [],
    searchingSince: NOW,
    cancellation: null,
    feeCarriedTo: null,
    shareToken: null,
    rating: null,
    timeline: [{ status: "searching", at: NOW.toISOString(), by: "rider" }],
    lang: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function marketOrder(app: App, vendorId: number): Omit<MarketOrder, "id"> {
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
    scheduledFor: new Date("2026-10-12T15:00:00.000Z"),
    lines: [
      {
        id: 1,
        productId: 7,
        name: "Milk",
        imageUrl: null,
        quantity: 2,
        unit: "item",
        choices: [],
        note: null,
        unitPrice: 2_500,
        wasUnitPrice: null,
        total: 5_000,
        ifMissing: "remove",
        substituteProductId: null,
        outcome: null,
        pickedQuantity: null,
        substitute: null,
      },
      {
        id: 2,
        productId: 8,
        name: "Bread",
        imageUrl: null,
        quantity: 1,
        unit: "item",
        choices: ["Sliced"],
        note: null,
        unitPrice: 7_500,
        wasUnitPrice: null,
        total: 7_500,
        ifMissing: "remove",
        substituteProductId: null,
        outcome: null,
        pickedQuantity: null,
        substitute: null,
      },
    ],
    money: {
      lines: [
        { kind: "items", amount: total },
        { kind: "delivery", amount: 1_000 },
        { kind: "coupon", amount: -1_000 },
        { kind: "total", amount: total },
      ],
      itemsBefore: total,
      itemDiscounts: 0,
      items: total,
      coupon: null,
      club: 0,
      delivery: 1_000,
      deliveryDiscount: 0,
      tax: 0,
      tip: 0,
      total,
      wallet: 0,
      payNow: total,
      split: {
        commission: 0,
        vendorEarns: 0,
        ownerEarns: 0,
        collectedBy: "owner",
        dueToVendor: 0,
      },
    } as unknown as MarketOrder["money"],
    currency: "KWD",
    paymentMethod: "cash",
    paymentStatus: "unpaid",
    paymentRef: null,
    couponCode: "SOUQ5",
    status: "placed",
    dropoff: place("Block 3, Salmiya", 29.33, 48.07, "House 7"),
    distanceKm: 2,
    notes: "Leave at the door",
    pickupCode: null,
    prepMinutes: 15,
    readyAt: null,
    rejection: null,
    shipmentId: null,
    rating: null,
    timeline: [{ status: "placed", at: NOW.toISOString(), by: "customer" }],
    completedAt: null,
    lang: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}
