import "server-only";
import type { CommunityStore } from ".";
import { databaseConfig, dataMode } from "../../env";
import { memoryCommunityStore } from "./memory";

const globalForCommunity = globalThis as unknown as { __yallappCommunityStore?: Promise<CommunityStore> };

/** 231 The community's store for this process: in memory for tests and local runs, MySQL otherwise. */
export function getCommunityStore(): Promise<CommunityStore> {
  globalForCommunity.__yallappCommunityStore ??= create().catch((error: unknown) => {
    globalForCommunity.__yallappCommunityStore = undefined;
    throw error;
  });
  return globalForCommunity.__yallappCommunityStore;
}

async function create(): Promise<CommunityStore> {
  if (dataMode() === "memory") return memoryCommunityStore();
  const [{ createPool }, { mysqlCommunityStore }] = await Promise.all([import("../../data/mysql"), import("./mysql")]);
  return mysqlCommunityStore(createPool(databaseConfig()));
}
