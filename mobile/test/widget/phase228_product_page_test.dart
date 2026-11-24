import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/json.dart' show snake;
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';
import 'package:yallapp/modules/store/screens/cart_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 228 A shop's own product page from Studio (`StudioPage.screen`
/// `product`): drawn for every product in place of the app's product
/// screen, its elements bound to the product open in the looks the owner
/// chose; the size chosen sets the price and goes into the cart with Add to
/// cart, Buy now opens the cart. A shop without one keeps the app's own
/// product screen, and the elements draw nothing on any other page.
/// 228.8 A text as the customer reads it, its bidi isolates left out.
Finder isoText(String text) => find.byWidgetPredicate(
  (w) =>
      w is Text &&
      (w.data ?? '').replaceAll(RegExp('[\u2066-\u2069]'), '') == text,
);

void main() {
  Map<String, dynamic> dress() => {
    ...productSummaryJson(
      id: 30,
      name: 'Rust satin midi dress',
      type: 'variable',
      price: priceJson('1190.00', range: true, formatted: '₺990.00 – ₺1190.00'),
    ),
    'description_html': '<p>Fluid satin, cut on the bias.</p>',
    'short_description_html': null,
    'images': <Object>[],
    'sku': 'CL-101',
    'max_quantity': null,
    'attributes': [
      {
        'slug': 'a1',
        'name': 'Size',
        'variation': true,
        'options': [
          {'value': 'S', 'label': 'S'},
          {'value': 'M', 'label': 'M'},
          {'value': 'L', 'label': 'L'},
        ],
      },
    ],
    'variations': [
      for (final (i, v) in [
        ('S', '990.00', 'in_stock'),
        ('M', '1190.00', 'in_stock'),
        ('L', '1190.00', 'out_of_stock'),
      ].indexed)
        {
          'id': 100 + i,
          'attributes': {'a1': v.$1},
          'price': priceJson(v.$2),
          'image_url': null,
          'stock_status': v.$3,
          'max_quantity': v.$3 == 'in_stock' ? 3 : null,
          'purchasable': v.$3 == 'in_stock',
        },
    ],
    'specs': [
      {'label': 'Fabric', 'value': 'Satin'},
    ],
    'categories': <Object>[],
    'related': [productSummaryJson(id: 42, name: 'Linen shirt dress')],
    'complete_look': [productSummaryJson(id: 41, name: 'Black strappy heels')],
    'external_url': null,
    'permalink': 'https://lujain.example/product/30',
  };

  Map<String, dynamic> node(
    String id,
    String type, [
    Map<String, dynamic> more = const {},
  ]) => {'id': id, 'type': type, ...more};

  List<Map<String, dynamic>> productNodes({String variants = 'grid'}) => [
    node('g', 'product_gallery', {
      'product_part': {'look': 'thumbs'},
      'aspect_ratio': 0.8,
    }),
    node('t', 'product_title', {
      'product_part': {'look': 'rating'},
    }),
    node('p', 'product_price', {
      'product_part': {'look': 'from'},
    }),
    node('v', 'product_variants', {
      'product_part': {'look': variants},
      'text': 'Choose your size',
    }),
    node('q', 'product_quantity'),
    node('d', 'product_delivery', {
      'product_part': {'look': 'card'},
      'title': 'Free delivery over 300\nGift wrapping',
    }),
    node('s', 'product_specs'),
    node('r', 'product_related', {
      'product_part': {'related': 'complete_look'},
    }),
    node('b', 'product_buy', {
      'product_part': {'look': 'buy_now'},
      'pin': 'bottom',
    }),
  ];

  Map<String, dynamic> page(List<Map<String, dynamic>> children) => {
    ...appPageJson(blocks: []),
    'studio': {
      'body': {'id': 'root', 'type': 'column', 'children': children},
    },
  };

  Future<TestApp> open(
    WidgetTester tester, {
    bool productPage = true,
    String language = 'en',
    String variants = 'grid',
    List<Map<String, dynamic>>? nodes,
    bool sized = false,
    Map<String, dynamic> more = const {},
    Map<String, dynamic> storeMore = const {},
  }) async {
    tester.view
      ..devicePixelRatio = 3
      ..physicalSize = const Size(390, 2400) * 3;
    addTearDown(tester.view.reset);
    final api =
        FakeApi(
            config: {
              ...configJson(
                lms: null,
                store: true,
                languages: languagesJson(available: const ['en', 'ar', 'tr']),
              ),
              'store': {
                ...storeConfigJson(),
                'returns': {'enabled': true, 'days': 14},
                ...storeMore,
              },
            },
          )
          ..navigation = {
            ...navigationJson(
              tabs: [
                navTabJson('home', 'Home', 'home', {
                  'type': 'page',
                  'page_slug': 'home',
                }),
                navTabJson('shop', 'Shop', 'grid_view', {
                  'type': 'screen',
                  'screen': 'search',
                }),
              ],
            ),
            'pages': [
              {
                'slug': 'home',
                'title': 'Home',
                'updated_at': '2026-11-23T18:00:00Z',
              },
              if (productPage)
                {
                  'slug': 'product',
                  'title': 'Product page',
                  'updated_at': '2026-11-23T18:00:00Z',
                  'screen': 'product',
                },
            ],
          }
          ..pages = {
            // On a home, a product page's element draws nothing.
            'home': page([
              node('welcome', 'text', {'text': 'Welcome'}),
              node('home-title', 'product_title'),
            ]),
            if (productPage)
              'product': page(nodes ?? productNodes(variants: variants)),
          }
          ..product = {
            ...dress(),
            if (sized) 'dimensions': {'text': 'W 220 × D 95 × H 82 cm'},
            ...more,
          };
    final app = TestApp(
      appType: AppType.store,
      api: api,
      signedIn: true,
      preferences: {'settings.language': language},
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    return app;
  }

  test('reads the product page elements and their looks', () {
    final gallery = StudioNode.tryParse({
      'id': 'g',
      'type': 'product_gallery',
      'product_part': {
        'look': 'stacked',
        'radius': 99,
        'accent': '#121212',
        'dark_accent': '#F3F0EA',
      },
    })!;
    expect(gallery.type, StudioNodeType.productGallery);
    expect(gallery.productPart.look, 'stacked');
    expect(gallery.productPart.radius, 40);
    expect(gallery.productPart.accentFor(dark: true), '#F3F0EA');
    expect(gallery.productPart.accentFor(dark: false), '#121212');
    final related = StudioNode.tryParse({
      'id': 'r',
      'type': 'product_related',
      'product_part': {'related': 'complete_look', 'rows': 3},
    })!;
    expect(related.productPart.completeLook, isTrue);
    expect(related.productPart.rows, 3);
    expect(
      StudioNode.tryParse({'id': 'x', 'type': 'product_buy'})!.productPart.look,
      isNull,
    );
    for (final type in studioProductTypes) {
      expect(StudioNode.tryParse({'id': 'n', 'type': snake(type)})?.type, type);
    }
  });

  testWidgets('a shop without a product page keeps the app\'s own screen, '
      'and the elements draw nothing elsewhere', (tester) async {
    final app = await open(tester, productPage: false);
    expect(find.text('Welcome'), findsOneWidget);
    expect(find.byKey(const ValueKey('product-title')), findsNothing);
    app.container.read(appRouterProvider).push(Paths.product(30));
    await TestApp.settle(tester, 20);
    // The app's own product screen, as before.
    expect(find.byKey(const ValueKey('product-exchange')), findsOneWidget);
    expect(find.byKey(const ValueKey('product-buy-now')), findsNothing);
    expect(tester.takeException(), isNull);
    app.container.dispose();
  });

  testWidgets('the product page: bound to the product, the size sets the '
      'price, Add to cart adds it, Buy now opens the cart', (tester) async {
    final app = await open(tester);
    // Still nothing on the home.
    expect(find.byKey(const ValueKey('product-title')), findsNothing);
    app.container.read(appRouterProvider).push(Paths.product(30));
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('product-exchange')), findsNothing);
    expect(
      find.byKey(const ValueKey('product-gallery-thumbs')),
      findsOneWidget,
    );
    // The name (the top band repeats it once the page scrolls).
    expect(
      tester.widget<Text>(find.byKey(const ValueKey('product-title'))).data,
      'Rust satin midi dress',
    );
    // From the lowest size's price until a size is chosen.
    expect(find.text('From ₺990.00'), findsOneWidget);
    expect(find.text('Choose your size'), findsOneWidget);
    expect(find.byKey(const ValueKey('product-page-grid-a1')), findsOneWidget);
    // The shop's exchanges and its own lines.
    expect(find.text('Delivery & returns'), findsOneWidget);
    expect(find.text('Exchange or return within 14 days'), findsOneWidget);
    expect(find.text('Gift wrapping'), findsOneWidget);
    expect(find.byKey(const ValueKey('product-specs-table')), findsOneWidget);
    expect(find.text('Satin'), findsOneWidget);
    expect(find.text('Complete the look'), findsOneWidget);
    expect(find.text('Black strappy heels'), findsOneWidget);
    // No size chosen: the button asks for one.
    expect(find.byKey(const ValueKey('product-buy-now')), findsNothing);
    await tester.tap(find.text('M'));
    await TestApp.settle(tester, 10);
    expect(find.text('From ₺990.00'), findsNothing);
    expect(find.text('₺1190.00'), findsWidgets);
    await tester.tap(find.byKey(const ValueKey('product-add-to-cart')));
    await TestApp.settle(tester, 10);
    final cart = app.container.read(cartProvider);
    expect(cart.single.name, 'Rust satin midi dress – M');
    expect(cart.single.variationId, 101);
    await tester.tap(find.byKey(const ValueKey('product-buy-now')));
    await TestApp.settle(tester, 20);
    // The cart, opened over the product.
    expect(find.byType(CartScreen), findsOneWidget);
    expect(app.container.read(cartProvider).single.quantity, 2);
    expect(tester.takeException(), isNull);
    app.container.dispose();
  });

  testWidgets('a size gone can\'t be chosen; in Arabic, the app\'s words', (
    tester,
  ) async {
    final app = await open(tester, language: 'ar');
    app.container.read(appRouterProvider).push(Paths.product(30));
    await TestApp.settle(tester, 20);
    expect(find.bySemanticsLabel(RegExp('L')), findsWidgets);
    await tester.tap(isoText('L'), warnIfMissed: false);
    await TestApp.settle(tester, 10);
    expect(find.byKey(const ValueKey('product-buy-now')), findsNothing);
    await tester.tap(isoText('S'));
    await TestApp.settle(tester, 10);
    expect(find.text('اشترِ الآن'), findsOneWidget);
    expect(find.text('أضف إلى السلة'), findsOneWidget);
    expect(find.text('التوصيل والإرجاع'), findsOneWidget);
    expect(tester.takeException(), isNull);
    app.container.dispose();
  });

  // 228.8 A chip hugs its words: chips sit side by side on a line and wrap
  // onto the next, from the right in Arabic; never one across the row each.
  for (final language in ['en', 'ar']) {
    testWidgets('the sizes as chips: each as wide as its words, side by side '
        '($language)', (tester) async {
      final app = await open(tester, language: language, variants: 'chips');
      app.container.read(appRouterProvider).push(Paths.product(30));
      await TestApp.settle(tester, 20);
      final row = find.byKey(const ValueKey('product-page-chips-a1'));
      expect(row, findsOneWidget);
      final width = tester.getSize(row).width;
      Rect chip(String size) => tester.getRect(
        find
            .ancestor(
              of: find.descendant(of: row, matching: isoText(size)),
              matching: find.byType(Material),
            )
            .first,
      );
      for (final size in ['S', 'M', 'L']) {
        expect(chip(size).width, lessThan(width / 3), reason: size);
      }
      // Side by side: S and M on one line, S before M in the reading order.
      expect(chip('S').top, chip('M').top);
      if (language == 'ar') {
        expect(chip('S').left, greaterThan(chip('M').left));
      } else {
        expect(chip('S').left, lessThan(chip('M').left));
      }
      // All three on the one line of a phone.
      expect(chip('L').top, chip('S').top);
      expect(tester.takeException(), isNull);
      app.container.dispose();
    });
  }

  testWidgets('chips wrap onto a second line on a narrow phone', (
    tester,
  ) async {
    final app = await open(tester, variants: 'chips');
    tester.view.physicalSize = const Size(150, 2400) * 3;
    app.container.read(appRouterProvider).push(Paths.product(30));
    await TestApp.settle(tester, 20);
    final row = find.byKey(const ValueKey('product-page-chips-a1'));
    Rect chip(String size) => tester.getRect(
      find
          .ancestor(
            of: find.descendant(of: row, matching: isoText(size)),
            matching: find.byType(Material),
          )
          .first,
    );
    final tops = {
      for (final s in ['S', 'M', 'L']) chip(s).top,
    };
    expect(tops.length, greaterThan(1));
    expect(chip('S').width, lessThan(tester.getSize(row).width));
    app.container.dispose();
  });

  testWidgets('228.8 the size as the headline, a centred name, and the top '
      'band once a page without photos at its top scrolls', (tester) async {
    final app = await open(
      tester,
      sized: true,
      nodes: [
        node('top', 'spacer', {'height': 72}),
        node('t', 'product_title', {'text_align': 'center'}),
        node('d', 'product_specs', {
          'product_part': {'look': 'dimensions'},
        }),
        node('s', 'spacer', {'height': 3000}),
      ],
    );
    app.container.read(appRouterProvider).push(Paths.product(30));
    await TestApp.settle(tester, 20);
    expect(
      find.byKey(const ValueKey('product-dimensions-headline')),
      findsOneWidget,
    );
    expect(find.text('W 220 × D 95 × H 82 cm'), findsOneWidget);
    expect(find.text('Dimensions'), findsWidgets);
    expect(
      tester
          .widget<Text>(find.byKey(const ValueKey('product-title')))
          .textAlign,
      TextAlign.center,
    );
    double band() => tester
        .widget<AnimatedOpacity>(
          find.byKey(const ValueKey('product-page-top-band')),
        )
        .opacity;
    expect(band(), 0);
    await tester.drag(
      find.byKey(const ValueKey('studio-product')),
      const Offset(0, -300),
    );
    await TestApp.settle(tester, 10);
    expect(band(), 1);
    expect(tester.takeException(), isNull);
    app.container.dispose();
  });

  testWidgets('228.8 without a size, the dimensions headline draws nothing', (
    tester,
  ) async {
    final app = await open(
      tester,
      nodes: [
        node('d', 'product_specs', {
          'product_part': {'look': 'dimensions'},
        }),
      ],
    );
    app.container.read(appRouterProvider).push(Paths.product(30));
    await TestApp.settle(tester, 20);
    expect(
      find.byKey(const ValueKey('product-dimensions-headline')),
      findsNothing,
    );
    app.container.dispose();
  });

  // 228.8 Reviews only when there are some, the customer's own, or a way to
  // write one: the shop sends its preview even with none.
  Map<String, dynamic> preview(int count, {bool canReview = false}) => {
    'summary': {
      'rating': count > 0 ? 4.3 : null,
      'rating_count': count,
      'counts': {'5': count},
    },
    'items': <Object>[],
    'photos': <Object>[],
    'photo_count': 0,
    'can_review': canReview,
  };

  for (final (count, canReview, shows) in [
    (0, false, false),
    (3, false, true),
    (0, true, true),
  ]) {
    testWidgets('228.8 reviews: $count, can review $canReview: '
        '${shows ? 'shown' : 'left out'}', (tester) async {
      final app = await open(
        tester,
        nodes: [
          node('t', 'product_title'),
          node('r', 'product_reviews'),
        ],
        more: {
          'rating': count > 0 ? 4.3 : null,
          'rating_count': count,
          'reviews_preview': preview(count, canReview: canReview),
        },
      );
      app.container.read(appRouterProvider).push(Paths.product(30));
      await TestApp.settle(tester, 20);
      expect(
        find.byKey(const ValueKey('product-reviews-summary')),
        shows ? findsOneWidget : findsNothing,
      );
      if (!shows) expect(find.text('0.0'), findsNothing);
      app.container.dispose();
    });
  }

  testWidgets('228.8 in Arabic, a spec value and a size keep their own '
      'direction ("256 GB", "6.6″", never "GB 256")', (tester) async {
    final app = await open(
      tester,
      language: 'ar',
      variants: 'chips',
      nodes: [
        node('v', 'product_variants', {
          'product_part': {'look': 'chips'},
        }),
        node('s', 'product_specs'),
        node('l', 'product_specs', {
          'product_part': {'look': 'list'},
        }),
      ],
      more: {
        'specs': [
          {'label': 'التخزين', 'value': '256 GB'},
          {'label': 'الشاشة', 'value': '6.6″'},
        ],
      },
    );
    app.container.read(appRouterProvider).push(Paths.product(30));
    await TestApp.settle(tester, 20);
    bool shown(String value) => tester
        .widgetList<RichText>(find.byType(RichText))
        .any((t) => t.text.toPlainText().contains('\u2068$value\u2069'));
    expect(shown('256 GB'), isTrue);
    expect(shown('6.6″'), isTrue);
    expect(shown('S'), isTrue);
    expect(tester.takeException(), isNull);
    app.container.dispose();
  });

  testWidgets('228.8 Notify me in the part\'s own colour and corners', (
    tester,
  ) async {
    final app = await open(
      tester,
      nodes: [
        node('v', 'product_variants'),
        node('b', 'product_buy', {
          'product_part': {'look': 'cart', 'accent': '#7A1F30'},
          'radius': 30,
        }),
      ],
      more: {
        'stock_status': 'out_of_stock',
        'back_in_stock': {'waiting': false, 'variations': <Object>[]},
      },
      storeMore: {'back_in_stock': true},
    );
    app.container.read(appRouterProvider).push(Paths.product(30));
    await TestApp.settle(tester, 20);
    final button = tester.widget<FilledButton>(
      find.byKey(const ValueKey('back-in-stock')),
    );
    expect(
      button.style!.backgroundColor!.resolve(<WidgetState>{}),
      const Color(0xFF7A1F30),
    );
    final shape =
        button.style!.shape!.resolve(<WidgetState>{})! as RoundedRectangleBorder;
    expect(shape.borderRadius, BorderRadius.circular(30));
    app.container.dispose();
  });
}
