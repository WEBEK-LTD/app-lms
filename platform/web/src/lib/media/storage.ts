import "server-only";
import path from "node:path";
import { mediaBaseUrl, mediaDir, mediaMode, mediaSigningSecret } from "../env";
import { MediaDisk } from "./disk";
import { MEDIA_CHUNK_MAX_BYTES, signMediaUrl, type MediaOp } from "./signing";

/**
 * 51 Where media files are kept (env.ts › mediaMode): the media gate on
 * Yallapp's own server ("host"), or a local folder ("fs"). Either way the
 * browser uploads and the app plays straight from the gate with links signed
 * here; the platform only checks what arrived and deletes.
 */
export interface MediaStorage {
  mode: "host" | "fs";
  /** A link for `op` on the file at `key`. */
  link(op: MediaOp, key: string, ttlSeconds: number, params?: Record<string, string>): { url: string; expiresAt: Date };
  /** What's on disk for `key`. */
  stat(key: string): Promise<{ exists: boolean; complete: boolean; size: number }>;
  delete(key: string): Promise<void>;
  /** 62 Removes an app's whole folder: every file of an app that no longer exists. */
  deleteApp(appId: string): Promise<void>;
  /** 62 The app folders kept on disk. */
  listApps(): Promise<string[]>;
  /** 132.114 Copies a finished file to another key (a copied app's Media library), chunk by chunk. */
  copy(fromKey: string, toKey: string, size: number): Promise<void>;
}

export class MediaStorageError extends Error {}

class Gate implements MediaStorage {
  constructor(
    readonly mode: "host" | "fs",
    private readonly base: string,
    private readonly secret: string,
    /** "fs": checks and deletes on the folder itself; "host": through the gate. */
    private readonly disk: MediaDisk | null,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  link(op: MediaOp, key: string, ttlSeconds: number, params: Record<string, string> = {}) {
    return signMediaUrl(this.base, op, key, { secret: this.secret, ttlSeconds, params });
  }

  async stat(key: string) {
    if (this.disk) return this.disk.stat(key);
    const response = await this.call("GET", this.link("s", key, 300).url);
    const body = (await response.json()) as { exists?: unknown; complete?: unknown; size?: unknown };
    return { exists: body.exists === true, complete: body.complete === true, size: typeof body.size === "number" ? body.size : 0 };
  }

  async delete(key: string) {
    if (this.disk) return this.disk.delete(key);
    await this.call("DELETE", this.link("d", key, 300).url);
  }

  async deleteApp(appId: string) {
    if (this.disk) return this.disk.deleteApp(appId);
    await this.call("DELETE", this.link("a", appId, 300).url);
  }

  async listApps() {
    if (this.disk) return this.disk.listApps();
    const body = (await (await this.call("GET", this.link("l", "apps", 300).url)).json()) as { apps?: unknown };
    return Array.isArray(body.apps) ? body.apps.filter((id): id is string => typeof id === "string") : [];
  }

  async copy(fromKey: string, toKey: string, size: number) {
    if (this.disk) return this.disk.copy(fromKey, toKey);
    // Through the gate: each chunk read with a range of the file and sent to the new file's upload link.
    const upload = this.link("u", toKey, 3600, { size: String(size) }).url;
    for (let offset = 0; offset < size; ) {
      const end = Math.min(size, offset + MEDIA_CHUNK_MAX_BYTES) - 1;
      const part = await this.fetcher(this.link("v", fromKey, 600).url, { headers: { range: `bytes=${offset}-${end}` }, cache: "no-store", signal: AbortSignal.timeout(60_000) });
      if (part.status !== 206 && !(part.status === 200 && offset === 0 && end === size - 1)) throw new MediaStorageError(`The media server answered ${part.status} to a read.`);
      const chunk = new Uint8Array(await part.arrayBuffer());
      if (chunk.length !== end - offset + 1) throw new MediaStorageError("A chunk of the file didn't arrive whole.");
      const url = new URL(upload);
      url.searchParams.set("offset", String(offset));
      const sent = await this.fetcher(url.toString(), { method: "POST", headers: { "content-type": "application/octet-stream", "upload-offset": String(offset) }, body: chunk, cache: "no-store", signal: AbortSignal.timeout(60_000) });
      if (!sent.ok) throw new MediaStorageError(`The media server answered ${sent.status} to an upload.`);
      offset = end + 1;
    }
  }

  private async call(method: string, url: string): Promise<Response> {
    let response: Response;
    try {
      response = await this.fetcher(url, { method, cache: "no-store", signal: AbortSignal.timeout(15_000) });
    } catch (e) {
      throw new MediaStorageError(`The media server couldn't be reached (${e instanceof Error ? e.message : "network error"}).`);
    }
    if (!response.ok) throw new MediaStorageError(`The media server answered ${response.status}.`);
    return response;
  }
}

/** A storage on given settings (tests). */
export function mediaStorageWith(options: { mode: "host" | "fs"; base: string; secret: string; dir?: string; fetcher?: typeof fetch }): MediaStorage {
  return new Gate(options.mode, options.base, options.secret, options.mode === "fs" ? new MediaDisk(path.resolve(options.dir ?? mediaDir())) : null, options.fetcher);
}

/** The environment's media storage, or null when media isn't set up (no uploads). */
export function getMediaStorage(): MediaStorage | null {
  let mode: "host" | "fs" | null;
  try {
    mode = mediaMode();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    return null;
  }
  if (!mode) return null;
  return mediaStorageWith({ mode, base: mediaBaseUrl(), secret: mediaSigningSecret() });
}

/** "fs" mode's folder, for the platform's own /media route. */
export function localMediaDisk(): MediaDisk | null {
  return mediaMode() === "fs" ? new MediaDisk(path.resolve(mediaDir())) : null;
}
