import { completeUpload, deleteMedia, isMediaId, mediaLink, uploadUrl } from "../media/files";
import type { MediaFile, MediaKind } from "../data/types";
import { effectivePlans } from "../entitlements";
import { formatBytes } from "../media/quota";
import { MEDIA_CHUNK_BYTES } from "../media/signing";
import { startAppUpload } from "../media/start";
import { appStorage, resolveStorageNotices } from "../media/usage";
import { serviceAccountOf } from "../hosted/notify";
import { replyToInquiry } from "../listings/office";
import { bodyObject, intParam, invalid, notFound, OwnerError, pageJson, paging, rateLimited, type OwnerContext, type OwnerResult } from "./http";
import { appScope } from "./sales";

/**
 * 58 The Media library from the phone (uploads straight to the media gate,
 * with the dashboard's limits), the office's conversations, and the app's
 * users.
 */

const MEDIA_KINDS: MediaKind[] = ["video", "image", "pdf"];

function fileJson(baseUrl: string, f: MediaFile) {
  return { id: f.id, name: f.name, kind: f.kind, content_type: f.contentType, size_bytes: f.sizeBytes, status: f.status, public: f.public, link: mediaLink(baseUrl, f.id), created_at: f.createdAt.toISOString() };
}

/** `Storage`: the meter, and where storage is bought (the website, never the app). */
export async function storageJson(ctx: OwnerContext, app: { id: string; clientId: string }) {
  const { store, now, baseUrl } = ctx.deps;
  const usage = await appStorage(store, app, await effectivePlans(store), now);
  return {
    used_bytes: usage.usedBytes,
    limit_bytes: usage.limitBytes,
    used: formatBytes(usage.usedBytes),
    limit: usage.limitBytes === null ? null : formatBytes(usage.limitBytes),
    full: usage.over || (usage.limitBytes !== null && usage.usedBytes >= usage.limitBytes),
    manage_url: `${baseUrl}/dashboard/open/${app.id}?to=media`,
  };
}

export async function listMedia(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "media");
  const kind = ctx.req.query.get("kind");
  if (kind !== null && !MEDIA_KINDS.includes(kind as MediaKind)) throw invalid({ kind: "The request isn't valid." });
  const files = await ctx.deps.store.listMediaFiles(app.id, { ...(kind ? { kind: kind as MediaKind } : {}), limit: 200 });
  return { status: 200, body: { items: files.map((f) => fileJson(ctx.deps.baseUrl, f)), storage: await storageJson(ctx, app) } };
}

const UPLOAD_STATUS: Record<string, number> = { unavailable: 503, plan_not_active: 403, type: 400, empty: 400, too_big: 413, storage_full: 413 };

export async function startMediaUpload(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, state } = appScope(ctx, params.app_id, "media");
  const body = bodyObject(ctx.req.body);
  const result = await startAppUpload({ store: ctx.deps.store, storage: ctx.deps.media, now: ctx.deps.now }, app, state, { name: body.name, size: body.size, type: body.type });
  if (!result.ok) {
    if (result.code === "rate_limited") throw rateLimited(3600, result.message);
    throw new OwnerError(UPLOAD_STATUS[result.code] ?? 400, result.code === "type" || result.code === "empty" ? "invalid_request" : result.code, result.message);
  }
  return { status: 201, body: { id: result.id, upload_url: result.uploadUrl, chunk_bytes: result.chunkBytes, size: result.size } };
}

async function uploading(ctx: OwnerContext, params: Record<string, string>) {
  const { app } = appScope(ctx, params.app_id, "media");
  const id = params.media_id ?? "";
  const file = isMediaId(id) ? await ctx.deps.store.getMediaFile(app.id, id) : null;
  if (!file) throw notFound();
  if (!ctx.deps.media) throw new OwnerError(503, "unavailable", "Uploads aren't available right now. Message us on WhatsApp.");
  return { app, file, storage: ctx.deps.media };
}

export async function resumeMediaUpload(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { file, storage } = await uploading(ctx, params);
  if (file.status !== "uploading") throw notFound();
  return { status: 200, body: { id: file.id, upload_url: uploadUrl(storage, file), chunk_bytes: MEDIA_CHUNK_BYTES, size: file.sizeBytes } };
}

export async function completeMediaUpload(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, file, storage } = await uploading(ctx, params);
  const result = await completeUpload({ store: ctx.deps.store, storage, now: ctx.deps.now }, app.id, file.id);
  if (!result.ok) {
    if (result.code === "not_found") throw notFound();
    throw new OwnerError(409, result.code === "incomplete" ? "incomplete" : "size_mismatch", result.message);
  }
  return { status: 200, body: fileJson(ctx.deps.baseUrl, result.file) };
}

/** Deletes a file, or cancels an upload: its space comes back. */
export async function deleteMediaFile(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "media");
  const id = params.media_id ?? "";
  const { store, now } = ctx.deps;
  if (!isMediaId(id) || !(await deleteMedia({ store, storage: ctx.deps.media }, app.id, id))) throw notFound();
  await resolveStorageNotices(store, app, await effectivePlans(store), now);
  return { status: 204 };
}

// The office's conversations (real estate)

/** The row as the contract has it (the person's details only on a conversation's own page). */
function withoutUser<T extends { _user: unknown }>(row: T): Omit<T, "_user"> {
  const copy: Partial<T> = { ...row };
  delete copy._user;
  return copy as Omit<T, "_user">;
}

async function inquiryJson(ctx: OwnerContext, appId: string, row: { id: number; listingId: number; userId: number; status: string; updatedAt: Date }, last: string | null, unread: number) {
  const { store } = ctx.deps;
  const [listing, user] = await Promise.all([store.getListing(appId, row.listingId), store.getHostedUser(appId, row.userId)]);
  return {
    id: row.id,
    listing_id: row.listingId,
    listing_title: listing?.title ?? "",
    person: user?.name ?? "",
    status: row.status,
    last_message: last,
    unread,
    updated_at: row.updatedAt.toISOString(),
    _user: user,
  };
}

export async function listInquiries(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "inquiries");
  const page = paging(ctx.req.query);
  const status = ctx.req.query.get("status");
  if (status !== null && status !== "open" && status !== "closed") throw invalid({ status: "The request isn't valid." });
  const { store } = ctx.deps;
  const [{ items, total }, unread] = await Promise.all([
    store.listListingInquiries({ appId: app.id, ...(status ? { status } : {}), offset: page.offset, limit: page.perPage }),
    store.countUnreadListingInquiries(app.id),
  ]);
  const rows = await Promise.all(items.map((row) => inquiryJson(ctx, app.id, row, row.lastMessage?.text ?? null, row.unreadByOffice)));
  return { status: 200, body: { ...pageJson(page, total), unread, items: rows.map(withoutUser) } };
}

async function inquiryDetail(ctx: OwnerContext, appId: string, id: number) {
  const { store } = ctx.deps;
  const inquiry = await store.getListingInquiry(appId, id);
  if (!inquiry) throw notFound();
  const messages = await store.listListingInquiryMessages(appId, id);
  const { _user: user, ...row } = await inquiryJson(ctx, appId, inquiry, messages.at(-1)?.text ?? null, 0);
  return {
    ...row,
    phone: user?.phone ?? null,
    email: user?.email ?? null,
    messages: messages.map((m) => ({ id: m.id, from: m.from, text: m.text, created_at: m.createdAt.toISOString() })),
  };
}

/** Opening a conversation marks the person's messages read, as the dashboard's page does. */
export async function getInquiry(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "inquiries");
  const id = intParam(params.inquiry_id);
  const body = await inquiryDetail(ctx, app.id, id);
  await ctx.deps.store.markListingInquiryRead(app.id, id, "user", ctx.deps.now);
  return { status: 200, body };
}

export async function replyInquiry(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "inquiries");
  const { store, now, encryptionKey } = ctx.deps;
  const inquiry = await store.getListingInquiry(app.id, intParam(params.inquiry_id));
  if (!inquiry) throw notFound();
  const result = await replyToInquiry({ store, app, account: serviceAccountOf(app, encryptionKey), now, send: ctx.deps.sendPush }, inquiry, bodyObject(ctx.req.body).text);
  if (!result.ok) throw invalid({ text: result.error });
  return { status: 201, body: await inquiryDetail(ctx, app.id, inquiry.id) };
}

// The app's users (hosted API)

export async function listAppUsers(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "appUsers");
  const page = paging(ctx.req.query);
  const q = (ctx.req.query.get("q") ?? "").trim();
  if (q.length > 100) throw invalid({ q: "The request isn't valid." });
  const { store } = ctx.deps;
  const [{ items, total }, count] = await Promise.all([
    store.listHostedUsers({ appId: app.id, ...(q ? { query: q } : {}), offset: page.offset, limit: page.perPage }),
    store.countHostedUsers(app.id),
  ]);
  return {
    status: 200,
    body: { ...pageJson(page, total), count, items: items.map((u) => ({ id: u.id, name: u.name, phone: u.phone, email: u.email, city: u.city, created_at: u.createdAt.toISOString() })) },
  };
}
