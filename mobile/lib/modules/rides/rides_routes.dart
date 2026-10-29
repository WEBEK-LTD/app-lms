import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models/models.dart';
import '../../core/l10n/l10n.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'screens/driver_ride_screen.dart';
import 'screens/driver_screen.dart';
import 'screens/my_rides_screen.dart';
import 'screens/ride_follow_screen.dart';
import 'screens/ride_screen.dart';

/// 105.2 The Ride hailing module (hosted API): asking for a ride, my rides
/// and the account as tabs, and a ride's page; for the company's drivers a
/// Driver tab (added for them only, see `withDriverTab`) and a ride's page
/// as they work it. The drivers' app (`role` driver) has the Driver tab
/// and the account only.
final ridesModule = AppModule(
  tabPaths: {Paths.ride, Paths.myRides, Paths.driver, Paths.account},
  screens: _screens,
  defaultTabs: (_) => _defaultTabs,
  screenLocation: (screen, config) => switch (screen) {
    BuiltInScreen.ride => Paths.ride,
    BuiltInScreen.myRides || BuiltInScreen.orders => Paths.myRides,
    BuiltInScreen.driver => Paths.driver,
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
    BuiltInScreen.courier ||
    BuiltInScreen.restaurants ||
    BuiltInScreen.foodOrders ||
    BuiltInScreen.restaurant ||
    BuiltInScreen.teachers ||
    BuiltInScreen.teacher => null,
  },
  routes: _pushedRoutes,
);

final _accountTab = ShellTab(
  icon: AppIcons.account,
  label: (c) => c.l10n.tabAccount,
  location: Paths.account,
);

final _defaultTabs = [
  ShellTab(
    icon: AppIcons.ride,
    label: (c) => c.l10n.tabRide,
    location: Paths.ride,
  ),
  ShellTab(
    icon: AppIcons.receipt,
    label: (c) => c.l10n.tabMyRides,
    location: Paths.myRides,
  ),
  _accountTab,
];

/// The Driver tab, for the company's drivers only.
final driverTab = ShellTab(
  icon: AppIcons.car,
  label: (c) => c.l10n.tabDriver,
  location: Paths.driver,
);

/// The drivers' app: the driver's screen and the account, nothing else.
final driverAppTabs = [driverTab, _accountTab];

List<TabScreen> _screens() => [
  TabScreen(Paths.ride, (state) => const RideScreen()),
  TabScreen(Paths.myRides, (state) => const MyRidesScreen()),
  TabScreen(Paths.driver, (state) => const DriverScreen()),
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
  _byId('/ride/:id', (id) => RideFollowScreen(rideId: id)),
  _byId('/driver-ride/:id', (id) => DriverRideScreen(rideId: id)),
];
