import type { DataStore } from "../data/store";
import type { App, ChatConversation, ChatMember, ChatMessage } from "../data/types";
import type { MediaStorage } from "../media/storage";
import type { PlanInfo } from "../plans";
import { chatAvailable } from "./access";
import {
  memberBlock,
  memberCompleteUpload,
  memberConversations,
  memberDeleteMessage,
  memberGroupMembers,
  memberMessages,
  memberReport,
  memberResumeUpload,
  memberSend,
  memberStartUpload,
  memberRead,
  syncHostedGroups,
  type ChatDeps,
  type ChatFailure,
  type ChatResult,
} from "./service";

/**
 * 77 The Chat routes of the hosted API (openapi.yaml, the Chat tag) for every
 * app with chat, whatever serves its content: `lib/hosted/service.ts` finds
 * the person (their access token, or a WordPress chat token) and hands the
 * request here.
 */

export interface HostedChatDeps {
  storage: MediaStorage | null;
  chunkBytes: number;
  onMessage?: ChatDeps["onMessage"];
}

export interface ChatRouteContext {
  store: DataStore;
  app: App;
  plan: PlanInfo | null | undefined;
  now: Date;
  assetUrl: (assetId: string) => string;
  chat: HostedChatDeps | null | undefined;
}

interface Answer {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

const record = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

function failure(f: ChatFailure): Answer {
  const extra: Record<string, unknown> = {};
  if (f.retryAfter !== undefined) extra.retry_after_seconds = f.retryAfter;
  if (f.offset !== undefined) extra.offset = f.offset;
  return { status: f.status, body: { code: f.code, message: f.message, ...extra }, ...(f.retryAfter !== undefined ? { headers: { "retry-after": String(f.retryAfter) } } : {}) };
}

function answer<T>(result: ChatResult<T>, status = 200, body: (value: T) => unknown = (v) => v): Answer {
  if (!result.ok) return failure(result);
  return status === 204 ? { status } : { status, body: body(result.value) };
}

/** The business as the app shows it in the chat: the app's name and logo. */
export function chatBusiness(app: App, assetUrl: (assetId: string) => string): { name: string; imageUrl: string | null } {
  return { name: app.appName?.trim() || "App", imageUrl: app.logoAssetId ? assetUrl(app.logoAssetId) : null };
}

export async function handleChatRoute(
  ctx: ChatRouteContext,
  req: { method: string; path: string[]; query: URLSearchParams; body: unknown },
  member: ChatMember | null,
): Promise<Answer> {
  if (!ctx.chat || !chatAvailable(ctx.app, ctx.plan)) {
    return { status: 403, body: { code: "chat_not_available", message: "Chat isn't available in this app." } };
  }
  if (!member) return { status: 401, body: { code: "invalid_token", message: "Your session has ended. Please sign in again." } };
  const deps: ChatDeps = {
    store: ctx.store,
    now: ctx.now,
    storage: ctx.chat.storage,
    chunkBytes: ctx.chat.chunkBytes,
    business: chatBusiness(ctx.app, ctx.assetUrl),
    plan: ctx.plan ?? null,
    onMessage: ctx.chat.onMessage,
  };
  const { app } = ctx;
  const [, a, b, c] = req.path;
  const body = record(req.body);
  const n = req.path.length;
  const is = (method: string) => req.method === method;

  if (n === 2 && a === "conversations" && is("GET")) {
    await syncHostedGroups(deps, app, member, ctx.assetUrl);
    return { status: 200, body: await memberConversations(deps, app, member) };
  }
  if (n === 2 && a === "unread" && is("GET")) {
    await syncHostedGroups(deps, app, member, ctx.assetUrl);
    const list = await memberConversations(deps, app, member);
    return { status: 200, body: { unread_count: list.unread_count } };
  }
  if (n === 4 && a === "conversations" && c === "messages") {
    if (is("GET")) return answer(await memberMessages(deps, app, member, b!, req.query));
    if (is("POST")) {
      const sent = await memberSend(deps, app, member, b!, body);
      return answer(sent, 201, (v) => v.view);
    }
  }
  if (n === 4 && a === "conversations" && c === "read" && is("POST")) return answer(await memberRead(deps, app, member, b!, body), 204);
  if (n === 4 && a === "conversations" && c === "members" && is("GET")) return answer(await memberGroupMembers(deps, app, member, b!));
  if (n === 3 && a === "messages" && is("DELETE")) return answer(await memberDeleteMessage(deps, app, member, b!), 204);
  if (n === 4 && a === "messages" && c === "report" && is("POST")) return answer(await memberReport(deps, app, member, b!, body), 204);
  if (n === 4 && a === "members" && c === "block" && (is("PUT") || is("DELETE"))) return answer(await memberBlock(deps, app, member, b!, is("PUT")), 204);
  if (n === 2 && a === "uploads" && is("POST")) return answer(await memberStartUpload(deps, app, member, body), 201);
  if (n === 4 && a === "uploads" && c === "resume" && is("POST")) return answer(await memberResumeUpload(deps, app, member, b!));
  if (n === 4 && a === "uploads" && c === "complete" && is("POST")) return answer(await memberCompleteUpload(deps, app, member, b!), 204);
  return { status: 404, body: { code: "not_found", message: "This isn't available in this app." } };
}

/** Pushes for a new message, built where the platform's keys are (the route). */
export type OnChatMessage = (input: { app: App; conversation: ChatConversation; message: ChatMessage; sender: ChatMember | null }) => Promise<void>;
