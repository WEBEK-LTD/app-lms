import { describe, expect, it } from "vitest";
import { shopifyShipment } from "@/lib/hosted/connectors/shopify";
import { orderChange, orderState } from "@/lib/hosted/order-watch";

/** 91.2 What tells an order update on a connected platform, and Shopify's tracking. */
describe("91.2 order updates on connected platforms", () => {
  const tracked = { carrier: "Aras Kargo", tracking_number: "3815602243", tracking_url: null };

  it("tells a shipment, a new tracking, and an order completed, cancelled or refunded; nothing else", () => {
    const waiting = orderState({ id: 1, status: "processing", shipment: null });
    const shipped = orderState({ id: 1, status: "processing", shipment: tracked });
    expect(orderChange(waiting, waiting)).toBeNull();
    expect(orderChange(waiting, shipped)).toBe("shipped");
    expect(orderChange(shipped, orderState({ id: 1, status: "processing", shipment: { ...tracked, tracking_number: "99" } }))).toBe("shipped");
    expect(orderChange(shipped, orderState({ id: 1, status: "completed", shipment: tracked }))).toBe("completed");
    expect(orderChange(waiting, orderState({ id: 1, status: "cancelled" }))).toBe("cancelled");
    expect(orderChange(shipped, orderState({ id: 1, status: "refunded", shipment: tracked }))).toBe("refunded");
    // Paid, or the tracking taken away: nothing to tell.
    expect(orderChange(orderState({ id: 1, status: "pending" }), waiting)).toBeNull();
    expect(orderChange(shipped, waiting)).toBeNull();
  });

  it("reads Shopify's newest fulfillment with tracking", () => {
    expect(shopifyShipment({ fulfillments: null })).toBeNull();
    expect(shopifyShipment({ fulfillments: [{ createdAt: "2026-10-20T10:00:00Z", trackingInfo: [] }] })).toBeNull();
    expect(
      shopifyShipment({
        fulfillments: [
          { createdAt: "2026-10-20T10:00:00Z", trackingInfo: [{ company: "PTT", number: "OLD", url: null }] },
          { createdAt: "2026-10-22T08:30:00Z", trackingInfo: [{ company: "Aras Kargo", number: "3815602243", url: "https://kargotakip.araskargo.com.tr/?code=3815602243" }] },
        ],
      }),
    ).toEqual({ carrier: "Aras Kargo", tracking_number: "3815602243", tracking_url: "https://kargotakip.araskargo.com.tr/?code=3815602243", waybill: null, shipped_at: "2026-10-22T08:30:00.000Z" });
    expect(shopifyShipment({ fulfillments: [{ createdAt: "2026-10-20T10:00:00Z", trackingInfo: [{ company: null, number: "A1", url: "javascript:alert(1)" }] }] })).toMatchObject({ carrier: null, tracking_url: null });
  });
});
