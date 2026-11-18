/**
 * 115.24 Keyset paging of a vendor's products: the cursor is the last row's
 * sort value and id, so a page costs the same at the 50,000th product as at
 * the first, and nothing is counted.
 *
 * - Without a search: in stock first, then the vendor's order (`s`: in stock, `p`: position, `i`: id).
 * - With a search, first the names that start with it, by name (`n`: search name, `i`: id),
 *   then the names with a word that starts with it, by id (`w`).
 */

export type ProductCursor =
  | { k: "s"; s: 0 | 1; p: number; i: number }
  | { k: "n"; n: string; i: number }
  | { k: "w"; i: number };

export function encodeProductCursor(c: ProductCursor): string {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
}

/** The cursor, or null for the first page (empty) or one that can't be read (the first page again). */
export function decodeProductCursor(raw: string | undefined): ProductCursor | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Record<string, unknown>;
    const int = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 0;
    if (c.k === "s" && (c.s === 0 || c.s === 1) && typeof c.p === "number" && Number.isInteger(c.p) && int(c.i)) return { k: "s", s: c.s, p: c.p, i: c.i as number };
    if (c.k === "n" && typeof c.n === "string" && c.n.length <= 255 && int(c.i)) return { k: "n", n: c.n, i: c.i as number };
    if (c.k === "w" && int(c.i)) return { k: "w", i: c.i as number };
  } catch {
    return null;
  }
  return null;
}

/** A cursor as the hosted API takes it: up to 400 characters of base64url. */
export function readCursorParam(raw: string | null): string | undefined {
  if (raw === null) return undefined;
  return /^[A-Za-z0-9_-]{0,400}$/.test(raw) ? raw : "";
}
