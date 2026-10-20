import { getDashT, knownTranslator } from "@/i18n/dashboard";
import { adminRoleOf } from "../admin/team";
import { authenticate } from "../auth/accounts";
import { newId, safeEqual } from "../crypto/tokens";
import type { Client, OwnerDevice, User } from "../data/types";
import { clientAccountState } from "../license/status";
import { hitRateLimit, RATE_LIMITS } from "../rate-limit";
import { signInSchema } from "../validation";
import { OwnerError, bodyObject, invalid, rateLimited, type OwnerContext, type OwnerDeps, type OwnerRequest } from "./http";
import { acceptedLang, ownerLang } from "./lang";
import { businessesOf, businessFor } from "../team/service";
import { scopedApps } from "../team/permissions";
import { accessKey, createAccessToken, newRefreshToken, readAccessToken, refreshHash } from "./tokens";

/**
 * 58 Signing in to Yallapp Business with the dashboard's account. Each
 * sign-in is a device with its own rotating refresh token (kept hashed); the
 * access token is checked against the device on every request, and against
 * the user's session version, so a sign-out or a password change stops it.
 */

/** Devices a person can have signed in at once; the one used longest ago makes room. */
export const MAX_DEVICES = 10;
/** How often a request records that the device was used. */
const SEEN_EVERY_MS = 5 * 60_000;

const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";
export const SIGN_IN_AGAIN = "Sign in again.";
const invalidToken = () => new OwnerError(401, "invalid_token", SIGN_IN_AGAIN);

export interface DeviceInput {
  name: string;
  platform: "android" | "ios";
  appVersion: string | null;
}

export function readDevice(value: unknown): DeviceInput {
  const device = bodyObject(value);
  const errors: Record<string, string> = {};
  const name = typeof device.name === "string" ? device.name.trim() : "";
  if (!name || name.length > 100) errors["device.name"] = "Enter the phone's name, up to 100 characters.";
  if (device.platform !== "android" && device.platform !== "ios") errors["device.platform"] = "Choose Android or iPhone.";
  const version = device.app_version;
  if (version !== undefined && version !== null && (typeof version !== "string" || version.length > 20)) errors["device.app_version"] = "The request isn't valid.";
  if (Object.keys(errors).length) throw invalid(errors);
  return { name, platform: device.platform as "android" | "ios", appVersion: typeof version === "string" && version.trim() ? version.trim() : null };
}

/** The tokens and the account's state, as `Session` in docs/api/owner.yaml. */
async function sessionJson(deps: Pick<OwnerDeps, "store" | "signingSecret" | "now">, client: Client, device: Pick<OwnerDevice, "id">, refresh: { token: string; expiresAt: Date }) {
  const access = createAccessToken(device.id, accessKey(deps.signingSecret), deps.now);
  const licenses = await deps.store.listLicensesByClient(client.id);
  return {
    token_type: "Bearer",
    access_token: access.token,
    access_expires_at: access.expiresAt.toISOString(),
    refresh_token: refresh.token,
    refresh_expires_at: refresh.expiresAt.toISOString(),
    device_id: device.id,
    account_state: clientAccountState(client, licenses, deps.now),
  };
}

/** `POST /auth/sign-in`: the website's limits (counted with it), its password check, then a new device. */
export async function signIn(deps: OwnerDeps, req: OwnerRequest) {
  const body = bodyObject(req.body);
  const parsed = signInSchema.safeParse({ email: body.email, password: body.password });
  if (!parsed.success) {
    throw invalid(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? "email"), issue.message])));
  }
  const device = readDevice(body.device);
  const [byIp, byEmail] = await Promise.all([
    hitRateLimit(deps.store, RATE_LIMITS.signInIp, deps.ip, deps.now),
    hitRateLimit(deps.store, RATE_LIMITS.signInEmail, parsed.data.email, deps.now),
  ]);
  if (!byIp.allowed || !byEmail.allowed) throw rateLimited(Math.max(byIp.allowed ? 0 : byIp.retryAfter, byEmail.allowed ? 0 : byEmail.retryAfter), TOO_MANY);
  const user = await authenticate(deps.store, parsed.data.email, parsed.data.password, deps.now);
  if (!user) throw new OwnerError(401, "invalid_credentials", "The email or password is incorrect.");
  // Yallapp's own team works on the website (the admin); only client accounts and 60 their teams get in.
  const businesses = (await adminRoleOf(deps.store, user)) ? [] : await businessesOf(deps.store, user);
  // Their own business first, else the first active team (`PUT /me/business` changes it).
  const client = (businesses.find((b) => b.member === null) ?? businesses.find((b) => b.client.status === "active") ?? businesses[0])?.client ?? null;
  if (!client) throw new OwnerError(403, "use_website", "Yallapp Business is for the owners of apps on Yallapp. Use yallapp.com.tr to manage Yallapp.");

  const existing = await deps.store.listOwnerDevices(user.id);
  for (const old of existing.slice(MAX_DEVICES - 1)) await deps.store.deleteOwnerDevice(user.id, old.id);
  const refresh = newRefreshToken(deps.now);
  const created: OwnerDevice = {
    id: newId(),
    userId: user.id,
    clientId: client.id,
    name: device.name,
    platform: device.platform,
    appVersion: device.appVersion,
    language: acceptedLang(req.acceptLanguage),
    refreshHash: refresh.hash,
    refreshExpiresAt: refresh.expiresAt,
    sessionVersion: user.sessionVersion,
    pushToken: null,
    pushProvider: "fcm",
    pushPreferences: null,
    createdAt: deps.now,
    lastSeenAt: deps.now,
  };
  await deps.store.createOwnerDevice(created);
  return { status: 200, body: await sessionJson(deps, client, created, refresh) };
}

/** `POST /auth/refresh`: a new pair; the refresh token sent stops working. */
export async function refresh(deps: OwnerDeps, req: OwnerRequest) {
  const limit = await hitRateLimit(deps.store, RATE_LIMITS.ownerRefreshIp, deps.ip, deps.now);
  if (!limit.allowed) throw rateLimited(limit.retryAfter);
  const sent = bodyObject(req.body).refresh_token;
  if (typeof sent !== "string" || !sent) throw invalid({ refresh_token: "The request isn't valid." });
  const hash = refreshHash(sent);
  const device = hash ? await deps.store.findOwnerDeviceByRefresh(hash) : null;
  if (!hash || !device || !safeEqual(device.refreshHash, hash)) throw invalidToken();
  const user = await deps.store.getUserById(device.userId);
  // 60 Only while they still work on the device's business (a removed member is signed out).
  const client = user ? ((await businessFor(deps.store, user, device.clientId))?.client ?? null) : null;
  if (device.refreshExpiresAt.getTime() <= deps.now.getTime() || !user || !client || user.sessionVersion !== device.sessionVersion) {
    await deps.store.deleteOwnerDevice(device.userId, device.id);
    throw invalidToken();
  }
  const next = newRefreshToken(deps.now);
  // Two renewals with the same token: one wins, the other signs in again.
  if (!(await deps.store.rotateOwnerRefresh(device.id, hash, { refreshHash: next.hash, refreshExpiresAt: next.expiresAt, lastSeenAt: deps.now }))) throw invalidToken();
  return { status: 200, body: await sessionJson(deps, client, device, next) };
}

/** The person on a request with an access token, or 401. */
export async function authenticateRequest(deps: OwnerDeps, req: OwnerRequest): Promise<OwnerContext> {
  const deviceId = readAccessToken(req.token, accessKey(deps.signingSecret), deps.now);
  const device = deviceId ? await deps.store.getOwnerDevice(deviceId) : null;
  if (!device) throw invalidToken();
  const user = await deps.store.getUserById(device.userId);
  // 60 The device's business: the person's own, or a team they're still on (removed: signed out at once).
  const business = user ? await businessFor(deps.store, user, device.clientId) : null;
  if (!user || !business || user.sessionVersion !== device.sessionVersion || device.refreshExpiresAt.getTime() <= deps.now.getTime()) {
    await deps.store.deleteOwnerDevice(device.userId, device.id);
    throw invalidToken();
  }
  const client = business.client;
  const requested = acceptedLang(req.acceptLanguage);
  if (deps.now.getTime() - device.lastSeenAt.getTime() > SEEN_EVERY_MS || (requested && requested !== device.language)) {
    await deps.store.updateOwnerDevice(device.id, { lastSeenAt: deps.now, ...(requested ? { language: requested } : {}) });
  }
  return contextFor(deps, req, user, client, device);
}

export async function contextFor(deps: OwnerDeps, req: OwnerRequest, user: User, client: Client, device: OwnerDevice): Promise<OwnerContext> {
  const [allApps, licenses, businesses] = await Promise.all([deps.store.listAppsByClient(client.id), deps.store.listLicensesByClient(client.id), businessesOf(deps.store, user)]);
  const business = businesses.find((b) => b.client.id === client.id);
  if (!business) throw invalidToken();
  const lang = ownerLang(user.language, acceptedLang(req.acceptLanguage), device.language);
  return {
    deps,
    req,
    user,
    client,
    device,
    access: business.access,
    businesses,
    // 60 A member limited to some apps works on those only (another is 404, like another client's).
    apps: scopedApps(business.access, allApps),
    licenses,
    state: clientAccountState(client, licenses, deps.now),
    lang,
    t: getDashT(lang),
    k: knownTranslator(lang),
  };
}
