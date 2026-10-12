import type {
  Activation,
  App,
  Asset,
  Build,
  BuildStatus,
  Client,
  License,
  PluginRelease,
  ResetToken,
  User,
} from "./types";

export type ClientFilter = "all" | "pending" | "active" | "expired";

export interface ClientRow {
  client: Client;
  user: User;
  license: License | null;
  activation: Activation | null;
  latestBuild: Build | null;
}

export class DuplicateEmailError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "DuplicateEmailError";
  }
}

export type ClaimResult = { ok: true; activation: Activation } | { ok: false; existing: Activation };

export type UserPatch = Partial<Pick<User, "name" | "passwordHash" | "sessionVersion" | "lastSignInAt">>;
export type ClientPatch = Partial<Pick<Client, "whatsapp" | "siteUrl" | "status" | "paymentNote" | "activatedAt">>;
export type LicensePatch = Partial<Pick<License, "plan" | "expiresAt" | "keyHash" | "keyEncrypted" | "keyLast4">>;
export type AppPatch = Partial<Omit<App, "id" | "clientId" | "createdAt">>;
export type BuildPatch = Partial<
  Pick<Build, "status" | "stages" | "artifacts" | "message" | "logUrl" | "startedAt" | "finishedAt">
>;
export type ReleasePatch = Partial<Pick<PluginRelease, "changelog" | "requiresWp" | "requiresPhp" | "testedWp" | "published">>;

/**
 * Every read and write the platform does. Two implementations:
 * `MemoryStore` (YALLAPP_DATA=memory: tests and local runs) and
 * `MysqlStore` (production, MySQL on host.webek.org through Drizzle).
 */
export interface DataStore {
  // Users
  createUser(input: { email: string; name: string; passwordHash: string | null; now: Date }): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: string, patch: UserPatch, now: Date): Promise<void>;

  // Clients
  createClient(input: { userId: string; whatsapp: string; siteUrl: string; now: Date }): Promise<Client>;
  getClientById(id: string): Promise<Client | null>;
  getClientByUserId(userId: string): Promise<Client | null>;
  updateClient(id: string, patch: ClientPatch, now: Date): Promise<void>;
  listClients(input: { filter: ClientFilter; query?: string; now: Date }): Promise<ClientRow[]>;
  countClients(now: Date): Promise<Record<ClientFilter, number>>;

  // Licenses
  createLicense(license: License): Promise<void>;
  getLicenseById(id: string): Promise<License | null>;
  getLicenseByClientId(clientId: string): Promise<License | null>;
  getLicenseByHash(keyHash: string): Promise<License | null>;
  updateLicense(id: string, patch: LicensePatch, now: Date): Promise<void>;

  // Activations (one site per license)
  getActivation(licenseId: string): Promise<Activation | null>;
  /** Binds the license to a site unless it is bound to another one. Atomic. */
  claimActivation(activation: Activation): Promise<ClaimResult>;
  touchActivation(licenseId: string, patch: Pick<Activation, "pluginVersion" | "wpVersion" | "lms" | "lastCheckedAt">): Promise<void>;
  deleteActivation(licenseId: string): Promise<void>;

  // Apps
  createApp(app: App): Promise<void>;
  getAppByClientId(clientId: string): Promise<App | null>;
  getAppById(id: string): Promise<App | null>;
  updateApp(id: string, patch: AppPatch, now: Date): Promise<void>;

  // Builds
  /** Assigns the next per-client build number and version code. */
  createBuild(build: Omit<Build, "number" | "versionCode">): Promise<Build>;
  getBuild(id: string): Promise<Build | null>;
  listBuildsByClient(clientId: string, limit: number): Promise<Build[]>;
  listBuilds(input: { status?: BuildStatus; limit: number }): Promise<Build[]>;
  updateBuild(id: string, patch: BuildPatch, now: Date): Promise<void>;

  // Plugin releases
  createRelease(release: PluginRelease): Promise<void>;
  getRelease(id: string): Promise<PluginRelease | null>;
  getReleaseByVersion(version: string): Promise<PluginRelease | null>;
  listReleases(): Promise<PluginRelease[]>;
  updateRelease(id: string, patch: ReleasePatch): Promise<void>;
  deleteRelease(id: string): Promise<void>;

  // Uploaded assets (icons, logos)
  createAsset(asset: Asset): Promise<void>;
  getAsset(id: string): Promise<Asset | null>;

  // Password reset tokens
  createResetToken(token: ResetToken): Promise<void>;
  getResetToken(tokenHash: string): Promise<ResetToken | null>;
  /** Marks the token used; returns false if it was already used (single use, atomic). */
  consumeResetToken(tokenHash: string, now: Date): Promise<boolean>;

  // Rate limits: fixed windows
  /** Records one hit in the window starting at `windowStart` and returns the hits so far. */
  hitRateLimit(bucket: string, windowStart: number, now: Date): Promise<number>;
}
