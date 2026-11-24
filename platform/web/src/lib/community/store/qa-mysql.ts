import type { CommunityDb } from "./db";
import type { CommunityQaStore } from "./qa";

/** 231 Area B's data on MySQL or MariaDB (lib/db/community-schema.ts). Area B fills it. */
export class MysqlCommunityQaStore implements CommunityQaStore {
  constructor(protected readonly db: CommunityDb) {}
}
