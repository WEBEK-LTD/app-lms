import type { ConnectorResult } from "./types";

// Helpers the connectors share.

export function intParam(query: URLSearchParams, name: string, fallback: number, max: number): number {
  const value = Number.parseInt(query.get(name) ?? "", 10);
  return Number.isFinite(value) && value >= 1 ? Math.min(value, max) : fallback;
}

export const error = (status: number, code: string, message: string): ConnectorResult => ({ status, body: { code, message } });

export interface CartLineInput {
  product_id: number;
  variation_id: number | null;
  quantity: number;
}

/** The lines of a cart request, or null when they aren't valid. */
export function cartLines(body: unknown): CartLineInput[] | null {
  const lines = (body as { lines?: unknown })?.lines;
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > 100) return null;
  const out: CartLineInput[] = [];
  for (const raw of lines) {
    const line = raw as Record<string, unknown>;
    const productId = Number(line?.product_id);
    const variationId = line?.variation_id === null || line?.variation_id === undefined ? null : Number(line.variation_id);
    const quantity = Number(line?.quantity);
    if (!Number.isSafeInteger(productId) || productId < 1) return null;
    if (variationId !== null && (!Number.isSafeInteger(variationId) || variationId < 1)) return null;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) return null;
    out.push({ product_id: productId, variation_id: variationId, quantity });
  }
  return out;
}
