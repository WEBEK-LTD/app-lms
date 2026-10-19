# Launch checklist (WEBEK)

What only the WEBEK team can do, because it needs our own accounts, money or
devices. Everything else is in the code. Tick each line when it's done.

## 1. Security first

- [ ] Revoke the GitHub runner registration token that was shared in a chat
      (GitHub › Settings › Actions › Runners: remove the runner and register it
      again with a new token).
- [ ] Rotate the iyzico sandbox keys that were shared in a chat (iyzico
      sandbox merchant panel › Settings › API keys) and only ever paste the new
      ones into the Yallapp admin.
- [ ] Never paste keys, tokens or passwords into chats, issues or commits.

## 2. Yallapp admin (`/admin`, signed in as a super admin)

- [ ] **Settings › Sign-in codes:** choose WABEK (the account's API key and the instance ID of the number that sends codes), the
      WhatsApp Cloud API (phone number ID and access token) or our SMS gateway,
      save, then **Send a test code** to your own number and **Check the code**.
- [ ] **Settings › Email (SMTP):** host, port, user, password and the sender
      address, then send the test email.
- [ ] **Settings › Yallapp iyzico account:** live API key and secret key (keep
      sandbox on until a test payment works).
- [ ] **Kashier account (Egypt):** open a merchant account at kashier.io
      (company documents, the bank account payouts go to). In the Kashier
      dashboard copy the merchant ID (MID-…) and create a Payment API key and
      a secret key, once in test mode and once in live mode (they differ).
      Never paste them anywhere but the Yallapp admin.
- [ ] **Settings › Yallapp's Kashier account:** merchant ID, Payment API key
      and secret key with **Test mode keys** on, then **Test connection**.
- [ ] **Fawaterk account (Egypt):** open a vendor account at fawaterk.com
      and copy the API key from the dashboard (Integrations), on staging
      first, then live (staging and live keys differ).
- [ ] **Settings › Yallapp's Fawaterk account:** the API key with
      **Staging key** on, then **Test connection**.
- [ ] **Settings › Yallapp's payment provider:** choose iyzico, Kashier or
      Fawaterk for shop sales through Yallapp (the marketplace). Plans have
      their own gateway since Phase 52 (next item).
- [ ] **Settings › Yallapp's plan payments (Phase 52):** the gateway for
      Yallapp's own plans and add-ons is **Kashier** unless changed here;
      everyone is charged in Egyptian pounds. Enter **EGP for 1 US dollar**
      (the exchange rate that turns pound prices into the dollar prices shown
      outside Egypt) and review it when the pound moves. Leave it empty only
      if every plan has its own dollar price.
- [ ] **Kashier and Fawaterk test payments, before going live:** with test
      keys, pay a plan and a shop order with their test cards and check that
      each is confirmed (the plan activates, the order shows on **Orders**).
      Our server confirms a payment only from the provider's own answer
      (Kashier: the session's payment; Fawaterk: getInvoiceData); if a paid
      test payment stays "not confirmed yet", send us what the provider's
      dashboard shows for it. Then save the live keys and turn the test
      switch off.
- [ ] **Test refunds on each provider (roadmap 47.9):** with test keys,
      refund a test order from **Orders** in part, then the rest: on iyzico
      once on the day it was paid (a cancel) and once on a later day (item
      refunds), on Kashier (its refund call; the secret key's role needs the
      refund permission), and record one made in Fawaterk's panel. Check the
      provider's panel shows each refund and that the order says
      **Refunded**; send us what the provider answered if one fails.
- [ ] **Kashier and Fawaterk webhooks:** nothing to set: each payment tells
      the provider its own webhook address
      (`/api/pay/kashier/…` and `/api/pay/fawaterk/…`). If Fawaterk's
      dashboard asks for a webhook address, leave it empty: each invoice
      carries its own, and the customer's return confirms the payment too.
- [ ] **Settings › Marketplace:** the commission percent Yallapp keeps from
      shops that sell through Yallapp's account. With Kashier or Fawaterk,
      the team transfers each released share to the shop's IBAN (listed on
      **Payments**).
- [ ] **Settings › Contact:** WhatsApp number and email shown on the website.
- [ ] **Settings › Publishing service:** the publishing team email clients
      invite to their store accounts ("Publish it for me"). Use a mailbox the
      team reads that is also a Google account (Play Console and Firebase
      invitations) and an Apple Account (App Store Connect invitations).
      Until it's set, clients are shown the contact email.
- [ ] **Emails:** read "Publishing status changed", "Publishing request
      (team)" and "Build problem (team)" once and change what we want
      different. Build problems go to every `SUPER_ADMIN_EMAILS` address.
- [ ] **Team:** give whoever publishes clients' apps the admin or support
      role (permission "publishing.manage").
- [ ] **Plans:** names, prices and periods of Starter, Growth, Pro and
      Business, and each plan's **Features and limits** (app users, languages,
      connected platforms, iOS, page editor, card payments, offline mode,
      automatic rebuilds, "We publish for you"); check the pricing page. Plan
      edits saved before Phase 13 kept only their price (the old Starter's
      moved to Growth): review the texts.
- [ ] **Plans › prices (Phase 52):** for each plan, **A price** or **On
      request**; the **Price in EGP** (what everyone is charged, shown in
      Egypt) and, if the rate's figure isn't the one we want, a **Price in
      USD** (shown everywhere else). Prices saved before Phase 52 in lira or
      euros were dropped (those plans show "On request" until priced in
      EGP); a dollar price was kept as the USD price. Then open the pricing
      page from Egypt and from elsewhere (or with a VPN) and check both.
- [ ] **Coupons (Phase 52):** fixed-amount coupons need an amount **Off in
      EGP** (Kashier charges pounds); amounts in lira or euros no longer
      apply. Percent coupons need nothing.
- [ ] **Emails:** check the five owner notices (app users at 80% and 100%,
      plan ending in 7 days, tomorrow and today).
- [ ] **Team:** invite the rest of the team with the right role (admin,
      support or viewer); only owners manage the team.
- [ ] **Defaults for new apps** (Settings), **Switches**, **Website content**
      and **Emails:** check each once and change what we want different.

## 3. Hosting and builds

- [ ] Netlify variables in `platform/web/README.md` (database, encryption key,
      signing secrets, `FILES_*`, `BUILD_PIPELINE_TOKEN`, `INTERNAL_JOB_SECRET`).
- [ ] The daily job (13.4): after the first production deploy with
      `INTERNAL_JOB_SECRET` set, Netlify › Logs › Functions shows
      `daily-notices` as a scheduled function; its next run logs a JSON report.
      To try it at once: `curl -X POST -H "Authorization: Bearer $INTERNAL_JOB_SECRET" https://yallapp.com.tr/api/internal/daily`.
- [ ] The webhook job (49): Netlify › Logs › Functions shows `api-webhooks`
      running every 5 minutes (account deletion notices to apps' own APIs
      tried again). To try it at once: `curl -X POST -H "Authorization: Bearer $INTERNAL_JOB_SECRET" https://yallapp.com.tr/api/internal/webhooks`.
- [ ] `files.yallapp.com.tr`, GitHub secrets and variables: `build/README.md`
      › One-time setup.
- [ ] GitHub › Settings › Billing: keep the Actions budget (USD 20) and watch
      the macOS minutes the iOS builds use.

## 4. Publishing for clients (Phase 14)

- [ ] Decide which plans include "Publish it for me" and its price. Until
      the plan flag "managed publishing" exists, every app can ask for it:
      `canUseManagedPublishing` in `platform/web/src/lib/publishing/steps.ts`
      returns true for now.
- [ ] Our own Apple Account for the publishing team email, with two-factor
      authentication on a team phone (App Store Connect invitations need it).
- [ ] Never accept a client's Google or Apple password: only invitations.
- [ ] 35 A Samsung account for the publishing team email, so we can accept
      Galaxy Store Seller Portal manager invitations (clients invite it as a
      manager for applications).
- [ ] 36 A HUAWEI ID for the publishing team email, so we can join clients'
      AppGallery Connect teams (App administrator and Operations roles).
- [ ] 42 A Xiaomi account (and developer account) for the publishing team
      email, so clients can add it as a member who manages their apps on the
      Xiaomi developer platform.

## 5. Demo apps on yallapp.com.tr/demo (Phase 16)

- [ ] Make `demos@yallapp.com.tr` a mailbox (or forward it) the team reads:
      it owns the demo apps, and build emails go there. Don't create an
      account with it yourself.
- [ ] **Team:** demo apps need the permission "demos.manage" (owners and
      admins have it).
- [ ] **Admin › Demo apps › Create the demo apps.** It makes the four apps
      with their content, pages and a Business license that doesn't end. If
      it stops halfway (a slow database), press **Refresh** on each app: it
      updates, never duplicates. Press it again whenever the demo content in
      the code changes.
- [ ] Open `https://yallapp.com.tr/demo`: the four demos show the sign-in
      number and code, with "Coming soon" until a download is picked.
- [ ] **Build them:** once `build/README.md` › One-time setup is done, press
      **Start a build** on each demo app. When the build is ready, choose it
      under **Public download** and **Save**: /demo then shows "Download for
      Android" and its QR code instead of "Coming soon". Scan the QR code with
      an Android phone, install, and sign in with **+1 202 555 0123** and the
      code **246810**.
- [ ] **iPhone demos** are by request: add the person's Apple Account to the
      demo app's TestFlight in App Store Connect (an App Store Connect key on
      the demo app in its dashboard, then a new build, uploads it).
- [ ] After each change to the demo content, refresh the apps; to update the
      APK, build again and pick the new build.
- [ ] What visitors add is deleted by the daily job after a day: check the
      daily job's JSON report shows `"demo": {"apps": 4, ...}`.

## 6. The app preview (Phase 17)

Nothing to set on Netlify: the preview is served from the site's own files
(`platform/web/public/preview-app`) and signs its links with `SIGNING_SECRET`.

- [ ] **Release a new Yallapp plugin** (Admin › App & plugin versions) with
      Phase 17's plugin changes, so WordPress clients can sign in to the
      preview with their store review number. Older plugins still show their
      site in the preview, with sign-in marked as working in the installed app.
- [ ] Open **Preview your app** in a test client's dashboard on
      `https://yallapp.com.tr` and on a phone through its QR code: the app
      loads in the phone frame, Light / Dark and the languages switch, and the
      store review number signs in.
- [ ] After a change to the app (`mobile/`), run `mobile/tool/build_preview.sh`
      and commit `platform/web/public/preview-app`; CI fails until it's done.

## 7. Sign-in for every app (Phase 18)

- [ ] **Production must have a sign-in code sender.** Settings › Sign-in codes
      (step 2) set to WABEK on yallapp.com.tr: WordPress sites now send their
      codes through it by default ("Sent by Yallapp"), and without it every
      code fails with "We could not send a code". Send a test code after
      saving.
- [ ] **Production must have SMTP** (Settings › Email, step 2): apps on the
      hosted API that offer email sign-in send their codes by email.
- [ ] **Emails › Sign-in code:** read it once. It goes to app users in the
      app's name, without Yallapp's signature.
- [ ] **Release plugin 0.3.3** (Admin › App & plugin versions) with the
      changelog from `wp-plugin/yallapp/readme.txt`. Sites update from the
      WordPress updater.
- [ ] On the client site with Digits 8.3.3.2 and Additional SMS Gateways (no
      REST API add-on): update the plugin, check that the Compatibility card
      says codes are sent by Yallapp, sign in to the app with an existing
      Digits number, and see the count on the admin's client page ("Sign-in
      codes sent today").
- [ ] Try **App sign-in** on a test WordPress app: choose "Phone number or
      email address", press **Check now** in the plugin, and sign in to the
      app with a WordPress email and password.
- [ ] Optional, for a client who wants codes from their own number: their
      WABEK API key and instance ID on **App sign-in**, then **Send a test
      code**.

## 7a. Your app's own email (Phase 24)

- [ ] **Release plugin 0.3.5** (Admin › App & plugin versions) with the
      changelog from `wp-plugin/yallapp/readme.txt`. WordPress sites need it
      for "Email sign-in works: with a code by email".
- [ ] **Emails › Own email server failed:** read it once. It goes to the
      owner, at most once a day per app.
- [ ] Try **App sign-in › Your app's email** with a real mailbox (a Gmail
      account with an App password is quickest): save, **Send a test email**,
      and sign in to a hosted test app by email; the code comes from that
      address. Then change the password to a wrong one and check that the
      code still arrives from Yallapp's address, the page shows the warning
      and the owner gets one email.
- [ ] On a test WordPress app: choose email with a code on **App sign-in**,
      press **Check now** in the plugin, and sign up in the app with a new
      email address.

## 7b. News & blog apps (Phase 23)

- [ ] **Release plugin 0.3.6** (Admin › App & plugin versions) with the
      changelog from `wp-plugin/yallapp/readme.txt`. WordPress news sites need
      it for their articles and "Notify app users about new posts".

## 7c. Restaurants and cafés (Phase 26)

- [ ] **Release plugin 0.3.7** (Admin › App & plugin versions) with the
      changelog from `wp-plugin/yallapp/readme.txt`. WordPress restaurants
      need it for their order's steps in the app (`fulfilment_status`) and
      `GET /me/orders/{id}`.
- [ ] **Admin › Demo apps › Refresh all demo apps** to add Defne Café, then
      start its build and pick it for `/demo/download/restaurant`.
- [ ] On a hosted test café: add a dish with options, set **Pickup and
      delivery**, order from a phone (iyzico sandbox) and move the order on
      the **Kitchen** page; each step should reach the phone as a push.

## 7d. WordPress apps follow their type (Phase 30)

- [ ] **Release plugin 0.4.2** (Admin › App & plugin versions; it
      includes 0.3.8 to 0.4.1) with the changelog from `wp-plugin/yallapp/readme.txt`.
      Clients whose app type
      doesn't match the plugins on their site need it for the right tabs and
      home, and the dashboard needs it to say what their site runs.
- [ ] Ask clients with a WordPress app to open **Set up › Website**: a
      warning there means the app type doesn't fit their site (for example a
      Store app on a site that only runs Tutor LMS); **Change the app type**
      fixes it.

## 7e. Samsung Galaxy Store and Huawei AppGallery (Phases 35, 36)

- [ ] Apply migration `0031_more_android_stores.sql` (store keys on apps,
      the push provider of hosted devices, the extra stores of publishing
      requests).
- [ ] **Release the next plugin version** with Huawei Push Kit (the devices
      table gets `push_provider`, database version 4): WordPress clients with
      Huawei push enter the app ID and app secret on the plugin's settings page.
- [ ] Before telling clients: one real Galaxy Store update and one real
      AppGallery update through the pipeline (section 8), and one push to a
      Huawei phone without Google Play from the hosted API and from WordPress.

## 7f. Xiaomi GetApps (Phase 42)

- [ ] Apply migration `0034_xiaomi_getapps.sql` (the Xiaomi keys and what's
      new on apps; the Xiaomi track of a publishing request needs nothing new).
- [ ] Before telling clients: a Xiaomi developer account with a test app
      already on GetApps (first version submitted by hand), its API private key
      and public certificate from the automatic publishing page saved in a
      test client's dashboard, and one real update through the pipeline
      (section 8, 42.7). Check in Xiaomi's console that it arrived in review
      with the right name, icon and what's new.
- [ ] Find out whether apps on Xiaomi's international developer site
      (global.developer.mi.com) have the automatic publishing page too, and
      fix the guide's wording if they don't.

## 7g. Links that open the app, the rating prompt and crash reports (Phase 46)

- [ ] Apply migration `0036_app_links_crashes.sql` (the fingerprints, the
      Team ID, the last link check and the two switches on apps; the crash
      groups and the runs per day).
- [ ] Apply migration `0035_analytics.sql` (Phase 44: usage events and daily
      totals) before 0036, and `0037_api_webhooks.sql` (Phase 49: the signed
      `account.deleted` notices to own-API apps) after it.
- [ ] Reinstall the reverse proxy config (`platform/web/deploy/apache-proxy.conf`):
      `/.well-known/assetlinks.json` and `/.well-known/apple-app-site-association`
      must reach Netlify, while the rest of `/.well-known` stays on the server
      for AutoSSL. Then `curl -i https://yallapp.com.tr/.well-known/assetlinks.json`
      answers 200 with `application/json`, without a redirect.
- [ ] Set `LINKS_PLUGIN_VERSION` in `platform/web/src/lib/links/fallback.ts`
      to the plugin release that ships the link files, and **release that
      plugin version** (readme.txt "Unreleased"): until then links of
      WordPress apps show Yallapp's link page instead of the site's.
- [ ] Each owner enters the **Play App Signing key's SHA-256 fingerprint** on
      Publishing › Links to your app (Play Console › App integrity › App
      signing). Without it the app from Google Play opens links in the
      browser; APKs from Builds & downloads and the other Android stores
      (signed with the upload key) work once a build has reported the upload
      key's fingerprint. With "Publish it for me", our team enters it.
- [ ] iPhone apps need the **Apple Team ID**: the next iOS build reports it
      (and adds the Associated Domains capability to the App ID); for apps
      published by hand the owner enters it on the same page. Rebuild every
      app once so the builds carry the link hosts and the crash report address.
- [ ] On a real Android phone and iPhone: a shared course link opens the app
      (installed from the store), and opens the site or the link page without
      it; "Check links" is green for a WordPress client.
- [ ] Watch Admin › Crashes after the first rebuilt versions reach people,
      and the owner's Stability card.

## 7h. Yallapp's prices in pounds and dollars (Phase 52)

- [ ] Apply migration `0038_yallapp_prices.sql` (the account's country on
      clients; the dollar price shown on plan payments), then
      `0039_refunds_time_zone.sql` (Phase 47: refunds of payments, and each
      app's time zone for its analytics).
- [ ] **Yallapp's Kashier account:** live merchant ID, Payment API key and
      secret key in Settings › Yallapp's Kashier account (encrypted there;
      never in the repository or Netlify files), **Test connection**, then a
      test payment of a plan with Kashier's test card from outside Egypt:
      the page says "You'll be charged EGP … (about $…)", Kashier's page
      shows pounds, and the receipt (License › Payments › Receipt) shows the
      amount in pounds and the dollar price.
- [ ] **Set the EGP and USD prices and the rate** (Settings › Yallapp's
      plan payments, then Plans), as in section 2.
- [ ] **The visitor's country through the reverse proxy:** install
      `mod_maxminddb` and the GeoLite2 Country database (with `geoipupdate`)
      on the server, reinstall `platform/web/deploy/apache-proxy.conf`, and
      check that a visit from Egypt shows pounds and one from elsewhere
      dollars. Until then the proxy sends no country and prices follow the
      browser's language region (Arabic set to Egypt shows pounds), else
      dollars.
- [ ] Clients who signed up before Phase 52 have no country saved: their
      dashboard follows the request's country like a visitor's.

## 7i. Plugin 0.4.3 (Phases 47 to 53)

- [ ] **Release plugin 0.4.3** (Admin › App & plugin versions) with the
      changelog from `wp-plugin/yallapp/readme.txt`: the site's own links
      open the app, private courses for their students, and screen
      protection in Settings › General for every app type.
- [ ] On a test site with Tutor LMS, set a course to Private, enrol a
      student and check that the app shows the course in My courses and
      opens its topics and lessons, while another account gets "not found".
- [ ] On real phones, turn on **Block screenshots & screen recording** and
      check that a screenshot and a screen recording of a lesson come out
      blank (Android), or that the lesson is hidden in recordings and a
      screenshot shows the notice (iPhone).

## 7j. Videos and pictures hosted by Yallapp (Phase 51)

Owners' media lives on our own host (the one behind yallapp.com.tr) and its
records and storage in our MariaDB. The platform on Netlify never carries
the bytes: the media gate on the host takes the uploads and plays the files.

- [ ] Apply migration `0040_media_storage.sql` (`media_files`,
      `storage_packs`, and `purpose` and `storage_packs` on `plan_payments`),
      after `0038_yallapp_prices.sql` and `0039_refunds_time_zone.sql`.
- [ ] **The media folder:** create `/home/CPANEL_USER/yallapp-media`, outside
      `public_html`, writable by the account PHP runs as, on a disk with room
      for the plans' storage (Starter 2 GB … Business 500 GB per app, plus
      packs). Include it in the server's backups.
- [ ] **The media gate:** copy `platform/web/deploy/media-host/index.php` and
      `.htaccess` to a `media/` folder in yallapp.com.tr's document root, and
      `config.sample.php` there as `config.php` with `signing_secret`
      (`openssl rand -hex 32`) and `storage_dir`. Never commit config.php.
- [ ] Reinstall the reverse proxy config (`platform/web/deploy/apache-proxy.conf`):
      `ProxyPass /media/ !` keeps `/media/*` on the host, above `ProxyPass /`.
      Then `curl -i https://yallapp.com.tr/media/v/x` answers 404 from the gate
      (plain text "Not found."), not from Netlify.
- [ ] Optional, for less PHP work per video: install **mod_xsendfile**, add
      `XSendFile On` and `XSendFilePath /home/CPANEL_USER/yallapp-media` for
      the `media/` folder, and set `'x_sendfile' => true` in config.php; Apache
      then sends the files and answers range requests itself. Without it, PHP
      streams each range in 256 KB pieces (check `max_execution_time` doesn't
      cut long downloads: the gate calls `set_time_limit(0)`).
- [ ] In Netlify: `MEDIA_BASE_URL=https://yallapp.com.tr/media` and
      `MEDIA_SIGNING_SECRET` (the same value as `signing_secret`). Redeploy,
      then Admin › Settings › Server shows "Media library: Our server" and
      **Check the media server** answers that it accepts our signed links.
- [ ] Uploads come in 5 MB chunks: Apache's `LimitRequestBody` (7 MB in the
      proxy config and the gate's .htaccess) must stay above that, and PHP's
      `upload_max_filesize`/`post_max_size` don't apply (chunks are raw PUT
      bodies read from `php://input`).
- [ ] Admin › Plans: check each plan's **Storage (GB)** and set the storage
      packs' monthly prices like the plans' (section 7h): in Egyptian pounds,
      charged through Yallapp's Kashier account, with an optional US dollar
      price shown outside Egypt (empty: the pounds at the rate). Without a
      pound price the team adds packs by hand on the client's page. Storage
      packs saved before Phase 52's prices have no price until set again.
- [ ] Try it on the live site: upload a 1 GB video in Media, pause and resume
      it, pick it for a lesson, watch it in a rebuilt app (seek, leave it paused
      for over 4 hours and resume: the link renews), save it for offline
      viewing, and buy a storage pack with a test card.
- [ ] WordPress: release plugin 0.4.4 with the "Yallapp video" box and
      `[yallapp_video]` (readme.txt), and try a Tutor LMS lesson with a media
      link on a phone.

## 8. Accounts the remaining roadmap steps wait on

| Step | What we need |
|---|---|
| 0.5, 2.x, 3.x | A staging WordPress site with Tutor LMS, WooCommerce and sample lessons (Digits optional), and an Android phone to install the test APK |
| 18.x | The client site with Digits 8.3.3.2 (no REST API add-on), WABEK set as the production code sender, and SMTP |
| 4.5 | A test client going from sign-up to activation on the live site |
| 5.2–5.4, 7.3, 7.6 | A real build of each app type: Apple Developer and App Store Connect, Google Play Console |
| 6.1, 6.2 | A client site on LearnPress or LifterLMS |
| 6.4 | A real LearnDash site (LearnDash isn't on wordpress.org) |
| 8.1 | A client API that passes the dashboard's live check |
| 8.3 | A WABEK API key (or our WhatsApp Cloud API number, or an SMS gateway) |
| 8.4 | A Shopify development store (Storefront token, and an Admin API token for order history) |
| 8.5 | A test account on each platform: ikas, Ticimax, IdeaSoft, Teachable (Growth plan), Thinkific (Grow plan), SimplyBook.me (API feature) |
| 8.6, 9.4, 9.5 | An iyzico sandbox account, then the live account |
| 37 | Kashier and Fawaterk test accounts (then live ones): a plan payment and a shop order paid with each provider's test card, confirmed on the live site |
| 10.5–10.7 | A WordPress test site and a Real estate test app built on the hosted API, to see published pages, languages and listings on a phone |
| 14.2, 14.3 | A first client who asks us to publish: their Google Play and Apple developer accounts inviting the publishing team email |
| 17.7 | A WordPress test site with the new plugin, and a phone, to try the preview of a WordPress app and its QR code |
| 22.5 | A Wix test site with Wix Stores (Catalog V3): a Headless OAuth app's client ID, and an account API key that reads orders and contacts with the site ID |
| 35.4 | A Galaxy Store Seller Portal account (commercial seller) with a test app already on sale, and a service account with the Publishing scope: one build uploaded and submitted by the pipeline |
| 36.5, 36.6 | An AppGallery Connect account with a test app (first version submitted by hand), a Connect API client (App administrator), Push Kit on, and a Huawei phone without Google Play to install the build and receive a push |
| 42.7 | A Xiaomi developer account with a test app already on GetApps, its automatic publishing API private key and public certificate: one build checked with `/dev/query`, uploaded and submitted by the pipeline |
| 25.5 | Yallapp's partner apps: a Salla Partners app (custom mode, callback `/oauth/salla`, webhook `/api/webhooks/salla`) and a Zid Partner Dashboard app (redirect `/oauth/zid`), saved in admin Settings, plus a Salla demo store and a Zid test store to connect |
