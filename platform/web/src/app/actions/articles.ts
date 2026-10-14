"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { getClientContext, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { DataStore } from "@/lib/data/store";
import type { App, Article } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { encryptionKey } from "@/lib/env";
import { formValues, type FormState } from "@/lib/forms";
import { announce, serviceAccountOf } from "@/lib/hosted/notify";
import { imageType } from "@/lib/images";
import { ARTICLE_CATEGORIES_MAX, ARTICLE_IMAGE_MAX_BYTES, breakingNewsText, parseArticleForm, parseCategoryName, parseNewsSettings } from "@/lib/news/forms";
import { hasFeature } from "@/lib/plans";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * 23 The Articles page of News & blog apps without a website: articles
 * (drafts, published, top stories), their sections and how they show in the
 * app. Publishing can send the article as breaking news.
 */

/** An active client whose app's articles are written in the dashboard, or a redirect. */
async function requireArticlesApp(): Promise<ClientContext & { app: App }> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "articles") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function refresh() {
  revalidatePath("/dashboard/articles", "layout");
}

/**
 * Sends a published article as breaking news: to every reader's inbox, and
 * pushed when the plan has push and Firebase is set up. Returns what to tell
 * the owner.
 */
async function sendBreakingNews(context: ClientContext & { app: App }, store: DataStore, article: Article, now: Date): Promise<string> {
  const limit = await hitRateLimit(store, RATE_LIMITS.hostedNotify, context.app.id, now);
  if (!limit.allowed) return "not sent: you've sent many notifications in a short time. Try again in an hour";
  const push = hasFeature(await appPlan(store, context.license, now), "push");
  const text = breakingNewsText(article);
  const result = await announce({
    store,
    app: context.app,
    title: text.title,
    body: text.body,
    articleId: String(article.id),
    account: push ? serviceAccountOf(context.app, encryptionKey()) : null,
    now,
  });
  await recordStaffChange(context, `Sent "${text.title}" as breaking news`);
  if (!push || result.pushError) return "sent to your readers' inboxes";
  return `sent to ${result.pushed} ${result.pushed === 1 ? "phone" : "phones"}`;
}

/** Saves the picture a form sent, if any: its asset ID, or an error. */
async function savePicture(context: ClientContext, formData: FormData, now: Date): Promise<{ assetId: string | null } | { error: string }> {
  const file = formData.get("image");
  if (!file || typeof file === "string" || file.size === 0) return { assetId: null };
  if (file.size > ARTICLE_IMAGE_MAX_BYTES) return { error: `The picture can be up to ${ARTICLE_IMAGE_MAX_BYTES / 1024 / 1024} MB.` };
  const data = Buffer.from(await file.arrayBuffer());
  const type = imageType(data);
  if (!type) return { error: "The picture must be a PNG or JPEG file." };
  const assetId = newId();
  const blobKey = `assets/${context.client.id}/${assetId}.${type.extension}`;
  await getBlobStore().put(blobKey, data, type.contentType);
  await (await getStore()).createAsset({
    id: assetId,
    clientId: context.client.id,
    kind: "product_image",
    blobKey,
    contentType: type.contentType,
    size: data.length,
    createdAt: now,
  });
  return { assetId };
}

export async function saveArticleAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireArticlesApp();
  const { app } = context;
  const store = await getStore();
  const now = new Date();
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const existing = id !== null && Number.isSafeInteger(id) ? await store.getArticle(app.id, id) : null;
  if (id !== null && !existing) return { message: "This article doesn't exist anymore." };

  const values = formValues(formData);
  const categories = await store.listArticleCategories(app.id);
  const parsed = parseArticleForm(values, formData.getAll("categories").map(String), new Set(categories.map((c) => c.id)));
  if (!parsed.ok) return { errors: parsed.errors, values };
  const picture = await savePicture(context, formData, now);
  if ("error" in picture) return { errors: { image: picture.error }, values };
  const imageAssetId = picture.assetId ?? (formData.get("removeImage") === "on" ? null : (existing?.imageAssetId ?? null));

  const publish = formData.get("intent") === "publish";
  let article: Article;
  if (existing) {
    const patch = { ...parsed.value, imageAssetId, ...(publish && existing.status !== "published" ? { status: "published" as const, publishedAt: existing.publishedAt ?? now } : {}) };
    await store.updateArticle(app.id, existing.id, patch, now);
    article = { ...existing, ...patch };
  } else {
    article = await store.createArticle(
      { ...parsed.value, appId: app.id, imageAssetId, featured: false, status: publish ? "published" : "draft", publishedAt: publish ? now : null },
      now,
    );
  }
  const newlyPublished = publish && existing?.status !== "published";
  const breaking = newlyPublished && formData.get("breaking") === "on" ? await sendBreakingNews(context, store, article, now) : null;
  refresh();
  const query = new URLSearchParams({ saved: article.title });
  if (newlyPublished) query.set("published", "1");
  if (breaking) query.set("breaking", breaking);
  redirect(`/dashboard/articles?${query}`);
}

/** Publish (optionally as breaking news) or unpublish. */
export async function setArticleStatusAction(formData: FormData): Promise<void> {
  const context = await requireArticlesApp();
  const { app } = context;
  const store = await getStore();
  const id = Number(formData.get("id"));
  const status = formData.get("status");
  const article = Number.isSafeInteger(id) ? await store.getArticle(app.id, id) : null;
  let breaking: string | null = null;
  if (article && (status === "published" || status === "draft") && article.status !== status) {
    const now = new Date();
    const patch = { status, ...(status === "published" && !article.publishedAt ? { publishedAt: now } : {}) } as const;
    await store.updateArticle(app.id, article.id, patch, now);
    if (status === "published" && formData.get("breaking") === "on") breaking = await sendBreakingNews(context, store, { ...article, ...patch }, now);
  }
  refresh();
  redirect(`/dashboard/articles/${id}${breaking ? `?breaking=${encodeURIComponent(breaking)}` : ""}`);
}

export async function setArticleFeaturedAction(formData: FormData): Promise<void> {
  const { app } = await requireArticlesApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  if (Number.isSafeInteger(id) && (await store.getArticle(app.id, id))) {
    await store.updateArticle(app.id, id, { featured: formData.get("featured") === "on" }, new Date());
  }
  refresh();
  redirect(`/dashboard/articles/${id}`);
}

export async function deleteArticleAction(formData: FormData): Promise<void> {
  const context = await requireArticlesApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  const article = Number.isSafeInteger(id) ? await store.getArticle(context.app.id, id) : null;
  if (article) {
    await store.deleteArticle(context.app.id, article.id);
    await recordStaffChange(context, `Deleted the article "${article.title}"`);
  }
  refresh();
  redirect(`/dashboard/articles${article ? `?deleted=${encodeURIComponent(article.title)}` : ""}`);
}

// Sections

export async function addArticleCategoryAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireArticlesApp();
  const store = await getStore();
  const categories = await store.listArticleCategories(app.id);
  if (categories.length >= ARTICLE_CATEGORIES_MAX) return { message: `You can have up to ${ARTICLE_CATEGORIES_MAX} sections.` };
  const name = parseCategoryName(String(formData.get("name") ?? ""), categories.map((c) => c.name));
  if (!name.ok) return { errors: { name: name.error }, values: { name: String(formData.get("name") ?? "") } };
  const position = categories.reduce((max, c) => Math.max(max, c.position + 1), 0);
  await store.createArticleCategory({ appId: app.id, name: name.value, position, createdAt: new Date() });
  refresh();
  return { ok: true, message: `Added “${name.value}”.` };
}

export async function renameArticleCategoryAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireArticlesApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  const categories = await store.listArticleCategories(app.id);
  const category = categories.find((c) => c.id === id);
  if (!category) return { message: "This section doesn't exist anymore." };
  const name = parseCategoryName(
    String(formData.get("name") ?? ""),
    categories.filter((c) => c.id !== id).map((c) => c.name),
  );
  if (!name.ok) return { errors: { name: name.error }, values: { name: String(formData.get("name") ?? "") } };
  await store.updateArticleCategory(app.id, id, { name: name.value });
  refresh();
  return { ok: true, message: "Saved." };
}

/** Moves a section up or down, or deletes it (its articles keep their other sections). */
export async function changeArticleCategoryAction(formData: FormData): Promise<void> {
  const { app } = await requireArticlesApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  const op = formData.get("op");
  const categories = await store.listArticleCategories(app.id);
  const at = categories.findIndex((c) => c.id === id);
  if (at !== -1) {
    if (op === "delete") {
      await store.deleteArticleCategory(app.id, id);
    } else if (op === "up" || op === "down") {
      const other = categories[op === "up" ? at - 1 : at + 1];
      if (other) {
        // Positions are renumbered in the new order, so equal positions can't stick.
        const order = categories.map((c) => c.id);
        [order[at], order[op === "up" ? at - 1 : at + 1]] = [other.id, id];
        for (const [position, categoryId] of order.entries()) await store.updateArticleCategory(app.id, categoryId, { position });
      }
    }
  }
  refresh();
  redirect("/dashboard/articles#sections");
}

export async function saveNewsSettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireArticlesApp();
  await (await getStore()).saveNewsSettings(app.id, parseNewsSettings(formValues(formData)), new Date());
  refresh();
  return { ok: true, message: "Saved. The app shows it the next time it opens." };
}
