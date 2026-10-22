"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { appLabel } from "@/lib/app/label";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { chatAvailable, chatSessionKind } from "@/lib/chat/access";
import { ownerBlock, ownerClearConversation, ownerDeleteMessage, ownerKeep, ownerKeepExpiring, ownerResolveReport, ownerSend, saveChatSettings } from "@/lib/chat/owner";
import type { ChatDeps } from "@/lib/chat/service";
import { dashboardChatDeps } from "@/lib/chat/dashboard";
import { getStore } from "@/lib/data";
import type { App, MediaKind } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import type { FormState } from "@/lib/forms";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";
import { fileUrl, isMediaId } from "@/lib/media/files";
import { formatBytes } from "@/lib/media/quota";

/**
 * 77 Dashboard › Chat: the business answers and looks after its chat. Who
 * has the Chat area works here (lib/team/permissions.ts); the switches are
 * the app's settings (owners and managers).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

/** The current app with chat, and what the chat's functions need. */
async function chatContext(): Promise<{ context: ClientContext; app: App; deps: ChatDeps; by: string; team: { userId: string; name: string } }> {
  const context = await clientFor("chat");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const app = context.app;
  if (!app) redirect("/dashboard/app-type");
  const store = await getStore();
  const now = new Date();
  const plan = await appPlan(store, context.license, now);
  if (!chatAvailable(app, plan)) redirect("/dashboard/chat");
  const person = context.member ?? context.staff ?? context.user;
  return { context, app, by: person.email, team: { userId: person.id, name: person.name }, deps: dashboardChatDeps(store, app, plan, now) };
}

const back = (conversationId: string) => (UUID.test(conversationId) ? `/dashboard/chat/${conversationId}` : "/dashboard/chat");

/** A reply as the business: text, a file from the Media library, or both. */
export async function sendChatReplyAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app, deps, team } = await chatContext();
  const conversationId = field(formData, "conversation");
  const text = String(formData.get("text") ?? "");
  const mediaId = field(formData, "media");
  if (!text.trim() && !mediaId) return { errors: { text: "Write a message or attach a file." } };
  const sent = await ownerSend(deps, app, conversationId, team, { client_id: field(formData, "client"), text, ...(mediaId ? { media_id: mediaId } : {}) });
  if (!sent.ok) {
    if (sent.status === 404) return { message: "This conversation doesn't exist any more." };
    return { errors: { text: sent.message }, values: { text } };
  }
  revalidatePath(back(conversationId));
  return { ok: true, message: "Sent." };
}

export async function deleteChatMessageAction(formData: FormData): Promise<void> {
  const { app, deps, by } = await chatContext();
  await ownerDeleteMessage(deps, app, field(formData, "message"), by);
  const to = field(formData, "back");
  revalidatePath("/dashboard/chat", "layout");
  redirect(to === "reports" ? "/dashboard/chat?view=reports" : back(field(formData, "conversation")));
}

/** Every message and file of a conversation, at once. */
export async function clearChatConversationAction(formData: FormData): Promise<void> {
  const { app, deps } = await chatContext();
  const conversationId = field(formData, "conversation");
  await ownerClearConversation(deps, app, conversationId);
  revalidatePath("/dashboard/chat", "layout");
  redirect(back(conversationId));
}

export async function keepChatConversationAction(formData: FormData): Promise<void> {
  const { app, deps } = await chatContext();
  const conversationId = field(formData, "conversation");
  await ownerKeep(deps, app, conversationId);
  revalidatePath("/dashboard/chat", "layout");
  redirect(back(conversationId));
}

/** Keeps every conversation whose messages would be deleted within 30 days. */
export async function keepAllChatsAction(): Promise<void> {
  const { app, deps } = await chatContext();
  await ownerKeepExpiring(deps, app);
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/chat");
}

export async function resolveChatReportAction(formData: FormData): Promise<void> {
  const { app, deps, by } = await chatContext();
  await ownerResolveReport(deps, app, field(formData, "report"), field(formData, "action"), by);
  revalidatePath("/dashboard/chat", "layout");
  redirect("/dashboard/chat?view=reports");
}

/** Stops a person sending messages, or lets them again. */
export async function blockChatMemberAction(formData: FormData): Promise<void> {
  const { app, deps } = await chatContext();
  await ownerBlock(deps, app, field(formData, "member"), formData.get("blocked") === "1");
  revalidatePath("/dashboard/chat", "layout");
  redirect(back(field(formData, "conversation")));
}

/** Chat on or off, and an academy's course groups (the app's settings). */
export async function saveChatSettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const app = context.app;
  if (!app) redirect("/dashboard/app-type");
  if (!chatSessionKind(app)) return { message: "Chat isn't available in this app." };
  const before = app.chatSettings ?? null;
  const saved = await saveChatSettings(
    await getStore(),
    app,
    { enabled: formData.get("enabled") === "on", ...(app.appType === "lms" ? { course_groups: formData.get("courseGroups") === "on" } : {}) },
    new Date(),
  );
  if (!saved.ok) return { message: saved.message };
  await recordStaffChange(context, `Changed the chat's settings of ${appLabel(app)}`, before, saved.value);
  // The plugin reads the chat from its license status: ask the site to check now.
  if (app.backend === "wordpress") refreshSitesSoon([app.id]);
  revalidatePath("/dashboard/chat");
  return {
    ok: true,
    message: app.backend === "wordpress" ? "Saved. Your website gets it within a minute when it can be reached, otherwise at its next check (twice a day). The app follows it the next time it opens." : "Saved. The app follows it the next time it opens.",
    values: { enabled: saved.value.enabled ? "on" : "", courseGroups: saved.value.courseGroups ? "on" : "" },
  };
}

export interface ChatLibraryFile {
  id: string;
  name: string;
  kind: MediaKind;
  size: string;
  thumbUrl: string | null;
}

/** The Media library's ready pictures, videos and PDFs, to attach to an answer. */
export async function listChatLibraryAction(): Promise<ChatLibraryFile[]> {
  const { app, deps } = await chatContext();
  const files = await deps.store.listMediaFiles(app.id, { status: "ready", limit: 300 });
  return files
    .filter((f) => f.source !== "chat" && (f.kind === "image" || f.kind === "video" || f.kind === "pdf") && isMediaId(f.id))
    .map((f) => ({
      id: f.id,
      name: f.name,
      kind: f.kind,
      size: formatBytes(f.sizeBytes),
      thumbUrl: f.kind === "image" && deps.storage ? fileUrl(deps.storage, f, { ttlSeconds: 3600 }).url : null,
    }));
}
