import { decrypt, encrypt } from "../crypto/encryption";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, Client, License } from "../data/types";
import { generateLicenseKey, hashLicenseKey } from "../license/key";
import type { Plan } from "../plans";
import { appLabel } from "../app/label";

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
  /** The app the license is for; null before the account's first app exists. */
  app: App | null;
}

/**
 * Which of a client's apps an action is for. A string must be one of their
 * apps (null when it isn't). Left out: their only app, or no app before the
 * first one exists; with several apps it can't be guessed, so it throws.
 */
export async function resolveClientApp(store: DataStore, client: Pick<Client, "id">, appId?: string | null): Promise<App | null | undefined> {
  const apps = await store.listAppsByClient(client.id);
  if (typeof appId === "string") return apps.find((a) => a.id === appId);
  if (apps.length > 1) throw new Error("Choose which app");
  return apps[0] ?? null;
}

/**
 * Activates or renews one app of a client: sets its plan and end date, and
 * creates its license key on its first activation. Renewing keeps the same
 * key, so the site that already uses it keeps working. The account becomes
 * active with its first activation. `appId` left out: the client's only app
 * (or the license for their first app, before it exists).
 */
export async function activateClient(
  store: DataStore,
  input: { clientId: string; appId?: string | null; plan: Plan; activeUntil: Date; paymentNote: string },
  encryptionKey: Buffer,
  now: Date,
): Promise<ActivationOutcome> {
  const client = await store.getClientById(input.clientId);
  if (!client) throw new Error("Client not found");
  const app = await resolveClientApp(store, client, input.appId);
  if (app === undefined) throw new Error("App not found");
  const note = input.paymentNote.trim();
  const paymentNote = note
    ? [client.paymentNote, `${now.toISOString().slice(0, 10)}: ${note}${app ? ` (${appLabel(app)})` : ""}`].filter(Boolean).join("\n")
    : client.paymentNote;

  let license = await store.getLicenseForApp(client.id, app?.id ?? null);
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
      appId: app?.id ?? null,
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
  return { license, licenseKey, created, app };
}

export async function suspendClient(store: DataStore, clientId: string, now: Date): Promise<void> {
  await store.updateClient(clientId, { status: "suspended" }, now);
}

/** Lifts a suspension. The plan dates are unchanged. */
export async function reinstateClient(store: DataStore, clientId: string, now: Date): Promise<void> {
  const licenses = await store.listLicensesByClient(clientId);
  await store.updateClient(clientId, { status: licenses.length ? "active" : "pending" }, now);
}

/**
 * Replaces an app's key (for example after a leak). The old key stops working
 * and the site must activate again. `appId` left out: the client's only app.
 */
export async function regenerateLicenseKey(
  store: DataStore,
  clientId: string,
  encryptionKey: Buffer,
  now: Date,
  appId?: string | null,
): Promise<string> {
  const app = await resolveClientApp(store, { id: clientId }, appId);
  const license = app === undefined ? null : await store.getLicenseForApp(clientId, app?.id ?? null);
  if (!license) throw new Error("This app has no license yet");
  const { key, hash } = await uniqueKey(store);
  await store.updateLicense(
    license.id,
    { keyHash: hash, keyEncrypted: encrypt(key, encryptionKey, keyContext(license.id)), keyLast4: key.slice(-4) },
    now,
  );
  await store.deleteActivation(license.id);
  return key;
}
