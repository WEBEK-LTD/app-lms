import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../../core/widgets/app_nav_bar.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'screens/appointments_screen.dart';
import 'screens/bookings_home_screen.dart';
import 'screens/service_screen.dart';
import 'screens/services_screen.dart';

const bookingsDestinations = [
  NavDestination(AppIcons.home, 'Home'),
  NavDestination(AppIcons.book, 'Book'),
  NavDestination(AppIcons.appointments, 'Appointments'),
  NavDestination(AppIcons.account, 'Account'),
];

/// The Bookings module's routes: sign-in, the four tabs and the pushed
/// screens.
List<RouteBase> bookingsRoutes() => [
  signInRoute(),
  StatefulShellRoute.indexedStack(
    pageBuilder: (context, state, shell) => appPage(
      state,
      MainShell(shell: shell, destinations: bookingsDestinations),
    ),
    branches: [
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Paths.home,
            pageBuilder: (context, state) =>
                appPage(state, const BookingsHomeScreen()),
          ),
        ],
      ),
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Paths.services,
            pageBuilder: (context, state) => appPage(
              state,
              ServicesScreen(
                key: const ValueKey('services'),
                initialCategory: int.tryParse(
                  state.uri.queryParameters['category'] ?? '',
                ),
              ),
            ),
          ),
        ],
      ),
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Paths.appointments,
            pageBuilder: (context, state) => appPage(
              state,
              AppointmentsScreen(
                key: const ValueKey('appointments'),
                initialTab: state.uri.queryParameters['tab'] == 'past' ? 1 : 0,
              ),
            ),
          ),
        ],
      ),
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Paths.account,
            pageBuilder: (context, state) =>
                appPage(state, const ProfileScreen()),
            routes: accountSubRoutes(),
          ),
        ],
      ),
    ],
  ),
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
  ...sharedPageRoutes(),
];
