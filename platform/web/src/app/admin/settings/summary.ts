import "server-only";
import type { PlatformSetting, PlatformSettingKey } from "@/lib/data/types";
import { appUrl, blobsMode, buildPipelineToken, dataMode, mediaBaseUrl, mediaMode, otpSenderConfig, smtpConfig, superAdminEmails } from "@/lib/env";
import { isYallappProvider, PROVIDER_NAME } from "@/lib/payments/provider";
import type { SettingsPageHref } from "./pages";

/** 95.1 What the settings pages show without a saved setting, and each page's state on the first settings page. */

/** The sign-in code sender from the Netlify variables. */
export function otpFallback(): string {
  try {
    const config = otpSenderConfig();
    return config ? `Netlify variables (${config.kind})` : "Not set: sign-in on the hosted API fails";
  } catch (e) {
    return `Netlify variables are incomplete: ${e instanceof Error ? e.message : ""}`;
  }
}

export function serverRows(): { label: string; ok: boolean; value: string }[] {
  const data = dataMode();
  let media: "host" | "fs" | null = null;
  try {
    media = mediaMode();
  } catch {
    media = null;
  }
  return [
    { label: "Site address", ok: appUrl().startsWith("https://"), value: appUrl() },
    { label: "Database", ok: data === "mysql", value: data === "mysql" ? "MySQL over TLS" : "In memory (development only)" },
    { label: "File storage", ok: blobsMode() === "netlify", value: blobsMode() === "netlify" ? "Netlify Blobs" : "Local folder (development only)" },
    // 51 Owners' videos, pictures and PDFs: on our own server, behind the media gate.
    {
      label: "Media library",
      ok: media === "host",
      value:
        media === "host"
          ? `Our server, through the media gate at ${mediaBaseUrl()}`
          : media === "fs"
            ? "Local folder (development only)"
            : "Not set up: owners can't upload. Set MEDIA_BASE_URL and MEDIA_SIGNING_SECRET.",
    },
    { label: "Build pipeline token", ok: Boolean(buildPipelineToken()), value: buildPipelineToken() ? "Set" : "Not set: the pipeline API refuses every request" },
    { label: "Super admins", ok: superAdminEmails().length > 0, value: superAdminEmails().join(", ") },
  ];
}

export interface PageState {
  /** What's set now, in a few words. */
  now: string;
  /** Something needs the team. */
  attention: boolean;
}

/** Each settings page's state now, for its card on the first settings page. */
export function settingsSummary(settings: Map<PlatformSettingKey, PlatformSetting>): Record<SettingsPageHref, PageState> {
  const get = <K extends PlatformSettingKey>(key: K) => settings.get(key) as PlatformSetting<K> | undefined;
  const billing = get("billing");
  const provider = billing && isYallappProvider(billing.value.planProvider) ? billing.value.planProvider : "kashier";
  const account = get(provider);
  const smtp = get("smtp");
  const envSmtp = smtpConfig();
  const otp = get("otp");
  const contact = get("contact");
  const invoice = get("invoice");
  const partners = (["sallaApp", "zidApp"] as const).filter((key) => get(key)).length;
  const rows = serverRows();
  const otpNow = otp ? `${otp.value.kind === "waabek" ? "waabek" : otp.value.kind === "whatsapp" ? "WhatsApp Cloud API" : "Webhook"}, set here` : otpFallback();
  return {
    "/admin/settings/payments": {
      now: account
        ? `Plans are paid through ${PROVIDER_NAME[provider]} (${account.value.sandbox ? "test keys" : "live keys"}).`
        : `${PROVIDER_NAME[provider]} is the gateway for plans, but Yallapp's account isn't set: card payments for plans are off.`,
      attention: !account,
    },
    "/admin/settings/email": {
      now: smtp ? `${smtp.value.host}, as ${smtp.value.from}, set here.` : envSmtp ? `${envSmtp.host}, from the Netlify variables.` : "Not set: emails are not sent.",
      attention: !smtp && !envSmtp,
    },
    "/admin/settings/sign-in-codes": { now: `${otpNow}.`, attention: !otp && otpFallback().startsWith("Not set") },
    "/admin/settings/contact": { now: contact ? `${contact.value.email}, set here.` : "The defaults.", attention: false },
    "/admin/settings/invoices": {
      now: invoice?.value.lines.length ? `${invoice.value.lines.length} ${invoice.value.lines.length === 1 ? "line" : "lines"} under Yallapp's name.` : "No company lines yet.",
      attention: false,
    },
    "/admin/settings/store-platforms": { now: partners === 2 ? "Salla and Zid are set." : partners === 1 ? (get("sallaApp") ? "Salla is set, Zid isn't." : "Zid is set, Salla isn't.") : "Neither is set.", attention: false },
    "/admin/settings/app-defaults": { now: get("appDefaults") ? "Set here." : "The built-in defaults.", attention: false },
    "/admin/settings/server": {
      now: rows.every((r) => r.ok) ? "Everything checks out." : `${rows.filter((r) => !r.ok).length} to check.`,
      attention: !rows.every((r) => r.ok),
    },
  };
}
