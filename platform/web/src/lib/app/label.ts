import type { App } from "../data/types";

/** What an app is called in the dashboard, the admin and emails: its name, or "Untitled app" until it has one. */
export function appLabel(app: { appName?: App["appName"] } | null | undefined): string {
  return app?.appName?.trim() || "Untitled app";
}

/** Whether the app runs on a WordPress site with the Yallapp plugin (its own, or one we set up). */
export function usesPlugin(app: { backend: App["backend"] } | null | undefined): boolean {
  return !app || app.backend === "wordpress" || app.backend === "setup_requested";
}

/** 75 The activation email: the license key and the plugin's steps only for an app on WordPress. */
export function activationEmail(app: { backend: App["backend"] } | null | undefined): "account_activated" | "app_activated" {
  return usesPlugin(app) ? "account_activated" : "app_activated";
}

/**
 * The name of the dashboard's license page for this app: "License & plugin"
 * when the app uses the plugin, "Plan" otherwise (75: no plugin and no license key to show).
 */
export function licensePageName(app: { backend: App["backend"] } | null | undefined): string {
  return usesPlugin(app) ? "License & plugin" : "Plan";
}

/** At most this many apps per account. */
export const MAX_APPS_PER_CLIENT = 20;
