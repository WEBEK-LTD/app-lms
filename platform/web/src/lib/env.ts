import "server-only";
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

/** 32-byte key for AES-256-GCM, given as 64 hex characters or base64. */
export function encryptionKey(): Buffer {
  const raw = required("ENCRYPTION_KEY");
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must decode to 32 bytes (64 hex characters or base64).");
  return key;
}

export function buildPipelineToken(): string | undefined {
  return read("BUILD_PIPELINE_TOKEN");
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
 * - "log": keeps codes in memory; local runs and tests only.
 * Null when nothing is configured: requests fail with `provider_error`.
 */
export type OtpSenderConfig =
  | { kind: "whatsapp"; accessToken: string; phoneNumberId: string; template: string; language: string }
  | { kind: "webhook"; url: string; secret: string }
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

export interface DatabaseConfig {
  url: string;
  ssl: "required" | "disabled";
  ca?: string;
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

// 11.4 Email templates

/**
 * Local runs and tests only (never on Netlify): emails that would go to the log are
 * also written to this folder as JSON, so the tests can read what was sent.
 */
export function mailCaptureDir(): string | undefined {
  const dir = read("YALLAPP_MAIL_DIR");
  return dir && !isNetlify() ? dir : undefined;
}
