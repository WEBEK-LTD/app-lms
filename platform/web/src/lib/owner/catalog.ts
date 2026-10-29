import { MEDIA_ASSET_PREFIX } from "../assets";
import { readProductNumbers } from "../catalog/product-fields";
import { centsToDecimal } from "../catalog/money";
import { saveLesson, setCourseActive } from "../courses/edit";
import { courseSetup } from "../courses/setup";
import type { App, Article, CatalogProduct, Course, CourseSetup, Listing } from "../data/types";
import { formatListingPrice } from "../listings/json";
import { setListingStatus } from "../listings/office";
import { isMediaId, mediaLink, parseMediaLink } from "../media/files";
import { changeArticleStatus } from "../news/status";
import { bodyObject, intParam, invalid, notFound, type OwnerContext, type OwnerResult } from "./http";
import { appScope, money } from "./sales";

/**
 * 58 Quick edits from the phone, with the dashboard's rules: products and
 * menu items (price, sale price, stock, available), courses (publish, add a
 * lesson with a video from Media), articles and listings (publish, feature).
 */

function assetLink(baseUrl: string, assetId: string | undefined): string | null {
  if (!assetId) return null;
  if (assetId.startsWith(MEDIA_ASSET_PREFIX)) return `${baseUrl}/m/${assetId.slice(MEDIA_ASSET_PREFIX.length)}`;
  return `${baseUrl}/api/v1/assets/${assetId}`;
}

function currencyOf(app: App): string {
  return app.catalogSettings?.currency ?? "TRY";
}

function productJson(ctx: OwnerContext, app: App, p: CatalogProduct) {
  const currency = currencyOf(app);
  return {
    id: p.id,
    name: p.name,
    price: money(p.priceCents, currency),
    sale_price: p.salePriceCents !== null ? money(p.salePriceCents, currency) : null,
    stock: p.stock,
    available: p.active,
    image_url: assetLink(ctx.deps.baseUrl, p.imageAssetIds[0]),
    sales: p.salesCount,
  };
}

export async function listProducts(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "products");
  const products = await ctx.deps.store.listCatalogProducts(app.id);
  return { status: 200, body: { items: products.map((p) => productJson(ctx, app, p)) } };
}

/** The product form's rules for price, sale price and stock; `available` is its "Show in the app". */
export async function updateProduct(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "products");
  const { store, now } = ctx.deps;
  const product = await store.getCatalogProduct(app.id, intParam(params.product_id));
  if (!product) throw notFound();
  const body = bodyObject(ctx.req.body);
  const has = (key: string) => Object.hasOwn(body, key);
  if (!["price", "sale_price", "stock", "available"].some(has)) throw invalid(undefined, "Send what to change.");
  const text = (value: unknown) => (value === null || value === undefined ? "" : typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "\u0000");
  const numbers = readProductNumbers({
    price: has("price") ? text(body.price) : centsToDecimal(product.priceCents),
    salePrice: has("sale_price") ? text(body.sale_price) : product.salePriceCents !== null ? centsToDecimal(product.salePriceCents) : "",
    stock: has("stock") ? text(body.stock) : product.stock !== null ? String(product.stock) : "",
  });
  const errors: Record<string, string> = {};
  if (numbers.errors.price) errors.price = numbers.errors.price;
  if (numbers.errors.salePrice) errors.sale_price = numbers.errors.salePrice;
  if (numbers.errors.stock) errors.stock = numbers.errors.stock;
  if (has("available") && typeof body.available !== "boolean") errors.available = "The request isn't valid.";
  if (Object.keys(errors).length) throw invalid(errors);
  await store.updateCatalogProduct(
    app.id,
    product.id,
    // 110.2 A sample product priced from the Business app is the owner's from now on.
    { priceCents: numbers.priceCents!, salePriceCents: numbers.salePriceCents, stock: numbers.stock, sample: false, ...(has("available") ? { active: body.available as boolean } : {}) },
    now,
  );
  return { status: 200, body: productJson(ctx, app, (await store.getCatalogProduct(app.id, product.id))!) };
}

// Courses managed in Yallapp

function courseJson(ctx: OwnerContext, setup: CourseSetup, course: Course, students: number) {
  return {
    id: course.id,
    title: course.title,
    published: course.active,
    price: money(course.priceCents, setup.currency),
    students,
    topics: course.topics.map((t) => ({
      id: t.id,
      title: t.title,
      lessons: t.lessons.map((l) => {
        const mediaId = parseMediaLink(l.videoUrl, ctx.deps.baseUrl);
        return { id: l.id, title: l.title, video: mediaId ? "media" : l.videoUrl ? "link" : "none", media_id: mediaId, duration_minutes: l.durationMinutes, preview: l.preview };
      }),
    })),
  };
}

async function studentsOf(ctx: OwnerContext, app: App): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  for (const e of await ctx.deps.store.listCourseEnrollments({ appId: app.id })) counts.set(e.courseId, (counts.get(e.courseId) ?? 0) + 1);
  return counts;
}

export async function listCourses(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "courses");
  const setup = courseSetup(app);
  const students = await studentsOf(ctx, app);
  return { status: 200, body: { items: setup.courses.map((c) => courseJson(ctx, setup, c, students.get(c.id) ?? 0)) } };
}

/** Reads the app again, so two quick edits in a row build on each other. */
async function freshApp(ctx: OwnerContext, app: App): Promise<App> {
  return (await ctx.deps.store.getAppById(app.id)) ?? app;
}

async function courseAnswer(ctx: OwnerContext, app: App, setup: CourseSetup, courseId: number, status: number): Promise<OwnerResult> {
  const course = setup.courses.find((c) => c.id === courseId)!;
  return { status, body: courseJson(ctx, setup, course, (await studentsOf(ctx, app)).get(courseId) ?? 0) };
}

export async function updateCourse(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const app = await freshApp(ctx, appScope(ctx, params.app_id, "courses").app);
  const published = bodyObject(ctx.req.body).published;
  if (typeof published !== "boolean") throw invalid({ published: "The request isn't valid." });
  const setup = setCourseActive(courseSetup(app), intParam(params.course_id), published);
  if (!setup) throw notFound();
  await ctx.deps.store.updateApp(app.id, { courseSetup: setup }, ctx.deps.now);
  return courseAnswer(ctx, app, setup, intParam(params.course_id), 200);
}

/** A new lesson in a section, its video from the app's Media library or an https address. */
export async function addLesson(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const app = await freshApp(ctx, appScope(ctx, params.app_id, "courses").app);
  const courseId = intParam(params.course_id);
  const topicId = intParam(params.topic_id);
  const body = bodyObject(ctx.req.body);
  const { store, baseUrl } = ctx.deps;
  let videoUrl = typeof body.video_url === "string" ? body.video_url.trim() : "";
  if (body.video_media_id !== undefined && body.video_media_id !== null) {
    const id = typeof body.video_media_id === "string" ? body.video_media_id : "";
    const file = isMediaId(id) ? await store.getMediaFile(app.id, id) : null;
    if (!file || file.kind !== "video" || file.status !== "ready") throw invalid({ video_media_id: "Choose a video from your Media library." });
    videoUrl = mediaLink(baseUrl, file.id);
  }
  const duration = body.duration_minutes;
  const v: Record<string, string> = {
    title: typeof body.title === "string" ? body.title.trim() : "",
    videoUrl,
    text: typeof body.text === "string" ? body.text.trim() : "",
    duration: duration === undefined || duration === null ? "" : String(duration),
    preview: body.preview === true ? "on" : "",
  };
  const setup = courseSetup(app);
  if (!setup.courses.some((c) => c.id === courseId)) throw notFound();
  // The lesson form's rules; a video address on Yallapp must be one of this app's files.
  const saved = saveLesson(setup, courseId, topicId, v, (url) => {
    const id = parseMediaLink(url, baseUrl);
    return id !== null && id === parseMediaLink(videoUrl, baseUrl);
  });
  if (!saved.ok) {
    if (saved.errors) throw invalid(Object.fromEntries(Object.entries(saved.errors).map(([k, text]) => [k === "videoUrl" ? "video_url" : k === "duration" ? "duration_minutes" : k, text])));
    throw notFound();
  }
  await store.updateApp(app.id, { courseSetup: saved.setup }, ctx.deps.now);
  return courseAnswer(ctx, app, saved.setup, courseId, 201);
}

// Articles and listings

function articleJson(a: Article) {
  return { id: a.id, title: a.title, status: a.status, featured: a.featured, published_at: a.publishedAt?.toISOString() ?? null, updated_at: a.updatedAt.toISOString() };
}

export async function listArticles(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "articles");
  return { status: 200, body: { items: (await ctx.deps.store.listArticles(app.id)).map(articleJson) } };
}

export async function updateArticle(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "articles");
  const { store, now } = ctx.deps;
  const article = await store.getArticle(app.id, intParam(params.article_id));
  if (!article) throw notFound();
  const body = bodyObject(ctx.req.body);
  if (body.status === undefined && body.featured === undefined) throw invalid(undefined, "Send what to change.");
  if (body.status !== undefined && body.status !== "published" && body.status !== "draft") throw invalid({ status: "The request isn't valid." });
  if (body.featured !== undefined && typeof body.featured !== "boolean") throw invalid({ featured: "The request isn't valid." });
  if (body.status !== undefined) await changeArticleStatus(store, article, body.status, now);
  if (typeof body.featured === "boolean") await store.updateArticle(app.id, article.id, { featured: body.featured }, now);
  return { status: 200, body: articleJson((await store.getArticle(app.id, article.id))!) };
}

function listingJson(l: Listing) {
  return { id: l.id, title: l.title, status: l.status, featured: l.featured, price: formatListingPrice(l.priceCents, l.currency), city: l.city };
}

export async function listListings(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "listings");
  return { status: 200, body: { items: (await ctx.deps.store.listListings(app.id)).map(listingJson) } };
}

export async function updateListing(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "listings");
  const { store, now } = ctx.deps;
  const listing = await store.getListing(app.id, intParam(params.listing_id));
  if (!listing) throw notFound();
  const body = bodyObject(ctx.req.body);
  if (body.status === undefined && body.featured === undefined) throw invalid(undefined, "Send what to change.");
  if (body.featured !== undefined && typeof body.featured !== "boolean") throw invalid({ featured: "The request isn't valid." });
  if (body.status !== undefined && !(await setListingStatus(store, listing, body.status, now))) throw invalid({ status: "The request isn't valid." });
  if (typeof body.featured === "boolean") await store.updateListing(app.id, listing.id, { featured: body.featured }, now);
  return { status: 200, body: listingJson((await store.getListing(app.id, listing.id))!) };
}
