import type { DataStore } from "../data/store";
import type { App, CatalogOrder, FulfilmentStatus, HostedNotification } from "../data/types";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX } from "../hosted/notify";
import { sendPush, type ServiceAccount } from "../hosted/push";
import { canMoveTo, fulfilmentMessage } from "./fulfilment";
import { orderNumber } from "./settings";

/**
 * 26 The kitchen moves a restaurant's paid order on: forward only (received,
 * preparing, ready, out for delivery, completed) or cancelled. Completing or
 * cancelling it also completes or cancels the order itself. Each move tells
 * the customer: a notification in their inbox and a push to their phones
 * when push is on (the inbox keeps it even when push fails).
 */
export async function moveOrder(input: {
  store: DataStore;
  app: App;
  order: CatalogOrder;
  to: FulfilmentStatus;
  account: ServiceAccount | null;
  now: Date;
  send?: typeof sendPush;
}): Promise<{ moved: boolean; notification: HostedNotification | null; pushed: number }> {
  const { store, app, order, to, now } = input;
  const current = order.fulfilmentStatus;
  if (!order.fulfilment || !current || order.status !== "processing" || !canMoveTo(current, to, order.fulfilment.type)) {
    return { moved: false, notification: null, pushed: 0 };
  }
  await store.updateCatalogOrder(app.id, order.id, {
    fulfilmentStatus: to,
    ...(to === "completed" ? { status: "completed" as const } : to === "cancelled" ? { status: "cancelled" as const } : {}),
    updatedAt: now,
  });
  if (order.userId === null) return { moved: true, notification: null, pushed: 0 };
  const message = fulfilmentMessage(to, order.fulfilment.type, orderNumber(order));
  const title = message.title.slice(0, NOTIFICATION_TITLE_MAX);
  const body = message.body.slice(0, NOTIFICATION_BODY_MAX);
  const notification = await store.createHostedNotification({ appId: app.id, userId: order.userId, title, body, createdAt: now });
  if (!input.account) return { moved: true, notification, pushed: 0 };
  const tokens = (await store.listHostedPushDevices(app.id, [order.userId])).map((d) => d.pushToken!);
  if (tokens.length === 0) return { moved: true, notification, pushed: 0 };
  try {
    const result = await (input.send ?? sendPush)(
      input.account,
      tokens,
      { title, body, data: { type: "announcement", notification_id: String(notification.id), order_id: String(order.id) } },
      { now },
    );
    for (const token of result.invalidTokens) await store.clearHostedPushToken(app.id, token);
    return { moved: true, notification, pushed: result.sent };
  } catch {
    return { moved: true, notification, pushed: 0 };
  }
}
