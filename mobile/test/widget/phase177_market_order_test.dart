import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/modules/market/screens/market_order_screen.dart';
import 'package:yallapp/modules/market/screens/market_orders_screen.dart';

import '../support/market_order_fixtures.dart';

/// 177 A marketplace order's lines add up to its "Items" (docs/qa/2026-11-18-
/// market-store): the server's Items is the lines before their discounts,
/// and each line showed only its sale price (EGP 17.50 + 45.00 under
/// "Items EGP 72.50"). A discounted line shows its price before, struck.
void main() {
  Map<String, dynamic> money(String a) => {'amount': a, 'formatted': 'EGP $a'};

  testWidgets('a line on sale shows its price before the sale, struck', (
    tester,
  ) async {
    tester.view
      ..physicalSize = const Size(360, 1600) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    final json = marketOrderJson(fulfilment: 'pickup');
    json['lines'] = [
      {
        ...marketOrderLineJson(
          productId: 1,
          name: 'Bananas',
          quantity: 0.5,
          unit: 'kg',
        ),
        'unit_price': money('35.00'),
        'total': money('17.50'),
      },
      {
        ...marketOrderLineJson(
          productId: 3,
          name: 'Red apples',
          quantity: 0.5,
          unit: 'kg',
        ),
        'unit_price': money('90.00'),
        'before_discount': money('55.00'),
        'total': money('45.00'),
      },
    ];
    final order = MarketOrder.fromJson(json);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [marketOrderProvider.overrideWith((ref, id) async => order)],
        child: MaterialApp(
          theme: buildAppTheme(
            primary: const Color(0xFF134A36),
            secondary: const Color(0xFFF2B33D),
            brightness: Brightness.light,
            template: AppTemplate.bold,
            fontFamily: 'Plus Jakarta Sans',
          ),
          supportedLocales: const [Locale('en'), Locale('ar'), Locale('tr')],
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          home: const MarketOrderScreen(orderId: 901),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 300));
    final before = find.text('EGP 55.00');
    expect(before, findsOneWidget);
    expect(
      tester.widget<Text>(before).style?.decoration,
      TextDecoration.lineThrough,
    );
    expect(find.text('EGP 45.00'), findsOneWidget);
    // A line not on sale: its price only.
    expect(find.text('EGP 17.50'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
