import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App, ChatMessage, MediaFile } from "@/lib/data/types";

/**
 * 77 The chat's store methods, the same on the memory store and on MySQL or
 * MariaDB (migration 0052): members, conversations made once even when asked
 * twice at once, messages in order with `client_id` kept once, unread counts,
 * blocks, reports, retention and deleting a person.
 */

const NOW = new Date("2026-10-22T09:00:00.000Z");
const DAY = 86_400_000;

export function chatStoreSuite(store: () => DataStore) {
  async function app(): Promise<App> {
    const s = store();
    const { client } = await registerClient(s, { name: "Ada", email: `ada-${randomUUID()}@chat.test`, whatsapp: "+905446731942", siteUrl: "", password: null }, NOW);
    const created: App = { ...newApp(client.id, null, NOW, "lms"), backend: "hosted", chatSettings: { enabled: true, courseGroups: true } };
    await s.createApp(created);
    return created;
  }
  const member = (appId: string, externalId: string, name = `Person ${externalId}`) => store().upsertChatMember({ appId, source: "hosted", externalId, name, imageUrl: null }, NOW);
  const message = (appId: string, conversationId: string, memberId: string | null, text: string, at: Date, clientId: string | null = null): Omit<ChatMessage, "id"> => ({
    appId,
    conversationId,
    senderKind: memberId ? "member" : "business",
    memberId,
    teamUserId: memberId ? null : "team-1",
    teamName: memberId ? null : "Selin",
    clientId,
    text,
    mediaId: null,
    durationSeconds: null,
    deletedAt: null,
    createdAt: at,
  });

  it("keeps one member per person, and the chat's switches on the app", async () => {
    const s = store();
    const a = await app();
    expect((await s.getAppById(a.id))!.chatSettings).toEqual({ enabled: true, courseGroups: true });
    const first = await member(a.id, "7", "Deniz");
    const again = await s.upsertChatMember({ appId: a.id, source: "hosted", externalId: "7", name: "Deniz Aksoy", imageUrl: "https://x.test/a.jpg" }, NOW);
    expect(again.id).toBe(first.id);
    expect(again).toMatchObject({ name: "Deniz Aksoy", imageUrl: "https://x.test/a.jpg", blockedAt: null });
    // The same ID from a WordPress site is another person.
    expect((await s.upsertChatMember({ appId: a.id, source: "wordpress", externalId: "7", name: "WP", imageUrl: null }, NOW)).id).not.toBe(first.id);
    expect(await s.findChatMember(a.id, "hosted", "7")).toMatchObject({ id: first.id });
    expect(await s.setChatMemberBlocked(a.id, first.id, NOW, NOW)).toBe(true);
    expect((await s.getChatMember(a.id, first.id))!.blockedAt).toEqual(NOW);
    expect(await s.setChatMemberBlocked(a.id, randomUUID(), NOW, NOW)).toBe(false);
  });

  it("makes a person's conversation and a course's group once, even asked for twice at once", async () => {
    const s = store();
    const a = await app();
    const m = await member(a.id, "1");
    const [one, two] = await Promise.all([s.ensureDirectConversation(a.id, m.id, NOW), s.ensureDirectConversation(a.id, m.id, NOW)]);
    expect(one.id).toBe(two.id);
    expect(await s.getChatParticipant(one.id, m.id)).toMatchObject({ readId: null });
    const groups = await Promise.all([
      s.ensureGroupConversation({ appId: a.id, courseKey: "hosted:10", title: "Turkish", imageUrl: null }, NOW),
      s.ensureGroupConversation({ appId: a.id, courseKey: "hosted:10", title: "Turkish", imageUrl: null }, NOW),
    ]);
    expect(groups[0].id).toBe(groups[1].id);
    const renamed = await s.ensureGroupConversation({ appId: a.id, courseKey: "hosted:10", title: "Turkish 1", imageUrl: "https://x.test/c.jpg" }, NOW);
    expect(renamed).toMatchObject({ id: groups[0].id, title: "Turkish 1", imageUrl: "https://x.test/c.jpg" });
    const other = await s.ensureGroupConversation({ appId: a.id, courseKey: "hosted:20", title: "English", imageUrl: null }, NOW);

    await s.setMemberGroups(a.id, m.id, [groups[0].id, other.id], NOW);
    expect((await s.listMemberConversations(a.id, m.id)).map((r) => r.conversation.id).sort()).toEqual([one.id, groups[0].id, other.id].sort());
    await s.setMemberGroups(a.id, m.id, [other.id], NOW);
    expect((await s.listMemberConversations(a.id, m.id)).map((r) => r.conversation.id).sort()).toEqual([one.id, other.id].sort());
    expect((await s.listChatParticipants(other.id)).map((p) => p.memberId)).toEqual([m.id]);
    // Another app's conversation isn't this app's.
    expect(await s.getChatConversation((await app()).id, one.id)).toBeNull();
  });

  it("adds messages in order, once per client_id, and pages them both ways", async () => {
    const s = store();
    const a = await app();
    const m = await member(a.id, "1");
    const c = await s.ensureDirectConversation(a.id, m.id, NOW);
    const sent = await Promise.all([s.createChatMessage(message(a.id, c.id, m.id, "Hi", NOW, "client-1")), s.createChatMessage(message(a.id, c.id, m.id, "Hi", NOW, "client-1"))]);
    expect(sent.filter((r) => r.created)).toHaveLength(1);
    expect(sent[0].message.id).toBe(sent[1].message.id);
    const ids = [sent[0].message.id];
    for (let i = 2; i <= 5; i++) ids.push((await s.createChatMessage(message(a.id, c.id, i % 2 ? m.id : null, `M${i}`, new Date(NOW.getTime() + i * 1000), `client-${i}`))).message.id);
    expect([...ids].sort((x, y) => x - y)).toEqual(ids);
    const conversation = (await s.getChatConversation(a.id, c.id))!;
    expect(conversation.lastMessageId).toBe(ids[4]);
    expect(conversation.lastMessageAt).toEqual(new Date(NOW.getTime() + 5000));
    expect((await s.listChatMessages(c.id, { after: ids[1]!, limit: 2 })).map((x) => x.text)).toEqual(["M3", "M4"]);
    expect((await s.listChatMessages(c.id, { before: ids[3]!, limit: 10 })).map((x) => x.text)).toEqual(["M3", "M2", "Hi"]);
    expect((await s.listChatMessages(c.id, { limit: 2 })).map((x) => x.text)).toEqual(["M5", "M4"]);
    expect((await s.listChatMessages(c.id, { limit: 10, hideFrom: [m.id] })).map((x) => x.text)).toEqual(["M4", "M2"]);
    expect(await s.listChatConversations(a.id, { limit: 10 })).toHaveLength(1);

    // Unread: the member's place, and the business's.
    expect(await s.countChatUnread(c.id, null, { notFromMember: m.id })).toBe(2);
    await s.setChatRead(c.id, m.id, ids[3]!);
    await s.setChatRead(c.id, m.id, ids[1]!);
    expect((await s.getChatParticipant(c.id, m.id))!.readId).toBe(ids[3]);
    expect(await s.countChatUnread(c.id, ids[3]!, { notFromMember: m.id })).toBe(0);
    expect(await s.countChatUnread(c.id, null, { fromMembersOnly: true })).toBe(3);

    expect(await s.deleteChatMessage(a.id, ids[2]!, NOW)).toBe(true);
    expect(await s.deleteChatMessage(a.id, ids[2]!, NOW)).toBe(false);
    expect(await s.getChatMessage(a.id, ids[2]!)).toMatchObject({ text: null, mediaId: null, deletedAt: NOW });
    expect(await s.countChatUnread(c.id, null, { fromMembersOnly: true })).toBe(2);
  });

  it("reports once per person and message, and closes them together", async () => {
    const s = store();
    const a = await app();
    const [m, other] = [await member(a.id, "1"), await member(a.id, "2")];
    const g = await s.ensureGroupConversation({ appId: a.id, courseKey: "hosted:10", title: "T", imageUrl: null }, NOW);
    const { message: bad } = await s.createChatMessage(message(a.id, g.id, m.id, "spam", NOW));
    const report = (id: string, reporterId: string) => ({ id, appId: a.id, messageId: bad.id, conversationId: g.id, reporterId, reason: "spam" as const, note: null, status: "open" as const, outcome: null, closedBy: null, createdAt: NOW, closedAt: null });
    expect(await s.createChatReport(report(randomUUID(), other.id))).toBe(true);
    expect(await s.createChatReport(report(randomUUID(), other.id))).toBe(false);
    expect(await s.createChatReport(report(randomUUID(), m.id))).toBe(true);
    expect(await s.countOpenChatReports(a.id)).toBe(2);
    expect(await s.closeChatReports(a.id, bad.id, "deleted", "owner", NOW)).toBe(2);
    expect(await s.countOpenChatReports(a.id)).toBe(0);
    expect((await s.listChatReports(a.id, { status: "closed", limit: 10 }))[0]).toMatchObject({ status: "closed", outcome: "deleted", closedBy: "owner", closedAt: NOW });

    await s.setChatBlock(other.id, m.id, true, NOW);
    await s.setChatBlock(other.id, m.id, true, NOW);
    expect(await s.listChatBlocks(other.id)).toEqual([m.id]);
    await s.setChatBlock(other.id, m.id, false, NOW);
    expect(await s.listChatBlocks(other.id)).toEqual([]);
  });

  it("finds what is over a year old, skips what is kept, and deletes it with its files", async () => {
    const s = store();
    const a = await app();
    const m = await member(a.id, "1");
    const old = await s.ensureDirectConversation(a.id, m.id, NOW);
    const kept = await s.ensureDirectConversation(a.id, (await member(a.id, "2")).id, NOW);
    const media: MediaFile = { id: randomUUID(), appId: a.id, name: "a.jpg", kind: "image", contentType: "image/jpeg", sizeBytes: 10, storageKey: `${a.id}/x.jpg`, status: "ready", public: false, source: "chat", createdAt: NOW, updatedAt: NOW };
    await s.createMediaFile(media);
    expect((await s.getMediaFile(a.id, media.id))!.source).toBe("chat");
    await s.createChatMessage({ ...message(a.id, old.id, m.id, "", NOW), text: null, mediaId: media.id });
    await s.createChatMessage(message(a.id, old.id, m.id, "later", new Date(NOW.getTime() + 300 * DAY)));
    await s.createChatMessage(message(a.id, kept.id, null, "kept", NOW));
    await s.updateChatConversation(kept.id, { keepUntil: new Date(NOW.getTime() + 500 * DAY) });
    const at = new Date(NOW.getTime() + 366 * DAY);
    const yearAgo = new Date(at.getTime() - 365 * DAY);
    const due = await s.listChatConversationsWithMessagesBefore(yearAgo, 10, { appId: a.id, notKeptAt: at });
    expect(due.map((r) => r.conversation.id)).toEqual([old.id]);
    expect(due[0]!.oldest).toEqual(NOW);
    expect((await s.listChatConversationsWithMessagesBefore(yearAgo, 10, { appId: a.id })).map((r) => r.conversation.id).sort()).toEqual([old.id, kept.id].sort());
    expect(await s.deleteChatMessagesBefore(old.id, yearAgo)).toEqual([media.id]);
    expect((await s.listChatMessages(old.id, { limit: 10 })).map((x) => x.text)).toEqual(["later"]);
    expect((await s.getChatConversation(a.id, old.id))!.lastMessageId).not.toBeNull();
    expect(await s.clearChatConversation(a.id, old.id)).toEqual([]);
    expect((await s.getChatConversation(a.id, old.id))!.lastMessageId).toBeNull();
  });

  it("chat tokens end, unsent uploads are found, and a deleted person takes everything of theirs", async () => {
    const s = store();
    const a = await app();
    const m = await member(a.id, "1");
    const other = await member(a.id, "2");
    const c = await s.ensureDirectConversation(a.id, m.id, NOW);
    const g = await s.ensureGroupConversation({ appId: a.id, courseKey: "hosted:10", title: "T", imageUrl: null }, NOW);
    await s.setMemberGroups(a.id, m.id, [g.id], NOW);
    await s.setMemberGroups(a.id, other.id, [g.id], NOW);
    const hash = randomUUID().replace(/-/g, "");
    await s.createChatSession({ tokenHash: hash, appId: a.id, memberId: m.id, expiresAt: new Date(NOW.getTime() + 3600_000), createdAt: NOW });
    expect(await s.getChatSession(hash)).toMatchObject({ memberId: m.id });
    expect(await s.deleteExpiredChatSessions(new Date(NOW.getTime() + 3601_000))).toBeGreaterThanOrEqual(1);
    expect(await s.getChatSession(hash)).toBeNull();

    const files: MediaFile[] = [0, 1].map((i) => ({ id: randomUUID(), appId: a.id, name: `${i}.jpg`, kind: "image", contentType: "image/jpeg", sizeBytes: 10, storageKey: `${a.id}/${i}.jpg`, status: "ready", public: false, source: "chat", createdAt: NOW, updatedAt: NOW }));
    for (const f of files) {
      await s.createMediaFile(f);
      await s.createChatUpload({ mediaId: f.id, appId: a.id, memberId: m.id, durationSeconds: null, createdAt: NOW });
    }
    await s.createChatMessage({ ...message(a.id, g.id, m.id, "", NOW), text: null, mediaId: files[0]!.id });
    await s.createChatMessage(message(a.id, g.id, other.id, "stays", NOW));
    await s.createChatMessage(message(a.id, c.id, m.id, "mine", NOW));
    const unsent = await s.listUnsentChatUploads(new Date(NOW.getTime() + DAY), 100);
    expect(unsent).toContain(files[1]!.id);
    expect(unsent).not.toContain(files[0]!.id);
    // Deleting a Media file forgets its upload.
    await s.deleteMediaFile(a.id, files[1]!.id);
    expect(await s.getChatUpload(files[1]!.id)).toBeNull();

    expect((await s.listChatMediaOfMember(a.id, m.id)).sort()).toEqual([files[0]!.id]);
    await s.setChatBlock(other.id, m.id, true, NOW);
    await s.deleteChatMember(a.id, m.id);
    expect(await s.getChatMember(a.id, m.id)).toBeNull();
    expect(await s.getChatConversation(a.id, c.id)).toBeNull();
    expect((await s.listChatMessages(g.id, { limit: 10 })).map((x) => x.text)).toEqual(["stays"]);
    expect((await s.getChatConversation(a.id, g.id))!.lastMessageId).not.toBeNull();
    expect(await s.listChatBlocks(other.id)).toEqual([]);
    expect((await s.listChatParticipants(g.id)).map((p) => p.memberId)).toEqual([other.id]);
  });
}
