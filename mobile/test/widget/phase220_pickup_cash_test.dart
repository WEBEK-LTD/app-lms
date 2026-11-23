import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/l10n/app_localizations.dart';
import 'package:yallapp/modules/market/screens/market_checkout_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/market_order_fixtures.dart';
import '../support/test_app.dart';

/// 220 (177.12) With Pick up chosen at the marketplace's checkout, cash is
/// paid at pickup, not "on delivery".
void main() {
  FakeApi marketApi() {
    final api = FakeApi(
      config: {
        ...configJson(lms: null),
        'market': {
          'currency': 'EGP',
          'kinds': ['restaurant', 'grocery'],
          'payment': {'cash': true},
          'pickup': true,
        },
      },
    );
    api.me = userJson();
    api.marketVendors.add(marketVendorSummaryJson());
    return api;
  }

  testWidgets('cash reads "Cash at pickup" once Pick up is chosen', (
    tester,
  ) async {
    tester.view
      ..physicalSize = const Size(390, 1600) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    final api = marketApi();
    api.marketOrders[901] = marketOrderJson(status: 'delivered');
    final app = TestApp(api: api, appType: AppType.food, signedIn: true);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.marketOrders);
    await TestApp.settle(tester, 20);
    await tester.tap(find.text('Order again'));
    await TestApp.settle(tester, 20);
    expect(find.byType(MarketCheckoutScreen), findsOneWidget);

    expect(find.text('Cash on delivery'), findsOneWidget);
    expect(find.text('Cash at pickup'), findsNothing);

    await tester.tap(find.text('Pick up'));
    await TestApp.settle(tester, 20);
    expect(find.text('Cash at pickup'), findsOneWidget);
    expect(find.text('Cash on delivery'), findsNothing);

    await tester.tap(
      find.descendant(
        of: find.byType(SegmentedButton<MarketFulfilment>),
        matching: find.text('Delivery'),
      ),
    );
    await TestApp.settle(tester, 20);
    expect(find.text('Cash on delivery'), findsOneWidget);
  });

  test('the string in English, Arabic and Turkish', () async {
    final en = await AppLocalizations.delegate.load(const Locale('en'));
    final ar = await AppLocalizations.delegate.load(const Locale('ar'));
    final tr = await AppLocalizations.delegate.load(const Locale('tr'));
    expect(en.marketPayCashPickup, 'Cash at pickup');
    expect(ar.marketPayCashPickup, 'الدفع نقدًا عند استلام الطلب بنفسك');
    expect(tr.marketPayCashPickup, 'Teslim alırken nakit');
    for (final l in [ar, tr]) {
      expect(l.marketPayCashPickup, isNot(en.marketPayCashPickup));
      expect(l.marketPayCashPickup, isNot(l.marketPayCash));
    }
  });
}
