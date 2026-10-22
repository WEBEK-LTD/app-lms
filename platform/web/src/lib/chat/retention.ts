import { appLabel } from "../app/label";
import type { App, OwnerNotice } from "../data/types";
import { mailOptions } from "../email/mail-lang";
import { deleteMedia } from "../media/files";
import type { MediaStorage } from "../media/storage";
import type { NoticeDeps } from "../notices";
import { pushNotice } from "../owner/push";
import { pushOwnerSafely } from "../owner/push-env";
import { CHAT_KEEP_DAYS, CHAT_NOTICE_DAYS, expiresOn } from "./owner";
import { removeChatFile } from "./service";

/**
 * 77 The chat's part of the daily job. Messages are kept a year: those sent
 * before then go, with the files sent with them, unless the business kept
 * their conversation (`keepUntil`). Thirty days before, the business is
 * told once (a dashboard notice, an email and its phones) and can keep them
 * another year. Files sent in the chat but never in a message after a day,
 * and chat tokens that ended, go too.
 */

const DAY = 86_400_000;
const BATCH = 500;
const UNSENT_UPLOAD_HOURS = 24;

export interface ChatRetentionDeps extends NoticeDeps {
  storage: MediaStorage | null;
}

export interface ChatRetentionReport {
  conversations: number;
  filesDeleted: number;
  notices: number;
  uploadsDeleted: number;
  sessionsDeleted: number;
}

const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Deletes what is over a year old and not kept. */
export async function deleteExpiredMessages(deps: ChatRetentionDeps): Promise<{ conversations: number; filesDeleted: number }> {
  const before = new Date(deps.now.getTime() - CHAT_KEEP_DAYS * DAY);
  const apps = new Map<string, App | null>();
  let conversations = 0;
  let filesDeleted = 0;
  for (const { conversation } of await deps.store.listChatConversationsWithMessagesBefore(before, BATCH, { notKeptAt: deps.now })) {
    try {
      if (!apps.has(conversation.appId)) apps.set(conversation.appId, await deps.store.getAppById(conversation.appId));
      const app = apps.get(conversation.appId);
      if (!app) continue;
      const files = await deps.store.deleteChatMessagesBefore(conversation.id, before);
      for (const mediaId of files) {
        await removeChatFile({ store: deps.store, storage: deps.storage }, app, mediaId);
        filesDeleted += 1;
      }
      conversations += 1;
    } catch (error) {
      console.error(`[daily] chat ${conversation.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { conversations, filesDeleted };
}

/**
 * One notice per app at most every 30 days, when some of its conversations
 * lose messages within 30 days (and it didn't keep them): how many, and the
 * first day.
 */
export async function noticeExpiringChats(deps: ChatRetentionDeps): Promise<OwnerNotice[]> {
  const soon = new Date(deps.now.getTime() + CHAT_NOTICE_DAYS * DAY);
  const rows = await deps.store.listChatConversationsWithMessagesBefore(new Date(soon.getTime() - CHAT_KEEP_DAYS * DAY), 5000, { notKeptAt: soon });
  const byApp = new Map<string, { count: number; first: Date }>();
  for (const { conversation, oldest } of rows) {
    const expires = expiresOn(oldest, conversation.keepUntil);
    if (!expires || expires.getTime() > soon.getTime()) continue;
    const seen = byApp.get(conversation.appId);
    byApp.set(conversation.appId, { count: (seen?.count ?? 0) + 1, first: seen && seen.first.getTime() < expires.getTime() ? seen.first : expires });
  }
  const created: OwnerNotice[] = [];
  for (const [appId, { count, first }] of byApp) {
    try {
      const app = await deps.store.getAppById(appId);
      const client = app ? await deps.store.getClientById(app.clientId) : null;
      if (!app || !client || app.demo) continue;
      const recent = (await deps.store.listOwnerNotices({ clientId: client.id, appId: app.id, limit: 50 })).find(
        (n) => n.kind === "chat_expiring" && n.createdAt.getTime() > deps.now.getTime() - CHAT_NOTICE_DAYS * DAY,
      );
      if (recent) continue;
      await deps.store.resolveOwnerNotices(app.id, ["chat_expiring"], deps.now);
      const name = appLabel(app);
      const chatUrl = `${deps.baseUrl.replace(/\/+$/, "")}/dashboard/open?${new URLSearchParams({ app: app.id, to: "chat" }).toString()}`;
      const date = day(first.getTime() < deps.now.getTime() ? deps.now : first);
      const notice = await deps.store.createOwnerNotice({
        clientId: client.id,
        appId: app.id,
        kind: "chat_expiring",
        dedupeKey: `chat_expiring:${deps.now.toISOString().slice(0, 10)}`,
        title: `${name}: chat messages will be deleted on ${date}`,
        body: `Messages sent over a year ago in ${count} conversations will be deleted on ${date}, with their photos, videos and files. Keep them for another year, or let them go.`,
        linkUrl: chatUrl,
        linkLabel: "Keep messages",
        tone: "warn",
        createdAt: deps.now,
        emailedAt: null,
        dismissedAt: null,
        resolvedAt: null,
      });
      if (!notice) continue;
      created.push(notice);
      await pushOwnerSafely((d) => pushNotice(d, notice), deps.store);
      const owner = await deps.store.getUserById(client.userId);
      if (owner) {
        try {
          await deps.mail("chat_expiring", owner.email, { name: owner.name, app_name: name, date, conversations: String(count), chat_url: chatUrl }, ...mailOptions(owner));
          await deps.store.updateOwnerNotice(client.id, notice.id, { emailedAt: deps.now });
        } catch (error) {
          console.error("[chat] expiring email failed", error);
        }
      }
    } catch (error) {
      console.error(`[daily] chat notice ${appId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return created;
}

/** Files sent in the chat that never went into a message, a day on. */
export async function deleteUnsentUploads(deps: ChatRetentionDeps): Promise<number> {
  let deleted = 0;
  for (const mediaId of await deps.store.listUnsentChatUploads(new Date(deps.now.getTime() - UNSENT_UPLOAD_HOURS * 3_600_000), BATCH)) {
    const upload = await deps.store.getChatUpload(mediaId);
    if (upload && (await deleteMedia({ store: deps.store, storage: deps.storage }, upload.appId, mediaId).catch(() => false))) deleted += 1;
  }
  return deleted;
}

export async function runChatRetention(deps: ChatRetentionDeps): Promise<ChatRetentionReport> {
  const expired = await deleteExpiredMessages(deps);
  const notices = await noticeExpiringChats(deps);
  return {
    ...expired,
    notices: notices.length,
    uploadsDeleted: await deleteUnsentUploads(deps),
    sessionsDeleted: await deps.store.deleteExpiredChatSessions(deps.now),
  };
}
