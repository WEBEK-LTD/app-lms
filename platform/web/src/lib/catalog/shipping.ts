import type { DataStore } from "../data/store";
import type { App, CatalogOrder, HostedNotification, OrderShipment } from "../data/types";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX } from "../hosted/notify";
import { pushTarget, sendPush, type ServiceAccount } from "../hosted/push";
import type { TemplateValue } from "../email/templates";
import { orderNumber } from "./settings";

/**
 * 80.4 Shipping for shops without a website: any carrier, to any country,
 * with no carrier account. The shop marks a paid order shipped with the
 * carrier's name and at least one of the tracking link, the tracking number
 * and the waybill (its number, or a link to it); the customer follows it in
 * the app (the order's `shipment`), and is told each time it changes: their
 * inbox, a push, and an email when the order has one. Every plan with a shop
 * has it (the owner's decision, 2026-10-22).
 */

export const CARRIER_MAX = 60;
export const TRACKING_NUMBER_MAX = 80;
export const LINK_MAX = 500;

/** Carriers the dashboard suggests (the shop may name any other). */
export const CARRIER_SUGGESTIONS = [
  "Aras Kargo",
  "Yurtiçi Kargo",
  "MNG Kargo",
  "PTT Kargo",
  "Sürat Kargo",
  "HepsiJET",
  "Trendyol Express",
  "Bosta",
  "Aramex",
  "J&T Express",
  "Mylerz",
  "Egypt Post",
  "SMSA Express",
  "DHL Express",
  "FedEx",
  "UPS",
] as const;

/** Whether the shop can add or change the order's shipment: paid, with something to ship, not a restaurant's order. */
export function shippable(order: Pick<CatalogOrder, "status" | "lines" | "fulfilment">): boolean {
  return (order.status === "processing" || order.status === "completed") && !order.fulfilment && order.lines.some((line) => !line.digital);
}

const clean = (value: unknown, max: number): string | null => {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text ? text.slice(0, max) : null;
};

function webLink(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Whether a waybill is a link (else its number). */
export function waybillLink(waybill: string | null): string | null {
  return waybill && /^https?:\/\//i.test(waybill) ? webLink(waybill) : null;
}

export type ShipmentInput = { carrier?: unknown; trackingNumber?: unknown; trackingUrl?: unknown; waybill?: unknown };

/** The form's or the Owner API's fields, checked. Messages are English (the dashboard words them). */
export function parseShipment(input: ShipmentInput, now: Date): { ok: true; shipment: OrderShipment } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const carrier = clean(input.carrier, CARRIER_MAX);
  const trackingNumber = clean(input.trackingNumber, TRACKING_NUMBER_MAX);
  const trackingText = clean(input.trackingUrl, LINK_MAX);
  const waybill = clean(input.waybill, LINK_MAX);
  const trackingUrl = trackingText ? webLink(trackingText) : null;
  if (trackingText && !trackingUrl) errors.trackingUrl = "Enter the tracking link as a web address, starting with https://.";
  if (waybill && /^https?:\/\//i.test(waybill) && !waybillLink(waybill)) errors.waybill = "Enter the waybill's link as a web address, or its number.";
  if (!trackingNumber && !trackingText && !waybill) errors.trackingNumber = "Enter the tracking link, the tracking number or the waybill.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, shipment: { carrier, trackingNumber, trackingUrl, waybill, shippedAt: now.toISOString() } };
}

/** What the customer is told, in English as the kitchen's messages are (lib/catalog/fulfilment.ts). */
export function shippedMessage(order: CatalogOrder, shipment: OrderShipment, again: boolean): { title: string; body: string } {
  const number = orderNumber(order);
  const by = shipment.carrier ? ` with ${shipment.carrier}` : "";
  const tracking = shipment.trackingNumber ? ` Tracking number: ${shipment.trackingNumber}.` : "";
  return again
    ? { title: `Order ${number}: new tracking details`, body: `Your order's shipment was updated${by}.${tracking} Follow it in the app.` }
    : { title: `Order ${number} was shipped`, body: `Your order is on its way${by}.${tracking} Follow it in the app.` };
}

/** The `order_shipped` email's values. */
export function shippedMailValues(app: App, order: CatalogOrder, shipment: OrderShipment): Record<string, TemplateValue> {
  const lines = [
    shipment.carrier ? `Carrier: ${shipment.carrier}` : null,
    shipment.trackingNumber ? `Tracking number: ${shipment.trackingNumber}` : null,
    shipment.trackingUrl ? `Follow it: ${shipment.trackingUrl}` : null,
    shipment.waybill ? `Waybill: ${shipment.waybill}` : null,
  ].filter(Boolean);
  return {
    org_name: app.appName?.trim() || "—",
    customer_name: order.customer?.name ?? "",
    order_number: orderNumber(order),
    tracking_lines: lines.join("\n"),
  };
}

export interface ShipDeps {
  store: DataStore;
  app: App;
  order: CatalogOrder;
  shipment: OrderShipment;
  account: ServiceAccount | null;
  now: Date;
  send?: typeof sendPush;
  /** Sends the `order_shipped` email in the shop's name (lib/email/send.ts `sendTemplate` with the app). */
  mail?: (to: string, values: Record<string, TemplateValue>) => Promise<unknown>;
}

/** Saves the shipment and tells the customer. Null when the order can't be shipped. */
export async function shipOrder(deps: ShipDeps): Promise<{ order: CatalogOrder; notification: HostedNotification | null; pushed: number; emailed: boolean } | null> {
  const { store, app, order, shipment, now } = deps;
  if (!shippable(order)) return null;
  const again = Boolean(order.shipment);
  await store.updateCatalogOrder(app.id, order.id, { shipment, updatedAt: now });
  const saved = (await store.getCatalogOrder(app.id, order.id)) ?? { ...order, shipment };
  const message = shippedMessage(order, shipment, again);
  let emailed = false;
  if (deps.mail && order.customer?.email) {
    try {
      await deps.mail(order.customer.email, shippedMailValues(app, order, shipment));
      emailed = true;
    } catch (e) {
      // The order shows it either way.
      console.error(`[mail] the shipped email failed: ${e instanceof Error ? e.message : String(e)}`.slice(0, 400));
    }
  }
  if (order.userId === null) return { order: saved, notification: null, pushed: 0, emailed };
  const title = message.title.slice(0, NOTIFICATION_TITLE_MAX);
  const body = message.body.slice(0, NOTIFICATION_BODY_MAX);
  // 91.2 An order update that opens the order, to the phones that allow them.
  const data = { type: "order_update", order_id: String(order.id) };
  const notification = await store.createHostedNotification({ appId: app.id, userId: order.userId, title, body, data, createdAt: now });
  if (!deps.account) return { order: saved, notification, pushed: 0, emailed };
  const tokens = (await store.listHostedPushDevices(app.id, [order.userId])).filter((d) => d.pushPreferences?.orders !== false).map(pushTarget);
  if (tokens.length === 0) return { order: saved, notification, pushed: 0, emailed };
  try {
    const result = await (deps.send ?? sendPush)(
      deps.account,
      tokens,
      { title, body, data: { ...data, notification_id: String(notification.id) } },
      { now },
    );
    for (const token of result.invalidTokens) await store.clearHostedPushToken(app.id, token);
    return { order: saved, notification, pushed: result.sent, emailed };
  } catch {
    return { order: saved, notification, pushed: 0, emailed };
  }
}

/** The order's `shipment` in the app's and the Owner API's answers. */
export function shipmentJson(shipment: OrderShipment | null | undefined) {
  if (!shipment) return null;
  return {
    carrier: shipment.carrier,
    tracking_number: shipment.trackingNumber,
    tracking_url: shipment.trackingUrl,
    waybill: shipment.waybill,
    shipped_at: shipment.shippedAt,
  };
}
