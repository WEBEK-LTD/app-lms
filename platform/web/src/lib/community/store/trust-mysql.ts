import { MysqlTrustStore } from "../trust/store-mysql";
import type { CommunityDb } from "./db";
import type { CommunityTrustStore } from "./trust";

/** 231 Area C's data on MySQL or MariaDB (lib/db/community-schema.ts). */
export class MysqlCommunityTrustStore extends MysqlTrustStore implements CommunityTrustStore {
  constructor(db: CommunityDb) {
    super(db as unknown as ConstructorParameters<typeof MysqlTrustStore>[0]);
  }
}
