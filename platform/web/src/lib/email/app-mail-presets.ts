/**
 * 24 The email services an app owner can pick on App sign-in ("Your app's
 * email"), with the server settings they need and the steps to get a
 * password their app may use. Shared by the form (in the browser) and the
 * checks on the server; no secrets here.
 */

export type MailSecurity = "ssl" | "starttls" | "none";

export type MailPresetId = "google" | "microsoft" | "zoho" | "zoho_eu" | "yandex" | "custom";

export interface MailPortChoice {
  port: number;
  security: MailSecurity;
  label: string;
}

export interface MailPreset {
  id: MailPresetId;
  name: string;
  /** Shown under the name in the list. */
  hint: string;
  host: string;
  /** The first one is the default. Empty for "Other": the owner types them. */
  ports: MailPortChoice[];
  /** What to type as the username. */
  usernameHint: string;
  /** What to type as the password. */
  passwordHint: string;
  /** Step by step, in plain words. */
  steps: string[];
}

/** Only these ports: email servers listen on them, and nothing else on a server can be reached through this form. */
export const MAIL_PORTS: readonly number[] = [25, 465, 587, 2525];

export const SECURITY_LABELS: Record<MailSecurity, string> = {
  ssl: "SSL/TLS (usually port 465)",
  starttls: "STARTTLS (usually port 587)",
  none: "None (testing only, never on the live site)",
};

const SSL_465: MailPortChoice = { port: 465, security: "ssl", label: "465 with SSL/TLS" };
const STARTTLS_587: MailPortChoice = { port: 587, security: "starttls", label: "587 with STARTTLS" };

const ZOHO_STEPS = (domain: string): string[] => [
  "Use your full Zoho Mail address as the username.",
  "If your Zoho account has two-factor authentication on, make an app password: in Zoho Accounts, open Security, then App Passwords, and create one for this app. Use it here instead of your usual password.",
  `With a paid Zoho plan for your own domain, Zoho may ask you to use smtppro.zoho.${domain} instead: change the server under "Server settings".`,
  "Send from your Zoho address or an alias set up in Zoho Mail. Zoho refuses other From addresses.",
];

export const MAIL_PRESETS: readonly MailPreset[] = [
  {
    id: "google",
    name: "Google",
    hint: "Gmail or Google Workspace",
    host: "smtp.gmail.com",
    ports: [SSL_465, STARTTLS_587],
    usernameHint: "Your full Gmail or Google Workspace address.",
    passwordHint: "The 16-letter App password from Google, not your usual password.",
    steps: [
      "Turn on 2-Step Verification for the Google account that will send the emails: in your Google Account, open Security.",
      'Make an App password: in your Google Account, search for "App passwords", type a name such as your app\'s name, and copy the 16-letter password Google shows. Google shows it only once.',
      "Here, type your full Gmail or Google Workspace address as the username and paste the App password as the password.",
      'Send from the same address, or from an address you added in Gmail under "Send mail as". Google replaces other From addresses with your own.',
      "Gmail sends up to about 500 emails a day, Google Workspace about 2,000.",
    ],
  },
  {
    id: "microsoft",
    name: "Microsoft",
    hint: "Outlook.com or Microsoft 365",
    host: "smtp.office365.com",
    ports: [STARTTLS_587],
    usernameHint: "Your full Outlook.com or Microsoft 365 address.",
    passwordHint: "The mailbox's password, or an app password when the account uses two-step verification.",
    steps: [
      "Type your full Outlook.com or Microsoft 365 address as the username.",
      "Microsoft 365 (a work or school account): your administrator must turn on Authenticated SMTP for this mailbox, in the Microsoft 365 admin center: Users, Active users, the mailbox, Mail, Manage email apps.",
      "If the account uses two-step verification (MFA), make an app password in the security settings of your Microsoft account and use it here.",
      "Microsoft is turning off password sign-in for email programs on more accounts. If the test keeps saying the sign-in failed although the password is right, ask your administrator, or use another email service.",
      "Send from the mailbox's own address. Microsoft refuses other From addresses unless the mailbox may send as them.",
    ],
  },
  {
    id: "zoho",
    name: "Zoho Mail",
    hint: "Accounts at zoho.com",
    host: "smtp.zoho.com",
    ports: [SSL_465, STARTTLS_587],
    usernameHint: "Your full Zoho Mail address.",
    passwordHint: "Your Zoho password, or an app password when two-factor authentication is on.",
    steps: ZOHO_STEPS("com"),
  },
  {
    id: "zoho_eu",
    name: "Zoho Mail (EU)",
    hint: "Accounts at zoho.eu",
    host: "smtp.zoho.eu",
    ports: [SSL_465, STARTTLS_587],
    usernameHint: "Your full Zoho Mail address.",
    passwordHint: "Your Zoho password, or an app password when two-factor authentication is on.",
    steps: ZOHO_STEPS("eu"),
  },
  {
    id: "yandex",
    name: "Yandex",
    hint: "Yandex Mail or Yandex 360",
    host: "smtp.yandex.com",
    ports: [SSL_465],
    usernameHint: "Your full Yandex address.",
    passwordHint: "An app password for Mail from your Yandex ID.",
    steps: [
      'In Yandex Mail, open Settings, then "Email clients", and allow access to the mailbox from email clients with app passwords.',
      "Make an app password: in your Yandex ID, open Security, then App passwords, choose Mail and copy the password.",
      "Here, type your full Yandex address as the username and paste the app password as the password.",
      "Send from your Yandex address. Yandex refuses other From addresses.",
    ],
  },
  {
    id: "custom",
    name: "Other",
    hint: "Your web host or another email service",
    host: "",
    ports: [],
    usernameHint: "Usually your full email address.",
    passwordHint: "The password of the mailbox, or an app password if your provider gives you one.",
    steps: [
      "Ask whoever runs your email (your web host, your email service or your IT person) for its SMTP settings: the server, the port, the security, the username and the password.",
      "Port 465 usually goes with SSL/TLS, and port 587 with STARTTLS.",
      "Send from an address of that mailbox. Most email services refuse other From addresses.",
    ],
  },
];

export function mailPreset(id: string): MailPreset | undefined {
  return MAIL_PRESETS.find((p) => p.id === id);
}

/** The preset whose server this is, or "custom". */
export function presetOfHost(host: string): MailPresetId {
  return MAIL_PRESETS.find((p) => p.host !== "" && p.host === host.trim().toLowerCase())?.id ?? "custom";
}
