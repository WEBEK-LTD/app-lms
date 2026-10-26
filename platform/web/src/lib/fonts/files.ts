import "server-only";
import { getBlobStore, type BlobStore } from "../blobs";
import { sha256Hex } from "../crypto/tokens";
import { googleFontsTestUrl } from "../env";
import { FONTS_COMMIT, fontFileAt, googleFontsSource } from "./catalog";

/**
 * 97.1 A free font's file, served from Yallapp: copied once from
 * github.com/google/fonts at the catalog's commit (so it never changes) and
 * kept in the file store. Only the catalog's files are ever fetched.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 20_000;

export interface FontFileBody {
  data: Buffer;
  contentType: "font/ttf" | "font/otf";
}

/** TrueType (or a TrueType collection's single font) and OpenType (CFF) files, by their first bytes. */
export function fontTypeOf(data: Buffer): FontFileBody["contentType"] | null {
  if (data.length < 12) return null;
  const tag = data.subarray(0, 4);
  if (tag.equals(Buffer.from([0, 1, 0, 0])) || tag.toString("latin1") === "true") return "font/ttf";
  if (tag.toString("latin1") === "OTTO") return "font/otf";
  return null;
}

function blobKey(dir: string, file: string): string {
  return `fonts/${FONTS_COMMIT.slice(0, 12)}/${dir}/${sha256Hex(file).slice(0, 32)}`;
}

/** The file `file` of the family in `dir`: null when the catalog has no such file, "unavailable" when it can't be had now. */
export async function freeFontFile(
  dir: string,
  file: string,
  deps: { blobs?: BlobStore; fetcher?: typeof fetch } = {},
): Promise<FontFileBody | "unavailable" | null> {
  if (!fontFileAt(dir, file)) return null;
  const blobs = deps.blobs ?? getBlobStore();
  const key = blobKey(dir, file);
  const kept = await blobs.get(key);
  if (kept) return { data: kept.data, contentType: kept.contentType === "font/otf" ? "font/otf" : "font/ttf" };
  const test = googleFontsTestUrl();
  const url = test ? googleFontsSource(dir, file, test) : googleFontsSource(dir, file);
  const response = await (deps.fetcher ?? fetch)(url, { redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(() => null);
  if (!response?.ok) return "unavailable";
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) return "unavailable";
  const data = Buffer.from(await response.arrayBuffer());
  const contentType = data.length <= MAX_BYTES ? fontTypeOf(data) : null;
  if (!contentType) return "unavailable";
  await blobs.put(key, data, contentType);
  return { data, contentType };
}
