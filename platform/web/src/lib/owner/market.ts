import type { DashKey } from "@/i18n/dashboard";
import { localToUtc, utcToLocal } from "../bookings/time";
import type { App, ComplaintDecision, MarketComplaint, MarketOrder, MarketOrderStatus } from "../data/types";
import { deliverySettingsOf } from "../delivery/settings";
import { restaurantState } from "../food/service";
import { ACTIVE_COMPLAINT, decideComplaint, queueTimers, refundable, supportReply } from "../market/complaints";
import { complaintDecisionDeps } from "../market/decisions";
import { complaintReference, marketOrderReference } from "../market/json";
import { marketTimezone } from "../market/settings";
import { byWait, marketOrderIdOf, ORDER_FILTERS, queueQuery, type Queue } from "../market/support";
import { bodyObject, intParam, invalid, notFound, OwnerError, pageJson, paging, type OwnerContext, type OwnerResult } from "./http";
import { appScope, money } from "./sales";
import { invalidStatus, recordStudio, stageJson } from "./studio";

/**
 * 125 A marketplace in Yallapp Business: its orders as Dashboard ›
 * Marketplace lists them (read only: the places move their own), the
 * support team's complaint queue with the dashboard's replies and decisions
 * (lib/market/complaints.ts, carried out with `complaintDecisionDeps`), and
 * its places. Amounts in the order's own currency and decimals.
 */

const ORDER_STATUS_KEY = (status: string) => `market.st_${status}` as DashKey;
const COMPLAINT_STATUS_KEY = (status: string) => `market.cs_${status}` as DashKey;
const OUTCOMES: ComplaintDecision["outcome"][] = ["refund", "partial_refund", "compensation", "no_refund"];
const TARGETS = ["payment", "wallet", "coupon"] as const;

type OrderFilter = keyof typeof ORDER_FILTERS;

function summaryOf(order: MarketOrder): string {
  return order.lines.map((l) => `${l.pickedQuantity ?? l.quantity} × ${l.name}`).join(", ");
}

function marketOrderJson(ctx: OwnerContext, o: MarketOrder) {
  return {
    id: o.id,
    reference: marketOrderReference(o),
    status: o.status,
    status_label: ctx.t(ORDER_STATUS_KEY(o.status)),
    vendor: { id: o.vendorId, name: o.vendorName, kind: o.vendorKind },
    customer_name: o.customerName,
    summary: summaryOf(o),
    total: money(o.money.total, o.currency),
    fulfilment: o.fulfilment,
    delivery_by: o.deliveryBy,
    placed_at: o.createdAt.toISOString(),
  };
}

export async function listMarketOrders(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "market");
  const page = paging(ctx.req.query);
  const raw = ctx.req.query.get("filter");
  if (raw && !(raw in ORDER_FILTERS)) throw invalid({ filter: "The request isn't valid." });
  const filter = (raw || "active") as OrderFilter;
  const statuses = ORDER_FILTERS[filter] as readonly MarketOrderStatus[] | undefined;
  const q = (ctx.req.query.get("q") ?? "").trim().slice(0, 80);
  const { store } = ctx.deps;
  // As the dashboard: a reference opens that order; words look in the customer's and the place's names.
  const byId = q ? marketOrderIdOf(q) : null;
  if (byId !== null) {
    const o = await store.getMarketOrder(app.id, byId);
    const items = o && (!statuses || statuses.includes(o.status)) ? [o] : [];
    return { status: 200, body: { ...pageJson(page, items.length), items: page.page === 1 ? items.map((x) => marketOrderJson(ctx, x)) : [] } };
  }
  if (q) {
    const found = await store.listMarketOrders({ appId: app.id, ...(statuses ? { statuses: [...statuses] } : {}), order: "newest", limit: 500, offset: 0 });
    const needle = q.toLowerCase();
    const matched = found.items.filter((o) => o.customerName.toLowerCase().includes(needle) || o.vendorName.toLowerCase().includes(needle));
    return { status: 200, body: { ...pageJson(page, matched.length), items: matched.slice(page.offset, page.offset + page.perPage).map((o) => marketOrderJson(ctx, o)) } };
  }
  const { items, total } = await store.listMarketOrders({ appId: app.id, ...(statuses ? { statuses: [...statuses] } : {}), order: "newest", limit: page.perPage, offset: page.offset });
  return { status: 200, body: { ...pageJson(page, total), items: items.map((o) => marketOrderJson(ctx, o)) } };
}

export async function getMarketOrder(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "market");
  const o = await ctx.deps.store.getMarketOrder(app.id, intParam(params.market_order_id));
  if (!o) throw notFound();
  return {
    status: 200,
    body: {
      ...marketOrderJson(ctx, o),
      lines: o.lines.map((l) => ({ quantity: l.pickedQuantity ?? l.quantity, name: l.name, options: [...l.choices, ...(l.note ? [l.note] : [])], total: money(l.total, o.currency) })),
      timeline: o.timeline.map((s) => stageJson(ctx, s, ORDER_STATUS_KEY)),
    },
  };
}

// Complaints

/** Who did it, as the ticket shows it: the person's email (the dashboard's `whoOf`). */
const whoOf = (ctx: OwnerContext) => ctx.user.email;

/** The queues the app names; 125's `waiting` is the dashboard's `open`, and `vendor` is the customer's queue (places never talk to customers). */
function queueOfQuery(ctx: OwnerContext): Queue {
  const raw = ctx.req.query.get("queue");
  if (raw === null || raw === "" || raw === "waiting") return "open";
  if (raw === "customer" || raw === "vendor") return "customer";
  if (raw === "mine" || raw === "closed" || raw === "all") return raw;
  throw invalid({ queue: "The request isn't valid." });
}

/** The items the complaint is about, up to what can still be given back. */
function suggestedRefund(c: MarketComplaint, order: MarketOrder, left: number): number | null {
  if (!["missing_items", "wrong_items", "damaged"].includes(c.reason) || c.lineIds.length === 0) return null;
  const sum = order.lines.filter((l) => c.lineIds.includes(l.id)).reduce((n, l) => n + l.total, 0);
  return sum > 0 ? Math.min(sum, left) : null;
}

async function complaintParts(ctx: OwnerContext, app: App, c: MarketComplaint) {
  const { store } = ctx.deps;
  const order = await store.getMarketOrder(app.id, c.orderId);
  const others = order ? (await store.listMarketComplaints({ appId: app.id, orderId: order.id, limit: 50, offset: 0 })).items.filter((x) => x.id !== c.id) : [];
  const left = order ? refundable(order, others) : 0;
  return { order, left };
}

function complaintJson(ctx: OwnerContext, c: MarketComplaint, order: MarketOrder | null, left: number) {
  const waiting = queueTimers(c, ctx.deps.now).waitingOn;
  const currency = order?.currency ?? "EGP";
  const suggested = order ? suggestedRefund(c, order, left) : null;
  return {
    id: c.id,
    reference: complaintReference(c),
    status: c.status,
    status_label: ctx.t(COMPLAINT_STATUS_KEY(c.status)),
    waiting_for: waiting === "support" ? "you" : waiting === "customer" ? "customer" : null,
    subject: ctx.t(`market.r_${c.reason}` as DashKey),
    order: { id: c.orderId, reference: marketOrderReference({ id: c.orderId }), total: money(order?.money.total ?? 0, currency) },
    vendor: { id: c.vendorId, name: order?.vendorName ?? "" },
    customer_name: order?.customerName ?? "",
    excerpt: c.text.length > 140 ? `${c.text.slice(0, 139).trimEnd()}…` : c.text,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
    refund_suggested: suggested !== null && c.decision === null ? money(suggested, currency) : null,
  };
}

async function complaintDetail(ctx: OwnerContext, app: App, c: MarketComplaint) {
  const { order, left } = await complaintParts(ctx, app, c);
  const currency = order?.currency ?? "EGP";
  const cash = order?.paymentMethod === "cash";
  const refundTo = TARGETS.filter((t) => !(t === "payment" && cash) && !(t === "wallet" && order?.userId === null));
  const open = c.decision === null && order !== null;
  return {
    ...complaintJson(ctx, c, order, left),
    messages: c.messages.map((m) => ({ from: m.from, name: m.from === "customer" ? (order?.customerName ?? "") : ctx.t("market.fromSupport"), text: m.text, at: m.at })),
    decisions: open
      ? [
          ...(left > 0 ? [{ decision: "refund" as const, label: ctx.t("market.o_refund"), amount: "fixed" as const, max: money(left, currency), to: refundTo }] : []),
          ...(left > 0 ? [{ decision: "partial_refund" as const, label: ctx.t("market.o_partial_refund"), amount: "required" as const, max: money(left, currency), to: refundTo }] : []),
          { decision: "compensation" as const, label: ctx.t("market.o_compensation"), amount: "required" as const, max: null, to: refundTo.filter((t) => t !== "payment") },
          { decision: "no_refund" as const, label: ctx.t("market.o_no_refund"), amount: "none" as const, max: null, to: [] },
        ]
      : [],
    decision: c.decision
      ? {
          decision: c.decision.outcome,
          label: ctx.t(`market.o_${c.decision.outcome}` as DashKey),
          amount: c.decision.amount !== null ? money(c.decision.amount, currency) : null,
          to: c.decision.to,
          at: new Date(c.decision.at).toISOString(),
        }
      : null,
  };
}

export async function listComplaints(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "market");
  const page = paging(ctx.req.query);
  const queue = queueOfQuery(ctx);
  const { store } = ctx.deps;
  const query = queueQuery(queue, whoOf(ctx));
  let items: MarketComplaint[];
  let total: number;
  if (queue === "open" || queue === "customer" || queue === "mine") {
    // The longest wait first, as the dashboard's queue.
    const found = await store.listMarketComplaints({ appId: app.id, ...query, limit: 500, offset: 0 });
    total = found.total;
    items = [...found.items].sort(byWait).slice(page.offset, page.offset + page.perPage);
  } else {
    const found = await store.listMarketComplaints({ appId: app.id, ...query, limit: page.perPage, offset: page.offset });
    ({ items, total } = found);
  }
  const waiting = await store.listMarketComplaints({ appId: app.id, ...queueQuery("open", whoOf(ctx)), limit: 1, offset: 0 });
  const json = [];
  for (const c of items) {
    const { order, left } = await complaintParts(ctx, app, c);
    json.push(complaintJson(ctx, c, order, left));
  }
  return { status: 200, body: { ...pageJson(page, total), items: json, counts: { waiting: waiting.total } } };
}

async function ownComplaint(ctx: OwnerContext, params: Record<string, string>) {
  const { app } = appScope(ctx, params.app_id, "market");
  const c = await ctx.deps.store.getMarketComplaint(app.id, intParam(params.complaint_id));
  if (!c) throw notFound();
  return { app, complaint: c };
}

export async function getComplaint(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, complaint } = await ownComplaint(ctx, params);
  return { status: 200, body: await complaintDetail(ctx, app, complaint) };
}

/** The dashboard's reply (app/actions/market.ts `replyComplaintAction`): the customer reads it; it is the person's when it was nobody's. */
export async function replyComplaint(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, complaint } = await ownComplaint(ctx, params);
  const text = bodyObject(ctx.req.body).text;
  if (typeof text !== "string" || !text.trim()) throw invalid({ text: "Write your answer." });
  if (text.trim().length > 2000) throw invalid({ text: "Keep it under 2000 characters." });
  if (!ACTIVE_COMPLAINT.includes(complaint.status)) throw invalidStatus("This complaint is closed.");
  const patch = supportReply(complaint, text, whoOf(ctx), ctx.deps.now);
  if (!patch) throw invalidStatus("This complaint is closed.");
  await ctx.deps.store.updateMarketComplaint(app.id, complaint.id, { ...patch, assignee: complaint.assignee ?? whoOf(ctx) });
  await recordStudio(ctx, app, "complaint.reply", { type: "complaint", id: complaint.id }, `Answered complaint ${complaintReference(complaint)}`);
  return { status: 200, body: await complaintDetail(ctx, app, (await ctx.deps.store.getMarketComplaint(app.id, complaint.id))!) };
}

/** The dashboard's decision (app/actions/market.ts `decideComplaintAction`), with the same inputs. */
export async function decideOneComplaint(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, complaint } = await ownComplaint(ctx, params);
  const body = bodyObject(ctx.req.body);
  const outcome = OUTCOMES.find((o) => o === body.decision);
  if (!outcome) throw invalid({ decision: "Choose what you decide." });
  if (complaint.decision) throw invalidStatus("This complaint has a decision already.");
  const { store, now } = ctx.deps;
  const order = await store.getMarketOrder(app.id, complaint.orderId);
  if (!order) throw invalidStatus("The order isn't there any more.");
  const amount = body.amount_cents;
  if (amount !== undefined && amount !== null && (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0)) throw invalid({ amount_cents: "Write the amount as a number." });
  const to = typeof body.to === "string" && (TARGETS as readonly string[]).includes(body.to) ? (body.to as (typeof TARGETS)[number]) : null;
  if (body.to !== undefined && body.to !== null && to === null) throw invalid({ to: "The request isn't valid." });
  if (body.funder !== undefined && body.funder !== "owner" && body.funder !== "vendor") throw invalid({ funder: "The request isn't valid." });
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length > 500) throw invalid({ note: "Keep it under 500 characters." });
  const done = await decideComplaint(
    store,
    complaintDecisionDeps(store, app, ctx.deps.encryptionKey, { ip: ctx.deps.ip, now }),
    complaint,
    order,
    { outcome, amount: typeof amount === "number" ? amount : null, to, funder: body.funder === "vendor" ? "vendor" : "owner", reason: note || null, shareWithVendor: body.share_with_vendor === true },
    whoOf(ctx),
    now,
  );
  if (!done.ok) {
    const field = done.field === "amount" ? "amount_cents" : done.field === "reason" ? "note" : done.field;
    if (!field) throw new OwnerError(409, "invalid_status", done.error);
    throw invalid({ [field]: done.error }, done.error);
  }
  await recordStudio(ctx, app, "complaint.decide", { type: "complaint", id: complaint.id }, `Decided complaint ${complaintReference(complaint)}: ${outcome}`);
  return { status: 200, body: await complaintDetail(ctx, app, done.complaint) };
}

// Places

export async function listVendors(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "market");
  const { store, now } = ctx.deps;
  const settings = deliverySettingsOf(await store.getDeliverySettings(app.id));
  const timezone = marketTimezone(settings);
  const dayStart = localToUtc(utcToLocal(now, timezone).date, "00:00", timezone);
  const [vendors, today] = await Promise.all([store.listRestaurants(app.id), store.listMarketOrders({ appId: app.id, createdSince: dayStart, limit: 2000, offset: 0 })]);
  const counts = new Map<number, number>();
  for (const o of today.items) if (o.vendorId !== null && o.status !== "awaiting_payment") counts.set(o.vendorId, (counts.get(o.vendorId) ?? 0) + 1);
  return {
    status: 200,
    body: {
      items: [...vendors]
        .sort((a, b) => a.position - b.position || a.id - b.id)
        .map((v) => ({
          id: v.id,
          name: v.name,
          kind: v.kind ?? "restaurant",
          active: v.active && v.paused !== true,
          open: v.paused !== true && restaurantState(v, timezone, now).open,
          orders_today: counts.get(v.id) ?? 0,
        })),
    },
  };
}
