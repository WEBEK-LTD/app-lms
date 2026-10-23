import { afterAll, describe } from "vitest";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { autoNoticesStoreSuite } from "./auto-notifications-store-suite";

/** 85.3 Automatic notifications on MySQL or MariaDB (migration 0066). Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied). */
const url = process.env.YALLAPP_TEST_DATABASE_URL;

describe.skipIf(!url)("85.3 automatic notifications on MySQL", () => {
  const pools = [createPool({ url: url!, ssl: "disabled" }), createPool({ url: url!, ssl: "disabled" })];
  afterAll(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });
  // Two connections, so taking a notice twice at once is tried for real.
  const [one, two] = pools.map((pool) => new MysqlStore(pool));
  let n = 0;
  autoNoticesStoreSuite(() => (n++ % 2 === 0 ? one! : two!));
});
