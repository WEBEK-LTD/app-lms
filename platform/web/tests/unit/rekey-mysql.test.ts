import { afterAll, describe } from "vitest";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { rekeyStoreSuite } from "./rekey-store-suite";

/** 79.2 The rekey job's store methods on MySQL or MariaDB. Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied). */
const url = process.env.YALLAPP_TEST_DATABASE_URL;

describe.skipIf(!url)("79.2 rekey on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });
  rekeyStoreSuite(() => store);
});
