import "server-only";
import type { CommunityStore } from ".";
import { databaseConfig, dataMode } from "../../env";
import { memoryCommunityStore } from "./memory";
import { YALLAPP_TENANT, type CommunityTenant } from "../types";

const globalForCommunity = globalThis as unknown as { __yallappCommunityStores?: Map<CommunityTenant, Promise<CommunityStore>>; __yallappCommunityPool?: Promise<import("mysql2/promise").Pool> };

/**
 * 231 The community's store for this process: in memory for tests and local runs, MySQL otherwise.
 * 232–235 One per tenant ("yallapp", or a client app's id), on one pool.
 */
export function getCommunityStore(tenant: CommunityTenant = YALLAPP_TENANT): Promise<CommunityStore> {
  const stores = (globalForCommunity.__yallappCommunityStores ??= new Map());
  let store = stores.get(tenant);
  if (!store) {
    store = create(tenant).catch((error: unknown) => {
      stores.delete(tenant);
      throw error;
    });
    stores.set(tenant, store);
  }
  return store;
}

async function create(tenant: CommunityTenant): Promise<CommunityStore> {
  if (dataMode() === "memory") return memoryCommunityStore(tenant);
  const [{ createPool }, { mysqlCommunityStore }] = await Promise.all([import("../../data/mysql"), import("./mysql")]);
  globalForCommunity.__yallappCommunityPool ??= Promise.resolve(createPool(databaseConfig()));
  return mysqlCommunityStore(await globalForCommunity.__yallappCommunityPool, tenant);
}
