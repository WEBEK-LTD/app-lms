import { heldBadges, isActive, reconcileAutoBadges, shownBadge, GOLD_MIN_APPS, type CommunityBadge, type MemberBadge, type MemberFacts } from "./badges";
import { moderationGate, type HoldReason } from "./moderation";
import { BADGE_NAMES, communityLang, DEFAULT_NOTIFICATION_PREFS, emails, notificationEmail, notificationText, parsePrefs, type CommunityLang, type NotificationData, type NotificationKind, type NotificationPrefs } from "./notifications";
import { parseDecision, parseGrant, parseReport, parseRevoke, parseVerificationForm, verificationBlocked, type AuditAction, type LinkedApp, type ReportTarget, type VerificationRequest } from "./requests";
import { mayCreateGroups, parseSettings, settingsOf, type CommunitySettings } from "./settings";
import type { ContentKind, ModerationItem, Page, TrustStore } from "./store";

/**
 * 231 Yallapp Community, area C: badges, the verification form, the admin's
 * tools and audit log, settings, moderation, reports and notifications.
 *
 * Every function takes `deps` first: area C's store, and what it reads from
 * the other areas (the member from A's base, a post and its status from B's
 * Q&A, the member's stats and their linked Yallapp account). The website
 * (area F) calls these from its pages, the API (src/app/api/community/v1)
 * from its routes, and B from its own: `moderateNew` when a post is made,
 * `notify` when something happens to a member.
 */

/** A Community member as area C needs them (area A's base). */
export interface TrustMember {
  id: number;
  displayName: string;
  /** "team": the Yallapp Team (official answers). Admins and the team are never held by moderation. */
  role: "member" | "admin" | "team";
  /** The language they chose (English when none). */
  lang: string | null;
  /** Where emails go; null: no email (an Apple sign-in that hid it and gave none). */
  email: string | null;
  joinedAt: Date;
}

/** A post as area C needs it (area B's Q&A and tutorials). */
export interface ContentInfo {
  memberId: number;
  title: string;
  /** Its path on the Community ("/q/12#a31"). */
  link: string;
}

export interface TrustDeps {
  store: TrustStore;
  now: () => Date;
  member: (id: number) => Promise<TrustMember | null>;
  /** The member's points and activity (area B's ledger). */
  stats: (id: number) => Promise<{ points: number; acceptedAnswers: number; approvedTutorials: number; lastActiveAt: Date | null }>;
  /** Their linked Yallapp account: its apps (Studio Market templates too) and an app on a paid plan; null when none is linked. */
  linked: (id: number) => Promise<{ apps: LinkedApp[]; paid: { company: string; appUrl: string | null } | null } | null>;
  content: {
    info: (kind: ContentKind, id: number) => Promise<ContentInfo | null>;
    setStatus: (kind: ContentKind, id: number, status: "published" | "hidden") => Promise<void>;
  };
  /** Sends one email (lib/mail.ts in the platform, a fake in tests). */
  sendMail: (mail: { to: string; subject: string; text: string; html: string }) => Promise<void>;
  /** The Community's address ("https://community.yallapp.com.tr"), for the links in emails. */
  siteUrl: string;
  /** The Community logo's public address, for emails; null: its name instead. */
  logoUrl: string | null;
}

export type Fail = { ok: false; status: number; code: string; message: string; errors?: Record<string, string> };
const fail = (status: number, code: string, message: string, errors?: Record<string, string>): Fail => ({ ok: false, status, code, message, ...(errors ? { errors } : {}) });

const LIMIT_MAX = 100;
const pageOf = (input: { offset?: number; limit?: number }) => ({ offset: Math.max(0, Math.floor(input.offset ?? 0)), limit: Math.min(LIMIT_MAX, Math.max(1, Math.floor(input.limit ?? 20))) });

export function isCommunityAdmin(member: Pick<TrustMember, "role"> | null | undefined): boolean {
  return member?.role === "admin";
}

async function audit(deps: TrustDeps, entry: { actorId: number | null; action: AuditAction; memberId?: number | null; badge?: CommunityBadge | null; subject?: string | null; reason?: string | null; detail?: Record<string, unknown> | null }) {
  await deps.store.addAudit({ actorId: entry.actorId, action: entry.action, memberId: entry.memberId ?? null, badge: entry.badge ?? null, subject: entry.subject ?? null, reason: entry.reason ?? null, detail: entry.detail ?? null, at: deps.now() });
}

async function requireAdmin(deps: TrustDeps, adminId: number): Promise<TrustMember | Fail> {
  const admin = await deps.member(adminId);
  return isCommunityAdmin(admin) ? admin! : fail(403, "forbidden", "Only Community admins can do this.");
}

// ——— Settings ———

export async function getSettings(deps: TrustDeps): Promise<CommunitySettings> {
  return settingsOf(await deps.store.getSettingsDoc());
}

export async function updateSettings(deps: TrustDeps, adminId: number, input: unknown): Promise<{ ok: true; settings: CommunitySettings } | Fail> {
  const admin = await requireAdmin(deps, adminId);
  if ("ok" in admin) return admin;
  const before = await getSettings(deps);
  const parsed = parseSettings(input, before);
  if (!parsed.ok) return fail(400, "invalid_settings", "Some settings aren't valid.", parsed.errors);
  await deps.store.saveSettingsDoc(parsed.value, deps.now());
  await audit(deps, { actorId: adminId, action: "settings_changed", detail: { before, after: parsed.value } });
  return { ok: true, settings: parsed.value };
}

/** Phase 2's groups ask this: may the member create a group? */
export async function canCreateGroups(deps: TrustDeps, memberId: number): Promise<boolean> {
  const member = await deps.member(memberId);
  if (!member) return false;
  const held = heldBadges(await deps.store.listMemberBadges(memberId), deps.now());
  return mayCreateGroups(await getSettings(deps), { id: memberId, hasBadge: held.length > 0, admin: isCommunityAdmin(member) });
}

// ——— Notifications ———

/**
 * Tells a member something happened: always in their list, and by email
 * when the kind emails and they haven't turned it off. Never for their own
 * action.
 */
export async function notify(deps: TrustDeps, input: { memberId: number; kind: NotificationKind; actorId?: number | null; data?: NotificationData; link: string }): Promise<void> {
  if (input.actorId && input.actorId === input.memberId) return;
  const member = await deps.member(input.memberId);
  if (!member) return;
  const n = await deps.store.addNotification({ memberId: member.id, kind: input.kind, actorId: input.actorId ?? null, data: input.data ?? {}, link: input.link, createdAt: deps.now() });
  const prefs = (await deps.store.getNotificationPrefs(member.id)) ?? DEFAULT_NOTIFICATION_PREFS;
  if (!member.email || !emails(input.kind, prefs)) return;
  const mail = notificationEmail(input.kind, n.data, communityLang(member.lang), new URL(input.link, deps.siteUrl).toString(), deps.logoUrl);
  try {
    await deps.sendMail({ to: member.email, ...mail });
    await deps.store.markEmailed(n.id, deps.now());
  } catch (error) {
    // The notice is in their list all the same; a failed email never fails what caused it.
    console.warn(`[community] email for notification ${n.id} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export interface ListedNotification {
  id: number;
  kind: NotificationKind;
  text: string;
  link: string;
  read: boolean;
  at: string;
  actorId: number | null;
}

export async function listNotifications(deps: TrustDeps, memberId: number, input: { unreadOnly?: boolean; offset?: number; limit?: number } = {}): Promise<{ items: ListedNotification[]; total: number; unread: number }> {
  const member = await deps.member(memberId);
  const lang = communityLang(member?.lang);
  const list = await deps.store.listNotifications(memberId, { unreadOnly: input.unreadOnly, ...pageOf(input) });
  return {
    items: list.items.map((n) => ({ id: n.id, kind: n.kind, text: notificationText(n.kind, n.data, lang), link: n.link, read: n.readAt !== null, at: n.createdAt.toISOString(), actorId: n.actorId })),
    total: list.total,
    unread: await deps.store.unreadNotifications(memberId),
  };
}

export async function markRead(deps: TrustDeps, memberId: number, input: { ids?: number[] | "all" }): Promise<{ ok: true; marked: number; unread: number } | Fail> {
  const ids = input.ids ?? "all";
  if (ids !== "all" && (!Array.isArray(ids) || ids.length > 500 || ids.some((x) => !Number.isSafeInteger(x)))) return fail(400, "invalid_request", "ids must be a list of notification IDs or \"all\".");
  const marked = await deps.store.markNotificationsRead(memberId, ids, deps.now());
  return { ok: true, marked, unread: await deps.store.unreadNotifications(memberId) };
}

export async function getPrefs(deps: TrustDeps, memberId: number): Promise<NotificationPrefs> {
  return (await deps.store.getNotificationPrefs(memberId)) ?? DEFAULT_NOTIFICATION_PREFS;
}

export async function updatePrefs(deps: TrustDeps, memberId: number, input: unknown): Promise<{ ok: true; prefs: NotificationPrefs } | Fail> {
  const parsed = parsePrefs(input, await getPrefs(deps, memberId));
  if (!parsed.ok) return fail(400, "invalid_request", parsed.error);
  await deps.store.saveNotificationPrefs(memberId, parsed.value);
  return { ok: true, prefs: parsed.value };
}

// ——— Badges ———

export interface PublicBadge {
  badge: CommunityBadge;
  /** Its name in the language asked for ("Pro Developer"). */
  name: string;
  since: string;
  /** Green: the business it verifies. */
  business: { company: string; appUrl: string | null } | null;
}

/** A member's badges as anyone sees them: the one their card shows (the highest) and every one they hold, highest first. Never the private reason. */
export async function memberBadges(deps: TrustDeps, memberId: number, lang?: string | null): Promise<{ shown: CommunityBadge | null; held: PublicBadge[] }> {
  const now = deps.now();
  const all = await deps.store.listMemberBadges(memberId);
  const l = communityLang(lang);
  return {
    shown: shownBadge(all, now),
    held: heldBadges(all, now).map((b) => ({ badge: b.badge, name: BADGE_NAMES[l][b.badge], since: b.grantedAt.toISOString(), business: b.badge === "green" ? (b.business ?? null) : null })),
  };
}

/** A member's badges as an admin sees them: every one ever, with who, when, why and until when. */
export async function adminMemberBadges(deps: TrustDeps, adminId: number, memberId: number): Promise<{ ok: true; badges: MemberBadge[] } | Fail> {
  const admin = await requireAdmin(deps, adminId);
  if ("ok" in admin) return admin;
  return { ok: true, badges: await deps.store.listMemberBadges(memberId) };
}

async function factsOf(deps: TrustDeps, member: TrustMember): Promise<MemberFacts> {
  const [stats, linked, trust] = await Promise.all([deps.stats(member.id), deps.linked(member.id), deps.store.memberTrust(member.id)]);
  return { joinedAt: member.joinedAt, ...stats, lastViolationAt: trust.lastViolationAt, linked: linked ? { apps: linked.apps.length, paid: linked.paid } : null };
}

/**
 * Brings a member's automatic badges (Blue, Green) in line with the rules:
 * grants and takes away, logs each change and tells the member. Run when
 * something changes for them and by the daily job for everyone holding one.
 */
export async function refreshAutoBadges(deps: TrustDeps, memberId: number): Promise<{ granted: CommunityBadge[]; revoked: CommunityBadge[] }> {
  const member = await deps.member(memberId);
  if (!member) return { granted: [], revoked: [] };
  const now = deps.now();
  const settings = await getSettings(deps);
  const changes = reconcileAutoBadges(await deps.store.listMemberBadges(memberId), await factsOf(deps, member), settings.blue, now);
  for (const g of changes.grant) {
    await deps.store.addMemberBadge({ memberId, badge: g.badge, source: "auto", reason: null, grantedAt: now, grantedBy: null, expiresAt: null, business: g.business ?? null });
    await audit(deps, { actorId: null, action: "badge_granted", memberId, badge: g.badge, reason: "rules" });
    await notify(deps, { memberId, kind: "badge_granted", data: { badge: g.badge }, link: `/u/${memberId}` });
  }
  for (const r of changes.revoke) {
    await deps.store.revokeMemberBadge(r.id, { at: now, by: null, reason: r.reason });
    await audit(deps, { actorId: null, action: "badge_revoked", memberId, badge: r.badge, subject: `badge:${r.id}`, reason: r.reason });
    await notify(deps, { memberId, kind: "badge_revoked", data: { badge: r.badge }, link: `/u/${memberId}` });
  }
  return { granted: changes.grant.map((g) => g.badge), revoked: changes.revoke.map((r) => r.badge) };
}

/** An admin grants any badge to anyone, whatever the rules: a private reason and an optional expiry. */
export async function grantBadge(deps: TrustDeps, adminId: number, memberId: number, input: unknown): Promise<{ ok: true; badge: MemberBadge } | Fail> {
  const admin = await requireAdmin(deps, adminId);
  if ("ok" in admin) return admin;
  const member = await deps.member(memberId);
  if (!member) return fail(404, "not_found", "There's no such member.");
  const now = deps.now();
  const parsed = parseGrant(input, now);
  if (!parsed.ok) return fail(400, "invalid_request", parsed.error);
  const held = (await deps.store.listMemberBadges(memberId)).filter((b) => b.badge === parsed.value.badge && isActive(b, now));
  // One of each: an admin's grant replaces the one held (the automatic one never comes back over it).
  for (const b of held) await deps.store.revokeMemberBadge(b.id, { at: now, by: adminId, reason: "Replaced by an admin's grant." });
  const linked = parsed.value.badge === "green" ? await deps.linked(memberId) : null;
  const badge = await deps.store.addMemberBadge({ memberId, badge: parsed.value.badge, source: "manual", reason: parsed.value.reason, grantedAt: now, grantedBy: adminId, expiresAt: parsed.value.expiresAt, business: linked?.paid ?? null });
  await audit(deps, { actorId: adminId, action: "badge_granted", memberId, badge: badge.badge, subject: `badge:${badge.id}`, reason: parsed.value.reason, detail: parsed.value.expiresAt ? { expiresAt: parsed.value.expiresAt.toISOString() } : null });
  await notify(deps, { memberId, kind: "badge_granted", actorId: adminId, data: { badge: badge.badge }, link: `/u/${memberId}` });
  return { ok: true, badge };
}

/** An admin takes away any badge (an automatic one, or one granted or approved), with a reason the member is told. */
export async function revokeBadge(deps: TrustDeps, adminId: number, badgeId: number, input: unknown): Promise<{ ok: true; badge: MemberBadge } | Fail> {
  const admin = await requireAdmin(deps, adminId);
  if ("ok" in admin) return admin;
  const parsed = parseRevoke(input);
  if (!parsed.ok) return fail(400, "invalid_request", parsed.error);
  const badge = await deps.store.revokeMemberBadge(badgeId, { at: deps.now(), by: adminId, reason: parsed.value.reason });
  if (!badge) return fail(404, "not_found", "That badge isn't held.");
  await audit(deps, { actorId: adminId, action: "badge_revoked", memberId: badge.memberId, badge: badge.badge, subject: `badge:${badge.id}`, reason: parsed.value.reason });
  await notify(deps, { memberId: badge.memberId, kind: "badge_revoked", actorId: adminId, data: { badge: badge.badge, reason: parsed.value.reason }, link: `/u/${badge.memberId}` });
  return { ok: true, badge };
}

// ——— The verification form (Gold) ———

/** Whether the member may apply for Gold, why not, and their linked account's apps (the form lists them; never typed). */
export async function goldEligibility(deps: TrustDeps, memberId: number): Promise<{ canApply: boolean; blocked: ReturnType<typeof verificationBlocked>; apps: LinkedApp[]; minApps: number }> {
  const [linked, badges, latest] = await Promise.all([deps.linked(memberId), deps.store.listMemberBadges(memberId), deps.store.latestVerification(memberId)]);
  const holdsGold = heldBadges(badges, deps.now()).some((b) => b.badge === "gold");
  const blocked = verificationBlocked({ linked: linked ? { apps: linked.apps.length, paid: linked.paid } : null }, { holdsGold, pending: latest?.status === "pending" });
  return { canApply: blocked === null, blocked, apps: linked?.apps ?? [], minApps: GOLD_MIN_APPS };
}

export async function submitVerification(deps: TrustDeps, memberId: number, input: unknown): Promise<{ ok: true; request: VerificationRequest } | Fail> {
  const eligibility = await goldEligibility(deps, memberId);
  if (!eligibility.canApply) {
    const messages = { no_linked_account: "Link your Yallapp account first.", not_enough_apps: `You need at least ${GOLD_MIN_APPS} apps made with Yallapp.`, pending: "Your request is already being reviewed.", already_gold: "You're already a Pro Developer." } as const;
    return fail(409, eligibility.blocked!, messages[eligibility.blocked!]);
  }
  const parsed = parseVerificationForm(input);
  if (!parsed.ok) return fail(400, "invalid_request", "Check the form.", parsed.errors);
  const request = await deps.store.addVerification({ memberId, ...parsed.value, apps: eligibility.apps, createdAt: deps.now() });
  return { ok: true, request };
}

/** The member's latest request, as they see it (never the ID proof's file). */
export async function myVerification(deps: TrustDeps, memberId: number): Promise<{ status: VerificationRequest["status"]; createdAt: string; decidedAt: string | null; reason: string | null } | null> {
  const r = await deps.store.latestVerification(memberId);
  return r ? { status: r.status, createdAt: r.createdAt.toISOString(), decidedAt: r.decidedAt?.toISOString() ?? null, reason: r.status === "rejected" ? r.reason : null } : null;
}

export async function listVerifications(deps: TrustDeps, adminId: number, input: { status?: VerificationRequest["status"]; offset?: number; limit?: number }): Promise<{ ok: true; page: Page<VerificationRequest> } | Fail> {
  const admin = await requireAdmin(deps, adminId);
  if ("ok" in admin) return admin;
  return { ok: true, page: await deps.store.listVerifications({ status: input.status, ...pageOf(input) }) };
}

/** An admin approves (the member gets Gold) or rejects with a reason; either way the member is told and it is logged. */
export async function decideVerification(deps: TrustDeps, adminId: number, requestId: number, input: unknown): Promise<{ ok: true; request: VerificationRequest } | Fail> {
  const admin = await requireAdmin(deps, adminId);
  if ("ok" in admin) return admin;
  const parsed = parseDecision(input);
  if (!parsed.ok) return fail(400, "invalid_request", parsed.error);
  const now = deps.now();
  const request = await deps.store.decideVerification(requestId, { status: parsed.value.approve ? "approved" : "rejected", at: now, by: adminId, reason: parsed.value.reason });
  if (!request) return fail(409, "already_decided", "That request was already decided or doesn't exist.");
  if (parsed.value.approve) {
    await deps.store.addMemberBadge({ memberId: request.memberId, badge: "gold", source: "approved", reason: parsed.value.reason, grantedAt: now, grantedBy: adminId, expiresAt: null, business: null });
    await audit(deps, { actorId: adminId, action: "verification_approved", memberId: request.memberId, badge: "gold", subject: `verification:${request.id}`, reason: parsed.value.reason });
    await notify(deps, { memberId: request.memberId, kind: "verification_approved", actorId: adminId, link: `/u/${request.memberId}` });
  } else {
    await audit(deps, { actorId: adminId, action: "verification_rejected", memberId: request.memberId, subject: `verification:${request.id}`, reason: parsed.value.reason });
    await notify(deps, { memberId: request.memberId, kind: "verification_rejected", actorId: adminId, data: { reason: parsed.value.reason }, link: "/verify" });
  }
  return { ok: true, request };
}

export async function auditLog(deps: TrustDeps, adminId: number, input: { memberId?: number; action?: AuditAction; offset?: number; limit?: number }) {
  const admin = await requireAdmin(deps, adminId);
  if ("ok" in admin) return admin;
  return { ok: true as const, page: await deps.store.listAudit({ memberId: input.memberId, action: input.action, ...pageOf(input) }) };
}

// ——— Moderation ———

const RECENT_TEXTS = 5;

/**
 * Area B calls this when a post is made: it appears at once, or waits in the
 * moderation queue (a new member's first posts, or the filter's catch). The
 * post stays "pending" in B's store until an admin decides.
 */
export async function moderateNew(deps: TrustDeps, input: { memberId: number; kind: ContentKind; contentId: number; text: string }): Promise<{ status: "published" } | { status: "pending"; reasons: HoldReason[] }> {
  const member = await deps.member(input.memberId);
  const settings = await getSettings(deps);
  const trust = await deps.store.memberTrust(input.memberId);
  const result = moderationGate({ role: member?.role ?? "member", publishedPosts: trust.publishedPosts }, input.text, settings.moderation, trust.recentTexts);
  const recentTexts = [input.text, ...trust.recentTexts].slice(0, RECENT_TEXTS);
  if (result.status === "published") {
    await deps.store.saveMemberTrust({ ...trust, publishedPosts: trust.publishedPosts + 1, recentTexts });
    return result;
  }
  await deps.store.saveMemberTrust({ ...trust, recentTexts });
  await deps.store.addModeration({ kind: input.kind, contentId: input.contentId, memberId: input.memberId, reasons: result.reasons, excerpt: input.text.slice(0, 500), createdAt: deps.now() });
  return result;
}

export async function moderationQueue(deps: TrustDeps, adminId: number, input: { status?: ModerationItem["status"]; offset?: number; limit?: number }): Promise<{ ok: true; page: Page<ModerationItem & { title: string | null; link: string | null }> } | Fail> {
  const admin = await requireAdmin(deps, adminId);
  if ("ok" in admin) return admin;
  const list = await deps.store.listModeration({ status: input.status ?? "pending", ...pageOf(input) });
  const items = await Promise.all(list.items.map(async (m) => {
    const info = await deps.content.info(m.kind, m.contentId);
    return { ...m, title: info?.title ?? null, link: info?.link ?? null };
  }));
  return { ok: true, page: { items, total: list.total } };
}

/** An admin approves a held post (it appears) or rejects it with a reason (it stays hidden, the member is told, it counts as a violation). */
export async function decideModeration(deps: TrustDeps, adminId: number, itemId: number, input: unknown): Promise<{ ok: true; item: ModerationItem } | Fail> {
  const admin = await requireAdmin(deps, adminId);
  if ("ok" in admin) return admin;
  const parsed = parseDecision(input);
  if (!parsed.ok) return fail(400, "invalid_request", parsed.error);
  const now = deps.now();
  const item = await deps.store.decideModeration(itemId, { status: parsed.value.approve ? "approved" : "rejected", at: now, by: adminId, reason: parsed.value.reason });
  if (!item) return fail(409, "already_decided", "That post was already decided or doesn't exist.");
  const info = await deps.content.info(item.kind, item.contentId);
  const trust = await deps.store.memberTrust(item.memberId);
  if (parsed.value.approve) {
    await deps.content.setStatus(item.kind, item.contentId, "published");
    await deps.store.saveMemberTrust({ ...trust, publishedPosts: trust.publishedPosts + 1 });
    await audit(deps, { actorId: adminId, action: "post_approved", memberId: item.memberId, subject: `${item.kind}:${item.contentId}` });
    await notify(deps, { memberId: item.memberId, kind: "post_approved", actorId: adminId, data: { title: info?.title ?? null }, link: info?.link ?? "/" });
  } else {
    await deps.content.setStatus(item.kind, item.contentId, "hidden");
    // Held only for being new is no violation; anything the filter caught is.
    if (item.reasons.some((r) => r !== "new_member")) await deps.store.saveMemberTrust({ ...trust, lastViolationAt: now });
    await audit(deps, { actorId: adminId, action: "post_rejected", memberId: item.memberId, subject: `${item.kind}:${item.contentId}`, reason: parsed.value.reason });
    await notify(deps, { memberId: item.memberId, kind: "post_rejected", actorId: adminId, data: { title: info?.title ?? null, reason: parsed.value.reason }, link: "/" });
  }
  return { ok: true, item };
}

// ——— Reports ———

/** A member reports a post or a member. Enough reports on one post hide it until an admin looks. */
export async function report(deps: TrustDeps, memberId: number, input: unknown): Promise<{ ok: true; id: number } | Fail> {
  const parsed = parseReport(input);
  if (!parsed.ok) return fail(400, "invalid_request", parsed.error);
  const { target, targetId, reason, details } = parsed.value;
  let targetMemberId: number;
  let excerpt = "";
  if (target === "member") {
    if (!(await deps.member(targetId))) return fail(404, "not_found", "There's no such member.");
    targetMemberId = targetId;
  } else {
    const info = await deps.content.info(target, targetId);
    if (!info) return fail(404, "not_found", "That post doesn't exist.");
    targetMemberId = info.memberId;
    excerpt = info.title;
  }
  if (targetMemberId === memberId) return fail(400, "invalid_request", "You can't report yourself.");
  const already = await deps.store.openReportBy(memberId, target, targetId);
  if (already) return { ok: true, id: already.id };
  const made = await deps.store.addReport({ reporterId: memberId, target, targetId, targetMemberId, reason, details, createdAt: deps.now() });
  if (target !== "member") {
    const settings = await getSettings(deps);
    const open = await deps.store.countOpenReports(target, targetId);
    const queued = (await deps.store.findModeration(target, targetId))?.status === "pending";
    if (open >= settings.moderation.hideAfterReports && !queued) {
      await deps.content.setStatus(target, targetId, "hidden");
      await deps.store.addModeration({ kind: target, contentId: targetId, memberId: targetMemberId, reasons: ["reported"], excerpt: excerpt.slice(0, 500), createdAt: deps.now() });
    }
  }
  return { ok: true, id: made.id };
}

export async function listReports(deps: TrustDeps, adminId: number, input: { status?: "open" | "upheld" | "dismissed"; offset?: number; limit?: number }) {
  const admin = await requireAdmin(deps, adminId);
  if ("ok" in admin) return admin;
  return { ok: true as const, page: await deps.store.listReports({ status: input.status ?? "open", ...pageOf(input) }) };
}

/**
 * An admin upholds a report (optionally hiding the post; the member it is
 * about gets a violation) or dismisses it. Every open report on the same
 * target is closed with it, and each reporter is thanked.
 */
export async function resolveReport(deps: TrustDeps, adminId: number, reportId: number, input: unknown): Promise<{ ok: true; resolved: number } | Fail> {
  const admin = await requireAdmin(deps, adminId);
  if ("ok" in admin) return admin;
  const v = (input ?? {}) as Record<string, unknown>;
  if (v.decision !== "uphold" && v.decision !== "dismiss") return fail(400, "invalid_request", "decision must be uphold or dismiss.");
  const note = typeof v.note === "string" && v.note.trim() ? v.note.trim().slice(0, 500) : null;
  const first = await deps.store.getReport(reportId);
  if (!first || first.status !== "open") return fail(409, "already_decided", "That report was already resolved or doesn't exist.");
  const now = deps.now();
  const status = v.decision === "uphold" ? "upheld" : "dismissed";
  const all = await deps.store.openReportsOn(first.target, first.targetId);
  for (const r of all) {
    await deps.store.resolveReport(r.id, { status, at: now, by: adminId, note });
    await notify(deps, { memberId: r.reporterId, kind: "report_resolved", actorId: adminId, link: "/" });
  }
  const target = first.target as ReportTarget;
  if (status === "upheld") {
    const trust = await deps.store.memberTrust(first.targetMemberId);
    await deps.store.saveMemberTrust({ ...trust, lastViolationAt: now });
    if (target !== "member" && v.hide !== false) await deps.content.setStatus(target, first.targetId, "hidden");
  } else if (target !== "member") {
    // Hidden by reports alone and found fine: it comes back.
    const held = await deps.store.findModeration(target, first.targetId);
    if (held?.status === "pending" && held.reasons.length === 1 && held.reasons[0] === "reported") {
      await deps.store.decideModeration(held.id, { status: "approved", at: now, by: adminId, reason: note });
      await deps.content.setStatus(target, first.targetId, "published");
    }
  }
  await audit(deps, { actorId: adminId, action: status === "upheld" ? "report_upheld" : "report_dismissed", memberId: first.targetMemberId, subject: `${first.target}:${first.targetId}`, reason: note, detail: { reports: all.map((r) => r.id) } });
  return { ok: true, resolved: all.length };
}

export type { CommunityLang };
