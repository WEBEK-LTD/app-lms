import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models/models.dart';
import '../../core/l10n/l10n.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'screens/event_screen.dart';
import 'screens/events_screen.dart';
import 'screens/ticket_screen.dart';
import 'screens/tickets_screen.dart';

/// The Events & tickets module (28, hosted API): events (a list and a
/// calendar), My tickets (kept on the phone, with QR codes) and the
/// account as tabs, and the event and ticket pages. Browsing needs no
/// account; tickets do.
final eventsModule = AppModule(
  tabPaths: {Paths.events, Paths.tickets, Paths.account},
  screens: _screens,
  defaultTabs: (_) => _defaultTabs,
  screenLocation: (screen, config) => switch (screen) {
    BuiltInScreen.events || BuiltInScreen.courses => Paths.events,
    BuiltInScreen.search => Paths.eventsFiltered(focus: true),
    BuiltInScreen.tickets || BuiltInScreen.orders => Paths.tickets,
    BuiltInScreen.account => Paths.account,
    BuiltInScreen.settings => Paths.settings,
    BuiltInScreen.notifications => Paths.notifications,
    BuiltInScreen.myCourses ||
    BuiltInScreen.favorites ||
    BuiltInScreen.messages ||
    BuiltInScreen.cart ||
    BuiltInScreen.services ||
    BuiltInScreen.appointments ||
    BuiltInScreen.articles ||
    BuiltInScreen.bookmarks => null,
    BuiltInScreen.classes || BuiltInScreen.memberships => null,
  },
  routes: _pushedRoutes,
);

final _defaultTabs = [
  ShellTab(
    icon: AppIcons.event,
    label: (c) => c.l10n.tabEvents,
    location: Paths.events,
  ),
  ShellTab(
    icon: AppIcons.ticket,
    label: (c) => c.l10n.tabTickets,
    location: Paths.tickets,
  ),
  ShellTab(
    icon: AppIcons.account,
    label: (c) => c.l10n.tabAccount,
    location: Paths.account,
  ),
];

List<TabScreen> _screens() => [
  TabScreen(
    Paths.events,
    (state) => EventsScreen(
      // A new category or search from a link starts a fresh list.
      key: ValueKey('events-${state.uri.query}'),
      initialCategory: state.uri.queryParameters['category'],
      focusSearch: state.uri.queryParameters['focus'] == '1',
    ),
  ),
  TabScreen(Paths.tickets, (state) => const TicketsScreen()),
  TabScreen(
    Paths.account,
    (state) => const ProfileScreen(),
    routes: accountSubRoutes(),
  ),
];

List<RouteBase> _pushedRoutes() => [
  GoRoute(
    path: '/event/:id',
    pageBuilder: (context, state) {
      final id = intParam(state, 'id');
      return appPage(
        state,
        id == null ? const NotFoundScreen() : EventScreen(eventId: id),
      );
    },
  ),
  GoRoute(
    path: '/ticket/:code',
    pageBuilder: (context, state) {
      final code = state.pathParameters['code'] ?? '';
      return appPage(
        state,
        RegExp(r'^[A-Z0-9]{1,16}$').hasMatch(code)
            ? TicketScreen(
                code: code,
                initial: state.extra is Ticket ? state.extra as Ticket : null,
              )
            : const NotFoundScreen(),
      );
    },
  ),
];
