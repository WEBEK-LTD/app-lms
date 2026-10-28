import { beforeEach, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { buildHasIos, initialStages, newApp } from "@/lib/app/setup";
import { activateWithFreeCoupon } from "@/lib/billing/plan-payment";
import { applyDuePlanChanges, creditDays, currentPlanId, extendedUntil, planChangeFor, scheduleDowngrade, scheduledPlan } from "@/lib/billing/plan-change";
import { buildSecrets } from "@/lib/builds/signing";
import type { MemoryStore } from "@/lib/data/memory";
import type { App, Client, License } from "@/lib/data/types";
import { EMAIL_TEMPLATES } from "@/lib/email/templates";
import { effectivePlans, planOfLicense } from "@/lib/entitlements";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { checkLicense } from "@/lib/license/service";
import { checkAppUserNotices, daysLeft, reminderFor, remindLicense, runDailyNotices, type Mailer } from "@/lib/notices";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { allowedSources, languagesForPlan, layoutForPlan, planLayoutErrors } from "@/lib/pages/plan";
import type { Layout } from "@/lib/pages/types";
import { comparisonRows, lowestPlanWith, PLAN_INFO, planSettingOf, plansWith, type PlanInfo } from "@/lib/plans";
import { expectContract } from "./contract";
import { days, KEY, NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };

describe("13.1 plans", () => {
  it("has four tiers, each a step up", () => {
    // 103R.3 Then Yallapp Studio's own plans.
    expect(Object.keys(PLAN_INFO)).toEqual(["starter", "growth", "pro", "business", "studio_1", "studio_2", "studio_3", "studio_4", "studio_5", "studio_6", "studio_7", "studio_8"]);
    expect(PLAN_INFO.starter.features).toEqual(["push"]);
    expect(PLAN_INFO.starter.limits).toMatchObject({ appUsers: 1000, languages: 1, sources: 1 });
    expect(PLAN_INFO.growth.limits).toMatchObject({ appUsers: 10000, languages: 3 });
    expect(PLAN_INFO.growth.features).toContain("ios");
    expect(PLAN_INFO.growth.features).not.toContain("auto_publish");
    expect(PLAN_INFO.pro.features).toContain("auto_publish");
    expect(PLAN_INFO.pro.limits).toMatchObject({ appUsers: null, languages: null });
    expect(PLAN_INFO.business.limits).toMatchObject({ accountManager: true, customFeatures: true });
  });

  it("keeps a full edit from the admin and only the price of an old one", () => {
    const edited = plansWith({
      starter: { ...planSettingOf(PLAN_INFO.starter), features: ["push", "ios"], limits: { ...PLAN_INFO.starter.limits, appUsers: 2000 } },
      growth: { name: "Starter", tagline: "old", highlights: ["old"], price: "On request", priceCents: 99_00, currency: "USD", billingMonths: 1, features: [] },
      pro: { name: "Pro", tagline: "old", highlights: ["old"], price: "On request", priceCents: 1500_00, currency: "EGP", billingMonths: 12, features: [] },
      business: { name: "Business", tagline: "old", highlights: ["old"], price: "On request", priceCents: 4800_00, currency: "TRY", billingMonths: 12, features: [] },
    });
    expect(edited.starter.features).toEqual(["push", "ios"]);
    expect(edited.starter.limits.appUsers).toBe(2000);
    // 52 Prices are in pounds now: an old dollar price is kept as the shown dollar price, a pound price as the price, any other is dropped.
    expect(edited.growth).toMatchObject({ name: "Growth", features: PLAN_INFO.growth.features, priceCents: null, usdCents: 9900, onRequest: true, period: null });
    expect(edited.pro).toMatchObject({ priceCents: 150000, usdCents: null, onRequest: false, period: "year" });
    expect(edited.business).toMatchObject({ priceCents: null, usdCents: null, onRequest: true, period: null });
  });

  it("finds the plan to upgrade to and builds the comparison table", () => {
    expect(lowestPlanWith(PLAN_INFO, (p) => p.features.includes("ios"), "starter")?.id).toBe("growth");
    expect(lowestPlanWith(PLAN_INFO, (p) => p.features.includes("auto_publish"), "growth")?.id).toBe("pro");
    expect(lowestPlanWith(PLAN_INFO, (p) => p.features.includes("push"), "business")).toBeNull();
    const rows = comparisonRows(PLAN_INFO);
    expect(rows.find((r) => r.label === "iOS app")?.values).toEqual({ starter: false, growth: true, pro: true, business: true });
    expect(rows.find((r) => r.label === "App users")?.values).toEqual({ starter: "1,000", growth: "10,000", pro: "Unlimited", business: "Unlimited" });
    expect(rows.find((r) => r.label === "Pages")?.values.starter).toBe("Ready-made templates");
  });

  it("applies switches to what apps may use", async () => {
    const { store } = await setupClient();
    await store.setPlatformSetting("switches", { off: ["feature:offline_downloads"], offByPlan: { growth: ["feature:ios"] } }, "owner@yallapp.test", NOW);
    const plans = await effectivePlans(store);
    expect(plans.growth.features).not.toContain("ios");
    expect(plans.growth.features).not.toContain("offline_downloads");
    expect(plans.pro.features).toContain("ios");
  });
});

describe("13.3 plan changes", () => {
  const priced = plansWith({
    growth: { ...planSettingOf(PLAN_INFO.growth), priceCents: 1_200_00, onRequest: false, billingMonths: 12 },
    pro: { ...planSettingOf(PLAN_INFO.pro), priceCents: 3_600_00, onRequest: false, billingMonths: 12 },
  });

  it("credits the days left at their value on an upgrade", () => {
    // 100 days of EGP 1,200/year are worth a third of 100 days of EGP 3,600/year.
    expect(creditDays(priced.growth, priced.pro, 100 * 86_400_000, NOW)).toBe(33);
    // Without card prices to compare, the days carry over one for one.
    expect(creditDays(PLAN_INFO.growth, PLAN_INFO.pro, 100.5 * 86_400_000, NOW)).toBe(100);
    const license = { plan: "growth" as const, expiresAt: days(100), nextPlan: null, nextPlanAt: null };
    const change = planChangeFor(license, priced.pro, 12, priced, NOW);
    expect(change).toMatchObject({ kind: "upgrade", plan: "pro", creditDays: 33, nextPlan: null });
    expect(change.activeUntil.getTime()).toBe(extendedUntil(null, 12, NOW).getTime() + 33 * 86_400_000);
  });

  it("starts a downgrade when the paid period ends, and renews the same plan from the end", () => {
    const license = { plan: "pro" as const, expiresAt: days(40), nextPlan: null, nextPlanAt: null };
    const down = planChangeFor(license, priced.growth, 12, priced, NOW);
    expect(down).toMatchObject({ kind: "downgrade", plan: "pro", nextPlan: "growth" });
    expect(down.nextPlanAt).toEqual(days(40));
    expect(down.activeUntil).toEqual(extendedUntil(days(40), 12, NOW));
    const same = planChangeFor(license, priced.pro, 12, priced, NOW);
    expect(same).toMatchObject({ kind: "renew", plan: "pro", nextPlan: null });
    // After the end, any plan starts today.
    const ended = planChangeFor({ ...license, expiresAt: days(-3) }, priced.growth, 12, priced, NOW);
    expect(ended).toMatchObject({ kind: "renew", plan: "growth", nextPlan: null });
    expect(ended.activeUntil).toEqual(extendedUntil(null, 12, NOW));
  });

  it("schedules a downgrade without payment and applies it on its date", async () => {
    const { store, license } = await setupClient({ plan: "pro", activeUntil: days(20) });
    expect((await scheduleDowngrade(store, license!, "pro", NOW)).ok).toBe(false);
    expect(await scheduleDowngrade(store, license!, "starter", NOW)).toEqual({ ok: true, at: days(20) });
    const saved = (await store.getLicenseById(license!.id))!;
    expect(scheduledPlan(saved, NOW)).toEqual({ plan: "starter", at: days(20) });
    expect(currentPlanId(saved, NOW)).toBe("pro");
    expect(currentPlanId(saved, days(21))).toBe("starter");
    expect(await applyDuePlanChanges(store, days(10))).toBe(0);
    expect(await applyDuePlanChanges(store, days(21))).toBe(1);
    expect(await store.getLicenseById(license!.id)).toMatchObject({ plan: "starter", nextPlan: null, nextPlanAt: null });
  });

  it("upgrades at once when a payment is for a higher plan, and clears a scheduled downgrade", async () => {
    const setup = await setupClient({ plan: "growth", activeUntil: days(50) });
    const app = { ...newApp(setup.client.id, null, NOW, "lms"), appName: "Ada Academy" };
    await setup.store.createApp(app);
    await scheduleDowngrade(setup.store, setup.license!, "starter", NOW);
    const coupon = { ok: true as const, coupon: { id: "c1", code: "FREE" } as never, fullCents: 0, discountCents: 0, amountCents: 0 };
    const outcome = await activateWithFreeCoupon({ store: setup.store, client: setup.client, app, plan: PLAN_INFO.pro, coupon, charged: { cents: 0, currency: "EGP" }, encryptionKey: KEY, now: NOW });
    expect(outcome.change).toMatchObject({ kind: "upgrade", plan: "pro", creditDays: 50 });
    const license = (await setup.store.getLicenseForApp(setup.client.id, app.id))!;
    expect(license).toMatchObject({ plan: "pro", nextPlan: null });
    expect(license.expiresAt.getTime()).toBe(extendedUntil(null, 12, NOW).getTime() + 50 * 86_400_000);
  });
});

describe("13.1 builds per plan", () => {
  it("skips iOS without it in the plan, and sends no App Store key", () => {
    const app: App = {
      ...newApp("client-1", null, NOW, "lms"),
      ascIssuerId: "issuer",
      ascKeyId: "KEY1234567",
      ascPrivateKeyEncrypted: null,
    };
    const stages = initialStages(true, { ...app, googlePlayKeyEncrypted: "x", ascPrivateKeyEncrypted: "y" }, false);
    expect(stages).toMatchObject({ ios: "skipped", upload_testflight: "skipped", upload_play: "pending" });
    expect(buildHasIos({ stages })).toBe(false);
    expect(buildSecrets(app, KEY, { ios: false }).app_store_connect).toBeNull();
  });
});

describe("13.1 pages, looks and languages per plan", () => {
  const app = { ...newApp("client-1", "https://academy.test", NOW, "lms"), appName: "Ada Academy" };
  const custom: Layout = {
    version: "2026-10-01T00:00:00Z.3",
    ...defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW),
    languages: { default: "en", available: ["en", "ar", "tr"] },
  };
  custom.pages = [
    {
      slug: "home",
      title: "Home",
      show_title: false,
      updated_at: NOW.toISOString(),
      blocks: [
        { id: "b1", type: "text", visibility: "everyone", html: "<p>Hello</p>" },
        { id: "b2", type: "items", visibility: "everyone", source: "posts", layout: "list" },
        { id: "b3", type: "items", visibility: "everyone", source: "courses", layout: "list" },
      ],
    },
  ];

  it("gives a plan without the page editor the ready-made pages, with one language and one source", () => {
    expect(allowedSources(app, PLAN_INFO.starter)).toEqual(["courses"]);
    expect(allowedSources(app, PLAN_INFO.growth)).toEqual(["courses", "posts"]);
    const served = layoutForPlan(custom, app, PLAN_INFO.starter, BUILT_IN_APP_DEFAULTS);
    expect(served.version).not.toBe(custom.version);
    expect(served.languages).toEqual({ default: "en", available: ["en"] });
    expect(served.pages).toEqual(defaultLayout(app, BUILT_IN_APP_DEFAULTS, app.createdAt).pages.map((p) => ({ ...p, blocks: p.blocks.filter((b) => !b.source || b.source === "courses") })));
    expect(served.appearance).toEqual(custom.appearance);
  });

  it("keeps the client's pages on a plan with the editor, within its languages and sources", () => {
    const growth = layoutForPlan(custom, app, PLAN_INFO.growth, BUILT_IN_APP_DEFAULTS);
    expect(growth).toBe(custom);
    const limited: PlanInfo = { ...PLAN_INFO.growth, limits: { ...PLAN_INFO.growth.limits, languages: 2, sources: 1 } };
    const served = layoutForPlan(custom, app, limited, BUILT_IN_APP_DEFAULTS);
    expect(served.languages.available).toEqual(["en", "ar"]);
    expect(served.pages[0]!.blocks.map((b) => b.id)).toEqual(["b1", "b3"]);
    expect(languagesForPlan({ default: "tr", available: ["en", "ar", "tr"] }, PLAN_INFO.starter)).toEqual({ default: "tr", available: ["tr"] });
    expect(planLayoutErrors(custom, PLAN_INFO.starter)).toEqual(["Your Starter plan includes 1 app language. Turn off the others, or upgrade your plan."]);
    expect(planLayoutErrors(custom, PLAN_INFO.pro)).toEqual([]);
  });
});

describe("13.1 license API", () => {
  it("reports the plan's features and limits to the plugin", async () => {
    const { store, licenseKey } = await setupClient({ plan: "starter" });
    const { activateLicense } = await import("@/lib/license/service");
    const site = { licenseKey: licenseKey!, siteUrlRaw: "https://academy.test", siteUrl: "academy.test", pluginVersion: "0.4.0", wpVersion: "7.1", lms: "tutor", store: null, bookings: null };
    await activateLicense(store, site, NOW);
    const result = await checkLicense(store, site, NOW);
    expect(result.status === 200 && result.body).toMatchObject({ plan: "starter", features: ["push"], limits: { app_users: 1000, languages: 1, sources: 1 } });
  });
});

describe("13.2 and 13.5 the hosted API and the plan", () => {
  let store: MemoryStore;
  let client: Client;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let plan: PlanInfo;
  let counted: number[];

  beforeEach(async () => {
    const setup = await setupClient({ plan: "starter" });
    store = setup.store;
    client = setup.client;
    app = {
      ...newApp(client.id, null, NOW, "store"),
      backend: "hosted",
      appName: "Rose Shop",
      supportEmail: "help@rose.test",
      hostedSettings: {
        signupFields: [],
        signupAllowed: true,
        defaultCountryCode: "+90",
        deviceLimit: 2,
        supportWhatsapp: "+905321112233",
        termsUrl: null,
        reviewPhone: "+905550000000",
        reviewCode: "123456",
      },
      websiteDoneAt: NOW,
    };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
    plan = { ...PLAN_INFO.starter, limits: { ...PLAN_INFO.starter.limits, appUsers: 2 } };
    counted = [];
  });

  const context = (overrides: Partial<HostedContext> = {}): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: true,
    plan,
    onUsersCounted: async (count) => {
      counted.push(count);
    },
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    ...overrides,
  });

  async function call(method: string, route: string, body?: unknown, overrides: Partial<HostedContext> = {}, query: Record<string, string> = {}): Promise<HostedResult> {
    const result = await handleHosted(context(overrides), { method, path: route.split("/").filter(Boolean), query: new URLSearchParams(query), body, token: null });
    expectContract(method, route, result);
    return result;
  }

  async function verify(phone: string, code?: string) {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { country_code: "+90", phone });
    const requestId = (requested.body as { request_id: string }).request_id;
    return call("POST", "/auth/otp/verify", { request_id: requestId, code: code ?? sender.sent.get(`+90${phone}`)!, device: DEVICE });
  }

  async function signUp(phone: string) {
    const verified = await verify(phone);
    const token = (verified.body as { signup_token: string }).signup_token;
    return call("POST", "/auth/register", { signup_token: token, name: "Sara Yilmaz", device: DEVICE });
  }

  it("refuses a new user past the plan's app users, with the owner's contact; existing users keep signing in", async () => {
    expect((await signUp("5321234561")).status).toBe(201);
    expect((await signUp("5321234562")).status).toBe(201);
    expect(counted).toEqual([1, 2]);
    const refused = await verify("5321234563");
    expect(refused.status).toBe(403);
    expect(refused.body).toEqual({
      code: "app_user_limit",
      message: "Rose Shop isn't taking new members right now. Please contact Rose Shop.",
      contact: { name: "Rose Shop", whatsapp: "+905321112233", email: "help@rose.test" },
    });
    expect(counted).toEqual([1, 2, 2]);
    const existing = await verify("5321234561");
    expect(existing.status).toBe(200);
    expect(existing.body).toHaveProperty("access_token");
    // The store's reviewers always get in.
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { country_code: "+90", phone: "5550000000" });
    const reviewer = await call("POST", "/auth/otp/verify", { request_id: (requested.body as { request_id: string }).request_id, code: "123456", device: DEVICE });
    expect(reviewer.body).toHaveProperty("signup_token");
    // No limit on a bigger plan.
    plan = PLAN_INFO.pro;
    expect((await signUp("5321234565")).status).toBe(201);
  });

  it("checks the limit again at sign-up", async () => {
    const verified = await verify("5321234561");
    const token = (verified.body as { signup_token: string }).signup_token;
    plan = { ...PLAN_INFO.starter, limits: { ...PLAN_INFO.starter.limits, appUsers: 0 } };
    const refused = await call("POST", "/auth/register", { signup_token: token, name: "Sara", device: DEVICE });
    expect(refused.status).toBe(403);
    expect((refused.body as { code: string }).code).toBe("app_user_limit");
  });

  it("says the app is paused, naming who can bring it back", async () => {
    const inactive = await call("GET", "/config", undefined, { active: false }, { platform: "android", app_version: "1.0.0" });
    expect(inactive.status).toBe(503);
    expect(inactive.body).toEqual({
      code: "license_inactive",
      message: "Rose Shop is paused right now. Please contact Rose Shop to bring it back.",
      contact: { name: "Rose Shop", whatsapp: "+905321112233", email: "help@rose.test" },
    });
    const suspended = await call("GET", "/config", undefined, { active: false, suspended: true }, { platform: "android", app_version: "1.0.0" });
    expect((suspended.body as { code: string }).code).toBe("account_suspended");
  });

  it("serves only the plan's features in the config", async () => {
    const starter = await call("GET", "/config", undefined, {}, { platform: "android", app_version: "1.0.0" });
    expect((starter.body as { features: Record<string, unknown> }).features).toMatchObject({ push: true, offline: false });
    expect((starter.body as { site: Record<string, unknown> }).site).toMatchObject({ support_email: "help@rose.test" });
    expect((starter.body as { languages: { available: string[] } }).languages.available).toHaveLength(1);
    plan = { ...PLAN_INFO.growth, features: PLAN_INFO.growth.features.filter((f) => f !== "push") };
    const growth = await call("GET", "/config", undefined, {}, { platform: "android", app_version: "1.0.0" });
    expect((growth.body as { features: Record<string, unknown> }).features).toMatchObject({ push: false, offline: true });
  });
});

describe("13.2 and 13.4 owner notices", () => {
  let store: MemoryStore;
  let client: Client;
  let app: App;
  let license: License;
  let sent: { key: string; to: string; values: Record<string, unknown> }[];
  const mail: Mailer = async (key, to, values) => {
    sent.push({ key, to, values });
  };

  beforeEach(async () => {
    const setup = await setupClient({ plan: "starter", activeUntil: days(30) });
    store = setup.store;
    client = (await store.getClientById(setup.client.id))!;
    app = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", appName: "Rose Shop" };
    await store.createApp(app);
    license = (await store.getLicenseForApp(client.id, app.id))!;
    sent = [];
  });

  const deps = (now: Date = NOW) => ({ store, baseUrl: "https://yallapp.test", mail, now });

  it("tells the owner once at 80% and once at 100%, and again after a new crossing", async () => {
    const plan = PLAN_INFO.starter;
    const input = (count: number) => ({ app, client, plan, plans: PLAN_INFO, count });
    expect(await checkAppUserNotices(deps(), input(799))).toEqual([]);
    expect((await checkAppUserNotices(deps(), input(800)))[0]).toMatchObject({ kind: "app_users_80", title: "Rose Shop has used 80% of its app users" });
    expect(await checkAppUserNotices(deps(), input(812))).toEqual([]);
    expect((await checkAppUserNotices(deps(), input(1000)))[0]).toMatchObject({ kind: "app_users_100" });
    expect(await checkAppUserNotices(deps(), input(1000))).toEqual([]);
    expect(sent.map((s) => s.key)).toEqual(["app_users_80", "app_users_100"]);
    expect(sent[0]).toMatchObject({ to: "ada@academy.test", values: { app_name: "Rose Shop", app_users: "800", app_user_limit: "1,000", plan: "Starter" } });
    expect(String(sent[0]!.values.upgrade_url)).toBe(`https://yallapp.test/dashboard/open?app=${app.id}&to=change-plan&plan=growth`);
    // Users deleted: the notices are resolved; crossing again tells the owner again.
    await checkAppUserNotices(deps(), input(500));
    expect(await store.listOwnerNotices({ clientId: client.id, open: true })).toEqual([]);
    expect((await checkAppUserNotices(deps(), input(850)))[0]).toMatchObject({ dedupeKey: "app_users_80:2" });
    expect(sent).toHaveLength(3);
  });

  it("reminds 7 days, 1 day and on the day a plan ends, once each per period", async () => {
    expect(daysLeft(new Date("2026-10-19T23:59:59.999Z"), NOW)).toBe(7);
    expect(reminderFor(new Date("2026-10-19T23:59:59.999Z"), NOW)).toBe("plan_ends_7");
    expect(reminderFor(new Date("2026-10-13T23:59:59.999Z"), NOW)).toBe("plan_ends_1");
    expect(reminderFor(new Date("2026-10-12T23:59:59.999Z"), NOW)).toBe("plan_ends_0");
    expect(reminderFor(new Date("2026-10-25T23:59:59.999Z"), NOW)).toBeNull();
    expect(reminderFor(new Date("2026-10-01T23:59:59.999Z"), NOW)).toBeNull();

    const end = new Date("2026-10-19T23:59:59.999Z");
    await store.updateLicense(license.id, { expiresAt: end }, NOW);
    license = (await store.getLicenseById(license.id))!;
    const seven = await remindLicense(deps(), { app, client, license, plans: PLAN_INFO });
    expect(seven).toMatchObject({ kind: "plan_ends_7", title: "Rose Shop's plan ends in 7 days", linkLabel: "Renew by card" });
    expect(await remindLicense(deps(days(1)), { app, client, license, plans: PLAN_INFO })).toBeNull();
    expect(await remindLicense(deps(new Date("2026-10-18T09:00:00Z")), { app, client, license, plans: PLAN_INFO })).toMatchObject({ kind: "plan_ends_1" });
    expect(await remindLicense(deps(new Date("2026-10-19T09:00:00Z")), { app, client, license, plans: PLAN_INFO })).toMatchObject({ kind: "plan_ends_0", title: "Rose Shop's plan ends today" });
    expect(sent.map((s) => s.key)).toEqual(["plan_ends_in_7_days", "plan_ends_tomorrow", "plan_ends_today"]);
    expect(String(sent[0]!.values.renew_url)).toBe(`https://yallapp.test/dashboard/open?app=${app.id}&to=renew`);
    // Only the latest one stays open.
    expect((await store.listOwnerNotices({ clientId: client.id, open: true })).map((n) => n.kind)).toEqual(["plan_ends_0"]);
  });

  it("runs the daily job: downgrades, reminders and renewed periods", async () => {
    await activateClient(store, { clientId: client.id, appId: app.id, plan: "pro", activeUntil: days(5), paymentNote: "" }, KEY, NOW);
    license = (await store.getLicenseForApp(client.id, app.id))!;
    await scheduleDowngrade(store, license, "growth", NOW);
    const first = await runDailyNotices(deps());
    expect(first).toMatchObject({ planChanges: 0, reminders: 1 });
    expect((await runDailyNotices(deps())).reminders).toBe(0);
    // Renewed: the old period's reminder is no longer true.
    await activateClient(store, { clientId: client.id, appId: app.id, plan: "pro", activeUntil: days(200), paymentNote: "" }, KEY, NOW);
    expect((await runDailyNotices(deps())).resolved).toBe(1);
    expect(await store.listOwnerNotices({ clientId: client.id, open: true })).toEqual([]);
    // A scheduled downgrade lands on its date.
    license = (await store.getLicenseForApp(client.id, app.id))!;
    await scheduleDowngrade(store, license, "starter", NOW);
    expect((await runDailyNotices(deps(days(201)))).planChanges).toBe(1);
    const after = (await store.getLicenseForApp(client.id, app.id))!;
    expect(after.plan).toBe("starter");
    expect(planOfLicense(PLAN_INFO, after, days(201))?.id).toBe("starter");
  });

  it("has an editable email template for each notice", () => {
    for (const key of ["app_users_80", "app_users_100", "plan_ends_in_7_days", "plan_ends_tomorrow", "plan_ends_today"]) {
      const template = EMAIL_TEMPLATES.find((t) => t.key === key)!;
      expect(template.placeholders.map((p) => p.name)).toContain("app_name");
      expect(template.body).toContain("{{app_name}}");
    }
  });
});
