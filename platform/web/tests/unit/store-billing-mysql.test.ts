import { afterAll, describe } from "vitest";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { storeBillingStoreSuite } from "./store-billing-store-suite";

/** 100.2/100.3 Store billing on MySQL or MariaDB (migrations 0089, 0090). Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied). */
const url = process.env.YALLAPP_TEST_DATABASE_URL;

describe.skipIf(!url)("100.2/100.3 store billing on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });
  storeBillingStoreSuite(() => store);
});
