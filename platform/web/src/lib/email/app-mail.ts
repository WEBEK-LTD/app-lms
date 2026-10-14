import { appLabel } from "../app/label";
import { isPrivateAddress, resolveHost } from "../app/api-check";
import { decrypt, encrypt } from "../crypto/encryption";
import type { DataStore } from "../data/store";
import { DEFAULT_HOSTED_SETTINGS, type App, type AppMailServer } from "../data/types";
import { failureDate } from "../hosted/app-sender";
import { normalizeEmail } from "../hosted/sign-in-methods";
import { hitRateLimit, RATE_LIMITS } from "../rate-limit";
import { MAIL_PORTS, MAIL_PRESETS, type MailSecurity } from "./app-mail-presets";

/**
 * 24 An app's own email server (App sign-in › "Your app's email"): emails to
 * the app's own users (sign-in codes from the hosted API and for a WordPress
 * site) go out from the owner's address through their server. Without one,
 * Yallapp's server sends them from Yallapp's address with the app's name.
 * Emails to the owner and their team always go out from Yallapp's server.
 *
 * The platform connects only to public addresses on the usual email ports,
 * to the address it checked (no second lookup), and gives up after about 10
 * seconds. Errors reach the owner and the log in plain words, never with the
 * password.
 */

const context = (appId: string) => `app-smtp:${appId}`;

/** How long to wait for the server to answer (connecting, greeting, DNS). */
export const MAIL_TIMEOUT_MS = 10_000;

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Sends one email, or throws. */
export type Mailer = (message: MailMessage) => Promise<void>;

/** One connection to an email server, as the transport gets it. */
export interface SmtpTarget {
  /** The server's name, for its TLS certificate. */
  host: string;
  /** The checked address to connect to. */
  address: string;
  port: number;
  security: MailSecurity;
  username: string;
  password: string;
  from: { name: string; address: string };
  replyTo: string | null;
}

/** Talks SMTP: nodemailer on the server, a fake in tests. */
export type SmtpTransport = (target: SmtpTarget, message: MailMessage) => Promise<void>;

export const nodemailerTransport: SmtpTransport = async (target, message) => {
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: target.address,
    servername: target.host,
    port: target.port,
    secure: target.security === "ssl",
    requireTLS: target.security === "starttls",
    ignoreTLS: target.security === "none",
    auth: { user: target.username, pass: target.password },
    connectionTimeout: MAIL_TIMEOUT_MS,
    greetingTimeout: MAIL_TIMEOUT_MS,
    socketTimeout: 2 * MAIL_TIMEOUT_MS,
    dnsTimeout: MAIL_TIMEOUT_MS,
  });
  try {
    await transport.sendMail({
      from: target.from,
      to: message.to,
      replyTo: target.replyTo ?? undefined,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  } finally {
    transport.close();
  }
};

/** Why an email couldn't go out, in words the owner understands. Never holds the password. */
export class AppMailError extends Error {
  constructor(
    readonly kind: "auth" | "dns" | "refused" | "timeout" | "tls" | "sender" | "blocked" | "other",
    message: string,
  ) {
    super(message);
    this.name = "AppMailError";
  }
}

/* ------------------------------------------------------------------ form */

export type AppMailFormValues = {
  sender: string;
  preset: string;
  host: string;
  port: string;
  security: string;
  username: string;
  password: string;
  fromName: string;
  fromAddress: string;
  replyTo: string;
};

export type AppMailServerInput = Omit<AppMailServer, "passwordEncrypted" | "savedAt">;

export type ParsedAppMailForm =
  | { ok: true; sender: "yallapp" }
  | { ok: true; sender: "own"; server: AppMailServerInput; /** Null: keep the saved one. */ password: string | null; warnings: string[] }
  | { ok: false; errors: Record<string, string> };

const HOST = /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
const CONTROL = /[\p{Cc}\p{Cf}]/u;

const domainOf = (address: string) => address.slice(address.lastIndexOf("@") + 1).toLowerCase();

/**
 * Validates "Your app's email". A blank password keeps the saved one; "None"
 * as security only outside production.
 */
export function parseAppMailForm(values: AppMailFormValues, options: { production: boolean; saved: AppMailServer | null }): ParsedAppMailForm {
  if (values.sender === "yallapp") return { ok: true, sender: "yallapp" };
  if (values.sender !== "own") return { ok: false, errors: { sender: "Choose who sends your app's emails." } };
  const errors: Record<string, string> = {};
  const preset = MAIL_PRESETS.find((p) => p.id === values.preset)?.id ?? "custom";

  const host = values.host.trim().toLowerCase().replace(/\.$/, "");
  if (!host) errors.host = "Enter the email server, like smtp.example.com.";
  else if (host === "localhost" || host.endsWith(".localhost") || (/^[\d.]+$/.test(host) && isPrivateAddress(host)) || host.includes(":")) {
    errors.host = "This is a local or private address. Enter your email service's public server name, like smtp.example.com.";
  } else if (!HOST.test(host) && !/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) errors.host = "Enter a server name like smtp.example.com.";

  const port = Number(values.port.trim());
  if (!MAIL_PORTS.includes(port)) errors.port = "Use port 465, 587, 25 or 2525.";

  const security = values.security === "ssl" || values.security === "starttls" || values.security === "none" ? values.security : null;
  if (!security) errors.security = "Choose the security: SSL/TLS or STARTTLS.";
  else if (security === "none" && options.production) errors.security = "Choose SSL/TLS or STARTTLS: the connection to your email server must be encrypted.";

  const username = values.username.trim();
  if (!username) errors.username = "Enter the username, usually your full email address.";
  else if (username.length > 191 || /\s/.test(username) || CONTROL.test(username)) errors.username = "Enter the username without spaces.";

  const password = values.password;
  if (password.length > 256 || CONTROL.test(password)) errors.password = "That password is too long or has characters it can't have.";
  else if (!password && !options.saved) errors.password = "Enter the password (or app password) of this mailbox.";

  const fromName = values.fromName.replace(/\s+/g, " ").trim();
  if (!fromName) errors.fromName = "Enter the name people see, like your app's name.";
  else if (fromName.length > 80 || CONTROL.test(fromName) || /[<>"]/.test(fromName)) errors.fromName = "Use at most 80 characters, without < > or \".";

  const fromAddress = normalizeEmail(values.fromAddress);
  if (!fromAddress) errors.fromAddress = "Enter a valid email address, like hello@your-site.com.";

  const replyRaw = values.replyTo.trim();
  const replyTo = replyRaw ? normalizeEmail(replyRaw) : null;
  if (replyRaw && !replyTo) errors.replyTo = "Enter a valid email address, or leave it empty.";

  if (Object.keys(errors).length || !security || !fromAddress) return { ok: false, errors };
  const warnings: string[] = [];
  const login = normalizeEmail(username);
  if (login && domainOf(login) !== domainOf(fromAddress)) {
    warnings.push(
      `The From address (${fromAddress}) isn't at the same domain as the username (${login}). Some email services refuse to send from another address, or mark it as spam: send a test email to check.`,
    );
  }
  return {
    ok: true,
    sender: "own",
    server: { preset, host, port, security, username, fromName, fromAddress, replyTo },
    password: password ? password : null,
    warnings,
  };
}

/** The saved form, with the password encrypted (a blank password keeps the saved one). */
export function appMailServer(appId: string, input: AppMailServerInput, password: string | null, saved: AppMailServer | null, encryptionKey: Buffer, now: Date): AppMailServer {
  const passwordEncrypted = password !== null ? encrypt(password, encryptionKey, context(appId)) : saved?.passwordEncrypted;
  if (!passwordEncrypted) throw new Error("A password is needed for a new email server.");
  return { ...input, passwordEncrypted, savedAt: now.toISOString() };
}

/** The form's values for the saved server (never the password). */
export function appMailFormValues(app: Pick<App, "appName" | "hostedSettings">): AppMailFormValues {
  const saved = app.hostedSettings?.mailServer ?? null;
  const google = MAIL_PRESETS[0]!;
  return {
    sender: saved ? "own" : "yallapp",
    preset: saved?.preset ?? google.id,
    host: saved?.host ?? google.host,
    port: String(saved?.port ?? google.ports[0]!.port),
    security: saved?.security ?? google.ports[0]!.security,
    username: saved?.username ?? "",
    password: "",
    fromName: saved?.fromName ?? (app.appName?.trim() || ""),
    fromAddress: saved?.fromAddress ?? "",
    replyTo: saved?.replyTo ?? "",
  };
}

/* ------------------------------------------------------------- sending */

/** The app's own server, ready to connect, or null when it has none (or the password can't be read). */
export function appMailTarget(app: Pick<App, "id" | "hostedSettings">, encryptionKey: Buffer): Omit<SmtpTarget, "address"> | null {
  const saved = app.hostedSettings?.mailServer;
  if (!saved) return null;
  let password: string;
  try {
    password = decrypt(saved.passwordEncrypted, encryptionKey, context(app.id));
  } catch {
    return null;
  }
  return {
    host: saved.host,
    port: saved.port,
    security: saved.security,
    username: saved.username,
    password,
    from: { name: saved.fromName, address: saved.fromAddress },
    replyTo: saved.replyTo,
  };
}

type Resolve = (host: string) => Promise<string[]>;

/** The public address to connect to, or an AppMailError: only the usual email ports, never a private or local address. */
export async function checkMailHost(host: string, port: number, resolve: Resolve = resolveHost): Promise<string> {
  if (!MAIL_PORTS.includes(port)) throw new AppMailError("blocked", "Use port 465, 587, 25 or 2525.");
  let addresses: string[];
  try {
    addresses = await withTimeout(resolve(host), MAIL_TIMEOUT_MS);
  } catch {
    addresses = [];
  }
  if (addresses.length === 0) throw new AppMailError("dns", `We couldn't find the email server ${host}. Check the server name.`);
  if (addresses.some(isPrivateAddress)) {
    throw new AppMailError("blocked", `${host} points to a local or private address, which Yallapp doesn't connect to. Enter your email service's public server name.`);
  }
  return addresses[0]!;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/** Removes the password (as typed and as SMTP AUTH encodes it) from a server's answer. */
function redact(text: string, target: Pick<SmtpTarget, "username" | "password">): string {
  const secrets = [
    target.password,
    Buffer.from(target.password).toString("base64"),
    Buffer.from(`\u0000${target.username}\u0000${target.password}`).toString("base64"),
  ].filter((s) => s.length >= 3);
  let out = text;
  for (const secret of secrets) out = out.split(secret).join("••••");
  return out;
}

/** An email server's error in plain words, with its own short answer when it gave one (never the password). */
export function explainMailError(error: unknown, target: Pick<SmtpTarget, "host" | "port" | "username" | "password">): string {
  if (error instanceof AppMailError) return error.message;
  const e = (typeof error === "object" && error !== null ? error : {}) as { code?: unknown; responseCode?: unknown; response?: unknown; message?: unknown };
  const code = typeof e.code === "string" ? e.code : "";
  const status = typeof e.responseCode === "number" ? e.responseCode : 0;
  const raw = typeof e.message === "string" ? e.message : String(error);
  const said = typeof e.response === "string" ? redact(e.response.replace(/\s+/g, " ").trim(), target).slice(0, 160) : "";
  const withAnswer = (text: string) => (said ? `${text} The server said: "${said}"` : text);
  if (code === "EAUTH" || code === "ENOAUTH" || status === 535 || status === 534 || status === 530) {
    return withAnswer("The email server refused the username or password. Check both; Google, Microsoft, Zoho and Yandex need an app password here.");
  }
  if (code === "EDNS" || /ENOTFOUND|EAI_AGAIN/.test(raw)) return `We couldn't find the email server ${target.host}. Check the server name.`;
  if (/ECONNREFUSED/.test(raw)) return `The email server ${target.host} refused the connection on port ${target.port}. Check the port.`;
  if (code === "ETIMEDOUT" || /ETIMEDOUT|timed? ?out/i.test(raw)) {
    return `The email server ${target.host} didn't answer on port ${target.port} within 10 seconds. Check the server name and the port.`;
  }
  if (code === "ETLS" || code === "EREQUIRETLS" || /SSL|TLS|certificate|wrong version number|EPROTO|self[- ]signed/i.test(raw)) {
    return "The secure connection to the email server failed. Check the security: port 465 uses SSL/TLS and port 587 STARTTLS.";
  }
  if (code === "EENVELOPE" || status === 550 || status === 551 || status === 553 || status === 554 || status === 501) {
    return withAnswer("The email server refused to send this email: it may not allow this From address. Send from the mailbox's own address.");
  }
  if (code === "ECONNECTION" || code === "ESOCKET" || /ECONNRESET|EHOSTUNREACH|ENETUNREACH/.test(raw)) {
    return `The connection to the email server ${target.host} on port ${target.port} failed. Check the server name and the port.`;
  }
  return withAnswer("The email server didn't accept the email.");
}

/**
 * Sends through the owner's server: checks the host first, connects to the
 * checked address, and turns any failure into an AppMailError in plain words.
 */
export async function sendThroughServer(
  target: Omit<SmtpTarget, "address">,
  message: MailMessage,
  options: { transport?: SmtpTransport; resolve?: Resolve } = {},
): Promise<void> {
  const address = await checkMailHost(target.host, target.port, options.resolve);
  try {
    await (options.transport ?? nodemailerTransport)({ ...target, address }, message);
  } catch (e) {
    throw new AppMailError(e instanceof AppMailError ? e.kind : "other", explainMailError(e, target));
  }
}

/**
 * The mailer for emails to an app's users: the owner's server when they set
 * one, else Yallapp's. When the own server fails, the email goes out once
 * more from Yallapp's server (when it can deliver), so the person still gets
 * it, and `onOwnFailed` hears why (to keep it on the app and tell the owner).
 * The failure is logged in plain words, never with the password or the email.
 */
export function mailerWithFallback(own: Mailer | null, platform: Mailer | null, onOwnFailed: (reason: string) => Promise<void>): Mailer | null {
  if (!own) return platform;
  return async (message) => {
    try {
      await own(message);
      return;
    } catch (e) {
      const reason = (e instanceof Error ? e.message : String(e)).slice(0, 400);
      console.error(`[mail] the app's own email server didn't send an email: ${reason}${platform ? " Sending it from Yallapp's server." : ""}`);
      try {
        await onOwnFailed(reason);
      } catch (report) {
        console.error("[mail] couldn't record the own email server's failure", report);
      }
      if (!platform) throw e;
    }
    await platform(message);
  };
}

export interface OwnMailFailureDeps {
  store: DataStore;
  now: Date;
  /** The platform's address, for the link in the email. */
  baseUrl: string;
  /** Sends the "own_email_failed" email (from Yallapp's server). */
  mail: (key: "own_email_failed", to: string, values: Record<string, string>) => Promise<unknown>;
}

/**
 * The owner's own email server failed: kept on the app with the reason (App
 * sign-in shows it) and the owner gets an email, at most one per app a day.
 */
export async function recordOwnMailFailure(deps: OwnMailFailureDeps, appId: string, reason: string): Promise<void> {
  const app = await deps.store.getAppById(appId);
  if (!app?.hostedSettings?.mailServer) return;
  const at = deps.now.toISOString();
  await deps.store.updateApp(
    app.id,
    { hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...app.hostedSettings, mailFailedAt: at, mailFailedReason: reason.slice(0, 400) } },
    deps.now,
  );
  if (app.demo) return;
  const limit = await hitRateLimit(deps.store, RATE_LIMITS.ownMailFailedMail, app.id, deps.now);
  if (!limit.allowed) return;
  const client = await deps.store.getClientById(app.clientId);
  const owner = client ? await deps.store.getUserById(client.userId) : null;
  if (!owner) return;
  const link = new URLSearchParams({ app: app.id, to: "app-sign-in" });
  await deps.mail("own_email_failed", owner.email, {
    name: owner.name,
    app_name: appLabel(app),
    date: failureDate(at),
    reason: reason.slice(0, 400),
    sign_in_url: `${deps.baseUrl.replace(/\/+$/, "")}/dashboard/open?${link.toString()}`,
  });
}

/** Yallapp's address with this name in front: `"Nour Academy" <info@…>`. */
export function fromWithName(from: string, name: string): { name: string; address: string } | string {
  const address = /<([^>]+)>\s*$/.exec(from)?.[1]?.trim() ?? from.trim();
  const clean = name.replace(/[\p{Cc}\p{Cf}<>"]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return clean && address.includes("@") ? { name: clean, address } : from;
}
