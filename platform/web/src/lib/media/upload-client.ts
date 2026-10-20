/**
 * 64b How an uploader talks to the media gate behind a server firewall
 * (dashboard/media/uploader.tsx; Yallapp Business does the same in Dart).
 * Chunks go as POST with `Content-Type: application/octet-stream` (firewalls
 * often refuse PUT and unusual content types), the offset in the
 * `Upload-Offset` header and in the query (a proxy may drop the header). The
 * gate's answer carries the offset in the header, or in a JSON body, or both.
 * No server code here: the browser runs it.
 */

/** The upload link with the chunk's offset added (not signed, the gate reads it when the header is missing). */
export function chunkUrl(url: string, offset: number): string {
  const u = new URL(url);
  u.searchParams.set("offset", String(offset));
  return u.toString();
}

/** The gate's offset: from the `Upload-Offset` header, else from a JSON body `{"offset":N}`. */
export function offsetOf(header: string | null, body: string | null): number | null {
  if (header && /^\d+$/.test(header.trim())) return Number(header.trim());
  if (!body) return null;
  try {
    const json = JSON.parse(body) as { offset?: unknown };
    return typeof json.offset === "number" && Number.isSafeInteger(json.offset) && json.offset >= 0 ? json.offset : null;
  } catch {
    return null;
  }
}

/** Why an upload stopped, for the message the owner sees. */
export type UploadFailure = "refused" | "storage" | "tooBig" | "status";

/** What to do after the gate answered a chunk. */
export type ChunkOutcome =
  /** The chunk arrived (or the gate is elsewhere, 409): carry on from `offset`. */
  | { kind: "moved"; offset: number }
  /** The link expired or was refused: ask the platform for a fresh one. */
  | { kind: "fresh" }
  /** Worth another try after a pause (a server error, a broken chunk). */
  | { kind: "retry"; status: number }
  /** No use trying again. */
  | { kind: "fail"; failure: UploadFailure; status: number };

/** How many fresh links in a row before a 403/410 counts as refused (a firewall, or a gate with another secret). */
export const FRESH_LINKS_IN_A_ROW = 2;

export function chunkOutcome(status: number, offset: number | null): ChunkOutcome {
  // 204 from older gates (and PUT), 200 with JSON from 64b gates; 409 says where the upload is.
  if ((status === 200 || status === 204 || status === 409) && offset !== null) return { kind: "moved", offset };
  if (status === 403 || status === 410) return { kind: "fresh" };
  // A success with no offset isn't the gate's answer: something in between (a firewall's page) answered.
  if (status >= 200 && status < 300) return { kind: "fail", failure: "refused", status };
  if (status === 405 || status === 406 || status === 501) return { kind: "fail", failure: "refused", status };
  if (status === 413) return { kind: "fail", failure: "tooBig", status };
  return { kind: "retry", status };
}

/** The failure once the retries are used up: 503 is the gate's storage, anything else its status. */
export function failureOf(status: number): UploadFailure {
  if (status === 403 || status === 410 || status === 405 || status === 406 || status === 501) return "refused";
  if (status === 503) return "storage";
  if (status === 413) return "tooBig";
  return "status";
}
