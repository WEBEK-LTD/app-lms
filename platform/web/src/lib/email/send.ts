import "server-only";
import { DEFAULT_CONTACT } from "../contact";
import { getStore } from "../data";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { appUrl, encryptionKey } from "../env";
import { mailDelivered, sendMail } from "../mail";
import { platformSetting } from "../settings/platform";
import { appMailTarget, mailerWithFallback, recordOwnMailFailure, sendThroughServer, type MailMessage } from "./app-mail";
import { emailTemplate, renderTemplate, type EmailTemplateKey, type RenderedEmail, type TemplateText, type TemplateValue } from "./templates";

/** The template as the team saved it in the admin, or its default. Read from the database each time, so a save applies at once. */
export async function templateText(store: DataStore, key: EmailTemplateKey): Promise<TemplateText & { edited: boolean }> {
  const definition = emailTemplate(key)!;
  const saved = await store.getEmailTemplate(key);
  return saved ? { subject: saved.subject, body: saved.body, edited: true } : { subject: definition.subject, body: definition.body, edited: false };
}

/** Renders the template with these values (and Yallapp's contact details) without sending it. */
export async function renderEmail(store: DataStore, key: EmailTemplateKey, values: Record<string, TemplateValue>, text?: TemplateText): Promise<RenderedEmail> {
  const contact = (await platformSetting(store, "contact"))?.value ?? DEFAULT_CONTACT;
  return renderTemplate(text ?? (await templateText(store, key)), { yallapp_whatsapp: contact.whatsapp, yallapp_email: contact.email, ...values });
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
  options: { app?: App } = {},
): Promise<RenderedEmail> {
  const store = await getStore();
  const email = await renderEmail(store, key, values);
  if (options.app) await sendAppMail(store, options.app, { to, ...email });
  else await sendMail({ to, ...email });
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
    recordOwnMailFailure({ store, now, baseUrl: appUrl(), mail: (key, to, values) => sendTemplate(key, to, values) }, app.id, reason),
  );
  await mailer!(message);
}
