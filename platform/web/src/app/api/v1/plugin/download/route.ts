import { getBlobStore } from "@/lib/blobs";
import { verifySignedUrl } from "@/lib/crypto/signed-url";
import { getStore } from "@/lib/data";
import { signingSecret } from "@/lib/env";
import { errorResponse } from "@/lib/http";

/** Serves a plugin release zip from a signed, expiring link. */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const check = verifySignedUrl(url, signingSecret());
  if (check === "expired") return errorResponse(410, "link_expired", "This download link has expired. Get a new one from your dashboard.");
  if (check !== "valid") return errorResponse(403, "invalid_signature", "This download link isn't valid.");
  const store = await getStore();
  const release = await store.getRelease(url.searchParams.get("release") ?? "");
  if (!release) return errorResponse(404, "not_found", "This release no longer exists.");
  const file = await getBlobStore().get(release.blobKey);
  if (!file) return errorResponse(404, "not_found", "This release file is missing.");
  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": "application/zip",
      "content-length": String(file.data.length),
      "content-disposition": `attachment; filename="yallapp-${release.version}.zip"`,
      "cache-control": "private, no-store",
    },
  });
}
