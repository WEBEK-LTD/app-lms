import "server-only";
import { getBlobStore } from "../blobs";
import type { DataStore } from "../data/store";
import { encryptionKey } from "../env";
import type { PreflightDeps } from "./preflight";
import { yallappFirebase } from "../firebase/env";
import { firebaseSetUp, syncAppFirebase } from "../firebase/register";

/** 87.1 What the checks before a build read: the app's uploads, and the key its secrets are encrypted with. */
export function preflightDeps(store: DataStore): PreflightDeps {
  const blobs = getBlobStore();
  // 136 Yallapp's Firebase, when it's set up here: an app not fully registered is, before its build.
  const firebase = yallappFirebase(store);
  return {
    key: encryptionKey(),
    readAsset: async (id: string) => {
      const asset = await store.getAsset(id);
      return asset ? ((await blobs.get(asset.blobKey))?.data ?? null) : null;
    },
    ...(firebase
      ? {
          yallappFirebase: async (app) => {
            try {
              if (!(await firebaseSetUp(store, app))) await syncAppFirebase(firebase.registrations(), app);
            } catch (error) {
              console.error(`[firebase] before the build of ${app.id}: ${error instanceof Error ? error.message : String(error)}`);
            }
            return (await store.getAppById(app.id)) ?? app;
          },
        }
      : {}),
  };
}
