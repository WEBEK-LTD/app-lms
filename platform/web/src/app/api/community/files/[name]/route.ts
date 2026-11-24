import { getBlobStore } from "@/lib/blobs";
import { PUBLIC_COMMUNITY_PREFIX } from "@/lib/community/deps";

const NAME = /^[0-9a-f-]{36}-\d{10,15}\.(jpg|png|webp)$/;

/** 231 A community member's profile picture (the only public community files). Each upload has its own name, so it is cached for good. */
export async function GET(_request: Request, { params }: RouteContext<"/api/community/files/[name]">): Promise<Response> {
  const { name } = await params;
  if (!NAME.test(name)) return new Response("Not found", { status: 404 });
  const file = await getBlobStore().get(`${PUBLIC_COMMUNITY_PREFIX}${name}`);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: { "content-type": file.contentType, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
  });
}
