import type { DataStore } from "../data/store";
import type { App, HostedUser } from "../data/types";
import { appSignIn, personClaims, yallappSignsIn } from "./app-auth";
import { parseAnyPhone } from "./phone";
import { ACCESS_TTL_SECONDS, hostedSettings } from "./service";
import { normalizeEmail } from "./sign-in-methods";

/**
 * 34 A test token for an own API app Yallapp signs people in to: an access
 * token of the store review account (the review number, else the review
 * email address), signed like the app's, for the developer to try their API
 * and for the dashboard's API check. It has no device, so it works on the
 * client's API only, and expires in 15 minutes like any access token.
 */

export const TEST_USER_NAME = "Store review";

/** The store review account, made when it doesn't exist yet (reviewers always get in, past the plan's users). */
export async function reviewUser(store: DataStore, app: App, now: Date): Promise<HostedUser | null> {
  const settings = hostedSettings(app);
  const phone = settings.reviewPhone ? parseAnyPhone(settings.reviewPhone, settings.defaultCountryCode)?.e164 ?? null : null;
  if (phone) {
    return (
      (await store.getHostedUserByPhone(app.id, phone)) ??
      (await store.createHostedUser({ appId: app.id, phone, name: TEST_USER_NAME, email: null, city: null, now })) ??
      (await store.getHostedUserByPhone(app.id, phone))
    );
  }
  const email = settings.reviewEmail ? normalizeEmail(settings.reviewEmail) : null;
  if (!email) return null;
  return (
    (await store.getHostedEmailUser(app.id, email)) ??
    (await store.createHostedUser({ appId: app.id, phone: null, name: TEST_USER_NAME, email, city: null, now })) ??
    (await store.getHostedEmailUser(app.id, email))
  );
}

/**
 * What the API check needs for an app Yallapp signs people in to: a test
 * token, when the app has a store review account. Null when the client's API
 * signs people in.
 */
export async function apiCheckSignIn(
  store: DataStore,
  app: App,
  options: { encryptionKey: Buffer; platformUrl: string; now: Date },
): Promise<{ token: string | null } | null> {
  if (!yallappSignsIn(app)) return null;
  try {
    return { token: (await issueTestToken(store, app, options))?.token ?? null };
  } catch (e) {
    console.error(`[api-check] app ${app.id}: no test token: ${e instanceof Error ? e.message : "unknown error"}`);
    return { token: null };
  }
}

/** A test token and when it expires, or null without a store review number or email address. */
export async function issueTestToken(
  store: DataStore,
  app: App,
  options: { encryptionKey: Buffer; platformUrl: string; now: Date },
): Promise<{ token: string; expiresAt: Date; user: HostedUser } | null> {
  const user = await reviewUser(store, app, options.now);
  if (!user) return null;
  const iat = Math.floor(options.now.getTime() / 1000);
  const exp = iat + ACCESS_TTL_SECONDS;
  const signer = appSignIn(store, app.id, { encryptionKey: options.encryptionKey, platformUrl: options.platformUrl, now: () => options.now });
  const token = await signer.sign({ sub: String(user.id), ...personClaims(user), iat, exp });
  return { token, expiresAt: new Date(exp * 1000), user };
}
