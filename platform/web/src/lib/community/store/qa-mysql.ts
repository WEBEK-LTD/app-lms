import { MysqlQaStore } from "../qa/mysql";
import type { CommunityDb } from "./db";
import type { CommunityQaStore } from "./qa";
import { YALLAPP_TENANT, type CommunityTenant } from "../types";

/** 231 Area B's data on MySQL or MariaDB (lib/db/community-schema.ts, migration 0156). */
export class MysqlCommunityQaStore extends MysqlQaStore implements CommunityQaStore {
  /** 232–235 The tenant, for area B to keep its queries to (lib/community/types.ts CommunityTenant). */
  readonly tenant: CommunityTenant;
  constructor(db: CommunityDb, tenant: CommunityTenant = YALLAPP_TENANT) {
    super(db as never);
    this.tenant = tenant;
  }
}
