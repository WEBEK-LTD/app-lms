import "server-only";

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
  const ca = read("DATABASE_CA");
  return {
    url: required("DATABASE_URL"),
    ssl,
    ca: ca ? ca.replace(/\\n/g, "\n") : undefined,
  };
}

/** Password used to seed super admins in memory mode only (local runs and tests). */
export function memorySeedAdminPassword(): string | undefined {
  return read("YALLAPP_SEED_ADMIN_PASSWORD");
}

export function blobsMode(): "netlify" | "fs" {
  const explicit = read("YALLAPP_BLOBS");
  if (explicit === "netlify" || explicit === "fs") return explicit;
  return isNetlify() ? "netlify" : "fs";
}

export function blobsDir(): string {
  return read("YALLAPP_BLOBS_DIR") ?? ".data/blobs";
}
