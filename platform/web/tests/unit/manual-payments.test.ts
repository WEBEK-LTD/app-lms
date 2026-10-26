import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { awaitingManualPayment, cancelManualOrder, chooseManualPayment, manualChoices, readManualPayments } from "@/lib/catalog/manual";
import { nextOrderStatuses } from "@/lib/catalog/order-status";
import { paymentsSetUp } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogOrder, type ManualPaymentSettings } from "@/lib/data/types";
import { orderRefundOptions } from "@/lib/refunds/service";
import { KEY, NOW, setupClient } from "./helpers";

/** 96.2 Bank transfer and the owner's own method: paid outside Yallapp, marked paid by the owner. */

const SETTINGS: ManualPaymentSettings = {
  bankTransfer: "Harbour Books Ltd\nIBAN TR00 0001 0002 0003 0004 0005 06",
  custom: { name: "Cash on delivery", instructions: "Pay the courier when your order arrives." },
  payWithinDays: 3,
};
const customer = { name: "Ada Lovelace", phone: "+905321112233", email: "ada@example.com", city: "Istanbul", address: "Moda Caddesi 12" };

describe("the owner's settings", () => {
  it("reads bank details, the owner's own method and the days to pay", () => {
    expect(readManualPayments({ bankTransfer: " IBAN TR00 ", customName: "", customInstructions: "", payWithinDays: "5" })).toEqual({
      ok: true,
      settings: { bankTransfer: "IBAN TR00", custom: null, payWithinDays: 5 },
    });
    expect(readManualPayments({ bankTransfer: "", customName: "Cash on delivery", customInstructions: "Pay the courier.", payWithinDays: "" })).toEqual({
      ok: true,
      settings: { bankTransfer: null, custom: { name: "Cash on delivery", instructions: "Pay the courier." }, payWithinDays: 3 },
    });
    // Nothing written: both off.
    expect(readManualPayments({ bankTransfer: "", customName: "", customInstructions: "", payWithinDays: "3" })).toEqual({ ok: true, settings: null });
  });

  it("refuses a method without its name or instructions, and days out of range", () => {
    expect(readManualPayments({ bankTransfer: "", customName: "Cash", customInstructions: "", payWithinDays: "3" })).toMatchObject({ ok: false, field: "customInstructions" });
    expect(readManualPayments({ bankTransfer: "", customName: "", customInstructions: "Pay the courier.", payWithinDays: "3" })).toMatchObject({ ok: false, field: "customName" });
    expect(readManualPayments({ bankTransfer: "IBAN", customName: "", customInstructions: "", payWithinDays: "15" })).toMatchObject({ ok: false, field: "payWithinDays" });
    expect(readManualPayments({ bankTransfer: "IBAN", customName: "", customInstructions: "", payWithinDays: "0" })).toMatchObject({ ok: false, field: "payWithinDays" });
    expect(readManualPayments({ bankTransfer: "x".repeat(1001), customName: "", customInstructions: "", payWithinDays: "3" })).toMatchObject({ ok: false, field: "bankTransfer" });
  });

  it("offers what is set, and a shop with only these takes orders", () => {
    expect(manualChoices(SETTINGS).map((c) => c.name)).toEqual(["Bank transfer", "Cash on delivery"]);
    expect(manualChoices({ ...SETTINGS, bankTransfer: null }).map((c) => c.method)).toEqual(["custom"]);
    expect(manualChoices(null)).toEqual([]);
    const settings = { ...DEFAULT_CATALOG_SETTINGS, payment: null };
    expect(paymentsSetUp({ catalogSettings: settings, demo: false })).toBe(false);
    expect(paymentsSetUp({ catalogSettings: { ...settings, manualPayments: SETTINGS }, demo: false })).toBe(true);
  });
});

describe("an order paid outside the app", () => {
  let store: MemoryStore;
  let app: App;
  let order: CatalogOrder;

  async function makeShop() {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "store");
    app = { ...base, backend: "hosted", appName: "Harbour Books", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: null, manualPayments: SETTINGS } };
    await store.createApp(app);
    order = await store.createCatalogOrder({
      appId: app.id,
      tokenHash: sha256Hex("order-token"),
      userId: null,
      status: "pending",
      lines: [{ productId: 1, name: "Atlas", quantity: 1, unitCents: 45000, imageAssetId: null, digital: false }],
      subtotalCents: 45000,
      shippingCents: 0,
      totalCents: 45000,
      currency: "TRY",
      customer: null,
      paymentId: null,
      createdAt: NOW,
      paidAt: null,
      updatedAt: NOW,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    });
  }

  it("keeps the customer, the method's details and the day to pay by; it waits, listed apart", async () => {
    await makeShop();
    const chosen = await chooseManualPayment({ store, app, settings: SETTINGS, order, customer, method: "bank_transfer", now: NOW });
    expect(chosen).toEqual({ method: "bank_transfer", name: "Bank transfer", instructions: SETTINGS.bankTransfer, dueAt: "2026-10-15T10:00:00.000Z" });
    const saved = (await store.getCatalogOrder(app.id, order.id))!;
    expect(saved.status).toBe("pending");
    expect(saved.customer).toEqual(customer);
    expect(awaitingManualPayment(saved)).toBe(true);
    expect(nextOrderStatuses(saved)).toEqual(["processing", "cancelled"]);
    // The dashboard's "Waiting for payment", and the paid list with those waiting.
    expect((await store.listCatalogOrders({ appId: app.id, statuses: ["pending"], manualOnly: true, offset: 0, limit: 10 })).total).toBe(1);
    expect((await store.listCatalogOrders({ appId: app.id, statuses: ["processing"], offset: 0, limit: 10 })).total).toBe(0);
    expect((await store.listCatalogOrders({ appId: app.id, statuses: ["processing"], awaitingManual: true, offset: 0, limit: 10 })).total).toBe(1);
    // An unpaid card checkout is never listed.
    await store.createCatalogOrder({ ...order, tokenHash: sha256Hex("card"), manualPayment: null });
    expect((await store.listCatalogOrders({ appId: app.id, statuses: ["processing"], awaitingManual: true, offset: 0, limit: 10 })).total).toBe(1);
  });

  it("refuses a method the shop doesn't offer, or an order no longer pending", async () => {
    await makeShop();
    const only = { ...SETTINGS, custom: null };
    expect(await chooseManualPayment({ store, app, settings: only, order, customer, method: "custom", now: NOW })).toBeNull();
    await store.updateCatalogOrder(app.id, order.id, { status: "cancelled" });
    expect(await chooseManualPayment({ store, app, settings: SETTINGS, order: { ...order, status: "cancelled" }, customer, method: "bank_transfer", now: NOW })).toBeNull();
  });

  it("is cancelled once, and a refund of one paid this way is recorded, never through a card provider", async () => {
    await makeShop();
    await chooseManualPayment({ store, app, settings: SETTINGS, order, customer, method: "custom", now: NOW });
    const waiting = (await store.getCatalogOrder(app.id, order.id))!;
    expect(await cancelManualOrder(store, app, waiting, NOW)).toBe(true);
    const cancelled = (await store.getCatalogOrder(app.id, order.id))!;
    expect(cancelled.status).toBe("cancelled");
    expect(await cancelManualOrder(store, app, cancelled, NOW)).toBe(false);

    await store.updateCatalogOrder(app.id, order.id, { status: "pending" });
    await store.payCatalogOrder(app.id, order.id, `manual-${order.id}`, NOW);
    const paid = (await store.getCatalogOrder(app.id, order.id))!;
    const options = await orderRefundOptions({ store, key: KEY }, app, paid);
    expect(options).toMatchObject({ refundable: true, byApi: false, manual: true, outside: "Cash on delivery" });
  });
});
