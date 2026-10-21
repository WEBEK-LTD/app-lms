import type { App } from "../data/types";

/**
 * 72 Videos from YouTube, Vimeo and the other video sites play in each
 * site's normal player, with its controls and branding, unless the owner
 * chooses to hide them (`Config.app.hide_video_branding`, roadmap 40's
 * player), at their own risk: hiding YouTube's branding may break YouTube's
 * terms, and YouTube can block the videos in the app. Off by default, also
 * for apps that existed before. WordPress apps get the choice through the
 * license status (`LicenseStatus.hide_video_branding`); an app on its own API
 * sends its own.
 */
export function hidesVideoBranding(app: Pick<App, "hostedSettings">): boolean {
  return app.hostedSettings?.hideVideoBranding === true;
}

/** Whether the dashboard's choice reaches the app: the hosted API and WordPress do; an own API sends its own. */
export function choosesVideoBranding(app: Pick<App, "backend">): boolean {
  return app.backend !== "custom_api";
}
