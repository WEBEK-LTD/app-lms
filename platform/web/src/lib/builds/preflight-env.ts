import "server-only";
import { getBlobStore } from "../blobs";
import type { DataStore } from "../data/store";
import { encryptionKey } from "../env";
import type { PreflightDeps } from "./preflight";

/** 87.1 What the checks before a build read: the app's uploads, and the key its secrets are encrypted with. */
export function preflightDeps(store: Pick<DataStore, "getAsset">): PreflightDeps {
  const blobs = getBlobStore();
  return {
    key: encryptionKey(),
    readAsset: async (id: string) => {
      const asset = await store.getAsset(id);
      return asset ? ((await blobs.get(asset.blobKey))?.data ?? null) : null;
    },
  };
}
