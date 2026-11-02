import { randomInt } from "node:crypto";
import { hmacSha256, newId, randomToken, safeEqual, sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { CourierAccount, CourierDevice, PushProvider } from "../data/types";
import { effectivePlans, planOfLicense } from "../entitlements";
import type { OtpSender } from "../hosted/otp-sender";
import { parseAnyPhone } from "../hosted/phone";
import { CODE_LENGTH, CODE_TTL_SECONDS, courierHubSession, MAX_CODE_ATTEMPTS, RESEND_SECONDS, type HostedContext } from "../hosted/service";
import { normalizeEmail } from "../hosted/sign-in-methods";
import { localizedError, requestLanguage } from "../i18n/builtin";
import { appIsActive } from "../license/status";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";
import { companyJson, companyUser, hubCompaniesOf } from "./companies";
import { courierHubSetting, isHubReview } from "./review";
import { accessKey, ACCESS_TTL_SECONDS, createAccessToken, newRefreshToken, readAccessToken, refreshHash } from "./tokens";

/**
 * 104.8.2 The Yallapp Courier API (docs/api/courier.yaml, served at
 * /api/courier/v1): one courier app for every company that picks it. A
 * person signs in with a code to their mobile number or email, sent by
 * Yallapp's own sender (Admin › Settings › Sign-in codes, never a
 * company's), sees the companies they are a courier of, and opens a session
 * at one: the company's own hosted API tokens, used with its hosted API.
 */

export const APP_NAME = "Yallapp Courier";
/** Phones a person can have signed in at once; the one used longest ago makes room. */
export const MAX_DEVICES = 10;
/** How often a request records that the device was used. */
const SEEN_EVERY_MS = 5 * 60_000;

/** The hosted API's limits on codes (lib/hosted/service.ts), for Yallapp Courier's own. */
export const COURIER_LIMITS = {
  resend: { name: "courier-otp:resend", limit: 1, windowSeconds: RESEND_SECONDS },
  contact: { name: "courier-otp:contact", limit: 5, windowSeconds: 3600 },
  ip: { name: "courier-otp:ip", limit: 30, windowSeconds: 3600 },
  verifyIp: { name: "courier-verify:ip", limit: 60, windowSeconds: 900 },
  refreshIp: { name: "courier-refresh:ip", limit: 60, windowSeconds: 600 },
  // The review number signs in again and again without a message, but its fixed code is 6 digits.
  review: { name: "courier-otp:review", limit: 30, windowSeconds: 3600 },
} satisfies Record<string, RateLimitRule>;

export interface CourierHubDeps {
  store: DataStore;
  now: Date;
  ip: string;
  /** Signs Yallapp Courier's access tokens and hashes its codes. */
  signingSecret: string;
  /** The hosted API's secret: a company session is the company's hosted API tokens. */
  hostedSecret: string;
  /** Each company's hosted API is under it (`api_base_url`). */
  platformUrl: string;
  assetUrl: (assetId: string) => string;
  /** Yallapp's own code sender; null: codes to numbers fail with provider_error. */
  sender: OtpSender | null;
  /** The "Sign-in code" email through Yallapp's own email server. Missing: codes to addresses fail. */
  sendEmailCode?: (input: { to: string; code: string; appName: string; minutes: number }) => Promise<void>;
}

export interface CourierHubRequest {
  method: string;
  path: string[];
  body: unknown;
  token: string | null;
  acceptLanguage?: string | null;
}

export interface CourierHubResult {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

const error = (status: number, code: string, message: string, extra: Record<string, unknown> = {}): CourierHubResult => ({ status, body: { code, message, ...extra } });
const ok = (body: unknown): CourierHubResult => ({ status: 200, body });
const noContent: CourierHubResult = { status: 204 };
const unauthorized = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");
const notFound = () => error(404, "not_found", "Not found.");
const badRequest = (message: string) => error(400, "invalid_request", message);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** 43 The answer's message in the app's language when Yallapp has it, as the hosted API does. */
export async function handleCourierHub(deps: CourierHubDeps, req: CourierHubRequest): Promise<CourierHubResult> {
  const result = await route(deps, req);
  if (result.status < 400 || result.body === undefined) return result;
  const answer = { ...result, body: localizedError(result.body, requestLanguage(req.acceptLanguage)) };
  const retry = (result.body as { retry_after_seconds?: number }).retry_after_seconds;
  return retry ? { ...answer, headers: { ...answer.headers, "retry-after": String(retry) } } : answer;
}

async function route(deps: CourierHubDeps, req: CourierHubRequest): Promise<CourierHubResult> {
  const route = `${req.method} /${req.path.join("/")}`;
  switch (route) {
    case "POST /auth/otp/request":
      return requestCode(deps, record(req.body));
    case "POST /auth/otp/verify":
      return verifyCode(deps, record(req.body));
    case "POST /auth/refresh":
      return refresh(deps, record(req.body));
  }
  const signedIn = await authenticate(deps, req.token);
  const company = req.path.length === 3 && req.path[0] === "companies" && req.path[2] === "session" && req.method === "POST";
  if (!company && !["POST /auth/sign-out", "PUT /me/push-token", "GET /companies"].includes(route)) return notFound();
  if (!signedIn) return unauthorized();
  if (company) return openCompany(deps, signedIn, req.path[1]!, record(req.body));
  switch (route) {
    case "POST /auth/sign-out":
      // The company sessions this phone opened end with it.
      await deps.store.deleteCourierDevice(signedIn.device.id);
      return noContent;
    case "PUT /me/push-token":
      return setPushToken(deps, signedIn.device, record(req.body));
    default: {
      const companies = await hubCompaniesOf(deps.store, signedIn.account, deps.now);
      return ok({ items: await Promise.all(companies.map((c) => companyJson(deps.store, c, deps))) });
    }
  }
}

// Sign-in

async function limited(deps: CourierHubDeps, rule: RateLimitRule, subject: string): Promise<CourierHubResult | null> {
  const result = await hitRateLimit(deps.store, rule, subject, deps.now);
  if (result.allowed) return null;
  return error(429, "rate_limited", "Please wait a moment before trying again.", { retry_after_seconds: result.retryAfter });
}

/** The number (E.164) or address the code goes to. */
function contactOf(body: Record<string, unknown>): { phone: string | null; email: string | null } | null {
  if (typeof body.phone === "string") {
    const phone = parseAnyPhone(body.phone, "");
    return phone ? { phone: phone.e164, email: null } : null;
  }
  const email = normalizeEmail(body.email);
  return email ? { phone: null, email } : null;
}

function codeHash(deps: CourierHubDeps, requestId: string, code: string): string {
  return hmacSha256(deps.signingSecret, `courier-code:${requestId}:${code}`);
}

/** `POST /auth/otp/request`: a code to the number or address, through Yallapp's own sender; the review account's is its fixed one, sent nowhere. */
async function requestCode(deps: CourierHubDeps, body: Record<string, unknown>): Promise<CourierHubResult> {
  const contact = contactOf(body);
  if (!contact) return badRequest(typeof body.phone === "string" || body.email === undefined ? "Please enter a valid mobile number." : "Please enter a valid email address.");
  const review = isHubReview(await courierHubSetting(deps.store), contact);
  const subject = contact.phone ?? contact.email!;
  const wait = review
    ? await limited(deps, COURIER_LIMITS.review, "review")
    : ((await limited(deps, COURIER_LIMITS.resend, subject)) ?? (await limited(deps, COURIER_LIMITS.contact, subject)) ?? (await limited(deps, COURIER_LIMITS.ip, deps.ip)));
  if (wait) return wait;
  const requestId = randomToken(24);
  const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
  await deps.store.createCourierChallenge({
    tokenHash: sha256Hex(requestId),
    ...contact,
    codeHash: review ? null : codeHash(deps, requestId, code),
    attempts: 0,
    review,
    expiresAt: new Date(deps.now.getTime() + CODE_TTL_SECONDS * 1000),
    createdAt: deps.now,
  });
  if (!review) {
    try {
      if (contact.phone) {
        if (!deps.sender) throw new Error("No code sender is configured.");
        await deps.sender.send({ phone: contact.phone, code, appName: APP_NAME, expiresInSeconds: CODE_TTL_SECONDS });
      } else {
        if (!deps.sendEmailCode) throw new Error("No email sender.");
        await deps.sendEmailCode({ to: contact.email!, code, appName: APP_NAME, minutes: Math.round(CODE_TTL_SECONDS / 60) });
      }
    } catch (e) {
      // Why, for the logs: the provider's answer, never the code or the address.
      console.error(`[courier-hub] sign-in code not sent: ${(e instanceof Error ? e.message : String(e)).slice(0, 300)}`);
      await deps.store.deleteCourierChallenge(sha256Hex(requestId));
      return error(502, "provider_error", "We couldn't send the code. Please try again.");
    }
  }
  if (Math.random() < 0.05) await deps.store.purgeCourierChallenges(deps.now);
  return ok({ request_id: requestId, expires_in: CODE_TTL_SECONDS });
}

interface DeviceFields {
  id: string;
  platform: "android" | "ios";
  name: string;
  appVersion: string;
}

function deviceInput(value: unknown): DeviceFields | null {
  const device = record(value);
  const id = text(device.id, 64);
  const platform = device.platform;
  if (!id || (platform !== "android" && platform !== "ios")) return null;
  return { id, platform, name: text(device.name, 100), appVersion: text(device.app_version, 20) };
}

/** `Session` in docs/api/courier.yaml. */
function sessionJson(deps: CourierHubDeps, account: CourierAccount, device: Pick<CourierDevice, "id">, refreshToken: string) {
  return {
    access_token: createAccessToken(device.id, accessKey(deps.signingSecret), deps.now).token,
    refresh_token: refreshToken,
    expires_in: ACCESS_TTL_SECONDS,
    account: { id: account.id, phone: account.phone, email: account.email },
  };
}

/** `POST /auth/otp/verify`: the account of that number or address (made the first time), signed in on a new device. */
async function verifyCode(deps: CourierHubDeps, body: Record<string, unknown>): Promise<CourierHubResult> {
  const wait = await limited(deps, COURIER_LIMITS.verifyIp, deps.ip);
  if (wait) return wait;
  const input = deviceInput(body.device);
  if (!input) return badRequest("Device details are missing.");
  const requestId = text(body.request_id, 100);
  const hash = sha256Hex(requestId);
  const challenge = requestId ? await deps.store.getCourierChallenge(hash) : null;
  if (!challenge || challenge.expiresAt <= deps.now) return error(400, "invalid_code", "This code has expired. Please request a new one.");
  if ((await deps.store.addCourierChallengeAttempt(hash)) > MAX_CODE_ATTEMPTS) {
    await deps.store.deleteCourierChallenge(hash);
    return error(400, "invalid_code", "Too many wrong codes. Please request a new one.");
  }
  const code = text(body.code, 12);
  const setting = challenge.review ? await courierHubSetting(deps.store) : null;
  const valid = setting
    ? Boolean(setting.reviewCode) && isHubReview(setting, challenge) && safeEqual(code, setting.reviewCode!)
    : challenge.codeHash !== null && safeEqual(codeHash(deps, requestId, code), challenge.codeHash);
  if (!valid) return error(400, "invalid_code", "That code is not correct.");
  await deps.store.deleteCourierChallenge(hash);

  const contact = { phone: challenge.phone, email: challenge.phone ? null : challenge.email };
  const account =
    (await deps.store.findCourierAccount(contact)) ?? (await deps.store.createCourierAccount({ id: newId(), ...contact, createdAt: deps.now, lastSignInAt: deps.now }));
  await deps.store.updateCourierAccount(account.id, { lastSignInAt: deps.now });
  // The same install signing in again replaces its old sign-in; past the limit, the one used longest ago goes.
  const devices = await deps.store.listCourierDevices(account.id);
  for (const old of devices.filter((d) => d.deviceId === input.id)) await deps.store.deleteCourierDevice(old.id);
  for (const old of devices.filter((d) => d.deviceId !== input.id).slice(MAX_DEVICES - 1)) await deps.store.deleteCourierDevice(old.id);
  const refresh = newRefreshToken(deps.now);
  const device: CourierDevice = {
    id: newId(),
    accountId: account.id,
    deviceId: input.id,
    platform: input.platform,
    name: input.name,
    appVersion: input.appVersion,
    refreshHash: refresh.hash,
    refreshExpiresAt: refresh.expiresAt,
    pushToken: null,
    pushProvider: "fcm",
    createdAt: deps.now,
    lastSeenAt: deps.now,
  };
  await deps.store.createCourierDevice(device);
  return ok(sessionJson(deps, account, device, refresh.token));
}

/** `POST /auth/refresh`: a new pair; the refresh token sent stops working. */
async function refresh(deps: CourierHubDeps, body: Record<string, unknown>): Promise<CourierHubResult> {
  const wait = await limited(deps, COURIER_LIMITS.refreshIp, deps.ip);
  if (wait) return wait;
  const hash = refreshHash(body.refresh_token);
  const device = hash ? await deps.store.findCourierDeviceByRefresh(hash) : null;
  if (!hash || !device || !safeEqual(device.refreshHash, hash)) return unauthorized();
  const account = await deps.store.getCourierAccount(device.accountId);
  if (!account || device.refreshExpiresAt.getTime() <= deps.now.getTime()) {
    await deps.store.deleteCourierDevice(device.id);
    return unauthorized();
  }
  const next = newRefreshToken(deps.now);
  // Two renewals with the same token: one wins, the other signs in again.
  if (!(await deps.store.rotateCourierRefresh(device.id, hash, { refreshHash: next.hash, refreshExpiresAt: next.expiresAt, lastSeenAt: deps.now }))) return unauthorized();
  return ok(sessionJson(deps, account, device, next.token));
}

interface SignedIn {
  account: CourierAccount;
  device: CourierDevice;
}

async function authenticate(deps: CourierHubDeps, token: string | null): Promise<SignedIn | null> {
  const deviceId = readAccessToken(token, accessKey(deps.signingSecret), deps.now);
  const device = deviceId ? await deps.store.getCourierDevice(deviceId) : null;
  if (!device) return null;
  const account = await deps.store.getCourierAccount(device.accountId);
  if (!account || device.refreshExpiresAt.getTime() <= deps.now.getTime()) {
    await deps.store.deleteCourierDevice(device.id);
    return null;
  }
  if (deps.now.getTime() - device.lastSeenAt.getTime() > SEEN_EVERY_MS) await deps.store.updateCourierDevice(device.id, { lastSeenAt: deps.now });
  return { account, device };
}

// The phone

/** `PUT /me/push-token`: Yallapp Courier's push token, copied to every company session this phone opened. */
async function setPushToken(deps: CourierHubDeps, device: CourierDevice, body: Record<string, unknown>): Promise<CourierHubResult> {
  const token = body.token === null ? null : text(body.token, 512);
  if (token === "") return badRequest("The push token is missing.");
  const provider = body.provider ?? "fcm";
  if (provider !== "fcm" && provider !== "hms") return badRequest("The push provider must be fcm or hms.");
  // A token moves with the install: forget it on any other phone first.
  if (token) await deps.store.clearCourierPushToken(token, device.id);
  await deps.store.updateCourierDevice(device.id, { pushToken: token, pushProvider: provider as PushProvider });
  for (const hosted of await deps.store.listHostedDevicesOfCourierDevice(device.id)) {
    if (token) await deps.store.clearHostedPushToken(hosted.appId, token);
    await deps.store.updateHostedDevice(hosted.appId, hosted.id, { pushToken: token, pushProvider: provider as PushProvider });
  }
  return noContent;
}

// A company

/**
 * `POST /companies/{app_id}/session`: the company's hosted session for the
 * person's account there (found by their number or email, made when they
 * have none), its device marked as Yallapp Courier's, so the company's
 * pushes to it go through Yallapp Courier's Firebase project.
 */
async function openCompany(deps: CourierHubDeps, signedIn: SignedIn, appId: string, body: Record<string, unknown>): Promise<CourierHubResult> {
  const company = (await hubCompaniesOf(deps.store, signedIn.account, deps.now)).find((c) => c.app.id === appId);
  if (!company) return error(404, "not_found", "You aren't a courier of this company.");
  if (!company.courier.active) return error(403, "not_courier", "This company paused your account. Please contact the company.");
  const { app, courier } = company;
  if (!deviceInput(body.device)) return error(400, "invalid_device", "Device details are missing.");
  const [client, license] = await Promise.all([deps.store.getClientById(app.clientId), deps.store.getLicenseForApp(app.clientId, app.id)]);
  const user =
    company.user ??
    (await companyUser(deps.store, app, { phone: signedIn.account.phone, email: signedIn.account.phone ? null : signedIn.account.email }, courier.name, deps.now));
  if (!user) return error(409, "account_exists", "Please try again.");
  const ctx: HostedContext = {
    store: deps.store,
    app,
    active: appIsActive(license, client, deps.now),
    suspended: client?.status === "suspended",
    plan: planOfLicense(await effectivePlans(deps.store), license, deps.now),
    now: deps.now,
    ip: deps.ip,
    secret: deps.hostedSecret,
    sender: null,
    push: false,
    assetUrl: deps.assetUrl,
    platformUrl: deps.platformUrl,
  };
  const result = await courierHubSession(ctx, user, record(body.device), { id: signedIn.device.id, pushToken: signedIn.device.pushToken, pushProvider: signedIn.device.pushProvider });
  // 104.8.3 The Couriers page says when they last signed in to Yallapp Courier.
  if (result.status === 200) await deps.store.updateCourier(app.id, courier.id, { hubSignedInAt: deps.now }, deps.now);
  return result;
}
