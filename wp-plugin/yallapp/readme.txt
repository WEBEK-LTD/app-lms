=== Yallapp ===
Contributors: webek
Tags: lms, mobile app, tutor lms, digits, otp
Requires at least: 6.0
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.4.3
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Connects your WordPress academy to your Yallapp mobile apps.

== Description ==

Yallapp turns your WordPress academy into branded Android and iOS apps.
This plugin exposes your courses, lessons, quizzes and student sign-in to
your Yallapp apps through a secure REST API (`/wp-json/yallapp/v1`).

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
* Push notifications through Firebase for new lessons, announcements and enrollments.
* The pages, tabs, look and languages you publish in your Yallapp dashboard, filled with your own courses, products and posts.

= Privacy =

The plugin sends no student data to Yallapp. License checks and app layout updates
send only the license key, site URL, plugin version, WordPress version and LMS name
to yallapp.com.tr. When Yallapp sends the sign-in codes (the default), the plugin
also sends the phone number and the code to deliver; Yallapp sends the message on
WhatsApp and keeps neither. Codes are made on your site and kept there only as a
hash, for 5 minutes. Push notifications go through your own Firebase project.

== Changelog ==

= 0.4.3 =
* Your site's own addresses open the app too: the course and lesson pages (Academy apps), product and product category pages (Store apps), posts (News & blog apps) and the pages with your booking plugin's form (Bookings apps), as your permalinks make them. On iPhone, apple-app-site-association lists them after what always stays on the website: wp-admin, sign-in, the REST API, feeds, the home page and the cart, checkout, account and payment pages of WooCommerce, Tutor LMS, LearnPress, LifterLMS and Masteriyo (add others with the yallapp_link_excluded_page_ids filter). On Android, the paths that start with a fixed folder (/courses/, /product/, /blog/) are sent to Yallapp with the license check and open the app from its next build; posts whose permalinks start at the root (/%postname%/) open it on iPhone only.
* New endpoint GET /links/resolve tells the app what an address of the site is; anything the app doesn't show opens in its in-app browser.
* A site in a folder (example.com/learn) also serves the two link files under its own folder, for the domain's own server to copy: phones only read them at the root of the domain.
* Push notifications and the app's inbox carry the link they open (the course, or the post), in the same format as shared links.
* Screen protection for every app type: "Block screenshots & screen recording" moved to Settings › General, and academies choose what it protects: course content only (lessons, quizzes, attachments and videos) or the whole app. The app gets it as `app.screen_protection`. The choice made on the Yallapp dashboard's Screen protection page, when there is one, replaces the setting. New sites start with it off; sites that saved their settings keep their choice (course content, as before).
* Private courses: a course set to Private (Tutor LMS's "Visibility: Private", or WordPress's Private visibility with the other LMSs) stays out of the app's catalog, and shows in My courses and opens with its lessons for the students enrolled in it, however they were enrolled (bought, free or added by an administrator), and for its author, editors and administrators. Anyone else, with a direct link too, gets "not found", the course's free preview lessons included. Before, a private course disappeared from its students' app. Sensei LMS counts no one as enrolled in a course that isn't published, so there a private course stays closed to students, as on the website.
* A lesson of a private course links to the lessons before and after it for its students.
* Videos from your Yallapp Media library in lessons: paste a video's link from Media in your Yallapp dashboard into the lesson's new "Yallapp video" box (any LMS), or use it as the lesson's video address in your LMS. Once the LMS lets the student into the lesson, the app plays it in its own player, from a link made for that request that stops working after a few hours (the app asks for a new one and carries on where it was). Saving the lesson for offline viewing gets its own short-lived link. The video file never passes through your site.
* New [yallapp_video link="…"] shortcode: shows a Media video on the website, and in the app it is the lesson's video when the lesson has none of the above.
* The plugin asks Yallapp for these links with its license (POST /api/v1/licenses/media), and keeps one for other students while it has enough time left.

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
