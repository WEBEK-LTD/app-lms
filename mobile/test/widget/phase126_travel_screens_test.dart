import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_module.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/inner_screens.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/modules/travel/data/travel_providers.dart';
import 'package:yallapp/modules/travel/travel_paths.dart';

import '../support/test_app.dart';
import '../support/travel_fixtures.dart';

/// 126 The travel app's screens as the approved designs have them, on what
/// the platform serves: the tabs of each mode, every screen in English and
/// in Arabic (right to left), by day and by night, and a notification
/// opening its trip.
void usePhone(WidgetTester tester) {
  final view = tester.view
    ..physicalSize = const Size(390, 844) * 2
    ..devicePixelRatio = 2;
  addTearDown(view.reset);
}

List<String?> tabPaths(TestApp app) =>
    app.container.read(shellTabsProvider).map((t) => t.location).toList();

TestApp travelApp({
  String mode = 'both',
  bool chat = false,
  bool singleHotel = false,
  bool signedIn = true,
  String lang = 'en',
  bool dark = false,
}) => TestApp(
  api: travelFake(mode: mode, chat: chat, singleHotel: singleHotel),
  appType: AppType.travel,
  signedIn: signedIn,
  guest: !signedIn,
  preferences: {
    'settings.language': lang,
    'settings.theme_mode': dark ? 'dark' : 'light',
  },
);

/// Nothing went wrong drawing the screen (the whole report when it did).
void drewWell(WidgetTester tester, String what) {
  final error = tester.takeException();
  if (error == null) return;
  fail('$what: ${error is FlutterError ? error.toStringDeep() : error}');
}

/// Opens [location] on top (or as its tab) and lets it load.
Future<void> open(TestApp app, WidgetTester tester, String location) async {
  final router = app.container.read(appRouterProvider);
  if (app.container.read(appModuleProvider).isTabPath(location)) {
    router.go(location);
  } else {
    router.push(location);
  }
  await TestApp.settle(tester, 20);
}

void main() {
  test('126 a trip\'s and an alert\'s notification open the trip and the '
      'alerts', () {
    expect(
      pushTargetLocation({'type': 'travel_update', 'booking_id': '5'}),
      '/travel/trip/5',
    );
    expect(pushTargetLocation({'type': 'travel_update'}), TravelPaths.trips);
    expect(pushTargetLocation({'type': 'travel_alert'}), TravelPaths.alerts);
    final n = InboxNotification.fromJson({
      'id': 1,
      'title': 'SF 691 is delayed',
      'body': 'Now leaving at 11:05.',
      'type': 'travel_update',
      'booking_id': 5,
      'created_at': '2026-11-13T08:00:00Z',
      'read': false,
    });
    expect(n.type, NotificationType.travelUpdate);
    expect(pushTargetLocation(n.target), '/travel/trip/5');
    expect(
      Paths.requiresAuth('/travel/trip/5/passes'),
      isTrue,
      reason: 'a trip is the traveller\'s own',
    );
  });

  test('126 Studio can draw a page around every travel screen, at its '
      'address in the app', () {
    for (final id in [
      'travel_hotel',
      'hotel_results',
      'hotel_map',
      'hotel_rooms',
      'hotel_checkout',
      'flight_results',
      'flight_fares',
      'price_calendar',
      'seat_map',
      'flight_extras',
      'trip_bundle',
      'trip_checkout',
      'travel_trip',
      'boarding_pass',
      'manage_booking',
      'review_stay',
    ]) {
      expect(innerScreenPaths[id], startsWith('/travel/'), reason: id);
    }
  });

  test('126 a one-hotel app opens on the hotel, whatever its first tab', () {
    final config = AppConfig.fromJson({
      ...travelFake(mode: 'hotels', singleHotel: true).config,
    });
    final tabs = oneHotelFirst([
      ShellTab(
        icon: Icons.home,
        label: (_) => 'Home',
        location: Paths.page('home'),
      ),
      ShellTab(
        icon: Icons.person,
        label: (_) => 'Account',
        location: Paths.account,
      ),
    ], config);
    expect(tabs.map((t) => t.location), [TravelPaths.explore, Paths.account]);
    // Two hotels, or flights too: the tabs as they are.
    final both = AppConfig.fromJson({...travelFake().config});
    expect(
      oneHotelFirst(tabs.reversed.toList(), both).first.location,
      Paths.account,
    );
  });

  group('126 the tabs follow the parts the company has on', () {
    testWidgets('hotels and flights: Explore, Stays, Flights, Trips, '
        'Account', (tester) async {
      usePhone(tester);
      final app = travelApp();
      await app.pump(tester);
      expect(tabPaths(app), [
        TravelPaths.explore,
        TravelPaths.stays,
        TravelPaths.flights,
        TravelPaths.trips,
        Paths.account,
      ]);
      expect(find.text('Stays'), findsWidgets);
      expect(find.text('Where does the next story begin?'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Trending this month'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Luxor'), findsWidgets);
      drewWell(tester, 'the screen');
    });

    testWidgets('hotels only: Explore, Saved, Bookings, Messages, Account', (
      tester,
    ) async {
      usePhone(tester);
      final app = travelApp(mode: 'hotels', chat: true);
      await app.pump(tester);
      expect(tabPaths(app), [
        TravelPaths.explore,
        TravelPaths.saved,
        TravelPaths.trips,
        Paths.chat,
        Paths.account,
      ]);
      expect(find.text('Bookings'), findsOneWidget);
      expect(find.text('Stay somewhere\nunforgettable.'), findsOneWidget);
      drewWell(tester, 'the screen');
    });

    testWidgets('flights only: Search, Alerts, Trips, Help, Account', (
      tester,
    ) async {
      usePhone(tester);
      final app = travelApp(mode: 'flights', chat: true);
      await app.pump(tester);
      expect(tabPaths(app), [
        TravelPaths.explore,
        TravelPaths.alerts,
        TravelPaths.trips,
        Paths.chat,
        Paths.account,
      ]);
      expect(find.text('Help'), findsOneWidget);
      expect(find.text('The whole sky,\none search.'), findsOneWidget);
      drewWell(tester, 'the screen');
    });

    testWidgets('one hotel: the app opens on its page', (tester) async {
      usePhone(tester);
      final app = travelApp(mode: 'hotels', singleHotel: true);
      await app.pump(tester);
      expect(find.text('Nile Garden Resort'), findsWidgets);
      expect(find.text('Choose a room'), findsOneWidget);
      drewWell(tester, 'the screen');
    });
  });

  // Every screen, in each language and by night, without anything spilling over.
  for (final (lang, dark) in [('en', false), ('ar', false), ('en', true)]) {
    testWidgets('126 every travel screen draws in $lang'
        '${dark ? ', dark' : ''}', (tester) async {
      usePhone(tester);
      final app = travelApp(lang: lang, dark: dark);
      await app.pump(tester);
      drewWell(tester, 'the screen');
      app.container.read(staySearchProvider.notifier).set(fixtureStay());
      app.container.read(flightSearchProvider.notifier).set(fixtureFlights());
      final ar = lang == 'ar';
      final screens = <String, String?>{
        TravelPaths.stays: ar ? 'ابحث عن إقامة' : 'Search stays',
        TravelPaths.flights: ar ? 'ابحث عن رحلات طيران' : 'Search flights',
        TravelPaths.hotels: 'Nile Garden Resort',
        TravelPaths.map: 'Nile Garden Resort',
        TravelPaths.hotel(1): ar ? 'اختر غرفة' : 'Choose a room',
        TravelPaths.rooms(1): 'Deluxe Nile View · King',
        TravelPaths.flightResults: '10:15 → 11:20',
        TravelPaths.calendar: ar ? 'التقويم' : 'Calendar',
        TravelPaths.trips: 'Luxor',
        TravelPaths.trip(1): 'Luxor',
        TravelPaths.passes(1): 'LAYLA HASSAN',
        TravelPaths.manage(1): 'T-SAFRA1',
        TravelPaths.review(1): ar ? 'إرسال التقييم' : 'Send review',
        TravelPaths.alerts: ar ? 'التنبيهات' : 'Alerts',
        TravelPaths.saved: 'Nile Garden Resort',
      };
      for (final MapEntry(key: location, value: text) in screens.entries) {
        await open(app, tester, location);
        drewWell(tester, location);
        if (text != null) {
          expect(find.text(text), findsWidgets, reason: location);
        }
      }
      // On the way to booking: a stay, then a stay and flights together.
      app.container.read(tripChoiceProvider.notifier).set(stayChoice());
      await open(app, tester, TravelPaths.checkout);
      drewWell(tester, 'checkout');
      expect(
        find.text(ar ? 'التأكيد والدفع' : 'Confirm and pay'),
        findsOneWidget,
      );
      app.container.read(tripChoiceProvider.notifier).set(tripChoice());
      for (final MapEntry(key: location, value: text) in {
        TravelPaths.fares: ar ? 'اختر فئة الأجرة' : 'Choose your fare',
        TravelPaths.seats: '14',
        TravelPaths.extras: ar ? 'الحقائب والوجبات' : 'Bags and meals',
        TravelPaths.bundle: ar ? 'سعر واحد' : 'ONE PRICE',
        TravelPaths.book: ar
            ? 'المسافرون، كما في جواز السفر'
            : 'Travellers, as on the passport',
      }.entries) {
        await open(app, tester, location);
        drewWell(tester, location);
        expect(find.text(text), findsWidgets, reason: location);
      }
      if (ar) {
        expect(
          Directionality.of(tester.element(find.byType(Scaffold).last)),
          TextDirection.rtl,
        );
      }
    });
  }
}
