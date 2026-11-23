import { assetUrl } from "../assets";
import type { App, ProductReview } from "../data/types";
import { mediaLink } from "../media/files";
import { productLabels, removeProductReviewReply, replyToProductReview, reviewFilter, setProductReviewHidden, type ReviewFilter } from "../selling/product-reviews-admin";
import { productRatingSummary, shopFeaturesOn, stockAlertCounts } from "../selling/shop-features";
import { teamCan } from "../team/permissions";
import { bodyObject, intParam, invalid, iso, notAllowed, notAvailable, notFound, pageJson, paging, type OwnerContext, type OwnerResult } from "./http";
import { appScope } from "./sales";

/**
 * 212 Yallapp Business: a store's product reviews with their photos (reply
 * once, hide an abusive one), and who waits for what to be back in stock
 * and what customers saved. Any store (Yallapp's own shop, Shopify, the
 * connected platforms), for the people with Catalog & content.
 */

function shopScope(ctx: OwnerContext, appId: string | undefined): App {
  const { app } = appScope(ctx, appId);
  if (!shopFeaturesOn(app)) throw notAvailable();
  if (!teamCan(ctx.access, "catalog", app.id)) throw notAllowed();
  return app;
}

const FILTERS: ReviewFilter[] = ["all", "unreplied", "photos", "hidden"];

function reviewJson(ctx: OwnerContext, r: ProductReview, product: { name: string; imageUrl: string | null } | undefined) {
  return {
    id: r.id,
    product_id: r.productId,
    product_name: product?.name ?? "",
    product_image_url: product?.imageUrl ?? null,
    // The short name the app shows ("Ahmed K."): never an email or a phone.
    person: r.authorName,
    rating: r.rating,
    text: r.text,
    photos: r.photoIds.map((id) => ({ url: mediaLink(ctx.deps.baseUrl, id) })),
    hidden: r.hidden,
    reply: r.replyText ? { text: r.replyText, created_at: iso(r.replyAt ?? r.updatedAt) } : null,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}

const labelsOf = (ctx: OwnerContext, app: App, ids: number[]) => productLabels({ store: ctx.deps.store, key: ctx.deps.encryptionKey, assetUrl, platformUrl: ctx.deps.baseUrl }, app, ids);

export async function listProductReviews(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const app = shopScope(ctx, params.app_id);
  const page = paging(ctx.req.query);
  const filter = (ctx.req.query.get("filter") ?? "all") as ReviewFilter;
  if (!FILTERS.includes(filter)) throw invalid({ filter: "The request isn't valid." });
  const { store } = ctx.deps;
  const { items, total } = await store.listProductReviews({ appId: app.id, ...reviewFilter(filter), offset: page.offset, limit: page.perPage });
  const labels = await labelsOf(ctx, app, items.map((r) => r.productId));
  const rated = productRatingSummary(await store.countProductRatings(app.id));
  return { status: 200, body: { ...pageJson(page, total), rating: rated.rating, rating_count: rated.rating_count, counts: rated.counts, items: items.map((r) => reviewJson(ctx, r, labels.get(r.productId))) } };
}

async function ownReview(ctx: OwnerContext, params: Record<string, string>) {
  const app = shopScope(ctx, params.app_id);
  const review = await ctx.deps.store.getProductReview(app.id, intParam(params.review_id));
  if (!review) throw notFound();
  return { app, review };
}

async function answer(ctx: OwnerContext, app: App, id: number): Promise<OwnerResult> {
  const review = (await ctx.deps.store.getProductReview(app.id, id))!;
  const labels = await labelsOf(ctx, app, [review.productId]);
  return { status: 200, body: reviewJson(ctx, review, labels.get(review.productId)) };
}

export async function updateProductReview(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, review } = await ownReview(ctx, params);
  const hidden = bodyObject(ctx.req.body).hidden;
  if (typeof hidden !== "boolean") throw invalid({ hidden: "The request isn't valid." });
  if (hidden !== review.hidden) await setProductReviewHidden(ctx.deps.store, review, hidden, ctx.deps.now);
  return answer(ctx, app, review.id);
}

export async function replyProductReview(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, review } = await ownReview(ctx, params);
  const result = await replyToProductReview(ctx.deps.store, review, bodyObject(ctx.req.body).text, ctx.deps.now);
  if (!result.ok) throw invalid({ text: result.error });
  return answer(ctx, app, review.id);
}

export async function deleteProductReviewReply(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, review } = await ownReview(ctx, params);
  await removeProductReviewReply(ctx.deps.store, review, ctx.deps.now);
  return answer(ctx, app, review.id);
}

/** Who waits for what to be back in stock, and the products saved most. */
export async function shopWishes(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const app = shopScope(ctx, params.app_id);
  const { store } = ctx.deps;
  const [waiting, saved] = await Promise.all([stockAlertCounts(store, app.id), store.countShopWishlist(app.id)]);
  const shownWaiting = waiting.slice(0, 50);
  const shownSaved = saved.slice(0, 50);
  const labels = await labelsOf(ctx, app, [...shownWaiting.map((w) => w.productId), ...shownSaved.map((s) => s.productId)]);
  return {
    status: 200,
    body: {
      waiting: shownWaiting.map((w) => ({ product_id: w.productId, variation_id: w.variationId || null, product_name: labels.get(w.productId)?.name || w.name, product_image_url: labels.get(w.productId)?.imageUrl ?? null, count: w.count })),
      waiting_total: waiting.reduce((n, w) => n + w.count, 0),
      saved: shownSaved.map((s) => ({ product_id: s.productId, product_name: labels.get(s.productId)?.name ?? "", product_image_url: labels.get(s.productId)?.imageUrl ?? null, count: s.count })),
    },
  };
}
