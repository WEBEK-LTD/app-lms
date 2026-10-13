"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { OtpSetting, PlatformSettingKey, PlatformSettingValues, SmtpSetting } from "@/lib/data/types";
import { encryptionKey, iyzicoApiUrl } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { sendMail } from "@/lib/mail";
import { parsePrice } from "@/lib/catalog/money";
import { checkIyzicoKeys } from "@/lib/payments/iyzico";
import { PLAN_FEATURES, type PlanFeature, type PlanSetting } from "@/lib/plans";
import { clearPlatformSettingsCache, encryptSetting, platformSetting } from "@/lib/settings/platform";

const str = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

async function save<K extends PlatformSettingKey>(key: K, value: PlatformSettingValues[K] | null, email: string) {
  const store = await getStore();
  await store.setPlatformSetting(key, value, email, new Date());
  clearPlatformSettingsCache();
  revalidatePath("/admin/settings");
}

/** Back to the Netlify variables for this setting. */
export async function resetPlatformSettingAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const key = String(formData.get("key")) as PlatformSettingKey;
  if (key === "otp" || key === "smtp" || key === "iyzico") await save(key, null, admin.email);
}

export async function saveOtpSettingAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const store = await getStore();
  const saved = (await platformSetting(store, "otp", { fresh: true }))?.value ?? null;
  const kind = str(formData, "kind");
  const values: Record<string, string> = { kind };
  for (const name of ["phoneNumberId", "template", "language", "url"]) values[name] = str(formData, name);
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
  } else if (kind === "off") {
    value = { kind };
  } else {
    return { errors: { kind: "Choose how codes are sent." }, values };
  }
  await save("otp", value, admin.email);
  return { ok: true, message: "Sign-in codes setting saved. It applies within 30 seconds on every server." };
}

export async function saveSmtpSettingAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
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
  await save("smtp", value, admin.email);
  return { ok: true, message: "Email setting saved. Send a test email to check it.", values };
}

export async function sendTestEmailAction(): Promise<FormState> {
  const admin = await requireAdmin();
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

export async function saveIyzicoSettingAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
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
    admin.email,
  );
  return { ok: true, message: accepted ? "iyzico account saved." : "Saved. iyzico couldn't be reached to check the keys." };
}

const PLAN_IDS = ["starter", "pro"] as const;

export async function savePlanAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const plan = str(formData, "plan") as (typeof PLAN_IDS)[number];
  if (!PLAN_IDS.includes(plan)) return { message: "Unknown plan." };
  const values: Record<string, string> = {};
  for (const name of ["name", "tagline", "highlights", "price", "cardPrice", "currency", "months"]) values[name] = str(formData, name);
  const features = formData.getAll("features").map(String);
  values.features = features.join(",");
  const errors: Record<string, string> = {};
  if (!values.name || values.name.length > 30) errors.name = "Enter a name of up to 30 characters.";
  if (values.tagline!.length > 80) errors.tagline = "Use at most 80 characters.";
  const highlights = values.highlights!.split("\n").map((l) => l.trim()).filter(Boolean);
  if (highlights.length === 0 || highlights.length > 10 || highlights.some((h) => h.length > 80)) {
    errors.highlights = "Write 1 to 10 lines, each up to 80 characters.";
  }
  if (!values.price || values.price.length > 30) errors.price = "Enter what the pricing page shows without a card price, like On request.";
  const priceCents = values.cardPrice ? parsePrice(values.cardPrice) : null;
  if (values.cardPrice && (priceCents === null || priceCents === 0)) errors.cardPrice = "Enter a price, like 4800, or leave it empty.";
  if (!["TRY", "USD", "EUR"].includes(values.currency!)) errors.currency = "Choose a currency.";
  if (values.months !== "1" && values.months !== "12") errors.months = "Choose monthly or yearly.";
  const known = new Set(PLAN_FEATURES.map((f) => f.id));
  if (Object.keys(errors).length) return { errors, values };
  const store = await getStore();
  const saved = (await platformSetting(store, "plans", { fresh: true }))?.value ?? {};
  const setting: PlanSetting = {
    name: values.name!,
    tagline: values.tagline!,
    highlights,
    price: values.price!,
    priceCents,
    currency: values.currency as PlanSetting["currency"],
    billingMonths: values.months === "1" ? 1 : 12,
    features: features.filter((f): f is PlanFeature => known.has(f as PlanFeature)),
  };
  await save("plans", { ...saved, [plan]: setting }, admin.email);
  revalidatePath("/admin/plans");
  revalidatePath("/pricing");
  revalidatePath("/");
  return { ok: true, message: `${setting.name} saved. The pricing page shows it now.` };
}

export async function resetPlanAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const plan = str(formData, "plan") as (typeof PLAN_IDS)[number];
  if (!PLAN_IDS.includes(plan)) return;
  const store = await getStore();
  const { [plan]: _removed, ...rest } = (await platformSetting(store, "plans", { fresh: true }))?.value ?? {};
  void _removed;
  await save("plans", Object.keys(rest).length ? rest : null, admin.email);
  revalidatePath("/admin/plans");
  revalidatePath("/pricing");
}
