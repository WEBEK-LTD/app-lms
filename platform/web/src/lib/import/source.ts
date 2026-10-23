import { pinnedFetch } from "../net/safe-fetch";
import type { ScanDeps } from "../scan/site-scan";
import { IMPORT_MAX_BYTES, ImportFormatError, parseImport, type Table } from "./table";

/**
 * 81.4 Where an import comes from: a file the owner chose, or a link (a
 * product feed, a CSV, a Google Sheet shared with anyone who has the link),
 * read through the safe fetch, as the site scan reads sites.
 */

/** A Google Sheet's link, as people copy it, made the link of its CSV. */
export function sheetCsvUrl(url: string): string {
  const m = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([\w-]+)\/(?:edit|view|htmlview)?[^#]*(?:#gid=(\d+))?/.exec(url);
  if (!m || /\/export\?|\/pub\?/.test(url)) return url;
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${m[2] ? `&gid=${m[2]}` : ""}`;
}

export class ImportSourceError extends Error {
  constructor(
    readonly code: "invalid_url" | "unreachable",
    message: string,
  ) {
    super(message);
    this.name = "ImportSourceError";
  }
}

export async function readImportUrl(input: string, deps: ScanDeps = {}): Promise<Table> {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new ImportSourceError("invalid_url", "Enter the feed's full address, starting with https://.");
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new ImportSourceError("invalid_url", "Enter the feed's full address, starting with https://.");
  const fetcher = pinnedFetch(deps.fetcher, deps.resolve);
  let response: Response;
  try {
    response = await fetcher(sheetCsvUrl(url.toString()), { headers: { accept: "application/rss+xml,application/atom+xml,application/xml,text/xml,text/csv,text/plain;q=0.8" }, redirect: "follow", signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new ImportSourceError("unreachable", "The link couldn't be read. Check it, and that anyone with the link can open it.");
  }
  if (!response.ok) throw new ImportSourceError("unreachable", `The link answered with an error (HTTP ${response.status}). Check that anyone with the link can open it.`);
  if (Number(response.headers.get("content-length") ?? 0) > IMPORT_MAX_BYTES) throw new ImportFormatError("too_large", `The feed is too large. The limit is ${IMPORT_MAX_BYTES / 1024 / 1024} MB.`);
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const part = reader ? await reader.read() : { done: true as const, value: undefined };
    if (part.done || !part.value) break;
    size += part.value.byteLength;
    if (size > IMPORT_MAX_BYTES) {
      await reader?.cancel().catch(() => undefined);
      throw new ImportFormatError("too_large", `The feed is too large. The limit is ${IMPORT_MAX_BYTES / 1024 / 1024} MB.`);
    }
    chunks.push(part.value);
  }
  const text = new TextDecoder("utf-8").decode(Buffer.concat(chunks));
  if (/text\/html/i.test(response.headers.get("content-type") ?? "")) throw new ImportFormatError("not_a_feed", "This link is a web page, not a feed or a CSV. For a Google Sheet, share it with anyone who has the link.");
  return parseImport(text, response.headers.get("content-type") ?? "");
}
