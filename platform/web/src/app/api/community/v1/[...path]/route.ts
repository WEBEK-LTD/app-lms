import { readCommunityBody } from "@/lib/community/api/body";
import { handleCommunity } from "@/lib/community/api/service";
import { communityOrigins, cookieRequestAllowed } from "@/lib/community/csrf";
import { communityDeps } from "@/lib/community/deps";
import { errorResponse, ipFromHeaders, json, noContent } from "@/lib/http";

/** The website sends the access token in its cookie instead of a header. */
const ACCESS_COOKIE = /(?:^|;\s*)yc_access=([^;]+)/;

/**
 * 231 The Community API (docs/api/community.yaml, server
 * https://community.yallapp.com.tr/api/community/v1): Yallapp Community's
 * app and website. One dispatcher for the three areas' routes
 * (lib/community/api/service.ts).
 */
async function handle(request: Request, { params }: RouteContext<"/api/community/v1/[...path]">): Promise<Response> {
  const { path } = await params;
  const read = await readCommunityBody(request);
  if (!read.ok) return errorResponse(read.status, read.code, read.message);
  const { body, form } = read;
  const deps = await communityDeps({ ip: ipFromHeaders(request.headers) });
  const bearer = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1]?.trim();
  // 231 The cookie signs in a change only from the community's own pages (lib/community/csrf.ts).
  const cookie = cookieRequestAllowed(request.method, request.headers, communityOrigins(deps.siteUrl, deps.yallappUrl)) ? ACCESS_COOKIE.exec(request.headers.get("cookie") ?? "")?.[1] : undefined;
  const result = await handleCommunity(deps, {
    method: request.method,
    path,
    query: new URL(request.url).searchParams,
    body,
    form,
    token: bearer || (cookie ? decodeURIComponent(cookie) : null),
    acceptLanguage: request.headers.get("accept-language"),
  });
  if (result.status === 204) return noContent();
  return json(result.body, result.status, result.headers);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
