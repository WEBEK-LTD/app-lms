import type { CommunityRole, CommunityTargetType } from "../types";
import { GOLD_MIN_APPS, heldBadges, isActive, reconcileAutoBadges, shownBadge, type BadgeDetails, type CommunityBadge, type MemberBadge, type MemberFacts } from "./badges";
import { holdCause, moderationGate, type HoldReason } from "./moderation";
import { BADGE_NAMES, communityLang, DEFAULT_NOTIFICATION_PREFS, emails, notificationEmail, notificationText, parsePrefs, prefsView, type NotificationData, type NotificationKind } from "./notifications";
import { fileTypeOf, ID_PROOF_KEEP_DAYS, ID_PROOF_TYPES, idProofProblem, parseDecision, parseGrant, parseReason, parseReport, parseVerificationForm, verificationBlocked, type AuditAction, type AuditEntry, type LinkedApp, type Report, type ReportStatus, type VerificationRequest, type VerificationStatus } from "./requests";
import { blueRulesOf, mayCreateGroups, parseSettings, settingsOf, type CommunitySettings } from "./settings";
import type { ContentKind, ModerationItem, ModerationStatus, Page, TrustStore } from "./store";

/**
 * 231 Yallapp Community, area C: badges, the verification form, the admin's
 * tools and audit log, settings, moderation, reports and notifications.
 *
 * Every function takes `deps` first: area C's store, and what it reads from
 * the other areas (the member from A's base, a post and its status from B's
 * Q&A, the member's stats and their linked Yallapp account, private files,
 * email). The API (src/app/api/community/v1) and the website (area F) call
 * these; area B calls `moderateNew` when a post is made and `notify` when
 * something happens to a member, area A `notify` for follows and friends.
 */

/** A Community member as area C needs them (area A's base). */
export interface TrustMember {
  id: string;
  displayName: string;
  role: CommunityRole;
  status: "active" | "suspended" | "deleted";
  /** The language they chose (English when none). */
  language: string | null;
  /** Where emails go; null: no email (an Apple sign-in that hid it). */
  email: string | null;
  createdAt: Date;
  /** Their posts approved or published so far: the first ones are reviewed. */
  approvedPosts: number;
}

/** A post as area C needs it (area B's Q&A and tutorials). */
export interface ContentInfo {
  authorId: string;
  /** The question or tutorial's title, or an answer's first words. */
  title: string;
  /** Its path on the Community ("/q/12#a31"). */
  link: string;
}

/** The member's linked Yallapp account: its apps (Studio Market templates too) and the business Green shows (an app on a paid plan). */
export interface LinkedAccount {
  apps: LinkedApp[];
  business: BadgeDetails | null;
}

export interface TrustDeps {
  store: TrustStore;
  now: () => Date;
  member: (id: string) => Promise<TrustMember | null>;
  /** Whether the member's linked Yallapp account is a platform admin (owner or admin of Yallapp's team), checked now: a Community admin. */
  platformAdmin: (id: string) => Promise<boolean>;
  /** Everyone the member blocked or who blocked them (area A): no notice from them reaches the member. */
  blockedEitherWay?: (id: string) => Promise<Set<string>>;
  /** One more of their posts appeared (A's `approved_posts`). */
  countApprovedPost: (id: string) => Promise<void>;
  /** Suspends or restores a member (a suspension signs every device out). */
  setMemberStatus: (id: string, status: "active" | "suspended") => Promise<void>;
  /** The member's points and activity (area B's ledger). */
  stats: (id: string) => Promise<{ points: number; acceptedAnswers: number; approvedTutorials: number; lastActiveAt: Date | null }>;
  /** Their linked Yallapp account; null when none is linked. */
  linked: (id: string) => Promise<LinkedAccount | null>;
  content: {
    info: (kind: ContentKind, id: string) => Promise<ContentInfo | null>;
    setStatus: (kind: ContentKind, id: string, status: "published" | "hidden") => Promise<void>;
    /** The member's last few posts' texts (the duplicate check); empty when B doesn't say. */
    recentTexts?: (memberId: string) => Promise<string[]>;
  };
  /** Private files (the ID proof): never public; admins get a short-lived link. */
  files: {
    put: (key: string, bytes: Uint8Array, contentType: string) => Promise<void>;
    link: (key: string, seconds: number) => Promise<string>;
    /** Deletes a private file (gone from storage for good). */
    delete: (key: string) => Promise<void>;
  };
  /** Sends one email (lib/mail.ts in the platform, a fake in tests). */
  sendMail: (mail: { to: string; subject: string; text: string; html: string }) => Promise<void>;
  /** The Community's address ("https://community.yallapp.com.tr"), for the links in emails. */
  siteUrl: string;
  /** The Community logo's public address, for emails; null: its name instead. */
  logoUrl: string | null;
}

/** A refusal, as the API answers it (`{ error: { code, message } }` with `status`). */
export type Fail = { ok: false; status: number; code: string; message: string; errors?: Record<string, string> };
const fail = (status: number, code: string, message: string, errors?: Record<string, string>): Fail => ({ ok: false, status, code, message, ...(errors ? { errors } : {}) });
export const isFail = (x: unknown): x is Fail => typeof x === "object" && x !== null && (x as { ok?: unknown }).ok === false;

/** The API's page size: at most 50, 20 by default. */
export const PAGE_MAX = 50;
export const pageInput = (input: { offset?: number; limit?: number }) => ({ offset: Math.max(0, Math.floor(input.offset ?? 0)), limit: Math.min(PAGE_MAX, Math.max(1, Math.floor(input.limit ?? 20))) });

/** A Community member's role among its staff: an admin (their linked Yallapp account is a platform admin) or a moderator (an admin made them one); null for everyone else. Checked on every call. */
export type StaffRole = "admin" | "moderator";

/** The moderators' list (community_settings, key "moderators"). */
export interface ModeratorGrant {
  memberId: string;
  grantedBy: string;
  grantedAt: string;
  reason: string;
}
const MODERATORS_KEY = "moderators";

async function moderatorGrants(deps: TrustDeps): Promise<ModeratorGrant[]> {
  const doc = (await deps.store.getSettingsDoc(MODERATORS_KEY)) as { members?: ModeratorGrant[] } | null;
  return Array.isArray(doc?.members) ? doc.members.filter((m) => typeof m?.memberId === "string") : [];
}

export async function staffRole(deps: TrustDeps, memberId: string): Promise<StaffRole | null> {
  const member = await deps.member(memberId);
  if (!member || member.status !== "active") return null;
  if (await deps.platformAdmin(memberId)) return "admin";
  return (await moderatorGrants(deps)).some((m) => m.memberId === memberId) ? "moderator" : null;
}

/** Whether a role is enough: an admin may do anything a moderator may. */
export const roleAllows = (role: StaffRole | null, need: StaffRole): boolean => role === "admin" || (need === "moderator" && role === "moderator");

async function audit(deps: TrustDeps, entry: { actorId: string | null; action: AuditAction; memberId?: string | null; targetType?: string | null; targetId?: string | null; reason?: string | null; details?: Record<string, unknown> | null }) {
  await deps.store.addAudit({ actorId: entry.actorId, action: entry.action, memberId: entry.memberId ?? null, targetType: entry.targetType ?? null, targetId: entry.targetId ?? null, reason: entry.reason ?? null, details: entry.details ?? null, createdAt: deps.now() });
}

async function requireAdmin(deps: TrustDeps, memberId: string, need: StaffRole = "admin"): Promise<Fail | null> {
  return roleAllows(await staffRole(deps, memberId), need) ? null : fail(403, "forbidden", need === "admin" ? "Only Community admins can do this." : "Only Community moderators can do this.");
}

/** The Community's moderators (admins only). */
export async function listModerators(deps: TrustDeps, adminId: string): Promise<{ ok: true; moderators: ModeratorGrant[] } | Fail> {
  return (await requireAdmin(deps, adminId)) ?? { ok: true, moderators: await moderatorGrants(deps) };
}

/** An admin makes a member a moderator (the moderation queue and reports only), with a reason; logged. */
export async function grantModerator(deps: TrustDeps, adminId: string, memberId: string, input: unknown): Promise<{ ok: true; moderators: ModeratorGrant[] } | Fail> {
  const denied = await requireAdmin(deps, adminId);
  if (denied) return denied;
  const reason = parseReason(input);
  if (!reason.ok) return fail(400, "invalid_request", reason.error, { reason: reason.error });
  const member = await deps.member(memberId);
  if (!member || member.status === "deleted") return fail(404, "not_found", "There's no such member.");
  const list = await moderatorGrants(deps);
  if (!list.some((m) => m.memberId === memberId)) {
    list.push({ memberId, grantedBy: adminId, grantedAt: deps.now().toISOString(), reason: reason.value });
    await deps.store.saveSettingsDoc({ members: list }, { at: deps.now(), by: adminId }, MODERATORS_KEY);
    await audit(deps, { actorId: adminId, action: "moderator.grant", memberId, targetType: "member", targetId: memberId, reason: reason.value });
  }
  return { ok: true, moderators: list };
}

/** An admin takes a member's moderator role away, with a reason; logged. */
export async function revokeModerator(deps: TrustDeps, adminId: string, memberId: string, input: unknown): Promise<{ ok: true; moderators: ModeratorGrant[] } | Fail> {
  const denied = await requireAdmin(deps, adminId);
  if (denied) return denied;
  const reason = parseReason(input);
  if (!reason.ok) return fail(400, "invalid_request", reason.error, { reason: reason.error });
  const list = await moderatorGrants(deps);
  if (!list.some((m) => m.memberId === memberId)) return fail(404, "not_found", "That member isn't a moderator.");
  const kept = list.filter((m) => m.memberId !== memberId);
  await deps.store.saveSettingsDoc({ members: kept }, { at: deps.now(), by: adminId }, MODERATORS_KEY);
  await audit(deps, { actorId: adminId, action: "moderator.revoke", memberId, targetType: "member", targetId: memberId, reason: reason.value });
  return { ok: true, moderators: kept };
}

// ——— Settings ———

export async function getSettings(deps: TrustDeps): Promise<CommunitySettings> {
  return settingsOf(await deps.store.getSettingsDoc());
}

export async function adminSettings(deps: TrustDeps, adminId: string): Promise<{ ok: true; settings: CommunitySettings } | Fail> {
  return (await requireAdmin(deps, adminId)) ?? { ok: true, settings: await getSettings(deps) };
}

export async function updateSettings(deps: TrustDeps, adminId: string, input: unknown): Promise<{ ok: true; settings: CommunitySettings } | Fail> {
  const denied = await requireAdmin(deps, adminId);
  if (denied) return denied;
  const before = await getSettings(deps);
  const parsed = parseSettings(input, before);
  if (!parsed.ok) return fail(400, "invalid_settings", "Some settings aren't valid.", parsed.errors);
  await deps.store.saveSettingsDoc(parsed.value, { at: deps.now(), by: adminId });
  await audit(deps, { actorId: adminId, action: "settings.update", targetType: "settings", details: { before, after: parsed.value } });
  return { ok: true, settings: parsed.value };
}

/** Phase 2's groups ask this: may the member create a group? */
export async function canCreateGroups(deps: TrustDeps, memberId: string): Promise<boolean> {
  const member = await deps.member(memberId);
  if (!member || member.status !== "active") return false;
  const held = heldBadges(await deps.store.listMemberBadges(memberId), deps.now());
  return mayCreateGroups(await getSettings(deps), { id: memberId, hasBadge: held.length > 0, admin: (await staffRole(deps, memberId)) === "admin" });
}

// ——— Notifications ———

/**
 * Tells a member something happened: always in their list, and by email
 * when the kind emails and they haven't turned it off. Never for their own
 * action, and never to a member who isn't active.
 */
export async function notify(deps: TrustDeps, input: { memberId: string; kind: NotificationKind; actorId?: string | null; targetType?: string | null; targetId?: string | null; data?: NotificationData; link: string }): Promise<void> {
  if (input.actorId && input.actorId === input.memberId) return;
  const member = await deps.member(input.memberId);
  if (!member || member.status !== "active") return;
  // Never from someone the member blocked or who blocked them: not in the list, not counted, not emailed.
  if (input.actorId && (await deps.blockedEitherWay?.(member.id))?.has(input.actorId)) return;
  const n = await deps.store.addNotification({ memberId: member.id, kind: input.kind, actorId: input.actorId ?? null, targetType: input.targetType ?? null, targetId: input.targetId ?? null, data: { ...(input.data ?? {}), link: input.link }, createdAt: deps.now() });
  const prefs = (await deps.store.getNotificationPrefs(member.id)) ?? DEFAULT_NOTIFICATION_PREFS;
  if (!member.email || !emails(input.kind, prefs)) return;
  const mail = notificationEmail(input.kind, n.data, communityLang(member.language), new URL(input.link, deps.siteUrl).toString(), deps.logoUrl);
  try {
    await deps.sendMail({ to: member.email, ...mail });
    await deps.store.markEmailed(n.id, deps.now());
  } catch (error) {
    // The notice is in their list all the same; a failed email never fails what caused it.
    console.warn(`[community] email for notification ${n.id} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export interface ListedNotification {
  id: string;
  kind: NotificationKind;
  /** In the member's language. */
  text: string;
  link: string;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  read: boolean;
  createdAt: Date;
}

export async function listNotifications(deps: TrustDeps, memberId: string, input: { unreadOnly?: boolean; offset?: number; limit?: number } = {}): Promise<{ page: Page<ListedNotification>; unread: number }> {
  const member = await deps.member(memberId);
  const lang = communityLang(member?.language);
  const list = await deps.store.listNotifications(memberId, { unreadOnly: input.unreadOnly, ...pageInput(input) });
  return {
    page: {
      items: list.items.map((n) => ({ id: n.id, kind: n.kind, text: notificationText(n.kind, n.data, lang), link: n.data.link, actorId: n.actorId, targetType: n.targetType, targetId: n.targetId, read: n.readAt !== null, createdAt: n.createdAt })),
      next: list.next,
    },
    unread: await deps.store.unreadNotifications(memberId),
  };
}

/** Marks the listed notifications read, or all of them when none are listed. */
export async function markRead(deps: TrustDeps, memberId: string, input: unknown): Promise<{ ok: true; marked: number } | Fail> {
  const ids = (input as { ids?: unknown } | null)?.ids;
  if (ids !== undefined && (!Array.isArray(ids) || ids.length > 500 || ids.some((x) => typeof x !== "string"))) return fail(400, "invalid_request", "ids must be a list of notification ids.");
  const marked = await deps.store.markNotificationsRead(memberId, ids === undefined || (ids as string[]).length === 0 ? "all" : (ids as string[]), deps.now());
  return { ok: true, marked };
}

/** Which kinds also come by email (`NotificationSettings`): every kind, on or off. */
export async function getPrefs(deps: TrustDeps, memberId: string): Promise<{ email: Record<NotificationKind, boolean> }> {
  return { email: prefsView((await deps.store.getNotificationPrefs(memberId)) ?? DEFAULT_NOTIFICATION_PREFS) };
}

export async function updatePrefs(deps: TrustDeps, memberId: string, input: unknown): Promise<{ ok: true; email: Record<NotificationKind, boolean> } | Fail> {
  const parsed = parsePrefs(input, (await deps.store.getNotificationPrefs(memberId)) ?? DEFAULT_NOTIFICATION_PREFS);
  if (!parsed.ok) return fail(400, "invalid_request", parsed.error);
  await deps.store.saveNotificationPrefs(memberId, parsed.value, deps.now());
  return { ok: true, email: prefsView(parsed.value) };
}

// ——— Badges ———

/** A badge as anyone sees it (`Badge`): never its private reason. */
export interface PublicBadge {
  kind: CommunityBadge;
  /** In the reader's language ("Pro Developer"). */
  label: string;
  since: Date;
  companyName: string | null;
  appUrl: string | null;
}

/** A member's badges as anyone sees them: the one shown next to their name (the highest) and every one they hold, highest first. */
export async function memberBadges(deps: TrustDeps, memberId: string, lang?: string | null): Promise<{ top: CommunityBadge | null; badges: PublicBadge[] }> {
  const now = deps.now();
  const all = await deps.store.listMemberBadges(memberId);
  const l = communityLang(lang);
  return {
    top: shownBadge(all, now),
    badges: heldBadges(all, now).map((b) => ({ kind: b.badge, label: BADGE_NAMES[l][b.badge], since: b.grantedAt, companyName: b.badge === "green" ? (b.details?.companyName ?? null) : null, appUrl: b.badge === "green" ? (b.details?.appUrl ?? null) : null })),
  };
}

/** The badges shown next to many members' names at once (lists, authors): the highest each holds. */
export async function topBadges(deps: TrustDeps, memberIds: readonly string[]): Promise<Map<string, CommunityBadge | null>> {
  const now = deps.now();
  const out = new Map<string, CommunityBadge | null>();
  for (const id of new Set(memberIds)) out.set(id, shownBadge(await deps.store.listMemberBadges(id), now));
  return out;
}

/** A member's badges as an admin sees them (`BadgeGrant`): every one ever, newest first, with who, when, why and until when. */
export async function adminMemberBadges(deps: TrustDeps, adminId: string, memberId: string): Promise<{ ok: true; badges: MemberBadge[] } | Fail> {
  const denied = await requireAdmin(deps, adminId);
  if (denied) return denied;
  if (!(await deps.member(memberId))) return fail(404, "not_found", "There's no such member.");
  return { ok: true, badges: (await deps.store.listMemberBadges(memberId)).reverse() };
}

async function factsOf(deps: TrustDeps, member: TrustMember): Promise<MemberFacts> {
  const [stats, linked, lastViolationAt] = await Promise.all([deps.stats(member.id), deps.linked(member.id), deps.store.lastViolationAt(member.id)]);
  return { joinedAt: member.createdAt, ...stats, lastViolationAt, linked: linked ? { apps: linked.apps.length, paid: linked.business } : null };
}

/**
 * Brings a member's automatic badges (Blue, Green) in line with the rules:
 * grants and takes away, logs each change and tells the member. Run when
 * something changes for them and by the daily job.
 */
export async function refreshAutoBadges(deps: TrustDeps, memberId: string): Promise<{ granted: CommunityBadge[]; revoked: CommunityBadge[] }> {
  const member = await deps.member(memberId);
  if (!member || member.status === "deleted") return { granted: [], revoked: [] };
  const now = deps.now();
  const settings = await getSettings(deps);
  const changes = reconcileAutoBadges(await deps.store.listMemberBadges(memberId), await factsOf(deps, member), blueRulesOf(settings), now);
  for (const g of changes.grant) {
    const b = await deps.store.addMemberBadge({ memberId, badge: g.badge, source: "auto", reason: null, grantedAt: now, grantedBy: null, expiresAt: null, details: g.details ?? null });
    await audit(deps, { actorId: null, action: "badge.auto_grant", memberId, targetType: "badge", targetId: b.id, details: { badge: g.badge } });
    await notify(deps, { memberId, kind: "badge_granted", data: { badge: g.badge }, link: "/me" });
  }
  for (const r of changes.revoke) {
    await deps.store.revokeMemberBadge(r.id, { at: now, by: null, reason: r.reason });
    await audit(deps, { actorId: null, action: "badge.auto_revoke", memberId, targetType: "badge", targetId: r.id, reason: r.reason, details: { badge: r.badge } });
    await notify(deps, { memberId, kind: "badge_revoked", data: { badge: r.badge }, link: "/me" });
  }
  return { granted: changes.grant.map((g) => g.badge), revoked: changes.revoke.map((r) => r.badge) };
}

/** An admin grants any badge to anyone, whatever the rules: a private reason, an optional expiry, Green's company and app. */
export async function grantBadge(deps: TrustDeps, adminId: string, memberId: string, input: unknown): Promise<{ ok: true; badge: MemberBadge } | Fail> {
  const denied = await requireAdmin(deps, adminId);
  if (denied) return denied;
  if (!(await deps.member(memberId))) return fail(404, "not_found", "There's no such member.");
  const now = deps.now();
  const parsed = parseGrant(input, now);
  if (!parsed.ok) return fail(400, "invalid_request", parsed.error);
  // One of each: an admin's grant replaces the one held (the rules never take it, nor add theirs over it).
  for (const b of (await deps.store.listMemberBadges(memberId)).filter((x) => x.badge === parsed.value.badge && isActive(x, now))) {
    await deps.store.revokeMemberBadge(b.id, { at: now, by: adminId, reason: "Replaced by an admin's grant." });
  }
  const details = parsed.value.badge === "green" ? (parsed.value.details ?? (await deps.linked(memberId))?.business ?? null) : null;
  const badge = await deps.store.addMemberBadge({ memberId, badge: parsed.value.badge, source: "manual", reason: parsed.value.reason, grantedAt: now, grantedBy: adminId, expiresAt: parsed.value.expiresAt, details });
  await audit(deps, { actorId: adminId, action: "badge.grant", memberId, targetType: "badge", targetId: badge.id, reason: parsed.value.reason, details: { badge: badge.badge, expiresAt: parsed.value.expiresAt?.toISOString() ?? null } });
  await notify(deps, { memberId, kind: "badge_granted", actorId: null, data: { badge: badge.badge }, link: "/me" });
  return { ok: true, badge };
}

/** An admin takes away a member's badge of this kind (however it came), with a reason the member is told. */
export async function revokeBadge(deps: TrustDeps, adminId: string, memberId: string, kind: string, input: unknown): Promise<{ ok: true } | Fail> {
  const denied = await requireAdmin(deps, adminId);
  if (denied) return denied;
  if (kind !== "gold" && kind !== "green" && kind !== "blue") return fail(404, "not_found", "There's no such badge.");
  const parsed = parseReason(input);
  if (!parsed.ok) return fail(400, "invalid_request", parsed.error);
  const now = deps.now();
  const held = (await deps.store.listMemberBadges(memberId)).filter((b) => b.badge === kind && isActive(b, now));
  if (!held.length) return fail(404, "not_found", "The member doesn't hold that badge.");
  for (const b of held) {
    await deps.store.revokeMemberBadge(b.id, { at: now, by: adminId, reason: parsed.value });
    await audit(deps, { actorId: adminId, action: "badge.revoke", memberId, targetType: "badge", targetId: b.id, reason: parsed.value, details: { badge: kind, source: b.source } });
  }
  await notify(deps, { memberId, kind: "badge_revoked", actorId: null, data: { badge: kind, reason: parsed.value }, link: "/me" });
  return { ok: true };
}

// ——— The verification form (Gold) ———

/** The member's Gold verification state (`VerificationState`). */
export interface VerificationState {
  hasGold: boolean;
  appCount: number;
  requiredApps: number;
  yallappLinked: boolean;
  canApply: boolean;
  /** The linked account's apps: the form lists them (never typed by the member). */
  apps: LinkedApp[];
  /** Their latest request (with the admin's reason once decided); null: none yet. */
  request: VerificationRequest | null;
}

export async function verificationState(deps: TrustDeps, memberId: string): Promise<VerificationState> {
  const [linked, badges, latest] = await Promise.all([deps.linked(memberId), deps.store.listMemberBadges(memberId), deps.store.latestVerification(memberId)]);
  const hasGold = heldBadges(badges, deps.now()).some((b) => b.badge === "gold");
  const blocked = verificationBlocked({ linked: linked ? { apps: linked.apps.length, paid: linked.business } : null }, { holdsGold: hasGold, pending: latest?.status === "pending" });
  return { hasGold, appCount: linked?.apps.length ?? 0, requiredApps: GOLD_MIN_APPS, yallappLinked: linked !== null, canApply: blocked === null, apps: linked?.apps ?? [], request: latest };
}

/** Applies for Gold: a full name, the ID proof (kept private) and up to 5 links; the apps are the linked account's. */
export async function submitVerification(deps: TrustDeps, memberId: string, input: { full_name?: unknown; portfolio_links?: unknown; idProof: { type: string; size: number; bytes: () => Promise<Uint8Array> } | null }): Promise<{ ok: true; state: VerificationState } | Fail> {
  const state = await verificationState(deps, memberId);
  if (!state.canApply) {
    if (state.request?.status === "pending") return fail(409, "already_pending", "Your request is already being reviewed.");
    if (state.hasGold) return fail(409, "already_gold", "You're already a Pro Developer.");
    return fail(403, "not_eligible", state.yallappLinked ? `You need at least ${GOLD_MIN_APPS} apps made with Yallapp.` : "Link your Yallapp account first.");
  }
  const parsed = parseVerificationForm(input);
  let fileProblem = idProofProblem(input.idProof);
  // The file's real type, by its first bytes (never the type it claims): a JPEG, PNG or PDF only.
  const bytes = !fileProblem && input.idProof ? await input.idProof.bytes() : null;
  const type = bytes ? fileTypeOf(bytes) : null;
  if (bytes && !type) fileProblem = "Upload a JPEG, PNG or PDF.";
  if (!parsed.ok || fileProblem) return fail(400, "invalid_request", "Check the form.", { ...(parsed.ok ? {} : parsed.errors), ...(fileProblem ? { id_proof: fileProblem } : {}) });
  const key = `community/id-proof/${memberId}/${crypto.randomUUID()}.${ID_PROOF_TYPES[type!]}`;
  await deps.files.put(key, bytes!, type!);
  // One request waiting at a time, even when two are sent at once.
  const made = await deps.store.addVerification({ memberId, fullName: parsed.value.fullName, idProofKey: key, portfolioLinks: parsed.value.portfolioLinks, apps: state.apps.map((a) => ({ appId: a.appId, name: a.name })), createdAt: deps.now() });
  if (!made) return fail(409, "already_pending", "Your request is already being reviewed.");
  return { ok: true, state: await verificationState(deps, memberId) };
}

export async function listVerifications(deps: TrustDeps, adminId: string, input: { status?: VerificationStatus; offset?: number; limit?: number }): Promise<{ ok: true; page: Page<VerificationRequest> } | Fail> {
  const denied = await requireAdmin(deps, adminId);
  if (denied) return denied;
  return { ok: true, page: await deps.store.listVerifications({ status: input.status ?? "pending", ...pageInput(input) }) };
}

/** A short-lived private link to a request's ID proof, for admins only (5 minutes). */
export async function idProofLink(deps: TrustDeps, adminId: string, requestId: string): Promise<{ ok: true; url: string; expiresAt: Date } | Fail> {
  const denied = await requireAdmin(deps, adminId);
  if (denied) return denied;
  const r = await deps.store.getVerification(requestId);
  if (!r) return fail(404, "not_found", "There's no such request.");
  if (!r.idProofKey) return fail(404, "not_found", `The ID proof was deleted ${ID_PROOF_KEEP_DAYS} days after the decision.`);
  const seconds = 300;
  return { ok: true, url: await deps.files.link(r.idProofKey, seconds), expiresAt: new Date(deps.now().getTime() + seconds * 1000) };
}

/**
 * The daily job: the ID proof file of every request decided more than 30
 * days ago is deleted from private storage, and the deletion is in the
 * audit log (no actor: the rule itself). The request's name, links and
 * decision stay as the record of the decision.
 */
export async function purgeIdProofs(deps: TrustDeps): Promise<number> {
  const before = new Date(deps.now().getTime() - ID_PROOF_KEEP_DAYS * 86_400_000);
  let deleted = 0;
  for (;;) {
    const due = await deps.store.idProofsDecidedBefore(before, 100);
    for (const r of due) {
      await deps.files.delete(r.idProofKey);
      await deps.store.clearIdProof(r.id);
      await audit(deps, { actorId: null, action: "verification.id_proof_deleted", memberId: r.memberId, targetType: "verification", targetId: r.id, reason: null, details: { decided_at: r.reviewedAt!.toISOString(), status: r.status } });
      deleted++;
    }
    if (due.length < 100) return deleted;
  }
}

/** An admin approves (the member gets Gold) or rejects, with a reason; either way the member is told and it is logged. */
export async function decideVerification(deps: TrustDeps, adminId: string, requestId: string, input: unknown): Promise<{ ok: true; request: VerificationRequest } | Fail> {
  const denied = await requireAdmin(deps, adminId);
  if (denied) return denied;
  const parsed = parseDecision(input);
  if (!parsed.ok) return fail(400, "invalid_request", parsed.error);
  if (!(await deps.store.getVerification(requestId))) return fail(404, "not_found", "There's no such request.");
  const now = deps.now();
  const request = await deps.store.decideVerification(requestId, { status: parsed.value.approve ? "approved" : "rejected", at: now, by: adminId, reason: parsed.value.reason });
  if (!request) return fail(409, "already_decided", "That request was already decided.");
  if (parsed.value.approve) {
    // A Gold the member already holds (an admin's grant) stays; never two.
    if (!heldBadges(await deps.store.listMemberBadges(request.memberId), now).some((b) => b.badge === "gold")) {
      await deps.store.addMemberBadge({ memberId: request.memberId, badge: "gold", source: "request", reason: parsed.value.reason, grantedAt: now, grantedBy: adminId, expiresAt: null, details: null });
    }
    await audit(deps, { actorId: adminId, action: "verification.approve", memberId: request.memberId, targetType: "verification", targetId: request.id, reason: parsed.value.reason, details: { badge: "gold" } });
    await notify(deps, { memberId: request.memberId, kind: "verification_approved", actorId: null, targetType: "verification", targetId: request.id, data: { reason: parsed.value.reason }, link: "/me" });
  } else {
    await audit(deps, { actorId: adminId, action: "verification.reject", memberId: request.memberId, targetType: "verification", targetId: request.id, reason: parsed.value.reason });
    await notify(deps, { memberId: request.memberId, kind: "verification_rejected", actorId: null, targetType: "verification", targetId: request.id, data: { reason: parsed.value.reason }, link: "/verify" });
  }
  return { ok: true, request };
}

export async function auditLog(deps: TrustDeps, adminId: string, input: { memberId?: string; action?: string; offset?: number; limit?: number }): Promise<{ ok: true; page: Page<AuditEntry> } | Fail> {
  const denied = await requireAdmin(deps, adminId);
  if (denied) return denied;
  return { ok: true, page: await deps.store.listAudit({ memberId: input.memberId, action: input.action, ...pageInput(input) }) };
}

/** An admin suspends (a violation; every device signed out) or restores a member, with a reason. */
export async function setStatus(deps: TrustDeps, adminId: string, memberId: string, input: unknown): Promise<{ ok: true } | Fail> {
  const denied = await requireAdmin(deps, adminId);
  if (denied) return denied;
  const status = (input as { status?: unknown } | null)?.status;
  if (status !== "active" && status !== "suspended") return fail(400, "invalid_request", "status must be active or suspended.");
  const reason = parseReason(input);
  if (!reason.ok) return fail(400, "invalid_request", reason.error);
  const member = await deps.member(memberId);
  if (!member || member.status === "deleted") return fail(404, "not_found", "There's no such member.");
  if (memberId === adminId) return fail(400, "invalid_request", "You can't change your own status.");
  await deps.setMemberStatus(memberId, status);
  if (status === "suspended") await deps.store.addViolation({ memberId, kind: "suspended", targetType: "member", targetId: memberId, createdBy: adminId, createdAt: deps.now() });
  await audit(deps, { actorId: adminId, action: status === "suspended" ? "member.suspend" : "member.restore", memberId, targetType: "member", targetId: memberId, reason: reason.value });
  return { ok: true };
}

// ——— Moderation ———

/**
 * Area B calls this right after storing a post (as pending): it appears at
 * once, or waits in the moderation queue (a new member's first posts, or
 * the filter's catch) until a moderator decides.
 */
export async function moderateNew(deps: TrustDeps, input: { memberId: string; targetType: ContentKind; targetId: string; text: string }): Promise<{ status: "published" } | { status: "pending"; reasons: HoldReason[] }> {
  const member = await deps.member(input.memberId);
  const settings = await getSettings(deps);
  // The member's recent posts, less this one (area B stores it before asking): a true repeat is still there.
  const recent = [...((await deps.content.recentTexts?.(input.memberId)) ?? [])];
  const norm = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();
  const self = recent.findIndex((t) => norm(t) === norm(input.text));
  if (self >= 0) recent.splice(self, 1);
  // The team and the Community's staff are never held.
  const staff = member?.role === "team" ? "team" : (await staffRole(deps, input.memberId)) ? "admin" : "member";
  const result = moderationGate({ role: staff, publishedPosts: member?.approvedPosts ?? 0 }, input.text, settings, recent);
  if (result.status === "published") {
    await deps.countApprovedPost(input.memberId);
    return result;
  }
  await deps.store.addModeration({ targetType: input.targetType, targetId: input.targetId, authorId: input.memberId, cause: holdCause(result.reasons), note: result.reasons.join(", "), createdAt: deps.now() });
  return result;
}

/** A queue item with what the queue shows of it (`ModerationItem`): the post's title or first words and its open reports. */
export type QueuedItem = ModerationItem & { preview: string; link: string | null; reportCount: number };

export async function moderationQueue(deps: TrustDeps, adminId: string, input: { status?: ModerationStatus; offset?: number; limit?: number }): Promise<{ ok: true; page: Page<QueuedItem> } | Fail> {
  const denied = await requireAdmin(deps, adminId, "moderator");
  if (denied) return denied;
  const list = await deps.store.listModeration({ status: input.status ?? "open", ...pageInput(input) });
  const items = await Promise.all(
    list.items.map(async (m) => {
      const info = await deps.content.info(m.targetType, m.targetId);
      return { ...m, preview: info?.title ?? "", link: info?.link ?? null, reportCount: await deps.store.countOpenReports(m.targetType, m.targetId) };
    }),
  );
  return { ok: true, page: { items, next: list.next } };
}

/** A moderator approves a held post (it appears) or removes it (hidden, a violation, the member told), with an optional note. */
export async function decideModeration(deps: TrustDeps, adminId: string, itemId: string, input: unknown): Promise<{ ok: true; item: ModerationItem } | Fail> {
  const denied = await requireAdmin(deps, adminId, "moderator");
  if (denied) return denied;
  const v = (input ?? {}) as Record<string, unknown>;
  if (v.decision !== "approve" && v.decision !== "remove") return fail(400, "invalid_request", "decision must be approve or remove.");
  const note = typeof v.note === "string" && v.note.trim() ? v.note.trim().slice(0, 1000) : null;
  if (!(await deps.store.getModeration(itemId))) return fail(404, "not_found", "There's no such item.");
  const now = deps.now();
  const item = await deps.store.decideModeration(itemId, { status: v.decision === "approve" ? "approved" : "removed", at: now, by: adminId, note });
  if (!item) return fail(409, "already_decided", "That item was already decided.");
  const info = await deps.content.info(item.targetType, item.targetId);
  const author = item.authorId ?? info?.authorId ?? null;
  if (item.status === "approved") {
    await deps.content.setStatus(item.targetType, item.targetId, "published");
    // Held for being new (or by reports found fine): it now counts toward their first posts.
    if (author && item.cause !== "reports") await deps.countApprovedPost(author);
    await audit(deps, { actorId: adminId, action: "moderation.approve", memberId: author, targetType: item.targetType, targetId: item.targetId, reason: note });
    if (author && item.cause !== "reports") await notify(deps, { memberId: author, kind: "post_approved", actorId: null, targetType: item.targetType, targetId: item.targetId, data: { title: info?.title ?? null }, link: info?.link ?? "/" });
  } else {
    await deps.content.setStatus(item.targetType, item.targetId, "hidden");
    if (author) await deps.store.addViolation({ memberId: author, kind: "content_removed", targetType: item.targetType, targetId: item.targetId, createdBy: adminId, createdAt: now });
    await audit(deps, { actorId: adminId, action: "moderation.remove", memberId: author, targetType: item.targetType, targetId: item.targetId, reason: note });
    // The moderator's note is private: the author is told the post was removed, never the note.
    if (author) await notify(deps, { memberId: author, kind: "post_removed", actorId: null, targetType: item.targetType, targetId: item.targetId, data: { title: info?.title ?? null }, link: "/" });
  }
  // The reports on it are settled with it.
  for (const r of await deps.store.openReportsOn(item.targetType, item.targetId)) {
    await deps.store.resolveReport(r.id, { status: item.status === "removed" ? "actioned" : "dismissed", at: now, by: adminId });
    await notify(deps, { memberId: r.reporterId, kind: "report_resolved", actorId: null, link: "/" });
  }
  return { ok: true, item };
}

// ——— Reports ———

/** A member reports a member or a post, once each. Enough reports on one post hide it until a moderator decides. */
export async function report(deps: TrustDeps, memberId: string, input: unknown): Promise<{ ok: true; id: string } | Fail> {
  const parsed = parseReport(input);
  if (!parsed.ok) return fail(400, "invalid_request", parsed.error);
  const { targetType, targetId, reason, note } = parsed.value;
  let authorId: string;
  if (targetType === "member") {
    const target = await deps.member(targetId);
    if (!target || target.status === "deleted") return fail(404, "not_found", "There's no such member.");
    authorId = target.id;
  } else {
    const info = await deps.content.info(targetType, targetId);
    if (!info) return fail(404, "not_found", "That post doesn't exist.");
    authorId = info.authorId;
  }
  if (authorId === memberId) return fail(400, "invalid_request", "You can't report yourself.");
  const made = await deps.store.addReport({ reporterId: memberId, targetType, targetId, reason, note, createdAt: deps.now() });
  if (!made) return fail(409, "already_reported", "You already reported this.");
  await afterReported(deps, made);
  return { ok: true, id: made.id };
}

/**
 * A report was made (area A's POST /reports, or `report` above): it is in
 * the moderators' list, and a post with enough open reports is hidden and
 * queued until a moderator decides.
 */
export async function afterReported(deps: TrustDeps, made: Report): Promise<void> {
  // The same row on MySQL; in memory, area C's copy of area A's report.
  await deps.store.addReport({ id: made.id, reporterId: made.reporterId, targetType: made.targetType, targetId: made.targetId, reason: made.reason, note: made.note, createdAt: made.createdAt });
  if (made.targetType === "member") return;
  const targetType = made.targetType;
  if (await deps.store.openModeration(targetType, made.targetId)) return;
  const settings = await getSettings(deps);
  const weight = await reportWeight(deps, await deps.store.openReportsOn(targetType, made.targetId));
  if (weight < settings.spam_filter.hide_after_reports) return;
  const info = await deps.content.info(targetType, made.targetId);
  // The team's and the staff's posts (an official answer among them) are queued for a look, never hidden by reports.
  const author = info?.authorId ? await deps.member(info.authorId) : null;
  const protectedAuthor = !!author && (author.role === "team" || (await staffRole(deps, author.id)) !== null);
  if (!protectedAuthor) await deps.content.setStatus(targetType, made.targetId, "hidden");
  await deps.store.addModeration({ targetType, targetId: made.targetId, authorId: info?.authorId ?? null, cause: "reports", note: `${weight} reports`, createdAt: deps.now() });
}

/** Members at least this many days old count when reports hide a post (a ring of new accounts can't). */
export const REPORTER_MIN_DAYS = 7;

/**
 * How much the open reports on a post weigh toward hiding it: a report
 * counts from an established member only (an account at least 7 days old,
 * no violation within Blue's window, no open report against them), and a
 * member holding a badge counts twice.
 */
async function reportWeight(deps: TrustDeps, reports: readonly Report[]): Promise<number> {
  const now = deps.now();
  const settings = await getSettings(deps);
  let total = 0;
  for (const r of reports) {
    const m = await deps.member(r.reporterId);
    if (!m || m.status !== "active") continue;
    if (now.getTime() - m.createdAt.getTime() < REPORTER_MIN_DAYS * 86_400_000) continue;
    const violation = await deps.store.lastViolationAt(m.id);
    if (violation && now.getTime() - violation.getTime() < settings.blue_badge.violation_free_days * 86_400_000) continue;
    if ((await deps.store.countOpenReports("member", m.id)) > 0) continue;
    total += heldBadges(await deps.store.listMemberBadges(m.id), now).length ? 2 : 1;
  }
  return total;
}

export async function listReports(deps: TrustDeps, adminId: string, input: { status?: ReportStatus; offset?: number; limit?: number }): Promise<{ ok: true; page: Page<Report> } | Fail> {
  const denied = await requireAdmin(deps, adminId, "moderator");
  if (denied) return denied;
  return { ok: true, page: await deps.store.listReports({ status: input.status ?? "open", ...pageInput(input) }) };
}

/**
 * A moderator closes a report: actioned (a post is hidden, the member it is
 * about gets a violation) or dismissed (a post hidden by reports alone comes
 * back). Every open report on the same target closes with it, and each
 * reporter is thanked.
 */
export async function resolveReport(deps: TrustDeps, adminId: string, reportId: string, input: unknown): Promise<{ ok: true; report: Report } | Fail> {
  const denied = await requireAdmin(deps, adminId, "moderator");
  if (denied) return denied;
  const v = (input ?? {}) as Record<string, unknown>;
  if (v.status !== "actioned" && v.status !== "dismissed") return fail(400, "invalid_request", "status must be actioned or dismissed.");
  const note = typeof v.note === "string" && v.note.trim() ? v.note.trim().slice(0, 1000) : null;
  const first = await deps.store.getReport(reportId);
  if (!first) return fail(404, "not_found", "There's no such report.");
  if (first.status !== "open") return fail(409, "already_decided", "That report was already closed.");
  const now = deps.now();
  const target = first.targetType as CommunityTargetType;
  const all = await deps.store.openReportsOn(target, first.targetId);
  for (const r of all) {
    await deps.store.resolveReport(r.id, { status: v.status, at: now, by: adminId });
    await notify(deps, { memberId: r.reporterId, kind: "report_resolved", actorId: null, link: "/" });
  }
  const authorId = target === "member" ? first.targetId : ((await deps.content.info(target, first.targetId))?.authorId ?? null);
  const held = target === "member" ? null : await deps.store.openModeration(target, first.targetId);
  if (v.status === "actioned") {
    if (authorId) await deps.store.addViolation({ memberId: authorId, kind: "report_actioned", targetType: target, targetId: first.targetId, createdBy: adminId, createdAt: now });
    if (target !== "member") {
      await deps.content.setStatus(target, first.targetId, "hidden");
      if (held) await deps.store.decideModeration(held.id, { status: "removed", at: now, by: adminId, note });
    }
  } else if (held?.cause === "reports") {
    // Hidden by reports alone and found fine: it comes back.
    await deps.store.decideModeration(held.id, { status: "approved", at: now, by: adminId, note });
    await deps.content.setStatus(target as ContentKind, first.targetId, "published");
  }
  await audit(deps, { actorId: adminId, action: v.status === "actioned" ? "report.action" : "report.dismiss", memberId: authorId, targetType: target, targetId: first.targetId, reason: note, details: { reports: all.map((r) => r.id) } });
  return { ok: true, report: (await deps.store.getReport(reportId))! };
}

export type { CommunityBadge, MemberBadge, ModerationItem, Report, VerificationRequest, AuditEntry, CommunitySettings };
