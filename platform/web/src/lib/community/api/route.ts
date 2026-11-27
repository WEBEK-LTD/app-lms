import "server-only";
import { getStore } from "../../data";
import { errorResponse, ipFromHeaders, json, noContent } from "../../http";
import { communityOrigins, cookieRequestAllowed } from "../csrf";
import { communityDeps } from "../deps";
import { YALLAPP_TENANT, type CommunityTenant } from "../types";
import { readCommunityBody } from "./body";
import { handleCommunity } from "./service";

/** The website sends the access token in its cookie instead of a header. */
const ACCESS_COOKIE = /(?:^|;\s*)yc_access=([^;]+)/;

/**
 * 231 One request to the Community API, for a tenant (232–235): Yallapp
 * Community's (/api/community/v1) or a client app's own community
 * (/api/app/{app_id}/community/v1). Only Yallapp Community's website signs
 * in with a cookie; a client app's community sends its bearer token.
 */
export async function serveCommunity(request: Request, path: string[], tenant: CommunityTenant = YALLAPP_TENANT): Promise<Response> {
  const read = await readCommunityBody(request);
  if (!read.ok) return errorResponse(read.status, read.code, read.message);
  const { body, form } = read;
  const deps = await communityDeps({ ip: ipFromHeaders(request.headers), tenant });
  const bearer = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1]?.trim();
  // 231 The cookie signs in a change only from the community's own pages (lib/community/csrf.ts).
  const cookie =
    tenant === YALLAPP_TENANT && cookieRequestAllowed(request.method, request.headers, communityOrigins(deps.siteUrl, deps.yallappUrl))
      ? ACCESS_COOKIE.exec(request.headers.get("cookie") ?? "")?.[1]
      : undefined;
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
  if (result.text !== undefined) return new Response(result.text, { status: result.status, headers: result.headers });
  return json(result.body, result.status, result.headers);
}

/**
 * 235 The tenant of /api/app/{app_id}/community/v1: the app, when it exists
 * (not deleted); null otherwise (404). Phase 5's Studio template decides
 * which apps show the community's screens; the engine answers for any app.
 */
export async function appTenant(appId: string): Promise<CommunityTenant | null> {
  if (!/^[0-9a-f-]{36}$/i.test(appId) || appId === YALLAPP_TENANT) return null;
  const app = await (await getStore()).getAppById(appId);
  return app ? app.id : null;
}
