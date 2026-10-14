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

## 6. Accounts the remaining roadmap steps wait on

| Step | What we need |
|---|---|
| 0.5, 2.x, 3.x | A staging WordPress site with Tutor LMS, Digits (waabek), WooCommerce and sample lessons, and an Android phone to install the test APK |
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
