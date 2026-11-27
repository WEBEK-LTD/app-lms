import { MysqlTrustStore } from "../trust/store-mysql";
import type { CommunityDb } from "./db";
import type { CommunityTrustStore } from "./trust";
import { YALLAPP_TENANT, type CommunityTenant } from "../types";

/** 231 Area C's data on MySQL or MariaDB (lib/db/community-schema.ts). */
export class MysqlCommunityTrustStore extends MysqlTrustStore implements CommunityTrustStore {
  /** 232–235 Keeps to `tenant` (lib/community/types.ts CommunityTenant). */
  constructor(db: CommunityDb, tenant: CommunityTenant = YALLAPP_TENANT) {
    super(db as unknown as ConstructorParameters<typeof MysqlTrustStore>[0], tenant);
  }
}
