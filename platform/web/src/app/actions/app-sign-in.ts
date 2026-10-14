"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { recordStaffChange } from "@/lib/admin/audit";
import { getStore } from "@/lib/data";
import type { App, HostedSettings } from "@/lib/data/types";
import { DEFAULT_HOSTED_SETTINGS } from "@/lib/data/types";
import { appMailFormValues, appMailServer, appMailTarget, parseAppMailForm, sendThroughServer, type AppMailFormValues } from "@/lib/email/app-mail";
import { encryptionKey, isProduction, waabekApiUrl } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { appOtpSender, appWhatsappSender, parseAppWhatsappForm } from "@/lib/hosted/app-sender";
import { OtpSendError } from "@/lib/hosted/otp-sender";
import { parseAnyPhone } from "@/lib/hosted/phone";
import { parseHostedSettingsForm } from "@/lib/hosted/settings-form";
import { emailSignInNote, emailSignInPossible, normalizeEmail, parseEmailSignInChoice, parseSignInMethodsChoice } from "@/lib/hosted/sign-in-methods";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const FIELDS = ["signupAllowed", "askEmail", "askCity", "defaultCountryCode", "deviceLimit", "supportWhatsapp", "termsUrl", "reviewPhone", "reviewEmail", "reviewCode"];

/**
 * 18 App sign-in is for apps on the hosted API and WordPress apps (the methods
 * and the WhatsApp number). 19 Also for apps waiting for the WordPress site
 * our team sets up: their choice applies once the site is ready.
 */
async function signInContext(hostedOnly = false) {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const app = context.app;
  const wordpress = app?.backend === "wordpress" || app?.backend === "setup_requested";
  if (!app || !(app.backend === "hosted" || (!hostedOnly && wordpress))) redirect("/dashboard");
  return { context, app };
}

/** The settings with a change, keeping everything else that's saved (methods, the WhatsApp number, the rules). */
function withSettings(app: App, change: Partial<HostedSettings>): HostedSettings {
  return { ...DEFAULT_HOSTED_SETTINGS, ...(app.hostedSettings ?? {}), ...change };
}

/** For the audit log: the settings without the encrypted key and password. */
function auditable(settings: HostedSettings | null | undefined): unknown {
  if (!settings) return {};
  const { whatsappSender, mailServer, ...rest } = settings;
  return {
    ...rest,
    whatsappSender: whatsappSender ? `WABEK key ending ${whatsappSender.keyLast4}, instance ${whatsappSender.instanceId ?? "any"}` : null,
    // 24 The own email server, without its password.
    mailServer: mailServer ? `${mailServer.username} at ${mailServer.host}:${mailServer.port} (${mailServer.security}), from ${mailServer.fromName} <${mailServer.fromAddress}>` : null,
  };
}

/** Sign-in rules of an app on the hosted API. */
export async function saveAppSignInAction(_: FormState, formData: FormData): Promise<FormState> {
  const { context, app } = await signInContext(true);
  const values: Record<string, string> = {};
  for (const name of FIELDS) values[name] = String(formData.get(name) ?? "").trim();
  const parsed = parseHostedSettingsForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const store = await getStore();
  const next = withSettings(app, parsed.value);
  await store.updateApp(app.id, { hostedSettings: next }, new Date());
  await recordStaffChange(context, "Saved the app sign-in rules", auditable(app.hostedSettings), auditable(next));
  revalidatePath("/dashboard/app-sign-in");
  return { ok: true, message: "Saved. The app uses these rules now; no new build is needed.", values };
}

/** 18 How people sign in: phone, email or both. */
export async function saveSignInMethodsAction(_: FormState, formData: FormData): Promise<FormState> {
  const { context, app } = await signInContext();
  const choice = String(formData.get("methods") ?? "");
  const methods = parseSignInMethodsChoice(choice);
  if (!methods) return { errors: { methods: "Choose how people sign in." }, values: { methods: choice } };
  if (methods.includes("email") && !emailSignInPossible(app)) {
    // 19 The reason for this app's platform (a shop or booking platform finds customers by phone).
    return {
      errors: { methods: emailSignInNote(app) ?? "This app signs in by phone." },
      values: { methods: choice },
    };
  }
  // 24 WordPress: with a code (anyone, new people get an account) or with their password (existing accounts).
  const wordpress = app.backend === "wordpress" || app.backend === "setup_requested";
  const emailChoice = String(formData.get("emailSignIn") ?? "");
  const emailSignIn = wordpress ? parseEmailSignInChoice(emailChoice) : null;
  if (wordpress && methods.includes("email") && !emailSignIn) {
    return { errors: { emailSignIn: "Choose how email sign-in works." }, values: { methods: choice, emailSignIn: emailChoice } };
  }
  const store = await getStore();
  const next = withSettings(app, wordpress && emailSignIn ? { signInMethods: methods, emailSignIn } : { signInMethods: methods });
  await store.updateApp(app.id, { hostedSettings: next }, new Date());
  await recordStaffChange(
    context,
    "Changed how people sign in to the app",
    { signInMethods: app.hostedSettings?.signInMethods ?? null, emailSignIn: app.hostedSettings?.emailSignIn ?? null },
    { signInMethods: methods, emailSignIn: next.emailSignIn ?? null },
  );
  revalidatePath("/dashboard/app-sign-in");
  return {
    ok: true,
    message:
      app.backend === "setup_requested"
        ? "Saved. It applies as soon as your WordPress site and the Yallapp plugin are ready."
        : app.backend === "wordpress"
        ? "Saved. Your website picks it up within 12 hours, or right away when you click Check now in the Yallapp plugin."
        : "Saved. The app shows it the next time it opens; no new build is needed.",
    values: { methods: choice, emailSignIn: next.emailSignIn ?? "" },
  };
}

/** 18 The owner's own WhatsApp number on WABEK, for this app's phone codes. */
export async function saveAppWhatsappAction(_: FormState, formData: FormData): Promise<FormState> {
  const { context, app } = await signInContext();
  const instance = String(formData.get("instanceId") ?? "");
  const parsed = parseAppWhatsappForm({ apiKey: String(formData.get("apiKey") ?? ""), instanceId: instance });
  // The key is never sent back to the form.
  if (!parsed.ok) return { errors: parsed.errors, values: { instanceId: instance } };
  const store = await getStore();
  const sender = appWhatsappSender(app.id, parsed.apiKey, parsed.instanceId, encryptionKey(), new Date());
  const next = withSettings(app, { whatsappSender: sender, whatsappFailedAt: null });
  await store.updateApp(app.id, { hostedSettings: next }, new Date());
  await recordStaffChange(context, "Connected the app's own WhatsApp number", auditable(app.hostedSettings), auditable(next));
  revalidatePath("/dashboard/app-sign-in");
  return { ok: true, message: "Saved. Send a test code to check it.", values: { instanceId: parsed.instanceId ?? "" } };
}

/** 18 Back to Yallapp's WhatsApp number. */
export async function removeAppWhatsappAction(): Promise<void> {
  const { context, app } = await signInContext();
  const store = await getStore();
  const next = withSettings(app, { whatsappSender: null, whatsappFailedAt: null });
  await store.updateApp(app.id, { hostedSettings: next }, new Date());
  await recordStaffChange(context, "Removed the app's own WhatsApp number", auditable(app.hostedSettings), auditable(next));
  revalidatePath("/dashboard/app-sign-in");
}

/** 18 Sends a test code from the owner's own number to a number they choose. */
export async function testAppWhatsappAction(_: FormState, formData: FormData): Promise<FormState> {
  const { context, app } = await signInContext();
  const raw = String(formData.get("phone") ?? "").trim();
  const phone = parseAnyPhone(raw, app.hostedSettings?.defaultCountryCode ?? DEFAULT_HOSTED_SETTINGS.defaultCountryCode);
  if (!phone) return { errors: { phone: "Enter a phone number with its country code, like +90 532 123 45 67." }, values: { phone: raw } };
  const sender = appOtpSender(app, encryptionKey(), waabekApiUrl());
  if (!sender) return { ok: false, message: "Save your WABEK API key first.", values: { phone: raw } };
  const store = await getStore();
  const limit = await hitRateLimit(store, RATE_LIMITS.appWhatsappTest, app.id);
  if (!limit.allowed) return { ok: false, message: `You sent several test codes. Try again in ${Math.ceil(limit.retryAfter / 60)} minutes.`, values: { phone: raw } };
  try {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await sender.send({ phone: phone.e164, code, appName: app.appName?.trim() || "Your app", expiresInSeconds: 300 });
  } catch (e) {
    const reason = e instanceof OtpSendError ? e.message : "WABEK couldn't be reached.";
    return { ok: false, message: `The test code wasn't sent: ${reason} Check the API key and the instance ID in your WABEK account.`, values: { phone: raw } };
  }
  await recordStaffChange(context, "Sent a test code from the app's own WhatsApp number");
  // 19 The number works again: the warning about its last failure goes away.
  if (app.hostedSettings?.whatsappFailedAt) {
    await store.updateApp(app.id, { hostedSettings: withSettings(app, { whatsappFailedAt: null }) }, new Date());
    revalidatePath("/dashboard/app-sign-in");
  }
  return { ok: true, message: `A test code was sent to ${phone.e164} from your WhatsApp number. If it arrived, your app's codes go out from it.`, values: { phone: raw } };
}

const MAIL_FIELDS = ["sender", "preset", "host", "port", "security", "username", "password", "fromName", "fromAddress", "replyTo"] as const;

/** 24 Who sends the emails to the app's users: Yallapp, or the owner's own email server. */
export async function saveAppMailAction(_: FormState, formData: FormData): Promise<FormState> {
  const { context, app } = await signInContext();
  const raw = Object.fromEntries(MAIL_FIELDS.map((name) => [name, String(formData.get(name) ?? "")])) as unknown as AppMailFormValues;
  const saved = app.hostedSettings?.mailServer ?? null;
  const parsed = parseAppMailForm(raw, { production: isProduction(), saved });
  // The password is never sent back to the form.
  const values: Record<string, string> = { ...raw, password: "" };
  if (!parsed.ok) return { errors: parsed.errors, values };
  const store = await getStore();
  const now = new Date();
  const next =
    parsed.sender === "yallapp"
      ? withSettings(app, { mailServer: null, mailFailedAt: null, mailFailedReason: null })
      : withSettings(app, { mailServer: appMailServer(app.id, parsed.server, parsed.password, saved, encryptionKey(), now), mailFailedAt: null, mailFailedReason: null });
  await store.updateApp(app.id, { hostedSettings: next }, now);
  await recordStaffChange(
    context,
    parsed.sender === "yallapp" ? "Chose Yallapp to send the app's emails" : "Saved the app's own email server",
    auditable(app.hostedSettings),
    auditable(next),
  );
  revalidatePath("/dashboard/app-sign-in");
  if (parsed.sender === "yallapp") return { ok: true, message: "Saved. Yallapp sends your app's emails, from Yallapp's address with your app's name.", values: appMailFormValues({ ...app, hostedSettings: next }) };
  return {
    ok: true,
    message: ["Saved. Send a test email to check that your server sends it.", ...parsed.warnings].join(" "),
    values: appMailFormValues({ ...app, hostedSettings: next }),
  };
}

/** 24 Sends a test email through the saved own server, to an address the owner types. */
export async function testAppMailAction(_: FormState, formData: FormData): Promise<FormState> {
  const { context, app } = await signInContext();
  const raw = String(formData.get("to") ?? "").trim();
  const to = normalizeEmail(raw);
  if (!to) return { errors: { to: "Enter the email address to send the test to." }, values: { to: raw } };
  const target = appMailTarget(app, encryptionKey());
  if (!target) return { ok: false, message: "Save your email server first.", values: { to: raw } };
  const store = await getStore();
  const limit = await hitRateLimit(store, RATE_LIMITS.appMailTest, app.id);
  if (!limit.allowed) return { ok: false, message: `You sent several test emails. Try again in ${Math.ceil(limit.retryAfter / 60)} minutes.`, values: { to: raw } };
  const name = app.appName?.trim() || "Your app";
  try {
    await sendThroughServer(target, {
      to,
      subject: `Test email from ${name}`,
      text:
        `This is a test from the Yallapp dashboard, sent through your email server (${target.host}).\n\n` +
        `It worked: emails to the people using ${name}, like sign-in codes, go out from ${target.from.address}.`,
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : "The email server couldn't be reached.";
    return { ok: false, message: `The test email wasn't sent. ${reason}`, values: { to: raw } };
  }
  await recordStaffChange(context, "Sent a test email from the app's own email server");
  // The server works again: the warning about its last failure goes away.
  if (app.hostedSettings?.mailFailedAt) {
    await store.updateApp(app.id, { hostedSettings: withSettings(app, { mailFailedAt: null, mailFailedReason: null }) }, new Date());
    revalidatePath("/dashboard/app-sign-in");
  }
  return { ok: true, message: `A test email was sent to ${to} from ${target.from.address}. If it arrived (check the spam folder too), your app's emails go out from your server.`, values: { to: raw } };
}
