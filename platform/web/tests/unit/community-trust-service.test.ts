import { beforeEach, describe, expect, it } from "vitest";
import type { LinkedApp } from "@/lib/community/trust/requests";
import * as T from "@/lib/community/trust/service";
import { MemoryTrustStore, type ContentKind } from "@/lib/community/trust/store";

/**
 * 231 Yallapp Community, area C: the service end to end over the memory
 * store, with the other areas (members, posts, stats, the linked Yallapp
 * account) and email faked.
 */

const DAY = 86_400_000;
let clock = new Date("2026-11-24T12:00:00Z");
const ADMIN = 1;
const NOUR = 2;
const ALI = 3;
const TEAM = 4;

type Member = T.TrustMember;
let members: Map<number, Member>;
let stats: Map<number, { points: number; acceptedAnswers: number; approvedTutorials: number; lastActiveAt: Date | null }>;
let linked: Map<number, { apps: LinkedApp[]; paid: { company: string; appUrl: string | null } | null }>;
let posts: Map<string, { memberId: number; title: string; status: "pending" | "published" | "hidden" }>;
let mails: { to: string; subject: string; text: string; html: string }[];
let deps: T.TrustDeps;

const apps = (n: number): LinkedApp[] => Array.from({ length: n }, (_, i) => ({ id: `app${i + 1}`, name: `App ${i + 1}`, url: null, template: i === 0 }));
const post = (kind: ContentKind, id: number, memberId: number, title: string) => posts.set(`${kind}:${id}`, { memberId, title, status: "pending" });

beforeEach(() => {
  clock = new Date("2026-11-24T12:00:00Z");
  const joined = new Date(clock.getTime() - 100 * DAY);
  members = new Map<number, Member>([
    [ADMIN, { id: ADMIN, displayName: "Admin", role: "admin", lang: "en", email: "admin@community.test", joinedAt: joined }],
    [NOUR, { id: NOUR, displayName: "Nour", role: "member", lang: "ar", email: "nour@community.test", joinedAt: joined }],
    [ALI, { id: ALI, displayName: "Ali", role: "member", lang: "tr", email: null, joinedAt: joined }],
    [TEAM, { id: TEAM, displayName: "Yallapp Team", role: "team", lang: "en", email: null, joinedAt: joined }],
  ]);
  stats = new Map();
  linked = new Map();
  posts = new Map();
  mails = [];
  deps = {
    store: new MemoryTrustStore(),
    now: () => clock,
    member: async (id) => members.get(id) ?? null,
    stats: async (id) => stats.get(id) ?? { points: 0, acceptedAnswers: 0, approvedTutorials: 0, lastActiveAt: null },
    linked: async (id) => linked.get(id) ?? null,
    content: {
      info: async (kind, id) => {
        const p = posts.get(`${kind}:${id}`);
        return p ? { memberId: p.memberId, title: p.title, link: `/q/${id}` } : null;
      },
      setStatus: async (kind, id, status) => {
        const p = posts.get(`${kind}:${id}`);
        if (p) p.status = status;
      },
    },
    sendMail: async (m) => void mails.push(m),
    siteUrl: "https://community.yallapp.com.tr",
    logoUrl: null,
  };
});

describe("231 Gold: the verification form, an admin's decision, the member told either way", () => {
  it("shows Apply only from 5 linked apps, and lists those apps (never typed by the member)", async () => {
    expect(await T.goldEligibility(deps, NOUR)).toMatchObject({ canApply: false, blocked: "no_linked_account", minApps: 5 });
    linked.set(NOUR, { apps: apps(4), paid: null });
    expect(await T.goldEligibility(deps, NOUR)).toMatchObject({ canApply: false, blocked: "not_enough_apps" });
    linked.set(NOUR, { apps: apps(5), paid: null });
    const ok = await T.goldEligibility(deps, NOUR);
    expect(ok.canApply).toBe(true);
    expect(ok.apps.map((a) => a.name)).toEqual(["App 1", "App 2", "App 3", "App 4", "App 5"]);
    expect((await T.submitVerification(deps, ALI, { full_name: "Ali Kaya", id_proof_file_id: "file_12345678" })) as T.Fail).toMatchObject({ ok: false, code: "no_linked_account" });
  });

  it("approval gives Gold, logs it and tells the member in their language by email", async () => {
    linked.set(NOUR, { apps: apps(6), paid: null });
    const sent = await T.submitVerification(deps, NOUR, { full_name: "Nour El Hoda", id_proof_file_id: "file_12345678", portfolio: ["https://nour.dev"], apps: [{ id: "fake" }] });
    expect(sent.ok).toBe(true);
    const request = (sent as { request: { id: number; apps: LinkedApp[] } }).request;
    // The apps are the linked account's, whatever the form sent.
    expect(request.apps).toHaveLength(6);
    expect(await T.goldEligibility(deps, NOUR)).toMatchObject({ blocked: "pending" });
    expect(await T.decideVerification(deps, NOUR, request.id, { decision: "approve" })).toMatchObject({ ok: false, status: 403 });
    expect((await T.decideVerification(deps, ADMIN, request.id, { decision: "approve" })).ok).toBe(true);
    expect(await T.memberBadges(deps, NOUR, "en")).toMatchObject({ shown: "gold", held: [{ badge: "gold", name: "Pro Developer" }] });
    const log = (await T.auditLog(deps, ADMIN, { memberId: NOUR })) as { page: { items: { action: string; actorId: number }[] } };
    expect(log.page.items[0]).toMatchObject({ action: "verification_approved", actorId: ADMIN });
    expect(mails.at(-1)).toMatchObject({ to: "nour@community.test" });
    expect(mails.at(-1)!.html).toContain('dir="rtl"');
    expect(await T.decideVerification(deps, ADMIN, request.id, { decision: "reject", reason: "Again" })).toMatchObject({ ok: false, code: "already_decided" });
    expect(await T.goldEligibility(deps, NOUR)).toMatchObject({ blocked: "already_gold" });
  });

  it("a rejection needs a reason, which the member sees", async () => {
    linked.set(NOUR, { apps: apps(5), paid: null });
    const r = (await T.submitVerification(deps, NOUR, { full_name: "Nour El Hoda", id_proof_file_id: "file_12345678" })) as { request: { id: number } };
    expect((await T.decideVerification(deps, ADMIN, r.request.id, { decision: "reject" })).ok).toBe(false);
    expect((await T.decideVerification(deps, ADMIN, r.request.id, { decision: "reject", reason: "The ID photo is unreadable." })).ok).toBe(true);
    expect(await T.myVerification(deps, NOUR)).toMatchObject({ status: "rejected", reason: "The ID photo is unreadable." });
    expect((await T.memberBadges(deps, NOUR)).shown).toBeNull();
    const list = await T.listNotifications(deps, NOUR);
    expect(list.items[0]).toMatchObject({ kind: "verification_rejected", read: false });
    expect(list.items[0]!.text).toContain("The ID photo is unreadable.");
    // They may apply again.
    expect((await T.goldEligibility(deps, NOUR)).canApply).toBe(true);
  });
});

describe("231 admin overrides and the audit log", () => {
  it("grants any badge with a private reason and optional expiry, revokes with a reason, logging who, when and why", async () => {
    const g = await T.grantBadge(deps, ADMIN, ALI, { badge: "gold", reason: "Core contributor", expires_at: new Date(clock.getTime() + 30 * DAY).toISOString() });
    expect(g.ok).toBe(true);
    expect((await T.memberBadges(deps, ALI)).shown).toBe("gold");
    // The private reason is never in what members see.
    expect(JSON.stringify(await T.memberBadges(deps, ALI))).not.toContain("Core contributor");
    const id = (g as { badge: { id: number } }).badge.id;
    expect(await T.revokeBadge(deps, ADMIN, id, {})).toMatchObject({ ok: false });
    expect((await T.revokeBadge(deps, ADMIN, id, { reason: "Misused the badge" })).ok).toBe(true);
    expect((await T.memberBadges(deps, ALI)).shown).toBeNull();
    const log = (await T.auditLog(deps, ADMIN, { memberId: ALI })) as { page: { items: { action: string; actorId: number; reason: string; at: Date }[] } };
    expect(log.page.items.map((e) => [e.action, e.actorId, e.reason])).toEqual([
      ["badge_revoked", ADMIN, "Misused the badge"],
      ["badge_granted", ADMIN, "Core contributor"],
    ]);
    expect(await T.grantBadge(deps, NOUR, ALI, { badge: "blue", reason: "Friend" })).toMatchObject({ ok: false, status: 403 });
  });

  it("an admin's badge outlives the rules; it ends at its expiry", async () => {
    await T.grantBadge(deps, ADMIN, ALI, { badge: "blue", reason: "Event host", expires_at: new Date(clock.getTime() + 10 * DAY).toISOString() });
    expect(await T.refreshAutoBadges(deps, ALI)).toEqual({ granted: [], revoked: [] });
    expect((await T.memberBadges(deps, ALI)).shown).toBe("blue");
    clock = new Date(clock.getTime() + 11 * DAY);
    expect((await T.memberBadges(deps, ALI)).shown).toBeNull();
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
    const log = (await T.auditLog(deps, ADMIN, { memberId: NOUR })) as { page: { items: { action: string; actorId: number | null; reason: string }[] } };
    expect(log.page.items.map((e) => [e.action, e.actorId, e.reason])).toEqual([
      ["badge_granted", null, "rules"],
      ["badge_revoked", null, "inactive"],
      ["badge_granted", null, "rules"],
    ]);
  });

  it("Green shows the company and app link while a paid plan lasts", async () => {
    linked.set(ALI, { apps: apps(1), paid: { company: "Kaya Apps", appUrl: "https://play.google.com/store/apps/details?id=x" } });
    await T.refreshAutoBadges(deps, ALI);
    expect((await T.memberBadges(deps, ALI, "tr")).held).toEqual([{ badge: "green", name: "Doğrulanmış İşletme", since: clock.toISOString(), business: { company: "Kaya Apps", appUrl: "https://play.google.com/store/apps/details?id=x" } }]);
    linked.set(ALI, { apps: apps(1), paid: null });
    expect((await T.refreshAutoBadges(deps, ALI)).revoked).toEqual(["green"]);
  });
});

describe("231 settings", () => {
  it("only admins change them, every change logged with before and after", async () => {
    expect((await T.getSettings(deps)).groups.creators).toBe("everyone");
    expect(await T.updateSettings(deps, NOUR, { groups: { creators: "chosen" } })).toMatchObject({ ok: false, status: 403 });
    expect(await T.updateSettings(deps, ADMIN, { blue: { minPoints: -5 } })).toMatchObject({ ok: false, errors: { "blue.minPoints": expect.any(String) } });
    expect((await T.updateSettings(deps, ADMIN, { groups: { creators: "chosen", chosen: [ALI] } })).ok).toBe(true);
    expect(await T.canCreateGroups(deps, ALI)).toBe(true);
    expect(await T.canCreateGroups(deps, NOUR)).toBe(false);
    const log = (await T.auditLog(deps, ADMIN, { action: "settings_changed" })) as { page: { items: { detail: { before: { groups: { creators: string } }; after: { groups: { creators: string } } } }[] } };
    expect(log.page.items[0]!.detail.before.groups.creators).toBe("everyone");
    expect(log.page.items[0]!.detail.after.groups.creators).toBe("chosen");
  });
});

describe("231 moderation: the queue", () => {
  it("holds a new member's first 2 posts; approving shows them; the third appears at once", async () => {
    post("question", 10, NOUR, "Splash screen?");
    post("answer", 11, NOUR, "Try the theme settings");
    post("question", 12, NOUR, "Fonts?");
    expect(await T.moderateNew(deps, { memberId: NOUR, kind: "question", contentId: 10, text: "How do I change the splash screen?" })).toEqual({ status: "pending", reasons: ["new_member"] });
    expect(await T.moderateNew(deps, { memberId: NOUR, kind: "answer", contentId: 11, text: "Try the theme settings in Studio." })).toEqual({ status: "pending", reasons: ["new_member"] });
    const queue = (await T.moderationQueue(deps, ADMIN, {})) as { page: { items: { id: number; title: string }[] } };
    expect(queue.page.items.map((i) => i.title)).toEqual(["Splash screen?", "Try the theme settings"]);
    for (const item of queue.page.items) expect((await T.decideModeration(deps, ADMIN, item.id, { decision: "approve" })).ok).toBe(true);
    expect(posts.get("question:10")!.status).toBe("published");
    expect(await T.moderateNew(deps, { memberId: NOUR, kind: "question", contentId: 12, text: "Which fonts can I use in the app?" })).toEqual({ status: "published" });
  });

  it("rejecting hides the post, tells the member why, and counts against Blue when the filter caught it", async () => {
    post("answer", 20, ALI, "Cheap followers");
    await T.moderateNew(deps, { memberId: ALI, kind: "answer", contentId: 20, text: "buy followers at https://bit.ly/zzz" });
    const item = ((await T.moderationQueue(deps, ADMIN, {})) as { page: { items: { id: number; reasons: string[] }[] } }).page.items[0]!;
    expect(item.reasons).toEqual(["new_member", "short_link", "blocked_word"]);
    expect((await T.decideModeration(deps, ADMIN, item.id, { decision: "reject", reason: "Spam" })).ok).toBe(true);
    expect(posts.get("answer:20")!.status).toBe("hidden");
    expect((await deps.store.memberTrust(ALI)).lastViolationAt).toEqual(clock);
    expect((await T.listNotifications(deps, ALI)).items[0]!.text).toContain("Spam");
  });

  it("never holds the Yallapp Team", async () => {
    expect(await T.moderateNew(deps, { memberId: TEAM, kind: "answer", contentId: 30, text: "Official: see the docs." })).toEqual({ status: "published" });
  });
});

describe("231 reports", () => {
  it("one per member per post; enough reports hide it; upholding closes them all and thanks each reporter", async () => {
    await T.updateSettings(deps, ADMIN, { moderation: { hideAfterReports: 2 } });
    post("answer", 40, NOUR, "Rude answer");
    posts.get("answer:40")!.status = "published";
    expect(await T.report(deps, NOUR, { target: "answer", target_id: 40, reason: "spam" })).toMatchObject({ ok: false });
    const first = (await T.report(deps, ALI, { target: "answer", target_id: 40, reason: "harassment" })) as { id: number };
    expect(await T.report(deps, ALI, { target: "answer", target_id: 40, reason: "spam" })).toEqual({ ok: true, id: first.id });
    expect(posts.get("answer:40")!.status).toBe("published");
    await T.report(deps, TEAM, { target: "answer", target_id: 40, reason: "harassment" });
    expect(posts.get("answer:40")!.status).toBe("hidden");
    expect(await T.resolveReport(deps, ADMIN, first.id, { decision: "uphold", note: "Removed" })).toEqual({ ok: true, resolved: 2 });
    expect((await T.listReports(deps, ADMIN, {})) as { page: { total: number } }).toMatchObject({ page: { total: 0 } });
    expect((await T.listNotifications(deps, ALI)).items[0]!.kind).toBe("report_resolved");
    expect((await deps.store.memberTrust(NOUR)).lastViolationAt).toEqual(clock);
  });

  it("dismissing brings back a post hidden by reports alone", async () => {
    await T.updateSettings(deps, ADMIN, { moderation: { hideAfterReports: 1 } });
    post("question", 50, NOUR, "Fine question");
    posts.get("question:50")!.status = "published";
    const r = (await T.report(deps, ALI, { target: "question", target_id: 50, reason: "spam" })) as { id: number };
    expect(posts.get("question:50")!.status).toBe("hidden");
    await T.resolveReport(deps, ADMIN, r.id, { decision: "dismiss" });
    expect(posts.get("question:50")!.status).toBe("published");
    expect((await deps.store.memberTrust(NOUR)).lastViolationAt).toBeNull();
  });
});

describe("231 notifications: the list, read marks, email by the member's choices", () => {
  it("lists newest first in the member's language, counts unread, marks read", async () => {
    await T.notify(deps, { memberId: NOUR, kind: "followed", actorId: ALI, data: { actor: "Ali" }, link: "/u/3" });
    await T.notify(deps, { memberId: NOUR, kind: "answer_posted", actorId: ALI, data: { actor: "Ali", title: "Fonts?" }, link: "/q/12" });
    const list = await T.listNotifications(deps, NOUR);
    expect(list.unread).toBe(2);
    expect(list.items[0]!.text).toBe("أجاب Ali عن سؤالك «Fonts?».");
    expect(await T.markRead(deps, NOUR, { ids: [list.items[0]!.id] })).toEqual({ ok: true, marked: 1, unread: 1 });
    expect(await T.markRead(deps, NOUR, { ids: "all" })).toEqual({ ok: true, marked: 1, unread: 0 });
  });

  it("emails what matters, not a follow; never to a member without an email; never their own action", async () => {
    await T.notify(deps, { memberId: NOUR, kind: "followed", actorId: ALI, data: { actor: "Ali" }, link: "/u/3" });
    expect(mails).toHaveLength(0);
    await T.notify(deps, { memberId: NOUR, kind: "answer_posted", actorId: ALI, data: { actor: "Ali", title: "Fonts?" }, link: "/q/12" });
    expect(mails).toHaveLength(1);
    expect(mails[0]!.text).toContain("https://community.yallapp.com.tr/q/12");
    await T.notify(deps, { memberId: ALI, kind: "answer_posted", actorId: NOUR, data: { actor: "Nour", title: "x" }, link: "/q/1" });
    expect(mails).toHaveLength(1);
    await T.notify(deps, { memberId: NOUR, kind: "answer_posted", actorId: NOUR, data: {}, link: "/q/1" });
    expect((await T.listNotifications(deps, NOUR)).total).toBe(2);
  });

  it("follows the member's email choices", async () => {
    expect((await T.updatePrefs(deps, NOUR, { kinds: { answer_posted: false } })).ok).toBe(true);
    await T.notify(deps, { memberId: NOUR, kind: "answer_posted", actorId: ALI, data: { actor: "Ali", title: "x" }, link: "/q/1" });
    expect(mails).toHaveLength(0);
    await T.updatePrefs(deps, NOUR, { email: false });
    await T.notify(deps, { memberId: NOUR, kind: "verification_rejected", data: { reason: "x" }, link: "/verify" });
    expect(mails).toHaveLength(0);
    expect(await T.getPrefs(deps, NOUR)).toEqual({ email: false, kinds: { answer_posted: false } });
  });

  it("a failed email never fails what caused it", async () => {
    deps.sendMail = async () => {
      throw new Error("SMTP down");
    };
    await expect(T.notify(deps, { memberId: NOUR, kind: "answer_posted", actorId: ALI, data: { actor: "Ali", title: "x" }, link: "/q/1" })).resolves.toBeUndefined();
    expect((await T.listNotifications(deps, NOUR)).total).toBe(1);
  });
});
