import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/market_order_fixtures.dart';
import '../support/test_app.dart';

/// 115 Following an order: the courier on the map when the app's couriers
/// bring it, only its steps when the vendor delivers it.
void main() {
  FakeApi api({bool map = true}) {
    final api = FakeApi(
      config: {
        ...configJson(lms: null),
        // The map's tiles, without the attribution line (the tests' font is
        // wider than a phone's).
        if (map)
          'delivery': {
            ...deliveryConfigJson(),
            'map': {'tiles_url': 'https://tiles.example.com/{z}/{x}/{y}.png'},
          },
        'market': {
          'currency': 'EGP',
          'kinds': ['restaurant'],
          'payment': {'cash': true},
        },
      },
    );
    api.me = userJson();
    return api;
  }

  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(390, 1600) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  Future<void> openOrder(WidgetTester tester, FakeApi api, int id) async {
    final app = TestApp(api: api, appType: AppType.food, signedIn: true);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.marketOrder(id));
    await TestApp.settle(tester, 20);
  }

  testWidgets('the app\'s courier on the map with the steps', (tester) async {
    phone(tester);
    final fake = api();
    fake.marketOrders[5] = marketOrderJson(
      id: 5,
      status: 'on_the_way',
      tracking: {
        'mode': 'map',
        'courier': {'name': 'Ahmed', 'photo_url': null, 'vehicle': 'Motorbike'},
        'position': {'lat': 29.95, 'lng': 31.24},
        'updated_at': '2026-11-04T10:20:00Z',
        'route': const [],
      },
    );
    await openOrder(tester, fake, 5);
    expect(find.text('Order M-5'), findsOneWidget);
    expect(find.byKey(const ValueKey('market-order-map')), findsOneWidget);
    expect(find.text('Ahmed is bringing your order'), findsOneWidget);
    expect(find.text('On the way'), findsWidgets);
    expect(find.text('Delivered'), findsOneWidget);
  });

  testWidgets('a vendor that delivers itself: the steps, no map', (
    tester,
  ) async {
    phone(tester);
    final fake = api(map: false);
    fake.marketOrders[6] = marketOrderJson(
      id: 6,
      status: 'accepted',
      deliveryBy: 'vendor',
      tracking: {
        'mode': 'stages',
        'courier': null,
        'position': null,
        'updated_at': null,
        'route': const [],
      },
    );
    await openOrder(tester, fake, 6);
    expect(find.byKey(const ValueKey('market-order-map')), findsNothing);
    expect(find.textContaining('delivers this order itself'), findsOneWidget);
    expect(find.text('Being prepared'), findsWidgets);
  });
}
