import type { DataStore } from "../../data/store";
import type { CommunityStore } from "../store";
import type { CommunityLanguage, CommunityMember, CommunitySession, CommunityTenant } from "../types";
import type { IdTokenVerifier } from "../auth/id-tokens";
import type { CommunityMailer } from "../mail";
import type { CommunityPusher } from "../engage/push";
import type { CourseCheckoutGateway, CourseShop } from "../engage/checkout";

/**
 * 231 The Community API's plumbing (/api/community/v1, docs/api/community.yaml):
 * what a handler gets, what it answers, and errors with a code whose message
 * is written in the reader's language (lib/community/i18n).
 *
 * Each area keeps its routes in its own file: base-routes.ts (A),
 * qa-routes.ts (B), trust-routes.ts (C).
 */

export interface CommunityDeps {
  /**
   * 232–235 Whose community: "yallapp" (Yallapp Community), or a client
   * app's id (/api/app/{app_id}/community/v1). `store` is that tenant's.
   */
  tenant: CommunityTenant;
  store: CommunityStore;
  /** Yallapp's own data store: rate limits, and the Yallapp account a member links (its apps and plans). */
  platform: DataStore;
  now: Date;
  ip: string;
  /** The community's website, https://community.yallapp.com.tr (links in emails). */
  siteUrl: string;
  /** Yallapp's website, https://yallapp.com.tr (linking a Yallapp account is confirmed there). */
  yallappUrl: string;
  /** Checks Apple's and Google's ID tokens; null: that provider isn't set up here (503 provider_not_configured). */
  apple: IdTokenVerifier | null;
  google: IdTokenVerifier | null;
  mail: CommunityMailer;
  /** Stores a file and gives its public URL (profile pictures); null when uploads aren't set up. */
  upload: ((key: string, bytes: Uint8Array, contentType: string) => Promise<string>) | null;
  /** Private files (area C's ID proofs); none: the blob store. Never served publicly. */
  privateFiles?: { put(key: string, bytes: Uint8Array, contentType: string): Promise<void>; get(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null>; delete?(key: string): Promise<void> };
  /** Signs short-lived links to private files; none: SIGNING_SECRET. */
  fileSecret?: string;
  /** 235 The hosted API's token secret (a client app's customers sign in to its community with theirs); none: from SIGNING_SECRET. */
  hostedSecret?: string;
  /** 232 Push to the Community app's phones (lib/community/engage/push.ts); null or none: push isn't set up here. */
  push?: CommunityPusher | null;
  /** 233 Area B's academy, for the course checkout (lib/community/engage/checkout.ts); none: courses can't be bought. */
  courses?: CourseShop | null;
  /** 233 Yallapp's own website checkout (Studio Market's); none: courses can't be bought. */
  courseCheckout?: (() => Promise<CourseCheckoutGateway>) | null;
}

export type CommunityMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface CommunityRequest {
  method: string;
  /** The path after /api/community/v1, split ("qa", "questions", "…"). */
  path: string[];
  query: URLSearchParams;
  /** The parsed JSON body, or undefined. */
  body: unknown;
  /** A multipart request's form (uploads). */
  form: FormData | null;
  token: string | null;
  acceptLanguage: string | null;
  /**
   * 232–235 A client app's community is run from the client's dashboard:
   * its server code calls the engine in-process with this set, for the
   * tenant's `auth: "admin"` routes. Never set from an HTTP request.
   */
  tenantAdmin?: boolean;
}

export interface CommunityContext {
  deps: CommunityDeps;
  /** 232–235 Whose community (deps.tenant): "yallapp" or a client app's id. */
  tenant: CommunityTenant;
  req: CommunityRequest;
  store: CommunityStore;
  now: Date;
  /** The signed-in member, or null on a public path read without a token. */
  member: CommunityMember | null;
  session: CommunitySession | null;
  /** The member's language, else Accept-Language's, else English. */
  lang: CommunityLanguage;
  /** The route's `:name` parts. */
  params: Record<string, string>;
  query: URLSearchParams;
  /** The JSON body as an object ({} when none). */
  json(): Record<string, unknown>;
}

/** A context whose member is signed in (routes with `auth: "member"` or `"admin"`). */
export type MemberContext = CommunityContext & { member: CommunityMember; session: CommunitySession };

export interface CommunityResult {
  status: number;
  body?: unknown;
  /** 234 A body that isn't JSON (an event's .ics file), sent as it is with `headers`' content type. */
  text?: string;
  headers?: Record<string, string>;
}

export interface CommunityRoute {
  method: CommunityMethod;
  /** After /api/community/v1, with `:name` for a part: "/qa/questions/:question_id". */
  path: string;
  /** member (the default): a token is needed; public: read with or without one; admin: role admin. */
  auth?: "member" | "public" | "admin";
  /** 232–235 Only in Yallapp Community (linking a Yallapp account, Continue with Yallapp): another tenant's community answers 404. */
  yallappOnly?: boolean;
  handler: (ctx: CommunityContext) => Promise<CommunityResult>;
}

/** An answer with a body (200 unless said). */
export function ok(body: unknown, status = 200, headers?: Record<string, string>): CommunityResult {
  return { status, body, ...(headers ? { headers } : {}) };
}

export function noContent(): CommunityResult {
  return { status: 204 };
}

/**
 * An error the API answers with: `{ error: { code, message, fields? } }`.
 * The message is found by its code in the reader's language
 * (lib/community/i18n errors); `fields` maps a field to its code.
 */
export class CommunityError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly fields?: Record<string, string>,
    readonly headers?: Record<string, string>,
  ) {
    super(code);
  }
}

export function fail(status: number, code: string, fields?: Record<string, string>): never {
  throw new CommunityError(status, code, fields);
}

export const notFound = (): never => fail(404, "not_found");
export const notAllowed = (): never => fail(400, "not_allowed");
export const forbidden = (code = "not_allowed"): never => fail(403, code);
export const invalid = (fields: Record<string, string>): never => fail(400, "invalid_request", fields);

export function tooMany(retryAfter: number): never {
  throw new CommunityError(429, "too_many_attempts", undefined, { "retry-after": String(retryAfter) });
}

/** The signed-in member, or 401 invalid_token (for handlers on public routes that need one for a part). */
export function requireMember(ctx: CommunityContext): MemberContext {
  if (!ctx.member || !ctx.session) fail(401, "invalid_token");
  return ctx as MemberContext;
}

// ------------------------------------------------------------ reading input

export function str(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  return typeof value === "string" ? value : undefined;
}

/** The page asked for: `limit` (1–50, default 20) and the offset in `cursor`. */
export function pageOf(query: URLSearchParams, max = 50): { offset: number; limit: number } {
  const limit = Math.min(max, Math.max(1, Number.parseInt(query.get("limit") ?? "20", 10) || 20));
  const offset = Math.max(0, Number.parseInt(query.get("cursor") ?? "0", 10) || 0);
  return { offset, limit };
}

/** A page's answer: the items, and the next cursor when there are more. */
export function page<T>(items: T[], offset: number, limit: number, hasMore: boolean): { items: T[]; next_cursor: string | null } {
  return { items, next_cursor: hasMore ? String(offset + limit) : null };
}

export function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}
