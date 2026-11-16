import { beforeEach, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { hashPassword } from "@/lib/auth/password";
import { newApp } from "@/lib/app/setup";
import { DEFAULT_FULFILMENT } from "@/lib/catalog/fulfilment";
import { STAGE_NEXT, followsStages, parseStageInput } from "@/lib/catalog/order-stages";
import { appStageJson } from "@/lib/catalog/stage-json";
import { refundAfterFailedDelivery } from "@/lib/catalog/stage-refunds";
import { encryptOwnPayment } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import { MemoryStore } from "@/lib/data/memory";
import { AUTO_TEXT } from "@/lib/hosted/auto-notifications";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogOrder, type Client, type HostedUser } from "@/lib/data/types";
import type { OwnerDeps } from "@/lib/owner/http";
import { handleOwner } from "@/lib/owner/service";
import type { Plan } from "@/lib/plans";
import { expectOwnerContract } from "./owner-contract";
import { KEY, NOW, days } from "./helpers";

/**
 * 132 A store order's delivery stages from Yallapp Business (the Owner
 * API): shipped with the courier and a tracking link, postponed to another
 * day and slot with why, a failed attempt with why and what's next,
 * returned to the shop, delivered (the order completed). Each change kept
 * with who made it and the team's note; the customer told in the app's
 * language with the short reason and never the note; a stage the order
 * can't move to refused; another owner's order not found. Each answer
 * checked against docs/api/owner.yaml.
 */

const SECRET = "test-signing-secret-0123456789abcdef0123456789";
const PASSWORD = "a-long-owner-password";
// NOW is Monday 2026-10-12T10:00Z: 13:00 in Istanbul.
const TODAY = "2026-10-12";
const TOMORROW = "2026-10-13";

describe("132 delivery stages", () => {
  let store: MemoryStore;
  let client: Client;
  let flowers: App;
  let cafe: App;
  let theirs: App;
  let salma: HostedUser;

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
  });

  async function call(method: string, route: string, options: { params?: Record<string, string | number>; token?: string | null; body?: unknown; query?: Record<string, string>; lang?: string } = {}) {
    const path = route.replace(/\{(\w+)\}/g, (_, name: string) => String(options.params?.[name] ?? `{${name}}`));
    const result = await handleOwner(deps(), {
      method,
      path: path.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
      acceptLanguage: options.lang ?? null,
    });
    expectOwnerContract(method, route, result);
    return result as { status: number; body: Record<string, unknown> & { [key: string]: never } };
  }

  async function owner(email: string) {
    const { user, client } = await registerClient(store, { name: "Leyla Kaya", email, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    await store.updateUser(user.id, { passwordHash: await hashPassword(PASSWORD) }, NOW);
    await activateClient(store, { clientId: client.id, plan: "studio_1", activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    return (await store.getClientById(client.id))!;
  }

  async function addApp(c: Client, app: Partial<App> & Pick<App, "appType">, plan: Plan): Promise<App> {
    const full: App = { ...newApp(c.id, null, NOW, app.appType, app.vertical ?? null), backend: "hosted", websiteDoneAt: NOW, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS }, ...app };
    await store.createApp(full);
    await activateClient(store, { clientId: c.id, appId: full.id, plan, activeUntil: days(30), paymentNote: "" }, KEY, NOW);
    return full;
  }

  async function paid(app: App, patch: Partial<CatalogOrder> = {}): Promise<CatalogOrder> {
    const order = await store.createCatalogOrder({
      appId: app.id,
      tokenHash: sha256Hex(`order-${Math.random()}`),
      userId: null,
      status: "pending",
      lines: [{ productId: 1, name: "Blush Garden", quantity: 1, unitCents: 1800_00, imageAssetId: null, digital: false }],
      subtotalCents: 1800_00,
      shippingCents: 0,
      totalCents: 1800_00,
      currency: "EGP",
      customer: { name: "Omar Nabil", phone: "+201001234567", email: "omar@example.com", city: "Cairo", address: "Zamalek" },
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      updatedAt: NOW,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
      ...patch,
    } as Omit<CatalogOrder, "id">);
    await store.payCatalogOrder(app.id, order.id, "demo", NOW);
    return (await store.getCatalogOrder(app.id, order.id))!;
  }

  async function signIn(email = "leyla@studio.test") {
    const result = await call("POST", "/auth/sign-in", { body: { email, password: PASSWORD, device: { name: "Pixel 8", platform: "android", app_version: "1.0.3" } } });
    expect(result.status).toBe(200);
    return (result.body as unknown as { access_token: string }).access_token;
  }

  const inbox = async () => (await store.listHostedNotifications({ appId: flowers.id, userId: salma.id, since: new Date(0), page: 1, perPage: 20 })).items;

  beforeEach(async () => {
    store = new MemoryStore();
    client = await owner("leyla@studio.test");
    flowers = await addApp(client, { appType: "store", appName: "Leqaa", section: "studio", connector: { kind: "catalog" } }, "studio_1");
    cafe = await addApp(client, { appType: "store", vertical: "restaurant", appName: "Moda Café", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, fulfilment: DEFAULT_FULFILMENT } }, "business");
    theirs = await addApp(await owner("other@studio.test"), { appType: "store", appName: "Not yours", connector: { kind: "catalog" } }, "studio_1");
    salma = (await store.createHostedUser({ appId: flowers.id, phone: "+201007654321", name: "Omar Nabil", email: null, city: null, now: NOW }))!;
  });

  it("an order in progress offers its first stages; a restaurant's and another owner's don't", async () => {
    const token = await signIn();
    const order = await paid(flowers, { userId: salma.id });
    const got = await call("GET", "/apps/{app_id}/orders/{order_id}", { token, params: { app_id: flowers.id, order_id: order.id } });
    expect(got.status).toBe(200);
    expect(got.body.stage).toBeNull();
    expect(got.body.stage_history).toEqual([]);
    expect(got.body.next_stages).toEqual(["preparing", "shipped", "postponed", "delivered"]);
    // A café's order moves with its kitchen.
    const kitchen = await paid(cafe, { fulfilment: { type: "pickup", scheduledFor: null, address: null } as CatalogOrder["fulfilment"], fulfilmentStatus: "received" });
    expect((await call("GET", "/apps/{app_id}/orders/{order_id}", { token, params: { app_id: cafe.id, order_id: kitchen.id } })).body.next_stages).toEqual([]);
    const refused = await call("POST", "/apps/{app_id}/orders/{order_id}/stage", { token, params: { app_id: cafe.id, order_id: kitchen.id }, body: { stage: "shipped" } });
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe("invalid_stage");
    // Another owner's order isn't there for this owner.
    const other = await paid(theirs);
    expect((await call("POST", "/apps/{app_id}/orders/{order_id}/stage", { token, params: { app_id: flowers.id, order_id: other.id }, body: { stage: "shipped" } })).status).toBe(404);
    expect((await call("POST", "/apps/{app_id}/orders/{order_id}/stage", { token, params: { app_id: theirs.id, order_id: other.id }, body: { stage: "shipped" } })).status).toBe(404);
    // A digital order isn't delivered.
    expect(followsStages(flowers, { fulfilment: null, lines: [{ productId: 2, name: "E-card", quantity: 1, unitCents: 1, imageAssetId: null, digital: true }] })).toBe(false);
  });

  it("shipped with the courier, then delivered: the order completed and the customer told", async () => {
    const token = await signIn();
    const order = await paid(flowers, { userId: salma.id });
    const shipped = await call("POST", "/apps/{app_id}/orders/{order_id}/stage", {
      token,
      params: { app_id: flowers.id, order_id: order.id },
      body: { stage: "shipped", courier_name: "Ali", courier_phone: "+20 100 555 1234", tracking_url: "https://track.example.com/a1" },
    });
    expect(shipped.status).toBe(200);
    const stage = shipped.body.stage as unknown as Record<string, unknown>;
    expect(stage).toMatchObject({ stage: "shipped", label: "Out for delivery", by: "Leyla Kaya", courier: { name: "Ali", phone: "+20 100 555 1234" }, tracking_url: "https://track.example.com/a1" });
    expect(shipped.body.next_stages).toEqual(["delivered", "postponed", "failed"]);
    expect((await inbox()).map((n) => n.body)).toEqual(["Your order is on its way. Tap to follow it."]);
    // Delivered completes it, told once as delivered.
    const done = await call("POST", "/apps/{app_id}/orders/{order_id}/stage", { token, params: { app_id: flowers.id, order_id: order.id }, body: { stage: "delivered" } });
    expect(done.status).toBe(200);
    expect(done.body.status).toBe("completed");
    expect(done.body.next_stages).toEqual([]);
    expect((done.body.stage_history as unknown as { stage: string }[]).map((e) => e.stage)).toEqual(["delivered", "shipped"]);
    expect((await inbox()).map((n) => n.body).sort()).toEqual(["Your order is on its way. Tap to follow it.", "Your order was delivered. Thank you!"]);
    // Delivered can't go back to shipped.
    const back = await call("POST", "/apps/{app_id}/orders/{order_id}/stage", { token, params: { app_id: flowers.id, order_id: order.id }, body: { stage: "shipped" } });
    expect(back.status).toBe(409);
    expect(back.body.code).toBe("invalid_stage");
  });

  it("postponed: why, the new day and slot, the team's note kept from the customer", async () => {
    const token = await signIn();
    const order = await paid(flowers, { userId: salma.id, delivery: { date: TODAY, slot: { id: "s3", start: "16:00", end: "20:00" }, feeCents: 0, sender: null, recipient: { name: "Salma Nabil", phone: "+201001112222", address: "14 Brazil St" }, message: null, anonymous: false }, deliveryDate: TODAY });
    const route = { token, params: { app_id: flowers.id, order_id: order.id } };
    // Why, and the day, are needed; "other" needs the note.
    const missing = await call("POST", "/apps/{app_id}/orders/{order_id}/stage", { ...route, body: { stage: "postponed" } });
    expect(missing.status).toBe(400);
    expect(Object.keys((missing.body.errors as unknown as Record<string, string>)).sort()).toEqual(["date", "reason"]);
    const other = await call("POST", "/apps/{app_id}/orders/{order_id}/stage", { ...route, body: { stage: "postponed", reason: "other", date: TOMORROW, slot_id: "s1" } });
    expect((other.body.errors as unknown as Record<string, string>).note).toBe("Write the reason in the note.");
    const past = await call("POST", "/apps/{app_id}/orders/{order_id}/stage", { ...route, body: { stage: "postponed", reason: "weather", date: "2026-10-11", slot_id: "s1" } });
    expect((past.body.errors as unknown as Record<string, string>).date).toBe("Choose today or a later day.");
    // Today's 10:00 slot has started at 13:00.
    const started = await call("POST", "/apps/{app_id}/orders/{order_id}/stage", { ...route, body: { stage: "postponed", reason: "weather", date: TODAY, slot_id: "s1" } });
    expect((started.body.errors as unknown as Record<string, string>).slot_id).toBeTruthy();
    const moved = await call("POST", "/apps/{app_id}/orders/{order_id}/stage", {
      ...route,
      body: { stage: "postponed", reason: "recipient_away", note: "Salma travels until Monday; her doorman 0100 999", date: TOMORROW, slot_id: "s1" },
    });
    expect(moved.status).toBe(200);
    expect(moved.body.stage).toMatchObject({ stage: "postponed", reason: { code: "recipient_away", label: "Recipient not available" }, note: "Salma travels until Monday; her doorman 0100 999", date: TOMORROW, slot: { id: "s1", label: "10:00–13:00" } });
    expect(moved.body.delivery).toMatchObject({ date: TOMORROW, slot: { id: "s1" } });
    const saved = (await store.getCatalogOrder(flowers.id, order.id))!;
    expect(saved.deliveryDate).toBe(TOMORROW);
    expect(saved.stageLog?.[0]?.by).toEqual({ userId: expect.any(String), name: "Leyla Kaya", via: "business" });
    // The customer reads the day and the short reason, never the note.
    const [told] = await inbox();
    expect(told!.body).toBe("Your delivery moved to Tue 13 Oct, 10:00–13:00 (the recipient isn't available).");
    const forCustomer = appStageJson(saved, "en")!;
    expect(forCustomer).toEqual({
      code: "postponed",
      label: "Delivery postponed",
      at: NOW.toISOString(),
      reason: "The recipient isn't available",
      date: TOMORROW,
      slot: { id: "s1", start: "10:00", end: "13:00", label: "10:00–13:00" },
      next_step: null,
      courier: null,
      tracking_url: null,
    });
    expect(JSON.stringify(appStageJson(saved, "ar"))).not.toContain("doorman");
    expect(appStageJson(saved, "ar")!.label).toBe("تم تأجيل التوصيل");
  });

  it("a failed attempt: why and what's next; tried again, returned or cancelled", async () => {
    const token = await signIn();
    const stage = (order: CatalogOrder, body: unknown) => call("POST", "/apps/{app_id}/orders/{order_id}/stage", { token, params: { app_id: flowers.id, order_id: order.id }, body });
    // Not out for delivery yet: it can't fail.
    const early = await paid(flowers, { userId: salma.id });
    expect((await stage(early, { stage: "failed", reason: "refused", next_step: "return" })).status).toBe(409);
    expect((await stage(early, { stage: "returned" })).status).toBe(409);

    const retry = await paid(flowers, { userId: salma.id });
    await stage(retry, { stage: "shipped" });
    const noDay = await stage(retry, { stage: "failed", reason: "unreachable", next_step: "retry" });
    expect((noDay.body.errors as unknown as Record<string, string>).date).toBe("Choose the new delivery day.");
    const again = await stage(retry, { stage: "failed", reason: "unreachable", next_step: "retry", date: TOMORROW, slot_id: "s2" });
    expect(again.status).toBe(200);
    expect(again.body.stage).toMatchObject({ stage: "failed", next_step: { code: "retry", label: "Try again on another day" }, date: TOMORROW });
    expect(again.body.next_stages).toEqual(["shipped", "postponed", "returned"]);
    expect((await inbox()).map((n) => n.body)).toContain("We couldn't deliver your order: no one answered the phone. We'll try again on Tue 13 Oct, 13:00–16:00.");

    const back = await paid(flowers, { userId: salma.id });
    await stage(back, { stage: "shipped" });
    expect((await stage(back, { stage: "failed", reason: "wrong_address", next_step: "return" })).status).toBe(200);
    const returned = await stage(back, { stage: "returned", note: "On the shelf by the door" });
    expect(returned.body.stage).toMatchObject({ stage: "returned", note: "On the shelf by the door" });
    expect(returned.body.status).toBe("processing");

    const cancel = await paid(flowers, { userId: salma.id });
    await stage(cancel, { stage: "shipped" });
    const cancelled = await stage(cancel, { stage: "failed", reason: "refused", next_step: "cancel" });
    expect(cancelled.body.status).toBe("cancelled");
    expect(cancelled.body.next_stages).toEqual([]);
    // Told once, as the failed attempt (not "Your order was cancelled." too).
    const bodies = (await inbox()).map((n) => n.body);
    expect(bodies).toContain("We couldn't deliver your order: it was refused at the door. The order was cancelled.");
    expect(bodies).not.toContain("Your order was cancelled.");
    // 132 The owner's rule: the money goes back; this payment can't by itself, so the owner refunds it.
    expect(cancelled.body.refund_due).toMatchObject({ status: "needed", amount: { amount_cents: 1800_00 }, done_at: null });
  });

  it("a cancel after a failed delivery gives the money back: needed for the owner, then I refunded it", async () => {
    const token = await signIn();
    const order = await paid(flowers, { userId: salma.id, manualPayment: { method: "bank_transfer", name: "Bank transfer", instructions: "IBAN TR00", dueAt: "2026-10-14T10:00:00.000Z" } } as Partial<CatalogOrder>);
    await store.updateCatalogOrder(flowers.id, order.id, { status: "processing" });
    const route = { token, params: { app_id: flowers.id, order_id: order.id } };
    await call("POST", "/apps/{app_id}/orders/{order_id}/stage", { ...route, body: { stage: "shipped" } });
    await call("POST", "/apps/{app_id}/orders/{order_id}/stage", { ...route, body: { stage: "failed", reason: "refused", next_step: "return" } });
    await call("POST", "/apps/{app_id}/orders/{order_id}/stage", { ...route, body: { stage: "returned" } });
    // Nothing owed before it is cancelled.
    expect((await call("POST", "/apps/{app_id}/orders/{order_id}/refund-done", route)).status).toBe(409);
    // Cancel order after it came back: paid by bank transfer, so the owner pays it back.
    const cancelled = await call("POST", "/apps/{app_id}/orders/{order_id}/status", { ...route, body: { status: "cancelled" } });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.refund_due).toMatchObject({ status: "needed", why: "Paid outside the app: pay it back the same way, then mark it refunded." });
    const [notice] = await store.listOwnerNotices({ clientId: client.id, appId: flowers.id });
    expect(notice).toMatchObject({ kind: "order_refund_due", title: `Leqaa: refund order ${order.id + 1000}`, tone: "warn" });
    // I refunded it: recorded as a refund made outside, and the customer told.
    const done = await call("POST", "/apps/{app_id}/orders/{order_id}/refund-done", route);
    expect(done.status).toBe(200);
    expect(done.body.refund_due).toMatchObject({ status: "recorded", done_by: "Leyla Kaya" });
    expect(done.body.status).toBe("refunded");
    expect((await inbox()).map((n) => n.body)).toContain("We refunded E£1,800.00. It may take a few days to reach you.");
    expect((await call("POST", "/apps/{app_id}/orders/{order_id}/refund-done", route)).status).toBe(409);
  });

  it("a card payment the provider can refund goes back at once", async () => {
    const calls: string[] = [];
    const fetcher = (async (url: string) => {
      const path = new URL(url).pathname;
      calls.push(path);
      if (path === "/payment/cancel") return Response.json({ status: "success", paymentId: "PAY-1", price: 1800, currency: "EGP", hostReference: "CANCEL-REF" });
      if (path === "/payment/detail") return Response.json({ status: "success", paymentId: "PAY-1", paidPrice: "1800.00", currency: "EGP", itemTransactions: [{ itemId: "1", paymentTransactionId: "1", price: "1800.00", paidPrice: "1800.00" }] });
      return Response.json({ status: "success", paymentId: "PAY-1", paymentTransactionId: "1", price: "1800.00", hostReference: "REF-1" });
    }) as unknown as typeof fetch;
    const shop: App = { ...flowers, catalogSettings: { ...flowers.catalogSettings!, payment: encryptOwnPayment(flowers.id, { provider: "iyzico", apiKey: "k", secretKey: "s", sandbox: true }, KEY) } };
    await store.updateApp(shop.id, { catalogSettings: shop.catalogSettings }, NOW);
    const order = await paid(shop, { userId: salma.id, paymentProvider: "iyzico", providerRef: "iyzico-token" });
    const failed = { ...order, status: "cancelled" as const, deliveryStage: "failed" as const };
    await store.updateCatalogOrder(shop.id, order.id, { status: "cancelled", deliveryStage: "failed" });
    const kept = await refundAfterFailedDelivery(
      { store, key: KEY, fetcher, now: NOW, ip: "198.51.100.7", actor: { id: "u1", email: "leyla@studio.test" }, mail: async () => undefined, app: (await store.getAppById(shop.id))!, account: null },
      failed,
    );
    expect(kept).toMatchObject({ status: "refunded", cents: 1800_00 });
    expect(calls.length).toBeGreaterThan(0);
    const after = (await store.getCatalogOrder(shop.id, order.id))!;
    expect(after.refundedCents).toBe(1800_00);
    expect(after.stageRefund?.refundId).toEqual(expect.any(Number));
    expect((await inbox()).map((n) => n.body)).toContain("We refunded E£1,800.00. It may take a few days to reach you.");
    // Owed once: nothing more on a second cancel.
    expect(await refundAfterFailedDelivery({ store, key: KEY, fetcher, now: NOW, ip: "x", actor: { id: null, email: "x" }, mail: async () => undefined, app: shop, account: null }, after)).toBeNull();
  });

  it("the slots of a day to postpone to", async () => {
    const token = await signIn();
    await paid(flowers, { delivery: { date: TOMORROW, slot: { id: "s2", start: "13:00", end: "16:00" }, feeCents: 0, sender: null, recipient: null, message: null, anonymous: false }, deliveryDate: TOMORROW });
    const day = await call("GET", "/apps/{app_id}/delivery-slots", { token, params: { app_id: flowers.id }, query: { date: TOMORROW } });
    expect(day.status).toBe(200);
    expect(day.body.date).toBe(TOMORROW);
    expect((day.body.slots as unknown as { id: string; orders: number; started: boolean }[]).map((s) => [s.id, s.orders, s.started])).toEqual([
      ["s1", 0, false],
      ["s2", 1, false],
      ["s3", 0, false],
    ]);
    const today = await call("GET", "/apps/{app_id}/delivery-slots", { token, params: { app_id: flowers.id } });
    expect((today.body.slots as unknown as { started: boolean }[]).map((s) => s.started)).toEqual([true, true, false]);
    expect((await call("GET", "/apps/{app_id}/delivery-slots", { token, params: { app_id: flowers.id }, query: { date: "tomorrow" } })).status).toBe(400);
  });

  it("the stages' rules and the customer's words in Arabic and Turkish", () => {
    expect(STAGE_NEXT.delivered).toEqual([]);
    expect(STAGE_NEXT.shipped).not.toContain("preparing");
    expect(parseStageInput({ stage: "teleported" })).toEqual({ ok: false, errors: { stage: "Choose a delivery stage." } });
    const bad = parseStageInput({ stage: "shipped", tracking_url: "track me", courier_phone: "call Ali" });
    expect(bad.ok ? {} : bad.errors).toEqual({ tracking_url: "Enter the tracking link starting with https://.", courier_phone: "Enter the courier's phone number." });
    const v = { number: "2051", status: "postponed", reason: "weather", date: TOMORROW, slot: "10:00–13:00", next: "", tracking: "" };
    expect(AUTO_TEXT.order_update.ar(v).body).toBe("تم تأجيل توصيل طلبك إلى الثلاثاء، ١٣ أكتوبر، 10:00–13:00 بسبب الطقس.");
    expect(AUTO_TEXT.order_update.tr(v).body).toBe("Teslimatınız 13 Eki Sal, 10:00–13:00 tarihine ertelendi (hava koşulları nedeniyle).");
    expect(AUTO_TEXT.order_update.en({ ...v, status: "delivered" }).body).toBe("Your order was delivered. Thank you!");
  });
});
