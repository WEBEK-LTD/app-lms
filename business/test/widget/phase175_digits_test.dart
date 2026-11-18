import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/widgets/digits.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 175 A refund amount typed on an Arabic keyboard ("١٠٠٫٥٠") is an amount:
/// sent as "100.50", never refused for its digits.
void main() {
  test('Arabic-Indic and Eastern Arabic digits read as 0-9', () {
    expect(latinDigits('٤٥٠٫٥٠'), '450.50');
    expect(latinDigits('۱۲۳۴'), '1234');
    expect(latinDigits('١٬٢٥٠٫٥'), '1,250.5');
    expect(typedAmount(' ١٠٠,٥ '), '100.5');
    expect(typedAmount('100.50'), '100.50');
  });

  testWidgets('a refund in Arabic-Indic digits goes through', (tester) async {
    final app = TestApp();
    await app.pump(tester);
    await go(tester, app, '/orders/1042');
    await tester.scrollUntilVisible(
      find.widgetWithText(OutlinedButton, 'Refund'),
      200,
    );
    await tapOn(tester, find.widgetWithText(OutlinedButton, 'Refund'));
    await tester.enterText(
      find.widgetWithText(TextField, 'Amount (TRY)'),
      '١٠٠٫٥٠',
    );
    await tapOn(tester, find.widgetWithText(FilledButton, 'Refund'));
    expect(app.api.calls, contains('refundOrder'));
    expect(find.textContaining('Refunded ₺100.50'), findsOneWidget);
  });
}
