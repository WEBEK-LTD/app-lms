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
  | "build_failed_team"
  | "setup_request"
  | "wordpress_ready"
  | "new_order"
  | "new_appointment"
  | "new_inquiry"
  | "announcement"
  | "publishing_status"
  | "publishing_request"

  // 13 Plans, limits and owner notices
  | "app_users_80"
  | "app_users_100"
  | "plan_ends_in_7_days"
  | "plan_ends_tomorrow"
  | "plan_ends_today"

  // 18 Sign-in for every app
  | "sign_in_code"

  // 19 Sign-in gaps
  | "own_whatsapp_failed"

  // 24 Your app's own email
  | "own_email_failed"

  // 29 Charity & donations
  | "donation_receipt"

  // 47 Refunds from the dashboard
  | "payment_refunded"
  // 51 Media and storage
  | "storage_pack_added"
  | "storage_pack_ended";

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

// 32 Yallapp's name and city; no registration number or street address.
const SIGNATURE = "\n\nYallapp\nhttps://yallapp.com.tr · WhatsApp {{yallapp_whatsapp}}\nYallapp · Cairo, Egypt";

const NAME: Placeholder = { name: "name", description: "The client's name", sample: "Ada Lovelace" };
const APP_NAME: Placeholder = { name: "app_name", description: "The app's name (an account can have several apps)", sample: "Ada Academy" };
const PLAN: Placeholder = { name: "plan", description: "The app's plan", sample: "Growth" };
const USAGE_PLACEHOLDERS: Placeholder[] = [
  PLAN,
  { name: "app_users", description: "The app's users now", sample: "812" },
  { name: "app_user_limit", description: "The app users the plan includes", sample: "1,000" },
  { name: "upgrade_url", description: "The link to change the app's plan", sample: "https://yallapp.com.tr/dashboard/open?app=sample&to=change-plan" },
];
const RENEW_PLACEHOLDERS: Placeholder[] = [
  PLAN,
  { name: "end_date", description: "The last day of the plan", sample: "31 Mar 2027" },
  { name: "renew_url", description: "The link to renew the app's plan by card", sample: "https://yallapp.com.tr/dashboard/open?app=sample&to=renew" },
];

const STORAGE_PLACEHOLDERS: Placeholder[] = [
  { name: "used", description: "What the app's files take now", sample: "23.4 GB" },
  { name: "storage", description: "The app's storage now (the plan's, with the packs still running)", sample: "45 GB" },
  { name: "media_url", description: "The link to the app's Media page", sample: "https://yallapp.com.tr/dashboard/open?app=sample&to=media" },
];

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
    description: "To a client when one of their apps is activated, by the team or a card payment.",
    placeholders: [
      NAME,
      APP_NAME,
      { name: "plan", description: "The plan's name", sample: "Pro" },
      { name: "active_until", description: "The last day of the plan", sample: "12 Oct 2027" },
      { name: "license_key", description: "The license key", sample: "YALL-AB12-CD34-EF56" },
      { name: "dashboard_url", description: "The client dashboard's address", sample: "https://yallapp.com.tr/dashboard" },
      { name: "payment_line", description: "52 The card payment and its receipt, and a blank line, after a card payment; empty when the team activated it", sample: "Paid: EGP 1,500 (about $30) by card through Kashier.\nReceipt: https://yallapp.com.tr/dashboard/license/receipts/0f8e\n\n" },
    ],
    subject: "Your Yallapp account is active",
    body:
      "Hello {{name}},\n\nYour Yallapp account is active.\n\nApp: {{app_name}}\nPlan: {{plan}}\nActive until: {{active_until}}\nLicense key: {{license_key}}\n\n{{payment_line}}" +
      "Next steps:\n1. Install the Yallapp plugin on your WordPress site and paste your license key.\n" +
      "2. Set up your app in your dashboard: {{dashboard_url}}\n\n" +
      "You can always find your license key on the License & plugin page." +
      SIGNATURE,
  },
  {
    key: "plan_renewed",
    name: "Plan renewed",
    description: "To a client when one of their apps' license is extended, by the team or a card payment.",
    placeholders: [
      NAME,
      APP_NAME,
      { name: "plan", description: "The plan's name", sample: "Pro" },
      { name: "active_until", description: "The new last day of the plan", sample: "12 Oct 2027" },
      { name: "dashboard_url", description: "The client dashboard's address", sample: "https://yallapp.com.tr/dashboard" },
      { name: "payment_line", description: "52 The card payment and its receipt, and a blank line, after a card payment; empty when the team activated it", sample: "Paid: EGP 1,500 (about $30) by card through Kashier.\nReceipt: https://yallapp.com.tr/dashboard/license/receipts/0f8e\n\n" },
    ],
    subject: "Your Yallapp plan has been renewed",
    body: "Hello {{name}},\n\nThe {{plan}} plan of {{app_name}} is now active until {{active_until}}.\n\n{{payment_line}}Dashboard: {{dashboard_url}}" + SIGNATURE,
  },
  {
    key: "build_ready",
    name: "Build ready",
    description: "To a client when a build of one of their apps finishes.",
    placeholders: [
      NAME,
      APP_NAME,
      { name: "build_number", description: "The build's number (per app)", sample: "7" },
      { name: "version", description: "The app version of the build", sample: "1.0.6" },
      { name: "note_line", description: "A note from the build and a blank line, when there is one; empty otherwise", sample: "Add your App Store Connect key in Publishing to get the iOS app as well.\n\n" },
      { name: "builds_url", description: "The app's Builds & downloads page", sample: "https://yallapp.com.tr/dashboard/open/0f8e?to=builds" },
    ],
    subject: "{{app_name}}: build #{{build_number}} is ready",
    body:
      "Hello {{name}},\n\nBuild #{{build_number}} of {{app_name}} (version {{version}}) is ready.\n\n{{note_line}}Download your files on the Builds & downloads page:\n{{builds_url}}" +
      SIGNATURE,
  },
  {
    key: "build_failed",
    name: "Build didn't finish",
    description: "To a client when a build of one of their apps fails. The team gets “Build didn't finish (team)” at the same time.",
    placeholders: [
      NAME,
      APP_NAME,
      { name: "build_number", description: "The build's number (per app)", sample: "7" },
      { name: "version", description: "The app version of the build", sample: "1.0.6" },
      { name: "reason", description: "Why it didn't finish, in plain words", sample: "The Android app couldn't be built." },
      { name: "builds_url", description: "The app's Builds & downloads page", sample: "https://yallapp.com.tr/dashboard/open/0f8e?to=builds" },
    ],
    subject: "{{app_name}}: build #{{build_number}} didn't finish",
    body:
      "Hello {{name}},\n\nBuild #{{build_number}} of {{app_name}} (version {{version}}) didn't finish, so nothing was published.\n\n{{reason}}\n\n" +
      "Our team has been told and will look into it. You can also start it again with Try again on the Builds & downloads page:\n{{builds_url}}" +
      SIGNATURE,
  },
  {
    key: "build_failed_team",
    name: "Build problem (team)",
    description: "To the team (the super admin emails) when a client's build fails, or its iOS app couldn't be built.",
    placeholders: [
      { name: "client_name", description: "The client's name", sample: "Ada Lovelace" },
      APP_NAME,
      { name: "build_number", description: "The build's number (per app)", sample: "7" },
      { name: "version", description: "The app version of the build", sample: "1.0.6" },
      { name: "status", description: "How the build ended", sample: "Didn't finish" },
      { name: "reason", description: "The pipeline's message", sample: "The Android app couldn't be built." },
      { name: "log_line", description: "“Build log: …” and a line break when there is a log; empty otherwise", sample: "Build log: https://github.com/WEBEK-LTD/app-lms/actions/runs/1\n" },
      { name: "admin_url", description: "The client's page in the admin", sample: "https://yallapp.com.tr/admin/clients/0f8e" },
    ],
    subject: "Build problem: {{app_name}} #{{build_number}}",
    body:
      "Build #{{build_number}} of {{app_name}} ({{client_name}}, version {{version}}) had a problem.\n\nStatus: {{status}}\nWhat happened: {{reason}}\n{{log_line}}\n" +
      "The client was emailed too. Their page: {{admin_url}}",
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
  // 19 The answer to a set-up request.
  {
    key: "wordpress_ready",
    name: "WordPress site ready",
    description: "To a client when the WordPress site our team set up for their app is ready: the team marks it ready, or the plugin is activated on it.",
    placeholders: [
      NAME,
      APP_NAME,
      { name: "website", description: "The new WordPress site", sample: "https://academy.example" },
      { name: "setup_url", description: "The link to the app's setup", sample: "https://yallapp.com.tr/dashboard/open/sample?to=setup" },
    ],
    subject: "{{app_name}}: your WordPress site is ready",
    body:
      "Hello {{name}},\n\nYour WordPress site is ready: {{website}}\n\n{{app_name}} now gets its content from it, through the Yallapp plugin. " +
      "Finish the remaining setup steps and your first build starts:\n\n{{setup_url}}" +
      SIGNATURE,
  },
  {
    key: "new_order",
    name: "New order",
    description: "To a shop when a customer pays for an order (apps without a website).",
    placeholders: [
      { name: "app_name", description: "The app's name", sample: "Tulip Store" },
      { name: "order_number", description: "The order's number", sample: "#1024" },
      { name: "total", description: "The order's total", sample: "₺450.00" },
      { name: "order_lines", description: "One line per product with its options, shipping (a restaurant's delivery fee), and how a restaurant's order is collected", sample: "Tulip vase × 1: ₺400.00\nShipping: ₺50.00" },
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
      { name: "contact_label", description: "“Phone”, or “Email” when the customer signed in by email", sample: "Phone" },
      { name: "phone", description: "The customer's phone, or their email when they signed in by email", sample: "+905321234567" },
      { name: "note_line", description: "“Note: …” and a line break when the customer wrote one; empty otherwise", sample: "Note: First visit.\n" },
      {
        name: "intake_line",
        description: "A line saying the intake answers are on the dashboard, when the customer answered the intake questions; empty otherwise. The answers themselves are never emailed.",
        sample: "See the intake answers on your dashboard.\n",
      },
      { name: "approval_line", description: "A line saying it waits for approval, when it does; empty otherwise", sample: "\nIt waits for your approval.\n" },
      { name: "appointments_url", description: "The dashboard's Appointments page", sample: "https://yallapp.com.tr/dashboard/appointments" },
    ],
    subject: "New appointment: {{service}}, {{date}} {{time}}",
    body:
      "{{customer_name}} booked {{service}} with {{staff}} in {{app_name}}.\n\nWhen: {{date}} at {{time}} ({{timezone}})\nPrice: {{price}}\n{{contact_label}}: {{phone}}\n" +
      "{{note_line}}{{intake_line}}{{approval_line}}\nYour appointments: {{appointments_url}}",
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
  // 14.1 We publish for you
  {
    key: "publishing_status",
    name: "Publishing status changed",
    description: "To a client when the team moves their app's Google Play or App Store publishing to a new status.",
    placeholders: [
      NAME,
      APP_NAME,
      { name: "store", description: "Google Play or the App Store", sample: "Google Play" },
      { name: "status", description: "The new status", sample: "In review" },
      { name: "status_text", description: "What the status means for the client", sample: "Google is reviewing your app. This usually takes a few days." },
      { name: "note_line", description: "The team's note and a blank line, when there is one; empty otherwise", sample: "Note: The privacy policy page must mention the app.\n\n" },
      { name: "store_link_line", description: "“Your app: <link>” and a blank line once it's live; empty otherwise", sample: "Your app: https://play.google.com/store/apps/details?id=com.example.app\n\n" },
      { name: "publishing_url", description: "The app's Publishing page", sample: "https://yallapp.com.tr/dashboard/open/0f8e?to=publishing" },
    ],
    subject: "{{app_name}} on {{store}}: {{status}}",
    body:
      "Hello {{name}},\n\nPublishing {{app_name}} on {{store}}: {{status}}.\n{{status_text}}\n\n{{note_line}}{{store_link_line}}" +
      "Follow every step on your Publishing page:\n{{publishing_url}}" +
      SIGNATURE,
  },
  {
    key: "publishing_request",
    name: "Publishing request (team)",
    description: "To the publishing team email (Settings) when a client asks us to publish their app, and when they tick the last step of the checklist.",
    placeholders: [
      { name: "client_name", description: "The client's name", sample: "Ada Lovelace" },
      APP_NAME,
      { name: "event", description: "What happened", sample: "asked us to publish their app" },
      { name: "email", description: "Their email", sample: "ada@academy.example" },
      { name: "whatsapp", description: "Their WhatsApp number", sample: "+905321234567" },
      { name: "admin_url", description: "The Publishing queue in the admin", sample: "https://yallapp.com.tr/admin/publishing" },
    ],
    subject: "Publishing: {{client_name}} {{event}}",
    body:
      "{{client_name}} {{event}} ({{app_name}}).\nEmail: {{email}}\nWhatsApp: {{whatsapp}}\n\nThe Publishing queue: {{admin_url}}",
  },
  // 13 Plans, limits and owner notices: each sent once per crossing or per license period.
  {
    key: "app_users_80",
    name: "App users at 80%",
    description: "To a client when an app on the hosted API reaches 80% of the app users its plan allows (once per crossing).",
    placeholders: [NAME, APP_NAME, ...USAGE_PLACEHOLDERS],
    subject: "{{app_name}} has used 80% of its app users",
    body:
      "Hello {{name}},\n\n{{app_name}} now has {{app_users}} of the {{app_user_limit}} app users its {{plan}} plan includes. " +
      "When it reaches {{app_user_limit}}, new people can't sign up in the app; everyone who already has an account keeps using it.\n\n" +
      "Upgrade for more app users: {{upgrade_url}}" +
      SIGNATURE,
  },
  {
    key: "app_users_100",
    name: "App users limit reached",
    description: "To a client when an app on the hosted API reaches the app users its plan allows (once per crossing).",
    placeholders: [NAME, APP_NAME, ...USAGE_PLACEHOLDERS],
    subject: "{{app_name}} reached its app users limit",
    body:
      "Hello {{name}},\n\n{{app_name}} has {{app_users}} app users, the most its {{plan}} plan includes. " +
      "New people can't sign up in the app right now; everyone who already has an account keeps using it.\n\n" +
      "Upgrade to take new members again: {{upgrade_url}}" +
      SIGNATURE,
  },
  {
    key: "plan_ends_in_7_days",
    name: "Plan ends in 7 days",
    description: "To a client 7 days before an app's plan ends (once per plan period).",
    placeholders: [NAME, APP_NAME, ...RENEW_PLACEHOLDERS],
    subject: "{{app_name}}: your plan ends on {{end_date}}",
    body:
      "Hello {{name}},\n\nThe {{plan}} plan of {{app_name}} ends on {{end_date}}. When it ends, the app pauses until the plan is renewed.\n\n" +
      "Renew by card: {{renew_url}}" +
      SIGNATURE,
  },
  {
    key: "plan_ends_tomorrow",
    name: "Plan ends tomorrow",
    description: "To a client 1 day before an app's plan ends (once per plan period).",
    placeholders: [NAME, APP_NAME, ...RENEW_PLACEHOLDERS],
    subject: "{{app_name}}: your plan ends tomorrow",
    body:
      "Hello {{name}},\n\nThe {{plan}} plan of {{app_name}} ends tomorrow, {{end_date}}. Renew it today so your app keeps running.\n\n" +
      "Renew by card: {{renew_url}}" +
      SIGNATURE,
  },
  {
    key: "plan_ends_today",
    name: "Plan ends today",
    description: "To a client on the day an app's plan ends (once per plan period).",
    placeholders: [NAME, APP_NAME, ...RENEW_PLACEHOLDERS],
    subject: "{{app_name}}: your plan ends today",
    body:
      "Hello {{name}},\n\nThe {{plan}} plan of {{app_name}} ends today, {{end_date}}. The app pauses when it ends and comes back as soon as you renew.\n\n" +
      "Renew by card: {{renew_url}}" +
      SIGNATURE,
  },
  // 18 To an app's users, in the app's name: no Yallapp signature.
  {
    key: "sign_in_code",
    name: "Sign-in code",
    description:
      "To someone signing in to a client's app by email (apps on the hosted API, and WordPress sites with email codes). Sent in the app's name, from the app's own email server when its owner set one.",
    placeholders: [
      { name: "app_name", description: "The app's name", sample: "Nour Academy" },
      { name: "code", description: "The 6-digit code", sample: "482913" },
      { name: "minutes", description: "How long the code works, in minutes", sample: "5" },
    ],
    subject: "{{code}} is your {{app_name}} code",
    body:
      "Your {{app_name}} sign-in code is {{code}}.\n\nIt expires in {{minutes}} minutes. Don't share it with anyone.\n\n" +
      "If you didn't try to sign in to {{app_name}}, you can ignore this email.",
  },
  {
    // 29 No tax-deductibility claims: whether a gift is deductible depends on the charity and the donor.
    key: "donation_receipt",
    name: "Donation receipt",
    description:
      "To a donor when their donation to a charity's campaign is paid (Charity & donations apps). Sent in the charity's name, from the app's own email server when its owner set one.",
    placeholders: [
      { name: "org_name", description: "The charity's name (the app's name)", sample: "Harbour Food Bank" },
      { name: "donor_name", description: "The donor's name", sample: "Elif Yılmaz" },
      { name: "amount", description: "The amount given", sample: "₺250.00" },
      { name: "campaign", description: "The campaign", sample: "Winter food parcels" },
      { name: "date", description: "The day the payment went through", sample: "14 October 2026" },
      { name: "reference", description: "The donation's reference", sample: "D-1042" },
      { name: "receipt_url", description: "The receipt as a web page", sample: "https://yallapp.com.tr/receipts/sample" },
    ],
    subject: "Your donation to {{org_name}} · {{reference}}",
    body:
      "Dear {{donor_name}},\n\nThank you for your donation to {{org_name}}.\n\n" +
      "Amount: {{amount}}\nCampaign: {{campaign}}\nDate: {{date}}\nReference: {{reference}}\n\n" +
      "Your receipt: {{receipt_url}}\n\nKeep this email for your records. If you have a question about your donation, contact {{org_name}} and give the reference above.",
  },
  {
    // 47 Sent in the business's name, like the donation receipt.
    key: "payment_refunded",
    name: "Payment refunded",
    description:
      "To a customer or donor when the business refunds their order, ticket, course or donation from the dashboard (apps without a website). Sent in the business's name, from the app's own email server when its owner set one.",
    placeholders: [
      { name: "org_name", description: "The business's name (the app's name)", sample: "Harbour Books" },
      { name: "customer_name", description: "The customer's or donor's name", sample: "Elif Yılmaz" },
      { name: "amount", description: "The amount refunded now", sample: "₺150.00" },
      { name: "what", description: "What was paid for", sample: "order 1042" },
      { name: "total_refunded", description: "Everything refunded of it so far, and of what", sample: "₺150.00 of ₺450.00" },
      { name: "date", description: "The day of the refund", sample: "14 October 2026" },
    ],
    subject: "{{org_name}} refunded {{amount}} of {{what}}",
    body:
      "Dear {{customer_name}},\n\n{{org_name}} refunded {{amount}} of your payment for {{what}}.\n\n" +
      "Refunded so far: {{total_refunded}}\nDate: {{date}}\n\n" +
      "The money goes back to the card you paid with. Banks usually show it within a few working days.\n\nIf you have a question about it, contact {{org_name}} and mention {{what}}.",
  },
  {
    key: "storage_pack_added",
    name: "Storage pack added",
    description: "To a client when a storage pack for an app's Media library is paid by card.",
    placeholders: [NAME, APP_NAME, { name: "pack", description: "The pack", sample: "+25 GB" }, { name: "end_date", description: "The last day of the pack (the plan's period)", sample: "31 Mar 2027" }, ...STORAGE_PLACEHOLDERS],
    subject: "{{app_name}}: {{pack}} of storage added",
    body:
      "Hello {{name}},\n\nThanks for your payment. {{app_name}} now has {{pack}} more storage for its videos, pictures and PDFs, until {{end_date}}. " +
      "Its files take {{used}} of {{storage}}.\n\nWhen you renew your plan by card, you can renew the pack with it.\n\nYour Media library: {{media_url}}" +
      SIGNATURE,
  },
  {
    key: "storage_pack_ended",
    name: "Storage pack ended, files over the storage",
    description: "To a client when a storage pack of an app ended and its files take more than the storage left (once per pack and end date). Nothing is deleted.",
    placeholders: [NAME, APP_NAME, { name: "pack", description: "The pack that ended", sample: "+25 GB" }, ...STORAGE_PLACEHOLDERS],
    subject: "{{app_name}}: your storage pack ended",
    body:
      "Hello {{name}},\n\nThe {{pack}} storage pack of {{app_name}} has ended. Its files take {{used}}, more than its {{storage}} of storage now.\n\n" +
      "Nothing has been deleted and your videos keep playing in the app, but new uploads are paused until you buy more storage or delete files you don't need.\n\n" +
      "Your Media library: {{media_url}}" +
      SIGNATURE,
  },
  {
    key: "own_whatsapp_failed",
    name: "Own WhatsApp number failed",
    description:
      "To a client when their own WhatsApp number (WABEK, on App sign-in) couldn't send an app's sign-in code. At most one a day per app; Yallapp's number sent the code instead.",
    placeholders: [
      NAME,
      APP_NAME,
      { name: "date", description: "The day it failed", sample: "14 Oct 2026" },
      { name: "sign_in_url", description: "The link to the app's App sign-in page", sample: "https://yallapp.com.tr/dashboard/open?app=sample&to=app-sign-in" },
    ],
    subject: "{{app_name}}: your WhatsApp number couldn't send sign-in codes",
    body:
      "Hello {{name}},\n\nOn {{date}}, your own WhatsApp number couldn't send a sign-in code for {{app_name}}. " +
      "So your customers still got their codes, we sent them from Yallapp's WhatsApp number, when it was available.\n\n" +
      "Check your number and your API key in your WABEK account, then send a test code on App sign-in:\n{{sign_in_url}}" +
      SIGNATURE,
  },
  {
    key: "own_email_failed",
    name: "Own email server failed",
    description:
      "To a client when their own email server (Your app's email, on App sign-in) couldn't send an email to one of their app's users. At most one a day per app; Yallapp's server sent the email instead.",
    placeholders: [
      NAME,
      APP_NAME,
      { name: "date", description: "The day it failed", sample: "14 Oct 2026" },
      { name: "reason", description: "Why, in plain words (never a password)", sample: "The email server refused the username or password." },
      { name: "sign_in_url", description: "The link to the app's App sign-in page", sample: "https://yallapp.com.tr/dashboard/open?app=sample&to=app-sign-in" },
    ],
    subject: "{{app_name}}: your email server couldn't send an email",
    body:
      "Hello {{name}},\n\nOn {{date}}, your own email server couldn't send an email to someone using {{app_name}}:\n{{reason}}\n\n" +
      "So they still got it, we sent it from Yallapp's email address instead, with your app's name.\n\n" +
      "Check your email server's settings, then send a test email on App sign-in:\n{{sign_in_url}}" +
      SIGNATURE,
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
