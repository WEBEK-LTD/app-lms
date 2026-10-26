import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/features/orders/order_actions.dart';
import 'package:yallapp_business/l10n/app_localizations.dart';

/// 96.2 An order waiting for a bank transfer or the owner's own method
/// offers Mark as paid and Cancel order, never the kitchen's Decline.

Widget _host(Order order, Locale locale) => ProviderScope(
  child: MaterialApp(
    locale: locale,
    supportedLocales: AppLocalizations.supportedLocales,
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    home: Scaffold(
      body: OrderActions(order: order, onChanged: (_) {}),
    ),
  ),
);

Order _waiting() => Order.fromJson({
  'id': 1050,
  'number': '1050',
  'status': 'pending',
  'status_label': 'Waiting for payment',
  'total': {'amount': '450.00', 'currency': 'TRY', 'formatted': '₺450.00'},
  'lines': const [],
  'created_at': '2026-10-26T10:00:00Z',
  'next_statuses': const ['processing', 'cancelled'],
});

void main() {
  testWidgets('Mark as paid and Cancel order', (tester) async {
    await tester.pumpWidget(_host(_waiting(), const Locale('en')));
    await tester.pumpAndSettle();
    expect(find.widgetWithText(FilledButton, 'Mark as paid'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, 'Cancel order'), findsOneWidget);
  });

  testWidgets('in Arabic', (tester) async {
    await tester.pumpWidget(_host(_waiting(), const Locale('ar')));
    await tester.pumpAndSettle();
    expect(find.widgetWithText(FilledButton, 'تحديد كمدفوع'), findsOneWidget);
  });
}
