import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/models.dart';
import 'package:yallapp_business/core/theme/theme.dart';
import 'package:yallapp_business/features/orders/order_screen.dart';
import 'package:yallapp_business/l10n/app_localizations.dart';

/// 162 A bouquet the customer built in the app (Build your bouquet), as one
/// in the order: its stems, its flowers, its wrap and its card indented
/// under it, the card's words; the other lines as before. English and
/// Arabic, light and dark.
void main() {
  final m = {'amount_cents': 4500, 'currency': 'EGP', 'formatted': 'E£45.00'};
  Map<String, dynamic> line(
    int id,
    String name,
    int quantity, {
    Map<String, dynamic>? bouquet,
    int? addonOf,
  }) => {
    'product_id': id,
    'name': name,
    'quantity': quantity,
    'unit': m,
    'total': m,
    'addon_of': ?addonOf,
    'bouquet': ?bouquet,
  };
  Order order() => Order.fromJson({
    'id': 9,
    'number': '9',
    'status': 'processing',
    'total': m,
    'lines': [
      line(1, 'Blush Garden', 1),
      line(
        31,
        'Kraft Paper Wrap',
        1,
        addonOf: 11,
        bouquet: {'id': 'b1', 'part': 'wrap'},
      ),
      line(11, 'Red Rose', 6, bouquet: {'id': 'b1', 'part': 'flower'}),
      line(12, 'Blush Ranunculus', 3, bouquet: {'id': 'b1', 'part': 'flower'}),
      line(
        41,
        'Greeting Card',
        1,
        addonOf: 11,
        bouquet: {
          'id': 'b1',
          'part': 'card',
          'message': 'Happy birthday, Mama.',
        },
      ),
    ],
    'created_at': '2026-11-18T10:00:00Z',
  });

  Future<void> pump(
    WidgetTester tester, {
    String lang = 'en',
    bool dark = false,
  }) => tester.pumpWidget(
    MaterialApp(
      locale: Locale(lang),
      theme: buildTheme(
        arabic: lang == 'ar',
        brightness: dark ? Brightness.dark : Brightness.light,
      ),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(
        body: SingleChildScrollView(child: OrderLines(order: order())),
      ),
    ),
  );

  test('reads a line\'s bouquet, none on an older server\'s', () {
    final lines = order().lines;
    expect(lines.first.bouquet, isNull);
    expect(lines[1].bouquet?.part, 'wrap');
    expect(lines.last.bouquet?.message, 'Happy birthday, Mama.');
  });

  for (final (lang, dark) in [('en', false), ('en', true), ('ar', false)]) {
    testWidgets(
      'shows the bouquet as one ($lang, ${dark ? 'dark' : 'light'})',
      (tester) async {
        await pump(tester, lang: lang, dark: dark);
        final bouquet = find.byKey(const ValueKey('order-bouquet'));
        expect(bouquet, findsOneWidget);
        final inside = find.descendant(
          of: bouquet,
          matching: find.byType(Text),
        );
        final texts = [
          for (final t in tester.widgetList<Text>(inside)) t.data ?? '',
        ];
        expect(
          texts.first,
          lang == 'ar' ? 'باقة · 9 سيقان' : 'Bouquet · 9 stems',
        );
        // Its flowers first, then the wrap, then the card, and its words.
        final names = texts
            .where(
              (t) => [
                'Red Rose',
                'Blush Ranunculus',
                'Kraft Paper Wrap',
                'Greeting Card',
              ].contains(t),
            )
            .toList();
        expect(names, [
          'Red Rose',
          'Blush Ranunculus',
          'Kraft Paper Wrap',
          'Greeting Card',
        ]);
        expect(texts, contains(lang == 'ar' ? 'التغليف' : 'Wrap'));
        expect(texts, contains(lang == 'ar' ? 'البطاقة' : 'Card'));
        expect(
          texts.last,
          lang == 'ar'
              ? 'رسالة البطاقة: Happy birthday, Mama.'
              : 'Card message: Happy birthday, Mama.',
        );
        // The other line as before, outside the bouquet.
        expect(
          find.descendant(of: bouquet, matching: find.text('Blush Garden')),
          findsNothing,
        );
        expect(find.text('Blush Garden'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
