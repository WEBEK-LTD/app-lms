import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models/models.dart';
import '../../core/l10n/l10n.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../delivery/screens/courier_job_screen.dart';
import '../delivery/screens/courier_screen.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'screens/food_cart_screen.dart';
import 'screens/food_order_screen.dart';
import 'screens/food_orders_screen.dart';
import 'screens/restaurant_desk_screen.dart';
import 'screens/restaurant_order_screen.dart';
import 'screens/restaurant_screen.dart';
import 'screens/restaurants_screen.dart';

/// 105.1 The Food delivery module (hosted API): the restaurants, my orders
/// and the account as tabs, a restaurant with its menu, the cart and an
/// order's page; for a restaurant's staff a Restaurant tab (added for them
/// only, see `withRestaurantTab`) with its orders; for the company's
/// couriers the Courier tab and a job's page of Phase 104.
final foodModule = AppModule(
  tabPaths: {
    Paths.restaurants,
    Paths.foodOrders,
    Paths.restaurantDesk,
    Paths.courier,
    Paths.account,
  },
  screens: _screens,
  defaultTabs: (_) => _defaultTabs,
  screenLocation: (screen, config) => switch (screen) {
    BuiltInScreen.restaurants => Paths.restaurants,
    BuiltInScreen.foodOrders || BuiltInScreen.orders => Paths.foodOrders,
    BuiltInScreen.restaurant => Paths.restaurantDesk,
    BuiltInScreen.courier => Paths.courier,
    BuiltInScreen.account => Paths.account,
    BuiltInScreen.settings => Paths.settings,
    BuiltInScreen.notifications => Paths.notifications,
    BuiltInScreen.courses ||
    BuiltInScreen.myCourses ||
    BuiltInScreen.search ||
    BuiltInScreen.favorites ||
    BuiltInScreen.messages ||
    BuiltInScreen.cart ||
    BuiltInScreen.services ||
    BuiltInScreen.appointments ||
    BuiltInScreen.articles ||
    BuiltInScreen.bookmarks ||
    BuiltInScreen.classes ||
    BuiltInScreen.memberships ||
    BuiltInScreen.events ||
    BuiltInScreen.tickets ||
    BuiltInScreen.campaigns ||
    BuiltInScreen.myDonations ||
    BuiltInScreen.sendParcel ||
    BuiltInScreen.shipments ||
    BuiltInScreen.ride ||
    BuiltInScreen.myRides ||
    BuiltInScreen.driver ||
    BuiltInScreen.teachers ||
    BuiltInScreen.teacher ||
    BuiltInScreen.school ||
    BuiltInScreen.classroom => null,
  },
  routes: _pushedRoutes,
);

final _defaultTabs = [
  ShellTab(
    icon: AppIcons.menu,
    label: (c) => c.l10n.tabRestaurants,
    location: Paths.restaurants,
  ),
  ShellTab(
    icon: AppIcons.orders,
    label: (c) => c.l10n.tabFoodOrders,
    location: Paths.foodOrders,
  ),
  ShellTab(
    icon: AppIcons.account,
    label: (c) => c.l10n.tabAccount,
    location: Paths.account,
  ),
];

/// 105.1 The Restaurant tab, for the restaurants' staff only.
final restaurantTab = ShellTab(
  icon: AppIcons.restaurant,
  label: (c) => c.l10n.tabRestaurantDesk,
  location: Paths.restaurantDesk,
);

List<TabScreen> _screens() => [
  TabScreen(Paths.restaurants, (state) => const RestaurantsScreen()),
  TabScreen(Paths.foodOrders, (state) => const FoodOrdersScreen()),
  TabScreen(Paths.restaurantDesk, (state) => const RestaurantDeskScreen()),
  TabScreen(Paths.courier, (state) => const CourierScreen()),
  TabScreen(
    Paths.account,
    (state) => const ProfileScreen(),
    routes: accountSubRoutes(),
  ),
];

GoRoute _byId(String path, Widget Function(int id) build) => GoRoute(
  path: path,
  pageBuilder: (context, state) {
    final id = int.tryParse(state.pathParameters['id'] ?? '');
    return appPage(
      state,
      id == null || id < 1 ? const NotFoundScreen() : build(id),
    );
  },
);

List<RouteBase> _pushedRoutes() => [
  _byId('/restaurant/:id', (id) => RestaurantScreen(restaurantId: id)),
  _byId('/food-order/:id', (id) => FoodOrderScreen(orderId: id)),
  _byId('/restaurant-order/:id', (id) => RestaurantOrderScreen(orderId: id)),
  _byId('/courier-job/:id', (id) => CourierJobScreen(jobId: id)),
  GoRoute(
    path: Paths.foodCart,
    pageBuilder: (context, state) => appPage(state, const FoodCartScreen()),
  ),
];
