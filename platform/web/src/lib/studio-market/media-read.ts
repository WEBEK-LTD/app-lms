import "server-only";
import { getStore } from "../data";
import { appUrl } from "../env";
import { fileUrl } from "../media/files";
import { getMediaStorage } from "../media/storage";
import { COPY_PICTURE_BYTES, type PictureDeps } from "./assets";

/**
 * 106.2 A Media library picture's bytes (/m/<id>), read through the media
 * gate with a short signed link, for the template's and the buyers' copies
 * (lib/studio-market/assets.ts). Null when it isn't a ready picture.
 */
export async function readMediaPicture(id: string): Promise<Buffer | null> {
  const storage = getMediaStorage();
  const file = storage ? await (await getStore()).getMediaFileById(id) : null;
  if (!storage || !file || file.kind !== "image" || file.status !== "ready" || file.sizeBytes > COPY_PICTURE_BYTES) return null;
  const response = await fetch(fileUrl(storage, file, { ttlSeconds: 120 }).url, { signal: AbortSignal.timeout(20_000) }).catch(() => null);
  if (!response?.ok) return null;
  const data = Buffer.from(await response.arrayBuffer());
  return data.length <= COPY_PICTURE_BYTES ? data : null;
}

/** What the market's copies need on the server: the platform's address and the Media library's reader. */
export function pictureCopying(): Pick<PictureDeps, "baseUrl" | "readMedia"> {
  return { baseUrl: appUrl(), readMedia: readMediaPicture };
}
