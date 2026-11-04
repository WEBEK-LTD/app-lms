import { afterAll, describe } from "vitest";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { marketOrdersStoreSuite } from "./market-orders-store-suite";

/** 115.3 The marketplace's orders, complaints and wallet on MySQL or MariaDB (migration 0114). Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied). */
const url = process.env.YALLAPP_TEST_DATABASE_URL;

describe.skipIf(!url)("115.3 the marketplace's orders, complaints and wallet on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });
  marketOrdersStoreSuite(() => store);
});
