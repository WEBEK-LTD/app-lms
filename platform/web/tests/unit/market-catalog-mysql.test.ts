import { afterAll, describe } from "vitest";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { marketCatalogStoreSuite } from "./market-catalog-store-suite";

/** 115.3 The marketplace's catalogs on MySQL or MariaDB (migration 0113). Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied). */
const url = process.env.YALLAPP_TEST_DATABASE_URL;

describe.skipIf(!url)("115.3 the marketplace's catalogs on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });
  marketCatalogStoreSuite(() => store);
});
