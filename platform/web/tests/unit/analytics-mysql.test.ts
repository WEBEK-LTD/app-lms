import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { refreshAnalytics, runAnalyticsNightly } from "@/lib/analytics/aggregate";
import { addDays, dayOf } from "@/lib/analytics/days";
import { loadReport, rangeFrom } from "@/lib/analytics/report";
import type { AnalyticsEventRow } from "@/lib/analytics/types";
import { newApp } from "@/lib/app/setup";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { App } from "@/lib/data/types";

/**
 * 44 Analytics on MySQL or MariaDB: events in and out, distinct and
 * returning installs, totals set and added to, the purge, and a report.
 * Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date();
const TODAY = dayOf(NOW);

function event(appId: string, installId: string, day: string, over: Partial<AnalyticsEventRow> = {}): AnalyticsEventRow {
  return {
    appId,
    installId,
    type: "app_open",
    at: new Date(`${day}T10:00:00.123Z`),
    day,
    platform: "ios",
    appVersion: "2.0.0",
    osVersion: "iOS 18.1",
    language: "tr",
    country: "TR",
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

describe.skipIf(!url)("44 analytics on MySQL", () => {
  const pool = url ? createPool({ url, ssl: "disabled" }) : null;
  const store = pool ? new MysqlStore(pool) : null!;
  afterAll(async () => {
    await pool?.end();
  });

  async function setup(): Promise<App> {
    const user = await store.createUser({ email: `stats-${randomUUID()}@yallapp.test`, name: "Stats", passwordHash: null, now: NOW });
    const client = await store.createClient({ userId: user.id, whatsapp: "+905321234567", siteUrl: "https://shop.test", now: NOW });
    const app: App = newApp(client.id, "https://shop.test", NOW, "store");
    await store.createApp(app);
    return app;
  }

  it("stores and reads events, and counts distinct and returning installs", async () => {
    const app = await setup();
    const cohort = addDays(TODAY, -8);
    const a = randomUUID();
    const b = randomUUID();
    const c = randomUUID();
    await store.insertAnalyticsEvents([
      event(app.id, a, cohort, { firstOpen: true }),
      event(app.id, b, cohort, { firstOpen: true }),
      event(app.id, c, cohort),
      event(app.id, a, addDays(cohort, 1), { type: "item_view", itemKind: "product", itemId: "42", title: "Çay bardağı" }),
      event(app.id, c, addDays(cohort, 1)),
      event(app.id, a, addDays(cohort, 7), { type: "purchase_click", itemKind: "product", itemId: "cart", amountCents: 4500, currency: "TRY" }),
    ]);
    const read = await store.listAnalyticsEvents(app.id, addDays(cohort, 1));
    expect(read).toHaveLength(2);
    const item = read.find((e) => e.type === "item_view")!;
    expect(item).toMatchObject({ title: "Çay bardağı", firstOpen: false, itemKind: "product", country: "TR" });
    expect(item.at.toISOString()).toBe(`${addDays(cohort, 1)}T10:00:00.123Z`);
    expect(await store.countAnalyticsActive(app.id, cohort, addDays(cohort, 7))).toBe(3);
    expect(await store.countAnalyticsActive(app.id, addDays(cohort, 1), addDays(cohort, 1))).toBe(2);
    // c wasn't new on the cohort day: only a counts as a return.
    expect(await store.countAnalyticsReturning(app.id, cohort, addDays(cohort, 1))).toBe(1);
    expect(await store.listAnalyticsEventDays(app.id, cohort)).toEqual([cohort, addDays(cohort, 1), addDays(cohort, 7)]);
    expect(await store.listAnalyticsAppIds(cohort)).toContain(app.id);

    await refreshAnalytics(store, app.id, NOW);
    const report = await loadReport(store, app.id, rangeFrom({ range: "30" }, NOW), NOW);
    expect(report.kpis.installs).toBe(2);
    expect(report.retention[0]).toEqual({ days: 1, cohort: 2, returned: 1, rate: 0.5 });
    expect(report.retention[1]).toEqual({ days: 7, cohort: 2, returned: 1, rate: 0.5 });
    expect(report.items).toEqual([{ kind: "product", id: "42", title: "Çay bardağı", views: 1 }]);
    expect(report.checkoutValue).toEqual([{ currency: "TRY", cents: 4500 }]);
  });

  it("sets and adds daily totals, and the purge keeps them", async () => {
    const app = await setup();
    const old = addDays(TODAY, -45);
    await store.saveAnalyticsDaily(app.id, old, [
      { metric: "active", key: "", label: null, value: 5 },
      { metric: "item", key: "course:7", label: "Arabic for beginners", value: 3 },
    ]);
    await store.saveAnalyticsDaily(app.id, old, [{ metric: "active", key: "", label: null, value: 6 }]);
    await store.addAnalyticsDaily(app.id, old, { metric: "search", key: "çay", label: null, value: 1 });
    await store.addAnalyticsDaily(app.id, old, { metric: "search", key: "çay", label: null, value: 1 });
    await store.addAnalyticsDaily(app.id, old, { metric: "push_sent", key: "9", label: "Sale", value: 4 });
    await store.addAnalyticsDaily(app.id, old, { metric: "push_sent", key: "9", label: null, value: 1 });
    const rows = await store.listAnalyticsDaily(app.id, old, old);
    const value = (metric: string, key = "") => rows.find((r) => r.metric === metric && r.key === key);
    expect(value("active")!.value).toBe(6);
    expect(value("search", "çay")!.value).toBe(2);
    expect(value("push_sent", "9")).toMatchObject({ value: 5, label: "Sale" });
    expect(value("item", "course:7")!.label).toBe("Arabic for beginners");
    expect(await store.listAnalyticsDaily(app.id, old, old, ["search"])).toHaveLength(1);
    expect(await store.listAnalyticsDaily(app.id, old, old, [])).toEqual([]);

    await store.insertAnalyticsEvents([event(app.id, randomUUID(), old), event(app.id, randomUUID(), addDays(TODAY, -2))]);
    const result = await runAnalyticsNightly(store, NOW, 60_000);
    expect(result.purged).toBeGreaterThanOrEqual(1);
    expect(await store.listAnalyticsEvents(app.id, old)).toEqual([]);
    expect(await store.listAnalyticsEvents(app.id, addDays(TODAY, -2))).toHaveLength(1);
    expect((await store.listAnalyticsDaily(app.id, old, old, ["active"]))[0]!.value).toBe(6);
  });
});
