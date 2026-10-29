import { sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { AssetKind } from "../data/types";
import { artPng } from "./art";
import { PICTURES, type PictureName } from "./pictures";

/**
 * The drawn pictures (lib/demo/pictures.ts) saved as an account's files:
 * the demo apps' (roadmap 16), and 110.2 the sample entries' of an app.
 */

/** A UUID-shaped ID made from a hash, so the same picture of the same account is saved once. */
function idFrom(text: string): string {
  const h = sha256Hex(text);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((Number.parseInt(h[16]!, 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export const PICTURE_SIZES = {
  icon: [1024, 1024],
  banner: [1200, 600],
  course: [800, 450],
  product: [600, 600],
  home: [800, 600],
  avatar: [400, 400],
} as const satisfies Record<string, readonly [number, number]>;

export type PictureSize = keyof typeof PICTURE_SIZES;

/** Pictures drawn by this server instance (about 1.5 MB for all of them), so a second run draws nothing. */
const rendered = new Map<string, Buffer>();

export interface PictureDeps {
  store: DataStore;
  /** Saves an uploaded file (Netlify Blobs, or a folder locally). */
  putBlob: (key: string, data: Buffer, contentType: string) => Promise<void>;
  now: Date;
}

/**
 * The asset of a drawn picture, saved the first time. The demo's are the
 * account's (`appId` missing); 110.2 a sample entry's are its app's alone,
 * so removing an app's samples never takes another app's pictures.
 */
export async function savePicture(deps: PictureDeps, owner: { clientId: string; appId?: string }, name: PictureName, size: PictureSize, kind: AssetKind): Promise<string> {
  const { clientId, appId } = owner;
  const [width, height] = PICTURE_SIZES[size];
  const id = idFrom(JSON.stringify(appId ? { v: 1, clientId, appId, art: PICTURES[name], width, height } : { v: 1, clientId, art: PICTURES[name], width, height }));
  if (await deps.store.getAsset(id)) return id;
  const drawn = `${name}:${width}x${height}`;
  const png = rendered.get(drawn) ?? artPng(PICTURES[name], width, height);
  rendered.set(drawn, png);
  const blobKey = `assets/${clientId}/${id}.png`;
  await deps.putBlob(blobKey, png, "image/png");
  await deps.store.createAsset({ id, clientId, kind, blobKey, contentType: "image/png", size: png.length, createdAt: deps.now });
  return id;
}
