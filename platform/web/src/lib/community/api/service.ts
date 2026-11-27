import { YALLAPP_TENANT } from "../types";
import { authenticate } from "../auth/sessions";
import { isCommunityAdmin } from "../staff";
import { errorMessage, languageFromHeader, t } from "../i18n";
import { BASE_ROUTES } from "./base-routes";
import { CONNECT_ROUTES } from "./connect-routes";
import { CommunityError, type CommunityContext, type CommunityDeps, type CommunityRequest, type CommunityResult, type CommunityRoute } from "./http";
import { QA_ROUTES } from "./qa-routes";
import { TRUST_ROUTES } from "./trust-routes";

/**
 * 231 The Community API's dispatcher: finds the route for the method and
 * path among the three areas', signs the member in from the token, picks
 * the language, runs the handler, and turns errors into
 * `{ error: { code, message, fields? } }` in the reader's language.
 */
export const COMMUNITY_ROUTES: readonly CommunityRoute[] = [...BASE_ROUTES, ...QA_ROUTES, ...TRUST_ROUTES, ...CONNECT_ROUTES];

interface Compiled {
  route: CommunityRoute;
  parts: string[];
}

const compiled: Compiled[] = COMMUNITY_ROUTES.map((route) => ({ route, parts: route.path.split("/").filter(Boolean) }));

/** The route's `:name` values when `path` fits it; null otherwise. */
function fit(parts: string[], path: string[]): Record<string, string> | null {
  if (parts.length !== path.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const value = path[i]!;
    if (part.startsWith(":")) params[part.slice(1)] = value;
    else if (part !== value) return null;
  }
  return params;
}

/** The route for the request: fixed parts win over `:name` ones ("/qa/questions/similar" before "/qa/questions/:id"). */
export function matchRoute(method: string, path: string[]): { route: CommunityRoute; params: Record<string, string> } | "method" | null {
  let pathFits = false;
  let best: { route: CommunityRoute; params: Record<string, string>; fixed: number } | null = null;
  for (const { route, parts } of compiled) {
    const params = fit(parts, path);
    if (!params) continue;
    pathFits = true;
    if (route.method !== method) continue;
    const fixed = parts.filter((p) => !p.startsWith(":")).length;
    if (!best || fixed > best.fixed) best = { route, params, fixed };
  }
  if (best) return { route: best.route, params: best.params };
  return pathFits ? "method" : null;
}

function errorBody(ctx: Pick<CommunityContext, "lang">, error: CommunityError): CommunityResult {
  const fields = error.fields ? Object.fromEntries(Object.entries(error.fields).map(([k, v]) => [k, t(ctx.lang, v)])) : undefined;
  return {
    status: error.status,
    body: { error: { code: error.code, message: errorMessage(ctx.lang, error.code), ...(fields ? { fields } : {}) } },
    ...(error.headers ? { headers: error.headers } : {}),
  };
}

export async function handleCommunity(deps: CommunityDeps, req: CommunityRequest): Promise<CommunityResult> {
  const headerLang = languageFromHeader(req.acceptLanguage);
  const path = req.path.map((p) => decodeURIComponent(p));
  const found = matchRoute(req.method.toUpperCase(), path);
  if (found === null) return errorBody({ lang: headerLang }, new CommunityError(404, "not_found"));
  if (found === "method") return errorBody({ lang: headerLang }, new CommunityError(405, "method_not_allowed"));
  const { route, params } = found;
  // 232–235 Linking a Yallapp account is Yallapp Community's own; a client app's community hasn't it.
  if (route.yallappOnly && deps.tenant !== YALLAPP_TENANT) return errorBody({ lang: headerLang }, new CommunityError(404, "not_found"));
  const signedIn = req.token ? await authenticate(deps.store.base, req.token, deps.now) : null;
  const ctx: CommunityContext = {
    deps,
    tenant: deps.tenant,
    req,
    store: deps.store,
    now: deps.now,
    member: signedIn?.member ?? null,
    session: signedIn?.session ?? null,
    lang: signedIn?.member.language ?? headerLang,
    params,
    query: req.query,
    json: () => (req.body && typeof req.body === "object" && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {}),
  };
  try {
    const auth = route.auth ?? "member";
    if (auth !== "public") {
      if (!ctx.member) throw new CommunityError(401, "invalid_token");
      // A suspended member can still sign out and read their own account.
      const own = route.path === "/auth/log-out" || (route.path === "/me" && route.method === "GET");
      if (ctx.member.status === "suspended" && !own) throw new CommunityError(403, "account_suspended");
      // 231 A Community admin's linked Yallapp account is an owner or admin of Yallapp's admin, asked again now (lib/community/staff.ts).
      // 232–235 A client app's community is run by the client, from their dashboard (CommunityRequest.tenantAdmin).
      if (auth === "admin" && !(deps.tenant === YALLAPP_TENANT ? await isCommunityAdmin(req, deps.platform, ctx.member) : req.tenantAdmin === true)) {
        throw new CommunityError(403, "not_admin");
      }
    }
    return await route.handler(ctx);
  } catch (error) {
    if (error instanceof CommunityError) return errorBody(ctx, error);
    throw error;
  }
}
