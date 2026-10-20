import { beforeEach, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import { newApp } from "@/lib/app/setup";
import { DEFAULT_FULFILMENT } from "@/lib/catalog/fulfilment";
import { encryptOwnPayment } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogOrder, type Client, type User } from "@/lib/data/types";
import { qrPayload, ticketKey } from "@/lib/events/codes";
import type { sendPush } from "@/lib/hosted/push";
import type { MediaStorage } from "@/lib/media/storage";
import type { OwnerDeps } from "@/lib/owner/http";
import { acceptedLang, ownerLang } from "@/lib/owner/lang";
import { handleOwner } from "@/lib/owner/service";
import { accessKey, createAccessToken, newRefreshToken, readAccessToken, refreshHash } from "@/lib/owner/tokens";
import { expectOwnerContract } from "./owner-contract";
import { KEY, NOW, days } from "./helpers";

/** 58 The Owner API (Yallapp Business): tokens, sign-in, scoping and each group's core, checked against docs/api/owner.yaml. */

const SECRET = "test-signing-secret-0123456789abcdef0123456789";
const PASSWORD = "a-long-owner-password";
const HOUR = 3_600_000;

interface Pushed {
  targets: unknown[];
  title: string;
  body: string;
  data: Record<string, string>;
}

class FakeMedia implements MediaStorage {
  mode = "fs" as const;
  complete = new Set<string>();
  link(op: string, key: string) {
    return { url: `https://yallapp.test/media/${op}/${key}?sig=x`, expiresAt: new Date(NOW.getTime() + HOUR) };
  }
  async stat(key: string) {
    return { exists: this.complete.has(key), complete: this.complete.has(key), size: this.complete.has(key) ? 1024 : 0 };
  }
  async delete() {}
}

async function owner(store: MemoryStore, email: string, plan: "growth" | "pro" = "pro"): Promise<{ user: User; client: Client }> {
  const { user, client } = await registerClient(store, { name: "Leyla Kaya", email, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  await store.updateUser(user.id, { passwordHash: await hashPassword(PASSWORD) }, NOW);
  await activateClient(store, { clientId: client.id, plan, activeUntil: days(30), paymentNote: "bank transfer" }, KEY, NOW);
  return { user: (await store.getUserById(user.id))!, client: (await store.getClientById(client.id))! };
}

async function addApp(store: MemoryStore, client: Client, app: Partial<App> & Pick<App, "appType">): Promise<App> {
  const base = newApp(client.id, null, NOW, app.appType, app.vertical ?? null);
  const full: App = { ...base, backend: "hosted", websiteDoneAt: NOW, ...app };
  await store.createApp(full);
  // Each app has its own license (the first app takes the one given before it).
  if (!(await store.getLicenseForApp(client.id, full.id))) {
    await activateClient(store, { clientId: client.id, appId: full.id, plan: "pro", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
  }
  return full;
}

async function paidOrder(store: MemoryStore, app: App, options: { at?: Date; totalCents?: number; fulfilment?: boolean } = {}): Promise<CatalogOrder> {
  const at = options.at ?? NOW;
  const total = options.totalCents ?? 25000;
  const order = await store.createCatalogOrder({
    appId: app.id,
    tokenHash: sha256Hex(`order-${Math.random()}`),
    userId: null,
    status: "pending",
    lines: [{ productId: 999, name: "Burger", quantity: 1, unitCents: total, imageAssetId: null, digital: false }],
    subtotalCents: total,
    shippingCents: 0,
    totalCents: total,
    currency: "TRY",
    customer: { name: "Mona Hassan", phone: "+201001234567", email: "mona@example.com", city: "Cairo", address: "12 Tahrir St" },
    paymentId: null,
    createdAt: at,
    paidAt: null,
    updatedAt: at,
    commissionCents: null,
    itemTransactionIds: null,
    payoutApprovedAt: null,
    paymentProvider: "fawaterk",
    providerRef: "5001",
    ...(options.fulfilment ? { fulfilment: { type: "pickup" as const, scheduledFor: null, address: null, area: null, notes: null, feeCents: 0 }, fulfilmentStatus: "received" as const } : {}),
  } as Omit<CatalogOrder, "id">);
  await store.payCatalogOrder(app.id, order.id, "PAY-1", at);
  return (await store.getCatalogOrder(app.id, order.id))!;
}

describe("58 owner tokens and languages", () => {
  it("signs access tokens for one device, refuses changed and ended ones", () => {
    const key = accessKey(SECRET);
    const id = "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
    const { token, expiresAt } = createAccessToken(id, key, NOW);
    expect(expiresAt.getTime() - NOW.getTime()).toBe(15 * 60_000);
    expect(readAccessToken(token, key, NOW)).toBe(id);
    expect(readAccessToken(`${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`, key, NOW)).toBeNull();
    expect(readAccessToken(token.replace(id, "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e50"), key, NOW)).toBeNull();
    expect(readAccessToken(token, accessKey("another-secret"), NOW)).toBeNull();
    expect(readAccessToken(token, key, new Date(expiresAt.getTime() + 1))).toBeNull();
    expect(readAccessToken("Bearer nonsense", key, NOW)).toBeNull();
  });

  it("keeps refresh tokens only as hashes, for 60 days", () => {
    const fresh = newRefreshToken(NOW);
    expect(fresh.token).toMatch(/^yor1_[A-Za-z0-9_-]{43}$/);
    expect(fresh.hash).toBe(sha256Hex(fresh.token));
    expect(fresh.hash).not.toContain(fresh.token);
    expect(fresh.expiresAt.getTime() - NOW.getTime()).toBe(60 * 86_400_000);
    expect(refreshHash("not-ours")).toBeNull();
    expect(refreshHash(42)).toBeNull();
  });

  it("speaks the person's language, else the request's, else English", () => {
    expect(acceptedLang("tr-TR,tr;q=0.9,en;q=0.8")).toBe("tr");
    expect(acceptedLang("de-DE, ar;q=0.5, en;q=0.4")).toBe("ar");
    expect(acceptedLang("de, fr")).toBeNull();
    expect(acceptedLang("en;q=0, ar")).toBe("ar");
    expect(ownerLang("ar", "tr")).toBe("ar");
    expect(ownerLang(null, null, "tr")).toBe("tr");
    expect(ownerLang("xx", undefined)).toBe("en");
  });
});

describe("58 the Owner API", () => {
  let store: MemoryStore;
  let user: User;
  let client: Client;
  let kitchen: App;
  let shop: App;
  let clinic: App;
  let gala: App;
  let school: App;
  let theirs: App;
  let now: Date;
  let pushes: Pushed[];
  let media: FakeMedia;

  const send = (async (_account, targets, message) => {
    pushes.push({ targets, ...message });
    return { sent: targets.length, invalidTokens: [] };
  }) as typeof sendPush;

  function deps(ip = "198.51.100.7"): OwnerDeps {
    return {
      store,
      now,
      ip,
      signingSecret: SECRET,
      encryptionKey: KEY,
      baseUrl: "https://yallapp.test",
      paymentUrls: {},
      media,
      mail: async () => undefined,
      sendPush: send,
    };
  }

  /** Calls the API as Yallapp Business does; `route` is the contract's path, checked against it. */
  async function call(method: string, route: string, options: { params?: Record<string, string | number>; token?: string | null; body?: unknown; query?: Record<string, string>; lang?: string; ip?: string; check?: boolean } = {}) {
    const path = route.replace(/\{(\w+)\}/g, (_, name: string) => String(options.params?.[name] ?? `{${name}}`));
    const result = await handleOwner(deps(options.ip), {
      method,
      path: path.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
      acceptLanguage: options.lang ?? null,
    });
    if (options.check !== false) expectOwnerContract(method, route, result);
    return result as { status: number; body: Record<string, unknown> & { [key: string]: never } };
  }

  async function signIn(email = "leyla@cafe.test", device = "Pixel 8") {
    const result = await call("POST", "/auth/sign-in", { body: { email, password: PASSWORD, device: { name: device, platform: "android", app_version: "1.0.0" } } });
    expect(result.status).toBe(200);
    return result.body as unknown as { access_token: string; refresh_token: string; device_id: string; account_state: string };
  }

  beforeEach(async () => {
    store = new MemoryStore();
    now = NOW;
    pushes = [];
    media = new FakeMedia();
    ({ user, client } = await owner(store, "leyla@cafe.test"));
    kitchen = await addApp(store, client, {
      appType: "store",
      vertical: "restaurant",
      appName: "Moda Café",
      connector: { kind: "catalog" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, fulfilment: DEFAULT_FULFILMENT },
    });
    shop = await addApp(store, client, { appType: "store", appName: "Leyla Shop", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } });
    shop = { ...shop, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: encryptOwnPayment(shop.id, { provider: "fawaterk", apiKey: "fw-key", sandbox: true }, KEY) } };
    await store.updateApp(shop.id, { catalogSettings: shop.catalogSettings }, NOW);
    clinic = await addApp(store, client, { appType: "booking", vertical: "clinic", appName: "Nile Clinic", connector: { kind: "bookings" } });
    gala = await addApp(store, client, { appType: "events", appName: "Gala Nights", connector: { kind: "events" } });
    school = await addApp(store, client, { appType: "lms", appName: "Nour Academy", connector: { kind: "courses" } });
    const other = await owner(store, "someone@else.test");
    theirs = await addApp(store, other.client, { appType: "store", appName: "Not yours", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS } });
  });

  describe("sign-in and the device's tokens", () => {
    it("signs in with the dashboard's email and password, as a device of its own", async () => {
      const session = await signIn();
      expect(session.account_state).toBe("active");
      const [device] = await store.listOwnerDevices(user.id);
      expect(device).toMatchObject({ id: session.device_id, name: "Pixel 8", platform: "android", appVersion: "1.0.0", clientId: client.id });
      // Only the hash is kept.
      expect(device!.refreshHash).toBe(sha256Hex(session.refresh_token));
      expect(JSON.stringify(device)).not.toContain(session.refresh_token);
      const me = await call("GET", "/me", { token: session.access_token });
      expect(me.status).toBe(200);
      expect((me.body.apps as unknown as { name: string }[]).map((a) => a.name).sort()).toEqual(["Gala Nights", "Leyla Shop", "Moda Café", "Nile Clinic", "Nour Academy"]);
    });

    it("refuses a wrong password in the request's language, and counts with the website's limits", async () => {
      const wrong = await call("POST", "/auth/sign-in", { body: { email: "leyla@cafe.test", password: "nope", device: { name: "Pixel", platform: "android" } }, lang: "ar" });
      expect(wrong).toMatchObject({ status: 401, body: { code: "invalid_credentials", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." } });
      for (let i = 0; i < 7; i += 1) await call("POST", "/auth/sign-in", { body: { email: "leyla@cafe.test", password: "nope", device: { name: "Pixel", platform: "android" } } });
      const limited = await call("POST", "/auth/sign-in", { body: { email: "leyla@cafe.test", password: PASSWORD, device: { name: "Pixel", platform: "android" } } });
      expect(limited).toMatchObject({ status: 429, body: { code: "rate_limited" } });
      expect(limited.body.retry_after_seconds).toBeGreaterThan(0);
    });

    it("checks the device it is given", async () => {
      const result = await call("POST", "/auth/sign-in", { body: { email: "leyla@cafe.test", password: PASSWORD, device: { name: "", platform: "windows" } } });
      expect(result).toMatchObject({ status: 400, body: { code: "invalid_request", errors: { "device.name": expect.any(String), "device.platform": "Choose Android or iPhone." } } });
    });

    it("sends Yallapp's own team to the website", async () => {
      const staff = await store.createUser({ email: "team@yallapp.test", name: "Team", passwordHash: await hashPassword(PASSWORD), now: NOW });
      await store.saveAdminMember({ userId: staff.id, role: "support", invitedBy: null, createdAt: NOW, updatedAt: NOW } as never);
      const result = await call("POST", "/auth/sign-in", { body: { email: "team@yallapp.test", password: PASSWORD, device: { name: "Pixel", platform: "android" } } });
      expect(result).toMatchObject({ status: 403, body: { code: "use_website" } });
    });

    it("lets a pending account see its state and nothing else", async () => {
      const { user: waiting } = await registerClient(store, { name: "Waiting", email: "wait@ing.test", whatsapp: "+201001112223", siteUrl: "", password: null }, NOW);
      await store.updateUser(waiting.id, { passwordHash: await hashPassword(PASSWORD) }, NOW);
      const session = await signIn("wait@ing.test");
      expect(session.account_state).toBe("pending");
      const me = await call("GET", "/me", { token: session.access_token });
      expect(me.body).toMatchObject({ account: { state: "pending", message: expect.stringContaining("waiting for activation") }, apps: [] });
      expect(await call("GET", "/updates", { token: session.access_token })).toMatchObject({ status: 403, body: { code: "account_pending" } });
      expect(await call("GET", "/apps/{app_id}/today", { token: session.access_token, params: { app_id: kitchen.id } })).toMatchObject({ status: 403 });
    });

    it("renews with a new refresh token each time; the old one and a changed password stop it", async () => {
      const first = await signIn();
      now = new Date(NOW.getTime() + 20 * 60_000);
      // The access token ended after 15 minutes.
      expect((await call("GET", "/me", { token: first.access_token })).status).toBe(401);
      const renewed = await call("POST", "/auth/refresh", { body: { refresh_token: first.refresh_token } });
      expect(renewed.status).toBe(200);
      const second = renewed.body as unknown as { access_token: string; refresh_token: string; device_id: string };
      expect(second.device_id).toBe(first.device_id);
      expect((await call("GET", "/me", { token: second.access_token })).status).toBe(200);
      expect(await call("POST", "/auth/refresh", { body: { refresh_token: first.refresh_token } })).toMatchObject({ status: 401, body: { code: "invalid_token" } });
      expect(await call("POST", "/auth/refresh", { body: { refresh_token: "yor1_madeup" } })).toMatchObject({ status: 401 });
      // A password change signs every device out.
      await store.updateUser(user.id, { sessionVersion: user.sessionVersion + 1 }, now);
      expect((await call("GET", "/me", { token: second.access_token })).status).toBe(401);
      expect((await call("POST", "/auth/refresh", { body: { refresh_token: second.refresh_token } })).status).toBe(401);
      expect(await store.listOwnerDevices(user.id)).toEqual([]);
    });

    it("ends a refresh token after 60 days", async () => {
      const session = await signIn();
      now = days(61);
      expect((await call("POST", "/auth/refresh", { body: { refresh_token: session.refresh_token } })).status).toBe(401);
    });

    it("lists the devices, signs one out, this one, or all of them", async () => {
      const pixel = await signIn("leyla@cafe.test", "Pixel 8");
      const iphone = await signIn("leyla@cafe.test", "iPhone");
      const list = await call("GET", "/me/devices", { token: pixel.access_token });
      expect((list.body.items as unknown as { name: string; current: boolean }[]).map((d) => [d.name, d.current]).sort()).toEqual([
        ["Pixel 8", true],
        ["iPhone", false],
      ]);
      expect((await call("DELETE", "/me/devices/{device_id}", { token: pixel.access_token, params: { device_id: iphone.device_id } })).status).toBe(204);
      expect((await call("GET", "/me", { token: iphone.access_token })).status).toBe(401);
      expect((await call("POST", "/auth/sign-out", { token: pixel.access_token })).status).toBe(204);
      expect((await call("GET", "/me", { token: pixel.access_token })).status).toBe(401);
      const a = await signIn();
      const b = await signIn();
      expect((await call("POST", "/auth/sign-out-all", { token: a.access_token })).status).toBe(204);
      expect((await call("GET", "/me", { token: b.access_token })).status).toBe(401);
    });

    it("never lets one person sign out another's device", async () => {
      const mine = await signIn();
      const theirSession = await signIn("someone@else.test");
      expect((await call("DELETE", "/me/devices/{device_id}", { token: mine.access_token, params: { device_id: theirSession.device_id } })).status).toBe(404);
      expect((await call("GET", "/me", { token: theirSession.access_token })).status).toBe(200);
    });

    it("keeps at most 10 devices, signing out the one used longest ago", async () => {
      const first = await signIn();
      for (let i = 0; i < 10; i += 1) {
        // Past the sign-in limit's 15 minutes each time.
        now = new Date(NOW.getTime() + (i + 1) * 16 * 60_000);
        await signIn("leyla@cafe.test", `Phone ${i}`);
      }
      expect(await store.listOwnerDevices(user.id)).toHaveLength(10);
      expect(await store.getOwnerDevice(first.device_id)).toBeNull();
    });

    it("links to the website's password reset in the request's language", async () => {
      expect((await call("GET", "/auth/password-reset", { lang: "tr" })).body).toEqual({ url: "https://yallapp.test/tr/forgot-password" });
    });
  });

  describe("scope", () => {
    it("refuses another client's app on every path, and paths the app doesn't have", async () => {
      const { access_token: token } = await signIn();
      const ids = { app_id: theirs.id, order_id: 1, appointment_id: 1, product_id: 1, course_id: 1, topic_id: 1, article_id: 1, listing_id: 1, media_id: "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f", inquiry_id: 1, scheduled_id: 1 };
      const contract = (await import("yaml")).parse((await import("node:fs")).readFileSync(new URL("../../../../docs/api/owner.yaml", import.meta.url), "utf8")) as { paths: Record<string, Record<string, unknown>> };
      let checked = 0;
      for (const [route, operations] of Object.entries(contract.paths)) {
        if (!route.startsWith("/apps/")) continue;
        for (const method of Object.keys(operations)) {
          const result = await call(method.toUpperCase(), route, { token, params: ids, body: {} });
          expect(result, `${method} ${route}`).toMatchObject({ status: 404, body: { code: "not_found" } });
          checked += 1;
        }
      }
      expect(checked).toBeGreaterThan(30);
      // A restaurant has no appointments; a clinic no kitchen.
      expect(await call("GET", "/apps/{app_id}/appointments", { token, params: { app_id: kitchen.id } })).toMatchObject({ status: 404, body: { code: "not_available" } });
      expect(await call("GET", "/apps/{app_id}/products", { token, params: { app_id: clinic.id } })).toMatchObject({ status: 404, body: { code: "not_available" } });
    });

    it("says what each app has, as the dashboard's menu", async () => {
      const { access_token: token } = await signIn();
      const me = await call("GET", "/me", { token });
      const features = Object.fromEntries((me.body.apps as unknown as { name: string; features: Record<string, boolean> }[]).map((a) => [a.name, a.features]));
      expect(features["Moda Café"]).toMatchObject({ orders: true, kitchen: true, products: true, appointments: false, app_users: true });
      expect(features["Nile Clinic"]).toMatchObject({ appointments: true, products: false, kitchen: false });
      expect(features["Gala Nights"]).toMatchObject({ events: true, check_in: true, orders: true });
      expect(features["Nour Academy"]).toMatchObject({ courses: true, orders: true, donations: false });
    });

    it("needs a token for everything but signing in", async () => {
      expect(await call("GET", "/me")).toMatchObject({ status: 401, body: { code: "invalid_token" } });
      expect(await call("GET", "/apps/{app_id}/orders", { params: { app_id: kitchen.id } })).toMatchObject({ status: 401 });
    });
  });

  describe("orders", () => {
    it("moves a restaurant's order through the kitchen and tells the customer", async () => {
      const { access_token: token } = await signIn();
      const order = await paidOrder(store, kitchen, { fulfilment: true });
      const list = await call("GET", "/apps/{app_id}/orders", { token, params: { app_id: kitchen.id } });
      expect(list.body).toMatchObject({ total: 1, items: [{ id: order.id, status: "processing", kitchen: { step: "received" }, next_statuses: ["preparing", "cancelled"] }] });
      const preparing = await call("POST", "/apps/{app_id}/orders/{order_id}/status", { token, params: { app_id: kitchen.id, order_id: order.id }, body: { status: "preparing" } });
      expect(preparing.body).toMatchObject({ kitchen: { step: "preparing" }, next_statuses: ["ready", "cancelled"] });
      // Not a step of a pickup order.
      expect(await call("POST", "/apps/{app_id}/orders/{order_id}/status", { token, params: { app_id: kitchen.id, order_id: order.id }, body: { status: "out_for_delivery" } })).toMatchObject({
        status: 409,
        body: { code: "invalid_status" },
      });
      await call("POST", "/apps/{app_id}/orders/{order_id}/status", { token, params: { app_id: kitchen.id, order_id: order.id }, body: { status: "ready" } });
      const done = await call("POST", "/apps/{app_id}/orders/{order_id}/status", { token, params: { app_id: kitchen.id, order_id: order.id }, body: { status: "completed" } });
      expect(done.body).toMatchObject({ status: "completed", kitchen: { step: "completed" }, next_statuses: [] });
    });

    it("completes a shop's order once, and refunds it with the dashboard's rules", async () => {
      const { access_token: token } = await signIn();
      const order = await paidOrder(store, shop, { totalCents: 40000 });
      const params = { app_id: shop.id, order_id: order.id };
      const detail = await call("GET", "/apps/{app_id}/orders/{order_id}", { token, params });
      expect(detail.body).toMatchObject({ next_statuses: ["completed", "cancelled"], refund: { refundable: true, by_api: false, manual: true, left: { amount_cents: 40000 } } });
      expect((await call("POST", "/apps/{app_id}/orders/{order_id}/status", { token, params, body: { status: "completed" } })).status).toBe(200);
      expect((await call("POST", "/apps/{app_id}/orders/{order_id}/status", { token, params, body: { status: "cancelled" } })).status).toBe(409);
      // More than was paid is refused; Fawaterk's refunds are recorded after the panel.
      expect(await call("POST", "/apps/{app_id}/orders/{order_id}/refunds", { token, params, body: { amount: "500", reason: "buyer_request", method: "manual" } })).toMatchObject({
        status: 400,
        body: { errors: { amount: "That's more than what's left to refund." } },
      });
      const refunded = await call("POST", "/apps/{app_id}/orders/{order_id}/refunds", { token, params, body: { amount: "150.50", reason: "buyer_request", method: "manual", reference: "FW-1" } });
      expect(refunded.status).toBe(200);
      expect(refunded.body.order).toMatchObject({ refunded: { amount_cents: 15050 }, refunds: [{ amount: { amount_cents: 15050 }, method: "manual" }] });
      // Another client's order ID in this app's path is not found.
      const foreign = await paidOrder(store, theirs);
      expect((await call("GET", "/apps/{app_id}/orders/{order_id}", { token, params: { app_id: shop.id, order_id: foreign.id } })).status).toBe(404);
    });
  });

  it("confirms and closes appointments as the dashboard does", async () => {
    const { access_token: token } = await signIn();
    const booked = (await store.createBookingAppointment({
      appId: clinic.id,
      userId: null,
      serviceId: 1,
      staffId: 1,
      serviceName: "Check-up",
      staffName: "Dr. Selim",
      customerName: "Ali",
      customerPhone: "+905301112233",
      customerEmail: null,
      startAt: new Date(NOW.getTime() + 2 * HOUR),
      endAt: new Date(NOW.getTime() + 3 * HOUR),
      status: "pending",
      priceCents: 50000,
      currency: "TRY",
      notes: null,
      answers: [{ id: "q1", label: "Allergies", value: "None" }],
      createdAt: NOW,
      updatedAt: NOW,
    }))!;
    const today = await call("GET", "/apps/{app_id}/appointments", { token, params: { app_id: clinic.id }, query: { scope: "today" } });
    expect(today.body).toMatchObject({ total: 1, items: [{ id: booked.id, status: "pending", next_statuses: ["approved", "rejected"], answers: [{ label: "Allergies" }] }] });
    const params = { app_id: clinic.id, appointment_id: booked.id };
    expect((await call("POST", "/apps/{app_id}/appointments/{appointment_id}/status", { token, params, body: { status: "approved" } })).body).toMatchObject({ status: "approved" });
    expect((await call("POST", "/apps/{app_id}/appointments/{appointment_id}/status", { token, params, body: { status: "rejected" } })).status).toBe(409);
    const needs = await call("GET", "/apps/{app_id}/today", { token, params: { app_id: clinic.id } });
    expect(needs.body.counts).toMatchObject({ appointments: 1 });
  });

  it("checks tickets in at the door once, with the dashboard's words", async () => {
    const { access_token: token } = await signIn();
    const event = await store.createEvent(
      {
        appId: gala.id,
        title: "Autumn Gala",
        description: "",
        category: null,
        imageAssetIds: [],
        startAt: new Date(NOW.getTime() + HOUR),
        endAt: new Date(NOW.getTime() + 4 * HOUR),
        venueName: "Main Hall",
        venueAddress: null,
        latitude: null,
        longitude: null,
        onlineUrl: null,
        organiser: null,
        capacity: 100,
        status: "published",
        publishedAt: NOW,
      },
      NOW,
    );
    const type = await store.createTicketType({ appId: gala.id, eventId: event.id, name: "Standard", priceCents: 0, capacity: null, saleEndsAt: null, maxPerOrder: 4, position: 0 }, NOW);
    const claim = await store.claimTickets({ appId: gala.id, eventId: event.id, ticketTypeId: type.id, userId: null, orderId: null, tickets: [{ code: "ABCDEFGHJKLM", holderName: "Ayşe" }], priceCents: 0, status: "valid", holdUntil: null, now: NOW });
    expect(claim.ok).toBe(true);
    const code = qrPayload(ticketKey(SECRET, gala.id), gala.id, "ABCDEFGHJKLM");
    const params = { app_id: gala.id };
    const first = await call("POST", "/apps/{app_id}/check-in", { token, params, body: { code, event_id: event.id } });
    expect(first.body).toMatchObject({ outcome: "admitted", admitted: true, ticket: { holder_name: "Ayşe", event_title: "Autumn Gala" } });
    const again = await call("POST", "/apps/{app_id}/check-in", { token, params, body: { code }, lang: "tr" });
    expect(again.body).toMatchObject({ outcome: "used", admitted: false });
    expect(await call("POST", "/apps/{app_id}/check-in", { token, params, body: { code: `${code.slice(0, -2)}xx` } })).toMatchObject({ body: { outcome: "forged" } });
    // Another app's key never lets a ticket in here.
    expect((await call("POST", "/apps/{app_id}/check-in", { token, params, body: { code: qrPayload(ticketKey(SECRET, theirs.id), theirs.id, "ABCDEFGHJKLM") } })).body).toMatchObject({ admitted: false });
    const events = await call("GET", "/apps/{app_id}/events", { token, params });
    expect(events.body).toMatchObject({ items: [{ id: event.id, tickets: { valid: 0, used: 1, capacity: 100 } }] });
  });

  it("adds a lesson with a video from Media and publishes the course", async () => {
    const { access_token: token } = await signIn();
    await store.updateApp(
      school.id,
      { courseSetup: { currency: "TRY", categories: [], nextId: 3, courses: [{ id: 1, title: "Arabic 101", description: "", imageAssetId: null, priceCents: 0, categoryIds: [], instructorName: null, level: null, active: false, createdAt: NOW.toISOString(), topics: [{ id: 2, title: "Week 1", lessons: [] }] }] } },
      NOW,
    );
    const params = { app_id: school.id };
    const upload = await call("POST", "/apps/{app_id}/media/uploads", { token, params, body: { name: "lesson.mp4", size: 1024, type: "video/mp4" } });
    expect(upload.status).toBe(201);
    const id = (upload.body as unknown as { id: string }).id;
    // Not finished yet.
    expect(await call("POST", "/apps/{app_id}/media/uploads/{media_id}/complete", { token, params: { ...params, media_id: id } })).toMatchObject({ status: 409, body: { code: "incomplete" } });
    // A file still uploading isn't a lesson's video.
    expect((await call("POST", "/apps/{app_id}/courses/{course_id}/topics/{topic_id}/lessons", { token, params: { ...params, course_id: 1, topic_id: 2 }, body: { title: "Greetings", video_media_id: id } })).status).toBe(400);
    media.complete.add((await store.getMediaFile(school.id, id))!.storageKey);
    expect((await call("POST", "/apps/{app_id}/media/uploads/{media_id}/complete", { token, params: { ...params, media_id: id } })).body).toMatchObject({ status: "ready", link: `https://yallapp.test/m/${id}` });
    const added = await call("POST", "/apps/{app_id}/courses/{course_id}/topics/{topic_id}/lessons", { token, params: { ...params, course_id: 1, topic_id: 2 }, body: { title: "Greetings", video_media_id: id, duration_minutes: 12 } });
    expect(added.status).toBe(201);
    expect(added.body).toMatchObject({ topics: [{ lessons: [{ title: "Greetings", video: "media", media_id: id, duration_minutes: 12 }] }] });
    expect((await store.getAppById(school.id))!.courseSetup!.courses[0]!.topics[0]!.lessons[0]!.videoUrl).toBe(`https://yallapp.test/m/${id}`);
    // The lesson form's rules.
    expect(await call("POST", "/apps/{app_id}/courses/{course_id}/topics/{topic_id}/lessons", { token, params: { ...params, course_id: 1, topic_id: 2 }, body: { title: "x" } })).toMatchObject({ status: 400, body: { errors: { title: expect.any(String) } } });
    expect((await call("POST", "/apps/{app_id}/courses/{course_id}/topics/{topic_id}/lessons", { token, params: { ...params, course_id: 1, topic_id: 9 }, body: { title: "Lost" } })).status).toBe(404);
    const published = await call("PATCH", "/apps/{app_id}/courses/{course_id}", { token, params: { ...params, course_id: 1 }, body: { published: true } });
    expect(published.body).toMatchObject({ published: true });
    // Another app's file isn't this app's video.
    const foreign = await call("POST", "/apps/{app_id}/media/uploads", { token: (await signIn("someone@else.test")).access_token, params: { app_id: theirs.id }, body: { name: "x.mp4", size: 10, type: "video/mp4" } });
    expect((await call("POST", "/apps/{app_id}/courses/{course_id}/topics/{topic_id}/lessons", { token, params: { ...params, course_id: 1, topic_id: 2 }, body: { title: "Theirs", video_media_id: (foreign.body as unknown as { id: string }).id } })).status).toBe(400);
  });

  it("edits a product's price, stock and availability with the product form's rules", async () => {
    const { access_token: token } = await signIn();
    const product = await store.createCatalogProduct(
      { appId: kitchen.id, name: "Falafel wrap", description: "", priceCents: 12000, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null, optionGroups: null },
      NOW,
    );
    const params = { app_id: kitchen.id, product_id: product.id };
    expect(await call("PATCH", "/apps/{app_id}/products/{product_id}", { token, params, body: { sale_price: "150" } })).toMatchObject({ status: 400, body: { errors: { sale_price: "The sale price must be lower than the price." } } });
    expect(await call("PATCH", "/apps/{app_id}/products/{product_id}", { token, params, body: { stock: -1 } })).toMatchObject({ status: 400 });
    expect(await call("PATCH", "/apps/{app_id}/products/{product_id}", { token, params, body: {} })).toMatchObject({ status: 400 });
    const soldOut = await call("PATCH", "/apps/{app_id}/products/{product_id}", { token, params, body: { price: "135.50", stock: 0, available: false } });
    expect(soldOut.body).toMatchObject({ price: { amount_cents: 13550 }, stock: 0, available: false });
    expect(await store.getCatalogProduct(kitchen.id, product.id)).toMatchObject({ priceCents: 13550, stock: 0, active: false, name: "Falafel wrap" });
  });

  it("sends a notification to the app's users with the dashboard's limit", async () => {
    const { access_token: token } = await signIn();
    const params = { app_id: kitchen.id };
    expect(await call("POST", "/apps/{app_id}/notifications", { token, params, body: { title: "", body: "x".repeat(300) } })).toMatchObject({ status: 400, body: { errors: { title: "Enter a title.", body: "Keep the message to 240 characters." } } });
    const sent = await call("POST", "/apps/{app_id}/notifications", { token, params, body: { title: "Lunch menu", body: "Today's soup is lentil." } });
    expect(sent).toMatchObject({ status: 201, body: { pushed: 0 } });
    expect((await call("GET", "/apps/{app_id}/notifications", { token, params })).body).toMatchObject({ items: [{ title: "Lunch menu" }] });
    for (let i = 0; i < 9; i += 1) await call("POST", "/apps/{app_id}/notifications", { token, params, body: { title: `More ${i}`, body: "Hi" } });
    expect(await call("POST", "/apps/{app_id}/notifications", { token, params, body: { title: "Too many", body: "Hi" } })).toMatchObject({ status: 429, body: { code: "rate_limited" } });
  });

  it("counts today in the app's day: sales less refunds, what needs the owner", async () => {
    const { access_token: token } = await signIn();
    await paidOrder(store, kitchen, { totalCents: 30000, fulfilment: true });
    await paidOrder(store, kitchen, { totalCents: 20000, at: days(-2) });
    const today = await call("GET", "/apps/{app_id}/today", { token, params: { app_id: kitchen.id } });
    expect(today.body).toMatchObject({ date: "2026-10-12", time_zone: "Europe/Istanbul", sales: [{ amount_cents: 30000, currency: "TRY" }], counts: { orders: 1, new_users: 0, app_opens: 0 } });
    expect(today.body.needs_you).toEqual([{ kind: "orders_in_progress", count: 2, title: "2 orders in progress", notice_id: null }]);
  });

  it("speaks the language the person chose in the dashboard", async () => {
    const { access_token: token } = await signIn();
    expect(await call("PUT", "/me/language", { token, body: { language: "xx" } })).toMatchObject({ status: 400 });
    const set = await call("PUT", "/me/language", { token, body: { language: "ar" } });
    expect(set.body).toMatchObject({ user: { language: "ar" } });
    expect((await store.getUserById(user.id))!.language).toBe("ar");
    expect(await call("GET", "/apps/{app_id}/appointments", { token, params: { app_id: kitchen.id }, lang: "tr" })).toMatchObject({ body: { message: "تطبيقك لا يتضمّن هذا." } });
  });

  it("keeps the bell's read state with the dashboard's", async () => {
    const { access_token: token } = await signIn();
    await store.createOwnerNotice({ clientId: client.id, appId: kitchen.id, kind: "app_users_80", dedupeKey: "app_users_80:1", title: "Moda Café is near its app users", body: "80% used.", linkUrl: null, linkLabel: null, tone: "warn", createdAt: NOW, emailedAt: null, dismissedAt: null, resolvedAt: null });
    const list = await call("GET", "/updates", { token });
    expect(list.body).toMatchObject({ unread: 1, items: [{ kind: "account", title: "Moda Café is near its app users", unread: true }] });
    const key = (list.body.items as unknown as { key: string }[])[0]!.key;
    expect((await call("POST", "/updates/read", { token, body: { keys: [key, "announcement:not-listed"] } })).body).toEqual({ unread: 0 });
    expect(await store.listReadUpdates(user.id, [key])).toEqual([key]);
  });

  it("keeps each device's push token and choices", async () => {
    const pixel = await signIn();
    const other = await signIn("leyla@cafe.test", "Old phone");
    expect((await call("PUT", "/me/push-token", { token: other.access_token, body: { token: "fcm-123" } })).status).toBe(204);
    // The token moved to this phone.
    expect((await call("PUT", "/me/push-token", { token: pixel.access_token, body: { token: "fcm-123", provider: "fcm" } })).status).toBe(204);
    expect((await store.getOwnerDevice(other.device_id))!.pushToken).toBeNull();
    expect(await call("PUT", "/me/push-preferences", { token: pixel.access_token, body: { new_order: "no" } })).toMatchObject({ status: 400 });
    const prefs = await call("PUT", "/me/push-preferences", { token: pixel.access_token, body: { new_review: false } });
    expect(prefs.body).toMatchObject({ new_order: true, new_review: false, yallapp_updates: true });
    expect((await call("GET", "/me/push-preferences", { token: pixel.access_token })).body).toEqual(prefs.body);
  });

  it("gives a preview link for an hour, builds read-only and the plan with where to manage it", async () => {
    const { access_token: token } = await signIn();
    const params = { app_id: kitchen.id };
    expect((await call("POST", "/apps/{app_id}/preview", { token, params, body: { draft: true } })).body).toMatchObject({ url: expect.stringMatching(/^https:\/\/yallapp\.test\/preview-app\/index\.html\?token=p1\./) });
    expect((await call("GET", "/apps/{app_id}/builds", { token, params })).body).toEqual({ items: [], publishing: { mode: "self", stores: [] } });
    const license = await call("GET", "/apps/{app_id}/license", { token, params });
    expect(license.body).toMatchObject({ state: "active", plan: { id: "pro", days_left: 30 }, manage_url: `https://yallapp.test/dashboard/open/${kitchen.id}?to=license` });
    expect(JSON.stringify(license.body)).not.toMatch(/checkout|\/pay\//i);
  });
});
