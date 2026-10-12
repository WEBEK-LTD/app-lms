import type { IconName } from "@/components/icon-names";

/** Content of the public marketing pages: home, features, how it works, pricing and FAQ. */

export const WORKS_WITH = [
  "WordPress",
  "Tutor LMS",
  "LearnDash",
  "LearnPress",
  "LifterLMS",
  "MasterStudy",
  "Sensei",
  "Masteriyo",
  "Digits",
  "WooCommerce",
];

export interface Feature {
  icon: IconName;
  title: string;
  text: string;
  details: string[];
}

export const FEATURES: Feature[] = [
  {
    icon: "palette",
    title: "Your brand, your stores",
    text: "Your name, logo and colors, published under your own Google Play and App Store accounts.",
    details: [
      "Three home screen templates: Classic, Bold and Minimal",
      "Your app icon, splash color, primary color and font",
      "Light and dark mode",
      "Published as your own app, under your own developer accounts",
    ],
  },
  {
    icon: "lock",
    title: "One-time code sign-in",
    text: "Students use the same account as your website. Codes go through Digits and the SMS or WhatsApp gateway you already use.",
    details: [
      "Same accounts as your website: nothing to migrate",
      "Sign-up from the app, with the fields you choose",
      "A limit on devices per account, set by you",
      "A test number for Apple and Google app reviewers",
    ],
  },
  {
    icon: "shield",
    title: "Protected video",
    text: "Temporary video links, a moving watermark with the student's number, and screenshots blocked.",
    details: [
      "Uploaded videos play through signed links that expire",
      "Screenshots and screen recording blocked on Android, video hidden while recording on iOS",
      "Optional minimum watch time before a lesson counts as complete",
      "YouTube and Vimeo lessons play inside the app",
    ],
  },
  {
    icon: "code",
    title: "HTML & code lessons",
    text: "Rich lesson content, embedded tools and code blocks look right on every phone.",
    details: [
      "Embedded tools and iframes keep the size you set in the lesson",
      "A full-screen button for embedded tools",
      "Code blocks with syntax highlighting and a copy button",
      "Complex pages open exactly like your website, with the student signed in",
    ],
  },
  {
    icon: "workspace_premium",
    title: "Quizzes, progress & certificates",
    text: "Progress syncs with your website, and premium LMS features appear automatically when they're active.",
    details: [
      "Quizzes graded by your LMS, with timers and attempt limits",
      "Continue learning from the exact second a student stopped",
      "Certificates from your LMS's premium add-on",
      "Course reviews and ratings, and questions answered by your instructors",
      "Wishlist and My courses",
    ],
  },
  {
    icon: "notifications",
    title: "Push notifications",
    text: "New lessons, announcements and enrollment confirmations reach students instantly.",
    details: [
      "Sent automatically when you publish a lesson or an announcement, or answer a question",
      "Manual messages to everyone or to one course's students",
      "A notifications inbox in the app, so nothing is missed",
      "Students choose which notifications they receive",
    ],
  },
  {
    icon: "shopping_bag",
    title: "Selling courses",
    text: "Android students buy through your website's checkout. iOS apps are for learning, as Apple's rules require.",
    details: [
      "Your existing WooCommerce or LMS checkout, opened with the student signed in",
      "Free courses: enroll in one tap on Android and iOS",
      "Students see their orders in the Android app",
      "No purchase buttons on iOS, so your app passes App Store review",
    ],
  },
  {
    icon: "settings",
    title: "Control from WordPress",
    text: "Change settings in your WordPress dashboard and the apps follow, without a store update.",
    details: [
      "Home screen sections, featured courses and promo banner",
      "Maintenance mode and forced updates",
      "Student devices: search by number and unlink",
    ],
  },
];

export interface Step {
  title: string;
  text: string;
  details: string[];
}

export const STEPS: Step[] = [
  {
    title: "Talk to us & pick a plan",
    text: "Message us on WhatsApp. We activate your account once your plan is confirmed.",
    details: ["Create your account on yallapp.com.tr", "Choose Starter or Pro", "We activate your account and email your license key"],
  },
  {
    title: "Install the plugin",
    text: "Upload our plugin to your WordPress site and paste your license key.",
    details: ["Download the plugin from your dashboard", "WordPress › Plugins › Add New › Upload", "Paste your license key in Yallapp settings"],
  },
  {
    title: "Enter your app details",
    text: "Name, logo, colors and store details. Your apps start building right away.",
    details: ["App name, icon, logo and colors", "Pick a home screen template", "Store title and descriptions"],
  },
  {
    title: "Download or auto-publish",
    text: "Get your APK, AAB and iOS build with step-by-step guides, or let us publish them for you.",
    details: ["Starter: download your files and follow our publishing guides", "Pro: we upload every new version to Google Play and TestFlight"],
  },
];

export const REQUIREMENTS = [
  "A WordPress site with a supported LMS plugin",
  "Digits for one-time code sign-in",
  "A Google Play developer account (one-time fee to Google)",
  "An Apple Developer account for iOS (yearly fee to Apple)",
];

export interface FaqGroup {
  title: string;
  items: { q: string; a: string }[];
}

export const FAQ: FaqGroup[] = [
  {
    title: "Getting started",
    items: [
      {
        q: "Do I need my own Apple and Google developer accounts?",
        a: "Yes. Your apps are published under your own name. Apple charges a yearly fee and Google charges a one-time fee.",
      },
      {
        q: "Which LMS plugins are supported?",
        a: "Tutor LMS is supported today, in its free and pro editions. LearnDash, LearnPress, LifterLMS, MasterStudy LMS, Sensei LMS and Masteriyo are on the way. The plugin detects what's installed and adapts.",
      },
      {
        q: "Do I have to move my courses anywhere?",
        a: "No. Your courses, lessons and quizzes stay in your LMS plugin. The app reads them live from your website.",
      },
      {
        q: "How long until my apps are ready?",
        a: "Your apps start building as soon as you finish the setup in your dashboard. Store review by Google and Apple usually takes a few days.",
      },
    ],
  },
  {
    title: "Students and content",
    items: [
      {
        q: "Can students buy courses inside the app?",
        a: "On Android, through your site's existing checkout. On iOS, the app is for watching enrolled courses, in line with Apple's rules.",
      },
      {
        q: "What if my lessons contain custom HTML or code?",
        a: "Standard content is shown natively. Complex content such as embeds or page builders is shown exactly like your website.",
      },
      {
        q: "Can students share their account?",
        a: "You set how many devices each account can use. When a student reaches the limit, the new device is blocked or the oldest one is signed out, as you choose.",
      },
    ],
  },
  {
    title: "Plans and payment",
    items: [
      {
        q: "How do I pay?",
        a: "Payments are arranged directly with our team on WhatsApp. We activate your account once the payment is confirmed.",
      },
      {
        q: "Can I cancel?",
        a: "You can cancel within 3 days of your account being activated for a full refund. Depending on your bank, refunds take 5 to 14 business days. See our Refund policy for details.",
      },
      {
        q: "What's the difference between Starter and Pro?",
        a: "With Starter you download your app files and publish them yourself with our guides. With Pro we publish every new version to Google Play and the App Store for you.",
      },
    ],
  },
];
