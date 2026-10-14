import { sha256Hex } from "../../crypto/tokens";
import type { DataStore } from "../../data/store";
import { ConnectorError } from "./types";

/**
 * 25 OAuth tokens of a store connected through a partner app (Salla, Zid),
 * renewed before they expire and when the platform refuses them.
 *
 * Refresh tokens work once (Salla: using one twice may revoke the store's
 * access), so two requests must never renew with the same one:
 * - within a server, one renewal per app runs at a time and the others wait
 *   for it, and the newest tokens stay in memory;
 * - across servers, the renewal first reads the saved tokens (another server
 *   may have renewed them), then claims the refresh token in the store (an
 *   atomic counter keyed by its hash): only the first claim renews; the
 *   others wait for the new tokens to be saved and use those.
 * The new pair is saved at once, in one write (`deps.saveSecrets`).
 *
 * Token values are the platform's own strings plus `refreshToken` and
 * `tokenExpiresAt` (milliseconds since 1970, as a string).
 */

export type TokenValues = Record<string, string>;

/** The platform refused the refresh token (revoked, or already used). */
export class OAuthRefusedError extends ConnectorError {
  constructor(message: string) {
    super(message);
    this.name = "OAuthRefusedError";
  }
}

/** The store's access was revoked: the owner must connect it again. */
export class AccessRevokedError extends ConnectorError {
  constructor(platform: string) {
    super(`${platform} no longer gives access to this store. Connect it again on the Website step.`);
    this.name = "AccessRevokedError";
  }
}

/** A claim lasts this long: a server that claimed and stopped doesn't block renewals for longer. */
const CLAIM_WINDOW_MS = 2 * 60_000;
/** How long to wait for another server's renewal. */
const WAIT_STEPS = 8;
const WAIT_STEP_MS = 400;

const latest = new Map<string, TokenValues>();
const renewals = new Map<string, Promise<TokenValues>>();
/** Refresh tokens the platform refused: asked again only after the owner connects again (new tokens). */
const refused = new Set<string>();

export const expiresAt = (values: TokenValues | null | undefined): number => Number(values?.tokenExpiresAt) || 0;

export interface TokenKeeperOptions {
  /** The platform's name, in messages ("Salla"). */
  platform: string;
  appId: string;
  /** The connected store on the platform: tokens of another store are never mixed in. */
  account: string;
  store: Pick<DataStore, "hitRateLimit">;
  /** The token values the connector was made with. */
  initial: TokenValues;
  /** Asks the platform for new tokens; throws OAuthRefusedError when it refuses the refresh token. */
  refresh(refreshToken: string): Promise<TokenValues>;
  save(values: TokenValues): Promise<void>;
  /** The values saved now (another server's renewal), or null. */
  load?: () => Promise<TokenValues | null>;
  /** Renew this long before the access token expires. */
  marginMs: number;
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class TokenKeeper {
  private readonly key: string;

  constructor(private readonly options: TokenKeeperOptions) {
    this.key = `${options.platform}:${options.appId}:${options.account}`;
  }

  private now(): number {
    return (this.options.now ?? Date.now)();
  }

  /** The newer of two sets: the one that expires later. */
  private newest(a: TokenValues, b: TokenValues | null | undefined): TokenValues {
    return b && b.refreshToken && expiresAt(b) > expiresAt(a) ? b : a;
  }

  private fresh(values: TokenValues): boolean {
    return expiresAt(values) - this.options.marginMs > this.now();
  }

  /** Tokens to call the platform with: renewed first when they expire soon. */
  async current(): Promise<TokenValues> {
    const values = this.newest(this.options.initial, latest.get(this.key));
    if (!values.refreshToken) throw new AccessRevokedError(this.options.platform);
    return this.fresh(values) ? values : this.renew(values);
  }

  /** New tokens after `stale` expired or was refused. */
  renew(stale: TokenValues): Promise<TokenValues> {
    const running = renewals.get(this.key);
    if (running) return running;
    const promise = this.renewOnce(stale).finally(() => renewals.delete(this.key));
    renewals.set(this.key, promise);
    return promise;
  }

  /** Saved tokens newer than `stale` (another server renewed them), or null. */
  private async savedNewer(stale: TokenValues): Promise<TokenValues | null> {
    const saved = await this.options.load?.().catch(() => null);
    if (!saved?.refreshToken || saved.refreshToken === stale.refreshToken) return null;
    latest.set(this.key, saved);
    return saved;
  }

  private async renewOnce(stale: TokenValues): Promise<TokenValues> {
    const refreshToken = stale.refreshToken;
    if (!refreshToken) throw new AccessRevokedError(this.options.platform);
    const refusedKey = `${this.key}:${sha256Hex(refreshToken)}`;
    // This server already renewed them.
    const known = latest.get(this.key);
    if (known?.refreshToken && known.refreshToken !== stale.refreshToken && this.fresh(known)) return known;
    const saved = await this.savedNewer(stale);
    if (saved) return saved;
    if (refused.has(refusedKey)) throw new AccessRevokedError(this.options.platform);

    // One claim per refresh token across servers.
    const now = this.now();
    const bucket = `oauth-refresh:${this.options.platform.toLowerCase()}:${sha256Hex(refreshToken).slice(0, 40)}`;
    const claims = await this.options.store.hitRateLimit(bucket, now - (now % CLAIM_WINDOW_MS), new Date(now));
    if (claims > 1) {
      const wait = this.options.wait ?? sleep;
      for (let i = 0; i < WAIT_STEPS; i++) {
        await wait(WAIT_STEP_MS);
        const renewed = await this.savedNewer(stale);
        if (renewed) return renewed;
      }
      // Never use the refresh token a second time: this request fails, a later one tries again.
      throw new ConnectorError(`${this.options.platform} access is being renewed. Try again in a moment.`);
    }

    let next: TokenValues;
    try {
      next = await this.options.refresh(refreshToken);
    } catch (e) {
      if (!(e instanceof OAuthRefusedError)) throw e;
      // Another server may have used it a moment ago.
      const renewed = await this.savedNewer(stale);
      if (renewed) return renewed;
      if (refused.size > 1000) refused.clear();
      refused.add(refusedKey);
      console.error(`[hosted] app ${this.options.appId}: ${this.options.platform} refused the refresh token; the owner must connect the store again.`);
      throw new AccessRevokedError(this.options.platform);
    }
    latest.set(this.key, next);
    try {
      await this.options.save(next);
    } catch {
      // This server keeps the new tokens in memory; they're saved with the next renewal.
      console.error(`[hosted] app ${this.options.appId}: the renewed ${this.options.platform} tokens couldn't be saved.`);
    }
    return next;
  }
}

/** Forgets the tokens kept in memory (tests). */
export function clearTokenMemory(): void {
  latest.clear();
  renewals.clear();
  refused.clear();
}
