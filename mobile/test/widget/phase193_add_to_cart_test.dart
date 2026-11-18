import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';
import 'package:yallapp/modules/store/widgets/product_widgets.dart';

import '../screenshots/support/leqaa.dart';
import '../screenshots/support/studio_demo.dart';
import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 193 The owner (18 November, urgent), on Kech Flora and Leqaa: "Add to
/// cart" under every product, on every page. On Leqaa's looks (the gift
/// checkout) each product's card has it: a product with nothing to choose
/// goes straight in the cart with "Added to cart"; one with sizes or
/// options opens its page to choose them; out of stock, the button is off.
/// A shop without the gift checkout keeps its cards as they were.
void main() {
  Map<String, dynamic> simple(
    int id,
    String name, {
    String stock = 'in_stock',
  }) => productSummaryJson(id: id, name: name, stock: stock);

  final shop = [
    simple(301, 'Rose jar'),
    productSummaryJson(
      id: 302,
      name: 'Chocolate heart',
      type: 'variable',
      price: priceJson(
        '299.00',
        range: true,
        formatted: 'MAD 299.00 – MAD 699.00',
      ),
    ),
    simple(303, 'Tulip box', stock: 'out_of_stock'),
    simple(304, 'Peony card'),
  ];

  Future<(TestApp, FakeApi)> open(
    WidgetTester tester, {
    bool gift = true,
    Map<String, dynamic>? detail,
  }) async {
    tester.view
      ..devicePixelRatio = 3
      ..physicalSize = const Size(390, 1400) * 3;
    addTearDown(tester.view.reset);
    final FakeApi api;
    if (gift) {
      api = leqaaStudioApi(look: StudioDemo.signature('flowers', 'a'))
        ..shopProducts = shop;
    } else {
      api = FakeApi(
        config: {
          ...configJson(lms: null, languages: languagesJson()),
          'store': storeConfigJson(),
        },
      );
    }
    if (detail != null) api.product = detail;
    final app = TestApp(api: api, appType: AppType.store, signedIn: true);
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    app.container.read(appRouterProvider).go(Paths.shop);
    await TestApp.settle(tester, 30);
    return (app, api);
  }

  Future<void> close(WidgetTester tester, TestApp app) async {
    await tester.pumpWidget(const SizedBox());
    app.container.dispose();
    await TestApp.settle(tester, 2);
  }

  Finder button(int id) => find.byKey(ValueKey('quick-add-$id'));

  // In the middle of the screen, clear of the tab bar over the page.
  Future<void> reveal(WidgetTester tester, int id) async {
    await Scrollable.ensureVisible(
      tester.element(
        find.byKey(ValueKey('quick-add-$id'), skipOffstage: false),
      ),
      alignment: 0.4,
    );
    await TestApp.settle(tester, 4);
  }

  testWidgets('a product with nothing to choose goes straight in the cart', (
    tester,
  ) async {
    final (app, _) = await open(
      tester,
      detail: {
        ...productDetailJson(),
        ...simple(301, 'Rose jar'),
        'related': <Object>[],
      },
    );
    await reveal(tester, 301);
    await tester.tap(button(301));
    await TestApp.settle(tester, 10);
    final cart = app.container.read(cartProvider);
    expect(cart, hasLength(1));
    expect(cart.single.productId, 301);
    expect(cart.single.quantity, 1);
    expect(find.text('Added to cart'), findsOneWidget);
    expect(find.text('View cart'), findsOneWidget);
    await close(tester, app);
  });

  testWidgets('a product with sizes opens its page, nothing added', (
    tester,
  ) async {
    final (app, api) = await open(tester, detail: variableProductJson());
    await reveal(tester, 302);
    await tester.tap(button(302));
    await TestApp.settle(tester, 20);
    expect(app.container.read(cartProvider), isEmpty);
    expect(
      app.container.read(appRouterProvider).state.uri.path,
      Paths.product(302),
    );
    // Straight there: the list knew it has sizes.
    expect(api.productsAsked.where((id) => id == 302), hasLength(1));
    await close(tester, app);
  });

  testWidgets('a simple product with options to choose opens its page', (
    tester,
  ) async {
    final (app, _) = await open(
      tester,
      detail: {
        ...productDetailJson(),
        ...simple(304, 'Peony card'),
        'option_groups': [
          {
            'id': 'w1',
            'name': 'Card',
            'min': 1,
            'max': 1,
            'options': [
              {'id': 'w1o1', 'name': 'Birthday', 'price_delta': '0.00'},
            ],
          },
        ],
      },
    );
    await reveal(tester, 304);
    await tester.tap(button(304));
    await TestApp.settle(tester, 20);
    expect(app.container.read(cartProvider), isEmpty);
    expect(
      app.container.read(appRouterProvider).state.uri.path,
      Paths.product(304),
    );
    await close(tester, app);
  });

  testWidgets('out of stock: the button is off', (tester) async {
    final (app, _) = await open(tester);
    await reveal(tester, 303);
    final off = tester.widget<FilledButton>(button(303));
    expect(off.onPressed, isNull);
    expect(
      find.descendant(of: button(303), matching: find.text('Out of stock')),
      findsOneWidget,
    );
    await close(tester, app);
  });

  testWidgets('every card of the shop has it; a shop without the gift '
      'checkout keeps its cards as they were', (tester) async {
    var (app, _) = await open(tester);
    final cards = find.byType(ProductCard, skipOffstage: false);
    expect(cards, findsNWidgets(shop.length));
    for (final p in shop) {
      expect(
        find.byKey(ValueKey('quick-add-${p['id']}'), skipOffstage: false),
        findsOneWidget,
      );
    }
    await close(tester, app);

    (app, _) = await open(tester, gift: false);
    expect(find.byType(ProductCard), findsWidgets);
    expect(
      find.byWidgetPredicate(
        (w) =>
            w.key is ValueKey<String> &&
            (w.key! as ValueKey<String>).value.startsWith('quick-add-'),
        skipOffstage: false,
      ),
      findsNothing,
    );
    await close(tester, app);
  });
}
