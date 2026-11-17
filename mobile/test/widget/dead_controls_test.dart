import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/l10n/app_localizations.dart';
import 'package:yallapp/modules/market/widgets/market_sections.dart';
import 'package:yallapp/core/widgets/buttons.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';
import 'package:yallapp/modules/store/screens/cart_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/market_fixtures.dart';
import '../support/test_app.dart';
import 'content_blocks_test.dart' show contentApp;
import 'store_test.dart' show cartPrefs, storeApi;

/// The app audit: a control that looks tappable opens something, or isn't
/// shown as one to tap.

Map<String, dynamic> _button(
  String id,
  String label,
  Map<String, dynamic>? a,
) => {
  'id': id,
  'type': 'button',
  'title': null,
  'label': label,
  'icon': null,
  'style': 'filled',
  'action': a,
};

void main() {
  testWidgets('a page button that opens nothing here is not shown', (
    tester,
  ) async {
    final api = FakeApi()
      ..navigation = navigationJson()
      ..pages = {
        'home': appPageJson(
          blocks: [
            _button('b1', 'Browse courses', {
              'type': 'screen',
              'screen': 'courses',
            }),
            // An academy has no restaurants.
            _button('b2', 'Order food', {
              'type': 'screen',
              'screen': 'restaurants',
            }),
            // A page that isn't published.
            _button('b3', 'Old offer', {'type': 'page', 'page_slug': 'gone'}),
            _button('b4', 'No address', {'type': 'url', 'url': ''}),
            _button('b5', 'Unknown', {'type': 'hologram'}),
            {
              'id': 'i1',
              'type': 'items',
              'title': 'Popular',
              'source': 'courses',
              'layout': 'list',
              'see_all': {'type': 'screen', 'screen': 'restaurants'},
              'items': [itemJson()],
            },
          ],
        ),
      };
    final app = contentApp(api: api);
    await app.pump(tester);
    expect(find.text('Browse courses'), findsOneWidget);
    for (final label in ['Order food', 'Old offer', 'No address', 'Unknown']) {
      expect(find.text(label), findsNothing, reason: label);
    }
    // The list stays, without a "See all" that would do nothing.
    expect(find.text('Popular'), findsOneWidget);
    expect(find.text('See all'), findsNothing);

    await tester.tap(find.text('Browse courses'));
    await TestApp.settle(tester);
    expect(
      app.container
          .read(appRouterProvider)
          .routerDelegate
          .currentConfiguration
          .uri
          .path,
      '/courses',
    );
  });

  testWidgets('the coupon\'s Apply waits for a code', (tester) async {
    final api = storeApi(store: storeConfigJson(deliveryDate: false));
    final app = TestApp(
      signedIn: true,
      appType: AppType.store,
      api: api,
      preferences: {CartController.storageKey: cartPrefs()},
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).go('/cart');
    await TestApp.settle(tester);
    await tester.tap(find.byKey(const Key('cart-coupon-open')));
    await TestApp.settle(tester);
    TextButton apply() =>
        tester.widget<TextButton>(find.byKey(const Key('cart-coupon-apply')));
    expect(apply().onPressed, isNull);
    await tester.enterText(find.byKey(const Key('cart-coupon-field')), '  ');
    await tester.pump();
    expect(apply().onPressed, isNull);
    await tester.enterText(
      find.byKey(const Key('cart-coupon-field')),
      'SPRING10',
    );
    await tester.pump();
    expect(apply().onPressed, isNotNull);
  });

  testWidgets('a product\'s cart button opens the cart on top when the shop '
      'has no Cart tab, with its way back', (tester) async {
    final api = storeApi()
      ..product = productDetailJson()
      ..pages = {'home': appPageJson(blocks: [])}
      ..navigation = navigationJson(
        tabs: [
          navTabJson('t1', 'Home', 'home', {
            'type': 'page',
            'page_slug': 'home',
          }),
          navTabJson('t2', 'Shop', 'storefront', {
            'type': 'screen',
            'screen': 'courses',
          }),
          navTabJson('t3', 'Me', 'person', {
            'type': 'screen',
            'screen': 'account',
          }),
        ],
      );
    final app = TestApp(signedIn: true, appType: AppType.store, api: api);
    await app.pump(tester);
    final router = app.container.read(appRouterProvider);
    router.push('/product/20');
    await TestApp.settle(tester);
    await tester.tap(find.bySemanticsLabel('Cart'));
    await TestApp.settle(tester);
    expect(find.byType(CartScreen), findsOneWidget);
    // Pushed over the product, not left alone without a way back.
    expect(router.canPop(), isTrue);
    expect(find.byType(AppBackButton), findsWidgets);
  });

  testWidgets('a marketplace list\'s See all opens every place of its kind', (
    tester,
  ) async {
    tester.view
      ..physicalSize = const Size(360, 1400) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
    final node = StudioNode.tryParse({
      'id': 'fast',
      'type': 'market',
      'title': 'Fastest near you',
      'market': {
        'section': 'vendors',
        'style': 'spotlight',
        'kind': 'restaurant',
        'sort': 'fastest',
      },
    })!;
    final router = GoRouter(
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => Scaffold(
            body: SingleChildScrollView(
              child: MarketSectionView(node: node, market: node.market!),
            ),
          ),
        ),
        GoRoute(
          path: '/market-list',
          builder: (context, state) =>
              Scaffold(body: Text('list ${state.uri.queryParameters}')),
        ),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      ProviderScope(
        overrides: marketSampleOverrides,
        child: MaterialApp.router(
          routerConfig: router,
          theme: buildAppTheme(
            primary: const Color(0xFF0E7C66),
            brightness: Brightness.light,
            template: AppTemplate.bold,
            fontFamily: 'Plus Jakarta Sans',
          ),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('See all'));
    await tester.pumpAndSettle();
    expect(
      find.text('list {kind: restaurant, title: Fastest near you}'),
      findsOneWidget,
    );
  });
}
