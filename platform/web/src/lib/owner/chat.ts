import { MEDIA_ASSET_PREFIX } from "../assets";
import { chatAvailable } from "../chat/access";
import { chatBusiness } from "../chat/hosted";
import {
  ownerBlock,
  ownerClearConversation,
  ownerConversations,
  ownerDeleteMessage,
  ownerKeep,
  ownerKeepExpiring,
  ownerMessages,
  ownerRead,
  ownerReports,
  ownerResolveReport,
  ownerSend,
  saveChatSettings,
  settingsView,
} from "../chat/owner";
import type { ChatDeps, ChatFailure } from "../chat/service";
import type { App } from "../data/types";
import { appPlan } from "../entitlements";
import { MEDIA_CHUNK_BYTES } from "../media/signing";
import type { PlanInfo } from "../plans";
import { teamCan } from "../team/permissions";
import { bodyObject, invalid, notAllowed, notAvailable, OwnerError, type OwnerContext, type OwnerResult } from "./http";
import { appScope } from "./sales";

/**
 * 77 The chat in Yallapp Business (owner.yaml, "Chat"): the same functions
 * as Dashboard › Chat. 404 `not_available` when the app has no chat (its
 * plan, or the owner turned it off) or the person lacks the Chat area; the
 * settings are read with Chat or Settings and changed with Settings.
 */

const fromChat = (failure: ChatFailure) => new OwnerError(failure.status, failure.code, failure.message);

function businessOf(ctx: OwnerContext, app: App) {
  const base = ctx.deps.baseUrl;
  return chatBusiness(app, (id) => (id.startsWith(MEDIA_ASSET_PREFIX) ? `${base}/m/${id.slice(MEDIA_ASSET_PREFIX.length)}` : `${base}/api/v1/assets/${id}`));
}

async function planOf(ctx: OwnerContext, appId: string | undefined): Promise<{ app: App; plan: PlanInfo | null }> {
  const { app, license } = appScope(ctx, appId);
  return { app, plan: await appPlan(ctx.deps.store, license, ctx.deps.now) };
}

/** The app's chat and what it needs, for someone with the Chat area. */
async function chatScope(ctx: OwnerContext, appId: string | undefined): Promise<{ app: App; deps: ChatDeps }> {
  const { app, plan } = await planOf(ctx, appId);
  if (!chatAvailable(app, plan) || !teamCan(ctx.access, "chat", app.id)) throw notAvailable();
  const business = businessOf(ctx, app);
  const { store, now, media } = ctx.deps;
  return {
    app,
    deps: { store, now, storage: media, chunkBytes: MEDIA_CHUNK_BYTES, business, plan, ...(ctx.deps.chatPushes ? { onMessage: ctx.deps.chatPushes(store, business.name) } : {}) },
  };
}

/** Who on the team did it, for the reports' history (as the dashboard keeps it). */
const byOf = (ctx: OwnerContext) => ctx.user.email;

export async function listConversations(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, deps } = await chatScope(ctx, params.app_id);
  const query = ctx.req.query;
  const kind = query.get("kind");
  if (kind !== null && kind !== "direct" && kind !== "group") throw invalid({ kind: "The request isn't valid." });
  const unread = query.get("unread");
  if (unread !== null && unread !== "true" && unread !== "false") throw invalid({ unread: "The request isn't valid." });
  const q = query.get("q") ?? "";
  if (q.length > 100) throw invalid({ q: "The request isn't valid." });
  const body = await ownerConversations(deps, app, { ...(kind ? { kind } : {}), unread: unread === "true", q });
  return { status: 200, body };
}

export async function listMessages(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, deps } = await chatScope(ctx, params.app_id);
  const page = await ownerMessages(deps, app, params.conversation_id!, ctx.req.query);
  if (!page.ok) throw fromChat(page);
  const { items, has_more, poll_after_seconds } = page.value;
  return { status: 200, body: { items, has_more, poll_after_seconds } };
}

export async function sendMessage(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, deps } = await chatScope(ctx, params.app_id);
  const sent = await ownerSend(deps, app, params.conversation_id!, { userId: ctx.user.id, name: ctx.user.name }, bodyObject(ctx.req.body));
  if (!sent.ok) throw fromChat(sent);
  return { status: 201, body: sent.value.view };
}

export async function readConversation(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, deps } = await chatScope(ctx, params.app_id);
  const read = await ownerRead(deps, app, params.conversation_id!, bodyObject(ctx.req.body).message_id);
  if (!read.ok) throw fromChat(read);
  return { status: 204 };
}

export async function keepConversation(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, deps } = await chatScope(ctx, params.app_id);
  const kept = await ownerKeep(deps, app, params.conversation_id!);
  if (!kept.ok) throw fromChat(kept);
  const { items } = await ownerConversations(deps, app, { limit: 500 });
  const thread = items.find((t) => t.id === kept.value.id);
  if (!thread) throw new OwnerError(404, "not_found", "This conversation doesn't exist.");
  return { status: 200, body: thread };
}

export async function keepExpiring(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, deps } = await chatScope(ctx, params.app_id);
  return { status: 200, body: { kept: await ownerKeepExpiring(deps, app) } };
}

export async function clearConversation(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, deps } = await chatScope(ctx, params.app_id);
  const cleared = await ownerClearConversation(deps, app, params.conversation_id!);
  if (!cleared.ok) throw fromChat(cleared);
  return { status: 204 };
}

export async function deleteMessage(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, deps } = await chatScope(ctx, params.app_id);
  const deleted = await ownerDeleteMessage(deps, app, params.message_id!, byOf(ctx));
  if (!deleted.ok) throw fromChat(deleted);
  return { status: 204 };
}

export async function listReports(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, deps } = await chatScope(ctx, params.app_id);
  const status = ctx.req.query.get("status") ?? "open";
  if (status !== "open" && status !== "closed") throw invalid({ status: "The request isn't valid." });
  return { status: 200, body: await ownerReports(deps, app, status) };
}

export async function resolveReport(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, deps } = await chatScope(ctx, params.app_id);
  const resolved = await ownerResolveReport(deps, app, params.report_id!, bodyObject(ctx.req.body).action, byOf(ctx));
  if (!resolved.ok) throw fromChat(resolved);
  return { status: 204 };
}

export async function blockMember(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, deps } = await chatScope(ctx, params.app_id);
  const blocked = await ownerBlock(deps, app, params.member_id!, ctx.req.method === "PUT");
  if (!blocked.ok) throw fromChat(blocked);
  return { status: 204 };
}

/** On or off and course groups: read with Chat or Settings, also when the plan has no chat (`available: false`). */
export async function getSettings(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, plan } = await planOf(ctx, params.app_id);
  if (!teamCan(ctx.access, "chat", app.id) && !teamCan(ctx.access, "settings", app.id)) throw notAvailable();
  return { status: 200, body: settingsView(app, plan) };
}

export async function updateSettings(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, plan } = await planOf(ctx, params.app_id);
  if (!teamCan(ctx.access, "settings", app.id)) throw notAllowed();
  if (!settingsView(app, plan).available) throw notAvailable();
  const body = bodyObject(ctx.req.body);
  const saved = await saveChatSettings(ctx.deps.store, app, { enabled: body.enabled, course_groups: body.course_groups }, ctx.deps.now);
  if (!saved.ok) throw fromChat(saved);
  // WordPress sites learn it from their license status (Config.chat).
  if (app.backend === "wordpress") ctx.deps.refreshSites?.([app.id]);
  const updated = { ...app, chatSettings: saved.value };
  return { status: 200, body: settingsView(updated, plan) };
}
