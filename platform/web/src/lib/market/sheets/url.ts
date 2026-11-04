import { sheetCsvUrl } from "../../import/source";
import { pinnedFetch } from "../../net/safe-fetch";
import type { ScanDeps } from "../../scan/site-scan";
import { readSheet } from "./read";
import { SHEET_MAX_BYTES, SheetError, type SheetTable } from "./table";

/**
 * 115.8 A catalog read from a link: a CSV, JSON or Excel file on the web,
 * or a Google Sheet shared with anyone who has the link (read as its CSV),
 * through the safe fetch (no private addresses).
 */
export async function readSheetUrl(input: string, deps: ScanDeps = {}): Promise<SheetTable> {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new SheetError("unreadable", "Enter the file's full address, starting with https://.");
  }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new SheetError("unreadable", "Enter the file's full address, starting with https://.");
  const fetcher = pinnedFetch(deps.fetcher, deps.resolve);
  let response: Response;
  try {
    response = await fetcher(sheetCsvUrl(url.toString()), { redirect: "follow", signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new SheetError("unreadable", "The link couldn't be read. Check it, and that anyone with the link can open it.");
  }
  if (!response.ok) throw new SheetError("unreadable", `The link answered with an error (HTTP ${response.status}). Check that anyone with the link can open it.`);
  if (Number(response.headers.get("content-length") ?? 0) > SHEET_MAX_BYTES) throw new SheetError("too_large", `The file is too large. The limit is ${SHEET_MAX_BYTES / 1024 / 1024} MB.`);
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const part = reader ? await reader.read() : { done: true as const, value: undefined };
    if (part.done || !part.value) break;
    size += part.value.byteLength;
    if (size > SHEET_MAX_BYTES) {
      await reader?.cancel().catch(() => undefined);
      throw new SheetError("too_large", `The file is too large. The limit is ${SHEET_MAX_BYTES / 1024 / 1024} MB.`);
    }
    chunks.push(part.value);
  }
  return readSheet(new Uint8Array(Buffer.concat(chunks)), url.pathname, response.headers.get("content-type") ?? "");
}
