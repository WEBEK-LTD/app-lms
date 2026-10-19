import "server-only";
import path from "node:path";
import { mediaBaseUrl, mediaDir, mediaMode, mediaSigningSecret } from "../env";
import { MediaDisk } from "./disk";
import { signMediaUrl, type MediaOp } from "./signing";

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
