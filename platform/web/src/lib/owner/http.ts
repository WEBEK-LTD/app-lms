import type { Lang } from "@/i18n/config";
import type { DashT } from "@/i18n/dashboard";
import type { AccountState } from "../license/status";
import type { DataStore } from "../data/store";
import type { App, Client, License, OwnerDevice, User } from "../data/types";
import type { MediaStorage } from "../media/storage";
import type { ProviderUrls } from "../payments/provider";
import type { sendPush } from "../hosted/push";
import type { RefundDeps } from "../refunds/service";
import type { TeamAccess, TeamPermission } from "../team/permissions";
import type { Business } from "../team/service";

/**
 * 58 The Owner API's plumbing: what a handler gets, what it answers, and
 * errors that carry a code and an English message (translated by their
 * words, like the dashboard's `known` texts, before they leave).
 */

export interface OwnerDeps {
  store: DataStore;
  now: Date;
  ip: string;
  signingSecret: string;
  encryptionKey: Buffer;
  /** yallapp.com.tr (APP_URL): links back to the website and dashboard. */
  baseUrl: string;
  paymentUrls: ProviderUrls;
  /** The Media library's storage; null when uploads aren't set up. */
  media: MediaStorage | null;
  /** The refund emails to customers (in the app's name). */
  mail: RefundDeps["mail"];
  /** 60 The `team_invitation` email (lib/email/send.ts sendTemplate). */
  teamMail?: (to: string, values: Record<string, string>, lang: Lang) => Promise<unknown>;
  /** Pushes to the app's own users (the kitchen's steps, inquiry replies, notifications); tests pass a fake. */
  sendPush?: typeof sendPush;
}

export interface OwnerRequest {
  method: string;
  path: string[];
  query: URLSearchParams;
  body: unknown;
  token: string | null;
  acceptLanguage: string | null;
}

export interface OwnerResult {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

/** The signed-in person on a request. */
export interface OwnerContext {
  deps: OwnerDeps;
  req: OwnerRequest;
  user: User;
  client: Client;
  device: OwnerDevice;
  /** 60 What the person may do on this business (the owner's, or their role on its team). */
  access: TeamAccess;
  /** 60 Every business the person works on, their own first. */
  businesses: Business[];
  /** The business's apps the person works on (all of them for the owner). */
  apps: App[];
  licenses: License[];
  /** The whole account's state, as the dashboard has it. */
  state: AccountState;
  lang: Lang;
  t: DashT;
  /** Translates an English text from shared code (a `known` text), else keeps it. */
  k: (english: string) => string;
}

export class OwnerError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    /** English; translated where it is answered. */
    readonly english: string,
    readonly extra: { errors?: Record<string, string>; retryAfter?: number } = {},
  ) {
    super(english);
    this.name = "OwnerError";
  }
}

export const NOT_FOUND = "Not found.";
export const notFound = () => new OwnerError(404, "not_found", NOT_FOUND);
export const notAvailable = () => new OwnerError(404, "not_available", "Your app doesn't have this.");
export const invalid = (errors?: Record<string, string>, english = "The request isn't valid.") => new OwnerError(400, "invalid_request", english, errors ? { errors } : {});
/** 60 The person's role on the team doesn't allow it. */
export const notAllowed = () => new OwnerError(403, "not_allowed", "Your role on this team doesn't allow this. Ask the owner.");
export const rateLimited = (retryAfter: number, english = "Too many requests. Try again shortly.") => new OwnerError(429, "rate_limited", english, { retryAfter });

/** The body of an error, in a language. */
export function errorBody(error: OwnerError, k: (english: string) => string): OwnerResult {
  const body: Record<string, unknown> = { code: error.code, message: k(error.english) };
  if (error.extra.errors) body.errors = Object.fromEntries(Object.entries(error.extra.errors).map(([field, text]) => [field, k(text)]));
  if (error.extra.retryAfter) body.retry_after_seconds = error.extra.retryAfter;
  return { status: error.status, body, headers: error.extra.retryAfter ? { "retry-after": String(error.extra.retryAfter) } : {} };
}

// Reading requests

export function bodyObject(body: unknown): Record<string, unknown> {
  if (body === undefined || body === null) return {};
  if (typeof body !== "object" || Array.isArray(body)) throw invalid();
  return body as Record<string, unknown>;
}

export function intParam(value: string | undefined): number {
  const n = Number(value);
  if (!value || !/^\d{1,15}$/.test(value) || !Number.isSafeInteger(n)) throw notFound();
  return n;
}

export function paging(query: URLSearchParams): { page: number; perPage: number; offset: number } {
  const read = (name: string, fallback: number, max: number) => {
    const raw = query.get(name);
    if (raw === null || raw === "") return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > max) throw invalid({ [name]: "The request isn't valid." });
    return n;
  };
  const page = read("page", 1, 100_000);
  const perPage = read("per_page", 20, 50);
  return { page, perPage, offset: (page - 1) * perPage };
}

export function pageJson(page: { page: number; perPage: number }, total: number) {
  return { page: page.page, per_page: page.perPage, total, total_pages: Math.max(1, Math.ceil(total / page.perPage)) };
}

export const iso = (date: Date | null | undefined) => (date ? date.toISOString() : null);

// Routing

export type Handler = (ctx: OwnerContext, params: Record<string, string>) => Promise<OwnerResult>;

export interface Route {
  method: string;
  /** Segments; `:name` takes one. */
  pattern: string[];
  handler: Handler;
  /** Answers for pending and suspended accounts too (the person's own settings). */
  anyState?: boolean;
  /** 60 What the person must be allowed (lib/team/permissions.ts), on the path's app when it has one. */
  permission?: TeamPermission;
}

export function route(method: string, pattern: string, handler: Handler, options: { anyState?: boolean; permission?: TeamPermission } = {}): Route {
  return { method, pattern: pattern.split("/").filter(Boolean), handler, ...options };
}

/** The route for a path, or why there's none (404, or 405 when the path exists with another method). */
export function match(routes: Route[], method: string, path: string[]): { route: Route; params: Record<string, string> } | 404 | 405 {
  let pathMatched = false;
  for (const candidate of routes) {
    if (candidate.pattern.length !== path.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < path.length && ok; i += 1) {
      const part = candidate.pattern[i]!;
      if (part.startsWith(":")) params[part.slice(1)] = path[i]!;
      else ok = part === path[i];
    }
    if (!ok) continue;
    if (candidate.method === method) return { route: candidate, params };
    pathMatched = true;
  }
  return pathMatched ? 405 : 404;
}
