import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/gate/app_gate.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/app_router.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../../core/theme/app_look.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/fonts/remote_fonts.dart';
import '../../core/web/web_page_screen.dart';
import '../../core/api/models/models.dart' show SignInMethod;
import '../../core/api/models/page_models.dart' show TabBarDesign;
import '../../core/widgets/app_nav_bar.dart';
import '../../core/widgets/buttons.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/keyboard.dart';
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
import 'auth/password_screens.dart';
import 'auth/signup_screen.dart';
import 'pages/more_tabs.dart';
import 'pages/page_actions.dart';
import 'pages/page_providers.dart';
import 'links/link_open_screen.dart';
import 'pages/page_screen.dart';
import 'pages/screen_page.dart';
import 'pages/web_tab_screen.dart';
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
  // 120.4 Every screen with the Studio page the owner drew around it, when
  // there is one: those a tab opens are wrapped where they're built.
  child: child is ScreenWithPage || child is MainShell
      ? child
      : ScreenWithPage(path: state.fullPath ?? '', pushed: true, child: child),
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
    // 118 Studio apps with passwords: "Forgot password", then the new one.
    // 160 With the channel of the way in use (`?channel=email|phone`).
    GoRoute(
      path: 'forgot',
      pageBuilder: (context, state) => appPage(
        state,
        ForgotPasswordScreen(
          from: state.uri.queryParameters['from'],
          channel: SignInMethod.values
              .where((m) => m.name == state.uri.queryParameters['channel'])
              .firstOrNull,
        ),
      ),
    ),
    GoRoute(
      path: 'new-password',
      pageBuilder: (context, state) {
        final args = state.extra;
        return appPage(
          state,
          args is NewPasswordArgs
              ? NewPasswordScreen(args: args)
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

/// The settings' own pages, under it wherever it is (Account's, a tab).
List<RouteBase> _settingsRoutes() => [
  _rootPage('devices', () => const DevicesScreen()),
  // 118 Studio apps with passwords.
  _rootPage('password', () => const ChangePasswordScreen()),
];

/// 26 An order, followed step by step: over the tabs, from its list
/// wherever that is (Account's, 171 the Orders tab).
GoRoute _orderRoute() => GoRoute(
  path: ':id',
  parentNavigatorKey: rootNavigatorKey,
  pageBuilder: (context, state) {
    final id = intParam(state, 'id');
    return appPage(
      state,
      id == null ? const NotFoundScreen() : OrderScreen(orderId: id),
    );
  },
);

/// Pages under the Account tab that every app type has. [extra] adds the
/// app type's own pages (certificates, quiz results).
List<RouteBase> accountSubRoutes({List<RouteBase> extra = const []}) => [
  _rootPage('edit', () => const EditProfileScreen()),
  GoRoute(
    path: 'settings',
    parentNavigatorKey: rootNavigatorKey,
    pageBuilder: (context, state) => appPage(state, const SettingsScreen()),
    routes: _settingsRoutes(),
  ),
  GoRoute(
    path: 'orders',
    parentNavigatorKey: rootNavigatorKey,
    pageBuilder: (context, state) => appPage(state, const OrdersScreen()),
    routes: [_orderRoute()],
  ),
  ...extra,
];

/// 171 The screens of every app type that a published tab can show in its
/// place, the bar under them ([Paths.sharedTabPaths]; the chat is
/// [chatTabScreen]). Elsewhere they open on top, as before: the orders and
/// the settings from Account, the notifications from a page's bell.
List<TabScreen> sharedTabScreens() => [
  TabScreen(
    Paths.orders,
    (state) => const OrdersScreen(),
    routes: [_orderRoute()],
  ),
  TabScreen(Paths.notifications, (state) => const NotificationsScreen()),
  TabScreen(
    Paths.settings,
    (state) => const SettingsScreen(),
    routes: _settingsRoutes(),
  ),
];

/// [routes] under [parent] without those a tab shows ([tabbed]), which are
/// the tab's branch's own then (171 the Orders tab's, not Account's).
List<RouteBase> _withoutTabs(
  String parent,
  List<RouteBase> routes,
  Set<String> tabbed,
) => [
  for (final r in routes)
    if (r is! GoRoute || !tabbed.contains('$parent/${r.path}')) r,
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
  // 171 Every app type's own screens a tab can show (the orders...).
  final shared = {for (final s in sharedTabScreens()) s.path: s};
  // The places the tabs show, so a screen's pages leave out one a tab has.
  final tabbed = {
    for (final t in tabs)
      if (t.location != null) ?t.path,
  };
  final used = <String>{};
  final branches = <StatefulShellBranch>[];
  for (final tab in tabs) {
    final location = tab.location;
    final path = tab.path;
    if (location == null || path == null || used.contains(path)) continue;
    final screen = screens[path] ?? shared[path];
    final GoRoute route;
    if (screen != null) {
      // 120 With the Studio page the owner drew around it.
      route = GoRoute(
        path: path,
        pageBuilder: (context, state) => appPage(
          state,
          ScreenWithPage(path: screen.path, child: screen.build(state)),
        ),
        routes: _withoutTabs(path, screen.routes, tabbed),
      );
    } else if (path.startsWith(Paths.webTabPrefix)) {
      // 122 A web page in the app, as a tab.
      final id = Uri.decodeComponent(path.substring(Paths.webTabPrefix.length));
      route = GoRoute(
        path: path,
        pageBuilder: (context, state) => appPage(
          state,
          WebTabScreen(key: ValueKey('tab-web-$id'), tabId: id),
        ),
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
      StatefulShellBranch(
        routes: [route],
        initialLocation: location,
        // 141 A sheet opened in a tab closes the keyboard too (its own navigator).
        observers: [KeyboardRouteObserver()],
      ),
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
          pageBuilder: (context, state) {
            final child = screen.build(state);
            // 120 With the Studio page the owner drew around it, its back
            // button over the page.
            return appPage(
              state,
              ScreenWithPage(
                path: screen.path,
                pushed: true,
                alone: screen.ownBar ? child : PushedTabScreen(child: child),
                child: child,
              ),
            );
          },
          routes: _withoutTabs(screen.path, screen.routes, tabbed),
        ),
    GoRoute(
      path: '${Paths.pagePrefix}:slug',
      pageBuilder: (context, state) {
        final slug = state.pathParameters['slug'] ?? '';
        return appPage(state, PageScreen(slug: slug, pushed: true));
      },
    ),
    ...module.routes(),
    // 171 Less the notifications when a tab shows them.
    for (final r in sharedPageRoutes())
      if (r is! GoRoute || !used.contains(r.path)) r,
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
    // 123 A frosted bar floats over the page, which goes on under it;
    // 128 the floating pill too (Sofra Eats's, 128.8 Ufuq Academy's),
    // which always floats; 129 the small dock too.
    final overBody =
        !hideTabs &&
        ((tabBar?.design == TabBarDesign.glass && (tabBar?.margin ?? 0) > 0) ||
            tabBar?.design == TabBarDesign.float ||
            tabBar?.design == TabBarDesign.dock ||
            // 131.22 The petal floats over the page too.
            tabBar?.design == TabBarDesign.petal);
    return Scaffold(
      // 128.10 The screens under it know, to end above it.
      body: TabBarOverBody(over: overBody, child: shell),
      extendBody: overBody,
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
              // 119 The account tab with the person's photo.
              avatarIndex: tabBar?.avatar == true
                  ? tabs.indexWhere(
                      (t) =>
                          t.path == Paths.account ||
                          Uri.tryParse(t.pushLocation ?? '')?.path ==
                              Paths.account,
                    )
                  : null,
              avatarUrl: tabBar?.avatar == true
                  ? ref.watch(authControllerProvider).user?.avatarUrl
                  : null,
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
                // 141 Another tab: the keyboard of a field in this one closes,
                // so it doesn't stay up over that tab, nor come back here.
                closeKeyboard();
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
