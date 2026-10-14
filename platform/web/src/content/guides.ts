/**
 * The guides on yallapp.com.tr/guides, as the team can edit them in the
 * admin (Website content). Each body is Markdown (lib/content/markdown.ts):
 * the text before the first `##` heading is the introduction, a "Before you
 * start" section becomes the checklist box, every other `##` section is a
 * numbered step whose `>` lines are its note, and text after a closing `---`
 * ends the guide.
 */

export type GuideSection = "Getting started" | "Publishing" | "Troubleshooting";

export interface GuideDefault {
  slug: string;
  section: GuideSection;
  title: string;
  description: string;
  body: string;
}

export const GUIDE_SECTIONS: GuideSection[] = ["Getting started", "Publishing", "Troubleshooting"];

export const GUIDES: GuideDefault[] = [
  {
    slug: "install-plugin",
    section: "Getting started",
    title: "Install the plugin",
    description: "Install the Yallapp WordPress plugin that connects your website to your app.",
    body: `The Yallapp plugin connects your WordPress website to your app. You install it once, and it updates like any other plugin.

## Before you start

- WordPress 6.0 or later, with PHP 7.4 or later
- Your LMS plugin (for example Tutor LMS) and Digits, installed and active
- An active Yallapp account, with access to [License & plugin](/dashboard/license)

## Download the plugin

In your dashboard, open **License & plugin** and choose **Download plugin**. You get a .zip file. Don’t unzip it.

## Upload it to WordPress

In WordPress admin, go to **Plugins › Add New Plugin › Upload Plugin**, choose the .zip file, then select **Install Now** and **Activate**.

## Open the Yallapp settings

A **Yallapp** item appears in the WordPress admin menu. The plugin checks which LMS, Digits and WooCommerce versions are installed and shows what it found.
`,
  },
  {
    slug: "custom-api",
    section: "Getting started",
    title: "Connect your own API",
    description: "For developers: serve the Yallapp API from a website that doesn't run WordPress.",
    body: `Your app talks to one API, described in the [Yallapp API contract](/developers/openapi.yaml) (OpenAPI 3.1). On WordPress the Yallapp plugin serves it. If your website runs on something else, your developer can serve the same endpoints, and the app works with them unchanged.

## Before you start

- A developer who can add endpoints to your website or backend
- An https address for the API, for example https://api.your-site.com/yallapp/v1
- An active Yallapp account, with your app type chosen on [App setup](/dashboard/app-type)

## Read the contract

Download [openapi.yaml](/developers/openapi.yaml) and open it in any OpenAPI viewer. Every path, field and error code the app uses is there. JSON everywhere, dates in ISO 8601 UTC, errors as \`{ code, message }\` with a stable \`code\`, lists paged with \`page\` and \`per_page\`.

## Start with what every app needs

\`GET /config\`, the sign-in endpoints (\`/auth/otp/request\`, \`/auth/otp/verify\`, \`/auth/register\`, \`/auth/refresh\`, \`/auth/logout\`), and the account endpoints under \`/me\`. Signed-in calls send \`Authorization: Bearer <access_token>\`; you send the one-time code by SMS or WhatsApp from your own system.

## Add your app type's endpoints

Academy apps use the Catalog, Learning and Quizzes endpoints, starting with \`GET /home\`. Store apps use the Store endpoints, starting with \`GET /store/home\`, and need \`store\` in \`/config\`. Bookings apps use the Bookings endpoints, starting with \`GET /bookings/home\`, and need \`bookings\` in \`/config\`. Features you don't support can be turned off in \`/config\`, and the app hides them.

## Check it from your dashboard

On the [Website step](/dashboard/setup?step=website), choose **My own API**, enter its address and select **Run the check**. We call it the way the app does and list anything missing. When the check passes, save the step and continue the setup.

> Your API must be reachable on the public internet over https. Private and local addresses are refused.

---

Your next build talks to your API. If you change the address later, the next build uses the new one.
`,
  },
  {
    slug: "activate-license",
    section: "Getting started",
    title: "Activate your license",
    description: "Connect the plugin to your Yallapp plan with your license key.",
    body: `Your license key connects the plugin to your Yallapp plan. One license works on one website at a time.

## Copy your license key

Open [License & plugin](/dashboard/license) in your dashboard and copy your key. It looks like **YALL-XXXX-XXXX-XXXX**. We also sent it to you by email when your account was activated.

## Paste it in the plugin

In WordPress admin, open **Yallapp**, paste the key into the license field and select **Activate**.

## Check the status

The plugin shows **Active** with your plan and renewal date, and your dashboard shows the connected website. The plugin checks the license every 12 hours. If it can’t reach us for a while, your app keeps working for 72 hours.

> Moving to a new domain? Deactivate the license in the plugin on the old site, or release it from **License & plugin** in your dashboard. Then activate it on the new site.
`,
  },
  {
    slug: "push-notifications",
    section: "Getting started",
    title: "Connect push notifications",
    description: "Send push notifications through your own Firebase project.",
    body: `Push notifications are sent through your own Firebase project, so your students’ devices are registered under your account, not ours. Firebase is free for this use.

## Before you start

- A Google account for the Firebase console
- Your Android package name and iOS bundle ID from the App setup page
- An Apple Developer account, for iPhone notifications

## Create a Firebase project

Open the Firebase console, choose **Create a project** and give it your academy’s name.

## Add your Android and iOS apps

Add an Android app with your package name and download **google-services.json**. Add an iOS app with your bundle ID and download **GoogleService-Info.plist**.

## Connect Apple push notifications

In Apple Developer, create an APNs authentication key. In Firebase, open **Project settings › Cloud Messaging** and upload it under your iOS app.

## Upload the two files

In your dashboard, open **App setup › Publishing** and upload google-services.json and GoogleService-Info.plist under **Push notifications**. We check that each file matches your package name or bundle ID. Notifications work from your next build.

## Let your website send notifications

In Firebase, open **Project settings › Service accounts** and choose **Generate new private key**. In WordPress, open **Yallapp** and upload that file under **Notifications (Firebase)**. It’s stored encrypted on your website and used only to send your notifications.
`,
  },
  {
    slug: "google-play",
    section: "Publishing",
    title: "Publish on Google Play",
    description: "Use the files from your dashboard to publish your app under your own Google Play developer account.",
    body: `Use the files from your dashboard to publish your app under your own Google Play developer account.

## Before you start

- A Google Play developer account
- Your Android App Bundle (.aab) and signing key from [Builds & downloads](/dashboard/builds)
- Your store assets: icon, feature graphic and screenshots
- A privacy policy page on your website

## Create the app in Play Console

Open Play Console, choose **Create app**, enter your app name and default language, and select **App** and **Free**.

## Fill in the store listing

Add the short and full description, then upload the icon (512 × 512), feature graphic (1024 × 500) and phone screenshots from your store assets.

## Complete the app content section

Add your privacy policy link, content rating, target audience and data safety answers.

> Under **App access**, give reviewers the test number and fixed code from the plugin’s **Store review access** setting. Without it, reviewers can’t sign in and the app may be rejected.

## Run a closed test

Create a closed testing release and upload your .aab file. New personal developer accounts must run a closed test with enough testers for the required period before they can publish to production. Check the current requirement in Play Console.

## Release to production

Create a production release with the same .aab, add release notes and send it for review. Keep your signing key safe: every future update must use it.
`,
  },
  {
    slug: "app-store",
    section: "Publishing",
    title: "Publish on the App Store",
    description: "Publish your iOS app under your own Apple Developer account.",
    body: `Publish your iOS app under your own Apple Developer account. On the Pro plan, we upload each build to TestFlight for you.

## Before you start

- An Apple Developer Program membership
- Your iOS build (.ipa) from [Builds & downloads](/dashboard/builds), or a TestFlight upload on the Pro plan
- Your store assets and iPhone screenshots
- A privacy policy page on your website

## Create the app in App Store Connect

In App Store Connect, open **Apps**, choose **+ › New App**, select iOS, and enter your app name, primary language, bundle ID and an SKU. The bundle ID must match the one on your App setup page.

## Upload the build

Starter: upload the .ipa file with Apple’s **Transporter** app on a Mac. Pro: we upload it to TestFlight for you. The build appears in App Store Connect after Apple processes it.

## Fill in the App Store listing

Add the subtitle, description, keywords, support URL and iPhone screenshots from your store assets.

## Complete App Privacy and review information

Answer the App Privacy questions and add your privacy policy link.

> Under **App Review Information**, add the test number and fixed code from the plugin’s **Store review access** setting, so reviewers can sign in.

## Submit for review

Choose the build, select **Add for Review** and submit. Your iOS app doesn’t show purchase buttons for paid courses, in line with Apple’s rules, so don’t mention prices or buying in the iOS description.
`,
  },
  {
    slug: "release-update",
    section: "Publishing",
    title: "Release an update",
    description: "Build and publish a new version of your app.",
    body: `Most changes don’t need a new app version: courses, lessons, prices and the settings in the Yallapp plugin come from your website and show up in the app right away. Build a new version when you change your app name, icon or logo, or when we release new app features.

## Start a new build

Open [Builds & downloads](/dashboard/builds), choose **Start new build** and enter the new app version, for example 1.0.1. Each build gets a higher version code automatically.

## Publish the new version

Starter: download the new .aab and .ipa, then create a new release in Play Console and a new version in App Store Connect. Pro: we upload the new version for you, and you can follow each step on the Builds & downloads page.

> Always use the same Android signing key. Google Play rejects updates signed with a different key.
`,
  },
  {
    slug: "sign-in-codes",
    section: "Troubleshooting",
    title: "Sign-in codes don't arrive",
    description: "What to check when students don't receive their verification code.",
    body: `The app sends sign-in codes through Digits and the SMS or WhatsApp gateway configured on your website. Most problems are in that chain.

## Try signing in on your website

Use the same phone number to sign in on your website. If the code doesn’t arrive there either, the problem is in Digits or your gateway, not in the app.

## Check your gateway

Check your gateway balance, your sender name or approved message template, and the gateway’s delivery logs.

## Check the phone number

Students must enter their number with the right country code. Compare the number with the one in the student’s WordPress account.

## Wait a few minutes

Codes are rate limited per phone number and per network to stop abuse. After several attempts, a student has to wait before asking for a new code.
`,
  },
  {
    slug: "videos",
    section: "Troubleshooting",
    title: "Videos don't play",
    description: "What to check when a lesson video doesn't play in the app.",
    body: `The app plays the same video sources your LMS supports: direct uploads, YouTube, Vimeo and embeds.

## Play the lesson on your website

Open the lesson on your website while signed in as a student. If it doesn’t play there, fix the lesson first.

## Allow embedding

For YouTube and Vimeo, the video’s privacy settings must allow embedding. For Vimeo videos limited to certain domains, add your website’s domain.

## Reopen the lesson

Uploaded videos play from temporary links. If a lesson stayed open for a long time, or the phone’s date and time are wrong, close it and open it again.
`,
  },
  {
    slug: "store-rejection",
    section: "Troubleshooting",
    title: "The store rejected my app",
    description: "Common review problems and how to fix them.",
    body: `Apple and Google explain each rejection in their message. These are the most common reasons for academy apps.

## Reviewers couldn't sign in

Turn on **Store review access** in the Yallapp plugin and give reviewers the test number and fixed code: under App access in Play Console, and under App Review Information in App Store Connect.

## Missing privacy information

Add a privacy policy page to your website, link it in both stores, and complete the data safety (Google) and App Privacy (Apple) answers.

## Not enough content

Make sure the review account can see real courses with lessons. An empty academy can be rejected for limited functionality.

## Purchases on iOS

Your iOS app doesn’t sell courses. Remove prices and links to buy courses from your App Store description and screenshots.

---

Still stuck? Send us the rejection message on WhatsApp and we’ll help you reply.
`,
  },
];
