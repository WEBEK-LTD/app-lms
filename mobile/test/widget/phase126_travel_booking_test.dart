import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/auth/auth_controller.dart';
import 'package:yallapp/core/config/build_config.dart';
import 'package:yallapp/core/providers.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/modules/travel/data/travel_providers.dart';
import 'package:yallapp/modules/travel/travel_paths.dart';

import '../support/test_app.dart';
import '../support/travel_fixtures.dart';

/// 126 Booking and after, in English and in Arabic: a stay paid at the
/// hotel, a stay and flights paid now on the company's payment page, the
/// trip, the boarding passes kept on the phone, cancelling, and a price
/// alert.
void usePhone(WidgetTester tester) {
  final view = tester.view
    ..physicalSize = const Size(390, 844) * 2
    ..devicePixelRatio = 2;
  addTearDown(view.reset);
}

/// 126.10 Where the passes of [booking] are kept for the signed-in person.
String passesKey(TestApp app, int booking) {
  final build = app.container.read(appEnvironmentProvider).build;
  return boardingPassesKey(
    build.appId ?? apiUrlOf(build),
    app.container.read(authControllerProvider).user?.id,
    booking,
  );
}

TestApp travelApp({String lang = 'en'}) => TestApp(
  api: travelFake(),
  appType: AppType.travel,
  signedIn: true,
  preferences: {'settings.language': lang},
);

Future<void> open(TestApp app, WidgetTester tester, String location) async {
  final router = app.container.read(appRouterProvider);
  if (app.container.read(appModuleProvider).isTabPath(location)) {
    router.go(location);
  } else {
    router.push(location);
  }
  await TestApp.settle(tester, 20);
}

Future<void> tapText(WidgetTester tester, String text) async {
  final target = find.text(text).last;
  await tester.ensureVisible(target);
  await TestApp.settle(tester);
  await tester.tap(target);
  await TestApp.settle(tester, 20);
}

List<({String method, String path, Map<String, dynamic>? query, Object? body})>
sent(TestApp app, String method, String path) => [
  for (final r in app.api.travelRequests)
    if (r.method == method && r.path == path) r,
];

void main() {
  for (final lang in ['en', 'ar']) {
    final ar = lang == 'ar';
    testWidgets('126 a stay paid at the hotel, booked under the signed-in '
        'guest\'s name ($lang)', (tester) async {
      usePhone(tester);
      final app = travelApp(lang: lang);
      await app.pump(tester);
      app.container.read(staySearchProvider.notifier).set(fixtureStay());
      app.container.read(tripChoiceProvider.notifier).set(stayChoice());
      await open(app, tester, TravelPaths.checkout);
      await tapText(tester, ar ? 'الدفع في الفندق' : 'Pay at the hotel');
      await tapText(tester, ar ? 'تأكيد الحجز' : 'Confirm booking');
      final booked =
          sent(app, 'POST', '/me/travel/bookings').single.body as Map;
      expect(booked['payment'], 'at_hotel');
      expect(booked['stay'], {
        'hotel_id': 1,
        'room_id': travelHotel.rooms.first.id,
        'rate_id': 'bb',
        'check_in': '2026-11-14',
        'check_out': '2026-11-18',
        'guests': 2,
        'rooms': 1,
      });
      expect(booked['travellers'], [
        {'first_name': 'Sara', 'last_name': 'Yilmaz'},
      ]);
      expect(booked['requests'], isEmpty);
      // Nothing to pay: straight to the trip, in one place.
      expect(sent(app, 'POST', '/me/travel/bookings/1/pay'), isEmpty);
      expect(
        app.container.read(appRouterProvider).state.uri.path,
        TravelPaths.trip(1),
      );
      expect(find.text('Luxor'), findsWidgets);
      expect(find.text('Nile Garden Resort'), findsWidgets);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('126 a stay and flights paid now: one booking, one price, on '
      'the company\'s payment page', (tester) async {
    usePhone(tester);
    final app = travelApp();
    await app.pump(tester);
    app.container.read(staySearchProvider.notifier).set(fixtureStay());
    app.container.read(flightSearchProvider.notifier).set(fixtureFlights());
    app.container.read(tripChoiceProvider.notifier).set(tripChoice());
    await open(app, tester, TravelPaths.bundle);
    // The quote's total and what it saves.
    expect(
      find.text(travelJson('quote')['total_formatted'] as String),
      findsWidgets,
    );
    await tapText(tester, 'Reserve trip');
    // Two travellers, as on their passports: the second's name is missing.
    await tapText(
      tester,
      'Confirm and pay ${travelJson('quote')['total_formatted']}',
    );
    expect(sent(app, 'POST', '/me/travel/bookings'), isEmpty);
    expect(find.text('Enter every traveller\'s name.'), findsOneWidget);
    final fields = find.byType(TextField);
    expect(fields, findsNWidgets(4));
    await tester.enterText(fields.at(2), 'Omar');
    await tester.enterText(fields.at(3), 'Hassan');
    await TestApp.settle(tester);
    await tapText(
      tester,
      'Confirm and pay ${travelJson('quote')['total_formatted']}',
    );
    final booked = sent(app, 'POST', '/me/travel/bookings').single.body as Map;
    expect(booked['payment'], 'now');
    expect(booked['transfer'], isTrue);
    expect(booked['flight'], {
      'outbound_id': 1,
      'inbound_id': 2,
      'fare': 'standard',
      'travellers': 2,
      'seats_out': ['14A', '14B'],
      'seats_back': [null, null],
      'bags': 1,
      'meals': 0,
    });
    expect(booked['travellers'], [
      {'first_name': 'Sara', 'last_name': 'Yilmaz'},
      {'first_name': 'Omar', 'last_name': 'Hassan'},
    ]);
    // Paid on the company's own payment page, in the app.
    expect(sent(app, 'POST', '/me/travel/bookings/1/pay'), hasLength(1));
    expect(
      app.webViews.requests.last.url.toString(),
      'https://pay.example.test/checkout/T-SAFRA1',
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('126 the boarding passes: each traveller\'s code, the gate, '
      'and kept on the phone to show offline', (tester) async {
    usePhone(tester);
    final app = travelApp();
    await app.pump(tester);
    await open(app, tester, TravelPaths.passes(1));
    expect(find.text('LAYLA HASSAN'), findsOneWidget);
    expect(find.text('B12'), findsWidgets);
    expect(find.text('14A'), findsOneWidget);
    expect(find.byType(QrImageView), findsOneWidget);
    final prefs = await SharedPreferences.getInstance();
    // 126.10 Kept under this app's, this person's and this booking's key.
    final key = passesKey(app, 1);
    expect(key, startsWith('travel.passes.'));
    expect(key, isNot('travel.passes.1'));
    final kept = prefs.getString(key);
    expect(kept, contains('YT1.T-SAFRA1.1.1.signed'));
    expect(kept, contains('OMAR HASSAN'));
    // The next traveller's pass.
    await tester.drag(find.byType(PageView), const Offset(-300, 0));
    await TestApp.settle(tester);
    expect(find.text('OMAR HASSAN'), findsOneWidget);
    // Signing out forgets them.
    await app.container.read(authControllerProvider.notifier).signOut();
    expect(
      prefs.getKeys().where((k) => k.startsWith('travel.passes.')),
      isEmpty,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('126.10 passes kept for a booking that has none anymore are '
      'forgotten', (tester) async {
    usePhone(tester);
    final app = travelApp();
    final fake = app.api.travelHandler!;
    app.api.travelHandler = (method, path, query, body) =>
        path == '/me/travel/bookings/1/passes'
        ? throw const ApiException(
            statusCode: 409,
            code: 'not_open',
            message: 'Boarding passes show here once check-in opens.',
          )
        : fake(method, path, query, body);
    await app.pump(tester);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      passesKey(app, 1),
      jsonEncode(travelJson('passes')['items']),
    );
    await open(app, tester, TravelPaths.passes(1));
    expect(find.text('LAYLA HASSAN'), findsNothing);
    expect(prefs.containsKey(passesKey(app, 1)), isFalse);
    expect(tester.takeException(), isNull);
  });

  testWidgets('126.10 the trip counts down to the moment the platform gives, '
      'not the local time read in the phone\'s zone', (tester) async {
    usePhone(tester);
    final app = travelApp();
    final fake = app.api.travelHandler!;
    final at = DateTime.now().toUtc().add(
      const Duration(days: 3, hours: 5, minutes: 30),
    );
    app.api.travelHandler = (method, path, query, body) =>
        method == 'GET' && path == '/me/travel/bookings/1'
        ? {
            ...travelJson('booking'),
            'starts': '2020-01-01T09:00',
            'starts_at': at.toIso8601String(),
          }
        : fake(method, path, query, body);
    await app.pump(tester);
    await open(app, tester, TravelPaths.trip(1));
    expect(find.text('Starts in 3 days, 5 h'), findsOneWidget);
    expect(
      TravelBooking.fromJson(travelJson('booking')).startsAt,
      DateTime.parse(travelJson('booking')['starts_at'] as String),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('126 cancelling a trip says what it refunds first', (
    tester,
  ) async {
    usePhone(tester);
    final app = travelApp();
    await app.pump(tester);
    await open(app, tester, TravelPaths.manage(1));
    await tapText(tester, 'Cancel booking');
    expect(
      find.text(
        'You\'ll get ${travelJson('booking')['cancel_refund_formatted']} back.',
      ),
      findsOneWidget,
    );
    await tapText(tester, 'Cancel booking');
    expect(sent(app, 'POST', '/me/travel/bookings/1/cancel'), hasLength(1));
    expect(find.text('Your booking is cancelled.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  for (final lang in ['en', 'ar']) {
    testWidgets('126 watching a route\'s price ($lang)', (tester) async {
      usePhone(tester);
      final app = travelApp(lang: lang);
      await app.pump(tester);
      app.container.read(flightSearchProvider.notifier).set(fixtureFlights());
      await open(app, tester, TravelPaths.alerts);
      final ar = lang == 'ar';
      expect(
        find.text(ar ? 'أي وجهة بأقل من \$600.00' : 'Anywhere under \$600.00'),
        findsWidgets,
      );
      await tapText(tester, ar ? 'جديد' : 'New');
      await tapText(tester, ar ? 'تابع السعر' : 'Watch the price');
      final watched = sent(app, 'POST', '/me/travel/alerts').single.body as Map;
      expect(watched['kind'], 'flight');
      expect(watched['from'], 'CAI');
      expect(watched['to'], 'LXR');
      expect(watched['travellers'], 2);
      expect(tester.takeException(), isNull);
    });
  }
}
