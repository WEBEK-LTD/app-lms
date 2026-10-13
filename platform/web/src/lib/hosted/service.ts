import { randomInt } from "node:crypto";
import { hmacSha256, newId, randomToken, safeEqual, sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import {
  DEFAULT_HOSTED_SETTINGS,
  type App,
  type HostedDevice,
  type HostedNotification,
  type HostedSettings,
  type HostedUser,
} from "../data/types";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";
import { ConnectorError, type Connector } from "./connectors/types";
import { decodeJwt, encodeJwt } from "./jwt";
import type { OtpSender } from "./otp-sender";
import { parseAnyPhone, parsePhone, type Phone } from "./phone";

/**
 * The hosted API: the app contract's configuration, sign-in, account,
 * devices, push token and notifications endpoints (docs/api/openapi.yaml),
 * for apps whose backend is "hosted". Same behaviour as the plugin's.
 */

export const ACCESS_TTL_SECONDS = 900;
export const REFRESH_TTL_DAYS = 30;
export const CODE_LENGTH = 6;
export const CODE_TTL_SECONDS = 300;
export const RESEND_SECONDS = 60;
export const SIGNUP_TTL_SECONDS = 900;
export const MAX_CODE_ATTEMPTS = 5;
export const NOTIFICATION_DAYS = 90;

export const HOSTED_LIMITS = {
  resend: { name: "hosted-otp:resend", limit: 1, windowSeconds: RESEND_SECONDS },
  phone: { name: "hosted-otp:phone", limit: 5, windowSeconds: 3600 },
  ip: { name: "hosted-otp:ip", limit: 30, windowSeconds: 3600 },
  verifyIp: { name: "hosted-verify:ip", limit: 60, windowSeconds: 900 },
} satisfies Record<string, RateLimitRule>;

export interface HostedResult {
  status: number;
  body?: unknown;
}

export interface HostedContext {
  store: DataStore;
  app: App;
  /** Whether the client's account is active; requests fail with license_inactive otherwise. */
  active: boolean;
  now: Date;
  ip: string;
  /** Signs access tokens and hashes codes. */
  secret: string;
  sender: OtpSender | null;
  /** Whether push can be sent (a Firebase service account is saved). */
  push: boolean;
  /** Public URL of an uploaded asset. */
  assetUrl: (assetId: string) => string;
  /** Used when the app has no website of its own. */
  platformUrl: string;
  /** Serves the content endpoints (Shopify for Store apps); null until one is connected. */
  connector?: Connector | null;
}

export interface HostedRequest {
  method: string;
  /** Path segments after the app ID, e.g. ["auth", "otp", "request"]. */
  path: string[];
  query: URLSearchParams;
  body: unknown;
  /** The bearer token, if any. */
  token: string | null;
}

interface Session {
  user: HostedUser;
  device: HostedDevice;
}

const error = (status: number, code: string, message: string, extra: Record<string, unknown> = {}): HostedResult => ({
  status,
  body: { code, message, ...extra },
});
const ok = (body: unknown, status = 200): HostedResult => ({ status, body });
const noContent: HostedResult = { status: 204 };

const unauthorized = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");
const notFound = () => error(404, "not_found", "This isn't available in this app.");
const badRequest = (message: string) => error(400, "invalid_request", message);

export function hostedSettings(app: App): HostedSettings {
  return { ...DEFAULT_HOSTED_SETTINGS, ...(app.hostedSettings ?? {}) };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handleHosted(ctx: HostedContext, req: HostedRequest): Promise<HostedResult> {
  if (ctx.app.backend !== "hosted") return notFound();
  if (!ctx.active) {
    return error(503, "license_inactive", "This app is not available right now. Please try again later.");
  }
  const route = `${req.method} /${req.path.join("/")}`;
  switch (route) {
    case "GET /config":
      return config(ctx, req);
    case "POST /auth/otp/request":
      return requestCode(ctx, record(req.body));
    case "POST /auth/otp/verify":
      return verifyCode(ctx, record(req.body));
    case "POST /auth/register":
      return register(ctx, record(req.body));
    case "POST /auth/refresh":
      return refresh(ctx, record(req.body));
  }

  const session = await authenticate(ctx, req.token);
  if (req.path[0] === "me" || route === "POST /auth/logout") {
    if (!session) return unauthorized();
    if (req.path[1] === "devices" && req.path.length === 3 && req.method === "DELETE") {
      return removeDevice(ctx, session, req.path[2]!);
    }
    switch (route) {
      case "POST /auth/logout":
        await ctx.store.deleteHostedDevice(ctx.app.id, session.device.id);
        return noContent;
      case "GET /me":
        return ok(userJson(session.user));
      case "PATCH /me":
        return updateMe(ctx, session, record(req.body));
      case "DELETE /me":
        await ctx.store.deleteHostedUser(ctx.app.id, session.user.id);
        return noContent;
      case "GET /me/devices":
        return listDevices(ctx, session);
      case "PUT /me/push-token":
        return setPushToken(ctx, session, record(req.body));
      case "GET /me/notifications":
        return listNotifications(ctx, session, req.query);
      case "POST /me/notifications/read":
        await ctx.store.updateHostedUser(ctx.app.id, session.user.id, { notificationsReadAt: ctx.now }, ctx.now);
        return noContent;
    }
  }
  if (ctx.connector) {
    const result = await ctx.connector.handle({
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      user: session?.user ?? null,
      now: ctx.now,
    });
    if (result) return result;
  }
  return notFound();
}

// Configuration

async function config(ctx: HostedContext, req: HostedRequest): Promise<HostedResult> {
  const platform = req.query.get("platform");
  if (platform !== "android" && platform !== "ios") return badRequest("Unknown platform.");
  if (!req.query.get("app_version")) return badRequest("The app version is missing.");
  const { app } = ctx;
  const settings = hostedSettings(app);
  let extra: Awaited<ReturnType<Connector["config"]>> = {};
  try {
    extra = ctx.connector ? await ctx.connector.config() : {};
  } catch (e) {
    if (!(e instanceof ConnectorError)) throw e;
    return error(503, "shop_unavailable", "The shop can't be reached right now. Please try again in a moment.");
  }
  return ok({
    site: {
      name: app.appName ?? "App",
      url: app.siteUrl ?? ctx.platformUrl,
      terms_url: settings.termsUrl,
      privacy_url: app.privacyUrl,
      support_whatsapp: settings.supportWhatsapp,
    },
    branding: {
      logo_url: app.logoAssetId ? ctx.assetUrl(app.logoAssetId) : null,
      primary_color: app.primaryColor,
    },
    features: {
      lms: null,
      lms_version: "",
      pro: false,
      certificates: false,
      quizzes: false,
      wishlist: false,
      reviews: false,
      qna: false,
      push: ctx.push,
      orders: false,
      ...extra.features,
    },
    auth: {
      signup_allowed: settings.signupAllowed,
      signup_fields: signupFields(settings),
      default_country_code: settings.defaultCountryCode,
    },
    // Paid courses never show "Enroll now" on iOS.
    purchases: { ...(extra.purchases ?? { enroll_button: false, free_enrollment: false }), ...(platform === "ios" ? { enroll_button: false } : {}) },
    content: { block_screen_capture: false, watermark: "off", embed_fullscreen_button: true, embed_height: "auto" },
    app: { update_required: false, maintenance: false, maintenance_message: null },
    ...(extra.store ? { store: extra.store } : {}),
    ...(extra.bookings ? { bookings: extra.bookings } : {}),
  });
}

function signupFields(settings: HostedSettings): ("name" | "email" | "city")[] {
  return ["name", ...settings.signupFields.filter((f) => f === "email" || f === "city")];
}

// Sign-in

async function limited(ctx: HostedContext, rule: RateLimitRule, subject: string): Promise<HostedResult | null> {
  const result = await hitRateLimit(ctx.store, rule, `${ctx.app.id}:${subject}`, ctx.now);
  if (result.allowed) return null;
  return error(429, "rate_limited", "Please wait a moment before trying again.", { retry_after_seconds: result.retryAfter });
}

function isReviewPhone(settings: HostedSettings, phone: Phone): boolean {
  if (!settings.reviewPhone || !settings.reviewCode) return false;
  return parseAnyPhone(settings.reviewPhone, settings.defaultCountryCode)?.e164 === phone.e164;
}

function codeHash(ctx: HostedContext, requestId: string, code: string): string {
  return hmacSha256(ctx.secret, `hosted-code:${ctx.app.id}:${requestId}:${code}`);
}

async function requestCode(ctx: HostedContext, body: Record<string, unknown>): Promise<HostedResult> {
  const phone = parsePhone(body.country_code, body.phone);
  if (!phone) return error(400, "invalid_phone", "Please enter a valid mobile number.");
  const settings = hostedSettings(ctx.app);
  const review = isReviewPhone(settings, phone);
  const wait =
    (await limited(ctx, HOSTED_LIMITS.resend, phone.e164)) ??
    (await limited(ctx, HOSTED_LIMITS.phone, phone.e164)) ??
    (await limited(ctx, HOSTED_LIMITS.ip, ctx.ip));
  if (wait && !review) return wait;

  const requestId = randomToken(24);
  const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
  await ctx.store.createHostedChallenge({
    tokenHash: sha256Hex(requestId),
    appId: ctx.app.id,
    kind: "otp",
    phone: phone.e164,
    codeHash: review ? null : codeHash(ctx, requestId, code),
    attempts: 0,
    review,
    expiresAt: new Date(ctx.now.getTime() + CODE_TTL_SECONDS * 1000),
    createdAt: ctx.now,
  });
  if (!review) {
    try {
      if (!ctx.sender) throw new Error("No code sender is configured.");
      await ctx.sender.send({
        phone: phone.e164,
        code,
        appName: ctx.app.appName ?? "Yallapp",
        expiresInSeconds: CODE_TTL_SECONDS,
      });
    } catch {
      await ctx.store.deleteHostedChallenge(sha256Hex(requestId));
      return error(502, "provider_error", "We couldn't send the code. Please try again.");
    }
  }
  if (Math.random() < 0.05) await ctx.store.purgeHostedExpired(ctx.now);
  return ok({
    request_id: requestId,
    code_length: CODE_LENGTH,
    resend_after_seconds: RESEND_SECONDS,
    expires_in_seconds: CODE_TTL_SECONDS,
  });
}

async function verifyCode(ctx: HostedContext, body: Record<string, unknown>): Promise<HostedResult> {
  const wait = await limited(ctx, HOSTED_LIMITS.verifyIp, ctx.ip);
  if (wait) return wait;
  const requestId = text(body.request_id, 100);
  const hash = sha256Hex(requestId);
  const challenge = requestId ? await ctx.store.getHostedChallenge(hash) : null;
  if (!challenge || challenge.appId !== ctx.app.id || challenge.kind !== "otp" || challenge.expiresAt <= ctx.now) {
    return error(400, "code_expired", "This code has expired. Please request a new one.");
  }
  const attempts = await ctx.store.addHostedChallengeAttempt(hash);
  if (attempts > MAX_CODE_ATTEMPTS) {
    await ctx.store.deleteHostedChallenge(hash);
    return error(400, "code_expired", "Too many wrong codes. Please request a new one.");
  }
  const code = text(body.code, 12);
  const settings = hostedSettings(ctx.app);
  const valid = challenge.review
    ? Boolean(settings.reviewCode) && safeEqual(code, settings.reviewCode!)
    : challenge.codeHash !== null && safeEqual(codeHash(ctx, requestId, code), challenge.codeHash);
  if (!valid) return error(400, "invalid_code", "That code is not correct.");
  await ctx.store.deleteHostedChallenge(hash);

  const user = await ctx.store.getHostedUserByPhone(ctx.app.id, challenge.phone);
  if (user) return session(ctx, user, record(body.device));
  if (!settings.signupAllowed) return error(403, "signup_disabled", "There is no account with this number.");
  const signupToken = randomToken(24);
  await ctx.store.createHostedChallenge({
    tokenHash: sha256Hex(signupToken),
    appId: ctx.app.id,
    kind: "signup",
    phone: challenge.phone,
    codeHash: null,
    attempts: 0,
    review: false,
    expiresAt: new Date(ctx.now.getTime() + SIGNUP_TTL_SECONDS * 1000),
    createdAt: ctx.now,
  });
  return ok({ signup_required: true, signup_token: signupToken, fields: signupFields(settings) });
}

async function register(ctx: HostedContext, body: Record<string, unknown>): Promise<HostedResult> {
  const hash = sha256Hex(text(body.signup_token, 100));
  const challenge = await ctx.store.getHostedChallenge(hash);
  if (!challenge || challenge.appId !== ctx.app.id || challenge.kind !== "signup" || challenge.expiresAt <= ctx.now) {
    return error(400, "code_expired", "Your verification has expired. Please start again.");
  }
  const settings = hostedSettings(ctx.app);
  const fields = signupFields(settings);
  const name = text(body.name, 120);
  const email = text(body.email, 191);
  const city = text(body.city, 120);
  if (!name) return badRequest("Please enter your name.");
  if ((fields.includes("email") || email) && !EMAIL.test(email)) return badRequest("Please enter a valid email address.");
  if (fields.includes("city") && !city) return badRequest("Please enter your city.");
  const device = deviceInput(body.device);
  if (!device) return error(400, "invalid_device", "Device details are missing.");

  const user = await ctx.store.createHostedUser({
    appId: ctx.app.id,
    phone: challenge.phone,
    name,
    email: email || null,
    city: city || null,
    now: ctx.now,
  });
  if (!user) return error(409, "account_exists", "An account with this number already exists. Please sign in.");
  await ctx.store.deleteHostedChallenge(hash);
  const result = await session(ctx, user, record(body.device));
  return result.status === 200 ? { ...result, status: 201 } : result;
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

/** Signs a customer in on a device: registers it within the device limit and issues tokens. */
async function session(ctx: HostedContext, user: HostedUser, rawDevice: Record<string, unknown>): Promise<HostedResult> {
  const input = deviceInput(rawDevice);
  if (!input) return error(400, "invalid_device", "Device details are missing.");
  let device = await ctx.store.findHostedDevice(ctx.app.id, user.id, input.id);
  if (device) {
    await ctx.store.updateHostedDevice(ctx.app.id, device.id, {
      platform: input.platform,
      name: input.name,
      appVersion: input.appVersion,
      lastSeenAt: ctx.now,
    });
  } else {
    const limit = hostedSettings(ctx.app).deviceLimit;
    if (limit > 0 && (await ctx.store.listHostedDevices(ctx.app.id, user.id)).length >= limit) {
      return error(
        403,
        "device_limit_reached",
        "This account is already signed in on the maximum number of devices. Sign out on another device or contact support.",
      );
    }
    device = {
      id: newId(),
      appId: ctx.app.id,
      userId: user.id,
      deviceId: input.id,
      platform: input.platform,
      name: input.name,
      appVersion: input.appVersion,
      pushToken: null,
      pushPreferences: null,
      createdAt: ctx.now,
      lastSeenAt: ctx.now,
    };
    await ctx.store.createHostedDevice(device);
  }
  return ok({ ...(await issueTokens(ctx, user.id, device.id)), user: userJson(user) });
}

async function issueTokens(ctx: HostedContext, userId: number, deviceRowId: string) {
  const nowSeconds = Math.floor(ctx.now.getTime() / 1000);
  const refreshToken = randomToken(48);
  await ctx.store.createHostedRefreshToken({
    tokenHash: sha256Hex(refreshToken),
    appId: ctx.app.id,
    userId,
    deviceRowId,
    expiresAt: new Date(ctx.now.getTime() + REFRESH_TTL_DAYS * 86_400_000),
    createdAt: ctx.now,
  });
  return {
    access_token: encodeJwt(
      { aud: ctx.app.id, sub: userId, did: deviceRowId, iat: nowSeconds, exp: nowSeconds + ACCESS_TTL_SECONDS },
      ctx.secret,
    ),
    refresh_token: refreshToken,
    expires_in: ACCESS_TTL_SECONDS,
  };
}

async function refresh(ctx: HostedContext, body: Record<string, unknown>): Promise<HostedResult> {
  const value = text(body.refresh_token, 200);
  const token = value ? await ctx.store.takeHostedRefreshToken(sha256Hex(value)) : null;
  if (!token || token.appId !== ctx.app.id || token.expiresAt <= ctx.now) return unauthorized();
  const device = await ctx.store.getHostedDevice(ctx.app.id, token.deviceRowId);
  if (!device || device.userId !== token.userId) return unauthorized();
  await ctx.store.updateHostedDevice(ctx.app.id, device.id, { lastSeenAt: ctx.now });
  return ok(await issueTokens(ctx, token.userId, device.id));
}

async function authenticate(ctx: HostedContext, token: string | null): Promise<Session | null> {
  if (!token) return null;
  const claims = decodeJwt(token, ctx.secret, ctx.app.id, Math.floor(ctx.now.getTime() / 1000));
  if (!claims) return null;
  const device = await ctx.store.getHostedDevice(ctx.app.id, claims.did);
  if (!device || device.userId !== claims.sub) return null;
  const user = await ctx.store.getHostedUser(ctx.app.id, claims.sub);
  return user ? { user, device } : null;
}

// Account

export function userJson(user: HostedUser) {
  return { id: user.id, name: user.name, phone: user.phone, email: user.email, city: user.city, avatar_url: null };
}

async function updateMe(ctx: HostedContext, s: Session, body: Record<string, unknown>): Promise<HostedResult> {
  const patch: { name?: string; email?: string | null; city?: string | null } = {};
  if ("name" in body) {
    const name = text(body.name, 120);
    if (!name) return badRequest("Please enter your name.");
    patch.name = name;
  }
  if ("email" in body) {
    const email = text(body.email, 191);
    if (email && !EMAIL.test(email)) return badRequest("Please enter a valid email address.");
    patch.email = email || null;
  }
  if ("city" in body) patch.city = text(body.city, 120) || null;
  await ctx.store.updateHostedUser(ctx.app.id, s.user.id, patch, ctx.now);
  return ok(userJson({ ...s.user, ...patch }));
}

async function listDevices(ctx: HostedContext, s: Session): Promise<HostedResult> {
  const devices = await ctx.store.listHostedDevices(ctx.app.id, s.user.id);
  return ok({
    items: devices.map((d) => ({
      id: d.id,
      platform: d.platform,
      name: d.name,
      last_seen_at: d.lastSeenAt.toISOString(),
      current: d.id === s.device.id,
    })),
    limit: hostedSettings(ctx.app).deviceLimit,
  });
}

async function removeDevice(ctx: HostedContext, s: Session, id: string): Promise<HostedResult> {
  const device = await ctx.store.getHostedDevice(ctx.app.id, id);
  if (!device || device.userId !== s.user.id) return error(404, "not_found", "Device not found.");
  await ctx.store.deleteHostedDevice(ctx.app.id, device.id);
  return noContent;
}

async function setPushToken(ctx: HostedContext, s: Session, body: Record<string, unknown>): Promise<HostedResult> {
  const token = text(body.token, 512);
  if (!token) return badRequest("The push token is missing.");
  const prefs = record(body.preferences);
  const preferences: Record<string, boolean> = {};
  for (const key of ["announcements", "new_lessons", "daily_reminder"]) {
    if (typeof prefs[key] === "boolean") preferences[key] = prefs[key] as boolean;
  }
  // A token moves with the install: forget it on any other device first.
  await ctx.store.clearHostedPushToken(ctx.app.id, token);
  await ctx.store.updateHostedDevice(ctx.app.id, s.device.id, { pushToken: token, pushPreferences: preferences });
  return noContent;
}

// Notifications

function pageParam(query: URLSearchParams, name: string, fallback: number, max: number): number {
  const value = Number.parseInt(query.get(name) ?? "", 10);
  return Number.isFinite(value) && value >= 1 ? Math.min(value, max) : fallback;
}

export function notificationJson(n: HostedNotification, readAt: Date | null) {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    type: "announcement",
    course_id: null,
    lesson_id: null,
    question_id: null,
    created_at: n.createdAt.toISOString(),
    read: readAt !== null && n.createdAt.getTime() <= readAt.getTime(),
  };
}

async function listNotifications(ctx: HostedContext, s: Session, query: URLSearchParams): Promise<HostedResult> {
  const page = pageParam(query, "page", 1, 10_000);
  const perPage = pageParam(query, "per_page", 20, 50);
  const since = new Date(ctx.now.getTime() - NOTIFICATION_DAYS * 86_400_000);
  const readAt = s.user.notificationsReadAt;
  const [list, unread] = await Promise.all([
    ctx.store.listHostedNotifications({ appId: ctx.app.id, userId: s.user.id, since, page, perPage }),
    ctx.store.countHostedNotificationsAfter({
      appId: ctx.app.id,
      userId: s.user.id,
      after: readAt && readAt > since ? readAt : new Date(since.getTime() - 1),
    }),
  ]);
  return ok({
    page,
    per_page: perPage,
    total: list.total,
    total_pages: Math.max(1, Math.ceil(list.total / perPage)),
    items: list.items.map((n) => notificationJson(n, readAt)),
    unread_count: unread,
  });
}
