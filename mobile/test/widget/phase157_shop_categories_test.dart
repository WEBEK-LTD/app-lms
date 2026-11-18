import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/modules/shared/pages/page_actions.dart';
import 'package:yallapp/modules/shared/pages/resume_reload.dart';
import 'package:yallapp/modules/store/data/store_providers.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 157 Leqaa's rings, chips, tiles and ticker show the shop's own
/// categories (Kech Flora's, added in the dashboard), each opening the shop
/// filtered to it; the shop's own chips follow the dashboard while the app
/// stays open. The pages are what the platform serves for an app made from
/// the template with the owner's categories
/// (`platform/web/tests/unit/phase157-app-categories.test.ts` writes
/// `test/support/phase157_leqaa_pages.json`).
void main() {
  final served = jsonDecode(
    File('test/support/phase157_leqaa_pages.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  final categories = [
    for (final c in (served['categories'] as Map)['items'] as List)
      c as Map<String, dynamic>,
  ];
  int idOf(String name) =>
      categories.firstWhere((c) => c['name'] == name)['id'] as int;

  List<Map<String, dynamic>> nodesOf(Map<String, dynamic> node) => [
    node,
    for (final c in (node['children'] as List?) ?? const [])
      ...nodesOf(c as Map<String, dynamic>),
  ];
  Map<String, dynamic> first(String slug, String type) => nodesOf(
    ((served[slug] as Map)['studio'] as Map)['body'] as Map<String, dynamic>,
  ).firstWhere((n) => n['type'] == type);

  /// The page as served, with only its sections that hold the shop's
  /// categories (the rings' card, the collections, the ticker): the
  /// template's other covers are drawn in other tests, with the app's fonts.
  Map<String, dynamic> onlyLists(String slug) {
    final page = served[slug] as Map<String, dynamic>;
    final studio = page['studio'] as Map<String, dynamic>;
    final body = studio['body'] as Map<String, dynamic>;
    bool lists(Map<String, dynamic> n) => nodesOf(n)
        .any((x) => const {'stories', 'bento', 'marquee'}.contains(x['type']));
    return {
      ...page,
      'studio': {
        ...studio,
        'body': {
          ...body,
          'children': [
            for (final c in body['children'] as List)
              if (lists(c as Map<String, dynamic>)) c,
          ],
        },
      },
    };
  }

  String location(TestApp app) => app.container
      .read(appRouterProvider)
      .routerDelegate
      .currentConfiguration
      .uri
      .toString();

  ({
    TestApp app,
    _ShopApi api,
    StreamController<void> resumes,
    void Function(Duration) wait,
  })
  start(WidgetTester tester) {
    // A phone, tall enough for the home's first sections.
    tester.view
      ..physicalSize = const Size(390, 2400) * 3
      ..devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final resumes = StreamController<void>.broadcast();
    addTearDown(resumes.close);
    var now = DateTime.utc(2026, 11, 18, 9);
    final api = _ShopApi(categories)
      ..navigation = served['navigation'] as Map<String, dynamic>
      ..pages = {'home': onlyLists('home'), 'shop': onlyLists('shop')};
    final app = TestApp(
      appType: AppType.store,
      api: api,
      signedIn: true,
      overrides: [
        appResumedProvider.overrideWithValue(resumes.stream),
        resumeClockProvider.overrideWithValue(() => now),
      ],
    );
    return (
      app: app,
      api: api,
      resumes: resumes,
      wait: (Duration d) => now = now.add(d),
    );
  }

  testWidgets("the home's occasion rings, collections and ticker are the "
      "shop's categories, not the template's", (tester) async {
    final t = start(tester);
    await t.app.pump(tester);
    await TestApp.settle(tester, 20);

    final stories = first('home', 'stories');
    final rings = stories['slides'] as List;
    expect(rings.map((s) => (s as Map)['heading']), [
      'Luxury boxes',
      'Wedding',
    ]);
    for (var i = 0; i < rings.length; i++) {
      expect(
        find.byKey(ValueKey('studio-story-${stories['id']}-$i')),
        findsOneWidget,
      );
    }
    expect(find.text('Luxury boxes'), findsWidgets);
    expect(find.text('Wedding'), findsWidgets);
    // None of the template's occasions or collections, in any language.
    for (final word in [
      'Love',
      'Birthday',
      'حب',
      'عيد ميلاد',
      'مواساة',
      'مولود جديد',
      'تهنئة',
      'Signature bouquets',
      'الباقات المميّزة',
      'Roses',
    ]) {
      expect(find.text(word), findsNothing, reason: word);
    }
  });

  testWidgets('a collection tile opens the shop filtered to its category', (
    tester,
  ) async {
    final t = start(tester);
    await t.app.pump(tester);
    await TestApp.settle(tester, 20);

    final bento = first('home', 'bento');
    final wedding = find.byKey(ValueKey('premium-tile-${bento['id']}-1'));
    await tester.ensureVisible(wedding);
    await TestApp.settle(tester, 4);
    await tester.tap(wedding);
    await TestApp.settle(tester, 20);

    expect(location(t.app), '/shop?category=${idOf('Wedding')}');
    expect(t.api.lastProductQuery?.category, idOf('Wedding'));
  });

  testWidgets("the shop's chips follow the dashboard while the app stays "
      'open', (tester) async {
    final t = start(tester);
    await t.app.pump(tester);
    await TestApp.settle(tester, 10);
    t.app.container
        .read(appRouterProvider)
        .go('/shop?category=${idOf('Wedding')}');
    await TestApp.settle(tester, 20);
    final asked = t.api.categoryCalls;
    // The shop's own chips asked for them.
    expect(asked, greaterThan(0));
    List<String> chips() => [
      for (final c
          in t.app.container.read(productCategoriesProvider).value ?? const [])
        c.name,
    ];
    expect(chips(), ['Luxury boxes', 'Wedding']);

    // The owner adds a category in the dashboard; the customer comes back.
    t.api.categories = [
      ...categories,
      productCategoryJson(id: 99, name: 'Graduation'),
    ];
    t.wait(const Duration(minutes: 5));
    t.resumes.add(null);
    await TestApp.settle(tester, 20);

    expect(t.api.categoryCalls, greaterThan(asked));
    expect(chips(), ['Luxury boxes', 'Wedding', 'Graduation']);
  });

  test('an action with a category opens the shop filtered to it; an older '
      "server's, or another app's, as before", () {
    final action = PageAction.tryParse({
      'type': 'screen',
      'screen': 'search',
      'category_id': '12',
    })!;
    expect(action.categoryId, 12);
    expect(
      PageAction.tryParse({
        'type': 'screen',
        'screen': 'search',
        'category_id': 7,
      })!.categoryId,
      7,
    );
    for (final bad in ['x', '0', '-3', null]) {
      expect(
        PageAction.tryParse({
          'type': 'screen',
          'screen': 'search',
          'category_id': bad,
        })!.categoryId,
        isNull,
        reason: '$bad',
      );
    }
    expect(
      actionCategoryLocation(action, AppType.store, null),
      '/shop?category=12',
    );
    // A restaurant's shop is its menu; an academy has no shop.
    expect(
      actionCategoryLocation(
        action,
        AppType.store,
        AppConfig.fromJson(restaurantConfigJson()),
      ),
      isNull,
    );
    expect(actionCategoryLocation(action, AppType.lms, null), isNull);
    expect(
      actionCategoryLocation(
        PageAction.tryParse({'type': 'screen', 'screen': 'search'})!,
        AppType.store,
        null,
      ),
      isNull,
    );
  });
}

/// The shop's categories as the platform lists them, changed by the test.
class _ShopApi extends FakeApi {
  _ShopApi(this.categories)
    : super(config: configJson(lms: null, store: true, orders: true));

  List<Map<String, dynamic>> categories;
  int categoryCalls = 0;

  @override
  Future<List<ProductCategory>> listProductCategories() async {
    categoryCalls++;
    return [for (final c in categories) ProductCategory.fromJson(c)];
  }
}
