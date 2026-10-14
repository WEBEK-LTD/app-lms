import type { IconName } from "@/components/icon-names";

/**
 * Content of the public marketing pages: home, solutions, features,
 * integrations, how it works and the FAQ. Page titles and introductions are
 * edited in the admin (lib/content/site.ts); the lists here are the pages'
 * fixed parts. Only claim what the apps and the dashboard really do.
 */

/** Screenshots of the app in public/screens (1080 × 2340 PNG, plain screens). */
export const APP_SCREENS = [
  "academy-home",
  "academy-course",
  "academy-lesson",
  "academy-home-ar",
  "academy-home-dark",
  "store-home",
  "store-product",
  "store-cart",
  "store-home-bold",
  "store-home-minimal",
  "bookings-services",
  "bookings-slots",
  "realestate-search",
  "realestate-listing",
  "realestate-search-ar",
] as const;
export type AppScreen = (typeof APP_SCREENS)[number];

/** Screenshots of the client dashboard in public/screens (scripts/capture-dashboard-screens.ts). */
export const DASHBOARD_SCREENS = ["dashboard-pages", "dashboard-setup", "dashboard-builds"] as const;
export type DashboardScreen = (typeof DASHBOARD_SCREENS)[number];

export const SCREEN_ALT: Record<AppScreen | DashboardScreen, string> = {
  "academy-home": "An academy app's home screen with courses",
  "academy-course": "A course page with its lessons",
  "academy-lesson": "A lesson with video and text",
  "academy-home-ar": "An academy app's home screen in Arabic, right to left",
  "academy-home-dark": "An academy app's home screen in dark mode",
  "store-home": "A store app's home screen with products",
  "store-product": "A product page with price and options",
  "store-cart": "A store app's cart",
  "store-home-bold": "A store app in the Bold template",
  "store-home-minimal": "A store app in the Minimal template",
  "bookings-services": "A bookings app's list of services",
  "bookings-slots": "Free times to book an appointment",
  "realestate-search": "Property search with filters",
  "realestate-listing": "A property listing with photos and details",
  "realestate-search-ar": "Property search in Arabic, right to left",
  "dashboard-pages": "The pages and look editor in the Yallapp dashboard",
  "dashboard-setup": "The app setup steps in the Yallapp dashboard",
  "dashboard-builds": "Builds and downloads in the Yallapp dashboard",
};

/** True numbers about the product, shown on the home and features pages. */
export const NUMBERS: { value: string; label: string }[] = [
  { value: "4", label: "app types: academy, store, bookings and real estate" },
  { value: "18", label: "platforms and plugins your content can come from" },
  { value: "3", label: "app templates: Classic, Bold and Minimal" },
  { value: "3", label: "languages: English, Arabic (right to left) and Turkish" },
  { value: "11", label: "page blocks to build your screens" },
  { value: "2", label: "stores: Google Play and the App Store, under your own name" },
];

// ---------------------------------------------------------------------------
// Solutions: one page per app type.

export type SolutionId = "academy" | "store" | "bookings" | "real-estate";

export interface Solution {
  id: SolutionId;
  /** The content key of the page's editable header (lib/content/site.ts). */
  contentKey: string;
  name: string;
  icon: IconName;
  /** One line for cards. */
  summary: string;
  /** Who it's for. */
  audience: string;
  screens: AppScreen[];
  /** Where the content can come from. */
  sources: string[];
  highlights: { icon: IconName; title: string; text: string }[];
  /** What the app user can do, as short lines. */
  inTheApp: string[];
  /** What the business does in the dashboard or on its website. */
  forYou: string[];
  docs: { href: string; label: string }[];
}

export const SOLUTIONS: Solution[] = [
  {
    id: "academy",
    contentKey: "solution-academy",
    name: "Academy",
    icon: "school",
    summary: "Courses, lessons, quizzes, progress and certificates.",
    audience: "Online academies, training centres, coaches and schools.",
    screens: ["academy-home", "academy-course", "academy-lesson"],
    sources: [
      "WordPress with Tutor LMS, LearnPress, LifterLMS, MasterStudy LMS, Sensei LMS, Masteriyo or LearnDash",
      "Teachable",
      "Thinkific",
      "Your own API",
      "No website: courses managed in the Yallapp dashboard",
    ],
    highlights: [
      {
        icon: "smart_display",
        title: "Protected video",
        text: "Uploaded videos play from links that expire, with a watermark of the student's number. Screenshots and screen recording are blocked on Android; on iOS the video hides while the screen is recorded.",
      },
      {
        icon: "code",
        title: "Lessons that look right",
        text: "Text, images, YouTube, Vimeo, embedded tools and code blocks are sized for the phone. Pages a phone can't show natively open exactly like your website, with the student signed in.",
      },
      {
        icon: "workspace_premium",
        title: "Quizzes, progress and certificates",
        text: "With a WordPress LMS, quizzes are graded by your LMS, progress syncs with your website, and certificates, reviews and questions to instructors appear when your LMS has them.",
      },
      {
        icon: "payments",
        title: "Selling courses the right way",
        text: "Free courses: one tap to enroll on Android and iOS. Paid courses are bought on Android; the iOS app shows no purchase buttons, as Apple's rules require.",
      },
    ],
    inTheApp: [
      "Browse and search courses by category",
      "Continue learning from where they stopped",
      "Watch lessons, open attachments and mark lessons complete",
      "Take quizzes and see results (WordPress LMS)",
      "Save courses to a wishlist, review courses and ask questions (WordPress LMS)",
      "Get notifications about new lessons and announcements",
    ],
    forYou: [
      "Keep managing courses where you do today, or add them in the dashboard",
      "Limit how many devices each student can use",
      "Add a student by phone number (courses managed in Yallapp)",
      "Send push notifications to your students",
    ],
    docs: [
      { href: "/docs/wordpress-plugin", label: "Install the WordPress plugin" },
      { href: "/docs/teachable", label: "Connect Teachable" },
      { href: "/docs/thinkific", label: "Connect Thinkific" },
      { href: "/docs/courses", label: "Courses without a website" },
    ],
  },
  {
    id: "store",
    contentKey: "solution-store",
    name: "Store",
    icon: "storefront",
    summary: "Products, cart, checkout and orders.",
    audience: "Shops, florists, boutiques and brands that sell physical or digital products.",
    screens: ["store-home", "store-product", "store-cart"],
    sources: [
      "WordPress with WooCommerce",
      "Shopify",
      "ikas",
      "Ticimax",
      "IdeaSoft",
      "Your own API",
      "No website: products managed in the Yallapp dashboard",
    ],
    highlights: [
      {
        icon: "shopping_cart",
        title: "A cart that stays honest",
        text: "The cart lives in the app and is priced against your shop each time, with current prices, stock and quantity limits.",
      },
      {
        icon: "payments",
        title: "Checkout you already trust",
        text: "Customers pay on your own checkout: WooCommerce, Shopify, ikas, Ticimax or IdeaSoft. Without a website, they pay by card on a secure iyzico page.",
      },
      {
        icon: "local_offer",
        title: "Built for gifts and flowers",
        text: "With WooCommerce, customers can pick a delivery date and add a gift message, with closed days and how far ahead set by you.",
      },
      {
        icon: "phone_iphone",
        title: "iOS-safe by design",
        text: "Physical goods sell on Android and iOS. Digital products sell only on Android, so your iPhone app follows Apple's rules.",
      },
    ],
    inTheApp: [
      "Browse categories, featured products, sale and new products",
      "Choose options and add to the cart",
      "Check out signed in, or as a guest when your shop allows it",
      "See their orders",
      "Get notifications about offers and new arrivals",
    ],
    forYou: [
      "Keep running your shop where you do today, or add products in the dashboard",
      "No website: set shipping fees, free shipping from an amount, stock and sale prices",
      "No website: see orders, mark them completed or refunded, get an email for each paid order",
      "No iyzico account? Sell through Yallapp's and get paid your share",
    ],
    docs: [
      { href: "/docs/shopify", label: "Connect Shopify" },
      { href: "/docs/ikas", label: "Connect ikas" },
      { href: "/docs/store-orders", label: "Products, orders and shipping" },
      { href: "/docs/card-payments", label: "Card payments with iyzico" },
    ],
  },
  {
    id: "bookings",
    contentKey: "solution-bookings",
    name: "Bookings",
    icon: "calendar_month",
    summary: "Services, staff, free times and appointments.",
    audience: "Salons, clinics, studios, consultants and anyone who takes appointments.",
    screens: ["bookings-services", "bookings-slots"],
    sources: [
      "WordPress with Amelia, BookingPress or LatePoint",
      "SimplyBook.me",
      "Your own API",
      "No website: services and team managed in the Yallapp dashboard",
    ],
    highlights: [
      {
        icon: "schedule",
        title: "Real free times",
        text: "Free times come from your booking system, in your business's time zone, with working hours, days off and existing appointments taken into account.",
      },
      {
        icon: "event",
        title: "Your rules apply",
        text: "Bookings go through your booking system, so its emails, approvals and calendar sync work as usual. Without a website, you set the rules in the dashboard.",
      },
      {
        icon: "person",
        title: "Pick a person or anyone",
        text: "Customers choose who they'd like to see, or the first person free.",
      },
      {
        icon: "notifications",
        title: "Fewer no-shows",
        text: "Customers see their appointments in the app and can cancel up to the time you allow.",
      },
    ],
    inTheApp: [
      "Browse services by category, with prices and durations",
      "Pick a day and a free time",
      "Book with an optional note",
      "See, and cancel when allowed, their appointments",
    ],
    forYou: [
      "Keep your booking plugin or SimplyBook.me, or set everything up in the dashboard",
      "No website: your team, the services each person provides, working hours and days off",
      "No website: approve, reject, cancel, mark done or no-show, and get an email for each booking",
      "Payment happens at your business; the app never takes payment for an appointment",
    ],
    docs: [
      { href: "/docs/wordpress-plugin", label: "Install the WordPress plugin" },
      { href: "/docs/simplybook", label: "Connect SimplyBook.me" },
      { href: "/docs/bookings", label: "Services, team and appointments" },
    ],
  },
  {
    id: "real-estate",
    contentKey: "solution-real-estate",
    name: "Real estate",
    icon: "apartment",
    summary: "Listings with search, filters, favorites and messages.",
    audience: "Real estate offices and agents who sell or rent properties.",
    screens: ["realestate-search", "realestate-listing", "realestate-search-ar"],
    sources: ["No website needed: listings managed in the Yallapp dashboard"],
    highlights: [
      {
        icon: "search",
        title: "Search that finds the right home",
        text: "Filters for buying or renting, property type, price, rooms, area and place, with sorting and pages of results.",
      },
      {
        icon: "image",
        title: "Listings that sell",
        text: "Ordered photos, a video link, features, a map position and similar listings on every property.",
      },
      {
        icon: "favorite",
        title: "Favorites",
        text: "People save the homes they like and come back to them.",
      },
      {
        icon: "chat",
        title: "Messages to your office",
        text: "People message your office about a listing. You answer on the Inquiries page and your reply reaches their phone as a notification.",
      },
    ],
    inTheApp: [
      "Search with filters and sort the results",
      "See photos, details, features and the map position",
      "Save favorites",
      "Message your office and read your answers",
    ],
    forYou: [
      "Add properties as drafts, publish, feature or archive them",
      "Set your contact details, currency and area unit",
      "Turn messages on or off",
      "Get an email for each new message",
    ],
    docs: [{ href: "/docs/real-estate", label: "Listings and inquiries" }],
  },
];

export function solution(id: string): Solution | undefined {
  return SOLUTIONS.find((s) => s.id === id);
}

// ---------------------------------------------------------------------------
// Integrations: every place an app's content can come from.

export interface Integration {
  name: string;
  /** App types it serves. */
  types: ("Academy" | "Store" | "Bookings" | "Real estate")[];
  text: string;
  docs?: string;
}

export interface IntegrationGroup {
  id: string;
  title: string;
  text: string;
  icon: IconName;
  items: Integration[];
}

export const INTEGRATION_GROUPS: IntegrationGroup[] = [
  {
    id: "wordpress",
    title: "WordPress, with the Yallapp plugin",
    text: "Install our plugin on your WordPress site. It finds the plugins below and serves your courses, products or services to your app, live. Your data stays on your website.",
    icon: "web",
    items: [
      { name: "Tutor LMS", types: ["Academy"], text: "Free and Pro: courses, lessons, quizzes, certificates, reviews and Q&A.", docs: "/docs/wordpress-plugin" },
      { name: "LearnPress", types: ["Academy"], text: "Courses, lessons, quizzes and progress.", docs: "/docs/wordpress-plugin" },
      { name: "LifterLMS", types: ["Academy"], text: "Courses, lessons, quizzes and progress.", docs: "/docs/wordpress-plugin" },
      { name: "MasterStudy LMS", types: ["Academy"], text: "Courses, lessons, quizzes and progress.", docs: "/docs/wordpress-plugin" },
      { name: "Sensei LMS", types: ["Academy"], text: "Courses, lessons, quizzes and progress.", docs: "/docs/wordpress-plugin" },
      { name: "Masteriyo", types: ["Academy"], text: "Courses, lessons, quizzes and progress.", docs: "/docs/wordpress-plugin" },
      { name: "LearnDash", types: ["Academy"], text: "Courses, lessons, quizzes and progress.", docs: "/docs/wordpress-plugin" },
      {
        name: "WooCommerce",
        types: ["Store", "Academy"],
        text: "Products, categories, reviews, cart pricing and checkout, with delivery dates and gift messages. Also the checkout for paid courses.",
        docs: "/docs/wordpress-plugin",
      },
      { name: "Amelia", types: ["Bookings"], text: "Services, staff, free times and appointments.", docs: "/docs/wordpress-plugin" },
      { name: "BookingPress", types: ["Bookings"], text: "Services, free times and appointments.", docs: "/docs/wordpress-plugin" },
      { name: "LatePoint", types: ["Bookings"], text: "Services, staff, free times and appointments.", docs: "/docs/wordpress-plugin" },
    ],
  },
  {
    id: "platforms",
    title: "Online platforms, connected with your keys",
    text: "Paste the keys from your platform's admin on the Website step. We check them with the platform before saving and keep them encrypted. Your customers sign in to the app with a code sent on WhatsApp.",
    icon: "link",
    items: [
      {
        name: "Shopify",
        types: ["Store"],
        text: "Products, collections, cart pricing and Shopify's own checkout. Order history with an optional Admin API token.",
        docs: "/docs/shopify",
      },
      { name: "ikas", types: ["Store"], text: "Products, prices and stock, with checkout on your ikas store.", docs: "/docs/ikas" },
      { name: "Ticimax", types: ["Store"], text: "Products, prices and stock; customers finish their order on your shop.", docs: "/docs/ticimax" },
      { name: "IdeaSoft", types: ["Store"], text: "Products, prices, stock and orders; customers pay on your store's checkout.", docs: "/docs/ideasoft" },
      { name: "Teachable", types: ["Academy"], text: "Your school's courses, lessons and student progress.", docs: "/docs/teachable" },
      { name: "Thinkific", types: ["Academy"], text: "Courses, lessons and progress, with free enrollment in the app.", docs: "/docs/thinkific" },
      {
        name: "SimplyBook.me",
        types: ["Bookings"],
        text: "Services, team and free times; customers book, see and cancel appointments in the app.",
        docs: "/docs/simplybook",
      },
    ],
  },
  {
    id: "own",
    title: "Your own API, or no website at all",
    text: "Have a developer? Serve our documented API from any website. No website? Add everything in the Yallapp dashboard.",
    icon: "code",
    items: [
      {
        name: "Your own API",
        types: ["Academy", "Store", "Bookings"],
        text: "Your website serves the Yallapp API. A live check on the Website step tells you what's missing.",
        docs: "/docs/my-own-api",
      },
      {
        name: "Products in Yallapp",
        types: ["Store"],
        text: "Products, categories, stock and shipping, with card payments through iyzico and orders in the dashboard.",
        docs: "/docs/store-orders",
      },
      { name: "Courses in Yallapp", types: ["Academy"], text: "Courses, sections and lessons with video and text; free and paid courses.", docs: "/docs/courses" },
      { name: "Services in Yallapp", types: ["Bookings"], text: "Services, team, working hours, days off and booking rules.", docs: "/docs/bookings" },
      { name: "Listings in Yallapp", types: ["Real estate"], text: "Properties with photos, features, a map position and messages.", docs: "/docs/real-estate" },
    ],
  },
  {
    id: "services",
    title: "Accounts you bring",
    text: "Your apps run on your own accounts, so your customers, payments and store listings stay yours.",
    icon: "key",
    items: [
      { name: "Google Play Console", types: ["Academy", "Store", "Bookings", "Real estate"], text: "Your Android app, published under your own developer account.", docs: "/docs/google-play" },
      { name: "App Store Connect", types: ["Academy", "Store", "Bookings", "Real estate"], text: "Your iOS app, published under your own Apple Developer account.", docs: "/docs/app-store" },
      { name: "Firebase", types: ["Academy", "Store", "Bookings", "Real estate"], text: "Push notifications through your own Firebase project. Free for this use.", docs: "/docs/push-notifications" },
      { name: "iyzico", types: ["Store", "Academy"], text: "Card payments in apps without a website, into your own iyzico merchant account.", docs: "/docs/card-payments" },
    ],
  },
];

/** The names in the "works with" strip on the home page. */
export const WORKS_WITH = [
  "WordPress",
  "WooCommerce",
  "Tutor LMS",
  "LearnDash",
  "Shopify",
  "ikas",
  "Ticimax",
  "IdeaSoft",
  "Teachable",
  "Thinkific",
  "SimplyBook.me",
  "Amelia",
];

// ---------------------------------------------------------------------------
// Features.

export interface Feature {
  icon: IconName;
  title: string;
  text: string;
  details: string[];
}

export interface FeatureGroup {
  id: string;
  title: string;
  text: string;
  /** Screens shown next to the group on the features page. */
  screens: (AppScreen | DashboardScreen)[];
  features: Feature[];
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: "brand",
    title: "Your brand, your look",
    text: "Your app carries your name, your logo and your colors, and is published under your own developer accounts.",
    screens: ["store-home", "store-home-bold", "store-home-minimal"],
    features: [
      {
        icon: "palette",
        title: "Three templates",
        text: "Classic, Bold and Minimal, each with its own layout and default font.",
        details: [
          "Your app icon, logo, primary color and splash screen color",
          "Six fonts to choose from",
          "Sharp, soft or round corners, and flat, outlined or elevated cards",
          "A secondary color for highlights and progress",
        ],
      },
      {
        icon: "visibility",
        title: "Light and dark",
        text: "Open in light, dark or the phone's own setting, and let people switch in the app's settings if you want.",
        details: ["Light, dark or follow the phone", "People can switch, if you allow it", "Every template supports both modes"],
      },
      {
        icon: "smartphone",
        title: "Published as your own app",
        text: "Your Android and iOS apps are published under your own Google Play and App Store accounts.",
        details: [
          "Your package name and bundle ID",
          "Your store title, descriptions and screenshots",
          "Your Android signing key, ready to download",
        ],
      },
    ],
  },
  {
    id: "pages",
    title: "Pages and look, without a new build",
    text: "Build your app's screens in the dashboard like a site builder. Publish, and the app follows the next time it opens.",
    screens: ["dashboard-pages"],
    features: [
      {
        icon: "view_carousel",
        title: "Drag-and-drop pages",
        text: "Stack blocks, drag them into order and see a live preview.",
        details: [
          "11 blocks: banner, text, image, video, button, list, categories, search box, continue learning, web page and space",
          "Lists filled with your own courses, products, services, posts or listings",
          "Show a block to everyone, or only to signed-in or signed-out people",
          "Your bottom tabs: labels, icons and what each one opens",
        ],
      },
      {
        icon: "edit",
        title: "Drafts and publishing",
        text: "Your changes are saved as a draft while you work. Publish when you're ready, or discard the draft.",
        details: ["A draft is saved as you edit", "One click to publish", "Go back to the published pages at any time"],
      },
    ],
  },
  {
    id: "languages",
    title: "Three languages, including right to left",
    text: "Every app speaks English. Turn on Arabic and Turkish, and translate your own texts for each.",
    screens: ["academy-home-ar", "realestate-search-ar", "academy-home-dark"],
    features: [
      {
        icon: "language",
        title: "English, Arabic and Turkish",
        text: "People pick their language in the app's settings. Arabic shows right to left.",
        details: [
          "The app's own buttons and messages in all three languages",
          "Your page texts translated per language, falling back to your default",
          "Choose the default language and which ones people can pick",
        ],
      },
    ],
  },
  {
    id: "sign-in",
    title: "Sign-in with a code, not a password",
    text: "People sign in with their phone number and a one-time code. Nothing to remember, nothing to reset.",
    screens: [],
    features: [
      {
        icon: "lock",
        title: "One-time codes",
        text: "We send the code on WhatsApp through waabek.com, with your app's name, also for WordPress sites. No SMS gateway or extra plugin to set up; a WordPress site can use Digits instead.",
        details: [
          "Sign-up from the app, with the details you ask for",
          "A limit on devices per person, set by you",
          "A review phone number and fixed code for Apple and Google reviewers",
          "People can delete their account from the app, as the stores require",
        ],
      },
      {
        icon: "notifications",
        title: "Push notifications",
        text: "Reach people's phones through your own Firebase project, and keep every message in the app's inbox.",
        details: [
          "Send to everyone from the dashboard (apps connected to a platform, or without a website)",
          "Automatic messages from WordPress for new lessons, announcements and answers",
          "A notifications inbox in the app",
          "People choose which notifications they get",
        ],
      },
    ],
  },
  {
    id: "commerce",
    title: "Selling that follows the store rules",
    text: "Sell on your own checkout, or by card without a website. Purchase buttons follow Apple's and Google's rules automatically.",
    screens: ["store-cart", "store-product"],
    features: [
      {
        icon: "payments",
        title: "Card payments with iyzico",
        text: "Shops and academies without a website take card payments on a secure iyzico page, into their own merchant account.",
        details: [
          "Your own iyzico keys, with test keys for trying it out",
          "No iyzico account? Sell through Yallapp's and get paid your share",
          "Orders in the dashboard, with an email for each paid order",
          "A shareable web page for every product",
        ],
      },
      {
        icon: "phone_iphone",
        title: "iOS rules built in",
        text: "The iPhone app never shows purchase buttons for paid courses or digital products, so App Store review goes smoothly.",
        details: [
          "Paid courses are bought on Android",
          "Physical products sell on Android and iOS",
          "Free courses: enroll in one tap on both",
        ],
      },
    ],
  },
  {
    id: "builds",
    title: "Builds, signing and publishing",
    text: "We build, sign and package your apps. Download them and follow our guides, or let us publish them for you.",
    screens: ["dashboard-builds"],
    features: [
      {
        icon: "download",
        title: "Every file you need",
        text: "Android APK and App Bundle, the iOS build, your signing key and your store assets.",
        details: [
          "APK to install on a phone and test",
          "App Bundle (AAB) for Google Play",
          "iOS build (Growth and up), uploaded to TestFlight on Pro and Business",
          "Store icon, feature graphic, your screenshots and listing text",
        ],
      },
      {
        icon: "shield",
        title: "Keys kept safe",
        text: "Your store keys and signing keys are stored encrypted, and a saved Android signing key is never replaced, so you can always update your app.",
        details: ["Download links that expire after a few minutes", "Store keys never shown again after saving", "The same signing key for every update"],
      },
    ],
  },
];

/** "A typical app builder" next to Yallapp. No names: only what is often true elsewhere and always true here. */
export const COMPARISON: { topic: string; typical: string; yallapp: string }[] = [
  {
    topic: "Your content",
    typical: "Often copied into the builder by hand, then kept up to date in two places",
    yallapp: "Read live from your website or platform, or managed once in the dashboard",
  },
  {
    topic: "The screens",
    typical: "Often your website wrapped in a web view",
    yallapp: "Native screens for courses, products, bookings and listings; complex lessons shown like your website",
  },
  {
    topic: "Whose app it is",
    typical: "Sometimes published under the builder's account",
    yallapp: "Published under your own Google Play and App Store accounts, with your signing key to download",
  },
  {
    topic: "Changing the app",
    typical: "Layout changes often need a new store release",
    yallapp: "Pages, look and languages change from the dashboard without a new build",
  },
  {
    topic: "Languages",
    typical: "One language, left to right",
    yallapp: "English, Arabic (right to left) and Turkish, with your texts translated per language",
  },
  {
    topic: "Sign-in",
    typical: "Email and password",
    yallapp: "Phone number and a one-time code, with device limits and a review number for the stores",
  },
  {
    topic: "Store rules",
    typical: "Left to you to get right",
    yallapp: "No purchase buttons for digital content on iOS, account deletion in the app, review access built in",
  },
  {
    topic: "Payments",
    typical: "Often only through the builder's own payment provider",
    yallapp: "Your own checkout, or card payments into your own iyzico account",
  },
];

// ---------------------------------------------------------------------------
// How it works.

export interface Step {
  title: string;
  text: string;
  details: string[];
}

export const STEPS: Step[] = [
  {
    title: "Create your account",
    text: "Sign up in a minute. Pay your plan by card or arrange it with our team on WhatsApp, and we activate your account.",
    details: ["Sign up on yallapp.com.tr, with or without a website", "Choose Starter, Growth, Pro or Business for each app", "Pay by card, or talk to us on WhatsApp"],
  },
  {
    title: "Connect your content",
    text: "Choose your app type and where its content comes from: your website, an online platform, your own API, or nothing at all.",
    details: [
      "Academy, Store, Bookings or Real estate",
      "WordPress plugin, Shopify, ikas, Ticimax, IdeaSoft, Teachable, Thinkific or SimplyBook.me",
      "No website? Add products, courses, services or listings in the dashboard",
    ],
  },
  {
    title: "Brand it and build your pages",
    text: "Upload your icon and logo, pick your colors and template, then build your pages and turn on languages.",
    details: ["App name, icon, logo and colors", "Pages, tabs and look in the editor", "English, Arabic and Turkish"],
  },
  {
    title: "Add your store details",
    text: "Package name, bundle ID, store texts and screenshots. Add Firebase for push notifications whenever you're ready.",
    details: ["Store title and descriptions", "Phone and iPhone screenshots", "Firebase files for push notifications"],
  },
  {
    title: "Build and publish",
    text: "Your apps build as soon as the setup is complete. Download them and publish with our guides, or let us publish them for you.",
    details: ["Starter and Growth: download your files and follow the step-by-step guides", "Pro and Business: we publish every new version on Google Play and the App Store"],
  },
];

export const REQUIREMENTS = [
  "Your content: a website on a supported platform, your own API, or nothing at all",
  "A Google Play developer account (one-time fee to Google)",
  "An Apple Developer Program membership for iOS (yearly fee to Apple)",
  "A free Firebase project, for push notifications",
  "An iyzico merchant account, to take card payments without a website (optional)",
];

// ---------------------------------------------------------------------------
// FAQ (the default; the team edits it in the admin).

export interface FaqGroup {
  title: string;
  items: { q: string; a: string }[];
}

export const FAQ: FaqGroup[] = [
  {
    title: "Getting started",
    items: [
      {
        q: "What does Yallapp do?",
        a: "Yallapp builds branded Android and iOS apps for academies, stores, bookings businesses and real estate offices. Your app gets its content from your website, an online platform you already use, your own API, or from the Yallapp dashboard if you have no website. We build the apps, and you publish them under your own name, or we publish them for you.",
      },
      {
        q: "Do I need a website?",
        a: "No. You can add your products, courses, services or property listings in the Yallapp dashboard, and your app shows them. If you have a website on a supported platform, your app reads it live instead.",
      },
      {
        q: "Which kinds of apps can I build?",
        a: "Four: Academy (courses, lessons, quizzes), Store (products, cart, checkout, orders), Bookings (services, staff, free times, appointments) and Real estate (listings with search, favorites and messages to your office).",
      },
      {
        q: "How long until my apps are ready?",
        a: "Your apps start building as soon as you finish the setup steps in your dashboard. Google's and Apple's reviews usually take a few days after you submit.",
      },
      {
        q: "Do I need to know how to code?",
        a: "No. Everything is done in the dashboard, with step-by-step guides for the stores. Only the “My own API” option needs a developer.",
      },
      {
        q: "Can I try my app before it's built?",
        a: "Yes. Preview your app in the dashboard runs your real app in your browser, with your current setup, content, pages and languages, in light and dark. Scan its QR code to open it on your phone. It works before the setup is complete and never sends sign-in codes or takes payments.",
      },
    ],
  },
  {
    title: "Content sources",
    items: [
      {
        q: "Where can my app's content come from?",
        a: "A WordPress site with the Yallapp plugin (Tutor LMS, LearnPress, LifterLMS, MasterStudy LMS, Sensei LMS, Masteriyo, LearnDash, WooCommerce, Amelia, BookingPress or LatePoint), Shopify, ikas, Ticimax, IdeaSoft, Teachable, Thinkific, SimplyBook.me, your own API, or the Yallapp dashboard. See [Integrations](/integrations).",
      },
      {
        q: "Do I have to move my content anywhere?",
        a: "No. With a website or platform, your content stays where it is and the app reads it live. You add it to Yallapp only when you have no website.",
      },
      {
        q: "I use WordPress. What do I install?",
        a: "The Yallapp plugin, from your dashboard's **License & plugin** page. It finds your LMS, WooCommerce or booking plugin and connects them to your app. We send the sign-in codes on WhatsApp, with your app's name. See [Install the WordPress plugin](/docs/wordpress-plugin).",
      },
      {
        q: "Can people sign in with their email address?",
        a: "Yes. On your dashboard's **App sign-in** page, choose phone, email or both. Without a website, we send a code by email in your app's name; on WordPress, people use the email and password of their account on your website. Apps connected to another platform sign in by phone. See [App users and sign-in](/docs/app-users).",
      },
      {
        q: "Can the codes come from my own WhatsApp number?",
        a: "Yes, with a WABEK account (waabek.com): add its API key and your number's instance ID on **App sign-in** and send a test code. Otherwise the codes come from our WhatsApp number, with your app's name.",
      },
      {
        q: "Do I need Digits?",
        a: "No. Digits is optional. We send your app's sign-in codes on WhatsApp, so you need no SMS gateway and no extra plugin. If your website already uses Digits, people sign in to the app with the same number and keep their accounts. You can also choose Digits to send the codes when its REST API add-on is installed. See [Install the WordPress plugin](/docs/wordpress-plugin#sign-in-codes).",
      },
      {
        q: "I use Shopify or another store platform. How do I connect it?",
        a: "On the Website step, choose your platform and paste the keys from its admin. We check them with the platform before saving and keep them encrypted. Each platform has a step-by-step guide in the [documentation](/docs/content-sources).",
      },
      {
        q: "My website isn't on any of these platforms.",
        a: "A developer can serve our documented API from your website: see [Connect your own API](/docs/my-own-api). Or choose “I don't have a website” and manage your content in the dashboard.",
      },
      {
        q: "Can I change where the content comes from later?",
        a: "Yes. Open the Website step again and choose another source. Your next build uses it.",
      },
    ],
  },
  {
    title: "Publishing on Google Play and the App Store",
    items: [
      {
        q: "Do I need my own Apple and Google developer accounts?",
        a: "Yes. Your apps are published under your own name. Google charges a one-time fee and Apple a yearly fee, paid directly to them. Companies need a D-U-N-S number for both. See [Developer accounts](/docs/developer-accounts).",
      },
      {
        q: "Who publishes the apps?",
        a: "On Starter and Growth you download the files and publish them with our step-by-step guides. On Pro and Business we publish your app and every new version on Google Play and the App Store for you.",
      },
      {
        q: "Will Apple accept my app?",
        a: "Apps that show real content and follow the rules usually pass. Yallapp handles the common problems for you: no purchase buttons for digital content on iOS, account deletion in the app, and a review phone number with a fixed code so reviewers can sign in. See [If the store rejects your app](/docs/store-rejections).",
      },
      {
        q: "Do I need a new version for every change?",
        a: "No. Content, pages, look, languages and sign-in settings change without a new build. You only build again for a new name, icon or logo, or for new app features.",
      },
      {
        q: "Can I sell paid courses in the iPhone app?",
        a: "No. Apple's rules don't allow it without Apple's own in-app purchases, so the iOS app shows no purchase buttons for paid courses or digital products. Students buy on Android or on your website and learn on both. Physical products sell on both.",
      },
    ],
  },
  {
    title: "Push notifications and Firebase",
    items: [
      {
        q: "Are push notifications included?",
        a: "Yes, on every plan. They're sent through your own Firebase project, which is free for this use.",
      },
      {
        q: "What do I need from Firebase?",
        a: "A Firebase project with an Android app and an iOS app, their two files (google-services.json and GoogleService-Info.plist), a service account key to send messages, and an APNs key from Apple for iPhones. [Push notifications with Firebase](/docs/push-notifications) shows each step.",
      },
      {
        q: "How do I send a notification?",
        a: "Apps connected to a platform, or without a website: from the dashboard's **App notifications** page. WordPress sites: automatically for new lessons, announcements and answers, or by hand from the Yallapp plugin's settings.",
      },
      {
        q: "Why don't notifications reach iPhones?",
        a: "Usually the APNs key is missing from your Firebase project's Cloud Messaging settings. Upload it there and try again.",
      },
    ],
  },
  {
    title: "Payments in your app",
    items: [
      {
        q: "How do customers pay?",
        a: "On your own checkout when your shop runs on WooCommerce, Shopify, ikas, Ticimax or IdeaSoft. Without a website, they pay by card on a secure iyzico page, into your own iyzico merchant account.",
      },
      {
        q: "I don't have an iyzico account. Can I still sell?",
        a: "Yes. You can sell through Yallapp's iyzico account instead: give the details iyzico asks for on your Products page, and iyzico pays your share for each completed order after a commission.",
      },
      {
        q: "Does Yallapp take a cut of my sales?",
        a: "Not when you use your own checkout or your own iyzico account. Only sales through Yallapp's iyzico account carry a commission.",
      },
      {
        q: "Can customers pay for appointments in the app?",
        a: "No. Bookings apps book the time; payment, when there is one, happens at your business.",
      },
    ],
  },
  {
    title: "Languages",
    items: [
      {
        q: "Which languages do the apps support?",
        a: "English, Arabic and Turkish. English is always on; you turn on the others and choose the default.",
      },
      {
        q: "Does Arabic show right to left?",
        a: "Yes. The whole app switches to right to left when someone picks Arabic.",
      },
      {
        q: "Can I translate my own texts?",
        a: "Yes. In the pages editor you can write your page texts in each language. Texts without a translation show in your default language.",
      },
    ],
  },
  {
    title: "Plans and billing",
    items: [
      {
        q: "What's the difference between the plans?",
        a: "Starter is the Android app with ready-made pages for up to 1,000 app users. Growth adds the iOS app, the full page editor, three languages, card payments, offline mode and up to 10,000 app users. Pro adds unlimited app users and we publish for you. Business adds a dedicated account manager. See the [pricing page](/pricing) for the full comparison.",
      },
      {
        q: "How do I pay?",
        a: "By card in your dashboard when a card price is shown, or arranged directly with our team on WhatsApp. We activate your account as soon as the payment is confirmed.",
      },
      {
        q: "Do you have coupons?",
        a: "Sometimes. Enter the code on the card payment form and the price updates before you pay.",
      },
      {
        q: "What happens when my plan ends?",
        a: "Renew from your dashboard. A payment adds its period to the end of your current plan, so no days are lost. If the plan isn't renewed, the license becomes inactive and new builds stop.",
      },
      {
        q: "Can I cancel?",
        a: "You can cancel within 3 days of your account being activated for a full refund. Depending on your bank, refunds take 5 to 14 business days. See our [Refund policy](/refund).",
      },
    ],
  },
  {
    title: "Several apps in one account",
    items: [
      {
        q: "Can I have more than one app?",
        a: "Yes. One account can hold several apps, for example an academy and a store. You manage them all from the same dashboard.",
      },
      {
        q: "How are several apps billed?",
        a: "Each app has its own plan and its own price, and is renewed on its own. See [Several apps in one account](/docs/several-apps).",
      },
      {
        q: "Do my apps share anything?",
        a: "Your sign-in and your contact details. Each app has its own type, content source, branding, store listing, builds and settings.",
      },
    ],
  },
  {
    title: "Security and data",
    items: [
      {
        q: "Where is my data stored?",
        a: "With a website, your customers' data stays on your website or platform; the app talks to it directly. For apps without a website, Yallapp keeps it on servers hosted by webek.org.",
      },
      {
        q: "How are my keys protected?",
        a: "Store keys, platform keys, payment keys and signing keys are encrypted before they're saved and never shown again. Download links expire after a few minutes.",
      },
      {
        q: "How are sign-in codes sent?",
        a: "On WhatsApp through waabek.com, with your app's name: for WordPress sites, apps connected to a platform and apps without a website. A WordPress site can choose Digits and its own gateway instead. With your own API, your own system sends them. Codes are short-lived and limited in attempts.",
      },
      {
        q: "Can people delete their account?",
        a: "Yes, from the app's account screen, as Apple and Google require.",
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        q: "How do I get help?",
        a: "Message us on WhatsApp or email us. Our [documentation](/docs) answers most questions step by step.",
      },
      {
        q: "Can you set up WordPress for me?",
        a: "Yes. On the Website step, choose “I don't have WordPress” and tell us about your content. Our team messages you with the price and the next steps.",
      },
      {
        q: "The store rejected my app. What now?",
        a: "Send us the rejection message on WhatsApp and we'll help you reply. Most rejections have a quick fix: see [If the store rejects your app](/docs/store-rejections).",
      },
    ],
  },
];
