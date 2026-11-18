import { afterAll, describe } from "vitest";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { studioMarketStoreSuite } from "./studio-market-store-suite";

/** 106.1 Studio Market's data on MySQL or MariaDB (migrations 0130, 0135 and 0143). Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied). */
const url = process.env.YALLAPP_TEST_DATABASE_URL;

describe.skipIf(!url)("106.1 Studio Market on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  // 106.12 A second server on its own connection: two buyers' requests at once meet in the database.
  const otherPool = createPool({ url: url!, ssl: "disabled" });
  const other = new MysqlStore(otherPool);
  afterAll(async () => {
    await pool.end();
    await otherPool.end();
  });
  studioMarketStoreSuite(
    () => store,
    () => other,
  );
});
