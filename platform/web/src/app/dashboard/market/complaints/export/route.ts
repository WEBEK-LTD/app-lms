import { clientFor, mayUseDashboard } from "@/lib/auth/session";
import type { App } from "@/lib/data/types";
import { csv } from "@/lib/events/forms";
import { errorResponse } from "@/lib/http";
import { complaintItems } from "@/lib/market/complaint-queue";
import { assigneeName } from "@/lib/market/complaint-team";
import { decidedAt, queueTimers } from "@/lib/market/complaints";
import { fromMinor, currencyDecimals } from "@/lib/market/currency";
import { complaintReference, marketOrderReference } from "@/lib/market/json";
import { isFood } from "../../../shipments/parts";
import { loadQueue } from "../data";

/** 115.53 The queue as it's shown (its queue, search and place), as a CSV file: the queue page's Export. */
export async function GET(request: Request): Promise<Response> {
  const context = await clientFor("orders");
  if (!context || !mayUseDashboard(context) || !context.app || !isFood(context.app)) return errorResponse(404, "not_found", "Not found.");
  const url = new URL(request.url);
  const params = Object.fromEntries(["queue", "q", "place", "sort"].map((k) => [k, url.searchParams.get(k) ?? undefined]));
  const now = new Date();
  const data = await loadQueue(context as typeof context & { app: App }, params, now);
  const rows: (string | number | null)[][] = [
    ["complaint", "order", "place", "customer", "reason", "items", "photos", "status", "assigned_to", "opened_at", "minutes_since_opened", "minutes_since_last_reply", "waiting_on", "decision", "decision_to", "decision_amount", "currency", "decided_at"],
  ];
  for (const c of data.items) {
    const order = data.orders.get(c.orderId);
    const timers = queueTimers(c, now);
    const what = complaintItems(c, order);
    const currency = order?.currency ?? data.currency;
    rows.push([
      complaintReference(c),
      marketOrderReference({ id: c.orderId }),
      order?.vendorName ?? null,
      order?.customerName ?? null,
      c.reason,
      what.whole ? "whole order" : what.count,
      c.photoAssetIds.length,
      c.status,
      assigneeName(data.team, c.assignee),
      c.createdAt.toISOString(),
      timers.openMinutes,
      timers.waitingMinutes,
      timers.waitingOn,
      c.decision?.outcome ?? null,
      c.decision?.to ?? null,
      c.decision?.amount !== null && c.decision?.amount !== undefined ? fromMinor(c.decision.amount, currencyDecimals(currency)) : null,
      currency,
      c.decision ? decidedAt(c.decision).toISOString() : null,
    ]);
  }
  return new Response(csv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="complaints-${data.queue}-${now.toISOString().slice(0, 10)}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
