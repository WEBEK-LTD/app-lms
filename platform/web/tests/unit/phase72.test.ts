import { describe, expect, it } from "vitest";
import { runAnalyticsNightly } from "@/lib/analytics/aggregate";
import { rangeFrom } from "@/lib/analytics/report";
import { analyticsKeep, analyticsKeptFrom, keptMonths, purgeAnalyticsHistory, purgeRawEvents } from "@/lib/analytics/retention";
import { RAW_RETENTION_DAYS, type AnalyticsEventRow } from "@/lib/analytics/types";
import { hidesVideoBranding, choosesVideoBranding } from "@/lib/app/video-branding";
import { newApp } from "@/lib/app/setup";
import { checkoutAccount, encryptOwnPayment, paymentsSetUp } from "@/lib/catalog/settings";
import { bothWhatsApp, browserInEgypt, DEFAULT_WHATSAPP, DEFAULT_WHATSAPP_EGYPT, regionOf, whatsappFor, whatsappLines } from "@/lib/contact-lines";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type License } from "@/lib/data/types";
import { contactValues } from "@/lib/email/send";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { activateLicense, checkLicense, parseSiteInfo } from "@/lib/license/service";
import { comparisonRows, formatAnalyticsKeep, PLAN_INFO, PLAN_LIMITS, plansWith } from "@/lib/plans";
import { FEATURE_SWITCHES } from "@/lib/switches";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";
import { expectPlatformContract } from "./platform-contract";

describe("72 two WhatsApp support numbers", () => {
  it("keeps the old number for outside Egypt and adds Egypt's, also for settings saved before", () => {
    const lines = whatsappLines({ whatsapp: "+90 544 673 19 42" });
    expect(lines.egypt).toEqual({ region: "egypt", url: "https://wa.me/201042560010", display: "+20 104 256 0010" });
    expect(lines.international).toEqual({ region: "international", url: "https://wa.me/905446731942", display: "+90 544 673 19 42" });
    expect(DEFAULT_WHATSAPP).toBe("+90 544 673 19 42");
    expect(DEFAULT_WHATSAPP_EGYPT).toBe("+20 104 256 0010");
    expect(whatsappLines({ whatsapp: "+90 1", whatsappEgypt: "+20 100 000 0001" }).egypt.url).toBe("https://wa.me/201000000001");
  });

  it("picks Egypt's number in Egypt and the international one elsewhere or when the country isn't known", () => {
    const lines = whatsappLines({ whatsapp: DEFAULT_WHATSAPP, whatsappEgypt: DEFAULT_WHATSAPP_EGYPT });
    expect(regionOf("EG")).toBe("egypt");
    expect(regionOf("eg")).toBe("egypt");
    expect(regionOf("TR")).toBe("international");
    expect(regionOf(null)).toBe("international");
    expect(whatsappFor(lines, "EG").display).toBe("+20 104 256 0010");
    expect(whatsappFor(lines, "GB").display).toBe("+90 544 673 19 42");
    expect(whatsappFor(lines, undefined).display).toBe("+90 544 673 19 42");
  });

  it("tells Egypt in the browser by Cairo's time zone or an Egyptian language region", () => {
    expect(browserInEgypt("Africa/Cairo", ["en-US"])).toBe(true);
    expect(browserInEgypt("Europe/Istanbul", ["ar-EG", "ar"])).toBe(true);
    expect(browserInEgypt("Europe/Istanbul", ["ar", "en-GB", "ar-EG"])).toBe(false);
    expect(browserInEgypt("Europe/Istanbul", ["tr-TR"])).toBe(false);
    expect(browserInEgypt(undefined, [])).toBe(false);
  });

  it("writes both numbers with their labels in emails, in each language", () => {
    const contact = { whatsapp: DEFAULT_WHATSAPP, email: "info@yallapp.test" };
    expect(contactValues(contact, "en")).toEqual({
      yallapp_whatsapp: "+20 104 256 0010 (In Egypt) · +90 544 673 19 42 (Outside Egypt)",
      yallapp_whatsapp_egypt: "+20 104 256 0010",
      yallapp_whatsapp_international: "+90 544 673 19 42",
      yallapp_email: "info@yallapp.test",
    });
    expect(contactValues(contact, "ar").yallapp_whatsapp).toBe("+20 104 256 0010 (داخل مصر) · +90 544 673 19 42 (خارج مصر)");
    expect(contactValues(contact, "tr").yallapp_whatsapp).toBe("+20 104 256 0010 (Mısır'da) · +90 544 673 19 42 (Mısır dışında)");
    expect(bothWhatsApp(whatsappLines(contact), { inEgypt: "a", outsideEgypt: "b" })).toBe("+20 104 256 0010 (a) · +90 544 673 19 42 (b)");
  });
});

describe("72 no marketplace", () => {
  const legacy = {
    provider: "yallapp" as const,
    subMerchantKey: "sub-1",
    subMerchantType: "PERSONAL" as const,
    payeeName: "Rose Shop",
    ibanLast4: "1234",
    sandbox: true,
    joinedAt: NOW.toISOString(),
  };

  it("a shop that had joined takes no payments until it adds its own account", async () => {
    const store = new MemoryStore();
    const app: App = { ...newApp("c1", null, NOW, "store"), catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: legacy } };
    expect(paymentsSetUp(app)).toBe(false);
    await store.setPlatformSetting("marketplace", { commissionPercent: 10 }, "admin@yallapp.test", NOW);
    expect(await checkoutAccount(store, app, KEY)).toBeNull();
    const own: App = {
      ...app,
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: encryptOwnPayment(app.id, { provider: "fawaterk", apiKey: "k", sandbox: true }, KEY) },
    };
    expect(paymentsSetUp(own)).toBe(true);
    expect(await checkoutAccount(store, own, KEY)).toEqual({ account: { provider: "fawaterk", keys: { apiKey: "k", sandbox: true } }, marketplace: null });
  });

  it("can't be switched on in the admin", () => {
    expect(FEATURE_SWITCHES.map((s) => s.id)).not.toContain("marketplace");
  });
});

describe("72 analytics kept by plan", () => {
  it("keeps daily totals 3 months on Starter, 1 year on Growth, 2 on Pro, 3 on Business, single events 90 days", () => {
    expect([PLAN_INFO.starter, PLAN_INFO.growth, PLAN_INFO.pro, PLAN_INFO.business].map((p) => p.limits.analyticsMonths)).toEqual([3, 12, 24, 36]);
    expect(RAW_RETENTION_DAYS).toBe(90);
    expect(PLAN_LIMITS.map((l) => l.id)).toContain("analyticsMonths");
    expect(formatAnalyticsKeep(3)).toBe("3 months");
    expect(formatAnalyticsKeep(12)).toBe("1 year");
    expect(formatAnalyticsKeep(36)).toBe("3 years");
    expect(formatAnalyticsKeep(1)).toBe("1 month");
    expect(formatAnalyticsKeep(null)).toBe("Until the app is deleted");
    const rows = comparisonRows(PLAN_INFO);
    expect(rows.find((r) => r.label === "Analytics: daily totals kept")?.values).toEqual({ starter: "3 months", growth: "1 year", pro: "2 years", business: "3 years" });
    expect(rows.find((r) => r.label.startsWith("Analytics: single events kept"))?.values.business).toBe("90 days");
  });

  it("is a plan setting the team edits; edits saved before keep the defaults", () => {
    const edit = (limits: Record<string, unknown>) =>
      plansWith({ growth: { ...PLAN_INFO.growth, version: 2, limits: { ...PLAN_INFO.growth.limits, ...limits } as never } }).growth.limits.analyticsMonths;
    expect(edit({ analyticsMonths: 6 })).toBe(6);
    expect(edit({ analyticsMonths: null })).toBeNull();
    expect(edit({ analyticsMonths: 0 })).toBe(12);
    expect(edit({ analyticsMonths: 500 })).toBe(12);
    expect(edit({ analyticsMonths: undefined })).toBe(12);
  });

  it("counts calendar months back, to the month's last day when it's shorter", () => {
    expect(analyticsKeptFrom("2026-10-21", 3)).toBe("2026-07-21");
    expect(analyticsKeptFrom("2026-10-21", 12)).toBe("2025-10-21");
    expect(analyticsKeptFrom("2026-05-31", 3)).toBe("2026-02-28");
    expect(analyticsKeptFrom("2026-01-15", 1)).toBe("2025-12-15");
    expect(analyticsKeptFrom("2026-01-15", null)).toBeNull();
    expect(keptMonths(null)).toBe(3);
    expect(analyticsKeep(PLAN_INFO.business, new Date("2026-10-21T12:00:00Z"))).toEqual({ from: "2023-10-21", months: 36 });
  });

  it("the Analytics page starts no earlier than what is kept, and says when it cut the range", () => {
    const now = new Date("2026-10-21T12:00:00Z");
    expect(rangeFrom({ range: "90" }, now, "UTC", "2026-09-01")).toMatchObject({ from: "2026-09-01", to: "2026-10-21", limited: true, keptFrom: "2026-09-01" });
    expect(rangeFrom({ range: "7" }, now, "UTC", "2026-09-01")).toMatchObject({ from: "2026-10-15", limited: false });
    expect(rangeFrom({ range: "custom", from: "2026-01-01", to: "2026-02-01" }, now, "UTC", "2026-09-01")).toMatchObject({ from: "2026-09-01", to: "2026-09-01", days: 1, limited: true });
    expect(rangeFrom({ range: "custom", from: "2026-01-01", to: "2026-02-01" }, now)).toMatchObject({ from: "2026-01-01", limited: false });
  });

  it("the daily job deletes each app's older daily totals by its plan, in batches", async () => {
    const store = new MemoryStore();
    const now = new Date("2026-10-21T03:00:00Z");
    const row = { metric: "active" as const, key: "", label: null, value: 1 };
    const days = ["2023-01-01", "2024-06-01", "2025-11-01", "2026-06-01", "2026-08-01", "2026-10-20"];
    for (const app of ["starter", "business", "none", "forever"]) for (const day of days) await store.saveAnalyticsDaily(app, day, [row, { ...row, metric: "sessions" }]);
    const plans = plansWith({ pro: { ...PLAN_INFO.pro, version: 2, limits: { ...PLAN_INFO.pro.limits, analyticsMonths: null } } });
    const deps = {
      purgeAnalyticsEvents: store.purgeAnalyticsEvents.bind(store),
      purgeAnalyticsDaily: store.purgeAnalyticsDaily.bind(store),
      listApps: async () => ["starter", "business", "none", "forever"].map((id) => ({ id }) as App),
      listLicenses: async () =>
        [
          { appId: "starter", plan: "starter" },
          { appId: "business", plan: "growth", nextPlan: "business", nextPlanAt: new Date("2026-10-01T00:00:00Z") },
          { appId: "forever", plan: "pro" },
        ] as License[],
    };
    const result = await purgeAnalyticsHistory(deps, plans, now, { batch: 3 });
    expect(result.finished).toBe(true);
    const kept = async (app: string) => [...new Set((await store.listAnalyticsDaily(app, "2000-01-01", "2100-01-01")).map((r) => r.day))];
    // Starter (and an app without a plan): 3 months, from 2026-07-21.
    expect(await kept("starter")).toEqual(["2026-08-01", "2026-10-20"]);
    expect(await kept("none")).toEqual(["2026-08-01", "2026-10-20"]);
    // Business (a downgrade's date counts): 3 years, from 2023-10-21.
    expect(await kept("business")).toEqual(["2024-06-01", "2025-11-01", "2026-06-01", "2026-08-01", "2026-10-20"]);
    // A plan set to keep them until the app is deleted.
    expect(await kept("forever")).toEqual(days);
    expect(result.deleted).toBe(2 * 4 * 2 + 1 * 2);
    // Nothing left: a second run deletes nothing.
    expect((await purgeAnalyticsHistory(deps, plans, now)).deleted).toBe(0);
  });

  it("raw events go after 90 days, a batch at a time", async () => {
    const store = new MemoryStore();
    const event = (day: string, i: number): AnalyticsEventRow => ({
      appId: "a1", installId: `00000000-0000-4000-8000-00000000000${i}`, type: "app_open", at: new Date(`${day}T10:00:00Z`), day, platform: "ios",
      appVersion: "1.0.0", osVersion: null, language: null, country: null, firstOpen: false, screen: null, itemKind: null, itemId: null, title: null,
      amountCents: null, currency: null, notificationId: null, pushType: null,
    });
    await store.insertAnalyticsEvents([event("2026-06-01", 1), event("2026-06-02", 2), event("2026-06-03", 3), event("2026-07-24", 4), event("2026-10-20", 5)]);
    expect(await purgeRawEvents(store, "2026-07-24", Date.now() + 10_000, 2)).toEqual({ deleted: 3, finished: true });
    expect(await store.listAnalyticsEvents("a1", "2026-07-24")).toHaveLength(1);
    await store.insertAnalyticsEvents([event("2026-07-22", 6), event("2026-07-23", 7)]);
    // The nightly count: today 2026-10-21, the first day kept 2026-07-24.
    const result = await runAnalyticsNightly(store, new Date("2026-10-21T03:00:00Z"));
    expect(result.purged).toBe(2);
  });
});

describe("72 the video site's own player by default", () => {
  it("is off until the owner hides the branding, and an own API sends its own", () => {
    expect(hidesVideoBranding({ hostedSettings: null })).toBe(false);
    expect(hidesVideoBranding({ hostedSettings: { ...DEFAULT_HOSTED_SETTINGS } })).toBe(false);
    expect(hidesVideoBranding({ hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, hideVideoBranding: true } })).toBe(true);
    expect(choosesVideoBranding({ backend: "hosted" })).toBe(true);
    expect(choosesVideoBranding({ backend: "wordpress" })).toBe(true);
    expect(choosesVideoBranding({ backend: "custom_api" })).toBe(false);
  });

  it("reaches a hosted app's config, against the contract", async () => {
    const { store, client } = await setupClient({ plan: "pro" });
    const hosted: App = { ...newApp(client.id, null, NOW, "events"), backend: "hosted", appName: "City Events", websiteDoneAt: NOW };
    await store.createApp(hosted);
    const config = async (app: App) => {
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
      return (result as { body: { app: Record<string, unknown> } }).body.app;
    };
    expect((await config(hosted)).hide_video_branding).toBe(false);
    expect((await config({ ...hosted, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, hideVideoBranding: true } })).hide_video_branding).toBe(true);

  });

  it("reaches a WordPress site's license status", async () => {
    const { store, licenseKey, client } = await setupClient({ plan: "pro" });
    const site: App = { ...newApp(client.id, "https://academy.test", NOW, "lms"), appName: "Ada Academy" };
    await store.createApp(site);
    const info = parseSiteInfo({ license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.4.6" });
    if (!info.ok) throw new Error("site");
    await activateLicense(store, info.value, NOW);
    let result = await checkLicense(store, info.value, NOW);
    expectPlatformContract("POST", "/licenses/check", result);
    expect((result as unknown as { body: Record<string, unknown> }).body.hide_video_branding).toBe(false);
    await store.updateApp(site.id, { hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, hideVideoBranding: true } }, NOW);
    result = await checkLicense(store, info.value, NOW);
    expectPlatformContract("POST", "/licenses/check", result);
    expect((result as unknown as { body: Record<string, unknown> }).body.hide_video_branding).toBe(true);
  });
});
