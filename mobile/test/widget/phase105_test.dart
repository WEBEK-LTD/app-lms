import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_module.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/modules/delivery/data/delivery_providers.dart';
import 'package:yallapp/modules/food/data/food_providers.dart';
import 'package:yallapp/modules/food/food_routes.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

FakeApi foodApi({List<String> roles = const [], String courierApp = 'same'}) {
  final api = FakeApi(
    config: {
      ...configJson(lms: null),
      'food': foodConfigJson(courierApp: courierApp),
    },
  );
  api.me = {...userJson(), 'roles': roles};
  return api;
}

TestApp foodApp(
  FakeApi api, {
  bool signedIn = true,
  AppRole role = AppRole.customer,
}) => TestApp(
  api: api,
  appType: AppType.food,
  signedIn: signedIn,
  guest: !signedIn,
  build: (b) => b.copyWith(role: role),
);

void usePhone(WidgetTester tester) {
  final view = tester.view
    ..physicalSize = const Size(390, 844) * 2
    ..devicePixelRatio = 2;
  addTearDown(view.reset);
}

Future<void> go(TestApp app, WidgetTester tester, String location) async {
  app.container.read(appRouterProvider).go(location);
  await TestApp.settle(tester);
}

Future<void> push(TestApp app, WidgetTester tester, String location) async {
  app.container.read(appRouterProvider).push(location);
  await TestApp.settle(tester);
}

Future<void> tapKey(WidgetTester tester, String key) async {
  final target = find.byKey(ValueKey(key));
  await tester.ensureVisible(target);
  await TestApp.settle(tester);
  await tester.tap(target);
  await TestApp.settle(tester);
}

/// Scrolls the list with this key until the finder shows.
Future<void> scrollTo(WidgetTester tester, Finder target, String list) async {
  await tester.scrollUntilVisible(
    target,
    200,
    scrollable: find
        .descendant(
          of: find.byKey(ValueKey(list)),
          matching: find.byType(Scrollable),
        )
        .first,
  );
  await TestApp.settle(tester);
}

List<String?> tabPaths(TestApp app) =>
    app.container.read(shellTabsProvider).map((t) => t.path).toList();

void main() {
  group('105.1 Restaurant tab', () {
    ShellTab tab(String path) =>
        ShellTab(location: path, label: (_) => path, icon: Icons.circle);

    test('is added before Account, for restaurants\' staff only', () {
      final tabs = [
        tab(Paths.restaurants),
        tab(Paths.foodOrders),
        tab(Paths.account),
      ];
      expect(withRestaurantTab(tabs, true).map((t) => t.path), [
        Paths.restaurants,
        Paths.foodOrders,
        Paths.restaurantDesk,
        Paths.account,
      ]);
      expect(withRestaurantTab(tabs, false).map((t) => t.path), [
        Paths.restaurants,
        Paths.foodOrders,
        Paths.account,
      ]);
      expect(withRestaurantTab(tabs, null), same(tabs));
      expect(restaurantTab.path, Paths.restaurantDesk);
    });

    test('notifications open the food order and the restaurant\'s order', () {
      expect(
        pushTargetLocation({'type': 'food_order_update', 'food_order_id': '7'}),
        Paths.foodOrder(7),
      );
      expect(
        pushTargetLocation({'type': 'restaurant_order', 'food_order_id': 7}),
        Paths.restaurantOrder(7),
      );
      expect(
        pushTargetLocation({'type': 'restaurant_order'}),
        Paths.restaurantDesk,
      );
    });
  });

  testWidgets('105.1 customers see the restaurants, open ones first, and '
      'no Restaurant or Courier tab', (tester) async {
    usePhone(tester);
    final api = foodApi();
    final app = foodApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.restaurants);

    expect(find.text('Abou Tarek'), findsOneWidget);
    expect(find.text('Night Grill'), findsOneWidget);
    expect(find.text('Closed'), findsNothing);
    expect(find.textContaining('Opens'), findsOneWidget);
    expect(find.text('Egyptian'), findsWidgets);
    expect(tabPaths(app), [Paths.restaurants, Paths.foodOrders, Paths.account]);

    // A cuisine filters the list.
    await tapKey(tester, 'cuisine-grill');
    expect(api.restaurantQueries.last.cuisine, 'grill');
  });

  testWidgets('105.1 a customer adds a dish with its required size and '
      'orders it in cash', (tester) async {
    usePhone(tester);
    final api = foodApi();
    final app = foodApp(api);
    await app.pump(tester);
    await push(app, tester, Paths.restaurant(1));

    expect(find.text('Koshari'), findsOneWidget);
    expect(find.textContaining('Sold out'), findsOneWidget);
    await tapKey(tester, 'dish-2');
    expect(find.byKey(const ValueKey('dish-sheet')), findsOneWidget);
    // The size is required: the button says so until one is chosen.
    expect(find.text('Choose: Size'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('choice-5')));
    await TestApp.settle(tester);
    await tapKey(tester, 'dish-add');
    expect(app.container.read(foodCartProvider).count, 1);
    expect(find.text('View cart (1)'), findsOneWidget);

    await tapKey(tester, 'food-view-cart');
    expect(find.text('Your order'), findsOneWidget);
    await tester.enterText(
      find.byKey(const ValueKey('dropoff-address')),
      'Cairo Tower, Zamalek',
    );
    await tester.pump(const Duration(milliseconds: 700));
    await TestApp.settle(tester);
    expect(api.foodQuotes, isNotEmpty);
    await scrollTo(tester, find.text('E£162.00'), 'food-cart');
    expect(find.text('E£162.00'), findsOneWidget);

    await tapKey(tester, 'food-place');
    final placed = api.foodOrderRequests.single;
    expect(placed.restaurantId, 1);
    expect(placed.lines.single.choices, [5]);
    expect(placed.payment, PaymentMethod.cash);
    expect(placed.dropoff.address, 'Cairo Tower, Zamalek');
    // The cart is emptied and the new order opens.
    expect(app.container.read(foodCartProvider).isEmpty, isTrue);
    expect(find.text('Order F-1002'), findsOneWidget);
    expect(find.text('Sent to the restaurant'), findsWidgets);
  });

  testWidgets('105.1 a dish of another restaurant asks before emptying the '
      'cart', (tester) async {
    usePhone(tester);
    final api = foodApi()..restaurantMenus[2] = restaurantJson(id: 2);
    final app = foodApp(api);
    await app.pump(tester);
    app.container
        .read(foodCartProvider.notifier)
        .add(
          1,
          'Abou Tarek',
          const FoodCartLine(dishId: 2, name: 'Koshari', quantity: 1),
        );
    await push(app, tester, Paths.restaurant(2));
    await tapKey(tester, 'dish-2');
    expect(find.text('Start a new cart?'), findsOneWidget);
    await tester.tap(find.text('Keep it'));
    await TestApp.settle(tester);
    expect(app.container.read(foodCartProvider).restaurantId, 1);
  });

  testWidgets('105.1 a customer follows an order\'s stages and rates it', (
    tester,
  ) async {
    usePhone(tester);
    final api = foodApi()
      ..foodOrders = [foodOrderJson(status: 'delivered', withCourier: true)];
    final app = foodApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.foodOrders);
    expect(find.text('Abou Tarek'), findsOneWidget);

    await push(app, tester, Paths.foodOrder(1));
    expect(find.text('Order F-1001'), findsOneWidget);
    expect(find.text('Delivered'), findsWidgets);
    expect(find.text('Karim Hassan'), findsOneWidget);
    // No cancelling once delivered.
    expect(find.byKey(const ValueKey('food-order-cancel')), findsNothing);
    await scrollTo(tester, find.text('Being prepared'), 'food-order-view');
    expect(find.text('Sent to the restaurant'), findsOneWidget);
    expect(find.text('Being prepared'), findsOneWidget);

    await tapKey(tester, 'rate-restaurant-5');
    await tapKey(tester, 'rate-courier-4');
    await tapKey(tester, 'rate-send');
    expect(api.foodRatings.single, (id: 1, restaurant: 5, courier: 4));
    expect(find.byKey(const ValueKey('food-order-rated')), findsOneWidget);
  });

  testWidgets('105.1 a customer cancels an order the restaurant hasn\'t '
      'accepted', (tester) async {
    usePhone(tester);
    final api = foodApi()..foodOrders = [foodOrderJson(status: 'placed')];
    final app = foodApp(api);
    await app.pump(tester);
    await push(app, tester, Paths.foodOrder(1));
    expect(find.text('Waiting for the restaurant to accept it.'), findsOne);
    await tapKey(tester, 'food-order-cancel');
    expect(find.text('Cancel this order?'), findsOneWidget);
    await tester.tap(find.text('Cancel it'));
    await TestApp.settle(tester);
    expect(api.count('cancelMyFoodOrder'), 1);
    expect(find.text('Cancelled'), findsWidgets);
  });

  testWidgets('105.1 a restaurant\'s staff see the Restaurant tab and accept '
      'a new order', (tester) async {
    usePhone(tester);
    final api = foodApi(roles: ['restaurant']);
    final app = foodApp(api);
    await app.pump(tester);
    expect(tabPaths(app), [
      Paths.restaurants,
      Paths.foodOrders,
      Paths.restaurantDesk,
      Paths.account,
    ]);

    await go(app, tester, Paths.restaurantDesk);
    expect(find.text('Taking orders'), findsOneWidget);
    expect(find.text('Today: 4 orders · E£520.00'), findsOneWidget);
    expect(find.text('F-1001'), findsOneWidget);

    await tapKey(tester, 'desk-order-1');
    expect(find.text('Order F-1001'), findsOneWidget);
    expect(find.text('Ring twice'), findsOneWidget);
    await tapKey(tester, 'desk-accept');
    await tapKey(tester, 'prep-20');
    expect(api.restaurantMoves.single, (id: 1, move: 'accept', minutes: 20));
    expect(find.text('Accepted. The customer was told.'), findsOneWidget);
    expect(find.text('Being prepared'), findsWidgets);
  });

  testWidgets('105.1 the restaurant pauses new orders and takes them again', (
    tester,
  ) async {
    usePhone(tester);
    final api = foodApi(roles: ['restaurant']);
    final app = foodApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.restaurantDesk);
    await tapKey(tester, 'desk-pause');
    await tapKey(tester, 'pause-30');
    expect(api.busyMinutes, [30]);
    expect(find.textContaining('Paused until'), findsOneWidget);
    await tapKey(tester, 'desk-open-again');
    expect(api.busyMinutes, [30, 0]);
    expect(find.text('Taking orders'), findsOneWidget);
  });

  testWidgets('105.1 someone who isn\'t a restaurant\'s staff opening its '
      'screen', (tester) async {
    usePhone(tester);
    final api = foodApi();
    final app = foodApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.restaurantDesk);
    expect(find.text('For our restaurants'), findsOneWidget);
    expect(api.count('listRestaurantOrders'), 0);
  });

  testWidgets('105.1 couriers of a food delivery company get the Courier tab', (
    tester,
  ) async {
    usePhone(tester);
    final api = foodApi(roles: ['courier']);
    final app = foodApp(api);
    await app.pump(tester);
    expect(app.container.read(isCourierProvider), isTrue);
    expect(tabPaths(app), [
      Paths.restaurants,
      Paths.foodOrders,
      Paths.courier,
      Paths.account,
    ]);
  });

  testWidgets('105.1 Account opens My orders, and the restaurant mode for '
      'its staff', (tester) async {
    usePhone(tester);
    final app = foodApp(foodApi(roles: ['restaurant']));
    await app.pump(tester);
    await go(app, tester, Paths.account);
    expect(find.byKey(const ValueKey('account-food-orders')), findsOneWidget);
    await tapKey(tester, 'account-restaurant');
    expect(find.text('Taking orders'), findsOneWidget);
  });

  group('105.1.6 A food company\'s courier app', () {
    testWidgets('opens on the courier\'s screen, with Courier and Account '
        'only', (tester) async {
      usePhone(tester);
      final api = foodApi(roles: ['courier'], courierApp: 'bundle');
      final app = foodApp(api, role: AppRole.courier);
      await app.pump(tester);
      expect(find.text('On duty'), findsOneWidget);
      expect(tabPaths(app), [Paths.courier, Paths.account]);
      expect(api.count('listRestaurants'), 0);
    });

    testWidgets('leaves the Courier tab out of the customers\' app', (
      tester,
    ) async {
      usePhone(tester);
      final api = foodApi(roles: ['courier'], courierApp: 'bundle');
      final app = foodApp(api);
      await app.pump(tester);
      expect(tabPaths(app), isNot(contains(Paths.courier)));
      expect(app.container.read(isCourierProvider), isFalse);
    });

    testWidgets('keeps the Courier tab in the app when couriers work in it', (
      tester,
    ) async {
      usePhone(tester);
      final app = foodApp(foodApi(roles: ['courier']));
      await app.pump(tester);
      expect(tabPaths(app), contains(Paths.courier));
    });
  });
}
