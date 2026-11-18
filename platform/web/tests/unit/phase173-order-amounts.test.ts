import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { orderAmountsJson } from "@/lib/catalog/order-amounts";
import type { App, CatalogOrder } from "@/lib/data/types";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/**
 * 173 A tester's order (#1057) showed in the app with its lines and total
 * only: 360 + 120 against 482. The order now says what the total is made
 * of (`Order.amounts`): 480 less 48 (LEQAA10), plus the Marrakech delivery
 * (30) and the slot's fee (20), which the order keeps together as its
 * shipping. And `delivery.recipient` has the city it goes to.
 */

/** As Intl writes it: the code, a no-break space, the amount. */
const mad = (amount: string) => `MAD\u00a0${amount}`;

const ORDER_1057 = {
  subtotalCents: 48000,
  shippingCents: 5000,
  totalCents: 48200,
  currency: "MAD",
  couponCode: "LEQAA10",
  discountCents: 4800,
  points: null,
  tax: null,
  delivery: {
    date: "2026-11-19",
    slot: { id: "morning", start: "10:00", end: "13:00" },
    feeCents: 2000,
    sender: { name: "Salma Idrissi", phone: "+212600000001", email: "salma@example.com" },
    recipient: { name: "Nadia Benali", phone: "+212600000002", address: "12 Rue de la Liberté, Guéliz" },
    place: { country: "MA", city: "Marrakech", lat: null, lng: null },
    shipping: { cents: 3000, zone: "Marrakech", breakdown: [{ label: "Marrakech", cents: 3000 }] },
    message: "Happy birthday, Nadia!",
    anonymous: false,
  },
} satisfies Partial<CatalogOrder>;

describe("173 what an order's total is made of", () => {
  it("adds up: the coupon taken off, the delivery and the slot's fee apart", () => {
    expect(orderAmountsJson(ORDER_1057)).toEqual({
      subtotal: mad("480.00"),
      discount: { code: "LEQAA10", amount: mad("48.00") },
      points: null,
      shipping: { zone: "Marrakech", amount: mad("30.00") },
      slot_fee: mad("20.00"),
      fees: [],
      tax: null,
      total: mad("482.00"),
    });
  });

  it("without a coupon, a slot's fee or a delivery: the subtotal and the total", () => {
    expect(
      orderAmountsJson({ ...ORDER_1057, shippingCents: 0, totalCents: 48000, couponCode: null, discountCents: 0, delivery: { ...ORDER_1057.delivery, feeCents: 0, shipping: null } }),
    ).toEqual({ subtotal: mad("480.00"), discount: null, points: null, shipping: null, slot_fee: null, fees: [], tax: null, total: mad("480.00") });
  });

  it("a restaurant's delivery fee, the points and an added tax, each a line", () => {
    const amounts = orderAmountsJson({
      subtotalCents: 40000,
      shippingCents: 3000,
      totalCents: 45150,
      currency: "TRY",
      discountCents: 0,
      points: { used: 250, discountCents: 2500, earned: 0 },
      tax: { label: "KDV", rateBps: 1000, included: false, cents: 4050 },
      delivery: null,
    });
    expect(amounts).toEqual({
      subtotal: "₺400.00",
      discount: null,
      points: { used: 250, amount: "₺25.00" },
      shipping: { zone: null, amount: "₺30.00" },
      slot_fee: null,
      fees: [],
      tax: { label: "KDV 10%", included: false, amount: "₺40.50" },
      total: "₺451.50",
    });
  });

  it("GET /me/orders and /me/orders/{order_id} send them, and the recipient's city, as the contract says", async () => {
    const { store, client } = await setupClient({ plan: "growth" });
    const app: App = {
      ...newApp(client.id, null, NOW, "store"),
      backend: "hosted",
      demo: true,
      connector: { kind: "catalog" },
      catalogSettings: { currency: "MAD", shippingCents: 3000, freeShippingOverCents: null, payment: null },
    };
    await store.createApp(app);
    const user = (await store.createHostedUser({ appId: app.id, phone: "+212600000001", name: "Salma", email: null, city: null, now: NOW }))!;
    const order = await store.createCatalogOrder({
      appId: app.id,
      tokenHash: "h-1057",
      userId: user.id,
      status: "processing",
      lines: [
        { productId: 1, name: "Blush Garden", quantity: 1, unitCents: 36000, imageAssetId: null, digital: false },
        { productId: 2, name: "Chocolate box", quantity: 1, unitCents: 12000, imageAssetId: null, digital: false, addonOf: 1 },
      ],
      customer: null,
      paymentId: "PAY-1057",
      createdAt: NOW,
      paidAt: NOW,
      updatedAt: NOW,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
      deliveryDate: ORDER_1057.delivery.date,
      ...ORDER_1057,
    } as never);
    const connector = new CatalogConnector({ store, app, assetUrl: (id) => id, platformUrl: "https://yallapp.test" });
    const call = (path: string) => connector.handle({ method: "GET", path: path.split("/").filter(Boolean), query: new URLSearchParams(), body: undefined, user, now: NOW });

    const one = await call(`/me/orders/${order.id}`);
    expectContract("GET", "/me/orders/{order_id}", one);
    expect(one.body).toMatchObject({
      total: mad("482.00"),
      amounts: { subtotal: mad("480.00"), discount: { code: "LEQAA10", amount: mad("48.00") }, shipping: { zone: "Marrakech", amount: mad("30.00") }, slot_fee: mad("20.00"), total: mad("482.00") },
      delivery: {
        date: "2026-11-19",
        slot: { label: "10:00–13:00" },
        fee: mad("20.00"),
        sender: { name: "Salma Idrissi" },
        recipient: { name: "Nadia Benali", address: "12 Rue de la Liberté, Guéliz", city: "Marrakech", country: "MA" },
        gift_message: "Happy birthday, Nadia!",
      },
    });
    const list = await call("/me/orders");
    expectContract("GET", "/me/orders", list);
    expect((list.body as { items: { amounts: unknown }[] }).items[0]!.amounts).toEqual((one.body as { amounts: unknown }).amounts);
  });
});
