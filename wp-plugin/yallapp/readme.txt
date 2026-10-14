=== Yallapp ===
Contributors: webek
Tags: lms, mobile app, tutor lms, digits, otp
Requires at least: 6.0
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.3.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Connects your WordPress academy to your Yallapp mobile apps.

== Description ==

Yallapp turns your WordPress academy into branded Android and iOS apps.
This plugin exposes your courses, lessons, quizzes and student sign-in to
your Yallapp apps through a secure REST API (`/wp-json/yallapp/v1`).

Works with Tutor LMS (Free and Pro), LearnPress, LifterLMS, MasterStudy LMS,
Sensei LMS and Masteriyo, and with Digits for one-time-code sign-in.

= What the app gets =

* Sign-in with a one-time code through Digits, sign-up, device limits and store review access.
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
to yallapp.com.tr. Push notifications go through your own Firebase project.

== Changelog ==

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
