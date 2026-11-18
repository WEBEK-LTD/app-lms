import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/shared/pages/page_actions.dart';
import 'package:yallapp/modules/store/screens/product_screen.dart';
import 'package:yallapp/modules/store/screens/shop_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'store_test.dart' show storeApi;

/// 152 Our bouquet's chips and button open the product the owner links: a
/// Studio element linked to one of the shop's products (Leqaa's bouquet
/// sizes and "Choose this bouquet") opens that product; one the owner
/// hasn't linked opens the shop, and so does one whose product the shop no
/// longer has (its page goes to the shop in its place). Light and dark.
void main() {
  Map<String, dynamic> product(String id) => {
    'type': 'item',
    'item': {'source': 'products', 'id': id},
  };
  const shop = {'type': 'screen', 'screen': 'search'};

  Map<String, dynamic> chip(String id, String word, Map<String, dynamic> a) => {
    'id': id,
    'type': 'column',
    'name': word,
    'width': 'fill',
    'padding': {'top': 12, 'end': 6, 'bottom': 12, 'start': 6},
    'action': a,
    'children': [
      {'id': '$id-icon', 'type': 'icon', 'icon': 'local_florist'},
      {'id': '$id-text', 'type': 'text', 'text': word},
    ],
  };

  Map<String, dynamic> bouquet() => {
    ...appPageJson(slug: 'bouquet', title: 'Our bouquet', blocks: []),
    'studio': {
      'header': {'type': 'title', 'title': 'Our bouquet'},
      'body': {
        'id': 'root',
        'type': 'column',
        'children': [
          {
            'id': 'sizes',
            'type': 'row',
            'gap': 10,
            'children': [
              // Linked to the roses.
              chip('classic', 'Classic', product('21')),
              // "A product" chosen, no product picked yet.
              chip('deluxe', 'Deluxe', product('')),
              // Linked to a product the shop has since deleted.
              chip('grand', 'Grand', product('99')),
            ],
          },
          // As the template has it: the shop.
          chip('petite', 'Petite', shop),
          {
            'id': 'choose',
            'type': 'button',
            'text': 'Choose this bouquet',
            'action': product('21'),
          },
        ],
      },
    },
  };

  FakeApi api() => storeApi()
    ..product = productDetailJson()
    ..missingProducts.add(99)
    ..navigation = navigationJson(
      tabs: [
        navTabJson('home', 'Home', 'home', {
          'type': 'page',
          'page_slug': 'bouquet',
        }),
        navTabJson('shop', 'Bouquets', 'storefront', shop),
        navTabJson('account', 'Account', 'person', {
          'type': 'screen',
          'screen': 'account',
        }),
      ],
    )
    ..pages = {'bouquet': bouquet()};

  Future<TestApp> open(WidgetTester tester, {bool dark = false}) async {
    final app = TestApp(
      appType: AppType.store,
      api: api(),
      signedIn: true,
      preferences: {'settings.theme_mode': dark ? 'dark' : 'light'},
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    expect(find.text('Choose this bouquet'), findsOneWidget);
    return app;
  }

  /// Where the app is: the screen on top, pushed or not.
  Uri where(TestApp app) => app.container.read(appRouterProvider).state.uri;

  for (final dark in [false, true]) {
    final mode = dark ? 'dark' : 'light';

    testWidgets(
      'a linked size and the linked button open the product ($mode)',
      (tester) async {
        final app = await open(tester, dark: dark);
        await tester.tap(find.text('Classic'));
        await TestApp.settle(tester, 20);
        expect(where(app).path, '/product/21');
        expect(find.byType(ProductScreen), findsOneWidget);
        expect(find.text('Sunflower Basket'), findsWidgets);
        expect(app.api.productsAsked, [21]);

        app.container.read(appRouterProvider).pop();
        await TestApp.settle(tester, 20);
        await tester.tap(find.text('Choose this bouquet'));
        await TestApp.settle(tester, 20);
        expect(where(app).path, '/product/21');
        expect(find.text('Sunflower Basket'), findsWidgets);
      },
    );

    testWidgets(
      'a size not linked opens the shop, as the template does ($mode)',
      (tester) async {
        final app = await open(tester, dark: dark);
        final home = where(app).toString();
        await tester.tap(find.text('Deluxe'));
        await TestApp.settle(tester, 20);
        expect(where(app).path, '/shop');
        expect(find.byType(ShopScreen), findsOneWidget);
        expect(app.api.productsAsked, isEmpty);

        app.container.read(appRouterProvider).go(home);
        await TestApp.settle(tester, 20);
        await tester.tap(find.text('Petite'));
        await TestApp.settle(tester, 20);
        expect(where(app).path, '/shop');
        expect(find.byType(ShopScreen), findsOneWidget);
      },
    );

    testWidgets('a size linked to a deleted product opens the shop in its '
        'place ($mode)', (tester) async {
      final app = await open(tester, dark: dark);
      await tester.tap(find.text('Grand'));
      await TestApp.settle(tester, 30);
      expect(app.api.productsAsked, [99]);
      expect(where(app).path, '/shop');
      expect(find.byType(ShopScreen), findsOneWidget);
      // No "not found" on the way, and nothing to go back to.
      expect(find.byType(ProductScreen), findsNothing);
      expect(app.container.read(appRouterProvider).canPop(), isFalse);
    });
  }

  testWidgets('the shop takes the place of the missing product when the shop '
      'is no tab', (tester) async {
    final fake = api()
      ..navigation = navigationJson(
        tabs: [
          navTabJson('home', 'Home', 'home', {
            'type': 'page',
            'page_slug': 'bouquet',
          }),
          navTabJson('account', 'Account', 'person', {
            'type': 'screen',
            'screen': 'account',
          }),
        ],
      );
    final app = TestApp(appType: AppType.store, api: fake, signedIn: true);
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    await tester.tap(find.text('Grand'));
    await TestApp.settle(tester, 30);
    expect(where(app).path, '/shop');
    expect(find.byType(ShopScreen), findsOneWidget);
    expect(find.byType(ProductScreen), findsNothing);
    // Back goes to the bouquet's page, not to the product that isn't there.
    app.container.read(appRouterProvider).pop();
    await TestApp.settle(tester, 20);
    expect(find.text('Choose this bouquet'), findsOneWidget);
  });

  testWidgets('a product page opened another way still says it is gone', (
    tester,
  ) async {
    final app = await open(tester);
    app.container.read(appRouterProvider).push('/product/99');
    await TestApp.settle(tester, 20);
    expect(find.byType(ProductScreen), findsOneWidget);
    expect(find.byType(ShopScreen), findsNothing);
  });

  test(
    'a store follows every product link; other apps only those they open',
    () {
      PageAction item(String source, String id) => PageAction.tryParse({
        'type': 'item',
        'item': {'source': source, 'id': id},
      })!;
      expect(canFollowAction(item('products', '21'), AppType.store), isTrue);
      expect(canFollowAction(item('products', ''), AppType.store), isTrue);
      expect(
        canFollowAction(PageAction.tryParse({'type': 'item'})!, AppType.store),
        isTrue,
      );
      expect(canFollowAction(item('products', '21'), AppType.lms), isFalse);
      expect(canFollowAction(item('courses', ''), AppType.lms), isFalse);
      expect(canFollowAction(item('courses', '4'), AppType.lms), isTrue);
    },
  );

  test(
    'the linked product page knows to send a missing product to the shop',
    () {
      expect(Uri.parse(Paths.linkedProduct(21)).path, '/product/21');
      expect(Uri.parse(Paths.linkedProduct(21)).queryParameters, {
        'or': 'shop',
      });
      expect(const ProductScreen(productId: 1).orShop, isFalse);
    },
  );
}
