import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import type { BlobStore } from "@/lib/blobs";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { demoClientId } from "@/lib/demo/apps";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { ensureHouseTemplates, HOUSE_DESIGNER_ID, houseLooks, houseTemplateId, houseVersions } from "@/lib/studio-market/house";
import { marketCatalog } from "@/lib/studio-market/catalog";
import { NOW } from "./helpers";

/**
 * 190 Yallapp's own Studio demos on MySQL or MariaDB: the designer on the
 * demo account (its foreign key), each look's template and version made
 * once even when two servers read the market at once, and a demo changed in
 * code numbered after the last version. Runs only with
 * YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;

class MemoryBlobs implements BlobStore {
  files = new Map<string, { data: Buffer; contentType: string }>();
  async put(key: string, data: Buffer, contentType: string) {
    this.files.set(key, { data, contentType });
  }
  async get(key: string) {
    return this.files.get(key) ?? null;
  }
  async delete(key: string) {
    this.files.delete(key);
  }
}

describe.skipIf(!url)("190 Yallapp's own demos on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  const otherPool = createPool({ url: url!, ssl: "disabled" });
  const other = new MysqlStore(otherPool);
  const blobs = new MemoryBlobs();
  const ids = houseLooks().map((l) => houseTemplateId(l.demo, l.look));
  let before: string | null = null;

  beforeAll(async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    before = await demoClientId(store, { fresh: true });
    // A database used before: Yallapp's own made again from nothing (its templates and versions go with the designer).
    await pool.query("DELETE FROM studio_market_designers WHERE id = ?", [HOUSE_DESIGNER_ID]);
  });

  afterAll(async () => {
    if (before) await store.setPlatformSetting("demo", { clientId: before }, "team@yallapp.test", NOW);
    else await store.setPlatformSetting("demo", null, "team@yallapp.test", NOW);
    clearPlatformSettingsCache();
    await pool.end();
    await otherPool.end();
  });

  const count = async (sql: string, args: unknown[] = []) => Number(((await pool.query(sql, args))[0] as { n: number }[])[0]!.n);

  it("makes each look once, from two servers at once, on the demo account, with no account made", async () => {
    const { client } = await registerClient(store, { name: "Yallapp demos", email: `demos-${randomUUID().slice(0, 8)}@house.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    await store.setPlatformSetting("demo", { clientId: client.id }, "team@yallapp.test", NOW);
    clearPlatformSettingsCache();
    const clients = await count("SELECT COUNT(*) AS n FROM clients");
    await Promise.all([ensureHouseTemplates({ store, blobs, now: NOW }), ensureHouseTemplates({ store: other, blobs, now: NOW }), marketCatalog(store, "en", NOW, blobs)]);
    expect(await count("SELECT COUNT(*) AS n FROM clients")).toBe(clients);
    expect(await store.getTemplateDesigner(HOUSE_DESIGNER_ID)).toMatchObject({ clientId: client.id, name: "Yallapp", status: "active" });
    const templates = await store.listMarketTemplates({ ids });
    expect(templates).toHaveLength(ids.length);
    expect(templates.every((t) => t.status === "published" && t.free && t.currentVersionId)).toBe(true);
    expect(await count(`SELECT COUNT(*) AS n FROM studio_market_versions WHERE template_id IN (${ids.map(() => "?").join(",")})`, ids)).toBe(ids.length);
    for (const v of houseVersions()) expect((await store.getMarketTemplateVersion(v.versionId))?.number).toBe(1);
    // Read again: nothing to do.
    expect(await ensureHouseTemplates({ store: other, blobs, now: NOW })).toBe(0);
    const cards = (await marketCatalog(store, "tr", NOW, blobs)).cards.filter((c) => ids.includes(c.id));
    expect(cards).toHaveLength(ids.length);
    expect(cards.every((c) => c.free && c.designer.name === "Yallapp")).toBe(true);
  });

  it("numbers a demo changed in code after the last version", async () => {
    const code = houseVersions().find((v) => v.demo === "travel" && v.look === "b")!;
    // The version the code made before.
    const older = randomUUID();
    await pool.query("UPDATE studio_market_versions SET id = ? WHERE id = ?", [older, code.versionId]);
    await pool.query("UPDATE studio_market_templates SET current_version_id = ? WHERE id = ?", [older, code.templateId]);
    expect(await ensureHouseTemplates({ store, blobs, now: NOW })).toBe(1);
    expect((await store.getMarketTemplate(code.templateId))?.currentVersionId).toBe(code.versionId);
    expect((await store.getMarketTemplateVersion(code.versionId))?.number).toBe(2);
    expect((await store.getMarketTemplateVersion(older))?.number).toBe(1);
  });
});
