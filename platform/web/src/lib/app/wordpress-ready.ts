import type { App } from "../data/types";
import { notifyWordpressReady, type NoticeDeps } from "../notices";

/**
 * 19 "Set up WordPress for me": our team sets up a WordPress site for the
 * client. When it's ready (the team says so on the client's page, or the
 * plugin activates the app's license on a site) the app moves to it: backend
 * "wordpress" with the site's address, and the owner gets a dashboard notice
 * and an email. Apps that aren't waiting for a site are left alone.
 */

/**
 * The https address of a site as the plugin reports it (or the team types
 * it): https, without query, fragment or trailing slash. Apps only connect
 * to secure sites. Null when it isn't a web address.
 */
export function httpsSiteAddress(raw: string): string | null {
  const value = raw.trim();
  if (!value || value.length > 255) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname || url.username || url.password) return null;
  const port = url.port && url.port !== "80" && url.port !== "443" ? `:${url.port}` : "";
  const path = url.pathname.replace(/\/+$/, "");
  return `https://${url.hostname.toLowerCase()}${port}${path}`;
}

/** Moves an app waiting for its WordPress site to that site, and tells the owner. Null when the app wasn't waiting. */
export async function moveToWordpress(deps: NoticeDeps, app: App, siteUrl: string): Promise<App | null> {
  if (app.backend !== "setup_requested") return null;
  const { store, now } = deps;
  await store.updateApp(app.id, { backend: "wordpress", siteUrl, connector: null, websiteDoneAt: app.websiteDoneAt ?? now }, now);
  const moved = await store.getAppById(app.id);
  const client = await store.getClientById(app.clientId);
  if (moved && client) {
    try {
      await notifyWordpressReady(deps, { app: moved, client, siteUrl });
    } catch (error) {
      // The move is done; the notice is a courtesy.
      console.error("[wordpress-ready] the notice wasn't saved", error);
    }
  }
  return moved;
}
