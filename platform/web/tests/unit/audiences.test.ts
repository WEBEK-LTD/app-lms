import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { audienceChoices, audienceKinds, EVERYONE, isEveryone, parseAudience } from "@/lib/hosted/audiences";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { audiencesStoreSuite } from "./audiences-store-suite";
import { expectContract } from "./contract";
import { NOW } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };

/** 85.1 Audiences: who a campaign goes to. */
describe("85.1 audiences", () => {
  audiencesStoreSuite(() => new MemoryStore());

  const courses: App = {
    ...newApp("client-1", null, NOW, "lms"),
    backend: "hosted",
    connector: { kind: "courses" },
    courseSetup: { currency: "TRY", categories: [], nextId: 3, courses: [{ id: 2 } as never] },
  };
  const gym: App = { ...newApp("client-2", null, NOW, "booking", "fitness"), backend: "hosted", connector: { kind: "bookings" } };
  const news: App = { ...newApp("client-3", null, NOW, "news"), backend: "hosted", connector: { kind: "articles" } };

  it("offers the kinds each app has", () => {
    expect(audienceKinds(courses)).toEqual(["everyone", "buyers", "students", "inactive"]);
    expect(audienceKinds(gym)).toEqual(["everyone", "buyers", "members", "inactive"]);
    expect(audienceKinds(news)).toEqual(["everyone", "inactive"]);
  });

  it("checks what the dashboard sends", () => {
    expect(parseAudience({}, news)).toEqual({ ok: true, audience: EVERYONE });
    expect(parseAudience({ who: "members" }, news)).toEqual({ ok: false, error: "who" });
    expect(parseAudience({ who: "students", courseId: "2" }, courses)).toMatchObject({ ok: true, audience: { who: "students", courseId: 2 } });
    expect(parseAudience({ who: "students", courseId: 9 }, courses)).toEqual({ ok: false, error: "course" });
    expect(parseAudience({ who: "inactive" }, news)).toMatchObject({ ok: true, audience: { inactiveDays: 30 } });
    expect(parseAudience({ who: "inactive", inactiveDays: 3 }, news)).toEqual({ ok: false, error: "inactive_days" });
    expect(parseAudience({ languages: ["AR", "tr", "ar"], countries: "eg", platforms: ["ios"] }, news)).toEqual({
      ok: true,
      audience: { ...EVERYONE, languages: ["ar", "tr"], countries: ["EG"], platforms: ["ios"] },
    });
    // Both platforms is every phone.
    expect(parseAudience({ platforms: ["ios", "android"] }, news)).toEqual({ ok: true, audience: EVERYONE });
    expect(parseAudience({ languages: ["arabic"] }, news)).toEqual({ ok: false, error: "languages" });
    expect(parseAudience({ countries: ["TUR"] }, news)).toEqual({ ok: false, error: "countries" });
    expect(parseAudience({ platforms: ["huawei"] }, news)).toEqual({ ok: false, error: "platforms" });
    expect(isEveryone(EVERYONE)).toBe(true);
    expect(isEveryone({ ...EVERYONE, countries: ["TR"] })).toBe(false);
  });

  it("keeps the phone's language and country from the app (never its IP)", async () => {
    const store = new MemoryStore();
    await store.createApp(news);
    const sender = new LogSender();
    let country: string | null = "EG";
    const call = async (method: string, route: string, options: { body?: unknown; token?: string | null } = {}) => {
      const context: HostedContext = { store, app: news, active: true, now: NOW, ip: "203.0.113.9", country, secret: "test-hosted-secret", sender, push: false, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" };
      const result = await handleHosted(context, { method, path: route.split("/").filter(Boolean), query: new URLSearchParams(), body: options.body, token: options.token ?? null });
      expectContract(method, route, result);
      return result;
    };
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone: "5321112233" } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get("+905321112233")!, device: DEVICE } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = (await call("POST", "/auth/register", { body: { signup_token: signupToken, name: "Leyla", device: DEVICE } })).body as { access_token: string; refresh_token: string };
    const phone = async () => (await store.listAppHostedDevices(news.id))[0]!;
    expect(await phone()).toMatchObject({ country: "EG", language: null });

    expect((await call("PUT", "/me/push-token", { token: registered.access_token, body: { token: "fcm-1", language: "ar-EG" } })).status).toBe(204);
    expect(await phone()).toMatchObject({ language: "ar", country: "EG" });
    // A tag that isn't one is left out; the language kept stays.
    expect((await call("PUT", "/me/push-token", { token: registered.access_token, body: { token: "fcm-1", language: "<b>" } })).status).toBe(204);
    expect((await phone()).language).toBe("ar");
    // Signing in again from another country moves it; no country known leaves it.
    country = "TR";
    expect((await call("POST", "/auth/refresh", { body: { refresh_token: registered.refresh_token } })).status).toBe(200);
    expect((await phone()).country).toBe("TR");
    expect(JSON.stringify(await store.listAppHostedDevices(news.id))).not.toContain("203.0.113.9");
    expect(await audienceChoices(store, news)).toEqual({ languages: ["ar"], countries: ["TR"] });
  });
});
