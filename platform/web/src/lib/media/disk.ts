import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, rename, rm, stat, truncate } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { MEDIA_CHUNK_MAX_BYTES, MEDIA_CONTENT_TYPES, MEDIA_DOWNLOAD_ONLY, parseRange, verifyMediaRequest, type MediaExtension } from "./signing";

/**
 * 51 The media gate's work on a folder: what deploy/media-host/index.php
 * does on Yallapp's server, in TypeScript for local runs and tests (the
 * platform's /media route) and for the platform's checks in "fs" mode.
 * An upload is written chunk by chunk to `<key>.part` (streamed, never held
 * in memory) and renamed to `<key>` when its last byte arrives.
 */

const APP_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

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

  /** 62 Removes an app's whole folder (an app that no longer exists). */
  async deleteApp(appId: string): Promise<void> {
    if (!APP_ID.test(appId)) throw new Error("Invalid app ID");
    await rm(path.join(this.root, appId), { recursive: true, force: true });
  }

  /** 62 The app folders on disk. */
  async listApps(): Promise<string[]> {
    try {
      return (await readdir(this.root, { withFileTypes: true })).filter((e) => e.isDirectory() && APP_ID.test(e.name)).map((e) => e.name);
    } catch {
      return [];
    }
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
 * The gate's answer to one request (GET, HEAD, PUT, POST, DELETE), the same
 * as deploy/media-host/index.php gives. `path` is the request's path after
 * the gate's base.
 */
export async function handleMediaRequest(disk: MediaDisk, request: Request, path: string, secret: string, now: Date = new Date()): Promise<Response> {
  const plain = (status: number, message: string, headers: Record<string, string> = {}) =>
    new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-yallapp-media-gate": "3", ...headers } });
  // 64b A check anyone may open: this gate is installed (the PHP gate answers the same).
  if (path === "/ping" && (request.method === "GET" || request.method === "HEAD")) return plain(200, "Yallapp media gate 3\n");
  const check = verifyMediaRequest(path, new URL(request.url).searchParams, secret, now, request.headers.get("authorization"));
  if (!check.ok) return plain(check.status, check.message);
  const method = request.method.toUpperCase();
  // 62 An app's folder: removed, or the list of them.
  if (check.op === "a" || check.op === "l") {
    if (check.op === "a" && method === "DELETE") {
      await disk.deleteApp(check.appId);
      return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
    }
    if (check.op === "l" && method === "GET") return Response.json({ apps: await disk.listApps() }, { headers: { "cache-control": "no-store" } });
    return plain(405, "Method not allowed.");
  }
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
      ...(check.params.dl === "1" || MEDIA_DOWNLOAD_ONLY.has(check.extension as MediaExtension) ? { "content-disposition": `attachment; filename="${check.mediaId}.${check.extension}"` } : {}),
    };
    return new Response(body, { status: read.status, headers });
  }
  // 64b POST as well as PUT (server firewalls often refuse PUT), with any Content-Type.
  if (check.op === "u" && (method === "HEAD" || method === "GET" || method === "PUT" || method === "POST")) {
    const total = Number(check.params.size ?? "");
    if (!Number.isSafeInteger(total) || total < 1) return plain(403, "This link is not valid.");
    const headers = (offset: number, json = false) => ({
      "upload-offset": String(offset),
      "upload-length": String(total),
      "cache-control": "no-store",
      ...(json ? { "content-type": "application/json" } : {}),
    });
    if (method === "HEAD" || method === "GET") {
      const s = await disk.stat(check.key);
      return new Response(method === "GET" ? JSON.stringify({ offset: s.size, length: total }) : null, { status: 200, headers: headers(s.size, method === "GET") });
    }
    // 64b The header, else the query's `offset` (a proxy may drop the header).
    const given = [request.headers.get("upload-offset"), new URL(request.url).searchParams.get("offset")].find((v) => v !== null && /^\d+$/.test(v));
    const lengthHeader = request.headers.get("content-length");
    const result = await disk.append(check.key, {
      offset: given !== undefined && Number.isSafeInteger(Number(given)) ? Number(given) : -1,
      total,
      length: lengthHeader && /^\d+$/.test(lengthHeader) ? Number(lengthHeader) : null,
      body: request.body,
    });
    if (result.status !== 204) {
      const message =
        result.status === 409 ? "The upload is elsewhere." : result.status === 413 ? "This chunk is too big." : lengthHeader ? "The chunk didn't arrive whole." : "Send the chunk with its length.";
      return new Response(JSON.stringify({ offset: result.offset, message }), { status: result.status, headers: headers(result.offset, true) });
    }
    // PUT as before (older uploaders wait for 204); POST answers with the offset in JSON too.
    if (method === "POST") return new Response(JSON.stringify({ offset: result.offset }), { status: 200, headers: headers(result.offset, true) });
    return new Response(null, { status: 204, headers: headers(result.offset) });
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
