import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import { newApp } from "@/lib/app/setup";
import { cancelNeedsChoice, cancelRefundCents, readRefundChoice } from "@/lib/catalog/cancel";
import { encryptOwnPayment } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogOrder, type CatalogProductInput, type Client, type HostedUser } from "@/lib/data/types";
import type { OwnerDeps } from "@/lib/owner/http";
import { handleOwner } from "@/lib/owner/service";
import { expectOwnerContract } from "./owner-contract";
import { KEY, NOW, days } from "./helpers";

/**
 * 175 Cancel order on a paid order: the owner chooses every time between
 * cancelling with a refund (through the order's gateway, or Needs a refund
 * when it can't go back by itself) and without one; nothing is refunded
 * without that choice (an older app's cancel keeps 132's rule). The units go
 * back in stock once, the customer is told (a guest by email, in their
 * language), and the order leaves the paid orders and the revenue.
 */

const SECRET = "test-signing-secret-0123456789abcdef0123456789";
const PASSWORD = "a-long-owner-password";

describe("175 cancelling a paid order", () => {
  let store: MemoryStore;
  let client: Client;
  let shop: App;
  let salma: HostedUser;
  let mails: { to: string; subject: string; text: string }[];
  let fetchCalls: string[];

  const deps = (): OwnerDeps => ({
    store,
    now: NOW,
    ip: "198.51.100.7",
    signingSecret: SECRET,
    encryptionKey: KEY,
    baseUrl: "https://yallapp.test",
    paymentUrls: {},
    media: null,
    mail: async () => undefined,
    guestMail: async (_app, to, mail) => {
      mails.push({ to, ...mail });
    },
  });

  async function call(method: string, route: string, options: { params?: Record<string, string | number>; token?: string | null; body?: unknown } = {}) {
    const path = route.replace(/\{(\w+)\}/g, (_, name: string) => String(options.params?.[name] ?? `{${name}}`));
    const result = await handleOwner(deps(), { method, path: path.split("/").filter(Boolean), query: new URLSearchParams(), body: options.body, token: options.token ?? null, acceptLanguage: null });
    expectOwnerContract(method, route, result);
    return result as { status: number; body: Record<string, unknown> & { [key: string]: never } };
  }

  async function signIn() {
    const result = await call("POST", "/auth/sign-in", { body: { email: "karim@kech.test", password: PASSWORD, device: { name: "Pixel 8", platform: "android", app_version: "1.0.3" } } });
    expect(result.status).toBe(200);
    return (result.body as unknown as { access_token: string }).access_token;
  }

  const product = (input: Partial<CatalogProductInput>): CatalogProductInput => ({
    appId: shop.id,
    name: "Atlas Roses",
    description: "",
    priceCents: 450_00,
    salePriceCents: null,
    categoryIds: [],
    imageAssetIds: [],
    stock: null,
    digital: false,
    featured: false,
    active: true,
    sku: null,
    ...input,
  });

  async function paid(patch: Partial<CatalogOrder> & { lines: CatalogOrder["lines"] }): Promise<CatalogOrder> {
    const total = patch.lines.reduce((sum, l) => sum + l.unitCents * l.quantity, 0);
    const order = await store.createCatalogOrder({
      appId: shop.id,
      tokenHash: sha256Hex(`order-${Math.random()}`),
      userId: null,
      status: "pending",
      subtotalCents: total,
      shippingCents: 0,
      totalCents: total,
      currency: "MAD",
      customer: { name: "Yasmine", phone: "+212612345678", email: "yasmine@example.com", city: "Marrakech", address: "Gueliz" },
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      updatedAt: NOW,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
      paymentProvider: "iyzico",
      providerRef: "iyzico-token",
      ...patch,
    } as Omit<CatalogOrder, "id">);
    await store.payCatalogOrder(shop.id, order.id, "PAY-1", NOW);
    return (await store.getCatalogOrder(shop.id, order.id))!;
  }

  beforeEach(async () => {
    store = new MemoryStore();
    mails = [];
    fetchCalls = [];
    const { user, client: c } = await registerClient(store, { name: "Karim Benali", email: "karim@kech.test", whatsapp: "+212612345678", siteUrl: "", password: null }, NOW);
    await store.updateUser(user.id, { passwordHash: await hashPassword(PASSWORD) }, NOW);
    await activateClient(store, { clientId: c.id, plan: "studio_1", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    client = (await store.getClientById(c.id))!;
    const app: App = {
      ...newApp(client.id, null, NOW, "store", null),
      appName: "KechFlora",
      section: "studio",
      backend: "hosted",
      websiteDoneAt: NOW,
      connector: { kind: "catalog" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "MAD" },
    };
    app.catalogSettings = { ...app.catalogSettings!, payment: encryptOwnPayment(app.id, { provider: "iyzico", apiKey: "k", secretKey: "s", sandbox: true }, KEY) };
    await store.createApp(app);
    await activateClient(store, { clientId: client.id, appId: app.id, plan: "studio_1", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    shop = (await store.getAppById(app.id))!;
    salma = (await store.createHostedUser({ appId: shop.id, phone: "+212698765432", name: "Salma", email: null, city: null, now: NOW }))!;
    // iyzico's sandbox, faked: the refund goes through.
    vi.stubGlobal("fetch", (async (url: string) => {
      const path = new URL(url).pathname;
      fetchCalls.push(path);
      if (path === "/payment/detail") return Response.json({ status: "success", paymentId: "PAY-1", paidPrice: "477.70", currency: "MAD", itemTransactions: [{ itemId: "1", paymentTransactionId: "1", price: "477.70", paidPrice: "477.70" }] });
      if (path === "/payment/cancel") return Response.json({ status: "success", paymentId: "PAY-1", price: 477.7, currency: "MAD", hostReference: "CANCEL-REF" });
      return Response.json({ status: "success", paymentId: "PAY-1", paymentTransactionId: "1", price: "477.70", hostReference: "REF-1" });
    }) as unknown as typeof fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the owner's choice, and only a paid order with money left needs one", async () => {
    expect([readRefundChoice("yes"), readRefundChoice(true), readRefundChoice("no"), readRefundChoice(false), readRefundChoice(undefined), readRefundChoice("maybe")]).toEqual([true, true, false, false, null, null]);
    const roses = await store.createCatalogProduct(product({ stock: 3 }), NOW);
    const order = await paid({ lines: [{ productId: roses.id, name: "Atlas Roses", quantity: 1, unitCents: 477_70, imageAssetId: null, digital: false }] });
    expect(cancelRefundCents(order)).toBe(477_70);
    expect(cancelNeedsChoice(order)).toBe(true);
    expect(cancelRefundCents({ ...order, refundedCents: 477_70 })).toBeNull();
    expect(cancelRefundCents({ ...order, paidAt: null })).toBeNull();
    expect(cancelRefundCents({ ...order, status: "completed" })).toBeNull();
  });

  it("Cancel and refund: refunded through the gateway, the stock back, the customer told, out of the revenue", async () => {
    const token = await signIn();
    const roses = await store.createCatalogProduct(
      product({
        stock: 5,
        variants: {
          attributes: [{ name: "Size", values: ["Small", "Large"] }],
          items: [
            { id: 1, values: ["Small"], priceCents: 450_00, salePriceCents: null, stock: 3, sku: null, active: true },
            { id: 2, values: ["Large"], priceCents: 690_00, salePriceCents: 620_00, stock: 1, sku: null, active: true },
          ],
        },
      }),
      NOW,
    );
    const order = await paid({ userId: salma.id, lines: [{ productId: roses.id, variantId: 2, name: "Atlas Roses · Large", quantity: 1, unitCents: 477_70, imageAssetId: null, digital: false }] });
    // Paid: the Large one is sold out.
    expect((await store.getCatalogProduct(shop.id, roses.id))!.variants!.items[1]!.stock).toBe(0);
    expect(await store.sumPaidCatalogOrders(shop.id, new Date(0), days(1))).toEqual({ count: 1, totals: [{ currency: "MAD", cents: 477_70 }] });

    const got = await call("GET", "/apps/{app_id}/orders/{order_id}", { token, params: { app_id: shop.id, order_id: order.id } });
    expect(got.body.cancel_refund).toEqual({ amount: { amount_cents: 477_70, currency: "MAD", formatted: expect.stringContaining("477.70") } });

    const done = await call("POST", "/apps/{app_id}/orders/{order_id}/status", { token, params: { app_id: shop.id, order_id: order.id }, body: { status: "cancelled", refund: true } });
    expect(done.status).toBe(200);
    expect(done.body.status).toBe("cancelled");
    expect(done.body.cancel_refund).toBeNull();
    expect(done.body.refund_due).toMatchObject({ status: "refunded" });
    expect(fetchCalls.length).toBeGreaterThan(0);
    const after = (await store.getCatalogOrder(shop.id, order.id))!;
    expect(after.refundedCents).toBe(477_70);
    // The units back: the product's and the size's.
    const back = (await store.getCatalogProduct(shop.id, roses.id))!;
    expect(back.stock).toBe(5);
    expect(back.variants!.items[1]!.stock).toBe(1);
    // Signed in: told in the app (cancelled, then the refund).
    const inbox = (await store.listHostedNotifications({ appId: shop.id, userId: salma.id, since: new Date(0), page: 1, perPage: 20 })).items.map((n) => n.body);
    expect(inbox).toEqual(expect.arrayContaining(["Your order was cancelled."]));
    expect(inbox.some((b) => b.startsWith("We refunded"))).toBe(true);
    expect(mails).toEqual([]);
    // Out of the paid orders' revenue.
    expect((await store.sumPaidCatalogOrders(shop.id, new Date(0), days(1))).count).toBe(0);
    // Once: cancelling again is refused, and the stock isn't given back twice.
    const again = await call("POST", "/apps/{app_id}/orders/{order_id}/status", { token, params: { app_id: shop.id, order_id: order.id }, body: { status: "cancelled", refund: true } });
    expect(again.status).toBe(409);
    expect((await store.getCatalogProduct(shop.id, roses.id))!.stock).toBe(5);
  });

  it("Cancel without refund: nothing refunded, even after a failed delivery; the stock still back", async () => {
    const token = await signIn();
    const roses = await store.createCatalogProduct(product({ stock: 3 }), NOW);
    const order = await paid({ userId: salma.id, lines: [{ productId: roses.id, name: "Atlas Roses", quantity: 2, unitCents: 450_00, imageAssetId: null, digital: false }] });
    await store.updateCatalogOrder(shop.id, order.id, { deliveryStage: "failed" });
    expect((await store.getCatalogProduct(shop.id, roses.id))!.stock).toBe(1);
    const done = await call("POST", "/apps/{app_id}/orders/{order_id}/status", { token, params: { app_id: shop.id, order_id: order.id }, body: { status: "cancelled", refund: false } });
    expect(done.status).toBe(200);
    expect(done.body.refund_due).toBeNull();
    expect(fetchCalls).toEqual([]);
    const after = (await store.getCatalogOrder(shop.id, order.id))!;
    expect(after.refundedCents ?? 0).toBe(0);
    expect(after.stageRefund ?? null).toBeNull();
    expect((await store.getCatalogProduct(shop.id, roses.id))!.stock).toBe(3);
  });

  it("an older app's cancel (no choice) keeps 132: refunded only after a failed or returned delivery", async () => {
    const token = await signIn();
    const plain = await paid({ userId: salma.id, lines: [{ productId: 999, name: "Card", quantity: 1, unitCents: 100_00, imageAssetId: null, digital: false }] });
    const kept = await call("POST", "/apps/{app_id}/orders/{order_id}/status", { token, params: { app_id: shop.id, order_id: plain.id }, body: { status: "cancelled" } });
    expect(kept.status).toBe(200);
    expect(kept.body.refund_due).toBeNull();
    expect(fetchCalls).toEqual([]);
    const failed = await paid({ userId: salma.id, lines: [{ productId: 999, name: "Card", quantity: 1, unitCents: 100_00, imageAssetId: null, digital: false }] });
    await store.updateCatalogOrder(shop.id, failed.id, { deliveryStage: "returned" });
    const refunded = await call("POST", "/apps/{app_id}/orders/{order_id}/status", { token, params: { app_id: shop.id, order_id: failed.id }, body: { status: "cancelled" } });
    expect(refunded.body.refund_due).toMatchObject({ status: "refunded" });
    // A choice that isn't true or false is refused.
    const third = await paid({ lines: [{ productId: 999, name: "Card", quantity: 1, unitCents: 100_00, imageAssetId: null, digital: false }] });
    expect((await call("POST", "/apps/{app_id}/orders/{order_id}/status", { token, params: { app_id: shop.id, order_id: third.id }, body: { status: "cancelled", refund: "maybe" } })).status).toBe(400);
  });

  it("a payment that can't go back by itself: the order needs the owner's refund", async () => {
    const token = await signIn();
    const order = await paid({ lines: [{ productId: 999, name: "Card", quantity: 1, unitCents: 100_00, imageAssetId: null, digital: false }], paymentProvider: "iyzico", manualPayment: null });
    // The shop's keys are gone: no refund through the gateway.
    await store.updateApp(shop.id, { catalogSettings: { ...shop.catalogSettings!, payment: null } }, NOW);
    const done = await call("POST", "/apps/{app_id}/orders/{order_id}/status", { token, params: { app_id: shop.id, order_id: order.id }, body: { status: "cancelled", refund: true } });
    expect(done.status).toBe(200);
    expect(done.body.refund_due).toMatchObject({ status: "needed" });
    const notices = await store.listOwnerNotices({ clientId: client.id });
    expect(notices.some((n) => n.kind === "order_refund_due" && n.body.startsWith(`Order ${order.id}`))).toBe(true);
  });

  it("a guest is told by email, in the language they checked out in", async () => {
    const token = await signIn();
    const order = await paid({ lang: "ar", lines: [{ productId: 999, name: "Card", quantity: 1, unitCents: 100_00, imageAssetId: null, digital: false }] });
    await call("POST", "/apps/{app_id}/orders/{order_id}/status", { token, params: { app_id: shop.id, order_id: order.id }, body: { status: "cancelled", refund: false } });
    expect(mails).toHaveLength(1);
    expect(mails[0]!.to).toBe("yasmine@example.com");
    expect(mails[0]!.subject).toContain("KechFlora");
    expect(mails[0]!.text).toContain("تم إلغاء طلبك.");
    expect(mails[0]!.text).toContain("مرحبًا Yasmine");
    const english = await paid({ lines: [{ productId: 999, name: "Card", quantity: 1, unitCents: 100_00, imageAssetId: null, digital: false }] });
    await call("POST", "/apps/{app_id}/orders/{order_id}/status", { token, params: { app_id: shop.id, order_id: english.id }, body: { status: "cancelled", refund: false } });
    expect(mails[1]!.text).toContain("Your order was cancelled.");
  });

  it("175.14 postponing to a time that's full or closed that day is refused, as the app's slots say", async () => {
    const token = await signIn();
    const stage = (order: CatalogOrder, body: unknown) => call("POST", "/apps/{app_id}/orders/{order_id}/stage", { token, params: { app_id: shop.id, order_id: order.id }, body });
    const card = [{ productId: 999, name: "Card", quantity: 1, unitCents: 100_00, imageAssetId: null, digital: false }];
    const day = "2026-10-14";
    const settings = shop.catalogSettings!;
    await store.updateApp(
      shop.id,
      { catalogSettings: { ...settings, delivery: { enabled: true, required: true, sameDay: true, cutoff: "14:00", nextDay: true, maxDays: 14, closedWeekdays: [], timezone: "Europe/Istanbul", slots: [{ id: "s1", start: "10:00", end: "13:00", capacity: 1, feeCents: null }, { id: "s2", start: "13:00", end: "16:00", capacity: null, feeCents: null }], closedSlots: [{ date: day, slotId: "s2" }] } as never } },
      NOW,
    );
    // One order already takes s1 on that day.
    await paid({ lines: card, delivery: { date: day, slot: { id: "s1", start: "10:00", end: "13:00" }, feeCents: 0, sender: null, recipient: null, message: null, anonymous: false }, deliveryDate: day });
    const order = await paid({ lines: card });
    const full = await stage(order, { stage: "postponed", reason: "weather", date: day, slot_id: "s1" });
    expect(full.status).toBe(400);
    expect((full.body.errors as unknown as Record<string, string>).slot_id).toBe("That delivery time is full that day. Please choose another.");
    const closed = await stage(order, { stage: "postponed", reason: "weather", date: day, slot_id: "s2" });
    expect((closed.body.errors as unknown as Record<string, string>).slot_id).toBe("The shop doesn't deliver at that time that day. Please choose another.");
    // Another day's s1 is free.
    expect((await stage(order, { stage: "postponed", reason: "weather", date: "2026-10-15", slot_id: "s1" })).status).toBe(200);
  });

  it("175.4 a guest hears of every stage the drawer promises, by email, in their language", async () => {
    const token = await signIn();
    const stage = (order: CatalogOrder, body: unknown) => call("POST", "/apps/{app_id}/orders/{order_id}/stage", { token, params: { app_id: shop.id, order_id: order.id }, body });
    const card = [{ productId: 999, name: "Card", quantity: 1, unitCents: 100_00, imageAssetId: null, digital: false }];
    const order = await paid({ lines: card, lang: "tr" });
    expect((await stage(order, { stage: "shipped", courier_name: "Hamid", tracking_url: "https://track.example.com/k1" })).status).toBe(200);
    expect((await stage(order, { stage: "postponed", reason: "weather", date: "2026-10-13", slot_id: "s2" })).status).toBe(200);
    expect((await stage(order, { stage: "shipped" })).status).toBe(200);
    expect((await stage(order, { stage: "failed", reason: "unreachable", next_step: "retry", date: "2026-10-14", slot_id: "s2" })).status).toBe(200);
    expect((await stage(order, { stage: "shipped" })).status).toBe(200);
    expect((await stage(order, { stage: "delivered" })).status).toBe(200);
    expect(mails.map((m) => m.to)).toEqual(Array(6).fill("yasmine@example.com"));
    const bodies = mails.map((m) => m.text.split("\n\n")[1]);
    expect(bodies[0]).toBe("Siparişiniz yolda: https://track.example.com/k1.");
    expect(bodies[1]).toMatch(/^Teslimatınız .+ tarihine ertelendi \(hava koşulları nedeniyle\)\.$/);
    expect(bodies[2]).toBe("Siparişiniz yolda.");
    expect(bodies[3]).toMatch(/^Siparişiniz teslim edilemedi: telefona kimse cevap vermedi\. .+ tarihinde tekrar deneyeceğiz\.$/);
    expect(bodies[5]).toBe("Siparişiniz teslim edildi. Teşekkürler!");
    expect(mails[0]!.text.startsWith("Sayın Yasmine,")).toBe(true);
    // Never the "tap" of a phone, never the team's note.
    expect(mails.some((m) => /dokunun|Tap/.test(m.text))).toBe(false);

    // In Arabic (Modern Standard Arabic), and English by default.
    mails = [];
    const ar = await paid({ lines: card, lang: "ar" });
    await stage(ar, { stage: "shipped" });
    expect(mails[0]!.text).toContain("طلبك في الطريق.");
    const en = await paid({ lines: card, lang: null });
    await stage(en, { stage: "shipped" });
    expect(mails[1]!.text).toContain("Your order is on its way.");

    // The owner turned order updates off: a guest isn't emailed either; a signed-in customer isn't emailed at all.
    await store.updateApp(shop.id, { hostedSettings: { ...(shop.hostedSettings ?? {}), autoNotifications: { order_update: false } } } as Partial<App>, NOW);
    mails = [];
    const off = await paid({ lines: card });
    await stage(off, { stage: "shipped" });
    const signedIn = await paid({ lines: card, userId: salma.id });
    await store.updateApp(shop.id, { hostedSettings: { ...(shop.hostedSettings ?? {}) } } as Partial<App>, NOW);
    await stage(signedIn, { stage: "shipped" });
    expect(mails).toEqual([]);
  });
});
