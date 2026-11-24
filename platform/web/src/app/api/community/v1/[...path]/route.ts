import { handleCommunity } from "@/lib/community/api/service";
import { communityOrigins, cookieRequestAllowed } from "@/lib/community/csrf";
import { communityDeps } from "@/lib/community/deps";
import { errorResponse, ipFromHeaders, json, noContent } from "@/lib/http";

/** Questions and tutorials are long; a picture or an ID proof comes as multipart and is checked by its handler. */
const MAX_JSON = 131_072;
const MAX_FORM = 11 * 1024 * 1024;

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
  const type = request.headers.get("content-type") ?? "";
  let body: unknown;
  let form: FormData | null = null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    // The size is checked before the body is read: a body without its length isn't taken.
    const length = request.headers.get("content-length");
    const size = Number(length);
    if (request.body && (length === null || !Number.isFinite(size))) return errorResponse(411, "invalid_request", "The request needs its Content-Length.");
    if (type.startsWith("multipart/form-data")) {
      if (size > MAX_FORM) return errorResponse(413, "too_large", "The file is too large.");
      try {
        form = await request.formData();
      } catch {
        return errorResponse(400, "invalid_request", "The form could not be read.");
      }
    } else {
      if (size > MAX_JSON) return errorResponse(413, "invalid_request", "The request is too large.");
      // A body is JSON, said so: a cross-site form (text/plain, urlencoded) can't pass for one.
      if (size > 0 && !type.toLowerCase().startsWith("application/json")) return errorResponse(415, "invalid_request", "The request body must be JSON.");
      const raw = await request.text();
      if (raw.length > MAX_JSON) return errorResponse(413, "invalid_request", "The request is too large.");
      if (raw.trim() !== "") {
        try {
          body = JSON.parse(raw) as unknown;
        } catch {
          return errorResponse(400, "invalid_request", "The request body must be JSON.");
        }
      }
    }
  }
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
