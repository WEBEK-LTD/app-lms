import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:yallapp/modules/delivery/data/delivery_providers.dart';
import 'package:yallapp/modules/shared/pages/content_blocks.dart'
    show pageClockProvider;
import 'package:yallapp/modules/store/data/cart_controller.dart';

import '../../support/fake_api.dart';
import '../../support/test_app.dart';
import 'demo_api.dart';
import 'premium_academy.dart';
import 'studio_demo.dart';
import 'demo_images.dart';
import 'map_tiles.dart';
import 'shot.dart';
import 'zad.dart';

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

/// 112.3 The company's second app: the drivers' or the couriers' screens
/// are in it only.
BuildConfigData _driverApp(BuildConfigData b) =>
    b.copyWith(role: AppRole.driver);
BuildConfigData _courierApp(BuildConfigData b) =>
    b.copyWith(role: AppRole.courier);

/// The Sahm Express parcel's trip, Nasr City to Maadi: its middle, and its
/// ends.
const _sahmTrip = (lat: 30.0082, lng: 31.2935);
const _sahmEnds = [(lat: 30.0561, lng: 31.3301), (lat: 29.9602, lng: 31.2569)];

/// 110.5 The rider at Tahrir Square, for the live taxi screens.
class _TahrirLocator implements Locator {
  const _TahrirLocator();

  @override
  Future<LocateResult> current() async =>
      const LocateResult.found((lat: 30.0444, lng: 31.2357, accuracy: 8));
}

final _atTahrir = [locatorProvider.overrideWithValue(const _TahrirLocator())];

/// A ride from Tahrir Square to Cairo Tower set on the ride form, with
/// "When" at the top and each car type's fare under it.
Future<void> _whereTo(WidgetTester tester, GoRouter router) async {
  Future<void> place(String prefix, String address, String at) async {
    await tester.dragUntilVisible(
      find.byKey(ValueKey('$prefix-paste')),
      find.byKey(const ValueKey('ride-form')),
      const Offset(0, -150),
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(ValueKey('$prefix-address')), address);
    await tester.tap(find.byKey(ValueKey('$prefix-paste')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const ValueKey('paste-link-field')), at);
    await tester.tap(find.text('Use this place'));
    await tester.pumpAndSettle();
  }

  await place('pickup', 'Tahrir Square', '30.0444, 31.2357');
  await place('dropoff', 'Cairo Tower, Zamalek', '30.0459, 31.2243');
  await tester.pump(const Duration(milliseconds: 600));
  await tester.pumpAndSettle();
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pumpAndSettle();
  await Scrollable.ensureVisible(tester.element(find.text('When')));
  await tester.pumpAndSettle();
}

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
    this.build,
    this.overrides = const [],
    this.mapTiles = false,
    this.mapCenter,
    this.designPictures = false,
    this.appName,
    this.mapAround = const [],
    this.shadows = false,
    this.prepare,
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

  /// 123 Set up before the app opens (the premium academy's pictures and its
  /// lesson's video).
  final Future<void> Function(WidgetTester tester)? prepare;
  final Size size;
  final bool signedIn;

  /// Captures the first frame after [location] opens (loading states).
  final bool loading;

  /// 110.3 Changes to the build config (the app's name in the header).
  final BuildConfigData Function(BuildConfigData build)? build;

  /// 110.5 More provider overrides (the phone's position).
  final List<Override> overrides;

  /// 110.5 The drawn street map's tiles, for the live taxi screens.
  final bool mapTiles;

  /// Where the drawn map's tiles are made, when not central Cairo (the
  /// school bus in Maadi).
  final ({double lat, double lng})? mapCenter;

  /// The designs' drawn pictures in the image cache (Zad's places).
  final bool designPictures;

  /// 110.5 The app's name in the build, where a screen shows it (the live
  /// taxi map's name over the map).
  final String? appName;

  /// More places the drawn map's tiles are made around: a trip across the
  /// city, whose ends the map shows close up too.
  final List<({double lat, double lng})> mapAround;

  /// Real shadows for raised cards (tests draw them as outlines): the
  /// "elevated" card style.
  final bool shadows;

  /// Opens the app as the shot says; returns it, for [close].
  Future<TestApp> render(WidgetTester tester) async {
    final lightIcons = ValueNotifier(dark);
    addTearDown(lightIcons.dispose);
    usePhone(tester, size: size);
    seedDemoImages();
    if (designPictures) await seedDesignPictures(tester);
    if (prepare != null) await prepare!(tester);
    if (mapTiles) {
      final at = mapCenter;
      at == null ? seedMapTiles() : seedMapTiles(lat: at.lat, lng: at.lng);
      for (final place in mapAround) {
        seedMapTiles(lat: place.lat, lng: place.lng);
      }
    }
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
      build: appName == null && build == null
          ? null
          : (b) {
              final named = appName == null ? b : _named(b, appName!);
              return build == null ? named : build!(named);
            },
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
  // The website's delivery story, as Studio's delivery demo (Sahm Express):
  // sending, the parcel on the map, and the job waiting for Karim.
  Shot(
    'sahm-send',
    api: DemoApi.sahm,
    appName: 'Sahm Express',
    appType: AppType.delivery,
    template: AppTemplate.bold,
    shadows: true,
  ),
  Shot(
    'sahm-shipment',
    api: DemoApi.sahm,
    appName: 'Sahm Express',
    appType: AppType.delivery,
    template: AppTemplate.bold,
    location: '/shipment/1',
    mapTiles: true,
    mapCenter: _sahmTrip,
    mapAround: _sahmEnds,
    shadows: true,
  ),
  Shot(
    'sahm-courier',
    api: () => DemoApi.sahm(courier: true),
    appName: 'Sahm Express Courier',
    build: _courierApp,
    appType: AppType.delivery,
    template: AppTemplate.bold,
    location: '/courier-job/1',
    mapTiles: true,
    mapCenter: _sahmTrip,
    mapAround: _sahmEnds,
    shadows: true,
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
    after: _whereTo,
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
  // The website's rides story: Ahmed on board, sharing the ride, and
  // Hany's week.
  Shot(
    'taxi-on-ride',
    api: () => DemoApi.taxi(onBoard: true),
    appName: 'Lamha Taxi',
    appType: AppType.rides,
    template: AppTemplate.bold,
    location: '/ride/1',
    overrides: _atTahrir,
    mapTiles: true,
  ),
  Shot(
    'taxi-earnings',
    api: () => DemoApi.taxi(driver: true, earnings: true),
    appName: 'Lamha Taxi Driver',
    build: _driverApp,
    appType: AppType.rides,
    template: AppTemplate.bold,
    overrides: _atTahrir,
    mapTiles: true,
    after: (tester, router) async {
      router.go('/driver');
      await TestApp.settle(tester, 20);
      await tester.tap(find.text('Earnings'));
      await TestApp.settle(tester, 20);
      await tester.tap(find.text('This week'));
      await TestApp.settle(tester, 20);
      // The sheet up, for the week's days.
      await tester.drag(
        find.byKey(const ValueKey('driver-earnings')),
        const Offset(0, -290),
      );
    },
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
  // The website's school story: the parent's area, the bus coming, the
  // fees, a teacher's payslip and the library (Nakhla School).
  Shot(
    'school-parent',
    api: DemoApi.school,
    appType: AppType.school,
    after: (tester, router) async => router.go('/parent'),
  ),
  Shot(
    'school-bus',
    api: () => DemoApi.school(map: true),
    appType: AppType.school,
    location: '/school/bus?student=11',
    mapTiles: true,
    mapCenter: (lat: 29.9641, lng: 31.2531),
  ),
  Shot(
    'school-fees',
    api: DemoApi.school,
    appType: AppType.school,
    location: '/school/fees?student=11',
  ),
  Shot(
    'school-payslip',
    api: DemoApi.school,
    appType: AppType.school,
    location: '/staff/payslip/42',
  ),
  Shot(
    'school-library',
    api: DemoApi.school,
    appType: AppType.school,
    location: '/school/library',
  ),
  // The website's multi-vendor story: Zad's home, Bab El Sharq Grill's
  // menu, Zad Market's aisles by the kilo, and the groceries on their way.
  // 128 Zad as its Studio project is (test/support/zad_demo.json): the
  // photo-first home approved on 13 November 2026, its five named tabs,
  // Manrope, and its places in the demo's real photos.
  Shot(
    'zad-home',
    api: zadStudioApi,
    appName: 'Zad',
    appType: AppType.food,
    template: AppTemplate.bold,
    overrides: Zad.overrides,
    designPictures: true,
    prepare: StudioDemo.zad.prepare,
    shadows: true,
  ),
  Shot(
    'zad-grill',
    api: zadStudioApi,
    appName: 'Zad',
    appType: AppType.food,
    template: AppTemplate.bold,
    location: '/market/1',
    overrides: Zad.overrides,
    designPictures: true,
    prepare: StudioDemo.zad.prepare,
  ),
  Shot(
    'zad-market',
    api: zadStudioApi,
    appName: 'Zad',
    appType: AppType.food,
    template: AppTemplate.bold,
    location: '/market/3',
    overrides: Zad.overrides,
    designPictures: true,
    prepare: StudioDemo.zad.prepare,
  ),
  Shot(
    'zad-tracking',
    api: zadStudioApi,
    appName: 'Zad',
    appType: AppType.food,
    template: AppTemplate.bold,
    location: '/market-order/1207',
    overrides: Zad.overrides,
    designPictures: true,
    prepare: StudioDemo.zad.prepare,
    mapTiles: true,
    mapCenter: (lat: 30.0548, lng: 31.2195),
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
  // 130.17 130.18 Ufuq Academy's Signature looks' homes, by day and by night.
  for (final letter in ['a', 'b'])
    for (final dark in [false, true])
      Shot(
        'ufuq-sig-$letter-home${dark ? '-dark' : ''}',
        dark: dark,
        api: () => premiumAcademyApi(look: 'ufuq_sig_$letter.json'),
        appType: AppType.lms,
        prepare: preparePremiumAcademy,
        overrides: premiumAcademyOverrides,
      ),
  // 123 The premium academy's demo, Ufuq Academy (its story page too).
  for (final (name, location) in [
    ('premium-home', null),
    ('premium-explore', '/courses'),
    ('premium-course', '/course/1'),
    ('premium-lesson', '/lesson/301'),
    ('premium-mine', '/my-courses'),
    ('premium-account', '/account'),
    ('premium-cart', '/course-cart'),
    // 128.8 The approved home by night too.
    ('premium-home-dark', null),
  ])
    Shot(
      name,
      dark: name.endsWith('-dark'),
      // The course's page as a student sees it before joining.
      api: name == 'premium-course'
          ? () => premiumAcademyApi(enrolled: false)
          : premiumAcademyApi,
      appType: AppType.lms,
      prepare: preparePremiumAcademy,
      overrides: premiumAcademyOverrides,
      preferences: name == 'premium-cart'
          ? const {'lms.course_cart': '[1,3]'}
          : const {},
      after: location == null
          ? null
          : (tester, router) async => router.go(location),
    ),
  // 124.7 Studio's other demos as their apps are (studio_demo.dart): each
  // demo's Studio home with its header, bar and look, and two of the
  // screens it is for, inside the Studio pages drawn around them.
  Shot(
    'sahm-home',
    api: sahmStudioApi,
    appName: 'Sahm Express',
    appType: AppType.delivery,
    template: AppTemplate.bold,
    prepare: StudioDemo.sahm.prepare,
    shadows: true,
  ),
  Shot(
    'sahm-tracking',
    api: sahmStudioApi,
    appName: 'Sahm Express',
    appType: AppType.delivery,
    template: AppTemplate.bold,
    prepare: StudioDemo.sahm.prepare,
    location: '/shipment/1',
    mapTiles: true,
    mapCenter: _sahmTrip,
    mapAround: _sahmEnds,
    shadows: true,
  ),
  // The company's couriers' app: the job waiting for Karim.
  Shot(
    'sahm-job',
    api: () => sahmStudioApi(courier: true),
    appName: 'Sahm Express Courier',
    build: _courierApp,
    appType: AppType.delivery,
    template: AppTemplate.bold,
    prepare: StudioDemo.sahm.prepare,
    location: '/courier-job/1',
    mapTiles: true,
    mapCenter: _sahmTrip,
    mapAround: _sahmEnds,
    shadows: true,
  ),
  Shot(
    'sofra-home',
    api: sofraStudioApi,
    appName: 'Sofra Eats',
    appType: AppType.food,
    template: AppTemplate.bold,
    prepare: (tester) => StudioDemo.sofra.prepare(tester, sofraPhotos),
    shadows: true,
  ),
  Shot(
    'sofra-menu',
    api: sofraStudioApi,
    appName: 'Sofra Eats',
    appType: AppType.food,
    template: AppTemplate.bold,
    prepare: (tester) => StudioDemo.sofra.prepare(tester, sofraPhotos),
    location: '/restaurant/1',
    shadows: true,
  ),
  Shot(
    'sofra-order',
    api: sofraStudioApi,
    appName: 'Sofra Eats',
    appType: AppType.food,
    template: AppTemplate.bold,
    prepare: (tester) => StudioDemo.sofra.prepare(tester, sofraPhotos),
    location: '/food-order/1',
    mapTiles: true,
    shadows: true,
  ),
  // A ride app opens on its Ride tab; its Studio home is the next tab.
  Shot(
    'masar-home',
    api: masarStudioApi,
    appName: 'Masar Rides',
    appType: AppType.rides,
    template: AppTemplate.bold,
    prepare: StudioDemo.masar.prepare,
    shadows: true,
    after: (tester, router) async => router.go('/page/home'),
  ),
  Shot(
    'masar-where',
    api: () => masarStudioApi(ride: false),
    appName: 'Masar Rides',
    appType: AppType.rides,
    template: AppTemplate.bold,
    prepare: StudioDemo.masar.prepare,
    shadows: true,
    // 128 Masar opens on its Studio home (its Ride tab); "Search a place"
    // opens the ride form.
    after: (tester, router) async {
      router.go('/ride');
      await TestApp.settle(tester, 20);
      await _whereTo(tester, router);
    },
  ),
  Shot(
    'masar-driver',
    api: () => masarStudioApi(driver: true),
    appName: 'Masar Rides Driver',
    build: _driverApp,
    appType: AppType.rides,
    template: AppTemplate.bold,
    prepare: StudioDemo.masar.prepare,
    shadows: true,
    after: (tester, router) async => router.go('/driver'),
  ),
  // Lamha Taxi opens on its live map, the free taxis around the rider.
  Shot(
    'lamha-home',
    api: () => lamhaStudioApi(ride: false),
    appName: 'Lamha Taxi',
    appType: AppType.rides,
    template: AppTemplate.bold,
    prepare: StudioDemo.lamha.prepare,
    overrides: _atTahrir,
    mapTiles: true,
    shadows: true,
  ),
  Shot(
    'lamha-ride',
    api: () => lamhaStudioApi(onBoard: true),
    appName: 'Lamha Taxi',
    appType: AppType.rides,
    template: AppTemplate.bold,
    prepare: StudioDemo.lamha.prepare,
    location: '/ride/1',
    overrides: _atTahrir,
    mapTiles: true,
    shadows: true,
  ),
  Shot(
    'lamha-driver',
    api: () => lamhaStudioApi(driver: true),
    appName: 'Lamha Taxi Driver',
    build: _driverApp,
    appType: AppType.rides,
    template: AppTemplate.bold,
    prepare: StudioDemo.lamha.prepare,
    overrides: _atTahrir,
    mapTiles: true,
    shadows: true,
    after: (tester, router) async => router.go('/driver'),
  ),
  // 128 The approved home: Maths now, at 08:10, the staff app's teachers
  // elsewhere.
  Shot(
    'nakhla-home',
    api: () => nakhlaStudioApi(staffApp: true),
    appName: 'Nakhla School',
    appType: AppType.school,
    prepare: StudioDemo.nakhla.prepare,
    overrides: _nakhlaMorning,
  ),
  // 130.13–130.18 The Signature looks' homes, by day and by night.
  for (final (name, look) in [
    ('nakhla-sig-a', StudioDemo.nakhlaSigA),
    ('nakhla-sig-b', StudioDemo.nakhlaSigB),
  ])
    for (final dark in [false, true])
      Shot(
        '$name-home${dark ? '-dark' : ''}',
        dark: dark,
        api: () => nakhlaStudioApi(staffApp: true, look: look),
        appName: 'Nakhla School',
        appType: AppType.school,
        prepare: look.prepare,
        overrides: _nakhlaMorning,
        shadows: true,
      ),
  for (final (name, look) in [
    ('rawaq-sig-a', StudioDemo.rawaqSigA),
    ('rawaq-sig-b', StudioDemo.rawaqSigB),
  ])
    for (final dark in [false, true])
      Shot(
        '$name-home${dark ? '-dark' : ''}',
        dark: dark,
        api: () => rawaqStudioApi(staffApp: true, look: look),
        appName: 'Rawaq Academy',
        appType: AppType.lms,
        prepare: (tester) => look.prepare(tester, rawaqPhotos),
        shadows: true,
      ),
  Shot(
    'nakhla-parent',
    api: () => nakhlaStudioApi(staffApp: true),
    appName: 'Nakhla School',
    appType: AppType.school,
    prepare: StudioDemo.nakhla.prepare,
    after: (tester, router) async => router.go('/parent'),
  ),
  Shot(
    'nakhla-classroom',
    api: nakhlaStudioApi,
    appName: 'Nakhla School',
    appType: AppType.school,
    prepare: StudioDemo.nakhla.prepare,
    location: '/classroom/class/2/attendance',
  ),
  Shot(
    'rawaq-home',
    api: () => rawaqStudioApi(staffApp: true),
    appName: 'Rawaq Academy',
    appType: AppType.lms,
    prepare: (tester) => StudioDemo.rawaq.prepare(tester, rawaqPhotos),
  ),
  Shot(
    'rawaq-teacher',
    api: () => rawaqStudioApi(staffApp: true),
    appName: 'Rawaq Academy',
    appType: AppType.lms,
    prepare: (tester) => StudioDemo.rawaq.prepare(tester, rawaqPhotos),
    location: '/teachers/1',
  ),
  Shot(
    'rawaq-desk',
    api: rawaqStudioApi,
    appName: 'Rawaq Academy',
    appType: AppType.lms,
    prepare: (tester) => StudioDemo.rawaq.prepare(tester, rawaqPhotos),
    after: (tester, router) async => router.go('/teacher-desk'),
  ),
  // 126 Safra, Studio's travel demo: its home, a hotel and the trip.
  Shot(
    'safra-explore',
    api: safraStudioApi,
    appName: 'Safra',
    appType: AppType.travel,
    prepare: prepareSafra,
  ),
  Shot(
    'safra-hotel',
    api: safraStudioApi,
    appName: 'Safra',
    appType: AppType.travel,
    prepare: prepareSafra,
    location: '/travel/hotel/1',
  ),
  Shot(
    'safra-trip',
    api: safraStudioApi,
    appName: 'Safra',
    appType: AppType.travel,
    prepare: prepareSafra,
    after: (tester, router) async => router.go('/trips'),
  ),
];

/// 128 Nakhla School's approved home at 08:10 on a school day: Maths now,
/// Arabic next.
final _nakhlaMorning = <Override>[
  pageClockProvider.overrideWithValue(() {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day, 8, 10);
  }),
];
