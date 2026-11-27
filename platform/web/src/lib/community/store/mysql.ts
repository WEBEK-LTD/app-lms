import { drizzle } from "drizzle-orm/mysql2";
import type mysql from "mysql2/promise";
import type { CommunityStore } from ".";
import * as communitySchema from "../../db/community-schema";
import * as engageSchema from "../../db/community-engage-schema";
import { MysqlEngageStore } from "../engage/store-mysql";
import { MysqlCommunityBaseStore } from "./base-mysql";
import type { CommunityDb } from "./db";
import { MysqlCommunityQaStore } from "./qa-mysql";
import { MysqlCommunityTrustStore } from "./trust-mysql";
import { YALLAPP_TENANT, type CommunityTenant } from "../types";

/**
 * 231 The whole community on MySQL or MariaDB (migration 0155), on a pool from lib/data/mysql's createPool.
 * 232–235 One tenant's (migration 0159): each part gets the tenant and keeps to it (every new table has `tenant_id`).
 */
export function mysqlCommunityStore(pool: mysql.Pool, tenant: CommunityTenant = YALLAPP_TENANT): CommunityStore {
  const db: CommunityDb = drizzle({ client: pool, schema: { ...communitySchema, ...engageSchema }, mode: "default" });
  return { tenant, base: new MysqlCommunityBaseStore(db, tenant), qa: new MysqlCommunityQaStore(db, tenant), trust: new MysqlCommunityTrustStore(db, tenant), engage: new MysqlEngageStore(db) };
}
