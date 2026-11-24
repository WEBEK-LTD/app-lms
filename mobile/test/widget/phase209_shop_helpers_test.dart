import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/shared/pages/studio_shop_helpers.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 209 What the shop types (kids' clothes, cosmetics, toys) need, for any
/// app: the size finder (the ages of the shop's size chart, the size that
/// fits and its button), the swatches (a shade finder) and the quiz (one
/// question at a time, the result with the most answers, Start again); and
/// a product's page with its swatches, ages, badges, expiry, its parts in
/// its words and its facts. An app before them skips the elements.
void main() {
  const chart = {
    'headers': ['Age', 'Height', 'Weight'],
    'rows': [
      ['0–3M', '56–62', '4–6'],
      ['2–3Y', '92–98', '13–15'],
      ['4–5Y', '104–110', '16–19'],
    ],
    'unit': 'cm',
  };

  Map<String, dynamic> page(List<Map<String, dynamic>> children) => {
    ...appPageJson(blocks: []),
    'studio': {
      'body': {'id': 'root', 'type': 'column', 'children': children},
    },
  };

  final finder = {
    'id': 'finder',
    'type': 'size_finder',
    'text': 'Which size fits your child?',
    'title': 'Shop this size',
    'action': {'type': 'screen', 'screen': 'search'},
  };
  final swatches = {
    'id': 'shades',
    'type': 'swatches',
    'text': 'Find your shade',
    'title': 'Shop this shade',
    'action': {'type': 'screen', 'screen': 'search'},
    'swatches': {'shape': 'square', 'size': 40},
    'entries': [
      {'title': 'Porcelain', 'subtitle': '1N', 'color': '#F3D9C6'},
      {
        'title': 'Warm beige',
        'subtitle': '3W',
        'text': 'For a medium, warm skin',
        'color': '#D7A887',
        'highlight': true,
      },
      {'title': 'Espresso', 'subtitle': '7N', 'color': '#6B412D'},
    ],
  };
  final quiz = {
    'id': 'quiz',
    'type': 'quiz',
    'text': 'Know your skin type',
    'title': 'Shop for it',
    'quiz': {
      'questions': [
        {'title': 'By noon your skin feels…', 'text': 'Tight\nShiny'},
        {'title': 'Your pores are…', 'text': 'Barely seen\nLarge'},
      ],
    },
    'entries': [
      {
        'title': 'Dry skin',
        'text': 'Rich creams and oils.',
        'action': {'type': 'screen', 'screen': 'search'},
      },
      {'title': 'Oily skin', 'text': 'Light gels.', 'label': 'Shop oily'},
    ],
  };

  Future<TestApp> open(
    WidgetTester tester, {
    bool sizes = true,
    String language = 'en',
    Map<String, dynamic>? product,
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
              'store': {...storeConfigJson(), if (sizes) 'size_chart': chart},
            },
          )
          ..navigation = navigationJson(
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
          )
          ..pages = {
            'home': page([
              {'id': 't', 'type': 'text', 'text': 'Welcome'},
              finder,
              swatches,
              quiz,
            ]),
          };
    if (product != null) api.product = product;
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

  test('reads the three elements, a product\'s details and its swatches', () {
    final s = StudioNode.tryParse(swatches)!;
    expect(s.type, StudioNodeType.swatches);
    expect(s.swatchSquare, isTrue);
    expect(s.swatchSize, 40);
    expect(s.entries[1].highlight, isTrue);
    final q = StudioNode.tryParse(quiz)!;
    expect(q.quizQuestions.length, 2);
    expect(StudioQuiz.shows(q), isTrue);
    expect(StudioQuiz.answersOf(q.quizQuestions.first), ['Tight', 'Shiny']);
    // The answer in place n counts for result n; a tie goes to the first.
    expect(StudioQuiz.resultOf([1, 1], 2), 1);
    expect(StudioQuiz.resultOf([0, 1], 2), 0);
    expect(StudioQuiz.resultOf([3], 2), 1);
    expect(StudioNode.tryParse(finder)!.type, StudioNodeType.sizeFinder);
    final detail = ProductDetail.fromJson(lipstick());
    expect(detail.info.map((i) => i.kind), [
      ProductInfoKind.ingredients,
      ProductInfoKind.howToUse,
    ]);
    expect(detail.badges, [ProductBadge.genuine, ProductBadge.crueltyFree]);
    expect(detail.expiry, '2027-06');
    expect(detail.ages, isNull);
    expect(detail.facts.single.name, 'Brand');
    expect(detail.choices.single.options.first.swatch, '#C2185B');
    // Nothing more from an older server, or what isn't well made.
    final plain = ProductDetail.fromJson({
      ...productDetailJson(),
      'info': [
        {'kind': 'spells', 'text': 'x'},
      ],
      'badges': ['bogus'],
      'expiry': 'soon',
      'age_months': {'min': 24, 'max': 12},
    });
    expect(plain.info, isEmpty);
    expect(plain.badges, isEmpty);
    expect(plain.expiry, isNull);
    expect(plain.ages, isNull);
  });

  for (final language in ['en', 'ar']) {
    testWidgets('the size finder, the swatches and the quiz ($language)', (
      tester,
    ) async {
      final app = await open(tester, language: language);
      // The size finder: the middle age chosen, its measures, its button.
      expect(find.byKey(const ValueKey('studio-size-finder')), findsOneWidget);
      expect(find.text('92–98'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('size-finder-4–5Y')));
      await tester.pump();
      expect(find.text('104–110'), findsOneWidget);
      expect(find.text('Shop this size · 4–5Y'), findsOneWidget);
      // The swatches: the highlighted one first, another tapped.
      expect(find.text('Warm beige'), findsOneWidget);
      expect(find.text('For a medium, warm skin'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('swatch-2')));
      await tester.pump();
      expect(find.text('Espresso'), findsOneWidget);
      expect(find.text('Shop this shade'), findsOneWidget);
      // 224.10 Its button in the app's font, as the page's other words.
      final label = tester.widget<RichText>(
        find.descendant(
          of: find.byKey(const ValueKey('swatches-button')),
          matching: find.byWidgetPredicate(
            (w) => w is RichText && w.text.toPlainText() == 'Shop this shade',
          ),
        ),
      );
      final appFont = Theme.of(tester.element(find.text('Shop this shade')))
          .textTheme
          .bodyMedium
          ?.fontFamily;
      expect(appFont, isNotNull);
      expect(label.text.style?.fontFamily, appFont);
      // The quiz: two answers for the second result, its words and button.
      await tester.ensureVisible(find.byKey(const ValueKey('studio-quiz')));
      expect(find.text('By noon your skin feels…'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('quiz-answer-0-1')));
      await TestApp.settle(tester, 10);
      await tester.tap(find.byKey(const ValueKey('quiz-answer-1-1')));
      await TestApp.settle(tester, 10);
      expect(find.byKey(const ValueKey('quiz-result')), findsOneWidget);
      expect(find.text('Oily skin'), findsOneWidget);
      // Its own button words, but no action: none shown.
      expect(find.text('Shop oily'), findsNothing);
      await tester.tap(find.byKey(const ValueKey('quiz-again')));
      await TestApp.settle(tester, 10);
      expect(find.text('By noon your skin feels…'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('quiz-answer-0-0')));
      await TestApp.settle(tester, 10);
      await tester.tap(find.byKey(const ValueKey('quiz-answer-1-0')));
      await TestApp.settle(tester, 10);
      expect(find.text('Dry skin'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('quiz-result-button')));
      await TestApp.settle(tester, 20);
      expect(
        app.container
            .read(appRouterProvider)
            .routerDelegate
            .currentConfiguration
            .uri
            .toString(),
        startsWith('/shop'),
      );
      expect(tester.takeException(), isNull);
      app.container.dispose();
    });
  }

  testWidgets('no size chart: no size finder', (tester) async {
    final app = await open(tester, sizes: false);
    expect(find.byKey(const ValueKey('studio-size-finder')), findsNothing);
    expect(find.byKey(const ValueKey('studio-swatches')), findsOneWidget);
    app.container.dispose();
  });

  testWidgets('a lipstick: its shades as swatches, its badges and expiry, '
      'its ingredients and how to use it, its facts', (tester) async {
    final app = await open(tester, product: lipstick());
    app.container.read(appRouterProvider).push(Paths.product(50));
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('product-swatches-a1')), findsOneWidget);
    // Rosewood is sold out: struck through, not chosen.
    await tester.tap(find.byKey(const ValueKey('swatch-option-Berry')));
    await tester.pump();
    expect(find.byKey(const ValueKey('product-badge-genuine')), findsOneWidget);
    expect(find.text('Not tested on animals'), findsOneWidget);
    expect(find.text('Best before 06/2027'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('product-facts')),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Ingredients'), findsOneWidget);
    // The first part open, the others closed.
    expect(find.text('Castor oil, shea butter.'), findsOneWidget);
    expect(find.text('Glide on from the centre.'), findsNothing);
    expect(find.text('Details'), findsOneWidget);
    expect(find.text('Vela'), findsOneWidget);
    expect(tester.takeException(), isNull);
    app.container.dispose();
  });

  testWidgets('a toy: the ages it is for, in Arabic', (tester) async {
    final app = await open(
      tester,
      language: 'ar',
      product: {
        ...productDetailJson(),
        'id': 51,
        'badges': ['safety_tested'],
        'age_months': {'min': 36, 'max': 72},
        'info': [
          {'kind': 'safety', 'text': 'لا قطع صغيرة.'},
        ],
      },
    );
    app.container.read(appRouterProvider).push(Paths.product(51));
    await TestApp.settle(tester, 20);
    expect(find.text('للأعمار من 3 إلى 6 سنوات'), findsOneWidget);
    expect(find.text('مُختبَر للسلامة'), findsOneWidget);
    expect(tester.takeException(), isNull);
    app.container.dispose();
  });
}

Map<String, dynamic> lipstick() => {
  ...productSummaryJson(
    id: 50,
    name: 'Velvet lip colour',
    type: 'variable',
    price: priceJson('89.00'),
  ),
  'description_html': '<p>A soft matte lip.</p>',
  'short_description_html': null,
  'images': <Object>[],
  'sku': 'BT-301',
  'max_quantity': null,
  'attributes': [
    {
      'slug': 'a1',
      'name': 'Shade',
      'variation': true,
      'options': [
        {'value': 'Berry', 'label': 'Berry', 'swatch': '#C2185B'},
        {'value': 'Rosewood', 'label': 'Rosewood', 'swatch': '#9E5A6A'},
        {'value': 'Nude', 'label': 'Nude', 'swatch': 'beige'},
      ],
    },
    {
      'slug': 'f1',
      'name': 'Brand',
      'variation': false,
      'options': [
        {'value': 'Vela', 'label': 'Vela'},
      ],
    },
  ],
  'variations': [
    for (final (i, v) in [
      ('Berry', 'in_stock'),
      ('Rosewood', 'out_of_stock'),
      ('Nude', 'in_stock'),
    ].indexed)
      {
        'id': 200 + i,
        'attributes': {'a1': v.$1},
        'price': priceJson('89.00'),
        'image_url': null,
        'stock_status': v.$2,
        'max_quantity': v.$2 == 'in_stock' ? 3 : null,
        'purchasable': v.$2 == 'in_stock',
      },
  ],
  'categories': <Object>[],
  'related': <Object>[],
  'external_url': null,
  'permalink': 'https://velours.example/product/50',
  'info': [
    {'kind': 'ingredients', 'text': 'Castor oil, shea butter.'},
    {'kind': 'how_to_use', 'text': 'Glide on from the centre.'},
  ],
  'badges': ['genuine', 'cruelty_free'],
  'expiry': '2027-06',
};
