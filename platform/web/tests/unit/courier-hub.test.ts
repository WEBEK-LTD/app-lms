import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { beforeEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { newApp } from "@/lib/app/setup";
import { handleCourierHub, type CourierHubDeps, type CourierHubResult } from "@/lib/courier-hub/service";
import { hubReviewNotes } from "@/lib/courier-hub/review";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_HOSTED_SETTINGS, type App, type Courier, type HostedDevice, type Shipment } from "@/lib/data/types";
import { notifyDeps } from "@/lib/delivery/flow";
import { tellCouriers } from "@/lib/delivery/notify";
import { parseDeliverySettings } from "@/lib/delivery/forms";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { DEMO_SIGN_IN } from "@/lib/demo/constants";
import { DeliveryConnector } from "@/lib/hosted/connectors/delivery";
import { LogSender } from "@/lib/hosted/otp-sender";
import type { PushMessage, PushTarget, ServiceAccount } from "@/lib/hosted/push";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { PLAN_INFO, planSettingOf } from "@/lib/plans";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { NOW, setupClient } from "./helpers";

/**
 * 104.8.2 Yallapp Courier: sign-in with a code from Yallapp's own sender and
 * its limits, the companies of the person's number (only delivery projects
 * on Yallapp Courier, with `delivery` on their plan, where a courier has
 * it), a session at one company that is the company's own hosted session,
 * kept apart from every other company and ended once the company leaves
 * Yallapp Courier or pauses the courier; pushes from Yallapp Courier's
 * project with `app_id`; sign-out; the stores' review account. Every answer
 * is checked against docs/api/courier.yaml.
 */

const contract = parse(readFileSync(path.join(__dirname, "../../../../docs/api/courier.yaml"), "utf8")) as {
  paths: Record<string, Record<string, { responses: Record<string, { $ref?: string; content?: unknown }> }>>;
};
const ajv = new Ajv2020({ strict: false, validateSchema: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(contract, "courier");
const pointer = (part: string) => part.replaceAll("~", "~0").replaceAll("/", "~1");

function expectCourierContract(method: string, route: string, result: { status: number; body?: unknown }) {
  const response = contract.paths[route]?.[method.toLowerCase()]?.responses[String(result.status)];
  expect(response, `${method} ${route} ${result.status} is in the contract`).toBeDefined();
  if (!response!.$ref && !response!.content) return;
  const ref = response!.$ref
    ? `courier#/components/responses/${pointer(response!.$ref.split("/").pop()!)}/content/application~1json/schema`
    : `courier#/paths/${pointer(route)}/${method.toLowerCase()}/responses/${result.status}/content/application~1json/schema`;
  const validate = ajv.getSchema(ref)!;
  expect(validate(result.body), `${method} ${route}: ${JSON.stringify(validate.errors)}`).toBe(true);
}

const PHONE = "+201001112222";
const DEVICE = { id: "install-courier-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
const HOSTED_SECRET = "test-hosted-secret";

type Session = { access_token: string; refresh_token: string; expires_in: number; account: { id: string; phone: string | null; email: string | null } };
type Company = { app_id: string; name: string; api_base_url: string; on_duty: boolean; jobs_waiting: number; paused: boolean };

describe("104.8.2 Yallapp Courier", () => {
  let store: MemoryStore;
  let clientId: string;
  let sender: LogSender;
  let emails: { to: string; code: string; appName: string }[];
  let now: Date;
  let nile: App;
  let delta: App;
  let ownApp: App;
  let noPlan: App;
  let courierAt: Record<string, Courier>;

  async function company(name: string, courierApp: "yallapp_courier" | "bundle", plan: "studio_1" | "growth"): Promise<App> {
    const base = newApp(clientId, null, NOW, "delivery");
    const app: App = {
      ...base,
      section: "studio",
      backend: "hosted",
      appName: name,
      primaryColor: "#1E3A8A",
      websiteDoneAt: NOW,
      connector: { kind: "deliveries" },
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
    };
    await store.createApp(app);
    const any = (await store.listLicensesByClient(clientId))[0]!;
    await store.createLicense({ ...any, id: `license-${app.id}`, appId: app.id, keyHash: app.id.replaceAll("-", "").padEnd(64, "0"), plan, createdAt: NOW, updatedAt: NOW });
    await store.saveDeliverySettings(app.id, { ...DEFAULT_DELIVERY_SETTINGS, pricing: "fixed", fixedCents: 45_00, assignment: "open", courierApp }, NOW);
    const made = await store.createCourier({ appId: app.id, name: "Karim Hassan", phone: PHONE, email: null, vehicle: "Motorbike", active: true }, NOW);
    if (!made.ok) throw new Error("courier");
    courierAt[app.id] = made.courier;
    return app;
  }

  beforeEach(async () => {
    clearPlatformSettingsCache();
    const setup = await setupClient();
    store = setup.store;
    clientId = setup.client.id;
    // The team ticks delivery on Studio plan 1 (Admin › Plans); the regular plans never have it.
    await store.setPlatformSetting("plans", { studio_1: { ...planSettingOf(PLAN_INFO.studio_1), features: [...PLAN_INFO.studio_1.features, "delivery"] } }, "team@yallapp.test", NOW);
    courierAt = {};
    nile = await company("Nile Express", "yallapp_courier", "studio_1");
    delta = await company("Delta Couriers", "yallapp_courier", "studio_1");
    ownApp = await company("Own App Co", "bundle", "studio_1");
    noPlan = await company("No Plan Co", "yallapp_courier", "growth");
    sender = new LogSender();
    emails = [];
    now = NOW;
  });

  const deps = (): CourierHubDeps => ({
    store,
    now,
    ip: "203.0.113.20",
    signingSecret: "test-signing-secret",
    hostedSecret: HOSTED_SECRET,
    platformUrl: "https://yallapp.test",
    assetUrl: ASSETS,
    sender,
    sendEmailCode: async (input) => void emails.push(input),
  });

  async function call(method: string, route: string, options: { params?: string[]; token?: string; body?: unknown } = {}): Promise<CourierHubResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleCourierHub(deps(), { method, path: concrete.split("/").filter(Boolean), body: options.body, token: options.token ?? null });
    expectCourierContract(method, route, result);
    return result;
  }

  async function signIn(contact: { phone: string } | { email: string } = { phone: PHONE }, device = DEVICE): Promise<Session> {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: contact });
    expect(requested.status).toBe(200);
    const code = "phone" in contact ? sender.sent.get(contact.phone)! : emails.at(-1)!.code;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: (requested.body as { request_id: string }).request_id, code, device } });
    expect(verified.status).toBe(200);
    return verified.body as Session;
  }

  const companies = async (token: string) => ((await call("GET", "/companies", { token })).body as { items: Company[] }).items;

  async function open(token: string, app: App) {
    return call("POST", "/companies/{app_id}/session", { params: [app.id], token, body: { device: DEVICE } });
  }

  // The company's own hosted API, as the app calls it at `api_base_url`.
  function hosted(app: App, method: string, route: string, token: string | null, body?: unknown, query: Record<string, string> = {}): Promise<HostedResult> {
    const ctx: HostedContext = {
      store,
      app,
      active: true,
      plan: PLAN_INFO.studio_1 && { ...PLAN_INFO.studio_1, features: [...PLAN_INFO.studio_1.features, "delivery"] },
      now,
      ip: "203.0.113.20",
      secret: HOSTED_SECRET,
      sender: null,
      push: false,
      assetUrl: ASSETS,
      platformUrl: "https://yallapp.test",
      connector: new DeliveryConnector({ store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test", delivery: true }),
    };
    return handleHosted(ctx, { method, path: route.split("/").filter(Boolean), query: new URLSearchParams(query), body, token });
  }

  it("signs in with a code through Yallapp's own sender, then renews and rotates the tokens", async () => {
    const requested = await call("POST", "/auth/otp/request", { body: { phone: "+20 100 111 2222" } });
    expect(requested).toMatchObject({ status: 200, body: { request_id: expect.any(String), expires_in: 300 } });
    expect(sender.sent.get(PHONE)).toMatch(/^\d{6}$/);
    const requestId = (requested.body as { request_id: string }).request_id;
    const wrong = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(PHONE) === "000000" ? "111111" : "000000", device: DEVICE } });
    expect(wrong).toMatchObject({ status: 400, body: { code: "invalid_code" } });
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(PHONE), device: DEVICE } });
    expect(verified.status).toBe(200);
    const session = verified.body as Session;
    expect(session.account).toEqual({ id: expect.any(String), phone: PHONE, email: null });
    // The code works once.
    expect((await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(PHONE), device: DEVICE } })).body).toMatchObject({ code: "invalid_code" });

    const renewed = await call("POST", "/auth/refresh", { body: { refresh_token: session.refresh_token } });
    expect(renewed.status).toBe(200);
    expect((renewed.body as Session).refresh_token).not.toBe(session.refresh_token);
    expect((await call("POST", "/auth/refresh", { body: { refresh_token: session.refresh_token } })).status).toBe(401);
    expect((await call("GET", "/companies", { token: (renewed.body as Session).access_token })).status).toBe(200);
    expect((await call("GET", "/companies", { token: "yc1.not-a-token" })).status).toBe(401);

    // A number without its country, or nothing at all, isn't one.
    expect(await call("POST", "/auth/otp/request", { body: { phone: "0100 111 2222" } })).toMatchObject({ status: 400, body: { code: "invalid_request" } });
    expect(await call("POST", "/auth/otp/request", { body: {} })).toMatchObject({ status: 400, body: { code: "invalid_request" } });
  });

  it("signs in by email through the platform's email, and keeps the hosted API's limits", async () => {
    const session = await signIn({ email: "Karim@Courier.test" });
    expect(session.account).toMatchObject({ phone: null, email: "karim@courier.test" });
    expect(emails[0]).toMatchObject({ to: "karim@courier.test", appName: "Yallapp Courier" });

    // One code a minute per number, five an hour.
    expect((await call("POST", "/auth/otp/request", { body: { phone: PHONE } })).status).toBe(200);
    const again = await call("POST", "/auth/otp/request", { body: { phone: PHONE } });
    expect(again).toMatchObject({ status: 429, body: { code: "rate_limited", retry_after_seconds: expect.any(Number) } });
    for (let i = 0; i < 4; i++) {
      now = new Date(now.getTime() + 61_000);
      expect((await call("POST", "/auth/otp/request", { body: { phone: PHONE } })).status).toBe(200);
    }
    now = new Date(now.getTime() + 61_000);
    expect((await call("POST", "/auth/otp/request", { body: { phone: PHONE } })).status).toBe(429);

    // A sender that fails: no code is kept.
    sender.send = async () => {
      throw new Error("down");
    };
    expect((await call("POST", "/auth/otp/request", { body: { phone: "+201005550000" } })).status).toBe(502);
  });

  it("lists only the delivery companies on Yallapp Courier, with delivery on their plan, where a courier has the number", async () => {
    const { access_token } = await signIn();
    const items = await companies(access_token);
    // Not the company with its own courier app, nor the one whose plan has no delivery.
    expect(items.map((c) => c.name)).toEqual(["Nile Express", "Delta Couriers"]);
    expect(items[0]).toEqual({
      app_id: nile.id,
      name: "Nile Express",
      logo_url: null,
      primary_color: "#1E3A8A",
      api_base_url: `https://yallapp.test/api/app/${nile.id}`,
      on_duty: false,
      jobs_waiting: 0,
      paused: false,
    });
    expect(items.some((c) => c.app_id === ownApp.id || c.app_id === noPlan.id)).toBe(false);

    // A paused courier still sees the company, paused; the jobs waiting count theirs and, on duty, the open ones.
    await store.updateCourier(delta.id, courierAt[delta.id]!.id, { active: false }, NOW);
    await store.updateCourier(nile.id, courierAt[nile.id]!.id, { onDuty: true }, NOW);
    await store.createShipment(sampleShipment(nile, null));
    const later = await companies(access_token);
    expect(later.find((c) => c.app_id === delta.id)).toMatchObject({ paused: true, on_duty: false });
    expect(later.find((c) => c.app_id === nile.id)).toMatchObject({ on_duty: true, jobs_waiting: 1 });

    // Another number, or an email no company added: none.
    expect(await companies((await signIn({ phone: "+201009990000" }, { ...DEVICE, id: "install-2" })).access_token)).toEqual([]);
    expect(await companies((await signIn({ email: "karim@courier.test" }, { ...DEVICE, id: "install-3" })).access_token)).toEqual([]);
  });

  it("opens the company's own hosted session, kept apart from every other company", async () => {
    const { access_token } = await signIn();
    const opened = await open(access_token, nile);
    expect(opened.status).toBe(200);
    const session = opened.body as { access_token: string; refresh_token: string; user: { id: number; name: string; phone: string; roles: string[] } };
    expect(session.user).toMatchObject({ name: "Karim Hassan", phone: PHONE, roles: ["courier"] });
    // Its device is Yallapp Courier's.
    const [device] = await store.listHostedDevices(nile.id, session.user.id);
    expect(device).toMatchObject({ deviceId: DEVICE.id, appRole: "courier", courierDeviceId: expect.any(String) });
    expect((await store.getCourier(nile.id, courierAt[nile.id]!.id))!.hubSignedInAt).toEqual(now);

    // The company's hosted API takes it: the courier's screens, and its own refresh.
    expect((await hosted(nile, "GET", "/courier/me", session.access_token)).status).toBe(200);
    const renewed = await hosted(nile, "POST", "/auth/refresh", null, { refresh_token: session.refresh_token });
    expect(renewed.status).toBe(200);
    // Never another company's.
    expect((await hosted(delta, "GET", "/courier/me", session.access_token)).status).toBe(401);
    expect((await hosted(delta, "POST", "/auth/refresh", null, { refresh_token: (renewed.body as { refresh_token: string }).refresh_token })).status).toBe(401);
    // Companies that aren't the person's are not found.
    for (const other of [ownApp, noPlan]) expect(await open(access_token, other)).toMatchObject({ status: 404, body: { code: "not_found" } });
    const stranger = await signIn({ phone: "+201009990000" }, { ...DEVICE, id: "install-2" });
    expect((await open(stranger.access_token, nile)).status).toBe(404);
  });

  it("refuses a paused courier, and ends the session once the company pauses them or leaves Yallapp Courier", async () => {
    const { access_token } = await signIn();
    await store.updateCourier(delta.id, courierAt[delta.id]!.id, { active: false }, NOW);
    expect(await open(access_token, delta)).toMatchObject({ status: 403, body: { code: "not_courier" } });

    const atNile = (await open(access_token, nile)).body as { access_token: string; user: { id: number } };
    await store.updateCourier(nile.id, courierAt[nile.id]!.id, { active: false }, NOW);
    expect((await hosted(nile, "GET", "/courier/me", atNile.access_token)).status).toBe(401);
    expect(await store.listHostedDevices(nile.id, atNile.user.id)).toEqual([]);

    await store.updateCourier(nile.id, courierAt[nile.id]!.id, { active: true }, NOW);
    const again = (await open(access_token, nile)).body as { access_token: string };
    expect((await hosted(nile, "GET", "/courier/me", again.access_token)).status).toBe(200);
    await store.saveDeliverySettings(nile.id, { ...DEFAULT_DELIVERY_SETTINGS, courierApp: "bundle" }, NOW);
    expect((await hosted(nile, "GET", "/courier/me", again.access_token)).status).toBe(401);
    // Nile Express is no longer listed; Delta Couriers still is, with the courier paused.
    expect((await companies(access_token)).map((c) => [c.app_id, c.paused])).toEqual([[delta.id, true]]);
  });

  it("copies the push token to the company sessions and sends the companies' pushes from Yallapp Courier's project, with app_id", async () => {
    const { access_token } = await signIn();
    const atNile = (await open(access_token, nile)).body as { user: { id: number } };
    expect((await call("PUT", "/me/push-token", { token: access_token, body: { token: "courier-fcm-token", provider: "fcm" } })).status).toBe(204);
    const [hubDevice] = await store.listHostedDevices(nile.id, atNile.user.id);
    expect(hubDevice).toMatchObject({ pushToken: "courier-fcm-token", appRole: "courier" });
    // The same courier also has the company's own courier app on another phone.
    const own: HostedDevice = { ...hubDevice!, id: "00000000-0000-4000-8000-000000000001", deviceId: "own-app", pushToken: "company-fcm-token", courierDeviceId: null };
    await store.createHostedDevice(own);

    const sent: { account: string; tokens: string[]; message: PushMessage }[] = [];
    const company: ServiceAccount = { project_id: "nile-express", client_email: "push@nile.test", private_key: "-----BEGIN PRIVATE KEY-----" };
    const courierProject: ServiceAccount = { project_id: "yallapp-courier", client_email: "push@courier.test", private_key: "-----BEGIN PRIVATE KEY-----" };
    const n = notifyDeps({
      store,
      app: nile,
      now,
      account: company,
      courierAccount: courierProject,
      send: async (account: ServiceAccount, targets: PushTarget[], message: PushMessage) => {
        sent.push({ account: account.project_id, tokens: targets.map((t) => (typeof t === "string" ? t : t.token)), message });
        return { sent: targets.length, invalidTokens: [] };
      },
    });
    const shipment = await store.createShipment(sampleShipment(nile, null));
    expect(await tellCouriers(n, shipment, [courierAt[nile.id]!], "given")).toBe(2);
    expect(sent).toHaveLength(2);
    const fromCompany = sent.find((s) => s.account === "nile-express")!;
    const fromCourier = sent.find((s) => s.account === "yallapp-courier")!;
    expect(fromCompany.tokens).toEqual(["company-fcm-token"]);
    expect(fromCompany.message.data.app_id).toBeUndefined();
    expect(fromCourier.tokens).toEqual(["courier-fcm-token"]);
    expect(fromCourier.message.data).toMatchObject({ type: "courier_job", shipment_id: String(shipment.id), app_id: nile.id });

    // Turned off on the phone: the company sessions stop getting them too.
    await call("PUT", "/me/push-token", { token: access_token, body: { token: null } });
    expect((await store.getHostedDevice(nile.id, hubDevice!.id))!.pushToken).toBeNull();
  });

  it("signs out the phone and every company session it opened", async () => {
    const { access_token } = await signIn();
    const atNile = (await open(access_token, nile)).body as { access_token: string; refresh_token: string; user: { id: number } };
    const atDelta = (await open(access_token, delta)).body as { access_token: string };
    expect((await call("POST", "/auth/sign-out", { token: access_token })).status).toBe(204);
    expect((await call("GET", "/companies", { token: access_token })).status).toBe(401);
    expect((await hosted(nile, "GET", "/courier/me", atNile.access_token)).status).toBe(401);
    expect((await hosted(delta, "GET", "/courier/me", atDelta.access_token)).status).toBe(401);
    expect((await hosted(nile, "POST", "/auth/refresh", null, { refresh_token: atNile.refresh_token })).status).toBe(401);
    expect(await store.listHostedDevices(nile.id, atNile.user.id)).toEqual([]);
  });

  it("gives the stores' reviewers Studio's demo delivery company, as its test courier with a sample job, with no message sent", async () => {
    const demo: App = {
      ...newApp(clientId, null, NOW, "delivery"),
      section: "studio",
      demo: true,
      backend: "hosted",
      appName: "Sahm Express",
      connector: { kind: "deliveries" },
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, defaultCountryCode: DEMO_SIGN_IN.countryCode, reviewPhone: DEMO_SIGN_IN.e164, reviewCode: DEMO_SIGN_IN.code },
    };
    await store.createApp(demo);
    await store.saveDeliverySettings(demo.id, { ...DEFAULT_DELIVERY_SETTINGS, courierApp: "same" }, NOW);
    await store.setPlatformSetting("demo", { clientId }, "team@yallapp.test", NOW);
    await store.setPlatformSetting("courierHub", { reviewPhone: "+20 100 999 8888", reviewEmail: null, reviewCode: "135790", playUrl: null, appStoreUrl: null }, "team@yallapp.test", NOW);
    clearPlatformSettingsCache();

    const requested = await call("POST", "/auth/otp/request", { body: { phone: "+201009998888" } });
    expect(requested.status).toBe(200);
    expect(sender.sent.size).toBe(0);
    const requestId = (requested.body as { request_id: string }).request_id;
    expect((await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: "000000", device: DEVICE } })).status).toBe(400);
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: "135790", device: DEVICE } });
    const { access_token } = verified.body as Session;
    const items = await companies(access_token);
    expect(items.map((c) => c.app_id)).toEqual([demo.id]);

    const session = (await open(access_token, demo)).body as { access_token: string; user: { roles: string[] } };
    expect(session.user.roles).toEqual(["courier"]);
    const jobs = await hosted(demo, "GET", "/courier/jobs", session.access_token, undefined, { scope: "active" });
    expect(jobs.status).toBe(200);
    expect((jobs.body as { items: { status: string }[] }).items).toMatchObject([{ status: "assigned" }]);

    const notes = hubReviewNotes({ reviewPhone: "+20 100 999 8888", reviewEmail: null, reviewCode: "135790", playUrl: null, appStoreUrl: null }, "Sahm Express")!;
    expect(notes).toContain("the phone number +201009998888 and the code 135790");
    expect(notes).toContain("test courier of Sahm Express");
    expect(hubReviewNotes({ reviewPhone: null, reviewEmail: null, reviewCode: "135790", playUrl: null, appStoreUrl: null }, null)).toBeNull();
  });

  it("104.8.3 reads where couriers work from a delivery company's settings form", () => {
    const form = { currency: "EGP", pricing: "fixed", fixed: "45", cash: "on", tracking: "stages", assignment: "dispatch" };
    expect(parseDeliverySettings({ ...form, couriersWork: "yallapp_courier" }, DEFAULT_DELIVERY_SETTINGS)).toMatchObject({ ok: true, value: { courierApp: "yallapp_courier" } });
    // Back to their own app: `same` stays for the customers' app built before 112.3, else the second app.
    expect(parseDeliverySettings({ ...form, couriersWork: "own" }, { ...DEFAULT_DELIVERY_SETTINGS, courierApp: "yallapp_courier" })).toMatchObject({ ok: true, value: { courierApp: "bundle" } });
    expect(parseDeliverySettings({ ...form, couriersWork: "own" }, DEFAULT_DELIVERY_SETTINGS)).toMatchObject({ ok: true, value: { courierApp: "same" } });
    // A food company has no Yallapp Courier.
    const food = { ...form, couriersWork: "yallapp_courier", cuisines: "Grills", foodCourierJob: "accepted", timezone: "Africa/Cairo" };
    expect(parseDeliverySettings(food, DEFAULT_DELIVERY_SETTINGS, true)).toMatchObject({ ok: true, value: { courierApp: "same" } });
  });
});

function sampleShipment(app: App, courierId: number | null): Omit<Shipment, "id"> {
  return {
    appId: app.id,
    userId: null,
    senderName: "Mona",
    senderPhone: "+201015550000",
    serviceId: null,
    serviceName: null,
    pickup: { address: "Tahrir Square", details: null, lat: null, lng: null },
    dropoff: { address: "Cairo Tower", details: null, lat: null, lng: null },
    zoneId: null,
    zoneName: null,
    distanceKm: null,
    packageSize: "small",
    packageDescription: "Documents",
    recipientName: "Ali",
    recipientPhone: "+201015550001",
    notes: null,
    priceCents: 45_00,
    currency: "EGP",
    paymentMethod: "cash",
    paymentStatus: "unpaid",
    orderId: null,
    status: courierId ? "assigned" : "pending",
    courierId,
    courierName: null,
    timeline: [],
    lang: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}
