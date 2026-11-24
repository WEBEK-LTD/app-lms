import { getBlobStore } from "@/lib/blobs";
import { fileLinkValid } from "@/lib/community/trust/context";
import { signingSecret } from "@/lib/env";

/**
 * 231 A Gold verification request's ID proof, for the admin who asked for
 * it (GET /api/community/v1/admin/verification-requests/{id}/id-proof):
 * only through that link, signed and good for 5 minutes, never cached and
 * never indexed. ID proofs are kept apart from the Community's public files.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const key = url.searchParams.get("k") ?? "";
  const expires = Number(url.searchParams.get("e"));
  const signature = url.searchParams.get("s") ?? "";
  const headers = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer" };
  if (!key.startsWith("community/id-proof/") || key.includes("..") || !fileLinkValid(signingSecret(), key, expires, signature, new Date())) {
    return new Response("This link has expired.", { status: 403, headers });
  }
  const file = await getBlobStore().get(key);
  if (!file) return new Response("Not found.", { status: 404, headers });
  return new Response(new Uint8Array(file.data), { status: 200, headers: { ...headers, "content-type": file.contentType, "content-disposition": "inline", "x-content-type-options": "nosniff" } });
}
