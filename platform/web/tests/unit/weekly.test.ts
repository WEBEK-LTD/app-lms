import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { loadSales } from "@/lib/analytics/sales";
import { parseSiteSales, saveSiteSales, siteTotals } from "@/lib/analytics/site-sales";
import type { AnalyticsEventRow } from "@/lib/analytics/types";
import { runWeeklySummaries, weekToSummarize } from "@/lib/analytics/weekly";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { activateLicense, checkLicense, parseSiteInfo } from "@/lib/license/service";
import { days, KEY, NOW } from "./helpers";

// NOW is Monday 12 October 2026: the week to sum up is 5 to 11 October.
const ZONE = "Europe/Istanbul";

function open(appId: string, at: string, first = false): AnalyticsEventRow {
  return {
    appId,
    installId: randomUUID(),
    type: "app_open",
    at: new Date(at),
    day: at.slice(0, 10),
    platform: "android",
    appVersion: "1.0.0",
    osVersion: "Android 14",
    language: "tr",
    country: "TR",
    firstOpen: first,
    screen: null,
    itemKind: null,
    itemId: null,
    title: null,
    amountCents: null,
    currency: null,
    notificationId: null,
    pushType: null,
  };
}

async function shop(store: MemoryStore, patch: Partial<App> = {}, language: string | null = null) {
  const suffix = randomUUID().slice(0, 8);
  const { client, user } = await registerClient(store, { name: "Elif", email: `elif-${suffix}@weekly.test`, whatsapp: "+905446731949", siteUrl: "", password: null }, NOW);
  if (language) await store.updateUser(user.id, { language }, NOW);
  const app: App = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", connector: { kind: "catalog" }, appName: "Rose Shop", ...patch };
  await store.createApp(app);
  await activateClient(store, { clientId: client.id, appId: app.id, plan: "growth", activeUntil: days(60), paymentNote: "" }, KEY, NOW);
  return { app: (await store.getAppById(app.id))!, client };
}

function mailbox() {
  const sent: { key: string; to: string; values: Record<string, unknown>; lang?: string }[] = [];
  return { sent, mail: async (key: string, to: string, values: Record<string, unknown>, options?: { lang?: string }) => void sent.push({ key, to, values, lang: options?.lang }) };
}

describe("86.4 the weekly summary", () => {
  it("is for the last Monday-to-Sunday, sent Monday to Wednesday in the app's time zone", () => {
    expect(weekToSummarize(NOW, ZONE)).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(weekToSummarize(days(2), ZONE)).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(weekToSummarize(days(3), ZONE)).toBeNull();
    // Sunday 23:30 in UTC is already Monday in Istanbul.
    expect(weekToSummarize(new Date("2026-10-11T22:30:00Z"), ZONE)).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(weekToSummarize(new Date("2026-10-11T22:30:00Z"), "UTC")).toBeNull();
  });

  it("sends each active app's week once, with its sales, in the owner's language; skips quiet weeks and apps turned off", async () => {
    const store = new MemoryStore();
    const { app } = await shop(store);
    await store.insertAnalyticsEvents([open(app.id, "2026-10-06T09:00:00Z", true), open(app.id, "2026-10-06T10:00:00Z", true), open(app.id, "2026-10-07T10:00:00Z")]);
    const order = await store.createCatalogOrder({
      appId: app.id,
      tokenHash: randomUUID().replace(/-/g, ""),
      userId: null,
      status: "pending",
      lines: [{ productId: 1, name: "Roses", quantity: 1, unitCents: 10_000, imageAssetId: null, digital: false }],
      subtotalCents: 10_000,
      shippingCents: 0,
      totalCents: 10_000,
      currency: "TRY",
      customer: null,
      paymentId: null,
      createdAt: days(-6),
      paidAt: null,
      updatedAt: days(-6),
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    });
    await store.payCatalogOrder(app.id, order.id, "pay-1", new Date("2026-10-07T12:00:00Z"));
    const quiet = await shop(store);
    const off = await shop(store, { weeklySummary: false });
    await store.insertAnalyticsEvents([open(off.app.id, "2026-10-06T09:00:00Z", true)]);
    const arabic = await shop(store, {}, "ar");
    await store.insertAnalyticsEvents([open(arabic.app.id, "2026-10-08T09:00:00Z", true)]);

    const box = mailbox();
    const deps = { store, now: NOW, baseUrl: "https://yallapp.com.tr", mail: box.mail as never };
    expect(await runWeeklySummaries(deps)).toEqual({ sent: 2, quiet: 1 });
    const mine = box.sent.find((m) => (m.values.app_name as string) === "Rose Shop" && m.lang === undefined)!;
    expect(mine).toMatchObject({ key: "weekly_summary", values: { name: "Elif", week: "5 October 2026 – 11 October 2026", analytics_url: `https://yallapp.com.tr/dashboard/open/${app.id}?to=analytics` } });
    expect(String(mine.values.summary).split("\n")).toEqual([
      "Installs: 2 (0 the week before)",
      "Daily active users: 0.4 on average (0)",
      "Sessions: 3 (0)",
      "Paid orders: 1, ₺100.00 (0)",
    ]);
    const ar = box.sent.find((m) => m.lang === "ar")!;
    expect(String(ar.values.summary)).toContain("التثبيتات: 1 (0 في الأسبوع السابق)");
    // The quiet week and the app turned off got nothing.
    expect(box.sent.map((m) => m.lang ?? "en").sort()).toEqual(["ar", "en"]);
    expect((await store.listAnalyticsDaily(quiet.app.id, "2026-10-05", "2026-10-05", ["weekly_mail"])).length).toBe(1);
    expect((await store.listAnalyticsDaily(off.app.id, "2026-10-05", "2026-10-05", ["weekly_mail"])).length).toBe(0);

    // Once a week: again on Tuesday, nothing more.
    expect(await runWeeklySummaries({ ...deps, now: days(1) })).toEqual({ sent: 0, quiet: 0 });
    expect(box.sent).toHaveLength(2);
  });

  it("takes a WordPress site's shop totals from the license check, and shows them as its sales", async () => {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "Ada", email: "ada@site-sales.test", whatsapp: "+905446731950", siteUrl: "https://shop.test", password: null }, NOW);
    const created: App = { ...newApp(client.id, "https://shop.test", NOW, "store"), backend: "wordpress", appName: "Ada Shop" };
    await store.createApp(created);
    const { licenseKey } = await activateClient(store, { clientId: client.id, appId: created.id, plan: "growth", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    const site = (sales: unknown) => {
      const parsed = parseSiteInfo({ license_key: licenseKey, site_url: "https://shop.test", plugin_version: "0.4.13", wp_version: "6.8", store: "woocommerce", sales });
      if (!parsed.ok) throw new Error("site");
      return parsed.value;
    };
    expect((await activateLicense(store, site(undefined), NOW)).status).toBe(200);
    const sales = [
      { day: "2026-10-06", orders: 3, revenue: [{ currency: "TRY", cents: 45_000 }], refunds: 1, refunded: [{ currency: "TRY", cents: 5_000 }] },
      { day: "2026-10-07", orders: 1, revenue: [{ currency: "USD", cents: 2_000 }], refunds: 0, refunded: [] },
      // Malformed or too old: left out, the check goes on.
      { day: "2026-10-08", orders: -1, revenue: [], refunds: 0, refunded: [] },
      { day: "2020-01-01", orders: 9, revenue: [], refunds: 0, refunded: [] },
    ];
    expect(parseSiteSales(sales)).toHaveLength(3);
    expect(parseSiteSales("nope")).toBeNull();
    expect((await checkLicense(store, site(sales), NOW)).status).toBe(200);

    const app = (await store.getAppById(created.id))!;
    const rows = await store.listAnalyticsDaily(app.id, "2026-10-01", "2026-10-31");
    expect(siteTotals(rows, "2026-10-05", "2026-10-11")).toEqual({
      orders: { count: 4, totals: [{ currency: "TRY", cents: 45_000 }, { currency: "USD", cents: 2_000 }] },
      refunds: { count: 1, totals: [{ currency: "TRY", cents: 5_000 }] },
      reported: true,
    });
    // The 2020 day was never kept.
    expect(await store.listAnalyticsDaily(app.id, "2020-01-01", "2020-01-01")).toEqual([]);
    const range = { preset: "custom", from: "2026-10-05", to: "2026-10-11", days: 7, previous: { from: "2026-09-28", to: "2026-10-04" } };
    const report = await loadSales(store, app, range, ZONE, 40);
    expect(report.shows).toEqual({ orders: true, refunds: true, enrolments: false, bookings: false, tickets: false, donations: false, inApp: false });
    expect(report.current.orders.count).toBe(4);
    expect(report.conversion).toBe(0.1);
    // A day sent again replaces what it had.
    await saveSiteSales(store, app, [{ day: "2026-10-06", orders: 2, revenue: [{ currency: "TRY", cents: 30_000 }], refunds: 1, refunded: [{ currency: "TRY", cents: 5_000 }] }], NOW);
    expect(siteTotals(await store.listAnalyticsDaily(app.id, "2026-10-01", "2026-10-31"), "2026-10-06", "2026-10-06").orders).toEqual({ count: 2, totals: [{ currency: "TRY", cents: 30_000 }] });
  });
});
