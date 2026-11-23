import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 206 The review's additions to orders: search by number or who ordered,
/// shipping with any carrier from the phone, copying an order's details,
/// finding a product, the list showing what changed on the order's page,
/// and one tap at a time on its buttons.
void main() {
  testWidgets('finds an order by number or name, Arabic digits too', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.restaurantId);
    await app.pump(tester);
    await go(tester, app, '/orders');
    expect(find.text('#1042'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('orders-search')));
    await settle(tester);
    await tester.enterText(find.byType(TextField), '١٠٤٠');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await settle(tester);
    expect(find.text('#1040'), findsOneWidget);
    expect(find.text('#1042'), findsNothing);
    await tester.enterText(find.byType(TextField), 'nobody');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await settle(tester);
    expect(find.text('No orders match your search'), findsOneWidget);
  });

  testWidgets('back from an order, the list shows what changed there', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.restaurantId);
    await app.pump(tester);
    await go(tester, app, '/orders');
    await tester.tap(find.text('#1041'));
    await settle(tester);
    // Ready, then Completed is offered: complete it on its page.
    final ready = find.widgetWithText(FilledButton, 'Ready');
    if (ready.evaluate().isNotEmpty) {
      await tester.tap(ready);
      await settle(tester);
    }
    expect(app.api.calls.where((c) => c.startsWith('changeOrderStatus')), [
      'changeOrderStatus:ready',
    ]);
    await tester.pageBack();
    await settle(tester);
    // The list loaded again after coming back.
    expect(app.api.calls.where((c) => c == 'orders').length, greaterThan(1));
  });

  testWidgets('ships an order with its carrier and tracking', (tester) async {
    final app = TestApp(appId: FakeOwnerApi.academyId);
    app.api.shippableOrders.add(3301);
    await app.pump(tester);
    await push(tester, app, '/orders/3301');
    // In the middle of the page, above its foot.
    await Scrollable.ensureVisible(
      tester.element(find.byKey(const ValueKey('ship-order'))),
      alignment: 0.5,
    );
    await settle(tester);
    await tester.tap(find.byKey(const ValueKey('ship-order')));
    await settle(tester);
    // Nothing to track: said in the sheet.
    await tester.tap(find.byKey(const ValueKey('ship-save')));
    await settle(tester);
    expect(
      find.text('Enter the tracking number or the tracking link.'),
      findsOneWidget,
    );
    await tester.enterText(
      find.byKey(const ValueKey('ship-carrier')),
      'Aras Kargo',
    );
    await tester.enterText(
      find.byKey(const ValueKey('ship-number')),
      '٣٨١٥٦٠٢٢٤٣',
    );
    await tester.tap(find.byKey(const ValueKey('ship-save')));
    await settle(tester);
    // Each part kept whole in either direction (isolated).
    expect(find.textContaining('Aras Kargo'), findsOneWidget);
    expect(find.textContaining('3815602243'), findsOneWidget);
    expect(app.api.calls, contains('shipOrder'));
    expect(find.byKey(const ValueKey('ship-change')), findsOneWidget);
  });

  testWidgets('copies an order\'s details for a courier', (tester) async {
    String? copied;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        if (call.method == 'Clipboard.setData') {
          copied = (call.arguments as Map)['text'] as String;
        }
        return null;
      },
    );
    final app = TestApp(appId: FakeOwnerApi.academyId);
    await app.pump(tester);
    await push(tester, app, '/orders/3301');
    await tester.tap(find.byKey(const ValueKey('order-share')));
    await settle(tester);
    await tester.tap(find.text('Copy the details'));
    await settle(tester);
    expect(copied, contains('Order #3301'));
    expect(copied, contains('1 × Arabic for beginners'));
    expect(copied, contains('Name: Elif Demir'));
    expect(find.text("The order's details were copied"), findsOneWidget);
    // Or on WhatsApp, to whoever the owner picks there.
    await tester.tap(find.byKey(const ValueKey('order-share')));
    await settle(tester);
    await tester.tap(find.text('Send on WhatsApp'));
    await settle(tester);
    expect(app.opened.last, startsWith('https://wa.me/?text=Order%20%233301'));
  });

  testWidgets('finds a product by its name to mark it sold out', (
    tester,
  ) async {
    final app = TestApp(appId: FakeOwnerApi.flowersId);
    await app.pump(tester);
    await go(tester, app, '/catalog');
    await tester.enterText(
      find.byKey(const ValueKey('products-search')),
      'peony',
    );
    await settle(tester);
    expect(find.text('White Peony Vase'), findsOneWidget);
    expect(find.text('Blush Garden'), findsNothing);
    await tester.enterText(
      find.byKey(const ValueKey('products-search')),
      'tulip',
    );
    await settle(tester);
    expect(find.text('No products match your search'), findsOneWidget);
  });
}
