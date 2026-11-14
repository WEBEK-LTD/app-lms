import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/modules/shared/pages/content_blocks.dart'
    show pageClockProvider;
import 'package:yallapp/modules/shared/pages/studio_live.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import '../support/travel_fixtures.dart';

/// 130.11 The live element's more looks: the person's next trip (the days
/// over its legs, its city over the first flight as a boarding pass, one
/// line, the days large), the free taxis around as a card or a headline, a
/// ride's minutes to the pickup large, and a greeting's own words; light,
/// dark and right to left; nothing of the person's signed out.
void main() {
  final evening = DateTime(2026, 11, 13, 20, 15);
  TestApp? last;
  setUp(() => last = null);

  Map<String, dynamic> page(List<Map<String, dynamic>> children) => {
    ...appPageJson(blocks: []),
    'studio': {
      'body': {'id': 'root', 'type': 'column', 'children': children},
    },
  };

  Map<String, dynamic> tracking(String kind, String? style) => {
    'id': 'live',
    'type': 'tracking',
    'tracking': {'kind': kind, 'style': ?style},
    'padding': {'top': 12, 'end': 16, 'bottom': 12, 'start': 16},
  };

  FakeApi withPage(FakeApi api, List<Map<String, dynamic>> children) => api
    ..navigation = navigationJson(
      tabs: [
        navTabJson('home', 'Home', 'home', {
          'type': 'page',
          'page_slug': 'home',
        }),
        navTabJson('account', 'Account', 'person', {
          'type': 'screen',
          'screen': 'account',
        }),
      ],
    )
    ..pages = {'home': page(children)};

  Future<void> open(
    WidgetTester tester,
    AppType type,
    FakeApi api, {
    bool signedIn = true,
    bool dark = false,
    String language = 'en',
    List<Object> overrides = const [],
  }) async {
    final app = TestApp(
      appType: type,
      api: api,
      signedIn: signedIn,
      guest: !signedIn,
      preferences: {
        'settings.theme_mode': dark ? 'dark' : 'light',
        'settings.language': language,
      },
      overrides: [
        pageClockProvider.overrideWithValue(() => evening),
        ...overrides.cast(),
      ],
    );
    // The app before it in the same test closed first.
    if (last case final TestApp before?) {
      await tester.pumpWidget(const SizedBox());
      before.container.dispose();
      await tester.pump(const Duration(seconds: 30));
    }
    last = app;
    await app.pump(tester);
    await TestApp.settle(tester, 20);
  }

  group('the next trip', () {
    for (final (style, key) in [
      (null, 'studio-trip-card'),
      ('ticket', 'studio-trip-ticket'),
      ('line', 'studio-trip-line'),
      ('headline', 'studio-trip-headline'),
    ]) {
      testWidgets('as ${style ?? 'its card'}, light, dark and in Arabic', (
        tester,
      ) async {
        for (final (dark, language) in [
          (false, 'en'),
          (true, 'en'),
          (false, 'ar'),
        ]) {
          await open(
            tester,
            AppType.travel,
            withPage(travelFake(), [tracking('trip', style)]),
            dark: dark,
            language: language,
          );
          expect(find.byKey(ValueKey(key)), findsOneWidget, reason: language);
          expect(tester.takeException(), isNull);
        }
      });
    }

    testWidgets('its days, city, stay, legs and boarding pass', (tester) async {
      await open(
        tester,
        AppType.travel,
        withPage(travelFake(), [tracking('trip', null)]),
      );
      // Tomorrow morning: one day to Luxor, its flights, the transfer, the stay.
      expect(find.text('1'), findsOneWidget);
      expect(find.text('DAY TO LUXOR'), findsOneWidget);
      expect(find.text('Nile Garden Resort'), findsOneWidget);
      expect(find.text('SF 691'), findsOneWidget);
      expect(find.text('Transfer'), findsOneWidget);
      expect(find.text('SF 690'), findsOneWidget);
      await open(
        tester,
        AppType.travel,
        withPage(travelFake(), [tracking('trip', 'ticket')]),
      );
      expect(find.text('YOUR NEXT TRIP · TOMORROW'), findsOneWidget);
      expect(find.text('Luxor'), findsOneWidget);
      expect(find.text('CAI'), findsOneWidget);
      expect(find.text('LXR'), findsOneWidget);
      expect(find.byKey(const ValueKey('studio-trip-pass')), findsOneWidget);
    });

    testWidgets('nothing signed out', (tester) async {
      await open(
        tester,
        AppType.travel,
        withPage(travelFake(), [tracking('trip', 'ticket')]),
        signedIn: false,
      );
      expect(find.byKey(const ValueKey('studio-trip-ticket')), findsNothing);
    });
  });

  group('the free taxis around', () {
    final near = studioNearbyTaxisProvider.overrideWith(
      (ref) => (
        at: (lat: 30.0444, lng: 31.2357),
        taxis: [
          for (var i = 0; i < 8; i++)
            NearbyTaxi(
              driverKey: 'd$i',
              lat: 30.0444 + i * 0.004,
              lng: 31.2357,
            ),
        ],
      ),
    );

    testWidgets('a card: the nearest one\'s minutes and how many', (
      tester,
    ) async {
      for (final dark in [false, true]) {
        await open(
          tester,
          AppType.rides,
          withPage(FakeApi(config: configJson()), [
            tracking('nearby_taxis', 'card'),
          ]),
          dark: dark,
          overrides: [near],
        );
        expect(
          find.byKey(const ValueKey('studio-tracking-nearby-card')),
          findsOneWidget,
        );
        expect(find.text('Nearest free taxi'), findsOneWidget);
        expect(find.text('8 taxis around you, live'), findsOneWidget);
      }
    });

    testWidgets('a headline: their count, in Arabic too', (tester) async {
      for (final language in ['en', 'ar']) {
        await open(
          tester,
          AppType.rides,
          withPage(FakeApi(config: configJson()), [
            {
              ...tracking('nearby_taxis', 'headline'),
              'font': {'size': 44, 'weight': 800},
            },
          ]),
          language: language,
          overrides: [near],
        );
        expect(
          find.byKey(const ValueKey('studio-tracking-nearby-headline')),
          findsOneWidget,
        );
        expect(find.text('8'), findsOneWidget);
        expect(tester.takeException(), isNull);
      }
    });
  });

  testWidgets("a ride's minutes to the pickup, large, with a call", (
    tester,
  ) async {
    for (final dark in [false, true]) {
      await open(
        tester,
        AppType.rides,
        withPage(FakeApi(config: configJson()), [tracking('ride', 'headline')])
          ..rides = [rideJson(status: 'accepted')],
        dark: dark,
      );
      expect(
        find.byKey(const ValueKey('studio-tracking-ride-headline')),
        findsOneWidget,
      );
      expect(find.text('ON THE WAY'), findsOneWidget);
      expect(find.text('4'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('studio-tracking-call')),
        findsOneWidget,
      );
    }
  });

  testWidgets('a greeting in its own words, and without a name signed out', (
    tester,
  ) async {
    Map<String, dynamic> greeting() => {
      'id': 'hello',
      'type': 'greeting',
      'text': 'Where to, {name}?',
      'title': 'Where to?',
    };
    await open(
      tester,
      AppType.rides,
      withPage(FakeApi(config: configJson()), [greeting()]),
    );
    expect(find.text('Where to, Sara?'), findsOneWidget);
    await open(
      tester,
      AppType.rides,
      withPage(FakeApi(config: configJson()), [greeting()]),
      signedIn: false,
    );
    expect(find.text('Where to?'), findsOneWidget);
  });
}
