import { describe, expect, it, vi } from "vitest";
import { newApp } from "@/lib/app/setup";
import { parseShipment, shippedMailValues, shipOrder, shippable, waybillLink } from "@/lib/catalog/shipping";
import { MemoryStore } from "@/lib/data/memory";
import type { App, CatalogOrder } from "@/lib/data/types";
import { NOW } from "./helpers";

/** 80.4 Shipping with any carrier, to any country, with no carrier account. */

const line = (digital: boolean) => ({ productId: 1, name: digital ? "Gift card" : "Tulip vase", quantity: 1, unitCents: 40000, imageAssetId: null, digital });

function order(over: Partial<CatalogOrder> = {}): CatalogOrder {
  return {
    id: 42,
    appId: "app-1",
    tokenHash: "h",
    userId: 7,
    status: "processing",
    lines: [line(false)],
    subtotalCents: 40000,
    shippingCents: 5000,
    totalCents: 45000,
    currency: "EGP",
    customer: { name: "Mona Hassan", phone: "+201001234567", email: "mona@example.com", city: "Cairo", address: "12 Tahrir St" },
    paymentId: "PAY-1",
    createdAt: NOW,
    paidAt: NOW,
    updatedAt: NOW,
    commissionCents: null,
    itemTransactionIds: null,
    payoutApprovedAt: null,
    ...over,
  };
}

describe("80.4 a shipment as the shop enters it", () => {
  it("needs a tracking link, a tracking number or a waybill; the carrier is any name", () => {
    expect(parseShipment({ carrier: "  Bosta  " }, NOW)).toEqual({ ok: false, errors: { trackingNumber: "Enter the tracking link, the tracking number or the waybill." } });
    expect(parseShipment({ carrier: "", trackingNumber: " 3815602243 " }, NOW)).toEqual({
      ok: true,
      shipment: { carrier: null, trackingNumber: "3815602243", trackingUrl: null, waybill: null, shippedAt: NOW.toISOString() },
    });
    expect(parseShipment({ carrier: "Correos de México", waybill: "AWB 4471 2290" }, NOW)).toMatchObject({ ok: true, shipment: { carrier: "Correos de México", waybill: "AWB 4471 2290" } });
    expect(parseShipment({ trackingUrl: "javascript:alert(1)" }, NOW)).toEqual({ ok: false, errors: { trackingUrl: "Enter the tracking link as a web address, starting with https://." } });
    expect(parseShipment({ trackingUrl: "https://track.example/?n=1" }, NOW)).toMatchObject({ ok: true, shipment: { trackingUrl: "https://track.example/?n=1" } });
    expect(parseShipment({ waybill: "https://" }, NOW)).toMatchObject({ ok: false, errors: { waybill: "Enter the waybill's link as a web address, or its number." } });
    expect(waybillLink("https://files.example/awb.pdf")).toBe("https://files.example/awb.pdf");
    expect(waybillLink("AWB 4471")).toBeNull();
    // Kept short.
    const long = parseShipment({ carrier: "x".repeat(200), trackingNumber: "1".repeat(200) }, NOW);
    expect(long.ok && [long.shipment.carrier!.length, long.shipment.trackingNumber!.length]).toEqual([60, 80]);
  });

  it("is for paid orders with something physical, never a restaurant's", () => {
    expect(shippable(order())).toBe(true);
    expect(shippable(order({ status: "completed" }))).toBe(true);
    expect(shippable(order({ status: "pending" }))).toBe(false);
    expect(shippable(order({ status: "refunded" }))).toBe(false);
    expect(shippable(order({ lines: [line(true)] }))).toBe(false);
    expect(shippable(order({ lines: [line(true), line(false)] }))).toBe(true);
    expect(shippable(order({ fulfilment: { type: "delivery", scheduledFor: null, address: null, area: null, notes: null, feeCents: 0 } as never }))).toBe(false);
  });
});

describe("80.4 marking an order shipped", () => {
  it("saves it and tells the customer: their inbox and an email", async () => {
    const store = new MemoryStore();
    const app: App = { ...newApp("c1", null, NOW, "store"), backend: "hosted", appName: "Harbour Books" };
    await store.createApp(app);
    const created = await store.createCatalogOrder({ ...order({ appId: app.id }), id: undefined } as never);
    const mail = vi.fn(async () => undefined);
    const shipment = { carrier: "Bosta", trackingNumber: "BOS-77", trackingUrl: null, waybill: "https://files.example/awb.pdf", shippedAt: NOW.toISOString() };
    // Pushes go as the kitchen's do (restaurant.test.ts); here the app has no Firebase key.
    const result = await shipOrder({ store, app, order: created, shipment, account: null, now: NOW, mail });
    expect(result?.order.shipment).toEqual(shipment);
    expect(result?.emailed).toBe(true);
    expect(mail).toHaveBeenCalledWith("mona@example.com", {
      org_name: "Harbour Books",
      customer_name: "Mona Hassan",
      order_number: String(1000 + created.id),
      tracking_lines: "Carrier: Bosta\nTracking number: BOS-77\nWaybill: https://files.example/awb.pdf",
    });
    expect(result?.notification).toMatchObject({ userId: 7, title: `Order ${1000 + created.id} was shipped` });
    // 91.2 An order update that opens the order.
    expect(result?.notification?.data).toEqual({ type: "order_update", order_id: String(created.id) });
    // Not shippable: nothing saved, nobody told.
    expect(await shipOrder({ store, app, order: { ...created, lines: [line(true)] }, shipment, account: null, now: NOW, mail })).toBeNull();
    expect(mail).toHaveBeenCalledTimes(1);
    // A failed email doesn't stop it.
    const failing = await shipOrder({ store, app, order: (await store.getCatalogOrder(app.id, created.id))!, shipment, account: null, now: NOW, mail: async () => Promise.reject(new Error("smtp down")) });
    expect(failing).toMatchObject({ emailed: false, notification: { title: `Order ${1000 + created.id}: new tracking details` } });
  });

  it("words the email's tracking lines from what the shop gave", () => {
    const app = { ...newApp("c1", null, NOW, "store"), appName: null } as App;
    expect(shippedMailValues(app, order(), { carrier: null, trackingNumber: null, trackingUrl: "https://t.example/1", waybill: null, shippedAt: NOW.toISOString() })).toMatchObject({
      org_name: "—",
      tracking_lines: "Follow it: https://t.example/1",
    });
  });
});
