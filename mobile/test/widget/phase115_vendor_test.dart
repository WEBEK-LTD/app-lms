import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/market_order_fixtures.dart';
import '../support/test_app.dart';

/// 115 The vendor app: the orders with their answers, being busy, and
/// stock.
void main() {
  Map<String, dynamic> vendorOrder({
    int id = 901,
    String status = 'placed',
    String fulfilment = 'delivery',
  }) => {
    'id': id,
    'reference': 'M-$id',
    'status': status,
    'fulfilment': fulfilment,
    'scheduled_for': null,
    'lines': [marketOrderLineJson()],
    'subtotal': {'amount': '265.00', 'formatted': 'EGP 265.00'},
    'customer': {'first_name': 'Mona'},
    'notes': 'No onions',
    'dropoff': null,
    'payment': {
      'method': 'cash',
      'status': 'unpaid',
      'collect': fulfilment == 'pickup'
          ? {'amount': '265.00', 'formatted': 'EGP 265.00'}
          : null,
    },
    'prep_minutes': null,
    'ready_at': null,
    'courier': null,
    'created_at': '2026-11-04T12:00:00Z',
    'timeline': [
      {'status': 'placed', 'at': '2026-11-04T12:00:00Z'},
    ],
  };

  FakeApi vendorApi() {
    final api = FakeApi(
      config: {
        ...configJson(lms: null),
        'market': {
          'currency': 'EGP',
          'kinds': ['restaurant'],
          'payment': {'cash': true},
          'vendor_app': 'bundle',
        },
      },
    );
    api.me = userJson()..['roles'] = ['vendor'];
    return api;
  }

  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(390, 1200) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  testWidgets('a new order is accepted with its minutes, then ready', (
    tester,
  ) async {
    phone(tester);
    final api = vendorApi();
    api.vendorOrders['new'] = [vendorOrder()];
    final app = TestApp(
      api: api,
      appType: AppType.food,
      build: (b) => b.copyWith(role: AppRole.vendor),
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    expect(find.text('My store'), findsWidgets);
    expect(find.text('Stock'), findsWidgets);
    expect(find.textContaining('M-901 · Mona'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('vendor-order-901')));
    await TestApp.settle(tester, 20);
    expect(find.text('No onions'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('vendor-accept')));
    await TestApp.settle(tester, 10);
    await tester.tap(find.byKey(const ValueKey('vendor-prep-20')));
    await TestApp.settle(tester, 20);
    expect(api.vendorCalls, contains('accept 901 20'));

    await tester.tap(find.byKey(const ValueKey('vendor-ready')));
    await TestApp.settle(tester, 20);
    expect(api.vendorCalls, contains('ready 901'));
  });

  testWidgets('turning an order down asks why', (tester) async {
    phone(tester);
    final api = vendorApi();
    api.vendorOrders['new'] = [vendorOrder()];
    final app = TestApp(
      api: api,
      appType: AppType.food,
      build: (b) => b.copyWith(role: AppRole.vendor),
      signedIn: true,
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.vendorOrder(901));
    await TestApp.settle(tester, 20);
    await tester.tap(find.byKey(const ValueKey('vendor-reject')));
    await TestApp.settle(tester, 10);
    await tester.tap(find.byKey(const ValueKey('vendor-reject-outsideArea')));
    await tester.tap(find.byKey(const ValueKey('vendor-reject-send')));
    await TestApp.settle(tester, 20);
    expect(api.vendorCalls, contains('reject 901 outsideArea'));
  });

  testWidgets('a pick-up order is handed over with the customer\'s code', (
    tester,
  ) async {
    phone(tester);
    final api = vendorApi();
    api.vendorOrders['active'] = [
      vendorOrder(status: 'ready', fulfilment: 'pickup'),
    ];
    final app = TestApp(
      api: api,
      appType: AppType.food,
      build: (b) => b.copyWith(role: AppRole.vendor),
      signedIn: true,
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.vendorOrder(901));
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('vendor-collect')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('vendor-picked-up')));
    await TestApp.settle(tester, 10);
    await tester.enterText(
      find.byKey(const ValueKey('vendor-pickup-code')),
      '4821',
    );
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('vendor-pickup-send')));
    await TestApp.settle(tester, 20);
    expect(api.vendorCalls, contains('handover 901 customer 4821'));
  });

  testWidgets('busy for a while, and stock switches', (tester) async {
    phone(tester);
    final api = vendorApi();
    api.vendorProducts.add({
      'id': 5,
      'name': 'Mixed grill',
      'price': {'amount': '265.00', 'formatted': 'EGP 265.00'},
      'in_stock': true,
    });
    final app = TestApp(
      api: api,
      appType: AppType.food,
      build: (b) => b.copyWith(role: AppRole.vendor),
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    await tester.tap(find.byKey(const ValueKey('vendor-busy')));
    await TestApp.settle(tester, 10);
    await tester.tap(find.byKey(const ValueKey('vendor-busy-30')));
    await TestApp.settle(tester, 20);
    expect(api.vendorCalls, contains('desk busy=30 end=false paused=null'));

    app.container.read(appRouterProvider).go(Paths.vendorStock);
    await TestApp.settle(tester, 20);
    await tester.tap(find.byKey(const ValueKey('vendor-stock-5')));
    await TestApp.settle(tester, 20);
    expect(api.vendorCalls, contains('stock 5 false'));
  });
}
