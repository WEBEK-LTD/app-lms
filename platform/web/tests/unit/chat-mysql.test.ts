import { afterAll, describe } from "vitest";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { chatStoreSuite } from "./chat-store-suite";

/** 77 The chat's store on MySQL or MariaDB (migration 0052). Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied). */
const url = process.env.YALLAPP_TEST_DATABASE_URL;

describe.skipIf(!url)("77 chat on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });
  chatStoreSuite(() => store);
});
