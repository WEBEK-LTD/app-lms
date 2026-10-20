import "server-only";
import type { DataStore } from "../data/store";
import { appUrl } from "../env";
import type { CoursesMedia } from "../hosted/connectors/courses";
import { parseMediaLink, resolveMedia } from "./files";
import { getMediaStorage } from "./storage";

/** 62 The app sends this (`1`) when it plays Media links bound to the student, with their access token (docs/api/openapi.yaml, Video). */
export const BOUND_MEDIA_HEADER = "x-yallapp-bound-media";

/**
 * 51 The hosted API's view of an app's Media library: lesson videos given as
 * Yallapp links play from signed links. 62 With `bindTo` (the access token
 * the app called with, when it sent BOUND_MEDIA_HEADER), play links work
 * only with that token.
 */
export function mediaForApp(store: DataStore, appId: string, options: { bindTo?: string | null } = {}): CoursesMedia {
  const baseUrl = appUrl();
  const storage = getMediaStorage();
  return {
    isLink: (url) => parseMediaLink(url, baseUrl) !== null,
    resolve: (url, purpose) => resolveMedia({ store, storage, baseUrl }, appId, url, purpose, { bindTo: options.bindTo ?? null }),
  };
}
