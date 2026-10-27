import { decrypt, encrypt } from "../../crypto/encryption";
import type { DataStore } from "../../data/store";
import type { App, AppType, ConnectorConfig, HostedUser } from "../../data/types";
import { partnerAppCredentials, type PartnerAppKey, type PartnerCredentials } from "./partner-apps";
import { ConnectorError, type Connector } from "./types";

/**
 * Platforms a client connects with keys they paste on the Website step
 * (roadmap 8.5): each one is a connector plus the fields its keys need.
 * Non-secret values are stored as they are; secrets are stored encrypted
 * together (context `app:connector:<app id>`).
 */

export type PlatformId = "ikas" | "ticimax" | "ideasoft" | "teachable" | "thinkific" | "simplybook" | "wix" | "salla" | "zid" | "rss";

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
  /**
   * 100.7 A school's paid courses for selling in the app, each with its
   * one-time price when the platform's API gives one it can be sure of
   * (null otherwise: the owner lists it). Throws ConnectorError when the
   * school can't be read.
   */
  storeCourses?(): Promise<{ id: number; title: string; price: string | null; currency: string | null }[]>;
  /**
   * 100.7 Gives (`grant`) or takes back (`revoke`) a student's access to
   * courses bought in the app, through the platform's enrolment API, with
   * the student the app's content uses. A grant leaves alone a course the
   * student has already (from the school's website) unless Yallapp gave it
   * (`ours`), and returns the courses Yallapp gave; a revoke ends exactly
   * `courseIds`. Throws ConnectorError when the platform can't be reached.
   */
  storeAccess?(input: StoreAccessInput): Promise<{ granted: number[] }>;
}

/** 100.7 A `storeAccess` that stopped part way: the courses it gave before it failed. */
export class StoreAccessError extends ConnectorError {
  constructor(
    message: string,
    readonly granted: number[],
  ) {
    super(message);
    this.name = "StoreAccessError";
  }
}

/** 100.7 What a platform's `storeAccess` gets. */
export interface StoreAccessInput {
  user: HostedUser;
  action: "grant" | "revoke";
  courseIds: number[];
  /** Courses Yallapp enrolled the student in already for this purchase. */
  ours: number[];
  /** A membership's end of the paid period (null: a course, for good). */
  expiresAt: Date | null;
  now: Date;
}

export interface PlatformDeps {
  appId: string;
  store: DataStore;
  fetcher: typeof fetch;
  /** Saves secrets a platform renewed (OAuth refresh tokens). */
  saveSecrets: (secrets: Record<string, string>) => Promise<void>;
  /**
   * 25 Every value saved for the app now (secrets decrypted), or null: tokens
   * another server renewed since this connector was made.
   */
  loadSecrets?: () => Promise<Record<string, string> | null>;
  /** 25 Yallapp's partner app on the platform (OAuth platforms), or null until the team sets it. */
  partnerApp?: () => Promise<PartnerCredentials | null>;
}

/**
 * 25 A platform the client connects with OAuth through Yallapp's partner app
 * (Salla, Zid) instead of pasting keys: the Website step shows a "Connect
 * with …" button, and src/app/oauth/<platform> saves the connection.
 */
export interface PlatformOAuth {
  /** Where the partner app's credentials are kept (admin Settings). */
  settingKey: PartnerAppKey;
  /** The platform's approval page. */
  authorizeUrl(clientId: string, redirectUri: string, state: string): string;
  /** Swaps an authorization code for the values to save (tokens, the store's ID and name). */
  connect(code: string, credentials: PartnerCredentials, redirectUri: string, fetcher: typeof fetch): Promise<Record<string, string>>;
  /** The connected store's name, from the saved values. */
  storeName(values: Record<string, string>): string | null;
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
  /** 25 Connected with OAuth instead of fields (`fields` is then empty). */
  oauth?: PlatformOAuth;
  /** 23 What to tell the client when `check()` failed, instead of the usual sentence; null for that sentence. */
  explain?(error: unknown): string | null;
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
  const current = async () => {
    const latest = await deps.store.getAppById(app.id);
    // 25 Only while the app is still connected to this platform.
    if (!latest || latest.connector?.kind !== "platform" || latest.connector.platform !== definition.id) return null;
    const saved = platformValues(latest, key);
    return saved ? { app: latest, saved } : null;
  };
  const oauth = definition.oauth;
  return definition.create(values, {
    appId: app.id,
    store: deps.store,
    fetcher,
    saveSecrets: async (renewed) => {
      const now = await current();
      if (!now) return;
      await deps.store.updateApp(app.id, { connector: platformConnectorConfig(app.id, definition, { ...now.saved, ...renewed }, key) }, new Date());
    },
    loadSecrets: async () => (await current())?.saved ?? null,
    ...(oauth ? { partnerApp: () => partnerAppCredentials(deps.store, oauth.settingKey, key) } : {}),
  });
}
