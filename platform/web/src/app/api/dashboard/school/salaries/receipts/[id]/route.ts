import { clientFor, mayUseDashboard } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { getStore } from "@/lib/data";
import { errorResponse } from "@/lib/http";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 113.12 A photo of a salary's or an advance's receipt, for the school that keeps it only (those of its team given Salaries). */
export async function GET(_request: Request, { params }: RouteContext<"/api/dashboard/school/salaries/receipts/[id]">): Promise<Response> {
  const { id } = await params;
  const context = await clientFor("salaries");
  if (!context || !mayUseDashboard(context) || !UUID.test(id)) return errorResponse(404, "not_found", "Not found.");
  const asset = await (await getStore()).getAsset(id);
  if (!asset || asset.kind !== "salary_receipt" || asset.clientId !== context.client.id) return errorResponse(404, "not_found", "Not found.");
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
