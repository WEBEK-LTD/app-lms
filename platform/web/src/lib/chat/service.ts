import { newId, randomToken, sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, ChatConversation, ChatMember, ChatMessage, ChatReportReason, MediaFile, MediaKind } from "../data/types";
import { cleanName, completeUpload, deleteMedia, fileUrl, PLAY_LINK_SECONDS, startUpload, uploadUrl } from "../media/files";
import { storageLimitBytes } from "../media/quota";
import type { MediaStorage } from "../media/storage";
import type { PlanInfo } from "../plans";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";
import { chatGroupsOn } from "./access";

/**
 * 77 The chat of an app's people with the business, and of an academy's
 * course groups (openapi.yaml, "Chat"). People never talk in private: a
 * member is in their own conversation with the business and in the groups of
 * the courses they're enrolled in. The business answers as itself (the team
 * member who wrote is kept for the team). Files are Media files (`chat`).
 */

export const CHAT_TEXT_MAX = 4000;
/** The longest a chat token from a WordPress site works. */
export const CHAT_SESSION_SECONDS = 3600;

export const CHAT_RATE_LIMITS = {
  send: { name: "chat-send:member", limit: 60, windowSeconds: 60 },
  report: { name: "chat-report:member", limit: 20, windowSeconds: 3600 },
  upload: { name: "chat-upload:member", limit: 60, windowSeconds: 3600 },
  session: { name: "chat-session:app", limit: 600, windowSeconds: 3600 },
} satisfies Record<string, RateLimitRule>;

export interface ChatDeps {
  store: DataStore;
  now: Date;
  /** The media server (null: files can't be sent). */
  storage: MediaStorage | null;
  /** The chunk size the uploader uses (MEDIA_CHUNK_BYTES). */
  chunkBytes: number;
  /** The business as it shows in the chat. */
  business: { name: string; imageUrl: string | null };
  /** The app's plan: its storage, for files. */
  plan: PlanInfo | null;
  /** Tells people about a new message (pushes), best effort; never fails the send. */
  onMessage?: (input: { app: App; conversation: ChatConversation; message: ChatMessage; sender: ChatMember | null }) => Promise<void>;
}

export type ChatFailure = { ok: false; status: 400 | 403 | 404 | 409 | 413 | 429 | 503; code: string; message: string; retryAfter?: number; offset?: number };
export type ChatResult<T> = { ok: true; value: T } | ChatFailure;

const fail = (status: ChatFailure["status"], code: string, message: string, extra: Partial<ChatFailure> = {}): ChatFailure => ({ ok: false, status, code, message, ...extra });
const done = <T>(value: T): ChatResult<T> => ({ ok: true, value });

/** A message ID from the API: digits only. */
export function parseMessageId(value: unknown): number | null {
  const s = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^[1-9][0-9]{0,15}$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}

/** How often the app asks for new messages: often while people are writing, less when it's quiet. */
export function pollAfterSeconds(conversation: Pick<ChatConversation, "lastMessageAt">, now: Date): number {
  if (!conversation.lastMessageAt) return 15;
  const quiet = now.getTime() - conversation.lastMessageAt.getTime();
  if (quiet < 60_000) return 3;
  if (quiet < 10 * 60_000) return 6;
  return 15;
}

/** The chat's word for a Media file's kind (a PDF is a file there). */
export function attachmentKind(kind: MediaKind): "image" | "video" | "audio" | "file" {
  return kind === "image" || kind === "video" || kind === "audio" ? kind : "file";
}

// Who is asking

/** The member for a person signed in on the hosted API (or Yallapp sign-in), made the first time. */
export async function memberForHostedUser(store: DataStore, app: App, user: { id: number; name: string }, now: Date): Promise<ChatMember> {
  const name = user.name.slice(0, 120) || "—";
  // The app asks every few seconds: a write only for someone new or renamed.
  const found = await store.findChatMember(app.id, "hosted", String(user.id));
  if (found && found.name === name) return found;
  return store.upsertChatMember({ appId: app.id, source: "hosted", externalId: String(user.id), name, imageUrl: null }, now);
}

/** The member of a WordPress chat token; null when it's unknown or expired. */
export async function memberForChatToken(store: DataStore, app: App, token: string | null, now: Date): Promise<ChatMember | null> {
  if (!token) return null;
  const session = await store.getChatSession(sha256Hex(token));
  if (!session || session.appId !== app.id || session.expiresAt.getTime() <= now.getTime()) return null;
  return store.getChatMember(app.id, session.memberId);
}

/**
 * Starts a chat session for a person signed in on the app's WordPress site
 * (platform.yaml POST /chat/sessions): keeps their name and picture, puts
 * them in the groups of their courses, and gives an hour's token.
 */
export async function startSiteSession(
  deps: Pick<ChatDeps, "store" | "now">,
  app: App,
  input: { userId: number; name: string; imageUrl: string | null; courses: { id: number; title: string; imageUrl: string | null }[] },
): Promise<ChatResult<{ token: string; expiresAt: Date; member: ChatMember }>> {
  const hit = await hitRateLimit(deps.store, CHAT_RATE_LIMITS.session, app.id, deps.now);
  if (!hit.allowed) return fail(429, "rate_limited", "Too many chat sessions for this app. Try again shortly.", { retryAfter: hit.retryAfter });
  const member = await deps.store.upsertChatMember({ appId: app.id, source: "wordpress", externalId: String(input.userId), name: input.name.slice(0, 120) || "—", imageUrl: input.imageUrl }, deps.now);
  await deps.store.ensureDirectConversation(app.id, member.id, deps.now);
  if (chatGroupsOn(app)) {
    const groups: string[] = [];
    for (const course of input.courses.slice(0, 500)) {
      const group = await deps.store.ensureGroupConversation({ appId: app.id, courseKey: `wordpress:${course.id}`, title: course.title.slice(0, 200), imageUrl: course.imageUrl }, deps.now);
      groups.push(group.id);
    }
    await deps.store.setMemberGroups(app.id, member.id, groups, deps.now);
  } else {
    await deps.store.setMemberGroups(app.id, member.id, [], deps.now);
  }
  const token = randomToken(32);
  const expiresAt = new Date(deps.now.getTime() + CHAT_SESSION_SECONDS * 1000);
  await deps.store.createChatSession({ tokenHash: sha256Hex(token), appId: app.id, memberId: member.id, expiresAt, createdAt: deps.now });
  return done({ token, expiresAt, member });
}

/** Puts a hosted academy's student in the groups of the courses they're enrolled in (courses managed in Yallapp). */
export async function syncHostedGroups(deps: Pick<ChatDeps, "store" | "now">, app: App, member: ChatMember, assetUrl: (id: string) => string): Promise<void> {
  if (member.source !== "hosted") return;
  if (!chatGroupsOn(app)) {
    await deps.store.setMemberGroups(app.id, member.id, [], deps.now);
    return;
  }
  const courses = new Map((app.courseSetup?.courses ?? []).map((c) => [c.id, c]));
  const enrolled = await deps.store.listCourseEnrollments({ appId: app.id, userId: Number(member.externalId) });
  const groups: string[] = [];
  for (const enrollment of enrolled) {
    const course = courses.get(enrollment.courseId);
    if (!course) continue;
    const group = await deps.store.ensureGroupConversation(
      { appId: app.id, courseKey: `hosted:${course.id}`, title: course.title.slice(0, 200), imageUrl: course.imageAssetId ? assetUrl(course.imageAssetId) : null },
      deps.now,
    );
    groups.push(group.id);
  }
  await deps.store.setMemberGroups(app.id, member.id, groups, deps.now);
}

// What the app sees (openapi.yaml ChatConversation, ChatMessage)

export interface MessageView {
  id: string;
  conversation_id: string;
  client_id: string | null;
  sender: { kind: "member" | "business"; member_id: string | null; name: string; image_url: string | null };
  mine: boolean;
  text: string | null;
  attachment: {
    kind: "image" | "video" | "audio" | "file";
    name: string;
    content_type: string;
    size_bytes: number;
    duration_seconds: number | null;
    url: string;
    url_expires_at: string;
  } | null;
  deleted: boolean;
  created_at: string;
}

/** Messages as the API sends them: the senders' names and pictures, and fresh links to their files. */
export async function messageViews(deps: Pick<ChatDeps, "store" | "storage" | "business">, app: App, messages: ChatMessage[], viewer: { memberId: string | null }): Promise<MessageView[]> {
  const members = new Map((await deps.store.listChatMembersByIds(app.id, [...new Set(messages.map((m) => m.memberId).filter((id): id is string => Boolean(id)))])).map((m) => [m.id, m]));
  const files = new Map<string, MediaFile | null>();
  for (const id of new Set(messages.map((m) => m.mediaId).filter((id): id is string => Boolean(id)))) files.set(id, await deps.store.getMediaFile(app.id, id));
  return messages.map((m) => {
    const member = m.memberId ? members.get(m.memberId) : null;
    const file = m.mediaId ? files.get(m.mediaId) : null;
    const link = file && file.status === "ready" && deps.storage ? fileUrl(deps.storage, file, { ttlSeconds: PLAY_LINK_SECONDS }) : null;
    return {
      id: String(m.id),
      conversation_id: m.conversationId,
      client_id: m.clientId,
      sender:
        m.senderKind === "business"
          ? { kind: "business", member_id: null, name: deps.business.name, image_url: deps.business.imageUrl }
          : { kind: "member", member_id: m.memberId, name: member?.name ?? "—", image_url: member?.imageUrl ?? null },
      mine: viewer.memberId !== null && m.senderKind === "member" && m.memberId === viewer.memberId,
      text: m.deletedAt ? null : m.text,
      attachment:
        !m.deletedAt && file && link
          ? {
              kind: attachmentKind(file.kind),
              name: file.name,
              content_type: file.contentType,
              size_bytes: file.sizeBytes,
              duration_seconds: m.durationSeconds,
              url: link.url,
              url_expires_at: link.expiresAt.toISOString(),
            }
          : null,
      deleted: Boolean(m.deletedAt),
      created_at: m.createdAt.toISOString(),
    };
  });
}

/** The conversations a member is in (theirs with the business first, made if needed; then their groups, latest first). */
export async function memberConversations(deps: ChatDeps, app: App, member: ChatMember) {
  await deps.store.ensureDirectConversation(app.id, member.id, deps.now);
  const rows = await deps.store.listMemberConversations(app.id, member.id);
  const blocked = await deps.store.listChatBlocks(member.id);
  const groups = chatGroupsOn(app);
  const visible = rows.filter((r) => r.conversation.kind === "direct" || groups);
  visible.sort((a, b) => {
    if (a.conversation.kind !== b.conversation.kind) return a.conversation.kind === "direct" ? -1 : 1;
    return (b.conversation.lastMessageId ?? 0) - (a.conversation.lastMessageId ?? 0);
  });
  const lastIds = visible.map((r) => r.conversation.lastMessageId).filter((id): id is number => id !== null);
  const lasts = new Map<number, ChatMessage>();
  for (const id of lastIds) {
    const message = await deps.store.getChatMessage(app.id, id);
    if (message) lasts.set(id, message);
  }
  const views = new Map((await messageViews(deps, app, [...lasts.values()], { memberId: member.id })).map((v) => [Number(v.id), v]));
  let unreadTotal = 0;
  const items = [];
  for (const { conversation, participant } of visible) {
    const unread = await deps.store.countChatUnread(conversation.id, participant.readId, { notFromMember: member.id, hideFrom: blocked });
    unreadTotal += unread;
    const last = conversation.lastMessageId !== null ? views.get(conversation.lastMessageId) : null;
    const lastHidden = last && last.sender.member_id && blocked.includes(last.sender.member_id);
    items.push({
      id: conversation.id,
      kind: conversation.kind,
      title: conversation.kind === "direct" ? deps.business.name : (conversation.title ?? ""),
      image_url: conversation.kind === "direct" ? deps.business.imageUrl : conversation.imageUrl,
      course_id: conversation.courseKey ? conversation.courseKey.split(":")[1]! : null,
      ...(conversation.kind === "group" ? { member_count: (await deps.store.listChatParticipants(conversation.id)).length } : {}),
      last_message: last && !lastHidden ? last : null,
      unread_count: unread,
      can_send: !member.blockedAt,
      updated_at: (conversation.lastMessageAt ?? conversation.createdAt).toISOString(),
    });
  }
  return { items, unread_count: unreadTotal };
}

/** The member's conversation, or not found (a group of a course they left, or groups turned off). */
export async function memberConversation(deps: Pick<ChatDeps, "store">, app: App, member: ChatMember, conversationId: string): Promise<ChatConversation | null> {
  const conversation = await deps.store.getChatConversation(app.id, conversationId);
  if (!conversation) return null;
  if (conversation.kind === "group" && !chatGroupsOn(app)) return null;
  const participant = await deps.store.getChatParticipant(conversation.id, member.id);
  return participant ? conversation : null;
}

export async function memberMessages(deps: ChatDeps, app: App, member: ChatMember, conversationId: string, query: URLSearchParams) {
  const conversation = await memberConversation(deps, app, member, conversationId);
  if (!conversation) return fail(404, "not_found", "This conversation doesn't exist.");
  const page = pageQuery(query);
  if (!page) return fail(400, "invalid_request", "after, before and limit must be message IDs and a number from 1 to 100.");
  const hideFrom = await deps.store.listChatBlocks(member.id);
  const rows = await deps.store.listChatMessages(conversation.id, { ...page.range, limit: page.limit + 1, hideFrom });
  const has_more = rows.length > page.limit;
  return done({
    items: await messageViews(deps, app, rows.slice(0, page.limit), { memberId: member.id }),
    has_more,
    poll_after_seconds: pollAfterSeconds(conversation, deps.now),
  });
}

/** `after`, `before` and `limit` of a message list. */
export function pageQuery(query: URLSearchParams): { range: { after?: number; before?: number }; limit: number } | null {
  const after = query.get("after");
  const before = query.get("before");
  const limitText = query.get("limit");
  const limit = limitText === null ? 50 : Number(limitText);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return null;
  if (after !== null) {
    const id = after === "0" ? 0 : parseMessageId(after);
    return id === null ? null : { range: { after: id }, limit };
  }
  if (before !== null) {
    const id = parseMessageId(before);
    return id === null ? null : { range: { before: id }, limit };
  }
  return { range: {}, limit };
}

/** A message from a member: text, a finished upload of theirs, or both. */
export async function memberSend(deps: ChatDeps, app: App, member: ChatMember, conversationId: string, body: Record<string, unknown>): Promise<ChatResult<{ view: MessageView; created: boolean }>> {
  const conversation = await memberConversation(deps, app, member, conversationId);
  if (!conversation) return fail(404, "not_found", "This conversation doesn't exist.");
  if (member.blockedAt) return fail(403, "chat_blocked", "You can't send messages in this chat.");
  const input = messageInput(body);
  if (!input.ok) return input;
  let durationSeconds: number | null = null;
  if (input.value.uploadId) {
    const upload = await deps.store.getChatUpload(input.value.uploadId);
    const file = upload ? await deps.store.getMediaFile(app.id, upload.mediaId) : null;
    if (!upload || upload.memberId !== member.id || !file) return fail(400, "invalid_request", "This file wasn't sent from here. Send it again.");
    if (file.status !== "ready") return fail(409, "incomplete", "This file hasn't finished uploading.");
    durationSeconds = upload.durationSeconds;
  }
  const hit = await hitRateLimit(deps.store, CHAT_RATE_LIMITS.send, member.id, deps.now);
  if (!hit.allowed) return fail(429, "rate_limited", "You're sending messages too fast. Wait a moment.", { retryAfter: hit.retryAfter });
  const { message, created } = await deps.store.createChatMessage({
    appId: app.id,
    conversationId: conversation.id,
    senderKind: "member",
    memberId: member.id,
    teamUserId: null,
    teamName: null,
    clientId: input.value.clientId,
    text: input.value.text,
    mediaId: input.value.uploadId,
    durationSeconds,
    deletedAt: null,
    createdAt: deps.now,
  });
  if (created) {
    await deps.store.setChatRead(conversation.id, member.id, message.id);
    await notify(deps, app, conversation, message, member);
  }
  const [view] = await messageViews(deps, app, [message], { memberId: member.id });
  return done({ view: view!, created });
}

async function notify(deps: ChatDeps, app: App, conversation: ChatConversation, message: ChatMessage, sender: ChatMember | null): Promise<void> {
  if (!deps.onMessage) return;
  try {
    await deps.onMessage({ app, conversation: { ...conversation, lastMessageId: message.id, lastMessageAt: message.createdAt }, message, sender });
  } catch (error) {
    console.error(`[chat] app ${app.id}: telling people about a message failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** `client_id`, `text` and the upload of a new message. */
export function messageInput(body: Record<string, unknown>, uploadField = "upload_id"): ChatResult<{ clientId: string; text: string | null; uploadId: string | null }> {
  const clientId = typeof body.client_id === "string" ? body.client_id.trim() : "";
  if (clientId.length < 8 || clientId.length > 64 || !/^[A-Za-z0-9._:-]+$/.test(clientId)) return fail(400, "invalid_request", "Send a client_id of 8 to 64 letters, digits and . _ : -.");
  const raw = body.text;
  if (raw !== undefined && raw !== null && typeof raw !== "string") return fail(400, "invalid_request", "text must be text.");
  // Control characters out, but new lines and tabs stay.
  const text = typeof raw === "string" ? raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim() : "";
  if (text.length > CHAT_TEXT_MAX) return fail(400, "message_too_long", `A message can be up to ${CHAT_TEXT_MAX} characters.`);
  const upload = body[uploadField];
  if (upload !== undefined && upload !== null && (typeof upload !== "string" || !/^[0-9a-f-]{36}$/.test(upload))) return fail(400, "invalid_request", `${uploadField} must be an upload's ID.`);
  const uploadId = typeof upload === "string" ? upload : null;
  if (!text && !uploadId) return fail(400, "invalid_request", "Write a message or attach a file.");
  return done({ clientId, text: text || null, uploadId });
}

export async function memberRead(deps: Pick<ChatDeps, "store">, app: App, member: ChatMember, conversationId: string, body: Record<string, unknown>): Promise<ChatResult<null>> {
  const conversation = await memberConversation(deps, app, member, conversationId);
  if (!conversation) return fail(404, "not_found", "This conversation doesn't exist.");
  const id = parseMessageId(body.message_id);
  if (id === null) return fail(400, "invalid_request", "Send the message_id read up to.");
  // Never past the conversation's last message.
  await deps.store.setChatRead(conversation.id, member.id, Math.min(id, conversation.lastMessageId ?? 0));
  return done(null);
}

export async function memberGroupMembers(deps: ChatDeps, app: App, member: ChatMember, conversationId: string) {
  const conversation = await memberConversation(deps, app, member, conversationId);
  if (!conversation) return fail(404, "not_found", "This conversation doesn't exist.");
  const participants = await deps.store.listChatParticipants(conversation.id);
  const members = await deps.store.listChatMembersByIds(app.id, participants.map((p) => p.memberId));
  const blocked = new Set(await deps.store.listChatBlocks(member.id));
  const items = [
    { id: app.id, name: deps.business.name, image_url: deps.business.imageUrl, business: true, blocked: false },
    ...members.sort((a, b) => a.name.localeCompare(b.name)).map((m) => ({ id: m.id, name: m.name, image_url: m.imageUrl, business: false, blocked: blocked.has(m.id) })),
  ];
  return done({ items });
}

/** A member deletes their own message, for everyone, with its file. */
export async function memberDeleteMessage(deps: ChatDeps, app: App, member: ChatMember, messageIdText: string): Promise<ChatResult<null>> {
  const id = parseMessageId(messageIdText);
  const message = id === null ? null : await deps.store.getChatMessage(app.id, id);
  if (!message || !(await memberConversation(deps, app, member, message.conversationId))) return fail(404, "not_found", "This message doesn't exist.");
  if (message.senderKind !== "member" || message.memberId !== member.id) return fail(403, "not_allowed", "You can delete only your own messages.");
  await removeMessage(deps, app, message);
  return done(null);
}

/** Deletes a message for everyone, and its file when it came from the chat. */
export async function removeMessage(deps: Pick<ChatDeps, "store" | "storage" | "now">, app: App, message: ChatMessage): Promise<boolean> {
  const deleted = await deps.store.deleteChatMessage(app.id, message.id, deps.now);
  if (deleted && message.mediaId) await removeChatFile(deps, app, message.mediaId);
  return deleted;
}

/** A file sent in the chat goes with its message; a Media library file the business attached stays in the library. */
export async function removeChatFile(deps: Pick<ChatDeps, "store" | "storage">, app: App, mediaId: string): Promise<void> {
  const file = await deps.store.getMediaFile(app.id, mediaId);
  if (file?.source === "chat") await deleteMedia({ store: deps.store, storage: deps.storage }, app.id, mediaId);
}

export async function memberReport(deps: ChatDeps, app: App, member: ChatMember, messageIdText: string, body: Record<string, unknown>): Promise<ChatResult<null>> {
  const id = parseMessageId(messageIdText);
  const message = id === null ? null : await deps.store.getChatMessage(app.id, id);
  if (!message || !(await memberConversation(deps, app, member, message.conversationId))) return fail(404, "not_found", "This message doesn't exist.");
  const reasons: ChatReportReason[] = ["spam", "abuse", "inappropriate", "other"];
  if (!reasons.includes(body.reason as ChatReportReason)) return fail(400, "invalid_request", "reason must be spam, abuse, inappropriate or other.");
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  const hit = await hitRateLimit(deps.store, CHAT_RATE_LIMITS.report, member.id, deps.now);
  if (!hit.allowed) return fail(429, "rate_limited", "You've reported many messages. Try again later.", { retryAfter: hit.retryAfter });
  await deps.store.createChatReport({
    id: newId(),
    appId: app.id,
    messageId: message.id,
    conversationId: message.conversationId,
    reporterId: member.id,
    reason: body.reason as ChatReportReason,
    note: note || null,
    status: "open",
    outcome: null,
    closedBy: null,
    createdAt: deps.now,
    closedAt: null,
  });
  return done(null);
}

/** A member hides (or shows again) another member's messages, for themselves. */
export async function memberBlock(deps: Pick<ChatDeps, "store" | "now">, app: App, member: ChatMember, otherId: string, blocked: boolean): Promise<ChatResult<null>> {
  const other = otherId === member.id ? null : await deps.store.getChatMember(app.id, otherId);
  if (!other) return fail(404, "not_found", "This person isn't in your chats.");
  await deps.store.setChatBlock(member.id, other.id, blocked, deps.now);
  return done(null);
}

export async function memberUnread(deps: ChatDeps, app: App, member: ChatMember): Promise<number> {
  return (await memberConversations(deps, app, member)).unread_count;
}

// Files from the app

export interface UploadView {
  id: string;
  kind: "image" | "video" | "audio" | "file";
  upload_url: string;
  chunk_bytes: number;
  size: number;
}

export async function memberStartUpload(deps: ChatDeps, app: App, member: ChatMember, body: Record<string, unknown>): Promise<ChatResult<UploadView>> {
  if (!deps.storage) return fail(503, "media_unavailable", "Files can't be sent right now.");
  const name = typeof body.name === "string" ? cleanName(body.name) : "";
  const size = typeof body.size === "number" ? body.size : Number.NaN;
  const type = typeof body.type === "string" ? body.type : "";
  const duration = body.duration_seconds === undefined || body.duration_seconds === null ? null : Number(body.duration_seconds);
  if (!name || !type) return fail(400, "invalid_request", "Send the file's name, size and type.");
  if (duration !== null && (!Number.isInteger(duration) || duration < 0 || duration > 24 * 3600)) return fail(400, "invalid_request", "duration_seconds must be a whole number of seconds.");
  const hit = await hitRateLimit(deps.store, CHAT_RATE_LIMITS.upload, member.id, deps.now);
  if (!hit.allowed) return fail(429, "rate_limited", "You've sent many files. Try again later.", { retryAfter: hit.retryAfter });
  const limitBytes = storageLimitBytes(deps.plan, await deps.store.listStoragePacks(app.id), deps.now);
  const started = await startUpload(
    { store: deps.store, storage: deps.storage, now: deps.now, limitBytes, chunkBytes: deps.chunkBytes },
    { appId: app.id, name, size, contentType: type, source: "chat" },
  );
  if (!started.ok) {
    if (started.code === "storage_full") return fail(413, "storage_full", "There's no room for this file in the app right now.");
    if (started.code === "too_big") return fail(413, "too_big", started.message);
    return fail(400, "invalid_request", started.message);
  }
  await deps.store.createChatUpload({ mediaId: started.file.id, appId: app.id, memberId: member.id, durationSeconds: duration, createdAt: deps.now });
  return done({ id: started.file.id, kind: attachmentKind(started.file.kind), upload_url: started.uploadUrl, chunk_bytes: started.chunkBytes, size: started.file.sizeBytes });
}

/** The member's upload, still a chat upload of theirs. */
async function memberUpload(deps: Pick<ChatDeps, "store">, app: App, member: ChatMember, uploadId: string): Promise<MediaFile | null> {
  const upload = await deps.store.getChatUpload(uploadId);
  if (!upload || upload.appId !== app.id || upload.memberId !== member.id) return null;
  return deps.store.getMediaFile(app.id, uploadId);
}

export async function memberResumeUpload(deps: ChatDeps, app: App, member: ChatMember, uploadId: string): Promise<ChatResult<UploadView>> {
  const file = await memberUpload(deps, app, member, uploadId);
  if (!file || file.status !== "uploading") return fail(404, "not_found", "This upload doesn't exist.");
  if (!deps.storage) return fail(503, "media_unavailable", "Files can't be sent right now.");
  return done({ id: file.id, kind: attachmentKind(file.kind), upload_url: uploadUrl(deps.storage, file), chunk_bytes: deps.chunkBytes, size: file.sizeBytes });
}

export async function memberCompleteUpload(deps: ChatDeps, app: App, member: ChatMember, uploadId: string): Promise<ChatResult<null>> {
  const file = await memberUpload(deps, app, member, uploadId);
  if (!file) return fail(404, "not_found", "This upload doesn't exist.");
  if (file.status === "ready") return done(null);
  if (!deps.storage) return fail(503, "media_unavailable", "Files can't be sent right now.");
  const result = await completeUpload({ store: deps.store, storage: deps.storage, now: deps.now }, app.id, file.id);
  if (!result.ok) return fail(409, "incomplete", result.message, result.offset !== undefined ? { offset: result.offset } : {});
  return done(null);
}

// A person's account is deleted

/** Deletes the member, their messages and their files (DELETE /me, and a WordPress user's deletion). */
export async function forgetChatMember(deps: Pick<ChatDeps, "store" | "storage">, app: App, member: ChatMember): Promise<void> {
  for (const mediaId of await deps.store.listChatMediaOfMember(app.id, member.id)) await removeChatFile(deps, app, mediaId);
  await deps.store.deleteChatMember(app.id, member.id);
}
