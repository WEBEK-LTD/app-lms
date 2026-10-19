import type { App } from "../data/types";
import { hasFeature, type PlanInfo } from "../plans";

/**
 * 45 Lessons saved on the phone for offline viewing (`Config.features.downloads`,
 * `POST /lessons/{id}/download`). They come with offline mode in the plan
 * (`offline_downloads`, Growth and up) and the owner turns them on or off on
 * the dashboard's Courses page. The app keeps them encrypted and deletes them
 * when the student's access ends, when downloads are turned off, and after
 * `DOWNLOAD_KEEP_DAYS` days without an access check.
 */
export const DOWNLOAD_KEEP_DAYS = 30;

/** How long a download link is said to work: the app downloads at once and asks again to resume. */
export const DOWNLOAD_LINK_MINUTES = 15;

/** Lessons one access check may ask about. */
export const DOWNLOAD_CHECK_MAX = 500;

/**
 * The owner's choice on the Courses page: true or false, or null before they
 * choose. WordPress apps send it to the plugin (`LicenseStatus.offline_downloads`),
 * where null leaves the plugin's own setting.
 */
export function downloadsChoice(app: Pick<App, "hostedSettings">): boolean | null {
  const value = app.hostedSettings?.offlineDownloads;
  return typeof value === "boolean" ? value : null;
}

/** Whether an app on the hosted API offers downloads: the plan has offline mode and the owner hasn't turned them off (on by default). */
export function hostedDownloadsOn(app: Pick<App, "hostedSettings">, plan: PlanInfo | null | undefined): boolean {
  return hasFeature(plan, "offline_downloads") && (downloadsChoice(app) ?? true);
}

/** Academy apps whose lessons can be saved: courses managed in Yallapp, or a WordPress site's (not a connected school's). */
export function offersDownloads(app: Pick<App, "appType" | "backend" | "connector">): boolean {
  return app.appType === "lms" && (app.connector?.kind === "courses" || app.backend === "wordpress" || app.backend === "setup_requested");
}

/**
 * The Courses page's choice: `on`, `off` or (WordPress only) `plugin`, the
 * plugin's own setting. Undefined for anything else.
 */
export function parseDownloadsChoice(choice: string, app: Pick<App, "connector">): boolean | null | undefined {
  if (choice === "on") return true;
  if (choice === "off") return false;
  if (choice === "plugin" && app.connector?.kind !== "courses") return null;
  return undefined;
}

/** The form's value for the saved choice. */
export function downloadsFormValue(app: Pick<App, "hostedSettings" | "connector">): "on" | "off" | "plugin" {
  const choice = downloadsChoice(app);
  if (choice === null) return app.connector?.kind === "courses" ? "on" : "plugin";
  return choice ? "on" : "off";
}

const FILE_EXTENSIONS =["mp4", "m4v", "mov", "webm", "mp3", "m4a"];

/**
 * Whether a lesson's video address is a file the app can save: a direct file
 * (an address ending in .mp4 and the like), not a video site's page or player
 * (YouTube, Vimeo, Bunny Stream and others need the internet).
 */
export function isVideoFile(url: string): boolean {
  try {
    const address = new URL(url);
    if (address.protocol !== "https:" && address.protocol !== "http:") return false;
    const extension = address.pathname.split(".").pop()?.toLowerCase() ?? "";
    return address.pathname.includes(".") && FILE_EXTENSIONS.includes(extension);
  } catch {
    return false;
  }
}
