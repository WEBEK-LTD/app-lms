// 79.1 Copies the files kept in Netlify Blobs (store `yallapp-files`: app
// icons, logos, plugin zips) to a folder. They are the only files outside our
// host, so cPanel's backups don't have them; run it by hand from time to time:
//
//   NETLIFY_SITE_ID=... NETLIFY_AUTH_TOKEN=... node scripts/export-blobs.mjs /path/to/folder
//
// (or NETLIFY_AUTH_TOKEN_FILE, a file holding the token, so it isn't on a
// command line). Only what changed since the last export is downloaded (the
// blobs' etags are kept in .etags.json there); a blob deleted since is removed
// from the folder. Each blob is <key> with its content type in
// <key>.meta.json, the layout of the local `fs` store.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STORE_NAME = "yallapp-files";
const INDEX = ".etags.json";

/** A key safe as a path below the folder (the same rule as the platform's `fs` store). */
export function safeKey(key) {
  return /^[a-z0-9][a-z0-9/_.-]*$/i.test(key) && !key.includes("..") && !key.endsWith(".meta.json") && key !== INDEX;
}

/**
 * `store` is a Netlify Blobs store (list, getWithMetadata). Returns what it did.
 */
export async function exportBlobs(store, dir) {
  await mkdir(dir, { recursive: true });
  let before = {};
  try {
    before = JSON.parse(await readFile(path.join(dir, INDEX), "utf8"));
  } catch {
    before = {};
  }
  const after = {};
  const result = { blobs: 0, downloaded: 0, removed: 0, skipped: [] };
  for await (const page of store.list({ paginate: true })) {
    for (const blob of page.blobs) {
      if (!safeKey(blob.key)) {
        result.skipped.push(blob.key);
        continue;
      }
      result.blobs++;
      after[blob.key] = blob.etag;
      if (before[blob.key] === blob.etag) continue;
      const got = await store.getWithMetadata(blob.key, { type: "arrayBuffer" });
      if (!got) {
        delete after[blob.key];
        result.blobs--;
        continue;
      }
      const file = path.join(dir, blob.key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, Buffer.from(got.data));
      const contentType = typeof got.metadata?.contentType === "string" ? got.metadata.contentType : "application/octet-stream";
      await writeFile(`${file}.meta.json`, JSON.stringify({ contentType }));
      result.downloaded++;
    }
  }
  for (const key of Object.keys(before)) {
    if (key in after || !safeKey(key)) continue;
    const file = path.join(dir, key);
    await rm(file, { force: true });
    await rm(`${file}.meta.json`, { force: true });
    result.removed++;
  }
  await writeFile(path.join(dir, INDEX), JSON.stringify(after));
  return result;
}

async function main() {
  const dir = process.argv[2];
  const siteID = process.env.NETLIFY_SITE_ID;
  const tokenFile = process.env.NETLIFY_AUTH_TOKEN_FILE;
  const token = process.env.NETLIFY_AUTH_TOKEN || (tokenFile ? (await readFile(tokenFile, "utf8")).trim() : "");
  if (!dir || !siteID || !token) {
    console.error("Usage: NETLIFY_SITE_ID=... NETLIFY_AUTH_TOKEN=... (or NETLIFY_AUTH_TOKEN_FILE=...) node scripts/export-blobs.mjs <folder>");
    process.exit(2);
  }
  const { getStore } = await import("@netlify/blobs");
  const result = await exportBlobs(getStore({ name: STORE_NAME, siteID, token, consistency: "strong" }), path.resolve(dir));
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
