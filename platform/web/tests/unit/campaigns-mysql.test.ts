import { afterAll, describe } from "vitest";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { campaignsStoreSuite } from "./campaigns-store-suite";

/** 85.2 Notification campaigns on MySQL or MariaDB (migration 0065). Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied). */
const url = process.env.YALLAPP_TEST_DATABASE_URL;

describe.skipIf(!url)("85.2 campaigns on MySQL", () => {
  const pools = [createPool({ url: url!, ssl: "disabled" }), createPool({ url: url!, ssl: "disabled" })];
  const stores = pools.map((pool) => new MysqlStore(pool));
  let next = 0;
  afterAll(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });
  campaignsStoreSuite(() => stores[next++ % stores.length]!);
});
