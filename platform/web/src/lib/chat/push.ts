import { createHash, createHmac } from "node:crypto";
import type { Lang } from "@/i18n/config";
import { revealLicenseKey } from "../admin/clients";
import { isPrivateAddress, resolveHost } from "../app/api-check";
import { httpsSiteAddress } from "../app/wordpress-ready";
import { appLang } from "../bookings/reschedule";
import type { DataStore } from "../data/store";
import type { App, ChatConversation, ChatMember, ChatMessage, MediaKind } from "../data/types";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX, serviceAccountOf } from "../hosted/notify";
import { pushTarget, sendPush } from "../hosted/push";
import { normalizeLicenseKey } from "../license/key";
import { pinnedFetch } from "../net/safe-fetch";
import { pushToOwner, type OwnerPushDeps } from "../owner/push";
import { noteAppError } from "../watch/app-errors";

/**
 * 77 Who hears of a new chat message, by push: the app's people in the
 * conversation (the person, when the business answers; the group's members
 * but the sender and those who blocked them), and the business's phones
 * (Yallapp Business, `new_chat_message`) when one of its people wrote.
 * Hosted apps and own APIs with Yallapp sign-in are pushed from here with
 * the app's Firebase account; a WordPress site keeps its people's push
 * tokens, so it gets a signed `POST /chat/notify` and pushes them itself.
 * Best effort: a push never holds up or fails the message.
 */

export const NOTIFY_PATH = "/wp-json/yallapp/v1/chat/notify";
const NOTIFY_TIMEOUT_MS = 5000;
const SITE_BATCH = 500;
const SITE_TITLE_MAX = 120;
const SITE_BODY_MAX = 200;

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export interface ChatPushDeps {
  store: DataStore;
  now: Date;
  /** The platform's encryption key (the app's Firebase account, the license key). */
  key: Buffer;
  /** The business's name, as the app shows it. */
  businessName: string;
  /** The owner's phones; null: none. */
  owner: OwnerPushDeps | null;
  send?: typeof sendPush;
  fetcher?: Fetch;
  resolve?: (host: string) => Promise<string[]>;
  /** Local tests only (LICENSE_REFRESH_TEST_URL): every site's notify goes to this fake site. */
  testSiteUrl?: string | null;
}

const ATTACHMENT_WORDS: Record<Lang, Record<"image" | "video" | "audio" | "file", string>> = {
  en: { image: "Photo", video: "Video", audio: "Voice message", file: "File" },
  ar: { image: "صورة", video: "فيديو", audio: "رسالة صوتية", file: "ملف" },
  tr: { image: "Fotoğraf", video: "Video", audio: "Sesli mesaj", file: "Dosya" },
};

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** What a push says of a message: its text, else what it sends ("Photo"), in a language. */
export function messagePreview(message: Pick<ChatMessage, "text">, fileKind: MediaKind | null, lang: Lang): string {
  const text = message.text?.replace(/\s+/g, " ").trim();
  if (text) return text;
  if (!fileKind) return "";
  const kind = fileKind === "image" || fileKind === "video" || fileKind === "audio" ? fileKind : "file";
  return ATTACHMENT_WORDS[lang][kind];
}

/** Lowercase hex HMAC-SHA256 of `yallapp-chat-notify:<timestamp>:<sha256 of the notification JSON>`, keyed with the license key in capitals. */
export function notifySignature(licenseKey: string, timestamp: number, notificationJson: string): string {
  const digest = createHash("sha256").update(notificationJson).digest("hex");
  return createHmac("sha256", normalizeLicenseKey(licenseKey)).update(`yallapp-chat-notify:${timestamp}:${digest}`).digest("hex");
}

/** The members a message is pushed to. */
export async function recipientsOf(store: DataStore, conversation: ChatConversation, message: ChatMessage): Promise<ChatMember[]> {
  let ids: string[];
  if (conversation.kind === "direct") {
    ids = message.senderKind === "business" && conversation.memberId ? [conversation.memberId] : [];
  } else {
    ids = [];
    for (const p of await store.listChatParticipants(conversation.id)) {
      if (p.memberId === message.memberId) continue;
      if (message.memberId && (await store.listChatBlocks(p.memberId)).includes(message.memberId)) continue;
      ids.push(p.memberId);
    }
  }
  return ids.length ? store.listChatMembersByIds(conversation.appId, ids) : [];
}

export interface ChatPushOutcome {
  /** Phones of hosted people the push went to. */
  hosted: number;
  /** The WordPress site's answer, when it was asked. */
  site: "sent" | "no_site" | "private_address" | "failed" | null;
  /** The business's phones. */
  owner: number;
}

/** Tells everyone who should hear of a new message. Never throws. */
export async function pushChatMessage(
  deps: ChatPushDeps,
  input: { app: App; conversation: ChatConversation; message: ChatMessage; sender: ChatMember | null },
): Promise<ChatPushOutcome> {
  const outcome: ChatPushOutcome = { hosted: 0, site: null, owner: 0 };
  const { app, conversation, message, sender } = input;
  try {
    const file = message.mediaId ? await deps.store.getMediaFile(app.id, message.mediaId) : null;
    const fileKind = file?.kind ?? null;
    const lang = await appLang(deps.store, app.id);
    const preview = messagePreview(message, fileKind, lang);
    const group = conversation.kind === "group";
    const senderName = sender?.name ?? deps.businessName;
    const title = group ? (conversation.title ?? deps.businessName) : deps.businessName;
    const body = group ? `${senderName}: ${preview}` : preview;
    const recipients = await recipientsOf(deps.store, conversation, message);
    const hosted = recipients.filter((m) => m.source === "hosted");
    const site = recipients.filter((m) => m.source === "wordpress");
    if (hosted.length) outcome.hosted = await pushHosted(deps, app, hosted, { title, body, conversationId: conversation.id });
    if (site.length) outcome.site = await notifySite(deps, app, site, { title, body, conversationId: conversation.id });
    if (sender && deps.owner && !app.demo) {
      outcome.owner = await pushToOwner(
        deps.owner,
        app.clientId,
        "new_chat_message",
        (w) => ({
          title: group ? w.t("owner.push.newChatGroup", { name: sender.name, group: conversation.title ?? "" }) : w.t("owner.push.newChat", { name: sender.name }),
          body: clip(messagePreview(message, fileKind, w.lang), 160),
        }),
        { app_id: app.id, conversation_id: conversation.id },
      );
    }
  } catch (error) {
    console.error(`[chat] app ${app.id}: push failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  return outcome;
}

async function pushHosted(deps: ChatPushDeps, app: App, members: ChatMember[], text: { title: string; body: string; conversationId: string }): Promise<number> {
  const account = serviceAccountOf(app, deps.key);
  if (!account) return 0;
  const userIds = members.map((m) => Number(m.externalId)).filter((id) => Number.isSafeInteger(id) && id > 0);
  const targets = (await deps.store.listHostedPushDevices(app.id, userIds)).map(pushTarget);
  if (targets.length === 0) return 0;
  const result = await (deps.send ?? sendPush)(
    account,
    targets,
    { title: clip(text.title, NOTIFICATION_TITLE_MAX), body: clip(text.body, NOTIFICATION_BODY_MAX), data: { type: "chat", conversation_id: text.conversationId } },
    { now: deps.now },
  );
  for (const token of result.invalidTokens) await deps.store.clearHostedPushToken(app.id, token);
  return result.sent;
}

/** The site's people, in batches of 500, with one signed request each. */
async function notifySite(
  deps: ChatPushDeps,
  app: App,
  members: ChatMember[],
  text: { title: string; body: string; conversationId: string },
): Promise<"sent" | "no_site" | "private_address" | "failed"> {
  const license = await deps.store.getLicenseForApp(app.clientId, app.id);
  const activation = license ? await deps.store.getActivation(license.id) : null;
  const base = deps.testSiteUrl ? deps.testSiteUrl.replace(/\/+$/, "") : activation ? httpsSiteAddress(activation.siteUrlRaw) : null;
  if (!license || !activation || !base) return "no_site";
  const url = `${base}${NOTIFY_PATH}`;
  if (!deps.testSiteUrl) {
    const addresses = await (deps.resolve ?? resolveHost)(new URL(url).hostname);
    if (addresses.length === 0 || addresses.some(isPrivateAddress)) return "private_address";
  }
  const key = revealLicenseKey(license, deps.key);
  const fetcher = deps.fetcher ?? (deps.testSiteUrl ? fetch : pinnedFetch(undefined, deps.resolve));
  const userIds = [...new Set(members.map((m) => Number(m.externalId)).filter((id) => Number.isSafeInteger(id) && id > 0))];
  let outcome: "sent" | "failed" = "sent";
  for (let i = 0; i < userIds.length; i += SITE_BATCH) {
    const notification = JSON.stringify({
      user_ids: userIds.slice(i, i + SITE_BATCH),
      title: clip(text.title, SITE_TITLE_MAX),
      body: clip(text.body, SITE_BODY_MAX),
      conversation_id: text.conversationId,
    });
    const timestamp = Math.floor(deps.now.getTime() / 1000);
    try {
      const response = await fetcher(url, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(NOTIFY_TIMEOUT_MS),
        headers: { accept: "application/json", "content-type": "application/json" },
        // The notification as it was signed: the site hashes these bytes.
        body: `{"timestamp":${timestamp},"signature":"${notifySignature(key, timestamp, notification)}","notification":${notification}}`,
      });
      await response.body?.cancel().catch(() => undefined);
      if (response.status !== 202) outcome = "failed";
    } catch {
      outcome = "failed";
    }
  }
  // 78.4 The site didn't pass the message on to its people's phones: counted for the team.
  if (outcome === "failed") {
    await noteAppError(deps.store, { clientId: app.clientId, appId: app.id, source: "wordpress", code: "chat_notify_failed", detail: "The WordPress site didn't take a chat message's push (plugin 0.4.9 or later, reachable, its license active)." }, deps.now);
  }
  return outcome;
}
