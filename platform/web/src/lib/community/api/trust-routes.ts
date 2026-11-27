import { findMember } from "../base/profile";
import { t } from "../i18n";
import type { CommunityBadge, MemberBadge } from "../trust/badges";
import { trustDepsOf } from "../trust/context";
import { requireCommunityRole, type StaffRole } from "../trust/roles";
import { prefsView } from "../trust/notifications";
import type { AuditEntry, Report, VerificationRequest } from "../trust/requests";
import * as T from "../trust/service";
import type { ModerationStatus, Page } from "../trust/store";
import type { CommunityReportStatus } from "../types";
import { fail, iso, noContent, ok, pageOf, page, type CommunityContext, type CommunityResult, type CommunityRoute, type MemberContext } from "./http";
import { linkedAppView, memberSummaries, memberSummary, type MemberSummaryView } from "./views";

/**
 * 231 Area C's routes (docs/api/community.yaml): the Gold verification form
 * (/badges/verification), the member's notifications (/notifications/*) and
 * the admins' tools (/admin/*): verification requests, members and their
 * badges, the audit log, the settings, the moderation queue and reports.
 * The work is in lib/community/trust/service.ts; these read the request and
 * shape the answer.
 */

/** A service refusal as the API's error: its code, and each field's word in the reader's language. */
function unwrap<V>(result: V | T.Fail): V {
  if (!T.isFail(result)) return result;
  const fields = result.errors ? Object.fromEntries(Object.keys(result.errors).map((field) => [field, fieldWord(field)])) : undefined;
  return fail(result.status, result.status === 403 && result.code === "forbidden" ? "not_admin" : result.code, fields);
}

const FIELD_WORDS = new Set(["full_name", "portfolio_links", "id_proof", "reason", "decision", "badge", "expires_at", "status", "email", "ids"]);
function fieldWord(field: string): string {
  return FIELD_WORDS.has(field) ? `trust.field.${field}` : "trust.field.setting";
}

const deps = (ctx: CommunityContext) => trustDepsOf(ctx);
const me = (ctx: CommunityContext) => (ctx as MemberContext).member;

/** The member a path names (`id` or `@username`), else 404. */
async function memberOf(ctx: CommunityContext) {
  return (await findMember(ctx, ctx.params.member ?? "")) ?? fail(404, "not_found");
}

/** A page of the service's (offset-based) list as the API's (`next_cursor`). */
function cursorPage<T, V>(ctx: CommunityContext, list: Page<T>, items: V[]): { items: V[]; next_cursor: string | null } {
  const { offset, limit } = pageOf(ctx.query);
  return page(items, offset, limit, list.next !== null);
}

/** The summaries of these members, by id (null ids stay null). */
async function summaries(ctx: CommunityContext, ids: (string | null)[]): Promise<Map<string, MemberSummaryView>> {
  const wanted = [...new Set(ids.filter((id): id is string => !!id))];
  const views = await memberSummaries(ctx, wanted);
  return new Map(wanted.map((id, i) => [id, views[i]!]));
}

// ——— Views (docs/api/community.yaml) ———

function verificationRequestView(r: VerificationRequest, member: MemberSummaryView) {
  return { id: r.id, member, full_name: r.fullName, portfolio_links: r.portfolioLinks, apps: r.apps.map((a) => ({ id: a.appId, name: a.name })), status: r.status, reason: r.reason, created_at: r.createdAt.toISOString(), reviewed_at: iso(r.reviewedAt) };
}

async function verificationStateView(ctx: CommunityContext, s: T.VerificationState) {
  return {
    has_gold: s.hasGold,
    app_count: s.appCount,
    required_apps: s.requiredApps,
    yallapp_linked: s.yallappLinked,
    can_apply: s.canApply,
    apps: s.apps.map(linkedAppView),
    request: s.request ? verificationRequestView(s.request, await memberSummary(ctx, s.request.memberId)) : null,
  };
}

function badgeGrantView(b: MemberBadge, grantedBy: MemberSummaryView | null) {
  return {
    id: b.id,
    badge: b.badge,
    source: b.source,
    reason: b.reason,
    granted_by: grantedBy,
    granted_at: b.grantedAt.toISOString(),
    expires_at: iso(b.expiresAt),
    revoked_at: iso(b.revokedAt),
    revoke_reason: b.revokeReason,
    company_name: b.details?.companyName ?? null,
    app_url: b.details?.appUrl ?? null,
  };
}

function auditView(e: AuditEntry, people: Map<string, MemberSummaryView>) {
  return { id: e.id, actor: e.actorId ? (people.get(e.actorId) ?? null) : null, action: e.action, member: e.memberId ? (people.get(e.memberId) ?? null) : null, target_type: e.targetType, target_id: e.targetId, reason: e.reason, details: e.details, created_at: e.createdAt.toISOString() };
}

function reportView(r: Report, people: Map<string, MemberSummaryView>) {
  return { id: r.id, reporter: people.get(r.reporterId)!, target_type: r.targetType, target_id: r.targetId, reason: r.reason, note: r.note, status: r.status, created_at: r.createdAt.toISOString(), handled_at: iso(r.handledAt) };
}

function moderationView(m: T.QueuedItem | T.ModerationItem, people: Map<string, MemberSummaryView>, extra?: { preview: string; reportCount: number }) {
  const queued = m as Partial<T.QueuedItem>;
  return {
    id: m.id,
    target_type: m.targetType,
    target_id: m.targetId,
    cause: m.cause,
    status: m.status,
    preview: extra?.preview ?? queued.preview ?? "",
    author: m.authorId ? (people.get(m.authorId) ?? null) : null,
    report_count: extra?.reportCount ?? queued.reportCount ?? 0,
    note: m.note,
    created_at: m.createdAt.toISOString(),
    handled_at: iso(m.handledAt),
  };
}

// ——— Handlers ———

async function getVerification(ctx: CommunityContext): Promise<CommunityResult> {
  return ok(await verificationStateView(ctx, await T.verificationState(deps(ctx), me(ctx).id)));
}

async function postVerification(ctx: CommunityContext): Promise<CommunityResult> {
  const form = ctx.req.form;
  const body = ctx.json();
  const file = form?.get("id_proof");
  const links = form ? form.getAll("portfolio_links").flatMap((v) => (typeof v === "string" ? (v.trim().startsWith("[") ? safeList(v) : [v]) : [])) : body.portfolio_links;
  const idProof = file && typeof file !== "string" ? { type: file.type, size: file.size, bytes: async () => new Uint8Array(await file.arrayBuffer()) } : null;
  const result = unwrap(await T.submitVerification(deps(ctx), me(ctx).id, { full_name: form ? form.get("full_name") : body.full_name, portfolio_links: links, idProof }));
  return ok(await verificationStateView(ctx, result.state), 201);
}

/** `portfolio_links` sent as one JSON list in a form field. */
function safeList(text: string): unknown[] {
  try {
    const v = JSON.parse(text) as unknown;
    return Array.isArray(v) ? v : [text];
  } catch {
    return [text];
  }
}

async function listNotifications(ctx: CommunityContext): Promise<CommunityResult> {
  const { offset, limit } = pageOf(ctx.query);
  const unreadOnly = ctx.query.get("unread") === "true" || ctx.query.get("unread") === "1";
  const blocked = await ctx.store.base.blockedEitherWay(me(ctx).id);
  const { page: list, unread } = await T.listNotifications(deps(ctx), me(ctx).id, { unreadOnly, offset, limit });
  // Never from someone the member blocked or who blocked them.
  const shown = list.items.filter((n) => !n.actorId || !blocked.has(n.actorId));
  const people = await summaries(ctx, shown.map((n) => n.actorId));
  const items = shown.map((n) => ({ id: n.id, kind: n.kind, text: n.text, link: n.link, actor: n.actorId ? (people.get(n.actorId) ?? null) : null, target_type: n.targetType, target_id: n.targetId, read: n.read, created_at: n.createdAt.toISOString() }));
  return ok({ ...cursorPage(ctx, list, items), unread_count: unread });
}

async function markRead(ctx: CommunityContext): Promise<CommunityResult> {
  unwrap(await T.markRead(deps(ctx), me(ctx).id, ctx.json()));
  return noContent();
}

async function getNotificationSettings(ctx: CommunityContext): Promise<CommunityResult> {
  return ok(await T.getPrefs(deps(ctx), me(ctx).id));
}

async function putNotificationSettings(ctx: CommunityContext): Promise<CommunityResult> {
  const result = unwrap(await T.updatePrefs(deps(ctx), me(ctx).id, ctx.json()));
  return ok({ email: result.email, push: result.push });
}

async function listVerificationRequests(ctx: CommunityContext): Promise<CommunityResult> {
  const status = ctx.query.get("status") ?? "pending";
  if (status !== "pending" && status !== "approved" && status !== "rejected") fail(400, "invalid_request", { status: "trust.field.status" });
  const { offset, limit } = pageOf(ctx.query);
  const { page: list } = unwrap(await T.listVerifications(deps(ctx), me(ctx).id, { status: status as VerificationRequest["status"], offset, limit }));
  const people = await summaries(ctx, list.items.map((r) => r.memberId));
  return ok(cursorPage(ctx, list, list.items.map((r) => verificationRequestView(r, people.get(r.memberId)!))));
}

async function decideVerificationRequest(ctx: CommunityContext): Promise<CommunityResult> {
  const { request } = unwrap(await T.decideVerification(deps(ctx), me(ctx).id, ctx.params.request_id ?? "", ctx.json()));
  return ok(verificationRequestView(request, await memberSummary(ctx, request.memberId)));
}

async function idProof(ctx: CommunityContext): Promise<CommunityResult> {
  const link = unwrap(await T.idProofLink(deps(ctx), me(ctx).id, ctx.params.request_id ?? ""));
  return ok({ url: link.url, expires_at: link.expiresAt.toISOString() }, 200, { "cache-control": "no-store" });
}

async function searchMembers(ctx: CommunityContext): Promise<CommunityResult> {
  const { offset, limit } = pageOf(ctx.query);
  const badge = ctx.query.get("badge");
  if (badge !== null && badge !== "gold" && badge !== "green" && badge !== "blue") fail(400, "invalid_request", { badge: "trust.field.badge" });
  const q = (ctx.query.get("q") ?? "").trim();
  // With a badge: walk the matches and keep the members holding it (one more than asked says there's a next page).
  const found: string[] = [];
  let scan = offset;
  const chunk = 50;
  for (let round = 0; round < 20 && found.length <= limit; round++) {
    const members = await ctx.store.base.searchMembers(q, badge ? scan : offset, badge ? chunk : limit + 1);
    if (!badge) {
      found.push(...members.map((m) => m.id));
      break;
    }
    const tops = await T.topBadges(deps(ctx), members.map((m) => m.id));
    for (const m of members) if (tops.get(m.id) === badge) found.push(m.id);
    scan += members.length;
    if (members.length < chunk) break;
  }
  const items = await memberSummaries(ctx, found.slice(0, limit));
  return ok(page(items, offset, limit, found.length > limit));
}

async function memberBadgesAdmin(ctx: CommunityContext): Promise<CommunityResult> {
  const member = await memberOf(ctx);
  const { badges } = unwrap(await T.adminMemberBadges(deps(ctx), me(ctx).id, member.id));
  const people = await summaries(ctx, badges.map((b) => b.grantedBy));
  return ok({ items: badges.map((b) => badgeGrantView(b, b.grantedBy ? (people.get(b.grantedBy) ?? null) : null)) });
}

async function grantBadge(ctx: CommunityContext): Promise<CommunityResult> {
  const member = await memberOf(ctx);
  const { badge } = unwrap(await T.grantBadge(deps(ctx), me(ctx).id, member.id, ctx.json()));
  return ok(badgeGrantView(badge, await memberSummary(ctx, me(ctx).id)), 201);
}

async function revokeBadge(ctx: CommunityContext): Promise<CommunityResult> {
  const member = await memberOf(ctx);
  unwrap(await T.revokeBadge(deps(ctx), me(ctx).id, member.id, ctx.params.badge ?? "", ctx.json()));
  return noContent();
}

async function memberStatus(ctx: CommunityContext): Promise<CommunityResult> {
  const member = await memberOf(ctx);
  unwrap(await T.setStatus(deps(ctx), me(ctx).id, member.id, ctx.json()));
  return noContent();
}

async function auditLog(ctx: CommunityContext): Promise<CommunityResult> {
  const { offset, limit } = pageOf(ctx.query);
  const ref = ctx.query.get("member");
  const memberId = ref ? ((await findMember(ctx, ref))?.id ?? ref) : undefined;
  const { page: list } = unwrap(await T.auditLog(deps(ctx), me(ctx).id, { memberId, action: ctx.query.get("action") ?? undefined, offset, limit }));
  const people = await summaries(ctx, list.items.flatMap((e) => [e.actorId, e.memberId]));
  return ok(cursorPage(ctx, list, list.items.map((e) => auditView(e, people))));
}

async function getSettings(ctx: CommunityContext): Promise<CommunityResult> {
  return ok(unwrap(await T.adminSettings(deps(ctx), me(ctx).id)).settings);
}

async function putSettings(ctx: CommunityContext): Promise<CommunityResult> {
  return ok(unwrap(await T.updateSettings(deps(ctx), me(ctx).id, ctx.json())).settings);
}

async function moderationQueue(ctx: CommunityContext): Promise<CommunityResult> {
  const status = ctx.query.get("status") ?? "open";
  if (status !== "open" && status !== "approved" && status !== "removed") fail(400, "invalid_request", { status: "trust.field.status" });
  const { offset, limit } = pageOf(ctx.query);
  const { page: list } = unwrap(await T.moderationQueue(deps(ctx), me(ctx).id, { status: status as ModerationStatus, offset, limit }));
  const people = await summaries(ctx, list.items.map((m) => m.authorId));
  return ok(cursorPage(ctx, list, list.items.map((m) => moderationView(m, people))));
}

async function decideModeration(ctx: CommunityContext): Promise<CommunityResult> {
  const d = deps(ctx);
  const { item } = unwrap(await T.decideModeration(d, me(ctx).id, ctx.params.item_id ?? "", ctx.json()));
  const people = await summaries(ctx, [item.authorId]);
  const info = await d.content.info(item.targetType, item.targetId);
  return ok(moderationView(item, people, { preview: info?.title ?? "", reportCount: await d.store.countOpenReports(item.targetType, item.targetId) }));
}

async function listReports(ctx: CommunityContext): Promise<CommunityResult> {
  const status = ctx.query.get("status") ?? "open";
  if (status !== "open" && status !== "actioned" && status !== "dismissed") fail(400, "invalid_request", { status: "trust.field.status" });
  const { offset, limit } = pageOf(ctx.query);
  const { page: list } = unwrap(await T.listReports(deps(ctx), me(ctx).id, { status: status as CommunityReportStatus, offset, limit }));
  const people = await summaries(ctx, list.items.map((r) => r.reporterId));
  return ok(cursorPage(ctx, list, list.items.map((r) => reportView(r, people))));
}

async function resolveReport(ctx: CommunityContext): Promise<CommunityResult> {
  const { report } = unwrap(await T.resolveReport(deps(ctx), me(ctx).id, ctx.params.report_id ?? "", ctx.json()));
  return ok(reportView(report, await summaries(ctx, [report.reporterId])));
}

/** The Community's staff only (lib/community/trust/roles.ts): an admin, or for the moderation queue and reports a moderator too. */
function staff(need: StaffRole, handler: CommunityRoute["handler"]): CommunityRoute["handler"] {
  return async (ctx) => {
    await requireCommunityRole(ctx, need);
    return handler(ctx);
  };
}

async function listModerators(ctx: CommunityContext): Promise<CommunityResult> {
  const { moderators } = unwrap(await T.listModerators(deps(ctx), me(ctx).id));
  return ok({ items: await moderatorViews(ctx, moderators) });
}

async function grantModerator(ctx: CommunityContext): Promise<CommunityResult> {
  const member = await memberOf(ctx);
  const { moderators } = unwrap(await T.grantModerator(deps(ctx), me(ctx).id, member.id, ctx.json()));
  return ok({ items: await moderatorViews(ctx, moderators) });
}

async function revokeModerator(ctx: CommunityContext): Promise<CommunityResult> {
  const member = await memberOf(ctx);
  unwrap(await T.revokeModerator(deps(ctx), me(ctx).id, member.id, ctx.json()));
  return noContent();
}

async function moderatorViews(ctx: CommunityContext, list: T.ModeratorGrant[]) {
  const people = await summaries(ctx, list.flatMap((m) => [m.memberId, m.grantedBy]));
  return list.map((m) => ({ member: people.get(m.memberId)!, granted_by: people.get(m.grantedBy) ?? null, granted_at: m.grantedAt, reason: m.reason }));
}

export const TRUST_ROUTES: CommunityRoute[] = [
  { method: "GET", path: "/badges/verification", handler: getVerification },
  { method: "POST", path: "/badges/verification", handler: postVerification },
  { method: "GET", path: "/notifications", handler: listNotifications },
  { method: "POST", path: "/notifications/read", handler: markRead },
  { method: "GET", path: "/notifications/settings", handler: getNotificationSettings },
  { method: "PUT", path: "/notifications/settings", handler: putNotificationSettings },
  { method: "GET", path: "/admin/verification-requests", handler: staff("admin", listVerificationRequests) },
  { method: "POST", path: "/admin/verification-requests/:request_id", handler: staff("admin", decideVerificationRequest) },
  { method: "GET", path: "/admin/verification-requests/:request_id/id-proof", handler: staff("admin", idProof) },
  { method: "GET", path: "/admin/members", handler: staff("admin", searchMembers) },
  { method: "GET", path: "/admin/members/:member/badges", handler: staff("admin", memberBadgesAdmin) },
  { method: "POST", path: "/admin/members/:member/badges", handler: staff("admin", grantBadge) },
  { method: "DELETE", path: "/admin/members/:member/badges/:badge", handler: staff("admin", revokeBadge) },
  { method: "PUT", path: "/admin/members/:member/status", handler: staff("admin", memberStatus) },
  { method: "GET", path: "/admin/moderators", handler: staff("admin", listModerators) },
  { method: "PUT", path: "/admin/moderators/:member", handler: staff("admin", grantModerator) },
  { method: "DELETE", path: "/admin/moderators/:member", handler: staff("admin", revokeModerator) },
  { method: "GET", path: "/admin/audit-log", handler: staff("admin", auditLog) },
  { method: "GET", path: "/admin/settings", handler: staff("admin", getSettings) },
  { method: "PUT", path: "/admin/settings", handler: staff("admin", putSettings) },
  { method: "GET", path: "/admin/moderation", handler: staff("moderator", moderationQueue) },
  { method: "POST", path: "/admin/moderation/:item_id", handler: staff("moderator", decideModeration) },
  { method: "GET", path: "/admin/reports", handler: staff("moderator", listReports) },
  { method: "POST", path: "/admin/reports/:report_id", handler: staff("moderator", resolveReport) },
];

/** The badge's label in the reader's language (for area F's pages). */
export function badgeLabel(ctx: Pick<CommunityContext, "lang">, badge: CommunityBadge): string {
  return t(ctx.lang, `trust.badge.${badge}`);
}

export { prefsView };
