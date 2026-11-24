import { MysqlQaStore } from "../qa/mysql";
import type { CommunityDb } from "./db";
import type { CommunityQaStore } from "./qa";

/** 231 Area B's data on MySQL or MariaDB (lib/db/community-schema.ts, migration 0156). */
export class MysqlCommunityQaStore extends MysqlQaStore implements CommunityQaStore {
  constructor(db: CommunityDb) {
    super(db as never);
  }
}
