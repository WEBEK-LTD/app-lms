import { beforeEach, describe, expect, it } from "vitest";
import { handleCommunity } from "@/lib/community/api/service";
import type { CourseCheckoutGateway, CourseShop } from "@/lib/community/engage/checkout";
import { settleCourseOrder, startCourseCheckout } from "@/lib/community/engage/checkout";
import { runEventReminders } from "@/lib/community/engage/events";
import { awardPoints, takeBackPoints, weekStart } from "@/lib/community/engage/points";
import type { CommunityPushMessage } from "@/lib/community/engage/push";
import { api, joinWithEmail, makeYallappStaff, NOW, testCommunity, type TestCommunity } from "./community-support";

/**
 * 232–235 Yallapp Community, area C's phases 2 to 5 through the API
 * (docs/api/community.yaml): push to the app's phones, points and the
 * leaderboard, challenges, events and live sessions, the moderation of what
 * they add, and the academy's checkout on the website.
 */

let c: TestCommunity;
let admin: Awaited<ReturnType<typeof joinWithEmail>>;
let nour: Awaited<ReturnType<typeof joinWithEmail>>;
let ali: Awaited<ReturnType<typeof joinWithEmail>>;
let pushed: { tokens: string[]; message: CommunityPushMessage }[];
let deadTokens: Set<string>;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const at = (ms: number) => new Date(NOW.getTime() + ms);
const ctx = () => ({ deps: c.deps, store: c.deps.store, now: c.deps.now });
const PHONE = (n: string) => `fcm-${n}-${"a".repeat(140)}`;

beforeEach(async () => {
  c = await testCommunity();
  pushed = [];
  deadTokens = new Set();
  c.deps.push = async (targets, message) => {
    pushed.push({ tokens: targets.map((t) => t.token), message });
    return { sent: targets.length, invalidTokens: targets.map((t) => t.token).filter((t) => deadTokens.has(t)) };
  };
  admin = await joinWithEmail(c, "Community Admin");
  nour = await joinWithEmail(c, "Nour El Hoda");
  ali = await joinWithEmail(c, "Ali Kaya");
  await makeYallappStaff(c, admin.id);
  // Established members: their posts aren't held as first posts.
  for (const m of [nour, ali]) await c.deps.store.base.updateMember(m.id, { approvedPosts: 2 });
});

describe("232 push for the Community app", () => {
  it("a phone's token gets every notice in the member's words; each kind can be turned off; DELETE and signing out forget it", async () => {
    expect((await api(c, "PUT", "/me/push-tokens", { token: nour.token, body: { token: PHONE("nour"), platform: "android" } })).status).toBe(204);
    expect((await api(c, "PUT", "/me/push-tokens", { token: nour.token, body: { token: "short", platform: "web" } })).status).toBe(400);
    await c.deps.store.base.updateMember(nour.id, { language: "tr" });
    expect((await api(c, "PUT", `/members/${nour.id}/follow`, { token: ali.token })).status).toBe(200);
    expect(pushed).toEqual([{ tokens: [PHONE("nour")], message: { title: "Yallapp Community", body: "Ali Kaya sizi takip etmeye başladı.", data: expect.objectContaining({ kind: "follow", link: expect.stringContaining("/u/") }) } }]);

    // The settings: push beside email, every kind listed, on by default.
    const settings = await api<{ email: Record<string, boolean>; push: Record<string, boolean> }>(c, "GET", "/notifications/settings", { token: nour.token });
    expect(settings.body.push).toMatchObject({ follow: true, challenge_won: true, event_soon: true, post_comment: true });
    expect(Object.keys(settings.body.push).sort()).toEqual(Object.keys(settings.body.email).sort());
    const off = await api<{ push: Record<string, boolean>; email: Record<string, boolean> }>(c, "PUT", "/notifications/settings", { token: nour.token, body: { push: { follow: false } } });
    expect(off.body.push.follow).toBe(false);
    expect(off.body.email.follow).toBe(false);
    await api(c, "DELETE", `/members/${nour.id}/follow`, { token: ali.token });
    await api(c, "PUT", `/members/${nour.id}/follow`, { token: ali.token });
    expect(pushed).toHaveLength(1);
    // Still listed, and still emailed as chosen: push is its own choice.
    expect((await api<{ items: { kind: string }[] }>(c, "GET", "/notifications", { token: nour.token })).body.items.filter((n) => n.kind === "follow")).toHaveLength(2);

    await api(c, "PUT", "/notifications/settings", { token: nour.token, body: { push: { follow: true } } });
    expect((await api(c, "DELETE", "/me/push-tokens", { token: nour.token })).status).toBe(204);
    await api(c, "DELETE", `/members/${nour.id}/follow`, { token: ali.token });
    await api(c, "PUT", `/members/${nour.id}/follow`, { token: ali.token });
    expect(pushed).toHaveLength(1);

    // Signed out: the phone's token is forgotten with its session.
    await api(c, "PUT", "/me/push-tokens", { token: nour.token, body: { token: PHONE("nour2"), platform: "ios" } });
    expect((await api(c, "POST", "/auth/log-out", { token: nour.token })).status).toBe(204);
    await api(c, "DELETE", `/members/${nour.id}/follow`, { token: ali.token });
    await api(c, "PUT", `/members/${nour.id}/follow`, { token: ali.token });
    expect(pushed).toHaveLength(1);
  });

  it("a token Firebase no longer knows is dropped; without push set up nothing is sent and nothing fails", async () => {
    await api(c, "PUT", "/me/push-tokens", { token: nour.token, body: { token: PHONE("old"), platform: "android" } });
    deadTokens.add(PHONE("old"));
    await api(c, "PUT", `/members/${nour.id}/follow`, { token: ali.token });
    expect(await c.deps.store.engage.devicesOf([nour.id])).toEqual([]);
    c.deps.push = null;
    await api(c, "PUT", "/me/push-tokens", { token: nour.token, body: { token: PHONE("new"), platform: "android" } });
    expect((await api(c, "PUT", `/members/${ali.id}/follow`, { token: nour.token })).status).toBe(200);
  });
});

describe("233 points, levels and the leaderboard", () => {
  it("each thing done pays once, within the day's cap; taken back; the history newest first", async () => {
    for (let i = 0; i < 60; i++) await awardPoints(ctx(), { memberId: nour.id, reason: "post_liked", ref: `post-${i}` });
    expect(await awardPoints(ctx(), { memberId: nour.id, reason: "post_liked", ref: "post-1" })).toBe(0);
    expect((await c.deps.store.base.getMember(nour.id))!.points).toBe(50);
    expect(await awardPoints(ctx(), { memberId: nour.id, reason: "answer_accepted", ref: "a1" })).toBe(25);
    // Losing points is never capped.
    expect(await awardPoints(ctx(), { memberId: nour.id, reason: "answer_downvoted", ref: "a9" })).toBe(-2);
    expect(await takeBackPoints(ctx(), { memberId: nour.id, reason: "answer_downvoted", ref: "a9" })).toBe(-2);
    expect((await c.deps.store.base.getMember(nour.id))!.points).toBe(75);

    const mine = await api<{ points: number; week_points: number; level: { key: string; label: string; next_at: number | null }; items: { action: string; points: number; target_type: string | null }[]; next_cursor: string | null }>(c, "GET", "/me/points?limit=50", { token: nour.token, lang: "en" });
    expect(mine.body).toMatchObject({ points: 75, week_points: 75, level: { key: "member", label: "Member", next_at: 250 } });
    expect(mine.body.items).toContainEqual(expect.objectContaining({ action: "answer_accepted", points: 25, target_type: "answer", target_id: "a1" }));
    expect(mine.body.items).toHaveLength(50);
    expect(mine.body.next_cursor).toBe("50");
  });

  it("the board this week (from Monday, UTC) and all time, with the reader's own place", async () => {
    await awardPoints(ctx(), { memberId: ali.id, reason: "answer_accepted", ref: "a1" });
    await awardPoints(ctx(), { memberId: nour.id, reason: "tutorial_published", ref: "t1" });
    // Last week's: all time only.
    await c.deps.store.engage.addPoints({ tenantId: "yallapp", memberId: ali.id, reason: "answer_accepted", points: 100, ref: "old", createdAt: new Date(weekStart(NOW).getTime() - DAY) });
    const week = await api<{ items: { rank: number; member: { id: string }; points: number }[]; me: { rank: number; points: number } }>(c, "GET", "/leaderboard", { token: ali.token });
    expect(week.body.items.map((r) => [r.rank, r.member.id, r.points])).toEqual([
      [1, nour.id, 50],
      [2, ali.id, 25],
    ]);
    expect(week.body.me).toEqual({ rank: 2, points: 25 });
    const all = await api<{ items: { member: { id: string }; points: number }[]; me: unknown }>(c, "GET", "/leaderboard?period=all");
    expect(all.body.items.map((r) => [r.member.id, r.points])).toEqual([
      [ali.id, 125],
      [nour.id, 50],
    ]);
    expect(all.body.me).toBeNull();
    expect((await api(c, "GET", "/leaderboard?period=month")).status).toBe(400);
  });

  it("the admins edit the points table (logged with before and after); members can't; the levels come with their names", async () => {
    expect((await api(c, "GET", "/admin/points", { token: nour.token })).status).toBe(403);
    const table = await api<{ actions: { action: string; points: number; daily_cap: number | null }[]; levels: { key: string; name: { ar: string } }[] }>(c, "GET", "/admin/points", { token: admin.token });
    expect(table.body.actions).toContainEqual({ action: "post_liked", points: 1, daily_cap: 50 });
    expect(table.body.levels[0]).toMatchObject({ key: "newcomer", name: { ar: "عضو جديد" } });
    const changed = await api<{ actions: { action: string; points: number; daily_cap: number | null }[] }>(c, "PUT", "/admin/points", { token: admin.token, body: { actions: [{ action: "post_liked", points: 2, daily_cap: 4 }] } });
    expect(changed.body.actions).toContainEqual({ action: "post_liked", points: 2, daily_cap: 4 });
    expect((await api(c, "PUT", "/admin/points", { token: admin.token, body: { actions: [{ action: "made_up", points: 5 }] } })).status).toBe(400);
    expect((await api(c, "PUT", "/admin/points", { token: admin.token, body: { actions: [{ action: "post_liked", points: 2, daily_cap: 0 }] } })).status).toBe(400);
    for (let i = 0; i < 5; i++) await awardPoints(ctx(), { memberId: ali.id, reason: "post_liked", ref: `p${i}` });
    expect((await c.deps.store.base.getMember(ali.id))!.points).toBe(4);
    const log = await api<{ items: { action: string; details: { before: Record<string, { points: number }>; after: Record<string, { points: number }> } }[] }>(c, "GET", "/admin/audit-log?action=points.update", { token: admin.token });
    expect(log.body.items[0]!.details.before.post_liked!.points).toBe(1);
    expect(log.body.items[0]!.details.after.post_liked!.points).toBe(2);
  });
});

describe("233 challenges", () => {
  const CHALLENGE = { title: "Build a booking app", rules: "Make a booking app with Yallapp Studio this week and share it.", starts_at: at(-HOUR).toISOString(), ends_at: at(DAY).toISOString(), voting_ends_at: at(3 * DAY).toISOString(), reward_points: 200, reward_badge: "blue" };

  it("the admins post one; members enter once (a link), vote for others' entries; the winners get the points and the badge and are told", async () => {
    expect((await api(c, "POST", "/admin/challenges", { token: nour.token, body: CHALLENGE })).status).toBe(403);
    expect((await api(c, "POST", "/admin/challenges", { token: admin.token, body: { ...CHALLENGE, ends_at: at(-2 * HOUR).toISOString() } })).status).toBe(400);
    const made = await api<{ id: string; status: string; reward_points: number; entered: boolean }>(c, "POST", "/admin/challenges", { token: admin.token, body: CHALLENGE });
    expect(made.status).toBe(201);
    expect(made.body).toMatchObject({ status: "open", reward_points: 200, entered: false });
    const id = made.body.id;
    // The home card: the open one.
    expect((await api<{ items: { id: string }[] }>(c, "GET", "/challenges?status=open&limit=1")).body.items.map((x) => x.id)).toEqual([id]);

    const mine = await api<{ id: string; url: string; vote_count: number }>(c, "POST", `/challenges/${id}/entries`, { token: nour.token, body: { url: "https://nour.example/booking", note: "Made in two evenings" } });
    expect(mine.status).toBe(201);
    expect((await api(c, "POST", `/challenges/${id}/entries`, { token: nour.token, body: { url: "https://nour.example/again" } })).status).toBe(409);
    expect((await api(c, "POST", `/challenges/${id}/entries`, { token: ali.token, body: { url: "http://not-https.example" } })).status).toBe(400);
    expect((await api(c, "POST", `/challenges/${id}/entries`, { token: ali.token, body: {} })).status).toBe(400);
    const theirs = await api<{ id: string }>(c, "POST", `/challenges/${id}/entries`, { token: ali.token, body: { url: "https://ali.example/booking" } });
    expect((await api(c, "PUT", `/challenges/${id}/entries/${mine.body.id}/vote`, { token: nour.token })).status).toBe(403);
    expect((await api(c, "PUT", `/challenges/${id}/entries/${mine.body.id}/vote`, { token: ali.token })).body).toEqual({ count: 1, mine: true });
    expect((await api(c, "PUT", `/challenges/${id}/entries/${mine.body.id}/vote`, { token: admin.token })).body).toEqual({ count: 2, mine: true });
    expect((await api(c, "DELETE", `/challenges/${id}/entries/${mine.body.id}/vote`, { token: admin.token })).body).toEqual({ count: 1, mine: false });
    const entries = await api<{ items: { id: string; voted: boolean; member: { id: string } }[] }>(c, "GET", `/challenges/${id}/entries`, { token: ali.token });
    expect(entries.body.items.find((e) => e.id === mine.body.id)).toMatchObject({ voted: true, member: { id: nour.id } });
    expect((await api<{ entered: boolean; entry_count: number }>(c, "GET", `/challenges/${id}`, { token: nour.token })).body).toMatchObject({ entered: true, entry_count: 2 });

    // Too early for winners: entries still open.
    expect((await api(c, "PUT", `/admin/challenges/${id}/winners`, { token: admin.token, body: { entry_ids: [mine.body.id] } })).status).toBe(409);
    c.at(at(DAY + HOUR));
    const fresh = await joinWithEmail(c, "Staff Again");
    await makeYallappStaff(c, fresh.id);
    expect((await api(c, "PUT", `/challenges/${id}/entries/${theirs.body.id}/vote`, { token: (await joinWithEmail(c, "Late Voter")).token })).status).toBe(200);
    const won = await api<{ status: string; winners: { id: string; place: number }[] }>(c, "PUT", `/admin/challenges/${id}/winners`, { token: fresh.token, body: { entry_ids: [mine.body.id, theirs.body.id] } });
    expect(won.status).toBe(200);
    expect(won.body.winners.map((w) => [w.id, w.place])).toEqual([
      [mine.body.id, 1],
      [theirs.body.id, 2],
    ]);
    expect((await api(c, "PUT", `/admin/challenges/${id}/winners`, { token: fresh.token, body: { entry_ids: [mine.body.id] } })).status).toBe(409);
    expect((await c.deps.store.base.getMember(nour.id))!.points).toBe(200);
    const badges = await api<{ items: { kind: string }[] }>(c, "GET", `/admin/members/${nour.id}/badges`, { token: fresh.token });
    expect(JSON.stringify(badges.body)).toContain("blue");
    const told = await c.deps.store.trust.listNotifications(nour.id, { offset: 0, limit: 10 });
    expect(told.items.map((n) => n.kind)).toContain("challenge_won");
    const audit = await api<{ items: { action: string }[] }>(c, "GET", "/admin/audit-log?action=challenge.winners", { token: fresh.token });
    expect(audit.body.items).toHaveLength(1);
  });

  it("a new member's entry waits for review and isn't listed; it can be reported; a moderator's removal hides it", async () => {
    const made = await api<{ id: string }>(c, "POST", "/admin/challenges", { token: admin.token, body: CHALLENGE });
    const newcomer = await joinWithEmail(c, "New Member");
    const held = await api<{ id: string; status: string }>(c, "POST", `/challenges/${made.body.id}/entries`, { token: newcomer.token, body: { url: "https://new.example/app" } });
    expect(held.body.status).toBe("pending");
    expect((await api<{ items: unknown[] }>(c, "GET", `/challenges/${made.body.id}/entries`)).body.items).toEqual([]);
    const queue = await api<{ items: { id: string; target_type: string; target_id: string; preview: string }[] }>(c, "GET", "/admin/moderation", { token: admin.token });
    const item = queue.body.items.find((i) => i.target_id === held.body.id)!;
    expect(item).toMatchObject({ target_type: "challenge_submission", preview: expect.stringContaining("new.example") });
    expect((await api(c, "POST", `/admin/moderation/${item.id}`, { token: admin.token, body: { decision: "approve" } })).status).toBe(200);
    expect((await api<{ items: unknown[] }>(c, "GET", `/challenges/${made.body.id}/entries`)).body.items).toHaveLength(1);

    // Reported like any post, and removed from the queue.
    expect((await api(c, "POST", "/reports", { token: nour.token, body: { target_type: "challenge_submission", target_id: held.body.id, reason: "spam" } })).status).toBe(201);
    const reports = await api<{ items: { id: string; target_id: string }[] }>(c, "GET", "/admin/reports", { token: admin.token });
    expect(reports.body.items.map((r) => r.target_id)).toContain(held.body.id);
    expect((await api(c, "POST", `/admin/reports/${reports.body.items[0]!.id}`, { token: admin.token, body: { status: "actioned" } })).status).toBe(200);
    expect((await api<{ items: unknown[] }>(c, "GET", `/challenges/${made.body.id}/entries`)).body.items).toEqual([]);
  });
});

describe("234 events and live sessions", () => {
  const ONLINE = { title: "Studio office hours", description: "Ask the team anything about Studio.", kind: "online", starts_at: at(2 * DAY).toISOString(), join_url: "https://meet.example/yallapp", time_zone: "Europe/Istanbul" };

  it("the admins make one; members say they're going (up to its places), see the join link only then, and download it for their calendar", async () => {
    expect((await api(c, "POST", "/admin/events", { token: nour.token, body: ONLINE })).status).toBe(403);
    expect((await api(c, "POST", "/admin/events", { token: admin.token, body: { ...ONLINE, join_url: null } })).status).toBe(400);
    expect((await api(c, "POST", "/admin/events", { token: admin.token, body: { ...ONLINE, time_zone: "Mars/Olympus" } })).status).toBe(400);
    const made = await api<{ id: string; ends_at: string; join_url: string | null; going_count: number; live_now: boolean }>(c, "POST", "/admin/events", { token: admin.token, body: { ...ONLINE, capacity: 1 } });
    expect(made.status).toBe(201);
    // Without an end: an hour long.
    expect(made.body.ends_at).toBe(at(2 * DAY + HOUR).toISOString());
    const id = made.body.id;
    expect((await api<{ join_url: string | null }>(c, "GET", `/events/${id}`, { token: nour.token })).body.join_url).toBeNull();
    const going = await api<{ going: boolean; going_count: number; join_url: string | null }>(c, "PUT", `/events/${id}/rsvp`, { token: nour.token });
    expect(going.body).toMatchObject({ going: true, going_count: 1, join_url: "https://meet.example/yallapp" });
    const full = await api<{ error: { code: string } }>(c, "PUT", `/events/${id}/rsvp`, { token: ali.token });
    expect(full.status).toBe(409);
    expect(full.body.error.code).toBe("event_full");
    expect((await api<{ items: { id: string }[] }>(c, "GET", `/events/${id}/attendees`)).body.items.map((m) => m.id)).toEqual([nour.id]);
    expect((await api<{ items: { id: string }[] }>(c, "GET", "/events")).body.items.map((e) => e.id)).toEqual([id]);

    const file = await handleCommunity(c.deps, { method: "GET", path: ["events", id, "ics"], query: new URLSearchParams(), body: undefined, form: null, token: null, acceptLanguage: null });
    expect(file.headers?.["content-type"]).toBe("text/calendar; charset=utf-8");
    expect(file.text).toContain("BEGIN:VEVENT");
    expect(file.text).toContain("SUMMARY:Studio office hours");
    expect(file.text).toContain(`DTSTART:${at(2 * DAY).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`);
    expect(file.text!.split("\r\n").every((line) => Buffer.byteLength(line) <= 75)).toBe(true);
  });

  it("a live session embeds YouTube's player, takes comments polled after the last one, and those going are reminded once each time and told of a cancellation", async () => {
    const live = await api<{ id: string; embed_url: string; live_now: boolean }>(c, "POST", "/admin/events", { token: admin.token, body: { title: "Launch live stream", kind: "live", starts_at: at(-10 * 60 * 1000).toISOString(), ends_at: at(HOUR).toISOString(), embed_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } });
    expect(live.body).toMatchObject({ embed_url: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", live_now: true });
    const first = await api<{ id: string }>(c, "POST", `/events/${live.body.id}/comments`, { token: nour.token, body: { body: "Hello from Istanbul" } });
    expect(first.status).toBe(201);
    await api(c, "POST", `/events/${live.body.id}/comments`, { token: ali.token, body: { body: "Hi everyone" } });
    expect((await api(c, "POST", `/events/${live.body.id}/comments`, { token: ali.token, body: { body: "" } })).status).toBe(400);
    const after = await api<{ items: { body: string; author: { id: string } }[] }>(c, "GET", `/events/${live.body.id}/comments?after=${first.body.id}`);
    expect(after.body.items.map((x) => x.body)).toEqual(["Hi everyone"]);

    // Reminders by email too, to a confirmed address.
    await c.deps.store.base.updateMember(nour.id, { emailVerified: true });
    const soon = await api<{ id: string }>(c, "POST", "/admin/events", { token: admin.token, body: { title: "Meetup in Istanbul", kind: "in_person", location: "Kadıköy, Istanbul", starts_at: at(20 * HOUR).toISOString() } });
    await api(c, "PUT", `/events/${soon.body.id}/rsvp`, { token: nour.token });
    expect(await runEventReminders(ctx())).toEqual({ day: 1, hour: 0 });
    expect(await runEventReminders(ctx())).toEqual({ day: 0, hour: 0 });
    expect(await runEventReminders({ ...ctx(), now: at(19.5 * HOUR) })).toEqual({ day: 0, hour: 1 });
    const kinds = async () => (await c.deps.store.trust.listNotifications(nour.id, { offset: 0, limit: 20 })).items.map((n) => n.kind);
    expect(await kinds()).toEqual(expect.arrayContaining(["event_tomorrow", "event_soon"]));
    expect(c.mail.sent.filter((m) => m.to.includes("nour")).map((m) => m.subject).join(" ")).toContain("Meetup in Istanbul");

    expect((await api(c, "DELETE", `/admin/events/${soon.body.id}`, { token: admin.token })).status).toBe(204);
    expect(await kinds()).toContain("event_cancelled");
    expect((await api<{ status: string }>(c, "GET", `/events/${soon.body.id}`)).body.status).toBe("cancelled");
    expect((await api(c, "PUT", `/events/${soon.body.id}/rsvp`, { token: ali.token })).status).toBe(409);
  });
});

describe("233 the academy's checkout (website only, Yallapp's own checkout)", () => {
  let grants: string[];
  let paidRefs: Set<string>;
  const shop = (): CourseShop => ({
    price: async (_ctx, id) => (id === "c-paid" ? { title: "Studio from zero", slug: "studio-from-zero", amountMinor: 1900, currency: "USD", free: false } : id === "c-free" ? { title: "Free intro", slug: "intro", amountMinor: 0, currency: "USD", free: true } : null),
    owned: async (_ctx, memberId, courseId) => grants.includes(`${memberId}:${courseId}`),
    grant: async (_ctx, input) => void grants.push(`${input.memberId}:${input.courseId}`),
  });
  const gateway = (provider: "kashier" | "iyzico" = "kashier"): CourseCheckoutGateway => ({
    account: { provider, keys: {} } as never,
    egpPerUsd: 50,
    start: async (_a, request) => ({ url: `https://pay.example/${request.reference}`, providerRef: `ref-${request.reference}` }) as never,
    confirm: async (_a, expected) => ({ paid: paidRefs.has(expected.reference), paymentId: paidRefs.has(expected.reference) ? "pay-1" : null }) as never,
    callbackUrls: (p, token) => ({ returnUrl: `https://yallapp.test/api/pay/${p}/course/${token}`, webhookUrl: `https://yallapp.test/api/pay/${p}/course/${token}` }),
  });

  beforeEach(() => {
    grants = [];
    paidRefs = new Set();
    c.deps.courses = shop();
  });

  it("opens the gateway's page for the price (in pounds at the team's rate where the gateway takes pounds); paid, it unlocks the course once and sends a receipt", async () => {
    c.deps.courseCheckout = async () => gateway();
    let token = "";
    c.deps.courseCheckout = async () => ({ ...gateway(), callbackUrls: (p, t) => ((token = t), { returnUrl: `https://yallapp.test/api/pay/${p}/course/${t}`, webhookUrl: null }) });
    const started = await startCourseCheckout(ctx(), nour.id, "c-paid", { ip: "203.0.113.7" });
    expect(started).toMatchObject({ ok: true, url: expect.stringContaining("https://pay.example/crs-") });
    const order = (started as { order: { id: string; amountCents: number; currency: string } }).order;
    expect(order).toMatchObject({ amountCents: 95_000, currency: "EGP" });

    // Not paid yet: pending, the course stays locked.
    expect(await settleCourseOrder(ctx(), token, { provider: "kashier" })).toEqual({ status: "pending", path: "https://community.yallapp.test/academy/studio-from-zero?checkout=pending" });
    expect(grants).toEqual([]);
    paidRefs.add(`crs-${order.id}`);
    const both = await Promise.all([settleCourseOrder(ctx(), token, { provider: "kashier" }), settleCourseOrder(ctx(), token, { provider: "kashier" })]);
    expect(both.map((x) => x.status).sort()).toEqual(["already_paid", "paid"]);
    expect(both[0]!.path).toBe("https://community.yallapp.test/academy/studio-from-zero?checkout=done");
    expect(grants).toEqual([`${nour.id}:c-paid`]);
    const receipt = c.mail.sent.find((m) => m.subject.includes("Studio from zero"))!;
    expect(receipt.text).toContain("EGP");
    // A signature that doesn't match is refused, and a wrong token finds nothing.
    expect((await settleCourseOrder(ctx(), "not-a-token", { provider: "kashier" })).status).toBe("not_found");
    // Owned now: no second checkout.
    expect(await startCourseCheckout(ctx(), nour.id, "c-paid", { ip: "203.0.113.7" })).toMatchObject({ ok: false, status: 409, code: "already_owned" });
  });

  it("refuses a free course, an unknown one, and any course while Yallapp's checkout isn't set up; iyzico's refusal fails the order", async () => {
    c.deps.courseCheckout = async () => gateway();
    expect(await startCourseCheckout(ctx(), nour.id, "c-free", { ip: "203.0.113.7" })).toMatchObject({ ok: false, status: 409, code: "course_free" });
    expect(await startCourseCheckout(ctx(), nour.id, "c-none", { ip: "203.0.113.7" })).toMatchObject({ ok: false, status: 404 });
    c.deps.courseCheckout = async () => ({ ...gateway(), account: null });
    expect(await startCourseCheckout(ctx(), nour.id, "c-paid", { ip: "203.0.113.7" })).toMatchObject({ ok: false, status: 503, code: "checkout_unavailable" });
    let token = "";
    c.deps.courseCheckout = async () => ({ ...gateway("iyzico"), callbackUrls: (_p, t) => ((token = t), { returnUrl: `https://yallapp.test/api/pay/course/${t}`, webhookUrl: null }) });
    const started = await startCourseCheckout(ctx(), ali.id, "c-paid", { ip: "203.0.113.7" });
    // iyzico takes dollars.
    expect((started as { order: { currency: string; amountCents: number } }).order).toMatchObject({ currency: "USD", amountCents: 1900 });
    expect((await settleCourseOrder(ctx(), token, { provider: "iyzico", iyzicoToken: "t" })).status).toBe("failed");
    expect((await settleCourseOrder(ctx(), token, { provider: "iyzico", iyzicoToken: "t" })).status).toBe("failed");
    expect(grants).toEqual([]);
  });
});
