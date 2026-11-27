import { serveCommunity } from "@/lib/community/api/route";

/**
 * 231 The Community API (docs/api/community.yaml, server
 * https://community.yallapp.com.tr/api/community/v1): Yallapp Community's
 * app and website, the tenant "yallapp". One dispatcher for the areas'
 * routes (lib/community/api/service.ts).
 */
async function handle(request: Request, { params }: RouteContext<"/api/community/v1/[...path]">): Promise<Response> {
  return serveCommunity(request, (await params).path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
