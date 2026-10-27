/**
 * The legal pages as the team can edit them in the admin (Website content),
 * in Markdown (lib/content/markdown.ts). {{contact_email}},
 * {{contact_whatsapp}} and {{contact_whatsapp_url}} (72 outside Egypt), {{contact_whatsapp_egypt}} and
 * {{contact_whatsapp_egypt_url}} (in Egypt) show the contact details
 * set in the admin's Settings.
 */

export interface LegalDefault {
  key: "privacy" | "terms" | "refund";
  path: string;
  title: string;
  updated: string;
  body: string;
}

export const LEGAL_UPDATED = "19 October 2026";

export const PRIVACY: LegalDefault = {
  key: "privacy",
  path: "/privacy",
  title: "Privacy policy",
  updated: "27 October 2026",
  body: `## 1. Who we are

Yallapp is based in Cairo, Egypt, and is the data controller for the personal data described here. We work with businesses in many countries, so we follow the data protection laws that apply to the data we handle: Egypt's Personal Data Protection Law (Law No. 151 of 2020), and, where they apply, the EU General Data Protection Regulation (GDPR) and the Turkish Personal Data Protection Law No. 6698 (KVKK). Contact: [{{contact_email}}](mailto:{{contact_email}}).

## 2. Data we collect from our clients

- **Account details:** name, email, WhatsApp number and a securely hashed password.
- **Website and app details:** your website address, app name, logo, icons, colors and store listing text.
- **Publishing credentials:** Google Play, App Store Connect, Samsung Galaxy Store and Huawei AppGallery keys, if you choose to add them. These are stored encrypted. When you turn on in-app purchases, your Google Play and App Store Connect keys are also used to make your in-app products and to check your app's purchases.
- **Billing records:** your plan, dates and payment notes.
- **Messages** you send us, and **technical logs** such as IP address, browser and sign-in times.
- **How you found us:** when you sign up, the source, medium and campaign of the link you came from, the name of the website that sent you (not the page), and whether you looked at our demo apps. We use it only to learn which pages and campaigns bring us clients, and nothing is stored in your browser for it.

## 3. Data about your app's users

How your app users' data is handled depends on where the app gets its content:

- **Your WordPress website (Yallapp plugin):** your users' accounts, phone numbers, progress and orders stay in your website's database, and Yallapp does not receive them. License checks send only your website address, plugin version and license key. When Yallapp sends your app's sign-in codes, your website sends us the phone number or email address and the code for that one message; we pass them on by WhatsApp or email and keep neither, only a one-way, keyed fingerprint of the number or address for a day, to limit abuse.
- **Another platform or your own API:** the app talks to that platform or API directly. We store only the connection details you give us, encrypted.
- **No website (content managed in the Yallapp dashboard):** we host the data your app needs, such as your users' names, phone numbers, sign-ins, orders, bookings and enquiries, and the content you add. For this data you are the data controller and Yallapp is your data processor: we use it only to run your app and on your instructions, keep it secure, and delete it when your account ends or when you ask.
- **Payments from your customers:** your customers pay you through your own payment provider account (your own iyzico, Kashier, Fawaterk, Stripe or PayPal account, or your website's own checkout). Yallapp isn't a party to those payments: it never receives the money or the card details, and keeps only an order's status and the provider's reference so your app can show them.
- **Usage statistics (every app):** so you can see how your app is used, the app sends Yallapp what happens in it: app opens (and whether it's the first), the kind of screen opened, the courses, products or other items opened with their name, actions such as adding to the cart, enrolling, booking, giving or opening the checkout page (with the amount when there is one), search texts, opened notifications and shares, together with a random install number the app makes (not linked to the user's account, and new when they turn sharing off and on again), the platform, the app and system versions and the app's language. We work out the country from the connection when the data arrives and do not keep the IP address. No names, phone numbers, email addresses or advertising IDs are sent, there are no third-party analytics or advertising tools in the apps, and nothing is used to track people across apps or websites. Search texts are only counted per day, never stored with the install number. Reports show you totals only. Your app users can turn off "Share usage statistics" in the app's settings; the app then stops sending and deletes what it hadn't sent. For these statistics you are the data controller and Yallapp is your data processor.
- **In-app purchases (every plan but Starter, when you turn them on):** when someone buys a course or membership in your app through Google Play or the App Store, Yallapp checks the purchase with the store and keeps a record of it: the store's purchase token or transaction ID, the product, its status and dates, and the account it belongs to in your app (for WordPress apps, the website user's ID). Google and Apple take the payment; Yallapp never receives the money or the card details. For these records you are the data controller and Yallapp is your data processor; they are kept while your app exists, so that refunds and restored purchases work, and deleted with it.
- **Chat (Pro and Business plans):** when your app has a chat, Yallapp stores its messages and files, the name and picture of each person who writes (for WordPress apps, the website user's ID, name and picture, and their courses for course groups), and who reported or blocked whom. For this data you are the data controller and Yallapp is your data processor. Messages and files are deleted a year after they're sent unless you keep a conversation for longer, and at once when a person deletes their account or you delete them.

In every case you are responsible for giving your app users your own privacy notice. Push notifications are sent through your own Firebase project. Sign-in codes may be sent on WhatsApp through waabek.com (from our number, or from yours if you connect it), or by email from our email server (or through your own email server if you set one up; we store its password encrypted). If you ask us for help with a problem involving one of your users, we use only the data you share with us, and only on your instructions.

## 4. Why we use your data, and our legal basis

- To provide your account, build your apps and publish them when you ask us to (performance of a contract).
- To support you and keep the service secure (legitimate interests).
- To keep accounting and tax records (legal obligation).
- To send service emails about your account and builds (performance of a contract).

## 5. Who we share it with

We share data only with providers that help us run Yallapp: hosting (webek.org) for the website, the database, apps without a website and build files, WhatsApp messaging (waabek.com) for sign-in codes, the build service that compiles your apps, and Apple or Google when we publish for you or check your app's in-app purchases. We may also share data with professional advisers or authorities when the law requires it. We never sell personal data.

## 6. International transfers

We are based in Egypt and work with clients in many countries. Some of our providers are in other countries, such as the United States. When personal data moves from one country to another, we use the safeguards the law that applies requires, such as standard contractual clauses under the GDPR and the transfer rules in Article 9 of KVKK, where they apply.

## 7. How long we keep it

We keep account data while your account is active and for up to 12 months after it closes. Billing records are kept for as long as accounting and tax laws require. Signing keys are kept until you ask us to delete them after your account ends. Technical logs are kept for up to 12 months. Single usage events from your app (each app open, screen or search) are kept for 90 days. The daily totals made from them are kept for as long as your app's plan includes: by default 3 months on Starter, 1 year on Growth, 2 years on Pro and 3 years on Business, and never after your app is deleted. Chat messages and files are kept for a year after they're sent, or for as long as you keep their conversation.

## 8. Security

All connections use HTTPS. Publishing credentials and signing keys are encrypted at rest, and only the people who need access have it.

## 9. Your rights

You can ask to access, correct or delete your data, restrict or object to how we use it, and receive a copy in a portable format. Where the GDPR or KVKK (Article 11) apply, they give you these rights, including the right to know who your data was shared with. We reply within one month. Email [{{contact_email}}](mailto:{{contact_email}}). To delete your Yallapp account and its apps' data, sign in and ask from your dashboard, or follow [Deleting your Yallapp account](/delete-account) if you can't sign in. You can also complain to the data protection authority of your country, such as the Turkish Personal Data Protection Authority (kvkk.gov.tr) or the authority in your EU country.

## 10. Cookies

We use only the cookies needed to keep you signed in, and one that remembers the site language you choose. We don’t use advertising or tracking cookies.

## 11. Changes and contact

We will post changes here and email you about important ones. Questions: [{{contact_email}}](mailto:{{contact_email}}) or WhatsApp [{{contact_whatsapp_egypt}}]({{contact_whatsapp_egypt_url}}) (in Egypt), [{{contact_whatsapp}}]({{contact_whatsapp_url}}) (outside Egypt).
`,
};

export const TERMS: LegalDefault = {
  key: "terms",
  path: "/terms",
  title: "Terms of service",
  updated: "27 October 2026",
  body: `## 1. About these terms

These terms cover your use of Yallapp: the website at yallapp.com.tr, the client dashboard, the Yallapp WordPress plugin and the mobile apps we build for you. Yallapp is based in Cairo, Egypt. In these terms, “we” and “us” mean Yallapp. By creating an account, you agree to these terms.

## 2. Who Yallapp is for

Yallapp is a business service for academies, trainers, shops, service providers, real estate businesses and other organisations. By creating an account, you confirm that you are using Yallapp for your business, trade or profession, and not as a consumer.

## 3. What Yallapp provides

Yallapp builds branded Android and iOS apps that get their content from your WordPress website, a supported platform, your own API, or content you manage in the Yallapp dashboard. Depending on your plan, we provide the WordPress plugin, hosting for apps without a website, your app build files, publishing guides, and publishing to the app stores on your behalf. Each app in your account has its own plan.

When your app sells or takes donations, your customers pay you through your own payment provider account (your own iyzico, Kashier, Fawaterk, Stripe or PayPal account, or your website's own checkout). When your app sells courses or memberships through Google Play or the App Store (in-app purchases), the store charges your customers and pays you under its own terms, after its fee; Yallapp checks each purchase with the store and gives the access it buys. Yallapp doesn't collect, hold or pass on those payments and isn't a party to those sales: prices, delivery, refunds, taxes and disputes with your customers are between you and them (and the store, for in-app purchases). You pay Yallapp only for your plans and add-ons.

## 4. Your account

You must give accurate details when you sign up. Your account becomes active after we confirm your plan. Keep your password private. You are responsible for activity on your account.

## 5. Plans, payment and renewal

Plans and prices are shown on our pricing page or agreed with our team before you pay. Prices are shown in Egyptian pounds in Egypt and in US dollars elsewhere. Card payments for Yallapp plans are charged in Egyptian pounds through Kashier, wherever you are; the payment page shows the exact amount before you pay, and your bank may convert it at its own rate and fees. You can also arrange payment with our team. Your plan runs for the period you paid for and renews only when you pay for the next period. If your plan is not renewed, your license becomes inactive and your apps stop loading content through the plugin.

## 6. Cancellation and refunds

You can cancel within 3 days of your account being activated and receive a full refund. After that, the fee for the current period is non-refundable. Full details are in our [Refund policy](/refund).

## 7. Your website, content and licenses

You keep ownership of your website, content and brand. You are responsible for holding valid licenses for the plugins, platforms and services your app uses, such as your LMS or store plugin, Digits, WooCommerce and your SMS or WhatsApp gateway. You allow us to use your name, logo and content only to build, publish and support your apps.

## 8. App store accounts and publishing

Your apps are published under your own developer accounts with each store you choose: Google Play, the App Store, Samsung Galaxy Store, Huawei AppGallery and Xiaomi GetApps. You are the publisher and are responsible for meeting each store’s policies, including your store listing and privacy disclosures. If you give us store API keys, we use them only to upload builds you request and, when you turn on in-app purchases, to make and update your in-app products, check purchases and read refunds. You can revoke them at any time.

## 9. Signing keys

We create your Android signing key, give you a copy and keep an encrypted copy so we can build your updates. Keep your copy safe. A lost key can prevent future updates to your app.

## 10. Acceptable use

You may not use Yallapp for unlawful content, content you don’t have the rights to, or malware, or resell the service without our written agreement.

## 11. Chat in your app

On the Pro and Business plans your app can have a chat: the people using your app write to you and, in academies that turn course groups on, talk with each other in each course's group. As your app's publisher, you are responsible for your app's chat and what is said in it: you answer as your business, deal with the messages people report, and stop people who misuse it from sending (Dashboard › Chat, or Yallapp Business). You may not use the chat to send unsolicited advertising. Messages and files are deleted a year after they're sent unless you keep a conversation for longer; you can delete a message or a whole conversation at any time. Chat files count in your app's storage.

## 12. Availability and support

We work to keep Yallapp available but can’t promise uninterrupted service. We announce planned maintenance in advance where possible. Support is available on WhatsApp at [{{contact_whatsapp_egypt}}]({{contact_whatsapp_egypt_url}}) (in Egypt), [{{contact_whatsapp}}]({{contact_whatsapp_url}}) (outside Egypt) and by email at [{{contact_email}}](mailto:{{contact_email}}).

## 13. Ending your account

You can stop using Yallapp at any time. We may suspend or close an account for non-payment or a breach of these terms. When an account ends, you keep the files and signing keys already delivered, but the plugin connection and new builds stop.

## 14. Liability

Nothing in these terms limits liability that the law does not allow us to limit, including liability for death or personal injury caused by negligence, or for fraud. Subject to that, we are not responsible for app store review decisions, changes made by third-party plugins or services, or indirect or consequential losses, such as lost profits. Our total liability is limited to the fees you paid in the 12 months before the claim.

## 15. Personal data

We handle personal data as described in our [Privacy policy](/privacy).

## 16. Changes to these terms

We may update these terms. We will email you about important changes at least 14 days before they take effect.

## 17. Disputes and your rights

We work with businesses in many countries. If you disagree with something we did, tell us first at [{{contact_email}}](mailto:{{contact_email}}): we will both try in good faith to settle it within 30 days of your message. If it isn’t settled, either of us can take it to the courts or authorities that have jurisdiction under the law that applies. Nothing in these terms removes the rights the law of your country gives you and that can’t be waived by agreement, including consumer and data protection rights.

## 18. Contact

Yallapp, Cairo, Egypt. Email: [{{contact_email}}](mailto:{{contact_email}}) · WhatsApp: [{{contact_whatsapp_egypt}}]({{contact_whatsapp_egypt_url}}) (in Egypt), [{{contact_whatsapp}}]({{contact_whatsapp_url}}) (outside Egypt)
`,
};

export const REFUND: LegalDefault = {
  key: "refund",
  path: "/refund",
  title: "Refund policy",
  updated: LEGAL_UPDATED,
  body: `## 1. How payments work

You pay for Yallapp plans by card in your dashboard, charged in Egyptian pounds through Kashier, or as arranged with our team. There are no automatic charges.

## 2. Cancel within 3 days

You can cancel within 3 days of your account being activated. We refund the full amount you paid for the current period, in Egyptian pounds as it was charged. If your bank converted the payment, the amount you get back depends on its rate.

## 3. After 3 days

After the 3-day period, the fee for the current period is non-refundable, including when app files have been delivered or your app has been submitted to a store.

## 4. Renewals

Your plan renews only when you pay for the next period. If you decide not to renew, nothing more is charged.

## 5. Store and third-party fees

Fees you pay to other providers, such as the Apple Developer Program, Google Play registration, LMS or Digits licenses and SMS or WhatsApp gateways, are paid to those providers. We can’t refund them.

## 6. If something goes wrong on our side

If we can’t deliver a working build because of a problem on our side, we will fix it. If we can’t fix it, we refund the unused part of your current period.

## 7. How to ask for a refund

Message us on WhatsApp at [{{contact_whatsapp_egypt}}]({{contact_whatsapp_egypt_url}}) (in Egypt), [{{contact_whatsapp}}]({{contact_whatsapp_url}}) (outside Egypt) or email [{{contact_email}}](mailto:{{contact_email}}) from your account email. Once we approve a refund, we send it to your original payment method. Depending on your bank, it takes 5 to 14 business days to reach you.

## 8. Your legal rights

Yallapp is a business service. This policy does not affect any rights you have under the law that applies to you.
`,
};
