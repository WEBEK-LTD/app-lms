import { MAIL_PRESETS } from "../lib/email/app-mail-presets";
import { DEVELOPER_GUIDE } from "./docs-developer";

/**
 * The documentation at yallapp.com.tr/docs: the user manual for clients, as
 * the team can edit it in the admin (Website content). Each body is Markdown
 * (lib/content/markdown.ts): the text before the first `##` heading is the
 * introduction, a "Before you start" section becomes the checklist box,
 * every other `##` section is a part of the page (numbered in step-by-step
 * articles), `>` lines are notes, ~~~ fences are code blocks, and text after
 * a closing `---` ends the article.
 *
 * Written for people who aren't technical. Never name the technology or the
 * services Yallapp runs on; the only ones to name are webek.org (hosting),
 * waabek.com (WhatsApp codes), the platforms clients connect, Firebase,
 * Google Play Console, App Store Connect, Galaxy Store Seller Portal,
 * AppGallery Connect (and Huawei Push Kit), the Xiaomi developer platform
 * (Xiaomi GetApps) and iyzico.
 */

export type DocSection =
  | "Getting started"
  | "Your content"
  | "Your app"
  | "Publishing"
  | "Selling and bookings"
  | "Account and billing"
  | "Troubleshooting"
  | "For developers";

export const DOC_SECTIONS: DocSection[] = [
  "Getting started",
  "Your content",
  "Your app",
  "Publishing",
  "Selling and bookings",
  "Account and billing",
  "Troubleshooting",
  "For developers",
];

export interface DocDefault {
  slug: string;
  /**
   * The key of its edits in the admin. Articles that were guides at /guides
   * keep their `guide-<old slug>` key, so edits made then still show.
   */
  key: string;
  section: DocSection;
  title: string;
  description: string;
  /** Step-by-step articles number their sections. */
  steps: boolean;
  body: string;
}

/** The old guide addresses, /guides/<slug>, and the article each one moved to. */
export const GUIDE_REDIRECTS: Record<string, string> = {
  "install-plugin": "wordpress-plugin",
  "custom-api": "my-own-api",
  "activate-license": "wordpress-license",
  "push-notifications": "push-notifications",
  "google-play": "google-play",
  "app-store": "app-store",
  "release-update": "updates",
  "sign-in-codes": "sign-in-codes",
  videos: "videos",
  "store-rejection": "store-rejections",
};

const doc = (d: Omit<DocDefault, "key"> & { key?: string }): DocDefault => ({ key: `doc-${d.slug}`, ...d });

/** 24 The steps of each email service on App sign-in › Your app's email, as the dashboard shows them. */
export const MAIL_PRESET_STEPS = MAIL_PRESETS.map(
  (p) => `**${p.name}** (${p.hint}${p.host ? `: ${p.host}, ${p.ports.map((port) => port.label).join(" or ")}` : ""})\n\n${p.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}`,
).join("\n\n");

export const DOCS: DocDefault[] = [
  // -------------------------------------------------------------------------
  doc({
    slug: "getting-started",
    section: "Getting started",
    title: "Welcome to Yallapp",
    description: "What Yallapp does, what you need, and the path from sign-up to your apps in the stores.",
    steps: false,
    body: `Yallapp builds your own branded Android and iOS apps. Your app can be an **academy**, a **store**, a **bookings** app or a **real estate** app, and it gets its content from the website you already run, from an online platform you use, from your own API, or from the Yallapp dashboard if you have no website. This documentation takes you through every step, in plain words.

## How Yallapp works

- **You set up your app in the dashboard**: its type, where its content comes from, its name, icon, colors and pages.
- **Your content stays where it is.** With a website or an online platform, the app reads it live. Without one, you add your products, courses, services or listings in the dashboard.
- **We build your apps.** You get the files for Google Play, the App Store, Samsung Galaxy Store, Huawei AppGallery and Xiaomi GetApps, your signing key and your store assets.
- **You publish them under your own name**, with our guides, or we publish them for you on the Pro and Business plans.
- **You change your app without a new version.** Pages, look, languages and content change from the dashboard and show the next time the app opens.

## What you need

- Your content: a website on a [supported platform](/integrations), your own API, or nothing at all
- A Google Play developer account, and an Apple Developer Program membership for iPhones (see [Developer accounts](/docs/developer-accounts)); free Samsung, Huawei and Xiaomi accounts if you want your app in their stores too
- Your app icon (a square PNG, 1024 × 1024 pixels) and your logo
- A free Firebase project, if you want push notifications (see [Push notifications with Firebase](/docs/push-notifications))

## Your path to the stores

1. [Create your account](/docs/create-account) and get it activated.
2. [Choose your app type](/docs/app-types).
3. [Choose where your content comes from](/docs/content-sources) and connect it.
4. Complete [the setup steps](/docs/setup-steps): branding, store listing and publishing.
5. Build your [pages and look](/docs/pages-and-look) and turn on [languages](/docs/languages).
6. Download your apps from [Builds & downloads](/docs/builds) and publish them on [Google Play](/docs/google-play) and the [App Store](/docs/app-store), and if you like on [Samsung Galaxy Store](/docs/galaxy-store), [Huawei AppGallery](/docs/huawei-appgallery) and Xiaomi GetApps.

## Getting help

Every page of your dashboard has a **Support** link that opens WhatsApp with our team. You can also email us. Send us a screenshot of what you see, and we'll answer you directly.
`,
  }),
  doc({
    slug: "create-account",
    section: "Getting started",
    title: "Create your account",
    description: "Sign up, get your account activated, pay your plan by card and sign in to your dashboard.",
    steps: true,
    body: `Your Yallapp account is where you set up, build and manage your apps. It takes a minute to create.

## Before you start

- Your email address and your WhatsApp number, with its country code
- Your website's address, if you have one (you can add it later)

## Sign up

Open [Create an account](/sign-up) and enter your full name, email, WhatsApp number and a password of at least 10 characters. Your website is optional: apps can also come from Shopify and other platforms, or from no website at all. Confirm that you agree to the terms and that you're signing up for your business, then select **Create account**.

## Get your account activated

New accounts wait for activation. On the waiting page you can:

- **Pay by card**, when prices are shown: choose your plan, enter your billing city and address and, if you have one, a coupon code. You pay on the secure page of our payment provider, Kashier, in Egyptian pounds (outside Egypt the price is shown in US dollars and your bank converts the charge), and your account is activated as soon as the payment is confirmed.
- **Message us on WhatsApp** to arrange your plan with our team. We activate your account once the payment is confirmed.

We email you when your account is active.

## Sign in to your dashboard

[Sign in](/sign-in) with your email and password. The first time, you choose your app type, and the setup steps follow. Forgot your password? Choose **Forgot password?** on the sign-in page and we'll email you a link to choose a new one.
`,
  }),
  doc({
    slug: "app-types",
    section: "Getting started",
    title: "Choose your app type",
    description: "Academy, Store, Restaurant & café, Bookings, Clinic, Gym & fitness, Real estate, News & blog, Events & tickets or Charity & donations: what each app type does and where its content can come from.",
    steps: false,
    body: `The app type decides your app's screens and its bottom tabs. You choose it once, on the first page of **App setup**, and you can change it later.

## Academy

Courses, lessons, quizzes, progress and certificates. Students browse courses, continue learning where they stopped, watch protected videos and mark lessons complete. Content from a WordPress LMS (Tutor LMS, LearnPress, LifterLMS, MasterStudy LMS, Sensei LMS, Masteriyo or LearnDash), Teachable, Thinkific, your own API, or courses you add in the dashboard. See [the Academy solution](/solutions/academy).

## Store

Products, a cart, checkout and orders, with delivery dates and gift messages for flower and gift shops. Content from WooCommerce, Shopify, ikas, Ticimax, IdeaSoft, your own API, or products you add in the dashboard. See [the Store solution](/solutions/store).

## Restaurant & café

A store for food: your menu with its categories as tabs, dishes with options (a size, a side, extras), pickup or delivery, now or for later, and order tracking with a notification at each step. Customers pay by card in the app, on Android and iPhone. Options, opening hours, pickup, delivery and the kitchen are for restaurants without a website for now; with WooCommerce, dishes use product variations. See [Restaurants and cafés](/docs/restaurants) and [the Restaurant & café solution](/solutions/restaurant).

## Bookings

Services, staff, free times and appointments. Customers book a time and see or cancel their appointments; payment happens at your business. Content from Amelia, BookingPress or LatePoint on WordPress, SimplyBook.me, your own API, or services you add in the dashboard. See [the Bookings solution](/solutions/bookings).

## Clinic

Bookings for doctors, dentists, therapists and other clinics, in the words patients expect: doctors, patients and visits. Patients read each doctor's profile, book a visit and answer your intake questions. The intake form is for clinics without a website for now; with Amelia, BookingPress or LatePoint, patients book without it. See [Clinics: doctors, visits and the intake form](/docs/clinics) and [the Clinic solution](/solutions/clinic).

## Gym & fitness

Class timetables, booking a spot, and memberships for gyms, studios and coaches. Members see the week's classes with the spots left, book a spot and buy a membership or a class pack by card. Classes and memberships are for gyms without a website for now; personal sessions can also come from Amelia, BookingPress or LatePoint. See [Gyms and studios: timetable, classes and memberships](/docs/fitness) and [the Gym & fitness solution](/solutions/fitness).

## Real estate

Property listings with search and filters, favorites and messages to your office. Listings are always managed in the Yallapp dashboard, so you don't need a website. See [the Real estate solution](/solutions/real-estate).

## News & blog

Articles, sections and breaking-news alerts for news sites, blogs and magazines. Readers browse the latest stories and sections, search, save articles to read later and share them. Content from your WordPress posts, any website's RSS or Atom feed, your own API, or articles you write in the dashboard. Reading is free: there's no paid content in the app. See [the News & blog solution](/solutions/news) and [News and blog apps](/docs/news).

## Events & tickets

Event listings with a calendar, free sign-ups and paid tickets with QR codes checked at the door. People keep their tickets in the app, also offline, and hear when an event changes. Events are managed in the Yallapp dashboard, so you don't need a website. See [the Events & tickets solution](/solutions/events) and [Events and tickets](/docs/events).

## Charity & donations

Campaigns with their story, a goal and a progress bar, for charities, food banks, foundations and community groups. Supporters choose an amount and donate on your secure donation page, into your own iyzico, Kashier or Fawaterk account, and get a receipt by email. Campaigns are managed in the Yallapp dashboard, so you don't need a website. On iPhone, the donation page opens in the browser, as Apple requires. See [Charity and donation apps](/docs/donations) and [the Charity & donations solution](/solutions/charity).

## Changing the app type later

Open **App setup** and choose another type. Your next build includes the new type's screens. Content made for the old type, such as a shop or a bookings setup, doesn't carry over: go through the **Website** step again to choose the new type's content.
`,
  }),

  // -------------------------------------------------------------------------
  doc({
    slug: "content-sources",
    section: "Your content",
    title: "Where your app's content comes from",
    description: "Every choice on the Website step, which app types each one fits, and how people sign in with each.",
    steps: false,
    body: `On the **Website** step of App setup you choose where your app gets its courses, products, services or listings. The choices depend on your app type.

## The choices

- **My WordPress site**: install the Yallapp plugin on your site. Works with Tutor LMS, LearnPress, LifterLMS, MasterStudy LMS, Sensei LMS, Masteriyo, LearnDash, WooCommerce, Amelia, BookingPress and LatePoint. See [Install the WordPress plugin](/docs/wordpress-plugin).
- **My Shopify store** (Store apps): see [Connect Shopify](/docs/shopify).
- **Another store platform** (Store apps): ikas, Ticimax, IdeaSoft, Wix, Salla or Zid. See [Connect ikas](/docs/ikas), [Connect Ticimax](/docs/ticimax), [Connect IdeaSoft](/docs/ideasoft), [Connect your Wix store](/docs/wix), [Connect your Salla store](/docs/salla) and [Connect your Zid store](/docs/zid).
- **My Teachable or Thinkific school** (Academy apps): see [Connect Teachable](/docs/teachable) and [Connect Thinkific](/docs/thinkific).
- **My SimplyBook.me account** (Bookings apps): see [Connect SimplyBook.me](/docs/simplybook).
- **My site's RSS feed** (News & blog apps): the articles of any website's RSS or Atom feed. See [News and blog apps](/docs/news).
- **I don't have a website**: add your content in the dashboard. See [No website](/docs/no-website).
- **My own API** (Academy, Store, Bookings and News & blog apps): for developers. See [Connect your own API](/docs/my-own-api).
- **I don't have WordPress**: our team sets up a WordPress site for you and moves your content over.

Real estate apps have one choice, **Listings managed in Yallapp**, and Charity & donations apps one too, **Campaigns managed in Yallapp**.

## How people sign in to your app

- **WordPress**: with a one-time code we send on WhatsApp, through waabek.com, with your app's name. People use the same accounts as on your website, also the ones made with Digits. If you prefer, Digits can send the codes through your own gateway: see [Install the WordPress plugin](/docs/wordpress-plugin#sign-in-codes).
- **My own API**: your API sends the code, by SMS or WhatsApp, from your own system.
- **Every other choice**: with a one-time code we send on WhatsApp, through waabek.com. You set the sign-in rules on the dashboard's **App sign-in** page. See [App users and sign-in](/docs/app-users).

## Your keys are safe

Platform keys and tokens are checked with the platform before they're saved, stored encrypted, and never shown again. To change one, paste a new one over it.

## We set up WordPress for you

No website yet, but you'd like one? Choose **I don't have WordPress**, enter your current website (if any) and tell us about your content: your platform, how many products or courses you have, and where they are today. Our team messages you on WhatsApp with the price and the next steps. When your new WordPress site is ready, come back and choose **My WordPress site**.

## Changing your choice later

Open the Website step again and choose another source. Your next build uses it. Content you added in the dashboard stays there if you come back to it.
`,
  }),
  doc({
    slug: "wordpress-plugin",
    key: "guide-install-plugin",
    section: "Your content",
    title: "Install the WordPress plugin",
    description: "Install the Yallapp plugin that connects your WordPress website to your app, and choose its settings.",
    steps: true,
    body: `The Yallapp plugin connects your WordPress website to your app. It finds your course, shop or booking plugin and serves its content to your app, live. You install it once, and it updates like any other plugin.

## Before you start

- WordPress 6.0 or later, with PHP 7.4 or later, on https
- One of the supported plugins: Tutor LMS, LearnPress, LifterLMS, MasterStudy LMS, Sensei LMS, Masteriyo or LearnDash for courses; WooCommerce for a shop; Amelia, BookingPress or LatePoint for bookings
- Nothing for sign-in: we send the one-time codes on WhatsApp. Digits is optional (see [Sign-in codes](#sign-in-codes) below)
- An active Yallapp account, with access to [License & plugin](/dashboard/license)

## Download the plugin

In your dashboard, open **License & plugin** and choose **Download plugin**. You get a .zip file. Don’t unzip it.

## Upload it to WordPress

In WordPress admin, go to **Plugins › Add New Plugin › Upload Plugin**, choose the .zip file, then select **Install Now** and **Activate**.

## Activate your license

A **Yallapp** item appears in the WordPress admin menu. Paste your license key there and select **Activate**. See [Activate your license](/docs/wordpress-license).

## Check what the plugin found

The **Compatibility status** card shows which course, shop and booking plugins it found, with their versions, who sends the sign-in codes, and whether Digits is active. If something you use shows **Not found**, check that it's installed and active.

## Sign-in codes

People sign in to your app with their phone number and a 6-digit code. In the plugin's **Sign-in** settings, choose who sends it:

- **Sent by Yallapp (WhatsApp)**, the default: we send each code on WhatsApp, through waabek.com, with your app's name. Nothing to set up; it needs your active license. The code is made on your website and kept there only as a hash, for 5 minutes and 5 attempts. We pass the phone number and the code on to WhatsApp and keep neither.
- **Digits**: the codes go out through the SMS or WhatsApp gateway set up in Digits. This needs Digits' **REST API** add-on; without it, the choice shows as not available.

Do you use Digits without its REST API add-on, for example with only the Additional SMS Gateways add-on? Then we send the codes, and nothing changes for your members: the app finds each account by the phone number saved by Digits, so people sign in with the same number and keep their accounts, progress and orders. Your website's own Digits sign-in keeps working as before.

If the choice you saved can't send codes (Digits without its REST API add-on, or no active license), the plugin uses the other one and the settings page says so, in plain words.

## Choose your settings

The plugin's settings decide how your app behaves. The most important ones:

- **Sign-in**: who sends the sign-in codes (see above), whether new accounts can sign up from the app, what they're asked, how long people stay signed in, what happens at the device limit, and **Store review access** (a test number and fixed code for Apple and Google reviewers)
- **Purchases**: the **Enroll now** button on Android, free enrollment, and whether checkout opens inside the app or in the phone's browser
- **Video & content protection**: blocking screenshots and screen recording, the video watermark, how long video links last, and a required watch time
- **Lesson content (HTML & code)**: how lessons are shown, the height of embedded tools, code highlighting
- **Store app**: the banner, delivery dates and gift messages
- **Notifications (Firebase)**: see [Push notifications with Firebase](/docs/push-notifications)
- **Updates & maintenance**: a minimum app version, and maintenance mode with a message

Changes apply in the app the next time it opens, without a new build.

## Choose My WordPress site on the Website step

In your Yallapp dashboard, open **App setup › Website**, choose **My WordPress site**, enter your website's https address and select **Save & continue**. The step shows whether the plugin is connected.

> Your pages, look and languages are built in the Yallapp dashboard, and the plugin fills them with your own courses, products and posts. The plugin's **App pages and look** card shows whether they're published and lets you refresh them at once.
`,
  }),
  doc({
    slug: "wordpress-license",
    key: "guide-activate-license",
    section: "Your content",
    title: "Activate your license",
    description: "Connect the WordPress plugin to your Yallapp plan with your license key, and move it to a new domain.",
    steps: true,
    body: `Your license key connects the WordPress plugin to your Yallapp plan. One license works on one website at a time.

## Copy your license key

Open [License & plugin](/dashboard/license) in your dashboard and copy your key. It looks like **YALL-XXXX-XXXX-XXXX**. We also sent it to you by email when your account was activated.

## Paste it in the plugin

In WordPress admin, open **Yallapp**, paste the key into the license field and select **Activate**.

## Check the status

The plugin shows **Active** with your plan and renewal date, and your dashboard shows the connected website. The plugin checks the license every 12 hours, and within a minute of a change in your dashboard (your app type, how people sign in, your plan or your published pages) when your website can be reached. If it can’t reach us for a while, your app keeps working for 72 hours.

> Moving to a new domain? Deactivate the license in the plugin on the old site, or release it from **License & plugin** in your dashboard. Then activate it on the new site. A website at a different folder of the same domain counts as a different site.
`,
  }),
  doc({
    slug: "shopify",
    section: "Your content",
    title: "Connect Shopify",
    description: "Connect your Shopify store to a Store app with a Storefront API token, and an optional Admin API token for order history.",
    steps: true,
    body: `Your Store app can take its products, collections, prices and checkout from your Shopify store. Customers pay on Shopify's own checkout, inside the app.

## Before you start

- A Shopify store, and permission to develop apps for it (the store owner has it)
- Your Yallapp app type set to **Store**

## Create an app in Shopify

In your Shopify admin, open **Settings › Apps and sales channels › Develop apps**. If Shopify asks, allow custom app development. Select **Create an app** and give it a name, for example "Mobile app".

## Turn on the Storefront API

In the app's configuration, turn on **Storefront API** access with the permissions to read products and collections and to create checkouts. Save, then select **Install app**. On the **API credentials** tab, copy the **Storefront API access token**.

## Optional: order history

To show customers their orders in the app, turn on **Admin API** access in the same app with the **read_orders** and **read_customers** permissions, then copy the **Admin API access token**. Orders are matched to the phone number customers sign in with, so they must use the same number in your shop.

## Enter them on the Website step

In your Yallapp dashboard, open **App setup › Website** and choose **My Shopify store**. Enter your shop's **myshopify.com** address (also when your shop uses its own domain), your website address, the Storefront API token and, if you have it, the Admin API token. Select **Save & continue**. We check the token with your shop before saving.

> Collections become your app's categories, and the **Home page** collection becomes its featured products. On iPhones, carts with digital products (no shipping) can't be checked out, as Apple's rules require. Product reviews are off for Shopify apps.
`,
  }),
  doc({
    slug: "ikas",
    section: "Your content",
    title: "Connect ikas",
    description: "Connect your ikas store to a Store app with a private app's Client ID and secret.",
    steps: true,
    body: `Your Store app can take its products, prices and stock from your ikas store. Customers finish their order on your ikas checkout.

## Before you start

- An ikas store, and access to its dashboard
- Your Yallapp app type set to **Store**

## Create a private app in ikas

In your ikas dashboard, open **Apps › My Apps** and create a private app with the **read_products**, **read_orders**, **read_customers** and **read_inventories** permissions. Save it. Its **Client ID** and **Client secret** are shown.

## Enter them on the Website step

In your Yallapp dashboard, open **App setup › Website**, choose **Another store platform** and then **ikas**. Enter:

- **Store name**: the first part of your ikas address. For your-store.myikas.com, enter your-store.
- **Client ID** and **Client secret** from the private app.
- **Store address** (optional): the address your customers visit, such as www.your-store.com. Leave it empty to use the main address set in ikas.

Select **Save & continue**. We check the keys with ikas before saving.
`,
  }),
  doc({
    slug: "ticimax",
    section: "Your content",
    title: "Connect Ticimax",
    description: "Connect your Ticimax shop to a Store app with a web service key.",
    steps: true,
    body: `Your Store app can take its products, prices and stock from your Ticimax shop. Customers finish their order on your shop's website.

## Before you start

- A Ticimax shop, and access to its admin panel
- Your Yallapp app type set to **Store**

## Create a web service key in Ticimax

In your Ticimax admin panel, open **Ayarlar › WS Yetki Kodu Yönetimi** and select **Yeni Ekle**. Give it a name and select **Yetki Kodu Oluştur**. Turn on reading products, categories, members and orders, plus the cart permissions, and save.

## Enter it on the Website step

In your Yallapp dashboard, open **App setup › Website**, choose **Another store platform** and then **Ticimax**. Enter your **Shop address** as customers type it (for example www.your-shop.com) and paste the **Web service key**. Select **Save & continue**. We check the key with your shop before saving.
`,
  }),
  doc({
    slug: "ideasoft",
    section: "Your content",
    title: "Connect IdeaSoft",
    description: "Connect your IdeaSoft store to a Store app with an API client and a refresh token.",
    steps: true,
    body: `Your Store app can take its products, prices, stock and orders from your IdeaSoft store. Customers pay on your store's checkout.

## Before you start

- An IdeaSoft store, and its main admin account (only the main admin can add API clients)
- Your Yallapp app type set to **Store**

## Add an API client in IdeaSoft

In your IdeaSoft panel, open **Entegrasyonlar › API** and add an API client. Enter any name and set the **Redirect URI** to https://yallapp.com.tr/oauth/ideasoft. Give it read access to products, categories, currencies, orders and members, and write access to quick buy links (**Hızlı Satın Al**). Copy its **Client ID** and **Client Secret**.

## Get a refresh token

Open [yallapp.com.tr/oauth/ideasoft](/oauth/ideasoft), enter your store's myideasoft.com address, the Client ID and the Client Secret, and select **Continue to IdeaSoft**. Approve the access in IdeaSoft. You come back to a page that shows a **refresh token**: copy it.

> If that page shows a short code instead, paste it on the Website step and save within 30 seconds, or start again to get a token that lasts.

## Enter them on the Website step

In your Yallapp dashboard, open **App setup › Website**, choose **Another store platform** and then **IdeaSoft**. Enter your **Store address** (your-store.myideasoft.com), the **Client ID**, the **Client Secret** and the **Refresh token**. Select **Save & continue**. We check them with IdeaSoft before saving and keep the access renewed for you.
`,
  }),
  doc({
    slug: "wix",
    section: "Your content",
    title: "Connect your Wix store",
    description: "Connect your Wix store to a Store app with a Headless client ID, and an optional API key for order history.",
    steps: true,
    body: `Your Store app can take its products, categories, prices and stock from your Wix store. Customers pay on Wix's own checkout page, inside the app.

## Before you start

- A Wix site with **Wix Stores**, and access to its dashboard
- Your Yallapp app type set to **Store**

## Create an OAuth app in Wix

In your Wix site's dashboard, open **Settings** and then **Headless Settings**. Under **OAuth apps**, create a new OAuth app and give it a name, for example "Mobile app". Copy its **Client ID**.

The client ID only lets the app see your store as a visitor of your website does: your products, and a checkout for each cart. It can't change anything.

## Optional: order history

To show customers their orders in the app, create an API key:

1. In Wix, open your account's **API Keys** page (from the account menu) and select **Generate API Key**.
2. Give it a name and the permission to read **Wix Stores** and **eCommerce** orders. To find more of each customer's orders, also allow reading **Contacts**.
3. Copy the API key. Wix shows it only once.
4. Copy your **site ID**: it's in your site dashboard's address, after /dashboard/.

Orders are matched exactly to the phone number customers sign in with, so they must use the same number in your store.

## Enter them on the Website step

In your Yallapp dashboard, open **App setup › Website**, choose **Another store platform** and then **Wix**. Enter:

- **Client ID** from the OAuth app.
- **API key** and **Site ID** (optional, together), for order history. You can paste your whole site dashboard address as the site ID.
- **Store address** (optional): the address your customers visit, such as www.your-store.com. Shoppers come back to it after checkout.

Select **Save & continue**. We check the client ID and the key with Wix before saving.

> Your Wix categories become your app's categories. On iPhones, carts with digital products can't be checked out, as Apple's rules require. Product reviews are off for Wix apps. Wix stores still on Wix's older product catalog can't be connected yet.
`,
  }),
  doc({
    slug: "salla",
    section: "Your content",
    title: "Connect your Salla store",
    description: "Connect your Salla store to a Store app in a few clicks: approve Yallapp's access in Salla, with no keys to copy.",
    steps: true,
    body: `Your Store app can take its products, categories, prices and stock from your Salla store, and show customers their orders. Customers finish each order on your Salla store.

## Before you start

- A Salla store, and the account that manages it
- Your Yallapp app type set to **Store**

## Connect with Salla

1. In your Yallapp dashboard, open **App setup › Website**, choose **Another store platform** and then **Salla**.
2. Select **Connect with Salla**.
3. Sign in to Salla if it asks, check the store, and approve Yallapp's access to your products, orders and customers.
4. Salla brings you back to the Website step, which shows **Connected to** and your store's name. Select **Save & continue**.

There are no keys to copy: we keep the access renewed for you. To connect another store, select **Connect another Salla store**. To stop, select **Disconnect**, and remove the Yallapp app from your Salla dashboard too.

## How orders work

Salla doesn't let other apps fill a shopper's cart, so checkout happens on your store: in the app, **Checkout** opens the product's page on your Salla store in the browser, where the customer picks their options and pays. The app sends one product at a time to your store.

Customers see their orders in the app when they sign in with the same mobile number (with its country code) as their account on your store.

> If **Salla** shows "Not available yet", connecting Salla stores is still being set up. Message us on WhatsApp. Your Salla categories become your app's categories. On iPhones, digital products can't be bought in the app, as Apple's rules require. Product reviews are off for Salla apps.
`,
  }),
  doc({
    slug: "zid",
    section: "Your content",
    title: "Connect your Zid store",
    description: "Connect your Zid store to a Store app in a few clicks: approve Yallapp's access in Zid, with no keys to copy.",
    steps: true,
    body: `Your Store app can take its products, categories, prices and stock from your Zid store, and show customers their orders. Customers finish each order on your Zid store.

## Before you start

- A Zid store, and the account that manages it
- Your Yallapp app type set to **Store**

## Connect with Zid

1. In your Yallapp dashboard, open **App setup › Website**, choose **Another store platform** and then **Zid**.
2. Select **Connect with Zid**.
3. Sign in to Zid if it asks, and approve Yallapp's access to your products, orders and customers.
4. Zid brings you back to the Website step, which shows **Connected to** and your store's name. Select **Save & continue**.

There are no keys to copy: we keep the access renewed for you. To connect another store, select **Connect another Zid store**. To stop, select **Disconnect**, and remove the Yallapp app from your Zid dashboard too.

## How orders work

Checkout happens on your store: in the app, **Checkout** opens the product's page on your Zid store in the browser, where the customer picks their options and pays. The app sends one product at a time to your store.

Customers see their orders in the app when they sign in with the same mobile number (with its country code) as their account on your store.

> If **Zid** shows "Not available yet", connecting Zid stores is still being set up. Message us on WhatsApp. Your Zid categories become your app's categories. On iPhones, digital products can't be bought in the app, as Apple's rules require. Product reviews are off for Zid apps.
`,
  }),
  doc({
    slug: "teachable",
    section: "Your content",
    title: "Connect Teachable",
    description: "Connect your Teachable school to an Academy app with an API key.",
    steps: true,
    body: `Your Academy app can take its courses, lessons and students' progress from your Teachable school.

## Before you start

- A Teachable school on the **Growth** plan or higher (the API needs it)
- The school owner's account (only the owner sees the API page)
- Your Yallapp app type set to **Academy**

## Create an API key in Teachable

In your Teachable school admin, open **Settings › API** and select **Create API Key**. Copy the key.

## Enter it on the Website step

In your Yallapp dashboard, open **App setup › Website** and choose **My Teachable or Thinkific school**, then **Teachable**. Enter your **School address** (for example your-school.teachable.com, or your school's own domain) and paste the **API key**. Select **Save & continue**. We check the key with Teachable before saving.

> Students sign in to the app with a code we send on WhatsApp, to the phone number they use. Paid courses aren't sold in the iPhone app, as Apple's rules require.
`,
  }),
  doc({
    slug: "thinkific",
    section: "Your content",
    title: "Connect Thinkific",
    description: "Connect your Thinkific school to an Academy app with an API access token.",
    steps: true,
    body: `Your Academy app can take its courses, lessons and progress from your Thinkific school, with free enrollment in the app.

## Before you start

- A Thinkific school on the **Grow** plan or higher (API access needs it)
- Your Yallapp app type set to **Academy**

## Create an API access token in Thinkific

In your Thinkific admin, go to **Settings › Code & analytics › API**, add an API access token and copy it. Thinkific shows it only once.

> On Thinkific Plus, a **single sign-on signing secret** is shown once next to the token. Copy it too: with it, students open lessons already signed in to your school.

## Enter it on the Website step

In your Yallapp dashboard, open **App setup › Website** and choose **My Teachable or Thinkific school**, then **Thinkific**. Enter your **School subdomain** (for your-school.thinkific.com, enter your-school), paste the **Access token** and, if you have it, the **SSO signing secret**. Select **Save & continue**. We check the token with Thinkific before saving.
`,
  }),
  doc({
    slug: "simplybook",
    section: "Your content",
    title: "Connect SimplyBook.me",
    description: "Connect your SimplyBook.me account to a Bookings app with its API key and an API user.",
    steps: true,
    body: `Your Bookings app can take its services, team and free times from SimplyBook.me. Customers book, see and cancel their appointments in the app.

## Before you start

- A SimplyBook.me account with the **API** custom feature (a paid feature)
- Your Yallapp app type set to **Bookings**

## Turn on the API in SimplyBook.me

In SimplyBook.me, open **Custom Features** and turn on **API**. Then open its settings (**Settings › Integrations › API** in the new admin) and copy the **API key**.

## Create an API user key

In the API feature's settings, under **API user keys**, create a key for an admin user of your company (or a user you add for the app). Bookings from the app are made with this user's access. The user's password works too, but a key is better.

## Enter them on the Website step

In your Yallapp dashboard, open **App setup › Website** and choose **My SimplyBook.me account**. Enter:

- **Company login**: the login you sign in to SimplyBook.me with, also the first part of your booking site's address (mycompany in mycompany.simplybook.me)
- **API key**
- **API user login** and **API user key or password**
- **API host**: leave it empty unless your account is on another SimplyBook domain than simplybook.me

Select **Save & continue**. We check them with SimplyBook.me before saving.
`,
  }),
  doc({
    slug: "no-website",
    section: "Your content",
    title: "No website: manage everything in Yallapp",
    description: "Run a store, restaurant, academy, bookings, real estate, news, events or charity app without a website, with your content in the Yallapp dashboard.",
    steps: false,
    body: `You don't need a website to have an app. Choose **I don't have a website** on the Website step (for Real estate apps, **Listings managed in Yallapp**; for Events & tickets apps, **Events managed in Yallapp**), and new pages appear in your dashboard's menu for your content.

## What you manage, by app type

- **Store**: products, categories, stock and shipping on the **Products** page, and orders on the **Orders** page. Customers pay by card through iyzico, Kashier or Fawaterk. See [Products, orders and shipping](/docs/store-orders) and [Card payments](/docs/card-payments).
- **Restaurant & café**: dishes, their options, opening hours, pickup and delivery on the **Menu** page, and orders on the **Kitchen** page. See [Restaurants and cafés](/docs/restaurants).
- **Academy**: courses, sections and lessons on the **Courses** page, and orders for paid courses. See [Courses without a website](/docs/courses).
- **Bookings**: services, your team, working hours and booking rules on the **Services & team** page, and appointments on the **Appointments** page. See [Services, team and appointments](/docs/bookings).
- **Clinic**: services, your doctors and your intake form on the **Doctors & services** page, and visits on the **Visits** page. See [Clinics: doctors, visits and the intake form](/docs/clinics).
- **Gym & fitness**: classes and coaches on the **Classes & coaches** page, your weekly classes on **Timetable**, plans on **Membership plans** and who has one on **Members**. See [Gyms and studios: timetable, classes and memberships](/docs/fitness).
- **Real estate**: properties on the **Listings** page and messages on the **Inquiries** page. See [Listings and inquiries](/docs/real-estate).
- **News & blog**: articles and sections on the **Articles** page, with breaking news sent to your readers' phones. See [News and blog apps](/docs/news).
- **Events & tickets**: events, ticket types, sales and attendees on the **Events** page, and tickets checked at the door on the **Check-in** page. See [Events and tickets](/docs/events).
- **Charity & donations**: campaigns on the **Campaigns** page, and donations and donors on the **Donations** page. See [Charity and donation apps](/docs/donations).

## Sign-in, notifications and settings

Your customers sign in with a code we send on WhatsApp. Two more pages appear in your menu: **App sign-in** for the sign-in rules (see [App users and sign-in](/docs/app-users)) and **App notifications** to send push notifications (see [Push notifications with Firebase](/docs/push-notifications)).

## Where your data is kept

Your content and your customers' accounts, orders and appointments are kept by Yallapp, on servers hosted by webek.org. Payment keys are encrypted.

## Changes show right away

What you add or change shows in the app right away, without a new build.
`,
  }),

  // -------------------------------------------------------------------------
  doc({
    slug: "setup-steps",
    section: "Your app",
    title: "The setup steps",
    description: "App setup one step at a time: app type, website, branding, store listing and publishing.",
    steps: true,
    body: `**App setup** in your dashboard takes you through five steps. Each one is saved when you select **Save & continue**, and you can come back to any of them later. Your first build starts when the last step is done.

## App type

Choose **Academy**, **Store**, **Bookings** or **Real estate**. See [Choose your app type](/docs/app-types).

## Website

Choose where your app's content comes from and connect it. The choices depend on your app type: see [Where your app's content comes from](/docs/content-sources). For your own API, the step has a live check: see [Connect your own API](/docs/my-own-api).

## Branding

- **App name**: up to 30 characters, shown in the app and the stores.
- **Name under the app icon**: up to 12 characters, shown on the phone's home screen.
- **App icon**: a PNG, 1024 × 1024 pixels, without transparency.
- **Logo**: a PNG or SVG, shown on the sign-in screen.
- **Primary color** and **Splash screen background**: the color of buttons and highlights, and of the screen shown while the app opens.
- **Template**: Classic, Bold or Minimal, and the **Font**.

The live preview shows your choices as you go. Your pages, the secondary color, corners and cards are set later in [Pages and look](/docs/pages-and-look).

## Store listing

- **Android package name** and **iOS bundle ID**: your app's permanent identifiers, like com.yourbrand.app. Use lowercase words separated by dots. The package name can't be changed once your app is on Google Play, and the bundle ID must match the one in App Store Connect.
- **Store title** (up to 30 characters), **Short description** (up to 80 characters, shown under the title on Google Play) and **Full description**.
- **Support email** and **Privacy policy URL**: both stores require them.
- **Screenshots**: 2 to 8 Google Play phone screenshots, and up to 10 iPhone screenshots at 1320 × 2868, 1290 × 2796 or 1260 × 2736 pixels. PNG or JPEG, without transparency. Don't show prices or buy buttons in iPhone screenshots.

## Publishing

- **App Store Connect API key**: the Issuer ID, Key ID and private key (.p8) from **App Store Connect › Users and Access › Integrations › App Store Connect API**, with the App Manager role. It's needed to sign your iOS app; without it you get the Android app only.
- **Push notifications** (optional): your google-services.json and GoogleService-Info.plist files from Firebase. See [Push notifications with Firebase](/docs/push-notifications).
- **Pro and Business plans**: also a **Google Play service account key** (JSON), so we can upload to Google Play for you, unless you asked our team to publish the app (**Publishing** page). See [Publish on Google Play](/docs/google-play).

Keys are encrypted, never shown again, and used only for the builds you start. You can remove them at any time.

---

When you finish, your first build is queued. Follow it on [Builds & downloads](/docs/builds).
`,
  }),
  doc({
    slug: "pages-and-look",
    section: "Your app",
    title: "Pages and look",
    description: "Build your app's pages with blocks, set the bottom tabs, choose the look and publish without a new build.",
    steps: false,
    body: `The **Pages & look** editor in your dashboard is where you build your app's screens, like a site builder. When you publish, your app shows the new pages the next time it opens, without a new build or a store update.

## Start from a design

Every kind of app has three or four ready-made designs, such as Classic academy, Online courses, Coaching and Kids academy for an academy, or Fashion, Grocery and Electronics for a shop. A design is a whole starting point: the bottom tabs, a home page of blocks with your own lists in them, and a look (template, corners, cards, font and a secondary color).

- In the **Branding** step, choose a design under **Design**, or **Keep my pages**.
- In **Pages & look**, open **Start from a design** and select **Use this design**.

A design replaces your draft, never what your app shows: your published pages stay until you publish. Its blocks come with sample texts, marked **Sample text** in the editor until you change them. Write your own before you publish. A Contact block gets the website, email and WhatsApp number you gave us, and is left out when there are none.

## Pages and blocks

A page is a stack of blocks. Add a block from **Add a block**, then drag it up or down to change the order. The blocks, in the groups the editor shows them:

**Content**
- **Banner**: a wide image with a heading
- **Slider**: banners people swipe through, moving on their own if you like, with dots. A slide without an image shows your colors behind its text
- **Text**: paragraphs, headings and links
- **Image** and **Video**
- **Button**: opens a page, a screen, a course or product, or a web address
- **Notice**: a colored bar for news, good news or a warning, with an optional link

**Lists**
- **List**: your own courses, products, services, posts or listings, as cards
- **Categories** and **Search box**
- **Continue learning**: the student's current course (Academy apps)
- **Quick links**: tiles with an icon and a label, in rows or in one row to swipe
- **Team**: people with a photo (or their initials), a role and a few words: teachers, doctors, coaches or staff
- **Numbers**: two to four big numbers with a label

**Engage**
- **Testimonials**: what customers say, with their name, role, photo and stars
- **Questions**: questions whose answers open on tap
- **Countdown**: the days, hours, minutes and seconds left until a date. After the end it shows the text you wrote for it, or hides itself

**Contact**
- **Contact**: buttons to call, chat on WhatsApp, email, get directions (to your address or exact map position) and open your website. Fill in only the ones you want
- **Opening hours**: your hours for each day, with **Open now** or **Closed now** in the phone's time. Add a day twice for a break, list your holidays and add a note
- **Social links**: buttons to your Instagram, Facebook, X, TikTok, YouTube, LinkedIn, Snapchat, Telegram or WhatsApp channel, each with its name

**Layout**
- **Web page**: a page of a website, inside the app
- **Space**: room between blocks

Each block can show to everyone, only to people who are signed in, or only to people who aren't. Texts in blocks, also each slide's, quote's, question's and person's, can be written in every language your app has.

## Bottom tabs

Choose the tabs at the bottom of your app, their labels and icons, and what each one opens: one of your pages or a built-in screen such as courses, search, favorites, cart, orders, appointments, messages or the account.

## The look

- **Template**: Classic, Bold or Minimal
- **Light, dark or the phone's setting**, and whether people can switch in the app's settings
- **Font**, a **secondary color** for progress and highlights, **corners** (sharp, soft or round) and **cards** (flat, outlined or elevated)

Your main color and logo come from the Branding step.

## Drafts and publishing

Everything you change is saved as a draft while you work, and the editor shows **Unpublished changes**. Select **Publish** when you're ready. To start over, discard the draft and go back to the published pages. Until you publish for the first time, your app shows starting pages made for its type.

> On WordPress, the Yallapp plugin fetches your published pages and fills them with your own content. To see a change at once, use **App pages and look** in the plugin's settings.

## Built-in screens

Course pages, lessons, quizzes, product pages, the cart, booking a time, listing details, search with filters and the account are built-in screens, not blocks. Tabs, buttons and cards open them.
`,
  }),
  doc({
    slug: "preview-your-app",
    section: "Your app",
    title: "Preview your app",
    description: "Try your real app in your browser or on your phone before you build it, with your current setup, content and pages.",
    steps: false,
    body: `**Preview your app** in your dashboard runs your real app in your browser, with your current setup and content, before you start a build. Use it to check that the app type, the content, the branding, the template and font, the pages, the bottom tabs and the languages are right. Nothing in the preview is published or sent to the people who use your app.

## Open the preview

1. In your dashboard, select **Preview your app** in the menu. The overview, every setup step and **Pages & look** have the same button.
2. Your app opens in a phone frame. Use **Light** and **Dark** to see both looks, and **Language** to switch between your app's languages.
3. After you change something, select **Reload after changes**.

## Open it on your phone

Scan the QR code next to the preview with your phone's camera. The link works for an hour: open the preview again in the dashboard for a new one. On an iPhone the preview follows the iPhone rules, so paid courses show no purchase button.

## Before your setup is complete

The preview works from the moment you choose your app type. Until a step is done, it uses placeholders, such as "Your app" for the name, and the page lists what's still missing. Until you choose where your content comes from on the **Website** step, the preview shows only that.

## Published pages and drafts

- Apps whose content is managed in Yallapp or comes from a connected platform can show the draft from **Pages & look**: select **Draft from Pages & look** above the phone.
- WordPress sites and your own API get pages only once you publish them, so their preview shows the published pages.

## Signing in

The preview never sends sign-in codes. To try the screens people see once they're signed in, sign in with your **store review number** and its fixed code:

- Content managed in Yallapp or a connected platform: set them on **App sign-in**.
- WordPress: set them in the Yallapp plugin's settings, under store review access. If the preview says signing in works only in the installed app, update the Yallapp plugin.
- Your own API: see [Connect your own API](/docs/my-own-api#let-the-app-preview-reach-your-api).

## What works only in the installed app

- Push notifications
- Pages from the web inside the app, such as lessons shown as web pages, embedded videos, checkout and payment pages. The preview shows a short note there and can open the page in a new tab.
- Checkout and payments: the preview never takes a payment
- Protected videos and screen capture protection

Your app's name under the icon, its icon and its store listing come with a build.

## If the preview can't reach your content

- **WordPress:** a security plugin or your host may block requests from other addresses. Allow https://yallapp.com.tr, or ask your host to.
- **Your own API:** allow requests from https://yallapp.com.tr, as [Connect your own API](/docs/my-own-api#let-the-app-preview-reach-your-api) shows.
- **A WordPress app that isn't active yet:** your site answers the preview once the Yallapp plugin is connected and the app's plan is active. Apps without a website can be previewed at any time.
`,
  }),
  doc({
    slug: "languages",
    section: "Your app",
    title: "Languages and translations",
    description: "Offer your app in any language: Yallapp translates English, Arabic and Turkish for you, and you translate any other language yourself.",
    steps: false,
    body: `Every Yallapp app is in English. Yallapp also translates it into **Arabic** and **Turkish**: the app's own buttons and messages, and the tab names, page titles and sample texts Yallapp writes for you. You can add **any other language** the app can show, such as French, German, Persian or Urdu, and translate it yourself. People pick their language in the app's settings, where each language shows its own name.

## Add languages

Open **Languages** in your dashboard (or **Pages & look › Languages**). Choose a language in **Add a language** and select **Add**. Then:

- **Make default** sets the language your app opens in when the phone's language isn't one of yours. Your page texts move with it, so nothing is lost.
- The arrows set the order of the language picker in the app.
- The bin removes a language. Its translations are kept, in case you add it again.

Changes are saved to your draft. Select **Publish** to send them to your app. How many languages your app can have depends on your plan, whoever translates them.

## Translate your texts

The **Translations** part of the Languages page lists every text your app shows in the language you choose, with how much is translated:

- **Your pages and tabs**: tab names, page titles, and the texts of your blocks, slides, questions and people.
- **The app's own texts**: its buttons, screens and messages.

Write each text in the box under it. **Show: Missing** lists what still needs a translation, and **Search** finds a word, a text or a key. **Copy English** fills in the English, for brand names you keep as they are. Select **Save translations**, then **Publish**. **Preview in** opens your app in that language before you publish (apps without a website; others show what's published).

A text you haven't translated shows Yallapp's translation in Arabic and Turkish, else the default language for your pages and English for the app's own texts. Your translation always wins, also over Yallapp's: in Arabic and Turkish, select **Change Yallapp's** to start from its text. If you change a text Yallapp wrote, such as a tab name, it's yours to translate.

## Placeholders and numbers

Some app texts have **placeholders** in braces, such as **{name}** or **{count}**: the app puts a name or a number there. Select a placeholder under the box to insert it, and keep only the ones shown. Texts with numbers can have a form per number, written as **{count, plural, =1{1 lesson} other{{count} lessons}}**; use the forms your language needs (**one**, **few**, **many**, **other**). A text with a placeholder the app doesn't have can't be saved, so a mistake never reaches your app.

## Work in a spreadsheet

**Export** a language as **CSV**, **JSON** or **XLIFF**, fill in the translation column (or send the file to a translator), and **Import a file** back. Rows are matched by their ID; check the imported texts, then save.

## Right to left

Arabic, Persian, Hebrew, Urdu, Pashto and Uyghur are written right to left: when someone picks one, the whole app turns around, menus, lists, icons and text.

> Texts that come from your website or platform, such as course or product names, show as they are written there. Property listings show as your office wrote them.
`,
  }),
  doc({
    slug: "push-notifications",
    key: "guide-push-notifications",
    section: "Your app",
    title: "Push notifications with Firebase",
    description: "Create a Firebase project, add your apps, connect Apple push notifications and send your first notification.",
    steps: true,
    body: `Push notifications are sent through your own Firebase project, so your customers' devices are registered under your account, not ours. Firebase is free for this use. Set it up once; it takes about 20 minutes.

## Before you start

- A Google account for the Firebase console
- Your Android package name and iOS bundle ID, from the **Store listing** step
- An Apple Developer account, for iPhone notifications

## Create a Firebase project

Open the Firebase console (console.firebase.google.com), choose **Create a project** and give it your brand's name. Google Analytics is optional.

## Add your Android app

In the project, choose **Add app › Android**. Enter your **Android package name** exactly as on the Store listing step, register the app and download **google-services.json**. You can skip the other steps Firebase shows.

## Add your iOS app

Choose **Add app › Apple (iOS)**. Enter your **iOS bundle ID** exactly as on the Store listing step, register the app and download **GoogleService-Info.plist**.

## Connect Apple push notifications

iPhones only receive notifications through Apple, so Firebase needs a key from Apple:

1. In your Apple Developer account, open **Certificates, Identifiers & Profiles › Keys** and add a key with **Apple Push Notifications service (APNs)** turned on. Download the .p8 file (Apple lets you download it once) and note its **Key ID** and your **Team ID**.
2. In Firebase, open **Project settings › Cloud Messaging**, find your iOS app under **Apple app configuration** and upload the key with its Key ID and Team ID.

## Upload the two files to Yallapp

In your dashboard, open **App setup › Publishing** and upload google-services.json and GoogleService-Info.plist under **Push notifications**. We check that each file matches your package name or bundle ID. Notifications work from your next build.

## Create a service account key, to send messages

In Firebase, open **Project settings › Service accounts** and choose **Generate new private key**. A .json file downloads. Keep it private: it lets its holder send notifications to your app.

- **Apps connected to a platform, or without a website**: upload it on the dashboard's **App notifications** page. It's stored encrypted.
- **Your own API**: use it in your own system to send notifications to the push tokens the app registers.
- **WordPress**: in WordPress admin, open **Yallapp** and upload it under **Notifications (Firebase)**. It's stored encrypted on your website.

## Send your first notification

- **Apps connected to a platform, or without a website**: on **App notifications**, write a title and a message and select **Send to everyone**. Everyone gets it in the app's inbox; phones that allow notifications also get a push.
- **WordPress**: choose which events send a notification automatically (a new lesson, an announcement, a confirmed enrollment, an answer to a question), or write one under **Send a manual notification** in the plugin's settings.

---

People choose which notifications they get in the app's settings. If notifications don't reach iPhones, check the APNs key in Firebase's Cloud Messaging settings first.
`,
  }),
  doc({
    slug: "app-users",
    section: "Your app",
    title: "App users and sign-in",
    description: "How people sign in to your app: by phone, by email or both, the WhatsApp number and the email address that send their codes, and the sign-in rules you set.",
    steps: false,
    body: `People sign in to your app with their phone number and a one-time code, with their email address, or either: you choose on the dashboard's **App sign-in** page.

## Phone, email or both

On **App sign-in**, under **How people sign in**, choose:

- **Phone number**: a 6-digit code on WhatsApp. The default.
- **Email address**: with no website or with content in the dashboard, a 6-digit code by email, sent in your app's name. New people sign up with their email address. On WordPress, you choose how email works (see below).
- **Phone number or email address**: the app shows a **Phone / Email** switch.

Apps connected to Shopify, ikas, Ticimax, IdeaSoft or SimplyBook.me sign in by phone: those platforms find each customer's orders and bookings by their phone number. Apps connected to Teachable or Thinkific can also sign in by email: someone who signs in by email sees the courses of their school account with that address, including courses bought on your website.

On WordPress, choose how email sign-in works:

- **With a code by email: anyone can sign up.** People get a 6-digit code by email. Someone without an account on your website gets one, with the details you ask for, when the plugin's **Allow new accounts to sign up from the app** is on. Accounts that can edit your website (staff) never sign in by code: they sign in on the website. Needs version 0.3.5 or later of the Yallapp plugin.
- **With their password: existing accounts only.** The email address and password of their account on your website; WordPress checks the password, and "Forgot your password?" opens your website's reset page. New people sign up by phone or on your website.

Your website gets your choices within a minute when it can be reached, otherwise at its next check (twice a day). **Check now** in the Yallapp plugin gets them at once. They override the plugin's own **Sign-in** settings; until you choose here, those apply.

Your store review number always signs in, also when the app signs in by email only. When it signs in by email only, the app shows no phone field, so also set a store review email address (see below).

If you change where your app's content comes from to Shopify or another connected platform, the app signs in by phone only. The **Website** step warns you first when customers signed up with their email address: they can't sign in after the change.

## The WhatsApp number that sends codes

Codes go out from Yallapp's WhatsApp number, with your app's name. To send them from your own WhatsApp number instead, open a WABEK account at waabek.com, connect your number there, then on **App sign-in** paste your WABEK **API key** and the **Instance ID** of that number, and select **Send a test code**. The key is stored encrypted and never shown again. **Use Yallapp's number again** goes back to ours.

On WordPress, this applies when the plugin's **Sign-in codes are sent by** setting is **Sent by Yallapp (WhatsApp)**.

If your number can't send a code (WABEK doesn't answer, or the number is disconnected), that code goes out from Yallapp's number instead, so your customers still get it. We email you, at most once a day, and **App sign-in** shows the day it happened until you save a new key or a test code goes out.

## Send your app's emails from your own address

Emails to the people using your app, like email sign-in codes, go out from Yallapp's address with your app's name. To send them from your own address, like hello@your-site.com, open **App sign-in**, go to **Your app's email**, choose **My own email server** and pick your email service. The server settings are filled in for you; follow the steps shown for your service:

${MAIL_PRESET_STEPS}

Then type the username and password, the **From name** people see (usually your app's name) and the **From address**, and save. The password is stored encrypted and never shown again; leave it blank later to keep it. Use the mailbox's own address as the From address: many services refuse other addresses, and the page warns you when it differs from the username. A **Reply-to address** is optional.

Select **Send a test email** and check that it arrives (look in the spam folder too). If it doesn't, the page says why in plain words: the username or password was refused, the server couldn't be found or didn't answer, or the secure connection failed.

If your server can't send an email later, that email goes out from Yallapp's address instead, so nobody misses a code. We email you, at most once a day, and **Your app's email** shows the day and the reason until you save the settings again or a test email goes out. Emails to you and your team always come from Yallapp. On WordPress, this is for the codes Yallapp emails for your website; your website's own emails still come from WordPress. With your own API, your API sends its own emails.

## How a phone sign-in works

1. They enter their phone number, with the country code.
2. We send a 6-digit code. It's valid for 5 minutes, a new one can be asked for after a minute, and a code allows a few attempts.
3. They type the code. A new number can create an account with the details you ask for.

How the code is sent depends on where your content comes from:

- **Shopify, ikas, Ticimax, IdeaSoft, Teachable, Thinkific, SimplyBook.me or no website**: we send it **on WhatsApp, through waabek.com**.
- **WordPress**: we send it on WhatsApp too (or Digits does, through your own gateway, if you choose it in the plugin), and people use the same accounts as on your website.
- **Your own API**: your API sends it, from your own system.

## The sign-in rules

For apps without a website, or connected to another platform, the rules are on the dashboard's **App sign-in** page:

- **New customers can sign up in the app**, and whether to ask for their email or city
- **Country code** shown first on the sign-in screen, like 90 for Turkey
- **Devices per customer**: a customer at the limit signs out on another device first; 0 means no limit
- **Support WhatsApp** shown in the app, and your **Terms page**
- **App store review**: a review phone number, a review email address and a fixed review code for Apple and Google (see below)

Changes apply right away, without a new build. On WordPress, the same rules are in the Yallapp plugin's **Sign-in** settings.

## Access for store reviewers

Apple and Google reviewers must be able to sign in, and they can't receive your codes. Set a review phone number and a fixed code, and give both to the stores: under **App access** in Google Play Console, and under **App Review Information** in App Store Connect. Without it, your app may be rejected. When your app signs in by email only, set a review email address too and give the stores that address with the code: the app shows them no phone field. No email or message is sent to either. Add them to **For the store reviewers** on **Publishing** when our team publishes for you.

On WordPress, the same is in the plugin's **Store review access** settings: a test number, a test email address and a fixed code. With email sign-in, reviewers type the test email address and the fixed code as the password. Use an address that isn't one of your staff's accounts.

## Deleting an account

People can delete their account from the app's settings, as Apple and Google require. Their sign-in and devices are removed.
`,
  }),

  // 44 Analytics for app owners
  doc({
    slug: "analytics",
    section: "Your app",
    title: "Analytics",
    description: "How many people install and use your app, what they look at and buy, and exactly what the app sends to count it.",
    steps: false,
    body: `Open **Analytics** in your dashboard to see how people use your app: installs, daily, weekly and monthly active users, sessions, how many come back, the phones and app versions they use, their countries and languages, the screens, courses, products, services and other items they open, how many go on to buy, enroll, book or give, how many open your notifications, and what they search for. Choose the last 7, 30 or 90 days or your own dates; each number is compared with the period before. **Export CSV** downloads the same numbers for a spreadsheet.

## Where the numbers come from

Your app counts them itself and sends them to Yallapp, whatever your content comes from (WordPress, a connected platform, the dashboard or your own API). No other company's analytics tools are in your app, and nothing is used for advertising.

- **Installs** are counted when the app is first opened. Google Play, the App Store and the other stores don't share their download numbers with us, so your store consoles may show more.
- **Active users** are installs that opened the app that day, in the last 7 days (weekly) or the last 30 days (monthly).
- **Sessions** are app opens: a start, or coming back after 30 minutes or more in the background.
- **Retention** is the share of people who first opened the app in your range and came back 1, 7 or 30 days later.
- **Conversions** count views of your courses, products, services, events or campaigns, the next step (added to cart, enrolled, booked, got tickets or chose to give) and the checkout page opening. The payment itself happens on the checkout page; your orders and donations pages have the payments.
- **Notifications**: for each notification you send from the dashboard, how many phones it went to and how many opened the app from it. Notifications your website sends are counted by kind.
- **Searches** show what people searched for, never who. A search shows once it was made at least twice.

Numbers appear a minute or so after someone uses the app. Days run from midnight to midnight in your time zone: the one of your account's country until you pick another under **Time zone** at the top of the page (days already counted keep the zone they were counted in). The app preview in your dashboard isn't counted.

## What the app sends

Every 30 seconds while it's open, and when it goes to the background, the app sends what happened since:

- that it was opened, and whether for the first time;
- the kind of screen opened (Home, a course, the cart…), never its address;
- the courses, products and other items opened, with their name and number, and the actions above with the amount when there is one;
- what was searched for, and the notification a person opened;
- a random install number made by the app, the platform (Android or iOS), the app's and the system's versions, and the app's language.

We work out the country from the connection when the numbers arrive, and never keep the IP address. The app sends no name, phone number, email address, account or advertising ID, and the install number isn't the person's account: it changes when they turn sharing off and on again.

## Turning it off

People can turn off **Share usage statistics** in the app's **Settings**. The app then stops sending and forgets what it hadn't sent yet. It's on by default, with a short note saying what it does.

## How long it's kept

What the app sends is kept for 40 days, then only daily totals remain. Everything is deleted when your app is deleted. Your app's privacy policy should say you use first-party usage statistics: see the store answers in [Publish on Google Play](/docs/google-play) and [Publish on the App Store](/docs/app-store).

---

Analytics comes with every plan. It counts from your first build made after it arrived: build and publish a new version to start.
`,
  }),

  // -------------------------------------------------------------------------
  doc({
    slug: "developer-accounts",
    section: "Publishing",
    title: "Developer accounts",
    description: "Open your Google Play and Apple developer accounts, and get a D-U-N-S number for a company account.",
    steps: true,
    body: `Your apps are published under your own name, so the store accounts are yours. Open them early: checks by Google and Apple can take from a day to a few weeks.

## Before you start

- An email address for each store that you'll keep using
- A payment card for the fees, paid directly to Google and Apple
- For a company: its legal name, address, website and a D-U-N-S number

## Get a D-U-N-S number (companies)

A D-U-N-S number is a free 9-digit ID for companies, issued by Dun & Bradstreet. Apple requires one for organisation accounts, and Google asks for it too. Look up your company on Apple's D-U-N-S lookup page, and request a number there if it has none. It can take a few days to arrive.

## Open a Google Play developer account

Sign up in **Google Play Console** with a Google account, choose a personal or organisation account, pay the one-time registration fee and verify your identity. New personal accounts must run a closed test with testers before publishing to production (see [Publish on Google Play](/docs/google-play)).

## Join the Apple Developer Program

Enroll at developer.apple.com with an Apple Account that has two-factor authentication. Choose **Individual** or **Organization** (with your D-U-N-S number), and pay the yearly fee. Then sign in to **App Store Connect** with the same Apple Account.

## Give us access on Pro and Business

On the Pro and Business plans we upload your builds for you. Add the Google Play service account key and the App Store Connect API key on the **Publishing** step: see [The setup steps](/docs/setup-steps). The keys for Samsung Galaxy Store and Huawei AppGallery go on **Publishing › More Android stores**.

## Samsung, Huawei and Xiaomi

Your Android app can also be on Samsung Galaxy Store, Huawei AppGallery and Xiaomi GetApps, on every plan. Their developer accounts are free. See [Publish on Samsung Galaxy Store](/docs/galaxy-store) and [Publish on Huawei AppGallery](/docs/huawei-appgallery).
`,
  }),
  doc({
    slug: "google-play",
    key: "guide-google-play",
    section: "Publishing",
    title: "Publish on Google Play",
    description: "Use the files from your dashboard to publish your app under your own Google Play developer account.",
    steps: true,
    body: `Use the files from your dashboard to publish your app under your own Google Play developer account. On the Pro and Business plans, we upload each new version for you.

## Before you start

- A Google Play developer account (see [Developer accounts](/docs/developer-accounts))
- Your Android App Bundle (.aab) and signing key from [Builds & downloads](/dashboard/builds)
- Your store assets: icon, feature graphic and screenshots
- A privacy policy page on your website, or anywhere public

## Create the app in Play Console

Open Google Play Console, choose **Create app**, enter your app name and default language, and select **App** and **Free**.

## Fill in the store listing

Add the short and full description, then upload the icon (512 × 512), feature graphic (1024 × 500) and phone screenshots from your store assets.

## Complete the app content section

Add your privacy policy link, content rating, target audience and data safety answers. In data safety, declare that your app collects phone numbers for sign-in, and anything else your app asks for (name, email, city, orders).

Your app also sends usage statistics to Yallapp (see [Analytics](/docs/analytics)). In the data safety form, declare under **App activity**: **App interactions**, **In-app search history** and **Other actions**; under **Device or other IDs**, the random install ID. For each: **Collected**, not shared (Yallapp processes it for you), **processed ephemerally: no**, **optional** (people can turn it off in the app's Settings), and the purpose **Analytics**. Data is encrypted in transit, and people can ask for deletion through you.

> Under **App access**, give reviewers your review phone number and fixed code: from the dashboard's **App sign-in** page, or the plugin's **Store review access** setting on WordPress. Without it, reviewers can’t sign in and the app may be rejected.

## Run a closed test

Create a closed testing release and upload your .aab file. New personal developer accounts must run a closed test with enough testers for the required period before they can publish to production. Check the current requirement in Play Console.

## Release to production

Create a production release with the same .aab, add release notes and send it for review. Keep your signing key safe: every future update must be signed with it.

## Pro and Business: let us upload

In Google Cloud, create a service account for your Play Console's project and a JSON key for it (**IAM › Service accounts › Keys**). In Play Console, invite the service account's email under **Users and permissions** with access to your app's releases. Upload the JSON key on the **Publishing** step. We then upload every new build for you.
`,
  }),
  doc({
    slug: "app-store",
    key: "guide-app-store",
    section: "Publishing",
    title: "Publish on the App Store",
    description: "Publish your iOS app under your own Apple Developer account.",
    steps: true,
    body: `Publish your iOS app under your own Apple Developer account. The iOS app comes with the Growth, Pro and Business plans; on Pro and Business we upload each build to TestFlight for you.

## Before you start

- An Apple Developer Program membership (see [Developer accounts](/docs/developer-accounts))
- Your App Store Connect API key on the **Publishing** step: we need it to sign your iOS build
- Your iOS build (.ipa) from [Builds & downloads](/dashboard/builds), or a TestFlight upload on Pro and Business
- Your store assets and iPhone screenshots, and a privacy policy page

## Create the app in App Store Connect

In App Store Connect, open **Apps**, choose **+ › New App**, select iOS, and enter your app name, primary language, bundle ID and an SKU. The bundle ID must match the one on your Store listing step.

## Upload the build

When you publish yourself, upload the .ipa file with Apple’s **Transporter** app on a Mac. On Pro and Business we upload it to TestFlight for you. The build appears in App Store Connect after Apple processes it.

## Fill in the App Store listing

Add the subtitle, description, keywords, support URL and iPhone screenshots from your store assets.

## Complete App Privacy and review information

Answer the App Privacy questions (your app collects phone numbers for sign-in, plus anything else you ask for) and add your privacy policy link.

Your app also sends usage statistics to Yallapp (see [Analytics](/docs/analytics)). In App Privacy, add **Usage Data › Product Interaction** and **Search History**, and **Identifiers › Device ID** for the random install ID. For each choose the purpose **Analytics**, answer **No** to "linked to the user's identity" and **No** to "used for tracking". The app doesn't ask for tracking permission and needs no App Tracking Transparency prompt: it uses no advertising ID and shares nothing with data brokers.

> Under **App Review Information**, add your review phone number and fixed code, so reviewers can sign in: from the dashboard's **App sign-in** page, or the plugin's **Store review access** setting on WordPress.

## Submit for review

Choose the build, select **Add for Review** and submit. Your iOS app shows no purchase buttons for paid courses or digital products, as Apple's rules require, so don't mention prices or buying them in the iOS description.
`,
  }),
  // 35 Samsung Galaxy Store
  doc({
    slug: "galaxy-store",
    section: "Publishing",
    title: "Publish on Samsung Galaxy Store",
    description: "Put your Android app on Galaxy Store, the app store on every Samsung phone, under your own seller account.",
    steps: true,
    body: `Put your Android app on Galaxy Store, the app store on every Samsung Galaxy phone and tablet, under your own seller account. It's the same Android app as on Google Play. You upload the first version yourself; on the Pro and Business plans we upload every version after that.

## Before you start

- A Samsung account, and a seller account in Galaxy Store Seller Portal
- Your Android app (.apk) from [Builds & downloads](/dashboard/builds)
- Your store assets: icon, screenshots and the listing texts
- A privacy policy page on your website, or anywhere public

## Create your seller account

Sign in to Galaxy Store Seller Portal (seller.samsungapps.com) with your Samsung account and complete your profile. Samsung charges no registration fee. A company applies for commercial seller status in Seller Portal with its company documents; Samsung checks them before you can sell paid apps.

## Add your app and upload the first version

In Seller Portal, choose **Add New Application**, select **Android**, and enter your app's default language and name. Under **Binary**, upload the .apk file from Builds & downloads. Samsung doesn't let any tool register a new app, so this first upload is always done by hand.

> Upload the .apk, not the App Bundle. The .apk is signed with your app's upload key, the same key every later version uses.

## Fill in the listing and submit

Add the description, icon (512 × 512) and screenshots from your store assets, your privacy policy link and the age rating. Under **Country/Region**, choose where to sell it. Then select **Submit**. Samsung reviews the app, usually within a few days.

> Give the reviewers your review phone number and fixed code in the notes for the review: from the dashboard's **App sign-in** page, or the plugin's **Store review access** setting on WordPress.

## Pro and Business: let us upload every update

Once your app is on sale, open **Assistance › API Service** in Seller Portal and choose **Create Service Account**, with the **Publishing** scope. Copy the service account ID and its private key. Then open **Publishing › More Android stores** in your dashboard and enter them with your app's **content ID** (the number Seller Portal shows for your app). From then on, every build you start is uploaded to Galaxy Store and sent for review.

## When our team publishes for you

With **Publish it for me**, tick Samsung Galaxy Store on the **Publishing** page. Then, in Seller Portal, invite our team email as a manager for your applications (from your account's manager accounts). Samsung sends us the invitation and we do the rest. You never share your password.
`,
  }),
  // 36 Huawei AppGallery
  doc({
    slug: "huawei-appgallery",
    section: "Publishing",
    title: "Publish on Huawei AppGallery",
    description: "Put your Android app on AppGallery for Huawei phones, with push notifications through Huawei Push Kit.",
    steps: true,
    body: `Huawei phones sold in recent years come without Google Play, so their owners install apps from AppGallery. Publish your Android app there under your own developer account, and add Huawei Push Kit so those phones get your notifications too. You submit the first version yourself; on the Pro and Business plans we upload every version after that.

## Before you start

- A HUAWEI ID, and a verified developer account on HUAWEI Developers
- Your Android app (.apk) from [Builds & downloads](/dashboard/builds)
- Your store assets and a privacy policy page

## Create your developer account

Register on HUAWEI Developers with your HUAWEI ID and complete the identity verification, as a company or as an individual. Huawei charges no registration fee; the check can take a few days.

## Add your app in AppGallery Connect

In AppGallery Connect, open **My projects**, create a project, and add an Android app with your app's package name (from your Store listing step). The package name can't be changed later.

## Turn on push for Huawei phones

In the project, open **Grow › Push Kit** and turn it on. Then open **Project settings › App information**: download **agconnect-services.json** and copy the **App secret**. In your dashboard, open **Publishing › More Android stores** and add both under Huawei AppGallery. Your next build includes Huawei push: on Huawei phones without Google Play, the app registers with Huawei Push Kit, and your notifications reach them like any other phone.

> Phones with Google Play keep using Firebase, as before. Huawei push only adds the phones that can't.

## Upload the first version and submit

In AppGallery Connect, open **My apps**, choose your app and **Version information**. Upload the .apk file from Builds & downloads, fill in the description, icon, screenshots, privacy policy link and age rating, and select **Submit**. Huawei reviews the app, usually within a few days.

> Add your review phone number and fixed code in the notes for the review, so the reviewers can sign in.

## Pro and Business: let us upload every update

In AppGallery Connect, open **Users and permissions › API key › Connect API** and create an API client with the **App administrator** role. Copy its client ID and key into **Publishing › More Android stores**. From then on, every build you start is uploaded to AppGallery and submitted for review.

## When our team publishes for you

With **Publish it for me**, tick Huawei AppGallery on the **Publishing** page. Then, in AppGallery Connect, open **Users and permissions** and add our team email as a team member with the **App administrator** and **Operations** roles. Huawei sends us the invitation; you never share your password.
`,
  }),
  // 42 Xiaomi GetApps
  doc({
    slug: "xiaomi-getapps",
    section: "Publishing",
    title: "Publish on Xiaomi GetApps",
    description: "Put your Android app on GetApps, the app store on Xiaomi, Redmi and POCO phones, under your own developer account.",
    steps: true,
    body: `Xiaomi, Redmi and POCO phones come with GetApps, Xiaomi's own app store. Publish your Android app there under your own developer account: it's the same Android app as on Google Play. You submit the first version yourself; on the Pro and Business plans we upload every version after that.

## Before you start

- A Xiaomi account, and a developer account on the Xiaomi developer platform
- Your Android app (.apk) from [Builds & downloads](/dashboard/builds)
- Your store assets: icon (512 × 512), screenshots and the listing texts
- A privacy policy page on your website, or anywhere public

## Create your developer account

Register as a developer on the Xiaomi developer platform (dev.mi.com) with your Xiaomi account, as a company or as an individual, and complete Xiaomi's identity check. Xiaomi also has an international developer site for GetApps (global.developer.mi.com).

## Add your app and submit the first version

Create your app with your app's package name (from your Store listing step) and upload the .apk file from Builds & downloads. Xiaomi may ask you to show that the app is yours: follow the steps it gives, and contact us if it asks for a file signed with your app's key.

> Upload the .apk, not the App Bundle. The .apk is signed with your app's upload key, the same key every later version uses.

## Fill in the listing and submit

Add the description, icon, screenshots, your privacy policy link and the age rating, then submit. Xiaomi reviews the app, usually within a few working days.

> Give the reviewers your review phone number and fixed code in the notes for the review: from the dashboard's **App sign-in** page, or the plugin's **Store review access** setting on WordPress.

## Pro and Business: let us upload every update

Once your app is on GetApps, open the automatic publishing API page from the developer platform's app management. Copy the **private key** it shows and download Xiaomi's **public certificate**. Then open **Publishing › More Android stores** in your dashboard and enter them with the email you sign in with. You can also write what's new; Xiaomi shows it with the update. From then on, every build you start is uploaded to Xiaomi GetApps and sent for review.

> Xiaomi sends each upload straight to review, with your app's icon. Resetting the private key in Xiaomi's console stops the old one working: enter the new one in your dashboard.

If your developer account has no automatic publishing page, uploads stay by hand: download the .apk from Builds & downloads and submit it as a new version.

## When our team publishes for you

With **Publish it for me**, tick Xiaomi GetApps on the **Publishing** page. Then add our team email as a member of your Xiaomi developer account who may manage your apps. If you can't find where to add members, contact us and we'll find the way with you. You never share your password.
`,
  }),
  doc({
    slug: "builds",
    section: "Publishing",
    title: "Builds and downloads",
    description: "Follow your builds and download your APK, App Bundle, iOS build, signing key and store assets.",
    steps: false,
    body: `The **Builds & downloads** page in your dashboard lists every build of your app, with its version and status, and the files to download.

## When builds start

Your first build starts when you finish the setup steps. After that, start a new one with **Start new build** whenever you need a new version (see [Release an update](/docs/updates)). The page shows each step while a build runs.

## Your files

- **APK**: install it directly on an Android phone to test.
- **App Bundle (.aab)**: the file you upload to Google Play.
- **iOS build (.ipa)**: the file you upload to App Store Connect. On Pro and Business it's uploaded to TestFlight for you. It comes with the Growth plan and up, and needs the App Store Connect API key on the Publishing step.
- **Android upload key**: the keystore and its passwords. Every future update on Google Play needs this same key: keep a copy somewhere safe.
- **Store assets**: store icons, the feature graphic, your screenshots and your listing text.
- **WordPress plugin** (.zip), on WordPress sites.

Download links are made fresh each time the page opens and expire after a few minutes. Reload the page for new ones.

## Your signing key is kept safe

Your Android signing key is created with your first build, stored encrypted, and never replaced, so you can always update your app on Google Play.

## Test before you publish

Install the APK on an Android phone (allow installs from your browser or files app when the phone asks). On Pro and Business, test the iOS build with TestFlight.
`,
  }),
  doc({
    slug: "updates",
    key: "guide-release-update",
    section: "Publishing",
    title: "Release an update",
    description: "What changes without a new version, and how to build and publish one when you need it.",
    steps: true,
    body: `Most changes don’t need a new app version: content, prices, pages, look, languages and sign-in settings come from your website or your dashboard and show in the app the next time it opens. Build a new version when you change your app name, icon or logo, or when we release new app features.

## Start a new build

Open [Builds & downloads](/dashboard/builds), choose **Start new build** and enter the new app version, for example 1.0.1. Each build gets a higher version code automatically.

## Publish the new version

When you publish yourself, download the new .aab (and .ipa), then create a new release in Google Play Console (and a new version in App Store Connect). On Pro and Business we upload the new version for you, and you can follow each step on the Builds & downloads page. From Growth up, a new build starts by itself when you change your app's settings.

> Always use the same Android signing key. Google Play rejects updates signed with a different key.

## Ask people to update

To make people update to the new version, set a minimum app version: in the Yallapp plugin's **Updates & maintenance** settings on WordPress. The app then asks older versions to update.
`,
  }),
  doc({
    slug: "store-rejections",
    key: "guide-store-rejection",
    section: "Publishing",
    title: "If the store rejects your app",
    description: "The most common reasons Google and Apple reject an app, and how to fix each one.",
    steps: true,
    body: `Apple and Google explain each rejection in their message. These are the most common reasons, and how to fix them.

## Reviewers couldn't sign in

Set a review phone number and fixed code (on the dashboard's **App sign-in** page, or **Store review access** in the WordPress plugin) and give both to the reviewers: under **App access** in Google Play Console, and under **App Review Information** in App Store Connect.

## Missing privacy information

Add a privacy policy page, link it in both stores and on the Store listing step, and complete the data safety (Google) and App Privacy (Apple) answers.

## Not enough content

Make sure the review account can see real content: courses with lessons, products, services or listings. An empty app can be rejected for limited functionality.

## Purchases on iOS

Your iOS app doesn't sell paid courses or digital products. Remove prices and links to buy them from your App Store description and screenshots.

## Account deletion

Apple requires that people can delete their account in the app. Yallapp apps have it in the account settings; point the reviewer to it if they ask.

## Content that looks like a website

Apple can reject apps that look like a web page in a frame. Build your home page with blocks in [Pages and look](/docs/pages-and-look), and use native lists of your content rather than a single web page.

---

Still stuck? Send us the rejection message on WhatsApp and we’ll help you reply.
`,
  }),

  // -------------------------------------------------------------------------
  doc({
    slug: "store-orders",
    section: "Selling and bookings",
    title: "Products, orders and shipping",
    description: "Sell without a website: add products and categories, set shipping, and handle orders in the dashboard.",
    steps: false,
    body: `Store apps without a website sell the products you add on the dashboard's **Products** page. Changes show in the app right away.

## Products

Select **New product** and fill in:

- Name, description and photos
- **Price** and an optional **Sale price**, shown with the regular price crossed out
- **Stock**: leave it empty if you don't count stock; at 0 the product shows as out of stock
- **Categories**, and an optional product code
- **Digital product**: nothing to ship, like a gift card. No shipping is charged, and the iPhone app doesn't sell it (Apple's rules)
- **Featured**: shown first on the app's home screen
- **Show in the app**: turn it off to hide a product without deleting it

Every product also has its own web page to share.

## Categories

Group your products, like "Bouquets" or "Gifts". Customers browse them in the app.

## Shipping

Set a **Shipping fee** for orders with physical products (leave it empty for free shipping) and, optionally, **Free shipping from** an order amount.

## Payments

Customers pay by card on a secure page of your provider (iyzico, Kashier or Fawaterk). Add your own keys, or sell through Yallapp's account: see [Card payments](/docs/card-payments).

## Orders

Paid orders appear on the **Orders** page, and you get an email for each one. Mark an order **completed** when it's delivered, or **cancelled** when needed, and refund it, in full or in part, with **Refund** under it (see [Card payments](/docs/card-payments)). Customers see their orders, their status and what was refunded in the app.
`,
  }),
  doc({
    slug: "restaurants",
    section: "Selling and bookings",
    title: "Restaurants and cafés: menu, pickup, delivery and the kitchen",
    description: "Run a Restaurant & café app without a website: dishes with options, opening hours, pickup and delivery, and the Kitchen page.",
    steps: false,
    body: `A Restaurant & café app is a store for food, in the words your customers expect: your dashboard shows **Menu** and **Kitchen**, and the app shows your **Menu**. Choose **Restaurant & café** on the first page of **App setup**, then **I don't have a website** on the Website step.

## Dishes and categories

On the **Menu** page, select **Add dish** and fill in its name, description, price and photos, as for any product (see [Products, orders and shipping](/docs/store-orders)). Categories, like *Breakfast*, *Mains* and *Drinks*, become the tabs at the top of your menu in the app.

## Options

Under **Options**, select **Add an option group** for each choice a customer makes, for example:

- **Size**: Small, or Large for 20 more. Customers choose **at least 1** and **at most 1**.
- **Extras**: Cheese for 15 more, Bacon for 25 more. Customers choose **at least 0** (optional) and **at most 3**.

Each option can cost more than the dish, or nothing extra. The app asks for the groups that must be chosen and shows the price as it changes. Prices are always worked out by our server, never by the phone, so the price you set is the price paid.

## Pickup and delivery

Under **Pickup and delivery**:

- **Pickup**, with the address where customers collect their order, and **Delivery**, with a **delivery fee**, a **minimum order** for delivery and the **districts or postcodes** you deliver to (one per line; customers pick one). A short note like *Within 3 km of Moda* tells customers where you deliver.
- **Opening hours** for each weekday and your **time zone**. Closed days are left unticked.
- **Preparation time**: how long an order takes. Customers can't choose a time sooner than this.
- **As soon as possible** orders while you're open, and **orders for later**, every 15 minutes for example, up to a few days ahead.

When you're closed, the app says **Closed now** and when you open. Orders as soon as possible wait until you open; orders for later still work when you allow them.

## The Kitchen page

Paid orders appear on **Kitchen** with what was chosen, pickup or delivery, the time and the address. You also get an email for each one. Move each order on with one button: **Preparing**, **Ready**, **Out for delivery** (deliveries only) and **Completed**, or **Cancel order**. An order only moves forward. Each step reaches the customer as a notification, and their order in the app shows where it is. The page refreshes by itself every 30 seconds.

> Cancelled orders aren't refunded automatically: refund them with **Refund** under the order in **Finished orders**.

## Payments

Customers sign in, then pay by card on a secure page of your provider (iyzico, Kashier or Fawaterk), on Android and iPhone: food is a physical product, so Apple's rules allow it. Add your own keys, or sell through Yallapp's account: see [Card payments](/docs/card-payments).

## With WooCommerce

Restaurants that sell with WooCommerce get the menu wording, and their product variations work as options. In the app, an order's step follows its WooCommerce status: processing is **Preparing**, completed and cancelled are themselves. Option groups with extra prices, opening hours, pickup and delivery are in the Yallapp dashboard only for now.
`,
  }),
  doc({
    slug: "card-payments",
    section: "Selling and bookings",
    title: "Card payments with iyzico, Kashier or Fawaterk",
    description: "Take card payments in apps without a website, with your own iyzico, Kashier or Fawaterk account or through Yallapp's.",
    steps: false,
    body: `Apps without a website take card payments through **iyzico** (Türkiye), **Kashier** or **Fawaterk** (Egypt): shops for their orders, restaurants and cafés, event organisers for tickets, gyms for memberships, academies for paid courses, and charities for donations. Customers enter their card on the provider's secure page; Yallapp never sees it. An order is marked paid only after the provider confirms the payment for that exact amount and currency: we ask the provider ourselves, so a payment can't be faked by opening a link.

## Use your own payment account

On the **Products** page (or the page where you set your prices: **Courses**, **Menu**, **Events**, **Membership plans**, **Campaigns**), under **Card payments**, open **Use your own payment account**, choose your provider and paste your keys. Payments go straight into your account.

- **iyzico**: your **API key** and **Secret key**, from the iyzico merchant panel under Settings. Prices in TRY, USD or EUR.
- **Kashier**: your **Merchant ID** (MID-…), **Payment API key** and **Secret key**, from the Kashier dashboard under Integrate now. Prices in EGP, USD or EUR.
- **Fawaterk**: your **API key**, from the Fawaterk dashboard under Integrations. Prices in EGP, USD, SAR, AED or EUR.

Set your prices in a currency your provider takes: the **Card payments** box warns you when they don't match.

> To try it first, turn on the test switch (**Sandbox keys**, **Test mode keys** or **Staging key**) and paste the provider's test keys, then pay with its test cards. Turn it off when you paste your live keys: test and live keys are different.

## No payment account? Sell through Yallapp

Choose **No payment account? Sell through Yallapp** and say who gets paid. Customers then pay into Yallapp's account.

- Each order's price goes to you minus Yallapp's commission; shipping goes to you in full.
- Your share is released when you mark the order **completed**, or when our team releases it.
- When Yallapp's account is with iyzico, you give the details iyzico needs (your legal name, ID or tax details, address and a Turkish IBAN in the payee's name), iyzico registers you and pays your share itself.
- When Yallapp's account is with Kashier or Fawaterk, you give your name, contact details and your IBAN, and Yallapp transfers your share to it. Your IBAN is kept encrypted.

## Refunds

Refund a paid order, ticket, course or donation with **Refund** under it on the **Orders** or **Donations** page: all of it or part of it, with a reason.

- **iyzico** and **Kashier**: Yallapp makes the refund through your provider with your keys. iyzico cancels a payment made the same day (nothing shows on the customer's statement) and refunds it otherwise, item by item. Your Kashier secret key needs the refund permission.
- **Fawaterk**: make the refund in Fawaterk's panel, then record it with **Refund** (and Fawaterk's reference, if you like).
- What follows: the order or donation says **Refunded** (or how much was refunded), the customer gets an email and sees it in the app. Refunding all of an order takes back what it paid for: tickets are cancelled and their places go back on sale, a course is no longer open to the student, a membership ends; with a refund in part you tick what to take back. A refunded donation no longer counts in the campaign's total.
- Sold through Yallapp: the refund comes out of Yallapp's account and Yallapp gives its commission back in proportion. If your share was already transferred (Kashier or Fawaterk), Yallapp takes your share of the refund from your next transfer. A Fawaterk payment in Yallapp's account is refunded by our team: message us on WhatsApp.

## Paid courses

Academy apps without a website sell paid courses the same way, on Android only: the student pays on the payment page and is enrolled when the payment is confirmed. The iPhone app shows no purchase buttons for paid courses, as Apple's rules require.

## Donations

Charity & donations apps take donations with their own iyzico, Kashier or Fawaterk account only: selling through Yallapp isn't offered for donations, and Yallapp takes no commission on them. Add your keys on the **Campaigns** page. See [Charity and donation apps](/docs/donations).
`,
  }),
  doc({
    slug: "bookings",
    section: "Selling and bookings",
    title: "Services, team and appointments",
    description: "Run a Bookings app without a website: services, your team's hours, booking rules and appointments.",
    steps: false,
    body: `Bookings apps without a website get their services, team and rules from the dashboard's **Services & team** page. Customers book in the app, and you see their appointments on the **Appointments** page.

## Services and categories

Select **Add a service** and give it a name, a duration in minutes, a price and a colour, and put it in a category. The price is paid at the appointment; leave it empty for a free service. Turn off **Customers can book it** to hide a service without deleting it.

## Your team

Select **Add a team member** for each person who takes appointments, with their role, the **services they provide**, their **working hours** for each weekday and their days off (one date per line, like 2026-12-31). Free times are each person's hours minus their appointments, so two bookings never overlap.

## Booking rules

- Your **time zone** and **currency**
- **Times start every**: how often a free time starts, for example every 30 minutes
- **Book at least** so many hours ahead, and **book up to** so many days ahead
- **Cancel up to** so many hours before; leave it empty if customers can't cancel in the app
- **Customers can leave a note**
- **Approve new appointments at once**, or approve each one yourself

## Appointments

Each new booking appears on **Appointments** and you get an email. **Approve** or **reject** bookings that need approval, **cancel** one, and mark it **done** or **no-show** afterwards. Customers see the status in the app.

> Payment happens at your business. The app never takes payment for an appointment.
`,
  }),
  doc({
    slug: "clinics",
    section: "Selling and bookings",
    title: "Clinics: doctors, visits and the intake form",
    description: "Run a Clinic app without a website: your doctors' profiles, the intake form patients fill in when they book, and their visits.",
    steps: false,
    body: `A Clinic app works like a Bookings app, in the words your patients expect: your dashboard shows **Doctors & services** and **Visits**, and the app talks about doctors and visits. Choose **Clinic** on the first page of **App setup**, then **I don't have a website** on the Website step.

Services, working hours, days off and booking rules work as described in [Services, team and appointments](/docs/bookings).

## Your doctors

Select **Add a doctor** for each doctor or therapist who sees patients. Besides their role, services and working hours, you can add:

- **Specialties**, separated by commas, for example *Orthodontics, Children's dentistry*
- **Languages** they speak with patients
- **About them**: a few lines shown on their profile in the app

## The intake form

Under **Intake form**, select **Add a question** for each thing you'd like to know before a visit. A question's answer can be:

- **Short answer**: up to 200 characters
- **Long answer**: up to 2,000 characters
- **Date**, for example a date of birth
- **One of a list**: write the options one per line

Turn on **Must be answered** for questions patients can't skip. Use **Move up** to change the order, and **Delete question** to remove one; answers already given keep the question as it was asked. Patients answer in the app when they book a visit, and see their answers with the visit.

## Visits

Each new visit appears on **Visits** with the patient's name and how to reach them. Open **Intake answers** to read their answers. You get an email for each new visit; it says the answers are on your dashboard, but never includes them.

## Privacy

Intake answers are visible only to the patient, in their visits in the app, and to your clinic, on your dashboard. They're never put in emails, push notifications or text messages. They're kept with the visit by Yallapp, on servers hosted by webek.org. Ask only what you need before a visit.

## With a WordPress booking plugin

Clinics that book through Amelia, BookingPress or LatePoint get the doctor, patient and visit wording, but no intake form in the app for now: patients book the way they do in a Bookings app.

> Payment happens at your clinic. The app never takes payment for a visit.
`,
  }),
  doc({
    slug: "fitness",
    section: "Selling and bookings",
    title: "Gyms and studios: timetable, classes and memberships",
    description: "Run a Gym & fitness app without a website: your weekly classes, spots in each class, membership plans and your members.",
    steps: false,
    body: `A Gym & fitness app is a Bookings app with group classes and memberships. Choose **Gym & fitness** on the first page of **App setup**, then **I don't have a website** on the Website step. Your dashboard's menu then shows **Classes & coaches**, **Timetable**, **Membership plans**, **Members**, **Personal sessions** and **Orders**.

## Classes and coaches

On **Classes & coaches**, add each class you run (for example *Yoga flow*, 60 minutes) and each coach. A class that is only on the timetable, and never booked one to one, has **Customers can book it** turned off. Services that customers do book one to one, like personal training, work as described in [Services, team and appointments](/docs/bookings): each coach's working hours decide the free times, and a coach is never free for a personal session while teaching a class.

## The timetable

On **Timetable**, select **Add a class to the timetable** for each weekly class: the class, the coach, the day, when it starts, how long it is and how many **Spots** it has. The app shows the classes of the next 8 weeks, and new weeks are added every day.

Changing an entry changes its coming classes; a class someone has already booked keeps its time. Taking an entry off the timetable removes its coming classes nobody has booked.

Under **Coming 7 days**, open **Who's coming** to see who booked each class. **Cancel class** calls one off: everyone who booked it gets a notification in the app, and their spot and any class credit it used come back.

## Booking a spot

Members pick a day, see each class with its coach and the spots left, and book a spot in a tap. A spot is booked only while one is left, even when many members book at the same moment. Members can give their spot back up to the time set under **Cancel up to (hours before)** in your booking rules on **Classes & coaches**.

## Membership plans

On **Membership plans**, add each plan with its price and how long it lasts: **Monthly**, **Every 3 months**, **Yearly**, or a **Class pack** with no end date. Fill in **Classes included** for a plan with a number of classes, or leave it empty for unlimited classes (a class pack always has a number). Turn off **On sale in the app** to stop selling a plan; memberships already bought keep running.

Turn on **Classes need a membership** so that only members can book a class. Each booking then uses one class of a plan with classes, and cancelling in time gives it back. Off, anyone signed in can book a class and pays at your place.

Members buy a plan in the app and pay by card on your payment page; the membership starts at once. Set up card payments at the bottom of **Membership plans**: see [Card payments](/docs/card-payments). Paid memberships also show on **Orders**.

## Members

**Members** lists who has which membership, when it ends and how many classes are left. Use **Add classes** to add classes to a membership (or a negative number to take some away), **End membership** to stop one, and **Add a membership** for someone who paid at your desk, by the mobile number or email address they sign in with.

## iPhone and the App Store

A membership is for classes at your place, used in person, so Apple allows paying for it outside the app (App Store Review Guideline 3.1.3(e)). The iPhone app opens the same payment page as Android. When you publish, add this to **For the store reviewers** on **Publishing**: the page suggests the words.
`,
  }),
  doc({
    slug: "media",
    section: "Your content",
    title: "Media and storage",
    description: "Upload your videos, pictures and PDFs to Yallapp, use them in lessons and pages, and add storage when you need it.",
    steps: false,
    body: `The dashboard's **Media** page keeps your app's videos, pictures and PDFs on Yallapp's servers. A lesson video from Media plays in your app's own player, with your watermark and without anything showing where it's hosted, and only for the people who may watch the lesson.

## Upload

Drop files on **Media**, or select **Choose files**. You can upload:

- **Videos**: MP4, MOV or WebM, up to 5 GB each. MP4 (H.264) plays on every phone; record or export in it when you can.
- **Pictures**: JPEG, PNG, WebP or GIF, up to 20 MB each.
- **PDFs**: up to 200 MB each.

Big videos upload in parts. If the connection drops, the upload tries again by itself; if you close the page, choose the same file again and it carries on from where it stopped. Uploads not finished within two days are cancelled and their space comes back.

## Use your files

- **In a lesson** (courses without a website): open the course, then **Choose from Media** next to **Video address**.
- **In a WordPress lesson** (Tutor LMS, LearnPress and the others): select **Copy link** on Media and paste the link as the lesson's video address (an external or embedded video), or in the **Yallapp video** box the Yallapp plugin adds to every lesson. The app plays it in its own player; the plugin checks that the student may open the lesson first. On your website, the shortcode \`[yallapp_video link="…"]\` shows the video to the people who can see the lesson.
- **In pages, products and listings**: **Choose from Media** next to an image or video address. A video you put on a page plays for everyone who opens the app.

A picture's link works for anyone. A video's or PDF's link plays only in lessons, unless you select **Share the link**. Each file can be renamed; deleting it frees its space at once, and lessons that used it lose their video.

Downloads for offline viewing work with videos from Media when your plan has offline mode.

## Storage

Each plan includes storage: **2 GB** on Starter, **20 GB** on Growth, **100 GB** on Pro and **500 GB** on Business. The top of **Media** shows how much your files take. A file counts as soon as its upload starts.

## More storage

Select **Buy more storage** on Media and choose a pack, such as **+25 GB** or **+100 GB**. You pay by card a month's price for each month left in your plan's period, and the pack runs until the plan's period ends. When you renew your plan by card, the payment page offers to renew your packs with it. Paying another way? Message us on WhatsApp and we add the pack.

If a pack ends while your files take more than your storage, nothing is deleted and everything keeps playing, but new uploads wait until you delete files or add storage. We tell you by email and on your dashboard.
`,
  }),
  doc({
    slug: "courses",
    section: "Selling and bookings",
    title: "Courses without a website",
    description: "Run an Academy app without a website: courses, sections, lessons, free and paid courses, and students.",
    steps: false,
    body: `Academy apps without a website get their courses from the dashboard's **Courses** page. Changes show in the app right away.

## Courses

Select **Add course** and give it a title, a description, a cover image (PNG or JPEG, up to 2 MB, ideally 1280 × 720), a price (empty for a free course), an instructor, a level and categories. Turn off **Students can see it** while you're still working on it.

## Sections and lessons

Open a course to add sections, and lessons inside them. A lesson has a **video address** (a video from your [Media library](/docs/media), YouTube, Vimeo or a video file's https address), **text** shown under the video or as the whole lesson, and its length in minutes. Turn on **Free preview for everyone** to let anyone open a lesson before enrolling.

## Free and paid courses

- **Free courses**: students enroll from the app on Android and iOS.
- **Paid courses**: bought on Android through the card payment page (see [Card payments](/docs/card-payments)). The iPhone app shows no purchase buttons, as Apple's rules require; students who bought elsewhere learn on iPhone too.

Paid orders appear on the **Orders** page.

## Adding a student yourself

Sold a course another way? Open the course and use **Add a student by phone** with the number they sign in with. They must have signed in to the app once.

## Progress

Students' progress is saved as they complete lessons, and they continue where they stopped on any device.

> Quizzes, certificates, the wishlist, reviews and questions are available with a WordPress LMS, not with courses managed in Yallapp.
`,
  }),
  doc({
    slug: "real-estate",
    section: "Selling and bookings",
    title: "Listings and inquiries",
    description: "Run a Real estate app: add properties, set up your office and answer messages.",
    steps: false,
    body: `Real estate apps show the properties you add on the dashboard's **Listings** page. People search them in the app, save favorites and message your office.

## Your office

Set your **office name**, **phone**, **WhatsApp** and **office email**, your **default currency** and **area unit**, and whether **people can message the office in the app**. With messages off, the app shows only your phone and WhatsApp.

## Listings

Select **New listing** and fill in:

- **Basics**: a title, the **purpose** (for sale or for rent, with rent per month or per year), the **property type**, a description and your own reference
- **Price**, and whether it's **negotiable**
- **Location**: city, district, address, and the latitude and longitude for the map
- **Details**: area, bedrooms, bathrooms, floor, furnished, year built and features
- **Photos** in the order you choose, and an optional video (a YouTube or Vimeo link, or an MP4 file)

Save it as a **draft** while you work, **publish** it to show it in the app, mark it **featured** to show it first, and **archive** it when it's sold or rented. Only published listings show in the app.

## Search in the app

People filter by purpose, type, price, rooms, area and place, sort the results, and open a listing with its photos, features, map and similar listings.

## Inquiries

When someone messages you about a listing, it appears on the **Inquiries** page and you get an email. Your reply lands in their app's notifications inbox and is pushed to their phone.
`,
  }),

  doc({
    slug: "news",
    section: "Your content",
    title: "News and blog apps",
    description: "Run a News & blog app from your WordPress posts, your site's RSS feed or articles you write in the dashboard, and send breaking news.",
    steps: false,
    body: `News & blog apps show your articles: the top stories, the latest ones and a row per section on the home screen, every article in its own screen, search, and a **Saved** tab where readers keep articles to read later on their phone. Readers can share any article. Reading is free for everyone: there's no paid content in the app.

## From your WordPress site

Install the Yallapp plugin (see [Install the WordPress plugin](/docs/wordpress-plugin)). The app shows your **published posts** with their featured image, categories and author. Private and password-protected posts never show. Sticky posts are the top stories. Articles look like they do on your site: pictures, YouTube and Vimeo videos and embeds are sized for the phone.

To tell readers about new posts, turn on **Notify app users about new posts** in the plugin's settings (**Yallapp › Settings › Notifications**). Each new post is then pushed to people signed in to the app, unless you tick **Don't notify app users about this post** in the post's **In the app** box. Push needs your Firebase project (see [Push notifications with Firebase](/docs/push-notifications)).

## From your site's RSS feed

Any website with an RSS or Atom feed works: WordPress (at /feed), Ghost, Blogger, Substack, Medium and most news systems. Choose **My site's RSS feed** on the Website step and paste your feed's address; we read it to check it before saving. New articles show in the app a few minutes after they're in your feed. The feed must be on https, and its address must be the final one (we don't follow redirects).

Feeds can't tell us when an article is new, so breaking news isn't sent automatically. Send an alert yourself from **App notifications** when you need to.

## Articles written in Yallapp

Choose **I don't have a website** on the Website step, then write on the **Articles** page:

- a **title**, an optional **summary** (made from the article when you leave it empty) and the **author** shown in the app
- the **article** itself: paragraphs, headings, lists, quotes, links and pictures from https addresses; YouTube and Vimeo videos show as players
- a **picture** (PNG or JPEG, up to 5 MB) and its **sections**

Save a **draft** while you work, **publish** it to show it in the app, and **unpublish** it to take it out again. Mark the important ones as **top stories**. When you publish, tick **Send as breaking news** to push the article to your readers' phones; it also lands in their notifications inbox and opens the article.

On the same page you set your **sections** and whether articles show their **author** and **date**.

## Your pages

The home page starts with a search box, the top stories, the sections and the latest articles. Change it on **Pages & look**: list blocks can show the latest articles, a section's, the top stories or articles you pick.
`,
  }),

  doc({
    slug: "events",
    section: "Your content",
    title: "Events and tickets",
    description: "Run an Events & tickets app: publish events, give free tickets or sell paid ones, and check QR codes at the door.",
    steps: false,
    body: `Events & tickets apps show your programme: upcoming events in a list and on a calendar, filters by category, each event with its pictures, date and time, venue or online link, and its tickets. People get free tickets in a tap or buy paid ones, and keep every ticket with its QR code under **My tickets**, also without a connection.

Choose **Events & tickets** on **App type**, then **Events managed in Yallapp** on the Website step. Your events are managed here in the dashboard.

## Your events

On the **Events** page, add an event:

- a **title**, a **category** (like Concerts, Film or Workshops) and a **description**: paragraphs, headings, lists, links and pictures from https addresses; YouTube and Vimeo videos show as players
- up to six **pictures**, the first one is the cover
- when it **starts** and **ends**, in your time zone
- the **venue** (name, address and, for the map link, its latitude and longitude) and/or an **online link**. The online link is shown only to people holding a ticket
- the **organiser** shown in the app, and the **places** in total if the room has a limit

Save it as a **draft** while you work and **publish** it to show it in the app. Then add its **ticket types**: a name, a price (0 for free tickets), how many there are, when sales end and how many one person can take at a time. Sales always end when the event starts.

## Free and paid tickets

Free tickets are taken in the app. Paid tickets are paid by card on a secure payment page: set up **Card payments** on the Events page with your own iyzico, Kashier or Fawaterk account, or sell through Yallapp's. The places are held while the buyer pays, and the tickets are issued only once the provider confirms the payment. Places are counted as they're taken, so the last ticket can't be sold twice.

**On iPhones**, Apple lets apps sell tickets to events that happen at a place, but not to online-only events, which count as digital content. So in the iPhone app, paid tickets to an event without a venue show no buy button; free tickets work everywhere. On Android, everything can be bought in the app.

In **Event settings** on the same page you choose your currency and time zone, whether events show **Open in maps**, and until how many hours before an event people can **cancel free tickets** in the app (their place goes back on sale). Paid tickets are refunded by you, with **Refund** under the order on the **Orders** page: the ticket is cancelled and its place goes back on sale.

## Sales and attendees

Each event's page lists its tickets: who holds them, their type, their code and whether they were used. **Download the attendee list** gives you the same as a CSV file for a spreadsheet.

If you change an event's time, venue or online link, or **cancel** the event, everyone holding a ticket gets a notification. Cancelling an event cancels its tickets.

## Check-in at the door

Open **Check-in** on a phone at the door. Tap **Scan with the camera** and point it at a ticket's QR code (this works in browsers that can read QR codes, like Chrome on Android); you can always type the ticket's code instead. A valid ticket is marked used and shows the holder's name. Each ticket gets in once: scanning it again shows **Already used** with the time. The QR codes are signed for your app, so a made-up QR code is refused.

## Your pages

The home page starts with a search box and the events coming up. Change it on **Pages & look**: list blocks can show your next events or events you pick.
`,
  }),

  doc({
    slug: "donations",
    section: "Selling and bookings",
    title: "Charity and donation apps",
    description: "Run a Charity & donations app: campaigns with a goal, donations into your own iyzico, Kashier or Fawaterk account, receipts, donors, and why iPhone donations open in the browser.",
    steps: false,
    body: `Charity & donations apps show your campaigns: what you're raising money for, its story and pictures, and how close it is to its goal. Supporters pick an amount, can give anonymously and leave a message, and donate on your secure donation page. Every donor gets a receipt, and finds their donations under **My donations** in the app.

## Before your first donation

1. Choose **Charity & donations** on **App type**, then **Campaigns managed in Yallapp** on the Website step.
2. On the **Campaigns** page, under **Card payments**, choose your provider (iyzico, Kashier or Fawaterk) and paste your keys (see [Card payments](/docs/card-payments)). Donations go straight into your own merchant account; Yallapp takes no commission on them. Until your keys are saved, campaigns show in the app but nobody can donate.
3. Under **Donations in the app**, choose your currency. It can't change after the first donation.

## Campaigns

Select **Add a campaign** and write:

- a **title**, the **story** (paragraphs, headings, lists, links, pictures and YouTube or Vimeo videos) and an optional **summary** for its card
- a **goal** (or none: the app then shows what was raised, without a bar)
- the **suggested amounts** the app shows as buttons, the **smallest donation**, and whether people can type their own amount
- an optional **end date**, after which the campaign takes no donations
- up to 5 **pictures**; the first is the cover

Save a **draft**, **publish** it when it's ready, **close** it when it's done (it stays in the app as ended) and **feature** the ones that matter most: featured campaigns come first. A campaign with donations can't be deleted, so its donors keep their receipts.

The amount raised and the number of donors count **confirmed payments only**: a donation is added when the payment provider confirms it, never when someone just opens the donation page.

## Why iPhone donations open in the browser

Apple's App Store rules (guideline 3.2.2) let an iPhone app collect donations itself only when the charity is approved by Apple as a nonprofit and takes the money with Apple Pay. For every other charity, donations must happen outside the app.

So on iPhone the donate button reads **Donate on our website** and opens your donation page in Safari. The donor pays there and comes back to the app; the donation still shows under **My donations**. If you'd rather not show a donate button on iPhone at all, choose **No donations in the iPhone app** under **Donations in the app**.

On Android the donation page opens inside the app. Google Play's billing rules don't cover donations to charities, so this is allowed today; Google's policy can change, and we follow it.

## Receipts

When a donation is confirmed, the donor gets an email in your app's name with the amount, the date, the campaign and a reference like D-1042, and a link to the receipt page. The receipt says what was given and to whom. It makes no claim about tax: if gifts to you can be deducted from tax, tell your donors in your campaign story or your own letters.

## Donations and donors

The **Donations** page lists every paid donation, newest first, by campaign. **Export CSV** downloads them as a spreadsheet, with the donor's name, email, phone and message. Donors who chose to give anonymously are listed too: only the app hides their name. The **Donors** page groups donations by email address, the most generous first. Refund a donation, in full or in part, with **Refund** under it: the donor gets an email, the receipt and the app show it, and it no longer counts in the campaign's total (see [Card payments](/docs/card-payments)).

## Updates to donors

On a campaign's page, **Send an update to donors** sends a short message to everyone who gave to it while signed in to the app. It lands in their notifications inbox and opens the campaign; it's pushed to their phone only if they turned on **Campaign updates** in the app's settings. Push needs your Firebase project (see [Push notifications with Firebase](/docs/push-notifications)).

## Monthly donations

The app takes one-off donations. Monthly donations need a card saved for a subscription, which isn't available yet; we'll add them to the app when it is.
`,
  }),

  // -------------------------------------------------------------------------
  doc({
    slug: "plans-and-billing",
    section: "Account and billing",
    title: "Plans, billing and coupons",
    description: "The Starter, Growth, Pro and Business plans, changing plans, paying by card, coupons, renewals and refunds.",
    steps: false,
    body: `Each app has its own plan. Every plan includes your Android app, push notifications, your own branding and the documentation.

## The four plans

- **Starter**: the Android app for Google Play, Samsung Galaxy Store, Huawei AppGallery and Xiaomi GetApps, one content source, ready-made page templates, one language and up to 1,000 app users. You publish it with our step-by-step guides.
- **Growth**: adds the iOS app for the App Store, the full page editor, three languages, card payments in the app, offline mode, automatic rebuilds and up to 10,000 app users.
- **Pro**: adds unlimited app users, every language and "We publish for you": we publish your app and every update on Google Play, the App Store, Samsung Galaxy Store, Huawei AppGallery and Xiaomi GetApps, with priority support.
- **Business**: everything in Pro, with a dedicated account manager and custom features on request.

App users limits count the people signed in to apps on our hosting. Apps on your WordPress site keep their users on your site, with no limit. See the [pricing page](/pricing) for the current prices and the full comparison.

## Changing plans

On **License & plugin** (called **Plan & license** for apps without a WordPress site), choose another plan for the current app. A higher plan starts at once, paid by card, and the days left on your current plan are credited. A lower plan starts when your paid period ends, and you can keep your current plan until then.

## Reminders

We email you, and show a notice on your dashboard, 7 days and 1 day before an app's plan ends and on the day it ends, with a link to renew by card. When an app nears or reaches its app users limit, you hear from us too.

## Paying by card

When prices are shown, you pay on the secure page of our payment provider, Kashier: on the waiting page before your account is active, and on **License & plugin** (or **Plan & license**) to renew. Choose your plan, enter your billing city and address, and pay. You get an email when the payment is confirmed, and a receipt for each payment under **Payments** on the same page. You can also arrange your payment with our team on WhatsApp.

Prices are shown in Egyptian pounds in Egypt and in US dollars everywhere else. Every card payment is charged in Egyptian pounds: outside Egypt the form says, for example, "You'll be charged EGP 1,500 (about $30)", and your bank converts the amount at its own rate. The receipt shows the amount charged in pounds.

## Coupons

Have a coupon code? Enter it on the card payment form and select **Apply**. The price updates before you pay. A coupon can be limited to some plans, dates or a first payment.

## Renewals

A payment adds its period to the end of your current plan, so no days are lost when you renew early. If the plan isn't renewed, your license becomes inactive and new builds stop.

## Refunds

You can cancel within 3 days of your account being activated for a full refund. Depending on your bank, refunds take 5 to 14 business days. See the [Refund policy](/refund).

> Fees for the Google Play and Apple developer accounts are paid to Google and Apple, not to us.
`,
  }),
  doc({
    slug: "several-apps",
    section: "Account and billing",
    title: "Several apps in one account",
    description: "Run more than one app from the same account, each with its own plan and price.",
    steps: false,
    body: `One Yallapp account can hold several apps, for example an academy and a store, or one app for each of your brands. You manage them all from the same dashboard.

## Each app is separate

Each app has its own app type, content source, branding, pages, store listing, builds and settings. Its customers, orders and notifications are its own.

## Each app has its own plan

Each app has its own plan and its own price, and is renewed on its own. You can have one app on Starter and another on Pro.

## Adding an app

Open the app menu at the top of your dashboard (it shows your current app) and choose **Add an app**. Pick its app type, and the new app goes through the same [setup steps](/docs/setup-steps). It starts once its plan is paid by card on the **License** page or activated by our team. An account can hold up to 20 apps.

## Switching between apps

The same menu lists all your apps with their state. Choose one, and every page of the dashboard (setup, pages, products, builds, license) works on that app.

> Each app is published under the store accounts you choose. One Google Play and one Apple developer account can hold all your apps.
`,
  }),
  doc({
    slug: "account-and-support",
    section: "Account and billing",
    title: "Your account and support",
    description: "Sign-in, passwords, your contact details, announcements from our team, and how to get help.",
    steps: false,
    body: `## Signing in

Sign in with your email and password. Forgot your password? Choose **Forgot password?** on the [sign-in page](/sign-in) and we'll email you a link. Choosing a new password signs you out on your other devices.

## Your details

Your name, WhatsApp number and website are on your account. To change your email or details, message us on WhatsApp.

## Working with your team

Share your dashboard sign-in only with people you trust. Our team can open your dashboard to help you when you ask; you'll see a bar at the top while they do, and changes apply to your app.

## Announcements

We post news about Yallapp, new features and planned maintenance on your dashboard's **Announcements** page, and sometimes by email.

## Getting help

- **WhatsApp**: the **Support** link in your dashboard, the fastest way to reach us
- **Email**: for anything you'd rather put in writing
- This documentation, for step-by-step answers

Send us a screenshot and the step you're on, and we'll answer you directly.
`,
  }),

  // -------------------------------------------------------------------------
  doc({
    slug: "sign-in-codes",
    key: "guide-sign-in-codes",
    section: "Troubleshooting",
    title: "Sign-in codes don't arrive",
    description: "What to check when people don't receive their sign-in code.",
    steps: true,
    body: `Most problems with sign-in codes come from the phone number or the way codes are sent. Check these in order.

## Check the phone number

People must enter their number with the right country code. Compare it with the number on their account (on WordPress, in their WordPress account).

## Codes sent by Yallapp: check WhatsApp

Codes are sent on WhatsApp, through waabek.com. The number must have WhatsApp, and the phone must be online. Ask the person to look in their WhatsApp chats, including archived ones.

## WordPress: check who sends the codes

In WordPress, open **Yallapp** and look at **Sign-in codes** in the **Compatibility status** card.

- **Sent by Yallapp (WhatsApp)**: codes go out on WhatsApp, like for apps without a website, so the number must have WhatsApp. Your license must be active: if a code couldn't be sent, the **Sign-in** settings show why.
- **Digits**: use the same phone number to sign in on your website. If the code doesn’t arrive there either, the problem is in Digits or your SMS or WhatsApp gateway: check its balance, your sender name or approved message template, and its delivery logs. Or choose **Sent by Yallapp (WhatsApp)** instead.

## Wait a few minutes

Codes are limited per phone number and per network to stop abuse. After several attempts, people have to wait before asking for a new code. A code is valid for a few minutes only.

---

Still not working? Message us on WhatsApp with the phone number and the time of the attempt.
`,
  }),
  doc({
    slug: "videos",
    key: "guide-videos",
    section: "Troubleshooting",
    title: "Videos don't play",
    description: "What to check when a lesson video doesn't play in the app.",
    steps: true,
    body: `The app plays the same video sources your courses use: uploaded videos, videos from your [Media library](/docs/media), YouTube, Vimeo and embedded players.

## Play the lesson on your website or platform

Open the lesson while signed in as a student. If it doesn’t play there, fix the lesson first.

## Allow embedding

For YouTube and Vimeo, the video’s privacy settings must allow embedding. For Vimeo videos limited to certain domains, add your website’s domain.

## Reopen the lesson

Uploaded videos play from temporary links. If a lesson stayed open for a long time, or the phone’s date and time are wrong, close it and open it again.
`,
  }),

  // -------------------------------------------------------------------------
  doc({
    slug: "my-own-api",
    key: "guide-custom-api",
    section: "For developers",
    title: "Connect your own API",
    description: "For developers: serve the Yallapp API from your own website, endpoint by endpoint, with examples and a checklist.",
    steps: false,
    body: DEVELOPER_GUIDE,
  }),
];

export function docBySlug(slug: string): DocDefault | undefined {
  return DOCS.find((d) => d.slug === slug);
}
