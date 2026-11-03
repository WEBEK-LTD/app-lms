import { getBlobStore } from "@/lib/blobs";

/** 114 GET /api/mail/image/<name>: a picture the admin put in a campaign email (public: it's in the email). */
export const dynamic = "force-dynamic";

const NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|gif)$/i;

export async function GET(_request: Request, { params }: RouteContext<"/api/mail/image/[name]">): Promise<Response> {
  const { name } = await params;
  if (!NAME.test(name)) return new Response("Not found.", { status: 404 });
  const file = await getBlobStore().get(`mail-images/${name}`);
  if (!file) return new Response("Not found.", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": file.contentType,
      "content-length": String(file.data.length),
      "cache-control": "public, max-age=31536000, immutable",
      "content-security-policy": "default-src 'none'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
}
