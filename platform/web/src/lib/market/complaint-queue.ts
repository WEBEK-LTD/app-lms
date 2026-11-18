import type { MarketComplaint, MarketOrder } from "../data/types";
import { ACTIVE_COMPLAINT, awaitsSupportAfterDecision, decidedAt, queueTimers, threadMessages } from "./complaints";
import { marketOrderIdOf } from "./support";

/**
 * 115.53 The complaints queue's numbers and choices (design 11): who is
 * waiting on support and for how long, the typical first reply today, the
 * day's decisions and money given back, the search and the place filter.
 * The pages are app/dashboard/market/complaints/*.
 */

/** A time as the queue writes it: "9 min", "1 h 12 min", "3 d". */
export function clockParts(minutes: number): { kind: "m" | "h" | "hm" | "d"; d: number; h: number; m: number } {
  const total = Math.max(0, Math.floor(minutes));
  if (total < 60) return { kind: "m", d: 0, h: 0, m: total };
  if (total < 48 * 60) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return { kind: m ? "hm" : "h", d: 0, h, m };
  }
  return { kind: "d", d: Math.floor(total / 1440), h: 0, m: 0 };
}

/** Support's turn: a working ticket that isn't waiting on the customer, or a decided one the customer wrote on again. */
export function waitsOnSupport(c: MarketComplaint): boolean {
  if (c.decision) return awaitsSupportAfterDecision(c);
  return c.status === "open" || c.status === "in_review";
}

const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
};

/** Minutes from a ticket's opening to support's first answer; null before one. */
export function firstReplyMinutes(c: Pick<MarketComplaint, "createdAt" | "messages">): { at: Date; minutes: number } | null {
  const first = threadMessages(c).find((m) => m.from === "support");
  if (!first) return null;
  const at = new Date(first.at);
  return { at, minutes: Math.max(0, Math.round((at.getTime() - c.createdAt.getTime()) / 60_000)) };
}

export interface QueueStats {
  waiting: number;
  notAssigned: number;
  longest: { complaint: MarketComplaint; minutes: number } | null;
  /** The median first reply of the tickets first answered since `dayStart`. */
  firstReplyTypical: number | null;
  decidedToday: number;
  /** Money given back today, to the card or the wallet (coupons aren't money). */
  refundedToday: number;
}

export function queueStats(complaints: MarketComplaint[], now: Date, dayStart: Date): QueueStats {
  const waiting = complaints.filter(waitsOnSupport);
  let longest: QueueStats["longest"] = null;
  for (const c of waiting) {
    const minutes = queueTimers(c, now).waitingMinutes ?? 0;
    if (!longest || minutes > longest.minutes) longest = { complaint: c, minutes };
  }
  const firsts = complaints.map(firstReplyMinutes).filter((f): f is { at: Date; minutes: number } => f !== null && f.at >= dayStart && f.at <= now);
  const decided = complaints.filter((c) => c.decision && decidedAt(c.decision) >= dayStart && decidedAt(c.decision) <= now);
  const refunded = decided.reduce((sum, c) => {
    const d = c.decision!;
    return (d.outcome === "refund" || d.outcome === "partial_refund") && d.to !== "coupon" ? sum + (d.amount ?? 0) : sum;
  }, 0);
  return {
    waiting: waiting.length,
    notAssigned: waiting.filter((c) => !c.assignee).length,
    longest,
    firstReplyTypical: median(firsts.map((f) => f.minutes)),
    decidedToday: decided.length,
    refundedToday: refunded,
  };
}

/** A search over the queue: "C-1093" (a complaint), "M-1005" or "1005" (an order), or part of the customer's name. */
export function matchesSearch(c: MarketComplaint, order: Pick<MarketOrder, "customerName"> | undefined, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const ref = /^\s*c-(\d{1,9})\s*$/i.exec(q);
  if (ref) return c.id === Number(ref[1]) - 100;
  const orderId = marketOrderIdOf(q);
  if (orderId !== null && c.orderId === orderId) return true;
  return !!order && order.customerName.toLocaleLowerCase().includes(q.toLocaleLowerCase());
}

export type QueueSort = "longest" | "newest";
export const sortOf = (value: string | undefined): QueueSort => (value === "newest" ? "newest" : "longest");

/** The longest wait on support first (then the oldest), or the newest tickets first. */
export function sortQueue(items: MarketComplaint[], sort: QueueSort, now: Date): MarketComplaint[] {
  if (sort === "newest") return [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const wait = (c: MarketComplaint) => {
    const t = queueTimers(c, now);
    return t.waitingOn === "support" ? (t.waitingMinutes ?? 0) : -1;
  };
  return [...items].sort((a, b) => wait(b) - wait(a) || a.createdAt.getTime() - b.createdAt.getTime());
}

/** The items a ticket is about and their total, or the whole order's. */
export function complaintItems(c: Pick<MarketComplaint, "lineIds">, order: Pick<MarketOrder, "lines" | "money"> | undefined): { count: number; total: number | null; whole: boolean } {
  if (!order) return { count: c.lineIds.length, total: null, whole: c.lineIds.length === 0 };
  if (!c.lineIds.length) return { count: 0, total: order.money.total, whole: true };
  const lines = order.lines.filter((l) => c.lineIds.includes(l.id));
  return { count: lines.length, total: lines.reduce((n, l) => n + l.total, 0), whole: false };
}

/** Whether the ticket is still being worked (its decision not made). */
export const working = (c: Pick<MarketComplaint, "status" | "decision">) => !c.decision && ACTIVE_COMPLAINT.includes(c.status);
