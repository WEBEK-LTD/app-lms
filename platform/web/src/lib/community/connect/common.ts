import { randomUUID } from "node:crypto";
import { hitRateLimit, type RateLimitRule } from "../../rate-limit";
import { fail, tooMany, type CommunityContext, type MemberContext } from "../api/http";
import { memberSummaries, type MemberSummaryView } from "../api/views";
import { findMember, imageTypeOf } from "../base/profile";
import type { CommunityMember } from "../types";

/** 232–234 What messages, groups, pros and jobs share: limits, members, pictures, text checks. */

export const CONNECT_LIMITS = {
  conversation: { name: "community-conversation:member", limit: 20, windowSeconds: 24 * 60 * 60 },
  message: { name: "community-message:member", limit: 60, windowSeconds: 60 },
  group: { name: "community-group:member", limit: 5, windowSeconds: 24 * 60 * 60 },
  hire: { name: "community-hire:member", limit: 10, windowSeconds: 24 * 60 * 60 },
  job: { name: "community-job:member", limit: 10, windowSeconds: 24 * 60 * 60 },
  application: { name: "community-application:member", limit: 30, windowSeconds: 24 * 60 * 60 },
  picture: { name: "community-picture:member", limit: 60, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

export async function limitConnect(ctx: MemberContext, rule: keyof typeof CONNECT_LIMITS): Promise<void> {
  const hit = await hitRateLimit(ctx.deps.platform, CONNECT_LIMITS[rule], ctx.member.id, ctx.now);
  if (!hit.allowed) tooMany(hit.retryAfter);
}

/** Members as the API shows them (MemberSummary), by id, in the reader's language. */
export async function summaries(ctx: CommunityContext, ids: readonly string[]): Promise<Map<string, MemberSummaryView>> {
  const views = await memberSummaries(ctx, [...new Set(ids)]);
  return new Map(views.map((v) => [v.id, v]));
}

/** A member named in the path (`:member`: an id or @username), active; 404 otherwise. */
export async function namedMember(ctx: CommunityContext, name = ctx.params.member ?? ""): Promise<CommunityMember> {
  const member = await findMember(ctx, name);
  if (!member || member.status !== "active") fail(404, "not_found");
  return member;
}

/** Whether one of the two blocked the other. */
export async function blockedBetween(ctx: CommunityContext, a: string, b: string): Promise<boolean> {
  return (await ctx.store.base.blockedEitherWay(a)).has(b);
}

const PICTURE_MAX = 5 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/**
 * Stores a picture (JPEG, PNG or WebP by its bytes, 5 MB at most) among the
 * community's public files, under a name nobody can guess; its URL.
 */
export async function storePicture(ctx: MemberContext, file: FormDataEntryValue, field: string): Promise<string> {
  const upload = ctx.deps.upload;
  if (!upload) fail(503, "uploads_unavailable");
  if (typeof file === "string") fail(400, "invalid_request", { [field]: "field.invalid" });
  if (file.size > PICTURE_MAX) fail(400, "invalid_request", { [field]: "field.too_large" });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = imageTypeOf(bytes);
  if (!type) fail(400, "invalid_request", { [field]: "field.invalid" });
  await limitConnect(ctx, "picture");
  return upload(`community/avatars/${randomUUID()}-${ctx.now.getTime()}.${EXT[type]}`, bytes, type);
}

/** A text field: trimmed, at most `max` characters (and at least `min`); its field's code otherwise. */
export function text(body: Record<string, unknown>, key: string, opts: { min?: number; max: number; required?: boolean }, fields: Record<string, string>): string {
  const raw = body[key];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (raw !== undefined && raw !== null && typeof raw !== "string") fields[key] = "field.invalid";
  else if (opts.required && !value) fields[key] = "field.required";
  else if (value && opts.min && value.length < opts.min) fields[key] = "field.too_short";
  else if (value.length > opts.max) fields[key] = "field.too_long";
  return value;
}

/** A list of short texts (skills): trimmed, unique (any case), at most `max` of at most `each` characters. */
export function textList(body: Record<string, unknown>, key: string, max: number, each: number, fields: Record<string, string>): string[] {
  const raw = body[key];
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.some((v) => typeof v !== "string")) {
    fields[key] = "field.invalid";
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw as string[]) {
    const t = v.trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    if (t.length > each) fields[key] = "field.too_long";
    seen.add(t.toLowerCase());
    out.push(t);
  }
  if (out.length > max) fields[key] = "field.too_many";
  return out;
}

const HTTPS = /^https?:\/\/[^\s/$.?#][^\s]*$/i;

/** Links (portfolio, applications): http(s) only, at most `max`. */
export function links(body: Record<string, unknown>, key: string, max: number, fields: Record<string, string>): string[] {
  const list = textList(body, key, max, 500, fields);
  if (list.some((u) => !HTTPS.test(u))) fields[key] = "field.invalid";
  return list;
}

export function invalidIf(fields: Record<string, string>): void {
  if (Object.keys(fields).length) fail(400, "invalid_request", fields);
}

/** A page's answer from `limit + 1` rows. */
export function pageOfRows<T, V>(rows: T[], offset: number, limit: number, view: (row: T) => V): { items: V[]; next_cursor: string | null } {
  return { items: rows.slice(0, limit).map(view), next_cursor: rows.length > limit ? String(offset + limit) : null };
}
