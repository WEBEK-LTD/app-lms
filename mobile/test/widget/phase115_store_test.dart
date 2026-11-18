import 'package:flutter/material.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/market_api_models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/external_links.dart';
import 'package:yallapp/modules/market/data/market_basket.dart';
import 'package:yallapp/modules/market/data/market_models.dart';
import 'package:yallapp/modules/market/screens/market_scanner_screen.dart';
import 'package:yallapp/modules/market/widgets/market_order_parts.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import '../support/zad_market_fixtures.dart';

/// 115.40 The supermarket in the customer app (designs 01–05b of
/// 18 November 2026), on Zad Market: its home, a department paged by the
/// cursor, a product by weight, the cart's "if something is missing", the
/// order's live substitute and weighed price, the courier's masked call,
/// and the barcode typed where there's no camera. Every screen in English
/// and Arabic (right to left), light and dark, at text scale 1.0 and 1.3
/// on a 360-point phone, without an overflow.
void main() {
  FakeApi zad() {
    final api = FakeApi(
      config: {
        ...configJson(lms: null, languages: languagesJson()),
        'delivery': {
          ...deliveryConfigJson(),
          'map': {'tiles_url': 'https://tiles.example.com/{z}/{x}/{y}.png'},
        },
        'market': ZadMarket.config(),
      },
    );
    api.me = userJson();
    api.marketProducts[3] = ZadMarket.products();
    api.productPageSize = 4;
    api.marketQuote = ZadMarket.quote();
    api.marketOrders[4821] = ZadMarket.picking();
    api.marketOrders[4822] = {...ZadMarket.onTheWay(), 'id': 4822};
    return api;
  }

  /// No exception; for an overflow, the overflowing widgets and their
  /// places in the tree.
  void none(WidgetTester tester) {
    final e = tester.takeException();
    expect(
      e,
      isNull,
      reason: [
        for (final r in tester.allRenderObjects)
          if (r.toStringShort().contains('OVERFLOWING'))
            '${r.debugCreator}'.split(' ← ').take(14).join(' ← '),
      ].join('\n'),
    );
  }

  /// Scrolls the open screen's list until [target] shows, clear of the
  /// cart bar.
  Future<void> reveal(WidgetTester tester, Finder target) async {
    // The screen's own list: the tallest one scrolling down.
    final lists =
        find
            .byWidgetPredicate(
              (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
            )
            .hitTestable()
            .evaluate()
            .toList()
          ..sort(
            (a, b) => (b.size?.height ?? 0).compareTo(a.size?.height ?? 0),
          );
    final element = lists.first;
    final list = find.byElementPredicate((e) => e == element);
    // From the top, down until it shows.
    if (target.hitTestable().evaluate().isEmpty) {
      await tester.drag(list, const Offset(0, 6000));
      await TestApp.settle(tester, 4);
    }
    await tester.scrollUntilVisible(target, 150, scrollable: list);
    await tester.drag(list, const Offset(0, -160));
    await TestApp.settle(tester, 4);
    if (target.hitTestable().evaluate().isEmpty) {
      await tester.drag(list, const Offset(0, 320));
      await TestApp.settle(tester, 4);
    }
  }

  void phone(WidgetTester tester, {double scale = 1}) {
    tester.view
      ..physicalSize = const Size(360, 780) * 2
      ..devicePixelRatio = 2;
    tester.platformDispatcher.textScaleFactorTestValue = scale;
    addTearDown(tester.view.reset);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  }

  Future<TestApp> open(
    WidgetTester tester,
    String location, {
    FakeApi? api,
    String lang = 'en',
    bool dark = false,
    bool basket = true,
    List<Override> more = const [],
  }) async {
    final app = TestApp(
      api: api ?? zad(),
      appType: AppType.food,
      signedIn: true,
      preferences: {
        'settings.language': lang,
        'settings.theme_mode': dark ? 'dark' : 'light',
        // The customer's place, so the cart is priced.
        'market_place': ZadMarket.place,
      },
      overrides: [
        ...ZadMarket.overrides(basket: basket),
        marketScannerCameraProvider.overrideWithValue(false),
        ...more,
      ],
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push(location);
    await TestApp.settle(tester, 20);
    return app;
  }

  final screens = {
    '01 home': Paths.marketVendor(ZadMarket.id),
    '02 department': Paths.marketDepartment(ZadMarket.id, '1'),
    '03 product': Paths.marketProduct(ZadMarket.id, '41'),
    '04 cart': Paths.marketCheckout,
    '05a picking': Paths.marketOrder(4821),
    '05b on the way': Paths.marketOrder(4822),
  };

  for (final MapEntry(key: name, value: location) in screens.entries) {
    for (final lang in ['en', 'ar']) {
      for (final dark in [false, true]) {
        for (final scale in [1.0, 1.3]) {
          testWidgets(
            '$name, $lang, ${dark ? 'dark' : 'light'}, ×$scale: no overflow',
            (tester) async {
              phone(tester, scale: scale);
              await open(tester, location, lang: lang, dark: dark);
              none(tester);
              // Right to left in Arabic.
              final direction = Directionality.of(
                tester.element(find.byType(Scaffold).last),
              );
              expect(
                direction,
                lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
              );
              // Scrolled to the end, still nothing overflows.
              final scrollables = find.byType(Scrollable);
              if (scrollables.evaluate().isNotEmpty) {
                await tester.drag(scrollables.first, const Offset(0, -2000));
                await TestApp.settle(tester, 6);
              }
              none(tester);
            },
          );
        }
      }
    }
  }

  testWidgets('the home: the store\'s search, offers, departments and buy '
      'again', (tester) async {
    phone(tester);
    final app = await open(tester, Paths.marketVendor(ZadMarket.id));
    expect(find.text('Search Zad Market'), findsOneWidget);
    expect(find.text('FRESH15'), findsOneWidget);
    expect(find.text('Departments'), findsOneWidget);
    expect(find.text('All 5'), findsOneWidget);
    expect(find.text('Buy again'), findsOneWidget);
    expect(find.text('From your 4 orders'), findsOneWidget);
    // "Buy again" adds the eggs from an earlier order.
    final before = app.container.read(marketBasketProvider).quantityOf('51');
    await reveal(tester, find.byKey(const ValueKey('market-again-51')));
    await tester.tap(find.byKey(const ValueKey('market-again-51')));
    await tester.pump();
    expect(
      app.container.read(marketBasketProvider).quantityOf('51'),
      before + 1,
    );
    // The search looks in this store only.
    await reveal(tester, find.byKey(const ValueKey('market-store-search')));
    await tester.enterText(
      find.byKey(const ValueKey('market-store-search')),
      'rice',
    );
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await TestApp.settle(tester, 20);
    expect(find.text('Results for “rice”'), findsOneWidget);
    expect(find.text('Egyptian rice, 1 kg'), findsOneWidget);
    expect(app.api.productQueries.last.query, 'rice');
  });

  testWidgets('a department: its aisles, and more products as it scrolls, by '
      'the cursor', (tester) async {
    phone(tester);
    final app = await open(
      tester,
      Paths.marketDepartment(ZadMarket.id, '1'),
      basket: false,
    );
    expect(find.text('Fruit & vegetables'), findsOneWidget);
    expect(find.text('4 of 9 shown'), findsOneWidget);
    expect(find.byKey(const ValueKey('market-product-38')), findsNothing);
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -900));
    await TestApp.settle(tester, 10);
    expect(
      app.api.productQueries.where(
        (q) => q.department == 1 && q.aisle == null && q.cursor == '4',
      ),
      isNotEmpty,
    );
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -1500));
    await TestApp.settle(tester, 10);
    expect(find.text('9 of 9 shown'), findsOneWidget);
    // An aisle keeps its own products.
    await tester.drag(find.byType(Scrollable).first, const Offset(0, 4000));
    await TestApp.settle(tester, 6);
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('market-aisle-12')),
      120,
      scrollable: find
          .ancestor(
            of: find.byKey(const ValueKey('market-aisle-all')),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await tester.ensureVisible(find.byKey(const ValueKey('market-aisle-12')));
    await TestApp.settle(tester, 4);
    await tester.tap(find.byKey(const ValueKey('market-aisle-12')));
    await TestApp.settle(tester, 10);
    expect(app.api.productQueries.where((q) => q.aisle == 12), isNotEmpty);
    expect(find.text('Potatoes'), findsOneWidget);
    expect(find.text('Bananas'), findsNothing);
    // Weighed items step by their own step: 0.5 kg, then 1 kg.
    await tester.tap(find.byKey(const ValueKey('market-add-39')));
    await tester.pump();
    expect(find.text('500 g'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('market-plus-39')));
    await tester.pump();
    expect(find.text('1 kg'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('market-minus-39')));
    await tester.tap(find.byKey(const ValueKey('market-minus-39')));
    await tester.pump();
    expect(app.container.read(marketBasketProvider).isEmpty, isTrue);
  });

  testWidgets('a product by weight: its steps, least and most, the estimate, '
      'at most, and the picker\'s note', (tester) async {
    phone(tester);
    final app = await open(
      tester,
      Paths.marketProduct(ZadMarket.id, '41'),
      basket: false,
    );
    expect(find.text('Sold by weight'), findsOneWidget);
    expect(find.text('in steps of 250 g'), findsOneWidget);
    // It starts at its least, 250 g, and can't go under it.
    expect(find.textContaining('250', findRichText: true), findsWidgets);
    await tester.tap(find.byKey(const ValueKey('market-weight-minus')));
    await tester.pump();
    expect(find.text('EGP 40.00'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('market-weight-plus')));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('market-weight-plus')));
    await tester.pump();
    // 750 g at EGP 160 a kilo: EGP 120 estimated, at most EGP 132 in cash.
    expect(find.text('EGP 120.00'), findsOneWidget);
    expect(find.text('EGP 132.00'), findsOneWidget);
    expect(
      find.textContaining(
        'You pay the estimate now; if it weighs less, we refund the '
        'difference.',
        findRichText: true,
      ),
      findsOneWidget,
    );
    expect(
      find.text('Cash: you pay what the scale reads, at most EGP 132.00.'),
      findsOneWidget,
    );
    // Its most is 3 kg.
    await tester.tap(find.byKey(const ValueKey('market-quick-2.0')));
    await tester.pump();
    for (var i = 0; i < 6; i++) {
      await tester.tap(find.byKey(const ValueKey('market-weight-plus')));
      await tester.pump();
    }
    expect(find.text('EGP 480.00'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('market-quick-0.75')));
    await tester.pump();
    await reveal(tester, find.text('Sliced'));
    await tester.tap(find.text('Sliced'));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('market-product-add')));
    await TestApp.settle(tester);
    final line = app.container.read(marketBasketProvider).lineOf('41')!;
    expect(line.quantity, 0.75);
    expect(line.note, 'Sliced');
    final input = app.container
        .read(marketBasketProvider)
        .inputs(shop: true)
        .single;
    expect(input.toJson(), containsPair('note', 'Sliced'));
  });

  testWidgets('the cart: "if something is missing" for the whole order, '
      'changed per item, and the estimate', (tester) async {
    phone(tester);
    final app = await open(tester, Paths.marketCheckout);
    expect(find.text('If something is missing'), findsOneWidget);
    await reveal(tester, find.text('Instead: Eggs, 15'));
    await reveal(tester, find.byKey(const ValueKey('market-estimate')));
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('market-estimate')),
        matching: find.text('Estimated total'),
      ),
      findsOneWidget,
    );
    // Paying cash: at most the estimate and 10% of the weighed items.
    // 396 + (120 + 35) × 10% = 411.50.
    expect(find.text('At most EGP 411.50 after weighing'), findsOneWidget);
    var cart = app.api.marketQuotes.last.toJson();
    expect(cart['if_missing'], 'similar');
    final lines = (cart['lines'] as List).cast<Map<String, dynamic>>();
    expect(lines[0].containsKey('if_missing'), isFalse);
    expect(lines[0]['note'], 'sliced');
    expect(lines[1]['if_missing'], 'remove');
    expect(lines[2]['if_missing'], 'chosen');
    expect(lines[2]['substitute_product_id'], 52);
    // The whole order: leave out what's missing.
    await reveal(
      tester,
      find.byKey(const ValueKey('market-if-missing-remove')),
    );
    await tester.tap(find.byKey(const ValueKey('market-if-missing-remove')));
    await TestApp.settle(tester, 12);
    cart = app.api.marketQuotes.last.toJson();
    expect(cart['if_missing'], 'remove');
    // The rice gets its own choice: an item the customer picks.
    await reveal(tester, find.byKey(const ValueKey('market-line-choice-61')));
    await tester.tap(find.byKey(const ValueKey('market-line-choice-61')));
    await TestApp.settle(tester, 6);
    await tester.tap(
      find.byKey(const ValueKey('market-line-choice-61-chosen')).last,
    );
    await TestApp.settle(tester, 20);
    // Found by its name in this store.
    await tester.enterText(
      find.descendant(
        of: find.byType(BottomSheet),
        matching: find.byType(TextField),
      ),
      'short',
    );
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await TestApp.settle(tester, 12);
    await tester.tap(find.byKey(const ValueKey('market-substitute-62')));
    await TestApp.settle(tester, 12);
    expect(find.text('Instead: Short-grain rice, 1 kg'), findsOneWidget);
    final rice = (app.api.marketQuotes.last.toJson()['lines'] as List)
        .cast<Map<String, dynamic>>()
        .last;
    expect(rice['if_missing'], 'chosen');
    expect(rice['substitute_product_id'], 62);
    // By card: the estimate now, the difference back if it weighs less.
    await reveal(tester, find.text('Card'));
    await tester.tap(find.text('Card'));
    await TestApp.settle(tester, 6);
    expect(
      find.text(
        'You pay the estimate now; if it weighs less, we refund the '
        'difference.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('the order being picked: the substitute asked live, accepted in '
      'time', (tester) async {
    phone(tester);
    final api = zad();
    await open(tester, Paths.marketOrder(4821), api: api);
    expect(find.text('YOUR ANSWER, PLEASE'), findsOneWidget);
    expect(
      find.text('Egyptian rice, 1 kg is out. Take this instead?'),
      findsOneWidget,
    );
    expect(find.text('+EGP 8.00'), findsOneWidget);
    expect(
      find.text('No answer in time? We follow your choice: a similar item.'),
      findsOneWidget,
    );
    expect(find.text('3/4'), findsOneWidget);
    final clock = tester.widget<Text>(
      find.byKey(const ValueKey('market-proposal-clock')),
    );
    expect(clock.data, matches(RegExp(r'^4:[23]\d$')));
    await reveal(tester, find.text('Weighed 780 g · EGP 124.80'));
    expect(find.text('Your choice, for Eggs, 30'), findsOneWidget);
    await reveal(
      tester,
      find.byKey(const ValueKey('market-proposal-accept-1')),
    );
    await tester.tap(find.byKey(const ValueKey('market-proposal-accept-1')));
    await TestApp.settle(tester, 12);
    expect(api.substituteAnswers.single, (order: 4821, line: 1, accept: true));
    expect(find.text('YOUR ANSWER, PLEASE'), findsNothing);
  });

  testWidgets('a proposal whose time ran out: the order\'s choice applies', (
    tester,
  ) async {
    phone(tester);
    // The countdown's clock, moved by hand.
    var now = DateTime.now();
    marketClock = () => now;
    addTearDown(() => marketClock = DateTime.now);
    final api = zad();
    api.marketOrders[4823] = {
      ...ZadMarket.picking(left: const Duration(seconds: 2), now: now),
      'id': 4823,
    };
    await open(tester, Paths.marketOrder(4823), api: api);
    expect(find.text('YOUR ANSWER, PLEASE'), findsOneWidget);
    // Two seconds later the order's choice applies: the card goes.
    api.marketOrders[4823] = {
      ...api.marketOrders[4823]!,
      'lines': [
        for (final l
            in (api.marketOrders[4823]!['lines'] as List)
                .cast<Map<String, dynamic>>())
          l['proposal'] == null
              ? l
              : {
                  ...l,
                  'proposal': {
                    ...(l['proposal'] as Map<String, dynamic>),
                    'answer': 'accepted',
                    'answered_by': 'timeout',
                  },
                },
      ],
    };
    now = now.add(const Duration(seconds: 3));
    await tester.pump(const Duration(seconds: 1));
    await TestApp.settle(tester, 12);
    expect(find.text('YOUR ANSWER, PLEASE'), findsNothing);
    expect(api.substituteAnswers, isEmpty);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('leaving the substitute out', (tester) async {
    phone(tester);
    final api = zad();
    await open(tester, Paths.marketOrder(4821), api: api);
    await tester.tap(find.byKey(const ValueKey('market-proposal-decline-1')));
    await TestApp.settle(tester, 12);
    expect(api.substituteAnswers.last, (order: 4821, line: 1, accept: false));
  });

  testWidgets('on its way: the weighed price line by line, and the courier\'s '
      'masked call', (tester) async {
    phone(tester);
    final opened = <String>[];
    await open(
      tester,
      Paths.marketOrder(4822),
      more: [
        openExternalProvider.overrideWithValue((url) async {
          opened.add(url);
          return true;
        }),
      ],
    );
    expect(find.text('Weighed and final'), findsOneWidget);
    expect(find.text('Within 10%'), findsOneWidget);
    expect(find.text('EGP 396.00'), findsOneWidget);
    expect(
      tester
          .widget<Text>(find.byKey(const ValueKey('market-final-total')))
          .data,
      'EGP 415.55',
    );
    expect(find.text('+EGP 4.80'), findsOneWidget);
    expect(find.text('+EGP 1.75'), findsOneWidget);
    expect(find.text('+EGP 8.00'), findsOneWidget);
    expect(find.text('+EGP 5.00'), findsOneWidget);
    expect(
      find.text('Short-grain rice, 1 kg ×2, you accepted'),
      findsOneWidget,
    );
    expect(find.text('Karim is bringing your order'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('market-call-courier')));
    await tester.pump();
    expect(opened.single, 'tel:+20212345678,4821');
  });

  testWidgets('no masked line, no call button; cash pays the final price', (
    tester,
  ) async {
    phone(tester);
    final api = zad();
    api.marketOrders[4822] = {
      ...ZadMarket.onTheWay(payment: 'cash', call: false),
      'id': 4822,
    };
    await open(tester, Paths.marketOrder(4822), api: api);
    expect(find.text('Karim is bringing your order'), findsOneWidget);
    expect(find.byKey(const ValueKey('market-call-courier')), findsNothing);
    expect(
      find.text('You pay the final price in cash when it arrives.'),
      findsOneWidget,
    );
  });

  testWidgets('the barcode, typed where there is no camera, finds the product '
      'in this store', (tester) async {
    phone(tester);
    final app = await open(tester, Paths.marketVendor(ZadMarket.id));
    await tester.tap(find.byKey(const ValueKey('market-scan')).first);
    await TestApp.settle(tester, 12);
    expect(
      find.text('The camera is off for this app. Type the code instead.'),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey('market-barcode-type')));
    await TestApp.settle(tester, 12);
    await tester.enterText(
      find.byKey(const ValueKey('market-barcode-field')),
      '6223000123456',
    );
    await tester.tap(find.byKey(const ValueKey('market-barcode-find')));
    await TestApp.settle(tester, 20);
    expect(app.api.productQueries.last.barcode, '6223000123456');
    expect(find.byKey(const ValueKey('market-product-add')), findsOneWidget);
    expect(find.text('Egyptian rice, 1 kg'), findsWidgets);
    // A code the store doesn't sell.
    app.container.read(appRouterProvider).pop();
    await TestApp.settle(tester, 12);
    await tester.tap(find.byKey(const ValueKey('market-scan')).first);
    await TestApp.settle(tester, 12);
    await tester.tap(find.byKey(const ValueKey('market-barcode-type')));
    await TestApp.settle(tester, 12);
    await tester.enterText(
      find.byKey(const ValueKey('market-barcode-field')),
      '0000000000000',
    );
    await tester.tap(find.byKey(const ValueKey('market-barcode-find')));
    await TestApp.settle(tester, 20);
    expect(
      find.text('Zad Market has nothing with this barcode.'),
      findsOneWidget,
    );
  });

  test('the basket: the order\'s choice, a line\'s own, and the most after '
      'weighing', () {
    final basket = ZadMarket.basket();
    expect(basket.ifMissing, MarketIfMissing.similar);
    expect(basket.lines[0].choiceIn(basket), MarketIfMissing.similar);
    expect(basket.lines[1].choiceIn(basket), MarketIfMissing.remove);
    expect(basket.estimate, 396);
    expect(basket.weighedEstimate, 155);
    expect(basket.mostAfterWeighing(10), closeTo(411.5, 1e-9));
    // "My choice" without an item yet follows the order's.
    final line = MarketBasketLine(
      item: ZadMarket.rice,
      quantity: 1,
      ifMissing: MarketIfMissing.chosen,
    );
    final inputs = MarketBasket(
      vendor: ZadMarket.vendor,
      lines: [line],
    ).inputs(shop: true);
    expect(inputs.single.toJson().containsKey('if_missing'), isFalse);
    expect(MarketUnit.kg, ZadMarket.cheese.unit);
  });
}
