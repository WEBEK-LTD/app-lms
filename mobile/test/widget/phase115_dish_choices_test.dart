import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/market/data/market_basket.dart';
import 'package:yallapp/modules/market/data/market_place.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/market_order_fixtures.dart';
import '../support/test_app.dart';

/// 115.23 A dish with a required choice: its choices open before it goes in
/// the basket, the basket and the checkout show them, and the quote and the
/// order send their ids, as `MarketCartInput.lines[].choices`.
void main() {
  FakeApi marketApi() {
    final api = FakeApi(
      config: {
        ...configJson(lms: null),
        'market': {
          'country': 'EG',
          'currency': 'EGP',
          'currency_decimals': 2,
          'kinds': ['restaurant'],
          'categories': const [],
          'payment': {
            'cash': true,
            'card': false,
            'apple_pay': false,
            'google_pay': false,
            'wallet': false,
          },
          'pickup': true,
          'scheduling': {'enabled': false, 'days_ahead': 0},
          'club': false,
          'wallet': false,
        },
      },
    );
    api.me = userJson();
    Map<String, dynamic> choice(int id, String name, String extra) => {
      'id': id,
      'name': name,
      'extra': extra,
      'extra_formatted': extra == '0.00' ? null : '+EGP $extra',
      'available': true,
    };
    api.marketVendorPages[7] = {
      ...marketVendorSummaryJson(),
      'description': null,
      'area': 'Maadi',
      'hours': const [],
      'sections': [
        {
          'id': 1,
          'name': 'Grills',
          'items': [
            {
              'id': 1,
              'name': 'Mixed grill',
              'description': null,
              'image_url': null,
              'images': const [],
              'brand': null,
              'price': {'amount': '265.00', 'formatted': 'EGP 265.00'},
              'was_price': null,
              'unit': 'item',
              'step': 1,
              'max_quantity': null,
              'in_stock': true,
              'choices': [
                {
                  'id': 10,
                  'name': 'For',
                  'min': 1,
                  'max': 1,
                  'choices': [
                    choice(11, 'One', '0.00'),
                    choice(12, 'Two', '290.00'),
                  ],
                },
                {
                  'id': 20,
                  'name': 'Extras',
                  'min': 0,
                  'max': 2,
                  'choices': [
                    choice(21, 'Tahini', '10.00'),
                    choice(22, 'Pickles', '5.00'),
                  ],
                },
              ],
              'tags': const [],
            },
          ],
        },
      ],
      'departments': const [],
      'offers': const [],
    };
    // The order the server makes keeps the choices' names.
    return api;
  }

  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(390, 1600) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  testWidgets(
    'a dish with a required choice opens its choices, and the order sends them',
    (tester) async {
      phone(tester);
      final api = marketApi();
      final app = TestApp(api: api, appType: AppType.food, signedIn: true);
      await app.pump(tester);
      await app.container.read(marketPlaceProvider.notifier).set((
        address: '9 Road 233, Maadi',
        lat: 29.96,
        lng: 31.25,
      ));
      final router = app.container.read(appRouterProvider);
      router.push(Paths.marketVendor('7'));
      await TestApp.settle(tester, 20);
      expect(find.text('Mixed grill'), findsWidgets);

      // Adding it opens its choices; nothing is in the basket yet.
      await tester.tap(find.byKey(const ValueKey('market-add-1')));
      await TestApp.settle(tester, 10);
      expect(find.byKey(const ValueKey('dish-sheet')), findsOneWidget);
      expect(app.container.read(marketBasketProvider).isEmpty, isTrue);
      // The required one must be chosen first.
      expect(find.text('Choose: For'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('dish-add')));
      await TestApp.settle(tester);
      expect(find.byKey(const ValueKey('dish-sheet')), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('choice-12')));
      await tester.tap(find.byKey(const ValueKey('choice-21')));
      await TestApp.settle(tester);
      await tester.tap(find.byKey(const ValueKey('dish-add')));
      await TestApp.settle(tester, 10);
      expect(find.byKey(const ValueKey('dish-sheet')), findsNothing);
      final basket = app.container.read(marketBasketProvider);
      expect(basket.lines.single.choices, [12, 21]);
      expect(basket.lines.single.choiceNames, ['Two', 'Tahini']);
      // The running total counts what the choices add.
      expect(basket.estimate, 265 + 290 + 10);

      // The checkout shows them, and the quote sends their ids.
      router.push(Paths.marketCheckout);
      await TestApp.settle(tester, 20);
      expect(find.byKey(const ValueKey('basket-choices-1')), findsOneWidget);
      expect(find.text('Two · Tahini'), findsOneWidget);
      final line = (api.marketQuotes.last.toJson()['lines'] as List).single;
      expect(line, {
        'product_id': 1,
        'quantity': 1.0,
        'choices': [12, 21],
      });

      // More of the same line keeps its choices.
      await tester.tap(find.byTooltip('+'));
      await TestApp.settle(tester, 20);
      expect(app.container.read(marketBasketProvider).lines.single.quantity, 2);
      expect(
        ((api.marketQuotes.last.toJson()['lines'] as List).single
            as Map)['choices'],
        [12, 21],
      );

      final place = find.textContaining('Place order');
      await tester.scrollUntilVisible(
        place,
        300,
        scrollable: find.byType(Scrollable).first,
      );
      await TestApp.settle(tester);
      await tester.tap(place);
      await TestApp.settle(tester, 20);
      final ordered =
          (api.marketOrdersPlaced.single.cart.toJson()['lines'] as List).single
              as Map;
      expect(ordered['choices'], [12, 21]);
    },
  );

  testWidgets('the order shows what was chosen with each dish', (tester) async {
    phone(tester);
    final api = marketApi();
    final json = marketOrderJson(id: 905);
    json['lines'] = [
      {
        ...marketOrderLineJson(),
        'choices': ['Two', 'Tahini'],
      },
    ];
    api.marketOrders[905] = json;
    final app = TestApp(api: api, appType: AppType.food, signedIn: true);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.marketOrder(905));
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('order-choices-10')), findsOneWidget);
    expect(find.text('Two · Tahini'), findsOneWidget);
  });
}
