import "server-only";
import { dataMode, databaseConfig, isNetlify, memorySeedAdminPassword, superAdminEmails } from "../env";
import { hashPassword } from "../auth/password";
import { MemoryStore } from "./memory";
import type { DataStore } from "./store";

export type { DataStore } from "./store";

const globalForStore = globalThis as unknown as { __yallappStore?: Promise<DataStore> };

/** The data store for this process: in-memory for tests and local runs, MySQL otherwise. */
export function getStore(): Promise<DataStore> {
  globalForStore.__yallappStore ??= createStore().catch((error: unknown) => {
    globalForStore.__yallappStore = undefined;
    throw error;
  });
  return globalForStore.__yallappStore;
}

async function createStore(): Promise<DataStore> {
  if (dataMode() === "memory") {
    const store = new MemoryStore();
    await seedMemoryAdmins(store);
    return store;
  }
  const { MysqlStore, createPool } = await import("./mysql");
  const store = new MysqlStore(createPool(databaseConfig()));
  // Local test runs against a MySQL or MariaDB database (never on Netlify).
  if (!isNetlify()) await seedMemoryAdmins(store);
  return store;
}

/**
 * Local runs and tests only (YALLAPP_SEED_ADMIN_PASSWORD, never on Netlify):
 * creates the super admins with a known password so tests can sign in.
 */
async function seedMemoryAdmins(store: DataStore): Promise<void> {
  const password = memorySeedAdminPassword();
  if (!password) return;
  const passwordHash = await hashPassword(password);
  for (const email of superAdminEmails()) {
    if (await store.getUserByEmail(email)) continue;
    await store.createUser({ email, name: "Yallapp admin", passwordHash, now: new Date() });
  }
}
