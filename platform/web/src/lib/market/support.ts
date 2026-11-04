import type { ComplaintStatus, MarketComplaint, MarketOrderStatus } from "../data/types";
import { ACTIVE_COMPLAINT } from "./complaints";

/**
 * 115.12 The app owner's support pages: which complaints each queue shows,
 * which orders each filter shows, and how long a ticket has waited, said
 * shortly. The data and the decisions are lib/market/complaints.ts's.
 */

export const QUEUES = ["open", "customer", "mine", "closed", "all"] as const;
export type Queue = (typeof QUEUES)[number];

export function queueOf(value: string | undefined): Queue {
  return (QUEUES as readonly string[]).includes(value ?? "") ? (value as Queue) : "open";
}

/** The store query for a queue; "mine" is the active tickets assigned to `me`. */
export function queueQuery(queue: Queue, me: string): { statuses?: ComplaintStatus[]; assignee?: string } {
  switch (queue) {
    case "open":
      return { statuses: ["open", "in_review"] };
    case "customer":
      return { statuses: ["waiting_for_customer"] };
    case "mine":
      return { statuses: [...ACTIVE_COMPLAINT], assignee: me };
    case "closed":
      return { statuses: ["resolved", "rejected"] };
    case "all":
      return {};
  }
}

/** The oldest wait first: the ticket that has waited longest on support is the one to answer. */
export function byWait(a: MarketComplaint, b: MarketComplaint): number {
  return a.createdAt.getTime() - b.createdAt.getTime();
}

export const ORDER_FILTERS = {
  active: ["scheduled", "placed", "accepted", "picking", "ready", "on_the_way"],
  new: ["placed"],
  done: ["delivered", "picked_up"],
  problems: ["rejected", "cancelled"],
  all: undefined,
} as const satisfies Record<string, readonly MarketOrderStatus[] | undefined>;
export type OrderFilter = keyof typeof ORDER_FILTERS;

export function orderFilterOf(value: string | undefined): OrderFilter {
  return value && value in ORDER_FILTERS ? (value as OrderFilter) : "active";
}

/** "M-1042" or "1042" → the order's id (1042 − 1000), else null. */
export function marketOrderIdOf(text: string): number | null {
  const m = /^\s*(?:m-)?(\d{4,9})\s*$/i.exec(text);
  if (!m) return null;
  const id = Number(m[1]) - 1000;
  return id > 0 ? id : null;
}

/** A wait in minutes as its largest whole unit: { unit: "hours", count: 3 }. */
export function waitParts(minutes: number): { unit: "minutes" | "hours" | "days"; count: number } {
  if (minutes < 60) return { unit: "minutes", count: Math.max(0, Math.floor(minutes)) };
  if (minutes < 48 * 60) return { unit: "hours", count: Math.floor(minutes / 60) };
  return { unit: "days", count: Math.floor(minutes / 1440) };
}

/** Over this long waiting on support, a ticket is late (the queue shows it in warning colours). */
export const SLA_MINUTES = 4 * 60;
