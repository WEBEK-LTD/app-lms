import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import { aggregateDay, daysToCount, refreshAnalytics, runAnalyticsNightly, totalsOfDay } from "@/lib/analytics/aggregate";
import { csvCell, reportCsv } from "@/lib/analytics/csv";
import { addDays, dayOf } from "@/lib/analytics/days";
import { analyticsBuildConfig, analyticsKey, countryFromHeaders, languageOf, normalizeQuery, parseBatch } from "@/lib/analytics/ingest";
import { buildReport, loadReport, rangeFrom } from "@/lib/analytics/report";
import { receiveEvents } from "@/lib/analytics/service";
import type { AnalyticsEventRow } from "@/lib/analytics/types";
import { itemWord } from "@/lib/analytics/words";
import { buildConfigFor, newApp } from "@/lib/app/setup";
import { validateBuildConfig } from "@/lib/build-config/validate";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { announce } from "@/lib/hosted/notify";
import { previewConfigFor } from "@/lib/preview/config";
import { expectPlatformContract } from "./platform-contract";

/** 44 Analytics for app owners: the batch, the limits, the daily totals, retention, the report and the export. */

const SECRET = "test-signing-secret-0123456789abcdef0123456789";
const NOW = new Date("2026-10-19T12:00:00Z");
const TODAY = "2026-10-19";
const INSTALL = "3f2b8c1e-7a4d-4e5f-9b6a-1c2d3e4f5a6b";

const contract = parse(readFileSync(path.join(__dirname, "../../../../docs/api/platform.yaml"), "utf8")) as Record<string, unknown>;
const ajv = new Ajv2020({ strict: false, validateSchema: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(contract, "platform");
const batchSchema = ajv.getSchema("platform#/components/schemas/AnalyticsBatch")!;

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function batch(events: Record<string, unknown>[], extra: Record<string, unknown> = {}) {
  return { install_id: INSTALL, platform: "android", app_version: "1.2.0", os_version: "Android 14", locale: "ar_EG", events, ...extra };
}

function row(over: Partial<AnalyticsEventRow>): AnalyticsEventRow {
  const at = over.at ?? new Date(`${over.day ?? TODAY}T10:00:00Z`);
  return {
    appId: "app",
    installId: INSTALL,
    type: "app_open",
    at,
    day: dayOf(at),
    platform: "android",
    appVersion: "1.2.0",
    osVersion: "Android 14",
    language: "ar",
    country: "EG",
    firstOpen: false,
    screen: null,
    itemKind: null,
    itemId: null,
    title: null,
    amountCents: null,
    currency: null,
    notificationId: null,
    pushType: null,
    ...over,
  };
}

async function appIn(store: MemoryStore, appType: App["appType"] = "store"): Promise<App> {
  const app: App = { ...newApp("client-1", "https://shop.test", NOW, appType), appName: "Olive Market" };
  await store.createApp(app);
  return app;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("44 the batch", () => {
  it("takes a valid batch, the contract's own example of every event type", () => {
    const body = batch([
      { type: "app_open", at: "2026-10-19T11:00:00Z", first_open: true },
      { type: "screen_view", at: "2026-10-19T11:00:01Z", screen: "product" },
      { type: "item_view", at: "2026-10-19T11:00:02Z", item_kind: "product", item_id: "42", title: "Olive oil 1 L" },
      { type: "add_to_cart", at: "2026-10-19T11:00:03Z", item_kind: "product", item_id: "42", amount: 12.5, currency: "TRY" },
      { type: "purchase_click", at: "2026-10-19T11:00:04Z", item_kind: "product", item_id: "cart", amount: 25, currency: "TRY" },
      { type: "search", at: "2026-10-19T11:00:05Z", query: "  Olive   OIL " },
      { type: "push_open", at: "2026-10-19T11:00:06Z", notification_id: "7", push_type: "announcement" },
      { type: "share", at: "2026-10-19T11:00:07Z", item_kind: "product", item_id: "42" },
    ]);
    expect(batchSchema(body), JSON.stringify(batchSchema.errors)).toBe(true);
    const parsed = parseBatch(body, NOW);
    if (!parsed.ok) throw new Error(parsed.message);
    expect(parsed.events).toHaveLength(8);
    expect(parsed.dropped).toBe(0);
    expect(parsed.events[0]).toMatchObject({ type: "app_open", firstOpen: true, language: "ar", day: TODAY, platform: "android" });
    expect(parsed.events[3]).toMatchObject({ amountCents: 1250, currency: "TRY", itemKind: "product", itemId: "42" });
    // The search text is never part of the stored event.
    expect(Object.values(parsed.events[5]!)).not.toContain("olive oil");
    expect(parsed.searches).toEqual([{ day: TODAY, query: "olive oil" }]);
    expect(parsed.events[6]).toMatchObject({ notificationId: "7", pushType: "announcement" });
  });

  it("refuses what the contract refuses, naming the problem", () => {
    const cases: [unknown, RegExp][] = [
      [[], /JSON object/],
      [{ ...batch([{ type: "app_open", at: "2026-10-19T11:00:00Z" }]), device_id: "x" }, /Unknown field "device_id"/],
      [batch([{ type: "app_open", at: "2026-10-19T11:00:00Z" }], { install_id: "not-a-uuid" }), /install_id/],
      [batch([{ type: "app_open", at: "2026-10-19T11:00:00Z" }], { platform: "web" }), /platform/],
      [batch([]), /at least one/],
      [batch(Array.from({ length: 101 }, () => ({ type: "app_open", at: "2026-10-19T11:00:00Z" }))), /At most 100/],
      [batch([{ type: "purchase", at: "2026-10-19T11:00:00Z" }]), /known event/],
      [batch([{ type: "app_open", at: "yesterday" }]), /date-time/],
      [batch([{ type: "screen_view", at: "2026-10-19T11:00:00Z", screen: "/course/12" }]), /screen kind/],
      [batch([{ type: "item_view", at: "2026-10-19T11:00:00Z", item_kind: "person", item_id: "1" }]), /known kind/],
      [batch([{ type: "add_to_cart", at: "2026-10-19T11:00:00Z", item_kind: "product", item_id: "1", currency: "lira" }]), /3-letter/],
      [batch([{ type: "app_open", at: "2026-10-19T11:00:00Z", email: "a@b.c" }]), /unknown field "email"/],
    ];
    for (const [body, message] of cases) {
      const parsed = parseBatch(body, NOW);
      expect(parsed.ok, JSON.stringify(body).slice(0, 80)).toBe(false);
      if (!parsed.ok) expect(parsed.message).toMatch(message);
    }
  });

  it("skips events more than 7 days old or more than 10 minutes ahead, and counts them", () => {
    const parsed = parseBatch(
      batch([
        { type: "app_open", at: "2026-10-11T11:00:00Z" },
        { type: "app_open", at: "2026-10-13T11:00:00Z" },
        { type: "app_open", at: "2026-10-19T12:20:00Z" },
        { type: "app_open", at: "2026-10-19T12:05:00+00:00" },
      ]),
      NOW,
    );
    if (!parsed.ok) throw new Error(parsed.message);
    expect(parsed.events.map((e) => e.day)).toEqual(["2026-10-13", TODAY]);
    expect(parsed.dropped).toBe(2);
  });

  it("keeps the fields that go with each type only, and no control characters", () => {
    const parsed = parseBatch(
      batch([
        { type: "app_open", at: "2026-10-19T11:00:00Z", screen: "home", item_kind: "course", item_id: "1", first_open: true },
        { type: "item_view", at: "2026-10-19T11:00:00Z", item_kind: "course", item_id: "9", title: "Line\none\u0007" },
      ]),
      NOW,
    );
    if (!parsed.ok) throw new Error(parsed.message);
    expect(parsed.events[0]).toMatchObject({ screen: null, itemKind: null, itemId: null, firstOpen: true });
    expect(parsed.events[1]!.title).toBe("Line one");
  });

  it("counts a search text only when it isn't a phone number or an email address", () => {
    expect(normalizeQuery("  Yoga  Mat ")).toBe("yoga mat");
    expect(normalizeQuery("a")).toBeNull();
    expect(normalizeQuery("ada@example.com")).toBeNull();
    expect(normalizeQuery("+90 532 123 45 67")).toBeNull();
    expect(normalizeQuery("iphone 15")).toBe("iphone 15");
    expect(languageOf("en-GB")).toBe("en");
    expect(languageOf("tr")).toBe("tr");
    expect(languageOf("123")).toBeNull();
  });
});

describe("44 the key, the build config and the country", () => {
  it("gives each app its own key, the same in every build, only on an https platform", () => {
    const key = analyticsKey("app-1", SECRET);
    expect(key).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(analyticsKey("app-1", SECRET)).toBe(key);
    expect(analyticsKey("app-2", SECRET)).not.toBe(key);
    expect(analyticsBuildConfig("app-1", "https://yallapp.com.tr/", SECRET)).toEqual({ events_url: "https://yallapp.com.tr/api/v1/apps/app-1/events", key });
    expect(analyticsBuildConfig("app-1", "http://localhost:3000", SECRET)).toBeNull();
  });

  it("puts it in the build config for every backend, and never in the preview's", () => {
    vi.stubEnv("APP_URL", "https://yallapp.com.tr");
    const app: App = {
      ...newApp("client-1", "https://academy.test", NOW),
      appName: "Ada",
      shortName: "Ada",
      androidPackage: "com.ada.app",
      iosBundleId: "com.ada.app",
      backend: "wordpress",
    };
    const config = buildConfigFor(app, { id: "client-1" }, { name: "1.0.0", code: 1 }, (id) => `https://files.test/${id}`);
    expect(config.analytics).toEqual({ events_url: `https://yallapp.com.tr/api/v1/apps/${app.id}/events`, key: analyticsKey(app.id, SECRET) });
    expect(validateBuildConfig(config).ok).toBe(true);
    const preview = previewConfigFor(app, { appId: app.id, draft: false, expiresAt: NOW }, { token: "t", platformUrl: "https://yallapp.com.tr", assetUrl: (id) => id, plan: null });
    expect(preview.config.analytics).toBeUndefined();
  });

  it("reads the country from Netlify or our proxy (with its secret), never from the body", () => {
    const geo = Buffer.from(JSON.stringify({ country: { code: "tr", name: "Turkey" } })).toString("base64");
    expect(countryFromHeaders(new Headers({ "x-nf-geo": geo }), undefined)).toBe("TR");
    expect(countryFromHeaders(new Headers({ "x-country": "EG" }), undefined)).toBe("EG");
    expect(countryFromHeaders(new Headers({ "x-yallapp-client-country": "DE" }), "proxy-secret")).toBeNull();
    expect(countryFromHeaders(new Headers({ "x-yallapp-client-country": "DE", "x-yallapp-proxy-secret": "proxy-secret" }), "proxy-secret")).toBe("DE");
    expect(countryFromHeaders(new Headers({ "x-country": "XX" }), undefined)).toBeNull();
  });
});

describe("44 POST /api/v1/apps/{app_id}/events", () => {
  const send = (store: MemoryStore, app: App, body: unknown, headers: Record<string, string> = {}, now = NOW) =>
    receiveEvents(store, {
      appId: app.id,
      headers: new Headers({ "x-yallapp-analytics-key": analyticsKey(app.id, SECRET), "x-nf-client-connection-ip": "203.0.113.9", "x-country": "TR", ...headers }),
      raw: typeof body === "string" ? body : JSON.stringify(body),
      secret: SECRET,
      now,
    });

  it("stores the events with the country and answers as the contract says", async () => {
    const store = new MemoryStore();
    const app = await appIn(store);
    const result = await send(store, app, batch([{ type: "app_open", at: "2026-10-19T11:00:00Z", first_open: true }, { type: "search", at: "2026-10-19T11:00:01Z", query: "olive" }]));
    expect(result.status).toBe(202);
    expectPlatformContract("POST", "/apps/{app_id}/events", result);
    const events = await store.listAnalyticsEvents(app.id, TODAY);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ country: "TR", installId: INSTALL });
    // Nothing of the request's IP is kept with the events.
    expect(JSON.stringify(events)).not.toContain("203.0.113.9");
    expect(await store.listAnalyticsDaily(app.id, TODAY, TODAY, ["search"])).toEqual([{ day: TODAY, metric: "search", key: "olive", label: null, value: 1 }]);
  });

  it("refuses an unknown app, a wrong key, a large or broken body", async () => {
    const store = new MemoryStore();
    const app = await appIn(store);
    const other = await appIn(store);
    const ok = batch([{ type: "app_open", at: "2026-10-19T11:00:00Z" }]);
    const cases: [Promise<Awaited<ReturnType<typeof send>>>, number, string][] = [
      [send(store, { ...app, id: "8a4f3c2e-0000-4000-8000-000000000000" }, ok), 404, "not_found"],
      [send(store, app, ok, { "x-yallapp-analytics-key": analyticsKey(other.id, SECRET) }), 403, "invalid_key"],
      [send(store, app, ok, { "x-yallapp-analytics-key": "" }), 403, "invalid_key"],
      [send(store, app, "x".repeat(70_000)), 413, "invalid_request"],
      [send(store, app, "{not json"), 400, "invalid_request"],
      [send(store, app, batch([{ type: "nope", at: "2026-10-19T11:00:00Z" }])), 400, "invalid_request"],
    ];
    for (const [promise, status, code] of cases) {
      const result = await promise;
      expect(result.status).toBe(status);
      expect(result.body).toMatchObject({ code });
      expectPlatformContract("POST", "/apps/{app_id}/events", result);
    }
    expect(await store.listAnalyticsEvents(app.id, TODAY)).toEqual([]);
  });

  it("limits each install to 30 batches in 10 minutes and each IP to 60 a minute", async () => {
    const store = new MemoryStore();
    const app = await appIn(store);
    const ok = batch([{ type: "screen_view", at: "2026-10-19T11:00:00Z", screen: "home" }]);
    for (let i = 0; i < 30; i++) expect((await send(store, app, ok)).status).toBe(202);
    const limited = await send(store, app, ok);
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({ code: "rate_limited", retry_after_seconds: expect.any(Number) });
    expectPlatformContract("POST", "/apps/{app_id}/events", limited);
    // Another install from the same IP still gets through, until the IP's limit.
    const other = batch([{ type: "screen_view", at: "2026-10-19T11:00:00Z", screen: "home" }], { install_id: uuid(1) });
    expect((await send(store, app, other)).status).toBe(202);
    const later = new Date(NOW.getTime() + 60_000);
    for (let i = 0; i < 60; i++) await send(store, app, batch([{ type: "app_open", at: "2026-10-19T11:00:00Z" }], { install_id: uuid(100 + i) }), {}, later);
    expect((await send(store, app, batch([{ type: "app_open", at: "2026-10-19T11:00:00Z" }], { install_id: uuid(999) }), {}, later)).status).toBe(429);
  });

  it("marks a day already counted when late events arrive, so it is counted again", async () => {
    const store = new MemoryStore();
    const app = await appIn(store);
    await refreshAnalytics(store, app.id, NOW);
    expect(await daysToCount(store, app.id, NOW)).toEqual([]);
    expect((await send(store, app, batch([{ type: "app_open", at: "2026-10-16T09:00:00Z" }]))).status).toBe(202);
    expect(await daysToCount(store, app.id, NOW)).toEqual(["2026-10-16"]);
    await refreshAnalytics(store, app.id, NOW);
    expect(await daysToCount(store, app.id, NOW)).toEqual([]);
    const totals = await store.listAnalyticsDaily(app.id, "2026-10-16", "2026-10-16", ["active"]);
    expect(totals[0]!.value).toBe(1);
  });
});

describe("44 daily totals", () => {
  it("counts installs, active users, sessions, splits, screens, items and the funnel of one day", () => {
    const a = INSTALL;
    const b = uuid(2);
    const rows = totalsOfDay([
      row({ installId: a, type: "app_open", firstOpen: true }),
      row({ installId: a, type: "app_open", at: new Date(`${TODAY}T18:00:00Z`), appVersion: "1.3.0" }),
      row({ installId: b, type: "app_open", platform: "ios", osVersion: "iOS 18.1", country: null, language: "en" }),
      row({ installId: a, type: "screen_view", screen: "home" }),
      row({ installId: b, type: "screen_view", screen: "home", platform: "ios", osVersion: "iOS 18.1", country: null, language: "en" }),
      row({ installId: a, type: "item_view", itemKind: "product", itemId: "42", title: "Olive oil" }),
      row({ installId: b, type: "item_view", itemKind: "product", itemId: "42", title: "Olive oil 1 L", at: new Date(`${TODAY}T11:00:00Z`), platform: "ios", osVersion: "iOS 18.1", country: null, language: "en" }),
      row({ installId: a, type: "add_to_cart", itemKind: "product", itemId: "42" }),
      row({ installId: a, type: "purchase_click", itemKind: "product", itemId: "cart", amountCents: 2500, currency: "TRY" }),
      row({ installId: a, type: "push_open", notificationId: "7", pushType: "announcement" }),
      row({ installId: a, type: "push_open", notificationId: "7", pushType: "announcement", at: new Date(`${TODAY}T19:00:00Z`), appVersion: "1.3.0" }),
    ]);
    const value = (metric: string, key = "") => rows.find((r) => r.metric === metric && r.key === key)?.value;
    expect(value("installs")).toBe(1);
    expect(value("active")).toBe(2);
    expect(value("sessions")).toBe(3);
    expect(value("platform", "android")).toBe(1);
    expect(value("platform", "ios")).toBe(1);
    // An install counts once, with the last version it used that day.
    expect(value("version", "1.3.0")).toBe(1);
    expect(value("version", "1.2.0")).toBe(1);
    expect(value("country", "unknown")).toBe(1);
    expect(value("screen", "home")).toBe(2);
    expect(rows.find((r) => r.metric === "item")).toEqual({ metric: "item", key: "product:42", label: "Olive oil 1 L", value: 2 });
    expect(value("event", "add_to_cart")).toBe(1);
    expect(value("checkout_value", "TRY")).toBe(2500);
    // A notification opened twice by one install is one open.
    expect(value("push_open", "id:7")).toBe(1);
  });

  it("works out day 1, 7 and 30 retention for each cohort, once the day is over", async () => {
    const store = new MemoryStore();
    const app = await appIn(store);
    const cohort = "2026-09-10";
    const events: AnalyticsEventRow[] = [];
    // Ten first opens on the cohort day; six back the next day, three a week later, one 30 days later.
    for (let i = 0; i < 10; i++) events.push(row({ appId: app.id, installId: uuid(i), day: cohort, type: "app_open", firstOpen: true }));
    for (let i = 0; i < 6; i++) events.push(row({ appId: app.id, installId: uuid(i), day: addDays(cohort, 1) }));
    for (let i = 0; i < 3; i++) events.push(row({ appId: app.id, installId: uuid(i), day: addDays(cohort, 7) }));
    events.push(row({ appId: app.id, installId: uuid(0), day: addDays(cohort, 30) }));
    // Someone who wasn't new that day doesn't count as a return.
    events.push(row({ appId: app.id, installId: uuid(50), day: addDays(cohort, 1) }));
    await store.insertAnalyticsEvents(events);
    const now = new Date("2026-10-11T08:00:00Z");
    for (const day of [cohort, addDays(cohort, 1), addDays(cohort, 7), addDays(cohort, 30)]) await aggregateDay(store, app.id, day, now);

    const range = rangeFrom({ range: "custom", from: "2026-09-01", to: "2026-09-30" }, now);
    const rows = await store.listAnalyticsDaily(app.id, range.previous.from, range.to);
    const report = buildReport(rows, range, dayOf(now));
    expect(report.retention).toEqual([
      { days: 1, cohort: 10, returned: 6, rate: 0.6 },
      { days: 7, cohort: 10, returned: 3, rate: 0.3 },
      { days: 30, cohort: 10, returned: 1, rate: 0.1 },
    ]);
    expect(report.kpis.installs).toBe(10);

    // On the cohort's 30th day itself, day 30 isn't over yet: no rate.
    const early = buildReport(rows, range, addDays(cohort, 30));
    expect(early.retention[2]).toEqual({ days: 30, cohort: 0, returned: 0, rate: null });
    expect(early.retention[0]!.rate).toBe(0.6);
  });

  it("counts weekly and monthly active installs over the days that end with each day", async () => {
    const store = new MemoryStore();
    const app = await appIn(store);
    await store.insertAnalyticsEvents([
      row({ appId: app.id, installId: uuid(1), day: "2026-10-18" }),
      row({ appId: app.id, installId: uuid(2), day: "2026-10-15" }),
      row({ appId: app.id, installId: uuid(3), day: "2026-10-01" }),
      row({ appId: app.id, installId: uuid(4), day: "2026-09-10" }),
    ]);
    await aggregateDay(store, app.id, "2026-10-18", NOW);
    const rows = await store.listAnalyticsDaily(app.id, "2026-10-18", "2026-10-18");
    const value = (metric: string) => rows.find((r) => r.metric === metric)?.value;
    expect(value("active")).toBe(1);
    expect(value("active_7")).toBe(2);
    expect(value("active_30")).toBe(3);
    expect(value("done")).toBeGreaterThan(0);
  });

  it("the nightly count counts the finished days and deletes raw events after 40 days, keeping the totals", async () => {
    const store = new MemoryStore();
    const app = await appIn(store);
    await store.insertAnalyticsEvents([row({ appId: app.id, day: "2026-10-18" }), row({ appId: app.id, day: "2026-09-08" }), row({ appId: app.id, day: "2026-09-10" })]);
    await store.saveAnalyticsDaily(app.id, "2026-09-08", [{ metric: "active", key: "", label: null, value: 1 }]);
    const result = await runAnalyticsNightly(store, NOW);
    expect(result).toMatchObject({ apps: 1, purged: 1, finished: true });
    expect(await store.listAnalyticsEvents(app.id, "2026-09-08")).toEqual([]);
    expect(await store.listAnalyticsEvents(app.id, "2026-09-10")).toHaveLength(1);
    expect((await store.listAnalyticsDaily(app.id, "2026-09-08", "2026-09-08"))[0]!.value).toBe(1);
    expect((await store.listAnalyticsDaily(app.id, "2026-10-18", "2026-10-18", ["active"]))[0]!.value).toBe(1);
    // Today is never marked as counted: it is counted again at each read.
    expect(await store.listAnalyticsDaily(app.id, TODAY, TODAY, ["done"])).toEqual([]);
  });
});

describe("44 the report", () => {
  it("picks the range and the period before it", () => {
    expect(rangeFrom({}, NOW)).toMatchObject({ preset: "30", from: "2026-09-20", to: TODAY, days: 30, previous: { from: "2026-08-21", to: "2026-09-19" } });
    expect(rangeFrom({ range: "7" }, NOW)).toMatchObject({ from: "2026-10-13", days: 7, previous: { from: "2026-10-06", to: "2026-10-12" } });
    expect(rangeFrom({ range: "45" }, NOW).preset).toBe("30");
    expect(rangeFrom({ range: "custom", from: "2026-10-01", to: "2026-12-01" }, NOW)).toMatchObject({ preset: "custom", from: "2026-10-01", to: TODAY, days: 19 });
    expect(rangeFrom({ range: "custom", from: "2024-01-01", to: "2026-10-10" }, NOW)).toMatchObject({ from: "2025-10-10", days: 366 });
    expect(rangeFrom({ range: "custom", from: "2026-02-30", to: "x" }, NOW).preset).toBe("30");
  });

  it("compares with the period before, joins notifications with their opens and hides rare searches", async () => {
    const store = new MemoryStore();
    const app = await appIn(store);
    // A notification sent to 4 phones (push stubbed), opened from 2 installs.
    const sent = await announce({
      store,
      app,
      title: "Weekend sale",
      body: "20% off",
      account: { project_id: "p", client_email: "a@p.iam.gserviceaccount.com", private_key: "k" } as never,
      now: new Date("2026-10-17T09:00:00Z"),
      send: async () => ({ sent: 4, invalidTokens: [] }),
    });
    const id = String(sent.notification.id);
    const events: AnalyticsEventRow[] = [];
    for (let i = 0; i < 3; i++) events.push(row({ appId: app.id, installId: uuid(i), day: "2026-10-17", type: "app_open", firstOpen: i === 0 }));
    events.push(row({ appId: app.id, installId: uuid(0), day: "2026-10-17", type: "push_open", notificationId: id, pushType: "announcement" }));
    events.push(row({ appId: app.id, installId: uuid(1), day: "2026-10-18", type: "push_open", notificationId: id, pushType: "announcement" }));
    events.push(row({ appId: app.id, installId: uuid(2), day: "2026-10-18", type: "push_open", pushType: "order" }));
    for (let i = 0; i < 4; i++) events.push(row({ appId: app.id, installId: uuid(i), day: "2026-10-18", type: "item_view", itemKind: "product", itemId: "42", title: "Olive oil" }));
    events.push(row({ appId: app.id, installId: uuid(1), day: "2026-10-18", type: "add_to_cart", itemKind: "product", itemId: "42" }));
    events.push(row({ appId: app.id, installId: uuid(1), day: "2026-10-18", type: "purchase_click", itemKind: "product", itemId: "cart", amountCents: 1999, currency: "TRY" }));
    // The week before: one person.
    events.push(row({ appId: app.id, installId: uuid(9), day: "2026-10-10", type: "app_open" }));
    await store.insertAnalyticsEvents(events);
    await store.addAnalyticsDaily(app.id, "2026-10-18", { metric: "search", key: "olive oil", label: null, value: 1 });
    await store.addAnalyticsDaily(app.id, "2026-10-17", { metric: "search", key: "olive oil", label: null, value: 1 });
    await store.addAnalyticsDaily(app.id, "2026-10-17", { metric: "search", key: "my neighbour", label: null, value: 1 });

    const report = await loadReport(store, app.id, rangeFrom({ range: "7" }, NOW), NOW);
    expect(report.hasData).toBe(true);
    expect(report.kpis.installs).toBe(1);
    expect(report.kpis.sessions).toBe(3);
    expect(report.kpis.weekly).toBe(4);
    expect(report.previous.sessions).toBe(1);
    expect(report.push).toEqual([{ id, title: "Weekend sale", sentDay: "2026-10-17", pushed: 4, opened: 2, rate: 0.5 }]);
    expect(report.pushFromSite).toEqual([{ type: "order", opened: 1 }]);
    expect(report.items).toEqual([{ kind: "product", id: "42", title: "Olive oil", views: 4 }]);
    expect(report.funnel).toEqual([
      { step: "view", value: 4, rate: null },
      { step: "intent", value: 1, rate: 0.25 },
      { step: "checkout", value: 1, rate: 0.25 },
    ]);
    expect(report.checkoutValue).toEqual([{ currency: "TRY", cents: 1999 }]);
    expect(report.searches).toEqual([{ query: "olive oil", count: 2 }]);
    expect(report.daily.find((d) => d.day === "2026-10-17")).toMatchObject({ active: 3, installs: 1, sessions: 3 });
  });

  it("is empty for an app nobody has opened yet", async () => {
    const store = new MemoryStore();
    const app = await appIn(store);
    const report = await loadReport(store, app.id, rangeFrom({ range: "30" }, NOW), NOW);
    expect(report.hasData).toBe(false);
    expect(report.kpis).toEqual({ installs: 0, activeAvg: 0, weekly: 0, monthly: 0, sessions: 0, sessionsPerUser: 0 });
    expect(report.retention.every((r) => r.rate === null)).toBe(true);
  });

  it("exports CSV with totals only, and a title can't run as a spreadsheet formula", async () => {
    const store = new MemoryStore();
    const app = await appIn(store);
    await store.insertAnalyticsEvents([
      row({ appId: app.id, day: "2026-10-18", type: "item_view", itemKind: "product", itemId: "1", title: '=HYPERLINK("http://x","click")' }),
      row({ appId: app.id, day: "2026-10-18", type: "app_open" }),
    ]);
    const report = await loadReport(store, app.id, rangeFrom({ range: "7" }, NOW), NOW);
    const csv = reportCsv(report, itemWord);
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe("section,name,detail,value,previous_period");
    expect(csv).toContain(`Top items,"'=HYPERLINK(""http://x"",""click"")",Product 1,1,`);
    expect(csv).toContain("Summary,Installs (first opens),,0,0");
    expect(csv).not.toContain(INSTALL);
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell(0.25)).toBe("0.25");
    expect(csvCell("a,b")).toBe('"a,b"');
  });
});
