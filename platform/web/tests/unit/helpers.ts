import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { DataStore } from "@/lib/data/store";
import type { License } from "@/lib/data/types";
import type { Plan } from "@/lib/plans";

export const KEY = Buffer.alloc(32, 7);
export const NOW = new Date("2026-10-12T10:00:00Z");

export function days(n: number, from: Date = NOW): Date {
  return new Date(from.getTime() + n * 86_400_000);
}

/** The license of a client with one app (or none yet): their only one. */
export async function licenseOf(store: Pick<DataStore, "listLicensesByClient">, clientId: string): Promise<License | null> {
  const licenses = await store.listLicensesByClient(clientId);
  if (licenses.length > 1) throw new Error("This client has several licenses: ask for one app's");
  return licenses[0] ?? null;
}

/** A store with one client, optionally activated with a license. */
export async function setupClient(options: { plan?: Plan; activeUntil?: Date; activate?: boolean; email?: string } = {}) {
  const store = new MemoryStore();
  const { user, client } = await registerClient(
    store,
    {
      name: "Ada Academy",
      email: options.email ?? "ada@academy.test",
      whatsapp: "+905446731942",
      siteUrl: "https://academy.test",
      password: null,
    },
    NOW,
  );
  if (options.activate === false) return { store, user, client, licenseKey: null as string | null };
  const outcome = await activateClient(
    store,
    { clientId: client.id, plan: options.plan ?? "growth", activeUntil: options.activeUntil ?? days(30), paymentNote: "bank transfer" },
    KEY,
    NOW,
  );
  return { store, user, client, licenseKey: outcome.licenseKey as string | null, license: outcome.license };
}
