import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';

import '../../support/fake_api.dart';
import '../../support/test_app.dart';
import 'demo_api.dart';
import 'demo_images.dart';
import 'shot.dart';

export 'shot.dart';

/// Colors a client could pick in the dashboard.
const _forest = '#1E4D3F';
const _coral = '#E8795C';
const _nileBlue = '#123A5C';
const _sand = '#C9A24B';

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

  Future<void> render(WidgetTester tester) async {
    final lightIcons = ValueNotifier(dark);
    addTearDown(lightIcons.dispose);
    usePhone(tester, size: size);
    seedDemoImages();
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
    );
    await app.pump(tester);
    final router = app.container.read(appRouterProvider);
    if (location != null) {
      router.push(location!);
      if (loading) {
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 400));
        return;
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
];
