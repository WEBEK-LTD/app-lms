import { randomInt } from "node:crypto";
import { hostedScreenProtection } from "../app/screen-protection";
import { hidesVideoBranding } from "../app/video-branding";
import { toVertical } from "../app/kinds";
import { hmacSha256, newId, randomToken, safeEqual, sha256Hex } from "../crypto/tokens";
import { yallappLinkBase } from "../links/table";
import type { DataStore } from "../data/store";
import {
  DEFAULT_HOSTED_SETTINGS,
  type App,
  type ChatMember,
  type HostedDevice,
  type HostedNotification,
  type HostedSettings,
  type HostedUser,
} from "../data/types";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";
import type { Connector } from "./connectors/types";
import { decodeJwt, encodeJwt } from "./jwt";
import { handlePages } from "./pages";
import { draftLayout, lookAndLanguages } from "../pages/layout";
import type { OtpSender } from "./otp-sender";
import { parseAnyPhone, parsePhone, type Phone } from "./phone";
import { hasFeature, type PlanInfo } from "../plans";
import { DEMO_LIMITS, DEMO_SIGN_IN, DEMO_USER_NAME } from "../demo/constants";
import { hostedSignInMethods, normalizeEmail } from "./sign-in-methods";
import { personClaims, yallappSignsIn, type AppSignIn } from "./app-auth";
import { localizedError, requestLanguage } from "../i18n/builtin";
import { chatConfig, chatSessionKind } from "../chat/access";
import { handleChatRoute, type HostedChatDeps } from "../chat/hosted";
import { forgetChatMember, memberForChatToken, memberForHostedUser } from "../chat/service";
import { errorOfBody, noteAppError } from "../watch/app-errors";

/**
 * The hosted API: the app contract's configuration, sign-in, account,
 * devices, push token and notifications endpoints (docs/api/openapi.yaml),
 * for apps whose backend is "hosted". Same behaviour as the plugin's.
 *
 * 34 Also for an app on its own API when Yallapp signs people in: then only
 * sign-in, the account and its devices (the client's API serves the rest),
 * with ES256 access tokens the client's API checks (lib/hosted/app-auth.ts).
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
  // 18 Email codes: the same limits per address as per number.
  emailResend: { name: "hosted-email:resend", limit: 1, windowSeconds: RESEND_SECONDS },
  email: { name: "hosted-email:address", limit: 5, windowSeconds: 3600 },
  // 69 The store review number and address skip the limits above (reviewers sign in again and
  // again), but their fixed code is 6 digits: 30 tries an hour per app keep it from being guessed.
  review: { name: "hosted-otp:review", limit: 30, windowSeconds: 3600 },
} satisfies Record<string, RateLimitRule>;

export interface HostedResult {
  status: number;
  body?: unknown;
  /** Extra response headers, e.g. ETag and Vary on /pages. */
  headers?: Record<string, string>;
}

export interface HostedContext {
  store: DataStore;
  app: App;
  /** Whether this app's own license is active (each app has its own plan); requests fail with license_inactive otherwise. */
  active: boolean;
  /** 13.5 The owner's account is suspended: requests fail with account_suspended. */
  suspended?: boolean;
  /**
   * 13.1 The app's plan (features and limits, switches applied). Left out
   * (older callers and tests): nothing is limited.
   */
  plan?: PlanInfo | null;
  /** 13.2 Called with the app's number of users after a sign-up, or a sign-up refused at the limit (owner notices). */
  onUsersCounted?: (count: number) => Promise<void>;
  now: Date;
  ip: string;
  /** Signs access tokens and hashes codes. */
  secret: string;
  sender: OtpSender | null;
  /**
   * 18 Emails a sign-in code (the "Sign-in code" email template, through the
   * platform's SMTP). Missing: email codes fail with provider_error.
   */
  sendEmailCode?: (input: { to: string; code: string; appName: string; minutes: number }) => Promise<void>;
  /** Whether push can be sent (a Firebase service account is saved). */
  push: boolean;
  /** Public URL of an uploaded asset. */
  assetUrl: (assetId: string) => string;
  /** Used when the app has no website of its own. */
  platformUrl: string;
  /** Serves the content endpoints (Shopify for Store apps); null until one is connected. */
  connector?: Connector | null;
  /**
   * 17 The request comes from the app preview in the dashboard, with a valid
   * preview token for this app (`X-Yallapp-Preview`). The API then answers
   * while the app isn't active yet (never while the account is suspended),
   * signs in only the store review number, and with `draft` serves the Pages
   * & look draft instead of the published pages.
   */
  preview?: { draft: boolean } | null;
  /**
   * 34 Signs and checks the access tokens of an app on its own API that
   * Yallapp signs people in to. Without it such an app answers not_found.
   */
  yallappSignIn?: AppSignIn | null;
  /**
   * 49 A person deleted their account in an app Yallapp signs people in to:
   * tells the client's API (`account.deleted`, lib/hosted/api-webhooks.ts).
   * Called after the account is gone; a failure never undoes the deletion.
   */
  onAccountDeleted?: (sub: string) => Promise<void>;
  /**
   * 77 The chat's media server and pushes. Missing: the app has no chat
   * (`chat_not_available`), whatever its plan.
   */
  chat?: HostedChatDeps | null;
}

export interface HostedRequest {
  method: string;
  /** Path segments after the app ID, e.g. ["auth", "otp", "request"]. */
  path: string[];
  query: URLSearchParams;
  body: unknown;
  /** The bearer token, if any. */
  token: string | null;
  /** The request headers (Accept-Language, If-None-Match). */
  headers?: Headers;
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

/** How app users reach the app's owner (`OwnerContact`): the app's support WhatsApp and email. */
export function ownerContact(app: App): { name: string; whatsapp: string | null; email: string | null } {
  return { name: app.appName?.trim() || "This app", whatsapp: hostedSettings(app).supportWhatsapp, email: app.supportEmail };
}

/** The app is paused (its plan isn't active, or the owner's account is suspended): the owner can bring it back. */
export function pausedError(app: App, suspended: boolean): HostedResult {
  const contact = ownerContact(app);
  const owner = app.appName?.trim() || "the app's owner";
  return error(503, suspended ? "account_suspended" : "license_inactive", `${contact.name} is paused right now. Please contact ${owner} to bring it back.`, { contact });
}

/** 13.2 A new user past the plan's limit. */
function userLimitError(app: App): HostedResult {
  const contact = ownerContact(app);
  return error(403, "app_user_limit", `${contact.name} isn't taking new members right now. Please contact ${app.appName?.trim() || "the app's owner"}.`, { contact });
}

/** Whether a new user would go past the plan's app users (store reviewers always get in). */
async function userLimitReached(ctx: HostedContext, phone: string | null, email: string | null = null): Promise<boolean> {
  const limit = ctx.plan?.limits.appUsers ?? null;
  if (limit === null) return false;
  const settings = hostedSettings(ctx.app);
  if (phone && settings.reviewPhone && parseAnyPhone(settings.reviewPhone, settings.defaultCountryCode)?.e164 === phone) return false;
  if (email && isReviewEmail(settings, email)) return false;
  const count = await ctx.store.countHostedUsers(ctx.app.id);
  if (count < limit) return false;
  try {
    await ctx.onUsersCounted?.(count);
  } catch (e) {
    console.error("[hosted] app users notice failed", e);
  }
  return true;
}

/** 34 The account endpoints Yallapp serves for an app on its own API; everything else is the client's API's. */
const SIGN_IN_ONLY_ROUTES = new Set(["POST /auth/logout", "GET /me", "PATCH /me", "DELETE /me", "GET /me/devices"]);

/**
 * 68 What answers while the app is paused (its plan ended, or the owner's
 * account is suspended): a person who is signed in can always delete their
 * account (the stores require it), so the session can be renewed, ended, and
 * the account deleted. Signing in stays paused with everything else.
 */
export const OPEN_WHILE_PAUSED: ReadonlySet<string> = new Set(["POST /auth/refresh", "POST /auth/logout", "DELETE /me"]);

/**
 * The hosted API. 43 An error's message comes in the language the app asks
 * in when Yallapp has it (Arabic, Turkish), else in English.
 */
export async function handleHosted(ctx: HostedContext, req: HostedRequest): Promise<HostedResult> {
  const result = await route(ctx, req);
  if (result.status < 400 || result.body === undefined) return result;
  return { ...result, body: localizedError(result.body, requestLanguage(req.headers?.get("accept-language"))) };
}

async function route(ctx: HostedContext, req: HostedRequest): Promise<HostedResult> {
  // 77 The chat, for every app that has it (WordPress apps too, with their site's chat token).
  if (req.path[0] === "chat") return chatRequest(ctx, req);
  // 34 An app on its own API reaches the hosted API only for Yallapp's sign-in.
  const signInOnly = signsForOwnApi(ctx);
  if (ctx.app.backend !== "hosted" && !signInOnly) return notFound();
  const route = `${req.method} /${req.path.join("/")}`;
  // 17 The owner's preview works before activation and after the plan ended; real users see the app paused.
  // 68 Except what a signed-in person needs to delete their account (store rules): renewing the session, signing out, DELETE /me.
  const paused = ctx.suspended || (!ctx.active && !ctx.preview);
  if (paused && !OPEN_WHILE_PAUSED.has(route)) return pausedError(ctx.app, Boolean(ctx.suspended));
  switch (route) {
    case "GET /config":
      return signInOnly ? signInConfig(ctx, req) : config(ctx, req);
    case "POST /auth/otp/request":
      return requestCode(ctx, record(req.body));
    case "POST /auth/email/request":
      return requestEmailCode(ctx, record(req.body));
    case "POST /auth/otp/verify":
      return verifyCode(ctx, record(req.body));
    case "POST /auth/register":
      return register(ctx, record(req.body));
    case "POST /auth/refresh":
      return refresh(ctx, record(req.body));
  }

  const session = await authenticate(ctx, req.token);
  if (signInOnly) {
    const deviceRoute = req.path.length === 3 && req.path[0] === "me" && req.path[1] === "devices" && req.method === "DELETE";
    if (!SIGN_IN_ONLY_ROUTES.has(route) && !deviceRoute) return notFound();
  }
  // 10.6 Pages
  const page = signInOnly ? null : await handlePages(ctx, req, session?.user ?? null);
  if (page) return page;
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
        // 16 Everyone shares the demo account: nobody can rename it for the others.
        if (ctx.app.demo) return error(403, "feature_disabled", "The demo account can't be changed. In your own app, people edit their details here.");
        return updateMe(ctx, session, record(req.body));
      case "DELETE /me":
        // 16 Deleting the shared demo account would sign everyone out: it signs out this phone only.
        if (ctx.app.demo) await ctx.store.deleteHostedDevice(ctx.app.id, session.device.id);
        else {
          await ctx.store.deleteHostedUser(ctx.app.id, session.user.id);
          // 77 Their chat goes with them: their messages and the files they sent.
          const member = await ctx.store.findChatMember(ctx.app.id, "hosted", String(session.user.id));
          if (member) await forgetChatMember({ store: ctx.store, storage: ctx.chat?.storage ?? null }, ctx.app, member);
          // 49 The client's API hears of it, signed, even when the app couldn't reach its DELETE /me.
          if (signInOnly) {
            try {
              await ctx.onAccountDeleted?.(String(session.user.id));
            } catch (e) {
              console.error(`[hosted] app ${ctx.app.id}: the account deletion notice failed: ${errorText(e)}`);
            }
          }
        }
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
      // 43 Labels the connector writes (an event's price) in the app's language.
      lang: requestLanguage(req.headers?.get("accept-language")),
    });
    // 78.4 The connected platform failing (it can't be reached, it refused): counted for the team.
    if (result && result.status >= 500) {
      const failed = errorOfBody(result.body);
      await noteAppError(ctx.store, { clientId: ctx.app.clientId, appId: ctx.app.id, source: "platform", code: failed?.code ?? `http_${result.status}`, detail: `${req.method} /${req.path.join("/")}: ${failed?.message ?? "no answer"}` }, ctx.now);
    }
    if (result) return result;
  }
  return notFound();
}

// 77 Chat

async function chatRequest(ctx: HostedContext, req: HostedRequest): Promise<HostedResult> {
  if (ctx.suspended || (!ctx.active && !ctx.preview)) return pausedError(ctx.app, Boolean(ctx.suspended));
  let member: ChatMember | null = null;
  const kind = chatSessionKind(ctx.app);
  if (kind === "access_token" && (ctx.app.backend === "hosted" || signsForOwnApi(ctx))) {
    const session = await authenticate(ctx, req.token);
    if (session) member = await memberForHostedUser(ctx.store, ctx.app, session.user, ctx.now);
  } else if (kind === "site") {
    member = await memberForChatToken(ctx.store, ctx.app, req.token, ctx.now);
  }
  return handleChatRoute({ store: ctx.store, app: ctx.app, plan: ctx.plan, now: ctx.now, assetUrl: ctx.assetUrl, chat: ctx.chat }, req, member);
}

// Configuration

/** An error for the server log: its kind and message only (never a request, headers or keys). */
export function errorText(e: unknown): string {
  return e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 300) : "unknown error";
}

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
    // 19 One platform failing doesn't keep the app from opening: the config is
    // served without what the platform adds (its screens say it can't be reached).
    console.error(`[hosted] app ${app.id}: the connected platform's config failed: ${errorText(e)}`);
    await noteAppError(ctx.store, { clientId: app.clientId, appId: app.id, source: "platform", code: "config_failed", detail: errorText(e) }, ctx.now);
    extra = {};
  }
  return ok({
    site: {
      name: app.appName ?? "App",
      url: app.siteUrl ?? ctx.platformUrl,
      terms_url: settings.termsUrl,
      privacy_url: app.privacyUrl,
      support_whatsapp: settings.supportWhatsapp,
      support_email: app.supportEmail,
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
      // 13.1 Push and offline mode come with the plan.
      push: ctx.push && (ctx.plan === undefined || hasFeature(ctx.plan, "push")),
      orders: false,
      ...extra.features,
      offline: ctx.plan === undefined ? false : hasFeature(ctx.plan, "offline_downloads"),
      // 45 Lessons saved for offline viewing: the connector offers them (courses managed in
      // Yallapp, when the owner left them on) and the plan has offline mode.
      downloads: extra.features?.downloads === true && ctx.plan !== undefined && hasFeature(ctx.plan, "offline_downloads"),
    },
    auth: authConfig(app),
    // Paid courses never show "Enroll now" on iOS, nor without card payments in the plan (13.1).
    purchases: {
      ...(extra.purchases ?? { enroll_button: false, free_enrollment: false }),
      ...(platform === "ios" || (ctx.plan !== undefined && !hasFeature(ctx.plan, "card_payments")) ? { enroll_button: false } : {}),
    },
    // 53 Screenshots and screen recording, as the owner chose (apps built before it read `block_screen_capture`).
    content: { block_screen_capture: hostedScreenProtection(app) !== "off", watermark: "off", embed_fullscreen_button: true, embed_height: "auto" },
    // 46 The owner's switches: the store's rating prompt and crash reports.
    app: {
      update_required: false,
      maintenance: false,
      maintenance_message: null,
      review_prompt: app.reviewPrompt !== false,
      crash_reports: app.crashReports !== false,
      screen_protection: hostedScreenProtection(app),
      // 72 The video sites' own players unless the owner hides them, at their own risk.
      hide_video_branding: hidesVideoBranding(app),
    },
    // 46 Links that open the app: on Yallapp's link domain for apps without WordPress.
    links: { share_base_url: yallappLinkBase(ctx.platformUrl, app.id) },
    // 20 The kind of business: wording and defaults in the app, never its screens.
    vertical: toVertical(app.vertical),
    // 77 Chat with the business (and course groups).
    ...chatField(ctx),
    ...(extra.store ? { store: extra.store } : {}),
    ...(extra.bookings ? { bookings: extra.bookings } : {}),
    ...(extra.listings ? { listings: extra.listings } : {}),
    // 28 Events & tickets
    ...(extra.events ? { events: extra.events } : {}),
    // 23 Breaking news needs push set up and in the app's plan too.
    ...(extra.news
      ? { news: { ...extra.news, breaking_news_push: extra.news.breaking_news_push && ctx.push && (ctx.plan === undefined || hasFeature(ctx.plan, "push")) } }
      : {}),
    // 29 Campaign updates the same way.
    ...(extra.donations
      ? { donations: { ...extra.donations, updates_push: extra.donations.updates_push && ctx.push && (ctx.plan === undefined || hasFeature(ctx.plan, "push")) } }
      : {}),
    // 10.6 Looks and languages (17: the draft's, in a draft preview)
    // 43 With each language's name, direction and the owner's string pack.
    ...(await lookAndLanguages(ctx.store, app, ctx.preview?.draft ? await draftLayout(ctx.store, app, ctx.now) : undefined, ctx.plan ?? null, {
      platformUrl: ctx.platformUrl,
      draft: Boolean(ctx.preview?.draft),
    })),
  });
}

/** `Config.auth`: the owner's sign-in choices. */
function authConfig(app: App) {
  const settings = hostedSettings(app);
  return {
    signup_allowed: settings.signupAllowed,
    signup_fields: signupFields(settings),
    default_country_code: settings.defaultCountryCode,
    // 18 Phone, email (a code by email) or both, as the owner chose.
    methods: hostedSignInMethods(app),
    ...(hostedSignInMethods(app).includes("email") ? { email_sign_in: "code" } : {}),
    // 17 `preview: true` at /auth/otp/request signs in only the store review number.
    preview_sign_in: true,
  };
}

/**
 * 34 `GET /config` of an app on its own API that Yallapp signs people in to:
 * a valid Config whose `auth` is what counts (`provider: yallapp`, the
 * address of these endpoints and the owner's choices). The app takes only
 * `auth` from it; everything else comes from the client's own /config.
 */
function signInConfig(ctx: HostedContext, req: HostedRequest): HostedResult {
  const platform = req.query.get("platform");
  if (platform !== "android" && platform !== "ios") return badRequest("Unknown platform.");
  if (!req.query.get("app_version")) return badRequest("The app version is missing.");
  const { app } = ctx;
  const settings = hostedSettings(app);
  return ok({
    site: {
      name: app.appName ?? "App",
      url: app.siteUrl ?? ctx.platformUrl,
      terms_url: settings.termsUrl,
      privacy_url: app.privacyUrl,
      support_whatsapp: settings.supportWhatsapp,
      support_email: app.supportEmail,
    },
    branding: { logo_url: app.logoAssetId ? ctx.assetUrl(app.logoAssetId) : null, primary_color: app.primaryColor },
    features: { lms: null, lms_version: "", pro: false, certificates: false, quizzes: false, wishlist: false, reviews: false, qna: false, push: false },
    auth: { ...authConfig(app), provider: "yallapp", base_url: ctx.yallappSignIn!.baseUrl },
    purchases: { enroll_button: false, free_enrollment: false },
    content: { block_screen_capture: false, watermark: "off", embed_fullscreen_button: true, embed_height: "auto" },
    app: { update_required: false, maintenance: false, maintenance_message: null },
    ...chatField(ctx),
  });
}

/** 77 `Config.chat` when the app has chat. */
function chatField(ctx: HostedContext): { chat?: NonNullable<ReturnType<typeof chatConfig>> } {
  const chat = ctx.chat ? chatConfig(ctx.app, ctx.plan, ctx.platformUrl) : null;
  return chat ? { chat } : {};
}

function signupFields(settings: HostedSettings, byEmail = false): ("name" | "email" | "city")[] {
  // 18 After an email sign-in the address is known: not asked again.
  return ["name", ...settings.signupFields.filter((f) => (f === "email" && !byEmail) || f === "city")];
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

/** 19 The store review email address (for apps that sign in by email only), with its code set. */
function isReviewEmail(settings: HostedSettings, email: string): boolean {
  if (!settings.reviewEmail || !settings.reviewCode) return false;
  return normalizeEmail(settings.reviewEmail) === email;
}

/** 38 The account of the store review number or address. */
function isReviewUser(settings: HostedSettings, user: HostedUser): boolean {
  const phone = user.phone ? parseAnyPhone(user.phone, settings.defaultCountryCode) : null;
  return (phone !== null && isReviewPhone(settings, phone)) || (user.email !== null && isReviewEmail(settings, user.email));
}

/** 19 Why a code wasn't sent, for the logs: the provider's answer, never the code or the address. */
async function logSendFailure(ctx: HostedContext, kind: "phone" | "email", e: unknown): Promise<void> {
  const reason = e instanceof Error ? e.message : String(e);
  console.error(`[hosted] ${kind} sign-in code not sent for app ${ctx.app.id}: ${reason.slice(0, 300)}`);
  // 78.4 Counted for the team too.
  await noteAppError(ctx.store, { clientId: ctx.app.clientId, appId: ctx.app.id, source: "sign_in", code: `${kind}_code_not_sent`, detail: reason }, ctx.now);
}

function codeHash(ctx: HostedContext, requestId: string, code: string): string {
  return hmacSha256(ctx.secret, `hosted-code:${ctx.app.id}:${requestId}:${code}`);
}

/**
 * 16 Demo apps: only the public demo number signs in, with its fixed code and
 * no message sent. Everyone shares it, so it's limited per IP and per app
 * instead of per number. Other numbers are refused (no codes, no personal data).
 */
async function requestDemoCode(ctx: HostedContext, phone: Phone): Promise<HostedResult> {
  if (phone.e164 !== DEMO_SIGN_IN.e164) {
    return error(403, "demo_number_only", `This is a demo app. Sign in with the demo number ${DEMO_SIGN_IN.display} and the code shown on yallapp.com.tr/demo.`);
  }
  const wait = (await limited(ctx, DEMO_LIMITS.ip, ctx.ip)) ?? (await limited(ctx, DEMO_LIMITS.app, "all"));
  if (wait) return wait;
  const requestId = randomToken(24);
  await ctx.store.createHostedChallenge({
    tokenHash: sha256Hex(requestId),
    appId: ctx.app.id,
    kind: "otp",
    phone: phone.e164,
    email: null,
    codeHash: null,
    attempts: 0,
    review: true,
    expiresAt: new Date(ctx.now.getTime() + CODE_TTL_SECONDS * 1000),
    createdAt: ctx.now,
  });
  if (Math.random() < 0.05) await ctx.store.purgeHostedExpired(ctx.now);
  return ok({ request_id: requestId, code_length: CODE_LENGTH, resend_after_seconds: RESEND_SECONDS, expires_in_seconds: CODE_TTL_SECONDS });
}

/** 17 A number other than the store review number, in the app preview. */
function previewNumberOnly(): HostedResult {
  return error(
    403,
    "preview_review_number_only",
    "This is a preview, and it never sends codes. Sign in with your app's store review number and its code, set on App sign-in in your Yallapp dashboard.",
  );
}

/** 16 The demo number's code was right: the shared demo account (made again if a visitor deleted it). */
async function demoSession(ctx: HostedContext, rawDevice: Record<string, unknown>): Promise<HostedResult> {
  const user =
    (await ctx.store.getHostedUserByPhone(ctx.app.id, DEMO_SIGN_IN.e164)) ??
    (await ctx.store.createHostedUser({ appId: ctx.app.id, phone: DEMO_SIGN_IN.e164, name: DEMO_USER_NAME, email: null, city: null, now: ctx.now })) ??
    (await ctx.store.getHostedUserByPhone(ctx.app.id, DEMO_SIGN_IN.e164));
  if (!user) return error(409, "account_exists", "Please try again.");
  return session(ctx, user, rawDevice);
}

async function requestCode(ctx: HostedContext, body: Record<string, unknown>): Promise<HostedResult> {
  const phone = parsePhone(body.country_code, body.phone);
  if (!phone) return error(400, "invalid_phone", "Please enter a valid mobile number.");
  if (ctx.app.demo) return requestDemoCode(ctx, phone);
  const settings = hostedSettings(ctx.app);
  const review = isReviewPhone(settings, phone);
  // 17 The app preview never sends a code: only the store review number signs in there, with its fixed code.
  if ((ctx.preview || body.preview === true) && !review) return previewNumberOnly();
  // 18 Email only: the store review number still signs in (reviewers and the preview use it).
  if (!review && !hostedSignInMethods(ctx.app).includes("phone")) {
    return error(403, "method_not_allowed", "This app signs in with your email address. Use the Email option.");
  }
  const wait = review
    ? await limited(ctx, HOSTED_LIMITS.review, "review")
    : ((await limited(ctx, HOSTED_LIMITS.resend, phone.e164)) ??
      (await limited(ctx, HOSTED_LIMITS.phone, phone.e164)) ??
      (await limited(ctx, HOSTED_LIMITS.ip, ctx.ip)));
  if (wait) return wait;

  const requestId = randomToken(24);
  const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
  await ctx.store.createHostedChallenge({
    tokenHash: sha256Hex(requestId),
    appId: ctx.app.id,
    kind: "otp",
    phone: phone.e164,
    email: null,
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
    } catch (e) {
      await logSendFailure(ctx, "phone", e);
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

/** 18 Emails a 6-digit code, when the app offers email sign-in. Same rules as phone codes. */
async function requestEmailCode(ctx: HostedContext, body: Record<string, unknown>): Promise<HostedResult> {
  if (ctx.app.demo) {
    return error(403, "demo_number_only", `This is a demo app. Sign in with the demo number ${DEMO_SIGN_IN.display} and the code shown on yallapp.com.tr/demo.`);
  }
  const email = normalizeEmail(body.email);
  // 19 The store review address signs in with the review code, like the review number: nothing is sent.
  const review = email !== null && isReviewEmail(hostedSettings(ctx.app), email);
  // 17 The preview never sends a code: only the store review number (or address) signs in there.
  if ((ctx.preview || body.preview === true) && !review) return previewNumberOnly();
  if (!hostedSignInMethods(ctx.app).includes("email")) {
    return error(403, "method_not_allowed", "This app doesn't offer sign-in by email. Sign in with your phone number.");
  }
  if (!email) return error(400, "invalid_email", "Please enter a valid email address.");
  const wait = review
    ? await limited(ctx, HOSTED_LIMITS.review, "review")
    : ((await limited(ctx, HOSTED_LIMITS.emailResend, email)) ??
      (await limited(ctx, HOSTED_LIMITS.email, email)) ??
      (await limited(ctx, HOSTED_LIMITS.ip, ctx.ip)));
  if (wait) return wait;

  const requestId = randomToken(24);
  const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
  await ctx.store.createHostedChallenge({
    tokenHash: sha256Hex(requestId),
    appId: ctx.app.id,
    kind: "otp",
    phone: null,
    email,
    codeHash: review ? null : codeHash(ctx, requestId, code),
    attempts: 0,
    review,
    expiresAt: new Date(ctx.now.getTime() + CODE_TTL_SECONDS * 1000),
    createdAt: ctx.now,
  });
  if (!review) {
    try {
      if (!ctx.sendEmailCode) throw new Error("No email sender.");
      await ctx.sendEmailCode({ to: email, code, appName: ctx.app.appName ?? "Yallapp", minutes: Math.round(CODE_TTL_SECONDS / 60) });
    } catch (e) {
      await logSendFailure(ctx, "email", e);
      await ctx.store.deleteHostedChallenge(sha256Hex(requestId));
      return error(502, "provider_error", "We couldn't send the code. Please try again.");
    }
  }
  if (Math.random() < 0.05) await ctx.store.purgeHostedExpired(ctx.now);
  return ok({ request_id: requestId, code_length: CODE_LENGTH, resend_after_seconds: RESEND_SECONDS, expires_in_seconds: CODE_TTL_SECONDS });
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
  // 16 The demo code only ever works in a demo app, for the demo number; demo apps take no other code.
  const valid = ctx.app.demo
    ? challenge.review && challenge.phone === DEMO_SIGN_IN.e164 && safeEqual(code, DEMO_SIGN_IN.code)
    : challenge.review
      ? Boolean(settings.reviewCode) && safeEqual(code, settings.reviewCode!)
      : challenge.codeHash !== null && safeEqual(codeHash(ctx, requestId, code), challenge.codeHash);
  if (!valid) return error(400, "invalid_code", "That code is not correct.");
  await ctx.store.deleteHostedChallenge(hash);
  if (ctx.app.demo) return demoSession(ctx, record(body.device));

  // 18 An email sign-in finds the account made with that address (only addresses proven by a code are sign-in addresses).
  const user = challenge.email
    ? await ctx.store.getHostedEmailUser(ctx.app.id, challenge.email)
    : await ctx.store.getHostedUserByPhone(ctx.app.id, challenge.phone!);
  if (user) return session(ctx, user, record(body.device));
  if (!settings.signupAllowed) {
    return error(403, "signup_disabled", challenge.email ? "There is no account with this email address." : "There is no account with this number.");
  }
  // 13.2 Existing users keep signing in; a new one is refused past the plan's app users.
  if (await userLimitReached(ctx, challenge.phone, challenge.email)) return userLimitError(ctx.app);
  const signupToken = randomToken(24);
  await ctx.store.createHostedChallenge({
    tokenHash: sha256Hex(signupToken),
    appId: ctx.app.id,
    kind: "signup",
    phone: challenge.phone,
    email: challenge.email,
    codeHash: null,
    attempts: 0,
    review: false,
    expiresAt: new Date(ctx.now.getTime() + SIGNUP_TTL_SECONDS * 1000),
    createdAt: ctx.now,
  });
  return ok({ signup_required: true, signup_token: signupToken, fields: signupFields(settings, Boolean(challenge.email)) });
}

async function register(ctx: HostedContext, body: Record<string, unknown>): Promise<HostedResult> {
  // 16 Demo apps have one account, made when the demo number signs in.
  if (ctx.app.demo) return error(403, "signup_disabled", "This is a demo app. Sign in with the demo number shown on yallapp.com.tr/demo.");
  const hash = sha256Hex(text(body.signup_token, 100));
  const challenge = await ctx.store.getHostedChallenge(hash);
  if (!challenge || challenge.appId !== ctx.app.id || challenge.kind !== "signup" || challenge.expiresAt <= ctx.now) {
    return error(400, "code_expired", "Your verification has expired. Please start again.");
  }
  const settings = hostedSettings(ctx.app);
  const byEmail = Boolean(challenge.email);
  const fields = signupFields(settings, byEmail);
  const name = text(body.name, 120);
  // 18 After an email sign-in, the account's email is the address that got the code.
  const email = challenge.email ?? text(body.email, 191);
  const city = text(body.city, 120);
  if (!name) return badRequest("Please enter your name.");
  if ((fields.includes("email") || email) && !EMAIL.test(email)) return badRequest("Please enter a valid email address.");
  if (fields.includes("city") && !city) return badRequest("Please enter your city.");
  const device = deviceInput(body.device);
  if (!device) return error(400, "invalid_device", "Device details are missing.");
  if (await userLimitReached(ctx, challenge.phone, challenge.email)) return userLimitError(ctx.app);

  const user = await ctx.store.createHostedUser({
    appId: ctx.app.id,
    phone: challenge.phone,
    name,
    email: email || null,
    city: city || null,
    now: ctx.now,
  });
  if (!user) {
    return error(409, "account_exists", byEmail ? "An account with this email address already exists. Please sign in." : "An account with this number already exists. Please sign in.");
  }
  await ctx.store.deleteHostedChallenge(hash);
  if (ctx.onUsersCounted && ctx.plan?.limits.appUsers != null) {
    try {
      await ctx.onUsersCounted(await ctx.store.countHostedUsers(ctx.app.id));
    } catch (e) {
      // A notice never fails a sign-up.
      console.error("[hosted] app users notice failed", e);
    }
  }
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
    // 16 The shared demo account is on every visitor's phone.
    const limit = ctx.app.demo ? 0 : hostedSettings(ctx.app).deviceLimit;
    const devices = limit > 0 ? await ctx.store.listHostedDevices(ctx.app.id, user.id) : [];
    if (limit > 0 && devices.length >= limit) {
      // 38 The store review account is never locked out (reviewers and the
      // owner's previews each sign in on new devices): its oldest are signed out.
      if (!isReviewUser(hostedSettings(ctx.app), user)) {
        return error(
          403,
          "device_limit_reached",
          "This account is already signed in on the maximum number of devices. Sign out on another device or contact support.",
        );
      }
      const oldest = [...devices].sort((a, b) => a.lastSeenAt.getTime() - b.lastSeenAt.getTime());
      for (const old of oldest.slice(0, devices.length - limit + 1)) await ctx.store.deleteHostedDevice(ctx.app.id, old.id);
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
  return ok({ ...(await issueTokens(ctx, user, device.id)), user: userJson(user) });
}

async function issueTokens(ctx: HostedContext, user: HostedUser, deviceRowId: string) {
  const userId = user.id;
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
  const exp = nowSeconds + ACCESS_TTL_SECONDS;
  return {
    // 34 An app on its own API gets ES256 tokens its API can check; the hosted API's own stay HS256.
    access_token: signsForOwnApi(ctx)
      ? await ctx.yallappSignIn!.sign({ sub: String(userId), did: deviceRowId, ...personClaims(user), iat: nowSeconds, exp })
      : encodeJwt({ aud: ctx.app.id, sub: userId, did: deviceRowId, iat: nowSeconds, exp }, ctx.secret),
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
  // 34 The new access token carries the person's current name, phone and email.
  const user = await ctx.store.getHostedUser(ctx.app.id, token.userId);
  if (!user) return unauthorized();
  await ctx.store.updateHostedDevice(ctx.app.id, device.id, { lastSeenAt: ctx.now });
  return ok(await issueTokens(ctx, user, device.id));
}

/** 34 Whether this app's tokens are the ES256 ones of Yallapp's sign-in for an own API. */
function signsForOwnApi(ctx: HostedContext): boolean {
  return yallappSignsIn(ctx.app) && Boolean(ctx.yallappSignIn);
}

/** The signed-in person and device: `sub` and `did` of a valid token. */
async function tokenSubject(ctx: HostedContext, token: string): Promise<{ userId: number; deviceRowId: string } | null> {
  if (signsForOwnApi(ctx)) {
    const claims = await ctx.yallappSignIn!.verify(token);
    // A test token (no device) works only on the client's API.
    const userId = claims ? Number(claims.sub) : NaN;
    return claims && typeof claims.did === "string" && Number.isSafeInteger(userId) ? { userId, deviceRowId: claims.did } : null;
  }
  const claims = decodeJwt(token, ctx.secret, ctx.app.id, Math.floor(ctx.now.getTime() / 1000));
  return claims ? { userId: claims.sub, deviceRowId: claims.did } : null;
}

async function authenticate(ctx: HostedContext, token: string | null): Promise<Session | null> {
  if (!token) return null;
  const subject = await tokenSubject(ctx, token);
  if (!subject) return null;
  const device = await ctx.store.getHostedDevice(ctx.app.id, subject.deviceRowId);
  if (!device || device.userId !== subject.userId) return null;
  const user = await ctx.store.getHostedUser(ctx.app.id, subject.userId);
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
  if ("email" in body && s.user.phone === null) {
    // 18 An email account signs in with its address: it changes only by signing up again.
    if (normalizeEmail(body.email) !== s.user.email) return badRequest("You sign in with this email address, so it can't be changed here.");
  } else if ("email" in body) {
    const email = text(body.email, 191);
    if (email && !EMAIL.test(email)) return badRequest("Please enter a valid email address.");
    patch.email = email || null;
  }
  if ("city" in body) patch.city = text(body.city, 120) || null;
  await ctx.store.updateHostedUser(ctx.app.id, s.user.id, patch, ctx.now);
  return ok(userJson({ ...s.user, ...patch }));
}

async function listDevices(ctx: HostedContext, s: Session): Promise<HostedResult> {
  // 16 A visitor of a demo app sees only their own phone, not the other visitors'.
  const devices = ctx.app.demo ? [s.device] : await ctx.store.listHostedDevices(ctx.app.id, s.user.id);
  return ok({
    items: devices.map((d) => ({
      id: d.id,
      platform: d.platform,
      name: d.name,
      last_seen_at: d.lastSeenAt.toISOString(),
      current: d.id === s.device.id,
    })),
    limit: ctx.app.demo ? 0 : hostedSettings(ctx.app).deviceLimit,
  });
}

async function removeDevice(ctx: HostedContext, s: Session, id: string): Promise<HostedResult> {
  const device = await ctx.store.getHostedDevice(ctx.app.id, id);
  if (!device || device.userId !== s.user.id || (ctx.app.demo && device.id !== s.device.id)) return error(404, "not_found", "Device not found.");
  await ctx.store.deleteHostedDevice(ctx.app.id, device.id);
  return noContent;
}

async function setPushToken(ctx: HostedContext, s: Session, body: Record<string, unknown>): Promise<HostedResult> {
  const token = text(body.token, 512);
  if (!token) return badRequest("The push token is missing.");
  const prefs = record(body.preferences);
  const preferences: Record<string, boolean> = {};
  for (const key of ["announcements", "new_lessons", "daily_reminder", "news", "donations"]) {
    if (typeof prefs[key] === "boolean") preferences[key] = prefs[key] as boolean;
  }
  // 36 Firebase (the default) or Huawei Push Kit, for phones without Google Play.
  const provider = body.provider ?? "fcm";
  if (provider !== "fcm" && provider !== "hms") return badRequest("The push provider must be fcm or hms.");
  // A token moves with the install: forget it on any other device first.
  await ctx.store.clearHostedPushToken(ctx.app.id, token);
  await ctx.store.updateHostedDevice(ctx.app.id, s.device.id, { pushToken: token, pushProvider: provider, pushPreferences: preferences });
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
    // 23 Breaking news opens its article; 28 a change to an event opens the event; 29 a campaign update its campaign.
    type: n.articleId ? "article" : n.eventId ? "event" : n.campaignId ? "campaign_update" : "announcement",
    course_id: null,
    lesson_id: null,
    question_id: null,
    ...(n.articleId ? { article_id: n.articleId } : {}),
    ...(n.eventId ? { event_id: n.eventId } : {}),
    ...(n.campaignId ? { campaign_id: n.campaignId } : {}),
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
