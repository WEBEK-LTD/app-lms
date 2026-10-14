/**
 * The legal pages as the team can edit them in the admin (Website content),
 * in Markdown (lib/content/markdown.ts). {{contact_email}},
 * {{contact_whatsapp}} and {{contact_whatsapp_url}} show the contact details
 * set in the admin's Settings.
 */

export interface LegalDefault {
  key: "privacy" | "terms" | "refund";
  path: string;
  title: string;
  updated: string;
  body: string;
}

export const LEGAL_UPDATED = "14 October 2026";

export const PRIVACY: LegalDefault = {
  key: "privacy",
  path: "/privacy",
  title: "Privacy policy",
  updated: "14 October 2026",
  body: `## 1. Who we are

Yallapp is a trading name of WEBEK LTD, a company registered in England and Wales under company number 16326894, with its registered office at 71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ. WEBEK LTD is the data controller for the personal data described here. We follow the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. When we process data of people in Türkiye or the European Union, we also follow the Turkish Personal Data Protection Law No. 6698 (KVKK) and the EU General Data Protection Regulation (GDPR). Contact: [{{contact_email}}](mailto:{{contact_email}}).

## 2. Data we collect from our clients

- **Account details:** name, email, WhatsApp number and a securely hashed password.
- **Website and app details:** your website address, app name, logo, icons, colors and store listing text.
- **Publishing credentials:** Google Play and App Store Connect keys, if you choose to add them. These are stored encrypted.
- **Billing records:** your plan, dates and payment notes.
- **Messages** you send us, and **technical logs** such as IP address, browser and sign-in times.

## 3. Data about your app's users

How your app users' data is handled depends on where the app gets its content:

- **Your WordPress website (Yallapp plugin):** your users' accounts, phone numbers, progress and orders stay in your website's database, and Yallapp does not receive them. License checks send only your website address, plugin version and license key. When Yallapp sends your app's sign-in codes, your website sends us the phone number or email address and the code for that one message; we pass them on by WhatsApp or email and keep neither, only a one-way, keyed fingerprint of the number or address for a day, to limit abuse.
- **Another platform or your own API:** the app talks to that platform or API directly. We store only the connection details you give us, encrypted.
- **No website (content managed in the Yallapp dashboard):** we host the data your app needs, such as your users' names, phone numbers, sign-ins, orders, bookings and enquiries, and the content you add. For this data you are the data controller and WEBEK LTD is your data processor: we use it only to run your app and on your instructions, keep it secure, and delete it when your account ends or when you ask.

In every case you are responsible for giving your app users your own privacy notice. Push notifications are sent through your own Firebase project. Sign-in codes may be sent on WhatsApp through waabek.com (from our number, or from yours if you connect it), or by email from our email server (or through your own email server if you set one up; we store its password encrypted). If you ask us for help with a problem involving one of your users, we use only the data you share with us, and only on your instructions.

## 4. Why we use your data, and our legal basis

- To provide your account, build your apps and publish them when you ask us to (performance of a contract).
- To support you and keep the service secure (legitimate interests).
- To keep accounting and tax records (legal obligation).
- To send service emails about your account and builds (performance of a contract).

## 5. Who we share it with

We share data only with providers that help us run Yallapp: hosting (webek.org) for the website, the database, apps without a website and build files, WhatsApp messaging (waabek.com) for sign-in codes, the build service that compiles your apps, and Apple or Google when we publish for you. We may also share data with professional advisers or authorities when the law requires it. We never sell personal data.

## 6. International transfers

We are based in the United Kingdom. Some of our providers are in other countries, such as the United States. When data leaves the UK, Türkiye or the European Union, we use the safeguards the law requires, such as the UK International Data Transfer Agreement or Addendum, standard contractual clauses, and the transfer rules in Article 9 of KVKK.

## 7. How long we keep it

We keep account data while your account is active and for up to 12 months after it closes. Billing records are kept for 6 years, as UK tax law requires. Signing keys are kept until you ask us to delete them after your account ends. Technical logs are kept for up to 12 months.

## 8. Security

All connections use HTTPS. Publishing credentials and signing keys are encrypted at rest, and only the people who need access have it.

## 9. Your rights

Under the UK GDPR, you can ask to access, correct or delete your data, restrict or object to how we use it, and receive a copy in a portable format. KVKK (Article 11) and the EU GDPR give you similar rights, including the right to know who your data was shared with. We reply within one month. Email [{{contact_email}}](mailto:{{contact_email}}). You can also complain to the UK Information Commissioner’s Office (ico.org.uk), the Turkish Personal Data Protection Authority (kvkk.gov.tr), or the data protection authority in your EU country.

## 10. Cookies

We use only the cookies needed to keep you signed in. We don’t use advertising or tracking cookies.

## 11. Changes and contact

We will post changes here and email you about important ones. Questions: [{{contact_email}}](mailto:{{contact_email}}) or WhatsApp [{{contact_whatsapp}}]({{contact_whatsapp_url}}).
`,
};

export const TERMS: LegalDefault = {
  key: "terms",
  path: "/terms",
  title: "Terms of service",
  updated: LEGAL_UPDATED,
  body: `## 1. About these terms

These terms cover your use of Yallapp: the website at yallapp.com.tr, the client dashboard, the Yallapp WordPress plugin and the mobile apps we build for you. Yallapp is a trading name of WEBEK LTD, a company registered in England and Wales under company number 16326894, with its registered office at 71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ. In these terms, “we” and “us” mean WEBEK LTD. By creating an account, you agree to these terms.

## 2. Who Yallapp is for

Yallapp is a business service for academies, trainers, shops, service providers, real estate businesses and other organisations. By creating an account, you confirm that you are using Yallapp for your business, trade or profession, and not as a consumer.

## 3. What Yallapp provides

Yallapp builds branded Android and iOS apps that get their content from your WordPress website, a supported platform, your own API, or content you manage in the Yallapp dashboard. Depending on your plan, we provide the WordPress plugin, hosting for apps without a website, your app build files, publishing guides, and publishing to the app stores on your behalf. Each app in your account has its own plan.

## 4. Your account

You must give accurate details when you sign up. Your account becomes active after we confirm your plan. Keep your password private. You are responsible for activity on your account.

## 5. Plans, payment and renewal

Plans and prices are shown on our pricing page or agreed with our team before you pay. Payment is arranged directly with us. Your plan runs for the period you paid for and renews only when you pay for the next period. If your plan is not renewed, your license becomes inactive and your apps stop loading content through the plugin.

## 6. Cancellation and refunds

You can cancel within 3 days of your account being activated and receive a full refund. After that, the fee for the current period is non-refundable. Full details are in our [Refund policy](/refund).

## 7. Your website, content and licenses

You keep ownership of your website, content and brand. You are responsible for holding valid licenses for the plugins, platforms and services your app uses, such as your LMS or store plugin, Digits, WooCommerce and your SMS or WhatsApp gateway. You allow us to use your name, logo and content only to build, publish and support your apps.

## 8. App store accounts and publishing

Your apps are published under your own Apple and Google developer accounts. You are the publisher and are responsible for meeting each store’s policies, including your store listing and privacy disclosures. If you give us store API keys, we use them only to upload builds you request. You can revoke them at any time.

## 9. Signing keys

We create your Android signing key, give you a copy and keep an encrypted copy so we can build your updates. Keep your copy safe. A lost key can prevent future updates to your app.

## 10. Acceptable use

You may not use Yallapp for unlawful content, content you don’t have the rights to, or malware, or resell the service without our written agreement.

## 11. Availability and support

We work to keep Yallapp available but can’t promise uninterrupted service. We announce planned maintenance in advance where possible. Support is available on WhatsApp at [{{contact_whatsapp}}]({{contact_whatsapp_url}}) and by email at [{{contact_email}}](mailto:{{contact_email}}).

## 12. Ending your account

You can stop using Yallapp at any time. We may suspend or close an account for non-payment or a breach of these terms. When an account ends, you keep the files and signing keys already delivered, but the plugin connection and new builds stop.

## 13. Liability

Nothing in these terms limits liability that the law does not allow us to limit, including liability for death or personal injury caused by negligence, or for fraud. Subject to that, we are not responsible for app store review decisions, changes made by third-party plugins or services, or indirect or consequential losses, such as lost profits. Our total liability is limited to the fees you paid in the 12 months before the claim.

## 14. Personal data

We handle personal data as described in our [Privacy policy](/privacy).

## 15. Changes to these terms

We may update these terms. We will email you about important changes at least 14 days before they take effect.

## 16. Governing law

These terms are governed by the laws of England and Wales, and the courts of England and Wales have exclusive jurisdiction. This does not remove any mandatory rights you have under the law of the country where you are based.

## 17. Contact

WEBEK LTD, 71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ. Email: [{{contact_email}}](mailto:{{contact_email}}) · WhatsApp: [{{contact_whatsapp}}]({{contact_whatsapp_url}})
`,
};

export const REFUND: LegalDefault = {
  key: "refund",
  path: "/refund",
  title: "Refund policy",
  updated: LEGAL_UPDATED,
  body: `## 1. How payments work

Payments for Yallapp plans are arranged directly with our team. There are no automatic charges.

## 2. Cancel within 3 days

You can cancel within 3 days of your account being activated. We refund the full amount you paid for the current period.

## 3. After 3 days

After the 3-day period, the fee for the current period is non-refundable, including when app files have been delivered or your app has been submitted to a store.

## 4. Renewals

Your plan renews only when you pay for the next period. If you decide not to renew, nothing more is charged.

## 5. Store and third-party fees

Fees you pay to other providers, such as the Apple Developer Program, Google Play registration, LMS or Digits licenses and SMS or WhatsApp gateways, are paid to those providers. We can’t refund them.

## 6. If something goes wrong on our side

If we can’t deliver a working build because of a problem on our side, we will fix it. If we can’t fix it, we refund the unused part of your current period.

## 7. How to ask for a refund

Message us on WhatsApp at [{{contact_whatsapp}}]({{contact_whatsapp_url}}) or email [{{contact_email}}](mailto:{{contact_email}}) from your account email. Once we approve a refund, we send it to your original payment method. Depending on your bank, it takes 5 to 14 business days to reach you.

## 8. Your legal rights

Yallapp is a business service. This policy does not affect any rights you have under the law that applies to you.
`,
};
