import "server-only";
import type { AccountPurgeDeps } from "../account/purge";
import { getBlobStore } from "../blobs";
import type { DataStore } from "../data/store";
import { sendTemplate } from "../email/send";
import { filesBaseUrl, filesSigningSecret } from "../env";
import { getMediaStorage } from "../media/storage";
import { planReceiptDocument } from "../receipts/service";
import { buildFolderRemover, type BuildFolderRemover } from "./build-files";
import type { PurgeDeps } from "./deletion";

/** 73 The environment's places for an app's files, for the daily job and the admin's "Delete now". */
export function purgeDeps(store: DataStore, now: Date): PurgeDeps {
  return { store, now, media: getMediaStorage(), blobs: getBlobStore(), removeBuildFolder: filesRemover() };
}

/** 73 The same, with the "Account deleted" email and the receipts kept with the billing records. */
export function accountPurgeDeps(store: DataStore, now: Date): AccountPurgeDeps {
  return {
    ...purgeDeps(store, now),
    mail: async (key, to, values, lang) => void (await sendTemplate(key, to, values, { lang })),
    receipt: (payment) => planReceiptDocument(store, payment),
  };
}

/** Removes build folders on the files host; null until FILES_SIGNING_SECRET is set (the folders are then listed for our team). */
function filesRemover(): BuildFolderRemover | null {
  try {
    const secret = filesSigningSecret();
    return secret ? buildFolderRemover({ baseUrl: filesBaseUrl(), secret }) : null;
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    return null;
  }
}
