import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'events_test.dart' show usePhone;

/// 96.2 An order placed to pay by bank transfer or the shop's own method
/// shows the shop's details, the total and the day to pay by, until the
/// shop marks it paid; card orders and older servers show nothing more.

const _payOutside = {
  'method': 'bank_transfer',
  'name': 'Bank transfer',
  'instructions': 'Harbour Books Ltd\nIBAN TR00 0001 0002 0003 0004 0005 06',
  'due_at': '2026-10-29T12:00:00Z',
};

void main() {
  test('the model reads how to pay, and older servers mean none', () {
    final order = Order.fromJson({
      ...orderJson(),
      'status': 'pending',
      'pay_outside': _payOutside,
    });
    expect(order.payOutside?.name, 'Bank transfer');
    expect(order.payOutside?.instructions, contains('IBAN TR00'));
    expect(order.payOutside?.dueAt, DateTime.utc(2026, 10, 29, 12));
    expect(Order.fromJson(orderJson()).payOutside, isNull);
  });

  testWidgets(
    'an order waiting for a bank transfer shows the shop\'s details',
    (tester) async {
      usePhone(tester);
      final api = FakeApi(config: configJson(lms: null, orders: true))
        ..order = {
          ...orderJson(),
          'status': 'pending',
          'status_label': 'Waiting for payment',
          'pay_outside': _payOutside,
        };
      final app = TestApp(signedIn: true, appType: AppType.store, api: api);
      await app.pump(tester);
      app.container.read(appRouterProvider).push(Paths.order(1042));
      await TestApp.settle(tester);
      expect(find.text('Bank transfer'), findsOneWidget);
      expect(find.textContaining('IBAN TR00'), findsOneWidget);
      expect(find.textContaining('give the order number'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  receiptsInTheApp();
}

/// 96.3 Events apps and gyms without a website list their tickets and
/// memberships as orders, each with its receipt, under My orders in the
/// account; without `features.orders` the tile isn't there.
void receiptsInTheApp() {
  testWidgets('an events app offers My orders with the ticket receipt', (
    tester,
  ) async {
    usePhone(tester);
    final config = {
      ...configJson(lms: null, orders: true),
      'events': eventsConfigJson(),
    };
    final api = FakeApi(config: config)
      ..orders = [
        {
          ...orderJson(),
          'status': 'processing',
          'status_label': 'Paid',
          'receipt_url': 'https://yallapp.com.tr/receipts/orders/x.1.sig',
        },
      ];
    final app = TestApp(signedIn: true, appType: AppType.events, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.account);
    await TestApp.settle(tester);
    await tester.tap(find.byKey(const ValueKey('account-orders')));
    await TestApp.settle(tester);
    expect(find.text('Download receipt'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('without orders, an events app has no My orders', (tester) async {
    usePhone(tester);
    final api = FakeApi(
      config: {...configJson(lms: null), 'events': eventsConfigJson()},
    );
    final app = TestApp(signedIn: true, appType: AppType.events, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.account);
    await TestApp.settle(tester);
    expect(find.byKey(const ValueKey('account-orders')), findsNothing);
  });
}
