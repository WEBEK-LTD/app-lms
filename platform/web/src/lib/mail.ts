import "server-only";
import { getStore } from "./data";
import { encryptionKey, isProduction } from "./env";
import { DEFAULT_CONTACT } from "./contact";
import { platformSetting, resolvedSmtpConfig } from "./settings/platform";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends service email through SMTP. Without SMTP settings the message is
 * printed to the server log in development only; in production it's dropped
 * with a warning that doesn't include the content (it may hold a reset link).
 */
export async function sendMail(input: Mail): Promise<void> {
  const store = await getStore();
  const contact = (await platformSetting(store, "contact"))?.value ?? DEFAULT_CONTACT;
  const mail = { ...input, text: input.text.replaceAll(WHATSAPP_PLACEHOLDER, contact.whatsapp) };
  const config = await resolvedSmtpConfig(store, encryptionKey());
  if (!config) {
    if (!isProduction() || process.env.YALLAPP_DATA === "memory") {
      console.info(`[mail] To: ${mail.to}\n[mail] Subject: ${mail.subject}\n${mail.text}\n`);
    } else {
      console.warn(`[mail] SMTP is not configured; an email to ${mail.to} was not sent.`);
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
  await transport.sendMail({ from: config.from, to: mail.to, subject: mail.subject, text: mail.text });
}

/** Replaced by sendMail with the WhatsApp number set in the admin. */
const WHATSAPP_PLACEHOLDER = "{{yallapp-whatsapp}}";
const SIGNATURE = `\n\nYallapp\nhttps://yallapp.com.tr · WhatsApp ${WHATSAPP_PLACEHOLDER}\nYallapp is a trading name of WEBEK LTD, registered in England and Wales, company no. 16326894.`;

export function resetPasswordMail(to: string, name: string, link: string, isNewAccount: boolean): Mail {
  return {
    to,
    subject: isNewAccount ? "Set your Yallapp password" : "Reset your Yallapp password",
    text:
      `Hello ${name},\n\n` +
      (isNewAccount
        ? "Use this link to set the password for your Yallapp account:\n\n"
        : "We received a request to reset your Yallapp password. Use this link to choose a new one:\n\n") +
      `${link}\n\nThe link works once and expires in 1 hour. If you didn't ask for this, you can ignore this email.` +
      SIGNATURE,
  };
}

export function activationMail(to: string, name: string, plan: string, activeUntil: string, licenseKey: string, dashboardUrl: string): Mail {
  return {
    to,
    subject: "Your Yallapp account is active",
    text:
      `Hello ${name},\n\nYour Yallapp account is active.\n\n` +
      `Plan: ${plan}\nActive until: ${activeUntil}\nLicense key: ${licenseKey}\n\n` +
      `Next steps:\n1. Install the Yallapp plugin on your WordPress site and paste your license key.\n` +
      `2. Set up your app in your dashboard: ${dashboardUrl}\n\n` +
      "You can always find your license key on the License & plugin page." +
      SIGNATURE,
  };
}

export function renewalMail(to: string, name: string, plan: string, activeUntil: string, dashboardUrl: string): Mail {
  return {
    to,
    subject: "Your Yallapp plan has been renewed",
    text: `Hello ${name},\n\nYour ${plan} plan is now active until ${activeUntil}.\n\nDashboard: ${dashboardUrl}` + SIGNATURE,
  };
}
