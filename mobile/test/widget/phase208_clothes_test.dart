import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 208 Studio's clothes type (Lujain) in the app: the header's menu opens
/// the category menu's page; the category menu draws every main category
/// as a row of cards (its own card first, its sub-categories after it),
/// each opening the shop on it; the size chart element; and a product's
/// page with its size guide, the sizes gone in the colour chosen, the
/// shop's exchanges and "Complete the look". Apps before it skip the new
/// element and draw the menu's categories as chips.
void main() {
  const chart = {
    'headers': ['Size', 'Bust', 'Waist'],
    'rows': [
      ['S', '84', '66'],
      ['M', '88', '70'],
    ],
    'unit': 'cm',
  };

  Map<String, dynamic> category(
    int id,
    String name,
    int count, [
    List<Map<String, dynamic>> children = const [],
  ]) => {
    'id': id,
    'name': name,
    'count': count,
    'image_url': null,
    if (children.isNotEmpty) 'children': children,
  };

  final rows = [
    category(1, 'Dresses', 12, [
      category(11, 'Midi', 5),
      category(12, 'Maxi', 4),
    ]),
    category(2, 'Shoes', 6, [category(21, 'Heels', 3)]),
  ];

  Map<String, dynamic> page(
    Map<String, dynamic>? header,
    List<Map<String, dynamic>> children,
  ) => {
    ...appPageJson(blocks: []),
    'studio': {
      ...?(header == null ? null : {'header': header}),
      'body': {'id': 'root', 'type': 'column', 'children': children},
    },
  };

  Map<String, dynamic> menuNode(String look) => {
    'id': 'menu-rows',
    'type': 'categories',
    'source': 'products',
    'style': 'rows',
    'category_menu': {'look': look},
    'categories': rows,
  };

  Map<String, dynamic> storeConfig({bool sizes = true}) => {
    ...storeConfigJson(),
    if (sizes) 'size_chart': chart,
    'returns': {'enabled': true, 'days': 14},
  };

  Future<TestApp> open(
    WidgetTester tester, {
    String look = 'lead',
    bool sizes = true,
    String language = 'en',
    Map<String, dynamic>? product,
  }) async {
    tester.view
      ..devicePixelRatio = 3
      ..physicalSize = const Size(390, 1600) * 3;
    addTearDown(tester.view.reset);
    final api =
        FakeApi(
            config: {
              ...configJson(
                lms: null,
                store: true,
                languages: languagesJson(available: const ['en', 'ar', 'tr']),
              ),
              'store': storeConfig(sizes: sizes),
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
            'home': page(
              {
                'type': 'logo_actions',
                'title': 'Lujain',
                'buttons': ['menu', 'cart'],
                'menu_page': 'menu',
                // As Lujain's looks draw it: the premium glass header.
                'style': 'glass',
              },
              [
                {'id': 't', 'type': 'text', 'text': 'Welcome'},
                {
                  'id': 's',
                  'type': 'search',
                  'source': 'products',
                  'text': 'Search dresses',
                  'radius': 26,
                  'height': 50,
                  'background': '#FFFFFF',
                  'color': '#5F5B55',
                  'border_color': '#E4DFD6',
                  'border_width': 1,
                  'margin': {'top': 4, 'end': 16, 'bottom': 6, 'start': 16},
                },
                {'id': 'chart', 'type': 'size_chart', 'text': 'Size chart'},
              ],
            ),
            'menu': page(
              {'type': 'title', 'title': 'All categories'},
              [menuNode(look)],
            ),
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

  String location(TestApp app) => app.container
      .read(appRouterProvider)
      .routerDelegate
      .currentConfiguration
      .uri
      .toString();

  test('reads the category menu, its sub-categories, the header menu page, '
      'the size chart and complete the look', () {
    final node = StudioNode.tryParse(menuNode('label'))!;
    expect(node.categoriesStyle, CategoriesStyle.rows);
    expect(node.categoryMenu.look, StudioCategoryMenuLook.label);
    expect(node.categoryMenu.numbers, isTrue);
    expect(node.categories.first.children.map((c) => c.name), ['Midi', 'Maxi']);
    // An older look or none: the lead look, numbered.
    expect(
      StudioNode.tryParse({...menuNode('lead'), 'category_menu': null})!
          .categoryMenu
          .look,
      StudioCategoryMenuLook.lead,
    );
    expect(
      StudioHeader.tryParse({'type': 'logo_actions', 'menu_page': 'menu'})!
          .menuPage,
      'menu',
    );
    expect(StudioHeader.tryParse({'type': 'logo_actions'})!.menuPage, isNull);
    final sizes = SizeChart.tryParse(chart)!;
    expect(sizes.headers, ['Size', 'Bust', 'Waist']);
    expect(sizes.fits(['XS', 'M']), isTrue);
    expect(sizes.fits(['Red', 'Black']), isFalse);
    // A chart without rows, or rows of another width: none.
    expect(
      SizeChart.tryParse({
        'headers': ['Size', 'Bust'],
        'rows': [],
      }),
      isNull,
    );
    expect(
      SizeChart.tryParse({
        'headers': ['Size', 'Bust'],
        'rows': [
          ['S'],
        ],
      }),
      isNull,
    );
    expect(StoreConfig.fromJson(storeConfig()).sizeChart?.unit, 'cm');
    expect(StoreConfig.fromJson(storeConfig(sizes: false)).sizeChart, isNull);
    final detail = ProductDetail.fromJson({
      ...productDetailJson(),
      'complete_look': [productSummaryJson(id: 40, name: 'Heels')],
    });
    expect(detail.completeLook.single.name, 'Heels');
    expect(ProductDetail.fromJson(productDetailJson()).completeLook, isEmpty);
  });

  for (final language in ['en', 'ar']) {
    testWidgets('the header menu opens the category menu; each card opens the '
        'shop on its category ($language)', (tester) async {
      final app = await open(tester, language: language);
      // The size chart on the home, from the shop's settings.
      expect(find.byKey(const ValueKey('studio-size-chart')), findsOneWidget);
      expect(find.text('84'), findsOneWidget);
      expect(find.text('Search dresses'), findsOneWidget);
      // Under the glass header, never behind it.
      expect(
        tester.getTopLeft(find.text('Search dresses')).dy,
        greaterThan(
          tester
              .getBottomLeft(
                find.byKey(const ValueKey('studio-header-menu-page')),
              )
              .dy,
        ),
      );
      await tester.tap(find.byKey(const ValueKey('studio-header-menu-page')));
      await TestApp.settle(tester, 20);
      // The menu's page over the home (pushed, the home under it).
      expect(find.byKey(const ValueKey('category-menu-lead')), findsOneWidget);
      // Each main category first, then its sub-categories.
      expect(find.byKey(const ValueKey('category-menu-all-1')), findsOneWidget);
      expect(
        find.byKey(const ValueKey('category-menu-sub-11')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('category-menu-sub-21')),
        findsOneWidget,
      );
      expect(find.text('Midi'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('category-menu-sub-12')));
      await TestApp.settle(tester, 20);
      expect(location(app), Paths.shopFiltered(category: 12));
      expect(tester.takeException(), isNull);
      app.container.dispose();
    });
  }

  testWidgets('the label look: the name over the row, All on its first card', (
    tester,
  ) async {
    final app = await open(tester, look: 'label');
    app.container.read(appRouterProvider).go(Paths.page('menu'));
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('category-menu-label')), findsOneWidget);
    expect(find.text('All Dresses'), findsOneWidget);
    expect(find.text('ALL'), findsNWidgets(2));
    expect(find.text('01'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('category-menu-all-2')));
    await TestApp.settle(tester, 20);
    expect(location(app), Paths.shopFiltered(category: 2));
    app.container.dispose();
  });

  testWidgets('no size chart: the element shows nothing', (tester) async {
    final app = await open(tester, sizes: false);
    expect(find.byKey(const ValueKey('studio-size-chart')), findsNothing);
    expect(find.text('Welcome'), findsOneWidget);
    app.container.dispose();
  });

  Map<String, dynamic> dress() => {
    ...productSummaryJson(
      id: 30,
      name: 'Rust satin midi dress',
      type: 'variable',
      price: priceJson('1190.00'),
    ),
    'description_html': '<p>Fluid satin.</p>',
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
        ],
      },
      {
        'slug': 'a2',
        'name': 'Colour',
        'variation': true,
        'options': [
          {'value': 'Rust', 'label': 'Rust'},
          {'value': 'Black', 'label': 'Black'},
        ],
      },
    ],
    'variations': [
      for (final (i, v) in [
        ('S', 'Rust', 'in_stock'),
        ('S', 'Black', 'out_of_stock'),
        ('M', 'Rust', 'in_stock'),
        ('M', 'Black', 'in_stock'),
      ].indexed)
        {
          'id': 100 + i,
          'attributes': {'a1': v.$1, 'a2': v.$2},
          'price': priceJson('1190.00'),
          'image_url': null,
          'stock_status': v.$3,
          'max_quantity': v.$3 == 'in_stock' ? 3 : null,
          'purchasable': v.$3 == 'in_stock',
        },
    ],
    'default_attributes': {'a2': 'Black'},
    'categories': <Object>[],
    'related': <Object>[],
    'complete_look': [productSummaryJson(id: 41, name: 'Black strappy heels')],
    'external_url': null,
    'permalink': 'https://lujain.example/product/30',
  };

  testWidgets('a dress: its size guide, the size gone in black, the exchanges '
      'and complete the look', (tester) async {
    final app = await open(tester, product: dress());
    app.container.read(appRouterProvider).push(Paths.product(30));
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('product-exchange')), findsOneWidget);
    expect(find.text('Exchange or return within 14 days'), findsOneWidget);
    // Black is chosen when the page opens: S is gone in black.
    expect(find.byKey(const ValueKey('option-sold-out-S')), findsOneWidget);
    expect(find.byKey(const ValueKey('option-sold-out-M')), findsNothing);
    // The size guide only beside the sizes, not the colours.
    expect(find.byKey(const ValueKey('product-size-guide')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('product-size-guide')));
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('size-guide-sheet')), findsOneWidget);
    expect(find.text('Size chart (cm)'), findsOneWidget);
    await tester.tapAt(const Offset(20, 40));
    await TestApp.settle(tester, 20);
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('product-complete-look')),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Complete the look'), findsOneWidget);
    expect(find.text('Black strappy heels'), findsOneWidget);
    expect(tester.takeException(), isNull);
    app.container.dispose();
  });

  testWidgets('a shop without a chart: no size guide', (tester) async {
    final app = await open(tester, sizes: false, product: dress());
    app.container.read(appRouterProvider).push(Paths.product(30));
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('product-size-guide')), findsNothing);
    app.container.dispose();
  });
}
