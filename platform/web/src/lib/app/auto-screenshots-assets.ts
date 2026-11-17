import "server-only";
import { getBlobStore } from "../blobs";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { AssetKind } from "../data/types";

/** 139 A screenshot saved as the client's asset, like an upload (its blob under the client's assets). */
export function screenshotSaver(store: Pick<DataStore, "createAsset">) {
  return async (clientId: string, kind: AssetKind, data: Buffer, contentType: string, extension: string): Promise<string> => {
    const id = newId();
    const blobKey = `assets/${clientId}/${id}.${extension}`;
    await getBlobStore().put(blobKey, data, contentType);
    await store.createAsset({ id, clientId, kind, blobKey, contentType, size: data.length, createdAt: new Date() });
    return id;
  };
}
