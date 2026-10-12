import { decrypt, encrypt } from "../crypto/encryption";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { License } from "../data/types";
import { generateLicenseKey, hashLicenseKey } from "../license/key";
import type { Plan } from "../plans";

const keyContext = (licenseId: string) => `license-key:${licenseId}`;

export function revealLicenseKey(license: License, encryptionKey: Buffer): string {
  return decrypt(license.keyEncrypted, encryptionKey, keyContext(license.id));
}

/** End of the chosen day in UTC: a plan "active until 31 March" works all of 31 March. */
export function endOfDayUtc(date: string): Date {
  return new Date(`${date}T23:59:59.999Z`);
}

async function uniqueKey(store: DataStore): Promise<{ key: string; hash: string }> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const key = generateLicenseKey();
    const hash = hashLicenseKey(key);
    if (!(await store.getLicenseByHash(hash))) return { key, hash };
  }
  throw new Error("Could not generate a unique license key");
}

export interface ActivationOutcome {
  license: License;
  licenseKey: string;
  created: boolean;
}

/**
 * Activates or renews a client: sets the plan and the end date, and creates
 * the license key on first activation. Renewing keeps the same key, so sites
 * that already use it keep working.
 */
export async function activateClient(
  store: DataStore,
  input: { clientId: string; plan: Plan; activeUntil: Date; paymentNote: string },
  encryptionKey: Buffer,
  now: Date,
): Promise<ActivationOutcome> {
  const client = await store.getClientById(input.clientId);
  if (!client) throw new Error("Client not found");
  const note = input.paymentNote.trim();
  const paymentNote = note
    ? [client.paymentNote, `${now.toISOString().slice(0, 10)}: ${note}`].filter(Boolean).join("\n")
    : client.paymentNote;

  let license = await store.getLicenseByClientId(client.id);
  let licenseKey: string;
  let created = false;
  if (license) {
    await store.updateLicense(license.id, { plan: input.plan, expiresAt: input.activeUntil }, now);
    license = { ...license, plan: input.plan, expiresAt: input.activeUntil, updatedAt: now };
    licenseKey = revealLicenseKey(license, encryptionKey);
  } else {
    const { key, hash } = await uniqueKey(store);
    const id = newId();
    license = {
      id,
      clientId: client.id,
      keyHash: hash,
      keyEncrypted: encrypt(key, encryptionKey, keyContext(id)),
      keyLast4: key.slice(-4),
      plan: input.plan,
      expiresAt: input.activeUntil,
      createdAt: now,
      updatedAt: now,
    };
    await store.createLicense(license);
    licenseKey = key;
    created = true;
  }
  await store.updateClient(
    client.id,
    { status: "active", paymentNote, activatedAt: client.activatedAt ?? now },
    now,
  );
  return { license, licenseKey, created };
}

export async function suspendClient(store: DataStore, clientId: string, now: Date): Promise<void> {
  await store.updateClient(clientId, { status: "suspended" }, now);
}

/** Lifts a suspension. The plan dates are unchanged. */
export async function reinstateClient(store: DataStore, clientId: string, now: Date): Promise<void> {
  const license = await store.getLicenseByClientId(clientId);
  await store.updateClient(clientId, { status: license ? "active" : "pending" }, now);
}

/** Replaces the key (for example after a leak). The old key stops working and the site must activate again. */
export async function regenerateLicenseKey(
  store: DataStore,
  clientId: string,
  encryptionKey: Buffer,
  now: Date,
): Promise<string> {
  const license = await store.getLicenseByClientId(clientId);
  if (!license) throw new Error("This client has no license yet");
  const { key, hash } = await uniqueKey(store);
  await store.updateLicense(
    license.id,
    { keyHash: hash, keyEncrypted: encrypt(key, encryptionKey, keyContext(license.id)), keyLast4: key.slice(-4) },
    now,
  );
  await store.deleteActivation(license.id);
  return key;
}
