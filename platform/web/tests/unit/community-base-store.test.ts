import { afterAll, describe } from "vitest";
import { memoryCommunityStore } from "@/lib/community/store/memory";
import { mysqlCommunityStore } from "@/lib/community/store/mysql";
import { createPool } from "@/lib/data/mysql";
import { communityBaseStoreSuite } from "./community-base-store-suite";

/** 231 Area A's data in memory, and on MySQL or MariaDB with YALLAPP_TEST_DATABASE_URL (a database with the migrations applied). */
describe("231 the community's base store in memory", () => {
  communityBaseStoreSuite(() => memoryCommunityStore());
});

const url = process.env.YALLAPP_TEST_DATABASE_URL;

describe.skipIf(!url)("231 the community's base store on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = mysqlCommunityStore(pool);
  afterAll(async () => {
    await pool.end();
  });
  communityBaseStoreSuite(() => store);
});
