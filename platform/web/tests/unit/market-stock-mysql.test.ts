import { afterAll, describe, expect, it } from "vitest";
import { backfillSearchNames } from "@/lib/market/search-backfill";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { marketStockStoreSuite } from "./market-stock-store-suite";

/**
 * 115.24 Stock, its ledger, search and keyset paging on MySQL or MariaDB (the 115.24 migration), with a
 * 50,000-product catalog. Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;

describe.skipIf(!url)("115.24 stock, search and paging on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });
  marketStockStoreSuite(() => store, { big: 50_000 });

  it("115.29 gives older products their search name in batches, picking up where it stopped", async () => {
    // As the products saved before 115.24 were: no search name.
    await pool.query("UPDATE market_products SET search_name = '' WHERE id IN (SELECT id FROM (SELECT id FROM market_products ORDER BY id DESC LIMIT 1200) AS latest)");
    expect(await store.backfillMarketSearchNames(500)).toBe(500);
    expect(await backfillSearchNames(store, { budgetMs: 60_000 })).toBe(700);
    expect(await backfillSearchNames(store, { budgetMs: 60_000 })).toBe(0);
    const [rows] = await pool.query("SELECT COUNT(*) AS n FROM market_products WHERE search_name = ''");
    expect(Number((rows as { n: number }[])[0]!.n)).toBe(0);
  }, 120_000);
});
