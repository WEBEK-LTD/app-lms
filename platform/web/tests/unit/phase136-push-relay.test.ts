import { generateKeyPairSync } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/push/send/route";
import { newApp } from "@/lib/app/setup";
import { activateClient, suspendClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { getStore } from "@/lib/data";
import type { MemoryStore } from "@/lib/data/memory";
import { encryptionKey } from "@/lib/env";
import type { App } from "@/lib/data/types";
import { siteRelaysPush, yallappFirebaseOffered } from "@/lib/firebase/env";
import { serviceAccountOf } from "@/lib/hosted/notify";
import type { ServiceAccount } from "@/lib/hosted/push";
import {
  parsePushRelayRequest,
  PUSH_RELAY_MAX_TOKENS,
  relayPush,
  relayTokens,
  sharedSignIn,
  type PushRelayRequest,
} from "@/lib/license/push-relay";
import { pluginRelaysPush, pushSetupOf, RELAY_PLUGIN_VERSION } from "@/lib/license/push-setup";
import { activateLicense, checkLicense, parseSiteInfo } from "@/lib/license/service";
import { RATE_LIMITS, rateLimitHits } from "@/lib/rate-limit";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { KEY, NOW, setupClient } from "./helpers";
import { expectPlatformContract } from "./platform-contract";

/** 136.40 The WordPress relay: POST /api/v1/push/send, with Google and FCM as recorded answers and a made-up key. */

const SITE = "https://academy.test";
/** Made up for the test: a fresh RSA key, never a real service account. */
const ACCOUNT: ServiceAccount = {
  project_id: "yallapp-push-test",
  client_email: "push@yallapp-push-test.iam.gserviceaccount.test",
  private_key: generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
};

function body(licenseKey: string, extra: Record<string, unknown> = {}) {
  return {
    license_key: licenseKey,
    site_url: SITE,
    plugin_version: "0.4.48",
    wp_version: "6.8",
    lms: "tutor",
    tokens: [{ token: "tok-ok-1", provider: "fcm" }, { token: "tok-gone-1" }, { token: "tok-busy-1" }],
    notification: { title: "New lesson in Arabic for beginners", body: "Lesson 4 - Greetings" },
    data: { type: "new_lesson", course_id: "12", lesson_id: "345" },
    ...extra,
  };
}

function request(licenseKey: string, extra: Record<string, unknown> = {}): PushRelayRequest {
  const parsed = parsePushRelayRequest(body(licenseKey, extra));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.result));
  return parsed.value;
}

/** Google's sign-in and FCM: "tok-ok-*" is taken, "tok-gone-*" no longer exists, "tok-busy-*" gets 503; every call kept. */
function fakeGoogle(options: { signInFails?: boolean; delayMs?: number } = {}) {
  const calls = { signIn: 0, sends: [] as { token: string; message: Record<string, unknown> }[], inFlight: 0, mostAtOnce: 0 };
  const fetcher = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "https://oauth2.googleapis.com/token") {
      calls.signIn += 1;
      if (options.signInFails) return Response.json({ error: "invalid_grant" }, { status: 400 });
      return Response.json({ access_token: "ya29.test", expires_in: 3600 });
    }
    expect(url).toBe(`https://fcm.googleapis.com/v1/projects/${ACCOUNT.project_id}/messages:send`);
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer ya29.test");
    const message = (JSON.parse(String(init?.body)) as { message: Record<string, unknown> & { token: string } }).message;
    calls.sends.push({ token: message.token, message });
    calls.inFlight += 1;
    calls.mostAtOnce = Math.max(calls.mostAtOnce, calls.inFlight);
    await new Promise((resolve) => setTimeout(resolve, options.delayMs ?? 1));
    calls.inFlight -= 1;
    if (message.token.startsWith("tok-ok-")) return Response.json({ name: "projects/x/messages/1" });
    if (message.token.startsWith("tok-gone-")) return Response.json({ error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } }, { status: 404 });
    return Response.json({ error: { status: "UNAVAILABLE" } }, { status: 503 });
  }) as typeof fetch;
  return { fetcher, calls };
}

/** An active client whose license is on SITE, with an app in "Yallapp sets up notifications" mode (or not). */
async function activeSite(options: { pushSetup?: "yallapp" | null; plan?: "starter" | "growth" } = {}) {
  const setup = await setupClient(options.plan ? { plan: options.plan } : {});
  // 136.45 A WordPress app in Yallapp's Firebase: chosen (`pushSetup`) while the site relayed (`pushRelayAt`).
  const yallapp = options.pushSetup === undefined;
  const app: App = { ...newApp(setup.client.id, SITE, NOW), backend: "wordpress", appName: "Nour Academy", androidPackage: "com.nour.academy", pushSetup: yallapp ? "yallapp" : null, pushRelayAt: yallapp ? NOW : null };
  await setup.store.createApp(app);
  const site = parseSiteInfo(body(setup.licenseKey!));
  if (!site.ok) throw new Error("bad site");
  expect((await activateLicense(setup.store, site.value, NOW)).status).toBe(200);
  return { ...setup, app, licenseKey: setup.licenseKey! };
}

const deps = (fetcher: typeof fetch, extra: Partial<Parameters<typeof relayPush>[2]> = {}) => ({
  encryptionKey: KEY,
  now: NOW,
  fetcher,
  accountOf: () => ACCOUNT,
  ...extra,
});

describe("136.40 POST /push/send: the request", () => {
  it("takes SiteInfo, Firebase tokens without repeats, the notification and string data", () => {
    const parsed = parsePushRelayRequest(
      body("YALL-7K2D-9QWE-4MNB", {
        tokens: [{ token: " tok-ok-1 " }, { token: "tok-ok-1", provider: "fcm" }, { token: "tok-ok-2" }],
        notification: { title: " Weekend\u0000 sale ", body: "Everything is 20% off\nuntil Sunday.", image: "https://yallapp.com.tr/m/abc" },
        data: { type: "announcement", notification_id: 7, link: "https://shop.example/sale" },
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.tokens).toEqual(["tok-ok-1", "tok-ok-2"]);
    expect(parsed.value.message).toEqual({
      title: "Weekend sale",
      body: "Everything is 20% off\nuntil Sunday.",
      image: "https://yallapp.com.tr/m/abc",
      data: { type: "announcement", notification_id: "7", link: "https://shop.example/sale" },
    });
  });

  it("refuses more than 200 tokens, Huawei tokens, empty or long texts, an http picture and Firebase's own data keys", () => {
    const many = Array.from({ length: PUSH_RELAY_MAX_TOKENS + 1 }, (_, i) => ({ token: `tok-ok-${i}` }));
    const cases: Record<string, unknown>[] = [
      { tokens: [] },
      { tokens: many },
      { tokens: ["tok-ok-1"] },
      { tokens: [{ token: "tok one" }] },
      { tokens: [{ token: "x".repeat(4097) }] },
      { tokens: [{ token: "tok-hms-1", provider: "hms" }] },
      { notification: { title: "", body: " " } },
      { notification: { title: "t".repeat(201), body: "b" } },
      { notification: { title: "t", body: "b".repeat(1001) } },
      { notification: { title: "t", image: "http://example.test/a.png" } },
      { notification: "hello" },
      { data: { from: "x" } },
      { data: { google_x: "x" } },
      { data: { "bad key": "x" } },
      { data: { nested: { a: 1 } } },
      { data: { big: "x".repeat(3001) } },
      { data: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`k${i}`, "v"])) },
      { license_key: "" },
    ];
    for (const extra of cases) {
      const parsed = parsePushRelayRequest(body("YALL-7K2D-9QWE-4MNB", extra));
      expect(parsed.ok, JSON.stringify(extra).slice(0, 120)).toBe(false);
      if (parsed.ok) continue;
      expect(parsed.result.body.code).toBe("invalid_request");
      expectPlatformContract("POST", "/push/send", parsed.result);
    }
    expect(parsePushRelayRequest("nope").ok).toBe(false);
  });
});

describe("136.40 Sending each token", () => {
  it("answers sent, invalid or retry per token, in order, signing in to Google once", async () => {
    const google = fakeGoogle();
    const results = await relayTokens(ACCOUNT, ["tok-ok-1", "tok-gone-1", "tok-busy-1", "tok-ok-2"], { title: "Hi", body: "There", data: { type: "announcement" } }, { fetcher: google.fetcher, now: NOW });
    expect(results).toEqual([
      { token: "tok-ok-1", status: "sent" },
      { token: "tok-gone-1", status: "invalid" },
      { token: "tok-busy-1", status: "retry" },
      { token: "tok-ok-2", status: "sent" },
    ]);
    expect(google.calls.signIn).toBe(1);
    // The message is the one hosted apps and the plugin send.
    expect(google.calls.sends[0]?.message).toMatchObject({
      token: "tok-ok-1",
      notification: { title: "Hi", body: "There" },
      data: { type: "announcement" },
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default" } } },
    });
  });

  it("sends 20 at a time", async () => {
    const google = fakeGoogle({ delayMs: 5 });
    const tokens = Array.from({ length: 200 }, (_, i) => `tok-ok-${i}`);
    const results = await relayTokens(ACCOUNT, tokens, { title: "Hi", body: "", data: {} }, { fetcher: google.fetcher, now: NOW });
    expect(results.every((r) => r.status === "sent")).toBe(true);
    expect(google.calls.sends).toHaveLength(200);
    expect(google.calls.mostAtOnce).toBe(20);
    expect(google.calls.signIn).toBe(1);
  });

  it("leaves what didn't start before the deadline to retry", async () => {
    const google = fakeGoogle();
    let time = 0;
    // Each look at the clock is a second later: the deadline passes after a few tokens.
    const clock = () => (time += 1000);
    const tokens = Array.from({ length: 30 }, (_, i) => `tok-ok-${i}`);
    const results = await relayTokens(ACCOUNT, tokens, { title: "Hi", body: "", data: {} }, { fetcher: google.fetcher, now: NOW, clock, deadlineMs: 7000, concurrency: 1 });
    const sent = results.filter((r) => r.status === "sent").length;
    expect(sent).toBeGreaterThan(0);
    expect(sent).toBeLessThan(30);
    expect(results.slice(sent).every((r) => r.status === "retry")).toBe(true);
    expect(google.calls.sends).toHaveLength(sent);
  });

  it("gives up a send still waiting on Firebase at the hard stop, so the answer still comes", async () => {
    const fetcher = (async (input: string | URL, init?: RequestInit) => {
      if (String(input) === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "ya29.test", expires_in: 3600 });
      if (String(JSON.parse(String(init?.body)).message.token) === "tok-ok-1") return Response.json({});
      // Firebase never answers this one: only the abort ends it.
      return new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
    }) as typeof fetch;
    const started = Date.now();
    const results = await relayTokens(ACCOUNT, ["tok-ok-1", "tok-slow-1"], { title: "Hi", body: "", data: {} }, { fetcher, now: NOW, hardStopMs: 200 });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(results).toEqual([
      { token: "tok-ok-1", status: "sent" },
      { token: "tok-slow-1", status: "retry" },
    ]);
  });

  it("answers retry for every token when Google refuses the sign-in, and tries signing in again", async () => {
    const google = fakeGoogle({ signInFails: true });
    const results = await relayTokens(ACCOUNT, ["tok-ok-1", "tok-ok-2"], { title: "Hi", body: "", data: {} }, { fetcher: google.fetcher, now: NOW, concurrency: 1 });
    expect(results.map((r) => r.status)).toEqual(["retry", "retry"]);
    expect(google.calls.sends).toHaveLength(0);
    expect(google.calls.signIn).toBe(2);
  });

  it("shares one sign-in between concurrent sends, but never FCM's answers", async () => {
    let made = 0;
    const fetcher = sharedSignIn((async (input: string | URL) => {
      made += 1;
      return new Response(String(input));
    }) as typeof fetch);
    const answers = await Promise.all([fetcher("https://oauth2.googleapis.com/token", { method: "POST" }), fetcher("https://oauth2.googleapis.com/token", { method: "POST" })]);
    expect(await Promise.all(answers.map((a) => a.text()))).toEqual(["https://oauth2.googleapis.com/token", "https://oauth2.googleapis.com/token"]);
    expect(made).toBe(1);
    await fetcher("https://fcm.googleapis.com/v1/projects/p/messages:send", { method: "POST" });
    await fetcher("https://fcm.googleapis.com/v1/projects/p/messages:send", { method: "POST" });
    expect(made).toBe(3);
  });
});

describe("136.40 Relaying a site's batch", () => {
  it("sends through the app's push account and keeps only counts", async () => {
    const { store, licenseKey, license } = await activeSite();
    const google = fakeGoogle();
    const result = await relayPush(store, request(licenseKey), deps(google.fetcher));
    expect(result).toEqual({
      status: 200,
      body: {
        results: [
          { token: "tok-ok-1", status: "sent" },
          { token: "tok-gone-1", status: "invalid" },
          { token: "tok-busy-1", status: "retry" },
        ],
        sent: 1,
        invalid: 1,
        retry: 1,
      },
    });
    expectPlatformContract("POST", "/push/send", result);
    // In Yallapp's shared project, Android delivers it only to this app's package.
    expect(google.calls.sends.every((send) => (send.message.android as { restricted_package_name?: string }).restricted_package_name === "com.nour.academy")).toBe(true);
    expect(await rateLimitHits(store, RATE_LIMITS.pushRelayTokens, license!.id, NOW)).toBe(3);
    expect(await rateLimitHits(store, RATE_LIMITS.pushRelaySent, license!.id, NOW)).toBe(1);
    // Nothing of the batch is kept: no token or text in any stored row.
    const stored = JSON.stringify([...(store as unknown as { rateLimits: Map<string, unknown> }).rateLimits.entries()]);
    expect(stored).not.toContain("tok-");
    expect(stored).not.toContain("Greetings");
  });

  it("asks serviceAccountOf by default, which has none while Yallapp's Firebase isn't set up here: 503 push_not_ready", async () => {
    const { store, licenseKey } = await activeSite();
    const google = fakeGoogle();
    const result = await relayPush(store, request(licenseKey), { encryptionKey: KEY, now: NOW, fetcher: google.fetcher });
    expect(result).toMatchObject({ status: 503, body: { code: "push_not_ready", retry_after_seconds: 300 } });
    expectPlatformContract("POST", "/push/send", result);
    expect(google.calls.sends).toHaveLength(0);
  });

  it("refuses an unknown key, an inactive license, another site, a suspended account, an app with its own Firebase and a plan without push", async () => {
    const { store, licenseKey, client } = await activeSite();
    const google = fakeGoogle();
    const unknown = await relayPush(store, request("YALL-AAAA-BBBB-CCCC"), deps(google.fetcher));
    expect(unknown).toMatchObject({ status: 404, body: { code: "license_not_found" } });
    expectPlatformContract("POST", "/push/send", unknown);

    const elsewhere = await relayPush(store, request(licenseKey, { site_url: "https://other.test" }), deps(google.fetcher));
    expect(elsewhere).toMatchObject({ status: 403, body: { code: "license_inactive" } });
    expectPlatformContract("POST", "/push/send", elsewhere);

    const own = await activeSite({ pushSetup: null });
    const ownResult = await relayPush(own.store, request(own.licenseKey), deps(google.fetcher));
    expect(ownResult).toMatchObject({ status: 409, body: { code: "push_own_firebase" } });
    expectPlatformContract("POST", "/push/send", ownResult);

    await suspendClient(store, client.id, NOW);
    const suspended = await relayPush(store, request(licenseKey), deps(google.fetcher));
    expect(suspended).toMatchObject({ status: 403, body: { code: "license_inactive" } });
    expect(google.calls.sends).toHaveLength(0);
  });

  it("refuses a plan without push (the team switched it off)", async () => {
    const { store, licenseKey } = await activeSite();
    const google = fakeGoogle();
    await store.setPlatformSetting("switches", { off: [], offByPlan: { growth: ["feature:push"] } }, "owner@yallapp.test", NOW);
    clearPlatformSettingsCache();
    const result = await relayPush(store, request(licenseKey), deps(google.fetcher));
    clearPlatformSettingsCache();
    expect(result).toMatchObject({ status: 403, body: { code: "push_not_available" } });
    expectPlatformContract("POST", "/push/send", result);
    expect(google.calls.sends).toHaveLength(0);
  });

  it("limits each license to 60 batches a minute and 20,000 tokens an hour, sending nothing over them", async () => {
    const { store, licenseKey } = await activeSite();
    const google = fakeGoogle();
    const one = request(licenseKey, { tokens: [{ token: "tok-ok-1" }] });
    for (let i = 0; i < RATE_LIMITS.pushRelayLicense.limit; i++) {
      expect((await relayPush(store, one, deps(google.fetcher))).status).toBe(200);
    }
    const over = await relayPush(store, one, deps(google.fetcher));
    expect(over).toMatchObject({ status: 429, body: { code: "rate_limited" } });
    expect(over.status === 429 && over.body.retry_after_seconds).toBeGreaterThan(0);
    expectPlatformContract("POST", "/push/send", over);
    expect(google.calls.sends).toHaveLength(RATE_LIMITS.pushRelayLicense.limit);

    // Tokens an hour: 100 full batches are 20,000 tokens; the next is over, spread across minutes.
    const fresh = await activeSite();
    const full = request(fresh.licenseKey, { tokens: Array.from({ length: 200 }, (_, i) => ({ token: `tok-ok-${i}` })) });
    const quick = fakeGoogle({ delayMs: 0 });
    for (let i = 0; i < 100; i++) {
      const at = new Date(NOW.getTime() + Math.floor(i / 50) * 60_000);
      expect((await relayPush(fresh.store, full, deps(quick.fetcher, { now: at }))).status).toBe(200);
    }
    const hourly = await relayPush(fresh.store, full, deps(quick.fetcher, { now: new Date(NOW.getTime() + 3 * 60_000) }));
    expect(hourly).toMatchObject({ status: 429, body: { code: "rate_limited" } });
    expect(quick.calls.sends).toHaveLength(20_000);
  }, 60_000);
});

describe("136.41 LicenseStatus.push", () => {
  it("says own by default and yallapp for an app in Yallapp's mode", async () => {
    expect(pushSetupOf(null)).toBe("own");
    const wordpress = { ...newApp("client-1", SITE, NOW), backend: "wordpress" } as App;
    expect(pushSetupOf({ ...wordpress, pushSetup: "yallapp", pushRelayAt: NOW })).toBe("yallapp");
    // A new app's default "yallapp" never moves a WordPress site that wasn't chosen with a relaying plugin.
    expect(pushSetupOf({ ...wordpress, pushSetup: "yallapp", pushRelayAt: null })).toBe("own");
    expect(pushSetupOf({ ...wordpress, pushSetup: null, pushRelayAt: NOW })).toBe("own");
    expect(pushSetupOf({ ...wordpress, backend: "hosted", pushSetup: "yallapp" })).toBe("yallapp");

    const yallapp = await activeSite();
    const site = parseSiteInfo(body(yallapp.licenseKey));
    if (!site.ok) throw new Error("bad site");
    const status = await checkLicense(yallapp.store, site.value, NOW);
    expect(status.status === 200 && status.body.push).toBe("yallapp");
    expectPlatformContract("POST", "/licenses/check", status);

    const own = await activeSite({ pushSetup: null });
    const ownSite = parseSiteInfo(body(own.licenseKey));
    if (!ownSite.ok) throw new Error("bad site");
    const ownStatus = await checkLicense(own.store, ownSite.value, NOW);
    expect(ownStatus.status === 200 && ownStatus.body.push).toBe("own");
  });
});

describe("136.40 POST /api/v1/push/send (route)", () => {
  let licenseKey: string;
  const ROUTE_SITE = "https://push-route.test";

  beforeAll(async () => {
    const store = (await getStore()) as MemoryStore;
    const now = new Date();
    const { client } = await registerClient(store, { name: "Push Route", email: "push@route.test", whatsapp: "+905446731945", siteUrl: ROUTE_SITE, password: null }, now);
    const outcome = await activateClient(store, { clientId: client.id, plan: "growth", activeUntil: new Date(now.getTime() + 30 * 86_400_000), paymentNote: "test" }, encryptionKey(), now);
    licenseKey = outcome.licenseKey!;
    await store.createApp({ ...newApp(client.id, ROUTE_SITE, now), backend: "wordpress", appName: "Route Academy", pushSetup: "yallapp", pushRelayAt: now });
    const site = parseSiteInfo({ license_key: licenseKey, site_url: ROUTE_SITE, plugin_version: "0.4.48" });
    if (!site.ok) throw new Error("bad site");
    await activateLicense(store, site.value, now);
  });

  const post = (payload: unknown) =>
    POST(
      new Request("https://yallapp.test/api/v1/push/send", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.61" },
        body: typeof payload === "string" ? payload : JSON.stringify(payload),
      }),
    );

  it("answers 400 for a body that isn't JSON, and reads a full batch of 200 tokens", async () => {
    const response = await post("{");
    expect(response.status).toBe(400);
    expectPlatformContract("POST", "/push/send", { status: 400, body: await response.json() });
    // Phase 1 gives a Yallapp-mode app its account; on its own branch there is none yet, so a valid batch waits.
    const tokens = Array.from({ length: 200 }, (_, i) => ({ token: `${"f".repeat(150)}-${i}`, provider: "fcm" }));
    const waiting = await post({ ...body(licenseKey), site_url: ROUTE_SITE, tokens });
    expect(waiting.status).toBe(503);
    expect(waiting.headers.get("retry-after")).toBe("300");
    expectPlatformContract("POST", "/push/send", { status: 503, body: await waiting.json() });
  });
});

describe("136.45 Yallapp's mode for WordPress apps", () => {
  it("needs plugin 0.4.48 or later on the site", () => {
    expect(RELAY_PLUGIN_VERSION).toBe("0.4.48");
    expect(pluginRelaysPush("0.4.48")).toBe(true);
    expect(pluginRelaysPush("0.4.50")).toBe(true);
    expect(pluginRelaysPush("0.5.0")).toBe(true);
    expect(pluginRelaysPush("0.4.47")).toBe(false);
    expect(pluginRelaysPush("0.3.99")).toBe(false);
    expect(pluginRelaysPush("")).toBe(false);
    expect(pluginRelaysPush("dev")).toBe(false);
    expect(pluginRelaysPush(null)).toBe(false);
    expect(pluginRelaysPush(undefined)).toBe(false);
  });

  it("is offered only once the site's plugin relays, and stays offered (to switch back) while the app is in it", async () => {
    // Phase 1's test settings: in their expected form, never real ones.
    vi.stubEnv("GOOGLE_WIF_PROVIDER", "projects/123456789012/locations/global/workloadIdentityPools/yallapp-platform/providers/platform");
    vi.stubEnv("GOOGLE_PUSH_SERVICE_ACCOUNT", "yallapp-push-sender@yallapp-firebase.iam.gserviceaccount.com");
    vi.stubEnv("GOOGLE_FIREBASE_APPS_SERVICE_ACCOUNT", "yallapp-firebase-apps@yallapp-firebase.iam.gserviceaccount.com");
    try {
      const setup = await setupClient();
      const app: App = { ...newApp(setup.client.id, SITE, NOW), backend: "wordpress", appName: "Nour Academy" };
      await setup.store.createApp(app);
      await setup.store.saveFirebaseProject({ projectId: "yallapp-push-01", projectNumber: "1", apiKeyId: "k", maxApps: 28, status: "open", createdBy: "team", creation: null, checkedAt: null, checkProblem: null, createdAt: NOW, updatedAt: NOW });
      // No site yet: not offered (a hosted app is, so it's the site that holds it back).
      expect(await yallappFirebaseOffered(setup.store, { ...app, backend: "hosted" })).toBe(true);
      expect(await yallappFirebaseOffered(setup.store, app)).toBe(false);
      const activate = async (version: string) => {
        const site = parseSiteInfo({ ...body(setup.licenseKey!), plugin_version: version });
        if (!site.ok) throw new Error("bad site");
        expect((await (version === "0.4.47" ? activateLicense : checkLicense)(setup.store, site.value, NOW)).status).toBe(200);
      };
      await activate("0.4.47");
      expect(await siteRelaysPush(setup.store, app)).toBe(false);
      expect(await yallappFirebaseOffered(setup.store, app)).toBe(false);
      await activate("0.4.48");
      expect(await siteRelaysPush(setup.store, app)).toBe(true);
      expect(await yallappFirebaseOffered(setup.store, app)).toBe(true);
      // In it already: offered whatever the site runs now, so the owner can switch back.
      const chosen: App = { ...app, pushSetup: "yallapp", pushRelayAt: NOW };
      await activate("0.4.47");
      expect(await yallappFirebaseOffered(setup.store, chosen)).toBe(true);
      // The keyless account is Yallapp's once the app has its project, so the relay sends with it.
      expect(serviceAccountOf({ ...chosen, firebaseProjectId: "yallapp-push-01" }, KEY)).toMatchObject({ project_id: "yallapp-push-01", federated: true });
      expect(serviceAccountOf({ ...app, pushSetup: "yallapp", firebaseProjectId: "yallapp-push-01" }, KEY)).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
