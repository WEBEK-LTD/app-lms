import "server-only";
import type { DataStore } from "../data/store";
import { encryptionKey, licenseRefreshTestUrl } from "../env";
import { ownerPushDeps } from "../owner/push-env";
import type { ChatDeps } from "./service";
import { pushChatMessage } from "./push";

/** 77 The pushes of a new chat message with the server's keys (the app's Firebase account, the license key, Yallapp Business's project). */
export function chatPushes(store: DataStore, businessName: string): NonNullable<ChatDeps["onMessage"]> {
  return async (input) => {
    const now = new Date();
    await pushChatMessage(
      { store, now, key: encryptionKey(), businessName, owner: await ownerPushDeps(now, store), testSiteUrl: licenseRefreshTestUrl() },
      input,
    );
  };
}
