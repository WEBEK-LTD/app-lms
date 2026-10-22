import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { IntegrationChecks } from "@/lib/data/types";

/**
 * 80.1 Each connection's last test, kept on the app the same on the memory
 * store and on MySQL or MariaDB (migration 0057); 80.2 the apps the daily
 * checks look at next (migration 0058).
 */

const NOW = new Date("2031-06-01T09:00:00.000Z");

export function integrationsStoreSuite(store: () => DataStore) {
  it("keeps each connection's last test on the app", async () => {
    const s = store();
    const { client } = await registerClient(s, { name: "Ada", email: `ada-${randomUUID()}@integrations.test`, whatsapp: "+905446731943", siteUrl: "", password: null }, NOW);
    const app = newApp(client.id, null, NOW);
    await s.createApp(app);
    expect((await s.getAppById(app.id))?.integrationChecks ?? null).toBeNull();

    const checks: IntegrationChecks = {
      website: { at: NOW.toISOString(), ok: false, code: "website_fails", subject: "https://ada.test", problems: ["The plugin didn't answer (HTTP 503)."] },
      push: { at: NOW.toISOString(), ok: true, code: "push_accepted", subject: "ada-app", problems: [] },
    };
    await s.updateApp(app.id, { integrationChecks: checks }, NOW);
    expect((await s.getAppById(app.id))?.integrationChecks).toEqual(checks);
  });

  it("80.2 gives the apps due for their daily checks: never checked first, then the oldest, not demos", async () => {
    const s = store();
    const { client } = await registerClient(s, { name: "Bo", email: `bo-${randomUUID()}@integrations.test`, whatsapp: "+905446731944", siteUrl: "", password: null }, NOW);
    // Far in the past; the database may hold many other apps, never checked (listed first), so the limit is large.
    const old = new Date("2001-01-01T00:00:00.000Z");
    const older = new Date("2000-01-01T00:00:00.000Z");
    const a = newApp(client.id, null, NOW);
    const b = newApp(client.id, null, NOW);
    const demo = { ...newApp(client.id, null, NOW), demo: true };
    for (const app of [a, b, demo]) await s.createApp(app);
    await s.updateApp(a.id, { integrationsCheckedAt: old }, NOW);
    await s.updateApp(b.id, { integrationsCheckedAt: older }, NOW);
    await s.updateApp(demo.id, { integrationsCheckedAt: older }, NOW);
    const due = (await s.listAppsToCheck(old, 100_000)).map((x) => x.id);
    expect(due).toContain(a.id);
    expect(due).toContain(b.id);
    expect(due).not.toContain(demo.id);
    // Never checked first, then the oldest.
    const mine = due.filter((id) => id === a.id || id === b.id);
    expect(mine).toEqual([b.id, a.id]);
    expect((await s.listAppsToCheck(older, 100_000)).map((x) => x.id)).not.toContain(a.id);
    expect((await s.getAppById(a.id))?.integrationsCheckedAt).toEqual(old);
  });
}
