import { newId } from "../crypto/tokens";
import { handleMediaRequest, type MediaDisk } from "./disk";
import { storageKeyOf } from "./signing";
import type { MediaStorage } from "./storage";
import { chunkUrl, offsetOf } from "./upload-client";

/**
 * 64b Admin › Settings › Server › "Check the media server": the gate's own
 * answer under MEDIA_BASE_URL, a signed stat, then a real upload the way the dashboard sends one (a few bytes by POST to
 * a signed upload link), checked and removed again. A failure names the step,
 * the HTTP status and what to do: server firewalls (ModSecurity, Imunify360)
 * that refuse uploads, a storage folder that isn't writable, another secret.
 * The admin is in English only.
 */

/** Sends one request to the gate: fetch on the server ("host"), or the platform's own gate in process ("fs"). */
export type GateRequest = (url: string, init: RequestInit) => Promise<Response>;

export function gateRequest(options: { base: string; secret: string; disk: MediaDisk | null; fetcher?: typeof fetch }): GateRequest {
  const { base, secret, disk } = options;
  if (disk) {
    const prefix = new URL(base).pathname.replace(/\/+$/, "");
    return (url, init) => {
      // A Request made here has no Content-Length of its own, as one off the wire has.
      const headers = new Headers(init.headers);
      if (init.body instanceof Uint8Array && !headers.has("content-length")) headers.set("content-length", String(init.body.byteLength));
      return handleMediaRequest(disk, new Request(url, { ...init, headers }), new URL(url).pathname.slice(prefix.length), secret);
    };
  }
  const fetcher = options.fetcher ?? fetch;
  return (url, init) => fetcher(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(15_000) });
}

export interface GateCheckResult {
  ok: boolean;
  message: string;
  /** The step that failed (1 to 7), when one did. */
  step?: number;
  status?: number;
}

/** The test upload's bytes. */
const TEST_BYTES = new TextEncoder().encode("Yallapp media check");

const FIREWALL =
  "A server firewall in front of the gate probably refused it. In cPanel › Security › ModSecurity, turn ModSecurity off for yallapp.com.tr, or ask the host to allow GET, HEAD, POST, PUT and DELETE to /media (OWASP CRS rules 911100 and 920420 are the usual ones); with Imunify360, whitelist the rule ID its incident log shows for /media. See docs/LAUNCH-CHECKLIST.md 7j, \"If uploads fail\".";

const OLDER_GATE =
  "The gate on the server is an older version (it doesn't know links without a file extension at the end, nor uploads by POST): copy the new platform/web/deploy/media-host/index.php over it (docs/LAUNCH-CHECKLIST.md 7j).";

/** What to do about `status` (and the gate's own words in `body`) at a step. */
function advice(status: number, body: string, upload: boolean): string {
  const text = body.trim();
  if (status === 403 && text === "This link is not valid.")
    return "The gate refused our signature: signing_secret in its config.php must be the same as MEDIA_SIGNING_SECRET in Netlify.";
  if (status === 410) return "The gate says a fresh link has expired: the server's clock is wrong. Ask the host to sync it (NTP).";
  if (status === 404 && text === "Not found.") return OLDER_GATE;
  if (status === 404)
    return "The server answers these paths itself instead of passing them to the media gate: a static-file handler in front of PHP (LiteSpeed or nginx on cPanel hosts) takes them. Copy the new index.php, whose links have no file extension at the end, and check that /media goes to the gate's .htaccess (docs/LAUNCH-CHECKLIST.md 7j).";
  if (status === 405 && text === "Method not allowed." && upload) return OLDER_GATE;
  if (status === 503)
    return "The gate can't use its storage: storage_dir in its config.php must exist, outside public_html, and be writable by the cPanel account PHP runs as.";
  if (status === 413) return "A request size limit refused even a few bytes: check the web server's request body limit (LiteSpeed › Max Request Body Size, Apache LimitRequestBody).";
  if (status === 400 && upload)
    return "The test bytes didn't arrive whole: something in front of PHP drops request bodies (the firewall, or post_max_size in PHP is 0 or tiny).";
  if (status === 403 || status === 405 || status === 406 || status === 501) return FIREWALL;
  if (status >= 200 && status < 300) return `Something other than the gate answered (a firewall's page?). ${FIREWALL}`;
  return "Check the server's error log for /media.";
}

/**
 * Runs the check. `ids` names the test file (tests pass their own); the test
 * file goes in a folder of its own, removed at the end.
 */
export async function checkMediaGate(storage: MediaStorage, request: GateRequest, ids: { appId: string; mediaId: string } = { appId: newId(), mediaId: newId() }): Promise<GateCheckResult> {
  const key = storageKeyOf(ids.appId, ids.mediaId, "pdf");
  const total = TEST_BYTES.length;
  const steps = 7;
  const leftOver = ` A test file of ${total} bytes may be left in the folder ${ids.appId} of storage_dir; the daily cleanup removes it after a week, or delete it by hand.`;
  const failed = (step: number, what: string, status: number, body: string, upload = false, after = ""): GateCheckResult => ({
    ok: false,
    step,
    status,
    message: `Step ${step} of ${steps} (${what}) failed: HTTP ${status}. ${advice(status, body, upload)}${after}`,
  });
  const call = async (step: number, what: string, url: string, init: RequestInit): Promise<{ response: Response; body: string } | GateCheckResult> => {
    try {
      const response = await request(url, init);
      return { response, body: await response.text().catch(() => "") };
    } catch (e) {
      return {
        ok: false,
        step,
        message: `Step ${step} of ${steps} (${what}) failed: the media server couldn't be reached (${e instanceof Error ? e.message : "network error"}). Check MEDIA_BASE_URL and that the server answers it.${step > 4 ? leftOver : ""}`,
      };
    }
  };
  const isResult = (r: { response: Response; body: string } | GateCheckResult): r is GateCheckResult => "ok" in r;

  // 1. The gate answers under MEDIA_BASE_URL: its own plain "Not found." for a path it doesn't know.
  let what = "reaching the media gate";
  const probe = storage.link("l", "apps", 60).url.replace(/\/l\/apps\?.*$/, "/v/x");
  let r = await call(1, what, probe, { method: "GET" });
  if (isResult(r)) return r;
  if (r.response.status !== 404 || r.body.trim() !== "Not found.")
    return {
      ok: false,
      step: 1,
      status: r.response.status,
      message: `Step 1 of ${steps} (${what}) failed: HTTP ${r.response.status}, not the gate's own "Not found.". MEDIA_BASE_URL doesn't lead to the gate: check it ends in /media, that the reverse proxy keeps /media on the host (ProxyPass /media/ !), and that the gate's index.php and .htaccess are in the media folder (docs/LAUNCH-CHECKLIST.md 7j).`,
    };
  // 64b The gate is this version (an old index.php left on the server doesn't know the new links).
  r = await call(1, what, probe.replace(/\/v\/x$/, "/ping"), { method: "GET" });
  if (isResult(r)) return r;
  if (r.response.status !== 200 || !r.body.startsWith("Yallapp media gate 3"))
    return {
      ok: false,
      step: 1,
      status: r.response.status,
      message: `Step 1 of ${steps} (${what}) failed: the media folder still has an older index.php (its /ping answered HTTP ${r.response.status}). Copy the current platform/web/deploy/media-host/index.php over it (docs/LAUNCH-CHECKLIST.md 7j); if you did, clear the server's cache (LiteSpeed, OPcache).`,
    };

  // 2. A signed GET about a file that doesn't exist: the address and the secret.
  what = "asking about a file with a signed link";
  r = await call(2, what, storage.link("s", key, 300).url, { method: "GET" });
  if (isResult(r)) return r;
  if (r.response.status !== 200) return failed(2, what, r.response.status, r.body);
  try {
    if ((JSON.parse(r.body) as { exists?: unknown }).exists !== false) return { ok: false, step: 2, status: 200, message: "The media server answered, but oddly: it reports a file that can't exist." };
  } catch {
    return { ok: false, step: 2, status: 200, message: `Step 2 of ${steps} (${what}) failed: the answer wasn't the gate's JSON. ${advice(200, r.body, false)}` };
  }

  // 3. The upload's status, as the uploader asks it (the same signed upload link).
  const upload = storage.link("u", key, 600, { size: String(total) }).url;
  what = "asking how much of a test upload arrived";
  r = await call(3, what, upload, { method: "GET" });
  if (isResult(r)) return r;
  if (r.response.status !== 200) return failed(3, what, r.response.status, r.body, true);
  if (offsetOf(r.response.headers.get("upload-offset"), r.body) !== 0) return failed(3, `${what}: no offset 0 in the answer`, r.response.status, r.body, true);

  // 4. A few bytes by POST, exactly as the dashboard and Yallapp Business send a chunk.
  what = "sending a test upload by POST, as the dashboard does";
  r = await call(4, what, chunkUrl(upload, 0), {
    method: "POST",
    headers: { "upload-offset": "0", "content-type": "application/octet-stream" },
    body: TEST_BYTES,
  });
  if (isResult(r)) return r;
  const offset = offsetOf(r.response.headers.get("upload-offset"), r.body);
  if (r.response.status !== 200 || offset === null) return failed(4, what, r.response.status, r.body, true);
  if (offset !== total) return { ok: false, step: 4, status: 200, message: `Step 4 of ${steps} (${what}) failed: the gate says ${offset} of ${total} bytes arrived.${leftOver}` };

  // 5. The file is whole on the server.
  what = "checking the test file arrived whole";
  r = await call(5, what, storage.link("s", key, 300).url, { method: "GET" });
  if (isResult(r)) return r;
  if (r.response.status !== 200) return failed(5, what, r.response.status, r.body, false, leftOver);
  let stat: { complete?: unknown; size?: unknown } = {};
  try {
    stat = JSON.parse(r.body) as typeof stat;
  } catch {
    // Reported below.
  }
  if (stat.complete !== true || stat.size !== total)
    return { ok: false, step: 5, status: 200, message: `Step 5 of ${steps} (${what}) failed: the gate keeps ${String(stat.size)} bytes, not ${total}, complete: ${String(stat.complete)}.${leftOver}` };

  // 6 and 7. Removed again: the file, then its folder.
  what = "removing the test file";
  r = await call(6, what, storage.link("d", key, 300).url, { method: "DELETE" });
  if (isResult(r)) return r;
  if (r.response.status !== 204 && r.response.status !== 200) return failed(6, what, r.response.status, r.body, false, leftOver);
  what = "removing the test folder";
  r = await call(7, what, storage.link("a", ids.appId, 300).url, { method: "DELETE" });
  if (isResult(r)) return r;
  if (r.response.status !== 204 && r.response.status !== 200)
    return failed(7, what, r.response.status, r.body, false, ` An empty folder ${ids.appId} is left in storage_dir; the daily cleanup removes it after a week.`);

  return {
    ok: true,
    message:
      storage.mode === "host"
        ? "The media server answers, accepts our signed links, and took a test upload by POST as the dashboard sends it (checked and removed again)."
        : "Media files are kept in the local folder (development only). A test upload by POST went through and was removed again.",
  };
}
