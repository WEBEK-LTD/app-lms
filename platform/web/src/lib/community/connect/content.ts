import type { CommunityStore } from "../store";

/**
 * 232–234 Area A's content as area C's moderation sees it: groups, jobs,
 * pro reviews, and conversations reported as a whole. Who made it, a title
 * for the queue, where it opens, and the moderators' decision applied
 * (published, or hidden: a group or a job removed, a review hidden).
 */
export type ConnectKind = "group" | "job" | "review" | "conversation";

export const isConnectKind = (kind: string): kind is ConnectKind => kind === "group" || kind === "job" || kind === "review" || kind === "conversation";

export async function connectContentInfo(store: CommunityStore, kind: ConnectKind, id: string): Promise<{ authorId: string; title: string; link: string; removed: boolean } | null> {
  const c = store.connect;
  if (kind === "group") {
    const g = await c.getGroup(id);
    return g ? { authorId: g.ownerId, title: g.name, link: `/groups/${g.slug}`, removed: g.status === "removed" } : null;
  }
  if (kind === "job") {
    const j = await c.getJob(id);
    return j ? { authorId: j.posterId, title: j.title, link: `/jobs/${j.id}`, removed: j.status === "removed" } : null;
  }
  if (kind === "review") {
    const r = await c.getReview(id);
    return r ? { authorId: r.authorId, title: r.text.slice(0, 140) || `${r.rating}/5`, link: `/pros/${r.proId}`, removed: r.status === "hidden" } : null;
  }
  const conversation = await c.getConversation(id);
  if (!conversation) return null;
  // Reported as a whole: the moderators judge it by its messages, its starter as its "author".
  return { authorId: conversation.createdBy, title: conversation.title ?? "Conversation", link: `/admin/conversations/${conversation.id}`, removed: false };
}

export async function setConnectStatus(store: CommunityStore, kind: ConnectKind, id: string, status: "published" | "hidden", now: Date): Promise<void> {
  const c = store.connect;
  if (kind === "group") {
    const g = await c.getGroup(id);
    if (g) await c.updateGroup(id, { status: status === "published" ? "active" : "removed", updatedAt: now });
  } else if (kind === "job") {
    const j = await c.getJob(id);
    if (j) await c.updateJob(id, { status: status === "published" ? (j.status === "closed" ? "closed" : "open") : "removed", updatedAt: now });
  } else if (kind === "review") {
    const r = await c.getReview(id);
    if (r) {
      await c.saveReview({ ...r, status: status === "published" ? "published" : "hidden", updatedAt: now });
      await c.recountPro(r.proId);
    }
  }
  // A conversation stays as it is: the moderators act on its members (a suspension, a block).
}

/** A reported conversation's last messages (oldest first), for the moderator. */
export async function conversationTexts(store: CommunityStore, id: string, limit = 50): Promise<string[]> {
  const rows = await store.connect.listMessages(id, 0, limit);
  return rows
    .slice(0, limit)
    .reverse()
    .filter((m) => !m.deletedAt)
    .map((m) => m.body);
}
