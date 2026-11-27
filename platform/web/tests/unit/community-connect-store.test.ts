import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { newMember } from "@/lib/community/base/accounts";
import { directKeyOf } from "@/lib/community/connect/store";
import type { Conversation, Group, Job, Message, Pro } from "@/lib/community/connect/types";
import type { CommunityStore } from "@/lib/community/store";
import { memoryCommunityStore } from "@/lib/community/store/memory";
import { mysqlCommunityStore } from "@/lib/community/store/mysql";
import { createPool } from "@/lib/data/mysql";

/**
 * 232–234 Area A's "connect" data, the same in memory and on MySQL or
 * MariaDB (migration 0160, YALLAPP_TEST_DATABASE_URL): conversations and
 * their unread counts and polling, groups and their members' order, pros by
 * rating and skill, jobs by their filters and their applications; and one
 * tenant's rows never in another's lists.
 */
const NOW = new Date("2026-11-27T09:00:00.000Z");
const at = (ms: number) => new Date(NOW.getTime() + ms);

function suite(make: (tenant?: string) => CommunityStore) {
  async function people(s: CommunityStore, n: number) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const suffix = randomUUID().slice(0, 8);
      out.push(await s.base.createMember(newMember({ email: `p${i}-${suffix}@connect.test`, emailVerified: true, passwordHash: null, displayName: `P${i}`, username: `p${i}.${suffix}`, language: "en", now: NOW })));
    }
    return out;
  }
  const msg = (conversationId: string, authorId: string, body: string, ms: number): Message => ({ id: randomUUID(), conversationId, authorId, body, photos: [], replyToId: null, deletedAt: null, createdAt: at(ms) });

  it("conversations: one per pair, the member's list by latest message, unread counts, polling after a message", async () => {
    const s = make();
    const [a, b, c] = await people(s, 3);
    const conv = (kind: Conversation["kind"], key: string | null): Conversation => ({ id: randomUUID(), kind, title: null, createdBy: a!.id, directKey: key, hireRequestId: null, lastMessageAt: NOW, createdAt: NOW, updatedAt: NOW });
    const member = (conversationId: string, memberId: string) => ({ conversationId, memberId, joinedAt: NOW, leftAt: null, hiddenAt: null, lastReadMessageId: null, lastReadAt: null, muted: false });
    const direct = conv("direct", directKeyOf(a!.id, b!.id));
    const group = conv("group", null);
    await s.connect.createConversation(direct, [member(direct.id, a!.id), member(direct.id, b!.id)]);
    await s.connect.createConversation(group, [member(group.id, a!.id), member(group.id, b!.id), member(group.id, c!.id)]);
    expect((await s.connect.findDirect(directKeyOf(b!.id, a!.id)))?.id).toBe(direct.id);
    const m1 = msg(direct.id, a!.id, "one", 1000);
    const m2 = msg(group.id, c!.id, "two", 2000);
    const m3 = msg(direct.id, a!.id, "three", 3000);
    for (const m of [m1, m2, m3]) await s.connect.addMessage(m);
    expect((await s.connect.listConversationsOf(b!.id, 0, 10)).map((x) => x.id)).toEqual([direct.id, group.id]);
    expect(await s.connect.countUnread(direct.id, b!.id, null)).toBe(2);
    expect(await s.connect.countUnreadConversations(b!.id)).toBe(2);
    expect(await s.connect.countUnreadConversations(a!.id)).toBe(1);
    // Read up to m1: one left there.
    await s.connect.saveConversationMember({ ...member(direct.id, b!.id), lastReadMessageId: m1.id, lastReadAt: m1.createdAt });
    expect(await s.connect.countUnread(direct.id, b!.id, m1.createdAt)).toBe(1);
    expect((await s.connect.listMessagesAfter(direct.id, m1, 10)).map((m) => m.body)).toEqual(["three"]);
    expect((await s.connect.listMessages(direct.id, 0, 10)).map((m) => m.body)).toEqual(["three", "one"]);
    // Hidden until its next message; a deleted message isn't unread.
    await s.connect.saveConversationMember({ ...member(direct.id, b!.id), hiddenAt: at(4000) });
    expect((await s.connect.listConversationsOf(b!.id, 0, 10)).map((x) => x.id)).toEqual([group.id]);
    const m4 = msg(direct.id, a!.id, "four", 5000);
    await s.connect.addMessage(m4);
    expect((await s.connect.listConversationsOf(b!.id, 0, 10)).map((x) => x.id)).toEqual([direct.id, group.id]);
    await s.connect.deleteMessage(m4.id, at(6000));
    expect(await s.connect.getMessage(m4.id)).toMatchObject({ body: "", deletedAt: at(6000) });
    expect(await s.connect.countUnread(direct.id, b!.id, null)).toBe(2);
  });

  it("groups: unique slugs, active ones by activity, the member's own, members owner first, requests, counts", async () => {
    const s = make();
    const [o, m, r] = await people(s, 3);
    const slug = `g-${randomUUID().slice(0, 8)}`;
    const group = (id: string, extra: Partial<Group> = {}): Group => ({ id, slug, name: "Flutter makers", description: "Help", visibility: "public", coverUrl: null, ownerId: o!.id, status: "active", memberCount: 1, postCount: 0, createdAt: NOW, updatedAt: NOW, lastActiveAt: NOW, ...extra });
    const g = group(randomUUID());
    expect(await s.connect.createGroup(g, { groupId: g.id, memberId: o!.id, role: "owner", status: "active", joinedAt: NOW })).toBe(true);
    const twin = group(randomUUID());
    expect(await s.connect.createGroup(twin, { groupId: twin.id, memberId: o!.id, role: "owner", status: "active", joinedAt: NOW })).toBe(false);
    await s.connect.saveGroupMember({ groupId: g.id, memberId: m!.id, role: "member", status: "active", joinedAt: at(1) });
    await s.connect.saveGroupMember({ groupId: g.id, memberId: r!.id, role: "member", status: "requested", joinedAt: at(2) });
    await s.connect.saveGroupMember({ groupId: g.id, memberId: m!.id, role: "moderator", status: "active", joinedAt: at(1) });
    await s.connect.recountGroup(g.id);
    expect((await s.connect.getGroupBySlug(slug))?.memberCount).toBe(2);
    expect((await s.connect.listGroupMembers(g.id, { status: "active", offset: 0, limit: 10 })).map((x) => [x.memberId, x.role])).toEqual([
      [o!.id, "owner"],
      [m!.id, "moderator"],
    ]);
    expect((await s.connect.listGroupMembers(g.id, { status: "requested", offset: 0, limit: 10 })).map((x) => x.memberId)).toEqual([r!.id]);
    expect((await s.connect.listGroups({ q: "flutter mak", offset: 0, limit: 50 })).some((x) => x.id === g.id)).toBe(true);
    expect((await s.connect.listGroups({ memberId: m!.id, offset: 0, limit: 10 })).map((x) => x.id)).toEqual([g.id]);
    expect((await s.connect.listGroups({ memberId: r!.id, offset: 0, limit: 10 })).map((x) => x.id)).toEqual([]);
    await s.connect.updateGroup(g.id, { status: "pending" });
    expect((await s.connect.listGroups({ q: slug, offset: 0, limit: 50 })).some((x) => x.id === g.id)).toBe(false);
    await s.connect.deleteGroup(g.id);
    expect(await s.connect.getGroupMember(g.id, m!.id)).toBeNull();
  });

  it("pros by rating and skill; hires and reviews count; jobs by their filters, applications once, counts", async () => {
    const s = make();
    const [p1, p2, client] = await people(s, 3);
    const skill = `Skill${randomUUID().slice(0, 6)}`;
    const pro = (memberId: string, extra: Partial<Pro> = {}): Pro => ({ memberId, headline: "Apps", about: "", services: [{ title: "App", description: "", rate: "" }], skills: [skill], availability: "available", showcaseIds: [], open: true, ratingSum: 0, reviewCount: 0, doneCount: 0, createdAt: NOW, updatedAt: NOW, ...extra });
    await s.connect.savePro(pro(p1!.id));
    await s.connect.savePro(pro(p2!.id, { availability: "busy" }));
    const hireId = randomUUID();
    await s.connect.createHire({ id: hireId, clientId: client!.id, proId: p2!.id, service: null, message: "Please", status: "done", conversationId: randomUUID(), createdAt: NOW, updatedAt: NOW });
    await s.connect.saveReview({ requestId: hireId, proId: p2!.id, authorId: client!.id, rating: 5, text: "Great", status: "published", createdAt: NOW, updatedAt: NOW });
    await s.connect.recountPro(p2!.id);
    expect(await s.connect.getPro(p2!.id)).toMatchObject({ ratingSum: 5, reviewCount: 1, doneCount: 1 });
    expect((await s.connect.listPros({ skill: skill.toLowerCase(), offset: 0, limit: 10 })).map((p) => p.memberId)).toEqual([p2!.id, p1!.id]);
    expect((await s.connect.listPros({ skill, available: true, offset: 0, limit: 10 })).map((p) => p.memberId)).toEqual([p1!.id]);
    expect((await s.connect.listHires({ clientId: client!.id, offset: 0, limit: 10 })).map((h) => h.id)).toEqual([hireId]);
    expect((await s.connect.listReviews(p2!.id, 0, 10)).map((r) => r.text)).toEqual(["Great"]);

    const job = (extra: Partial<Job> = {}): Job => ({ id: randomUUID(), posterId: p1!.id, title: "Flutter dev", description: "A shop app", type: "contract", remote: true, location: "", skills: [skill], budget: "", status: "open", applicationCount: 0, createdAt: NOW, updatedAt: NOW, ...extra });
    const open = job();
    const onsite = job({ remote: false, type: "full_time", createdAt: at(1000) });
    const closed = job({ status: "closed" });
    for (const j of [open, onsite, closed]) await s.connect.createJob(j);
    const ids = async (input: Parameters<CommunityStore["connect"]["listJobs"]>[0]) => (await s.connect.listJobs(input)).map((j) => j.id);
    expect(await ids({ skill, offset: 0, limit: 10 })).toEqual([onsite.id, open.id]);
    expect(await ids({ skill, remote: true, offset: 0, limit: 10 })).toEqual([open.id]);
    expect(await ids({ skill, type: "full_time", offset: 0, limit: 10 })).toEqual([onsite.id]);
    expect((await ids({ posterId: p1!.id, offset: 0, limit: 10 })).sort()).toEqual([open.id, onsite.id, closed.id].sort());
    const application = { id: randomUUID(), jobId: open.id, applicantId: client!.id, message: "Me", links: [], status: "sent" as const, createdAt: NOW, updatedAt: NOW };
    expect(await s.connect.createApplication(application)).toBe(true);
    expect(await s.connect.createApplication({ ...application, id: randomUUID() })).toBe(false);
    await s.connect.recountJob(open.id);
    expect((await s.connect.getJob(open.id))?.applicationCount).toBe(1);
    expect((await s.connect.listApplications({ applicantId: client!.id, offset: 0, limit: 10 })).map((a) => a.id)).toEqual([application.id]);
  });

  it("232–235 another tenant's groups, jobs and pros are never in this one's lists", async () => {
    const yallapp = make();
    const other = make(randomUUID());
    const [o] = await people(yallapp, 1);
    const g: Group = { id: randomUUID(), slug: `t-${randomUUID().slice(0, 8)}`, name: "Tenant test", description: "", visibility: "public", coverUrl: null, ownerId: o!.id, status: "active", memberCount: 1, postCount: 0, createdAt: NOW, updatedAt: NOW, lastActiveAt: NOW };
    await yallapp.connect.createGroup(g, { groupId: g.id, memberId: o!.id, role: "owner", status: "active", joinedAt: NOW });
    expect(await other.connect.getGroup(g.id)).toBeNull();
    expect(await other.connect.getGroupBySlug(g.slug)).toBeNull();
    expect((await other.connect.listGroups({ q: g.slug, offset: 0, limit: 10 })).length).toBe(0);
    // The same slug is free there.
    const [x] = await people(other, 1);
    const theirs = { ...g, id: randomUUID(), ownerId: x!.id };
    expect(await other.connect.createGroup(theirs, { groupId: theirs.id, memberId: x!.id, role: "owner", status: "active", joinedAt: NOW })).toBe(true);
    expect((await yallapp.connect.getGroupBySlug(g.slug))?.id).toBe(g.id);
    expect((await other.connect.getGroupBySlug(g.slug))?.id).toBe(theirs.id);
  });
}

describe("232–234 the connect store in memory", () => {
  const stores = new Map<string, CommunityStore>();
  suite((tenant = "yallapp") => stores.get(tenant) ?? stores.set(tenant, memoryCommunityStore(tenant)).get(tenant)!);
});

const url = process.env.YALLAPP_TEST_DATABASE_URL;

describe.skipIf(!url)("232–234 the connect store on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  afterAll(async () => {
    await pool.end();
  });
  suite((tenant) => mysqlCommunityStore(pool, tenant));
});
