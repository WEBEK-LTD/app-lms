import type { TrustStore } from "../trust/store";

/**
 * 231 Area C's data (trust): badges, verification requests, the audit log,
 * settings, the moderation queue, violations, notifications and their email
 * choices, and the moderators' side of reports (lib/db/community-schema.ts,
 * Area C). The interface is lib/community/trust/store.ts; its memory store
 * (trust-memory.ts) and MySQL store (trust-mysql.ts) run one shared suite
 * (tests/unit/community-trust-store.test.ts).
 */
export type CommunityTrustStore = TrustStore;
