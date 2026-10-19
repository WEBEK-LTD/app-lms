import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../modules/bookings/bookings_routes.dart';
import '../../modules/events/events_routes.dart';
import '../../modules/donations/donations_routes.dart';
import '../../modules/lms/lms_routes.dart';
import '../../modules/news/news_routes.dart';
import '../../modules/real_estate/real_estate_routes.dart';
import '../../modules/shared/shared_routes.dart';
import '../../modules/store/store_routes.dart';
import '../api/models/models.dart';
import '../config/build_config_data.dart';
import '../gate/app_gate.dart';
import '../providers.dart';
import '../auth/auth_controller.dart';
import '../storage/local_settings.dart';
import '../theme/symbol_names.dart';
import 'app_links.dart';
import 'app_module.dart';
import 'paths.dart';

/// Decides where a location should go given the sign-in state.
///
/// - Signed-out students who haven't chosen to browse as a guest start at
///   sign-in.
/// - Pages that need an account send signed-out students to sign-in and
///   bring them back afterwards (`from`).
/// - Signed-in students never see the sign-in screens.
String? redirectFor({
  required String location,
  required AuthState auth,
  required bool guestMode,
}) {
  if (auth is AuthChecking) return null;
  final signingIn = Paths.isSignIn(location);
  if (auth.isSignedIn) {
    if (!signingIn) return null;
    final from = Uri.parse(location).queryParameters['from'];
    return (from != null && from.startsWith('/')) ? from : Paths.home;
  }
  if (signingIn) return null;
  if (Paths.requiresAuth(location)) {
    return Uri(
      path: Paths.signIn,
      queryParameters: {'from': location},
    ).toString();
  }
  if (!guestMode && (location == '/' || location.startsWith(Paths.home))) {
    return Paths.signIn;
  }
  if (location == '/') return Paths.home;
  return null;
}

class _RouterRefresh extends ChangeNotifier {
  void ping() => notifyListeners();
}

/// The module of this build's app type.
final appModuleProvider = Provider<AppModule>(
  (ref) => switch (ref.watch(appEnvironmentProvider).build.appType) {
    AppType.lms => lmsModule,
    AppType.store => storeModule,
    AppType.booking => bookingsModule,
    AppType.realEstate => realEstateModule,
    AppType.news => newsModule,
    AppType.events => eventsModule,
    AppType.donations => donationsModule,
  },
);

/// The bottom tabs from `/pages`, or [AppModule.defaultTabs] when the client
/// hasn't published any, or too few of the published tabs work here.
final shellTabsProvider = Provider<List<ShellTab>>((ref) {
  final module = ref.watch(appModuleProvider);
  final gate = ref.watch(appGateProvider);
  final config = gate is GateReady ? gate.config : null;
  final navigation = gate is GateReady ? gate.navigation : null;
  if (navigation != null) {
    final tabs = tabsFromNavigation(navigation, module, config);
    if (tabs.length >= Navigation.minTabs &&
        tabs.any((t) => t.location != null)) {
      return tabs;
    }
  }
  return module.defaultTabs(config);
});

/// Turns the published tabs into shell tabs. A tab whose target this app
/// type can't open is left out, and so is a second tab for the same screen.
List<ShellTab> tabsFromNavigation(
  Navigation navigation,
  AppModule module,
  AppConfig? config,
) {
  final tabs = <ShellTab>[];
  final paths = <String>{};
  for (final tab in navigation.tabs) {
    final target = tab.target;
    final String? location = switch (target.type) {
      PageActionType.page when target.pageSlug != null => Paths.page(
        target.pageSlug!,
      ),
      PageActionType.screen when target.screen != null => module.screenLocation(
        target.screen!,
        config,
      ),
      _ => null,
    };
    if (target.type == PageActionType.screen && location == null) continue;
    if (target.type == PageActionType.page && location == null) continue;
    final path = location == null ? null : Uri.parse(location).path;
    final asTab = path != null && module.isTabPath(path);
    if (asTab && !paths.add(path)) continue;
    String label(BuildContext _) => tab.label;
    tabs.add(
      ShellTab(
        icon: symbolByName(tab.icon),
        label: label,
        location: asTab ? location : null,
        // Screens that can't be a tab (settings) open on top instead.
        pushLocation: asTab ? null : location,
        action: location == null ? target : null,
      ),
    );
  }
  return tabs;
}

/// Goes to [location] when it is one of the bottom tabs, else pushes it on
/// top, so screens opened from pages always have a way back.
void openLocation(BuildContext context, String location) {
  final tabs = ProviderScope.containerOf(
    context,
    listen: false,
  ).read(shellTabsProvider);
  final path = Uri.parse(location).path;
  if (tabs.any((t) => t.path == path)) {
    GoRouter.of(context).go(location);
  } else {
    GoRouter.of(context).push(location);
  }
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final refresh = _RouterRefresh();
  ref
    ..listen(authControllerProvider, (_, _) => refresh.ping())
    ..listen(
      localSettingsProvider.select((s) => s.guestMode),
      (_, _) => refresh.ping(),
    );
  // A new router only when the tabs' places change; new labels (another
  // language) don't need one.
  ref.watch(
    shellTabsProvider.select((tabs) => tabs.map((t) => t.routeKey).join('|')),
  );
  final module = ref.read(appModuleProvider);
  final router = GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: Paths.home,
    refreshListenable: refresh,
    debugLogDiagnostics: false,
    redirect: (context, state) =>
        // 46 A link that opens the app (App Links, Universal Links, a
        // notification's link): its screen, then the sign-in rules below.
        linkLocation(state.uri, ref.read(appEnvironmentProvider).build) ??
        redirectFor(
          location: state.uri.toString(),
          auth: ref.read(authControllerProvider),
          guestMode: ref.read(localSettingsProvider).guestMode,
        ),
    routes: tabbedRoutes(module: module, tabs: ref.read(shellTabsProvider)),
    errorBuilder: (context, state) => const NotFoundScreen(),
  );
  ref.onDispose(() {
    // The old router may still be on screen until the next frame.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      router.dispose();
      refresh.dispose();
    });
  });
  return router;
});
