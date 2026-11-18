# Sign out in the Account — 18 November 2026

The owner's report: "In the Leqaa or KechFlora app, there's no Sign out in
my account." Both apps come from the Leqaa Signature template
(`platform/web/src/lib/studio/demo-designs/leqaa-signature.ts`): their
Account is the premium `petal` look (`chrome.system: "petal"`), under the
floating `petal` tab bar (`LEQAA_A_BAR`, `LEQAA_B_BAR`).

Scope: Sign out, and Delete account being reachable. The sign-in methods
and Forgot password are on `wip-sign-in-fix` and were not touched.

ROADMAP Phase 167. `CLIENT_APP_RELEASE` 10 (7 when first written; renumbered on merging main, where 7 is Phase 152).

## How the Account can be drawn, and where Sign out was

All line numbers below are in `main` before this change.

| What draws the Account | Sign out before | Why it was missing |
|---|---|---|
| The app's own list (`ProfileScreen`, plain or card top) | Last, in its own card | Reachable only with a classic bar; under a floating bar, hidden (cause 1) |
| Account menu `cover` (`_Cover`) | Last | Cause 1 |
| Account menu `tiles` (`_Tiles`) | Last (a button) | Cause 1 |
| Account menu `night` (`_Night`) | Last | Cause 1 |
| Account menu `academy` (`AcademyAccountLook`) | Last | A fixed 110-point end: enough for Ufuq's pill, not for every bar or phone (cause 1) |
| Premium system looks `large`, `glass`, `photo`, `brand`, `petal` (`PremiumAccountLook`) | Last | Cause 1: this is Leqaa's and Kech Flora's |
| A Studio page drawn around the account screen (every template's Account tab) | The hosted screen's, last | Cause 1 (it is the same screen) |
| A Studio page (or classic page) on the Account tab without the account screen | None | Cause 2 |
| Store, Courier and other kinds | All use `ProfileScreen` (`store_routes.dart:116` and each kind's routes) | As the looks above; Yallapp Courier's own account adds its Delete in the same card |

Delete account: in Settings (`settings_screen.dart:452`). Every look lists
Settings: the app's own list always; a Studio account menu can't hide it
(`profile_screen.dart:281`, `required = {'settings', 'privacy', 'terms'}`);
the premium looks put it with the app's entries. It was reachable
wherever the Account itself was, except on a page with no account screen
(cause 2).

## Root causes

### 1. Sign out lay under a tab bar that floats over the page

- `mobile/lib/modules/shared/shared_routes.dart:416-425`: the petal bar
  (and the pill, the dock, frosted glass with a margin) floats over the
  body: `extendBody: overBody`. Flutter then puts the bar's height in the
  body's bottom padding, for the screen to keep clear of.
- The Account lists never added that padding; each ended a fixed distance
  after Sign out, its last entry:
  - `mobile/lib/modules/shared/account/premium/premium_account.dart:226`
    (`padding: EdgeInsets.zero`) and `:259` (28 points): the petal look.
  - `mobile/lib/modules/shared/account/account_looks.dart:323` (cover),
    `:573` (tiles), `:817` (night): 24 points.
  - `mobile/lib/modules/shared/account/academy_look.dart:74`: 110 points.
  - `mobile/lib/modules/shared/account/profile_screen.dart:365`: 24 points.
- Measured before the fix on Leqaa look B's project as the platform makes
  it (800×600 test window): scrolled to its very end, Sign out sat at
  y 514–572 under the bar; a tap at its centre hit the bar, and no dialog
  opened. Look A: the same. So Sign out was drawn but could never be seen
  whole or tapped: "there's no Sign out".

### 2. A Studio page standing for the Account had no Sign out

- `mobile/lib/modules/shared/pages/page_screen.dart:85-97`: a Studio page
  without a `screen` is drawn by its elements alone
  (`studio_page.dart:152`, the list's only child); a classic page by its
  blocks (`page_screen.dart:117`). On the Account tab, nothing added Sign
  out or Delete account.
- Studio had no Sign out element to put there:
  `platform/web/src/lib/pages/types.ts:282` (`ACTION_TYPES` had no such
  action) and `mobile/lib/core/api/models/page_models.dart:383`.

### 3. Studio's templates showed the owner no Sign out on the account page

- `platform/web/src/lib/studio/demo-pages.ts:141-148`: every template's
  account page was an empty page around the account screen. The canvas
  drew the screen with its Log out row, but there was no element of its
  own for the owner to see and keep.

## The fix

App (`mobile/lib`):

- `modules/shared/account/sign_out.dart` (new): `confirmSignOut` (asks,
  then signs out; Yallapp Courier ends every company's session, as before)
  and `confirmDeleteAccount` (asks; Courier's own account in Courier),
  used by every look, Settings and Studio's element; `accountListEnd`
  (an Account list's end: its own space plus the bottom padding, which
  holds a floating bar's height and the phone's edge); `AccountPageEnd`
  (Sign out and Delete account on a card in the page's colours, for a
  signed-in person).
- Every Account list ends at `accountListEnd`: `premium_account.dart`,
  `account_looks.dart` (cover, tiles, night), `academy_look.dart` (at
  least its 110 points), `profile_screen.dart`.
- `core/api/models/page_models.dart`: `PageActionType.signOut`
  (`sign_out`). `pages/page_actions.dart`: it runs `confirmSignOut`, and
  opens only for someone signed in; `pages/studio_page.dart`: a Sign out
  element is never shown to someone signed out.
- `pages/screen_page.dart` `pageStandsForAccount`: a page the Account tab
  (id `account`) opens, or at `account`, not drawn around the account
  screen. `page_screen.dart` and `studio_page.dart` (`accountEnd`) add
  `AccountPageEnd` at its end unless it has a Sign out element.
- `studio_page.dart` `_aroundScreen`: over the account screen, a page's
  Sign out element is not drawn a second time over it; the account's own
  Sign out, last, in its look, stands for it.

Platform (`platform/web`):

- `lib/pages/types.ts`, `lib/pages/validate.ts`: the `sign_out` action,
  with nothing more to choose. Studio's tap picker
  (`app/studio/editor/inspector.tsx`) and the dashboard's
  (`app/dashboard/pages/controls.tsx`) offer it: "Signs the person out
  (asked first)", in English, Egyptian Arabic and Turkish.
- `lib/studio/demo-pages.ts` `accountSignOut`: every template's account
  page has a Sign out button (`sign_out`, `visibility: signed_in`), its
  word in English, Arabic and Turkish (`app-words.ts` `signOut`); kept
  under `bare_tab_pages` (`start.ts`) and after a look's own elements
  (`demo-designs/index.ts`).
- The contract: `Action.type` has `sign_out` (`docs/api/openapi.yaml`,
  `public/developers/openapi.yaml`, the same).
- `CLIENT_APP_RELEASE` 10 (`lib/builds/app-release.ts`). The preview
  rebuilt (`mobile/tool/build_preview.sh`). The app's test projects made
  again from the platform (`mobile/test/support`, the `YALLAPP_WRITE_*`
  writers): their only change is the account page's new element (and the
  ids after it, which are numbered in order).

App texts: the existing `logOut`, `logOutTitle`, `logOutMessage`,
`deleteAccount`, `deleteAccountTitle`, `deleteAccountMessage`, `cancel`
(`platform/web/src/lib/i18n/app-strings.json`), already in English,
Modern Standard Arabic and Turkish; no new app string was needed.

## Tests and their results

All run in this session, on the code as committed (Flutter 3.47.5 installed
as `.github/workflows/mobile.yml` pins it; `flutter pub get --enforce-lockfile`).

| What | Command | Result |
|---|---|---|
| The cause, before the fix | a probe widget test on `signatures/flowers_a.json` and `flowers_b.json` (not kept) | Sign out found, under the petal bar at the list's very end; the tap hit the bar; no dialog (both looks) |
| The same probe, after the fix (390×844) | as above | Sign out at y 664–722, above the bar; the tap opens the confirmation |
| Every Account look and the templates' account pages | `flutter test test/widget/phase167_sign_out_test.dart` | **62 passed, 0 failed** |
| — of which | 12 looks (app's own list; plain, card, cover, tiles, night, academy menus; large, glass, photo, brand, petal) × English, Arabic (RTL checked), Turkish, under the petal bar: Sign out reachable above the bar, Cancel keeps the person signed in, confirm signs out, Delete account reached from Settings and asks first | 36 |
| | the classic bar | 1 |
| | a Studio page on the Account tab with no account screen (en, ar, tr): Sign out and Delete account added at its end; with its own Sign out element, that one and no second | 4 |
| | a page around the account with a Sign out element: no second one over the screen | 1 |
| | the 20 Signature looks' projects (`test/support/signatures`), each kind's app type and bar: Delete account reachable, Sign out above the bar, asks, signs out | 20 |
| The whole app suite | `flutter test` | **All tests passed: 2207 passed, 776 skipped** (the screenshot tests, skipped unless `YALLAPP_SCREENSHOTS=true`), 0 failed |
| Analysis | `flutter analyze` | No issues found |
| Format | `dart format lib test` | 711 files, 0 changed |
| The preview | `tool/build_preview.sh`, then `--check` | Built; "The app preview is up to date." |
| The platform's new tests | `npx vitest run tests/unit/phase167-sign-out.test.ts` | 36 passed |
| The template tests touched | `studio-demo-templates`, `studio-academy-template`, `signature-looks`, `leqaa-flowers` and the other fixture writers | passed (223 in the six writer files, with the fixtures written again; then compared without writing) |
| The whole platform suite | `npx vitest run` | **372 files passed, 57 skipped; 4718 tests passed, 171 skipped, 0 failed**. A first full run had 1 failure, `studio-academy-template.test.ts` ("every page of it valid as saved"), which still expected an empty account page: updated to the new element, then 10/10, and the whole suite run again for the result above |
| Types | `npm run typecheck` | exit 0 |
| The contract | `npx @redocly/cli@2.54.2 lint docs/api/openapi.yaml` | valid (6 warnings, as before); `api-reference.test.ts` passed, its JSON unchanged |

Not run: the Playwright e2e specs, the screenshot tests, a build on a real
phone.

## Left open

- An app built before release 10 shows a template's new Sign out element
  over its account as a button that does nothing (it doesn't know
  `sign_out`). Only projects started from a template after this change
  have the element, and release 10 rebuilds every app (ROADMAP 167.7).
- On a phone, after the release-10 builds: Leqaa's and Kech Flora's
  Account, Sign out above the petal bar, in Arabic and English
  (ROADMAP 167.8).
- Seen while testing, not changed: on a test phone (390×844, the test
  font), Leqaa look A's home has a 14-point overflow in its element
  `sig-87-over`, before and after this change. Not part of the Account.
