import { getStore } from "@/lib/data";
import { fileUrl, isMediaId, isPublic, PICTURE_CDN_SECONDS, PUBLIC_LINK_SECONDS } from "@/lib/media/files";
import { getMediaStorage } from "@/lib/media/storage";

/**
 * 51 A Media library file's own link, /m/<id>. Pictures (and files the owner
 * shared) open from it: a redirect to a signed link on the media gate, so
 * the bytes never pass through here. A lesson's video plays only from links
 * signed for a student who may open the lesson (the hosted API, or the
 * WordPress plugin through POST /api/v1/licenses/media).
 */
export const dynamic = "force-dynamic";

const refuse = (status: number, message: string) =>
  new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });

export async function GET(_request: Request, { params }: RouteContext<"/m/[id]">): Promise<Response> {
  const { id } = await params;
  if (!isMediaId(id)) return refuse(404, "Not found.");
  const file = await (await getStore()).getMediaFileById(id);
  const storage = getMediaStorage();
  if (!file || file.status !== "ready" || !storage) return refuse(404, "This file isn't available.");
  if (!isPublic(file)) return refuse(403, "This video plays in the app, for the people who may watch it.");
  const { url } = fileUrl(storage, file, { ttlSeconds: PUBLIC_LINK_SECONDS });
  // Cached for a few minutes, well within the signed link's 6 hours.
  const headers: Record<string, string> = { location: url, "cache-control": "private, max-age=300", "referrer-policy": "no-referrer", "x-robots-tag": "noindex" };
  // A picture's link is the same for everyone: Netlify's CDN answers it for an hour (still 5 hours
  // left on the link), so a product's photos don't each wait for this function and the database
  // first. Other files stay uncached: the owner may stop sharing them.
  if (file.kind === "image") headers["netlify-cdn-cache-control"] = `public, durable, max-age=${PICTURE_CDN_SECONDS}`;
  return new Response(null, { status: 302, headers });
}

export const HEAD = GET;
