import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_look.dart';
import '../../core/web/web_page_screen.dart';
import '../../core/widgets/app_nav_bar.dart';
import '../../core/widgets/common.dart';
import 'account/edit_profile_screen.dart';
import 'account/lists_screens.dart';
import 'account/notifications_screen.dart';
import 'account/settings_screen.dart';
import 'auth/otp_screen.dart';
import 'auth/sign_in_screen.dart';
import 'auth/signup_screen.dart';

/// Routes every app type shares: sign-in, the account pages and web pages.

Page<void> appPage(
  GoRouterState state,
  Widget child, {
  bool fullscreen = false,
}) => MaterialPage<void>(
  key: state.pageKey,
  fullscreenDialog: fullscreen,
  child: child,
);

int? intParam(GoRouterState state, String name) =>
    int.tryParse(state.pathParameters[name] ?? '');

/// The root navigator, so pushed pages cover the bottom navigation.
final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>(
  debugLabel: 'root',
);

GoRoute signInRoute() => GoRoute(
  path: Paths.signIn,
  pageBuilder: (context, state) =>
      appPage(state, SignInScreen(from: state.uri.queryParameters['from'])),
  routes: [
    GoRoute(
      path: 'code',
      pageBuilder: (context, state) {
        final args = state.extra;
        return appPage(
          state,
          args is OtpArgs
              ? OtpScreen(args: args, from: state.uri.queryParameters['from'])
              : SignInScreen(from: state.uri.queryParameters['from']),
        );
      },
    ),
    GoRoute(
      path: 'details',
      pageBuilder: (context, state) {
        final args = state.extra;
        return appPage(
          state,
          args is SignupArgs
              ? SignupScreen(args: args)
              : SignInScreen(from: state.uri.queryParameters['from']),
        );
      },
    ),
  ],
);

GoRoute _rootPage(String path, Widget Function() build) => GoRoute(
  path: path,
  parentNavigatorKey: rootNavigatorKey,
  pageBuilder: (context, state) => appPage(state, build()),
);

/// Pages under the Account tab that every app type has. [extra] adds the
/// app type's own pages (certificates, quiz results).
List<RouteBase> accountSubRoutes({List<RouteBase> extra = const []}) => [
  _rootPage('edit', () => const EditProfileScreen()),
  GoRoute(
    path: 'settings',
    parentNavigatorKey: rootNavigatorKey,
    pageBuilder: (context, state) => appPage(state, const SettingsScreen()),
    routes: [_rootPage('devices', () => const DevicesScreen())],
  ),
  _rootPage('orders', () => const OrdersScreen()),
  ...extra,
];

/// Top-level pages every app type has.
List<RouteBase> sharedPageRoutes() => [
  GoRoute(
    path: Paths.notifications,
    pageBuilder: (context, state) =>
        appPage(state, const NotificationsScreen()),
  ),
  GoRoute(
    path: Paths.web,
    pageBuilder: (context, state) {
      final args = state.extra;
      return appPage(
        state,
        args is WebPageArgs
            ? WebPageScreen(args: args)
            : const NotFoundScreen(),
        fullscreen: true,
      );
    },
  ),
];

/// The main tabs with the template's bottom navigation.
class MainShell extends ConsumerWidget {
  const MainShell({
    super.key,
    required this.shell,
    this.destinations = mainDestinations,
    this.badges = const {},
  });

  final StatefulNavigationShell shell;
  final List<NavDestination> destinations;

  /// Counts shown on tabs, by index (for example the cart).
  final Map<int, int> badges;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final template = ref.watch(appLookProvider).template;
    return Scaffold(
      body: shell,
      bottomNavigationBar: AppNavBar(
        template: template,
        destinations: destinations,
        badges: badges,
        currentIndex: shell.currentIndex,
        onSelected: (i) =>
            shell.goBranch(i, initialLocation: i == shell.currentIndex),
      ),
    );
  }
}

class NotFoundScreen extends StatelessWidget {
  const NotFoundScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: MessageView(
        icon: AppIcons.error,
        title: "This page doesn't exist",
        actionLabel: 'Go home',
        onAction: () => context.go(Paths.home),
      ),
    ),
  );
}
