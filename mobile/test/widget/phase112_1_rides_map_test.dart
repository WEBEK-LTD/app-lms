import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/routing/app_module.dart';
import 'package:yallapp/core/services/external_links.dart';
import 'package:yallapp/core/theme/app_icons.dart';
import 'package:yallapp/core/widgets/buttons.dart';
import 'package:yallapp/modules/delivery/data/delivery_providers.dart';
import 'package:yallapp/modules/rides/widgets/ride_widgets.dart';
import 'package:yallapp/modules/taxi/data/saved_places.dart';
import 'package:yallapp/modules/taxi/widgets/navigate_button.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'phase105_9_taxi_test.dart'
    show FakeLocator, closeApp, go, push, tapKey, usePhone;

/// A ride hailing app (not the taxi kind) with `Config.taxi`: [tiles] the
/// platform's map, or none.
FakeApi ridesMapApi({
  String? tiles,
  bool search = true,
  bool routes = false,
  List<String> roles = const [],
}) {
  final api = FakeApi(
    config: {
      ...configJson(lms: null),
      'rides': {
        ...ridesConfigJson(),
        'map': {'tiles_url': null, 'attribution': null},
      },
      'taxi': {
        'map': {
          'provider': 'osm',
          'tiles_url': tiles,
          'attribution': null,
          'search': search,
          'routes': routes,
        },
        'live': null,
        'nearby_every_seconds': 5,
      },
    },
  );
  api
    ..me = {...userJson(), 'roles': roles}
    ..nearbyTaxis = [
      {
        'driver_key': 'd1',
        'lat': 30.0470,
        'lng': 31.2260,
        'heading': 45,
        'vehicle_type_id': 1,
      },
    ]
    ..taxiPlaces = [
      {
        'id': 'p1',
        'name': 'Tahrir Square',
        'address': 'Downtown, Cairo',
        'lat': 30.0444,
        'lng': 31.2357,
      },
    ]
    ..taxiRoute = {
      'distance_km': 7.4,
      'minutes': 18,
      'points': [
        [30.0459, 31.2243],
        [30.0450, 31.2300],
        [30.0444, 31.2357],
      ],
    };
  return api;
}

TestApp ridesApp(
  FakeApi api, {
  List<String>? opened,
  AppRole role = AppRole.customer,
}) => TestApp(
  api: api,
  appType: AppType.rides,
  signedIn: true,
  // 112.3 The driver's screens are in the drivers' app.
  build: (b) => b.copyWith(role: role),
  overrides: [
    locatorProvider.overrideWithValue(FakeLocator()),
    shareRideProvider.overrideWithValue((text) async {}),
    openExternalProvider.overrideWithValue((url) async {
      opened?.add(url);
      return true;
    }),
  ],
);

const tiles = 'https://tiles.example.com/{z}/{x}/{y}.png';

Future<void> searchTahrir(TestApp app, WidgetTester tester) async {
  await tester.enterText(
    find.byKey(const ValueKey('taxi-search-field')),
    'Tahrir',
  );
  await tester.pump(const Duration(milliseconds: 400));
  await TestApp.settle(tester);
  await tapKey(tester, 'taxi-place-p1');
  await tester.pump(const Duration(milliseconds: 500));
  await TestApp.settle(tester);
}

void main() {
  test('112.1 the Ride tab first, the others in their order', () {
    ShellTab tab(String location) => ShellTab(
      icon: AppIcons.home,
      label: (_) => location,
      location: location,
    );
    final tabs = rideTabFirst([
      tab(Paths.home),
      tab(Paths.ride),
      tab(Paths.myRides),
      tab(Paths.account),
    ]);
    expect(
      [for (final t in tabs) t.location],
      [Paths.ride, Paths.home, Paths.myRides, Paths.account],
    );
    final none = [tab(Paths.home), tab(Paths.account)];
    expect(rideTabFirst(none), same(none));
  });

  test('112.1 the saved places read back, a broken one left out', () {
    SavedPlace at(int i) => SavedPlace(name: 'P$i', lat: 30 + i / 100, lng: 31);
    expect(SavedPlaces.fromJson(const SavedPlaces().toJson()).home, isNull);
    final kept = SavedPlaces.fromJson({
      'home': at(0).toJson(),
      'recent': [for (var i = 1; i <= 3; i++) at(i).toJson(), 'broken'],
    });
    expect(kept.home?.name, 'P0');
    expect(kept.recent.map((p) => p.name), ['P1', 'P2', 'P3']);
    expect(
      at(1).near(SavedPlace(name: 'x', lat: 30.0101, lng: 31.0001)),
      isTrue,
    );
  });

  testWidgets('112.1 a ride hailing app opens on the map, even without tiles: '
      'the cars around, "Where to?" with Home and Work', (tester) async {
    usePhone(tester);
    final api = ridesMapApi(tiles: null, search: false);
    final app = ridesApp(api);
    await app.pump(tester);

    // Where the app opens: the map, not a page of blocks.
    expect(find.byKey(const ValueKey('taxi-map')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-plain')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-no-map')), findsOneWidget);
    expect(find.byType(TileLayer), findsNothing);
    expect(find.byKey(const ValueKey('taxi-taxi-d1')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-where-to')), findsOneWidget);
    expect(find.byKey(const ValueKey('ride-saved-home')), findsOneWidget);
    expect(find.byKey(const ValueKey('ride-saved-work')), findsOneWidget);
    expect(
      find.text('1 car near you · the nearest 1 min away'),
      findsOneWidget,
    );
    // No map to choose on: the search offers the rest.
    await tapKey(tester, 'taxi-where-to');
    expect(find.byKey(const ValueKey('taxi-search-map')), findsNothing);
    expect(find.byKey(const ValueKey('taxi-search-link')), findsOneWidget);
    await closeApp(app, tester);
  });

  testWidgets('112.1 Home set once, then one tap away; where to kept as '
      'recent', (tester) async {
    usePhone(tester);
    final api = ridesMapApi(tiles: tiles);
    final app = ridesApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.ride);

    // Add home: the search for it, the place kept as Home and used as where to.
    await tapKey(tester, 'ride-saved-home');
    expect(find.text('Set your home'), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-search-home')), findsNothing);
    await searchTahrir(app, tester);
    final saved = app.container.read(savedPlacesProvider);
    expect(saved.home?.name, 'Tahrir Square');
    expect(saved.recent.single.name, 'Tahrir Square');
    expect(find.byKey(const ValueKey('taxi-pin-to')), findsOneWidget);
    expect(find.byKey(const ValueKey('ride-adjust-pickup')), findsOneWidget);

    // Back to "Where to?": Home now goes there at once.
    await tester.tap(find.byType(AppBackButton).first);
    await TestApp.settle(tester);
    await tapKey(tester, 'ride-saved-home');
    expect(find.byKey(const ValueKey('taxi-search-field')), findsNothing);
    expect(find.text('To: Tahrir Square'), findsWidgets);
    expect(find.byKey(const ValueKey('ride-recent-0')), findsNothing);
    await closeApp(app, tester);
  });

  testWidgets('112.1 the pickup moved on the map', (tester) async {
    usePhone(tester);
    final api = ridesMapApi(tiles: tiles)..rides = [];
    final app = ridesApp(api);
    await app.pump(tester);
    await go(app, tester, Paths.ride);
    await tapKey(tester, 'taxi-where-to');
    await searchTahrir(app, tester);

    await tapKey(tester, 'ride-adjust-pickup');
    expect(find.byKey(const ValueKey('ride-adjust-map')), findsOneWidget);
    expect(find.byKey(const ValueKey('ride-adjust-pin')), findsOneWidget);
    expect(find.text('Move the map to your pickup'), findsOneWidget);
    await tester.drag(
      find.byKey(const ValueKey('ride-adjust-map')),
      const Offset(-80, 40),
    );
    await TestApp.settle(tester);
    await tapKey(tester, 'ride-confirm-pickup');
    expect(find.byKey(const ValueKey('ride-adjust-map')), findsNothing);
    expect(find.text('From: Pinned on the map'), findsWidgets);

    await tester.tap(find.byKey(const ValueKey('ride-request')));
    await TestApp.settle(tester);
    final asked = api.rideRequests.single;
    expect(asked.pickup.address, 'Pinned on the map');
    // Moved from where the rider was.
    expect(asked.pickup.lng, isNot(31.2243));
    await closeApp(app, tester);
  });

  testWidgets('112.1 finding a driver rings the pickup; on the way, the '
      'drop-off\'s time; at the end, the receipt', (tester) async {
    usePhone(tester);
    final api = ridesMapApi(tiles: tiles, routes: true)
      ..rides = [
        rideJson(id: 1, status: 'searching'),
        rideJson(id: 2, status: 'in_progress'),
        rideJson(id: 3, status: 'completed'),
      ];
    final app = ridesApp(api);
    await app.pump(tester);

    await push(app, tester, Paths.rideFollow(1));
    expect(find.byKey(const ValueKey('taxi-pulse')), findsOneWidget);
    expect(find.byKey(const ValueKey('ride-searching')), findsOneWidget);
    // The road between the places, from the map's routes.
    expect(api.count('getTaxiRoute'), 1);
    final lines = tester
        .widget<PolylineLayer>(find.byKey(const ValueKey('taxi-lines')))
        .polylines;
    expect(lines.first.points, hasLength(3));

    await push(app, tester, Paths.rideFollow(2));
    expect(find.byKey(const ValueKey('taxi-pulse')), findsNothing);
    expect(find.byKey(const ValueKey('taxi-dropoff-in')), findsOneWidget);

    await push(app, tester, Paths.rideFollow(3));
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('ride-receipt')),
      200,
      scrollable: find
          .descendant(
            of: find.byKey(const ValueKey('ride-view')),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    expect(find.byKey(const ValueKey('ride-receipt')), findsOneWidget);
    expect(find.byKey(const ValueKey('ride-rate')), findsOneWidget);
    await closeApp(app, tester);
  });

  testWidgets('112.1 the driver drives a ride on the map and navigates with '
      'their maps app', (tester) async {
    usePhone(tester);
    final opened = <String>[];
    final api = ridesMapApi(tiles: tiles, roles: ['driver'])
      ..driver = driverJson(online: true, activeRideId: 4)
      ..driverRides = {
        'active': [driverRideJson(id: 4)],
        'done': [],
      };
    final app = ridesApp(api, opened: opened, role: AppRole.driver);
    await app.pump(tester);
    await push(app, tester, Paths.driverRide(4));

    expect(find.byKey(const ValueKey('taxi-map')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-pin-from')), findsOneWidget);
    expect(find.byKey(const ValueKey('taxi-pin-to')), findsOneWidget);
    expect(find.byKey(const ValueKey('driver-ride-map')), findsNothing);
    expect(find.text('Navigate to the pickup'), findsOneWidget);
    await tapKey(tester, 'driver-navigate');
    expect(find.text('Google Maps'), findsOneWidget);
    expect(find.text('Waze'), findsOneWidget);
    await tapKey(tester, 'navigate-waze');
    expect(opened.single, navigationUrl(NavigationApp.waze, 30.0459, 31.2243));
    expect(
      opened.single,
      'https://waze.com/ul?ll=30.0459,31.2243&navigate=yes',
    );
    expect(find.byKey(const ValueKey('driver-next')), findsOneWidget);
    await closeApp(app, tester);
  });
}
