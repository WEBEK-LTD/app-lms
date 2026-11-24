import { t } from "../i18n";
import type { CommunityMember } from "../types";
import { linkedApps } from "../yallapp";
import { heldBadges, topBadge, type HeldBadge } from "./badge-lookup";
import type { CommunityContext } from "./http";
import { memberRank, type MemberRank } from "./member-rank";
import { unreadNotifications } from "./notification-count";
import { qaStats } from "./profile-stats";

/**
 * 231 How members appear in the API (docs: MemberSummary, Relationship,
 * Profile, Me). Areas B and C show authors, actors and reporters with
 * `memberSummaries` so every name carries its one badge and the viewer's
 * relationship the same way.
 */

export interface RelationshipView {
  following: boolean;
  followed_by: boolean;
  friend: "none" | "requested" | "incoming" | "friends";
  friend_request_id: string | null;
  blocked: boolean;
}

export interface MemberSummaryView {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  headline: string;
  top_badge: HeldBadge["kind"] | null;
  team: boolean;
  deleted: boolean;
  /** Their standing by points ("Expert"), and its name in the reader's language. */
  rank: MemberRank;
  rank_label: string;
  relationship?: RelationshipView;
}

/** A member who deleted their account, wherever their questions and answers stay. */
export function deletedMember(ctx: Pick<CommunityContext, "lang">, id: string): MemberSummaryView {
  return { id, username: "", display_name: t(ctx.lang, "member.deleted"), avatar_url: null, headline: "", top_badge: null, team: false, deleted: true, rank: "newcomer", rank_label: t(ctx.lang, "rank.newcomer") };
}

/** How the signed-in member stands with `other` (none for oneself or when signed out). */
export async function relationshipWith(ctx: CommunityContext, otherId: string): Promise<RelationshipView | undefined> {
  const me = ctx.member;
  if (!me || me.id === otherId) return undefined;
  const base = ctx.store.base;
  const [following, followedBy, friendship, blocked] = await Promise.all([
    base.isFollowing(me.id, otherId),
    base.isFollowing(otherId, me.id),
    base.getFriendshipBetween(me.id, otherId),
    base.hasBlocked(me.id, otherId),
  ]);
  const friend: RelationshipView["friend"] = !friendship ? "none" : friendship.status === "accepted" ? "friends" : friendship.requesterId === me.id ? "requested" : "incoming";
  return { following, followed_by: followedBy, friend, friend_request_id: friendship?.status === "pending" ? friendship.id : null, blocked };
}

function summaryOf(ctx: Pick<CommunityContext, "lang">, member: CommunityMember, badges: HeldBadge[] | undefined): MemberSummaryView {
  const rank = memberRank(member.points);
  return {
    id: member.id,
    username: member.username,
    display_name: member.displayName,
    avatar_url: member.avatarUrl,
    headline: member.headline,
    top_badge: topBadge(badges),
    team: member.role === "team" || member.role === "admin",
    deleted: false,
    rank,
    rank_label: t(ctx.lang, `rank.${rank}`),
  };
}

/**
 * The members by id, in the order asked, as MemberSummary; an id with no
 * member (deleted) gives "Deleted member". With `relationships`, each
 * carries the viewer's relationship.
 */
export async function memberSummaries(ctx: CommunityContext, ids: readonly string[], options: { relationships?: boolean } = {}): Promise<MemberSummaryView[]> {
  const members = await ctx.store.base.getMembers(ids);
  const byId = new Map(members.filter((m) => m.status !== "deleted").map((m) => [m.id, m]));
  const badges = await heldBadges(ctx, [...byId.keys()]);
  return Promise.all(
    ids.map(async (id) => {
      const member = byId.get(id);
      if (!member) return deletedMember(ctx, id);
      const view = summaryOf(ctx, member, badges.get(id));
      if (options.relationships) {
        const relationship = await relationshipWith(ctx, id);
        if (relationship) view.relationship = relationship;
      }
      return view;
    }),
  );
}

export async function memberSummary(ctx: CommunityContext, id: string, options: { relationships?: boolean } = {}): Promise<MemberSummaryView> {
  const [view] = await memberSummaries(ctx, [id], options);
  return view!;
}

/** A member's public profile (docs: Profile). */
export async function profileView(ctx: CommunityContext, member: CommunityMember) {
  const base = ctx.store.base;
  const [badges, followers, following, friends, stats, apps] = await Promise.all([
    heldBadges(ctx, [member.id]),
    base.countFollowers(member.id),
    base.countFollowing(member.id),
    base.countFriends(member.id),
    qaStats(ctx, member.id),
    member.yallappUserId ? linkedApps(ctx.deps.platform, member.yallappUserId, ctx.now) : Promise.resolve([]),
  ]);
  const held = badges.get(member.id) ?? [];
  const relationship = await relationshipWith(ctx, member.id);
  const own = ctx.member?.id === member.id;
  return {
    ...summaryOf(ctx, member, held),
    ...(relationship ? { relationship } : {}),
    bio: member.bio,
    skills: member.skills,
    links: member.links,
    badges: held.map((b) => ({
      kind: b.kind,
      label: t(ctx.lang, `badge.${b.kind}`),
      since: b.since.toISOString(),
      company_name: b.companyName,
      app_url: b.appUrl,
    })),
    points: member.points,
    counts: {
      followers,
      following,
      friends,
      questions: stats.questions,
      answers: stats.answers,
      accepted_answers: stats.acceptedAnswers,
      apps: own ? apps.length : apps.filter((a) => a.appStoreUrl || a.playStoreUrl).length,
    },
    joined_at: member.createdAt.toISOString(),
    yallapp_linked: member.yallappUserId !== null,
  };
}

/** The signed-in member's own view (docs: Me). */
export async function meView(ctx: CommunityContext, member: CommunityMember) {
  const base = ctx.store.base;
  const [profile, identities, pendingFriends] = await Promise.all([profileView(ctx, member), base.listIdentities(member.id), base.countIncomingFriendRequests(member.id)]);
  const providers = [...(member.passwordHash ? ["email"] : []), ...new Set(identities.map((i) => i.provider))];
  return {
    ...profile,
    email: member.email,
    email_verified: member.emailVerified,
    has_password: member.passwordHash !== null,
    providers,
    language: member.language,
    theme: member.theme,
    role: member.role,
    status: member.status === "suspended" ? "suspended" : "active",
    unread_notifications: await unreadNotifications(ctx, member.id),
    pending_friend_requests: pendingFriends,
  };
}

/** The apps of a member as the API shows them (docs: LinkedApp). */
export function linkedAppView(app: Awaited<ReturnType<typeof linkedApps>>[number]) {
  return {
    id: app.appId,
    name: app.name,
    icon_url: app.iconUrl,
    app_store_url: app.appStoreUrl,
    play_store_url: app.playStoreUrl,
    from_template: app.fromTemplate,
    paid_plan: app.paidPlan,
  };
}
