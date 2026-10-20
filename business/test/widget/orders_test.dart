import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/core/routing/router.dart';
import 'package:yallapp_business/core/widgets/l10n.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

void main() {
  testWidgets('orders by status; a new order is accepted from the list', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    await tapOn(tester, find.widgetWithText(NavigationDestination, 'Orders'));
    expect(find.text('#1042'), findsOneWidget);
    expect(find.text('#1041'), findsOneWidget);
    // 63 Names and items are kept whole in either direction.
    expect(find.text('${isolate('Sara Hassan')} · Pickup'), findsOneWidget);
    expect(
      find.text(
        '${isolate('2 × Chicken shawarma')}, ${isolate('2 × Fresh lemonade')}',
      ),
      findsWidgets,
    );

    await tapOn(tester, find.widgetWithText(FilledButton, 'Accept'));
    expect(app.api.calls, contains('changeOrderStatus:preparing'));
    expect(find.text('Order #1042: Preparing'), findsOneWidget);

    await tapOn(tester, find.text('Completed'));
    expect(find.text('#1039'), findsOneWidget);
    expect(find.text('#1042'), findsNothing);
  });

  testWidgets('declining asks first', (tester) async {
    final app = TestApp();
    await app.pump(tester);
    await go(tester, app, '/orders');
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Decline'));
    expect(find.text('Cancel order #1042?'), findsOneWidget);
    await tapOn(tester, find.widgetWithText(TextButton, 'Cancel'));
    expect(app.api.calls, isNot(contains('changeOrderStatus:cancelled')));
  });

  testWidgets(
    'an order: customer, address, items, payment; refund part of it',
    (tester) async {
      final app = TestApp();
      await app.pump(tester);
      await go(tester, app, '/orders/1042');
      expect(find.text('#1042'), findsOneWidget);
      expect(find.text('Ahmed Yilmaz'), findsOneWidget);
      expect(find.text('Moda Cd. 12, Kadıköy, Istanbul'), findsOneWidget);
      expect(find.text('Extra garlic'), findsOneWidget);
      expect(find.text('₺485.00'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Up to ₺485.00 can be refunded.'),
        200,
      );

      await tapOn(tester, find.widgetWithText(OutlinedButton, 'Refund'));
      expect(find.text('Refund order #1042'), findsOneWidget);
      await tester.enterText(
        find.widgetWithText(TextField, 'Amount (TRY)'),
        '600',
      );
      await tapOn(tester, find.widgetWithText(FilledButton, 'Refund'));
      expect(find.text('Enter an amount up to what is left.'), findsOneWidget);

      await tester.enterText(
        find.widgetWithText(TextField, 'Amount (TRY)'),
        '100.50',
      );
      await tapOn(tester, find.widgetWithText(FilledButton, 'Refund'));
      expect(find.textContaining('Refunded ₺100.50'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Up to ₺384.50 can be refunded.'),
        200,
      );
      expect(find.text('Refunds'), findsOneWidget);
    },
  );

  testWidgets('a pickup order moves to Picked up from its screen', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    await go(tester, app, '/orders/1041');
    await tapOn(tester, find.widgetWithText(FilledButton, 'Ready'));
    await tapOn(tester, find.widgetWithText(FilledButton, 'Picked up'));
    expect(
      app.api.calls,
      containsAllInOrder([
        'changeOrderStatus:ready',
        'changeOrderStatus:completed',
      ]),
    );
    expect(find.text('Order #1041: Completed'), findsOneWidget);
  });

  testWidgets('Kitchen mode on a tablet: columns by step', (tester) async {
    final app = TestApp();
    await app.pump(tester, size: const Size(1280, 800));
    await push(tester, app, '/kitchen');
    expect(find.text('Kitchen mode'), findsOneWidget);
    expect(find.text('New · 1'), findsOneWidget);
    expect(find.text('Preparing · 1'), findsOneWidget);
    expect(find.text('Ready · 1'), findsOneWidget);
    expect(app.chime.plays, 0);

    // A new order is paid while the screen is open.
    await app.api.changeOrderStatus(
      FakeOwnerApi.restaurantId,
      1042,
      'preparing',
    );
    final order = await app.api.order(FakeOwnerApi.restaurantId, 1041);
    expect(order.kitchen?.step, 'preparing');
    app.container.read(routerProvider);
    // The next check (every 15 seconds) finds it.
    await tester.pump(const Duration(seconds: 16));
    await settle(tester);
    expect(find.text('Preparing · 2'), findsOneWidget);
    expect(app.chime.plays, 0); // nothing new, only moved on

    // Sound off, then on.
    await tapOn(tester, find.byTooltip('Sound on for new orders'));
    expect(find.byTooltip('Sound off for new orders'), findsOneWidget);
  });

  testWidgets('Kitchen mode plays the chime when an order arrives', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    await push(tester, app, '/kitchen');
    app.api.addOrderForTest();
    await tester.pump(const Duration(seconds: 16));
    await settle(tester);
    expect(find.text('New · 2'), findsOneWidget);
    expect(app.chime.plays, 1);
    GoRouter.of(tester.element(find.text('Kitchen mode'))).pop();
    await settle(tester);
  });

  testWidgets('Orders in Arabic', (tester) async {
    final app = TestApp(language: 'ar');
    await app.pump(tester);
    await go(tester, app, '/orders');
    expect(find.text('قيد التنفيذ'), findsWidgets);
    expect(find.widgetWithText(FilledButton, 'قبول'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.text('#1042'))),
      TextDirection.rtl,
    );
  });

  test('order models read the contract', () {
    final order = Order.fromJson({
      'id': 1,
      'number': '#1',
      'status': 'processing',
      'total': {
        'amount_cents': 15050,
        'currency': 'TRY',
        'formatted': '₺150.50',
      },
      'refunded': null,
      'lines': [],
      'customer': null,
      'created_at': '2026-10-20T10:00:00Z',
      'paid_at': null,
      'next_statuses': ['completed', 'cancelled'],
    });
    expect(order.total.major, '150.50');
    expect(order.kitchen, isNull);
    expect(order.refund, isNull);
  });
}
