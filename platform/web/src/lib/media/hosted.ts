import "server-only";
import type { DataStore } from "../data/store";
import { appUrl } from "../env";
import type { CoursesMedia } from "../hosted/connectors/courses";
import { parseMediaLink, resolveMedia } from "./files";
import { getMediaStorage } from "./storage";

/** 51 The hosted API's view of an app's Media library: lesson videos given as Yallapp links play from signed links. */
export function mediaForApp(store: DataStore, appId: string): CoursesMedia {
  const baseUrl = appUrl();
  const storage = getMediaStorage();
  return {
    isLink: (url) => parseMediaLink(url, baseUrl) !== null,
    resolve: (url, purpose) => resolveMedia({ store, storage, baseUrl }, appId, url, purpose),
  };
}
