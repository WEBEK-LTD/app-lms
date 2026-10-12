import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

FakeApi storeApi({Map<String, dynamic>? store}) => FakeApi(
  config: {
    ...configJson(lms: null, orders: true),
    'store': store ?? storeConfigJson(),
  },
);

String cartPrefs({int quantity = 2}) => jsonEncode([
  const CartItem(
    productId: 21,
    quantity: 1,
    name: 'Sunflower Basket',
    price: '₺200.00',
    maxQuantity: 5,
  ).withQuantity(quantity).toJson(),
]);

/// A phone tall enough to show a whole product page without scrolling.
void tallPhone(WidgetTester tester) {
  tester.view
    ..physicalSize = const Size(780, 2800)
    ..devicePixelRatio = 2;
  addTearDown(tester.view.reset);
}

void main() {
  const sizes = {
    'small phone': Size(320, 568),
    'phone': Size(390, 844),
    'tablet': Size(768, 1024),
  };

  final cases = [
    for (final size in sizes.entries)
      for (final template in AppTemplate.values)
        for (final dark in [false, true]) (size, template, dark, 1.0),
    for (final template in AppTemplate.values)
      (sizes.entries.elementAt(1), template, false, 1.5),
  ];

  // Every Store screen on each size, template and theme: any overflow or
  // build error fails.
  for (final (size, template, dark, textScale) in cases) {
    final name =
        'store screens: ${size.key}, ${template.name}, '
        '${dark ? 'dark' : 'light'}'
        '${textScale == 1 ? '' : ', text x$textScale'}';
    testWidgets(name, (tester) async {
      final view = tester.view
        ..physicalSize = size.value * 2
        ..devicePixelRatio = 2;
      tester.platformDispatcher.textScaleFactorTestValue = textScale;
      addTearDown(view.reset);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

      final api = storeApi()..product = variableProductJson();
      final app = TestApp(
        signedIn: true,
        template: template,
        appType: AppType.store,
        api: api,
        preferences: {
          'settings.theme_mode': dark ? 'dark' : 'light',
          CartController.storageKey: cartPrefs(),
        },
      );
      void clean(String step) =>
          expect(tester.takeException(), isNull, reason: step);

      await app.pump(tester);
      clean('home');
      expect(find.text('Featured'), findsOneWidget);
      expect(find.text('Sunflower Basket'), findsWidgets);

      await tester.tap(find.bySemanticsLabel('Shop').last);
      await TestApp.settle(tester);
      clean('shop');
      expect(find.text('On sale'), findsOneWidget);
      expect(find.text('Chocolate Box'), findsWidgets);

      await tester.tap(find.bySemanticsLabel(RegExp('^Cart')).last);
      await TestApp.settle(tester);
      clean('cart');
      expect(find.text('₺400.00'), findsWidgets);
      expect(find.text('Delivery date'), findsOneWidget);

      await tester.tap(find.bySemanticsLabel('Account').last);
      await TestApp.settle(tester);
      clean('account');
      expect(find.text('Shopping'), findsOneWidget);
      expect(find.text('Learning'), findsNothing);

      final router = app.container.read(appRouterProvider);
      for (final (location, marker) in [
        ('/product/20', 'Red Roses Bouquet'),
        ('/product/20/reviews', 'Reviews'),
        ('/account/orders', 'Order #1042'),
        ('/account/settings', 'Appearance'),
      ]) {
        router.push(location);
        await TestApp.settle(tester);
        clean(location);
        expect(find.text(marker), findsWidgets, reason: location);
        router.pop();
        await TestApp.settle(tester);
      }
    });
  }

  testWidgets('variable products need every option before Add to cart', (
    tester,
  ) async {
    tallPhone(tester);
    final api = storeApi()..product = variableProductJson();
    final app = TestApp(signedIn: true, appType: AppType.store, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/product/20');
    await TestApp.settle(tester);

    expect(find.text('Choose size'), findsOneWidget);
    expect(find.text('Add to cart'), findsNothing);

    await tester.tap(find.text('Large'));
    await TestApp.settle(tester);
    expect(find.text('₺600.00'), findsOneWidget);
    await tester.tap(find.text('Add to cart'));
    await TestApp.settle(tester);

    final cart = app.container.read(cartProvider);
    expect(cart, hasLength(1));
    expect(cart.single.variationId, 203);
    expect(cart.single.name, 'Red Roses Bouquet – Large');
    expect(cart.single.maxQuantity, 2);
    expect(find.text('Added to cart'), findsOneWidget);
  });

  testWidgets('iOS never offers digital products', (tester) async {
    final api = storeApi()..product = productDetailJson(digital: true);
    final app = TestApp(
      appType: AppType.store,
      guest: true,
      platform: DevicePlatform.ios,
      api: api,
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/product/21');
    await TestApp.settle(tester);
    expect(find.text('Add to cart'), findsNothing);
    expect(find.text("This item isn't sold in the app."), findsOneWidget);
  });

  testWidgets('a required delivery date holds the checkout', (tester) async {
    final app = TestApp(
      signedIn: true,
      appType: AppType.store,
      api: storeApi(),
      preferences: {CartController.storageKey: cartPrefs()},
    );
    await app.pump(tester);
    await tester.tap(find.bySemanticsLabel(RegExp('^Cart')).last);
    await TestApp.settle(tester);
    expect(find.text('Choose a delivery date to continue.'), findsOneWidget);
    await tester.tap(find.text('Checkout'));
    await TestApp.settle(tester);
    expect(app.api.count('createStoreCheckoutLink'), 0);
  });

  testWidgets('checkout opens in the app and empties the cart once ordered', (
    tester,
  ) async {
    final api = storeApi(store: storeConfigJson(deliveryDate: false));
    final app = TestApp(
      signedIn: true,
      appType: AppType.store,
      api: api,
      preferences: {CartController.storageKey: cartPrefs()},
    );
    await app.pump(tester);
    await tester.tap(find.bySemanticsLabel(RegExp('^Cart')).last);
    await TestApp.settle(tester);

    await tester.enterText(find.byType(TextField), 'Happy birthday!');
    await tester.tap(find.text('Checkout'));
    await TestApp.settle(tester);

    expect(api.lastStoreCheckout?.giftMessage, 'Happy birthday!');
    expect(api.lastStoreCheckout?.deliveryDate, isNull);
    expect(api.lastCartLines?.single.quantity, 2);
    final page = app.webViews.requests.last;
    expect(page.url.toString(), 'https://your-shop.com/?yallapp_link=abc');

    page.onUrlChange!(
      Uri.parse('https://your-shop.com/checkout/order-received/55/?key=x'),
    );
    await TestApp.settle(tester);
    await tester.tap(find.bySemanticsLabel('Done'));
    await TestApp.settle(tester);

    expect(app.container.read(cartProvider), isEmpty);
    expect(find.text('Thank you! Your order has been placed.'), findsOneWidget);
  });

  testWidgets('guests sign in first when the shop needs an account', (
    tester,
  ) async {
    final api = storeApi(store: storeConfigJson(guestCheckout: false));
    final app = TestApp(
      guest: true,
      appType: AppType.store,
      api: api,
      preferences: {CartController.storageKey: cartPrefs()},
    );
    await app.pump(tester);
    final router = app.container.read(appRouterProvider)..go('/cart');
    await TestApp.settle(tester);
    await tester.tap(find.text('Delivery date'));
    await TestApp.settle(tester);
    // Choose the first open day the picker offers.
    await tester.tap(find.text('OK'));
    await TestApp.settle(tester);
    await tester.tap(find.text('Checkout'));
    await TestApp.settle(tester);
    expect(api.count('createStoreCheckoutLink'), 0);
    expect(
      router.routerDelegate.currentConfiguration.last.matchedLocation,
      '/sign-in',
    );
  });

  testWidgets('a line the shop cannot sell blocks the checkout', (
    tester,
  ) async {
    final api = storeApi(store: storeConfigJson(deliveryDate: false))
      ..cartQuote = cartQuoteJson(problem: true);
    final app = TestApp(
      signedIn: true,
      appType: AppType.store,
      api: api,
      preferences: {CartController.storageKey: cartPrefs()},
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).go('/cart');
    await TestApp.settle(tester);
    expect(find.text('Only 1 left in stock.'), findsOneWidget);
    expect(
      find.text('Change or remove the items marked above to continue.'),
      findsOneWidget,
    );
  });
}
