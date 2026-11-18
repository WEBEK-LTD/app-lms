import type { DataStore } from "../data/store";

/**
 * 115.29 Products saved before the search name was kept (115.24) get it from
 * the daily job, 500 at a time, until none is left, so a big live catalog is
 * found by search without waiting for its place's first searches. It picks up
 * where it stopped (the rows still without one) and is safe to run twice.
 */
export const BACKFILL_BATCH = 500;

export async function backfillSearchNames(store: DataStore, input: { budgetMs: number; now?: () => number } = { budgetMs: 20_000 }): Promise<number> {
  const clock = input.now ?? Date.now;
  const until = clock() + input.budgetMs;
  let done = 0;
  while (clock() < until) {
    const n = await store.backfillMarketSearchNames(BACKFILL_BATCH);
    done += n;
    if (n < BACKFILL_BATCH) break;
  }
  return done;
}
