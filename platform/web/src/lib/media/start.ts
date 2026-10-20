import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { effectivePlans } from "../entitlements";
import type { AccountState } from "../license/status";
import { hitRateLimit, RATE_LIMITS } from "../rate-limit";
import { startUpload } from "./files";
import { MEDIA_CHUNK_BYTES } from "./signing";
import type { MediaStorage } from "./storage";
import { appStorage } from "./usage";

export type StartUpload =
  | { ok: true; id: string; uploadUrl: string; chunkBytes: number; size: number }
  | { ok: false; code: "unavailable" | "plan_not_active" | "rate_limited" | "type" | "too_big" | "storage_full" | "empty"; message: string };

/**
 * 51 Starting an upload to the Media library, for the dashboard's uploader
 * and 58 Yallapp Business: uploads wait for an active plan, 200 an hour per
 * app (counted together), and the app's storage decides the rest.
 */
export async function startAppUpload(
  deps: { store: DataStore; storage: MediaStorage | null; now: Date },
  app: App,
  state: AccountState,
  input: { name: unknown; size: unknown; type: unknown },
): Promise<StartUpload> {
  const { store, storage, now } = deps;
  if (!storage) return { ok: false, code: "unavailable", message: "Uploads aren't available right now. Message us on WhatsApp." };
  if (state !== "active") return { ok: false, code: "plan_not_active", message: "Uploads start once your plan is active." };
  if (!(await hitRateLimit(store, RATE_LIMITS.mediaUploads, app.id, now)).allowed) return { ok: false, code: "rate_limited", message: "Too many uploads in an hour. Try again later." };
  const usage = await appStorage(store, app, await effectivePlans(store), now);
  const result = await startUpload(
    { store, storage, now, limitBytes: usage.limitBytes, chunkBytes: MEDIA_CHUNK_BYTES },
    { appId: app.id, name: String(input.name ?? ""), size: Number(input.size), contentType: String(input.type ?? "") },
  );
  if (!result.ok) return { ok: false, code: result.code, message: result.message };
  return { ok: true, id: result.file.id, uploadUrl: result.uploadUrl, chunkBytes: result.chunkBytes, size: result.file.sizeBytes };
}
