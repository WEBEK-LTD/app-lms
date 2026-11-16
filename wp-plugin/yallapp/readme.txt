=== Yallapp ===
Contributors: yallapp
Tags: lms, mobile app, tutor lms, digits, otp
Requires at least: 6.0
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.4.48
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Connects your WordPress site to your Yallapp mobile apps.

== Description ==

Yallapp turns your WordPress academy, shop, booking or news site into
branded Android and iOS apps. This plugin exposes your courses, lessons,
quizzes, products, bookings, posts and sign-in to your Yallapp apps through
a secure REST API (`/wp-json/yallapp/v1`).

**A Yallapp account is required.** Yallapp builds and publishes the apps and
runs the services below, on a paid plan; the plugin connects your site to
it with your app's license key from your [Yallapp dashboard](https://yallapp.com.tr/dashboard).
Without an active plan, the settings page works and the app shows that it is
paused. Learn more at [yallapp.com.tr](https://yallapp.com.tr).

Works with Tutor LMS (Free and Pro), LearnPress, LifterLMS, MasterStudy LMS,
Sensei LMS and Masteriyo. Sign-in codes are sent by Yallapp on WhatsApp, or by
Digits if you prefer (with its REST API add-on). Digits is optional.

= What the app gets =

* Sign-in with a one-time code sent by Yallapp on WhatsApp (or through Digits), or with the email and password of a website account, sign-up, device limits and store review access. People who signed up with Digits keep their accounts.
* Courses, categories, course details, curriculum with locked and preview lessons, my courses and wishlist.
* Lessons rendered exactly as on the website, with iframe sizes kept, or opened in a signed-in web view.
* Uploaded videos through signed, expiring links with seeking support.
* Progress, lesson completion with an optional watch requirement, quizzes graded by the LMS, certificates.
* Android checkout through the website with the student signed in automatically. iOS is view-only.
* Paid courses and memberships bought in the app through Google Play and the App Store, when your Yallapp plan has it: the student gets the course or membership on your site.
* Push notifications through Firebase for new lessons, announcements and enrollments: your own Firebase, or Yallapp's when your Yallapp dashboard sets up notifications for you.
* The pages, tabs, look and languages you publish in your Yallapp dashboard, filled with your own courses, products and posts.
* For an academy designed in Yallapp Studio: its pages, sign-in screen, account menu, launch screen and premium screens, the student's cards on a photo or in a ring (the course in progress, the next live class and the streak with this week's days), each course card's rating from your reviews, and borders in dark mode; Studio's premium library (stories, tickers, video and parallax banners, galleries, quotes, plans, numbers, progress, timelines, bento grids, glass cards and the drawn maps' looks); and the Signature looks' premium headers and the look of the app's own screens. The guide: [Premium elements in Studio](https://yallapp.com.tr/docs/studio-premium-elements).
* For an academy designed in Yallapp Studio, its course screens in one premium look (Night cinema, Gold ring, Faculty index or On air) for the course card, the course page, the lesson and My courses, each with its options; and for any app designed in Studio, the Monochrome luxe design and the landing pages, with photos shown in black and white.
* For a WooCommerce shop: same-day delivery until a cut-off and delivery times with how many orders each takes and its extra fee, a gift checkout (the sender as the order's billing, the recipient as its shipping), card messages by occasion from your Yallapp dashboard, a flash sale (one at a time) through WooCommerce's own sale price with a countdown in the app, coupons ticked "Show in the app", and gift add-ons offered as "Add a little more". The guide: [Delivery days, gifts and flash sales](https://yallapp.com.tr/docs/delivery-and-offers).

= Privacy =

Apart from the chat (below), the plugin sends no student data to Yallapp. License checks and app layout updates
send only the license key, site URL, plugin version, WordPress version and LMS name
to yallapp.com.tr. When Yallapp sends the sign-in codes (the default), the plugin
also sends the phone number and the code to deliver; Yallapp sends the message on
WhatsApp and keeps neither. Codes are made on your site and kept there only as a
hash, for 5 minutes. Push notifications go through your own Firebase project.

When the app's chat is on (Pro and Business plans), its messages are kept by Yallapp:
when a person opens the chat, the plugin sends Yallapp their WordPress user ID,
display name and profile picture address, and in an academy the courses they are
enrolled in. When an account is deleted, the plugin asks Yallapp to delete its chat.

When the app sells courses and memberships through Google Play and the App Store, the
plugin sends Yallapp the WordPress user ID, display name and email of the person who
opens a purchase in the app, so Yallapp can record their purchases for them.

== Installation ==

1. Install and activate the plugin from Plugins › Add New, or upload the zip.
2. Open Yallapp in the WordPress admin and paste the license key of your app from
   your Yallapp dashboard (License & plugin).
3. Choose your sign-in, notification and content settings, then build your app from
   the Yallapp dashboard. The step-by-step guide:
   [Install the WordPress plugin](https://yallapp.com.tr/docs/wordpress-plugin).

== External services ==

This plugin connects to the following services. Nothing is sent before you
paste a license key, except where noted.

= Yallapp (yallapp.com.tr) =

Yallapp is the service that builds and runs your apps; the plugin needs it to work.

* License checks (when you activate the key, every 12 hours, and when your Yallapp
  dashboard asks the site to check again): the license key, your site's address,
  the plugin and WordPress versions, which LMS, shop and booking plugins the
  site runs and the versions of the plugin's parts that read them, the paths of
  your site's pages that open the app, and your site's title, tagline, logo,
  site icon, theme colours and menus (for an app made from your site). With the
  check (not on activation), a shop's totals of the last eight days: how many
  orders were paid each day and what they brought in, and the refunds made, per
  currency; never an order, a customer or a product.
* App pages (every 15 minutes and on request): the license key and site address,
  to get the pages and look you published in your Yallapp dashboard.
* Sign-in codes, when Yallapp sends them (the default): the phone number or email
  address and the code to deliver, for each code a person asks for in the app.
  Yallapp sends the message and keeps neither.
* Videos from your Yallapp Media library: the license key, site address and the
  media links, when a student opens or saves a lesson that uses one.
* Chat, when your plan has it and it is on: when a person opens the chat in the
  app, their WordPress user ID, display name and profile picture address, and in
  an academy the IDs, titles and pictures of the courses they are enrolled in;
  when an account is deleted, its user ID, so Yallapp deletes its chat. Yallapp
  sends the site, signed with the license key, the people to notify of a new
  message, and the plugin sends them the push notification.
* Push notifications, only when your app uses "Yallapp sets up notifications" (your
  Yallapp dashboard says so in the license check): for each notification the site sends,
  the license key, site address, plugin and WordPress versions, the notification's title,
  text, picture address and the data the app opens it with (such as a course ID or a
  link), and the push tokens of the phones it goes to. They pass through Yallapp only
  to be delivered through Yallapp's Firebase Cloud Messaging; Yallapp stores neither
  the tokens nor the texts, and keeps only counts. Otherwise nothing of your
  notifications reaches Yallapp.
* Campaigns, when you send one from your Yallapp dashboard: Yallapp sends the
  site, signed with the license key, the campaign's title, text, picture address
  and link; once its push notifications are sent, the plugin tells Yallapp how
  many phones it reached and how many it missed (counts only, no people or devices).
* In-app purchases, when your plan sells courses and memberships in the app through
  Google Play and the App Store: after each license check and within a minute of a
  course, membership level, LearnDash group or product being saved, the IDs, titles
  and prices of your paid courses and of your monthly or yearly membership plans
  (with the courses they open) and your currency; when a person starts a purchase in
  the app, their WordPress user ID, display name and email. Yallapp sends the site,
  signed with the license key, the purchases to give or take back: the user ID, the
  course or plan, the store's transaction ID, what was paid and until when.

Terms of use: https://yallapp.com.tr/terms
Privacy policy: https://yallapp.com.tr/privacy

= Firebase Cloud Messaging (Google) =

Only when you add your Firebase service account in Settings › Notifications: the
plugin signs in to Google (oauth2.googleapis.com) and sends each push notification
(its title, text and link, and the device tokens of the people it goes to) to
fcm.googleapis.com, when you or the site send a notification. When your app uses
"Yallapp sets up notifications", the site doesn't contact Google: Yallapp sends the
notifications to Firebase Cloud Messaging for it (see Yallapp above).

Terms: https://firebase.google.com/terms
Privacy: https://firebase.google.com/support/privacy

= Huawei Push Kit =

Only when you add your Huawei Push Kit details in Settings › Notifications: the
plugin signs in to Huawei (oauth-login.cloud.huawei.com) and sends each push
notification (its title, text and link, and the device tokens of the people on
Huawei phones it goes to) to push-api.cloud.huawei.com.

Terms: https://developer.huawei.com/consumer/en/devservice/term
Privacy: https://consumer.huawei.com/en/privacy/privacy-policy/

== Credits ==

The icons on the settings screen and in the "In the app" boxes are Material
Symbols Rounded by Google (the material-design-icons project),
under the Apache License 2.0, included as inline SVG.

== Changelog ==

= 0.4.48 =
* Notifications sent by Yallapp: when your app uses "Yallapp sets up notifications" in your Yallapp dashboard, your site needs no Firebase file. The plugin hands each push notification to Yallapp, which delivers it through Yallapp's Firebase and keeps nothing of it; phones Firebase no longer knows are forgotten as before, and the ones it couldn't reach for now are tried again up to three times in the next minutes. Settings › Notifications then says "Notifications are sent by Yallapp". Apps with their own Firebase keep sending from the site, as before; Huawei phones always do.

= 0.4.47 =
* Pay inside the app (Demo): when you choose it in your Yallapp dashboard, customers pay in the app through your own payment gateway there, and the order is made in WooCommerce marked as paid, with the delivery and gift details, its stock taken and WooCommerce's emails sent as usual. Your store's checkout stays the default.

= 0.4.46 =
* Delivery stages for your shop's orders: Shipped, Delivery postponed, Delivery failed and Returned to shop are order statuses in WooCommerce (Completed is delivered). The app shows the stage on the order, with your latest note to the customer as its reason, and tells the customer when their order ships, when its delivery is postponed and when a delivery fails; the order's notes keep what they were told. Apps that don't know the stages yet still show the order as Processing. A paid order cancelled after a failed delivery gets a note that it needs a refund: refund it with WooCommerce's Refund button.

= 0.4.45 =
* The Yallapp plugin's settings say that the app runs one flash sale at a time on WordPress: change it for the next one.

= 0.4.44 =
* For flower and gift shops: same-day delivery until a cut-off and delivery times (each with how many orders it takes and an extra fee on the checkout); a gift checkout (the sender's details as the order's billing, the recipient's as its shipping, the delivery day and time required, the card and "send anonymously"); card messages by occasion from your Yallapp dashboard; a flash sale through WooCommerce's own sale price with a countdown in the app; and coupons ticked "Show in the app".
* Gift add-ons: tick "Sell only as an add-on in the app" on a WooCommerce product and choose what it goes with; the app offers it as "Add a little more", never alone, and your website's shop is unchanged. Titles you word in the Yallapp dashboard, a flash sale's name in each language.
* And Leqaa's premium look from Yallapp Studio reaches the app from your site: the petal header, the petal bottom bar and the petal account and system screens; the premium gift checkout in five steps with the gift card's live preview, by day and by night; a variable product's default choice (a bouquet's Deluxe) chosen when its page opens; and a look's own night colours on every screen.

= 0.4.43 =
* The new premium whole design and landings you pick in Yallapp Studio reach the app from your site: a photo shown in black and white (a picture, a list card's picture, a photo hero or a parallax banner), as the Monochrome luxe design and the new landings use it.

= 0.4.42 =
* The course screens you design in Yallapp Studio reach the app from your site: one premium look for the course card, the course page, the lesson and My courses (Night cinema, Gold ring, Faculty index or On air), with each screen's options: the card as a poster, a ticket, frosted glass or a row with its photo's shape, shade and corners; the page's cover, its enrol bar and the parts it shows (the teacher, what you'll learn, the curriculum, the reviews, the description) with the button's own words; the lesson's player and how far through the course; and My courses as a grid or a list with rings or bars, continue learning and the completed courses.

= 0.4.41 =
* The Signature looks and premium screens you design in Yallapp Studio reach the app from your site: a header's premium style (a large title that folds, frosted glass, a photo, your brand's colour or a search pill) with its line, photo and folding; the look of the app's own screens (account, settings, notifications, language, sign-in and the code screen, lists and empty states); the live cards' new looks (a photo hero, a ring, a pill or steps, with their accent colour by day and by night); the live trip as a boarding pass or a big countdown; a greeting in your own words; and the course in progress as a ring with this week's days.

= 0.4.40 =
* Yallapp Studio's premium library reaches the app from your site: stories, a moving ticker of words, logos or photos, a video banner, a parallax photo banner, a photo gallery (masonry, bento or filmstrip), before and after photos and a bar of progress segments, with the slider's new looks (where its indicator sits, its colour and "1/3"); quote cards, pricing plans, big numbers, progress bars and rings, a timeline, a person's or a place's card, a bento grid of tiles, badges and a call-to-action bar, each with its list in the language asked for, and a premium card style (glass, a ticket, a texture) on any layout; and the drawn map's premium looks on a map header (a living map, a horizon, two inks or a radar lens, with its markers, labelled pins, words and a live route).

Earlier versions are listed in changelog.txt, next to this readme in the plugin's source.
