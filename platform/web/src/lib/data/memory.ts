import { accountState } from "../license/status";
import { newId } from "../crypto/tokens";
import type {
  AppPatch,
  BuildPatch,
  ClaimResult,
  ClientFilter,
  ClientPatch,
  ClientRow,
  DataStore,
  LicensePatch,
  ReleasePatch,
  UserPatch,
} from "./store";
import { DuplicateEmailError } from "./store";
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

const clone = <T>(value: T): T => structuredClone(value);

/**
 * In-memory store for tests and local runs (YALLAPP_DATA=memory).
 * Data lives as long as the process. Values are cloned on the way in and out
 * so callers can't mutate stored records by accident, as with a real database.
 */
export class MemoryStore implements DataStore {
  private users = new Map<string, User>();
  private clients = new Map<string, Client>();
  private licenses = new Map<string, License>();
  private activations = new Map<string, Activation>();
  private apps = new Map<string, App>();
  private builds = new Map<string, Build>();
  private releases = new Map<string, PluginRelease>();
  private assets = new Map<string, Asset>();
  private resetTokens = new Map<string, ResetToken>();
  private rateLimits = new Map<string, { windowStart: number; hits: number }>();

  async createUser(input: { email: string; name: string; passwordHash: string | null; now: Date }): Promise<User> {
    const email = input.email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email === email) throw new DuplicateEmailError();
    }
    const user: User = {
      id: newId(),
      email,
      name: input.name,
      passwordHash: input.passwordHash,
      sessionVersion: 1,
      createdAt: input.now,
      updatedAt: input.now,
      lastSignInAt: null,
    };
    this.users.set(user.id, clone(user));
    return clone(user);
  }

  async getUserById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? clone(user) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const wanted = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email === wanted) return clone(user);
    }
    return null;
  }

  async updateUser(id: string, patch: UserPatch, now: Date): Promise<void> {
    const user = this.users.get(id);
    if (user) this.users.set(id, clone({ ...user, ...patch, updatedAt: now }));
  }

  async createClient(input: { userId: string; whatsapp: string; siteUrl: string; now: Date }): Promise<Client> {
    const client: Client = {
      id: newId(),
      userId: input.userId,
      whatsapp: input.whatsapp,
      siteUrl: input.siteUrl,
      status: "pending",
      paymentNote: null,
      activatedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    };
    this.clients.set(client.id, clone(client));
    return clone(client);
  }

  async getClientById(id: string): Promise<Client | null> {
    const client = this.clients.get(id);
    return client ? clone(client) : null;
  }

  async getClientByUserId(userId: string): Promise<Client | null> {
    for (const client of this.clients.values()) {
      if (client.userId === userId) return clone(client);
    }
    return null;
  }

  async updateClient(id: string, patch: ClientPatch, now: Date): Promise<void> {
    const client = this.clients.get(id);
    if (client) this.clients.set(id, clone({ ...client, ...patch, updatedAt: now }));
  }

  private rowFor(client: Client): ClientRow | null {
    const user = this.users.get(client.userId);
    if (!user) return null;
    const license = [...this.licenses.values()].find((l) => l.clientId === client.id) ?? null;
    const latestBuild =
      [...this.builds.values()].filter((b) => b.clientId === client.id).sort((a, b) => b.number - a.number)[0] ?? null;
    return {
      client: clone(client),
      user: clone(user),
      license: license ? clone(license) : null,
      activation: license ? clone(this.activations.get(license.id) ?? null) : null,
      latestBuild: latestBuild ? clone(latestBuild) : null,
    };
  }

  async listClients(input: { filter: ClientFilter; query?: string; now: Date }): Promise<ClientRow[]> {
    const query = input.query?.trim().toLowerCase();
    const rows: ClientRow[] = [];
    for (const client of this.clients.values()) {
      const row = this.rowFor(client);
      if (!row) continue;
      if (input.filter !== "all" && accountState(row.client, row.license, input.now) !== input.filter) continue;
      if (query) {
        const haystack = [row.user.name, row.user.email, row.client.whatsapp, row.client.siteUrl].join(" ").toLowerCase();
        if (!haystack.includes(query)) continue;
      }
      rows.push(row);
    }
    return rows.sort((a, b) => b.client.createdAt.getTime() - a.client.createdAt.getTime());
  }

  async countClients(now: Date): Promise<Record<ClientFilter, number>> {
    const counts: Record<ClientFilter, number> = { all: 0, pending: 0, active: 0, expired: 0 };
    for (const client of this.clients.values()) {
      const license = [...this.licenses.values()].find((l) => l.clientId === client.id) ?? null;
      const state = accountState(client, license, now);
      counts.all += 1;
      if (state !== "suspended") counts[state] += 1;
    }
    return counts;
  }

  async createLicense(license: License): Promise<void> {
    for (const existing of this.licenses.values()) {
      if (existing.clientId === license.clientId) throw new Error("Client already has a license");
      if (existing.keyHash === license.keyHash) throw new Error("Duplicate license key");
    }
    this.licenses.set(license.id, clone(license));
  }

  async getLicenseById(id: string): Promise<License | null> {
    const license = this.licenses.get(id);
    return license ? clone(license) : null;
  }

  async getLicenseByClientId(clientId: string): Promise<License | null> {
    for (const license of this.licenses.values()) {
      if (license.clientId === clientId) return clone(license);
    }
    return null;
  }

  async getLicenseByHash(keyHash: string): Promise<License | null> {
    for (const license of this.licenses.values()) {
      if (license.keyHash === keyHash) return clone(license);
    }
    return null;
  }

  async updateLicense(id: string, patch: LicensePatch, now: Date): Promise<void> {
    const license = this.licenses.get(id);
    if (license) this.licenses.set(id, clone({ ...license, ...patch, updatedAt: now }));
  }

  async getActivation(licenseId: string): Promise<Activation | null> {
    const activation = this.activations.get(licenseId);
    return activation ? clone(activation) : null;
  }

  async claimActivation(activation: Activation): Promise<ClaimResult> {
    const existing = this.activations.get(activation.licenseId);
    if (existing && existing.siteUrl !== activation.siteUrl) return { ok: false, existing: clone(existing) };
    const next: Activation = existing
      ? {
          ...existing,
          siteUrlRaw: activation.siteUrlRaw,
          pluginVersion: activation.pluginVersion,
          wpVersion: activation.wpVersion,
          lms: activation.lms,
          lastCheckedAt: activation.lastCheckedAt,
        }
      : activation;
    this.activations.set(activation.licenseId, clone(next));
    return { ok: true, activation: clone(next) };
  }

  async touchActivation(
    licenseId: string,
    patch: Pick<Activation, "pluginVersion" | "wpVersion" | "lms" | "lastCheckedAt">,
  ): Promise<void> {
    const activation = this.activations.get(licenseId);
    if (activation) this.activations.set(licenseId, clone({ ...activation, ...patch }));
  }

  async deleteActivation(licenseId: string): Promise<void> {
    this.activations.delete(licenseId);
  }

  async createApp(app: App): Promise<void> {
    for (const existing of this.apps.values()) {
      if (existing.clientId === app.clientId) throw new Error("Client already has an app");
    }
    this.apps.set(app.id, clone(app));
  }

  async getAppByClientId(clientId: string): Promise<App | null> {
    for (const app of this.apps.values()) {
      if (app.clientId === clientId) return clone(app);
    }
    return null;
  }

  async getAppById(id: string): Promise<App | null> {
    const app = this.apps.get(id);
    return app ? clone(app) : null;
  }

  async updateApp(id: string, patch: AppPatch, now: Date): Promise<void> {
    const app = this.apps.get(id);
    if (app) this.apps.set(id, clone({ ...app, ...patch, updatedAt: now }));
  }

  async createBuild(input: Omit<Build, "number" | "versionCode">): Promise<Build> {
    const previous = [...this.builds.values()].filter((b) => b.clientId === input.clientId);
    const number = previous.reduce((max, b) => Math.max(max, b.number), 0) + 1;
    const versionCode = previous.reduce((max, b) => Math.max(max, b.versionCode), 0) + 1;
    const build: Build = {
      ...input,
      number,
      versionCode,
      config: { ...input.config, version_code: versionCode },
    };
    this.builds.set(build.id, clone(build));
    return clone(build);
  }

  async getBuild(id: string): Promise<Build | null> {
    const build = this.builds.get(id);
    return build ? clone(build) : null;
  }

  async listBuildsByClient(clientId: string, limit: number): Promise<Build[]> {
    return [...this.builds.values()]
      .filter((b) => b.clientId === clientId)
      .sort((a, b) => b.number - a.number)
      .slice(0, limit)
      .map(clone);
  }

  async listBuilds(input: { status?: BuildStatus; limit: number }): Promise<Build[]> {
    return [...this.builds.values()]
      .filter((b) => !input.status || b.status === input.status)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, input.limit)
      .map(clone);
  }

  async updateBuild(id: string, patch: BuildPatch, now: Date): Promise<void> {
    const build = this.builds.get(id);
    if (build) this.builds.set(id, clone({ ...build, ...patch, updatedAt: now }));
  }

  async createRelease(release: PluginRelease): Promise<void> {
    for (const existing of this.releases.values()) {
      if (existing.version === release.version) throw new Error("This version already exists");
    }
    this.releases.set(release.id, clone(release));
  }

  async getRelease(id: string): Promise<PluginRelease | null> {
    const release = this.releases.get(id);
    return release ? clone(release) : null;
  }

  async getReleaseByVersion(version: string): Promise<PluginRelease | null> {
    for (const release of this.releases.values()) {
      if (release.version === version) return clone(release);
    }
    return null;
  }

  async listReleases(): Promise<PluginRelease[]> {
    return [...this.releases.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map(clone);
  }

  async updateRelease(id: string, patch: ReleasePatch): Promise<void> {
    const release = this.releases.get(id);
    if (release) this.releases.set(id, clone({ ...release, ...patch }));
  }

  async deleteRelease(id: string): Promise<void> {
    this.releases.delete(id);
  }

  async createAsset(asset: Asset): Promise<void> {
    this.assets.set(asset.id, clone(asset));
  }

  async getAsset(id: string): Promise<Asset | null> {
    const asset = this.assets.get(id);
    return asset ? clone(asset) : null;
  }

  async createResetToken(token: ResetToken): Promise<void> {
    this.resetTokens.set(token.tokenHash, clone(token));
  }

  async getResetToken(tokenHash: string): Promise<ResetToken | null> {
    const token = this.resetTokens.get(tokenHash);
    return token ? clone(token) : null;
  }

  async consumeResetToken(tokenHash: string, now: Date): Promise<boolean> {
    const token = this.resetTokens.get(tokenHash);
    if (!token || token.usedAt) return false;
    this.resetTokens.set(tokenHash, { ...token, usedAt: now });
    return true;
  }

  async hitRateLimit(bucket: string, windowStart: number): Promise<number> {
    const entry = this.rateLimits.get(bucket);
    if (!entry || entry.windowStart !== windowStart) {
      this.rateLimits.set(bucket, { windowStart, hits: 1 });
      return 1;
    }
    entry.hits += 1;
    return entry.hits;
  }
}
