import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models/models.dart';
import '../../core/l10n/l10n.dart';
import '../../core/l10n/vertical_wording.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'screens/appointments_screen.dart';
import 'screens/bookings_home_screen.dart';
import 'screens/classes_screen.dart';
import 'screens/membership_screen.dart';
import 'screens/service_screen.dart';
import 'screens/services_screen.dart';

/// The Bookings module: home, services, appointments and the account as
/// tabs, and the service and appointment pages. 27 A gym's or studio's
/// classes and membership are tabs too when it has a timetable.
final bookingsModule = AppModule(
  tabPaths: {
    Paths.home,
    Paths.services,
    Paths.appointments,
    Paths.classes,
    Paths.memberships,
    Paths.account,
  },
  screens: _screens,
  defaultTabs: (config) =>
      config?.bookings?.classes == null ? _defaultTabs : _classTabs,
  screenLocation: (screen, config) => switch (screen) {
    BuiltInScreen.courses ||
    BuiltInScreen.search ||
    BuiltInScreen.services => Paths.services,
    BuiltInScreen.appointments => Paths.appointments,
    BuiltInScreen.classes => Paths.classes,
    BuiltInScreen.memberships => Paths.memberships,
    BuiltInScreen.account => Paths.account,
    BuiltInScreen.settings => Paths.settings,
    BuiltInScreen.notifications => Paths.notifications,
    BuiltInScreen.orders =>
      (config?.features.orders ?? false) ? Paths.orders : null,
    BuiltInScreen.myCourses ||
    BuiltInScreen.favorites ||
    BuiltInScreen.messages ||
    BuiltInScreen.cart ||
    BuiltInScreen.articles ||
    BuiltInScreen.bookmarks ||
    BuiltInScreen.events ||
    BuiltInScreen.tickets => null,
    BuiltInScreen.sendParcel ||
    BuiltInScreen.shipments ||
    BuiltInScreen.courier ||
    BuiltInScreen.campaigns ||
    BuiltInScreen.myDonations => null,
  },
  routes: _pushedRoutes,
);

final _defaultTabs = [
  ShellTab(
    icon: AppIcons.home,
    label: (c) => c.l10n.tabHome,
    location: Paths.home,
  ),
  ShellTab(
    icon: AppIcons.book,
    label: (c) => c.l10n.tabBook,
    location: Paths.services,
  ),
  ShellTab(
    icon: AppIcons.appointments,
    // 21 "Visits" in a clinic's app.
    label: (c) => c.words.appointments,
    location: Paths.appointments,
  ),
  ShellTab(
    icon: AppIcons.account,
    label: (c) => c.l10n.tabAccount,
    location: Paths.account,
  ),
];

/// 27 A gym's or studio's: Classes and Membership instead of Book.
final _classTabs = [
  _defaultTabs.first,
  ShellTab(
    icon: AppIcons.fitness,
    label: (c) => c.words.classes,
    location: Paths.classes,
  ),
  ShellTab(
    icon: AppIcons.membership,
    label: (c) => c.l10n.membershipTitle,
    location: Paths.memberships,
  ),
  ..._defaultTabs.skip(2),
];

List<TabScreen> _screens() => [
  TabScreen(Paths.home, (state) => const BookingsHomeScreen()),
  TabScreen(
    Paths.services,
    (state) => ServicesScreen(
      key: const ValueKey('services'),
      initialCategory: int.tryParse(
        state.uri.queryParameters['category'] ?? '',
      ),
    ),
  ),
  TabScreen(
    Paths.appointments,
    (state) => AppointmentsScreen(
      key: const ValueKey('appointments'),
      initialTab: state.uri.queryParameters['tab'] == 'past' ? 1 : 0,
    ),
  ),
  TabScreen(
    Paths.classes,
    (state) => const ClassesScreen(key: ValueKey('classes')),
  ),
  TabScreen(Paths.memberships, (state) => const MembershipScreen()),
  TabScreen(
    Paths.account,
    (state) => const ProfileScreen(),
    routes: accountSubRoutes(),
  ),
];

List<RouteBase> _pushedRoutes() => [
  GoRoute(
    path: '/service/:id',
    pageBuilder: (context, state) {
      final id = intParam(state, 'id');
      return appPage(
        state,
        id == null ? const NotFoundScreen() : ServiceScreen(serviceId: id),
      );
    },
  ),
  GoRoute(
    path: '/appointment/:id',
    pageBuilder: (context, state) {
      final id = intParam(state, 'id');
      return appPage(
        state,
        id == null
            ? const NotFoundScreen()
            : AppointmentScreen(appointmentId: id),
      );
    },
  ),
];
