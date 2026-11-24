import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { fileLinkValid, type PrivateFiles } from "@/lib/community/trust/context";
import type { MemoryStore } from "@/lib/data/memory";
import { api, joinWithEmail, NOW, testCommunity, type TestCommunity } from "./community-support";

/**
 * 231 Yallapp Community, area C, through the API (/api/community/v1, as the
 * app and the website call it): notifications, the Gold verification form
 * and its review, the admins' tools, the audit log, settings, member status
 * and reports. Area A's base runs for real (members, sign-in, follow,
 * reports, the linked Yallapp account); area B's Q&A isn't needed here.
 */

const SECRET = "test-file-signing-secret";
let c: TestCommunity;
let files: Map<string, { bytes: Uint8Array; contentType: string }>;
type Joined = Awaited<ReturnType<typeof joinWithEmail>>;
let admin: Joined;
let nour: Joined;
let ali: Joined;

beforeEach(async () => {
  c = await testCommunity();
  files = new Map();
  const privateFiles: PrivateFiles = { put: async (key, bytes, contentType) => void files.set(key, { bytes, contentType }), get: async (key) => files.get(key) ?? null };
  Object.assign(c.deps, { privateFiles, fileSecret: SECRET });
  admin = await joinWithEmail(c, "Community Admin");
  nour = await joinWithEmail(c, "Nour El Hoda");
  ali = await joinWithEmail(c, "Ali Kaya");
  await c.deps.store.base.updateMember(admin.id, { role: "admin" });
});

/** Links a Yallapp account with `apps` apps to the member, as confirming the link on yallapp.com.tr does. */
async function linkYallapp(memberId: string, apps: number) {
  const platform = c.deps.platform as MemoryStore;
  const { user, client } = await registerClient(platform, { name: "Nour Studio", email: `owner-${memberId}@yallapp.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
  for (let i = 0; i < apps; i++) await platform.createApp({ ...newApp(client.id, null, NOW, "store"), appName: `Shop ${i + 1}` });
  await c.deps.store.base.updateMember(memberId, { yallappUserId: user.id, linkedAt: NOW });
}

describe("231 notifications through the API", () => {
  it("a follow lands in the list with its actor and words, counts as unread, and is marked read", async () => {
    expect((await api(c, "PUT", `/members/${nour.id}/follow`, { token: ali.token })).status).toBeLessThan(300);
    const list = await api<{ items: { id: string; kind: string; text: string; actor: { id: string; top_badge: unknown }; read: boolean }[]; unread_count: number; next_cursor: string | null }>(c, "GET", "/notifications", { token: nour.token });
    expect(list.status).toBe(200);
    expect(list.body.unread_count).toBe(1);
    expect(list.body.items[0]).toMatchObject({ kind: "follow", text: "Ali Kaya started following you.", actor: { id: ali.id }, read: false });
    expect(list.body.next_cursor).toBeNull();
    expect((await api(c, "POST", "/notifications/read", { token: nour.token, body: {} })).status).toBe(204);
    expect((await api<{ unread_count: number }>(c, "GET", "/notifications", { token: nour.token })).body.unread_count).toBe(0);
    expect((await api(c, "GET", "/notifications")).status).toBe(401);
  });

  it("reads and changes which kinds also come by email", async () => {
    const got = await api<{ email: Record<string, boolean> }>(c, "GET", "/notifications/settings", { token: nour.token });
    expect(got.body.email).toMatchObject({ answer: true, follow: false, verification_rejected: true });
    const put = await api<{ email: Record<string, boolean> }>(c, "PUT", "/notifications/settings", { token: nour.token, body: { email: { follow: true, answer: false } } });
    expect(put.body.email).toMatchObject({ follow: true, answer: false });
    expect((await api(c, "PUT", "/notifications/settings", { token: nour.token, body: { email: { nope: true } } })).status).toBe(400);
  });
});

describe("231 the Gold verification form through the API", () => {
  const form = (fields: Record<string, string | string[]>, file?: { type: string; bytes: number }) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
    if (file) f.append("id_proof", new File([new Uint8Array(file.bytes)], "id.jpg", { type: file.type }));
    return f;
  };

  it("can't apply without a linked account of 5 apps (Apply hidden: can_apply false)", async () => {
    const state = await api<Record<string, unknown>>(c, "GET", "/badges/verification", { token: nour.token });
    expect(state.body).toMatchObject({ has_gold: false, app_count: 0, required_apps: 5, yallapp_linked: false, can_apply: false, request: null });
    await linkYallapp(nour.id, 4);
    expect((await api<Record<string, unknown>>(c, "GET", "/badges/verification", { token: nour.token })).body).toMatchObject({ yallapp_linked: true, app_count: 4, can_apply: false });
    const sent = await api<{ error: { code: string; message: string } }>(c, "POST", "/badges/verification", { token: nour.token, form: form({ full_name: "Nour El Hoda" }, { type: "image/jpeg", bytes: 2000 }) });
    expect(sent.status).toBe(403);
    expect(sent.body.error.code).toBe("not_eligible");
  });

  it("applies with the linked apps, the ID proof kept private; an admin opens it by a signed link and approves; the badge shows on the member", async () => {
    await linkYallapp(nour.id, 5);
    // The member's own language wins over the request's.
    await c.deps.store.base.updateMember(nour.id, { language: "ar" });
    const bad = await api<{ error: { code: string; fields: Record<string, string> } }>(c, "POST", "/badges/verification", { token: nour.token, form: form({ full_name: "Nour" }, { type: "image/gif", bytes: 10 }), lang: "tr" });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.error.fields).sort()).toEqual(["full_name", "id_proof"]);
    expect(bad.body.error.fields.full_name).toBe("اكتب اسمك الكامل كما يظهر في هويتك.");

    const sent = await api<{ request: { id: string; status: string; apps: { name: string }[] }; can_apply: boolean }>(c, "POST", "/badges/verification", { token: nour.token, form: form({ full_name: "Nour El Hoda", portfolio_links: ["https://nour.dev"] }, { type: "image/jpeg", bytes: 2000 }) });
    expect(sent.status).toBe(201);
    expect(sent.body.request.status).toBe("pending");
    expect(sent.body.request.apps.map((a) => a.name).sort()).toEqual(["Shop 1", "Shop 2", "Shop 3", "Shop 4", "Shop 5"]);
    expect(sent.body.can_apply).toBe(false);
    expect((await api<{ error: { code: string } }>(c, "POST", "/badges/verification", { token: nour.token, form: form({ full_name: "Nour El Hoda" }, { type: "image/jpeg", bytes: 2000 }) })).body.error.code).toBe("already_pending");
    expect([...files.keys()]).toHaveLength(1);

    expect((await api(c, "GET", "/admin/verification-requests", { token: nour.token })).status).toBe(403);
    const queue = await api<{ items: { id: string; member: { id: string }; full_name: string }[] }>(c, "GET", "/admin/verification-requests", { token: admin.token });
    expect(queue.body.items).toEqual([expect.objectContaining({ id: sent.body.request.id, member: expect.objectContaining({ id: nour.id }), full_name: "Nour El Hoda" })]);
    const link = await api<{ url: string; expires_at: string }>(c, "GET", `/admin/verification-requests/${sent.body.request.id}/id-proof`, { token: admin.token });
    const url = new URL(link.body.url);
    expect(url.pathname).toBe("/api/community/id-proof");
    expect(files.has(url.searchParams.get("k")!)).toBe(true);
    expect(fileLinkValid(SECRET, url.searchParams.get("k")!, Number(url.searchParams.get("e")), url.searchParams.get("s")!, NOW)).toBe(true);
    expect(fileLinkValid(SECRET, url.searchParams.get("k")!, Number(url.searchParams.get("e")), url.searchParams.get("s")!, new Date(NOW.getTime() + 6 * 60_000))).toBe(false);
    expect(fileLinkValid(SECRET, "community/id-proof/other.jpg", Number(url.searchParams.get("e")), url.searchParams.get("s")!, NOW)).toBe(false);

    expect((await api(c, "POST", `/admin/verification-requests/${sent.body.request.id}`, { token: admin.token, body: { decision: "approve" } })).status).toBe(400);
    const decided = await api<{ status: string; reason: string }>(c, "POST", `/admin/verification-requests/${sent.body.request.id}`, { token: admin.token, body: { decision: "approve", reason: "Five apps, ID checked." } });
    expect(decided.body).toMatchObject({ status: "approved", reason: "Five apps, ID checked." });
    expect((await api<Record<string, unknown>>(c, "GET", "/badges/verification", { token: nour.token })).body).toMatchObject({ has_gold: true, can_apply: false });
    const profile = await api<{ top_badge: string; badges: { kind: string; label: string }[] }>(c, "GET", `/members/${nour.id}`);
    expect(profile.body.top_badge).toBe("gold");
    expect(profile.body.badges).toEqual([expect.objectContaining({ kind: "gold" })]);
    expect((await api<{ items: { kind: string }[] }>(c, "GET", "/notifications", { token: nour.token })).body.items[0]!.kind).toBe("verification_approved");
  });
});

describe("231 the admins' tools through the API", () => {
  it("grants with a private reason, lists a member's badges, revokes by kind, and logs who, when and why", async () => {
    expect((await api(c, "POST", `/admin/members/${ali.id}/badges`, { token: nour.token, body: { badge: "blue", reason: "Friend" } })).status).toBe(403);
    const granted = await api<{ badge: string; source: string; reason: string; granted_by: { id: string }; company_name: string }>(c, "POST", `/admin/members/@${ali.username}/badges`, { token: admin.token, body: { badge: "green", reason: "Partner studio", company_name: "Kaya Apps", app_url: "https://kaya.app" } });
    expect(granted.status).toBe(201);
    expect(granted.body).toMatchObject({ badge: "green", source: "manual", reason: "Partner studio", granted_by: { id: admin.id }, company_name: "Kaya Apps" });
    // Members see the badge, never the private reason.
    const profile = await api<Record<string, unknown>>(c, "GET", `/members/${ali.id}`, { token: nour.token });
    expect(profile.body.top_badge).toBe("green");
    expect(JSON.stringify(profile.body)).not.toContain("Partner studio");
    expect((await api(c, "DELETE", `/admin/members/${ali.id}/badges/gold`, { token: admin.token, body: { reason: "Nothing to take" } })).status).toBe(404);
    expect((await api(c, "DELETE", `/admin/members/${ali.id}/badges/green`, { token: admin.token, body: { reason: "Partnership ended" } })).status).toBe(204);
    const badges = await api<{ items: { badge: string; revoked_at: string | null; revoke_reason: string }[] }>(c, "GET", `/admin/members/${ali.id}/badges`, { token: admin.token });
    expect(badges.body.items[0]).toMatchObject({ badge: "green", revoke_reason: "Partnership ended" });
    const log = await api<{ items: { action: string; actor: { id: string }; member: { id: string }; reason: string }[] }>(c, "GET", `/admin/audit-log?member=@${ali.username}`, { token: admin.token });
    expect(log.body.items.map((e) => [e.action, e.actor.id, e.member.id, e.reason])).toEqual([
      ["badge.revoke", admin.id, ali.id, "Partnership ended"],
      ["badge.grant", admin.id, ali.id, "Partner studio"],
    ]);
  });

  it("finds members, by badge too", async () => {
    await api(c, "POST", `/admin/members/${ali.id}/badges`, { token: admin.token, body: { badge: "blue", reason: "Helps a lot" } });
    const all = await api<{ items: { id: string }[] }>(c, "GET", "/admin/members?q=a", { token: admin.token });
    expect(all.status).toBe(200);
    const blue = await api<{ items: { id: string; top_badge: string }[] }>(c, "GET", "/admin/members?badge=blue", { token: admin.token });
    expect(blue.body.items).toEqual([expect.objectContaining({ id: ali.id, top_badge: "blue" })]);
  });

  it("reads and changes the settings; 'who can create groups' reaches /config; every change logged", async () => {
    const s = await api<Record<string, unknown>>(c, "GET", "/admin/settings", { token: admin.token });
    expect(s.body).toMatchObject({ groups_create_policy: "everyone", first_posts_reviewed: 2, blue_badge: { min_points: 1000, violation_free_days: 90 }, spam_filter: { enabled: true, max_links: 3 } });
    expect((await api(c, "PUT", "/admin/settings", { token: admin.token, body: { blue_badge: { min_points: -1 } } })).status).toBe(400);
    const put = await api<Record<string, unknown>>(c, "PUT", "/admin/settings", { token: admin.token, body: { groups_create_policy: "badge_holders" } });
    expect(put.body).toMatchObject({ groups_create_policy: "badge_holders" });
    expect((await api<{ groups_create_policy: string }>(c, "GET", "/config")).body.groups_create_policy).toBe("badge_holders");
    expect((await api<{ items: { action: string }[] }>(c, "GET", "/admin/audit-log?action=settings.update", { token: admin.token })).body.items).toHaveLength(1);
  });

  it("suspends a member (signed out everywhere) and restores them", async () => {
    expect((await api(c, "PUT", `/admin/members/${nour.id}/status`, { token: admin.token, body: { status: "suspended", reason: "Repeated spam" } })).status).toBe(204);
    expect((await api(c, "GET", "/notifications", { token: nour.token })).status).toBe(401);
    expect((await c.deps.store.base.getMember(nour.id))!.status).toBe("suspended");
    expect((await api(c, "PUT", `/admin/members/${nour.id}/status`, { token: admin.token, body: { status: "active", reason: "Appeal accepted" } })).status).toBe(204);
    expect((await c.deps.store.base.getMember(nour.id))!.status).toBe("active");
  });
});

describe("231 reports reach the moderators", () => {
  it("a member reported (area A's /reports) is in the admins' list, closed once, and the reporter thanked", async () => {
    const made = await api<{ id: string }>(c, "POST", "/reports", { token: nour.token, body: { target_type: "member", target_id: ali.id, reason: "harassment", note: "Rude messages" } });
    expect(made.status).toBe(201);
    const list = await api<{ items: { id: string; reporter: { id: string }; reason: string; status: string }[] }>(c, "GET", "/admin/reports", { token: admin.token });
    expect(list.body.items).toEqual([expect.objectContaining({ id: made.body.id, reporter: expect.objectContaining({ id: nour.id }), reason: "harassment", status: "open" })]);
    const closed = await api<{ status: string }>(c, "POST", `/admin/reports/${made.body.id}`, { token: admin.token, body: { status: "actioned", note: "Warned" } });
    expect(closed.body.status).toBe("actioned");
    expect((await api(c, "POST", `/admin/reports/${made.body.id}`, { token: admin.token, body: { status: "dismissed" } })).status).toBe(409);
    expect((await api<{ items: { kind: string }[] }>(c, "GET", "/notifications", { token: nour.token })).body.items[0]!.kind).toBe("report_resolved");
    expect((await api<{ items: unknown[] }>(c, "GET", "/admin/moderation", { token: admin.token })).body.items).toEqual([]);
  });
});

describe("231 the daily trust run", () => {
  it("takes an automatic badge whose rules no longer hold, and leaves an admin's", async () => {
    const { runCommunityTrustDaily } = await import("@/lib/community/trust/daily");
    const trust = c.deps.store.trust;
    await trust.addMemberBadge({ memberId: nour.id, badge: "blue", source: "auto", reason: null, grantedAt: NOW, grantedBy: null, expiresAt: null, details: null });
    await api(c, "POST", `/admin/members/${ali.id}/badges`, { token: admin.token, body: { badge: "blue", reason: "Moderator" } });
    // Nour has no points and no activity: Blue's rules don't hold.
    expect(await runCommunityTrustDaily({ deps: c.deps, store: c.deps.store, now: c.deps.now })).toEqual({ checked: 1, granted: 0, revoked: 1 });
    expect((await api<{ top_badge: string | null }>(c, "GET", `/members/${nour.id}`)).body.top_badge).toBeNull();
    expect((await api<{ top_badge: string | null }>(c, "GET", `/members/${ali.id}`)).body.top_badge).toBe("blue");
  });
});

describe("231 area C's routes are exactly the contract's", () => {
  it("serves every /badges, /notifications and /admin path of docs/api/community.yaml, and no other", async () => {
    const { readFileSync } = await import("node:fs");
    const { parse } = await import("yaml");
    const { TRUST_ROUTES } = await import("@/lib/community/api/trust-routes");
    const contract = parse(readFileSync(new URL("../../../../docs/api/community.yaml", import.meta.url), "utf8")) as { paths: Record<string, Record<string, unknown>> };
    const METHODS = ["get", "post", "put", "patch", "delete"];
    const documented = Object.entries(contract.paths)
      .filter(([path]) => /^\/(badges|notifications|admin)(\/|$)/.test(path))
      .flatMap(([path, ops]) => Object.keys(ops).filter((m) => METHODS.includes(m)).map((m) => `${m.toUpperCase()} ${path.replace(/\{(\w+)\}/g, ":$1")}`))
      .sort();
    expect(TRUST_ROUTES.map((r) => `${r.method} ${r.path}`).sort()).toEqual(documented);
  });
});

describe("231 moderation and notifications with the Q&A (area B)", () => {
  const QUESTION = { title: "How do I connect a payment gateway to my store?", body: "I built a store with Yallapp and want card payments at checkout. Where do I start?", section: "payments", tags: ["Payments"] };

  it("a new member's first question waits in the queue; approved, it shows and its author is told; an answer tells the asker by email", async () => {
    const asked = await api<{ id: string; status: string }>(c, "POST", "/qa/questions", { token: nour.token, body: QUESTION });
    expect(asked.status).toBe(201);
    expect(asked.body.status).toBe("pending");
    const queue = await api<{ items: { id: string; cause: string; preview: string; author: { id: string }; target_type: string }[] }>(c, "GET", "/admin/moderation", { token: admin.token });
    expect(queue.body.items).toEqual([expect.objectContaining({ cause: "first_posts", preview: QUESTION.title, author: expect.objectContaining({ id: nour.id }), target_type: "question" })]);
    expect((await api(c, "POST", `/admin/moderation/${queue.body.items[0]!.id}`, { token: admin.token, body: { decision: "approve" } })).status).toBe(200);
    expect((await api<{ status: string }>(c, "GET", `/qa/questions/${asked.body.id}`)).body.status).toBe("published");
    expect((await api<{ items: { kind: string }[] }>(c, "GET", "/notifications", { token: nour.token })).body.items[0]!.kind).toBe("post_approved");
    expect((await c.deps.store.base.getMember(nour.id))!.approvedPosts).toBe(1);

    // Ali is established: his answer shows at once, and Nour hears of it (email included: her address is verified).
    await c.deps.store.base.updateMember(ali.id, { approvedPosts: 2 });
    await c.deps.store.base.updateMember(nour.id, { emailVerified: true });
    const sentBefore = c.mail.sent.length;
    const answered = await api<{ status: string }>(c, "POST", `/qa/questions/${asked.body.id}/answers`, { token: ali.token, body: { body: "Open Payments in the dashboard, then add your gateway's keys." } });
    expect(answered.body.status).toBe("published");
    const notes = await api<{ items: { kind: string; text: string; link: string }[] }>(c, "GET", "/notifications", { token: nour.token });
    expect(notes.body.items[0]).toMatchObject({ kind: "answer", text: `Ali Kaya answered your question "${QUESTION.title}".` });
    expect(c.mail.sent.slice(sentBefore).map((m) => m.to)).toEqual([nour.email]);
  });

  it("enough reports on an answer hide it until a moderator decides", async () => {
    await api(c, "PUT", "/admin/settings", { token: admin.token, body: { spam_filter: { hide_after_reports: 2 } } });
    for (const m of [nour, ali, admin]) await c.deps.store.base.updateMember(m.id, { approvedPosts: 2 });
    const q = await api<{ id: string }>(c, "POST", "/qa/questions", { token: nour.token, body: QUESTION });
    const a = await api<{ id: string; status: string }>(c, "POST", `/qa/questions/${q.body.id}/answers`, { token: ali.token, body: { body: "This question is silly and so are you, ask someone else." } });
    expect(a.body.status).toBe("published");
    const extra = await joinWithEmail(c, "Third Member");
    for (const who of [nour, extra]) expect((await api(c, "POST", "/reports", { token: who.token, body: { target_type: "answer", target_id: a.body.id, reason: "spam" } })).status).toBe(201);
    const queue = await api<{ items: { id: string; cause: string; report_count: number }[] }>(c, "GET", "/admin/moderation", { token: admin.token });
    expect(queue.body.items).toEqual([expect.objectContaining({ cause: "reports", report_count: 2 })]);
    expect((await api<{ answers: { id: string }[] }>(c, "GET", `/qa/questions/${q.body.id}`, { token: extra.token })).body.answers ?? []).toEqual([]);
    expect((await api(c, "POST", `/admin/moderation/${queue.body.items[0]!.id}`, { token: admin.token, body: { decision: "remove", note: "Spam" } })).status).toBe(200);
    expect((await api<{ items: unknown[] }>(c, "GET", "/admin/reports", { token: admin.token })).body.items).toEqual([]);
    expect((await api<{ items: { kind: string; text: string }[] }>(c, "GET", "/notifications", { token: ali.token })).body.items[0]).toMatchObject({ kind: "post_removed" });
  });
});
