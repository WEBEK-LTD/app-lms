import { ICON_MAX_BYTES } from "../assets";
import { getBlobStore } from "../blobs";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import { readPngInfo } from "../png";

/**
 * 112.3 The couriers' or drivers' app's own icon, from Delivery settings or
 * Ride settings: checked as the app's icon is in the Branding step (PNG,
 * 1024 × 1024, no transparency) and saved as an `icon` asset. No file: null,
 * the settings keep the icon they have.
 */
export async function saveSecondAppIcon(
  store: Pick<DataStore, "createAsset">,
  clientId: string,
  file: FormDataEntryValue | null,
  now: Date,
): Promise<{ assetId: string | null } | { error: string }> {
  if (!file || typeof file === "string" || file.size === 0) return { assetId: null };
  if (file.size > ICON_MAX_BYTES) return { error: `The file is too large. The limit is ${ICON_MAX_BYTES / 1024 / 1024} MB.` };
  const data = Buffer.from(await file.arrayBuffer());
  const png = readPngInfo(data);
  if (!png) return { error: "The icon must be a PNG file." };
  if (png.width !== 1024 || png.height !== 1024) return { error: `The icon must be 1024 × 1024 pixels. This one is ${png.width} × ${png.height}.` };
  if (png.hasTransparency) return { error: "The icon can't have transparency. Export it with a solid background." };
  const assetId = newId();
  const blobKey = `assets/${clientId}/${assetId}.png`;
  await getBlobStore().put(blobKey, data, "image/png");
  await store.createAsset({ id: assetId, clientId, kind: "icon", blobKey, contentType: "image/png", size: data.length, createdAt: now });
  return { assetId };
}
