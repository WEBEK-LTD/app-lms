import { afterAll, describe } from "vitest";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { appTransferStoreSuite } from "./app-transfer-store-suite";

/** 132.112–132.114 Copying and moving an app on MySQL or MariaDB (migration 0130). Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied). */
const url = process.env.YALLAPP_TEST_DATABASE_URL;

describe.skipIf(!url)("132 copying and moving an app on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });
  appTransferStoreSuite(() => store);
});
