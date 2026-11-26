import { describe, expect, it } from "vitest";
import { DEFAULT_BLUE_RULES, canApplyForGold, heldBadges, reconcileAutoBadges, shownBadge, type MemberBadge, type MemberFacts } from "@/lib/community/trust/badges";
import { holdCause, linksIn, moderationGate, spamReasons } from "@/lib/community/trust/moderation";
import { BADGE_NAMES, DEFAULT_NOTIFICATION_PREFS, NOTIFICATION_KINDS, communityLang, emails, notificationEmail, notificationText, parsePrefs, prefsView } from "@/lib/community/trust/notifications";
import { idProofProblem, parseDecision, parseGrant, parseReason, parseReport, parseVerificationForm, verificationBlocked } from "@/lib/community/trust/requests";
import { DEFAULT_COMMUNITY_SETTINGS, blueRulesOf, mayCreateGroups, parseSettings, settingsOf } from "@/lib/community/trust/settings";

/**
 * 231 Yallapp Community, area C: the rules behind badges, verification,
 * settings, moderation, reports and notifications, as the brief sets them.
 */

const NOW = new Date("2026-11-24T12:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
const M5 = "00000000-0000-4000-8000-000000000005";
const M6 = "00000000-0000-4000-8000-000000000006";

const badge = (over: Partial<MemberBadge>): MemberBadge => ({ id: "b1", memberId: "m7", badge: "blue", source: "auto", reason: null, grantedAt: ago(10), grantedBy: null, expiresAt: null, revokedAt: null, revokedBy: null, revokeReason: null, details: null, ...over });

const facts = (over: Partial<MemberFacts> = {}): MemberFacts => ({
  joinedAt: ago(61),
  points: 1000,
  acceptedAnswers: 20,
  approvedTutorials: 0,
  lastViolationAt: null,
  lastActiveAt: ago(1),
  linked: null,
  ...over,
});

describe("231 badges: only the highest shows, every one held is listed", () => {
  it("shows Gold over Green over Blue, whatever the order they were earned", () => {
    const list = [badge({ id: "1", badge: "blue" }), badge({ id: "2", badge: "green" }), badge({ id: "3", badge: "gold", source: "request" })];
    expect(shownBadge(list, NOW)).toBe("gold");
    expect(heldBadges(list, NOW).map((b) => b.badge)).toEqual(["gold", "green", "blue"]);
    expect(shownBadge([badge({ badge: "blue" }), badge({ id: "2", badge: "green" })], NOW)).toBe("green");
    expect(shownBadge([], NOW)).toBeNull();
  });

  it("leaves out a revoked badge and one past its expiry", () => {
    expect(shownBadge([badge({ badge: "gold", source: "manual", expiresAt: ago(1) }), badge({ id: "2", badge: "blue" })], NOW)).toBe("blue");
    expect(shownBadge([badge({ badge: "gold", revokedAt: ago(2) })], NOW)).toBeNull();
    expect(shownBadge([badge({ badge: "gold", source: "manual", expiresAt: new Date(NOW.getTime() + DAY) })], NOW)).toBe("gold");
  });
});

describe("231 Gold: apply only with 5 or more apps from the linked Yallapp account", () => {
  it("shows Apply from 5 apps (templates count, as the linked account reports them)", () => {
    expect(canApplyForGold({ linked: null })).toBe(false);
    expect(canApplyForGold({ linked: { apps: 4, paid: null } })).toBe(false);
    expect(canApplyForGold({ linked: { apps: 5, paid: null } })).toBe(true);
  });

  it("says why a member can't apply", () => {
    expect(verificationBlocked({ linked: null }, { holdsGold: false, pending: false })).toBe("no_linked_account");
    expect(verificationBlocked({ linked: { apps: 2, paid: null } }, { holdsGold: false, pending: false })).toBe("not_eligible");
    expect(verificationBlocked({ linked: { apps: 9, paid: null } }, { holdsGold: false, pending: true })).toBe("already_pending");
    expect(verificationBlocked({ linked: { apps: 9, paid: null } }, { holdsGold: true, pending: false })).toBe("already_gold");
    expect(verificationBlocked({ linked: { apps: 9, paid: null } }, { holdsGold: false, pending: false })).toBeNull();
  });

  it("takes a full name and up to 5 links; the ID proof a JPEG, PNG or PDF up to 5 MB", () => {
    expect(parseVerificationForm({ full_name: "  Nour   El Hoda ", portfolio_links: ["https://nour.dev", "https://nour.dev"] })).toEqual({ ok: true, value: { fullName: "Nour El Hoda", portfolioLinks: ["https://nour.dev"] } });
    const bad = parseVerificationForm({ full_name: "Nour", portfolio_links: ["ftp://x.com", "a", "b", "c", "d", "e"] });
    expect(bad.ok).toBe(false);
    expect(Object.keys((bad as { errors: object }).errors).sort()).toEqual(["full_name", "portfolio_links"]);
    expect(idProofProblem({ type: "image/jpeg", size: 300_000 })).toBeNull();
    expect(idProofProblem({ type: "application/pdf", size: 5 * 1024 * 1024 })).toBeNull();
    expect(idProofProblem({ type: "image/gif", size: 300 })).toMatch(/JPEG/);
    expect(idProofProblem({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/);
    expect(idProofProblem(null)).toMatch(/Upload/);
  });

  it("an admin's decision comes with a reason the member is told", () => {
    expect(parseDecision({ decision: "approve", reason: "Five live apps, ID checked." })).toEqual({ ok: true, value: { approve: true, reason: "Five live apps, ID checked." } });
    expect(parseDecision({ decision: "approve" }).ok).toBe(false);
    expect(parseDecision({ decision: "reject" }).ok).toBe(false);
    expect(parseDecision({ decision: "maybe", reason: "xyz" }).ok).toBe(false);
  });
});

describe("231 Blue: automatic by the admin's rules, gone after 90 days without activity, back when active", () => {
  const rules = DEFAULT_BLUE_RULES;

  it("defaults to 60 days, 1,000 points, 20 accepted answers or 10 tutorials, and no violation in 90 days", () => {
    expect(rules).toMatchObject({ minAccountDays: 60, minPoints: 1000, minAcceptedAnswers: 20, minApprovedTutorials: 10, cleanDays: 90, inactiveDays: 90 });
    expect(blueRulesOf(DEFAULT_COMMUNITY_SETTINGS)).toEqual(rules);
  });

  it("is granted when every rule holds, tutorials standing in for answers", () => {
    expect(reconcileAutoBadges([], facts(), rules, NOW).grant).toEqual([{ badge: "blue" }]);
    expect(reconcileAutoBadges([], facts({ acceptedAnswers: 3, approvedTutorials: 10 }), rules, NOW).grant).toEqual([{ badge: "blue" }]);
    for (const over of [{ joinedAt: ago(59) }, { points: 999 }, { acceptedAnswers: 19, approvedTutorials: 9 }, { lastViolationAt: ago(30) }]) {
      expect(reconcileAutoBadges([], facts(over), rules, NOW).grant, JSON.stringify(over)).toEqual([]);
    }
  });

  it("goes after 90 days without activity and comes back once active", () => {
    const held = [badge({ id: "b5", badge: "blue" })];
    expect(reconcileAutoBadges(held, facts({ lastActiveAt: ago(91) }), rules, NOW).revoke).toEqual([{ id: "b5", badge: "blue", reason: "inactive" }]);
    const revoked = [badge({ id: "b5", badge: "blue", revokedAt: ago(5) })];
    expect(reconcileAutoBadges(revoked, facts({ lastActiveAt: ago(0) }), rules, NOW).grant).toEqual([{ badge: "blue" }]);
  });

  it("follows the admin's edited rules", () => {
    const edited = blueRulesOf(settingsOf({ blue_badge: { min_points: 5000 } }));
    expect(reconcileAutoBadges([], facts(), edited, NOW).grant).toEqual([]);
    expect(reconcileAutoBadges([], facts({ points: 5000 }), edited, NOW).grant).toEqual([{ badge: "blue" }]);
  });
});

describe("231 Green: while the linked account has an app on a paid plan", () => {
  it("is granted with the company and the app's link, and goes when the plan lapses", () => {
    const business = { companyName: "Nour Studio", appUrl: "https://apps.apple.com/app/id1" };
    const paid = facts({ points: 0, linked: { apps: 1, paid: business } });
    expect(reconcileAutoBadges([], paid, DEFAULT_BLUE_RULES, NOW).grant).toEqual([{ badge: "green", details: business }]);
    const lapsed = facts({ points: 0, linked: { apps: 1, paid: null } });
    expect(reconcileAutoBadges([badge({ id: "b9", badge: "green" })], lapsed, DEFAULT_BLUE_RULES, NOW).revoke).toEqual([{ id: "b9", badge: "green", reason: "plan_lapsed" }]);
  });
});

describe("231 admin overrides: any badge to anyone, never taken by the automatic rules", () => {
  it("keeps a manual Blue or Green whatever the rules say (it ends only at its own expiry or by an admin)", () => {
    const manual = [badge({ id: "3", badge: "blue", source: "manual", reason: "Community moderator" }), badge({ id: "4", badge: "green", source: "manual", reason: "Partner" })];
    const nothing = facts({ points: 0, lastActiveAt: ago(400), linked: null });
    expect(reconcileAutoBadges(manual, nothing, DEFAULT_BLUE_RULES, NOW)).toEqual({ grant: [], revoke: [] });
  });

  it("a grant needs a private reason and takes an optional future expiry, and Green its company and app; a revoke needs a reason", () => {
    expect(parseGrant({ badge: "gold", reason: "Core contributor" }, NOW)).toEqual({ ok: true, value: { badge: "gold", reason: "Core contributor", expiresAt: null, details: null } });
    expect(parseGrant({ badge: "green", reason: "Partner studio", company_name: "Kaya Apps", app_url: "https://kaya.app" }, NOW)).toMatchObject({ ok: true, value: { details: { companyName: "Kaya Apps", appUrl: "https://kaya.app" } } });
    expect(parseGrant({ badge: "gold", reason: "x" }, NOW).ok).toBe(false);
    expect(parseGrant({ badge: "gold", reason: "Event speaker", expires_at: ago(1).toISOString() }, NOW).ok).toBe(false);
    expect(parseGrant({ badge: "silver", reason: "Nope" }, NOW).ok).toBe(false);
    expect(parseReason({ reason: "Misused the badge" }).ok).toBe(true);
    expect(parseReason({}).ok).toBe(false);
  });
});

describe("231 settings: Blue's rules, who can create groups (default everyone), the filter", () => {
  it("starts at the brief's defaults and keeps the rest when one field changes", () => {
    expect(DEFAULT_COMMUNITY_SETTINGS).toMatchObject({ groups_create_policy: "everyone", first_posts_reviewed: 2, spam_filter: { enabled: true, max_links: 3 } });
    const changed = parseSettings({ groups_create_policy: "badge_holders" }, DEFAULT_COMMUNITY_SETTINGS);
    expect(changed.ok && changed.value.groups_create_policy).toBe("badge_holders");
    expect(changed.ok && changed.value.blue_badge).toEqual(DEFAULT_COMMUNITY_SETTINGS.blue_badge);
  });

  it("refuses what doesn't make sense, and reads a broken stored value as its default", () => {
    const bad = parseSettings({ blue_badge: { min_points: -1 }, groups_create_policy: "nobody", spam_filter: { blocked_domains: ["not a domain"] } }, DEFAULT_COMMUNITY_SETTINGS);
    expect(bad.ok).toBe(false);
    expect(Object.keys((bad as { errors: object }).errors).sort()).toEqual(["blue_badge.min_points", "groups_create_policy", "spam_filter.blocked_domains"]);
    expect(settingsOf({ blue_badge: { min_points: "lots" } }).blue_badge.min_points).toBe(1000);
    expect(parseSettings({ spam_filter: { blocked_domains: ["https://www.Spam.example/path"] } }, DEFAULT_COMMUNITY_SETTINGS)).toMatchObject({ ok: true, value: { spam_filter: { blocked_domains: ["spam.example"] } } });
  });

  it("who can create groups: everyone, badge holders, or the chosen people (admins always)", () => {
    const member = { id: M5, hasBadge: false, admin: false };
    expect(mayCreateGroups(DEFAULT_COMMUNITY_SETTINGS, member)).toBe(true);
    const holders = settingsOf({ groups_create_policy: "badge_holders" });
    expect(mayCreateGroups(holders, member)).toBe(false);
    expect(mayCreateGroups(holders, { ...member, hasBadge: true })).toBe(true);
    const chosen = settingsOf({ groups_create_policy: "chosen", groups_create_members: [M5] });
    expect(mayCreateGroups(chosen, member)).toBe(true);
    expect(mayCreateGroups(chosen, { ...member, id: M6 })).toBe(false);
    expect(mayCreateGroups(chosen, { ...member, id: M6, admin: true })).toBe(true);
  });
});

describe("231 moderation: a new member's first 2 posts wait, and the spam and bad-link filter", () => {
  const settings = DEFAULT_COMMUNITY_SETTINGS;
  const member = (published: number) => ({ role: "member" as const, publishedPosts: published });

  it("holds a new member's first 2 posts, then lets clean posts through", () => {
    expect(moderationGate(member(0), "How do I add a splash screen?", settings)).toEqual({ status: "pending", reasons: ["new_member"] });
    expect(moderationGate(member(1), "How do I add a splash screen?", settings)).toEqual({ status: "pending", reasons: ["new_member"] });
    expect(moderationGate(member(2), "How do I add a splash screen?", settings)).toEqual({ status: "published" });
  });

  it("never holds admins or the Yallapp Team", () => {
    expect(moderationGate({ role: "team", publishedPosts: 0 }, "See https://bit.ly/x", settings)).toEqual({ status: "published" });
    expect(moderationGate({ role: "admin", publishedPosts: 0 }, "x", settings)).toEqual({ status: "published" });
  });

  it("holds shortened, IP and blocked links, too many links, blocked words, shouting, repeats and duplicates", () => {
    const filter = { ...settings.spam_filter, blocked_domains: ["spam.example"], blocked_words: ["cheap pills"] };
    expect(spamReasons("Look at https://bit.ly/abc", filter)).toEqual(["short_link"]);
    expect(spamReasons("Go to http://192.168.1.10/login", filter)).toEqual(["ip_link"]);
    expect(spamReasons("Visit shop.spam.example now", filter)).toEqual(["blocked_link"]);
    expect(spamReasons("a.com b.com c.com d.com", filter)).toEqual(["too_many_links"]);
    expect(spamReasons("Get CHEAP pills here", filter)).toEqual(["blocked_word"]);
    expect(spamReasons("THIS IS THE BEST APP BUILDER EVER BUY NOW PLEASE", filter)).toEqual(["shouting"]);
    expect(spamReasons("hellooooooooooooooo", filter)).toEqual(["repeated_characters"]);
    expect(spamReasons("The same long question posted again", filter, ["the same long  question posted again"])).toEqual(["duplicate"]);
    expect(moderationGate(member(10), "مرحبا، أين أجد إعدادات الألوان؟ راجع yallapp.com.tr/docs", settings)).toEqual({ status: "published" });
  });

  it("the filter turned off holds only the first posts; the queue's cause names why", () => {
    const off = settingsOf({ spam_filter: { enabled: false } });
    expect(moderationGate(member(5), "https://bit.ly/x", off)).toEqual({ status: "published" });
    expect(moderationGate(member(0), "https://bit.ly/x", off)).toEqual({ status: "pending", reasons: ["new_member"] });
    expect(holdCause(["new_member"])).toBe("first_posts");
    expect(holdCause(["new_member", "short_link"])).toBe("spam_filter");
    expect(holdCause(["reported"])).toBe("reports");
  });

  it("finds links with or without a scheme, but not dotted words", () => {
    expect(linksIn("see https://Docs.Yallapp.com.tr/a and www.example.org, e.g. main.dart").map((l) => l.host)).toEqual(["docs.yallapp.com.tr", "example.org"]);
  });
});

describe("231 reports", () => {
  it("names what and why, with a note for 'other'", () => {
    expect(parseReport({ target_type: "answer", target_id: "a31", reason: "spam" })).toEqual({ ok: true, value: { targetType: "answer", targetId: "a31", reason: "spam", note: "" } });
    expect(parseReport({ target_type: "answer", target_id: "a31", reason: "other" }).ok).toBe(false);
    expect(parseReport({ target_type: "group", target_id: "g1", reason: "spam" }).ok).toBe(false);
    expect(parseReport({ target_type: "member", target_id: "m1", reason: "rude" }).ok).toBe(false);
  });
});

describe("231 notifications: the list always, email for what matters unless turned off, in en, ar or tr", () => {
  it("emails the important kinds by default and follows the member's choices", () => {
    expect(emails("verification_rejected", DEFAULT_NOTIFICATION_PREFS)).toBe(true);
    expect(emails("follow", DEFAULT_NOTIFICATION_PREFS)).toBe(false);
    expect(emails("verification_rejected", { verification_rejected: false })).toBe(false);
    expect(emails("follow", { follow: true })).toBe(true);
    expect(parsePrefs({ email: { nope: true } }, DEFAULT_NOTIFICATION_PREFS).ok).toBe(false);
    expect(parsePrefs({ email: { follow: "yes" } }, DEFAULT_NOTIFICATION_PREFS).ok).toBe(false);
    const view = prefsView({ answer: false });
    expect(Object.keys(view).sort()).toEqual([...NOTIFICATION_KINDS].sort());
    expect(view).toMatchObject({ answer: false, answer_accepted: true, follow: false });
  });

  it("has every kind in English, Arabic and Turkish, English by default", () => {
    const data = { actor: "Nour", title: "Splash screen", badge: "gold" as const, reason: "Blurry ID", count: 10 };
    for (const kind of NOTIFICATION_KINDS) for (const lang of ["en", "ar", "tr"] as const) expect(notificationText(kind, data, lang).length, `${kind} ${lang}`).toBeGreaterThan(5);
    expect(notificationText("badge_granted", data, "ar")).toContain(BADGE_NAMES.ar.gold);
    expect(notificationText("verification_rejected", data, "tr")).toContain("Blurry ID");
    expect(communityLang("fr-FR")).toBe("en");
    expect(communityLang("ar-SA")).toBe("ar");
  });

  it("emails in the member's language with a link back, right to left in Arabic, the text escaped", () => {
    const mail = notificationEmail("answer", { actor: "<b>Ali</b>", title: "Push" }, "ar", "https://community.yallapp.com.tr/q/1", null);
    expect(mail.subject).toContain("Push");
    expect(mail.text).toContain("https://community.yallapp.com.tr/q/1");
    expect(mail.html).toContain('dir="rtl"');
    expect(mail.html).not.toContain("<b>Ali</b>");
  });
});
