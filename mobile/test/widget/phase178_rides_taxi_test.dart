import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/config/build_config_json.dart';
import 'package:yallapp/core/widgets/premium_chrome.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/rides/data/rides_providers.dart';
import 'package:yallapp/modules/shared/pages/studio_live.dart';
import 'package:yallapp/modules/taxi/widgets/taxi_map.dart';

import '../screenshots/support/shot.dart' show loadAppFonts;
import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 178 QA of the rides and taxi templates
/// (docs/qa/2026-11-18-rides-taxi/NOTES.md), on Masar Rides's living map as
/// the platform serves it to a company with its own vehicle types in lira
/// (`platform/web/tests/unit/phase178-rides-taxi.test.ts` writes
/// `test/support/phase178_masar_pages.json`).
void main() {
  setUpAll(loadAppFonts);

  final served = jsonDecode(
    File('test/support/phase178_masar_pages.json').readAsStringSync(),
  ) as Map<String, dynamic>;

  List<Map<String, dynamic>> nodesOf(Map<String, dynamic> node) => [
    node,
    for (final c in (node['children'] as List?) ?? const [])
      ...nodesOf(c as Map<String, dynamic>),
  ];
  Map<String, dynamic> body(String slug) =>
      ((served[slug] as Map)['studio'] as Map)['body'] as Map<String, dynamic>;

  /// Masar's frosted "On the way" over the map: the person's ride on glass.
  final glass = nodesOf(body('home')).firstWhere(
    (n) =>
        n['type'] == 'column' &&
        ((n['children'] as List?) ?? const []).any(
          (c) => (c as Map)['type'] == 'tracking',
        ),
  );

  FakeApi api({required List<Map<String, dynamic>> rides}) =>
      FakeApi(
          config: {
            ...configJson(lms: null),
            'rides': {
              ...ridesConfigJson(),
              'currency': 'TRY',
              'map': {'tiles_url': null, 'attribution': null},
            },
            'taxi': {
              'map': {
                'provider': 'osm',
                'tiles_url': null,
                'attribution': null,
                'search': false,
                'routes': false,
              },
              'live': null,
              'nearby_every_seconds': 5,
            },
          },
        )
        ..navigation = served['navigation'] as Map<String, dynamic>
        ..pages = {
          for (final slug in ['home', 'ride', 'rides'])
            slug: served[slug] as Map<String, dynamic>,
        }
        ..rides = rides
        ..nearbyTaxis = [];

  void phone(WidgetTester tester, {double height = 800}) {
    tester.view
      ..physicalSize = Size(360, height) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  group('178 the drivers\' app preview', () {
    test('reads the role the platform gives the second app\'s preview', () {
      BuildConfigData read(Object? role) => buildConfigFromJson({
        'app_type': 'rides',
        'app_name': 'Masar Driver',
        'role': ?role,
      });
      expect(read('driver').role, AppRole.driver);
      expect(read('courier').role, AppRole.courier);
      expect(read('vendor').role, AppRole.vendor);
      expect(read('staff').role, AppRole.staff);
      expect(read(null).role, AppRole.customer);
      expect(read('someone').role, AppRole.customer);
    });

    testWidgets('a driver role there opens the driver\'s screens, not the '
        'riders\' home', (tester) async {
      phone(tester);
      final fake = api(rides: [])
        ..me = {
          ...userJson(),
          'roles': ['driver'],
        }
        ..driver = driverJson(online: false);
      final build = buildConfigFromJson({
        'app_type': 'rides',
        'app_name': 'Masar Driver',
        'role': 'driver',
      });
      final app = TestApp(
        api: fake,
        appType: AppType.rides,
        signedIn: true,
        build: (b) => b.copyWith(role: build.role),
      );
      await app.pump(tester);
      await TestApp.settle(tester, 20);
      expect(app.container.read(driverAppProvider), isTrue);
      expect(app.container.read(shellTabsProvider).map((t) => t.path), [
        Paths.driver,
        Paths.account,
      ]);
    });
  });

  group('178 Masar\'s living map, signed in', () {
    testWidgets('without a ride, no empty frosted card over the map; with '
        'one, the driver on glass', (tester) async {
      phone(tester);
      final fake = api(rides: []);
      final app = TestApp(api: fake, appType: AppType.rides, signedIn: true);
      await app.pump(tester);
      await TestApp.settle(tester, 20);
      // The company's own classes, from lira, are on the home.
      expect(find.text('Sedan'), findsWidgets);
      expect(find.text('Minivan'), findsWidgets);
      expect(find.text('from ₺'), findsWidgets);
      expect(find.text('Economy'), findsNothing);
      expect(find.text('from E£'), findsNothing);
      expect(
        find.byKey(ValueKey('studio-node-${glass['id']}')),
        findsNothing,
        reason: 'the "On the way" glass holds only the ride, and there is none',
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('with a ride on its way, its card on the glass', (
      tester,
    ) async {
      phone(tester);
      final fake = api(rides: [rideJson(status: 'accepted')]);
      final app = TestApp(api: fake, appType: AppType.rides, signedIn: true);
      await app.pump(tester);
      await TestApp.settle(tester, 20);
      expect(
        find.byKey(ValueKey('studio-node-${glass['id']}')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('studio-tracking-driver')),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('"Where to?" opens the ride under the page\'s own "Ride" '
        'header: no second menu and app chip under it', (tester) async {
      phone(tester);
      final fake = api(rides: []);
      final app = TestApp(api: fake, appType: AppType.rides, signedIn: true);
      await app.pump(tester);
      await TestApp.settle(tester, 20);
      app.container.read(appRouterProvider).push(Paths.ride);
      await TestApp.settle(tester, 20);
      expect(find.text('Ride'), findsWidgets);
      expect(find.byType(TaxiAppChip), findsNothing);
      expect(find.byKey(const ValueKey('ride-form')), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('178 My rides reaches its end over the frosted bar', () {
    for (final scale in [1.0, 1.3]) {
      testWidgets('text x$scale: the last ride lies above the bar', (
        tester,
      ) async {
        phone(tester, height: 640);
        tester.platformDispatcher.textScaleFactorTestValue = scale;
        addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        final fake = api(
          rides: [
            for (var i = 1; i <= 12; i++)
              rideJson(id: i, status: 'completed', paid: true),
          ],
        );
        final app = TestApp(api: fake, appType: AppType.rides, signedIn: true);
        await app.pump(tester);
        await TestApp.settle(tester, 20);
        app.container.read(appRouterProvider).go(Paths.myRides);
        await TestApp.settle(tester, 20);
        final list = find.byKey(const ValueKey('my-rides-list'));
        expect(list, findsOneWidget);
        await tester.drag(list, const Offset(0, -6000));
        await TestApp.settle(tester, 20);
        final padding = MediaQuery.of(tester.element(list)).padding.bottom;
        expect(padding, greaterThan(0), reason: 'the bar floats over the list');
        final view = tester.getRect(list);
        final last = tester.getRect(find.textContaining('R-2012'));
        expect(
          last.bottom,
          lessThanOrEqualTo(view.bottom - padding),
          reason: 'its last ride stays under the frosted bar otherwise',
        );
        expect(tester.takeException(), isNull);
      });
    }
  });

  group('178 Lamha\'s pages', () {
    /// A page opened over the tabs with Lamha's cream "brand" header.
    Map<String, dynamic> cream(String title) => {
      'slug': 'ride',
      'title': title,
      'updated_at': '2026-11-18T09:00:00.000Z',
      'show_title': false,
      'blocks': <Object>[],
      'studio': {
        'header': {
          'type': 'title',
          'title': title,
          'style': 'brand',
          'buttons': ['notifications'],
          'background': '#FFFDF6',
          'color': '#141B2E',
          'dark_background': '#0E1324',
          'dark_color': '#F1F2F7',
        },
        'body': {'id': 'root', 'type': 'column', 'children': <Object>[]},
      },
    };

    for (final dark in [false, true]) {
      testWidgets('the cream header\'s back and bell are in its ink, not '
          'white on cream (${dark ? 'night' : 'day'})', (tester) async {
        phone(tester);
        final fake = api(rides: []);
        fake.pages = {...fake.pages, 'ride': cream('Ride')};
        final app = TestApp(
          api: fake,
          appType: AppType.rides,
          signedIn: true,
          preferences: {'settings.theme_mode': dark ? 'dark' : 'light'},
        );
        await app.pump(tester);
        await TestApp.settle(tester, 20);
        app.container.read(appRouterProvider).push(Paths.ride);
        await TestApp.settle(tester, 20);
        final back = tester.widget<ChromeGlassButton>(
          find.descendant(
            of: find.byKey(const ValueKey('chrome-back')),
            matching: find.byType(ChromeGlassButton),
            matchRoot: true,
          ),
        );
        // White on the night's navy, the ink on the day's cream.
        expect(back.onColour, dark);
        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('"Nearest free taxi" says there is none when no taxi is free '
        'near the person', (tester) async {
      phone(tester);
      final fake = api(rides: []);
      fake.pages = {
        ...fake.pages,
        'home': {
          ...(served['home'] as Map<String, dynamic>),
          'studio': {
            'body': {
              'id': 'root',
              'type': 'column',
              'children': [
                {
                  'id': 'near',
                  'type': 'tracking',
                  'tracking': {'kind': 'nearby_taxis', 'style': 'card'},
                },
              ],
            },
          },
        },
      };
      final app = TestApp(
        api: fake,
        appType: AppType.rides,
        signedIn: true,
        overrides: [
          studioNearbyTaxisProvider.overrideWith(
            (ref) => (at: (lat: 41.0, lng: 29.0), taxis: const []),
          ),
        ],
      );
      await app.pump(tester);
      await TestApp.settle(tester, 20);
      expect(
        find.byKey(const ValueKey('studio-tracking-nearby-card')),
        findsOneWidget,
      );
      expect(find.text('No free taxis near you'), findsOneWidget);
      expect(find.text('Nearest free taxi'), findsNothing);
      expect(find.text('0 taxis around you, live'), findsNothing);
      expect(tester.takeException(), isNull);
    });
  });
}
