import type { DataStore } from "../data/store";
import type { MarketOrder, MarketOrderLine, SubstituteProposal } from "../data/types";
import type { PickedLine } from "./flow";

/**
 * 115.40 A similar item, asked live. When a line whose choice is "similar"
 * is out, the picker proposes an item of the same vendor; the customer has
 * five minutes to accept it or leave the line out. Unanswered by then, the
 * order's choice decides: a similar item is taken, anything else leaves it
 * out. "My choice" lines and "leave it out" lines are never asked. The
 * proposal lives in the order's lines (no table of its own); the time runs
 * out when the order is next read or answered, as `syncWithJob` follows the
 * courier's job. Picking then has to follow the answer (`checkPicks`).
 */

export const ANSWER_MINUTES = 5;

export type ProposalResult = { ok: true; order: MarketOrder } | { ok: false; status: number; code: string; error: string };

const fail = (status: number, code: string, error: string): ProposalResult => ({ ok: false, status, code, error });

/** Still waiting for the customer at [now]. */
export function isPending(p: SubstituteProposal | null | undefined, now: Date): boolean {
  return !!p && p.answer === null && new Date(p.expiresAt).getTime() > now.getTime();
}

/** What an unanswered proposal becomes: the order's choice, else the line's (always "similar" for an asked line). */
export function timeoutAnswer(order: Pick<MarketOrder, "ifMissing">, line: Pick<MarketOrderLine, "ifMissing">): "accepted" | "declined" {
  return (order.ifMissing ?? line.ifMissing) === "similar" ? "accepted" : "declined";
}

/** The lines with every proposal past its time answered by the order's choice; null when nothing changed. */
export function expiredLines(order: MarketOrder, now: Date): MarketOrderLine[] | null {
  let changed = false;
  const lines = order.lines.map((l) => {
    const p = l.proposal;
    if (!p || p.answer !== null || new Date(p.expiresAt).getTime() > now.getTime()) return l;
    changed = true;
    return { ...l, proposal: { ...p, answer: timeoutAnswer(order, l), answeredBy: "timeout" as const, answeredAt: p.expiresAt } };
  });
  return changed ? lines : null;
}

/** Answers the proposals whose time ran out and keeps it; the order as it is now. */
export async function settleProposals(store: DataStore, order: MarketOrder, now: Date): Promise<MarketOrder> {
  const lines = expiredLines(order, now);
  if (!lines) return order;
  const patch = { lines, updatedAt: now };
  if (!(await store.updateMarketOrder(order.appId, order.id, patch, { statuses: [order.status] }))) return (await store.getMarketOrder(order.appId, order.id)) ?? order;
  return { ...order, ...patch };
}

const PICKING = ["accepted", "picking"];

/** The picker proposes [productId] × [quantity] for a missing line. */
export async function proposeSubstitute(store: DataStore, order: MarketOrder, lineId: number, input: { productId: number; quantity: number }, imageUrl: (assetId: string) => string, now: Date): Promise<ProposalResult> {
  if (!PICKING.includes(order.status)) return fail(409, "order_changed", "This order has moved on. Refresh it.");
  const current = await settleProposals(store, order, now);
  const line = current.lines.find((l) => l.id === lineId);
  if (!line) return fail(404, "not_found", "That line isn't on this order.");
  if (line.outcome !== null) return fail(409, "already_picked", "This line is already picked.");
  if (line.ifMissing !== "similar") return fail(409, "not_asked", line.ifMissing === "chosen" ? "The customer chose the item to bring instead." : "The customer asked to leave this one out if it's missing.");
  if (line.proposal && line.proposal.answer !== "declined") return fail(409, "already_proposed", isPending(line.proposal, now) ? "The customer hasn't answered yet." : "The customer already took the proposed item.");
  if (!Number.isFinite(input.quantity) || input.quantity <= 0 || input.quantity > 10_000) return fail(400, "invalid_request", "Choose how many.");
  const product = await store.getMarketProduct(order.appId, input.productId);
  if (!product || product.vendorId !== order.vendorId) return fail(400, "invalid_request", "That item isn't sold here.");
  if (!product.inStock || product.id === line.productId) return fail(400, "invalid_request", "Choose another item that's in stock.");
  const proposal: SubstituteProposal = {
    productId: product.id,
    name: product.name,
    imageUrl: product.imageAssetId ? imageUrl(product.imageAssetId) : null,
    quantity: input.quantity,
    total: Math.round(product.price * input.quantity + 1e-9),
    proposedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ANSWER_MINUTES * 60_000).toISOString(),
    answer: null,
    answeredBy: null,
    answeredAt: null,
  };
  const lines = current.lines.map((l) => (l.id === lineId ? { ...l, proposal } : l));
  const patch = { lines, updatedAt: now };
  if (!(await store.updateMarketOrder(order.appId, order.id, patch, { statuses: [current.status] }))) return fail(409, "order_changed", "This order has moved on. Refresh it.");
  return { ok: true, order: { ...current, ...patch } };
}

/** The customer accepts the proposed item or leaves the line out, while the time lasts. */
export async function answerSubstitute(store: DataStore, order: MarketOrder, lineId: number, answer: "accept" | "decline", now: Date): Promise<ProposalResult> {
  const current = await settleProposals(store, order, now);
  const line = current.lines.find((l) => l.id === lineId);
  if (!line || !line.proposal) return fail(404, "not_found", "There's nothing to answer on this line.");
  if (!PICKING.includes(current.status) || !isPending(line.proposal, now)) return fail(409, "proposal_closed", line.proposal.answeredBy === "timeout" ? "The time to answer ran out, so your order's choice was used." : "This was already answered.");
  const proposal = { ...line.proposal, answer: answer === "accept" ? ("accepted" as const) : ("declined" as const), answeredBy: "customer" as const, answeredAt: now.toISOString() };
  const lines = current.lines.map((l) => (l.id === lineId ? { ...l, proposal } : l));
  const patch = { lines, updatedAt: now };
  if (!(await store.updateMarketOrder(current.appId, current.id, patch, { statuses: [current.status] }))) return fail(409, "order_changed", "This order has moved on. Refresh it.");
  return { ok: true, order: { ...current, ...patch } };
}

/**
 * The picks made to follow the answers: an accepted proposal brings the
 * proposed item (filled in when the picker sends none), a declined one is
 * left out, and a line still waiting can't be swapped yet.
 */
export function checkPicks(order: MarketOrder, picked: PickedLine[], now: Date): { ok: true; picked: PickedLine[] } | { ok: false; error: string } {
  const out: PickedLine[] = [];
  for (const p of picked) {
    const proposal = order.lines.find((l) => l.id === p.lineId)?.proposal;
    if (!proposal || p.outcome === "picked") {
      out.push(p);
      continue;
    }
    if (isPending(proposal, now)) {
      if (p.outcome === "substituted") return { ok: false, error: "Wait for the customer's answer, or leave the item out." };
      out.push(p);
      continue;
    }
    if (proposal.answer === "declined" && p.outcome === "substituted") return { ok: false, error: "The customer said to leave this one out." };
    if (proposal.answer === "accepted" && p.outcome === "substituted") {
      if (p.substitute && p.substitute.productId !== proposal.productId) return { ok: false, error: "Bring the item the customer accepted." };
      out.push({ ...p, substitute: { productId: proposal.productId, quantity: p.pickedQuantity ?? proposal.quantity } });
      continue;
    }
    out.push(p);
  }
  return { ok: true, picked: out };
}
