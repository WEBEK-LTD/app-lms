# QA 2026-11-18: the Orders tab and the empty journey (Phase 171)

Found by QA on Leqaa's flower-shop app, made from the Leqaa "signature" Studio
template (`platform/web/src/lib/studio/demo-designs/leqaa-signature.ts`, the
petal tab bar). Branch `wip-orders-tab`. Line numbers marked "before" are from
`5dba617` (main when the work started); "after" are from this branch.

## Bug 1 (major): the Orders tab opened Orders on top, without the tab bar

### Root cause

These were the three suspects:

- **The tab's action.** It was right. Leqaa's tab is `screen("orders")`
  (`leqaa-signature.ts:921`). The hosted API serves the Orders page as that
  screen, because the page has `studio.screen: "orders"`.
- **The router.** This was the cause.
  - A store maps the `orders` screen to `Paths.orders`, which is
    `/account/orders` (`mobile/lib/modules/store/store_routes.dart:40`, before;
    `mobile/lib/core/routing/paths.dart:53`). That is a page under Account. It
    is not one of the store's tab places: `tabPaths` is home, shop, cart and
    account (`store_routes.dart:26`, before).
  - `AppModule.isTabPath` only knew a module's `tabPaths`, pages and web tabs
    (`mobile/lib/core/routing/app_module.dart:113-116`, before). So
    `_shellTab` made the tab a `pushLocation` instead of a branch
    (`mobile/lib/core/routing/app_router.dart:356` and `:365`, before).
  - When the bar was tapped, `MainShell` called `context.push(tab.pushLocation!)`
    (`mobile/lib/modules/shared/shared_routes.dart:478`, before). The route is
    Account's `orders` sub-route on the root navigator
    (`shared_routes.dart:139`, before). The result was a page over the shell,
    with no bar.
  - Its Back button came from `AccountScaffold`, which always drew
    `AppBackButton` (`mobile/lib/modules/shared/account/account_scaffold.dart:60`,
    before).
- **The signed-in redirect.** Not the cause. Signed in, `redirectFor` lets
  every place except sign-in through (`app_router.dart`, `redirectFor`).

The same cause hit every tab whose screen exists only as a pushed page:

| Tab | Path | How it was opened (before) |
|---|---|---|
| Notifications | `/notifications` | a top-level shared route |
| Settings | `/account/settings` | Account's sub-route |
| Chat, in app types whose `tabPaths` lack it (a travel app's Messages tab) | `/chat` | pushed |
| An academy's Teachers (Rawaq Academy's tab) | `/teachers` | a pushed lms route, `mobile/lib/modules/lms/lms_routes.dart:210`, before |

The cart, account and wishlist were already tabs. Cart and account are store
`tabPaths`. Leqaa's wishlist is a Studio page.

### Fix

- **Shared tab paths.** `Paths.sharedTabPaths`
  (`mobile/lib/core/routing/paths.dart:216`, after) is orders, notifications,
  settings and chat. `AppModule.isTabPath` also accepts these
  (`app_module.dart:118`, after), so a tab of one becomes a shell branch.
- **The screens a branch shows.** `sharedTabScreens()` (`shared_routes.dart:168`,
  after) supplies them:
  - `OrdersScreen`, with the order's `:id` page on the root navigator;
  - `NotificationsScreen`;
  - `SettingsScreen`, with its devices and password pages.

  `tabbedRoutes` looks one up when the module has no screen for the tab
  (`shared_routes.dart:260`, after).
- **No duplicate routes.** `_withoutTabs` (`shared_routes.dart:184`, used at
  `:270` and `:332`, after) leaves out a sub-route that a tab now owns.
  Example: with an Orders tab, Account's `orders` page is gone, so Account's
  "Orders" goes to the tab. A Notifications tab likewise drops the top-level
  notifications route (`shared_routes.dart:344`, after).
- **Order details.** An order opened from the Orders tab still covers the bar
  (root navigator). Back returns to the tab.
- **Teachers.** They are now a `TabScreen` of the academy with its own bar, and
  are in `tabPaths` (`lms_routes.dart:45`, after). Without a tab, they open on
  top as before.
- **Back button.** `AccountScaffold` shows the back button only when the screen
  can pop (`account_scaffold.dart:63`, after).
- **Built-in screens.** `builtInScreenWidget` (`screen_page.dart`) knows the
  shared screens too.
- **Templates.** Nothing to change: the fix is in the app's router, so every
  template with such a tab is covered.

## Bug 2 (minor): with no orders, Orders showed a sample journey

### Root cause

`OrderJourneyTimeline` draws a timeline with `source: latest_order`. With no
order on its way, it fell back to `PremiumTimeline`, the steps as drawn with
"Order placed" lit (`mobile/lib/modules/shared/account/order_journey.dart:137`,
before). It did the same signed out and while loading.

`StudioNodeView.shows` had no rule for this timeline (`_ => true`,
`mobile/lib/modules/shared/pages/studio_page.dart:1118`, before). So its card
and its heading, a separate row named "How your flowers travel", always
showed.

### Fix

- **Which order.** `journeyOrder` (`order_journey.dart:108`, after) picks the
  newest order on its way. Failing that, it picks the newest delivered order,
  which shows the last step. Cancelled, refunded and failed orders don't count.
- **Visibility.** `orderJourneyShows` (`order_journey.dart:134`, after) is the
  timeline's rule in `shows` (`studio_page.dart:1105`, after). Signed out,
  while loading or with no order, it is false, and the card is not drawn.
- **The heading.** `isJourneyHeading` (`order_journey.dart:139`, after) treats
  the element of the same `name` just before the timeline as its heading.
  `_layout` leaves it out along with the timeline (`studio_page.dart:1785`,
  after). `StudioNode` now reads `name`.
- **Result.** The Orders page shows only its own "No orders yet / Start
  shopping".
- **Studio.** The canvas keeps its sample order.

## Release

- `CLIENT_APP_RELEASE` is 11, with a comment line "11 171 …"
  (`platform/web/src/lib/builds/app-release.ts`). Releases 8 to 10 belong to
  other branches, per the coordinator. The integration branch
  `wip-urgent-apps` replaces this line.
- Preview rebuilt with `mobile/tool/build_preview.sh`; `--check` reports "The
  app preview is up to date."
- Docs: ROADMAP Phase 171 (after Phase 154) and a STATUS entry.

## Tests (run here, Flutter 3.47.5 stable, installed as in `.github/workflows/mobile.yml`)

### New tests: `mobile/test/widget/phase171_orders_tab_test.dart`, 29 tests

These use the real Signature projects `test/support/signatures/flowers_a.json`
and `flowers_b.json`, served as the hosted API serves them, for look A and
look B, each in English (LTR) and Arabic (RTL).

**Signed in:**
- Each of the five tabs (Home, Bouquets, Send, Orders, Account), tapped in a
  mixed order, keeps the bar, which is on top with no back button. The router
  is at the tab's place.
- Orders → an order: `OrderScreen` covers the bar at `/account/orders/1043`.
  Back returns to the Orders tab with the bar. Then Account and Orders again.
- No orders: "No orders yet" is shown. There is no timeline, no
  `OrderJourneyTimeline`, no "How your flowers travel" heading and no "Current
  step".
- An order shipped (plus an older one being prepared): the heading shows, the
  active step is index 2 ("On its way"), and the journey reads "Order #1043".
- Only a delivered order: the active step is index 3 (the last).

**Signed out:**
- Bouquets, Send and Home keep the bar.
- Orders opens sign-in (`from=/account/orders`). "Not now" returns to the tabs
  with no back button. No journey, and no orders requested.

**Other tabs (academy app, English and Arabic):**
- A Teachers tab and a Notifications tab show their screens with the bar and
  no back button.
- Control: without a tab, Teachers is pushed with a back button, and Back
  returns to the tabs.

### Results

| Run | Result |
|---|---|
| `phase171_orders_tab_test.dart` with the fix | **29/29 passed** |
| The 24 Leqaa tests against the old `lib/` (`git stash` of `lib`) | **24/24 failed**: signed in, no `AppNavBar` under `/account/orders`; signed out, the sign-in screen pushed without "Not now" |
| The 4 Teachers/Notifications tab tests against the old `lib/` | **4/4 failed** |
| The push control against the old `lib/` | passed |
| `phase132_order_journey_test.dart` after updating it | **15/15 passed** |
| `dart format --output=none --set-exit-if-changed lib test tool` | 0 changed |
| `flutter analyze` | No issues found |
| Phase171 + phase132 together on the merged tree (after merging `origin/main`) | **44/44 passed** |
| Whole `flutter test` on the final tree (after the merge, the preview rebuilt) | **All tests passed: 2185 passed, 776 skipped, 0 failed** (7 min 51 s). An earlier full run before the merge also passed 2185, but it overlapped a `git stash` of `lib`, so it is not counted |

The phase132 change was deliberate. Its "no order on its way: the steps as
drawn" and "signed out: the steps as drawn" tests became "only a delivered
order: its last step", "no order: nothing" and "signed out: nothing, no
orders asked".

### Not tested

- Not tried on a phone (ROADMAP 171.7).
- The web Studio canvas is unchanged and was not tested.
