import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { completePlanPayment, startPlanPayment } from "@/lib/billing/plan-payment";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { MemoryStore } from "@/lib/data/memory";
import type { App, CourseSetup, StoragePack, StoragePackOffer, StoragePacksSetting } from "@/lib/data/types";
import { CoursesConnector } from "@/lib/hosted/connectors/courses";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { mediaLinks, parseMediaLinksRequest } from "@/lib/license/media";
import { activateLicense, parseSiteInfo } from "@/lib/license/service";
import { handleMediaRequest, MediaDisk } from "@/lib/media/disk";
import { cancelStaleUploads, cleanName, completeUpload, deleteMedia, kindOf, mediaLink, parseMediaLink, resolveMedia, startUpload } from "@/lib/media/files";
import { applyPaidPacks, cannotBuy, cardOffers, monthlyOffer, monthsLeft, packOffers, packPrice, renewablePacks, renewalLabel, startStoragePayment } from "@/lib/media/packs";
import { activePacks, fits, formatBytes, GB, storageLimitBytes, storageState } from "@/lib/media/quota";
import { MEDIA_CHUNK_MAX_BYTES, parseRange, signMediaUrl, storageKeyOf, verifyMediaRequest } from "@/lib/media/signing";
import { mediaStorageWith, type MediaStorage } from "@/lib/media/storage";
import { appStorage, noticeEndedPacks } from "@/lib/media/usage";
import type { PaymentAccount } from "@/lib/payments/provider";
import { offerFor, sumOffers, timesOffer } from "@/lib/billing/prices";
import { paymentWhat, planReceiptRows } from "@/lib/billing/receipt";
import { comparisonRows, PLAN_INFO, planLimitLines, planPriceOf, plansWith, type PriceView } from "@/lib/plans";
import { expectContract } from "./contract";
import { expectPlatformContract } from "./platform-contract";
import { fakeKashier } from "./fake-providers";
import { days, KEY, NOW, setupClient } from "./helpers";

/** 51 Videos and pictures hosted by Yallapp, with storage per plan. */

const SECRET = "media-test-secret-0123456789abcdef0123456789";
const BASE = "https://yallapp.test";
const APP = "11111111-2222-4333-8444-555555555555";
const FILE = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function tempDir(): string {
  return mkdtempSync(path.join(tmpdir(), "yallapp-media-"));
}

function body(bytes: Buffer): ReadableStream<Uint8Array> {
  return new Blob([new Uint8Array(bytes)]).stream();
}

describe("signed media links (51)", () => {
  it("signs the operation, the file and its parameters", () => {
    const key = storageKeyOf(APP, FILE, "mp4");
    const { url, expiresAt } = signMediaUrl(`${BASE}/media`, "v", key, { secret: SECRET, ttlSeconds: 3600, now: NOW });
    expect(expiresAt.getTime()).toBe(NOW.getTime() + 3600_000);
    const parsed = new URL(url);
    expect(parsed.pathname).toBe(`/media/v/${APP}/${FILE}.mp4`);
    const check = verifyMediaRequest(parsed.pathname.slice("/media".length), parsed.searchParams, SECRET, NOW);
    expect(check).toMatchObject({ ok: true, op: "v", appId: APP, mediaId: FILE, extension: "mp4", key });
    // Another operation, another file, an added parameter, another secret or a later time: refused.
    expect(verifyMediaRequest(`/u/${APP}/${FILE}.mp4`, parsed.searchParams, SECRET, NOW)).toMatchObject({ ok: false, status: 403 });
    expect(verifyMediaRequest(`/v/${APP}/${FILE}.mov`, parsed.searchParams, SECRET, NOW)).toMatchObject({ ok: false, status: 403 });
    const more = new URLSearchParams(parsed.searchParams);
    more.set("size", "99");
    expect(verifyMediaRequest(`/v/${APP}/${FILE}.mp4`, more, SECRET, NOW)).toMatchObject({ ok: false, status: 403 });
    expect(verifyMediaRequest(`/v/${APP}/${FILE}.mp4`, parsed.searchParams, `${SECRET}x`, NOW)).toMatchObject({ ok: false, status: 403 });
    expect(verifyMediaRequest(`/v/${APP}/${FILE}.mp4`, parsed.searchParams, SECRET, new Date(NOW.getTime() + 3601_000))).toMatchObject({ ok: false, status: 410 });
    expect(verifyMediaRequest(`/v/${APP}/../${FILE}.mp4`, parsed.searchParams, SECRET, NOW)).toMatchObject({ ok: false, status: 404 });
    expect(() => signMediaUrl(BASE, "v", key, { secret: SECRET, ttlSeconds: 60, params: { name: "a b" } })).toThrow();
  });

  it("reads one range of bytes", () => {
    expect(parseRange(null, 100)).toBeNull();
    expect(parseRange("bytes=0-9", 100)).toEqual({ start: 0, end: 9 });
    expect(parseRange("bytes=90-", 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange("bytes=-10", 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange("bytes=50-500", 100)).toEqual({ start: 50, end: 99 });
    expect(parseRange("bytes=100-", 100)).toBe("invalid");
    expect(parseRange("bytes=5-1", 100)).toBe("invalid");
    expect(parseRange("bytes=0-1,4-5", 100)).toBe("invalid");
  });
});

/** The gate's protocol, run against `request`: the TypeScript gate in-process, or the PHP one over HTTP. */
function gateProtocol(name: string, gate: () => { base: string; request: (url: string, init?: RequestInit) => Promise<Response>; storage: MediaStorage }) {
  describe(name, () => {
    it("takes an upload in chunks, resumes, refuses what's out of place, then plays it with ranges", async () => {
      const { base, request, storage } = gate();
      const data = Buffer.alloc(2 * 1024 * 1024 + 123);
      for (let i = 0; i < data.length; i++) data[i] = i % 251;
      const key = storageKeyOf(APP, FILE, "mp4");
      const upload = signMediaUrl(base, "u", key, { secret: SECRET, ttlSeconds: 600, params: { size: String(data.length) } }).url;
      const offset = async () => Number((await request(upload, { method: "HEAD" })).headers.get("upload-offset"));
      expect(await offset()).toBe(0);
      const put = (at: number, chunk: Buffer) =>
        request(upload, { method: "PUT", headers: { "upload-offset": String(at), "content-length": String(chunk.length) }, body: new Uint8Array(chunk) });
      const first = await put(0, data.subarray(0, 1024 * 1024));
      expect(first.status).toBe(204);
      expect(first.headers.get("upload-offset")).toBe(String(1024 * 1024));
      // A chunk sent again, or one ahead of the upload: 409 with where it stands.
      const again = await put(0, data.subarray(0, 1024));
      expect(again.status).toBe(409);
      expect(again.headers.get("upload-offset")).toBe(String(1024 * 1024));
      expect((await put(2 * 1024 * 1024, data.subarray(0, 10))).status).toBe(409);
      // Past the signed size: 413, nothing written.
      expect((await put(1024 * 1024, Buffer.alloc(data.length))).status).toBe(413);
      expect(await offset()).toBe(1024 * 1024);
      expect(await storage.stat(key)).toEqual({ exists: true, complete: false, size: 1024 * 1024 });
      // The file isn't there to play until it's complete.
      const play = signMediaUrl(base, "v", key, { secret: SECRET, ttlSeconds: 600 }).url;
      expect((await request(play)).status).toBe(404);
      // An upload link can't be used to play, nor a play link to upload.
      expect((await request(play, { method: "PUT", headers: { "upload-offset": "0" }, body: new Uint8Array(1) })).status).toBe(405);

      expect((await put(1024 * 1024, data.subarray(1024 * 1024))).status).toBe(204);
      expect(await storage.stat(key)).toEqual({ exists: true, complete: true, size: data.length });

      const whole = await request(play);
      expect(whole.status).toBe(200);
      expect(whole.headers.get("content-type")).toBe("video/mp4");
      expect(whole.headers.get("accept-ranges")).toBe("bytes");
      expect(Buffer.from(await whole.arrayBuffer()).equals(data)).toBe(true);
      const part = await request(play, { headers: { range: "bytes=1000-1999" } });
      expect(part.status).toBe(206);
      expect(part.headers.get("content-range")).toBe(`bytes 1000-1999/${data.length}`);
      expect(Buffer.from(await part.arrayBuffer()).equals(data.subarray(1000, 2000))).toBe(true);
      const tail = await request(play, { headers: { range: "bytes=-5" } });
      expect(Buffer.from(await tail.arrayBuffer()).equals(data.subarray(data.length - 5))).toBe(true);
      expect((await request(play, { headers: { range: `bytes=${data.length}-` } })).status).toBe(416);
      const head = await request(play, { method: "HEAD" });
      expect(head.headers.get("content-length")).toBe(String(data.length));
      const saved = await request(signMediaUrl(base, "v", key, { secret: SECRET, ttlSeconds: 600, params: { dl: "1" } }).url, { method: "HEAD" });
      expect(saved.headers.get("content-disposition")).toBe(`attachment; filename="${FILE}.mp4"`);
      // A finished upload takes nothing more.
      expect((await put(data.length, Buffer.alloc(1))).status).toBe(409);

      await storage.delete(key);
      expect(await storage.stat(key)).toEqual({ exists: false, complete: false, size: 0 });
      expect((await request(play)).status).toBe(404);
      // Unsigned or expired links never reach the disk.
      expect((await request(`${base}/v/${APP}/${FILE}.mp4`)).status).toBe(403);
      const expired = signMediaUrl(base, "v", key, { secret: SECRET, ttlSeconds: 1, now: new Date(Date.now() - 60_000) }).url;
      expect((await request(expired)).status).toBe(410);
    });

    it("refuses a chunk bigger than the gate takes", async () => {
      const { base, request } = gate();
      const key = storageKeyOf(APP, "bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee", "pdf");
      const upload = signMediaUrl(base, "u", key, { secret: SECRET, ttlSeconds: 600, params: { size: String(MEDIA_CHUNK_MAX_BYTES + 10) } }).url;
      const chunk = Buffer.alloc(MEDIA_CHUNK_MAX_BYTES + 1);
      const response = await request(upload, { method: "PUT", headers: { "upload-offset": "0", "content-length": String(chunk.length) }, body: new Uint8Array(chunk) });
      expect(response.status).toBe(413);
    });
  });
}

{
  let dir = "";
  let disk: MediaDisk;
  beforeAll(() => {
    dir = tempDir();
    disk = new MediaDisk(dir);
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  gateProtocol("the media gate in TypeScript (local runs and tests)", () => {
    const base = `${BASE}/media`;
    const request = (url: string, init?: RequestInit) => handleMediaRequest(disk, new Request(url, init), new URL(url).pathname.slice("/media".length), SECRET);
    return { base, request, storage: mediaStorageWith({ mode: "fs", base, secret: SECRET, dir }) };
  });
}

// The PHP gate that runs on Yallapp's server (deploy/media-host), with PHP's own server, when PHP is installed.
const php = spawnSync("php", ["--version"]).status === 0;
{
  let dir = "";
  let server: ChildProcess | null = null;
  const port = 39000 + Math.floor(Math.random() * 500);
  beforeAll(async () => {
    if (!php) return;
    dir = tempDir();
    const docroot = path.join(dir, "docroot");
    const storage = path.join(dir, "files");
    spawnSync("mkdir", ["-p", docroot, storage]);
    copyFileSync(path.resolve("deploy/media-host/index.php"), path.join(docroot, "index.php"));
    writeFileSync(
      path.join(docroot, "config.php"),
      `<?php return array('signing_secret' => '${SECRET}', 'storage_dir' => '${storage}', 'prefix' => '/media', 'max_chunk_bytes' => ${MEDIA_CHUNK_MAX_BYTES});`,
    );
    server = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", docroot, path.join(docroot, "index.php")], { stdio: "ignore" });
    for (let i = 0; i < 50; i++) {
      try {
        await fetch(`http://127.0.0.1:${port}/media/`);
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  });
  afterAll(() => {
    server?.kill();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });
  if (php) {
    gateProtocol("the media gate in PHP (deploy/media-host/index.php)", () => {
      const base = `http://127.0.0.1:${port}/media`;
      return { base, request: (url, init) => fetch(url, init), storage: mediaStorageWith({ mode: "host", base, secret: SECRET }) };
    });
  } else {
    it.skip("the media gate in PHP: PHP isn't installed here", () => undefined);
  }
}

describe("storage per plan (51)", () => {
  const pack = (gb: number, until: Date): StoragePack => ({
    id: `p${gb}`,
    appId: APP,
    clientId: "c",
    offer: "plus25",
    gb,
    activeUntil: until,
    paymentId: null,
    createdAt: NOW,
    updatedAt: NOW,
    endedNoticeAt: null,
  });

  it("gives every plan its storage, editable, with packs on top while they run", () => {
    expect(["starter", "growth", "pro", "business"].map((p) => PLAN_INFO[p as keyof typeof PLAN_INFO].limits.storageGb)).toEqual([2, 20, 100, 500]);
    expect(storageLimitBytes(PLAN_INFO.starter, [], NOW)).toBe(2 * GB);
    expect(storageLimitBytes(PLAN_INFO.growth, [pack(25, days(10)), pack(100, days(-1))], NOW)).toBe(45 * GB);
    expect(activePacks([pack(25, days(10)), pack(100, days(-1))], NOW).map((p) => p.gb)).toEqual([25]);
    expect(storageLimitBytes({ limits: { ...PLAN_INFO.pro.limits, storageGb: null } }, [], NOW)).toBeNull();
    expect(storageLimitBytes(null, [pack(25, days(10))], NOW)).toBe(0);
    // An edit saved before storage was a limit keeps the default; a new edit changes it.
    const old = plansWith({ growth: { ...PLAN_INFO.growth, version: 2, limits: { ...PLAN_INFO.growth.limits, storageGb: undefined as unknown as number } } });
    expect(old.growth.limits.storageGb).toBe(20);
    expect(plansWith({ growth: { ...PLAN_INFO.growth, version: 2, limits: { ...PLAN_INFO.growth.limits, storageGb: 50 } } }).growth.limits.storageGb).toBe(50);
  });

  it("does the quota math", () => {
    expect(fits(GB, 2 * GB, GB)).toBe(true);
    expect(fits(GB, 2 * GB, GB + 1)).toBe(false);
    expect(fits(10 * GB, null, 100 * GB)).toBe(true);
    expect(storageState(3 * GB, 2 * GB)).toMatchObject({ over: true, share: 1.5 });
    expect(storageState(GB, null)).toMatchObject({ over: false, share: 0 });
    expect([0, 1023, 1536, 350 * 1024 ** 2, 1.25 * GB, 2048 * GB].map(formatBytes)).toEqual(["0 B", "1023 B", "1.5 KB", "350 MB", "1.3 GB", "2 TB"]);
  });

  it("shows storage on the plan cards and in the pricing table", () => {
    expect(planLimitLines(PLAN_INFO.growth).map((l) => l.text)).toContain("20 GB for videos and files");
    expect(comparisonRows(PLAN_INFO).find((r) => r.label === "Storage for videos and files")?.values).toEqual({ starter: "2 GB", growth: "20 GB", pro: "100 GB", business: "500 GB" });
  });
});

describe("the Media library (51)", () => {
  let store: MemoryStore;
  let dir: string;
  let storage: MediaStorage;
  let app: App;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = { ...newApp(client.id, null, NOW, "lms"), backend: "hosted", connector: { kind: "courses" } };
    await store.createApp(app);
    dir = tempDir();
    storage = mediaStorageWith({ mode: "fs", base: `${BASE}/media`, secret: SECRET, dir });
    return () => rmSync(dir, { recursive: true, force: true });
  });

  const deps = (limitBytes: number | null) => ({ store, storage, now: NOW, limitBytes, chunkBytes: 5 * 1024 * 1024 });

  async function uploadWhole(id: string, bytes: Buffer) {
    const file = (await store.getMediaFile(app.id, id))!;
    const link = new URL(storage.link("u", file.storageKey, 600, { size: String(file.sizeBytes) }).url);
    const disk = new MediaDisk(dir);
    return disk.append(file.storageKey, { offset: 0, total: file.sizeBytes, length: bytes.length, body: body(bytes) }).then(() => link);
  }

  it("knows the kinds of files and their limits", () => {
    expect(kindOf("video/mp4")).toMatchObject({ kind: "video", extension: "mp4", maxBytes: 5 * GB });
    expect(kindOf("VIDEO/QUICKTIME")).toMatchObject({ kind: "video", extension: "mov" });
    expect(kindOf("image/webp")).toMatchObject({ kind: "image", extension: "webp" });
    expect(kindOf("application/pdf")).toMatchObject({ kind: "pdf" });
    expect(kindOf("image/svg+xml")).toBeNull();
    expect(kindOf("text/html")).toBeNull();
    expect(cleanName("C:\\Users\\me\\Lesson 1.mp4")).toBe("Lesson 1.mp4");
    expect(cleanName("  \u0000 ")).toBe("Untitled");
  });

  it("reserves the space at the start, refuses what doesn't fit, and frees it on delete", async () => {
    const limit = 2 * GB;
    const big = await startUpload(deps(limit), { appId: app.id, name: "huge.mp4", size: 6 * GB, contentType: "video/mp4" });
    expect(big).toMatchObject({ ok: false, code: "too_big" });
    expect((await startUpload(deps(limit), { appId: app.id, name: "page.html", size: 10, contentType: "text/html" })).ok).toBe(false);
    const first = await startUpload(deps(limit), { appId: app.id, name: "Lesson 1.mp4", size: 1.5 * GB, contentType: "video/mp4" });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.file).toMatchObject({ status: "uploading", kind: "video", contentType: "video/mp4", public: false, storageKey: `${app.id}/${first.file.id}.mp4` });
    expect(new URL(first.uploadUrl).pathname).toBe(`/media/u/${app.id}/${first.file.id}.mp4`);
    expect(new URL(first.uploadUrl).searchParams.get("size")).toBe(String(1.5 * GB));
    expect(await store.mediaUsage(app.id)).toBe(1.5 * GB);
    const second = await startUpload(deps(limit), { appId: app.id, name: "Lesson 2.mp4", size: GB, contentType: "video/mp4" });
    expect(second).toMatchObject({ ok: false, code: "storage_full" });
    if (!second.ok) expect(second.message).toContain("1.5 GB of 2 GB is used");
    expect(await deleteMedia({ store, storage }, app.id, first.file.id)).toBe(true);
    expect(await store.mediaUsage(app.id)).toBe(0);
    expect((await startUpload(deps(limit), { appId: app.id, name: "Lesson 2.mp4", size: GB, contentType: "video/mp4" })).ok).toBe(true);
  });

  it("completes an upload only when the whole file is on the server", async () => {
    const started = await startUpload(deps(null), { appId: app.id, name: "Intro.mp4", size: 1000, contentType: "video/mp4" });
    if (!started.ok) throw new Error(started.message);
    expect(await completeUpload({ store, storage, now: NOW }, app.id, started.file.id)).toMatchObject({ ok: false, code: "incomplete", offset: 0 });
    await uploadWhole(started.file.id, Buffer.alloc(1000, 1));
    expect(await completeUpload({ store, storage, now: NOW }, app.id, started.file.id)).toMatchObject({ ok: true, file: { status: "ready" } });
    expect((await store.getMediaFile(app.id, started.file.id))?.status).toBe("ready");
    // Another app never sees it.
    expect(await completeUpload({ store, storage, now: NOW }, "other-app", started.file.id)).toMatchObject({ ok: false, code: "not_found" });
  });

  it("makes Yallapp links and resolves them only for the app's ready files", async () => {
    const started = await startUpload(deps(null), { appId: app.id, name: "Intro.mp4", size: 10, contentType: "video/mp4" });
    if (!started.ok) throw new Error(started.message);
    const link = mediaLink(BASE, started.file.id);
    expect(link).toBe(`${BASE}/m/${started.file.id}`);
    expect(parseMediaLink(link, BASE)).toBe(started.file.id);
    expect(parseMediaLink(`${link}/`, BASE)).toBe(started.file.id);
    expect(parseMediaLink(`https://elsewhere.test/m/${started.file.id}`, BASE)).toBeNull();
    expect(parseMediaLink(`${BASE}/m/not-an-id`, BASE)).toBeNull();
    expect(await resolveMedia({ store, storage, baseUrl: BASE }, app.id, link, "play")).toBeNull();
    await uploadWhole(started.file.id, Buffer.alloc(10));
    await completeUpload({ store, storage, now: NOW }, app.id, started.file.id);
    const play = await resolveMedia({ store, storage, baseUrl: BASE }, app.id, link, "play");
    expect(play).toMatchObject({ id: started.file.id, kind: "video", sizeBytes: 10, mimeType: "video/mp4" });
    expect(play!.expiresAt.getTime() - Date.now()).toBeGreaterThan(3.9 * 3600_000);
    const save = await resolveMedia({ store, storage, baseUrl: BASE }, app.id, link, "download");
    expect(new URL(save!.url).searchParams.get("dl")).toBe("1");
    expect(save!.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(15 * 60_000);
    expect(await resolveMedia({ store, storage, baseUrl: BASE }, "another-app", link, "play")).toBeNull();
  });

  it("cancels uploads left unfinished for two days", async () => {
    const started = await startUpload(deps(null), { appId: app.id, name: "Old.mp4", size: 10, contentType: "video/mp4" });
    if (!started.ok) throw new Error(started.message);
    expect(await cancelStaleUploads({ store, storage, now: days(1) })).toBe(0);
    expect(await cancelStaleUploads({ store, storage, now: days(3) })).toBe(1);
    expect(await store.getMediaFile(app.id, started.file.id)).toBeNull();
  });
});

const KASHIER: PaymentAccount = { provider: "kashier", keys: { merchantId: "MID-1234-567", apiKey: "api", secretKey: "secret", sandbox: true } };
// 52 Pack prices follow the plans': pounds charged, dollars shown outside Egypt (by hand, or at the rate).
const OFFERS: StoragePackOffer[] = [
  { id: "plus25", gb: 25, price: { egpCents: 25000, usdCents: 500 } },
  { id: "plus100", gb: 100, price: { egpCents: 80000, usdCents: null } },
];
const ABROAD: PriceView = { display: "USD", egpPerUsd: 50 };
const nbsp = (text: string) => text.replace(/EGP /g, `EGP${String.fromCharCode(0xa0)}`);

describe("storage packs, bought by card (51)", () => {
  it("costs a month's price for each month left in the plan's period, shown in the client's currency and charged in pounds", () => {
    expect(monthsLeft(days(30), NOW)).toBe(1);
    expect(monthsLeft(days(31), NOW)).toBe(2);
    expect(monthsLeft(days(1), NOW)).toBe(1);
    const monthly = monthlyOffer(OFFERS[0]!, "kashier", ABROAD)!;
    expect(packPrice(monthly, days(200), NOW)).toEqual({
      months: 7,
      offer: { charged: { cents: 175000, currency: "EGP" }, shown: { cents: 3500, currency: "USD" }, line: nbsp("You'll be charged EGP 1,750 (about $35); your bank may convert it.") },
    });
    expect(packPrice(monthlyOffer(OFFERS[0]!, "kashier", { display: "EGP", egpPerUsd: 50 })!, days(200), NOW).offer).toMatchObject({ shown: { cents: 175000, currency: "EGP" }, line: null });
    expect(cannotBuy(null, NOW)).toContain("come with a plan");
    expect(cannotBuy({ expiresAt: new Date(NOW.getTime() + 3600_000) }, NOW)).toContain("ends today");
    expect(cannotBuy({ expiresAt: days(30) }, NOW)).toBeNull();
    expect(packOffers(null).map((o) => o.gb)).toEqual([25, 100]);
    expect(packOffers(null).every((o) => o.price === null)).toBe(true);
    expect(packOffers({ offers: OFFERS })[0]!.price).toEqual({ egpCents: 25000, usdCents: 500 });
    // Offers saved before the packs' prices followed the plans' (a price in any currency) are unpriced until the team sets pounds.
    const old = packOffers({ offers: [{ id: "plus25", gb: 25, priceCents: 25000, currency: "TRY" }] } as unknown as StoragePacksSetting);
    expect(old).toEqual([{ id: "plus25", gb: 25, price: null }]);
    expect(cardOffers(old, "kashier", ABROAD)).toEqual([]);
    // Kashier charges pounds: both packs. iyzico charges dollars: only a pack with a dollar price, or with a rate.
    expect(cardOffers(OFFERS, "kashier", ABROAD).map((o) => o.offer.id)).toEqual(["plus25", "plus100"]);
    expect(cardOffers(OFFERS, "iyzico", { display: "USD", egpPerUsd: null }).map((o) => o.offer.id)).toEqual(["plus25"]);
    expect(cardOffers(OFFERS, null, ABROAD)).toEqual([]);
  });

  it("adds up a plan and its packs: charges in one currency, shown prices when they're in one too", () => {
    const plan = { charged: { cents: 120000, currency: "EGP" as const }, shown: { cents: 2400, currency: "USD" as const }, line: null };
    const packs = timesOffer(monthlyOffer(OFFERS[0]!, "kashier", ABROAD)!, 12);
    expect(sumOffers([plan, packs])).toMatchObject({ charged: { cents: 420000, currency: "EGP" }, shown: { cents: 8400, currency: "USD" } });
    // A pack without a dollar price and no rate shows in pounds: the total then shows as charged.
    const pounds = timesOffer(monthlyOffer(OFFERS[1]!, "kashier", { display: "USD", egpPerUsd: null })!, 12);
    expect(sumOffers([plan, pounds])).toEqual({ charged: { cents: 1080000, currency: "EGP" }, shown: { cents: 1080000, currency: "EGP" }, line: null });
  });

  it("adds the pack until the plan's period ends once Kashier confirms, and renews it with the plan", async () => {
    const setup = await setupClient({ activeUntil: days(90) });
    const client = setup.client;
    const app = { ...newApp(client.id, null, NOW, "lms"), backend: "hosted" as const };
    await setup.store.createApp(app);
    const license = (await setup.store.getLicenseForApp(client.id, app.id))!;
    expect(license.appId).toBe(app.id);
    const kashier = fakeKashier();
    let token = "";
    const url = await startStoragePayment({
      store: setup.store,
      account: KASHIER,
      fetcher: kashier.fetcher,
      now: NOW,
      client,
      app,
      license,
      user: setup.user,
      offer: OFFERS[0]!,
      view: ABROAD,
      billing: { city: "London", address: "1 Baker Street, Marylebone" },
      ip: "203.0.113.5",
      callbackUrls: (t) => {
        token = t;
        return { returnUrl: `${BASE}/api/pay/plan/${t}`, webhookUrl: null };
      },
    });
    expect(url).toContain("https://payments.kashier.test/session/sess1abcdef");
    // 90 days left: 3 months at EGP 250 (shown as $5 a month).
    expect(kashier.calls[0]!.body).toMatchObject({ amount: "750.00", currency: "EGP" });
    const payment = (await setup.store.getPlanPaymentByToken(sha256Hex(token)))!;
    expect(payment).toMatchObject({
      purpose: "storage",
      amountCents: 75000,
      currency: "EGP",
      shownCents: 1500,
      shownCurrency: "USD",
      storagePacks: [{ offer: "plus25", gb: 25, cents: 75000, packId: null }],
    });
    expect(Object.fromEntries(planReceiptRows({ payment, planName: "Growth", appName: "A", billedTo: { name: "M", email: "m@x.test" }, paidOn: "" }))).toMatchObject({
      Storage: "+25 GB for the Media library, until the plan's period ends",
      "Amount charged": nbsp("EGP 750"),
    });
    expect(paymentWhat(payment, "Growth")).toBe("Storage +25 GB");

    kashier.pay("sess1abcdef");
    const outcome = await completePlanPayment({ store: setup.store, account: KASHIER, fetcher: kashier.fetcher, now: NOW, payment, encryptionKey: KEY });
    expect(outcome.kind).toBe("storage_paid");
    const packs = await setup.store.listStoragePacks(app.id);
    expect(packs).toHaveLength(1);
    expect(packs[0]).toMatchObject({ gb: 25, offer: "plus25", paymentId: payment.id });
    expect(packs[0]!.activeUntil.getTime()).toBe(license.expiresAt.getTime());
    // The plan itself didn't change; a second confirmation adds nothing.
    expect((await setup.store.getLicenseForApp(client.id, app.id))!.expiresAt.getTime()).toBe(license.expiresAt.getTime());
    expect((await completePlanPayment({ store: setup.store, account: KASHIER, fetcher: kashier.fetcher, now: NOW, payment: (await setup.store.getPlanPaymentByToken(sha256Hex(token)))!, encryptionKey: KEY })).kind).toBe("already_paid");
    expect(await setup.store.listStoragePacks(app.id)).toHaveLength(1);

    // Renewing the plan by card renews the pack with it, at the plan's months: EGP 1,200 + 12 × EGP 250 charged, $24 + 12 × $5 shown.
    const plans = plansWith({ growth: { ...PLAN_INFO.growth, highlights: [...PLAN_INFO.growth.highlights], features: [...PLAN_INFO.growth.features], priceCents: 120000, usdCents: null, onRequest: false, billingMonths: 12, version: 2 } });
    const renewal = renewablePacks(packs, OFFERS, { provider: "kashier", view: ABROAD, months: 12, now: NOW })!;
    expect(renewal.lines).toEqual([{ offer: "plus25", gb: 25, cents: 300000, packId: packs[0]!.id }]);
    expect(renewal.offer).toMatchObject({ charged: { cents: 300000, currency: "EGP" }, shown: { cents: 6000, currency: "USD" } });
    expect(renewablePacks(packs, [{ id: "plus25", gb: 25, price: null }], { provider: "kashier", view: ABROAD, months: 12, now: NOW })).toBeNull();
    expect(renewalLabel(renewal)).toBe(nbsp("Renew my storage pack (+25 GB) for $60 (charged as EGP 3,000)"));
    expect(renewalLabel(renewablePacks(packs, OFFERS, { provider: "kashier", view: { display: "EGP", egpPerUsd: 50 }, months: 12, now: NOW })!)).toBe(nbsp("Renew my storage pack (+25 GB) for EGP 3,000"));
    const planOffer = offerFor(planPriceOf(plans.growth)!, "USD", "kashier", 50)!;
    let renewToken = "";
    const renew = {
      store: setup.store,
      account: KASHIER,
      fetcher: kashier.fetcher,
      now: NOW,
      client,
      app,
      user: setup.user,
      plan: plans.growth,
      billing: { city: "London", address: "1 Baker Street, Marylebone" },
      ip: "203.0.113.5",
      callbackUrls: (t: string) => {
        renewToken = t;
        return { returnUrl: `${BASE}/api/pay/plan/${t}`, webhookUrl: null };
      },
    };
    // Nothing to charge without packs: a free plan never goes to the provider.
    await expect(startPlanPayment({ ...renew, offer: { charged: { cents: 0, currency: "EGP" }, shown: { cents: 0, currency: "USD" } } })).rejects.toThrow("free payment");
    await startPlanPayment({ ...renew, offer: planOffer, storagePacks: renewal });
    expect(kashier.calls.at(-1)!.body).toMatchObject({ amount: "4200.00", currency: "EGP" });
    const renewalPayment = (await setup.store.getPlanPaymentByToken(sha256Hex(renewToken)))!;
    expect(renewalPayment).toMatchObject({ purpose: "plan", amountCents: 420000, currency: "EGP", shownCents: 8400, shownCurrency: "USD" });
    expect(paymentWhat(renewalPayment, "Growth")).toBe("Growth, 1 year, with storage +25 GB");
    kashier.pay("sess2abcdef");
    const renewed = await completePlanPayment({ store: setup.store, account: KASHIER, fetcher: kashier.fetcher, now: NOW, payment: renewalPayment, encryptionKey: KEY });
    expect(renewed.kind).toBe("paid");
    if (renewed.kind !== "paid") return;
    const after = await setup.store.listStoragePacks(app.id);
    expect(after).toHaveLength(1);
    expect(after[0]!.activeUntil.getTime()).toBe(renewed.activeUntil.getTime());
    expect(after[0]!.paymentId).toBe(renewalPayment.id);
  });

  it("tells the owner once when a pack ended and the files are over, and deletes nothing", async () => {
    const setup = await setupClient({ plan: "starter", activeUntil: days(90) });
    const app = { ...newApp(setup.client.id, null, NOW, "lms"), backend: "hosted" as const, appName: "Lale Academy" };
    await setup.store.createApp(app);
    await applyPaidPacks(
      setup.store,
      { id: "pay-1", clientId: setup.client.id, appId: app.id, plan: "starter", months: 1, amountCents: 1, currency: "EGP", status: "paid", tokenHash: "x", paymentId: "1", createdAt: NOW, paidAt: NOW, storagePacks: [{ offer: "plus25", gb: 25, cents: 1, packId: null }] },
      days(10),
      NOW,
    );
    const dir = tempDir();
    const storage = mediaStorageWith({ mode: "fs", base: `${BASE}/media`, secret: SECRET, dir });
    const started = await startUpload({ store: setup.store, storage, now: NOW, limitBytes: 27 * GB, chunkBytes: 1 }, { appId: app.id, name: "Course.mp4", size: 4 * GB, contentType: "video/mp4" });
    expect(started.ok).toBe(true);
    const mails: { key: string; to: string; values: Record<string, unknown> }[] = [];
    const deps = (now: Date) => ({ store: setup.store, baseUrl: BASE, now, mail: async (key: string, to: string, values: Record<string, unknown>) => void mails.push({ key, to, values }) });
    // While the pack runs: nothing to say.
    expect(await noticeEndedPacks(deps(days(5)), PLAN_INFO)).toHaveLength(0);
    expect((await appStorage(setup.store, app, PLAN_INFO, days(5))).over).toBe(false);
    // It ended: 4 GB on a 2 GB plan.
    const notices = await noticeEndedPacks(deps(days(11)), PLAN_INFO);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ kind: "storage_pack_ended", tone: "warn", linkLabel: "Buy more storage" });
    expect(mails).toEqual([{ key: "storage_pack_ended", to: "ada@academy.test", values: expect.objectContaining({ app_name: "Lale Academy", pack: "+25 GB", used: "4 GB", storage: "2 GB" }) }]);
    expect(await noticeEndedPacks(deps(days(12)), PLAN_INFO)).toHaveLength(0);
    expect(await setup.store.mediaUsage(app.id)).toBe(4 * GB);
    // Uploads are refused while over.
    const usage = await appStorage(setup.store, app, PLAN_INFO, days(12));
    expect(usage.over).toBe(true);
    expect((await startUpload({ store: setup.store, storage, now: days(12), limitBytes: usage.limitBytes, chunkBytes: 1 }, { appId: app.id, name: "a.png", size: 10, contentType: "image/png" })).ok).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("signed links for WordPress sites (51, POST /api/v1/licenses/media)", () => {
  it("signs the license's own app's ready files, on its own site only", async () => {
    const setup = await setupClient();
    const app = { ...newApp(setup.client.id, null, NOW, "lms"), backend: "wordpress" as const };
    await setup.store.createApp(app);
    const license = (await setup.store.getLicenseForApp(setup.client.id, app.id))!;
    expect(license.appId).toBe(app.id);
    const site = parseSiteInfo({ license_key: setup.licenseKey, site_url: "https://academy.test", plugin_version: "0.5.0" });
    if (!site.ok) throw new Error("site");
    expect((await activateLicense(setup.store, site.value, NOW)).status).toBe(200);
    const dir = tempDir();
    const storage = mediaStorageWith({ mode: "fs", base: `${BASE}/media`, secret: SECRET, dir });
    const started = await startUpload({ store: setup.store, storage, now: NOW, limitBytes: null, chunkBytes: 1 }, { appId: app.id, name: "Week 1.mp4", size: 5, contentType: "video/mp4" });
    if (!started.ok) throw new Error(started.message);
    await new MediaDisk(dir).append(started.file.storageKey, { offset: 0, total: 5, length: 5, body: body(Buffer.from("hello")) });
    await completeUpload({ store: setup.store, storage, now: NOW }, app.id, started.file.id);
    const request = (media: unknown[], site = "https://academy.test", purpose = "play") =>
      parseMediaLinksRequest({ license_key: setup.licenseKey, site_url: site, plugin_version: "0.5.0", media, purpose }, BASE);

    expect(request([])).toMatchObject({ ok: false, result: { status: 400 } });
    expect(request(["https://elsewhere.test/m/x"])).toMatchObject({ ok: false, result: { status: 400 } });
    expect(request([mediaLink(BASE, started.file.id)], "https://academy.test", "stream")).toMatchObject({ ok: false });
    const ok = request([mediaLink(BASE, started.file.id), FILE]);
    if (!ok.ok) throw new Error("parse");
    const result = await mediaLinks(setup.store, ok.value, { storage, baseUrl: BASE, now: NOW });
    expect(result.status).toBe(200);
    expectPlatformContract("POST", "/licenses/media", result);
    expect(result.body).toMatchObject({ items: [{ id: started.file.id, kind: "video", size_bytes: 5, mime_type: "video/mp4", name: "Week 1.mp4" }], missing: [FILE] });
    const other = request([started.file.id], "https://another.test");
    if (!other.ok) throw new Error("parse");
    const refused = await mediaLinks(setup.store, other.value, { storage, baseUrl: BASE, now: NOW });
    expect(refused).toMatchObject({ status: 403, body: { code: "license_inactive" } });
    expectPlatformContract("POST", "/licenses/media", refused);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("lesson videos from the Media library on the hosted API (51)", () => {
  let store: MemoryStore;
  let app: App;
  let storage: MediaStorage;
  let dir: string;
  let videoLink = "";
  const sender = new LogSender();
  let now = NOW;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    dir = tempDir();
    storage = mediaStorageWith({ mode: "fs", base: `${BASE}/media`, secret: SECRET, dir });
    const appId = newApp(client.id, null, NOW, "lms").id;
    const started = await startUpload({ store, storage, now: NOW, limitBytes: null, chunkBytes: 1 }, { appId, name: "Greetings.mp4", size: 4, contentType: "video/mp4" });
    if (!started.ok) throw new Error(started.message);
    await new MediaDisk(dir).append(started.file.storageKey, { offset: 0, total: 4, length: 4, body: body(Buffer.from("mp4!")) });
    await completeUpload({ store, storage, now: NOW }, appId, started.file.id);
    videoLink = mediaLink(BASE, started.file.id);
    const setup: CourseSetup = {
      currency: "TRY",
      categories: [],
      nextId: 40,
      courses: [
        {
          id: 10,
          title: "Turkish",
          description: "",
          imageAssetId: null,
          priceCents: 0,
          categoryIds: [],
          instructorName: null,
          level: null,
          active: true,
          createdAt: "2026-10-01T10:00:00.000Z",
          topics: [
            {
              id: 11,
              title: "Hello",
              lessons: [
                { id: 12, title: "Greetings", videoUrl: videoLink, text: "", durationMinutes: 8, preview: true },
                { id: 13, title: "Gone", videoUrl: mediaLink(BASE, FILE), text: "Text stays.", durationMinutes: 1, preview: true },
              ],
            },
          ],
        },
      ],
    };
    app = { ...newApp(client.id, null, NOW, "lms"), id: appId, backend: "hosted", connector: { kind: "courses" }, courseSetup: setup };
    await store.createApp(app);
    return () => rmSync(dir, { recursive: true, force: true });
  });

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    plan: PLAN_INFO.growth,
    assetUrl: (id) => `${BASE}/api/v1/assets/${id}`,
    platformUrl: BASE,
    connector: new CoursesConnector({
      store,
      app,
      assetUrl: (id) => `${BASE}/api/v1/assets/${id}`,
      platformUrl: BASE,
      downloads: true,
      media: { isLink: (url) => parseMediaLink(url, BASE) !== null, resolve: (url, purpose) => resolveMedia({ store, storage, baseUrl: BASE }, app.id, url, purpose) },
    }),
  });

  async function call(method: string, route: string, params: string[], token: string | null = null): Promise<HostedResult> {
    let concrete = route;
    for (const param of params) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(), body: undefined, token });
    expectContract(method, route, result);
    return result;
  }

  it("plays the file from a link signed for the request, which the app asks again for when it expires", async () => {
    const lesson = (await call("GET", "/lessons/{lesson_id}", ["12"])).body as { video: { source: string; url: string; expires_at: string }; offline: { available: boolean; size_bytes: number } };
    expect(lesson.video.source).toBe("upload");
    expect(new URL(lesson.video.url).pathname).toBe(`/media/v/${app.id}/${parseMediaLink(videoLink, BASE)}.mp4`);
    expect(new Date(lesson.video.expires_at).getTime()).toBeGreaterThan(Date.now() + 3.9 * 3600_000);
    expect(lesson.offline).toMatchObject({ available: true, size_bytes: 4 });
    // The signed link plays from the gate.
    const disk = new MediaDisk(dir);
    const url = new URL(lesson.video.url);
    const played = await handleMediaRequest(disk, new Request(url), url.pathname.slice("/media".length), SECRET);
    expect(await played.text()).toBe("mp4!");
    // A deleted file: the lesson has no video, its text stays.
    const gone = (await call("GET", "/lessons/{lesson_id}", ["13"])).body as { video?: unknown; html: string };
    expect(gone.video).toBeUndefined();
    expect(gone.html).toContain("Text stays.");
  });
});
