import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { Announcement } from "@/lib/data/types";

/**
 * 57 The dashboard's bell on MySQL or MariaDB: an announcement's kind,
 * placement and Arabic and Turkish texts saved and read back (and the
 * defaults of one saved before), and reads per user (`update_reads`).
 * Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-10-19T12:00:00.000Z");

describe.skipIf(!url)("57 the bell on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });

  const announcement = (patch: Partial<Announcement> = {}): Announcement => ({
    id: randomUUID(),
    title: "Builds pause tonight",
    body: "From **22:00** UTC.",
    audience: { kind: "all" },
    severity: "warning",
    kind: "maintenance",
    showAsBanner: false,
    titleAr: "توقف البناء الليلة",
    bodyAr: "من ٢٢:٠٠",
    titleTr: "Bu gece bakım",
    bodyTr: "22:00'den itibaren.",
    linkUrl: null,
    linkLabel: null,
    startsAt: NOW,
    endsAt: null,
    emailedAt: null,
    emailedCount: 0,
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: "admin@yallapp.test",
    ...patch,
  });

  it("keeps an announcement's kind, placement and texts; one from before Phase 57 is an announcement on the banner", async () => {
    const a = announcement();
    await store.createAnnouncement(a);
    expect(await store.getAnnouncement(a.id)).toMatchObject({ kind: "maintenance", showAsBanner: false, titleAr: a.titleAr, bodyAr: a.bodyAr, titleTr: a.titleTr, bodyTr: a.bodyTr });
    await store.updateAnnouncement(a.id, { kind: "offer", showAsBanner: true, titleAr: null, bodyAr: null }, NOW);
    expect(await store.getAnnouncement(a.id)).toMatchObject({ kind: "offer", showAsBanner: true, titleAr: null, bodyAr: null, titleTr: a.titleTr });

    // Saved the way the platform did before Phase 57: the columns' defaults.
    const old = randomUUID();
    await pool.query(
      "INSERT INTO announcements (id, title, body, audience, severity, starts_at, emailed_count, created_at, updated_at, created_by) VALUES (?, 'Old', 'Text', '{\"kind\":\"all\"}', 'info', ?, 0, ?, ?, 'admin@yallapp.test')",
      [old, NOW, NOW, NOW],
    );
    expect(await store.getAnnouncement(old)).toMatchObject({ kind: "announcement", showAsBanner: true, titleAr: null, titleTr: null });
    await store.deleteAnnouncement(old);
  });

  it("stores reads per user, keeps the first time, and forgets a deleted announcement's", async () => {
    const owner = await store.createUser({ email: `bell-${randomUUID()}@yallapp.test`, name: "Owner", passwordHash: null, now: NOW });
    const teammate = await store.createUser({ email: `bell-${randomUUID()}@yallapp.test`, name: "Teammate", passwordHash: null, now: NOW });
    const a = announcement();
    await store.createAnnouncement(a);
    const key = `announcement:${a.id}`;
    await store.markUpdatesRead({ userId: owner.id, items: [key, "notice:7", key], now: NOW });
    await store.markUpdatesRead({ userId: owner.id, items: [key], now: new Date(NOW.getTime() + 60_000) });
    await store.markUpdatesRead({ userId: owner.id, items: [], now: NOW });
    expect((await store.listReadUpdates(owner.id, [key, "notice:7", "notice:8"])).sort()).toEqual([key, "notice:7"]);
    expect(await store.listReadUpdates(teammate.id, [key])).toEqual([]);
    expect(await store.listReadUpdates(owner.id, [])).toEqual([]);
    const [rows] = await pool.query("SELECT read_at FROM update_reads WHERE user_id = ? AND item = ?", [owner.id, key]);
    expect((rows as { read_at: Date }[])[0]!.read_at.getTime()).toBe(NOW.getTime());

    await store.deleteAnnouncement(a.id);
    expect(await store.listReadUpdates(owner.id, [key, "notice:7"])).toEqual(["notice:7"]);
  });
});
