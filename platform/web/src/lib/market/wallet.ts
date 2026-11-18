import { randomUUID } from "node:crypto";
import type { DataStore } from "../data/store";
import type { MarketOrder, WalletEntry } from "../data/types";
import { complaintReference, marketOrderReference } from "./json";

/**
 * 115.60 The customer's wallet (D5: credit only, never cashed out). It's
 * filled by refunds and by the owner's credit, and pays all or part of an
 * order; it never expires. The owner adds credit or takes it back by hand,
 * each with a reason the customer reads; taking back never leaves less
 * than nothing.
 */

export const WALLET_REASON_MAX = 140;

export type WalletChange = { ok: true; entry: WalletEntry; balance: number } | { ok: false; error: string; code: "invalid" | "insufficient" | "duplicate" };

/** The owner's credit or take-back. `key` makes it once (a form sent twice). */
export async function changeWallet(
  store: DataStore,
  input: { appId: string; userId: number; amount: number; reason: string; direction: "credit" | "take_back"; key?: string },
  now: Date,
): Promise<WalletChange> {
  const reason = input.reason.replace(/\s+/g, " ").trim().slice(0, WALLET_REASON_MAX);
  if (!reason) return { ok: false, code: "invalid", error: "Write the reason the customer will see." };
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) return { ok: false, code: "invalid", error: "Enter an amount above zero." };
  const credit = input.direction === "credit";
  const added = await store.addWalletEntry({
    appId: input.appId,
    userId: input.userId,
    kind: credit ? "credit" : "taken_back",
    amount: credit ? input.amount : -input.amount,
    label: reason,
    orderId: null,
    complaintId: null,
    key: `owner:${input.key?.slice(0, 80) || randomUUID()}`,
    createdAt: now,
  });
  if (!added.ok) {
    return added.reason === "insufficient"
      ? { ok: false, code: "insufficient", error: "The wallet doesn't have that much: you can take back up to its balance." }
      : { ok: false, code: "duplicate", error: "This was already done." };
  }
  return { ok: true, entry: added.entry, balance: await store.walletBalance(input.appId, input.userId) };
}

/** Where an entry's money came from or went: its order's place and number, its complaint, and how the rest of the order was paid. */
export interface EntryDetail {
  vendorName: string | null;
  orderReference: string | null;
  complaintReference: string | null;
  /** The order's other payment when the wallet paid part of it; null when it paid all or isn't an order's. */
  restPaidBy: MarketOrder["paymentMethod"] | null;
}

export async function entryDetails(store: DataStore, appId: string, entries: WalletEntry[]): Promise<Map<number, EntryDetail>> {
  const orders = new Map<number, MarketOrder | null>();
  for (const id of new Set(entries.map((e) => e.orderId).filter((id): id is number => id !== null))) orders.set(id, await store.getMarketOrder(appId, id));
  const out = new Map<number, EntryDetail>();
  for (const e of entries) {
    const o = e.orderId !== null ? (orders.get(e.orderId) ?? null) : null;
    const rest = o && e.kind === "payment" && o.paymentMethod !== "wallet" && o.money.payNow > 0 ? o.paymentMethod : null;
    out.set(e.id, {
      vendorName: o?.vendorName ?? null,
      orderReference: o ? marketOrderReference(o) : null,
      complaintReference: e.complaintId !== null ? complaintReference({ id: e.complaintId }) : null,
      restPaidBy: rest,
    });
  }
  return out;
}
