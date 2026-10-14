import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { addDays, localToUtc } from "@/lib/bookings/time";
import type { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { connectorFor } from "@/lib/hosted/connectors";
import { platformConnectorConfig, platformDefinition } from "@/lib/hosted/connectors/platforms";
import {
  SIMPLYBOOK_PLATFORM,
  SimplyBookConnector,
  clearSimplyBookCache,
  normalizeApiHost,
  normalizeCompanyLogin,
  samePhone,
  type SimplyBookSettings,
} from "@/lib/hosted/connectors/simplybook";
import type { Connector } from "@/lib/hosted/connectors/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

// NOW is Monday 12 October 2026, 13:00 in Istanbul; the checks use the next Monday.
const TZ = "Europe/Istanbul";
const MONDAY = "2026-10-19";
const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };

const SETTINGS: SimplyBookSettings = {
  companyLogin: "salon",
  apiKey: "public-key",
  userLogin: "admin@salon.test",
  userKey: "user-key",
  apiHost: "user-api.simplybook.me",
};

type Raw = Record<string, unknown>;

interface FakeBooking {
  id: number;
  eventId: number;
  unitId: number;
  clientId: number;
  date: string;
  time: string;
  end: string;
  cancelled: boolean;
  comment: string | null;
}

/**
 * A SimplyBook company on the JSON-RPC API: the login service, the public
 * service (X-Token) and the admin service (X-User-Token), answering like the
 * documented methods (IDs and numbers as strings, times local to the company).
 */
class FakeSimplyBook {
  calls: { path: string; method: string; params: unknown[] }[] = [];
  down = false;
  categoriesFeature = true;
  cartesian = true;
  requireFields = "phone";
  /** The next admin book fails as if someone took the time first. */
  stealNext = false;
  private publicTokens = new Set<string>();
  private userTokens = new Set<string>();
  private tokenCount = 0;
  nextBooking = 500;
  nextClient = 100;

  readonly events: Raw[] = [
    {
      id: "1",
      name: "Haircut",
      description: '<p>A wash and a cut.</p><script>alert("x")</script><p onclick="steal()">Done in half an hour.</p>',
      duration: "30",
      price: "300.00",
      currency: "TRY",
      picture_path: "/uploads/salon/event__picture/cut.jpg",
      position: "1",
      is_active: "1",
      is_public: "1",
      unit_map: { "1": null, "2": null },
      categories: ["1"],
    },
    {
      id: "2",
      name: "Massage",
      description: "Relaxing.\n\nBook early.",
      duration: "60",
      price: "600",
      currency: "TRY",
      picture_path: null,
      position: "2",
      is_active: "1",
      is_public: "1",
      unit_map: { "2": null },
      categories: ["2"],
    },
    { id: "3", name: "Staff training", description: "", duration: "30", price: "0", currency: "TRY", position: "4", is_active: "1", is_public: "0", unit_map: [], categories: ["1"] },
    {
      id: "4",
      name: "Hair colouring",
      description: "",
      duration: "60",
      price: "0",
      currency: "TRY",
      position: "3",
      is_active: "1",
      is_public: "1",
      unit_map: { "1": "90" },
      categories: ["1"],
    },
  ];

  readonly units: Raw[] = [
    { id: "1", name: "Ayşe Kaya", description: "<p>Stylist</p>", picture_path: "/uploads/salon/unit_group__picture/ayse.jpg", position: "1", is_active: "1", is_visible: "1" },
    { id: "2", name: "Mehmet Demir", description: "", picture_path: null, position: "2", is_active: "1", is_visible: "1" },
    { id: "3", name: "Former staff", description: "", picture_path: null, position: "3", is_active: "1", is_visible: "0" },
  ];

  clients: Raw[] = [
    { id: "8", name: "Elif Şahin", email: "", phone: "0532 123 45 67" },
    // Close but not the same number.
    { id: "9", name: "Someone else", email: "", phone: "+90 532 123 45 670" },
  ];

  bookings: FakeBooking[] = [];

  count(method: string): number {
    return this.calls.filter((c) => c.method === method).length;
  }

  expireTokens() {
    this.publicTokens.clear();
    this.userTokens.clear();
  }

  private event(id: unknown) {
    return this.events.find((e) => e.id === String(id));
  }

  private providers(event: Raw): number[] {
    const map = event.unit_map as Raw | unknown[];
    const visible = this.units.filter((u) => u.is_visible === "1").map((u) => Number(u.id));
    return Array.isArray(map) || Object.keys(map).length === 0 ? visible : visible.filter((id) => String(id) in map);
  }

  private duration(event: Raw, unitId: number): number {
    const map = event.unit_map as Raw;
    const special = Array.isArray(map) ? null : map[String(unitId)];
    return special ? Number(special) : Number(event.duration);
  }

  /** Free start times of one provider on a date: Monday to Saturday 09:00 to 17:00, every 30 minutes. */
  private free(event: Raw, unitId: number, date: string): string[] {
    if (new Date(`${date}T00:00:00Z`).getUTCDay() === 0) return [];
    const length = this.duration(event, unitId);
    const out: string[] = [];
    for (let m = 9 * 60; m + length <= 17 * 60; m += 30) {
      const clash = this.bookings.some((b) => {
        if (b.cancelled || b.unitId !== unitId || b.date !== date) return false;
        const [h, mm] = b.time.split(":").map(Number) as [number, number];
        const start = h * 60 + mm;
        const end = start + this.duration(this.event(b.eventId)!, b.unitId);
        return m < end && start < m + length;
      });
      if (!clash) out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00`);
    }
    return out;
  }

  private matrix(from: string, to: string, eventId: unknown, unitId: unknown) {
    const event = this.event(eventId)!;
    const units = unitId === null ? this.providers(event) : [Number(unitId)];
    const out: Record<string, string[]> = {};
    for (let d = from; d <= to; d = addDays(d, 1)) out[d] = [...new Set(units.flatMap((u) => this.free(event, u, d)))].sort();
    return out;
  }

  private bookingRow(b: FakeBooking) {
    const event = this.event(b.eventId)!;
    const unit = this.units.find((u) => u.id === String(b.unitId))!;
    const client = this.clients.find((c) => c.id === String(b.clientId))!;
    return {
      id: String(b.id),
      code: `c${b.id}`,
      start_date: `${b.date} ${b.time}:00`,
      end_date: b.end,
      record_date: "2026-10-12 13:00:00",
      event_id: String(b.eventId),
      event: event.name,
      unit_id: String(b.unitId),
      unit: unit.name,
      client_id: String(b.clientId),
      client: client.name,
      client_phone: client.phone,
      is_confirm: b.cancelled ? "0" : "1",
    };
  }

  private publicMethod(method: string, p: unknown[]): unknown {
    switch (method) {
      case "getCompanyInfo":
        return { login: "salon", name: "Salon Lale", city: "Istanbul", timezone: TZ, timeframe: "30", show_in_client_timezone: "0" };
      case "getEventList": {
        const list = this.events.filter((e) => !p[0] || e.is_public === "1");
        return p[1] ? list : Object.fromEntries(list.map((e) => [e.id, e]));
      }
      case "getUnitList": {
        const list = this.units.filter((u) => !p[0] || u.is_visible === "1");
        return p[1] ? list : Object.fromEntries(list.map((u) => [u.id, u]));
      }
      case "getCategoriesList":
        if (!this.categoriesFeature) throw { code: -32001, message: "Plugin service_categories is not activated" };
        return { "1": { id: "1", name: "Hair", position: "1" }, "2": { id: "2", name: "Spa", position: "2" }, "3": { id: "3", name: "Empty", position: "3" } };
      case "getStartTimeMatrix":
        return this.matrix(p[0] as string, p[1] as string, p[2], p[3]);
      case "getCartesianStartTimeMatrix": {
        if (!this.cartesian) throw { code: -32601, message: "Method not found" };
        const event = this.event(p[2])!;
        return this.providers(event).map((u) => ({ provider_id: String(u), service_id: String(event.id), timeslots: this.matrix(p[0] as string, p[1] as string, p[2], u) }));
      }
      case "getAvailableUnits": {
        const event = this.event(p[0])!;
        const [date, time] = String(p[1]).split(" ") as [string, string];
        return this.providers(event).filter((u) => this.free(event, u, date).includes(time));
      }
    }
    throw { code: -32601, message: "Method not found" };
  }

  private adminMethod(method: string, p: unknown[]): unknown {
    switch (method) {
      case "getCompanyParam":
        return p[0] === "require_fields" ? this.requireFields : null;
      case "getClientList": {
        const search = String(p[0] ?? "");
        return this.clients.filter((c) => String(c.phone).replace(/\D/g, "").includes(search) || String(c.name).includes(search));
      }
      case "addClient": {
        const data = p[0] as Raw;
        if (!data.name || !data.phone) throw { code: -32602, message: "Invalid params" };
        if (this.requireFields.includes("email") && !data.email) throw { code: -32602, message: "Email is required" };
        const id = String(this.nextClient++);
        this.clients.push({ id, name: data.name, email: data.email, phone: data.phone });
        return id;
      }
      case "book": {
        const [eventId, unitId, clientId, date, time, endDate, endTime] = p as [number, number, number, string, string, string, string];
        const event = this.event(eventId);
        if (!event || !this.clients.some((c) => c.id === String(clientId))) throw { code: -32602, message: "Invalid params" };
        if (this.stealNext || !this.free(event, unitId, date).includes(time)) {
          this.stealNext = false;
          throw { code: -32054, message: "Selected time start is not available" };
        }
        const b: FakeBooking = { id: this.nextBooking++, eventId, unitId, clientId, date, time: time.slice(0, 5), end: `${endDate} ${endTime}`, cancelled: false, comment: null };
        this.bookings.push(b);
        return {
          require_confirm: false,
          bookings: [
            { id: String(b.id), event_id: String(eventId), unit_id: String(unitId), client_id: String(clientId), start_date_time: `${date} ${time}`, end_date_time: b.end, is_confirmed: "1", code: `c${b.id}`, hash: "h" },
          ],
        };
      }
      case "setBookingComment": {
        const b = this.bookings.find((x) => x.id === Number(p[0]));
        if (b) b.comment = String(p[1]);
        return true;
      }
      case "getBookings": {
        const f = p[0] as Raw;
        return this.bookings
          .filter((b) => f.client_id === undefined || b.clientId === Number(f.client_id))
          .filter((b) => !f.date_from || b.date >= String(f.date_from))
          .filter((b) => f.booking_type === "cancelled" ? b.cancelled : f.booking_type === "non_cancelled" ? !b.cancelled : true)
          .sort((a, b) => (`${a.date}${a.time}` < `${b.date}${b.time}` ? -1 : 1) * (f.order === "date_start_asc" ? 1 : -1))
          .map((b) => this.bookingRow(b));
      }
      case "getBookingDetails": {
        const b = this.bookings.find((x) => x.id === Number(p[0]));
        if (!b) throw { code: -32080, message: "Appointment couldn't be found" };
        const row = this.bookingRow(b);
        return {
          id: row.id,
          code: row.code,
          start_date_time: row.start_date,
          end_date_time: row.end_date,
          event_id: row.event_id,
          event_name: row.event,
          unit_id: row.unit_id,
          unit_name: row.unit,
          client_id: row.client_id,
          client_name: row.client,
          is_confirmed: row.is_confirm,
          comment: b.comment,
          price: { amount: this.event(b.eventId)!.price, currency: "TRY", status: "not_paid" },
        };
      }
      case "cancelBooking": {
        const b = this.bookings.find((x) => x.id === Number(p[0]));
        if (!b) throw { code: -32080, message: "Appointment couldn't be found" };
        b.cancelled = true;
        return true;
      }
    }
    throw { code: -32601, message: "Method not found" };
  }

  fetch: typeof fetch = async (input, init) => {
    if (this.down) throw new TypeError("fetch failed");
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    const request = JSON.parse(String(init?.body)) as { jsonrpc: string; method: string; params: unknown[]; id: number };
    const path = url.pathname;
    this.calls.push({ path, method: request.method, params: request.params });
    const answer = (body: Raw) => new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, ...body }), { status: 200, headers: { "content-type": "application/json" } });
    expect(url.host).toBe("user-api.simplybook.me");
    expect(request.jsonrpc).toBe("2.0");
    expect(Array.isArray(request.params)).toBe(true);
    try {
      if (path === "/login") {
        const p = request.params;
        if (p[0] !== "salon") throw { code: -33001, message: "Company does not exist" };
        if (request.method === "getToken") {
          if (p[1] !== "public-key") throw { code: -33002, message: "Wrong API key" };
          const token = `pt-${++this.tokenCount}`;
          this.publicTokens.add(token);
          return answer({ result: token });
        }
        if (request.method === "getUserToken") {
          if (p[1] !== "admin@salon.test" || p[2] !== "user-key") throw { code: -33003, message: "User with this login and password not found" };
          const token = `ut-${++this.tokenCount}`;
          this.userTokens.add(token);
          return answer({ result: token });
        }
        throw { code: -32601, message: "Method not found" };
      }
      if (headers.get("x-company-login") !== "salon") throw { code: -32600, message: "Access denied" };
      if (path === "/") {
        if (!this.publicTokens.has(headers.get("x-token") ?? "")) throw { code: -32600, message: "Access denied" };
        return answer({ result: this.publicMethod(request.method, request.params) });
      }
      if (path === "/admin") {
        if (!this.userTokens.has(headers.get("x-user-token") ?? "")) throw { code: -32600, message: "Access denied" };
        return answer({ result: this.adminMethod(request.method, request.params) });
      }
      return new Response("Not found", { status: 404 });
    } catch (e) {
      if (e && typeof e === "object" && "code" in e) return answer({ error: e as Raw });
      throw e;
    }
  };
}

describe("SimplyBook values", () => {
  it("cleans what the client typed", () => {
    expect(normalizeCompanyLogin(" https://Salon.simplybook.me/v2/#book ")).toBe("salon");
    expect(normalizeCompanyLogin("my-salon")).toBe("my-salon");
    expect(normalizeCompanyLogin("salon.secure.simplybook.it")).toBe("salon");
    expect(normalizeCompanyLogin("user-api.simplybook.me")).toBeNull();
    expect(normalizeCompanyLogin("two words")).toBeNull();
    expect(normalizeApiHost("")).toBe("user-api.simplybook.me");
    expect(normalizeApiHost("https://user-api.simplybook.it/admin")).toBe("user-api.simplybook.it");
    expect(normalizeApiHost("evil.example.com")).toBeNull();
    expect(normalizeApiHost("simplybook.me.example.com")).toBeNull();

    const typed = { companyLogin: "https://salon.simplybook.me", apiKey: " k ", userLogin: " admin ", userKey: " u ", apiHost: "" };
    expect(SIMPLYBOOK_PLATFORM.normalize(typed)).toEqual({ values: { companyLogin: "salon", apiKey: "k", userLogin: "admin", userKey: "u", apiHost: "" } });
    expect(SIMPLYBOOK_PLATFORM.normalize({ ...typed, apiHost: "USER-API.SIMPLYBOOK.IT" })).toMatchObject({ values: { apiHost: "user-api.simplybook.it" } });
    const bad = SIMPLYBOOK_PLATFORM.normalize({ companyLogin: "a b", apiKey: "", userLogin: "", userKey: "", apiHost: "localhost" });
    expect("errors" in bad ? Object.keys(bad.errors).sort() : []).toEqual(["apiHost", "apiKey", "companyLogin", "userKey", "userLogin"]);
    expect(platformDefinition("simplybook")).toBe(SIMPLYBOOK_PLATFORM);
    expect(SIMPLYBOOK_PLATFORM.fields.filter((f) => f.secret).map((f) => f.name)).toEqual(["apiKey", "userKey"]);
  });

  it("matches phone numbers exactly, however they were written", () => {
    expect(samePhone("+90 532 123 45 67", "+905321234567")).toBe(true);
    expect(samePhone("0090 532 123 4567", "+905321234567")).toBe(true);
    expect(samePhone("0532 123 45 67", "+905321234567")).toBe(true);
    expect(samePhone("532-123-4567", "+905321234567")).toBe(true);
    expect(samePhone("+90 532 123 45 670", "+905321234567")).toBe(false);
    expect(samePhone("+1 532 123 45 67", "+905321234567")).toBe(false);
    expect(samePhone("123 45 67", "+905321234567")).toBe(false);
    expect(samePhone("", "+905321234567")).toBe(false);
  });
});

describe("SimplyBook on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let fake: FakeSimplyBook;
  let connector: Connector;

  beforeEach(async () => {
    clearSimplyBookCache();
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "booking");
    app = {
      ...base,
      backend: "hosted",
      appName: "Salon Lale",
      websiteDoneAt: NOW,
      connector: platformConnectorConfig(base.id, SIMPLYBOOK_PLATFORM, { ...SETTINGS, apiHost: "" }, KEY),
    };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
    fake = new FakeSimplyBook();
    // No waiting between requests in the tests.
    connector = new SimplyBookConnector(SETTINGS, fake.fetch, { perSecond: 1000 });
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
    connector,
  });

  async function call(
    method: string,
    route: string,
    options: { body?: unknown; token?: string | null; query?: Record<string, string>; params?: string[] } = {},
  ): Promise<HostedResult> {
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

  async function signUp(phone = "5321234567", name = "Elif Şahin") {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+90${phone}`)!, device: DEVICE } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: DEVICE } });
    return (registered.body as { access_token: string }).access_token;
  }

  const book = (token: string | null, body: Record<string, unknown>, platform = "android") =>
    call("POST", "/bookings/appointments", { query: { platform }, token, body });

  it("checks the keys through the platform definition and builds from the saved values", async () => {
    const deps = { appId: app.id, store, fetcher: fake.fetch, saveSecrets: async () => undefined };
    expect(await SIMPLYBOOK_PLATFORM.create({ ...SETTINGS }, deps).check()).toBe("Salon Lale");
    expect(fake.count("getToken")).toBe(1);
    expect(fake.count("getUserToken")).toBe(1);
    clearSimplyBookCache();
    await expect(SIMPLYBOOK_PLATFORM.create({ ...SETTINGS, apiKey: "wrong" }, deps).check()).rejects.toThrow("didn't accept the API key");
    await expect(SIMPLYBOOK_PLATFORM.create({ ...SETTINGS, userKey: "wrong" }, deps).check()).rejects.toThrow("API user login and key");
    await expect(SIMPLYBOOK_PLATFORM.create({ ...SETTINGS, companyLogin: "nobody" }, deps).check()).rejects.toThrow("company login");
    // The app's saved values (an empty API host is the default one).
    const built = connectorFor(app, KEY, { store, assetUrl: (id) => id, platformUrl: "https://yallapp.test" }, fake.fetch);
    expect(built).toBeInstanceOf(SimplyBookConnector);
    expect(await (built as SimplyBookConnector).check()).toBe("Salon Lale");
  });

  it("adds the bookings rules to the config", async () => {
    const body = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as Record<string, unknown>;
    expect(body.bookings).toEqual({
      plugin: "simplybook",
      plugin_version: "1",
      timezone: TZ,
      currency: "TRY",
      staff_choice: true,
      notes: true,
      max_days_ahead: 60,
      min_minutes_ahead: 0,
      cancel_before_minutes: 1440,
    });
  });

  it("lists categories, services and a service with its staff, and caches the catalog", async () => {
    expect((await call("GET", "/bookings/categories")).body).toEqual({
      items: [
        { id: 1, name: "Hair", count: 2, image_url: null },
        { id: 2, name: "Spa", count: 1, image_url: null },
      ],
    });
    const all = (await call("GET", "/bookings/services")).body as { items: Record<string, unknown>[]; total: number };
    expect(all.items.map((s) => s.name)).toEqual(["Haircut", "Massage", "Hair colouring"]);
    expect(all.items[0]).toEqual({
      id: 1,
      name: "Haircut",
      image_url: "https://simplybook.me/uploads/salon/event__picture/cut.jpg",
      duration_minutes: 30,
      price: { amount: "300.00", currency: "TRY", formatted: "₺300.00", free: false },
      category_id: 1,
      color: null,
    });
    expect(all.items[2]).toMatchObject({ price: { amount: "0.00", free: true } });
    expect((await call("GET", "/bookings/services", { query: { category: "2" } })).body).toMatchObject({ total: 1, items: [{ name: "Massage" }] });
    expect((await call("GET", "/bookings/services", { query: { search: "hair" } })).body).toMatchObject({ total: 2 });
    expect((await call("GET", "/bookings/services", { query: { per_page: "2", page: "2" } })).body).toMatchObject({ total: 3, total_pages: 2, items: [{ name: "Hair colouring" }] });

    const cut = (await call("GET", "/bookings/services/{service_id}", { params: ["1"] })).body as { description_html: string; staff: unknown[] };
    expect(cut.staff).toEqual([
      { id: 1, name: "Ayşe Kaya", image_url: "https://simplybook.me/uploads/salon/unit_group__picture/ayse.jpg", title: "Stylist", price: null },
      { id: 2, name: "Mehmet Demir", image_url: null, title: null, price: null },
    ]);
    expect(cut.description_html).toContain("<p>A wash and a cut.</p>");
    expect(cut.description_html).not.toMatch(/script|onclick/);
    expect((await call("GET", "/bookings/services/{service_id}", { params: ["2"] })).body).toMatchObject({
      description_html: "<p>Relaxing.</p><p>Book early.</p>",
      staff: [{ name: "Mehmet Demir" }],
    });
    expect((await call("GET", "/bookings/services/{service_id}", { params: ["3"] })).status).toBe(404);
    expect((await call("GET", "/bookings/services/{service_id}", { params: ["99"] })).status).toBe(404);

    const home = (await call("GET", "/bookings/home")).body as { sections: { type: string }[] };
    expect(home.sections.map((s) => s.type)).toEqual(["categories", "services", "staff"]);
    expect(fake.count("getEventList")).toBe(1);
    expect(fake.count("getToken")).toBe(1);
    // Services carry the visible flag: hidden providers aren't anyone's staff.
    expect(fake.calls.find((c) => c.method === "getUnitList")!.params).toEqual([true, true]);
  });

  it("works without the Service Categories feature", async () => {
    fake.categoriesFeature = false;
    expect((await call("GET", "/bookings/categories")).body).toEqual({ items: [] });
    expect((await call("GET", "/bookings/services")).body).toMatchObject({ total: 3 });
  });

  it("shows free times with who is free, in the company's time zone", async () => {
    const week = (await call("GET", "/bookings/availability", { query: { service: "1", from: MONDAY, days: "7" } })).body as {
      timezone: string;
      days: { date: string; slots: { start: string; end: string; local_time: string; staff_ids: number[] }[] }[];
    };
    expect(week.timezone).toBe(TZ);
    expect(week.days.map((d) => d.date)).toEqual(Array.from({ length: 7 }, (_, i) => addDays(MONDAY, i)));
    expect(week.days[0]!.slots[0]).toEqual({ start: "2026-10-19T06:00:00.000Z", end: "2026-10-19T06:30:00.000Z", local_time: "09:00", staff_ids: [1, 2] });
    expect(week.days[6]!.slots).toEqual([]);
    expect(fake.calls.find((c) => c.method === "getStartTimeMatrix")!.params).toEqual([MONDAY, addDays(MONDAY, 6), 1, null, 1]);
    expect(fake.count("getCartesianStartTimeMatrix")).toBe(1);

    // One provider: their own duration (90 minutes), no per-provider matrix.
    const colour = (await call("GET", "/bookings/availability", { query: { service: "4", staff: "1", from: MONDAY, days: "1" } })).body as typeof week;
    expect(colour.days[0]!.slots.at(-1)).toMatchObject({ local_time: "15:30", end: "2026-10-19T14:00:00.000Z", staff_ids: [1] });
    const massage = (await call("GET", "/bookings/availability", { query: { service: "2", from: MONDAY, days: "1" } })).body as typeof week;
    expect(massage.days[0]!.slots[0]!.staff_ids).toEqual([2]);
    expect(fake.count("getCartesianStartTimeMatrix")).toBe(1);

    // Today: only times after now (13:00 in Istanbul); days before today aren't asked for.
    const today = (await call("GET", "/bookings/availability", { query: { service: "1", from: "2026-10-11", days: "2" } })).body as typeof week;
    expect(today.days[0]!.slots).toEqual([]);
    expect(today.days[1]!.slots[0]!.local_time).toBe("13:30");
    expect(fake.calls.at(-1)!.params.slice(0, 2)).toEqual(["2026-10-12", "2026-10-12"]);
    // Past how far ahead customers can book: nothing, and nothing asked.
    const calls = fake.calls.length;
    const far = (await call("GET", "/bookings/availability", { query: { service: "1", from: addDays("2026-10-12", 61), days: "1" } })).body as typeof week;
    expect(far.days[0]!.slots).toEqual([]);
    expect(fake.calls.length).toBe(calls);

    expect((await call("GET", "/bookings/availability", { query: { service: "2", staff: "1", from: MONDAY } })).status).toBe(400);
    expect((await call("GET", "/bookings/availability", { query: { service: "1", from: "19-10-2026" } })).status).toBe(400);
    expect((await call("GET", "/bookings/availability", { query: { service: "3", from: MONDAY } })).status).toBe(404);
  });

  it("asks each provider when the cartesian matrix isn't there", async () => {
    fake.cartesian = false;
    fake.bookings.push({ id: 400, eventId: 1, unitId: 1, clientId: 9, date: MONDAY, time: "09:00", end: `${MONDAY} 09:30:00`, cancelled: false, comment: null });
    const day = (await call("GET", "/bookings/availability", { query: { service: "1", from: MONDAY, days: "1" } })).body as {
      days: { slots: { local_time: string; staff_ids: number[] }[] }[];
    };
    expect(day.days[0]!.slots[0]).toMatchObject({ local_time: "09:00", staff_ids: [2] });
    expect(day.days[0]!.slots[1]).toMatchObject({ local_time: "09:30", staff_ids: [1, 2] });
  });

  it("books with the admin API, refuses a taken time, lists and cancels", async () => {
    const start = localToUtc(MONDAY, "10:00", TZ).toISOString();
    expect((await book(null, { service_id: 1, start })).status).toBe(401);
    const token = await signUp();
    expect((await book(token, { service_id: 1, start }, "web")).status).toBe(400);
    expect((await book(token, { service_id: 2, staff_id: 1, start })).status).toBe(400);
    expect((await book(token, { service_id: 3, start })).status).toBe(400);

    const first = await book(token, { service_id: 1, staff_id: 1, start, notes: "Short on the sides." });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({
      id: 500,
      status: "approved",
      service: { id: 1, name: "Haircut" },
      staff: { id: 1, name: "Ayşe Kaya" },
      start: "2026-10-19T07:00:00.000Z",
      end: "2026-10-19T07:30:00.000Z",
      local_date: MONDAY,
      local_time: "10:00",
      price: { amount: "300.00", formatted: "₺300.00" },
      notes: "Short on the sides.",
      can_cancel: true,
    });
    // The client with this phone number (saved as "0532 123 45 67") was found, not created.
    expect(fake.count("addClient")).toBe(0);
    const booked = fake.calls.find((c) => c.method === "book")!;
    expect(booked.path).toBe("/admin");
    expect(booked.params).toEqual([1, 1, 8, MONDAY, "10:00:00", MONDAY, "10:30:00", 0, {}, 1, null, null]);
    expect(fake.bookings[0]!.comment).toBe("Short on the sides.");

    expect(await book(token, { service_id: 1, staff_id: 1, start })).toMatchObject({ status: 409, body: { code: "slot_taken" } });
    // Anyone free: Mehmet still is.
    const anyone = await book(token, { service_id: 1, start });
    expect(anyone).toMatchObject({ status: 201, body: { staff: { name: "Mehmet Demir" } } });
    const after = (await call("GET", "/bookings/availability", { query: { service: "1", from: MONDAY, days: "1" } })).body as {
      days: { slots: { local_time: string }[] }[];
    };
    expect(after.days[0]!.slots.map((s) => s.local_time)).not.toContain("10:00");
    // A time that isn't offered, and one SimplyBook refuses at the last moment.
    expect((await book(token, { service_id: 1, start: "2026-10-19T07:10:00.000Z" })).status).toBe(409);
    fake.stealNext = true;
    expect(await book(token, { service_id: 2, start: localToUtc(MONDAY, "11:00", TZ).toISOString() })).toMatchObject({ status: 409, body: { code: "slot_taken" } });
    expect(fake.bookings).toHaveLength(2);

    const upcoming = (await call("GET", "/me/appointments", { token })).body as { total: number; items: { id: number; local_time: string }[] };
    expect(upcoming).toMatchObject({ total: 2, items: [{ id: 500 }, { id: 501 }] });
    expect(fake.calls.filter((c) => c.method === "getBookings").at(-1)!.params).toEqual([
      { client_id: 8, date_from: "2026-10-11", booking_type: "non_cancelled", order: "date_start_asc" },
    ]);
    const id = "500";
    expect((await call("GET", "/me/appointments/{appointment_id}", { token, params: [id] })).body).toMatchObject({
      id: 500,
      status: "approved",
      notes: "Short on the sides.",
      price: { amount: "300.00" },
    });
    expect((await call("GET", "/me/appointments/{appointment_id}", { token, params: ["999"] })).status).toBe(404);

    // Another customer: a new SimplyBook client, who can't see or cancel the first one's bookings.
    const other = await signUp("5321234568", "Can Yıldız");
    expect((await call("GET", "/me/appointments", { token: other })).body).toMatchObject({ total: 0, items: [] });
    expect((await call("GET", "/me/appointments/{appointment_id}", { token: other, params: [id] })).status).toBe(404);
    expect((await call("POST", "/me/appointments/{appointment_id}/cancel", { token: other, params: [id] })).status).toBe(404);
    const theirs = await book(other, { service_id: 2, start: localToUtc(MONDAY, "12:00", TZ).toISOString() });
    expect(theirs.status).toBe(201);
    expect(fake.calls.find((c) => c.method === "addClient")!.params).toEqual([{ name: "Can Yıldız", email: "", phone: "+905321234568" }]);
    expect((await call("POST", "/me/appointments/{appointment_id}/cancel", { token, params: [String((theirs.body as { id: number }).id)] })).status).toBe(404);

    const home = (await call("GET", "/bookings/home", { token })).body as { sections: { type: string; appointment?: { id: number } }[] };
    expect(home.sections.map((s) => s.type)).toEqual(["next_appointment", "categories", "services", "staff"]);
    expect(home.sections[0]!.appointment!.id).toBe(500);

    const cancelled = await call("POST", "/me/appointments/{appointment_id}/cancel", { token, params: [id] });
    expect(cancelled.body).toMatchObject({ id: 500, status: "cancelled", status_label: "Cancelled", can_cancel: false });
    expect(fake.calls.find((c) => c.method === "cancelBooking")).toMatchObject({ path: "/admin", params: [500] });
    expect((await call("POST", "/me/appointments/{appointment_id}/cancel", { token, params: [id] })).body).toMatchObject({ code: "too_late" });
    expect((await call("GET", "/me/appointments", { token, query: { status: "past" } })).body).toMatchObject({ total: 1, items: [{ id: 500, status: "cancelled" }] });
    expect((await call("GET", "/me/appointments", { token })).body).toMatchObject({ total: 1, items: [{ id: 501 }] });
    const free = (await call("GET", "/bookings/availability", { query: { service: "1", staff: "1", from: MONDAY, days: "1" } })).body as {
      days: { slots: { local_time: string }[] }[];
    };
    expect(free.days[0]!.slots.map((s) => s.local_time)).toContain("10:00");
  });

  it("doesn't cancel within a day of the start, and shows past bookings as completed", async () => {
    const token = await signUp();
    const soon = await book(token, { service_id: 1, start: localToUtc("2026-10-12", "15:00", TZ).toISOString() });
    expect(soon.body).toMatchObject({ status: "approved", can_cancel: false });
    const id = String((soon.body as { id: number }).id);
    expect((await call("POST", "/me/appointments/{appointment_id}/cancel", { token, params: [id] })).body).toMatchObject({ code: "too_late" });
    expect(fake.count("cancelBooking")).toBe(0);
    // This morning's haircut is over.
    fake.bookings.push({ id: 300, eventId: 1, unitId: 2, clientId: 8, date: "2026-10-12", time: "09:00", end: "2026-10-12 09:30:00", cancelled: false, comment: null });
    expect((await call("GET", "/me/appointments", { token, query: { status: "past" } })).body).toMatchObject({
      total: 1,
      items: [{ id: 300, status: "completed", local_date: "2026-10-12", local_time: "09:00", can_cancel: false, staff: { name: "Mehmet Demir" } }],
    });
    expect((await call("GET", "/me/appointments", { token })).body).toMatchObject({ total: 1, items: [{ local_time: "15:00" }] });
  });

  it("gives a stable e-mail address when the company requires one", async () => {
    fake.requireFields = "email_phone";
    fake.clients = [];
    const token = await signUp("5551112233", "Deniz");
    expect((await book(token, { service_id: 2, start: localToUtc(MONDAY, "09:00", TZ).toISOString() })).status).toBe(201);
    expect(fake.calls.find((c) => c.method === "addClient")!.params).toEqual([{ name: "Deniz", email: "905551112233@phone.yallapp.invalid", phone: "+905551112233" }]);
  });

  it("renews expired tokens once", async () => {
    const token = await signUp();
    await call("GET", "/bookings/services");
    await call("GET", "/me/appointments", { token });
    fake.expireTokens();
    expect((await call("GET", "/bookings/availability", { query: { service: "1", from: MONDAY } })).status).toBe(200);
    expect((await call("GET", "/me/appointments/{appointment_id}", { token, params: ["1"] })).status).toBe(404);
    expect(fake.count("getToken")).toBe(2);
    expect(fake.count("getUserToken")).toBe(2);
  });

  it("answers 503 when SimplyBook is down", async () => {
    const token = await signUp();
    fake.down = true;
    expect((await call("GET", "/bookings/services")).body).toMatchObject({ code: "shop_unavailable" });
    expect((await call("GET", "/bookings/home")).status).toBe(503);
    expect((await call("GET", "/bookings/categories")).status).toBe(503);
    expect((await call("GET", "/bookings/availability", { query: { service: "1", from: MONDAY } })).status).toBe(503);
    expect((await book(token, { service_id: 1, start: localToUtc(MONDAY, "10:00", TZ).toISOString() })).status).toBe(503);
    expect((await call("GET", "/me/appointments", { token })).status).toBe(503);
    expect((await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).status).toBe(503);
  });

  it("keeps the home screen when the admin access fails", async () => {
    const token = await signUp();
    await call("GET", "/bookings/services");
    connector = new SimplyBookConnector({ ...SETTINGS, userKey: "revoked" }, fake.fetch, { perSecond: 1000 });
    const home = (await call("GET", "/bookings/home", { token })).body as { sections: { type: string }[] };
    expect(home.sections.map((s) => s.type)).toEqual(["categories", "services", "staff"]);
  });
});
