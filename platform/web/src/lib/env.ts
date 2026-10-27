import "server-only";
import { withOldKeys } from "./crypto/encryption";
import knownCas from "./db/known-cas.json";

/**
 * Server environment. Every value is read lazily so tests can change
 * process.env between cases, and so a missing secret only fails the request
 * that needs it, with a clear message.
 */

export type DataMode = "memory" | "mysql";

function read(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim() === "" ? undefined : value.trim();
}

function required(name: string): string {
  const value = read(name);
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See platform/web/.env.example.`);
  }
  return value;
}

export function isNetlify(): boolean {
  return (
    process.env.NETLIFY === "true" ||
    Boolean(process.env.NETLIFY_BLOBS_CONTEXT) ||
    Boolean(process.env.SITE_ID && process.env.DEPLOY_ID) ||
    // Netlify functions run on AWS Lambda.
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  );
}

export function dataMode(): DataMode {
  const mode = read("YALLAPP_DATA") ?? "mysql";
  if (mode !== "memory" && mode !== "mysql") {
    throw new Error(`YALLAPP_DATA must be "memory" or "mysql", got "${mode}"`);
  }
  if (mode === "memory" && isNetlify()) {
    throw new Error("YALLAPP_DATA=memory is for local development and tests only.");
  }
  return mode;
}

/** Public base URL, without a trailing slash. Used in emails and signed links. */
export function appUrl(): string {
  const url = read("APP_URL") ?? read("URL") ?? "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export function sessionSecret(): string {
  const secret = required("SESSION_SECRET");
  if (secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  return secret;
}

export function signingSecret(): string {
  const secret = required("SIGNING_SECRET");
  if (secret.length < 32) throw new Error("SIGNING_SECRET must be at least 32 characters.");
  return secret;
}

function parseKey(raw: string, name: string): Buffer {
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error(`${name} must decode to 32 bytes (64 hex characters or base64).`);
  return key;
}

let keyCache: { raw: string; key: Buffer } | null = null;

/**
 * 32-byte key for AES-256-GCM, given as 64 hex characters or base64. 79.2
 * `ENCRYPTION_KEY_OLD` (one or more previous keys, separated by commas) keeps
 * values sealed with them readable while the rekey job moves them to this one
 * (lib/jobs/rekey.ts). The same Buffer comes back while the variables don't
 * change, with its old keys attached (lib/crypto/encryption.ts).
 */
export function encryptionKey(): Buffer {
  const raw = required("ENCRYPTION_KEY");
  const oldRaw = read("ENCRYPTION_KEY_OLD") ?? "";
  const cacheKey = `${raw}|${oldRaw}`;
  if (keyCache?.raw === cacheKey) return keyCache.key;
  const key = withOldKeys(
    parseKey(raw, "ENCRYPTION_KEY"),
    oldRaw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => parseKey(part, "Each key in ENCRYPTION_KEY_OLD")),
  );
  keyCache = { raw: cacheKey, key };
  return key;
}

export function buildPipelineToken(): string | undefined {
  return read("BUILD_PIPELINE_TOKEN");
}

/**
 * 13.4 Bearer token of the internal jobs route (/api/internal/daily), shared
 * with the Netlify scheduled function. Unset: the route refuses every request.
 */
export function internalJobSecret(): string | undefined {
  const secret = read("INTERNAL_JOB_SECRET");
  if (secret && secret.length < 32) throw new Error("INTERNAL_JOB_SECRET must be at least 32 characters.");
  return secret;
}

/**
 * Where the build pipeline stores app files (files.yallapp.com.tr). Only the
 * origin is used: links on this origin are signed before they're shown.
 */
export function filesBaseUrl(): string {
  const raw = read("FILES_BASE_URL") ?? "https://files.yallapp.com.tr";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("FILES_BASE_URL must be a full address, e.g. https://files.yallapp.com.tr.");
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && !isNetlify())) {
    throw new Error("FILES_BASE_URL must use https.");
  }
  return url.origin;
}

/**
 * Shared with the PHP download script on files.yallapp.com.tr, which checks
 * the `sig` of every link. Unset: download links are shown as not configured.
 */
export function filesSigningSecret(): string | undefined {
  const secret = read("FILES_SIGNING_SECRET");
  if (secret && secret.length < 32) throw new Error("FILES_SIGNING_SECRET must be at least 32 characters.");
  return secret;
}

/**
 * Shared with the reverse proxy on host.webek.org that serves yallapp.com.tr
 * (deploy/apache-proxy.conf). Requests carrying it may name the visitor's IP in
 * X-Yallapp-Client-Ip; without it every visitor would share the proxy's IP.
 */
export function trustedProxySecret(): string | undefined {
  const secret = read("TRUSTED_PROXY_SECRET");
  if (secret && secret.length < 32) throw new Error("TRUSTED_PROXY_SECRET must be at least 32 characters.");
  return secret;
}

export interface GithubDispatch {
  token: string;
  repository: string;
}

/**
 * Lets the platform start the build workflow as soon as a build is queued,
 * instead of waiting for its 10-minute schedule. Unset: only the schedule runs.
 */
export function githubDispatch(): GithubDispatch | undefined {
  const token = read("GITHUB_DISPATCH_TOKEN");
  if (!token) return undefined;
  const repository = read("GITHUB_REPOSITORY") ?? "WEBEK-LTD/app-lms";
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("GITHUB_REPOSITORY must look like OWNER/REPO.");
  return { token, repository };
}

export function superAdminEmails(): string[] {
  return (read("SUPER_ADMIN_EMAILS") ?? "")
    .split(/[,\s]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Cookies are Secure unless the site itself is served over plain http (local runs). */
export function secureCookies(): boolean {
  return !appUrl().startsWith("http://");
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

export function smtpConfig(): SmtpConfig | null {
  const host = read("SMTP_HOST");
  if (!host) return null;
  const port = Number(read("SMTP_PORT") ?? "465");
  return {
    host,
    port,
    secure: (read("SMTP_SECURE") ?? (port === 465 ? "true" : "false")) === "true",
    user: read("SMTP_USER"),
    pass: read("SMTP_PASS"),
    from: read("SMTP_FROM") ?? "Yallapp <info@yallapp.com.tr>",
  };
}

/**
 * How the hosted API sends sign-in codes:
 * - "whatsapp": WhatsApp Cloud API with an approved authentication template.
 * - "webhook": POSTs the code to a URL of ours (for example an SMS gateway),
 *   signed with HMAC-SHA256 of the body.
 * - "waabek": WABEK (waabek.com) sends the code on WhatsApp from one of the
 *   account's numbers (instance), through its approved OTP template when needed.
 * - "log": keeps codes in memory; local runs and tests only.
 * Null when nothing is configured: requests fail with `provider_error`.
 */
/** WABEK's API address, unless WAABEK_API_URL or the admin's setting says otherwise. */
export const WAABEK_API_URL = "https://waabek.com";

/** 18 WABEK's address for an app owner's own WhatsApp number: WAABEK_API_URL (local tests with a fake WABEK) or waabek.com. */
export function waabekApiUrl(): string {
  return read("WAABEK_API_URL") ?? WAABEK_API_URL;
}

export type OtpSenderConfig =
  | { kind: "whatsapp"; accessToken: string; phoneNumberId: string; template: string; language: string }
  | { kind: "webhook"; url: string; secret: string }
  | { kind: "waabek"; apiKey: string; baseUrl: string; instanceId: string | null }
  | { kind: "log" };

export function otpSenderConfig(): OtpSenderConfig | null {
  const kind = read("OTP_SENDER") ?? (dataMode() === "memory" ? "log" : undefined);
  if (kind === "whatsapp") {
    return {
      kind,
      accessToken: required("WHATSAPP_ACCESS_TOKEN"),
      phoneNumberId: required("WHATSAPP_PHONE_NUMBER_ID"),
      template: read("WHATSAPP_OTP_TEMPLATE") ?? "yallapp_code",
      language: read("WHATSAPP_OTP_LANGUAGE") ?? "en",
    };
  }
  if (kind === "webhook") return { kind, url: required("OTP_WEBHOOK_URL"), secret: required("OTP_WEBHOOK_SECRET") };
  if (kind === "waabek") {
    return { kind, apiKey: required("WAABEK_API_KEY"), baseUrl: read("WAABEK_API_URL") ?? WAABEK_API_URL, instanceId: read("WAABEK_INSTANCE_ID") ?? null };
  }
  if (kind === "log") {
    if (isNetlify()) throw new Error("OTP_SENDER=log is for local development and tests only.");
    return { kind };
  }
  return null;
}

/** iyzico's address for local tests (a fake server); unset uses iyzico's live or sandbox API. */
export function iyzicoApiUrl(): string | null {
  const url = read("IYZICO_API_URL");
  if (url && isNetlify()) throw new Error("IYZICO_API_URL is for local tests only.");
  return url ?? null;
}

/** 37 Kashier's and Fawaterk's addresses for local tests (fake servers); unset uses their live or test APIs. */
export function kashierApiUrl(): string | null {
  const url = read("KASHIER_API_URL");
  if (url && isNetlify()) throw new Error("KASHIER_API_URL is for local tests only.");
  return url ?? null;
}

export function fawaterkApiUrl(): string | null {
  const url = read("FAWATERK_API_URL");
  if (url && isNetlify()) throw new Error("FAWATERK_API_URL is for local tests only.");
  return url ?? null;
}

/** 37 Every payment provider's test address (lib/payments/provider.ts). */
/** 96.1 Stripe's and PayPal's addresses for local tests (fake servers); unset uses theirs. */
function testOnlyUrl(name: string): string | null {
  const url = read(name);
  if (url && isNetlify()) throw new Error(`${name} is for local tests only.`);
  return url ?? null;
}

export function paymentApiUrls(): { iyzico: string | null; kashier: string | null; fawaterk: string | null; stripe: string | null; paypal: string | null } {
  return { iyzico: iyzicoApiUrl(), kashier: kashierApiUrl(), fawaterk: fawaterkApiUrl(), stripe: testOnlyUrl("STRIPE_API_URL"), paypal: testOnlyUrl("PAYPAL_API_URL") };
}

/** 47 A fake WordPress site for local tests: every license refresh goes there (lib/license/refresh.ts). Refused on Netlify. */
export function licenseRefreshTestUrl(): string | null {
  const url = read("LICENSE_REFRESH_TEST_URL");
  if (url && isNetlify()) throw new Error("LICENSE_REFRESH_TEST_URL is for local tests only.");
  return url ?? null;
}

/** 81.3 Local tests only (refused on Netlify): every site scan reads this fake site instead of the address given. */
export function siteScanTestUrl(): string | null {
  const url = read("SITE_SCAN_TEST_URL");
  if (url && isNetlify()) throw new Error("SITE_SCAN_TEST_URL is for local tests only.");
  return url ?? null;
}

/** 97.1 Local tests only (refused on Netlify): font files are copied from this fake google/fonts instead of GitHub. */
export function googleFontsTestUrl(): string | null {
  return testOnlyUrl("GOOGLE_FONTS_TEST_URL");
}

/** 97.4 Local tests only (refused on Netlify): Figma's API is this fake one instead of api.figma.com. */
export function figmaApiTestUrl(): string | null {
  return testOnlyUrl("FIGMA_API_TEST_URL");
}

/** 100.6 Yallapp's Pub/Sub topic for Google Play's real-time notifications (`projects/<project>/topics/<name>`), shown to owners; null: not set up. */
export function googlePubSubTopic(): string | null {
  const topic = read("GOOGLE_PUBSUB_TOPIC")?.trim();
  return topic && /^projects\/[a-z][a-z0-9-]{4,28}[a-z0-9]\/topics\/[A-Za-z][\w.~+%-]{2,254}$/.test(topic) ? topic : null;
}

/** 100.3 The service account Yallapp's Pub/Sub push subscription signs Google Play's notifications with; null refuses every push. */
export function googlePubSubPushEmail(): string | null {
  return read("GOOGLE_PUBSUB_PUSH_EMAIL")?.trim().toLowerCase() || null;
}

/** 80.2 The daily checks of every app's connections (lib/integrations/schedule.ts); `INTEGRATION_CHECKS=off` turns them off (the e2e tests, whose sites are made up). */
export function integrationChecksOn(): boolean {
  return read("INTEGRATION_CHECKS")?.toLowerCase() !== "off";
}

export interface DatabaseConfig {
  url: string;
  ssl: "required" | "disabled";
  ca?: string;
  /** How many queries may wait for the one connection; 0 = no limit. */
  queueLimit?: number;
}

/** 50 queries waiting is plenty for one Netlify function; `next start` (the e2e suites) serves many requests on one pool. */
export const DEFAULT_QUEUE_LIMIT = 50;

/** DATABASE_QUEUE_LIMIT: a whole number, 0 for no limit; anything else keeps the default. */
export function databaseQueueLimit(value: string | undefined): number {
  const text = value?.trim() ?? "";
  const n = /^\d+$/.test(text) ? Number(text) : NaN;
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_QUEUE_LIMIT;
}

export function databaseConfig(): DatabaseConfig {
  const ssl = (read("DATABASE_SSL") ?? "required").toLowerCase();
  if (ssl !== "required" && ssl !== "disabled") {
    throw new Error('DATABASE_SSL must be "required" or "disabled".');
  }
  if (ssl === "disabled" && isNetlify()) {
    throw new Error("DATABASE_SSL=disabled is not allowed on Netlify. The database connection must use TLS.");
  }
  return {
    url: required("DATABASE_URL"),
    ssl,
    ca: resolveDatabaseCa(read("DATABASE_CA")),
    queueLimit: databaseQueueLimit(read("DATABASE_QUEUE_LIMIT")),
  };
}

/**
 * DATABASE_CA holds either a PEM certificate (`\n` allowed for newlines) or the
 * name of a server whose public CA ships with the app (src/lib/db/known-cas.json),
 * such as "host.webek.org".
 */
export function resolveDatabaseCa(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const known = (knownCas as Record<string, string>)[trimmed];
  if (known && !trimmed.startsWith("_")) return known;
  if (!trimmed.includes("-----BEGIN CERTIFICATE-----")) {
    throw new Error(`DATABASE_CA must be a PEM certificate or one of: ${Object.keys(knownCas).filter((k) => !k.startsWith("_")).join(", ")}.`);
  }
  return trimmed.replace(/\\n/g, "\n");
}

/** Password used to seed super admins in local runs and tests (never on Netlify). */
export function memorySeedAdminPassword(): string | undefined {
  return isNetlify() ? undefined : read("YALLAPP_SEED_ADMIN_PASSWORD");
}

export function blobsMode(): "netlify" | "fs" {
  const explicit = read("YALLAPP_BLOBS");
  if (explicit === "netlify" || explicit === "fs") return explicit;
  return isNetlify() ? "netlify" : "fs";
}

export function blobsDir(): string {
  return read("YALLAPP_BLOBS_DIR") ?? ".data/blobs";
}

// 51 Videos and pictures hosted by Yallapp

/**
 * Where owners' media files live:
 * - "host": on Yallapp's own server, behind the media gate (deploy/media-host,
 *   PHP under Apache on the host that serves yallapp.com.tr), which takes the
 *   uploads in chunks and plays the files with range requests from links the
 *   platform signs. The platform's functions never carry the bytes.
 * - "fs": a folder on the machine running the platform, served by its own
 *   /media route (local runs and tests; never on Netlify, whose disk isn't kept).
 * Null: not set up, so the Media library takes no uploads.
 */
export function mediaMode(): "host" | "fs" | null {
  const explicit = read("YALLAPP_MEDIA");
  if (explicit === "fs") {
    if (isNetlify()) throw new Error("YALLAPP_MEDIA=fs is for local runs and tests only: use the media gate on our server.");
    return "fs";
  }
  if (explicit === "host" || read("MEDIA_BASE_URL")) return read("MEDIA_BASE_URL") && read("MEDIA_SIGNING_SECRET") ? "host" : null;
  return isNetlify() ? null : "fs";
}

/** The media gate's address, like https://yallapp.com.tr/media; in "fs" mode the platform's own /media route. */
export function mediaBaseUrl(): string {
  if (mediaMode() === "host") {
    const url = new URL(required("MEDIA_BASE_URL"));
    if (url.protocol !== "https:" && !(url.protocol === "http:" && !isNetlify())) throw new Error("MEDIA_BASE_URL must use https.");
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  }
  return `${appUrl()}/media`;
}

/** Shared with the media gate (its config.php), which checks every link's `sig`. In "fs" mode SIGNING_SECRET. */
export function mediaSigningSecret(): string {
  if (mediaMode() !== "host") return signingSecret();
  const secret = required("MEDIA_SIGNING_SECRET");
  if (secret.length < 32) throw new Error("MEDIA_SIGNING_SECRET must be at least 32 characters.");
  return secret;
}

/** "fs" mode's folder. */
export function mediaDir(): string {
  return read("YALLAPP_MEDIA_DIR") ?? ".data/media";
}

// 11.4 Email templates

/**
 * Local runs and tests only (never on Netlify): emails that would go to the log are
 * also written to this folder as JSON, so the tests can read what was sent.
 */
export function mailCaptureDir(): string | undefined {
  const dir = read("YALLAPP_MAIL_DIR");
  return dir && !isNetlify() ? dir : undefined;
}

// 58 Yallapp Business: pushes to the owners' phones

/**
 * Yallapp Business's own Firebase project: the service account JSON
 * (OWNER_PUSH_FIREBASE_SERVICE_ACCOUNT, never committed) that sends the
 * owners' pushes, and optionally Huawei Push Kit's app ID and secret for
 * Huawei phones without Google Play. Unset: no pushes (the API still works).
 */
export function ownerPushCredentials(): { serviceAccountJson: string | null; hms: { app_id: string; app_secret: string } | null } {
  const appId = read("OWNER_PUSH_HMS_APP_ID");
  const secret = read("OWNER_PUSH_HMS_APP_SECRET");
  return { serviceAccountJson: read("OWNER_PUSH_FIREBASE_SERVICE_ACCOUNT") ?? null, hms: appId && secret ? { app_id: appId, app_secret: secret } : null };
}

/** Local runs and tests only (never on Netlify): the owners' pushes are also written here as JSON, as YALLAPP_MAIL_DIR does for emails. */
export function ownerPushCaptureDir(): string | undefined {
  const dir = read("YALLAPP_OWNER_PUSH_DIR");
  return dir && !isNetlify() ? dir : undefined;
}
