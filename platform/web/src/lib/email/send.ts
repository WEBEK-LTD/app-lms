import "server-only";
import { DEFAULT_CONTACT } from "../contact";
import { getStore } from "../data";
import type { DataStore } from "../data/store";
import { sendMail } from "../mail";
import { platformSetting } from "../settings/platform";
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

/** Sends one of the platform's emails with its stored template. */
export async function sendTemplate(key: EmailTemplateKey, to: string, values: Record<string, TemplateValue>): Promise<RenderedEmail> {
  const email = await renderEmail(await getStore(), key, values);
  await sendMail({ to, ...email });
  return email;
}
