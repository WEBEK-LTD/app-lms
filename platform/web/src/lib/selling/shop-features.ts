import { REVIEW_LIMIT } from "../courses/community";
import type { DataStore } from "../data/store";
import type { App, HostedUser, MediaFile, ProductReview, StockAlert } from "../data/types";
import { notifyAuto, type AutoDeps, type GuestMailer } from "../hosted/auto-notifications";
import { error, intParam } from "../hosted/connectors/common";
import type { Connector, ConnectorRequest, ConnectorResult } from "../hosted/connectors/types";
import { completeUpload, kindOf, mediaLink, MEDIA_KINDS, startUpload, uploadUrl } from "../media/files";
import type { MediaStorage } from "../media/storage";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";

/**
 * 212 What every store gets beside its products, wherever they come from
 * (Yallapp's own shop, Shopify, the connected platforms), kept by Yallapp:
 *
 * - the wishlist: `GET /store/wishlist`, `PUT`/`DELETE /store/wishlist/{id}`
 *   and `POST /store/wishlist/merge` (a guest's hearts kept on the phone,
 *   added once they sign in); every product and its page say `wishlisted`;
 * - reviews with photos, from customers who bought the product (an order of
 *   theirs, paid or done, holds it): `GET /store/products/{id}/reviews`
 *   (with `photos=1` the ones with photos), `PUT …/reviews/mine` (one per
 *   product and customer, editable), the photos sent first with
 *   `POST /store/review-uploads` into the app's Media library; the shop
 *   replies once and hides abusive ones (the dashboard and Yallapp
 *   Business); each product's average and count on its card, the summary
 *   with its bars and the photos on its page (`reviews_preview`);
 * - "Notify me when it's back": `PUT`/`DELETE /store/products/{id}/back-in-stock`
 *   for an out-of-stock product or variation; the frequent job looks at the
 *   products people wait for (`runStockAlerts`) and pushes (and emails,
 *   when the app's email goes out) once it's back.
 *
 * WordPress sites answer the same contract from the plugin (WooCommerce's
 * own reviews); an app on an older server finds none of it (`store.wishlist`
 * and the rest missing) and shows nothing new.
 */

export const WISHLIST_MAX = 200;
export const REVIEW_TEXT_MAX = 2000;
export const REVIEW_PHOTOS_MAX = 4;
/** Each photo: a JPEG, PNG or WebP of at most 8 MB. */
export const REVIEW_PHOTO_BYTES = 8 * 1024 * 1024;
export const REVIEW_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** A customer waits for at most this many products and variations at once. */
export const STOCK_ALERTS_MAX = 50;
const WISHLIST_LIMIT: RateLimitRule = { name: "shop-wishlist:user", limit: 300, windowSeconds: 3600 };
const UPLOAD_LIMIT: RateLimitRule = { name: "shop-review-upload:user", limit: 30, windowSeconds: 3600 };
const STOCK_LIMIT: RateLimitRule = { name: "shop-stock-alert:user", limit: 60, windowSeconds: 3600 };
/** The reviews' moderation follows the course reviews' (63): at most 20 written or edited an hour. */
const SHOP_REVIEW_LIMIT: RateLimitRule = { ...REVIEW_LIMIT, name: "shop-review:user" };
/** An order that counts as bought. */
const BOUGHT_STATUSES = new Set(["processing", "completed", "on_hold", "delivered", "shipped"]);
/** More links than this in a review is spam: refused. */
const REVIEW_LINKS_MAX = 1;

/** The kinds of store source these come with. */
export function shopFeaturesOn(app: Pick<App, "appType" | "connector">): boolean {
  const kind = app.connector?.kind;
  return app.appType === "store" && (kind === "catalog" || kind === "shopify" || kind === "platform");
}

/** "Ahmed Kamal" → "Ahmed K.", "أحمد كمال" → "أحمد ك.": never more than a first name and an initial. */
export function shortName(name: string | null | undefined): string {
  const words = (name ?? "")
    .replace(/[^\p{L}\p{M}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0]!.slice(0, 24);
  const last = words.length > 1 ? words[words.length - 1]! : "";
  return last ? `${first} ${[...last][0]}.` : first;
}

export interface ProductRatingSummary {
  rating: number | null;
  rating_count: number;
  counts: Record<"1" | "2" | "3" | "4" | "5", number>;
}

/** The shown reviews' summary of a product (or of every row given). */
export function productRatingSummary(rows: { productId: number; rating: number; count: number }[], productId?: number): ProductRatingSummary {
  const counts: ProductRatingSummary["counts"] = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const row of rows) {
    if (productId !== undefined && row.productId !== productId) continue;
    if (row.rating >= 1 && row.rating <= 5) counts[String(row.rating) as "1"] += row.count;
  }
  const count = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const total = Object.entries(counts).reduce((sum, [star, n]) => sum + Number(star) * n, 0);
  return { rating: count ? Math.round((total / count) * 10) / 10 : null, rating_count: count, counts };
}

export type ReadReview = { ok: true; rating: number; text: string; photoIds: string[] } | { ok: false; error: string };

/** The app's review: a rating 1 to 5, its words (optional, at most 2,000 characters, one link), up to 4 photos' upload ids. */
export function readProductReview(body: unknown): ReadReview {
  const input = (body ?? {}) as { rating?: unknown; text?: unknown; photo_ids?: unknown };
  const rating = input.rating;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: "Choose a rating from 1 to 5." };
  if (input.text !== undefined && input.text !== null && typeof input.text !== "string") return { ok: false, error: "The review isn't valid." };
  const text = typeof input.text === "string" ? input.text.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim() : "";
  if (text.length > REVIEW_TEXT_MAX) return { ok: false, error: `Use at most ${REVIEW_TEXT_MAX} characters.` };
  if ((text.match(/https?:\/\/|www\./gi) ?? []).length > REVIEW_LINKS_MAX) return { ok: false, error: "A review can't hold links." };
  const raw = input.photo_ids ?? [];
  if (!Array.isArray(raw) || raw.some((id) => typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id))) return { ok: false, error: "The photos aren't valid." };
  const photoIds = [...new Set(raw as string[])];
  if (photoIds.length > REVIEW_PHOTOS_MAX) return { ok: false, error: `Add at most ${REVIEW_PHOTOS_MAX} photos.` };
  return { ok: true, rating, text, photoIds };
}

export interface ShopFeaturesDeps {
  store: DataStore;
  app: App;
  /** Yallapp's address, for the photos' links. */
  platformUrl: string;
  /** The photos' uploads into the app's Media library; without them, reviews take no photos. */
  uploads?: { storage: MediaStorage; chunkBytes: number; limitBytes: () => Promise<number | null> };
  /** A customer's first review of a product reached the shop (Yallapp Business). */
  onReview?: (input: { review: ProductReview; productName: string; user: HostedUser }) => Promise<void>;
}

type Summary = Record<string, unknown> & { id: number };

function isProduct(x: unknown): x is Summary {
  return Boolean(x && typeof x === "object" && typeof (x as { id?: unknown }).id === "number" && "price" in (x as object) && "stock_status" in (x as object));
}

/** Every product (summary or page) in an answer: lists, home sections, a page's related, Complete the look, add-ons. */
function productsIn(body: unknown): Summary[] {
  const out: Summary[] = [];
  const visit = (x: unknown, depth: number) => {
    if (depth > 3 || !x || typeof x !== "object") return;
    if (Array.isArray(x)) {
      for (const item of x) visit(item, depth + 1);
      return;
    }
    if (isProduct(x)) out.push(x);
    const o = x as Record<string, unknown>;
    for (const key of ["items", "sections", "products", "related", "complete_look", "addons"]) if (key in o) visit(o[key], depth + 1);
  };
  visit(body, 0);
  return out;
}

/** Whether a product's page (or a variation of it) can be bought now. */
function inStock(page: Record<string, unknown>, variationId: number): boolean {
  if (variationId) {
    const v = (Array.isArray(page.variations) ? (page.variations as Record<string, unknown>[]) : []).find((x) => Number(x.id) === variationId);
    return Boolean(v && v.stock_status !== "out_of_stock" && v.purchasable !== false);
  }
  return page.stock_status !== "out_of_stock";
}

/** The waiting customer's variation of a page: one it offers, or 0 (the product). */
function hasVariation(page: Record<string, unknown>, variationId: number): boolean {
  return (Array.isArray(page.variations) ? (page.variations as Record<string, unknown>[]) : []).some((x) => Number(x.id) === variationId);
}

/** The store's connector with the wishlist, reviews with photos and back in stock added (`shopFeaturesOn`). */
export function withShopFeatures(inner: Connector, deps: ShopFeaturesDeps): Connector {
  const { store, app } = deps;
  const call = (request: ConnectorRequest, path: string[], query: Record<string, string> = {}) =>
    inner.handle({ ...request, method: "GET", path, query: new URLSearchParams(query), body: null });

  const productPage = async (request: ConnectorRequest, id: number): Promise<Record<string, unknown> | null> => {
    const r = await call(request, ["store", "products", String(id)]).catch(() => null);
    return r?.status === 200 && r.body && typeof r.body === "object" ? (r.body as Record<string, unknown>) : null;
  };

  /** The products the signed-in customer bought (their orders paid or done), once a request. */
  const boughtCache = new WeakMap<ConnectorRequest, Promise<Set<number>>>();
  const bought = (request: ConnectorRequest): Promise<Set<number>> => {
    if (!request.user) return Promise.resolve(new Set());
    let found = boughtCache.get(request);
    if (!found) {
      found = (async () => {
        const ids = new Set<number>();
        for (let page = 1; page <= 4; page++) {
          const r = await inner.handle({ ...request, method: "GET", path: ["me", "orders"], query: new URLSearchParams({ page: String(page), per_page: "50" }), body: null }).catch(() => null);
          const body = r?.status === 200 ? (r.body as { items?: unknown; total_pages?: unknown }) : null;
          const orders = Array.isArray(body?.items) ? (body!.items as { status?: unknown; items?: unknown; lines?: unknown }[]) : [];
          for (const o of orders) {
            if (!BOUGHT_STATUSES.has(String(o.status ?? ""))) continue;
            const lines = Array.isArray(o.items) ? o.items : Array.isArray(o.lines) ? o.lines : [];
            for (const l of lines as { product_id?: unknown }[]) if (Number.isSafeInteger(Number(l.product_id)) && Number(l.product_id) > 0) ids.add(Number(l.product_id));
          }
          if (!body || Number(body.total_pages ?? 1) <= page) break;
        }
        return ids;
      })();
      boughtCache.set(request, found);
    }
    return found;
  };

  const limited = async (request: ConnectorRequest, rule: RateLimitRule): Promise<ConnectorResult | null> => {
    const result = await hitRateLimit(store, rule, `${app.id}:${request.user!.id}`, request.now);
    if (result.allowed) return null;
    return { status: 429, body: { code: "rate_limited", message: "You've done this a lot in a short time. Please try again later.", retry_after_seconds: result.retryAfter } };
  };
  const signIn = () => error(401, "unauthorized", "Sign in first.");
  const photoUrl = (id: string) => mediaLink(deps.platformUrl, id);

  const reviewJson = (r: ProductReview, mine: boolean) => ({
    id: r.id,
    rating: r.rating,
    text: r.text,
    // Privacy: a first name and an initial only.
    author: { name: r.authorName, avatar_url: null, instructor: false },
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
    // Hidden reviews reach their author only.
    status: r.hidden ? "hidden" : "approved",
    mine,
    reply: r.replyText ? { text: r.replyText, created_at: (r.replyAt ?? r.updatedAt).toISOString() } : null,
    photos: r.photoIds.map((id) => ({ url: photoUrl(id) })),
  });

  /** Ratings on the cards (where the source has none), `wishlisted`, and a page's reviews and back-in-stock state. */
  const overlay = async (result: ConnectorResult | null, request: ConnectorRequest, pageId: number | null): Promise<ConnectorResult | null> => {
    if (!result || result.status !== 200 || !result.body || typeof result.body !== "object") return result;
    const products = productsIn(result.body);
    if (products.length === 0) return result;
    const ids = [...new Set(products.map((p) => p.id))];
    const [rows, saved] = await Promise.all([store.countProductRatings(app.id, ids), request.user ? store.listShopWishlist(app.id, request.user.id) : Promise.resolve([])]);
    const wished = new Set(saved.map((w) => w.productId));
    for (const p of products) {
      const own = productRatingSummary(rows, p.id);
      if (own.rating_count > 0 || p.rating === null || p.rating === undefined) {
        p.rating = own.rating;
        p.rating_count = own.rating_count;
      }
      p.wishlisted = wished.has(p.id);
    }
    if (pageId !== null) {
      const page = result.body as Record<string, unknown>;
      const [shown, photos, mine, waiting] = await Promise.all([
        store.listProductReviews({ appId: app.id, productIds: [pageId], hidden: false, offset: 0, limit: 3 }),
        store.listProductReviews({ appId: app.id, productIds: [pageId], hidden: false, photos: true, offset: 0, limit: 8 }),
        request.user ? store.getProductReviewOf(app.id, pageId, request.user.id) : Promise.resolve(null),
        request.user ? store.listStockAlerts({ appId: app.id, productId: pageId, userId: request.user.id, waiting: true }) : Promise.resolve([] as StockAlert[]),
      ]);
      page.reviews_preview = {
        summary: productRatingSummary(rows, pageId),
        items: shown.items.map((r) => reviewJson(r, r.userId === request.user?.id)),
        photos: photos.items.flatMap((r) => r.photoIds.map((id) => ({ url: photoUrl(id), review_id: r.id }))).slice(0, 12),
        photo_count: photos.total,
        mine: mine ? reviewJson(mine, true) : null,
        can_review: request.user !== null && (await bought(request)).has(pageId),
      };
      page.back_in_stock = {
        waiting: waiting.some((a) => a.variationId === 0),
        variations: waiting.filter((a) => a.variationId !== 0).map((a) => a.variationId),
      };
    }
    return result;
  };

  return {
    async config() {
      const base = await inner.config();
      const own = base.store as Record<string, unknown> | undefined;
      if (!own) return base;
      return {
        ...base,
        store: {
          ...own,
          // Older apps read `reviews` to list a product's reviews; the rest is new.
          reviews: true,
          wishlist: true,
          back_in_stock: true,
          review_photos: deps.uploads ? { max: REVIEW_PHOTOS_MAX, max_bytes: REVIEW_PHOTO_BYTES, types: [...REVIEW_PHOTO_TYPES] } : null,
        },
      };
    },

    async handle(request) {
      const p = request.path;
      if (p[0] === "store") {
        // The wishlist
        if (p[1] === "wishlist") return wishlistRoute(request);
        // A photo for a review
        if (p[1] === "review-uploads") return uploadRoute(request);
        if (p[1] === "products" && p[2] && /^\d{1,15}$/.test(p[2])) {
          const id = Number(p[2]);
          if (p.length === 4 && p[3] === "reviews" && request.method === "GET") return listReviews(request, id);
          if (p.length === 5 && p[3] === "reviews" && p[4] === "mine") {
            if (request.method === "PUT") return saveReview(request, id);
            if (request.method === "DELETE") return deleteReview(request, id);
          }
          if (p.length === 4 && p[3] === "back-in-stock") return stockRoute(request, id);
        }
        if (p[1] === "back-in-stock" && p.length === 2 && request.method === "GET") return waitingRoute(request);
      }
      const result = await inner.handle(request);
      // A connected platform's lists carry no choices: its filter element offers the sort only.
      if (!result && request.method === "GET" && p[0] === "store" && p[1] === "filters" && p.length === 2) {
        return { status: 200, body: { choices: [], price: null, brands: [], sorts: ["newest", "popular", "price_asc", "price_desc"] } };
      }
      if (request.method === "GET" && p[0] === "store" && (p[1] === "products" || p[1] === "home" || p[1] === "flash-sales") && p.length <= 3) {
        const page = p[1] === "products" && p.length === 3 && /^\d{1,15}$/.test(p[2]!) ? Number(p[2]) : null;
        return overlay(result, request, page);
      }
      return result;
    },

    taggedProducts: inner.taggedProducts?.bind(inner),
  };

  async function wishlistRoute(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const p = request.path;
    const user = request.user;
    if (p.length === 2 && request.method === "GET") {
      const saved = await store.listShopWishlist(app.id, user.id);
      const ids = saved.map((w) => w.productId);
      const page = intParam(request.query, "page", 1, 100);
      const perPage = intParam(request.query, "per_page", 20, 50);
      const slice = ids.slice((page - 1) * perPage, page * perPage);
      // The products as the shop serves them now (one it no longer sells drops out).
      const list = slice.length ? await call(request, ["store", "products"], { ids: slice.join(","), per_page: String(slice.length) }).catch(() => null) : null;
      const byId = new Map(((list?.status === 200 ? (list.body as { items?: Summary[] }).items : undefined) ?? []).map((x) => [x.id, x]));
      const items = slice.map((id) => byId.get(id)).filter((x): x is Summary => Boolean(x));
      const answer = await overlay({ status: 200, body: { items } }, request, null);
      return {
        status: 200,
        body: { ids, page, per_page: perPage, total: ids.length, total_pages: Math.max(1, Math.ceil(ids.length / perPage)), items: (answer?.body as { items: unknown[] }).items },
      };
    }
    if (p.length === 3 && p[2] === "merge" && request.method === "POST") {
      const raw = (request.body as { product_ids?: unknown } | null)?.product_ids;
      if (!Array.isArray(raw)) return error(400, "invalid_request", "Send product_ids.");
      const wait = await limited(request, WISHLIST_LIMIT);
      if (wait) return wait;
      const have = new Set((await store.listShopWishlist(app.id, user.id)).map((w) => w.productId));
      for (const id of raw.slice(0, WISHLIST_MAX)) {
        if (have.size >= WISHLIST_MAX) break;
        const n = Number(id);
        if (!Number.isSafeInteger(n) || n < 1 || have.has(n)) continue;
        await store.addShopWishlist(app.id, user.id, n, request.now);
        have.add(n);
      }
      return { status: 200, body: { ids: (await store.listShopWishlist(app.id, user.id)).map((w) => w.productId) } };
    }
    if (p.length === 3 && /^\d{1,15}$/.test(p[2]!)) {
      const id = Number(p[2]);
      if (request.method === "DELETE") {
        await store.removeShopWishlist(app.id, user.id, id);
        return { status: 204 };
      }
      if (request.method === "PUT") {
        const wait = await limited(request, WISHLIST_LIMIT);
        if (wait) return wait;
        const have = await store.listShopWishlist(app.id, user.id);
        if (have.some((w) => w.productId === id)) return { status: 204 };
        if (have.length >= WISHLIST_MAX) return error(409, "wishlist_full", `Your wishlist holds up to ${WISHLIST_MAX} products. Remove some first.`);
        if (!(await productPage(request, id))) return error(404, "not_found", "Product not found.");
        await store.addShopWishlist(app.id, user.id, id, request.now);
        return { status: 204 };
      }
    }
    return error(405, "method_not_allowed", "Not allowed.");
  }

  async function listReviews(request: ConnectorRequest, productId: number): Promise<ConnectorResult> {
    // A product the shop doesn't sell has no reviews to list.
    if (!(await productPage(request, productId))) return error(404, "not_found", "Product not found.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 10, 50);
    const photos = request.query.get("photos") === "1" || request.query.get("photos") === "true";
    const [list, rows, own] = await Promise.all([
      store.listProductReviews({ appId: app.id, productIds: [productId], hidden: false, photos, offset: (page - 1) * perPage, limit: perPage }),
      store.countProductRatings(app.id, [productId]),
      request.user ? store.getProductReviewOf(app.id, productId, request.user.id) : Promise.resolve(null),
    ]);
    const summary = productRatingSummary(rows, productId);
    return {
      status: 200,
      body: {
        page,
        per_page: perPage,
        total: list.total,
        total_pages: Math.max(1, Math.ceil(list.total / perPage)),
        items: list.items.map((r) => reviewJson(r, r.userId === request.user?.id)),
        summary: { rating: summary.rating, rating_count: summary.rating_count, counts: summary.counts },
        mine: own ? reviewJson(own, true) : null,
        can_review: request.user !== null && (await bought(request)).has(productId),
      },
    };
  }

  /** The customer's own ready photos (pictures they sent for reviews; never chat files). */
  async function ownPhotos(ids: string[], keep: string[]): Promise<string[] | null> {
    const out: string[] = [];
    for (const id of ids) {
      if (keep.includes(id)) {
        out.push(id);
        continue;
      }
      const file = await store.getMediaFile(app.id, id);
      if (!file || file.status !== "ready" || file.kind !== "image" || file.source === "chat") return null;
      out.push(id);
    }
    return out;
  }

  async function saveReview(request: ConnectorRequest, productId: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const read = readProductReview(request.body);
    if (!read.ok) return error(400, "invalid_request", read.error);
    if (!(await bought(request)).has(productId)) return error(403, "not_bought", "Only customers who bought this product can review it.");
    const page = await productPage(request, productId);
    if (!page) return error(404, "not_found", "Product not found.");
    const before = await store.getProductReviewOf(app.id, productId, request.user.id);
    const photoIds = await ownPhotos(read.photoIds, before?.photoIds ?? []);
    if (!photoIds) return error(400, "invalid_request", "A photo isn't ready. Send it again.");
    const wait = await limited(request, SHOP_REVIEW_LIMIT);
    if (wait) return wait;
    const review = await store.saveProductReview({
      appId: app.id,
      productId,
      userId: request.user.id,
      rating: read.rating,
      text: read.text,
      photoIds,
      authorName: shortName(request.user.name),
      now: request.now,
    });
    if (!before) {
      try {
        await deps.onReview?.({ review, productName: String(page.name ?? ""), user: request.user });
      } catch {
        // The review is saved either way.
      }
    }
    return { status: 200, body: reviewJson(review, true) };
  }

  async function deleteReview(request: ConnectorRequest, productId: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const own = await store.getProductReviewOf(app.id, productId, request.user.id);
    if (own) await store.deleteProductReview(app.id, own.id);
    return { status: 204 };
  }

  async function uploadRoute(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const uploads = deps.uploads;
    if (!uploads) return error(503, "media_unavailable", "Photos can't be sent right now.");
    const p = request.path;
    if (p.length === 2 && request.method === "POST") {
      const body = (request.body ?? {}) as Record<string, unknown>;
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
      const size = typeof body.size === "number" ? body.size : Number.NaN;
      const type = typeof body.type === "string" ? body.type : "";
      if (!name || !type) return error(400, "invalid_request", "Send the photo's name, size and type.");
      if (!(REVIEW_PHOTO_TYPES as readonly string[]).includes(type) || kindOf(type, MEDIA_KINDS)?.kind !== "image") return error(400, "invalid_request", "Send a photo (JPEG, PNG or WebP).");
      if (!Number.isSafeInteger(size) || size < 1) return error(400, "invalid_request", "This photo is empty.");
      if (size > REVIEW_PHOTO_BYTES) return error(413, "too_big", "A photo can be up to 8 MB.");
      // Only a customer who bought something from the shop sends photos.
      if ((await bought(request)).size === 0) return error(403, "not_bought", "Only customers who bought from the shop can send photos.");
      const wait = await limited(request, UPLOAD_LIMIT);
      if (wait) return wait;
      const started = await startUpload(
        { store, storage: uploads.storage, now: request.now, limitBytes: await uploads.limitBytes(), chunkBytes: uploads.chunkBytes },
        { appId: app.id, name: `Review · ${shortName(request.user.name) || "customer"} · ${name}`.slice(0, 200), size, contentType: type },
      );
      if (!started.ok) {
        if (started.code === "storage_full") return error(413, "storage_full", "There's no room for photos in the shop's storage right now.");
        if (started.code === "too_big") return error(413, "too_big", started.message);
        return error(400, "invalid_request", started.message);
      }
      return { status: 201, body: { id: started.file.id, kind: started.file.kind, upload_url: started.uploadUrl, chunk_bytes: started.chunkBytes, size: started.file.sizeBytes } };
    }
    if (p.length === 4 && request.method === "POST" && (p[3] === "resume" || p[3] === "complete")) {
      const file: MediaFile | null = /^[0-9a-f-]{36}$/.test(p[2]!) ? await store.getMediaFile(app.id, p[2]!) : null;
      const mine = file && file.kind === "image" && file.source !== "chat" ? file : null;
      if (p[3] === "resume") {
        if (!mine || mine.status !== "uploading") return error(404, "not_found", "Upload not found.");
        return { status: 200, body: { id: mine.id, kind: mine.kind, upload_url: uploadUrl(uploads.storage, mine), chunk_bytes: uploads.chunkBytes, size: mine.sizeBytes } };
      }
      if (!mine) return error(404, "not_found", "Upload not found.");
      if (mine.status === "ready") return { status: 200, body: { id: mine.id, url: photoUrl(mine.id) } };
      const done = await completeUpload({ store, storage: uploads.storage, now: request.now }, app.id, mine.id);
      if (!done.ok) return { status: 409, body: { code: "incomplete", message: done.message, ...(done.offset !== undefined ? { offset: done.offset } : {}) } };
      return { status: 200, body: { id: mine.id, url: photoUrl(mine.id) } };
    }
    return error(405, "method_not_allowed", "Not allowed.");
  }

  async function stockRoute(request: ConnectorRequest, productId: number): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const raw = request.method === "DELETE" ? request.query.get("variation_id") : (request.body as { variation_id?: unknown } | null)?.variation_id;
    const variationId = raw === undefined || raw === null || raw === "" ? 0 : Number(raw);
    if (!Number.isSafeInteger(variationId) || variationId < 0) return error(400, "invalid_request", "Unknown variation.");
    if (request.method === "DELETE") {
      await store.deleteStockAlert(app.id, request.user.id, productId, variationId);
      return { status: 204 };
    }
    if (request.method !== "PUT") return error(405, "method_not_allowed", "Not allowed.");
    const page = await productPage(request, productId);
    if (!page) return error(404, "not_found", "Product not found.");
    if (variationId && !hasVariation(page, variationId)) return error(404, "not_found", "This choice isn't sold.");
    if (inStock(page, variationId)) return error(409, "in_stock", "It's in stock now: add it to your cart.");
    const waiting = await store.listStockAlerts({ appId: app.id, userId: request.user.id, waiting: true });
    if (!waiting.some((a) => a.productId === productId && a.variationId === variationId) && waiting.length >= STOCK_ALERTS_MAX) {
      return error(409, "too_many", `You can wait for up to ${STOCK_ALERTS_MAX} products at once.`);
    }
    const wait = await limited(request, STOCK_LIMIT);
    if (wait) return wait;
    await store.saveStockAlert({ appId: app.id, productId, variationId, userId: request.user.id, productName: String(page.name ?? "").slice(0, 160), createdAt: request.now });
    return { status: 200, body: { product_id: productId, variation_id: variationId || null, waiting: true } };
  }

  async function waitingRoute(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return signIn();
    const waiting = await store.listStockAlerts({ appId: app.id, userId: request.user.id, waiting: true });
    return { status: 200, body: { items: waiting.map((a) => ({ product_id: a.productId, variation_id: a.variationId || null, name: a.productName, created_at: a.createdAt.toISOString() })) } };
  }
}

/** How many customers wait for each product and variation (the owner's counts), most first. */
export async function stockAlertCounts(store: DataStore, appId: string): Promise<{ productId: number; variationId: number; name: string; count: number }[]> {
  const waiting = await store.listStockAlerts({ appId, waiting: true });
  const by = new Map<string, { productId: number; variationId: number; name: string; count: number }>();
  for (const a of waiting) {
    const key = `${a.productId}:${a.variationId}`;
    const row = by.get(key) ?? { productId: a.productId, variationId: a.variationId, name: a.productName, count: 0 };
    row.count++;
    by.set(key, row);
  }
  return [...by.values()].sort((a, b) => b.count - a.count || a.productId - b.productId);
}

/** "It's back" in the customer's language (Modern Standard Arabic). */
export const BACK_IN_STOCK_MAIL = {
  en: (product: string, shop: string) => ({ subject: `${product} is back in stock`, text: `Good news: ${product} is back in stock at ${shop}. Open the app to order it before it runs out again.` }),
  ar: (product: string, shop: string) => ({ subject: `عاد ${product} إلى المخزون`, text: `خبر سار: عاد ${product} متوفرًا لدى ${shop}. افتح التطبيق واطلبه قبل أن ينفد مرة أخرى.` }),
  tr: (product: string, shop: string) => ({ subject: `${product} yeniden stokta`, text: `Müjde: ${product}, ${shop} mağazasında yeniden stokta. Tükenmeden sipariş vermek için uygulamayı açın.` }),
};

export interface StockRunDeps extends AutoDeps {
  /** The app's store connector (the products' pages), or null when it has none. */
  connectorOf: (app: App) => Connector | null;
  /** Emails a waiting customer in the app's name, when the app's email goes out. */
  mail?: GuestMailer;
  /** How many apps a run looks at, and how many products of each. */
  apps?: number;
  products?: number;
}

/**
 * The products customers wait for, looked at: those back in stock (or the
 * variation they wait for) tell each of them once (a push, the inbox, and
 * an email when the app's email goes out), and their wait ends. Yallapp's
 * own shops every run (and at once when the owner saves the stock); a
 * connected platform's every 15 minutes.
 */
export async function runStockAlerts(deps: StockRunDeps): Promise<{ apps: number; looked: number; told: number }> {
  const out = { apps: 0, looked: 0, told: 0 };
  const quarter = deps.now.getUTCMinutes() % 15 < 5;
  for (const appId of await deps.store.listAppsWithStockAlerts(deps.apps ?? 50)) {
    const app = await deps.store.getAppById(appId);
    if (!app || !shopFeaturesOn(app) || app.deletedAt) continue;
    if (app.connector?.kind !== "catalog" && !quarter) continue;
    out.apps++;
    try {
      const told = await tellBackInStock(deps, app);
      out.looked += told.looked;
      out.told += told.told;
    } catch (e) {
      console.error(`[stock] app ${app.id}: ${e instanceof Error ? e.message : String(e)}`.slice(0, 400));
    }
  }
  return out;
}

/** One app's waiting customers (of `productIds` only, when given) told of what's back. */
export async function tellBackInStock(deps: StockRunDeps, app: App, productIds?: number[]): Promise<{ looked: number; told: number }> {
  const connector = deps.connectorOf(app);
  if (!connector) return { looked: 0, told: 0 };
  const waiting = (await deps.store.listStockAlerts({ appId: app.id, waiting: true })).filter((a) => !productIds || productIds.includes(a.productId));
  const byProduct = new Map<number, StockAlert[]>();
  for (const a of waiting) byProduct.set(a.productId, [...(byProduct.get(a.productId) ?? []), a]);
  let looked = 0;
  let told = 0;
  for (const [productId, alerts] of [...byProduct].slice(0, deps.products ?? 30)) {
    looked++;
    const r = await connector.handle({ method: "GET", path: ["store", "products", String(productId)], query: new URLSearchParams(), body: null, user: null, now: deps.now }).catch(() => null);
    const page = r?.status === 200 && r.body && typeof r.body === "object" ? (r.body as Record<string, unknown>) : null;
    // A product the shop no longer sells: its waits end quietly.
    if (!page) {
      if (r?.status === 404) await deps.store.markStockAlertsNotified(app.id, alerts.map((a) => a.id), deps.now);
      continue;
    }
    const back = alerts.filter((a) => inStock(page, a.variationId));
    if (back.length === 0) continue;
    const name = String(page.name ?? alerts[0]!.productName).slice(0, 120);
    await notifyAuto(
      deps,
      app,
      "back_in_stock",
      back.map((a) => ({ userId: a.userId, ref: `stock:${a.id}:${a.createdAt.getTime()}`, values: { product: name }, data: { product_id: String(productId), ...(a.variationId ? { variation_id: String(a.variationId) } : {}) } })),
      // The customer asked for it: it goes whatever the owner's switch says.
      { always: true },
    );
    if (deps.mail) {
      for (const a of back) {
        const user = await deps.store.getHostedUser(app.id, a.userId);
        const to = user?.email?.trim();
        if (!to) continue;
        const devices = await deps.store.listHostedPushDevices(app.id, [a.userId]);
        const words = BACK_IN_STOCK_MAIL[mailLang(devices.find((d) => d.language)?.language)](name, app.appName?.trim() || "—");
        await deps.mail(app, to, words).catch(() => undefined);
      }
    }
    await deps.store.markStockAlertsNotified(app.id, back.map((a) => a.id), deps.now);
    told += back.length;
  }
  return { looked, told };
}

function mailLang(lang: string | null | undefined): "en" | "ar" | "tr" {
  const code = (lang ?? "").toLowerCase().split(/[-_]/)[0];
  return code === "ar" || code === "tr" ? code : "en";
}
