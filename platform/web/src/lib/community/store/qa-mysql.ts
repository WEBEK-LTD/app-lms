import { MysqlQaStore } from "../qa/mysql";
import { MysqlAcademyStore } from "../academy/mysql";
import { MysqlSocialStore } from "../social/mysql";
import type { CommunityDb } from "./db";
import type { CommunityQaStore } from "./qa";

/** 231 Area B's data on MySQL or MariaDB (lib/db/community-schema.ts, migration 0156); 232 its social part (0169); 233 the Academy (0170). */
export class MysqlCommunityQaStore extends MysqlQaStore implements CommunityQaStore {
  readonly social: MysqlSocialStore;
  readonly academy: MysqlAcademyStore;
  constructor(db: CommunityDb) {
    super(db as never);
    this.social = new MysqlSocialStore(db);
    this.academy = new MysqlAcademyStore(db);
  }
}
