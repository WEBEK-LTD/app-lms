/** 115.24 The first `k` rows in `cmp`'s order, without sorting them all (a page of a 50,000-product catalog). */
export function topK<T>(rows: readonly T[], cmp: (a: T, b: T) => number, k: number): T[] {
  if (k <= 0) return [];
  // A big page: one sort is quicker than keeping a long list in order.
  if (k > 64) return [...rows].sort(cmp).slice(0, k);
  const out: T[] = [];
  for (const row of rows) {
    if (out.length === k && cmp(row, out[k - 1]!) >= 0) continue;
    let i = out.length < k ? out.length : k - 1;
    if (out.length < k) out.push(row);
    while (i > 0 && cmp(row, out[i - 1]!) < 0) {
      out[i] = out[i - 1]!;
      i -= 1;
    }
    out[i] = row;
  }
  return out;
}

/** 115.24 The market's search: at most `perVendor` of each vendor's products, `limit` in all, in the given order. */
export function perVendorTake<T extends { vendorId: number }>(rows: readonly T[], perVendor: number, limit: number): T[] {
  const taken = new Map<number, number>();
  const out: T[] = [];
  for (const row of rows) {
    if (out.length >= limit) break;
    const n = taken.get(row.vendorId) ?? 0;
    if (n >= perVendor) continue;
    taken.set(row.vendorId, n + 1);
    out.push(row);
  }
  return out;
}
