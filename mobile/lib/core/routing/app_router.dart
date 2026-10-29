import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../modules/bookings/bookings_routes.dart';
import '../../modules/chat/chat_routes.dart';
import '../../modules/events/events_routes.dart';
import '../../modules/donations/donations_routes.dart';
import '../../modules/delivery/data/delivery_providers.dart';
import '../../modules/delivery/delivery_routes.dart';
import '../../modules/food/data/food_providers.dart';
import '../../modules/food/food_routes.dart';
import '../../modules/lms/lms_routes.dart';
import '../../modules/lms/teachers/teachers_providers.dart';
import '../../modules/news/news_routes.dart';
import '../../modules/real_estate/real_estate_routes.dart';
import '../../modules/rides/data/rides_providers.dart';
import '../../modules/rides/rides_routes.dart';
import '../../modules/shared/shared_routes.dart';
import '../../modules/store/store_routes.dart';
import '../api/models/models.dart';
import '../config/build_config_data.dart';
import '../gate/app_gate.dart';
import '../providers.dart';
import '../auth/auth_controller.dart';
import '../storage/local_settings.dart';
import '../theme/symbol_names.dart';
import '../services/analytics_providers.dart';
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
  // 104.6 Where the app starts: the courier's screen in a courier app.
  String home = Paths.home,
}) {
  if (auth is AuthChecking) return null;
  final signingIn = Paths.isSignIn(location);
  if (auth.isSignedIn) {
    if (!signingIn) return null;
    final from = Uri.parse(location).queryParameters['from'];
    return (from != null && from.startsWith('/')) ? from : home;
  }
  if (signingIn) return null;
  if (Paths.requiresAuth(location)) {
    return Uri(
      path: Paths.signIn,
      queryParameters: {'from': location},
    ).toString();
  }
  if (!guestMode && (location == '/' || location.startsWith(home))) {
    return Paths.signIn;
  }
  if (location == '/') return home;
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
    AppType.delivery => deliveryModule,
    AppType.food => foodModule,
    AppType.rides => ridesModule,
  },
);

/// The bottom tabs from `/pages`, or [AppModule.defaultTabs] when the client
/// hasn't published any, or too few of the published tabs work here. 77
/// With chat, a Chat tab when there's room.
final shellTabsProvider = Provider<List<ShellTab>>((ref) {
  final module = ref.watch(appModuleProvider);
  // 104.6 The courier app: the courier's screen and the account, nothing else.
  if (ref.watch(courierAppProvider)) return courierAppTabs;
  // 105.2 The drivers' app: the driver's screen and the account.
  if (ref.watch(driverAppProvider)) return driverAppTabs;
  final gate = ref.watch(appGateProvider);
  final config = gate is GateReady ? gate.config : null;
  final navigation = gate is GateReady ? gate.navigation : null;
  // 104 Delivery apps (105.1 and food delivery apps): the Courier tab for
  // the company's couriers only.
  final appType = ref.watch(appEnvironmentProvider).build.appType;
  final courier = appType == AppType.delivery || appType == AppType.food
      ? ref.watch(isCourierProvider)
      : null;
  // 105.1 Food delivery apps: the Restaurant tab for the restaurants' staff.
  final restaurant = appType == AppType.food
      ? ref.watch(isRestaurantProvider)
      : null;
  // 105.2 Ride apps: the Driver tab for the company's drivers.
  final driver = appType == AppType.rides ? ref.watch(isDriverProvider) : null;
  // 105.3 Academies: the Teacher tab for the academy's teachers.
  final teacher = appType == AppType.lms ? ref.watch(isTeacherProvider) : null;
  List<ShellTab> withRoles(List<ShellTab> tabs) => withTeacherTab(
    withDriverTab(
      withRestaurantTab(withCourierTab(tabs, courier), restaurant),
      driver,
    ),
    teacher,
  );
  if (navigation != null) {
    final tabs = tabsFromNavigation(navigation, module, config);
    if (tabs.length >= Navigation.minTabs &&
        tabs.any((t) => t.location != null)) {
      return withRoles(withChatTab(tabs, config));
    }
  }
  return withRoles(withChatTab(module.defaultTabs(config), config));
});

/// 104 The tabs of a delivery app: the Courier tab added for couriers
/// (before Account, in place of the tab before it when the bar is full),
/// and left out for everyone else even when the owner's tabs have it.
/// Null: not a delivery app.
List<ShellTab> withCourierTab(List<ShellTab> tabs, bool? courier) =>
    _withRoleTab(tabs, courierTab, courier);

/// 105.1 The tabs of a food delivery app: the Restaurant tab added for the
/// restaurants' staff, as the Courier tab is for couriers. Null: not a food
/// delivery app.
List<ShellTab> withRestaurantTab(List<ShellTab> tabs, bool? restaurant) =>
    _withRoleTab(tabs, restaurantTab, restaurant);

/// 105.2 The tabs of a ride app: the Driver tab added for the company's
/// drivers, as the Courier tab is for couriers. Null: not a ride app.
List<ShellTab> withDriverTab(List<ShellTab> tabs, bool? driver) =>
    _withRoleTab(tabs, driverTab, driver);

/// 105.3 The tabs of an academy: the Teacher tab added for its teachers,
/// as the Courier tab is for couriers. Null: not an academy.
List<ShellTab> withTeacherTab(List<ShellTab> tabs, bool? teacher) =>
    _withRoleTab(tabs, teacherTab, teacher);

List<ShellTab> _withRoleTab(List<ShellTab> tabs, ShellTab tab, bool? show) {
  if (show == null) return tabs;
  final others = [
    for (final t in tabs)
      if (t.path != tab.path) t,
  ];
  if (!show) return others;
  final at = others.isNotEmpty && others.last.path == Paths.account
      ? others.length - 1
      : others.length;
  final out = [...others]..insert(at, tab);
  if (out.length > Navigation.maxTabs) out.removeAt(at - 1);
  return out;
}

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
        // 83.3 Unless the team switched the owner's own icons off.
        iconUrl: config?.switchOn('own_icons') == false ? null : tab.iconUrl,
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

/// Where the app starts: 104.6 the courier's screen in a courier app, 105.2
/// the driver's in a drivers' app.
String _startAt(Ref ref) => ref.read(courierAppProvider)
    ? Paths.courier
    : ref.read(driverAppProvider)
    ? Paths.driver
    : Paths.home;

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
    initialLocation: _startAt(ref),
    refreshListenable: refresh,
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final build = ref.read(appEnvironmentProvider).build;
      // 46 A link that opens the app (App Links, Universal Links, a
      // notification's link): its screen, then the sign-in rules below.
      final link = linkLocation(state.uri, build);
      // 86.2 Counted for the owner: opened from a link or a QR code.
      if (link != null && isAppLink(state.uri, build)) {
        ref.read(analyticsProvider).linkOpened(state.uri);
      }
      return link ??
          redirectFor(
            location: state.uri.toString(),
            auth: ref.read(authControllerProvider),
            guestMode: ref.read(localSettingsProvider).guestMode,
            home: _startAt(ref),
          );
    },
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
