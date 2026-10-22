import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { IntegrationChecks } from "@/lib/data/types";

/** 80.1 Each connection's last test, kept on the app the same on the memory store and on MySQL or MariaDB (migration 0057). */

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
}
