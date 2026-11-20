import "server-only";
import { appLogoUrl } from "../assets";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { customerLang } from "../receipts/service";
import { appCodeEmail, appWelcomeEmail, type AppBrand, type CodePurpose, type RenderedAppEmail } from "./app-user-emails";
import { renderEmail, sendAppMail } from "./send";
import type { EmailTemplateKey, TemplateValue } from "./templates";

/** 199 The app's look and the customer's language (`wanted`: the app's Accept-Language). */
export async function appBrandFor(store: DataStore, app: App, wanted?: string | null): Promise<AppBrand> {
  return { lang: await customerLang(store, app, wanted), appName: app.appName?.trim() || "—", logoUrl: appLogoUrl(app), brand: app.primaryColor };
}

/** A template the team edited in the admin keeps its words for the subject and the text part; the look stays the app's. */
async function withEdits(store: DataStore, key: EmailTemplateKey, email: RenderedAppEmail, values: Record<string, TemplateValue>): Promise<RenderedAppEmail> {
  if (!(await store.getEmailTemplate(key))) return email;
  const edited = await renderEmail(store, key, values);
  return { ...email, subject: edited.subject, text: edited.text };
}

/** 199 The sign-in (or reset) code, in the app's look. */
export async function sendAppCodeEmail(store: DataStore, app: App, input: { to: string; code: string; minutes: number; wanted?: string | null; purpose?: CodePurpose }): Promise<void> {
  const brand = await appBrandFor(store, app, input.wanted);
  const email = await withEdits(store, "sign_in_code", appCodeEmail(brand, input), { app_name: brand.appName, code: input.code, minutes: String(input.minutes) });
  await sendAppMail(store, app, { to: input.to, ...email });
}

/** 199 The welcome after signing up, in the app's look. */
export async function sendAppWelcome(store: DataStore, app: App, input: { to: string; name: string; wanted?: string | null }): Promise<void> {
  const brand = await appBrandFor(store, app, input.wanted);
  const email = await withEdits(store, "app_welcome", appWelcomeEmail(brand, input), { app_name: brand.appName, name: input.name });
  await sendAppMail(store, app, { to: input.to, ...email });
}
