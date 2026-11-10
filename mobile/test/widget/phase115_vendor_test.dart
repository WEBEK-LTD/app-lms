import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/market_order_fixtures.dart';
import '../support/test_app.dart';

import 'package:yallapp/modules/vendor/screens/vendor_books_screens.dart';

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

  Map<String, dynamic> money(String amount) => {
    'amount': amount,
    'formatted': 'EGP $amount',
  };

  testWidgets('a grocery order is picked line by line, then ready', (
    tester,
  ) async {
    phone(tester);
    final api = vendorApi();
    api.vendorDesk['kind'] = 'grocery';
    api.vendorProducts.add({
      'id': 5,
      'name': 'Oat milk',
      'price': money('32.00'),
      'in_stock': true,
    });
    api.vendorOrders['active'] = [
      vendorOrder(status: 'picking')
        ..['lines'] = [
          marketOrderLineJson(name: 'Apples', quantity: 1.5, unit: 'kg'),
          marketOrderLineJson(productId: 2, name: 'Milk', quantity: 2)
            ..['if_missing'] = 'similar',
          marketOrderLineJson(productId: 3, name: 'Bread')
            ..['if_missing'] = 'remove',
        ],
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
    expect(find.byKey(const ValueKey('vendor-ready')), findsNothing);
    await tester.tap(find.byKey(const ValueKey('vendor-pick')));
    await TestApp.settle(tester, 20);
    expect(find.text('If it\'s out: a similar item'), findsOneWidget);
    // Bread can't be swapped: the customer asked to leave it out.
    expect(
      find.byKey(const ValueKey('vendor-pick-30-substituted')),
      findsNothing,
    );
    await tester.enterText(
      find.byKey(const ValueKey('vendor-pick-10-amount')),
      '1.8',
    );
    await tester.tap(find.byKey(const ValueKey('vendor-pick-20-substituted')));
    await TestApp.settle(tester, 5);
    // A swap needs the item brought instead.
    await tester.tap(find.byKey(const ValueKey('vendor-pick-save')));
    await TestApp.settle(tester, 5);
    expect(find.textContaining('instead of Milk'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('vendor-pick-20-choose')));
    await TestApp.settle(tester, 20);
    await tester.tap(find.byKey(const ValueKey('vendor-substitute-5')));
    await TestApp.settle(tester, 10);
    expect(find.text('Oat milk'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('vendor-pick-30-missing')));
    await TestApp.settle(tester, 5);
    await tester.tap(find.byKey(const ValueKey('vendor-pick-save')));
    await TestApp.settle(tester, 20);
    expect(
      api.vendorCalls,
      contains('pick 901 10:picked:1.8:,20:substituted:2.0:5,30:missing::'),
    );

    // Back on the order: how each line was picked, and ready.
    expect(find.byKey(const ValueKey('vendor-line-10-picked')), findsOneWidget);
    expect(find.text('Missing'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('vendor-ready')));
    await TestApp.settle(tester, 20);
    expect(api.vendorCalls, contains('ready 901'));
  });

  testWidgets('a picker picks, but sees no statements or complaints', (
    tester,
  ) async {
    phone(tester);
    final api = vendorApi();
    api.vendorDesk
      ..['kind'] = 'grocery'
      ..['role'] = 'picker';
    api.vendorOrders['active'] = [vendorOrder(status: 'picking')];
    final app = TestApp(
      api: api,
      appType: AppType.food,
      build: (b) => b.copyWith(role: AppRole.vendor),
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('vendor-statements')), findsNothing);
    expect(find.byKey(const ValueKey('vendor-complaints')), findsNothing);
    app.container.read(appRouterProvider).push(Paths.vendorOrder(901));
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('vendor-pick')), findsOneWidget);
  });

  testWidgets('115.20 running late: still taking orders, until it ends', (
    tester,
  ) async {
    phone(tester);
    final api = vendorApi();
    api.vendorDesk['role'] = 'orders';
    final app = TestApp(
      api: api,
      appType: AppType.food,
      build: (b) => b.copyWith(role: AppRole.vendor),
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    // Not the place's hours: those are for its owners and managers.
    expect(find.byKey(const ValueKey('vendor-hours')), findsNothing);
    await tester.tap(find.byKey(const ValueKey('vendor-late')));
    await TestApp.settle(tester, 10);
    expect(find.text('Running late?'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('vendor-late-30')));
    await tester.tap(find.byKey(const ValueKey('vendor-late-other')));
    await TestApp.settle(tester, 5);
    await tester.enterText(
      find.byKey(const ValueKey('vendor-late-note')),
      'Oven being fixed',
    );
    await tester.tap(find.byKey(const ValueKey('vendor-late-for-120')));
    await TestApp.settle(tester, 5);
    await tester.tap(find.byKey(const ValueKey('vendor-late-set')));
    await TestApp.settle(tester, 20);
    expect(api.vendorCalls, contains('delay 30 other Oven being fixed 120'));
    expect(
      find.textContaining('Running about 30 min late: Oven being fixed'),
      findsOneWidget,
    );
    // Still taking orders.
    expect(find.text('Taking orders'), findsWidgets);
    await tester.tap(find.byKey(const ValueKey('vendor-late-end')));
    await TestApp.settle(tester, 20);
    expect(api.vendorCalls, contains('delay end'));
    expect(find.byKey(const ValueKey('vendor-late-state')), findsNothing);
  });

  testWidgets('115.20 a manager changes the preparation time and days off', (
    tester,
  ) async {
    phone(tester);
    final api = vendorApi();
    api.vendorDesk
      ..['can_edit_place'] = true
      ..['prep_minutes'] = 20
      ..['hours'] = [
        {'day': 'mon', 'opens': '09:00', 'closes': '23:00'},
      ]
      ..['closed_dates'] = [
        {'from': '2026-12-31', 'to': '2027-01-01'},
      ];
    final app = TestApp(
      api: api,
      appType: AppType.food,
      build: (b) => b.copyWith(role: AppRole.vendor),
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    await tester.tap(find.byKey(const ValueKey('vendor-hours')));
    await TestApp.settle(tester, 20);
    expect(find.text('Hours & days off'), findsWidgets);
    expect(find.text('09:00'), findsOneWidget);
    expect(find.text('Closed'), findsNWidgets(6));
    await tester.ensureVisible(find.byKey(const ValueKey('vendor-prep-more')));
    await TestApp.settle(tester, 5);
    await tester.tap(find.byKey(const ValueKey('vendor-prep-more')));
    await TestApp.settle(tester, 5);
    expect(find.text('25 min'), findsOneWidget);
    await tester.ensureVisible(find.byKey(const ValueKey('vendor-hours-save')));
    await TestApp.settle(tester, 5);
    await tester.tap(find.byKey(const ValueKey('vendor-hours-save')));
    await TestApp.settle(tester, 20);
    expect(api.vendorCalls, contains('place hours=null closed=null prep=25'));
    // Removing the days off.
    await tester.ensureVisible(find.byKey(const ValueKey('vendor-off-add')));
    await TestApp.settle(tester, 5);
    await tester.tap(
      find.descendant(
        of: find.byKey(const ValueKey('vendor-off-2026-12-31')),
        matching: find.byType(IconButton),
      ),
    );
    await TestApp.settle(tester, 20);
    expect(api.vendorCalls, contains('place hours=null closed= prep=null'));
    expect(find.text('No days off coming up.'), findsOneWidget);
  });

  testWidgets('the month\'s statement, and the months before', (tester) async {
    phone(tester);
    final api = vendorApi();
    final now = vendorMonthOf(DateTime.now());
    final before = vendorMonthShift(now, -1);
    api.vendorStatements[''] = {
      'month': now,
      'totals': {
        'orders': 2,
        'total': money('530.00'),
        'commission': money('79.50'),
        'vendor_earns': money('450.50'),
        'net': money('400.50'),
      },
      'orders': [
        {
          'id': 901,
          'reference': 'M-901',
          'at': '2026-11-04T12:00:00Z',
          'payment': 'card',
          'total': money('265.00'),
          'vendor_earns': money('225.25'),
          'commission': money('39.75'),
          'due_to_vendor': money('225.25'),
        },
      ],
      'adjustments': [
        {
          'order_id': 901,
          'reference': 'M-901',
          'at': '2026-11-05T12:00:00Z',
          'kind': 'refund',
          'amount': money('50.00'),
          'funder': 'vendor',
        },
      ],
    };
    final app = TestApp(
      api: api,
      appType: AppType.food,
      build: (b) => b.copyWith(role: AppRole.vendor),
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    await tester.tap(find.byKey(const ValueKey('vendor-statements')));
    await TestApp.settle(tester, 20);
    expect(find.text('2 orders'), findsOneWidget);
    expect(find.text('EGP 400.50'), findsOneWidget);
    expect(find.text('Refund on M-901'), findsOneWidget);
    expect(find.textContaining('Paid by you'), findsOneWidget);
    // Nothing after this month.
    final next = tester.widget<IconButton>(
      find.byKey(const ValueKey('vendor-month-next')),
    );
    expect(next.onPressed, isNull);
    await tester.tap(find.byKey(const ValueKey('vendor-month-previous')));
    await TestApp.settle(tester, 20);
    expect(api.vendorCalls, contains('statement $before'));
    expect(find.text('No delivered orders this month'), findsOneWidget);
  });

  testWidgets('the complaints support shared, read only', (tester) async {
    phone(tester);
    final api = vendorApi();
    api.vendorComplaints.add({
      'id': 4,
      'reference': 'C-4',
      'order_id': 901,
      'order_reference': 'M-901',
      'reason': 'missing_items',
      'status': 'resolved',
      'text': 'The bread was missing',
      'line_ids': [10],
      'photos': const [],
      'decision': {
        'outcome': 'partial_refund',
        'amount': money('20.00'),
        'funder': 'vendor',
        'at': '2026-11-05T12:00:00Z',
      },
      'created_at': '2026-11-04T18:00:00Z',
    });
    final app = TestApp(
      api: api,
      appType: AppType.food,
      build: (b) => b.copyWith(role: AppRole.vendor),
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    await tester.tap(find.byKey(const ValueKey('vendor-complaints')));
    await TestApp.settle(tester, 20);
    expect(find.textContaining('C-4 · Order M-901'), findsOneWidget);
    expect(find.text('The bread was missing'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('vendor-complaint-decision-4')),
      findsOneWidget,
    );
    expect(find.text('Paid by you'), findsOneWidget);
  });
}
