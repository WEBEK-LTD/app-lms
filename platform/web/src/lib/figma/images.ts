import type { BlobStore } from "../blobs";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";

/**
 * 97.3 The logo and pictures exported from a Figma file: PNG, JPEG or WebP,
 * up to 5 MB each, kept as assets of the account (served like icons) and
 * named in the Figma look.
 */

export const FIGMA_IMAGE_BYTES = 5 * 1024 * 1024;

/** The picture's type, by its first bytes. */
export function figmaImageType(data: Buffer): { contentType: string; extension: string } | null {
  if (data.length < 12) return null;
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { contentType: "image/png", extension: "png" };
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return { contentType: "image/jpeg", extension: "jpg" };
  if (data.toString("latin1", 0, 4) === "RIFF" && data.toString("latin1", 8, 12) === "WEBP") return { contentType: "image/webp", extension: "webp" };
  return null;
}

export async function saveFigmaImage(
  deps: { store: DataStore; blobs: BlobStore; now: Date },
  app: Pick<App, "clientId">,
  data: Buffer,
  // 108.2 Also the pictures of a design brought into Studio.
  kind: "figma_image" | "design_image" = "figma_image",
): Promise<{ ok: true; assetId: string } | { ok: false; error: "type" | "size" }> {
  if (data.length > FIGMA_IMAGE_BYTES) return { ok: false, error: "size" };
  const type = figmaImageType(data);
  if (!type) return { ok: false, error: "type" };
  const id = newId();
  const blobKey = `assets/${app.clientId}/${id}.${type.extension}`;
  await deps.blobs.put(blobKey, data, type.contentType);
  await deps.store.createAsset({ id, clientId: app.clientId, kind, blobKey, contentType: type.contentType, size: data.length, createdAt: deps.now });
  return { ok: true, assetId: id };
}

/** The look's files that aren't the account's own pictures from a Figma file (a draft must name only those). */
export async function foreignFigmaImages(store: DataStore, clientId: string, assetIds: string[]): Promise<string[]> {
  const foreign: string[] = [];
  for (const id of assetIds) {
    const asset = await store.getAsset(id);
    if (!asset || asset.clientId !== clientId || asset.kind !== "figma_image") foreign.push(id);
  }
  return foreign;
}
