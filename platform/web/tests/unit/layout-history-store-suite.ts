import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { Layout } from "@/lib/pages/types";
import { BUILT_IN_APP_DEFAULTS, defaultLayout } from "@/lib/pages/defaults";
import { NOW } from "./helpers";

/** 82.4 The publish history, the same on every store. */
export function layoutHistoryStoreSuite(store: () => DataStore) {
  it("keeps an app's last publishes, newest first, and only its own", async () => {
    const s = store();
    const { client } = await registerClient(s, { name: "Hana", email: `hana-${randomUUID()}@history.test`, whatsapp: "+905446731946", siteUrl: "", password: null }, NOW);
    const app = newApp(client.id, null, NOW, "store");
    const other = newApp(client.id, null, NOW, "store");
    await s.createApp(app);
    await s.createApp(other);
    const content = defaultLayout(app, BUILT_IN_APP_DEFAULTS, NOW);
    const layout = (n: number): Layout => ({ ...content, version: `2026-10-23T00:00:00Z.${n}`, tabs: content.tabs.map((t, i) => (i === 0 ? { ...t, label: `Home ${n}` } : t)) });
    for (let n = 1; n <= 4; n++) {
      await s.addLayoutVersion({ appId: app.id, number: n, layout: layout(n), publishedAt: new Date(NOW.getTime() + n * 60_000), publishedBy: n % 2 ? "owner@shop.test" : null }, 3);
    }
    await s.addLayoutVersion({ appId: other.id, number: 1, layout: layout(9), publishedAt: NOW, publishedBy: null }, 3);

    // Three kept, newest first, without their layouts.
    const list = await s.listLayoutVersions(app.id);
    expect(list.map((v) => v.number)).toEqual([4, 3, 2]);
    expect(list[1]).toEqual({ appId: app.id, number: 3, publishedAt: new Date(NOW.getTime() + 180_000), publishedBy: "owner@shop.test" });
    expect(list[0]).not.toHaveProperty("layout");
    expect((await s.getLayoutVersion(app.id, 3))!.layout.tabs[0]!.label).toBe("Home 3");
    expect(await s.getLayoutVersion(app.id, 1)).toBeNull();
    // Another app's history is its own.
    expect(await s.getLayoutVersion(app.id, 9)).toBeNull();
    expect((await s.listLayoutVersions(other.id)).map((v) => v.number)).toEqual([1]);
  });
}
