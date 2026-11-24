import { beforeEach, describe, expect, it } from "vitest";
import type { LinkedApp } from "@/lib/community/trust/requests";
import * as T from "@/lib/community/trust/service";
import { MemoryTrustStore, type ContentKind } from "@/lib/community/trust/store";

/**
 * 231 Yallapp Community, area C: the service end to end over the memory
 * store, with the other areas (members, posts, stats, the linked Yallapp
 * account), private files and email faked.
 */

const DAY = 86_400_000;
let clock = new Date("2026-11-24T12:00:00Z");
const ADMIN = "00000000-0000-4000-8000-0000000000a1";
const NOUR = "00000000-0000-4000-8000-0000000000b2";
const ALI = "00000000-0000-4000-8000-0000000000c3";
const TEAM = "00000000-0000-4000-8000-0000000000d4";

let members: Map<string, T.TrustMember>;
let stats: Map<string, { points: number; acceptedAnswers: number; approvedTutorials: number; lastActiveAt: Date | null }>;
let linked: Map<string, T.LinkedAccount>;
let posts: Map<string, { authorId: string; title: string; status: "pending" | "published" | "hidden" }>;
let files: Map<string, { bytes: Uint8Array; type: string }>;
let mails: { to: string; subject: string; text: string; html: string }[];
let deps: T.TrustDeps;

const apps = (n: number): LinkedApp[] => Array.from({ length: n }, (_, i) => ({ appId: `app${i + 1}`, name: `App ${i + 1}`, iconUrl: null, appStoreUrl: null, playStoreUrl: null, fromTemplate: i === 0, paidPlan: false }));
const post = (kind: ContentKind, id: string, authorId: string, title: string, status: "pending" | "published" = "pending") => posts.set(`${kind}:${id}`, { authorId, title, status });
/** An upload: its declared type and size, and its bytes (a real JPEG's or PDF's first bytes unless said). */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46]);
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const idProof = (type = "image/jpeg", size = 200_000, bytes: Uint8Array = type === "application/pdf" ? PDF : JPEG) => ({ type, size, bytes: async () => bytes });
const ok = <T,>(x: T | T.Fail): T => {
  if (T.isFail(x)) throw new Error(`${x.code}: ${x.message}`);
  return x as T;
};

beforeEach(() => {
  clock = new Date("2026-11-24T12:00:00Z");
  const joined = new Date(clock.getTime() - 100 * DAY);
  const m = (id: string, displayName: string, role: T.TrustMember["role"], language: string, email: string | null): T.TrustMember => ({ id, displayName, role, status: "active", language, email, createdAt: joined, approvedPosts: 0 });
  members = new Map([
    [ADMIN, m(ADMIN, "Admin", "admin", "en", "admin@community.test")],
    [NOUR, m(NOUR, "Nour", "member", "ar", "nour@community.test")],
    [ALI, m(ALI, "Ali", "member", "tr", null)],
    [TEAM, m(TEAM, "Yallapp Team", "team", "en", null)],
  ]);
  stats = new Map();
  linked = new Map();
  posts = new Map();
  files = new Map();
  mails = [];
  deps = {
    store: new MemoryTrustStore(),
    now: () => clock,
    member: async (id) => members.get(id) ?? null,
    // The admin's linked Yallapp account is a platform admin.
    platformAdmin: async (id) => id === ADMIN,
    countApprovedPost: async (id) => void (members.get(id)!.approvedPosts += 1),
    setMemberStatus: async (id, status) => void (members.get(id)!.status = status),
    stats: async (id) => stats.get(id) ?? { points: 0, acceptedAnswers: 0, approvedTutorials: 0, lastActiveAt: null },
    linked: async (id) => linked.get(id) ?? null,
    content: {
      info: async (kind, id) => {
        const p = posts.get(`${kind}:${id}`);
        return p ? { authorId: p.authorId, title: p.title, link: `/q/${id}` } : null;
      },
      setStatus: async (kind, id, status) => {
        const p = posts.get(`${kind}:${id}`);
        if (p) p.status = status;
      },
    },
    files: {
      put: async (key, bytes, type) => void files.set(key, { bytes, type }),
      link: async (key, seconds) => `https://files.test/${key}?expires=${seconds}`,
    },
    sendMail: async (mail) => void mails.push(mail),
    siteUrl: "https://community.yallapp.com.tr",
    logoUrl: null,
  };
});

describe("231 Gold: the verification form, an admin's decision, the member told either way", () => {
  it("can apply only from 5 linked apps, and the form lists those apps (never typed by the member)", async () => {
    expect(await T.verificationState(deps, NOUR)).toMatchObject({ yallappLinked: false, canApply: false, appCount: 0, requiredApps: 5, request: null });
    linked.set(NOUR, { apps: apps(4), business: null });
    expect(await T.verificationState(deps, NOUR)).toMatchObject({ yallappLinked: true, canApply: false, appCount: 4 });
    expect(await T.submitVerification(deps, NOUR, { full_name: "Nour El Hoda", idProof: idProof() })).toMatchObject({ ok: false, status: 403, code: "not_eligible" });
    linked.set(NOUR, { apps: apps(5), business: null });
    const state = await T.verificationState(deps, NOUR);
    expect(state.canApply).toBe(true);
    expect(state.apps.map((a) => a.name)).toEqual(["App 1", "App 2", "App 3", "App 4", "App 5"]);
  });

  it("keeps the ID proof private; approval gives Gold, logs it and tells the member in their language by email", async () => {
    linked.set(NOUR, { apps: apps(6), business: null });
    const sent = ok(await T.submitVerification(deps, NOUR, { full_name: "Nour El Hoda", portfolio_links: ["https://nour.dev"], idProof: idProof() }));
    const request = sent.state.request!;
    expect(request).toMatchObject({ status: "pending", fullName: "Nour El Hoda", portfolioLinks: ["https://nour.dev"] });
    expect(request.apps).toHaveLength(6);
    expect([...files.keys()]).toEqual([request.idProofKey]);
    expect(request.idProofKey).toMatch(new RegExp(`^community/id-proof/${NOUR}/[0-9a-f-]{36}\\.jpg$`));
    expect(await T.submitVerification(deps, NOUR, { full_name: "Nour El Hoda", idProof: idProof() })).toMatchObject({ ok: false, status: 409, code: "already_pending" });
    expect(await T.idProofLink(deps, NOUR, request.id)).toMatchObject({ ok: false, status: 403 });
    expect(ok(await T.idProofLink(deps, ADMIN, request.id)).url).toContain("expires=300");
    expect(await T.decideVerification(deps, NOUR, request.id, { decision: "approve", reason: "Looks good" })).toMatchObject({ ok: false, status: 403 });
    ok(await T.decideVerification(deps, ADMIN, request.id, { decision: "approve", reason: "Six live apps, ID checked." }));
    expect(await T.memberBadges(deps, NOUR, "en")).toMatchObject({ top: "gold", badges: [{ kind: "gold", label: "Pro Developer" }] });
    const log = ok(await T.auditLog(deps, ADMIN, { memberId: NOUR }));
    expect(log.page.items[0]).toMatchObject({ action: "verification.approve", actorId: ADMIN, targetType: "verification", targetId: request.id });
    expect(mails.at(-1)).toMatchObject({ to: "nour@community.test" });
    expect(mails.at(-1)!.html).toContain('dir="rtl"');
    expect(await T.decideVerification(deps, ADMIN, request.id, { decision: "reject", reason: "Again" })).toMatchObject({ ok: false, code: "already_decided" });
    expect(await T.verificationState(deps, NOUR)).toMatchObject({ hasGold: true, canApply: false });
  });

  it("refuses a bad file or form; a rejection's reason reaches the member, who may apply again", async () => {
    linked.set(NOUR, { apps: apps(5), business: null });
    expect(await T.submitVerification(deps, NOUR, { full_name: "Nour", idProof: idProof("image/gif") })).toMatchObject({ ok: false, status: 400, errors: { full_name: expect.any(String), id_proof: expect.any(String) } });
    expect(files.size).toBe(0);
    const r = ok(await T.submitVerification(deps, NOUR, { full_name: "Nour El Hoda", idProof: idProof("application/pdf") })).state.request!;
    ok(await T.decideVerification(deps, ADMIN, r.id, { decision: "reject", reason: "The ID photo is unreadable." }));
    expect((await T.verificationState(deps, NOUR)).request).toMatchObject({ status: "rejected", reason: "The ID photo is unreadable." });
    expect((await T.memberBadges(deps, NOUR)).top).toBeNull();
    const list = await T.listNotifications(deps, NOUR);
    expect(list.page.items[0]).toMatchObject({ kind: "verification_rejected", read: false, link: "/verify" });
    expect(list.page.items[0]!.text).toContain("The ID photo is unreadable.");
    expect((await T.verificationState(deps, NOUR)).canApply).toBe(true);
  });
});

describe("231 admin overrides and the audit log", () => {
  it("grants any badge with a private reason and optional expiry, revokes with a reason, logging who, when and why", async () => {
    const g = ok(await T.grantBadge(deps, ADMIN, ALI, { badge: "gold", reason: "Core contributor", expires_at: new Date(clock.getTime() + 30 * DAY).toISOString() }));
    expect(g.badge).toMatchObject({ source: "manual", grantedBy: ADMIN, reason: "Core contributor" });
    expect((await T.memberBadges(deps, ALI)).top).toBe("gold");
    // The private reason is never in what members see.
    expect(JSON.stringify(await T.memberBadges(deps, ALI))).not.toContain("Core contributor");
    expect(await T.revokeBadge(deps, ADMIN, ALI, "gold", {})).toMatchObject({ ok: false, status: 400 });
    expect(await T.revokeBadge(deps, ADMIN, ALI, "blue", { reason: "Nothing to take" })).toMatchObject({ ok: false, status: 404 });
    ok(await T.revokeBadge(deps, ADMIN, ALI, "gold", { reason: "Misused the badge" }));
    expect((await T.memberBadges(deps, ALI)).top).toBeNull();
    const log = ok(await T.auditLog(deps, ADMIN, { memberId: ALI }));
    expect(log.page.items.map((e) => [e.action, e.actorId, e.reason])).toEqual([
      ["badge.revoke", ADMIN, "Misused the badge"],
      ["badge.grant", ADMIN, "Core contributor"],
    ]);
    expect(ok(await T.adminMemberBadges(deps, ADMIN, ALI)).badges[0]).toMatchObject({ badge: "gold", revokeReason: "Misused the badge" });
    expect(await T.grantBadge(deps, NOUR, ALI, { badge: "blue", reason: "Friend" })).toMatchObject({ ok: false, status: 403 });
  });

  it("an admin's Green carries the company and app; a badge an admin granted outlives the rules and ends at its expiry", async () => {
    ok(await T.grantBadge(deps, ADMIN, ALI, { badge: "green", reason: "Partner studio", company_name: "Kaya Apps", app_url: "https://kaya.app" }));
    expect((await T.memberBadges(deps, ALI, "tr")).badges[0]).toMatchObject({ kind: "green", label: "Doğrulanmış İşletme", companyName: "Kaya Apps", appUrl: "https://kaya.app" });
    ok(await T.grantBadge(deps, ADMIN, NOUR, { badge: "blue", reason: "Event host", expires_at: new Date(clock.getTime() + 10 * DAY).toISOString() }));
    expect(await T.refreshAutoBadges(deps, NOUR)).toEqual({ granted: [], revoked: [] });
    expect(await T.refreshAutoBadges(deps, ALI)).toEqual({ granted: [], revoked: [] });
    clock = new Date(clock.getTime() + 11 * DAY);
    expect((await T.memberBadges(deps, NOUR)).top).toBeNull();
  });

  it("suspends a member (a violation) and restores them, with a reason, logged", async () => {
    expect(await T.setStatus(deps, ADMIN, NOUR, { status: "suspended" })).toMatchObject({ ok: false, status: 400 });
    ok(await T.setStatus(deps, ADMIN, NOUR, { status: "suspended", reason: "Repeated spam" }));
    expect(members.get(NOUR)!.status).toBe("suspended");
    expect(await deps.store.lastViolationAt(NOUR)).toEqual(clock);
    ok(await T.setStatus(deps, ADMIN, NOUR, { status: "active", reason: "Appeal accepted" }));
    expect(ok(await T.auditLog(deps, ADMIN, { memberId: NOUR })).page.items.map((e) => e.action)).toEqual(["member.restore", "member.suspend"]);
    expect(await T.setStatus(deps, ADMIN, ADMIN, { status: "suspended", reason: "Testing" })).toMatchObject({ ok: false });
  });
});

describe("231 automatic badges: Blue and Green follow the rules, logged with no admin", () => {
  it("grants Blue when the rules hold and takes it after 90 days without activity", async () => {
    stats.set(NOUR, { points: 1200, acceptedAnswers: 25, approvedTutorials: 0, lastActiveAt: clock });
    expect(await T.refreshAutoBadges(deps, NOUR)).toEqual({ granted: ["blue"], revoked: [] });
    clock = new Date(clock.getTime() + 91 * DAY);
    expect(await T.refreshAutoBadges(deps, NOUR)).toEqual({ granted: [], revoked: ["blue"] });
    stats.set(NOUR, { points: 1200, acceptedAnswers: 25, approvedTutorials: 0, lastActiveAt: clock });
    expect(await T.refreshAutoBadges(deps, NOUR)).toEqual({ granted: ["blue"], revoked: [] });
    const log = ok(await T.auditLog(deps, ADMIN, { memberId: NOUR }));
    expect(log.page.items.map((e) => [e.action, e.actorId, e.reason])).toEqual([
      ["badge.auto_grant", null, null],
      ["badge.auto_revoke", null, "inactive"],
      ["badge.auto_grant", null, null],
    ]);
  });

  it("Green shows the company and app link while a paid plan lasts", async () => {
    const business = { companyName: "Kaya Apps", appUrl: "https://play.google.com/store/apps/details?id=x" };
    linked.set(ALI, { apps: apps(1), business });
    await T.refreshAutoBadges(deps, ALI);
    expect((await T.memberBadges(deps, ALI, "tr")).badges).toEqual([{ kind: "green", label: "Doğrulanmış İşletme", since: clock, ...business }]);
    linked.set(ALI, { apps: apps(1), business: null });
    expect((await T.refreshAutoBadges(deps, ALI)).revoked).toEqual(["green"]);
  });
});

describe("231 settings", () => {
  it("only admins read and change them, every change logged with before and after", async () => {
    expect((await T.getSettings(deps)).groups_create_policy).toBe("everyone");
    expect(await T.adminSettings(deps, NOUR)).toMatchObject({ ok: false, status: 403 });
    expect(await T.updateSettings(deps, NOUR, { groups_create_policy: "chosen" })).toMatchObject({ ok: false, status: 403 });
    expect(await T.updateSettings(deps, ADMIN, { blue_badge: { min_points: -5 } })).toMatchObject({ ok: false, errors: { "blue_badge.min_points": expect.any(String) } });
    ok(await T.updateSettings(deps, ADMIN, { groups_create_policy: "chosen", groups_create_members: [ALI] }));
    expect(await T.canCreateGroups(deps, ALI)).toBe(true);
    expect(await T.canCreateGroups(deps, NOUR)).toBe(false);
    const entry = ok(await T.auditLog(deps, ADMIN, { action: "settings.update" })).page.items[0]!;
    expect((entry.details as { before: { groups_create_policy: string } }).before.groups_create_policy).toBe("everyone");
    expect((entry.details as { after: { groups_create_policy: string } }).after.groups_create_policy).toBe("chosen");
  });
});

describe("231 moderation: the queue", () => {
  it("holds a new member's first 2 posts; approving shows them; the third appears at once", async () => {
    post("question", "q10", NOUR, "Splash screen?");
    post("answer", "a11", NOUR, "Try the theme settings");
    expect(await T.moderateNew(deps, { memberId: NOUR, targetType: "question", targetId: "q10", text: "How do I change the splash screen?" })).toEqual({ status: "pending", reasons: ["new_member"] });
    expect(await T.moderateNew(deps, { memberId: NOUR, targetType: "answer", targetId: "a11", text: "Try the theme settings in Studio." })).toEqual({ status: "pending", reasons: ["new_member"] });
    const queue = ok(await T.moderationQueue(deps, ADMIN, {}));
    expect(queue.page.items.map((i) => [i.preview, i.cause, i.status])).toEqual([
      ["Splash screen?", "first_posts", "open"],
      ["Try the theme settings", "first_posts", "open"],
    ]);
    for (const item of queue.page.items) ok(await T.decideModeration(deps, ADMIN, item.id, { decision: "approve" }));
    expect(posts.get("question:q10")!.status).toBe("published");
    expect(members.get(NOUR)!.approvedPosts).toBe(2);
    expect((await T.listNotifications(deps, NOUR)).page.items[0]!.kind).toBe("post_approved");
    expect(await T.moderateNew(deps, { memberId: NOUR, targetType: "question", targetId: "q12", text: "Which fonts can I use in the app?" })).toEqual({ status: "published" });
    expect(members.get(NOUR)!.approvedPosts).toBe(3);
  });

  it("removing hides the post, records a violation and tells the member why", async () => {
    post("answer", "a20", ALI, "Cheap followers");
    await T.moderateNew(deps, { memberId: ALI, targetType: "answer", targetId: "a20", text: "buy followers at https://bit.ly/zzz" });
    const item = ok(await T.moderationQueue(deps, ADMIN, {})).page.items[0]!;
    expect(item).toMatchObject({ cause: "spam_filter", note: "new_member, short_link, blocked_word" });
    expect(await T.decideModeration(deps, ADMIN, item.id, { decision: "reject" })).toMatchObject({ ok: false, status: 400 });
    ok(await T.decideModeration(deps, ADMIN, item.id, { decision: "remove", note: "Spam" }));
    expect(posts.get("answer:a20")!.status).toBe("hidden");
    expect(await deps.store.lastViolationAt(ALI)).toEqual(clock);
    // The member is told the post was removed; the moderator's note stays private.
    expect((await T.listNotifications(deps, ALI)).page.items[0]).toMatchObject({ kind: "post_removed", actorId: null });
    expect((await T.listNotifications(deps, ALI)).page.items[0]!.text).not.toContain("Spam");
    expect(ok(await T.moderationQueue(deps, ADMIN, { status: "removed" })).page.items).toHaveLength(1);
  });

  it("never holds the Yallapp Team; uses the member's recent posts for the duplicate check", async () => {
    expect(await T.moderateNew(deps, { memberId: TEAM, targetType: "answer", targetId: "a30", text: "Official: see the docs." })).toEqual({ status: "published" });
    members.get(NOUR)!.approvedPosts = 5;
    // Area B's recent posts include the new one (it is stored before moderation): alone, it is no repeat.
    deps.content.recentTexts = async () => ["How do I publish my app to the stores?"];
    expect(await T.moderateNew(deps, { memberId: NOUR, targetType: "question", targetId: "q31", text: "How do I publish my app to the stores?" })).toEqual({ status: "published" });
    deps.content.recentTexts = async () => ["How do I publish my app to the stores?", "Unrelated", "how do I publish my app to the  stores?"];
    expect(await T.moderateNew(deps, { memberId: NOUR, targetType: "question", targetId: "q32", text: "How do I publish my app to the stores?" })).toEqual({ status: "pending", reasons: ["duplicate"] });
  });
});

describe("231 reports", () => {
  it("once per member and target (409); enough reports hide a post; actioning closes them all and thanks each reporter", async () => {
    ok(await T.updateSettings(deps, ADMIN, { spam_filter: { hide_after_reports: 2 } }));
    post("answer", "a40", NOUR, "Rude answer", "published");
    expect(await T.report(deps, NOUR, { target_type: "answer", target_id: "a40", reason: "spam" })).toMatchObject({ ok: false, status: 400 });
    expect(await T.report(deps, ALI, { target_type: "answer", target_id: "nope", reason: "spam" })).toMatchObject({ ok: false, status: 404 });
    const first = ok(await T.report(deps, ALI, { target_type: "answer", target_id: "a40", reason: "harassment" }));
    expect(await T.report(deps, ALI, { target_type: "answer", target_id: "a40", reason: "spam" })).toMatchObject({ ok: false, status: 409, code: "already_reported" });
    expect(posts.get("answer:a40")!.status).toBe("published");
    ok(await T.report(deps, TEAM, { target_type: "answer", target_id: "a40", reason: "harassment" }));
    expect(posts.get("answer:a40")!.status).toBe("hidden");
    expect(ok(await T.moderationQueue(deps, ADMIN, {})).page.items[0]).toMatchObject({ cause: "reports", reportCount: 2 });
    expect(ok(await T.resolveReport(deps, ADMIN, first.id, { status: "actioned", note: "Removed" })).report.status).toBe("actioned");
    expect(ok(await T.listReports(deps, ADMIN, {})).page.items).toHaveLength(0);
    expect(ok(await T.listReports(deps, ADMIN, { status: "actioned" })).page.items).toHaveLength(2);
    expect((await T.listNotifications(deps, ALI)).page.items[0]!.kind).toBe("report_resolved");
    expect(await deps.store.lastViolationAt(NOUR)).toEqual(clock);
    expect(ok(await T.moderationQueue(deps, ADMIN, {})).page.items).toHaveLength(0);
  });

  it("dismissing brings back a post hidden by reports alone; a member can be reported too", async () => {
    ok(await T.updateSettings(deps, ADMIN, { spam_filter: { hide_after_reports: 1 } }));
    post("question", "q50", NOUR, "Fine question", "published");
    const r = ok(await T.report(deps, ALI, { target_type: "question", target_id: "q50", reason: "spam" }));
    expect(posts.get("question:q50")!.status).toBe("hidden");
    ok(await T.resolveReport(deps, ADMIN, r.id, { status: "dismissed" }));
    expect(posts.get("question:q50")!.status).toBe("published");
    expect(await deps.store.lastViolationAt(NOUR)).toBeNull();
    ok(await T.report(deps, NOUR, { target_type: "member", target_id: ALI, reason: "other", note: "Pretends to be the Yallapp Team" }));
  });
});

describe("231 notifications: the list, read marks, email by the member's choices", () => {
  it("lists newest first in the member's language, counts unread, marks the ones listed or all", async () => {
    await T.notify(deps, { memberId: NOUR, kind: "follow", actorId: ALI, data: { actor: "Ali" }, link: "/u/ali" });
    await T.notify(deps, { memberId: NOUR, kind: "answer", actorId: ALI, targetType: "question", targetId: "q12", data: { actor: "Ali", title: "Fonts?" }, link: "/q/12" });
    const list = await T.listNotifications(deps, NOUR);
    expect(list.unread).toBe(2);
    expect(list.page.items[0]).toMatchObject({ text: "أجاب Ali عن سؤالك «Fonts?».", targetType: "question", targetId: "q12", actorId: ALI });
    expect(await T.markRead(deps, NOUR, { ids: [list.page.items[0]!.id] })).toEqual({ ok: true, marked: 1 });
    expect((await T.listNotifications(deps, NOUR, { unreadOnly: true })).page.items).toHaveLength(1);
    expect(await T.markRead(deps, NOUR, {})).toEqual({ ok: true, marked: 1 });
    expect((await T.listNotifications(deps, NOUR)).unread).toBe(0);
  });

  it("emails what matters, not a follow; never without an email, nor for the member's own action, nor to a suspended member", async () => {
    await T.notify(deps, { memberId: NOUR, kind: "follow", actorId: ALI, data: { actor: "Ali" }, link: "/u/ali" });
    expect(mails).toHaveLength(0);
    await T.notify(deps, { memberId: NOUR, kind: "answer", actorId: ALI, data: { actor: "Ali", title: "Fonts?" }, link: "/q/12" });
    expect(mails).toHaveLength(1);
    expect(mails[0]!.text).toContain("https://community.yallapp.com.tr/q/12");
    await T.notify(deps, { memberId: ALI, kind: "answer", actorId: NOUR, data: { actor: "Nour", title: "x" }, link: "/q/1" });
    expect(mails).toHaveLength(1);
    await T.notify(deps, { memberId: NOUR, kind: "answer", actorId: NOUR, data: {}, link: "/q/1" });
    members.get(NOUR)!.status = "suspended";
    await T.notify(deps, { memberId: NOUR, kind: "answer", actorId: ALI, data: {}, link: "/q/1" });
    expect((await T.listNotifications(deps, NOUR)).page.items).toHaveLength(2);
  });

  it("follows the member's email choices, every kind listed with its state", async () => {
    expect((await T.getPrefs(deps, NOUR)).email).toMatchObject({ answer: true, follow: false });
    expect(ok(await T.updatePrefs(deps, NOUR, { email: { answer: false, follow: true } })).email).toMatchObject({ answer: false, follow: true });
    await T.notify(deps, { memberId: NOUR, kind: "answer", actorId: ALI, data: { actor: "Ali", title: "x" }, link: "/q/1" });
    expect(mails).toHaveLength(0);
    await T.notify(deps, { memberId: NOUR, kind: "follow", actorId: ALI, data: { actor: "Ali" }, link: "/u/ali" });
    expect(mails).toHaveLength(1);
    expect(await T.updatePrefs(deps, NOUR, { email: { nope: true } })).toMatchObject({ ok: false, status: 400 });
  });

  it("a failed email never fails what caused it", async () => {
    deps.sendMail = async () => {
      throw new Error("SMTP down");
    };
    await expect(T.notify(deps, { memberId: NOUR, kind: "answer", actorId: ALI, data: { actor: "Ali", title: "x" }, link: "/q/1" })).resolves.toBeUndefined();
    expect((await T.listNotifications(deps, NOUR)).page.items).toHaveLength(1);
  });
});

describe("231 the Community's staff: admins by their Yallapp account, moderators by an admin", () => {
  it("an admin is checked every time against the platform; a stored role means nothing", async () => {
    members.get(NOUR)!.role = "admin";
    expect(await T.staffRole(deps, NOUR)).toBeNull();
    expect(await T.adminSettings(deps, NOUR)).toMatchObject({ ok: false, status: 403 });
    expect(await T.staffRole(deps, ADMIN)).toBe("admin");
    deps.platformAdmin = async () => false;
    expect(await T.staffRole(deps, ADMIN)).toBeNull();
  });

  it("a moderator works the queue and reports, never badges or settings; granted and revoked with a reason, logged", async () => {
    expect(await T.grantModerator(deps, ADMIN, ALI, {})).toMatchObject({ ok: false, status: 400 });
    expect(await T.grantModerator(deps, NOUR, ALI, { reason: "Friend" })).toMatchObject({ ok: false, status: 403 });
    ok(await T.grantModerator(deps, ADMIN, ALI, { reason: "Answers every Turkish question" }));
    expect(await T.staffRole(deps, ALI)).toBe("moderator");
    expect(ok(await T.moderationQueue(deps, ALI, {})).page.items).toEqual([]);
    expect(ok(await T.listReports(deps, ALI, {})).page.items).toEqual([]);
    expect(await T.adminSettings(deps, ALI)).toMatchObject({ ok: false, status: 403 });
    expect(await T.grantBadge(deps, ALI, NOUR, { badge: "blue", reason: "Nice" })).toMatchObject({ ok: false, status: 403 });
    expect(await T.listModerators(deps, ALI)).toMatchObject({ ok: false, status: 403 });
    expect(ok(await T.listModerators(deps, ADMIN)).moderators).toEqual([expect.objectContaining({ memberId: ALI, grantedBy: ADMIN, reason: "Answers every Turkish question" })]);
    // Staff are never held by moderation.
    expect(await T.moderateNew(deps, { memberId: ALI, targetType: "question", targetId: "q60", text: "A first question from a moderator" })).toEqual({ status: "published" });
    ok(await T.revokeModerator(deps, ADMIN, ALI, { reason: "Stepped down" }));
    expect(await T.staffRole(deps, ALI)).toBeNull();
    expect(await T.revokeModerator(deps, ADMIN, ALI, { reason: "Again" })).toMatchObject({ ok: false, status: 404 });
    expect(ok(await T.auditLog(deps, ADMIN, { memberId: ALI })).page.items.map((e) => [e.action, e.reason])).toEqual([
      ["moderator.revoke", "Stepped down"],
      ["moderator.grant", "Answers every Turkish question"],
    ]);
  });
});

describe("231 security: the ID proof by its bytes, one request at a time", () => {
  it("refuses a file whose bytes aren't a JPEG, PNG or PDF, whatever it claims; keeps the type its bytes are", async () => {
    linked.set(NOUR, { apps: apps(5), business: null });
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    expect(await T.submitVerification(deps, NOUR, { full_name: "Nour El Hoda", idProof: idProof("application/pdf", 200, html) })).toMatchObject({ ok: false, status: 400, errors: { id_proof: expect.any(String) } });
    expect(files.size).toBe(0);
    // A PNG sent as a JPEG is kept as the PNG it is.
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    const sent = ok(await T.submitVerification(deps, NOUR, { full_name: "Nour El Hoda", idProof: idProof("image/jpeg", 2000, png) }));
    expect(sent.state.request!.idProofKey).toMatch(/\.png$/);
    expect([...files.values()][0]!.type).toBe("image/png");
  });

  it("two requests sent at once: one waits, the other is refused", async () => {
    linked.set(NOUR, { apps: apps(5), business: null });
    const both = await Promise.all([1, 2].map(() => T.submitVerification(deps, NOUR, { full_name: "Nour El Hoda", idProof: idProof() })));
    expect(both.filter((r) => r.ok)).toHaveLength(1);
    expect(both.find((r) => !r.ok)).toMatchObject({ status: 409, code: "already_pending" });
  });
});

describe("231 security: reports and notices", () => {
  const OLD = new Date("2026-01-01T00:00:00Z");
  const extra = (id: string, createdAt = OLD) => members.set(id, { id, displayName: id, role: "member", status: "active", language: "en", email: null, createdAt, approvedPosts: 5 });

  it("a ring of new accounts can't hide a post: only established members' reports count, a badge holder's twice", async () => {
    ok(await T.updateSettings(deps, ADMIN, { spam_filter: { hide_after_reports: 3 } }));
    post("answer", "a70", NOUR, "A fine answer", "published");
    for (const id of ["new1", "new2", "new3", "new4"]) {
      extra(id, new Date(clock.getTime() - 2 * DAY));
      ok(await T.report(deps, id, { target_type: "answer", target_id: "a70", reason: "spam" }));
    }
    expect(posts.get("answer:a70")!.status).toBe("published");
    extra("old1");
    ok(await T.report(deps, "old1", { target_type: "answer", target_id: "a70", reason: "spam" }));
    expect(posts.get("answer:a70")!.status).toBe("published");
    // A badge holder counts twice: 1 + 2 = 3.
    extra("old2");
    ok(await T.grantBadge(deps, ADMIN, "old2", { badge: "blue", reason: "Helpful" }));
    ok(await T.report(deps, "old2", { target_type: "answer", target_id: "a70", reason: "spam" }));
    expect(posts.get("answer:a70")!.status).toBe("hidden");
  });

  it("a member with a recent violation, or reported themselves, doesn't count", async () => {
    ok(await T.updateSettings(deps, ADMIN, { spam_filter: { hide_after_reports: 1 } }));
    post("answer", "a71", NOUR, "Another answer", "published");
    extra("bad1");
    await deps.store.addViolation({ memberId: "bad1", kind: "content_removed", targetType: "answer", targetId: "x", createdBy: ADMIN, createdAt: new Date(clock.getTime() - DAY) });
    ok(await T.report(deps, "bad1", { target_type: "answer", target_id: "a71", reason: "spam" }));
    extra("bad2");
    extra("old3");
    ok(await T.report(deps, "old3", { target_type: "member", target_id: "bad2", reason: "spam" }));
    ok(await T.report(deps, "bad2", { target_type: "answer", target_id: "a71", reason: "spam" }));
    expect(posts.get("answer:a71")!.status).toBe("published");
  });

  it("never hides the team's or the staff's posts by reports: queued for a look instead", async () => {
    ok(await T.updateSettings(deps, ADMIN, { spam_filter: { hide_after_reports: 1 } }));
    post("answer", "a72", TEAM, "Official answer", "published");
    extra("old4");
    ok(await T.report(deps, "old4", { target_type: "answer", target_id: "a72", reason: "misinformation" }));
    expect(posts.get("answer:a72")!.status).toBe("published");
    expect(ok(await T.moderationQueue(deps, ADMIN, {})).page.items).toEqual([expect.objectContaining({ targetId: "a72", cause: "reports" })]);
  });

  it("the moderator stays unnamed and their note private: notices from the staff carry no actor and no note", async () => {
    post("answer", "a73", ALI, "Spam answer");
    await T.moderateNew(deps, { memberId: ALI, targetType: "answer", targetId: "a73", text: "Something new" });
    const item = ok(await T.moderationQueue(deps, ADMIN, {})).page.items[0]!;
    ok(await T.decideModeration(deps, ADMIN, item.id, { decision: "remove", note: "Same spammer as last week, ban next time" }));
    const n = (await T.listNotifications(deps, ALI)).page.items[0]!;
    expect(n).toMatchObject({ kind: "post_removed", actorId: null });
    expect(n.text).not.toContain("spammer");
    linked.set(NOUR, { apps: apps(5), business: null });
    const r = ok(await T.submitVerification(deps, NOUR, { full_name: "Nour El Hoda", idProof: idProof() })).state.request!;
    ok(await T.decideVerification(deps, ADMIN, r.id, { decision: "reject", reason: "The ID photo is unreadable." }));
    expect((await T.listNotifications(deps, NOUR)).page.items[0]).toMatchObject({ kind: "verification_rejected", actorId: null });
  });

  it("nothing from a member the recipient blocked (or who blocked them): not listed, not counted, not emailed", async () => {
    deps.blockedEitherWay = async (id) => new Set(id === NOUR ? [ALI] : []);
    await T.notify(deps, { memberId: NOUR, kind: "answer", actorId: ALI, data: { actor: "Ali", title: "x" }, link: "/q/1" });
    expect((await T.listNotifications(deps, NOUR)).unread).toBe(0);
    expect(mails).toHaveLength(0);
  });
});
