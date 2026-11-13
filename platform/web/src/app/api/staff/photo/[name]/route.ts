import { STAFF_PHOTO_NAME, STAFF_PHOTO_PREFIX } from "@/lib/admin/account-managers";
import { getBlobStore } from "@/lib/blobs";
import { getStore } from "@/lib/data";

/**
 * GET /api/staff/photo/<name>: 125 an account manager's photo, as clients
 * see it in Yallapp Business (Admin › Team). Only while it is a team
 * member's photo; a replaced or removed photo is gone.
 */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: RouteContext<"/api/staff/photo/[name]">): Promise<Response> {
  const { name } = await params;
  if (!STAFF_PHOTO_NAME.test(name)) return new Response("Not found.", { status: 404 });
  const profiles = await (await getStore()).listStaffProfiles();
  if (!profiles.some((p) => p.photo === name)) return new Response("Not found.", { status: 404 });
  const file = await getBlobStore().get(`${STAFF_PHOTO_PREFIX}${name}`);
  if (!file) return new Response("Not found.", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": file.contentType,
      "content-length": String(file.data.length),
      "cache-control": "public, max-age=3600",
      "content-security-policy": "default-src 'none'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
}
