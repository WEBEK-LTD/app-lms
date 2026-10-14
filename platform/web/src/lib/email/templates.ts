import { escapeHtml } from "../content/markdown";

/**
 * Every email the platform sends, with its default subject and body (the
 * text it always had) and the {{placeholders}} it can use. The team edits
 * them in the admin (Emails); an edit is kept in `email_templates` and
 * "Back to the default" removes it. Bodies are plain text: the HTML part of
 * the email is the same text with every value escaped.
 */

export interface Placeholder {
  name: string;
  description: string;
  /** Used for the admin's preview and test email. */
  sample: string;
}

export type EmailTemplateKey =
  | "password_reset"
  | "password_set"
  | "account_activated"
  | "plan_renewed"
  | "build_ready"
  | "build_failed"
  | "setup_request"
  | "new_order"
  | "new_appointment"
  | "new_inquiry"
  | "announcement";

export interface EmailTemplateDefinition {
  key: EmailTemplateKey;
  name: string;
  /** Who gets it, and when. */
  description: string;
  placeholders: Placeholder[];
  subject: string;
  body: string;
}

/** Values every email can use. */
export const GLOBAL_PLACEHOLDERS: Placeholder[] = [
  { name: "yallapp_whatsapp", description: "Yallapp's WhatsApp number (Settings)", sample: "+90 544 673 19 42" },
  { name: "yallapp_email", description: "Yallapp's email address (Settings)", sample: "info@yallapp.com.tr" },
];

const SIGNATURE =
  "\n\nYallapp\nhttps://yallapp.com.tr · WhatsApp {{yallapp_whatsapp}}\nYallapp is a trading name of WEBEK LTD, registered in England and Wales, company no. 16326894.";

const NAME: Placeholder = { name: "name", description: "The client's name", sample: "Ada Lovelace" };

export const EMAIL_TEMPLATES: EmailTemplateDefinition[] = [
  {
    key: "password_reset",
    name: "Password reset",
    description: "To a client who asked to reset their password on the sign-in page.",
    placeholders: [NAME, { name: "link", description: "The link to choose a new password (1 hour, once)", sample: "https://yallapp.com.tr/reset-password?token=sample" }],
    subject: "Reset your Yallapp password",
    body:
      "Hello {{name}},\n\nWe received a request to reset your Yallapp password. Use this link to choose a new one:\n\n{{link}}\n\n" +
      "The link works once and expires in 1 hour. If you didn't ask for this, you can ignore this email." +
      SIGNATURE,
  },
  {
    key: "password_set",
    name: "Set your password",
    description: "To a client whose account the team added, or who signs in for the first time without a password.",
    placeholders: [NAME, { name: "link", description: "The link to set a password (1 hour, once)", sample: "https://yallapp.com.tr/reset-password?token=sample" }],
    subject: "Set your Yallapp password",
    body:
      "Hello {{name}},\n\nUse this link to set the password for your Yallapp account:\n\n{{link}}\n\n" +
      "The link works once and expires in 1 hour. If you didn't ask for this, you can ignore this email." +
      SIGNATURE,
  },
  {
    key: "account_activated",
    name: "Account activated",
    description: "To a client when their account is activated, by the team or a card payment.",
    placeholders: [
      NAME,
      { name: "plan", description: "The plan's name", sample: "Pro" },
      { name: "active_until", description: "The last day of the plan", sample: "12 Oct 2027" },
      { name: "license_key", description: "The license key", sample: "YALL-AB12-CD34-EF56" },
      { name: "dashboard_url", description: "The client dashboard's address", sample: "https://yallapp.com.tr/dashboard" },
    ],
    subject: "Your Yallapp account is active",
    body:
      "Hello {{name}},\n\nYour Yallapp account is active.\n\nPlan: {{plan}}\nActive until: {{active_until}}\nLicense key: {{license_key}}\n\n" +
      "Next steps:\n1. Install the Yallapp plugin on your WordPress site and paste your license key.\n" +
      "2. Set up your app in your dashboard: {{dashboard_url}}\n\n" +
      "You can always find your license key on the License & plugin page." +
      SIGNATURE,
  },
  {
    key: "plan_renewed",
    name: "Plan renewed",
    description: "To a client whose license is extended, by the team or a card payment.",
    placeholders: [
      NAME,
      { name: "plan", description: "The plan's name", sample: "Pro" },
      { name: "active_until", description: "The new last day of the plan", sample: "12 Oct 2027" },
      { name: "dashboard_url", description: "The client dashboard's address", sample: "https://yallapp.com.tr/dashboard" },
    ],
    subject: "Your Yallapp plan has been renewed",
    body: "Hello {{name}},\n\nYour {{plan}} plan is now active until {{active_until}}.\n\nDashboard: {{dashboard_url}}" + SIGNATURE,
  },
  {
    key: "build_ready",
    name: "Build ready",
    description: "To a client when a build of their app finishes.",
    placeholders: [
      NAME,
      { name: "build_number", description: "The build's number", sample: "7" },
      { name: "builds_url", description: "The Builds & downloads page", sample: "https://yallapp.com.tr/dashboard/builds" },
    ],
    subject: "Build #{{build_number}} of your app is ready",
    body: "Hello {{name}},\n\nBuild #{{build_number}} is ready. Your files are on the Builds & downloads page:\n{{builds_url}}\n\nYallapp",
  },
  {
    key: "build_failed",
    name: "Build didn't finish",
    description: "To a client when a build of their app fails.",
    placeholders: [
      NAME,
      { name: "build_number", description: "The build's number", sample: "7" },
      { name: "builds_url", description: "The Builds & downloads page", sample: "https://yallapp.com.tr/dashboard/builds" },
    ],
    subject: "Build #{{build_number}} of your app didn't finish",
    body: "Hello {{name}},\n\nBuild #{{build_number}} didn't finish. We've been notified and will look into it. You can follow it here:\n{{builds_url}}\n\nYallapp",
  },
  {
    key: "setup_request",
    name: "WordPress set-up request",
    description: "To the team when a client asks us to set up WordPress for their app.",
    placeholders: [
      { name: "client_name", description: "The client's name", sample: "Ada Lovelace" },
      { name: "website", description: "The website they gave", sample: "https://academy.example" },
      { name: "whatsapp", description: "Their WhatsApp number", sample: "+905321234567" },
      { name: "email", description: "Their email", sample: "ada@academy.example" },
      { name: "app_type", description: "Their app type", sample: "Academy" },
      { name: "note_line", description: "“Note: …” and a line break when they wrote a note; empty otherwise", sample: "Note: We use Tutor LMS.\n" },
    ],
    subject: "WordPress set-up request",
    body:
      "{{client_name}} asked us to set up WordPress for their app.\nWebsite: {{website}}\nWhatsApp: {{whatsapp}}\nEmail: {{email}}\nApp type: {{app_type}}\n{{note_line}}\n" +
      "Requests are listed on the super admin Clients page.",
  },
  {
    key: "new_order",
    name: "New order",
    description: "To a shop when a customer pays for an order (apps without a website).",
    placeholders: [
      { name: "app_name", description: "The app's name", sample: "Tulip Store" },
      { name: "order_number", description: "The order's number", sample: "#1024" },
      { name: "total", description: "The order's total", sample: "₺450.00" },
      { name: "order_lines", description: "One line per product, and shipping", sample: "Tulip vase × 1: ₺400.00\nShipping: ₺50.00" },
      { name: "customer", description: "The customer's name, phone, email and address, then a blank line; empty without them", sample: "Elif Yılmaz\n+905321234567\nelif@example.com\nBağdat Caddesi 1, Istanbul\n\n" },
      { name: "orders_url", description: "The dashboard's Orders page", sample: "https://yallapp.com.tr/dashboard/orders" },
    ],
    subject: "New order {{order_number}} · {{total}}",
    body: "A customer paid for an order in {{app_name}}.\n\n{{order_lines}}\nTotal: {{total}}\n\n{{customer}}See your orders: {{orders_url}}",
  },
  {
    key: "new_appointment",
    name: "New appointment",
    description: "To a business when a customer books an appointment (Bookings apps without a website).",
    placeholders: [
      { name: "app_name", description: "The app's name", sample: "Salon Lale" },
      { name: "customer_name", description: "The customer's name", sample: "Elif Yılmaz" },
      { name: "service", description: "The service", sample: "Haircut" },
      { name: "staff", description: "The staff member", sample: "Deniz" },
      { name: "date", description: "The day (business's time zone)", sample: "2026-10-20" },
      { name: "time", description: "The time (business's time zone)", sample: "14:30" },
      { name: "timezone", description: "The business's time zone", sample: "Europe/Istanbul" },
      { name: "price", description: "The price", sample: "₺600.00" },
      { name: "phone", description: "The customer's phone", sample: "+905321234567" },
      { name: "note_line", description: "“Note: …” and a line break when the customer wrote one; empty otherwise", sample: "Note: First visit.\n" },
      { name: "approval_line", description: "A line saying it waits for approval, when it does; empty otherwise", sample: "\nIt waits for your approval.\n" },
      { name: "appointments_url", description: "The dashboard's Appointments page", sample: "https://yallapp.com.tr/dashboard/appointments" },
    ],
    subject: "New appointment: {{service}}, {{date}} {{time}}",
    body:
      "{{customer_name}} booked {{service}} with {{staff}} in {{app_name}}.\n\nWhen: {{date}} at {{time}} ({{timezone}})\nPrice: {{price}}\nPhone: {{phone}}\n" +
      "{{note_line}}{{approval_line}}\nYour appointments: {{appointments_url}}",
  },
  {
    key: "new_inquiry",
    name: "New message to the office",
    description: "To a real estate office when someone messages it about a listing in the app.",
    placeholders: [
      { name: "app_name", description: "The app's name", sample: "Nile Homes" },
      { name: "customer_name", description: "The name of who wrote", sample: "Mona Adel" },
      { name: "listing", description: "The listing's title, with its reference when it has one", sample: "Garden villa (NH-7)" },
      { name: "listing_title", description: "The listing's title", sample: "Garden villa" },
      { name: "message", description: "What they wrote", sample: "Is it available?" },
      { name: "phone", description: "Their phone", sample: "+201001234567" },
      { name: "email_line", description: "“Email: …” and a line break when they gave one; empty otherwise", sample: "Email: mona@example.com\n" },
      { name: "conversation_url", description: "The conversation in the dashboard", sample: "https://yallapp.com.tr/dashboard/inquiries/3" },
    ],
    subject: "New message about {{listing_title}}",
    body: "{{customer_name}} wrote about {{listing}} in {{app_name}}:\n\n{{message}}\n\nPhone: {{phone}}\n{{email_line}}\nReply in your dashboard: {{conversation_url}}",
  },
  {
    key: "announcement",
    name: "Announcement",
    description: "To clients when the team sends an announcement by email.",
    placeholders: [
      NAME,
      { name: "title", description: "The announcement's title", sample: "New: Bookings apps" },
      { name: "message", description: "The announcement's text", sample: "Salons and clinics can now take bookings in their own app." },
      { name: "link_line", description: "The announcement's link and a blank line, when it has one; empty otherwise", sample: "More: https://yallapp.com.tr/features\n\n" },
      { name: "dashboard_url", description: "The client dashboard's address", sample: "https://yallapp.com.tr/dashboard" },
    ],
    subject: "{{title}}",
    body: "Hello {{name}},\n\n{{message}}\n\n{{link_line}}Your dashboard: {{dashboard_url}}" + SIGNATURE,
  },
];

export function emailTemplate(key: string): EmailTemplateDefinition | undefined {
  return EMAIL_TEMPLATES.find((t) => t.key === key);
}

/** The placeholders a template may use: its own and the global ones. */
export function allowedPlaceholders(template: EmailTemplateDefinition): Placeholder[] {
  return [...template.placeholders, ...GLOBAL_PLACEHOLDERS];
}

/** `{{ name }}` with anything between the braces, so a typo is found too. */
const PLACEHOLDER = /\{\{([^{}]*)\}\}/g;

/**
 * Problems with an edited subject or body: placeholders the template
 * doesn't have, and stray braces. Empty when it can be saved.
 */
export function placeholderErrors(text: string, template: EmailTemplateDefinition): string[] {
  const allowed = new Set(allowedPlaceholders(template).map((p) => p.name));
  const errors: string[] = [];
  for (const match of text.matchAll(PLACEHOLDER)) {
    const name = match[1]!;
    if (!allowed.has(name)) errors.push(`{{${name}}} isn't a placeholder of this email.`);
  }
  if (/\{\{|\}\}/.test(text.replace(PLACEHOLDER, ""))) errors.push("Every {{ needs a closing }}, around a placeholder name.");
  return [...new Set(errors)];
}

export interface TemplateText {
  subject: string;
  body: string;
}

/** Checks the admin's form for a template; the subject and body to save, or an error per field. */
export function readTemplateForm(
  template: EmailTemplateDefinition,
  input: { subject: string; body: string },
): { ok: true; text: TemplateText } | { ok: false; errors: Record<string, string> } {
  const subject = input.subject.replace(/\s+/g, " ").trim();
  const body = input.body.replace(/\r\n?/g, "\n").replace(/\s+$/, "");
  const errors: Record<string, string> = {};
  if (!subject) errors.subject = "Enter the subject.";
  else if (subject.length > 200) errors.subject = "Use at most 200 characters.";
  else if (placeholderErrors(subject, template).length) errors.subject = placeholderErrors(subject, template)[0]!;
  if (!body.trim()) errors.body = "Enter the email's text.";
  else if (body.length > 10_000) errors.body = "Use at most 10,000 characters.";
  else if (placeholderErrors(body, template).length) errors.body = placeholderErrors(body, template).join(" ");
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, text: { subject, body } };
}

/** A value for a placeholder: text (escaped in the HTML part), or text with HTML we made safe ourselves. */
export type TemplateValue = string | { text: string; html: string };

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

/**
 * Fills a template's placeholders. The text part gets the values as they
 * are; the HTML part escapes the template's text and every value (a safe
 * HTML value is used as given). Missing values are empty.
 */
export function renderTemplate(text: TemplateText, values: Record<string, TemplateValue>): RenderedEmail {
  const plain = (v: TemplateValue | undefined) => (v === undefined ? "" : typeof v === "string" ? v : v.text);
  const subject = text.subject.replace(PLACEHOLDER, (_, name: string) => plain(values[name]).replace(/\s+/g, " ")).trim();
  const bodyText = text.body.replace(PLACEHOLDER, (_, name: string) => plain(values[name]));
  let html = "";
  let last = 0;
  for (const match of text.body.matchAll(PLACEHOLDER)) {
    html += escapeHtml(text.body.slice(last, match.index)).replace(/\n/g, "<br>\n");
    const value = values[match[1]!];
    html += value === undefined ? "" : typeof value === "string" ? escapeHtml(value).replace(/\n/g, "<br>\n") : value.html;
    last = match.index + match[0].length;
  }
  html += escapeHtml(text.body.slice(last)).replace(/\n/g, "<br>\n");
  return {
    subject,
    text: bodyText,
    html: `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#24223a">${html}</body></html>`,
  };
}

/** Sample values for the admin's preview and test email. */
export function sampleValues(template: EmailTemplateDefinition): Record<string, string> {
  return Object.fromEntries(allowedPlaceholders(template).map((p) => [p.name, p.sample]));
}
