/**
 * 231 Yallapp Community: verification badges (area C).
 *
 * Three badges, shown highest first: Gold ("Pro Developer"), then Green
 * ("Verified Business"), then Blue ("Active Member"). A member's card shows
 * only the highest one they hold; their profile lists every badge they hold.
 *
 * - Gold is applied for with the verification form, once the member's linked
 *   Yallapp account has made at least 5 apps (Studio Market templates count),
 *   and an admin approves or rejects it.
 * - Blue is automatic, by rules the admin edits in settings, and comes and
 *   goes with the member's activity.
 * - Green is automatic while the linked Yallapp account has an app on a paid
 *   plan, and goes when the plan lapses.
 *
 * An admin can grant any badge to anyone (a private reason, an optional
 * expiry) and revoke any badge (a reason). A badge an admin granted is never
 * taken by the automatic rules; it ends only at its own expiry or when an
 * admin revokes it.
 */

export const COMMUNITY_BADGES = ["gold", "green", "blue"] as const;
export type CommunityBadge = (typeof COMMUNITY_BADGES)[number];

/** How a member came to hold a badge: the automatic rules, an admin's grant, or an admin's approval of the form (Gold). */
export const BADGE_SOURCES = ["auto", "manual", "request"] as const;
export type BadgeSource = (typeof BADGE_SOURCES)[number];

/** A badge a member holds or held. */
export interface MemberBadge {
  id: string;
  memberId: string;
  badge: CommunityBadge;
  source: BadgeSource;
  /** Private: only admins see it. Null for the automatic rules. */
  reason: string | null;
  grantedAt: Date;
  /** The admin who granted or approved it; null for the automatic rules. */
  grantedBy: string | null;
  /** When it ends on its own (an admin's grant only); null: never. */
  expiresAt: Date | null;
  /** When it was taken away (an admin, or the automatic rules); null while held. */
  revokedAt: Date | null;
  revokedBy: string | null;
  revokeReason: string | null;
  /** Green: the business it verifies, as the badge shows it. */
  details: BadgeDetails | null;
}

/** Green's company and app, as the badge shows them. */
export interface BadgeDetails {
  companyName?: string;
  appUrl?: string;
  appId?: string;
}

/** The minimum apps made with Yallapp to apply for Gold. */
export const GOLD_MIN_APPS = 5;

/** Blue's rules, each editable by the admin in settings. */
export interface BlueRules {
  /** The account's age, in days. */
  minAccountDays: number;
  minPoints: number;
  /** Accepted answers, or approved tutorials: either is enough. */
  minAcceptedAnswers: number;
  minApprovedTutorials: number;
  /** No violation within this many days. */
  cleanDays: number;
  /** Taken away after this many days without activity, given back once active again. */
  inactiveDays: number;
}

export const DEFAULT_BLUE_RULES: BlueRules = {
  minAccountDays: 60,
  minPoints: 1000,
  minAcceptedAnswers: 20,
  minApprovedTutorials: 10,
  cleanDays: 90,
  inactiveDays: 90,
};

/** What the automatic rules read about a member. */
export interface MemberFacts {
  joinedAt: Date;
  points: number;
  acceptedAnswers: number;
  approvedTutorials: number;
  /** Their latest violation (content removed, a report upheld); null: none. */
  lastViolationAt: Date | null;
  /** Their latest activity (a post, an answer, a vote, signing in); null: none yet. */
  lastActiveAt: Date | null;
  /** The linked Yallapp account; null when none is linked. */
  linked: {
    /** Apps made with Yallapp (Studio Market templates count). */
    apps: number;
    /** An app on a paid plan, with its company and link, as Green shows them; null: none. */
    paid: BadgeDetails | null;
  } | null;
}

const DAY = 86_400_000;

/** Whether a badge is held at `now`: not revoked and not past its expiry. */
export function isActive(b: Pick<MemberBadge, "revokedAt" | "expiresAt">, now: Date): boolean {
  return b.revokedAt === null && (b.expiresAt === null || b.expiresAt.getTime() > now.getTime());
}

/** The badges a member holds at `now`, highest first, one of each. */
export function heldBadges<T extends Pick<MemberBadge, "badge" | "revokedAt" | "expiresAt">>(badges: readonly T[], now: Date): T[] {
  const held = new Map<CommunityBadge, T>();
  for (const b of badges) if (isActive(b, now) && !held.has(b.badge)) held.set(b.badge, b);
  return COMMUNITY_BADGES.flatMap((k) => (held.has(k) ? [held.get(k)!] : []));
}

/** The one badge a member's card shows: the highest held (Gold, then Green, then Blue); null: none. */
export function shownBadge(badges: readonly Pick<MemberBadge, "badge" | "revokedAt" | "expiresAt">[], now: Date): CommunityBadge | null {
  return heldBadges(badges, now)[0]?.badge ?? null;
}

/** Whether the member may apply for Gold: a linked Yallapp account with at least 5 apps. The Apply button shows only then. */
export function canApplyForGold(facts: Pick<MemberFacts, "linked">): boolean {
  return (facts.linked?.apps ?? 0) >= GOLD_MIN_APPS;
}

/** Whether Blue's rules hold for the member at `now` (activity aside). */
export function meetsBlueRules(facts: MemberFacts, rules: BlueRules, now: Date): boolean {
  const days = (since: Date) => (now.getTime() - since.getTime()) / DAY;
  if (days(facts.joinedAt) < rules.minAccountDays) return false;
  if (facts.points < rules.minPoints) return false;
  if (facts.acceptedAnswers < rules.minAcceptedAnswers && facts.approvedTutorials < rules.minApprovedTutorials) return false;
  if (facts.lastViolationAt && days(facts.lastViolationAt) < rules.cleanDays) return false;
  return true;
}

/** Whether the member has been active within Blue's window. */
export function isActiveMember(facts: Pick<MemberFacts, "lastActiveAt">, rules: Pick<BlueRules, "inactiveDays">, now: Date): boolean {
  return facts.lastActiveAt !== null && now.getTime() - facts.lastActiveAt.getTime() < rules.inactiveDays * DAY;
}

/** What the automatic rules say the member should hold: Blue and Green. Gold is never automatic. */
export function autoBadges(facts: MemberFacts, rules: BlueRules, now: Date): { blue: boolean; green: BadgeDetails | null } {
  return {
    blue: meetsBlueRules(facts, rules, now) && isActiveMember(facts, rules, now),
    green: facts.linked?.paid ?? null,
  };
}

/** What to change so the member's automatic badges follow the rules. */
export interface BadgeChanges {
  grant: { badge: "blue" | "green"; details?: BadgeDetails }[];
  /** The automatic badges to take away, by id, and why (for the audit log and the member's notice). */
  revoke: { id: string; badge: "blue" | "green"; reason: "inactive" | "rules" | "plan_lapsed" }[];
}

/**
 * The automatic badges to grant and take away so that the member's badges
 * follow the rules. A badge an admin granted or approved is left alone, and
 * while one is held the automatic rules don't add a second of the same kind.
 */
export function reconcileAutoBadges(current: readonly MemberBadge[], facts: MemberFacts, rules: BlueRules, now: Date): BadgeChanges {
  const want = autoBadges(facts, rules, now);
  const changes: BadgeChanges = { grant: [], revoke: [] };
  const held = current.filter((b) => isActive(b, now));
  for (const badge of ["blue", "green"] as const) {
    const mine = held.filter((b) => b.badge === badge);
    const auto = mine.filter((b) => b.source === "auto");
    const wanted = badge === "blue" ? want.blue : want.green !== null;
    if (wanted && !mine.length) changes.grant.push(badge === "green" ? { badge, details: want.green! } : { badge });
    if (!wanted) {
      const reason = badge === "green" ? "plan_lapsed" : meetsBlueRules(facts, rules, now) ? "inactive" : "rules";
      for (const b of auto) changes.revoke.push({ id: b.id, badge, reason });
    }
  }
  return changes;
}
