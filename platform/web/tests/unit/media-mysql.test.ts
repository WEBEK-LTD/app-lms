import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { MediaFile, PlanPayment, StoragePack } from "@/lib/data/types";

/**
 * 51 The Media library's records and storage packs on MySQL or MariaDB:
 * usage sums, stale uploads, ended packs, and a payment's packs kept with it.
 * Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-10-19T12:00:00.000Z");

describe.skipIf(!url)("51 media on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });

  it("keeps files, sums their sizes, finds stale uploads and ended packs", async () => {
    const user = await store.createUser({ email: `media-${randomUUID()}@yallapp.test`, name: "Media", passwordHash: null, now: NOW });
    const client = await store.createClient({ userId: user.id, whatsapp: "+905321234567", siteUrl: "", now: NOW });
    const app = newApp(client.id, null, NOW, "lms");
    await store.createApp(app);
    const file = (n: number, status: MediaFile["status"], at: Date): MediaFile => {
      const id = randomUUID();
      return { id, appId: app.id, name: `Lesson ${n}.mp4`, kind: "video", contentType: "video/mp4", sizeBytes: n * 1_000_000_000, storageKey: `${app.id}/${id}.mp4`, status, public: false, createdAt: at, updatedAt: at };
    };
    const a = file(3, "ready", NOW);
    const b = file(2, "uploading", new Date(NOW.getTime() - 3 * 86_400_000));
    await store.createMediaFile(a);
    await store.createMediaFile(b);
    expect(await store.mediaUsage(app.id)).toBe(5_000_000_000);
    expect((await store.listMediaFiles(app.id, { status: "ready" })).map((f) => f.id)).toEqual([a.id]);
    expect((await store.listStaleMediaUploads(new Date(NOW.getTime() - 86_400_000), 100)).map((f) => f.id)).toContain(b.id);
    await store.updateMediaFile(app.id, a.id, { name: "Renamed.mp4", public: true, updatedAt: NOW });
    expect(await store.getMediaFileById(a.id)).toMatchObject({ name: "Renamed.mp4", public: true });
    expect(await store.getMediaFile("another-app", a.id)).toBeNull();
    await store.deleteMediaFile(app.id, b.id);
    expect(await store.mediaUsage(app.id)).toBe(3_000_000_000);

    const pack: StoragePack = { id: randomUUID(), appId: app.id, clientId: client.id, offer: "plus25", gb: 25, activeUntil: new Date(NOW.getTime() - 1000), paymentId: null, createdAt: NOW, updatedAt: NOW, endedNoticeAt: null };
    await store.createStoragePack(pack);
    expect((await store.listEndedStoragePacks(NOW, 500)).map((p) => p.id)).toContain(pack.id);
    await store.updateStoragePack(pack.id, { endedNoticeAt: NOW });
    expect((await store.listEndedStoragePacks(NOW, 500)).map((p) => p.id)).not.toContain(pack.id);
    expect((await store.listStoragePacks(app.id))[0]).toMatchObject({ gb: 25, offer: "plus25" });

    const payment: PlanPayment = {
      id: randomUUID(),
      clientId: client.id,
      appId: app.id,
      plan: "growth",
      months: 1,
      amountCents: 75000,
      currency: "EGP",
      // 52 Charged in pounds, shown in dollars outside Egypt.
      shownCents: 1500,
      shownCurrency: "USD",
      status: "pending",
      tokenHash: randomUUID().replaceAll("-", "").padEnd(64, "0"),
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      purpose: "storage",
      storagePacks: [{ offer: "plus25", gb: 25, cents: 75000, packId: null }],
    };
    await store.createPlanPayment(payment);
    expect(await store.getPlanPaymentByToken(payment.tokenHash)).toMatchObject({
      purpose: "storage",
      currency: "EGP",
      shownCents: 1500,
      shownCurrency: "USD",
      storagePacks: [{ offer: "plus25", gb: 25, cents: 75000, packId: null }],
    });
  });
});
