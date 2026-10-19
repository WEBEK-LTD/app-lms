import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import {
  clearPlatformSettingsCache,
  encryptSetting,
  platformSettings,
  resolvedOtpSenderConfig,
  resolvedSmtpConfig,
  yallappIyzicoKeys,
} from "@/lib/settings/platform";
import { KEY, NOW } from "./helpers";

describe("platform settings", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    clearPlatformSettingsCache();
    vi.stubEnv("OTP_SENDER", "webhook");
    vi.stubEnv("OTP_WEBHOOK_URL", "https://env.test/otp");
    vi.stubEnv("OTP_WEBHOOK_SECRET", "env-secret-0123456789");
    vi.stubEnv("SMTP_HOST", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearPlatformSettingsCache();
  });

  it("falls back to the Netlify variables until the admin saves a setting", async () => {
    expect(await resolvedOtpSenderConfig(store, KEY)).toEqual({ kind: "webhook", url: "https://env.test/otp", secret: "env-secret-0123456789" });
    expect(await resolvedSmtpConfig(store, KEY)).toBeNull();
    expect(await yallappIyzicoKeys(store, KEY)).toBeNull();
  });

  it("uses the admin's settings, decrypted", async () => {
    await store.setPlatformSetting(
      "otp",
      { kind: "whatsapp", accessTokenEncrypted: encryptSetting("otp", "meta-token", KEY), phoneNumberId: "1234567", template: "yallapp_code", language: "tr" },
      "admin@yallapp.test",
      NOW,
    );
    await store.setPlatformSetting(
      "smtp",
      { host: "mail.yallapp.test", port: 587, secure: false, user: "info", passEncrypted: encryptSetting("smtp", "mail-pass", KEY), from: "Yallapp <info@yallapp.test>" },
      "admin@yallapp.test",
      NOW,
    );
    await store.setPlatformSetting(
      "iyzico",
      { apiKeyEncrypted: encryptSetting("iyzico", "api", KEY), secretKeyEncrypted: encryptSetting("iyzico", "secret", KEY), sandbox: true },
      "admin@yallapp.test",
      NOW,
    );
    expect(await resolvedOtpSenderConfig(store, KEY)).toEqual({
      kind: "whatsapp",
      accessToken: "meta-token",
      phoneNumberId: "1234567",
      template: "yallapp_code",
      language: "tr",
    });
    expect(await resolvedSmtpConfig(store, KEY)).toEqual({
      host: "mail.yallapp.test",
      port: 587,
      secure: false,
      user: "info",
      pass: "mail-pass",
      from: "Yallapp <info@yallapp.test>",
    });
    expect(await yallappIyzicoKeys(store, KEY)).toEqual({ apiKey: "api", secretKey: "secret", sandbox: true });

    // Secrets are encrypted for their own setting only.
    const stored = (await store.listPlatformSettings()).find((s) => s.key === "otp")!;
    expect(JSON.stringify(stored)).not.toContain("meta-token");
  });

  it("turns codes off, and goes back to the variables when a setting is removed", async () => {
    await store.setPlatformSetting("otp", { kind: "off" }, "admin@yallapp.test", NOW);
    expect(await resolvedOtpSenderConfig(store, KEY)).toBeNull();
    await store.setPlatformSetting("otp", null, "admin@yallapp.test", NOW);
    clearPlatformSettingsCache();
    expect(await resolvedOtpSenderConfig(store, KEY)).toMatchObject({ kind: "webhook" });
  });

  it("caches for 30 seconds per server", async () => {
    await platformSettings(store, { now: 1_000 });
    await store.setPlatformSetting("otp", { kind: "off" }, "admin@yallapp.test", NOW);
    expect((await platformSettings(store, { now: 20_000 })).has("otp")).toBe(false);
    expect((await platformSettings(store, { now: 32_000 })).has("otp")).toBe(true);
  });
});

describe("plans from the admin", () => {
  it("keeps the defaults until the team edits a plan", async () => {
    const { PLAN_INFO, plansWith, planPrice, planSettingOf } = await import("@/lib/plans");
    expect(plansWith(null)).toEqual(PLAN_INFO);
    const plans = plansWith({
      pro: {
        version: 2,
        name: "Premium",
        tagline: "Everything, published for you",
        highlights: ["Automatic publishing"],
        price: "On request",
        priceCents: 480000,
        usdCents: 9900,
        onRequest: false,
        billingMonths: 12,
        features: ["push", "auto_publish"],
        limits: { ...PLAN_INFO.pro.limits, appUsers: 50_000 },
      },
      // 13.1 An edit saved before the four tiers (no version): only its price still applies.
      growth: {
        name: "Starter",
        tagline: "You publish the apps yourself",
        highlights: ["Android APK & AAB, iOS build"],
        price: "On request",
        priceCents: 120000,
        currency: "EGP",
        billingMonths: 12,
        features: ["push", "offline_downloads"],
      },
    });
    expect(plans.starter).toEqual(PLAN_INFO.starter);
    expect(plans.pro).toMatchObject({ id: "pro", name: "Premium", features: ["push", "auto_publish"], period: "year", limits: { appUsers: 50_000 } });
    // 52 Pounds by default and in Egypt; the plan's own dollar price elsewhere.
    expect(planPrice(plans.pro)).toEqual({ price: "EGP\u00a04,800", period: "year" });
    expect(planPrice(plans.pro, { display: "USD", egpPerUsd: 50 })).toEqual({ price: "$99", period: "year" });
    expect(planPrice(plans.starter)).toEqual({ price: "On request", period: null });
    expect(plans.growth).toEqual({ ...PLAN_INFO.growth, priceCents: 120000, onRequest: false, period: "year" });
    // The team can keep a price and show "On request".
    const hidden = plansWith({ pro: { ...planSettingOf(plans.pro), onRequest: true } });
    expect(hidden.pro).toMatchObject({ priceCents: 480000, onRequest: true, period: null });
    expect(planPrice(hidden.pro)).toEqual({ price: "On request", period: null });
  });
});
