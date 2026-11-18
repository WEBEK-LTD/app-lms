# Paying in the app in the phone's browser sheet: QA notes

18 November 2026. Branch `wip-wallets-in-app`, built on `wip-wallets`
(PR #454, Phase 155: Apple Pay and Google Pay in Stripe's form).
ROADMAP Phase 170, closing 155.6.

## What the customer sees now

### iPhone

1. They tap Pay (or Checkout) in the app. The payment page opens in a sheet
   over the app: Safari's own view (SFSafariViewController), with the page's
   address at the top and **Done**. It is no longer the app's own page.
2. With a card in Apple Wallet and the shop's Stripe ready (Phase 155),
   Stripe's form shows **Apple Pay** above the card fields. Card payments,
   iyzico's and Kashier's forms inside the page, and Fawaterk's and PayPal's
   own pages work there as in Safari.
3. Once paid, the order page shows "Thank you!" and, after a moment, asks
   **"Open in <app>?"** (Safari asks before it leaves for an app). They tap
   Open, or **Back to the app** on the page. The sheet closes by itself and
   the app shows the order, as it did after the web view.
4. If they tap **Done** without the return link, the app finds the payment by
   itself within a few seconds (it asks the platform every 4 seconds while
   the sheet is open). Under the sheet the app says "Finish paying in the
   window that opened", then one of:
   - the order, when it's paid;
   - **"Your payment isn't confirmed yet"**, when a payment started and isn't
     confirmed. It never says "failed" here, and it asks them to check again
     before paying a second time;
   - **"Not paid yet"**, "nothing was charged", when no payment started;
   - **"This order is closed"**, when the order was cancelled.

   Each one offers **Check payment** and, unless the order is closed,
   **Open the payment page** (the same payment, never a new order).

### Android

1. The payment page opens in a Chrome tab over the app (Custom Tab, with the
   page's address and ✕), not the app's own page.
2. With Chrome and a card in Google Pay, Stripe's form shows **Google Pay**.
3. Once paid, the order page goes back to the app by itself, or with **Back
   to the app**. Android can't let an app close a Custom Tab, so the app comes
   back over it: `PayReturnActivity` brings `MainActivity` to the front with
   `CLEAR_TOP`, which removes the tab. The app shows the order. Back doesn't
   return to the tab.
4. If they close the tab with ✕ or Back, the app checks the payment as soon
   as it's on screen again and shows the same states as on iPhone.

### Both

- A failed card: the page says the payment didn't go through and offers to
  try again, with an outlined **Back to the app** under it.
- A bank transfer or the shop's own method: the order page shows the bank
  details and doesn't leave by itself. **Back to the app** opens the order as
  placed.
- If the app was closed meanwhile, the return link starts it on Orders.
- Unchanged:
  - opening the same link in Safari or Chrome, or in an app still on an
    older build (which opens it in its web view), shows the pages as before,
    with no "Back to the app";
  - a shop's own website checkout (WooCommerce, Shopify) and a donation's
    page (`/give/…`) stay in the web view;
  - the app preview (a browser) and builds without an app ID keep the web
    view.

## The choice: every gateway in the sheet

Every gateway uses the sheet, not only Stripe with wallets ready, so there is
one flow:

- Everything on Yallapp's payment page runs in a real browser: Stripe;
  iyzico's and Kashier's forms (153) with their 3-D Secure steps; Fawaterk's
  and PayPal's own pages; Egypt's payments.
- PayPal's guidelines don't support its checkout in an app's web view, so the
  browser is better for PayPal too.
- The server already keeps a second charge out. A paid order's payment page
  goes to its order page. An earlier Kashier or Fawaterk payment is read back
  before another one starts (`src/app/actions/pay.ts:104`). "Open the payment
  page" reopens the same payment.
- If the phone has no browser for the sheet, the web view opens it as before.

Left out, and why:

- Donations (`/give/…`) have their own done and fail pages; adding them is a
  small follow-up if wanted.
- A shop's own website checkout is the shop's site, not Yallapp's page. The
  web view's "order received" detection still applies to it.

## Security

- `/pay/<token>/app` sets `yallapp_app_pay=1`, with
  `Path=/pay/<token>; Max-Age=5400; HttpOnly; SameSite=Lax` (and `Secure` on
  https). It holds no secret and is sent only to that payment's own pages.
  Anything that isn't a token's shape gets a 404 and no cookie.
- The return link is
  `yallapp-<app id without dashes>://app/pay-return?order=<id>&result=<…>`.
  It carries only the order's ID and a hint, never the payment token. On
  Android another app could claim the same scheme, and it would learn nothing
  it could pay or read with.
- The app never trusts the link. It reads `/pay/<token>/status`, which gives
  only the state (`paid`, `awaiting_payment`, `started`, `open`, `closed`,
  `not_found`, and 134's `shop_order`), with `no-store`. It is asked with the
  token the app already holds.
- The payment token is as before: single-purpose, and its link expires after
  60 minutes (`PAY_LINK_MINUTES`).

## Where it is (file:line)

Platform (`platform/web`):

- `src/lib/payments/app-return.ts`:
  - `:27` `appReturnScheme`;
  - `:39` `appReturnLink`;
  - `:47` `appReturnCookie`;
  - `:73` `payStatusOf`;
  - `:82` `fromAppSheet`.
- `src/app/pay/[token]/app/route.ts:13`: the entry that sets the cookie and
  goes on to the page.
- `src/app/pay/[token]/status/route.ts:14`: the status the app reads.
- `src/app/pay/[token]/order-received/page.tsx:36` (what the done page
  returns, and whether it goes by itself) and `:118` (the button).
- `src/app/pay/[token]/page.tsx:48`: the failed, pending and closed pages'
  button.
- `src/app/pay/[token]/back-to-app.tsx:15`: going back by itself after 600 ms.
- `src/lib/builds/app-release.ts:26`: `CLIENT_APP_RELEASE = 7`, with its
  comment line.

App (`mobile`):

- `lib/core/web/pay_sheet.dart`:
  - `:39` `payReturnScheme`;
  - `:58` `payPageToken`;
  - `:70` `opensInPaySheet`;
  - `:90` `paySheetEntry`;
  - `:95` `isPayReturnLink`;
  - `:152` the status reader;
  - `:184` `UrlLauncherPaySheet`, and `:192` its mode
    `LaunchMode.inAppBrowserView`;
  - `:226` the return links' channel.
- `lib/core/web/pay_sheet_view.dart`:
  - `:95` polling;
  - `:108` the return link, which closes the sheet;
  - `:117` coming back on screen;
  - `:142` reading the status;
  - `:164` started → pending, never failed;
  - `:189` done.
- `lib/core/web/web_page_screen.dart:79` (the choice), `:129` (done, reported
  as the order received page) and `:188` (the sheet in place of the web
  view).
- `lib/core/routing/app_router.dart:444`: a cold start from the link opens
  Orders.
- `tool/src/build_config_tool.dart:779` `returnSchemeOf`, written to
  `android/app/yallapp.properties` and `ios/Flutter/YallappBuild.xcconfig`.
- Android:
  - `android/app/build.gradle.kts:42` (the manifest placeholder);
  - `android/app/src/main/AndroidManifest.xml:59` and `:69`
    (`PayReturnActivity`, the scheme);
  - `android/app/src/main/kotlin/com/yallapp/app/PayReturnActivity.kt`;
  - `MainActivity.kt:39` `payReturned` and `:133` `running`.
- iOS:
  - `ios/Runner/Info.plist:36` (`CFBundleURLTypes`);
  - `ios/Runner/AppDelegate.swift:36` (`registrar.addSceneDelegate`) and
    `:51` and `:64` (`PayReturn`, which takes the link before Flutter's deep
    linking).
- Texts: 14 `paySheet…` strings in `lib/l10n/app_{en,ar,tr}.arb`, regenerated
  into `app_localizations*.dart`, the overlay and
  `platform/web/src/lib/i18n/app-strings.json`.

## Tests and their real results

All run here on 18 November with Flutter 3.47.5 (installed as
`.github/workflows/mobile.yml` pins it) and Node 22.

Flutter (`mobile/`):

- `dart run tool/apply_config.dart config/example.json`: the generated files
  are up to date (only the new `returnScheme` and `YALLAPP_RETURN_SCHEME`
  lines).
- `dart format --set-exit-if-changed lib test tool`: 0 changed.
- `flutter analyze`: no issues.
- `flutter test test/widget/phase170_pay_sheet_test.dart`: **22 passed**.
  - Which pages open in the sheet: only Yallapp's payment page on the
    platform's hosts; not its order page, another host, http, `/give`, or a
    shop's site.
  - The scheme is the same as the build tool's.
  - Never in the preview, nor without an app ID.
  - The `/app` entry.
  - The return link as Android and iOS hand it.
  - The status and the reported address.
  - **The launch mode** is `LaunchMode.inAppBrowserView`. Close only where
    the platform supports it. No browser → false.
  - **The return link**: closes the sheet, pops `true` with
    `…/order-received?shop_order=placed`, and a paid order beats
    `result=failed`. A bank transfer placed counts as through.
  - **Resume without a link**:
    - paid → through;
    - started → "isn't confirmed yet" (no "failed"), then paid by the next
      poll;
    - open → "Not paid yet", and "Open the payment page" opens the same
      `/app`;
    - closed;
    - the platform out of reach → "couldn't check".
  - A quiet poll changes nothing.
  - **The web view as before**: builds without an app ID, a shop's website
    checkout, a donation's page, a phone with no browser for the sheet.
  - A cold start from the return link → Orders.
- `flutter test test/unit/build_config_tool_test.dart`: 21 passed (with the
  new return-scheme test).
- Whole `flutter test`: **2,167 passed, 776 skipped, 0 failed** (exit 0).
- `tool/build_preview.sh`: rebuilt; `--check`: "The app preview is up to
  date."

Platform (`platform/web`):

- `npx next typegen` + `tsc --noEmit`: exit 0. eslint on the changed files:
  exit 0, no findings.
- `next build` (production): passed; `/pay/[token]/app` and
  `/pay/[token]/status` listed.
- vitest `phase170-pay-in-app.test.ts`: **7 passed**:
  - the scheme;
  - the link without the token;
  - the cookie's attributes;
  - `/app`'s 303, its cookie and its 404 for non-tokens;
  - `/status`'s states.
- vitest with the related files (`phase170-pay-in-app`, `translations`
  (app-strings.json up to date), `phase155-wallets`, `publish-for-all`
  (`CLIENT_APP_RELEASE`), `embedded-gateways`, `payment-providers`): **6
  files, 94 passed**.
- e2e `pay-in-app.spec.ts`: **4 passed**:
  - In a browser, the failed page and the checkout show no "Back to the
    app".
  - From `/app`, the token-scoped cookie is set and the payment page opens.
  - The failed and pending pages give the link (`result=failed`, `pending`),
    not going by itself, and never with the token.
  - A bank transfer gives `result=placed` and doesn't go by itself; the
    status reads `awaiting_payment`.
  - Marked paid by the owner, the done page gives `result=paid` and goes by
    itself. The same page in another browser has no link.
  - Cancelled by the owner, the "Order closed" note gives `result=closed`.
  - Each payment has its own cookie path.
  - `/app` and `/status` refuse non-tokens.
- e2e regression: `catalog`, `connected-pay`, `manual-payments` and
  `stripe-paypal`: **13 passed**.
- How the e2e ran: the repo's Playwright wants a browser build that isn't in
  this environment. It ran with a throwaway config (not committed) giving
  Playwright the pre-installed Chromium (`launchOptions.executablePath`); the
  specs and the repo's config are unchanged.

## What only a real phone can confirm

- Apple Pay showing in SFSafariViewController and Google Pay in a Custom Tab
  for a real shop (Stripe's domain registered, Phase 155.7).
- Safari's "Open in <app>?" prompt for the app's scheme, and the app's scene
  delegate getting the link (`PayReturn.scene(_:openURLContexts:)`).
  `closeInAppWebView` closing the SFSafariViewController.
- Chrome handing the scheme to `PayReturnActivity`:
  - from the done page's automatic return (Chrome may want a tap, which is
    why the button stays);
  - `CLEAR_TOP` taking the Custom Tab away under the app;
  - Back not returning to it.
- A cold start from the link (the app swiped away while paying) landing on
  Orders.
- The resume check on Android after ✕, and the polling on iPhone after Done.
- Each gateway in the sheet: Stripe, iyzico's and Kashier's forms with
  3-D Secure, Fawaterk's and PayPal's pages, and coming back from each.
- The Kotlin and Swift code compiled: this environment has no Android SDK
  (installing one was refused here) and no Xcode. CI's `flutter build apk
  --debug` compiles the Android side; the iPhone build needs a Mac.

Steps: LAUNCH-CHECKLIST Phase 170.
