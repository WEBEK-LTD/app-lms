import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { App } from "@/lib/data/types";
import { refreshEndedSites } from "@/lib/license/refresh";

/**
 * 68 A plan's end is told to its WordPress site once, on MySQL or MariaDB
 * (migration 0049, `licenses.end_refreshed_for`): of eight claims at once one
 * wins, a renewal's next end is claimed again, and only ended plans are listed.
 * Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const KEY = Buffer.alloc(32, 7);
const NOW = new Date("2026-10-20T09:00:00.123Z");
const DAY = 86_400_000;

describe.skipIf(!url)("68 ended plans on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });

  async function licensed(expiresAt: Date, backend: App["backend"] = "wordpress") {
    const site = `${randomUUID().slice(0, 8)}.test`;
    const { client } = await registerClient(store, { name: "Ada", email: `ada-${randomUUID()}@mysql.test`, whatsapp: "+905446731942", siteUrl: `https://${site}`, password: null }, NOW);
    const app: App = { ...newApp(client.id, `https://${site}`, NOW, "lms"), backend };
    await store.createApp(app);
    const { license } = await activateClient(store, { clientId: client.id, appId: app.id, plan: "growth", activeUntil: expiresAt, paymentNote: "" }, KEY, NOW);
    await store.claimActivation({ licenseId: license.id, siteUrl: site, siteUrlRaw: `https://${site}/`, pluginVersion: "0.4.6", wpVersion: "7.1.3", lms: "tutor", store: "", bookings: "", activatedAt: NOW, lastCheckedAt: NOW });
    return { app, license, site };
  }

  it("claims each end once, even eight at once, and a renewal's next end again", async () => {
    const ends = new Date(NOW.getTime() - 60_000);
    const { license } = await licensed(ends);
    expect(await store.claimLicenseEndRefresh(license.id, ends, new Date(ends.getTime() - 1))).toBe(false);
    const claims = await Promise.all(Array.from({ length: 8 }, () => store.claimLicenseEndRefresh(license.id, ends, NOW)));
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect((await store.getLicenseById(license.id))!.endRefreshedFor).toEqual(ends);
    // An end the license no longer has (renewed meanwhile) isn't claimed.
    const next = new Date(NOW.getTime() + 30 * DAY);
    await store.updateLicense(license.id, { expiresAt: next }, NOW);
    expect(await store.claimLicenseEndRefresh(license.id, ends, NOW)).toBe(false);
    const later = new Date(next.getTime() + 60_000);
    expect(await store.claimLicenseEndRefresh(license.id, next, later)).toBe(true);
    expect(await store.claimLicenseEndRefresh(license.id, next, later)).toBe(false);
  });

  it("lists the plans that ended in a window, and the job asks their sites once", async () => {
    const ended = await licensed(new Date(NOW.getTime() - 2 * 60_000));
    const running = await licensed(new Date(NOW.getTime() + DAY));
    const listed = (await store.listLicensesEndedBetween(new Date(NOW.getTime() - 5 * 60_000), NOW)).map((l) => l.id);
    expect(listed).toContain(ended.license.id);
    expect(listed).not.toContain(running.license.id);
    const sent: string[] = [];
    const fetcher = async (u: string) => {
      sent.push(u);
      return new Response("{}", { status: 202 });
    };
    const deps = { store, key: KEY, now: NOW, fetcher, resolve: async () => ["93.184.216.34"] };
    await Promise.all([refreshEndedSites(deps), refreshEndedSites(deps)]);
    expect(sent.filter((u) => u.includes(ended.site))).toHaveLength(1);
    expect(sent.some((u) => u.includes(running.site))).toBe(false);
  });
});
