import type { IconName } from "@/components/icon-names";
import { KINDS, kindById } from "./app/kinds";
import { ALL_STORES_TEXT, MORE_ANDROID_STORES_TEXT } from "./stores";

/** "a, b and c" (or "a, b or c"). */
function listText(items: string[], last = "and"): string {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} ${last} ${items[items.length - 1]}` : (items[0] ?? "");
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen"];

/** 32 "ten" for 10, so counts in sentences follow the registries; digits from 16 up. */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

/** 32 "20+" for 23: a count that stays true as more are added. */
export function countAtLeast(n: number): string {
  return n >= 10 ? `${Math.floor(n / 10) * 10}+` : String(n);
}

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
  "restaurant-menu",
  "restaurant-dish",
  "restaurant-order",
  "bookings-services",
  "bookings-slots",
  "clinic-doctor",
  "clinic-intake",
  "fitness-timetable",
  "fitness-membership",
  "realestate-search",
  "realestate-listing",
  "realestate-search-ar",
  "news-home",
  "news-article",
  "events-list",
  "events-ticket",
  "charity-home",
  "charity-campaign",
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
  "restaurant-menu": "A café's menu with its categories as tabs",
  "restaurant-dish": "A dish with its options: a size, a side and extras",
  "restaurant-order": "An order's steps, from received to ready",
  "bookings-services": "A bookings app's list of services",
  "bookings-slots": "Free times to book an appointment",
  "clinic-doctor": "A doctor's profile with specialties, languages and an introduction",
  "clinic-intake": "The intake form a patient fills in when booking a visit",
  "fitness-timetable": "A gym's class timetable with the spots left in each class",
  "fitness-membership": "A member's membership with the classes left, and the plans on sale",
  "realestate-search": "Property search with filters",
  "realestate-listing": "A property listing with photos and details",
  "realestate-search-ar": "Property search in Arabic, right to left",
  "news-home": "A news app's home screen with top stories and sections",
  "news-article": "An article with its picture, author and date",
  "events-list": "An events app's list of upcoming events with dates and prices",
  "events-ticket": "A ticket with its QR code, ready to show at the door",
  "charity-home": "A charity app's campaigns with how close each is to its goal",
  "charity-campaign": "A campaign with its story, progress and amounts to give",
  "dashboard-pages": "The pages and look editor in the Yallapp dashboard",
  "dashboard-setup": "The app setup steps in the Yallapp dashboard",
  "dashboard-builds": "Builds and downloads in the Yallapp dashboard",
};

// ---------------------------------------------------------------------------
// Solutions: one page per app type.

/** What a solution page says; its address, name and icon come from its kind (lib/app/kinds.ts). */
interface SolutionCopy {
  /** The kind (KINDS) the page is about. */
  kind: string;
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

export interface Solution extends SolutionCopy {
  /** /solutions/<id>: the kind's marketing slug. */
  id: string;
  /** The content key of the page's editable header (lib/content/site.ts). */
  contentKey: string;
  name: string;
  icon: IconName;
}

const SOLUTION_COPY: SolutionCopy[] = [
  {
    kind: "academy",
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
    kind: "store",
    summary: "Products, cart, checkout and orders.",
    audience: "Shops, florists, boutiques and brands that sell physical or digital products.",
    screens: ["store-home", "store-product", "store-cart"],
    sources: [
      "WordPress with WooCommerce",
      "Shopify",
      "ikas",
      "Ticimax",
      "IdeaSoft",
      "Wix",
      "Salla",
      "Zid",
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
        text: "Customers pay on your own checkout: WooCommerce, Shopify, ikas, Ticimax, IdeaSoft, Wix, Salla or Zid. Without a website, they pay by card on a secure iyzico, Kashier or Fawaterk page.",
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
      "No payment account? Sell through Yallapp's and get paid your share",
    ],
    docs: [
      { href: "/docs/shopify", label: "Connect Shopify" },
      { href: "/docs/ikas", label: "Connect ikas" },
      { href: "/docs/wix", label: "Connect your Wix store" },
      { href: "/docs/salla", label: "Connect your Salla store" },
      { href: "/docs/zid", label: "Connect your Zid store" },
      { href: "/docs/store-orders", label: "Products, orders and shipping" },
      { href: "/docs/card-payments", label: "Card payments with iyzico, Kashier or Fawaterk" },
    ],
  },
  {
    kind: "restaurant",
    summary: "A menu with options, pickup or delivery, and order tracking.",
    audience: "Restaurants, cafés, bakeries and kitchens that take orders for pickup or delivery.",
    screens: ["restaurant-menu", "restaurant-dish", "restaurant-order"],
    sources: [
      "No website: the menu, opening hours, pickup and delivery managed in the Yallapp dashboard",
      "WordPress with WooCommerce (variations as options; pickup, delivery and the kitchen are in the dashboard only for now)",
    ],
    highlights: [
      {
        icon: "restaurant_menu",
        title: "A menu that reads like one",
        text: "Your categories as tabs at the top and every dish below them, with its photo, price and description.",
      },
      {
        icon: "tune",
        title: "Dishes the way people like them",
        text: "Sizes, sides, sauces and extras, each with its own price. You choose which ones must be picked and how many. Prices are always worked out by our server, never by the phone.",
      },
      {
        icon: "delivery_dining",
        title: "Pickup or delivery, now or later",
        text: "Your opening hours, preparation time, delivery fee, minimum order and the districts you deliver to. When you're closed, the app says when you open and takes orders for later.",
      },
      {
        icon: "skillet",
        title: "A kitchen screen",
        text: "New orders on your Kitchen page with what was chosen. Mark them preparing, ready, out for delivery and completed: each step reaches the customer's phone.",
      },
    ],
    inTheApp: [
      "Browse the menu by category",
      "Choose a dish's options and see the price change",
      "Order for pickup or delivery, as soon as possible or for a time later",
      "Pay by card on a secure iyzico, Kashier or Fawaterk page, on Android and iPhone",
      "Follow the order's steps and get a notification at each one",
    ],
    forYou: [
      "Your dishes, their options and prices, photos and categories",
      "Opening hours, preparation time, pickup address, delivery fee, minimum order and delivery areas",
      "The Kitchen page: new orders with their options, and a button for each next step",
      "An email for each paid order",
      "No payment account? Sell through Yallapp's and get paid your share",
    ],
    docs: [
      { href: "/docs/restaurants", label: "Restaurants and cafés: menu, pickup, delivery and the kitchen" },
      { href: "/docs/card-payments", label: "Card payments with iyzico, Kashier or Fawaterk" },
    ],
  },
  {
    kind: "bookings",
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
    kind: "clinic",
    summary: "Doctors, visits, an intake form and doctor profiles.",
    audience: "Family practices, dentists, physiotherapists, therapists and other clinics that see patients by appointment.",
    screens: ["clinic-doctor", "clinic-intake"],
    sources: [
      "No website: doctors, services and the intake form managed in the Yallapp dashboard",
      "WordPress with Amelia, BookingPress or LatePoint (without the intake form for now)",
      "SimplyBook.me (without the intake form for now)",
      "Your own API",
    ],
    highlights: [
      {
        icon: "assignment",
        title: "An intake form before the visit",
        text: "Ask what you need to know before a visit: short or long answers, a date, or a choice from a list. Patients answer when they book, and you choose which questions must be answered.",
      },
      {
        icon: "lock",
        title: "Answers only your clinic sees",
        text: "Intake answers are visible only to the patient, in their visits, and to your clinic, on your dashboard. They're never put in emails or notifications.",
      },
      {
        icon: "stethoscope",
        title: "Doctor profiles",
        text: "Each doctor's role, specialties, the languages they speak and a few lines about them, so patients can choose who they'd like to see.",
      },
      {
        icon: "schedule",
        title: "Real free times",
        text: "Each doctor's working hours, days off and visits decide the free times, in your clinic's time zone. Two visits never overlap.",
      },
    ],
    inTheApp: [
      "Browse services and doctors, with prices and durations",
      "Read a doctor's profile: specialties, languages and an introduction",
      "Pick a day and a free time with a chosen doctor, or the first one free",
      "Answer the intake questions when booking",
      "See their visits with their answers, and cancel when allowed",
    ],
    forYou: [
      "Your doctors, the services each one provides, working hours and days off",
      "Your intake questions, in the order you choose",
      "Each visit with the patient's answers on the Visits page: approve, cancel, mark done or no-show",
      "An email for each new visit, without the answers in it",
      "Payment happens at your clinic; the app never takes payment for a visit",
    ],
    docs: [
      { href: "/docs/clinics", label: "Clinics: doctors, visits and the intake form" },
      { href: "/docs/bookings", label: "Services, team and appointments" },
    ],
  },
  {
    kind: "fitness",
    summary: "Class timetables, booking a spot, and memberships.",
    audience: "Gyms, yoga and pilates studios, spin and boxing clubs, and coaches who run group classes.",
    screens: ["fitness-timetable", "fitness-membership"],
    sources: [
      "No website: classes, coaches, the weekly timetable and membership plans managed in the Yallapp dashboard",
      "WordPress with Amelia, BookingPress or LatePoint, for personal sessions (classes and memberships are for gyms without a website for now)",
    ],
    highlights: [
      {
        icon: "schedule",
        title: "A weekly timetable",
        text: "Set each class once: the day, the time, the coach and how many spots. The app shows the next eight weeks, and you see who's coming to each class.",
      },
      {
        icon: "groups",
        title: "Never overbooked",
        text: "A spot is booked only while one is left, even when many members book at the same moment. Members give their spot back up to the time you choose.",
      },
      {
        icon: "card_membership",
        title: "Memberships and class packs",
        text: "Monthly, three-month or yearly plans with unlimited classes or a number of them, and class packs. Members pay by card on your payment page, on Android and iPhone.",
      },
      {
        icon: "notifications",
        title: "Members told at once",
        text: "Call a class off and everyone who booked it gets a notification in the app, with their spot and class credit back.",
      },
    ],
    inTheApp: [
      "See the week's classes day by day, with the coach and the spots left",
      "Book a spot in a tap, and cancel it when allowed",
      "Buy a membership or a class pack, and see the classes left",
      "Book a personal session with a coach at a free time",
    ],
    forYou: [
      "Your classes and coaches, and personal sessions with each coach's hours",
      "Your weekly timetable, with who's coming to each class",
      "Your membership plans, and whether classes need one",
      "Who has which membership, adding classes or a membership paid at your desk",
      "Card payments through iyzico, Kashier or Fawaterk, with your own account or through Yallapp",
    ],
    docs: [
      { href: "/docs/fitness", label: "Gyms and studios: timetable, classes and memberships" },
      { href: "/docs/bookings", label: "Services, team and appointments" },
      { href: "/docs/card-payments", label: "Card payments with iyzico, Kashier or Fawaterk" },
    ],
  },
  {
    kind: "real_estate",
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
  {
    kind: "news",
    summary: "Articles, sections, search and breaking-news alerts.",
    audience: "News sites, local papers, magazines and blogs.",
    screens: ["news-home", "news-article"],
    sources: [
      "WordPress posts, with the Yallapp plugin",
      "Any website's RSS or Atom feed",
      "Your own API",
      "No website: articles written in the Yallapp dashboard",
    ],
    highlights: [
      {
        icon: "newspaper",
        title: "A front page in your pocket",
        text: "Top stories, the latest articles and a row per section, with search across everything you've published.",
      },
      {
        icon: "notifications",
        title: "Breaking news",
        text: "Push the stories that matter to your readers' phones: automatically for new WordPress posts, or with one tick when you publish in the dashboard.",
      },
      {
        icon: "smart_display",
        title: "Articles that look right",
        text: "Pictures, YouTube and Vimeo videos and embeds are sized for the phone, the same way lessons are in academy apps.",
      },
      {
        icon: "bookmark",
        title: "Saved for later",
        text: "Readers save articles on their phone and share any of them in a tap.",
      },
    ],
    inTheApp: [
      "Read the top stories and the latest articles",
      "Browse sections and search every article",
      "Save articles to read later and share them",
      "Get breaking news as notifications",
    ],
    forYou: [
      "Keep publishing on WordPress or any site with a feed, or write in the dashboard",
      "No website: drafts, pictures, sections, publish and unpublish",
      "Choose whether articles show their author and date",
      "Reading is free: no paywalls or in-app purchases to set up",
    ],
    docs: [{ href: "/docs/news", label: "News and blog apps" }],
  },
  {
    kind: "events",
    summary: "Event listings, free sign-ups and paid tickets with QR codes.",
    audience: "Culture centres, venues, theatres, clubs, festivals and organisers of workshops and talks.",
    screens: ["events-list", "events-ticket"],
    sources: ["No website: events and tickets managed in the Yallapp dashboard"],
    highlights: [
      {
        icon: "calendar_month",
        title: "Your programme in a list and a calendar",
        text: "Upcoming events with their pictures, dates, venue and prices, filters by category and a calendar to pick a day.",
      },
      {
        icon: "confirmation_number",
        title: "Free sign-ups and paid tickets",
        text: "Free tickets in a tap. Paid tickets are paid by card on a secure page and issued once the payment is confirmed. Places never sell twice.",
      },
      {
        icon: "qr_code_scanner",
        title: "Check-in at the door",
        text: "Every ticket has a QR code that works without a connection. Scan it with a phone's camera on the Check-in page, or type its code: each ticket gets in once.",
      },
      {
        icon: "notifications",
        title: "Ticket holders hear about changes",
        text: "Move an event or cancel it, and everyone holding a ticket gets a notification.",
      },
    ],
    inTheApp: [
      "Browse upcoming events, by category or on a calendar",
      "Get free tickets or buy paid ones",
      "Keep every ticket and its QR code in My tickets, also offline",
      "Add an event to their calendar and find the venue on a map",
    ],
    forYou: [
      "Events with pictures, a venue or an online link, and ticket types with their own prices and limits",
      "Sales and attendees per event, with a CSV export",
      "Check tickets at the door with a phone, no app to install",
      "Card payments into your own iyzico, Kashier or Fawaterk account, or through Yallapp's",
    ],
    docs: [{ href: "/docs/events", label: "Events and tickets" }],
  },
  {
    kind: "charity",
    summary: "Campaigns with progress, donations and receipts.",
    audience: "Charities, food banks, foundations, mosques and community groups.",
    screens: ["charity-home", "charity-campaign"],
    sources: ["No website: campaigns written in the Yallapp dashboard", "Donations paid into your own iyzico, Kashier or Fawaterk account"],
    highlights: [
      {
        icon: "campaign",
        title: "Campaigns people follow",
        text: "Each campaign has its story, pictures, a goal and a progress bar that moves as donations are confirmed.",
      },
      {
        icon: "payments",
        title: "Every gift goes to you",
        text: "Donations are paid on a secure page into your own iyzico, Kashier or Fawaterk account. Yallapp takes no commission on donations.",
      },
      {
        icon: "receipt_long",
        title: "Receipts without paperwork",
        text: "Each donor gets a receipt by email and finds every donation under My donations in the app.",
      },
      {
        icon: "notifications",
        title: "Tell donors what happened",
        text: "Send an update to the people who gave to a campaign: it lands in their app and, if they allow it, on their phone.",
      },
    ],
    inTheApp: [
      "Browse campaigns and see how close each is to its goal",
      "Choose an amount, give anonymously and leave a message",
      "Donate on your secure donation page (on iPhone, in the browser)",
      "See past donations and their receipts",
    ],
    forYou: [
      "Write campaigns with a goal, suggested amounts and an end date",
      "Publish, close and feature campaigns",
      "See every donation and export them as a spreadsheet",
      "A donor list with what each person gave",
    ],
    docs: [{ href: "/docs/donations", label: "Charity and donation apps" }],
  },
];

/** 20 One page per kind that has copy, named and addressed by the registry. */
export const SOLUTIONS: Solution[] = SOLUTION_COPY.map((copy) => {
  const kind = kindById(copy.kind);
  if (!kind) throw new Error(`Unknown kind ${copy.kind}`);
  return { ...copy, id: kind.marketing.slug, contentKey: `solution-${kind.marketing.slug}`, name: kind.name, icon: kind.marketing.icon };
});

export function solution(id: string): Solution | undefined {
  return SOLUTIONS.find((s) => s.id === id);
}

// ---------------------------------------------------------------------------
// Integrations: every place an app's content can come from.

export interface Integration {
  name: string;
  /** App types it serves. */
  types: string[];
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
      { name: "WordPress posts", types: ["News & blog"], text: "Published posts with their pictures, categories and authors, and a notification for each new post.", docs: "/docs/news" },
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
      {
        name: "Wix",
        types: ["Store"],
        text: "Wix Stores products, categories, cart pricing and Wix's own checkout. Order history with an optional API key.",
        docs: "/docs/wix",
      },
      {
        name: "Salla",
        types: ["Store"],
        text: "Products, categories, prices and orders, connected in a few clicks; customers finish their order on your Salla store.",
        docs: "/docs/salla",
      },
      {
        name: "Zid",
        types: ["Store"],
        text: "Products, categories, prices and orders, connected in a few clicks; customers finish their order on your Zid store.",
        docs: "/docs/zid",
      },
      { name: "Teachable", types: ["Academy"], text: "Your school's courses, lessons and student progress.", docs: "/docs/teachable" },
      { name: "Thinkific", types: ["Academy"], text: "Courses, lessons and progress, with free enrollment in the app.", docs: "/docs/thinkific" },
      {
        name: "SimplyBook.me",
        types: ["Bookings"],
        text: "Services, team and free times; customers book, see and cancel appointments in the app.",
        docs: "/docs/simplybook",
      },
      { name: "RSS and Atom feeds", types: ["News & blog"], text: "The articles of any website's feed: Ghost, Blogger, Substack, Medium and most news systems.", docs: "/docs/news" },
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
        types: ["Academy", "Store", "Bookings", "News & blog"],
        text: "Your website serves the Yallapp API. A live check on the Website step tells you what's missing.",
        docs: "/docs/my-own-api",
      },
      {
        name: "Products in Yallapp",
        types: ["Store"],
        text: "Products, categories, stock and shipping, with card payments through iyzico, Kashier or Fawaterk and orders in the dashboard.",
        docs: "/docs/store-orders",
      },
      { name: "Courses in Yallapp", types: ["Academy"], text: "Courses, sections and lessons with video and text; free and paid courses.", docs: "/docs/courses" },
      { name: "Services in Yallapp", types: ["Bookings", "Clinic"], text: "Services, team, working hours, days off and booking rules. Clinics add doctor profiles and an intake form.", docs: "/docs/bookings" },
      { name: "Listings in Yallapp", types: ["Real estate"], text: "Properties with photos, features, a map position and messages.", docs: "/docs/real-estate" },
      { name: "Articles in Yallapp", types: ["News & blog"], text: "Articles with pictures and sections, published when you're ready, with breaking news.", docs: "/docs/news" },
      { name: "Events in Yallapp", types: ["Events & tickets"], text: "Events with ticket types, free sign-ups, paid tickets, attendees and check-in at the door.", docs: "/docs/events" },
      { name: "Campaigns in Yallapp", types: ["Charity & donations"], text: "Campaigns with a goal and progress, donations into your own iyzico, Kashier or Fawaterk account, receipts and a donor list.", docs: "/docs/donations" },
    ],
  },
  {
    id: "services",
    title: "Accounts you bring",
    text: "Your apps run on your own accounts, so your customers, payments and store listings stay yours.",
    icon: "key",
    items: [
      { name: "Google Play Console", types: ["Academy", "Store", "Bookings", "Real estate", "News & blog", "Events & tickets", "Charity & donations"], text: "Your Android app, published under your own developer account.", docs: "/docs/google-play" },
      { name: "App Store Connect", types: ["Academy", "Store", "Bookings", "Real estate", "News & blog", "Events & tickets", "Charity & donations"], text: "Your iOS app, published under your own Apple Developer account.", docs: "/docs/app-store" },
      // 41 The other Android stores (Phases 35, 36 and 42).
      { name: "Samsung Galaxy Store", types: ["Academy", "Store", "Bookings", "Real estate", "News & blog", "Events & tickets", "Charity & donations"], text: "Your Android app on every Samsung Galaxy phone, under your own seller account.", docs: "/docs/galaxy-store" },
      { name: "Huawei AppGallery", types: ["Academy", "Store", "Bookings", "Real estate", "News & blog", "Events & tickets", "Charity & donations"], text: "Your Android app for Huawei phones, with push notifications through Huawei Push Kit.", docs: "/docs/huawei-appgallery" },
      { name: "Xiaomi GetApps", types: ["Academy", "Store", "Bookings", "Real estate", "News & blog", "Events & tickets", "Charity & donations"], text: "Your Android app on Xiaomi, Redmi and POCO phones, under your own developer account.", docs: "/docs/xiaomi-getapps" },
      { name: "Firebase", types: ["Academy", "Store", "Bookings", "Real estate", "News & blog", "Events & tickets", "Charity & donations"], text: "Push notifications through your own Firebase project. Free for this use.", docs: "/docs/push-notifications" },
      { name: "iyzico", types: ["Store", "Academy", "Events & tickets", "Charity & donations"], text: "Card payments in apps without a website, into your own iyzico merchant account.", docs: "/docs/card-payments" },
      { name: "Kashier", types: ["Store", "Academy", "Events & tickets", "Charity & donations"], text: "Card payments in Egyptian pounds in apps without a website, into your own Kashier account.", docs: "/docs/card-payments" },
      { name: "Fawaterk", types: ["Store", "Academy", "Events & tickets", "Charity & donations"], text: "Card payments in Egyptian pounds in apps without a website, into your own Fawaterk account.", docs: "/docs/card-payments" },
    ],
  },
];

/**
 * 32 What the integrations add up to: the WordPress plugins the Yallapp plugin
 * reads (WordPress posts are the site itself) and the online platforms
 * (RSS feeds aren't one).
 */
export const INTEGRATION_COUNTS = {
  plugins: INTEGRATION_GROUPS.find((g) => g.id === "wordpress")!.items.filter((i) => i.docs === "/docs/wordpress-plugin").length,
  platforms: INTEGRATION_GROUPS.find((g) => g.id === "platforms")!.items.filter((i) => i.docs !== "/docs/news").length,
};

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
        text: `Your Android and iOS apps are published under your own accounts on ${ALL_STORES_TEXT}.`,
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
        title: "Card payments with iyzico, Kashier or Fawaterk",
        text: "Shops and academies without a website take card payments on a secure iyzico, Kashier or Fawaterk page, into their own merchant account.",
        details: [
          "Your own iyzico, Kashier or Fawaterk keys, with test keys for trying it out",
          "No payment account? Sell through Yallapp's and get paid your share",
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
    text: `We build, sign and package your apps for ${ALL_STORES_TEXT}. Download them and follow our guides, or let us publish them for you.`,
    screens: ["dashboard-builds"],
    features: [
      {
        icon: "download",
        title: "Every file you need",
        text: "Android APK and App Bundle, the iOS build, your signing key and your store assets.",
        details: [
          "APK to install on a phone and test, and for Galaxy Store, AppGallery and GetApps",
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
    yallapp: "Published under your own accounts on all five app stores, with your signing key to download",
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
    yallapp: "Your own checkout, or card payments into your own iyzico, Kashier or Fawaterk account",
  },
];

// ---------------------------------------------------------------------------
// How it works.

export interface Step {
  title: string;
  /** 32 One short sentence, for the home page's timeline. */
  short: string;
  icon: IconName;
  text: string;
  details: string[];
}

export const STEPS: Step[] = [
  {
    title: "Create your account",
    short: "Sign up in a minute and pick a plan.",
    icon: "account_circle",
    text: "Sign up in a minute. Pay your plan by card or arrange it with our team on WhatsApp, and we activate your account.",
    details: ["Sign up on yallapp.com.tr, with or without a website", "Choose Starter, Growth, Pro or Business for each app", "Pay by card, or talk to us on WhatsApp"],
  },
  {
    title: "Connect your content",
    short: "Your website, a platform you use, or no website at all.",
    icon: "link",
    text: "Choose your app type and where its content comes from: your website, an online platform, your own API, or nothing at all.",
    details: [
      listText(KINDS.map((k) => k.name), "or"),
      "WordPress plugin, Shopify, ikas, Ticimax, IdeaSoft, Wix, Salla, Zid, Teachable, Thinkific or SimplyBook.me",
      "No website? Add products, courses, services or listings in the dashboard",
    ],
  },
  {
    title: "Brand it and build your pages",
    short: "Your logo, colors, pages and languages.",
    icon: "palette",
    text: "Upload your icon and logo, pick your colors and template, then build your pages and turn on languages.",
    details: ["App name, icon, logo and colors", "Pages, tabs and look in the editor", "English, Arabic and Turkish"],
  },
  {
    title: "Add your store details",
    short: "Store texts, screenshots and notifications.",
    icon: "storefront",
    text: "Package name, bundle ID, store texts and screenshots. Add Firebase for push notifications whenever you're ready.",
    details: ["Store title and descriptions", "Phone and iPhone screenshots", "Firebase files for push notifications"],
  },
  {
    title: "Build and publish",
    short: "Download your apps, or we publish them for you.",
    icon: "publish",
    text: "Your apps build as soon as the setup is complete. Download them and publish with our guides, or let us publish them for you.",
    details: [
      "Starter and Growth: download your files and follow the step-by-step guides",
      `Pro and Business: we publish every new version on ${ALL_STORES_TEXT}`,
    ],
  },
];

export const REQUIREMENTS = [
  "Your content: a website on a supported platform, your own API, or nothing at all",
  "A Google Play developer account (one-time fee to Google)",
  "An Apple Developer Program membership for iOS (yearly fee to Apple)",
  `Seller accounts on ${MORE_ANDROID_STORES_TEXT}, if you want your app there too (free)`,
  "A free Firebase project, for push notifications",
  "An iyzico, Kashier or Fawaterk merchant account, to take card payments without a website (optional)",
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
        a: `Yallapp builds branded Android and iOS apps for academies, shops, restaurants, clinics, gyms, real estate offices, news sites, events, charities and more. Your app gets its content from your website, an online platform you already use, your own API, or from the Yallapp dashboard if you have no website. We build the apps, and you publish them under your own name on ${ALL_STORES_TEXT}, or we publish them for you.`,
      },
      {
        q: "Do I need a website?",
        a: "No. You can add your products, courses, services or property listings in the Yallapp dashboard, and your app shows them. If you have a website on a supported platform, your app reads it live instead.",
      },
      {
        q: "Which kinds of apps can I build?",
        // 32 Counted and named from the kinds registry.
        a: `${numberWord(SOLUTIONS.length).replace(/^./, (c) => c.toUpperCase())}, each with its own screens: ${listText(SOLUTIONS.map((s) => s.name))}. See [Solutions](/solutions) for what each one does.`,
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
        a: "A WordPress site with the Yallapp plugin (Tutor LMS, LearnPress, LifterLMS, MasterStudy LMS, Sensei LMS, Masteriyo, LearnDash, WooCommerce, Amelia, BookingPress or LatePoint), Shopify, ikas, Ticimax, IdeaSoft, Wix, Salla, Zid, Teachable, Thinkific, SimplyBook.me, your own API, or the Yallapp dashboard. See [Integrations](/integrations).",
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
    title: "Publishing on the app stores",
    items: [
      {
        q: "Which app stores can my app be on?",
        a: `${ALL_STORES_TEXT}. Every plan builds the Android app for Google Play, Galaxy Store, AppGallery and GetApps; the iOS app for the App Store comes with Growth and up.`,
      },
      {
        q: "Do I need my own Apple and Google developer accounts?",
        a: "Yes. Your apps are published under your own name. Google charges a one-time fee and Apple a yearly fee, paid directly to them. Companies need a D-U-N-S number for both. Samsung, Huawei and Xiaomi accounts are free, and only needed if you want your app in their stores. See [Developer accounts](/docs/developer-accounts).",
      },
      {
        q: "Who publishes the apps?",
        a: `On Starter and Growth you download the files and publish them with our step-by-step guides. On Pro and Business we publish your app and every new version on ${ALL_STORES_TEXT} for you.`,
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
        a: "On your own checkout when your shop runs on WooCommerce, Shopify, ikas, Ticimax, IdeaSoft, Wix, Salla or Zid. Without a website, they pay by card on a secure iyzico, Kashier or Fawaterk page, into your own merchant account.",
      },
      {
        q: "I don't have a payment account. Can I still sell?",
        a: "Yes. You can sell through Yallapp's account instead: say who gets paid on your Products page, and your share of each completed order is paid to your IBAN after a commission.",
      },
      {
        q: "Does Yallapp take a cut of my sales?",
        a: "Not when you use your own checkout or your own payment account. Only sales through Yallapp's account carry a commission.",
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
        a: "By card in your dashboard when a price is shown, or arranged directly with our team on WhatsApp. We activate your account as soon as the payment is confirmed.",
      },
      {
        q: "Which currency are the prices in?",
        a: "Egyptian pounds in Egypt, and US dollars everywhere else. Card payments go through Kashier and are charged in Egyptian pounds wherever you are: the payment page shows the exact amount in pounds before you pay, and your bank converts it at its own rate.",
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
        a: "Yes, from the app's account screen, as the app stores require.",
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
