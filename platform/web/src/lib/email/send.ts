import "server-only";
import { DEFAULT_CONTACT } from "../contact";
import { bothWhatsApp, whatsappLines } from "../contact-lines";
import { messagesFor } from "@/i18n";
import { getStore } from "../data";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { appUrl, encryptionKey } from "../env";
import { mailDelivered, sendMail } from "../mail";
import { platformSetting } from "../settings/platform";
import { appMailTarget, mailerWithFallback, recordOwnMailFailure, sendThroughServer, type MailAttachment, type MailMessage } from "./app-mail";
import { emailTemplate, renderTemplate, type EmailTemplateKey, type RenderedEmail, type TemplateText, type TemplateValue } from "./templates";
import { localizedDefault } from "./templates-lang";
import { langOf, type Lang } from "@/i18n/config";
import { relocalizeDate } from "@/i18n/format";

/** 56 The language of Yallapp's emails to this person: the one they chose for the dashboard, else English. */
export function emailLangOf(user: { language?: string | null }): Lang {
  return langOf(user.language);
}

/**
 * The template as the team saved it in the admin, or its default. Read from the database each time, so a save applies at once.
 * 56 Unedited emails to clients have Arabic and Turkish defaults (templates-lang.ts); an edit is one English text for every language.
 */
export async function templateText(store: DataStore, key: EmailTemplateKey, lang: Lang = "en"): Promise<TemplateText & { edited: boolean; lang: Lang }> {
  const definition = emailTemplate(key)!;
  const saved = await store.getEmailTemplate(key);
  if (saved) return { subject: saved.subject, body: saved.body, edited: true, lang: "en" };
  const localized = localizedDefault(key, lang);
  return localized ? { ...localized, edited: false, lang } : { subject: definition.subject, body: definition.body, edited: false, lang: "en" };
}

/**
 * Renders the template with these values (and Yallapp's contact details) without sending it.
 * 56 In Arabic or Turkish, a date written the English way ("31 Mar 2027") is written in that language.
 */
export async function renderEmail(
  store: DataStore,
  key: EmailTemplateKey,
  values: Record<string, TemplateValue>,
  text?: TemplateText,
  lang: Lang = "en",
): Promise<RenderedEmail> {
  const contact = (await platformSetting(store, "contact"))?.value ?? DEFAULT_CONTACT;
  const chosen = text ? { ...text, lang } : await templateText(store, key, lang);
  const local = Object.fromEntries(Object.entries(values).map(([name, value]) => [name, typeof value === "string" ? relocalizeDate(chosen.lang, value) : value]));
  return renderTemplate(chosen, { ...contactValues(contact, chosen.lang), ...local }, chosen.lang);
}

/** 72 Yallapp's contact details for an email in this language: both WhatsApp numbers, each with where it's for. */
export function contactValues(contact: { whatsapp: string; whatsappEgypt?: string; email: string }, lang: Lang): Record<string, string> {
  const lines = whatsappLines(contact);
  return {
    yallapp_whatsapp: bothWhatsApp(lines, messagesFor(lang).common),
    yallapp_whatsapp_egypt: lines.egypt.display,
    yallapp_whatsapp_international: lines.international.display,
    yallapp_email: contact.email,
  };
}

/**
 * Sends one of the platform's emails with its stored template. 24 With `app`,
 * the email goes to one of that app's users: through the app's own email
 * server when its owner set one (Yallapp's server steps in once when it
 * fails), else from Yallapp's address with the app's name. Emails to owners
 * and the team leave `app` out.
 */
export async function sendTemplate(
  key: EmailTemplateKey,
  to: string,
  values: Record<string, TemplateValue>,
  options: { app?: App; lang?: Lang; attachments?: MailAttachment[] } = {},
): Promise<RenderedEmail> {
  const store = await getStore();
  const email = await renderEmail(store, key, values, undefined, options.lang);
  // 71 A receipt's PDF goes with the payment emails.
  const attachments = options.attachments?.length ? { attachments: options.attachments } : {};
  if (options.app) await sendAppMail(store, options.app, { to, ...email, ...attachments });
  else await sendMail({ to, ...email, ...attachments });
  return email;
}

/** 24 Whether an email to this app's users can go out: through its own server, or Yallapp's (lib/mail.ts mailDelivered). */
export async function appMailDelivered(store: DataStore, app: Pick<App, "id" | "hostedSettings">): Promise<boolean> {
  return appMailTarget(app, encryptionKey()) !== null || (await mailDelivered(store));
}

/** 24 An email to one of the app's users (see sendTemplate). */
export async function sendAppMail(store: DataStore, app: App, message: MailMessage): Promise<void> {
  const target = appMailTarget(app, encryptionKey());
  // Without the app's own server, Yallapp's sends (or, outside production, logs) it as before.
  const platform = !target || (await mailDelivered(store)) ? (m: MailMessage) => sendMail(m, { fromName: app.appName?.trim() || undefined }) : null;
  const now = new Date();
  const mailer = mailerWithFallback(target ? (m) => sendThroughServer(target, m) : null, platform, (reason) =>
    recordOwnMailFailure({ store, now, baseUrl: appUrl(), mail: (key, to, values, options) => sendTemplate(key, to, values, options) }, app.id, reason),
  );
  await mailer!(message);
}
