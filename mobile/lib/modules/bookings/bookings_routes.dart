import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models/models.dart';
import '../../core/l10n/l10n.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'screens/appointments_screen.dart';
import 'screens/bookings_home_screen.dart';
import 'screens/service_screen.dart';
import 'screens/services_screen.dart';

/// The Bookings module: home, services, appointments and the account as
/// tabs, and the service and appointment pages.
final bookingsModule = AppModule(
  tabPaths: {Paths.home, Paths.services, Paths.appointments, Paths.account},
  screens: _screens,
  defaultTabs: (_) => _defaultTabs,
  screenLocation: (screen, config) => switch (screen) {
    BuiltInScreen.courses ||
    BuiltInScreen.search ||
    BuiltInScreen.services => Paths.services,
    BuiltInScreen.appointments => Paths.appointments,
    BuiltInScreen.account => Paths.account,
    BuiltInScreen.settings => Paths.settings,
    BuiltInScreen.notifications => Paths.notifications,
    BuiltInScreen.orders =>
      (config?.features.orders ?? false) ? Paths.orders : null,
    BuiltInScreen.myCourses ||
    BuiltInScreen.favorites ||
    BuiltInScreen.messages ||
    BuiltInScreen.cart => null,
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
    label: (c) => c.l10n.tabAppointments,
    location: Paths.appointments,
  ),
  ShellTab(
    icon: AppIcons.account,
    label: (c) => c.l10n.tabAccount,
    location: Paths.account,
  ),
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
