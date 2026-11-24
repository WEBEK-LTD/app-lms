import type { BlueRules } from "./badges";

/**
 * 231 Yallapp Community: the settings an admin edits (area C), as the API
 * gives them (docs/api/community.yaml `AdminSettings`): Blue's rules, who
 * may create groups (read by phase 2's groups), the spam and bad-link
 * filter, and how many first posts are reviewed. Stored as one document
 * (community_settings, key "trust"); a setting missing from what is stored
 * takes its default, so a new setting needs no migration.
 */

/** Who may create groups (phase 2 reads it): everyone, members holding a badge, or the members the admin chose. */
export const GROUP_CREATORS = ["everyone", "badge_holders", "chosen"] as const;
export type GroupCreators = (typeof GROUP_CREATORS)[number];

export interface CommunitySettings {
  blue_badge: {
    min_account_days: number;
    min_points: number;
    /** Or `min_approved_tutorials`: either is enough. */
    min_accepted_answers: number;
    min_approved_tutorials: number;
    /** No violation within this many days. */
    violation_free_days: number;
    /** Taken away after this many days without activity, given back once active again. */
    inactive_days: number;
  };
  groups_create_policy: GroupCreators;
  /** The chosen members' ids (policy "chosen"). */
  groups_create_members: string[];
  spam_filter: {
    enabled: boolean;
    /** Sites a link may never point to (and their subdomains), besides the filter's own. */
    blocked_domains: string[];
    /** Links in one post beyond which it is held. */
    max_links: number;
    /** Words or phrases that hold a post, besides the filter's own. */
    blocked_words: string[];
    /** Open reports on one post that hide it until a moderator decides. */
    hide_after_reports: number;
  };
  /** A new member's first posts and questions (this many) wait for review. */
  first_posts_reviewed: number;
}

export const DEFAULT_COMMUNITY_SETTINGS: CommunitySettings = {
  blue_badge: { min_account_days: 60, min_points: 1000, min_accepted_answers: 20, min_approved_tutorials: 10, violation_free_days: 90, inactive_days: 90 },
  groups_create_policy: "everyone",
  groups_create_members: [],
  spam_filter: { enabled: true, blocked_domains: [], max_links: 3, blocked_words: [], hide_after_reports: 3 },
  first_posts_reviewed: 2,
};

/** Blue's rules as the badge logic reads them. */
export function blueRulesOf(s: CommunitySettings): BlueRules {
  const b = s.blue_badge;
  return { minAccountDays: b.min_account_days, minPoints: b.min_points, minAcceptedAnswers: b.min_accepted_answers, minApprovedTutorials: b.min_approved_tutorials, cleanDays: b.violation_free_days, inactiveDays: b.inactive_days };
}

type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const int = (v: unknown, min: number, max: number): number | null => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOMAIN = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

/** The settings as stored, each missing or broken one at its default. */
export function settingsOf(stored: unknown): CommunitySettings {
  const parsed = parseSettings(stored, DEFAULT_COMMUNITY_SETTINGS, true);
  return parsed.ok ? parsed.value : structuredClone(DEFAULT_COMMUNITY_SETTINGS);
}

/**
 * The admin's change to the settings, over `current`: only the fields sent
 * change (PUT sends them all; a partial body is fine). With `lenient`
 * (reading what is stored), a broken field keeps its value instead of failing.
 */
export function parseSettings(input: unknown, current: CommunitySettings, lenient = false): Result<CommunitySettings> {
  const errors: Record<string, string> = {};
  const v = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: CommunitySettings = structuredClone(current);
  const field = <T>(path: string, value: unknown, read: (x: unknown) => T | null, set: (x: T) => void, message: string) => {
    if (value === undefined) return;
    const got = read(value);
    if (got === null) {
      if (!lenient) errors[path] = message;
      return;
    }
    set(got);
  };
  const days = "Enter whole days, 0 to 3650.";
  const count = "Enter a whole number, 0 or more.";

  const blue = (v.blue_badge && typeof v.blue_badge === "object" ? v.blue_badge : {}) as Record<string, unknown>;
  field("blue_badge.min_account_days", blue.min_account_days, (x) => int(x, 0, 3650), (x) => (out.blue_badge.min_account_days = x), days);
  field("blue_badge.min_points", blue.min_points, (x) => int(x, 0, 10_000_000), (x) => (out.blue_badge.min_points = x), count);
  field("blue_badge.min_accepted_answers", blue.min_accepted_answers, (x) => int(x, 0, 100_000), (x) => (out.blue_badge.min_accepted_answers = x), count);
  field("blue_badge.min_approved_tutorials", blue.min_approved_tutorials, (x) => int(x, 0, 100_000), (x) => (out.blue_badge.min_approved_tutorials = x), count);
  field("blue_badge.violation_free_days", blue.violation_free_days, (x) => int(x, 0, 3650), (x) => (out.blue_badge.violation_free_days = x), days);
  field("blue_badge.inactive_days", blue.inactive_days, (x) => int(x, 1, 3650), (x) => (out.blue_badge.inactive_days = x), "Enter whole days, 1 to 3650.");

  field("groups_create_policy", v.groups_create_policy, (x) => ((GROUP_CREATORS as readonly unknown[]).includes(x) ? (x as GroupCreators) : null), (x) => (out.groups_create_policy = x), "Choose everyone, badge holders or chosen people.");
  field(
    "groups_create_members",
    v.groups_create_members,
    (x) => (Array.isArray(x) && x.length <= 5000 && x.every((id) => typeof id === "string" && UUID.test(id)) ? [...new Set((x as string[]).map((id) => id.toLowerCase()))] : null),
    (x) => (out.groups_create_members = x),
    "Choose members.",
  );

  const spam = (v.spam_filter && typeof v.spam_filter === "object" ? v.spam_filter : {}) as Record<string, unknown>;
  field("spam_filter.enabled", spam.enabled, (x) => (typeof x === "boolean" ? x : null), (x) => (out.spam_filter.enabled = x), "Turn the filter on or off.");
  field("spam_filter.max_links", spam.max_links, (x) => int(x, 0, 50), (x) => (out.spam_filter.max_links = x), "Enter a whole number, 0 to 50.");
  field("spam_filter.hide_after_reports", spam.hide_after_reports, (x) => int(x, 1, 1000), (x) => (out.spam_filter.hide_after_reports = x), "Enter a whole number, 1 or more.");
  field(
    "spam_filter.blocked_domains",
    spam.blocked_domains,
    (x) => {
      if (!Array.isArray(x) || x.length > 1000) return null;
      const list = x.map((d) => (typeof d === "string" ? d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "") : ""));
      return list.every((d) => DOMAIN.test(d)) ? [...new Set(list)] : null;
    },
    (x) => (out.spam_filter.blocked_domains = x),
    "Enter sites like example.com, one per line.",
  );
  field(
    "spam_filter.blocked_words",
    spam.blocked_words,
    (x) => (Array.isArray(x) && x.length <= 1000 && x.every((w) => typeof w === "string" && w.trim().length > 0 && w.length <= 80) ? [...new Set((x as string[]).map((w) => w.trim().toLowerCase()))] : null),
    (x) => (out.spam_filter.blocked_words = x),
    "Enter words of up to 80 characters.",
  );
  field("first_posts_reviewed", v.first_posts_reviewed, (x) => int(x, 0, 50), (x) => (out.first_posts_reviewed = x), "Enter a whole number, 0 to 50.");

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: out };
}

/** Whether a member may create a group (phase 2): by the setting, their badges and the admin's chosen list. */
export function mayCreateGroups(settings: CommunitySettings, member: { id: string; hasBadge: boolean; admin: boolean }): boolean {
  if (member.admin) return true;
  if (settings.groups_create_policy === "everyone") return true;
  if (settings.groups_create_policy === "badge_holders") return member.hasBadge;
  return settings.groups_create_members.includes(member.id.toLowerCase());
}
