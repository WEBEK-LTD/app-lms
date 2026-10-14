import "server-only";
import { getStore } from "./data";
import type { DataStore } from "./data/store";
import { encryptionKey, isProduction, mailCaptureDir } from "./env";
import { DEFAULT_CONTACT } from "./contact";
import { platformSetting, resolvedSmtpConfig } from "./settings/platform";

export interface Mail {
  to: string;
  subject: string;
  text: string;
  /** The same message as HTML (templates from the admin, lib/email/send.ts). */
  html?: string;
}

/**
 * Sends service email through SMTP. Without SMTP settings the message is
 * printed to the server log in development only; in production it's dropped
 * with a warning that doesn't include the content (it may hold a reset link).
 * Emails from the admin's templates go through `sendTemplate` (lib/email/send.ts).
 */
export async function sendMail(input: Mail): Promise<void> {
  const store = await getStore();
  const contact = (await platformSetting(store, "contact"))?.value ?? DEFAULT_CONTACT;
  const mail = {
    ...input,
    text: input.text.replaceAll(WHATSAPP_PLACEHOLDER, contact.whatsapp),
    html: input.html?.replaceAll(WHATSAPP_PLACEHOLDER, contact.whatsapp),
  };
  const config = await resolvedSmtpConfig(store, encryptionKey());
  if (!config) {
    if (!isProduction() || process.env.YALLAPP_DATA === "memory") {
      console.info(`[mail] To: ${mail.to}\n[mail] Subject: ${mail.subject}\n${mail.text}\n`);
      await captureMail(mail);
    } else {
      console.warn(`[mail] SMTP is not configured; an email to ${mail.to} was not sent.`);
      await captureMail(mail);
    }
    return;
  }
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.pass ?? "" } : undefined,
    requireTLS: !config.secure,
  });
  await transport.sendMail({ from: config.from, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
}

/** 19 Whether SMTP is set up (in the admin's Settings or the server's variables). */
export async function smtpConfigured(store: DataStore): Promise<boolean> {
  return (await resolvedSmtpConfig(store, encryptionKey())) !== null;
}

/**
 * 19 Whether service email reaches anyone: through SMTP, or (outside
 * production) the server log. False in production without SMTP, where
 * sendMail drops messages with only a warning.
 */
export async function mailDelivered(store: DataStore): Promise<boolean> {
  if (!isProduction() || process.env.YALLAPP_DATA === "memory") return true;
  return smtpConfigured(store);
}

/** Replaced by sendMail with the WhatsApp number set in the admin. */
const WHATSAPP_PLACEHOLDER = "{{yallapp-whatsapp}}";

/** End-to-end tests: keeps the email as a file they can read (YALLAPP_MAIL_DIR, never on Netlify). */
async function captureMail(mail: Mail): Promise<void> {
  const dir = mailCaptureDir();
  if (!dir) return;
  const { mkdir, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.json`;
  await writeFile(path.join(dir, name), JSON.stringify({ ...mail, sentAt: new Date().toISOString() }));
}
