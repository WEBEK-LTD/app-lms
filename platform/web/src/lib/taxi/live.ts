import { createSign } from "node:crypto";
import type { App, Ride, TaxiSettings } from "../data/types";
import { googleAccessToken, type ServiceAccount } from "../hosted/push";

/**
 * 105.9 The live positions of a taxi app, in the company's own Firebase
 * Realtime Database (`TaxiSettings.databaseUrl`), reached with the app's
 * Firebase service account (the one its pushes use, so the database must be
 * in the same Firebase project). The app signs in to Firebase with a custom
 * token made here, whose claims the database rules (`liveRules`) check:
 * drivers write their own position, riders read the free taxis and their
 * own driver, and only Yallapp writes rides and offers (the service account
 * isn't bound by the rules). Everything is under `yallapp/<app_id>`, so the
 * company's other data in the database is left alone.
 */

type Fetch = typeof fetch;

const DATABASE_SCOPE = "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email";
const TOKEN_AUDIENCE = "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";
/** Custom tokens last an hour at most. */
export const LIVE_TOKEN_SECONDS = 3600;
/** A database call gives up after this long: positions are best effort. */
const CALL_MS = 4000;

export const liveRoot = (app: Pick<App, "id">) => `yallapp/${app.id}`;

/** A driver's key in the database (and in `GET /taxi/nearby`). */
export const driverKey = (courierId: number) => `d${courierId}`;

export interface LiveClaims {
  app: string;
  role: "rider" | "driver";
  driver_key?: string;
  /** The ride that isn't over, as a string (database keys are). */
  ride?: string;
  /** The rider's driver's key. */
  follow?: string;
}

/** A Firebase custom token for the person, signed with the service account. */
export function customToken(account: ServiceAccount, uid: string, claims: LiveClaims, now: Date): { token: string; expiresAt: Date } {
  const iat = Math.floor(now.getTime() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({ iss: account.client_email, sub: account.client_email, aud: TOKEN_AUDIENCE, iat, exp: iat + LIVE_TOKEN_SECONDS, uid, claims }),
  ).toString("base64url");
  const signature = createSign("RSA-SHA256").update(`${header}.${body}`).sign(account.private_key, "base64url");
  return { token: `${header}.${body}.${signature}`, expiresAt: new Date((iat + LIVE_TOKEN_SECONDS) * 1000) };
}

/** Why a database call failed, in the company's words. */
export class LiveError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
  }
}

export interface LiveDatabase {
  put(path: string, value: unknown): Promise<void>;
  patch(path: string, value: Record<string, unknown>): Promise<void>;
  remove(path: string): Promise<void>;
  get<T = unknown>(path: string): Promise<T | null>;
}

/** The app's database under its root, or null when the company has none (or no service account). */
export function liveDatabase(
  app: Pick<App, "id">,
  settings: Pick<TaxiSettings, "databaseUrl">,
  account: ServiceAccount | null,
  options: { fetcher?: Fetch; now?: () => Date } = {},
): LiveDatabase | null {
  if (!settings.databaseUrl || !account) return null;
  const fetcher = options.fetcher ?? fetch;
  const base = `${settings.databaseUrl}/${liveRoot(app)}`;
  const call = async (method: string, path: string, body?: unknown): Promise<unknown> => {
    const token = await googleAccessToken(account, DATABASE_SCOPE, { fetcher, now: options.now?.() });
    let response: Response;
    try {
      response = await fetcher(`${base}/${path}.json`, {
        method,
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.timeout(CALL_MS),
      });
    } catch {
      throw new LiveError("The database didn't answer. Check its address.", null);
    }
    const text = await response.text().catch(() => "");
    if (!response.ok) throw new LiveError(problemOf(response.status, text), response.status);
    return text ? (JSON.parse(text) as unknown) : null;
  };
  return {
    put: async (path, value) => void (await call("PUT", path, value)),
    patch: async (path, value) => void (await call("PATCH", path, value)),
    remove: async (path) => void (await call("DELETE", path)),
    get: async <T>(path: string) => (await call("GET", path)) as T | null,
  };
}

function problemOf(status: number, text: string): string {
  if (status === 401 || status === 403) return "The app's Firebase service account can't use this database. Is the database in the same Firebase project as the app?";
  if (status === 404) return "There's no database at this address. Copy it from Firebase › Realtime Database.";
  if (status === 423) return "This database is locked. Check it in the Firebase console.";
  const said = /"error"\s*:\s*"([^"]{1,200})"/.exec(text)?.[1];
  return said ? `The database answered: ${said}` : `The database answered with HTTP ${status}.`;
}

/** The Maps & live page's test: a value written, read back and removed. Throws `LiveError` with why it failed. */
export async function checkLiveDatabase(database: LiveDatabase, now: Date): Promise<void> {
  const at = now.getTime();
  await database.put("check", { at });
  const back = await database.get<{ at?: number }>("check");
  if (back?.at !== at) throw new LiveError("The database didn't keep what was written. Try again.", null);
  await database.remove("check");
}

/** What a ride's own node says: its stage and its driver. */
export function rideNode(ride: Pick<Ride, "status" | "driverId">, now: Date) {
  return { status: ride.status, driver_key: ride.driverId !== null ? driverKey(ride.driverId) : null, at: now.getTime() };
}

/**
 * The database rules the company pastes in Firebase › Realtime Database ›
 * Rules (merged with its own when it has some): what the app's tokens may
 * read and write under `yallapp`.
 */
export const LIVE_RULES = JSON.stringify(
  {
    rules: {
      yallapp: {
        $app: {
          cells: {
            ".read": "auth != null && auth.token.app === $app",
            $cell: {
              $driver: {
                ".write": "auth != null && auth.token.app === $app && auth.token.role === 'driver' && auth.token.driver_key === $driver",
                ".validate": "!newData.exists() || newData.hasChildren(['lat', 'lng', 'at'])",
              },
            },
          },
          drivers: {
            $driver: {
              ".read": "auth != null && auth.token.app === $app && (auth.token.driver_key === $driver || auth.token.follow === $driver)",
              ".write": "auth != null && auth.token.app === $app && auth.token.role === 'driver' && auth.token.driver_key === $driver",
              ".validate": "!newData.exists() || newData.hasChildren(['lat', 'lng', 'at'])",
            },
          },
          rides: {
            $ride: {
              ".read": "auth != null && auth.token.app === $app && auth.token.ride === $ride",
            },
          },
          offers: {
            $driver: {
              ".read": "auth != null && auth.token.app === $app && auth.token.driver_key === $driver",
            },
          },
        },
      },
    },
  },
  null,
  2,
);
