import { MysqlQaStore } from "../qa/mysql";
import { MysqlAcademyStore } from "../academy/mysql";
import { MysqlSocialStore } from "../social/mysql";
import type { CommunityDb } from "./db";
import type { CommunityQaStore } from "./qa";
import { YALLAPP_TENANT, type CommunityTenant } from "../types";

/** 231 Area B's data on MySQL or MariaDB (lib/db/community-schema.ts, migration 0156); 232 its social part (0169); 233 the Academy (0170). */
export class MysqlCommunityQaStore extends MysqlQaStore implements CommunityQaStore {
  /** 232–235 The tenant, for area B to keep its queries to (lib/community/types.ts CommunityTenant). */
  readonly tenant: CommunityTenant;
  readonly social: MysqlSocialStore;
  readonly academy: MysqlAcademyStore;
  constructor(db: CommunityDb, tenant: CommunityTenant = YALLAPP_TENANT) {
    super(db as never);
    this.tenant = tenant;
    this.social = new MysqlSocialStore(db);
    this.academy = new MysqlAcademyStore(db);
  }
}
