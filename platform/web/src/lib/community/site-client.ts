import "server-only";
import { headers } from "next/headers";
import { ipFromHeaders } from "../http";
import { handleCommunity } from "./api/service";
import { communityDeps } from "./deps";
import { browserLanguage, currentCommunityMember } from "./session";

/**
 * 231 The community website's server components and actions call the
 * Community API in-process, as the signed-in member (their cookie), with the
 * same answers the app gets: `const r = await communityApi("GET", "/qa/questions?section=studio")`.
 * `r.status` and `r.body` are the API's (docs/api/community.yaml); an
 * error's body is `{ error: { code, message, fields? } }`.
 */
export interface SiteApiResult<T = unknown> {
  status: number;
  body: T;
}

export async function communityApi<T = unknown>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", pathAndQuery: string, input: { body?: unknown; form?: FormData } = {}): Promise<SiteApiResult<T>> {
  const url = new URL(pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`, "http://community.local");
  const [signed, list, acceptLanguage] = await Promise.all([currentCommunityMember(), headers(), browserLanguage()]);
  const result = await handleCommunity(await communityDeps({ ip: ipFromHeaders(list) }), {
    method,
    path: url.pathname.split("/").filter(Boolean),
    query: url.searchParams,
    body: input.body,
    form: input.form ?? null,
    token: signed?.accessToken ?? null,
    acceptLanguage,
  });
  return { status: result.status, body: (result.body ?? null) as T };
}
