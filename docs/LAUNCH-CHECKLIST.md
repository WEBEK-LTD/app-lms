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
- [ ] **Settings › Marketplace:** the commission percent Yallapp keeps from
      shops that sell through Yallapp's iyzico account.
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
- [ ] **Plans › card payments:** the prices clients pay by card for each plan.
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

- [ ] **Release plugin 0.3.8** (Admin › App & plugin versions) with the
      changelog from `wp-plugin/yallapp/readme.txt`. Clients whose app type
      doesn't match the plugins on their site need it for the right tabs and
      home, and the dashboard needs it to say what their site runs.
- [ ] Ask clients with a WordPress app to open **Set up › Website**: a
      warning there means the app type doesn't fit their site (for example a
      Store app on a site that only runs Tutor LMS); **Change the app type**
      fixes it.

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
| 10.5–10.7 | A WordPress test site and a Real estate test app built on the hosted API, to see published pages, languages and listings on a phone |
| 14.2, 14.3 | A first client who asks us to publish: their Google Play and Apple developer accounts inviting the publishing team email |
| 17.7 | A WordPress test site with the new plugin, and a phone, to try the preview of a WordPress app and its QR code |
| 22.5 | A Wix test site with Wix Stores (Catalog V3): a Headless OAuth app's client ID, and an account API key that reads orders and contacts with the site ID |
| 25.5 | Yallapp's partner apps: a Salla Partners app (custom mode, callback `/oauth/salla`, webhook `/api/webhooks/salla`) and a Zid Partner Dashboard app (redirect `/oauth/zid`), saved in admin Settings, plus a Salla demo store and a Zid test store to connect |
