import { adminCan } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { getStore } from "@/lib/data";
import { REVIEW_PHOTO_NAME, REVIEW_PHOTO_PREFIX, shownReviews } from "@/lib/reviews/reviews";

/**
 * GET /api/reviews/photo/<name>: a customer's photo on the home page's
 * reviews (Admin › Reviews). Only while its review is shown; the team sees
 * the photos of hidden reviews too. A deleted review's photo is gone.
 */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: RouteContext<"/api/reviews/photo/[name]">): Promise<Response> {
  const { name } = await params;
  if (!REVIEW_PHOTO_NAME.test(name)) return new Response("Not found.", { status: 404 });
  const reviews = await (await getStore()).listSiteReviews();
  const shown = shownReviews(reviews).some((r) => r.photo === name);
  if (!shown && !(reviews.some((r) => r.photo === name) && (await adminCan("view")))) return new Response("Not found.", { status: 404 });
  const file = await getBlobStore().get(`${REVIEW_PHOTO_PREFIX}${name}`);
  if (!file) return new Response("Not found.", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": file.contentType,
      "content-length": String(file.data.length),
      "cache-control": shown ? "public, max-age=3600" : "private, no-store",
      "content-security-policy": "default-src 'none'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
}
