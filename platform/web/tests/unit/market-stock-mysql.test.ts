import { afterAll, describe } from "vitest";
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
});
