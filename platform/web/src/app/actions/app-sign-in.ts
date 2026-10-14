"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { recordStaffChange } from "@/lib/admin/audit";
import { getStore } from "@/lib/data";
import type { App, HostedSettings } from "@/lib/data/types";
import { DEFAULT_HOSTED_SETTINGS } from "@/lib/data/types";
import { encryptionKey, waabekApiUrl } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { appOtpSender, appWhatsappSender, parseAppWhatsappForm } from "@/lib/hosted/app-sender";
import { OtpSendError } from "@/lib/hosted/otp-sender";
import { parseAnyPhone } from "@/lib/hosted/phone";
import { parseHostedSettingsForm } from "@/lib/hosted/settings-form";
import { emailSignInNote, emailSignInPossible, parseSignInMethodsChoice } from "@/lib/hosted/sign-in-methods";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const FIELDS = ["signupAllowed", "askEmail", "askCity", "defaultCountryCode", "deviceLimit", "supportWhatsapp", "termsUrl", "reviewPhone", "reviewEmail", "reviewCode"];

/** 18 App sign-in is for apps on the hosted API and WordPress apps (the methods and the WhatsApp number). */
async function signInContext(hostedOnly = false) {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const app = context.app;
  if (!app || !(app.backend === "hosted" || (!hostedOnly && app.backend === "wordpress"))) redirect("/dashboard");
  return { context, app };
}

/** The settings with a change, keeping everything else that's saved (methods, the WhatsApp number, the rules). */
function withSettings(app: App, change: Partial<HostedSettings>): HostedSettings {
  return { ...DEFAULT_HOSTED_SETTINGS, ...(app.hostedSettings ?? {}), ...change };
}

/** For the audit log: the settings without the encrypted key. */
function auditable(settings: HostedSettings | null | undefined): unknown {
  if (!settings) return {};
  const { whatsappSender, ...rest } = settings;
  return { ...rest, whatsappSender: whatsappSender ? `WABEK key ending ${whatsappSender.keyLast4}, instance ${whatsappSender.instanceId ?? "any"}` : null };
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
  const store = await getStore();
  const next = withSettings(app, { signInMethods: methods });
  await store.updateApp(app.id, { hostedSettings: next }, new Date());
  await recordStaffChange(context, "Changed how people sign in to the app", { signInMethods: app.hostedSettings?.signInMethods ?? null }, { signInMethods: methods });
  revalidatePath("/dashboard/app-sign-in");
  return {
    ok: true,
    message:
      app.backend === "wordpress"
        ? "Saved. Your website gets it at the plugin's next license check (within 12 hours), or at once with Check now in the plugin."
        : "Saved. The app shows it the next time it opens; no new build is needed.",
    values: { methods: choice },
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
