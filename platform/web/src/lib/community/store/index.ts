import type { CommunityBaseStore } from "./base";
import type { CommunityQaStore } from "./qa";
import type { CommunityTrustStore } from "./trust";
import type { EngageStore } from "../engage/store";
import type { CommunityTenant } from "../types";
import type { ConnectStore } from "../connect/store";

/**
 * 231 Yallapp Community's data, one part per area, each with a memory and a
 * MySQL implementation:
 * - `base` (A): members, sign-in, the social graph, Yallapp links, reports;
 * - `qa` (B): questions, answers, votes, sections, tags, tutorials;
 * - `trust` (C): badges, verification, audit log, settings, moderation, notifications;
 * - `engage` (C, phases 2–5): push devices, points, challenges, events, course orders.
 *
 * `getCommunityStore()` (server.ts) gives the process's store: in memory
 * with YALLAPP_DATA=memory (tests, local runs), MySQL otherwise.
 */
export interface CommunityStore {
  /** 232–235 Whose community this store reads and writes (lib/community/types.ts CommunityTenant). */
  tenant: CommunityTenant;
  base: CommunityBaseStore;
  qa: CommunityQaStore;
  trust: CommunityTrustStore;
  engage: EngageStore;
  /** 232–234 (A): messages, groups, pros, jobs (lib/community/connect). */
  connect: ConnectStore;
}

export type { CommunityBaseStore, CommunityQaStore, CommunityTrustStore, EngageStore };
