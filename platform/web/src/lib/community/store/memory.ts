import type { CommunityStore } from ".";
import { MemoryCommunityBaseStore } from "./base-memory";
import { MemoryCommunityQaStore } from "./qa-memory";
import { MemoryCommunityTrustStore } from "./trust-memory";
import { MemoryEngageStore } from "../engage/store";

/** 231 The whole community in memory: tests and local runs (YALLAPP_DATA=memory). */
export function memoryCommunityStore(): CommunityStore {
  return { base: new MemoryCommunityBaseStore(), qa: new MemoryCommunityQaStore(), trust: new MemoryCommunityTrustStore(), engage: new MemoryEngageStore() };
}
