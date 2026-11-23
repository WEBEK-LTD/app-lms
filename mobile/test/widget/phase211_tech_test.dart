import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/yallapp_api.dart' show ProductQuery;
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/format/money.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';
import 'package:yallapp/modules/store/widgets/tech_widgets.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 211 The electronics, mobiles and computers shops in the app: a
/// product's specs, products compared, the shop by a spec's value, the
/// trade-in estimator and its request, Build your PC and its checks, and a
/// product's page (specs, compare, matching accessories, installments
/// coming soon). Apps before them skip the new elements.
void main() {
  List<Map<String, String?>> specs(Map<String, String> s) => [
    for (final e in s.entries) {'key': e.key, 'label': e.key, 'value': e.value},
  ];

  Map<String, dynamic> techProduct(
    int id,
    String title,
    Map<String, String> s,
  ) => {
    'id': '$id',
    'title': title,
    'image_url': null,
    'price': 'SAR $id',
    'was_price': null,
    'specs': specs(s),
  };

  const tradeIn = {
    'models': [
      {
        'name': 'Orbit Nine',
        'storages': [
          {'label': '128 GB', 'cents': 150000},
          {'label': '256 GB', 'cents': 180000},
        ],
      },
    ],
    'grades': {'like_new': 100, 'good': 85, 'fair': 65, 'broken': 30},
  };

  const pcBuilder = {
    'steps': [
      {'part': 'cpu', 'category_id': 1, 'required': true},
      {'part': 'board', 'category_id': 2, 'required': true},
      {'part': 'case', 'category_id': 3, 'required': false},
    ],
  };

  Map<String, dynamic> page(List<Map<String, dynamic>> children) => {
    ...appPageJson(blocks: []),
    'studio': {
      'body': {'id': 'root', 'type': 'column', 'children': children},
    },
  };

  final nodes = <Map<String, dynamic>>[
    {'id': 't', 'type': 'text', 'text': 'Welcome'},
    {
      'id': 'specs',
      'type': 'spec_table',
      'text': 'Key specs',
      'tech': {'rows': 2},
      'tech_served': {
        'products': [
          techProduct(5, 'Veyra X3', {
            'screen': '6.7″ OLED',
            'ram': '12 GB',
            'storage': '512 GB',
          }),
        ],
      },
    },
    {
      'id': 'cmp',
      'type': 'compare',
      'tech_served': {
        'products': [
          techProduct(5, 'Veyra X3', {'screen': '6.7″', 'camera': '200 MP'}),
          techProduct(6, 'Orbit Nine', {'screen': '6.3″', 'battery': '5000'}),
        ],
      },
    },
    {
      'id': 'flt',
      'type': 'spec_filter',
      'tech': {'spec': 'ram'},
      'tech_served': {
        'spec': {
          'key': 'ram',
          'label': 'Memory',
          'values': [
            {'value': '16 GB', 'count': 4},
            {'value': '32 GB', 'count': 2},
          ],
        },
      },
    },
    {
      'id': 'trade',
      'type': 'trade_in',
      'tech': {'look': 'full'},
    },
    {'id': 'pc', 'type': 'pc_builder', 'text': 'Build your own'},
    // A type this app doesn't know is skipped, as an older app skips these.
    {'id': 'future', 'type': 'hologram', 'text': 'Nope'},
  ];

  Future<(TestApp, FakeApi)> open(
    WidgetTester tester, {
    bool tech = true,
    String language = 'en',
    bool dark = false,
    Map<String, dynamic>? product,
    List<Map<String, dynamic>>? children,
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
                'currency': 'SAR',
                if (tech) ...{
                  'trade_in': tradeIn,
                  'pc_builder': pcBuilder,
                  'installments_soon': true,
                },
              },
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
          ..pages = {'home': page(children ?? nodes)};
    if (product != null) api.product = product;
    final app = TestApp(
      appType: AppType.store,
      api: api,
      signedIn: true,
      preferences: {
        'settings.language': language,
        if (dark) 'settings.theme_mode': 'dark',
      },
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    return (app, api);
  }

  // The screen on top: a pushed route's own location, else the app's.
  String location(TestApp app) {
    final config = app.container
        .read(appRouterProvider)
        .routerDelegate
        .currentConfiguration;
    final last = config.matches.last;
    return last is ImperativeRouteMatch
        ? last.matches.uri.toString()
        : config.uri.toString();
  }

  group('the contract', () {
    test('reads the specs, the tech settings, the elements and the flows', () {
      final config = StoreConfig.fromJson({
        ...storeConfigJson(),
        'trade_in': tradeIn,
        'pc_builder': pcBuilder,
        'installments_soon': true,
      });
      expect(config.tradeIn!.models.single.storages.length, 2);
      expect(config.tradeIn!.grades[TradeInGrade.fair], 65);
      expect(config.pcBuilder!.steps.map((s) => s.part), [
        PcPart.cpu,
        PcPart.board,
        PcPart.$case,
      ]);
      expect(config.pcBuilder!.steps.last.required, isFalse);
      expect(config.installmentsSoon, isTrue);
      final plain = StoreConfig.fromJson(storeConfigJson());
      expect(plain.tradeIn, isNull);
      expect(plain.pcBuilder, isNull);
      expect(plain.installmentsSoon, isFalse);
      // A builder with one part, a part twice or one unknown: what's left.
      expect(
        PcBuilderRules.tryParse({
          'steps': [
            {'part': 'cpu', 'category_id': 1},
          ],
        }),
        isNull,
      );
      expect(
        PcBuilderRules.tryParse({
          'steps': [
            {'part': 'cpu', 'category_id': 1},
            {'part': 'cpu', 'category_id': 4},
            {'part': 'laser', 'category_id': 5},
            {'part': 'board', 'category_id': 2},
          ],
        })!.steps.length,
        2,
      );
      expect(TradeInRules.tryParse({'models': []}), isNull);
      final detail = ProductDetail.fromJson({
        ...productDetailJson(),
        'specs': [
          {'key': 'ram', 'label': 'Memory', 'value': '16 GB'},
          {'key': null, 'label': 'Finish', 'value': 'Titanium'},
          {'label': '', 'value': 'x'},
        ],
        'accessories': [productSummaryJson(id: 70, name: 'Case')],
      });
      expect(detail.specs.map((s) => s.label), ['Memory', 'Finish']);
      expect(detail.specs.first.key, 'ram');
      expect(detail.accessories.single.name, 'Case');
      final summary = ProductSummary.fromJson({
        ...productSummaryJson(),
        'spec_line': '256 GB · 6.7″',
      });
      expect(summary.specLine, '256 GB · 6.7″');
      expect(ProductSummary.fromJson(productSummaryJson()).specs, isEmpty);
      final node = StudioNode.tryParse(nodes[4])!;
      expect(node.type, StudioNodeType.tradeIn);
      expect(node.tech.look, StudioTradeInLook.full);
      final filter = StudioNode.tryParse(nodes[3])!;
      expect(filter.techServed!.spec!.values.first.value, '16 GB');
      expect(StudioNode.tryParse(nodes.last), isNull);
      for (final (wire, flow) in [
        ('trade_in', ActionFlow.tradeIn),
        ('pc_builder', ActionFlow.pcBuilder),
      ]) {
        expect(
          PageAction.tryParse({
            'type': 'screen',
            'screen': 'search',
            'flow': wire,
          })!.flow,
          flow,
        );
      }
      expect(
        const ProductQuery(
          spec: 'ram',
          specValue: '16 GB',
          withSpecs: true,
        ).toQuery(),
        containsPair('spec_value', '16 GB'),
      );
    });

    test('the trade-in estimate: the top price times the grade, to the unit '
        'below', () {
      final rules = TradeInRules.tryParse(tradeIn)!;
      expect(
        rules.estimate('Orbit Nine', '256 GB', TradeInGrade.likeNew),
        180000,
      );
      expect(rules.estimate('Orbit Nine', '256 GB', TradeInGrade.good), 153000);
      // 1,500.00 × 65% = 975.00; 1,999.99 × 30% = 599.997 → 599.
      expect(rules.estimate('Orbit Nine', '128 GB', TradeInGrade.fair), 97500);
      expect(estimateCents(199999, 30), 59900);
      expect(rules.estimate('Orbit Nine', '1 TB', TradeInGrade.good), isNull);
      expect(rules.estimate('Other', '128 GB', TradeInGrade.good), isNull);
      expect(rules.top, 180000);
    });

    test('Build your PC checks the parts as the server does', () {
      List<ProductSpec> s(Map<String, String> m) => [
        for (final e in m.entries)
          ProductSpec(key: e.key, label: e.key, value: e.value),
      ];
      final cpu = s({'socket': 'AM5', 'watts': '120 W'});
      final gpu = s({'watts': '285 W'});
      // Fits: the socket, DDR5, 750 W ≥ ceil((120+285+100)×1.25/50)×50 = 650.
      expect(
        checkBuild({
          PcPart.cpu: cpu,
          PcPart.board: s({
            'socket': 'AM5',
            'memory_type': 'DDR5',
            'form_factor': 'ATX',
          }),
          PcPart.ram: s({'memory_type': 'DDR5'}),
          PcPart.gpu: gpu,
          PcPart.cooler: s({'socket': 'AM5, LGA1700'}),
          PcPart.psu: s({'psu_watts': '750 W'}),
          PcPart.$case: s({'form_factor': 'ATX / Micro-ATX'}),
        }),
        isEmpty,
      );
      expect(buildWatts({PcPart.cpu: cpu, PcPart.gpu: gpu}), 650);
      expect(buildWatts({}), 150);
      expect(
        checkBuild({
          PcPart.cpu: cpu,
          PcPart.board: s({
            'socket': 'LGA1700',
            'memory_type': 'DDR4',
            'form_factor': 'E-ATX',
          }),
          PcPart.ram: s({'memory_type': 'DDR5'}),
          PcPart.gpu: gpu,
          PcPart.cooler: s({'socket': 'LGA1700'}),
          PcPart.psu: s({'psu_watts': '550 W'}),
          PcPart.$case: s({'form_factor': 'Mini-ITX'}),
        }),
        const [
          BuildProblem(PcPart.board, PcPart.cpu, BuildReason.socket),
          BuildProblem(PcPart.ram, PcPart.board, BuildReason.memory),
          BuildProblem(PcPart.cooler, PcPart.cpu, BuildReason.cooler),
          BuildProblem(PcPart.psu, PcPart.gpu, BuildReason.power),
          BuildProblem(PcPart.$case, PcPart.board, BuildReason.size),
        ],
      );
      expect(formRank('Micro-ATX'), 1);
      expect(formRank('mATX'), 1);
      expect(formRank('ATX / Micro-ATX'), 2);
      expect(formRank('E-ATX'), 3);
      expect(formRank('Mini ITX'), 0);
      expect(formRank('Tower'), isNull);
    });

    test('the compare rows: the specs all share first, gaps where one has '
        'none', () {
      List<ProductSpec> s(Map<String, String> m) => [
        for (final e in m.entries)
          ProductSpec(key: e.key, label: e.key.toUpperCase(), value: e.value),
      ];
      final rows = compareRows([
        s({'camera': '200 MP', 'screen': '6.7″'}),
        s({'screen': '6.3″', 'battery': '5000'}),
      ]);
      expect(rows.map((r) => r.label), ['SCREEN', 'CAMERA', 'BATTERY']);
      expect(rows.first.values, ['6.7″', '6.3″']);
      expect(rows[1].values, ['200 MP', null]);
      expect(rows[2].values, [null, '5000']);
    });
  });

  for (final (language, dark) in [('en', false), ('ar', true)]) {
    testWidgets('the tech elements draw from what is served ($language, '
        '${dark ? 'dark' : 'light'})', (tester) async {
      final (app, _) = await open(tester, language: language, dark: dark);
      expect(find.byKey(const ValueKey('studio-spec-table')), findsOneWidget);
      expect(find.text('Key specs'), findsOneWidget);
      // Two rows at most.
      expect(find.text('12 GB'), findsOneWidget);
      expect(find.text('512 GB'), findsNothing);
      expect(find.byKey(const ValueKey('studio-compare')), findsOneWidget);
      expect(find.text('—'), findsNWidgets(2));
      expect(find.byKey(const ValueKey('studio-spec-filter')), findsOneWidget);
      expect(find.text('Memory'), findsOneWidget);
      expect(find.byKey(const ValueKey('trade-in-estimator')), findsOneWidget);
      expect(find.byKey(const ValueKey('pc-builder-card')), findsOneWidget);
      expect(find.text('Build your own'), findsOneWidget);
      expect(find.text('Nope'), findsNothing);
      expect(tester.takeException(), isNull);
      app.container.dispose();
    });
  }

  testWidgets('not set up: trade-in and Build your PC show nothing', (
    tester,
  ) async {
    final (app, _) = await open(tester, tech: false);
    expect(find.byKey(const ValueKey('trade-in-estimator')), findsNothing);
    expect(find.byKey(const ValueKey('pc-builder-card')), findsNothing);
    // Served elements still show.
    expect(find.byKey(const ValueKey('studio-spec-table')), findsOneWidget);
    app.container.dispose();
  });

  testWidgets('nothing served: the specs, compare and filter show nothing', (
    tester,
  ) async {
    final (app, _) = await open(
      tester,
      children: [
        {'id': 't', 'type': 'text', 'text': 'Welcome'},
        {'id': 'a', 'type': 'spec_table'},
        {
          'id': 'b',
          'type': 'compare',
          'tech_served': {
            'products': [
              techProduct(5, 'Only one', {'ram': '8 GB'}),
            ],
          },
        },
        {
          'id': 'c',
          'type': 'spec_filter',
          'tech': {'spec': 'ram'},
        },
      ],
    );
    expect(find.text('Welcome'), findsOneWidget);
    expect(find.byKey(const ValueKey('studio-spec-table')), findsNothing);
    expect(find.byKey(const ValueKey('studio-compare')), findsNothing);
    expect(find.byKey(const ValueKey('studio-spec-filter')), findsNothing);
    app.container.dispose();
  });

  testWidgets('a spec value opens the shop filtered by it', (tester) async {
    final (app, api) = await open(tester);
    await tester.tap(find.byKey(const ValueKey('spec-filter-16 GB')));
    await TestApp.settle(tester, 20);
    expect(location(app), Paths.specProducts('ram', '16 GB'));
    expect(find.byKey(const ValueKey('spec-products')), findsOneWidget);
    expect(api.lastProductQuery?.spec, 'ram');
    expect(api.lastProductQuery?.specValue, '16 GB');
    app.container.dispose();
  });

  testWidgets('the trade-in estimate follows the choices and the request is '
      'sent', (tester) async {
    final (app, api) = await open(tester);
    expect(find.text('Up to ${formatMoney(150000, 'SAR')}'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('trade-in-storage-256 GB')));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('trade-in-grade-good')));
    await tester.pump();
    expect(find.text('Up to ${formatMoney(153000, 'SAR')}'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('trade-in-start')));
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('trade-in-sheet')), findsOneWidget);
    // Nothing filled: both asked for, nothing sent.
    await tester.tap(find.byKey(const ValueKey('trade-in-send')));
    await tester.pump();
    expect(find.text('This field is required'), findsNWidgets(2));
    expect(api.count('sendTradeIn'), 0);
    await tester.enterText(find.byKey(const ValueKey('trade-in-name')), 'Sara');
    await tester.enterText(
      find.byKey(const ValueKey('trade-in-phone')),
      '+966 55 123 4567',
    );
    await tester.tap(find.byKey(const ValueKey('trade-in-send')));
    await TestApp.settle(tester, 20);
    expect(api.lastTradeIn, {
      'model': 'Orbit Nine',
      'storage': '256 GB',
      'grade': 'good',
      'name': 'Sara',
      'phone': '+966 55 123 4567',
      'note': '',
    });
    expect(find.byKey(const ValueKey('trade-in-sent')), findsOneWidget);
    expect(find.textContaining('SAR 1,350'), findsOneWidget);
    expect(tester.takeException(), isNull);
    app.container.dispose();
  });

  Map<String, dynamic> part(int id, String name, Map<String, String> s) => {
    ...productSummaryJson(id: id, name: name, price: priceJson('$id.00')),
    'spec_line': s.values.join(' · '),
    'specs': specs(s),
  };

  testWidgets('Build your PC: a part that does not fit says why; the build '
      'goes in the cart', (tester) async {
    final (app, api) = await open(tester);
    api.productsFor = (q) => switch (q.category) {
      1 => [
        part(100, 'Core N7', {'socket': 'AM5', 'watts': '120 W'}),
      ],
      2 => [
        part(200, 'Board B650', {'socket': 'AM5', 'form_factor': 'ATX'}),
        part(210, 'Board Z790', {'socket': 'LGA1700', 'form_factor': 'ATX'}),
      ],
      _ => [
        part(300, 'Mini case', {'form_factor': 'Mini-ITX'}),
      ],
    };
    await tester.tap(find.byKey(const ValueKey('pc-builder-start')));
    await TestApp.settle(tester, 20);
    expect(location(app), Paths.pcBuilder);
    expect(api.lastProductQuery?.withSpecs, isTrue);
    await tester.tap(find.byKey(const ValueKey('pc-part-100')));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('pc-next')));
    await TestApp.settle(tester, 20);
    // The LGA1700 board doesn't take the AM5 processor.
    expect(find.byKey(const ValueKey('pc-problem-210')), findsOneWidget);
    expect(find.byKey(const ValueKey('pc-problem-200')), findsNothing);
    await tester.tap(find.byKey(const ValueKey('pc-part-200')));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('pc-next')));
    await TestApp.settle(tester, 20);
    // The case is optional, and too small: skip it.
    expect(find.byKey(const ValueKey('pc-problem-300')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('pc-skip')));
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('pc-review')), findsOneWidget);
    expect(find.byKey(const ValueKey('pc-fits')), findsOneWidget);
    expect(find.text(formatMoney(30000, 'SAR')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('pc-add-all')));
    await TestApp.settle(tester, 20);
    expect(find.text('The build is in your cart'), findsOneWidget);
    expect(tester.takeException(), isNull);
    app.container.dispose();
  });

  testWidgets('the flows open trade-in and Build your PC, else the shop', (
    tester,
  ) async {
    for (final tech in [true, false]) {
      final (app, _) = await open(
        tester,
        tech: tech,
        children: [
          for (final flow in ['trade_in', 'pc_builder'])
            {
              'id': 'b-$flow',
              'type': 'button',
              'text': flow,
              'action': {'type': 'screen', 'screen': 'search', 'flow': flow},
            },
        ],
      );
      await tester.tap(find.text('trade_in'));
      await TestApp.settle(tester, 20);
      expect(location(app), tech ? Paths.tradeIn : startsWith(Paths.shop));
      app.container.read(appRouterProvider).go(Paths.home);
      await TestApp.settle(tester, 20);
      await tester.tap(find.text('pc_builder'));
      await TestApp.settle(tester, 20);
      expect(location(app), tech ? Paths.pcBuilder : startsWith(Paths.shop));
      app.container.dispose();
    }
  });

  Map<String, dynamic> phone() => {
    ...productSummaryJson(id: 5, name: 'Veyra X3', price: priceJson('4899.00')),
    'description_html': '<p>A phone.</p>',
    'short_description_html': null,
    'images': <Object>[],
    'sku': 'MB-1',
    'max_quantity': null,
    'attributes': <Object>[],
    'variations': <Object>[],
    'categories': <Object>[],
    'related': <Object>[],
    'specs': [
      for (final (i, v) in ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].indexed)
        {'key': null, 'label': 'Spec $i', 'value': 'Value $v'},
    ],
    'accessories': [
      productSummaryJson(id: 71, name: 'Buds Pro', price: priceJson('799.00')),
    ],
    'external_url': null,
    'permalink': 'https://nova.example/product/5',
  };

  testWidgets('a phone: installments soon, its specs, compare and the '
      'accessories', (tester) async {
    final (app, api) = await open(tester, product: phone());
    api.productsById[6] = {
      ...phone(),
      'id': 6,
      'name': 'Orbit Nine',
      'specs': [
        {'key': null, 'label': 'Spec 0', 'value': 'Other'},
      ],
    };
    app.container.read(appRouterProvider).push(Paths.product(5));
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('installments-soon')), findsOneWidget);
    expect(find.text('Installments coming soon'), findsOneWidget);
    // Six specs, then all of them.
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('product-specs-all')),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Value f'), findsOneWidget);
    expect(find.text('Value g'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('product-specs-all')));
    await tester.pump();
    expect(find.text('Value h'), findsOneWidget);
    // The accessories with it.
    expect(find.byKey(const ValueKey('accessory-71')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('accessory-71')));
    await tester.pump();
    expect(find.text('Add 2 items to the cart'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('accessories-add')));
    await TestApp.settle(tester, 20);
    expect(app.container.read(cartProvider).length, 2);
    // Compare: this one, then another, then the screen.
    app.container.read(compareListProvider.notifier).toggle(6);
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('product-compare-toggle')),
      -300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byKey(const ValueKey('product-compare-toggle')));
    await tester.pump();
    expect(app.container.read(compareListProvider), [6, 5]);
    await tester.tap(find.byKey(const ValueKey('product-compare-open')));
    await TestApp.settle(tester, 20);
    expect(location(app), Paths.compare);
    expect(find.byKey(const ValueKey('compare-table')), findsOneWidget);
    expect(find.text('Other'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('compare-remove-6')));
    await TestApp.settle(tester, 20);
    expect(
      find.text('Add two or three products to compare them side by side.'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
    app.container.dispose();
  });

  testWidgets('a shop without the tech parts: no installments tag', (
    tester,
  ) async {
    final (app, _) = await open(tester, tech: false, product: phone());
    app.container.read(appRouterProvider).push(Paths.product(5));
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('installments-soon')), findsNothing);
    app.container.dispose();
  });
}
