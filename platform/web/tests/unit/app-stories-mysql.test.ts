import { afterAll, describe } from "vitest";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { appStoriesStoreSuite } from "./app-stories-store-suite";

/** 165 Dashboard › Stories on MySQL or MariaDB (migration 0143). Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied). */
const url = process.env.YALLAPP_TEST_DATABASE_URL;

describe.skipIf(!url)("165 the app's stories on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });
  appStoriesStoreSuite(() => store);
});
