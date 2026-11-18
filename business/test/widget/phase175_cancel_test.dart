import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 175 Cancel order on a paid order asks the owner, every time: cancel and
/// refund what's left (through the order's payment gateway, or Needs a
/// refund when it can't go back by itself), or cancel without a refund, or
/// keep the order. The choice is sent with the cancel; nothing is refunded
/// without it. Light and dark, left to right and right to left.
void main() {
  Future<TestApp> openDecline(
    WidgetTester tester, {
    String language = 'en',
    Brightness? brightness,
  }) async {
    final app = TestApp(language: language, brightness: brightness);
    await app.pump(tester);
    await go(tester, app, '/orders');
    return app;
  }

  testWidgets('Cancel and refund: the choice is sent, and the refund said', (
    tester,
  ) async {
    final app = await openDecline(tester);
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Decline'));
    expect(find.text('Cancel order #1042?'), findsOneWidget);
    expect(
      find.text(
        'The customer is told, and its items go back in stock. Choose what happens to the payment.',
      ),
      findsOneWidget,
    );
    expect(find.text('Cancel and refund ₺485.00'), findsOneWidget);
    expect(find.text('Cancel without refund'), findsOneWidget);
    // From the list the gateway isn't known yet: both outcomes are said.
    expect(
      find.text(
        "Refunded through the order's payment gateway when it can; otherwise the order shows Needs a refund until you pay it back.",
      ),
      findsOneWidget,
    );
    await tapOn(tester, find.byKey(const ValueKey('cancel-refund')));
    expect(app.api.calls, contains('changeOrderStatus:cancelled'));
    expect(app.api.lastCancelRefund, isTrue);
  });

  testWidgets('Cancel without refund: false is sent', (tester) async {
    final app = await openDecline(tester);
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Decline'));
    await tapOn(tester, find.byKey(const ValueKey('cancel-no-refund')));
    expect(app.api.calls, contains('changeOrderStatus:cancelled'));
    expect(app.api.lastCancelRefund, isFalse);
  });

  testWidgets('on the order: the gateway refunds it now, or the owner does', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    await go(tester, app, '/orders/1042');
    await tester.scrollUntilVisible(
      find.widgetWithText(OutlinedButton, 'Decline'),
      200,
    );
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Decline'));
    expect(
      find.text(
        "Refunded now through the order's payment gateway. The customer is told.",
      ),
      findsOneWidget,
    );
    await tapOn(tester, find.byKey(const ValueKey('cancel-keep')));
    expect(app.api.calls, isNot(contains('changeOrderStatus:cancelled')));

    app.api.refundsByApi = false;
    await go(tester, app, '/orders');
    await go(tester, app, '/orders/1042');
    await tester.scrollUntilVisible(
      find.widgetWithText(OutlinedButton, 'Decline'),
      200,
    );
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Decline'));
    expect(
      find.text(
        "This payment can't go back by itself: the order shows Needs a refund until you pay it back.",
      ),
      findsOneWidget,
    );
  });

  for (final brightness in Brightness.values) {
    testWidgets('in Arabic, right to left, ${brightness.name}', (tester) async {
      await openDecline(tester, language: 'ar', brightness: brightness);
      await tapOn(tester, find.byType(OutlinedButton).first);
      expect(find.textContaining('إلغاء واسترداد'), findsOneWidget);
      expect(find.text('إلغاء دون استرداد'), findsOneWidget);
      expect(find.text('الإبقاء على الطلب'), findsOneWidget);
      final dialog = tester.element(find.byType(AlertDialog));
      expect(Directionality.of(dialog), TextDirection.rtl);
      expect(tester.takeException(), isNull);
    });
  }
}
