=== Yallapp ===
Contributors: yallapp
Tags: lms, mobile app, tutor lms, digits, otp
Requires at least: 6.0
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.4.24
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
* Push notifications through Firebase for new lessons, announcements and enrollments.
* The pages, tabs, look and languages you publish in your Yallapp dashboard, filled with your own courses, products and posts.

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
fcm.googleapis.com, when you or the site send a notification.

Terms: https://firebase.google.com/terms
Privacy: https://firebase.google.com/support/privacy

= Huawei Push Kit =

Only when you add your Huawei Push Kit details in Settings › Notifications: the
plugin signs in to Huawei (oauth-login.cloud.huawei.com) and sends each push
notification (its title, text and link, and the device tokens of the people on
Huawei phones it goes to) to push-api.cloud.huawei.com.

Terms: https://developer.huawei.com/consumer/en/devservice/term
Privacy: https://consumer.huawei.com/en/privacy/privacy-policy/

== Changelog ==

= 0.4.24 =
* Header types: the header chosen in the Yallapp dashboard (title, centered, logo or search, with up to four buttons: search, cart, notifications, chat, account) reaches the app with its look.

= 0.4.23 =
* Courses and memberships bought in the app through Google Play and the App Store: when your Yallapp plan sells in the app and your stores are connected in the Yallapp dashboard, the app's course pages buy a paid course or a membership through the store. Yallapp checks each purchase with Google or Apple, then your site enrols the student (Tutor LMS, LearnDash, LearnPress, LifterLMS, MasterStudy, Sensei LMS, Masteriyo), gives the Paid Memberships Pro level, LearnDash group or WooCommerce Subscriptions product until the paid period ends, and with WooCommerce records a completed order paid by "Google Play" or "App Store". Refunds and ended subscriptions take the access back; access a student had from your website stays. The plugin tells Yallapp your paid courses and monthly or yearly plans, so a store product is kept for each. The website's checkout is no longer offered in the app where it sells through the store.

= 0.4.22 =
* Cards, photo gallery, map, divider and form blocks: pages built in the Yallapp dashboard can show cards in a grid, photos that open full screen, a place with directions, a line between blocks, and a short form. A form's answers are emailed to the support email in the plugin settings (else the site's admin email), at most 5 a minute and 30 a day from one address.

= 0.4.21 =
* Block style and when a block shows: blocks keep the alignment, text size, corners and picture fit set in the Yallapp dashboard, and a block set to show only between two dates, on Android or iOS, or in some languages stays out of the app elsewhere. Pages get the background and the picture across their top chosen there too.

= 0.4.20 =
* The Figma look: when the app shows the look made from your Figma file in the Yallapp dashboard, its main color and logo reach the app too.

= 0.4.19 =
* Every free font: the font and the Arabic text's font chosen in the Yallapp dashboard reach the app, which downloads them from Yallapp once and keeps them.

= 0.4.18 =
* Updates come from Yallapp again: while your plan is active, new versions show in Dashboard › Updates like any other plugin, with their changes. Sites on 0.4.8 to 0.4.17 install this version once by hand (Plugins › Add New › Upload Plugin); later versions arrive on their own.

= 0.4.17 =
* Returns from the app: set how many days after an order is completed customers may ask to return it (Settings › Store app). They choose a reason and add a note in the app; you get an email and see the request on the order, approve or decline it there with a reply, and the customer is told in the app. Refunds stay in WooCommerce.

= 0.4.16 =
* Order updates in the app: when you add tracking with WooCommerce Shipment Tracking or Advanced Shipment Tracking, the customer gets a notification and follows the parcel from the order in the app. Completed, cancelled and refunded orders are told too. Customers can turn order updates off in the app's settings.

= 0.4.15 =
* Coupons in the app's cart: customers type a WooCommerce coupon code, the cart checks it with your coupon rules and shows the discount and the total so far, and your checkout applies it. Coupons limited to some customers are checked on your checkout.

= 0.4.14 =
* Memberships from your website in the app: a course that needs a Paid Memberships Pro level says which plans open it, can't be joined from the app without one, opens in one tap for members, and closes when their membership ends. Students see their memberships, WooCommerce subscriptions and LearnDash groups under Account › My memberships. Sold and managed on your website only.

= 0.4.13 =
* Your shop's sales in your Yallapp dashboard: with each license check the plugin sends WooCommerce's totals of the last days (paid orders, what they brought in and the refunds), so Analytics and the weekly summary email show them. Totals only, never an order or a customer.

= 0.4.12 =
* Campaigns from your Yallapp dashboard: write a notification with a picture and a page or web address to open, and send it now, later or every week. Your site puts it in everyone's inbox in the app, pushes it to the phones that allow announcements, and tells Yallapp how many it reached.
* Notifications in the app's inbox can show a picture and open a web page.

= 0.4.11 =
* A side menu in your app, opened from the menu button: you choose its entries in your Yallapp dashboard.
* Your own icons for the bottom tabs, the side menu and quick links, and a background and spacing for each block of your pages.
* The Yallapp team can switch your app's chat and its newest features on or off for your app, without a new build.
* With each license check the plugin tells Yallapp the versions of its parts that read your course, booking and shop plugins, so Yallapp's team can see what your site runs.

= 0.4.10 =
* Your site's look for your app: with each license check the plugin tells Yallapp your site's title and tagline, logo, site icon, your theme's colours and your menus, so an app made from your site starts with your brand and your menu.

= 0.4.9 =
* Chat in the app (Pro and Business plans): people write to you from the app, and in an academy each course can have its group. The messages are on Yallapp; you answer in your Yallapp dashboard and in Yallapp Business.
* The app gets a chat session for the person signed in on your site, and Yallapp's new-message notifications reach their phones through your push settings.
* Deleting an account deletes its chat.

= 0.4.8 =
* Ready for WordPress.org: updates now come from WordPress.org like any other plugin, and the plugin no longer downloads updates from Yallapp. Sites on an earlier version get this one from Yallapp as before.
* The readme lists the services the plugin connects to, what it sends and when.

= 0.4.7 =
* Start a course again: once a student has finished every lesson of a course, the app offers "Start the course again", which clears their progress in it (lessons completed, where each video stopped, and the quiz results the LMS keeps with the course) and opens the first lesson. It works with Tutor LMS, LearnDash, LifterLMS and Sensei LMS, and with LearnPress while the course allows retakes (each counts as one). MasterStudy and Masteriyo have no way for the plugin to reset a student's progress yet, so the app doesn't offer it there. Turn it off for a course with "Students can start this course again" in the course's "In the app" box (on by default). GET /courses/{id} says can_restart; POST /courses/{id}/restart starts it again.
* Videos from YouTube, Vimeo and the other video sites play in each site's normal player in the app, with its controls and branding. The app's owner can hide the video site's branding from the Yallapp dashboard (Screen protection), at their own risk: the plugin passes the choice to the app (Config app.hide_video_branding).

= 0.4.6 =
* When your Yallapp plan ends, the app stops: every screen shows that the app is paused, with your contact details from the plugin settings, and no notifications are sent. It comes back within minutes of renewing. The same happens while your Yallapp account is suspended. Before, the plugin let the app keep working ("Test mode").
* The plugin knows when your plan ends and pauses the app at that moment even if your site can't reach yallapp.com.tr. When the site can't reach yallapp.com.tr for over 3 days while the plan runs, the app pauses too, until the next successful check (Check now).
* Push notifications and offline lessons follow your plan, as on yallapp.com.tr.
* Account deletion keeps working while the app is paused: someone signed in to the app can still delete their account from it (DELETE /me, with POST /auth/refresh and POST /auth/logout). Signing in and everything else wait for the plan to be renewed.
* The License card in Settings says where the app stands: active until a date, ended on a date with how to renew, suspended, or not confirmed. "Test mode" is gone; only a development site (WP_ENVIRONMENT_TYPE local or development) can turn the license checks off with define( 'YALLAPP_ENFORCE_LICENSE', false ).

= 0.4.5 =
* Private courses in the wishlist: a student can keep a private course they're enrolled in (or may read on the website) in their wishlist like any other course, with Tutor LMS and MasterStudy. Someone who can't open the course can't add it.
* Courses with a password ("Password protected" in WordPress) still show in the app's catalog, as on the website, and the app never asks for the password: until the student is enrolled, the course page shows the title and picture without the description, says the course has a password and offers "Open on the website" for the password step (on iPhone, only for free courses). Its topics, lessons and free enrollment stay closed in the app until then. Once they've joined it on the website, it opens in the app as usual. GET /courses/{id} says password_protected and gives the course's website_url.

= 0.4.4 =
* Videos from your Yallapp Media library in lessons: paste a video's link from Media in your Yallapp dashboard into the lesson's new "Yallapp video" box (any LMS), or use it as the lesson's video address in your LMS. Once the LMS lets the student into the lesson, the app plays it in its own player, from a link made for that request that stops working after a few hours (the app asks for a new one and carries on where it was). Saving the lesson for offline viewing gets its own short-lived link. The video file never passes through your site.
* New [yallapp_video link="…"] shortcode: shows a Media video on the website, and in the app it is the lesson's video when the lesson has none of the above.
* The plugin asks Yallapp for these links with its license (POST /api/v1/licenses/media), and keeps one for other students while it has enough time left.

= 0.4.3 =
* Your site's own addresses open the app too: the course and lesson pages (Academy apps), product and product category pages (Store apps), posts (News & blog apps) and the pages with your booking plugin's form (Bookings apps), as your permalinks make them. On iPhone, apple-app-site-association lists them after what always stays on the website: wp-admin, sign-in, the REST API, feeds, the home page and the cart, checkout, account and payment pages of WooCommerce, Tutor LMS, LearnPress, LifterLMS and Masteriyo (add others with the yallapp_link_excluded_page_ids filter). On Android, the paths that start with a fixed folder (/courses/, /product/, /blog/) are sent to Yallapp with the license check and open the app from its next build; posts whose permalinks start at the root (/%postname%/) open it on iPhone only.
* New endpoint GET /links/resolve tells the app what an address of the site is; anything the app doesn't show opens in its in-app browser.
* A site in a folder (example.com/learn) also serves the two link files under its own folder, for the domain's own server to copy: phones only read them at the root of the domain.
* Push notifications and the app's inbox carry the link they open (the course, or the post), in the same format as shared links.
* Screen protection for every app type: "Block screenshots & screen recording" moved to Settings › General, and academies choose what it protects: course content only (lessons, quizzes, attachments and videos) or the whole app. The app gets it as `app.screen_protection`. The choice made on the Yallapp dashboard's Screen protection page, when there is one, replaces the setting. New sites start with it off; sites that saved their settings keep their choice (course content, as before).
* Private courses: a course set to Private (Tutor LMS's "Visibility: Private", or WordPress's Private visibility with the other LMSs) stays out of the app's catalog, and shows in My courses and opens with its lessons for the students enrolled in it, however they were enrolled (bought, free or added by an administrator), and for its author, editors and administrators. Anyone else, with a direct link too, gets "not found", the course's free preview lessons included. Before, a private course disappeared from its students' app. Sensei LMS counts no one as enrolled in a course that isn't published, so there a private course stays closed to students, as on the website.
* A lesson of a private course links to the lessons before and after it for its students.

= 0.4.2 =
* The app's default tabs and pages come in Arabic and Turkish when the app offers them and you haven't written your own, and the app's other languages reach it from your Yallapp dashboard's Languages page.
* Links that open the app: the plugin serves /.well-known/assetlinks.json and /.well-known/apple-app-site-association on your site, from what your Yallapp dashboard knows about your app (its package name, signing key fingerprints and Apple Team ID), so links like yoursite.com/a/course/12 open the app on phones that have it. Without the app, the same link takes the visitor to the course's own page on your site (or the home page when it has none or isn't public). The app's Share buttons share these links. Your site must be at the root of its domain, and your server must pass /.well-known to WordPress.
* The app's rating prompt and crash reports follow the switches on your Yallapp dashboard's Stability page.
* Offline lessons: with "Allow offline downloads" on (Settings › Video & content protection) and a plan with offline mode, students can save a lesson or a whole course in the app and watch and read it without the internet: the uploaded video, the lesson text and its images, and the attachments. The app keeps them encrypted and deletes them when the student's access ends (checked each time the app starts online, and after 30 days without a check). Lessons whose video plays from YouTube, Vimeo or another video site say they need the internet. The choice made on the Yallapp dashboard's Courses page, when there is one, replaces the setting.
* Download links for offline lessons are signed for the student and work for 15 minutes, separately from the video streaming links.
* A finished course says so in the app: the course page gets the student's progress, the completion date when the LMS keeps one (Tutor LMS, LearnDash; otherwise when the app completed the last lesson, or the certificate's date) and the certificate link where the LMS has certificates.

= 0.4.1 =
* A course on sale with WooCommerce shows its sale price in the app ("$250.00"). Before, the app showed WooCommerce's text for screen readers with both prices ("$300.00 Original price was: $300.00.$250.00Current price is: $250.00.").
* "Continue" in My courses goes to the next lesson or quiz. Before, it stopped at the first assignment, which opens on the website, for good.
* Tutor LMS: My courses leaves out a course Tutor no longer counts the student as enrolled in (for example an enrollment that has expired), the same as its lessons.
* LearnPress: a course bought while "Auto start" is off is in My courses and opens in the app, which starts it the way the website's "Start now" button does. Before, the app offered to buy it again.
* LearnPress: a course whose time limit is over stays closed in the app when the course blocks it then, as on the website; and a finished course stays closed when the course blocks finished courses.

= 0.4.0 =
* Settings show only what fits the app type you chose in the Yallapp dashboard: a Store app sees the shop's options, an academy the course options, and so on.
* Changes you save in the Yallapp dashboard reach your site at once: Yallapp asks the plugin to check its license again, with a signed request the plugin verifies. Before, they waited for the next check, up to 12 hours later.
* Eleven new page blocks work on your site: slider, quick links, testimonials, questions and answers, countdown, contact, opening hours, social links, team, numbers and notice. The plugin leaves out what your site can't open and a countdown that has ended, and translates every entry.
* Huawei push: apps built with Huawei push reach Huawei phones without Google Play services. Add your Huawei Push Kit details in Settings › Notifications.
* The store review account is never locked out by the device limit: its oldest device is signed out instead, so app reviewers and your own previews always get in.
* "My Courses" now reads "My courses".

= 0.3.8 =
* The app's home and tabs match the app type you chose in the Yallapp dashboard from the first start: a Store app on a site that also runs Tutor LMS shows the shop, not course lists it can't open. (The app tells the plugin its type; before, the plugin learned it at its next license check, up to 12 hours later.)
* The course page shows what students will learn, what the course includes, its requirements and who it is for (Tutor LMS and LearnPress), and how many students take it.
* The plugin tells the Yallapp dashboard which shop and booking plugins the site runs, so the dashboard can say when the app type doesn't fit the site.
* The app's built-in home (older apps) shows the latest courses when no featured courses are picked.

= 0.3.7 =
* Restaurant and café apps follow their orders: each WooCommerce order tells the app where it is (processing is "Preparing", completed and cancelled are themselves), and the app opens one order with `GET /me/orders/{id}`. The customer only ever sees their own orders.

= 0.3.6 =
* News & blog apps: your published posts are the app's articles, with their featured image, categories and author, on a home screen with the top stories (your sticky posts), the latest posts and a row per category, plus search. Private and password-protected posts never show. Articles look the way lessons do: pictures, YouTube and Vimeo videos and embeds are sized for the phone.
* Settings › Notifications › "Notify app users about new posts" (off by default): each new post goes to the app's notifications inbox and, with Firebase, to the phones of people signed in to the app. A post's "In the app" box can leave it out.
* Settings › News & blog: show or hide each article's author and date.
* Page blocks can list articles, top stories and categories, opened in the app.

= 0.3.5 =
* Email sign-in with a code: Settings › Sign-in › "Email sign-in works" can be "With a code by email". Yallapp emails a 6-digit code (from your own address when you set your email server in your Yallapp dashboard), and people without an account sign up with their email address when sign-up from the app is allowed. Codes are kept as a hash, for 5 minutes and 5 attempts, like phone codes. Staff accounts that can edit the site never sign in by code. The password stays the default.
* Your Yallapp dashboard's App sign-in page can choose this for you; its choice replaces the setting.

= 0.3.3 =
* The app type you chose in your Yallapp dashboard now decides the pages your app gets before you publish any, instead of a guess from the plugins on your site (a site with both an LMS and WooCommerce no longer gets academy pages for a Store app). The kind of business you chose is passed on to the app too.

= 0.3.2 =
* Store review access by email: Settings › Sign-in › Store review access has a test email address. With email sign-in, reviewers type it and the fixed code as the password, so apps that sign in by email only pass the store review too. It signs in to the account with that address (made when there is none and sign-up is allowed), never a staff account. The app preview signs in with it as well.

= 0.3.1 =
* Sign-in codes on every WordPress site: "Sent by Yallapp (WhatsApp)" is the new default. The plugin makes each code (6 digits, kept as a hash, valid for 5 minutes, 5 attempts) and Yallapp delivers it with your app's name. Digits' REST API add-on is no longer needed.
* Settings › Sign-in: choose who sends the codes, Yallapp or Digits (when its REST API add-on is installed). When the choice can't send codes, the other one does, and the page says why.
* Accounts are still found by Digits' phone number fields, so people who signed up with Digits sign in with the same number.
* The compatibility card explains Digits without its REST API add-on, and Digits is optional.
* Sign-in by email: people can sign in to the app with the email address and password of their account on your website (Settings › Sign-in, or the App sign-in page of your Yallapp dashboard, which wins when set). WordPress checks the password, with your security plugins; attempts are limited.

= 0.3.0 =
* WooCommerce stores and bookings (Amelia, LatePoint, BookingPress) in the app.
* The app names its owner when it's paused, with a contact button; plan features follow the app's plan.
* Preview your app from the Yallapp dashboard before it's built (CORS for the preview, preview sign-in with the review number).
* Digits is found by its plugin details, also in a renamed folder or when network-activated; its add-ons, such as Additional SMS Gateways, are listed on the settings page.

= 0.2.0 =
* LearnPress, LifterLMS, MasterStudy LMS, Sensei LMS and Masteriyo support.
* Notifications inbox, order history, course reviews and course Q&A in the app.
* The manual message on the settings page works without Firebase (it reaches the inbox).
* App pages: the layout published in the Yallapp dashboard (refreshed every 15 minutes or from the settings page), or default pages built from the site.

= 0.1.0 =
* First release: app API, settings page, Tutor LMS and Digits support, push notifications.
