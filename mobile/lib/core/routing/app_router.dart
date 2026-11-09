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
import '../../modules/school/data/parent_providers.dart';
import '../../modules/school/data/school_providers.dart';
import '../../modules/school/school_routes.dart';
import '../../modules/news/news_routes.dart';
import '../../modules/real_estate/real_estate_routes.dart';
import '../../modules/rides/data/rides_providers.dart';
import '../../modules/rides/rides_routes.dart';
import '../../modules/shared/shared_routes.dart';
import '../../modules/store/store_routes.dart';
import '../../modules/vendor/data/vendor_providers.dart';
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
    AppType.school => schoolModule,
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
  // 115 The marketplace's vendor app: the vendor's orders, stock and the
  // account.
  if (ref.watch(vendorAppProvider)) return vendorAppTabs;
  final gate = ref.watch(appGateProvider);
  final config = gate is GateReady ? gate.config : null;
  final navigation = gate is GateReady ? gate.navigation : null;
  // 104 Delivery apps (105.1 and food delivery apps): the Courier tab for
  // the company's couriers only; 112.3 never in the customers' app (the
  // courier app has its own tabs above), which leaves out an owner's
  // Courier tab too.
  final appType = ref.watch(appEnvironmentProvider).build.appType;
  final courier = appType == AppType.delivery || appType == AppType.food
      ? ref.watch(isCourierProvider)
      : null;
  // 105.1 Food delivery apps: the Restaurant tab for the restaurants' staff.
  final restaurant = appType == AppType.food
      ? ref.watch(isRestaurantProvider)
      : null;
  // 115 Marketplaces that keep their vendors in the customers' app
  // (`MarketConfig.vendor_app` same): the vendor's tab for its staff.
  final vendor = appType == AppType.food ? ref.watch(isVendorProvider) : null;
  // 105.2 Ride apps: the Driver tab for the company's drivers; 112.3 never
  // in the riders' app, as above.
  final driver = appType == AppType.rides ? ref.watch(isDriverProvider) : null;
  // 105.3 Academies: the Teacher tab for the academy's teachers.
  final teacher = appType == AppType.lms ? ref.watch(isTeacherProvider) : null;
  // 105.4 Schools: the Classroom tab for the school's teachers; 113.3 the
  // Staff tab for its staff who don't teach.
  final classroom = ref.watch(isSchoolTeacherProvider);
  final staff = ref.watch(isSchoolStaffProvider);
  // 113.4 The Parent tab for the school's parents only.
  final parent = ref.watch(isSchoolParentProvider);
  List<ShellTab> withRoles(List<ShellTab> tabs) => withStaffTab(
    withClassroomTab(
      withTeacherTab(
        withDriverTab(
          withVendorTab(
            withRestaurantTab(
              withCourierTab(withParentTab(tabs, parent), courier),
              restaurant,
            ),
            vendor,
          ),
          driver,
        ),
        teacher,
      ),
      classroom,
    ),
    staff,
  );
  // 112.1 Ride apps open on the map, like Uber: the Ride tab first.
  List<ShellTab> mapFirst(List<ShellTab> tabs) =>
      appType == AppType.rides ? rideTabFirst(tabs) : tabs;
  if (navigation != null) {
    final tabs = tabsFromNavigation(navigation, module, config);
    if (tabs.length >= Navigation.minTabs &&
        tabs.any((t) => t.location != null)) {
      return withRoles(mapFirst(withChatTab(tabs, config)));
    }
  }
  return withRoles(mapFirst(withChatTab(module.defaultTabs(config), config)));
});

/// 112.1 A ride app's tabs with the Ride tab (the map) first, where the app
/// opens; the others keep their order. Without a Ride tab, as they are.
List<ShellTab> rideTabFirst(List<ShellTab> tabs) {
  final at = tabs.indexWhere((t) => t.location == Paths.ride);
  if (at <= 0) return tabs;
  return [tabs[at], ...tabs.sublist(0, at), ...tabs.sublist(at + 1)];
}

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

/// 115 The tabs of a marketplace: the vendor's tab added for its staff,
/// as the Restaurant tab is for restaurants'. Null: not a food app.
List<ShellTab> withVendorTab(List<ShellTab> tabs, bool? vendor) =>
    _withRoleTab(tabs, vendorTab, vendor);

/// 105.2 The tabs of a ride app: the Driver tab added for the company's
/// drivers, as the Courier tab is for couriers. Null: not a ride app.
List<ShellTab> withDriverTab(List<ShellTab> tabs, bool? driver) =>
    _withRoleTab(tabs, driverTab, driver);

/// 105.3 The tabs of an academy: the Teacher tab added for its teachers,
/// as the Courier tab is for couriers. Null: not an academy.
List<ShellTab> withTeacherTab(List<ShellTab> tabs, bool? teacher) =>
    _withRoleTab(tabs, teacherTab, teacher);

/// 105.4 The tabs of a school: the Classroom tab added for its teachers, as
/// the Courier tab is for couriers. Null: not a school.
List<ShellTab> withClassroomTab(List<ShellTab> tabs, bool? teacher) =>
    _withRoleTab(tabs, classroomTab, teacher);

/// 113.4 The tabs of a school: the Parent tab added for its parents (never
/// a student's, a teacher's or staff's without children there), after
/// School. Null: not a school.
List<ShellTab> withParentTab(List<ShellTab> tabs, bool? parent) =>
    _withRoleTab(tabs, parentTab, parent);

/// 113.3 The tabs of a school: the Staff tab added for its staff who don't
/// teach, as the Classroom tab is for teachers. Null: not a school.
List<ShellTab> withStaffTab(List<ShellTab> tabs, bool? staff) =>
    _withRoleTab(tabs, staffTab, staff);

List<ShellTab> _withRoleTab(List<ShellTab> tabs, ShellTab tab, bool? show) {
  if (show == null) return tabs;
  final others = [
    for (final t in tabs)
      if (t.path != tab.path) t,
  ];
  if (!show) return others;
  final at = _addAt(others);
  final out = [...others]..insert(at, tab);
  if (out.length > Navigation.maxTabs) {
    final pushed = out.removeAt(at - 1);
    // 109 With a More tab, the tab it pushes out goes first in its list.
    final more = out.indexWhere((t) => t.isMore);
    if (more != -1) out[more] = out[more].withMore([pushed, ...out[more].more]);
  }
  return out;
}

/// Where a tab the app adds goes: before Account, or 109 before More, when
/// that is last; else at the end.
int _addAt(List<ShellTab> tabs) =>
    tabs.isNotEmpty && (tabs.last.path == Paths.account || tabs.last.isMore)
    ? tabs.length - 1
    : tabs.length;

/// Turns the published tabs into shell tabs. A tab whose target this app
/// type can't open is left out, and so is a second tab for the same screen.
/// 109 The More tab gets the tabs past the fourth (`Navigation.more`), each
/// opened on top.
List<ShellTab> tabsFromNavigation(
  Navigation navigation,
  AppModule module,
  AppConfig? config,
) {
  final tabs = <ShellTab>[];
  final paths = <String>{};
  for (final tab in navigation.tabs) {
    if (tab.target.type == PageActionType.more) {
      final more = [
        for (final entry in navigation.more)
          ?_shellTab(entry, module, config, onTop: true),
      ];
      if (more.isNotEmpty) {
        tabs.add(_shellTab(tab, module, config)!.withMore(more));
      }
      continue;
    }
    final shell = _shellTab(tab, module, config);
    if (shell == null) continue;
    if (shell.path != null && !paths.add(shell.path!)) continue;
    tabs.add(shell);
  }
  return tabs;
}

/// A published tab as a shell tab, or null when this app type can't open
/// it; [onTop], a tab in the More list, which opens its screen on top.
ShellTab? _shellTab(
  NavTab tab,
  AppModule module,
  AppConfig? config, {
  bool onTop = false,
}) {
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
  if (target.type == PageActionType.screen && location == null) return null;
  if (target.type == PageActionType.page && location == null) return null;
  final path = location == null ? null : Uri.parse(location).path;
  final asTab = !onTop && path != null && module.isTabPath(path);
  String label(BuildContext _) => tab.label;
  return ShellTab(
    icon: symbolByName(tab.icon),
    // 83.3 Unless the team switched the owner's own icons off.
    iconUrl: config?.switchOn('own_icons') == false ? null : tab.iconUrl,
    label: label,
    location: asTab ? location : null,
    // Screens that can't be a tab (settings) open on top instead.
    pushLocation: asTab ? null : location,
    action: location == null ? target : null,
    id: tab.id,
  );
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
    // 115 The vendor app opens on the vendor's orders.
    : ref.read(vendorAppProvider)
    ? Paths.vendorDesk
    // 112.1 A ride app opens on the map (its Ride tab).
    : ref.read(shellTabsProvider).firstOrNull?.location == Paths.ride
    ? Paths.ride
    // 113.3 A school's staff who don't teach and have no child there open
    // on the Staff tab, not on a School tab without a student.
    : ref.read(isSchoolStaffOnlyProvider)
    ? Paths.staff
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
