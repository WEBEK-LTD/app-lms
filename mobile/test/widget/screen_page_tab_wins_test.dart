import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/modules/shared/pages/screen_page.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// Two of the app's screens at one address (a shop's Search is its All
/// products with the search box open): the page the tab opens there is the
/// one shown, not another page drawn around the other screen. A flower
/// shop's Bouquets tab showed a page "Courses" (drawn around All products,
/// the API's `courses`) instead of the tab's own page edited in Studio.
void main() {
  Map<String, dynamic> page(String slug, String title, String screen) => {
    ...appPageJson(slug: slug, title: title, blocks: []),
    'studio': {
      'header': {'type': 'title', 'title': title},
      'body': {'id': 'root', 'type': 'column', 'children': []},
      'screen': screen,
    },
  };

  Map<String, dynamic> summary(String slug, String title, String? screen) => {
    'slug': slug,
    'title': title,
    'updated_at': '2026-11-14T12:00:00Z',
    'screen': ?screen,
  };

  Map<String, dynamic> navigation(List<Map<String, dynamic>> tabs) => {
    ...navigationJson(tabs: tabs),
    'pages': [
      summary('home', 'Home', null),
      summary('shop', 'Bouquets', 'search'),
      summary('courses', 'Courses', 'courses'),
    ],
  };

  final shopTabs = [
    navTabJson('home', 'Home', 'home', {'type': 'page', 'page_slug': 'home'}),
    // As the servers send a tab to a page drawn around a screen.
    navTabJson('shop', 'Bouquets', 'storefront', {
      'type': 'screen',
      'screen': 'search',
    }),
    navTabJson('account', 'Account', 'person', {
      'type': 'screen',
      'screen': 'account',
    }),
  ];

  Future<TestApp> start(
    WidgetTester tester,
    List<Map<String, dynamic>> tabs,
  ) async {
    final app = TestApp(
      appType: AppType.store,
      api: FakeApi()
        ..navigation = navigation(tabs)
        ..pages = {
          'home': appPageJson(blocks: []),
          'shop': page('shop', 'Bouquets', 'search'),
          'courses': page('courses', 'Courses', 'courses'),
        },
      signedIn: true,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    return app;
  }

  testWidgets("the shop's tab shows its own page, not the one around All "
      'products at the same address', (tester) async {
    final app = await start(tester, shopTabs);
    expect(app.container.read(screenPagesProvider)['/shop'], 'shop');
    app.container.read(appRouterProvider).go('/shop');
    await TestApp.settle(tester, 20);
    expect(find.text('Bouquets'), findsWidgets);
    expect(find.text('Courses'), findsNothing);
  });

  testWidgets('without a tab there, the page of the screen exactly there '
      'wins, as before', (tester) async {
    final app = await start(tester, [
      shopTabs.first,
      navTabJson('cart', 'Cart', 'shopping_cart', {
        'type': 'screen',
        'screen': 'cart',
      }),
      shopTabs.last,
    ]);
    expect(app.container.read(screenPagesProvider)['/shop'], 'courses');
  });
}
