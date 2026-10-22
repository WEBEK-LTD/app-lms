import "server-only";
import { assetUrl } from "../assets";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { MEDIA_CHUNK_BYTES } from "../media/signing";
import { getMediaStorage } from "../media/storage";
import type { PlanInfo } from "../plans";
import { chatBusiness } from "./hosted";
import { chatPushes } from "./push-env";
import type { ChatDeps } from "./service";

/** 77 What the business's side of the chat needs in the dashboard: the media server, the business as the app shows it, and pushes for its answers. */
export function dashboardChatDeps(store: DataStore, app: App, plan: PlanInfo | null, now: Date): ChatDeps {
  const business = chatBusiness(app, assetUrl);
  return { store, now, storage: getMediaStorage(), chunkBytes: MEDIA_CHUNK_BYTES, business, plan, onMessage: chatPushes(store, business.name) };
}
