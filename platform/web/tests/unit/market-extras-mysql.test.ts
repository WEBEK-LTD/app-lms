import { afterAll, describe } from "vitest";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { marketExtrasStoreSuite } from "./market-extras-store-suite";

/** 115.3 Coupons, the club, joining forms and the vendors' web sign-in on MySQL or MariaDB (migration 0115). Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied). */
const url = process.env.YALLAPP_TEST_DATABASE_URL;

describe.skipIf(!url)("115.3 coupons, the club, joining forms and the vendors' web sign-in on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });
  marketExtrasStoreSuite(() => store);
});
