import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { contactPath, readDraft, withContact } from "@/lib/contact/chat";
import { isQuickReply, quickWords } from "@/lib/contact/quick";
import { CHAT_AFTER_MS, contactSettingsOf, contactWaysJson, customerThread, isOpen, threadWindow } from "@/lib/contact/thread";
import type { DataStore } from "@/lib/data/store";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_HOSTED_SETTINGS, type App, type DeliverySettings, type Shipment } from "@/lib/data/types";
import { assignShipment, moveShipment } from "@/lib/delivery/flow";
import type { DeliveryNotifyDeps } from "@/lib/delivery/notify";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { DeliveryConnector } from "@/lib/hosted/connectors/delivery";
import { LogSender } from "@/lib/hosted/otp-sender";
import type { PushMessage, PushTarget, ServiceAccount } from "@/lib/hosted/push";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
const TAHRIR = { address: "Tahrir Square, Cairo", details: "Gate 2", lat: 30.0444, lng: 31.2357 };
const TOWER = { address: "Cairo Tower, Zamalek", lat: 30.0459, lng: 31.2243 };
const SETTINGS: DeliverySettings = { ...DEFAULT_DELIVERY_SETTINGS, currency: "EGP", pricing: "fixed", fixedCents: 50_00, cash: true, card: false };
const ACCOUNT = { project_id: "nile", client_email: "push@nile.test", private_key: "key" } as ServiceAccount;

describe("184 the chat's rules", () => {
  const job = (patch: Partial<Shipment>): Pick<Shipment, "status" | "courierId" | "timeline" | "updatedAt"> => ({
    status: "pending",
    courierId: null,
    timeline: [{ status: "pending", at: NOW.toISOString() }],
    updatedAt: NOW,
    ...patch,
  });
  const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

  it("opens when a courier is given the job and closes 2 hours after it ends", () => {
    const waiting = job({});
    expect(threadWindow(waiting)).toEqual({ opensAt: null, closesAt: null });
    expect(isOpen(threadWindow(waiting), at(5))).toBe(false);
    const assigned = job({ status: "assigned", courierId: 7, timeline: [...waiting.timeline, { status: "assigned", at: at(10).toISOString() }] });
    expect(threadWindow(assigned)).toEqual({ opensAt: at(10), closesAt: null });
    expect(isOpen(threadWindow(assigned), at(9))).toBe(false);
    expect(isOpen(threadWindow(assigned), at(10))).toBe(true);
    for (const end of ["delivered", "failed", "cancelled"] as const) {
      const ended = job({ status: end, courierId: 7, timeline: [...assigned.timeline, { status: end, at: at(40).toISOString() }] });
      const w = threadWindow(ended);
      expect(w.closesAt).toEqual(new Date(at(40).getTime() + CHAT_AFTER_MS));
      expect(isOpen(w, at(40 + 119))).toBe(true);
      expect(isOpen(w, at(40 + 120))).toBe(false);
    }
    // Given back and given again: the window starts at the new courier's assignment.
    const again = job({ status: "assigned", courierId: 8, timeline: [...assigned.timeline, { status: "pending", at: at(20).toISOString() }, { status: "assigned", at: at(25).toISOString() }] });
    expect(threadWindow(again).opensAt).toEqual(at(25));
  });

  it("signals the ways: chat on by default and only while open, calls never before they're built", () => {
    const settings = contactSettingsOf("app-1", null);
    expect(settings).toMatchObject({ chat: true, appCall: false, phoneCall: false });
    const assigned = job({ status: "on_the_way", courierId: 7, timeline: [{ status: "assigned", at: NOW.toISOString() }] });
    expect(contactWaysJson(settings, null, NOW)).toBeNull();
    expect(contactWaysJson(settings, job({}), NOW)).toBeNull();
    expect(contactWaysJson(settings, assigned, at(1))).toEqual({ chat: true, app_call: false, phone_call: false, chat_until: null });
    expect(contactWaysJson({ ...settings, chat: false, appCall: true, phoneCall: true }, assigned, at(1))).toEqual({ chat: false, app_call: false, phone_call: false, chat_until: null });
    const delivered = job({ status: "delivered", courierId: 7, timeline: [{ status: "assigned", at: NOW.toISOString() }, { status: "delivered", at: at(30).toISOString() }] });
    expect(contactWaysJson(settings, delivered, at(31))).toEqual({ chat: true, app_call: false, phone_call: false, chat_until: at(150).toISOString() });
    expect(contactWaysJson(settings, delivered, at(151))).toMatchObject({ chat: false });
  });

  it("reads messages: text, each side's own quick replies, a location; nothing else", () => {
    expect(readDraft("customer", { kind: "text", text: "  The side door  ", client_id: "a-1" })).toEqual({ ok: true, draft: { kind: "text", body: "The side door", quick: null, lat: null, lng: null, clientId: "a-1" } });
    expect(readDraft("customer", { kind: "text", text: "   " })).toMatchObject({ ok: false });
    expect(readDraft("customer", { kind: "text", text: "x".repeat(1001) })).toMatchObject({ ok: false });
    expect(readDraft("customer", { kind: "quick", quick: "leave_at_door" })).toMatchObject({ ok: true, draft: { kind: "quick", quick: "leave_at_door", body: null } });
    // A courier's reply isn't the customer's, and the reverse.
    expect(readDraft("customer", { kind: "quick", quick: "at_door" })).toMatchObject({ ok: false });
    expect(readDraft("courier", { kind: "quick", quick: "leave_at_door" })).toMatchObject({ ok: false });
    expect(isQuickReply("courier", "call_me") && isQuickReply("customer", "call_me")).toBe(true);
    expect(readDraft("courier", { kind: "location", location: { lat: 30.05, lng: 31.23 } })).toMatchObject({ ok: true, draft: { kind: "location", lat: 30.05, lng: 31.23, body: null } });
    expect(readDraft("courier", { kind: "location", location: { lat: 91, lng: 0 } })).toMatchObject({ ok: false });
    expect(readDraft("courier", { kind: "photo" })).toMatchObject({ ok: false });
    expect(readDraft("courier", { kind: "text", text: "Hi", client_id: "has spaces" })).toMatchObject({ ok: false });
    expect([quickWords("leave_at_door", "ar"), quickWords("at_door", "tr"), quickWords("unknown", "en")]).toEqual(["اتركه عند الباب", "Kapıdayım", "unknown"]);
  });

  it("knows only the customer's and the courier's paths: a store has none", () => {
    expect(contactPath(["me", "market-orders", "12", "contact"])).toEqual({ where: { side: "customer", order: { kind: "market", id: 12 } }, rest: [] });
    expect(contactPath(["me", "food-orders", "3", "contact", "messages"])).toEqual({ where: { side: "customer", order: { kind: "food", id: 3 } }, rest: ["messages"] });
    expect(contactPath(["me", "shipments", "5", "contact", "read"])).toMatchObject({ where: { side: "customer", order: { kind: "shipment", id: 5 } } });
    expect(contactPath(["courier", "jobs", "5", "contact"])).toEqual({ where: { side: "courier", jobId: 5 }, rest: [] });
    for (const path of [["vendor", "orders", "12", "contact"], ["restaurant", "orders", "3", "contact"], ["partner", "orders", "1", "contact"], ["me", "market-orders", "x", "contact"], ["me", "market-orders", "12"]]) {
      expect(contactPath(path)).toBeNull();
    }
  });

  it("reaches a marketplace order's thread only for that order's customer", async () => {
    const assigned: Shipment = { id: 40, appId: "app-1", userId: 5, courierId: 7, status: "on_the_way", timeline: [{ status: "assigned", at: NOW.toISOString() }], updatedAt: NOW } as Shipment;
    const fake = {
      getMarketOrder: async (_: string, id: number) => (id === 12 ? { id: 12, userId: 5, shipmentId: 40 } : id === 13 ? { id: 13, userId: 5, shipmentId: null } : null),
      getShipment: async (_: string, id: number) => (id === 40 ? assigned : null),
      getCourier: async () => ({ id: 7, name: "Karim Mostafa", active: true }),
    } as unknown as DataStore;
    const app = { id: "app-1" } as App;
    const user = (id: number) => ({ id }) as never;
    expect(await customerThread(fake, app, user(5), { kind: "market", id: 12 })).toMatchObject({ ok: true, thread: { side: "customer", job: { id: 40 }, courier: { id: 7 } } });
    expect(await customerThread(fake, app, user(6), { kind: "market", id: 12 })).toMatchObject({ ok: false, status: 404 });
    expect(await customerThread(fake, app, null, { kind: "market", id: 12 })).toMatchObject({ ok: false, status: 401 });
    // A place delivering itself makes no courier job: nobody to write to.
    expect(await customerThread(fake, app, user(5), { kind: "market", id: 13 })).toMatchObject({ ok: false, status: 409, code: "no_courier" });
  });
});

describe("184 the chat on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let pushes: { tokens: string[]; message: PushMessage }[];

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "delivery");
    app = {
      ...base,
      backend: "hosted",
      appName: "Nile Express",
      websiteDoneAt: NOW,
      connector: { kind: "deliveries" },
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
    };
    await store.createApp(app);
    await store.saveDeliverySettings(app.id, SETTINGS, NOW);
    sender = new LogSender();
    now = NOW;
    pushes = [];
  });

  const notify = (at: Date): DeliveryNotifyDeps => ({
    store,
    app,
    now: at,
    account: ACCOUNT,
    send: async (_account: ServiceAccount, targets: PushTarget[], message: PushMessage) => {
      pushes.push({ tokens: targets.map((t) => (typeof t === "string" ? t : t.token)), message });
      return { sent: targets.length, invalidTokens: [] };
    },
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
    connector: withContact(new DeliveryConnector({ store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test" }), { store, app, enabled: true, notify }),
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
    const device = { ...DEVICE, id: `install-${phone}` };
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+20${phone}`)!, device } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = (await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device } })).body as { access_token: string; user: { id: number } };
    await call("PUT", "/me/push-token", { token: registered.access_token, body: { token: `push-${phone}` } });
    return registered;
  }

  /** A customer's parcel given to Karim, and Ali, a courier who doesn't have it. */
  async function scene() {
    const karimRow = await store.createCourier({ appId: app.id, name: "Karim Mostafa", phone: "+201005556666", email: null, vehicle: "Motorbike", active: true }, NOW);
    await store.createCourier({ appId: app.id, name: "Ali Hassan", phone: "+201007778888", email: null, vehicle: null, active: true }, NOW);
    const mona = await signUp("1001112222", "Mona Adel");
    const karim = await signUp("1005556666", "Karim");
    const ali = await signUp("1007778888", "Ali");
    const stranger = await signUp("1009990000", "Someone");
    const sent = await call("POST", "/delivery/shipments", {
      query: { platform: "android" },
      token: mona.access_token,
      body: { pickup: TAHRIR, dropoff: TOWER, recipient: { name: "Mona Adel", phone: "0101 555 0000" }, package: { size: "small", description: "Documents" }, payment: "cash" },
    });
    const id = (sent.body as { shipment: { id: number } }).shipment.id;
    return { mona, karim, ali, stranger, id, courier: (karimRow as { courier: { id: number } }).courier };
  }

  const give = async (id: number, courierId: number) => {
    const shipment = (await store.getShipment(app.id, id))!;
    const courier = (await store.getCourier(app.id, courierId))!;
    await assignShipment({ store, app, now, account: null, courierAccount: null }, shipment, courier, "company");
  };
  const moveTo = async (id: number, status: "picked_up" | "on_the_way" | "delivered") =>
    moveShipment({ store, app, now, account: null, courierAccount: null }, (await store.getShipment(app.id, id))!, status, "courier");

  const write = (token: string, path: string, id: number, body: unknown) => call("POST", `${path}/contact/messages`, { params: [String(id)], token, body });
  const CUSTOMER = "/me/shipments/{shipment_id}";
  const COURIER = "/courier/jobs/{shipment_id}";

  it("lets only the job's customer and its courier talk, from the assignment on", async () => {
    const { mona, karim, ali, stranger, id, courier } = await scene();
    // No courier yet: nothing to write to.
    const early = await call("GET", `${CUSTOMER}/contact`, { params: [String(id)], token: mona.access_token });
    expect([early.status, (early.body as { code: string }).code]).toEqual([409, "no_courier"]);
    expect((await call("GET", `${COURIER}/contact`, { params: [String(id)], token: karim.access_token })).status).toBe(404);
    now = new Date(now.getTime() + 60_000);
    await give(id, courier.id);

    const thread = await call("GET", `${CUSTOMER}/contact`, { params: [String(id)], token: mona.access_token });
    expect(thread.status).toBe(200);
    expect(thread.body).toMatchObject({ me: "customer", other: { role: "courier", name: "Karim" }, open: true, closes_at: null, unread: 0, items: [], ways: { chat: true, app_call: false, phone_call: false } });
    const job = await call("GET", `${COURIER}/contact`, { params: [String(id)], token: karim.access_token });
    // First names only, and no number anywhere.
    expect(job.body).toMatchObject({ me: "courier", other: { role: "customer", name: "Mona" } });
    expect(JSON.stringify([thread.body, job.body])).not.toMatch(/\+20|1001112222|5556666/);

    // Nobody else: another customer, a courier without the job, no sign-in.
    expect((await call("GET", `${CUSTOMER}/contact`, { params: [String(id)], token: stranger.access_token })).status).toBe(404);
    expect((await call("GET", `${COURIER}/contact`, { params: [String(id)], token: ali.access_token })).status).toBe(404);
    expect((await call("GET", `${COURIER}/contact`, { params: [String(id)], token: stranger.access_token })).status).toBe(403);
    expect((await call("GET", `${CUSTOMER}/contact`, { params: [String(id)] })).status).toBe(401);
    expect((await write(ali.access_token, COURIER, id, { kind: "text", text: "Hello" })).status).toBe(404);
    expect((await write(stranger.access_token, CUSTOMER, id, { kind: "text", text: "Hello" })).status).toBe(404);

    // The job's own JSON carries the ways, the waiting one's doesn't.
    const mine = (await call("GET", "/courier/jobs/{shipment_id}", { params: [String(id)], token: karim.access_token })).body as { contact: unknown };
    expect(mine.contact).toEqual({ chat: true, app_call: false, phone_call: false, chat_until: null });
    const shipment = (await call("GET", "/me/shipments/{shipment_id}", { params: [String(id)], token: mona.access_token })).body as { contact: unknown };
    expect(shipment.contact).toEqual({ chat: true, app_call: false, phone_call: false, chat_until: null });
  });

  it("sends, polls, reads and pushes, once per client_id, each side in its own words", async () => {
    const { mona, karim, id, courier } = await scene();
    await give(id, courier.id);
    pushes = [];
    const first = await write(karim.access_token, COURIER, id, { kind: "text", text: "Hello Mona, I have your parcel.", client_id: "k-1" });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ from: "courier", mine: true, kind: "text", text: "Hello Mona, I have your parcel.", client_id: "k-1" });
    // Sent again after a failed try: kept once.
    const again = await write(karim.access_token, COURIER, id, { kind: "text", text: "Hello Mona, I have your parcel.", client_id: "k-1" });
    expect([again.status, (again.body as { id: number }).id]).toEqual([200, (first.body as { id: number }).id]);
    expect(pushes).toHaveLength(1);
    expect(pushes[0]!.tokens).toEqual(["push-1001112222"]);
    expect(pushes[0]!.message.title).toBe("Karim, your courier");
    expect(pushes[0]!.message.data).toMatchObject({ type: "contact_message", shipment_id: String(id), to: "customer" });
    // Never in the inbox.
    const inbox = await store.listHostedNotifications({ appId: app.id, userId: mona.user.id, since: new Date(0), page: 1, perPage: 20 });
    expect(inbox.items.some((n) => n.data?.type === "contact_message")).toBe(false);

    const seen = await call("GET", `${CUSTOMER}/contact`, { params: [String(id)], token: mona.access_token });
    expect(seen.body).toMatchObject({ unread: 1, items: [{ from: "courier", mine: false }] });
    const quick = await write(mona.access_token, CUSTOMER, id, { kind: "quick", quick: "leave_at_door", client_id: "m-1" });
    expect(quick.body).toMatchObject({ kind: "quick", quick: "leave_at_door", text: null });
    // The courier's push is in the courier's own words.
    expect(pushes[1]!.message).toMatchObject({ title: "Mona, your customer", body: "Leave it at the door", data: { to: "courier" } });
    const place = await write(mona.access_token, CUSTOMER, id, { kind: "location", location: { lat: 30.046, lng: 31.224 }, text: "Side entrance" });
    expect(place.body).toMatchObject({ kind: "location", location: { lat: 30.046, lng: 31.224 }, text: "Side entrance" });

    // Polling after the last one the courier has.
    const firstId = (first.body as { id: number }).id;
    const newer = await call("GET", `${COURIER}/contact/messages`, { params: [String(id)], token: karim.access_token, query: { after: String(firstId) } });
    expect((newer.body as { items: { kind: string; mine: boolean }[] }).items.map((m) => [m.kind, m.mine])).toEqual([["quick", false], ["location", false]]);
    // Writing counted as reading for Mona; Karim reads, and Mona sees it.
    const lastId = (place.body as { id: number }).id;
    expect((await call("POST", `${COURIER}/contact/read`, { params: [String(id)], token: karim.access_token, body: { last_read_id: lastId + 1000 } })).status).toBe(204);
    const after = (await call("GET", `${CUSTOMER}/contact/messages`, { params: [String(id)], token: mona.access_token })).body as { read: { other_last_read_id: number; my_last_read_id: number } };
    expect(after.read).toMatchObject({ other_last_read_id: lastId, my_last_read_id: lastId });
    // Never back.
    await call("POST", `${COURIER}/contact/read`, { params: [String(id)], token: karim.access_token, body: { last_read_id: 1 } });
    expect(((await call("GET", `${CUSTOMER}/contact/messages`, { params: [String(id)], token: mona.access_token })).body as { read: { other_last_read_id: number } }).read.other_last_read_id).toBe(lastId);
    // Refused: a reply that isn't hers, nothing to say, a bad read.
    expect((await write(mona.access_token, CUSTOMER, id, { kind: "quick", quick: "at_door" })).status).toBe(400);
    expect((await write(mona.access_token, CUSTOMER, id, { kind: "text", text: "" })).status).toBe(400);
    expect((await call("POST", `${CUSTOMER}/contact/read`, { params: [String(id)], token: mona.access_token, body: {} })).status).toBe(400);
  });

  it("closes 2 hours after delivery: the courier loses it, the customer keeps reading", async () => {
    const { mona, karim, id, courier } = await scene();
    await give(id, courier.id);
    await write(mona.access_token, CUSTOMER, id, { kind: "text", text: "Thank you" });
    await moveTo(id, "picked_up");
    await moveTo(id, "on_the_way");
    await moveTo(id, "delivered");
    // Delivered 1 hour 59 minutes ago (dated back: the sign-ins' tokens stay fresh).
    const deliveredAt = (minutesAgo: number) => async () => {
      const job = (await store.getShipment(app.id, id))!;
      const at = new Date(now.getTime() - minutesAgo * 60_000).toISOString();
      await store.updateShipment(app.id, id, { timeline: job.timeline.map((s) => (s.status === "delivered" ? { ...s, at } : s)) });
    };
    await deliveredAt(CHAT_AFTER_MS / 60_000 - 1)();
    const open = (await call("GET", `${CUSTOMER}/contact`, { params: [String(id)], token: mona.access_token })).body as { open: boolean; closes_at: string; ways: { chat_until: string } };
    expect(open.open).toBe(true);
    expect(open.ways.chat_until).toBe(open.closes_at);
    expect((await write(karim.access_token, COURIER, id, { kind: "quick", quick: "left_at_door" })).status).toBe(201);
    await deliveredAt(CHAT_AFTER_MS / 60_000)();
    const closed = await write(mona.access_token, CUSTOMER, id, { kind: "text", text: "One more thing" });
    expect([closed.status, (closed.body as { code: string }).code]).toEqual([409, "contact_closed"]);
    const kept = (await call("GET", `${CUSTOMER}/contact`, { params: [String(id)], token: mona.access_token })).body as { open: boolean; items: unknown[]; ways: { chat: boolean } };
    expect([kept.open, kept.items.length, kept.ways.chat]).toEqual([false, 2, false]);
    expect((await call("GET", `${COURIER}/contact`, { params: [String(id)], token: karim.access_token })).status).toBe(404);
  });

  it("gives a new courier a new conversation, and stops when the owner switches chat off", async () => {
    const { mona, karim, ali, id, courier } = await scene();
    await give(id, courier.id);
    await write(mona.access_token, CUSTOMER, id, { kind: "text", text: "Ring twice please" });
    const aliCourier = (await store.findCourier(app.id, { phone: "+201007778888", email: null }))!;
    now = new Date(now.getTime() + 60_000);
    await give(id, aliCourier.id);
    // Ali doesn't read what Mona told Karim, and Karim has no job any more.
    expect(((await call("GET", `${COURIER}/contact`, { params: [String(id)], token: ali.access_token })).body as { items: unknown[] }).items).toEqual([]);
    expect((await call("GET", `${COURIER}/contact`, { params: [String(id)], token: karim.access_token })).status).toBe(404);
    await store.saveContactSettings({ appId: app.id, chat: false, appCall: false, phoneCall: false, updatedAt: now });
    const off = await call("GET", `${CUSTOMER}/contact`, { params: [String(id)], token: mona.access_token });
    expect([off.status, (off.body as { code: string }).code]).toEqual([403, "contact_off"]);
    expect(((await call("GET", "/me/shipments/{shipment_id}", { params: [String(id)], token: mona.access_token })).body as { contact: { chat: boolean } }).contact.chat).toBe(false);
  });

  it("keeps each app's threads its own", async () => {
    const { mona, id, courier } = await scene();
    await give(id, courier.id);
    await write(mona.access_token, CUSTOMER, id, { kind: "text", text: "Hello" });
    expect(await store.listContactMessages("another-app", id, { limit: 50 })).toEqual([]);
    expect(await store.listContactReads("another-app", id)).toEqual([]);
  });
});
