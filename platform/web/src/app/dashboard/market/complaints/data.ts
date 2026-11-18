import "server-only";
import type { ClientContext } from "@/lib/auth/session";
import { localToUtc, utcToLocal } from "@/lib/bookings/time";
import { getStore } from "@/lib/data";
import type { App, MarketComplaint, MarketOrder } from "@/lib/data/types";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { matchesSearch, queueStats, sortOf, sortQueue, waitsOnSupport, working, type QueueSort } from "@/lib/market/complaint-queue";
import { supportTeam } from "@/lib/market/complaint-team";
import { replyColoursOf } from "@/lib/market/complaints";
import { marketSettingsOf, marketTimezone } from "@/lib/market/settings";
import { QUEUES, queueOf, type Queue } from "@/lib/market/support";

/**
 * 115.53 What the complaints queue shows (design 11): every ticket of the
 * app, read once, then counted, filtered and sorted here, so the counts, the
 * stats and the table always agree. A decided ticket the customer wrote on
 * again waits on support too, its decision kept.
 */

export function inQueue(c: MarketComplaint, queue: Queue, me: string): boolean {
  switch (queue) {
    case "open":
      return waitsOnSupport(c);
    case "customer":
      return working(c) && c.status === "waiting_for_customer";
    case "mine":
      return c.assignee === me && (working(c) || waitsOnSupport(c));
    case "closed":
      return c.decision !== null || c.status === "resolved" || c.status === "rejected";
    case "all":
      return true;
  }
}

export interface QueueParams {
  queue?: string;
  q?: string;
  place?: string;
  sort?: string;
  c?: string;
}

export async function loadQueue(context: ClientContext & { app: App }, params: QueueParams, now: Date) {
  const { app } = context;
  const store = await getStore();
  const me = (context.member ?? context.staff ?? context.user).email;
  const queue = queueOf(params.queue);
  const sort: QueueSort = sortOf(params.sort);
  const q = (params.q ?? "").trim().slice(0, 80);
  const place = /^\d{1,12}$/.test(params.place ?? "") ? Number(params.place) : null;

  const [all, settings, team] = await Promise.all([
    store.listMarketComplaints({ appId: app.id, limit: 2000, offset: 0 }),
    store.getDeliverySettings(app.id).then(deliverySettingsOf),
    supportTeam(store, context.client.id, context.user),
  ]);
  const orderIds = [...new Set(all.items.map((c) => c.orderId))];
  const orders = new Map<number, MarketOrder>();
  for (const o of await Promise.all(orderIds.map((id) => store.getMarketOrder(app.id, id)))) if (o) orders.set(o.id, o);

  const timezone = marketTimezone(settings);
  const dayStart = localToUtc(utcToLocal(now, timezone).date, "00:00", timezone);
  const stats = queueStats(all.items, now, dayStart);
  const counts = Object.fromEntries(QUEUES.map((k) => [k, all.items.filter((c) => inQueue(c, k, me)).length])) as Record<Queue, number>;

  const places = new Map<number, string>();
  for (const o of orders.values()) if (o.vendorId !== null) places.set(o.vendorId, o.vendorName);

  const items = sortQueue(
    all.items.filter((c) => inQueue(c, queue, me) && (place === null || c.vendorId === place) && matchesSearch(c, orders.get(c.orderId), q)),
    queue === "closed" || queue === "all" ? (params.sort ? sort : "newest") : sort,
    now,
  );
  const chosenId = /^\d{1,15}$/.test(params.c ?? "") ? Number(params.c) : null;
  const chosen = (chosenId !== null ? all.items.find((c) => c.id === chosenId) : null) ?? items[0] ?? null;

  return {
    me,
    queue,
    sort,
    q,
    place,
    items,
    chosen,
    orders,
    counts,
    stats,
    team,
    places: [...places.entries()].sort((a, b) => a[1].localeCompare(b[1])),
    colours: replyColoursOf(marketSettingsOf(settings)),
    currency: settings.marketApp?.currency ?? settings.currency,
    timezone,
  };
}
