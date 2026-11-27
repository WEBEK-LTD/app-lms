import type { CommunityStore } from ".";
import { MemoryCommunityBaseStore } from "./base-memory";
import { MemoryCommunityQaStore } from "./qa-memory";
import { MemoryCommunityTrustStore } from "./trust-memory";
import { MemoryEngageStore } from "../engage/store";
import { YALLAPP_TENANT, type CommunityTenant } from "../types";
import { MemoryConnectStore } from "../connect/memory";

/** 231 The whole community in memory: tests and local runs (YALLAPP_DATA=memory). 232–235 One per tenant: tenants never share a map. */
export function memoryCommunityStore(tenant: CommunityTenant = YALLAPP_TENANT): CommunityStore {
  return { tenant, base: new MemoryCommunityBaseStore(), qa: new MemoryCommunityQaStore(), trust: new MemoryCommunityTrustStore(), connect: new MemoryConnectStore(), engage: new MemoryEngageStore() };
}
