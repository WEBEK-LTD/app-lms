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
];
