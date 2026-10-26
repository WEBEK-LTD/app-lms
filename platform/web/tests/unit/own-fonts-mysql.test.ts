import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { OwnFont } from "@/lib/data/types";

/**
 * 97.2 Own fonts on MySQL or MariaDB (migration 0088): one name per app,
 * replaced in place when weights are added, counted in Media storage, their
 * files found when the app is deleted.
 * Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-10-26T09:00:00.000Z");

describe.skipIf(!url)("97.2 own fonts on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });

  it("keeps an app's fonts by name, counts them, and finds their files", async () => {
    const { client } = await registerClient(store, { name: "Ada", email: `ada-${randomUUID()}@mysql.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    const app = newApp(client.id, null, NOW, "store");
    await store.createApp(app);
    const asset = randomUUID();
    const font: OwnFont = {
      id: randomUUID(),
      appId: app.id,
      family: "Harbour Sans",
      files: [{ assetId: asset, weight: 400, sizeBytes: 1200 }],
      sizeBytes: 1200,
      licenceConfirmedBy: "ada@mysql.test",
      createdAt: NOW,
      updatedAt: NOW,
    };
    await store.saveOwnFont(font);
    // More weights: the same row.
    const more = { ...font, files: [...font.files, { assetId: randomUUID(), weight: 700, sizeBytes: 800 }], sizeBytes: 2000 };
    await store.saveOwnFont(more);
    expect(await store.listOwnFonts(app.id)).toEqual([more]);
    expect(await store.mediaUsage(app.id)).toBe(2000);
    // One name per app: the same name replaces that font, which keeps its id.
    await store.saveOwnFont({ ...more, id: randomUUID(), licenceConfirmedBy: "ali@mysql.test" });
    expect(await store.listOwnFonts(app.id)).toEqual([{ ...more, licenceConfirmedBy: "ali@mysql.test" }]);
    expect((await store.listAppAssetReferences(app.id)).map((id) => id.toLowerCase())).toContain(asset.toLowerCase());

    expect(await store.deleteOwnFont(app.id, randomUUID())).toBe(false);
    expect(await store.deleteOwnFont(app.id, font.id)).toBe(true);
    expect(await store.listOwnFonts(app.id)).toEqual([]);
    expect(await store.mediaUsage(app.id)).toBe(0);
  });
});
