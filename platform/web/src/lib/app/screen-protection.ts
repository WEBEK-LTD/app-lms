import type { App } from "../data/types";

/**
 * 53 Screenshots and screen recording in the app (`Config.app.screen_protection`):
 * `off`, `content` (course content only: lessons, quizzes, their attachments
 * and videos) or `app` (every screen). The owner chooses on the dashboard's
 * Screen protection page; off until they do. WordPress apps send the choice to
 * the plugin (`LicenseStatus.screen_protection`), where no choice leaves the
 * plugin's own "Block screenshots & screen recording". An app on its own API
 * gets it from that API's `/config`.
 */
export type ScreenProtection = "off" | "content" | "app";

export const SCREEN_PROTECTIONS: readonly ScreenProtection[] = ["off", "content", "app"];

/** The owner's saved choice, or null before they choose. */
export function screenProtectionChoice(app: Pick<App, "hostedSettings">): ScreenProtection | null {
  const value = app.hostedSettings?.screenProtection;
  return typeof value === "string" && SCREEN_PROTECTIONS.includes(value) ? value : null;
}

/** What the hosted API's `/config` says: the choice, off by default. */
export function hostedScreenProtection(app: Pick<App, "hostedSettings">): ScreenProtection {
  return screenProtectionChoice(app) ?? "off";
}

/** Only academies have course content to protect on its own; other apps protect every screen or none. */
export function offersContentScope(app: Pick<App, "appType">): boolean {
  return app.appType === "lms";
}

/** Whether the dashboard's choice reaches the app: the hosted API and WordPress do; an own API sends its own. */
export function choosesScreenProtection(app: Pick<App, "backend">): boolean {
  return app.backend !== "custom_api";
}

/** WordPress apps may leave it to the plugin's own setting. */
function onWordpress(app: Pick<App, "backend">): boolean {
  return app.backend === "wordpress" || app.backend === "setup_requested";
}

/**
 * The page's choice: `off`, `content` (academies), `app` or (WordPress only)
 * `plugin`, which saves null. Undefined for anything else.
 */
export function parseScreenProtectionChoice(choice: string, app: Pick<App, "appType" | "backend">): ScreenProtection | null | undefined {
  if (choice === "off" || choice === "app") return choice;
  if (choice === "content") return offersContentScope(app) ? "content" : undefined;
  if (choice === "plugin") return onWordpress(app) ? null : undefined;
  return undefined;
}

/** The form's value for the saved choice. */
export function screenProtectionFormValue(app: Pick<App, "hostedSettings" | "backend">): ScreenProtection | "plugin" {
  const choice = screenProtectionChoice(app);
  if (choice === null) return onWordpress(app) ? "plugin" : "off";
  return choice;
}
