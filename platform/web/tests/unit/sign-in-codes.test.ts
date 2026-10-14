import { beforeAll, describe, expect, it } from "vitest";
import { POST } from "@/app/api/v1/sign-in-codes/send/route";
import { activateClient, suspendClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { getStore } from "@/lib/data";
import type { MemoryStore } from "@/lib/data/memory";
import { encryptionKey } from "@/lib/env";
import { devLogSender, OtpSendError, type OtpSender } from "@/lib/hosted/otp-sender";
import { activateLicense, parseSiteInfo } from "@/lib/license/service";
import {
  parseSignInCodeRequest,
  sendSignInCode,
  SIGN_IN_CODE_TTL_SECONDS,
  signInCodesSentToday,
  type SignInCodeRequest,
} from "@/lib/license/sign-in-codes";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { KEY, NOW, days, setupClient } from "./helpers";
import { expectPlatformContract } from "./platform-contract";

const SITE = "https://academy.test";
const SECRET = "test-sign-in-codes";

/** A sender that keeps what it was asked to send, or fails like a provider would. */
function fakeSender(fail = false) {
  const sent: { phone: string; code: string; appName: string; expiresInSeconds: number }[] = [];
  const sender: OtpSender = {
    async send(input) {
      if (fail) throw new OtpSendError("WABEK answered HTTP 422.");
      sent.push(input);
    },
  };
  return { sender, sent };
}

/** A phone number valid in Turkey's numbering plan, different for each n. */
const phoneNo = (n: number) => `+90532${String(1_000_000 + n).slice(-7)}`;

function body(licenseKey: string, extra: Record<string, unknown> = {}) {
  return { license_key: licenseKey, site_url: SITE, plugin_version: "0.3.1", wp_version: "6.8", lms: "tutor", phone: "+905321234567", code: "482913", ...extra };
}

function request(licenseKey: string, extra: Record<string, unknown> = {}): SignInCodeRequest {
  const parsed = parseSignInCodeRequest(body(licenseKey, extra));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.result));
  return parsed.value;
}

/** An active client whose license is on SITE, with an app named Nour Academy. */
async function activeSite(options: { appName?: string | null } = {}) {
  const setup = await setupClient();
  const app = { ...newApp(setup.client.id, SITE, NOW), appName: options.appName === undefined ? "Nour Academy" : options.appName };
  await setup.store.createApp(app);
  const site = parseSiteInfo(body(setup.licenseKey!));
  if (!site.ok) throw new Error("bad site");
  expect((await activateLicense(setup.store, site.value, NOW)).status).toBe(200);
  return { ...setup, app, licenseKey: setup.licenseKey! };
}

describe("POST /sign-in-codes/send: the request", () => {
  it("accepts SiteInfo with an E.164 phone and a 6-digit code", () => {
    const parsed = parseSignInCodeRequest(body("YALL-7K2D-9QWE-4MNB", { app_name: "  Nour\u0000 Academy " }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.phone).toEqual({ countryCode: "+90", number: "5321234567", e164: "+905321234567" });
    expect(parsed.value.code).toBe("482913");
    expect(parsed.value.appName).toBe("Nour Academy");
  });

  it("refuses a bad code, a missing license key and numbers that aren't valid", () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ code: "12345" }, "invalid_request"],
      [{ code: 482913 }, "invalid_request"],
      [{ license_key: "" }, "invalid_request"],
      [{ app_name: 12 }, "invalid_request"],
      [{ phone: "" }, "invalid_phone"],
      [{ phone: "5321234567" }, "invalid_phone"],
      [{ phone: "+95446731942" }, "invalid_phone"],
      [{ phone: "+9012" }, "invalid_phone"],
    ];
    for (const [extra, code] of cases) {
      const parsed = parseSignInCodeRequest(body("YALL-7K2D-9QWE-4MNB", extra));
      expect(parsed.ok, JSON.stringify(extra)).toBe(false);
      if (parsed.ok) continue;
      expect(parsed.result.body.code).toBe(code);
      expectPlatformContract("POST", "/sign-in-codes/send", parsed.result);
    }
    expect(parseSignInCodeRequest("nope").ok).toBe(false);
  });
});

describe("POST /sign-in-codes/send: sending", () => {
  it("sends the code through the sender with the app's name and counts it", async () => {
    const { store, licenseKey, license } = await activeSite();
    const { sender, sent } = fakeSender();
    const result = await sendSignInCode(store, request(licenseKey), { sender, secret: SECRET, now: NOW });
    expect(result).toEqual({ status: 204 });
    expectPlatformContract("POST", "/sign-in-codes/send", result);
    expect(sent).toEqual([{ phone: "+905321234567", code: "482913", appName: "Nour Academy", expiresInSeconds: SIGN_IN_CODE_TTL_SECONDS }]);
    expect(await signInCodesSentToday(store, license!.id, NOW)).toBe(1);
    // The next UTC day starts again from zero.
    expect(await signInCodesSentToday(store, license!.id, days(1))).toBe(0);
  });

  it("uses the site's app name only when the app has none", async () => {
    const { store, licenseKey } = await activeSite({ appName: null });
    const { sender, sent } = fakeSender();
    await sendSignInCode(store, request(licenseKey, { app_name: "Site Academy" }), { sender, secret: SECRET, now: NOW });
    await sendSignInCode(store, request(licenseKey, { phone: phoneNo(1) }), { sender, secret: SECRET, now: NOW });
    expect(sent.map((s) => s.appName)).toEqual(["Site Academy", "Yallapp"]);
  });

  it("keeps no phone number and no code in the counters", async () => {
    const { store, licenseKey } = await activeSite();
    await sendSignInCode(store, request(licenseKey), { sender: fakeSender().sender, secret: SECRET, now: NOW });
    const buckets = [...(store as unknown as { rateLimits: Map<string, unknown> }).rateLimits.keys()];
    expect(buckets.length).toBeGreaterThan(0);
    for (const bucket of buckets) {
      expect(bucket).not.toContain("5321234567");
      expect(bucket).not.toContain("482913");
    }
  });

  it("answers 404 for an unknown key and 403 for an inactive license, another site or a suspended account", async () => {
    const { sender, sent } = fakeSender();
    const deps = { sender, secret: SECRET, now: NOW };
    const { store, licenseKey, client } = await activeSite();

    const unknown = await sendSignInCode(store, request("YALL-7K2D-9QWE-4MNB"), deps);
    expect(unknown).toMatchObject({ status: 404, body: { code: "license_not_found" } });
    expectPlatformContract("POST", "/sign-in-codes/send", unknown);

    const elsewhere = await sendSignInCode(store, request(licenseKey, { site_url: "https://elsewhere.test" }), deps);
    expect(elsewhere).toMatchObject({ status: 403, body: { code: "license_inactive" } });
    expectPlatformContract("POST", "/sign-in-codes/send", elsewhere);

    const expired = await sendSignInCode(store, request(licenseKey), { ...deps, now: days(31) });
    expect(expired).toMatchObject({ status: 403, body: { code: "license_inactive", message: expect.stringContaining("ended") } });

    await suspendClient(store, client.id, NOW);
    const suspended = await sendSignInCode(store, request(licenseKey), deps);
    expect(suspended).toMatchObject({ status: 403, body: { code: "license_inactive", message: expect.stringContaining("suspended") } });
    expect(sent).toEqual([]);
  });

  it("answers 502 when the sender fails or none is set up, and counts nothing", async () => {
    const { store, licenseKey, license } = await activeSite();
    const failed = await sendSignInCode(store, request(licenseKey), { sender: fakeSender(true).sender, secret: SECRET, now: NOW });
    expect(failed).toMatchObject({ status: 502, body: { code: "provider_error" } });
    expectPlatformContract("POST", "/sign-in-codes/send", failed);
    expect(JSON.stringify(failed)).not.toContain("482913");
    const none = await sendSignInCode(store, request(licenseKey, { phone: phoneNo(2) }), { sender: null, secret: SECRET, now: NOW });
    expect(none).toMatchObject({ status: 502, body: { code: "provider_error" } });
    expect(await signInCodesSentToday(store, license!.id, NOW)).toBe(0);
  });
});

describe("POST /sign-in-codes/send: limits", () => {
  it("allows one code per number every 30 seconds and 10 an hour, across sites", async () => {
    const { store, licenseKey } = await activeSite();
    const other = await (async () => {
      const { client } = await registerClient(store, { name: "Other", email: "other@academy.test", whatsapp: "+905446731943", siteUrl: "https://other.test", password: null }, NOW);
      const outcome = await activateClient(store, { clientId: client.id, plan: "starter", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
      await store.createApp(newApp(client.id, "https://other.test", NOW));
      const site = parseSiteInfo({ ...body(outcome.licenseKey!), site_url: "https://other.test" });
      if (!site.ok) throw new Error("bad site");
      await activateLicense(store, site.value, NOW);
      return outcome.licenseKey!;
    })();
    const { sender, sent } = fakeSender();
    // Aligned to a 30-second window, so the second request falls in the same one.
    const start = new Date(Math.floor(NOW.getTime() / 3_600_000) * 3_600_000);
    const at = (seconds: number) => ({ sender, secret: SECRET, now: new Date(start.getTime() + seconds * 1000) });

    expect((await sendSignInCode(store, request(licenseKey), at(0))).status).toBe(204);
    const again = await sendSignInCode(store, request(licenseKey), at(10));
    expect(again).toMatchObject({ status: 429, body: { code: "rate_limited", retry_after_seconds: 20 } });
    expectPlatformContract("POST", "/sign-in-codes/send", again);
    // The same number from another site waits too; another number doesn't.
    expect((await sendSignInCode(store, request(other, { site_url: "https://other.test" }), at(12))).status).toBe(429);
    expect((await sendSignInCode(store, request(licenseKey, { phone: phoneNo(3) }), at(12))).status).toBe(204);

    for (let i = 1; i < 10; i += 1) expect((await sendSignInCode(store, request(licenseKey), at(i * 30))).status).toBe(204);
    const hour = await sendSignInCode(store, request(licenseKey), at(10 * 30));
    expect(hour).toMatchObject({ status: 429, body: { code: "rate_limited" } });
    expect(sent.filter((s) => s.phone === "+905321234567")).toHaveLength(10);
    // The next hour, it's allowed again.
    expect((await sendSignInCode(store, request(licenseKey), at(3600))).status).toBe(204);
  });

  it("allows 300 codes an hour per license", async () => {
    const { store, licenseKey } = await activeSite();
    const { sender } = fakeSender();
    const start = new Date(Math.floor(NOW.getTime() / 3_600_000) * 3_600_000);
    for (let i = 0; i < RATE_LIMITS.signInCodeLicenseHour.limit; i += 1) {
      expect((await sendSignInCode(store, request(licenseKey, { phone: phoneNo(100 + i) }), { sender, secret: SECRET, now: start })).status).toBe(204);
    }
    const over = await sendSignInCode(store, request(licenseKey, { phone: phoneNo(999) }), { sender, secret: SECRET, now: start });
    expect(over).toMatchObject({ status: 429, body: { code: "rate_limited", retry_after_seconds: 3600 } });
    expect(RATE_LIMITS.signInCodeLicenseDay).toMatchObject({ limit: 2000, windowSeconds: 86_400 });
  });
});

describe("POST /api/v1/sign-in-codes/send (route)", () => {
  let licenseKey: string;
  const ROUTE_SITE = "https://codes-route.test";

  beforeAll(async () => {
    const store = (await getStore()) as MemoryStore;
    const now = new Date();
    const { client } = await registerClient(store, { name: "Codes Route", email: "codes@route.test", whatsapp: "+905446731944", siteUrl: ROUTE_SITE, password: null }, now);
    const outcome = await activateClient(store, { clientId: client.id, plan: "starter", activeUntil: new Date(now.getTime() + 30 * 86_400_000), paymentNote: "test" }, encryptionKey(), now);
    licenseKey = outcome.licenseKey!;
    await store.createApp({ ...newApp(client.id, ROUTE_SITE, now), appName: "Route Academy" });
    const site = parseSiteInfo({ license_key: licenseKey, site_url: ROUTE_SITE, plugin_version: "0.3.1" });
    if (!site.ok) throw new Error("bad site");
    await activateLicense(store, site.value, now);
  });

  const post = (payload: unknown) =>
    POST(
      new Request("https://yallapp.test/api/v1/sign-in-codes/send", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.60" },
        body: typeof payload === "string" ? payload : JSON.stringify(payload),
      }),
    );

  it("hands the code to the configured sender, then asks to wait with Retry-After", async () => {
    const payload = { license_key: licenseKey, site_url: ROUTE_SITE, plugin_version: "0.3.1", phone: "+905321119988", code: "246813" };
    const sent = await post(payload);
    expect(sent.status).toBe(204);
    expect(devLogSender().sent.get("+905321119988")).toBe("246813");
    const again = await post({ ...payload, code: "135790" });
    expect(again.status).toBe(429);
    expect(Number(again.headers.get("retry-after"))).toBeGreaterThan(0);
    const json = (await again.json()) as { code: string; retry_after_seconds: number };
    expect(json.code).toBe("rate_limited");
    expect(devLogSender().sent.get("+905321119988")).toBe("246813");
  });

  it("answers 400 for a body that isn't JSON", async () => {
    const response = await post("{");
    expect(response.status).toBe(400);
    expectPlatformContract("POST", "/sign-in-codes/send", { status: 400, body: await response.json() });
  });
});
