import { DEFAULT_BLUE_RULES, type BlueRules } from "./badges";

/**
 * 231 Yallapp Community: the settings an admin edits (area C). Blue's rules,
 * who may create groups (read by phase 2's groups) and moderation. Stored as
 * one document; a setting missing from what is stored takes its default, so
 * a new setting needs no migration.
 */

/** Who may create groups (phase 2 reads it): everyone, members holding a badge, or the members the admin chose. */
export const GROUP_CREATORS = ["everyone", "badge_holders", "chosen"] as const;
export type GroupCreators = (typeof GROUP_CREATORS)[number];

export interface ModerationSettings {
  /** A new member's first posts and questions (this many) wait for review before they appear. */
  reviewFirstPosts: number;
  /** Links in one post beyond which it is held as likely spam. */
  maxLinks: number;
  /** Sites a link may never point to (and their subdomains), besides the filter's own. */
  blockedDomains: string[];
  /** Words or phrases that hold a post for review, besides the filter's own. */
  blockedWords: string[];
  /** Reports on one post that hide it until an admin looks. */
  hideAfterReports: number;
}

export interface CommunitySettings {
  blue: BlueRules;
  groups: { creators: GroupCreators; chosen: number[] };
  moderation: ModerationSettings;
}

export const DEFAULT_COMMUNITY_SETTINGS: CommunitySettings = {
  blue: { ...DEFAULT_BLUE_RULES },
  groups: { creators: "everyone", chosen: [] },
  moderation: { reviewFirstPosts: 2, maxLinks: 3, blockedDomains: [], blockedWords: [], hideAfterReports: 3 },
};

type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const int = (v: unknown, min: number, max: number): number | null => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null);

const DOMAIN = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

/** The settings as stored, each missing or broken one at its default. */
export function settingsOf(stored: unknown): CommunitySettings {
  const parsed = parseSettings(stored, DEFAULT_COMMUNITY_SETTINGS, true);
  return parsed.ok ? parsed.value : DEFAULT_COMMUNITY_SETTINGS;
}

/**
 * The admin's change to the settings, over `current`: only the fields sent
 * change. With `lenient` (reading what is stored), a broken field keeps its
 * default instead of failing.
 */
export function parseSettings(input: unknown, current: CommunitySettings, lenient = false): Result<CommunitySettings> {
  const errors: Record<string, string> = {};
  const v = (input ?? {}) as Record<string, unknown>;
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

  const blue = (v.blue ?? {}) as Record<string, unknown>;
  field("blue.minAccountDays", blue.minAccountDays, (x) => int(x, 0, 3650), (x) => (out.blue.minAccountDays = x), "Enter whole days, 0 to 3650.");
  field("blue.minPoints", blue.minPoints, (x) => int(x, 0, 10_000_000), (x) => (out.blue.minPoints = x), "Enter whole points, 0 or more.");
  field("blue.minAcceptedAnswers", blue.minAcceptedAnswers, (x) => int(x, 0, 100_000), (x) => (out.blue.minAcceptedAnswers = x), "Enter a whole number, 0 or more.");
  field("blue.minApprovedTutorials", blue.minApprovedTutorials, (x) => int(x, 0, 100_000), (x) => (out.blue.minApprovedTutorials = x), "Enter a whole number, 0 or more.");
  field("blue.cleanDays", blue.cleanDays, (x) => int(x, 0, 3650), (x) => (out.blue.cleanDays = x), "Enter whole days, 0 to 3650.");
  field("blue.inactiveDays", blue.inactiveDays, (x) => int(x, 1, 3650), (x) => (out.blue.inactiveDays = x), "Enter whole days, 1 to 3650.");

  const groups = (v.groups ?? {}) as Record<string, unknown>;
  field("groups.creators", groups.creators, (x) => ((GROUP_CREATORS as readonly unknown[]).includes(x) ? (x as GroupCreators) : null), (x) => (out.groups.creators = x), "Choose everyone, badge holders or chosen people.");
  field(
    "groups.chosen",
    groups.chosen,
    (x) => (Array.isArray(x) && x.length <= 5000 && x.every((id) => int(id, 1, Number.MAX_SAFE_INTEGER) !== null) ? [...new Set(x as number[])] : null),
    (x) => (out.groups.chosen = x),
    "Choose members by their IDs.",
  );

  const mod = (v.moderation ?? {}) as Record<string, unknown>;
  field("moderation.reviewFirstPosts", mod.reviewFirstPosts, (x) => int(x, 0, 50), (x) => (out.moderation.reviewFirstPosts = x), "Enter a whole number, 0 to 50.");
  field("moderation.maxLinks", mod.maxLinks, (x) => int(x, 0, 50), (x) => (out.moderation.maxLinks = x), "Enter a whole number, 0 to 50.");
  field("moderation.hideAfterReports", mod.hideAfterReports, (x) => int(x, 1, 1000), (x) => (out.moderation.hideAfterReports = x), "Enter a whole number, 1 or more.");
  field(
    "moderation.blockedDomains",
    mod.blockedDomains,
    (x) => {
      if (!Array.isArray(x) || x.length > 1000) return null;
      const list = x.map((d) => (typeof d === "string" ? d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "") : ""));
      return list.every((d) => DOMAIN.test(d)) ? [...new Set(list)] : null;
    },
    (x) => (out.moderation.blockedDomains = x),
    "Enter sites like example.com, one per line.",
  );
  field(
    "moderation.blockedWords",
    mod.blockedWords,
    (x) => (Array.isArray(x) && x.length <= 1000 && x.every((w) => typeof w === "string" && w.trim().length > 0 && w.length <= 80) ? [...new Set((x as string[]).map((w) => w.trim().toLowerCase()))] : null),
    (x) => (out.moderation.blockedWords = x),
    "Enter words of up to 80 characters.",
  );

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: out };
}

/** Whether a member may create a group (phase 2): by the setting, their badges and the admin's chosen list. */
export function mayCreateGroups(settings: CommunitySettings, member: { id: number; hasBadge: boolean; admin: boolean }): boolean {
  if (member.admin) return true;
  if (settings.groups.creators === "everyone") return true;
  if (settings.groups.creators === "badge_holders") return member.hasBadge;
  return settings.groups.chosen.includes(member.id);
}
