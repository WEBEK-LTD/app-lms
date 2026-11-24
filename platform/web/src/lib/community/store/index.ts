import type { CommunityBaseStore } from "./base";
import type { CommunityQaStore } from "./qa";
import type { CommunityTrustStore } from "./trust";

/**
 * 231 Yallapp Community's data, one part per area, each with a memory and a
 * MySQL implementation:
 * - `base` (A): members, sign-in, the social graph, Yallapp links, reports;
 * - `qa` (B): questions, answers, votes, sections, tags, tutorials;
 * - `trust` (C): badges, verification, audit log, settings, moderation, notifications.
 *
 * `getCommunityStore()` (server.ts) gives the process's store: in memory
 * with YALLAPP_DATA=memory (tests, local runs), MySQL otherwise.
 */
export interface CommunityStore {
  base: CommunityBaseStore;
  qa: CommunityQaStore;
  trust: CommunityTrustStore;
}

export type { CommunityBaseStore, CommunityQaStore, CommunityTrustStore };
