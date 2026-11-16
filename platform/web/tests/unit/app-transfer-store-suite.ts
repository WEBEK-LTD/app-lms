import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { copyApp, type CopyDeps } from "@/lib/apps/copy";
import { approveMove, checkMoveCode, performMove, performPlanMove, requestAppMove, requestPlanMove, type PerformDeps } from "@/lib/apps/move";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App, AppMoveRequest, Build, MediaFile } from "@/lib/data/types";
import type { MediaStorage } from "@/lib/media/storage";

/**
 * 132.112–132.114 Copying and moving an app, the same on the memory store
 * and on MySQL or MariaDB (migration 0130): a copy takes the content (with
 * the IDs between its rows made the copy's own), the pictures and the Media
 * library, never the people, orders, secrets, builds, listing or plan; a
 * move takes the app with its builds, and its data and its plan only when
 * asked, leaving a read-only record with the invoices in the account it
 * leaves.
 */

const NOW = new Date("2026-11-16T09:00:00.000Z");
const KEY = Buffer.alloc(32, 7);
const SECRET = "test-move-secret-0123456789abcdef0123456789";

class CopyingMedia implements MediaStorage {
  readonly mode = "fs" as const;
  readonly copies: [string, string][] = [];
  link(op: string, key: string, ttlSeconds: number) {
    return { url: `https://files.test/${op}/${key}`, expiresAt: new Date(NOW.getTime() + ttlSeconds * 1000) };
  }
  async stat() {
    return { exists: true, complete: true, size: 10 };
  }
  async delete() {}
  async deleteApp() {}
  async listApps() {
    return [];
  }
  async copy(from: string, to: string) {
    this.copies.push([from, to]);
  }
}

export function appTransferStoreSuite(store: () => DataStore) {
  async function account(name: string) {
    return registerClient(store(), { name, email: `${name.toLowerCase().replace(/\s+/g, "-")}-${randomUUID()}@move.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  }

  /** A shop with content, people, an order, a build, a plan and secrets. */
  async function shop(clientId: string) {
    const s = store();
    const icon = randomUUID();
    await s.createAsset({ id: icon, clientId, kind: "icon", blobKey: `assets/${icon}.png`, contentType: "image/png", size: 10, createdAt: NOW });
    const photo = randomUUID();
    await s.createAsset({ id: photo, clientId, kind: "product_image", blobKey: `assets/${photo}.jpg`, contentType: "image/jpeg", size: 10, createdAt: NOW });
    const app: App = {
      ...newApp(clientId, null, NOW, "store"),
      backend: "hosted",
      appName: "Petal House",
      iconAssetId: icon,
      androidPackage: `com.petal.house${Date.now()}`,
      storeTitle: "Petal House",
      firebaseServiceAccountEncrypted: "v1:secret-push",
      googlePlayKeyEncrypted: "v1:secret-play",
      catalogSettings: { currency: "EGP", shippingCents: 0, freeShippingOverCents: null, payment: { provider: "stripe", secretKeyEncrypted: "v1:secret-stripe", sandbox: true } },
    };
    await s.createApp(app);
    const roses = await s.createCatalogCategory({ appId: app.id, name: "Roses", now: NOW });
    const tulips = await s.createCatalogCategory({ appId: app.id, name: "Tulips", now: NOW });
    const product = (name: string, categoryIds: number[]) =>
      s.createCatalogProduct(
        { appId: app.id, name, description: "", priceCents: 1000, salePriceCents: null, categoryIds, imageAssetIds: [photo], stock: 5, digital: false, featured: false, active: true, sku: null },
        NOW,
      );
    const red = await product("Red roses", [roses.id]);
    const white = await product("White tulips", [tulips.id, roses.id]);
    const coupon = await s.createCatalogCoupon({ appId: app.id, code: `SPRING${Date.now()}`, kind: "percent", value: 10, minOrderCents: null, endsAt: null, maxUses: 10, active: true, createdAt: NOW });
    await s.useCatalogCoupon(app.id, coupon!.id);
    await s.createFlashSale({ appId: app.id, title: "Mother's Day", productIds: [red.id], categoryId: null, discount: { kind: "percent", percent: 20 }, startsAt: NOW, endsAt: new Date(NOW.getTime() + 86_400_000), limit: null, platformCode: null, active: true, createdAt: NOW, updatedAt: NOW });
    const news = await s.createArticleCategory({ appId: app.id, name: "Care", position: 0, createdAt: NOW });
    await s.createArticle({ appId: app.id, title: "Caring for roses", excerpt: null, body: "Water daily.", imageAssetId: photo, author: null, categoryIds: [news.id], featured: false, status: "published", publishedAt: NOW }, NOW);
    const event = await s.createEvent(
      { appId: app.id, title: "Workshop", description: "", category: "Classes", imageAssetIds: [], startAt: NOW, endAt: NOW, venueName: "Shop", venueAddress: "", latitude: null, longitude: null, onlineUrl: null, organiser: "Petal", capacity: null, status: "published", publishedAt: NOW },
      NOW,
    );
    await s.createTicketType({ appId: app.id, eventId: event.id, name: "Seat", priceCents: 500, capacity: 10, saleEndsAt: null, maxPerOrder: 2, position: 0 }, NOW);
    const subject = await s.saveSchoolSubject({ appId: app.id, id: null, name: "Botany" }, NOW);
    const klass = await s.saveSchoolClass({ appId: app.id, id: null, name: "Class A", grade: "1", homeroomTeacherId: null }, NOW);
    if (subject.ok && klass) await s.saveSchoolPeriod({ appId: app.id, id: null, classId: klass.id, subjectId: subject.subject.id, teacherId: null, weekday: 1, startMinute: 480, endMinute: 525, room: null });
    // The pages: a list of hand-picked products and a category.
    await s.saveAppLayout({
      appId: app.id,
      draft: { pages: [{ id: "home", blocks: [{ type: "items", query: { category_id: String(roses.id), featured: false, sort: "newest", limit: 6, ids: [String(white.id)] }, image: icon }] }] } as never,
      draftUpdatedAt: NOW,
      published: null,
      publishedAt: null,
      publishedBy: null,
      publishCount: 0,
    });
    const mediaId = randomUUID();
    const media: MediaFile = { id: mediaId, appId: app.id, kind: "pdf", name: "Catalogue.pdf", contentType: "application/pdf", sizeBytes: 2048, storageKey: `${app.id}/${mediaId}.pdf`, status: "ready", public: false, source: "library", createdAt: NOW, updatedAt: NOW };
    await s.createMediaFile(media);
    // Its people, an order, a build and its plan.
    const user = await s.createHostedUser({ appId: app.id, phone: "+905550000001", name: "Deniz", email: null, city: null, now: NOW });
    const order = await s.createCatalogOrder({
      appId: app.id,
      tokenHash: randomUUID().replace(/-/g, ""),
      userId: user!.id,
      status: "completed",
      lines: [{ productId: red.id, name: "Red roses", quantity: 1, unitCents: 1000, imageAssetId: null, digital: false }],
      subtotalCents: 1000,
      shippingCents: 0,
      totalCents: 1000,
      currency: "EGP",
      customer: null,
      paymentId: "pay-1",
      createdAt: NOW,
      paidAt: NOW,
      updatedAt: NOW,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    });
    // 134 The order paid inside the app for a connected store: an order like the payment it belongs to.
    await s.createStorePlatformOrder({
      appId: app.id,
      orderId: order.id,
      platform: "woocommerce",
      status: "placed",
      intent: { currency: "EGP", lines: [], coupon: null, extras: {}, customerId: null, buyer: null, platform: "android" },
      quote: null,
      platformOrderId: "501",
      platformOrderNumber: "501",
      problem: null,
      attempts: 1,
      createdAt: NOW,
      updatedAt: NOW,
    });
    await s.createBuild({
      id: randomUUID(),
      clientId,
      appId: app.id,
      versionName: "1.0.0",
      status: "ready",
      stages: { queued: "done", android: "done", ios: "skipped", upload_play: "skipped", upload_testflight: "skipped" },
      config: {} as Build["config"],
      storeListing: { storeTitle: "", shortDescription: "", fullDescription: "", supportEmail: "", privacyUrl: "" },
      autoPublish: false,
      artifacts: [],
      message: null,
      logUrl: null,
      createdAt: NOW,
      startedAt: NOW,
      finishedAt: NOW,
      updatedAt: NOW,
    });
    await activateClient(s, { clientId, appId: app.id, plan: "growth", activeUntil: new Date(NOW.getTime() + 30 * 86_400_000), paymentNote: "bank transfer" }, KEY, NOW);
    await s.createPlanPayment({
      id: randomUUID(),
      clientId,
      appId: app.id,
      plan: "growth",
      months: 1,
      amountCents: 1000,
      currency: "EGP",
      status: "paid",
      tokenHash: randomUUID().replace(/-/g, ""),
      paymentId: "p-1",
      createdAt: NOW,
      paidAt: NOW,
    });
    return { app: (await s.getAppById(app.id))!, icon, photo, red, white, roses, tulips, mediaId, user: user!, order };
  }

  const copyDeps = (media: MediaStorage | null = new CopyingMedia()): CopyDeps => ({ store: store(), now: NOW, copyBlob: async (key) => `${key}.copy`, media });

  it("copies an app's content into another account, never its people, orders, secrets, builds, listing or plan", async () => {
    const s = store();
    const a = await account("Omar Haddad");
    const b = await account("Lina Farouk");
    const source = await shop(a.client.id);
    const media = new CopyingMedia();
    const { app: copy, copied, mediaFailed } = await copyApp(copyDeps(media), source.app, { clientId: b.client.id, name: "Petal House 2" });
    expect(copy.clientId).toBe(b.client.id);
    expect(copy.appName).toBe("Petal House 2");
    expect(copy.appType).toBe("store");
    // No listing, keys or payment account.
    expect(copy).toMatchObject({ androidPackage: null, storeTitle: null, firebaseServiceAccountEncrypted: null, googlePlayKeyEncrypted: null });
    expect(copy.catalogSettings?.payment ?? null).toBeNull();
    expect(JSON.stringify(copy)).not.toContain("secret-");
    // Its icon is a copy in the other account.
    expect(copy.iconAssetId).not.toBe(source.icon);
    expect(await s.getAsset(copy.iconAssetId!)).toMatchObject({ clientId: b.client.id, blobKey: `assets/${source.icon}.png.copy` });
    // The content, with the IDs between its rows the copy's own.
    const categories = await s.listCatalogCategories(copy.id);
    expect(categories.map((c) => c.name).sort()).toEqual(["Roses", "Tulips"]);
    const products = await s.listCatalogProducts(copy.id);
    expect(products).toHaveLength(2);
    const roses = categories.find((c) => c.name === "Roses")!;
    const tulips = categories.find((c) => c.name === "Tulips")!;
    const white = products.find((p) => p.name === "White tulips")!;
    expect(white.categoryIds.sort()).toEqual([roses.id, tulips.id].sort());
    expect(white.imageAssetIds[0]).not.toBe(source.photo);
    const [coupon] = await s.listCatalogCoupons(copy.id);
    expect(coupon!.usedCount).toBe(0);
    const [sale] = await s.listFlashSales(copy.id);
    expect(sale!.productIds).toEqual([products.find((p) => p.name === "Red roses")!.id]);
    const [article] = await s.listArticles(copy.id);
    expect(article!.categoryIds).toEqual([(await s.listArticleCategories(copy.id))[0]!.id]);
    const [event] = await s.listEvents(copy.id);
    expect((await s.listTicketTypes(copy.id)).map((t) => t.eventId)).toEqual([event!.id]);
    expect(await s.listSchoolPeriods(copy.id)).toHaveLength(1);
    // The pages' hand-picked entries and pictures are the copy's.
    const layout = await s.getAppLayout(copy.id);
    const block = (layout!.draft as unknown as { pages: { blocks: { query: { category_id: string; ids: string[] }; image: string }[] }[] }).pages[0]!.blocks[0]!;
    expect(block.query).toMatchObject({ category_id: String(roses.id), ids: [String(white.id)] });
    expect(block.image).toBe(copy.iconAssetId);
    // The Media library's file, in the new app's folder.
    const [file] = await s.listMediaFiles(copy.id);
    expect(file!.storageKey.startsWith(`${copy.id}/`)).toBe(true);
    expect(media.copies).toEqual([[`${source.app.id}/${source.mediaId}.pdf`, file!.storageKey]]);
    expect(mediaFailed).toEqual([]);
    expect(copied).toMatchObject({ catalog_categories: 2, catalog_products: 2, catalog_coupons: 1, store_flash_sales: 1, articles: 1, events: 1, event_ticket_types: 1, media_files: 1, app_layouts: 1 });
    // Never the people, orders, builds or plan.
    expect(await s.countHostedUsers(copy.id)).toBe(0);
    expect((await s.listCatalogOrders({ appId: copy.id, offset: 0, limit: 10 })).total).toBe(0);
    expect(await s.listStorePlatformOrders(copy.id, 10)).toEqual([]);
    expect(await s.listBuildsByApp(copy.id, 10, "all")).toEqual([]);
    expect(await s.getLicenseForApp(b.client.id, copy.id)).toBeNull();
    expect(await s.listPlanPayments({ appId: copy.id, limit: 10 })).toEqual([]);
    // The source is as it was.
    expect((await s.getAppById(source.app.id))!.clientId).toBe(a.client.id);
    expect(await s.listCatalogProducts(source.app.id)).toHaveLength(2);
    expect(await s.countHostedUsers(source.app.id)).toBe(1);
  });

  it("copies within the same account, sharing its pictures", async () => {
    const s = store();
    const a = await account("Selin Kaya");
    const source = await shop(a.client.id);
    const { app: copy } = await copyApp(copyDeps(null), source.app, { clientId: a.client.id, name: "Petal House (copy)" });
    expect(copy.clientId).toBe(a.client.id);
    expect(copy.iconAssetId).toBe(source.icon);
    // Without a Media server set up, the library isn't copied (and nothing fails).
    expect(await s.listMediaFiles(copy.id)).toEqual([]);
    expect((await s.listAppsByClient(a.client.id)).map((x) => x.id).sort()).toEqual([source.app.id, copy.id].sort());
  });

  async function moved(options: { moveData: boolean; moveSubscription: boolean }) {
    const s = store();
    const a = await account("Omar Haddad");
    const b = await account("Lina Farouk");
    const source = await shop(a.client.id);
    // A second app of the account shares the product photo: it's copied for the app that moves.
    const other: App = { ...newApp(a.client.id, null, NOW, "store"), backend: "hosted", logoAssetId: source.photo };
    await s.createApp(other);
    const deps: PerformDeps = { store: s, now: NOW, secret: SECRET, copyBlob: async (key) => `${key}.moved` };
    const asked = await requestAppMove(deps, { app: source.app, toClientId: b.client.id, ...options, by: { id: randomUUID(), email: "selin@yallapp.test", name: "Selin" } });
    if (!asked.ok) throw new Error(asked.reason);
    const approved = await approveMove(deps, asked.request, "owner");
    if (!approved.ok) throw new Error(approved.reason);
    const result = await performMove(deps, approved.request);
    if (!result.ok) throw new Error(result.note);
    return { s, a, b, source, other, done: result.done, request: (await s.getAppMoveRequest(asked.request.id))! };
  }

  it("moves an app with its data and subscription; the invoices stay with whoever paid them", async () => {
    const { s, a, b, source, done, request } = await moved({ moveData: true, moveSubscription: true });
    expect(request).toMatchObject({ status: "moved", resultAppId: source.app.id, closedBy: "owner" });
    const app = (await s.getAppById(source.app.id))!;
    expect(app.clientId).toBe(b.client.id);
    expect(app.androidPackage).toBe(source.app.androidPackage);
    expect(await s.listCatalogProducts(app.id)).toHaveLength(2);
    expect(await s.countHostedUsers(app.id)).toBe(1);
    expect(await s.getStorePlatformOrder(app.id, source.order.id)).toMatchObject({ status: "placed", platformOrderId: "501" });
    expect((await s.listBuildsByApp(app.id, 10, "all"))[0]).toMatchObject({ clientId: b.client.id });
    expect(await s.getLicenseForApp(b.client.id, app.id)).toMatchObject({ clientId: b.client.id, plan: "growth" });
    // The record left behind holds the invoices.
    expect(done.archive).toMatchObject({ clientId: a.client.id, movedToClientId: b.client.id, appName: "Petal House" });
    expect((await s.listPlanPayments({ clientId: a.client.id, limit: 10 })).map((p) => p.appId)).toEqual([done.archive.id]);
    expect(await s.listPlanPayments({ clientId: b.client.id, limit: 10 })).toEqual([]);
    // The icon only it used went with it; the photo another app uses was copied for it.
    expect((await s.getAsset(source.icon))!.clientId).toBe(b.client.id);
    expect((await s.getAsset(source.photo))!.clientId).toBe(a.client.id);
    const photo = (await s.listCatalogProducts(app.id))[0]!.imageAssetIds[0]!;
    expect(photo).not.toBe(source.photo);
    expect(await s.getAsset(photo)).toMatchObject({ clientId: b.client.id, blobKey: `assets/${source.photo}.jpg.moved` });
    expect((await s.listAppsByClient(a.client.id)).map((x) => x.id)).toContain(done.archive.id);
  });

  it("moves an app without its data: its people and orders stay, archived, in the account it leaves", async () => {
    const { s, a, b, source, done } = await moved({ moveData: false, moveSubscription: true });
    const app = (await s.getAppById(source.app.id))!;
    expect(app.clientId).toBe(b.client.id);
    expect(await s.listCatalogProducts(app.id)).toHaveLength(2);
    expect(await s.countHostedUsers(app.id)).toBe(0);
    expect((await s.listCatalogOrders({ appId: app.id, offset: 0, limit: 10 })).total).toBe(0);
    expect(await s.countHostedUsers(done.archive.id)).toBe(1);
    expect((await s.listCatalogOrders({ appId: done.archive.id, offset: 0, limit: 10 })).total).toBe(1);
    expect(await s.listStorePlatformOrders(app.id, 10)).toEqual([]);
    expect(await s.getStorePlatformOrder(done.archive.id, source.order.id)).toMatchObject({ status: "placed", platformOrderId: "501" });
    expect((await s.getAppById(done.archive.id))!.clientId).toBe(a.client.id);
    // The subscription went with the app.
    expect(await s.getLicenseForApp(b.client.id, app.id)).not.toBeNull();
    expect(await s.getLicenseForApp(a.client.id, done.archive.id)).toBeNull();
  });

  it("moves an app without its subscription: the account it leaves keeps the plan", async () => {
    const { s, a, b, source, done } = await moved({ moveData: true, moveSubscription: false });
    const app = (await s.getAppById(source.app.id))!;
    expect(app.clientId).toBe(b.client.id);
    expect(await s.getLicenseForApp(b.client.id, app.id)).toBeNull();
    expect(await s.getLicenseForApp(a.client.id, done.archive.id)).toMatchObject({ plan: "growth", clientId: a.client.id });
    expect(await s.countHostedUsers(app.id)).toBe(1);
  });

  it("moves only a plan to another app: the app it leaves has none, the other gets the same end and change", async () => {
    const s = store();
    const a = await account("Omar Haddad");
    const b = await account("Lina Farouk");
    const source = await shop(a.client.id);
    const before = (await s.getLicenseForApp(a.client.id, source.app.id))!;
    await s.updateLicense(before.id, { nextPlan: "starter", nextPlanAt: before.expiresAt }, NOW);
    await s.createStoragePack({ id: randomUUID(), appId: source.app.id, clientId: a.client.id, offer: "gb10", gb: 10, activeUntil: before.expiresAt, paymentId: null, createdAt: NOW, updatedAt: NOW, endedNoticeAt: null });
    const target: App = { ...newApp(b.client.id, null, NOW, "store"), backend: "hosted" };
    await s.createApp(target);
    const deps = { store: s, now: NOW, secret: SECRET, newLicenseKey: async () => {} };
    const asked = await requestPlanMove(deps, { app: source.app, toApp: target, by: { id: randomUUID(), email: "selin@yallapp.test", name: "Selin" } });
    if (!asked.ok) throw new Error(asked.reason);
    expect(asked.request).toMatchObject({ kind: "plan", toAppId: target.id, toClientId: b.client.id });
    const approved = await checkMoveCode(deps, asked.request.id, asked.code, "team");
    if (!approved.ok) throw new Error(approved.reason);
    const done = await performPlanMove(deps, approved.request);
    expect(done.ok).toBe(true);
    expect(await s.getLicenseForApp(a.client.id, source.app.id)).toBeNull();
    const after = (await s.getLicenseForApp(b.client.id, target.id))!;
    expect(after).toMatchObject({ id: before.id, clientId: b.client.id, plan: "growth", nextPlan: "starter" });
    expect(after.expiresAt.getTime()).toBe(before.expiresAt.getTime());
    expect((await s.listStoragePacks(target.id)).map((p) => p.gb)).toEqual([10]);
    expect(await s.listStoragePacks(source.app.id)).toEqual([]);
    // The invoices stay where they were; the app itself didn't move.
    expect((await s.listPlanPayments({ clientId: a.client.id, limit: 10 })).map((p) => p.appId)).toEqual([source.app.id]);
    expect((await s.getAppById(source.app.id))!.clientId).toBe(a.client.id);
    // An app with a plan takes no other.
    const again = await requestPlanMove(deps, { app: target, toApp: { ...source.app }, by: { id: randomUUID(), email: "selin@yallapp.test", name: "Selin" } });
    expect(again.ok).toBe(true);
    const busy: App = { ...newApp(b.client.id, null, NOW, "store"), backend: "hosted" };
    await s.createApp(busy);
    await activateClient(s, { clientId: b.client.id, appId: busy.id, plan: "pro", activeUntil: NOW, paymentNote: "test" }, KEY, NOW);
    const third: App = { ...newApp(a.client.id, null, NOW, "store"), backend: "hosted" };
    await s.createApp(third);
    expect(await requestPlanMove(deps, { app: busy, toApp: target, by: { id: randomUUID(), email: "x@yallapp.test", name: "X" } })).toEqual({ ok: false, reason: "target_has_plan" });
  });

  it("keeps one waiting move per app, its tries and its closing once", async () => {
    const s = store();
    const a = await account("Ada");
    const b = await account("Grace");
    const app: App = { ...newApp(a.client.id, null, NOW, "store"), backend: "hosted" };
    await s.createApp(app);
    const request: AppMoveRequest = {
      id: randomUUID(),
      kind: "app",
      appId: app.id,
      fromClientId: a.client.id,
      toClientId: b.client.id,
      toAppId: null,
      moveData: true,
      moveSubscription: false,
      codeHash: "h".repeat(43),
      attempts: 0,
      status: "waiting",
      requestedBy: randomUUID(),
      requestedByEmail: "team@yallapp.test",
      requestedByName: "Team",
      createdAt: NOW,
      expiresAt: new Date(NOW.getTime() + 15 * 60_000),
      closedAt: null,
      closedBy: null,
      resultAppId: null,
      note: null,
    };
    expect(await s.createAppMoveRequest(request)).toBe(true);
    expect(await s.createAppMoveRequest({ ...request, id: randomUUID() })).toBe(false);
    expect(await s.getOpenAppMoveRequest(app.id)).toMatchObject({ id: request.id, moveData: true, moveSubscription: false });
    expect(await s.addAppMoveAttempt(request.id)).toBe(1);
    expect(await s.addAppMoveAttempt(request.id)).toBe(2);
    expect(await s.updateAppMoveRequest(request.id, "waiting", { status: "cancelled", closedAt: NOW, closedBy: "team@yallapp.test" })).toBe(true);
    expect(await s.updateAppMoveRequest(request.id, "waiting", { status: "approved", closedAt: NOW })).toBe(false);
    expect(await s.addAppMoveAttempt(request.id)).toBeNull();
    expect(await s.getOpenAppMoveRequest(app.id)).toBeNull();
    // A new one can wait once the last one is closed.
    expect(await s.createAppMoveRequest({ ...request, id: randomUUID() })).toBe(true);
    expect((await s.listAppMoveRequests({ clientId: b.client.id, limit: 10 })).map((r) => r.status)).toEqual(expect.arrayContaining(["waiting", "cancelled"]));
  });
}
