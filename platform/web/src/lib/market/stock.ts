import type { DataStore } from "../data/store";
import type { MarketOrder, MarketOrderLine, MarketOrderStage, MarketProduct, MarketStockWho, MarketUnit } from "../data/types";

/**
 * 115.24 A grocery's or shop's counted stock, moved by its orders through the
 * stock-moves ledger (who, why, which order, before and after):
 *
 * - placing an order takes its lines' stock, all or none, never below 0, even
 *   when two customers order the last one at the same time (the store locks);
 * - a cancelled or turned-down order gives it all back, once;
 * - picking: a line left out gives its stock back; a substitute gives the
 *   ordered item's back and takes the substitute's (what's on the shelf);
 * - stock null isn't counted (D9) and nothing moves; at 0 a product is sold
 *   out by itself, and back once stocked.
 *
 * Items count one each; items sold by weight count their steps (D9).
 */

/** How much of a product's counted stock a quantity takes: items one each, items by weight their steps. */
export function stockUnits(p: { unit: MarketUnit; step: number }, quantity: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  if (p.unit === "item") return Math.floor(quantity + 1e-9);
  const step = p.step > 0 ? p.step : 1;
  return Math.floor(quantity / step + 1e-9);
}

/** The amount a count of stock stands for, in the product's unit (40 steps of 0.25 kg: 10). */
export function stockAmount(p: { unit: MarketUnit; step: number }, units: number): number {
  if (p.unit === "item") return units;
  return Math.round(units * (p.step > 0 ? p.step : 1) * 1000) / 1000;
}

/** Whether customers can buy it now: on, and not counted down to 0. */
export function productAvailable(p: Pick<MarketProduct, "inStock" | "stock">): boolean {
  return p.inStock && (p.stock === null || p.stock > 0);
}

function sells(order: Pick<MarketOrder, "vendorKind">): boolean {
  return order.vendorKind !== "restaurant";
}

/** A line's stock to take: the ordered product, in its units. */
async function linesToTake(store: DataStore, order: MarketOrder, lines: MarketOrderLine[]) {
  const out: { lineId: number; productId: number; units: number; name: string }[] = [];
  const products = new Map<number, MarketProduct | null>();
  for (const l of lines) {
    if (!products.has(l.productId)) products.set(l.productId, await store.getMarketProduct(order.appId, l.productId));
    const p = products.get(l.productId);
    if (!p || p.stock === null) continue;
    out.push({ lineId: l.id, productId: p.id, units: Math.max(1, stockUnits(p, l.quantity)), name: p.name });
  }
  return out;
}

export type StockTakeResult = { ok: true } | { ok: false; productId: number; name: string; left: number; unit: MarketUnit; step: number };

/** The order just placed takes its counted stock, all or none. */
export async function takeOrderStock(store: DataStore, order: MarketOrder, now: Date): Promise<StockTakeResult> {
  if (!sells(order)) return { ok: true };
  const lines = await linesToTake(store, order, order.lines);
  if (!lines.length) return { ok: true };
  const taken = await store.takeMarketStock(order.appId, order.id, lines, "order", { by: "customer", byName: order.customerName }, now);
  if (taken.ok) return { ok: true };
  const p = await store.getMarketProduct(order.appId, taken.productId);
  return { ok: false, productId: taken.productId, name: p?.name ?? lines.find((l) => l.productId === taken.productId)?.name ?? "", left: taken.left, unit: p?.unit ?? "item", step: p?.step ?? 1 };
}

/** Who moved an order last, for the ledger. */
function whoOf(order: MarketOrder, by?: MarketOrderStage["by"]): MarketStockWho {
  const last = by ?? order.timeline[order.timeline.length - 1]?.by ?? "system";
  const kind: MarketStockWho["by"] = last === "customer" ? "customer" : last === "vendor" ? "vendor" : last === "owner" ? "owner" : "system";
  return { by: kind, byName: kind === "customer" ? order.customerName : kind === "vendor" ? order.vendorName : null };
}

/** A cancelled or turned-down order gives back all it took, once. */
export async function giveBackOrderStock(store: DataStore, order: MarketOrder, now: Date): Promise<void> {
  if (!sells(order)) return;
  await store.returnMarketStock(order.appId, order.id, null, whoOf(order), now);
}

/** After picking: lines newly left out give their stock back; substitutes give the ordered item's back and take their own. */
export async function stockAfterPick(store: DataStore, before: MarketOrder, after: MarketOrderLine[], now: Date): Promise<void> {
  if (!sells(before)) return;
  const who: MarketStockWho = { by: "vendor", byName: before.vendorName };
  const was = new Map(before.lines.map((l) => [l.id, l]));
  const back: number[] = [];
  const subs: { lineId: number; productId: number; units: number }[] = [];
  for (const line of after) {
    const old = was.get(line.id);
    if (!old) continue;
    if (line.outcome === "missing" && old.outcome !== "missing") back.push(line.id);
    if (line.outcome === "substituted" && line.substitute && (old.outcome !== "substituted" || old.substitute?.productId !== line.substitute.productId)) {
      back.push(line.id);
      const sub = await store.getMarketProduct(before.appId, line.substitute.productId);
      if (sub && sub.stock !== null) subs.push({ lineId: line.id, productId: sub.id, units: Math.max(1, stockUnits(sub, line.substitute.quantity)) });
    }
  }
  // What those lines took first (the ordered item, or an earlier substitute), then the new substitutes.
  if (back.length) await store.returnMarketStock(before.appId, before.id, back, who, now);
  if (subs.length) await store.takeMarketStock(before.appId, before.id, subs, "substitute", who, now, true);
}
