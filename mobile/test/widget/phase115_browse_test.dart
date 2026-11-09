import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/market/data/market_basket.dart';
import 'package:yallapp/modules/market/screens/market_checkout_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/market_order_fixtures.dart';
import '../support/test_app.dart';

/// 115 A kind, a cuisine or the offers open a filtered list of vendors, and
/// a finished order goes back in the basket in one tap.
void main() {
  FakeApi marketApi() {
    final api = FakeApi(
      config: {
        ...configJson(lms: null),
        'market': {
          'currency': 'EGP',
          'kinds': ['restaurant', 'grocery'],
          'payment': {'cash': true},
        },
      },
    );
    api.me = userJson();
    api.marketVendors
      ..add(marketVendorSummaryJson())
      ..add(marketVendorSummaryJson(id: 8, kind: 'grocery'));
    return api;
  }

  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(390, 1600) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  testWidgets('a kind opens its vendors, offers ask for offers', (
    tester,
  ) async {
    phone(tester);
    final api = marketApi();
    final app = TestApp(api: api, appType: AppType.food, signedIn: true);
    await app.pump(tester);
    final router = app.container.read(appRouterProvider);
    router.push(Paths.marketList(kind: 'grocery', title: 'Groceries'));
    await TestApp.settle(tester, 20);
    expect(find.text('Groceries'), findsOneWidget);
    expect(find.text('Green Basket Market'), findsWidgets);
    expect(find.text('Nile Grill House'), findsNothing);
    expect(api.marketVendorQueries.last.kind, VendorKind.grocery);

    router.push(Paths.marketList(offers: true, title: 'Offers'));
    await TestApp.settle(tester, 20);
    expect(api.marketVendorQueries.last.offers, isTrue);
    expect(api.marketVendorQueries.last.kind, isNull);

    router.push(Paths.marketList(category: 'grills', title: 'Grills'));
    await TestApp.settle(tester, 20);
    expect(api.marketVendorQueries.last.category, 'grills');
  });

  testWidgets('order again fills the basket and opens the checkout', (
    tester,
  ) async {
    phone(tester);
    final api = marketApi();
    api.marketOrders[901] = marketOrderJson(status: 'delivered');
    final app = TestApp(api: api, appType: AppType.food, signedIn: true);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.marketOrders);
    await TestApp.settle(tester, 20);
    await tester.tap(find.text('Order again'));
    await TestApp.settle(tester, 20);
    final basket = app.container.read(marketBasketProvider);
    expect(basket.vendor?.id, '7');
    expect(basket.lines.single.item.id, '1');
    expect(basket.lines.single.quantity, 1);
    expect(find.byType(MarketCheckoutScreen), findsOneWidget);
  });
}
