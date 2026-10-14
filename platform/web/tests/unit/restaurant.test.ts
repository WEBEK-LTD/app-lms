import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import {
  DEFAULT_FULFILMENT,
  canMoveTo,
  checkFulfilment,
  fulfilmentMessage,
  fulfilmentOf,
  nextStep,
  openState,
  opensText,
  parseFulfilmentForm,
  scheduledSlots,
} from "@/lib/catalog/fulfilment";
import { moveOrder } from "@/lib/catalog/kitchen";
import { checkOptions, parseOptionGroups } from "@/lib/catalog/options";
import { newOrderMail } from "@/lib/catalog/payment";
import { encryptPaymentKeys } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogOptionGroup, type CatalogProductInput, type FulfilmentSettings } from "@/lib/data/types";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import type { sendPush } from "@/lib/hosted/push";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

/** 26 Restaurants and cafés: a dish's options, pickup and delivery, opening hours and the kitchen. */

const SIZE: CatalogOptionGroup = {
  id: "size",
  name: "Size",
  min: 1,
  max: 1,
  options: [
    { id: "small", name: "Small", priceDeltaCents: 0 },
    { id: "large", name: "Large", priceDeltaCents: 2000 },
  ],
};
const EXTRAS: CatalogOptionGroup = {
  id: "extras",
  name: "Extras",
  min: 0,
  max: 2,
  options: [
    { id: "cheese", name: "Extra cheese", priceDeltaCents: 1500 },
    { id: "bacon", name: "Bacon", priceDeltaCents: 2500 },
    { id: "egg", name: "Egg", priceDeltaCents: 1000 },
  ],
};

// NOW is Monday 12 October 2026, 13:00 in Istanbul (UTC+3).
const at = (iso: string) => new Date(iso);
const KITCHEN: FulfilmentSettings = {
  ...DEFAULT_FULFILMENT,
  minOrderCents: 15000,
  deliveryFeeCents: 3000,
  deliveryAreas: ["Kadıköy", "Moda"],
  // Closed on Sundays; 09:00 to 22:00 otherwise.
  hours: [[], ...Array.from({ length: 6 }, () => [{ start: "09:00", end: "22:00" }])],
};

describe("a dish's options", () => {
  it("checks min and max per group and prices the choices", () => {
    expect(checkOptions([SIZE, EXTRAS], ["large", "cheese"])).toEqual({
      ok: true,
      deltaCents: 3500,
      chosen: [
        { id: "large", group: "Size", name: "Large", priceDeltaCents: 2000 },
        { id: "cheese", group: "Extras", name: "Extra cheese", priceDeltaCents: 1500 },
      ],
    });
    expect(checkOptions([SIZE, EXTRAS], ["cheese"])).toEqual({ ok: false, problem: "Choose a size." });
    expect(checkOptions([SIZE, EXTRAS], ["small", "large"])).toEqual({ ok: false, problem: "Choose up to 1 for Size." });
    expect(checkOptions([SIZE, EXTRAS], ["small", "cheese", "bacon", "egg"])).toEqual({ ok: false, problem: "Choose up to 2 for Extras." });
    expect(checkOptions([SIZE], ["small", "small"])).toMatchObject({ ok: false });
    expect(checkOptions([SIZE], ["huge"])).toEqual({ ok: false, problem: "The options of this item changed. Please choose them again." });
    expect(checkOptions([{ ...EXTRAS, min: 2 }], ["egg"])).toEqual({ ok: false, problem: "Choose at least 2 for Extras." });
    expect(checkOptions([], [])).toEqual({ ok: true, chosen: [], deltaCents: 0 });
  });

  it("reads the dashboard's editor: keeps known IDs, adds new ones, drops blank rows", () => {
    const parsed = parseOptionGroups(
      JSON.stringify([
        {
          id: "size",
          name: " Size ",
          min: 1,
          max: 1,
          options: [
            { id: "small", name: "Small", price: "" },
            { name: "Large", price: "20" },
            { name: "", price: "" },
          ],
        },
      ]),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toHaveLength(1);
    expect(parsed.value[0]).toMatchObject({ id: "size", name: "Size", min: 1, max: 1, options: [{ id: "small", name: "Small", priceDeltaCents: 0 }, { name: "Large", priceDeltaCents: 2000 }] });
    expect(parsed.value[0]!.options[1]!.id).toMatch(/^o[0-9a-f]{8}$/);
    expect(parseOptionGroups("")).toEqual({ ok: true, value: [] });
    expect(parseOptionGroups("not json")).toMatchObject({ ok: false });
    expect(parseOptionGroups(JSON.stringify([{ name: "", options: [{ name: "A" }] }]))).toMatchObject({ ok: false, error: expect.stringContaining("enter a name") });
    expect(parseOptionGroups(JSON.stringify([{ name: "Size", options: [] }]))).toEqual({ ok: false, error: "Size: add at least one option." });
    expect(parseOptionGroups(JSON.stringify([{ name: "Size", min: 2, max: 2, options: [{ name: "A" }] }]))).toEqual({ ok: false, error: 'Size: "at least" can be 0 to 1.' });
    expect(parseOptionGroups(JSON.stringify([{ name: "Size", min: 1, max: 0, options: [{ name: "A" }] }]))).toMatchObject({ ok: false });
    expect(parseOptionGroups(JSON.stringify([{ name: "Size", options: [{ name: "A", price: "abc" }] }]))).toMatchObject({ ok: false, error: expect.stringContaining("extra price") });
    // The same ID twice gets a new one for the second.
    const twice = parseOptionGroups(JSON.stringify([{ id: "g", name: "A", options: [{ id: "x", name: "1" }] }, { id: "g", name: "B", options: [{ id: "x", name: "2" }] }]));
    expect(twice.ok && new Set(twice.value.flatMap((g) => [g.id, ...g.options.map((o) => o.id)])).size).toBe(4);
  });
});

describe("opening hours and order times", () => {
  it("knows when the kitchen is open, and when it opens and closes", () => {
    expect(openState(KITCHEN, NOW)).toEqual({ openNow: true, opensAt: null, closesAt: at("2026-10-12T19:00:00Z") });
    // 23:00 on Monday: closed until 09:00 on Tuesday.
    expect(openState(KITCHEN, at("2026-10-12T20:00:00Z"))).toEqual({ openNow: false, opensAt: at("2026-10-13T06:00:00Z"), closesAt: null });
    // Saturday night: closed on Sunday, open on Monday.
    const saturday = at("2026-10-17T20:30:00Z");
    const state = openState(KITCHEN, saturday);
    expect(state.opensAt).toEqual(at("2026-10-19T06:00:00Z"));
    expect(opensText(state.opensAt!, KITCHEN, saturday)).toBe("on Monday at 09:00");
    expect(opensText(at("2026-10-13T06:00:00Z"), KITCHEN, at("2026-10-12T20:00:00Z"))).toBe("at 09:00 tomorrow");
    expect(opensText(at("2026-10-13T06:00:00Z"), KITCHEN, at("2026-10-13T04:00:00Z"))).toBe("at 09:00 today");
    expect(openState({ ...KITCHEN, hours: [[], [], [], [], [], [], []] }, NOW)).toEqual({ openNow: false, opensAt: null, closesAt: null });
  });

  it("offers times after the preparation time, inside the hours, every step", () => {
    const slots = scheduledSlots({ ...KITCHEN, maxDaysAhead: 0 }, NOW);
    // 13:00 now and 20 minutes to prepare: 13:30 is the first quarter hour, 22:00 the last.
    expect(slots[0]).toEqual(at("2026-10-12T10:30:00Z"));
    expect(slots.at(-1)).toEqual(at("2026-10-12T19:00:00Z"));
    expect(slots).toHaveLength(35);
    const tomorrow = scheduledSlots(KITCHEN, at("2026-10-12T20:00:00Z"));
    // Tomorrow opens at 09:00: ready from 09:30 (09:20 rounded up to the quarter).
    expect(tomorrow[0]).toEqual(at("2026-10-13T06:30:00Z"));
    expect(scheduledSlots({ ...KITCHEN, scheduled: false }, NOW)).toEqual([]);
  });

  it("checks pickup or delivery, the address, the area, the minimum and the time", () => {
    const check = (body: unknown, subtotal = 20000, now = NOW, f = KITCHEN) => checkFulfilment(f, body, subtotal, "TRY", now);
    expect(check({ fulfilment: "pickup" })).toEqual({ ok: true, feeCents: 0, fulfilment: { type: "pickup", scheduledFor: null, address: null } });
    expect(check({})).toMatchObject({ ok: false, status: 400, code: "invalid_request", message: "Choose pickup or delivery." });
    expect(check({ fulfilment: "pickup" }, 20000, NOW, { ...KITCHEN, pickup: false })).toMatchObject({ ok: false, code: "invalid_request" });
    expect(check({ fulfilment: "delivery", delivery_address: { address: "x" } })).toMatchObject({ ok: false, message: "Enter your delivery address." });
    expect(check({ fulfilment: "delivery", delivery_address: { address: "Moda Cd. 12", district: "Beşiktaş" } })).toMatchObject({
      ok: false,
      status: 400,
      code: "outside_delivery_area",
      message: "We don't deliver there. We deliver to Kadıköy, Moda.",
    });
    expect(check({ fulfilment: "delivery", delivery_address: { address: "Moda Cd. 12", district: "moda" } }, 10000)).toMatchObject({
      ok: false,
      status: 409,
      code: "below_minimum",
      message: "The minimum order for delivery is ₺150.00.",
    });
    expect(check({ fulfilment: "delivery", delivery_address: { address: "Moda Cd. 12", district: "moda", notes: "Door code 12" } })).toEqual({
      ok: true,
      feeCents: 3000,
      fulfilment: { type: "delivery", scheduledFor: null, address: { address: "Moda Cd. 12", district: "Moda", notes: "Door code 12" } },
    });
    // Closed: no order as soon as possible, but a time for later works.
    const night = at("2026-10-12T20:00:00Z");
    expect(check({ fulfilment: "pickup" }, 20000, night)).toEqual({
      ok: false,
      status: 409,
      code: "kitchen_closed",
      message: "We're closed now. We open at 09:00 tomorrow. You can order for later.",
    });
    expect(check({ fulfilment: "pickup", scheduled_for: "2026-10-13T06:30:00.000Z" }, 20000, night)).toMatchObject({
      ok: true,
      fulfilment: { scheduledFor: "2026-10-13T06:30:00.000Z" },
    });
    expect(check({ fulfilment: "pickup", scheduled_for: "2026-10-13T06:31:00.000Z" }, 20000, night)).toMatchObject({ ok: false, code: "invalid_request" });
    expect(check({ fulfilment: "pickup", scheduled_for: "2026-10-13T06:30:00.000Z" }, 20000, night, { ...KITCHEN, scheduled: false })).toMatchObject({ ok: false });
    expect(check({ fulfilment: "pickup" }, 20000, NOW, { ...KITCHEN, asap: false })).toMatchObject({ ok: false, message: "Choose a time for your order." });
  });

  it("reads the settings form", () => {
    const form: Record<string, string> = {
      pickup: "on",
      delivery: "on",
      deliveryFee: "30",
      minOrder: "150",
      prepMinutes: "25",
      timezone: "Europe/Istanbul",
      asap: "on",
      scheduled: "on",
      slotStep: "15",
      maxDaysAhead: "2",
      deliveryAreas: "Kadıköy\nModa, Moda",
      deliveryNote: "Within 3 km",
      pickupAddress: "Moda Cd. 1",
      open1: "on",
      start1: "09:00",
      end1: "22:00",
    };
    expect(parseFulfilmentForm(form)).toEqual({
      ok: true,
      value: {
        pickup: true,
        delivery: true,
        pickupAddress: "Moda Cd. 1",
        minOrderCents: 15000,
        deliveryFeeCents: 3000,
        deliveryAreas: ["Kadıköy", "Moda"],
        deliveryNote: "Within 3 km",
        prepMinutes: 25,
        timezone: "Europe/Istanbul",
        hours: [[], [{ start: "09:00", end: "22:00" }], [], [], [], [], []],
        asap: true,
        scheduled: true,
        slotStepMinutes: 15,
        maxDaysAhead: 2,
      },
    });
    const bad = parseFulfilmentForm({ ...form, pickup: "", delivery: "", end1: "08:00", asap: "", scheduled: "", maxDaysAhead: "9" });
    expect(bad.ok ? null : Object.keys(bad.errors).sort()).toEqual(["asap", "hours", "maxDaysAhead", "pickup"]);
  });
});

describe("the kitchen's steps", () => {
  it("moves orders forward only, or cancels them", () => {
    expect(canMoveTo("received", "preparing", "pickup")).toBe(true);
    expect(canMoveTo("received", "ready", "pickup")).toBe(true);
    expect(canMoveTo("preparing", "received", "pickup")).toBe(false);
    expect(canMoveTo("ready", "preparing", "delivery")).toBe(false);
    expect(canMoveTo("ready", "out_for_delivery", "pickup")).toBe(false);
    expect(canMoveTo("ready", "out_for_delivery", "delivery")).toBe(true);
    expect(canMoveTo("preparing", "cancelled", "delivery")).toBe(true);
    expect(canMoveTo("completed", "cancelled", "delivery")).toBe(false);
    expect(canMoveTo("cancelled", "completed", "delivery")).toBe(false);
    expect([nextStep("ready", "pickup"), nextStep("ready", "delivery"), nextStep("completed", "pickup")]).toEqual(["completed", "out_for_delivery", null]);
    expect(fulfilmentMessage("ready", "pickup", "1042")).toEqual({ title: "Order 1042 is ready", body: "Your order is ready for pickup." });
  });
});

describe("a restaurant on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let burger: number;
  let water: number;
  const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };

  const product = (input: Partial<CatalogProductInput>): CatalogProductInput => ({
    appId: app.id,
    name: "Dish",
    description: "",
    priceCents: 10000,
    salePriceCents: null,
    categoryIds: [],
    imageAssetIds: [],
    stock: null,
    digital: false,
    featured: false,
    active: true,
    sku: null,
    ...input,
  });

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "store");
    app = {
      ...base,
      vertical: "restaurant",
      backend: "hosted",
      appName: "Moda Café",
      websiteDoneAt: NOW,
      connector: { kind: "catalog" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, shippingCents: 9900, payment: encryptPaymentKeys(base.id, "api", "secret", true, KEY), fulfilment: KITCHEN },
    };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
    burger = (await store.createCatalogProduct(product({ name: "Burger", priceCents: 25000, optionGroups: [SIZE, EXTRAS] }), NOW)).id;
    water = (await store.createCatalogProduct(product({ name: "Water", priceCents: 2000 }), NOW)).id;
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
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    connector: new CatalogConnector({ store, app, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" }),
  });

  async function call(method: string, route: string, options: { body?: unknown; token?: string | null; query?: Record<string, string>; params?: string[] } = {}): Promise<HostedResult> {
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

  async function signUp(phone = "5321234567") {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+90${phone}`)!, device: { ...DEVICE, id: `install-${phone}` } } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name: "Sara Yilmaz", device: { ...DEVICE, id: `install-${phone}` } } });
    return registered.body as { access_token: string; user: { id: number } };
  }

  it("sends the kitchen's settings in the config and its times", async () => {
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { store: Record<string, unknown> };
    expect(config.store).toMatchObject({
      guest_checkout: false,
      fulfilment: {
        pickup: true,
        delivery: true,
        min_order: "150.00",
        min_order_formatted: "₺150.00",
        delivery_fee: "30.00",
        delivery_areas: ["Kadıköy", "Moda"],
        prep_minutes: 20,
        timezone: "Europe/Istanbul",
        asap: true,
        scheduled_slots: { enabled: true, step_minutes: 15, max_days_ahead: 1 },
      },
    });
    const times = (await call("GET", "/store/order-times")).body as { open_now: boolean; slots: string[] };
    expect(times).toMatchObject({ open_now: true, closes_at: "2026-10-12T19:00:00.000Z", opens_at: null, asap: true, ready_in_minutes: 20 });
    expect(times.slots[0]).toBe("2026-10-12T10:30:00.000Z");
    // Another shop has neither.
    app = { ...app, vertical: null };
    const shop = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { store: Record<string, unknown> };
    expect(shop.store.fulfilment).toBeUndefined();
    expect(shop.store.guest_checkout).toBe(true);
    expect((await call("GET", "/store/order-times")).status).toBe(404);
  });

  it("shows a dish's options and prices the cart's choices itself", async () => {
    const detail = (await call("GET", "/store/products/{product_id}", { params: [String(burger)] })).body as { option_groups: unknown[] };
    expect(detail.option_groups).toEqual([
      {
        id: "size",
        name: "Size",
        min: 1,
        max: 1,
        options: [
          { id: "small", name: "Small", price_delta: "0.00", price_delta_formatted: null },
          { id: "large", name: "Large", price_delta: "20.00", price_delta_formatted: "+₺20.00" },
        ],
      },
      expect.objectContaining({ id: "extras", min: 0, max: 2 }),
    ]);
    // Prices the app sends are ignored: only the IDs count.
    const quote = await call("POST", "/store/cart", {
      body: {
        lines: [
          { product_id: burger, quantity: 2, options: ["large", "cheese"], unit_price: "1.00" },
          { product_id: burger, quantity: 1, options: ["cheese"] },
          { product_id: water, quantity: 1 },
        ],
      },
    });
    expect(quote.body).toMatchObject({
      subtotal: "₺590.00",
      item_count: 3,
      lines: [
        {
          name: "Burger",
          unit_price: "₺285.00",
          line_total: "₺570.00",
          available: true,
          problem: null,
          options: [
            { id: "large", name: "Large", group: "Size" },
            { id: "cheese", name: "Extra cheese", group: "Extras" },
          ],
        },
        { available: false, problem: "Choose a size." },
        { name: "Water", unit_price: "₺20.00", available: true },
      ],
    });
    expect((await call("POST", "/store/cart", { body: { lines: [{ product_id: burger, quantity: 1, options: "large" }] } })).status).toBe(400);
  });

  it("takes pickup and delivery orders from signed-in customers, with the options and fee kept", async () => {
    const lines = [{ product_id: burger, quantity: 2, options: ["large", "cheese"] }];
    const checkout = (body: Record<string, unknown>, token: string | null) => call("POST", "/store/checkout-link", { query: { platform: "ios" }, token, body: { lines, ...body } });
    expect((await checkout({ fulfilment: "pickup" }, null)).status).toBe(401);
    const { access_token: token, user } = await signUp();
    expect((await checkout({}, token)).body).toMatchObject({ code: "invalid_request" });
    expect((await checkout({ lines: [{ product_id: burger, quantity: 1 }], fulfilment: "pickup" }, token)).body).toMatchObject({ code: "cart_changed" });

    const link = await checkout({ fulfilment: "delivery", delivery_address: { address: "Moda Cd. 12, flat 3", district: "Moda", notes: null } }, token);
    expect(link.status).toBe(200);
    const order = (await store.getCatalogOrderByToken(sha256Hex((link.body as { url: string }).url.split("/").pop()!)))!;
    expect(order).toMatchObject({
      userId: user.id,
      subtotalCents: 57000,
      shippingCents: 3000,
      totalCents: 60000,
      fulfilmentStatus: "received",
      fulfilment: { type: "delivery", scheduledFor: null, address: { address: "Moda Cd. 12, flat 3", district: "Moda", notes: null } },
      lines: [
        {
          name: "Burger",
          unitCents: 28500,
          options: [
            { group: "Size", name: "Large", priceDeltaCents: 2000 },
            { group: "Extras", name: "Extra cheese", priceDeltaCents: 1500 },
          ],
        },
      ],
    });
    // The owner's email says how and lists the options.
    const mail = newOrderMail({ ...order, status: "processing" }, "Moda Café", "https://yallapp.test/dashboard/orders");
    expect(mail.text).toContain("Burger (Large, Extra cheese) × 2: ₺570.00");
    expect(mail.text).toContain("Delivery as soon as possible: Moda Cd. 12, flat 3, Moda");
    expect(mail.text).toContain("Delivery fee: ₺30.00");

    // Closed at night: as soon as possible is refused, a time for later is taken.
    now = at("2026-10-12T20:00:00Z");
    const night = (await signUp("5320000001")).access_token;
    expect((await checkout({ fulfilment: "pickup" }, night)).body).toMatchObject({ code: "kitchen_closed" });
    expect((await checkout({ fulfilment: "pickup", scheduled_for: "2026-10-13T07:00:00.000Z" }, night)).status).toBe(200);
  });

  it("lets customers follow their own orders as the kitchen moves them, with a notification each time", async () => {
    const { access_token: token, user } = await signUp();
    const link = await call("POST", "/store/checkout-link", {
      query: { platform: "android" },
      token,
      body: { lines: [{ product_id: burger, quantity: 1, options: ["small"] }], fulfilment: "pickup" },
    });
    const pending = (await store.getCatalogOrderByToken(sha256Hex((link.body as { url: string }).url.split("/").pop()!)))!;
    // Not listed before it's paid.
    expect((await call("GET", "/me/orders/{order_id}", { params: [String(pending.id)], token })).status).toBe(404);
    await store.payCatalogOrder(app.id, pending.id, "pay-1", now);

    const mine = await call("GET", "/me/orders/{order_id}", { params: [String(pending.id)], token });
    expect(mine.body).toMatchObject({
      id: pending.id,
      status: "processing",
      status_label: "Received",
      fulfilment_status: "received",
      fulfilment: { type: "pickup", scheduled_for: null, delivery_address: null, delivery_fee: null },
      items: [{ name: "Burger", options: ["Small"] }],
    });
    expect((await call("GET", "/me/orders/{order_id}", { params: [String(pending.id)] })).status).toBe(401);
    const other = await signUp("5329876543");
    expect((await call("GET", "/me/orders/{order_id}", { params: [String(pending.id)], token: other.access_token })).status).toBe(404);
    expect((await call("GET", "/me/orders/{order_id}", { params: ["abc"], token })).status).toBe(404);

    // The customer's phone gets each step.
    await call("PUT", "/me/push-token", { token, body: { token: "fcm-token-1" } });
    const pushed: { title: string; data: Record<string, string> }[] = [];
    const send = (async (_account, tokens, message) => {
      pushed.push({ title: message.title, data: message.data });
      return { sent: tokens.length, invalidTokens: [] };
    }) as typeof sendPush;
    const account = { project_id: "p", client_email: "e", private_key: "PRIVATE KEY" };
    const move = async (to: Parameters<typeof moveOrder>[0]["to"]) =>
      moveOrder({ store, app, order: (await store.getCatalogOrder(app.id, pending.id))!, to, account, now, send });

    expect(await move("preparing")).toMatchObject({ moved: true, pushed: 1 });
    expect(await move("received")).toMatchObject({ moved: false });
    expect(await move("out_for_delivery")).toMatchObject({ moved: false });
    expect(await move("ready")).toMatchObject({ moved: true });
    expect(pushed.map((p) => p.title)).toEqual([`Order ${1000 + pending.id} is being prepared`, `Order ${1000 + pending.id} is ready`]);
    expect(pushed[0]!.data).toMatchObject({ type: "announcement", order_id: String(pending.id) });
    expect((await call("GET", "/me/orders/{order_id}", { params: [String(pending.id)], token })).body).toMatchObject({ fulfilment_status: "ready", status_label: "Ready" });

    expect(await move("completed")).toMatchObject({ moved: true });
    expect(await store.getCatalogOrder(app.id, pending.id)).toMatchObject({ status: "completed", fulfilmentStatus: "completed" });
    expect(await move("cancelled")).toMatchObject({ moved: false });
    const inbox = await call("GET", "/me/notifications", { token });
    expect(inbox.body).toMatchObject({ unread_count: 3 });
    const listed = await call("GET", "/me/orders", { token });
    expect(listed.body).toMatchObject({ items: [{ id: pending.id, status: "completed", fulfilment_status: "completed" }] });
    void user;
  });

  it("cancels an order that hasn't left the kitchen", async () => {
    const { access_token: token } = await signUp();
    const link = await call("POST", "/store/checkout-link", { query: { platform: "android" }, token, body: { lines: [{ product_id: water, quantity: 8 }], fulfilment: "pickup" } });
    const order = (await store.getCatalogOrderByToken(sha256Hex((link.body as { url: string }).url.split("/").pop()!)))!;
    // An unpaid order isn't the kitchen's yet.
    expect(await moveOrder({ store, app, order, to: "preparing", account: null, now })).toMatchObject({ moved: false });
    await store.payCatalogOrder(app.id, order.id, "pay-2", now);
    const paid = (await store.getCatalogOrder(app.id, order.id))!;
    expect(await moveOrder({ store, app, order: paid, to: "cancelled", account: null, now })).toMatchObject({ moved: true, pushed: 0 });
    expect(await store.getCatalogOrder(app.id, order.id)).toMatchObject({ status: "cancelled", fulfilmentStatus: "cancelled" });
  });

  it("uses the defaults until the restaurant saves its own", () => {
    expect(fulfilmentOf({ vertical: "restaurant", catalogSettings: null })).toEqual(DEFAULT_FULFILMENT);
    expect(fulfilmentOf({ vertical: null, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, fulfilment: KITCHEN } })).toBeNull();
  });
});
