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

## 1a. Security review (Phase 69)

The code changes of the review deploy by themselves (ROADMAP, Phase 69).
These are the parts on our servers and consoles.

- [ ] **GitHub › Settings › Actions › General › "Approval for running fork
      pull request workflows from contributors":** choose **Require approval
      for all external contributors**. The repository is public and our own
      runners (`LINUX_RUNNER`, on host.webek.org) also build clients' apps with
      the pipeline's secrets; the workflows now send pull requests from forks
      to GitHub's runners, and this approval is the second lock. Approve a
      stranger's pull request only after reading what it changes.
- [ ] **Our runners:** they run on host.webek.org, next to the database, the
      media files and the build files, and keep their home folder between
      jobs. When there is a budget for it, move them to a machine of their
      own (a small VPS is enough). Until then, after any doubt about a job
      that ran there (for example a stranger's pull request that ran before
      this change), start them clean: `systemctl stop 'yallapp-runner-*'`,
      `podman volume rm yallapp-runner-1-home yallapp-runner-1-tools
      yallapp-runner-2-home yallapp-runner-2-tools`, remove the runners in
      GitHub › Settings › Actions › Runners, and run
      `RUNNERS=2 bash /root/yallapp-runner.sh` again with a new registration
      token.
- [ ] **Netlify › Environment variables:** `TRUSTED_PROXY_SECRET` is set (32
      characters or more, `openssl rand -hex 32`) and the Apache proxy sends
      the same value (`deploy/apache-proxy.conf`). Without it every visitor
      reaches Netlify from the proxy's address, so one person's wrong
      passwords lock everyone out of signing in for 15 minutes.
- [ ] **Netlify › Environment variables:** `BUILD_PIPELINE_TOKEN` (the same in
      GitHub's secrets) is 32 characters or more (`openssl rand -hex 32`); the
      platform checks the length of the other secrets but not of this one,
      which reads every client's signing keys. Change it if it is shorter
      (Netlify, then GitHub › Settings › Secrets › `BUILD_PIPELINE_TOKEN`).
- [ ] **Admin accounts:** the admin has no second sign-in step yet. Everyone
      in `SUPER_ADMIN_EMAILS` and on Admin › Team uses a long password used
      nowhere else (a password manager), and people who left are removed from
      Admin › Team the same day.
- [ ] **After deploying:** `curl -sI https://yallapp.com.tr/faq` shows
      `content-security-policy: base-uri 'self'; object-src 'none';
      frame-ancestors 'none'` (the proxy passes it through), and
      `https://yallapp.com.tr/media/config.php`,
      `https://files.yallapp.com.tr/config.php` and
      `https://yallapp.com.tr/media/` answer 403 or 404, never a file or a
      list.
- [ ] **Plugin:** the next plugin release (Admin › Plugin releases, after this
      change and plugin 0.4.6 are merged) carries the access token fix
      (ROADMAP 69.6); sites pick it up as an update.

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
- [ ] **Settings › Contact (Phase 72):** the two WhatsApp numbers (outside
      Egypt: +90 544 673 19 42; in Egypt: +20 104 256 0010, the default until
      saved) and the email shown on the website, the dashboard and emails.
      Open the form and save once so both numbers are stored. If the team
      edited the Terms, Privacy or Refund pages in **Website content**, add
      the Egyptian number there too ({{contact_whatsapp_egypt}}) and the
      new payments paragraph of the Terms (each business uses its own
      payment provider account; Yallapp isn't a party to those sales).
- [ ] **No marketplace (Phase 72):** shops that sold through Yallapp's
      account now take no payments until they add their own keys on their
      Products page: tell them. Release and refund the marketplace orders
      still open from **Payments** as before.
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
- [ ] The frequent job (61): Netlify › Logs › Functions shows `frequent-jobs`
      running every 5 minutes (app notifications sent later whose time came,
      announcements that started pushed to the owners' phones). It needs the
      same `INTERNAL_JOB_SECRET`. To try it at once: `curl -X POST -H "Authorization: Bearer $INTERNAL_JOB_SECRET" https://yallapp.com.tr/api/internal/frequent`
      (a JSON report: `notifications` sent, waiting, cancelled, failed;
      `announcements` pushed).
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
- [ ] **Where the gate lives (as set up live):** yallapp.com.tr is proxied to
      Netlify, and without root access the proxy's `ProxyPass /media/ !` can't
      be added, so `/media` reached the platform's own route (its plain "Not
      found."). The gate therefore lives on the files subdomain, which isn't
      proxied: `public_html/files.yallapp.com.tr/media/` (its own `.htaccess`
      takes over from the files host's), with `'allowed_origin' =>
      'https://yallapp.com.tr'` in config.php for the dashboard's uploads, and
      `MEDIA_BASE_URL=https://files.yallapp.com.tr/media`. Check:
      `https://files.yallapp.com.tr/media/ping` answers "Yallapp media gate 2".
      The gate allows that address with and without `www.` (the dashboard
      answers on both); copy the current `index.php` over an older one, or
      uploads from www.yallapp.com.tr are refused by the browser (CORS: "No
      'Access-Control-Allow-Origin' header").
- [ ] In Netlify: `MEDIA_BASE_URL` (above; `https://yallapp.com.tr/media` only when the proxy keeps /media on the host) and
      `MEDIA_SIGNING_SECRET` (the same value as `signing_secret`). Redeploy,
      then Admin › Settings › Server shows "Media library: Our server" and
      **Check the media server** answers that it accepts our signed links.
- [ ] Uploads come in 5 MB chunks: Apache's `LimitRequestBody` (7 MB in the
      proxy config and the gate's .htaccess) must stay above that. Since
      Phase 64b chunks are raw POST bodies read from `php://input`, so PHP's
      `post_max_size` must be at least 8M (cPanel › MultiPHP INI Editor);
      `upload_max_filesize` doesn't apply.
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
- [ ] WordPress: release plugin 0.4.5 (private courses in the wishlist, password
      courses shown with "Open on the website"; readme.txt) and try a Tutor
      LMS course with a password in a rebuilt app.
- [ ] Phase 62: copy the new `index.php` (an app's folder removed and the
      folders listed, links bound to a student). Bound links need the app's
      `Authorization` header in PHP: add `CGIPassAuth On` for the `media/`
      folder (or `SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1`), then
      play a lesson video from a rebuilt academy app on a hosted course: it
      plays, and its link copied to a browser answers "This link is for
      another student." After the first daily job, Admin's logs show no
      "app folders have no app in the database" line.
- [ ] **Phase 64b: copy the new `index.php` again** (the `.htaccess` is
      unchanged). It is required before the platform with Phase 64b goes
      live, since every link the platform signs now ends in
      `/<media id>/<ext>` (e.g. `/media/u/<app>/<id>/jpg`) instead of
      `/<media id>.jpg`: on LiteSpeed and nginx cPanel hosts a static-file
      handler in front of PHP answers paths ending in `.jpg`, `.mp4`, `.pdf`…
      itself (404) and never passes them to the gate, so every upload ended in
      "The connection keeps dropping". The new gate also takes chunks by
      `POST` with any content type (firewalls refuse `PUT` and
      `application/offset+octet-stream`) and the offset in the query when a
      proxy drops the `Upload-Offset` header. Links signed before keep
      working. Then Admin › Settings › Server › **Check the media server**:
      it reaches the gate, signs a stat, sends a test upload by POST as the
      dashboard does, checks it and removes it (a few bytes in a folder of
      its own), and names the step that failed with its HTTP status and what
      to do.
- [ ] Then upload a picture and a 20 MB video in Media from the dashboard and
      from Yallapp Business, and play the video in a rebuilt app.

### If uploads fail

- [ ] First open `https://yallapp.com.tr/media/ping`: it must answer
      "Yallapp media gate 2". "Not found." there means the media folder still
      has an older index.php (copy the current one; clear LiteSpeed's cache or
      OPcache if the size on disk is already the new one). Every answer of the
      current gate carries the `X-Yallapp-Media-Gate: 2` header.

"Check the media server" says which step failed. Most often:

- **HTTP 404 on the signed steps** ("the server answers these paths
  itself"): the old `index.php` is still there, or a static-file handler
  in front of PHP takes the paths. Copy the new `index.php`; links without a
  file extension at the end then reach it. Keep the `.htaccess` rewrite as
  it is (every request under `/media` to `index.php`).
- **HTTP 403, 406, 405 or 501 on the upload (step 4)** with a page that isn't
  the gate's plain text: a server firewall.
  - **ModSecurity** (cPanel › Security › ModSecurity): turn it off for
    yallapp.com.tr, or ask the host to allow GET, HEAD, POST, PUT and DELETE
    to `/media` and the `application/octet-stream` content type. With the
    OWASP Core Rule Set the usual rules are 911100 (method not allowed) and
    920420 (content type not allowed); with the Comodo rules, the rule ID in
    the domain's ModSecurity hits (cPanel › Metrics › Errors, or the host's
    `modsec_audit.log`). A per-path exception:
    `<LocationMatch "^/media/">SecRuleRemoveById 911100 920420</LocationMatch>`
    in the domain's include, by the host.
  - **Imunify360** (WHM › Plugins › Imunify360 › Firewall/WAF): find the
    `/media` requests in the incident list and whitelist that rule ID for
    the domain, or disable the WAF rule for `/media`.
  - **LiteSpeed**: LiteSpeed reads ModSecurity rules from `.htaccess`/the
    server config the same way; check Server › Security › Request Filter
    too, and that "Max Request Body Size" is above 7 MB.
- **HTTP 403 "This link is not valid."**: `signing_secret` in `config.php` and
  `MEDIA_SIGNING_SECRET` in Netlify differ.
- **HTTP 503**: `storage_dir` in `config.php` doesn't exist or isn't writable
  by the cPanel account PHP runs as.
- **Lesson videos for one student refused** (403 "This link is for another
  student." although it's theirs): `CGIPassAuth On` may not be supported on
  LiteSpeed; use instead, in the media folder's `.htaccess`:
  `SetEnvIf Authorization "(.+)" HTTP_AUTHORIZATION=$1`.

## 7k. Yallapp Business: the Owner API and pushes to the owners' phones (Phase 58)

The server side of Yallapp's own app for app owners (`docs/api/owner.yaml`,
`https://yallapp.com.tr/api/owner/v1`). The app itself is Phase 59.

- [ ] Apply migration `0043_yallapp_business.sql` (`owner_devices`: one row
      per signed-in phone, the hash of its refresh token, its push token and
      choices), after `0042_dashboard_languages.sql`.
- [ ] **A Firebase project for Yallapp Business**, under Yallapp's own Google
      account (not a client's): add the Android app (package name of
      Yallapp Business) and the iOS app (its bundle ID) and keep their
      `google-services.json` and `GoogleService-Info.plist` for Phase 59;
      upload the APNs authentication key (Apple Developer › Keys, under
      Yallapp's own team) in Project settings › Cloud Messaging.
- [x] A service account key in that project, set in Netlify as
      `OWNER_PUSH_FIREBASE_SERVICE_ACCOUNT` (the whole key file, with
      `project_id`, `client_email` and `private_key`; `google-services.json`
      isn't it, and the server logs "isn't a Firebase service account key").
      Never commit it. Redeploy. Done live on 21 October 2026 with a
      dedicated account, `yallapp-owner-push@yallapp-business.iam.gserviceaccount.com`,
      whose only role is **Firebase Cloud Messaging API Admin**. The
      organization blocks key creation (`iam.disableServiceAccountKeyCreation`,
      Secure by Default), and Netlify can't sign in without a key, so the
      policy was lifted for the `yallapp-business` project only
      (`gcloud org-policies set-policy` with `enforce: false`), the key made,
      and the policy put back (`gcloud org-policies delete
      iam.disableServiceAccountKeyCreation --project yallapp-business`). The
      key keeps working; repeat the same steps to rotate it.
- [ ] Optional, for Huawei phones without Google Play: an AppGallery Connect
      project for Yallapp Business with Push Kit on, and
      `OWNER_PUSH_HMS_APP_ID` and `OWNER_PUSH_HMS_APP_SECRET` in Netlify.
- [ ] Check `YALLAPP_OWNER_PUSH_DIR` is not set on Netlify (it is ignored
      there; it's for local runs).
- [ ] After the app exists: sign in on a phone with a client account, allow
      notifications, place a test order in that client's app and check the
      push arrives in English, then switch the dashboard to Arabic and
      check the next one is in Arabic; sign the phone out from Dashboard ›
      Your phones and check the app is signed out.
- [ ] (61) Apply migration `0044_scheduled_notifications.sql` after `0043`:
      the `scheduled_notifications` table, `announcements.pushed_at`
      (announcements that already started are marked pushed, so the frequent
      job never pushes old ones), and indexes for today's numbers. Then check
      the frequent job above runs, schedule a notification for a few minutes
      ahead in a test app (Dashboard › App notifications › Later) and check
      it arrives once; create an announcement that starts in 10 minutes and
      check the phone gets it when it starts.

## 7l. Yallapp Business in the stores (Phases 59, 65)

Yallapp Business (`business/`) goes to Google Play and the App Store under
**Yallapp's own** accounts, never a client's. The workflow **Yallapp Business
release** does the building, signing and uploading; these steps are what only
we can do. Where it says "add a secret" or "add a variable": GitHub › this
repository › Settings › Secrets and variables › Actions › the **Secrets** or
**Variables** tab › New repository secret / variable. Paste values exactly,
never in a chat or an issue.

### Accounts (once)

- [ ] **Google Play**: play.google.com/console › create a developer account
      as an **organization** (Yallapp's company, its D-U-N-S number, the
      USD 25 fee, a website and a contact email). Organizations skip the 14-day
      closed test that personal accounts need.
- [ ] **Apple**: developer.apple.com/programs › Enroll as an
      **organization** (needs the D-U-N-S number, the legal entity's name and
      the yearly fee; Apple may call to check). Turn on two-factor
      authentication on a team phone.

### Google Play: the app and its keys

- [ ] Play Console › Create app: name **Yallapp Business**, default language
      English (United States), App, Free.
- [ ] The upload key is made by the workflow itself, so nobody ever holds it.
      Make a token: GitHub › your picture › Settings › Developer settings ›
      Personal access tokens › Fine-grained tokens › Generate new token: name
      `yallapp-release-key`, resource owner **WEBEK-LTD**, 7 days, only the
      `app-lms` repository, Repository permissions › **Secrets: Read and
      write**. Add it as the repository secret `YB_SECRETS_TOKEN`. The first
      run makes the key and saves it as the four `YB_ANDROID_*` secrets
      (`YB_ANDROID_UPLOAD_KEYSTORE`, `YB_ANDROID_KEYSTORE_PASSWORD`,
      `YB_ANDROID_KEY_ALIAS`, `YB_ANDROID_KEY_PASSWORD`); after it, delete the
      secret and the token. With Play App Signing (on by default) a lost upload
      key can be reset from Play Console › Test and release › App integrity.
- [ ] Run the workflow once (below) with **android**. Its App Bundle is on the
      **Yallapp Business test build** pre-release as `yallapp-business.aab`.
- [ ] **First upload by hand** (Google Play accepts nothing else for a new
      app): Play Console › Yallapp Business › Test and release › Testing ›
      Internal testing › Create new release › upload `yallapp-business.aab` ›
      Next › Save and publish. Add the team's emails as internal testers.
- [ ] **Google Play sign-in without a key file** (Workload Identity
      Federation; key files are blocked by the organization policy
      `iam.disableServiceAccountKeyCreation`, and none is needed). The
      release service account is
      `yallapp-play-release@yallapp-business.iam.gserviceaccount.com`; it
      needs **no** project roles. Google Cloud console › project
      **yallapp-business** › Activate Cloud Shell (top right), then paste:

      ```sh
      PROJECT_ID=yallapp-business
      PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
      SA=yallapp-play-release@$PROJECT_ID.iam.gserviceaccount.com
      gcloud services enable iam.googleapis.com iamcredentials.googleapis.com \
        sts.googleapis.com androidpublisher.googleapis.com --project "$PROJECT_ID"
      gcloud iam workload-identity-pools create github-actions --project "$PROJECT_ID" \
        --location global --display-name "GitHub Actions"
      gcloud iam workload-identity-pools providers create-oidc github --project "$PROJECT_ID" \
        --location global --workload-identity-pool github-actions --display-name "GitHub" \
        --issuer-uri https://token.actions.githubusercontent.com \
        --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.workflow_ref=assertion.workflow_ref" \
        --attribute-condition "assertion.repository == 'WEBEK-LTD/app-lms' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref.startsWith('WEBEK-LTD/app-lms/.github/workflows/business-release.yml@')"
      gcloud iam service-accounts add-iam-policy-binding "$SA" --project "$PROJECT_ID" \
        --role roles/iam.workloadIdentityUser \
        --member "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/attribute.repository/WEBEK-LTD/app-lms"
      echo "YB_GCP_WORKLOAD_IDENTITY_PROVIDER = projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/providers/github"
      echo "YB_PLAY_SERVICE_ACCOUNT = $SA"
      ```

      Only the release workflow, run from `main` of this repository, can
      sign in as that account. Add the two lines it prints as repository
      **variables** (Settings › Secrets and variables › Actions › Variables;
      they aren't secret): `YB_GCP_WORKLOAD_IDENTITY_PROVIDER` and
      `YB_PLAY_SERVICE_ACCOUNT`.
- [ ] Play Console › Users and permissions › Invite new users › the service
      account's email › App permissions › Yallapp Business › **Release apps
      to testing tracks**, **Manage testing tracks and edit tester lists**
      and **Edit store listing, pricing & distribution** (nothing at account
      level, no production release) › Invite. Google can take a few hours to
      let a new account in.
- [ ] Check it before any release: Actions › Yallapp Business release › Run
      workflow › tick **play_check**. It builds and uploads nothing: it signs
      in and opens the app on Google Play. Before the first App Bundle was
      uploaded by hand, it can only confirm the sign-in.

### App Store: the app and its key

- [ ] App Store Connect › Users and Access › Integrations › App Store Connect
      API › Team Keys › Generate (name "Yallapp Business release", access
      **App Manager**; **Admin** if the run says it can't create certificates).
      Download the .p8 file (only once). Add three secrets: `YB_ASC_KEY_ID`
      (the Key ID), `YB_ASC_ISSUER_ID` (the Issuer ID above the list) and
      `YB_ASC_PRIVATE_KEY` (the whole .p8 file opened in a text editor, from
      `-----BEGIN PRIVATE KEY-----` to `-----END PRIVATE KEY-----`).
- [ ] Run the workflow once with **ios**: it registers the App ID
      `tr.com.yallapp.business` with push notifications and stops, saying the
      app doesn't exist yet.
- [ ] App Store Connect › Apps › + › New App: iOS, name **Yallapp Business**,
      primary language English (U.S.), bundle ID **tr.com.yallapp.business**,
      SKU `yallapp-business`, Full Access.
- [ ] Optional: a distribution certificate of our own as
      `YB_IOS_DISTRIBUTION_P12` (the .p12 in base64) and
      `YB_IOS_DISTRIBUTION_PASSWORD`. Without them each run makes a
      certificate, uses it and revokes it at the end (Apple may email about
      it; apps already uploaded aren't affected).

### Pushes (Firebase)

- [ ] In the Yallapp Business Firebase project (7k): add the Android app
      `tr.com.yallapp.business` and the iOS app `tr.com.yallapp.business`.
- [ ] Add variables (not secrets: these ship inside the app):
      `YB_FIREBASE_PROJECT_ID`, `YB_FIREBASE_SENDER_ID` (Project settings ›
      General: Project ID, Project number), `YB_FIREBASE_APP_ID_ANDROID`,
      `YB_FIREBASE_API_KEY_ANDROID`, `YB_FIREBASE_APP_ID_IOS`,
      `YB_FIREBASE_API_KEY_IOS` (Your apps › each app: App ID; its
      `google-services.json` / `GoogleService-Info.plist` has the API key).
      Easier: paste the whole `google-services.json` into
      `YB_FIREBASE_APP_ID_ANDROID` and the whole `GoogleService-Info.plist`
      into `YB_FIREBASE_APP_ID_IOS`; the workflow reads the rest from them.
      Never commit those files.
- [ ] Apple Developer › Certificates, Identifiers & Profiles › Keys › + ›
      **Apple Push Notifications service (APNs)** › download the .p8. Firebase
      › Project settings › Cloud Messaging › Apple app configuration › APNs
      Authentication Key › upload it with its Key ID and the Team ID.

### App Review's details (App Store)

- [ ] A test client on yallapp.com.tr with a sample app (a restaurant with a
      few orders is best; an events app shows the door scanner) and an owner
      account only for Apple's reviewers. Secrets `YB_APP_REVIEW_DEMO_USER`
      (its email) and `YB_APP_REVIEW_DEMO_PASSWORD`.
- [ ] Variables `YB_APP_REVIEW_FIRST_NAME`, `YB_APP_REVIEW_LAST_NAME`,
      `YB_APP_REVIEW_PHONE` (with the country code, like +90…): the person
      Apple calls with questions. The email is info@yallapp.com.tr
      (`YB_APP_REVIEW_EMAIL` changes it). The review notes are
      `business/store/ios/review_notes.txt`: no payments, accounts are made
      on the website.
- [ ] Google Play › App content › App access › "All or some functionality is
      restricted" › add the same demo account with "Sign in with the email and
      password on the first screen".

### Run it

- [ ] Actions › **Yallapp Business release** › Run workflow: stores
      (both, android, ios), Google Play track (internal by default), and the
      version (empty = `business/pubspec.yaml`'s; once a version is live on
      the App Store, type the next one, like 1.0.1). The run's summary lists
      every secret and variable as set or missing and says what to do next.
      Only one run at a time; the build number is the run's, so it always
      goes up.

### Questionnaires (once, by hand)

- [ ] **Google Play › App content › Data safety**: collects data, encrypted
      in transit, people can ask for deletion (info@yallapp.com.tr). Personal
      info: **Name** and **Email address** (account management, app
      functionality); App info and performance: none; Device or other IDs:
      **yes** (the push token and the device's name, for notifications and
      the signed-in devices); Photos and videos: **yes**, optional (uploads to
      the app's Media); Messages › **Other in-app messages** (replies to
      customers) and App activity › **Other user-generated content**
      (notifications, answers, catalog edits). Every one: collected, not
      shared, required (photos optional), for app functionality and account
      management. Nothing is used for ads or tracking.
- [ ] **Google Play › App content**: Content rating questionnaire (category
      Utility/Productivity/Communication/Other: "Business"; no violence,
      no sexual content, no gambling, no purchases of digital goods; users
      can interact: **yes**, the business answers its customers' messages and
      reviews; shares location: no), Target audience **18 and over**, Ads
      **no**, News app **no**, Government app no, Financial features none,
      Health no. Privacy policy `https://yallapp.com.tr/privacy`.
- [ ] **App Store Connect › App Privacy**: Data collected, all **linked to
      the user**, none for tracking, purpose **App Functionality** only:
      Contact Info › Name, Email Address; Identifiers › Device ID; User
      Content › Photos or Videos, Other User Content. (The same as the app's
      `PrivacyInfo.xcprivacy`.) Privacy policy URL as above.
- [ ] **Age rating**: the workflow sends the answers
      (`business/store/ios/age_rating.json`): nothing objectionable,
      messaging and user-generated content **yes** (customers' messages,
      questions and reviews that the business answers or hides), no
      unrestricted web access, no ads, no gambling.
- [ ] App Store pricing: Free, all countries (App Store Connect › Pricing and
      Availability). Google Play: Free, countries as wanted.

### Publish

- [ ] Google Play: Play Console › Test and release › the internal release ›
      Promote release › Production › review and roll out.
- [ ] App Store: App Store Connect › Yallapp Business › the version (the
      build is already chosen) › Add for Review › Submit to App Review.
- [ ] Before the first submission, on a real Android phone and an iPhone:
      sign in, the fingerprint or face lock, a push for a test order opening
      the order, a ticket scanned at the door, a phone video uploaded to
      Media, and the app in Arabic. Add the App Store Connect app ID to
      `business/README.md` › Store listing ids.

## 7m. Team members for clients (Phase 60)

- [ ] Apply migration `0045_team_members.sql` after `0044` (`team_members`,
      `team_invitations`, `team_activity`). Nothing else to set: the
      invitation email uses the email server and the `team_invitation`
      template (Admin › Emails), in English, Arabic and Turkish.
- [ ] After deploying: invite a test address as Staff with Orders only from
      a test client's Dashboard › Team, join from the email, check the
      sidebar and Yallapp Business show only Orders, then remove them and
      check the website and the phone sign out.

## 7n. Course questions and reviews, and a gym's door (Phase 63)

- [ ] Apply migration `0046_members_and_course_community.sql` after `0045`
      (`member_check_ins`, `course_reviews`, `course_questions`,
      `course_answers`). Nothing else to set: member codes are made from
      `SIGNING_SECRET` (changing it changes every member code, as it does
      ticket QR codes), and the pushes use Yallapp Business's Firebase
      project (7k).
- [ ] After deploying: on a test academy, ask a question and write a review
      from the app, answer and reply from Yallapp Business, check the app
      shows both; on a test gym, open My membership in the app, scan its QR
      code from Yallapp Business's Scan members and from Dashboard ›
      Members › Member check-in, and check the second scan says "Already
      checked in today".

## 7o. Hidden questions, frozen memberships, pushes of every business (Phase 64)

- [ ] Apply migration `0047_frozen_memberships_hidden_questions.sql` after
      `0046` (`hidden` on `course_questions` and `course_answers`, with an
      index; `frozen_from` and `frozen_until` on `memberships`; an index on
      `team_activity` for the activity by person). Nothing else to set.
- [ ] After deploying: on a test academy, hide a question from Dashboard ›
      Courses › Questions and check another student no longer sees it while
      its author does, with the note; on a test gym, freeze a membership on
      Dashboard › Members until next week, check My membership says
      "Frozen until …", the door refuses it, and unfreezing moves the end
      back; with someone on two businesses, check a push of the other
      business reaches their phone with its name first and opens it there.

## 7p. Deleting a Yallapp account (Phase 66)

- [ ] Apply migration `0048_account_deletion_requests.sql` after `0047`
      (`account_deletion_requests`). Nothing else to set: the team's email
      goes to the contact email (Admin › Settings, `info@yallapp.com.tr` by
      default), the owner's emails use the `account_deletion_received` and
      `account_deletion_done` templates (Admin › Emails), in English, Arabic
      and Turkish.
- [ ] Give the stores the page's address for Yallapp Business (7l):
      **`https://yallapp.com.tr/delete-account`**. Google Play: App content ›
      Data safety › "Delete account URL" (and "Users can request that their
      data is deleted"). App Store Connect: in the review notes, that
      accounts are created on the website and deleted from Dashboard › Your
      account or this page (5.1.1(v)).
- [ ] After deploying: open `/delete-account`, `/ar/delete-account` and
      `/tr/delete-account`, and the link in the footer and in the privacy
      policy (if the privacy policy was edited in Admin › Website content,
      add the sentence with the link in section 9 there too). With a test
      client signed in to Yallapp Business, ask from Dashboard › Your
      account, check the phone is signed out and the team's email arrives,
      cancel, ask again, and mark it done in Admin › Account deletion.
- [ ] Deleting is done by the platform since Phase 73 (7u): 7 days after
      the request, or at once with "Delete now", keeping the billing
      records (ARCHITECTURE, "Deleting a Yallapp account").

## 7q. Google Search: the favicon and indexing (Phase 67)

- [ ] Netlify › Site configuration › Environment variables: `APP_URL` is
      `https://yallapp.com.tr` (no trailing slash), for the Production
      context and with the **Builds** scope ticked, then deploy again.
- [ ] host.webek.org: copy `platform/web/deploy/apache-proxy.conf` (keep the
      secret) and `apache-https-redirect.conf` again, then
      `/scripts/rebuildhttpdconf && /scripts/restartsrv_httpd`. Check:
      `curl -sI https://www.yallapp.com.tr/pricing` and
      `curl -sI http://www.yallapp.com.tr/pricing` answer `301` with
      `Location: https://yallapp.com.tr/pricing`.
- [ ] Check from any computer: `curl -sI https://yallapp.com.tr/favicon.ico`,
      `/favicon-48x48.png`, `/favicon-96x96.png`, `/android-chrome-192x192.png`
      and `/apple-touch-icon.png` answer `200` with an `image/…` type and no
      redirect; `curl -s https://yallapp.com.tr/robots.txt` ends with
      `Sitemap: https://yallapp.com.tr/sitemap.xml`; the page source of
      `https://yallapp.com.tr/`, `/ar` and `/tr` has `rel="icon"` links and a
      `rel="canonical"` on `https://yallapp.com.tr` (never `netlify.app`).
- [ ] [Google Search Console](https://search.google.com/search-console):
      add a **Domain** property for `yallapp.com.tr` (DNS TXT record in
      cPanel › Zone Editor), or a URL-prefix property for
      `https://yallapp.com.tr/`.
- [ ] Sitemaps: submit `https://yallapp.com.tr/sitemap.xml` (228 addresses:
      every page in English, Arabic and Turkish).
- [ ] URL Inspection on `https://yallapp.com.tr/`: **Test live URL** (the
      page is indexable, the canonical Google picks is yallapp.com.tr), then
      **Request indexing**. The same for `/ar`, `/tr` and `/pricing`. Google
      shows the new favicon after it crawls the home page again; it can take
      days to a few weeks.
- [ ] Pages (Indexing › Pages): read "Why pages aren't indexed". "Alternate
      page with proper canonical tag" for `www` or `netlify.app` addresses is
      expected; "Duplicate, Google chose different canonical than user" or
      "Discovered – currently not indexed" on yallapp.com.tr pages are worth
      a URL Inspection each.
- [ ] If `yallapp.netlify.app` addresses show up in Google, leave them: their
      canonical names yallapp.com.tr and Google moves them over in time.

## 7r. An ended plan stops the app everywhere (Phase 68)

> **Changed by plugin 0.4.18 (7v, roadmap 76.6).** WordPress.org's review
> counted the paused API as trialware, so from 0.4.18 the plugin never pauses
> the app's API and never limits push or offline downloads by license or
> plan. On WordPress an ended plan stops only Yallapp's services (app builds
> and updates, chat, Yallapp media, new layouts, sign-in codes sent by
> Yallapp). The WordPress items below are kept for sites still on 0.4.6 to
> 0.4.17; skip them once clients are on 0.4.18. The hosted API is unchanged.

- [ ] Apply migration `0049_license_end_refresh.sql` after `0048`
      (`end_refreshed_for` on `licenses`). Deploy the platform after it: the
      frequent job reads that column (until it exists, only that part of the
      job logs an error; notifications and announcements still go out).
- [ ] **Release plugin 0.4.6** (Admin › App & plugin versions) with the
      changelog from `wp-plugin/yallapp/readme.txt`.
- [ ] Tell every WordPress client to **update to plugin 0.4.6** (Plugins ›
      Updates, or upload the zip). Until they do, their site keeps the old
      "Test mode": the app keeps working after the plan ends (only the
      sign-in codes and Media videos Yallapp serves stop). WordPress offers
      the update only while the license is active, so a client whose plan
      already ended updates by uploading the zip, or after renewing.
- [ ] Tell them what changes with 0.4.6, before it reaches them:
      - The license is enforced on the live site. A site without an active
        license key shows the app as paused, so check that Settings ›
        License says "Active" after updating.
      - Push notifications and offline lessons follow the plan, as on the
        dashboard (a plan without push sends only to the app's inbox).
      - When the plan ends, the app shows "{App} is paused" with the contact
        from the plugin settings (Support WhatsApp and email: check they're
        filled in), sends no notifications, and comes back within minutes of
        renewing. The same while the Yallapp account is suspended.
      - A site that can't reach yallapp.com.tr for over 3 days pauses too
        (firewalls blocking outgoing requests); "Check now" brings it back.
      - Development copies set `WP_ENVIRONMENT_TYPE` to `local` (or
        `development`) and `define( 'YALLAPP_ENFORCE_LICENSE', false );` to
        work without a license; it is ignored on live sites. (0.4.18 drops
        the constant: no site needs it any more.)
- [ ] What app users see when a plan ends, on every backend: the paused
      screen with "Contact {App}" and "Try again"; someone signed in can
      still delete their account there. Someone not signed in can't sign in
      to delete it: they ask the owner, or our team deletes the app user
      from Admin › the client › App users. Hosted apps already paused on the
      end date; now pushes stop too (notifications sent later and due after
      the end show "Not sent" on the dashboard and in Yallapp Business), and
      a build queued before the end is closed with the reason instead of
      being built.
- [ ] After deploying: on a test WordPress site with 0.4.6, let a test
      license end (its end date in the admin); within 5 minutes of the end
      the site's License card says "Ended on …" and the app shows
      the paused screen; delete a signed-in test account from that screen;
      extend the license and check the app comes back.

## 7s. Receipts as PDF (Phase 71)

- [ ] No migration. Deploy as usual: PDFKit is installed from
      `package.json` and the fonts are already in `src/app/fonts/og`.
- [ ] **Admin › Settings › Invoices**: if Yallapp's receipts should show the
      company's legal details, write them there, one per line (legal name,
      address, tax or registration number), exactly as registered. Until
      then they show "Yallapp", "Cairo, Egypt", the website and the contact
      details of the same page. Nothing else is printed about the company.
- [ ] Decide with the accountant whether these receipts are enough or a
      tax invoice is needed (Egypt's e-receipt, Turkey's e-Arşiv): they
      have no tax lines (ROADMAP 71.10).
- [ ] Tell clients with apps without a website that their customers now
      get an **Order receipt** email with a PDF, in their app's name, that
      shows their **Support email** (the store listing step) and **Support
      WhatsApp** (App sign-in):
      check they're filled in. The text is in Admin › Emails
      (`order_receipt`).
- [ ] Keep `SIGNING_SECRET` as it is: it signs the links to order receipts
      in emails; changing it ends those links (the app gets new ones).
- [ ] After deploying: pay a plan with Kashier's test account (with a
      coupon), check the activation email has `receipt-YA-….pdf` attached
      and that License › Payments › **Download PDF** gives the same, with
      the dashboard in Arabic and in Turkish too; download it from Admin ›
      Payments. Pay a test order and a test donation in a demo client's app
      without a website: the customer's email has the PDF, and so does the
      page after paying. Open the PDFs in Gmail, Outlook and a phone. If a
      client uses their own email server for their app, send one through
      it too (attachments must be allowed).

## 7t. Two-step sign-in, a real sign-out, coupon limits (Phase 70)

- [ ] Apply migration `0050_two_step_sign_in.sql` after `0049` (tables
      `user_sessions`, `user_two_factor`, `user_recovery_codes`), then deploy.
      Everyone signed in to yallapp.com.tr signs in once more after the
      deploy: sessions are now kept on the server, and the old cookies have
      no session to match. Yallapp Business phones stay signed in.
- [ ] **Turn on two-step sign-in for yourself:** Admin › Your account › "Set
      up two-step sign-in". Scan the QR code with an authenticator app
      (Google Authenticator, Microsoft Authenticator, 1Password…), type the
      6-digit code, and save the 10 recovery codes in your password manager:
      they are shown only once.
- [ ] **Require it for the team:** Admin › Team › tick "Require two-step
      sign-in for the team" › Save (only owners; yours must be on first).
      Everyone else on the team is sent to Your account to set it up at their
      next visit and can open nothing else until it is on.
- [ ] Someone on the team lost their phone and their recovery codes: Admin ›
      Team › "Reset" next to their name. They are emailed, sign in with their
      password only, and set it up again. Each reset is in the audit log.
- [ ] Clients: nothing to do. Dashboard › Your account offers two-step
      sign-in, the overview suggests it until it's on, and Yallapp Business
      asks for the code after the password once the app version with it is
      released (older app versions can't sign in to an account that has it;
      the client signs in on the website, or turns it off there, until they
      update).
- [ ] "Sign out of all devices" (Your account, in the dashboard and the
      admin) ends every website session and signs every Yallapp Business
      phone out. Use it on an account you think someone else used.
- [ ] Coupons with a use limit now count it under a lock on the coupon: two
      payments at the same moment can't pass it. Nothing to set up.

## 7u. Start a course again, delete an app, account deletion, dark mode, account country (Phase 73)

- [ ] Apply migration `0051_app_deletion.sql` after `0050` (tables
      `app_deletions` and `kept_billing_records`, `deleted_at` and
      `deleted_by` on `apps`), **then** deploy: every read of an app now
      asks for `deleted_at`.
- [ ] **Upload `build/files-host/index.php`** to files.yallapp.com.tr (next
      to `config.php`, which stays as it is). It now also answers the
      platform's signed `DELETE /builds/<build id>/`, which removes an
      app's build folders when it is deleted for good. Until it is
      uploaded, those folders are listed in Admin › Deleted apps (and the
      account deletion's note) and the daily job tries again every day;
      they can be deleted by hand there too.
- [ ] **Release plugin 0.4.7** (Admin › App & plugin versions) with the
      changelog from `wp-plugin/yallapp/readme.txt`, and tell WordPress
      clients what it adds: "Start the course again" in the app for finished
      courses with Tutor LMS, LearnDash, LifterLMS and Sensei LMS (and
      LearnPress when the course allows retakes); the "In the app" box on
      each course turns it off. MasterStudy and Masteriyo sites don't get
      it. The same release carries Phase 72's video branding choice.
- [ ] **Account deletion is automatic now.** The daily job deletes an
      account 7 days after the owner asked (they can cancel until then):
      the paid plan payments are kept first in `kept_billing_records` with
      who paid and the receipt (Admin › Account deletion › Done › Receipt
      PDF), then the files and the rows go and the owner is emailed as
      before. "Delete now" does it at once. Check that the open requests in
      Admin › Account deletion are ones you mean to delete: they go 7 days
      after they were asked, the old ones at the first daily run after the
      deploy. Requests by email: ask the owner to confirm from the dashboard,
      or press Delete now after checking the address.
- [ ] **Deleted apps:** an owner can delete an app from Setup › Delete this
      app (owner only, with the app's name and the password). It stops at
      once; Admin › Deleted apps lists it for 7 days with Restore and Delete
      now, then the daily job deletes it with its Media files, build folders
      and the images only it used. Plan payments stay, without their app.
- [ ] **Account country:** clients who signed up before Phase 52 have none;
      they can now set it on Dashboard › Your account (and you on the
      client's page › Edit details). It decides pounds or dollars, which
      WhatsApp number they see and their receipts' time zone.
- [ ] **Dark mode:** nothing to set. The website, the sign-in pages, the
      dashboard and the admin follow the visitor's system setting; the moon
      button (header, the dashboard's sidebar, the admin's menu) switches
      it and the browser remembers it.
- [ ] Apps: the customer app's next builds show "Start the course again" on
      a finished course (hosted courses: on for every course, turned off per
      course in Dashboard › Courses › the course). Apps built before keep
      "Review course" only.
- [ ] After deploying: delete a test app (a WordPress one: its site's
      License card says the key isn't valid within moments), restore it
      from Admin › Deleted apps, delete it again and press Delete now; ask
      to delete a test account and press Delete now: its payment shows
      under Done with its receipt PDF and the owner can't sign in. Switch the
      website and the dashboard to dark and back, on a phone too.

## 7v. The plugin on WordPress.org (Phase 76)

- [ ] Release plugin **0.4.8** (Admin › Plugin releases, the zip from the
      merged change's "Plugin zip" CI artifact or `bin/build-zip.sh`), so
      sites on 0.4.7 and earlier get it from Yallapp one last time.
- [ ] Submit the same zip at https://wordpress.org/plugins/developers/add/,
      signed in as **yallapp**. The upload's automatic checks are the ones
      CI runs ("Plugin Check (WordPress.org)"); the slug asked for is
      `yallapp`.
- [ ] Answer the review team's email from the same account. When it is
      approved, WordPress.org gives an SVN address: the first release is
      committed there (`trunk/` and `tags/0.4.8/`), with the listing's icon
      and banner in `assets/` (`brand/stores` has the icon).
- [ ] From then on, every plugin release goes to WordPress.org's SVN (and
      may still go to Admin › Plugin releases for the dashboard's download
      button).
- [ ] **Plugin 0.4.18** (roadmap 76.6, the review of 0.4.8): upload the zip
      from the merged change to the review and answer the review team's email
      (the draft is in the change's report). What changed for them: nothing
      in the plugin depends on a license or plan any more (guideline 5), the
      app-view style is enqueued, MasterStudy strings use the `yallapp` text
      domain, and the one-time sign-in and checkout links say why they have
      no nonce. Release 0.4.18 in Admin › Plugin releases too.
- [ ] Tell WordPress clients what 0.4.18 changes: when a plan ends, their
      app keeps reading their site (courses, products, bookings, posts, push
      through their own Firebase), and only Yallapp's services stop (app
      updates in the stores, chat, Yallapp media, new layouts, sign-in codes
      sent by Yallapp). Settings › License says so.

## 7w. Chat in the app (Phase 77)

- [ ] Apply migration `0052_chat.sql` after `0051` (the `chat_*` tables,
      `apps.chat_settings` and `media_files.source`), **then** deploy: every
      read of a Media file now asks for `source`.
- [x] **Upload `platform/web/deploy/media-host/index.php`** to
      files.yallapp.com.tr/media (next to `config.php`, which stays as it
      is). It now takes the chat's voice messages (m4a, mp3, aac) and
      documents (Word, Excel, PowerPoint, text), and always saves documents
      instead of opening them. `https://files.yallapp.com.tr/media/ping`
      answers "Yallapp media gate 3" once it is the new one; until then
      those files can't be sent.
- [ ] Admin › Plans: chat comes with Pro and Business. If the plans were
      edited in the admin before, tick "Chat" on Pro and Business there.
- [ ] Dashboard › Chat (77.3): the inbox, a conversation (answers with a
      file from Media, deleting a message or all of them, keeping another
      year, stopping a person), the reports and the switches (chat on or
      off, an academy's course groups). Team members need the new "Chat"
      area (Team page) to see it; owners and managers have it.
- [ ] After deploying: on a test academy on Pro, write from the app (or the
      hosted API), answer from Dashboard › Chat, turn course groups on and
      see the course's group; the same page in Arabic and Turkish.
- [ ] **Variations and tax** (91.5): migration `0083_variants_and_tax.sql`
      (a column on `catalog_products` and one on `catalog_orders`) goes with
      the deploy, migrations first. After deploying: on a test shop without
      a website, give a product Size (S, M) and Colour (Red, Blue), add the
      combinations with one dearer and one with stock 1, and see the price
      range, the choices and the stock in the app; buy the one with stock 1
      and see it go out of stock. Under Shop settings set KDV 20% with
      prices including it: the cart, the receipt and the order email say
      how much is tax; untick it and the cart adds the tax as its own line
      and the payment page charges it. The editor and the docs in Arabic
      and Turkish.
- [ ] **Loyalty points** (91.4): migration `0082_loyalty_points.sql` (two
      new tables and a column on `catalog_orders`) goes with the deploy,
      migrations first. After deploying: on a Growth test shop without a
      website, turn on Loyalty points (10 per point, 0.10 a point, 100 at
      least), complete an order of a signed-in customer and see the points
      in the app's My points; once they have 100, turn on Use points in the
      cart and pay: the payment page and the receipt show the points line,
      the balance goes down, and cancelling the order gives them back. On a
      Starter app the Products page shows the upgrade note instead. The
      pricing page lists Loyalty points for Growth, Pro and Business; the
      plans the team saved before keep their features and gain this one.
- [ ] **Returns** (91.3): migration `0081_order_returns.sql` (a column on
      `catalog_orders`) goes with the deploy, migrations first; plugin
      0.4.17. After deploying: on a shop without a website, set **Returns in
      the app (days)** to 14, complete a test order and ask to return it from
      the app: Yallapp Business gets the request, Dashboard › Orders shows it,
      and approving it with a reply tells the phone. On a WooCommerce test
      site, set **Returns in the app** in the plugin's Settings › Store app,
      ask from the app, check the email and the order note, then decline it
      on the order's screen: the phone is told. The same order screens in
      Arabic and Turkish.
- [ ] **Order updates** (91.2): plugin 0.4.16 (its inbox table gains
      `order_id` on update). After deploying: on a WooCommerce test site with
      WooCommerce Shipment Tracking, add tracking to an order of a signed-in
      app user: the phone gets "Your order is on its way", and the order shows
      the tracking. On a shop without a website, mark an order completed: the
      customer is told, unless "Order updates" is off on App notifications.
      Migration `0080_order_watches.sql` (a new table) goes with the deploy,
      migrations first. On a Shopify test shop: check out from the app, then
      fulfill the order with a tracking number; within 15 minutes the phone
      gets "Your order is on its way" and the order shows the tracking.
- [ ] **Coupons** (91.1): migration `0079_catalog_coupons.sql` (a new table
      and two columns on `catalog_orders`) goes with the production deploy,
      migrations first; plugin 0.4.15. After deploying: on a test shop
      without a website, add a coupon on Products › Coupons, apply it in the
      app's cart, pay and see it on Orders with one use counted; on a
      WooCommerce test site, a WooCommerce coupon in the app's cart shows its
      discount and is on the checkout.
- [ ] **Memberships from the site** (90.3): plugin 0.4.14. On a test site
      with Paid Memberships Pro, a course set to "Require membership": the
      app names the plan, a member joins it in one tap, and Account › My
      memberships lists the level.
- [ ] **Academies, complete** (90.1): migration `0078_quiz_attempts.sql`
      (a new table) goes with the production deploy, migrations first.
      Certificates are at `/a/<app ID>/certificate/<code>`, signed with
      `SIGNING_SECRET`; changing that secret makes the links already given
      stop working. After deploying: on a test academy without a website,
      add a quiz, turn on certificates, finish the course from the app and
      open the certificate.
- [ ] **Updates you can undo** (89): migrations `0076_app_versions.sql` and
      `0077_staged_release.sql` (columns on `apps` and `builds`) go with the
      production deploy, migrations first. Apps built from now on ask
      `/api/v1/apps/{id}/version` on start. Staged releases on Google Play
      need the service account's right to release to production.
- [ ] **Publishing without surprises** (88): migrations
      `0074_listing_languages.sql` (columns on `apps`) and
      `0075_publishing_reviews.sql` (a column on `publishing_requests`) go
      with the production deploy, migrations first. The frequent job reads
      the App Store review state of the iPhone versions in review with each
      client's App Store Connect key (every half hour per app). Each app's account deletion page is at
      `/a/<app ID>/delete-account`. With "We publish for you", Android
      builds now send the listing (every language, phone and tablet
      screenshots, framed when asked) after the App Bundle, and iOS builds
      send theirs after TestFlight (never submitted for review): the
      service account and the App Store Connect key need the rights to edit
      the store listing.
- [ ] **Builds that explain themselves** (87): migrations
      `0071_build_failure.sql`, `0072_build_source.sql` (columns on `builds`)
      and `0073_auto_build_due.sql` (a column on `apps`) go with the production
      deploy, migrations first. The build workflow (`build-apps.yml`) and the
      scripts (`diagnose.py`) go with the same merge: builds made before it
      have no source commit, so "Rebuild as it was" shows only on builds made
      after. Automatic builds now start from the frequent job, ten minutes
      after the last save.
- [ ] **Analytics with the business's numbers** (86): migrations
      `0068_sales_windows.sql` (indexes), `0069_event_sources.sql` (three
      columns on `analytics_events`) and `0070_weekly_summary.sql` (a column on
      `apps`, on by default) go with the production deploy, migrations first.
      The weekly summary goes out from the daily job on Mondays (to Wednesday);
      check the first Monday's run in Admin › Watching (`analytics.weekly`).
- [ ] **The app for 86.2** comes with each app's next build: it sends the store
      it was installed from and the links and QR codes that open it. Older
      builds go on counting as before.
- [ ] **Plugin 0.4.13** (86.4): WooCommerce sites send their shop's daily
      totals with the license check. Release it like 0.4.12; its readme says
      what is sent (External services).
- [ ] **Notification campaigns** (85): migrations `0064_device_language_country.sql`,
      `0065_notification_campaigns.sql`, `0066_auto_notifications.sql` and
      `0067_campaign_reports.sql` (new columns and tables) go with the
      production deploy. Automatic notifications start for every hosted app at
      once (each kind can be turned off on App notifications): check the
      frequent job's report (`campaigns`, `automatic`) after the first runs.
- [ ] **The app for 85** comes with each app's next build: the language sent
      with the push token, campaigns' pictures in the inbox and web addresses
      opened in the browser, the automatic notifications' screens, and the cart's
      item count for "You left something in your cart". In the data safety form,
      add Location › Approximate location (the country phones sign in from) as
      the publishing guide says.
- [ ] **Plugin 0.4.12** (85.4): campaigns from the dashboard on WordPress apps.
      Release it like 0.4.11; until a site updates, a campaign to it says the
      plugin is too old and nothing is sent. Its readme says what campaigns send
      (External services).
- [ ] **Saved sections** (84.3): migration `0063_saved_sections.sql` (a new
      table) goes with the production deploy.
- [ ] **App switches** (83.3): migration `0062_app_switches.sql` (a new
      column) goes with the production deploy; every switch starts on.
- [ ] **Plugin 0.4.11** (82.5, 83.3): the side menu, the owner's own icons and
      each block's look reach WordPress apps, and the team's app switches. Release it like 0.4.10; sites
      on 0.4.10 or earlier keep their tabs and pages without them.
- [ ] **Plugin 0.4.10** (81.2): the site's look (title, logo, icon, theme
      colours, menus) with each license check. Release it like 0.4.9; sites
      send it from their next check after updating.
- [ ] **Plugin 0.4.9** (77.4): WordPress apps' chat. Release it like 0.4.8
      (WordPress.org once the plugin is approved there; Admin › Plugin
      releases for the dashboard's download button). Sites on 0.4.8 or
      earlier have no chat until they update: their app gets no chat token.
      Its readme now says what the chat sends to Yallapp (Privacy, External
      services).
- [ ] **The app's Chat** (77.5) comes with each app's next build: earlier
      builds have no Chat tab whatever the plan. Rebuild the Pro and
      Business apps that should have it. The new build asks for the
      microphone (voice messages), the camera and the photos only when the
      person uses them in the chat (iOS: the three usage texts in
      `Info.plist`; Android: `RECORD_AUDIO`). For the App Store and Google
      Play reviews of apps where people write to each other: a message's
      long press reports it (or deletes one's own) and blocks its sender in
      a group, and a group's Members list blocks and unblocks; the business
      sees reports in Dashboard › Chat.
- [ ] **Yallapp Business** (77.6): its next release has the Chat tab
      (after the app's main tool; Stats moves to More when the bar is
      full), replies, reports and the chat's switches. Owners and managers
      have it; give team members the "Chat" area on the Team page. Its
      notification settings have **Chat messages**.
- [ ] **Terms and privacy** (77.6): section 11 of the terms (the business
      is responsible for its app's chat) and the chat's paragraph in the
      privacy policy, in English, Arabic and Turkish. If the team edited
      the legal pages in Admin › Website content, the edited version shows
      instead: add the two texts there by hand. The docs page is
      `/docs/chat`.
- [ ] Nothing else to set: the chat's pushes use each app's own Firebase
      account (WordPress apps: through their site, plugin 0.4.9) and
      Yallapp Business's for the owners. Messages are kept a year; the
      daily job deletes older ones unless the business kept them, and tells
      the business 30 days before (dashboard, email, phone).

## 7x. Measure and watch (Phase 78)

- [ ] Migrations `0053_client_milestones.sql` (78.1) and
      `0054_product_days.sql` (78.2) add two new tables and change none.
      The production deploy applies them itself before building
      (`npm run db:migrate` in `netlify.toml`); nothing to run by hand.
      Only if that deploy stops on the database (the old version keeps
      running): run `npm run db:migrate` from `platform/web` with
      `DATABASE_URL` (README › Database on host.webek.org), then deploy
      again.
- [ ] Nothing to set for the milestones: the first daily job after the
      deploy fills them for every account from what the data shows
      (`milestones` in its answer: accounts and how many were added), and
      from then on they are recorded as they happen.
- [ ] **Privacy** (78.1): section 2 of the privacy policy now says how the
      sign-up's source is kept ("How you found us"), in English, Arabic
      and Turkish. If the team edited the privacy policy in Admin › Website
      content, add it there by hand.
- [ ] Admin › Product (78.2) fills its months from the daily job's
      snapshots, one a day from the deploy on (`productDay` in its answer);
      the funnel, times, sources and builds show at once.
- [ ] **Watching** (78.3): migration `0055_watching.sql` (two new tables)
      goes with the production deploy like the others. Then open Admin ›
      Watching: each part of the health check should say Fine. Set
      `GITHUB_DISPATCH_TOKEN` in Netlify (README) if the build pipeline says
      it isn't set: without it, builds wait for GitHub's hourly schedule,
      often hours late. New alerts are emailed to every address in
      `SUPER_ADMIN_EMAILS`.
- [ ] **Errors per app** (78.4): migration `0056_app_errors.sql` (one new
      table) goes with the production deploy. Admin › Clients › a client now
      shows the apps' errors and a timeline. The hosted API answers an
      unexpected error with a JSON 500 (`server_error`) instead of Next's page.
- [ ] **Integrations** (80.1): migration `0057_integration_checks.sql` (one
      new column on `apps`) goes with the production deploy. Dashboard ›
      Integrations lists each app's connections; Test asks a website,
      payment keys or a push key now, without sending anything to anyone.
- [ ] **Daily checks** (80.2): migration `0058_integrations_checked_at.sql`
      (one column and an index on `apps`) goes with the production deploy.
      From then on the frequent job checks a few apps each run, each app
      about once a day. Leave `INTEGRATION_CHECKS` unset on Netlify (`off` is
      only for the e2e tests). A broken connection tells its owner (notice,
      email, phone) and opens an alert in Admin › Watching.
- [ ] **Retries** (80.3): migration `0059_pending_payment_checks.sql` (a
      column on orders, plan payments and donations, and their indexes) goes
      with the production deploy. From then on the frequent job asks
      iyzico, Kashier and Fawaterk about payments whose callback never came.
      Failed account deletion notices get a Send again button.
- [ ] **Shipping** (80.4): migration `0060_order_shipment.sql` (one column
      on `catalog_orders`) goes with the production deploy. Shops mark
      orders shipped on the Orders page with any carrier; the app's next
      build shows the tracking (the preview shows it at once).
- [ ] **Start from your website** (81.1, 81.3): no migration. Choose app
      type offers "Start from your website" for a new app; it reads the
      client's site through the safe fetch. Leave `SITE_SCAN_TEST_URL` unset
      on Netlify (it is refused there; only the e2e tests use it). Try it once
      with a real WordPress site and a real Shopify shop after the deploy.
- [ ] **Publish history** (82.4): migration `0061_layout_versions.sql` (a
      new table) goes with the production deploy. Each publish from then on
      is kept (the last 20 per app); earlier ones aren't there to go back to.
- [ ] **Import** (81.4): no migration. Products, Services and Courses have
      "Import from a file" (CSV, a product feed or a Google Sheet's link).
      Try a Google Merchant Center feed and an Excel CSV saved in Turkish
      after the deploy.
- [ ] Campaign links: point them at any page of the site with
      `utm_source`, `utm_medium` and `utm_campaign` (and `from` for a page
      of ours, like `from=newsletter`); the sign-up records them while the
      visitor stays on the site (nothing is kept in the browser, so a
      reload or a new tab forgets them).

## 7y. Safe data (Phase 79)

**Backups (79.1)** are cPanel's own, on our host, sent to Google Drive. They
hold everything on the host: the database, the media folder
(`yallapp-media`) and the build files (`yallapp-files`).

- [x] cPanel backups on, with Google Drive as the destination off the
      server.
- [ ] Check once that a backup holds the Yallapp database and the home
      folder (with `yallapp-media` and `yallapp-files`), and that new ones
      keep arriving on Google Drive.
- [x] A copy of Netlify's `ENCRYPTION_KEY` kept apart from the backups (a
      restored database can't read its secrets without it). Never change it
      on Netlify: rotating it is 79.2.
- [ ] Netlify Blobs (app icons, logos, plugin zips) aren't on the host, so
      cPanel doesn't have them. From time to time, from `platform/web`:
      `NETLIFY_SITE_ID=… NETLIFY_AUTH_TOKEN=… node scripts/export-blobs.mjs ~/yallapp-blobs`
      (a Netlify personal access token; only what changed is downloaded).
- [ ] **Restore drill**, once and then every few months: restore the
      Yallapp database from a backup into a new, empty database (cPanel ›
      Backup, or the `.sql` file inside the backup imported with phpMyAdmin
      or `mysql`), run `npm run db:migrate` against it (it should be up to
      date), and check the counts of clients and apps against Admin ›
      Overview. Then delete it. Last done: ______
- **A real recovery:** restore the database (and the two folders) from the
  latest backup, point `DATABASE_URL` on Netlify at it if it moved, keep the
  same `ENCRYPTION_KEY`, and redeploy.

**Encryption keys (79.2).** Every encrypted value now names the ID of its
key. After the deploy, the frequent job moves the values written before 79.2
to the new format (once, a few seconds at a time); Admin › Watching ›
Encryption keys shows the current key's ID and says when every stored value
is on it.

- [ ] After the deploy: Admin › Watching › Encryption keys says "Every
      stored value is on it" (within an hour or so).
- [ ] If `BUILD_PIPELINE_TOKEN` is shorter than 32 characters, Admin ›
      Watching › Build pipeline says so: make a new one (`openssl rand -hex
      32`), set it in Netlify and in GitHub › Settings › Secrets, together.

**Rotating the encryption key** (only if it may have leaked, or as a
routine every few years):

1. `openssl rand -hex 32` gives the new key. Keep a copy apart, like the
   old one.
2. In Netlify: put the current value of `ENCRYPTION_KEY` in
   `ENCRYPTION_KEY_OLD`, the new key in `ENCRYPTION_KEY`, and deploy. Both
   open values from then on; new values go to the new key.
3. Wait until Admin › Watching › Encryption keys says "Every stored value is
   on it … ENCRYPTION_KEY_OLD can be removed" (the frequent job moves them,
   a few seconds every 5 minutes).
4. Remove `ENCRYPTION_KEY_OLD` and deploy. If the key leaked, also change the
   secrets themselves where they come from (payment keys, store keys…):
   whoever had the old key and an old copy of the database could read them.
- If it says some values couldn't be moved, keep `ENCRYPTION_KEY_OLD` and
  tell the developers: those values were sealed in a way the job doesn't
  know.

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
