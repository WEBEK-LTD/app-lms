import { clientFor, mayUseDashboard } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { getStore } from "@/lib/data";
import { errorResponse } from "@/lib/http";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 105.2 A driver's paper, for the company that keeps it only (people of its team who may see the rides). */
export async function GET(_request: Request, { params }: RouteContext<"/dashboard/drivers/documents/[id]">): Promise<Response> {
  const { id } = await params;
  const context = await clientFor("orders");
  if (!context || !mayUseDashboard(context) || !UUID.test(id)) return errorResponse(404, "not_found", "Not found.");
  const asset = await (await getStore()).getAsset(id);
  if (!asset || asset.kind !== "driver_document" || asset.clientId !== context.client.id) return errorResponse(404, "not_found", "Not found.");
  const file = await getBlobStore().get(asset.blobKey);
  if (!file) return errorResponse(404, "not_found", "Not found.");
  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": asset.contentType,
      "content-length": String(file.data.length),
      "cache-control": "private, no-store",
      "content-security-policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
}
