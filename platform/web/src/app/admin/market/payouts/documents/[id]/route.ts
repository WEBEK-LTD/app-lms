import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { getStore } from "@/lib/data";
import { errorResponse } from "@/lib/http";
import { idDocumentLinkValid } from "@/lib/studio-market/id-document";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 106.11 A designer's ID document, for the payout checks: the team with
 * `market.payouts` only, from a link signed minutes ago on that page. Each
 * opening is in the audit log.
 */
export async function GET(request: Request, { params }: RouteContext<"/admin/market/payouts/documents/[id]">): Promise<Response> {
  const admin = await requireAdmin("market.payouts");
  const { id } = await params;
  if (!UUID.test(id) || !idDocumentLinkValid(new URL(request.url))) return errorResponse(404, "not_found", "Not found.");
  const store = await getStore();
  const asset = await store.getAsset(id);
  if (!asset || asset.kind !== "designer_id_document") return errorResponse(404, "not_found", "Not found.");
  const file = await getBlobStore().get(asset.blobKey);
  if (!file) return errorResponse(404, "not_found", "Not found.");
  const designer = await store.getTemplateDesignerByClient(asset.clientId);
  await recordAudit({
    actor: admin,
    action: "market.details_viewed",
    target: { type: "market_designer", id: designer?.id ?? null },
    clientId: asset.clientId,
    summary: `Opened the ID document of “${designer?.name ?? asset.clientId}” for their payout checks`,
  });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": asset.contentType,
      "content-length": String(file.data.length),
      "content-disposition": "inline",
      "cache-control": "private, no-store",
      "content-security-policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex",
      "referrer-policy": "no-referrer",
    },
  });
}
