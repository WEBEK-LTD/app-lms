import { readCommunityText } from "../courses/community";
import type { DataStore } from "../data/store";
import type { App, ProductReview } from "../data/types";
import { connectorFor } from "../hosted/connectors";

/**
 * 212 The shop's side of its product reviews, for the dashboard (Delivery &
 * offers › Reviews) and the Owner API (Yallapp Business): one public reply
 * under a review (written again replaces it), and hiding an abusive one from
 * everyone but its author. As the course reviews' (lib/courses/community.ts).
 */

export async function replyToProductReview(store: DataStore, review: ProductReview, value: unknown, now: Date): Promise<{ ok: true } | { ok: false; error: string }> {
  const read = readCommunityText(value, "Write your reply.");
  if (!read.ok) return read;
  await store.updateProductReview(review.appId, review.id, { replyText: read.text, replyAt: now, updatedAt: now });
  return { ok: true };
}

export async function removeProductReviewReply(store: DataStore, review: ProductReview, now: Date): Promise<void> {
  await store.updateProductReview(review.appId, review.id, { replyText: null, replyAt: null, updatedAt: now });
}

export async function setProductReviewHidden(store: DataStore, review: ProductReview, hidden: boolean, now: Date): Promise<void> {
  await store.updateProductReview(review.appId, review.id, { hidden, updatedAt: now });
}

export type ReviewFilter = "all" | "unreplied" | "photos" | "hidden";

export function reviewFilter(filter: ReviewFilter): { hidden?: boolean; unreplied?: boolean; photos?: boolean } {
  if (filter === "hidden") return { hidden: true };
  if (filter === "unreplied") return { hidden: false, unreplied: true };
  if (filter === "photos") return { photos: true };
  return {};
}

/**
 * The products' names and pictures by id, as the shop serves them: Yallapp's
 * own products from the store, a connected platform's through its connector
 * (missing when the platform can't be reached).
 */
export async function productLabels(deps: { store: DataStore; key: Buffer; assetUrl: (id: string) => string; platformUrl: string }, app: App, ids: number[]): Promise<Map<number, { name: string; imageUrl: string | null }>> {
  const out = new Map<number, { name: string; imageUrl: string | null }>();
  const wanted = [...new Set(ids)].slice(0, 50);
  if (wanted.length === 0) return out;
  if (app.connector?.kind === "catalog") {
    for (const p of await deps.store.listCatalogProducts(app.id)) {
      if (wanted.includes(p.id)) out.set(p.id, { name: p.name, imageUrl: p.imageAssetIds[0] ? deps.assetUrl(p.imageAssetIds[0]) : null });
    }
    return out;
  }
  const connector = connectorFor(app, deps.key, { store: deps.store, assetUrl: deps.assetUrl, platformUrl: deps.platformUrl });
  const r = connector ? await connector.handle({ method: "GET", path: ["store", "products"], query: new URLSearchParams({ ids: wanted.join(","), per_page: "50" }), body: null, user: null, now: new Date() }).catch(() => null) : null;
  const items = r?.status === 200 ? ((r.body as { items?: { id: number; name?: string; image_url?: string | null }[] }).items ?? []) : [];
  for (const p of items) out.set(p.id, { name: String(p.name ?? ""), imageUrl: p.image_url ?? null });
  return out;
}
