import { drizzle } from "drizzle-orm/mysql2";
import type mysql from "mysql2/promise";
import type { CommunityStore } from ".";
import * as communitySchema from "../../db/community-schema";
import { MysqlCommunityBaseStore } from "./base-mysql";
import type { CommunityDb } from "./db";
import { MysqlCommunityQaStore } from "./qa-mysql";
import { MysqlCommunityTrustStore } from "./trust-mysql";

/** 231 The whole community on MySQL or MariaDB (migration 0155), on a pool from lib/data/mysql's createPool. */
export function mysqlCommunityStore(pool: mysql.Pool): CommunityStore {
  const db: CommunityDb = drizzle({ client: pool, schema: communitySchema, mode: "default" });
  return { base: new MysqlCommunityBaseStore(db), qa: new MysqlCommunityQaStore(db), trust: new MysqlCommunityTrustStore(db) };
}
