import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newApp } from "@/lib/app/setup";
import { checkoutAccount, encryptOwnPayment } from "@/lib/catalog/settings";
import { startPayment } from "@/lib/catalog/payment";
import { sha256Hex } from "@/lib/crypto/tokens";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type CatalogOrder, type PendingPayment } from "@/lib/data/types";
import { RETRY_MINUTES, resendWebhook, sendAccountDeleted, type WebhookDeps } from "@/lib/hosted/api-webhooks";
import { checkPendingPayments, triggerFor, type Settlers } from "@/lib/payments/pending";
import { callbackUrls } from "@/lib/payments/routes";
import { fakeKashier } from "./fake-providers";
import { KEY, NOW, setupClient } from "./helpers";
import { pendingPaymentsStoreSuite } from "./pending-payments-store-suite";

const MINUTE = 60_000;
const after = (minutes: number) => new Date(NOW.getTime() + minutes * MINUTE);

/** 80.3 Retries: a failed account deletion notice sent again; payments left pending asked about at their provider. */

describe("80.3 Send again", () => {
  let store: MemoryStore;
  let app: App;
  let clock: Date;
  const answers = (status: number) => vi.fn(async () => new Response(null, { status })) as unknown as typeof fetch;
  const deps = (fetcher: typeof fetch): WebhookDeps => ({ store, encryptionKey: KEY, platformUrl: "https://yallapp.test", now: () => clock, fetcher, resolve: async () => ["203.0.113.10"] });

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = {
      ...newApp(client.id, null, NOW, "lms"),
      backend: "custom_api",
      apiBaseUrl: "https://api.academy.test/v1",
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, signInBy: "yallapp" },
    };
    await store.createApp(app);
    clock = NOW;
  });

  it("starts a failed notice over with a try now, and only a failed one of the app's own", async () => {
    // 404: the API didn't take notices then; failed at once.
    const failed = (await sendAccountDeleted(deps(answers(404)), app, "42"))!;
    expect(failed).toMatchObject({ status: "failed", attempts: 1 });

    clock = after(60);
    // Another app's notice, or one that isn't failed: nothing.
    expect(await resendWebhook(deps(answers(204)), "another-app", failed.id)).toBeNull();
    const delivered = await resendWebhook(deps(answers(204)), app.id, failed.id);
    expect(delivered).toMatchObject({ status: "delivered", attempts: 1, deliveredAt: clock, lastStatus: 204, lastError: null });
    expect(await store.getApiWebhook(failed.id)).toMatchObject({ status: "delivered", attempts: 1 });
    expect(await resendWebhook(deps(answers(204)), app.id, failed.id)).toBeNull();
  });

  it("goes on with the usual tries when the API is still down", async () => {
    const failed = (await sendAccountDeleted(deps(answers(410)), app, "7"))!;
    clock = after(5);
    const again = await resendWebhook(deps(answers(503)), app.id, failed.id);
    expect(again).toMatchObject({ status: "pending", attempts: 1, lastStatus: 503, nextAttemptAt: after(5 + RETRY_MINUTES[0]) });
  });
});

describe("80.3 payments left pending", () => {
  const order = (id: number, provider: "iyzico" | "kashier" | "fawaterk", startedMinutesAgo: number, now: Date): CatalogOrder => ({
    id,
    appId: "app-1",
    tokenHash: `hash-${id}`,
    userId: null,
    status: "pending",
    lines: [],
    subtotalCents: 1000,
    shippingCents: 0,
    totalCents: 1000,
    currency: "TRY",
    customer: null,
    paymentId: null,
    createdAt: new Date(now.getTime() - startedMinutesAgo * MINUTE),
    paidAt: null,
    updatedAt: now,
    commissionCents: null,
    itemTransactionIds: null,
    payoutApprovedAt: null,
    paymentProvider: provider,
    providerRef: `ref-${id}`,
  });

  function recording() {
    const asked: string[] = [];
    const settle: Settlers = {
      order: async (_store, o, trigger) => {
        asked.push(`order ${o.id} ${JSON.stringify(trigger)}`);
        return { status: o.id === 2 ? "paid" : "pending", path: "/" };
      },
      plan: async (_store, p) => {
        asked.push(`plan ${p.id}`);
        return { status: "pending", path: "/" };
      },
      donation: async (_store, d) => {
        asked.push(`donation ${d.id}`);
        return { status: "pending", path: "/" };
      },
    };
    return { asked, settle };
  }

  it("asks each provider once its callback had its time, then hourly, while it can still be paid", async () => {
    const store = new MemoryStore();
    const now = NOW;
    // iyzico: asked only once its page has expired (45 minutes), for 3 hours.
    await store.createCatalogOrder(order(1, "iyzico", 20, now));
    await store.createCatalogOrder(order(2, "kashier", 15, now));
    await store.createCatalogOrder(order(3, "iyzico", 50, now));
    await store.createCatalogOrder(order(4, "iyzico", 5 * 60, now));
    await store.createCatalogOrder(order(5, "fawaterk", 3 * 24 * 60, now));
    // Too young for anyone, and one without a provider reference.
    await store.createCatalogOrder(order(6, "kashier", 5, now));
    await store.createCatalogOrder({ ...order(7, "kashier", 30, now), providerRef: null });
    const ids = new Map((await store.listPendingPayments({ startedAfter: new Date(0), startedBefore: now, checkedBefore: now, limit: 50 })).map((p) => [p.record.providerRef, p.record.id]));
    const { asked, settle } = recording();

    const report = await checkPendingPayments({ store, now, settle });
    expect(report).toEqual({ checked: 3, paid: 1, skipped: 1 });
    expect(asked).toEqual([
      `order ${ids.get("ref-5")} {"provider":"fawaterk","providerRef":"ref-5"}`,
      `order ${ids.get("ref-3")} {"provider":"iyzico","iyzicoToken":"ref-3"}`,
      `order ${ids.get("ref-2")} {"provider":"kashier","providerRef":"ref-2"}`,
    ]);

    // Half an hour later: those asked aren't asked again within the hour; the young ones are due now.
    asked.length = 0;
    expect(await checkPendingPayments({ store, now: after(30), settle })).toEqual({ checked: 2, paid: 0, skipped: 0 });
    expect(asked).toEqual([`order ${ids.get("ref-1")} {"provider":"iyzico","iyzicoToken":"ref-1"}`, `order ${ids.get("ref-6")} {"provider":"kashier","providerRef":"ref-6"}`]);
    asked.length = 0;
    expect(await checkPendingPayments({ store, now: after(61), settle })).toMatchObject({ checked: 3 });
  });

  it("stops after its time budget", async () => {
    const store = new MemoryStore();
    for (let i = 1; i <= 3; i++) await store.createCatalogOrder(order(i, "kashier", 20, NOW));
    let tick = NOW.getTime();
    const { settle } = recording();
    expect(await checkPendingPayments({ store, now: NOW, settle, budgetMs: 1000, clock: () => new Date((tick += 2000)) })).toMatchObject({ checked: 1 });
  });

  it("brings iyzico's token as its callback would", () => {
    const pending: PendingPayment = { kind: "order", record: { ...order(1, "iyzico", 60, NOW), paymentProvider: null } };
    expect(triggerFor(pending)).toEqual({ provider: "iyzico", iyzicoToken: "ref-1" });
  });
});

describe("80.3 an order paid at Kashier whose webhook never came", () => {
  const env = { ...process.env };
  const ENCRYPTION = Buffer.from("0".repeat(64), "hex");

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...env };
    delete (globalThis as unknown as { __yallappStore?: unknown }).__yallappStore;
  });

  it("is settled by the check, as the webhook would have: paid and delivered", async () => {
    vi.resetModules();
    process.env.APP_URL = "https://yallapp.test";
    const { store } = await setupClient();
    (globalThis as unknown as { __yallappStore?: Promise<MemoryStore> }).__yallappStore = Promise.resolve(store);
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "store");
    const app: App = {
      ...base,
      backend: "hosted",
      appName: "Cairo Kitchen",
      connector: { kind: "catalog" },
      catalogSettings: {
        ...DEFAULT_CATALOG_SETTINGS,
        currency: "EGP",
        payment: encryptOwnPayment(base.id, { provider: "kashier", merchantId: "MID-1234-567", apiKey: "kashier-payment-api-key", secretKey: "kashier-secret-key", sandbox: true }, ENCRYPTION),
      },
    };
    await store.createApp(app);
    const started = new Date(Date.now() - 20 * MINUTE);
    const order = await store.createCatalogOrder({
      appId: app.id,
      tokenHash: sha256Hex("pending-token"),
      userId: null,
      status: "pending",
      lines: [{ productId: 1, name: "Koshari", quantity: 1, unitCents: 7500, imageAssetId: null, digital: true }],
      subtotalCents: 7500,
      shippingCents: 0,
      totalCents: 7500,
      currency: "EGP",
      customer: null,
      paymentId: null,
      createdAt: started,
      paidAt: null,
      updatedAt: started,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    });
    const kashier = fakeKashier({ secretKey: "kashier-secret-key" });
    vi.stubGlobal("fetch", kashier.fetcher);
    await startPayment({
      store,
      app,
      account: (await checkoutAccount(store, app, ENCRYPTION))!,
      fetcher: kashier.fetcher,
      now: started,
      order,
      customer: { name: "Mona Hassan", phone: "+201001234567", email: "mona@example.com", city: "Cairo", address: "12 Tahrir St" },
      ip: "203.0.113.9",
      callbackUrls: callbackUrls("https://yallapp.test", "order", "kashier", "pending-token"),
    });
    const { checkPendingPayments: check } = await import("@/lib/payments/pending");

    // Not paid at Kashier yet: stays pending.
    expect(await check({ store, now: new Date() })).toEqual({ checked: 1, paid: 0, skipped: 0 });
    expect((await store.getCatalogOrder(app.id, order.id))!.status).toBe("pending");

    // Paid, and the webhook lost: the next hour's check settles it.
    kashier.pay("sess1abcdef", { amount: "75.00" });
    expect(await check({ store, now: new Date(Date.now() + 61 * MINUTE) })).toEqual({ checked: 1, paid: 1, skipped: 0 });
    expect((await store.getCatalogOrder(app.id, order.id))!).toMatchObject({ status: "processing", paymentId: "TX-sess1abcdef" });
    // Paid: no longer pending, never asked again.
    expect(await check({ store, now: new Date(Date.now() + 200 * MINUTE) })).toEqual({ checked: 0, paid: 0, skipped: 0 });
  });
});

describe("80.3 pending payments on the memory store", () => {
  const store = new MemoryStore();
  pendingPaymentsStoreSuite(() => store);
});
