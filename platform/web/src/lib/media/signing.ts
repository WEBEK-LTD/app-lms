import { createHash, createHmac } from "node:crypto";
import { safeEqual } from "../crypto/tokens";

/**
 * 51 Signed links of the media gate (deploy/media-host/index.php, and the
 * platform's own /media route in local runs). The platform signs each one;
 * the gate checks it before it touches the disk.
 *
 *   <base>/<op>/<app id>/<media id>.<ext>?expires=<unix seconds>[&size=<bytes>][&dl=1]&sig=<hex>
 *   sig = hex HMAC-SHA256(secret, "/<op>/<app id>/<file>?<the other parameters, sorted, key=value joined by &>")
 *
 * The operation is part of what's signed, so a link to watch a video can't
 * upload to it, and an upload link can't write more than its `size`.
 * - `v` GET or HEAD: the file, with range requests; `dl=1` as an attachment.
 * - `u` HEAD: how much is uploaded (Upload-Offset); PUT: the next chunk at
 *   Upload-Offset, up to `size` in all. The last chunk completes the file.
 * - `s` GET: what's on disk, as JSON (the platform's check after an upload).
 * - `d` DELETE: removes the file (and an unfinished upload).
 * 62 And on an app's whole folder, `<base>/a/<app id>` and `<base>/l/apps`:
 * - `a` DELETE: removes the app's folder and every file in it (an app that
 *   was deleted, lib/media/sweep.ts).
 * - `l` GET: the app folders on disk, as JSON (`{"apps": [...]}`).
 * 62 A `v` link for one student carries `t`, a number made from the access
 * token the app called the API with (`mediaTokenDigest`): the gate plays it
 * only to a request with `Authorization: Bearer <that token>`.
 * Parameter values are digits only, so PHP's and JavaScript's encodings agree.
 */

export type MediaOp = "v" | "u" | "s" | "d" | "a" | "l";

export const MEDIA_EXTENSIONS = ["mp4", "mov", "webm", "jpg", "png", "webp", "gif", "pdf"] as const;
export type MediaExtension = (typeof MEDIA_EXTENSIONS)[number];

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH = new RegExp(`^/(v|u|s|d)/(${UUID})/(${UUID})\\.(${MEDIA_EXTENSIONS.join("|")})$`);
/** 62 An app's folder (`a`), or the list of folders (`l`). */
const FOLDER_PATH = new RegExp(`^/(?:a/(${UUID})|l/apps)$`);

/** 62 What a student's play link is bound to: the first 52 bits of the access token's SHA-256, as digits (the same in PHP). */
export function mediaTokenDigest(token: string): string {
  return String(parseInt(createHash("sha256").update(token).digest("hex").slice(0, 13), 16));
}

/** A media file's place on disk, `<app id>/<media id>.<ext>`. */
export function storageKeyOf(appId: string, mediaId: string, extension: MediaExtension): string {
  return `${appId}/${mediaId}.${extension}`;
}

export function parseMediaPath(path: string): { op: MediaOp; appId: string; mediaId: string; extension: MediaExtension; key: string } | null {
  const match = PATH.exec(path);
  if (!match) return null;
  const [, op, appId, mediaId, extension] = match as unknown as [string, MediaOp, string, string, MediaExtension];
  return { op, appId, mediaId, extension, key: storageKeyOf(appId, mediaId, extension) };
}

function canonical(path: string, params: Record<string, string>): string {
  const query = Object.keys(params)
    .filter((k) => k !== "sig")
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k]!)}`)
    .join("&");
  return `${path}?${query}`;
}

export function mediaSignature(secret: string, path: string, params: Record<string, string>): string {
  return createHmac("sha256", secret).update(canonical(path, params)).digest("hex");
}

/** A signed link to `op` on the file at `key`, working for `ttlSeconds`. */
export function signMediaUrl(
  base: string,
  op: MediaOp,
  key: string,
  options: { secret: string; ttlSeconds: number; now?: Date; params?: Record<string, string> },
): { url: string; expiresAt: Date } {
  const now = options.now ?? new Date();
  const expires = Math.floor(now.getTime() / 1000) + Math.max(1, Math.floor(options.ttlSeconds));
  const path = `/${op}/${key}`;
  const params: Record<string, string> = { ...(options.params ?? {}), expires: String(expires) };
  for (const value of Object.values(params)) if (!/^\d+$/.test(value)) throw new Error("Media link parameters are digits only");
  const sig = mediaSignature(options.secret, path, params);
  const query = new URLSearchParams({ ...params, sig });
  return { url: `${base.replace(/\/+$/, "")}${path}?${query.toString()}`, expiresAt: new Date(expires * 1000) };
}

export type MediaRequestCheck =
  | { ok: true; op: "v" | "u" | "s" | "d"; appId: string; mediaId: string; extension: MediaExtension; key: string; params: Record<string, string> }
  | { ok: true; op: "a"; appId: string; params: Record<string, string> }
  | { ok: true; op: "l"; params: Record<string, string> }
  | { ok: false; status: 403 | 404 | 410; message: string };

type ParsedPath = ({ op: "v" | "u" | "s" | "d" } & Omit<NonNullable<ReturnType<typeof parseMediaPath>>, "op">) | { op: "a"; appId: string } | { op: "l" };

function parsePath(path: string): ParsedPath | null {
  const file = parseMediaPath(path);
  if (file) return file as ParsedPath;
  const folder = FOLDER_PATH.exec(path);
  if (!folder) return null;
  return folder[1] ? { op: "a", appId: folder[1] } : { op: "l" };
}

/**
 * Checks a request to the gate: its path (after the base), query and, 62 for
 * a link bound to a student, its `Authorization` header.
 */
export function verifyMediaRequest(path: string, search: URLSearchParams, secret: string, now: Date = new Date(), authorization: string | null = null): MediaRequestCheck {
  const parsed = parsePath(path);
  if (!parsed) return { ok: false, status: 404, message: "Not found." };
  const params: Record<string, string> = {};
  search.forEach((value, key) => {
    params[key] = value;
  });
  const sig = params.sig ?? "";
  const expires = params.expires ?? "";
  const invalid = { ok: false as const, status: 403 as const, message: "This link is not valid." };
  if (!/^[0-9a-f]{64}$/.test(sig) || !/^\d+$/.test(expires)) return invalid;
  if (Object.entries(params).some(([k, v]) => k !== "sig" && !/^\d+$/.test(v))) return invalid;
  if (!safeEqual(sig, mediaSignature(secret, path, params))) return invalid;
  if (Number(expires) < Math.floor(now.getTime() / 1000)) return { ok: false, status: 410, message: "This link has expired." };
  if (params.t !== undefined) {
    const token = /^Bearer\s+(\S+)$/i.exec(authorization?.trim() ?? "")?.[1];
    if (!token || !safeEqual(mediaTokenDigest(token), params.t)) return { ok: false, status: 403, message: "This link is for another student." };
  }
  return { ok: true, ...parsed, params } as MediaRequestCheck;
}

export const MEDIA_CONTENT_TYPES: Record<MediaExtension, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

/** The gate refuses chunks bigger than this (Apache takes up to 7 MB a request on our host). */
export const MEDIA_CHUNK_MAX_BYTES = 6 * 1024 * 1024;

/** What the uploader sends a request. */
export const MEDIA_CHUNK_BYTES = 5 * 1024 * 1024;

/** `bytes=start-end` of a file of `size` bytes: one range, or null for the whole file, or "invalid" (416). */
export function parseRange(header: string | null, size: number): { start: number; end: number } | null | "invalid" {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return "invalid";
  let start: number;
  let end: number;
  if (match[1] === "") {
    const suffix = Number(match[2]);
    if (suffix === 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (start >= size || start > end) return "invalid";
  return { start, end };
}
