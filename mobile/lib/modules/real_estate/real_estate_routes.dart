import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models/models.dart';
import '../../core/l10n/l10n.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'data/real_estate_providers.dart';
import 'screens/favorites_screen.dart';
import 'screens/listing_screen.dart';
import 'screens/messages_screen.dart';
import 'screens/search_screen.dart';

/// The Real estate module (hosted API): search, favorites, messages to the
/// office (when the office turned them on) and the account as tabs, and
/// the listing and conversation pages.
final realEstateModule = AppModule(
  tabPaths: {Paths.search, Paths.favorites, Paths.messages, Paths.account},
  screens: _screens,
  defaultTabs: (config) => [
    ShellTab(
      icon: AppIcons.home,
      label: (c) => c.l10n.tabHome,
      location: Paths.search,
    ),
    ShellTab(
      icon: AppIcons.favorite,
      label: (c) => c.l10n.tabFavorites,
      location: Paths.favorites,
    ),
    if (config?.listings?.messages ?? false)
      ShellTab(
        icon: AppIcons.chat,
        label: (c) => c.l10n.tabMessages,
        location: Paths.messages,
      ),
    ShellTab(
      icon: AppIcons.account,
      label: (c) => c.l10n.tabAccount,
      location: Paths.account,
    ),
  ],
  screenLocation: (screen, config) => switch (screen) {
    BuiltInScreen.courses => Paths.search,
    BuiltInScreen.search => '${Paths.search}?focus=1',
    BuiltInScreen.favorites => Paths.favorites,
    BuiltInScreen.messages =>
      (config?.listings?.messages ?? false) ? Paths.messages : null,
    BuiltInScreen.account => Paths.account,
    BuiltInScreen.settings => Paths.settings,
    BuiltInScreen.notifications => Paths.notifications,
    BuiltInScreen.myCourses ||
    BuiltInScreen.cart ||
    BuiltInScreen.orders ||
    BuiltInScreen.services ||
    BuiltInScreen.appointments ||
    BuiltInScreen.articles ||
    BuiltInScreen.bookmarks => null,
    BuiltInScreen.classes || BuiltInScreen.memberships => null,
    BuiltInScreen.events || BuiltInScreen.tickets => null,
    BuiltInScreen.sendParcel ||
    BuiltInScreen.shipments ||
    BuiltInScreen.courier ||
    BuiltInScreen.restaurants ||
    BuiltInScreen.ride ||
    BuiltInScreen.myRides ||
    BuiltInScreen.driver ||
    BuiltInScreen.teachers ||
    BuiltInScreen.teacher ||
    BuiltInScreen.foodOrders ||
    BuiltInScreen.restaurant ||
    BuiltInScreen.campaigns ||
    BuiltInScreen.myDonations => null,
  },
  routes: _pushedRoutes,
  badges: (ref) => {
    Paths.messages: ref.watch(unreadMessagesProvider).value ?? 0,
  },
);

List<TabScreen> _screens() => [
  TabScreen(
    Paths.search,
    (state) => ListingsSearchScreen(
      key: const ValueKey('listings-search'),
      focusSearch: state.uri.queryParameters['focus'] == '1',
    ),
  ),
  TabScreen(Paths.favorites, (state) => const FavoritesScreen()),
  TabScreen(
    Paths.messages,
    (state) => const MessagesScreen(),
    routes: [
      GoRoute(
        path: ':id',
        parentNavigatorKey: rootNavigatorKey,
        pageBuilder: (context, state) {
          final id = intParam(state, 'id');
          return appPage(
            state,
            id == null
                ? const NotFoundScreen()
                : ConversationScreen(inquiryId: id),
          );
        },
      ),
    ],
  ),
  TabScreen(
    Paths.account,
    (state) => const ProfileScreen(),
    routes: accountSubRoutes(),
  ),
];

List<RouteBase> _pushedRoutes() => [
  GoRoute(
    path: '/listing/:id',
    pageBuilder: (context, state) {
      final id = intParam(state, 'id');
      return appPage(
        state,
        id == null ? const NotFoundScreen() : ListingScreen(listingId: id),
      );
    },
  ),
];
