import { afterAll, describe } from "vitest";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { pendingPaymentsStoreSuite } from "./pending-payments-store-suite";

/** 80.3 Payments still pending on MySQL or MariaDB (migration 0059). Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied). */
const url = process.env.YALLAPP_TEST_DATABASE_URL;

describe.skipIf(!url)("80.3 pending payments on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });
  pendingPaymentsStoreSuite(() => store);
});
