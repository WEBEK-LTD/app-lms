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
 * Google Play Console, App Store Connect and iyzico.
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
- **We build your apps.** You get the files for Google Play and the App Store, your signing key and your store assets.
- **You publish them under your own name**, with our guides, or we publish them for you on the Pro and Business plans.
- **You change your app without a new version.** Pages, look, languages and content change from the dashboard and show the next time the app opens.

## What you need

- Your content: a website on a [supported platform](/integrations), your own API, or nothing at all
- A Google Play developer account, and an Apple Developer Program membership for iPhones (see [Developer accounts](/docs/developer-accounts))
- Your app icon (a square PNG, 1024 × 1024 pixels) and your logo
- A free Firebase project, if you want push notifications (see [Push notifications with Firebase](/docs/push-notifications))

## Your path to the stores

1. [Create your account](/docs/create-account) and get it activated.
2. [Choose your app type](/docs/app-types).
3. [Choose where your content comes from](/docs/content-sources) and connect it.
4. Complete [the setup steps](/docs/setup-steps): branding, store listing and publishing.
5. Build your [pages and look](/docs/pages-and-look) and turn on [languages](/docs/languages).
6. Download your apps from [Builds & downloads](/docs/builds) and publish them on [Google Play](/docs/google-play) and the [App Store](/docs/app-store).

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

- **Pay by card**, when card prices are shown: choose your plan, enter your billing city and address and, if you have one, a coupon code. You pay on iyzico's secure page, and your account is activated as soon as the payment is confirmed.
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
    description: "Academy, Store, Bookings or Real estate: what each app type does and where its content can come from.",
    steps: false,
    body: `The app type decides your app's screens and its bottom tabs. You choose it once, on the first page of **App setup**, and you can change it later.

## Academy

Courses, lessons, quizzes, progress and certificates. Students browse courses, continue learning where they stopped, watch protected videos and mark lessons complete. Content from a WordPress LMS (Tutor LMS, LearnPress, LifterLMS, MasterStudy LMS, Sensei LMS, Masteriyo or LearnDash), Teachable, Thinkific, your own API, or courses you add in the dashboard. See [the Academy solution](/solutions/academy).

## Store

Products, a cart, checkout and orders, with delivery dates and gift messages for flower and gift shops. Content from WooCommerce, Shopify, ikas, Ticimax, IdeaSoft, your own API, or products you add in the dashboard. See [the Store solution](/solutions/store).

## Bookings

Services, staff, free times and appointments. Customers book a time and see or cancel their appointments; payment happens at your business. Content from Amelia, BookingPress or LatePoint on WordPress, SimplyBook.me, your own API, or services you add in the dashboard. See [the Bookings solution](/solutions/bookings).

## Real estate

Property listings with search and filters, favorites and messages to your office. Listings are always managed in the Yallapp dashboard, so you don't need a website. See [the Real estate solution](/solutions/real-estate).

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
- **Another store platform** (Store apps): ikas, Ticimax or IdeaSoft. See [Connect ikas](/docs/ikas), [Connect Ticimax](/docs/ticimax) and [Connect IdeaSoft](/docs/ideasoft).
- **My Teachable or Thinkific school** (Academy apps): see [Connect Teachable](/docs/teachable) and [Connect Thinkific](/docs/thinkific).
- **My SimplyBook.me account** (Bookings apps): see [Connect SimplyBook.me](/docs/simplybook).
- **I don't have a website**: add your content in the dashboard. See [No website](/docs/no-website).
- **My own API** (Academy, Store and Bookings apps): for developers. See [Connect your own API](/docs/my-own-api).
- **I don't have WordPress**: our team sets up a WordPress site for you and moves your content over.

Real estate apps have one choice, **Listings managed in Yallapp**.

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

The plugin shows **Active** with your plan and renewal date, and your dashboard shows the connected website. The plugin checks the license every 12 hours. If it can’t reach us for a while, your app keeps working for 72 hours.

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
    description: "Run a store, academy, bookings or real estate app without a website, with your content in the Yallapp dashboard.",
    steps: false,
    body: `You don't need a website to have an app. Choose **I don't have a website** on the Website step (for Real estate apps, **Listings managed in Yallapp**), and new pages appear in your dashboard's menu for your content.

## What you manage, by app type

- **Store**: products, categories, stock and shipping on the **Products** page, and orders on the **Orders** page. Customers pay by card through iyzico. See [Products, orders and shipping](/docs/store-orders) and [Card payments with iyzico](/docs/card-payments).
- **Academy**: courses, sections and lessons on the **Courses** page, and orders for paid courses. See [Courses without a website](/docs/courses).
- **Bookings**: services, your team, working hours and booking rules on the **Services & team** page, and appointments on the **Appointments** page. See [Services, team and appointments](/docs/bookings).
- **Real estate**: properties on the **Listings** page and messages on the **Inquiries** page. See [Listings and inquiries](/docs/real-estate).

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

## Pages and blocks

A page is a stack of blocks. Add a block from **Add a block**, then drag it up or down to change the order. The blocks:

- **Banner**: a wide image with a heading
- **Text**: paragraphs, headings and links
- **Image** and **Video**
- **Button**: opens a page, a screen, a course or product, or a web address
- **List**: your own courses, products, services, posts or listings, as cards
- **Categories** and **Search box**
- **Continue learning**: the student's current course (Academy apps)
- **Web page**: a page of a website, inside the app
- **Space**: room between blocks

Each block can show to everyone, only to people who are signed in, or only to people who aren't.

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
    title: "Languages",
    description: "Turn on English, Arabic (right to left) and Turkish, choose the default and translate your page texts.",
    steps: false,
    body: `Every Yallapp app is in English. You can turn on **Arabic** and **Turkish** too, and people pick their language in the app's settings.

## Turn languages on

In **Pages & look**, open **Languages**. Choose the languages people can pick and the **Default language**. Publish to apply the change.

## Translate your texts

The app's own buttons and messages come in all three languages. Your own texts (page titles, banners, text blocks, buttons, tab labels) are yours to translate: choose a language in **Edit texts in** and write the text for it. A text without a translation shows in your default language.

## Right to left

When someone picks Arabic, the whole app switches to right to left: menus, lists, icons and text.

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
    description: "How people sign in to your app: by phone, by email or both, the WhatsApp number that sends their codes, and the sign-in rules you set.",
    steps: false,
    body: `People sign in to your app with their phone number and a one-time code, with their email address, or either: you choose on the dashboard's **App sign-in** page.

## Phone, email or both

On **App sign-in**, under **How people sign in**, choose:

- **Phone number**: a 6-digit code on WhatsApp. The default.
- **Email address**: with no website or with content in the dashboard, a 6-digit code by email, sent in your app's name. New people sign up with their email address. On WordPress, the email address and password of their account on your website; WordPress checks the password, and "Forgot your password?" opens your website's reset page.
- **Phone number or email address**: the app shows a **Phone / Email** switch.

Apps connected to Shopify, ikas, Ticimax, IdeaSoft or SimplyBook.me sign in by phone: those platforms find each customer's orders and bookings by their phone number. Apps connected to Teachable or Thinkific can also sign in by email: someone who signs in by email sees the courses of their school account with that address, including courses bought on your website.

On WordPress, email sign-in is for people who already have an account on your website; new people sign up with their phone number or on your website. Your choice reaches your website at the plugin's next license check (within 12 hours), or at once with **Check now** in the Yallapp plugin. Until you choose here, the plugin's own **Sign-in** setting applies.

Your store review number always signs in, also when the app signs in by email only. When it signs in by email only, the app shows no phone field, so also set a store review email address (see below).

If you change where your app's content comes from to Shopify or another connected platform, the app signs in by phone only. The **Website** step warns you first when customers signed up with their email address: they can't sign in after the change.

## The WhatsApp number that sends codes

Codes go out from Yallapp's WhatsApp number, with your app's name. To send them from your own WhatsApp number instead, open a WABEK account at waabek.com, connect your number there, then on **App sign-in** paste your WABEK **API key** and the **Instance ID** of that number, and select **Send a test code**. The key is stored encrypted and never shown again. **Use Yallapp's number again** goes back to ours.

On WordPress, this applies when the plugin's **Sign-in codes are sent by** setting is **Sent by Yallapp (WhatsApp)**.

If your number can't send a code (WABEK doesn't answer, or the number is disconnected), that code goes out from Yallapp's number instead, so your customers still get it. We email you, at most once a day, and **App sign-in** shows the day it happened until you save a new key or a test code goes out.

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

On the Pro and Business plans we upload your builds for you. Add the Google Play service account key and the App Store Connect API key on the **Publishing** step: see [The setup steps](/docs/setup-steps).
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

> Under **App Review Information**, add your review phone number and fixed code, so reviewers can sign in: from the dashboard's **App sign-in** page, or the plugin's **Store review access** setting on WordPress.

## Submit for review

Choose the build, select **Add for Review** and submit. Your iOS app shows no purchase buttons for paid courses or digital products, as Apple's rules require, so don't mention prices or buying them in the iOS description.
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

Customers pay by card on a secure iyzico page. Add your own iyzico keys, or sell through Yallapp's iyzico account: see [Card payments with iyzico](/docs/card-payments).

## Orders

Paid orders appear on the **Orders** page, and you get an email for each one. Mark an order **completed** when it's delivered, or **refunded** or **cancelled** when needed. Customers see their orders and their status in the app.
`,
  }),
  doc({
    slug: "card-payments",
    section: "Selling and bookings",
    title: "Card payments with iyzico",
    description: "Take card payments in apps without a website, with your own iyzico account or through Yallapp's.",
    steps: false,
    body: `Apps without a website take card payments through iyzico: shops for their orders, academies for paid courses. Customers enter their card on iyzico's secure page; Yallapp never sees it. An order is marked paid only after iyzico confirms the payment for that exact amount.

## Use your own iyzico account

On the **Products** page (or the **Courses** page for an academy), under **Card payments**, choose **Use your own iyzico account** and paste your **API key** and **Secret key** from your iyzico merchant panel. Payments go straight into your account.

> To try it first, turn on **Sandbox keys** and paste iyzico's test keys, then pay with iyzico's test cards. Turn it off when you paste your live keys.

## No iyzico account? Sell through Yallapp

Choose **No iyzico account? Sell through Yallapp** and give the details iyzico needs to pay you: who gets paid (you, or your company), your legal name, ID or tax details, address and your IBAN, which must be in the payee's name. iyzico registers you, and you can sell right away.

- Each order's price goes to you minus Yallapp's commission; shipping goes to you in full.
- iyzico pays your share once the order is approved: when you mark the order **completed**, or when our team releases it.
- We keep only what's needed to pay you, such as the last 4 digits of your IBAN.

## Paid courses

Academy apps without a website sell paid courses the same way, on Android only: the student pays on the payment page and is enrolled when the payment is confirmed. The iPhone app shows no purchase buttons for paid courses, as Apple's rules require.
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
    slug: "courses",
    section: "Selling and bookings",
    title: "Courses without a website",
    description: "Run an Academy app without a website: courses, sections, lessons, free and paid courses, and students.",
    steps: false,
    body: `Academy apps without a website get their courses from the dashboard's **Courses** page. Changes show in the app right away.

## Courses

Select **Add course** and give it a title, a description, a cover image (PNG or JPEG, up to 2 MB, ideally 1280 × 720), a price (empty for a free course), an instructor, a level and categories. Turn off **Students can see it** while you're still working on it.

## Sections and lessons

Open a course to add sections, and lessons inside them. A lesson has a **video address** (YouTube, Vimeo or a video file's https address), **text** shown under the video or as the whole lesson, and its length in minutes. Turn on **Free preview for everyone** to let anyone open a lesson before enrolling.

## Free and paid courses

- **Free courses**: students enroll from the app on Android and iOS.
- **Paid courses**: bought on Android through the card payment page (see [Card payments with iyzico](/docs/card-payments)). The iPhone app shows no purchase buttons, as Apple's rules require; students who bought elsewhere learn on iPhone too.

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

  // -------------------------------------------------------------------------
  doc({
    slug: "plans-and-billing",
    section: "Account and billing",
    title: "Plans, billing and coupons",
    description: "The Starter, Growth, Pro and Business plans, changing plans, paying by card, coupons, renewals and refunds.",
    steps: false,
    body: `Each app has its own plan. Every plan includes your Android app, push notifications, your own branding and the documentation.

## The four plans

- **Starter**: the Android app, one content source, ready-made page templates, one language and up to 1,000 app users. You publish it with our step-by-step guides.
- **Growth**: adds the iOS app, the full page editor, three languages, card payments in the app, offline mode, automatic rebuilds and up to 10,000 app users.
- **Pro**: adds unlimited app users, every language and "We publish for you": we publish your app and every update on Google Play and the App Store, with priority support.
- **Business**: everything in Pro, with a dedicated account manager and custom features on request.

App users limits count the people signed in to apps on our hosting. Apps on your WordPress site keep their users on your site, with no limit. See the [pricing page](/pricing) for the current prices and the full comparison.

## Changing plans

On **License & plugin** (called **Plan & license** for apps without a WordPress site), choose another plan for the current app. A higher plan starts at once, paid by card, and the days left on your current plan are credited. A lower plan starts when your paid period ends, and you can keep your current plan until then.

## Reminders

We email you, and show a notice on your dashboard, 7 days and 1 day before an app's plan ends and on the day it ends, with a link to renew by card. When an app nears or reaches its app users limit, you hear from us too.

## Paying by card

When card prices are shown, you pay on iyzico's secure page: on the waiting page before your account is active, and on **License & plugin** (or **Plan & license**) to renew. Choose your plan, enter your billing city and address, and pay. You get an email when the payment is confirmed. You can also arrange your payment with our team on WhatsApp.

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
    body: `The app plays the same video sources your courses use: uploaded videos, YouTube, Vimeo and embedded players.

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
