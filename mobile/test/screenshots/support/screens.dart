import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:yallapp/modules/delivery/data/delivery_providers.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';

import '../../support/fake_api.dart';
import '../../support/test_app.dart';
import 'demo_api.dart';
import 'demo_images.dart';
import 'map_tiles.dart';
import 'shot.dart';

export 'shot.dart';

/// Colors a client could pick in the dashboard.
const _forest = '#1E4D3F';
const _coral = '#E8795C';
const _nileBlue = '#123A5C';
const _sand = '#C9A24B';
const _harbour = '#1F4E5F';
const _berry = '#B03A5B';
const _charity = '#2F6B3A';

Map<String, dynamic> _appearance({
  required String template,
  required String font,
  String? secondary,
  String corners = 'soft',
  String? cards,
}) => {
  'template': template,
  'theme_mode': 'system',
  'user_can_change_mode': true,
  'secondary_color': secondary,
  'font': font,
  'corners': corners,
  'cards': cards,
};

/// The build with another app name.
BuildConfigData _named(BuildConfigData b, String name) => BuildConfigData(
  appType: b.appType,
  vertical: b.vertical,
  role: b.role,
  appName: name,
  shortName: b.shortName,
  siteUrl: b.siteUrl,
  apiBaseUrl: b.apiBaseUrl,
  authBaseUrl: b.authBaseUrl,
  androidPackage: b.androidPackage,
  iosBundleId: b.iosBundleId,
  versionName: b.versionName,
  versionCode: b.versionCode,
  primaryColor: b.primaryColor,
  splashColor: b.splashColor,
  template: b.template,
  font: b.font,
  clientId: b.clientId,
  iconUrl: b.iconUrl,
  logoUrl: b.logoUrl,
  firebaseAndroid: b.firebaseAndroid,
  firebaseIos: b.firebaseIos,
  huaweiAppId: b.huaweiAppId,
  analyticsUrl: b.analyticsUrl,
  analyticsKey: b.analyticsKey,
  appId: b.appId,
  linkBaseUrl: b.linkBaseUrl,
  siteLinkBaseUrl: b.siteLinkBaseUrl,
  crashReportUrl: b.crashReportUrl,
  sitePaths: b.sitePaths,
);

/// 110.5 The rider at Tahrir Square, for the live taxi screens.
class _TahrirLocator implements Locator {
  const _TahrirLocator();

  @override
  Future<LocateResult> current() async =>
      const LocateResult.found((lat: 30.0444, lng: 31.2357, accuracy: 8));
}

final _atTahrir = [locatorProvider.overrideWithValue(const _TahrirLocator())];

/// One screenshot: which app, how it looks and where it goes.
class Shot {
  const Shot(
    this.name, {
    required this.api,
    required this.appType,
    this.template = AppTemplate.classic,
    this.dark = false,
    this.language = 'en',
    this.location,
    this.preferences = const {},
    this.after,
    this.size = shotSize,
    this.signedIn = true,
    this.loading = false,
    this.overrides = const [],
    this.mapTiles = false,
    this.appName,
  });

  final String name;
  final FakeApi Function() api;
  final AppType appType;
  final AppTemplate template;
  final bool dark;
  final String language;

  /// Pushed after start-up; null keeps the first tab.
  final String? location;
  final Map<String, Object> preferences;

  /// Taps or scrolls once the screen is open.
  final Future<void> Function(WidgetTester tester, GoRouter router)? after;
  final Size size;
  final bool signedIn;

  /// Captures the first frame after [location] opens (loading states).
  final bool loading;

  /// 110.5 More provider overrides (the phone's position).
  final List<Override> overrides;

  /// 110.5 The drawn street map's tiles, for the live taxi screens.
  final bool mapTiles;

  /// 110.5 The app's name in the build, where a screen shows it (the live
  /// taxi map's name over the map).
  final String? appName;

  /// Opens the app as the shot says; returns it, for [close].
  Future<TestApp> render(WidgetTester tester) async {
    final lightIcons = ValueNotifier(dark);
    addTearDown(lightIcons.dispose);
    usePhone(tester, size: size);
    seedDemoImages();
    if (mapTiles) seedMapTiles();
    final app = TestApp(
      api: api(),
      appType: appType,
      template: template,
      signedIn: signedIn,
      guest: !signedIn,
      preferences: {
        'settings.theme_mode': dark ? 'dark' : 'light',
        'settings.language': language,
        ...preferences,
      },
      wrap: (app) => withStatusBar(app, lightIcons: lightIcons),
      overrides: overrides,
      build: appName == null ? null : (b) => _named(b, appName!),
    );
    await app.pump(tester);
    final router = app.container.read(appRouterProvider);
    if (location != null) {
      router.push(location!);
      if (loading) {
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 400));
        return app;
      }
      await TestApp.settle(tester, 20);
    }
    if (after != null) {
      await after!(tester, router);
      await TestApp.settle(tester, 20);
    }
    // Let ink, page transitions and fades finish.
    await tester.pump(const Duration(seconds: 1));
    lightIcons.value = appWantsLightStatusBar(tester);
    await tester.pump();
    expect(tester.takeException(), isNull, reason: name);
    return app;
  }

  /// 110.5 Closes the app after the screenshot: the live taxi screens'
  /// polling stops with it, so no timer is left.
  static Future<void> close(TestApp app, WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox());
    app.container.dispose();
    await TestApp.settle(tester, 2);
  }
}

final websiteShots = <Shot>[
  // Academy, Yallapp's own colors.
  Shot('academy-home', api: DemoApi.academy, appType: AppType.lms),
  Shot(
    'academy-course',
    api: DemoApi.academy,
    appType: AppType.lms,
    location: '/course/1',
  ),
  Shot(
    'academy-lesson',
    api: DemoApi.academy,
    appType: AppType.lms,
    location: '/lesson/105',
  ),
  Shot(
    'academy-home-ar',
    api: () => DemoApi.academy(arabic: true),
    appType: AppType.lms,
    language: 'ar',
  ),
  Shot(
    'academy-home-dark',
    api: DemoApi.academy,
    appType: AppType.lms,
    dark: true,
  ),
  // Store: Yallapp's colors, then two client palettes.
  Shot(
    'store-home',
    api: DemoApi.store,
    appType: AppType.store,
    preferences: {CartController.storageKey: jsonEncode(DemoApi.cartItems())},
  ),
  Shot(
    'store-product',
    api: DemoApi.store,
    appType: AppType.store,
    location: '/product/21',
    preferences: {CartController.storageKey: jsonEncode(DemoApi.cartItems())},
  ),
  Shot(
    'store-cart',
    api: DemoApi.store,
    appType: AppType.store,
    preferences: {CartController.storageKey: jsonEncode(DemoApi.cartItems())},
    after: (tester, router) async => router.go('/cart'),
  ),
  Shot(
    'store-home-bold',
    api: () => DemoApi.store(
      primary: _forest,
      appearance: _appearance(
        template: 'bold',
        font: 'Outfit',
        secondary: _coral,
      ),
    ),
    appType: AppType.store,
    template: AppTemplate.bold,
    preferences: {CartController.storageKey: jsonEncode(DemoApi.cartItems())},
  ),
  Shot(
    'store-home-minimal',
    api: () => DemoApi.store(
      appearance: _appearance(template: 'minimal', font: 'Manrope'),
    ),
    appType: AppType.store,
    template: AppTemplate.minimal,
    preferences: {CartController.storageKey: jsonEncode(DemoApi.cartItems())},
  ),
  // 26 Restaurant: the menu, a dish's options and an order on its way.
  Shot(
    'restaurant-menu',
    api: DemoApi.restaurant,
    appType: AppType.store,
    after: (tester, router) async => router.go('/shop'),
  ),
  Shot(
    'restaurant-dish',
    api: DemoApi.restaurant,
    appType: AppType.store,
    location: '/product/53',
    after: (tester, router) async {
      await tester.tap(find.text('Add to cart'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Double'));
      await tester.tap(find.text('Cheddar'));
      await tester.ensureVisible(find.text('Fries'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Fries'));
    },
  ),
  Shot(
    'restaurant-order',
    api: DemoApi.restaurant,
    appType: AppType.store,
    location: '/account/orders/1042',
  ),
  // Bookings.
  Shot(
    'bookings-services',
    api: DemoApi.bookings,
    appType: AppType.booking,
    location: '/services',
  ),
  Shot(
    'bookings-slots',
    api: DemoApi.bookings,
    appType: AppType.booking,
    location: '/service/1',
    after: (tester, router) async {
      // Scroll to the free times and pick one.
      await tester.drag(
        find.byType(CustomScrollView).first,
        const Offset(0, -238),
      );
      await tester.pump(const Duration(milliseconds: 500));
      await tester.tap(find.text('11:00').first);
    },
  ),
  // 21 Clinic: a doctor's profile and the intake form.
  Shot(
    'clinic-doctor',
    api: DemoApi.clinic,
    appType: AppType.booking,
    location: '/service/1',
    after: (tester, router) async {
      await tester.tap(find.text('Dr. Kerem Aksoy').first);
      await tester.pump(const Duration(milliseconds: 500));
      await tester.tap(find.text('View profile'));
    },
  ),
  Shot(
    'clinic-intake',
    api: DemoApi.clinic,
    appType: AppType.booking,
    location: '/service/1',
    after: (tester, router) async {
      await tester.scrollUntilVisible(
        find.text('11:00'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('11:00').first);
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.textContaining(RegExp(r'^Book ')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('intake-reason')),
        'A check-up and a cleaning. One tooth on the left is sensitive to '
        'cold.',
      );
      await tester.tap(find.text('No'));
      await tester.testTextInput.receiveAction(TextInputAction.done);
      FocusManager.instance.primaryFocus?.unfocus();
    },
  ),
  // 27 Gym & fitness: the day's classes and the membership.
  Shot(
    'fitness-timetable',
    api: DemoApi.fitness,
    appType: AppType.booking,
    after: (tester, router) async => router.go('/classes'),
  ),
  Shot(
    'fitness-membership',
    api: DemoApi.fitness,
    appType: AppType.booking,
    after: (tester, router) async => router.go('/memberships'),
  ),
  // Real estate, a client palette.
  Shot(
    'realestate-search',
    api: () => DemoApi.realEstate(
      primary: _nileBlue,
      appearance: _appearance(
        template: 'classic',
        font: 'Plus Jakarta Sans',
        secondary: _sand,
      ),
    ),
    appType: AppType.realEstate,
  ),
  Shot(
    'realestate-listing',
    api: () => DemoApi.realEstate(
      primary: _nileBlue,
      appearance: _appearance(
        template: 'classic',
        font: 'Plus Jakarta Sans',
        secondary: _sand,
      ),
    ),
    appType: AppType.realEstate,
    location: '/listing/1042',
  ),
  Shot(
    'realestate-search-ar',
    api: () => DemoApi.realEstate(
      arabic: true,
      primary: _nileBlue,
      appearance: _appearance(
        template: 'classic',
        font: 'Plus Jakarta Sans',
        secondary: _sand,
      ),
    ),
    appType: AppType.realEstate,
    language: 'ar',
  ),
  // News & blog, a client palette (23).
  Shot(
    'news-home',
    api: () => DemoApi.news(
      primary: _harbour,
      appearance: _appearance(
        template: 'minimal',
        font: 'Lexend',
        secondary: _berry,
      ),
    ),
    appType: AppType.news,
    template: AppTemplate.minimal,
  ),
  Shot(
    'news-article',
    api: () => DemoApi.news(
      primary: _harbour,
      appearance: _appearance(
        template: 'minimal',
        font: 'Lexend',
        secondary: _berry,
      ),
    ),
    appType: AppType.news,
    template: AppTemplate.minimal,
    location: '/article/101',
  ),
  // Events & tickets, a client palette (28).
  Shot(
    'events-list',
    api: () => DemoApi.events(
      primary: _berry,
      appearance: _appearance(
        template: 'bold',
        font: 'Outfit',
        secondary: _sand,
        corners: 'round',
        cards: 'elevated',
      ),
    ),
    appType: AppType.events,
    template: AppTemplate.bold,
  ),
  Shot(
    'events-ticket',
    api: () => DemoApi.events(
      primary: _berry,
      appearance: _appearance(
        template: 'bold',
        font: 'Outfit',
        secondary: _sand,
        corners: 'round',
        cards: 'elevated',
      ),
    ),
    appType: AppType.events,
    template: AppTemplate.bold,
    location: '/ticket/K7QM4XP2HD9W',
  ),
  // Charity & donations, a client palette (29).
  Shot(
    'charity-home',
    api: () => DemoApi.charity(
      primary: _charity,
      appearance: _appearance(
        template: 'bold',
        font: 'Manrope',
        secondary: _sand,
        corners: 'round',
      ),
    ),
    appType: AppType.donations,
    template: AppTemplate.bold,
  ),
  Shot(
    'charity-campaign',
    api: () => DemoApi.charity(
      primary: _charity,
      appearance: _appearance(
        template: 'bold',
        font: 'Manrope',
        secondary: _sand,
        corners: 'round',
      ),
    ),
    appType: AppType.donations,
    template: AppTemplate.bold,
    location: '/campaign/1',
  ),
  // 103R A home page designed in Yallapp Studio, light and dark.
  Shot('studio-cafe-home', api: DemoApi.studioCafe, appType: AppType.store),
  Shot(
    'studio-cafe-home-dark',
    api: DemoApi.studioCafe,
    appType: AppType.store,
    dark: true,
  ),
  // 104 A delivery company (Yallapp Studio): sending a parcel, following
  // it, and a courier's jobs.
  Shot('delivery-send', api: DemoApi.delivery, appType: AppType.delivery),
  Shot(
    'delivery-shipment',
    api: DemoApi.delivery,
    appType: AppType.delivery,
    location: '/shipment/1',
  ),
  Shot(
    'delivery-courier',
    api: () => DemoApi.delivery(courier: true),
    appType: AppType.delivery,
    after: (tester, router) async => router.go('/courier'),
  ),
  // Yallapp Studio's demos: food delivery (Sofra Eats) and rides (Masar).
  Shot('food-restaurants', api: DemoApi.food, appType: AppType.food),
  Shot(
    'food-menu',
    api: DemoApi.food,
    appType: AppType.food,
    location: '/restaurant/1',
  ),
  Shot(
    'food-order',
    api: DemoApi.food,
    appType: AppType.food,
    location: '/food-order/1',
  ),
  Shot(
    'rides-where',
    api: DemoApi.rides,
    appType: AppType.rides,
    after: (tester, router) async {
      Future<void> place(String prefix, String address, String at) async {
        await tester.dragUntilVisible(
          find.byKey(ValueKey('$prefix-paste')),
          find.byKey(const ValueKey('ride-form')),
          const Offset(0, -150),
        );
        await tester.pumpAndSettle();
        await tester.enterText(
          find.byKey(ValueKey('$prefix-address')),
          address,
        );
        await tester.tap(find.byKey(ValueKey('$prefix-paste')));
        await tester.pumpAndSettle();
        await tester.enterText(
          find.byKey(const ValueKey('paste-link-field')),
          at,
        );
        await tester.tap(find.text('Use this place'));
        await tester.pumpAndSettle();
      }

      await place('pickup', 'Tahrir Square', '30.0444, 31.2357');
      await place('dropoff', 'Cairo Tower, Zamalek', '30.0459, 31.2243');
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pumpAndSettle();
      // "When" at the top, the vehicle types under it.
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      await Scrollable.ensureVisible(tester.element(find.text('When')));
      await tester.pumpAndSettle();
    },
  ),
  Shot(
    'rides-ride',
    api: DemoApi.rides,
    appType: AppType.rides,
    location: '/ride/1',
  ),
  Shot(
    'rides-driver',
    api: () => DemoApi.rides(driver: true),
    appType: AppType.rides,
    after: (tester, router) async => router.go('/driver'),
  ),
  // 110.5 More of Studio's demos: a live taxi app (Lamha Taxi), a school
  // (Nakhla School) and an academy with many teachers (Rawaq Academy).
  Shot(
    'taxi-map',
    api: () => DemoApi.taxi(ride: false),
    appName: 'Lamha Taxi',
    appType: AppType.rides,
    template: AppTemplate.bold,
    overrides: _atTahrir,
    mapTiles: true,
  ),
  Shot(
    'taxi-ride',
    api: DemoApi.taxi,
    appName: 'Lamha Taxi',
    appType: AppType.rides,
    template: AppTemplate.bold,
    location: '/ride/1',
    overrides: _atTahrir,
    mapTiles: true,
  ),
  Shot(
    'taxi-driver',
    api: () => DemoApi.taxi(driver: true),
    appName: 'Lamha Taxi',
    appType: AppType.rides,
    template: AppTemplate.bold,
    overrides: _atTahrir,
    mapTiles: true,
    after: (tester, router) async => router.go('/driver'),
  ),
  Shot('school-today', api: DemoApi.school, appType: AppType.school),
  Shot(
    'school-homework',
    api: DemoApi.school,
    appType: AppType.school,
    location: '/school/homework',
  ),
  Shot(
    'school-classroom',
    api: DemoApi.school,
    appType: AppType.school,
    location: '/classroom/class/2/attendance',
  ),
  Shot(
    'teachers-list',
    api: DemoApi.teachers,
    appType: AppType.lms,
    location: '/teachers',
  ),
  Shot(
    'teachers-teacher',
    api: DemoApi.teachers,
    appType: AppType.lms,
    location: '/teachers/1',
  ),
  Shot(
    'teachers-desk',
    api: DemoApi.teachers,
    appType: AppType.lms,
    after: (tester, router) async => router.go('/teacher-desk'),
  ),
];
