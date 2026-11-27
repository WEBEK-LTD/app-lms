import { newId } from "../../crypto/tokens";
import { fail, noContent, ok, pageOf, type CommunityContext, type CommunityResult, type MemberContext } from "../api/http";
import { onReported } from "../api/trust-hooks";
import type { MemberSummaryView } from "../api/views";
import type { CommunityReportReason } from "../types";
import { blockedBetween, invalidIf, limitConnect, namedMember, storePicture, summaries, text } from "./common";
import { directKeyOf } from "./store";
import { MAX_CHAT_MEMBERS, type Conversation, type ConversationMember, type Message } from "./types";

/**
 * 232.4 Messages: one-to-one conversations (one per pair) and small group
 * chats (up to 10 people), text, up to 4 photos, a reply to one message,
 * and read state. A one-to-one conversation with a member either side
 * blocked is read-only and left out of the list; nobody starts one or adds
 * anyone to a group chat across a block. Reported as a whole, the
 * moderators see its last messages. The site polls `GET /messages/unread`
 * and `…/messages?after=`; the app polls and gets push (area C).
 */

const MAX_PHOTOS = 4;
const REASONS: readonly CommunityReportReason[] = ["spam", "harassment", "hate", "inappropriate", "misinformation", "impersonation", "other"];

// ------------------------------------------------------------ views

function messageView(m: Message, people: Map<string, MemberSummaryView>, replyTo: Message | null | undefined) {
  return {
    id: m.id,
    conversation_id: m.conversationId,
    author: people.get(m.authorId)!,
    body: m.deletedAt ? "" : m.body,
    photos: m.deletedAt ? [] : m.photos,
    reply_to: replyTo ? { id: replyTo.id, author_name: people.get(replyTo.authorId)?.display_name ?? "", excerpt: replyTo.deletedAt ? "" : replyTo.body.slice(0, 140) } : null,
    deleted: m.deletedAt !== null,
    created_at: m.createdAt.toISOString(),
  };
}

async function messagesView(ctx: CommunityContext, rows: Message[]) {
  const replyIds = [...new Set(rows.map((m) => m.replyToId).filter((id): id is string => id !== null))];
  const replies = new Map<string, Message>();
  for (const id of replyIds) {
    const r = rows.find((m) => m.id === id) ?? (await ctx.store.connect.getMessage(id));
    if (r) replies.set(id, r);
  }
  const people = await summaries(ctx, [...rows.map((m) => m.authorId), ...[...replies.values()].map((m) => m.authorId)]);
  return rows.map((m) => messageView(m, people, m.replyToId ? replies.get(m.replyToId) : null));
}

/** A conversation as the viewer sees it. */
export async function conversationView(ctx: MemberContext, c: Conversation, members?: ConversationMember[]) {
  const store = ctx.store.connect;
  const all = members ?? (await store.listConversationMembers(c.id));
  const current = all.filter((m) => !m.leftAt);
  const mine = all.find((m) => m.memberId === ctx.member.id);
  const [people, last] = await Promise.all([summaries(ctx, current.map((m) => m.memberId)), store.listMessages(c.id, 0, 1)]);
  const lastMessage = last[0] ? (await messagesView(ctx, [last[0]]))[0]! : null;
  const other = c.kind !== "group" ? current.find((m) => m.memberId !== ctx.member.id) : undefined;
  const blocked = other ? await blockedBetween(ctx, ctx.member.id, other.memberId) : false;
  return {
    id: c.id,
    kind: c.kind,
    title: c.title,
    members: current.map((m) => people.get(m.memberId)!).filter(Boolean),
    last_message: lastMessage,
    unread: mine && !mine.leftAt ? await store.countUnread(c.id, ctx.member.id, mine.lastReadAt) : 0,
    muted: mine?.muted ?? false,
    blocked,
    hire_request_id: c.hireRequestId,
    read_by: Object.fromEntries(current.map((m) => [m.memberId, m.lastReadMessageId])),
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}

/** The conversation in the path, with the viewer in it; 404 otherwise. */
async function myConversation(ctx: MemberContext): Promise<{ conversation: Conversation; members: ConversationMember[]; me: ConversationMember }> {
  const store = ctx.store.connect;
  const conversation = await store.getConversation(ctx.params.conversation_id ?? "");
  if (!conversation) fail(404, "not_found");
  const members = await store.listConversationMembers(conversation.id);
  const me = members.find((m) => m.memberId === ctx.member.id && !m.leftAt);
  if (!me) fail(404, "not_found");
  return { conversation, members, me };
}

const chatMember = (conversationId: string, memberId: string, now: Date): ConversationMember => ({
  conversationId,
  memberId,
  joinedAt: now,
  leftAt: null,
  hiddenAt: null,
  lastReadMessageId: null,
  lastReadAt: null,
  muted: false,
});

// ------------------------------------------------------------ conversations

export async function listConversations(ctx: MemberContext): Promise<CommunityResult> {
  const { offset, limit } = pageOf(ctx.query);
  const rows = await ctx.store.connect.listConversationsOf(ctx.member.id, offset, limit);
  const views = [];
  for (const c of rows.slice(0, limit)) {
    const view = await conversationView(ctx, c);
    // A one-to-one conversation across a block is left out of the list.
    if (view.blocked && c.kind === "direct") continue;
    views.push(view);
  }
  return ok({ items: views, next_cursor: rows.length > limit ? String(offset + limit) : null });
}

/**
 * Opens a conversation (and, for hire requests, its thread). One other
 * member: their one-to-one conversation, the existing one when there is
 * one. More: a new group chat.
 */
export async function openConversation(ctx: MemberContext, input: { memberIds: string[]; title: string | null; kind?: "hire"; hireRequestId?: string }): Promise<{ conversation: Conversation; created: boolean }> {
  const store = ctx.store.connect;
  const others = [...new Set(input.memberIds)].filter((id) => id !== ctx.member.id);
  if (others.length === 0 || others.length > MAX_CHAT_MEMBERS - 1) fail(400, "not_allowed");
  const blocked = await ctx.store.base.blockedEitherWay(ctx.member.id);
  for (const id of others) {
    const m = await ctx.store.base.getMember(id);
    if (!m || m.status !== "active" || blocked.has(id)) fail(400, "not_allowed");
  }
  const kind = input.kind ?? (others.length === 1 ? "direct" : "group");
  const directKey = kind === "direct" ? directKeyOf(ctx.member.id, others[0]!) : null;
  if (directKey) {
    const existing = await store.findDirect(directKey);
    if (existing) {
      // Hidden by the viewer: back in their list.
      const me = await store.getConversationMember(existing.id, ctx.member.id);
      if (me?.hiddenAt) await store.saveConversationMember({ ...me, hiddenAt: null });
      return { conversation: existing, created: false };
    }
  }
  await limitConnect(ctx, "conversation");
  const conversation: Conversation = {
    id: newId(),
    kind,
    title: kind === "group" ? input.title : null,
    createdBy: ctx.member.id,
    directKey,
    hireRequestId: input.hireRequestId ?? null,
    lastMessageAt: ctx.now,
    createdAt: ctx.now,
    updatedAt: ctx.now,
  };
  await store.createConversation(conversation, [ctx.member.id, ...others].map((id) => chatMember(conversation.id, id, ctx.now)));
  return { conversation, created: true };
}

export async function startConversation(ctx: MemberContext): Promise<CommunityResult> {
  const body = ctx.json();
  const fields: Record<string, string> = {};
  const ids = body.member_ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_CHAT_MEMBERS - 1 || ids.some((v) => typeof v !== "string")) fields.member_ids = "field.invalid";
  const title = text(body, "title", { max: 80 }, fields);
  const first = text(body, "body", { max: 4000 }, fields);
  invalidIf(fields);
  // Ids or @usernames.
  const memberIds: string[] = [];
  for (const ref of ids as string[]) memberIds.push((await namedMember(ctx, ref)).id);
  const { conversation, created } = await openConversation(ctx, { memberIds, title: title || null });
  if (first) await send(ctx, conversation, { body: first, photos: [], replyToId: null });
  return ok(await conversationView(ctx, (await ctx.store.connect.getConversation(conversation.id))!), created ? 201 : 200);
}

export async function getConversation(ctx: MemberContext): Promise<CommunityResult> {
  const { conversation, members } = await myConversation(ctx);
  return ok(await conversationView(ctx, conversation, members));
}

export async function updateConversation(ctx: MemberContext): Promise<CommunityResult> {
  const { conversation, me } = await myConversation(ctx);
  const body = ctx.json();
  const fields: Record<string, string> = {};
  const title = body.title !== undefined ? text(body, "title", { max: 80 }, fields) : undefined;
  if (body.muted !== undefined && typeof body.muted !== "boolean") fields.muted = "field.invalid";
  invalidIf(fields);
  if (title !== undefined) {
    if (conversation.kind !== "group") fail(400, "not_allowed");
    await ctx.store.connect.updateConversation(conversation.id, { title: title || null, updatedAt: ctx.now });
  }
  if (typeof body.muted === "boolean") await ctx.store.connect.saveConversationMember({ ...me, muted: body.muted });
  return ok(await conversationView(ctx, (await ctx.store.connect.getConversation(conversation.id))!));
}

export async function addPeople(ctx: MemberContext): Promise<CommunityResult> {
  const { conversation, members } = await myConversation(ctx);
  if (conversation.kind !== "group") fail(400, "not_allowed");
  const ids = ctx.json().member_ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((v) => typeof v !== "string")) fail(400, "invalid_request", { member_ids: "field.invalid" });
  const blocked = await ctx.store.base.blockedEitherWay(ctx.member.id);
  const current = new Set(members.filter((m) => !m.leftAt).map((m) => m.memberId));
  const adding: string[] = [];
  for (const ref of ids as string[]) {
    const m = await namedMember(ctx, ref);
    if (blocked.has(m.id)) fail(400, "not_allowed");
    if (!current.has(m.id)) adding.push(m.id);
  }
  if (current.size + new Set(adding).size > MAX_CHAT_MEMBERS) fail(400, "not_allowed");
  for (const id of new Set(adding)) await ctx.store.connect.saveConversationMember(chatMember(conversation.id, id, ctx.now));
  return ok(await conversationView(ctx, conversation));
}

/** Leaves a group chat; a one-to-one conversation (or a hire thread) is hidden until its next message. */
export async function leaveConversation(ctx: MemberContext): Promise<CommunityResult> {
  const { conversation, me } = await myConversation(ctx);
  await ctx.store.connect.saveConversationMember(conversation.kind === "group" ? { ...me, leftAt: ctx.now } : { ...me, hiddenAt: ctx.now });
  return noContent();
}

// ------------------------------------------------------------ messages

export async function listMessages(ctx: MemberContext): Promise<CommunityResult> {
  const { conversation } = await myConversation(ctx);
  const store = ctx.store.connect;
  const { offset, limit } = pageOf(ctx.query, 100);
  const afterId = ctx.query.get("after");
  if (afterId) {
    const after = await store.getMessage(afterId);
    if (!after || after.conversationId !== conversation.id) fail(404, "not_found");
    const rows = await store.listMessagesAfter(conversation.id, after, limit);
    return ok({ items: await messagesView(ctx, rows.slice(0, limit)), next_cursor: null });
  }
  const rows = await store.listMessages(conversation.id, offset, limit);
  const items = await messagesView(ctx, rows.slice(0, limit));
  return ok({ items, next_cursor: rows.length > limit ? String(offset + limit) : null });
}

async function send(ctx: MemberContext, conversation: Conversation, input: { body: string; photos: string[]; replyToId: string | null }): Promise<Message> {
  const store = ctx.store.connect;
  if (conversation.kind !== "group") {
    const other = (await store.listConversationMembers(conversation.id)).find((m) => m.memberId !== ctx.member.id);
    if (other && (await blockedBetween(ctx, ctx.member.id, other.memberId))) fail(400, "not_allowed");
  }
  await limitConnect(ctx, "message");
  const message: Message = { id: newId(), conversationId: conversation.id, authorId: ctx.member.id, body: input.body, photos: input.photos, replyToId: input.replyToId, deletedAt: null, createdAt: ctx.now };
  await store.addMessage(message);
  // One's own message is read.
  const me = await store.getConversationMember(conversation.id, ctx.member.id);
  if (me) await store.saveConversationMember({ ...me, lastReadMessageId: message.id, lastReadAt: message.createdAt, hiddenAt: null });
  return message;
}

/** Sends a message into a conversation the member is in (for hire requests' first message). */
export async function sendInto(ctx: MemberContext, conversation: Conversation, body: string): Promise<Message> {
  return send(ctx, conversation, { body, photos: [], replyToId: null });
}

export async function postMessage(ctx: MemberContext): Promise<CommunityResult> {
  const { conversation } = await myConversation(ctx);
  const fields: Record<string, string> = {};
  let body = "";
  let replyToId: string | null = null;
  const photos: string[] = [];
  if (ctx.req.form) {
    const form = ctx.req.form;
    const raw = form.get("body");
    body = typeof raw === "string" ? raw.trim() : "";
    const reply = form.get("reply_to_id");
    replyToId = typeof reply === "string" && reply ? reply : null;
    const files = form.getAll("photos");
    if (files.length > MAX_PHOTOS) fields.photos = "field.too_many";
    if (body.length > 4000) fields.body = "field.too_long";
    invalidIf(fields);
    for (const f of files) photos.push(await storePicture(ctx, f, "photos"));
  } else {
    const json = ctx.json();
    body = text(json, "body", { max: 4000 }, fields);
    replyToId = typeof json.reply_to_id === "string" && json.reply_to_id ? json.reply_to_id : null;
  }
  if (!body && photos.length === 0) fields.body = "field.required";
  invalidIf(fields);
  if (replyToId) {
    const reply = await ctx.store.connect.getMessage(replyToId);
    if (!reply || reply.conversationId !== conversation.id) fail(400, "invalid_request", { reply_to_id: "field.invalid" });
  }
  const message = await send(ctx, conversation, { body, photos, replyToId });
  return ok((await messagesView(ctx, [message]))[0], 201);
}

export async function deleteMessage(ctx: MemberContext): Promise<CommunityResult> {
  const { conversation } = await myConversation(ctx);
  const message = await ctx.store.connect.getMessage(ctx.params.message_id ?? "");
  if (!message || message.conversationId !== conversation.id) fail(404, "not_found");
  if (message.authorId !== ctx.member.id) fail(403, "not_allowed");
  await ctx.store.connect.deleteMessage(message.id, ctx.now);
  return noContent();
}

export async function markRead(ctx: MemberContext): Promise<CommunityResult> {
  const { conversation, me } = await myConversation(ctx);
  const store = ctx.store.connect;
  const id = ctx.json().message_id;
  const message = typeof id === "string" && id ? await store.getMessage(id) : (await store.listMessages(conversation.id, 0, 1))[0] ?? null;
  if (typeof id === "string" && id && (!message || message.conversationId !== conversation.id)) fail(404, "not_found");
  // Read marks only move forward.
  if (message && (!me.lastReadAt || message.createdAt.getTime() >= me.lastReadAt.getTime())) {
    await store.saveConversationMember({ ...me, lastReadMessageId: message.id, lastReadAt: message.createdAt });
  }
  return noContent();
}

export async function unreadCount(ctx: MemberContext): Promise<CommunityResult> {
  return ok({ conversations: await ctx.store.connect.countUnreadConversations(ctx.member.id) });
}

export async function reportConversation(ctx: MemberContext): Promise<CommunityResult> {
  const { conversation } = await myConversation(ctx);
  const body = ctx.json();
  const reason = body.reason as CommunityReportReason;
  const fields: Record<string, string> = {};
  if (!REASONS.includes(reason)) fields.reason = "field.invalid";
  const note = text(body, "note", { max: 500 }, fields);
  invalidIf(fields);
  const made = await ctx.store.base.createReport({
    id: newId(),
    reporterId: ctx.member.id,
    targetType: "conversation",
    targetId: conversation.id,
    reason,
    note,
    status: "open",
    handledBy: null,
    handledAt: null,
    createdAt: ctx.now,
  });
  if (!made) fail(409, "already_reported");
  await onReported(ctx, made);
  return ok({ id: made.id }, 201);
}
