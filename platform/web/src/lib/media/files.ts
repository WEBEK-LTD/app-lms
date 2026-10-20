import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { MediaFile, MediaKind } from "../data/types";
import { fits, formatBytes, GB } from "./quota";
import { MEDIA_CONTENT_TYPES, mediaTokenDigest, storageKeyOf, type MediaExtension } from "./signing";
import type { MediaStorage } from "./storage";

/**
 * 51 The Media library: an app's videos, pictures and PDFs on Yallapp's own
 * server. The record (name, size, who may open it) is in the database; the
 * bytes go from the owner's browser to the media gate in chunks and from
 * the gate to the app with signed links. Sizes count against the app's
 * storage from the moment an upload starts.
 */

export const MEDIA_KINDS: { kind: MediaKind; label: string; maxBytes: number; types: Partial<Record<string, MediaExtension>> }[] = [
  { kind: "video", label: "Videos (MP4, MOV, WebM)", maxBytes: 5 * GB, types: { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" } },
  { kind: "image", label: "Pictures (JPEG, PNG, WebP, GIF)", maxBytes: 20 * 1024 ** 2, types: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" } },
  { kind: "pdf", label: "PDFs", maxBytes: 200 * 1024 ** 2, types: { "application/pdf": "pdf" } },
];

/** What the file picker accepts. */
export const MEDIA_ACCEPT = MEDIA_KINDS.flatMap((k) => Object.keys(k.types)).join(",");

/** How long links last: an upload (resumed within two days), a lesson's video (refreshed by the app), a download, a picture. */
export const UPLOAD_LINK_SECONDS = 2 * 86_400;
export const PLAY_LINK_SECONDS = 4 * 3600;
export const DOWNLOAD_LINK_SECONDS = 15 * 60;
export const PUBLIC_LINK_SECONDS = 6 * 3600;

/** Uploads not finished after this long are cancelled by the daily job (their space comes back). */
export const STALE_UPLOAD_HOURS = 48;

export function kindOf(contentType: string): { kind: MediaKind; extension: MediaExtension; maxBytes: number } | null {
  const type = contentType.trim().toLowerCase();
  for (const k of MEDIA_KINDS) {
    const extension = k.types[type];
    if (extension) return { kind: k.kind, extension, maxBytes: k.maxBytes };
  }
  return null;
}

/** The file's name as shown: no folders, no control characters, at most 200 characters. */
export function cleanName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const clean = base.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 200);
  return clean || "Untitled";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isMediaId(id: string): boolean {
  return UUID.test(id);
}

/**
 * A file's Yallapp link, https://yallapp.com.tr/m/<id>: what the owner copies
 * and pastes (a lesson's video address, a picture's address, a WordPress
 * lesson's video). Pictures (and files the owner made public) open from it;
 * videos of lessons play only from links signed for a student.
 */
export function mediaLink(baseUrl: string, id: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/m/${id}`;
}

/** The media ID in a Yallapp link on `baseUrl`, or null. */
export function parseMediaLink(url: string | null | undefined, baseUrl: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    const base = new URL(baseUrl);
    if (parsed.origin !== base.origin) return null;
    const match = /^\/m\/([0-9a-f-]{36})\/?$/.exec(parsed.pathname);
    return match && isMediaId(match[1]!) ? match[1]! : null;
  } catch {
    return null;
  }
}

/** Whether anyone may open the file from its link: pictures always, other files once the owner shared them. */
export function isPublic(file: Pick<MediaFile, "kind" | "public">): boolean {
  return file.kind === "image" || file.public;
}

export function extensionOf(file: Pick<MediaFile, "storageKey">): MediaExtension {
  return file.storageKey.split(".").pop() as MediaExtension;
}

/** A signed link that plays (or, with `download`, saves) the file, straight from the gate. */
export function fileUrl(storage: MediaStorage, file: MediaFile, options: { ttlSeconds: number; download?: boolean; bindTo?: string | null }): { url: string; expiresAt: Date } {
  return storage.link("v", file.storageKey, options.ttlSeconds, {
    ...(options.download ? { dl: "1" } : {}),
    // 62 Only for the student whose access token this is (lib/media/signing.ts).
    ...(options.bindTo ? { t: mediaTokenDigest(options.bindTo) } : {}),
  });
}

export type StartResult =
  | { ok: true; file: MediaFile; uploadUrl: string; chunkBytes: number }
  | { ok: false; code: "type" | "too_big" | "storage_full" | "empty"; message: string };

/**
 * Starts an upload: checks the type, the size per file and the app's storage
 * (the file's size is reserved at once), records the file and returns the
 * signed link the browser sends its chunks to.
 */
export async function startUpload(
  deps: { store: DataStore; storage: MediaStorage; now: Date; limitBytes: number | null; chunkBytes: number },
  input: { appId: string; name: string; size: number; contentType: string },
): Promise<StartResult> {
  const type = kindOf(input.contentType);
  if (!type) return { ok: false, code: "type", message: "Upload an MP4, MOV or WebM video, a JPEG, PNG, WebP or GIF picture, or a PDF." };
  if (!Number.isSafeInteger(input.size) || input.size < 1) return { ok: false, code: "empty", message: "This file is empty." };
  if (input.size > type.maxBytes) {
    return { ok: false, code: "too_big", message: `${cleanName(input.name)} is ${formatBytes(input.size)}. ${type.kind === "video" ? "Videos" : type.kind === "image" ? "Pictures" : "PDFs"} can be up to ${formatBytes(type.maxBytes)}.` };
  }
  const used = await deps.store.mediaUsage(input.appId);
  if (!fits(used, deps.limitBytes, input.size)) {
    return {
      ok: false,
      code: "storage_full",
      message: `There isn't room for ${cleanName(input.name)} (${formatBytes(input.size)}): ${formatBytes(used)} of ${formatBytes(deps.limitBytes ?? 0)} is used. Delete files you don't need, or buy more storage.`,
    };
  }
  const id = newId();
  const file: MediaFile = {
    id,
    appId: input.appId,
    name: cleanName(input.name),
    kind: type.kind,
    contentType: MEDIA_CONTENT_TYPES[type.extension],
    sizeBytes: input.size,
    storageKey: storageKeyOf(input.appId, id, type.extension),
    status: "uploading",
    public: false,
    createdAt: deps.now,
    updatedAt: deps.now,
  };
  await deps.store.createMediaFile(file);
  return { ok: true, file, uploadUrl: uploadUrl(deps.storage, file), chunkBytes: deps.chunkBytes };
}

/** A fresh upload link for a file still uploading (to resume). */
export function uploadUrl(storage: MediaStorage, file: MediaFile): string {
  return storage.link("u", file.storageKey, UPLOAD_LINK_SECONDS, { size: String(file.sizeBytes) }).url;
}

export type CompleteResult = { ok: true; file: MediaFile } | { ok: false; code: "incomplete" | "size_mismatch" | "not_found"; message: string; offset?: number };

/** After the last chunk: checks on the server that the whole file is there and makes it ready. */
export async function completeUpload(deps: { store: DataStore; storage: MediaStorage; now: Date }, appId: string, id: string): Promise<CompleteResult> {
  const file = await deps.store.getMediaFile(appId, id);
  if (!file) return { ok: false, code: "not_found", message: "This upload was cancelled." };
  if (file.status === "ready") return { ok: true, file };
  const disk = await deps.storage.stat(file.storageKey);
  if (!disk.complete) return { ok: false, code: "incomplete", message: "The upload isn't finished yet.", offset: disk.size };
  if (disk.size !== file.sizeBytes) {
    // The gate never writes past the signed size; anything else is a broken upload.
    await deps.storage.delete(file.storageKey);
    await deps.store.deleteMediaFile(appId, id);
    return { ok: false, code: "size_mismatch", message: "The file didn't arrive whole. Upload it again." };
  }
  const ready: MediaFile = { ...file, status: "ready", updatedAt: deps.now };
  await deps.store.updateMediaFile(appId, id, { status: "ready", updatedAt: deps.now });
  return { ok: true, file: ready };
}

/** Deletes the file from the server, then its record: its space comes back. */
export async function deleteMedia(deps: { store: DataStore; storage: MediaStorage | null }, appId: string, id: string): Promise<boolean> {
  const file = await deps.store.getMediaFile(appId, id);
  if (!file) return false;
  if (deps.storage) {
    try {
      await deps.storage.delete(file.storageKey);
    } catch (e) {
      // 64b An upload that never finished may have nothing on the server (or a gate that
      // refused it): its record goes anyway, the daily job's folder sweep takes any leftover.
      // A finished file stays until the server confirms it is gone.
      if (file.status === "ready") throw e;
      console.error(`[media] delete ${file.id}: ${e instanceof Error ? e.message : String(e)} (unfinished upload: removed anyway)`);
    }
  }
  await deps.store.deleteMediaFile(appId, id);
  return true;
}

/** 51 The daily job: uploads left unfinished for two days are cancelled and their space freed. */
export async function cancelStaleUploads(deps: { store: DataStore; storage: MediaStorage | null; now: Date }): Promise<number> {
  const before = new Date(deps.now.getTime() - STALE_UPLOAD_HOURS * 3_600_000);
  let cancelled = 0;
  for (const file of await deps.store.listStaleMediaUploads(before, 500)) {
    try {
      if (deps.storage) {
        // 64b Like a cancel: an unfinished upload's record goes even if the server refuses the delete.
        await deps.storage.delete(file.storageKey).catch((e: unknown) => console.error(`[daily] media upload ${file.id}: ${e instanceof Error ? e.message : String(e)} (removed anyway)`));
      }
      await deps.store.deleteMediaFile(file.appId, file.id);
      cancelled++;
    } catch (e) {
      console.error(`[daily] media upload ${file.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return cancelled;
}

/** A video for the app: a signed link, when it ends, and its size and type. */
export interface ResolvedMedia {
  id: string;
  kind: MediaKind;
  url: string;
  expiresAt: Date;
  sizeBytes: number;
  mimeType: string;
  name: string;
}

/**
 * The file behind a Yallapp link, signed for playing or downloading, when
 * it's one of this app's ready files. The caller has checked that the
 * person may open what links to it (the lesson).
 */
export async function resolveMedia(
  deps: { store: DataStore; storage: MediaStorage | null; baseUrl: string },
  appId: string,
  link: string | null | undefined,
  purpose: "play" | "download",
  options: { bindTo?: string | null } = {},
): Promise<ResolvedMedia | null> {
  const id = parseMediaLink(link, deps.baseUrl);
  if (!id || !deps.storage) return null;
  const file = await deps.store.getMediaFile(appId, id);
  if (!file || file.status !== "ready") return null;
  // 62 Play links (4 hours) may be bound to the student; links to save a file last 15 minutes and aren't.
  const signed = fileUrl(deps.storage, file, {
    ttlSeconds: purpose === "play" ? PLAY_LINK_SECONDS : DOWNLOAD_LINK_SECONDS,
    download: purpose === "download",
    bindTo: purpose === "play" ? options.bindTo : null,
  });
  return { id: file.id, kind: file.kind, url: signed.url, expiresAt: signed.expiresAt, sizeBytes: file.sizeBytes, mimeType: file.contentType, name: file.name };
}
