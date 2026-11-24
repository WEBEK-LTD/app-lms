import type { CommunitySettings } from "./settings";

/** The filter's settings (`AdminSettings.spam_filter`). */
type FilterSettings = CommunitySettings["spam_filter"];

/**
 * 231 Yallapp Community: moderation (area C). Before a post appears (a
 * question, an answer, a tutorial, a comment) it passes the gate:
 *
 * - a new member's first posts (2 by default) wait for an admin's review;
 * - the spam and bad-link filter holds a post with a blocked or shortened
 *   link, a link to a bare IP address, too many links, a blocked word,
 *   shouting or a run of the same character, or the same text the member
 *   just posted.
 *
 * A held post waits in the admins' moderation queue; nothing is deleted by
 * the filter alone. Admins and the Yallapp Team are never held.
 */

/** Why a post was held, as the moderation queue lists it. */
export const HOLD_REASONS = ["new_member", "blocked_link", "short_link", "ip_link", "too_many_links", "blocked_word", "shouting", "repeated_characters", "duplicate", "reported"] as const;
export type HoldReason = (typeof HOLD_REASONS)[number];

/** Link shorteners: where they lead can't be seen, so a post with one is held. */
export const SHORT_LINK_DOMAINS = ["bit.ly", "tinyurl.com", "goo.gl", "t.co", "is.gd", "ow.ly", "buff.ly", "cutt.ly", "rb.gy", "shorturl.at", "tiny.cc", "rebrand.ly", "s.id", "v.gd", "lnkd.in"] as const;

/** The filter's own blocked words (the admin adds more in settings), whole words in any case. */
export const BUILT_IN_BLOCKED_WORDS = ["casino", "viagra", "cialis", "porn", "escort", "forex signals", "crypto giveaway", "free followers", "buy followers", "كازينو", "مراهنات", "kumar", "bahis"] as const;

/** The links in a text (with or without a scheme), as hosts and full addresses. */
export function linksIn(text: string): { url: string; host: string }[] {
  const out: { url: string; host: string }[] = [];
  const re = /\b((?:https?:\/\/)?(?:www\.)?((?:[a-z0-9-]+\.)+[a-z]{2,}|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?(?:\/[^\s<>"')\]]*)?)/gi;
  for (const m of text.matchAll(re)) {
    const raw = m[1]!;
    // A word with a dot ("e.g", "file.ts") isn't a link unless it has a scheme, www or a path, or ends in a known top-level domain.
    const host = m[2]!.toLowerCase();
    const schemed = /^(https?:\/\/|www\.)/i.test(raw) || raw.includes("/");
    const tld = host.split(".").pop()!;
    if (!schemed && !/^\d+$/.test(tld) && !COMMON_TLDS.has(tld)) continue;
    out.push({ url: raw, host: host.replace(/^www\./, "") });
  }
  return out;
}

const COMMON_TLDS = new Set(["com", "net", "org", "io", "co", "dev", "app", "me", "info", "biz", "xyz", "ly", "gl", "gd", "at", "cc", "id", "in", "tr", "sa", "ae", "eg", "uk", "de", "ru", "cn", "top", "site", "online", "shop", "store", "link", "click"]);

/** Whether `host` is `domain` or one of its subdomains. */
function under(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** The words and phrases a text contains from `list`, as whole words, case aside. */
function wordsIn(text: string, list: readonly string[]): string[] {
  const t = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  return list.filter((w) => t.includes(` ${w.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `));
}

/** What the filter finds in a text: the reasons to hold it (none: it may appear). */
export function spamReasons(text: string, settings: FilterSettings, recent: readonly string[] = []): HoldReason[] {
  const reasons = new Set<HoldReason>();
  const links = linksIn(text);
  for (const { host } of links) {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) reasons.add("ip_link");
    else if (SHORT_LINK_DOMAINS.some((d) => under(host, d))) reasons.add("short_link");
    else if (settings.blocked_domains.some((d) => under(host, d))) reasons.add("blocked_link");
  }
  // A site the admin blocked, however it is written (with or without a scheme, any ending).
  const lower = text.toLowerCase();
  if (settings.blocked_domains.some((d) => new RegExp(`(^|[^a-z0-9.-])([a-z0-9-]+\\.)*${d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9-])`).test(lower))) reasons.add("blocked_link");
  if (links.length > settings.max_links) reasons.add("too_many_links");
  if (wordsIn(text, [...BUILT_IN_BLOCKED_WORDS, ...settings.blocked_words]).length) reasons.add("blocked_word");
  // Shouting: a long text in capitals (Latin letters only: Arabic has no case).
  const latin = text.replace(/[^A-Za-z]/g, "");
  if (latin.length >= 30 && latin.replace(/[^A-Z]/g, "").length / latin.length > 0.8) reasons.add("shouting");
  if (/(.)\1{11,}/u.test(text.replace(/\s/g, ""))) reasons.add("repeated_characters");
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  if (norm(text).length >= 20 && recent.some((r) => norm(r) === norm(text))) reasons.add("duplicate");
  return [...reasons];
}

/** Who is posting, as the gate reads them. */
export interface Poster {
  /** Admins and the Yallapp Team are never held. */
  role: "member" | "admin" | "team";
  /** Their posts an admin approved or that appeared, so far. */
  publishedPosts: number;
}

export type GateResult = { status: "published" } | { status: "pending"; reasons: HoldReason[] };

/**
 * Whether a new post appears at once or waits for review: a new member's
 * first posts wait, and so does anything the filter holds.
 */
export function moderationGate(poster: Poster, text: string, settings: CommunitySettings, recent: readonly string[] = []): GateResult {
  if (poster.role !== "member") return { status: "published" };
  const reasons = settings.spam_filter.enabled ? spamReasons(text, settings.spam_filter, recent) : [];
  if (poster.publishedPosts < settings.first_posts_reviewed) reasons.unshift("new_member");
  return reasons.length ? { status: "pending", reasons } : { status: "published" };
}

/** The queue's cause for a held post (`ModerationItem.cause`): the filter's catch outranks being new. */
export function holdCause(reasons: readonly HoldReason[]): "first_posts" | "spam_filter" | "reports" {
  if (reasons.some((r) => r !== "new_member" && r !== "reported")) return "spam_filter";
  if (reasons.includes("new_member")) return "first_posts";
  return "reports";
}
