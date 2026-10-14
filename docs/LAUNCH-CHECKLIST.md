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
- [ ] **Plans:** names, prices, periods and features; check the pricing page.
- [ ] **Plans › card payments:** the prices clients pay by card for each plan.
- [ ] **Team:** invite the rest of the team with the right role (admin,
      support or viewer); only owners manage the team.
- [ ] **Defaults for new apps** (Settings), **Switches**, **Website content**
      and **Emails:** check each once and change what we want different.

## 3. Hosting and builds

- [ ] Netlify variables in `platform/web/README.md` (database, encryption key,
      signing secrets, `FILES_*`, `BUILD_PIPELINE_TOKEN`).
- [ ] `files.yallapp.com.tr`, GitHub secrets and variables: `build/README.md`
      › One-time setup.
- [ ] GitHub › Settings › Billing: keep the Actions budget (USD 20) and watch
      the macOS minutes the iOS builds use.

## 4. Accounts the remaining roadmap steps wait on

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
