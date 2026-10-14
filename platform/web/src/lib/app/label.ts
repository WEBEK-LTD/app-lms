import type { App } from "../data/types";

/** What an app is called in the dashboard, the admin and emails: its name, or "Untitled app" until it has one. */
export function appLabel(app: { appName?: App["appName"] } | null | undefined): string {
  return app?.appName?.trim() || "Untitled app";
}

/** At most this many apps per account. */
export const MAX_APPS_PER_CLIENT = 20;
