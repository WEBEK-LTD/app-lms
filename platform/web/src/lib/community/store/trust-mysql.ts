import type { CommunityDb } from "./db";
import type { CommunityTrustStore } from "./trust";

/** 231 Area C's data on MySQL or MariaDB (lib/db/community-schema.ts). Area C fills it. */
export class MysqlCommunityTrustStore implements CommunityTrustStore {
  constructor(protected readonly db: CommunityDb) {}
}
