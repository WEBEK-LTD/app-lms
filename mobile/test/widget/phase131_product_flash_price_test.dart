import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 131 A flash sale on a product whose sizes have their own prices: the
/// sale's box on its page shows the chosen size's price on sale, the same
/// as the top of the page, never another size's; with no size chosen (a
/// range) it shows no price, only the share off, the countdown and the
/// stock.
void main() {
  final ends = DateTime.now().toUtc().add(const Duration(hours: 2));

  Map<String, dynamic> product({String? chosen}) => {
    ...variableProductJson(),
    'price': priceJson(
      '750.00',
      regular: '1000.00',
      range: true,
      formatted: '₺750.00 – ₺1,500.00',
    ),
    // A quarter off, from the small size's price.
    'sale': {
      'was': '1000.00',
      'was_formatted': '₺1,000.00',
      'now': '750.00',
      'now_formatted': '₺750.00',
      'percent_off': 25,
      'ends_at': ends.toIso8601String(),
      'remaining': 4,
      'total': 12,
      'flash_sale_id': 7,
    },
    'attributes': [
      {
        'slug': 'a1',
        'name': 'Size',
        'variation': true,
        'options': [
          {'value': 'Small', 'label': 'Small'},
          {'value': 'Large', 'label': 'Large'},
        ],
      },
    ],
    'variations': [
      {
        'id': 301,
        'attributes': {'a1': 'Small'},
        'price': priceJson('750.00', regular: '1000.00'),
        'image_url': null,
        'stock_status': 'in_stock',
        'max_quantity': null,
        'purchasable': true,
      },
      {
        'id': 302,
        'attributes': {'a1': 'Large'},
        'price': priceJson('1125.00', regular: '1500.00'),
        'image_url': null,
        'stock_status': 'in_stock',
        'max_quantity': null,
        'purchasable': true,
      },
    ],
    'default_attributes': {'a1': ?chosen},
  };

  Future<void> open(WidgetTester tester, Map<String, dynamic> json) async {
    tester.view
      ..physicalSize = const Size(1080, 4800)
      ..devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final api = FakeApi()..product = json;
    final app = TestApp(signedIn: true, appType: AppType.store, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).go('/product/20');
    await TestApp.settle(tester, 20);
  }

  Finder inBox(String text) => find.descendant(
    of: find.byKey(const ValueKey('product-flash-sale')),
    matching: find.text(text),
  );

  testWidgets('the chosen size\'s price on sale, as the top of the page', (
    tester,
  ) async {
    await open(tester, product(chosen: 'Large'));
    expect(find.byKey(const ValueKey('product-flash-sale')), findsOneWidget);
    // The large size: ₺1,125.00, was ₺1,500.00, in the box and at the top.
    expect(inBox('₺1125.00'), findsOneWidget);
    expect(inBox('₺1500.00'), findsOneWidget);
    expect(inBox('₺750.00'), findsNothing);
    expect(find.text('₺1125.00'), findsNWidgets(2));
    // The small one chosen: its price, in both places.
    await tester.tap(find.text('Small'));
    await TestApp.settle(tester);
    expect(inBox('₺750.00'), findsOneWidget);
    expect(inBox('₺1125.00'), findsNothing);
    expect(find.text('₺750.00'), findsNWidgets(2));
  });

  testWidgets('no size chosen: no price in the box, the rest of the sale', (
    tester,
  ) async {
    await open(tester, product());
    expect(find.byKey(const ValueKey('product-flash-sale')), findsOneWidget);
    expect(find.byKey(const ValueKey('product-flash-price')), findsNothing);
    expect(find.byKey(const ValueKey('product-flash-percent')), findsOneWidget);
    expect(inBox('₺750.00'), findsNothing);
  });
}
