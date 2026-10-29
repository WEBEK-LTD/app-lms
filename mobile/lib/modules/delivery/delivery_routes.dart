import 'package:go_router/go_router.dart';

import '../../core/api/models/models.dart';
import '../../core/l10n/l10n.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'screens/courier_job_screen.dart';
import 'screens/courier_screen.dart';
import 'screens/send_parcel_screen.dart';
import 'screens/shipment_screen.dart';
import 'screens/shipments_screen.dart';

/// 104 The Delivery & couriers module (hosted API): sending a parcel, my
/// shipments and the account as tabs, a shipment's page; for the company's
/// couriers a Courier tab (added for them only, see `withCourierTab`) and
/// a job's page.
final deliveryModule = AppModule(
  tabPaths: {Paths.send, Paths.shipments, Paths.courier, Paths.account},
  screens: _screens,
  defaultTabs: (_) => _defaultTabs,
  screenLocation: (screen, config) => switch (screen) {
    BuiltInScreen.sendParcel => Paths.send,
    BuiltInScreen.shipments || BuiltInScreen.orders => Paths.shipments,
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
    BuiltInScreen.restaurants ||
    BuiltInScreen.ride ||
    BuiltInScreen.myRides ||
    BuiltInScreen.driver ||
    BuiltInScreen.teachers ||
    BuiltInScreen.teacher ||
    BuiltInScreen.foodOrders ||
    BuiltInScreen.restaurant => null,
  },
  routes: _pushedRoutes,
);

final _defaultTabs = [
  ShellTab(
    icon: AppIcons.ship,
    label: (c) => c.l10n.tabSend,
    location: Paths.send,
  ),
  ShellTab(
    icon: AppIcons.parcel,
    label: (c) => c.l10n.tabShipments,
    location: Paths.shipments,
  ),
  _accountTab,
];

final _accountTab = ShellTab(
  icon: AppIcons.account,
  label: (c) => c.l10n.tabAccount,
  location: Paths.account,
);

/// 104.6 The courier app's tabs: the courier's screen and the account.
final courierAppTabs = [courierTab, _accountTab];

/// 104 The Courier tab, for the company's couriers only.
final courierTab = ShellTab(
  icon: AppIcons.courier,
  label: (c) => c.l10n.tabCourier,
  location: Paths.courier,
);

List<TabScreen> _screens() => [
  TabScreen(
    Paths.send,
    (state) => SendParcelScreen(
      serviceId: int.tryParse(state.uri.queryParameters['service'] ?? ''),
    ),
  ),
  TabScreen(Paths.shipments, (state) => const ShipmentsScreen()),
  TabScreen(Paths.courier, (state) => const CourierScreen()),
  TabScreen(
    Paths.account,
    (state) => const ProfileScreen(),
    routes: accountSubRoutes(),
  ),
];

List<RouteBase> _pushedRoutes() => [
  GoRoute(
    path: '/shipment/:id',
    pageBuilder: (context, state) {
      final id = int.tryParse(state.pathParameters['id'] ?? '');
      return appPage(
        state,
        id == null || id < 1
            ? const NotFoundScreen()
            : ShipmentScreen(shipmentId: id),
      );
    },
  ),
  GoRoute(
    path: '/courier-job/:id',
    pageBuilder: (context, state) {
      final id = int.tryParse(state.pathParameters['id'] ?? '');
      return appPage(
        state,
        id == null || id < 1
            ? const NotFoundScreen()
            : CourierJobScreen(jobId: id),
      );
    },
  ),
];
