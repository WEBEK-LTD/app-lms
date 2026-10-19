import { describe, expect, it } from "vitest";
import {
  choosesScreenProtection,
  hostedScreenProtection,
  offersContentScope,
  parseScreenProtectionChoice,
  screenProtectionChoice,
  screenProtectionFormValue,
} from "@/lib/app/screen-protection";
import { newApp } from "@/lib/app/setup";
import { DEFAULT_HOSTED_SETTINGS, type App } from "@/lib/data/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { activateLicense, checkLicense, parseSiteInfo } from "@/lib/license/service";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";
import { expectPlatformContract } from "./platform-contract";

const settings = (screenProtection: "off" | "content" | "app") => ({
  hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, screenProtection },
});

describe("53 screen protection: the owner's choice", () => {
  it("is off until the owner chooses, or the plugin's own setting on WordPress", () => {
    expect(screenProtectionChoice({ hostedSettings: null })).toBeNull();
    expect(screenProtectionChoice(settings("app"))).toBe("app");
    expect(screenProtectionChoice({ hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, screenProtection: "everything" as never } })).toBeNull();
    expect(hostedScreenProtection({ hostedSettings: null })).toBe("off");
    expect(hostedScreenProtection(settings("content"))).toBe("content");
    expect(screenProtectionFormValue({ hostedSettings: null, backend: "hosted" })).toBe("off");
    expect(screenProtectionFormValue({ hostedSettings: null, backend: "wordpress" })).toBe("plugin");
    expect(screenProtectionFormValue({ hostedSettings: null, backend: "setup_requested" })).toBe("plugin");
    expect(screenProtectionFormValue({ ...settings("off"), backend: "wordpress" })).toBe("off");
  });

  it("offers course content only to academies, and the plugin's setting only on WordPress", () => {
    const academy = { appType: "lms" as const, backend: "hosted" as const };
    const shop = { appType: "store" as const, backend: "wordpress" as const };
    expect(offersContentScope(academy)).toBe(true);
    expect(offersContentScope(shop)).toBe(false);
    expect(parseScreenProtectionChoice("content", academy)).toBe("content");
    expect(parseScreenProtectionChoice("content", shop)).toBeUndefined();
    expect(parseScreenProtectionChoice("app", shop)).toBe("app");
    expect(parseScreenProtectionChoice("off", academy)).toBe("off");
    expect(parseScreenProtectionChoice("plugin", shop)).toBeNull();
    expect(parseScreenProtectionChoice("plugin", academy)).toBeUndefined();
    expect(parseScreenProtectionChoice("", academy)).toBeUndefined();
  });

  it("is every app type's choice, except an own API's, which sends its own", () => {
    for (const backend of ["hosted", "wordpress", "setup_requested"] as const) expect(choosesScreenProtection({ backend })).toBe(true);
    expect(choosesScreenProtection({ backend: "custom_api" })).toBe(false);
  });
});

describe("53 screen protection in the hosted config and the license status", () => {
  async function hostedConfig(app: App) {
    const { store } = await setupClient();
    await store.createApp(app);
    const context: HostedContext = {
      store,
      app,
      active: true,
      now: NOW,
      ip: "203.0.113.9",
      secret: "test-hosted-secret",
      sender: new LogSender(),
      push: false,
      assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
      platformUrl: "https://yallapp.test",
    };
    const result = await handleHosted(context, {
      method: "GET",
      path: ["config"],
      query: new URLSearchParams({ platform: "android", app_version: "1.0.0" }),
      body: undefined,
      token: null,
      headers: new Headers(),
    });
    expectContract("GET", "/config", result);
    return (result as { body: { app: Record<string, unknown>; content: Record<string, unknown> } }).body;
  }

  it("tells a hosted app what to protect, and apps built before it whether lessons are protected", async () => {
    const { client } = await setupClient();
    const base: App = { ...newApp(client.id, null, NOW, "events"), backend: "hosted", appName: "City Events", websiteDoneAt: NOW };
    let body = await hostedConfig(base);
    expect(body.app.screen_protection).toBe("off");
    expect(body.content.block_screen_capture).toBe(false);
    body = await hostedConfig({ ...base, ...settings("app") });
    expect(body.app.screen_protection).toBe("app");
    expect(body.content.block_screen_capture).toBe(true);
  });

  it("sends a WordPress site the owner's choice, or null for the plugin's own setting", async () => {
    const { store, licenseKey, client } = await setupClient({ plan: "pro" });
    const app: App = { ...newApp(client.id, "https://academy.test", NOW, "lms"), appName: "Ada Academy" };
    await store.createApp(app);
    const site = parseSiteInfo({ license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.4.2" });
    if (!site.ok) throw new Error("site");
    await activateLicense(store, site.value, NOW);
    let result = await checkLicense(store, site.value, NOW);
    expectPlatformContract("POST", "/licenses/check", result);
    expect((result as unknown as { body: Record<string, unknown> }).body.screen_protection).toBeNull();
    await store.updateApp(app.id, settings("content"), NOW);
    result = await checkLicense(store, site.value, NOW);
    expectPlatformContract("POST", "/licenses/check", result);
    expect((result as unknown as { body: Record<string, unknown> }).body.screen_protection).toBe("content");
  });
});
