import Link from "next/link";
import type { ReactNode } from "react";

export interface GuideStep {
  title: string;
  body: ReactNode;
  notice?: ReactNode;
}

export interface Guide {
  slug: string;
  section: "Getting started" | "Publishing" | "Troubleshooting";
  title: string;
  description: string;
  intro: ReactNode;
  before?: ReactNode[];
  steps: GuideStep[];
  outro?: ReactNode;
}

const dashboardLink = (label: string, href: string) => <Link href={href}>{label}</Link>;

export const GUIDES: Guide[] = [
  {
    slug: "install-plugin",
    section: "Getting started",
    title: "Install the plugin",
    description: "Install the Yallapp WordPress plugin that connects your website to your app.",
    intro: <p>The Yallapp plugin connects your WordPress website to your app. You install it once, and it updates like any other plugin.</p>,
    before: [
      "WordPress 6.0 or later, with PHP 7.4 or later",
      "Your LMS plugin (for example Tutor LMS) and Digits, installed and active",
      <>An active Yallapp account, with access to {dashboardLink("License & plugin", "/dashboard/license")}</>,
    ],
    steps: [
      {
        title: "Download the plugin",
        body: (
          <p>
            In your dashboard, open <b>License &amp; plugin</b> and choose <b>Download plugin</b>. You get a .zip file. Don’t unzip it.
          </p>
        ),
      },
      {
        title: "Upload it to WordPress",
        body: (
          <p>
            In WordPress admin, go to <b>Plugins › Add New Plugin › Upload Plugin</b>, choose the .zip file, then select <b>Install Now</b> and <b>Activate</b>.
          </p>
        ),
      },
      {
        title: "Open the Yallapp settings",
        body: (
          <p>
            A <b>Yallapp</b> item appears in the WordPress admin menu. The plugin checks which LMS, Digits and WooCommerce versions are installed and shows what it found.
          </p>
        ),
      },
    ],
  },
  {
    slug: "activate-license",
    section: "Getting started",
    title: "Activate your license",
    description: "Connect the plugin to your Yallapp plan with your license key.",
    intro: <p>Your license key connects the plugin to your Yallapp plan. One license works on one website at a time.</p>,
    steps: [
      {
        title: "Copy your license key",
        body: (
          <p>
            Open {dashboardLink("License & plugin", "/dashboard/license")} in your dashboard and copy your key. It looks like <b>YALL-XXXX-XXXX-XXXX</b>. We also sent it to you by email when your account was activated.
          </p>
        ),
      },
      {
        title: "Paste it in the plugin",
        body: (
          <p>
            In WordPress admin, open <b>Yallapp</b>, paste the key into the license field and select <b>Activate</b>.
          </p>
        ),
      },
      {
        title: "Check the status",
        body: (
          <p>
            The plugin shows <b>Active</b> with your plan and renewal date, and your dashboard shows the connected website. The plugin checks the license every 12 hours. If it can’t reach us for a while, your app keeps working for 72 hours.
          </p>
        ),
        notice: (
          <span>
            Moving to a new domain? Deactivate the license in the plugin on the old site, or release it from <b>License &amp; plugin</b> in your dashboard. Then activate it on the new site.
          </span>
        ),
      },
    ],
  },
  {
    slug: "push-notifications",
    section: "Getting started",
    title: "Connect push notifications",
    description: "Send push notifications through your own Firebase project.",
    intro: (
      <p>
        Push notifications are sent through your own Firebase project, so your students’ devices are registered under your account, not ours. Firebase is free for this use.
      </p>
    ),
    before: ["A Google account for the Firebase console", "Your Android package name and iOS bundle ID from the App setup page", "An Apple Developer account, for iPhone notifications"],
    steps: [
      {
        title: "Create a Firebase project",
        body: (
          <p>
            Open the Firebase console, choose <b>Create a project</b> and give it your academy’s name.
          </p>
        ),
      },
      {
        title: "Add your Android and iOS apps",
        body: (
          <p>
            Add an Android app with your package name and download <b>google-services.json</b>. Add an iOS app with your bundle ID and download <b>GoogleService-Info.plist</b>.
          </p>
        ),
      },
      {
        title: "Connect Apple push notifications",
        body: (
          <p>
            In Apple Developer, create an APNs authentication key. In Firebase, open <b>Project settings › Cloud Messaging</b> and upload it under your iOS app.
          </p>
        ),
      },
      {
        title: "Upload the two files",
        body: (
          <p>
            In your dashboard, open <b>App setup › Publishing</b> and upload google-services.json and GoogleService-Info.plist under <b>Push notifications</b>. We check that each file matches your package name or bundle ID. Notifications work from your next build.
          </p>
        ),
      },
      {
        title: "Let your website send notifications",
        body: (
          <p>
            In Firebase, open <b>Project settings › Service accounts</b> and choose <b>Generate new private key</b>. In WordPress, open <b>Yallapp</b> and upload that file under <b>Notifications (Firebase)</b>. It’s stored encrypted on your website and used only to send your notifications.
          </p>
        ),
      },
    ],
  },
  {
    slug: "google-play",
    section: "Publishing",
    title: "Publish on Google Play",
    description: "Use the files from your dashboard to publish your app under your own Google Play developer account.",
    intro: <p>Use the files from your dashboard to publish your app under your own Google Play developer account.</p>,
    before: [
      "A Google Play developer account",
      <>Your Android App Bundle (.aab) and signing key from {dashboardLink("Builds & downloads", "/dashboard/builds")}</>,
      "Your store assets: icon, feature graphic and screenshots",
      "A privacy policy page on your website",
    ],
    steps: [
      {
        title: "Create the app in Play Console",
        body: (
          <p>
            Open Play Console, choose <b>Create app</b>, enter your app name and default language, and select <b>App</b> and <b>Free</b>.
          </p>
        ),
      },
      {
        title: "Fill in the store listing",
        body: <p>Add the short and full description, then upload the icon (512 × 512), feature graphic (1024 × 500) and phone screenshots from your store assets.</p>,
      },
      {
        title: "Complete the app content section",
        body: <p>Add your privacy policy link, content rating, target audience and data safety answers.</p>,
        notice: (
          <span>
            Under <b>App access</b>, give reviewers the test number and fixed code from the plugin’s <b>Store review access</b> setting. Without it, reviewers can’t sign in and the app may be rejected.
          </span>
        ),
      },
      {
        title: "Run a closed test",
        body: (
          <p>
            Create a closed testing release and upload your .aab file. New personal developer accounts must run a closed test with enough testers for the required period before they can publish to production. Check the current requirement in Play Console.
          </p>
        ),
      },
      {
        title: "Release to production",
        body: <p>Create a production release with the same .aab, add release notes and send it for review. Keep your signing key safe: every future update must use it.</p>,
      },
    ],
  },
  {
    slug: "app-store",
    section: "Publishing",
    title: "Publish on the App Store",
    description: "Publish your iOS app under your own Apple Developer account.",
    intro: <p>Publish your iOS app under your own Apple Developer account. On the Pro plan, we upload each build to TestFlight for you.</p>,
    before: [
      "An Apple Developer Program membership",
      <>Your iOS build (.ipa) from {dashboardLink("Builds & downloads", "/dashboard/builds")}, or a TestFlight upload on the Pro plan</>,
      "Your store assets and iPhone screenshots",
      "A privacy policy page on your website",
    ],
    steps: [
      {
        title: "Create the app in App Store Connect",
        body: (
          <p>
            In App Store Connect, open <b>Apps</b>, choose <b>+ › New App</b>, select iOS, and enter your app name, primary language, bundle ID and an SKU. The bundle ID must match the one on your App setup page.
          </p>
        ),
      },
      {
        title: "Upload the build",
        body: (
          <p>
            Starter: upload the .ipa file with Apple’s <b>Transporter</b> app on a Mac. Pro: we upload it to TestFlight for you. The build appears in App Store Connect after Apple processes it.
          </p>
        ),
      },
      {
        title: "Fill in the App Store listing",
        body: <p>Add the subtitle, description, keywords, support URL and iPhone screenshots from your store assets.</p>,
      },
      {
        title: "Complete App Privacy and review information",
        body: <p>Answer the App Privacy questions and add your privacy policy link.</p>,
        notice: (
          <span>
            Under <b>App Review Information</b>, add the test number and fixed code from the plugin’s <b>Store review access</b> setting, so reviewers can sign in.
          </span>
        ),
      },
      {
        title: "Submit for review",
        body: (
          <p>
            Choose the build, select <b>Add for Review</b> and submit. Your iOS app doesn’t show purchase buttons for paid courses, in line with Apple’s rules, so don’t mention prices or buying in the iOS description.
          </p>
        ),
      },
    ],
  },
  {
    slug: "release-update",
    section: "Publishing",
    title: "Release an update",
    description: "Build and publish a new version of your app.",
    intro: (
      <p>
        Most changes don’t need a new app version: courses, lessons, prices and the settings in the Yallapp plugin come from your website and show up in the app right away. Build a new version when you change your app name, icon or logo, or when we release new app features.
      </p>
    ),
    steps: [
      {
        title: "Start a new build",
        body: (
          <p>
            Open {dashboardLink("Builds & downloads", "/dashboard/builds")}, choose <b>Start new build</b> and enter the new app version, for example 1.0.1. Each build gets a higher version code automatically.
          </p>
        ),
      },
      {
        title: "Publish the new version",
        body: (
          <p>
            Starter: download the new .aab and .ipa, then create a new release in Play Console and a new version in App Store Connect. Pro: we upload the new version for you, and you can follow each step on the Builds &amp; downloads page.
          </p>
        ),
        notice: <span>Always use the same Android signing key. Google Play rejects updates signed with a different key.</span>,
      },
    ],
  },
  {
    slug: "sign-in-codes",
    section: "Troubleshooting",
    title: "Sign-in codes don't arrive",
    description: "What to check when students don't receive their verification code.",
    intro: <p>The app sends sign-in codes through Digits and the SMS or WhatsApp gateway configured on your website. Most problems are in that chain.</p>,
    steps: [
      {
        title: "Try signing in on your website",
        body: <p>Use the same phone number to sign in on your website. If the code doesn’t arrive there either, the problem is in Digits or your gateway, not in the app.</p>,
      },
      {
        title: "Check your gateway",
        body: <p>Check your gateway balance, your sender name or approved message template, and the gateway’s delivery logs.</p>,
      },
      {
        title: "Check the phone number",
        body: <p>Students must enter their number with the right country code. Compare the number with the one in the student’s WordPress account.</p>,
      },
      {
        title: "Wait a few minutes",
        body: <p>Codes are rate limited per phone number and per network to stop abuse. After several attempts, a student has to wait before asking for a new code.</p>,
      },
    ],
  },
  {
    slug: "videos",
    section: "Troubleshooting",
    title: "Videos don't play",
    description: "What to check when a lesson video doesn't play in the app.",
    intro: <p>The app plays the same video sources your LMS supports: direct uploads, YouTube, Vimeo and embeds.</p>,
    steps: [
      {
        title: "Play the lesson on your website",
        body: <p>Open the lesson on your website while signed in as a student. If it doesn’t play there, fix the lesson first.</p>,
      },
      {
        title: "Allow embedding",
        body: <p>For YouTube and Vimeo, the video’s privacy settings must allow embedding. For Vimeo videos limited to certain domains, add your website’s domain.</p>,
      },
      {
        title: "Reopen the lesson",
        body: <p>Uploaded videos play from temporary links. If a lesson stayed open for a long time, or the phone’s date and time are wrong, close it and open it again.</p>,
      },
    ],
  },
  {
    slug: "store-rejection",
    section: "Troubleshooting",
    title: "The store rejected my app",
    description: "Common review problems and how to fix them.",
    intro: <p>Apple and Google explain each rejection in their message. These are the most common reasons for academy apps.</p>,
    steps: [
      {
        title: "Reviewers couldn't sign in",
        body: (
          <p>
            Turn on <b>Store review access</b> in the Yallapp plugin and give reviewers the test number and fixed code: under App access in Play Console, and under App Review Information in App Store Connect.
          </p>
        ),
      },
      {
        title: "Missing privacy information",
        body: <p>Add a privacy policy page to your website, link it in both stores, and complete the data safety (Google) and App Privacy (Apple) answers.</p>,
      },
      {
        title: "Not enough content",
        body: <p>Make sure the review account can see real courses with lessons. An empty academy can be rejected for limited functionality.</p>,
      },
      {
        title: "Purchases on iOS",
        body: <p>Your iOS app doesn’t sell courses. Remove prices and links to buy courses from your App Store description and screenshots.</p>,
      },
    ],
    outro: <p>Still stuck? Send us the rejection message on WhatsApp and we’ll help you reply.</p>,
  },
];

export const GUIDE_SECTIONS: Guide["section"][] = ["Getting started", "Publishing", "Troubleshooting"];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
