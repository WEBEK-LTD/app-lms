import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/widgets/app_nav_bar.dart';
import 'package:yallapp/modules/market/screens/market_checkout_screen.dart';

import '../screenshots/support/shot.dart' show loadAppFonts;
import '../screenshots/support/studio_demo.dart';
import '../screenshots/support/zad.dart';
import '../support/test_app.dart';

/// 177 Zad's approved bar (docs/qa/2026-11-18-market-store): Home, Shops,
/// Cart, Orders and Account. The basket had no branch of the shell (a
/// page pushed on top only), while the bar counted it: Cart opened Orders,
/// Orders opened Account, and Account threw. Each tab now opens its own
/// screen with the bar under it, a restaurant's staff's tab too.
void main() {
  setUpAll(loadAppFonts);

  Finder bar() => find.byType(AppNavBar);
  Finder tab(String label) => find.descendant(
    of: bar(),
    matching: find.byWidgetPredicate(
      (w) =>
          w is Semantics &&
          w.properties.button == true &&
          (w.properties.label ?? '').startsWith(label),
    ),
  );

  for (final look in ['a', 'b']) {
    testWidgets('look ${look.toUpperCase()}: each tab opens its own screen', (
      tester,
    ) async {
      tester.view
        ..physicalSize = const Size(360, 800) * 2
        ..devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      final demo = StudioDemo.signature('multi-vendor', look);
      final api = zadStudioApi(look: demo);
      await StudioDemo.zad.prepare(tester);
      final app = TestApp(
        api: api,
        appType: AppType.food,
        signedIn: true,
        overrides: Zad.overrides,
      );
      await app.pump(tester);
      await TestApp.settle(tester, 30);
      String where() =>
          Uri.parse(app.container.read(appRouterProvider).state.uri.toString())
              .path;
      final tabs = (api.navigation!['tabs'] as List)
          .cast<Map<String, dynamic>>();
      final labels = [for (final t in tabs) t['label'] as String];
      final places = {
        for (final t in tabs)
          t['label'] as String: switch ((t['target'] as Map)['screen']) {
            'cart' => Paths.marketCheckout,
            'food_orders' || 'orders' => Paths.foodOrders,
            'account' => Paths.account,
            'search' => Paths.marketSearch,
            'club' => Paths.marketClub,
            _ => Paths.page((t['target'] as Map)['page_slug'] as String),
          },
      };
      expect(labels, hasLength(5));
      for (final label in [...labels.reversed, ...labels]) {
        expect(tab(label), findsOneWidget, reason: 'the $label tab');
        await tester.tap(tab(label), warnIfMissed: false);
        await TestApp.settle(tester, 30);
        expect(where(), places[label], reason: 'the $label tab');
        expect(
          bar().hitTestable(),
          findsOneWidget,
          reason: 'the bar on $label',
        );
        expect(tester.takeException(), isNull, reason: 'the $label tab');
      }
      // The basket is the tab's own screen, without a back button.
      await tester.tap(
        tab(
          labels[tabs.indexWhere(
            (t) => (t['target'] as Map)['screen'] == 'cart',
          )],
        ),
      );
      await TestApp.settle(tester, 30);
      expect(find.byType(MarketCheckoutScreen), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp(r'^Back$')), findsNothing);
      SemanticsBinding.instance.ensureSemantics().dispose();
    });
  }
}
