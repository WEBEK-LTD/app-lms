import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { afterAll, describe, expect, it } from "vitest";
import { createPool } from "@/lib/data/mysql";
import * as communitySchema from "@/lib/db/community-schema";
import { communityMembers } from "@/lib/db/community-schema";
import { MemoryTrustStore, type TrustStore } from "@/lib/community/trust/store";
import { MysqlTrustStore } from "@/lib/community/trust/store-mysql";

/**
 * 231 Yallapp Community, area C: its store, the same behaviour in memory
 * and in MySQL or MariaDB (the base's migration 0155). The MySQL run needs
 * YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */

const url = process.env.YALLAPP_TEST_DATABASE_URL;
const T0 = new Date("2026-11-24T12:00:00.000Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

function suite(name: string, make: () => Promise<{ store: TrustStore; member: () => Promise<string> }>) {
  describe(name, () => {
    it("badges: added, listed oldest first, revoked once; members with automatic ones", async () => {
      const { store, member } = await make();
      const m = await member();
      const blue = await store.addMemberBadge({ memberId: m, badge: "blue", source: "auto", reason: null, grantedAt: at(0), grantedBy: null, expiresAt: null, details: null });
      const green = await store.addMemberBadge({ memberId: m, badge: "green", source: "manual", reason: "Partner", grantedAt: at(1), grantedBy: null, expiresAt: at(60), details: { companyName: "Kaya Apps", appUrl: "https://kaya.app" } });
      expect((await store.listMemberBadges(m)).map((b) => [b.badge, b.source, b.details])).toEqual([
        ["blue", "auto", null],
        ["green", "manual", { companyName: "Kaya Apps", appUrl: "https://kaya.app" }],
      ]);
      expect(await store.membersWithAutoBadges()).toContain(m);
      const twice = await Promise.all([store.revokeMemberBadge(blue.id, { at: at(2), by: null, reason: "inactive" }), store.revokeMemberBadge(blue.id, { at: at(2), by: null, reason: "again" })]);
      expect(twice.filter(Boolean)).toHaveLength(1);
      expect((await store.listMemberBadges(m))[0]).toMatchObject({ revokedAt: at(2), revokeReason: "inactive" });
      expect(await store.membersWithAutoBadges()).not.toContain(m);
      expect((await store.listMemberBadges(m))[1]!.expiresAt).toEqual(green.expiresAt);
    });

    it("verification: pending oldest first, decided once, the latest per member", async () => {
      const { store, member } = await make();
      const [a, b] = [await member(), await member()];
      const first = (await store.addVerification({ memberId: a, fullName: "Nour El Hoda", idProofKey: "community/id-proof/a.jpg", portfolioLinks: ["https://nour.dev"], apps: [{ appId: "1", name: "One" }], createdAt: at(0) }))!;
      await store.addVerification({ memberId: b, fullName: "Ali Kaya", idProofKey: "community/id-proof/b.pdf", portfolioLinks: [], apps: [], createdAt: at(1) });
      const pending = await store.listVerifications({ status: "pending", offset: 0, limit: 50 });
      const mine = pending.items.filter((r) => r.memberId === a || r.memberId === b);
      expect(mine.map((r) => r.fullName)).toEqual(["Nour El Hoda", "Ali Kaya"]);
      const twice = await Promise.all([store.decideVerification(first.id, { status: "approved", at: at(5), by: b, reason: "OK" }), store.decideVerification(first.id, { status: "rejected", at: at(5), by: b, reason: "No" })]);
      expect(twice.filter(Boolean)).toHaveLength(1);
      expect(await store.getVerification(first.id)).toMatchObject({ reviewedAt: at(5), reviewedBy: b, portfolioLinks: ["https://nour.dev"], apps: [{ appId: "1", name: "One" }] });
      expect((await store.latestVerification(a))!.id).toBe(first.id);
      expect(await store.latestVerification(randomUUID())).toBeNull();
    });

    it("verification: one request waiting per member, even two sent at once", async () => {
      const { store, member } = await make();
      const m = await member();
      const form = (n: number) => ({ memberId: m, fullName: "Sami Aydın", idProofKey: `community/id-proof/${n}.pdf`, portfolioLinks: [], apps: [], createdAt: at(n) });
      const both = await Promise.all([store.addVerification(form(1)), store.addVerification(form(2))]);
      expect(both.filter(Boolean)).toHaveLength(1);
      expect(await store.addVerification(form(3))).toBeNull();
      const waiting = both.find(Boolean)!;
      await store.decideVerification(waiting.id, { status: "rejected", at: at(4), by: m, reason: "Blurry" });
      expect(await store.addVerification(form(5))).not.toBeNull();
    });

    it("the audit log: newest first, by member and action, paged", async () => {
      const { store, member } = await make();
      const m = await member();
      for (let i = 0; i < 3; i++) await store.addAudit({ actorId: null, action: i === 2 ? "badge.revoke" : "badge.grant", memberId: m, targetType: "badge", targetId: `b${i}`, reason: `r${i}`, details: { i }, createdAt: at(i) });
      const page = await store.listAudit({ memberId: m, offset: 0, limit: 2 });
      expect(page.items.map((e) => e.reason)).toEqual(["r2", "r1"]);
      expect(page.next).toBe(2);
      expect((await store.listAudit({ memberId: m, offset: 2, limit: 2 })).next).toBeNull();
      expect((await store.listAudit({ memberId: m, action: "badge.revoke", offset: 0, limit: 10 })).items.map((e) => e.details)).toEqual([{ i: 2 }]);
    });

    it("settings: saved and read back whole", async () => {
      const { store, member } = await make();
      const by = await member();
      await store.saveSettingsDoc({ groups_create_policy: "chosen", groups_create_members: [by] }, { at: at(0), by });
      await store.saveSettingsDoc({ groups_create_policy: "badge_holders" }, { at: at(1), by });
      expect(await store.getSettingsDoc()).toEqual({ groups_create_policy: "badge_holders" });
    });

    it("moderation: open oldest first, decided once, open again for a new hold", async () => {
      const { store, member } = await make();
      const m = await member();
      const target = randomUUID();
      const item = await store.addModeration({ targetType: "question", targetId: target, authorId: m, cause: "first_posts", note: "new_member", createdAt: at(0) });
      expect((await store.openModeration("question", target))!.id).toBe(item.id);
      const twice = await Promise.all([store.decideModeration(item.id, { status: "approved", at: at(1), by: m, note: null }), store.decideModeration(item.id, { status: "removed", at: at(1), by: m, note: "x" })]);
      expect(twice.filter(Boolean)).toHaveLength(1);
      expect(await store.openModeration("question", target)).toBeNull();
      const again = await store.addModeration({ targetType: "question", targetId: target, authorId: m, cause: "first_posts", note: "new_member", createdAt: at(2) });
      expect(again.status).toBe("open");
      expect((await store.openModeration("question", target))!.id).toBe(again.id);
    });

    it("violations: the latest one's time", async () => {
      const { store, member } = await make();
      const m = await member();
      expect(await store.lastViolationAt(m)).toBeNull();
      await store.addViolation({ memberId: m, kind: "content_removed", targetType: "answer", targetId: "a1", createdBy: null, createdAt: at(3) });
      await store.addViolation({ memberId: m, kind: "suspended", targetType: "member", targetId: m, createdBy: null, createdAt: at(1) });
      expect(await store.lastViolationAt(m)).toEqual(at(3));
    });

    it("reports: once per member and target, counted, closed once", async () => {
      const { store, member } = await make();
      const [a, b] = [await member(), await member()];
      const target = randomUUID();
      const r1 = await store.addReport({ reporterId: a, targetType: "answer", targetId: target, reason: "spam", note: "", createdAt: at(0) });
      expect(r1).not.toBeNull();
      expect(await store.addReport({ reporterId: a, targetType: "answer", targetId: target, reason: "hate", note: "", createdAt: at(1) })).toBeNull();
      await store.addReport({ reporterId: b, targetType: "answer", targetId: target, reason: "harassment", note: "Rude", createdAt: at(2) });
      expect(await store.countOpenReports("answer", target)).toBe(2);
      expect((await store.openReportsOn("answer", target)).map((r) => r.reporterId)).toEqual([a, b]);
      const twice = await Promise.all([store.resolveReport(r1!.id, { status: "actioned", at: at(3), by: b }), store.resolveReport(r1!.id, { status: "dismissed", at: at(3), by: b })]);
      expect(twice.filter(Boolean)).toHaveLength(1);
      expect(await store.countOpenReports("answer", target)).toBe(1);
    });

    it("notifications: newest first, unread counted, marked read (listed or all), emailed, email choices", async () => {
      const { store, member } = await make();
      const m = await member();
      const one = await store.addNotification({ memberId: m, kind: "follow", actorId: null, targetType: "member", targetId: m, data: { actor: "Ali", link: "/u/ali" }, createdAt: at(0) });
      await store.addNotification({ memberId: m, kind: "answer", actorId: null, targetType: "question", targetId: "q1", data: { actor: "Ali", title: "Fonts?", link: "/q/1" }, createdAt: at(1) });
      const list = await store.listNotifications(m, { offset: 0, limit: 10 });
      expect(list.items.map((n) => [n.kind, n.data.link])).toEqual([
        ["answer", "/q/1"],
        ["follow", "/u/ali"],
      ]);
      expect(await store.unreadNotifications(m)).toBe(2);
      expect(await store.markNotificationsRead(m, [one.id], at(2))).toBe(1);
      expect((await store.listNotifications(m, { unreadOnly: true, offset: 0, limit: 10 })).items.map((n) => n.kind)).toEqual(["answer"]);
      expect(await store.markNotificationsRead(m, "all", at(3))).toBe(1);
      expect(await store.unreadNotifications(m)).toBe(0);
      await store.markEmailed(one.id, at(4));
      expect((await store.listNotifications(m, { offset: 0, limit: 10 })).items[1]!.emailedAt).toEqual(at(4));
      expect(await store.getNotificationPrefs(m)).toBeNull();
      await store.saveNotificationPrefs(m, { follow: true }, at(5));
      await store.saveNotificationPrefs(m, { follow: true, answer: false }, at(6));
      expect(await store.getNotificationPrefs(m)).toEqual({ follow: true, answer: false });
    });
  });
}

suite("231 the trust store in memory", async () => ({ store: new MemoryTrustStore(), member: async () => randomUUID() }));

describe.skipIf(!url)("231 the trust store on MySQL", () => {
  const pool = url ? createPool({ url, ssl: "disabled" }) : null;
  afterAll(async () => {
    await pool?.end();
  });
  suite("on the base's tables (0155)", async () => {
    const db = drizzle({ client: pool!, schema: communitySchema, mode: "default" });
    return {
      store: new MysqlTrustStore(db as never),
      member: async () => {
        const id = randomUUID();
        await db.insert(communityMembers).values({ id, email: `${id}@trust.test`, displayName: "Member", username: `m${id.slice(0, 8)}${id.slice(9, 13)}`, bio: "", skills: [], links: [], language: "en", createdAt: T0, updatedAt: T0, lastActiveAt: T0 });
        return id;
      },
    };
  });
});
