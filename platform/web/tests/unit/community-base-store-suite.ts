import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newMember } from "@/lib/community/base/accounts";
import type { CommunityStore } from "@/lib/community/store";
import { isDuplicate } from "@/lib/community/store/db";

/**
 * 231 Area A's data, the same on the memory store and on MySQL or MariaDB
 * (migration 0155): members and their unique email, username and Yallapp
 * account; identities; sessions; one-use email tokens; follows, friendships
 * (one per pair) and blocks; link requests; reports (once per member and
 * target).
 */
const NOW = new Date("2026-11-25T09:00:00.000Z");
const later = (ms: number) => new Date(NOW.getTime() + ms);

function member(name: string, extra: Partial<ReturnType<typeof newMember>> = {}) {
  const suffix = randomUUID().slice(0, 8);
  return { ...newMember({ email: `${name}-${suffix}@store.test`.toLowerCase(), emailVerified: false, passwordHash: null, displayName: name, username: `${name}.${suffix}`.toLowerCase(), language: "en", now: NOW }), ...extra };
}

export function communityBaseStoreSuite(make: () => CommunityStore) {
  it("231 keeps members with a unique email, username and Yallapp account", async () => {
    const s = make().base;
    const a = await s.createMember(member("Nour", { skills: ["Flutter", "Studio"], links: [{ label: "Site", url: "https://nour.test" }] }));
    expect(await s.getMember(a.id)).toMatchObject({ displayName: "Nour", skills: ["Flutter", "Studio"], links: [{ label: "Site", url: "https://nour.test" }], points: 0 });
    expect((await s.getMemberByEmail(a.email!.toUpperCase()))?.id).toBe(a.id);
    expect((await s.getMemberByUsername(a.username))?.id).toBe(a.id);
    await expect(s.createMember(member("Other", { email: a.email }))).rejects.toSatisfy(isDuplicate);
    await expect(s.createMember(member("Other", { username: a.username }))).rejects.toSatisfy(isDuplicate);
    const b = await s.createMember(member("Omar"));
    const userId = randomUUID();
    await s.updateMember(a.id, { yallappUserId: userId, linkedAt: NOW });
    expect((await s.getMemberByYallappUser(userId))?.id).toBe(a.id);
    await expect(s.updateMember(b.id, { yallappUserId: userId })).rejects.toSatisfy(isDuplicate);
    expect(await s.addPoints(a.id, 25)).toBe(25);
    expect(await s.addPoints(a.id, -5)).toBe(20);
    expect((await s.getMembers([b.id, "missing", a.id])).map((m) => m.id)).toEqual([b.id, a.id]);
    const found = await s.searchMembers("nou", 0, 10);
    expect(found.some((m) => m.id === a.id)).toBe(true);
    expect(found.some((m) => m.id === b.id)).toBe(false);
  });

  it("231 keeps identities, sessions and email tokens (used once, in time)", async () => {
    const s = make().base;
    const a = await s.createMember(member("Lina"));
    const subject = randomUUID();
    await s.addIdentity({ memberId: a.id, provider: "apple", subject, email: null, createdAt: NOW });
    expect(await s.getIdentity("apple", subject)).toMatchObject({ memberId: a.id });
    expect(await s.getIdentity("google", subject)).toBeNull();
    await expect(s.addIdentity({ memberId: a.id, provider: "apple", subject, email: null, createdAt: NOW })).rejects.toSatisfy(isDuplicate);
    const session = (id: string, n: number) => ({
      id,
      memberId: a.id,
      name: "iPhone",
      platform: "ios" as const,
      refreshHash: `r${n}${randomUUID().slice(0, 20)}`,
      refreshExpiresAt: later(60_000),
      accessHash: `a${n}${randomUUID().slice(0, 20)}`,
      accessExpiresAt: later(1000),
      sessionVersion: 1,
      createdAt: NOW,
      lastSeenAt: later(n),
    });
    const one = session(randomUUID(), 1);
    const two = session(randomUUID(), 2);
    await s.createSession(one);
    await s.createSession(two);
    expect((await s.getSessionByAccess(one.accessHash))?.id).toBe(one.id);
    expect((await s.getSessionByRefresh(two.refreshHash))?.id).toBe(two.id);
    expect((await s.listSessions(a.id)).map((x) => x.id)).toEqual([two.id, one.id]);
    await s.deleteSessions(a.id, two.id);
    expect((await s.listSessions(a.id)).map((x) => x.id)).toEqual([two.id]);
    const tokenHash = randomUUID().replace(/-/g, "");
    await s.createEmailToken({ tokenHash, memberId: a.id, purpose: "verify_email", expiresAt: later(60_000), usedAt: null, createdAt: NOW });
    expect(await s.useEmailToken(tokenHash, "reset_password", NOW)).toBeNull();
    expect(await s.useEmailToken(tokenHash, "verify_email", NOW)).toMatchObject({ memberId: a.id });
    expect(await s.useEmailToken(tokenHash, "verify_email", NOW)).toBeNull();
    const old = randomUUID().replace(/-/g, "");
    await s.createEmailToken({ tokenHash: old, memberId: a.id, purpose: "verify_email", expiresAt: later(-1), usedAt: null, createdAt: NOW });
    expect(await s.useEmailToken(old, "verify_email", NOW)).toBeNull();
  });

  it("231 keeps follows, friendships (one per pair) and blocks, newest first", async () => {
    const s = make().base;
    const [a, b, c] = await Promise.all([s.createMember(member("Aya")), s.createMember(member("Badr")), s.createMember(member("Cem"))]);
    await s.follow(a.id, b.id, NOW);
    await s.follow(a.id, b.id, NOW);
    await s.follow(c.id, b.id, later(1000));
    expect(await s.isFollowing(a.id, b.id)).toBe(true);
    expect(await s.isFollowing(b.id, a.id)).toBe(false);
    expect(await s.listFollowers(b.id, 0, 10)).toEqual([c.id, a.id]);
    expect(await s.listFollowers(b.id, 0, 1)).toEqual([c.id, a.id]);
    expect(await s.countFollowers(b.id)).toBe(2);
    expect(await s.listFollowing(a.id, 0, 10)).toEqual([b.id]);
    await s.unfollow(a.id, b.id);
    expect(await s.countFollowing(a.id)).toBe(0);

    const id = randomUUID();
    await s.createFriendship({ id, requesterId: a.id, addresseeId: b.id, status: "pending", createdAt: NOW, respondedAt: null });
    await expect(s.createFriendship({ id: randomUUID(), requesterId: b.id, addresseeId: a.id, status: "pending", createdAt: NOW, respondedAt: null })).rejects.toSatisfy(isDuplicate);
    expect((await s.getFriendshipBetween(b.id, a.id))?.id).toBe(id);
    expect((await s.listFriendRequests(b.id, "incoming", 0, 10)).map((f) => f.id)).toEqual([id]);
    expect((await s.listFriendRequests(a.id, "outgoing", 0, 10)).map((f) => f.id)).toEqual([id]);
    expect(await s.countIncomingFriendRequests(b.id)).toBe(1);
    await s.acceptFriendship(id, later(5));
    expect(await s.getFriendship(id)).toMatchObject({ status: "accepted", respondedAt: later(5) });
    expect(await s.listFriends(a.id, 0, 10)).toEqual([b.id]);
    expect(await s.listFriends(b.id, 0, 10)).toEqual([a.id]);
    expect(await s.countFriends(b.id)).toBe(1);
    await s.deleteFriendship(id);
    expect(await s.countFriends(a.id)).toBe(0);

    await s.block(a.id, c.id, NOW);
    await s.block(a.id, c.id, NOW);
    expect(await s.hasBlocked(a.id, c.id)).toBe(true);
    expect(await s.hasBlocked(c.id, a.id)).toBe(false);
    expect([...(await s.blockedEitherWay(c.id))]).toEqual([a.id]);
    expect(await s.listBlocked(a.id, 0, 10)).toEqual([c.id]);
    await s.unblock(a.id, c.id);
    expect((await s.blockedEitherWay(a.id)).size).toBe(0);
  });

  it("231 keeps Continue with Yallapp's requests: approved once in time, its code used once", async () => {
    const s = make().base;
    const hash = (x: string) => `${x}-${randomUUID()}`.padEnd(64, "0").slice(0, 64);
    const requestHash = hash("request");
    const codeHash = hash("code");
    await s.createYallappSignin({ requestHash, redirectUri: "yallappcommunity://auth/yallapp", codeChallenge: "c".repeat(43), clientState: "state-1234", yallappUserId: null, codeHash: null, expiresAt: later(600_000), approvedAt: null, usedAt: null, createdAt: NOW });
    expect(await s.getYallappSignin(requestHash)).toMatchObject({ redirectUri: "yallappcommunity://auth/yallapp", clientState: "state-1234", approvedAt: null });
    expect(await s.useYallappSignin(codeHash, NOW)).toBeNull();
    const userId = randomUUID();
    expect(await s.approveYallappSignin(requestHash, { yallappUserId: userId, codeHash, expiresAt: later(120_000) }, later(1000))).toBe(true);
    expect(await s.approveYallappSignin(requestHash, { yallappUserId: userId, codeHash: hash("again"), expiresAt: later(120_000) }, later(2000))).toBe(false);
    // Two exchanges at once: one wins.
    const both = await Promise.all([s.useYallappSignin(codeHash, later(3000)), s.useYallappSignin(codeHash, later(3000))]);
    expect(both.filter(Boolean)).toHaveLength(1);
    expect(both.find(Boolean)).toMatchObject({ yallappUserId: userId });
    // Past its time, a request isn't approved and a code isn't used.
    const late = hash("late");
    await s.createYallappSignin({ requestHash: late, redirectUri: "yallappcommunity://auth/yallapp", codeChallenge: "c".repeat(43), clientState: "state-1234", yallappUserId: null, codeHash: null, expiresAt: later(1000), approvedAt: null, usedAt: null, createdAt: NOW });
    expect(await s.approveYallappSignin(late, { yallappUserId: userId, codeHash: hash("late-code"), expiresAt: later(120_000) }, later(5000))).toBe(false);
  });

  it("231 keeps link requests and reports (once per member and target); a deleted member takes theirs along", async () => {
    const s = make().base;
    const [a, b] = await Promise.all([s.createMember(member("Dina")), s.createMember(member("Ece"))]);
    const stateHash = randomUUID().replace(/-/g, "");
    await s.createLinkRequest({ stateHash, memberId: a.id, expiresAt: later(1000), confirmedAt: null, createdAt: NOW });
    await s.confirmLinkRequest(stateHash, later(5));
    expect(await s.getLinkRequest(stateHash)).toMatchObject({ memberId: a.id, confirmedAt: later(5) });
    const report = { id: randomUUID(), reporterId: a.id, targetType: "member" as const, targetId: b.id, reason: "spam" as const, note: "", status: "open" as const, handledBy: null, handledAt: null, createdAt: NOW };
    expect(await s.createReport(report)).toMatchObject({ id: report.id });
    expect(await s.createReport({ ...report, id: randomUUID() })).toBeNull();
    expect(await s.countReportsOn("member", b.id)).toBe(1);
    expect((await s.listReports("open", 0, 50)).some((r) => r.id === report.id)).toBe(true);
    await s.updateReport(report.id, { status: "dismissed", handledBy: b.id, handledAt: later(9) });
    expect(await s.getReport(report.id)).toMatchObject({ status: "dismissed", handledAt: later(9) });
    await s.follow(a.id, b.id, NOW);
    await s.deleteMember(a.id);
    expect(await s.getMember(a.id)).toBeNull();
    expect(await s.countFollowers(b.id)).toBe(0);
    expect(await s.getReport(report.id)).toBeNull();
  });
}
