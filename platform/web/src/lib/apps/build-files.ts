import { createHmac } from "node:crypto";

/**
 * 73 Removing a build's folder (`builds/<build id>/`) from the files host
 * (files.yallapp.com.tr, build/files-host/index.php) when its app is purged.
 * The request is `DELETE /builds/<build id>/?expires=…&sig=…`, signed like
 * the download links but over "DELETE <path>?expires=<expires>", so a
 * download link can never delete anything. The host answers 204, also when
 * the folder is already gone.
 */

export type BuildFolderRemover = (buildId: string) => Promise<void>;

const BUILD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The exact string signed for a deletion. */
export function folderDeletePayload(pathname: string, expires: number): string {
  return `DELETE ${pathname}?expires=${expires}`;
}

/** The signed address that deletes a build's folder, valid for 5 minutes. */
export function folderDeleteUrl(options: { baseUrl: string; secret: string; buildId: string; now: Date }): string {
  if (!BUILD_ID.test(options.buildId)) throw new Error("Not a build ID.");
  const pathname = `/builds/${options.buildId.toLowerCase()}/`;
  const expires = Math.floor(options.now.getTime() / 1000) + 300;
  const sig = createHmac("sha256", options.secret).update(folderDeletePayload(pathname, expires)).digest("hex");
  return `${new URL(options.baseUrl).origin}${pathname}?expires=${expires}&sig=${sig}`;
}

/** Deletes build folders on the files host; each call throws when the host didn't confirm it. */
export function buildFolderRemover(options: { baseUrl: string; secret: string; fetcher?: typeof fetch; now?: () => Date }): BuildFolderRemover {
  return async (buildId) => {
    const url = folderDeleteUrl({ baseUrl: options.baseUrl, secret: options.secret, buildId, now: options.now?.() ?? new Date() });
    let response: Response;
    try {
      response = await (options.fetcher ?? fetch)(url, { method: "DELETE", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000) });
    } catch (e) {
      throw new Error(`The files host couldn't be reached (${e instanceof Error ? e.message : "network error"}).`);
    }
    await response.body?.cancel().catch(() => undefined);
    if (response.status !== 204 && response.status !== 200) throw new Error(`The files host answered ${response.status}.`);
  };
}
