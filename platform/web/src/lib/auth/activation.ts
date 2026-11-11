import type { DataStore } from "../data/store";
import type { Client } from "../data/types";

/**
 * 121 Every account is active from the start: whoever signs up opens the
 * dashboard at once and chooses the regular editor or Yallapp Studio. An
 * app still needs its own plan to be built and to run for its users
 * (lib/license/status.ts), which the team or a card payment gives it. An
 * account made before this, still waiting, becomes active the next time
 * its owner or someone on its team signs in. A suspended account stays
 * suspended.
 */
export async function activeFromStart(store: DataStore, client: Client, now: Date): Promise<Client> {
  if (client.status !== "pending") return client;
  const activatedAt = client.activatedAt ?? now;
  await store.updateClient(client.id, { status: "active", activatedAt }, now);
  return { ...client, status: "active", activatedAt, updatedAt: now };
}
