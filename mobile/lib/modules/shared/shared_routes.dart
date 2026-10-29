import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/gate/app_gate.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/app_router.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_look.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/fonts/remote_fonts.dart';
import '../../core/web/web_page_screen.dart';
import '../../core/widgets/app_nav_bar.dart';
import '../../core/widgets/buttons.dart';
import '../../core/widgets/common.dart';
import '../chat/chat_routes.dart';
import '../chat/data/chat_providers.dart';
import '../lms/lesson/embeds/embed_fullscreen_screen.dart';
import 'account/edit_profile_screen.dart';
import 'account/lists_screens.dart';
import 'account/notifications_screen.dart';
import 'account/order_screen.dart';
import 'account/settings_screen.dart';
import 'auth/otp_screen.dart';
import 'auth/sign_in_screen.dart';
import 'auth/signup_screen.dart';
import 'pages/more_tabs.dart';
import 'pages/page_actions.dart';
import 'pages/page_providers.dart';
import 'links/link_open_screen.dart';
import 'pages/page_screen.dart';
import 'pages/side_menu.dart';
import '../../core/l10n/l10n.dart';

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
  GoRoute(
    path: 'orders',
    parentNavigatorKey: rootNavigatorKey,
    pageBuilder: (context, state) => appPage(state, const OrdersScreen()),
    routes: [
      // 26 A restaurant's order, followed step by step.
      GoRoute(
        path: ':id',
        parentNavigatorKey: rootNavigatorKey,
        pageBuilder: (context, state) {
          final id = intParam(state, 'id');
          return appPage(
            state,
            id == null ? const NotFoundScreen() : OrderScreen(orderId: id),
          );
        },
      ),
    ],
  ),
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
    path: Paths.embed,
    pageBuilder: (context, state) {
      final args = state.extra;
      return appPage(
        state,
        args is EmbedFullscreenArgs
            ? EmbedFullscreenScreen(args: args)
            : const NotFoundScreen(),
        fullscreen: true,
      );
    },
  ),
  // 48 One of the site's own pages opened the app.
  GoRoute(
    path: Paths.openLink,
    pageBuilder: (context, state) => appPage(
      state,
      LinkOpenScreen(url: state.uri.queryParameters['url'] ?? ''),
    ),
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

/// Every route of an app: sign-in, the bottom tabs ([tabs]), the module's
/// screens that aren't tabs (pushed, with a back button), dashboard pages
/// and the module's pushed pages.
List<RouteBase> tabbedRoutes({
  required AppModule module,
  required List<ShellTab> tabs,
}) {
  // 77 Chat is a screen of every app type.
  final screens = {
    for (final s in [...module.screens(), chatTabScreen()]) s.path: s,
  };
  final used = <String>{};
  final branches = <StatefulShellBranch>[];
  for (final tab in tabs) {
    final location = tab.location;
    final path = tab.path;
    if (location == null || path == null || used.contains(path)) continue;
    final screen = screens[path];
    final GoRoute route;
    if (screen != null) {
      route = GoRoute(
        path: path,
        pageBuilder: (context, state) => appPage(state, screen.build(state)),
        routes: screen.routes,
      );
    } else if (path.startsWith(Paths.pagePrefix)) {
      final slug = Uri.decodeComponent(path.substring(Paths.pagePrefix.length));
      route = GoRoute(
        path: path,
        pageBuilder: (context, state) =>
            appPage(state, PageScreen(key: ValueKey('tab-$slug'), slug: slug)),
      );
    } else {
      continue;
    }
    used.add(path);
    branches.add(
      StatefulShellBranch(routes: [route], initialLocation: location),
    );
  }
  final first = tabs.firstWhere((t) => used.contains(t.path)).location!;
  return [
    signInRoute(),
    StatefulShellRoute.indexedStack(
      pageBuilder: (context, state, shell) =>
          appPage(state, MainShell(shell: shell, badges: module.badges)),
      branches: branches,
    ),
    // Sign-in and "Go home" lead to /home: the first tab when it is another
    // screen or a page.
    if (!used.contains(Paths.home))
      GoRoute(path: Paths.home, redirect: (context, state) => first),
    for (final screen in screens.values)
      if (!used.contains(screen.path) && screen.path != Paths.home)
        GoRoute(
          path: screen.path,
          pageBuilder: (context, state) =>
              appPage(state, PushedTabScreen(child: screen.build(state))),
          routes: screen.routes,
        ),
    GoRoute(
      path: '${Paths.pagePrefix}:slug',
      pageBuilder: (context, state) {
        final slug = state.pathParameters['slug'] ?? '';
        return appPage(state, PageScreen(slug: slug, pushed: true));
      },
    ),
    ...module.routes(),
    ...sharedPageRoutes(),
  ];
}

/// A tab's screen opened on top of the tabs (when the client's tabs don't
/// include it), with a back button above it.
class PushedTabScreen extends StatelessWidget {
  const PushedTabScreen({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Column(
      children: [
        SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(16, 8, 16, 0),
            child: Align(
              alignment: AlignmentDirectional.centerStart,
              child: AppBackButton(
                onPressed: () =>
                    context.canPop() ? context.pop() : context.go(Paths.home),
              ),
            ),
          ),
        ),
        Expanded(
          child: MediaQuery.removePadding(
            context: context,
            removeTop: true,
            child: child,
          ),
        ),
      ],
    ),
  );
}

/// The bottom tabs with the template's bottom navigation. Tabs come from
/// [shellTabsProvider]; those that run an action instead of showing a
/// screen have no branch.
class MainShell extends ConsumerWidget {
  const MainShell({super.key, required this.shell, this.badges});

  final StatefulNavigationShell shell;

  /// Counts shown on tabs, by tab path (for example the cart).
  final Map<String, int> Function(WidgetRef ref)? badges;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final template = ref.watch(appLookProvider).template;
    final tabs = ref.watch(shellTabsProvider);
    final counts = {
      ...?badges?.call(ref),
      // 77 Unread chat messages.
      Paths.chat: ref.watch(chatUnreadProvider),
    };
    // Branches are built in tab order from the tabs that have a location.
    final branchOf = <int, int>{};
    var branch = 0;
    for (final (i, tab) in tabs.indexed) {
      if (tab.location != null) branchOf[i] = branch++;
    }
    final current = branchOf.entries
        .firstWhere(
          (e) => e.value == shell.currentIndex,
          orElse: () => const MapEntry(0, 0),
        )
        .key;
    final hasMenu = sideMenuEntries(ref).isNotEmpty;
    // 103R A Studio page can be shown without the tabs under it
    // (`StudioPage.show_tabs`); the side menu and its own buttons lead on.
    final path = current < tabs.length ? tabs[current].path : null;
    final hideTabs =
        path != null &&
        path.startsWith(Paths.pagePrefix) &&
        ref
                .watch(
                  pageProvider(
                    Uri.decodeComponent(
                      path.substring(Paths.pagePrefix.length),
                    ),
                  ),
                )
                .value
                ?.studio
                ?.showTabs ==
            false;
    // 109 The bar's look: its names' font when the app can show it, and
    // the tab in the middle of three or five.
    final tabBar = ref.watch(navigationProvider)?.tabBar;
    final font = tabBar?.font;
    final barFont =
        font != null &&
            (bundledFonts.contains(font) ||
                ref.watch(remoteFontsProvider).contains(font))
        ? font
        : null;
    final middle = tabs.length.isOdd && tabs.length >= 3
        ? tabs.length ~/ 2
        : null;
    final centerIndex =
        middle != null &&
            tabBar?.center != null &&
            tabs[middle].id == tabBar?.center
        ? middle
        : null;
    return Scaffold(
      body: shell,
      // 82.5 The side menu built in the dashboard.
      drawer: hasMenu
          ? SideMenu(onOpen: (action) => runPageAction(context, ref, action))
          : null,
      bottomNavigationBar: hideTabs
          ? null
          : AppNavBar(
              template: template,
              // 109 The look the owner gave the bar.
              style: tabBar,
              fontFamily: barFont,
              centerIndex: centerIndex,
              destinations: [
                for (final tab in tabs)
                  NavDestination(
                    tab.icon,
                    tab.label(context),
                    iconUrl: tab.iconUrl,
                  ),
              ],
              badges: {
                for (final (i, tab) in tabs.indexed)
                  i: ?counts[tab.path ?? tab.pushLocation],
              },
              currentIndex: current,
              onSelected: (i) {
                final tab = tabs[i];
                final index = branchOf[i];
                if (tab.isMore) {
                  // 109 The tabs past the fourth.
                  showMoreTabs(context, ref, tab.more);
                } else if (index != null) {
                  shell.goBranch(
                    index,
                    initialLocation: index == shell.currentIndex,
                  );
                } else if (tab.pushLocation != null) {
                  context.push(tab.pushLocation!);
                } else if (tab.action != null) {
                  runPageAction(context, ref, tab.action!);
                }
              },
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
        title: context.l10n.pageNotFound,
        actionLabel: context.l10n.goHome,
        onAction: () => context.go(Paths.home),
      ),
    ),
  );
}
