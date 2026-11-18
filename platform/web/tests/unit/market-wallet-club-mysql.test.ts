import { afterAll, describe } from "vitest";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { marketWalletClubSuite } from "./market-wallet-club-suite";

/** 115.60–115.62 The wallet and the club on MySQL or MariaDB (migration 0145), the races from several connections. Runs only with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied). */
const url = process.env.YALLAPP_TEST_DATABASE_URL;

describe.skipIf(!url)("115.60–115.62 the wallet and the club on MySQL", () => {
  const pools = Array.from({ length: 4 }, () => createPool({ url: url!, ssl: "disabled" }));
  const stores = pools.map((pool) => new MysqlStore(pool));
  afterAll(async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });
  marketWalletClubSuite(
    () => stores[0]!,
    () => stores,
  );
});
