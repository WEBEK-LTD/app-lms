import { getBlobStore } from "@/lib/blobs";
import { COMMUNITY_MEDIA_PREFIX } from "@/lib/community/deps";

const TENANT = /^[\w-]{1,36}$/;
const NAME = /^[0-9a-f-]{36}(-poster)?\.(jpg|png|webp|mp4|webm)$/;

/**
 * 232 A community photo or video (posts, stories, the showcase: area B).
 * Each upload has its own name, so it is cached for good; a video answers
 * a Range request with its part (206), as browsers need to play and seek.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/community/media/[tenant]/[name]">): Promise<Response> {
  const { tenant, name } = await params;
  if (!TENANT.test(tenant) || !NAME.test(name)) return new Response("Not found", { status: 404 });
  const file = await getBlobStore().get(`${COMMUNITY_MEDIA_PREFIX}${tenant}/${name}`);
  if (!file) return new Response("Not found", { status: 404 });
  const data = new Uint8Array(file.data);
  const headers: Record<string, string> = {
    "content-type": file.contentType,
    "cache-control": "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
    "accept-ranges": "bytes",
  };
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const size = data.length;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(size - 1, end);
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    return new Response(data.subarray(start, end + 1), { status: 206, headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) } });
  }
  return new Response(data, { headers: { ...headers, "content-length": String(data.length) } });
}
