import type { DataStore } from "../data/store";
import type { App, ChatConversation, ChatMember, ChatMessage, ChatSettings } from "../data/types";
import { fileUrl, PLAY_LINK_SECONDS } from "../media/files";
import { chatGroupsOn, chatSettingsOf, planHasChat } from "./access";
import { attachmentKind, messageInput, pageQuery, parseMessageId, pollAfterSeconds, removeChatFile, removeMessage, type ChatDeps, type ChatResult } from "./service";

/**
 * 77 The business's side of the chat: the dashboard's Chat page and Yallapp
 * Business (owner.yaml, "Chat") call these. The business answers as itself;
 * the team member who wrote is kept for the team only. Messages are deleted
 * a year after they were sent unless the business keeps their conversation.
 */

/** Messages are kept this long… */
export const CHAT_KEEP_DAYS = 365;
/** …and the business is told this long before. */
export const CHAT_NOTICE_DAYS = 30;
const DAY = 86_400_000;

type Fail = { ok: false; status: 400 | 403 | 404 | 409; code: string; message: string };
const fail = (status: Fail["status"], code: string, message: string): Fail => ({ ok: false, status, code, message });
const done = <T>(value: T): ChatResult<T> => ({ ok: true, value });

export interface OwnerMessageView {
  id: string;
  conversation_id: string;
  client_id: string | null;
  sender: { kind: "member" | "business"; member_id: string | null; name: string; team_member: string | null };
  text: string | null;
  attachment: { kind: "image" | "video" | "audio" | "file"; name: string; content_type: string; size_bytes: number; duration_seconds: number | null; url: string; media_id: string } | null;
  deleted: boolean;
  reported: boolean;
  created_at: string;
}

export interface MemberView {
  id: string;
  name: string;
  image_url: string | null;
  blocked: boolean;
}

export const memberView = (m: ChatMember): MemberView => ({ id: m.id, name: m.name, image_url: m.imageUrl, blocked: Boolean(m.blockedAt) });

/** Messages as the business sees them: who wrote each (also on the team), its file and whether it is reported. */
export async function ownerMessageViews(deps: Pick<ChatDeps, "store" | "storage" | "business">, app: App, messages: ChatMessage[]): Promise<OwnerMessageView[]> {
  const members = new Map((await deps.store.listChatMembersByIds(app.id, [...new Set(messages.map((m) => m.memberId).filter((id): id is string => Boolean(id)))])).map((m) => [m.id, m]));
  const reported = new Set((await deps.store.listChatReports(app.id, { status: "open", limit: 1000 })).map((r) => r.messageId));
  const out: OwnerMessageView[] = [];
  for (const m of messages) {
    const file = !m.deletedAt && m.mediaId ? await deps.store.getMediaFile(app.id, m.mediaId) : null;
    const link = file && file.status === "ready" && deps.storage ? fileUrl(deps.storage, file, { ttlSeconds: PLAY_LINK_SECONDS }) : null;
    out.push({
      id: String(m.id),
      conversation_id: m.conversationId,
      client_id: m.clientId,
      sender:
        m.senderKind === "business"
          ? { kind: "business", member_id: null, name: deps.business.name, team_member: m.teamName }
          : { kind: "member", member_id: m.memberId, name: members.get(m.memberId ?? "")?.name ?? "—", team_member: null },
      text: m.deletedAt ? null : m.text,
      attachment:
        file && link
          ? { kind: attachmentKind(file.kind), name: file.name, content_type: file.contentType, size_bytes: file.sizeBytes, duration_seconds: m.durationSeconds, url: link.url, media_id: file.id }
          : null,
      deleted: Boolean(m.deletedAt),
      reported: reported.has(m.id),
      created_at: m.createdAt.toISOString(),
    });
  }
  return out;
}

/** When a conversation's oldest messages are deleted: a year after they were sent, or the day the business keeps it to. */
export function expiresOn(oldest: Date | null, keepUntil: Date | null): Date | null {
  if (!oldest) return null;
  const due = new Date(oldest.getTime() + CHAT_KEEP_DAYS * DAY);
  return keepUntil && keepUntil.getTime() > due.getTime() ? keepUntil : due;
}

export interface ThreadView {
  id: string;
  kind: "direct" | "group";
  title: string;
  image_url: string | null;
  member: MemberView | null;
  member_count?: number;
  last_message: OwnerMessageView | null;
  unread_count: number;
  updated_at: string;
  keep_until: string | null;
  expires_on: string | null;
}

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** The app's conversations for the business, with what is waiting (owner.yaml GET /apps/{app_id}/chat/conversations). */
export async function ownerConversations(
  deps: ChatDeps,
  app: App,
  input: { kind?: "direct" | "group"; unread?: boolean; q?: string; limit?: number },
): Promise<{ items: ThreadView[]; unread_count: number; open_reports: number; expiring: { conversations: number; delete_on: string | null } }> {
  const groups = chatGroupsOn(app);
  const all = (await deps.store.listChatConversations(app.id, { kind: input.kind, limit: 500 })).filter((c) => c.kind === "direct" || groups);
  const members = new Map((await deps.store.listChatMembersByIds(app.id, all.map((c) => c.memberId).filter((id): id is string => Boolean(id)))).map((m) => [m.id, m]));
  const oldest = new Map((await deps.store.listChatConversationsWithMessagesBefore(new Date(deps.now.getTime() + 1), 1000, { appId: app.id })).map((r) => [r.conversation.id, r.oldest]));
  const lasts: ChatMessage[] = [];
  for (const c of all) {
    const message = c.lastMessageId !== null ? await deps.store.getChatMessage(app.id, c.lastMessageId) : null;
    if (message) lasts.push(message);
  }
  const views = new Map((await ownerMessageViews(deps, app, lasts)).map((v) => [Number(v.id), v]));
  const q = input.q?.trim().toLowerCase() ?? "";
  const soon = deps.now.getTime() + CHAT_NOTICE_DAYS * DAY;
  let unreadTotal = 0;
  let expiringCount = 0;
  let firstDelete: Date | null = null;
  const items: ThreadView[] = [];
  for (const c of all) {
    const member = c.memberId ? (members.get(c.memberId) ?? null) : null;
    const title = c.kind === "direct" ? (member?.name ?? "—") : (c.title ?? "");
    const unread = await deps.store.countChatUnread(c.id, c.businessReadId, { fromMembersOnly: true });
    unreadTotal += unread;
    const expires = expiresOn(oldest.get(c.id) ?? null, c.keepUntil);
    if (expires && expires.getTime() <= soon) {
      expiringCount += 1;
      if (!firstDelete || expires.getTime() < firstDelete.getTime()) firstDelete = expires;
    }
    if (q && !title.toLowerCase().includes(q)) continue;
    if (input.unread && unread === 0) continue;
    items.push({
      id: c.id,
      kind: c.kind,
      title,
      image_url: c.kind === "direct" ? (member?.imageUrl ?? null) : c.imageUrl,
      member: member ? memberView(member) : null,
      ...(c.kind === "group" ? { member_count: (await deps.store.listChatParticipants(c.id)).length } : {}),
      last_message: c.lastMessageId !== null ? (views.get(c.lastMessageId) ?? null) : null,
      unread_count: unread,
      updated_at: (c.lastMessageAt ?? c.createdAt).toISOString(),
      keep_until: day(c.keepUntil),
      expires_on: day(expires),
    });
  }
  return {
    items: items.slice(0, input.limit ?? 200),
    unread_count: unreadTotal,
    open_reports: await deps.store.countOpenChatReports(app.id),
    expiring: { conversations: expiringCount, delete_on: day(firstDelete) },
  };
}

async function conversationOf(deps: Pick<ChatDeps, "store">, app: App, id: string): Promise<ChatConversation | null> {
  const conversation = await deps.store.getChatConversation(app.id, id);
  if (!conversation || (conversation.kind === "group" && !chatGroupsOn(app))) return null;
  return conversation;
}

export async function ownerMessages(deps: ChatDeps, app: App, conversationId: string, query: URLSearchParams) {
  const conversation = await conversationOf(deps, app, conversationId);
  if (!conversation) return fail(404, "not_found", "This conversation doesn't exist.");
  const page = pageQuery(query);
  if (!page) return fail(400, "invalid_request", "after, before and limit must be message IDs and a number from 1 to 100.");
  const rows = await deps.store.listChatMessages(conversation.id, { ...page.range, limit: page.limit + 1 });
  return done({
    conversation,
    items: await ownerMessageViews(deps, app, rows.slice(0, page.limit)),
    has_more: rows.length > page.limit,
    poll_after_seconds: pollAfterSeconds(conversation, deps.now),
  });
}

/** A reply as the business: text, a Media file of the app, or both. */
export async function ownerSend(
  deps: ChatDeps,
  app: App,
  conversationId: string,
  team: { userId: string; name: string },
  body: Record<string, unknown>,
): Promise<ChatResult<{ view: OwnerMessageView; created: boolean }>> {
  const conversation = await conversationOf(deps, app, conversationId);
  if (!conversation) return fail(404, "not_found", "This conversation doesn't exist.");
  const input = messageInput(body, "media_id");
  if (!input.ok) return input;
  if (input.value.uploadId) {
    const file = await deps.store.getMediaFile(app.id, input.value.uploadId);
    if (!file || file.status !== "ready") return fail(400, "invalid_request", "This file isn't in your Media library.");
  }
  const { message, created } = await deps.store.createChatMessage({
    appId: app.id,
    conversationId: conversation.id,
    senderKind: "business",
    memberId: null,
    teamUserId: team.userId,
    teamName: team.name.slice(0, 120),
    clientId: input.value.clientId,
    text: input.value.text,
    mediaId: input.value.uploadId,
    durationSeconds: null,
    deletedAt: null,
    createdAt: deps.now,
  });
  if (created) {
    await deps.store.updateChatConversation(conversation.id, { businessReadId: message.id });
    if (deps.onMessage) {
      try {
        await deps.onMessage({ app, conversation: { ...conversation, lastMessageId: message.id, lastMessageAt: message.createdAt }, message, sender: null });
      } catch (error) {
        console.error(`[chat] app ${app.id}: telling people about a reply failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  const [view] = await ownerMessageViews(deps, app, [message]);
  return done({ view: view!, created });
}

export async function ownerRead(deps: Pick<ChatDeps, "store">, app: App, conversationId: string, messageId: unknown): Promise<ChatResult<null>> {
  const conversation = await conversationOf(deps, app, conversationId);
  if (!conversation) return fail(404, "not_found", "This conversation doesn't exist.");
  const id = parseMessageId(messageId);
  if (id === null) return fail(400, "invalid_request", "Send the message_id read up to.");
  const upTo = Math.min(id, conversation.lastMessageId ?? 0);
  if (upTo > (conversation.businessReadId ?? 0)) await deps.store.updateChatConversation(conversation.id, { businessReadId: upTo });
  return done(null);
}

export async function ownerDeleteMessage(deps: ChatDeps, app: App, messageIdText: string, by: string): Promise<ChatResult<null>> {
  const id = parseMessageId(messageIdText);
  const message = id === null ? null : await deps.store.getChatMessage(app.id, id);
  if (!message || !(await conversationOf(deps, app, message.conversationId))) return fail(404, "not_found", "This message doesn't exist.");
  await removeMessage(deps, app, message);
  await deps.store.closeChatReports(app.id, message.id, "deleted", by, deps.now);
  return done(null);
}

/** Every message and file of a conversation goes; a group stays, empty. */
export async function ownerClearConversation(deps: ChatDeps, app: App, conversationId: string): Promise<ChatResult<null>> {
  const conversation = await conversationOf(deps, app, conversationId);
  if (!conversation) return fail(404, "not_found", "This conversation doesn't exist.");
  for (const mediaId of await deps.store.clearChatConversation(app.id, conversation.id)) await removeChatFile(deps, app, mediaId);
  await deps.store.updateChatConversation(conversation.id, { keepUntil: null, noticeFor: null, businessReadId: null });
  return done(null);
}

/** Keeps a conversation's messages, the oldest too, until a year from today. */
export async function ownerKeep(deps: Pick<ChatDeps, "store" | "now">, app: App, conversationId: string): Promise<ChatResult<ChatConversation>> {
  const conversation = await conversationOf(deps, app, conversationId);
  if (!conversation) return fail(404, "not_found", "This conversation doesn't exist.");
  const keepUntil = new Date(deps.now.getTime() + CHAT_KEEP_DAYS * DAY);
  await deps.store.updateChatConversation(conversation.id, { keepUntil });
  return done({ ...conversation, keepUntil });
}

/** Keeps every conversation whose messages would be deleted within 30 days. */
export async function ownerKeepExpiring(deps: Pick<ChatDeps, "store" | "now">, app: App): Promise<number> {
  const soon = deps.now.getTime() + CHAT_NOTICE_DAYS * DAY;
  const keepUntil = new Date(deps.now.getTime() + CHAT_KEEP_DAYS * DAY);
  let kept = 0;
  for (const { conversation, oldest } of await deps.store.listChatConversationsWithMessagesBefore(new Date(soon - CHAT_KEEP_DAYS * DAY), 1000, { appId: app.id, notKeptAt: new Date(soon) })) {
    const expires = expiresOn(oldest, conversation.keepUntil);
    if (!expires || expires.getTime() > soon) continue;
    await deps.store.updateChatConversation(conversation.id, { keepUntil });
    kept += 1;
  }
  if (kept > 0) await deps.store.resolveOwnerNotices(app.id, ["chat_expiring"], deps.now);
  return kept;
}

export async function ownerReports(deps: ChatDeps, app: App, status: "open" | "closed") {
  const reports = await deps.store.listChatReports(app.id, { status, limit: 200 });
  const members = new Map((await deps.store.listChatMembersByIds(app.id, [...new Set(reports.map((r) => r.reporterId))])).map((m) => [m.id, m]));
  const items = [];
  for (const r of reports) {
    const message = await deps.store.getChatMessage(app.id, r.messageId);
    const conversation = await deps.store.getChatConversation(app.id, r.conversationId);
    if (!message || !conversation) continue;
    const [view] = await ownerMessageViews(deps, app, [message]);
    const owner = conversation.memberId ? (await deps.store.getChatMember(app.id, conversation.memberId))?.name : null;
    const reporter = members.get(r.reporterId);
    items.push({
      id: r.id,
      message: view!,
      conversation_title: conversation.kind === "direct" ? (owner ?? "—") : (conversation.title ?? ""),
      reporter: reporter ? memberView(reporter) : { id: r.reporterId, name: "—", image_url: null, blocked: false },
      reason: r.reason,
      note: r.note,
      status: r.status,
      outcome: r.outcome,
      created_at: r.createdAt.toISOString(),
    });
  }
  return { items };
}

export async function ownerResolveReport(deps: ChatDeps, app: App, reportId: string, action: unknown, by: string): Promise<ChatResult<null>> {
  const report = await deps.store.getChatReport(app.id, reportId);
  if (!report) return fail(404, "not_found", "This report doesn't exist.");
  if (action !== "dismiss" && action !== "delete_message" && action !== "block_sender") return fail(400, "invalid_request", "action must be dismiss, delete_message or block_sender.");
  const message = await deps.store.getChatMessage(app.id, report.messageId);
  if (action !== "dismiss" && message) {
    await removeMessage(deps, app, message);
    if (action === "block_sender" && message.memberId) await deps.store.setChatMemberBlocked(app.id, message.memberId, deps.now, deps.now);
  }
  await deps.store.closeChatReports(app.id, report.messageId, action === "dismiss" ? "dismissed" : action === "delete_message" ? "deleted" : "blocked", by, deps.now);
  return done(null);
}

export async function ownerBlock(deps: Pick<ChatDeps, "store" | "now">, app: App, memberId: string, blocked: boolean): Promise<ChatResult<null>> {
  const ok = await deps.store.setChatMemberBlocked(app.id, memberId, blocked ? deps.now : null, deps.now);
  return ok ? done(null) : fail(404, "not_found", "This person isn't in your chat.");
}

export interface SettingsView {
  available: boolean;
  enabled: boolean;
  course_groups: boolean | null;
}

export function settingsView(app: App, plan: Parameters<typeof planHasChat>[0]): SettingsView {
  const settings = chatSettingsOf(app);
  return { available: planHasChat(plan), enabled: settings.enabled, course_groups: app.appType === "lms" ? settings.courseGroups : null };
}

/** Saves the chat's switches; course groups only for academies. */
export async function saveChatSettings(store: DataStore, app: App, input: { enabled?: unknown; course_groups?: unknown }, now: Date): Promise<ChatResult<ChatSettings>> {
  const current = chatSettingsOf(app);
  if (input.enabled !== undefined && typeof input.enabled !== "boolean") return fail(400, "invalid_request", "enabled must be true or false.");
  if (input.course_groups !== undefined && (typeof input.course_groups !== "boolean" || app.appType !== "lms")) {
    return fail(400, "invalid_request", "course_groups is true or false, for academies.");
  }
  const next: ChatSettings = {
    enabled: typeof input.enabled === "boolean" ? input.enabled : current.enabled,
    courseGroups: typeof input.course_groups === "boolean" ? input.course_groups : current.courseGroups,
  };
  await store.updateApp(app.id, { chatSettings: next }, now);
  return done(next);
}
