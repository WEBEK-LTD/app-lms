import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { afterAll, describe, expect, it } from "vitest";
import { createPool } from "@/lib/data/mysql";
import * as communitySchema from "@/lib/db/community-schema";
import * as engageSchema from "@/lib/db/community-engage-schema";
import { communityMembers, communitySessions } from "@/lib/db/community-schema";
import { MemoryEngageStore, type EngageStore } from "@/lib/community/engage/store";
import { MysqlEngageStore } from "@/lib/community/engage/store-mysql";

/**
 * 232–235 Yallapp Community, area C's records for phases 2 to 5: the same
 * behaviour in memory and on MySQL or MariaDB (migration 0179). The MySQL
 * run needs YALLAPP_TEST_DATABASE_URL (a database with the migrations
 * applied); its tables are shared with other runs, so each test makes its
 * own tenant and members.
 */

const url = process.env.YALLAPP_TEST_DATABASE_URL;
const T0 = new Date("2026-12-01T12:00:00.000Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);
const DAY = 24 * 60;

type Make = () => Promise<{ store: EngageStore; member: () => Promise<string>; session: (memberId: string) => Promise<string> }>;

function suite(name: string, make: Make) {
  describe(name, () => {
    it("push devices: one token per session, replaced by a new one; the same phone under another session moves; removed by session or as invalid", async () => {
      const { store, member, session } = await make();
      const [a, b] = [await member(), await member()];
      const [sa1, sa2, sb] = [await session(a), await session(a), await session(b)];
      const tenantId = randomUUID();
      const tok = (n: string) => `tok-${n}-${"x".repeat(150)}`;
      await store.saveDevice({ sessionId: sa1, tenantId, memberId: a, token: tok("1"), platform: "android" }, at(0));
      await store.saveDevice({ sessionId: sa2, tenantId, memberId: a, token: tok("2"), platform: "ios" }, at(1));
      expect((await store.devicesOf([a])).map((d) => d.platform).sort()).toEqual(["android", "ios"]);
      // A new token for the same session replaces its old one.
      await store.saveDevice({ sessionId: sa1, tenantId, memberId: a, token: tok("1b"), platform: "android" }, at(2));
      expect((await store.devicesOf([a])).map((d) => d.token).sort()).toEqual([tok("1b"), tok("2")]);
      // The same phone signed in as b: it's b's now.
      await store.saveDevice({ sessionId: sb, tenantId, memberId: b, token: tok("2"), platform: "ios" }, at(3));
      expect((await store.devicesOf([a])).map((d) => d.token)).toEqual([tok("1b")]);
      expect((await store.devicesOf([b])).map((d) => d.token)).toEqual([tok("2")]);
      await store.removeSessionDevice(sa1);
      await store.removeTokens([tok("2")]);
      expect(await store.devicesOf([a, b])).toEqual([]);
    });

    it("points: once per member, reason and ref; taken back; today's gains; the board by tenant and since", async () => {
      const { store, member } = await make();
      const [a, b, c] = [await member(), await member(), await member()];
      const tenantId = randomUUID();
      const p = (memberId: string, reason: string, points: number, ref: string, minutes: number) => store.addPoints({ tenantId, memberId, reason, points, ref, createdAt: at(minutes) });
      expect(await p(a, "post_liked", 1, "x1", 0)).toBe(true);
      expect(await p(a, "post_liked", 1, "x1", 1)).toBe(false);
      await p(a, "post_liked", 1, "x2", 2);
      await p(a, "answer_downvoted", -2, "y1", 3);
      await p(b, "answer_accepted", 25, "z1", -8 * DAY);
      await p(c, "answer_accepted", 25, "z2", 5);
      await store.addPoints({ tenantId: randomUUID(), memberId: c, reason: "answer_accepted", points: 99, ref: "other", createdAt: at(5) });
      expect(await store.gainedSince(a, "post_liked", at(0))).toBe(2);
      expect(await store.gainsByReason(a, at(0))).toEqual({ post_liked: 2 });
      // All time: b and c have 25 each, b first (got there first); a has 0 and isn't on the board.
      expect(await store.board(tenantId, null, 0, 10)).toEqual([
        { memberId: b, points: 25 },
        { memberId: c, points: 25 },
      ]);
      // This week: only c.
      expect(await store.board(tenantId, at(-7 * DAY), 0, 10)).toEqual([{ memberId: c, points: 25 }]);
      expect(await store.memberTotal(tenantId, a, null)).toBe(0);
      expect(await store.aheadOf(tenantId, 0, null)).toBe(2);
      expect(await store.aheadOf(tenantId, 25, null)).toBe(0);
      // The history: newest first.
      expect((await store.history(a, 0, 2)).items.map((p) => [p.reason, p.points])).toEqual([["answer_downvoted", -2], ["post_liked", 1]]);
      expect((await store.history(a, 0, 2)).next).toBe(2);
      expect(await store.takePoints(c, "answer_accepted", "z2")).toBe(25);
      expect(await store.takePoints(c, "answer_accepted", "z2")).toBe(0);
      expect(await store.board(tenantId, null, 0, 10)).toEqual([{ memberId: b, points: 25 }]);
    });

    it("challenges: listed by stage from their dates; one entry per member; votes counted once; winners kept", async () => {
      const { store, member } = await make();
      const [a, b] = [await member(), await member()];
      const tenantId = randomUUID();
      const base = { tenantId, body: "Rules", rewardPoints: 100, rewardBadge: "blue" as const, coverUrl: null, status: "published" as const, winnersAt: null, createdBy: a, createdAt: at(0), updatedAt: at(0) };
      const open = await store.addChallenge({ ...base, title: "Open", startsAt: at(-60), submitUntil: at(60), voteUntil: at(120) });
      const soon = await store.addChallenge({ ...base, title: "Soon", startsAt: at(30), submitUntil: at(90), voteUntil: at(150) });
      const voting = await store.addChallenge({ ...base, title: "Voting", startsAt: at(-120), submitUntil: at(-10), voteUntil: at(60) });
      const over = await store.addChallenge({ ...base, title: "Over", startsAt: at(-300), submitUntil: at(-200), voteUntil: at(-100) });
      const ids = async (stage?: "upcoming" | "open" | "voting" | "closed") => (await store.listChallenges({ tenantId, stage, now: at(0), offset: 0, limit: 10 })).items.map((c) => c.id);
      expect(await ids("open")).toEqual([open.id]);
      expect(await ids("upcoming")).toEqual([soon.id]);
      expect(await ids("voting")).toEqual([voting.id]);
      expect(await ids("closed")).toEqual([over.id]);
      // Closed ones latest first: a cancelled one by its planned end.
      await store.updateChallenge(soon.id, { status: "cancelled" });
      expect(await ids("closed")).toEqual([soon.id, over.id]);
      expect((await store.listChallenges({ tenantId, now: at(0), offset: 0, limit: 2 })).next).toBe(2);

      const entry = (await store.addSubmission({ challengeId: open.id, memberId: a, showcaseId: null, url: "https://a.example/app", note: "", status: "published", createdAt: at(1) }))!;
      expect(await store.addSubmission({ challengeId: open.id, memberId: a, showcaseId: null, url: null, note: "Again", status: "published", createdAt: at(2) })).toBeNull();
      const other = (await store.addSubmission({ challengeId: open.id, memberId: b, showcaseId: randomUUID(), url: null, note: "Theirs", status: "published", createdAt: at(3) }))!;
      expect((await store.submissionOf(open.id, a))!.id).toBe(entry.id);
      expect(await store.submissionOf(soon.id, a)).toBeNull();
      const both = await Promise.all([store.addVote(other.id, a, at(4)), store.addVote(other.id, a, at(4))]);
      expect(both.filter(Boolean)).toHaveLength(1);
      expect((await store.getSubmission(other.id))!.votes).toBe(1);
      expect([...(await store.votedOf([entry.id, other.id], a))]).toEqual([other.id]);
      expect((await store.listSubmissions({ challengeId: open.id, sort: "top", offset: 0, limit: 10 })).items.map((s) => s.id)).toEqual([other.id, entry.id]);
      expect((await store.listSubmissions({ challengeId: open.id, sort: "new", offset: 0, limit: 10 })).items.map((s) => s.id)).toEqual([other.id, entry.id]);
      expect(await store.removeVote(other.id, a)).toBe(true);
      expect(await store.removeVote(other.id, a)).toBe(false);
      expect((await store.getSubmission(other.id))!.votes).toBe(0);
      await store.updateSubmission(entry.id, { status: "hidden" });
      expect(await store.countSubmissions(open.id)).toBe(1);
      expect((await store.listSubmissions({ challengeId: open.id, sort: "top", offset: 0, limit: 10, withHidden: true })).items).toHaveLength(2);
      expect(await store.updateSubmission(other.id, { place: 1, reward: { points: 100, badge: "blue" } })).toMatchObject({ place: 1, reward: { points: 100, badge: "blue" } });
      await store.deleteChallenge(over.id);
      expect(await store.getChallenge(over.id)).toBeNull();
    });

    it("events: upcoming soonest first, past latest first; RSVP once each; reminders due; comments polled after the last", async () => {
      const { store, member } = await make();
      const [a, b] = [await member(), await member()];
      const tenantId = randomUUID();
      const e = (title: string, starts: number, kind: "online" | "in_person" | "live" = "online", capacity: number | null = null) =>
        store.addEvent({ tenantId, groupId: null, kind, title, body: "", startsAt: at(starts), endsAt: at(starts + 60), capacity, timeZone: "Europe/Istanbul", location: null, joinUrl: null, embedUrl: null, replayUrl: null, coverUrl: null, status: "scheduled", createdBy: a, createdAt: at(0), updatedAt: at(0) });
      const later = await e("Later", 2 * DAY);
      const now = await e("Now", -30, "live");
      const past = await e("Past", -3 * DAY);
      const list = async (when: "upcoming" | "past", kind?: "live") => (await store.listEvents({ tenantId, when, kind, now: at(0), offset: 0, limit: 10 })).items.map((x) => x.id);
      expect(await list("upcoming")).toEqual([now.id, later.id]);
      expect(await list("upcoming", "live")).toEqual([now.id]);
      expect(await list("past")).toEqual([past.id]);

      const both = await Promise.all([store.addRsvp(later.id, a, at(1)), store.addRsvp(later.id, a, at(1))]);
      expect(both.filter(Boolean)).toHaveLength(1);
      await store.addRsvp(later.id, b, at(2));
      expect((await store.getEvent(later.id))!.rsvpCount).toBe(2);
      expect((await store.attendees(later.id, 0, 10)).items).toEqual([a, b]);
      expect([...(await store.rsvpOf([later.id, now.id], a))]).toEqual([later.id]);
      expect(await store.removeRsvp(later.id, a)).toBe(true);
      expect(await store.removeRsvp(later.id, a)).toBe(false);
      expect((await store.getEvent(later.id))!.rsvpCount).toBe(1);

      const due = (await store.eventsToRemind("day", at(DAY), at(3 * DAY))).filter((x) => x.tenantId === tenantId);
      expect(due.map((x) => x.id)).toEqual([later.id]);
      await store.updateEvent(later.id, { remindedDayAt: at(5) });
      expect((await store.eventsToRemind("day", at(DAY), at(3 * DAY))).filter((x) => x.tenantId === tenantId)).toEqual([]);

      // Two places: the third is refused, even when they all ask at once.
      const small = await e("Small", 3 * DAY, "in_person", 2);
      const c = await member();
      const asked = await Promise.all([store.addRsvp(small.id, a, at(1)), store.addRsvp(small.id, b, at(1)), store.addRsvp(small.id, c, at(1))]);
      expect(asked.filter((x) => x === true)).toHaveLength(2);
      expect(asked.filter((x) => x === "full")).toHaveLength(1);
      expect((await store.getEvent(small.id))!.rsvpCount).toBe(2);

      const c1 = await store.addEventComment({ eventId: now.id, memberId: a, body: "Hello", status: "published", createdAt: at(1) });
      const c2 = await store.addEventComment({ eventId: now.id, memberId: b, body: "Hidden", status: "pending", createdAt: at(2) });
      const c3 = await store.addEventComment({ eventId: now.id, memberId: b, body: "Hi", status: "published", createdAt: at(3) });
      expect((await store.listEventComments(now.id, { limit: 10 })).map((c) => c.id)).toEqual([c1.id, c3.id]);
      expect((await store.listEventComments(now.id, { after: c1.id, limit: 10 })).map((c) => c.id)).toEqual([c3.id]);
      await store.setEventCommentStatus(c2.id, "published");
      expect((await store.listEventComments(now.id, { after: c1.id, limit: 10 })).map((c) => c.id)).toEqual([c2.id, c3.id]);
      // Two in the same instant: the second goes a millisecond later, so polling after the first finds it.
      const s1 = await store.addEventComment({ eventId: later.id, memberId: a, body: "Same", status: "published", createdAt: at(10) });
      const s2 = await store.addEventComment({ eventId: later.id, memberId: b, body: "Instant", status: "published", createdAt: at(10) });
      expect(s2.createdAt.getTime()).toBe(s1.createdAt.getTime() + 1);
      expect((await store.listEventComments(later.id, { after: s1.id, limit: 10 })).map((x) => x.id)).toEqual([s2.id]);
      await store.deleteEvent(past.id);
      expect(await store.getEvent(past.id)).toBeNull();
    });

    it("course orders: found by their token; settled once, even by the redirect and the webhook at the same time", async () => {
      const { store, member } = await make();
      const m = await member();
      const order = await store.addOrder({ tenantId: randomUUID(), memberId: m, courseId: randomUUID(), amountCents: 1990, currency: "USD", provider: "kashier", providerRef: null, tokenHash: randomUUID().replace(/-/g, ""), status: "pending", createdAt: at(0), paidAt: null });
      expect((await store.getOrderByToken(order.tokenHash))!.id).toBe(order.id);
      await store.setOrderRef(order.id, "ref-1");
      const both = await Promise.all([store.settleOrder(order.id, { status: "paid", at: at(1) }), store.settleOrder(order.id, { status: "paid", at: at(1) })]);
      expect(both.filter(Boolean)).toHaveLength(1);
      expect(await store.getOrder(order.id)).toMatchObject({ status: "paid", paidAt: at(1), providerRef: "ref-1" });
      expect(await store.settleOrder(order.id, { status: "failed", at: at(2) })).toBeNull();
    });
  });
}

suite("232–235 the engage store in memory", async () => ({ store: new MemoryEngageStore(), member: async () => randomUUID(), session: async () => randomUUID() }));

describe.skipIf(!url)("232–235 the engage store on MySQL", () => {
  const pool = url ? createPool({ url, ssl: "disabled" }) : null;
  afterAll(async () => {
    await pool?.end();
  });
  suite("on its tables (0179)", async () => {
    const db = drizzle({ client: pool!, schema: { ...communitySchema, ...engageSchema }, mode: "default" });
    return {
      store: new MysqlEngageStore(db as never),
      member: async () => {
        const id = randomUUID();
        await db.insert(communityMembers).values({ id, email: `${id}@engage.test`, displayName: "Member", username: `m${id.slice(0, 8)}${id.slice(9, 13)}`, bio: "", skills: [], links: [], language: "en", createdAt: T0, updatedAt: T0, lastActiveAt: T0 });
        return id;
      },
      session: async (memberId: string) => {
        const id = randomUUID();
        await db.insert(communitySessions).values({ id, memberId, name: "Phone", platform: "android", refreshHash: randomUUID().replace(/-/g, ""), refreshExpiresAt: at(DAY), accessHash: randomUUID().replace(/-/g, ""), accessExpiresAt: at(60), sessionVersion: 0, createdAt: T0, lastSeenAt: T0 });
        return id;
      },
    };
  });
});
