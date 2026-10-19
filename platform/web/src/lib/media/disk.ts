import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat, truncate } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { MEDIA_CHUNK_MAX_BYTES, MEDIA_CONTENT_TYPES, parseRange, verifyMediaRequest, type MediaExtension } from "./signing";

/**
 * 51 The media gate's work on a folder: what deploy/media-host/index.php
 * does on Yallapp's server, in TypeScript for local runs and tests (the
 * platform's /media route) and for the platform's checks in "fs" mode.
 * An upload is written chunk by chunk to `<key>.part` (streamed, never held
 * in memory) and renamed to `<key>` when its last byte arrives.
 */

export class MediaDisk {
  constructor(private readonly root: string) {}

  file(key: string): string {
    if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{2,4}$/.test(key)) throw new Error("Invalid media key");
    return path.join(this.root, key);
  }

  private async size(file: string): Promise<number | null> {
    try {
      const s = await stat(file);
      return s.isFile() ? s.size : null;
    } catch {
      return null;
    }
  }

  /** What's on disk: the finished file, or how much of the upload arrived. */
  async stat(key: string): Promise<{ exists: boolean; complete: boolean; size: number }> {
    const file = this.file(key);
    const done = await this.size(file);
    if (done !== null) return { exists: true, complete: true, size: done };
    const part = await this.size(`${file}.part`);
    return { exists: part !== null, complete: false, size: part ?? 0 };
  }

  async delete(key: string): Promise<void> {
    const file = this.file(key);
    await rm(file, { force: true });
    await rm(`${file}.part`, { force: true });
  }

  /**
   * Appends one chunk at `offset` of an upload of `total` bytes. Refuses a
   * chunk that isn't where the upload stands (409, with the right offset),
   * too big a chunk (413) or one past `total`.
   */
  async append(
    key: string,
    input: { offset: number; total: number; length: number | null; body: ReadableStream<Uint8Array> | null },
  ): Promise<{ status: 204 | 409 | 413 | 400; offset: number }> {
    const file = this.file(key);
    const current = await this.stat(key);
    if (current.complete) return { status: 409, offset: current.size };
    if (input.offset !== current.size) return { status: 409, offset: current.size };
    if (input.length === null || input.length < 1) return { status: 400, offset: current.size };
    if (input.length > MEDIA_CHUNK_MAX_BYTES || current.size + input.length > input.total) return { status: 413, offset: current.size };
    if (!input.body) return { status: 400, offset: current.size };
    await mkdir(path.dirname(file), { recursive: true });
    const part = `${file}.part`;
    let written = 0;
    const limit = input.length;
    const counted = Readable.fromWeb(input.body as Parameters<typeof Readable.fromWeb>[0]).on("data", (chunk: Buffer) => {
      written += chunk.length;
    });
    try {
      await pipeline(
        counted,
        async function* (source: AsyncIterable<Buffer>) {
          for await (const chunk of source) {
            if (written > limit) throw new Error("Chunk longer than announced");
            yield chunk;
          }
        },
        createWriteStream(part, { flags: "a" }),
      );
    } catch {
      // Whatever arrived of a broken chunk is cut off, so the next try starts where this one did.
      await truncate(part, current.size).catch(() => undefined);
      return { status: 400, offset: current.size };
    }
    if (written !== limit) {
      await truncate(part, current.size).catch(() => undefined);
      return { status: 400, offset: current.size };
    }
    const offset = current.size + written;
    if (offset === input.total) await rename(part, file);
    return { status: 204, offset };
  }

  /** The finished file, whole or one range of it. */
  async read(key: string, rangeHeader: string | null, withBody = true): Promise<{ status: 200 | 206 | 416 | 404; size: number; start: number; end: number; stream: ReadableStream | null }> {
    const file = this.file(key);
    const size = await this.size(file);
    if (size === null) return { status: 404, size: 0, start: 0, end: 0, stream: null };
    const range = parseRange(rangeHeader, size);
    if (range === "invalid") return { status: 416, size, start: 0, end: 0, stream: null };
    const start = range?.start ?? 0;
    const end = range?.end ?? size - 1;
    const stream = size === 0 || !withBody ? null : (Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream);
    return { status: range ? 206 : 200, size, start, end, stream };
  }
}

/**
 * The gate's answer to one request (GET, HEAD, PUT, DELETE), the same as
 * deploy/media-host/index.php gives. `path` is the request's path after the
 * gate's base.
 */
export async function handleMediaRequest(disk: MediaDisk, request: Request, path: string, secret: string, now: Date = new Date()): Promise<Response> {
  const plain = (status: number, message: string, headers: Record<string, string> = {}) =>
    new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...headers } });
  const check = verifyMediaRequest(path, new URL(request.url).searchParams, secret, now);
  if (!check.ok) return plain(check.status, check.message);
  const method = request.method.toUpperCase();
  if (check.op === "v" && (method === "GET" || method === "HEAD")) {
    const read = await disk.read(check.key, request.headers.get("range"), method === "GET");
    if (read.status === 404) return plain(404, "This file is no longer available.");
    if (read.status === 416) return plain(416, "Range not satisfiable.", { "content-range": `bytes */${read.size}` });
    const body = read.stream;
    const headers: Record<string, string> = {
      "content-type": MEDIA_CONTENT_TYPES[check.extension as MediaExtension],
      "content-length": String(read.size === 0 ? 0 : read.end - read.start + 1),
      "accept-ranges": "bytes",
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox",
      ...(read.status === 206 ? { "content-range": `bytes ${read.start}-${read.end}/${read.size}` } : {}),
      ...(check.params.dl === "1" ? { "content-disposition": `attachment; filename="${check.mediaId}.${check.extension}"` } : {}),
    };
    return new Response(body, { status: read.status, headers });
  }
  if (check.op === "u" && (method === "HEAD" || method === "GET" || method === "PUT")) {
    const total = Number(check.params.size ?? "");
    if (!Number.isSafeInteger(total) || total < 1) return plain(403, "This link is not valid.");
    if (method !== "PUT") {
      const s = await disk.stat(check.key);
      return new Response(null, { status: 200, headers: { "upload-offset": String(s.size), "upload-length": String(total), "cache-control": "no-store" } });
    }
    const offset = Number(request.headers.get("upload-offset") ?? "");
    const lengthHeader = request.headers.get("content-length");
    const result = await disk.append(check.key, {
      offset: Number.isSafeInteger(offset) ? offset : -1,
      total,
      length: lengthHeader && /^\d+$/.test(lengthHeader) ? Number(lengthHeader) : null,
      body: request.body,
    });
    return new Response(null, { status: result.status, headers: { "upload-offset": String(result.offset), "upload-length": String(total), "cache-control": "no-store" } });
  }
  if (check.op === "s" && method === "GET") {
    return Response.json(await disk.stat(check.key), { headers: { "cache-control": "no-store" } });
  }
  if (check.op === "d" && method === "DELETE") {
    await disk.delete(check.key);
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  }
  return plain(405, "Method not allowed.");
}
