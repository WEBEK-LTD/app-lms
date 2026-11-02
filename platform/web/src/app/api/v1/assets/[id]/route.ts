import { getBlobStore } from "@/lib/blobs";
import { getStore } from "@/lib/data";
import { errorResponse } from "@/lib/http";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Public, unguessable URLs for app icons, logos, store screenshots, product photos and Firebase
 * config files. They all end up in the public app stores or inside the app
 * anyway (Firebase files hold client identifiers, not secrets), and the build
 * pipeline downloads them from here.
 * SVGs are sandboxed so a script inside one can't run on yallapp.com.tr.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/v1/assets/[id]">): Promise<Response> {
  const { id } = await params;
  if (!UUID.test(id)) return errorResponse(404, "not_found", "Not found.");
  const asset = await (await getStore()).getAsset(id);
  // 105.2 A driver's papers are the company's only (Dashboard › Drivers).
  if (!asset || asset.kind === "driver_document") return errorResponse(404, "not_found", "Not found.");
  const file = await getBlobStore().get(asset.blobKey);
  if (!file) return errorResponse(404, "not_found", "Not found.");
  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": asset.contentType,
      "content-length": String(file.data.length),
      "cache-control": "public, max-age=31536000, immutable",
      // 17 The app preview draws pictures from the platform's other addresses too (the web app reads them with fetch).
      "access-control-allow-origin": "*",
      "content-security-policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
}
