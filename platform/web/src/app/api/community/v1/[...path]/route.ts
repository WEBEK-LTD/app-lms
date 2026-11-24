import { handleCommunity } from "@/lib/community/api/service";
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
    if (type.startsWith("multipart/form-data")) {
      if (Number(request.headers.get("content-length") ?? 0) > MAX_FORM) return errorResponse(413, "too_large", "The file is too large.");
      try {
        form = await request.formData();
      } catch {
        return errorResponse(400, "invalid_request", "The form could not be read.");
      }
    } else {
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
  const bearer = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1]?.trim();
  const cookie = ACCESS_COOKIE.exec(request.headers.get("cookie") ?? "")?.[1];
  const result = await handleCommunity(await communityDeps({ ip: ipFromHeaders(request.headers) }), {
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
