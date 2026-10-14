import { decrypt, encrypt } from "../../crypto/encryption";
import type { DataStore } from "../../data/store";
import type { App, AppType, ConnectorConfig } from "../../data/types";
import { ConnectorError, type Connector } from "./types";

/**
 * Platforms a client connects with keys they paste on the Website step
 * (roadmap 8.5): each one is a connector plus the fields its keys need.
 * Non-secret values are stored as they are; secrets are stored encrypted
 * together (context `app:connector:<app id>`).
 */

export type PlatformId = "ikas" | "ticimax" | "ideasoft" | "teachable" | "thinkific" | "simplybook" | "wix";

/**
 * 22 Keys a platform refused for a reason the client can fix (a missing
 * permission, a site without a shop): the Website step shows this message
 * instead of the general one.
 */
export class PlatformCheckError extends ConnectorError {
  constructor(message: string) {
    super(message);
    this.name = "PlatformCheckError";
  }
}

export interface PlatformField {
  name: string;
  label: string;
  hint: string;
  /** Stored encrypted and never sent back to the browser. */
  secret: boolean;
  placeholder?: string;
  /** Leave empty to skip. */
  optional?: boolean;
}

/** A connector of a platform, which can check its keys. */
export interface PlatformConnector extends Connector {
  /** Checks the keys; returns the shop's or school's name. Throws ConnectorError when they don't work. */
  check(): Promise<string>;
}

export interface PlatformDeps {
  appId: string;
  store: DataStore;
  fetcher: typeof fetch;
  /** Saves secrets a platform renewed (OAuth refresh tokens). */
  saveSecrets: (secrets: Record<string, string>) => Promise<void>;
}

export interface PlatformDefinition {
  id: PlatformId;
  name: string;
  appType: AppType;
  /** One line on the Website step. */
  summary: string;
  fields: PlatformField[];
  /**
   * Cleans what the client typed (a shop address into its host, for
   * example); returns errors by field name when something is wrong.
   */
  normalize(values: Record<string, string>): { values: Record<string, string> } | { errors: Record<string, string> };
  create(values: Record<string, string>, deps: PlatformDeps): PlatformConnector;
}

const definitions = new Map<PlatformId, PlatformDefinition>();

/** Adds a platform (each connector module registers itself). */
export function registerPlatform(definition: PlatformDefinition): void {
  definitions.set(definition.id, definition);
}

export function platformDefinition(id: string): PlatformDefinition | null {
  return definitions.get(id as PlatformId) ?? null;
}

export function platformDefinitions(): PlatformDefinition[] {
  return [...definitions.values()];
}

const context = (appId: string) => `app:connector:${appId}`;

export function platformConnectorConfig(appId: string, definition: PlatformDefinition, values: Record<string, string>, key: Buffer): ConnectorConfig {
  const settings: Record<string, string> = {};
  const secrets: Record<string, string> = {};
  for (const field of definition.fields) {
    const value = values[field.name] ?? "";
    if (field.secret) secrets[field.name] = value;
    else settings[field.name] = value;
  }
  // Values a platform keeps besides its fields (OAuth tokens) are secrets too.
  for (const [name, value] of Object.entries(values)) {
    if (!definition.fields.some((f) => f.name === name)) secrets[name] = value;
  }
  return { kind: "platform", platform: definition.id, settings, secretsEncrypted: encrypt(JSON.stringify(secrets), key, context(appId)) };
}

/** Every saved value of the app's platform, secrets decrypted (server only), or null. */
export function platformValues(app: App, key: Buffer): Record<string, string> | null {
  if (app.connector?.kind !== "platform") return null;
  try {
    const secrets = JSON.parse(decrypt(app.connector.secretsEncrypted, key, context(app.id))) as Record<string, string>;
    return { ...app.connector.settings, ...secrets };
  } catch {
    return null;
  }
}

/** The connector of the app's platform, or null. */
export function platformConnector(
  app: App,
  key: Buffer,
  deps: { store: DataStore },
  fetcher: typeof fetch = fetch,
): PlatformConnector | null {
  if (app.connector?.kind !== "platform") return null;
  const definition = platformDefinition(app.connector.platform);
  const values = platformValues(app, key);
  // 19 Said in the server log: the app then has no content until the owner connects the platform again.
  if (!definition) console.error(`[hosted] app ${app.id}: unknown platform "${app.connector.platform}", so it isn't connected.`);
  else if (!values) console.error(`[hosted] app ${app.id}: the saved ${definition.name} keys can't be decrypted, so it isn't connected.`);
  if (!definition || !values) return null;
  return definition.create(values, {
    appId: app.id,
    store: deps.store,
    fetcher,
    saveSecrets: async (renewed) => {
      const current = await deps.store.getAppById(app.id);
      const saved = current ? platformValues(current, key) : null;
      if (!current || !saved || current.connector?.kind !== "platform") return;
      await deps.store.updateApp(app.id, { connector: platformConnectorConfig(app.id, definition, { ...saved, ...renewed }, key) }, new Date());
    },
  });
}
