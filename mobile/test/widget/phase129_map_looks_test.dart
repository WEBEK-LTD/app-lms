import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 129.21–129.24 A map header's premium looks: a living map with labelled
/// pins, words and a route with its car; a horizon with standing pins; two
/// inks with roof-sign taxis and a checker band; a radar lens with its
/// minute rings; a live route of the person's shipment or ride (none when
/// there is none); light, dark and right to left, and still with reduced
/// motion. A map without them is drawn as before.
void main() {
  Map<String, dynamic> map(Map<String, dynamic> drawing, {int height = 460}) =>
      {
        'id': 'map',
        'type': 'map_header',
        'height': height,
        'map_drawing': drawing,
        'children': <Object>[],
      };

  FakeApi api(List<Map<String, dynamic>> children) =>
      FakeApi(config: configJson(languages: languagesJson()))
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
        ..pages = {
          'home': {
            ...appPageJson(blocks: []),
            'studio': {
              'body': {'id': 'root', 'type': 'column', 'children': children},
            },
          },
        };

  Future<TestApp> open(
    WidgetTester tester,
    FakeApi fake, {
    AppType type = AppType.rides,
    bool dark = false,
    String language = 'en',
    bool signedIn = true,
  }) async {
    final app = TestApp(
      appType: type,
      api: fake,
      signedIn: signedIn,
      guest: !signedIn,
      preferences: {
        'settings.theme_mode': dark ? 'dark' : 'light',
        'settings.language': language,
      },
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    return app;
  }

  final natural = {
    'style': 'natural',
    'accent': '#F2B544',
    'chip': '#21403C',
    'markers': [
      {'x': 14, 'y': 28},
      {'x': 86, 'y': 34},
    ],
    'me': true,
    'me_at': {'x': 41, 'y': 50},
    'places': [
      {'x': 26, 'y': 22, 'label': 'Villa', 'icon': 'home'},
      {'x': 72, 'y': 62, 'label': 'Tower', 'icon': 'work'},
    ],
    'labels': [
      {'x': 30, 'y': 82, 'text': 'Zamalek'},
    ],
    'route': {
      'points': [
        {'x': 80, 'y': 33},
        {'x': 45, 'y': 36},
        {'x': 41, 'y': 50},
      ],
      'to_label': 'Pickup',
      'eta': '3 min',
      'color': '#0F766C',
      'dark_color': '#3FC7B4',
      'moving': true,
    },
  };

  for (final (dark, language) in const [
    (false, 'en'),
    (true, 'en'),
    (false, 'ar'),
  ]) {
    testWidgets('a living map: pins, words, the route and its car '
        '(${dark ? 'dark' : 'light'}, $language)', (tester) async {
      await open(tester, api([map(natural)]), dark: dark, language: language);
      expect(tester.takeException(), isNull);
      final box = tester.getRect(find.byKey(const ValueKey('studio-map-map')));
      expect(find.text('Villa'), findsOneWidget);
      expect(find.text('Tower'), findsOneWidget);
      // Words on the map in capitals, from the start.
      expect(find.text('ZAMALEK'), findsOne);
      expect(find.text('Pickup'), findsOneWidget);
      expect(find.text('3 min'), findsOneWidget);
      expect(find.byKey(const ValueKey('studio-map-route')), findsOneWidget);
      expect(find.byKey(const ValueKey('studio-map-me')), findsOneWidget);
      // Placed from the start: right to left, the first pin is on the right.
      final home = tester.getRect(find.text('Villa')).center.dx;
      if (language == 'ar') {
        expect(home, greaterThan(box.center.dx));
      } else {
        expect(home, lessThan(box.center.dx));
      }
    });
  }

  testWidgets('a moving car stands still with reduced motion', (tester) async {
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
    await open(tester, api([map(natural)]));
    final before = tester.getRect(find.text('3 min'));
    await tester.pump(const Duration(seconds: 3));
    expect(tester.getRect(find.text('3 min')), before);
    // Nothing keeps animating: the page settles.
    await tester.pumpAndSettle();
  });

  testWidgets('a moving car drives on', (tester) async {
    await open(tester, api([map(natural)]));
    final before = tester.getRect(find.text('3 min'));
    await tester.pump(const Duration(seconds: 3));
    expect(tester.getRect(find.text('3 min')), isNot(before));
  });

  for (final dark in const [false, true]) {
    testWidgets('a horizon: standing pins over the tilted city '
        '(${dark ? 'dark' : 'light'})', (tester) async {
      await open(
        tester,
        api([
          map({
            'style': 'horizon',
            'markers': [
              {'x': 20, 'y': 62},
            ],
            'me': true,
            'me_at': {'x': 50, 'y': 78},
            'places': [
              {'x': 30, 'y': 70, 'label': 'Villa'},
            ],
            'route': {
              'points': [
                {'x': 86, 'y': 58},
                {'x': 50, 'y': 78},
              ],
              'to_label': 'Pickup',
              'eta': 'Hossam',
            },
          }),
        ]),
        dark: dark,
      );
      expect(tester.takeException(), isNull);
      expect(find.text('Villa'), findsOneWidget);
      expect(find.text('Pickup'), findsOneWidget);
      expect(find.text('Hossam'), findsOneWidget);
      expect(find.byKey(const ValueKey('studio-map-marker-0')), findsOneWidget);
    });
  }

  for (final language in const ['en', 'ar']) {
    testWidgets('two inks: roof signs in the app\'s language ($language)', (
      tester,
    ) async {
      await open(
        tester,
        api([
          map({
            'style': 'two_ink',
            'markers': [
              {'x': 14, 'y': 28},
              {'x': 86, 'y': 34},
              {'x': 30, 'y': 66},
            ],
            'me': true,
          }),
        ]),
        language: language,
        dark: language == 'ar',
      );
      expect(tester.takeException(), isNull);
      expect(find.text(language == 'ar' ? 'تاكسي' : 'TAXI'), findsNWidgets(3));
    });
  }

  testWidgets('a radar lens: its minute rings and the taxis on it', (
    tester,
  ) async {
    await open(
      tester,
      api([
        map({
          'style': 'lens',
          'markers': [
            {'x': 62, 'y': 40},
            {'x': 19, 'y': 39},
          ],
          'me': true,
          'sign': 'CAB',
        }, height: 380),
      ]),
      dark: true,
    );
    expect(tester.takeException(), isNull);
    expect(find.byKey(const ValueKey('studio-map-lens')), findsOneWidget);
    for (final n in [1, 3, 5]) {
      expect(find.text('$n min'), findsOneWidget);
    }
    final lens = tester.getRect(find.byKey(const ValueKey('studio-map-lens')));
    final marker = tester.getRect(
      find.byKey(const ValueKey('studio-map-marker-0')),
    );
    expect(lens.overlaps(marker), isTrue);
  });

  final live = {
    'accent': '#F2A12E',
    'route': {
      'points': [
        {'x': 80, 'y': 36},
        {'x': 80, 'y': 88},
        {'x': 33, 'y': 88},
      ],
      'at': 42,
      'eta': 'Sample',
      'live': 'shipment',
    },
  };

  testWidgets("a live route: the person's shipment, the courier on it", (
    tester,
  ) async {
    final fake = api([map(live)])
      ..shipments = [shipmentJson(status: 'on_the_way', withPosition: true)];
    await open(tester, fake, type: AppType.delivery);
    expect(tester.takeException(), isNull);
    expect(find.byKey(const ValueKey('studio-map-route')), findsOneWidget);
    // The real courier and pickup, not the sample.
    expect(find.text('Karim'), findsOneWidget);
    expect(find.text('12 Abbas El Akkad St'), findsOneWidget);
    expect(find.text('Sample'), findsNothing);
  });

  testWidgets('a live route draws nothing with no shipment on its way', (
    tester,
  ) async {
    await open(
      tester,
      api([map(live)])..shipments = [],
      type: AppType.delivery,
    );
    expect(tester.takeException(), isNull);
    expect(find.byKey(const ValueKey('studio-map-route')), findsNothing);
    expect(find.text('Sample'), findsNothing);
  });

  testWidgets("a live route: the person's driver coming to the pickup", (
    tester,
  ) async {
    final fake = api([
      map({
        'route': {
          'points': [
            {'x': 80, 'y': 36},
            {'x': 30, 'y': 60},
          ],
          'live': 'ride',
        },
      }),
    ])..rides = [rideJson(status: 'accepted')];
    await open(tester, fake);
    expect(tester.takeException(), isNull);
    expect(find.text('Mahmoud · 4 min'), findsOneWidget);
    expect(find.text('Pickup'), findsOneWidget);
  });

  testWidgets('a map without the premium looks is drawn as before', (
    tester,
  ) async {
    await open(
      tester,
      api([
        map({
          'markers': [
            {'x': 15, 'y': 23},
          ],
          'me': true,
        }),
      ]),
    );
    expect(find.byKey(const ValueKey('studio-map-map')), findsOneWidget);
    expect(find.byKey(const ValueKey('studio-map-route')), findsNothing);
    expect(find.byKey(const ValueKey('studio-map-lens')), findsNothing);
    expect(find.byKey(const ValueKey('studio-map-me')), findsOneWidget);
    expect(find.byKey(const ValueKey('studio-map-marker-0')), findsOneWidget);
  });
}
