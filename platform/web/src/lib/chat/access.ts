import { usesPlugin } from "../app/label";
import { yallappSignsIn } from "../hosted/sign-in-methods";
import type { App, ChatSettings } from "../data/types";
import { hasFeature, type PlanInfo } from "../plans";

/**
 * 77 Who has chat. The app's plan has it (Pro and Business by default), the
 * owner didn't turn it off, and Yallapp knows who the app's people are: the
 * hosted API, a WordPress site (through its plugin) or an own API that lets
 * Yallapp sign people in. An own API that signs people in itself has none.
 */

export const DEFAULT_CHAT_SETTINGS: ChatSettings = { enabled: true, courseGroups: false };

export function chatSettingsOf(app: Pick<App, "chatSettings">): ChatSettings {
  return { ...DEFAULT_CHAT_SETTINGS, ...(app.chatSettings ?? {}) };
}

/** Where the app's people sign in, for the chat: their access token, or a chat token from their WordPress site. */
export function chatSessionKind(app: Pick<App, "backend" | "hostedSettings">): "access_token" | "site" | null {
  if (app.backend === "hosted") return "access_token";
  if (usesPlugin(app)) return "site";
  if (app.backend === "custom_api" && yallappSignsIn(app)) return "access_token";
  return null;
}

/** The plan has chat (whatever the owner chose). */
export function planHasChat(plan: PlanInfo | null | undefined): boolean {
  return Boolean(plan && hasFeature(plan, "chat"));
}

/** Chat is on in this app: its plan has it, the owner left it on, and the app's people can sign in to it. */
export function chatAvailable(app: Pick<App, "chatSettings" | "backend" | "hostedSettings">, plan: PlanInfo | null | undefined): boolean {
  return planHasChat(plan) && chatSettingsOf(app).enabled && chatSessionKind(app) !== null;
}

/** Academies with course groups turned on. */
export function chatGroupsOn(app: Pick<App, "chatSettings" | "appType">): boolean {
  return app.appType === "lms" && chatSettingsOf(app).courseGroups;
}

/** The hosted API's address for the app, where the chat is. */
export function chatBaseUrl(platformUrl: string, appId: string): string {
  return `${platformUrl.replace(/\/+$/, "")}/api/app/${appId}`;
}

/** `Config.chat` (openapi.yaml ChatConfig), or null when the app has no chat. */
export function chatConfig(app: App, plan: PlanInfo | null | undefined, platformUrl: string): { base_url: string; session: "access_token" | "site"; groups: boolean } | null {
  const session = chatSessionKind(app);
  if (!session || !chatAvailable(app, plan)) return null;
  return { base_url: chatBaseUrl(platformUrl, app.id), session, groups: chatGroupsOn(app) };
}
