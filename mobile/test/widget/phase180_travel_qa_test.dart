import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/api_exception.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/modules/travel/data/travel_providers.dart';
import 'package:yallapp/modules/travel/travel_paths.dart';

import 'package:material_symbols_icons/symbols.dart';
import 'package:yallapp/modules/travel/widgets/travel_ui.dart';

import '../support/test_app.dart';
import '../support/travel_fixtures.dart';
import 'phase126_travel_booking_test.dart'
    show open, sent, tapText, travelApp, usePhone;

/// 180 The travel template's QA (docs/qa/2026-11-18-travel-bookings/NOTES.md).
void main() {
  String path(TestApp app) =>
      app.container.read(appRouterProvider).state.uri.path;

  testWidgets('180.1 a room reserved from a stays search is booked alone, '
      'without a flight looked at earlier', (tester) async {
    usePhone(tester);
    final app = travelApp();
    await app.pump(tester);
    app.container.read(staySearchProvider.notifier).set(fixtureStay());
    app.container.read(flightSearchProvider.notifier).set(fixtureFlights());
    // A flight's fares opened and left: the choice still holds it.
    app.container.read(tripChoiceProvider.notifier).set(tripChoice());
    await open(app, tester, TravelPaths.rooms(1));
    await tapText(tester, 'Reserve');
    expect(path(app), TravelPaths.checkout);
    final choice = app.container.read(tripChoiceProvider);
    expect(choice.flight, isNull);
    expect(choice.hotel?.id, 1);
    expect(tester.takeException(), isNull);
  });

  testWidgets('180.1 the trip\'s Change: the room chosen goes back to the '
      'same trip, with its flight', (tester) async {
    usePhone(tester);
    final app = travelApp();
    await app.pump(tester);
    app.container.read(staySearchProvider.notifier).set(fixtureStay());
    app.container.read(flightSearchProvider.notifier).set(fixtureFlights());
    app.container.read(tripChoiceProvider.notifier).set(tripChoice());
    await open(app, tester, TravelPaths.bundle);
    await open(app, tester, TravelPaths.hotels);
    await open(app, tester, TravelPaths.rooms(1));
    await tapText(tester, 'Reserve');
    expect(path(app), TravelPaths.bundle);
    expect(app.container.read(tripChoiceProvider).flight, isNotNull);
    // One trip under it, not a second one stacked: Back leaves the trip.
    final router = app.container.read(appRouterProvider);
    expect(
      router.routerDelegate.currentConfiguration.matches
          .where((m) => m.matchedLocation == TravelPaths.bundle)
          .length,
      1,
    );
    expect(tester.takeException(), isNull);
  });

  group('180.2 the hotels and flights found end above Android\'s buttons', () {
    for (final screen in [TravelPaths.hotels, TravelPaths.flightResults]) {
      testWidgets(screen, (tester) async {
        // 360x800 with Android's three buttons drawn over the app, a larger font.
        const ratio = 3.0;
        tester.view
          ..devicePixelRatio = ratio
          ..physicalSize = const Size(360, 800) * ratio
          ..viewPadding = const FakeViewPadding(
            top: 24 * ratio,
            bottom: 48 * ratio,
          )
          ..padding = const FakeViewPadding(
            top: 24 * ratio,
            bottom: 48 * ratio,
          );
        tester.platformDispatcher.textScaleFactorTestValue = 1.3;
        addTearDown(tester.view.reset);
        addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        final previous = FlutterError.onError;
        FlutterError.onError = (d) {
          if (!d.exceptionAsString().contains('A RenderFlex overflowed')) {
            previous?.call(d);
          }
        };
        addTearDown(() => FlutterError.onError = previous);
        final app = travelApp();
        await app.pump(tester);
        app.container.read(staySearchProvider.notifier).set(fixtureStay());
        app.container.read(flightSearchProvider.notifier).set(fixtureFlights());
        await open(app, tester, screen);
        final vertical = find.byWidgetPredicate(
          (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
        );
        List<double> now() => [
          for (final e in vertical.evaluate())
            ((e as StatefulElement).state as ScrollableState).position.pixels,
        ];
        for (var i = 0; i < 40; i++) {
          final before = now();
          await tester.dragFrom(const Offset(180, 420), const Offset(0, -300));
          await tester.pump();
          await tester.pump(const Duration(seconds: 1));
          if (listEquals(before, now())) break;
        }
        var lowest = 0.0;
        var what = '';
        for (final e
            in find
                .descendant(
                  of: vertical,
                  matching: find.byWidgetPredicate(
                    (w) => w is RichText || w is RawImage,
                  ),
                )
                .evaluate()) {
          final box = e.renderObject as RenderBox?;
          if (box == null || !box.attached || !box.hasSize) continue;
          final bottom = box.localToGlobal(Offset(0, box.size.height)).dy;
          if (bottom > lowest) {
            lowest = bottom;
            what = e.widget is RichText
                ? (e.widget as RichText).text.toPlainText()
                : 'a picture';
          }
        }
        expect(lowest, greaterThan(0));
        expect(
          lowest,
          lessThanOrEqualTo(800 - 48 + 0.5),
          reason: '"$what" ends at $lowest, under the phone\'s buttons',
        );
      });
    }
  });

  testWidgets('180.3 the flights found: Track shows the route already '
      'watched, off stops it, on again watches it once', (tester) async {
    usePhone(tester);
    final app = travelApp();
    await app.pump(tester);
    final served = app.api.travelHandler!;
    final deleted = <int>{};
    app.api.travelHandler = (method, path, query, body) {
      final id = RegExp(r'^/me/travel/alerts/(\d+)$').firstMatch(path);
      if (method == 'DELETE' && id != null) deleted.add(int.parse(id[1]!));
      if ('$method $path' == 'GET /me/travel/alerts') {
        return {
          'items': [
            for (final a in travelJson('alerts')['items'] as List)
              if (!deleted.contains((a as Map)['id'])) a,
          ],
        };
      }
      return '$method $path' == 'GET /travel/flights'
          ? {
              ...travelJson('flights'),
              'price_level': {
                'level': 'low',
                'position': 0.2,
                'usual_from_formatted': r'$220.00',
                'usual_to_formatted': r'$320.00',
              },
            }
          : served(method, path, query, body);
    };
    app.container.read(flightSearchProvider.notifier).set(fixtureFlights());
    await open(app, tester, TravelPaths.flightResults);
    final toggle = find.byType(TravelToggle);
    // Cairo to Luxor in November, return: alert 1 watches it.
    expect(tester.widget<TravelToggle>(toggle).on, isTrue);
    await tester.tap(toggle);
    await TestApp.settle(tester, 20);
    expect(sent(app, 'DELETE', '/me/travel/alerts/1'), hasLength(1));
    expect(tester.widget<TravelToggle>(toggle).on, isFalse);
    expect(sent(app, 'POST', '/me/travel/alerts'), isEmpty);
    await tester.tap(toggle);
    await TestApp.settle(tester, 20);
    expect(sent(app, 'POST', '/me/travel/alerts'), hasLength(1));
    expect(tester.widget<TravelToggle>(toggle).on, isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('180.10 in Arabic the flights\' times point the reading way', (
    tester,
  ) async {
    usePhone(tester);
    final app = travelApp(lang: 'ar');
    await app.pump(tester);
    app.container.read(flightSearchProvider.notifier).set(fixtureFlights());
    await open(app, tester, TravelPaths.flightResults);
    final texts = [
      for (final e in find.byType(RichText).evaluate())
        (e.widget as RichText).text.toPlainText(),
    ];
    expect(texts.where((t) => t.contains('←')), isNotEmpty);
    expect(texts.where((t) => t.contains('→')), isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets('180.14 Manage booking: seats that don\'t load say so, with '
      'Try again', (tester) async {
    usePhone(tester);
    final app = travelApp();
    await app.pump(tester);
    final served = app.api.travelHandler!;
    var fail = true;
    app.api.travelHandler = (method, path, query, body) {
      if (fail && RegExp(r'^/travel/flights/\d+/seats$').hasMatch(path)) {
        throw const ApiException(
          statusCode: 503,
          code: 'unavailable',
          message: "The seats didn't load.",
        );
      }
      return served(method, path, query, body);
    };
    await open(app, tester, TravelPaths.manage(1));
    final change = find.textContaining('SF');
    await tester.tap(
      find.byIcon(Symbols.airline_seat_recline_normal_rounded).first,
    );
    await TestApp.settle(tester, 20);
    expect(find.text("The seats didn't load."), findsOneWidget);
    expect(find.text('Try again'), findsOneWidget);
    fail = false;
    await tester.tap(find.text('Try again'));
    await TestApp.settle(tester, 20);
    // The seats' sheet opens.
    expect(find.byType(BottomSheet), findsOneWidget);
    expect(change, findsWidgets);
    expect(tester.takeException(), isNull);
  });
}
