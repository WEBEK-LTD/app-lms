"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { recordAudit, type AuditInput } from "@/lib/admin/audit";
import { requireAdmin, type AdminUser } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { OtpSetting, PlatformSettingKey, PlatformSettingValues, SmtpSetting, StoragePackOffer } from "@/lib/data/types";
import { decrypt, encrypt } from "@/lib/crypto/encryption";
import { appUrl, encryptionKey, iyzicoApiUrl, paymentApiUrls, sessionSecret, WAABEK_API_URL } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { sendMail } from "@/lib/mail";
import { parsePrice } from "@/lib/catalog/money";
import { otpSenderFrom } from "@/lib/hosted/otp-sender";
import { checkTestCode, OTP_TEST_TTL_SECONDS, sendTestCode, type OtpTestTicket } from "@/lib/hosted/otp-test";
import { parseAnyPhone } from "@/lib/hosted/phone";
import { checkIyzicoKeys } from "@/lib/payments/iyzico";
import { validKashierMerchantId } from "@/lib/payments/kashier";
import { checkAccount, isPaymentProvider, PROVIDER_NAME } from "@/lib/payments/provider";
import { readRate } from "@/lib/billing/prices";
import { cardPlans } from "@/lib/billing/plan-payment";
import {
  isPlan,
  PLAN_FEATURE_IDS,
  PLAN_INFO,
  planPriceOf,
  planSettingOf,
  plansWith,
  SUPPORT_LEVELS,
  type Plan,
  type PlanInfo,
  type PlanLimits,
  type PlanSetting,
  type SupportLevel,
} from "@/lib/plans";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { refreshPlanSitesSoon } from "@/lib/license/refresh-soon";
import { newId } from "@/lib/crypto/tokens";
import { storageKeyOf } from "@/lib/media/signing";
import { getMediaStorage } from "@/lib/media/storage";
import { clearPlatformSettingsCache, encryptSetting, getPlans, platformSetting, resolvedOtpSenderConfig, yallappAccountFor } from "@/lib/settings/platform";

const str = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

const SETTING_LABELS: Partial<Record<PlatformSettingKey, string>> = {
  otp: "sign-in codes",
  smtp: "email server",
  iyzico: "Yallapp's iyzico account",
  kashier: "Yallapp's Kashier account",
  fawaterk: "Yallapp's Fawaterk account",
  paymentProvider: "payment provider",
  billing: "plan payments and exchange rate",
  marketplace: "marketplace commission",
  contact: "contact details",
  plans: "plans",
  publishing: "publishing team email",
  sallaApp: "Salla partner app",
  zidApp: "Zid partner app",
  storagePacks: "storage packs",
};

/** Saves a setting (null: back to the defaults) and logs it, secrets redacted; `audit` replaces parts of the log entry. */
async function save<K extends PlatformSettingKey>(
  key: K,
  value: PlatformSettingValues[K] | null,
  admin: AdminUser,
  audit: Partial<Pick<AuditInput, "action" | "target" | "summary" | "before" | "after">> = {},
) {
  const store = await getStore();
  const before = (await platformSetting(store, key, { fresh: true }))?.value ?? null;
  await store.setPlatformSetting(key, value, admin.email, new Date());
  clearPlatformSettingsCache();
  const label = SETTING_LABELS[key] ?? key;
  await recordAudit({
    actor: admin,
    action: value === null ? "settings.reset" : "settings.save",
    target: { type: "setting", id: key },
    summary: value === null ? `Removed the ${label} setting` : `Saved the ${label} setting`,
    before,
    after: value,
    ...audit,
  });
  revalidatePath("/admin/settings");
}

/** Back to the Netlify variables for this setting. */
export async function resetPlatformSettingAction(formData: FormData): Promise<void> {
  const key = String(formData.get("key")) as PlatformSettingKey;
  // 37 Yallapp's payment accounts and its provider choice are payments settings too.
  const payments = ["iyzico", "kashier", "fawaterk", "paymentProvider", "marketplace"].includes(key);
  const admin = await requireAdmin(payments ? "payments.manage" : "settings.edit");
  if (key === "otp" || key === "smtp" || payments) await save(key, null, admin);
  if (key === "contact") {
    await save(key, null, admin);
    revalidatePath("/", "layout");
  }
  if (key === "publishing") {
    await save(key, null, admin);
    revalidatePath("/dashboard/publishing");
  }
  // 25 Without the partner app, stores can't connect (connected ones can't renew their tokens).
  if (key === "sallaApp" || key === "zidApp") {
    await save(key, null, admin);
    revalidatePath("/dashboard", "layout");
  }
}

/**
 * 25 Yallapp's partner app on Salla or Zid: the client ID, client secret and
 * (optional) webhook secret from the platform's partner portal. Empty secrets
 * keep the saved ones.
 */
export async function savePartnerAppAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const key = str(formData, "key");
  if (key !== "sallaApp" && key !== "zidApp") return { message: "Unknown setting." };
  const name = key === "sallaApp" ? "Salla" : "Zid";
  const store = await getStore();
  const saved = (await platformSetting(store, key, { fresh: true }))?.value ?? null;
  const values = { clientId: str(formData, "clientId") };
  const clientSecret = str(formData, "clientSecret");
  const webhookSecret = str(formData, "webhookSecret");
  const errors: Record<string, string> = {};
  if (!/^[\w.\-~]{1,200}$/.test(values.clientId)) errors.clientId = `Paste the Client ID exactly as ${name} shows it.`;
  if (!clientSecret && !saved) errors.clientSecret = "Paste the Client Secret.";
  else if (clientSecret.length > 500 || /\s/.test(clientSecret)) errors.clientSecret = `Paste the Client Secret exactly as ${name} shows it.`;
  if (webhookSecret.length > 500 || /\s/.test(webhookSecret)) errors.webhookSecret = `Paste the Webhook Secret exactly as ${name} shows it.`;
  if (Object.keys(errors).length) return { errors, values };
  const encryption = encryptionKey();
  await save(key, {
    clientId: values.clientId,
    clientSecretEncrypted: clientSecret ? encryptSetting(key, clientSecret, encryption) : saved!.clientSecretEncrypted,
    webhookSecretEncrypted: webhookSecret ? encryptSetting(key, webhookSecret, encryption) : (saved?.webhookSecretEncrypted ?? null),
  }, admin);
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: `${name} partner app saved. Store apps can connect a ${name} store now.`, values };
}

export async function saveOtpSettingAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const store = await getStore();
  const saved = (await platformSetting(store, "otp", { fresh: true }))?.value ?? null;
  const kind = str(formData, "kind");
  const values: Record<string, string> = { kind };
  for (const name of ["phoneNumberId", "template", "language", "url", "baseUrl", "instanceId"]) values[name] = str(formData, name);
  const errors: Record<string, string> = {};
  let value: OtpSetting;
  if (kind === "whatsapp") {
    const token = str(formData, "accessToken");
    if (!token && saved?.kind !== "whatsapp") errors.accessToken = "Paste the access token.";
    if (!/^\d{5,20}$/.test(values.phoneNumberId!)) errors.phoneNumberId = "Paste the phone number ID (digits) from Meta's WhatsApp settings.";
    if (!/^[a-z0-9_]{1,512}$/.test(values.template!)) errors.template = "Use the template's name, like yallapp_code.";
    if (!/^[a-z]{2,3}(_[A-Z]{2})?$/.test(values.language!)) errors.language = "Use a language code, like en or tr.";
    if (Object.keys(errors).length) return { errors, values };
    value = {
      kind,
      accessTokenEncrypted: token ? encryptSetting("otp", token, encryptionKey()) : (saved as Extract<OtpSetting, { kind: "whatsapp" }>).accessTokenEncrypted,
      phoneNumberId: values.phoneNumberId!,
      template: values.template!,
      language: values.language!,
    };
  } else if (kind === "webhook") {
    const secret = str(formData, "secret");
    let url: URL | null = null;
    try {
      url = new URL(values.url!);
    } catch {
      url = null;
    }
    if (!url || url.protocol !== "https:") errors.url = "Enter the gateway's https address.";
    if (!secret && saved?.kind !== "webhook") errors.secret = "Enter the signing secret, at least 16 characters.";
    else if (secret && secret.length < 16) errors.secret = "Use at least 16 characters.";
    if (Object.keys(errors).length) return { errors, values };
    value = {
      kind,
      url: url!.toString(),
      secretEncrypted: secret ? encryptSetting("otp", secret, encryptionKey()) : (saved as Extract<OtpSetting, { kind: "webhook" }>).secretEncrypted,
    };
  } else if (kind === "waabek") {
    const apiKey = str(formData, "apiKey");
    let baseUrl: URL | null = null;
    try {
      baseUrl = new URL(values.baseUrl || WAABEK_API_URL);
    } catch {
      baseUrl = null;
    }
    if (!baseUrl || baseUrl.protocol !== "https:") errors.baseUrl = "Enter WABEK's https address, like https://waabek.com.";
    if (!apiKey && saved?.kind !== "waabek") errors.apiKey = "Paste the API key from your WABEK account.";
    if (values.instanceId && !/^[A-Za-z0-9_-]{1,100}$/.test(values.instanceId)) errors.instanceId = "Paste the instance ID from WABEK › Instances.";
    if (Object.keys(errors).length) return { errors, values };
    value = {
      kind,
      apiKeyEncrypted: apiKey ? encryptSetting("otp", apiKey, encryptionKey()) : (saved as Extract<OtpSetting, { kind: "waabek" }>).apiKeyEncrypted,
      baseUrl: baseUrl!.origin,
      instanceId: values.instanceId || null,
    };
  } else if (kind === "off") {
    value = { kind };
  } else {
    return { errors: { kind: "Choose how codes are sent." }, values };
  }
  await save("otp", value, admin);
  return { ok: true, message: "Sign-in codes setting saved. It applies within 30 seconds on every server." };
}

export async function saveSmtpSettingAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const store = await getStore();
  const saved = (await platformSetting(store, "smtp", { fresh: true }))?.value ?? null;
  const values: Record<string, string> = {};
  for (const name of ["host", "port", "user", "from"]) values[name] = str(formData, name);
  values.secure = formData.get("secure") === "on" ? "on" : "";
  const errors: Record<string, string> = {};
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(values.host!)) errors.host = "Enter the mail server, like mail.yallapp.com.tr.";
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.port = "Enter a port, usually 465 or 587.";
  if (!/^[^<>]*<[^\s@<>]+@[^\s@<>]+>$|^[^\s@]+@[^\s@]+$/.test(values.from!)) errors.from = "Use an address, like Yallapp <info@yallapp.com.tr>.";
  if (Object.keys(errors).length) return { errors, values };
  const pass = str(formData, "pass");
  const keepPass = !pass && saved?.user === (values.user || null) ? saved.passEncrypted : null;
  const value: SmtpSetting = {
    host: values.host!,
    port,
    secure: values.secure === "on",
    user: values.user || null,
    passEncrypted: pass ? encryptSetting("smtp", pass, encryptionKey()) : keepPass,
    from: values.from!,
  };
  await save("smtp", value, admin);
  return { ok: true, message: "Email setting saved. Send a test email to check it.", values };
}

export async function sendTestEmailAction(): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  try {
    await sendMail({
      to: admin.email,
      subject: "Yallapp test email",
      text: "This test email from the Yallapp admin reached you, so the email settings work.",
    });
  } catch (e) {
    return { message: `The email couldn't be sent: ${e instanceof Error ? e.message : "unknown error"}.` };
  }
  return { ok: true, message: `Test email sent to ${admin.email}. Check the inbox and the spam folder.` };
}

/** 51 Asks the media gate about a file that doesn't exist: proves the address and the shared secret. */
export async function checkMediaGateAction(): Promise<FormState> {
  await requireAdmin("settings.edit");
  const storage = getMediaStorage();
  if (!storage) return { message: "Media isn't set up: set MEDIA_BASE_URL and MEDIA_SIGNING_SECRET in Netlify (see the launch checklist)." };
  try {
    const stat = await storage.stat(storageKeyOf(newId(), newId(), "mp4"));
    if (stat.exists) return { message: "The media server answered, but oddly: it reports a file that can't exist." };
  } catch (e) {
    return { message: `The media server didn't answer as it should: ${e instanceof Error ? e.message : "unknown error"}. Check MEDIA_BASE_URL, and that its config.php has the same secret as MEDIA_SIGNING_SECRET.` };
  }
  return { ok: true, message: storage.mode === "host" ? "The media server answers and accepts our signed links." : "Media files are kept in the local folder (development only)." };
}

export async function saveIyzicoSettingAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("payments.manage");
  const apiKey = str(formData, "apiKey");
  const secretKey = str(formData, "secretKey");
  const sandbox = formData.get("sandbox") === "on";
  const errors: Record<string, string> = {};
  if (!apiKey || apiKey.length > 200) errors.apiKey = "Paste the API key.";
  if (!secretKey || secretKey.length > 200) errors.secretKey = "Paste the secret key.";
  if (Object.keys(errors).length) return { errors, values: { sandbox: sandbox ? "on" : "" } };
  const accepted = await checkIyzicoKeys({ apiKey, secretKey, sandbox }, { baseUrl: iyzicoApiUrl() });
  if (accepted === false) {
    return { errors: { apiKey: `iyzico didn't accept these ${sandbox ? "sandbox" : "live"} keys.` }, values: { sandbox: sandbox ? "on" : "" } };
  }
  const key = encryptionKey();
  await save(
    "iyzico",
    { apiKeyEncrypted: encryptSetting("iyzico", apiKey, key), secretKeyEncrypted: encryptSetting("iyzico", secretKey, key), sandbox },
    admin,
  );
  return { ok: true, message: accepted ? "iyzico account saved." : "Saved. iyzico couldn't be reached to check the keys." };
}

/** 37 A key as pasted: no spaces, not too long; null otherwise. */
const pastedKey = (formData: FormData, name: string) => {
  const value = str(formData, name);
  return value && value.length <= 300 && !/\s/.test(value) ? value : null;
};

/** 37 Yallapp's Kashier account: merchant ID, Payment API key and secret key (test or live). */
export async function saveKashierSettingAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("payments.manage");
  const merchantId = str(formData, "merchantId");
  const apiKey = pastedKey(formData, "apiKey");
  const secretKey = pastedKey(formData, "secretKey");
  const sandbox = formData.get("sandbox") === "on";
  const values = { merchantId, sandbox: sandbox ? "on" : "" };
  const errors: Record<string, string> = {};
  if (!validKashierMerchantId(merchantId)) errors.merchantId = "Enter the merchant ID, like MID-1234-567.";
  if (!apiKey) errors.apiKey = "Paste the Payment API key.";
  if (!secretKey) errors.secretKey = "Paste the secret key.";
  if (Object.keys(errors).length) return { errors, values };
  const accepted = await checkAccount({ provider: "kashier", keys: { merchantId, apiKey: apiKey!, secretKey: secretKey!, sandbox } }, { urls: paymentApiUrls() });
  if (accepted === false) return { errors: { secretKey: `Kashier didn't accept this ${sandbox ? "test" : "live"} secret key.` }, values };
  const key = encryptionKey();
  await save(
    "kashier",
    { merchantId, apiKeyEncrypted: encryptSetting("kashier", apiKey!, key), secretKeyEncrypted: encryptSetting("kashier", secretKey!, key), sandbox },
    admin,
  );
  return { ok: true, message: accepted ? "Kashier account saved." : "Saved. Kashier couldn't be reached to check the keys." };
}

/** 37 Yallapp's Fawaterk account: the vendor's API key (staging or live). */
export async function saveFawaterkSettingAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("payments.manage");
  const apiKey = pastedKey(formData, "apiKey");
  const sandbox = formData.get("sandbox") === "on";
  const values = { sandbox: sandbox ? "on" : "" };
  if (!apiKey) return { errors: { apiKey: "Paste the API key." }, values };
  const accepted = await checkAccount({ provider: "fawaterk", keys: { apiKey, sandbox } }, { urls: paymentApiUrls() });
  if (accepted === false) return { errors: { apiKey: `Fawaterk didn't accept this ${sandbox ? "staging" : "live"} key.` }, values };
  await save("fawaterk", { apiKeyEncrypted: encryptSetting("fawaterk", apiKey, encryptionKey()), sandbox }, admin);
  return { ok: true, message: accepted ? "Fawaterk account saved." : "Saved. Fawaterk couldn't be reached to check the key." };
}

/** 37 "Test connection": a call that changes nothing, with the saved keys of one of Yallapp's accounts. */
export async function testPaymentAccountAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin("payments.manage");
  const provider = str(formData, "provider");
  if (!isPaymentProvider(provider)) return { message: "Unknown provider." };
  const name = PROVIDER_NAME[provider];
  const account = await yallappAccountFor(await getStore(), provider, encryptionKey()).catch(() => null);
  if (!account) return { message: `Save Yallapp's ${name} account first.` };
  const accepted = await checkAccount(account, { urls: paymentApiUrls() });
  if (accepted === null) return { message: `${name} couldn't be reached. Try again in a moment.` };
  return accepted
    ? { ok: true, message: `Connected: ${name} accepts the saved ${account.keys.sandbox ? "test" : "live"} keys.` }
    : { message: `${name} didn't accept the saved keys. Save them again.` };
}

/**
 * 37 Which of Yallapp's accounts takes new plan payments and marketplace
 * sales. Payments already started finish with the account they started
 * with; shops that joined the marketplace with another provider stop
 * selling through Yallapp until they join again.
 */
export async function savePaymentProviderAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("payments.manage");
  const provider = str(formData, "provider");
  if (!isPaymentProvider(provider)) return { errors: { provider: "Choose a provider." }, values: { provider } };
  const store = await getStore();
  await save("paymentProvider", { provider }, admin);
  const name = PROVIDER_NAME[provider];
  const ready = await yallappAccountFor(store, provider, encryptionKey()).catch(() => null);
  revalidatePath("/dashboard", "layout");
  return {
    ok: true,
    message: `Payments go to Yallapp's ${name} account.${ready ? "" : ` Add Yallapp's ${name} account below: until then, sales through Yallapp are off.`}`,
    values: { provider },
  };
}

/**
 * 52 Yallapp's own plans and add-ons: the gateway they're paid through
 * (Kashier, in pounds, unless the team chooses another) and the
 * pound-to-dollar rate for the dollar prices shown outside Egypt.
 */
export async function savePlanBillingAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("payments.manage");
  const values = { planProvider: str(formData, "planProvider"), egpPerUsd: str(formData, "egpPerUsd") };
  const errors: Record<string, string> = {};
  if (!isPaymentProvider(values.planProvider)) errors.planProvider = "Choose a gateway.";
  const rate = readRate(values.egpPerUsd);
  if (rate === undefined) errors.egpPerUsd = "Enter how many Egyptian pounds make one US dollar, like 48.5, or leave it empty.";
  if (Object.keys(errors).length || !isPaymentProvider(values.planProvider) || rate === undefined) return { errors, values };
  const store = await getStore();
  const provider = values.planProvider;
  await save("billing", { planProvider: provider, egpPerUsd: rate }, admin);
  const name = PROVIDER_NAME[provider];
  const ready = await yallappAccountFor(store, provider, encryptionKey()).catch(() => null);
  const plans = await getPlans(store);
  // iyzico charges the dollar price: plans without one (by hand or at the rate) can't be paid by card.
  const unpaid = Object.values(plans).filter((p) => planPriceOf(p) && !cardPlans(plans, provider, rate).some((c) => c.id === p.id)).map((p) => p.name);
  const notes = [
    ready ? null : `Add Yallapp's ${name} account below: until then, card payments for plans are off.`,
    unpaid.length ? `${unpaid.join(" and ")} can't be paid by card until they have a dollar price (set the rate, or a dollar price on the Plans page).` : null,
  ].filter(Boolean);
  revalidatePath("/dashboard", "layout");
  await revalidatePlans();
  return { ok: true, message: `Plans are paid through Yallapp's ${name} account.${notes.length ? ` ${notes.join(" ")}` : ""}`, values };
}

/** The plan as it is now (defaults with the team's edits), to save a full edit from. */
async function currentPlan(plan: Plan): Promise<{ saved: Partial<Record<Plan, PlanSetting>>; info: PlanInfo }> {
  const store = await getStore();
  const saved = (await platformSetting(store, "plans", { fresh: true }))?.value ?? {};
  return { saved, info: plansWith(saved)[plan] };
}

async function revalidatePlans() {
  revalidatePath("/admin/plans");
  revalidatePath("/pricing");
  revalidatePath("/");
}

/** Name, texts and price of a plan. Its features and limits are kept (savePlanLimitsAction). */
export async function savePlanAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("plans.edit");
  const plan = str(formData, "plan");
  if (!isPlan(plan)) return { message: "Unknown plan." };
  const values: Record<string, string> = {};
  for (const name of ["name", "tagline", "highlights", "price", "pricing", "egpPrice", "usdPrice", "months"]) values[name] = str(formData, name);
  const errors: Record<string, string> = {};
  if (!values.name || values.name.length > 30) errors.name = "Enter a name of up to 30 characters.";
  if (values.tagline!.length > 80) errors.tagline = "Use at most 80 characters.";
  const highlights = values.highlights!.split("\n").map((l) => l.trim()).filter(Boolean);
  if (highlights.length === 0 || highlights.length > 10 || highlights.some((h) => h.length > 80)) {
    errors.highlights = "Write 1 to 10 lines, each up to 80 characters.";
  }
  if (!values.price || values.price.length > 30) errors.price = "Enter what the pricing page shows instead of a price, like On request.";
  // 52 A price in Egyptian pounds (what is charged), and a dollar price by hand or from the rate; or "On request".
  const onRequest = values.pricing === "request";
  if (!onRequest && values.pricing !== "price") errors.pricing = "Choose a price or On request.";
  const priceCents = values.egpPrice ? parsePrice(values.egpPrice) : null;
  if (values.egpPrice && (priceCents === null || priceCents === 0)) errors.egpPrice = "Enter a price in Egyptian pounds, like 1500.";
  else if (!onRequest && priceCents === null) errors.egpPrice = "Enter the price in Egyptian pounds, or choose On request.";
  const usdCents = values.usdPrice ? parsePrice(values.usdPrice) : null;
  if (values.usdPrice && (usdCents === null || usdCents === 0)) errors.usdPrice = "Enter a price in US dollars, like 29, or leave it empty to use the rate.";
  if (values.months !== "1" && values.months !== "12") errors.months = "Choose monthly or yearly.";
  if (Object.keys(errors).length) return { errors, values };
  const { saved, info } = await currentPlan(plan);
  const setting: PlanSetting = {
    ...planSettingOf(info),
    name: values.name!,
    tagline: values.tagline!,
    highlights,
    price: values.price!,
    priceCents,
    usdCents,
    onRequest,
    billingMonths: values.months === "1" ? 1 : 12,
  };
  // An edit from before Phase 52 named its currency; prices are in pounds now.
  delete setting.currency;
  await save("plans", { ...saved, [plan]: setting }, admin, {
    action: "plan.save",
    target: { type: "plan", id: plan },
    summary: `Saved the ${setting.name} plan`,
    before: saved[plan] ?? null,
    after: setting,
  });
  await revalidatePlans();
  return { ok: true, message: `${setting.name} saved. The pricing page shows it now.` };
}

/** "" or "unlimited" is no limit; otherwise a whole number up to 10,000,000. */
function readLimit(raw: string): number | null | undefined {
  const value = raw.replace(/[,\s]/g, "");
  if (value === "" || value.toLowerCase() === "unlimited") return null;
  if (!/^\d{1,8}$/.test(value)) return undefined;
  const n = Number(value);
  return n <= 10_000_000 ? n : undefined;
}

/**
 * 13.1 What a plan includes: its features (enforced where PLAN_FEATURES
 * says) and limits, plus the display-only items. Apps on the plan get the
 * change at once; 47 WordPress sites on it are asked to check their license
 * now (in batches, refreshPlanSitesSoon), the rest at their next check.
 */
export async function savePlanLimitsAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("plans.edit");
  const plan = str(formData, "plan");
  if (!isPlan(plan)) return { message: "Unknown plan." };
  const features = formData.getAll("features").map(String);
  const values: Record<string, string> = { features: features.join(",") };
  for (const name of ["appUsers", "languages", "sources", "storageGb", "teamMembers", "support"]) values[name] = str(formData, name);
  values.accountManager = formData.get("accountManager") === "on" ? "on" : "";
  values.customFeatures = formData.get("customFeatures") === "on" ? "on" : "";
  const errors: Record<string, string> = {};
  const limits: Partial<PlanLimits> = {};
  for (const [name, min] of [
    ["appUsers", 1],
    ["languages", 1],
    ["sources", 1],
    // 51 Gigabytes of media storage.
    ["storageGb", 1],
    ["teamMembers", 1],
  ] as const) {
    const limit = readLimit(values[name]!);
    if (limit === undefined || (limit !== null && limit < min)) errors[name] = "Enter a whole number from 1, or leave it empty for no limit.";
    else limits[name] = limit;
  }
  if (!SUPPORT_LEVELS.includes(values.support as SupportLevel)) errors.support = "Choose the support level.";
  if (Object.keys(errors).length) return { errors, values };
  const { saved, info } = await currentPlan(plan);
  const setting: PlanSetting = {
    ...planSettingOf(info),
    features: PLAN_FEATURE_IDS.filter((f) => features.includes(f)),
    limits: {
      appUsers: limits.appUsers ?? null,
      languages: limits.languages ?? null,
      sources: limits.sources ?? null,
      storageGb: limits.storageGb ?? null,
      teamMembers: limits.teamMembers ?? null,
      support: values.support as SupportLevel,
      accountManager: values.accountManager === "on",
      customFeatures: values.customFeatures === "on",
    },
  };
  await save("plans", { ...saved, [plan]: setting }, admin, {
    action: "plan.limits",
    target: { type: "plan", id: plan },
    summary: `Changed what the ${setting.name} plan includes`,
    before: saved[plan] ? { features: info.features, limits: info.limits } : { features: PLAN_INFO[plan].features, limits: PLAN_INFO[plan].limits },
    after: { features: setting.features, limits: setting.limits },
  });
  await revalidatePlans();
  refreshPlanSitesSoon(plan);
  return { ok: true, message: `${setting.name}: features and limits saved. Apps on this plan follow them now.`, values };
}

/** 51 The storage packs owners can buy: gigabytes, and a month's price (empty: not sold by card); 52 in pounds, with an optional dollar price, like the plans. */
export async function saveStoragePacksAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("plans.edit");
  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};
  const offers: StoragePackOffer[] = [];
  for (let i = 0; i < 4; i++) {
    const id = str(formData, `id${i}`);
    if (!id) break;
    for (const name of ["gb", "egp", "usd"]) values[`${name}${i}`] = str(formData, `${name}${i}`);
    const gb = Number(values[`gb${i}`]);
    if (!/^\d{1,5}$/.test(values[`gb${i}`]!) || gb < 1) errors[`gb${i}`] = "Enter a whole number of gigabytes.";
    const egpCents = values[`egp${i}`] ? parsePrice(values[`egp${i}`]!) : null;
    if (values[`egp${i}`] && (egpCents === null || egpCents === 0)) errors[`egp${i}`] = "Enter a monthly price in Egyptian pounds, like 250, or leave it empty.";
    const usdCents = values[`usd${i}`] ? parsePrice(values[`usd${i}`]!) : null;
    if (values[`usd${i}`] && (usdCents === null || usdCents === 0)) errors[`usd${i}`] = "Enter a monthly price in US dollars, like 5, or leave it empty to use the rate.";
    else if (usdCents && !egpCents) errors[`egp${i}`] = "Enter the price in Egyptian pounds too: that's what is charged.";
    if (/^[a-z0-9]{2,32}$/.test(id)) offers.push({ id, gb, price: egpCents ? { egpCents, usdCents: usdCents || null } : null });
  }
  if (Object.keys(errors).length) return { errors, values };
  if (!offers.length) return { message: "Nothing to save.", values };
  await save("storagePacks", { offers }, admin);
  revalidatePath("/dashboard/media");
  return { ok: true, message: "Storage packs saved.", values };
}

export async function resetPlanAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("plans.edit");
  const plan = str(formData, "plan");
  if (!isPlan(plan)) return;
  const store = await getStore();
  const { [plan]: _removed, ...rest } = (await platformSetting(store, "plans", { fresh: true }))?.value ?? {};
  await save("plans", Object.keys(rest).length ? rest : null, admin, {
    action: "plan.reset",
    target: { type: "plan", id: plan },
    summary: `Put the ${plan} plan back to its defaults`,
    before: _removed ?? null,
    after: null,
  });
  await revalidatePlans();
  // 47 Its sites follow the defaults now too.
  refreshPlanSitesSoon(plan);
}

/** Shops without their own iyzico account sell through Yallapp's, for this commission. */
export async function saveMarketplaceAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("payments.manage");
  const raw = str(formData, "commission").replace(",", ".");
  const percent = Number(raw);
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(raw) || percent > 50) {
    return { errors: { commission: "Enter a percent from 0 to 50, like 8 or 7.5." }, values: { commission: raw } };
  }
  await save("marketplace", { commissionPercent: percent }, admin);
  return { ok: true, message: `Shops can sell through Yallapp for a ${percent}% commission.`, values: { commission: raw } };
}

/** Yallapp's WhatsApp number and email, shown across the website, the dashboard and emails. */
export async function saveContactAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const values = { whatsapp: str(formData, "whatsapp"), email: str(formData, "email") };
  const errors: Record<string, string> = {};
  if (!parseAnyPhone(values.whatsapp, "+90") || !values.whatsapp.startsWith("+")) errors.whatsapp = "Enter the number with its country code, like +90 544 673 19 42.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || values.email.length > 191) errors.email = "Enter an email address.";
  if (Object.keys(errors).length) return { errors, values };
  await save("contact", values, admin);
  // Every page shows them, including the ones built ahead of time.
  revalidatePath("/", "layout");
  return { ok: true, message: "Contact details saved. The website and the dashboard show them now.", values };
}

/** 14.1 The address clients invite to their Google Play, App Store Connect and Firebase accounts. */
export async function savePublishingSettingAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const values = { teamEmail: str(formData, "teamEmail").toLowerCase() };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.teamEmail) || values.teamEmail.length > 191) {
    return { errors: { teamEmail: "Enter an email address." }, values };
  }
  await save("publishing", values, admin);
  revalidatePath("/dashboard/publishing");
  return { ok: true, message: "Saved. Clients now see this address in their publishing steps.", values };
}

// The sign-in code test: a real code to the admin's own number, then checked like the hosted API does.

const OTP_TEST_COOKIE = "yallapp_otp_test";

async function otpTestSender() {
  const store = await getStore();
  return otpSenderFrom(await resolvedOtpSenderConfig(store, encryptionKey()));
}

export async function sendTestCodeAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const values = { phone: str(formData, "phone") };
  const phone = parseAnyPhone(values.phone, "+90");
  if (!phone) return { errors: { phone: "Enter your number with the country code, like +20 100 123 4567." }, values };
  const store = await getStore();
  const now = new Date();
  if (!(await hitRateLimit(store, RATE_LIMITS.otpTest, admin.id, now)).allowed) {
    return { message: "That's a lot of test codes. Wait a few minutes and try again.", values };
  }
  const sender = await otpTestSender();
  if (!sender) return { message: "Sign-in codes are off or not set. Choose how codes are sent and save first.", values };
  let ticket: OtpTestTicket;
  try {
    ticket = await sendTestCode(sender, phone.e164, sessionSecret(), now);
  } catch (e) {
    return { message: `The code wasn't sent: ${e instanceof Error ? e.message : "unknown error"}`, values };
  }
  (await cookies()).set(OTP_TEST_COOKIE, encrypt(JSON.stringify(ticket), encryptionKey(), "otp-test"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && appUrl().startsWith("https:"),
    sameSite: "strict",
    path: "/admin",
    maxAge: OTP_TEST_TTL_SECONDS,
  });
  return { ok: true, message: `Test code sent to ${phone.e164}. Type it below when it arrives.`, values };
}

export async function checkTestCodeAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin("settings.edit");
  const code = str(formData, "code");
  const jar = await cookies();
  let ticket: OtpTestTicket | null = null;
  try {
    const raw = jar.get(OTP_TEST_COOKIE)?.value;
    ticket = raw ? (JSON.parse(decrypt(raw, encryptionKey(), "otp-test")) as OtpTestTicket) : null;
  } catch {
    ticket = null;
  }
  if (!ticket) return { message: "Send a test code first." };
  const result = checkTestCode(ticket, code, sessionSecret(), new Date());
  if (result === "wrong") return { errors: { code: "That code isn't right." }, values: { code } };
  jar.delete({ name: OTP_TEST_COOKIE, path: "/admin" });
  if (result === "expired") return { message: "The test code expired. Send a new one." };
  return { ok: true, message: `The code is right: sign-in codes work. ${ticket.phone} got it and it was checked.` };
}

