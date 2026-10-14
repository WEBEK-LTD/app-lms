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

/// 26 Restaurants and cafés: the menu, a dish's options, pickup or delivery
/// with a time, and following an order.

FakeApi restaurantApi({bool open = true, bool scheduled = true}) =>
    FakeApi(config: restaurantConfigJson(scheduled: scheduled))
      ..product = dishJson()
      ..cartQuote = dishCartQuoteJson()
      ..orderTimes = orderTimesJson(open: open);

String dishCart() => jsonEncode([
  const CartItem(
    productId: 31,
    quantity: 1,
    name: 'Defne Burger',
    price: '₺650.00',
    options: ['double', 'cheddar'],
    optionNames: ['Double', 'Cheddar'],
  ).toJson(),
]);

void tallPhone(WidgetTester tester) {
  tester.view
    ..physicalSize = const Size(780, 2800)
    ..devicePixelRatio = 2;
  addTearDown(tester.view.reset);
}

void main() {
  for (final (name, size) in [
    ('small phone', const Size(320, 568)),
    ('phone', const Size(390, 844)),
  ]) {
    testWidgets('the menu, a dish, the cart and an order fit a $name', (
      tester,
    ) async {
      tester.view
        ..physicalSize = size * 2
        ..devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      final api = restaurantApi()..order = restaurantOrderJson();
      final app = TestApp(
        signedIn: true,
        appType: AppType.store,
        api: api,
        preferences: {CartController.storageKey: dishCart()},
      );
      await app.pump(tester);
      final router = app.container.read(appRouterProvider);
      for (final location in [
        '/shop',
        '/product/31',
        '/cart',
        '/account/orders',
        '/account/orders/7',
      ]) {
        router.go(location);
        await TestApp.settle(tester);
        expect(tester.takeException(), isNull, reason: location);
      }
    });
  }

  testWidgets('the Menu tab shows the categories as tabs and every dish', (
    tester,
  ) async {
    final api = restaurantApi();
    final app = TestApp(signedIn: true, appType: AppType.store, api: api);
    await app.pump(tester);
    await tester.tap(find.bySemanticsLabel('Menu').last);
    await TestApp.settle(tester);

    expect(find.byKey(const ValueKey('menu-tabs')), findsOneWidget);
    // The category tabs, and the same names as the sections' headings.
    expect(find.text('Flowers'), findsNWidgets(2));
    expect(find.text('Gifts'), findsNWidgets(2));
    expect(find.text('Sunflower Basket'), findsWidgets);
    expect(find.bySemanticsLabel('Search the menu'), findsOneWidget);

    await tester.tap(find.text('Gifts').first);
    await TestApp.settle(tester);
    expect(tester.takeException(), isNull);
    expect(api.lastProductQuery?.perPage, 50);
  });

  testWidgets('the menu says when a closed kitchen opens', (tester) async {
    final api = restaurantApi(open: false);
    final app = TestApp(signedIn: true, appType: AppType.store, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).go('/shop');
    await TestApp.settle(tester);
    expect(find.textContaining('Closed now — opens at'), findsOneWidget);
    expect(find.text('You can order for later.'), findsOneWidget);
  });

  testWidgets('the option sheet asks for the required group, adds up the '
      'price and puts the options in the cart', (tester) async {
    tallPhone(tester);
    final api = restaurantApi();
    final app = TestApp(signedIn: true, appType: AppType.store, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/product/31');
    await TestApp.settle(tester);
    expect(find.text('Size · Required'), findsOneWidget);
    expect(find.text('Extras · Optional'), findsOneWidget);

    await tester.tap(find.text('Add to cart'));
    await TestApp.settle(tester);
    final add = find.byKey(const ValueKey('options-add'));
    expect(
      find.descendant(of: add, matching: find.text('Choose: Size')),
      findsOneWidget,
    );
    expect(find.text('Choose 1'), findsOneWidget);
    expect(find.text('Choose up to 2'), findsOneWidget);

    await tester.tap(find.text('Double'));
    await TestApp.settle(tester);
    expect(find.text('Add to cart · ₺610.00'), findsOneWidget);
    await tester.tap(find.text('Cheddar'));
    await tester.tap(find.text('Caramelised onion'));
    await TestApp.settle(tester);
    // At most two extras: the third can't be chosen.
    await tester.tap(find.text('Pickles'));
    await TestApp.settle(tester);
    expect(find.text('Add to cart · ₺680.00'), findsOneWidget);
    // Two of them.
    await tester.tap(find.bySemanticsLabel('More').last);
    await TestApp.settle(tester);
    expect(find.text('Add to cart · ₺1,360.00'), findsOneWidget);

    await tester.tap(add);
    await TestApp.settle(tester);
    final cart = app.container.read(cartProvider);
    expect(cart.single.options, ['double', 'cheddar', 'onion']);
    expect(cart.single.optionNames, ['Double', 'Cheddar', 'Caramelised onion']);
    expect(cart.single.quantity, 2);
    expect(cart.single.price, '₺680.00');
    expect(cart.single.toInput().toJson()['options'], [
      'double',
      'cheddar',
      'onion',
    ]);
  });

  testWidgets('the cart orders a delivery as soon as possible, with the '
      'address and district', (tester) async {
    tallPhone(tester);
    final api = restaurantApi();
    final app = TestApp(
      signedIn: true,
      appType: AppType.store,
      api: api,
      preferences: {CartController.storageKey: dishCart()},
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).go('/cart');
    await TestApp.settle(tester);

    expect(find.text('Double, Cheddar'), findsOneWidget);
    expect(find.text('Pick up at Moda Caddesi 41, Kadıköy'), findsOneWidget);
    expect(find.text('Ready in about 20 min'), findsOneWidget);

    await tester.tap(find.text('Delivery'));
    await TestApp.settle(tester);
    expect(find.text('Delivery fee'), findsOneWidget);
    expect(find.text('Enter your delivery address.'), findsOneWidget);
    await tester.tap(find.text('Checkout'));
    await TestApp.settle(tester);
    expect(api.count('createStoreCheckoutLink'), 0);

    await tester.enterText(
      find.byKey(const ValueKey('delivery-address')),
      'Moda Cd. 12, flat 3',
    );
    await TestApp.settle(tester);
    expect(find.text('Choose: District'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('delivery-district')));
    await TestApp.settle(tester);
    await tester.tap(find.text('Caferağa').last);
    await TestApp.settle(tester);
    await tester.tap(find.text('Checkout'));
    await TestApp.settle(tester);

    expect(api.count('createStoreCheckoutLink'), 1);
    expect(api.lastFulfilment?.fulfilment, FulfilmentType.delivery);
    expect(api.lastFulfilment?.address?.toJson(), {
      'address': 'Moda Cd. 12, flat 3',
      'district': 'Caferağa',
      'notes': null,
    });
    expect(api.lastFulfilment?.scheduledFor, isNull);
    expect(api.lastCartLines?.single.options, ['double', 'cheddar']);
  });

  testWidgets('a closed kitchen takes an order for later only', (tester) async {
    tallPhone(tester);
    final api = restaurantApi(open: false);
    final app = TestApp(
      signedIn: true,
      appType: AppType.store,
      api: api,
      preferences: {CartController.storageKey: dishCart()},
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).go('/cart');
    await TestApp.settle(tester);

    expect(find.textContaining('Closed now — opens at'), findsOneWidget);
    expect(find.text('Choose a time'), findsOneWidget);
    await tester.tap(find.text('Checkout'));
    await TestApp.settle(tester);
    expect(api.count('createStoreCheckoutLink'), 0);

    await tester.tap(find.text('Schedule for later'));
    await TestApp.settle(tester);
    await tester.tap(find.byType(ListTile).first);
    await TestApp.settle(tester);
    await tester.tap(find.text('Checkout'));
    await TestApp.settle(tester);
    expect(api.lastFulfilment?.fulfilment, FulfilmentType.pickup);
    expect(api.lastFulfilment?.scheduledFor, DateTime.utc(2030, 1, 2, 5, 30));
  });

  testWidgets('a closed kitchen without orders for later blocks checkout', (
    tester,
  ) async {
    tallPhone(tester);
    final api = restaurantApi(open: false, scheduled: false);
    final app = TestApp(
      signedIn: true,
      appType: AppType.store,
      api: api,
      preferences: {CartController.storageKey: dishCart()},
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).go('/cart');
    await TestApp.settle(tester);
    expect(find.text("Please order when we're open."), findsOneWidget);
    await tester.tap(find.text('Checkout'));
    await TestApp.settle(tester);
    expect(api.count('createStoreCheckoutLink'), 0);
  });

  testWidgets('an order shows its steps and opens from the orders', (
    tester,
  ) async {
    final api = restaurantApi()..order = restaurantOrderJson();
    final app = TestApp(signedIn: true, appType: AppType.store, api: api);
    await app.pump(tester);
    final router = app.container.read(appRouterProvider)
      ..push('/account/orders/7');
    await TestApp.settle(tester);

    expect(find.text('Order #1007'), findsOneWidget);
    expect(find.text('Delivery, as soon as possible'), findsOneWidget);
    for (final step in [
      'Received',
      'Preparing',
      'Ready',
      'Out for delivery',
      'Completed',
    ]) {
      expect(find.text(step), findsOneWidget, reason: step);
    }
    expect(find.text('Double, Cheddar'), findsOneWidget);
    expect(find.text('₺680.00'), findsOneWidget);
    expect(find.text("We'll send you a notification at each step."), findsOne);

    // A pickup order has no delivery step; a cancelled one says so.
    router.pop();
    api.order = restaurantOrderJson(status: 'ready', type: 'pickup');
    router.push('/account/orders/8');
    await TestApp.settle(tester);
    expect(find.text('Ready for pickup'), findsOneWidget);
    expect(find.text('Out for delivery'), findsNothing);
    router.pop();
    api.order = restaurantOrderJson(status: 'cancelled');
    router.push('/account/orders/9');
    await TestApp.settle(tester);
    expect(find.textContaining('This order was cancelled.'), findsOneWidget);
  });

  test('the models read a dish, the kitchen and an order', () {
    final dish = ProductDetail.fromJson(dishJson());
    final groups = dish.optionGroups;
    expect(groups.map((g) => (g.name, g.required, g.single)), [
      ('Size', true, true),
      ('Extras', false, false),
    ]);
    expect(optionsComplete(groups, {}), isFalse);
    expect(optionsComplete(groups, {'single'}), isTrue);
    expect(
      optionsComplete(groups, {'single', 'cheddar', 'onion', 'pickles'}),
      isFalse,
    );
    expect(optionsDeltaCents(groups, {'double', 'cheddar'}), 19000);
    expect(missingGroups(groups, {'cheddar'}).single.name, 'Size');

    final config = AppConfig.fromJson(restaurantConfigJson());
    final f = config.store!.fulfilment!;
    expect(f.types, [FulfilmentType.pickup, FulfilmentType.delivery]);
    expect(f.hours, hasLength(7));
    expect(f.deliveryAreas, ['Moda', 'Caferağa']);
    expect(config.store!.guestCheckout, isFalse);
    // Other shops have none.
    expect(
      AppConfig.fromJson(configJson(store: true)).store!.fulfilment,
      isNull,
    );

    final order = Order.fromJson(restaurantOrderJson());
    expect(order.fulfilmentStatus, FulfilmentStatus.preparing);
    expect(order.fulfilment?.address?.district, 'Moda');
    expect(order.items.single.options, ['Double', 'Cheddar']);
    expect(order.trackable, isTrue);
    expect(Order.fromJson(orderJson()).trackable, isFalse);
    expect(
      Order.fromJson({
        ...restaurantOrderJson(),
        'fulfilment_status': 'out_for_delivery',
      }).fulfilmentStatus,
      FulfilmentStatus.outForDelivery,
    );
    expect(
      fulfilmentSteps(FulfilmentType.pickup),
      isNot(contains(FulfilmentStatus.outForDelivery)),
    );
    final times = OrderTimes.fromJson(orderTimesJson(open: false));
    expect(times.openNow, isFalse);
    expect(times.slots.first, DateTime.utc(2030, 1, 2, 5, 30));
  });
}
